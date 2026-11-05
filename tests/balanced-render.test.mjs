import { expect, test } from 'bun:test';
import { mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { renderChart } from '../plugins/pstack/skills/statechart/scripts/render.mjs';

const runtime = fileURLToPath(new URL('..', import.meta.url));
const fixture = readFileSync(new URL('fixtures/balanced-statechart.mmd', import.meta.url), 'utf8');

test('renders the full nested chart without dropping labels, edges or verification marks', async () => {
  const svg = await renderChart(fixture, runtime, 'dark');
  for (const label of ['Waiting for a worker', 'Write the result while the lease is valid',
    'another worker owns the lease', 'retention period ends', 'Archived result']) {
    expect(svg.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').includes(label)).toBe(true);
  }
  for (const mark of ['breaks', 'mayBreak', 'bugPath', 'repeats']) {
    expect(new RegExp(`<g class="[^"]*\\b${mark}\\b`).test(svg)).toBe(true);
  }
  expect(svg).toContain('pele-cluster');
  expect(svg.includes('style="fill:#ffecee')).toBe(true);
  expect(svg).toContain('data:font/ttf;base64,');
  expect(svg).not.toContain('https://');
  expect(svg).not.toContain('@import');
});

test('all export appearances preserve the exact diagram geometry', async () => {
  const outputs = await Promise.all(['auto', 'light', 'dark'].map(mode => renderChart(fixture, runtime, mode)));
  const geometry = outputs.map(svg => svg.match(/viewBox="([^"]+)"/)[1]);
  expect(new Set(geometry).size).toBe(1);
  for (const [index, mode] of ['auto', 'light', 'dark'].entries()) {
    expect(outputs[index]).toContain(`data-appearance="${mode}"`);
  }
});

test('renders parallel regions, sequence and entity relationship diagrams', async () => {
  const cases = [
    ['stateDiagram-v2\nstate Session {\n[*] --> Active\n--\n[*] --> Connected\n}\n', ['Active', 'Connected']],
    ['sequenceDiagram\nparticipant Client\nparticipant Worker\nClient->>Worker: process the request\nWorker-->>Client: result accepted\n', ['process the request', 'result accepted']],
    ['erDiagram\nJOB ||--o{ ATTEMPT : has\nJOB {\nstring id PK\n}\nATTEMPT {\nstring id PK\n}\n', ['JOB', 'ATTEMPT']],
  ];
  for (const [source, labels] of cases) {
    const svg = await renderChart(source, runtime);
    for (const label of labels) expect(svg.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').includes(label)).toBe(true);
    expect(svg).toMatch(/viewBox="0 0 [\d.]+ [\d.]+"/);
  }
});

test('invalid style or Mermaid input fails without overwriting an existing export', async () => {
  await expect(renderChart(fixture, runtime, 'sepia')).rejects.toThrow('Appearance');
  const dir = mkdtempSync(join(tmpdir(), 'pstack-render-'));
  try {
    const source = join(dir, 'invalid.mmd'), output = join(dir, 'chart.svg');
    writeFileSync(source, 'this is not a diagram');
    writeFileSync(output, 'previous successful export');
    const cli = fileURLToPath(new URL('../plugins/pstack/skills/statechart/scripts/render.mjs', import.meta.url));
    const result = spawnSync('node', [cli, source, output, runtime], { encoding: 'utf8' });
    expect(result.status).not.toBe(0);
    expect(readFileSync(output, 'utf8')).toBe('previous successful export');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('the CLI renders when invoked through an absolute or relative symlink', () => {
  const dir = mkdtempSync(join(tmpdir(), 'pstack-render-link-'));
  try {
    const cli = fileURLToPath(new URL('../plugins/pstack/skills/statechart/scripts/render.mjs', import.meta.url));
    const source = join(dir, 'chart.mmd');
    writeFileSync(source, fixture);
    symlinkSync(cli, join(dir, 'absolute.mjs'));
    symlinkSync('absolute.mjs', join(dir, 'relative.mjs'));
    for (const name of ['absolute', 'relative']) {
      const output = join(dir, `${name}.svg`);
      const result = spawnSync('node', [join(dir, `${name}.mjs`), source, output, runtime], { encoding: 'utf8' });
      expect(result.status).toBe(0);
      expect(readFileSync(output, 'utf8').startsWith('<svg ')).toBe(true);
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
