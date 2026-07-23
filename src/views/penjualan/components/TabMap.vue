<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount } from "vue";
import { useToast } from "vue-toastification";
import { useAuthStore } from "@/stores/authStore";
import { mapFormService } from "@/services/penjualan/mapFormService";
import api from "@/services/api";
import {
  IconUpload,
  IconMaximize,
  IconPhoto,
  IconSearch,
} from "@tabler/icons-vue";

import PerusahaanSearchModal from "@/components/lookups/PerusahaanSearchModal.vue";
import CustomerSearchModal from "@/components/lookups/CustomerSearchModal.vue";
import SalesSearchModal from "@/components/lookups/SalesSearchModal.vue";
import MintaHargaSearchModal from "@/components/lookups/MintaHargaSearchModal.vue";
import JenisOrderSearchModal from "@/components/lookups/JenisOrderSearchModal.vue";
import PenawaranSearchModal from "@/components/lookups/PenawaranSearchModal.vue";
import PenawaranDetailSearchModal from "@/components/lookups/PenawaranDetailSearchModal.vue";
import PabrikSearchModal from "@/components/lookups/PabrikSearchModal.vue";
import ReferensiMapSearchModal from "@/components/lookups/ReferensiMapSearchModal.vue";
import SetoranSearchModal from "@/components/lookups/SetoranSearchModal.vue";

const authStore = useAuthStore();
const props = defineProps<{
  formData: any;
  isEdit: boolean;
  lookupOptions: any;
  mapMapData: (d: any) => any; // Terima fungsi mapping dari parent
}>();
const emit = defineEmits(["update-revisi-note", "upload-main"]);
const toast = useToast();
const isOpeningModal = ref(false);

// ── Modal states ──
const showPerushModal = ref(false);
const showCustModal = ref(false);
const showSalesModal = ref(false);
const showJoModal = ref(false);
const showMintaModal = ref(false);
const showPenawaranModal = ref(false);
const showCabMapModal = ref(false);
const showCabSpkModal = ref(false);
const showRefModal = ref(false);
const showSetoranModal = ref(false);

const showPreviewDialog = ref(false);
const showPenawaranDetailModal = ref(false);
const selectedPenawaranNomor = ref("");
const workshopCache = ref<any[]>([]);

// ── Dropdown options ──
const tipeSpkOptions = ["Premium", "Medium", ""];
const statusKerjaOptions = ["Normal", "Urgent", "Top Urgent"];
const perfectOptions = ["Y", "N"];
const revisiOptions = [
  { label: "NO", value: "N" },
  { label: "YES", value: "Y" },
];
const tipeRevisiOptions = [
  { label: "External", value: 0 },
  { label: "Internal", value: 1 },
];
const rencanaSizeOptions = ["BRAKEDOWN SIZE", "ALLSIZE"];

onMounted(() => {
  if (!props.isEdit) {
    // Di aplikasi web, kita ambil dari authStore atau global state
    // Untuk saat ini kita asumsikan ADMIN jika baru
    props.formData.UserCreate = props.formData.UserCreate || "ADMIN";
    props.formData.IsMo = true;
  }
});

watch(
  () => props.formData.Divisi,
  (newDiv) => {
    if (!props.isEdit && String(newDiv).startsWith("3")) {
      props.formData.PerushKode = "SM";
      props.formData.NamaPerusahaan = "Sukiman Setyo Manunggal";
      props.formData.CustKode = "DC";
      props.formData.CustNama = "KAOSAN DC";
    }
  },
  { immediate: true },
);

watch(
  () => props.formData.Referensi,
  (newVal) => {
    // Jalankan hanya jika bukan mode edit (alias form baru) dan referensi punya isi
    if (!props.isEdit && newVal && String(newVal).trim().length > 0) {
      props.formData.IsRevisi = "Y";
    }
  },
  { immediate: true },
);

// ── Revisi checkboxes ──
const revisiItems = ref([
  { label: "Ganti Design", value: false },
  { label: "Salah Warna Sablon", value: false },
  { label: "Salah Design", value: false },
  { label: "Salah Ukuran Sablon", value: false },
  { label: "Salah Cetak", value: false },
  { label: "Salah Letak Sablon", value: false },
  { label: "Salah Ukuran", value: false },
  { label: "Ganti Bahan", value: false },
  { label: "Salah Bahan", value: false },
  { label: "Menggunakan Bahan Sebenarnya", value: false },
  { label: "Salah Warna Bahan", value: false },
  { label: "Cetak Sesuai Ukuran", value: false },
  { label: "Salah Letak Komponen", value: false },
]);

const buildRevisiNote = () => {
  props.formData.RevisiNote = revisiItems.value
    .filter((x) => x.value)
    .map((x) => x.label)
    .join(", ");
};

const isDivisiSatuAtauLima = computed(() => {
  const divStr = String(props.formData.Divisi).charAt(0);
  return divStr === "1" || divStr === "5";
});

// ── Image ──
const fileRef = ref<HTMLInputElement | null>(null);
const getBaseUrl = () => api.defaults.baseURL?.replace(/\/api\/?$/, "") || "";
const resolvedImageUrl = ref("");
watch(
  () => props.formData.Nomor,
  () => {
    resolvedImageUrl.value = ""; // reset saat ganti record
  },
);

const imageCacheBust = ref(0);

watch(
  () => props.formData,
  () => {
    imageCacheBust.value = Date.now();
  },
  { flush: "post" },
);

const displayImageUrl = computed(() => {
  if (props.formData.MainImageBlob) return props.formData.MainImageBlob;

  if (props.isEdit && props.formData.Nomor) {
    const base = getBaseUrl();
    const cab = props.formData.Cab || "HO-";
    return `${base}/images/${cab}/map/${encodeURIComponent(props.formData.Nomor)}.jpg?v=${imageCacheBust.value}`;
  }

  if (props.formData.MintaHarga) {
    const mh = props.formData.MintaHarga;
    const base = getBaseUrl();
    return `${base}/images/mppb/${encodeURIComponent(mh)}.jpg?v=${imageCacheBust.value}`;
  }

  return "";
});

const handleFallbackImage = (e: Event) => {
  const img = e.target as HTMLImageElement;
  if (img.dataset.fallbackTried === "true") {
    img.style.display = "none";
    return;
  }
  img.dataset.fallbackTried = "true";
  const mhNomor = props.formData.MintaHarga || props.formData.Nomor;
  if (mhNomor) {
    // ✅ FIX: path relatif, gak hardcode host/port
    const fallbackUrl = `/file-gambar/mintaharga/${encodeURIComponent(mhNomor)}.jpg`;
    img.src = fallbackUrl;
    resolvedImageUrl.value = fallbackUrl;
  } else {
    img.style.display = "none";
  }
};

