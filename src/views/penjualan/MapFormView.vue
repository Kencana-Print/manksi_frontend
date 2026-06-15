<script setup lang="ts">
import { ref, onMounted, watch } from "vue";
import { useForm } from "@/composables/useForm";
import { useToast } from "vue-toastification";
import { useRouter } from "vue-router";
import api from "@/services/api"; // Untuk lookup generic seperti divisi
import { mapFormService } from "@/services/penjualan/mapFormService";
import BaseForm from "@/components/BaseForm.vue";
import {
  IconFileDescription,
  IconPrinter,
  IconLayoutSidebarRight,
  IconLayoutSidebarRightCollapse,
} from "@tabler/icons-vue";

// Import Komponen Tab
import TabMap from "./components/TabMap.vue";
import TabLainLain from "./components/TabLainLain.vue";

const toast = useToast();
const currentTab = ref(0);

// File holder untuk upload setelah save
const mainImageFile = ref<File | null>(null);
const emailImageFile = ref<File | null>(null);

const router = useRouter();
// const showPrintDialog = ref(false);
// const savedNomor = ref("");

// ── STATE LOOKUPS ──
const lookupOptions = ref({
  divisi: [] as any[],
  panjang: [] as string[],
  lebar: [] as string[],
  ukuran: [] as string[], // Standar ukuran dari db jika ada
  kain: [] as string[],
  gramasi: [] as string[],
  finishing: [] as string[],
});

