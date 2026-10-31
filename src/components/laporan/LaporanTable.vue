<script setup lang="ts" generic="T extends object, F extends object">
import { ref, computed, watch, onMounted, type Component } from "vue";
import { useRoute } from "vue-router";
import { useToast } from "vue-toastification";
import PageLayout from "@/components/PageLayout.vue";
import { useTabsStore } from "@/stores/tabsStore";
import {
  IconTable,
  IconFileSpreadsheet,
  IconX,
  IconRefresh,
  IconSearch,
  IconFilterOff,
  IconAdjustmentsHorizontal,
  IconFilter,
  IconChevronUp,
  IconChevronDown,
  IconChevronRight,
  IconDatabaseOff,
} from "@tabler/icons-vue";
import { exportExcel, type ExcelColumn } from "@/utils/excelExport";
import { buatKopPreLines } from "@/utils/kopLaporan";
import type {
  LaporanKolom,
  LaporanExportOpsi,
  LaporanFooterTambahan,
} from "@/components/laporan/laporanTypes";
import {
  formatTanggal,
  formatTanggalSingkat,
  toExcelDate,
} from "@/utils/dateFormat";

const props = withDefaults(
  defineProps<{
    title: string;
    menuId: string;
    // Wajib unik per laporan: menuId dipakai bersama oleh banyak laporan
    storageId: string;
    icon?: Component;
    columns: LaporanKolom[];
    items: T[];
    // Nama field unik per baris, mis. "Nomor"
    rowKey: string;
    isLoading?: boolean;
    canExport?: boolean;
    searchPlaceholder?: string;
    // Satuan di label total, mis. "SPK" -> "TOTAL (77 SPK)"
    satuan?: string;
    showNo?: boolean;
    selectedKey?: string | null;
    // Filter milik view (periode, perusahaan, dll). Disimpan dan dipulihkan
    // lewat sessionStorage, sama seperti BaseBrowse.
    filterState?: F;
    // Baris footer tambahan di bawah TOTAL; menerima total per kolom
    // (sudah mengikuti pencarian dan filter kolom)
    footerTambahan?: (total: Record<string, number>) => LaporanFooterTambahan[];
    // Master-detail: tiap baris punya array baris detail di field `detailKey`.
    // Detail tampil saat baris di-expand; header detail mendukung band (group).
    // Excel: satu baris per baris detail; kolom induk ber-total tidak ikut.
    detailColumns?: LaporanKolom[];
    detailKey?: string;
  }>(),
  {
    isLoading: false,
    canExport: false,
    searchPlaceholder: "Cari data...",
    satuan: "baris",
    showNo: true,
    selectedKey: null,
  },
);

const emit = defineEmits<{
  refresh: [];
  export: [];
  "row-dblclick": [row: T];
  "update:selectedKey": [value: string | null];
  "update:filterState": [value: F];
}>();

const toast = useToast();
const route = useRoute();
const tabsStore = useTabsStore();
const tutup = () => tabsStore.closeTab(route.path);

const LEBAR_NO = 46;
const LEBAR_EXPAND = 30;
const adaDetail = computed(
  () => !!props.detailKey && (props.detailColumns?.length ?? 0) > 0,
);

// ── Helper ──
const dua = (v: number) => Math.round(v * 100) / 100;
const fmtAngka = (v: number) =>
  new Intl.NumberFormat("id-ID", { maximumFractionDigits: 2 }).format(v);
const kosong = (v: unknown) => v === null || v === undefined || v === "";
const baca = (row: object, key: string): unknown => Reflect.get(row, key);

// Teks yang tampil di sel (juga dipakai pencarian, filter kolom, dan Excel)
const teks = (row: object, k: LaporanKolom): string => {
  const v = baca(row, k.key);
  if (kosong(v)) return "";
  if (k.tipe === "date") return formatTanggal(String(v));
  if (k.tipe === "dateSingkat") return formatTanggalSingkat(String(v));
  if (k.tipe === "datetime") {
    // Potong string, tanpa konversi zona waktu
    const s = String(v);
    return `${formatTanggal(s.slice(0, 10))} ${s.slice(11, 16)}`.trim();
  }
  if (k.tipe === "number") return fmtAngka(Number(v));
  return String(v);
};

const kunciBaris = (row: T): string => String(baca(row, props.rowKey));

const kelasSel = (k: LaporanKolom): string => {
  const a = k.align ?? (k.tipe === "number" ? "right" : "left");
  return `a-${a}`;
};

// ── Blok kolom: kolom tunggal atau satu band utuh ──
interface Blok {
  id: string;
  group: string | null;
  cols: LaporanKolom[];
}

const kelompokBlok = (cols: LaporanKolom[]): Blok[] => {
  const hasil: Blok[] = [];
  for (const k of cols) {
    const akhir = hasil[hasil.length - 1];
    if (k.group) {
      // Hanya kolom berurutan dengan group sama yang digabung jadi satu band
      if (akhir && akhir.group === k.group) akhir.cols.push(k);
      else
        hasil.push({ id: `g:${k.group}:${k.key}`, group: k.group, cols: [k] });
    } else {
      hasil.push({ id: `c:${k.key}`, group: null, cols: [k] });
    }
  }
  return hasil;
};

const bloksDefault = computed<Blok[]>(() => kelompokBlok(props.columns));

