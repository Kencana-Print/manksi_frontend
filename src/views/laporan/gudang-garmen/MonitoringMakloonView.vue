<script setup lang="ts">
import { ref, onMounted, watch, computed } from "vue";
import { useAuthStore } from "@/stores/authStore";
import { useToast } from "vue-toastification";
import PageLayout from "@/components/PageLayout.vue";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import { monitoringMakloonService } from "@/services/laporan/gudang-garmen/monitoringMakloonService";
import { formatTanggalLocale } from "@/utils/dateFormat";
import {
  IconTruckDelivery,
  IconFileSpreadsheet,
  IconRefresh,
  IconX,
} from "@tabler/icons-vue";

interface GroupedRow {
  raw: any;
  groupIndex: number; // nomor urut grup (1, 2, 3, ...)
  isFirstInGroup: boolean;
  rowspan: number;
}

const groupedRows = computed((): GroupedRow[] => {
  const result: GroupedRow[] = [];
  let currentNomor = "";
  let groupCounter = 0;
  let groupStartIdx = -1;

  rows.value.forEach((r, idx) => {
    const isNewGroup = r.NoMaklon !== currentNomor;
    if (isNewGroup) {
      currentNomor = r.NoMaklon;
      groupCounter++;
      groupStartIdx = result.length;
    }
    result.push({
      raw: r,
      groupIndex: groupCounter,
      isFirstInGroup: isNewGroup,
      rowspan: 1,
    });
    if (!isNewGroup && groupStartIdx >= 0) {
      result[groupStartIdx].rowspan++;
    }
  });

  return result;
});

const MENU_ID = "572";
const authStore = useAuthStore();
const toast = useToast();

const toLocalDateStr = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const today = new Date();
const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
const dtAwal = ref(toLocalDateStr(firstDayOfMonth));
const dtAkhir = ref(toLocalDateStr(today));

const cabAsal = ref("ALL");
const cabTujuan = ref("ALL");
const itemAwal = ref("");
const itemJadi = ref("");
const status = ref("ALL");
const userInput = ref("");

const cabangOptions = ref<{ Kode: string; Nama: string }[]>([]);
const STATUS_OPTIONS = [
  "ALL",
  "DRAFT",
  "DIKIRIM",
  "SEBAGIAN DIKIRIM",
  "DITERIMA SEBAGIAN",
  "SELESAI",
];

const rows = ref<any[]>([]);
const isLoading = ref(false);
const canExport = ref(authStore.can(MENU_ID, "view"));

const fetchData = async () => {
  isLoading.value = true;
  try {
    const res = await monitoringMakloonService.getBrowse({
      startDate: dtAwal.value,
      endDate: dtAkhir.value,
      cabAsal: cabAsal.value,
      cabTujuan: cabTujuan.value,
      itemAwal: itemAwal.value.trim(),
      itemJadi: itemJadi.value.trim(),
      status: status.value,
      userInput: userInput.value.trim(),
    });
    rows.value = res.data.data || [];
  } catch (e: any) {
    toast.error(e.response?.data?.message || "Gagal memuat data.");
  } finally {
    isLoading.value = false;
  }
};

watch([dtAwal, dtAkhir, cabAsal, cabTujuan, status], fetchData);

onMounted(async () => {
  try {
    const res = await monitoringMakloonService.getCabangOptions();
    cabangOptions.value = res.data.data;
  } catch {
    console.error("Gagal memuat daftar Cabang.");
  }
  fetchData();
});

const numFmt = (v: any, d = 0) => {
  if (v === null || v === undefined || v === "") return "-";
  return Number(v).toLocaleString("id-ID", {
    minimumFractionDigits: d,
    maximumFractionDigits: d,
  });
};
const fmtTgl = (v: any) => formatTanggalLocale(v);

const statusClass = (s: string) => {
  if (s === "SELESAI") return "st-selesai";
  if (s === "DRAFT") return "st-draft";
  if (s === "DITERIMA SEBAGIAN" || s === "SEBAGIAN DIKIRIM")
    return "st-sebagian";
  if (s === "DIKIRIM") return "st-dikirim";
  return "";
};

