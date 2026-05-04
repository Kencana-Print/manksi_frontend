<script setup lang="ts">
import { ref, watch, computed } from "vue";
import type { VForm } from "vuetify/components";
import api from "@/services/api";
import { useToast } from "vue-toastification";

const props = defineProps<{
  modelValue: boolean;
  isNewMode: boolean;
  editData?: any;
}>();

const emit = defineEmits(["update:modelValue", "saved"]);
const toast = useToast();
const formRef = ref<VForm | null>(null);
const isSaving = ref(false);

const fileInput = ref<File | null>(null);
const fileInputRef = ref<HTMLInputElement | null>(null);
const imagePreview = ref<string | null>(null);

const dialogVisible = computed({
  get: () => props.modelValue,
  set: (val) => emit("update:modelValue", val),
});

const emptyForm = () => ({
  Kode: "",
  Divisi: 4,
  Nama: "",
  Ukuran: "",
  Kain: "",
  Finishing: "",
  StokAkhir: 0,
  HargaHPP: 0,
  HargaJual: 0,
});

const formData = ref(emptyForm());

const getImageUrl = (kode: string) => {
  const baseUrl = api.defaults.baseURL?.replace("/api", "") || "";
  return `${baseUrl}/images/barang/${kode}.jpg?t=${Date.now()}`;
};

watch(
  () => props.modelValue,
  (isOpen) => {
    if (!isOpen) return;
    fileInput.value = null;
    if (props.isNewMode) {
      formData.value = emptyForm();
      imagePreview.value = null;
    } else {
      const ed = props.editData;
      formData.value = {
        Kode: ed.Kode,
        Divisi: Number(ed.Divisi) === 1 ? 1 : 4,
        Nama: ed.Nama,
        Ukuran: ed.Ukuran || "",
        Kain: ed.Kain || "",
        Finishing: ed.Finishing || "",
        StokAkhir: Number(ed.StokAkhir) || 0,
        HargaHPP: Number(ed.HargaHPP) || 0,
        HargaJual: Number(ed.HargaJual) || 0,
      };
      imagePreview.value = ed.HasImage ? getImageUrl(ed.Kode) : null;
    }
    formRef.value?.resetValidation();
  },
);

const openFileDialog = () => fileInputRef.value?.click();

const handleFileChange = (event: Event) => {
  const target = event.target as HTMLInputElement;
  if (target.files && target.files.length > 0) {
    const file = target.files[0];
    if (!file.type.startsWith("image/")) {
      toast.warning("Harap pilih file gambar (JPG/PNG).");
      return;
    }
    fileInput.value = file;
    imagePreview.value = URL.createObjectURL(file);
  }
};

