<script setup lang="ts">
import { ref, computed, onMounted, watch } from "vue";
import { useRouter } from "vue-router";
import { useToast } from "vue-toastification";
import { useAuthStore } from "@/stores/authStore";
import { useBrowse } from "@/composables/useBrowse";
import { mutasiProduksiService } from "@/services/garmen/mutasiProduksiService";
import BaseBrowse from "@/components/BaseBrowse.vue";
import { exportExcel, type ExcelColumn } from "@/utils/excelExport";
import {
  IconBuildingFactory2,
  IconPencil,
  IconPrinter,
  IconFileSpreadsheet,
  IconTableExport,
  IconSearch,
  IconAlertTriangle,
  IconSend,
  IconTrash,
} from "@tabler/icons-vue";

// ── Tipe ──────────────────────────────────────────────────────────────
interface MutasiRow {
  Nomor: string;
  NoLHKProduksi: string;
  Cab: string;
  Tanggal: string;
  Asal: string;
  Tujuan: string;
  Keterangan: string;
  Spk: string;
  TglSPK: string;
  NamaSPK: string;
  Jumlah: number;
  JmlSPK: number;
  Jadi: number;
  Kirim: number;
  stat: string;
  QtyLhk: number;
  QtyTerpakai: number;
  Satuan: string;
  BabaranStandar: number;
  BabaranActual: number;
  SelisihBabaran: number;
  Approval: string;
  Alasan: string;
  Ngedit: string;
  hapus: string;
  Usr: string;
  created: string;
}

interface DetailRow {
  Nomor: string;
  Kode: string;
  Nama: string;
  Satuan: string;
  Size: string;
  Lhk: number;
  Jumlah: number;
  BS_Sablon: number;
  BS_Kain_Sablon: number;
  BS_Kain: number;
  GantiBs: string;
  Panjang: number;
  Lebar: number;
}

// ── Store & Router ─────────────────────────────────────────────────────
const authStore = useAuthStore();
const router = useRouter();
const toast = useToast();

