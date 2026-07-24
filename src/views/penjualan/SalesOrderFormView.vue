<script setup lang="ts">
import { ref, computed, onMounted, watch, nextTick } from "vue";
import { useRoute } from "vue-router";
import { useRouter } from "vue-router";
import { useToast } from "vue-toastification";
import BaseForm from "@/components/BaseForm.vue";
import { useForm } from "@/composables/useForm";
import { salesOrderFormService } from "@/services/penjualan/salesOrderFormService";
import { mapFormService } from "@/services/penjualan/mapFormService";
import { IconShoppingCartCopy } from "@tabler/icons-vue";
import api from "@/services/api";

// Komponen per Tab (Asumsi kita pisah filenya agar rapi)
import TabSpk from "./components/SalesOrderTabSo.vue";
import TabUkuran from "./components/SalesOrderTabUkuran.vue";
import TabAlokasi from "./components/SalesOrderTabAlokasi.vue";
import TabKaosan from "./components/SalesOrderTabKaosan.vue";
import SalesOrderTabKatalog from "./components/SalesOrderTabKatalog.vue";

// --- IMPORT MODAL PENCARIAN ---
import PerusahaanSearchModal from "@/components/lookups/PerusahaanSearchModal.vue";
import CustomerSearchModal from "@/components/lookups/CustomerSearchModal.vue";
import SalesSearchModal from "@/components/lookups/SalesSearchModal.vue";
import JenisOrderSearchModal from "@/components/lookups/JenisOrderSearchModal.vue";
import PenawaranSearchModal from "@/components/lookups/PenawaranSearchModal.vue";
import PabrikSearchModal from "@/components/lookups/PabrikSearchModal.vue";
import InvDcSearchModal from "@/components/lookups/InvDcSearchModal.vue";
import SoKaosanSearchModal from "@/components/lookups/SoKaosanSearchModal.vue";
import PenawaranDetailSearchModal from "@/components/lookups/PenawaranDetailSearchModal.vue";
import SpkSearchModal from "@/components/lookups/SpkSearchModal.vue";
import SjMemoSearchModal from "@/components/lookups/SjMemoSearchModal.vue";
import MapSearchModal from "@/components/lookups/MapSearchModal.vue";
import MppbSearchModal from "@/components/lookups/MppbSearchModal.vue";
import HistoryAlokasiModal from "@/components/lookups/HistoryAlokasiModal.vue";
import BarangKaosanSearchModal from "@/components/lookups/BarangKaosanSearchModal.vue";
import SetoranSearchModal from "@/components/lookups/SetoranSearchModal.vue";

const route = useRoute();
const router = useRouter();
const toast = useToast();
const isEditMode = computed(() => !!route.params.nomor);
const activeTab = ref(0);

const lookupOptions = ref({
  divisi: [] as any[],
  kepentingan: [] as string[],
  ketPo: [] as { ket: string; acc: string }[],
  // Tambahan state dropdown
  panjang: [] as string[],
  lebar: [] as string[],
  kain: [] as string[],
  gramasi: [] as string[],
  finishing: [] as string[],
});

// --- STATE VISIBILITAS MODAL ---
const showPerushModal = ref(false);
const showCustModal = ref(false);
const showCustKaosanModal = ref(false);
const showSalesModal = ref(false);
const showJoModal = ref(false);
const showPenawaranModal = ref(false);
const showPenawaranDetailModal = ref(false);
const selectedPenawaranNomor = ref("");
const showWorkshopModal = ref(false);
const showStokDcModal = ref(false);
const showSoKaosanModal = ref(false);
const showSpkLamaModal = ref(false);
const showSjMemoModal = ref(false);
const showMemoModal = ref(false);
const showMppbModal = ref(false);
const showRepeatModal = ref(false);
const showSetoranModal = ref(false);

const isLoadingMemo = ref(false);

// --- STATE KONFIRMASI BATAL CMO ---
const showConfirmCmoDialog = ref(false);

const showHistoryAlokasiModal = ref(false);

const showBarangKaosanModal = ref(false);
const activeKaosanIndex = ref(-1);

// --- HELPER TIMEZONE (ANTI MUNDUR 1 HARI) ---

// 1. Helper untuk data baru (Sesuai kalender lokal komputer)
const getTodayLocal = (addDays = 0) => {
  const d = new Date();
  d.setDate(d.getDate() + addDays);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

// 2. Helper untuk data dari Database (Menetralisir UTC API)
const getLocalDateString = (val: string | null | undefined): string => {
  if (!val) return "";
  const s = String(val);
  // Jika format ISO dengan timezone (ada T dan Z), shift +7 jam dulu
  if (s.includes("T") && (s.endsWith("Z") || s.includes("+00"))) {
    const d = new Date(s);
    if (isNaN(d.getTime())) return "";
    // Shift ke WIB (+7)
    const wib = new Date(d.getTime() + 7 * 60 * 60 * 1000);
    return wib.toISOString().substring(0, 10);
  }
  // Sudah format YYYY-MM-DD, ambil langsung
  return s.substring(0, 10);
};

const todayLocal = getTodayLocal(0);
const datelineLocal = getTodayLocal(7);

const toLocalDateStr = (val: string | null | undefined): string => {
  if (!val) return "";
  // Ambil 10 karakter pertama saja (YYYY-MM-DD), buang time & timezone
  return String(val).substring(0, 10);
};

const toDisplayDateTime = (isoStr: string): string => {
  if (!isoStr) return "";
  const d = new Date(isoStr);
  if (isNaN(d.getTime())) return "";
  // Shift +7 jam untuk WIB
  d.setHours(d.getHours() + 7);
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ` +
    `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
  );
};

const imageToUpload = ref<File | null>(null);

const accBuktiFile = ref<File | null>(null);
const wasApprovedOnLoad = ref(false);
const uploadAccBukti = (file: File) => {
  accBuktiFile.value = file;
};