const keyUrutan = computed(() => `laporan_order_${props.storageId}`);
const muatUrutan = (): string[] => {
  try {
    const raw = localStorage.getItem(keyUrutan.value);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
};
const urutan = ref<string[]>(muatUrutan());

const bloks = computed<Blok[]>(() => {
  if (urutan.value.length === 0) return bloksDefault.value;
  const peta = new Map(bloksDefault.value.map((b) => [b.id, b]));
  const hasil: Blok[] = [];
  for (const id of urutan.value) {
    const b = peta.get(id);
    if (b) {
      hasil.push(b);
      peta.delete(id);
    }
  }
  for (const b of peta.values()) hasil.push(b);
  return hasil;
});

const kolomDaun = computed(() => bloks.value.flatMap((b) => b.cols));
const adaGroup = computed(() => props.columns.some((k) => !!k.group));

const resetUrutan = () => {
  urutan.value = [];
  try {
    localStorage.removeItem(keyUrutan.value);
  } catch {
    /* abaikan */
  }
};

// ── Header: satu atau dua baris ──
interface SelHeader {
  id: string;
  blokId: string | null;
  kolom: LaporanKolom | null;
  band: string | null;
  rowspan: number;
  colspan: number;
  drag: boolean;
}

const barisHeader = computed<SelHeader[][]>(() => {
  const r1: SelHeader[] = [];
  const r2: SelHeader[] = [];
  const rs = adaGroup.value ? 2 : 1;
  if (adaDetail.value) {
    r1.push({
      id: "__exp",
      blokId: null,
      kolom: null,
      band: null,
      rowspan: rs,
      colspan: 1,
      drag: false,
    });
  }
  if (props.showNo) {
    r1.push({
      id: "__no",
      blokId: null,
      kolom: null,
      band: null,
      rowspan: rs,
      colspan: 1,
      drag: false,
    });
  }
  for (const b of bloks.value) {
    if (b.group) {
      r1.push({
        id: b.id,
        blokId: b.id,
        kolom: null,
        band: b.group,
        rowspan: 1,
        colspan: b.cols.length,
        drag: true,
      });
      for (const k of b.cols) {
        r2.push({
          id: `${b.id}:${k.key}`,
          blokId: b.id,
          kolom: k,
          band: null,
          rowspan: 1,
          colspan: 1,
          drag: false,
        });
      }
    } else {
      r1.push({
        id: b.id,
        blokId: b.id,
        kolom: b.cols[0],
        band: null,
        rowspan: rs,
        colspan: 1,
        drag: true,
      });
    }
  }
  return adaGroup.value ? [r1, r2] : [r1];
});

const rataHeader = (s: SelHeader): string => {
  if (s.kolom) return s.kolom.tipe === "number" ? "a-center" : "a-left";
  return "a-center";
};

// ── Lebar kolom (resize) ──
const lebar = ref<Record<string, number>>({});
const lebarKolom = (k: LaporanKolom) => lebar.value[k.key] ?? k.width;
const lebarTabel = computed(
  () =>
    (adaDetail.value ? LEBAR_EXPAND : 0) +
    (props.showNo ? LEBAR_NO : 0) +
    kolomDaun.value.reduce((s, k) => s + lebarKolom(k), 0),
);

let resizing: { key: string; startX: number; startW: number } | null = null;
const mulaiResize = (key: string, e: MouseEvent) => {
  e.preventDefault();
  const th = (e.currentTarget as HTMLElement).closest("th");
  const awal = th ? th.getBoundingClientRect().width : (lebar.value[key] ?? 80);
  resizing = { key, startX: e.clientX, startW: awal };

  const gerak = (ev: MouseEvent) => {
    if (!resizing) return;
    const baru = Math.max(40, resizing.startW + ev.clientX - resizing.startX);
    lebar.value = { ...lebar.value, [resizing.key]: baru };
  };
  const lepas = () => {
    resizing = null;
    window.removeEventListener("mousemove", gerak);
    window.removeEventListener("mouseup", lepas);
    document.body.style.cursor = "";
    document.body.style.userSelect = "";
  };
  document.body.style.cursor = "col-resize";
  document.body.style.userSelect = "none";
  window.addEventListener("mousemove", gerak);
  window.addEventListener("mouseup", lepas);
};

// ── Drag blok kolom (pointer) ──
const dragSrc = ref<string | null>(null);
const dragOver = ref<string | null>(null);

const onHeaderPointerDown = (s: SelHeader, e: PointerEvent) => {
  if (!s.drag || !s.blokId) return;
  if (!(e.target as HTMLElement).classList.contains("lp-drag")) return;
  dragSrc.value = s.blokId;
  (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
};
const onHeaderPointerMove = (e: PointerEvent) => {
  if (!dragSrc.value) return;
  const th = document
    .elementsFromPoint(e.clientX, e.clientY)
    .find((el) => el.tagName === "TH" && el.hasAttribute("data-blok-id"));
  const id = th?.getAttribute("data-blok-id");
  dragOver.value = id && id !== dragSrc.value ? id : null;
};
const onHeaderPointerUp = () => {
  if (dragSrc.value && dragOver.value) {
    const ids = bloks.value.map((b) => b.id);
    const s = ids.indexOf(dragSrc.value);
    const t = ids.indexOf(dragOver.value);
    if (s !== -1 && t !== -1) {
      const baru = [...ids];
      baru.splice(s, 1);
      baru.splice(t, 0, dragSrc.value);
      urutan.value = baru;
      try {
        localStorage.setItem(keyUrutan.value, JSON.stringify(baru));
      } catch {
        /* abaikan */
      }
    }
  }
  dragSrc.value = null;
  dragOver.value = null;
};

// ── State tersimpan (sessionStorage) ──
interface StateTersimpan {
  search: string;
  filterState: unknown;
  sembunyi: Record<string, string[]>;
}
const keyState = computed(() => `laporan_state_${props.storageId}`);
const muatState = (): StateTersimpan | null => {
  try {
    const raw = sessionStorage.getItem(keyState.value);
    return raw ? (JSON.parse(raw) as StateTersimpan) : null;
  } catch {
    return null;
  }
};
const tersimpan = muatState();

const cari = ref<string>(tersimpan?.search ?? "");
// Nilai yang DISEMBUNYIKAN per kolom (nilai baru setelah refresh tampil otomatis)
const sembunyiKolom = ref<Record<string, Set<string>>>(
  Object.fromEntries(
    Object.entries(tersimpan?.sembunyi ?? {}).map(([k, v]) => [k, new Set(v)]),
  ),
);

const simpanState = () => {
  try {
    sessionStorage.setItem(
      keyState.value,
      JSON.stringify({
        search: cari.value,
        filterState: props.filterState ?? {},
        sembunyi: Object.fromEntries(
          Object.entries(sembunyiKolom.value).map(([k, v]) => [k, [...v]]),
        ),
      }),
    );
  } catch {
    /* abaikan */
  }
};
watch([cari, () => props.filterState, sembunyiKolom], simpanState, {
  deep: true,
  flush: "post",
});

// Pulihkan filter milik view sebelum view melakukan fetch pertamanya
onMounted(() => {
  const fs = tersimpan?.filterState;
  if (fs && typeof fs === "object" && Object.keys(fs).length > 0) {
    emit("update:filterState", fs as F);
  }
});

// ── Pengurutan ──
const sortKey = ref<string | null>(null);
const sortAsc = ref(true);
const urutKolom = (key: string) => {
  if (sortKey.value !== key) {
    sortKey.value = key;
    sortAsc.value = true;
  } else if (sortAsc.value) {
    sortAsc.value = false;
  } else {
    sortKey.value = null;
  }
};

const bandingkan = (a: unknown, b: unknown, k: LaporanKolom): number => {
  if (kosong(a) || kosong(b))
    return kosong(a) === kosong(b) ? 0 : kosong(a) ? 1 : -1;
  if (k.tipe === "number") return Number(a) - Number(b);
  return String(a).localeCompare(String(b), "id", { numeric: true });
};

// ── Filter kolom ──
const nilaiUnik = computed<Record<string, string[]>>(() => {
  const hasil: Record<string, string[]> = {};
  for (const k of props.columns) {
    const peta = new Map<string, unknown>();
    for (const r of props.items) {
      const t = teks(r, k);
      if (!peta.has(t)) peta.set(t, baca(r, k.key));
    }
    hasil[k.key] = [...peta.entries()]
      .sort((x, y) => bandingkan(x[1], y[1], k))
      .map((e) => e[0]);
  }
  return hasil;
});

const adaFilter = (key: string) => (sembunyiKolom.value[key]?.size ?? 0) > 0;
const jumlahFilterAktif = computed(
  () => Object.keys(sembunyiKolom.value).filter((k) => adaFilter(k)).length,
);

const kolomAktif = ref<string | null>(null);
const gayaDropdown = ref<Record<string, string>>({});
const cariDropdown = ref<Record<string, string>>({});

const nilaiDropdown = (key: string): string[] => {
  const q = (cariDropdown.value[key] ?? "").toLowerCase();
  const semua = nilaiUnik.value[key] ?? [];
  return q ? semua.filter((v) => v.toLowerCase().includes(q)) : semua;
};
const setSembunyi = (key: string, s: Set<string>) => {
  sembunyiKolom.value = { ...sembunyiKolom.value, [key]: s };
};
const toggleNilai = (key: string, val: string) => {
  const s = new Set(sembunyiKolom.value[key] ?? []);
  if (s.has(val)) s.delete(val);
  else s.add(val);
  setSembunyi(key, s);
};
// Mengetik di dropdown langsung menerapkan filter (ikon filter ikut menyala)
const onCariDropdown = (key: string, q: string) => {
  cariDropdown.value = { ...cariDropdown.value, [key]: q };
  const kecil = q.toLowerCase();
  const semua = nilaiUnik.value[key] ?? [];
  setSembunyi(
    key,
    kecil
      ? new Set(semua.filter((v) => !v.toLowerCase().includes(kecil)))
      : new Set(),
  );
};
const tampilkanSemua = (key: string) => {
  cariDropdown.value = { ...cariDropdown.value, [key]: "" };
  setSembunyi(key, new Set());
};
const sembunyikanSemua = (key: string) => {
  setSembunyi(key, new Set(nilaiUnik.value[key] ?? []));
};
const bukaFilter = (key: string, e: MouseEvent) => {
  if (kolomAktif.value === key) {
    kolomAktif.value = null;
    return;
  }
  const th = (e.currentTarget as HTMLElement).closest("th");
  if (th) {
    const rect = th.getBoundingClientRect();
    gayaDropdown.value = {
      position: "fixed",
      top: `${rect.bottom + 2}px`,
      left: `${Math.min(rect.left, window.innerWidth - 240)}px`,
      zIndex: "9999",
    };
  }
  kolomAktif.value = key;
};
const tutupFilter = () => {
  kolomAktif.value = null;
};
const resetFilterKolom = () => {
  sembunyiKolom.value = {};
  cariDropdown.value = {};
};

// ── Data tampil: pencarian -> filter kolom -> urut ──
const kolomDetail = computed<LaporanKolom[]>(() => props.detailColumns ?? []);

const detailDari = (r: T): object[] => {
  if (!props.detailKey) return [];
  const v = baca(r, props.detailKey);
  return Array.isArray(v) ? v : [];
};
const cocokBaris = (r: T, q: string): boolean =>
  props.columns.some((k) => teks(r, k).toLowerCase().includes(q));
const cocokDetail = (d: object, q: string): boolean =>
  kolomDetail.value.some((k) => teks(d, k).toLowerCase().includes(q));

const terfilter = computed<T[]>(() => {
  let hasil = props.items;
  const q = cari.value.trim().toLowerCase();
  if (q) {
    hasil = hasil.filter(
      (r) => cocokBaris(r, q) || detailDari(r).some((d) => cocokDetail(d, q)),
    );
  }
  for (const [key, sembunyi] of Object.entries(sembunyiKolom.value)) {
    if (sembunyi.size === 0) continue;
    const k = props.columns.find((c) => c.key === key);
    if (!k) continue;
    hasil = hasil.filter((r) => !sembunyi.has(teks(r, k)));
  }
  return hasil;
});

const tampil = computed<T[]>(() => {
  const k = props.columns.find((c) => c.key === sortKey.value);
  if (!k) return terfilter.value;
  const arah = sortAsc.value ? 1 : -1;
  return [...terfilter.value].sort((x, y) => {
    const a = baca(x, k.key);
    const b = baca(y, k.key);
    // Nilai kosong selalu di bawah, apa pun arah urutnya
    if (kosong(a) || kosong(b)) return bandingkan(a, b, k);
    return arah * bandingkan(a, b, k);
  });
});

// ── Master-detail ──
const jumlahKolomTabel = computed(
  () =>
    kolomDaun.value.length + (props.showNo ? 1 : 0) + (adaDetail.value ? 1 : 0),
);

const barisHeaderDetail = computed(() => {
  const adaBand = kolomDetail.value.some((k) => !!k.group);
  const rs = adaBand ? 2 : 1;
  const r1: { id: string; judul: string; rowspan: number; colspan: number }[] =
    [];
  const r2: { id: string; judul: string; rowspan: number; colspan: number }[] =
    [];
  for (const b of kelompokBlok(kolomDetail.value)) {
    if (b.group) {
      r1.push({ id: b.id, judul: b.group, rowspan: 1, colspan: b.cols.length });
      for (const k of b.cols) {
        r2.push({
          id: `${b.id}:${k.key}`,
          judul: k.title,
          rowspan: 1,
          colspan: 1,
        });
      }
    } else {
      r1.push({ id: b.id, judul: b.cols[0].title, rowspan: rs, colspan: 1 });
    }
  }
  return adaBand ? [r1, r2] : [r1];
});
const lebarDetail = computed(() =>
  kolomDetail.value.reduce((s, k) => s + k.width, 0),
);

// Saat pencarian aktif dan baris induk tidak cocok, hanya detail yang cocok tampil
const detailTampil = (r: T): object[] => {
  const semua = detailDari(r);
  const q = cari.value.trim().toLowerCase();
  if (!q || cocokBaris(r, q)) return semua;
  return semua.filter((d) => cocokDetail(d, q));
};

const terbuka = ref<Set<string>>(new Set());
const toggleDetail = (r: T) => {
  const k = kunciBaris(r);
  const s = new Set(terbuka.value);
  if (s.has(k)) s.delete(k);
  else s.add(k);
  terbuka.value = s;
};
const semuaTerbuka = computed(
  () =>
    tampil.value.length > 0 &&
    tampil.value.every((r) => terbuka.value.has(kunciBaris(r))),
);
const toggleSemua = () => {
  terbuka.value = semuaTerbuka.value
    ? new Set()
    : new Set(tampil.value.map((r) => kunciBaris(r)));
};

// ── Footer total (mengikuti pencarian dan filter kolom) ──
const totalKolom = computed<Record<string, number>>(() => {
  const hasil: Record<string, number> = {};
  for (const k of props.columns) {
    if (!k.total) continue;
    hasil[k.key] = dua(
      terfilter.value.reduce((s, r) => s + (Number(baca(r, k.key)) || 0), 0),
    );
  }
  return hasil;
});
const awalTotal = computed(() => kolomDaun.value.findIndex((k) => k.total));
const spanLabel = computed(
  () =>
    (adaDetail.value ? 1 : 0) +
    (props.showNo ? 1 : 0) +
    (awalTotal.value === -1 ? kolomDaun.value.length : awalTotal.value),
);
const sisaFooter = computed(() =>
  awalTotal.value === -1 ? [] : kolomDaun.value.slice(awalTotal.value),
);
const labelTotal = computed(
  () => `TOTAL (${terfilter.value.length} ${props.satuan})`,
);
const footerExtra = computed<LaporanFooterTambahan[]>(
  () => props.footerTambahan?.(totalKolom.value) ?? [],
);
const fmtDesimal = (v: number, d: number) =>
  new Intl.NumberFormat("id-ID", {
    minimumFractionDigits: d,
    maximumFractionDigits: d,
  }).format(v);

// ── Pilih baris ──
const onKlikBaris = (r: T) => {
  emit("update:selectedKey", kunciBaris(r));
};
const clearSelection = () => emit("update:selectedKey", null);

// ── Export Excel (diturunkan dari definisi kolom, urutan default) ──
type NilaiExcel = string | number | Date | null;

const nilaiExcel = (row: object, k: LaporanKolom): NilaiExcel => {
  const v = baca(row, k.key);
  if (k.tipe === "number") return Number(v) || 0;
  if (k.tipe === "date") return toExcelDate(kosong(v) ? null : String(v));
  return teks(row, k);
};

const kolomExcelDari = (cols: LaporanKolom[]): ExcelColumn[] =>
  cols.map((k) => {
    const kolom: ExcelColumn = {
      header: k.group ?? k.title,
      key: k.key,
      width: k.excelWidth ?? Math.max(6, Math.round(k.width / 7)),
      align: k.align ?? (k.tipe === "number" ? "right" : "left"),
    };
    if (k.group) kolom.subHeader = k.title;
    if (k.tipe === "date") kolom.numFmt = "dd/mm/yyyy";
    if (k.numFmt) kolom.numFmt = k.numFmt;
    return kolom;
  });

const exportToExcel = async (opsi: LaporanExportOpsi) => {
  const data = tampil.value;
  if (data.length === 0) {
    toast.warning("Tidak ada data untuk diexport.");
    return;
  }
  try {
    // Master-detail: kolom induk non-total (diulang tiap baris) + kolom detail
    const kolomHitung: LaporanKolom[] = adaDetail.value
      ? [...props.columns.filter((k) => !k.total), ...kolomDetail.value]
      : props.columns;

    const kolomExcel: ExcelColumn[] = [];
    if (props.showNo) {
      kolomExcel.push({ header: "No", key: "__no", width: 6, align: "center" });
    }
    kolomExcel.push(...kolomExcelDari(kolomHitung));

    const baris: Record<string, NilaiExcel>[] = adaDetail.value
      ? data.flatMap((r) =>
          detailTampil(r).map((d) => {
            const o: Record<string, NilaiExcel> = {};
            for (const k of props.columns) {
              if (!k.total) o[k.key] = nilaiExcel(r, k);
            }
            for (const k of kolomDetail.value) o[k.key] = nilaiExcel(d, k);
            return o;
          }),
        )
      : data.map((r) => {
          const o: Record<string, NilaiExcel> = {};
          for (const k of props.columns) o[k.key] = nilaiExcel(r, k);
          return o;
        });
    if (baris.length === 0) {
      toast.warning("Tidak ada data untuk diexport.");
      return;
    }
    if (props.showNo) {
      baris.forEach((o, i) => {
        o.__no = i + 1;
      });
    }

    const pertamaBukanTotal = kolomHitung.find((k) => !k.total);
    const barisTotal: Record<string, NilaiExcel> = { _total: 1 };
    if (pertamaBukanTotal) barisTotal[pertamaBukanTotal.key] = "TOTAL";
    for (const k of kolomHitung) {
      if (!k.total) continue;
      barisTotal[k.key] = dua(
        baris.reduce((s, o) => s + (Number(o[k.key]) || 0), 0),
      );
    }
    baris.push(barisTotal);
    for (const f of footerExtra.value) {
      baris.push({ _total: 1, [f.labelKey]: f.label, [f.nilaiKey]: f.nilai });
    }
    const kunciSorot = new Set(
      kolomHitung.filter((k) => k.sorotPositif).map((k) => k.key),
    );

    await exportExcel(`${opsi.fileName}.xlsx`, [
      {
        sheetName: opsi.sheetName,
        columns: kolomExcel,
        rows: baris,
        preLines: buatKopPreLines(opsi.judul, opsi.periode),
        headerColor: "FFB27F",
        headerFontColor: "000000",
        zebra: false,
        autoFilter: false,
        rowStyleFn: (row: Record<string, NilaiExcel>) =>
          row._total ? { bold: true, fillColor: "FFE0B2" } : null,
        cellStyleFn: (row: Record<string, NilaiExcel>, key: string) =>
          !row._total && kunciSorot.has(key) && Number(row[key]) > 0
            ? { fillColor: "FDB5D3", fontColor: "FF0000" }
            : null,
      },
    ]);
    toast.success("Berhasil export data.");
  } catch (e) {
    console.error(e);
    toast.error("Terjadi kesalahan saat export.");
  }
};

defineExpose({
  getFilteredItems: () => tampil.value,
  exportToExcel,
  clearSelection,
});
</script>

<template>
  <PageLayout :title="title" :menu-id="menuId" :icon="icon ?? IconTable">
    <template #header-actions>
      <v-btn
        v-if="canExport"
        size="small"
        color="green"
        @click="emit('export')"
      >
        <template #prepend
          ><IconFileSpreadsheet :size="15" :stroke-width="1.7"
        /></template>
        Export
      </v-btn>
      <slot name="extra-actions" :selected-key="selectedKey" />
      <v-btn size="small" variant="text" @click="tutup">
        <template #prepend><IconX :size="15" :stroke-width="2" /></template>
        Tutup
      </v-btn>
    </template>

    <div class="lp-content">
      <!-- Filter bar -->
      <div class="lp-filter">
        <slot name="filter-left" />
        <v-text-field
          :model-value="cari"
          :placeholder="searchPlaceholder"
          variant="outlined"
          density="compact"
          hide-details
          clearable
          class="lp-search"
          @update:model-value="cari = $event ?? ''"
        >
          <template #prepend-inner>
            <IconSearch
              :size="15"
              :stroke-width="1.7"
              style="opacity: 0.55; margin-top: 1px"
            />
          </template>
        </v-text-field>
        <v-btn
          color="primary"
          variant="text"
          size="small"
          icon
          :loading="isLoading"
          @click="emit('refresh')"
        >
          <IconRefresh :size="18" :stroke-width="1.7" />
        </v-btn>
        <v-btn
          v-if="jumlahFilterAktif > 0"
          size="small"
          color="warning"
          variant="tonal"
          @click="resetFilterKolom"
        >
          <template #prepend
            ><IconFilterOff :size="15" :stroke-width="1.7"
          /></template>
          Reset Filter ({{ jumlahFilterAktif }})
        </v-btn>
        <v-btn
          v-if="urutan.length > 0"
          size="small"
          color="blue-grey"
          variant="tonal"
          title="Reset urutan kolom ke default"
          @click="resetUrutan"
        >
          <template #prepend><IconAdjustmentsHorizontal :size="15" /></template>
          Reset Kolom
        </v-btn>
        <v-btn
          v-if="adaDetail"
          size="small"
          variant="tonal"
          @click="toggleSemua"
        >
          <template #prepend>
            <IconChevronUp v-if="semuaTerbuka" :size="15" :stroke-width="1.7" />
            <IconChevronDown v-else :size="15" :stroke-width="1.7" />
          </template>
          {{ semuaTerbuka ? "Tutup Semua" : "Buka Semua" }}
        </v-btn>
        <v-spacer />
        <slot name="filter-right" />
      </div>

      <!-- Tabel -->
      <div class="lp-wrap">
        <table class="lp-table" :style="{ width: lebarTabel + 'px' }">
          <colgroup>
            <col v-if="adaDetail" :style="{ width: LEBAR_EXPAND + 'px' }" />
            <col v-if="showNo" :style="{ width: LEBAR_NO + 'px' }" />
            <col
              v-for="k in kolomDaun"
              :key="k.key"
              :style="{ width: lebarKolom(k) + 'px' }"
            />
          </colgroup>

          <thead>
            <tr v-for="(baris, bi) in barisHeader" :key="bi">
              <th
                v-for="s in baris"
                :key="s.id"
                :rowspan="s.rowspan"
                :colspan="s.colspan"
                :data-blok-id="s.blokId ?? undefined"
                class="lp-th"
                :class="[
                  bi === 0 ? 'lp-h1' : 'lp-h2',
                  rataHeader(s),
                  {
                    'lp-drag-over':
                      !!s.blokId &&
                      dragOver === s.blokId &&
                      dragSrc !== s.blokId,
                    'lp-dragging': !!s.blokId && dragSrc === s.blokId,
                  },
                ]"
                @pointerdown="onHeaderPointerDown(s, $event)"
                @pointermove="onHeaderPointerMove"
                @pointerup="onHeaderPointerUp"
                @pointercancel="onHeaderPointerUp"
              >
                <div class="lp-th-inner">
                  <span
                    v-if="s.drag"
                    class="lp-drag"
                    title="Drag untuk memindahkan kolom"
                    >⠿</span
                  >
                  <template v-if="s.kolom">
                    <span
                      class="lp-title lp-sortable"
                      @click="urutKolom(s.kolom.key)"
                    >
                      {{ s.kolom.title }}
                      <IconChevronUp
                        v-if="sortKey === s.kolom.key && sortAsc"
                        :size="11"
                        class="lp-sort"
                      />
                      <IconChevronDown
                        v-else-if="sortKey === s.kolom.key"
                        :size="11"
                        class="lp-sort"
                      />
                    </span>
                    <button
                      type="button"
                      class="lp-fbtn"
                      :class="{ active: adaFilter(s.kolom.key) }"
                      title="Filter kolom"
                      @click.stop="bukaFilter(s.kolom.key, $event)"
                    >
                      <IconFilter
                        v-if="adaFilter(s.kolom.key)"
                        :size="10"
                        :stroke-width="2"
                      />
                      <IconAdjustmentsHorizontal
                        v-else
                        :size="10"
                        :stroke-width="2"
                      />
                    </button>
                  </template>
                  <span v-else-if="s.band" class="lp-title">{{ s.band }}</span>
                  <span v-else class="lp-title">{{
                    s.id === "__no" ? "No" : ""
                  }}</span>
                </div>
                <div
                  v-if="s.kolom"
                  class="lp-resize"
                  @mousedown.stop="mulaiResize(s.kolom.key, $event)"
                />
              </th>
            </tr>
          </thead>

          <tbody>
            <tr v-if="isLoading">
              <td :colspan="jumlahKolomTabel" class="lp-empty">
                Memuat data...
              </td>
            </tr>
            <tr v-else-if="tampil.length === 0">
              <td :colspan="jumlahKolomTabel" class="lp-empty">
                <IconDatabaseOff :size="28" :stroke-width="1.3" />
                <div>Tidak ada data.</div>
              </td>
            </tr>
            <template v-else>
              <template v-for="(r, i) in tampil" :key="kunciBaris(r)">
                <tr
                  :class="{ 'lp-sel': selectedKey === kunciBaris(r) }"
                  @click="onKlikBaris(r)"
                  @dblclick="emit('row-dblclick', r)"
                >
                  <td v-if="adaDetail" class="lp-exp">
                    <button
                      type="button"
                      class="lp-exp-btn"
                      title="Tampilkan / sembunyikan detail"
                      @click.stop="toggleDetail(r)"
                    >
                      <IconChevronDown
                        v-if="terbuka.has(kunciBaris(r))"
                        :size="14"
                      />
                      <IconChevronRight v-else :size="14" />
                    </button>
                  </td>
                  <td v-if="showNo" class="lp-no">{{ i + 1 }}</td>
                  <td
                    v-for="k in kolomDaun"
                    :key="k.key"
                    :class="[
                      kelasSel(k),
                      { 'lp-neg': k.negativeRed && Number(baca(r, k.key)) < 0 },
                      {
                        'lp-kurang':
                          k.sorotPositif && Number(baca(r, k.key)) > 0,
                      },
                    ]"
                    :title="teks(r, k)"
                  >
                    {{ teks(r, k) }}
                  </td>
                </tr>
                <tr
                  v-if="adaDetail && terbuka.has(kunciBaris(r))"
                  class="lp-dtl-row"
                >
                  <td :colspan="jumlahKolomTabel" class="lp-dtl-cell">
                    <table
                      class="lp-dtl"
                      :style="{ width: lebarDetail + 'px' }"
                    >
                      <colgroup>
                        <col
                          v-for="k in kolomDetail"
                          :key="k.key"
                          :style="{ width: k.width + 'px' }"
                        />
                      </colgroup>
                      <thead>
                        <tr v-for="(hb, hi) in barisHeaderDetail" :key="hi">
                          <th
                            v-for="h in hb"
                            :key="h.id"
                            :rowspan="h.rowspan"
                            :colspan="h.colspan"
                            class="lp-dth"
                          >
                            {{ h.judul }}
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr v-if="detailTampil(r).length === 0">
                          <td :colspan="kolomDetail.length" class="a-center">
                            Tidak ada data detail.
                          </td>
                        </tr>
                        <tr v-for="(d, di) in detailTampil(r)" :key="di">
                          <td
                            v-for="k in kolomDetail"
                            :key="k.key"
                            :class="kelasSel(k)"
                            :title="teks(d, k)"
                          >
                            {{ teks(d, k) }}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </td>
                </tr>
              </template>
            </template>
          </tbody>

          <tfoot>
            <tr :style="{ '--bt': footerExtra.length * 28 + 'px' }">
              <td v-if="spanLabel > 0" :colspan="spanLabel" class="a-right">
                {{ labelTotal }}
              </td>
              <td v-for="k in sisaFooter" :key="k.key" class="a-right">
                <template v-if="k.total">{{
                  fmtAngka(totalKolom[k.key] ?? 0)
                }}</template>
              </td>
            </tr>
            <tr
              v-for="(f, fi) in footerExtra"
              :key="fi"
              :style="{ '--bt': (footerExtra.length - 1 - fi) * 28 + 'px' }"
            >
              <td v-if="adaDetail"></td>
              <td v-if="showNo"></td>
              <td v-for="k in kolomDaun" :key="k.key" class="a-right">
                <template v-if="k.key === f.labelKey">{{ f.label }}</template>
                <template v-else-if="k.key === f.nilaiKey">{{
                  fmtDesimal(f.nilai, f.desimal ?? 2)
                }}</template>
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  </PageLayout>

  <!-- Dropdown filter kolom: di-teleport ke body agar tidak terpotong -->
  <Teleport to="body">
    <template v-if="kolomAktif">
      <div class="lp-backdrop" @click="tutupFilter" />
      <div class="lp-dd" :style="gayaDropdown" @click.stop>
        <input
          :value="cariDropdown[kolomAktif] ?? ''"
          type="text"
          placeholder="Cari..."
          class="lp-dd-search"
          @input="
            onCariDropdown(
              kolomAktif,
              ($event.target as HTMLInputElement).value,
            )
          "
        />
        <div class="lp-dd-hint">
          {{ nilaiDropdown(kolomAktif).length }} dari
          {{ nilaiUnik[kolomAktif]?.length ?? 0 }} nilai ditampilkan
        </div>
        <div class="lp-dd-actions">
          <button type="button" @click="tampilkanSemua(kolomAktif)">
            Tampilkan Semua
          </button>
          <span>|</span>
          <button
            type="button"
            class="lp-dd-danger"
            @click="sembunyikanSemua(kolomAktif)"
          >
            Sembunyikan Semua
          </button>
        </div>
        <div class="lp-dd-list">
          <label
            v-for="v in nilaiDropdown(kolomAktif)"
            :key="v"
            class="lp-dd-item"
          >
            <input
              type="checkbox"
              :checked="!sembunyiKolom[kolomAktif]?.has(v)"
              @change="toggleNilai(kolomAktif, v)"
            />
            <span>{{ v === "" ? "(Kosong)" : v }}</span>
          </label>
          <div
            v-if="nilaiDropdown(kolomAktif).length === 0"
            class="lp-dd-empty"
          >
            Tidak ada hasil
          </div>
        </div>
        <div class="lp-dd-footer">
          <button type="button" class="lp-dd-ok" @click="tutupFilter">
            OK
          </button>
        </div>
      </div>
    </template>
  </Teleport>
