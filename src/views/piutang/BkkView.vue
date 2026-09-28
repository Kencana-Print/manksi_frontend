<script setup lang="ts">
import { ref, onMounted, watch, computed } from "vue";
import { useRouter } from "vue-router";
import { useToast } from "vue-toastification";
import BaseBrowse from "@/components/BaseBrowse.vue";
import { useBrowse } from "@/composables/useBrowse";
import { bkkService } from "@/services/piutang/bkkService";
import {
  IconReceipt2,
  IconTrash,
  IconPrinter,
  IconFileExport,
} from "@tabler/icons-vue";
import { formatTanggal } from "@/utils/dateFormat";
import { exportExcelSingle, type ExcelColumn } from "@/utils/excelExport";
import api from "@/services/api";

const toast = useToast();
const router = useRouter();
const baseBrowseRef = ref<InstanceType<typeof BaseBrowse> | null>(null);

// --- Filter ---
const getToday = () => {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

const filterState = ref<Record<string, any>>({});
const startDate = ref(getToday());
const endDate = ref(getToday());
const cabang = ref("HO-");
const listCabang = ref<{ kode: string; nama: string }[]>([]);

watch([startDate, endDate, cabang], () => fetchData());

const ALLOWED_CABANG = ["HO-", "P01", "P04"];

const loadCabang = async () => {
  try {
    const res = await api.get("/lookups/cabang-pabrik");
    const items = res.data.data?.items || res.data.data || [];
    listCabang.value = items
      .map((c: any) => ({
        kode: c.pab_kode || c.Kode,
        nama: c.pab_nama || c.Nama,
      }))
      .filter((c: any) => ALLOWED_CABANG.includes(c.kode));
  } catch (e) {
    console.error("Gagal load cabang", e);
  }
};

// --- Cache detail per periode — di-fetch bareng browse, dikelompokkan
// per Nomor di client saat baris di-expand ---
const detailCache = ref<Record<string, any[]>>({});

const {
  items,
  isLoading,
  selected,
  canInsert,
  canEdit,
  canDelete,
  canExport,
  selectedItem,
  fetchData,
} = useBrowse({
  menuId: "953",
  fetchApi: async () => {
    const [resBrowse, resDetail] = await Promise.all([
      bkkService.getBrowse({
        startDate: startDate.value,
        endDate: endDate.value,
        cabang: cabang.value,
      }),
      bkkService.getBrowseDetail({
        startDate: startDate.value,
        endDate: endDate.value,
        cabang: cabang.value,
      }),
    ]);

    const grouped: Record<string, any[]> = {};
    for (const row of resDetail.data.data as any[]) {
      if (!grouped[row.Nomor]) grouped[row.Nomor] = [];
      grouped[row.Nomor].push(row);
    }
    detailCache.value = grouped;

    return resBrowse.data.data;
  },
  immediate: false,
});

onMounted(async () => {
  await loadCabang();
  fetchData();
});

// --- Headers ---
const headers = [
  { title: "Nomor", key: "Nomor", width: "160px", fixed: true },
  { title: "Tanggal", key: "Tanggal", width: "100px", align: "center" },
  { title: "Account", key: "Account", width: "180px" },
  { title: "Penerima", key: "Penerima", width: "180px" },
  { title: "Nota", key: "Nota", width: "130px" },
  { title: "Keterangan", key: "Keterangan", width: "220px" },
  { title: "Nominal", key: "Nominal", width: "130px", align: "end" },
  { title: "Kasbon", key: "Kasbon", width: "120px" },
  { title: "Closed", key: "Closed", width: "90px", align: "center" },
];

const numFmt = (v: any) => (v ? Number(v).toLocaleString("id-ID") : "0");

const summaryFormatters = {
  Keterangan: () => "TOTAL :",
  Nominal: (filteredItems: any[]) =>
    numFmt(
      Math.round(
        filteredItems.reduce((s, r) => s + (Number(r.Nominal) || 0), 0),
      ),
    ),
};

// --- Expand ---
const expandedRows = ref<any[]>([]);
const onUpdateExpanded = (val: any[]) => {
  expandedRows.value = val;
};

// --- Delete ---
const showDeleteDialog = ref(false);
const isDeleting = ref(false);

const openDeleteDialog = () => {
  if (!selectedItem.value) return;
  showDeleteDialog.value = true;
};

const confirmDelete = async () => {
  if (!selectedItem.value) return;
  isDeleting.value = true;
  try {
    await bkkService.deleteData(selectedItem.value.Nomor);
    toast.success("Data berhasil dihapus.");
    showDeleteDialog.value = false;
    fetchData();
  } catch (e: any) {
    toast.error(e.response?.data?.message || "Gagal menghapus data.");
  } finally {
    isDeleting.value = false;
  }
};

// --- Add / Edit / Print ---
const onAdd = () => router.push("/piutang/bkk/create");
const onEdit = (item: any) => {
  router.push(`/piutang/bkk/edit/${encodeURIComponent(item.Nomor)}`);
};
const onPrint = () => {
  if (!selectedItem.value) return;
  window.open(
    `/piutang/bkk/print/${encodeURIComponent(selectedItem.value.Nomor)}`,
    "_blank",
  );
};

// --- Export ---
const isExporting = ref(false);

const onExport = async () => {
  const dataToExport =
    baseBrowseRef.value?.getFilteredItems?.() ?? items.value ?? [];

  if (!dataToExport || dataToExport.length === 0) {
    toast.warning("Tidak ada data untuk diexport.");
    return;
  }

  isExporting.value = true;
  try {
    const columns: ExcelColumn[] = headers.map((h: any) => ({
      header: h.title,
      key: h.key,
      width: h.width ? Math.max(10, Math.round(parseInt(h.width) / 7)) : 16,
      align: h.align ?? "left",
      numFmt: h.key === "Nominal" ? "#,##0" : undefined,
    }));

    const rows = dataToExport.map((it: any) => {
      const row: Record<string, any> = {};
      columns.forEach((c) => {
        let val = it[c.key];
        if (c.key === "Tanggal") val = val ? formatTanggal(val) : "";
        row[c.key] = val ?? "";
      });
      return row;
    });

    const periodeLabel = `Periode: ${formatTanggal(startDate.value)} s/d ${formatTanggal(endDate.value)}`;
    await exportExcelSingle(
      `BKK_${startDate.value}_${endDate.value}.xlsx`,
      "BKK",
      columns,
      rows,
      `Laporan Bukti Kas Keluar (BKK)  |  ${periodeLabel}`,
    );

    toast.success("Berhasil export data.");
  } catch (e) {
    console.error(e);
    toast.error("Terjadi kesalahan saat export.");
  } finally {
    isExporting.value = false;
  }
};

// --- Export Detail — merge browse + detail per periode, header hanya
// tampil di baris pertama tiap grup Nomor ---
const isExportingDetail = ref(false);

const HEADER_COLS_DETAIL = [
  "Nomor",
  "Tanggal",
  "Penerima",
  "Nota",
  "Keterangan",
  "HeaderAccount",
  "Closed",
];

const detailExportColumns: ExcelColumn[] = [
  { header: "Nomor", key: "Nomor", width: 20 },
  { header: "Tanggal", key: "Tanggal", width: 14, align: "center" },
  { header: "Penerima", key: "Penerima", width: 22 },
  { header: "Nota", key: "Nota", width: 16 },
  { header: "Keterangan", key: "Keterangan", width: 26 },
  { header: "Account Header", key: "HeaderAccount", width: 22 },
  { header: "No", key: "No", width: 6, align: "center" },
  { header: "Uraian", key: "Uraian", width: 28 },
  { header: "Account", key: "Account", width: 14 },
  { header: "Nama Account", key: "NamaAccount", width: 22 },
  { header: "Detail CC", key: "DetailCC", width: 18 },
  {
    header: "Nominal",
    key: "Nominal",
    width: 16,
    align: "end",
    numFmt: "#,##0",
  },
  { header: "Closed", key: "Closed", width: 10, align: "center" },
];

const onExportDetail = async () => {
  isExportingDetail.value = true;
  try {
    const [resBrowse, resDetail] = await Promise.all([
      bkkService.getBrowse({
        startDate: startDate.value,
        endDate: endDate.value,
        cabang: cabang.value,
      }),
      bkkService.getBrowseDetail({
        startDate: startDate.value,
        endDate: endDate.value,
        cabang: cabang.value,
      }),
    ]);

    const detailRows = resDetail.data.data as any[];
    if (!detailRows.length) {
      toast.warning("Tidak ada data detail untuk diexport.");
      return;
    }

    const masterMap: Record<string, any> = {};
    for (const m of resBrowse.data.data as any[]) {
      masterMap[m.Nomor] = m;
    }

    const merged = detailRows.map((d) => {
      const m = masterMap[d.Nomor] || {};
      return {
        Nomor: d.Nomor,
        Tanggal: m.Tanggal ? formatTanggal(m.Tanggal) : "",
        Penerima: m.Penerima || "",
        Nota: m.Nota || "",
        Keterangan: m.Keterangan || "",
        HeaderAccount: m.Account || "",
        Closed: m.Closed || "",
        No: d.No,
        Uraian: d.Uraian,
        Account: d.Account,
        NamaAccount: d.NamaAccount,
        DetailCC: d.DetailCC,
        Nominal: Number(d.Nominal) || 0,
      };
    });

    let lastNomor: string | null = null;
    const rows = merged.map((row) => {
      if (row.Nomor === lastNomor) {
        const copy: Record<string, any> = { ...row };
        HEADER_COLS_DETAIL.forEach((c) => (copy[c] = ""));
        return copy;
      }
      lastNomor = row.Nomor;
      return row;
    });

    const periodeLabel = `Periode: ${formatTanggal(startDate.value)} s/d ${formatTanggal(endDate.value)}`;
    await exportExcelSingle(
      `BKK_Detail_${startDate.value}_${endDate.value}.xlsx`,
      "BKK Detail",
      detailExportColumns,
      rows,
      `Laporan Detail Bukti Kas Keluar (BKK)  |  ${periodeLabel}`,
    );

    toast.success("Berhasil export detail data.");
  } catch (e) {
    console.error(e);
    toast.error("Terjadi kesalahan saat export detail.");
  } finally {
    isExportingDetail.value = false;
  }
};
</script>

<template>
  <BaseBrowse
    ref="baseBrowseRef"
    title="Bukti Kas Keluar (BKK)"
    menu-id="953"
    :icon="IconReceipt2"
    :headers="headers"
    :items="items ?? []"
    :is-loading="isLoading"
    v-model:selected="selected"
    v-model:filter-state="filterState"
    :can-insert="canInsert"
    :can-edit="canEdit"
    :can-delete="canDelete"
    :can-export="canExport"
    item-value="Nomor"
    show-expand
    :expanded="expandedRows"
    :summary-columns="['Nominal']"
    :summary-formatters="summaryFormatters"
    @update:expanded="onUpdateExpanded"
    @add="onAdd"
    @edit="onEdit"
    @refresh="fetchData"
    @delete="openDeleteDialog"
    @export="onExport"
  >
    <template #filter-left>
      <div class="f-group">
        <span class="f-label">Periode</span>
        <input type="date" v-model="startDate" class="f-date" />
        <span class="f-sep">s/d</span>
        <input type="date" v-model="endDate" class="f-date" />
      </div>
      <div class="f-divider" />
      <div class="f-group">
        <span class="f-label">Cabang</span>
        <select v-model="cabang" class="f-select">
          <option value="HO-">SEMUA CABANG</option>
          <option v-for="c in listCabang" :key="c.kode" :value="c.kode">
            {{ c.kode }} - {{ c.nama }}
          </option>
        </select>
      </div>
    </template>

    <template #extra-actions="{ selected }">
      <v-btn
        size="small"
        color="grey-darken-3"
        :disabled="selected.length === 0"
        @click="onPrint"
      >
        <template #prepend><IconPrinter :size="15" /></template>Cetak
      </v-btn>
      <v-btn
        size="small"
        color="teal-darken-2"
        :loading="isExportingDetail"
        @click="onExportDetail"
      >
        <template #prepend><IconFileExport :size="15" /></template>Export Detail
      </v-btn>
    </template>

    <template #item.Tanggal="{ item }">
      {{ formatTanggal((item.raw || item).Tanggal) }}
    </template>

    <template #item.Nominal="{ item }">
      {{ numFmt((item.raw || item).Nominal) }}
    </template>

    <template #item.Kasbon="{ item }">
      <span v-if="(item.raw || item).Kasbon" class="bkk-badge badge-blue">
        {{ (item.raw || item).Kasbon }}
      </span>
      <span v-else class="text-grey">-</span>
    </template>

    <template #item.Closed="{ item }">
      <span
        class="bkk-badge"
        :class="
          (item.raw || item).Closed === 'Sudah' ? 'badge-green' : 'badge-grey'
        "
      >
        {{ (item.raw || item).Closed }}
      </span>
    </template>

    <template #detail="{ item }">
      <div class="expand-wrap">
        <div class="expand-title mb-2">
          Detail Jurnal - {{ (item.raw || item).Nomor }}
        </div>
        <table class="detail-table">
          <thead>
            <tr>
              <th width="50">No</th>
              <th>Uraian</th>
              <th width="100">Account</th>
              <th width="180">Nama Account</th>
              <th width="150">Detail CC</th>
              <th width="120" class="tr">Nominal</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="d in detailCache[(item.raw || item).Nomor] || []"
              :key="d.No"
            >
              <td>{{ d.No }}</td>
              <td>{{ d.Uraian }}</td>
              <td>{{ d.Account }}</td>
              <td>{{ d.NamaAccount }}</td>
              <td>{{ d.DetailCC }}</td>
              <td class="tr">{{ numFmt(d.Nominal) }}</td>
            </tr>
            <tr
              v-if="
                !detailCache[(item.raw || item).Nomor] ||
                detailCache[(item.raw || item).Nomor].length === 0
              "
            >
              <td colspan="6" class="text-center text-grey py-4 font-italic">
                Data detail jurnal tidak ditemukan.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>
  </BaseBrowse>

  <v-dialog v-model="showDeleteDialog" max-width="400px" persistent>
    <v-card rounded="lg">
      <v-card-title
        class="bg-error text-white pa-3 text-subtitle-1 d-flex align-center"
      >
        <IconTrash :size="16" color="white" class="mr-2" />
        Konfirmasi Hapus
      </v-card-title>
      <v-card-text class="pa-4 text-body-2">
        Yakin ingin menghapus BKK:
        <div class="font-weight-bold text-primary mt-1">
          {{ selectedItem?.Nomor }}
        </div>
        <div class="text-caption text-grey mt-1">
          {{ selectedItem?.Keterangan }}
        </div>
      </v-card-text>
      <v-card-actions class="pa-3 border-t bg-grey-lighten-4">
        <v-spacer />
        <v-btn
          variant="text"
          :disabled="isDeleting"
          @click="showDeleteDialog = false"
          >Batal</v-btn
        >
        <v-btn
          color="error"
          variant="elevated"
          :loading="isDeleting"
          @click="confirmDelete"
          >Ya, Hapus</v-btn
        >
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.f-group {
  display: flex;
  align-items: center;
  gap: 6px;
}
.f-label {
  font-size: 11px;
  font-weight: 700;
  color: #555;
  white-space: nowrap;
}
.f-date,
.f-select {
  height: 28px;
  border: 1px solid #ccc;
  border-radius: 4px;
  padding: 0 6px;
  font-size: 12px;
  outline: none;
  background: white;
  color: #212121;
}
.f-select {
  cursor: pointer;
  min-width: 150px;
}
.f-divider {
  width: 1px;
  height: 20px;
  background: #ddd;
  margin: 0 8px;
}

.bkk-badge {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 10px;
  font-weight: 700;
}
.badge-grey {
  background: #f5f5f5;
  color: #757575;
}
.badge-blue {
  background: #e3f2fd;
  color: #1565c0;
}
.badge-green {
  background: #e8f5e9;
  color: #2e7d32;
}

.expand-wrap {
  padding: 10px 10px 10px 50px;
  background: #eceff1;
}
.expand-title {
  font-size: 12px;
  font-weight: 700;
  color: #37474f;
}
.detail-table {
  width: 100%;
  border-collapse: collapse;
  background: white;
  border-radius: 4px;
  overflow: hidden;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
}
.detail-table th {
  background: #546e7a;
  color: white;
  text-align: left;
  padding: 6px 10px;
  font-size: 11px;
}
.detail-table td {
  padding: 4px 10px;
  border-bottom: 1px solid #eee;
  font-size: 12px;
}
.tr {
  text-align: right !important;
}
</style>
