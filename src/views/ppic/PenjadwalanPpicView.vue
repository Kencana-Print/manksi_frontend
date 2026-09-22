<script setup lang="ts">
import { ref, computed, watch } from "vue";
import { useAuthStore } from "@/stores/authStore";
import { useRouter } from "vue-router";
import { useToast } from "vue-toastification";
import BaseBrowse from "@/components/BaseBrowse.vue";
import {
  penjadwalanPpicService,
  type PencapaianRow,
} from "@/services/ppic/penjadwalanPpicService";
import {
  IconCalendarWeek,
  IconLock,
  IconLockOpen,
  IconTrash,
  IconFileExport,
  IconListDetails,
  IconEye,
  IconX,
  IconReportAnalytics,
} from "@tabler/icons-vue";
import { exportExcelSingle, exportExcel } from "@/utils/excelExport";
import { formatTanggal } from "@/utils/dateFormat";

interface BrowseItem {
  Nomor: string;
  TglAwal: string;
  TglAkhir: string;
  Cabang: string;
  Close: string;
  Keterangan: string;
  JumlahSO: number;
  JumlahMap: number;
}
interface DetailRow {
  PjwdId: number;
  PjwdTipe: string;
  Nomor: string;
  Sumber: string;
  NomorMap: string;
  NomorMh: string;
  NomorPen: string;
  PenId: string;
  Nama: string;
  Tanggal: string;
  Panjang: number;
  Lebar: number;
  Pesan: number;
  Kirim: number;
  Kurang: number;
  Rencana: number;
  KetRencana: string;
  Realisasi: number;
  PermintaanKirim: string;
  StatusPermintaan: string;
  Kesepakatan: string;
  KetKesepakatan: string;
  NomorPraOrder: string;
}

const router = useRouter();
const toast = useToast();
const authStore = useAuthStore();
const canCreate = computed(() => {
  const isAdmin = authStore.user?.kode?.toUpperCase() === "ADMIN";
  const isMarketing = authStore.user?.bagian?.toUpperCase() === "MARKETING";
  return isAdmin || isMarketing;
});

const pad = (n: number) => String(n).padStart(2, "0");
const toLocalDate = (d: Date) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

const HARI = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
const getMonthRange = (d: Date) => {
  const first = new Date(d.getFullYear(), d.getMonth(), 1);
  const last = new Date(d.getFullYear(), d.getMonth() + 1, 0);
  return { first, last };
};

const today = new Date();
const { first: monthStart, last: monthEnd } = getMonthRange(today);

const filterState = ref({
  start: toLocalDate(monthStart),
  end: toLocalDate(monthEnd),
  cabang: "",
});

const filterStart = computed({
  get: () => filterState.value.start,
  set: (v) => {
    filterState.value = { ...filterState.value, start: v };
  },
});
const filterEnd = computed({
  get: () => filterState.value.end,
  set: (v) => {
    filterState.value = { ...filterState.value, end: v };
  },
});

const filterCabang = computed({
  get: () => filterState.value.cabang,
  set: (v) => {
    filterState.value = { ...filterState.value, cabang: v };
  },
});

const hariStart = computed(() =>
  filterStart.value
    ? HARI[new Date(filterStart.value + "T00:00:00").getDay()]
    : "",
);
const hariEnd = computed(() =>
  filterEnd.value ? HARI[new Date(filterEnd.value + "T00:00:00").getDay()] : "",
);

const onFilterStateRestored = (state: Record<string, any>) => {
  if (state.start) filterState.value.start = state.start;
  if (state.end) filterState.value.end = state.end;
  if (state.cabang !== undefined) filterState.value.cabang = state.cabang;
};

const items = ref<BrowseItem[]>([]);
const isLoading = ref(false);
const cabangOptions = ref<{ value: string; title: string }[]>([]);

const selected = ref<BrowseItem[]>([]);
const expandedRows = ref<BrowseItem[]>([]);
const detailCache = ref<Record<string, DetailRow[]>>({});
const detailLoading = ref<Set<string>>(new Set());

const showCloseDialog = ref(false);
const showOpenDialog = ref(false);
const showDeleteDialog = ref(false);
const isActioning = ref(false);
const selectedItem = ref<BrowseItem | null>(null);

const showPreviewDialog = ref(false);
const previewNomor = ref("");
const previewDetail = ref<DetailRow[]>([]);
const previewLoading = ref(false);
const previewCabang = ref("");

const loadCabang = async () => {
  try {
    const res = await penjadwalanPpicService.getCabang();
    cabangOptions.value = res.data.data.map((c: any) => ({
      value: c.Kode,
      title: `${c.Kode} - ${c.Nama}`,
    }));
  } catch {
    console.error("Gagal load cabang");
  }
};

const openPreview = async () => {
  if (!selected.value.length) return;
  const item = selected.value[0];
  previewNomor.value = item.Nomor;
  previewCabang.value = item.Cabang;
  activePreviewTab.value = "SO";
  showPreviewDialog.value = true;

  if (detailCache.value[item.Nomor]) {
    previewDetail.value = detailCache.value[item.Nomor];
    return;
  }

  previewLoading.value = true;
  try {
    const res = await penjadwalanPpicService.getDetail(item.Nomor);
    previewDetail.value = res.data.data ?? [];
    detailCache.value = {
      ...detailCache.value,
      [item.Nomor]: previewDetail.value,
    };
  } catch {
    toast.error(`Gagal memuat detail ${item.Nomor}`);
  } finally {
    previewLoading.value = false;
  }
};

const baseBrowseRef = ref<InstanceType<typeof BaseBrowse> | null>(null);
const isExporting = ref(false);
const isExportingDetail = ref(false);

const headers = [
  { title: "NOMOR", key: "Nomor", width: "200px" },
  { title: "TGL AWAL", key: "TglAwal", width: "100px", align: "center" },
  { title: "TGL AKHIR", key: "TglAkhir", width: "100px", align: "center" },
  { title: "CABANG", key: "Cabang", width: "70px", align: "center" },
  { title: "STATUS", key: "Close", width: "80px", align: "center" },
  { title: "JML SO", key: "JumlahSO", width: "70px", align: "center" },
  { title: "JML MAP", key: "JumlahMap", width: "70px", align: "center" },
  { title: "KETERANGAN", key: "Keterangan", width: "300px" },
];

const activeExpandTab = ref<Record<string, "SO" | "MAP">>({});

const getExpandTab = (nomor: string) => activeExpandTab.value[nomor] || "SO";
const setExpandTab = (nomor: string, tab: "SO" | "MAP") => {
  activeExpandTab.value = { ...activeExpandTab.value, [nomor]: tab };
};

