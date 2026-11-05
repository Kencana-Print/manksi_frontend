<script setup lang="ts">
import { ref, computed } from "vue";
import { useRouter } from "vue-router";
import { useToast } from "vue-toastification";
import BaseBrowse from "@/components/BaseBrowse.vue";
import { useBrowse } from "@/composables/useBrowse";
import { IconChecks, IconPrinter, IconFileSpreadsheet } from "@tabler/icons-vue";
import api from "@/services/api";
import { formatTanggal } from "@/utils/dateFormat";
import { exportExcelSingle, type ExcelColumn } from "@/utils/excelExport";

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

const headers = [
  { title: "Nomor Realisasi", key: "Nomor", width: "160px" },
  { title: "Tanggal", key: "Tanggal", width: "120px", align: "center" as const },
  { title: "Kode Gudang", key: "Gudang", width: "110px", align: "center" as const },
  { title: "Nama Gudang", key: "Nama", minWidth: "160px" },
  { title: "Tipe", key: "Tipe", width: "110px", align: "center" as const },
  { title: "Keterangan", key: "Keterangan", minWidth: "220px" },
];

const {
  items,
  isLoading,
  selected,
  canInsert,
  canEdit,
  canDelete,
  canExport,
  fetchData,
} = useBrowse<any>({
  menuId: "5537",
  fetchApi: async () => {
    const res = await api.get("/mmt/bahan-baku-produksi/realisasi-produksi", {
      params: { startDate: startDate.value, endDate: endDate.value },
    });
    return Array.isArray(res.data) ? res.data : (res.data?.data || []);
  },
});

const getItemNomor = (item: any): string => {
  if (!item) return "";
  if (typeof item === "string") return item;
  const raw = item.raw || item;
  return raw.Nomor || raw.nomor || "";
};

const selectedItem = computed(() => {
  if (!selected.value || selected.value.length !== 1) return null;
  return selected.value[0]?.raw || selected.value[0];
});

// --- EXPAND LOGIC (RINCIAN DETAIL REALISASI PRODUKSI) ---
const expanded = ref<any[]>([]);
const detailCache = ref<Record<string, any[]>>({});
const loadingDetails = ref<Record<string, boolean>>({});

const getItemDetails = (item: any): any[] => {
  const raw = item?.raw || item;
  const nomor = getItemNomor(raw);
  if (detailCache.value[nomor] && detailCache.value[nomor].length > 0) {
    return detailCache.value[nomor];
  }
  const details = raw?.Detail || raw?.details || raw?.Details;
  if (Array.isArray(details) && details.length > 0) {
    return details;
  }
  return detailCache.value[nomor] || [];
};

const onUpdateExpanded = async (newExpanded: any[]) => {
  expanded.value = newExpanded;
  for (const it of newExpanded) {
    const raw = it?.raw || it;
    const nomor = getItemNomor(raw);
    if (!nomor) continue;

    // Jika detail sudah ada dari query browse awal
    const existing = raw?.Detail || raw?.details || raw?.Details;
    if (Array.isArray(existing) && existing.length > 0) {
      if (!detailCache.value[nomor] || detailCache.value[nomor].length === 0) {
        detailCache.value = { ...detailCache.value, [nomor]: existing };
      }
      continue;
    }

    if (detailCache.value[nomor] && detailCache.value[nomor].length > 0) {
      continue;
    }

    if (loadingDetails.value[nomor]) continue;

    loadingDetails.value = { ...loadingDetails.value, [nomor]: true };
    try {
      const res = await api.get(
        `/mmt/bahan-baku-produksi/realisasi-produksi/${encodeURIComponent(nomor)}`
      );
      const d = res.data?.data || res.data;
      const details = d?.details || d?.Details || d?.Detail || [];
      detailCache.value = { ...detailCache.value, [nomor]: details };
      if (typeof raw === "object" && raw !== null) {
        raw.Detail = details;
      }
    } catch (err) {
      console.error(`Gagal load detail realisasi ${nomor}:`, err);
      detailCache.value = { ...detailCache.value, [nomor]: [] };
    } finally {
      loadingDetails.value = { ...loadingDetails.value, [nomor]: false };
    }
  }
};

