/* Vendoroidut kirjastot ladataan index.html:ssä <script>-tageina, joten ne näkyvät
   globaaleina. Tyypit tulevat npm-paketeista (devDependency), itse ajonaikainen
   koodi tulee vendor/-hakemistosta. */
import type JSZipType from 'jszip';
import type { jsPDF } from 'jspdf';

declare global {
  const JSZip: typeof JSZipType;
  interface Window {
    JSZip?: typeof JSZipType;
    jspdf?: { jsPDF: typeof jsPDF };
  }
}

export {};