</template>

<style scoped>
.lp-content {
  display: flex;
  flex-direction: column;
  height: 100%;
  flex: 1 1 0;
  min-height: 0;
  gap: 8px;
  padding: 8px;
  overflow: hidden;
  font-size: 11px;
}

/* ── Filter bar ── */
.lp-filter {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  flex-shrink: 0;
  min-height: 50px;
  padding: 7px 12px;
  background: rgb(var(--v-theme-surface));
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 6px;
}
.lp-search {
  width: 200px;
  min-width: 120px;
  flex-shrink: 0;
}
.lp-search :deep(.v-input__control),
.lp-search :deep(.v-field) {
  height: 34px;
}
.lp-search :deep(.v-field) {
  font-size: 11px;
  background: rgb(var(--v-theme-surface));
}
.lp-search :deep(.v-field__input) {
  padding-top: 0;
  padding-bottom: 0;
  min-height: unset;
  font-size: 11px;
  align-self: center;
}
.lp-search :deep(.v-field__prepend-inner),
.lp-search :deep(.v-field__clearable) {
  padding-top: 0;
  align-items: center;
  align-self: center;
}

/* ── Tabel ── */
.lp-wrap {
  flex: 1;
  min-height: 0;
  overflow: auto;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
}
.lp-table {
  min-width: 100%;
  table-layout: fixed;
  border-collapse: separate;
  border-spacing: 0;
  font-size: 11px;
}
.lp-th {
  position: sticky;
  background: #1565c0;
  color: #fff;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  white-space: nowrap;
  padding: 0 8px;
  border-right: 1px solid rgba(255, 255, 255, 0.25);
  user-select: none;
  z-index: 3;
}
.lp-h1 {
  top: 0;
  height: 28px;
}
.lp-h2 {
  top: 28px;
  height: 28px;
  border-top: 1px solid rgba(255, 255, 255, 0.25);
}
.lp-th.a-center {
  text-align: center;
}
.lp-th.a-left {
  text-align: left;
}
.lp-th-inner {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding-right: 6px;
}
.a-left .lp-th-inner {
  justify-content: flex-start;
}
.lp-title {
  white-space: nowrap;
}
.lp-sortable {
  cursor: pointer;
}
.lp-sort {
  display: inline;
  vertical-align: middle;
}
.lp-drag {
  cursor: grab;
  color: rgba(255, 255, 255, 0.6);
  font-size: 13px;
  flex-shrink: 0;
  touch-action: none;
}
.lp-drag:active {
  cursor: grabbing;
}
.lp-dragging {
  opacity: 0.5;
}
.lp-drag-over {
  box-shadow: inset 3px 0 0 #ffd54f;
}
.lp-fbtn {
  flex-shrink: 0;
  width: 18px;
  height: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  border: 1px solid rgba(255, 255, 255, 0.35);
  border-radius: 3px;
  background: transparent;
  color: rgba(255, 255, 255, 0.7);
  cursor: pointer;
}
.lp-fbtn:hover {
  background: rgba(255, 255, 255, 0.2);
  color: #fff;
}
.lp-fbtn.active {
  background: #ffd54f;
  border-color: #ffd54f;
  color: #1a1a1a;
}
.lp-resize {
  position: absolute;
  right: 0;
  top: 0;
  width: 5px;
  height: 100%;
  cursor: col-resize;
  z-index: 4;
}
.lp-resize:hover {
  background: rgba(255, 255, 255, 0.3);
}

