<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useToast } from "vue-toastification";
import BaseBrowse from "@/components/BaseBrowse.vue";
import {
  daftarHutangService,
  type DaftarHutangRow,
  type DaftarHutangDetail,
} from "@/services/laporan/finance/daftarHutangService";
import { IconFileInvoice, IconFileExport } from "@tabler/icons-vue";
import { formatTanggal } from "@/utils/dateFormat";
import { exportExcelSingle, type ExcelColumn } from "@/utils/excelExport";

const toast = useToast();
const baseBrowseRef = ref<InstanceType<typeof BaseBrowse> | null>(null);

// ── Periode ──
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

// ── Data ──
const items = ref<DaftarHutangRow[]>([]);
const detailCache = ref<Record<string, DaftarHutangDetail[]>>({});
const isLoading = ref(false);
const expanded = ref<any[]>([]);

const headers = [
  { title: "Nomor", key: "Nomor", width: "160px", fixed: true },
  { title: "Tipe", key: "Tipe", width: "60px", align: "center" },
  { title: "Tanggal", key: "Tanggal", width: "100px", align: "center" },
  { title: "Jatuh Tempo", key: "JatuhTempo", width: "100px", align: "center" },
  { title: "Kode Sup", key: "SupKode", width: "90px" },
  { title: "Nama Supplier", key: "Nama", width: "250px" },
  { title: "Total", key: "Total", width: "140px", align: "end" },
  { title: "Voucher", key: "Voucher", width: "140px", align: "end" },
  { title: "Bayar", key: "Bayar", width: "140px", align: "end" },
];

const numFmt = (v: any) => (v ? Number(v).toLocaleString("id-ID") : "");

const groupDetail = (rows: DaftarHutangDetail[]) => {
  const grouped: Record<string, DaftarHutangDetail[]> = {};
  for (const row of rows) {
    if (!grouped[row.Nomor]) grouped[row.Nomor] = [];
    grouped[row.Nomor].push(row);
  }
  detailCache.value = grouped;
};

const fetchData = async () => {
  isLoading.value = true;
  expanded.value = [];
  try {
    const [resMaster, resDetail] = await Promise.all([
      daftarHutangService.getBrowse(startDate.value, endDate.value),
      daftarHutangService.getDetail(startDate.value, endDate.value),
    ]);
    items.value = resMaster.data.data || [];
    groupDetail(resDetail.data.data || []);
  } catch (e: any) {
    toast.error(e.response?.data?.message || "Gagal memuat data.");
  } finally {
    isLoading.value = false;
  }
};

onMounted(fetchData);

// ── Row coloring: jatuh tempo lewat & belum ada voucher ──
const rowPropsFn = (data: any) => {
  const row = data.item?.raw || data.item;
  if (!row?.JatuhTempo) return {};
  const jt = new Date(row.JatuhTempo);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (jt < today && Number(row.Voucher || 0) === 0) {
    return { style: "color:#c62828; font-weight:600" };
  }
  return {};
};

// ── Summary footer — sticky bawaan BaseBrowse ──
const summaryFormatters = {
  Nama: () => "TOTAL :",
  Total: (filteredItems: any[]) =>
    numFmt(
      Math.round(filteredItems.reduce((s, r) => s + (Number(r.Total) || 0), 0)),
    ),
  Voucher: (filteredItems: any[]) =>
    numFmt(
      Math.round(
        filteredItems.reduce((s, r) => s + (Number(r.Voucher) || 0), 0),
      ),
    ),
  Bayar: (filteredItems: any[]) =>
    numFmt(
      Math.round(filteredItems.reduce((s, r) => s + (Number(r.Bayar) || 0), 0)),
    ),
};

// ── Export ──
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
      numFmt: ["Total", "Voucher", "Bayar"].includes(h.key)
        ? "#,##0"
        : undefined,
    }));

    const rows = dataToExport.map((it: any) => {
      const row: Record<string, any> = {};
      columns.forEach((c) => {
        let val = it[c.key];
        if (c.key === "Tanggal" || c.key === "JatuhTempo")
          val = val ? formatTanggal(val) : "";
        row[c.key] = val ?? "";
      });
      return row;
    });

    await exportExcelSingle(
      `Daftar_Hutang_${startDate.value}_${endDate.value}.xlsx`,
      "Daftar Hutang",
      columns,
      rows,
      `Laporan Daftar Hutang  |  Periode: ${formatTanggal(startDate.value)} s/d ${formatTanggal(endDate.value)}`,
    );

    toast.success("Berhasil export data.");
  } catch (e) {
    console.error(e);
    toast.error("Terjadi kesalahan saat export.");
  } finally {
    isExporting.value = false;
  }
};