// Data Kosong Default (Baru)
const defaultData = {
  spk_nomor: "",
  spk_tanggal: todayLocal,
  spk_dateline: datelineLocal,
  spk_tgl_po: todayLocal,
  spk_datelinepo: todayLocal,
  spk_tglaccproof: todayLocal,
  spk_cus_kode: "",
  Customer: "",
  spk_sal_kode: "",
  Sales: "",
  spk_jo_kode: "",
  JenisOrder: "",
  spk_nama: "",
  spk_nama2: "",
  spk_ukuran: "",
  spk_jumlah: 0,
  spk_kain: "",
  spk_finishing: "",
  spk_panjang: 0,
  spk_lebar: 0,
  spk_gramasi: "",
  spk_harga: 0,
  spk_hargariil: 0,
  spk_hargafee: 0,
  spk_perush_kode: "",
  NamaPerusahaan: "",
  spk_cab: "",
  spk_workshop: "",
  spk_divisi: 1,
  spk_statuskerja: "STANDART",
  spk_keterangan: "",
  spk_ketpo: "",
  ketpo_acc: "",
  spk_lama: "",
  spk_label: 0,
  spk_cmo: "",
  isCmoChecked: false,
  spk_pending: "NORMAL",
  spk_ketpending: "",
  spk_acc_customer: "N",
  spk_acc_tanggal: "",
  AccBuktiName: "",
  AccBuktiBlob: "",
  spk_accpending: "",
  cus_perfect: "N",
  spk_sizekhusus: "N",
  spk_varian_ukuran: "LENGAN_PENDEK",
  spk_sablon: "N",
  spk_bordir: "N",
  spk_sublim: "N",

  // Array untuk Tabel Detail
  spk_repeat: "",
  spk_nomormemo: "", // No. SJ Memo
  spk_memo: "",
  spk_mppb: "",
  jmlmppb: 0,
  spk_invdc: "", // Ambil stok DC / No. Pesanan
  jmlinvdc: 0,
  mkb: "",
  dtmkb: "",

  spk_desain: "",
  spk_newdesign: "N",

  spk_warna_badan: "",
  spk_warna_lengan: "",
  spk_warna_lain: "",

  spk_pinjo: "",

  spk_mpotong: "N",
  spk_mcetak: "N",
  spk_mbordir: "N",
  spk_mjahit: "N",
  spk_mfinishing: "N",

  spk_ppotong: "N",
  spk_pcetak: "N",
  spk_pbordir: "N",
  spk_pjahit: "N",
  spk_pfinishing: "N",

  pin_customer: "N",
  kepentingan_acc: "",

  spk_iscetak: "N",
  spk_standar_ukuran: "KENCANA",

  Alokasi: [],
  Kaosan: [],
  Sizes: [],

  Komponen: [] as any[],
  spk_acc_customer_display: "N",
  spk_acc_tanggal_display: "",
};

// Menggunakan composable useForm standar
const {
  isLoading,
  isSaving,
  showSaveDialog,
  showCancelDialog,
  showCloseDialog,
  formData,
  executeSave,
  executeCancel,
  executeClose,
} = useForm({
  menuId: "172",
  initialData: defaultData,
  fetchApi: async () => {
    const nomor = String(route.params.nomor);
    const res = await salesOrderFormService.getDetail(nomor);
    const d = res.data.data;

    // Mapping dari API Backend ke bentuk format input form
    return {
      ...d.header,
      spk_accpending: d.header.spk_accpending || "",
      spk_cmo: d.header.spk_cmo || "",
      Customer: d.header.cus_nama,
      Sales: d.header.sal_nama,
      JenisOrder: d.header.jo_nama,
      NamaPerusahaan: d.header.perush_nama,
      CustKaosanNama: d.header.cusk || "",

      spk_tanggal: getLocalDateString(d.header.spk_tanggal),
      spk_dateline: getLocalDateString(d.header.spk_dateline),
      spk_tgl_po: getLocalDateString(d.header.spk_tgl_po),
      spk_datelinepo: getLocalDateString(d.header.spk_datelinepo),
      spk_tglaccproof: getLocalDateString(d.header.spk_tglaccproof),

      spk_iscetak: d.header.spk_iscetak || d.header.mspk_iscetak || "N",
      spk_standar_ukuran: d.header.spk_standar_ukuran || "KENCANA",
      spk_varian_ukuran: d.header.spk_varian_ukuran || "LENGAN_PENDEK",

      isCmoChecked: false,

      date_create: d.header.date_create
        ? new Date(d.header.date_create).toLocaleString("id-ID", {
            timeZone: "Asia/Jakarta", // ← tambahkan ini
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
          })
        : "",

      // Pastikan mapping nama propertinya tepat
      cus_perfect: d.header.cus_perfect || "N",
      spk_pinjo: d.header.spk_pinjo || "",
      // Data Tambahan dari Join Subquery Backend
      mkb: d.header.mkb || "",
      dtmkb: d.header.dtmkb || "",
      jmlmppb: d.header.jmlmppb || 0,
      jmlinvdc: d.header.jmlinvdc || 0,

      // Fallback Checkbox (jika di DB null)
      spk_newdesign: d.header.spk_newdesign || "N",
      spk_mpotong: d.header.spk_mpotong || "N",
      spk_mcetak: d.header.spk_mcetak || "N",
      spk_mbordir: d.header.spk_mbordir || "N",
      spk_mjahit: d.header.spk_mjahit || "N",
      spk_mfinishing: d.header.spk_mfinishing || "N",
      spk_sizekhusus: d.header.spk_sizekhusus || "N",
      spk_sablon: d.header.spk_sablon || "N",
      spk_bordir: d.header.spk_bordir || "N",
      spk_sublim: d.header.spk_sublim || "N",

      Alokasi: d.alokasi || [],
      Kaosan: d.dtlKaosan || [],
      Sizes: (() => {
        // akan di-merge di onMounted setelah init-sizes load
        return d.dtlSize || [];
      })(),

      Komponen: d.komponen || [],
      spk_acc_customer_display: d.header.map_acc_customer || "N",
      spk_acc_tanggal_display: d.header.map_acc_tanggal
        ? getLocalDateString(d.header.map_acc_tanggal)
        : "",

      spk_acc_customer: d.header.spk_acc_customer || "N",
      spk_acc_tanggal: d.header.spk_acc_tanggal
        ? getLocalDateString(d.header.spk_acc_tanggal)
        : "",
    };
  },
  submitApi: async (data: any) => {
    // Siapkan Payload ke Backend
    const payload = {
      isEdit: isEditMode.value,
      isSalesOrder: true,
      header: {
        spk_nomor: data.spk_nomor,
        spk_tanggal: data.spk_tanggal,
        spk_dateline: data.spk_dateline,
        spk_nomor_po: data.spk_nomor_po || "",
        spk_tgl_po: data.spk_tgl_po || null,
        spk_datelinepo: data.spk_datelinepo || null,
        spk_cus_kode: data.spk_cus_kode,
        spk_sal_kode: data.spk_sal_kode,
        spk_jo_kode: data.spk_jo_kode,
        spk_nama: data.spk_nama,
        spk_ukuran: data.spk_ukuran,
        spk_jumlah: data.spk_jumlah,
        spk_kain: data.spk_kain,
        spk_finishing: data.spk_finishing,
        spk_panjang: data.spk_panjang,
        spk_lebar: data.spk_lebar,
        spk_gramasi: data.spk_gramasi,
        spk_harga: data.spk_harga,
        spk_hargariil: data.spk_hargariil,
        spk_hargafee: data.spk_hargafee,
        spk_perush_kode: data.spk_perush_kode,
        spk_cab: data.spk_cab,
        spk_workshop: data.spk_workshop,
        spk_divisi: data.spk_divisi,
        spk_statuskerja: data.spk_statuskerja,
        spk_keterangan: data.spk_keterangan,
        spk_ketpo: data.spk_ketpo,
        spk_lama: data.spk_lama,
        spk_label: data.spk_label,
        spk_cmo: data.spk_cmo,
        spk_pinjo: data.spk_pinjo,
        spk_accpending: data.spk_accpending,
        spk_nomormemo: data.spk_nomormemo, // ← No SJ Memo
        spk_memo: data.spk_memo, // ← No MAP
        spk_tipe: data.spk_tipe, // ← Tipe SPK
        spk_nama2: data.spk_nama2, // ← Nama Ext
        spk_aktif: data.spk_aktif, // ← tambah ini
        kepentingan_acc: data.kepentingan_acc, // ← tambah ini (untuk disimpan ke pin)
        pin_customer: data.pin_customer, // ← tambah ini
        ketpo_acc: data.ketpo_acc, // ← tambah ini
        spk_sizekhusus: data.spk_sizekhusus,
        spk_standar_ukuran: data.spk_standar_ukuran,
        spk_varian_ukuran: data.spk_varian_ukuran,
        spk_sablon: data.spk_sablon,
        spk_bordir: data.spk_bordir,
        spk_sublim: data.spk_sublim,
        spk_acc_customer: data.spk_acc_customer,
        spk_acc_tanggal: data.spk_acc_tanggal || null,
      },
      alokasi: data.Alokasi,
      dtlKaosan: data.Kaosan,
      dtlSize: data.Sizes,
      dtlKetKomponen: data.Komponen,
    };

    const res = await salesOrderFormService.saveData(payload);

    // Nomor SPK baru hasil dari DB (jika IsNewMode)
    const nomorSPK = res.data?.nomor || data.spk_nomor;

    // 2. Upload Gambar (Jika ada file yang dipilih)
    if (imageToUpload.value && nomorSPK) {
      try {
        const formDataUpload = new FormData();
        formDataUpload.append("gambar", imageToUpload.value);
        formDataUpload.append("spkNomor", nomorSPK);
        formDataUpload.append("cabang", data.spk_cab); // Misal: "HO-", "P01"

        await api.post(
          "/penjualan/sales-order/form/upload-gambar",
          formDataUpload,
          {
            headers: { "Content-Type": "multipart/form-data" },
          },
        );
      } catch (err) {
        toast.error("Data SPK tersimpan, tetapi gagal upload gambar.");
        console.error(err);
      }
    }
    if (accBuktiFile.value && nomorSPK) {
      try {
        const formDataAcc = new FormData();
        formDataAcc.append("gambar", accBuktiFile.value);
        formDataAcc.append("spkNomor", nomorSPK);
        formDataAcc.append("cabang", data.spk_cab);
        formDataAcc.append("type", "ACC");
        await api.post(
          "/penjualan/sales-order/form/upload-gambar",
          formDataAcc,
          {
            headers: { "Content-Type": "multipart/form-data" },
          },
        );
      } catch (err) {
        toast.error(
          "Data tersimpan, TAPI bukti persetujuan customer GAGAL terupload. Mohon buka ulang & upload ulang.",
          { timeout: 10000 },
        );
      }
    }

    return res;
  },
  onSuccess: (res: any) => {
    toast.success("Sales Order berhasil disimpan!");
    router.push({ name: "SalesOrderBrowse" });
  },
});

