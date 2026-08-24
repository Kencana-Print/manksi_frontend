<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from "vue";
import { useRouter } from "vue-router";
import { useToast } from "vue-toastification";
import { useForm } from "@/composables/useForm";
import BaseForm from "@/components/BaseForm.vue";
import api from "@/services/api";
import { kendalaFormService } from "@/services/master/kendalaFormService";
import {
  IconAlertTriangle,
  IconUpload,
  IconArrowsMaximize,
  IconRefresh,
  IconX,
  IconPhotoOff,
} from "@tabler/icons-vue";

interface KendalaData {
  Nomor: string;
  Tanggal: string;
  Kendala: string;
  Keterangan: string;
  Image1Url: string | null;
  Image2Url: string | null;
  Image3Url: string | null;
}

const router = useRouter();
const toast = useToast();

const getBaseUrl = () => {
  const rawBase = api.defaults.baseURL || import.meta.env.VITE_API_URL || "";
  return rawBase.replace(/\/api\/?$/, "");
};

const todayLocal = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const initialData: KendalaData = {
  Nomor: "",
  Tanggal: todayLocal(),
  Kendala: "",
  Keterangan: "",
  Image1Url: null,
  Image2Url: null,
  Image3Url: null,
};

// ── State gambar — terpisah dari formData karena butuh pegang File
// mentah (dikirim via FormData saat submit). imagePreviews dipakai
// utk tampilan (bisa server URL ATAU blob URL lokal kalau user baru
// pilih file baru — belum tersimpan). ──
const imageFiles = ref<Record<string, File | null>>({
  image1: null,
  image2: null,
  image3: null,
});
const imagePreviews = ref<Record<string, string | null>>({
  image1: null,
  image2: null,
  image3: null,
});

const fileInputImage1 = ref<HTMLInputElement | null>(null);
const fileInputImage2 = ref<HTMLInputElement | null>(null);
const fileInputImage3 = ref<HTMLInputElement | null>(null);
const fileInputMap: Record<string, typeof fileInputImage1> = {
  image1: fileInputImage1,
  image2: fileInputImage2,
  image3: fileInputImage3,
};
const triggerFileInput = (key: string) => {
  fileInputMap[key]?.value?.click();
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
} = useForm<KendalaData>({
  menuId: "37",
  initialData,
  fetchApi: async (): Promise<KendalaData> => {
    const res = await kendalaFormService.getDetail(String(params.nomor));
    const ed = res.data.data;
    imagePreviews.value.image1 = ed.Image1Url
      ? `${getBaseUrl()}${ed.Image1Url}`
      : null;
    imagePreviews.value.image2 = ed.Image2Url
      ? `${getBaseUrl()}${ed.Image2Url}`
      : null;
    imagePreviews.value.image3 = ed.Image3Url
      ? `${getBaseUrl()}${ed.Image3Url}`
      : null;
    return ed;
  },
  submitApi: async (dataToSave) => {
    const fd = new FormData();
    fd.append("tanggal", dataToSave.Tanggal);
    fd.append("kendala", dataToSave.Kendala);
    fd.append("keterangan", dataToSave.Keterangan || "");
    if (imageFiles.value.image1) fd.append("image1", imageFiles.value.image1);
    if (imageFiles.value.image2) fd.append("image2", imageFiles.value.image2);
    if (imageFiles.value.image3) fd.append("image3", imageFiles.value.image3);
    const res = await kendalaFormService.save(
      isEditMode.value ? dataToSave.Nomor : null,
      fd,
    );
    toast.success("Data kendala berhasil disimpan.");
    return res;
  },
  onSuccess: () => {
    router.push("/daftar/kendala");
  },
});

onMounted(async () => {
  if (isEditMode.value) await fetchData();
});

// ── Upload gambar per-slot ──
const onFileSelected = (key: string, e: Event) => {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (!file) return;
  if (!file.type.startsWith("image/")) {
    toast.error("File yang dipilih harus berupa gambar.");
    return;
  }
  imageFiles.value[key] = file;
  imagePreviews.value[key] = URL.createObjectURL(file);
  activePreviewKey.value = key;
};

