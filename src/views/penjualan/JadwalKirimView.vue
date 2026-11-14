<script setup lang="ts">
import { ref, computed, onMounted, watch } from "vue";
import { useAuthStore } from "@/stores/authStore";
import { useRouter, useRoute } from "vue-router";
import { useToast } from "vue-toastification";
import { useBrowse } from "@/composables/useBrowse";
import { jadwalKirimService } from "@/services/penjualan/jadwalKirimService";
import BaseBrowse from "@/components/BaseBrowse.vue";
import {
  exportExcel,
  exportExcelSingle,
  type ExcelColumn,
} from "@/utils/excelExport";
import {
  IconTruckDelivery,
  IconSearch,
  IconTableExport,
  IconPrinter,
  IconClockPause,
  IconCalendar,
} from "@tabler/icons-vue";
import { formatTanggalSingkat } from "@/utils/dateFormat";

// ── Tipe data ──────────────────────────────────────────────────────────
interface JadwalKirimRow {
  Nomor: string;
  Gudang: string;
  Nama_Gudang: string;
  Tanggal: string;
  No_SPK: string;
  Nama_Spk: string;
  Ukuran: string;
  Kain: string;
  Jumlah: number;
  Koli: number;
  Realisasi: number;
  Koli_Realisasi: number;
  Selisih_Jumlah: number;
  Selisih_Koli: number;
  usr_create: string;
  jk_status?: string;
  jk_alasan_tunda?: string;
  jk_tunda_dari_nomor?: string;
  jk_tunda_ke_nomor?: string;
  Panjang?: number | null;
  Lebar?: number | null;
  Keterangan?: string | null;
  Bahan?: string | null;
}

interface DetailRow {
  Nomor: string;
  No_urut: number;
  Kota: string;
  Uraian: string;
  Size: string;
  Jumlah: number;
  Koli: number;
  Jam_Input: string;
  Jam_Ready: string;
  Nomor_SJ: string;
  Realisasi_Kirim: number;
  Jam_Kirim: string;
  Jam_Ambil: string;
  Expedisi: string;
}

// ── Router & Toast ─────────────────────────────────────────────────────
const authStore = useAuthStore();
const router = useRouter();
const route = useRoute();

interface GudangTetap {
  kode: string;
  nama: string;
}
const gudangTetap = computed(
  () => route.meta.gudangTetap as GudangTetap | undefined,
);
const modeSpanduk = computed(() => !!gudangTetap.value);

const goNew = () =>
  router.push({
    name: modeSpanduk.value ? "SpandukJadwalKirimCreate" : "JadwalKirimCreate",
  });

const goEdit = (item: { Nomor: string }) =>
  router.push({
    name: modeSpanduk.value ? "SpandukJadwalKirimEdit" : "JadwalKirimEdit",
    params: { nomor: item.Nomor },
  });
const toast = useToast();

const canInsertJK = computed(
  () =>
    canInsert.value &&
    !!authStore.user?.cabang &&
    authStore.user.cabang !== "HO-",
);

// ── Filter State ───────────────────────────────────────────────────────
// PENTING: toISOString() mengembalikan UTC — bisa mundur 1 hari saat jam < 07:00 WIB.
// Gunakan format manual dari komponen lokal agar tanggal selalu tepat.
const todayWIB = new Date(
  new Date().toLocaleString("en-US", { timeZone: "Asia/Jakarta" }),
);

const toISODate = (d: Date): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const firstOfMonth = new Date(todayWIB.getFullYear(), todayWIB.getMonth(), 1);

const filterState = ref({
  tglAwal: toISODate(firstOfMonth),
  tglAkhir: toISODate(todayWIB),
  gudang: "",
  gudangNama: "",
});

const inpAwal = ref<HTMLInputElement | null>(null);
const inpAkhir = ref<HTMLInputElement | null>(null);

const bukaPicker = (el: HTMLInputElement | null) => {
  el?.showPicker();
};

// ── List gudang untuk dropdown search ─────────────────────────────────
const gudangList = ref<Array<{ Kode: string; Nama: string }>>([]);
const gudangLoading = ref(false);

const loadGudang = async () => {
  gudangLoading.value = true;
  try {
    const res = await jadwalKirimService.getListGudang();
    gudangList.value = res.data.data || [];
  } catch {
    // silent — tidak kritis
  } finally {
    gudangLoading.value = false;
  }
};

