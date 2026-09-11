# 🧾 Laskutin

Staattinen selainsovellus PDF-laskujen generointiin jäsenrekisterin nimi+sähköposti-listasta.
Ei palvelinta, ei asennusta, ei tilien luontia – kaikki tapahtuu selaimessa, eikä jäsenlista
lähde koneelta mihinkään.

## Ominaisuudet

- **Jäsenlistan tuonti**: liitä leikepöydältä, tuo **CSV- tai Excel-tiedosto (.xlsx)** tai raahaa
  tiedosto kenttään. Erottimena `;`, `,` tai tab. Valmiin pohjan saa napeista *Excel-pohja* ja
  *CSV-pohja* (samat tiedostot ovat myös repossa).
- **Sarakkeiden tunnistus**: otsikkorivistä tunnistetaan nimi-, sähköposti- ja summasarake, myös
  erilliset `Etunimi`/`Sukunimi`-sarakkeet ja englanninkieliset otsikot (`Name`, `Email`, `Amount`).
  Jäsennumeron kaltaiset sarakkeet ohitetaan, eikä niitä sekoiteta summaan. Ilman otsikkoriviä
  sarakkeet päätellään sisällöstä. Sovellus näyttää, mitkä sarakkeet se tunnisti.
  Jäsenkohtainen summa korvaa oletussumman ko. jäsenellä.
- **Laskun sisältö**: otsikko, monirivinen saatesanat-teksti, laskurivit (`Kuvaus;summa`),
  kuva/logo (oikea ylänurkka, vasen tai leveä banneri) ja alatunniste.
- **Maksutiedot**: saaja, IBAN (tarkistetaan mod-97-algoritmilla), BIC, laskun päivä,
  eräpäivä, juokseva laskunumero ja vapaa lisätietokenttä.
- **Viitenumerot** kahdessa tilassa:
  - *Oma viite jokaiselle* – suomalainen viitenumero, runko = `etuliite + juokseva numero`,
    tarkistenumero 7-3-1-menetelmällä.
  - *Yhteinen viite* – sama viite kaikille. Jos annat pelkän rungon, tarkiste lisätään automaattisesti.
- **Tulosteet**: esikatselu selaimessa, yksi PDF jossa jokainen lasku omana sivuna,
  tai ZIP jossa oma PDF per jäsen (`1001_Matti_Meikalainen.pdf`) + `laskut.csv`.
- **CSV-vienti**: `nimi;sahkoposti;laskunumero;viite;summa;erapaiva` – kätevä sähköpostien
  massalähetykseen (mail merge), jolla PDF:t toimitetaan jäsenille.
- Lomakkeen arvot ja logo tallentuvat selaimen localStorageen, joten ne ovat tallella
  seuraavalla käynnillä.

## Käyttö paikallisesti

Avaa `index.html` selaimessa, tai käynnistä kevyt palvelin (suositeltu, jotta kaikki
selaintoiminnot varmasti toimivat):

```bash
python3 -m http.server 8000
# avaa http://localhost:8000
```

## Julkaisu GitHub Pagesiin

```bash
git init -b main
git add .
git commit -m "Laskutin: PDF-laskugeneraattori"
git remote add origin git@github.com:<käyttäjä>/<repo>.git
git push -u origin main
```

Sen jälkeen GitHubissa: **Settings → Pages → Source: Deploy from a branch → main / (root) → Save**.
Sovellus on parin minuutin päästä osoitteessa `https://<käyttäjä>.github.io/<repo>/`.

Tämä sovellus on julkaistu osoitteessa **https://laskutin.kettuniemi.fi** – oma verkkotunnus
asetetaan kohdassa Settings → Pages → Custom domain, mikä luo repoon `CNAME`-tiedoston.
Älä poista sitä, tai domain irtoaa julkaisusta.

Sivusto on täysin staattinen (`index.html`, `styles.css`, `app.js`), joten mikä tahansa
staattinen hosting toimii yhtä hyvin.

## Riippuvuudet ja turvallisuus

Kirjastot ovat repossa `vendor/`-hakemistossa – **sovellus ei lataa mitään ulkopuolelta**.
Sivun voi ajaa täysin verkotta, eikä CDN:n kaatuminen tai kaappaus voi vaikuttaa siihen.

