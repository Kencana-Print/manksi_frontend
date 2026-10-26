// Penyiapan data & preset untuk pivot Laporan Mutasi Produksi Detail.
// Pivot tetap pivot sungguhan (drag and drop, bisa disusun ulang); file ini
// hanya (1) menambah field turunan supaya urutan baris/kolom benar,
// (2) menyiapkan dataset tambahan, dan (3) mendefinisikan preset susunan.

export type IdDataset = "mutasi" | "gudang" | "bs";
export type IdPreset = "alur" | "alurSize" | "gudang" | "bs";

export interface PresetPivot {
  id: IdPreset;
  label: string;
  dataset: IdDataset;
  rows: string[];
  cols: string[];
  vals: { field: string; agg: string }[];
  petunjuk: string;
}

export const DAFTAR_PRESET: PresetPivot[] = [
  {
    id: "alur",
    label: "Alur Mutasi",
    dataset: "mutasi",
    rows: ["NamaSpk", "Komponen"],
    cols: ["Rute"],
    vals: [{ field: "Jumlah", agg: "sum" }],
    petunjuk:
      'Pcs per rute mutasi (Asal → Tujuan), urut mengikuti alur gudang. Susunan bisa diubah: seret field dari panel susunan. Persentase terhadap Jumlah SPK: tambah Rumus Custom "Jumlah / JumlahSpk * 100" (benar bila baris dikelompokkan per SPK dan Komponen).',
  },
  {
    id: "alurSize",
    label: "Alur per Size",
    dataset: "mutasi",
    rows: ["NamaSpk", "Komponen", "Size"],
    cols: ["Rute"],
    vals: [{ field: "Jumlah", agg: "sum" }],
    petunjuk:
      "Sama seperti Alur Mutasi, dirinci per size (urut XS-S-M-L-XL-2XL).",
  },
  {
    id: "gudang",
    label: "Per Gudang",
    dataset: "gudang",
    rows: ["Gudang", "NamaSpk", "Komponen"],
    cols: ["Arah"],
    vals: [{ field: "Jumlah", agg: "sum" }],
    petunjuk:
      "Masuk = pcs bertujuan gudang ini; Keluar = pcs berasal dari gudang ini. Setiap mutasi dihitung dua kali (sekali per gudang), jadi jangan menjumlahkan Masuk dan Keluar.",
  },
  {
    id: "bs",
    label: "BS",
    dataset: "bs",
    rows: ["NamaSpk", "Tahap", "Komponen"],
    cols: ["Jenis"],
    vals: [{ field: "Nilai", agg: "sum" }],
    petunjuk:
      "Jumlah dan BS per tahap dan komponen. Satu kolom per jenis (Jumlah, BS Lini, BS Kain Sablon, BS Kain).",
  },
];

// ── Util kecil ──
const NUL = "\u0000";
const str = (v: unknown): string => (v == null ? "" : String(v).trim());
const bandingAlami = (a: string, b: string): number =>
  a.localeCompare(b, "id", { numeric: true, sensitivity: "base" });

// Library mengurutkan baris/kolom berdasarkan teks, jadi urutan yang benar
// dipaksa lewat awalan nomor: "1. XS", "2. S", ... (nol di depan bila >= 10 item).
const beriNomor = (urut: string[]): Map<string, string> => {
  const lebar = String(urut.length).length;
  return new Map(
    urut.map(
      (v, i) => [v, `${String(i + 1).padStart(lebar, "0")}. ${v}`] as const,
    ),
  );
};

interface Ringkas {
  asal: string;
  tujuan: string;
  tanggal: string;
  kelompok: string;
  size: string;
}
const ringkas = (r: Record<string, unknown>): Ringkas => ({
  asal: str(r.GudangAsal) || "(kosong)",
  tujuan: str(r.GudangTujuan) || "(kosong)",
  tanggal: str(r.TanggalMutasi).substring(0, 10),
  kelompok: str(r.Kelompok) || "(tanpa kelompok)",
  size: str(r.Size) || "-",
});

