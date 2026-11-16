<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, computed, reactive } from "vue";
import { useRouter, useRoute } from "vue-router";
import { format, parseISO } from "date-fns";
import { useToast } from "vue-toastification";
import api from "@/services/api";
import PageLayout from "@/components/PageLayout.vue";

import MesinLookupModal from "@/modal/MesinLookupModal.vue";

interface PlanningDetailItem {
  tanggal: string;
  mesin: string;
  datang: number;
  cetak: number;
  finishing: number;
  kirim: number;
  ketcetak: string;
  ketfinishing: string;
  ketkirim: string;
  usr: string;
  dtusr: string;
}

interface FormDataState {
  nomorSpk: string;
  namaSpk: string;
  tanggalSpk: string;
  dateline: string;
  jumlahSpk: number;
  panjang: number;
  lebar: number;
  cabang: string;
  workshop: string;
  tipe: string;
  kain: string;
  finishing: string;
  sablon: boolean;
  sublim: boolean;
  bordir: boolean;
  detailPlanning: PlanningDetailItem[];
}

const router = useRouter();
const route = useRoute(); // Digunakan untuk menangkap parameter dari Browse SPK
const toast = useToast();
const API_URL = "/mmt/planning-produksi";

const isEditMode = ref(false);
const isSaving = ref(false);
const isMesinModalVisible = ref(false);
const activeDetailIndex = ref<number | null>(null);

const formData = reactive<FormDataState>({
  nomorSpk: "",
  namaSpk: "",
  tanggalSpk: "",
  dateline: "",
  jumlahSpk: 0,
  panjang: 0,
  lebar: 0,
  cabang: "",
  workshop: "",
  tipe: "",
  kain: "",
  finishing: "",
  sablon: false,
  sublim: false,
  bordir: false,
  detailPlanning: [],
});

const headerPlanning = [
  { title: "No", key: "index", width: "50px", align: "center" as const },
  { title: "Tanggal", key: "tanggal", width: "140px" },
  { title: "Mesin", key: "mesin", width: "130px" },
  { title: "Cetak (Pcs)", key: "cetak", width: "100px", align: "end" as const },
  {
    title: "Finishing",
    key: "finishing",
    width: "100px",
    align: "end" as const,
  },
  { title: "Kirim", key: "kirim", width: "100px", align: "end" as const },
  { title: "Ket Cetak", key: "ketcetak", width: "150px" },
  { title: "Ket Finishing", key: "ketfinishing", width: "150px" },
  { title: "Ket Kirim", key: "ketkirim", width: "150px" },
  { title: "Aksi", key: "actions", width: "60px", align: "center" as const },
];

const totalCetak = computed(() =>
  formData.detailPlanning.reduce(
    (sum, item) => sum + (Number(item.cetak) || 0),
    0,
  ),
);
const totalFinishing = computed(() =>
  formData.detailPlanning.reduce(
    (sum, item) => sum + (Number(item.finishing) || 0),
    0,
  ),
);
const totalKirim = computed(() =>
  formData.detailPlanning.reduce(
    (sum, item) => sum + (Number(item.kirim) || 0),
    0,
  ),
);

const initGridDefaults = () => {
  formData.detailPlanning = [
    {
      tanggal: "",
      mesin: "",
      datang: 0,
      cetak: 0,
      finishing: 0,
      kirim: 0,
      ketcetak: "",
      ketfinishing: "",
      ketkirim: "",
      usr: "",
      dtusr: "",
    },
  ];
};