// Handler khusus buat v-img (Vuetify) — beda tipe event dari native <img>.
// v-img emit src (string) yang gagal, bukan Event DOM.
const handlePreviewImageError = (failedSrc: string | undefined) => {
  // Kalau yang gagal itu masih URL utama (belum sempat fallback),
  // coba fallback ke VPS legacy.
  if (resolvedImageUrl.value?.includes("/file-gambar/")) {
    // Sudah pernah dicoba fallback juga & tetap gagal — nyerah, biarin slot #error nampil
    return;
  }
  const mhNomor = props.formData.MintaHarga || props.formData.Nomor;
  if (mhNomor) {
    // ✅ FIX: path relatif
    resolvedImageUrl.value = `/file-gambar/mintaharga/${encodeURIComponent(mhNomor)}.jpg`;
  }
};

const onMainImageLoad = () => {
  resolvedImageUrl.value = displayImageUrl.value;
};

const onFileChange = (e: Event) => {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (!file) return;
  if (file.size > 1_000_000) {
    toast.error("Ukuran gambar tidak boleh > 1 Mb.");
    return;
  }
  props.formData.MainImageName = file.name;
  props.formData.MainImageBlob = URL.createObjectURL(file);
  emit("upload-main", file);
};

// ── Lookup handlers ──
const openMintaModal = () => {
  showMintaModal.value = true;
};
// 2. Tambahkan handler baru ini untuk mengambil detail Minta Harga dari backend
const handleMintaHargaSelected = async (item: any) => {
  props.formData.MintaHarga = item.Nomor;

  try {
    const res = await api.get(`/penjualan/map-form/minta-harga/${item.Nomor}`);
    const data = res.data.data;

    if (data) {
      if (data.mh_divisi) props.formData.Divisi = String(data.mh_divisi);

      props.formData.CustKode = data.mh_cus_kode || props.formData.CustKode;
      props.formData.CustNama = data.cus_nama || props.formData.CustNama;
      props.formData.CustPerfect =
        data.cus_perfect || props.formData.CustPerfect;
      props.formData.SalesKode = data.mh_sal_kode || props.formData.SalesKode;
      props.formData.SalesNama = data.sal_nama || props.formData.SalesNama;

      // ← Ini yang belum ada — Nama Pekerjaan dari mh_nama
      props.formData.Nama = data.mh_nama || props.formData.Nama;
      props.formData.Nama2 = data.mh_nama || props.formData.Nama2;

      // ← Rencana Order dari mh_jmlorder
      props.formData.RencanaOrder =
        Number(data.mh_jmlorder) || props.formData.RencanaOrder;
      props.formData.Jumlah = Number(data.mh_jmlorder) || props.formData.Jumlah;

      // Harga — prioritas kalkulasi dulu, fallback ke harga biasa (sesuai Delphi)
      props.formData.HargaJual =
        Number(data.mh_harga_kalkulasi) ||
        Number(data.mh_harga) ||
        props.formData.HargaJual;

      props.formData.Kain = data.mh_kain || props.formData.Kain;
      props.formData.Panjang =
        Number(data.mh_panjang) || props.formData.Panjang;
      props.formData.Lebar = Number(data.mh_lebar) || props.formData.Lebar;
      props.formData.KetUkuran = data.mh_ukuran || props.formData.KetUkuran; // ← mh_ukuran → KetUkuran
      props.formData.Gramasi = data.mh_gramasi || props.formData.Gramasi;
      props.formData.Finishing = data.mh_finishing || props.formData.Finishing;
      props.formData.Keterangan = data.mh_ket || props.formData.Keterangan;

      toast.success("Berhasil menarik detail Permintaan Harga.");
    }
  } catch (e: any) {
    toast.error(
      e.response?.data?.message || "Gagal menarik detail Permintaan Harga.",
    );
  }
};
const setCust = (v: any) => {
  props.formData.CustKode = v.Kode || v.cus_kode;
  props.formData.CustNama = v.Nama || v.cus_nama;
  props.formData.CustPerfect = v.cus_perfect || "N";
};
const setPerush = (v: any) => {
  props.formData.PerushKode = v.Kode || v.perush_kode;
  props.formData.NamaPerusahaan = v.Nama || v.perush_nama;
};
const setSales = (v: any) => {
  props.formData.SalesKode = v.Kode || v.sal_kode;
  props.formData.SalesNama = v.Nama || v.sal_nama;
};
const setJo = (v: any) => {
  props.formData.JoKode = v.Kode || v.jo_kode;
  props.formData.JenisOrder = v.Nama || v.jo_nama;
};
const setCabMap = (v: any) => {
  props.formData.Cab = v.Kode || v.pab_kode;
  props.formData.Workshop = v.Nama || v.pab_nama;
};
const setCabSpk = (v: any) => {
  props.formData.Cab2 = v.Kode || v.pab_kode;
  props.formData.Workshop2 = v.Nama || v.pab_nama;
};

const setRef = async (v: any) => {
  const nomor = v.Nomor || v.mspk_nomor;
  props.formData.Referensi = nomor;
  try {
    const res = await mapFormService.getById(nomor);
    const d = res.data.data;
    if (d) {
      // Gunakan mapping yang sama agar field terisi semua (termasuk Workshop, Finishing, dll)
      const mapped = (props as any).mapMapData
        ? (props as any).mapMapData(d)
        : d;
      Object.assign(props.formData, mapped);

      // Kembalikan nomor asli agar tidak menimpa MAP yang sedang dibuat
      props.formData.Nomor = "";
      props.formData.Referensi = nomor;
      props.formData.IsRevisi = "Y";
      toast.success(`Data dari MAP Referensi ${nomor} berhasil dimuat.`);
    }
  } catch {
    toast.error("Gagal memuat data dari referensi MAP.");
  }
};
const setPenawaran = (v: any) => {
  const nomor = v.Nomor || v.pen_nomor;
  props.formData.Penawaran = nomor;
  props.formData.PenawaranId = ""; // reset dulu
  selectedPenawaranNomor.value = nomor;
  showPenawaranDetailModal.value = true; // ← langsung buka detail
};
const setPenawaranDetail = (v: any) => {
  // Hanya simpan ID detail — tidak mengisi field lain
  props.formData.PenawaranId = v.id || v.ID;
};

// ── Generic lookup ──
const lookupByKode = async (endpoint: string, kode: string) => {
  if (!kode?.trim()) return null;
  const res = await api.get(endpoint, { params: { q: kode.trim(), limit: 1 } });
  const items = res.data.data?.items || res.data.data || [];
  return (
    items.find(
      (i: any) =>
        (
          i.Kode ||
          i.perush_kode ||
          i.cus_kode ||
          i.sal_kode ||
          i.jo_kode ||
          i.pab_kode ||
          ""
        )
          .toString()
          .toUpperCase() === kode.trim().toUpperCase(),
    ) || null
  );
};

