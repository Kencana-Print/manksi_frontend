<script setup lang="ts">
import { ref, computed, onMounted, watch, nextTick } from "vue";
import { useRoute } from "vue-router";
import { useToast } from "vue-toastification";
import BaseForm from "@/components/BaseForm.vue";
import { useForm } from "@/composables/useForm";
import { salesOrderFormService } from "@/services/penjualan/salesOrderFormService";
import { mapFormService } from "@/services/penjualan/mapFormService";
import { IconShoppingCartCopy } from "@tabler/icons-vue";
import api from "@/services/api";

// Komponen per Tab (Asumsi kita pisah filenya agar rapi)
import TabSpk from "./components/SalesOrderTabSo.vue";
import TabAlokasi from "./components/SalesOrderTabAlokasi.vue";
import TabKaosan from "./components/SalesOrderTabKaosan.vue";

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

const route = useRoute();
const toast = useToast();
const isEditMode = computed(() => !!route.params.nomor);
const activeTab = ref(0);

const lookupOptions = ref({
  divisi: [] as any[],
  kepentingan: [] as string[],
  ketPo: [] as string[],
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

// Placeholder untuk modal yang belum dibuat komponennya
const showSjMemoModal = ref(false);
const showMemoModal = ref(false);
const showMppbModal = ref(false);
const showRepeatModal = ref(false);

const isLoadingMemo = ref(false);

// --- STATE KONFIRMASI BATAL CMO ---
const showConfirmCmoDialog = ref(false);

const showHistoryAlokasiModal = ref(false);

const showBarangKaosanModal = ref(false);
const activeKaosanIndex = ref(-1);

// Data Kosong Default (Baru)
const defaultData = {
  spk_nomor: "",
  spk_tanggal: new Date().toISOString().substring(0, 10),
  spk_dateline: new Date(new Date().setDate(new Date().getDate() + 7))
    .toISOString()
    .substring(0, 10),
  spk_tgl_po: "",
  spk_datelinepo: "",
  spk_cus_kode: "",
  Customer: "",
  spk_sal_kode: "",
  Sales: "",
  spk_jo_kode: "",
  JenisOrder: "",
  spk_nama: "",
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
  spk_lama: "",
  spk_label: 0,
  spk_cmo: "",
  isCmoChecked: false,

  // Array untuk Tabel Detail
  Alokasi: [],
  Kaosan: [],
  Sizes: [],
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
      spk_cmo: d.header.spk_cmo || "",
      Customer: d.header.cus_nama,
      Sales: d.header.sal_nama,
      JenisOrder: d.header.jo_nama,
      NamaPerusahaan: d.header.perush_nama,

      spk_tanggal: d.header.spk_tanggal?.substring(0, 10) || "",
      spk_dateline: d.header.spk_dateline?.substring(0, 10) || "",
      spk_tgl_po: d.header.spk_tgl_po?.substring(0, 10) || "",
      spk_datelinepo: d.header.spk_datelinepo?.substring(0, 10) || "",
      isCmoChecked: false,

      Alokasi: d.alokasi || [],
      Kaosan: d.dtlKaosan || [],
      Sizes: d.dtlSize || [],
    };
  },
  submitApi: async (data: any) => {
    // Siapkan Payload ke Backend
    const payload = {
      isEdit: isEditMode.value,
      header: {
        spk_nomor: data.spk_nomor,
        spk_tanggal: data.spk_tanggal,
        spk_dateline: data.spk_dateline,
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
      },
      alokasi: data.Alokasi,
      dtlKaosan: data.Kaosan,
      dtlSize: data.Sizes,
    };

    return await salesOrderFormService.saveData(payload);
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
    const [resDivisi, resKepentingan, resKetPo] = await Promise.all([
      api.get("/lookups/divisi"),
      api.get("/lookups/kepentingan-spk"),
      api.get("/lookups/ket-po"),
    ]);

    lookupOptions.value.divisi = resDivisi.data.data.map((d: any) => ({
      value: String(d.kode),
      title: `${d.kode} - ${d.nama}`,
    }));
    lookupOptions.value.kepentingan = resKepentingan.data.data;
    lookupOptions.value.ketPo = resKetPo.data.data;
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
};
const setCustKaosan = (v: any) => {
  formData.value.spk_cus_kaosan = v.Kode || v.cus_kode;
  formData.value.CustKaosanNama = v.Nama || v.cus_nama; // Buat properti baru di formData
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
      formData.value.spk_finishing = h.mspk_finishing || "";
      formData.value.spk_jumlah = Number(h.mspk_rencana_order) || 0;
      formData.value.spk_keterangan = h.mspk_keterangan || "";
      formData.value.spk_nomor_po = h.mspk_nomor_po || "";
      formData.value.spk_sablon = h.mspk_sablon || "N";
      formData.value.spk_bordir = h.mspk_bordir || "N";
      formData.value.spk_sublim = h.mspk_sublim || "N";
      formData.value.spk_cmo = h.mspk_cmo || "";
      formData.value.spk_harga = Number(h.mspk_harga) || 0;
      formData.value.spk_hargariil = Number(h.mspk_hargariil) || 0;

      if (
        h.mspk_tgl_po &&
        String(h.mspk_tgl_po).length >= 10 &&
        !String(h.mspk_tgl_po).startsWith("0000")
      ) {
        formData.value.spk_tgl_po = String(h.mspk_tgl_po).substring(0, 10);
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
const setStokDc = (v: any) =>
  (formData.value.spk_invdc = v.Nomor || v.inv_nomor);
const setRepeat = (v: any) =>
  (formData.value.spk_repeat = v.Nomor || v.spk_nomor);
const setSpkLama = (v: any) =>
  (formData.value.spk_lama = v.Nomor || v.spk_nomor);
const setMppb = (v: any) => {
  formData.value.spk_mppb = v.Nomor || v.mpb_nomor;
  formData.value.jmlmppb = v.Jumlah || v.mpb_jmlorder || 0;
};

// --- VALIDASI ON BLUR (MIRIP DELPHI ON EXIT) ---
const handleFieldBlur = async (type: string, value: string) => {
  if (!value) return;
  try {
    const res = await api.get("/penjualan/sales-order/form/validate", {
      params: { type, value, extra: formData.value.spk_nomor },
    });
    const result = res.data;

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
      toast.success(`Jumlah SPK otomatis terisi: ${result.data.jumlah}`);
    }
  } catch (e: any) {
    const errMsg = e.response?.data?.message || "Validasi gagal.";
    toast.error(errMsg);

    // Kosongkan field jika invalid (Sesuai Delphi .Clear & .SetFocus)
    if (type === "memo") formData.value.spk_memo = "";
    if (type === "mppb") {
      formData.value.spk_mppb = "";
      formData.value.jmlmppb = 0;
    }
    if (type === "invdc") formData.value.spk_invdc = "";
    if (type === "spklama") formData.value.spk_lama = "";
  }
};

// Upload Image Logic
const uploadImageMain = (file: File) => {
  // Disiapkan untuk upload gambar SPK ke backend
  // Biasanya dikirim sebagai FormData menggunakan api terpisah
  console.log("Image main to upload:", file);
};

const validateSave = () => {
  if (!formData.value.spk_cus_kode) {
    toast.warning("Customer belum dipilih.");
    return;
  }
  if (!formData.value.spk_nama?.trim()) {
    toast.warning("Nama SPK wajib diisi.");
    return;
  }

  // --- VALIDASI SPK LAMA BERDASARKAN KET. PO (Migrasi Delphi) ---
  const ketPo = formData.value.spk_ketpo;
  const requiresSpkLama = [
    "BARANG PENDUKUNG",
    "BARANG PER SET",
    "PRODUK PENGGANTI",
    "JASA TAMBAHAN",
  ];

  if (requiresSpkLama.includes(ketPo) && !formData.value.spk_lama?.trim()) {
    toast.warning(`Untuk Ket. PO "${ketPo}", SPK Lama harus diisi!`);
    // (Di sini kita tidak pakai .SetFocus manual karena Toast sudah cukup jelas,
    // tapi proses save digagalkan via return)
    return;
  }

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
const setBarangKaosan = (v: any) => {
  if (activeKaosanIndex.value < 0) return;
  const idx = activeKaosanIndex.value;

  // 1. Cek duplikasi (Jika kode & ukuran sama di baris lain)
  const exists = formData.value.Kaosan.some(
    (k: any, i: number) =>
      i !== idx && k.kode === v.Kode && k.ukuran === v.Ukuran,
  );
  if (exists) {
    toast.warning("Barang dan ukuran ini sudah diinput di baris lain.");
    return;
  }

  // 2. Set Data Barang
  const row = formData.value.Kaosan[idx];
  row.kode = v.Kode;
  row.nama = v.Nama;
  row.ukuran = v.Ukuran;
  row.qtyorder = 1; // Default qty sesuai Delphi

  // 3. Tambahkan qty ke Detail Size (CDS4)
  if (!formData.value.Sizes) formData.value.Sizes = [];
  const sizeRow = formData.value.Sizes.find((s: any) => s.size === v.Ukuran);
  if (sizeRow) {
    sizeRow.qty += 1;
  } else {
    // Opsional: Jika ukurannya belum ada di tabel Size, tambahkan baru
    formData.value.Sizes.push({ size: v.Ukuran, qty: 1, lb: 0, pb: 0 });
  }

  // Reset index
  activeKaosanIndex.value = -1;
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
    @validate-save="() => (showSaveDialog = true)"
    @confirm-save="executeSave"
    @confirm-cancel="executeCancel"
    @confirm-close="executeClose"
  >
    <!-- Slot default, bukan #content -->
    <v-card class="elevation-0 fill-height d-flex flex-column bg-transparent">
      <v-tabs
        v-model="activeTab"
        color="primary"
        density="compact"
        class="flex-shrink-0"
      >
        <v-tab :value="0" class="text-caption font-weight-bold">SO</v-tab>
        <v-tab :value="1" class="text-caption font-weight-bold">Alokasi</v-tab>
        <v-tab
          v-if="isDivisiTiga"
          :value="2"
          class="text-caption font-weight-bold"
          >Kaosan / Detail Size</v-tab
        >
      </v-tabs>

      <v-window v-model="activeTab" class="flex-grow-1 overflow-auto pa-2">
        <v-window-item :value="0" class="fill-height">
          <TabSpk
            :formData="formData"
            :isEdit="isEditMode"
            :lookupOptions="lookupOptions"
            @upload-main="uploadImageMain"
            @open-lookup="(type) => handleLookup(type)"
            @field-blur="handleFieldBlur"
            @confirm-uncheck-cmo="handleConfirmCmo"
          />
        </v-window-item>
        <v-window-item :value="1">
          <TabAlokasi
            :formData="formData"
            @open-history-alokasi="handleOpenHistoryAlokasi"
          />
        </v-window-item>
        <v-window-item v-if="isDivisiTiga" :value="2">
          <TabKaosan
            :formData="formData"
            @open-lookup-barang="handleOpenLookupBarang"
          />
        </v-window-item>
      </v-window>

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
      <SoKaosanSearchModal
        v-model="showSoKaosanModal"
        @selected="setSoKaosan"
      />

      <v-dialog v-model="showConfirmCmoDialog" max-width="320px" persistent>
        <v-card class="rounded-lg">
          <v-card-title
            class="bg-primary text-white d-flex align-center pa-3 text-subtitle-1"
          >
            <v-icon icon="mdi-help-circle" class="mr-2" size="24"></v-icon>
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
            >
              Approve
            </v-btn>
            <v-btn
              color="grey-darken-1"
              variant="outlined"
              @click="removeApproveCmo"
              width="100"
            >
              Batal
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>

      <HistoryAlokasiModal
        v-model="showHistoryAlokasiModal"
        :cust-kode="formData.spk_cus_kode"
        @selected="appendHistoryAlokasi"
      />

      <BarangKaosanSearchModal
        v-model="showBarangKaosanModal"
        @selected="setBarangKaosan"
      />
    </v-card>
  </BaseForm>
</template>
