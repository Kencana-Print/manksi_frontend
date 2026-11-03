<script setup lang="ts">
import { ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useToast } from "vue-toastification";
import BaseForm from "@/components/BaseForm.vue";
import { useForm } from "@/composables/useForm";
import { IconArrowsExchange, IconSearch } from "@tabler/icons-vue";
import api from "@/services/api";

import SpkSearchModal from "@/components/lookups/SpkSearchModal.vue";

const route = useRoute();
const router = useRouter();
const toast = useToast();

interface PinjamForm {
  barcode: string;
  operator: string;
  nomor_spk: string;
  nama_bahan: string;
  panjang: string | number;
  lebar: string | number;
}

const initialData: PinjamForm = {
  barcode: "",
  operator: "",
  nomor_spk: "",
  nama_bahan: "",
  panjang: "",
  lebar: "",
};

const showSpkModal = ref(false);

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
} = useForm<PinjamForm>({
  menuId: "5538",
  initialData,
  fetchApi: async () => {
    return { ...initialData };
  },
  submitApi: async (dataToSave) => {
    if (!dataToSave.barcode || !dataToSave.nomor_spk) {
      throw new Error("Barcode Rol dan Nomor SPK wajib diisi.");
    }
    await api.post("/mmt/bahan-baku-produksi/pinjam", dataToSave);
  },
});

const onBarcodeScan = async () => {
  const bc = formData.value.barcode.trim();
  if (!bc) return;

  try {
    const res = await api.get(
      "/mmt/bahan-baku-produksi/barcode/search/quick-check",
      { params: { barcode: bc } }
    );
    const b = res.data?.data;
    if (b) {
      formData.value.nama_bahan = b.Nama_Bahan || b.brg_nama || "";
      formData.value.panjang = b.Panjang || b.mst_panjang || 0;
      formData.value.lebar = b.Lebar || b.mst_lebar || 0;
      toast.success(`Barcode ${bc} teridentifikasi: ${formData.value.nama_bahan}`);
    }
  } catch (err: any) {
    toast.warning(`Barcode ${bc} tidak ditemukan di master stok.`);
  }
};

const onSelectSpk = (spk: any) => {
  formData.value.nomor_spk = spk.Nomor || spk.spk_nomor || "";
};
</script>

<template>
  <BaseForm
    title="Form Permintaan Pinjam Bahan MMT"
    menu-id="5538"
    :icon="IconArrowsExchange"
    :is-loading="isLoading"
    :is-saving="isSaving"
    item-name="Pinjam Bahan MMT"
    desktop-mode
    v-model:show-save-dialog="showSaveDialog"
    v-model:show-cancel-dialog="showCancelDialog"
    v-model:show-close-dialog="showCloseDialog"
    @validate-save="showSaveDialog = true"
    @confirm-save="executeSave"
    @confirm-cancel="executeCancel"
    @confirm-close="executeClose"
  >
    <!-- ── KOLOM KIRI (BARCODE & BAHAN) ── -->
    <template #left-column>
      <div class="desktop-form-section header-section">
        <div class="section-label">Identifikasi Rol Bahan</div>

        <div class="fr">
          <label class="lbl">Scan / Ketik Barcode</label>
          <input
            type="text"
            v-model="formData.barcode"
            class="inp font-weight-bold"
            placeholder="Scan barcode lalu tekan Enter..."
            autofocus
            @keyup.enter="onBarcodeScan"
          />
        </div>

        <div class="fr">
          <label class="lbl">Nama Bahan</label>
          <input
            type="text"
            v-model="formData.nama_bahan"
            class="inp"
            placeholder="Nama bahan..."
          />
        </div>

        <div class="fr">
          <label class="lbl">Dimensi Bahan (P × L)</label>
          <div class="d-flex align-center gap-2 flex-1">
            <input
              type="number"
              v-model.number="formData.panjang"
              class="inp text-end"
              placeholder="Panjang (m)"
            />
            <span>×</span>
            <input
              type="number"
              v-model.number="formData.lebar"
              class="inp text-end"
              placeholder="Lebar (m)"
            />
          </div>
        </div>
      </div>
    </template>

    <!-- ── KOLOM KANAN (OPERATOR & SPK) ── -->
    <template #right-column>
      <div class="desktop-form-section note-section">
        <div class="section-label">Operator & Tujuan Penggunaan</div>

        <div class="fr">
          <label class="lbl">Nama Operator</label>
          <input
            type="text"
            v-model="formData.operator"
            class="inp"
            placeholder="Nama operator peminjam..."
            required
          />
        </div>

        <div class="fr">
          <label class="lbl">Nomor SPK</label>
          <div class="lookup-cell flex-1">
            <input
              type="text"
              v-model="formData.nomor_spk"
              class="inp font-weight-medium"
              placeholder="Pilih SPK..."
              required
            />
            <button
              type="button"
              class="btn-lookup"
              @click="showSpkModal = true"
              title="Cari SPK"
            >
              <v-icon :icon="IconSearch" size="14" />
            </button>
          </div>
        </div>
      </div>
    </template>
  </BaseForm>

  <!-- Lookups -->
  <SpkSearchModal
    v-model="showSpkModal"
    @selected="onSelectSpk"
  />
</template>

<style scoped>
.desktop-form-section {
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  padding: 10px 14px;
  margin-bottom: 12px;
}
.section-label {
  font-size: 11px;
  font-weight: 700;
  color: #1976d2;
  text-transform: uppercase;
  margin-bottom: 8px;
  letter-spacing: 0.5px;
}
.fr {
  display: flex;
  align-items: center;
  margin-bottom: 8px;
}
.lbl {
  width: 140px;
  flex-shrink: 0;
  font-size: 11px;
  font-weight: 600;
  color: #424242;
}
.inp {
  flex: 1;
  height: 28px;
  border: 1px solid #ccc;
  border-radius: 3px;
  padding: 0 8px;
  font-size: 11px;
  color: #212121;
  background: white;
  outline: none;
}
.inp:focus {
  border-color: #1976d2;
}
.lookup-cell {
  display: flex;
  align-items: center;
  gap: 2px;
}
.flex-1 {
  flex: 1;
}
.btn-lookup {
  background: #f5f5f5;
  border: 1px solid #ccc;
  border-radius: 2px;
  height: 28px;
  width: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: #555;
  flex-shrink: 0;
}
.btn-lookup:hover {
  background: #e0e0e0;
  color: #1976d2;
}
</style>
