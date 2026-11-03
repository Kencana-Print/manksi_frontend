<script setup lang="ts">
import { ref, computed } from "vue";
import { useRoute } from "vue-router";
import BaseForm from "@/components/BaseForm.vue";
import { useForm } from "@/composables/useForm";
import { IconArrowBack, IconPlus, IconTrash } from "@tabler/icons-vue";
import api from "@/services/api";

const route = useRoute();

interface DetailItem {
  noUrut: number;
  barcode: string;
  sku: string;
  namaBarang: string;
  qty: number;
  satuan: string;
  panjang: number;
  lebar: number;
  harga: number;
  disc: number;
  keterangan: string;
}

interface ReturBeliForm {
  nomor: string;
  tanggal: string;
  gudangKode: string;
  gudangNama: string;
  supplierKode: string;
  supplierNama: string;
  noPenerimaan: string;
  keterangan: string;
  items: DetailItem[];
}

const initialData: ReturBeliForm = {
  nomor: "AUTO",
  tanggal: new Date().toISOString().substring(0, 10),
  gudangKode: "GPM",
  gudangNama: "Gudang Bahan MMT",
  supplierKode: "",
  supplierNama: "",
  noPenerimaan: "",
  keterangan: "",
  items: [],
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
} = useForm<ReturBeliForm>({
  menuId: "5506",
  initialData,
  fetchApi: async () => {
    const nomor = route.params.nomor;
    const res = await api.get(`/mmt/retur-beli/${encodeURIComponent(String(nomor))}`);
    const data = res.data?.data || res.data;
    const details = data.Details || data.details || [];
    return {
      nomor: data.Nomor || data.nomor || String(nomor),
      tanggal: data.Tanggal ? String(data.Tanggal).substring(0, 10) : initialData.tanggal,
      gudangKode: data.Gudang || data.gudangKode || "GPM",
      gudangNama: data.GudangNama || data.gudangNama || "Gudang Bahan MMT",
      supplierKode: data.SupplierKode || data.supplierKode || "",
      supplierNama: data.SupplierNama || data.supplierNama || "",
      noPenerimaan: data.NoPenerimaan || data.noPenerimaan || "",
      keterangan: data.Keterangan || data.keterangan || "",
      items: details.map((d: any, idx: number) => ({
        noUrut: idx + 1,
        barcode: d.barcode || d.rbd_barcode || "",
        sku: d.sku || d.rbd_sku || "",
        namaBarang: d.namaBarang || d.brg_nama || "",
        qty: Number(d.qty || d.rbd_qty || 0),
        satuan: d.satuan || d.rbd_satuan || "PCS",
        panjang: Number(d.panjang || d.rbd_panjang || 0),
        lebar: Number(d.lebar || d.rbd_lebar || 0),
        harga: Number(d.harga || d.rbd_harga || 0),
        disc: Number(d.disc || d.diskon || d.rbd_diskon || 0),
        keterangan: d.keterangan || d.rbd_keterangan || "",
      })),
    };
  },
  submitApi: async (dataToSave) => {
    const payload = {
      ...dataToSave,
      details: dataToSave.items,
    };
    if (isEditMode.value) {
      return await api.put(`/mmt/retur-beli/${encodeURIComponent(dataToSave.nomor)}`, payload);
    }
    return await api.post("/mmt/retur-beli", payload);
  },
  onSuccessRoute: "/mmt/finance/retur-beli",
});

const addItem = () => {
  formData.value.items.push({
    noUrut: formData.value.items.length + 1,
    barcode: "",
    sku: "",
    namaBarang: "",
    qty: 1,
    satuan: "PCS",
    panjang: 0,
    lebar: 0,
    harga: 0,
    disc: 0,
    keterangan: "",
  });
};

const removeItem = (idx: number) => {
  formData.value.items.splice(idx, 1);
  formData.value.items.forEach((it, i) => (it.noUrut = i + 1));
};

const totalNilaiRetur = computed(() => {
  return formData.value.items.reduce((sum, it) => {
    const sub = (it.qty * it.harga) * (1 - (it.disc || 0) / 100);
    return sum + sub;
  }, 0);
});