// ── useBrowse ──────────────────────────────────────────────────────────
const {
  items,
  isLoading,
  selected,
  canInsert,
  canEdit,
  canDelete,
  canExport,
  fetchData,
  clearSelection,
} = useBrowse<JadwalKirimRow>({
  menuId: "119",
  immediate: false, // kita fetch manual setelah filter siap
  fetchApi: async () => {
    const res = await jadwalKirimService.getBrowse({
      tglAwal: filterState.value.tglAwal,
      tglAkhir: filterState.value.tglAkhir,
      gudang: filterState.value.gudang,
    });
    return res.data.data || [];
  },
  deleteApi: async (nomor) => {
    await jadwalKirimService.deleteData(nomor);
  },
});

// ── Expanded rows & detail cache ───────────────────────────────────────
const expanded = ref<JadwalKirimRow[]>([]);
const detailCache = ref<Record<string, DetailRow[]>>({});
const loadingDetails = ref<Set<string>>(new Set());

const onUpdateExpanded = async (val: any[]) => {
  // Vuetify emit array of objects
  const nomors: string[] = val.map((v) =>
    typeof v === "object" ? v.Nomor : v,
  );

  expanded.value = val;

  // Fetch detail yang belum di-cache
  for (const nomor of nomors) {
    if (!detailCache.value[nomor]) {
      loadingDetails.value = new Set([...loadingDetails.value, nomor]);
      try {
        const res = await jadwalKirimService.getDetail(nomor);
        detailCache.value[nomor] = res.data.data || [];
      } catch {
        detailCache.value[nomor] = [];
        toast.error(`Gagal memuat detail ${nomor}`);
      } finally {
        const next = new Set(loadingDetails.value);
        next.delete(nomor);
        loadingDetails.value = next;
      }
    }
  }
};

// ── Headers master ─────────────────────────────────────────────────────
const headers = [
  { title: "Nomor", key: "Nomor", width: "150px" },
  { title: "Gudang", key: "Gudang", width: "70px" },
  { title: "Nama Gudang", key: "Nama_Gudang", width: "180px" },
  { title: "Tanggal", key: "Tanggal", width: "100px" },
  { title: "No SPK", key: "No_SPK", width: "150px" },
  { title: "Nama SPK", key: "Nama_Spk", width: "280px" },
  { title: "Ukuran", key: "Ukuran", width: "200px" },
  { title: "Kain", key: "Kain", width: "160px" },
  { title: "Jumlah", key: "Jumlah", width: "80px", align: "end" },
  { title: "Koli", key: "Koli", width: "65px", align: "end" },
  { title: "Realisasi", key: "Realisasi", width: "90px", align: "end" },
  { title: "Koli Real.", key: "Koli_Realisasi", width: "90px", align: "end" },
  { title: "Selisih Jml", key: "Selisih_Jumlah", width: "95px", align: "end" },
  { title: "Selisih Koli", key: "Selisih_Koli", width: "95px", align: "end" },
  { title: "Status", key: "jk_status", width: "90px" },
  { title: "User", key: "usr_create", width: "90px" },
];

// Mode Spanduk: Ukuran dipecah jadi Panjang dan Lebar, plus kolom Keterangan
const headersAktif = computed(() => {
  if (!modeSpanduk.value) return headers;
  const hasil: typeof headers = [];
  for (const h of headers) {
    if (h.key === "Ukuran") {
      hasil.push(
        { title: "Panjang", key: "Panjang", width: "80px", align: "end" },
        { title: "Lebar", key: "Lebar", width: "80px", align: "end" },
      );
    } else if (h.key === "Kain") {
      hasil.push(
        h,
        { title: "Bahan", key: "Bahan", width: "170px" },
        { title: "Keterangan", key: "Keterangan", width: "220px" },
      );
    } else {
      hasil.push(h);
    }
  }
  return hasil;
});

const fmtUkur = (v: number | null | undefined) =>
  v ? Number(v).toLocaleString("id-ID", { maximumFractionDigits: 2 }) : "-";

// ── Headers detail (tabel dalam expanded row) ──────────────────────────
const detailHeaders = [
  { title: "No", key: "No_urut", width: "40px" },
  { title: "Kota", key: "Kota", width: "100px" },
  { title: "Uraian", key: "Uraian", width: "240px" },
  { title: "Size", key: "Size", width: "100px" },
  { title: "Jumlah", key: "Jumlah", width: "70px" },
  { title: "Koli", key: "Koli", width: "55px" },
  { title: "Jam Input", key: "Jam_Input", width: "80px" },
  { title: "Jam Ready", key: "Jam_Ready", width: "80px" },
  { title: "Nomor SJ", key: "Nomor_SJ", width: "120px" },
  { title: "Realisasi Kirim", key: "Realisasi_Kirim", width: "110px" },
  { title: "Jam Kirim", key: "Jam_Kirim", width: "80px" },
  { title: "Jam Ambil", key: "Jam_Ambil", width: "80px" },
  { title: "Expedisi", key: "Expedisi", width: "140px" },
];

