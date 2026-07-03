<script setup lang="ts">
import { ref, computed, watch, onMounted } from "vue";
import { useRouter, useRoute } from "vue-router";
import { useToast } from "vue-toastification";
import { useAuthStore } from "@/stores/authStore";
import BaseForm from "@/components/BaseForm.vue";
import { useForm } from "@/composables/useForm";
import api from "@/services/api";
import { sjFormService as svc } from "@/services/penjualan/suratJalanFormService";
import PerusahaanSearchModal from "@/components/lookups/PerusahaanSearchModal.vue";
import CustomerSearchModal from "@/components/lookups/CustomerSearchModal.vue";
import InvProformaSearchModal from "@/components/lookups/InvProformaSearchModal.vue";
import SpkSearchModal from "@/components/lookups/SpkSearchModal.vue";
import GudangJadiSearchModal from "@/components/lookups/GudangJadiSearchModal.vue";
import JadwalKirimSearchModal from "@/components/lookups/JadwalKirimSearchModal.vue";
import {
  IconTruck,
  IconSearch,
  IconHistory,
  IconMapPin,
  IconAlertTriangle,
} from "@tabler/icons-vue";

// ── Types ───────────────────────────────────────────────────────────────
interface DetailRow {
  _key: number;
  SpkNomor: string;
  NamaSpk: string;
  Ukuran: string;
  Size: string;
  Jenis: string;
  Harga: number;
  Jumlah: number;
  Koli: number;
  Sudah: number;
  Kurang: number;
  Keterangan: string;
  Uraian: string;
  NoKirim: string;
  IdKirim: number;
}

interface FormData {
  NomorSJ: string;
  Divisi: string;
  Tanggal: string;
  PraSJ: string;
  KodePerush: string;
  NamaPerush: string;
  KodeCus: string;
  NamaCus: string;
  AlamatCus: string;
  KotaCus: string;
  GudangKode: string;
  GudangNama: string;
  InvPro: string;
  InvNomor: string;
  Keterangan: string;
  StsPpn: number;
  Ppn: number;
  Disc: number;
  RekBank: string;
  NamaBank: string;
  AtasNama: string;
  Xminta5: string;
  Xurut5: number;
  Detail: DetailRow[];
  IsTutupBuku: boolean;
  SjApprove: number;
}

// ── Setup ────────────────────────────────────────────────────────────────
const auth = useAuthStore();
const router = useRouter();
const route = useRoute();
const toast = useToast();