.lp-table td {
  padding: 3px 8px;
  height: 26px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  border-bottom: 1px solid #f0f0f0;
  font-variant-numeric: tabular-nums;
}
.lp-table td.a-left {
  text-align: left;
}
.lp-table td.a-center {
  text-align: center;
}
.lp-table td.a-right {
  text-align: right;
}
.lp-no {
  text-align: center;
  color: #757575;
}
.lp-table tbody tr {
  cursor: pointer;
}
.lp-table tbody tr:nth-child(even) td {
  background: #fafafa;
}
.lp-table tbody tr:hover td {
  background: #e3f2fd;
}
.lp-table tbody tr.lp-sel td {
  background: #bbdefb;
}
/* Sorot nilai > 0 (mis. kekurangan produksi): pink + merah, tetap saat hover/pilih */
.lp-table tbody tr td.lp-kurang {
  background: #fdb5d3;
  color: #ff0000;
}
.lp-neg {
  color: #c62828;
}
.lp-empty {
  text-align: center !important;
  color: #9e9e9e;
  padding: 28px 0 !important;
  height: auto !important;
}
.lp-table tfoot td {
  position: sticky;
  bottom: var(--bt, 0px);
  background: #1565c0;
  color: #fff;
  font-weight: 700;
  font-family: monospace;
  height: 28px;
  z-index: 3;
  border-bottom: none;
}

