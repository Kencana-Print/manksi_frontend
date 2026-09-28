<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useToast } from "vue-toastification";
import BaseBrowse from "@/components/BaseBrowse.vue";
import {
  rekonsiliasiBankLaporanService,
  type RekonMasterRow,
  type RekonDetailRow,
} from "@/services/laporan/finance/rekonsiliasiBankLaporanService";
import { IconBuildingBank, IconFileExport } from "@tabler/icons-vue";
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
const rawItems = ref<RekonMasterRow[]>([]);
const detailCache = ref<Record<string, RekonDetailRow[]>>({});
const isLoading = ref(false);
const expanded = ref<any[]>([]);

// item-value gabungan Account+Tanggal (bisa duplikat Account di tanggal
// berbeda), jadi tiap baris dikasih key unik sebelum masuk BaseBrowse
const items = computed(() =>
  rawItems.value.map((r) => ({ ...r, __key: `${r.Account}_${r.Tanggal}` })),
);

const headers = [
  {
    title: "Tanggal",
    key: "Tanggal",
    width: "100px",
    align: "center",
    fixed: true,
  },
  { title: "Account", key: "Account", width: "90px" },
  { title: "Nama", key: "Nama", width: "220px" },
  { title: "Saldo Buku", key: "SaldoBuku", width: "130px", align: "end" },
  { title: "Tambah", key: "Tambah", width: "120px", align: "end" },
  { title: "Kurang", key: "Kurang", width: "120px", align: "end" },
  { title: "Buku", key: "Buku", width: "130px", align: "end" },
  { title: "Saldo Bank", key: "SaldoBank", width: "130px", align: "end" },
  { title: "Tambah_", key: "Tambah_", width: "120px", align: "end" },
  { title: "Kurang_", key: "Kurang_", width: "120px", align: "end" },
  { title: "Bank", key: "Bank", width: "130px", align: "end" },
  { title: "Selisih", key: "Selisih", width: "130px", align: "end" },
];

const numFmt = (v: any) => (v ? Number(v).toLocaleString("id-ID") : "");

const groupDetail = (rows: RekonDetailRow[]) => {
  const grouped: Record<string, RekonDetailRow[]> = {};
  for (const row of rows) {
    const key = `${row.Account}_${row.Tanggal}`;
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(row);
  }
  detailCache.value = grouped;
};

const fetchData = async () => {
  isLoading.value = true;
  expanded.value = [];
  try {
    const res = await rekonsiliasiBankLaporanService.getData(
      startDate.value,
      endDate.value,
    );
    rawItems.value = res.data.data.master || [];
    groupDetail(res.data.data.detail || []);
  } catch (e: any) {
    toast.error(e.response?.data?.message || "Gagal memuat data.");
  } finally {
    isLoading.value = false;
  }
};

onMounted(fetchData);

// ── Row coloring: Selisih != 0 ditandai kuning ──
const rowPropsFn = (data: any) => {
  const item = data.item?.raw || data.item;
  if (Number(item?.Selisih) !== 0)
    return { style: "background:#fff8e1;color:#e65100" };
  return {};
};

