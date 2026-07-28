<script setup lang="ts">
import { ref, onMounted, watch } from "vue";
import { useAuthStore } from "@/stores/authStore";
import { useToast } from "vue-toastification";
import PageLayout from "@/components/PageLayout.vue";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import { monitoringProofService } from "@/services/laporan/produksi-garmen/monitoringProofService";
import { formatTanggal } from "@/utils/dateFormat";
import {
  IconClipboardCheck,
  IconFileSpreadsheet,
  IconRefresh,
  IconX,
} from "@tabler/icons-vue";

const MENU_ID = "553";
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
// ⚠️ Delphi cuma punya 1 filter "MAP dari Tanggal" (field enddate di form
// gak dipakai di query), jadi di sini juga cuma 1 tanggal, bukan rentang.
const dtAwal = ref(toLocalDateStr(firstDayOfMonth));
const cab = ref("P04");

const rows = ref<any[]>([]);
const isLoading = ref(false);
const canExport = ref(authStore.can(MENU_ID, "view"));

const fetchData = async () => {
  isLoading.value = true;
  try {
    const res = await monitoringProofService.getBrowse(dtAwal.value, cab.value);
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
const fmtTgl = (v: any) => (v ? formatTanggal(v) : "");

// selisih: "-" kalau tanggal kosong, blank kalau kolom cetak/bordir tapi
// flag-nya bukan "YA" (persis behaviour formula Excel Delphi)
const selisihDisplay = (v: number | null, flag?: string): string => {
  if (flag !== undefined && flag !== "YA") return "";
  if (v === null || v === undefined) return "-";
  return numFmt(v, 0);
};

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
    const ws = wb.addWorksheet("Monitoring Proof");

    ws.getCell(1, 1).value = "LAPORAN MONITORING PROOF";
    ws.getCell(1, 1).font = { bold: true, size: 12 };
    ws.getCell(2, 1).value = "GARMEN";
    ws.getCell(2, 1).font = { bold: true };
    ws.getCell(3, 1).value =
      `MAP dari Tanggal : ${formatTanggal(dtAwal.value)}`;
    ws.getCell(3, 1).font = { bold: true };

    const mergeSingle = (col: number, label: string) => {
      ws.mergeCells(4, col, 5, col);
      ws.getCell(4, col).value = label;
    };
    mergeSingle(1, "NO");
    mergeSingle(2, "NAMA MAP");
    mergeSingle(3, "MAP");
    mergeSingle(4, "ORDER");
    mergeSingle(5, "TGL MAP TERBIT");
    mergeSingle(6, "DATELINE");
    mergeSingle(7, "CETAK");
    mergeSingle(8, "BORDIR");
    ws.mergeCells(4, 9, 4, 16);
    ws.getCell(4, 9).value = "TANGGAL PROSES KERJA";
    ws.mergeCells(4, 17, 4, 23);
    ws.getCell(4, 17).value =
      "SELISIH AKTIVITAS KERJA DENGAN DATELINE MAP (HARI)";
    mergeSingle(24, "QTY KIRIM");
    mergeSingle(25, "KEKURANGAN");
    mergeSingle(26, "KETERANGAN");

    const subHeaders: [number, string][] = [
      [9, "MINTA BAHAN"],
      [10, "BAHAN DATANG"],
      [11, "CUTTING"],
      [12, "DESAIN"],
      [13, "CETAK"],
      [14, "BORDIR"],
      [15, "SEWING"],
      [16, "KIRIM"],
      [17, "BAHAN DATANG"],
      [18, "CUTTING"],
      [19, "DESAIN"],
      [20, "CETAK"],
      [21, "BORDIR"],
      [22, "SEWING"],
      [23, "KIRIM"],
    ];
    for (const [col, label] of subHeaders) ws.getCell(5, col).value = label;

    const skyBlue = "FF87CEEB";
    for (let r = 4; r <= 5; r++) {
      for (let c = 1; c <= 26; c++) {
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
    ws.getRow(2).font = { bold: true };
    ws.getRow(3).font = { bold: true };

    let jRow = 6;
    for (const [i, r] of rows.value.entries()) {
      ws.getCell(jRow, 1).value = i + 1;
      ws.getCell(jRow, 2).value = r.namaMap ?? "";
      ws.getCell(jRow, 3).value = r.nomorMap ?? "";
      ws.getCell(jRow, 4).value = r.order_ ?? "";
      ws.getCell(jRow, 5).value = fmtTgl(r.tglTerbit);
      ws.getCell(jRow, 6).value = fmtTgl(r.dateline);
      ws.getCell(jRow, 7).value = r.flagCetak?.trim() || "";
      ws.getCell(jRow, 8).value = r.flagBordir?.trim() || "";
      ws.getCell(jRow, 9).value = fmtTgl(r.tglMinta);
      ws.getCell(jRow, 10).value = fmtTgl(r.tglDatang);
      ws.getCell(jRow, 11).value = fmtTgl(r.tglPotong);
      ws.getCell(jRow, 12).value = fmtTgl(r.tglDesain);
      ws.getCell(jRow, 13).value = fmtTgl(r.tglCetak);
      ws.getCell(jRow, 14).value = fmtTgl(r.tglBordir);
      ws.getCell(jRow, 15).value = fmtTgl(r.tglJahit);
      ws.getCell(jRow, 16).value = fmtTgl(r.tglKirim);
      ws.getCell(jRow, 17).value = selisihDisplay(r.selisihBahanDatang);
      ws.getCell(jRow, 18).value = selisihDisplay(r.selisihCutting);
      ws.getCell(jRow, 19).value = selisihDisplay(r.selisihDesain);
      ws.getCell(jRow, 20).value = selisihDisplay(r.selisihCetak, r.flagCetak);
      ws.getCell(jRow, 21).value = selisihDisplay(
        r.selisihBordir,
        r.flagBordir,
      );
      ws.getCell(jRow, 22).value = selisihDisplay(r.selisihSewing);
      ws.getCell(jRow, 23).value = selisihDisplay(r.selisihKirim);
      ws.getCell(jRow, 24).value = r.qtyKirim ?? "";
      ws.getCell(jRow, 25).value = r.kekurangan ?? "";
      ws.getCell(jRow, 26).value = "";
      jRow++;
    }
    const lastRow = jRow - 1;

    for (let r = 4; r <= lastRow; r++) {
      for (let c = 1; c <= 26; c++) {
        ws.getCell(r, c).border = {
          top: { style: "thin" },
          left: { style: "thin" },
          bottom: { style: "thin" },
          right: { style: "thin" },
        };
      }
    }

    ws.getColumn(1).width = 5;
    ws.getColumn(2).width = 30;
    ws.getColumn(26).width = 40;
    ws.getRow(5).height = 32;
    for (let c = 5; c <= 25; c++) ws.getColumn(c).width = 12;

    const buf = await wb.xlsx.writeBuffer();
    saveAs(
      new Blob([buf], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      }),
      `Monitoring_Proof_${dtAwal.value}.xlsx`,
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
    title="Laporan Monitoring Proof"
    :menu-id="MENU_ID"
    :icon="IconClipboardCheck"
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
        <span class="f-label">MAP dari Tanggal</span>
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
        <span class="chip">{{ rows.length }} baris</span>
      </div>

      <div class="table-scroll">
        <table class="mkb-table">
          <thead>
            <tr>
              <th rowspan="2" class="tc">NO</th>
              <th rowspan="2" style="min-width: 220px">NAMA MAP</th>
              <th rowspan="2" style="min-width: 120px">MAP</th>
              <th rowspan="2" style="width: 70px">ORDER</th>
              <th rowspan="2" style="width: 90px">TGL MAP TERBIT</th>
              <th rowspan="2" style="width: 90px">DATELINE</th>
              <th rowspan="2" style="width: 60px">CETAK</th>
              <th rowspan="2" style="width: 60px">BORDIR</th>
              <th colspan="8">TANGGAL PROSES KERJA</th>
              <th colspan="7">
                SELISIH AKTIVITAS KERJA DENGAN DATELINE MAP (HARI)
              </th>
              <th rowspan="2" style="width: 80px">QTY KIRIM</th>
              <th rowspan="2" style="width: 90px">KEKURANGAN</th>
              <th rowspan="2" style="min-width: 140px">KETERANGAN</th>
            </tr>
            <tr>
              <th style="width: 90px">MINTA BAHAN</th>
              <th style="width: 90px">BAHAN DATANG</th>
              <th style="width: 90px">CUTTING</th>
              <th style="width: 90px">DESAIN</th>
              <th style="width: 90px">CETAK</th>
              <th style="width: 90px">BORDIR</th>
              <th style="width: 90px">SEWING</th>
              <th style="width: 90px">KIRIM</th>
              <th style="width: 80px">BAHAN DATANG</th>
              <th style="width: 80px">CUTTING</th>
              <th style="width: 80px">DESAIN</th>
              <th style="width: 80px">CETAK</th>
              <th style="width: 80px">BORDIR</th>
              <th style="width: 80px">SEWING</th>
              <th style="width: 80px">KIRIM</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="isLoading">
              <td colspan="26" class="tc py-4 text-grey">Memuat data...</td>
            </tr>
            <tr v-else-if="!rows.length">
              <td colspan="26" class="tc py-4 text-grey">Tidak ada data.</td>
            </tr>
            <tr v-for="(r, i) in rows" :key="r.nomorMap ?? i">
              <td class="tc">{{ i + 1 }}</td>
              <td>{{ r.namaMap ?? "" }}</td>
              <td>{{ r.nomorMap ?? "" }}</td>
              <td class="tr">{{ numFmt(r.order_) }}</td>
              <td class="tc">{{ fmtTgl(r.tglTerbit) }}</td>
              <td class="tc">{{ fmtTgl(r.dateline) }}</td>
              <td class="tc">{{ r.flagCetak?.trim() || "" }}</td>
              <td class="tc">{{ r.flagBordir?.trim() || "" }}</td>
              <td class="tc">{{ fmtTgl(r.tglMinta) }}</td>
              <td class="tc">{{ fmtTgl(r.tglDatang) }}</td>
              <td class="tc">{{ fmtTgl(r.tglPotong) }}</td>
              <td class="tc">{{ fmtTgl(r.tglDesain) }}</td>
              <td class="tc">{{ fmtTgl(r.tglCetak) }}</td>
              <td class="tc">{{ fmtTgl(r.tglBordir) }}</td>
              <td class="tc">{{ fmtTgl(r.tglJahit) }}</td>
              <td class="tc">{{ fmtTgl(r.tglKirim) }}</td>
              <td class="tr">{{ selisihDisplay(r.selisihBahanDatang) }}</td>
              <td class="tr">{{ selisihDisplay(r.selisihCutting) }}</td>
              <td class="tr">{{ selisihDisplay(r.selisihDesain) }}</td>
              <td class="tr">
                {{ selisihDisplay(r.selisihCetak, r.flagCetak) }}
              </td>
              <td class="tr">
                {{ selisihDisplay(r.selisihBordir, r.flagBordir) }}
              </td>
              <td class="tr">{{ selisihDisplay(r.selisihSewing) }}</td>
              <td class="tr">{{ selisihDisplay(r.selisihKirim) }}</td>
              <td class="tr">{{ numFmt(r.qtyKirim) }}</td>
              <td class="tr">{{ numFmt(r.kekurangan) }}</td>
              <td></td>
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
