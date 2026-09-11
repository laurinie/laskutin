declare module 'jsbarcode/bin/barcodes/CODE128/CODE128C.js' {
  export default class CODE128C {
    constructor(data: string, options: object);
    encode(): { data: string; text: string };
  }
}