// ── Export ──
const isExporting = ref(false);
const onExport = async () => {
  if (!canExport.value) return toast.error("Akses ditolak.");
  if (!rows.value.length) return toast.warning("Tidak ada data.");
  isExporting.value = true;
  try {
    const wb = new ExcelJS.Workbook();
    wb.creator = "MANKSI ERP";
    wb.created = new Date();
    const ws = wb.addWorksheet("MONITORING MAKLON");

    ws.getCell(1, 1).value = "MONITORING STATUS & STOCK TRANSAKSI MAKLON";
    ws.getCell(1, 1).font = { bold: true, size: 12 };
    ws.getCell(2, 1).value =
      `PERIODE : ${fmtTgl(dtAwal.value)} s/d ${fmtTgl(dtAkhir.value)}`;
    ws.getCell(2, 1).font = { bold: true };

    const headers = [
      "No. Maklon",
      "Tanggal",
      "Gudang Asal",
      "Gudang Tujuan",
      "Item Awal",
      "Qty Kirim",
      "Item Jadi (Rencana)",
      "Estimasi Qty",
      "Dateline",
      "Qty Hasil",
      "BS",
      "No. LHK",
      "Status",
      "User Input",
    ];
    headers.forEach((h, i) => (ws.getCell(4, i + 1).value = h));
    ws.getRow(4).font = { bold: true };
    ws.getRow(4).eachCell((cell) => {
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF1565C0" },
      };
      cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
      cell.alignment = { horizontal: "center", vertical: "middle" };
    });

    let jRow = 5;
    for (const r of rows.value) {
      ws.getCell(jRow, 1).value = r.NoMaklon ?? "";
      ws.getCell(jRow, 2).value = fmtTgl(r.Tanggal);
      ws.getCell(jRow, 3).value = `${r.CabAsalKode} - ${r.GudangAsal ?? ""}`;
      ws.getCell(jRow, 4).value =
        `${r.CabTujuanKode} - ${r.GudangTujuan ?? ""}`;
      ws.getCell(jRow, 5).value = `${r.ItemAwalKode} - ${r.ItemAwalNama ?? ""}`;
      ws.getCell(jRow, 6).value = r.QtyKirim ?? 0;
      ws.getCell(jRow, 7).value = `${r.ItemJadiKode} - ${r.ItemJadiNama ?? ""}`;
      ws.getCell(jRow, 8).value = r.EstimasiQty ?? 0;
      ws.getCell(jRow, 9).value = fmtTgl(r.Dateline);
      ws.getCell(jRow, 10).value = r.QtyHasil ?? "";
      ws.getCell(jRow, 11).value = r.Bs ?? "";
      ws.getCell(jRow, 12).value = r.NoLhk ?? "";
      ws.getCell(jRow, 13).value = r.Status ?? "";
      ws.getCell(jRow, 14).value = r.UserInput ?? "";
      jRow++;
    }

    const lastRow = jRow - 1;
    for (let r = 4; r <= lastRow; r++) {
      for (let c = 1; c <= headers.length; c++) {
        ws.getCell(r, c).border = {
          top: { style: "thin" },
          left: { style: "thin" },
          bottom: { style: "thin" },
          right: { style: "thin" },
        };
      }
    }
    ws.columns.forEach((col) => (col.width = 16));
    ws.getColumn(5).width = 26;
    ws.getColumn(7).width = 26;

    const buf = await wb.xlsx.writeBuffer();
    saveAs(
      new Blob([buf], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      }),
      `Monitoring_Makloon_${dtAwal.value}_${dtAkhir.value}.xlsx`,
    );
  } catch {
    toast.error("Gagal export.");
  } finally {
    isExporting.value = false;
  }
};
</script>