// ── Urutan size: XS-S-M-L-XL-2XL..., sisanya numerik/alfabetis ──
const ALIAS_SIZE: Record<string, string> = {
  XXL: "2XL",
  XXXL: "3XL",
  XXXXL: "4XL",
};
const URUTAN_SIZE = [
  "XXS",
  "XS",
  "S",
  "M",
  "L",
  "XL",
  "2XL",
  "3XL",
  "4XL",
  "5XL",
  "6XL",
  "7XL",
  "8XL",
];
const peringkatSize = (size: string): number => {
  const s = size.trim().toUpperCase();
  const i = URUTAN_SIZE.indexOf(ALIAS_SIZE[s] ?? s);
  return i >= 0 ? i : URUTAN_SIZE.length;
};
export const bandingSize = (a: string, b: string): number =>
  peringkatSize(a) - peringkatSize(b) || bandingAlami(a, b);

// ── Urutan gudang DITURUNKAN dari data (Asal → Tujuan), bukan hardcode.
// Topological sort (Kahn). Graf yang terputus atau berputar (siklus) tetap
// menghasilkan urutan: gudang dengan arus-masuk tersisa paling sedikit
// dulu, seri diputus tanggal mutasi paling awal lalu nama. ──
export const urutkanGudang = (rows: Ringkas[]): string[] => {
  const nodes = new Set<string>();
  const edges = new Map<string, { a: string; t: string }>();
  const tglKeluar = new Map<string, string>();

  for (const r of rows) {
    nodes.add(r.asal);
    nodes.add(r.tujuan);
    if (r.asal === r.tujuan) continue;
    edges.set(`${r.asal}${NUL}${r.tujuan}`, { a: r.asal, t: r.tujuan });
    const lama = tglKeluar.get(r.asal);
    if (r.tanggal && (!lama || r.tanggal < lama))
      tglKeluar.set(r.asal, r.tanggal);
  }

  const masuk = new Map<string, number>();
  nodes.forEach((n) => masuk.set(n, 0));
  edges.forEach((e) => masuk.set(e.t, (masuk.get(e.t) ?? 0) + 1));

  const tgl = (n: string): string => tglKeluar.get(n) ?? "9999-99-99";
  const banding = (x: string, y: string): number =>
    tgl(x).localeCompare(tgl(y)) || bandingAlami(x, y);

  const sisa = new Set(nodes);
  const hasil: string[] = [];
  while (sisa.size > 0) {
    const kandidat = [...sisa];
    let minMasuk = Infinity;
    for (const n of kandidat) minMasuk = Math.min(minMasuk, masuk.get(n) ?? 0);
    const pilih = kandidat
      .filter((n) => (masuk.get(n) ?? 0) === minMasuk)
      .sort(banding)[0];
    if (pilih === undefined) break;
    hasil.push(pilih);
    sisa.delete(pilih);
    edges.forEach((e) => {
      if (e.a === pilih && sisa.has(e.t)) {
        masuk.set(e.t, (masuk.get(e.t) ?? 1) - 1);
      }
    });
  }
  return hasil;
};

// ── Peta nilai → nilai ber-nomor untuk field turunan ──
const petaTurunan = (data: Record<string, unknown>[]) => {
  const rows = data.map(ringkas);
  const gudang = urutkanGudang(rows);
  const rank = new Map(gudang.map((g, i) => [g, i] as const));

  // Rute: urut (rank asal, rank tujuan)
  const unikRute = new Map<string, { asal: string; tujuan: string }>();
  for (const r of rows) {
    unikRute.set(`${r.asal}${NUL}${r.tujuan}`, {
      asal: r.asal,
      tujuan: r.tujuan,
    });
  }
  const ruteUrut = [...unikRute.values()].sort(
    (x, y) =>
      (rank.get(x.asal) ?? 0) - (rank.get(y.asal) ?? 0) ||
      (rank.get(x.tujuan) ?? 0) - (rank.get(y.tujuan) ?? 0),
  );
  const teksRute = ruteUrut.map((r) => `${r.asal} → ${r.tujuan}`);

  // Tahap (Kelompok): urut rank gudang asal paling awal, lalu nama
  const rankKelompok = new Map<string, number>();
  for (const r of rows) {
    const rk = rank.get(r.asal) ?? 0;
    const lama = rankKelompok.get(r.kelompok);
    if (lama === undefined || rk < lama) rankKelompok.set(r.kelompok, rk);
  }
  const kelompokUrut = [...rankKelompok.keys()].sort(
    (a, b) =>
      (rankKelompok.get(a) ?? 0) - (rankKelompok.get(b) ?? 0) ||
      bandingAlami(a, b),
  );

  const sizeUrut = [...new Set(rows.map((r) => r.size))].sort(bandingSize);

  return {
    rows,
    gudang: beriNomor(gudang),
    rute: beriNomor(teksRute),
    tahap: beriNomor(kelompokUrut),
    size: beriNomor(sizeUrut),
  };
};

