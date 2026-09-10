#!/usr/bin/env node
// Run on a branch after publishing a release, then review the formula update in a PR.
const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');

async function main() {
  const tag = process.argv[2];
  if (!/^v\d+\.\d+\.\d+$/.test(tag || '')) throw new Error('Usage: node scripts/update-homebrew.cjs vX.Y.Z');
  const url = `https://github.com/jordanhubbard/webmux/archive/refs/tags/${tag}.tar.gz`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Download failed: ${response.status} ${url}`);
  const checksum = createHash('sha256').update(Buffer.from(await response.arrayBuffer())).digest('hex');
  const file = path.resolve(__dirname, '../Formula/webmux.rb');
  const formula = fs.readFileSync(file, 'utf8');
  if (!/^  url ".*"$/m.test(formula) || !/^  sha256 "[a-f0-9]{64}"$/m.test(formula)) {
    throw new Error('Formula URL/checksum stanzas were not found; no changes written.');
  }
  fs.writeFileSync(file, formula.replace(/^  url ".*"$/m, `  url "${url}"`)
    .replace(/^  sha256 "[a-f0-9]{64}"$/m, `  sha256 "${checksum}"`));
  console.log(`Updated ${file} to ${tag}; commit this change through a pull request.`);
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
