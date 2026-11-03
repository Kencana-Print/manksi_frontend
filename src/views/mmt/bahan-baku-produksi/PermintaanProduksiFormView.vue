<script setup lang="ts">
import { ref, computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useToast } from "vue-toastification";
import BaseForm from "@/components/BaseForm.vue";
import { useForm } from "@/composables/useForm";
import {
  IconBuildingFactory2,
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
  kode: string;
  nama: string;
  satuan: string;
  jumlah: number;
  komponen: string;
  ket: string;
}

interface PermintaanProduksiForm {
  nomor: string;
  tanggal: string;
  kategori: string;
  gudangAsalKode: string;
  divisi: string;
  spk: string;
  namaSpk: string;
  keterangan: string;
  status: string;
  items: DetailItem[];
}

const initialData: PermintaanProduksiForm = {
  nomor: "AUTO",
  tanggal: new Date().toISOString().substring(0, 10),
  kategori: "MMT/TEKSTIL",
  gudangAsalKode: "WH-16",
  divisi: "CUTING",
  spk: "",
  namaSpk: "NON-SPK (PERMINTAAN LANGSUNG)",
  keterangan: "BARU",
  status: "OPEN",
  items: [
    {
      no: 1,
      kode: "",
      nama: "",
      satuan: "ROLL",
      jumlah: 1,
      komponen: "BODY",
      ket: "",
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
} = useForm<PermintaanProduksiForm>({
  menuId: "5536",
  initialData,
  fetchApi: async () => {
    const nomor = route.params.nomor || route.query.nomor;
    if (!nomor) return { ...initialData };

    const res = await api.get(
      `/mmt/bahan-baku-produksi/permintaan-produksi/${encodeURIComponent(String(nomor))}`
    );
    const data = res.data?.data;
    if (!data) return { ...initialData };

    const header = data.header || data;
    const details = data.details || data.Details || data.items || [];

    return {
      nomor: header.Nomor || header.min_nomor || String(nomor),
      tanggal: toDateInputValue(header.Tanggal || header.min_tanggal) || initialData.tanggal,
      kategori: header.Kategori || header.min_kategori || "MMT/TEKSTIL",
      gudangAsalKode: header.GudangKode || header.min_cab || "WH-16",
      divisi: header.Divisi || header.min_divisi || "CUTING",
      spk: header.Nomor_SPK || header.min_spk_nomor || "",
      namaSpk: header.spk_nama || header.namaspk || "NON-SPK (PERMINTAAN LANGSUNG)",
      keterangan: header.Keterangan || header.min_ket || "BARU",
      status: header.Status || (header.min_close === 0 ? "OPEN" : "CLOSED"),
      items: details.map((d: any, idx: number) => ({
        no: idx + 1,
        kode: d.kode || d.Kode || d.sku || "",
        nama: d.nama || d.Nama || d.Nama_Bahan || "",
        satuan: d.satuan || d.Satuan || "ROLL",
        jumlah: Number(d.jumlah || d.Jumlah || d.qtyMinta || 1),
        komponen: d.komponen || d.Komponen || "BODY",
        ket: d.ket || d.keterangan || "",
      })),
    };
  },
  submitApi: async (dataToSave) => {
    const validItems = dataToSave.items.filter(
      (it) => it.kode.trim() !== "" && it.jumlah > 0
    );
    if (validItems.length === 0) {
      throw new Error("Mohon isi minimal satu item bahan dengan QTY > 0.");
    }

    const payload = {
      isEditMode: isEditMode.value,
      nomor: dataToSave.nomor,
      tanggal: dataToSave.tanggal,
      kategori: dataToSave.kategori,
      cabang: dataToSave.gudangAsalKode,
      gudangAsalKode: dataToSave.gudangAsalKode,
      divisi: dataToSave.divisi,
      spk: dataToSave.spk || "",
      keterangan: dataToSave.keterangan,
      details: validItems.map((it) => ({
        kode: it.kode,
        nama: it.nama,
        satuan: it.satuan,
        jumlah: it.jumlah,
        komponen: it.komponen,
        ket: it.ket,
      })),
    };

    if (isEditMode.value) {
      await api.put("/mmt/bahan-baku-produksi/permintaan-produksi", payload);
    } else {
      await api.post("/mmt/bahan-baku-produksi/permintaan-produksi", payload);
    }
  },
});

const openBahanLookup = (idx: number) => {
  activeRowIndex.value = idx;
  showBahanModal.value = true;
};

const onSelectBahan = (b: any) => {
  if (activeRowIndex.value !== null && formData.value.items[activeRowIndex.value]) {
    const row = formData.value.items[activeRowIndex.value];
    row.kode = b.Kode || b.brg_kode || "";
    row.nama = b.Nama || b.brg_nama || "";
    row.satuan = b.Satuan || b.brg_satuan || "ROLL";
  }
};

const openSpkLookup = () => {
  showSpkModal.value = true;
};

const onSelectSpk = (spk: any) => {
  formData.value.spk = spk.Nomor || spk.spk_nomor || "";
  formData.value.namaSpk = spk.Nama || spk.spk_nama || "";
};

const addItem = () => {
  formData.value.items.push({
    no: formData.value.items.length + 1,
    kode: "",
    nama: "",
    satuan: "ROLL",
    jumlah: 1,
    komponen: "BODY",
    ket: "",
  });
};

const removeItem = (idx: number) => {
  if (formData.value.items.length <= 1) {
    formData.value.items[0] = {
      no: 1,
      kode: "",
      nama: "",
      satuan: "ROLL",
      jumlah: 1,
      komponen: "BODY",
      ket: "",
    };
    return;
  }
  formData.value.items.splice(idx, 1);
  formData.value.items.forEach((it, i) => (it.no = i + 1));
};

const totalJumlah = computed(() => {
  return formData.value.items.reduce((sum, it) => sum + (Number(it.jumlah) || 0), 0);
});
</script>

<template>
  <BaseForm
    :title="
      isEditMode
        ? `Ubah Permintaan Produksi (${formData.nomor})`
        : 'Tambah Permintaan Produksi Baru'
    "
    menu-id="5536"
    :icon="IconBuildingFactory2"
    :is-loading="isLoading"
    :is-saving="isSaving"
    item-name="Permintaan Produksi"
    desktop-mode
    v-model:show-save-dialog="showSaveDialog"
    v-model:show-cancel-dialog="showCancelDialog"
    v-model:show-close-dialog="showCloseDialog"
    @validate-save="showSaveDialog = true"
    @confirm-save="executeSave"
    @confirm-cancel="executeCancel"
    @confirm-close="executeClose"
  >
    <!-- ── KOLOM KIRI (HEADER & ASAL) ── -->
    <template #left-column>
      <div class="desktop-form-section header-section">
        <div class="section-label">Data Header Permintaan</div>

        <div class="fr">
          <label class="lbl">Nomor Permintaan</label>
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
          <label class="lbl">Kategori</label>
          <select v-model="formData.kategori" class="inp">
            <option value="MMT/TEKSTIL">MMT/TEKSTIL</option>
            <option value="SUBLIM">SUBLIM</option>
          </select>
        </div>

        <div class="fr">
          <label class="lbl">Gudang Asal</label>
          <select v-model="formData.gudangAsalKode" class="inp">
            <option value="WH-16">WH-16 - GUDANG UTAMA MMT</option>
            <option value="GPM">GPM - Gudang Produksi MMT</option>
            <option value="WH-BP">WH-BP - GUDANG BAHAN PENOLONG MMT</option>
            <option value="GSM">GSM - Gudang Sisa MMT</option>
          </select>
        </div>

        <div class="fr">
          <label class="lbl">Divisi Peminta</label>
          <select v-model="formData.divisi" class="inp">
            <option value="CUTING">CUTING</option>
            <option value="SUBLIM">SUBLIM</option>
            <option value="PROOF">PROOF</option>
            <option value="FINISHING">FINISHING</option>
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
              v-model="formData.spk"
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
          <label class="lbl">Nama SPK / Item</label>
          <input
            type="text"
            :value="formData.namaSpk"
            readonly
            class="inp readonly"
          />
        </div>

        <div class="fr">
          <label class="lbl">Keterangan Alasan</label>
          <select v-model="formData.keterangan" class="inp">
            <option value="BARU">BARU</option>
            <option value="GANTI BS">GANTI BS</option>
            <option value="GANTI HILANG">GANTI HILANG</option>
            <option value="TAMBAHAN">TAMBAHAN</option>
            <option value="LAINNYA">LAINNYA</option>
          </select>
        </div>

        <div v-if="isEditMode" class="fr align-center">
          <label class="lbl">Status</label>
          <v-chip
            size="small"
            :color="formData.status === 'OPEN' ? 'warning' : 'success'"
            class="font-weight-bold"
          >
            {{ formData.status }}
          </v-chip>
        </div>
      </div>
    </template>

    <!-- ── DETAIL ITEM TABEL (BAWAH) ── -->
    <div class="items-container">
      <div class="d-flex justify-space-between align-center mb-2">
        <div class="section-label mb-0">Daftar Bahan Produksi</div>
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
              <th style="width: 160px">Kode Bahan</th>
              <th>Nama Bahan</th>
              <th style="width: 100px" class="text-end">Jumlah Minta</th>
              <th style="width: 80px" class="text-center">Satuan</th>
              <th style="width: 120px">Komponen</th>
              <th>Keterangan</th>
              <th style="width: 50px" class="text-center">Aksi</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(it, idx) in formData.items" :key="idx">
              <td class="text-center">{{ idx + 1 }}</td>
              <td>
                <div class="lookup-cell">
                  <input
                    type="text"
                    v-model="it.kode"
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
                  v-model.number="it.jumlah"
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
              <td>
                <input
                  type="text"
                  v-model="it.komponen"
                  class="tbl-inp"
                  placeholder="Komponen..."
                />
              </td>
              <td>
                <input
                  type="text"
                  v-model="it.ket"
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
              <td colspan="3" class="text-end font-weight-bold">Total Jumlah:</td>
              <td class="text-end font-weight-bold">{{ totalJumlah }}</td>
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