// ── Row color: selisih negatif → merah muda ────────────────────────────
const rowPropsFn = (data: any) => {
  const item = data.item?.raw || data.item;

  if (item?.jk_status === "TUNDA") {
    return { style: "background-color: #f5f5f5 !important; color: #757575;" };
  }
  if (Number(item?.Selisih_Jumlah) < 0 || Number(item?.Selisih_Koli) < 0) {
    return { style: "background-color: #fff8f8 !important; color: #c62828;" };
  }
  return {};
};

// ── Delete ─────────────────────────────────────────────────────────────
const onDelete = async (item: JadwalKirimRow) => {
  try {
    await jadwalKirimService.deleteData(item.Nomor);
    toast.success(`Data ${item.Nomor} berhasil dihapus.`);
    // Bersihkan cache detail jika ada
    delete detailCache.value[item.Nomor];
    clearSelection();
    await fetchData();
  } catch (err: any) {
    toast.error(err.response?.data?.message || "Gagal menghapus data.");
  }
};

// ── Export ─────────────────────────────────────────────────────────────
const isExporting = ref(false);
const isExportingDetail = ref(false);

// Kolom export master — urutan & lebar sesuai browse
const masterColumns: ExcelColumn[] = [
  { header: "Nomor", key: "Nomor", width: 20, align: "left" },
  { header: "Gudang", key: "Gudang", width: 8, align: "center" },
  { header: "Nama Gudang", key: "Nama_Gudang", width: 24, align: "left" },
  { header: "Tanggal", key: "Tanggal", width: 12, align: "center" },
  { header: "No SPK", key: "No_SPK", width: 18, align: "left" },
  { header: "Nama SPK", key: "Nama_Spk", width: 36, align: "left" },
  { header: "Ukuran", key: "Ukuran", width: 26, align: "left" },
  { header: "Kain", key: "Kain", width: 20, align: "left" },
  {
    header: "Jumlah",
    key: "Jumlah",
    width: 10,
    align: "right",
    numFmt: "#,##0",
  },
  { header: "Koli", key: "Koli", width: 8, align: "right", numFmt: "#,##0" },
  {
    header: "Realisasi",
    key: "Realisasi",
    width: 12,
    align: "right",
    numFmt: "#,##0",
  },
  {
    header: "Koli Real.",
    key: "Koli_Realisasi",
    width: 12,
    align: "right",
    numFmt: "#,##0",
  },
  {
    header: "Selisih Jml",
    key: "Selisih_Jumlah",
    width: 12,
    align: "right",
    numFmt: "#,##0",
  },
  {
    header: "Selisih Koli",
    key: "Selisih_Koli",
    width: 12,
    align: "right",
    numFmt: "#,##0",
  },
  { header: "User", key: "usr_create", width: 10, align: "left" },
];

const masterColumnsAktif = computed<ExcelColumn[]>(() => {
  if (!modeSpanduk.value) return masterColumns;
  return masterColumns.flatMap((c) => {
    if (c.key === "Ukuran") {
      return [
        {
          header: "Panjang",
          key: "Panjang",
          width: 10,
          align: "right",
          numFmt: "#,##0.00",
        },
        {
          header: "Lebar",
          key: "Lebar",
          width: 10,
          align: "right",
          numFmt: "#,##0.00",
        },
      ];
    }
    if (c.key === "Kain") {
      return [
        c,
        { header: "Bahan", key: "Bahan", width: 24, align: "left" },
        { header: "Keterangan", key: "Keterangan", width: 40, align: "left" },
      ];
    }
    return [c];
  });
});

// Kolom bagian detail pada export gabungan (header diambil dari masterColumnsAktif)
const detailGabungColumns: ExcelColumn[] = [
  { header: "No", key: "No_urut", width: 6, align: "center" },
  { header: "Kota", key: "Kota", width: 14, align: "left" },
  { header: "Uraian", key: "Uraian", width: 36, align: "left" },
  {
    header: "Jumlah",
    key: "d_Jumlah",
    width: 10,
    align: "right",
    numFmt: "#,##0",
  },
  {
    header: "Koli",
    key: "d_Koli",
    width: 8,
    align: "right",
    numFmt: "#,##0",
  },
  { header: "Jam Input", key: "Jam_Input", width: 10, align: "center" },
  { header: "Jam Ready", key: "Jam_Ready", width: 10, align: "center" },
  { header: "Nomor SJ", key: "Nomor_SJ", width: 16, align: "left" },
  {
    header: "Realisasi Kirim",
    key: "Realisasi_Kirim",
    width: 14,
    align: "right",
    numFmt: "#,##0",
  },
  { header: "Jam Kirim", key: "Jam_Kirim", width: 10, align: "center" },
  { header: "Jam Ambil", key: "Jam_Ambil", width: 10, align: "center" },
  { header: "Expedisi", key: "Expedisi", width: 20, align: "left" },
];