const toISODate = (val: any) => {
  if (!val) return "";

  const d = new Date(val);

  // Handle tanggal null Delphi
  if (d.getFullYear() <= 1900) return "";

  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const initialData = {
  Nomor: "",
  Divisi: "1",
  IsMo: false,
  UserCreate: "",
  IsCmo: false,
  Cmo: "",
  Status: "AKTIF",
  TipeSpk: "",
  StatusKerja: "Normal",
  PerushKode: "",
  NamaPerusahaan: "",
  Tanggal: new Date().toISOString().substring(0, 10),
  Created: "",
  TglPO: "",
  NomorPO: "",
  Penawaran: "",
  PenawaranId: "",
  MintaHarga: "",
  CustPerfect: "N",
  CustKode: "",
  CustNama: "",
  SalesKode: "",
  SalesNama: "",
  JoKode: "",
  JenisOrder: "",
  Nama: "",
  Nama2: "",
  Jumlah: 0,
  Ukuran: "",
  Panjang: 0,
  Lebar: 0,
  KetUkuran: "",
  Gramasi: "",
  Kain: "",
  Finishing: "",
  Sablon: "N",
  Bordir: "N",
  Sublim: "N",
  Cab: "",
  Workshop: "",
  DesignBaru: "N",
  Cab2: "",
  Workshop2: "",
  DateLine: new Date().toISOString().substring(0, 10),
  EstimasiJadi: "",
  RencanaOrder: 0,
  HargaJual: 0,
  HargaRiil: 0,
  RencanaSize: "BRAKEDOWN SIZE",
  IsRevisi: "N",
  RevisiNo: 0,
  Referensi: "",
  RevisiNote: "",
  TipeRevisi: 1, // 0 = External, 1 = Internal
  Keterangan: "",
  StatusEdit: "",
  isTutupBuku: false,
  MainImageName: "",
  MainImageBlob: "",
  EmailImageName: "",
  EmailImageBlob: "",
  Sizes: [] as any[],
  Komponen: [] as any[],
};

// Fungsi Helper Mapping agar Konsisten antara Fetch Edit & Load Referensi
const mapMapData = (rawData: any) => {
  // 1. NORMALISASI KEY: Ubah semua key dari backend menjadi huruf kecil (lowercase)
  // Ini memperbaiki masalah field kosong akibat "MSPK_Nomor" vs "mspk_nomor"
  const d: any = {};
  for (const key in rawData) {
    if (Object.prototype.hasOwnProperty.call(rawData, key)) {
      d[key.toLowerCase()] = rawData[key];
    }
  }

  // Ekstrak array tambahan bawaan backend
  d.sizes = rawData.Sizes || [];
  d.komponen = rawData.Komponen || [];
  d.statusedit = rawData.StatusEdit ?? "";
  d.istutupbuku = rawData.isTutupBuku || false;

  // 2. Mapping ke struktur formData
  return {
    Nomor: d.mspk_nomor || "",
    Divisi: String(d.mspk_divisi),
    IsMo: true,
    UserCreate: d.user_create || "ADMIN",
    IsCmo: !!d.mspk_cmo,
    Cmo: d.mspk_cmo || "",
    Status: d.mspk_aktif === "Y" ? "AKTIF" : "PASIF",
    TipeSpk: d.mspk_tipe || "",
    StatusKerja: d.mspk_statuskerja || "Normal",
    PerushKode: d.mspk_perush_kode || "",
    NamaPerusahaan: d.perush_nama || "",
    Tanggal: toISODate(d.mspk_tanggal),
    Created: d.date_create
      ? new Date(d.date_create).toLocaleString("id-ID")
      : "",
    TglPO: toISODate(d.mspk_tgl_po),
    NomorPO: d.mspk_nomor_po || "",
    Penawaran: d.mspk_pen_nomor || "",
    PenawaranId: d.mspk_pen_id || "",
    MintaHarga: d.mspk_mh_nomor || "",
    CustPerfect: d.cus_perfect || "N",
    CustKode: d.mspk_cus_kode || "",
    CustNama: d.cus_nama || "",
    SalesKode: d.mspk_sal_kode || "",
    SalesNama: d.sal_nama || "",
    JoKode: d.mspk_jo_kode || "",
    JenisOrder: d.jo_nama || "",
    Nama: d.mspk_nama || "",
    Nama2: d.mspk_nama2 || "",
    Jumlah: Number(d.mspk_jumlah) || 0,
    Ukuran: d.mspk_rencana_size || "",
    Panjang: Number(d.mspk_panjang) || 0,
    Lebar: Number(d.mspk_lebar) || 0,
    KetUkuran: d.mspk_ukuran || "", // Ini "Ket. Ukuran" di tampilan Delphi
    Gramasi: d.mspk_gramasi || "",
    Kain: d.mspk_kain || "",
    Finishing: d.mspk_finishing || "",
    Sablon: d.mspk_sablon || "N",
    Bordir: d.mspk_bordir || "N",
    Sublim: d.mspk_sublim || "N",
    Cab: d.mspk_cab || "",
    Workshop: d.mspk_workshop || "",
    DesignBaru: d.mspk_newdesign || "N",
    Cab2: d.mspk_cab2 || d.mspk_cab || "",
    Workshop2: d.mspk_workshop2 || d.mspk_workshop || "",
    DateLine: toISODate(d.mspk_dateline),
    EstimasiJadi: toISODate(d.mspk_estimasijadi),
    RencanaOrder: Number(d.mspk_rencana_order) || 0,
    HargaJual: Number(d.mspk_harga) || 0,
    HargaRiil: Number(d.mspk_hargariil) || 0,
    RencanaSize: d.mspk_rencana_size || "BRAKEDOWN SIZE",
    IsRevisi: d.mspk_revisi || "N",
    RevisiNo: Number(d.mspk_revisi_no) || 0,
    Referensi: d.mspk_referensi || "",
    RevisiNote: d.mspk_revisi_note || "",
    TipeRevisi: Number(d.mspk_tipe_revisi) || 0,
    Keterangan: d.mspk_keterangan || "",
    StatusEdit: d.statusedit,
    isTutupBuku: d.istutupbuku,
    Sizes: d.sizes,
    Komponen: d.komponen,
  };
};

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
  params,
} = useForm({
  menuId: "162",
  initialData,
  fetchApi: async () => {
    const res = await mapFormService.getById(params.nomor as string);
    return mapMapData(res.data.data);
  },
  submitApi: async (dataToSave) => {
    // ── 0. ValidASI DELPHI: CEK STATUS EDIT SEBELUM SIMPAN ──
    if (isEditMode.value) {
      const status = dataToSave.StatusEdit;
      if (isEditMode.value && (status === "WAIT" || status === "TOLAK")) {
        throw new Error(
          "Transaksi tsb sudah diclose.\nSilahkan minta approve untuk bisa menyimpan perubahan data.",
        );
      }
    }

    if (!dataToSave.NomorPO?.trim()) {
      throw new Error(
        "Nomor PO harus diisi.\nJika tidak ada PO tertulis, cari DP Customer dari Penerimaan (tombol 🔍 di sebelah field Nomor PO).",
      );
    }

    // 1. Validasi Minimum sebelum kirim
    if (!dataToSave.Cab) throw new Error("Kode Workshop MAP wajib diisi.");
    if (!dataToSave.Nama) throw new Error("Nama Pekerjaan wajib diisi.");
    if (!dataToSave.JoKode) throw new Error("Jenis Order wajib diisi.");

    // 2. Simpan Data Form
    const res = await mapFormService.save(dataToSave, !isEditMode.value);
    const savedNomor = res.data.nomor;

    // 3. Upload Gambar jika ada file baru yang dipilih
    try {
      if (mainImageFile.value) {
        await mapFormService.uploadGambar(
          mainImageFile.value,
          savedNomor,
          dataToSave.Cab,
          "MAIN",
        );
      }
      if (emailImageFile.value) {
        await mapFormService.uploadGambar(
          emailImageFile.value,
          savedNomor,
          dataToSave.Cab,
          "EMAIL",
        );
      }
    } catch (imgError: any) {
      toast.warning(
        `Data tersimpan, namun upload gambar gagal: ${imgError.message}`,
      );
    }

    return res;
  },
  onSuccess: (res: any) => {
    toast.success("Data MAP berhasil disimpan.");
    router.push("/penjualan/map");
  },
});