const filterByTipe = (rows: DetailRow[], tipe: "SO" | "MAP") =>
  rows.filter((d) =>
    tipe === "MAP" ? d.PjwdTipe === "MAP" : d.PjwdTipe !== "MAP",
  );

const activePreviewTab = ref<"SO" | "MAP">("SO");

let filterTimer: ReturnType<typeof setTimeout> | null = null;
watch(
  filterState,
  () => {
    expandedRows.value = [];
    detailCache.value = {};
    if (filterTimer) clearTimeout(filterTimer);
    filterTimer = setTimeout(fetchData, 400);
  },
  { deep: true },
);

const showNotifDialog = ref(false);
const notifPeriodeList = ref<any[]>([]);

const checkUnnotifiedMap = async () => {
  const bagian = authStore.user?.bagian?.toUpperCase();
  if (bagian === "MARKETING") return; // notifikasi ini buat non-Marketing (yg isi Kesepakatan)
  try {
    const res = await penjadwalanPpicService.getUnnotifiedMap();
    const list = res.data.data || [];
    if (list.length > 0) {
      notifPeriodeList.value = list;
      showNotifDialog.value = true;
    }
  } catch {
    // Silent — notifikasi bukan fitur kritikal, jangan ganggu load halaman
  }
};

const closeNotifDialog = async () => {
  const allIds = notifPeriodeList.value.flatMap((p) =>
    p.items.map((i: any) => i.pjwdId),
  );
  showNotifDialog.value = false;
  if (allIds.length > 0) {
    try {
      await penjadwalanPpicService.markMapNotified(allIds);
    } catch {
      // Best-effort — kalau gagal, akan muncul lagi next load, tidak fatal
    }
  }
};

const openFromNotif = (pjwNomor: string) => {
  closeNotifDialog();
  router.push(`/ppic/penjadwalan/edit/${encodeURIComponent(pjwNomor)}`);
};

const fetchData = async () => {
  isLoading.value = true;
  selected.value = [];
  expandedRows.value = [];
  detailCache.value = {};
  try {
    const res = await penjadwalanPpicService.getBrowse({
      startDate: filterStart.value,
      endDate: filterEnd.value,
      cabang: filterState.value.cabang,
    });
    items.value = res.data.data ?? [];
  } catch (e: any) {
    toast.error(e.response?.data?.message || "Gagal memuat data");
  } finally {
    isLoading.value = false;
  }
};

const handleExpand = async (newExpanded: BrowseItem[]) => {
  const added = newExpanded.find((i) => !expandedRows.value.includes(i));
  expandedRows.value = newExpanded;
  if (!added) return;

  const nomor = added.Nomor;
  if (detailCache.value[nomor]) return;

  detailLoading.value = new Set([...detailLoading.value, nomor]);
  try {
    const res = await penjadwalanPpicService.getDetail(nomor);
    detailCache.value = { ...detailCache.value, [nomor]: res.data.data ?? [] };
  } catch {
    toast.error(`Gagal memuat detail ${nomor}`);
  } finally {
    const s = new Set(detailLoading.value);
    s.delete(nomor);
    detailLoading.value = s;
  }
};

const rowPropsFn = (data: any) => {
  const item = data.item?.raw || data.item;
  if (item.Close === "Y") return { class: "text-grey-darken-1" };
  return {};
};

const rowStyleForStatus = (
  statusPermintaan: string,
): import("@/utils/excelExport").RowStyleResult | null => {
  if (statusPermintaan === "NECESSARY")
    return { fillColor: "B71C1C", fontColor: "FFFFFF", bold: true };
  if (statusPermintaan === "PARTIAL") return { fillColor: "FFF3E0" };
  return null; // CLOSE / default — tidak ada override, ikut zebra biasa
};

const detailRowClass = (d: DetailRow) => {
  if (d.StatusPermintaan === "NECESSARY") return "row-necessary";
  if (d.StatusPermintaan === "PARTIAL") return "row-partial";
  if (Number(d.Kurang) <= 0) return "row-done";
  return "";
};

const handleAdd = () => router.push("/ppic/penjadwalan/create");
const handleEdit = (item: BrowseItem) =>
  router.push(`/ppic/penjadwalan/edit/${encodeURIComponent(item.Nomor)}`);

const openCloseDialog = () => {
  if (!selected.value.length) return;
  selectedItem.value = selected.value[0];
  if (selectedItem.value.Close === "Y") {
    toast.warning("Sudah Close.");
    return;
  }
  showCloseDialog.value = true;
};
const openOpenDialog = () => {
  if (!selected.value.length) return;
  selectedItem.value = selected.value[0];
  if (selectedItem.value.Close === "N") {
    toast.warning("Sudah Open.");
    return;
  }
  showOpenDialog.value = true;
};
const openDeleteDialog = () => {
  if (!selected.value.length) return;
  selectedItem.value = selected.value[0];
  showDeleteDialog.value = true;
};

const confirmClose = async () => {
  if (!selectedItem.value) return;
  isActioning.value = true;
  try {
    await penjadwalanPpicService.toggleClose(selectedItem.value.Nomor, true);
    toast.success("Periode berhasil diclose.");
    showCloseDialog.value = false;
    fetchData();
  } catch (e: any) {
    toast.error(e.response?.data?.message || "Gagal close.");
  } finally {
    isActioning.value = false;
  }
};
const confirmOpen = async () => {
  if (!selectedItem.value) return;
  isActioning.value = true;
  try {
    await penjadwalanPpicService.toggleClose(selectedItem.value.Nomor, false);
    toast.success("Periode berhasil dibuka.");
    showOpenDialog.value = false;
    fetchData();
  } catch (e: any) {
    toast.error(e.response?.data?.message || "Gagal membuka.");
  } finally {
    isActioning.value = false;
  }
};
const confirmDelete = async () => {
  if (!selectedItem.value) return;
  isActioning.value = true;
  try {
    await penjadwalanPpicService.deleteData(selectedItem.value.Nomor);
    toast.success("Periode berhasil dihapus.");
    showDeleteDialog.value = false;
    fetchData();
  } catch (e: any) {
    toast.error(e.response?.data?.message || "Gagal menghapus.");
  } finally {
    isActioning.value = false;
  }
};

const KATEGORI_SUGGESTIONS = [
  "Cust",
  "Bahan",
  "Preparation",
  "Sewing/Produksi",
  "Ekspedisi",
];

const showPencapaianDialog = ref(false);
const pencapaianLoading = ref(false);
const pencapaianSaving = ref(false);
const pencapaianNomor = ref("");
const pencapaianRencana = ref(0);
const pencapaianRealisasi = ref(0);
const tidakTercapaiRows = ref<PencapaianRow[]>([]);
const tambahanRows = ref<PencapaianRow[]>([]);
const activePencapaianTab = ref<"SO" | "MAP">("SO");
const pencapaianDataSo = ref<any>(null);
const pencapaianDataMap = ref<any>(null);