const handleSave = async () => {
  const { valid } = await formRef.value!.validate();
  if (!valid) return;
  isSaving.value = true;
  try {
    let savedKode = formData.value.Kode;
    if (props.isNewMode) {
      const res = await api.post("/master/barang", formData.value);
      toast.success("Berhasil menyimpan Master Barang");
      savedKode = res.data.kode;
    } else {
      await api.put(`/master/barang/${formData.value.Kode}`, formData.value);
      toast.success("Berhasil memperbarui Master Barang");
    }
    if (fileInput.value) {
      const uploadData = new FormData();
      uploadData.append("image", fileInput.value);
      await api.post(`/master/barang/${savedKode}/image`, uploadData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      toast.success("Gambar desain berhasil diunggah.");
    }
    dialogVisible.value = false;
    emit("saved");
  } catch (error: any) {
    toast.error(error.response?.data?.message || "Gagal menyimpan data.");
  } finally {
    isSaving.value = false;
  }
};
</script>

<template>
  <v-dialog v-model="dialogVisible" persistent max-width="820px" scrollable>
    <v-card class="brg-dialog-card">
      <!-- Header -->
      <div class="brg-header">
        <v-icon size="14" color="white" class="mr-2"
          >mdi-tshirt-crew-outline</v-icon
        >
        <span>{{ isNewMode ? "TAMBAH" : "UBAH" }} MASTER BARANG</span>
        <v-spacer />
        <button class="brg-close-btn" @click="dialogVisible = false">✕</button>
      </div>

      <!-- Body -->
      <v-card-text class="brg-body">
        <v-form ref="formRef" @submit.prevent="handleSave">
          <div class="brg-layout">
            <!-- Kolom kiri: form fields -->
            <div class="brg-left">
              <div class="brg-section">
                <!-- Divisi -->
                <div class="brg-row">
                  <label class="brg-label">Divisi</label>
                  <div class="d-flex align-center gap-3 pt-1">
                    <label
                      class="radio-label"
                      :class="{ disabled: !isNewMode }"
                    >
                      <input
                        type="radio"
                        v-model="formData.Divisi"
                        :value="1"
                        :disabled="!isNewMode"
                      />
                      Spanduk
                    </label>
                    <label
                      class="radio-label"
                      :class="{ disabled: !isNewMode }"
                    >
                      <input
                        type="radio"
                        v-model="formData.Divisi"
                        :value="4"
                        :disabled="!isNewMode"
                      />
                      Garmen
                    </label>
                  </div>
                </div>

                <div class="brg-divider" />

                <!-- Kode -->
                <div class="brg-field-row">
                  <label class="brg-field-label"
                    >Kode <span class="req">*</span></label
                  >
                  <div class="brg-field-input">
                    <v-text-field
                      v-model="formData.Kode"
                      variant="outlined"
                      density="compact"
                      :readonly="!isNewMode"
                      :bg-color="
                        !isNewMode ? 'grey-lighten-4' : 'blue-lighten-5'
                      "
                      :rules="[(v) => !!v || 'Kode wajib diisi']"
                      placeholder="F1=Help"
                      hide-details="auto"
                      class="brg-input"
                      style="max-width: 180px"
                    />
                  </div>
                </div>

                <!-- Nama -->
                <div class="brg-field-row">
                  <label class="brg-field-label"
                    >Nama <span class="req">*</span></label
                  >
                  <div class="brg-field-input">
                    <v-text-field
                      v-model="formData.Nama"
                      variant="outlined"
                      density="compact"
                      :rules="[(v) => !!v || 'Nama wajib diisi']"
                      hide-details="auto"
                      autofocus
                      class="brg-input"
                    />
                  </div>
                </div>

                <!-- Ukuran -->
                <div class="brg-field-row">
                  <label class="brg-field-label">Ukuran</label>
                  <div class="brg-field-input">
                    <v-text-field
                      v-model="formData.Ukuran"
                      variant="outlined"
                      density="compact"
                      hide-details
                      class="brg-input"
                    />
                  </div>
                </div>

                <!-- Kain -->
                <div class="brg-field-row">
                  <label class="brg-field-label">Kain</label>
                  <div class="brg-field-input">
                    <v-text-field
                      v-model="formData.Kain"
                      variant="outlined"
                      density="compact"
                      hide-details
                      class="brg-input"
                    />
                  </div>
                </div>

                <!-- Finishing -->
                <div class="brg-field-row">
                  <label class="brg-field-label">Finishing</label>
                  <div class="brg-field-input">
                    <v-text-field
                      v-model="formData.Finishing"
                      variant="outlined"
                      density="compact"
                      hide-details
                      class="brg-input"
                    />
                  </div>
                </div>

                <div class="brg-divider" />

                <!-- Stok Akhir -->
                <div class="brg-field-row">
                  <label class="brg-field-label">Stok Akhir</label>
                  <div class="brg-field-input">
                    <v-text-field
                      v-model.number="formData.StokAkhir"
                      type="number"
                      variant="outlined"
                      density="compact"
                      readonly
                      bg-color="grey-lighten-4"
                      hide-details
                      class="brg-input"
                      style="max-width: 120px"
                    />
                  </div>
                </div>

                <!-- Harga HPP -->
                <div class="brg-field-row">
                  <label class="brg-field-label">Harga HPP</label>
                  <div class="brg-field-input">
                    <v-text-field
                      v-model.number="formData.HargaHPP"
                      type="number"
                      variant="outlined"
                      density="compact"
                      readonly
                      bg-color="grey-lighten-4"
                      hide-details
                      class="brg-input"
                      style="max-width: 160px"
                    />
                  </div>
                </div>

                <!-- Harga Jual -->
                <div class="brg-field-row">
                  <label class="brg-field-label">Harga Jual</label>
                  <div class="brg-field-input">
                    <v-text-field
                      v-model.number="formData.HargaJual"
                      type="number"
                      variant="outlined"
                      density="compact"
                      hide-details
                      class="brg-input"
                      style="max-width: 160px"
                    />
                  </div>
                </div>
              </div>
            </div>

            <!-- Kolom kanan: gambar -->
            <div class="brg-right">
              <div class="brg-section brg-img-section">
                <div class="brg-img-title">Design Barang</div>

                <!-- Preview area -->
                <div class="brg-img-preview">
                  <img
                    v-if="imagePreview"
                    :src="imagePreview"
                    class="brg-img"
                  />
                  <div v-else class="brg-img-empty">
                    <v-icon size="36" color="#bdbdbd">mdi-image-outline</v-icon>
                    <span>Tidak ada design</span>
                  </div>
                </div>

                <!-- Upload control -->
                <input
                  type="file"
                  ref="fileInputRef"
                  accept="image/*"
                  style="display: none"
                  @change="handleFileChange"
                />
                <div class="brg-upload-row">
                  <div class="brg-upload-name">
                    {{
                      fileInput
                        ? fileInput.name
                        : imagePreview
                          ? formData.Kode + ".jpg"
                          : "Belum ada file..."
                    }}
                  </div>
                  <button
                    type="button"
                    class="brg-upload-btn"
                    @click="openFileDialog"
                  >
                    📁 Upload
                  </button>
                </div>

                <!-- Info kode file -->
                <div v-if="formData.Kode" class="brg-img-hint">
                  Nama file: <strong>{{ formData.Kode }}.jpg</strong>
                </div>
              </div>
            </div>
          </div>
        </v-form>
      </v-card-text>

      <!-- Footer -->
      <div class="brg-footer">
        <div class="brg-shortcut-hint">
          F1: Help &nbsp;|&nbsp; F5: Delete &nbsp;|&nbsp; F7: Batal
          &nbsp;|&nbsp; F8: Keluar
        </div>
        <div class="brg-footer-actions">
          <button
            type="button"
            class="brg-btn-cancel"
            @click="dialogVisible = false"
            :disabled="isSaving"
          >
            Batal
          </button>
          <button
            type="button"
            class="brg-btn-save"
            @click="handleSave"
            :disabled="isSaving"
          >
            <span v-if="isSaving">Menyimpan...</span>
            <span v-else>💾 Simpan (F10)</span>
          </button>
        </div>
      </div>
    </v-card>
  </v-dialog>
</template>

<style scoped>
/* ── Dialog ── */
.brg-dialog-card {
  font-size: 12px;
  font-family: "Segoe UI", system-ui, sans-serif;
  display: flex;
  flex-direction: column;
  max-height: 92vh;
}

/* ── Header ── */
.brg-header {
  display: flex;
  align-items: center;
  background: #1565c0;
  color: white;
  padding: 8px 14px;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.04em;
  flex-shrink: 0;
}
.brg-close-btn {
  background: transparent;
  border: none;
  color: rgba(255, 255, 255, 0.8);
  font-size: 14px;
  cursor: pointer;
  padding: 0 2px;
}
.brg-close-btn:hover {
  color: white;
}

/* ── Body ── */
.brg-body {
  padding: 10px 12px !important;
  overflow-y: auto;
  flex: 1;
  background: #f4f5f7;
}

/* ── Two-column layout ── */
.brg-layout {
  display: flex;
  gap: 10px;
  align-items: flex-start;
}
.brg-left {
  flex: 1 1 0;
  min-width: 0;
}
.brg-right {
  width: 260px;
  flex-shrink: 0;
}

/* ── Section card ── */
.brg-section {
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  padding: 10px 12px;
}

/* ── Field row: label kiri + input kanan ── */
.brg-field-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 5px;
}
.brg-field-row:last-child {
  margin-bottom: 0;
}

