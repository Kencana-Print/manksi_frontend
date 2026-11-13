<script setup lang="ts">
import { ref, computed, onMounted, onActivated, watch } from "vue";
import { isAxiosError } from "axios";
import { useToast } from "vue-toastification";
import { useRouter } from "vue-router";
import { useAuthStore } from "@/stores/authStore";
import BaseBrowse from "@/components/BaseBrowse.vue";
import NumberInputIDR from "@/components/NumberInputIDR.vue";
import {
  IconCash,
  IconSend,
  IconPrinter,
  IconSignature,
  IconCashBanknote,
  IconCheck,
  IconBan,
  IconChecklist,
} from "@tabler/icons-vue";
import {
  pettyCashService,
  type PettyCashRow,
  type InfoLaci,
  type PenyerahanPayload,
} from "@/services/pembelian/pettyCashService";
import { uangMukaService } from "@/services/pembelian/uangMukaService";
import { uangMukaPenyelesaianFormService } from "@/services/pembelian/uangMukaPenyelesaianFormService";

const toast = useToast();
const router = useRouter();
const authStore = useAuthStore();

const padDate = (n: number) => String(n).padStart(2, "0");
const toLocalDate = (d: Date) =>
  `${d.getFullYear()}-${padDate(d.getMonth() + 1)}-${padDate(d.getDate())}`;
const today = new Date();
const todayStr = toLocalDate(today);
// Mundur 3 bulan: PC DIAJUKAN yang belum direalisasi tidak boleh hilang dari layar
const startDefault = toLocalDate(
  new Date(today.getFullYear(), today.getMonth(), 1),
);

const STATUS_LABEL: Record<
  string,
  { label: string; color: string; bg: string }
> = {
  DIAJUKAN: { label: "Diajukan", color: "#e65100", bg: "#fff3e0" },
  REALISASI: { label: "Realisasi", color: "#2e7d32", bg: "#e8f5e9" },
  DITOLAK: { label: "Ditolak", color: "#c62828", bg: "#ffebee" },
  BATAL: { label: "Batal", color: "#616161", bg: "#f5f5f5" },
};
const STATUS_FILTER = ["ALL", "DIAJUKAN", "REALISASI", "DITOLAK", "BATAL"];

const filters = ref({
  dtAwal: startDefault,
  dtAkhir: todayStr,
  status: "ALL",
});

const items = ref<PettyCashRow[]>([]);
const selected = ref<PettyCashRow[]>([]);
const isLoading = ref(false);

const errMsg = (e: unknown, fallback: string): string =>
  (isAxiosError<{ message?: string }>(e) && e.response?.data?.message) ||
  fallback;

// ── Tipe & helper tab Outstanding / Penyerahan ──
interface OutstandingBase {
  Sumber: string;
  Nomor: string;
  Tanggal: string;
  Keterangan: string;
  Pemohon: string;
  Bagian: string;
  Cabang: string;
  Nominal: number | string;
}
type OutstandingRow = OutstandingBase & { RowKey: string };

// Nama field rincian beda per sumber; dinormalkan lewat normDetail
interface OutstandingDetailRaw {
  ItemNourut: number;
  Nama: string;
  Kode?: string;
  Invoice?: string;
  Satuan?: string;
  Qty?: number | string;
  QtyPengajuan?: number | string;
  Nominal?: number | string;
  RpPengajuan?: number | string;
}
interface DetailView {
  kode: string;
  nama: string;
  satuan: string;
  qty: number;
  nominal: number;
}
const normDetail = (sumber: string, d: OutstandingDetailRaw): DetailView => {
  const dana = sumber === "PENGAJUAN_DANA";
  return {
    kode: d.Invoice || d.Kode || "",
    nama: d.Nama,
    satuan: d.Satuan || "",
    qty: Number(dana ? d.QtyPengajuan : d.Qty) || 0,
    nominal: Number(dana ? d.RpPengajuan : d.Nominal) || 0,
  };
};

const SUMBER_META: Record<string, { label: string; color: string }> = {
  PENGAJUAN_DANA: { label: "Pengajuan Dana", color: "blue" },
  PERMINTAAN_PEMBELIAN: { label: "Permintaan Pembelian", color: "orange" },
  INSENTIF: { label: "Insentif", color: "purple" },
  PO_LAIN_LAIN: { label: "PO Lain-lain", color: "teal" },
};
const sumberLabel = (v: string) => SUMBER_META[v]?.label ?? v;
const sumberColor = (v: string) => SUMBER_META[v]?.color ?? "grey";

interface PdHistoryRow {
  Nomor: string; // nomor bon
  PumNomor: string; // nomor PD
  Tanggal: string;
  NamaAccount: string;
  Penerima: string;
  Nominal: number;
  Terpakai: number;
  Sisa: number;
  Keterangan: string;
  Selesai: string;
  UserDibuat: string;
}
interface PdPenyelesaianRow {
  pjh?: string;
  pjh_link?: string;
  uraian: string;
  satuan: string;
  qty_minta: number;
  qty: number;
  harga: number;
  total: number;
}
interface PdPenyelesaianView {
  detail: PdPenyelesaianRow[];
}
interface SerahkanItem {
  Sumber: string;
  NomorHeader: string;
  ItemNourut: number;
  Nama: string;
  Satuan: string;
  Qty: number;
  Keterangan: string;
  NominalSumber: number;
}

const fetchData = async () => {
  isLoading.value = true;
  try {
    const res = await pettyCashService.getBrowse({
      startDate: filters.value.dtAwal,
      endDate: filters.value.dtAkhir,
    });
    items.value = res.data;
    selected.value = [];
  } catch (e) {
    toast.error(errMsg(e, "Gagal memuat Petty Cash."));
  } finally {
    isLoading.value = false;
  }
};

const filteredItems = computed(() =>
  filters.value.status === "ALL"
    ? items.value
    : items.value.filter((r) => r.Status === filters.value.status),
);

// ── Tab ──
const activeTab = ref<"pengajuan" | "outstanding" | "penyerahan">("pengajuan");

