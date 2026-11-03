<script setup lang="ts">
import { ref, computed } from "vue";
import { useRouter } from "vue-router";
import { useToast } from "vue-toastification";
import BaseBrowse from "@/components/BaseBrowse.vue";
import { useBrowse } from "@/composables/useBrowse";
import {
  IconPackageImport,
  IconPrinter,
  IconRoute,
  IconFileSpreadsheet,
  IconDownload,
  IconX,
  IconCheck,
  IconClock,
  IconFileText,
  IconShoppingCart,
  IconPackage,
  IconDotsVertical,
  IconFileExport,
} from "@tabler/icons-vue";
import api from "@/services/api";
import { formatTanggal } from "@/utils/dateFormat";
import { exportExcelSingle, type ExcelColumn } from "@/utils/excelExport";

const router = useRouter();
const toast = useToast();

const getThirtyDaysAgo = () => {
  const d = new Date();
  d.setDate(d.getDate() - 30);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const getToday = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const startDate = ref(getThirtyDaysAgo());
const endDate = ref(getToday());

const headers = [
  { title: "Nomor", key: "Nomor", width: "160px" },
  { title: "Tanggal", key: "Tanggal", width: "110px", align: "center" as const },
  { title: "Gudang", key: "Gudang", width: "100px", align: "center" as const },
  { title: "Nama Gudang", key: "Nama", minWidth: "160px" },
  { title: "Status PO", key: "Status_PO", width: "120px", align: "center" as const },
  { title: "Status Terima", key: "Status_Diterima", width: "120px", align: "center" as const },
  { title: "Status ACC", key: "Status_Acc", width: "120px", align: "center" as const },
  { title: "Total Diminta", key: "Total_Diminta", width: "110px", align: "end" as const },
  { title: "Total di PO", key: "Total_DiPO", width: "110px", align: "end" as const },
  { title: "Total Terima", key: "Total_Diterima", width: "110px", align: "end" as const },
  { title: "Keterangan", key: "Keterangan", minWidth: "200px" },
];

const {
  items,
  isLoading,
  selected,
  canInsert,
  canEdit,
  canDelete,
  fetchData,
} = useBrowse<any>({
  menuId: "5532",
  fetchApi: async () => {
    const res = await api.get("/mmt/bahan-baku-produksi/permintaan-bahan", {
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

// --- EXPAND LOGIC (RINCIAN DETAIL BAHAN) ---
const expanded = ref<any[]>([]);
const detailCache = ref<Record<string, any[]>>({});
const loadingDetails = ref<Record<string, boolean>>({});

const getItemDetails = (item: any): any[] => {
  const raw = item?.raw || item;
  const nomor = getItemNomor(raw);
  if (detailCache.value[nomor] && detailCache.value[nomor].length > 0) {
    return detailCache.value[nomor];
  }
  if (Array.isArray(raw?.Detail) && raw.Detail.length > 0) {
    return raw.Detail;
  }
  return detailCache.value[nomor] || [];
};

const onUpdateExpanded = async (newExpanded: any[]) => {
  expanded.value = newExpanded;
  for (const it of newExpanded) {
    const raw = it?.raw || it;
    const nomor = getItemNomor(raw);
    if (!nomor) continue;

    // Jika detail lengkap sudah pernah di-fetch, tidak perlu fetch lagi
    if (detailCache.value[nomor] && detailCache.value[nomor].length > 0) {
      continue;
    }

    if (loadingDetails.value[nomor]) continue;

    loadingDetails.value = { ...loadingDetails.value, [nomor]: true };
    try {
      const res = await api.get(
        `/mmt/bahan-baku-produksi/permintaan-bahan/${encodeURIComponent(nomor)}`
      );
      const d = res.data?.data || res.data;
      const details = d?.Detail || d?.details || [];
      detailCache.value = { ...detailCache.value, [nomor]: details };
      if (typeof raw === "object" && raw !== null) {
        raw.Detail = details;
      }
    } catch (err) {
      console.error(`Gagal load detail PR ${nomor}:`, err);
      if (Array.isArray(raw?.Detail) && raw.Detail.length > 0) {
        detailCache.value = { ...detailCache.value, [nomor]: raw.Detail };
      } else {
        detailCache.value = { ...detailCache.value, [nomor]: [] };
      }
    } finally {
      loadingDetails.value = { ...loadingDetails.value, [nomor]: false };
    }
  }
};

const selectedItem = computed(() => {
  if (!selected.value || selected.value.length !== 1) return null;
  return selected.value[0]?.raw || selected.value[0];
});

const handleNew = () => {
  router.push("/mmt/bahan-baku-produksi/purchase-request/create");
};

const handleEdit = (item: any) => {
  const target = item || selected.value[0];
  const nomor = getItemNomor(target);
  if (!nomor) return;
  router.push(
    `/mmt/bahan-baku-produksi/purchase-request/edit/${encodeURIComponent(nomor)}`
  );
};

const handleDelete = async (item: any) => {
  const target = item || selected.value[0];
  const nomor = getItemNomor(target);
  if (!nomor) return;

  const raw = target?.raw || target;
  if (raw?.Status_PO === "CLOSED" || raw?.Status_Diterima === "CLOSED") {
    toast.warning("Permintaan sudah diproses PO/Penerimaan dan tidak dapat dihapus.");
    return;
  }

  if (!confirm(`Hapus data permintaan bahan nomor ${nomor}?`)) return;
  try {
    await api.delete(
      `/mmt/bahan-baku-produksi/permintaan-bahan/${encodeURIComponent(nomor)}`
    );
    toast.success("Permintaan bahan berhasil dihapus.");
    fetchData();
  } catch (err: any) {
    toast.error(err.response?.data?.message || "Gagal menghapus data.");
  }
};

// ==========================================
// 1. CETAK DOKUMEN PURCHASE REQUEST
// ==========================================
const handlePrint = (item?: any) => {
  const target = item || selectedItem.value;
  const nomor = getItemNomor(target);
  if (!nomor) {
    toast.warning("Pilih salah satu transaksi terlebih dahulu.");
    return;
  }
  const url = router.resolve({
    path: `/mmt/bahan-baku-produksi/purchase-request/print/${encodeURIComponent(nomor)}`,
  }).href;
  window.open(url, "_blank");
};

// ==========================================
// 2. LACAK PROSES (TIMELINE TRACKING)
// ==========================================
const showTrackingDialog = ref(false);
const trackingItem = ref<any>(null);

// Status Color Helper Sesuai Sistem MMT
const getStatusColor = (status: string) => {
  if (!status) return "default";
  const s = String(status).toUpperCase();
  switch (s) {
    case "OPEN":
      return "success";
    case "ONPROSES":
    case "PENDING":
      return "warning";
    case "CLOSE":
    case "CLOSED":
    case "SELESAI":
      return "grey";
    case "VOID":
    case "CANCEL":
    case "TOLAK":
      return "error";
    default:
      return "info";
  }
};

const getAccStatusColor = (status: string) => {
  if (!status) return "default";
  const s = String(status).toUpperCase();
  if (
    s.includes("ACC MANAGER") ||
    s === "ACC" ||
    s === "Y" ||
    s.includes("SETUJU")
  ) {
    return "success";
  }
  if (s.includes("ACC SPV")) return "info";
  if (s.includes("PENDING") || s.includes("WAIT") || s.includes("BELUM")) {
    return "warning";
  }
  if (s.includes("TOLAK") || s.includes("REJECT") || s === "N") return "error";
  return "grey";
};

const openTracking = (item?: any) => {
  const target = item || selectedItem.value;
  if (!target) {
    toast.warning("Pilih salah satu transaksi untuk melacak proses.");
    return;
  }
  trackingItem.value = target;
  showTrackingDialog.value = true;
};

const isStepAccDone = computed(() => {
  const acc = trackingItem.value?.Status_Acc;
  if (!acc) return false;
  return (
    acc.toUpperCase().includes("ACC") ||
    acc.toUpperCase() === "Y" ||
    acc.toUpperCase().includes("SETUJU")
  );
});

const isStepPoDone = computed(() => {
  return trackingItem.value?.Status_PO === "CLOSED";
});

const isStepPoProcess = computed(() => {
  return (
    trackingItem.value?.Status_PO === "ONPROSES" ||
    Number(trackingItem.value?.Total_DiPO || 0) > 0
  );
});

const isStepTerimaDone = computed(() => {
  return (
    trackingItem.value?.Status_Diterima === "CLOSED" ||
    trackingItem.value?.Status_Diterima === "SELESAI"
  );
});

const isStepTerimaProcess = computed(() => {
  return (
    trackingItem.value?.Status_Diterima === "ONPROSES" ||
    Number(trackingItem.value?.Total_Diterima || 0) > 0
  );
});

// ==========================================
// 3. EXPORT HEADER EXCEL
// ==========================================
const handleExportHeaderExcel = async () => {
  if (!items.value || items.value.length === 0) {
    toast.warning("Tidak ada data untuk di-export.");
    return;
  }

  try {
    const fileName = `Laporan_Header_Purchase_Request_${startDate.value}_to_${endDate.value}`;
    const columns: ExcelColumn[] = [
      { header: "Nomor Permintaan", key: "Nomor", width: 22, align: "center" },
      { header: "Tanggal", key: "Tanggal", width: 14, align: "center" },
      { header: "Gudang", key: "Gudang", width: 12, align: "center" },
      { header: "Nama Gudang", key: "Nama", width: 24 },
      { header: "Estimasi Datang", key: "Estimasi_Kedatangan", width: 16, align: "center" },
      { header: "Tanggal Datang Real", key: "Tanggal_Datang", width: 18, align: "center" },
      { header: "Status PO", key: "Status_PO", width: 14, align: "center" },
      { header: "Status Terima", key: "Status_Diterima", width: 14, align: "center" },
      { header: "Status ACC", key: "Status_Acc", width: 14, align: "center" },
      { header: "Total Diminta", key: "Total_Diminta", width: 14, numFmt: "#,##0.00", align: "right" },
      { header: "Total Di PO", key: "Total_DiPO", width: 14, numFmt: "#,##0.00", align: "right" },
      { header: "Total Diterima", key: "Total_Diterima", width: 14, numFmt: "#,##0.00", align: "right" },
      { header: "Keterangan", key: "Keterangan", width: 30 },
    ];

    const rows = items.value.map((h: any) => ({
      Nomor: h.Nomor || "-",
      Tanggal: h.Tanggal || "-",
      Gudang: h.Gudang || "-",
      Nama: h.Nama || "-",
      Estimasi_Kedatangan: h.Estimasi_Kedatangan || "-",
      Tanggal_Datang: h.Tanggal_Datang || "-",
      Status_PO: h.Status_PO || "-",
      Status_Diterima: h.Status_Diterima || "-",
      Status_Acc: h.Status_Acc || "-",
      Total_Diminta: Number(h.Total_Diminta || 0),
      Total_DiPO: Number(h.Total_DiPO || 0),
      Total_Diterima: Number(h.Total_Diterima || 0),
      Keterangan: h.Keterangan || "-",
    }));

    await exportExcelSingle(
      `${fileName}.xlsx`,
      "HeaderPR",
      columns,
      rows,
      `LAPORAN RINGKASAN (HEADER) PURCHASE REQUEST (${startDate.value} s/d ${endDate.value})`
    );
    toast.success("Export Header Excel berhasil.");
  } catch (err: any) {
    toast.error("Gagal export header Excel: " + (err.message || err));
  }
};

// ==========================================
// 4. EXPORT DETAIL EXCEL
// ==========================================
const handleExportDetailExcel = async () => {
  if (!items.value || items.value.length === 0) {
    toast.warning("Tidak ada data untuk di-export.");
    return;
  }

  try {
    const fileName = `Laporan_Detail_Purchase_Request_${startDate.value}_to_${endDate.value}`;
    const columns: ExcelColumn[] = [
      { header: "Nomor Permintaan", key: "Nomor", width: 22, align: "center" },
      { header: "Tanggal", key: "Tanggal", width: 14, align: "center" },
      { header: "Gudang", key: "Gudang", width: 12, align: "center" },
      { header: "Estimasi Datang", key: "Estimasi_Kedatangan", width: 16, align: "center" },
      { header: "Tanggal Datang", key: "Tanggal_Datang", width: 16, align: "center" },
      { header: "Status PO", key: "Status_PO", width: 14, align: "center" },
      { header: "Status Terima", key: "Status_Diterima", width: 14, align: "center" },
      { header: "Status ACC", key: "Status_Acc", width: 14, align: "center" },
      { header: "Kode Bahan", key: "Kode", width: 16, align: "center" },
      { header: "Nama Bahan", key: "Nama_Bahan", width: 32 },
      { header: "Ukuran (PxL)", key: "Ukuran", width: 14, align: "center" },
      { header: "Jml Diminta", key: "Jumlah", width: 14, numFmt: "#,##0.00", align: "right" },
      { header: "Jml Diterima", key: "Total_Diterima", width: 14, numFmt: "#,##0.00", align: "right" },
      { header: "Satuan", key: "Satuan", width: 10, align: "center" },
      { header: "Keterangan", key: "Keterangan", width: 28 },
    ];

    const rows: any[] = [];
    items.value.forEach((header: any) => {
      const details = header.Detail || [];
      if (details.length > 0) {
        details.forEach((dtl: any) => {
          rows.push({
            Nomor: header.Nomor,
            Tanggal: header.Tanggal || "-",
            Gudang: header.Gudang || "-",
            Estimasi_Kedatangan: header.Estimasi_Kedatangan || "-",
            Tanggal_Datang: header.Tanggal_Datang || "-",
            Status_PO: header.Status_PO || "-",
            Status_Diterima: header.Status_Diterima || "-",
            Status_Acc: header.Status_Acc || "-",
            Kode: dtl.Kode || "-",
            Nama_Bahan: dtl.Nama_Bahan || "-",
            Ukuran: dtl.Panjang && dtl.Lebar ? `${dtl.Panjang} x ${dtl.Lebar}` : "-",
            Jumlah: Number(dtl.Jumlah || 0),
            Total_Diterima: Number(dtl.Total_Diterima || 0),
            Satuan: dtl.Satuan || "-",
            Keterangan: dtl.Keterangan || header.Keterangan || "-",
          });
        });
      } else {
        rows.push({
          Nomor: header.Nomor,
          Tanggal: header.Tanggal || "-",
          Gudang: header.Gudang || "-",
          Estimasi_Kedatangan: header.Estimasi_Kedatangan || "-",
          Tanggal_Datang: header.Tanggal_Datang || "-",
          Status_PO: header.Status_PO || "-",
          Status_Diterima: header.Status_Diterima || "-",
          Status_Acc: header.Status_Acc || "-",
          Kode: "-",
          Nama_Bahan: "Tidak ada detail bahan",
          Ukuran: "-",
          Jumlah: Number(header.Total_Diminta || 0),
          Total_Diterima: Number(header.Total_Diterima || 0),
          Satuan: "-",
          Keterangan: header.Keterangan || "-",
        });
      }
    });

    await exportExcelSingle(
      `${fileName}.xlsx`,
      "DetailPR",
      columns,
      rows,
      `LAPORAN RINCIAN (DETAIL) PURCHASE REQUEST (${startDate.value} s/d ${endDate.value})`
    );
    toast.success("Export Detail Excel berhasil.");
  } catch (err: any) {
    toast.error("Gagal export detail Excel: " + (err.message || err));
  }
};
</script>

<template>
  <BaseBrowse
    title="Purchase Request (PR)"
    menu-id="5532"
    item-value="Nomor"
    :icon="IconPackageImport"
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
    :can-export="false"
    @refresh="fetchData"
    @add="handleNew"
    @edit="handleEdit"
    @delete="handleDelete"
  >
    <!-- Header Extra Actions (Sejajar dengan Tambah, Ubah, Hapus) -->
    <template #extra-actions>
      <v-btn
        size="small"
        variant="tonal"
        color="indigo"
        class="text-none font-weight-medium"
        :disabled="!selectedItem"
        @click="handlePrint(selectedItem)"
      >
        <template #prepend>
          <IconPrinter :size="15" />
        </template>
        Cetak
      </v-btn>

      <v-btn
        size="small"
        variant="tonal"
        color="purple-darken-1"
        class="text-none font-weight-medium"
        :disabled="!selectedItem"
        @click="openTracking(selectedItem)"
      >
        <template #prepend>
          <IconRoute :size="15" />
        </template>
        Lacak Proses
      </v-btn>

      <v-btn
        size="small"
        variant="tonal"
        color="success"
        class="text-none font-weight-medium"
        :disabled="!items || items.length === 0"
        @click="handleExportHeaderExcel"
      >
        <template #prepend>
          <IconFileSpreadsheet :size="15" />
        </template>
        Export Header
      </v-btn>

      <v-btn
        size="small"
        variant="tonal"
        color="deep-purple-darken-1"
        class="text-none font-weight-medium"
        :disabled="!items || items.length === 0"
        @click="handleExportDetailExcel"
      >
        <template #prepend>
          <IconDownload :size="15" />
        </template>
        Export Detail
      </v-btn>
    </template>

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

    <!-- Status PO Chip (Warna Sesuai Sistem MMT) -->
    <template #item.Status_PO="{ item }">
      <v-chip
        :color="getStatusColor((item.raw || item).Status_PO)"
        size="x-small"
        variant="tonal"
        label
        class="font-weight-bold"
      >
        {{ (item.raw || item).Status_PO || "-" }}
      </v-chip>
    </template>

    <!-- Status Terima Chip (Warna Sesuai Sistem MMT) -->
    <template #item.Status_Diterima="{ item }">
      <v-chip
        :color="getStatusColor((item.raw || item).Status_Diterima)"
        size="x-small"
        variant="tonal"
        class="font-weight-bold"
      >
        {{ (item.raw || item).Status_Diterima || "-" }}
      </v-chip>
    </template>

    <!-- Status ACC Chip (Warna Sesuai Sistem MMT) -->
    <template #item.Status_Acc="{ item }">
      <v-chip
        :color="getAccStatusColor((item.raw || item).Status_Acc)"
        size="x-small"
        class="font-weight-bold text-white"
        variant="flat"
      >
        {{ (item.raw || item).Status_Acc || "-" }}
      </v-chip>
    </template>

    <!-- Total Diminta Format -->
    <template #item.Total_Diminta="{ item }">
      {{ Number((item.raw || item).Total_Diminta || 0).toLocaleString("id-ID") }}
    </template>

    <!-- Total di PO Format -->
    <template #item.Total_DiPO="{ item }">
      {{ Number((item.raw || item).Total_DiPO || 0).toLocaleString("id-ID") }}
    </template>

    <!-- Total Terima Format -->
    <template #item.Total_Diterima="{ item }">
      {{ Number((item.raw || item).Total_Diterima || 0).toLocaleString("id-ID") }}
    </template>

    <!-- Sub-Tabel Expandable Rincian Item Permintaan (Sesuai Referensi MMT) -->
    <template #detail="{ item }">
      <div class="expand-detail-container pa-3">
        <div class="d-flex align-center justify-space-between mb-2">
          <div class="text-caption font-weight-bold text-indigo">
            Rincian Item Bahan untuk PR: {{ getItemNomor(item) }}
          </div>
          <div class="text-caption text-grey-darken-1">
            Status PO: <strong>{{ (item.raw || item).Status_PO || "-" }}</strong> &bull; Status Terima: <strong>{{ (item.raw || item).Status_Diterima || "-" }}</strong> &bull; Status ACC: <strong>{{ (item.raw || item).Status_Acc || "-" }}</strong>
          </div>
        </div>

        <div v-if="loadingDetails[getItemNomor(item)] && getItemDetails(item).length === 0" class="text-caption text-grey py-2 d-flex align-center">
          <v-progress-circular indeterminate size="16" class="mr-2" color="primary" />
          Memuat rincian bahan...
        </div>

        <div v-else-if="getItemDetails(item).length === 0" class="text-caption text-grey py-2">
          Tidak ada rincian bahan pada dokumen ini.
        </div>

        <v-table v-else density="compact" class="sub-detail-table border rounded">
          <thead>
            <tr>
              <th style="width: 40px" class="text-center">No</th>
              <th style="width: 130px">Kode Bahan</th>
              <th>Nama Bahan</th>
              <th style="width: 80px" class="text-center">ACC</th>
              <th style="width: 100px" class="text-center">Ukuran</th>
              <th style="width: 90px" class="text-end font-weight-bold text-primary">Jml Diminta</th>
              <th style="width: 90px" class="text-end">Jml di PO</th>
              <th style="width: 90px" class="text-end">Jml Diterima</th>
              <th style="width: 70px" class="text-center">Satuan</th>
              <th style="width: 120px">Nomor PO</th>
              <th style="width: 120px">No. SPK</th>
              <th>Keterangan</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(d, dIdx) in getItemDetails(item)"
              :key="dIdx"
              :class="{ 'row-acc-rejected': d.Is_Acc === 'N' }"
            >
              <td class="text-center">{{ Number(dIdx) + 1 }}</td>
              <td class="font-weight-medium">{{ d.Kode }}</td>
              <td>{{ d.Nama_Bahan }}</td>
              <td class="text-center">
                <v-chip
                  :color="d.Is_Acc === 'Y' ? 'success' : (d.Is_Acc === 'N' ? 'error' : 'grey')"
                  size="x-small"
                  label
                  class="font-weight-bold"
                >
                  {{ d.Is_Acc === "Y" ? "ACC" : (d.Is_Acc === "N" ? "TOLAK" : "-") }}
                </v-chip>
              </td>
              <td class="text-center">{{ d.Panjang && d.Lebar ? `${d.Panjang} x ${d.Lebar}` : '-' }}</td>
              <td class="text-end font-weight-bold text-primary">{{ Number(d.Jumlah || 0).toLocaleString('id-ID') }}</td>
              <td class="text-end">{{ Number(d.Jumlah_PO || 0).toLocaleString('id-ID') }}</td>
              <td class="text-end text-grey-darken-1">{{ Number(d.Total_Diterima || d.Jumlah_Datang || 0).toLocaleString('id-ID') }}</td>
              <td class="text-center">{{ d.Satuan || '-' }}</td>
              <td>{{ d.Nomor_PO || '-' }}</td>
              <td>{{ d.Nomor_SPK || d.spk_nomor || '-' }}</td>
              <td>{{ d.Keterangan || d.KeteranganItem || '-' }}</td>
            </tr>
          </tbody>
        </v-table>
      </div>
    </template>
  </BaseBrowse>

  <!-- Dialog Lacak Proses Permintaan Bahan (Timeline) -->
  <v-dialog v-model="showTrackingDialog" max-width="650">
    <v-card class="rounded-lg">
      <v-card-title class="dialog-header py-3 px-4 border-b d-flex align-center">
        <v-avatar color="purple" variant="tonal" size="36" class="mr-3">
          <IconRoute :size="20" />
        </v-avatar>
        <div>
          <div class="text-subtitle-1 font-weight-bold">
            Lacak Proses Permintaan (PR)
          </div>
          <div class="text-caption text-medium-emphasis">
            Nomor: <strong>{{ trackingItem?.Nomor }}</strong> &bull; Gudang: <strong>{{ trackingItem?.Nama || trackingItem?.Gudang }}</strong>
          </div>
        </div>
        <v-spacer />
        <v-btn icon size="small" variant="text" @click="showTrackingDialog = false">
          <IconX :size="18" />
        </v-btn>
      </v-card-title>

      <v-card-text class="pa-5">
        <v-timeline side="end" density="compact" class="tracking-timeline">
          <!-- Step 1: Input -->
          <v-timeline-item dot-color="primary" size="small">
            <template #icon>
              <IconFileText :size="14" />
            </template>
            <div class="d-flex justify-space-between align-center">
              <strong class="text-subtitle-2">1. Permintaan Dibuat (Input)</strong>
              <v-chip size="x-small" color="primary" class="font-weight-bold">Selesai</v-chip>
            </div>
            <div class="text-caption text-grey-darken-1">
              Tanggal: {{ trackingItem?.Tanggal || '-' }}
            </div>
          </v-timeline-item>

          <!-- Step 2: ACC -->
          <v-timeline-item
            :dot-color="isStepAccDone ? 'success' : 'warning'"
            size="small"
          >
            <template #icon>
              <IconCheck v-if="isStepAccDone" :size="14" />
              <IconClock v-else :size="14" />
            </template>
            <div class="d-flex justify-space-between align-center">
              <strong class="text-subtitle-2">2. Persetujuan (ACC SPV/Manager)</strong>
              <v-chip
                size="x-small"
                :color="isStepAccDone ? 'success' : 'warning'"
                class="font-weight-bold"
              >
                {{ trackingItem?.Status_Acc || 'Pending' }}
              </v-chip>
            </div>
            <div class="text-caption text-grey-darken-1">
              Status: {{ isStepAccDone ? 'Sudah Disetujui' : 'Menunggu Approval' }}
            </div>
          </v-timeline-item>

          <!-- Step 3: PO -->
          <v-timeline-item
            :dot-color="isStepPoDone ? 'success' : (isStepPoProcess ? 'warning' : 'grey-lighten-1')"
            size="small"
          >
            <template #icon>
              <IconShoppingCart :size="14" />
            </template>
            <div class="d-flex justify-space-between align-center">
              <strong class="text-subtitle-2">3. Pesanan Pembelian (PO Bahan)</strong>
              <v-chip
                size="x-small"
                :color="isStepPoDone ? 'success' : (isStepPoProcess ? 'warning' : 'default')"
                class="font-weight-bold"
              >
                {{ trackingItem?.Status_PO || 'OPEN' }}
              </v-chip>
            </div>
            <div class="text-caption text-grey-darken-1">
              Total di PO: <strong>{{ trackingItem?.Total_DiPO || 0 }}</strong> dari {{ trackingItem?.Total_Diminta || 0 }} diminta
            </div>
            <div v-if="trackingItem?.Estimasi_Kedatangan" class="text-caption text-info mt-1 font-weight-medium">
              Estimasi Kedatangan: {{ trackingItem?.Estimasi_Kedatangan }}
            </div>
          </v-timeline-item>

          <!-- Step 4: Penerimaan -->
          <v-timeline-item
            :dot-color="isStepTerimaDone ? 'success' : (isStepTerimaProcess ? 'warning' : 'grey-lighten-1')"
            size="small"
          >
            <template #icon>
              <IconPackage :size="14" />
            </template>
            <div class="d-flex justify-space-between align-center">
              <strong class="text-subtitle-2">4. Penerimaan Bahan di Gudang</strong>
              <v-chip
                size="x-small"
                :color="isStepTerimaDone ? 'success' : (isStepTerimaProcess ? 'warning' : 'default')"
                class="font-weight-bold"
              >
                {{ trackingItem?.Status_Diterima || 'OPEN' }}
              </v-chip>
            </div>
            <div class="text-caption text-grey-darken-1">
              Total Diterima: <strong>{{ trackingItem?.Total_Diterima || 0 }}</strong> dari {{ trackingItem?.Total_Diminta || 0 }}
            </div>
            <div v-if="trackingItem?.Tanggal_Datang" class="text-caption text-success mt-1 font-weight-medium">
              Tanggal Datang Real: {{ trackingItem?.Tanggal_Datang }}
            </div>
          </v-timeline-item>
        </v-timeline>
      </v-card-text>
    </v-card>
  </v-dialog>
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

/* Expand Detail Container */
.expand-detail-container {
  background: #f8fafc;
  border-top: 1px solid #e2e8f0;
}
.sub-detail-table {
  background: white;
  font-size: 11px;
}
.sub-detail-table th {
  background: #f1f5f9;
  font-weight: 700;
  color: #334155;
  font-size: 11px;
  height: 30px;
}
.sub-detail-table td {
  height: 28px;
  font-size: 11px;
}

.row-acc-rejected td {
  color: #d32f2f !important;
  font-weight: 600;
  background-color: #fff5f5 !important;
}

.dialog-header {
  background: #ffffff;
}
.tracking-timeline :deep(.v-timeline-item__body) {
  padding-bottom: 16px;
}
</style>
