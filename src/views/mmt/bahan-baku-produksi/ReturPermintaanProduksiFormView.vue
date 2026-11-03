<script setup lang="ts">
import { ref, computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useToast } from "vue-toastification";
import BaseForm from "@/components/BaseForm.vue";
import { useForm } from "@/composables/useForm";
import {
  IconArrowBackUp,
  IconSearch,
  IconPlus,
  IconTrash,
} from "@tabler/icons-vue";
import api from "@/services/api";

import BahanMmtSearchModal from "@/components/lookups/BahanMmtSearchModal.vue";
import SpkSearchModal from "@/components/lookups/SpkSearchModal.vue";

const route = useRoute();
const router = useRouter();
const toast = useToast();

interface DetailItem {
  no: number;
  barcode: string;
  sku: string;
  nama: string;
  satuan: string;
  panjang: string | number;
  lebar: string | number;
  qty: number;
  keterangan: string;
}

interface ReturForm {
  nomor: string;
  tanggal: string;
  gudangAsal: string;
  gudangTujuan: string;
  nomorSpk: string;
  tipe: number;
  keterangan: string;
  items: DetailItem[];
}

const initialData: ReturForm = {
  nomor: "AUTO",
  tanggal: new Date().toISOString().substring(0, 10),
  gudangAsal: "GPM",
  gudangTujuan: "WH-16",
  nomorSpk: "",
  tipe: 1,
  keterangan: "",
  items: [
    {
      no: 1,
      barcode: "",
      sku: "",
      nama: "",
      satuan: "ROLL",
      panjang: "",
      lebar: "",
      qty: 1,
      keterangan: "",
    },
  ],
};

const toDateInputValue = (val: any): string => {
  if (!val) return "";
  const s = String(val);
  if (s.includes("T")) {
    const d = new Date(s);
    if (!isNaN(d.getTime())) {
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      const dd = String(d.getDate()).padStart(2, "0");
      return `${yyyy}-${mm}-${dd}`;
    }
  }
  return s.substring(0, 10);
};

const showBahanModal = ref(false);
const showSpkModal = ref(false);
const activeRowIndex = ref<number | null>(null);

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
} = useForm<ReturForm>({
  menuId: "5539",
  initialData,
  fetchApi: async () => {
    const nomor = route.params.nomor || route.query.nomor;
    if (!nomor) return { ...initialData };

    const res = await api.get(
      `/mmt/bahan-baku-produksi/retur-produksi/${encodeURIComponent(String(nomor))}`
    );
    const data = res.data?.data;
    if (!data) return { ...initialData };

    const header = data.header || {};
    const details = data.details || [];

    return {
      nomor: header.Nomor || String(nomor),
      tanggal: toDateInputValue(header.Tanggal) || initialData.tanggal,
      gudangAsal: header.GudangAsal || "GPM",
      gudangTujuan: header.GudangTujuan || "WH-16",
      nomorSpk: header.NomorSPK || "",
      tipe: Number(header.TypeCode ?? 1),
      keterangan: header.Keterangan || "",
      items: details.map((d: any, idx: number) => ({
        no: idx + 1,
        barcode: d.barcode || "",
        sku: d.sku || "",
        nama: d.Nama_Bahan || "",
        satuan: d.satuan || "ROLL",
        panjang: d.panjang ?? "",
        lebar: d.lebar ?? "",
        qty: Number(d.qty ?? 1),
        keterangan: d.keterangan || "",
      })),
    };
  },
  submitApi: async (dataToSave) => {
    const validItems = dataToSave.items.filter(
      (it) => it.sku.trim() !== "" && it.qty > 0
    );
    if (validItems.length === 0) {
      throw new Error("Mohon isi minimal satu item bahan dengan QTY > 0.");
    }

    const payload = {
      Nomor: dataToSave.nomor,
      Tanggal: dataToSave.tanggal,
      GudangAsal: dataToSave.gudangAsal,
      GudangTujuan: dataToSave.gudangTujuan,
      NomorSPK: dataToSave.nomorSpk || null,
      Type: Number(dataToSave.tipe),
      Keterangan: dataToSave.keterangan,
      Details: validItems.map((it) => ({
        sku: it.sku,
        barcode: it.barcode || "",
        qty: it.qty,
        satuan: it.satuan,
        panjang: it.panjang || 0,
        lebar: it.lebar || 0,
        keterangan: it.keterangan,
      })),
    };

    if (isEditMode.value) {
      await api.put(
        `/mmt/bahan-baku-produksi/retur-produksi/${encodeURIComponent(dataToSave.nomor)}`,
        payload
      );
    } else {
      await api.post("/mmt/bahan-baku-produksi/retur-produksi", payload);
    }
  },
});

