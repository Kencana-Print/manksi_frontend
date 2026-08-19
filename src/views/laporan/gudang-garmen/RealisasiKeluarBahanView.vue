<script setup lang="ts">
import { ref, onMounted, watch } from "vue";
import { useAuthStore } from "@/stores/authStore";
import { useToast } from "vue-toastification";
import PageLayout from "@/components/PageLayout.vue";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import { realisasiKeluarBahanService } from "@/services/laporan/gudang-garmen/realisasiKeluarBahanService";
import { formatTanggal } from "@/utils/dateFormat";
import {
  IconClipboardList,
  IconFileSpreadsheet,
  IconRefresh,
  IconX,
} from "@tabler/icons-vue";

const MENU_ID = "529";
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
const spkNomor = ref("");

const rows = ref<any[]>([]);
const isLoading = ref(false);
const canExport = ref(authStore.can(MENU_ID, "view"));

const fetchData = async () => {
  isLoading.value = true;
  try {
    const res = await realisasiKeluarBahanService.getBrowse(
      dtAwal.value,
      dtAkhir.value,
      spkNomor.value.trim(),
    );
    rows.value = res.data.data || [];
  } catch (e: any) {
    toast.error(e.response?.data?.message || "Gagal memuat data.");
  } finally {
    isLoading.value = false;
  }
};

// Filter tanggal auto-refresh, pencarian No.SPK pakai tombol Refresh manual
// (supaya tidak ngirim request tiap ketik huruf)
watch([dtAwal, dtAkhir], fetchData);

const numFmt = (v: any, d = 2) => {
  if (v === null || v === undefined || v === "") return "";
  return Number(v).toLocaleString("id-ID", {
    minimumFractionDigits: d,
    maximumFractionDigits: d,
  });
};
const fmtTgl = (v: any) => (v ? formatTanggal(v) : "");

const rowClass = (color: string) => {
  if (color === "black") return "txt-black";
  if (color === "red") return "txt-red";
  if (color === "yellow") return "bg-yellow";
  if (color === "green") return "bg-green";
  return "";
};

const statusClass = (status: string) => {
  if (status === "Closed") return "st-closed";
  if (status === "Open") return "st-open";
  return "st-process";
};

// Mapping RowColor -> style Excel (fill utk yellow/green, font color utk black/red)
const applyRowColor = (row: ExcelJS.Row, color: string) => {
  if (color === "yellow") {
    row.eachCell({ includeEmpty: true }, (cell) => {
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFFFF9C4" },
      };
    });
  } else if (color === "green") {
    row.eachCell({ includeEmpty: true }, (cell) => {
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFC8E6C9" },
      };
    });
  } else if (color === "black") {
    row.eachCell({ includeEmpty: true }, (cell) => {
      cell.font = { bold: true, color: { argb: "FF000000" } };
    });
  } else if (color === "red") {
    row.eachCell({ includeEmpty: true }, (cell) => {
      cell.font = { color: { argb: "FFC62828" } };
    });
  }
};

