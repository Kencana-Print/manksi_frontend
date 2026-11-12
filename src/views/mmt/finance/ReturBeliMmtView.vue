<script setup lang="ts">
import { ref } from "vue";
import { useRouter } from "vue-router";
import { useToast } from "vue-toastification";
import BaseBrowse from "@/components/BaseBrowse.vue";
import { useBrowse } from "@/composables/useBrowse";
import { IconArrowBack } from "@tabler/icons-vue";
import api from "@/services/api";
import { formatTanggal } from "@/utils/dateFormat";

const router = useRouter();
const toast = useToast();

const getStartOfMonth = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
};
const getToday = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const startDate = ref(getStartOfMonth());
const endDate = ref(getToday());

// --- HEADERS TABEL UTAMA (SELARAS SISTEM DELPHI MMT) ---
const headers = [
  { title: "Nomor Retur", key: "Nomor", width: "150px" },
  { title: "Tanggal", key: "Tanggal", width: "105px", align: "center" as const },
  { title: "Kode Sup", key: "SupplierKode", width: "100px", align: "center" as const },
  { title: "Supplier", key: "SupplierNama", minWidth: "180px" },
  { title: "Gudang", key: "Gudang", width: "95px", align: "center" as const },
  { title: "No. Penerimaan", key: "NoPenerimaan", width: "150px" },
  { title: "Keterangan", key: "Keterangan", minWidth: "200px" },
];

// --- DETAIL EXPANDED ROW (RINCIAN BAHAN YANG DIRETUR) ---
const expanded = ref<any[]>([]);
const detailCache = ref<Record<string, any[]>>({});
const loadingDetails = ref<Set<string>>(new Set());

const getItemNomor = (item: any): string => {
  if (!item) return "";
  if (typeof item === "string") return item;
  const raw = item.raw || item;
  return raw.Nomor || "";
};

const getItemDetails = (item: any): any[] => {
  const nomor = getItemNomor(item);
  return detailCache.value[nomor] || [];
};

const onUpdateExpanded = (newExpanded: any[]) => {
  expanded.value = newExpanded;
  for (const expItem of newExpanded) {
    const nomor = getItemNomor(expItem);
    if (!nomor) continue;
    if (!detailCache.value[nomor] && !loadingDetails.value.has(nomor)) {
      loadDetail(nomor);
    }
  }
};

const loadDetail = async (nomor: string) => {
  if (detailCache.value[nomor] || loadingDetails.value.has(nomor)) return;
  loadingDetails.value.add(nomor);
  try {
    const res = await api.get(`/mmt/retur-beli/${encodeURIComponent(nomor)}`);
    const d = res.data?.data || res.data || {};
    const list = d.Details || d.details || [];
    detailCache.value = {
      ...detailCache.value,
      [nomor]: Array.isArray(list) ? list : [],
    };
  } catch (err) {
    console.error("Gagal memuat detail item retur beli:", err);
  } finally {
    loadingDetails.value.delete(nomor);
  }
};

const calculateTotalDetailQty = (details: any[]) => {
  if (!Array.isArray(details)) return 0;
  return details.reduce((sum, d) => sum + Number(d.qty || d.retd_qty || 0), 0);
};

// --- USE BROWSE COMPOSABLE (FITUR EXPORT DIHILANGKAN SESUAI INSTRUKSI) ---
const {
  items,
  isLoading,
  selected,
  canInsert,
  canEdit,
  canDelete,
  fetchData,
} = useBrowse<any>({
  menuId: "5506",
  fetchApi: async () => {
    const res = await api.get("/mmt/retur-beli", {
      params: {
        startDate: startDate.value,
        endDate: endDate.value,
      },
    });
    return res.data?.data || (Array.isArray(res.data) ? res.data : []);
  },
});

const handleNew = () => {
  router.push("/mmt/finance/retur-beli/create");
};

const handleEdit = (item?: any) => {
  const row = item?.Nomor
    ? (item.raw || item)
    : (selected.value[0]?.raw || selected.value[0]);
  if (!row?.Nomor) return;
  router.push(`/mmt/finance/retur-beli/edit/${encodeURIComponent(row.Nomor)}`);
};

