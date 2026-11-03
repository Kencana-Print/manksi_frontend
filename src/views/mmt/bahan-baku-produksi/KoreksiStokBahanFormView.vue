<script setup lang="ts">
import { ref, computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useToast } from "vue-toastification";
import BaseForm from "@/components/BaseForm.vue";
import { useForm } from "@/composables/useForm";
import {
  IconAdjustments,
  IconSearch,
  IconPlus,
  IconTrash,
  IconRefresh,
} from "@tabler/icons-vue";
import api from "@/services/api";

import BahanMmtSearchModal from "@/components/lookups/BahanMmtSearchModal.vue";

const route = useRoute();
const router = useRouter();
const toast = useToast();

interface DetailItem {
  no: number;
  kode: string;
  nama: string;
  satuan: string;
  panjang: string | number;
  lebar: string | number;
  system: number;
  fisik: number;
  qty: number;
  harga: number;
  nilai: number;
}

interface KoreksiForm {
  nomor: string;
  tanggal: string;
  gudangKode: string;
  typeKor: number;
  keterangan: string;
  items: DetailItem[];
}

const initialData: KoreksiForm = {
  nomor: "AUTO",
  tanggal: new Date().toISOString().substring(0, 10),
  gudangKode: "WH-16",
  typeKor: 100,
  keterangan: "",
  items: [
    {
      no: 1,
      kode: "",
      nama: "",
      satuan: "ROLL",
      panjang: "",
      lebar: "",
      system: 0,
      fisik: 0,
      qty: 0,
      harga: 0,
      nilai: 0,
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
const activeRowIndex = ref<number | null>(null);
const isLoadingStock = ref(false);

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
} = useForm<KoreksiForm>({
  menuId: "5535",
  initialData,
  fetchApi: async () => {
    const nomor = route.params.nomor || route.query.nomor;
    if (!nomor) return { ...initialData };

    const res = await api.get(
      `/mmt/bahan-baku-produksi/koreksi-stok/${encodeURIComponent(String(nomor))}`
    );
    const data = res.data?.data;
    if (!data) return { ...initialData };

    const header = data.header || {};
    const details = data.details || [];

    return {
      nomor: header.Nomor || String(nomor),
      tanggal: toDateInputValue(header.Tanggal) || initialData.tanggal,
      gudangKode: header.GudangKode || "WH-16",
      typeKor: Number(header.TypeKor || 100),
      keterangan: header.Keterangan || "",
      items: details.map((d: any, idx: number) => ({
        no: idx + 1,
        kode: d.KodeBarang || d.SKU || "",
        nama: d.NamaBarang || "",
        satuan: d.Satuan || "ROLL",
        panjang: d.Panjang ?? "",
        lebar: d.Lebar ?? "",
        system: Number(d.System || 0),
        fisik: Number(d.Fisik || 0),
        qty: Number(d.Qty || 0),
        harga: Number(d.Harga || 0),
        nilai: Number(d.Nilai || 0),
      })),
    };
  },
  submitApi: async (dataToSave) => {
    const validItems = dataToSave.items.filter(
      (it) => it.kode.trim() !== "" && it.qty !== 0
    );
    if (validItems.length === 0) {
      throw new Error("Mohon isi minimal satu item dengan selisih QTY koreksi tidak nol.");
    }

    const payload = {
      header: {
        Nomor: dataToSave.nomor,
        Tanggal: dataToSave.tanggal,
        GudangKode: dataToSave.gudangKode,
        TypeKor: Number(dataToSave.typeKor),
        Keterangan: dataToSave.keterangan,
      },
      details: validItems.map((it) => ({
        SKU: it.kode,
        KodeBarang: it.kode,
        NamaBarang: it.nama,
        Satuan: it.satuan,
        Panjang: it.panjang || 0,
        Lebar: it.lebar || 0,
        System: it.system,
        Fisik: it.fisik,
        Qty: it.qty,
        Harga: it.harga || 0,
        Nilai: it.nilai || 0,
      })),
    };

    await api.post("/mmt/bahan-baku-produksi/koreksi-stok", payload);
  },
});

const calculateRow = (idx: number) => {
  const item = formData.value.items[idx];
  const fisik = Number(item.fisik) || 0;
  const sys = Number(item.system) || 0;
  item.qty = fisik - sys;
  item.nilai = item.qty * (Number(item.harga) || 0);
};

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
    row.panjang = b.Panjang || b.brg_panjang || "";
    row.lebar = b.Lebar || b.brg_lebar || "";
    row.system = Number(b.Stok || 0);
    row.harga = Number(b.HargaBeli || b.brg_hrgbeli || 0);
    row.fisik = row.system;
    row.qty = 0;
    row.nilai = 0;
  }
};

const loadStockAllGudang = async () => {
  if (!formData.value.gudangKode) return;
  isLoadingStock.value = true;
  try {
    const res = await api.get("/mmt/bahan-baku-produksi/koreksi-stok/stok", {
      params: {
        gudangKode: formData.value.gudangKode,
        tanggal: formData.value.tanggal,
      },
    });
    const dataStok = res.data?.data || [];
    if (dataStok.length > 0) {
      formData.value.items = dataStok.map((item: any, idx: number) => ({
        no: idx + 1,
        kode: item.Kode,
        nama: item.Nama,
        satuan: item.Satuan || "ROLL",
        panjang: item.Panjang || "",
        lebar: item.Lebar || "",
        system: Number(item.Stok || 0),
        fisik: Number(item.Stok || 0),
        qty: 0,
        harga: Number(item.HRGBELI || 0),
        nilai: 0,
      }));
      toast.success(`Berhasil menarik ${dataStok.length} stok bahan dari ${formData.value.gudangKode}`);
    } else {
      toast.info("Tidak ada data stok di gudang terpilih.");
    }
  } catch (err: any) {
    toast.error(err.response?.data?.message || "Gagal memuat stok gudang.");
  } finally {
    isLoadingStock.value = false;
  }
};