// --- FUNGSI UTAMA: Load Otomatis Data SPK yang di-klik dari Browse ---
const loadSpkFromBrowse = async (nomorSpk: string) => {
  if (!nomorSpk) return;
  isSaving.value = true;
  try {
    const response = await api.get(`${API_URL}/load-spk/${nomorSpk}`);
    const res = response.data.data;

    if (res && res.header) {
      const h = res.header;
      formData.nomorSpk = h.spk_nomor;
      formData.namaSpk = h.spk_Nama;
      formData.tanggalSpk = h.tgl ? format(parseISO(h.tgl), "yyyy-MM-dd") : "";
      formData.dateline = h.dateline
        ? format(parseISO(h.dateline), "yyyy-MM-dd")
        : "";
      formData.jumlahSpk = Number(h.spk_jumlah) || 0;
      formData.panjang = Number(h.spk_panjang) || 0;
      formData.lebar = Number(h.spk_lebar) || 0;
      formData.cabang = h.spk_cab || "";
      formData.workshop = h.spk_workshop || "";
      formData.tipe = h.spk_tipe || "";
      formData.kain = h.spk_kain || "";
      formData.finishing = h.spk_Finishing || "";
      formData.sablon = h.spk_sablon === "Y";
      formData.sublim = h.spk_sublim === "Y";
      formData.bordir = h.spk_bordir === "Y";

      // Jika sebelumnya sudah pernah di-planning oleh SPV, tampilkan datanya (Mode Edit)
      if (Array.isArray(res.detail) && res.detail.length > 0) {
        isEditMode.value = true;
        formData.detailPlanning = res.detail.map((d: any) => ({
          tanggal: format(parseISO(d.plan_tanggal), "yyyy-MM-dd"),
          mesin: d.plan_mesin,
          datang: Number(d.plan_datang) || 0,
          cetak: Number(d.plan_cetak) || 0,
          finishing: Number(d.plan_finishing) || 0,
          kirim: Number(d.plan_kirim) || 0,
          ketcetak: d.plan_ketcetak || "",
          ketfinishing: d.plan_ketfinishing || "",
          ketkirim: d.plan_ketkirim || "",
          usr: d.plan_usr || "",
          dtusr: d.plan_dtusr || "",
        }));
      } else {
        // Jika SPK ini baru dan belum pernah di-planning, buka grid kosong siap isi
        isEditMode.value = false;
        initGridDefaults();
      }
    } else {
      toast.error("Data SPK tidak ditemukan di database.");
    }
  } catch (error) {
    toast.error("Gagal mengambil data SPK dari server.");
  } finally {
    isSaving.value = false;
  }
};

const refreshData = () => {
  const querySpk = route.query.spk_nomor;
  if (querySpk) {
    loadSpkFromBrowse(querySpk as string);
  } else {
    initGridDefaults();
  }
};

const handleRowFieldChange = (index: number) => {
  const currentRow = formData.detailPlanning[index];
  if (!currentRow.tanggal) return;

  const isDuplicate = formData.detailPlanning.some((item, idx) => {
    return (
      idx !== index &&
      item.tanggal === currentRow.tanggal &&
      item.mesin.toUpperCase() === currentRow.mesin.toUpperCase() &&
      currentRow.mesin !== ""
    );
  });

  if (isDuplicate) {
    toast.error(`Tanggal dan mesin ini sudah terinput dibaris ${index + 1}`);
    currentRow.mesin = "";
    return;
  }

  if (currentRow.tanggal !== "") {
    // Otomatisasi pengisian log user & waktu persis logis Delphi
    currentRow.usr = localStorage.getItem("kdUser") || "SPV_PRODUCTION";
    currentRow.dtusr = format(new Date(), "yyyy-MM-dd HH:mm:ss");
  }
};

const openMesinLookup = (index: number) => {
  activeDetailIndex.value = index;
  isMesinModalVisible.value = true;
};

const handleMesinSelect = (mesin: { Kode: string; Nama: string }) => {
  if (activeDetailIndex.value !== null && mesin.Kode) {
    formData.detailPlanning[activeDetailIndex.value].mesin = mesin.Kode;
    handleRowFieldChange(activeDetailIndex.value);
  }
  isMesinModalVisible.value = false;
};

const validateCetakField = (index: number) => {
  const currentRow = formData.detailPlanning[index];
  if (currentRow.mesin.length < 2 && currentRow.cetak > 0) {
    toast.error("Kode mesin belum diisi");
    currentRow.cetak = 0;
  }
};

const addRowPlanning = () => {
  formData.detailPlanning.push({
    tanggal: "",
    mesin: "",
    datang: 0,
    cetak: 0,
    finishing: 0,
    kirim: 0,
    ketcetak: "",
    ketfinishing: "",
    ketkirim: "",
    usr: "",
    dtusr: "",
  });
};