/* ── Master-detail ── */
.lp-exp {
  padding: 0 !important;
}
.lp-exp-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  padding: 0;
  border: none;
  background: transparent;
  color: inherit;
  cursor: pointer;
}
.lp-table tbody tr.lp-dtl-row td.lp-dtl-cell {
  padding: 4px 0 8px 30px;
  height: auto;
  overflow: visible;
  background: #f4f8fd;
  cursor: default;
}
.lp-dtl {
  table-layout: fixed;
  border-collapse: separate;
  border-spacing: 0;
  border: 1px solid #e0e0e0;
  background: #fff;
  font-size: 11px;
}
.lp-dth {
  height: 26px;
  padding: 0 8px;
  background: #5b8fd0;
  color: #fff;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  text-align: center;
  white-space: nowrap;
  border-right: 1px solid rgba(255, 255, 255, 0.25);
  border-bottom: 1px solid rgba(255, 255, 255, 0.25);
}
.lp-table tbody tr.lp-dtl-row .lp-dtl tbody tr {
  cursor: default;
}
.lp-table tbody tr.lp-dtl-row .lp-dtl tbody td {
  background: #fff;
}
.lp-table tbody tr.lp-dtl-row .lp-dtl tbody tr:nth-child(even) td {
  background: #fafafa;
}
.lp-table tbody tr.lp-dtl-row .lp-dtl tbody tr:hover td {
  background: #e3f2fd;
}

