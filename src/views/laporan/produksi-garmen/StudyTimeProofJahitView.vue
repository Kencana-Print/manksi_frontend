<script setup lang="ts">
import { ref, onMounted, watch } from "vue";
import { useAuthStore } from "@/stores/authStore";
import { useToast } from "vue-toastification";
import PageLayout from "@/components/PageLayout.vue";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import { studyTimeProofJahitService } from "@/services/laporan/produksi-garmen/studyTimeProofJahitService";
import { formatTanggal } from "@/utils/dateFormat";
import {
  IconClockHour4,
  IconFileSpreadsheet,
  IconRefresh,
  IconX,
} from "@tabler/icons-vue";

const MENU_ID = "560";
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

const rows = ref<any[]>([]);
const isLoading = ref(false);
const canExport = ref(authStore.can(MENU_ID, "view"));

const fetchData = async () => {
  isLoading.value = true;
  try {
    const res = await studyTimeProofJahitService.getBrowse(
      dtAwal.value,
      dtAkhir.value,
      cab.value,
    );
    rows.value = res.data.data || [];
  } catch (e: any) {
    toast.error(e.response?.data?.message || "Gagal memuat data.");
  } finally {
    isLoading.value = false;
  }
};

watch([dtAwal, dtAkhir, cab], fetchData);

const numFmt = (v: any, d = 2) => {
  if (v === null || v === undefined || v === "") return "";
  return Number(v).toLocaleString("id-ID", {
    minimumFractionDigits: d,
    maximumFractionDigits: d,
  });
};
const fmtTgl = (v: any) => (v ? formatTanggal(v) : "");

