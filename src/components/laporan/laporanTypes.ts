export type LaporanTipe = "text" | "number" | "date" | "datetime";
export type LaporanAlign = "left" | "center" | "right";

export interface LaporanKolom {
  key: string;
  title: string;
  // Kolom dengan nama group yang sama membentuk satu band di header
  group?: string;
  // Lebar awal dalam px
  width: number;
  align?: LaporanAlign;
  // number: rata kanan, diformat id-ID; date: dd/mm/yyyy; datetime: dd/mm/yyyy hh:mm
  tipe?: LaporanTipe;
  // Dijumlahkan di footer dan baris TOTAL Excel
  total?: boolean;
  // Angka negatif berwarna merah
  negativeRed?: boolean;
  // Nilai > 0 diberi latar pink dan teks merah (layar dan Excel)
  sorotPositif?: boolean;
  // Lebar kolom Excel; default = width / 7
  excelWidth?: number;
  /** Format angka Excel, mis. "#,##0" atau "#,##0.00". Kosong = default komponen. */
  numFmt?: string;
}

// Baris footer tambahan di bawah TOTAL (layar dan Excel)
export interface LaporanFooterTambahan {
  // Kolom tempat label ditulis
  labelKey: string;
  label: string;
  // Kolom tempat nilai ditulis
  nilaiKey: string;
  nilai: number;
  // Jumlah desimal tampilan layar, default 2
  desimal?: number;
}

export interface LaporanExportOpsi {
  // Tanpa ekstensi
  fileName: string;
  sheetName: string;
  judul: string;
  periode: string;
}

// API yang dibuka LaporanTable ke view lewat ref
export interface LaporanTableApi<T> {
  getFilteredItems: () => T[];
  exportToExcel: (opsi: LaporanExportOpsi) => Promise<void>;
  clearSelection: () => void;
}
