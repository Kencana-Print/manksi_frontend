<script setup lang="ts">
import { ref, computed, watch } from "vue";
import { useToast } from "vue-toastification";
import {
  kendaraanService,
  type KendaraanFormData,
} from "@/services/ga/kendaraanService";
import { IconDeviceFloppy, IconX, IconCar } from "@tabler/icons-vue";

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

const todayStr = () => {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const emptyForm = (): KendaraanFormData => ({
  nopol: "",
  stat: "INVENTARIS",
  keterangan: "",
  jadwal: 0,
  kmterakhir: 0,
  pajak: todayStr(),
});

const formData = ref<KendaraanFormData>(emptyForm());

const dialogVisible = computed({
  get: () => props.modelValue,
  set: (val) => emit("update:modelValue", val),
});

const closeDialog = () => {
  dialogVisible.value = false;
};

// Saat nopol kehilangan fokus di mode tambah: coba load data bila ada (seperti Delphi edtKodeExit)
const onNopolBlur = async () => {
  if (props.isEdit) return;
  const code = (formData.value.nopol || "").trim();
  if (!code) return;

  try {
    const res = await kendaraanService.getById(code);
    if (res.data?.data) {
      const d = res.data.data;
      formData.value.stat = (d.Stat as any) || "INVENTARIS";
      formData.value.keterangan = d.Keterangan || "";
      formData.value.jadwal = Number(d.Jadwal_Servis) || 0;
      formData.value.kmterakhir = Number(d.KmTerakhir) || 0;
      formData.value.pajak = d.Pajak || todayStr();
      toast.info(`Data kendaraan ${code} ditemukan di database.`);
    }
  } catch {
    // Abaikan jika tidak ditemukan, berarti data baru
  }
};

const handleSave = async () => {
  const nopol = (formData.value.nopol || "").trim().toUpperCase();
  if (!nopol) {
    toast.warning("Nomor Polisi (Kode) harus diisi.");
    return;
  }

  isSaving.value = true;
  try {
    const payload: KendaraanFormData = {
      ...formData.value,
      nopol,
      stat: formData.value.stat || "INVENTARIS",
      keterangan: (formData.value.keterangan || "").trim().toUpperCase(),
      jadwal: Number(formData.value.jadwal) || 0,
      kmterakhir: Number(formData.value.kmterakhir) || 0,
      pajak: formData.value.pajak || todayStr(),
    };

    if (props.isEdit) {
      await kendaraanService.update(nopol, payload);
      toast.success(`Kendaraan ${nopol} berhasil diperbarui.`);
    } else {
      await kendaraanService.create(payload);
      toast.success(`Kendaraan ${nopol} berhasil disimpan.`);
    }

    emit("saved");
    closeDialog();
  } catch (err: any) {
    toast.error(err.response?.data?.message || err.message || "Gagal menyimpan data kendaraan.");
  } finally {
    isSaving.value = false;
  }
};

watch(
  () => props.modelValue,
  async (isOpen) => {
    if (!isOpen) return;

    if (props.isEdit && props.editData?.Nopol) {
      isLoading.value = true;
      try {
        const res = await kendaraanService.getById(props.editData.Nopol);
        const d = res.data.data;
        formData.value = {
          nopol: d.Nopol,
          stat: (d.Stat as any) || "INVENTARIS",
          keterangan: d.Keterangan || "",
          jadwal: Number(d.Jadwal_Servis) || 0,
          kmterakhir: Number(d.KmTerakhir) || 0,
          pajak: d.Pajak || todayStr(),
        };
      } catch {
        formData.value = {
          nopol: props.editData.Nopol,
          stat: props.editData.Stat || "INVENTARIS",
          keterangan: props.editData.Keterangan || "",
          jadwal: Number(props.editData.Jadwal_Servis) || 0,
          kmterakhir: Number(props.editData.KmTerakhir) || 0,
          pajak: props.editData.Pajak || todayStr(),
        };
      } finally {
        isLoading.value = false;
      }
    } else {
      formData.value = emptyForm();
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
          <IconCar :size="16" />
          <span class="window-title-text">Master Kendaraan</span>
        </div>
        <button class="win-btn-close" @click="closeDialog" title="Tutup">
          ✕
        </button>
      </div>

      <!-- Header Subtitle "Kendaraan" (TAdvPanel2) -->
      <div class="delphi-header-sub">
        <h1 class="delphi-header-title">Kendaraan</h1>
        <div class="delphi-top-line"></div>
      </div>

      <!-- Content Form (TAdvPanel1) -->
      <div class="delphi-body">
        <div v-if="isLoading" class="text-center py-6">
          <v-progress-circular indeterminate size="24" color="primary" />
          <div class="text-caption mt-2">Memuat data...</div>
        </div>

        <div v-else class="delphi-form-content">
          <!-- Row 1: Nomor Polisi -->
          <div class="delphi-row">
            <label class="delphi-lbl">Nomor Polisi</label>
            <div class="delphi-val">
              <input
                type="text"
                v-model="formData.nopol"
                class="delphi-ctrl ctrl-nopol"
                :disabled="isEdit"
                maxlength="12"
                placeholder="Mis: AD 1234 XX"
                style="text-transform: uppercase"
                @blur="onNopolBlur"
                @keydown.enter.prevent="onNopolBlur"
              />
            </div>
          </div>

          <!-- Row 2: Status -->
          <div class="delphi-row">
            <label class="delphi-lbl">Status</label>
            <div class="delphi-val">
              <select v-model="formData.stat" class="delphi-ctrl ctrl-stat">
                <option value="INVENTARIS">INVENTARIS</option>
                <option value="PRIBADI">PRIBADI</option>
              </select>
            </div>
          </div>

          <!-- Row 3: Keterangan (Otomatis Huruf Kapital) -->
          <div class="delphi-row">
            <label class="delphi-lbl">Keterangan</label>
            <div class="delphi-val">
              <input
                type="text"
                v-model="formData.keterangan"
                class="delphi-ctrl ctrl-ket"
                maxlength="30"
                placeholder="Nama kendaraan..."
                style="text-transform: uppercase"
                @input="formData.keterangan = ($event.target as HTMLInputElement).value.toUpperCase()"
              />
            </div>
          </div>

          <!-- Row 4: Jadwal Servis -->
          <div class="delphi-row">
            <label class="delphi-lbl">Jadwal Servis</label>
            <div class="delphi-val d-flex align-center">
              <input
                type="number"
                v-model.number="formData.jadwal"
                class="delphi-ctrl ctrl-number"
                min="0"
                step="1"
              />
              <span class="unit-lbl ml-2">KM</span>
            </div>
          </div>

          <!-- Row 5: KM Terakhir -->
          <div class="delphi-row">
            <label class="delphi-lbl">KM Terakhir</label>
            <div class="delphi-val d-flex align-center">
              <input
                type="number"
                v-model.number="formData.kmterakhir"
                class="delphi-ctrl ctrl-number"
                min="0"
                step="1"
              />
              <span class="unit-lbl ml-2">KM</span>
            </div>
          </div>

          <!-- Row 6: Jadwal Pajak -->
          <div class="delphi-row">
            <label class="delphi-lbl">Jadwal Pajak</label>
            <div class="delphi-val">
              <input
                type="date"
                v-model="formData.pajak"
                class="delphi-ctrl ctrl-date"
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
          :disabled="isSaving"
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

/* ── Form Sub-Header (lbljudul: Kendaraan) ── */
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
  padding: 16px 20px 20px 20px;
}

.delphi-form-content {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

/* ── Baris Label & Input Delphi ── */
.delphi-row {
  display: flex;
  align-items: center;
}

.delphi-lbl {
  width: 120px;
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

.ctrl-nopol {
  width: 170px;
  font-weight: 600;
  letter-spacing: 0.5px;
}

.ctrl-stat {
  width: 180px;
  padding: 1px 4px;
}

.ctrl-ket {
  width: 100%;
  max-width: 320px;
}

.ctrl-number {
  width: 90px;
  text-align: right;
  font-variant-numeric: tabular-nums;
}

.ctrl-date {
  width: 150px;
}

.unit-lbl {
  font-size: 12px;
  font-weight: bold;
  color: #333333;
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