const onPerushKodeEnter = async () => {
  if (isOpeningModal.value) return;
  const kode = props.formData.PerushKode?.trim();
  if (!kode) {
    props.formData.NamaPerusahaan = "";
    return;
  }
  try {
    const item = await lookupByKode("/lookups/perusahaan", kode);
    if (item) {
      props.formData.PerushKode = item.Kode || item.perush_kode;
      props.formData.NamaPerusahaan = item.Nama || item.perush_nama;
    } else {
      toast.error("Kode perusahaan tidak ditemukan.");
      props.formData.PerushKode = "";
      props.formData.NamaPerusahaan = "";
    }
  } catch {
    toast.error("Gagal validasi kode perusahaan.");
  }
};

const onCustKodeEnter = async () => {
  if (isOpeningModal.value) return;
  const kode = props.formData.CustKode?.trim();
  if (!kode) {
    props.formData.CustNama = "";
    return;
  }
  try {
    const item = await lookupByKode("/lookups/customer", kode);
    if (item) {
      const aktif = item.cus_aktif ?? item.Aktif ?? 0;
      if (aktif === 1 || aktif === "1") {
        toast.warning("Status Customer Pasif.");
        props.formData.CustKode = "";
        props.formData.CustNama = "";
        return;
      }
      props.formData.CustKode = item.Kode || item.cus_kode;
      props.formData.CustNama = item.Nama || item.cus_nama;
      props.formData.CustPerfect = item.cus_perfect || "N";
    } else {
      toast.error("Kode customer tidak ditemukan.");
      props.formData.CustKode = "";
      props.formData.CustNama = "";
    }
  } catch {
    toast.error("Gagal validasi kode customer.");
  }
};

const onSalesKodeEnter = async () => {
  if (isOpeningModal.value) return;
  const kode = props.formData.SalesKode?.trim();
  if (!kode) {
    props.formData.SalesNama = "";
    return;
  }
  try {
    const item = await lookupByKode("/lookups/sales", kode);
    if (item) {
      props.formData.SalesKode = item.Kode || item.sal_kode;
      props.formData.SalesNama = item.Nama || item.sal_nama;
    } else {
      toast.error("Kode sales tidak ditemukan.");
      props.formData.SalesKode = "";
      props.formData.SalesNama = "";
    }
  } catch {
    toast.error("Gagal validasi kode sales.");
  }
};

const onJoKodeEnter = async () => {
  if (isOpeningModal.value) return;
  const kode = props.formData.JoKode?.trim();
  if (!kode) {
    props.formData.JenisOrder = "";
    return;
  }
  try {
    const res = await api.get("/lookups/jenis-order", {
      params: { q: kode, divisi: props.formData.Divisi, limit: 1 },
    });
    const items = res.data.data?.items || res.data.data || [];
    const item = items.find(
      (i: any) =>
        (i.Kode || i.jo_kode || "").toUpperCase() === kode.toUpperCase(),
    );
    if (item) {
      props.formData.JoKode = item.Kode || item.jo_kode;
      props.formData.JenisOrder = item.Nama || item.jo_nama;
    } else {
      toast.error("Kode jenis order tidak ditemukan.");
      props.formData.JoKode = "";
      props.formData.JenisOrder = "";
    }
  } catch {
    toast.error("Gagal validasi kode jenis order.");
  }
};

const getWorkshopByKode = async (kode: string) => {
  if (workshopCache.value.length === 0) {
    const res = await api.get("/lookups/cabang-pabrik");
    workshopCache.value = res.data.data?.items || res.data.data || [];
  }
  return (
    workshopCache.value.find(
      (i: any) =>
        (i.pab_kode || i.Kode || "").toUpperCase() === kode.toUpperCase(),
    ) || null
  );
};

const onCabMapKodeEnter = async () => {
  if (isOpeningModal.value) return;
  const kode = props.formData.Cab?.trim();
  if (!kode) {
    props.formData.Workshop = "";
    return;
  }
  try {
    const item = await getWorkshopByKode(kode);
    if (item) {
      props.formData.Cab = item.pab_kode || item.Kode;
      props.formData.Workshop = item.pab_nama || item.Nama;
    } else {
      toast.error("Kode workshop tidak ditemukan.");
      props.formData.Cab = "";
      props.formData.Workshop = "";
    }
  } catch {
    toast.error("Gagal validasi kode workshop.");
  }
};

const onCabSpkKodeEnter = async () => {
  if (isOpeningModal.value) return;
  const kode = props.formData.Cab2?.trim();
  if (!kode) {
    props.formData.Workshop2 = "";
    return;
  }
  try {
    const item = await getWorkshopByKode(kode);
    if (item) {
      props.formData.Cab2 = item.pab_kode || item.Kode;
      props.formData.Workshop2 = item.pab_nama || item.Nama;
    } else {
      toast.error("Kode workshop tidak ditemukan.");
      props.formData.Cab2 = "";
      props.formData.Workshop2 = "";
    }
  } catch {
    toast.error("Gagal validasi kode workshop.");
  }
};

// ── Autocomplete Nama Pekerjaan ──
const namaSuggestions = ref<Array<{ nama: string; frekuensi: number }>>([]);
const showNamaSuggestions = ref(false);
const namaInputRef = ref<HTMLElement | null>(null);
let namaDebounceTimer: ReturnType<typeof setTimeout> | null = null;

const fetchNamaSuggestions = async (val: string) => {
  const divisi = props.formData.Divisi
    ? String(props.formData.Divisi).charAt(0)
    : "";
  const cusKode = props.formData.CustKode || "";

  // Minimal 2 karakter dan harus ada divisi + customer dulu
  if (!val || val.length < 2 || !divisi || !cusKode) {
    namaSuggestions.value = [];
    showNamaSuggestions.value = false;
    return;
  }

  try {
    const res = await mapFormService.getNamaSuggestions(val, divisi, cusKode);
    namaSuggestions.value = res.data.data || [];
    showNamaSuggestions.value = namaSuggestions.value.length > 0;
  } catch {
    namaSuggestions.value = [];
    showNamaSuggestions.value = false;
  }
};

const onNamaInput = (e: Event) => {
  const val = (e.target as HTMLInputElement).value;
  props.formData.Nama = val;
  if (namaDebounceTimer) clearTimeout(namaDebounceTimer);
  namaDebounceTimer = setTimeout(() => fetchNamaSuggestions(val), 300);
};

const selectNamaSuggestion = (item: { nama: string }) => {
  props.formData.Nama = item.nama;
  props.formData.Nama2 = item.nama;
  showNamaSuggestions.value = false;
  namaSuggestions.value = [];
};

const onNamaBlur = () => {
  // Delay agar click pada suggestion sempat tereksekusi dulu
  setTimeout(() => {
    showNamaSuggestions.value = false;
  }, 200);
};