.brg-field-label {
  width: 80px;
  flex-shrink: 0;
  font-size: 11px;
  font-weight: 600;
  color: #555;
  text-align: right;
}

.brg-field-input {
  flex: 1;
  min-width: 0;
}

/* Divisi row (radio) */
.brg-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}
.brg-label {
  width: 80px;
  flex-shrink: 0;
  font-size: 11px;
  font-weight: 600;
  color: #555;
  text-align: right;
}

.brg-divider {
  height: 1px;
  background: #eeeeee;
  margin: 6px 0;
}

.req {
  color: #e53935;
}

/* ── Vuetify input height override ── */
.brg-input :deep(.v-field) {
  font-size: 12px;
  min-height: 30px;
  height: 30px;
}
.brg-input :deep(.v-field__input) {
  min-height: 30px;
  padding-top: 0;
  padding-bottom: 0;
  font-size: 12px;
}
.brg-input :deep(.v-input__control) {
  min-height: 30px;
}

/* ── Radio ── */
.radio-label {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  cursor: pointer;
}
.radio-label input[type="radio"] {
  accent-color: #1565c0;
  cursor: pointer;
}
.radio-label.disabled {
  opacity: 0.5;
  cursor: default;
}

/* ── Gambar section ── */
.brg-img-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 10px;
}
.brg-img-title {
  font-size: 11px;
  font-weight: 700;
  color: #424242;
}

