<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useToast } from "vue-toastification";
import BaseForm from "@/components/BaseForm.vue";
import { useForm } from "@/composables/useForm";
import {
  kendaraanService,
  type KendaraanFormData,
} from "@/services/ga/kendaraanService";
import { IconCar, IconDeviceFloppy, IconX } from "@tabler/icons-vue";

const route = useRoute();
const router = useRouter();
const toast = useToast();

const editNopol = computed(() =>
  decodeURIComponent(String(route.params.nopol || "")),
);
const isEdit = computed(() => !!editNopol.value);

const todayStr = () => {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const initialData: KendaraanFormData = {
  nopol: "",
  stat: "INVENTARIS",
  keterangan: "",
  jadwal: 0,
  kmterakhir: 0,
  pajak: todayStr(),
};

const {
  isSaving,
  showSaveDialog,
  showCancelDialog,
  showCloseDialog,
  formData,
  goBack,
  executeSave,
  executeCancel,
  executeClose,
} = useForm<KendaraanFormData>({
  menuId: "601",
  initialData,
  submitApi: async (data) => {
    const payload: KendaraanFormData = {
      ...data,
      nopol: (data.nopol || "").trim().toUpperCase(),
      stat: data.stat || "INVENTARIS",
      keterangan: (data.keterangan || "").trim().toUpperCase(),
      jadwal: Number(data.jadwal) || 0,
      kmterakhir: Number(data.kmterakhir) || 0,
      pajak: data.pajak || todayStr(),
    };

    if (isEdit.value) {
      return kendaraanService.update(editNopol.value, payload);
    } else {
      return kendaraanService.create(payload);
    }
  },
  onSuccess: (res: any) => {
    const nopolSaved =
      res?.data?.data?.nopol || formData.value.nopol || editNopol.value || "";
    toast.success(
      isEdit.value
        ? `Kendaraan ${editNopol.value} berhasil diperbarui.`
        : `Berhasil disimpan: ${nopolSaved}`,
    );
    router.push({ name: "GaMasterKendaraan" });
  },
});

const onValidate = () => {
  const nopol = (formData.value.nopol || "").trim();
  if (!nopol) {
    toast.warning("Nomor Polisi (Kode) harus diisi.");
    return;
  }
  showSaveDialog.value = true;
};

// Mode Tambah: saat nopol blur, cari jika sudah ada di database (seperti Delphi edtKodeExit)
const onNopolBlur = async () => {
  if (isEdit.value) return;
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
    // Abaikan jika data baru
  }
};

onMounted(async () => {
  if (isEdit.value) {
    try {
      const res = await kendaraanService.getById(editNopol.value);
      const d = res.data.data;
      if (!d) throw new Error("Data tidak ditemukan");

      formData.value = {
        nopol: d.Nopol,
        stat: (d.Stat as any) || "INVENTARIS",
        keterangan: d.Keterangan || "",
        jadwal: Number(d.Jadwal_Servis) || 0,
        kmterakhir: Number(d.KmTerakhir) || 0,
        pajak: d.Pajak || todayStr(),
      };
    } catch (err: any) {
      toast.error(
        err.response?.data?.message ||
          err.message ||
          "Gagal memuat data Kendaraan.",
      );
      goBack();
    }
  }
});
</script>

<template>
  <BaseForm
    :title="isEdit ? 'Ubah Kendaraan' : 'Master Kendaraan'"
    menu-id="601"
    :icon="IconCar"
    :is-saving="isSaving"
    :item-name="isEdit ? `Kendaraan ${editNopol}` : 'Kendaraan Baru'"
    v-model:show-save-dialog="showSaveDialog"
    v-model:show-cancel-dialog="showCancelDialog"
    v-model:show-close-dialog="showCloseDialog"
    @validate-save="onValidate"
    @confirm-save="executeSave"
    @confirm-cancel="executeCancel"
    @confirm-close="executeClose"
  >
    <div class="delphi-container">
      <!-- Judul Form Delphi 7 (lbljudul: Kendaraan) -->
      <div class="delphi-header-title">Kendaraan</div>
      <div class="delphi-top-line"></div>

      <!-- Form Inputs Header (Layout Delphi 7) -->
      <div class="delphi-form-content">
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
  </BaseForm>
</template>

<style scoped>
/* ── Wrapper Form Tema Delphi 7 ── */
.delphi-container {
  background-color: #ffffff;
  padding: 16px 24px;
  font-family: Tahoma, "Segoe UI", Arial, sans-serif;
  color: #000000;
  box-sizing: border-box;
}

.delphi-header-title {
  font-size: 16px;
  font-weight: bold;
  color: #000000;
  letter-spacing: 0.5px;
  margin-bottom: 8px;
}

.delphi-top-line {
  height: 2px;
  background-color: #808080;
  margin-bottom: 16px;
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
  width: 140px;
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
  height: 24px;
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
  width: 180px;
  font-weight: 600;
  letter-spacing: 0.5px;
}

.ctrl-stat {
  width: 180px;
  padding: 1px 4px;
}

.ctrl-ket {
  width: 320px;
}

.ctrl-number {
  width: 100px;
  text-align: right;
  font-variant-numeric: tabular-nums;
}

.ctrl-date {
  width: 160px;
}

.unit-lbl {
  font-size: 12px;
  font-weight: bold;
  color: #333333;
}
</style>