const onExport = async () => {
  const rows = (items.value ?? []).map((r) => ({
    ...r,
    Tanggal: formatTanggalSingkat(r.Tanggal),
    Panjang: r.Panjang || "",
    Lebar: r.Lebar || "",
  }));
  if (!rows.length) {
    toast.warning("Tidak ada data untuk diexport.");
    return;
  }
  isExporting.value = true;
  try {
    const title = `Jadwal Kirim — ${formatTanggalSingkat(filterState.value.tglAwal)} s.d. ${formatTanggalSingkat(filterState.value.tglAkhir)}${filterState.value.gudang ? " | Gudang: " + filterState.value.gudang : ""}`;
    await exportExcelSingle(
      `JadwalKirim_${filterState.value.tglAwal}_${filterState.value.tglAkhir}.xlsx`,
      "Jadwal Kirim",
      masterColumnsAktif.value,
      rows,
      title,
    );
    toast.success("Export berhasil.");
  } catch {
    toast.error("Gagal export Excel.");
  } finally {
    isExporting.value = false;
  }
};

const onExportDetail = async () => {
  isExportingDetail.value = true;
  try {
    // Header dan detail diambil dengan filter yang sama, supaya konsisten
    const params = {
      tglAwal: filterState.value.tglAwal,
      tglAkhir: filterState.value.tglAkhir,
      gudang: filterState.value.gudang,
    };
    const [resHeader, resDetail] = await Promise.all([
      jadwalKirimService.getBrowse(params),
      jadwalKirimService.getDetailByFilter(params),
    ]);
    const headerRows: JadwalKirimRow[] = resHeader.data.data || [];
    const detailRows: DetailRow[] = resDetail.data.data || [];

    if (!headerRows.length) {
      toast.warning("Tidak ada data untuk diexport.");
      return;
    }

    const detailPerNomor = new Map<string, DetailRow[]>();
    for (const d of detailRows) {
      const list = detailPerNomor.get(d.Nomor) ?? [];
      list.push(d);
      detailPerNomor.set(d.Nomor, list);
    }

    // Kolom header: Jumlah/Koli diberi label "Total" agar tidak ambigu dengan detail
    const kolomHeader: ExcelColumn[] = masterColumnsAktif.value.map((c) => {
      if (c.key === "Jumlah") return { ...c, header: "Total Jumlah" };
      if (c.key === "Koli") return { ...c, header: "Total Koli" };
      return c;
    });
    const kunciHeader = new Set(kolomHeader.map((c) => c.key));

    const rows: Record<string, unknown>[] = [];
    for (const h of headerRows) {
      const dataHeader = {
        ...h,
        Tanggal: formatTanggalSingkat(h.Tanggal),
        Panjang: h.Panjang || "",
        Lebar: h.Lebar || "",
      };
      const detail = detailPerNomor.get(h.Nomor) ?? [];
      if (detail.length === 0) {
        rows.push({ ...dataHeader, _awal: true });
        continue;
      }
      detail.forEach((d, i) => {
        rows.push({
          // header hanya dirender di baris pertama tiap nomor kirim
          ...(i === 0 ? dataHeader : {}),
          _awal: i === 0,
          No_urut: d.No_urut,
          Kota: d.Kota,
          Uraian: d.Uraian,
          d_Jumlah: d.Jumlah,
          d_Koli: d.Koli,
          Jam_Input: d.Jam_Input,
          Jam_Ready: d.Jam_Ready,
          Nomor_SJ: d.Nomor_SJ,
          Realisasi_Kirim: d.Realisasi_Kirim,
          Jam_Kirim: d.Jam_Kirim,
          Jam_Ambil: d.Jam_Ambil,
          Expedisi: d.Expedisi,
        });
      });
    }

    const title = `Detail Jadwal Kirim — ${formatTanggalSingkat(filterState.value.tglAwal)} s.d. ${formatTanggalSingkat(filterState.value.tglAkhir)}${filterState.value.gudang ? " | Gudang: " + filterState.value.gudang : ""}`;
    await exportExcel(
      `JadwalKirimDetail_${filterState.value.tglAwal}_${filterState.value.tglAkhir}.xlsx`,
      [
        {
          sheetName: "Detail Jadwal Kirim",
          columns: [...kolomHeader, ...detailGabungColumns],
          rows,
          title,
          // Baris pertama tiap nomor kirim: bagian header ditebalkan
          cellStyleFn: (row, key) =>
            row._awal && kunciHeader.has(key) ? { bold: true } : null,
        },
      ],
    );
    toast.success("Export detail berhasil.");
  } catch {
    toast.error("Gagal export detail Excel.");
  } finally {
    isExportingDetail.value = false;
  }
};