const onNamaFocus = () => {
  if (props.formData.Nama && props.formData.Nama.length >= 2) {
    fetchNamaSuggestions(props.formData.Nama);
  }
};

// Cleanup timer saat unmount
onBeforeUnmount(() => {
  if (namaDebounceTimer) clearTimeout(namaDebounceTimer);
});

// ── F1 handlers untuk setiap input kode ──
const onPerushF1 = (e: KeyboardEvent) => {
  if (e.key === "F1") {
    e.preventDefault();
    showPerushModal.value = true;
  }
};
const onCustF1 = (e: KeyboardEvent) => {
  if (e.key === "F1") {
    e.preventDefault();
    showCustModal.value = true;
  }
};
const onSalesF1 = (e: KeyboardEvent) => {
  if (e.key === "F1") {
    e.preventDefault();
    showSalesModal.value = true;
  }
};
const onJoF1 = (e: KeyboardEvent) => {
  if (e.key === "F1") {
    e.preventDefault();
    if (!props.isEdit) showJoModal.value = true;
  }
};
const onCabMapF1 = (e: KeyboardEvent) => {
  if (e.key === "F1") {
    e.preventDefault();
    showCabMapModal.value = true;
  }
};
const onCabSpkF1 = (e: KeyboardEvent) => {
  if (e.key === "F1") {
    e.preventDefault();
    showCabSpkModal.value = true;
  }
};
const onRefF1 = (e: KeyboardEvent) => {
  if (e.key === "F1") {
    e.preventDefault();
    if (props.formData.IsRevisi !== "N" && !props.formData.Referensi)
      showRefModal.value = true;
  }
};

// ─────────────────────────────────────────────
// HANDLER: SEARCH SETORAN / DP CUSTOMER
// ─────────────────────────────────────────────

const openSetoranModal = () => {
  if (!props.formData.CustKode) {
    toast.warning("Customer harus dipilih dulu sebelum mencari DP.");
    return;
  }
  showSetoranModal.value = true;
};

const setSetoranPembayaran = (v: any) => {
  props.formData.NomorPO = v.Nomor;
  if (v.Tanggal) {
    // Normalisasi tanggal ke YYYY-MM-DD
    const tgl = String(v.Tanggal).substring(0, 10);
    props.formData.TglPO = tgl;
  }
  toast.success(`Nomor PO diisi dari setoran: ${v.Nomor}`);
};
</script>

