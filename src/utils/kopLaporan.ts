import type { ExcelPreLine } from "@/utils/excelExport";

// Kop export (belum ada sumber di sistem, ditulis tetap seperti Delphi)
const KOP_NAMA = "CV. Kencana Print";
const KOP_ALAMAT = "Padokan RT 04 / 04  Sawahan Ngemplak, Boyolali";
const KOP_TELP = "Telp. 0271-740634/0271-740634";
const WARNA_KOP = "1A237E";

export const buatKopPreLines = (
  judul: string,
  periode: string,
): ExcelPreLine[] => [
  { text: KOP_NAMA, bold: true, size: 11, color: WARNA_KOP },
  { text: KOP_ALAMAT, bold: true, size: 10, color: WARNA_KOP },
  { text: KOP_TELP, bold: true, size: 10, color: WARNA_KOP },
  { text: "" },
  { text: judul, bold: true, size: 10, color: WARNA_KOP },
  { text: periode, bold: true, size: 10, color: WARNA_KOP },
];
