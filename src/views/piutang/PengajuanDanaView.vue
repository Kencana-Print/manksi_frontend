<script setup lang="ts">
import { ref, watch } from "vue";
import { useToast } from "vue-toastification";
import { useRouter } from "vue-router";
import BaseBrowse from "@/components/BaseBrowse.vue";
import { useBrowse } from "@/composables/useBrowse";
import { pengajuanDanaService } from "@/services/piutang/pengajuanDanaService";
import {
  IconCash,
  IconPlus,
  IconEdit,
  IconTrash,
  IconPrinter,
  IconFileSpreadsheet,
} from "@tabler/icons-vue";
import { formatTanggal } from "@/utils/dateFormat";
import {
  exportExcel,
  exportExcelSingle,
  type ExcelColumn,
} from "@/utils/excelExport";

const toast = useToast();
const router = useRouter();
const menuId = "177";

// ── Filter: default awal bulan s.d. hari ini ──
const getStartOfMonth = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
};
const getLocalDate = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const filters = ref({
  startDate: getStartOfMonth(),
  endDate: getLocalDate(),
});

// ── Headers master (sesuai kolom Delphi btnRefreshClick) ──
const masterHeaders = [
  { title: "Status", key: "_status", width: "130px", align: "center" },
  { title: "Nomor", key: "Nomor", width: "150px" },
  { title: "Tanggal", key: "Tanggal", width: "95px", align: "center" },
  { title: "Nik", key: "Nik", width: "70px" },
  { title: "Nama", key: "Nama", width: "150px" },
  { title: "Lokasi", key: "Lokasi", width: "70px" },
  { title: "Bagian", key: "Bagian", width: "90px" },
  { title: "Pjh Ke", key: "PjhKe", width: "70px" },
  { title: "Keterangan", key: "Keterangan", minWidth: "220px" },
  { title: "Jenis", key: "Jenis", width: "150px" },
  { title: "Priority", key: "Priority", width: "80px" },
  { title: "Verified", key: "Verified", width: "80px", align: "center" },
  { title: "Approval", key: "Approval", width: "80px", align: "center" },
  { title: "Beli", key: "Beli", width: "70px", align: "center" },
  { title: "Closed", key: "Closed", width: "70px", align: "center" },
  { title: "User", key: "UserKode", width: "90px" },
];

const {
  items,
  isLoading,
  canExport,
  canInsert,
  canEdit,
  canDelete,
  selected,
  isSingleSelected,
  fetchData,
  clearSelection,
} = useBrowse({
  menuId,
  fetchApi: async () => {
    const res = await pengajuanDanaService.getBrowse(filters.value);
    return res.data.data;
  },
  immediate: true,
});

watch([() => filters.value.startDate, () => filters.value.endDate], fetchData);

// ── Master-detail (row expand) ──
const expandedRows = ref<string[]>([]);
const detailData = ref<Record<string, any[]>>({});
const detailLoading = ref<Record<string, boolean>>({});

const onUpdateExpanded = async (val: any[]) => {
  expandedRows.value = val;
  const nomorList = val.map((v) => (typeof v === "object" ? v.Nomor : v));
  for (const nomor of nomorList.filter((n) => n && !detailData.value[n])) {
    detailLoading.value[nomor] = true;
    try {
      const res = await pengajuanDanaService.getDetail(nomor);
      detailData.value[nomor] = res.data.data || [];
    } catch {
      detailData.value[nomor] = [];
    } finally {
      detailLoading.value[nomor] = false;
    }
  }
};

// ── Pewarnaan baris — replikasi cxGrdMasterStylesGetContentStyle Delphi.
// Urutan assignment sekuensial di Delphi berarti kondisi yang dicek PALING
// AKHIR yang menang kalau true. Urutan prioritas (tertinggi ke rendah):
// Closed=Sudah > Verified=Belum > Approval=Belum > Beli=Belum > default.
const getStatusInfo = (
  row: any,
): { label: string; color: string; bg: string } => {
  if (row.Closed === "Sudah")
    return { label: "Selesai", color: "#616161", bg: "#F5F5F5" };
  if (row.Verified === "Belum")
    return { label: "Belum Verifikasi", color: "#1565C0", bg: "#E3F2FD" };
  if (row.Approval === "Belum")
    return { label: "Belum Cair", color: "#C62828", bg: "#FFEBEE" };
  if (row.Beli === "Belum")
    return { label: "Belum Beli", color: "#2E7D32", bg: "#E8F5E9" };
  return { label: "", color: "", bg: "" };
};

