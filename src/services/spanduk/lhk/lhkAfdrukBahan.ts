// Sembilan bahan tetap LHK Afdruk (satu sumber untuk form dan browse).
// kode = tgarmen_brg.brg_kode (kategori SPANDUK); null = belum ada di master.
// key = nama field di form, kolom = nama kolom di hasil browse backend.
export const SLOT_BAHAN = [
  { key: "rinso", kolom: "Rinso", label: "Rinso", kode: "AK260272" },
  { key: "porstek", kolom: "Porstek", label: "Porstek", kode: "S0007" },
  { key: "m46", kolom: "M46", label: "M-46", kode: "S0045" },
  { key: "kaporit", kolom: "Kaporit", label: "Kaporit", kode: "S0003" },
  { key: "caustik", kolom: "Caustik", label: "Caustik", kode: "S0001" },
  { key: "ulano", kolom: "Ulano", label: "Ulano", kode: "S0009" },
  { key: "screen", kolom: "Screen", label: "Screen", kode: "AK260278" },
  { key: "lem", kolom: "Lem", label: "Lem", kode: "S0006" },
  { key: "katalis", kolom: "Katalis", label: "Katalis", kode: "S0004" },
] as const;

// kode dilebarkan jadi string | null: data sekarang semuanya literal,
// padahal slot yang belum ada di master harus tetap bisa bernilai null
export type SlotBahan = Omit<(typeof SLOT_BAHAN)[number], "kode"> & {
  kode: string | null;
};
