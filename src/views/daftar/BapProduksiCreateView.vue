<script setup lang="ts">
import { ref, onMounted, computed } from "vue";
import api from "@/services/api";
import { useToast } from "vue-toastification";
import { useForm } from "@/composables/useForm";
import { useRouter } from "vue-router";
import type { VForm } from "vuetify/components";
import BaseForm from "@/components/BaseForm.vue";
import SpkProduksiSearchModal from "@/components/lookups/SpkProduksiSearchModal.vue";
import BagianProduksiSearchModal from "@/components/lookups/BagianProduksiSearchModal.vue";
import { IconAlertCircle } from "@tabler/icons-vue";

interface BapData {
  Nomor: string;
  Tanggal: string;
  Cab: string;
  Tipe: string;
  BagKode: string;
  BagNama: string;
  Masalah: string;
  SumberMasalah: string;
  Solusi: string;
  Pertanggungjawaban: string;
  SPK: string;
  SpkNama: string;
  Jumlah: number;
  Harga: number;
  Approve: string | boolean;
  StatusEdit: string;
  UrutPin5: number;
}

interface SaveResponse {
  data: {
    nomor: string;
  };
}

const toast = useToast();
const router = useRouter();
const vFormRef = ref<VForm | null>(null);

const cabangOptions = ref<string[]>([]);
const hasAccKorAccess = ref(true);
const showSpkModal = ref(false);
const showBagianModal = ref(false);
const statusPengajuan = ref("");

const initialBapData = {
  Nomor: "",
  Tanggal: new Date().toISOString().substr(0, 10),
  Cab: "HO-",
  Tipe: "BERITA ACARA",
  BagKode: "",
  BagNama: "",
  Masalah: "",
  SumberMasalah: "",
  Solusi: "",
  Pertanggungjawaban: "",
  SPK: "",
  SpkNama: "",
  Jumlah: 0,
  Harga: 0,
  Approve: false,
  StatusEdit: "",
  UrutPin5: 0,
};

const {
  isEditMode,
  isLoading,
  isSaving,
  formData,
  fetchData,
  executeSave,
  params,
  showSaveDialog,
  showCancelDialog,
  showCloseDialog,
  executeCancel,
  executeClose,
} = useForm({
  menuId: "142",
  initialData: initialBapData,
  fetchApi: async (): Promise<BapData> => {
    const res = await api.get<{ data: BapData }>(
      `/master/bap-produksi-form/${params.nomor}`,
    );

    const ed = res.data.data;

    statusPengajuan.value = ed.StatusEdit;

    return {
      ...ed,
      Approve: !!ed.Approve,
    };
  },
  submitApi: async (dataToSave) => {
    await api.post("/master/bap-produksi-form/save", {
      isNewMode: !isEditMode.value,
      data: dataToSave,
    });
    toast.success("BAP berhasil disimpan.");
  },
  onSuccess: (response) => {
    const res = response as SaveResponse;
    const nomorTerupdate = res.data.nomor || formData.value.Nomor;
    if (confirm("Data berhasil disimpan. Ingin Cetak?")) {
      const url = router.resolve({
        name: "BapProduksiPrint",
        params: { nomor: nomorTerupdate },
      }).href;
      window.open(url, "_blank");
    }
  },
  onSuccessRoute: "/daftar/berita-acara",
});

const loadLookup = async () => {
  try {
    const res = await api.get("/lookups/cabang-pabrik");
    cabangOptions.value = res.data.data.map((c: any) => c.Kode);
    if (
      cabangOptions.value.length > 0 &&
      !isEditMode.value &&
      !formData.value.Cab
    ) {
      formData.value.Cab = cabangOptions.value[0];
    }
  } catch (e) {
    console.error("Gagal load cabang");
  }
};

onMounted(async () => {
  await loadLookup();
  if (isEditMode.value) await fetchData();
});

const totalHarga = computed(
  () =>
    (Number(formData.value.Jumlah) || 0) * (Number(formData.value.Harga) || 0),
);

const formatCurrency = (val: number) =>
  new Intl.NumberFormat("id-ID").format(val);

const openBagianModal = () => {
  if (!formData.value.Cab) {
    toast.warning("Pilih cabang terlebih dahulu!");
    return;
  }
  showBagianModal.value = true;
};

const handleBagianSelected = (item: any) => {
  formData.value.BagKode = item.Kode;
  formData.value.BagNama = item.Nama;
};

