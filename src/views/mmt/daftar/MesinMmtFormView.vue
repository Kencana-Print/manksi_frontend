<script setup>
import { ref, computed, onMounted } from "vue";
import { useRouter, useRoute } from "vue-router";
import { useToast } from "vue-toastification";
import api from "@/services/api";
import PageLayout from "@/components/PageLayout.vue";
// Anda bisa mengimpor modal bantuan jika ada, mirip dengan Tfrmbantuan di Delphi
// import MesinLookupModal from "@/modal/MesinLookupModal.vue";

const router = useRouter();
const route = useRoute();
const toast = useToast();

// Endpoint disesuaikan dengan konvensi API Anda
const API_URL = "/master/mesin-mmt";

const isEditMode = ref(false);
const isSaving = ref(false);
const isLoading = ref(false);

const formData = ref({
  kode: "",
  nama: "",
  jenis: "C", // Default index 0 di Delphi (msn_jenis 'C')
  keterangan: "",
});

// Options untuk cbJenis (Mapping dari logika Delphi)
const jenisOptions = [
  { label: "C - Cutting", value: "C" },
  { label: "D - Digital", value: "D" },
  { label: "R - Roland", value: "R" },
  { label: "S - Seaming", value: "S" },
  { label: "T - TOKO", value: "T" },
];

const formTitle = computed(() =>
  isEditMode.value ? "Ubah Data Mesin" : "Tambah Mesin Baru",
);

const isFormValid = computed(() => {
  return formData.value.kode.trim() !== "" && formData.value.nama.trim() !== "";
});

// Prosedur refreshdata di Delphi
function resetForm() {
  formData.value = {
    kode: "",
    nama: "",
    jenis: "C",
    keterangan: "",
  };
  isEditMode.value = false;
  // Di web, kita tidak perlu setFocus secara manual jika menggunakan auto-focus attribute
}

// Prosedur loaddata(akode) di Delphi
async function loadFormData(kode) {
  if (!kode) return;
  isLoading.value = true;
  try {
    const res = await api.get(`${API_URL}/${encodeURIComponent(kode)}`);
    const data = res.data?.data;

    if (data) {
      isEditMode.value = true;
      formData.value = {
        kode: data.msn_kode,
        nama: data.msn_nama,
        jenis: data.msn_jenis || "C",
        keterangan: data.msn_note || "",
      };
    } else {
      isEditMode.value = false;
    }
  } catch (error) {
    // Jika 404, asumsikan mode "Baru" sesuai logika Delphi
    isEditMode.value = false;
  } finally {
    isLoading.value = false;
  }
}

// Handler saat Kode kehilangan fokus (edtKodeExit)
async function handleKodeExit() {
  if (formData.value.kode && !isEditMode.value) {
    await loadFormData(formData.value.kode);
  }
}

// Prosedur simpandata di Delphi (F10)
async function saveForm() {
  if (!isFormValid.value) {
    toast.warning("Kode dan Nama tidak boleh kosong");
    return;
  }

  const confirmSave = confirm("Yakin ingin simpan?");
  if (!confirmSave) return;

  isSaving.value = true;
  try {
    const payload = {
      msn_kode: formData.value.kode,
      msn_nama: formData.value.nama,
      msn_jenis: formData.value.jenis,
      msn_note: formData.value.keterangan,
      is_edit: isEditMode.value, // Logika FLAGEDIT
    };

    await api.post(`${API_URL}/save`, payload);
    toast.success(`Tersimpan dengan kode: ${formData.value.kode}`);
    resetForm();
  } catch (error) {
    toast.error("Gagal Simpan");
  } finally {
    isSaving.value = false;
  }
}

// Prosedur hapusdata di Delphi (F5)
async function deleteData() {
  if (!isEditMode.value) return;

  const confirmDelete = confirm("Yakin ingin hapus?");
  if (!confirmDelete) return;

  try {
    await api.delete(`${API_URL}/${formData.value.kode}`);
    toast.success("Data berhasil dihapus");
    resetForm();
  } catch (error) {
    toast.error("Gagal hapus");
  }
}

function closeForm() {
  router.back();
}

onMounted(() => {
  // Jika ada parameter kode dari router
  const kodeParam = route.params.kode || route.query.kode;
  if (kodeParam) {
    loadFormData(kodeParam);
  }
});
</script>