const removeRowPlanning = (index: number) => {
  if (confirm("Hapus record ini?")) {
    formData.detailPlanning.splice(index, 1);
    if (formData.detailPlanning.length === 0) initGridDefaults();
  }
};

const saveForm = async () => {
  if (!formData.nomorSpk)
    return toast.warning("Tidak ada SPK yang di-planning.");

  if (
    formData.detailPlanning.length <= 1 &&
    formData.detailPlanning[0].tanggal === ""
  ) {
    return toast.warning("Tidak ada data planning, data tidak dapat disimpan.");
  }

  for (let i = 0; i < formData.detailPlanning.length; i++) {
    if (
      formData.detailPlanning[i].tanggal !== "" &&
      formData.detailPlanning[i].mesin === ""
    ) {
      return toast.warning(
        `Cek kembali inputan di baris ${i + 1}. Kolom mesin wajib diisi.`,
      );
    }
  }

  if (!confirm("Yakin ingin simpan data planning ini?")) return;

  isSaving.value = true;
  try {
    let currentForceSave = false;
    let keepTrying = true;
    let finalResponse = null;

    // Gunakan perulangan while untuk menampung konfirmasi over-capacity
    while (keepTrying) {
      const payload = {
        spk_nomor: formData.nomorSpk,
        panjang: formData.panjang,
        lebar: formData.lebar,
        details: formData.detailPlanning.filter((d) => d.tanggal !== ""),
        forceSave: currentForceSave,
      };

      const response = await api.post(`${API_URL}/save`, payload);

      if (response.data?.overCapacityAlert) {
        const proceed = confirm(
          `${response.data.message}\nTetap lanjutkan simpan ke database?`,
        );
        if (proceed) {
          currentForceSave = true; // Aktifkan flag force save untuk loop berikutnya
          continue; // Ulang kirim data dengan payload baru
        } else {
          keepTrying = false; // Batalkan proses simpan
          isSaving.value = false;
          return;
        }
      }

      // Jika sukses tanpa alert atau setelah forceSave disetujui
      finalResponse = response.data;
      keepTrying = false;
    }

    // Eksekusi toast sukses hanya dilakukan SATU KALI di akhir proses linear
    if (
      finalResponse &&
      (finalResponse.success || finalResponse.status === "success")
    ) {
      toast.success("Berhasil disimpan.");
      router.push({ name: 'PlanningProduksiMmtBrowse' }); // Sesuaikan nama rute browse Anda
    }
  } catch (err: any) {
    console.error(err);
    toast.error(err.response?.data?.message || "Gagal Simpan Data.");
  } finally {
    isSaving.value = false;
  }
};

const handleGlobalShortcuts = (e: KeyboardEvent) => {
  if (e.key === "F10") {
    e.preventDefault();
    saveForm();
  } else if (e.key === "F7") {
    e.preventDefault();
    if (confirm("Reset form planning saat ini?")) {
      // PERBAIKAN: Selaraskan parameter penampung data saat reset form
      const nomorSpk = route.params.nomor || route.query.spk_nomor;
      if (nomorSpk) {
        loadSpkFromBrowse(nomorSpk as string);
      }
    }
  }
};

onMounted(() => {
  // PERBAIKAN: Ambil dari params.nomor atau query.spk_nomor secara adaptif
  const nomorSpk = route.params.nomor || route.query.spk_nomor;

  if (nomorSpk) {
    loadSpkFromBrowse(nomorSpk as string);
  } else {
    toast.warning(
      "Silakan pilih SPK terlebih dahulu dari halaman utama Browse.",
    );
    initGridDefaults();
  }
  window.addEventListener("keydown", handleGlobalShortcuts);
});

