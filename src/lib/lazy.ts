import type JSZipType from 'jszip';
import type { jsPDF } from 'jspdf';

export const loadJSZip = async (): Promise<typeof JSZipType> => (await import('jszip')).default;

export async function createDoc(): Promise<jsPDF> {
  const { jsPDF } = await import('jspdf');
  return new jsPDF({ unit: 'mm', format: 'a4', compress: true });
}