const onCetak = () => {
  const params = new URLSearchParams({
    tglAwal: filterState.value.tglAwal,
    tglAkhir: filterState.value.tglAkhir,
    gudang: filterState.value.gudang || "",
  });
  window.open(`/penjualan/jadwal-kirim/print?${params.toString()}`, "_blank");
};

// ── Gudang search modal ────────────────────────────────────────────────
const showGudangModal = ref(false);
const gudangSearch = ref("");

const filteredGudangList = computed(() => {
  const q = gudangSearch.value.toLowerCase();
  if (!q) return gudangList.value;
  return gudangList.value.filter(
    (g) => g.Kode.toLowerCase().includes(q) || g.Nama.toLowerCase().includes(q),
  );
});

const selectGudang = (item: { Kode: string; Nama: string }) => {
  filterState.value.gudang = item.Kode;
  filterState.value.gudangNama = item.Nama;
  showGudangModal.value = false;
  gudangSearch.value = "";
};

const clearGudang = () => {
  filterState.value.gudang = "";
  filterState.value.gudangNama = "";
};

const showTundaDialog = ref(false);
const tundaAlasan = ref("");
const isTundaSaving = ref(false);

// ⚠️ KONFIRMASI: field role yang benar dari authStore.user — asumsi
// "bagian", sesuaikan kalau nama field aslinya beda (mis. "jabatan")
const canTunda = computed(
  () => (authStore.user?.bagian || "").toUpperCase() === "KIRIM",
);

const openTundaDialog = () => {
  if (selected.value.length !== 1) {
    toast.warning("Pilih tepat 1 jadwal kirim untuk ditunda.");
    return;
  }
  const item = selected.value[0] as unknown as JadwalKirimRow;
  if (item.jk_status && item.jk_status !== "OPEN") {
    toast.error(`Data ini sudah berstatus '${item.jk_status}'.`);
    return;
  }
  tundaAlasan.value = "";
  showTundaDialog.value = true;
};

const confirmTunda = async () => {
  if (!tundaAlasan.value.trim()) {
    toast.warning("Alasan tunda wajib diisi.");
    return;
  }
  const item = selected.value[0] as unknown as JadwalKirimRow;
  isTundaSaving.value = true;
  try {
    const res = await jadwalKirimService.tundaData(
      item.Nomor,
      tundaAlasan.value.trim(),
    );
    toast.success(res.data.message || "Jadwal berhasil ditunda.");
    showTundaDialog.value = false;
    clearSelection();
    await fetchData();
  } catch (err: any) {
    toast.error(err.response?.data?.message || "Gagal menunda jadwal.");
  } finally {
    isTundaSaving.value = false;
  }
};

// ── Filter state restore dari BaseBrowse sessionStorage ───────────────
let gudangRestored = false;

const onFilterStateRestored = (saved: Record<string, any>) => {
  if (saved.tglAwal) filterState.value.tglAwal = saved.tglAwal;
  if (saved.tglAkhir) filterState.value.tglAkhir = saved.tglAkhir;
  if (modeSpanduk.value) return;
  if (saved.gudang !== undefined) {
    filterState.value.gudang = saved.gudang;
    filterState.value.gudangNama = saved.gudangNama || "";
    gudangRestored = true;
  }
};

// ── Lifecycle ──────────────────────────────────────────────────────────
const terapkanGudangAwal = () => {
  if (gudangTetap.value) {
    filterState.value.gudang = gudangTetap.value.kode;
    filterState.value.gudangNama = gudangTetap.value.nama;
    return;
  }
  const def = gudangList.value.find((g) => g.Kode === "GJ001");
  filterState.value.gudang = def?.Kode ?? "";
  filterState.value.gudangNama = def?.Nama ?? "";
};

onMounted(async () => {
  await loadGudang();

  if (modeSpanduk.value || !gudangRestored) {
    terapkanGudangAwal();
  }

  await fetchData();
});

const isFormRoute = (n: unknown) => /(Create|Edit)$/.test(String(n ?? ""));

watch(
  () => route.name,
  (baru, lama) => {
    // Pindah ke/dari form Baru/Ubah bukan ganti mode Garmen<->Spanduk
    if (isFormRoute(baru) || isFormRoute(lama)) return;

    detailCache.value = {};
    expanded.value = [];
    clearSelection();
    const gudangLama = filterState.value.gudang;
    terapkanGudangAwal();
    if (filterState.value.gudang === gudangLama) fetchData();
  },
);