<template>
  <PageLayout :title="formTitle" icon="mdi-engine">
    <template #header-actions>
      <v-btn
        size="x-small"
        color="primary"
        :loading="isSaving"
        :disabled="!isFormValid"
        @click="saveForm"
      >
        <v-icon start>mdi-content-save</v-icon> Simpan (F10)
      </v-btn>
      <v-btn
        v-if="isEditMode"
        size="x-small"
        color="error"
        class="ml-1"
        @click="deleteData"
      >
        <v-icon start>mdi-trash-can</v-icon> Hapus (F5)
      </v-btn>
      <v-btn size="x-small" color="warning" class="ml-1" @click="resetForm">
        <v-icon start>mdi-undo</v-icon> Batal (F7)
      </v-btn>
      <v-btn size="x-small" class="ml-1" @click="closeForm">
        <v-icon start>mdi-close</v-icon> Tutup (F8)
      </v-btn>
    </template>

    <div class="main-form-wrapper">
      <aside class="sidebar-header">
        <div class="section-title">Status Data</div>
        <div class="status-box" :class="isEditMode ? 'mode-edit' : 'mode-baru'">
          {{ isEditMode ? "UBAH DATA" : "DATA BARU" }}
        </div>

        <div class="info-text mt-4">
          <p v-if="!isEditMode">Masukkan kode baru untuk menambah data.</p>
          <p v-else>ID: {{ formData.kode }} (Read Only)</p>
        </div>

        <div class="total-qty-box mt-auto">
          <div class="total-label">MESIN MMT</div>
          <div class="total-value">{{ formData.jenis }}</div>
        </div>
      </aside>

      <main class="table-content-area pa-6">
        <v-row>
          <v-col cols="12" md="6">
            <div class="field-group">
              <label class="field-label">Kode Mesin</label>
              <v-text-field
                v-model="formData.kode"
                :readonly="isEditMode"
                density="compact"
                variant="outlined"
                placeholder="F1 untuk bantuan..."
                prepend-inner-icon="mdi-key-variant"
                @blur="handleKodeExit"
                hide-details
              />
            </div>
          </v-col>

          <v-col cols="12" md="6">
            <div class="field-group">
              <label class="field-label">Jenis Mesin</label>
              <v-select
                v-model="formData.jenis"
                :items="jenisOptions"
                item-title="label"
                item-value="value"
                density="compact"
                variant="outlined"
                hide-details
              />
            </div>
          </v-col>

          <v-col cols="12">
            <div class="field-group">
              <label class="field-label">Nama Mesin</label>
              <v-text-field
                v-model="formData.nama"
                density="compact"
                variant="outlined"
                hide-details
              />
            </div>
          </v-col>

          <v-col cols="12">
            <div class="field-group">
              <label class="field-label">Keterangan</label>
              <v-textarea
                v-model="formData.keterangan"
                density="compact"
                variant="outlined"
                rows="3"
                hide-details
              />
            </div>
          </v-col>
        </v-row>
      </main>
    </div>
  </PageLayout>
</template>

<style scoped>
/* Menggunakan style dasar yang Anda berikan dengan sedikit modifikasi */
.main-form-wrapper {
  display: flex;
  gap: 16px;
  padding: 16px;
  background-color: #f5f5f5;
  height: calc(100vh - 100px);
}

.sidebar-header {
  width: 280px;
  background: #ffffff;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 16px;
  display: flex;
  flex-direction: column;
}

.status-box {
  padding: 10px;
  text-align: center;
  font-weight: bold;
  border-radius: 4px;
  font-size: 14px;
}

.mode-baru {
  background-color: #e8f5e9;
  color: #2e7d32;
}
.mode-edit {
  background-color: #fff3e0;
  color: #ef6c00;
}

.table-content-area {
  flex: 1;
  background: #ffffff;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  overflow-y: auto;
}

.field-group {
  margin-bottom: 20px;
}

.field-label {
  display: block;
  font-size: 12px;
  font-weight: 700;
  color: #444;
  margin-bottom: 8px;
  text-transform: uppercase;
}

.total-qty-box {
  background-color: #eceff1;
  border: 1px solid #cfd8dc;
  border-radius: 6px;
  padding: 14px;
  text-align: center;
}

.total-label {
  font-size: 11px;
  font-weight: 700;
  color: #546e7a;
}
.total-value {
  font-size: 24px;
  font-weight: 800;
  color: #263238;
}
</style>