// ── Preview aktif — ditampilkan di panel kanan besar, sama seperti
// img4 Delphi (otomatis ikut foto yang terakhir disentuh/diupload) ──
const activePreviewKey = ref<string | null>(null);
const activePreviewUrl = computed(() =>
  activePreviewKey.value ? imagePreviews.value[activePreviewKey.value] : null,
);

// ── Fullscreen viewer (Esc atau klik luar untuk menutup, sama
// seperti btnFullscreenClick + FormKeyDown Delphi) ──
const showFullscreen = ref(false);
const fullscreenKey = ref<string | null>(null);
const openFullscreen = (key: string) => {
  if (!imagePreviews.value[key]) return;
  fullscreenKey.value = key;
  showFullscreen.value = true;
};
const closeFullscreen = () => {
  showFullscreen.value = false;
  fullscreenKey.value = null;
};
const onKeydownEsc = (e: KeyboardEvent) => {
  if (e.key === "Escape" && showFullscreen.value) closeFullscreen();
};
onMounted(() => window.addEventListener("keydown", onKeydownEsc));
onUnmounted(() => window.removeEventListener("keydown", onKeydownEsc));

// ── Reset semua gambar sekaligus (replikasi btreset1Click, target
// tabel dikoreksi ke tkendala di backend — Delphi aslinya salah
// sasaran ke tcomplain) ──
const showResetConfirm = ref(false);
const confirmResetImages = async () => {
  showResetConfirm.value = false;
  try {
    if (isEditMode.value && formData.value.Nomor) {
      await kendalaFormService.resetImages(formData.value.Nomor);
    }
    imageFiles.value = { image1: null, image2: null, image3: null };
    imagePreviews.value = { image1: null, image2: null, image3: null };
    activePreviewKey.value = null;
    toast.success("Reset gambar berhasil.");
  } catch (e: any) {
    toast.error(e.response?.data?.message || "Gagal reset gambar.");
  }
};

// ── Validasi (replikasi cekdata Delphi — Kendala wajib diisi) ──
const validateForm = () => {
  if (!formData.value.Kendala?.trim()) {
    toast.warning("Kendala belum diisi.");
    return;
  }
  showSaveDialog.value = true;
};
</script>

