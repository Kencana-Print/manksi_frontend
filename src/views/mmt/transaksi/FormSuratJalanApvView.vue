<script setup lang="ts">
import { ref, onMounted, computed, watch } from "vue";
import { useRouter } from "vue-router";
import { useToast } from "vue-toastification";
import api from "@/services/api";

// --- Interfaces ---
interface DivisiOption {
  kode: number;
  nama: string;
  label: string;
}

interface SJApproveItem {
  no: number;
  apv: boolean;
  divisi: string;
  nomor: string;
  tanggal: string;
  gudang: string;
  kdcus: string;
  nama: string;
  alamat: string;
  kota: string;
  KodeGdg: string;
}

// --- Setup Hooks ---
const router = useRouter();
const toast = useToast();

// --- State & Variables (Replikasi Global Variables Delphi) ---
const zdivisi = ref(1); // Default simulasi divisi (1: MMT, 4: Garmen)
const userCabang = ref("P02"); // Default simulasi Cabang User dari Session (P01, P02, P04, dll)

const divisiOptions = ref<DivisiOption[]>([]);
const selectedDivisi = ref<string>("");
const isCheckAll = ref(false);

const tableData = ref<SJApproveItem[]>([]);
const loading = ref(false);

// State Progress Bar & Status Bar (Replikasi ProgressBar1 & StatusBar1)
const isSaving = ref(false);
const progressPosition = ref(0);
const statusText = ref("");

// --- Table Headers Configuration ---
const headers = [
  { title: "Approve", key: "apv", width: "70px", align: "center", fixed: true },
  { title: "No", key: "no", width: "50px", align: "center" },
  { title: "Divisi", key: "divisi", minWidth: "100px" },
  { title: "Nomor SJ", key: "nomor", minWidth: "150px" },
  { title: "Tanggal", key: "tanggal", minWidth: "120px" },
  { title: "Gudang", key: "gudang", minWidth: "150px" },
  { title: "Kode Cus", key: "kdcus", minWidth: "90px" },
  { title: "Nama Customer", key: "nama", minWidth: "180px" },
  { title: "Alamat", key: "alamat", minWidth: "250px" },
  { title: "Kota", key: "kota", minWidth: "120px" },
];

// --- Form Create / OnMounted (Replikasi FormCreate) ---
const initForm = async () => {
  loading.value = true;
  try {
    // 1. Ambil opsi divisi sesuai dengan hak akses (zdivisi & CAB)
    const resDivisi = await api.get("/inventory/divisi/list", {
      params: { zdivisi: zdivisi.value, cab: userCabang.value },
    });

    // Pemetaan data divisi dari backend (menghasilkan string '1 - MMT SPANDUK', dsb)
    divisiOptions.value = (resDivisi.data.data || []).map((d: any) => ({
      kode: d.kode,
      nama: d.nama,
      label: `${d.kode} - ${d.nama}`,
    }));

    // Set default item index combo box divisi
    if (zdivisi.value === 4) {
      selectedDivisi.value = divisiOptions.value[1]?.label || "";
    } else {
      selectedDivisi.value = divisiOptions.value[0]?.label || "";
    }

    // 2. Load data surat jalan setelah divisi siap
    await handleRefreshData();
  } catch (error) {
    toast.error("Gagal melakukan inisialisasi master data divisi.");
  } finally {
    loading.value = false;
  }
};

// --- Logika Fetch Data (Replikasi btnRefreshClick) ---
const handleRefreshData = async () => {
  loading.value = true;
  isCheckAll.value = false;
  statusText.value = "";
  progressPosition.value = 0;

  // Ekstrak kode divisi dari string label (misal '1 - MMT' ambil '1')
  const kodeDivisi = selectedDivisi.value
    ? selectedDivisi.value.split(" - ")[0]
    : "0";

  try {
    const res = await api.get("/inventory/surat-jalan/bulk-list", {
      params: {
        divisi: kodeDivisi,
        cabang: userCabang.value,
      },
    });

    // Masukkan data hasil query MySQL ke reactive array (Replikasi CDSGrid loop)
    tableData.value = (res.data.data || []).map((item: any, idx: number) => ({
      no: idx + 1,
      apv: false,
      divisi: item.divisi,
      nomor: item.SJ_Nomor,
      tanggal: item.SJ_Tanggal,
      gudang: item.gdg_nama,
      kdcus: item.SJ_cus_kode,
      nama: item.Cus_nama,
      alamat: item.Cus_alamat,
      kota: item.Cus_kota,
      KodeGdg: item.sj_gdg_kode,
    }));
  } catch (error) {
    toast.error("Gagal memuat daftar Surat Jalan.");
  } finally {
    loading.value = false;
  }
};

