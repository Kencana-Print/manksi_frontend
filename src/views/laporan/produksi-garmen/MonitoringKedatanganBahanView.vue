<script setup lang="ts">
import { ref, onMounted, watch } from "vue";
import { useAuthStore } from "@/stores/authStore";
import { useToast } from "vue-toastification";
import PageLayout from "@/components/PageLayout.vue";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import { monitoringKedatanganBahanService } from "@/services/laporan/produksi-garmen/monitoringKedatanganBahanService";
import { formatTanggal } from "@/utils/dateFormat";
import {
  IconTruckDelivery,
  IconFileSpreadsheet,
  IconRefresh,
  IconX,
} from "@tabler/icons-vue";

const MENU_ID = "557";
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

const cab = ref("P04");
const mapSpk = ref("ALL");
const ket = ref("");

const rows = ref<any[]>([]);
const isLoading = ref(false);
const canExport = ref(authStore.can(MENU_ID, "view"));

const fetchData = async () => {
  isLoading.value = true;
  try {
    const res = await monitoringKedatanganBahanService.getFlattenedRows(
      dtAwal.value,
      dtAkhir.value,
      cab.value,
      mapSpk.value,
      ket.value,
    );
    rows.value = res.data.data || [];
  } catch (e: any) {
    toast.error(e.response?.data?.message || "Gagal memuat data.");
  } finally {
    isLoading.value = false;
  }
};

watch([dtAwal, dtAkhir, cab, mapSpk, ket], fetchData);

const numFmt = (v: any, d = 2) => {
  if (v === null || v === undefined || v === "") return "";
  return Number(v).toLocaleString("id-ID", {
    minimumFractionDigits: d,
    maximumFractionDigits: d,
  });
};
const fmtTgl = (v: any) => (v ? formatTanggal(v) : "");