// Re-fetch otomatis saat filter tanggal berubah (debounce 400ms)
let filterTimer: ReturnType<typeof setTimeout> | null = null;
watch(
  () => [
    filterState.value.tglAwal,
    filterState.value.tglAkhir,
    filterState.value.gudang,
  ],
  () => {
    if (filterTimer) clearTimeout(filterTimer);
    filterTimer = setTimeout(() => fetchData(), 400);
  },
);
</script>

<template>
  <BaseBrowse
    :title="modeSpanduk ? 'Jadwal Kirim — Spanduk' : 'Jadwal Kirim'"
    menu-id="119"
    :storage-id="modeSpanduk ? '119-spanduk' : '119'"
    :icon="IconTruckDelivery"
    :headers="headersAktif"
    :items="items ?? []"
    :is-loading="isLoading"
    item-value="Nomor"
    :can-insert="canInsertJK"
    :can-edit="canEdit"
    :can-delete="canDelete"
    :can-export="canExport"
    :show-expand="true"
    :expanded="expanded"
    :selected="selected"
    :row-props-fn="rowPropsFn"
    :filter-state="filterState"
    search-placeholder="Cari nomor, SPK, nama..."
    @refresh="fetchData"
    @add="goNew"
    @edit="goEdit"
    @delete="onDelete"
    @export="onExport"
    @update:expanded="onUpdateExpanded"
    @update:selected="(val) => (selected = val)"
    @update:filter-state="onFilterStateRestored"
  >
    <!-- ── Filter kiri: periode + gudang ── -->
    <template #filter-left>
      <!-- Periode Awal -->
      <div class="f-grp">
        <label class="f-lbl">Dari</label>
        <div
          class="f-datebox"
          role="button"
          tabindex="0"
          @click="bukaPicker(inpAwal)"
          @keydown.enter.prevent="bukaPicker(inpAwal)"
        >
          <span>{{ formatTanggalSingkat(filterState.tglAwal) }}</span>
          <IconCalendar :size="14" :stroke-width="1.7" />
          <input
            ref="inpAwal"
            type="date"
            v-model="filterState.tglAwal"
            class="f-date-native"
            tabindex="-1"
          />
        </div>
      </div>

      <div class="f-grp">
        <label class="f-lbl">S/D</label>
        <div
          class="f-datebox"
          role="button"
          tabindex="0"
          @click="bukaPicker(inpAkhir)"
          @keydown.enter.prevent="bukaPicker(inpAkhir)"
        >
          <span>{{ formatTanggalSingkat(filterState.tglAkhir) }}</span>
          <IconCalendar :size="14" :stroke-width="1.7" />
          <input
            ref="inpAkhir"
            type="date"
            v-model="filterState.tglAkhir"
            class="f-date-native"
            tabindex="-1"
          />
        </div>
      </div>

      <!-- Filter Gudang -->
      <div class="f-grp">
        <label class="f-lbl">Gudang</label>
        <div class="f-inp-grp">
          <input
            :value="filterState.gudang"
            readonly
            class="f-inp"
            style="width: 60px; cursor: pointer"
            placeholder="Semua"
            @click="!modeSpanduk && (showGudangModal = true)"
          />
          <input
            :value="filterState.gudangNama"
            readonly
            class="f-inp f-ro"
            style="width: 220px"
          />
          <button
            v-if="!modeSpanduk"
            class="f-btn-icon"
            title="Cari Gudang"
            @click="showGudangModal = true"
          >
            <IconSearch :size="13" color="#1565c0" />
          </button>
          <button
            v-if="filterState.gudang && !modeSpanduk"
            class="f-btn-icon"
            title="Hapus Filter Gudang"
            @click="clearGudang"
          >
            ✕
          </button>
        </div>
      </div>
    </template>

    <!-- ── Extra actions: Export Detail ── -->
    <template #extra-actions>
      <v-btn
        v-if="canTunda"
        size="small"
        color="orange-darken-2"
        @click="openTundaDialog"
      >
        <template #prepend>
          <IconClockPause :size="15" :stroke-width="1.7" />
        </template>
        Tunda Pengiriman
      </v-btn>

      <v-btn
        size="small"
        color="teal"
        :loading="isExportingDetail"
        @click="onExportDetail"
      >
        <template #prepend>
          <IconTableExport :size="15" :stroke-width="1.7" />
        </template>
        Export Detail
      </v-btn>

      <v-btn size="small" color="grey-darken-2" @click="onCetak">
        <template #prepend>
          <IconPrinter :size="15" :stroke-width="1.7" />
        </template>
        Cetak
      </v-btn>
    </template>

    <template #item.jk_status="{ item }">
      <v-chip
        v-if="item.jk_status === 'TUNDA'"
        size="x-small"
        color="orange"
        variant="flat"
      >
        TUNDA
      </v-chip>
      <span v-else style="font-size: 11px; color: #999">—</span>
    </template>

    <template #item.Tanggal="{ item }">
      {{ formatTanggalSingkat(item.Tanggal) }}
    </template>

    <template #item.Nama_Spk="{ item }">
      <div class="wrap2" :title="item.Nama_Spk">{{ item.Nama_Spk }}</div>
    </template>

    <template #item.Panjang="{ item }">{{ fmtUkur(item.Panjang) }}</template>
    <template #item.Lebar="{ item }">{{ fmtUkur(item.Lebar) }}</template>
    <template #item.Keterangan="{ item }">
      <div class="wrap2" :title="item.Keterangan ?? ''">
        {{ item.Keterangan }}
      </div>
    </template>

    <!-- ── Expanded detail ── -->
    <template #detail="{ item }">
      <div v-if="loadingDetails.has(item.Nomor)" class="detail-loading">
        <v-progress-circular indeterminate size="20" color="primary" />
        <span>Memuat detail...</span>
      </div>

      <template v-else-if="detailCache[item.Nomor]?.length">
        <table class="detail-table">
          <thead>
            <tr>
              <th
                v-for="h in detailHeaders"
                :key="h.key"
                :style="{ width: h.width }"
              >
                {{ h.title }}
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(row, idx) in detailCache[item.Nomor]" :key="idx">
              <td>{{ row.No_urut }}</td>
              <td>{{ row.Kota }}</td>
              <td>{{ row.Uraian }}</td>
              <td>{{ row.Size }}</td>
              <td class="text-right">
                {{ row.Jumlah?.toLocaleString("id-ID") }}
              </td>
              <td class="text-right">
                {{ row.Koli?.toLocaleString("id-ID") }}
              </td>
              <td>{{ row.Jam_Input }}</td>
              <td>{{ row.Jam_Ready }}</td>
              <td :class="row.Nomor_SJ ? 'sj-nomor' : 'sj-empty'">
                {{ row.Nomor_SJ || "—" }}
              </td>
              <td
                class="text-right"
                :class="{ 'real-ok': Number(row.Realisasi_Kirim) > 0 }"
              >
                {{ row.Realisasi_Kirim?.toLocaleString("id-ID") }}
              </td>
              <td>{{ row.Jam_Kirim }}</td>
              <td>{{ row.Jam_Ambil }}</td>
              <td>{{ row.Expedisi }}</td>
            </tr>
          </tbody>
        </table>
      </template>

      <div v-else class="detail-empty">
        Tidak ada detail untuk {{ item.Nomor }}
      </div>
    </template>
  </BaseBrowse>

  <!-- ── Modal Pilih Gudang ── -->
  <v-dialog v-model="showGudangModal" max-width="420px">
    <v-card class="rounded-lg">
      <v-card-title class="bg-primary text-white pa-3 d-flex align-center">
        <IconSearch :size="16" class="mr-2" />
        <span style="font-size: 13px; font-weight: 700">Pilih Gudang</span>
      </v-card-title>

      <v-card-text class="pa-3">
        <!-- Search input -->
        <input
          v-model="gudangSearch"
          type="text"
          class="gudang-search-input"
          placeholder="Cari kode atau nama gudang..."
          autofocus
        />

        <!-- List gudang -->
        <div class="gudang-list">
          <!-- Opsi semua gudang -->
          <div
            class="gudang-item"
            :class="{ active: !filterState.gudang }"
            @click="
              clearGudang();
              showGudangModal = false;
            "
          >
            <span class="gudang-kode" style="color: #9e9e9e">—</span>
            <span class="gudang-nama" style="color: #9e9e9e">Semua Gudang</span>
          </div>

          <div
            v-for="g in filteredGudangList"
            :key="g.Kode"
            class="gudang-item"
            :class="{ active: filterState.gudang === g.Kode }"
            @click="selectGudang(g)"
          >
            <span class="gudang-kode">{{ g.Kode }}</span>
            <span class="gudang-nama">{{ g.Nama }}</span>
          </div>

          <div v-if="filteredGudangList.length === 0" class="gudang-empty">
            Tidak ada gudang ditemukan
          </div>
        </div>
      </v-card-text>

      <v-card-actions class="pa-3 border-t">
        <v-spacer />
        <v-btn variant="text" @click="showGudangModal = false">Tutup</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <!-- ── Dialog Tunda Pengiriman ── -->
  <v-dialog v-model="showTundaDialog" max-width="450px" persistent>
    <v-card class="rounded-lg">
      <v-card-title
        class="bg-orange-darken-2 text-white pa-3 d-flex align-center"
      >
        <IconClockPause :size="16" class="mr-2" />
        <span style="font-size: 13px; font-weight: 700">Tunda Pengiriman</span>
      </v-card-title>
      <v-card-text class="pa-4">
        <p class="mb-3" style="font-size: 12px; color: #555">
          Jadwal ini akan ditandai TUNDA, dan sistem otomatis membuat jadwal
          baru untuk keesokan harinya (Senin jika jadwal jatuh pada hari Sabtu)
          dengan data yang sama.
        </p>
        <label style="font-size: 11px; font-weight: 600; color: #424242">
          Alasan Tunda <span style="color: #d32f2f">*</span>
        </label>
        <v-textarea
          v-model="tundaAlasan"
          rows="3"
          variant="outlined"
          density="compact"
          hide-details
          placeholder="Jelaskan alasan penundaan..."
          class="mt-1"
        />
      </v-card-text>
      <v-card-actions class="pa-3 border-t">
        <v-spacer />
        <v-btn variant="text" @click="showTundaDialog = false">Batal</v-btn>
        <v-btn
          color="orange-darken-2"
          :loading="isTundaSaving"
          @click="confirmTunda"
        >
          Ya, Tunda
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style scoped>
/* ── Filter bar elements ── */
.f-grp {
  display: flex;
  align-items: center;
  gap: 5px;
}
.f-lbl {
  font-size: 11px;
  font-weight: 600;
  color: #555;
  white-space: nowrap;
}
.f-datebox {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  height: 30px;
  min-width: 108px;
  border: 1px solid #bdbdbd;
  border-radius: 4px;
  padding: 0 8px;
  font-size: 12px;
  background: white;
  cursor: pointer;
  user-select: none;
}
.f-datebox:focus-visible {
  outline: 2px solid #1565c0;
}
.f-date-native {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  opacity: 0;
  pointer-events: none;
}
.f-inp-grp {
  display: flex;
  border: 1px solid #bdbdbd;
  border-radius: 4px;
  overflow: hidden;
  height: 30px;
  background: white;
}
.f-inp {
  height: 28px;
  border: none;
  padding: 0 6px;
  font-size: 12px;
  outline: none;
  background: white;
}
.f-ro {
  background: #f0f0f0 !important;
  color: #555;
}
.f-btn-icon {
  width: 28px;
  min-width: 28px;
  background: #e3f2fd;
  border: none;
  border-left: 1px solid #bdbdbd;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  color: #555;
}
.f-btn-icon:hover {
  background: #bbdefb;
}