<template>
  <PageLayout
    title="Monitoring Status &amp; Stock Transaksi Maklon"
    :menu-id="MENU_ID"
    :icon="IconTruckDelivery"
  >
    <template #header-actions>
      <v-btn
        size="small"
        color="green"
        :loading="isExporting"
        :disabled="!rows.length"
        @click="onExport"
      >
        <template #prepend><IconFileSpreadsheet :size="15" /></template>Export
      </v-btn>
      <v-btn size="small" variant="text" @click="$router.back()">
        <template #prepend><IconX :size="15" :stroke-width="2" /></template
        >Tutup
      </v-btn>
    </template>

    <div class="mkb-wrap">
      <div class="filter-bar">
        <span class="f-label">Periode</span>
        <input type="date" v-model="dtAwal" class="f-date" />
        <span class="f-sep">s.d</span>
        <input type="date" v-model="dtAkhir" class="f-date" />

        <div class="f-divider" />
        <span class="f-label">Gudang Asal</span>
        <select v-model="cabAsal" class="f-date">
          <option value="ALL">SEMUA</option>
          <option v-for="c in cabangOptions" :key="c.Kode" :value="c.Kode">
            {{ c.Kode }}
          </option>
        </select>

        <span class="f-label">Gudang Tujuan</span>
        <select v-model="cabTujuan" class="f-date">
          <option value="ALL">SEMUA</option>
          <option v-for="c in cabangOptions" :key="c.Kode" :value="c.Kode">
            {{ c.Kode }}
          </option>
        </select>

        <span class="f-label">Status</span>
        <select v-model="status" class="f-date">
          <option v-for="s in STATUS_OPTIONS" :key="s" :value="s">
            {{ s === "ALL" ? "SEMUA" : s }}
          </option>
        </select>
      </div>

      <div class="filter-bar">
        <span class="f-label">Item Awal</span>
        <input
          type="text"
          v-model="itemAwal"
          class="f-text"
          placeholder="Kode/nama bahan polos..."
          @keydown.enter="fetchData"
        />
        <span class="f-label">Item Jadi</span>
        <input
          type="text"
          v-model="itemJadi"
          class="f-text"
          placeholder="Kode/nama barang jadi..."
          @keydown.enter="fetchData"
        />
        <span class="f-label">User Input</span>
        <input
          type="text"
          v-model="userInput"
          class="f-text"
          style="width: 100px"
          placeholder="user..."
          @keydown.enter="fetchData"
        />
        <v-btn
          size="small"
          color="primary"
          :loading="isLoading"
          @click="fetchData"
        >
          <template #prepend><IconRefresh :size="14" /></template>Refresh
        </v-btn>
        <v-spacer />
        <span class="chip">{{ rows.length }} baris</span>
      </div>

      <div class="table-scroll">
        <table class="mkb-table">
          <thead>
            <tr>
              <th style="width: 36px">No</th>
              <th style="min-width: 120px">No. Maklon</th>
              <th style="width: 90px">Tanggal</th>
              <th style="min-width: 150px">Gudang Asal</th>
              <th style="min-width: 150px">Gudang Tujuan</th>
              <th style="min-width: 180px">Item Awal</th>
              <th style="width: 90px">Qty Kirim</th>
              <th style="min-width: 180px">Item Jadi (Rencana)</th>
              <th style="width: 90px">Estimasi Qty</th>
              <th style="width: 90px">Dateline</th>
              <th style="width: 80px">Qty Hasil</th>
              <th style="width: 60px">BS</th>
              <th style="min-width: 130px">No. LHK</th>
              <th style="width: 120px">Status</th>
              <th style="width: 80px">User Input</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="isLoading">
              <td colspan="15" class="tc py-4 text-grey">Memuat data...</td>
            </tr>
            <tr v-else-if="!rows.length">
              <td colspan="15" class="tc py-4 text-grey">Tidak ada data.</td>
            </tr>
            <tr v-for="(g, i) in groupedRows" :key="i">
              <template v-if="g.isFirstInGroup">
                <td class="tc" :rowspan="g.rowspan">{{ g.groupIndex }}</td>
                <td class="mono" :rowspan="g.rowspan">{{ g.raw.NoMaklon }}</td>
                <td class="tc" :rowspan="g.rowspan">
                  {{ fmtTgl(g.raw.Tanggal) }}
                </td>
                <td :rowspan="g.rowspan">
                  {{ g.raw.CabAsalKode }} — {{ g.raw.GudangAsal }}
                </td>
                <td :rowspan="g.rowspan">
                  {{ g.raw.CabTujuanKode }} — {{ g.raw.GudangTujuan }}
                </td>
                <td :rowspan="g.rowspan">
                  <div class="mono">{{ g.raw.ItemAwalKode }}</div>
                  <div class="row-subtext">{{ g.raw.ItemAwalNama }}</div>
                </td>
                <td class="tr" :rowspan="g.rowspan">
                  {{ numFmt(g.raw.QtyKirim) }} {{ g.raw.SatuanKirim }}
                </td>
              </template>

              <td>
                <div class="mono">{{ g.raw.ItemJadiKode }}</div>
                <div class="row-subtext">{{ g.raw.ItemJadiNama }}</div>
              </td>
              <td class="tr">{{ numFmt(g.raw.EstimasiQty) }}</td>
              <td class="tc">
                {{ g.raw.Dateline ? fmtTgl(g.raw.Dateline) : "-" }}
              </td>
              <td class="tr">
                {{ g.raw.QtyHasil !== null ? numFmt(g.raw.QtyHasil) : "-" }}
              </td>
              <td class="tr">
                {{ g.raw.Bs !== null ? numFmt(g.raw.Bs) : "-" }}
              </td>
              <td class="mono">{{ g.raw.NoLhk || "-" }}</td>

              <template v-if="g.isFirstInGroup">
                <td class="tc" :rowspan="g.rowspan">
                  <span class="st-chip" :class="statusClass(g.raw.Status)">{{
                    g.raw.Status
                  }}</span>
                </td>
                <td class="tc" :rowspan="g.rowspan">{{ g.raw.UserInput }}</td>
              </template>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </PageLayout>