const userBagian = computed(() => (authStore.user?.bagian || "").toUpperCase());
// Mengikuti aturan tab Outstanding di Uang Muka (hanya tampilan; route dijaga hak menu 973)
const USER_AKSES_PENUH = ["ADMIN", "NANDA", "LIA"];
const canSeeOutstanding = computed(
  () =>
    USER_AKSES_PENUH.includes((authStore.user?.kode || "").toUpperCase()) ||
    ["PEMBELIAN", "EDP", "AUDIT"].includes(userBagian.value),
);

// ── Tab Outstanding ──
const outstandingItems = ref<OutstandingRow[]>([]);
const selectedOutstanding = ref<OutstandingRow[]>([]);
const expandedOutstanding = ref<OutstandingRow[]>([]);
const outstandingDetailCache = ref<Record<string, DetailView[]>>({});
const outstandingDetailLoading = ref<Record<string, boolean>>({});

const fetchOutstanding = async () => {
  isLoading.value = true;
  try {
    const res = await uangMukaService.getOutstandingPetty({
      startDate: filters.value.dtAwal,
      endDate: filters.value.dtAkhir,
    });
    outstandingItems.value = (res.data.items as OutstandingBase[]).map((r) => ({
      ...r,
      RowKey: `${r.Sumber}-${r.Nomor}`,
    }));
    selectedOutstanding.value = [];
    expandedOutstanding.value = [];
    outstandingDetailCache.value = {};
  } catch (e) {
    toast.error(errMsg(e, "Gagal memuat data outstanding."));
  } finally {
    isLoading.value = false;
  }
};

const onUpdateExpandedOutstanding = async (baru: OutstandingRow[]) => {
  expandedOutstanding.value = baru;
  const belum = baru.filter(
    (it) =>
      !outstandingDetailCache.value[it.RowKey] &&
      !outstandingDetailLoading.value[it.RowKey],
  );
  for (const it of belum) {
    outstandingDetailLoading.value[it.RowKey] = true;
    try {
      const res = await uangMukaService.getOutstandingPettyDetail(
        it.Sumber,
        it.Nomor,
      );
      outstandingDetailCache.value[it.RowKey] = (
        res.data as OutstandingDetailRaw[]
      ).map((d) => normDetail(it.Sumber, d));
    } catch (e) {
      toast.error(errMsg(e, `Gagal memuat detail ${it.Nomor}`));
    } finally {
      outstandingDetailLoading.value[it.RowKey] = false;
    }
  }
};

// ── Tab Penyerahan Dana Belanja ──
const pdItems = ref<PdHistoryRow[]>([]);
const selectedPd = ref<PdHistoryRow[]>([]);
const expandedPd = ref<PdHistoryRow[]>([]);
const pdDetailCache = ref<Record<string, PdPenyelesaianView | null>>({});
const pdDetailLoading = ref<Record<string, boolean>>({});

const fetchPenyerahan = async () => {
  isLoading.value = true;
  try {
    const res = await uangMukaService.getHistoryPetty({
      startDate: filters.value.dtAwal,
      endDate: filters.value.dtAkhir,
    });
    pdItems.value = res.data as PdHistoryRow[];
    selectedPd.value = [];
    expandedPd.value = [];
    pdDetailCache.value = {};
  } catch (e) {
    toast.error(errMsg(e, "Gagal memuat Penyerahan Dana Belanja."));
  } finally {
    isLoading.value = false;
  }
};

const onUpdateExpandedPd = async (baru: PdHistoryRow[]) => {
  expandedPd.value = baru;
  const belum = baru.filter(
    (it) =>
      !(it.Nomor in pdDetailCache.value) && !pdDetailLoading.value[it.Nomor],
  );
  for (const it of belum) {
    pdDetailLoading.value[it.Nomor] = true;
    try {
      pdDetailCache.value[it.Nomor] =
        await uangMukaPenyelesaianFormService.getFormData(it.Nomor, true);
    } catch (e) {
      toast.error(errMsg(e, `Gagal memuat detail ${it.Nomor}`));
      pdDetailCache.value[it.Nomor] = null;
    } finally {
      pdDetailLoading.value[it.Nomor] = false;
    }
  }
};

const fetchActiveTab = () => {
  if (activeTab.value === "pengajuan") fetchData();
  else if (activeTab.value === "outstanding") fetchOutstanding();
  else fetchPenyerahan();
};

watch(() => [filters.value.dtAwal, filters.value.dtAkhir], fetchActiveTab);
watch(activeTab, fetchActiveTab);
onMounted(fetchActiveTab);
onActivated(fetchActiveTab);

const numFmt = (v: number | string | null | undefined) =>
  v != null ? Number(v).toLocaleString("id-ID") : "0";
const tglFmt = (v: string | null | undefined) => {
  if (!v) return "-";
  const d = new Date(v);
  if (isNaN(d.getTime())) return v;
  return `${padDate(d.getDate())}/${padDate(d.getMonth() + 1)}/${d.getFullYear()}`;
};

const headers = [
  { title: "Nomor", key: "Nomor", width: "140px" },
  { title: "Tanggal", key: "Tanggal", width: "100px", align: "center" },
  { title: "Status", key: "Status", width: "110px", align: "center" },
  { title: "Validasi", key: "ValAksi", width: "90px", align: "center" },
  { title: "Keterangan", key: "Keterangan", minWidth: "200px" },
  { title: "Alasan Tolak", key: "AlasanTolak", minWidth: "150px" },
  { title: "Nominal", key: "Nominal", width: "120px", align: "right" },
  { title: "Laci Tujuan", key: "LaciNama", width: "130px" },
  { title: "Sumber Dana", key: "LaciAsal", width: "110px" },
  { title: "Direalisasi Oleh", key: "UserRealisasi", width: "120px" },
  {
    title: "Tgl Realisasi",
    key: "TglRealisasi",
    width: "100px",
    align: "center",
  },
  { title: "Terima", key: "KonfirmasiStatus", width: "80px", align: "center" },
  { title: "Dibuat Oleh", key: "UserCreate", width: "100px" },
];

