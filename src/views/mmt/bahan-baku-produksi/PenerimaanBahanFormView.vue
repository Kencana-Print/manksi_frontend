<script setup lang="ts">
import { ref, computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useToast } from "vue-toastification";
import BaseForm from "@/components/BaseForm.vue";
import { useForm } from "@/composables/useForm";
import {
  IconPackage,
  IconSearch,
  IconPlus,
  IconTrash,
  IconPrinter,
} from "@tabler/icons-vue";
import api from "@/services/api";

import SupplierSearchModal from "@/components/lookups/SupplierSearchModal.vue";
import BahanMmtSearchModal from "@/components/lookups/BahanMmtSearchModal.vue";
import PoPenerimaanBahanSearchModal from "@/components/lookups/PoPenerimaanBahanSearchModal.vue";
import GudangMmtSearchModal from "@/components/lookups/GudangMmtSearchModal.vue";

const route = useRoute();
const router = useRouter();
const toast = useToast();

interface DetailItem {
  no: number;
  kode: string;
  namaBahan: string;
  qtyPO: number;
  sudahTerima: number;
  qtyTerima: number;
  satuan: string;
  panjang: string | number;
  lebar: string | number;
  harga: number;
  keterangan: string;
}

interface PenerimaanForm {
  nomor: string;
  tanggal: string;
  gudangKode: string;
  gudangNama: string;
  noPermintaan: string;
  supplierKode: string;
  supplierNama: string;
  noResi: string;
  keterangan: string;
  items: DetailItem[];
}

