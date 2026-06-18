<script setup lang="ts">
import { ref, watch, onMounted } from "vue";
import { useToast } from "vue-toastification";
import { useRouter } from "vue-router";
import BaseBrowse from "@/components/BaseBrowse.vue";
import { useBrowse } from "@/composables/useBrowse";
import { pelunasanService } from "@/services/piutang/pelunasanService";
import {
  IconCoin,
  IconPlus,
  IconEdit,
  IconTrash,
  IconPrinter,
  IconFileSpreadsheet,
  IconLock,
  IconAlertTriangle,
} from "@tabler/icons-vue";

// Util ExcelJS bawaan proyek Anda
import {
  exportExcel,
  exportExcelSingle,
  type ExcelColumn,
} from "@/utils/excelExport";

const toast = useToast();
const router = useRouter();
const menuId = "255";

// ── TANGGAL DEFAULT AWAL BULAN S.D HARI INI ──
const today = new Date();
const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
  .toISOString()
  .substring(0, 10);
const todayString = today.toISOString().substring(0, 10);

const filters = ref({
  startDate: firstDayOfMonth,
  endDate: todayString,
});

// ── HEADERS MASTER (Sesuai tfull master Delphi) ──
const masterHeaders = [
  { title: "Nomor Pelunasan", key: "Nomor", width: "160px", fixed: true },
  { title: "Cabang", key: "Cabang", width: "80px", align: "center" },
  { title: "Tanggal", key: "Tanggal", width: "110px", align: "center" },
  { title: "Notes / Keterangan", key: "Notes", minWidth: "250px" },
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
    const res = await pelunasanService.getBrowse(filters.value);
    return res.data.data;
  },
  immediate: true,
});

watch([() => filters.value.startDate, () => filters.value.endDate], fetchData);

// ── MASTER-DETAIL (ROW EXPAND) ──
const expandedRows = ref<string[]>([]);
const detailData = ref<Record<string, any[]>>({});
const detailLoading = ref<Record<string, boolean>>({});

const onUpdateExpanded = async (val: any[]) => {
  expandedRows.value = val;
  const nomorList = val.map((v) => (typeof v === "object" ? v.Nomor : v));
  for (const nomor of nomorList.filter((n) => n && !detailData.value[n])) {
    detailLoading.value[nomor] = true;
    try {
      const res = await pelunasanService.getDetail(nomor);
      detailData.value[nomor] = res.data.data || [];
    } catch {
      detailData.value[nomor] = [];
    } finally {
      detailLoading.value[nomor] = false;
    }
  }
};

// ── ATURAN PEWARNAAN BARIS (getRowTextColor) ──
const getRowTextColor = (item: any): string => {
  if (item.Ngedit === "WAIT") return "#1565C0"; // Blue
  if (item.Ngedit === "ACC") return "#2E7D32"; // Green
  if (item.Ngedit === "TOLAK") return "#C62828"; // Red
  return "";
};

const getRowProps = (item: any) => {
  const textColor = getRowTextColor(item);
  return {
    style: textColor ? { color: textColor, fontWeight: "600" } : {},
  };
};

// ── AKSI OPERASIONAL BUTTON ──
const onBaru = () => {
  router.push("/piutang/pelunasan/create");
};

const onUbah = () => {
  if (!isSingleSelected.value) return;
  router.push(
    `/piutang/pelunasan/edit/${encodeURIComponent(selected.value[0].Nomor)}`,
  );
};

const onHapus = async () => {
  if (!isSingleSelected.value) return;
  const target = selected.value[0];

  if (confirm(`Yakin ingin menghapus transaksi pelunasan ${target.Nomor}?`)) {
    try {
      await pelunasanService.deletePelunasan(target.Nomor);
      toast.success("Berhasil dihapus.");
      clearSelection();
      fetchData();
    } catch (error: any) {
      toast.error(
        error.response?.data?.message || "Gagal menghapus transaksi.",
      );
    }
  }
};

const onCetak = () => {
  if (!isSingleSelected.value) return;

  // Mengambil URL string mentah dari Vue Router
  const printUrl = router.resolve({
    path: `/piutang/pelunasan/print/${encodeURIComponent(selected.value[0].Nomor)}`,
  }).href;

  // Membuka URL di tab baru
  window.open(printUrl, "_blank");
};

// ── EXPORT DATA (EXCELJS) ──
const onExportMaster = async () => {
  if (!items.value?.length) return;
  const columns: ExcelColumn[] = [
    { header: "Nomor Pelunasan", key: "Nomor", width: 22 },
    { header: "Cabang", key: "Cabang", width: 12, align: "center" },
    { header: "Tanggal", key: "Tanggal", width: 14, align: "center" },
    { header: "Notes", key: "Notes", width: 45 },
  ];
  await exportExcelSingle(
    `Pelunasan_Piutang_Master_${filters.value.startDate}_to_${filters.value.endDate}.xlsx`,
    "Master Pelunasan",
    columns,
    items.value,
    "HISTORI PELUNASAN PIUTANG (MASTER)",
  );
};