defineExpose({ mapMapData });

// ── LOGIC LOAD INIT & DROPDOWNS ──
const loadInitData = async () => {
  try {
    // Load Divisi Umum
    const resDiv = await api.get("/lookups/divisi");
    lookupOptions.value.divisi = resDiv.data.data
      .filter((d: any) => d.kode !== 0)
      .map((d: any) => ({
        title: `${d.kode} - ${d.nama}`,
        value: String(d.kode),
      }));

    // Jika mode TAMBAH BARU, pancing Grid Size & Komponen kosong
    if (!isEditMode.value) {
      const resGrid = await mapFormService.getInitGrids();
      formData.value.Sizes = resGrid.data.data.sizes;
      formData.value.Komponen = resGrid.data.data.komponen;
    }
  } catch (e) {
    console.error("Gagal memuat init data MAP", e);
  }
};

const loadSpkInformasi = async (divisiKode: any) => {
  // Handle object dari v-select: { title: "1 - SPANDUK", value: "1" }
  const raw =
    typeof divisiKode === "object" && divisiKode !== null
      ? String(divisiKode.value ?? divisiKode.title ?? "")
      : String(divisiKode ?? "");
  const kode = raw.charAt(0); // "1 - SPANDUK" → "1", atau "1" → "1"
  if (!kode || kode === "0") return;
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

// Pantau perubahan Divisi — { immediate: true } agar langsung load saat mount
watch(
  () => formData.value.Divisi,
  (newDiv) => {
    if (newDiv) loadSpkInformasi(String(newDiv));
  },
  { immediate: true }, // ← tambahkan ini
);

onMounted(async () => {
  await loadInitData();
  // Paksa load dropdown untuk divisi default
  await loadSpkInformasi(String(formData.value.Divisi));
  if (isEditMode.value) {
    await fetchData();
    // Reload setelah fetch karena divisi bisa berubah
    await loadSpkInformasi(String(formData.value.Divisi));
  }
});

// ── HANDLER FILE UPLOAD DARI TAB ──
const handleMainUpload = (file: File) => {
  mainImageFile.value = file;
};

const handleEmailUpload = (file: File) => {
  emailImageFile.value = file;
};

// ── Logika Navigasi Cetak ──
// const closePrintAndExit = () => {
//   showPrintDialog.value = false;
//   router.push("/penjualan/map"); // Kembali ke browse list
// };

// const pilihGambarVertikal = () => {
//   showPrintDialog.value = false;
//   window.open(
//     `/penjualan/map/print/${encodeURIComponent(savedNomor.value)}?layout=vertikal`,
//     "_blank",
//   );
//   router.push("/penjualan/map");
// };

// const pilihGambarHorizontal = () => {
//   showPrintDialog.value = false;
//   window.open(
//     `/penjualan/map/print/${encodeURIComponent(savedNomor.value)}?layout=horizontal`,
//     "_blank",
//   );
//   router.push("/penjualan/map");
// };

const tabs = [{ title: "MAP" }, { title: "Lain-Lain" }];
</script>

<template>
  <BaseForm
    :title="
      isEditMode
        ? 'Ubah Memo Approval Produk (MAP)'
        : 'Tambah Memo Approval Produk (MAP)'
    "
    menu-id="162"
    :icon="IconFileDescription"
    :is-loading="isLoading"
    :is-saving="isSaving"
    item-name="MAP"
    v-model:show-save-dialog="showSaveDialog"
    v-model:show-cancel-dialog="showCancelDialog"
    v-model:show-close-dialog="showCloseDialog"
    @validate-save="showSaveDialog = true"
    @confirm-save="executeSave"
    @confirm-cancel="executeCancel"
    @confirm-close="executeClose"
  >
    <div class="pf-container">
      <div class="pf-tab-nav">
        <button
          v-for="(tab, idx) in tabs"
          :key="idx"
          class="pf-tab-btn"
          :class="{ active: currentTab === idx }"
          @click="currentTab = idx"
        >
          {{ tab.title }}
        </button>
      </div>

      <div class="pf-tab-body">
        <div v-show="currentTab === 0" class="pf-tab-pane h-100">
          <TabMap
            :form-data="formData"
            :is-edit="isEditMode"
            :lookup-options="lookupOptions"
            :map-map-data="mapMapData"
            @upload-main="handleMainUpload"
          />
        </div>

        <div v-show="currentTab === 1" class="pf-tab-pane h-100">
          <TabLainLain
            :form-data="formData"
            :is-edit="isEditMode"
            @upload-email="handleEmailUpload"
          />
        </div>
      </div>
    </div>
  </BaseForm>

  <!-- <v-dialog v-model="showPrintDialog" max-width="450px" persistent>
    <v-card class="rounded-lg">
      <v-card-title class="bg-primary text-white d-flex align-center pa-3">
        <IconPrinter
          :size="18"
          :stroke-width="1.7"
          color="white"
          class="mr-2"
        />
        <span class="text-subtitle-1 font-weight-bold"
          >Cetak Pra SPK (MAP)</span
        >
      </v-card-title>

      <v-card-text class="pa-4 text-center">
        <div class="text-body-1 mb-4 text-grey-darken-3">
          Data berhasil disimpan! Pilih orientasi cetak untuk dokumen ini:
        </div>
        <div class="d-flex flex-column gap-2">
          <v-btn color="primary" variant="flat" @click="pilihGambarVertikal">
            <template #prepend
              ><IconLayoutSidebarRight :size="15" :stroke-width="1.7"
            /></template>
            Cetak Vertikal (Portrait)
          </v-btn>
          <v-btn color="info" variant="tonal" @click="pilihGambarHorizontal">
            <template #prepend
              ><IconLayoutSidebarRightCollapse :size="15" :stroke-width="1.7"
            /></template>
            Cetak Horizontal (Landscape)
          </v-btn>
        </div>
      </v-card-text>

      <v-card-actions class="pa-3 border-t bg-grey-lighten-4">
        <v-btn variant="text" color="error" @click="closePrintAndExit"
          >Tutup (Tidak Cetak)</v-btn
        >
        <v-spacer></v-spacer>
      </v-card-actions>
    </v-card>
  </v-dialog> -->
</template>

<style scoped>
/* Struktur tab yang konsisten dengan form lainnya */
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
  display: flex; /* ← tambah */
  flex-direction: column; /* ← tambah */
}
.pf-tab-pane {
  padding: 8px;
  overflow-y: auto;
  flex: 1; /* ← tambah */
  display: flex; /* ← tambah */
  flex-direction: column; /* ← tambah */
}
</style>
