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