// Fungsi untuk memuat dropdown dari tb_informasi (Menggunakan service Map yang sudah ada)
const loadSpkInformasi = async (divisiKode: any) => {
  const raw =
    typeof divisiKode === "object" && divisiKode !== null
      ? String(divisiKode.value ?? divisiKode.title ?? "")
      : String(divisiKode ?? "");
  const kode = raw.charAt(0);

  // Jika bukan divisi 1 atau 5, reset saja
  if (kode !== "1" && kode !== "5") {
    lookupOptions.value.panjang = [];
    lookupOptions.value.lebar = [];
    lookupOptions.value.kain = [];
    lookupOptions.value.gramasi = [];
    lookupOptions.value.finishing = [];
    return;
  }

  try {
    const res = await mapFormService.getSpkInformasi(kode);
    const specs = res.data.data;
    lookupOptions.value.panjang = specs.PANJANG || [];
    lookupOptions.value.lebar = specs.LEBAR || [];
    lookupOptions.value.kain = specs.BAHAN || [];
    lookupOptions.value.gramasi = specs.GRAMASI || [];
    lookupOptions.value.finishing = specs.FINISHING || [];
  } catch (e) {
    console.error("Gagal memuat SPK Informasi", e);
  }
};

// Pantau perubahan Divisi untuk me-reload dropdown informasi
watch(
  () => formData.value.spk_divisi,
  (newDiv) => {
    if (newDiv) loadSpkInformasi(String(newDiv));
  },
  { immediate: true },
);

// Panggil API saat form di-mount
onMounted(async () => {
  try {
    const [resDivisi, resKepentingan, resKetPo, resSizes, resKomponen] =
      await Promise.all([
        api.get("/lookups/divisi"),
        api.get("/lookups/kepentingan-spk"),
        api.get("/lookups/ket-po"),
        api.get("/penjualan/sales-order/form/init-sizes"),
        salesOrderFormService.getKomponenMaster(),
      ]);

    lookupOptions.value.divisi = resDivisi.data.data.map((d: any) => ({
      value: String(d.kode),
      title: `${d.kode} - ${d.nama}`,
    }));
    lookupOptions.value.kepentingan = resKepentingan.data.data;
    lookupOptions.value.ketPo = resKetPo.data.data;

    // ← definisikan fullSizes dari response
    const fullSizes: any[] = resSizes.data.data || [];

    if (!isEditMode.value) {
      formData.value.Sizes = fullSizes;
      formData.value.Komponen = resKomponen.data.data || [];
    } else {
      // fetchData sudah dipanggil otomatis oleh useForm saat isEditMode
      // tunggu sebentar sampai formData terisi, lalu merge
      await nextTick();

      const existingSizes: any[] = formData.value.Sizes || [];
      formData.value.Sizes = fullSizes.map((row: any) => {
        const found = existingSizes.find((e: any) => e.size === row.size);
        return found
          ? { ...row, qty: found.qty, lb: found.lb, pb: found.pb }
          : row;
      });
    }

    if (isEditMode.value) {
      wasApprovedOnLoad.value = formData.value.spk_acc_customer === "Y";
    }
  } catch (error) {
    console.error("Gagal menarik data lookup dropdown:", error);
  }
});

// Menentukan tab mana saja yang boleh terlihat (Menyembunyikan Kaosan jika bukan divisi 3)
const isDivisiTiga = computed(() =>
  String(formData.value.spk_divisi).startsWith("3"),
);