const handleSpkSelected = async (item: any) => {
  try {
    // BUG FIX UTAMA: Gunakan item.Nomor, bukan item.Kode!
    const spkNo = item.Nomor;

    if (!spkNo) {
      toast.error("Nomor SPK tidak valid.");
      return;
    }

    const res = await api.get(`/master/bap-produksi-form/spk/${spkNo}`);
    const data = res.data.data;

    formData.value.SPK = data.Nomor;
    formData.value.SpkNama = data.Nama;
    formData.value.Jumlah = Number(data.Jumlah) || 0;
    formData.value.Harga = Number(data.Harga) || 0;
  } catch (e) {
    toast.error("Gagal mengambil detail perhitungan SPK.");
  }
};

const isFormDisabled = computed(
  () =>
    isEditMode.value &&
    ["WAIT", "TOLAK", "MINTA"].includes(statusPengajuan.value),
);

const handlePreSave = async () => {
  const { valid } = await vFormRef.value!.validate();
  if (!valid) return;
  if (isFormDisabled.value) {
    toast.warning("Belum bisa menyimpan. Status: " + statusPengajuan.value);
    return;
  }
  executeSave();
};
</script>

<template>
  <BaseForm
    title="Berita Acara dan Komplain Produksi"
    menu-id="142"
    :icon="IconAlertCircle"
    :is-loading="isLoading"
    :is-saving="isSaving"
    item-name="BAP Produksi"
    v-model:show-save-dialog="showSaveDialog"
    v-model:show-cancel-dialog="showCancelDialog"
    v-model:show-close-dialog="showCloseDialog"
    @validate-save="handlePreSave"
    @confirm-save="executeSave"
    @confirm-cancel="executeCancel"
    @confirm-close="executeClose"
  >
    <template #right-column>
      <!-- Status alert -->
      <div v-if="isEditMode && statusPengajuan" class="bap-alert-wrap">
        <div v-if="statusPengajuan === 'WAIT'" class="bap-alert info">
          ℹ Menunggu ACC Perubahan Data dari Pusat.
        </div>
        <div v-if="statusPengajuan === 'ACC'" class="bap-alert success">
          ✔ Pengajuan ACC. Silakan lakukan perubahan dan simpan.
        </div>
        <div v-if="statusPengajuan === 'TOLAK'" class="bap-alert error">
          ✖ Pengajuan Perubahan Ditolak.
        </div>
        <div v-if="statusPengajuan === 'MINTA'" class="bap-alert warning">
          ⚠ Transaksi sudah ditutup. Ajukan perubahan data.
        </div>
      </div>

      <v-form ref="vFormRef" :disabled="isFormDisabled">
        <div class="bap-section">
          <!-- ── Header: Nomor, Tanggal, Cabang, Tipe, Approve ── -->
          <div class="bap-header-grid">
            <!-- Kiri: field-field header -->
            <div class="bap-fields">
              <!-- Nomor -->
              <div class="f-row">
                <label class="f-lbl">Nomor</label>
                <v-text-field
                  v-model="formData.Nomor"
                  variant="outlined"
                  density="compact"
                  readonly
                  bg-color="blue-lighten-5"
                  hide-details
                  class="f-inp"
                  style="max-width: 200px"
                >
                  <template #append-inner>
                    <span v-if="!isEditMode" class="nomor-hint"
                      >&larr; Kosong=Baru</span
                    >
                  </template>
                </v-text-field>
              </div>

              <!-- Tanggal -->
              <div class="f-row">
                <label class="f-lbl">Tanggal</label>
                <input
                  type="date"
                  v-model="formData.Tanggal"
                  class="bap-date-input"
                />
              </div>

              <!-- Cabang -->
              <div class="f-row">
                <label class="f-lbl">Cabang</label>
                <v-select
                  v-model="formData.Cab"
                  :items="cabangOptions"
                  variant="outlined"
                  density="compact"
                  hide-details
                  class="f-inp"
                  style="max-width: 160px"
                />
              </div>

              <!-- Tipe -->
              <div class="f-row">
                <label class="f-lbl">Tipe</label>
                <div class="d-flex align-center gap-4">
                  <label class="radio-label">
                    <input
                      type="radio"
                      v-model="formData.Tipe"
                      value="BERITA ACARA"
                    />
                    Berita Acara
                  </label>
                  <label class="radio-label">
                    <input
                      type="radio"
                      v-model="formData.Tipe"
                      value="KOMPLAIN PRODUKSI"
                    />
                    Komplain Produksi
                  </label>
                </div>
              </div>

              <!-- Kode Bagian -->
              <div class="f-row">
                <label class="f-lbl">Kode Bagian</label>
                <v-text-field
                  v-model="formData.BagKode"
                  variant="outlined"
                  density="compact"
                  readonly
                  bg-color="blue-lighten-5"
                  hide-details
                  class="f-inp cursor-pointer"
                  style="max-width: 130px"
                  :rules="[(v) => !!v || '']"
                  @click="openBagianModal"
                />
                <label class="f-lbl" style="margin-left: 8px; text-align: left"
                  >Bagian</label
                >
                <v-text-field
                  v-model="formData.BagNama"
                  variant="outlined"
                  density="compact"
                  readonly
                  bg-color="grey-lighten-4"
                  hide-details
                  class="f-inp"
                  style="max-width: 260px"
                  :rules="[(v) => !!v || 'Bagian wajib diisi']"
                />
              </div>
            </div>

            <!-- Kanan: Approve -->
            <div class="bap-approve-box">
              <label
                class="approve-label"
                :class="{ active: formData.Approve }"
              >
                <input
                  type="checkbox"
                  v-model="formData.Approve"
                  :disabled="!hasAccKorAccess"
                />
                <span>APPROVE</span>
              </label>
            </div>
          </div>

          <div class="bap-divider" />

          <!-- ── Body: 4 textarea dalam 2 kolom ── -->
          <div class="bap-textarea-grid">
            <div class="bap-textarea-col">
              <div class="bap-ta-item">
                <label class="bap-ta-label"
                  >Permasalahan <span class="req">*</span></label
                >
                <v-textarea
                  v-model="formData.Masalah"
                  variant="outlined"
                  density="compact"
                  rows="5"
                  hide-details="auto"
                  bg-color="white"
                  class="bap-ta"
                  :rules="[(v) => !!v || 'Wajib diisi']"
                />
              </div>
              <div class="bap-ta-item">
                <label class="bap-ta-label">Sumber Masalah</label>
                <v-textarea
                  v-model="formData.SumberMasalah"
                  variant="outlined"
                  density="compact"
                  rows="5"
                  hide-details
                  bg-color="white"
                  class="bap-ta"
                />
              </div>
            </div>
            <div class="bap-textarea-col">
              <div class="bap-ta-item">
                <label class="bap-ta-label">Solusi</label>
                <v-textarea
                  v-model="formData.Solusi"
                  variant="outlined"
                  density="compact"
                  rows="5"
                  hide-details
                  bg-color="white"
                  class="bap-ta"
                />
              </div>
              <div class="bap-ta-item">
                <label class="bap-ta-label">Pertanggungjawaban</label>
                <v-textarea
                  v-model="formData.Pertanggungjawaban"
                  variant="outlined"
                  density="compact"
                  rows="5"
                  hide-details
                  bg-color="white"
                  class="bap-ta"
                />
              </div>
            </div>
          </div>

          <div class="bap-divider" />

          <!-- ── Footer: SPK + Jumlah + Harga + Total ── -->
          <div class="bap-footer-grid">
            <!-- SPK -->
            <div class="f-row">
              <label class="f-lbl">SPK</label>
              <v-text-field
                v-model="formData.SPK"
                variant="outlined"
                density="compact"
                readonly
                bg-color="blue-lighten-5"
                hide-details
                class="f-inp cursor-pointer"
                style="max-width: 150px"
                @click="showSpkModal = true"
              />
              <v-text-field
                v-model="formData.SpkNama"
                variant="outlined"
                density="compact"
                readonly
                bg-color="grey-lighten-4"
                hide-details
                class="f-inp"
                style="max-width: 300px"
              />
            </div>

            <!-- Jumlah + Harga + Total dalam satu baris -->
            <div class="f-row">
              <label class="f-lbl">Jumlah SPK</label>
              <v-text-field
                v-model.number="formData.Jumlah"
                type="number"
                variant="outlined"
                density="compact"
                hide-details
                bg-color="white"
                class="f-inp"
                style="max-width: 90px"
              />
              <label
                class="f-lbl"
                style="margin-left: 8px; text-align: left; width: 50px"
                >Harga</label
              >
              <v-text-field
                v-model.number="formData.Harga"
                type="number"
                variant="outlined"
                density="compact"
                bg-color="grey-lighten-4"
                hide-details
                class="f-inp"
                style="max-width: 130px"
              />
              <label
                class="f-lbl"
                style="margin-left: 8px; text-align: left; width: 40px"
                >Total</label
              >
              <v-text-field
                :model-value="formatCurrency(totalHarga)"
                variant="outlined"
                density="compact"
                readonly
                bg-color="grey-lighten-4"
                hide-details
                class="f-inp font-weight-bold"
                style="max-width: 140px"
              />
            </div>
          </div>
        </div>
      </v-form>
    </template>
  </BaseForm>

  <BagianProduksiSearchModal
    v-model="showBagianModal"
    :cabang="formData.Cab"
    @selected="handleBagianSelected"
  />
  <SpkProduksiSearchModal
    v-model="showSpkModal"
    @selected="handleSpkSelected"
  />