// ── Cetak & Validasi: memakai halaman print pengajuan yang sama dengan Uang Muka ──
const bukaPrint = (mode: "cetak" | "layar") => {
  const r = selected.value[0];
  if (!r) return;
  const q = mode === "layar" ? "?mode=layar" : "";
  window.open(
    `/pembelian/uang-muka/print-pengajuan/${encodeURIComponent(r.Nomor)}${q}`,
    "_blank",
  );
};
const bisaValidasi = computed(() => {
  const r = selected.value[0];
  return !!r && r.Status === "DIAJUKAN" && r.ValAksi !== "VALIDASI";
});

// ── Realisasi & Konfirmasi Terima ──
const bisaRealisasi = computed(() => selected.value[0]?.Status === "DIAJUKAN");
const goRealisasi = () => {
  const r = selected.value[0];
  if (!r) return;
  router.push(`/pembelian/petty-cash/realisasi/${encodeURIComponent(r.Nomor)}`);
};

const isConfirming = ref(false);
// Laci tujuan = laci pembuat PC, jadi penerima = UserCreate (server tetap memverifikasi pemilik laci)
const bisaKonfirmasiTerima = computed(() => {
  const r = selected.value[0];
  return (
    !!r &&
    r.KonfirmasiStatus === "BELUM" &&
    r.UserCreate.toUpperCase() === (authStore.user?.kode || "").toUpperCase()
  );
});
const onKonfirmasiTerima = async () => {
  const r = selected.value[0];
  if (!r) return;
  isConfirming.value = true;
  try {
    await pettyCashService.konfirmasiTerima(r.Nomor);
    toast.success(`Penerimaan ${r.Nomor} dikonfirmasi.`);
    await fetchData();
  } catch (e) {
    toast.error(errMsg(e, "Gagal mengonfirmasi penerimaan."));
  } finally {
    isConfirming.value = false;
  }
};

// ── Dialog Ajukan ──
const showAjukan = ref(false);
const ajukanTanggal = ref(todayStr);
const ajukanKeterangan = ref("");
const ajukanNominal = ref(0);
const infoLaci = ref<InfoLaci | null>(null);
const isLoadingLaci = ref(false);
const isSubmitting = ref(false);

// Hanya informasi: batas 20 jt mengikat saat pengaju = perealisasi (dicek di Realisasi)
const melebihiBatasMandiri = computed(
  () =>
    !!infoLaci.value &&
    infoLaci.value.saldo + ajukanNominal.value > infoLaci.value.batas,
);

const openAjukan = async () => {
  isLoadingLaci.value = true;
  try {
    const res = await pettyCashService.getInfoLaci();
    infoLaci.value = res.data;
    if (!res.data.kode) {
      toast.warning("Anda belum punya laci kas. Hubungi Finance.");
      isLoadingLaci.value = false;
      return;
    }
  } catch (e) {
    toast.error(errMsg(e, "Gagal memuat laci Anda."));
    isLoadingLaci.value = false;
    return;
  }
  isLoadingLaci.value = false;
  ajukanTanggal.value = todayStr;
  ajukanKeterangan.value = "";
  ajukanNominal.value = 0;
  showAjukan.value = true;
};

const submitAjukan = async () => {
  if (!ajukanNominal.value || ajukanNominal.value <= 0) {
    toast.warning("Nominal harus diisi.");
    return;
  }
  if (!ajukanKeterangan.value.trim()) {
    toast.warning("Keterangan harus diisi.");
    return;
  }
  isSubmitting.value = true;
  try {
    const res = await pettyCashService.create({
      tanggal: ajukanTanggal.value,
      keterangan: ajukanKeterangan.value.trim(),
      nominal: ajukanNominal.value,
    });
    toast.success(`Petty Cash ${res.data.nomor} berhasil diajukan.`);
    showAjukan.value = false;
    await fetchData();
  } catch (e) {
    toast.error(errMsg(e, "Gagal mengajukan Petty Cash."));
  } finally {
    isSubmitting.value = false;
  }
};

// ── Dialog Penyerahan Dana Belanja ──
const showSerahkan = ref(false);
const serahkanTanggal = ref(todayStr);
const serahkanKeterangan = ref("");
const serahkanNominal = ref(0);
const serahkanItems = ref<SerahkanItem[]>([]);
const isLoadingSerahkan = ref(false);
const isSubmittingSerahkan = ref(false);
const showSerahkanPrint = ref(false);
const savedPdNomor = ref("");

const serahkanTotalSumber = computed(() =>
  serahkanItems.value.reduce((s, r) => s + r.NominalSumber, 0),
);
// Cek klien saja; server memeriksa ulang dengan kunci laci
const melebihiTersedia = computed(
  () => !!infoLaci.value && serahkanNominal.value > infoLaci.value.tersedia,
);

const openSerahkan = async () => {
  if (!selectedOutstanding.value.length) return;
  isLoadingSerahkan.value = true;
  try {
    const laci = await pettyCashService.getInfoLaci();
    if (!laci.data.kode) {
      toast.warning("Anda belum punya laci kas. Hubungi Finance.");
      return;
    }
    infoLaci.value = laci.data;
    const hasil = await Promise.all(
      selectedOutstanding.value.map(async (h) => {
        const res = await uangMukaService.getOutstandingPettyDetail(
          h.Sumber,
          h.Nomor,
        );
        return { header: h, rows: res.data as OutstandingDetailRaw[] };
      }),
    );
    serahkanItems.value = hasil.flatMap(({ header, rows }) =>
      rows.map((d) => {
        const v = normDetail(header.Sumber, d);
        return {
          Sumber: header.Sumber,
          NomorHeader: header.Nomor,
          ItemNourut: d.ItemNourut,
          Nama: v.nama,
          Satuan: v.satuan,
          Qty: v.qty,
          Keterangan: header.Keterangan,
          NominalSumber: v.nominal,
        };
      }),
    );
    if (!serahkanItems.value.length) {
      toast.warning(
        "Tidak ada item tersisa pada transaksi terpilih. Muat ulang daftar.",
      );
      return;
    }
    serahkanTanggal.value = todayStr;
    serahkanKeterangan.value = "";
    // Default = total nominal sumber; Purchasing boleh mengubah
    serahkanNominal.value = serahkanTotalSumber.value;
    showSerahkan.value = true;
  } catch (e) {
    toast.error(errMsg(e, "Gagal memuat rincian item."));
  } finally {
    isLoadingSerahkan.value = false;
  }
};