const pencapaianPersen = computed(() =>
  pencapaianRencana.value > 0
    ? (pencapaianRealisasi.value / pencapaianRencana.value) * 100
    : 0,
);
const tambahanPersenTotal = computed(() =>
  pencapaianRencana.value > 0
    ? (tambahanRows.value.reduce((s, r) => s + (Number(r.pcs) || 0), 0) /
        pencapaianRencana.value) *
      100
    : 0,
);
const totalPencapaian = computed(
  () => pencapaianPersen.value + tambahanPersenTotal.value,
);
const rowPersen = (pcs: number) =>
  pencapaianRencana.value > 0
    ? ((Number(pcs) || 0) / pencapaianRencana.value) * 100
    : 0;

const openPencapaian = async () => {
  if (!selected.value.length) return;
  const item = selected.value[0];
  pencapaianNomor.value = item.Nomor;
  activePencapaianTab.value = "SO";
  showPencapaianDialog.value = true;
  pencapaianLoading.value = true;
  try {
    const res = await penjadwalanPpicService.getPencapaian(item.Nomor);
    pencapaianDataSo.value = res.data.data.So;
    pencapaianDataMap.value = res.data.data.Map;
    loadPencapaianTab("SO");
  } catch {
    toast.error(`Gagal memuat pencapaian ${item.Nomor}`);
  } finally {
    pencapaianLoading.value = false;
  }
};

const loadPencapaianTab = (tab: "SO" | "MAP") => {
  const d = tab === "MAP" ? pencapaianDataMap.value : pencapaianDataSo.value;
  if (!d) return;
  pencapaianRencana.value = d.Rencana;
  pencapaianRealisasi.value = d.Realisasi;
  tidakTercapaiRows.value = d.TidakTercapai.map((r: any) => ({
    Id: r.Id,
    kategori: r.Kategori,
    keterangan: r.Keterangan,
    pcs: r.Pcs,
  }));
  tambahanRows.value = d.Tambahan.map((r: any) => ({
    Id: r.Id,
    kategori: r.Kategori,
    keterangan: r.Keterangan,
    pcs: r.Pcs,
  }));
};

const switchPencapaianTab = (tab: "SO" | "MAP") => {
  activePencapaianTab.value = tab;
  loadPencapaianTab(tab);
};

const addTidakTercapaiRow = () =>
  tidakTercapaiRows.value.push({ kategori: "", keterangan: "", pcs: 0 });
const removeTidakTercapaiRow = (i: number) =>
  tidakTercapaiRows.value.splice(i, 1);
const addTambahanRow = () =>
  tambahanRows.value.push({ kategori: "", keterangan: "", pcs: 0 });
const removeTambahanRow = (i: number) => tambahanRows.value.splice(i, 1);

const savePencapaian = async () => {
  pencapaianSaving.value = true;
  try {
    await penjadwalanPpicService.savePencapaian(pencapaianNomor.value, {
      tidakTercapai: tidakTercapaiRows.value,
      tambahan: tambahanRows.value,
      group: activePencapaianTab.value === "MAP" ? "MAP" : undefined,
    });
    toast.success("Pencapaian berhasil disimpan.");
    // Perbarui cache lokal supaya kalau user pindah tab tanpa reload,
    // datanya tetap sinkron dengan yang baru disimpan.
    const target =
      activePencapaianTab.value === "MAP"
        ? "pencapaianDataMap"
        : "pencapaianDataSo";
    if (activePencapaianTab.value === "MAP" && pencapaianDataMap.value) {
      pencapaianDataMap.value.TidakTercapai = tidakTercapaiRows.value.map(
        (r) => ({
          Id: r.Id,
          Kategori: r.kategori,
          Keterangan: r.keterangan,
          Pcs: r.pcs,
        }),
      );
      pencapaianDataMap.value.Tambahan = tambahanRows.value.map((r) => ({
        Id: r.Id,
        Kategori: r.kategori,
        Keterangan: r.keterangan,
        Pcs: r.pcs,
      }));
    } else if (pencapaianDataSo.value) {
      pencapaianDataSo.value.TidakTercapai = tidakTercapaiRows.value.map(
        (r) => ({
          Id: r.Id,
          Kategori: r.kategori,
          Keterangan: r.keterangan,
          Pcs: r.pcs,
        }),
      );
      pencapaianDataSo.value.Tambahan = tambahanRows.value.map((r) => ({
        Id: r.Id,
        Kategori: r.kategori,
        Keterangan: r.keterangan,
        Pcs: r.pcs,
      }));
    }
  } catch (e: any) {
    toast.error(e.response?.data?.message || "Gagal menyimpan pencapaian.");
  } finally {
    pencapaianSaving.value = false;
  }
};

const onExport = async () => {
  const rawData =
    baseBrowseRef.value?.getFilteredItems?.() ?? items.value ?? [];
  if (!rawData.length) {
    toast.warning("Tidak ada data untuk diekspor.");
    return;
  }
  isExporting.value = true;
  try {
    await exportExcelSingle(
      `Komitmen_Kirim_${filterStart.value}_${filterEnd.value}.xlsx`,
      "Komitmen Kirim",
      [
        { header: "Nomor", key: "Nomor" },
        { header: "Tgl Awal", key: "TglAwal" },
        { header: "Tgl Akhir", key: "TglAkhir" },
        { header: "Cabang", key: "Cabang" },
        { header: "Status", key: "Status" },
        { header: "Jumlah SO", key: "JumlahSO", align: "right" },
        { header: "Keterangan", key: "Keterangan" },
      ],
      rawData.map((r: BrowseItem) => ({
        ...r,
        TglAwal: formatTanggal(r.TglAwal),
        TglAkhir: formatTanggal(r.TglAkhir),
        Status: r.Close === "Y" ? "Closed" : "Open",
      })),
    );
  } catch {
    toast.error("Gagal export.");
  } finally {
    isExporting.value = false;
  }
};