// ── Summary footer — sticky bawaan BaseBrowse ──
const summaryFormatters = {
  Nama: () => "TOTAL :",
  Buku: (filteredItems: any[]) =>
    numFmt(
      Math.round(filteredItems.reduce((s, r) => s + (Number(r.Buku) || 0), 0)),
    ),
  Bank: (filteredItems: any[]) =>
    numFmt(
      Math.round(filteredItems.reduce((s, r) => s + (Number(r.Bank) || 0), 0)),
    ),
  Selisih: (filteredItems: any[]) =>
    numFmt(
      Math.round(
        filteredItems.reduce((s, r) => s + (Number(r.Selisih) || 0), 0),
      ),
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
      numFmt: [
        "SaldoBuku",
        "Tambah",
        "Kurang",
        "Buku",
        "SaldoBank",
        "Tambah_",
        "Kurang_",
        "Bank",
        "Selisih",
      ].includes(h.key)
        ? "#,##0"
        : undefined,
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

    await exportExcelSingle(
      `Rekonsiliasi_Bank_${startDate.value}_${endDate.value}.xlsx`,
      "Rekonsiliasi Bank",
      columns,
      rows,
      `Laporan Rekonsiliasi Bank  |  Periode: ${formatTanggal(startDate.value)} s/d ${formatTanggal(endDate.value)}`,
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
  "Tanggal",
  "Account",
  "Nama",
  "SaldoBuku",
  "Tambah",
  "Kurang",
  "Buku",
  "SaldoBank",
  "Tambah_",
  "Kurang_",
  "Bank",
  "Selisih",
];

const detailExportColumns: ExcelColumn[] = [
  { header: "Tanggal", key: "Tanggal", width: 14, align: "center" },
  { header: "Account", key: "Account", width: 12 },
  { header: "Nama", key: "Nama", width: 26 },
  {
    header: "Saldo Buku",
    key: "SaldoBuku",
    width: 16,
    align: "end",
    numFmt: "#,##0",
  },
  { header: "Tambah", key: "Tambah", width: 14, align: "end", numFmt: "#,##0" },
  { header: "Kurang", key: "Kurang", width: 14, align: "end", numFmt: "#,##0" },
  { header: "Buku", key: "Buku", width: 16, align: "end", numFmt: "#,##0" },
  {
    header: "Saldo Bank",
    key: "SaldoBank",
    width: 16,
    align: "end",
    numFmt: "#,##0",
  },
  {
    header: "Tambah_",
    key: "Tambah_",
    width: 14,
    align: "end",
    numFmt: "#,##0",
  },
  {
    header: "Kurang_",
    key: "Kurang_",
    width: 14,
    align: "end",
    numFmt: "#,##0",
  },
  { header: "Bank", key: "Bank", width: 16, align: "end", numFmt: "#,##0" },
  {
    header: "Selisih",
    key: "Selisih",
    width: 16,
    align: "end",
    numFmt: "#,##0",
  },
  { header: "Jenis", key: "Jenis", width: 14 },
  { header: "Nomor", key: "Nomor", width: 20 },
  { header: "Keterangan", key: "Keterangan", width: 28 },
  {
    header: "Nominal",
    key: "Nominal",
    width: 16,
    align: "end",
    numFmt: "#,##0",
  },
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
    for (const m of rawItems.value) {
      masterMap[`${m.Account}_${m.Tanggal}`] = m;
    }

    const merged = allDetail.map((d) => {
      const key = `${d.Account}_${d.Tanggal}`;
      const m = masterMap[key] || {};
      return {
        Tanggal: m.Tanggal ? formatTanggal(m.Tanggal) : "",
        Account: m.Account || "",
        Nama: m.Nama || "",
        SaldoBuku: Number(m.SaldoBuku) || 0,
        Tambah: Number(m.Tambah) || 0,
        Kurang: Number(m.Kurang) || 0,
        Buku: Number(m.Buku) || 0,
        SaldoBank: Number(m.SaldoBank) || 0,
        Tambah_: Number(m.Tambah_) || 0,
        Kurang_: Number(m.Kurang_) || 0,
        Bank: Number(m.Bank) || 0,
        Selisih: Number(m.Selisih) || 0,
        Jenis: d.Jenis,
        Nomor: d.Nomor,
        Keterangan: d.Keterangan,
        Nominal: Number(d.Nominal) || 0,
      };
    });

    let lastKey: string | null = null;
    const rows = merged.map((row) => {
      const key = `${row.Account}_${row.Tanggal}`;
      if (key === lastKey) {
        const copy: Record<string, any> = { ...row };
        HEADER_COLS_DETAIL.forEach((c) => (copy[c] = ""));
        return copy;
      }
      lastKey = key;
      return row;
    });

    await exportExcelSingle(
      `Rekonsiliasi_Bank_Detail_${startDate.value}_${endDate.value}.xlsx`,
      "Rekonsiliasi Bank Detail",
      detailExportColumns,
      rows,
      `Laporan Detail Rekonsiliasi Bank  |  Periode: ${formatTanggal(startDate.value)} s/d ${formatTanggal(endDate.value)}`,
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
    title="Rekonsiliasi Bank"
    menu-id="969"
    :icon="IconBuildingBank"
    :headers="headers"
    :items="items ?? []"
    :is-loading="isLoading"
    v-model:filter-state="filterState"
    :can-export="true"
    item-value="__key"
    :row-props-fn="rowPropsFn"
    show-expand
    :expanded="expanded"
    :summary-columns="['Buku', 'Bank', 'Selisih']"
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

    <template #item.Tanggal="{ item }">
      {{ formatTanggal((item.raw || item).Tanggal) }}
    </template>
    <template
      v-for="col in [
        'SaldoBuku',
        'Tambah',
        'Kurang',
        'SaldoBank',
        'Tambah_',
        'Kurang_',
      ]"
      :key="col"
      v-slot:[`item.${col}`]="{ item }"
    >
      <span class="num-cell">{{ numFmt((item.raw || item)[col]) }}</span>
    </template>
    <template #item.Buku="{ item }">
      <span class="num-cell fw-bold">{{
        numFmt((item.raw || item).Buku)
      }}</span>
    </template>
    <template #item.Bank="{ item }">
      <span class="num-cell fw-bold">{{
        numFmt((item.raw || item).Bank)
      }}</span>
    </template>
    <template #item.Selisih="{ item }">
      <span
        class="num-cell fw-bold"
        :class="{ 'selisih-ada': Number((item.raw || item).Selisih) !== 0 }"
      >
        {{ numFmt((item.raw || item).Selisih) }}
      </span>
    </template>

    <template #detail="{ item }">
      <div class="expand-wrap">
        <div
          v-if="!(detailCache[(item.raw || item).__key] || []).length"
          class="detail-empty"
        >
          Tidak ada item detail untuk rekonsiliasi ini.
        </div>
        <table v-else class="detail-table">
          <thead>
            <tr>
              <th width="100">Tanggal</th>
              <th width="90">Account</th>
              <th width="200">Nama</th>
              <th width="110">Jenis</th>
              <th width="160">Nomor</th>
              <th width="220">Keterangan</th>
              <th width="130" class="tr">Nominal</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(d, idx) in detailCache[(item.raw || item).__key] || []"
              :key="idx"
              :class="{
                'det-tambah': d.Jenis.includes('Tambah'),
                'det-kurang': d.Jenis.includes('Kurang'),
              }"
            >
              <td class="tc">{{ formatTanggal(d.Tanggal) }}</td>
              <td>{{ d.Account }}</td>
              <td>{{ d.Nama }}</td>
              <td>
                <span
                  class="jenis-badge"
                  :class="`jenis-${d.Jenis.toLowerCase().replace(' ', '_')}`"
                >
                  {{ d.Jenis }}
                </span>
              </td>
              <td>{{ d.Nomor }}</td>
              <td>{{ d.Keterangan }}</td>
              <td class="tr">{{ numFmt(d.Nominal) }}</td>
            </tr>
          </tbody>
          <tfoot>
            <tr class="detail-foot">
              <td colspan="6" class="tr detail-foot-lbl">Total</td>
              <td class="tr detail-foot-val">
                {{
                  numFmt(
                    (detailCache[(item.raw || item).__key] || []).reduce(
                      (s: number, d: any) => s + Number(d.Nominal),
                      0,
                    ),
                  )
                }}
              </td>
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
.fw-bold {
  font-weight: 700;
}
.selisih-ada {
  color: #e65100 !important;
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
  min-width: 1000px;
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
.det-tambah td {
  background: rgba(21, 101, 192, 0.03);
}
.det-kurang td {
  background: rgba(230, 81, 0, 0.03);
}
.detail-table tbody tr:hover td {
  background: rgba(21, 101, 192, 0.06) !important;
}
.tr {
  text-align: right !important;
}
.tc {
  text-align: center;
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

.jenis-badge {
  border-radius: 3px;
  padding: 1px 5px;
  font-size: 10px;
  font-weight: 600;
  white-space: nowrap;
}
.jenis-tambah_buku {
  background: rgba(46, 125, 50, 0.12);
  color: #2e7d32;
}
.jenis-tambah_bank {
  background: rgba(21, 101, 192, 0.12);
  color: #1565c0;
}
.jenis-kurang_buku {
  background: rgba(230, 81, 0, 0.12);
  color: #e65100;
}
.jenis-kurang_bank {
  background: rgba(183, 28, 28, 0.12);
  color: #b71c1c;
}
</style>