const initialData: PenerimaanForm = {
  nomor: "AUTO",
  tanggal: new Date().toISOString().substring(0, 10),
  gudangKode: "WH-16",
  gudangNama: "GUDANG UTAMA MMT",
  noPermintaan: "",
  supplierKode: "",
  supplierNama: "",
  noResi: "",
  keterangan: "",
  items: [
    {
      no: 1,
      kode: "",
      namaBahan: "",
      qtyPO: 0,
      sudahTerima: 0,
      qtyTerima: 1,
      satuan: "ROLL",
      panjang: "",
      lebar: "",
      harga: 0,
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

const showSupplierModal = ref(false);
const showBahanModal = ref(false);
const showPoModal = ref(false);
const showGudangModal = ref(false);
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
} = useForm<PenerimaanForm>({
  menuId: "5533",
  initialData,
  fetchApi: async () => {
    const nomor = route.params.nomor || route.query.nomor;
    if (!nomor) return { ...initialData };

    const res = await api.get(
      `/mmt/bahan-baku-produksi/penerimaan-bahan/${encodeURIComponent(String(nomor))}`
    );
    const data = res.data?.data || res.data;
    if (!data) return { ...initialData };

    const header = data.header || data;
    const details = data.details || data.Detail || data.items || [];

    // Jika ada supplierKode tapi belum ada nama supplier, fetch dari lookups
    let supName = header.Supplier || header.supplier || "";
    const supCode = header.Supplier_Kode || header.SupplierKode || header.supplier_kode || header.rec_sup_kode || "";
    if (supCode && !supName) {
      try {
        const sRes = await api.get("/lookups/supplier", { params: { q: supCode, limit: 1 } });
        const match = sRes.data?.data?.items?.[0];
        if (match) supName = match.Nama || match.nama || "";
      } catch (e) {
        // ignore fallback
      }
    }

    return {
      nomor: header.Nomor || header.nomor || String(nomor),
      tanggal: toDateInputValue(header.Tanggal || header.tanggal) || initialData.tanggal,
      gudangKode: header.Gudang || header.GudangKode || header.gudang_kode || "WH-16",
      gudangNama: header.Nama_Gudang || header.GudangNama || "GUDANG UTAMA MMT",
      noPermintaan: header.No_permintaan || header.NoMinta || header.no_permintaan || header.rec_memo || "",
      supplierKode: supCode,
      supplierNama: supName,
      noResi: header.No_Resi || header.no_resi || header.rec_resi || "",
      keterangan: header.Keterangan || header.KeteranganHeader || header.keterangan || "",
      items: details.map((d: any, idx: number) => ({
        no: idx + 1,
        kode: d.Kode || d.SKU || d.kode || d.recd_brg_kode || "",
        namaBahan: d.Nama_Bahan || d.namaBahan || d.brg_nama || "",
        qtyPO: Number(d.Jumlah_PO ?? d.QTY ?? d.qtyPO ?? d.recd_qty ?? 0),
        sudahTerima: Number(d.sudahTerima ?? d.sudah_terima ?? 0),
        qtyTerima: Number(d.Jumlah_Terima ?? d.QTY_Rec ?? d.qtyTerima ?? d.recd_qty_terima ?? 1),
        satuan: d.Satuan || d.satuan || d.recd_brg_satuan || "ROLL",
        panjang: d.Panjang || d.panjang || "",
        lebar: d.Lebar || d.lebar || "",
        harga: Number(d.Harga ?? d.harga ?? d.recd_harga ?? 0),
        keterangan: d.Keterangan || d.KeteranganItem || d.keterangan || "",
      })),
    };
  },
  submitApi: async (dataToSave) => {
    if (!dataToSave.supplierKode || !dataToSave.supplierKode.trim()) {
      throw new Error("Mohon pilih Supplier terlebih dahulu.");
    }
    if (!dataToSave.gudangKode || !dataToSave.gudangKode.trim()) {
      throw new Error("Mohon pilih Gudang Penerima terlebih dahulu.");
    }

    const validItems = dataToSave.items.filter(
      (it) => it.kode.trim() !== "" && it.qtyTerima > 0
    );
    if (validItems.length === 0) {
      throw new Error("Mohon isi minimal satu item bahan dengan QTY Terima > 0.");
    }

    const payload = {
      header: {
        nomor: dataToSave.nomor,
        tanggal: dataToSave.tanggal,
        supplier_kode: dataToSave.supplierKode,
        gudang_kode: dataToSave.gudangKode,
        no_permintaan: dataToSave.noPermintaan,
        no_resi: dataToSave.noResi,
        keterangan: dataToSave.keterangan,
      },
      details: validItems.map((it) => ({
        kode: it.kode,
        satuan: it.satuan,
        qtyPO: Number(it.qtyPO || 0),
        qtyTerima: Number(it.qtyTerima || 0),
        panjang: Number(it.panjang || 0),
        lebar: Number(it.lebar || 0),
        harga: Number(it.harga || 0),
        keterangan: it.keterangan || "",
      })),
    };

    if (isEditMode.value) {
      await api.put(
        `/mmt/bahan-baku-produksi/penerimaan-bahan/${encodeURIComponent(dataToSave.nomor)}`,
        payload
      );
    } else {
      await api.post("/mmt/bahan-baku-produksi/penerimaan-bahan", payload);
    }
  },
});

const onSelectGudang = (g: { Kode: string; Nama: string }) => {
  formData.value.gudangKode = g.Kode;
  formData.value.gudangNama = g.Nama;
};

const onSelectPo = async (po: any) => {
  if (!po || !po.Nomor) return;
  formData.value.noPermintaan = po.Nomor;
  formData.value.supplierKode = po.Supplier || "";

  try {
    const res = await api.get(
      `/mmt/bahan-baku-produksi/penerimaan-bahan/po/lookup/${encodeURIComponent(po.Nomor)}`
    );
    const poData = res.data?.data;
    if (poData) {
      if (poData.header?.Kode_Supplier) {
        formData.value.supplierKode = poData.header.Kode_Supplier;
        await fetchSupplierName(poData.header.Kode_Supplier);
      }
      if (Array.isArray(poData.details) && poData.details.length > 0) {
        formData.value.items = poData.details.map((d: any, idx: number) => {
          const qtyPO = Number(d.QTY_PO ?? d.jumlah ?? 0);
          const sudahTerima = Number(d.sudah_terima ?? d.qty_terima_po ?? 0);
          const sisaTerima = Math.max(0, qtyPO - sudahTerima);

          return {
            no: idx + 1,
            kode: d.SKU || d.Kode || d.kode || "",
            namaBahan: d.Nama_Bahan || d.nama || "",
            qtyPO,
            sudahTerima,
            qtyTerima: sisaTerima > 0 ? sisaTerima : qtyPO,
            satuan: d.Satuan || d.satuan || "ROLL",
            panjang: Number(d.Panjang ?? d.panjang ?? 0),
            lebar: Number(d.Lebar ?? d.lebar ?? 0),
            harga: Number(d.Harga ?? d.harga ?? 0),
            keterangan: `PO: ${po.Nomor}`,
          };
        });
        toast.info(`Berhasil memuat ${poData.details.length} item dari PO ${po.Nomor}.`);
      }
    }
  } catch (err: any) {
    console.error("Gagal load detail PO:", err);
  }
};

const fetchSupplierName = async (kode: string) => {
  if (!kode) return;
  try {
    const res = await api.get("/lookups/supplier", { params: { q: kode, limit: 1 } });
    const match = res.data?.data?.items?.[0];
    if (match) {
      formData.value.supplierNama = match.Nama || match.nama || "";
    }
  } catch (e) {
    // ignore
  }
};

const onSelectSupplier = (sup: any) => {
  formData.value.supplierKode = sup.Kode;
  formData.value.supplierNama = sup.Nama || sup.nama;
};

const openBahanLookup = (idx: number) => {
  activeRowIndex.value = idx;
  showBahanModal.value = true;
};

const onSelectBahan = (b: any) => {
  if (activeRowIndex.value !== null && formData.value.items[activeRowIndex.value]) {
    const row = formData.value.items[activeRowIndex.value];
    row.kode = b.Kode || b.brg_kode || "";
    row.namaBahan = b.Nama || b.brg_nama || "";
    row.satuan = b.Satuan || b.brg_satuan || "ROLL";
    row.panjang = Number(b.Panjang ?? b.brg_panjang ?? 0);
    row.lebar = Number(b.Lebar ?? b.brg_lebar ?? 0);
  }
};

const addItem = () => {
  formData.value.items.push({
    no: formData.value.items.length + 1,
    kode: "",
    namaBahan: "",
    qtyPO: 0,
    sudahTerima: 0,
    qtyTerima: 1,
    satuan: "ROLL",
    panjang: "",
    lebar: "",
    harga: 0,
    keterangan: "",
  });
};

const removeItem = (idx: number) => {
  if (formData.value.items.length <= 1) {
    formData.value.items[0] = {
      no: 1,
      kode: "",
      namaBahan: "",
      qtyPO: 0,
      sudahTerima: 0,
      qtyTerima: 1,
      satuan: "ROLL",
      panjang: "",
      lebar: "",
      harga: 0,
      keterangan: "",
    };
    return;
  }
  formData.value.items.splice(idx, 1);
  formData.value.items.forEach((it, i) => (it.no = i + 1));
};

const handlePrint = () => {
  if (!formData.value.nomor || formData.value.nomor === "AUTO") {
    toast.warning("Simpan formulir penerimaan terlebih dahulu sebelum mencetak.");
    return;
  }
  const url = router.resolve({
    path: `/mmt/bahan-baku-produksi/penerimaan-bahan/print/${encodeURIComponent(
      formData.value.nomor
    )}`,
  }).href;
  window.open(url, "_blank");
};

const totalQtyTerima = computed(() => {
  return formData.value.items.reduce((sum, it) => sum + (Number(it.qtyTerima) || 0), 0);
});
</script>

<template>
  <BaseForm
    :title="
      isEditMode
        ? `Ubah Penerimaan Bahan (${formData.nomor})`
        : 'Tambah Penerimaan Bahan Baru'
    "
    menu-id="5533"
    :icon="IconPackage"
    :is-loading="isLoading"
    :is-saving="isSaving"
    item-name="Penerimaan Bahan"
    desktop-mode
    v-model:show-save-dialog="showSaveDialog"
    v-model:show-cancel-dialog="showCancelDialog"
    v-model:show-close-dialog="showCloseDialog"
    @validate-save="showSaveDialog = true"
    @confirm-save="executeSave"
    @confirm-cancel="executeCancel"
    @confirm-close="executeClose"
  >
    <!-- ── HEADER ACTIONS PREPEND (TOMBOL CETAK SAAT EDIT MODE) ── -->
    <template #header-actions-prepend>
      <v-btn
        v-if="isEditMode"
        size="small"
        variant="tonal"
        color="secondary"
        class="mr-2"
        @click="handlePrint"
      >
        <template #prepend>
          <span class="d-flex align-center">
            <IconPrinter :size="15" :stroke-width="1.7" />
          </span>
        </template>
        Cetak Slip
      </v-btn>
    </template>

    <!-- ── KOLOM KIRI (HEADER & DOKUMEN ASAL) ── -->
    <template #left-column>
      <!-- Section 1: Data Header Penerimaan -->
      <div class="desktop-form-section header-section">
        <div class="section-label">Data Header Penerimaan</div>

        <!-- Nomor Penerimaan -->
        <div class="fr">
          <label class="lbl">Nomor Penerimaan</label>
          <input
            :value="formData.nomor"
            readonly
            class="inp ro fw flex-grow-1"
            placeholder="AUTO"
          />
        </div>

        <!-- Tanggal Penerimaan -->
        <div class="fr">
          <label class="lbl">Tanggal</label>
          <input
            type="date"
            v-model="formData.tanggal"
            class="idate flex-grow-1"
            required
          />
        </div>

        <!-- Gudang Penerima (Lookup GudangMmtSearchModal) -->
        <div class="fr">
          <label class="lbl">Gudang Penerima</label>
          <div class="igrp flex-grow-1">
            <input
              type="text"
              :value="
                formData.gudangKode
                  ? `${formData.gudangKode} - ${formData.gudangNama}`
                  : ''
              "
              class="inp ro fw text-primary"
              readonly
              placeholder="Pilih Gudang (WH)..."
              @click="showGudangModal = true"
            />
            <button
              type="button"
              class="blkp"
              @click="showGudangModal = true"
              title="Pilih Gudang (WH)"
            >
              <IconSearch :size="13" />
            </button>
          </div>
        </div>

        <!-- Nomor PO / Permintaan (Lookup PoPenerimaanBahanSearchModal) -->
        <div class="fr">
          <label class="lbl">Nomor PO / Minta</label>
          <div class="igrp flex-grow-1">
            <input
              type="text"
              v-model="formData.noPermintaan"
              class="inp font-weight-medium"
              placeholder="Pilih Dokumen PO Bahan..."
              @click="showPoModal = true"
            />
            <button
              type="button"
              class="blkp"
              @click="showPoModal = true"
              title="Cari Dokumen PO Bahan"
            >
              <IconSearch :size="13" />
            </button>
          </div>
        </div>
      </div>

      <!-- Section 2: Supplier & Pengiriman -->
      <div class="desktop-form-section">
        <div class="section-label">Informasi Supplier & Pengiriman</div>

        <!-- Supplier (Lookup SupplierSearchModal) -->
        <div class="fr">
          <label class="lbl">Supplier</label>
          <div class="igrp flex-grow-1">
            <input
              type="text"
              :value="
                formData.supplierNama
                  ? `${formData.supplierKode} - ${formData.supplierNama}`
                  : formData.supplierKode
              "
              readonly
              class="inp"
              placeholder="Pilih Supplier..."
              @click="showSupplierModal = true"
            />
            <button
              type="button"
              class="blkp"
              @click="showSupplierModal = true"
              title="Cari Supplier"
            >
              <IconSearch :size="13" />
            </button>
          </div>
        </div>

        <!-- Nomor Resi -->
        <div class="fr">
          <label class="lbl">Nomor Resi</label>
          <input
            type="text"
            v-model="formData.noResi"
            class="inp flex-grow-1"
            placeholder="No. Resi pengiriman supplier..."
          />
        </div>

        <!-- Keterangan -->
        <div class="fr align-start">
          <label class="lbl" style="padding-top: 4px">Keterangan</label>
          <textarea
            v-model="formData.keterangan"
            class="ta flex-grow-1"
            rows="3"
            placeholder="Catatan penerimaan barang..."
          ></textarea>
        </div>
      </div>
    </template>

    <!-- ── KOLOM KANAN (GRID TABEL RINCIAN BAHAN DITERIMA) ── -->
    <template #right-column>
      <div class="desktop-form-section d-flex flex-column h-100 pa-0">
        <!-- Table Header Bar -->
        <div class="tbl-header">
          <span class="tbl-title">Rincian Bahan yang Diterima</span>
          <button type="button" class="btn-add" @click="addItem">
            <IconPlus :size="13" class="mr-1" /> Tambah Baris
          </button>
        </div>

        <!-- Table Scroll Container -->
        <div
          class="tbl-wrap flex-grow-1"
          style="min-height: 280px; max-height: calc(100vh - 310px)"
        >
          <table class="gt">
            <thead>
              <tr>
                <th style="width: 35px" class="tc">No</th>
                <th style="width: 140px">Kode Bahan</th>
                <th style="min-width: 180px">Nama Bahan</th>
                <th style="width: 75px" class="tr">Qty PO</th>
                <th style="width: 85px" class="tr">Sdh Terima</th>
                <th style="width: 90px" class="tr">Qty Terima</th>
                <th style="width: 65px" class="tc">P (m)</th>
                <th style="width: 65px" class="tc">L (m)</th>
                <th style="width: 70px" class="tc">Satuan</th>
                <th style="min-width: 140px">Keterangan</th>
                <th style="width: 35px" class="tc"></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(it, idx) in formData.items" :key="idx">
                <!-- No -->
                <td class="tc">{{ idx + 1 }}</td>

                <!-- Kode Bahan -->
                <td class="p0">
                  <div
                    class="igrp w-100"
                    style="border: none; height: 100%"
                  >
                    <input
                      type="text"
                      v-model="it.kode"
                      class="ci fw text-primary"
                      placeholder="Cari..."
                      @click="openBahanLookup(idx)"
                    />
                    <button
                      type="button"
                      class="blkp"
                      @click="openBahanLookup(idx)"
                      title="Cari Bahan MMT"
                    >
                      <IconSearch :size="13" />
                    </button>
                  </div>
                </td>

                <!-- Nama Bahan (Readonly) -->
                <td class="p0">
                  <input
                    type="text"
                    v-model="it.namaBahan"
                    class="ci ro fw"
                    readonly
                    placeholder="Nama Bahan..."
                  />
                </td>

                <!-- Qty PO -->
                <td class="tr text-grey-darken-1 p0" style="padding: 0 6px !important">
                  {{ it.qtyPO || 0 }}
                </td>

                <!-- Sudah Terima -->
                <td class="tr text-grey-darken-1 p0" style="padding: 0 6px !important">
                  {{ it.sudahTerima || 0 }}
                </td>

                <!-- Qty Terima Sekarang -->
                <td class="p0">
                  <input
                    type="number"
                    v-model.number="it.qtyTerima"
                    min="0.01"
                    step="any"
                    class="ci tr fw"
                  />
                </td>

                <!-- Panjang (m) -->
                <td class="p0">
                  <input
                    type="number"
                    v-model.number="it.panjang"
                    step="any"
                    class="ci tc"
                    placeholder="0"
                  />
                </td>

                <!-- Lebar (m) -->
                <td class="p0">
                  <input
                    type="number"
                    v-model.number="it.lebar"
                    step="any"
                    class="ci tc"
                    placeholder="0"
                  />
                </td>

                <!-- Satuan -->
                <td class="p0">
                  <input
                    type="text"
                    v-model="it.satuan"
                    class="ci tc"
                    placeholder="ROLL"
                  />
                </td>

                <!-- Keterangan Item -->
                <td class="p0">
                  <input
                    type="text"
                    v-model="it.keterangan"
                    class="ci"
                    placeholder="Keterangan..."
                  />
                </td>

                <!-- Aksi Hapus -->
                <td class="tc p0">
                  <button
                    type="button"
                    class="btn-del"
                    @click="removeItem(idx)"
                    title="Hapus baris"
                  >
                    <IconTrash :size="15" />
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Summary Footer -->
        <div class="summary-footer">
          <div class="sum-item">
            <span>Jumlah Baris:</span>
            <strong>{{ formData.items.length }} Item</strong>
          </div>
          <div class="sum-item grand fw">
            <span>Total QTY Terima:</span>
            <span>{{ totalQtyTerima.toLocaleString("id-ID") }}</span>
          </div>
        </div>
      </div>
    </template>
  </BaseForm>

  <!-- Modals Lookup -->
  <GudangMmtSearchModal
    v-model="showGudangModal"
    @selected="onSelectGudang"
  />
  <PoPenerimaanBahanSearchModal
    v-model="showPoModal"
    @selected="onSelectPo"
  />
  <SupplierSearchModal
    v-model="showSupplierModal"
    @selected="onSelectSupplier"
  />
  <BahanMmtSearchModal
    v-model="showBahanModal"
    @selected="onSelectBahan"
  />
</template>

<style scoped>
:deep(.form-grid-container.two-column) {
  --left-col-width: 330px;
}
@media (max-width: 1400px) {
  :deep(.form-grid-container.two-column) {
    --left-col-width: 300px;
  }
}

/* ── Form Section Standar Manksi ── */
.desktop-form-section {
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  padding: 12px;
  margin-bottom: 10px;
  font-family: "Segoe UI", system-ui, sans-serif;
  font-size: 11px;
}
.header-section {
  padding-right: 32px; /* Ruang aman agar tombol collapse panel kiri tidak menimpa judul */
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
.fr {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
  min-height: 26px;
}
.lbl {
  width: 95px;
  flex-shrink: 0;
  font-weight: 600;
  color: #444;
  font-size: 11px;
}
.inp {
  height: 24px;
  border: 1px solid #ccc;
  border-radius: 3px;
  padding: 0 6px;
  font-size: 11px;
  background: white;
  outline: none;
  min-width: 0;
  box-sizing: border-box;
}
.inp:focus,
.idate:focus,
.ta:focus {
  border-color: #1976d2;
}
.ro {
  background: #f5f5f5 !important;
  color: #555 !important;
}
.fw {
  font-weight: 700;
}
.idate {
  height: 24px;
  border: 1px solid #ccc;
  border-radius: 3px;
  padding: 0 4px;
  font-size: 11px;
  background: white;
  outline: none;
  min-width: 0;
  box-sizing: border-box;
}
.ta {
  border: 1px solid #ccc;
  border-radius: 3px;
  padding: 4px 6px;
  font-size: 11px;
  outline: none;
  font-family: inherit;
  min-width: 0;
  box-sizing: border-box;
}
.tc {
  text-align: center;
}
.tr {
  text-align: right;
}
.p0 {
  padding: 0 !important;
}
.w-100 {
  width: 100%;
}

/* ── Input Group Lookup ── */
.igrp {
  display: flex;
  align-items: center;
  border: 1px solid #ccc;
  border-radius: 3px;
  background: white;
  height: 24px;
  overflow: hidden;
  min-width: 0;
  box-sizing: border-box;
}
.igrp .inp,
.igrp .ci {
  border: none;
  border-radius: 0;
  flex: 1;
}
.blkp {
  background: #f0f0f0;
  border: none;
  border-left: 1px solid #ccc;
  height: 100%;
  padding: 0 6px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #555;
}
.blkp:hover {
  background: #e0e0e0;
  color: #1565c0;
}

/* ── Grid Table Kanan ── */
.tbl-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #1565c0;
  color: white;
  padding: 6px 12px;
  border-radius: 6px 6px 0 0;
}
.tbl-title {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
}
.btn-add {
  background: rgba(255, 255, 255, 0.2);
  color: white;
  border: 1px solid rgba(255, 255, 255, 0.4);
  padding: 3px 8px;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  border-radius: 3px;
  display: flex;
  align-items: center;
}
.btn-add:hover {
  background: rgba(255, 255, 255, 0.3);
}
.tbl-wrap {
  overflow: auto;
  border: 1px solid #ccc;
  border-top: none;
  background: white;
}
.gt {
  width: 100%;
  border-collapse: collapse;
  font-size: 11px;
}
.gt th {
  background: #f5f5f5;
  border-bottom: 2px solid #ddd;
  border-right: 1px solid #e0e0e0;
  padding: 5px 6px;
  text-align: left;
  font-weight: 700;
  white-space: nowrap;
}
.gt td {
  border-bottom: 1px solid #eee;
  border-right: 1px solid #f0f0f0;
  padding: 4px 6px;
  vertical-align: middle;
}
.ci {
  width: 100%;
  height: 24px;
  border: none;
  outline: none;
  padding: 0 4px;
  font-size: 11px;
  background: transparent;
}
.ci:focus {
  background: #e3f2fd;
}
.btn-del {
  background: transparent;
  border: none;
  color: #e53935;
  cursor: pointer;
  padding: 2px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto;
}
.btn-del:hover {
  color: #b71c1c;
}

/* ── Summary Footer ── */
.summary-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background: #fafafa;
  border: 1px solid #ccc;
  border-top: none;
  border-radius: 0 0 6px 6px;
  font-size: 11px;
}
.sum-item {
  display: flex;
  align-items: center;
  gap: 6px;
}
.sum-item.grand {
  color: #1565c0;
  font-size: 12px;
}
</style>