const todayLocal = () => {
  const d = new Date(
    new Date().toLocaleString("en-US", { timeZone: "Asia/Jakarta" }),
  );
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

let _key = 1;
const sel = (e: FocusEvent) => (e.target as HTMLInputElement).select();
const num = (v: any) => Number(v || 0).toLocaleString("id-ID");

// ── State ────────────────────────────────────────────────────────────────
const divisiList = ref<any[]>([]);
const showPrintDialog = ref(false);
const savedNomor = ref("");
const isLoadingSpk = ref(false);

// ── Default Gudang per divisi (sesuai Delphi cbDivisiChange) ─────────────
const defaultGudangByDivisi = (divisiStr: string) => {
  if (divisiStr === "1") return { kode: "WH002", nama: "GUDANG JADI P2" };
  if (divisiStr === "5") return { kode: "WH-010", nama: "GUDANG JADI MMT" };
  return { kode: "GJ001", nama: "GUDANG BARANG JADI JERON" };
};

// ── Init ─────────────────────────────────────────────────────────────────
const initDivisi = "4"; // default garmen
const initGudang = defaultGudangByDivisi(initDivisi);

const init: FormData = {
  NomorSJ: "",
  Divisi: initDivisi,
  Tanggal: todayLocal(),
  PraSJ: "",
  KodePerush: "",
  NamaPerush: "",
  KodeCus: "",
  NamaCus: "",
  AlamatCus: "",
  KotaCus: "",
  GudangKode: initGudang.kode,
  GudangNama: initGudang.nama,
  InvPro: "",
  InvNomor: "",
  Keterangan: "",
  StsPpn: 0,
  Ppn: 0,
  Disc: 0,
  RekBank: "",
  NamaBank: "",
  AtasNama: "",
  Xminta5: "",
  Xurut5: 0,
  Detail: [],
  IsTutupBuku: false,
  SjApprove: 0,
};

// ── useForm ──────────────────────────────────────────────────────────────
const {
  isEditMode,
  isLoading,
  isSaving,
  showSaveDialog,
  showCancelDialog,
  showCloseDialog,
  formData,
  fetchData,
  executeSave,
  executeCancel,
  executeClose,
} = useForm<FormData>({
  menuId: "153",
  initialData: init,
  immediate: false,

  fetchApi: async (): Promise<FormData> => {
    const nomorEdit = route.query.nomor as string;
    const res = await svc.getById(nomorEdit);
    const d = res.data.data;
    const h = d.header;
    return {
      NomorSJ: h.sj_nomor || "",
      Divisi: String(h.sj_divisi || "4"),
      Tanggal: h.sj_tanggal || todayLocal(),
      PraSJ: h.pra || "",
      KodePerush: h.sj_perush_kode || "",
      NamaPerush: h.perush_nama || "",
      KodeCus: h.sj_cus_kode || "",
      NamaCus: h.cus_nama || "",
      AlamatCus: h.sj_alamat_customer || h.cus_alamat || "",
      KotaCus: h.sj_kota_customer || h.cus_kota || "",
      GudangKode: h.sj_gdg_kode || "",
      GudangNama: h.gdg_nama || "",
      InvPro: h.sj_inv_pro || "",
      InvNomor: h.sj_inv_sm || "",
      Keterangan: h.sj_keterangan || "",
      StsPpn: h.inv_sts_ppn || 0,
      Ppn: h.inv_ppn || 0,
      Disc: h.inv_disc || 0,
      RekBank: h.inv_rekening || "",
      NamaBank: h.perushd_bank || "",
      AtasNama: h.perushd_atasnama || "",
      Xminta5: d.xminta5 || "",
      Xurut5: d.xurut5 || 0,
      SjApprove: Number(h.sj_approve) || 0,
      IsTutupBuku: !!h.isTutupBuku,
      Detail: (d.detail || []).map((r: any) => ({
        _key: _key++,
        SpkNomor: r.sjd_spk_nomor || "",
        NamaSpk: r.spk_nama || "",
        Ukuran: r.sjd_ukuran || "",
        Size: r.size || "",
        Jenis: r.spk_jo_kode || "",
        Harga: Number(r.sjd_harga) || 0,
        Jumlah: Number(r.sjd_jumlah) || 0,
        Koli: Number(r.sjd_koli) || 0,
        Sudah: Number(r.sudah) || 0,
        Kurang: Number(r.kurang) || 0,
        Keterangan: r.sjd_keterangan || "",
        Uraian: r.uraian || "",
        NoKirim: r.sjd_nokirim || "",
        IdKirim: Number(r.sjd_idkirim) || 0,
      })),
    };
  },

  submitApi: async (data): Promise<any> => {
    const payload = {
      ...data,
      NomorSJ: route.query.nomor || data.NomorSJ,
      Detail: data.Detail.filter(
        (r) => r.NamaSpk && Number(r.Jumlah) !== 0,
      ).map(({ _key: _k, ...r }) => r),
    };
    return isEditMode.value ? svc.update(payload) : svc.save(payload);
  },

  onSuccess: (res: any) => {
    const nomor = res?.data?.data?.nomor || "";
    toast.success(`Data ${nomor} berhasil disimpan.`);
    savedNomor.value = nomor;
    showPrintDialog.value = true;
  },
});

const fd = formData;
const divisiStr = computed(() => String(fd.value.Divisi).charAt(0));
const isAI = computed(
  () => fd.value.KodePerush === "AI" && divisiStr.value !== "3",
);

// ── Watch divisi → update default gudang ────────────────────────────────
watch(
  () => fd.value.Divisi,
  (val) => {
    if (!isEditMode.value) {
      const g = defaultGudangByDivisi(String(val).charAt(0));
      fd.value.GudangKode = g.kode;
      fd.value.GudangNama = g.nama;
    }
  },
);

// ── Lookup Modals ────────────────────────────────────────────────────────
const showCusModal = ref(false);
const showGudangModal = ref(false);
const showSpkModal = ref(false);

// Perusahaan — inline search
const showPerushModal = ref(false);

const onPerushEnter = async () => {
  const kode = fd.value.KodePerush.trim();
  if (!kode) return;
  try {
    const res = await svc.searchPerusahaan(kode);
    const list = res.data.data || [];
    // Coba exact match dulu
    const exact = list.find(
      (p: any) => p.perush_kode?.toLowerCase() === kode.toLowerCase(),
    );
    const found = exact || list[0];
    if (found) {
      fd.value.KodePerush = found.perush_kode;
      fd.value.NamaPerush = found.perush_nama;
      if (!isEditMode.value) {
        const g = defaultGudangByDivisi(divisiStr.value);
        fd.value.GudangKode = g.kode;
        fd.value.GudangNama = g.nama;
      }
    } else {
      toast.error(`Perusahaan "${kode}" tidak ditemukan.`);
      fd.value.KodePerush = "";
      fd.value.NamaPerush = "";
    }
  } catch {
    toast.error("Gagal mencari perusahaan.");
  }
};

const selectPerush = (item: any) => {
  fd.value.KodePerush = item.perush_kode || item.Kode || "";
  fd.value.NamaPerush = item.perush_nama || item.Nama || "";
  showPerushModal.value = false;
  // Update default gudang saat perusahaan dipilih
  const g = defaultGudangByDivisi(divisiStr.value);
  if (!isEditMode.value) {
    fd.value.GudangKode = g.kode;
    fd.value.GudangNama = g.nama;
  }
};

// Invoice Proforma — inline
const showInvProModal = ref(false);

const onInvProEnter = async () => {
  const nomor = fd.value.InvPro.trim();
  if (!nomor) return;
  try {
    const res = await svc.getInvProformaList(fd.value.KodeCus, nomor);
    const list = res.data.data?.items || res.data.data || [];
    const exact = list.find(
      (p: any) => p.Nomor?.toLowerCase() === nomor.toLowerCase(),
    );
    const found = exact || list[0];
    if (found) {
      fd.value.InvPro = found.Nomor;
    } else {
      toast.error(`Invoice Proforma "${nomor}" tidak ditemukan.`);
      fd.value.InvPro = "";
    }
  } catch {
    toast.error("Gagal mencari invoice proforma.");
  }
};

const selectInvPro = (item: any) => {
  fd.value.InvPro = item.Nomor;
  showInvProModal.value = false;
};

// Customer
const showCustomerChangeDialog = ref(false);
const pendingCustomerItem = ref<any>(null);

const onCusEnter = async () => {
  const kode = fd.value.KodeCus.trim();
  if (!kode) return;
  try {
    const res = await svc.searchCustomer(kode, 1, 10);
    const list = res.data.data?.items || [];
    const exact = list.find(
      (c: any) => c.Kode?.toLowerCase() === kode.toLowerCase(),
    );
    const found = exact || list[0];
    if (found) {
      fd.value.KodeCus = found.Kode;
      fd.value.NamaCus = found.Nama;
      fd.value.AlamatCus = found.Alamat || "";
      fd.value.KotaCus = found.Kota || "";
      // Reset detail jika customer ganti
      const adaDetail = fd.value.Detail.some((r) => r.SpkNomor);
      if (adaDetail) {
        fd.value.Detail = [];
        ensureEmptyRow();
      }
    } else {
      toast.error(`Customer "${kode}" tidak ditemukan.`);
      fd.value.KodeCus = "";
      fd.value.NamaCus = "";
    }
  } catch {
    toast.error("Gagal mencari customer.");
  }
};

const selectCustomer = (item: any) => {
  const adaDetail = fd.value.Detail.filter((r) => r.NamaSpk).length > 0;
  if (adaDetail) {
    // Tampilkan konfirmasi dulu, simpan item yang dipilih
    pendingCustomerItem.value = item;
    showCustomerChangeDialog.value = true;
    showCusModal.value = false;
    return;
  }
  applyCustomer(item);
  showCusModal.value = false;
};

const applyCustomer = (item: any) => {
  fd.value.KodeCus = item.Kode || item.cus_kode || "";
  fd.value.NamaCus = item.Nama || item.cus_nama || "";
  fd.value.AlamatCus = item.Alamat || item.cus_alamat || "";
  fd.value.KotaCus = item.Kota || item.cus_kota || "";
};

const confirmCustomerChange = () => {
  if (pendingCustomerItem.value) {
    applyCustomer(pendingCustomerItem.value);
    fd.value.Detail = [];
    ensureEmptyRow();
  }
  showCustomerChangeDialog.value = false;
  pendingCustomerItem.value = null;
};

const cancelCustomerChange = () => {
  showCustomerChangeDialog.value = false;
  pendingCustomerItem.value = null;
};

// Gudang
const onGudangEnter = async () => {
  const kode = fd.value.GudangKode.trim();
  if (!kode) return;
  try {
    const res = await api.get("/lookups/gudang-jadi", {
      params: { q: kode, divisi: Number(divisiStr.value) },
    });
    const list = res.data.data || [];
    const exact = list.find(
      (g: any) => g.Kode?.toLowerCase() === kode.toLowerCase(),
    );
    const found = exact || list[0];
    if (found) {
      fd.value.GudangKode = found.Kode;
      fd.value.GudangNama = found.Nama;
    } else {
      toast.error(`Gudang "${kode}" tidak ditemukan.`);
      fd.value.GudangKode = "";
      fd.value.GudangNama = "";
    }
  } catch {
    toast.error("Gagal mencari gudang.");
  }
};

const selectGudang = (item: any) => {
  fd.value.GudangKode = item.Kode;
  fd.value.GudangNama = item.Nama;
  showGudangModal.value = false;
};

// ── Grid SPK ─────────────────────────────────────────────────────────────
const activeRowKey = ref<number | null>(null);
const showJadwalModal = ref(false);

const ensureEmptyRow = () => {
  const last = fd.value.Detail[fd.value.Detail.length - 1];
  if (!last || last.SpkNomor) {
    fd.value.Detail.push({
      _key: _key++,
      SpkNomor: "",
      NamaSpk: "",
      Ukuran: "",
      Size: "",
      Jenis: "",
      Harga: 0,
      Jumlah: 0,
      Koli: 0,
      Sudah: 0,
      Kurang: 0,
      Keterangan: "",
      Uraian: "",
      NoKirim: "",
      IdKirim: 0,
    });
  }
};

// F1 — pilih SPK
const spkInputValues = ref<Record<number, string>>({});

const onSpkInputEnter = async (rowKey: number) => {
  const val = (spkInputValues.value[rowKey] || "").trim();
  if (!val) return;

  if (!fd.value.KodePerush) {
    toast.warning("Perusahaan diisi dulu.");
    return;
  }
  if (!fd.value.KodeCus) {
    toast.warning("Customer diisi dulu.");
    return;
  }

  // Hapus baris kosong ini
  const idx = fd.value.Detail.findIndex(
    (r) => r._key === rowKey && !r.SpkNomor,
  );
  if (idx !== -1) fd.value.Detail.splice(idx, 1);

  await addSpkToGrid(val);
  spkInputValues.value[rowKey] = "";
  ensureEmptyRow();
};

const openSpkModal = (rowKey?: number) => {
  if (!fd.value.KodePerush) {
    toast.warning("Perusahaan diisi dulu.");
    return;
  }
  if (!fd.value.KodeCus) {
    toast.warning("Customer diisi dulu.");
    return;
  }
  activeRowKey.value = rowKey ?? null;
  showSpkModal.value = true;
};

const selectSpk = async (item: any) => {
  showSpkModal.value = false;
  // Hapus baris kosong placeholder
  if (activeRowKey.value !== null) {
    const idx = fd.value.Detail.findIndex(
      (r) => r._key === activeRowKey.value && !r.SpkNomor,
    );
    if (idx !== -1) fd.value.Detail.splice(idx, 1);
    activeRowKey.value = null;
  }
  await addSpkToGrid(item.Nomor);
  ensureEmptyRow();
};

// ── Panel Otorisasi ──────────────────────────────────────────────────
const showOtorisasiPanel = ref(false);
const otorisasiKode = ref("");
const otorisasiJawaban = ref("");
const otorisasiSpkPending = ref("");
const isOtorisasiLoading = ref(false);

const addSpkToGrid = async (spkNomor: string) => {
  if (!spkNomor) return;
  isLoadingSpk.value = true;
  try {
    const piutangRes = await svc.cekPiutang(spkNomor, fd.value.KodeCus);
    const piutang = piutangRes.data.data;

    if (!piutang.lunas && !piutang.korporasi) {
      // Buka panel otorisasi — sesuai Delphi
      otorisasiSpkPending.value = spkNomor;
      const kodeRes = await svc.getKodeOtorisasi();
      otorisasiKode.value = kodeRes.data.data.kode;
      otorisasiJawaban.value = "";
      showOtorisasiPanel.value = true;
      isLoadingSpk.value = false;
      return;
    }

    await loadSpkDetail(spkNomor);
  } catch (e: any) {
    toast.error(e.response?.data?.message || "SO tidak ditemukan.");
  } finally {
    isLoadingSpk.value = false;
  }
};

// Pisahkan logic load detail SPK biar bisa dipanggil ulang setelah otorisasi sukses
const loadSpkDetail = async (spkNomor: string) => {
  const existingSpkNomors = fd.value.Detail.filter((r) => r.SpkNomor).map(
    (r) => r.SpkNomor,
  );
  const res = await svc.getSpkDetail(
    spkNomor,
    fd.value.KodeCus,
    divisiStr.value,
    (route.query.nomor as string) || "",
    existingSpkNomors,
  );
  const rows: any[] = res.data.data || [];
  for (const r of rows) {
    const dup = fd.value.Detail.find(
      (x) => x.SpkNomor === r.SpkNomor && x.Ukuran === r.Ukuran,
    );
    if (!dup) fd.value.Detail.push({ ...r, _key: _key++ });
  }
};

const otorisasiJadwalPending = ref<any>(null);

const submitOtorisasi = async () => {
  if (!otorisasiJawaban.value.trim()) {
    toast.warning("Kode otorisasi belum diisi.");
    return;
  }
  isOtorisasiLoading.value = true;
  try {
    const res = await svc.submitOtorisasi(
      otorisasiSpkPending.value,
      otorisasiKode.value,
      otorisasiJawaban.value,
    );
    toast.success(`Otorisasi berhasil oleh ${res.data.data.otorisator}.`);
    showOtorisasiPanel.value = false;

    isLoadingSpk.value = true;
    if (otorisasiJadwalPending.value) {
      await loadSpkDetailWithJadwal(otorisasiJadwalPending.value);
      otorisasiJadwalPending.value = null;
    } else {
      await loadSpkDetail(otorisasiSpkPending.value);
    }
    ensureEmptyRow();
    otorisasiSpkPending.value = "";
  } catch (e: any) {
    toast.error(e.response?.data?.message || "Otorisasi salah.");
    otorisasiJawaban.value = "";
  } finally {
    isOtorisasiLoading.value = false;
    isLoadingSpk.value = false;
  }
};

const cancelOtorisasi = () => {
  showOtorisasiPanel.value = false;
  otorisasiSpkPending.value = "";
  otorisasiJadwalPending.value = null;
  otorisasiJawaban.value = "";
};

// F2 — pilih Jadwal Kirim
const openJadwalModal = (rowKey?: number) => {
  if (!fd.value.KodePerush) {
    toast.warning("Perusahaan diisi dulu.");
    return;
  }
  if (!fd.value.KodeCus) {
    toast.warning("Customer diisi dulu.");
    return;
  }
  activeRowKey.value = rowKey ?? null;
  showJadwalModal.value = true;
};

const selectJadwal = async (item: any) => {
  showJadwalModal.value = false;
  if (activeRowKey.value !== null) {
    const idx = fd.value.Detail.findIndex(
      (r) => r._key === activeRowKey.value && !r.SpkNomor,
    );
    if (idx !== -1) fd.value.Detail.splice(idx, 1);
    activeRowKey.value = null;
  }

  isLoadingSpk.value = true;
  try {
    // Cek piutang dulu — sama seperti jalur F1
    const piutangRes = await svc.cekPiutang(item.SPK, fd.value.KodeCus);
    const piutang = piutangRes.data.data;

    if (!piutang.lunas && !piutang.korporasi) {
      otorisasiSpkPending.value = item.SPK;
      otorisasiJadwalPending.value = item; // simpan info no kirim untuk dipakai setelah otorisasi sukses
      const kodeRes = await svc.getKodeOtorisasi();
      otorisasiKode.value = kodeRes.data.data.kode;
      otorisasiJawaban.value = "";
      showOtorisasiPanel.value = true;
      isLoadingSpk.value = false;
      return;
    }

    await loadSpkDetailWithJadwal(item);
  } catch (e: any) {
    toast.error(e.response?.data?.message || "Gagal load SPK dari jadwal.");
  } finally {
    isLoadingSpk.value = false;
    if (!showOtorisasiPanel.value) ensureEmptyRow();
  }
};

const loadSpkDetailWithJadwal = async (item: any) => {
  const res = await svc.getSpkDetail(
    item.SPK,
    fd.value.KodeCus,
    divisiStr.value,
    (route.query.nomor as string) || "",
  );
  const rows: any[] = res.data.data || [];
  for (const r of rows) {
    fd.value.Detail.push({
      ...r,
      _key: _key++,
      NoKirim: item.NoKirim || "",
      IdKirim: item.NoUrut || 0,
      Uraian: item.Uraian || "",
    });
  }
};

// Alokasi History
// ── Loading state untuk alokasi ────────────────────────────────────────
const isLoadingAlokasi = ref(false);

// ── Alokasi History — ganti ke modal dengan loading ────────────────────
const showAlokasiHistoryModal = ref(false);
const alokasiHistoryList = ref<any[]>([]);
const isLoadingAlokasiHistory = ref(false);
const alokasiHistoryPage = ref(1);
const alokasiHistoryTotal = ref(0);
const alokasiHistoryPerPage = 20;

const alokasiHistoryPages = computed(() =>
  Math.max(1, Math.ceil(alokasiHistoryTotal.value / alokasiHistoryPerPage)),
);

const fetchAlokasiHistory = async (page = 1) => {
  if (!fd.value.KodeCus) return;
  isLoadingAlokasiHistory.value = true;
  alokasiHistoryPage.value = page;
  try {
    const res = await api.get("/lookups/history-alokasi", {
      params: {
        cusKode: fd.value.KodeCus,
        page,
        limit: alokasiHistoryPerPage,
      },
    });
    // Support both paginated and non-paginated response
    const d = res.data.data;
    if (Array.isArray(d)) {
      alokasiHistoryList.value = d;
      alokasiHistoryTotal.value = d.length;
    } else {
      alokasiHistoryList.value = d.items ?? [];
      alokasiHistoryTotal.value = d.total ?? d.items?.length ?? 0;
    }
  } catch {
    toast.error("Gagal memuat alokasi history.");
  } finally {
    isLoadingAlokasiHistory.value = false;
  }
};

const openAlokasiHistory = async () => {
  if (!fd.value.KodeCus) {
    toast.warning("Customer diisi dulu.");
    return;
  }
  showAlokasiHistoryModal.value = true;
  await fetchAlokasiHistory(1);
};

const selectAlokasiHistory = (item: any) => {
  fd.value.AlamatCus = item.Alamat || "";
  fd.value.KotaCus = item.Kota || "";
  showAlokasiHistoryModal.value = false;
};

// Alokasi SPK
// ── Alokasi SPK — ganti ke modal dengan loading ─────────────────────────
const showAlokasiSpkModal = ref(false);
const alokasiSpkList = ref<any[]>([]);
const isLoadingAlokasiSpk = ref(false);
const alokasiSpkPage = ref(1);
const alokasiSpkTotal = ref(0);
const alokasiSpkNomor = ref("");
const alokasiSpkQ = ref("");
const alokasiSpkPerPage = 20;

const alokasiSpkPages = computed(() =>
  Math.max(1, Math.ceil(alokasiSpkTotal.value / alokasiSpkPerPage)),
);

const fetchAlokasiSpk = async (page = 1) => {
  isLoadingAlokasiSpk.value = true;
  alokasiSpkPage.value = page;
  try {
    const res = await api.get("/penjualan/surat-jalan-form/alokasi-spk", {
      params: {
        spkNomor: alokasiSpkNomor.value,
        page,
        limit: alokasiSpkPerPage,
        q: alokasiSpkQ.value,
      },
    });
    const d = res.data.data;
    if (Array.isArray(d)) {
      alokasiSpkList.value = d;
      alokasiSpkTotal.value = d.length;
    } else {
      alokasiSpkList.value = d.items ?? [];
      alokasiSpkTotal.value = d.total ?? d.items?.length ?? 0;
    }
  } catch {
    toast.error("Gagal memuat alokasi SO.");
  } finally {
    isLoadingAlokasiSpk.value = false;
  }
};

const openAlokasiSpk = async () => {
  const spk = fd.value.Detail.find((r) => r.SpkNomor)?.SpkNomor || "";
  if (!spk) {
    toast.warning("Input SO dulu.");
    return;
  }
  alokasiSpkNomor.value = spk;
  alokasiSpkQ.value = "";
  showAlokasiSpkModal.value = true;
  await fetchAlokasiSpk(1);
};

let alokasiSpkDebounce: ReturnType<typeof setTimeout> | null = null;
const onAlokasiSpkSearch = (q: string) => {
  alokasiSpkQ.value = q;
  if (alokasiSpkDebounce) clearTimeout(alokasiSpkDebounce);
  alokasiSpkDebounce = setTimeout(() => fetchAlokasiSpk(1), 400);
};

const selectAlokasiSpk = (item: any) => {
  fd.value.AlamatCus = item.Alamat || "";
  fd.value.KotaCus = item.Kota || "";
  showAlokasiSpkModal.value = false;
};

// Hapus baris
const removeDetail = (row: DetailRow) => {
  if (!row.SpkNomor) return;
  const idx = fd.value.Detail.indexOf(row);
  if (idx !== -1) fd.value.Detail.splice(idx, 1);
  ensureEmptyRow();
};

// ── Computed ─────────────────────────────────────────────────────────────
const totalJumlah = computed(() =>
  fd.value.Detail.reduce((s, r) => s + Number(r.Jumlah || 0), 0),
);

// ── Validate ─────────────────────────────────────────────────────────────
const validateSave = () => {
  // Cek approved — sesuai Delphi: "Sudah di Approve. Tidak bisa disimpan."
  if (isEditMode.value && fd.value.SjApprove === 1) {
    toast.error("Sudah di Approve.\nTidak bisa disimpan.");
    return;
  }

  if (!fd.value.KodePerush) {
    toast.warning("Perusahaan belum diisi.");
    return;
  }
  if (!fd.value.GudangKode) {
    toast.warning("Gudang tidak boleh kosong.");
    return;
  }
  if (!fd.value.KodeCus) {
    toast.warning("Customer belum diisi.");
    return;
  }

  const valid = fd.value.Detail.filter(
    (r) => r.NamaSpk && Number(r.Jumlah) !== 0,
  );
  if (!valid.length) {
    toast.warning("Detail harus diisi.");
    return;
  }
  if (totalJumlah.value === 0) {
    toast.warning("Jumlah SJ masih kosong semua.");
    return;
  }

  for (const r of valid) {
    if (Number(r.Jumlah) > Number(r.Kurang)) {
      toast.warning(`Jumlah melebihi kekurangan pada SO ${r.SpkNomor}.`);
      return;
    }
  }

  // Cek PIN5 status
  if (
    fd.value.Xminta5 === "MINTA" ||
    fd.value.Xminta5 === "WAIT" ||
    fd.value.Xminta5 === "TOLAK"
  ) {
    toast.error(
      "Transaksi sudah diclose. Silahkan minta approve untuk menyimpan perubahan data.",
    );
    return;
  }

  showSaveDialog.value = true;
};

// ── Print ─────────────────────────────────────────────────────────────────
const skipPrint = () => {
  showPrintDialog.value = false;
  router.push({ name: "SuratJalanBrowse" });
};
const doCetak = (mode: "dotmatrix" | "inkjet") => {
  showPrintDialog.value = false;
  const url = router.resolve({
    name: "SuratJalanPrint",
    query: { nomor: savedNomor.value, mode },
  }).href;
  window.open(url, "_blank");
  router.push({ name: "SuratJalanBrowse" });
};

// ── Lifecycle ─────────────────────────────────────────────────────────────
onMounted(async () => {
  // Load divisi list
  const divRes = await svc.getDivisiList();
  divisiList.value = divRes.data.data || [];

  if (route.query.nomor) {
    await fetchData();
    ensureEmptyRow();
  } else {
    fd.value.Tanggal = todayLocal();
    ensureEmptyRow();
  }
});
</script>

<template>
  <BaseForm
    :title="isEditMode ? 'Ubah Surat Jalan' : 'Tambah Surat Jalan'"
    menu-id="153"
    :icon="IconTruck"
    :is-loading="isLoading"
    :is-saving="isSaving"
    item-name="Surat Jalan"
    v-model:show-save-dialog="showSaveDialog"
    v-model:show-cancel-dialog="showCancelDialog"
    v-model:show-close-dialog="showCloseDialog"
    @validate-save="validateSave"
    @confirm-save="executeSave"
    @confirm-cancel="executeCancel"
    @confirm-close="executeClose"
  >
    <template #left-column>
      <div class="desktop-form-section">
        <div class="sec-title">Header</div>

        <!-- Nomor -->
        <div class="fg">
          <label class="lb w90">Nomor SJ</label>
          <input
            :value="fd.NomorSJ || '(Otomatis)'"
            readonly
            class="inp ro"
            style="width: 160px"
          />
          <span
            v-if="fd.PraSJ"
            class="muted"
            style="font-size: 10px; margin-left: 4px"
          >
            PraSJ: {{ fd.PraSJ }}
          </span>
        </div>

        <!-- Divisi -->
        <div class="fg mt4">
          <label class="lb w90">Divisi</label>
          <select v-model="fd.Divisi" class="inp sel" :disabled="isEditMode">
            <option
              v-for="d in divisiList"
              :key="d.kode"
              :value="String(d.kode)"
            >
              {{ d.kode }} - {{ d.nama }}
            </option>
          </select>
        </div>

        <!-- Tanggal -->
        <div class="fg mt4">
          <label class="lb w90">Tanggal</label>
          <input type="date" v-model="fd.Tanggal" class="inp" />
        </div>

        <!-- Perusahaan -->
        <div class="fg mt4">
          <label class="lb w90">Perusahaan</label>
          <div class="ig" style="flex: 1">
            <input
              v-model="fd.KodePerush"
              class="inp"
              style="width: 60px; flex-shrink: 0; text-transform: uppercase"
              placeholder="Kode"
              :readonly="isEditMode"
              @keydown.enter.prevent="onPerushEnter"
              @keydown.f1.prevent="showPerushModal = true"
              @blur="onPerushEnter"
            />
            <input
              :value="fd.NamaPerush"
              readonly
              class="inp ro"
              style="flex: 1; min-width: 0"
              placeholder="Nama perusahaan..."
              tabindex="-1"
            />
            <button
              class="ibtn"
              :disabled="isEditMode"
              @click="showPerushModal = true"
            >
              <IconSearch :size="11" color="#1565c0" />
            </button>
          </div>
        </div>

        <!-- Gudang -->
        <div class="fg mt4">
          <label class="lb w90">Gudang</label>
          <div class="ig" style="flex: 1">
            <input
              v-model="fd.GudangKode"
              class="inp"
              style="width: 65px; flex-shrink: 0; text-transform: uppercase"
              placeholder="Kode"
              @keydown.enter.prevent="onGudangEnter"
              @keydown.f1.prevent="showGudangModal = true"
              @blur="onGudangEnter"
            />
            <input
              :value="fd.GudangNama"
              readonly
              class="inp ro"
              style="flex: 1; min-width: 0"
              placeholder="Nama gudang..."
              tabindex="-1"
            />
            <button class="ibtn" @click="showGudangModal = true">
              <IconSearch :size="11" color="#1565c0" />
            </button>
          </div>
        </div>

        <!-- Customer -->
        <div class="fg mt4">
          <label class="lb w90">Customer</label>
          <div class="ig" style="flex: 1">
            <input
              v-model="fd.KodeCus"
              class="inp"
              style="width: 65px; flex-shrink: 0; text-transform: uppercase"
              placeholder="Kode"
              @keydown.enter.prevent="onCusEnter"
              @keydown.f1.prevent="showCusModal = true"
              @blur="onCusEnter"
            />
            <input
              :value="fd.NamaCus"
              readonly
              class="inp ro"
              style="flex: 1; min-width: 0"
              placeholder="Nama customer..."
              tabindex="-1"
            />
            <button class="ibtn" @click="showCusModal = true">
              <IconSearch :size="11" color="#1565c0" />
            </button>
          </div>
        </div>

        <!-- Alamat Customer -->
        <div class="fg mt4">
          <label class="lb w90">Alamat</label>
          <div style="flex: 1; display: flex; flex-direction: column; gap: 3px">
            <input
              v-model="fd.AlamatCus"
              class="inp"
              placeholder="Alamat pengiriman..."
            />
            <input v-model="fd.KotaCus" class="inp" placeholder="Kota..." />
          </div>
        </div>

        <!-- Inv. Proforma -->
        <div class="fg mt4">
          <label class="lb w90">Inv. Proforma</label>
          <div class="ig" style="flex: 1">
            <input
              v-model="fd.InvPro"
              class="inp"
              style="flex: 1; min-width: 0; text-transform: uppercase"
              placeholder="Ketik nomor / F1 cari..."
              @keydown.enter.prevent="onInvProEnter"
              @keydown.f1.prevent="showInvProModal = true"
              @blur="onInvProEnter"
            />
            <button
              v-if="fd.InvPro"
              class="ibtn"
              style="
                color: #c62828;
                background: #ffebee;
                border-left: 1px solid #ffcdd2;
              "
              @click="fd.InvPro = ''"
            >
              ✕
            </button>
            <button class="ibtn" @click="showInvProModal = true">
              <IconSearch :size="11" color="#1565c0" />
            </button>
          </div>
        </div>

        <!-- Keterangan -->
        <div class="fg mt4">
          <label class="lb w90">Keterangan</label>
          <input
            v-model="fd.Keterangan"
            class="inp"
            style="flex: 1"
            placeholder="Keterangan..."
          />
        </div>

        <!-- Alokasi buttons -->
        <div class="fg mt6" style="gap: 6px">
          <button class="abtn" @click="openAlokasiHistory">
            <IconHistory :size="11" style="margin-right: 3px" /> Alokasi History
          </button>
          <button class="abtn" @click="openAlokasiSpk">
            <IconMapPin :size="11" style="margin-right: 3px" /> Alokasi SO
          </button>
        </div>
      </div>

      <!-- Ringkasan -->
      <div class="desktop-form-section">
        <div class="sec-title">Ringkasan</div>
        <div class="fg mt4">
          <label class="lb w90">Total Jumlah</label>
          <span class="summary-val">{{ num(totalJumlah) }}</span>
        </div>
        <!-- PIN5 status -->
        <div v-if="fd.Xminta5" class="fg mt4">
          <label class="lb w90">Status</label>
          <span
            class="chip"
            :class="{
              'chip-blue': fd.Xminta5 === 'WAIT',
              'chip-green': fd.Xminta5 === 'ACC',
              'chip-red': fd.Xminta5 === 'TOLAK' || fd.Xminta5 === 'MINTA',
            }"
            >{{ fd.Xminta5 }}</span
          >
        </div>
        <div
          v-if="fd.IsTutupBuku && fd.Xminta5 !== 'ACC'"
          class="tutup-buku-banner"
        >
          <IconAlertTriangle :size="14" />
          Periode transaksi ini sudah <b>Tutup Buku</b>. Pengajuan PIN
          diperlukan untuk menyimpan perubahan.
        </div>
      </div>
    </template>

    <template #right-column>
      <div
        class="desktop-form-section"
        style="flex: 1; min-height: 0; display: flex; flex-direction: column"
      >
        <div class="dtbar">
          <span class="sec-title">Detail SO</span>
          <span class="note ml8"
            >Enter/F1 = pilih SO, F2 = pilih dari Jadwal Kirim</span
          >
          <div style="display: flex; gap: 6px; margin-left: auto">
            <button class="tbtn tbtn-green" @click="openSpkModal()">
              + SO (F1)
            </button>
            <button class="tbtn tbtn-teal" @click="openJadwalModal()">
              + Jadwal (F2)
            </button>
          </div>
        </div>

        <div
          style="
            position: relative;
            flex: 1;
            min-height: 0;
            display: flex;
            flex-direction: column;
          "
        >
          <!-- Loading overlay -->
          <div v-if="isLoadingSpk" class="grid-loading-overlay">
            <v-progress-circular
              indeterminate
              color="primary"
              size="24"
              width="2"
            />
            <span>Memuat data SO...</span>
          </div>

          <div class="gwrap">
            <table class="gtbl">
              <thead>
                <tr>
                  <th style="width: 24px">#</th>
                  <th style="width: 130px">No. SO</th>
                  <th style="min-width: 160px">Nama SO</th>
                  <th style="width: 90px">Ukuran</th>
                  <th style="width: 70px" class="tr">Sudah</th>
                  <th style="width: 70px" class="tr">Kurang</th>
                  <th style="width: 80px" class="tr hl-col">Jumlah</th>
                  <th style="width: 72px" class="tr hl-col">Koli</th>
                  <th style="width: 110px">Keterangan</th>
                  <th style="width: 110px">Uraian</th>
                  <th style="width: 110px">No. Kirim</th>
                  <th style="width: 30px"></th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="(row, i) in fd.Detail"
                  :key="row._key"
                  :class="[
                    i % 2 === 1 && row.SpkNomor ? 'rs' : '',
                    !row.SpkNomor ? 'row-empty' : '',
                    row.SpkNomor && Number(row.Jumlah) > Number(row.Kurang)
                      ? 'row-over'
                      : '',
                  ]"
                >
                  <td class="tc muted" style="font-size: 10px">
                    {{ row.SpkNomor ? i + 1 : "" }}
                  </td>
                  <!-- No SPK — baris kosong -->
                  <td>
                    <template v-if="!row.SpkNomor">
                      <div style="display: flex; align-items: center; gap: 2px">
                        <input
                          v-model="spkInputValues[row._key]"
                          class="ci mono"
                          placeholder="Ketik SO/Enter, F1=Cari"
                          style="flex: 1; font-size: 10px"
                          @keydown.enter.prevent="onSpkInputEnter(row._key)"
                          @keydown.f1.prevent="openSpkModal(row._key)"
                          @keydown.f2.prevent="openJadwalModal(row._key)"
                        />
                        <button
                          class="ibtn-sm"
                          tabindex="-1"
                          @click.stop="openSpkModal(row._key)"
                        >
                          <IconSearch :size="9" color="#1565c0" />
                        </button>
                      </div>
                    </template>
                    <input
                      v-else
                      :value="row.SpkNomor"
                      readonly
                      class="ci mono"
                    />
                  </td>
                  <td><input :value="row.NamaSpk" readonly class="ci" /></td>
                  <td><input :value="row.Ukuran" readonly class="ci" /></td>
                  <td>
                    <input
                      :value="row.SpkNomor ? num(row.Sudah) : ''"
                      readonly
                      class="ci tr ro"
                    />
                  </td>
                  <td>
                    <input
                      v-if="row.SpkNomor"
                      :value="num(row.Kurang)"
                      readonly
                      class="ci tr ro"
                      :style="
                        Number(row.Kurang) < 0
                          ? 'color:#c62828;font-weight:700'
                          : ''
                      "
                    />
                  </td>
                  <td>
                    <input
                      v-if="row.SpkNomor"
                      v-model.number="row.Jumlah"
                      type="number"
                      class="ci tr hl"
                      @focus="sel"
                    />
                  </td>
                  <td>
                    <input
                      v-if="row.SpkNomor"
                      v-model.number="row.Koli"
                      type="number"
                      class="ci tr hl"
                      @focus="sel"
                    />
                  </td>
                  <td>
                    <input
                      v-if="row.SpkNomor"
                      v-model="row.Keterangan"
                      class="ci"
                    />
                  </td>
                  <td>
                    <input
                      v-if="row.SpkNomor"
                      v-model="row.Uraian"
                      class="ci"
                      readonly
                      style="color: #777"
                    />
                  </td>
                  <td>
                    <input
                      v-if="row.SpkNomor"
                      v-model="row.NoKirim"
                      class="ci mono"
                      style="font-size: 10px"
                      readonly
                    />
                  </td>
                  <td class="tc">
                    <button
                      v-if="row.SpkNomor"
                      class="del-btn"
                      @click="removeDetail(row)"
                    >
                      ×
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="grid-summary">
            <span
              >Total Jumlah: <b>{{ num(totalJumlah) }}</b></span
            >
          </div>
        </div>
      </div>
    </template>
  </BaseForm>

  <!-- ── Modals ── -->
  <PerusahaanSearchModal v-model="showPerushModal" @selected="selectPerush" />

  <CustomerSearchModal v-model="showCusModal" @selected="selectCustomer" />

  <InvProformaSearchModal
    v-model="showInvProModal"
    :cus-kode="fd.KodeCus"
    @selected="selectInvPro"
  />

  <GudangJadiSearchModal
    v-model="showGudangModal"
    :divisi="Number(divisiStr)"
    @selected="selectGudang"
  />

  <SpkSearchModal
    v-model="showSpkModal"
    filter-mode="sj"
    :cus-kode="fd.KodeCus"
    :perush-kode="fd.KodePerush"
    :divisi="fd.Divisi"
    @selected="selectSpk"
  />

  <!-- Jadwal Kirim Modal -->
  <JadwalKirimSearchModal
    v-model="showJadwalModal"
    :cus-kode="fd.KodeCus"
    :perush-kode="fd.KodePerush"
    :divisi="fd.Divisi"
    :inv-pro="fd.InvPro"
    @selected="selectJadwal"
  />

  <!-- ── Modal Alokasi History ── -->
  <v-dialog v-model="showAlokasiHistoryModal" max-width="540px">
    <div class="lookup-card">
      <div class="lookup-header">
        <IconHistory :size="14" />
        Alokasi History — {{ fd.NamaCus || fd.KodeCus }}
        <v-spacer />
        <button class="lookup-close" @click="showAlokasiHistoryModal = false">
          ✕
        </button>
      </div>

      <!-- Loading -->
      <div v-if="isLoadingAlokasiHistory" class="alokasi-loading">
        <v-progress-circular
          indeterminate
          color="primary"
          size="28"
          width="3"
        />
        <span>Memuat history alokasi...</span>
      </div>

      <template v-else>
        <div class="lookup-table-wrap">
          <div v-if="!alokasiHistoryList.length" class="lookup-state">
            Tidak ada history alamat untuk customer ini
          </div>
          <table v-else class="lookup-table">
            <thead>
              <tr>
                <th style="width: 130px">KOTA</th>
                <th>ALAMAT</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="(a, i) in alokasiHistoryList"
                :key="i"
                class="lookup-row"
                @click="selectAlokasiHistory(a)"
              >
                <td style="font-weight: 600; color: #1565c0">{{ a.Kota }}</td>
                <td>{{ a.Alamat }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Pagination -->
        <div class="lookup-footer">
          <span class="footer-count">
            {{ alokasiHistoryList.length }} dari {{ alokasiHistoryTotal }} data
          </span>
          <div class="page-controls" v-if="alokasiHistoryPages > 1">
            <button
              class="page-btn"
              :disabled="alokasiHistoryPage === 1"
              @click="fetchAlokasiHistory(1)"
            >
              «
            </button>
            <button
              class="page-btn"
              :disabled="alokasiHistoryPage === 1"
              @click="fetchAlokasiHistory(alokasiHistoryPage - 1)"
            >
              ‹
            </button>
            <button
              v-for="p in alokasiHistoryPages"
              :key="p"
              class="page-btn"
              :class="{ active: p === alokasiHistoryPage }"
              @click="fetchAlokasiHistory(p)"
            >
              {{ p }}
            </button>
            <button
              class="page-btn"
              :disabled="alokasiHistoryPage === alokasiHistoryPages"
              @click="fetchAlokasiHistory(alokasiHistoryPage + 1)"
            >
              ›
            </button>
            <button
              class="page-btn"
              :disabled="alokasiHistoryPage === alokasiHistoryPages"
              @click="fetchAlokasiHistory(alokasiHistoryPages)"
            >
              »
            </button>
          </div>
          <span style="font-size: 10px; color: #bdbdbd; font-style: italic">
            Klik baris untuk memilih alamat
          </span>
        </div>
      </template>
    </div>
  </v-dialog>

  <!-- ── Modal Alokasi SPK ── -->
  <v-dialog v-model="showAlokasiSpkModal" max-width="560px">
    <div class="lookup-card">
      <div class="lookup-header">
        <IconMapPin :size="14" />
        Alokasi SO — {{ alokasiSpkNomor }}
        <v-spacer />
        <button class="lookup-close" @click="showAlokasiSpkModal = false">
          ✕
        </button>
      </div>

      <!-- Search bar -->
      <div class="lookup-search">
        <IconSearch :size="14" color="#9e9e9e" />
        <input
          :value="alokasiSpkQ"
          @input="onAlokasiSpkSearch(($event.target as HTMLInputElement).value)"
          class="search-input"
          placeholder="Cari alamat, kota, person..."
        />
        <button
          v-if="alokasiSpkQ"
          class="search-clear"
          @click="onAlokasiSpkSearch('')"
        >
          ✕
        </button>
      </div>

      <!-- Loading -->
      <div v-if="isLoadingAlokasiSpk" class="alokasi-loading">
        <v-progress-circular
          indeterminate
          color="primary"
          size="28"
          width="3"
        />
        <span>Memuat alokasi SO...</span>
      </div>

      <template v-else>
        <div class="lookup-table-wrap">
          <div v-if="!alokasiSpkList.length" class="lookup-state">
            Tidak ada data alokasi untuk SO ini
          </div>
          <table v-else class="lookup-table">
            <thead>
              <tr>
                <th style="width: 120px">KOTA</th>
                <th>ALAMAT</th>
                <th style="width: 90px">PERSON</th>
                <th style="width: 70px; text-align: right">JUMLAH</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="(a, i) in alokasiSpkList"
                :key="i"
                class="lookup-row"
                @click="selectAlokasiSpk(a)"
              >
                <td style="font-weight: 600; color: #1565c0">{{ a.Kota }}</td>
                <td>{{ a.Alamat }}</td>
                <td>{{ a.Person }}</td>
                <td style="text-align: right">{{ num(a.Jumlah) }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Pagination -->
        <div class="lookup-footer">
          <span class="footer-count">
            {{ alokasiSpkList.length }} dari {{ alokasiSpkTotal }} data
          </span>
          <div class="page-controls" v-if="alokasiSpkPages > 1">
            <button
              class="page-btn"
              :disabled="alokasiSpkPage === 1"
              @click="fetchAlokasiSpk(1)"
            >
              «
            </button>
            <button
              class="page-btn"
              :disabled="alokasiSpkPage === 1"
              @click="fetchAlokasiSpk(alokasiSpkPage - 1)"
            >
              ‹
            </button>
            <button
              v-for="p in alokasiSpkPages"
              :key="p"
              class="page-btn"
              :class="{ active: p === alokasiSpkPage }"
              @click="fetchAlokasiSpk(p)"
            >
              {{ p }}
            </button>
            <button
              class="page-btn"
              :disabled="alokasiSpkPage === alokasiSpkPages"
              @click="fetchAlokasiSpk(alokasiSpkPage + 1)"
            >
              ›
            </button>
            <button
              class="page-btn"
              :disabled="alokasiSpkPage === alokasiSpkPages"
              @click="fetchAlokasiSpk(alokasiSpkPages)"
            >
              »
            </button>
          </div>
          <span style="font-size: 10px; color: #bdbdbd; font-style: italic">
            Klik baris untuk memilih alamat
          </span>
        </div>
      </template>
    </div>
  </v-dialog>

  <!-- Dialog Print -->
  <v-dialog v-model="showPrintDialog" max-width="360px" persistent>
    <v-card class="rounded-lg">
      <v-card-title
        class="pa-3 bg-primary text-white"
        style="font-size: 13px; font-weight: 700"
      >
        Cetak Surat Jalan
      </v-card-title>
      <v-card-text class="pa-4" style="font-size: 12px">
        Data <b>{{ savedNomor }}</b> berhasil disimpan.<br />Ingin mencetak?
      </v-card-text>
      <v-card-actions class="pa-3 border-t" style="gap: 6px; flex-wrap: wrap">
        <v-btn variant="text" size="small" @click="skipPrint">Tidak</v-btn>
        <v-spacer />
        <v-btn
          variant="outlined"
          size="small"
          color="blue-grey"
          @click="doCetak('dotmatrix')"
        >
          🖨️ Dot Matrix
        </v-btn>
        <v-btn
          variant="flat"
          size="small"
          color="primary"
          @click="doCetak('inkjet')"
        >
          🖨️ InkJet (A4)
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <!-- ── Panel Otorisasi SPK Belum Lunas ── -->
  <v-dialog v-model="showOtorisasiPanel" max-width="380px" persistent>
    <v-card class="rounded-lg">
      <v-card-title
        class="pa-3 bg-error text-white"
        style="font-size: 13px; font-weight: 700"
      >
        <IconAlertTriangle :size="15" style="margin-right: 6px" />
        Otorisasi SO Belum Lunas
      </v-card-title>
      <v-card-text class="pa-4">
        <div style="font-size: 12px; margin-bottom: 10px; color: #c62828">
          SO <b>{{ otorisasiSpkPending }}</b> belum lunas.<br />
          Mintakan otorisasi agar bisa dilanjutkan.
        </div>

        <div style="text-align: center; margin-bottom: 12px">
          <div style="font-size: 10px; color: #777; margin-bottom: 4px">
            Kode Tantangan
          </div>
          <div
            style="
              font-size: 28px;
              font-weight: 900;
              color: #1565c0;
              letter-spacing: 0.1em;
              font-family: monospace;
            "
          >
            {{ otorisasiKode }}
          </div>
        </div>

        <label style="font-size: 11px; font-weight: 600">Kode Otorisasi</label>
        <input
          v-model="otorisasiJawaban"
          class="inp"
          style="
            width: 100%;
            margin-top: 4px;
            text-align: center;
            font-size: 16px;
            font-family: monospace;
            letter-spacing: 0.05em;
          "
          placeholder="Masukkan kode jawaban..."
          autofocus
          @keydown.enter.prevent="submitOtorisasi"
        />
      </v-card-text>
      <v-card-actions class="pa-3 border-t">
        <v-btn variant="text" size="small" @click="cancelOtorisasi"
          >Batal</v-btn
        >
        <v-spacer />
        <v-btn
          variant="flat"
          size="small"
          color="error"
          :loading="isOtorisasiLoading"
          @click="submitOtorisasi"
          >Validasi</v-btn
        >
      </v-card-actions>
    </v-card>
  </v-dialog>

  <!-- ── Dialog Konfirmasi Ganti Customer ── -->
  <v-dialog v-model="showCustomerChangeDialog" max-width="360px" persistent>
    <v-card class="rounded-lg">
      <v-card-title
        class="pa-3 bg-warning text-white"
        style="font-size: 13px; font-weight: 700"
      >
        <IconAlertTriangle :size="15" style="margin-right: 6px" />
        Konfirmasi Ganti Customer
      </v-card-title>
      <v-card-text class="pa-4" style="font-size: 12px">
        Detail SO sudah ada.<br />
        Mengganti customer ke
        <b>{{ pendingCustomerItem?.Nama || pendingCustomerItem?.cus_nama }}</b>
        akan menghapus semua detail yang sudah diisi.<br /><br />
        Yakin ingin melanjutkan?
      </v-card-text>
      <v-card-actions class="pa-3 border-t">
        <v-btn variant="text" size="small" @click="cancelCustomerChange"
          >Batal</v-btn
        >
        <v-spacer />
        <v-btn
          variant="flat"
          size="small"
          color="warning"
          @click="confirmCustomerChange"
        >
          Ya, Ganti Customer
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.fg {
  display: flex;
  align-items: center;
  gap: 5px;
}
.mt4 {
  margin-top: 4px;
}
.mt6 {
  margin-top: 6px;
}
.ml8 {
  margin-left: 8px;
}
.lb {
  font-size: 11px;
  font-weight: 500;
  color: #444;
  white-space: nowrap;
}
.w90 {
  width: 90px;
  flex-shrink: 0;
}
.note {
  font-size: 10px;
  color: #777;
}
.tr {
  text-align: right;
}
.tc {
  text-align: center;
}
.muted {
  color: #9e9e9e;
}
.mono {
  font-family: monospace;
}

.sec-title {
  font-size: 10px;
  font-weight: 700;
  color: #1565c0;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 3px;
}
.inp {
  height: 24px;
  border: 1px solid #bdbdbd;
  border-radius: 3px;
  padding: 0 5px;
  font-size: 12px;
  outline: none;
  background: white;
  font-family: inherit;
}
.inp:focus {
  border-color: #1565c0;
}
.ro {
  background: #f0f0f0 !important;
  color: #555 !important;
}
.sel {
  height: 24px;
  font-size: 12px;
  border: 1px solid #bdbdbd;
  border-radius: 3px;
  outline: none;
  padding: 0 4px;
}
.ig {
  display: flex;
  border: 1px solid #bdbdbd;
  border-radius: 3px;
  height: 24px;
  background: white;
  overflow: hidden;
}
.ig .inp {
  border: none;
  height: 22px;
  border-radius: 0;
  flex: 1;
  min-width: 0;
}
.ibtn {
  width: 24px;
  min-width: 24px;
  flex-shrink: 0;
  background: #e3f2fd;
  border: none;
  border-left: 1px solid #bdbdbd;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}
.ibtn:hover {
  background: #bbdefb;
}
.ibtn-sm {
  width: 18px;
  height: 18px;
  flex-shrink: 0;
  background: #e3f2fd;
  border: 1px solid #90caf9;
  border-radius: 2px;
  cursor: pointer;
  font-size: 9px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
}
.ibtn-sm:hover {
  background: #bbdefb;
}

.summary-val {
  font-size: 13px;
  font-weight: 700;
  color: #1565c0;
}
.chip {
  font-size: 10px;
  font-weight: 700;
  padding: 1px 7px;
  border-radius: 8px;
}
.chip-blue {
  background: #e3f2fd;
  color: #1565c0;
}
.chip-green {
  background: #e8f5e9;
  color: #2e7d32;
}
.chip-red {
  background: #ffebee;
  color: #c62828;
}

.abtn {
  display: flex;
  align-items: center;
  height: 24px;
  padding: 0 8px;
  border: 1px solid #90caf9;
  border-radius: 3px;
  background: #e3f2fd;
  color: #1565c0;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
}
.abtn:hover {
  background: #bbdefb;
}

/* Grid */
.dtbar {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 4px;
  flex-shrink: 0;
}
.gwrap {
  flex: 1;
  overflow: auto;
  border: 1px solid #e0e0e0;
  border-radius: 3px;
  min-height: 0;
}
.gtbl {
  border-collapse: collapse;
  font-size: 11px;
  min-width: max-content;
  width: 100%;
}
.gtbl th {
  background: #1565c0;
  color: white;
  padding: 3px 4px;
  font-weight: 700;
  white-space: nowrap;
  position: sticky;
  top: 0;
  z-index: 2;
}
.gtbl td {
  padding: 2px 2px;
  border-bottom: 0.3px solid #e0e0e0;
  vertical-align: middle;
}
.rs td {
  background: #fafafa;
}
.row-empty td {
  background: #fafffe !important;
}
.row-empty:hover td {
  background: #e8f5e9 !important;
}
.row-over td {
  background: #fff3e0 !important;
}
.hl-col {
  background: #0d47a1 !important;
}

.ci {
  width: 100%;
  height: 22px;
  border: none;
  outline: none;
  padding: 0 3px;
  font-size: 11px;
  background: transparent;
  font-family: inherit;
}
.ci:focus {
  background: #fffde7;
  outline: 1px solid #1565c0;
  border-radius: 2px;
}
.ci[readonly] {
  color: #666;
  background: transparent;
}
.ci.tr {
  text-align: right;
}
.ci.hl {
  background: #fffde7 !important;
}

.del-btn {
  width: 18px;
  height: 18px;
  border: 1px solid #ffcdd2;
  border-radius: 2px;
  background: #ffebee;
  color: #c62828;
  font-size: 13px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
}
.del-btn:hover {
  background: #ffcdd2;
}

.grid-summary {
  background: #1565c0;
  color: white;
  padding: 3px 8px;
  font-size: 11px;
  font-weight: 600;
  flex-shrink: 0;
}

.grid-loading-overlay {
  position: absolute;
  inset: 0;
  background: rgba(255, 255, 255, 0.75);
  z-index: 10;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-size: 12px;
  color: #1565c0;
  font-weight: 600;
  border-radius: 3px;
}

.tbtn {
  height: 24px;
  padding: 0 8px;
  border: none;
  border-radius: 3px;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  white-space: nowrap;
}
.tbtn-green {
  background: #388e3c;
  color: white;
}
.tbtn-teal {
  background: #00796b;
  color: white;
}

/* Dropdown */
.dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  z-index: 100;
  background: white;
  border: 1px solid #bdbdbd;
  border-radius: 3px;
  max-height: 200px;
  overflow-y: auto;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}
.dropdown-item {
  display: flex;
  gap: 8px;
  padding: 5px 8px;
  cursor: pointer;
  font-size: 11px;
  border-bottom: 0.5px solid #f5f5f5;
}
.dropdown-item:hover {
  background: #e3f2fd;
}
.dropdown-item .mono {
  font-family: monospace;
  font-size: 10px;
  color: #1565c0;
  font-weight: 600;
  min-width: 50px;
  flex-shrink: 0;
}

/* Lookup modal */
.lookup-card {
  background: white;
  border-radius: 8px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  font-size: 12px;
  max-height: 80vh;
}
.lookup-header {
  display: flex;
  align-items: center;
  background: #1565c0;
  color: white;
  padding: 9px 14px;
  font-size: 13px;
  font-weight: 700;
  gap: 6px;
}
.lookup-close {
  background: transparent;
  border: none;
  color: rgba(255, 255, 255, 0.8);
  font-size: 15px;
  cursor: pointer;
}
.lookup-search-bar {
  padding: 8px 12px;
  border-bottom: 1px solid #e0e0e0;
  background: #fafafa;
}
.lookup-inp {
  width: 100%;
  height: 28px;
  border: 1px solid #bdbdbd;
  border-radius: 4px;
  padding: 0 8px;
  font-size: 12px;
  outline: none;
}
.lookup-table-wrap {
  flex: 1;
  overflow-y: auto;
  min-height: 160px;
}
.lookup-table {
  width: 100%;
  border-collapse: collapse;
}
.lookup-table thead tr {
  position: sticky;
  top: 0;
  background: #f5f5f5;
}
.lookup-table th {
  padding: 6px 8px;
  font-size: 11px;
  font-weight: 700;
  text-align: left;
  border-bottom: 2px solid #e0e0e0;
  white-space: nowrap;
}
.lookup-table td {
  padding: 4px 8px;
  border-bottom: 1px solid #f0f0f0;
}
.lookup-row {
  cursor: pointer;
}
.lookup-row:hover td {
  background: #e3f2fd;
}
.td-kode {
  font-family: monospace;
  color: #1565c0;
  font-weight: 600;
}

/* Alokasi modal */
.alokasi-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 40px;
  color: #1565c0;
  font-size: 12px;
  font-weight: 600;
  min-height: 160px;
}

.lookup-card {
  background: white;
  border-radius: 8px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  font-size: 12px;
  max-height: 80vh;
}
.lookup-header {
  display: flex;
  align-items: center;
  background: #1565c0;
  color: white;
  padding: 9px 14px;
  font-size: 13px;
  font-weight: 700;
  gap: 6px;
  flex-shrink: 0;
}
.lookup-close {
  background: transparent;
  border: none;
  color: rgba(255, 255, 255, 0.8);
  font-size: 15px;
  cursor: pointer;
  padding: 0;
}
.lookup-close:hover {
  color: white;
}
.lookup-table-wrap {
  flex: 1;
  overflow-y: auto;
  min-height: 120px;
}
.lookup-state {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 30px;
  color: #9e9e9e;
  font-size: 12px;
}
.lookup-table {
  width: 100%;
  border-collapse: collapse;
}
.lookup-table thead tr {
  position: sticky;
  top: 0;
  background: #1565c0;
  z-index: 1;
}
.lookup-table th {
  padding: 7px 10px;
  font-size: 11px;
  font-weight: 700;
  color: white;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  text-align: left;
  white-space: nowrap;
}
.lookup-table td {
  padding: 5px 10px;
  border-bottom: 1px solid #f0f0f0;
}
.lookup-row {
  cursor: pointer;
}
.lookup-row:hover td {
  background: #e3f2fd;
}
.lookup-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 7px 12px;
  border-top: 1px solid #e0e0e0;
  background: #fafafa;
  flex-shrink: 0;
}
.footer-count {
  font-size: 11px;
  color: #757575;
}