// ── Helper tanggal WIB ─────────────────────────────────────────────────
const todayWIB = (): string => {
  const d = new Date(
    new Date().toLocaleString("en-US", { timeZone: "Asia/Jakarta" }),
  );
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

// ── Filter State ───────────────────────────────────────────────────────
// Default: hari ini s.d. hari ini, cab dari user
const userCab = computed(() => authStore.user?.cabang || "");

const filterState = ref({
  tglAwal: todayWIB(),
  tglAkhir: todayWIB(),
  cab: "ALL",
  lini: "",
  liniNama: "",
});

// ── Lookup data ────────────────────────────────────────────────────────
const cabangOptions = ref<string[]>(["ALL"]);
const gudangList = ref<Array<{ Kode: string; Nama: string }>>([]);
const showLiniModal = ref(false);
const liniSearch = ref("");

const filteredGudang = computed(() => {
  const q = liniSearch.value.toLowerCase();
  if (!q) return gudangList.value;
  return gudangList.value.filter(
    (g) => g.Kode.toLowerCase().includes(q) || g.Nama.toLowerCase().includes(q),
  );
});

const loadLookups = async () => {
  try {
    // Cabang — dari data yang ada di DB
    const resCab = await mutasiProduksiService.getListCabang();
    cabangOptions.value = ["ALL", ...(resCab.data.data || [])];

    // Default cabang dari user (sesuai Delphi FormShow: if CAB<>'' then cbCab=CAB)
    if (userCab.value && userCab.value !== "HO-") {
      filterState.value.cab = userCab.value;
    }

    // Gudang produksi untuk filter lini
    const cab = filterState.value.cab !== "ALL" ? filterState.value.cab : "";
    const resGdg = await mutasiProduksiService.getListGudangProduksi(cab);
    gudangList.value = resGdg.data.data || [];
  } catch {
    /* silent */
  }
};

const selectLini = (item: { Kode: string; Nama: string }) => {
  filterState.value.lini = item.Kode;
  filterState.value.liniNama = item.Nama;
  showLiniModal.value = false;
  liniSearch.value = "";
  fetchData();
};

const clearLini = () => {
  filterState.value.lini = "";
  filterState.value.liniNama = "";
  fetchData();
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
} = useBrowse<MutasiRow>({
  menuId: "109",
  immediate: false,
  fetchApi: async () => {
    const res = await mutasiProduksiService.getBrowse({
      tglAwal: filterState.value.tglAwal,
      tglAkhir: filterState.value.tglAkhir,
      cab: filterState.value.cab,
      lini: filterState.value.lini,
    });
    return res.data.data || [];
  },
});

// ── Expanded rows & detail cache ───────────────────────────────────────
const expanded = ref<MutasiRow[]>([]);
const detailCache = ref<Record<string, DetailRow[]>>({});
const loadingDetails = ref<Set<string>>(new Set());

const onUpdateExpanded = async (val: any[]) => {
  expanded.value = val;
  const nomors: string[] = val.map((v) =>
    typeof v === "object" ? v.Nomor : v,
  );
  for (const nomor of nomors) {
    if (!detailCache.value[nomor]) {
      loadingDetails.value = new Set([...loadingDetails.value, nomor]);
      try {
        const res = await mutasiProduksiService.getDetail(nomor);
        detailCache.value[nomor] = res.data.data || [];
      } catch {
        detailCache.value[nomor] = [];
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
  { title: "Nomor", key: "Nomor", width: "130px" },
  { title: "No LHK", key: "NoLHKProduksi", width: "120px" },
  { title: "Cab", key: "Cab", width: "55px" },
  { title: "Tanggal", key: "Tanggal", width: "95px" },
  { title: "Asal", key: "Asal", width: "130px" },
  { title: "Tujuan", key: "Tujuan", width: "130px" },
  { title: "Keterangan", key: "Keterangan", minWidth: "140px" },
  { title: "SPK", key: "Spk", width: "130px" },
  { title: "Nama SPK", key: "NamaSPK", minWidth: "160px" },
  { title: "Jumlah", key: "Jumlah", width: "80px", align: "end" },
  { title: "Jml SPK", key: "JmlSPK", width: "80px", align: "end" },
  { title: "Jadi", key: "Jadi", width: "75px", align: "end" },
  { title: "Kirim", key: "Kirim", width: "75px", align: "end" },
  { title: "Stat", key: "stat", width: "75px" },
  { title: "Qty LHK", key: "QtyLhk", width: "80px", align: "end" },
  { title: "Qty Terpakai", key: "QtyTerpakai", width: "95px", align: "end" },
  { title: "Satuan", key: "Satuan", width: "65px" },
  { title: "Babaran Std", key: "BabaranStandar", width: "95px", align: "end" },
  {
    title: "Babaran Actual",
    key: "BabaranActual",
    width: "110px",
    align: "end",
  },
  {
    title: "Selisih Babaran",
    key: "SelisihBabaran",
    width: "115px",
    align: "end",
  },
  { title: "Approval", key: "Approval", width: "80px", align: "center" },
  { title: "Alasan", key: "Alasan", minWidth: "120px" },
  { title: "User", key: "Usr", width: "80px" },
];

// ── Row colors (sesuai Delphi cxGrdMasterCustomDrawCell) ──────────────
// Approval=N → merah, Approval bukan N/Y → biru, hapus=Y → abu
// Ngedit di kolom Nomor: WAIT=biru bg, TOLAK=merah bg, ACC=hijau bg
const rowPropsFn = (data: any) => {
  const item = data.item?.raw || data.item;
  if (item.hapus === "Y") {
    return { style: "color:#9e9e9e" };
  }
  if (item.Approval === "N") {
    return { style: "color:#d32f2f;font-weight:600" };
  }
  if (item.Approval !== "N" && item.Approval !== "Y" && item.Approval) {
    return { style: "color:#1565c0;font-weight:600" };
  }
  if (item.NoPlanStatus === "MINTA") {
    return { style: "background:#fff8e1" };
  }
  return {};
};

const num = (val: any, dec = 2) =>
  val !== null && val !== undefined
    ? Number(val).toLocaleString("id-ID", {
        minimumFractionDigits: 0,
        maximumFractionDigits: dec,
      })
    : "0";

const fmtDate = (val: string) => {
  if (!val) return "";
  const d = new Date(val);
  if (isNaN(d.getTime())) return val;
  return `${String(d.getDate()).padStart(2, "0")}-${String(d.getMonth() + 1).padStart(2, "0")}-${d.getFullYear()}`;
};

// Badge Ngedit untuk kolom Nomor
const getNgeditClass = (item: MutasiRow) => {
  if (item.Ngedit === "WAIT") return "badge-wait";
  if (item.Ngedit === "TOLAK") return "badge-tolak";
  if (item.Ngedit === "ACC") return "badge-acc";
  return "";
};

const getNoPlanBadge = (item: MutasiRow & { NoPlanStatus?: string }) => {
  if (item.NoPlanStatus === "MINTA")
    return { text: "NO PLAN", cls: "badge-noplan-minta" };
  if (item.NoPlanStatus === "ACC")
    return { text: "NO PLAN ✓", cls: "badge-noplan-acc" };
  if (item.NoPlanStatus === "TOLAK")
    return { text: "NO PLAN ✕", cls: "badge-noplan-tolak" };
  return null;
};

// ── Delete ─────────────────────────────────────────────────────────────
const onDelete = async (item: MutasiRow) => {
  try {
    await mutasiProduksiService.deleteData(item.Nomor);
    toast.success(`Data ${item.Nomor} berhasil dihapus.`);
    delete detailCache.value[item.Nomor];
    clearSelection();
    await fetchData();
  } catch (err: any) {
    toast.error(err.response?.data?.message || "Gagal menghapus data.");
  }
};

// ── Pengajuan Ubah ─────────────────────────────────────────────────────
const showPengajuanUbahDialog = ref(false);
const pengajuanUbahForm = ref({ alasan: "", urut: 1 });
const pengajuanUbahNomor = ref("");
const isPengajuanLoading = ref(false);

const openPengajuanUbah = async () => {
  if (!selected.value.length) {
    toast.warning("Pilih data terlebih dahulu.");
    return;
  }
  const item = selected.value[0] as MutasiRow;

  // Cek hak edit
  if (!canEdit.value) {
    toast.error("Anda tidak punya hak untuk mengubah data ini.");
    return;
  }

  // Cek cabang
  if (userCab.value && userCab.value !== "HO-" && item.Cab !== userCab.value) {
    toast.error("Data tsb bukan cabang anda.");
    return;
  }

  // Setelah cek cabang, cek dulu apakah perlu pengajuan
  try {
    const cekRes = await mutasiProduksiService.cekPerluPengajuan(item.Nomor);
    const perlu = cekRes.data.data.perlu;

    if (!perlu) {
      // Belum melewati tutup buku → langsung bisa edit, tidak perlu pengajuan
      toast.info(
        "Tidak perlu pengajuan perubahan data. Silakan langsung ubah.",
      );
      router.push(
        `/garmen/mutasi-produksi/edit/${encodeURIComponent(item.Nomor)}`,
      );
      return;
    }

    // Perlu pengajuan → load urut & tampilkan form
    const res = await mutasiProduksiService.getPin5Status(
      item.Nomor,
      "MUTASI PRODUKSI",
    );
    const { urut, alasan } = res.data.data;
    pengajuanUbahNomor.value = item.Nomor;
    pengajuanUbahForm.value = { alasan, urut };
    showPengajuanUbahDialog.value = true;
  } catch {
    toast.error("Gagal memuat status pengajuan.");
  }
};

const submitPengajuanUbah = async () => {
  if (!pengajuanUbahForm.value.alasan?.trim()) {
    toast.warning("Alasan harus diisi.");
    return;
  }
  isPengajuanLoading.value = true;
  try {
    await mutasiProduksiService.pengajuanUbah(
      pengajuanUbahNomor.value,
      pengajuanUbahForm.value,
    );
    toast.success("Berhasil diajukkan. Nunggu ACC.");
    showPengajuanUbahDialog.value = false;
    await fetchData();
  } catch (err: any) {
    toast.error(err.response?.data?.message || "Gagal pengajuan.");
  } finally {
    isPengajuanLoading.value = false;
  }
};

// ── Pengajuan Hapus ────────────────────────────────────────────────────
const showPengajuanHapusDialog = ref(false);
const pengajuanHapusForm = ref({ alasan: "", urut: 1 });
const pengajuanHapusNomor = ref("");

const openPengajuanHapus = async () => {
  if (!selected.value.length) {
    toast.warning("Pilih data terlebih dahulu.");
    return;
  }
  const item = selected.value[0] as MutasiRow;

  if (!canDelete.value) {
    toast.error("Anda tidak punya hak untuk menghapus data ini.");
    return;
  }

  // Cek cabang
  if (userCab.value && userCab.value !== "HO-" && item.Cab !== userCab.value) {
    toast.error("Data tsb bukan cabang anda.");
    return;
  }

  try {
    const res = await mutasiProduksiService.getPin5Status(
      item.Nomor,
      "HAPUS MUTASI PRODUKSI",
    );
    const { urut, alasan } = res.data.data;
    pengajuanHapusNomor.value = item.Nomor;
    pengajuanHapusForm.value = { alasan, urut };
    showPengajuanHapusDialog.value = true;
  } catch {
    toast.error("Gagal memuat status pengajuan hapus.");
  }
};

const submitPengajuanHapus = async () => {
  if (!pengajuanHapusForm.value.alasan?.trim()) {
    toast.warning("Alasan harus diisi.");
    return;
  }
  isPengajuanLoading.value = true;
  try {
    await mutasiProduksiService.pengajuanHapus(
      pengajuanHapusNomor.value,
      pengajuanHapusForm.value,
    );
    toast.success("Berhasil diajukkan. Nunggu ACC.");
    showPengajuanHapusDialog.value = false;
    await fetchData();
  } catch (err: any) {
    toast.error(err.response?.data?.message || "Gagal pengajuan hapus.");
  } finally {
    isPengajuanLoading.value = false;
  }
};

// ── Export ─────────────────────────────────────────────────────────────
const isExporting = ref(false);
const isExportingDetail = ref(false);

const masterColumns: ExcelColumn[] = [
  { header: "Nomor", key: "Nomor", width: 16 },
  { header: "No LHK", key: "NoLHKProduksi", width: 16 },
  { header: "Cab", key: "Cab", width: 8 },
  { header: "Tanggal", key: "Tanggal", width: 12 },
  { header: "Asal", key: "Asal", width: 16 },
  { header: "Tujuan", key: "Tujuan", width: 16 },
  { header: "Keterangan", key: "Keterangan", width: 20 },
  { header: "SPK", key: "Spk", width: 16 },
  { header: "Nama SPK", key: "NamaSPK", width: 30 },
  {
    header: "Jumlah",
    key: "Jumlah",
    width: 10,
    align: "right",
    numFmt: "#,##0",
  },
  {
    header: "Jml SPK",
    key: "JmlSPK",
    width: 10,
    align: "right",
    numFmt: "#,##0",
  },
  { header: "Jadi", key: "Jadi", width: 10, align: "right", numFmt: "#,##0" },
  { header: "Kirim", key: "Kirim", width: 10, align: "right", numFmt: "#,##0" },
  { header: "Stat", key: "stat", width: 10 },
  {
    header: "Qty LHK",
    key: "QtyLhk",
    width: 10,
    align: "right",
    numFmt: "#,##0",
  },
  {
    header: "Qty Terpakai",
    key: "QtyTerpakai",
    width: 12,
    align: "right",
    numFmt: "#,##0.00",
  },
  { header: "Satuan", key: "Satuan", width: 8 },
  {
    header: "Babaran Standar",
    key: "BabaranStandar",
    width: 14,
    align: "right",
    numFmt: "#,##0.00",
  },
  {
    header: "Babaran Actual",
    key: "BabaranActual",
    width: 14,
    align: "right",
    numFmt: "#,##0.00",
  },
  {
    header: "Selisih Babaran",
    key: "SelisihBabaran",
    width: 14,
    align: "right",
    numFmt: "#,##0.00",
  },
  { header: "Approval", key: "Approval", width: 10, align: "center" },
  { header: "Alasan", key: "Alasan", width: 20 },
  { header: "User", key: "Usr", width: 10 },
];

const detailColumns: ExcelColumn[] = [
  { header: "Nomor", key: "Nomor", width: 16 },
  { header: "Kode", key: "Kode", width: 14 },
  { header: "Nama", key: "Nama", width: 30 },
  { header: "Satuan", key: "Satuan", width: 8 },
  { header: "Size", key: "Size", width: 10 },
  { header: "LHK", key: "Lhk", width: 10, align: "right", numFmt: "#,##0" },
  {
    header: "Jumlah",
    key: "Jumlah",
    width: 10,
    align: "right",
    numFmt: "#,##0",
  },
  {
    header: "BS Sablon",
    key: "BS_Sablon",
    width: 10,
    align: "right",
    numFmt: "#,##0",
  },
  {
    header: "BS Kain Sablon",
    key: "BS_Kain_Sablon",
    width: 14,
    align: "right",
    numFmt: "#,##0",
  },
  {
    header: "BS Kain",
    key: "BS_Kain",
    width: 10,
    align: "right",
    numFmt: "#,##0",
  },
  { header: "Ganti BS", key: "GantiBs", width: 10 },
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

const onExport = async () => {
  const rows = items.value ?? [];
  if (!rows.length) {
    toast.warning("Tidak ada data untuk diexport.");
    return;
  }
  isExporting.value = true;
  try {
    const title = `Mutasi Produksi — ${filterState.value.tglAwal} s.d. ${filterState.value.tglAkhir}`;
    await exportExcel(
      `MutasiProduksi_${filterState.value.tglAwal}_${filterState.value.tglAkhir}.xlsx`,
      [{ sheetName: "Mutasi Produksi", columns: masterColumns, rows, title }],
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
    const res = await mutasiProduksiService.getDetailByFilter({
      tglAwal: filterState.value.tglAwal,
      tglAkhir: filterState.value.tglAkhir,
      cab: filterState.value.cab,
      lini: filterState.value.lini,
    });
    const rows = res.data.data || [];
    if (!rows.length) {
      toast.warning("Tidak ada data detail untuk diexport.");
      return;
    }
    const title = `Detail Mutasi Produksi — ${filterState.value.tglAwal} s.d. ${filterState.value.tglAkhir}`;
    await exportExcel(
      `MutasiProduksiDetail_${filterState.value.tglAwal}_${filterState.value.tglAkhir}.xlsx`,
      [{ sheetName: "Detail", columns: detailColumns, rows, title }],
    );
    toast.success("Export detail berhasil.");
  } catch {
    toast.error("Gagal export detail Excel.");
  } finally {
    isExportingDetail.value = false;
  }
};

// ── Cetak ──────────────────────────────────────────────────────────────
const onCetak = () => {
  if (!selected.value.length) {
    toast.warning("Pilih data terlebih dahulu.");
    return;
  }
  const nomor = (selected.value[0] as MutasiRow).Nomor;
  window.open(
    `/garmen/mutasi-produksi/print?nomor=${encodeURIComponent(nomor)}`,
    "_blank",
  );
};

// ── Filter restore dari BaseBrowse sessionStorage ──────────────────────
const onFilterStateRestored = (saved: Record<string, any>) => {
  if (saved.tglAwal) filterState.value.tglAwal = saved.tglAwal;
  if (saved.tglAkhir) filterState.value.tglAkhir = saved.tglAkhir;
  if (saved.cab !== undefined) filterState.value.cab = saved.cab;
  if (saved.lini !== undefined) filterState.value.lini = saved.lini;
  if (saved.liniNama !== undefined) filterState.value.liniNama = saved.liniNama;
};

// ── Watch filter → re-fetch ────────────────────────────────────────────
let filterTimer: ReturnType<typeof setTimeout> | null = null;
watch(
  () => [
    filterState.value.tglAwal,
    filterState.value.tglAkhir,
    filterState.value.cab,
    filterState.value.lini,
  ],
  () => {
    if (filterTimer) clearTimeout(filterTimer);
    filterTimer = setTimeout(() => fetchData(), 400);
  },
);

// ── Lifecycle ──────────────────────────────────────────────────────────
onMounted(async () => {
  await loadLookups();
  await fetchData();
});
</script>

<template>
  <BaseBrowse
    title="Mutasi Produksi"
    menu-id="109"
    :icon="IconBuildingFactory2"
    :headers="headers"
    :items="items ?? []"
    :is-loading="isLoading"
    item-value="Nomor"
    :can-insert="canInsert"
    :can-edit="canEdit"
    :can-delete="canDelete"
    :can-export="canExport"
    :show-expand="true"
    :expanded="expanded"
    :selected="selected"
    :row-props-fn="rowPropsFn"
    :filter-state="filterState"
    search-placeholder="Cari nomor, SPK, keterangan..."
    @refresh="fetchData"
    @add="router.push('/garmen/mutasi-produksi/create')"
    @edit="
      (item) =>
        router.push(
          `/garmen/mutasi-produksi/edit/${encodeURIComponent(item.Nomor)}`,
        )
    "
    @delete="onDelete"
    @export="onExport"
    @update:expanded="onUpdateExpanded"
    @update:selected="(val) => (selected = val)"
    @update:filter-state="onFilterStateRestored"
  >
    <!-- ── Filter bar ── -->
    <template #filter-left>
      <!-- Periode -->
      <div class="f-grp">
        <label class="f-lbl">Dari</label>
        <input type="date" v-model="filterState.tglAwal" class="f-date" />
      </div>
      <div class="f-grp">
        <label class="f-lbl">S/D</label>
        <input type="date" v-model="filterState.tglAkhir" class="f-date" />
      </div>

      <!-- Cabang -->
      <div class="f-grp">
        <label class="f-lbl">Cabang</label>
        <select v-model="filterState.cab" class="f-date" style="width: 80px">
          <option v-for="c in cabangOptions" :key="c" :value="c">
            {{ c }}
          </option>
        </select>
      </div>

      <!-- Lini / Gudang Asal -->
      <div class="f-grp">
        <label class="f-lbl">Lini</label>
        <div class="f-inp-grp">
          <input
            :value="filterState.lini"
            readonly
            class="f-inp"
            style="width: 70px; cursor: pointer"
            placeholder="Semua"
            @click="showLiniModal = true"
          />
          <input
            :value="filterState.liniNama"
            readonly
            class="f-inp f-ro"
            style="width: 160px"
          />
          <button class="f-btn-icon" @click="showLiniModal = true">
            <IconSearch :size="13" color="#1565c0" />
          </button>
          <button v-if="filterState.lini" class="f-btn-icon" @click="clearLini">
            ✕
          </button>
        </div>
      </div>
    </template>

    <!-- ── Extra actions ── -->
    <template #extra-actions="{ selected: sel }">
      <!-- Pengajuan Ubah -->
      <v-btn
        v-if="canEdit"
        size="small"
        color="orange-darken-3"
        :disabled="!sel.length"
        @click="openPengajuanUbah"
      >
        <template #prepend>
          <IconSend :size="15" :stroke-width="1.7" />
        </template>
        Pengajuan Ubah
      </v-btn>

      <!-- Pengajuan Hapus -->
      <v-btn
        v-if="canDelete"
        size="small"
        color="red-darken-3"
        :disabled="!sel.length"
        @click="openPengajuanHapus"
      >
        <template #prepend>
          <IconTrash :size="15" :stroke-width="1.7" />
        </template>
        Pengajuan Hapus
      </v-btn>

      <!-- Cetak -->
      <v-btn
        size="small"
        color="grey-darken-2"
        :disabled="!sel.length"
        @click="onCetak"
      >
        <template #prepend>
          <IconPrinter :size="15" :stroke-width="1.7" />
        </template>
        Cetak
      </v-btn>

      <!-- Export Detail -->
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
    </template>

    <!-- ── Kolom custom: Nomor dengan badge Ngedit ── -->
    <template #item.Nomor="{ item }">
      <div style="display: flex; align-items: center; gap: 4px">
        <span :class="getNgeditClass(item)">{{ item.Nomor }}</span>
        <span
          v-if="getNoPlanBadge(item)"
          :class="getNoPlanBadge(item)!.cls"
          class="badge-noplan"
        >
          {{ getNoPlanBadge(item)!.text }}
        </span>
      </div>
    </template>

    <!-- Tanggal format -->
    <template #item.Tanggal="{ item }">{{ fmtDate(item.Tanggal) }}</template>
    <template #item.TglSPK="{ item }">{{ fmtDate(item.TglSPK) }}</template>

    <!-- Angka desimal -->
    <template #item.Jumlah="{ item }">{{ num(item.Jumlah, 0) }}</template>
    <template #item.JmlSPK="{ item }">{{ num(item.JmlSPK, 0) }}</template>
    <template #item.Jadi="{ item }">{{ num(item.Jadi, 0) }}</template>
    <template #item.Kirim="{ item }">{{ num(item.Kirim, 0) }}</template>
    <template #item.QtyLhk="{ item }">{{ num(item.QtyLhk, 0) }}</template>
    <template #item.QtyTerpakai="{ item }">{{
      num(item.QtyTerpakai, 2)
    }}</template>
    <template #item.BabaranStandar="{ item }">{{
      num(item.BabaranStandar, 2)
    }}</template>
    <template #item.BabaranActual="{ item }">{{
      num(item.BabaranActual, 2)
    }}</template>
    <template #item.SelisihBabaran="{ item }">
      <span
        :style="
          Number(item.SelisihBabaran) < 0 ? 'color:#c62828;font-weight:700' : ''
        "
      >
        {{ num(item.SelisihBabaran, 2) }}
      </span>
    </template>

    <!-- Stat badge -->
    <template #item.stat="{ item }">
      <span :class="item.stat === 'Selesai' ? 'badge-selesai' : 'badge-proses'">
        {{ item.stat }}
      </span>
    </template>

    <!-- ── Expanded detail ── -->
    <template #detail="{ item }">
      <div v-if="loadingDetails.has(item.Nomor)" class="det-loading">
        <v-progress-circular indeterminate size="18" color="primary" />
        <span>Memuat...</span>
      </div>
      <template v-else-if="detailCache[item.Nomor]?.length">
        <table class="det-table">
          <thead>
            <tr>
              <th>No</th>
              <th>Kode</th>
              <th>Nama</th>
              <th>Satuan</th>
              <th>Size</th>
              <th class="tr">LHK</th>
              <th class="tr">Jumlah</th>
              <th class="tr">BS Sablon</th>
              <th class="tr">BS Kain Sbl</th>
              <th class="tr">BS Kain</th>
              <th>Ganti BS</th>
              <th class="tr">Panjang</th>
              <th class="tr">Lebar</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(row, idx) in detailCache[item.Nomor]" :key="idx">
              <td class="tc">{{ idx + 1 }}</td>
              <td class="td-kode">{{ row.Kode }}</td>
              <td>{{ row.Nama }}</td>
              <td class="tc">{{ row.Satuan }}</td>
              <td>{{ row.Size }}</td>
              <td class="tr">{{ num(row.Lhk, 0) }}</td>
              <td class="tr">{{ num(row.Jumlah, 0) }}</td>
              <td class="tr">{{ num(row.BS_Sablon, 0) }}</td>
              <td class="tr">{{ num(row.BS_Kain_Sablon, 0) }}</td>
              <td class="tr">{{ num(row.BS_Kain, 0) }}</td>
              <td>{{ row.GantiBs }}</td>
              <td class="tr">{{ num(row.Panjang, 2) }}</td>
              <td class="tr">{{ num(row.Lebar, 2) }}</td>
            </tr>
          </tbody>
        </table>
      </template>
      <div v-else class="det-empty">Tidak ada detail</div>
    </template>

    <!-- ── Legend di filter-right ── -->
    <template #filter-right>
      <div class="legend-wrap">
        <span class="legend-lbl">Font:</span>
        <span class="legend-item" style="color: #d32f2f">● Perlu Approval</span>
        <span class="legend-item" style="color: #1565c0">● Sudah Approval</span>
        <span class="legend-item" style="color: #9e9e9e">● Diajukan Hapus</span>
        <span class="ml-2 legend-lbl">Ngedit:</span>
        <span class="badge-wait">WAIT</span>
        <span class="badge-acc">ACC</span>
        <span class="badge-tolak">TOLAK</span>
        <span class="ml-2 legend-lbl">Planning:</span>
        <span class="badge-noplan badge-noplan-minta">NO PLAN</span>
      </div>
    </template>
  </BaseBrowse>

  <!-- ── Modal Pilih Lini ── -->
  <v-dialog v-model="showLiniModal" max-width="480px">
    <v-card class="rounded-lg">
      <v-card-title
        class="bg-primary text-white pa-3"
        style="font-size: 13px; font-weight: 700"
      >
        Pilih Lini / Gudang Produksi
      </v-card-title>
      <v-card-text class="pa-3">
        <input
          v-model="liniSearch"
          type="text"
          class="lini-search"
          placeholder="Cari kode atau nama..."
          autofocus
        />
        <div class="lini-list">
          <div
            class="lini-item"
            :class="{ active: !filterState.lini }"
            @click="
              clearLini();
              showLiniModal = false;
            "
          >
            <span class="lini-kode" style="color: #9e9e9e">—</span>
            <span style="color: #9e9e9e">Semua</span>
          </div>
          <div
            v-for="g in filteredGudang"
            :key="g.Kode"
            class="lini-item"
            :class="{ active: filterState.lini === g.Kode }"
            @click="selectLini(g)"
          >
            <span class="lini-kode">{{ g.Kode }}</span>
            <span>{{ g.Nama }}</span>
          </div>
          <div v-if="!filteredGudang.length" class="lini-empty">
            Tidak ada gudang ditemukan
          </div>
        </div>
      </v-card-text>
      <v-card-actions class="pa-3 border-t">
        <v-spacer />
        <v-btn variant="text" @click="showLiniModal = false">Tutup</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <!-- ── Dialog Pengajuan Ubah ── -->
  <v-dialog v-model="showPengajuanUbahDialog" max-width="420px" persistent>
    <v-card class="rounded-lg">
      <v-card-title
        class="bg-orange-darken-2 text-white pa-3 d-flex align-center"
        style="font-size: 13px; font-weight: 700"
      >
        <IconSend :size="15" class="mr-2" />
        Pengajuan Ubah Data
        <v-spacer />
        <span style="font-size: 11px; opacity: 0.8">{{
          pengajuanUbahNomor
        }}</span>
      </v-card-title>
      <v-card-text class="pa-4">
        <div
          style="
            font-size: 11px;
            font-weight: 600;
            color: #555;
            margin-bottom: 6px;
          "
        >
          Alasan Pengajuan:
        </div>
        <textarea
          v-model="pengajuanUbahForm.alasan"
          class="alasan-area"
          rows="3"
          placeholder="Masukkan alasan pengajuan ubah..."
          autofocus
        />
      </v-card-text>
      <v-card-actions class="pa-3 border-t">
        <v-btn variant="text" @click="showPengajuanUbahDialog = false"
          >Batal</v-btn
        >
        <v-spacer />
        <v-btn
          variant="flat"
          color="orange-darken-2"
          :loading="isPengajuanLoading"
          @click="submitPengajuanUbah"
        >
          Kirim Pengajuan
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <!-- ── Dialog Pengajuan Hapus ── -->
  <v-dialog v-model="showPengajuanHapusDialog" max-width="420px" persistent>
    <v-card class="rounded-lg">
      <v-card-title
        class="bg-red-darken-2 text-white pa-3 d-flex align-center"
        style="font-size: 13px; font-weight: 700"
      >
        <IconTrash :size="15" class="mr-2" />
        Pengajuan Hapus Data
        <v-spacer />
        <span style="font-size: 11px; opacity: 0.8">{{
          pengajuanHapusNomor
        }}</span>
      </v-card-title>
      <v-card-text class="pa-4">
        <div
          style="
            font-size: 11px;
            font-weight: 600;
            color: #555;
            margin-bottom: 6px;
          "
        >
          Alasan Pengajuan Hapus:
        </div>
        <textarea
          v-model="pengajuanHapusForm.alasan"
          class="alasan-area"
          rows="3"
          placeholder="Masukkan alasan pengajuan hapus..."
          autofocus
        />
      </v-card-text>
      <v-card-actions class="pa-3 border-t">
        <v-btn variant="text" @click="showPengajuanHapusDialog = false"
          >Batal</v-btn
        >
        <v-spacer />
        <v-btn
          variant="flat"
          color="red-darken-2"
          :loading="isPengajuanLoading"
          @click="submitPengajuanHapus"
        >
          Kirim Pengajuan
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style scoped>
/* Filter */
.f-grp {
  display: flex;
  align-items: center;
  gap: 6px;
}
.f-lbl {
  font-size: 11px;
  font-weight: 600;
  color: #555;
  white-space: nowrap;
}
.f-date {
  height: 30px;
  border: 1px solid #ccc;
  border-radius: 4px;
  padding: 0 6px;
  font-size: 12px;
  background: white;
  outline: none;
}
.f-date:focus {
  border-color: #1565c0;
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

/* Legend */
.legend-wrap {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 11px;
  flex-wrap: wrap;
}
.legend-lbl {
  font-weight: 600;
  color: #888;
}
.legend-item {
  font-size: 11px;
}
.ml-2 {
  margin-left: 8px;
}

/* Badge */
.badge-wait {
  background: #1565c0;
  color: white;
  padding: 1px 7px;
  border-radius: 3px;
  font-size: 10px;
  font-weight: 700;
}
.badge-acc {
  background: #2e7d32;
  color: white;
  padding: 1px 7px;
  border-radius: 3px;
  font-size: 10px;
  font-weight: 700;
}
.badge-tolak {
  background: #c62828;
  color: white;
  padding: 1px 7px;
  border-radius: 3px;
  font-size: 10px;
  font-weight: 700;
}
.badge-noplan {
  padding: 1px 6px;
  border-radius: 3px;
  font-size: 9px;
  font-weight: 700;
  white-space: nowrap;
}
.badge-noplan-minta {
  background: #fff3e0;
  color: #e65100;
  border: 1px solid #ffcc80;
}
.badge-noplan-acc {
  background: #e8f5e9;
  color: #2e7d32;
  border: 1px solid #a5d6a7;
}
.badge-noplan-tolak {
  background: #ffebee;
  color: #c62828;
  border: 1px solid #ef9a9a;
}
.badge-selesai {
  background: #e8f5e9;
  color: #2e7d32;
  padding: 1px 6px;
  border-radius: 10px;
  font-size: 10px;
  font-weight: 700;
}
.badge-proses {
  background: #e3f2fd;
  color: #1565c0;
  padding: 1px 6px;
  border-radius: 10px;
  font-size: 10px;
  font-weight: 700;
}

/* Detail table */
.det-loading {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  font-size: 12px;
  color: #555;
}
.det-empty {
  padding: 10px 16px;
  font-size: 11px;
  color: #9e9e9e;
  font-style: italic;
}
.det-table {
  border-collapse: collapse;
  font-size: 11px;
  min-width: max-content;
}
.det-table th {
  background: #1565c0;
  color: white;
  padding: 4px 7px;
  font-weight: 700;
  white-space: nowrap;
}
.det-table td {
  padding: 3px 7px;
  border-bottom: 1px solid #e0e0e0;
  white-space: nowrap;
}
.det-table tbody tr:nth-of-type(even) td {
  background: #f5f5f5;
}
.det-table tbody tr:hover td {
  background: #e3f2fd !important;
}
.tc {
  text-align: center;
}
.tr {
  text-align: right;
}
.td-kode {
  font-weight: 600;
  color: #1565c0;
  font-family: monospace;
  font-size: 10px;
}

/* Modal Lini */
.lini-search {
  width: 100%;
  height: 30px;
  border: 1px solid #bdbdbd;
  border-radius: 4px;
  padding: 0 8px;
  font-size: 12px;
  outline: none;
  margin-bottom: 8px;
  box-sizing: border-box;
}
.lini-search:focus {
  border-color: #1565c0;
}
.lini-list {
  max-height: 300px;
  overflow-y: auto;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
}
.lini-item {
  display: flex;
  gap: 10px;
  padding: 7px 10px;
  cursor: pointer;
  font-size: 12px;
  border-bottom: 1px solid #f5f5f5;
  transition: background 0.1s;
}
.lini-item:hover {
  background: #e3f2fd;
}
.lini-item.active {
  background: #1565c0;
  color: white;
}
.lini-kode {
  font-weight: 700;
  width: 70px;
  flex-shrink: 0;
  font-family: monospace;
}
.lini-empty {
  padding: 16px;
  text-align: center;
  color: #9e9e9e;
  font-size: 11px;
}

/* Dialog Pengajuan */
.alasan-area {
  width: 100%;
  border: 1px solid #bdbdbd;
  border-radius: 4px;
  padding: 6px 8px;
  font-size: 12px;
  outline: none;
  resize: none;
  box-sizing: border-box;
  font-family: inherit;
}
.alasan-area:focus {
  border-color: #1565c0;
}
</style>