</template>

<style scoped>
/* ── Wrapper section ── */
.bap-section {
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  padding: 12px 14px;
  font-size: 12px;
  font-family: "Segoe UI", system-ui, sans-serif;
}

/* ── Alert status ── */
.bap-alert-wrap {
  margin-bottom: 8px;
}
.bap-alert {
  padding: 6px 12px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 600;
  margin-bottom: 4px;
}
.bap-alert.info {
  background: #e3f2fd;
  color: #1565c0;
  border: 1px solid #90caf9;
}
.bap-alert.success {
  background: #e8f5e9;
  color: #2e7d32;
  border: 1px solid #a5d6a7;
}
.bap-alert.error {
  background: #ffebee;
  color: #c62828;
  border: 1px solid #ef9a9a;
}
.bap-alert.warning {
  background: #fff8e1;
  color: #f57f17;
  border: 1px solid #ffe082;
}

/* ── Header grid: fields kiri + approve kanan ── */
.bap-header-grid {
  display: flex;
  align-items: flex-start;
  gap: 16px;
}
.bap-fields {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 5px;
}
.bap-approve-box {
  flex-shrink: 0;
  padding-top: 4px;
}
.approve-label {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 10px 16px;
  border: 2px solid #e0e0e0;
  border-radius: 6px;
  cursor: pointer;
  font-size: 11px;
  font-weight: 700;
  color: #757575;
  user-select: none;
  transition: all 0.15s;
}
.approve-label input[type="checkbox"] {
  width: 16px;
  height: 16px;
  accent-color: #2e7d32;
  cursor: pointer;
}
.approve-label.active {
  border-color: #2e7d32;
  background: #e8f5e9;
  color: #2e7d32;
}