| Kirjasto | Versio | Lisenssi |
|---|---|---|
| [jsPDF](https://github.com/parallax/jsPDF) | 4.2.1 | MIT |
| [JSZip](https://stuk.github.io/jszip/) | 3.10.2 | MIT tai GPLv3 |

Jokaisella tiedostolla on `index.html`:ssä [SRI](https://developer.mozilla.org/en-US/docs/Web/Security/Subresource_integrity)-tarkiste
(`integrity="sha384-…"`). Jos tiedosto muuttuu tavullakaan, selain kieltäytyy suorittamasta sitä.
Tarkisteet ovat myös `vendor/versions.json`-tiedostossa.

```bash
npm run verify    # tarkistaa että vendor-tiedostot vastaavat tarkisteita
npm run vendor    # päivittää vendor-tiedostot ja tarkisteet node_modulesista
```

Kirjastot asennetaan `npm install`illa vain kehitystä varten (tyypit ja `npm run vendor`);
itse julkaistu sivusto ei tarvitse `node_modules`-hakemistoa.

## Kehitys

Lähdekoodi on TypeScriptiä hakemistossa `src/`, ja käännetty JavaScript menee hakemistoon
`dist/`. Molemmat ovat versionhallinnassa, joten GitHub Pages tarjoilee sivuston ilman
erillistä build-vaihetta.

```bash
npm install       # kehitysriippuvuudet (TypeScript + kirjastojen tyypit)
npm run build     # kääntää src/ -> dist/
npm run watch     # kääntää taustalla muutoksen yhteydessä
npm test          # kääntää ja ajaa yksikkötestit
npm run check     # verify + test
```

**Muista ajaa `npm run build` ennen committia**, muuten `dist/` jää vanhaksi eivätkä
muutokset näy julkaistulla sivulla.

Moduulit:

| Tiedosto | Vastuu |
|---|---|
| `src/format.ts` | rahan, päivien ja tekstin muotoilu |
| `src/reference.ts` | viitenumero (7-3-1) ja IBAN-tarkistus (mod 97) |
| `src/members.ts` | jäsenlistan jäsennys ja sarakkeiden tunnistus |
| `src/xlsx.ts` | Excel-tiedostojen luku ja pohjan kirjoitus |
| `src/pdf.ts` | laskun piirto – ei DOM-riippuvuuksia, joten testattavissa Nodessa |
| `src/app.ts` | käyttöliittymä, lomakkeen tila ja lataukset |

Testit (`tests/`) ajetaan Noden omalla test runnerilla. Ne kattavat viitenumerot, IBANin,
jäsenlistan jäsennyksen, Excel-luvun (myös openpyxl:llä tuotetulla kiintotiedostolla) ja
PDF:n piirron samalla jsPDF-versiolla, joka on vendoroitu selainta varten.

## Tiedostot

| Tiedosto | Sisältö |
|---|---|
| `index.html` | Lomake ja sivun rakenne |
| `styles.css` | Ulkoasu (tukee vaaleaa ja tummaa tilaa) |
| `src/*.ts` | TypeScript-lähdekoodi |
| `dist/*.js` | Käännetty JavaScript, jota selain ajaa |
| `vendor/` | Kirjastot ja niiden lisenssit + `versions.json` tarkisteineen |
| `tests/` | Yksikkötestit ja testiaineistot |
| `scripts/` | `vendor.mjs` (päivitys) ja `verify-vendor.mjs` (tarkistus) |
| `esimerkki-jasenet.csv` | Esimerkkiaineisto tuontia varten |
| `jasenlista-pohja.xlsx` | Excel-pohja jäsenlistalle (sama kuin *Excel-pohja*-napista) |
| `jasenlista-pohja.csv` | CSV-pohja jäsenlistalle |
| `esimerkki-lasku.pdf` | Esimerkkituloste (2 laskua, testilogolla) |
| `LICENSE` | MIT-lisenssi |
| `CNAME` | Oma verkkotunnus GitHub Pagesille (`laskutin.kettuniemi.fi`) |

## Huomioita

- Viitenumeron pituus on 4–20 numeroa, eli etuliite + juokseva numero saa olla enintään 19 numeroa.
- Excel-tuki kattaa `.xlsx`-muodon (luetaan ja kirjoitetaan suoraan JSZipillä, ilman taulukkokirjastoa).
  Vanhaa binääristä `.xls`-muotoa ei tueta – tallenna se Excelissä muodossa `.xlsx` tai CSV. Laskukaavat
  luetaan niiden tallennetusta arvosta, joten tallenna tiedosto Excelissä ennen tuontia.
- Jäsenkohtainen summa CSV:ssä korvaa laskurivit yhdellä rivillä (kuvaus otetaan ensimmäiseltä laskuriviltä).
- PDF käyttää Helvetica-fonttia, joka tukee skandeja (ä, ö, å).
- Mahdollinen jatkokehitys: virtuaaliviivakoodi / QR-koodi maksuosioon, laskujen lähetys
  suoraan sähköpostilla (vaatisi palvelimen tai esim. Mailgun-integraation).

## Lisenssi

[MIT](LICENSE) © 2026 laurinie

Vendoroidut kirjastot omilla lisensseillään: jsPDF (MIT) ja JSZip (MIT / GPLv3, kaksoislisenssi),
lisenssitekstit hakemistossa `vendor/`.
