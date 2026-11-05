import { existsSync, readFileSync, realpathSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const assets = new URL('../assets/', import.meta.url);
const faces = [
  ['Regular', 400, 'normal'],
  ['Medium', 500, 'normal'],
  ['Italic', 400, 'italic'],
  ['MediumItalic', 500, 'italic'],
];

export async function renderChart(source, runtime, appearance = 'auto') {
  if (!['auto', 'light', 'dark'].includes(appearance)) {
    throw new Error('Appearance must be auto, light, or dark.');
  }
  const require = createRequire(resolve(runtime, 'package.json'));
  const { render } = await import(pathToFileURL(require.resolve('pele')).href);
  const { createCanvas, GlobalFonts } = require('@napi-rs/canvas');
  let fontCss = '';
  for (const [fileFamily, family] of [['Sans', 'Pstack Sans'], ['Mono', 'Pstack Mono']]) {
    for (const [face, weight, style] of faces) {
      const file = new URL(`IBMPlex${fileFamily}-${face}.ttf`, assets);
      if (!GlobalFonts.registerFromPath(fileURLToPath(file), family)) {
        throw new Error(`Could not register ${file.pathname}.`);
      }
      const data = readFileSync(file).toString('base64');
      fontCss += `@font-face{font-family:'${family}';font-weight:${weight};font-style:${style};src:url(data:font/ttf;base64,${data}) format('truetype')}\n`;
    }
  }
  const context = createCanvas(1, 1).getContext('2d');
  const { svg } = render(source, {
    fontFamily: 'Pstack Sans',
    fontFamilyMono: 'Pstack Mono',
    fontSize: 16,
    padding: 28,
    idPrefix: `pstack-${createHash('sha256').update(`${source}\0${appearance}`).digest('hex').slice(0, 12)}-`,
    measurer: {
      width(text, size, style) {
        const pixels = style & 24 ? size / 1.2 : size;
        const family = style & 4 ? 'Pstack Mono' : 'Pstack Sans';
        context.font = `${style & 2 ? 'italic ' : ''}${style & 1 ? 500 : 400} ${pixels}px "${family}"`;
        return context.measureText(text).width;
      },
    },
    limit: 1_000_000,
    outputLimit: 8_000_000,
    maxEdges: 10_000,
  });
  const css = readFileSync(new URL('balanced.css', assets), 'utf8');
  const license = readFileSync(new URL('OFL.txt', assets), 'utf8')
    .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
  const output = svg.replace('<svg ', `<svg data-appearance="${appearance}" `)
    .replace(/(<svg\b[^>]*>)/, `$1<metadata>${license}</metadata><style>${fontCss}${css}</style><rect class="pstack-background" width="100%" height="100%" fill="var(--pele-bg)"/>`);
  if (Buffer.byteLength(output) > 8_000_000) {
    throw new Error('The SVG including its embedded fonts exceeds 8 MB.');
  }
  return output;
}

if (process.argv[1] && existsSync(process.argv[1]) && realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [source, output, runtime, flag, appearance] = process.argv.slice(2);
  if (!source || !output || !runtime || (flag && flag !== '--appearance') ||
      (flag && !appearance) || process.argv.length > 7) {
    console.error('Usage: node render.mjs INPUT.mmd OUTPUT.svg RUNTIME_DIR [--appearance auto|light|dark]');
    process.exitCode = 1;
  } else {
    writeFileSync(output, await renderChart(readFileSync(source, 'utf8'), runtime, appearance));
  }
}