// ── Export Detail ──
const isExportingDetail = ref(false);

const HEADER_COLS_DETAIL = [
  "Nomor",
  "Tipe",
  "Tanggal",
  "JatuhTempo",
  "SupKode",
  "Nama",
  "Total",
  "Voucher",
  "Bayar",
];

const detailExportColumns: ExcelColumn[] = [
  { header: "Nomor", key: "Nomor", width: 20 },
  { header: "Tipe", key: "Tipe", width: 10, align: "center" },
  { header: "Tanggal", key: "Tanggal", width: 14, align: "center" },
  { header: "Jatuh Tempo", key: "JatuhTempo", width: 14, align: "center" },
  { header: "Kode Sup", key: "SupKode", width: 12 },
  { header: "Nama Supplier", key: "Nama", width: 26 },
  {
    header: "Total",
    key: "Total",
    width: 16,
    align: "end",
    numFmt: "#,##0",
  },
  {
    header: "Voucher",
    key: "Voucher",
    width: 16,
    align: "end",
    numFmt: "#,##0",
  },
  {
    header: "Bayar",
    key: "Bayar",
    width: 16,
    align: "end",
    numFmt: "#,##0",
  },
  { header: "No. Voucher", key: "NomorVoucher", width: 20 },
  { header: "Tgl Voucher", key: "TanggalVoucher", width: 14, align: "center" },
  {
    header: "Total Voucher",
    key: "TotalVoucher",
    width: 16,
    align: "end",
    numFmt: "#,##0",
  },
  { header: "Status Realisasi", key: "StatusRealisasiLabel", width: 16 },
];