const handleDelete = async (item?: any) => {
  const row = item?.Nomor
    ? (item.raw || item)
    : (selected.value[0]?.raw || selected.value[0]);
  if (!row?.Nomor) return;
  if (!confirm(`Hapus data Retur Beli nomor ${row.Nomor}?`)) return;
  try {
    await api.delete(`/mmt/retur-beli/${encodeURIComponent(row.Nomor)}`);
    toast.success("Retur Beli berhasil dihapus.");
    fetchData();
  } catch (err: any) {
    toast.error(err.response?.data?.message || "Gagal menghapus data.");
  }
};

const fmtQty = (v: number | string) => {
  if (v === null || v === undefined || v === "") return "0";
  const num = Number(v);
  if (isNaN(num)) return "0";
  return new Intl.NumberFormat("id-ID", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(num);
};

const formatRupiah = (v: number | string) => {
  if (!v || Number(v) === 0) return "-";
  return new Intl.NumberFormat("id-ID", { style: "decimal" }).format(Number(v));
};
</script>

<template>
  <BaseBrowse
    title="Retur Beli MMT"
    menu-id="5506"
    item-value="Nomor"
    :icon="IconArrowBack"
    :headers="headers"
    :items="items || []"
    :is-loading="isLoading"
    v-model:selected="selected"
    :can-insert="canInsert"
    :can-edit="canEdit"
    :can-delete="canDelete"
    :show-expand="true"
    :expanded="expanded"
    @update:expanded="onUpdateExpanded"
    @refresh="fetchData"
    @add="handleNew"
    @edit="handleEdit"
    @delete="handleDelete"
  >
    <!-- FILTER PERIODE TANGGAL -->
    <template #filter-left>
      <div class="filter-group">
        <span class="filter-label">Periode</span>
        <input
          type="date"
          v-model="startDate"
          class="date-inp"
          @change="fetchData"
        />
        <span class="filter-sep">s/d</span>
        <input
          type="date"
          v-model="endDate"
          class="date-inp"
          @change="fetchData"
        />
      </div>
    </template>

    <!-- RENDER KOLOM MASTER TABLE -->
    <template #item.Nomor="{ item }">
      <span class="font-monospace font-weight-bold text-primary">
        {{ (item.raw || item).Nomor }}
      </span>
    </template>

    <template #item.Tanggal="{ item }">
      <span class="font-monospace text-caption">
        {{ formatTanggal((item.raw || item).Tanggal) }}
      </span>
    </template>

    <template #item.SupplierKode="{ item }">
      <span class="font-monospace text-caption">
        {{ (item.raw || item).SupplierKode || "-" }}
      </span>
    </template>

    <template #item.SupplierNama="{ item }">
      <span class="font-weight-medium">
        {{ (item.raw || item).SupplierNama || (item.raw || item).SupplierKode || "-" }}
      </span>
    </template>

    <template #item.Gudang="{ item }">
      <span class="gdg-tag">
        {{ (item.raw || item).Gudang || "-" }}
      </span>
    </template>

    <template #item.NoPenerimaan="{ item }">
      <span class="font-monospace text-caption text-grey-darken-3">
        {{ (item.raw || item).NoPenerimaan || "-" }}
      </span>
    </template>

    <template #item.Keterangan="{ item }">
      <span class="text-caption text-grey-darken-2">
        {{ (item.raw || item).Keterangan || "-" }}
      </span>
    </template>

    <!-- ── DROPDOWN SUB-TABEL RINCIAN BAHAN DIRETUR (SELARAS SISTEM DELPHI MMT) ── -->
    <template #detail="{ item }">
      <div class="expand-detail-container pa-3">
        <div class="d-flex align-center justify-space-between mb-2">
          <div class="d-flex align-center">
            <span class="expand-title font-weight-bold">
              Rincian Bahan Retur (No: {{ (item.raw || item).Nomor }})
            </span>
            <v-chip size="x-small" color="primary" class="ml-2 font-weight-bold">
              {{ getItemDetails(item).length }} Item
            </v-chip>
          </div>
          <span class="text-caption text-grey">
            Penerimaan: {{ (item.raw || item).NoPenerimaan || "-" }} &bull; Supplier: {{ (item.raw || item).SupplierNama || (item.raw || item).SupplierKode }}
          </span>
        </div>

        <div v-if="loadingDetails.has(getItemNomor(item))" class="text-center py-4">
          <v-progress-circular indeterminate size="20" color="primary" />
          <span class="ml-2 text-caption text-grey">Memuat data rincian bahan...</span>
        </div>

        <div v-else-if="getItemDetails(item).length > 0" class="sub-table-wrapper">
          <table class="sub-table">
            <thead>
              <tr>
                <th style="width: 45px" class="text-center">No.</th>
                <th style="width: 140px">Kode Bahan</th>
                <th>Nama Bahan</th>
                <th style="width: 110px" class="text-center">Dimensi (P x L)</th>
                <th style="width: 80px" class="text-center">Satuan</th>
                <th style="width: 100px" class="text-end">Qty Retur</th>
                <th style="width: 120px" class="text-end">Harga</th>
                <th style="width: 200px">Keterangan</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(d, idx) in getItemDetails(item)" :key="idx">
                <td class="text-center text-caption font-monospace">{{ idx + 1 }}</td>
                <td class="font-monospace text-caption font-weight-medium">
                  {{ d.sku || d.brg_kode || "-" }}
                </td>
                <td class="font-weight-medium text-caption">
                  {{ d.namaBarang || d.brg_nama || "-" }}
                </td>
                <td class="text-center text-caption font-monospace">
                  {{ (Number(d.panjang) > 0 || Number(d.lebar) > 0) ? `${d.panjang} x ${d.lebar}` : "-" }}
                </td>
                <td class="text-center text-caption">
                  {{ d.satuan || "PCS" }}
                </td>
                <td class="text-end font-weight-bold font-monospace text-blue-darken-3">
                  {{ fmtQty(d.qty) }}
                </td>
                <td class="text-end font-monospace text-caption">
                  {{ formatRupiah(d.harga) }}
                </td>
                <td class="text-caption text-grey-darken-2">
                  {{ d.keterangan || "-" }}
                </td>
              </tr>
            </tbody>
            <tfoot>
              <tr class="sub-footer-row font-weight-bold">
                <td colspan="5" class="text-end">TOTAL QTY RETUR:</td>
                <td class="text-end font-monospace text-blue-darken-3 total-cell">
                  {{ fmtQty(calculateTotalDetailQty(getItemDetails(item))) }}
                </td>
                <td colspan="2"></td>
              </tr>
            </tfoot>
          </table>
        </div>

        <div v-else class="text-center py-4 text-caption text-grey">
          Data detail bahan tidak ditemukan untuk retur beli ini.
        </div>
      </div>
    </template>
  </BaseBrowse>
</template>

<style scoped>
.filter-group {
  display: flex;
  align-items: center;
  gap: 4px;
}
.filter-label {
  font-size: 11px;
  font-weight: 600;
  color: #555;
  margin-right: 2px;
}
.filter-sep {
  font-size: 11px;
  color: #777;
}
.date-inp {
  height: 26px;
  border: 1px solid #ccc;
  border-radius: 4px;
  padding: 0 4px;
  font-size: 11px;
  background: white;
  color: #212121;
}

/* ── GUDANG TAG ── */
.gdg-tag {
  display: inline-block;
  background-color: #f1f5f9;
  color: #334155;
  font-size: 10px;
  font-weight: 700;
  padding: 1px 6px;
  border-radius: 3px;
  border: 1px solid #cbd5e1;
}

/* ── EXPANDED SUB TABLE (RINCIAN BAHAN DIRETUR) ── */
.expand-detail-container {
  background: #f8fafc;
  border-top: 1px dashed #cbd5e1;
}
.expand-title {
  font-size: 11px;
  color: #1e293b;
  text-transform: uppercase;
}

.sub-table-wrapper {
  overflow-x: auto;
  border: 1px solid #cbd5e1;
  border-radius: 4px;
  background: white;
}

.sub-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 11px;
}
.sub-table th {
  background: #1565c0;
  color: white;
  padding: 5px 8px;
  font-weight: 700;
  text-align: left;
  border-right: 1px solid rgba(255, 255, 255, 0.2);
  white-space: nowrap;
}
.sub-table td {
  padding: 4px 8px;
  border-bottom: 1px solid #f1f5f9;
  border-right: 1px solid #f1f5f9;
  color: #334155;
}
.sub-table tr:hover td {
  background: #f8fafc;
}
.sub-footer-row td {
  background: #f1f5f9;
  border-top: 2px solid #cbd5e1;
  padding: 6px 8px;
}
.total-cell {
  font-size: 12px;
}
</style>