/* ── Field row (label + input) ── */
.f-row {
  display: flex;
  align-items: center;
  gap: 6px;
}
.f-lbl {
  width: 88px;
  flex-shrink: 0;
  font-size: 11px;
  font-weight: 600;
  color: #555;
  text-align: right;
  white-space: nowrap;
}
.f-inp {
  min-width: 0;
}

/* Vuetify field compact */
.f-inp :deep(.v-field),
.bap-ta :deep(.v-field) {
  font-size: 12px;
}
.f-inp :deep(.v-field) {
  min-height: 30px;
  height: 30px;
}
.f-inp :deep(.v-field__input) {
  min-height: 30px;
  padding-top: 0;
  padding-bottom: 0;
  font-size: 12px;
}
.f-inp :deep(.v-input__control) {
  min-height: 30px;
}

/* Date input native */
.bap-date-input {
  height: 30px;
  border: 1px solid #bdbdbd;
  border-radius: 4px;
  padding: 0 8px;
  font-size: 12px;
  outline: none;
  background: white;
  color: #212121;
}
.bap-date-input:focus {
  border-color: #1976d2;
}

/* Radio */
.radio-label {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  cursor: pointer;
  white-space: nowrap;
}
.radio-label input[type="radio"] {
  accent-color: #1565c0;
  cursor: pointer;
}

.req {
  color: #e53935;
}
.cursor-pointer {
  cursor: pointer;
}

/* ── Divider ── */
.bap-divider {
  height: 1px;
  background: #eeeeee;
  margin: 10px 0;
}

/* ── Textarea 2 kolom ── */
.bap-textarea-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}
.bap-textarea-col {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.bap-ta-item {
  display: flex;
  flex-direction: column;
  gap: 3px;
}
.bap-ta-label {
  font-size: 11px;
  font-weight: 600;
  color: #555;
}
.bap-ta :deep(.v-field__input) {
  font-size: 12px;
  padding-top: 6px;
}

/* ── Footer SPK + angka ── */
.bap-footer-grid {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

/* ── Nomor hint ── */
.nomor-hint {
  font-size: 10px;
  color: #e53935;
  font-weight: 700;
  white-space: nowrap;
}
</style>