/* ── Detail tabel ── */
.detail-table {
  border-collapse: collapse;
  font-size: 11px;
  min-width: max-content;
}
.detail-table th {
  background: #1565c0;
  color: white;
  padding: 4px 8px;
  white-space: nowrap;
  font-weight: 700;
  font-size: 11px;
  letter-spacing: 0.02em;
}
.detail-table td {
  padding: 3px 8px;
  border-bottom: 1px solid #e0e0e0;
  white-space: nowrap;
  font-size: 11px;
  vertical-align: middle;
}
.detail-table tbody tr:nth-of-type(even) td {
  background: #f5f5f5;
}
.detail-table tbody tr:hover td {
  background: #e3f2fd !important;
}
.text-right {
  text-align: right;
}
.sj-nomor {
  font-weight: 700;
  color: #1565c0;
}
.sj-empty {
  color: #bdbdbd;
  text-align: center;
}
.real-ok {
  color: #2e7d32;
  font-weight: 600;
}

.detail-loading {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  font-size: 12px;
  color: #555;
}
.detail-empty {
  padding: 12px 16px;
  font-size: 11px;
  color: #9e9e9e;
}

/* ── Gudang modal ── */
.gudang-search-input {
  width: 100%;
  height: 32px;
  border: 1px solid #bdbdbd;
  border-radius: 4px;
  padding: 0 10px;
  font-size: 12px;
  outline: none;
  box-sizing: border-box;
  margin-bottom: 8px;
}
.gudang-search-input:focus {
  border-color: #1565c0;
}
.gudang-list {
  max-height: 300px;
  overflow-y: auto;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
}
.gudang-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 7px 10px;
  cursor: pointer;
  font-size: 12px;
  border-bottom: 1px solid #f5f5f5;
  transition: background 0.1s;
}
.gudang-item:hover {
  background: #e3f2fd;
}
.gudang-item.active {
  background: #1565c0;
  color: white;
}
.gudang-item.active .gudang-kode,
.gudang-item.active .gudang-nama {
  color: white !important;
}
.gudang-kode {
  font-weight: 700;
  width: 60px;
  flex-shrink: 0;
  font-family: monospace;
}
.gudang-nama {
  flex: 1;
}
.gudang-empty {
  padding: 16px;
  text-align: center;
  color: #9e9e9e;
  font-size: 11px;
}
.wrap2 {
  white-space: normal;
  line-height: 1.3;
  word-break: break-word;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