// --- WATCHER UNTUK AUTO-FILL DIVISI 3 (KAOSAN) ---
watch(
  () => formData.value.spk_divisi,
  (newDiv) => {
    if (!isEditMode.value && !isLoadingMemo.value) {
      // ← tambahkan check
      if (String(newDiv).startsWith("3")) {
        formData.value.spk_perush_kode = "SM";
        formData.value.NamaPerusahaan = "Sukiman Setyo Manunggal";
        formData.value.spk_cus_kode = "DC";
        formData.value.Customer = "KAOSAN.OFFICIAL";
        formData.value.cus_perfect = "N";
      } else {
        formData.value.spk_perush_kode = "";
        formData.value.NamaPerusahaan = "";
        formData.value.spk_cus_kode = "";
        formData.value.Customer = "";
      }
    }
  },
  { immediate: true },
);

// --- Fungsi bersama: load standar ukuran Kencana ---
const fetchStandarUkuranSizes = async () => {
  if (formData.value.spk_standar_ukuran !== "KENCANA") return;
  if (!["3", "4"].includes(String(formData.value.spk_divisi).charAt(0))) return;
  if (!formData.value.spk_jo_kode) return;

  try {
    const res = await api.get("/penjualan/sales-order/form/standar-ukuran", {
      params: {
        joKode: formData.value.spk_jo_kode,
        varian: formData.value.spk_varian_ukuran || "STANDAR",
      },
    });
    const standarData: any[] = res.data.data || [];
    formData.value.Sizes = standarData.map((s: any) => {
      const existing = (formData.value.Sizes || []).find(
        (e: any) => e.size === s.size,
      );
      return existing ? { ...s, qty: existing.qty } : s;
    });
  } catch (e) {
    console.error("Gagal load standar ukuran", e);
  }
};

// Watch: setiap kali standar/jo_kode/varian/divisi berubah, langsung fetch
watch(
  [
    () => formData.value.spk_standar_ukuran,
    () => formData.value.spk_jo_kode,
    () => formData.value.spk_varian_ukuran,
    () => formData.value.spk_divisi,
  ],
  fetchStandarUkuranSizes,
);

// --- HANDLER EVENT MODAL DARI TAB ---
const handleLookup = (type: string) => {
  switch (type) {
    case "perusahaan":
      showPerushModal.value = true;
      break;
    case "customer":
      showCustModal.value = true;
      break;
    case "custKaosan":
      showCustKaosanModal.value = true;
      break;
    case "sales":
      showSalesModal.value = true;
      break;
    case "jenisOrder":
      showJoModal.value = true;
      break;
    case "workshop":
      showWorkshopModal.value = true;
      break;
    case "penawaran":
      showPenawaranModal.value = true;
      break;
    case "sjMemo":
      showSjMemoModal.value = true;
      break;
    case "memo":
      showMemoModal.value = true;
      break;
    case "mppb":
      showMppbModal.value = true;
      break;
    case "stokDc":
      showStokDcModal.value = true;
      break;
    case "soKaosan":
      showSoKaosanModal.value = true;
      break; // <--- Tambahkan Ini
    case "repeat":
      showRepeatModal.value = true;
      break;
    case "spkLama": // <--- TAMBAHKAN INI
      showSpkLamaModal.value = true;
      break;
    case "setoranPembayaran":
      if (!formData.value.spk_cus_kode) {
        toast.warning("Silahkan pilih Customer terlebih dahulu.");
        return;
      }
      showSetoranModal.value = true;
      break;
  }
};

// --- SETTER DATA DARI MODAL KE FORMDATA ---
const setPerush = (v: any) => {
  formData.value.spk_perush_kode = v.Kode || v.perush_kode;
  formData.value.NamaPerusahaan = v.Nama || v.perush_nama;
};
const setCust = (v: any) => {
  formData.value.spk_cus_kode = v.Kode || v.cus_kode;
  formData.value.Customer = v.Nama || v.cus_nama;
  formData.value.cus_perfect = v.cus_perfect || "N";

  // Panggil validasi (Cek Riwayat Piutang) langsung di parent
  handleFieldBlur("customer", formData.value.spk_cus_kode);
};
const setCustKaosan = (v: any) => {
  formData.value.spk_cus_kaosan = v.Kode || v.cus_kode;
  formData.value.CustKaosanNama = v.Nama || v.cus_nama;

  // Panggil validasi (Cek Riwayat Piutang) langsung di parent
  handleFieldBlur("custKaosan", formData.value.spk_cus_kaosan);
};
const setSales = (v: any) => {
  formData.value.spk_sal_kode = v.Kode || v.sal_kode;
  formData.value.Sales = v.Nama || v.sal_nama;
};
const setJo = (v: any) => {
  formData.value.spk_jo_kode = v.Kode || v.jo_kode;
  formData.value.JenisOrder = v.Nama || v.jo_nama;
};
const setWorkshop = (v: any) => {
  formData.value.spk_cab = v.Kode || v.pab_kode;
  formData.value.spk_workshop = v.Nama || v.pab_nama;
};
const setPenawaran = (v: any) => {
  const nomor = v.Nomor || v.pen_nomor;
  formData.value.spk_pen_nomor = nomor;
  formData.value.spk_pen_id = ""; // Reset ID tiap kali milih header baru
  selectedPenawaranNomor.value = nomor;
  showPenawaranDetailModal.value = true; // Langsung buka modal detail
};
const setPenawaranDetail = (v: any) => {
  formData.value.spk_pen_id = v.id || v.ID;
};
const setSoKaosan = (v: any) => {
  // Ambil Nomor SO DTF
  formData.value.spk_invdc = v.Nomor || v.so_nomor;

  // Jika customer Kaosan masih kosong, auto-fill dengan data dari SO
  if (!formData.value.spk_cus_kaosan) {
    formData.value.spk_cus_kaosan = v.KdCus || v.so_cus_kode;
    formData.value.CustKaosanNama = v.Customer || v.cus_nama;
  }

  // Di Delphi, SO Kaosan otomatis mengatur tgl po & dateline po
  if (v.Tanggal) {
    const parts = v.Tanggal.split("-"); // asumsi dd-mm-yyyy dari backend modal
    if (parts.length === 3)
      formData.value.spk_tgl_po = `${parts[2]}-${parts[1]}-${parts[0]}`;
  }
};
const setSjMemo = (v: any) =>
  (formData.value.spk_nomormemo = v.Nomor || v.sj_nomor);