// ── Export — reuse data yang sama persis dengan yang di-render ──
const isExporting = ref(false);
const onExport = async () => {
  if (!canExport.value) return toast.error("Akses ditolak.");
  if (!rows.value.length) return toast.warning("Tidak ada data.");
  isExporting.value = true;
  try {
    const wb = new ExcelJS.Workbook();
    wb.creator = "MANKSI ERP";
    wb.created = new Date();
    const ws = wb.addWorksheet("MONITOR DATANG BAHAN");

    ws.getCell(1, 1).value = "LAPORAN MONITORING KEDATANGAN BAHAN CUTTING";
    ws.getCell(1, 1).font = { bold: true, size: 12 };
    ws.getCell(2, 1).value =
      `TANGGAL PERMINTAAN : ${formatTanggal(dtAwal.value)} s/d ${formatTanggal(dtAkhir.value)}`;
    ws.getCell(2, 1).font = { bold: true };
    ws.getCell(3, 1).value = `CABANG : ${cab.value}`;
    ws.getCell(3, 1).font = { bold: true };

    const mergeSingle = (col: number, label: string) => {
      ws.mergeCells(4, col, 5, col);
      ws.getCell(4, col).value = label;
    };
    mergeSingle(1, "NO");
    mergeSingle(2, "NAMA SPK");
    mergeSingle(3, "NO SPK");
    mergeSingle(4, "FINISHING");
    mergeSingle(5, "SPK TERBIT");
    mergeSingle(6, "DATELINE");
    mergeSingle(7, "JML SPK");
    mergeSingle(8, "KOMPONEN");
    ws.mergeCells(4, 9, 4, 11);
    ws.getCell(4, 9).value = "PENGAJUAN";
    ws.mergeCells(4, 12, 4, 13);
    ws.getCell(4, 12).value = "DATANG";
    ws.mergeCells(4, 14, 4, 15);
    ws.getCell(4, 14).value = "CUTTING";
    ws.mergeCells(4, 16, 4, 18);
    ws.getCell(4, 16).value = "SELISIH HARI";
    ws.mergeCells(4, 19, 4, 20);
    ws.getCell(4, 19).value = "SELISIH QTY";
    mergeSingle(21, "KETERANGAN");

    const subHeaders: [number, string][] = [
      [9, "TANGGAL"],
      [10, "QTY"],
      [11, "SATUAN"],
      [12, "TANGGAL"],
      [13, "QTY"],
      [14, "TANGGAL"],
      [15, "QTY"],
      [16, "PENGAJUAN vs SPK"],
      [17, "DATANG vs SPK"],
      [18, "CUTT vs SPK"],
      [19, "DATANG vs PENGAJUAN"],
      [20, "CUTT vs DATANG"],
    ];
    for (const [col, label] of subHeaders) ws.getCell(5, col).value = label;

    const skyBlue = "FF87CEEB";
    const yellow = "FFFFFF00";
    for (let r = 4; r <= 5; r++) {
      for (let c = 1; c <= 21; c++) {
        const cell = ws.getCell(r, c);
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: skyBlue },
        };
        cell.font = { bold: true };
        cell.alignment = {
          horizontal: "center",
          vertical: "middle",
          wrapText: true,
        };
      }
    }
    for (const c of [9, 10, 11, 14, 15]) {
      ws.getCell(4, c).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: yellow },
      };
      ws.getCell(5, c).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: yellow },
      };
    }
    ws.getRow(1).font = { bold: true };
    ws.getRow(2).font = { bold: true };
    ws.getRow(3).font = { bold: true };

    let jRow = 6;
    for (const r of rows.value) {
      ws.getCell(jRow, 1).value = r.No ?? "";
      ws.getCell(jRow, 2).value = r.NamaSpk ?? "";
      ws.getCell(jRow, 3).value = r.SpkNomor ?? "";
      ws.getCell(jRow, 4).value = r.Finishing ?? "";
      ws.getCell(jRow, 5).value = fmtTgl(r.SpkTerbit);
      ws.getCell(jRow, 6).value = fmtTgl(r.SpkDateline);
      ws.getCell(jRow, 7).value = r.JmlSpk ?? "";
      ws.getCell(jRow, 8).value = r.Komponen ?? "";
      ws.getCell(jRow, 9).value = fmtTgl(r.TglMinta);
      ws.getCell(jRow, 10).value = r.QtyMinta ?? "";
      ws.getCell(jRow, 11).value = r.Satuan ?? "";
      ws.getCell(jRow, 12).value = fmtTgl(r.TglDatang);
      ws.getCell(jRow, 13).value = r.QtyDatang ?? "";
      ws.getCell(jRow, 14).value = fmtTgl(r.TglCutting);
      ws.getCell(jRow, 15).value = r.QtyCutting ?? "";
      ws.getCell(jRow, 16).value = r.SelisihPengajuanVsSpk ?? "";
      ws.getCell(jRow, 17).value = r.SelisihDatangVsSpk ?? "";
      ws.getCell(jRow, 18).value = r.SelisihCuttVsSpk ?? "";
      ws.getCell(jRow, 19).value = r.SelisihDatangVsPengajuan ?? "";
      ws.getCell(jRow, 20).value = r.SelisihCuttVsDatang ?? "";
      ws.getCell(jRow, 21).value = r.Keterangan ?? "";
      jRow++;
    }
    const lastRow = jRow - 1;

    for (let r = 4; r <= lastRow; r++) {
      for (let c = 1; c <= 21; c++) {
        ws.getCell(r, c).border = {
          top: { style: "thin" },
          left: { style: "thin" },
          bottom: { style: "thin" },
          right: { style: "thin" },
        };
      }
    }

    ws.getColumn(1).width = 5;
    ws.getColumn(2).width = 32;
    ws.getColumn(4).width = 24;
    ws.getColumn(8).width = 22;
    ws.getRow(5).height = 32;
    for (let c = 9; c <= 20; c++) ws.getColumn(c).width = 12;
    ws.getColumn(21).width = 14;

    const buf = await wb.xlsx.writeBuffer();
    saveAs(
      new Blob([buf], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      }),
      `Monitoring_Kedatangan_Bahan_${dtAwal.value}_${dtAkhir.value}.xlsx`,
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
    title="Laporan Monitoring Kedatangan Bahan"
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
        <template #prepend><IconX :size="15" :stroke-width="2" /></template>
        Tutup
      </v-btn>
    </template>

    <div class="mkb-wrap">
      <div class="filter-bar">
        <span class="f-label">Tgl. Permintaan</span>
        <input type="date" v-model="dtAwal" class="f-date" />
        <span class="f-sep">s.d</span>
        <input type="date" v-model="dtAkhir" class="f-date" />

        <div class="f-divider" />

        <span class="f-label">Cabang</span>
        <select v-model="cab" class="f-select">
          <option value="ALL">ALL</option>
          <option value="P01">P01</option>
          <option value="P04">P04</option>
        </select>

        <div class="f-divider" />

        <span class="f-label">MAP/SPK</span>
        <select v-model="mapSpk" class="f-select">
          <option value="ALL">ALL</option>
          <option value="MAP">MAP</option>
          <option value="SPK">SPK</option>
        </select>

        <div class="f-divider" />

        <span class="f-label">Keterangan</span>
        <select v-model="ket" class="f-select">
          <option value="">Semua</option>
          <option value="BARU">BARU</option>
          <option value="GANTI BS">GANTI BS</option>
          <option value="GANTI HILANG">GANTI HILANG</option>
          <option value="LAIN-LAIN">LAIN-LAIN</option>
        </select>

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
              <th rowspan="2" class="tc">NO</th>
              <th rowspan="2" style="min-width: 220px">NAMA SPK</th>
              <th rowspan="2" style="min-width: 120px">NO SPK</th>
              <th rowspan="2" style="min-width: 180px">FINISHING</th>
              <th rowspan="2" style="width: 90px">SPK TERBIT</th>
              <th rowspan="2" style="width: 90px">DATELINE</th>
              <th rowspan="2" style="width: 70px">JML SPK</th>
              <th rowspan="2" style="min-width: 160px">KOMPONEN</th>
              <th colspan="3" class="grp-yellow">PENGAJUAN</th>
              <th colspan="2">DATANG</th>
              <th colspan="2" class="grp-yellow">CUTTING</th>
              <th colspan="3">SELISIH HARI</th>
              <th colspan="2">SELISIH QTY</th>
              <th rowspan="2" style="min-width: 110px">KETERANGAN</th>
            </tr>
            <tr>
              <th class="grp-yellow">TANGGAL</th>
              <th class="grp-yellow">QTY</th>
              <th class="grp-yellow">SATUAN</th>
              <th>TANGGAL</th>
              <th>QTY</th>
              <th class="grp-yellow">TANGGAL</th>
              <th class="grp-yellow">QTY</th>
              <th style="width: 90px">PENGAJUAN vs SPK</th>
              <th style="width: 90px">DATANG vs SPK</th>
              <th style="width: 90px">CUTT vs SPK</th>
              <th style="width: 100px">DATANG vs PENGAJUAN</th>
              <th style="width: 100px">CUTT vs DATANG</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="isLoading">
              <td colspan="21" class="tc py-4 text-grey">Memuat data...</td>
            </tr>
            <tr v-else-if="!rows.length">
              <td colspan="21" class="tc py-4 text-grey">Tidak ada data.</td>
            </tr>
            <tr v-for="(r, i) in rows" :key="r._rowKey ?? i">
              <td class="tc">{{ r.No ?? "" }}</td>
              <td>{{ r.NamaSpk ?? "" }}</td>
              <td>{{ r.SpkNomor ?? "" }}</td>
              <td>{{ r.Finishing ?? "" }}</td>
              <td class="tc">{{ fmtTgl(r.SpkTerbit) }}</td>
              <td class="tc">{{ fmtTgl(r.SpkDateline) }}</td>
              <td class="tr">{{ numFmt(r.JmlSpk, 0) }}</td>
              <td>{{ r.Komponen ?? "" }}</td>
              <td class="tc">{{ fmtTgl(r.TglMinta) }}</td>
              <td class="tr">{{ numFmt(r.QtyMinta) }}</td>
              <td>{{ r.Satuan ?? "" }}</td>
              <td class="tc">{{ fmtTgl(r.TglDatang) }}</td>
              <td class="tr">{{ numFmt(r.QtyDatang) }}</td>
              <td class="tc">{{ fmtTgl(r.TglCutting) }}</td>
              <td class="tr">{{ numFmt(r.QtyCutting) }}</td>
              <td class="tr">{{ r.SelisihPengajuanVsSpk }}</td>
              <td class="tr">{{ r.SelisihDatangVsSpk }}</td>
              <td class="tr">{{ r.SelisihCuttVsSpk }}</td>
              <td class="tr">{{ numFmt(r.SelisihDatangVsPengajuan) }}</td>
              <td class="tr">{{ numFmt(r.SelisihCuttVsDatang) }}</td>
              <td>{{ r.Keterangan ?? "" }}</td>
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
.f-select {
  height: 28px;
  border: 1px solid #ccc;
  border-radius: 4px;
  padding: 0 6px;
  font-size: 12px;
  outline: none;
  background: white;
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
.mkb-table thead tr:first-child th {
  top: 0;
}
.mkb-table thead tr:nth-child(2) th {
  top: 27px;
}
.grp-yellow {
  background: #fff9c4 !important;
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
</style>