/* Lookup search bar di modal alokasi */
.lookup-search {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-bottom: 1px solid #e0e0e0;
  background: #fafafa;
  flex-shrink: 0;
}
.search-input {
  flex: 1;
  border: none;
  outline: none;
  font-size: 12px;
  background: transparent;
  color: #212121;
}
.search-input::placeholder {
  color: #9e9e9e;
}
.search-clear {
  background: transparent;
  border: none;
  color: #9e9e9e;
  font-size: 13px;
  cursor: pointer;
}

/* Pagination di footer modal */
.page-controls {
  display: flex;
  align-items: center;
  gap: 2px;
}
.page-btn {
  min-width: 26px;
  height: 24px;
  padding: 0 4px;
  border: 1px solid #e0e0e0;
  border-radius: 3px;
  background: white;
  font-size: 11px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}
.page-btn:hover:not(:disabled) {
  background: #e3f2fd;
  border-color: #90caf9;
  color: #1565c0;
}
.page-btn.active {
  background: #1565c0;
  border-color: #1565c0;
  color: white;
  font-weight: 700;
}
.page-btn:disabled {
  opacity: 0.3;
  cursor: default;
}

.tutup-buku-banner {
  display: flex;
  align-items: center;
  gap: 6px;
  background: #fff3e0;
  color: #e65100;
  padding: 6px 10px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 600;
  margin-bottom: 6px;
}
</style>