// --- FUNGSI AUTO-FILL DARI MAP (Telah Dinormalisasi Casing-nya) ---
const loadDataMemo = async (nomor: string) => {
  if (!nomor) return;
  isLoadingMemo.value = true;
  isLoading.value = true;
  try {
    const res = await api.get("/penjualan/sales-order/form/memo-detail", {
      params: { nomor },
    });
    const data = res.data.data;

    if (data && data.header) {
      const h = Object.keys(data.header).reduce((acc: any, key: string) => {
        acc[key.toLowerCase()] = data.header[key];
        return acc;
      }, {});

      // Assign semua field KECUALI divisi dulu
      formData.value.spk_perush_kode = h.mspk_perush_kode || "";
      formData.value.NamaPerusahaan = h.perush_nama || "";
      formData.value.spk_cus_kode = h.mspk_cus_kode || "";
      formData.value.Customer = h.cus_nama || "";
      formData.value.cus_perfect = h.cus_perfect || "N";
      formData.value.spk_jo_kode = h.mspk_jo_kode || "";
      formData.value.JenisOrder = h.jo_nama || "";
      formData.value.spk_sal_kode = h.mspk_sal_kode || "";
      formData.value.Sales = h.sal_nama || "";
      formData.value.spk_nama = h.mspk_nama || "";
      formData.value.spk_nama2 = h.mspk_nama2 || h.mspk_nama || "";
      formData.value.spk_panjang = Number(h.mspk_panjang) || 0;
      formData.value.spk_lebar = Number(h.mspk_lebar) || 0;
      formData.value.spk_ukuran = h.mspk_ukuran || "";
      formData.value.KetUkuran = h.mspk_ukuran || "";
      formData.value.spk_gramasi = h.mspk_gramasi || "";
      formData.value.spk_kain = h.mspk_kain || "";
      formData.value.spk_finishing = h.mspk_finishing
        ? String(h.mspk_finishing).trim()
        : "";
      formData.value.spk_tipe = h.mspk_tipe || "";
      formData.value.spk_jumlah = Number(h.mspk_rencana_order) || 0;
      formData.value.spk_keterangan = h.mspk_keterangan || "";
      formData.value.spk_nomor_po = h.mspk_nomor_po || "";
      formData.value.spk_sablon = h.mspk_sablon || "N";
      formData.value.spk_bordir = h.mspk_bordir || "N";
      formData.value.spk_sublim = h.mspk_sublim || "N";
      formData.value.spk_harga = Number(h.mspk_harga) || 0;
      formData.value.spk_hargariil = Number(h.mspk_hargariil) || 0;
      formData.value.spk_acc_customer_display = h.mspk_acc_customer || "N";
      formData.value.spk_acc_tanggal_display = h.mspk_acc_tanggal
        ? getLocalDateString(h.mspk_acc_tanggal)
        : "";

      if (
        h.mspk_dateline &&
        String(h.mspk_dateline).length >= 10 &&
        !String(h.mspk_dateline).startsWith("0000")
      ) {
        formData.value.spk_dateline = getLocalDateString(h.mspk_dateline);
      }

      if (
        h.mspk_tgl_po &&
        String(h.mspk_tgl_po).length >= 10 &&
        !String(h.mspk_tgl_po).startsWith("0000")
      ) {
        formData.value.spk_tgl_po = getLocalDateString(h.mspk_tgl_po);
      }

      if (h.mspk_cab2) {
        formData.value.spk_cab = h.mspk_cab2;
        formData.value.spk_workshop = h.workshop2 || "";
      } else {
        formData.value.spk_cab = h.mspk_cab || "";
        formData.value.spk_workshop = h.workshop || "";
      }

      if (data.sizes && data.sizes.length > 0) {
        formData.value.Sizes = data.sizes.map((sz: any) => {
          const s = Object.keys(sz).reduce((acc: any, key: string) => {
            acc[key.toLowerCase()] = sz[key];
            return acc;
          }, {});
          return {
            size: s.mspks_size || "",
            qty: Number(s.mspks_qty) || 0,
            lb: Number(s.mspks_a) || 0,
            pb: Number(s.mspks_b) || 0,
          };
        });
      }

      // Set divisi TERAKHIR — watcher akan jalan tapi isLoadingMemo masih true
      formData.value.spk_divisi = String(h.mspk_divisi || 1);

      // Tunggu watcher selesai jalan baru reset flag
      await nextTick();
      await nextTick(); // double nextTick untuk memastikan semua reaktivitas selesai

      toast.success("Data berhasil dimuat dari MAP.");
    }
  } catch (e: any) {
    toast.error("Gagal menarik detail data MAP.");
    formData.value.spk_memo = "";
  } finally {
    isLoading.value = false;
    isLoadingMemo.value = false; // reset SETELAH nextTick di atas
  }
};
const setMemo = (v: any) => {
  const nomor = v.Nomor || v.mspk_nomor;
  formData.value.spk_memo = nomor;
  // Panggil auto-fill
  loadDataMemo(nomor);
};
const setStokDc = (v: any) => {
  formData.value.spk_invdc = v.Nomor || v.inv_nomor;
  formData.value.jmlinvdc = v.Qty || 0; // Set label qty
  formData.value.spk_jumlah = v.Qty || 0; // Auto-isi jumlah SPK
};
const setRepeat = (v: any) =>
  (formData.value.spk_repeat = v.Nomor || v.spk_nomor);
const setSpkLama = (v: any) =>
  (formData.value.spk_lama = v.Nomor || v.spk_nomor);
const setMppb = (v: any) => {
  formData.value.spk_mppb = v.Nomor || v.mpb_nomor;
  formData.value.jmlmppb = v.Jumlah || v.mpb_jmlorder || 0;
};
// Setter untuk menampung hasil pilihan setoran pembayaran ke Nomor PO
const setSetoranPembayaran = (v: any) => {
  formData.value.spk_nomor_po = v.Nomor;
  // Tanggal PO disesuaikan otomatis dengan tanggal transaksi setoran
  if (v.Tanggal) {
    formData.value.spk_tgl_po = getLocalDateString(v.Tanggal);
  }
  toast.success(`Nomor PO diisi menggunakan nomor setoran: ${v.Nomor}`);
};