const getRowProps = (data: any) => {
  const row = data.item?.raw || data.item;
  const status = getStatusInfo(row);
  return {
    style: status.bg ? `background-color: ${status.bg};` : "",
  };
};

// ── Aksi ──
const onBaru = () => router.push("/piutang/pengajuan-dana/create");

const onUbah = () => {
  if (!isSingleSelected.value) return;
  router.push(
    `/piutang/pengajuan-dana/edit/${encodeURIComponent(selected.value[0].Nomor)}`,
  );
};

const onHapus = async () => {
  if (!isSingleSelected.value) return;
  const target = selected.value[0];
  if (!confirm(`Yakin ingin menghapus pengajuan ${target.Nomor}?`)) return;
  try {
    await pengajuanDanaService.deletePengajuan(target.Nomor);
    toast.success("Berhasil dihapus.");
    clearSelection();
    fetchData();
  } catch (error: any) {
    toast.error(error.response?.data?.message || "Gagal menghapus data.");
  }
};

const onCetak = () => {
  if (!isSingleSelected.value) return;
  const printUrl = router.resolve({
    path: `/piutang/pengajuan-dana/print/${encodeURIComponent(selected.value[0].Nomor)}`,
  }).href;
  window.open(printUrl, "_blank");
};

// ── Export Master ──
const onExportMaster = async () => {
  if (!items.value?.length) return;
  const columns: ExcelColumn[] = [
    { header: "Nomor", key: "Nomor", width: 18 },
    { header: "Tanggal", key: "Tanggal", width: 13, align: "center" },
    { header: "Nik", key: "Nik", width: 10 },
    { header: "Nama", key: "Nama", width: 20 },
    { header: "Lokasi", key: "Lokasi", width: 10 },
    { header: "Bagian", key: "Bagian", width: 14 },
    { header: "Pjh Ke", key: "PjhKe", width: 10 },
    { header: "Keterangan", key: "Keterangan", width: 30 },
    { header: "Jenis", key: "Jenis", width: 20 },
    { header: "Priority", key: "Priority", width: 12 },
    { header: "Verified", key: "Verified", width: 12, align: "center" },
    { header: "Approval", key: "Approval", width: 12, align: "center" },
    { header: "Beli", key: "Beli", width: 10, align: "center" },
    { header: "Closed", key: "Closed", width: 10, align: "center" },
    { header: "User", key: "UserKode", width: 14 },
  ];
  await exportExcelSingle(
    `Pengajuan_Dana_${filters.value.startDate}_to_${filters.value.endDate}.xlsx`,
    "Master Pengajuan Dana",
    columns,
    items.value.map((r: any) => ({
      ...r,
      Tanggal: formatTanggal(r.Tanggal),
    })),
    "HISTORI PENGAJUAN DANA",
  );
};