<template>
  <div class="tm-layout">
    <!-- ── Kolom kiri: field MAP ── -->
    <div class="tm-left">
      <div class="tm-section">
        <div class="f-row">
          <label class="f-lbl">Divisi</label>
          <v-select
            v-model="formData.Divisi"
            :items="lookupOptions.divisi"
            variant="outlined"
            density="compact"
            hide-details
            class="f-vselect"
            style="max-width: 160px"
          />
          <label class="chk-lbl ml-2">
            <input type="checkbox" v-model="formData.IsMo" disabled />
            MO ({{ formData.UserCreate || "ADMIN" }})
          </label>
          <label class="chk-lbl ml-2">
            <input
              type="checkbox"
              v-model="formData.IsCmo"
              @change="
                (e: any) => {
                  if (e.target.checked) {
                    if (!authStore.isCmo) {
                      toast.warning('Anda tidak memiliki hak CMO.');
                      e.target.checked = false;
                      return;
                    }
                    formData.Cmo = authStore.user?.kode || '';
                  } else {
                    formData.Cmo = '';
                  }
                }
              "
            />
            CMO<span v-if="formData.IsCmo && formData.Cmo" class="cmo-name"
              >({{ formData.Cmo }})</span
            >
          </label>
          <span
            class="ml-auto f-status"
            :class="formData.Status === 'PASIF' ? 'red' : ''"
          >
            Status: {{ formData.Status || "AKTIF" }}
          </span>
        </div>

        <div class="f-row">
          <label class="f-lbl">Nomor Pra SPK</label>
          <input
            :value="formData.Nomor"
            readonly
            class="f-inp f-ro"
            style="width: 160px"
            :placeholder="!isEdit ? 'Kosong = Baru' : ''"
          />
          <span v-if="!isEdit" class="hint-new ml-1">← Baru</span>
          <label class="f-lbl ml-3" style="width: 70px">Tipe Memo</label>
          <select
            v-model="formData.TipeSpk"
            class="f-inp f-sel"
            style="width: 90px"
          >
            <option v-for="o in tipeSpkOptions" :key="o" :value="o">
              {{ o || "—" }}
            </option>
          </select>
          <select
            v-model="formData.StatusKerja"
            class="f-inp f-sel ml-1"
            style="width: 100px"
          >
            <option v-for="o in statusKerjaOptions" :key="o" :value="o">
              {{ o }}
            </option>
          </select>
        </div>

        <div class="f-row">
          <label class="f-lbl">Perusahaan</label>
          <div class="inp-grp" style="flex: 1; max-width: 400px">
            <input
              v-model="formData.PerushKode"
              class="f-inp"
              style="width: 50px; background: #ddeeff"
              :disabled="isEdit"
              @keydown="onPerushF1"
              @keydown.enter.prevent="
                ($event.target as HTMLInputElement).blur()
              "
              @blur="onPerushKodeEnter"
            />
            <input
              :value="formData.NamaPerusahaan"
              readonly
              class="f-inp f-ro"
              style="flex: 1"
            />
            <button
              type="button"
              class="btn-lkp"
              title="Cari Perusahaan (F1)"
              @mousedown.prevent="
                isOpeningModal = true;
                showPerushModal = true;
              "
              @click="isOpeningModal = false"
              @keydown.f1.prevent="showPerushModal = true"
              tabindex="0"
            >
              <IconSearch :size="13" color="#1565c0" />
            </button>
          </div>
        </div>

        <div class="f-row">
          <label class="f-lbl">Tanggal</label>
          <input
            type="date"
            v-model="formData.Tanggal"
            class="f-date"
            style="width: 120px"
          />
          <label class="f-lbl ml-2" style="width: 55px">Created</label>
          <input
            :value="formData.Created"
            readonly
            class="f-inp f-ro"
            style="width: 110px"
          />
          <label class="f-lbl ml-2" style="width: 70px">Tanggal PO</label>
          <input
            type="date"
            v-model="formData.TglPO"
            class="f-date"
            style="width: 120px"
          />
        </div>

        <div class="f-row">
          <label class="f-lbl">Nomor PO</label>
          <div class="inp-grp" style="max-width: 320px">
            <input
              v-model="formData.NomorPO"
              class="f-inp"
              style="flex: 1"
              placeholder="Ketik PO atau cari DP..."
            />
            <button
              type="button"
              class="btn-lkp"
              title="Cari DP dari Penerimaan"
              :disabled="!formData.CustKode"
              @click="openSetoranModal"
            >
              <IconSearch :size="13" color="#1565c0" />
            </button>
          </div>
          <span
            v-if="!formData.NomorPO && formData.CustKode"
            class="ml-1"
            style="font-size: 10px; color: #f57c00; font-style: italic"
          >
            ⚠ Wajib diisi atau cari dari Penerimaan
          </span>
        </div>

        <div class="f-row">
          <label class="f-lbl">No. Penawaran</label>
          <input
            v-model="formData.Penawaran"
            class="f-inp f-lkp-inp"
            style="width: 130px; cursor: pointer; background: #f9f9f9"
            readonly
            placeholder="Klik untuk cari..."
            @mousedown.prevent="showPenawaranModal = true"
          />
          <!-- ID detail penawaran -->
          <input
            :value="formData.PenawaranId"
            readonly
            class="f-inp f-ro"
            style="width: 40px; text-align: center"
            placeholder="ID"
            title="ID Detail Penawaran"
          />
          <label class="f-lbl ml-2" style="width: 115px"
            >No. Permintaan Harga</label
          >
          <input
            v-model="formData.MintaHarga"
            class="f-inp f-lkp-inp"
            style="width: 130px; cursor: pointer; background: #ddeeff"
            readonly
            placeholder="Klik untuk cari..."
            @mousedown.prevent="openMintaModal"
          />
          <label class="f-lbl ml-2 cust-perfect-lbl" style="width: 80px"
            >Cust PERFECT</label
          >
          <select
            v-model="formData.CustPerfect"
            class="f-inp f-sel"
            style="width: 50px"
            disabled
          >
            <option v-for="o in perfectOptions" :key="o" :value="o">
              {{ o }}
            </option>
          </select>
        </div>

        <div class="f-row">
          <label class="f-lbl">Customer</label>
          <div class="inp-grp" style="flex: 1; max-width: 400px">
            <input
              v-model="formData.CustKode"
              class="f-inp"
              style="width: 70px; background: #ddeeff"
              @keydown="onCustF1"
              @keydown.enter.prevent="
                ($event.target as HTMLInputElement).blur()
              "
              @blur="onCustKodeEnter"
            />
            <input
              :value="formData.CustNama"
              readonly
              class="f-inp f-ro"
              style="flex: 1"
            />
            <button
              type="button"
              class="btn-lkp"
              title="Cari Customer (F1)"
              @mousedown.prevent="
                isOpeningModal = true;
                showCustModal = true;
              "
              @click="isOpeningModal = false"
              @keydown.f1.prevent="showCustModal = true"
              tabindex="0"
            >
              <IconSearch :size="13" color="#1565c0" />
            </button>
          </div>
        </div>

        <div class="f-row">
          <label class="f-lbl">Sales</label>
          <div class="inp-grp" style="max-width: 320px">
            <input
              v-model="formData.SalesKode"
              class="f-inp"
              style="width: 60px; background: #ddeeff"
              @keydown="onSalesF1"
              @keydown.enter.prevent="
                ($event.target as HTMLInputElement).blur()
              "
              @blur="onSalesKodeEnter"
            />
            <input
              :value="formData.SalesNama"
              readonly
              class="f-inp f-ro"
              style="flex: 1"
            />
            <button
              type="button"
              class="btn-lkp"
              title="Cari Sales (F1)"
              @mousedown.prevent="
                isOpeningModal = true;
                showSalesModal = true;
              "
              @click="isOpeningModal = false"
              @keydown.f1.prevent="showSalesModal = true"
              tabindex="0"
            >
              <IconSearch :size="13" color="#1565c0" />
            </button>
          </div>
        </div>

        <div class="f-row">
          <label class="f-lbl">Jenis Order</label>
          <div class="inp-grp" style="max-width: 320px">
            <input
              v-model="formData.JoKode"
              class="f-inp"
              style="width: 60px"
              :disabled="isEdit"
              @keydown.enter.prevent="
                ($event.target as HTMLInputElement).blur()
              "
              @keydown.f1.prevent="!isEdit && (showJoModal = true)"
              @blur="onJoKodeEnter"
            />
            <input
              :value="formData.JenisOrder"
              readonly
              class="f-inp f-ro"
              style="flex: 1"
            />
            <button
              type="button"
              class="btn-lkp"
              :disabled="isEdit"
              title="Cari Jenis Order (F1)"
              @mousedown.prevent="
                isOpeningModal = true;
                showJoModal = true;
              "
              @click="isOpeningModal = false"
              @keydown.f1.prevent="showJoModal = true"
              tabindex="0"
            >
              <IconSearch :size="13" color="#1565c0" />
            </button>
          </div>
        </div>

        <div class="f-row" style="position: relative">
          <label class="f-lbl">Nama Pekerjaan</label>
          <div style="flex: 1; position: relative">
            <input
              ref="namaInputRef"
              :value="formData.Nama"
              class="f-inp"
              style="width: 100%"
              autocomplete="off"
              placeholder="Ketik nama pekerjaan..."
              @input="onNamaInput"
              @focus="onNamaFocus"
              @blur="onNamaBlur"
            />
            <!-- Dropdown suggestions -->
            <div v-if="showNamaSuggestions" class="nama-suggestions">
              <div
                v-for="(item, idx) in namaSuggestions"
                :key="idx"
                class="nama-suggestion-item"
                @mousedown.prevent="selectNamaSuggestion(item)"
              >
                <span class="suggestion-nama">{{ item.nama }}</span>
                <span class="suggestion-freq">{{ item.frekuensi }}x</span>
              </div>
            </div>
          </div>
        </div>

        <div class="f-row">
          <label class="f-lbl">Jumlah</label>
          <input
            v-model.number="formData.Jumlah"
            type="number"
            class="f-inp"
            style="width: 90px; text-align: right"
            v-select-on-focus
          />
        </div>

        <div class="f-row">
          <label class="f-lbl">Ukuran</label>
          <template v-if="isDivisiSatuAtauLima">
            <v-combobox
              v-model="formData.Panjang"
              :items="lookupOptions.panjang"
              variant="outlined"
              density="compact"
              hide-details
              class="f-vselect ml-1"
              style="width: 80px"
            />
            <span class="f-sep">X</span>
            <v-combobox
              v-model="formData.Lebar"
              :items="lookupOptions.lebar"
              variant="outlined"
              density="compact"
              hide-details
              class="f-vselect"
              style="width: 80px"
            />
          </template>
          <template v-else>
            <input
              v-model.number="formData.Panjang"
              type="number"
              class="f-inp ml-1"
              style="width: 58px; text-align: right"
              v-select-on-focus
            />
            <span class="f-sep">X</span>
            <input
              v-model.number="formData.Lebar"
              type="number"
              class="f-inp"
              style="width: 58px; text-align: right"
              v-select-on-focus
            />
          </template>
          <span class="f-sep">Mtr</span>
          <label class="f-lbl ml-1" style="width: 70px">Ket. Ukuran</label>
          <input v-model="formData.KetUkuran" class="f-inp" style="flex: 1" />
        </div>

        <div class="f-row">
          <label class="f-lbl">Gramasi</label>
          <v-combobox
            v-if="isDivisiSatuAtauLima"
            v-model="formData.Gramasi"
            :items="lookupOptions.gramasi"
            variant="outlined"
            density="compact"
            hide-details
            class="f-vselect"
            style="max-width: 300px"
          />
          <input
            v-else
            v-model="formData.Gramasi"
            class="f-inp"
            style="max-width: 300px"
          />
        </div>
        <div class="f-row">
          <label class="f-lbl">Kain</label>
          <v-combobox
            v-if="isDivisiSatuAtauLima"
            v-model="formData.Kain"
            :items="lookupOptions.kain"
            variant="outlined"
            density="compact"
            hide-details
            class="f-vselect"
            style="max-width: 300px"
          />
          <input
            v-else
            v-model="formData.Kain"
            class="f-inp"
            style="max-width: 300px"
          />
        </div>
        <div class="f-row">
          <label class="f-lbl">Finishing</label>
          <v-combobox
            v-if="isDivisiSatuAtauLima"
            v-model="formData.Finishing"
            :items="lookupOptions.finishing"
            variant="outlined"
            density="compact"
            hide-details
            class="f-vselect"
            style="flex: 1"
          />
          <input
            v-else
            v-model="formData.Finishing"
            class="f-inp"
            style="flex: 1"
          />
        </div>

        <div class="f-row">
          <label class="f-lbl"></label>
          <label class="chk-lbl mr-3"
            ><input
              type="checkbox"
              v-model="formData.Sablon"
              true-value="Y"
              false-value="N"
            />
            Sablon</label
          >
          <label class="chk-lbl mr-3"
            ><input
              type="checkbox"
              v-model="formData.Bordir"
              true-value="Y"
              false-value="N"
            />
            Bordir</label
          >
          <label class="chk-lbl mr-3"
            ><input
              type="checkbox"
              v-model="formData.Sublim"
              true-value="Y"
              false-value="N"
            />
            Sublim</label
          >
        </div>

        <div class="f-row">
          <label class="f-lbl">Workshop MAP</label>
          <div class="inp-grp" style="max-width: 260px">
            <input
              v-model="formData.Cab"
              class="f-inp"
              style="width: 48px; background: #ddeeff"
              @keydown="onCabMapF1"
              @keydown.enter.prevent="
                ($event.target as HTMLInputElement).blur()
              "
              @blur="onCabMapKodeEnter"
            />
            <input
              :value="formData.Workshop"
              readonly
              class="f-inp f-ro"
              style="flex: 1"
            />
            <button
              type="button"
              class="btn-lkp"
              title="Cari Workshop (F1)"
              @mousedown.prevent="
                isOpeningModal = true;
                showCabMapModal = true;
              "
              @click="isOpeningModal = false"
              @keydown.f1.prevent="showCabMapModal = true"
              tabindex="0"
            >
              <IconSearch :size="13" color="#1565c0" />
            </button>
          </div>
          <label class="chk-lbl ml-auto design-baru-lbl">
            <input
              type="checkbox"
              v-model="formData.DesignBaru"
              true-value="Y"
              false-value="N"
            />
            Design Baru
          </label>
        </div>

        <div class="f-row">
          <label class="f-lbl">Workshop SPK</label>
          <div class="inp-grp" style="max-width: 260px">
            <input
              v-model="formData.Cab2"
              class="f-inp"
              style="width: 48px; background: #ddeeff"
              @keydown="onCabSpkF1"
              @keydown.enter.prevent="
                ($event.target as HTMLInputElement).blur()
              "
              @blur="onCabSpkKodeEnter"
            />
            <input
              :value="formData.Workshop2"
              readonly
              class="f-inp f-ro"
              style="flex: 1"
            />
            <button
              type="button"
              class="btn-lkp"
              title="Cari Workshop SPK (F1)"
              @mousedown.prevent="
                isOpeningModal = true;
                showCabSpkModal = true;
              "
              @click="isOpeningModal = false"
              @keydown.f1.prevent="showCabSpkModal = true"
              tabindex="0"
            >
              <IconSearch :size="13" color="#1565c0" />
            </button>
          </div>
        </div>

        <div class="f-row">
          <label class="f-lbl">DateLine</label>
          <input
            type="date"
            v-model="formData.DateLine"
            class="f-date"
            style="width: 120px"
          />
          <label class="f-lbl ml-2" style="width: 80px">Estimasi Jadi</label>
          <input
            type="date"
            v-model="formData.EstimasiJadi"
            class="f-date"
            style="width: 120px"
          />
        </div>

        <div class="f-row">
          <label class="f-lbl">Rencana Order</label>
          <input
            v-model.number="formData.RencanaOrder"
            type="number"
            class="f-inp"
            style="width: 80px; text-align: right"
            v-select-on-focus
          />
          <label class="f-lbl ml-2" style="width: 65px">Harga Jual</label>
          <input
            v-model.number="formData.HargaJual"
            type="number"
            class="f-inp"
            style="width: 90px; text-align: right"
            v-select-on-focus
          />
          <label class="f-lbl ml-2" style="width: 65px">Harga Riil</label>
          <input
            v-model.number="formData.HargaRiil"
            type="number"
            class="f-inp"
            style="width: 90px; text-align: right"
            v-select-on-focus
          />
        </div>

        <div class="f-row">
          <label class="f-lbl">Rencana Size</label>
          <select
            v-model="formData.RencanaSize"
            class="f-inp f-sel"
            style="width: 160px"
          >
            <option v-for="o in rencanaSizeOptions" :key="o" :value="o">
              {{ o }}
            </option>
          </select>
        </div>
      </div>
    </div>

    <!-- ── Kolom kanan: Revisi + Design ── -->
    <div class="tm-right">
      <!-- Revisi section -->
      <div class="tm-section">
        <div class="tm-sec-title">Revisi</div>

        <div class="f-row">
          <label class="f-lbl" style="width: 50px">Revisi</label>
          <select
            v-model="formData.IsRevisi"
            class="f-inp f-sel"
            style="width: 70px"
            :disabled="!!formData.Referensi"
          >
            <option v-for="o in revisiOptions" :key="o.value" :value="o.value">
              {{ o.label }}
            </option>
          </select>
          <label class="f-lbl ml-2" style="width: 60px">Revisi ke</label>
          <input
            v-model.number="formData.RevisiNo"
            type="number"
            class="f-inp"
            style="width: 60px; text-align: right"
            :disabled="formData.IsRevisi === 'N'"
            v-select-on-focus
          />
        </div>

        <div class="f-row">
          <label class="f-lbl" style="width: 100px">Nomer Referensi</label>
          <div class="inp-grp" style="flex: 1">
            <input
              v-model="formData.Referensi"
              class="f-inp"
              style="flex: 1"
              :disabled="formData.IsRevisi === 'N' || !!formData.Referensi"
              @keydown="onRefF1"
            />
            <button
              type="button"
              class="btn-lkp"
              :disabled="formData.IsRevisi === 'N' || !!formData.Referensi"
              title="Cari Referensi MAP (F1)"
              @mousedown.prevent="showRefModal = true"
              @keydown.f1.prevent="showRefModal = true"
              tabindex="0"
            >
              <IconSearch :size="13" color="#1565c0" />
            </button>
          </div>
        </div>

        <!-- Checkbox revisi — 2 kolom grid yang fixed -->
        <div class="f-row" style="align-items: flex-start; margin-top: 4px">
          <label class="f-lbl" style="width: 80px; padding-top: 2px"
            >Ket. Revisi</label
          >
          <div class="revisi-grid">
            <label v-for="(chk, i) in revisiItems" :key="i" class="revisi-chk">
              <input
                type="checkbox"
                v-model="chk.value"
                :disabled="formData.IsRevisi === 'N'"
                @change="buildRevisiNote"
                style="accent-color: #1565c0; flex-shrink: 0"
              />
              <span>{{ chk.label }}</span>
            </label>
          </div>
        </div>

        <div class="f-row mt-1">
          <label class="f-lbl" style="width: 100px"></label>
          <textarea
            v-model="formData.RevisiNote"
            class="f-inp"
            style="flex: 1; height: 44px; padding: 4px; resize: none"
            :disabled="formData.IsRevisi === 'N'"
          ></textarea>
        </div>

        <div class="f-row mt-1">
          <label class="f-lbl" style="width: 100px">Tipe Revisi</label>
          <select
            v-model="formData.TipeRevisi"
            class="f-inp f-sel"
            style="width: 120px"
          >
            <option
              v-for="o in tipeRevisiOptions"
              :key="o.value"
              :value="o.value"
            >
              {{ o.label }}
            </option>
          </select>
        </div>
      </div>

      <!-- Design section -->
      <div
        class="tm-section mt-2"
        style="flex: 1; display: flex; flex-direction: column"
      >
        <div class="tm-sec-title">Design</div>

        <div class="f-row mb-1">
          <div class="f-upload-name">
            {{ formData.MainImageName || "Ukuran Maksimal 1 Mb" }}
          </div>
        </div>
        <div class="f-row mb-2">
          <button type="button" class="f-upload-btn" @click="fileRef?.click()">
            <IconUpload :size="13" class="mr-1" /> Upload
          </button>
          <button
            type="button"
            class="f-upload-btn blue ml-1"
            @click="
              (resolvedImageUrl || displayImageUrl) &&
              (showPreviewDialog = true)
            "
          >
            <IconMaximize :size="13" class="mr-1" /> Full Screen
          </button>
        </div>

        <div class="f-img-box" style="flex: 1">
          <img
            v-if="displayImageUrl"
            :src="displayImageUrl"
            class="f-img"
            @click="showPreviewDialog = true"
            @error="handleFallbackImage"
            @load="onMainImageLoad"
            style="cursor: pointer"
          />
          <div v-else class="f-img-empty">
            <IconPhoto :size="28" color="#bdbdbd" />
            <div>No Image available</div>
          </div>
        </div>

        <input
          ref="fileRef"
          type="file"
          accept="image/*"
          style="display: none"
          @change="onFileChange"
        />
      </div>
    </div>
  </div>

  <!-- Modals -->
  <PerusahaanSearchModal v-model="showPerushModal" @selected="setPerush" />
  <CustomerSearchModal v-model="showCustModal" @selected="setCust" />
  <SalesSearchModal v-model="showSalesModal" @selected="setSales" />
  <JenisOrderSearchModal
    v-model="showJoModal"
    @selected="setJo"
    :divisi="formData.Divisi"
  />
  <MintaHargaSearchModal
    v-model="showMintaModal"
    @selected="handleMintaHargaSelected"
    :cust-kode="formData.CustKode"
  />
  <PenawaranSearchModal
    v-model="showPenawaranModal"
    @selected="setPenawaran"
    :cust-kode="formData.CustKode"
  />
  <PenawaranDetailSearchModal
    v-model="showPenawaranDetailModal"
    :penawaran-nomor="selectedPenawaranNomor"
    @selected="setPenawaranDetail"
  />
  <PabrikSearchModal v-model="showCabMapModal" @selected="setCabMap" />
  <PabrikSearchModal v-model="showCabSpkModal" @selected="setCabSpk" />
  <ReferensiMapSearchModal v-model="showRefModal" @selected="setRef" />
  <SetoranSearchModal
    v-model="showSetoranModal"
    :cust-kode="formData.CustKode"
    @selected="setSetoranPembayaran"
  />

  <!-- Preview dialog -->
  <v-dialog v-model="showPreviewDialog" max-width="800px">
    <div class="preview-card">
      <div class="preview-header">
        <span>Preview Design</span>
        <button class="preview-close" @click="showPreviewDialog = false">
          ✕
        </button>
      </div>
      <div class="preview-body">
        <v-img
          :src="resolvedImageUrl || displayImageUrl"
          max-height="600"
          contain
          class="bg-white rounded"
          @error="handlePreviewImageError"
        >
          <template #placeholder>
            <div class="d-flex align-center justify-center fill-height">
              <v-progress-circular indeterminate color="primary" />
            </div>
          </template>
          <template #error>
            <div
              class="d-flex align-center justify-center fill-height text-grey"
            >
              Gambar tidak tersedia
            </div>
          </template>
        </v-img>
      </div>
    </div>
  </v-dialog>