const isExportingDetail = ref(false);
const onExportDetail = async () => {
  isExportingDetail.value = true;
  try {
    const res = await pelunasanService.getAllDetail(filters.value);
    const rows = res.data.data || [];
    if (!rows.length) {
      toast.warning("Tidak ada data detail pada range tanggal ini.");
      return;
    }
    const columns: ExcelColumn[] = [
      { header: "No. Pelunasan", key: "NomorPelunasan", width: 20 },
      {
        header: "Tgl Pelunasan",
        key: "TglPelunasan",
        width: 14,
        align: "center",
      },
      { header: "Nota Invoice", key: "NotaInvoice", width: 20 },
      { header: "Tgl Invoice", key: "TglInvoice", width: 14, align: "center" },
      { header: "Customer", key: "Customer", width: 30 },
      { header: "Alamat", key: "Alamat", width: 35 },
      { header: "Tipe Bayar", key: "TipeBayar", width: 14, align: "center" },
      { header: "No. Bukti / Ref", key: "NoBukti", width: 20 },
      {
        header: "Nominal Kredit",
        key: "NominalKredit",
        width: 15,
        align: "right",
        numFmt: "#,##0",
      },
      { header: "Notes Detail", key: "NotesDetail", width: 25 },
    ];
    await exportExcel(
      `Pelunasan_Piutang_Detail_${filters.value.startDate}_to_${filters.value.endDate}.xlsx`,
      [
        {
          sheetName: "Rincian Pelunasan",
          columns,
          rows: rows.map((r: any) => ({
            ...r,
            NominalKredit: Number(r.NominalKredit) || 0,
          })),
          title: "RINCIAN ALOKASI PELUNASAN INVOICE CUSTOMER",
        },
      ],
    );
  } catch {
    toast.error("Gagal export detail.");
  } finally {
    isExportingDetail.value = false;
  }
};

// ── ALUR DIALOG PIN 5 (PENGAJUAN PERUBAHAN DATA) ──
const showPinDialog = ref(false);
const pinAlasan = ref("");
const isSubmittingPin = ref(false);

const openPin5Dialog = async () => {
  if (!isSingleSelected.value) return;
  try {
    await pelunasanService.cekKelayakanPIN(selected.value[0].Nomor);
    pinAlasan.value = "";
    showPinDialog.value = true;
  } catch (error: any) {
    toast.warning(
      error.response?.data?.message || "Tidak memenuhi syarat pengajuan PIN 5.",
    );
  }
};

const submitPin5 = async () => {
  if (!pinAlasan.value.trim()) {
    toast.error("Alasan pengajuan harus diisi.");
    return;
  }
  isSubmittingPin.value = true;
  try {
    await pelunasanService.requestPIN5(
      selected.value[0].Nomor,
      pinAlasan.value,
    );
    toast.success("Berhasil diajukan. Menunggu persetujuan Manager.");
    showPinDialog.value = false;
    fetchData();
    clearSelection();
  } catch (error: any) {
    toast.error(error.response?.data?.message || "Gagal mengajukan PIN 5.");
  } finally {
    isSubmittingPin.value = false;
  }
};

const fmtNum = (val: number) =>
  new Intl.NumberFormat("id-ID").format(Math.ceil(val || 0));
const getTotalKredit = (arr: any[]) =>
  arr?.reduce((s, d) => s + (Number(d.Kredit) || 0), 0) || 0;
</script>