const onBarcodeScan = async (idx: number) => {
  const item = formData.value.items[idx];
  const bc = item.barcode?.trim();
  if (!bc) return;

  try {
    const res = await api.get(
      "/mmt/bahan-baku-produksi/realisasi-produksi/stok-barcode/" +
        encodeURIComponent(bc),
      { params: { gudang: formData.value.gudangAsal } }
    );
    const b = res.data?.data;
    if (b) {
      item.sku = b.Kode || b.sku || "";
      item.nama = b.Nama_Bahan || b.Nama || "";
      item.panjang = b.Panjang || "";
      item.lebar = b.Lebar || "";
      item.satuan = b.Satuan || "ROLL";
      toast.success(`Barcode ${bc} teridentifikasi: ${item.nama}`);
    }
  } catch (err: any) {
    toast.warning(`Barcode ${bc} tidak ditemukan di ${formData.value.gudangAsal}.`);
  }
};

const openBahanLookup = (idx: number) => {
  activeRowIndex.value = idx;
  showBahanModal.value = true;
};

const onSelectBahan = (b: any) => {
  if (activeRowIndex.value !== null && formData.value.items[activeRowIndex.value]) {
    const row = formData.value.items[activeRowIndex.value];
    row.sku = b.Kode || b.brg_kode || "";
    row.nama = b.Nama || b.brg_nama || "";
    row.satuan = b.Satuan || b.brg_satuan || "ROLL";
    row.panjang = b.Panjang || b.brg_panjang || "";
    row.lebar = b.Lebar || b.brg_lebar || "";
  }
};

const openSpkLookup = () => {
  showSpkModal.value = true;
};

const onSelectSpk = (spk: any) => {
  formData.value.nomorSpk = spk.Nomor || spk.spk_nomor || "";
};

const addItem = () => {
  formData.value.items.push({
    no: formData.value.items.length + 1,
    barcode: "",
    sku: "",
    nama: "",
    satuan: "ROLL",
    panjang: "",
    lebar: "",
    qty: 1,
    keterangan: "",
  });
};

const removeItem = (idx: number) => {
  if (formData.value.items.length <= 1) {
    formData.value.items[0] = {
      no: 1,
      barcode: "",
      sku: "",
      nama: "",
      satuan: "ROLL",
      panjang: "",
      lebar: "",
      qty: 1,
      keterangan: "",
    };
    return;
  }
  formData.value.items.splice(idx, 1);
  formData.value.items.forEach((it, i) => (it.no = i + 1));
};

const totalQty = computed(() => {
  return formData.value.items.reduce((sum, it) => sum + (Number(it.qty) || 0), 0);
});
</script>

