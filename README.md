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
- **Pankkiviivakoodi**: laskuun piirretään Code 128C -viivakoodi ja CSV-vientiin lisätään
  54-merkkinen virtuaaliviivakoodi (versio 4) Finanssiala ry:n pankkiviivakoodi-oppaan mukaisesti.
  Viivakoodi on 104 mm leveä ja 12 mm korkea (opas sallii 70–105 mm ja 10–12,7 mm). Vaatii
  suomalaisen IBANin, viitenumeron ja summan alle 1 000 000 € – muuten sovellus kertoo syyn
  eikä piirrä koodia.
- **Tulosteet**: esikatselu selaimessa, yksi PDF jossa jokainen lasku omana sivuna,
  tai ZIP jossa oma PDF per jäsen (`1001_Matti_Meikalainen.pdf`) + `laskut.csv`.
- **CSV-vienti**: `nimi;sahkoposti;laskunumero;viite;summa;erapaiva` – kätevä sähköpostien
  massalähetykseen (mail merge), jolla PDF:t toimitetaan jäsenille.
- Lomakkeen arvot ja logo tallentuvat selaimen localStorageen, joten ne ovat tallella
  seuraavalla käynnillä.

## Käyttö paikallisesti

```bash
nvm use           # Node-versio .nvmrc-tiedostosta (24)
npm install
npm run dev       # http://localhost:5173
```

## Julkaisu GitHub Pagesiin

Julkaisu tapahtuu GitHub Actionsilla: jokainen push `main`-haaraan ajaa testit, kääntää
sovelluksen ja julkaisee `dist/`-hakemiston Pagesiin (`.github/workflows/deploy.yml`).

Ota käyttöön kerran: **Settings → Pages → Source: GitHub Actions**. Oma verkkotunnus
(`laskutin.kettuniemi.fi`) tulee `public/CNAME`-tiedostosta, joka kopioituu buildin mukana.

Käännetty tuloste ei ole versionhallinnassa – buildin tekee CI.

## Tekniikka

| | |
|---|---|
| React 19 + TypeScript | käyttöliittymä |
| Vite | kehityspalvelin ja build |
| Vitest | testit |
| [jsPDF](https://github.com/parallax/jsPDF) | PDF-piirto (MIT) |
| [JSZip](https://stuk.github.io/jszip/) | ZIP ja .xlsx (MIT tai GPLv3) |

Kirjastot niputetaan buildissa omaan bundleen npm:stä – sovellus ei lataa mitään CDN:stä
eikä muualta verkosta. Riippuvuuksien eheys tulee `package-lock.json`:n tarkisteista, ja
`npm ci` asentaa tasan lukitut versiot. jsPDF ja JSZip ladataan dynaamisesti vasta kun
laskuja luodaan tai Excel-tiedostoa käsitellään, joten sivun ensilataus pysyy kevyenä.

```bash
npm run dev       # kehityspalvelin
npm run build     # tyyppitarkistus + tuotantobuild dist-hakemistoon
npm run preview   # tuotantobuildin esikatselu
npm test          # Vitest
npm run check     # build + testit
```

## Rakenne

| Hakemisto | Sisältö |
|---|---|
| `src/lib/` | kehysriippumaton logiikka: viitenumerot, IBAN, jäsenlistan jäsennys, Excel, PDF-piirto |
| `src/components/` | React-komponentit, yksi per lomakeosio |
| `src/hooks/` | `usePersistentState` – lomakkeen tila localStoragessa |
| `tests/` | Vitest-testit ja testiaineistot |

`src/lib` ei tunne Reactia eikä DOM:ia, joten sama koodi ajetaan selaimessa ja testeissä.

## Tiedostot

| Tiedosto | Sisältö |
|---|---|
| `index.html` | Viten entry-tiedosto |
| `src/main.tsx`, `src/App.tsx` | sovelluksen juuri |
| `src/styles.css` | ulkoasu (vaalea ja tumma tila) |
| `public/CNAME` | oma verkkotunnus GitHub Pagesille |
| `.github/workflows/deploy.yml` | testaa, kääntää ja julkaisee |
| `esimerkki-jasenet.csv` | esimerkkiaineisto tuontia varten |
| `jasenlista-pohja.xlsx` / `.csv` | pohjat jäsenlistalle (samat kuin napeista) |
| `esimerkki-lasku.pdf` | esimerkkituloste |
| `LICENSE` | MIT-lisenssi |

## Huomioita

- Viitenumeron pituus on 4–20 numeroa, eli etuliite + juokseva numero saa olla enintään 19 numeroa.
- Pankkiviivakoodin Code 128C -koodaus on omaa koodia (`src/lib/code128.ts`), ja testit vertaavat
  sen tuotosta jsbarcode-kirjastoon 50 satunnaisella koodilla. Lisäksi yksi testi lukee valmiin
  PDF:n sisältövirrasta piirretyt palkit takaisin moduulijonoksi ja vertaa sitä koodaukseen.
- Excel-tuki kattaa `.xlsx`-muodon (luetaan ja kirjoitetaan suoraan JSZipillä, ilman taulukkokirjastoa).
  Vanhaa binääristä `.xls`-muotoa ei tueta – tallenna se Excelissä muodossa `.xlsx` tai CSV. Laskukaavat
  luetaan niiden tallennetusta arvosta, joten tallenna tiedosto Excelissä ennen tuontia.
- Jäsenkohtainen summa CSV:ssä korvaa laskurivit yhdellä rivillä (kuvaus otetaan ensimmäiseltä laskuriviltä).
- PDF käyttää Helvetica-fonttia, joka tukee skandeja (ä, ö, å).
- Mahdollinen jatkokehitys: virtuaaliviivakoodi / QR-koodi maksuosioon, laskujen lähetys
  suoraan sähköpostilla (vaatisi palvelimen tai esim. Mailgun-integraation).

## Lisenssi

[MIT](LICENSE) © 2026 laurinie

Riippuvuudet omilla lisensseillään: React (MIT), jsPDF (MIT) ja JSZip (MIT / GPLv3, kaksoislisenssi).
