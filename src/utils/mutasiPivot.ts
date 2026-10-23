// Logika murni (tanpa Vue/DOM) untuk tampilan siap-pakai
// Laporan Mutasi Produksi Detail: Alur Mutasi, Per Gudang, BS.

export type ViewMutasi = "alur" | "gudang" | "bs";

export interface ExportCell {
  text: string;
  colSpan: number;
  rowSpan: number;
}
export interface ExportTable {
  headerRows: ExportCell[][];
  bodyRows: ExportCell[][];
}

export interface MutasiRow {
  spk: string;
  kelompok: string;
  asal: string;
  tujuan: string;
  tanggal: string;
  kode: string;
  komponen: string;
  size: string;
  jumlah: number;
  bsLini: number;
  bsKainSablon: number;
  bsKain: number;
}

export interface KolomGrid {
  key: string;
  judul: string;
  sub?: string;
  tip?: string;
  heat?: boolean;
}
export interface BarisGrid {
  label: string[];
  nilai: (number | null)[];
}
export interface Grid {
  judulLabel: string[];
  lebarLabel: number[];
  kolom: KolomGrid[];
  baris: BarisGrid[];
  total: (number | null)[] | null;
  skalaHeat: "global" | "kolom";
}
export interface OpsiGrid {
  rincianSize: boolean;
  hanyaAdaBs: boolean;
}

// ── Util kecil ──
const NUL = "\u0000";
const str = (v: unknown): string => (v == null ? "" : String(v).trim());
const num = (v: unknown): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};
const bandingAlami = (a: string, b: string): number =>
  a.localeCompare(b, "id", { numeric: true, sensitivity: "base" });

const formatter = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 2 });
export const fmtAngka = (n: number): string => formatter.format(n);

export const toMutasiRows = (data: Record<string, unknown>[]): MutasiRow[] =>
  data.map((r) => {
    const nomor = str(r.Nomor);
    const nama = str(r.NamaSpk);
    return {
      spk:
        nomor && nama ? `${nomor} — ${nama}` : nomor || nama || "(tanpa SPK)",
      kelompok: str(r.Kelompok) || "(tanpa kelompok)",
      asal: str(r.GudangAsal) || "(kosong)",
      tujuan: str(r.GudangTujuan) || "(kosong)",
      tanggal: str(r.TanggalMutasi).substring(0, 10),
      kode: str(r.Kode),
      komponen: str(r.Komponen) || "(tanpa komponen)",
      size: str(r.Size) || "-",
      jumlah: num(r.Jumlah),
      bsLini: num(r.BsLini),
      bsKainSablon: num(r.BsKainSablon),
      bsKain: num(r.BsKain),
    };
  });

// ── Urutan size: XS-S-M-L-XL-2XL..., sisanya alfabetis/numerik ──
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