const buildDetailColumns = (cabang: string) => {
  const cols: any[] = [
    { header: "Tipe", key: "Tipe", align: "center" },
    { header: "Cabang", key: "Cabang", align: "center" },
    { header: "Tanggal", key: "Tanggal" },
    { header: "Nomor", key: "NomorSo" },
    { header: "Nama", key: "Nama" },
  ];
  if (showPanjangLebar(cabang)) {
    cols.push(
      { header: "Panjang", key: "Panjang", align: "right", numFmt: "#,##0.00" },
      { header: "Lebar", key: "Lebar", align: "right", numFmt: "#,##0.00" },
    );
  }
  cols.push(
    { header: "Pesan", key: "Pesan", align: "right", numFmt: "#,##0" },
    { header: "Kirim", key: "Kirim", align: "right", numFmt: "#,##0" },
    { header: "Kurang", key: "Kurang", align: "right", numFmt: "#,##0" },
    { header: "Rencana", key: "Rencana", align: "right", numFmt: "#,##0" },
    { header: "Ket. Rencana", key: "KetRencana" },
    { header: "Realisasi", key: "Realisasi", align: "right", numFmt: "#,##0" },
    { header: "Permintaan Kirim", key: "PermintaanKirim", align: "center" },
    { header: "Permintaan", key: "StatusPermintaan", align: "center" },
    { header: "Kesepakatan", key: "Kesepakatan", align: "center" },
    { header: "Ket Kesepakatan", key: "KetKesepakatan" },
  );
  return cols;
};

const onExportDetail = async () => {
  const rawData =
    baseBrowseRef.value?.getFilteredItems?.() ?? items.value ?? [];
  if (!rawData.length) {
    toast.warning("Tidak ada data untuk diekspor.");
    return;
  }
  isExportingDetail.value = true;
  try {
    // Pastikan detail semua periode yang tampil sudah ter-fetch —
    // pakai cache kalau ada, fetch baru kalau belum pernah di-expand.
    const detailPerNomor: Record<string, DetailRow[]> = {
      ...detailCache.value,
    };
    const belumAda = rawData.filter(
      (r: BrowseItem) => !detailPerNomor[r.Nomor],
    );
    if (belumAda.length) {
      const results = await Promise.all(
        belumAda.map((r: BrowseItem) =>
          penjadwalanPpicService.getDetail(r.Nomor).then((res) => ({
            nomor: r.Nomor,
            data: res.data.data ?? [],
          })),
        ),
      );
      results.forEach((r) => (detailPerNomor[r.nomor] = r.data));
    }

    // Nama sheet Excel: max 31 char, tidak boleh \ / ? * [ ] : , dan harus unik.
    const usedNames = new Set<string>();
    const sanitizeSheetName = (raw: string) => {
      let name = raw.replace(/[\\/?*[\]:]/g, "-").trim();
      if (!name) name = "Periode";
      name = name.slice(0, 31);
      let final = name;
      let i = 2;
      while (usedNames.has(final)) {
        const suffix = `(${i})`;
        final = name.slice(0, 31 - suffix.length) + suffix;
        i++;
      }
      usedNames.add(final);
      return final;
    };

    const sheets: any[] = [];
    for (const periode of rawData as BrowseItem[]) {
      const detailRows = detailPerNomor[periode.Nomor] || [];
      if (!detailRows.length) continue;

      const columns = buildDetailColumns(periode.Cabang); // ⬅ BARU, per periode

      const rows = detailRows.map((d) => ({
        Tipe: d.PjwdTipe === "MAP" ? "MAP" : "SO",
        Cabang: periode.Cabang,
        Tanggal: formatTanggal(d.Tanggal),
        NomorSo: nomorTampil(d),
        Nama: d.Nama,
        Panjang: Number(d.Panjang) || 0,
        Lebar: Number(d.Lebar) || 0,
        Pesan: Number(d.Pesan) || 0,
        Kirim: Number(d.Kirim) || 0,
        Kurang: Number(d.Kurang) || 0,
        Rencana: Number(d.Rencana) || 0,
        KetRencana: d.KetRencana || "",
        Realisasi: Number(d.Realisasi) || 0,
        PermintaanKirim: formatTanggal(d.PermintaanKirim),
        StatusPermintaan: d.StatusPermintaan,
        Kesepakatan: formatTanggal(d.Kesepakatan),
        KetKesepakatan: d.KetKesepakatan || "",
      }));

      // Baris total Rencana — dipisah SO vs MAP, ditampilkan di akhir sheet.
      const totalRencanaSo = detailRows
        .filter((d) => d.PjwdTipe !== "MAP")
        .reduce((sum, d) => sum + (Number(d.Rencana) || 0), 0);
      const totalRencanaMap = detailRows
        .filter((d) => d.PjwdTipe === "MAP")
        .reduce((sum, d) => sum + (Number(d.Rencana) || 0), 0);

      rows.push({
        Tipe: "SO",
        Cabang: "",
        Tanggal: "",
        NomorSo: "",
        Nama: "TOTAL RENCANA SO",
        Pesan: "" as any,
        Kirim: "" as any,
        Kurang: "" as any,
        Rencana: totalRencanaSo,
        KetRencana: "",
        Realisasi: "" as any,
        PermintaanKirim: "",
        StatusPermintaan: "",
        Kesepakatan: "",
        KetKesepakatan: "",
        _isSummary: true,
      } as any);
      rows.push({
        Tipe: "MAP",
        Cabang: "",
        Tanggal: "",
        NomorSo: "",
        Nama: "TOTAL RENCANA MAP (SAMPEL)",
        Pesan: "" as any,
        Kirim: "" as any,
        Kurang: "" as any,
        Rencana: totalRencanaMap,
        KetRencana: "",
        Realisasi: "" as any,
        PermintaanKirim: "",
        StatusPermintaan: "",
        Kesepakatan: "",
        KetKesepakatan: "",
        _isSummary: true,
      } as any);

      sheets.push({
        sheetName: sanitizeSheetName(
          `${periode.Cabang} ${formatTanggal(periode.TglAwal)}-${formatTanggal(periode.TglAkhir)}`,
        ),
        title: `${periode.Cabang} - ${formatTanggal(periode.TglAwal)} s/d ${formatTanggal(periode.TglAkhir)}`,
        headerColor: "FFEB3B",
        columns,
        rows,
        rowStyleFn: (row: any) =>
          row._isSummary
            ? { fillColor: "FFD54F", fontColor: "212121", bold: true }
            : rowStyleForStatus(row.StatusPermintaan),
      });
    }

    if (!sheets.length) {
      toast.warning(
        "Tidak ada detail SO/Pra Order/MAP untuk periode yang ditampilkan.",
      );
      return;
    }

    await exportExcel(
      `Komitmen_Kirim_Detail_${filterStart.value}_${filterEnd.value}.xlsx`,
      sheets,
    );
  } catch (e) {
    console.error(e);
    toast.error("Gagal export detail.");
  } finally {
    isExportingDetail.value = false;
  }
};

const fmt = (n: number | null | undefined) => (n ?? 0).toLocaleString("id-ID");
const showPanjangLebar = (cabang: string) => ["P02", "P05"].includes(cabang);
const nomorTampil = (d: DetailRow) =>
  d.Nomor || d.NomorMap || d.NomorMh || d.NomorPen || d.NomorPraOrder || "-";