const handleNew = () => {
  router.push(
    "/mmt/bahan-baku-produksi/realisasi-permintaan-produksi/create"
  );
};

const handleEdit = (item: any) => {
  const target = item || selected.value[0];
  const nomor = getItemNomor(target);
  if (!nomor) return;
  router.push(
    `/mmt/bahan-baku-produksi/realisasi-permintaan-produksi/edit/${encodeURIComponent(nomor)}`
  );
};

const handleDelete = async (item: any) => {
  const target = item || selected.value[0];
  const nomor = getItemNomor(target);
  if (!nomor) return;

  if (!confirm(`Hapus data realisasi permintaan produksi nomor ${nomor}?`)) return;
  try {
    await api.delete(
      `/mmt/bahan-baku-produksi/realisasi-produksi/${encodeURIComponent(nomor)}`
    );
    toast.success("Realisasi produksi berhasil dihapus.");
    fetchData();
  } catch (err: any) {
    toast.error(err.response?.data?.message || "Gagal menghapus data.");
  }
};

const handlePrint = (item?: any) => {
  const target = item || selected.value[0];
  const nomor = getItemNomor(target);
  if (!nomor) {
    toast.warning("Silakan pilih data transaksi realisasi terlebih dahulu.");
    return;
  }
  const url = router.resolve({
    path: `/mmt/bahan-baku-produksi/realisasi-permintaan-produksi/print/${encodeURIComponent(nomor)}`,
  }).href;
  window.open(url, "_blank");
};

// --- EXPORT EXCEL KOMPREHENSIF (HEADER & DETAIL SESUAI STANDAR MMT) ---
const isExporting = ref(false);
const handleExportExcel = async () => {
  if (!items.value || items.value.length === 0) {
    toast.warning("Tidak ada data untuk di-export.");
    return;
  }

  isExporting.value = true;
  try {
    const fileName = `Laporan_Realisasi_Produksi_${startDate.value}_sd_${endDate.value}.xlsx`;
    const columns: ExcelColumn[] = [
      { header: "Nomor Realisasi", key: "Nomor", width: 22, align: "center" },
      { header: "Tanggal", key: "Tanggal", width: 14, align: "center" },
      { header: "Kode Gudang", key: "Gudang", width: 14, align: "center" },
      { header: "Nama Gudang", key: "Nama", width: 22 },
      { header: "Tipe", key: "Tipe", width: 12, align: "center" },
      { header: "Keterangan Header", key: "KeteranganHeader", width: 26 },
      { header: "Kode Bahan", key: "Kode", width: 16, align: "center" },
      { header: "Nama Bahan", key: "Nama_Bahan", width: 32 },
      { header: "Barcode", key: "Barcode", width: 18, align: "center" },
      { header: "Panjang (m)", key: "Panjang", width: 13, numFmt: "#,##0.00", align: "right" },
      { header: "Lebar (m)", key: "Lebar", width: 13, numFmt: "#,##0.00", align: "right" },
      { header: "Satuan", key: "Satuan", width: 10, align: "center" },
      { header: "Qty Keluar", key: "Jumlah", width: 14, numFmt: "#,##0.00", align: "right" },
      { header: "Nomor SPK", key: "Nomor_SPK", width: 18, align: "center" },
      { header: "Keterangan Detail", key: "KeteranganDetail", width: 26 },
    ];

    const rows: any[] = [];
    for (const h of items.value) {
      const details = h.Detail || detailCache.value[h.Nomor] || [];
      const tglFormatted = formatTanggal(h.Tanggal) || h.Tanggal || "-";

      if (details.length > 0) {
        details.forEach((dtl: any, idx: number) => {
          rows.push({
            Nomor: idx === 0 ? h.Nomor : "",
            Tanggal: idx === 0 ? tglFormatted : "",
            Gudang: idx === 0 ? (h.Gudang || "-") : "",
            Nama: idx === 0 ? (h.Nama || "-") : "",
            Tipe: idx === 0 ? (h.Tipe || "-") : "",
            KeteranganHeader: idx === 0 ? (h.Keterangan || "-") : "",
            Kode: dtl.Kode || dtl.kode || dtl.sku || "-",
            Nama_Bahan: dtl.Nama_Bahan || dtl.nama || "-",
            Barcode: dtl.Barcode || dtl.barcode || "-",
            Panjang: Number(dtl.Panjang || dtl.panjang || 0),
            Lebar: Number(dtl.Lebar || dtl.lebar || 0),
            Satuan: dtl.Satuan || dtl.satuan || "-",
            Jumlah: Number(dtl.Jumlah || dtl.qty || 0),
            Nomor_SPK: dtl.Nomor_SPK || dtl.spk || "-",
            KeteranganDetail: dtl.Keterangan || dtl.keterangan || "-",
          });
        });
      } else {
        rows.push({
          Nomor: h.Nomor,
          Tanggal: tglFormatted,
          Gudang: h.Gudang || "-",
          Nama: h.Nama || "-",
          Tipe: h.Tipe || "-",
          KeteranganHeader: h.Keterangan || "-",
          Kode: "-",
          Nama_Bahan: "Tidak ada rincian bahan",
          Barcode: "-",
          Panjang: 0,
          Lebar: 0,
          Satuan: "-",
          Jumlah: 0,
          Nomor_SPK: "-",
          KeteranganDetail: "-",
        });
      }
    }

    await exportExcelSingle(
      fileName,
      "Realisasi_Produksi",
      columns,
      rows,
      `LAPORAN REALISASI PRODUKSI (${startDate.value} s/d ${endDate.value})`
    );
    toast.success("Export Excel Realisasi Produksi berhasil.");
  } catch (err: any) {
    toast.error("Gagal export Excel: " + (err.message || err));
  } finally {
    isExporting.value = false;
  }
};
</script>