/* ── Dropdown filter kolom ── */
.lp-backdrop {
  position: fixed;
  inset: 0;
  z-index: 9998;
}
.lp-dd {
  width: 230px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: rgb(var(--v-theme-surface));
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 6px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.18);
  font-size: 11px;
  color: rgb(var(--v-theme-on-surface));
}
.lp-dd-search {
  margin: 8px 8px 0;
  height: 28px;
  padding: 0 8px;
  font-size: 11px;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 4px;
  outline: none;
  background: rgb(var(--v-theme-surface));
  color: rgb(var(--v-theme-on-surface));
}
.lp-dd-search:focus {
  border-color: rgb(var(--v-theme-primary));
}
.lp-dd-hint {
  padding: 2px 8px 4px;
  font-size: 10px;
  color: rgba(var(--v-theme-on-surface), 0.5);
}
.lp-dd-actions {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  border-bottom: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}
.lp-dd-actions button {
  background: none;
  border: none;
  padding: 2px 0;
  font-size: 11px;
  color: rgb(var(--v-theme-primary));
  cursor: pointer;
}
.lp-dd-actions button:hover {
  text-decoration: underline;
}
.lp-dd-actions .lp-dd-danger {
  color: #c62828;
}
.lp-dd-list {
  max-height: 240px;
  overflow-y: auto;
  padding: 4px 0;
}
.lp-dd-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 3px 10px;
  cursor: pointer;
}
.lp-dd-item:hover {
  background: rgba(var(--v-theme-on-surface), 0.06);
}
.lp-dd-item input {
  width: 13px;
  height: 13px;
  flex-shrink: 0;
  accent-color: rgb(var(--v-theme-primary));
}
.lp-dd-item span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.lp-dd-empty {
  padding: 8px 10px;
  text-align: center;
  color: rgba(var(--v-theme-on-surface), 0.4);
}
.lp-dd-footer {
  display: flex;
  justify-content: flex-end;
  padding: 6px 8px;
  border-top: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}
.lp-dd-ok {
  padding: 4px 16px;
  font-size: 11px;
  font-weight: 600;
  color: #fff;
  background: rgb(var(--v-theme-primary));
  border: none;
  border-radius: 4px;
  cursor: pointer;
}
</style>
