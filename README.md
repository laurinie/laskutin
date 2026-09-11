# 🧾 Laskutin

Staattinen selainsovellus PDF-laskujen generointiin nimi+sähköposti-listasta.
Ei palvelinta, ei asennusta, ei tilien luontia – kaikki tapahtuu selaimessa, eikä vastaanottajalista
lähde koneelta mihinkään.

## Ominaisuudet

- **Vastaanottajien tuonti**: liitä leikepöydältä, tuo **CSV- tai Excel-tiedosto (.xlsx)** tai raahaa
  tiedosto kenttään. Erottimena `;`, `,` tai tab. Valmiin pohjan saa napeista *Excel-pohja* ja
  *CSV-pohja* (samat tiedostot ovat myös repossa).
- **Sarakkeiden tunnistus**: otsikkorivistä tunnistetaan nimi-, sähköposti- ja summasarake, myös
  erilliset `Etunimi`/`Sukunimi`-sarakkeet ja englanninkieliset otsikot (`Name`, `Email`, `Amount`).
  Jäsen- tai asiakasnumeron kaltaiset sarakkeet ohitetaan, eikä niitä sekoiteta summaan. Ilman otsikkoriviä
  sarakkeet päätellään sisällöstä. Sovellus näyttää, mitkä sarakkeet se tunnisti.
  Rivikohtainen summa korvaa oletussumman kyseisellä vastaanottajalla.
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
  Viivakoodi on 104 mm leveä ja 12,7 mm korkea (opas sallii 70–105 mm ja 10–12,7 mm), ja se
  piirretään valkoiselle pohjalle, jotta hiljaiset alueet säilyvät. Sama numerosarja tulostuu
  laskulle myös luettavana tekstinä viiden numeron ryhmissä. Vaatii
  suomalaisen IBANin, viitenumeron ja summan alle 1 000 000 € – muuten sovellus kertoo syyn
  eikä piirrä koodia.
- **Tulosteet**: esikatselu selaimessa, yksi PDF jossa jokainen lasku omana sivuna,
  tai ZIP jossa oma PDF per vastaanottaja (`1001_Matti_Meikalainen.pdf`) + `laskut.csv`.
- **CSV-vienti**: `nimi;sahkoposti;laskunumero;viite;summa;erapaiva` – kätevä sähköpostien
  massalähetykseen (mail merge), jolla PDF:t toimitetaan vastaanottajille.
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

## Käyttötilastot

Sivu laskee kävijät ja luotujen laskuerien määrän [GoatCounterilla](https://www.goatcounter.com):
ilmainen, avoimeen lähdekoodiin perustuva, EU-isännöity ja evästeetön, joten suostumusbanneria
ei tarvita. Mittaus tehdään yhdellä 1×1-kuvapyynnöllä, eikä sivulle ladata kolmannen osapuolen
JavaScriptiä.

Mitä lähetetään:

| Tapahtuma | Milloin |
|---|---|
| sivun polku | sivu avataan |
| `pdf-<väli>` | yhdistetty PDF ladataan |
| `zip-<väli>` | ZIP ladataan |
| `csv-<väli>` | CSV viedään |

`<väli>` on laskujen lukumäärän luokka (`1`, `2-10`, `11-50`, `51-200`, `200+`). **Vastaanottajien
nimiä, sähköposteja, IBANeja, viitteitä tai summia ei lähetetä koskaan** – vain edellä olevat
tapahtumanimet. Mittaus ohitetaan, jos selain lähettää Do-Not-Track-pyynnön tai sivua ajetaan
localhostissa.

Käyttöönotto:

1. Luo ilmainen tili osoitteessa goatcounter.com ja valitse koodi (esim. `laskutin`).
2. Lisää GitHubissa **Settings → Secrets and variables → Actions → Variables** muuttuja
   `GOATCOUNTER_URL` arvolla `https://laskutin.goatcounter.com/count`.
3. Seuraava julkaisu ottaa mittauksen käyttöön. Ilman muuttujaa sovellus ei lähetä mitään.

Paikallisesti mittauksen voi testata kopioimalla `.env.example` tiedostoksi `.env`.

## Rakenne

| Hakemisto | Sisältö |
|---|---|
| `src/lib/` | kehysriippumaton logiikka: viitenumerot, IBAN, vastaanottajalistan jäsennys, Excel, PDF-piirto, tilastot |
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
| `esimerkki-vastaanottajat.csv` | esimerkkiaineisto tuontia varten |
| `vastaanottajat-pohja.xlsx` / `.csv` | pohjat vastaanottajalistalle (samat kuin napeista) |
| `esimerkki-lasku.pdf` | esimerkkituloste |
| `LICENSE` | MIT-lisenssi |

## Huomioita

- Viitenumeron pituus on 4–20 numeroa, eli etuliite + juokseva numero saa olla enintään 19 numeroa.
- **Viivakoodin lukeminen**: koodi on tarkoitettu tulosteelle. Testasin valmiin PDF:n
  zxing-cpp-lukijalla: se lukee koodin oikein 150 dpi:stä ylöspäin, mutta ei enää 120 dpi:ssä.
  Näytöltä skannattaessa PDF kannattaa siis zoomata noin 200 prosenttiin. Spesifikaatio rajaa
  leveyden 105 millimetriin, joten moduulia ei voi kasvattaa tätä suuremmaksi.
- Pankkiviivakoodin Code 128C -koodaus on omaa koodia (`src/lib/code128.ts`), ja testit vertaavat
  sen tuotosta jsbarcode-kirjastoon 50 satunnaisella koodilla. Lisäksi yksi testi lukee valmiin
  PDF:n sisältövirrasta piirretyt palkit takaisin moduulijonoksi ja vertaa sitä koodaukseen.
- Excel-tuki kattaa `.xlsx`-muodon (luetaan ja kirjoitetaan suoraan JSZipillä, ilman taulukkokirjastoa).
  Vanhaa binääristä `.xls`-muotoa ei tueta – tallenna se Excelissä muodossa `.xlsx` tai CSV. Laskukaavat
  luetaan niiden tallennetusta arvosta, joten tallenna tiedosto Excelissä ennen tuontia.
- Rivikohtainen summa CSV:ssä korvaa laskurivit yhdellä rivillä (kuvaus otetaan ensimmäiseltä laskuriviltä).
- PDF käyttää Helvetica-fonttia, joka tukee skandeja (ä, ö, å).
- Mahdollinen jatkokehitys: virtuaaliviivakoodi / QR-koodi maksuosioon, laskujen lähetys
  suoraan sähköpostilla (vaatisi palvelimen tai esim. Mailgun-integraation).

## Lisenssi

[MIT](LICENSE) © 2026 laurinie

Riippuvuudet omilla lisensseillään: React (MIT), jsPDF (MIT) ja JSZip (MIT / GPLv3, kaksoislisenssi).
