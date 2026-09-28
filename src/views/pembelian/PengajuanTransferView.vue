<script setup lang="ts">
import { ref, computed, onMounted, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useToast } from "vue-toastification";
import BaseBrowse from "@/components/BaseBrowse.vue";
import { useBrowse } from "@/composables/useBrowse";
import { pengajuanTransferService } from "@/services/pembelian/pengajuanTransferService";
import {
  IconTransfer,
  IconPrinter,
  IconFileExport,
  IconTableExport,
  IconCheck,
} from "@tabler/icons-vue";
import { formatTanggal } from "@/utils/dateFormat";
import { exportExcelSingle, type ExcelColumn } from "@/utils/excelExport";

const route = useRoute();
const router = useRouter();
const toast = useToast();
const baseBrowseRef = ref<InstanceType<typeof BaseBrowse> | null>(null);

const isPendingFilter = computed(() => route.query.filter === "pending");

// --- Periode ---
const getToday = () => {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};
const getAwalBulan = () => {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}-01`;
};

const filterState = ref<Record<string, any>>({});
const startDate = ref(getAwalBulan());
const endDate = ref(getToday());

watch([startDate, endDate], () => {
  if (!isPendingFilter.value) fetchData();
});

// --- Cache detail — di-fetch bareng browse ---
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
  menuId: "958",
  fetchApi: async () => {
    if (isPendingFilter.value) {
      const [resBrowse, resDetail] = await Promise.all([
        pengajuanTransferService.getBrowsePendingAll(),
        pengajuanTransferService.getBrowseDetailPendingAll(),
      ]);
      groupDetail(resDetail.data.data as any[]);
      return resBrowse.data.data;
    }

    const [resBrowse, resDetail] = await Promise.all([
      pengajuanTransferService.getBrowse({
        startDate: startDate.value,
        endDate: endDate.value,
      }),
      pengajuanTransferService.getBrowseDetail({
        startDate: startDate.value,
        endDate: endDate.value,
      }),
    ]);
    groupDetail(resDetail.data.data as any[]);
    return resBrowse.data.data;
  },
  immediate: false,
});

const groupDetail = (rows: any[]) => {
  const grouped: Record<string, any[]> = {};
  for (const row of rows) {
    if (!grouped[row.Nomor]) grouped[row.Nomor] = [];
    grouped[row.Nomor].push(row);
  }
  detailCache.value = grouped;
};

onMounted(() => {
  fetchData();
});

const resetPendingFilter = () => {
  router.replace({ path: "/pembelian/pengajuan-transfer" });
  fetchData();
};

// --- Headers ---
const headers = [
  { title: "Nomor", key: "Nomor", width: "180px", fixed: true },
  { title: "Tanggal", key: "Tanggal", width: "100px", align: "center" },
  { title: "Account", key: "Account", width: "100px" },
  { title: "No. Rek Asal", key: "NoRekAsal", width: "130px" },
  { title: "Nama Rekening", key: "NamaRekening", width: "250px" },
  { title: "Status", key: "Status_", width: "90px", align: "center" },
];

const numFmt = (v: any) => (v ? Number(v).toLocaleString("id-ID") : "0");

// --- Expand ---
const expandedRows = ref<any[]>([]);
const onUpdateExpanded = (val: any[]) => {
  expandedRows.value = val;
};

// --- Row coloring: BELUM=merah, PROSES=biru, CLOSE=default ---
const rowPropsFn = (data: any) => {
  const item = data.item?.raw || data.item;
  if (item.Status_ === "BELUM")
    return { style: "color:#cc0000;font-weight:600" };
  if (item.Status_ === "PROSES")
    return { style: "color:#1565c0;font-weight:600" };
  return {};
};

const detailRowClass = (d: any) => {
  if (d.KetBatal) return "det-batal";
  if (d.TglRealisasi) return "det-realisasi";
  return "";
};

const requireSelected = (): boolean => {
  if (!selectedItem.value) {
    toast.warning("Pilih data terlebih dahulu.");
    return false;
  }
  return true;
};

// --- Add / Edit / Print / Realisasi ---
const onAdd = () => router.push("/pembelian/pengajuan-transfer/create");
const onEdit = () => {
  if (!requireSelected()) return;
  router.push(
    `/pembelian/pengajuan-transfer/edit/${encodeURIComponent(selectedItem.value!.Nomor)}`,
  );
};
const onPrint = () => {
  if (!requireSelected()) return;
  window.open(
    `/pembelian/pengajuan-transfer/print/${encodeURIComponent(selectedItem.value!.Nomor)}`,
    "_blank",
  );
};
const onRealisasi = () => {
  if (!requireSelected()) return;
  router.push(
    `/pembelian/pengajuan-transfer/realisasi/${encodeURIComponent(selectedItem.value!.Nomor)}`,
  );
};

// --- Delete ---
const showDeleteDialog = ref(false);
const deleteWarning = ref(false);
const isDeleting = ref(false);

const onHapus = () => {
  if (!requireSelected()) return;
  deleteWarning.value = selectedItem.value!.Status_ !== "BELUM";
  showDeleteDialog.value = true;
};

const confirmDelete = async () => {
  if (!selectedItem.value) return;
  isDeleting.value = true;
  try {
    await pengajuanTransferService.deleteData(selectedItem.value.Nomor);
    toast.success("Data berhasil dihapus.");
    showDeleteDialog.value = false;
    fetchData();
  } catch (e: any) {
    toast.error(e.response?.data?.message || "Gagal menghapus data.");
  } finally {
    isDeleting.value = false;
  }
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

    const periodeLabel = isPendingFilter.value
      ? "Filter: Belum/Proses (Semua Periode)"
      : `Periode: ${formatTanggal(startDate.value)} s/d ${formatTanggal(endDate.value)}`;
    await exportExcelSingle(
      `Pengajuan_Transfer_${startDate.value}_${endDate.value}.xlsx`,
      "Pengajuan Transfer",
      columns,
      rows,
      `Laporan Pengajuan Transfer  |  ${periodeLabel}`,
    );

    toast.success("Berhasil export data.");
  } catch (e) {
    console.error(e);
    toast.error("Terjadi kesalahan saat export.");
  } finally {
    isExporting.value = false;
  }
};

// --- Export Detail ---
const isExportingDetail = ref(false);

const HEADER_COLS_DETAIL = [
  "Nomor",
  "Tanggal",
  "Account",
  "NoRekAsal",
  "NamaRekening",
  "Status_",
];

const detailExportColumns: ExcelColumn[] = [
  { header: "Nomor", key: "Nomor", width: 20 },
  { header: "Tanggal", key: "Tanggal", width: 14, align: "center" },
  { header: "Account", key: "Account", width: 12 },
  { header: "No. Rek Asal", key: "NoRekAsal", width: 16 },
  { header: "Nama Rekening", key: "NamaRekening", width: 24 },
  { header: "Status", key: "Status_", width: 10, align: "center" },
  { header: "Kode Sup", key: "KodeSup", width: 12 },
  { header: "Nama Supplier", key: "NamaSupplier", width: 22 },
  { header: "Bank", key: "Bank", width: 12 },
  { header: "Atas Nama", key: "AtasNama", width: 18 },
  { header: "Rekening", key: "Rekening", width: 16 },
  { header: "No. Transaksi", key: "NoTransaksi", width: 16 },
  {
    header: "Nominal",
    key: "Nominal",
    width: 16,
    align: "end",
    numFmt: "#,##0",
  },
  { header: "Keterangan", key: "Keterangan", width: 22 },
  { header: "Tgl Realisasi", key: "TglRealisasi", width: 14, align: "center" },
  { header: "Account Detail", key: "AccountDtl", width: 14 },
  { header: "Nama Account", key: "NamaAccount", width: 20 },
  { header: "CC Nama", key: "CcNama", width: 16 },
  { header: "DC Nama", key: "DcNama", width: 16 },
  { header: "Jurnal", key: "Jurnal", width: 18 },
  { header: "Ket Batal", key: "KetBatal", width: 18 },
];

const onExportDetail = async () => {
  isExportingDetail.value = true;
  try {
    const [resBrowse, resDetail] = isPendingFilter.value
      ? await Promise.all([
          pengajuanTransferService.getBrowsePendingAll(),
          pengajuanTransferService.getBrowseDetailPendingAll(),
        ])
      : await Promise.all([
          pengajuanTransferService.getBrowse({
            startDate: startDate.value,
            endDate: endDate.value,
          }),
          pengajuanTransferService.getBrowseDetail({
            startDate: startDate.value,
            endDate: endDate.value,
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
        Account: m.Account || "",
        NoRekAsal: m.NoRekAsal || "",
        NamaRekening: m.NamaRekening || "",
        Status_: m.Status_ || "",
        KodeSup: d.KodeSup || "",
        NamaSupplier: d.NamaSupplier || "",
        Bank: d.Bank || "",
        AtasNama: d.AtasNama || "",
        Rekening: d.Rekening || "",
        NoTransaksi: d.NoTransaksi || "",
        Nominal: Number(d.Nominal) || 0,
        Keterangan: d.Keterangan || "",
        TglRealisasi: d.TglRealisasi ? formatTanggal(d.TglRealisasi) : "",
        AccountDtl: d.Account || "",
        NamaAccount: d.NamaAccount || "",
        CcNama: d.CcNama || "",
        DcNama: d.DcNama || "",
        Jurnal: d.Jurnal || "",
        KetBatal: d.KetBatal || "",
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

    const periodeLabel = isPendingFilter.value
      ? "Filter: Belum/Proses (Semua Periode)"
      : `Periode: ${formatTanggal(startDate.value)} s/d ${formatTanggal(endDate.value)}`;
    await exportExcelSingle(
      `Pengajuan_Transfer_Detail_${startDate.value}_${endDate.value}.xlsx`,
      "Pengajuan Transfer Detail",
      detailExportColumns,
      rows,
      `Laporan Detail Pengajuan Transfer  |  ${periodeLabel}`,
    );

    toast.success("Berhasil export detail data.");
  } catch (e) {
    console.error(e);
    toast.error("Terjadi kesalahan saat export detail.");
  } finally {
    isExportingDetail.value = false;
  }
};

// --- Excel per nomor (Delphi btnExcel) ---
const isExportingExcel = ref(false);

const onExcelPerNomor = async () => {
  if (!requireSelected()) return;
  const row = selectedItem.value!;
  const detail = detailCache.value[row.Nomor] || [];

  if (!detail.length) {
    toast.warning("Tidak ada detail untuk diexport.");
    return;
  }

  isExportingExcel.value = true;
  try {
    const columns: ExcelColumn[] = [
      { header: "Kode Sup", key: "KodeSup", width: 12 },
      { header: "Nama Supplier", key: "NamaSupplier", width: 24 },
      { header: "Bank", key: "Bank", width: 14 },
      { header: "Atas Nama", key: "AtasNama", width: 20 },
      { header: "Rekening", key: "Rekening", width: 18 },
      { header: "No. Transaksi", key: "NoTransaksi", width: 16 },
      {
        header: "Nominal",
        key: "Nominal",
        width: 16,
        align: "end",
        numFmt: "#,##0",
      },
      { header: "Keterangan", key: "Keterangan", width: 24 },
    ];
    const rows = detail.map((d: any) => ({
      KodeSup: d.KodeSup || "",
      NamaSupplier: d.NamaSupplier || "",
      Bank: d.Bank || "",
      AtasNama: d.AtasNama || "",
      Rekening: d.Rekening || "",
      NoTransaksi: d.NoTransaksi || "",
      Nominal: Number(d.Nominal) || 0,
      Keterangan: d.Keterangan || "",
    }));

    await exportExcelSingle(
      `${row.Nomor.replace(/[\\/]/g, "_")}.xlsx`,
      "Pengajuan Transfer",
      columns,
      rows,
      `${row.Nomor}  |  ${formatTanggal(row.Tanggal)}  |  ${row.NamaRekening}`,
    );

    toast.success("Berhasil export ke Excel.");
  } catch (e) {
    console.error(e);
    toast.error("Gagal export ke Excel.");
  } finally {
    isExportingExcel.value = false;
  }
};
</script>

<template>
  <BaseBrowse
    ref="baseBrowseRef"
    title="Pengajuan Transfer"
    menu-id="958"
    :icon="IconTransfer"
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
    :row-props-fn="rowPropsFn"
    show-expand
    :expanded="expandedRows"
    @update:expanded="onUpdateExpanded"
    @add="onAdd"
    @edit="onEdit"
    @refresh="fetchData"
    @delete="onHapus"
    @export="onExport"
  >
    <template #filter-left>
      <div class="f-group">
        <span class="f-label">Periode</span>
        <input
          type="date"
          v-model="startDate"
          class="f-date"
          :disabled="isPendingFilter"
        />
        <span class="f-sep">s/d</span>
        <input
          type="date"
          v-model="endDate"
          class="f-date"
          :disabled="isPendingFilter"
        />
        <span
          v-if="isPendingFilter"
          class="pending-badge"
          title="Klik untuk tampilkan semua"
          @click="resetPendingFilter"
        >
          ⚠ Belum/Proses (Semua) · ✕ Reset
        </span>
      </div>
      <div class="f-divider" />
      <div class="legend-wrap">
        <span class="legend-dot" style="background: #cc0000"></span>
        <span class="legend-lbl">Belum</span>
        <span class="legend-dot" style="background: #1565c0"></span>
        <span class="legend-lbl">Proses</span>
        <span class="legend-dot" style="background: #212121"></span>
        <span class="legend-lbl">Close</span>
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
        color="teal-darken-1"
        :disabled="selected.length === 0"
        :loading="isExportingExcel"
        @click="onExcelPerNomor"
      >
        <template #prepend><IconTableExport :size="15" /></template>Excel
      </v-btn>
      <v-btn
        size="small"
        color="teal-darken-2"
        :loading="isExportingDetail"
        @click="onExportDetail"
      >
        <template #prepend><IconFileExport :size="15" /></template>Export Detail
      </v-btn>
      <v-btn
        size="small"
        color="indigo-darken-1"
        :disabled="selected.length === 0"
        @click="onRealisasi"
      >
        <template #prepend><IconCheck :size="15" /></template>Realisasi
      </v-btn>
    </template>

    <template #item.Tanggal="{ item }">
      {{ formatTanggal((item.raw || item).Tanggal) }}
    </template>

    <template #item.Status_="{ item }">
      <span
        class="pt-badge"
        :class="{
          'badge-belum': (item.raw || item).Status_ === 'BELUM',
          'badge-proses': (item.raw || item).Status_ === 'PROSES',
          'badge-close': (item.raw || item).Status_ === 'CLOSE',
        }"
      >
        {{ (item.raw || item).Status_ }}
      </span>
    </template>

    <template #detail="{ item }">
      <div class="expand-wrap">
        <div class="expand-title mb-2">
          Detail Pengajuan - {{ (item.raw || item).Nomor }}
        </div>
        <table class="detail-table">
          <thead>
            <tr>
              <th width="80">Kode Sup</th>
              <th width="150">Nama Supplier</th>
              <th width="80">Bank</th>
              <th width="120">Atas Nama</th>
              <th width="120">Rekening</th>
              <th width="100">No Transaksi</th>
              <th width="110" class="tr">Nominal</th>
              <th width="160">Keterangan</th>
              <th width="100">Tgl Realisasi</th>
              <th width="90">Account</th>
              <th width="150">Nama Account</th>
              <th width="100">CC Nama</th>
              <th width="100">DC Nama</th>
              <th width="130">Jurnal</th>
              <th width="130">Ket Batal</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(d, idx) in detailCache[(item.raw || item).Nomor] || []"
              :key="idx"
              :class="detailRowClass(d)"
            >
              <td>{{ d.KodeSup || "-" }}</td>
              <td>{{ d.NamaSupplier }}</td>
              <td>{{ d.Bank }}</td>
              <td>{{ d.AtasNama }}</td>
              <td>{{ d.Rekening }}</td>
              <td>{{ d.NoTransaksi || "-" }}</td>
              <td class="tr">{{ numFmt(d.Nominal) }}</td>
              <td>{{ d.Keterangan }}</td>
              <td class="tc">
                {{ d.TglRealisasi ? formatTanggal(d.TglRealisasi) : "-" }}
              </td>
              <td>{{ d.Account || "-" }}</td>
              <td>{{ d.NamaAccount || "-" }}</td>
              <td>{{ d.CcNama || "-" }}</td>
              <td>{{ d.DcNama || "-" }}</td>
              <td>{{ d.Jurnal || "-" }}</td>
              <td>{{ d.KetBatal || "-" }}</td>
            </tr>
            <tr
              v-if="
                !detailCache[(item.raw || item).Nomor] ||
                detailCache[(item.raw || item).Nomor].length === 0
              "
            >
              <td colspan="15" class="text-center text-grey py-4 font-italic">
                Data detail tidak ditemukan.
              </td>
            </tr>
          </tbody>
          <tfoot v-if="(detailCache[(item.raw || item).Nomor] || []).length">
            <tr class="detail-foot">
              <td colspan="6" class="tr detail-foot-lbl">Total</td>
              <td class="tr detail-foot-val">
                {{
                  numFmt(
                    (detailCache[(item.raw || item).Nomor] || []).reduce(
                      (s: number, d: any) => s + Number(d.Nominal),
                      0,
                    ),
                  )
                }}
              </td>
              <td colspan="8"></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </template>
  </BaseBrowse>

  <v-dialog v-model="showDeleteDialog" max-width="440px" persistent>
    <v-card rounded="lg">
      <v-card-title
        class="bg-error text-white pa-3 text-subtitle-1 d-flex align-center"
      >
        <IconTransfer :size="16" color="white" class="mr-2" />
        Konfirmasi Hapus
      </v-card-title>
      <v-card-text class="pa-4 text-body-2">
        <div v-if="deleteWarning" class="delete-warning-box">
          ⚠️ Pengajuan ini sudah di Realisasi. Jika dihapus, Jurnal akan ikut
          dihapus.
        </div>
        Yakin ingin menghapus:
        <div class="font-weight-bold text-primary mt-1">
          {{ selectedItem?.Nomor }}
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
.f-date {
  height: 28px;
  border: 1px solid #ccc;
  border-radius: 4px;
  padding: 0 6px;
  font-size: 12px;
  outline: none;
  background: white;
  color: #212121;
}
.f-divider {
  width: 1px;
  height: 20px;
  background: #ddd;
  margin: 0 8px;
}

.legend-wrap {
  display: flex;
  align-items: center;
  gap: 5px;
}
.legend-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
}
.legend-lbl {
  font-size: 11px;
  color: #374151;
  margin-right: 6px;
}

.pt-badge {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 10px;
  font-weight: 700;
}
.badge-belum {
  background: #ffebee;
  color: #cc0000;
}
.badge-proses {
  background: #e3f2fd;
  color: #1565c0;
}
.badge-close {
  background: #f5f5f5;
  color: #212121;
}

.pending-badge {
  font-size: 11px;
  font-weight: 600;
  color: #cc0000;
  background: #ffebee;
  border: 1px solid #ef9a9a;
  border-radius: 20px;
  padding: 2px 10px;
  cursor: pointer;
  white-space: nowrap;
  margin-left: 8px;
}
.pending-badge:hover {
  background: #ffcdd2;
}

.expand-wrap {
  padding: 10px 10px 10px 50px;
  background: #eceff1;
  overflow-x: auto;
}
.expand-title {
  font-size: 12px;
  font-weight: 700;
  color: #37474f;
}
.detail-table {
  width: 100%;
  min-width: 1400px;
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
  white-space: nowrap;
}
.detail-table td {
  padding: 4px 10px;
  border-bottom: 1px solid #eee;
  font-size: 12px;
}
.tr {
  text-align: right !important;
}
.tc {
  text-align: center;
}

.det-batal td {
  color: #cc0000 !important;
}
.det-realisasi td {
  color: #1565c0 !important;
}
.detail-foot td {
  background: #f0fdf4;
  border-top: 2px solid #2e7d32;
}
.detail-foot-lbl {
  font-size: 11px;
  font-weight: 700;
  color: #374151;
}
.detail-foot-val {
  font-size: 11px;
  font-weight: 700;
  color: #1b5e20;
}

.delete-warning-box {
  background: #fff3e0;
  border: 1px solid #ff9800;
  border-radius: 6px;
  padding: 8px 12px;
  font-size: 11px;
  font-weight: 600;
  color: #e65100;
  margin-bottom: 10px;
}
</style>