loadCabang();
fetchData();
checkUnnotifiedMap();
</script>

<template>
  <BaseBrowse
    ref="baseBrowseRef"
    title="Komitmen Kirim"
    menu-id="176"
    :icon="IconCalendarWeek"
    :headers="headers"
    :items="items"
    :is-loading="isLoading"
    v-model:selected="selected"
    :expanded="expandedRows"
    @update:expanded="handleExpand"
    show-expand
    :can-insert="canCreate"
    :can-edit="true"
    :can-delete="false"
    :can-export="false"
    item-value="Nomor"
    :row-props-fn="rowPropsFn"
    :filter-state="filterState"
    @update:filter-state="onFilterStateRestored"
    @refresh="fetchData"
    @add="handleAdd"
    @edit="handleEdit"
  >
    <template #filter-left>
      <div class="date-filter">
        <span class="f-label" style="margin-left: 10px">Periode</span>
        <div class="date-with-day">
          <input type="date" v-model="filterStart" class="f-date" />
          <span class="f-day">{{ hariStart }}</span>
        </div>
        <span class="f-sep">sd</span>
        <div class="date-with-day">
          <input type="date" v-model="filterEnd" class="f-date" />
          <span class="f-day">{{ hariEnd }}</span>
        </div>
        <span class="f-label">Cabang</span>
        <select v-model="filterCabang" class="f-select">
          <option value="">Semua Cabang</option>
          <option v-for="c in cabangOptions" :key="c.value" :value="c.value">
            {{ c.title }}
          </option>
        </select>
        <v-btn
          color="primary"
          variant="tonal"
          size="small"
          height="26"
          class="px-2"
          @click="fetchData"
          >Filter</v-btn
        >
      </div>
    </template>

    <template #extra-actions="{ selected }">
      <v-btn
        size="small"
        color="error"
        :disabled="!selected.length"
        @click="openDeleteDialog"
      >
        <template #prepend><IconTrash :size="15" /></template>
        Hapus
      </v-btn>
      <v-btn
        size="small"
        variant="outlined"
        color="primary"
        :disabled="selected.length !== 1"
        @click="openPreview"
      >
        <template #prepend><IconEye :size="14" /></template>
        Preview
      </v-btn>
      <v-btn
        size="small"
        variant="outlined"
        color="deep-purple"
        :disabled="selected.length !== 1"
        @click="openPencapaian"
      >
        <template #prepend><IconReportAnalytics :size="14" /></template>
        Pencapaian
      </v-btn>
      <v-btn
        size="small"
        color="blue-grey-darken-2"
        :disabled="!selected.length"
        @click="openCloseDialog"
      >
        <template #prepend><IconLock :size="14" /></template>Close
      </v-btn>
      <v-btn
        size="small"
        color="teal-darken-2"
        :disabled="!selected.length"
        @click="openOpenDialog"
      >
        <template #prepend><IconLockOpen :size="14" /></template>Open
      </v-btn>
      <v-btn
        size="small"
        variant="outlined"
        color="success"
        :loading="isExporting"
        @click="onExport"
      >
        <IconFileExport :size="14" style="margin-right: 4px" />
        Export
      </v-btn>
      <v-btn
        size="small"
        variant="outlined"
        color="success"
        :loading="isExportingDetail"
        @click="onExportDetail"
      >
        <IconListDetails :size="14" style="margin-right: 4px" />
        Export Detail
      </v-btn>
    </template>

    <template #item.Close="{ item }">
      <v-chip
        size="x-small"
        :color="item.Close === 'Y' ? 'grey' : 'success'"
        variant="flat"
        class="font-weight-bold"
      >
        {{ item.Close === "Y" ? "Closed" : "Open" }}
      </v-chip>
    </template>
    <template #item.TglAwal="{ item }">{{
      formatTanggal(item.TglAwal)
    }}</template>
    <template #item.TglAkhir="{ item }">{{
      formatTanggal(item.TglAkhir)
    }}</template>

    <!-- ── Expand: tabel detail SO periode ini ── -->
    <template #detail="{ item }">
      <div class="expand-wrap">
        <div v-if="detailLoading.has(item.Nomor)" class="expand-loading">
          <v-progress-circular indeterminate color="primary" size="20" />
          <span>Memuat detail...</span>
        </div>

        <div v-else-if="detailCache[item.Nomor]">
          <div class="mini-tab-switch">
            <button
              type="button"
              :class="{ active: getExpandTab(item.Nomor) === 'SO' }"
              @click="setExpandTab(item.Nomor, 'SO')"
            >
              SO ({{ item.JumlahSO }})
            </button>
            <button
              type="button"
              :class="{ active: getExpandTab(item.Nomor) === 'MAP' }"
              @click="setExpandTab(item.Nomor, 'MAP')"
            >
              MAP — Sampel ({{ item.JumlahMap }})
            </button>
          </div>

          <div class="dt-scroll">
            <table class="dt">
              <thead>
                <tr>
                  <th>Tanggal</th>
                  <th>Nomor / Nama SO</th>
                  <th v-if="showPanjangLebar(item.Cabang)" class="tr">
                    Panjang
                  </th>
                  <th v-if="showPanjangLebar(item.Cabang)" class="tr">Lebar</th>
                  <th class="tr">Pesan</th>
                  <th class="tr">Kirim</th>
                  <th class="tr">Kurang</th>
                  <th class="tr">Rencana</th>
                  <th class="tr">Realisasi</th>
                  <th class="tc">Permintaan Kirim</th>
                  <th class="tc">Permintaan</th>
                  <th>Kesepakatan</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="d in filterByTipe(
                    detailCache[item.Nomor],
                    getExpandTab(item.Nomor),
                  )"
                  :key="d.PjwdId"
                  :class="detailRowClass(d)"
                >
                  <td>{{ formatTanggal(d.Tanggal) }}</td>
                  <td>
                    <div class="mono">{{ nomorTampil(d) }}</div>
                    <div>{{ d.Nama }}</div>
                    <div
                      v-if="d.NomorPraOrder && d.Nomor"
                      class="praorder-badge"
                    >
                      dari {{ d.NomorPraOrder }}
                    </div>
                    <div v-if="d.KetRencana" class="ket-rencana-note">
                      📝 {{ d.KetRencana }}
                    </div>
                  </td>
                  <td v-if="showPanjangLebar(item.Cabang)" class="tr">
                    {{ fmt(d.Panjang) }}
                  </td>
                  <td v-if="showPanjangLebar(item.Cabang)" class="tr">
                    {{ fmt(d.Lebar) }}
                  </td>
                  <td class="tr">{{ fmt(d.Pesan) }}</td>
                  <td class="tr">{{ fmt(d.Kirim) }}</td>
                  <td
                    class="tr"
                    :class="{ 'text-red fw': Number(d.Kurang) > 0 }"
                  >
                    {{ fmt(d.Kurang) }}
                  </td>
                  <td class="tr">{{ fmt(d.Rencana) }}</td>
                  <td class="tr">{{ fmt(d.Realisasi) }}</td>
                  <td class="tc">{{ formatTanggal(d.PermintaanKirim) }}</td>
                  <td class="tc">
                    <v-chip
                      size="x-small"
                      :color="
                        d.StatusPermintaan === 'CLOSE' ? 'success' : 'grey'
                      "
                      variant="flat"
                    >
                      {{ d.StatusPermintaan }}
                    </v-chip>
                  </td>
                  <td>
                    <span v-if="d.Kesepakatan" class="kesepakatan-tgl">{{
                      formatTanggal(d.Kesepakatan)
                    }}</span>
                    <span v-if="d.KetKesepakatan" class="kesepakatan-ket">
                      — {{ d.KetKesepakatan }}</span
                    >
                    <span v-if="!d.Kesepakatan" class="text-grey">-</span>
                  </td>
                </tr>
                <tr
                  v-if="
                    !filterByTipe(
                      detailCache[item.Nomor],
                      getExpandTab(item.Nomor),
                    ).length
                  "
                >
                  <td colspan="10" class="empty-row">
                    Belum ada
                    {{
                      getExpandTab(item.Nomor) === "MAP" ? "MAP/sampel" : "SO"
                    }}
                    ditambahkan di periode ini.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div v-else class="expand-empty">Tidak ada data detail.</div>
      </div>
    </template>
  </BaseBrowse>

  <v-dialog v-model="showCloseDialog" max-width="380" persistent>
    <v-card class="rounded-lg">
      <v-card-title
        class="bg-blue-grey-darken-2 text-white pa-3 text-subtitle-1"
        >Konfirmasi Close Periode</v-card-title
      >
      <v-card-text class="pa-4"
        >Yakin ingin menutup periode <b>{{ selectedItem?.Nomor }}</b
        >?</v-card-text
      >
      <v-card-actions class="pa-3 border-t bg-grey-lighten-4">
        <v-btn variant="text" @click="showCloseDialog = false">Batal</v-btn>
        <v-spacer />
        <v-btn
          color="blue-grey-darken-2"
          variant="elevated"
          :loading="isActioning"
          @click="confirmClose"
          >Ya, Close</v-btn
        >
      </v-card-actions>
    </v-card>
  </v-dialog>

  <v-dialog v-model="showOpenDialog" max-width="380" persistent>
    <v-card class="rounded-lg">
      <v-card-title class="bg-teal-darken-2 text-white pa-3 text-subtitle-1"
        >Konfirmasi Buka Periode</v-card-title
      >
      <v-card-text class="pa-4"
        >Yakin ingin membuka periode <b>{{ selectedItem?.Nomor }}</b
        >?</v-card-text
      >
      <v-card-actions class="pa-3 border-t bg-grey-lighten-4">
        <v-btn variant="text" @click="showOpenDialog = false">Batal</v-btn>
        <v-spacer />
        <v-btn
          color="teal-darken-2"
          variant="elevated"
          :loading="isActioning"
          @click="confirmOpen"
          >Ya, Buka</v-btn
        >
      </v-card-actions>
    </v-card>
  </v-dialog>

  <v-dialog v-model="showDeleteDialog" max-width="380" persistent>
    <v-card class="rounded-lg">
      <v-card-title class="bg-error text-white pa-3 text-subtitle-1"
        >Konfirmasi Hapus</v-card-title
      >
      <v-card-text class="pa-4"
        >Yakin ingin menghapus periode <b>{{ selectedItem?.Nomor }}</b
        >? Data tidak bisa dipulihkan.</v-card-text
      >
      <v-card-actions class="pa-3 border-t bg-grey-lighten-4">
        <v-btn variant="text" @click="showDeleteDialog = false">Batal</v-btn>
        <v-spacer />
        <v-btn
          color="error"
          variant="elevated"
          :loading="isActioning"
          @click="confirmDelete"
          >Ya, Hapus</v-btn
        >
      </v-card-actions>
    </v-card>
  </v-dialog>

  <v-dialog v-model="showPreviewDialog" max-width="1150">
    <v-card class="rounded-lg">
      <v-card-title
        class="bg-primary text-white pa-3 text-subtitle-1 d-flex align-center justify-space-between"
      >
        <span>Preview Komitmen Kirim — {{ previewNomor }}</span>
        <v-btn
          icon
          size="small"
          variant="text"
          color="white"
          @click="showPreviewDialog = false"
        >
          <IconX :size="18" />
        </v-btn>
      </v-card-title>
      <v-card-text class="pa-0">
        <div v-if="previewLoading" class="expand-loading pa-4">
          <v-progress-circular indeterminate color="primary" size="20" />
          <span>Memuat detail...</span>
        </div>
        <template v-else>
          <div class="mini-tab-switch pa-2">
            <button
              type="button"
              :class="{ active: activePreviewTab === 'SO' }"
              @click="activePreviewTab = 'SO'"
            >
              SO
            </button>
            <button
              type="button"
              :class="{ active: activePreviewTab === 'MAP' }"
              @click="activePreviewTab = 'MAP'"
            >
              MAP — Sampel
            </button>
          </div>
          <table class="dt" style="width: 100%">
            <thead>
              <tr>
                <th>Tanggal</th>
                <th>Sumber</th>
                <th>Nomor / Nama</th>
                <th v-if="showPanjangLebar(previewCabang)" class="tr">
                  Panjang
                </th>
                <th v-if="showPanjangLebar(previewCabang)" class="tr">Lebar</th>
                <th class="tr">Pesan</th>
                <th class="tr">Kirim</th>
                <th class="tr">Kurang</th>
                <th class="tr">Rencana</th>
                <th class="tr">Realisasi</th>
                <th class="tc">Permintaan Kirim</th>
                <th class="tc">Permintaan</th>
                <th>Kesepakatan</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="d in filterByTipe(previewDetail, activePreviewTab)"
                :key="d.PjwdId"
                :class="detailRowClass(d)"
              >
                <td>{{ formatTanggal(d.Tanggal) }}</td>
                <td>
                  <v-chip size="x-small" variant="tonal">{{ d.Sumber }}</v-chip>
                </td>
                <td>
                  <div class="mono">{{ nomorTampil(d) }}</div>
                  <div>{{ d.Nama }}</div>
                </td>
                <td class="tr">{{ fmt(d.Pesan) }}</td>
                <td class="tr">{{ fmt(d.Kirim) }}</td>
                <td class="tr" :class="{ 'text-red fw': Number(d.Kurang) > 0 }">
                  {{ fmt(d.Kurang) }}
                </td>
                <td v-if="showPanjangLebar(previewCabang)" class="tr">
                  {{ fmt(d.Panjang) }}
                </td>
                <td v-if="showPanjangLebar(previewCabang)" class="tr">
                  {{ fmt(d.Lebar) }}
                </td>
                <td class="tr">{{ fmt(d.Rencana) }}</td>
                <td class="tr">{{ fmt(d.Realisasi) }}</td>
                <td class="tc">{{ formatTanggal(d.PermintaanKirim) }}</td>
                <td class="tc">
                  <v-chip
                    size="x-small"
                    :color="d.StatusPermintaan === 'CLOSE' ? 'success' : 'grey'"
                    variant="flat"
                  >
                    {{ d.StatusPermintaan }}
                  </v-chip>
                </td>
                <td>
                  <span v-if="d.Kesepakatan" class="kesepakatan-tgl">{{
                    formatTanggal(d.Kesepakatan)
                  }}</span>
                  <span v-if="d.KetKesepakatan" class="kesepakatan-ket">
                    — {{ d.KetKesepakatan }}</span
                  >
                  <span v-if="!d.Kesepakatan" class="text-grey">-</span>
                </td>
              </tr>
              <tr v-if="!filterByTipe(previewDetail, activePreviewTab).length">
                <td colspan="11" class="empty-row">
                  Belum ada
                  {{ activePreviewTab === "MAP" ? "MAP/sampel" : "SO" }} di
                  periode ini.
                </td>
              </tr>
            </tbody>
          </table>
        </template>
      </v-card-text>
    </v-card>
  </v-dialog>

  <v-dialog v-model="showPencapaianDialog" max-width="650" persistent>
    <v-card class="rounded-lg">
      <v-card-title
        class="bg-deep-purple text-white pa-3 text-subtitle-1 d-flex align-center justify-space-between"
      >
        <span>Laporan Pencapaian — {{ pencapaianNomor }}</span>
        <v-btn
          icon
          size="small"
          variant="text"
          color="white"
          @click="showPencapaianDialog = false"
        >
          <IconX :size="18" />
        </v-btn>
      </v-card-title>
      <v-card-text class="pa-4">
        <div v-if="pencapaianLoading" class="expand-loading">
          <v-progress-circular indeterminate color="primary" size="20" />
          <span>Memuat...</span>
        </div>
        <template v-else>
          <div class="mini-tab-switch mb-3">
            <button
              type="button"
              :class="{ active: activePencapaianTab === 'SO' }"
              @click="switchPencapaianTab('SO')"
            >
              Komitmen Kirim SO
            </button>
            <button
              type="button"
              :class="{ active: activePencapaianTab === 'MAP' }"
              @click="switchPencapaianTab('MAP')"
            >
              Komitmen Kirim MAP — Sampel
            </button>
          </div>

          <table class="dt dt-summary">
            <tbody>
              <tr>
                <td>Rencana</td>
                <td class="tr">{{ fmt(pencapaianRencana) }}</td>
              </tr>
              <tr>
                <td>Realisasi</td>
                <td class="tr">{{ fmt(pencapaianRealisasi) }}</td>
              </tr>
              <tr class="fw">
                <td>Pencapaian</td>
                <td class="tr">{{ pencapaianPersen.toFixed(1) }}%</td>
              </tr>
            </tbody>
          </table>

          <div class="section-header mt-4 mb-1">
            <span class="section-title">Yang tidak tercapai</span>
            <v-btn
              size="x-small"
              variant="text"
              color="primary"
              @click="addTidakTercapaiRow"
              >+ Baris</v-btn
            >
          </div>
          <table class="dt dt-pencapaian">
            <thead>
              <tr>
                <th>Kategori</th>
                <th>Keterangan</th>
                <th class="tr">Pcs</th>
                <th class="tr">%</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(r, i) in tidakTercapaiRows" :key="i">
                <td>
                  <v-combobox
                    v-model="r.kategori"
                    :items="KATEGORI_SUGGESTIONS"
                    density="compact"
                    hide-details
                    variant="underlined"
                  />
                </td>
                <td>
                  <v-text-field
                    v-model="r.keterangan"
                    density="compact"
                    hide-details
                    variant="underlined"
                  />
                </td>
                <td class="tr">
                  <v-text-field
                    v-model.number="r.pcs"
                    type="number"
                    density="compact"
                    hide-details
                    variant="underlined"
                    style="width: 90px"
                  />
                </td>
                <td class="tr">{{ rowPersen(r.pcs).toFixed(1) }}%</td>
                <td>
                  <v-btn
                    icon
                    size="x-small"
                    variant="text"
                    color="error"
                    @click="removeTidakTercapaiRow(i)"
                    ><IconX :size="14"
                  /></v-btn>
                </td>
              </tr>
            </tbody>
          </table>

          <div class="section-header mt-4 mb-1">
            <span class="section-title">Tambahan</span>
            <v-btn
              size="x-small"
              variant="text"
              color="primary"
              @click="addTambahanRow"
              >+ Baris</v-btn
            >
          </div>
          <table class="dt dt-pencapaian">
            <thead>
              <tr>
                <th>Kategori</th>
                <th>Keterangan</th>
                <th class="tr">Pcs</th>
                <th class="tr">%</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(r, i) in tambahanRows" :key="i">
                <td>
                  <v-combobox
                    v-model="r.kategori"
                    :items="KATEGORI_SUGGESTIONS"
                    density="compact"
                    hide-details
                    variant="underlined"
                  />
                </td>
                <td>
                  <v-text-field
                    v-model="r.keterangan"
                    density="compact"
                    hide-details
                    variant="underlined"
                  />
                </td>
                <td class="tr">
                  <v-text-field
                    v-model.number="r.pcs"
                    type="number"
                    density="compact"
                    hide-details
                    variant="underlined"
                    style="width: 90px"
                  />
                </td>
                <td class="tr">{{ rowPersen(r.pcs).toFixed(1) }}%</td>
                <td>
                  <v-btn
                    icon
                    size="x-small"
                    variant="text"
                    color="error"
                    @click="removeTambahanRow(i)"
                    ><IconX :size="14"
                  /></v-btn>
                </td>
              </tr>
            </tbody>
          </table>

          <table class="dt dt-total mt-3">
            <tbody>
              <tr class="fw">
                <td>Total Pencapaian</td>
                <td class="tr">{{ totalPencapaian.toFixed(1) }}%</td>
              </tr>
            </tbody>
          </table>
        </template>
      </v-card-text>
      <v-card-actions class="pa-3 border-t bg-grey-lighten-4">
        <v-btn variant="text" @click="showPencapaianDialog = false"
          >Batal</v-btn
        >
        <v-spacer />
        <v-btn
          color="deep-purple"
          variant="elevated"
          :loading="pencapaianSaving"
          @click="savePencapaian"
          >Simpan</v-btn
        >
      </v-card-actions>
    </v-card>
  </v-dialog>

  <v-dialog v-model="showNotifDialog" max-width="900" persistent>
    <v-card
      class="rounded-lg"
      style="max-height: 90vh; display: flex; flex-direction: column"
    >
      <v-card-title
        class="bg-orange-darken-2 text-white pa-3 d-flex align-center flex-shrink-0"
        style="font-size: 15px; font-weight: 700"
      >
        <IconCalendarWeek :size="18" class="mr-2" />
        Komitmen Kirim Sampel Baru
      </v-card-title>
      <v-card-text class="pa-4" style="flex: 1; overflow-y: auto">
        <div v-for="p in notifPeriodeList" :key="p.pjwNomor" class="mb-4">
          <div
            class="d-flex align-center justify-space-between mb-2"
            style="cursor: pointer"
            @click="openFromNotif(p.pjwNomor)"
          >
            <div>
              <span
                class="font-weight-bold text-primary"
                style="font-size: 13px"
                >{{ p.pjwNomor }}</span
              >
              <span class="text-grey ml-2" style="font-size: 13px">
                ({{ formatTanggal(p.tgl1) }} s/d {{ formatTanggal(p.tgl2) }},
                {{ p.cab }})
              </span>
            </div>
            <v-icon size="18" color="primary">mdi-arrow-right</v-icon>
          </div>
          <ul
            style="
              font-size: 13px;
              padding-left: 20px;
              margin: 0;
              line-height: 1.7;
            "
          >
            <li v-for="it in p.items" :key="it.pjwdId">
              <span class="mono">{{ it.mapNomor }}</span> — {{ it.nama }}
            </li>
          </ul>
        </div>
      </v-card-text>
      <v-card-actions class="pa-3 border-t bg-grey-lighten-4 flex-shrink-0">
        <v-spacer />
        <v-btn variant="text" style="font-size: 13px" @click="closeNotifDialog"
          >Tutup</v-btn
        >
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.date-filter {
  display: flex;
  align-items: center;
  gap: 6px;
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  padding: 4px 10px;
}
.f-label {
  font-size: 11px;
  font-weight: 600;
  color: #424242;
  white-space: nowrap;
}
.f-date {
  height: 26px;
  border: 1px solid #ccc;
  border-radius: 4px;
  padding: 0 4px;
  font-size: 11px;
  outline: none;
  background: white;
}
.f-date:focus {
  border-color: #1976d2;
}
.f-select {
  height: 26px;
  border: 1px solid #ccc;
  border-radius: 4px;
  padding: 0 4px;
  font-size: 11px;
  outline: none;
  background: white;
}
.f-select:focus {
  border-color: #1976d2;
}
.f-sep {
  font-size: 11px;
  color: #757575;
}
.date-with-day {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1px;
}
.f-day {
  font-size: 10px;
  font-weight: 700;
  color: #1565c0;
  line-height: 1;
}