<template>
  <BaseBrowse
    title="Pelunasan Piutang Customer"
    :menu-id="menuId"
    :icon="IconCoin"
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
        <input
          type="date"
          v-model="filters.startDate"
          class="f-date"
          hide-details
        />
        <span class="f-sep">s/d</span>
        <input
          type="date"
          v-model="filters.endDate"
          class="f-date"
          hide-details
        />
      </div>
      <div class="f-divider" />
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

      <v-btn
        v-if="canEdit"
        size="small"
        color="purple-darken-1"
        class="mr-1"
        :disabled="!isSingleSelected"
        @click="openPin5Dialog"
      >
        <template #prepend><IconLock :size="15" /></template>PIN 5
      </v-btn>
    </template>

    <template #detail="{ item }">
      <div class="detail-wrap">
        <div v-if="detailLoading[item.Nomor]" class="detail-loading">
          <v-progress-circular indeterminate color="primary" size="20" />
          <span class="ml-2 text-caption text-grey"
            >Memuat detail alokasi nota...</span
          >
        </div>
        <div v-else class="detail-panel">
          <div class="panel-head">
            <IconTableOptions :size="14" class="mr-1" />
            Rincian Nota Terbayar untuk No. Bukti Pelunasan:
            <span class="text-warning ml-1">{{ item.Nomor }}</span>
          </div>
          <table class="dtl-table">
            <thead>
              <tr>
                <th style="width: 140px">Invoice / Nota</th>
                <th style="width: 95px" class="tc">Tgl Invoice</th>
                <th style="width: 180px">Nama Customer</th>
                <th style="min-width: 200px">Alamat</th>
                <th style="width: 100px">Tipe Bayar</th>
                <th style="width: 130px">No. Ref / Bukti</th>
                <th style="width: 110px" class="tr">Nilai Bayar</th>
                <th>Keterangan</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(d, i) in detailData[item.Nomor]" :key="i">
                <td class="font-weight-bold text-primary">{{ d.Nota }}</td>
                <td class="tc">{{ d.TglInvoice }}</td>
                <td class="fw text-grey-darken-3">{{ d.Customer }}</td>
                <td style="white-space: normal">{{ d.Alamat }}</td>
                <td>
                  <v-chip size="x-small" color="grey-darken-2" variant="flat">{{
                    d.Bayar
                  }}</v-chip>
                </td>
                <td class="monospace">{{ d.No_bukti || "-" }}</td>
                <td class="tr text-success font-weight-bold">
                  {{ fmtNum(d.Kredit) }}
                </td>
                <td style="white-space: normal; line-height: 1.2">
                  {{ d.Notes }}
                </td>
              </tr>
              <tr v-if="!detailData[item.Nomor]?.length">
                <td colspan="8" class="empty-row">
                  Tidak ada rincian invoice untuk transaksi pelunasan ini.
                </td>
              </tr>
            </tbody>
            <tfoot v-if="detailData[item.Nomor]?.length">
              <tr class="tfoot-row">
                <td colspan="6" class="tr font-weight-bold">
                  TOTAL PELUNASAN NOTA :
                </td>
                <td
                  class="tr text-success font-weight-bold"
                  style="font-size: 11.5px"
                >
                  {{ fmtNum(getTotalKredit(detailData[item.Nomor])) }}
                </td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </template>
  </BaseBrowse>

  <v-dialog v-model="showPinDialog" max-width="450px" persistent>
    <v-card class="rounded-lg">
      <v-card-title class="d-flex align-center pa-4 bg-purple-lighten-5">
        <IconLock :size="20" color="#6a1b9a" class="mr-2" />
        <span class="text-subtitle-1 font-weight-bold text-purple-darken-3"
          >Pengajuan Perubahan Data (PIN 5)</span
        >
      </v-card-title>
      <v-card-text class="pa-4">
        <v-alert
          type="warning"
          variant="tonal"
          density="compact"
          class="text-caption mb-3"
          :icon="IconAlertTriangle"
        >
          Transaksi ini berada pada bulan yang sudah <b>Tutup Buku / Close</b>.
          Anda harus mengajukan alasan pembukaan data kepada Manager.
        </v-alert>
        <div class="text-caption text-grey-darken-2 mb-1">
          Nomor Transaksi: <b>{{ selected[0]?.Nomor }}</b>
        </div>
        <div class="text-caption text-grey-darken-2 mb-3">
          Tanggal: {{ selected[0]?.Tanggal }}
        </div>

        <label class="f-label d-block mb-1"
          >Tulis Alasan Perubahan / Koreksi:</label
        >
        <textarea
          v-model="pinAlasan"
          class="f-textarea w-100"
          rows="4"
          placeholder="Contoh: Salah input nominal bank di invoice nominal aslinya..."
        ></textarea>
      </v-card-text>
      <v-divider />
      <v-card-actions class="pa-3 bg-grey-lighten-4">
        <v-spacer />
        <v-btn
          variant="text"
          size="small"
          class="font-weight-bold"
          :disabled="isSubmittingPin"
          @click="showPinDialog = false"
          >Batal</v-btn
        >
        <v-btn
          color="purple-darken-2"
          variant="elevated"
          size="small"
          class="font-weight-bold px-4 text-white"
          :loading="isSubmittingPin"
          @click="submitPin5"
          >Ajukan Sekarang</v-btn
        >
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style scoped>
/* ── Filter ── */
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

/* ── Detail Wrapper ── */
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

/* ── Panels & Tables ── */
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
.dtl-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 11px;
  table-layout: fixed;
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
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.dtl-table tbody tr:hover td {
  background: #f1f5f9;
}
.dtl-table tfoot tr td {
  background: #e8f5e9;
  padding: 6px 10px;
  border-top: 2px solid #81c784;
  color: #1b5e20;
}

/* ── Helpers ── */
.tc {
  text-align: center !important;
}
.tr {
  text-align: right !important;
}
.fw {
  font-weight: 700;
}
.monospace {
  font-family: monospace;
  font-size: 12px;
}
.empty-row {
  text-align: center;
  color: #9e9e9e;
  padding: 14px;
  font-style: italic;
}

/* ── PIN 5 Modal Styles ── */
.bg-purple-lighten-5 {
  background-color: #f3e5f5;
}
.f-textarea {
  border: 1px solid #ccc;
  border-radius: 4px;
  padding: 8px;
  font-size: 12px;
  outline: none;
  font-family: sans-serif;
  resize: none;
}
.f-textarea:focus {
  border-color: #7b1fa2;
  box-shadow: 0 0 4px rgba(123, 31, 162, 0.2);
}
</style>