// ── Export Detail — gabung dari cache expand + fetch sisanya paralel ──
const isExportingDetail = ref(false);
const onExportDetail = async () => {
  if (!items.value?.length) {
    toast.warning("Tidak ada data pada periode ini.");
    return;
  }
  isExportingDetail.value = true;
  try {
    const detailPerNomor: Record<string, any[]> = { ...detailData.value };
    const belumAda = items.value.filter((r: any) => !detailPerNomor[r.Nomor]);
    if (belumAda.length) {
      const results = await Promise.all(
        belumAda.map((r: any) =>
          pengajuanDanaService.getDetail(r.Nomor).then((res) => ({
            nomor: r.Nomor,
            data: res.data.data || [],
          })),
        ),
      );
      results.forEach((r) => (detailPerNomor[r.nomor] = r.data));
    }

    const rows: any[] = [];
    for (const header of items.value as any[]) {
      const details = detailPerNomor[header.Nomor] || [];
      if (!details.length) continue;
      const masterCells = {
        NomorPengajuan: header.Nomor,
        TglPengajuan: formatTanggal(header.Tanggal),
        Nik: header.Nik,
        NamaPeminta: header.Nama,
        Bagian: header.Bagian,
      };
      const blankMaster = Object.fromEntries(
        Object.keys(masterCells).map((k) => [k, ""]),
      );
      details.forEach((d, idx) => {
        rows.push({
          ...(idx === 0 ? masterCells : blankMaster),
          Nama: d.Nama,
          Spesifikasi: d.Spesifikasi,
          Satuan: d.Satuan,
          QtyPengajuan: Number(d.QtyPengajuan) || 0,
          QtyVerifikasi: Number(d.QtyVerifikasi) || 0,
          QtyBeli: Number(d.QtyBeli) || 0,
          QtyRealisasi: Number(d.QtyRealisasi) || 0,
          RpPengajuan: Number(d.RpPengajuan) || 0,
          RpApproved: Number(d.RpApproved) || 0,
          Kegunaan: d.Kegunaan,
          Keterangan: d.Keterangan,
        });
      });
    }

    if (!rows.length) {
      toast.warning("Tidak ada detail untuk periode yang ditampilkan.");
      return;
    }

    await exportExcel(
      `Pengajuan_Dana_Detail_${filters.value.startDate}_to_${filters.value.endDate}.xlsx`,
      [
        {
          sheetName: "Detail",
          columns: [
            { header: "Nomor Pengajuan", key: "NomorPengajuan", width: 18 },
            {
              header: "Tgl Pengajuan",
              key: "TglPengajuan",
              width: 13,
              align: "center",
            },
            { header: "Nik", key: "Nik", width: 10 },
            { header: "Nama Peminta", key: "NamaPeminta", width: 18 },
            { header: "Bagian", key: "Bagian", width: 14 },
            { header: "Nama Item", key: "Nama", width: 22 },
            { header: "Spesifikasi", key: "Spesifikasi", width: 22 },
            { header: "Satuan", key: "Satuan", width: 10 },
            {
              header: "Qty Pengajuan",
              key: "QtyPengajuan",
              width: 13,
              align: "right",
              numFmt: "#,##0",
            },
            {
              header: "Qty Verifikasi",
              key: "QtyVerifikasi",
              width: 13,
              align: "right",
              numFmt: "#,##0",
            },
            {
              header: "Qty Beli",
              key: "QtyBeli",
              width: 12,
              align: "right",
              numFmt: "#,##0",
            },
            {
              header: "Qty Realisasi",
              key: "QtyRealisasi",
              width: 13,
              align: "right",
              numFmt: "#,##0",
            },
            {
              header: "Rp Pengajuan",
              key: "RpPengajuan",
              width: 15,
              align: "right",
              numFmt: "#,##0",
            },
            {
              header: "Rp Approved",
              key: "RpApproved",
              width: 15,
              align: "right",
              numFmt: "#,##0",
            },
            { header: "Kegunaan", key: "Kegunaan", width: 25 },
            { header: "Keterangan", key: "Keterangan", width: 25 },
          ],
          rows,
          title: "RINCIAN PENGAJUAN DANA",
        },
      ],
    );
  } catch {
    toast.error("Gagal export detail.");
  } finally {
    isExportingDetail.value = false;
  }
};

const fmtNum = (val: number) =>
  new Intl.NumberFormat("id-ID").format(Math.ceil(val || 0));
</script>