// --- Logika Cek All / Centang Massal (Replikasi cekallClick) ---
watch(isCheckAll, (newVal) => {
  tableData.value.forEach((row) => {
    row.apv = newVal;
  });
});

// --- Logika Aksi Approval Massal (Replikasi btnApvClick) ---
const handleBulkApproval = async () => {
  // Validasi data kosong
  if (
    tableData.value.length === 0 ||
    (tableData.value.length === 1 && !tableData.value[0].nomor)
  ) {
    toast.warning(
      "Tidak ada data yang akan di approval. Silahkan di refresh dulu.",
    );
    return;
  }

  // Filter hanya data yang dicentang oleh user
  const targetItems = tableData.value.filter((item) => item.apv && item.nomor);
  if (targetItems.length === 0) {
    toast.warning(
      "Silahkan pilih (centang) data yang ingin di-approve terlebih dahulu.",
    );
    return;
  }

  if (!confirm("Yakin akan di approval massal?")) return;

  isSaving.value = true;
  progressPosition.value = 0;

  const totalRecord = targetItems.length;
  let successCount = 0;

  try {
    // Memproses data satu per satu agar progress bar berjalan presisi sesuai logika Delphi
    for (let i = 0; i < totalRecord; i++) {
      const currentItem = targetItems[i];

      // Hitung dan update presentase progress bar ke UI secara reaktif
      const percentage = Math.round(((i + 1) / totalRecord) * 100);
      progressPosition.value = percentage;
      statusText.value = `Progress ${percentage}%`;

      // Kirim perintah eksekusi query update & insert ke API backend
      await api.post("/inventory/surat-jalan/approve-direct", {
        nomor: currentItem.nomor,
        kodeGdg: currentItem.KodeGdg,
      });

      successCount++;
    }

    toast.success(`Selesai. Berhasil memproses ${successCount} Surat Jalan.`);
    await handleRefreshData(); // Reload table
  } catch (error) {
    toast.error("Proses tersendat atau Gagal Simpan di pertengahan data.");
  } finally {
    isSaving.value = false;
  }
};

// --- Form Close (Replikasi FormClose / Release) ---
const handleCloseForm = () => {
  router.push({ name: 'SuratJalanApproveMmtBrowse' }); // Kembali ke Form Utama/Browse1
};

onMounted(initForm);
</script>

