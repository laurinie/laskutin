import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

const sri = (path) => 'sha384-' + createHash('sha384').update(readFileSync(path)).digest('base64');

const manifest = JSON.parse(readFileSync('vendor/versions.json', 'utf8'));
const html = readFileSync('index.html', 'utf8');
let failures = 0;

for (const [file, meta] of Object.entries(manifest)) {
  if (typeof meta !== 'object') continue;
  const actual = sri(`vendor/${file}`);
  const inHtml = html.match(
    new RegExp(`<script src="vendor/${file.replace('.', '\\.')}" integrity="([^"]+)"`)
  )?.[1];

  if (actual !== meta.integrity) {
    console.error(`✗ ${file}: tiedosto ei vastaa versions.json-tarkistetta`);
    failures++;
  } else if (inHtml !== actual) {
    console.error(`✗ ${file}: index.html:n integrity-arvo ei täsmää`);
    failures++;
  } else {
    console.log(`✓ ${file}  ${meta.version}  ${actual}`);
  }
}

if (failures) {
  console.error(`\n${failures} tarkiste ei täsmää. Aja "npm run vendor" jos päivitit kirjaston tarkoituksella.`);
  process.exit(1);
}
console.log('Kaikki vendoroidut tiedostot täsmäävät.');