.brg-img-preview {
  width: 100%;
  aspect-ratio: 1;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  background: #fafafa;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}
.brg-img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}
.brg-img-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  color: #9e9e9e;
  font-size: 11px;
}

.brg-upload-row {
  display: flex;
  align-items: center;
  gap: 6px;
}
.brg-upload-name {
  flex: 1;
  font-size: 11px;
  color: #757575;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  background: #f5f5f5;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  padding: 4px 8px;
  min-width: 0;
}
.brg-upload-btn {
  background: #546e7a;
  color: white;
  border: none;
  border-radius: 4px;
  padding: 4px 10px;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
  flex-shrink: 0;
}
.brg-upload-btn:hover {
  background: #455a64;
}

.brg-img-hint {
  font-size: 10px;
  color: #9e9e9e;
  text-align: center;
}

/* ── Footer ── */
.brg-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 7px 12px;
  border-top: 1px solid #e0e0e0;
  background: #fafafa;
  flex-shrink: 0;
}
.brg-shortcut-hint {
  font-size: 10px;
  color: #9e9e9e;
}
.brg-footer-actions {
  display: flex;
  gap: 8px;
}
.brg-btn-cancel {
  background: transparent;
  border: 1px solid #d0d0d0;
  border-radius: 4px;
  padding: 5px 14px;
  font-size: 12px;
  cursor: pointer;
  color: #555;
}
.brg-btn-cancel:hover {
  background: #f5f5f5;
}
.brg-btn-save {
  background: #1565c0;
  color: white;
  border: none;
  border-radius: 4px;
  padding: 5px 18px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
}
.brg-btn-save:hover {
  background: #1557a8;
}
.brg-btn-save:disabled,
.brg-btn-cancel:disabled {
  opacity: 0.5;
  cursor: default;
}
</style>
