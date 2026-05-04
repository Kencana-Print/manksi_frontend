<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useForm } from "@/composables/useForm";
import { useRouter } from "vue-router";
import { useToast } from "vue-toastification";
import BaseForm from "@/components/BaseForm.vue";
import { penawaranFormService } from "@/services/penjualan/penawaranFormService";

// Import Komponen Tab
import TabPenawaranInput from "./components/TabPenawaranInput.vue";
import TabPenawaranKeterangan from "./components/TabPenawaranKeterangan.vue";

type PenawaranForm = typeof initialData;

const toast = useToast();
const currentTab = ref(0);
const router = useRouter();
// ── State Dialog Cetak ──
const showPrintDialog = ref(false);
const printStep = ref(1); // 1 = Pilih Gambar/Tidak, 2 = Pilih Orientasi
const savedNomor = ref(""); // Menyimpan nomor yang baru saja di-save

// Sesuai dengan field di database dan UI Delphi
const initialData = {
  Nomor: "",
  Divisi: "1",
  Tanggal: new Date().toISOString().substring(0, 10),
  Tipe: "Premium",
  PerushKode: "KP", // Kencana Print (default)
  CustKode: "",
  SalesKode: "",
  Keterangan: "",
  Note: "",
  Rekening: "",
  DpPer: 0,
  StatusHarga: 0, // 0 = Belum PPN
  TtdNama: "",
  TtdJabatan: "",
  Up: "",
  Marketing: "",
  MarketingTelp: "",
  CetakTotal: false,
  Panjang: 0,
  Lebar: 0,
  TambahanText: "", // Akan diisi dari checklist Tab Keterangan (1,2,3,dll)
  Fu1: "",
  Fu2: "",
  Fu3: "",
  Proyeksi: "",
  Mx: "N",
  DigitalSign: "N",
  StatusEdit: "MINTA",
  isTutupBuku: false,
  Details: [
    // Inisialisasi minimal 1 baris kosong
    {
      ID: "",
      NoPermintaan: "",
      NamaBarang: "",
      Bahan: "",
      Ukuran: "",
      Panjang: 0,
      Lebar: 0,
      Satuan: "PCS",
      Qty: 0,
      Harga: 0,
      Spk: "",
    },
  ],
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
} = useForm<PenawaranForm>({
  menuId: "151",
  initialData,
  fetchApi: async () => {
    const res = await penawaranFormService.getById(params.nomor as string);
    const d = res.data.data;
    return {
      Nomor: d.pen_nomor,
      Divisi: String(d.pen_divisi),
      Tanggal: d.pen_tanggal?.substring(0, 10) ?? "",
      Tipe: d.pen_tipe,
      PerushKode: d.pen_perush_kode,
      NamaPerusahaan: d.perush_nama || "Kencana Print", // <--- Tambahkan Ini
      CustKode: d.pen_cus_kode,
      NamaCustomer: d.cus_nama || "", // <--- Tambahkan Ini
      SalesKode: d.pen_sal_kode,
      NamaSales: d.sal_nama || "",
      Keterangan: d.pen_keterangan,
      Note: d.pen_note,
      Rekening: d.pen_rekening,
      DpPer: Number(d.pen_dpper) || 0,
      StatusHarga: Number(d.pen_status_harga) || 0,
      TtdNama: d.pen_ttd,
      TtdJabatan: d.pen_ttd_jabatan,
      Up: d.pen_up,
      Marketing: d.pen_marketing,
      MarketingTelp: d.pen_marketing_telp,
      CetakTotal: d.pen_cetaktotal === 1,
      Panjang: Number(d.pen_panjang) || 0,
      Lebar: Number(d.pen_lebar) || 0,
      TambahanText: d.pen_tambahan || "",
      Fu1: d.pen_fu1 || "",
      Fu2: d.pen_fu2 || "",
      Fu3: d.pen_fu3 || "",
      Proyeksi: d.pen_proyeksi || "",
      Mx: d.pen_mx || "N",
      DigitalSign: d.pen_digitalsign || "N",
      StatusEdit: d.StatusEdit,
      isTutupBuku: d.isTutupBuku,
      Details: (d.Details || []).map((det: any) => ({
        ID: det.pend_id,
        NoPermintaan: det.pend_minta,
        NamaBarang: det.pend_nama_barang,
        Bahan: det.pend_bahan,
        Ukuran: det.pend_ukuran,
        Panjang: Number(det.pend_panjang) || 0,
        Lebar: Number(det.pend_lebar) || 0,
        Satuan: det.pend_satuan,
        Qty: Number(det.pend_qty) || 0,
        Harga: Number(det.pend_harga) || 0,
        Spk: det.spk_terkait || "",
      })),
    };
  },
  submitApi: async (dataToSave: PenawaranForm): Promise<unknown> => {
    // Validasi Dasar sebelum kirim
    if (
      !dataToSave.PerushKode ||
      !dataToSave.CustKode ||
      !dataToSave.SalesKode
    ) {
      throw new Error("Perusahaan, Customer, dan Sales wajib diisi.");
    }
    const validDetails = dataToSave.Details.filter((d) => d.NamaBarang);
    if (validDetails.length === 0) {
      throw new Error("Minimal harus ada 1 detail barang.");
    }

    dataToSave.Details = validDetails;
    return await penawaranFormService.save(dataToSave, !isEditMode.value);
  },
  onSuccessRoute: "", // KOSONGKAN INI agar tidak auto-redirect back
  onSuccess: (res: any) => {
    toast.success("Data Penawaran berhasil disimpan.");
    savedNomor.value = res.data?.nomor || formData.value.Nomor;
    // Tampilkan dialog cetak
    printStep.value = 1;
    showPrintDialog.value = true;
  },
});