<template>
  <BaseForm
    :title="
      isEditMode
        ? `Ubah Retur Produksi (${formData.nomor})`
        : 'Tambah Retur Produksi Baru'
    "
    menu-id="5539"
    :icon="IconArrowBackUp"
    :is-loading="isLoading"
    :is-saving="isSaving"
    item-name="Retur Produksi"
    desktop-mode
    v-model:show-save-dialog="showSaveDialog"
    v-model:show-cancel-dialog="showCancelDialog"
    v-model:show-close-dialog="showCloseDialog"
    @validate-save="showSaveDialog = true"
    @confirm-save="executeSave"
    @confirm-cancel="executeCancel"
    @confirm-close="executeClose"
  >
    <!-- ── KOLOM KIRI (HEADER & GUDANG) ── -->
    <template #left-column>
      <div class="desktop-form-section header-section">
        <div class="section-label">Data Header Retur</div>

        <div class="fr">
          <label class="lbl">Nomor Retur</label>
          <input
            :value="formData.nomor"
            readonly
            class="inp readonly"
            placeholder="AUTO"
          />
        </div>

        <div class="fr">
          <label class="lbl">Tanggal</label>
          <input
            type="date"
            v-model="formData.tanggal"
            class="inp"
            required
          />
        </div>

        <div class="fr">
          <label class="lbl">Gudang Asal (Produksi)</label>
          <select v-model="formData.gudangAsal" class="inp">
            <option value="GPM">GPM - Gudang Produksi MMT</option>
            <option value="WH-16">WH-16 - GUDANG UTAMA MMT</option>
            <option value="WH-BP">WH-BP - GUDANG BAHAN PENOLONG MMT</option>
            <option value="GSM">GSM - Gudang Sisa MMT</option>
          </select>
        </div>

        <div class="fr">
          <label class="lbl">Gudang Tujuan (Bahan)</label>
          <select v-model="formData.gudangTujuan" class="inp">
            <option value="WH-16">WH-16 - GUDANG UTAMA MMT</option>
            <option value="GPM">GPM - Gudang Produksi MMT</option>
            <option value="WH-BP">WH-BP - GUDANG BAHAN PENOLONG MMT</option>
            <option value="GSM">GSM - Gudang Sisa MMT</option>
          </select>
        </div>
      </div>
    </template>

    <!-- ── KOLOM KANAN (SPK & KETERANGAN) ── -->
    <template #right-column>
      <div class="desktop-form-section note-section">
        <div class="section-label">Informasi SPK & Catatan</div>

        <div class="fr">
          <label class="lbl">Nomor SPK</label>
          <div class="lookup-cell flex-1">
            <input
              type="text"
              v-model="formData.nomorSpk"
              class="inp font-weight-medium"
              placeholder="Pilih SPK (Opsional)..."
            />
            <button
              type="button"
              class="btn-lookup"
              @click="openSpkLookup"
              title="Cari SPK"
            >
              <v-icon :icon="IconSearch" size="14" />
            </button>
          </div>
        </div>

        <div class="fr">
          <label class="lbl">Tipe Retur</label>
          <select v-model.number="formData.tipe" class="inp">
            <option :value="1">1 - Retur Bahan Produksi</option>
            <option :value="2">2 - Retur Lainnya</option>
          </select>
        </div>

        <div class="fr">
          <label class="lbl">Keterangan</label>
          <textarea
            v-model="formData.keterangan"
            class="inp ta"
            rows="2"
            placeholder="Catatan pengembalian bahan sisa / ganti..."
          ></textarea>
        </div>
      </div>
    </template>

    <!-- ── DETAIL ITEM TABEL (BAWAH) ── -->
    <div class="items-container">
      <div class="d-flex justify-space-between align-center mb-2">
        <div class="section-label mb-0">Daftar Bahan yang Diretur</div>
        <v-btn
          size="small"
          color="primary"
          variant="tonal"
          class="text-none"
          @click="addItem"
        >
          <v-icon :icon="IconPlus" size="16" class="mr-1" />
          Tambah Baris
        </v-btn>
      </div>

      <div class="items-table-wrapper">
        <table class="items-table">
          <thead>
            <tr>
              <th style="width: 40px" class="text-center">No</th>
              <th style="width: 170px">Barcode Rol</th>
              <th style="width: 140px">Kode Bahan</th>
              <th>Nama Bahan</th>
              <th style="width: 90px" class="text-end">Jumlah</th>
              <th style="width: 80px" class="text-center">Satuan</th>
              <th style="width: 110px" class="text-center">Dimensi</th>
              <th>Keterangan</th>
              <th style="width: 50px" class="text-center">Aksi</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(it, idx) in formData.items" :key="idx">
              <td class="text-center">{{ idx + 1 }}</td>
              <td>
                <input
                  type="text"
                  v-model="it.barcode"
                  class="tbl-inp font-weight-medium"
                  placeholder="Scan / ketik..."
                  @keyup.enter="onBarcodeScan(idx)"
                />
              </td>
              <td>
                <div class="lookup-cell">
                  <input
                    type="text"
                    v-model="it.sku"
                    class="tbl-inp font-weight-medium"
                    placeholder="Kode..."
                  />
                  <button
                    type="button"
                    class="btn-lookup"
                    @click="openBahanLookup(idx)"
                  >
                    <v-icon :icon="IconSearch" size="14" />
                  </button>
                </div>
              </td>
              <td>
                <input
                  type="text"
                  v-model="it.nama"
                  class="tbl-inp"
                  placeholder="Nama Bahan..."
                />
              </td>
              <td>
                <input
                  type="number"
                  v-model.number="it.qty"
                  min="0.01"
                  step="any"
                  class="tbl-inp text-end font-weight-bold"
                />
              </td>
              <td>
                <input
                  type="text"
                  v-model="it.satuan"
                  class="tbl-inp text-center"
                />
              </td>
              <td class="text-center text-caption text-grey-darken-1">
                {{ it.panjang || it.lebar ? `${it.panjang || '-'}m × ${it.lebar || '-'}m` : '-' }}
              </td>
              <td>
                <input
                  type="text"
                  v-model="it.keterangan"
                  class="tbl-inp"
                  placeholder="Keterangan..."
                />
              </td>
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
          </tbody>
          <tfoot>
            <tr>
              <td colspan="4" class="text-end font-weight-bold">Total QTY Retur:</td>
              <td class="text-end font-weight-bold">{{ totalQty }}</td>
              <td colspan="4"></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  </BaseForm>

  <!-- Lookups -->
  <BahanMmtSearchModal
    v-model="showBahanModal"
    @selected="onSelectBahan"
  />
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
  margin-bottom: 6px;
}
.fr:last-child {
  margin-bottom: 0;
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
.inp.ta {
  height: auto;
  padding: 4px 8px;
  resize: vertical;
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
  padding: 4px 6px;
  vertical-align: middle;
}
.items-table tfoot td {
  background: #fdfdfd;
  border-top: 2px solid #e0e0e0;
  padding: 6px 8px;
}
.tbl-inp {
  width: 100%;
  height: 24px;
  border: 1px solid transparent;
  border-radius: 2px;
  padding: 0 4px;
  font-size: 11px;
  background: transparent;
  outline: none;
}
.tbl-inp:focus {
  border-color: #1976d2;
  background: white;
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
  height: 24px;
  width: 24px;
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