// --- VALIDASI ON BLUR (MIRIP DELPHI ON EXIT) ---
const handleFieldBlur = async (type: string, value: string) => {
  if (!value) return;
  try {
    const res = await api.get("/penjualan/sales-order/form/validate", {
      params: { type, value, extra: formData.value.spk_nomor },
    });
    const result = res.data;

    // Jika Customer nunggak, backend akan mengirim result.pin = 'Y' dan result.warn
    if (type === "customer" || type === "custKaosan") {
      if (result.pin === "Y") {
        formData.value.pin_customer = "Y"; // Langsung lock PIN di UI
        toast.error(`Perhatian: ${result.warn}`, { timeout: 10000 }); // Munculkan notifikasi agak lama
      } else {
        formData.value.pin_customer = "N"; // Aman
      }
      return; // Selesai
    }

    if (result.warn && !confirm(result.warn)) {
      if (type === "memo") formData.value.spk_memo = "";
      return;
    }

    // Jika MAP valid, lakukan Auto-fill (Menggantikan logic loaddatamemo di OnExit)
    if (type === "memo") {
      loadDataMemo(value);
    }
    // Auto-fill lainnya
    else if (type === "mppb" && result.data?.jumlah) {
      formData.value.jmlmppb = result.data.jumlah;
    } else if (type === "invdc" && result.data?.jumlah) {
      formData.value.spk_jumlah = result.data.jumlah;
      formData.value.jmlinvdc = result.data.jumlah;
      toast.success(`Jumlah SPK otomatis terisi: ${result.data.jumlah}`);
    }
  } catch (e: any) {
    const errMsg = e.response?.data?.message || "Validasi gagal.";
    toast.error(errMsg);

    // Kosongkan field jika invalid (Sesuai Delphi .Clear & .SetFocus)
    if (type === "customer") {
      formData.value.spk_cus_kode = "";
      formData.value.Customer = "";
    }
    if (type === "custKaosan") {
      formData.value.spk_cus_kaosan = "";
      formData.value.CustKaosanNama = "";
    }
    if (type === "memo") formData.value.spk_memo = "";
    if (type === "mppb") {
      formData.value.spk_mppb = "";
      formData.value.jmlmppb = 0;
    }
    if (type === "invdc") {
      formData.value.spk_invdc = "";
      formData.value.jmlinvdc = 0; // <--- UPDATE INI
    }
    if (type === "spklama") formData.value.spk_lama = "";
  }
};

// Upload Image Logic
const uploadImageMain = (file: File) => {
  imageToUpload.value = file;
};

const validateSave = async () => {
  const fd = formData.value;
  const divisiStr = String(fd.spk_divisi).charAt(0);
  const qtyPesan = Number(fd.spk_jumlah) || 0;

  // 1. Validasi Field Wajib Dasar
  if (!fd.spk_perush_kode) {
    toast.warning("Perusahaan belum dipilih.");
    return;
  }
  if (!fd.spk_cus_kode) {
    toast.warning("Customer belum dipilih.");
    return;
  }
  if (!fd.spk_sal_kode) {
    toast.warning("Sales belum dipilih.");
    return;
  }
  if (!fd.spk_jo_kode) {
    toast.warning("Jenis Order belum dipilih.");
    return;
  }
  if (!fd.spk_nama?.trim()) {
    toast.warning("Nama SPK wajib diisi.");
    return;
  }
  if (!fd.spk_cab) {
    toast.warning("Workshop (Cabang) belum dipilih.");
    return;
  }

  if (!fd.spk_nomor_po?.trim()) {
    toast.warning(
      "Nomor PO harus diisi.\nJika tidak ada PO tertulis, cari DP Customer dari Penerimaan (tombol 🔍 di sebelah field Nomor PO).",
    );
    return;
  }

  // 2. Validasi Tanggal PO
  if (fd.spk_tgl_po && fd.spk_datelinepo) {
    if (new Date(fd.spk_datelinepo) < new Date(fd.spk_tgl_po)) {
      toast.warning("Tanggal Dateline PO harus >= Tanggal PO.");
      return;
    }
  }

  // ← BARU: Gate Persetujuan Customer — HANYA untuk SO tanpa referensi MAP
  if (!fd.spk_memo) {
    if (!isEditMode.value) {
      if (fd.spk_acc_customer !== "Y") {
        toast.warning(
          "Customer belum menyetujui pesanan ini. SO tidak bisa disimpan.",
        );
        return;
      }
      if (!fd.spk_acc_tanggal) {
        toast.warning("Tanggal persetujuan customer wajib diisi.");
        return;
      }
      if (!accBuktiFile.value) {
        toast.warning("Bukti screenshot persetujuan customer wajib diupload.");
        return;
      }
    } else if (!wasApprovedOnLoad.value && fd.spk_acc_customer === "Y") {
      if (!fd.spk_acc_tanggal) {
        toast.warning("Tanggal persetujuan customer wajib diisi.");
        return;
      }
    }
  }

  // 3. Validasi Divisi 1 & 5 (Spanduk/MMT)
  if (divisiStr === "1" || divisiStr === "5") {
    if (!fd.spk_panjang || !fd.spk_lebar) {
      toast.warning(
        "Ukuran Panjang dan Lebar harus diisi untuk divisi MMT/Spanduk.",
      );
      return;
    }
  }

  // 4. Validasi Harga 0
  if (Number(fd.spk_harga) === 0 && !fd.spk_ketpo && divisiStr !== "3") {
    toast.warning("Jika harga 0, Ket.PO wajib dipilih.");
    return;
  }

  // 5. Validasi SPK Lama (Ket. PO)
  const reqSpkLama = [
    "BARANG PENDUKUNG",
    "BARANG PER SET",
    "PRODUK PENGGANTI",
    "JASA TAMBAHAN",
  ];
  if (reqSpkLama.includes(fd.spk_ketpo) && !fd.spk_lama?.trim()) {
    toast.warning(`Untuk Ket. PO "${fd.spk_ketpo}", SPK Lama harus diisi!`);
    return;
  }

  // 6. Validasi Total Qty Alokasi vs Jumlah Pesanan
  if (fd.Alokasi && fd.Alokasi.length > 0) {
    const sumAlokasi = fd.Alokasi.reduce(
      (acc: number, curr: any) => acc + (Number(curr.jumlah) || 0),
      0,
    );
    if (sumAlokasi > 0 && sumAlokasi !== qtyPesan) {
      toast.warning("Jumlah SPK vs Total Qty Alokasi beda. Silahkan cek dulu.");
      return;
    }
  }

  // 7. Validasi Detail Kaosan (Khusus Divisi 3)
  if (divisiStr === "3") {
    if (!fd.Kaosan || fd.Kaosan.length === 0) {
      toast.warning("Detail barang kaosan harus diisi.");
      return;
    }
    const sumKaosan = fd.Kaosan.reduce(
      (acc: number, curr: any) => acc + (Number(curr.qtyorder) || 0),
      0,
    );
    if (sumKaosan === 0) {
      toast.warning("Detail barang kaosan Qty Order harus diisi.");
      return;
    }
    if (sumKaosan !== qtyPesan) {
      toast.warning(
        "Jumlah SPK vs Total Qty Order di Detail Barang Kaosan harus sama.",
      );
      return;
    }
  }

  // 8. Validasi Dateline Range (Sesuai btnsimpanClick Delphi)
  if (fd.kepentingan_acc !== "ACC") {
    try {
      const res = await api.get("/penjualan/sales-order/form/dateline-limits", {
        params: {
          divisi: fd.spk_divisi,
          joKode: fd.spk_jo_kode,
          kepentingan: fd.spk_statuskerja,
        },
      });
      const { minHari, maxHari, isKebal } = res.data.data;
      console.log("dateline check:", {
        minHari,
        maxHari,
        isKebal,
        tglSpk: fd.spk_tanggal,
        tglDateline: fd.spk_dateline,
        dt1: new Date(new Date(fd.spk_tanggal).getTime() + minHari * 86400000)
          .toISOString()
          .substring(0, 10),
        dt2: new Date(new Date(fd.spk_tanggal).getTime() + maxHari * 86400000)
          .toISOString()
          .substring(0, 10),
      });

      if (!isKebal && fd.spk_tanggal && fd.spk_dateline) {
        const tglSpk = new Date(fd.spk_tanggal).getTime();
        const tglDateline = new Date(fd.spk_dateline).getTime();
        const dt1 = tglSpk + minHari * 86400000;
        const dt2 = tglSpk + maxHari * 86400000;

        if (tglDateline < dt1 || tglDateline > dt2) {
          const fmtDate = (ts: number) => {
            const d = new Date(ts);
            return `${String(d.getDate()).padStart(2, "0")}-${String(d.getMonth() + 1).padStart(2, "0")}-${d.getFullYear()}`;
          };

          // Khusus divisi 6 + TOP URGENT + dateline < minimum → MINTA ACC, bukan reject
          if (
            divisiStr === "6" &&
            fd.spk_statuskerja === "TOP URGENT" &&
            tglDateline < dt1
          ) {
            if (fd.kepentingan_acc !== "ACC") {
              formData.value.kepentingan_acc = "MINTA ACC";
              formData.value.spk_aktif = "N";
              toast.warning(
                "Dateline < batas minimum. Membutuhkan ACC kepentingan.",
              );
            }
            // Tetap lanjut simpan (sesuai Delphi yang tidak exit di sini)
          } else {
            toast.warning(
              `Valid Dateline Range: ${fmtDate(dt1)} s/d ${fmtDate(dt2)}`,
            );
            return; // Batalkan simpan
          }
        }
      }
    } catch (e) {
      console.error("Gagal validasi dateline range", e);
    }
  }

  // Lolos semua validasi, buka konfirmasi simpan
  showSaveDialog.value = true;
};