<template>
  <BaseBrowse
    title="Pengajuan Dana"
    :menu-id="menuId"
    :icon="IconCash"
    :headers="masterHeaders"
    :items="items ?? []"
    item-value="Nomor"
    :is-loading="isLoading"
    v-model:filterState="filters"
    v-model:selected="selected"
    show-expand
    :expanded="expandedRows"
    @update:expanded="onUpdateExpanded"
    :row-props-fn="getRowProps"
    @refresh="fetchData"
  >
    <template #filter-left>
      <div class="d-flex align-center gap-2">
        <span class="f-label">Periode</span>
        <input type="date" v-model="filters.startDate" class="f-date" />
        <span class="f-sep">s/d</span>
        <input type="date" v-model="filters.endDate" class="f-date" />
      </div>

      <div class="f-divider" />

      <div class="legend-group">
        <div class="legend-item">
          <span class="legend-dot" style="background: #1565c0"></span>
          <span>Belum Verifikasi</span>
        </div>
        <div class="legend-item">
          <span class="legend-dot" style="background: #c62828"></span>
          <span>Belum Cair</span>
        </div>
        <div class="legend-item">
          <span class="legend-dot" style="background: #2e7d32"></span>
          <span>Belum Beli</span>
        </div>
        <div class="legend-item">
          <span class="legend-dot" style="background: #616161"></span>
          <span>Selesai</span>
        </div>
      </div>
    </template>

    <template #extra-actions>
      <v-btn
        v-if="canInsert"
        size="small"
        color="primary"
        class="mr-1"
        @click="onBaru"
      >
        <template #prepend><IconPlus :size="15" /></template>Baru
      </v-btn>
      <v-btn
        v-if="canEdit"
        size="small"
        color="warning"
        class="mr-1"
        :disabled="!isSingleSelected"
        @click="onUbah"
      >
        <template #prepend><IconEdit :size="15" /></template>Ubah
      </v-btn>
      <v-btn
        v-if="canDelete"
        size="small"
        color="error"
        class="mr-1"
        :disabled="!isSingleSelected"
        @click="onHapus"
      >
        <template #prepend><IconTrash :size="15" /></template>Hapus
      </v-btn>
      <v-btn
        size="small"
        color="secondary"
        class="mr-1"
        :disabled="!isSingleSelected"
        @click="onCetak"
      >
        <template #prepend><IconPrinter :size="15" /></template>Cetak
      </v-btn>
      <v-btn
        v-if="canExport"
        size="small"
        color="success"
        class="mr-1"
        @click="onExportMaster"
      >
        <template #prepend><IconFileSpreadsheet :size="15" /></template>Export
      </v-btn>
      <v-btn
        v-if="canExport"
        size="small"
        color="teal-darken-1"
        class="mr-1"
        :loading="isExportingDetail"
        @click="onExportDetail"
      >
        <template #prepend><IconFileSpreadsheet :size="15" /></template>Export
        Detail
      </v-btn>
    </template>

    <template #item._status="{ item }">
      <v-chip
        v-if="getStatusInfo(item).label"
        size="x-small"
        :style="{
          backgroundColor: getStatusInfo(item).color,
          color: 'white',
        }"
        class="font-weight-bold"
      >
        {{ getStatusInfo(item).label }}
      </v-chip>
      <span v-else class="text-grey text-caption">-</span>
    </template>

    <template #item.Tanggal="{ item }">
      {{ formatTanggal(item.Tanggal) }}
    </template>

    <template #detail="{ item }">
      <div class="detail-wrap">
        <div v-if="detailLoading[item.Nomor]" class="detail-loading">
          <v-progress-circular indeterminate color="primary" size="20" />
          <span class="ml-2 text-caption text-grey">Memuat detail item...</span>
        </div>
        <div v-else class="detail-panel">
          <div class="panel-head">
            Rincian Item untuk No. Pengajuan:
            <span class="text-warning ml-1">{{ item.Nomor }}</span>
          </div>
          <div class="dtl-scroll">
            <table class="dtl-table">
              <thead>
                <tr>
                  <th style="width: 150px">Nama</th>
                  <th style="width: 170px">Spesifikasi</th>
                  <th style="width: 60px" class="tc">Satuan</th>
                  <th style="width: 80px" class="tr">Qty Ajukan</th>
                  <th style="width: 80px" class="tr">Qty Verif</th>
                  <th style="width: 70px" class="tr">Qty Beli</th>
                  <th style="width: 80px" class="tr">Qty Realisasi</th>
                  <th style="width: 100px" class="tr">Rp Ajukan</th>
                  <th style="width: 100px" class="tr">Rp Approved</th>
                  <th style="width: 130px">Deadline</th>
                  <th style="width: 130px">Verified Oleh</th>
                  <th style="width: 130px">Approved Oleh</th>
                  <th style="min-width: 180px">Kegunaan</th>
                  <th style="min-width: 180px">Keterangan</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(d, i) in detailData[item.Nomor]" :key="i">
                  <td class="fw text-grey-darken-3">{{ d.Nama }}</td>
                  <td>{{ d.Spesifikasi }}</td>
                  <td class="tc">{{ d.Satuan }}</td>
                  <td class="tr">{{ fmtNum(d.QtyPengajuan) }}</td>
                  <td class="tr">{{ fmtNum(d.QtyVerifikasi) }}</td>
                  <td class="tr">{{ fmtNum(d.QtyBeli) }}</td>
                  <td class="tr">{{ fmtNum(d.QtyRealisasi) }}</td>
                  <td class="tr">{{ fmtNum(d.RpPengajuan) }}</td>
                  <td class="tr text-success font-weight-bold">
                    {{ fmtNum(d.RpApproved) }}
                  </td>
                  <td>{{ d.Deadline ? formatTanggal(d.Deadline) : "-" }}</td>
                  <td>{{ d.NameVerified || "-" }}</td>
                  <td>{{ d.NameApproved || "-" }}</td>
                  <td style="white-space: normal">{{ d.Kegunaan }}</td>
                  <td style="white-space: normal">{{ d.Keterangan }}</td>
                </tr>
                <tr v-if="!detailData[item.Nomor]?.length">
                  <td colspan="14" class="empty-row">
                    Tidak ada rincian item untuk pengajuan ini.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </template>
  </BaseBrowse>