</template>

<style scoped>
/* ── Root layout ── */
.tm-layout {
  display: flex;
  gap: 10px;
  align-items: flex-start;
  font-family: "Segoe UI", system-ui, sans-serif;
  font-size: 12px;
}
.tm-left {
  flex: 1;
  min-width: 0;
}
.tm-right {
  width: 480px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
}

/* ── Section card ── */
.tm-section {
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  padding: 8px 10px;
}
.tm-sec-title {
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #1565c0;
  margin-bottom: 6px;
}

/* ── Field row ── */
.f-row {
  display: flex;
  align-items: center;
  gap: 5px;
  margin-bottom: 4px;
  min-height: 26px;
}
.f-lbl {
  width: 110px;
  flex-shrink: 0;
  font-size: 11px;
  font-weight: 500;
  color: #333;
  white-space: nowrap;
}

/* ── Native inputs ── */
.f-inp {
  height: 26px;
  border: 1px solid #bdbdbd;
  border-radius: 3px;
  padding: 0 5px;
  font-size: 12px;
  outline: none;
  background: white;
  color: #212121;
  box-sizing: border-box;
  font-family: inherit;
}
.f-inp:focus {
  border-color: #1565c0;
}
.f-inp:disabled {
  background: #f5f5f5;
  color: #9e9e9e;
  cursor: default;
}
.f-ro {
  background: #f0f0f0 !important;
  color: #555 !important;
}
.f-sel {
  cursor: pointer;
}
.f-date {
  height: 26px;
  border: 1px solid #bdbdbd;
  border-radius: 3px;
  padding: 0 4px;
  font-size: 12px;
  outline: none;
  background: white;
  box-sizing: border-box;
}
.f-date:focus {
  border-color: #1565c0;
}
.f-sep {
  font-size: 12px;
  font-weight: 600;
  color: #555;
  flex-shrink: 0;
}