const handleConfirmCmo = () => {
  showConfirmCmoDialog.value = true;
};

// Tombol "Approve": Tetap pertahankan approval (kembalikan centang)
const keepApproveCmo = () => {
  formData.value.isCmoChecked = true;
  showConfirmCmoDialog.value = false;
};

// Tombol "Batal": Batal approve beneran (centang dan nama dihapus)
const removeApproveCmo = () => {
  formData.value.spk_cmo = "";
  formData.value.isCmoChecked = false;
  showConfirmCmoDialog.value = false;
};

const handleOpenHistoryAlokasi = () => {
  if (!formData.value.spk_cus_kode) {
    toast.warning("Customer harus di isi dulu.");
    return;
  }
  showHistoryAlokasiModal.value = true;
};

const appendHistoryAlokasi = (selectedRows: any[]) => {
  if (!formData.value.Alokasi) formData.value.Alokasi = [];

  selectedRows.forEach((row) => {
    // Cegah duplikat alamat & kota yang sama
    const exists = formData.value.Alokasi.some(
      (a: any) => a.alamat === row.Alamat && a.kota === row.Kota,
    );
    if (!exists) {
      formData.value.Alokasi.push({
        alamat: row.Alamat,
        kota: row.Kota,
        person: "",
        hp: "",
        jumlah: 0,
      });
    }
  });
};

// Buka Modal dari klik di tabel
const handleOpenLookupBarang = (index: number) => {
  activeKaosanIndex.value = index;
  showBarangKaosanModal.value = true;
};

// Setter Data Barang Kaosan (Sesuai void loadbrg Delphi)
const setBarangKaosan = (selectedItems: any[]) => {
  if (!selectedItems || selectedItems.length === 0) return;

  const idx = activeKaosanIndex.value;
  let isFirstItem = true;

  selectedItems.forEach((v) => {
    // 1. Cek duplikasi
    const exists = formData.value.Kaosan.some(
      (k: any, i: number) =>
        i !== idx && k.kode === v.Kode && k.ukuran === v.Ukuran,
    );

    if (exists) {
      toast.warning(`Barang ${v.Nama} (${v.Ukuran}) sudah ada, dilewati.`);
      return;
    }

    // 2. Set Data Barang Kaosan
    if (isFirstItem && idx >= 0 && !formData.value.Kaosan[idx].kode) {
      // Jika ini item pertama dan baris pemanggil masih kosong, isi di situ
      formData.value.Kaosan[idx].kode = v.Kode;
      formData.value.Kaosan[idx].nama = v.Nama;
      formData.value.Kaosan[idx].ukuran = v.Ukuran;
      formData.value.Kaosan[idx].qtyorder = 1;
      isFirstItem = false;
    } else {
      // Jika item berikutnya, tambahkan baris baru di bawahnya
      formData.value.Kaosan.push({
        kode: v.Kode,
        nama: v.Nama,
        ukuran: v.Ukuran,
        qtyorder: 1,
      });
    }

    // 3. Tambahkan qty ke Detail Size
    if (!formData.value.Sizes) formData.value.Sizes = [];
    const sizeRow = formData.value.Sizes.find((s: any) => s.size === v.Ukuran);
    if (sizeRow) {
      sizeRow.qty += 1;
    } else {
      formData.value.Sizes.push({ size: v.Ukuran, qty: 1, lb: 0, pb: 0 });
    }
  });

  // Reset index pemanggil
  activeKaosanIndex.value = -1;
};

const onPilihKatalog = (item: any) => {
  formData.value.spk_nama = item.nama || "";
  formData.value.spk_kain = item.kain || "";
  formData.value.spk_ukuran = item.ukuran || "";
  formData.value.spk_finishing = item.finishing || "";
  toast.success(`SO ${item.nomor} dipilih sebagai referensi.`);
  activeTab.value = 0; // Kembali ke tab SO
};
</script>