// ── Urutan gudang: DITURUNKAN dari data (Asal → Tujuan), bukan hardcode.
// Topological sort (Kahn). Bila ada siklus (mis. retur), ambil gudang dengan
// jumlah arus-masuk tersisa paling kecil; seri diputus tanggal mutasi
// paling awal lalu nama. ──
export const urutkanGudang = (rows: MutasiRow[]): string[] => {
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

export interface Rute {
  key: string;
  asal: string;
  tujuan: string;
}
export const urutkanRute = (rows: MutasiRow[]): Rute[] => {
  const rank = new Map(urutkanGudang(rows).map((g, i) => [g, i] as const));
  const unik = new Map<string, Rute>();
  for (const r of rows) {
    const key = `${r.asal}${NUL}${r.tujuan}`;
    if (!unik.has(key)) unik.set(key, { key, asal: r.asal, tujuan: r.tujuan });
  }
  return [...unik.values()].sort(
    (x, y) =>
      (rank.get(x.asal) ?? 0) - (rank.get(y.asal) ?? 0) ||
      (rank.get(x.tujuan) ?? 0) - (rank.get(y.tujuan) ?? 0),
  );
};

// ── Tampilan 1: Alur Mutasi (SPK > Komponen [> Size]) × Rute ──
// Tidak ada total antar rute: pcs yang sama berpindah di tiap tahap,
// menjumlahkannya melipatgandakan angka.
const bangunAlur = (rows: MutasiRow[], opsi: OpsiGrid): Grid => {
  const rute = urutkanRute(rows);
  const idx = new Map(rute.map((r, i) => [r.key, i] as const));

  interface Akum {
    label: string[];
    spk: string;
    kode: string;
    komponen: string;
    size: string;
    nilai: (number | null)[];
  }
  const peta = new Map<string, Akum>();
  for (const r of rows) {
    const kunci = [
      r.spk,
      r.kode,
      r.komponen,
      opsi.rincianSize ? r.size : "",
    ].join(NUL);
    let b = peta.get(kunci);
    if (!b) {
      b = {
        label: opsi.rincianSize
          ? [r.spk, r.komponen, r.size]
          : [r.spk, r.komponen],
        spk: r.spk,
        kode: r.kode,
        komponen: r.komponen,
        size: r.size,
        nilai: rute.map(() => null),
      };
      peta.set(kunci, b);
    }
    const i = idx.get(`${r.asal}${NUL}${r.tujuan}`);
    if (i !== undefined) b.nilai[i] = (b.nilai[i] ?? 0) + r.jumlah;
  }

  const baris = [...peta.values()].sort(
    (a, b) =>
      bandingAlami(a.spk, b.spk) ||
      bandingAlami(a.kode, b.kode) ||
      bandingAlami(a.komponen, b.komponen) ||
      (opsi.rincianSize ? bandingSize(a.size, b.size) : 0),
  );

  return {
    judulLabel: opsi.rincianSize
      ? ["SPK", "Komponen", "Size"]
      : ["SPK", "Komponen"],
    lebarLabel: opsi.rincianSize ? [260, 150, 60] : [260, 150],
    kolom: rute.map((r) => ({
      key: r.key,
      judul: r.asal,
      sub: `→ ${r.tujuan}`,
      tip: `${r.asal} → ${r.tujuan}`,
      heat: true,
    })),
    baris: baris.map(({ label, nilai }) => ({ label, nilai })),
    total: null,
    skalaHeat: "global",
  };
};

// ── Tampilan 2: Per Gudang (Gudang > SPK > Komponen) × Masuk/Keluar/Selisih ──
const bangunGudang = (rows: MutasiRow[]): Grid => {
  const rank = new Map(urutkanGudang(rows).map((g, i) => [g, i] as const));

  interface Akum {
    gudang: string;
    spk: string;
    kode: string;
    komponen: string;
    masuk: number | null;
    keluar: number | null;
  }
  const peta = new Map<string, Akum>();
  const ambil = (gudang: string, r: MutasiRow): Akum => {
    const kunci = [gudang, r.spk, r.kode, r.komponen].join(NUL);
    let a = peta.get(kunci);
    if (!a) {
      a = {
        gudang,
        spk: r.spk,
        kode: r.kode,
        komponen: r.komponen,
        masuk: null,
        keluar: null,
      };
      peta.set(kunci, a);
    }
    return a;
  };
  for (const r of rows) {
    const m = ambil(r.tujuan, r);
    m.masuk = (m.masuk ?? 0) + r.jumlah;
    const k = ambil(r.asal, r);
    k.keluar = (k.keluar ?? 0) + r.jumlah;
  }

  const baris = [...peta.values()].sort(
    (a, b) =>
      (rank.get(a.gudang) ?? 0) - (rank.get(b.gudang) ?? 0) ||
      bandingAlami(a.spk, b.spk) ||
      bandingAlami(a.kode, b.kode) ||
      bandingAlami(a.komponen, b.komponen),
  );

  return {
    judulLabel: ["Gudang", "SPK", "Komponen"],
    lebarLabel: [190, 260, 150],
    kolom: [
      {
        key: "masuk",
        judul: "Masuk",
        tip: "pcs yang tujuannya gudang ini",
        heat: true,
      },
      {
        key: "keluar",
        judul: "Keluar",
        tip: "pcs yang asalnya gudang ini",
        heat: true,
      },
      {
        key: "selisih",
        judul: "Selisih",
        tip: "Masuk − Keluar dari mutasi pada laporan ini. Bukan saldo stok.",
      },
    ],
    baris: baris.map((a) => ({
      label: [a.gudang, a.spk, a.komponen],
      nilai: [a.masuk, a.keluar, (a.masuk ?? 0) - (a.keluar ?? 0)],
    })),
    total: null,
    skalaHeat: "global",
  };
};

// ── Tampilan 3: BS (SPK > Tahap > Komponen) × Jumlah + BS ──
// Jumlah dihitung per tahap, tidak dijumlah lintas tahap.
const bangunBs = (rows: MutasiRow[], opsi: OpsiGrid): Grid => {
  const rank = new Map(urutkanGudang(rows).map((g, i) => [g, i] as const));

  interface Akum {
    spk: string;
    kelompok: string;
    kode: string;
    komponen: string;
    nilai: [number, number, number, number]; // jumlah, lini, sablon, kain
  }
  const peta = new Map<string, Akum>();
  const rankKelompok = new Map<string, number>();
  for (const r of rows) {
    const kunci = [r.spk, r.kelompok, r.kode, r.komponen].join(NUL);
    let a = peta.get(kunci);
    if (!a) {
      a = {
        spk: r.spk,
        kelompok: r.kelompok,
        kode: r.kode,
        komponen: r.komponen,
        nilai: [0, 0, 0, 0],
      };
      peta.set(kunci, a);
    }
    a.nilai[0] += r.jumlah;
    a.nilai[1] += r.bsLini;
    a.nilai[2] += r.bsKainSablon;
    a.nilai[3] += r.bsKain;

    const kk = `${r.spk}${NUL}${r.kelompok}`;
    const rk = rank.get(r.asal) ?? 0;
    const lama = rankKelompok.get(kk);
    if (lama === undefined || rk < lama) rankKelompok.set(kk, rk);
  }

  const totalBs = (a: Akum): number => a.nilai[1] + a.nilai[2] + a.nilai[3];
  const baris = [...peta.values()]
    .filter((a) => !opsi.hanyaAdaBs || totalBs(a) > 0)
    .sort(
      (a, b) =>
        bandingAlami(a.spk, b.spk) ||
        (rankKelompok.get(`${a.spk}${NUL}${a.kelompok}`) ?? 0) -
          (rankKelompok.get(`${b.spk}${NUL}${b.kelompok}`) ?? 0) ||
        bandingAlami(a.kelompok, b.kelompok) ||
        bandingAlami(a.kode, b.kode),
    );

  const jumlahKolom = (i: number): number =>
    baris.reduce((s, a) => s + (a.nilai[i] ?? 0), 0);
  const tBs = baris.reduce((s, a) => s + totalBs(a), 0);

  return {
    judulLabel: ["SPK", "Tahap", "Komponen"],
    lebarLabel: [260, 120, 150],
    kolom: [
      {
        key: "jumlah",
        judul: "Jumlah",
        tip: "pcs yang dimutasi pada tahap ini",
      },
      { key: "lini", judul: "BS Lini", heat: true },
      { key: "sablon", judul: "BS Kain Sablon", heat: true },
      { key: "kain", judul: "BS Kain", heat: true },
      {
        key: "total",
        judul: "Total BS",
        tip: "BS Lini + BS Kain Sablon + BS Kain",
        heat: true,
      },
    ],
    baris: baris.map((a) => ({
      label: [a.spk, a.kelompok, a.komponen],
      nilai: [a.nilai[0], a.nilai[1], a.nilai[2], a.nilai[3], totalBs(a)],
    })),
    // Total Jumlah sengaja kosong: menjumlahkan lintas tahap melipatgandakan pcs.
    total: [null, jumlahKolom(1), jumlahKolom(2), jumlahKolom(3), tBs],
    skalaHeat: "kolom",
  };
};

export const bangunGrid = (
  view: ViewMutasi,
  data: Record<string, unknown>[],
  opsi: OpsiGrid,
): Grid => {
  const rows = toMutasiRows(data);
  if (view === "gudang") return bangunGudang(rows);
  if (view === "bs") return bangunBs(rows, opsi);
  return bangunAlur(rows, opsi);
};

// ── Rowspan label bertingkat: nilai >0 di baris awal run, 0 = sel tidak dirender ──
export const hitungRowspan = (baris: BarisGrid[], level: number): number[] => {
  const hasil = baris.map(() => 0);
  const sama = (
    a: BarisGrid | undefined,
    b: BarisGrid | undefined,
  ): boolean => {
    if (!a || !b) return false;
    for (let k = 0; k <= level; k++)
      if (a.label[k] !== b.label[k]) return false;
    return true;
  };
  let mulai = 0;
  for (let i = 1; i <= baris.length; i++) {
    if (!(i < baris.length && sama(baris[i], baris[mulai]))) {
      hasil[mulai] = i - mulai;
      mulai = i;
    }
  }
  return hasil;
};

const sel = (text: string): ExportCell => ({ text, colSpan: 1, rowSpan: 1 });
const selAngka = (v: number | null): ExportCell =>
  sel(v === null ? "" : fmtAngka(v));

// Bentuk sama dengan hasil scrape TinyPivotOnly.getExportTable(), jadi Export
// Excel & Grafik yang sudah ada tetap jalan. denganTotal=false untuk grafik.
export const toExportTable = (g: Grid, denganTotal: boolean): ExportTable => {
  const headerRows: ExportCell[][] = [
    [
      ...g.judulLabel.map(sel),
      ...g.kolom.map((k) => sel(k.sub ? `${k.judul} ${k.sub}` : k.judul)),
    ],
  ];
  const spans = g.judulLabel.map((_, lv) => hitungRowspan(g.baris, lv));
  const bodyRows: ExportCell[][] = g.baris.map((b, r) => {
    const row: ExportCell[] = [];
    b.label.forEach((t, lv) => {
      const rs = spans[lv]?.[r] ?? 0;
      if (rs > 0) row.push({ text: t, colSpan: 1, rowSpan: rs });
    });
    b.nilai.forEach((v) => row.push(selAngka(v)));
    return row;
  });
  if (denganTotal && g.total) {
    bodyRows.push([
      { text: "Total", colSpan: g.judulLabel.length, rowSpan: 1 },
      ...g.total.map(selAngka),
    ]);
  }
  return { headerRows, bodyRows };
};

// Ratakan sel ber-rowSpan/colSpan jadi grid penuh (tiap baris punya semua sel).
// Dipakai grafik, yang membaca baris per indeks kolom.
export const densifyBody = (rows: ExportCell[][]): ExportCell[][] => {
  const carry: { text: string; left: number }[] = [];
  return rows.map((row) => {
    const out: ExportCell[] = [];
    let col = 0;
    const isiCarry = (): void => {
      for (;;) {
        const c = carry[col];
        if (!c || c.left <= 0) return;
        out.push(sel(c.text));
        c.left -= 1;
        col += 1;
      }
    };
    for (const cell of row) {
      isiCarry();
      for (let k = 0; k < cell.colSpan; k++) {
        out.push(sel(cell.text));
        if (cell.rowSpan > 1)
          carry[col] = { text: cell.text, left: cell.rowSpan - 1 };
        col += 1;
      }
    }
    isiCarry();
    return out;
  });
};