const submitSerahkan = async () => {
  if (!serahkanNominal.value || serahkanNominal.value <= 0) {
    toast.warning("Nominal harus diisi.");
    return;
  }
  if (melebihiTersedia.value) {
    toast.warning("Nominal melebihi dana tersedia di laci.");
    return;
  }
  isSubmittingSerahkan.value = true;
  try {
    const payload: PenyerahanPayload = {
      tanggal: serahkanTanggal.value,
      keterangan: serahkanKeterangan.value.trim(),
      nominal: serahkanNominal.value,
      items: serahkanItems.value.map((r) => ({
        sumber: r.Sumber,
        nomorHeader: r.NomorHeader,
        itemNourut: r.ItemNourut,
        nama: r.Nama,
        satuan: r.Satuan,
        qty: r.Qty,
        keterangan: r.Keterangan,
        nominalAsli: r.NominalSumber,
      })),
    };
    const res = await pettyCashService.createPenyerahan(payload);
    toast.success(`Penyerahan Dana Belanja ${res.data.nomor} berhasil dibuat.`);
    showSerahkan.value = false;
    savedPdNomor.value = res.data.nomor;
    showSerahkanPrint.value = true;
    await fetchOutstanding();
  } catch (e) {
    toast.error(errMsg(e, "Gagal membuat Penyerahan Dana Belanja."));
  } finally {
    isSubmittingSerahkan.value = false;
  }
};

const cetakPenyerahanBaru = () => {
  window.open(
    `/pembelian/uang-muka/print-penyerahan/${encodeURIComponent(savedPdNomor.value)}`,
    "_blank",
  );
  showSerahkanPrint.value = false;
};

// ── Aksi tab Penyerahan ──
const cetakPd = (jenis: "penyerahan" | "penyelesaian") => {
  const r = selectedPd.value[0];
  if (!r) return;
  const path =
    jenis === "penyerahan"
      ? `/pembelian/uang-muka/print-penyerahan/${encodeURIComponent(r.PumNomor)}`
      : `/pembelian/petty-cash/print-penyelesaian/${encodeURIComponent(r.Nomor)}`;
  window.open(path, "_blank");
};
// Hanya pemilik bon (= pemilik laci); server memverifikasi ulang
const bisaPenyelesaian = computed(() => {
  const r = selectedPd.value[0];
  return (
    !!r &&
    r.UserDibuat.toUpperCase() === (authStore.user?.kode || "").toUpperCase()
  );
});
const goPenyelesaian = async () => {
  const r = selectedPd.value[0];
  if (!r) return;
  try {
    await uangMukaPenyelesaianFormService.cekBatas(r.Nomor, true);
  } catch (e) {
    toast.error(errMsg(e, "Gagal memeriksa batas waktu penyelesaian."));
    return;
  }
  router.push({ name: "PettyCashPenyelesaian", params: { nomor: r.Nomor } });
};
const bisaBatalPd = computed(() => {
  const r = selectedPd.value[0];
  return !!r && r.Selesai !== "Sudah" && bisaPenyelesaian.value;
});

const showBatalPd = ref(false);
const batalPdAlasan = ref("");
const isBatalPd = ref(false);

const openBatalPd = () => {
  if (!selectedPd.value[0]) return;
  batalPdAlasan.value = "";
  showBatalPd.value = true;
};

const submitBatalPd = async () => {
  const r = selectedPd.value[0];
  if (!r) return;
  if (batalPdAlasan.value.trim().length < 3) {
    toast.error("Alasan pembatalan minimal 3 karakter.");
    return;
  }
  isBatalPd.value = true;
  try {
    await pettyCashService.batalPenyerahan(
      r.PumNomor,
      batalPdAlasan.value.trim(),
    );
    toast.success(`Penyerahan ${r.PumNomor} dibatalkan.`);
    showBatalPd.value = false;
    selectedPd.value = [];
    await fetchPenyerahan();
  } catch (e) {
    // dialog tetap terbuka; langkah service aman diulang
    toast.error(errMsg(e, "Gagal membatalkan penyerahan."));
  } finally {
    isBatalPd.value = false;
  }
};

const outstandingHeaders = [
  { title: "Sumber", key: "Sumber", width: "150px" },
  { title: "Nomor", key: "Nomor", width: "150px" },
  { title: "Tanggal", key: "Tanggal", width: "100px", align: "center" },
  { title: "Keterangan", key: "Keterangan", minWidth: "180px" },
  { title: "Pemohon", key: "Pemohon", width: "150px" },
  { title: "Bagian", key: "Bagian", width: "120px" },
  { title: "Cabang", key: "Cabang", width: "90px" },
  { title: "Nominal", key: "Nominal", width: "120px", align: "right" },
];
const pdHeaders = [
  { title: "No. PD", key: "PumNomor", width: "140px" },
  { title: "No. Bon", key: "Nomor", width: "150px" },
  { title: "Tanggal", key: "Tanggal", width: "100px", align: "center" },
  { title: "Laci", key: "NamaAccount", width: "150px" },
  { title: "Nominal", key: "Nominal", width: "120px", align: "right" },
  { title: "Terpakai", key: "Terpakai", width: "120px", align: "right" },
  { title: "Sisa", key: "Sisa", width: "120px", align: "right" },
  { title: "Keterangan", key: "Keterangan", minWidth: "180px" },
  { title: "Selesai", key: "Selesai", width: "90px", align: "center" },
  { title: "Dibuat Oleh", key: "UserDibuat", width: "110px" },
];
</script>