/* ── Vuetify compact ── */
.f-vselect :deep(.v-field) {
  min-height: 26px !important;
  height: 26px !important;
  font-size: 12px;
}
.f-vselect :deep(.v-field__input) {
  min-height: 26px !important;
  padding-top: 0 !important;
  padding-bottom: 0 !important;
  font-size: 12px;
}
.f-vselect :deep(.v-input__control) {
  min-height: 26px !important;
}
/* Font dalam dropdown list */
.f-vselect :deep(.v-list-item) {
  min-height: 28px !important;
  padding: 0 10px !important;
}
.f-vselect :deep(.v-list-item-title) {
  font-size: 12px !important;
  line-height: 1.4 !important;
}

/* ── Input group (kode + nama + lookup button) ── */
.inp-grp {
  display: flex;
  border: 1px solid #bdbdbd;
  border-radius: 3px;
  overflow: hidden;
  height: 26px;
  background: white;
}
.inp-grp .f-inp {
  border: none;
  height: 24px;
  border-radius: 0;
}
.inp-grp .f-inp + .f-inp {
  border-left: 1px solid #e0e0e0;
}
.btn-lkp {
  width: 26px;
  min-width: 26px;
  background: #e3f2fd;
  border: none;
  border-left: 1px solid #bdbdbd;
  cursor: pointer;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  height: 100%;
}
.btn-lkp:hover:not(:disabled) {
  background: #bbdefb;
}
.btn-lkp:disabled {
  background: #eeeeee;
  cursor: not-allowed;
  opacity: 0.5;
}