const onExportDetail = async () => {
  const allDetail = Object.values(detailCache.value).flat();
  if (!allDetail.length) {
    toast.warning("Tidak ada data detail untuk diexport.");
    return;
  }

  isExportingDetail.value = true;
  try {
    const masterMap: Record<string, any> = {};
    for (const m of items.value) {
      masterMap[m.Nomor] = m;
    }

    const merged = allDetail.map((d) => {
      const m = masterMap[d.Nomor] || {};
      return {
        Nomor: d.Nomor,
        Tipe: m.Tipe || "",
        Tanggal: m.Tanggal ? formatTanggal(m.Tanggal) : "",
        JatuhTempo: m.JatuhTempo ? formatTanggal(m.JatuhTempo) : "",
        SupKode: m.SupKode || "",
        Nama: m.Nama || "",
        Total: Number(m.Total) || 0,
        Voucher: Number(m.Voucher) || 0,
        Bayar: Number(m.Bayar) || 0,
        NomorVoucher: d.NomorVoucher,
        TanggalVoucher: d.TanggalVoucher ? formatTanggal(d.TanggalVoucher) : "",
        TotalVoucher: Number(d.Total) || 0,
        StatusRealisasiLabel:
          Number(d.StatusRealisasi) === 1 ? "Sudah" : "Belum",
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

    await exportExcelSingle(
      `Daftar_Hutang_Detail_${startDate.value}_${endDate.value}.xlsx`,
      "Daftar Hutang Detail",
      detailExportColumns,
      rows,
      `Laporan Detail Daftar Hutang  |  Periode: ${formatTanggal(startDate.value)} s/d ${formatTanggal(endDate.value)}`,
    );

    toast.success("Berhasil export detail data.");
  } catch (e) {
    console.error(e);
    toast.error("Terjadi kesalahan saat export detail.");
  } finally {
    isExportingDetail.value = false;
  }
};
</script>

<template>
  <BaseBrowse
    ref="baseBrowseRef"
    title="Daftar Hutang"
    menu-id="969"
    :icon="IconFileInvoice"
    :headers="headers"
    :items="items ?? []"
    :is-loading="isLoading"
    v-model:filter-state="filterState"
    :can-export="true"
    item-value="Nomor"
    :row-props-fn="rowPropsFn"
    show-expand
    :expanded="expanded"
    :summary-columns="['Total', 'Voucher', 'Bayar']"
    :summary-formatters="summaryFormatters"
    @update:expanded="(val) => (expanded = val)"
    @refresh="fetchData"
    @export="onExport"
  >
    <template #filter-left>
      <div class="f-group">
        <span class="f-label">Periode</span>
        <input type="date" v-model="startDate" class="f-date" />
        <span class="f-sep">s/d</span>
        <input type="date" v-model="endDate" class="f-date" />
      </div>
    </template>

    <template #extra-actions>
      <v-btn
        size="small"
        color="teal-darken-2"
        :loading="isExportingDetail"
        @click="onExportDetail"
      >
        <template #prepend><IconFileExport :size="15" /></template>Export Detail
      </v-btn>
    </template>

    <template #item.Tipe="{ item }">
      <span class="badge-tipe">{{ (item.raw || item).Tipe }}</span>
    </template>
    <template #item.Tanggal="{ item }">
      {{ formatTanggal((item.raw || item).Tanggal) }}
    </template>
    <template #item.JatuhTempo="{ item }">
      {{ formatTanggal((item.raw || item).JatuhTempo) }}
    </template>
    <template #item.Total="{ item }">
      <span class="num-cell">{{ numFmt((item.raw || item).Total) }}</span>
    </template>
    <template #item.Voucher="{ item }">
      <span class="num-cell" style="color: #1565c0">
        {{ numFmt((item.raw || item).Voucher) }}
      </span>
    </template>
    <template #item.Bayar="{ item }">
      <span class="num-cell" style="color: #2e7d32">
        {{ numFmt((item.raw || item).Bayar) }}
      </span>
    </template>

    <template #detail="{ item }">
      <div class="expand-wrap">
        <div
          v-if="!(detailCache[(item.raw || item).Nomor] || []).length"
          class="detail-empty"
        >
          Belum ada voucher.
        </div>
        <table v-else class="detail-table">
          <thead>
            <tr>
              <th width="160">No. Voucher</th>
              <th width="100" class="tc">Tgl Voucher</th>
              <th width="140" class="tr">Total</th>
              <th width="120" class="tc">Status Realisasi</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(d, idx) in detailCache[(item.raw || item).Nomor] || []"
              :key="idx"
              :class="{ 'det-realisasi': d.StatusRealisasi == 1 }"
            >
              <td class="mono">{{ d.NomorVoucher }}</td>
              <td class="tc">{{ formatTanggal(d.TanggalVoucher) }}</td>
              <td class="tr">{{ numFmt(d.Total) }}</td>
              <td class="tc">
                <span
                  :class="
                    d.StatusRealisasi == 1 ? 'badge-realisasi' : 'badge-belum'
                  "
                >
                  {{ d.StatusRealisasi == 1 ? "Sudah" : "Belum" }}
                </span>
              </td>
            </tr>
          </tbody>
          <tfoot>
            <tr class="detail-foot">
              <td colspan="2" class="tr detail-foot-lbl">Total Voucher</td>
              <td class="tr detail-foot-val">
                {{
                  numFmt(
                    (detailCache[(item.raw || item).Nomor] || []).reduce(
                      (s: number, d: any) => s + Number(d.Total),
                      0,
                    ),
                  )
                }}
              </td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </template>
  </BaseBrowse>
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
.f-sep {
  font-size: 12px;
  color: #9ca3af;
  white-space: nowrap;
}

.num-cell {
  font-variant-numeric: tabular-nums;
}

.expand-wrap {
  padding: 10px 10px 10px 50px;
  background: #eceff1;
  overflow-x: auto;
}
.detail-empty {
  padding: 12px 10px;
  font-size: 11px;
  color: #9e9e9e;
  font-style: italic;
}
.detail-table {
  width: 100%;
  min-width: 520px;
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
  white-space: nowrap;
}
.detail-table tbody tr:hover td {
  background: rgba(21, 101, 192, 0.06) !important;
}
.det-realisasi td {
  color: #1565c0;
}
.tr {
  text-align: right !important;
}
.tc {
  text-align: center;
}
.mono {
  font-family: monospace;
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

.badge-tipe {
  background: #f3f4f6;
  color: #374151;
  border: 1px solid #d1d5db;
  padding: 1px 6px;
  border-radius: 4px;
  font-size: 10px;
  font-weight: 700;
  white-space: nowrap;
}
.badge-realisasi {
  background: #e3f2fd;
  color: #1565c0;
  padding: 1px 8px;
  border-radius: 10px;
  font-size: 10px;
  font-weight: 700;
}
.badge-belum {
  background: #fce4ec;
  color: #c62828;
  padding: 1px 8px;
  border-radius: 10px;
  font-size: 10px;
  font-weight: 700;
}
</style>
