<script setup lang="ts">
import { useRoute } from "vue-router";
import BaseForm from "@/components/BaseForm.vue";
import { useForm } from "@/composables/useForm";
import { IconUsers } from "@tabler/icons-vue";
import api from "@/services/api";

const route = useRoute();

interface OperatorForm {
  Kode: string;
  Nama: string;
}

const initialData: OperatorForm = {
  Kode: "",
  Nama: "",
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
} = useForm<OperatorForm>({
  menuId: "5502",
  initialData,
  fetchApi: async () => {
    const kode = route.params.kode;
    const res = await api.get(`/mmt/daftar/operator/${encodeURIComponent(String(kode))}`);
    const d = res.data?.data || res.data || {};
    return {
      Kode: d.Kode || d.op_kode || String(kode),
      Nama: d.Nama || d.op_nama || "",
    };
  },
  submitApi: async (dataToSave) => {
    return await api.post("/mmt/daftar/operator/save", {
      Kode: dataToSave.Kode,
      Nama: dataToSave.Nama,
      isEdit: isEditMode.value,
    });
  },
  onSuccessRoute: "/mmt/daftar/operator",
});
</script>

<template>
  <BaseForm
    :title="isEditMode ? `Ubah Operator MMT (${formData.Kode})` : 'Tambah Operator MMT Baru'"
    menu-id="5502"
    :icon="IconUsers"
    :is-loading="isLoading"
    :is-saving="isSaving"
    item-name="Operator MMT"
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
        <div class="section-label">Data Operator</div>

        <div class="fr">
          <label class="lbl">Kode Operator</label>
          <input
            v-model="formData.Kode"
            class="inp"
            style="width: 140px; text-transform: uppercase"
            :readonly="isEditMode"
            :class="{ ro: isEditMode }"
            placeholder="Kode (contoh: OP01)..."
          />
        </div>

        <div class="fr">
          <label class="lbl">Nama Operator</label>
          <input
            v-model="formData.Nama"
            class="inp flex-grow-1"
            placeholder="Nama lengkap operator..."
          />
        </div>
      </div>
    </template>

    <template #right-column>
      <div class="desktop-form-section h-100 d-flex align-center justify-center text-grey text-caption">
        Pastikan kode operator unik dan belum pernah dipakai sebelumnya.
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
.inp:focus { border-color: #1976d2; }
.ro { background: #f5f5f5 !important; color: #555 !important; }
</style>
