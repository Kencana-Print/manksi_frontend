<script setup lang="ts">
import { ref, computed } from "vue";
import { useRouter } from "vue-router";
import { useToast } from "vue-toastification";
import BaseForm from "@/components/BaseForm.vue";
import { useForm } from "@/composables/useForm";
import {
  IconBarcode,
  IconSearch,
  IconPlus,
  IconTrash,
  IconQrcode,
} from "@tabler/icons-vue";
import api from "@/services/api";

import BahanMmtSearchModal from "@/components/lookups/BahanMmtSearchModal.vue";

const router = useRouter();
const toast = useToast();

interface GeneratedBarcode {
  no: number;
  barcode: string;
  kodeBahan: string;
  namaBahan: string;
  panjang: number;
  lebar: number;
  tanggal: string;
}

interface FormState {
  tanggal: string;
  gudangKode: string;
  kodeBahan: string;
  namaBahan: string;
  panjang: number;
  lebar: number;
  qty: number;
  items: GeneratedBarcode[];
}

const initialData: FormState = {
  tanggal: new Date().toISOString().substring(0, 10),
  gudangKode: "WH-16",
  kodeBahan: "",
  namaBahan: "",
  panjang: 0,
  lebar: 0,
  qty: 1,
  items: [],
};

const showBahanModal = ref(false);
const isGenerating = ref(false);

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
} = useForm<FormState>({
  menuId: "5541",
  initialData,
  fetchApi: async () => {
    return { ...initialData };
  },
  submitApi: async (dataToSave) => {
    if (!dataToSave.items || dataToSave.items.length === 0) {
      throw new Error("Belum ada barcode yang di-generate untuk disimpan.");
    }

    const payload = {
      items: dataToSave.items.map((it) => ({
        tanggal: it.tanggal,
        kodeBahan: it.kodeBahan,
        barcode: it.barcode,
        panjang: it.panjang,
        lebar: it.lebar,
      })),
    };

    await api.post("/mmt/bahan-baku-produksi/barcode/create/save-batch", payload);
  },
});

const onSelectBahan = (b: any) => {
  formData.value.kodeBahan = b.Kode || b.brg_kode || "";
  formData.value.namaBahan = b.Nama || b.brg_nama || "";
  formData.value.panjang = Number(b.Panjang || b.brg_panjang || 0);
  formData.value.lebar = Number(b.Lebar || b.brg_lebar || 0);
};

const handleGenerateBarcodes = async () => {
  if (!formData.value.kodeBahan) {
    toast.warning("Silakan pilih bahan terlebih dahulu.");
    return;
  }
  if (!formData.value.qty || formData.value.qty <= 0) {
    toast.warning("Jumlah rol barcode minimal 1.");
    return;
  }

  isGenerating.value = true;
  try {
    const res = await api.get(
      "/mmt/bahan-baku-produksi/barcode/create/next-number",
      {
        params: {
          kodeBahan: formData.value.kodeBahan,
          tanggal: formData.value.tanggal,
        },
      }
    );

    if (res.data?.success) {
      const ym = res.data.ym;
      let nextSeq = Number(res.data.nextSeq);

      for (let i = 0; i < formData.value.qty; i++) {
        const seqStr = String(nextSeq + i).padStart(3, "0");
        const barcode = `${formData.value.kodeBahan}-${ym}-${seqStr}`;

        // Cek duplikasi di items
        if (!formData.value.items.some((it) => it.barcode === barcode)) {
          formData.value.items.push({
            no: formData.value.items.length + 1,
            barcode,
            kodeBahan: formData.value.kodeBahan,
            namaBahan: formData.value.namaBahan,
            panjang: formData.value.panjang,
            lebar: formData.value.lebar,
            tanggal: formData.value.tanggal,
          });
        }
      }
      toast.success(`Berhasil generate ${formData.value.qty} barcode.`);
    }
  } catch (err: any) {
    toast.error(err.response?.data?.message || "Gagal generate nomor urut barcode.");
  } finally {
    isGenerating.value = false;
  }
};

const removeItem = (idx: number) => {
  formData.value.items.splice(idx, 1);
  formData.value.items.forEach((it, i) => (it.no = i + 1));
};
</script>

