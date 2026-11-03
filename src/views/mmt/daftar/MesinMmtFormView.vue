<script setup lang="ts">
import { useRoute } from "vue-router";
import BaseForm from "@/components/BaseForm.vue";
import { useForm } from "@/composables/useForm";
import { IconTool } from "@tabler/icons-vue";
import api from "@/services/api";

const route = useRoute();

interface MesinForm {
  msn_kode: string;
  msn_nama: string;
  msn_jenis: string;
  msn_note: string;
}

const jenisOptions = [
  { label: "C - Cutting", value: "C" },
  { label: "D - Digital", value: "D" },
  { label: "R - Roland", value: "R" },
  { label: "S - Seaming", value: "S" },
  { label: "T - TOKO", value: "T" },
];

const initialData: MesinForm = {
  msn_kode: "",
  msn_nama: "",
  msn_jenis: "C",
  msn_note: "",
};

const {
  isEditMode,
  isLoading,
  isSaving,
  formData,
  showSaveDialog,
  showCancelDialog,
  showCloseDialog,
  executeSave,
  executeCancel,
  executeClose,
} = useForm<MesinForm>({
  menuId: "5503",
  initialData,
  fetchApi: async () => {
    const kode = route.params.kode;
    const res = await api.get(`/mmt/daftar/mesin/${encodeURIComponent(String(kode))}`);
    const d = res.data?.data || res.data || {};
    return {
      msn_kode: d.msn_kode || d.Kode || String(kode),
      msn_nama: d.msn_nama || d.Nama || "",
      msn_jenis: d.msn_jenis || d.Jenis || "C",
      msn_note: d.msn_note || d.Keterangan || "",
    };
  },
  submitApi: async (dataToSave) => {
    return await api.post("/mmt/daftar/mesin/save", {
      msn_kode: dataToSave.msn_kode,
      msn_nama: dataToSave.msn_nama,
      msn_jenis: dataToSave.msn_jenis,
      msn_note: dataToSave.msn_note,
      isEditMode: isEditMode.value,
    });
  },
  onSuccessRoute: "/mmt/daftar/mesin",
});
</script>

<template>
  <BaseForm
    :title="isEditMode ? `Ubah Mesin Produksi MMT (${formData.msn_kode})` : 'Tambah Mesin Produksi MMT Baru'"
    menu-id="5503"
    :icon="IconTool"
    :is-loading="isLoading"
    :is-saving="isSaving"
    item-name="Mesin Produksi MMT"
    desktop-mode
    v-model:show-save-dialog="showSaveDialog"
    v-model:show-cancel-dialog="showCancelDialog"
    v-model:show-close-dialog="showCloseDialog"
    @validate-save="showSaveDialog = true"
    @confirm-save="executeSave"
    @confirm-cancel="executeCancel"
    @confirm-close="executeClose"
  >
    <template #left-column>
      <div class="desktop-form-section header-section">
        <div class="section-label">Data Mesin</div>

        <div class="fr">
          <label class="lbl">Kode Mesin</label>
          <input
            v-model="formData.msn_kode"
            class="inp"
            style="width: 140px; text-transform: uppercase"
            :readonly="isEditMode"
            :class="{ ro: isEditMode }"
            placeholder="Kode (contoh: M01)..."
          />
        </div>

        <div class="fr">
          <label class="lbl">Nama Mesin</label>
          <input
            v-model="formData.msn_nama"
            class="inp flex-grow-1"
            placeholder="Nama mesin produksi..."
          />
        </div>

        <div class="fr">
          <label class="lbl">Jenis Mesin</label>
          <select v-model="formData.msn_jenis" class="inp" style="width: 180px">
            <option v-for="j in jenisOptions" :key="j.value" :value="j.value">
              {{ j.label }}
            </option>
          </select>
        </div>

        <div class="fr">
          <label class="lbl">Keterangan</label>
          <textarea
            v-model="formData.msn_note"
            class="ta flex-grow-1"
            rows="2"
            placeholder="Catatan / spesifikasi mesin..."
          ></textarea>
        </div>
      </div>
    </template>

    <template #right-column>
      <div class="desktop-form-section h-100 d-flex align-center justify-center text-grey text-caption">
        Data mesin produksi digunakan pada LHK Cetak (Mesin) dan pelaporan output mesin MMT.
      </div>
    </template>
  </BaseForm>
</template>

<style scoped>
.desktop-form-section {
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  padding: 12px;
  margin-bottom: 10px;
  font-family: "Segoe UI", system-ui, sans-serif;
  font-size: 11px;
}
.section-label {
  font-size: 11px;
  font-weight: 700;
  color: #1565c0;
  text-transform: uppercase;
  margin-bottom: 8px;
  border-bottom: 1px solid #f0f0f0;
  padding-bottom: 4px;
}
.fr { display: flex; align-items: center; gap: 6px; margin-bottom: 6px; }
.lbl { width: 95px; flex-shrink: 0; font-weight: 600; color: #444; font-size: 11px; }
.inp { height: 24px; border: 1px solid #ccc; border-radius: 3px; padding: 0 6px; font-size: 11px; background: white; outline: none; min-width: 0; }
.inp:focus, .ta:focus { border-color: #1976d2; }
.ro { background: #f5f5f5 !important; color: #555 !important; }
.ta { border: 1px solid #ccc; border-radius: 3px; padding: 4px 6px; font-size: 11px; outline: none; font-family: inherit; }
</style>
