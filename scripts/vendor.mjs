/* Kopioi riippuvuudet node_modulesista vendor-hakemistoon, laskee SRI-tarkisteet
   ja kirjoittaa ne sekä vendor/versions.json-tiedostoon että index.html:ään.
   Aja: npm run vendor  (esim. kirjaston päivityksen jälkeen) */
import { createHash } from 'node:crypto';
import { copyFileSync, readFileSync, writeFileSync } from 'node:fs';

const LIBS = [
  { file: 'jspdf.umd.min.js', pkg: 'jspdf', from: 'node_modules/jspdf/dist/jspdf.umd.min.js', license: 'MIT' },
  { file: 'jszip.min.js', pkg: 'jszip', from: 'node_modules/jszip/dist/jszip.min.js', license: 'MIT OR GPL-3.0-or-later' }
];

export const sri = (path) => 'sha384-' + createHash('sha384').update(readFileSync(path)).digest('base64');

const manifest = {
  huom: 'Kopioitu node_modulesista komennolla "npm run vendor". Eheys tarkistetaan index.html:n integrity-attribuutilla; tarkista komennolla "npm run verify".'
};

let html = readFileSync('index.html', 'utf8');

for (const lib of LIBS) {
  copyFileSync(lib.from, `vendor/${lib.file}`);
  const version = JSON.parse(readFileSync(`node_modules/${lib.pkg}/package.json`, 'utf8')).version;
  const integrity = sri(`vendor/${lib.file}`);
  manifest[lib.file] = { version, integrity, source: lib.from, license: lib.license };

  const tag = new RegExp(`<script src="vendor/${lib.file.replace('.', '\\.')}"[^>]*></script>`);
  if (!tag.test(html)) throw new Error(`index.html:stä ei löytynyt script-tagia tiedostolle ${lib.file}`);
  html = html.replace(tag, `<script src="vendor/${lib.file}" integrity="${integrity}"></script>`);
  console.log(`${lib.file}: ${version}  ${integrity}`);
}

writeFileSync('vendor/versions.json', JSON.stringify(manifest, null, 2) + '\n');
writeFileSync('index.html', html);
console.log('vendor/ ja index.html päivitetty');