<template>
  <v-container fluid class="pa-4 bg-grey-lighten-4 fill-height align-start">
    <v-card
      width="100%"
      flat
      border
      class="rounded-lg d-flex flex-column fill-height"
    >
      <!-- Panel Atas / Header Form (Replikasi AdvPanel1 & AdvPanel3) -->
      <v-toolbar color="primary" dark flat density="comfortable">
        <v-icon
          class="ml-4"
          icon="mdi-checkbox-multiple-marked-circle-outline"
        ></v-icon>
        <v-toolbar-title class="text-subtitle-1 font-weight-bold">
          Persetujuan Massal Surat Jalan
        </v-toolbar-title>
        <v-spacer></v-spacer>
        <v-btn
          icon
          @click="handleCloseForm"
          :disabled="isSaving"
          title="Keluar Form"
        >
          <v-icon>mdi-close</v-icon>
        </v-btn>
      </v-toolbar>

      <!-- Panel Kontrol Divisi & Tombol Aksi (Replikasi AdvPanel2) -->
      <v-row class="pa-4 align-center border-bottom bg-white" dense>
        <v-col cols="12" sm="4" md="3">
          <v-select
            v-model="selectedDivisi"
            :items="divisiOptions"
            item-title="label"
            item-value="label"
            label="Divisi Perusahaan"
            density="compact"
            variant="outlined"
            hide-details
            :disabled="isSaving || loading"
            @update:model-value="handleRefreshData"
          />
        </v-col>

        <v-col
          cols="12"
          sm="8"
          md="9"
          class="d-flex justify-start align-center flex-wrap gap-2"
        >
          <v-btn
            color="primary"
            prepend-icon="mdi-refresh"
            variant="elevated"
            :disabled="isSaving || loading"
            @click="handleRefreshData"
          >
            Refresh
          </v-btn>
          <v-btn
            color="success"
            prepend-icon="mdi-check-all"
            variant="elevated"
            :disabled="isSaving || loading || !tableData.length"
            @click="handleBulkApproval"
          >
            Approval Massal
          </v-btn>
          <v-btn
            color="grey-darken-1"
            prepend-icon="mdi-arrow-left"
            variant="outlined"
            :disabled="isSaving"
            @click="handleCloseForm"
          >
            Kembali
          </v-btn>

          <v-checkbox
            v-model="isCheckAll"
            label="Pilih Semua Data (Check All)"
            density="compact"
            hide-details
            class="ml-sm-4 mt-0 pt-0 font-weight-bold checkbox-all"
            :disabled="isSaving || loading || !tableData.length"
          />
        </v-col>
      </v-row>

      <!-- Data Table Main Area (Replikasi Grid & Layout Spreadsheet ClientDataSet) -->
      <div class="table-container flex-grow-1 bg-white">
        <v-data-table
          :headers="headers"
          :items="tableData"
          :loading="loading"
          density="compact"
          :items-per-page="-1"
          hide-default-footer
          no-data-text="Tidak ada Surat Jalan yang membutuhkan persetujuan saat ini."
          class="manksi-grid"
        >
          <!-- Custom Slot Render Checkbox pada baris data -->
          <template #[`item.apv`]="{ item }">
            <v-checkbox-btn
              v-model="item.apv"
              color="primary"
              :disabled="isSaving"
              density="compact"
              class="justify-center d-flex"
            />
          </template>

          <!-- Format field Tanggal agar rapi -->
          <template #[`item.tanggal`]="{ value }">
            {{
              value
                ? new Date(value).toLocaleDateString("id-ID", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                  })
                : ""
            }}
          </template>

          <!-- Loading Linear indicator di dalam grid -->
          <template #loading>
            <v-progress-linear
              indeterminate
              color="primary"
              height="2"
            ></v-progress-linear>
          </template>
        </v-data-table>
      </div>

      <!-- StatusBar & ProgressBar Bagian Bawah Form (Replikasi StatusBar1 & ProgressBar1) -->
      <v-divider />
      <div
        class="status-bar pa-2 d-flex align-center bg-grey-lighten-3 border-top text-caption"
      >
        <div
          class="status-text font-weight-medium text-grey-darken-2 flex-grow-1"
        >
          {{ statusText || (loading ? "Memuat data dari server..." : "Siap.") }}
        </div>
        <div v-if="isSaving" class="progress-wrapper d-flex align-center">
          <v-progress-linear
            v-model="progressPosition"
            color="success"
            height="14"
            striped
            rounded
            class="progress-bar-fixed"
          >
            <template #default="{ value }">
              <strong class="text-white text-x-small"
                >{{ Math.ceil(value) }}%</strong
              >
            </template>
          </v-progress-linear>
        </div>
      </div>
    </v-card>
  </v-container>
</template>

<style scoped>
.table-container {
  overflow-y: auto;
  max-height: calc(100vh - 200px);
}

.manksi-grid {
  font-size: 11.5px;
}

/* Modifikasi border grid agar mirip DevExpress Grid */
:deep(.v-data-table__th) {
  background-color: #f5f5f5 !important;
  font-weight: bold !important;
  color: #333333 !important;
  border: 1px solid #e0e0e0 !important;
}

:deep(.v-data-table__td) {
  border: 1px solid #f0f0f0 !important;
  height: 32px !important;
}

.gap-2 {
  gap: 8px;
}

.checkbox-all :deep(.v-label) {
  font-size: 12px;
  color: #1565c0;
}

.status-bar {
  height: 36px;
  border-bottom-left-radius: 8px;
  border-bottom-right-radius: 8px;
}

.progress-bar-fixed {
  width: 200px;
}

.text-x-small {
  font-size: 9px;
}
</style>