onBeforeUnmount(() => {
  window.removeEventListener("keydown", handleGlobalShortcuts);
});
</script>
<template>
  <PageLayout title="Planning Produksi MMT" icon="mdi-calendar-clock">
    <template #header-actions>
      <v-btn
        size="x-small"
        color="primary"
        @click="saveForm"
        :loading="isSaving"
      >
        <v-icon start>mdi-content-save</v-icon> Simpan [F10]
      </v-btn>
      <v-btn size="x-small" color="warning" class="ml-1" @click="refreshData">
        <v-icon start>mdi-cancel</v-icon> Batal [F7]
      </v-btn>
      <v-btn size="x-small" color="error" class="ml-1" @click="router.back()">
        <v-icon start>mdi-logout</v-icon> Keluar [F8]
      </v-btn>
    </template>

    <div class="form-grid-container">
      <div class="left-column">
        <v-card flat border>
          <v-card-title
            class="text-caption font-weight-bold py-2 bg-grey-lighten-4"
          >
            REFERENSI SPK
          </v-card-title>
          <v-divider />
          <v-card-text class="pa-3">
            <v-row dense>
              <v-col cols="12">
                <v-text-field
                  label="Nomor SPK (F1)"
                  v-model="formData.nomorSpk"
                  readonly
                  append-inner-icon="mdi-magnify"
                  @click="isSpkModalVisible = true"
                  density="compact"
                  variant="outlined"
                  color="primary"
                  hide-details
                />
              </v-col>
              <v-col cols="12">
                <v-text-field
                  label="Nama Pelanggan"
                  v-model="formData.namaSpk"
                  readonly
                  bg-color="grey-lighten-4"
                  density="compact"
                  variant="outlined"
                  hide-details
                />
              </v-col>
              <v-col cols="6">
                <v-text-field
                  label="Tanggal SPK"
                  v-model="formData.tanggalSpk"
                  type="date"
                  readonly
                  bg-color="grey-lighten-4"
                  density="compact"
                  variant="outlined"
                  hide-details
                />
              </v-col>
              <v-col cols="6">
                <v-text-field
                  label="Dateline"
                  v-model="formData.dateline"
                  type="date"
                  readonly
                  bg-color="grey-lighten-4"
                  density="compact"
                  variant="outlined"
                  hide-details
                />
              </v-col>
              <v-col cols="4">
                <v-text-field
                  label="Jumlah"
                  v-model="formData.jumlahSpk"
                  readonly
                  bg-color="grey-lighten-4"
                  density="compact"
                  variant="outlined"
                  hide-details
                />
              </v-col>
              <v-col cols="4">
                <v-text-field
                  label="Panjang"
                  v-model="formData.panjang"
                  readonly
                  bg-color="grey-lighten-4"
                  density="compact"
                  variant="outlined"
                  hide-details
                />
              </v-col>
              <v-col cols="4">
                <v-text-field
                  label="Lebar"
                  v-model="formData.lebar"
                  readonly
                  bg-color="grey-lighten-4"
                  density="compact"
                  variant="outlined"
                  hide-details
                />
              </v-col>
              <v-col cols="6">
                <v-text-field
                  label="Cabang"
                  v-model="formData.cabang"
                  readonly
                  bg-color="grey-lighten-4"
                  density="compact"
                  variant="outlined"
                  hide-details
                />
              </v-col>
              <v-col cols="6">
                <v-text-field
                  label="Workshop"
                  v-model="formData.workshop"
                  readonly
                  bg-color="grey-lighten-4"
                  density="compact"
                  variant="outlined"
                  hide-details
                />
              </v-col>
              <v-col cols="6">
                <v-text-field
                  label="Tipe"
                  v-model="formData.tipe"
                  readonly
                  bg-color="grey-lighten-4"
                  density="compact"
                  variant="outlined"
                  hide-details
                />
              </v-col>
              <v-col cols="6">
                <v-text-field
                  label="Kain"
                  v-model="formData.kain"
                  readonly
                  bg-color="grey-lighten-4"
                  density="compact"
                  variant="outlined"
                  hide-details
                />
              </v-col>
              <v-col cols="12">
                <v-text-field
                  label="Finishing"
                  v-model="formData.finishing"
                  readonly
                  bg-color="grey-lighten-4"
                  density="compact"
                  variant="outlined"
                  hide-details
                />
              </v-col>
              <v-col cols="12" class="d-flex justify-space-between py-0 mt-2">
                <v-checkbox
                  v-model="formData.sablon"
                  label="Sablon"
                  density="compact"
                  disabled
                  hide-details
                />
                <v-checkbox
                  v-model="formData.sublim"
                  label="Sublim"
                  density="compact"
                  disabled
                  hide-details
                />
                <v-checkbox
                  v-model="formData.bordir"
                  label="Bordir"
                  density="compact"
                  disabled
                  hide-details
                />
              </v-col>
            </v-row>
          </v-card-text>
        </v-card>
      </div>

      <div class="right-column">
        <v-card flat border class="d-flex flex-column fill-height-window">
          <v-data-table
            :headers="headerPlanning"
            :items="formData.detailPlanning"
            :items-per-page="-1"
            density="compact"
            hide-default-footer
            class="elevation-0"
          >
            <template #[`item.index`]="{ index }">
              {{ index + 1 }}
            </template>

            <template #[`item.tanggal`]="{ item, index }">
              <v-text-field
                v-model="item.tanggal"
                type="date"
                density="compact"
                variant="plain"
                hide-details
                @change="validateDuplicateRow(index)"
              />
            </template>

            <template #[`item.mesin`]="{ item, index }">
              <v-text-field
                v-model="item.mesin"
                density="compact"
                variant="plain"
                hide-details
                append-inner-icon="mdi-magnify"
                placeholder="Pilih Mesin"
                readonly
                @click="openMesinLookup(index)"
              />
            </template>

            <template #[`item.cetak`]="{ item }">
              <v-text-field
                v-model.number="item.cetak"
                type="number"
                density="compact"
                variant="plain"
                hide-details
                class="text-right-input"
              />
            </template>

            <template #[`item.finishing`]="{ item }">
              <v-text-field
                v-model.number="item.finishing"
                type="number"
                density="compact"
                variant="plain"
                hide-details
                class="text-right-input"
              />
            </template>

            <template #[`item.kirim`]="{ item }">
              <v-text-field
                v-model.number="item.kirim"
                type="number"
                density="compact"
                variant="plain"
                hide-details
                class="text-right-input"
              />
            </template>

            <template #[`item.ketcetak`]="{ item }">
              <v-text-field
                v-model="item.ketcetak"
                density="compact"
                variant="plain"
                hide-details
              />
            </template>
            <template #[`item.ketfinishing`]="{ item }">
              <v-text-field
                v-model="item.ketfinishing"
                density="compact"
                variant="plain"
                hide-details
              />
            </template>
            <template #[`item.ketkirim`]="{ item }">
              <v-text-field
                v-model="item.ketkirim"
                density="compact"
                variant="plain"
                hide-details
              />
            </template>

            <template #[`item.actions`]="{ index }">
              <v-btn
                icon="mdi-delete"
                size="x-small"
                color="error"
                variant="text"
                @click="removeRowPlanning(index)"
              />
            </template>

            <template #bottom>
              <div class="pa-2 border-t d-flex align-center bg-grey-lighten-5">
                <v-btn
                  size="x-small"
                  color="primary"
                  variant="tonal"
                  prepend-icon="mdi-plus"
                  @click="addRowPlanning"
                >
                  Tambah Baris (Append)
                </v-btn>
                <v-spacer />
                <div
                  class="d-flex text-caption font-weight-bold text-blue-darken-3 gap-4"
                >
                  <span class="mr-3"
                    >Tot Cetak: {{ totalCetak.toLocaleString() }}</span
                  >
                  <span class="mr-3"
                    >Tot Finishing: {{ totalFinishing.toLocaleString() }}</span
                  >
                  <span>Tot Kirim: {{ totalKirim.toLocaleString() }}</span>
                </div>
              </div>
            </template>
          </v-data-table>
        </v-card>
      </div>
    </div>

    <SPKLookupModal
      :isVisible="isSpkModalVisible"
      @close="isSpkModalVisible = false"
      @select="handleSpkSelect"
    />
    <MesinLookupModal
      :isVisible="isMesinModalVisible"
      @close="isMesinModalVisible = false"
      @select="handleMesinSelect"
    />
  </PageLayout>
</template>

<style scoped>
.form-grid-container {
  display: grid;
  grid-template-columns: 320px 1fr;
  gap: 12px;
  padding: 8px;
}
.right-column :deep(*) {
  font-size: 11px !important;
}
.text-right-input :deep(input) {
  text-align: right !important;
}
:deep(.v-data-table__td) {
  height: 36px !important;
  padding: 0 4px !important;
}
.fill-height-window {
  min-height: 450px;
}
</style>