// ── Logika Navigasi Cetak ──
const closePrintAndExit = () => {
  showPrintDialog.value = false;
  router.push("/penjualan/penawaran"); // Redirect manual setelah dialog ditutup
};

const cetakTanpaGambar = () => {
  showPrintDialog.value = false;
  window.open(
    `/penjualan/penawaran/print/${encodeURIComponent(savedNomor.value)}?img=0`,
    "_blank",
  );
  router.push("/penjualan/penawaran");
};

const pilihGambarHorizontal = () => {
  showPrintDialog.value = false;
  window.open(
    `/penjualan/penawaran/print/${encodeURIComponent(savedNomor.value)}?img=1&layout=horz`,
    "_blank",
  );
  router.push("/penjualan/penawaran");
};

const pilihGambarVertikal = () => {
  showPrintDialog.value = false;
  // Untuk saat ini kita siapkan routenya, meskipun layout vertikal belum dibuat
  window.open(
    `/penjualan/penawaran/print/${encodeURIComponent(savedNomor.value)}?img=1&layout=vert`,
    "_blank",
  );
  router.push("/penjualan/penawaran");
};

onMounted(() => {
  if (isEditMode.value) fetchData();
});

const tabs = [{ title: "Sheet 1 (Input)" }, { title: "Sheet 2 (Keterangan)" }];
</script>

<template>
  <BaseForm
    :title="isEditMode ? 'Ubah Penawaran' : 'Tambah Penawaran'"
    menu-id="151"
    icon="mdi-file-document-outline"
    :is-loading="isLoading"
    :is-saving="isSaving"
    item-name="Penawaran"
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
          <TabPenawaranInput :form-data="formData" :is-edit="isEditMode" />
        </div>

        <div v-show="currentTab === 1" class="pf-tab-pane h-100">
          <TabPenawaranKeterangan :form-data="formData" />
        </div>
      </div>
    </div>
  </BaseForm>

  <v-dialog v-model="showPrintDialog" max-width="450px" persistent>
    <v-card class="rounded-lg">
      <v-card-title class="bg-primary text-white d-flex align-center pa-3">
        <v-icon start color="white">mdi-printer</v-icon>
        <span class="text-subtitle-1 font-weight-bold"
          >Cetak Surat Penawaran</span
        >
      </v-card-title>

      <v-card-text class="pa-4 text-center">
        <template v-if="printStep === 1">
          <div class="text-body-1 mb-4 text-grey-darken-3">
            Apakah Anda ingin mencetak dokumen ini menggunakan lampiran
            gambar/desain?
          </div>
          <div class="d-flex flex-column gap-2">
            <v-btn
              color="primary"
              variant="flat"
              prepend-icon="mdi-image"
              @click="printStep = 2"
              >Cetak Dengan Gambar</v-btn
            >
            <v-btn
              color="info"
              variant="tonal"
              prepend-icon="mdi-image-off"
              @click="cetakTanpaGambar"
              >Cetak Tanpa Gambar</v-btn
            >
          </div>
        </template>

        <template v-if="printStep === 2">
          <div class="text-body-1 mb-4 text-grey-darken-3">
            Pilih orientasi posisi gambar pada tabel rincian:
          </div>
          <div class="d-flex flex-column gap-2">
            <v-btn
              color="primary"
              variant="flat"
              prepend-icon="mdi-table-split-cell"
              @click="pilihGambarHorizontal"
              >Gambar Horizontal (Kanan)</v-btn
            >
            <v-btn
              color="info"
              variant="tonal"
              prepend-icon="mdi-table-row"
              @click="pilihGambarVertikal"
              >Gambar Vertikal (Bawah)</v-btn
            >
          </div>
        </template>
      </v-card-text>

      <v-card-actions class="pa-3 border-t bg-grey-lighten-4">
        <v-btn variant="text" color="error" @click="closePrintAndExit"
          >Tutup (Tidak Cetak)</v-btn
        >
        <v-spacer></v-spacer>
        <v-btn v-if="printStep === 2" variant="text" @click="printStep = 1"
          >Kembali</v-btn
        >
      </v-card-actions>
    </v-card>
  </v-dialog>
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
  overflow: hidden; /* Biarkan konten di dalam tab yang scroll */
}
.pf-tab-pane {
  padding: 8px;
}
</style>