// ── Export — master-blank-repeat persis pola Delphi btnExcelClick,
// tapi datanya langsung dari browse yang sudah GROUP BY di backend
// (tidak ada temp table / string-concat, jadi bug "#21S01 Column
// count doesn't match value count" di app desktop tidak ikut kebawa). ──
const isExporting = ref(false);
const onExport = async () => {
  if (!canExport.value) return toast.error("Akses ditolak.");
  const dataRows = rows.value ?? [];
  if (!dataRows.length) return toast.warning("Tidak ada data.");
  isExporting.value = true;
  try {
    const wb = new ExcelJS.Workbook();
    wb.creator = "MANKSI ERP";
    wb.created = new Date();
    const ws = wb.addWorksheet("Study Time Proof Jahit");

    ws.mergeCells(1, 1, 1, 9);
    ws.getCell(1, 1).value = "LAPORAN STUDY TIME PROSES PROOF JAHIT";
    ws.mergeCells(2, 1, 2, 9);
    ws.getCell(2, 1).value = `GARMEN ${cab.value}`;
    ws.getCell(3, 1).value =
      `TANGGAL : ${formatTanggal(dtAwal.value)} s.d ${formatTanggal(dtAkhir.value)}`;

    const mergeSingle = (col: number, label: string) => {
      ws.mergeCells(4, col, 5, col);
      ws.getCell(4, col).value = label;
    };
    mergeSingle(1, "NO");
    mergeSingle(2, "TANGGAL");
    mergeSingle(3, "NO SPK");
    mergeSingle(4, "NAMA ORDER");
    mergeSingle(5, "JENIS BAHAN");
    mergeSingle(6, "WARNA BAHAN");
    mergeSingle(7, "JUMLAH PROSES STEP");
    ws.mergeCells(4, 8, 4, 9);
    ws.getCell(4, 8).value = "JAHIT";
    ws.getCell(5, 8).value = "MENIT/PC";
    ws.getCell(5, 9).value = "P/O/J";

    const skyBlue = "FF87CEEB";
    for (let r = 4; r <= 5; r++) {
      for (let c = 1; c <= 9; c++) {
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
    ws.getRow(1).font = { bold: true };
    ws.getRow(1).alignment = { horizontal: "center", vertical: "middle" };
    ws.getRow(2).font = { bold: true };
    ws.getRow(2).alignment = { horizontal: "center", vertical: "middle" };
    ws.getRow(3).font = { bold: true };

    let jRow = 6;
    let n = 0;
    let prevTgl = "";
    let prevSpk = "";
    for (const r of dataRows) {
      const curTgl = r.tanggal ?? "";
      const curSpk = r.spk ?? "";
      const isNewGroup = curTgl !== prevTgl || curSpk !== prevSpk;

      if (isNewGroup) {
        n++;
        ws.getCell(jRow, 1).value = n;
        ws.getCell(jRow, 2).value = fmtTgl(r.tanggal);
        ws.getCell(jRow, 3).value = r.spk ?? "";
        ws.getCell(jRow, 4).value = r.namaOrder ?? "";
      }
      // kolom 5 dst (Jenis/Warna Bahan/Step/Menit/P-O-J) selalu tampil
      ws.getCell(jRow, 5).value = r.jenisKain ?? "";
      ws.getCell(jRow, 6).value = r.warnaKain ?? "";
      ws.getCell(jRow, 7).value = r.jumlahStep ?? 0;
      ws.getCell(jRow, 8).value = r.menitPerPc ?? 0;
      ws.getCell(jRow, 9).value = r.pcsPerJam ?? "";

      prevTgl = curTgl;
      prevSpk = curSpk;
      jRow++;
    }
    const lastRow = jRow - 1;

    for (let r = 4; r <= lastRow; r++) {
      for (let c = 1; c <= 9; c++) {
        ws.getCell(r, c).border = {
          top: { style: "thin" },
          left: { style: "thin" },
          bottom: { style: "thin" },
          right: { style: "thin" },
        };
      }
    }

    ws.getColumn(7).numFmt = "#,##0";
    ws.getColumn(8).numFmt = "#,##0.00";
    ws.getColumn(9).numFmt = "#,##0.00";

    ws.getColumn(1).width = 5;
    ws.getColumn(4).width = 40;
    ws.getColumn(7).width = 12;
    ws.getColumn(9).width = 8;
    ws.getRow(5).height = 28;

    const buf = await wb.xlsx.writeBuffer();
    saveAs(
      new Blob([buf], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      }),
      `Study_Time_Proof_Jahit_${dtAwal.value}_${dtAkhir.value}.xlsx`,
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
    title="Laporan Study Time Proof Jahit"
    :menu-id="MENU_ID"
    :icon="IconClockHour4"
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
        <span class="f-label">Tanggal</span>
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
              <th rowspan="2" style="width: 90px">TANGGAL</th>
              <th rowspan="2" style="min-width: 140px">NO SPK</th>
              <th rowspan="2" style="min-width: 240px">NAMA ORDER</th>
              <th rowspan="2" style="min-width: 140px">JENIS BAHAN</th>
              <th rowspan="2" style="min-width: 150px">WARNA BAHAN</th>
              <th rowspan="2" style="width: 110px">JUMLAH PROSES STEP</th>
              <th colspan="2">JAHIT</th>
            </tr>
            <tr>
              <th style="width: 90px">MENIT/PC</th>
              <th style="width: 80px">P/O/J</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="isLoading">
              <td colspan="9" class="tc py-4 text-grey">Memuat data...</td>
            </tr>
            <tr v-else-if="!rows.length">
              <td colspan="9" class="tc py-4 text-grey">Tidak ada data.</td>
            </tr>
            <tr v-for="(r, i) in rows" :key="i">
              <td class="tc">{{ i + 1 }}</td>
              <td class="tc">{{ fmtTgl(r.tanggal) }}</td>
              <td>{{ r.spk ?? "" }}</td>
              <td>{{ r.namaOrder ?? "" }}</td>
              <td>{{ r.jenisKain ?? "" }}</td>
              <td>{{ r.warnaKain ?? "" }}</td>
              <td class="tr">{{ numFmt(r.jumlahStep, 0) }}</td>
              <td class="tr">{{ numFmt(r.menitPerPc) }}</td>
              <td class="tr">
                {{ r.pcsPerJam !== null ? numFmt(r.pcsPerJam) : "-" }}
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
.mkb-table thead tr:nth-child(2) th {
  top: 27px;
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
