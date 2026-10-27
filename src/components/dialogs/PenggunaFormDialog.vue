<script setup lang="ts">
import { ref, computed, watch, nextTick } from "vue";
import { useToast } from "vue-toastification";
import {
  penggunaService,
  type PenggunaFormData,
} from "@/services/ga/penggunaService";
import { IconDeviceFloppy, IconX, IconUsers } from "@tabler/icons-vue";

const props = defineProps<{
  modelValue: boolean;
  isEdit: boolean;
  editData?: any;
}>();

const emit = defineEmits<{
  "update:modelValue": [value: boolean];
  saved: [];
}>();

const toast = useToast();
const isSaving = ref(false);
const isLoading = ref(false);
const namaInputRef = ref<HTMLInputElement | null>(null);

const emptyForm = (): PenggunaFormData => ({
  kode: "",
  nama: "",
});

const formData = ref<PenggunaFormData>(emptyForm());

const dialogVisible = computed({
  get: () => props.modelValue,
  set: (val) => emit("update:modelValue", val),
});

const closeDialog = () => {
  dialogVisible.value = false;
};

const handleSave = async () => {
  const nama = (formData.value.nama || "").trim().toUpperCase();
  if (!nama) {
    toast.warning("Nama pengguna harus diisi.");
    if (namaInputRef.value) namaInputRef.value.focus();
    return;
  }

  isSaving.value = true;
  try {
    if (props.isEdit) {
      await penggunaService.update(formData.value.kode, { nama });
      toast.success(`Pengguna ${nama} (${formData.value.kode}) berhasil diperbarui.`);
    } else {
      const res = await penggunaService.create({
        kode: "",
        nama,
      });
      const savedKode = res.data?.data?.kode || "";
      toast.success(`Pengguna ${nama} (${savedKode}) berhasil disimpan.`);
    }

    emit("saved");
    closeDialog();
  } catch (err: any) {
    toast.error(
      err.response?.data?.message || err.message || "Gagal menyimpan data pengguna.",
    );
  } finally {
    isSaving.value = false;
  }
};

watch(
  () => props.modelValue,
  async (isOpen) => {
    if (!isOpen) return;

    if (props.isEdit && props.editData?.Kode) {
      isLoading.value = true;
      try {
        const res = await penggunaService.getById(props.editData.Kode);
        const d = res.data.data;
        formData.value = {
          kode: d.Kode,
          nama: d.Nama || "",
        };
      } catch {
        formData.value = {
          kode: props.editData.Kode,
          nama: props.editData.Nama || "",
        };
      } finally {
        isLoading.value = false;
        nextTick(() => {
          if (namaInputRef.value) namaInputRef.value.focus();
        });
      }
    } else {
      // Mode Tambah Baru: Kode kosong, baru tercipta saat simpan
      formData.value = emptyForm();
      isLoading.value = false;
      nextTick(() => {
        if (namaInputRef.value) namaInputRef.value.focus();
      });
    }
  },
);
</script>

<template>
  <v-dialog
    v-model="dialogVisible"
    max-width="520px"
    persistent
    transition="dialog-top-transition"
  >
    <div class="delphi-window">
      <!-- Title Bar Delphi Form -->
      <div class="delphi-title-bar">
        <div class="d-flex align-center gap-1">
          <IconUsers :size="16" />
          <span class="window-title-text">Master Pengguna</span>
        </div>
        <button class="win-btn-close" @click="closeDialog" title="Tutup">
          ✕
        </button>
      </div>

      <!-- Header Subtitle "Pengguna" (TAdvPanel2) -->
      <div class="delphi-header-sub">
        <h1 class="delphi-header-title">Pengguna</h1>
        <div class="delphi-top-line"></div>
      </div>

      <!-- Content Form (TAdvPanel1) -->
      <div class="delphi-body">
        <div v-if="isLoading" class="text-center py-6">
          <v-progress-circular indeterminate size="24" color="primary" />
          <div class="text-caption mt-2">Memuat data...</div>
        </div>

        <div v-else class="delphi-form-content">
          <!-- Row 1: Kode (Baru tercipta saat simpan) -->
          <div class="delphi-row">
            <label class="delphi-lbl">Kode</label>
            <div class="delphi-val">
              <input
                type="text"
                :value="isEdit ? formData.kode : ''"
                class="delphi-ctrl ctrl-kode"
                disabled
                placeholder=""
              />
            </div>
          </div>

          <!-- Row 2: Nama (Otomatis Huruf Kapital) -->
          <div class="delphi-row">
            <label class="delphi-lbl">Nama</label>
            <div class="delphi-val">
              <input
                ref="namaInputRef"
                type="text"
                v-model="formData.nama"
                class="delphi-ctrl ctrl-nama"
                maxlength="30"
                placeholder="Nama pengguna..."
                style="text-transform: uppercase"
                @input="formData.nama = ($event.target as HTMLInputElement).value.toUpperCase()"
                @keydown.enter.prevent="handleSave"
              />
            </div>
          </div>
        </div>
      </div>

      <!-- Action Panel Bottom (TAdvPanel3) -->
      <div class="delphi-footer">
        <button
          type="button"
          class="delphi-btn btn-simpan"
          :disabled="isSaving || isLoading"
          @click="handleSave"
        >
          <IconDeviceFloppy :size="15" :stroke-width="2" class="mr-1" />
          <span>{{ isSaving ? "Menyimpan..." : "Simpan" }}</span>
        </button>

        <button
          type="button"
          class="delphi-btn btn-tutup"
          :disabled="isSaving"
          @click="closeDialog"
        >
          <IconX :size="15" :stroke-width="2" class="mr-1" />
          <span>Tutup</span>
        </button>
      </div>
    </div>
  </v-dialog>