<template>
  <BaseForm
    :title="isEditMode ? 'Ubah Kendala' : 'Tambah Kendala'"
    menu-id="37"
    :icon="IconAlertTriangle"
    :is-loading="isLoading"
    :is-saving="isSaving"
    item-name="Kendala"
    v-model:show-save-dialog="showSaveDialog"
    v-model:show-cancel-dialog="showCancelDialog"
    v-model:show-close-dialog="showCloseDialog"
    @validate-save="validateForm"
    @confirm-save="executeSave"
    @confirm-cancel="executeCancel"
    @confirm-close="executeClose"
  >
    <template #right-column>
      <div class="kd-wrap">
        <div class="kd-section">
          <div class="kd-top-fields">
            <div class="f-row">
              <label class="f-lbl">Nomor</label>
              <input
                :value="formData.Nomor"
                readonly
                class="f-inp ro"
                style="width: 180px"
                :placeholder="isEditMode ? '' : '← Kosong = Baru'"
              />
            </div>
            <div class="f-row">
              <label class="f-lbl">Tanggal Kendala</label>
              <input
                type="date"
                v-model="formData.Tanggal"
                class="f-inp idate"
                style="width: 160px"
              />
            </div>
          </div>

          <div class="kd-body">
            <!-- Kiri: Kendala + Keterangan -->
            <div class="kd-left">
              <div class="kd-ta-item">
                <label class="kd-ta-label"
                  >Kendala <span class="req">*</span></label
                >
                <textarea
                  v-model="formData.Kendala"
                  class="kd-ta"
                  rows="8"
                  :class="{ 'ta-error': !formData.Kendala }"
                />
              </div>
              <div class="kd-ta-item">
                <label class="kd-ta-label">Keterangan</label>
                <textarea
                  v-model="formData.Keterangan"
                  class="kd-ta"
                  rows="8"
                />
              </div>
            </div>

            <!-- Kanan: Lampiran Gambar -->
            <div class="kd-right">
              <div class="kd-img-panel">
                <div class="kd-img-panel-header">
                  <span>Lampiran Gambar</span>
                  <button
                    type="button"
                    class="btn-reset-img"
                    @click="showResetConfirm = true"
                  >
                    <IconRefresh :size="13" class="mr-1" /> Reset Image
                  </button>
                </div>

                <div class="kd-img-row">
                  <button
                    type="button"
                    class="btn-img-select"
                    :class="{ 'has-image': imagePreviews.image1 }"
                    @click="triggerFileInput('image1')"
                  >
                    <IconUpload :size="13" class="mr-1" /> Foto Sample
                  </button>
                  <button
                    type="button"
                    class="btn-fullscreen"
                    :disabled="!imagePreviews.image1"
                    @click="openFullscreen('image1')"
                  >
                    <IconArrowsMaximize :size="13" class="mr-1" /> Full Screen
                  </button>
                  <input
                    ref="fileInputImage1"
                    type="file"
                    accept="image/*"
                    style="display: none"
                    @change="onFileSelected('image1', $event)"
                  />
                </div>

                <div class="kd-img-row">
                  <button
                    type="button"
                    class="btn-img-select"
                    :class="{ 'has-image': imagePreviews.image2 }"
                    @click="triggerFileInput('image2')"
                  >
                    <IconUpload :size="13" class="mr-1" /> Foto Hasil Produksi
                  </button>
                  <button
                    type="button"
                    class="btn-fullscreen"
                    :disabled="!imagePreviews.image2"
                    @click="openFullscreen('image2')"
                  >
                    <IconArrowsMaximize :size="13" class="mr-1" /> Full Screen
                  </button>
                  <input
                    ref="fileInputImage2"
                    type="file"
                    accept="image/*"
                    style="display: none"
                    @change="onFileSelected('image2', $event)"
                  />
                </div>

                <div class="kd-img-row">
                  <button
                    type="button"
                    class="btn-img-select"
                    :class="{ 'has-image': imagePreviews.image3 }"
                    @click="triggerFileInput('image3')"
                  >
                    <IconUpload :size="13" class="mr-1" /> Foto SPK
                  </button>
                  <button
                    type="button"
                    class="btn-fullscreen"
                    :disabled="!imagePreviews.image3"
                    @click="openFullscreen('image3')"
                  >
                    <IconArrowsMaximize :size="13" class="mr-1" /> Full Screen
                  </button>
                  <input
                    ref="fileInputImage3"
                    type="file"
                    accept="image/*"
                    style="display: none"
                    @change="onFileSelected('image3', $event)"
                  />
                </div>
              </div>

              <!-- Preview besar (mirip img4 Delphi) -->
              <div class="kd-preview-box">
                <img
                  v-if="activePreviewUrl"
                  :src="activePreviewUrl"
                  class="kd-preview-img"
                />
                <div v-else class="kd-preview-empty">
                  <IconPhotoOff :size="32" color="#bdbdbd" />
                  <span>Belum ada gambar dipilih</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>
  </BaseForm>

  <!-- Fullscreen viewer -->
  <Teleport to="body">
    <div v-if="showFullscreen" class="fs-overlay" @click.self="closeFullscreen">
      <button class="fs-close" @click="closeFullscreen">
        <IconX :size="20" />
      </button>
      <img
        v-if="fullscreenKey"
        :src="imagePreviews[fullscreenKey] ?? ''"
        class="fs-img"
      />
      <div class="fs-hint">
        Tekan Esc atau klik di luar gambar untuk menutup
      </div>
    </div>
  </Teleport>

  <!-- Konfirmasi reset -->
  <v-dialog v-model="showResetConfirm" max-width="360px" persistent>
    <v-card class="rounded-lg">
      <v-card-title
        class="pa-3 bg-warning text-white"
        style="font-size: 13px; font-weight: 700"
      >
        Konfirmasi Reset
      </v-card-title>
      <v-card-text class="pa-4" style="font-size: 12px">
        Yakin akan reset gambar? Semua lampiran (Foto Sample, Foto Hasil
        Produksi, Foto SPK) akan dihapus.
      </v-card-text>
      <v-card-actions class="pa-3 border-t">
        <v-spacer />
        <v-btn variant="text" size="small" @click="showResetConfirm = false"
          >Batal</v-btn
        >
        <v-btn
          color="warning"
          variant="flat"
          size="small"
          @click="confirmResetImages"
          >Ya, Reset</v-btn
        >
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.kd-wrap {
  padding: 8px;
}
.kd-section {
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  padding: 12px 14px;
  font-size: 11px;
  font-family: "Segoe UI", system-ui, sans-serif;
}
.kd-top-fields {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 12px;
}
.f-row {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 26px;
}
.f-lbl {
  width: 110px;
  flex-shrink: 0;
  font-size: 11px;
  font-weight: 600;
  color: #555;
}
.f-inp {
  height: 26px;
  border: 1px solid #a0a0a0;
  padding: 0 6px;
  font-size: 11px;
  font-family: inherit;
  outline: none;
  border-radius: 2px;
  background: white;
  color: #212121;
  box-sizing: border-box;
}
.f-inp:focus {
  border-color: #1565c0;
}
.f-inp.ro {
  background: #dde8f0 !important;
  color: #444 !important;
}
.idate {
  height: 26px;
}
.kd-body {
  display: flex;
  gap: 16px;
  align-items: flex-start;
}
.kd-left {
  flex: 1.4;
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-width: 0;
}
.kd-ta-item {
  display: flex;
  flex-direction: column;
  gap: 3px;
}
.kd-ta-label {
  font-size: 11px;
  font-weight: 700;
  color: #212121;
}
.req {
  color: #e53935;
}
.kd-ta {
  width: 100%;
  border: 1px solid #a0a0a0;
  border-radius: 2px;
  padding: 6px 8px;
  font-size: 11px;
  font-family: inherit;
  outline: none;
  resize: vertical;
  box-sizing: border-box;
  color: #212121;
}
.kd-ta:focus {
  border-color: #1565c0;
}
.ta-error {
  border-color: #e53935 !important;
}
.kd-right {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-width: 260px;
}
.kd-img-panel {
  border: 1px solid #ccc;
  border-radius: 4px;
  padding: 10px;
  background: #fafafa;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.kd-img-panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 11px;
  font-weight: 700;
  color: #212121;
  padding-bottom: 6px;
  border-bottom: 1px solid #e0e0e0;
}
.btn-reset-img {
  display: flex;
  align-items: center;
  height: 24px;
  padding: 0 8px;
  background: white;
  border: 1px solid #bdbdbd;
  border-radius: 3px;
  font-size: 10px;
  font-weight: 600;
  color: #555;
  cursor: pointer;
}
.btn-reset-img:hover {
  background: #fff3e0;
  border-color: #ffb74d;
  color: #e65100;
}
.kd-img-row {
  display: flex;
  align-items: center;
  gap: 6px;
}
.btn-img-select {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 28px;
  border: 1px solid #a0a0a0;
  border-radius: 3px;
  background: #ececec;
  font-size: 11px;
  font-weight: 600;
  color: #333;
  cursor: pointer;
}
.btn-img-select:hover {
  background: #e0e0e0;
}
.btn-img-select.has-image {
  background: #e8f5e9;
  border-color: #66bb6a;
  color: #2e7d32;
}
.btn-fullscreen {
  display: flex;
  align-items: center;
  height: 28px;
  padding: 0 8px;
  border: 1px solid #90caf9;
  border-radius: 3px;
  background: #e3f2fd;
  font-size: 10px;
  font-weight: 600;
  color: #1565c0;
  cursor: pointer;
  white-space: nowrap;
}
.btn-fullscreen:hover:not(:disabled) {
  background: #bbdefb;
}
.btn-fullscreen:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
.mr-1 {
  margin-right: 3px;
}
.kd-preview-box {
  border: 1px solid #ccc;
  border-radius: 4px;
  background: #fafafa;
  min-height: 220px;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}
.kd-preview-img {
  max-width: 100%;
  max-height: 320px;
  object-fit: contain;
}
.kd-preview-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  color: #9e9e9e;
  font-size: 11px;
}

/* ── Fullscreen overlay ── */
.fs-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.9);
  z-index: 9999;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}
.fs-img {
  max-width: 92vw;
  max-height: 85vh;
  object-fit: contain;
}
.fs-close {
  position: absolute;
  top: 16px;
  right: 20px;
  background: rgba(255, 255, 255, 0.15);
  border: none;
  color: white;
  border-radius: 50%;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}
.fs-close:hover {
  background: rgba(255, 255, 255, 0.3);
}
.fs-hint {
  margin-top: 12px;
  color: rgba(255, 255, 255, 0.6);
  font-size: 11px;
}
</style>