<template>
  <BaseForm
    :title="isEditMode ? 'Ubah Sales Order' : 'Buat Sales Order'"
    menu-id="172"
    :icon="IconShoppingCartCopy"
    :is-loading="isLoading"
    :is-saving="isSaving"
    v-model:show-save-dialog="showSaveDialog"
    v-model:show-cancel-dialog="showCancelDialog"
    v-model:show-close-dialog="showCloseDialog"
    @validate-save="validateSave"
    @confirm-save="executeSave"
    @confirm-cancel="executeCancel"
    @confirm-close="executeClose"
  >
    <div class="pf-container">
      <!-- ── Tab Nav ── -->
      <div class="pf-tab-nav">
        <button
          class="pf-tab-btn"
          :class="{ active: activeTab === 0 }"
          @click="activeTab = 0"
        >
          SO
        </button>
        <button
          class="pf-tab-btn"
          :class="{ active: activeTab === 3 }"
          @click="activeTab = 3"
        >
          Detail Ukuran
        </button>
        <button
          class="pf-tab-btn"
          :class="{ active: activeTab === 1 }"
          @click="activeTab = 1"
        >
          Alokasi
        </button>
        <button
          v-if="isDivisiTiga"
          class="pf-tab-btn"
          :class="{ active: activeTab === 2 }"
          @click="activeTab = 2"
        >
          Kaosan / Detail Size
        </button>
        <button
          class="pf-tab-btn"
          :class="{ active: activeTab === 4 }"
          @click="activeTab = 4"
        >
          Katalog SO
        </button>
      </div>

      <!-- ── Tab Body ── -->
      <div class="pf-tab-body">
        <!-- Tab SO -->
        <div v-show="activeTab === 0" class="pf-tab-pane h-100">
          <TabSpk
            :formData="formData"
            :isEdit="isEditMode"
            :lookupOptions="lookupOptions"
            @upload-main="uploadImageMain"
            @open-lookup="(type) => handleLookup(type)"
            @field-blur="handleFieldBlur"
            @confirm-uncheck-cmo="handleConfirmCmo"
            @switch-tab="(val) => (activeTab = val)"
          />
        </div>

        <!-- Tab Alokasi -->
        <div v-show="activeTab === 1" class="pf-tab-pane h-100">
          <TabAlokasi
            :formData="formData"
            @open-history-alokasi="handleOpenHistoryAlokasi"
          />
        </div>

        <!-- Tab Kaosan -->
        <div
          v-if="isDivisiTiga"
          v-show="activeTab === 2"
          class="pf-tab-pane h-100"
        >
          <TabKaosan
            :formData="formData"
            @open-lookup-barang="handleOpenLookupBarang"
          />
        </div>

        <!-- Tab Detail Ukuran -->
        <div v-show="activeTab === 3" class="pf-tab-pane h-100">
          <TabUkuran
            :form-data="formData"
            :is-edit="isEditMode"
            @upload-acc-bukti="uploadAccBukti"
          />
        </div>

        <!-- Tab Katalog SO -->
        <div
          v-show="activeTab === 4"
          class="pf-tab-pane h-100"
          style="padding: 0; overflow: hidden"
        >
          <SalesOrderTabKatalog
            :cust-kode="formData.spk_cus_kode"
            :cust-nama="formData.Customer"
            @pilih="onPilihKatalog"
          />
        </div>
      </div>
    </div>

    <!-- ── Modals ── -->
    <PerusahaanSearchModal v-model="showPerushModal" @selected="setPerush" />
    <CustomerSearchModal v-model="showCustModal" @selected="setCust" />
    <CustomerSearchModal
      v-model="showCustKaosanModal"
      is-kaosan
      @selected="setCustKaosan"
    />
    <SalesSearchModal v-model="showSalesModal" @selected="setSales" />
    <JenisOrderSearchModal
      v-model="showJoModal"
      :divisi="formData.spk_divisi"
      @selected="setJo"
    />
    <PabrikSearchModal v-model="showWorkshopModal" @selected="setWorkshop" />
    <PenawaranSearchModal
      v-model="showPenawaranModal"
      :cust-kode="formData.spk_cus_kode"
      @selected="setPenawaran"
    />
    <PenawaranDetailSearchModal
      v-model="showPenawaranDetailModal"
      :penawaran-nomor="selectedPenawaranNomor"
      @selected="setPenawaranDetail"
    />
    <SjMemoSearchModal v-model="showSjMemoModal" @selected="setSjMemo" />
    <MapSearchModal v-model="showMemoModal" @selected="setMemo" />
    <MppbSearchModal v-model="showMppbModal" @selected="setMppb" />
    <SpkSearchModal v-model="showRepeatModal" @selected="setRepeat" />
    <SpkSearchModal v-model="showSpkLamaModal" @selected="setSpkLama" />
    <InvDcSearchModal v-model="showStokDcModal" @selected="setStokDc" />
    <SoKaosanSearchModal v-model="showSoKaosanModal" @selected="setSoKaosan" />
    <SetoranSearchModal
      v-model="showSetoranModal"
      :cust-kode="formData.spk_cus_kode"
      @selected="setSetoranPembayaran"
    />
    <HistoryAlokasiModal
      v-model="showHistoryAlokasiModal"
      :cust-kode="formData.spk_cus_kode"
      @selected="appendHistoryAlokasi"
    />
    <BarangKaosanSearchModal
      v-model="showBarangKaosanModal"
      @selected="setBarangKaosan"
    />

    <!-- Dialog Konfirmasi Batal CMO -->
    <v-dialog v-model="showConfirmCmoDialog" max-width="320px" persistent>
      <v-card class="rounded-lg">
        <v-card-title
          class="bg-primary text-white d-flex align-center pa-3 text-subtitle-1"
        >
          <v-icon icon="mdi-help-circle" class="mr-2" size="24" />
          Konfirmasi
        </v-card-title>
        <v-card-text class="pa-5 text-center text-body-1 font-weight-medium">
          Batal Approve?
        </v-card-text>
        <v-card-actions class="pa-3 bg-grey-lighten-4 justify-center gap-2">
          <v-btn
            color="primary"
            variant="elevated"
            @click="keepApproveCmo"
            width="100"
            >Approve</v-btn
          >
          <v-btn
            color="grey-darken-1"
            variant="outlined"
            @click="removeApproveCmo"
            width="100"
            >Batal</v-btn
          >
        </v-card-actions>
      </v-card>
    </v-dialog>
  </BaseForm>
</template>

<style scoped>
.pf-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #f4f5f7;
}

.pf-tab-nav {
  display: flex;
  background: #e0e0e0;
  border-bottom: 2px solid #bdbdbd;
  padding: 4px 8px 0;
  flex-shrink: 0;
}

.pf-tab-btn {
  padding: 6px 16px;
  font-size: 12px;
  font-weight: 600;
  color: #555;
  background: #eeeeee;
  border: 1px solid #ccc;
  border-bottom: none;
  border-radius: 4px 4px 0 0;
  cursor: pointer;
  margin-right: 4px;
  transition:
    background 0.15s,
    color 0.15s;
}
.pf-tab-btn:hover {
  background: #e0e0e0;
  color: #333;
}
.pf-tab-btn.active {
  background: white;
  color: #1565c0;
  border-color: #bdbdbd;
  border-bottom: 2px solid white;
  margin-bottom: -2px;
}

.pf-tab-body {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.pf-tab-pane {
  padding: 8px;
  overflow-y: auto;
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.h-100 {
  height: 100%;
}
</style>
