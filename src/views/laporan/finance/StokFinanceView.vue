<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useToast } from "vue-toastification";
import { useAuthStore } from "@/stores/authStore";
import BaseBrowse from "@/components/BaseBrowse.vue";
import {
  stokFinanceService,
  type StokMasterRow,
  type StokDetailRow,
} from "@/services/laporan/finance/stokFinanceService";
import { IconList, IconFileExport } from "@tabler/icons-vue";
import { exportExcelSingle, type ExcelColumn } from "@/utils/excelExport";

const toast = useToast();
const authStore = useAuthStore();
const baseBrowseRef = ref<InstanceType<typeof BaseBrowse> | null>(null);

// ── Cabang ──
const filterState = ref<Record<string, any>>({});
const cabang = ref(authStore.userCabang || "P01");
const cabangList = ref<string[]>([]);

// ── Data ──
const items = ref<StokMasterRow[]>([]);
const detailCache = ref<Record<string, StokDetailRow[]>>({});
const isLoading = ref(false);
const expanded = ref<any[]>([]);

const headers = [
  { title: "Jenis", key: "Jenis", width: "110px" },
  { title: "Kode", key: "Kode", width: "120px", fixed: true },
  { title: "Nama", key: "Nama", width: "320px" },
  { title: "Satuan", key: "Satuan", width: "80px", align: "center" },
  { title: "Stok", key: "Stok", width: "90px", align: "end" },
  { title: "Mutasi", key: "Mutasi", width: "90px", align: "end" },
  { title: "REAL", key: "REAL_", width: "90px", align: "end" },
];

const numFmt = (v: any) => (v ? Number(v).toLocaleString("id-ID") : "0");

const groupDetail = (rows: StokDetailRow[]) => {
  const grouped: Record<string, StokDetailRow[]> = {};
  for (const row of rows) {
    if (!grouped[row.Kode]) grouped[row.Kode] = [];
    grouped[row.Kode].push(row);
  }
  detailCache.value = grouped;
};

const fetchData = async () => {
  if (!cabang.value) return;
  isLoading.value = true;
  expanded.value = [];
  try {
    const [resMaster, resDetail] = await Promise.all([
      stokFinanceService.getMaster(cabang.value),
      stokFinanceService.getDetail(cabang.value),
    ]);
    items.value = resMaster.data.data || [];
    groupDetail(resDetail.data.data || []);
  } catch (e: any) {
    toast.error(e.response?.data?.message || "Gagal memuat data.");
  } finally {
    isLoading.value = false;
  }
};

onMounted(async () => {
  try {
    const res = await stokFinanceService.getCabangList();
    cabangList.value = res.data.data || [];
    if (
      cabangList.value.length > 0 &&
      !cabangList.value.includes(cabang.value)
    ) {
      cabang.value = cabangList.value[0];
    }
  } catch {
    /* silent */
  }
  await fetchData();
});

// ── Row coloring: REAL negatif ditandai kuning ──
const rowPropsFn = (data: any) => {
  const item = data.item?.raw || data.item;
  if (Number(item?.REAL_) < 0)
    return { style: "background:#fff8e1;color:#e65100" };
  return {};
};

// ── Summary footer — sticky bawaan BaseBrowse ──
const summaryFormatters = {
  Nama: () => "TOTAL :",
  Stok: (filteredItems: any[]) =>
    numFmt(
      Math.round(filteredItems.reduce((s, r) => s + (Number(r.Stok) || 0), 0)),
    ),
  Mutasi: (filteredItems: any[]) =>
    numFmt(
      Math.round(
        filteredItems.reduce((s, r) => s + (Number(r.Mutasi) || 0), 0),
      ),
    ),
  REAL_: (filteredItems: any[]) =>
    numFmt(
      Math.round(filteredItems.reduce((s, r) => s + (Number(r.REAL_) || 0), 0)),
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
      numFmt: ["Stok", "Mutasi", "REAL_"].includes(h.key) ? "#,##0" : undefined,
    }));

    const rows = dataToExport.map((it: any) => {
      const row: Record<string, any> = {};
      columns.forEach((c) => {
        row[c.key] = it[c.key] ?? "";
      });
      return row;
    });

    await exportExcelSingle(
      `Stok_Finance_${cabang.value}.xlsx`,
      "Stok Finance",
      columns,
      rows,
      `Laporan Stok Finance — Cabang: ${cabang.value}`,
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
  "Jenis",
  "Kode",
  "Nama",
  "Satuan",
  "Stok",
  "Mutasi",
  "REAL_",
];