</template>

<style scoped>
/* ── Windows Form Delphi 7 Container ── */
.delphi-window {
  background-color: #ffffff;
  border: 1px solid #7f9db9;
  border-radius: 4px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.25);
  font-family: Tahoma, "Segoe UI", Arial, sans-serif;
  color: #000000;
  overflow: hidden;
}

/* ── Form Title Bar (Delphi MDI Window Header) ── */
.delphi-title-bar {
  background: linear-gradient(to right, #0055ea, #3a83f7);
  color: #ffffff;
  padding: 4px 8px;
  font-size: 12px;
  font-weight: bold;
  display: flex;
  align-items: center;
  justify-content: space-between;
  user-select: none;
}

.window-title-text {
  letter-spacing: 0.3px;
}

.win-btn-close {
  background: transparent;
  border: none;
  color: #ffffff;
  font-weight: bold;
  font-size: 13px;
  cursor: pointer;
  padding: 0 6px;
  border-radius: 3px;
  line-height: 18px;
}

.win-btn-close:hover {
  background-color: #e81123;
}

/* ── Form Sub-Header (lbljudul: Pengguna) ── */
.delphi-header-sub {
  background-color: #ffffff;
  padding: 14px 20px 0 20px;
}

.delphi-header-title {
  font-size: 16px;
  font-weight: bold;
  color: #000000;
  letter-spacing: 0.5px;
  margin: 0 0 6px 0;
  font-family: Tahoma, sans-serif;
}

.delphi-top-line {
  height: 2px;
  background-color: #808080;
}

/* ── Body Panel (AdvPanel1) ── */
.delphi-body {
  background-color: #ffffff;
  padding: 18px 20px 24px 20px;
}

.delphi-form-content {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

/* ── Baris Label & Input Delphi ── */
.delphi-row {
  display: flex;
  align-items: center;
}

.delphi-lbl {
  width: 90px;
  font-size: 12px;
  color: #000000;
  flex-shrink: 0;
  user-select: none;
}

.delphi-val {
  flex-grow: 1;
}

/* ── Input Controls Delphi 7 ── */
.delphi-ctrl {
  font-size: 12px;
  font-family: Tahoma, sans-serif;
  color: #000000;
  background-color: #ffffff;
  border: 1px solid #7f9db9;
  padding: 2px 6px;
  height: 23px;
  outline: none;
  box-sizing: border-box;
}

.delphi-ctrl:focus {
  border-color: #0055ea;
  box-shadow: 0 0 0 1px #0055ea;
}

.delphi-ctrl:disabled {
  background-color: #d4d0c8;
  color: #444444;
  cursor: not-allowed;
  border-color: #abadb3;
}

.ctrl-kode {
  width: 90px;
  font-weight: 600;
}

.ctrl-nama {
  width: 100%;
  max-width: 300px;
}

/* ── Footer Panel (AdvPanel3) ── */
.delphi-footer {
  background-color: #f0f0f0;
  border-top: 1px solid #d4d0c8;
  padding: 8px 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

/* ── Tombol Bergaya cxButton Delphi 7 ── */
.delphi-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 28px;
  padding: 0 14px;
  font-size: 12px;
  font-family: Tahoma, sans-serif;
  font-weight: 500;
  border: 1px solid #707070;
  border-radius: 3px;
  background: linear-gradient(to bottom, #ffffff 0%, #e1e1e1 100%);
  cursor: pointer;
  color: #000000;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.8);
  transition: all 0.1s;
}

.delphi-btn:hover {
  background: linear-gradient(to bottom, #f5f5f5 0%, #dcdcdc 100%);
  border-color: #3c7fb1;
}

.delphi-btn:active {
  background: #cccccc;
  box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.2);
}

.delphi-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-simpan {
  min-width: 90px;
  color: #004d40;
  font-weight: 600;
}

.btn-tutup {
  min-width: 80px;
  color: #37474f;
}
</style>
