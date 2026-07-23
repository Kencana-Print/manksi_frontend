<script setup lang="ts">
import { ref, onMounted, watch, computed } from "vue";
import { useAuthStore } from "@/stores/authStore";
import { useToast } from "vue-toastification";
import PageLayout from "@/components/PageLayout.vue";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import { outstandingBordirService } from "@/services/laporan/produksi-garmen/outstandingBordirService";
import { formatTanggal } from "@/utils/dateFormat";
import {
  IconAlertTriangle,
  IconFileSpreadsheet,
  IconRefresh,
  IconX,
} from "@tabler/icons-vue";

const MENU_ID = "558";
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
const cab = ref("P04");

const rows = ref<any[]>([]);
const isLoading = ref(false);
const canExport = ref(authStore.can(MENU_ID, "view"));

const totalJam = computed(() =>
  rows.value.reduce((s, r) => s + Number(r.OutstandingJam || 0), 0),
);
const totalJkn = computed(() =>
  rows.value.reduce((s, r) => s + Number(r.OutstandingJkn || 0), 0),
);

const fetchData = async () => {
  isLoading.value = true;
  try {
    const res = await outstandingBordirService.getBrowse(
      dtAwal.value,
      cab.value,
    );
    rows.value = res.data.data || [];
  } catch (e: any) {
    toast.error(e.response?.data?.message || "Gagal memuat data.");
  } finally {
    isLoading.value = false;
  }
};

watch([dtAwal, cab], fetchData);

const numFmt = (v: any, d = 0) => {
  if (v === null || v === undefined || v === "") return "";
  return Number(v).toLocaleString("id-ID", {
    minimumFractionDigits: d,
    maximumFractionDigits: d,
  });
};
const pctFmt = (v: any) => {
  if (v === null || v === undefined || v === "") return "";
  return `${Math.round(Number(v) * 100)}%`;
};
const fmtTgl = (v: any) => (v ? formatTanggal(v) : "");