const addItem = () => {
  formData.value.items.push({
    no: formData.value.items.length + 1,
    kode: "",
    nama: "",
    satuan: "ROLL",
    panjang: "",
    lebar: "",
    system: 0,
    fisik: 0,
    qty: 0,
    harga: 0,
    nilai: 0,
  });
};

const removeItem = (idx: number) => {
  if (formData.value.items.length <= 1) {
    formData.value.items[0] = {
      no: 1,
      kode: "",
      nama: "",
      satuan: "ROLL",
      panjang: "",
      lebar: "",
      system: 0,
      fisik: 0,
      qty: 0,
      harga: 0,
      nilai: 0,
    };
    return;
  }
  formData.value.items.splice(idx, 1);
  formData.value.items.forEach((it, i) => (it.no = i + 1));
};

const totalQtyKoreksi = computed(() => {
  return formData.value.items.reduce((sum, it) => sum + (Number(it.qty) || 0), 0);
});
</script>

<template>
  <BaseForm
    :title="
      isEditMode
        ? `Ubah Koreksi Stok Bahan (${formData.nomor})`
        : 'Tambah Koreksi Stok Bahan Baru'
    "
    menu-id="5535"
    :icon="IconAdjustments"
    :is-loading="isLoading"
    :is-saving="isSaving"
    item-name="Koreksi Stok Bahan"
    desktop-mode
    v-model:show-save-dialog="showSaveDialog"
    v-model:show-cancel-dialog="showCancelDialog"
    v-model:show-close-dialog="showCloseDialog"
    @validate-save="showSaveDialog = true"
    @confirm-save="executeSave"
    @confirm-cancel="executeCancel"
    @confirm-close="executeClose"
  >
    <!-- ── KOLOM KIRI (HEADER) ── -->
    <template #left-column>
      <div class="desktop-form-section header-section">
        <div class="section-label">Data Header Koreksi</div>

        <div class="fr">
          <label class="lbl">Nomor Koreksi</label>
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
          <label class="lbl">Gudang</label>
          <select v-model="formData.gudangKode" class="inp">
            <option value="WH-16">WH-16 - GUDANG UTAMA MMT</option>
            <option value="GPM">GPM - Gudang Produksi MMT</option>
            <option value="WH-BP">WH-BP - GUDANG BAHAN PENOLONG MMT</option>
            <option value="GSM">GSM - Gudang Sisa MMT</option>
          </select>
        </div>

        <div class="fr">
          <label class="lbl">Tipe Koreksi</label>
          <select v-model.number="formData.typeKor" class="inp">
            <option :value="100">100 - Terima (Penambahan Stok)</option>
            <option :value="200">200 - Keluar (Pengurangan Stok)</option>
            <option :value="300">300 - Sisa Produksi</option>
          </select>
        </div>
      </div>
    </template>

    <!-- ── KOLOM KANAN (KETERANGAN & TARIK STOK) ── -->
    <template #right-column>
      <div class="desktop-form-section note-section">
        <div class="section-label">Keterangan & Aksi Cepat</div>

        <div class="fr">
          <label class="lbl">Keterangan</label>
          <textarea
            v-model="formData.keterangan"
            class="inp ta"
            rows="3"
            placeholder="Catatan penyesuaian/koreksi fisik bahan..."
          ></textarea>
        </div>

        <div class="fr mt-2">
          <label class="lbl"></label>
          <v-btn
            size="small"
            color="secondary"
            variant="tonal"
            class="text-none"
            :loading="isLoadingStock"
            @click="loadStockAllGudang"
          >
            <v-icon :icon="IconRefresh" size="16" class="mr-1" />
            Tarik Seluruh Stok Gudang Terpilih
          </v-btn>
        </div>
      </div>
    </template>

    <!-- ── DETAIL ITEM TABEL (BAWAH) ── -->
    <div class="items-container">
      <div class="d-flex justify-space-between align-center mb-2">
        <div class="section-label mb-0">Daftar Bahan yang Dikoreksi</div>
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
              <th style="width: 150px">Kode Bahan</th>
              <th>Nama Bahan</th>
              <th style="width: 80px" class="text-center">Satuan</th>
              <th style="width: 110px" class="text-center">Dimensi</th>
              <th style="width: 90px" class="text-end">Stok Sistem</th>
              <th style="width: 90px" class="text-end">Stok Fisik</th>
              <th style="width: 90px" class="text-end">Selisih</th>
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
                  type="text"
                  v-model="it.satuan"
                  class="tbl-inp text-center"
                />
              </td>
              <td class="text-center text-caption text-grey-darken-1">
                {{ it.panjang || it.lebar ? `${it.panjang || '-'}m × ${it.lebar || '-'}m` : '-' }}
              </td>
              <td class="text-end text-caption font-weight-medium text-grey-darken-2">
                {{ it.system }}
              </td>
              <td>
                <input
                  type="number"
                  v-model.number="it.fisik"
                  step="any"
                  class="tbl-inp text-end font-weight-bold"
                  @input="calculateRow(idx)"
                />
              </td>
              <td
                class="text-end font-weight-bold"
                :class="it.qty > 0 ? 'text-success' : (it.qty < 0 ? 'text-error' : '')"
              >
                {{ it.qty > 0 ? `+${it.qty}` : it.qty }}
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
              <td colspan="7" class="text-end font-weight-bold">Total Selisih QTY:</td>
              <td class="text-end font-weight-bold">{{ totalQtyKoreksi }}</td>
              <td></td>
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