const fmt = (v: number) => new Intl.NumberFormat("id-ID").format(Math.round(v || 0));
</script>

<template>
  <BaseForm
    :title="isEditMode ? `Ubah Retur Beli MMT (${formData.nomor})` : 'Tambah Retur Beli MMT Baru'"
    menu-id="5506"
    :icon="IconArrowBack"
    :is-loading="isLoading"
    :is-saving="isSaving"
    item-name="Retur Beli MMT"
    desktop-mode
    v-model:show-save-dialog="showSaveDialog"
    v-model:show-cancel-dialog="showCancelDialog"
    v-model:show-close-dialog="showCloseDialog"
    @validate-save="showSaveDialog = true"
    @confirm-save="executeSave"
    @confirm-cancel="executeCancel"
    @confirm-close="executeClose"
  >
    <!-- ── KOLOM KIRI (HEADER, GUDANG & REFERENSI MMT) ── -->
    <template #left-column>
      <div class="desktop-form-section header-section">
        <div class="section-label">Data Header Retur</div>

        <div class="fr">
          <label class="lbl">Nomor Retur</label>
          <input :value="formData.nomor" readonly class="inp ro" style="width: 150px" placeholder="← Auto" />
        </div>

        <div class="fr">
          <label class="lbl">Tanggal Retur</label>
          <input type="date" v-model="formData.tanggal" class="idate" style="width: 150px" />
        </div>

        <div class="fr">
          <label class="lbl">Gudang</label>
          <input v-model="formData.gudangKode" class="inp" style="width: 80px" placeholder="Kode..." />
          <input v-model="formData.gudangNama" class="inp flex-grow-1 ro" readonly />
        </div>

        <div class="fr">
          <label class="lbl">No. Penerimaan</label>
          <input v-model="formData.noPenerimaan" class="inp flex-grow-1" placeholder="Nomor BPB / Penerimaan..." />
        </div>
      </div>

      <div class="desktop-form-section">
        <div class="section-label">Supplier & Keterangan</div>

        <div class="fr">
          <label class="lbl">Kode Sup</label>
          <input v-model="formData.supplierKode" class="inp" style="width: 100px" placeholder="Kode..." />
        </div>

        <div class="fr">
          <label class="lbl">Supplier</label>
          <input v-model="formData.supplierNama" class="inp flex-grow-1" placeholder="Nama Supplier..." />
        </div>

        <div class="fr">
          <label class="lbl">Keterangan</label>
          <textarea v-model="formData.keterangan" class="ta flex-grow-1" rows="3" placeholder="Alasan / catatan retur..."></textarea>
        </div>
      </div>
    </template>

    <!-- ── KOLOM KANAN (GRID ITEM RETUR SESUAI MMT) ── -->
    <template #right-column>
      <div class="desktop-form-section d-flex flex-column h-100 pa-0">
        <div class="tbl-header">
          <span class="tbl-title">Rincian Barang yang Diretur</span>
          <button type="button" class="btn-add" @click="addItem">
            <IconPlus :size="13" class="mr-1" /> Tambah Item
          </button>
        </div>

        <div class="tbl-wrap flex-grow-1" style="min-height: 280px; max-height: calc(100vh - 350px)">
          <table class="gt">
            <thead>
              <tr>
                <th style="width: 35px" class="tc">No</th>
                <th style="width: 120px">Barcode / Rol</th>
                <th style="width: 120px">Kode SKU</th>
                <th>Nama Barang</th>
                <th style="width: 70px" class="tr">Qty</th>
                <th style="width: 65px" class="tc">Sat</th>
                <th style="width: 110px" class="tr">Harga</th>
                <th style="width: 65px" class="tr">Disc %</th>
                <th style="width: 120px" class="tr">Subtotal</th>
                <th>Keterangan</th>
                <th style="width: 35px" class="tc"></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(it, idx) in formData.items" :key="idx">
                <td class="tc">{{ it.noUrut }}</td>
                <td class="p0">
                  <input type="text" v-model="it.barcode" class="ci" placeholder="Barcode..." />
                </td>
                <td class="p0">
                  <input type="text" v-model="it.sku" class="ci" placeholder="SKU..." />
                </td>
                <td class="p0">
                  <input type="text" v-model="it.namaBarang" class="ci" placeholder="Nama Barang..." />
                </td>
                <td class="p0">
                  <input type="number" v-model.number="it.qty" class="ci tr fw" />
                </td>
                <td class="p0">
                  <input type="text" v-model="it.satuan" class="ci tc" />
                </td>
                <td class="p0">
                  <input type="number" v-model.number="it.harga" class="ci tr" />
                </td>
                <td class="p0">
                  <input type="number" v-model.number="it.disc" class="ci tr" />
                </td>
                <td class="tr fw ro">
                  {{ fmt((it.qty * it.harga) * (1 - (it.disc || 0) / 100)) }}
                </td>
                <td class="p0">
                  <input type="text" v-model="it.keterangan" class="ci" placeholder="Ket..." />
                </td>
                <td class="tc p0">
                  <button type="button" class="btn-del" @click="removeItem(idx)">
                    <IconTrash :size="13" />
                  </button>
                </td>
              </tr>
              <tr v-if="formData.items.length === 0">
                <td colspan="11" class="tc py-4 text-grey text-caption">
                  Belum ada item retur. Klik '+ Tambah Item' di atas.
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Footer Total Retur -->
        <div class="summary-footer">
          <div class="sum-item grand">
            <span>Total Nilai Retur:</span>
            <b>Rp {{ fmt(totalNilaiRetur) }}</b>
          </div>
        </div>
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
.lbl { width: 90px; flex-shrink: 0; font-weight: 600; color: #444; font-size: 11px; }
.inp { height: 24px; border: 1px solid #ccc; border-radius: 3px; padding: 0 6px; font-size: 11px; background: white; outline: none; min-width: 0; }
.inp:focus, .idate:focus, .ta:focus { border-color: #1976d2; }
.ro { background: #f5f5f5 !important; color: #555 !important; }
.idate { height: 24px; border: 1px solid #ccc; border-radius: 3px; padding: 0 4px; font-size: 11px; background: white; outline: none; }
.ta { border: 1px solid #ccc; border-radius: 3px; padding: 4px 6px; font-size: 11px; outline: none; font-family: inherit; }
.tc { text-align: center; }
.tr { text-align: right; }
.fw { font-weight: 700; }
.p0 { padding: 0 !important; }

/* Grid Table */
.tbl-header { display: flex; align-items: center; justify-content: space-between; background: #1565c0; color: white; padding: 6px 12px; border-radius: 6px 6px 0 0; }
.tbl-title { font-size: 11px; font-weight: 700; text-transform: uppercase; }
.btn-add { background: rgba(255, 255, 255, 0.2); color: white; border: 1px solid rgba(255, 255, 255, 0.4); padding: 3px 8px; font-size: 11px; font-weight: 600; cursor: pointer; border-radius: 3px; }
.btn-add:hover { background: rgba(255, 255, 255, 0.3); }
.tbl-wrap { overflow: auto; border: 1px solid #ccc; border-top: none; background: white; }
.gt { width: 100%; border-collapse: collapse; font-size: 11px; }
.gt th { background: #f5f5f5; border-bottom: 2px solid #ddd; border-right: 1px solid #e0e0e0; padding: 5px 6px; text-align: left; font-weight: 700; }
.gt td { border-bottom: 1px solid #eee; border-right: 1px solid #f0f0f0; padding: 4px 6px; }
.ci { width: 100%; height: 24px; border: none; outline: none; padding: 0 4px; font-size: 11px; background: transparent; }
.ci:focus { background: #e3f2fd; }
.btn-del { background: transparent; border: none; color: #e53935; cursor: pointer; padding: 2px; }
.btn-del:hover { color: #b71c1c; }

.summary-footer { display: flex; justify-content: flex-end; gap: 16px; padding: 8px 12px; background: #fafafa; border: 1px solid #ccc; border-top: none; border-radius: 0 0 6px 6px; font-size: 11px; }
.sum-item.grand { color: #1565c0; font-size: 12px; }
</style>