<template>
  <div class="pc-tabs-wrap">
    <div class="pc-tabs">
      <button
        type="button"
        class="pc-tab"
        :class="{ active: activeTab === 'pengajuan' }"
        @click="activeTab = 'pengajuan'"
      >
        Pengajuan
      </button>
      <button
        v-if="canSeeOutstanding"
        type="button"
        class="pc-tab"
        :class="{ active: activeTab === 'outstanding' }"
        @click="activeTab = 'outstanding'"
      >
        Outstanding
      </button>
      <button
        type="button"
        class="pc-tab"
        :class="{ active: activeTab === 'penyerahan' }"
        @click="activeTab = 'penyerahan'"
      >
        Penyerahan Dana Belanja
      </button>
    </div>

    <BaseBrowse
      v-if="activeTab === 'pengajuan'"
      title="Petty Cash — Pengajuan"
      menu-id="973"
      :icon="IconCash"
      :headers="headers"
      :items="filteredItems"
      :is-loading="isLoading"
      v-model:selected="selected"
      select-strategy="single"
      :can-insert="false"
      :can-edit="false"
      :can-delete="false"
      :can-export="false"
      item-value="Nomor"
      @refresh="fetchData"
    >
      <template #filter-left>
        <div class="f-group">
          <span class="f-label">Periode</span>
          <input type="date" v-model="filters.dtAwal" class="f-inp" />
          <span class="f-sep">s/d</span>
          <input type="date" v-model="filters.dtAkhir" class="f-inp" />
        </div>
        <div class="f-group">
          <span class="f-label">Status</span>
          <select v-model="filters.status" class="f-inp">
            <option v-for="s in STATUS_FILTER" :key="s" :value="s">
              {{ s === "ALL" ? "SEMUA STATUS" : STATUS_LABEL[s]?.label }}
            </option>
          </select>
        </div>
      </template>

      <template #extra-actions>
        <v-btn
          color="primary"
          size="small"
          :loading="isLoadingLaci"
          @click="openAjukan"
        >
          <template #prepend><IconSend :size="15" /></template>
          Ajukan Petty Cash
        </v-btn>
        <v-btn
          size="small"
          color="indigo"
          :disabled="!selected[0]"
          @click="bukaPrint('cetak')"
        >
          <template #prepend><IconPrinter :size="15" /></template>
          Cetak
        </v-btn>
        <v-btn
          size="small"
          color="success"
          :disabled="!bisaValidasi"
          @click="bukaPrint('layar')"
        >
          <template #prepend><IconSignature :size="15" /></template>
          Validasi
        </v-btn>
        <v-btn
          size="small"
          color="teal"
          :disabled="!bisaRealisasi"
          @click="goRealisasi"
        >
          <template #prepend><IconCashBanknote :size="15" /></template>
          Realisasi
        </v-btn>
        <v-btn
          size="small"
          color="primary"
          :loading="isConfirming"
          :disabled="!bisaKonfirmasiTerima"
          @click="onKonfirmasiTerima"
        >
          <template #prepend><IconCheck :size="15" /></template>
          Konfirmasi Terima
        </v-btn>
      </template>

      <template #item.Nomor="{ item }">
        <span class="mono">{{ item.Nomor }}</span>
      </template>
      <template #item.Tanggal="{ item }">{{ tglFmt(item.Tanggal) }}</template>
      <template #item.Nominal="{ item }">{{ numFmt(item.Nominal) }}</template>
      <template #item.Status="{ item }">
        <v-chip
          size="x-small"
          :style="{
            backgroundColor: STATUS_LABEL[item.Status]?.bg,
            color: STATUS_LABEL[item.Status]?.color,
          }"
          class="font-weight-bold"
        >
          {{ STATUS_LABEL[item.Status]?.label || item.Status }}
        </v-chip>
      </template>
      <template #item.ValAksi="{ item }">
        <v-chip
          size="x-small"
          :color="item.ValAksi === 'VALIDASI' ? 'success' : 'grey'"
          class="font-weight-bold"
        >
          {{ item.ValAksi === "VALIDASI" ? "Valid" : "Belum" }}
        </v-chip>
      </template>
      <template #item.LaciNama="{ item }">
        {{ item.LaciNama || item.LaciKode || "-" }}
      </template>
      <template #item.LaciAsal="{ item }">
        <span class="mono">{{ item.LaciAsal || "-" }}</span>
      </template>
      <template #item.AlasanTolak="{ item }">
        {{ item.AlasanTolak || "-" }}
      </template>
      <template #item.UserRealisasi="{ item }">
        {{ item.UserRealisasi || "-" }}
      </template>
      <template #item.TglRealisasi="{ item }">
        {{ tglFmt(item.TglRealisasi) }}
      </template>
      <template #item.KonfirmasiStatus="{ item }">
        <v-chip
          v-if="item.KonfirmasiStatus"
          size="x-small"
          :color="item.KonfirmasiStatus === 'SUDAH' ? 'success' : 'warning'"
          variant="flat"
        >
          {{ item.KonfirmasiStatus === "SUDAH" ? "Sudah" : "Belum" }}
        </v-chip>
        <span v-else>-</span>
      </template>
    </BaseBrowse>

    <!-- TAB OUTSTANDING -->
    <BaseBrowse
      v-else-if="activeTab === 'outstanding'"
      title="Petty Cash — Outstanding"
      menu-id="973"
      :icon="IconCash"
      :headers="outstandingHeaders"
      :items="outstandingItems"
      :is-loading="isLoading"
      v-model:selected="selectedOutstanding"
      select-strategy="page"
      :can-insert="false"
      :can-edit="false"
      :can-delete="false"
      :can-export="false"
      item-value="RowKey"
      show-expand
      :expanded="expandedOutstanding"
      @update:expanded="onUpdateExpandedOutstanding"
      @refresh="fetchOutstanding"
    >
      <template #filter-left>
        <div class="f-group">
          <span class="f-label">Periode</span>
          <input type="date" v-model="filters.dtAwal" class="f-inp" />
          <span class="f-sep">s/d</span>
          <input type="date" v-model="filters.dtAkhir" class="f-inp" />
        </div>
      </template>

      <template #extra-actions>
        <v-btn
          color="primary"
          size="small"
          :loading="isLoadingSerahkan"
          :disabled="!selectedOutstanding.length"
          @click="openSerahkan"
        >
          <template #prepend><IconSend :size="15" /></template>
          Serahkan ({{ selectedOutstanding.length }})
        </v-btn>
      </template>

      <template #item.Sumber="{ item }">
        <v-chip size="x-small" :color="sumberColor(item.Sumber)" variant="flat">
          {{ sumberLabel(item.Sumber) }}
        </v-chip>
      </template>
      <template #item.Nomor="{ item }">
        <span class="mono">{{ item.Nomor }}</span>
      </template>
      <template #item.Tanggal="{ item }">{{ tglFmt(item.Tanggal) }}</template>
      <template #item.Nominal="{ item }">{{ numFmt(item.Nominal) }}</template>

      <template #detail="{ item }">
        <div class="detail-wrap">
          <v-progress-linear
            v-if="outstandingDetailLoading[item.RowKey]"
            indeterminate
            color="primary"
            height="2"
          />
          <div
            v-else-if="outstandingDetailCache[item.RowKey]"
            class="detail-panel"
          >
            <div class="panel-head">
              Rincian Item —
              <span class="text-warning ml-1">{{ item.Nomor }}</span>
            </div>
            <div class="dtl-scroll">
              <table class="dtl-table">
                <thead>
                  <tr>
                    <th>Ref</th>
                    <th>Item</th>
                    <th class="tr">Qty</th>
                    <th>Satuan</th>
                    <th class="tr">Nominal</th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="(d, i) in outstandingDetailCache[item.RowKey]"
                    :key="i"
                  >
                    <td class="mono">{{ d.kode || "-" }}</td>
                    <td class="fw">{{ d.nama }}</td>
                    <td class="tr">{{ numFmt(d.qty) }}</td>
                    <td>{{ d.satuan }}</td>
                    <td class="tr fw">{{ numFmt(d.nominal) }}</td>
                  </tr>
                  <tr v-if="!outstandingDetailCache[item.RowKey]?.length">
                    <td colspan="5" class="tc" style="color: #999">
                      Tidak ada item tersisa.
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </template>
    </BaseBrowse>

    <!-- TAB PENYERAHAN DANA BELANJA -->
    <BaseBrowse
      v-else
      title="Petty Cash — Penyerahan Dana Belanja"
      menu-id="973"
      :icon="IconCash"
      :headers="pdHeaders"
      :items="pdItems"
      :is-loading="isLoading"
      v-model:selected="selectedPd"
      select-strategy="single"
      :can-insert="false"
      :can-edit="false"
      :can-delete="false"
      :can-export="false"
      item-value="Nomor"
      show-expand
      :expanded="expandedPd"
      @update:expanded="onUpdateExpandedPd"
      @refresh="fetchPenyerahan"
    >
      <template #filter-left>
        <div class="f-group">
          <span class="f-label">Periode</span>
          <input type="date" v-model="filters.dtAwal" class="f-inp" />
          <span class="f-sep">s/d</span>
          <input type="date" v-model="filters.dtAkhir" class="f-inp" />
        </div>
      </template>

      <template #extra-actions>
        <v-btn
          size="small"
          color="brown"
          :disabled="!selectedPd[0]"
          @click="cetakPd('penyerahan')"
        >
          <template #prepend><IconPrinter :size="15" /></template>
          Cetak Penyerahan
        </v-btn>
        <v-btn
          size="small"
          color="deep-orange"
          :disabled="!bisaPenyelesaian"
          @click="goPenyelesaian"
        >
          <template #prepend><IconChecklist :size="15" /></template>
          Lanjut ke Penyelesaian
        </v-btn>
        <v-btn
          size="small"
          color="teal-darken-2"
          :disabled="!selectedPd[0] || selectedPd[0].Selesai !== 'Sudah'"
          @click="cetakPd('penyelesaian')"
        >
          <template #prepend><IconPrinter :size="15" /></template>
          Cetak Penyelesaian
        </v-btn>
        <v-btn
          size="small"
          color="error"
          variant="tonal"
          :disabled="!bisaBatalPd"
          @click="openBatalPd"
        >
          <IconBan :size="16" class="mr-1" /> Batalkan Penyerahan
        </v-btn>
      </template>

      <template #item.PumNomor="{ item }">
        <span class="mono">{{ item.PumNomor || "-" }}</span>
      </template>
      <template #item.Nomor="{ item }">
        <span class="mono">{{ item.Nomor }}</span>
      </template>
      <template #item.Tanggal="{ item }">{{ tglFmt(item.Tanggal) }}</template>
      <template #item.Nominal="{ item }">{{ numFmt(item.Nominal) }}</template>
      <template #item.Terpakai="{ item }">{{ numFmt(item.Terpakai) }}</template>
      <template #item.Sisa="{ item }">{{ numFmt(item.Sisa) }}</template>
      <template #item.Selesai="{ item }">
        <v-chip
          size="x-small"
          :color="item.Selesai === 'Sudah' ? 'success' : 'error'"
          variant="flat"
        >
          {{ item.Selesai }}
        </v-chip>
      </template>

      <template #detail="{ item }">
        <div class="detail-wrap">
          <v-progress-linear
            v-if="pdDetailLoading[item.Nomor]"
            indeterminate
            color="primary"
            height="2"
          />
          <div
            v-else-if="pdDetailCache[item.Nomor]?.detail?.length"
            class="detail-panel"
          >
            <div class="panel-head">
              Rincian —
              <span class="text-warning ml-1">{{ item.Nomor }}</span>
            </div>
            <div class="dtl-scroll">
              <table class="dtl-table">
                <thead>
                  <tr>
                    <th>No.Pengajuan</th>
                    <th>Uraian</th>
                    <th>Satuan</th>
                    <th class="tr">Qty Minta</th>
                    <th class="tr">Qty Beli</th>
                    <th class="tr">Nominal Satuan</th>
                    <th class="tr">Total</th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="(d, i) in pdDetailCache[item.Nomor]?.detail"
                    :key="i"
                  >
                    <td class="mono">{{ d.pjh || d.pjh_link || "-" }}</td>
                    <td>{{ d.uraian }}</td>
                    <td>{{ d.satuan }}</td>
                    <td class="tr">{{ numFmt(d.qty_minta) }}</td>
                    <td class="tr fw">{{ numFmt(d.qty) }}</td>
                    <td class="tr">{{ numFmt(d.harga) }}</td>
                    <td class="tr fw">{{ numFmt(d.total) }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
          <div v-else class="pa-3" style="font-size: 11px; color: #999">
            Belum ada rincian untuk bon ini.
          </div>
        </div>
      </template>
    </BaseBrowse>
  </div>

  <v-dialog v-model="showAjukan" max-width="460px" persistent>
    <v-card class="rounded-lg">
      <v-card-title
        class="bg-primary text-white pa-3"
        style="font-size: 13px; font-weight: 700"
      >
        Ajukan Petty Cash
      </v-card-title>
      <v-card-text class="pa-4">
        <div v-if="infoLaci" class="laci-box mb-3">
          <div>
            Laci tujuan: <strong>{{ infoLaci.nama }}</strong>
            <span class="mono"> ({{ infoLaci.kode }})</span>
          </div>
          <div>
            Saldo laci: <strong>{{ numFmt(infoLaci.saldo) }}</strong> · Batas
            realisasi mandiri: <strong>{{ numFmt(infoLaci.batas) }}</strong>
          </div>
        </div>
        <v-text-field
          v-model="ajukanTanggal"
          type="date"
          label="Tanggal"
          variant="outlined"
          density="compact"
          hide-details
          class="mb-3"
          style="max-width: 220px"
        />
        <v-textarea
          v-model="ajukanKeterangan"
          label="Keterangan"
          variant="outlined"
          density="compact"
          rows="2"
          hide-details="auto"
          class="mb-3"
        />
        <div class="d-flex align-center" style="gap: 8px">
          <span class="text-caption font-weight-bold">Nominal:</span>
          <div class="nominal-wrap">
            <NumberInputIDR v-model="ajukanNominal" cursor-to-end />
          </div>
        </div>
        <div v-if="melebihiBatasMandiri" class="warn-box mt-3">
          Saldo laci + nominal melebihi batas. Pengajuan ini tidak bisa
          direalisasi oleh pengaju sendiri; harus direalisasi user lain dan
          melalui validasi.
        </div>
      </v-card-text>
      <v-card-actions class="pa-3 border-t bg-grey-lighten-4">
        <v-spacer />
        <v-btn
          variant="text"
          :disabled="isSubmitting"
          @click="showAjukan = false"
          >Batal</v-btn
        >
        <v-btn
          variant="elevated"
          color="primary"
          :loading="isSubmitting"
          @click="submitAjukan"
          >Ajukan</v-btn
        >
      </v-card-actions>
    </v-card>
  </v-dialog>

  <!-- DIALOG PENYERAHAN DANA BELANJA -->
  <v-dialog v-model="showSerahkan" max-width="900px" persistent>
    <v-card class="rounded-lg">
      <v-card-title
        class="bg-primary text-white pa-3"
        style="font-size: 13px; font-weight: 700"
      >
        Penyerahan Dana Belanja
      </v-card-title>
      <v-card-text class="pa-4">
        <div v-if="infoLaci" class="laci-box mb-3">
          <div>
            Laci: <strong>{{ infoLaci.nama }}</strong>
            <span class="mono"> ({{ infoLaci.kode }})</span>
          </div>
          <div>
            Saldo laci: <strong>{{ numFmt(infoLaci.saldo) }}</strong> ·
            Penyerahan belum selesai:
            <strong>{{ numFmt(infoLaci.belumSelesai) }}</strong> · Dana
            tersedia: <strong>{{ numFmt(infoLaci.tersedia) }}</strong>
          </div>
        </div>
        <v-text-field
          v-model="serahkanTanggal"
          type="date"
          label="Tanggal"
          variant="outlined"
          density="compact"
          hide-details
          class="mb-3"
          style="max-width: 220px"
        />
        <v-textarea
          v-model="serahkanKeterangan"
          label="Keterangan"
          variant="outlined"
          density="compact"
          rows="2"
          hide-details="auto"
          class="mb-3"
        />
        <div class="panel-head" style="border-radius: 4px">Rincian</div>
        <div class="dtl-scroll" style="max-height: 280px; overflow-y: auto">
          <table class="dtl-table">
            <thead>
              <tr>
                <th style="width: 40px">No</th>
                <th style="width: 130px">Nomor</th>
                <th>Item</th>
                <th style="width: 110px" class="tr">Qty</th>
                <th style="width: 150px" class="tr">Nominal Sumber</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="(r, i) in serahkanItems"
                :key="`${r.NomorHeader}-${r.ItemNourut}`"
              >
                <td class="tc">{{ i + 1 }}</td>
                <td class="mono">{{ r.NomorHeader }}</td>
                <td class="wrap-cell">{{ r.Nama }}</td>
                <td class="tr">{{ numFmt(r.Qty) }} {{ r.Satuan }}</td>
                <td class="tr">{{ numFmt(r.NominalSumber) }}</td>
              </tr>
            </tbody>
            <tfoot class="sticky-foot">
              <tr>
                <td colspan="4" class="tr fw">Total Nominal Sumber</td>
                <td class="tr fw">{{ numFmt(serahkanTotalSumber) }}</td>
              </tr>
            </tfoot>
          </table>
        </div>
        <div v-if="melebihiTersedia" class="warn-box mt-3">
          Nominal melebihi dana tersedia di laci. Kurangi nominal atau
          selesaikan dulu penyerahan sebelumnya.
        </div>
      </v-card-text>
      <v-card-actions class="pa-3 border-t bg-grey-lighten-4">
        <div class="d-flex align-center" style="gap: 8px">
          <span class="text-caption font-weight-bold">Nominal Diserahkan:</span>
          <div class="nominal-wrap">
            <NumberInputIDR v-model="serahkanNominal" cursor-to-end />
          </div>
        </div>
        <v-spacer />
        <v-btn
          variant="text"
          :disabled="isSubmittingSerahkan"
          @click="showSerahkan = false"
          >Batal</v-btn
        >
        <v-btn
          variant="elevated"
          color="primary"
          :loading="isSubmittingSerahkan"
          :disabled="melebihiTersedia"
          @click="submitSerahkan"
          >Serahkan</v-btn
        >
      </v-card-actions>
    </v-card>
  </v-dialog>

  <v-dialog v-model="showSerahkanPrint" max-width="380" persistent>
    <v-card rounded="lg">
      <v-card-title
        class="pa-4 pb-2"
        style="font-size: 13px; font-weight: 700; border-top: 3px solid #2e7d32"
      >
        <IconCheck :size="16" color="#2e7d32" style="margin-right: 6px" />
        Penyerahan Berhasil Dibuat
      </v-card-title>
      <v-card-text class="pa-4 pt-2" style="font-size: 12px">
        No. PD: <strong>{{ savedPdNomor }}</strong
        ><br />
        Cetak bukti penyerahan dana belanja?
      </v-card-text>
      <v-card-actions class="pa-3">
        <v-btn variant="text" @click="showSerahkanPrint = false">Tidak</v-btn>
        <v-spacer />
        <v-btn color="primary" variant="flat" @click="cetakPenyerahanBaru">
          <template #prepend><IconPrinter :size="14" /></template>
          Cetak Bukti
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <v-dialog v-model="showBatalPd" max-width="480" persistent>
    <v-card>
      <v-card-title class="text-subtitle-1"
        >Batalkan Penyerahan Dana Belanja</v-card-title
      >
      <v-card-text style="font-size: 12px">
        <div class="mb-2">
          <strong>{{ selectedPd[0]?.PumNomor }}</strong>
          <span v-if="selectedPd[0]">
            · {{ numFmt(selectedPd[0].Nominal) }}</span
          >
        </div>
        <v-alert
          type="warning"
          variant="tonal"
          density="compact"
          class="mb-3"
          style="font-size: 11px"
        >
          Dana tersedia di laci pulih. Item kembali ke Outstanding dan bisa
          diserahkan lagi. Uang fisik yang sudah keluar harus dikembalikan ke
          laci.
        </v-alert>
        <v-textarea
          v-model="batalPdAlasan"
          label="Alasan pembatalan"
          rows="2"
          density="compact"
          variant="outlined"
          hide-details
          :style="{ fontSize: '11px' }"
        />
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn variant="text" :disabled="isBatalPd" @click="showBatalPd = false"
          >Tutup</v-btn
        >
        <v-btn
          color="error"
          variant="flat"
          :loading="isBatalPd"
          @click="submitBatalPd"
        >
          Batalkan Penyerahan
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.f-group {
  display: flex;
  align-items: center;
  gap: 6px;
}
.f-label {
  font-size: 11px;
  font-weight: 700;
  color: #555;
  white-space: nowrap;
}
.f-inp {
  height: 28px;
  border: 1px solid #ccc;
  border-radius: 4px;
  padding: 0 6px;
  font-size: 11px;
  outline: none;
  background: white;
}
.f-sep {
  font-size: 11px;
  color: #555;
}
.mono {
  font-family: monospace;
  font-weight: 600;
}
.laci-box {
  background: #f5f7fb;
  border: 1px solid #dde3ea;
  border-radius: 4px;
  padding: 8px 10px;
  font-size: 11px;
  line-height: 1.6;
}
.warn-box {
  background: #fff3e0;
  border: 1px solid #ffcc80;
  border-radius: 4px;
  padding: 8px 10px;
  font-size: 11px;
  color: #e65100;
}
.nominal-wrap {
  width: 180px;
}
.nominal-wrap :deep(input) {
  width: 100%;
  height: 34px;
  border: 1.5px solid #1565c0;
  border-radius: 4px;
  padding: 0 10px;
  font-size: 13px;
  font-weight: 700;
  text-align: right;
  background: white;
  outline: none;
}

.pc-tabs-wrap {
  display: flex;
  flex-direction: column;
  height: 100%;
}
.pc-tabs {
  display: flex;
  gap: 4px;
  padding: 8px 8px 0;
  flex-shrink: 0;
}
.pc-tab {
  padding: 8px 16px;
  font-size: 11px;
  font-weight: 700;
  border: none;
  background: transparent;
  color: #757575;
  cursor: pointer;
  border-bottom: 2px solid transparent;
}
.pc-tab.active {
  color: #1565c0;
  border-bottom-color: #1565c0;
}
.detail-wrap {
  padding: 10px 14px 16px;
  background: #f5f7fb;
  border-top: 2px solid #dde3ea;
}
.detail-panel {
  background: white;
  border-radius: 6px;
  overflow: hidden;
  border: 1px solid #cfd8dc;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08);
}
.panel-head {
  display: flex;
  align-items: center;
  background: #37474f;
  color: white;
  padding: 8px 12px;
  font-size: 11px;
  font-weight: 700;
}
.dtl-scroll {
  overflow-x: auto;
}
.dtl-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 11px;
}
.dtl-table thead th {
  background: #eceff1;
  color: #37474f;
  padding: 6px 10px;
  text-align: left;
  font-weight: 700;
  border-bottom: 2px solid #b0bec5;
  border-right: 1px solid #dde3ea;
  white-space: nowrap;
}
.dtl-table tbody td {
  padding: 5px 10px;
  border-bottom: 1px solid #f0f0f0;
  border-right: 1px solid #f0f0f0;
  vertical-align: middle;
  white-space: nowrap;
}
.dtl-table td.wrap-cell {
  white-space: normal;
  word-break: break-word;
}
.dtl-table tfoot td {
  padding: 6px 10px;
  border-top: 2px solid #b0bec5;
}
.sticky-foot {
  position: sticky;
  bottom: 0;
  z-index: 2;
}
.sticky-foot td {
  background: white;
  box-shadow: 0 -1px 0 #b0bec5;
}
.tc {
  text-align: center !important;
}
.tr {
  text-align: right !important;
}
.fw {
  font-weight: 700;
}
</style>