// ── Export ──────────────────────────────────────────────────────────────
const isExporting = ref(false);
const onExport = async () => {
  if (!canExport.value) return toast.error("Akses ditolak.");
  if (!rows.value.length) return toast.warning("Tidak ada data.");
  isExporting.value = true;
  try {
    const wb = new ExcelJS.Workbook();
    wb.creator = "MANKSI ERP";
    wb.created = new Date();
    const ws = wb.addWorksheet("REALISASI KELUAR BAHAN");

    ws.getCell(1, 1).value = "LAPORAN REALISASI KELUAR BAHAN";
    ws.getCell(1, 1).font = { bold: true, size: 12 };
    ws.getCell(2, 1).value =
      `PERIODE TANGGAL SPK : ${formatTanggal(dtAwal.value)} s/d ${formatTanggal(dtAkhir.value)}`;
    ws.getCell(2, 1).font = { bold: true };

    const headers = [
      "SPK",
      "TANGGAL SPK",
      "NAMA SPK",
      "QTY ORDER",
      "KOMPONEN",
      "NAMA BAHAN",
      "SATUAN",
      "STD MAP",
      "STD MKB",
      "NO REALISASI",
      "REALISASI KELUAR",
      "STATUS",
      "NO PERMINTAAN",
      "QTY PERMINTAAN",
      "KETERANGAN",
      "QTY POTONG",
      "WORKSHOP",
      "SELISIH (KG)",
    ];
    headers.forEach((h, i) => (ws.getCell(4, i + 1).value = h));
    ws.getRow(4).font = { bold: true };
    ws.getRow(4).eachCell((cell) => {
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF87CEEB" },
      };
      cell.alignment = { horizontal: "center", vertical: "middle" };
    });

    let jRow = 5;
    for (const r of rows.value) {
      ws.getCell(jRow, 1).value = r.Spk ?? "";
      ws.getCell(jRow, 2).value = fmtTgl(r.TanggalSpk);
      ws.getCell(jRow, 3).value = r.NamaSpk ?? "";
      ws.getCell(jRow, 4).value = r.QtyOrder ?? 0;
      ws.getCell(jRow, 5).value = r.Komponen ?? "";
      ws.getCell(jRow, 6).value = r.NamaBahan ?? "";
      ws.getCell(jRow, 7).value = r.Satuan ?? "";
      ws.getCell(jRow, 8).value = r.StdMap ?? 0;
      ws.getCell(jRow, 9).value = r.StdMkb ?? 0;
      ws.getCell(jRow, 10).value = r.NoRealisasi ?? "";
      ws.getCell(jRow, 11).value = r.RealisasiKeluar ?? 0;
      ws.getCell(jRow, 12).value = r.Status ?? "";
      ws.getCell(jRow, 13).value = r.NoPermintaan ?? "";
      ws.getCell(jRow, 14).value = r.QtyPermintaan ?? 0;
      ws.getCell(jRow, 15).value = r.Keterangan ?? "";
      ws.getCell(jRow, 16).value = r.QtyPotong ?? 0;
      ws.getCell(jRow, 17).value = r.Workshop ?? "";
      ws.getCell(jRow, 18).value = r.SelisihKg ?? 0;

      applyRowColor(ws.getRow(jRow), r.RowColor || "");

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
    ws.getColumn(3).width = 30;
    ws.getColumn(6).width = 24;
    ws.getColumn(15).width = 20;

    const buf = await wb.xlsx.writeBuffer();
    saveAs(
      new Blob([buf], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      }),
      `Realisasi_Keluar_Bahan_${dtAwal.value}_${dtAkhir.value}.xlsx`,
    );
  } catch {
    toast.error("Gagal export.");
  } finally {
    isExporting.value = false;
  }
};

onMounted(fetchData);
</script>