<template>
  <BaseForm
    title="Generate & Cetak Barcode Rol Baru"
    menu-id="5541"
    :icon="IconBarcode"
    :is-loading="isLoading"
    :is-saving="isSaving"
    item-name="Barcode Rol"
    desktop-mode
    v-model:show-save-dialog="showSaveDialog"
    v-model:show-cancel-dialog="showCancelDialog"
    v-model:show-close-dialog="showCloseDialog"
    @validate-save="showSaveDialog = true"
    @confirm-save="executeSave"
    @confirm-cancel="executeCancel"
    @confirm-close="executeClose"
  >
    <!-- ── KOLOM KIRI (TANGGAL & BAHAN) ── -->
    <template #left-column>
      <div class="desktop-form-section header-section">
        <div class="section-label">Pilihan Bahan & Tanggal</div>

        <div class="fr">
          <label class="lbl">Tanggal Masuk</label>
          <input
            type="date"
            v-model="formData.tanggal"
            class="inp"
            required
          />
        </div>

        <div class="fr">
          <label class="lbl">Gudang Penyimpanan</label>
          <input
            value="WH-16 - GUDANG UTAMA MMT"
            readonly
            class="inp readonly"
          />
        </div>

        <div class="fr">
          <label class="lbl">Pilih Bahan</label>
          <div class="lookup-cell flex-1">
            <input
              type="text"
              :value="
                formData.kodeBahan
                  ? `${formData.kodeBahan} - ${formData.namaBahan}`
                  : ''
              "
              readonly
              class="inp font-weight-medium"
              placeholder="Pilih Bahan MMT..."
            />
            <button
              type="button"
              class="btn-lookup"
              @click="showBahanModal = true"
              title="Cari Bahan MMT"
            >
              <v-icon :icon="IconSearch" size="14" />
            </button>
          </div>
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

    <!-- ── KOLOM KANAN (JUMLAH ROL & GENERATE) ── -->
    <template #right-column>
      <div class="desktop-form-section note-section">
        <div class="section-label">Pembuatan Barcode Batch</div>

        <div class="fr">
          <label class="lbl">Jumlah Rol (Qty)</label>
          <input
            type="number"
            v-model.number="formData.qty"
            min="1"
            class="inp text-end font-weight-bold"
            placeholder="Jumlah rol barcode..."
          />
        </div>

        <div class="fr mt-3">
          <label class="lbl"></label>
          <v-btn
            color="primary"
            variant="flat"
            size="small"
            class="text-none"
            :loading="isGenerating"
            @click="handleGenerateBarcodes"
          >
            <v-icon :icon="IconQrcode" size="16" class="mr-1" />
            Generate Barcode Rol
          </v-btn>
        </div>
      </div>
    </template>

    <!-- ── DETAIL ITEM TABEL (BAWAH) ── -->
    <div class="items-container">
      <div class="d-flex justify-space-between align-center mb-2">
        <div class="section-label mb-0">
          Daftar Barcode yang Akan Disimpan ke Database ({{ formData.items.length }} rol)
        </div>
      </div>

      <div class="items-table-wrapper">
        <table class="items-table">
          <thead>
            <tr>
              <th style="width: 50px" class="text-center">No</th>
              <th style="width: 220px">Barcode Rol</th>
              <th style="width: 150px">Kode Bahan</th>
              <th>Nama Bahan</th>
              <th style="width: 120px" class="text-center">Dimensi</th>
              <th style="width: 50px" class="text-center">Aksi</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(it, idx) in formData.items" :key="idx">
              <td class="text-center">{{ idx + 1 }}</td>
              <td class="font-weight-bold text-primary">{{ it.barcode }}</td>
              <td>{{ it.kodeBahan }}</td>
              <td>{{ it.namaBahan }}</td>
              <td class="text-center">{{ it.panjang }}m × {{ it.lebar }}m</td>
              <td class="text-center">
                <button
                  type="button"
                  class="btn-trash"
                  @click="removeItem(idx)"
                  title="Hapus baris"
                >
                  <v-icon :icon="IconTrash" size="16" />
                </button>
              </td>
            </tr>
            <tr v-if="formData.items.length === 0">
              <td colspan="6" class="text-center py-6 text-grey">
                Belum ada barcode yang di-generate. Pilih bahan dan klik "Generate Barcode Rol".
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </BaseForm>

  <!-- Lookups -->
  <BahanMmtSearchModal
    v-model="showBahanModal"
    @selected="onSelectBahan"
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
.inp.readonly {
  background: #f5f5f5;
  color: #757575;
}
.items-container {
  margin-top: 4px;
}
.items-table-wrapper {
  overflow-x: auto;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  background: white;
}
.items-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 11px;
}
.items-table th {
  background: #fafafa;
  color: #424242;
  font-weight: 600;
  border-bottom: 2px solid #e0e0e0;
  padding: 6px 8px;
  text-align: left;
  white-space: nowrap;
}
.items-table td {
  border-bottom: 1px solid #f0f0f0;
  padding: 5px 8px;
  vertical-align: middle;
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
.btn-trash {
  background: transparent;
  border: none;
  cursor: pointer;
  color: #d32f2f;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto;
}
.btn-trash:hover {
  color: #b71c1c;
}
</style>