.expand-wrap {
  padding: 6px 6px 6px 48px;
  background: #eceff1;
  min-width: 0;
}
.expand-loading {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px;
  font-size: 12px;
  color: #555;
}
.expand-empty {
  text-align: center;
  color: #9e9e9e;
  font-style: italic;
  padding: 12px;
  font-size: 11px;
}

.dt {
  width: 100%;
  border-collapse: collapse;
  font-size: 11px;
  background: white;
}
.dt thead th {
  padding: 5px 8px;
  font-weight: 700;
  font-size: 10px;
  text-align: left;
  white-space: nowrap;
  background: #ffeb3b;
  color: #212121;
}
.dt tbody td {
  padding: 4px 8px;
  border-bottom: 1px solid #eee;
  vertical-align: top;
}
.dt tbody tr:nth-of-type(even) td {
  background: #fafafa;
}
.dt tbody tr:hover td {
  background: #e8f5e9 !important;
}
.dt tbody tr.row-done td {
  background: #e3f2fd;
}
.dt tbody tr.row-necessary td {
  background: #b71c1c !important;
  color: white;
  font-weight: 700;
}
.dt-scroll {
  max-height: 340px;
  overflow-y: auto;
  overflow-x: auto;
}
.dt thead th {
  position: sticky;
  top: 0;
  z-index: 2;
}
.row-necessary .kesepakatan-tgl,
.row-necessary .kesepakatan-ket {
  color: #ffffff !important;
}
.dt tbody tr.row-partial td {
  background: #fff3e0;
}
.dt-pencapaian tbody td {
  vertical-align: middle;
  padding-top: 2px;
  padding-bottom: 2px;
}
.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.section-title {
  font-size: 12.5px;
  font-weight: 700;
  color: #424242;
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

.dt-summary {
  font-size: 13px;
}
.dt-summary td {
  padding: 5px 8px;
}
.dt-summary tr.fw td {
  font-size: 14px;
  color: #6a1b9a;
}

.dt-pencapaian tbody td {
  vertical-align: middle;
  padding-top: 2px;
  padding-bottom: 2px;
}

.dt-total {
  font-size: 14px;
}
.dt-total td {
  padding: 8px;
  border-top: 2px solid #6a1b9a;
}
.dt-total tr.fw td {
  color: #6a1b9a;
}

.tr {
  text-align: right !important;
}
.tc {
  text-align: center !important;
}
.fw {
  font-weight: bold;
}
.mono {
  font-weight: 700;
}
.empty-row {
  text-align: center;
  color: #9e9e9e;
  font-style: italic;
  padding: 12px;
  font-size: 11px;
}
.praorder-badge {
  display: inline-block;
  margin-top: 2px;
  font-size: 9px;
  background: #1565c0;
  color: white;
  padding: 1px 6px;
  border-radius: 8px;
}
.ket-rencana-note {
  margin-top: 2px;
  font-size: 9.5px;
  font-style: italic;
  color: #e65100;
}
.kesepakatan-tgl {
  font-weight: 700;
  color: #e65100;
}
.kesepakatan-ket {
  color: #757575;
}
.mini-tab-switch {
  display: flex;
  gap: 4px;
  margin-bottom: 6px;
  padding-left: 2px;
}
.mini-tab-switch button {
  padding: 3px 10px;
  border: 1px solid #bdbdbd;
  border-radius: 3px;
  background: white;
  font-size: 10.5px;
  font-weight: 600;
  cursor: pointer;
  color: #555;
}
.mini-tab-switch button.active {
  background: #1565c0;
  color: white;
  border-color: #1565c0;
}
</style>