<template>
  <PageLayout
    title="Laporan Realisasi Keluar Bahan"
    :menu-id="MENU_ID"
    :icon="IconClipboardList"
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
        <template #prepend><IconX :size="15" :stroke-width="2" /></template>
        Tutup
      </v-btn>
    </template>

    <div class="mkb-wrap">
      <div class="filter-bar">
        <span class="f-label">Tgl. SPK</span>
        <input type="date" v-model="dtAwal" class="f-date" />
        <span class="f-sep">s.d</span>
        <input type="date" v-model="dtAkhir" class="f-date" />
        <div class="f-divider" />
        <span class="f-label">No. SPK</span>
        <input
          type="text"
          v-model="spkNomor"
          class="f-text"
          placeholder="Kosongkan untuk semua..."
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

      <div class="legend-bar">
        <span class="lg-item"
          ><span class="txt-sample txt-black">Aa</span> Closed penuh (potong ≥
          order)</span
        >
        <span class="lg-item"
          ><span class="dot dot-yellow" /> Closed tapi potong &lt; order</span
        >
        <span class="lg-item"
          ><span class="dot dot-green" /> Masih open, potong sudah ≥ order</span
        >
        <span class="lg-item"
          ><span class="txt-sample txt-red">Aa</span> Masih open, potong &lt;
          order</span
        >
      </div>

      <div class="table-scroll">
        <table class="mkb-table">
          <thead>
            <tr>
              <th style="min-width: 120px">SPK</th>
              <th style="width: 90px">Tgl SPK</th>
              <th style="min-width: 200px">Nama SPK</th>
              <th style="width: 70px">Qty Order</th>
              <th style="min-width: 140px">Komponen</th>
              <th style="min-width: 160px">Nama Bahan</th>
              <th style="width: 60px">Satuan</th>
              <th style="width: 70px">Std MAP</th>
              <th style="width: 70px">Std MKB</th>
              <th style="min-width: 110px">No Realisasi</th>
              <th style="width: 90px">Realisasi Keluar</th>
              <th style="width: 80px">Status</th>
              <th style="min-width: 110px">No Permintaan</th>
              <th style="width: 90px">Qty Permintaan</th>
              <th style="min-width: 140px">Keterangan</th>
              <th style="width: 80px">Qty Potong</th>
              <th style="width: 80px">Workshop</th>
              <th style="width: 80px">Selisih (KG)</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="isLoading">
              <td colspan="18" class="tc py-4 text-grey">Memuat data...</td>
            </tr>
            <tr v-else-if="!rows.length">
              <td colspan="18" class="tc py-4 text-grey">Tidak ada data.</td>
            </tr>
            <tr v-for="(r, i) in rows" :key="i" :class="rowClass(r.RowColor)">
              <td>{{ r.Spk }}</td>
              <td class="tc">{{ fmtTgl(r.TanggalSpk) }}</td>
              <td>{{ r.NamaSpk }}</td>
              <td class="tr">{{ numFmt(r.QtyOrder, 0) }}</td>
              <td>{{ r.Komponen }}</td>
              <td>{{ r.NamaBahan }}</td>
              <td class="tc">{{ r.Satuan }}</td>
              <td class="tr">{{ numFmt(r.StdMap) }}</td>
              <td class="tr">{{ numFmt(r.StdMkb) }}</td>
              <td class="mono">{{ r.NoRealisasi }}</td>
              <td class="tr">{{ numFmt(r.RealisasiKeluar) }}</td>
              <td class="tc">
                <span class="st-badge" :class="statusClass(r.Status)">{{
                  r.Status
                }}</span>
              </td>
              <td class="mono">{{ r.NoPermintaan }}</td>
              <td class="tr">{{ numFmt(r.QtyPermintaan) }}</td>
              <td>{{ r.Keterangan }}</td>
              <td class="tr">{{ numFmt(r.QtyPotong, 0) }}</td>
              <td>{{ r.Workshop }}</td>
              <td
                class="tr"
                :style="r.SelisihKg < 0 ? 'color:#c62828;font-weight:700' : ''"
              >
                {{ numFmt(r.SelisihKg) }}
              </td>
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
  width: 160px;
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
.legend-bar {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 6px 12px;
  background: #fafafa;
  border-bottom: 1px solid #eee;
  flex-shrink: 0;
  font-size: 10.5px;
  color: #555;
  flex-wrap: wrap;
}
.lg-item {
  display: flex;
  align-items: center;
  gap: 5px;
}
.txt-sample {
  font-weight: 700;
  font-size: 11px;
}
.dot {
  width: 10px;
  height: 10px;
  border-radius: 2px;
  display: inline-block;
}
.dot-yellow {
  background: #fff9c4;
  border: 1px solid #d4c341;
}
.dot-green {
  background: #c8e6c9;
  border: 1px solid #6bab6e;
}

/* ── Warna baris ── */
.txt-black td {
  color: #000 !important;
  font-weight: 700;
}
.txt-red td {
  color: #c62828 !important;
}
.bg-yellow td {
  background: #fff9c4 !important;
}
.bg-green td {
  background: #c8e6c9 !important;
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
  background: #87ceeb;
  color: #000;
  font-weight: 700;
  padding: 5px 8px;
  border: 1px solid #6ba8c4;
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

/* ── Warna baris sesuai spesifikasi ── */
.row-black td {
  background: #212121 !important;
  color: #fff !important;
}
.row-yellow td {
  background: #fff9c4 !important;
}
.row-green td {
  background: #e8f5e9 !important;
}

.st-badge {
  display: inline-block;
  padding: 1px 8px;
  border-radius: 8px;
  font-size: 10px;
  font-weight: 700;
}
.st-closed {
  background: #e8f5e9;
  color: #2e7d32;
}
.st-open {
  background: #ffebee;
  color: #c62828;
}
.st-process {
  background: #e3f2fd;
  color: #1565c0;
}
/* Badge status tetap kebaca kontras walau baris hitam */
.row-black .st-badge {
  background: rgba(255, 255, 255, 0.15) !important;
  color: #fff !important;
}
</style>