.inp-grp {
  display: flex;
  border: 1px solid #bdbdbd;
  border-radius: 3px;
  overflow: hidden;
  height: 26px;
  background: white;
  flex-shrink: 0; /* Tambahkan ini agar lebar 130px tetap terjaga */
}

/* ── Status + badge labels ── */
.f-status {
  font-size: 11px;
  font-weight: 700;
  color: #212121;
}
.f-status.red {
  color: #e53935;
}
.hint-new {
  font-size: 10px;
  color: #1565c0;
  font-style: italic;
  font-weight: 600;
  white-space: nowrap;
}
.cust-perfect-lbl {
  background: #fff176;
  padding: 0 4px;
  border-radius: 2px;
  font-weight: 700;
}
.design-baru-lbl {
  background: #fff176;
  padding: 2px 6px;
  border-radius: 2px;
  font-weight: 600;
}

/* ── Checkbox ── */
.chk-lbl {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  cursor: pointer;
  white-space: nowrap;
}
.chk-lbl input[type="checkbox"] {
  accent-color: #1565c0;
}

/* ── Revisi checkbox GRID — 2 kolom dengan lebar fixed ── */
.revisi-grid {
  flex: 1;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 4px 12px;
}
.revisi-chk {
  display: flex;
  align-items: flex-start;
  gap: 5px;
  font-size: 11px;
  cursor: pointer;
  line-height: 1.4;
}
.revisi-chk span {
  white-space: normal; /* biarkan wrap, tidak dipotong */
  word-break: break-word;
}
.revisi-chk input[type="checkbox"] {
  accent-color: #1565c0;
  flex-shrink: 0;
  margin-top: 2px;
}

/* ── Autocomplete Nama Pekerjaan ── */
.nama-suggestions {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: white;
  border: 1px solid #1565c0;
  border-top: none;
  border-radius: 0 0 4px 4px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 999;
  max-height: 220px;
  overflow-y: auto;
}

.nama-suggestion-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 5px 10px;
  cursor: pointer;
  font-size: 12px;
  border-bottom: 1px solid #f0f0f0;
  transition: background 0.1s;
}

.nama-suggestion-item:last-child {
  border-bottom: none;
}

.nama-suggestion-item:hover {
  background: #e3f2fd;
}

.suggestion-nama {
  flex: 1;
  color: #212121;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.suggestion-freq {
  font-size: 10px;
  color: #9e9e9e;
  margin-left: 8px;
  white-space: nowrap;
  background: #f5f5f5;
  padding: 1px 5px;
  border-radius: 10px;
}

/* ── Image ── */
.f-upload-name {
  flex: 1;
  height: 24px;
  line-height: 24px;
  font-size: 10px;
  color: #757575;
  background: #f5f5f5;
  border: 1px solid #e0e0e0;
  border-radius: 3px;
  padding: 0 6px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.f-upload-btn {
  background: #546e7a;
  color: white;
  border: none;
  border-radius: 3px;
  padding: 3px 10px;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
}
.f-upload-btn.blue {
  background: #1565c0;
}
.f-upload-btn:hover {
  opacity: 0.9;
}
.f-img-box {
  min-height: 140px;
  border: 1px solid #e0e0e0;
  border-radius: 3px;
  background: #fafafa;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}
.f-img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}
.f-img-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  color: #bdbdbd;
  font-size: 10px;
}

/* ── Preview dialog ── */
.preview-card {
  background: white;
  border-radius: 8px;
  overflow: hidden;
}
.preview-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #1565c0;
  color: white;
  padding: 9px 14px;
  font-size: 13px;
  font-weight: 700;
}
.preview-close {
  background: transparent;
  border: none;
  color: rgba(255, 255, 255, 0.8);
  font-size: 16px;
  cursor: pointer;
}
.preview-close:hover {
  color: white;
}
.preview-body {
  padding: 16px;
  background: #f5f5f5;
}

.mt-1 {
  margin-top: 4px;
}
.mt-2 {
  margin-top: 8px;
}
.mb-1 {
  margin-bottom: 4px;
}
.mb-2 {
  margin-bottom: 6px;
}
.ml-1 {
  margin-left: 4px;
}
.ml-2 {
  margin-left: 8px;
}
.ml-auto {
  margin-left: auto;
}

.f-lkp-inp:hover {
  border-color: #1565c0;
  background: #e8f4ff !important;
}

.cmo-name {
  margin-left: 3px;
  font-weight: 700;
  color: #1565c0;
}
</style>