</template>

<style scoped>
.gap-2 {
  gap: 8px;
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
  font-size: 11px;
  background: white;
  outline: none;
}
.f-date:focus {
  border-color: #1976d2;
}
.f-sep {
  font-size: 11px;
  color: #888;
}
.f-divider {
  width: 1px;
  height: 20px;
  background: #ddd;
  margin: 0 10px;
}

.legend-group {
  display: flex;
  align-items: center;
  gap: 14px;
  font-size: 11px;
  font-weight: 500;
  color: #333;
}
.legend-item {
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

.detail-wrap {
  padding: 10px 14px 16px;
  background: #f5f7fb;
  border-top: 2px solid #dde3ea;
}
.detail-loading {
  display: flex;
  align-items: center;
  padding: 12px;
  color: #555;
}
.detail-panel {
  background: white;
  border-radius: 6px;
  overflow: hidden;
  border: 1px solid #cfd8dc;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08);
}
.panel-head {
  display: flex;
  align-items: center;
  background: #37474f;
  color: white;
  padding: 8px 12px;
  font-size: 11.5px;
  font-weight: 700;
  letter-spacing: 0.02em;
}
.dtl-scroll {
  overflow-x: auto;
}
.dtl-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 11px;
}
.dtl-table thead th {
  background: #eceff1;
  color: #37474f;
  padding: 6px 10px;
  text-align: left;
  font-weight: 700;
  border-bottom: 2px solid #b0bec5;
  border-right: 1px solid #dde3ea;
  white-space: nowrap;
}
.dtl-table tbody td {
  padding: 5px 10px;
  border-bottom: 1px solid #f0f0f0;
  border-right: 1px solid #f0f0f0;
  vertical-align: middle;
  white-space: nowrap;
}
.dtl-table tbody tr:hover td {
  background: #f1f5f9;
}
.tc {
  text-align: center !important;
}
.tr {
  text-align: right !important;
}
.fw {
  font-weight: 700;
}
.empty-row {
  text-align: center;
  color: #9e9e9e;
  padding: 14px;
  font-style: italic;
}
</style>