const detailExportColumns: ExcelColumn[] = [
  { header: "Jenis", key: "Jenis", width: 14 },
  { header: "Kode", key: "Kode", width: 16 },
  { header: "Nama", key: "Nama", width: 32 },
  { header: "Satuan", key: "Satuan", width: 10, align: "center" },
  { header: "Stok", key: "Stok", width: 12, align: "end", numFmt: "#,##0" },
  { header: "Mutasi", key: "Mutasi", width: 12, align: "end", numFmt: "#,##0" },
  { header: "REAL", key: "REAL_", width: 12, align: "end", numFmt: "#,##0" },
  { header: "Tanggal", key: "Tanggal", width: 14, align: "center" },
  { header: "No Referensi", key: "Nomor", width: 20 },
  { header: "No MB", key: "NoMB", width: 20 },
  { header: "Jenis Mutasi", key: "JenisMutasi", width: 14 },
  {
    header: "Stok In",
    key: "StokIn",
    width: 12,
    align: "end",
    numFmt: "#,##0",
  },
  {
    header: "Stok Out",
    key: "StokOut",
    width: 12,
    align: "end",
    numFmt: "#,##0",
  },
  {
    header: "Selisih",
    key: "SelisihDtl",
    width: 12,
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
    for (const m of items.value) {
      masterMap[m.Kode] = m;
    }

    const merged = allDetail.map((d) => {
      const m = masterMap[d.Kode] || {};
      return {
        Jenis: m.Jenis || "",
        Kode: m.Kode || "",
        Nama: m.Nama || "",
        Satuan: m.Satuan || "",
        Stok: Number(m.Stok) || 0,
        Mutasi: Number(m.Mutasi) || 0,
        REAL_: Number(m.REAL_) || 0,
        Tanggal: d.Tanggal,
        Nomor: d.Nomor,
        NoMB: d.NoMB,
        JenisMutasi: d.Jenis,
        StokIn: Number(d.StokIn) || 0,
        StokOut: Number(d.StokOut) || 0,
        SelisihDtl: Number(d.Selisih) || 0,
      };
    });

    let lastKode: string | null = null;
    const rows = merged.map((row) => {
      if (row.Kode === lastKode) {
        const copy: Record<string, any> = { ...row };
        HEADER_COLS_DETAIL.forEach((c) => (copy[c] = ""));
        return copy;
      }
      lastKode = row.Kode;
      return row;
    });

    await exportExcelSingle(
      `Stok_Finance_Detail_${cabang.value}.xlsx`,
      "Stok Finance Detail",
      detailExportColumns,
      rows,
      `Laporan Detail Stok Finance — Cabang: ${cabang.value}`,
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
    title="Stok Finance"
    menu-id="969"
    :icon="IconList"
    :headers="headers"
    :items="items ?? []"
    :is-loading="isLoading"
    v-model:filter-state="filterState"
    :can-export="true"
    item-value="Kode"
    :row-props-fn="rowPropsFn"
    show-expand
    :expanded="expanded"
    :summary-columns="['Stok', 'Mutasi', 'REAL_']"
    :summary-formatters="summaryFormatters"
    @update:expanded="(val) => (expanded = val)"
    @refresh="fetchData"
    @export="onExport"
  >
    <template #filter-left>
      <div class="f-group">
        <span class="f-label">Cabang</span>
        <select v-model="cabang" class="f-select" @change="fetchData">
          <option v-for="c in cabangList" :key="c" :value="c">
            {{ c }}
          </option>
        </select>
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

    <template #item.Stok="{ item }">
      <span class="num-cell">{{ numFmt((item.raw || item).Stok) }}</span>
    </template>
    <template #item.Mutasi="{ item }">
      <span class="num-cell">{{ numFmt((item.raw || item).Mutasi) }}</span>
    </template>
    <template #item.REAL_="{ item }">
      <span
        class="num-cell fw-bold"
        :class="{ 'real-neg': Number((item.raw || item).REAL_) < 0 }"
      >
        {{ numFmt((item.raw || item).REAL_) }}
      </span>
    </template>

    <template #detail="{ item }">
      <div class="expand-wrap">
        <div
          v-if="!(detailCache[(item.raw || item).Kode] || []).length"
          class="detail-empty"
        >
          Tidak ada riwayat mutasi untuk barang ini.
        </div>
        <table v-else class="detail-table">
          <thead>
            <tr>
              <th width="100">Tanggal</th>
              <th width="140">No Referensi</th>
              <th width="140">No MB</th>
              <th width="100">Jenis</th>
              <th width="90" class="tr">Stok In</th>
              <th width="90" class="tr">Stok Out</th>
              <th width="90" class="tr">Selisih</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(d, idx) in detailCache[(item.raw || item).Kode] || []"
              :key="idx"
              :class="{ 'det-in': d.StokIn > 0, 'det-out': d.StokOut > 0 }"
            >
              <td class="tc">{{ d.Tanggal }}</td>
              <td>{{ d.Nomor }}</td>
              <td>{{ d.NoMB }}</td>
              <td class="tc">{{ d.Jenis }}</td>
              <td class="tr">{{ d.StokIn ? numFmt(d.StokIn) : "" }}</td>
              <td class="tr">{{ d.StokOut ? numFmt(d.StokOut) : "" }}</td>
              <td class="tr fw-bold" :class="{ 'real-neg': d.Selisih < 0 }">
                {{ numFmt(d.Selisih) }}
              </td>
            </tr>
          </tbody>
          <tfoot>
            <tr class="detail-foot">
              <td colspan="4" class="tr detail-foot-lbl">Total</td>
              <td class="tr detail-foot-val">
                {{
                  numFmt(
                    (detailCache[(item.raw || item).Kode] || []).reduce(
                      (s: number, d: any) => s + Number(d.StokIn),
                      0,
                    ),
                  )
                }}
              </td>
              <td class="tr detail-foot-val">
                {{
                  numFmt(
                    (detailCache[(item.raw || item).Kode] || []).reduce(
                      (s: number, d: any) => s + Number(d.StokOut),
                      0,
                    ),
                  )
                }}
              </td>
              <td class="tr detail-foot-val">
                {{
                  numFmt(
                    (detailCache[(item.raw || item).Kode] || []).reduce(
                      (s: number, d: any) => s + Number(d.Selisih),
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
.f-select {
  height: 28px;
  border: 1px solid #ccc;
  border-radius: 4px;
  padding: 0 6px;
  font-size: 12px;
  outline: none;
  background: white;
  cursor: pointer;
  min-width: 100px;
}
.f-select:focus {
  border-color: #1565c0;
}

.num-cell {
  font-variant-numeric: tabular-nums;
}
.fw-bold {
  font-weight: 700;
}
.real-neg {
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
  min-width: 800px;
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
.det-in td {
  background: rgba(21, 101, 192, 0.03);
}
.det-out td {
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
</style>
