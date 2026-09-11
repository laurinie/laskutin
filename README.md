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

## Riippuvuudet

Ladataan CDN:stä (jsDelivr, varalähteenä cdnjs) – vaatii verkkoyhteyden sivun latauksessa, mutta itse laskut
luodaan paikallisesti:

- [jsPDF](https://github.com/parallax/jsPDF) 2.5.2 – PDF:n piirto
- [JSZip](https://stuk.github.io/jszip/) 3.10.1 – ZIP-paketointi

Jos haluat sovelluksen toimivan täysin ilman verkkoa, lataa molemmat tiedostot repoon ja
vaihda `index.html`:n `<script src>`-polut paikallisiin.

## Tiedostot

| Tiedosto | Sisältö |
|---|---|
| `index.html` | Lomake ja sivun rakenne |
| `styles.css` | Ulkoasu (tukee vaaleaa ja tummaa tilaa) |
| `LICENSE` | MIT-lisenssi |
| `CNAME` | Oma verkkotunnus GitHub Pagesille (`laskutin.kettuniemi.fi`) |
| `app.js` | Jäsenlistan jäsennys, viitenumerot, IBAN-tarkistus, PDF:n piirto, lataukset |
| `esimerkki-jasenet.csv` | Esimerkkiaineisto tuontia varten |
| `jasenlista-pohja.xlsx` | Excel-pohja jäsenlistalle (sama kuin *Excel-pohja*-napista) |
| `jasenlista-pohja.csv` | CSV-pohja jäsenlistalle |
| `esimerkki-lasku.pdf` | Esimerkkituloste (2 laskua, testilogolla) |

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

Käytetyt kirjastot omilla lisensseillään: jsPDF (MIT) ja JSZip (MIT / GPLv3, kaksoislisenssi).