const JENIS_BS: { nama: string; kunci: string }[] = [
  { nama: "Jumlah", kunci: "Jumlah" },
  { nama: "BS Lini", kunci: "BsLini" },
  { nama: "BS Kain Sablon", kunci: "BsKainSablon" },
  { nama: "BS Kain", kunci: "BsKain" },
];
const angka = (v: unknown): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

// Menghasilkan data untuk pivot. Field asli dipertahankan; yang ditambah/diganti:
//  mutasi : Rute, Tahap, Size (ber-nomor)
//  gudang : tiap baris jadi 2 (Masuk di gudang tujuan, Keluar di gudang asal) + Gudang, Arah
//  bs     : tiap baris jadi 4 (Jumlah, BS Lini, BS Kain Sablon, BS Kain) + Jenis, Nilai
export const bangunDataset = (
  dataset: IdDataset,
  data: Record<string, unknown>[],
): Record<string, unknown>[] => {
  const p = petaTurunan(data);
  const nomori = (m: Map<string, string>, v: string): string => m.get(v) ?? v;

  const dasar: Record<string, unknown>[] = data.map((r, i) => {
    const s = p.rows[i];
    const asal = s?.asal ?? "(kosong)";
    const tujuan = s?.tujuan ?? "(kosong)";
    return {
      ...r,
      Rute: nomori(p.rute, `${asal} → ${tujuan}`),
      Tahap: nomori(p.tahap, s?.kelompok ?? "(tanpa kelompok)"),
      Size: nomori(p.size, s?.size ?? "-"),
    };
  });

  if (dataset === "gudang") {
    return dasar.flatMap((r, i) => {
      const s = p.rows[i];
      const asal = s?.asal ?? "(kosong)";
      const tujuan = s?.tujuan ?? "(kosong)";
      return [
        { ...r, Gudang: nomori(p.gudang, tujuan), Arah: "1. Masuk" },
        { ...r, Gudang: nomori(p.gudang, asal), Arah: "2. Keluar" },
      ];
    });
  }

  if (dataset === "bs") {
    return dasar.flatMap((r) =>
      JENIS_BS.map((j, k) => ({
        ...r,
        Jenis: `${k + 1}. ${j.nama}`,
        Nilai: angka(r[j.kunci]),
      })),
    );
  }

  return dasar;
};

// ── Bantu grafik: ratakan sel ber-rowSpan/colSpan jadi grid penuh.
// Layout "grouped" pivot menghilangkan sel label di baris turunan, sedangkan
// grafik membaca baris per indeks kolom. ──
export interface ExportCell {
  text: string;
  colSpan: number;
  rowSpan: number;
}

const salin = (text: string): ExportCell => ({ text, colSpan: 1, rowSpan: 1 });

export const densifyBody = (rows: ExportCell[][]): ExportCell[][] => {
  const carry: { text: string; left: number }[] = [];
  return rows.map((row) => {
    const out: ExportCell[] = [];
    let col = 0;
    const isiCarry = (): void => {
      for (;;) {
        const c = carry[col];
        if (!c || c.left <= 0) return;
        out.push(salin(c.text));
        c.left -= 1;
        col += 1;
      }
    };
    for (const cell of row) {
      isiCarry();
      for (let k = 0; k < cell.colSpan; k++) {
        out.push(salin(cell.text));
        if (cell.rowSpan > 1)
          carry[col] = { text: cell.text, left: cell.rowSpan - 1 };
        col += 1;
      }
    }
    isiCarry();
    return out;
  });
};
