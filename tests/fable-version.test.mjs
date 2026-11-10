// Harry's fork names Fable 5.2 wherever upstream names the release before it.
// Upstream still ships the older name in models.json, the fixtures, and
// CHANGES.md, so a merge can bring it back without a conflict.
import { expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const repoRoot = fileURLToPath(new URL("..", import.meta.url));
// Covers the model ID, the label, and any other separator between the parts.
// The pattern does not match its own text, so this file passes.
const OLDER_FABLE = "fable[^a-z0-9]{0,3}5[^0-9a-z]{0,2}1([^0-9]|$)";

test("no tracked text file names the Fable release before 5.2", () => {
  const grep = spawnSync("git", ["grep", "-n", "-I", "-i", "-E", OLDER_FABLE], { cwd: repoRoot, encoding: "utf8" });
  expect(grep.stderr).toBe("");
  expect(grep.stdout.split("\n").filter(Boolean)).toEqual([]);
  expect(grep.status).toBe(1);
});
