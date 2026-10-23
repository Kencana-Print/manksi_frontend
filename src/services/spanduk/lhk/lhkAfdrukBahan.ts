// Sembilan bahan tetap LHK Afdruk (satu sumber untuk form dan browse).
// kode = barang di master (tbarang_new); null = belum ada di master (M-46).
// key = nama field di form, kolom = nama kolom di hasil browse backend.
export const SLOT_BAHAN = [
  { key: "rinso", kolom: "Rinso", label: "Rinso", kode: 10401 },
  { key: "porstek", kolom: "Porstek", label: "Porstek", kode: 10400 },
  { key: "m46", kolom: "M46", label: "M-46", kode: 10622 },
  { key: "kaporit", kolom: "Kaporit", label: "Kaporit", kode: 10438 },
  { key: "caustik", kolom: "Caustik", label: "Caustik", kode: 10439 },
  { key: "ulano", kolom: "Ulano", label: "Ulano", kode: 10435 },
  { key: "screen", kolom: "Screen", label: "Screen", kode: 10436 },
  { key: "lem", kolom: "Lem", label: "Lem", kode: 10441 },
  { key: "katalis", kolom: "Katalis", label: "Katalis", kode: 10437 },
] as const;

export type SlotBahan = (typeof SLOT_BAHAN)[number];