</template>

<style scoped>
.mkb-wrap {
  display: flex;
  flex-direction: column;
  height: 100%;
}
.filter-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: white;
  border-bottom: 1px solid #e0e0e0;
  flex-shrink: 0;
  flex-wrap: wrap;
}
.f-label {
  font-size: 11px;
  font-weight: 700;
  color: #555;
  white-space: nowrap;
}
.f-date,
.f-text {
  height: 28px;
  border: 1px solid #ccc;
  border-radius: 4px;
  padding: 0 6px;
  font-size: 12px;
  outline: none;
  background: white;
}
.f-text {
  width: 150px;
}
.f-sep {
  font-size: 11px;
  color: #555;
}
.f-divider {
  width: 1px;
  height: 20px;
  background: #ddd;
  margin: 0 4px;
}
.chip {
  font-size: 11px;
  padding: 2px 10px;
  border-radius: 10px;
  font-weight: 500;
  background: #e3f2fd;
  color: #1565c0;
}

.table-scroll {
  flex: 1;
  overflow: auto;
}
.mkb-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 11px;
  white-space: nowrap;
}
.mkb-table thead th {
  background: #1565c0;
  color: #fff;
  font-weight: 700;
  padding: 5px 8px;
  border: 1px solid #0d47a1;
  text-align: center;
  position: sticky;
  top: 0;
  z-index: 2;
}
.mkb-table tbody td {
  padding: 4px 8px;
  border: 1px solid #e0e0e0;
}
.tc {
  text-align: center;
}
.tr {
  text-align: right;
}
.mono {
  font-family: monospace;
  font-size: 10px;
}
.row-subtext {
  font-size: 9px;
  color: #888;
}

.st-chip {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 10px;
  font-weight: 700;
  white-space: nowrap;
}
.st-draft {
  background: #eceff1;
  color: #546e7a;
}
.st-dikirim {
  background: #e3f2fd;
  color: #1565c0;
}
.st-sebagian {
  background: #fff3e0;
  color: #e65100;
}
.st-selesai {
  background: #e8f5e9;
  color: #2e7d32;
}
.mkb-table tbody tr td[rowspan] {
  border-right: 2px solid #90caf9;
}
</style>