<template>
  <BaseBrowse
    title="Realisasi Produksi"
    menu-id="5537"
    item-value="Nomor"
    :icon="IconChecks"
    :headers="headers"
    :items="items || []"
    :is-loading="isLoading"
    v-model:selected="selected"
    :show-expand="true"
    :expanded="expanded"
    @update:expanded="onUpdateExpanded"
    :can-insert="canInsert"
    :can-edit="canEdit"
    :can-delete="canDelete"
    :can-export="canExport"
    @refresh="fetchData"
    @add="handleNew"
    @edit="handleEdit"
    @delete="handleDelete"
    @export="handleExportExcel"
  >
    <!-- Header Extra Actions (Sejajar di baris CRUD tombol atas) -->
    <template #extra-actions>
      <v-btn
        size="small"
        color="secondary"
        variant="tonal"
        class="text-none font-weight-medium"
        :disabled="!selectedItem"
        @click="handlePrint(selectedItem)"
      >
        <template #prepend>
          <IconPrinter :size="15" />
        </template>
        Cetak
      </v-btn>
    </template>

    <!-- Filter Bar Kiri (Hanya filter tanggal periode) -->
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

    <template #item.Tanggal="{ item }">
      {{ formatTanggal((item.raw || item).Tanggal) }}
    </template>

    <template #item.Tipe="{ item }">
      <v-chip
        size="x-small"
        :color="(item.raw || item).Tipe === 'OBAT' ? 'purple' : 'info'"
        class="font-weight-bold"
      >
        {{ (item.raw || item).Tipe || 'MMT' }}
      </v-chip>
    </template>

    <!-- Sub-Tabel Expandable Rincian Realisasi Produksi -->
    <template #detail="{ item }">
      <div class="expand-detail-container pa-3">
        <div class="d-flex align-center justify-space-between mb-2">
          <div class="text-caption font-weight-bold text-primary">
            Rincian Bahan Realisasi Produksi: {{ getItemNomor(item) }}
            <span class="text-grey ml-1">({{ (item.raw || item).Nama || (item.raw || item).Gudang }})</span>
          </div>
          <div class="text-caption text-grey-darken-1 font-weight-medium">
            Keterangan: {{ (item.raw || item).Keterangan || "-" }}
          </div>
        </div>

        <div
          v-if="
            loadingDetails[getItemNomor(item)] &&
            getItemDetails(item).length === 0
          "
          class="d-flex align-center py-3 text-caption text-grey"
        >
          <v-progress-circular
            indeterminate
            size="16"
            width="2"
            color="primary"
            class="mr-2"
          />
          Memuat rincian bahan...
        </div>

        <div
          v-else-if="getItemDetails(item).length === 0"
          class="text-caption text-grey py-2"
        >
          Tidak ada rincian bahan pada dokumen realisasi produksi ini.
        </div>

        <v-table
          v-else
          density="compact"
          class="sub-detail-table border rounded"
        >
          <thead>
            <tr>
              <th style="width: 40px" class="text-center">No</th>
              <th style="width: 170px">Barcode Rol</th>
              <th style="width: 130px">Kode Bahan</th>
              <th>Nama Bahan</th>
              <th style="width: 80px" class="text-end font-weight-bold text-primary">
                Qty Keluar
              </th>
              <th style="width: 70px" class="text-center">Satuan</th>
              <th style="width: 90px" class="text-end">Panjang (m)</th>
              <th style="width: 90px" class="text-end">Lebar (m)</th>
              <th style="width: 140px">Nomor SPK</th>
              <th style="min-width: 140px">Keterangan</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(dtl, dIdx) in getItemDetails(item)" :key="dIdx">
              <td class="text-center">{{ dIdx + 1 }}</td>
              <td>
                <span class="barcode-badge">{{ dtl.Barcode || dtl.barcode || '-' }}</span>
              </td>
              <td class="text-grey-darken-2 font-weight-medium">
                {{ dtl.Kode || dtl.kode || dtl.sku || '-' }}
              </td>
              <td class="font-weight-medium">
                {{ dtl.Nama_Bahan || dtl.nama || '-' }}
              </td>
              <td class="text-end font-weight-bold text-primary">
                {{ Number(dtl.Jumlah || dtl.qty || 0).toLocaleString('id-ID') }}
              </td>
              <td class="text-center">{{ dtl.Satuan || dtl.satuan || 'ROLL' }}</td>
              <td class="text-end">
                {{ Number(dtl.Panjang || dtl.panjang || 0) || '-' }}
              </td>
              <td class="text-end">
                {{ Number(dtl.Lebar || dtl.lebar || 0) || '-' }}
              </td>
              <td>{{ dtl.Nomor_SPK || dtl.spk || '-' }}</td>
              <td class="text-caption text-grey-darken-1">
                {{ dtl.Keterangan || dtl.keterangan || '-' }}
              </td>
            </tr>
          </tbody>
        </v-table>
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

/* ── Expand Sub-Table Styling ── */
.expand-detail-container {
  background: #fbfbfb;
  border-left: 3px solid #1976d2;
}
.sub-detail-table {
  background: white;
  font-size: 11px;
}
.sub-detail-table th {
  background: #f0f4f8 !important;
  color: #333 !important;
  font-weight: 700 !important;
  font-size: 11px !important;
  padding: 4px 8px !important;
  border-bottom: 1px solid #dcdcdc !important;
}
.sub-detail-table td {
  font-size: 11px !important;
  padding: 4px 8px !important;
  border-bottom: 1px solid #eee !important;
}
.barcode-badge {
  font-family: monospace;
  font-size: 10px;
  background: #eef2f6;
  padding: 2px 5px;
  border-radius: 3px;
  border: 1px solid #d0d7de;
  color: #1976d2;
  font-weight: 600;
}
</style>