// ── Export — reuse data browse, header 2 baris merged ──
const isExporting = ref(false);
const onExport = async () => {
  if (!canExport.value) return toast.error("Akses ditolak.");
  if (!rows.value.length) return toast.warning("Tidak ada data.");
  isExporting.value = true;
  try {
    const wb = new ExcelJS.Workbook();
    wb.creator = "MANKSI ERP";
    wb.created = new Date();
    const ws = wb.addWorksheet("Outstanding Bordir");

    ws.getCell(1, 1).value = "OUTSTANDING BORDIR";
    ws.getCell(1, 1).font = { bold: true, size: 12 };
    ws.getCell(2, 1).value = `GARMEN ${cab.value}`;
    ws.getCell(2, 1).font = { bold: true };
    ws.getCell(3, 1).value =
      `SPK dari Tanggal : ${formatTanggal(dtAwal.value)}`;
    ws.getCell(3, 1).font = { bold: true };

    const mergeSingle = (col: number, label: string) => {
      ws.mergeCells(4, col, 5, col);
      ws.getCell(4, col).value = label;
    };
    mergeSingle(1, "NO");
    mergeSingle(2, "SPK");
    mergeSingle(3, "TANGGAL");
    mergeSingle(4, "CAB");
    mergeSingle(5, "MAP");
    mergeSingle(6, "NAMA SPK");
    mergeSingle(7, "ORDER");
    mergeSingle(8, "TITIK BORDIR");
    mergeSingle(9, "TOTAL BORDIR");
    ws.mergeCells(4, 10, 4, 11);
    ws.getCell(4, 10).value = "LHK";
    ws.mergeCells(4, 12, 4, 13);
    ws.getCell(4, 12).value = "KEKURANGAN PRODUKSI";
    mergeSingle(14, "SUDAH SELESAI");
    ws.mergeCells(4, 15, 4, 23);
    ws.getCell(4, 15).value = "JUMLAH STICH BORDIR";
    mergeSingle(24, "TOTAL STICH");
    mergeSingle(25, "TOTAL STICH x KURANG PRODUKSI");
    mergeSingle(26, "KEPALA MESIN BORDIR (HEAD)");
    mergeSingle(27, "OUT STANDING (JAM)");
    mergeSingle(28, "OUT STANDING (JKN)");
    mergeSingle(29, "NOTE");

    ws.getCell(5, 10).value = "PCS";
    ws.getCell(5, 11).value = "TITIK";
    ws.getCell(5, 12).value = "PCS";
    ws.getCell(5, 13).value = "TITIK";
    const stitchLabels = [
      "MATA KANAN",
      "MATA KANAN 2",
      "MATA KIRI",
      "MATA KIRI 2",
      "MATA BLKG",
      "MATA LENGAN KANAN",
      "MATA LENGAN KIRI",
      "KRAH",
      "LAIN-LAIN",
    ];
    stitchLabels.forEach((lbl, i) => (ws.getCell(5, 15 + i).value = lbl));

    const skyBlue = "FF87CEEB";
    const yellow = "FFFFFF00";
    for (let r = 4; r <= 5; r++) {
      for (let c = 1; c <= 29; c++) {
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
    for (let c = 10; c <= 13; c++) {
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
    let no = 1;
    for (const r of rows.value) {
      ws.getCell(jRow, 1).value = no;
      ws.getCell(jRow, 2).value = r.SPK;
      ws.getCell(jRow, 3).value = fmtTgl(r.Tanggal);
      ws.getCell(jRow, 4).value = r.Cab;
      ws.getCell(jRow, 5).value = r.Map;
      ws.getCell(jRow, 6).value = r.Nama;
      ws.getCell(jRow, 7).value = Number(r.Qty || 0);
      ws.getCell(jRow, 8).value = Number(r.Titik || 0);
      ws.getCell(jRow, 9).value = Number(r.TotalBordir || 0);
      ws.getCell(jRow, 10).value = Number(r.LhkPcs || 0);
      ws.getCell(jRow, 11).value = Number(r.Lhk || 0);
      ws.getCell(jRow, 12).value = Number(r.KurangPcs || 0);
      ws.getCell(jRow, 13).value = Number(r.KurangTitik || 0);
      ws.getCell(jRow, 14).value = Number(r.SelesaiPct || 0);
      ws.getCell(jRow, 15).value = r.MataKanan ?? "";
      ws.getCell(jRow, 16).value = r.MataKanan2 ?? "";
      ws.getCell(jRow, 17).value = r.MataKiri ?? "";
      ws.getCell(jRow, 18).value = r.MataKiri2 ?? "";
      ws.getCell(jRow, 19).value = r.MataBlkg ?? "";
      ws.getCell(jRow, 20).value = r.MataLenganKanan ?? "";
      ws.getCell(jRow, 21).value = r.MataLenganKiri ?? "";
      ws.getCell(jRow, 22).value = r.Krah ?? "";
      ws.getCell(jRow, 23).value = r.LainLain ?? "";
      ws.getCell(jRow, 24).value = Number(r.TotalStitch || 0);
      ws.getCell(jRow, 25).value = Number(r.TotalStitchXKurang || 0);
      ws.getCell(jRow, 26).value = Number(r.KepalaMesin || 0);
      ws.getCell(jRow, 27).value = Number(r.OutstandingJam || 0);
      ws.getCell(jRow, 28).value = Number(r.OutstandingJkn || 0);
      ws.getCell(jRow, 29).value = r.Note || "";
      jRow++;
      no++;
    }
    const lastDataRow = jRow - 1;

    // ── Footer: TOTAL KERJA / HARI KERJA ──
    const totalJam = rows.value.reduce(
      (s, r) => s + Number(r.OutstandingJam || 0),
      0,
    );
    const totalJkn = rows.value.reduce(
      (s, r) => s + Number(r.OutstandingJkn || 0),
      0,
    );

    ws.getCell(jRow, 25).value = "TOTAL KERJA";
    ws.getCell(jRow, 26).value = "JAM";
    ws.getCell(jRow, 27).value = totalJam;
    jRow++;
    ws.getCell(jRow, 25).value = "HARI KERJA";
    ws.getCell(jRow, 26).value = "7 JK/HARI";
    ws.getCell(jRow, 27).value = totalJam / 7;
    ws.getCell(jRow, 28).value = totalJkn;
    jRow++;
    ws.getCell(jRow, 25).value = "HARI KERJA";
    ws.getCell(jRow, 26).value = "10 JK/HARI";
    ws.getCell(jRow, 27).value = totalJam / 10;
    const footerLastRow = jRow;

    for (let r = footerLastRow - 2; r <= footerLastRow; r++) {
      for (let c = 25; c <= 28; c++) {
        ws.getCell(r, c).fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: yellow },
        };
      }
    }

    for (let r = 4; r <= footerLastRow; r++) {
      for (let c = 1; c <= 29; c++) {
        ws.getCell(r, c).border = {
          top: { style: "thin" },
          left: { style: "thin" },
          bottom: { style: "thin" },
          right: { style: "thin" },
        };
      }
    }
    for (let r = 6; r <= lastDataRow; r++) {
      for (let c = 7; c <= 13; c++) ws.getCell(r, c).numFmt = "#,##0";
      ws.getCell(r, 14).numFmt = "0%";
      for (let c = 15; c <= 26; c++) ws.getCell(r, c).numFmt = "#,##0";
      ws.getCell(r, 27).numFmt = "#,##0.0";
      ws.getCell(r, 28).numFmt = "#,##0.0";
    }

    ws.getColumn(1).width = 5;
    ws.getColumn(6).width = 45;
    for (let c = 7; c <= 23; c++) ws.getColumn(c).width = 8;
    ws.getColumn(24).width = 10;
    for (let c = 25; c <= 28; c++) ws.getColumn(c).width = 12;
    ws.getColumn(5).hidden = true;

    const buf = await wb.xlsx.writeBuffer();
    saveAs(
      new Blob([buf], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      }),
      `Outstanding_Bordir_${dtAwal.value}.xlsx`,
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
    title="Outstanding Bordir"
    :menu-id="MENU_ID"
    :icon="IconAlertTriangle"
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

    <div class="ob-wrap">
      <div class="filter-bar">
        <span class="f-label">SPK dari Tanggal</span>
        <input type="date" v-model="dtAwal" class="f-date" />

        <div class="f-divider" />

        <span class="f-label">Cabang</span>
        <select v-model="cab" class="f-select">
          <option value="ALL">ALL</option>
          <option value="P01">P01</option>
          <option value="P04">P04</option>
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
        <span class="chip">{{ rows.length }} SPK</span>
      </div>

      <div class="table-scroll">
        <table class="ob-table">
          <thead>
            <tr>
              <th rowspan="2" class="tc">NO</th>
              <th rowspan="2" style="min-width: 120px">SPK</th>
              <th rowspan="2" style="width: 90px">TANGGAL</th>
              <th rowspan="2" style="width: 50px">CAB</th>
              <th rowspan="2" style="min-width: 260px">NAMA SPK</th>
              <th rowspan="2" style="width: 70px">ORDER</th>
              <th rowspan="2" style="width: 80px">TITIK BORDIR</th>
              <th rowspan="2" style="width: 80px">TOTAL BORDIR</th>
              <th colspan="2" class="grp-yellow">LHK</th>
              <th colspan="2" class="grp-yellow">KEKURANGAN PRODUKSI</th>
              <th rowspan="2" style="width: 80px">SUDAH SELESAI</th>
              <th colspan="9">JUMLAH STICH BORDIR</th>
              <th rowspan="2" style="width: 90px">TOTAL STICH</th>
              <th rowspan="2" style="width: 100px">
                TOTAL STICH x KURANG PRODUKSI
              </th>
              <th rowspan="2" style="width: 70px">
                KEPALA MESIN BORDIR (HEAD)
              </th>
              <th rowspan="2" style="width: 90px">OUT STANDING (JAM)</th>
              <th rowspan="2" style="width: 90px">OUT STANDING (JKN)</th>
              <th rowspan="2" style="min-width: 150px">NOTE</th>
            </tr>
            <tr>
              <th class="grp-yellow">PCS</th>
              <th class="grp-yellow">TITIK</th>
              <th class="grp-yellow">PCS</th>
              <th class="grp-yellow">TITIK</th>
              <th>MATA KANAN</th>
              <th>MATA KANAN 2</th>
              <th>MATA KIRI</th>
              <th>MATA KIRI 2</th>
              <th>MATA BLKG</th>
              <th>MATA LENGAN KANAN</th>
              <th>MATA LENGAN KIRI</th>
              <th>KRAH</th>
              <th>LAIN-LAIN</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="isLoading">
              <td colspan="24" class="tc py-4 text-grey">Memuat data...</td>
            </tr>
            <tr v-else-if="!rows.length">
              <td colspan="24" class="tc py-4 text-grey">Tidak ada data.</td>
            </tr>
            <tr v-for="(r, i) in rows" :key="r.SPK">
              <td class="tc">{{ i + 1 }}</td>
              <td>{{ r.SPK }}</td>
              <td class="tc">{{ fmtTgl(r.Tanggal) }}</td>
              <td class="tc">{{ r.Cab }}</td>
              <td>{{ r.Nama }}</td>
              <td class="tr">{{ numFmt(r.Qty) }}</td>
              <td class="tr">{{ numFmt(r.Titik) }}</td>
              <td class="tr">{{ numFmt(r.TotalBordir) }}</td>
              <td class="tr">{{ numFmt(r.LhkPcs) }}</td>
              <td class="tr">{{ numFmt(r.Lhk) }}</td>
              <td class="tr">{{ numFmt(r.KurangPcs) }}</td>
              <td class="tr">{{ numFmt(r.KurangTitik) }}</td>
              <td class="tr">{{ pctFmt(r.SelesaiPct) }}</td>
              <td class="tr">{{ numFmt(r.MataKanan) }}</td>
              <td class="tr">{{ numFmt(r.MataKanan2) }}</td>
              <td class="tr">{{ numFmt(r.MataKiri) }}</td>
              <td class="tr">{{ numFmt(r.MataKiri2) }}</td>
              <td class="tr">{{ numFmt(r.MataBlkg) }}</td>
              <td class="tr">{{ numFmt(r.MataLenganKanan) }}</td>
              <td class="tr">{{ numFmt(r.MataLenganKiri) }}</td>
              <td class="tr">{{ numFmt(r.Krah) }}</td>
              <td class="tr">{{ numFmt(r.LainLain) }}</td>
              <td class="tr">{{ numFmt(r.TotalStitch) }}</td>
              <td class="tr">{{ numFmt(r.TotalStitchXKurang) }}</td>
              <td class="tr">{{ numFmt(r.KepalaMesin) }}</td>
              <td class="tr">{{ numFmt(r.OutstandingJam, 1) }}</td>
              <td class="tr">{{ numFmt(r.OutstandingJkn, 1) }}</td>
              <td>{{ r.Note }}</td>
            </tr>
          </tbody>

          <tfoot v-if="rows.length">
            <tr class="footer-row">
              <td :colspan="24"></td>
              <td class="footer-lbl">TOTAL KERJA</td>
              <td class="footer-lbl">JAM</td>
              <td class="tr footer-val">{{ numFmt(totalJam, 1) }}</td>
              <td></td>
            </tr>
            <tr class="footer-row">
              <td :colspan="24"></td>
              <td class="footer-lbl">HARI KERJA</td>
              <td class="footer-lbl">7 JK/HARI</td>
              <td class="tr footer-val">{{ numFmt(totalJam / 7, 1) }}</td>
              <td class="tr footer-val">{{ numFmt(totalJkn, 1) }}</td>
            </tr>
            <tr class="footer-row">
              <td :colspan="24"></td>
              <td class="footer-lbl">HARI KERJA</td>
              <td class="footer-lbl">10 JK/HARI</td>
              <td class="tr footer-val">{{ numFmt(totalJam / 10, 1) }}</td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  </PageLayout>
</template>

<style scoped>
.ob-wrap {
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
.ob-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 11px;
  white-space: nowrap;
}
.ob-table thead th {
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
.ob-table thead tr:nth-child(2) th {
  top: 27px;
}
.grp-yellow {
  background: #fff9c4 !important;
}
.ob-table tbody td {
  padding: 4px 8px;
  border: 1px solid #e0e0e0;
}
.tc {
  text-align: center;
}
.tr {
  text-align: right;
}
.footer-row td {
  background: #fff9c4;
  font-weight: 700;
  padding: 5px 8px;
  border: 1px solid #e6d200;
}
.footer-lbl {
  color: #5d4037;
}
.footer-val {
  color: #d84315;
}
</style>
