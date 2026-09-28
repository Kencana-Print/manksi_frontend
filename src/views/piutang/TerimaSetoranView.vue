<script setup lang="ts">
import { ref, computed, onMounted, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useToast } from "vue-toastification";
import BaseBrowse from "@/components/BaseBrowse.vue";
import { terimaSetoranService } from "@/services/piutang/terimaSetoranService";
import { IconReceipt, IconFileExport } from "@tabler/icons-vue";
import { formatTanggal } from "@/utils/dateFormat";
import { exportExcelSingle, type ExcelColumn } from "@/utils/excelExport";

const route = useRoute();
const router = useRouter();
const toast = useToast();
const baseBrowseRef = ref<InstanceType<typeof BaseBrowse> | null>(null);

const isPendingFilter = computed(() => route.query.filter === "pending");

// --- Periode & Cabang ---
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
const cabangList = ref<any[]>([]);
const selectedCabang = ref("");
const isInitializing = ref(true);

watch([startDate, endDate, selectedCabang], () => {
  if (isInitializing.value) return;
  if (!isPendingFilter.value) fetchData();
});

// --- Data ---
const items = ref<any[]>([]);
const detailCache = ref<Record<string, any[]>>({});
const isLoading = ref(false);
const selected = ref<any[]>([]);
const expanded = ref<any[]>([]);

const selectedItem = computed(() => selected.value[0] ?? null);

const itemsDisplayed = computed(() =>
  isPendingFilter.value
    ? items.value.filter((r: any) => !r.Verified)
    : items.value,
);

const headers = [
  { title: "Nomor", key: "Nomor", width: "200px", fixed: true },
  { title: "Tgl Setor", key: "TglSetor", width: "110px", align: "center" },
  {
    title: "Tgl Verifikasi",
    key: "TglVerifikasi",
    width: "120px",
    align: "center",
  },
  { title: "Created", key: "Created", width: "100px", align: "center" },
  { title: "Verified", key: "Verified", width: "100px", align: "center" },
];

const numFmt = (v: any) => (v ? Number(v).toLocaleString("id-ID") : "0");

const groupDetail = (rows: any[]) => {
  const grouped: Record<string, any[]> = {};
  for (const row of rows) {
    if (!grouped[row.Nomor]) grouped[row.Nomor] = [];
    grouped[row.Nomor].push(row);
  }
  detailCache.value = grouped;
};

const fetchData = async () => {
  // Mode pending all — bypass filter cabang & tanggal
  if (isPendingFilter.value) {
    isLoading.value = true;
    selected.value = [];
    expanded.value = [];
    try {
      const res = await terimaSetoranService.getBrowsePendingAll();
      items.value = res.data.data || [];
      detailCache.value = {};
    } catch (e: any) {
      toast.error(e.response?.data?.message || "Gagal memuat data.");
    } finally {
      isLoading.value = false;
    }
    return;
  }

  if (!selectedCabang.value) return;
  isLoading.value = true;
  selected.value = [];
  expanded.value = [];
  try {
    const [resBrowse, resDetail] = await Promise.all([
      terimaSetoranService.getBrowse(
        startDate.value,
        endDate.value,
        selectedCabang.value,
      ),
      terimaSetoranService.getBrowseDetail(
        startDate.value,
        endDate.value,
        selectedCabang.value,
      ),
    ]);
    items.value = resBrowse.data.data || [];
    groupDetail(resDetail.data.data || []);
  } catch (e: any) {
    toast.error(e.response?.data?.message || "Gagal memuat data.");
  } finally {
    isLoading.value = false;
  }
};

onMounted(async () => {
  isInitializing.value = true;
  try {
    const res = await terimaSetoranService.getCabang();
    cabangList.value = res.data.data || [];
    if (!selectedCabang.value && cabangList.value.length > 0) {
      selectedCabang.value = cabangList.value[0].kode;
    }
  } catch (e) {
    toast.error("Gagal memuat daftar cabang.");
  }
  isInitializing.value = false;
  await fetchData();
});

const cabangLabel = computed(() => {
  const found = cabangList.value.find((c) => c.kode === selectedCabang.value);
  return found ? `${found.kode} - ${found.nama}` : selectedCabang.value;
});

// --- Expand ---
const onUpdateExpanded = (val: any[]) => {
  expanded.value = val;
};

// --- Row coloring: merah kalau belum diverifikasi ---
const rowPropsFn = (data: any) => {
  const item = data.item?.raw || data.item;
  if (!item.Verified) return { style: "color:#cc0000;font-weight:600" };
  return {};
};

// --- Tombol Terima ---
const onTerima = () => {
  if (!selectedItem.value) {
    toast.warning("Pilih data terlebih dahulu.");
    return;
  }
  router.push(
    `/piutang/terima-setoran/form/${encodeURIComponent(selectedItem.value.Nomor)}`,
  );
};

// --- Reset filter pending ---
const resetPendingFilter = () => {
  const today = new Date();
  const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  startDate.value = getAwalBulan.call(null);
  endDate.value = getToday();
  router.replace({ path: "/piutang/terima-setoran" });
  fetchData();
};

// --- Export ---
const isExporting = ref(false);

const onExport = async () => {
  const dataToExport =
    baseBrowseRef.value?.getFilteredItems?.() ?? itemsDisplayed.value ?? [];

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
    }));

    const rows = dataToExport.map((it: any) => {
      const row: Record<string, any> = {};
      columns.forEach((c) => {
        let val = it[c.key];
        if (c.key === "TglSetor" || c.key === "TglVerifikasi")
          val = val ? formatTanggal(val) : "";
        row[c.key] = val ?? "";
      });
      return row;
    });

    const periodeLabel = isPendingFilter.value
      ? "Filter: Belum Verifikasi (Semua Cabang)"
      : `Cabang: ${cabangLabel.value}  |  Periode: ${formatTanggal(startDate.value)} s/d ${formatTanggal(endDate.value)}`;
    await exportExcelSingle(
      `Terima_Setoran_${startDate.value}_${endDate.value}.xlsx`,
      "Terima Setoran",
      columns,
      rows,
      `Laporan Terima Setoran Kasir  |  ${periodeLabel}`,
    );

    toast.success("Berhasil export data.");
  } catch (e) {
    console.error(e);
    toast.error("Terjadi kesalahan saat export.");
  } finally {
    isExporting.value = false;
  }
};

// --- Export Detail ---
const isExportingDetail = ref(false);

const HEADER_COLS_DETAIL = [
  "Nomor",
  "TglSetor",
  "TglVerifikasi",
  "Created",
  "Verified",
];

const detailExportColumns: ExcelColumn[] = [
  { header: "Nomor", key: "Nomor", width: 20 },
  { header: "Tgl Setor", key: "TglSetor", width: 14, align: "center" },
  {
    header: "Tgl Verifikasi",
    key: "TglVerifikasi",
    width: 14,
    align: "center",
  },
  { header: "Created", key: "Created", width: 12, align: "center" },
  { header: "Verified", key: "Verified", width: 12, align: "center" },
  { header: "No. Dtl", key: "NomorDtl", width: 20 },
  { header: "Jenis", key: "Jenis", width: 22 },
  {
    header: "Nominal Setor",
    key: "NominalSetor",
    width: 16,
    align: "end",
    numFmt: "#,##0",
  },
  {
    header: "Nominal Verifikasi",
    key: "NominalVerifikasi",
    width: 18,
    align: "end",
    numFmt: "#,##0",
  },
];

const onExportDetail = async () => {
  if (isPendingFilter.value) {
    toast.warning(
      "Export Detail tidak tersedia untuk filter Belum Verifikasi. Reset filter dulu.",
    );
    return;
  }

  isExportingDetail.value = true;
  try {
    const [resBrowse, resDetail] = await Promise.all([
      terimaSetoranService.getBrowse(
        startDate.value,
        endDate.value,
        selectedCabang.value,
      ),
      terimaSetoranService.getBrowseDetail(
        startDate.value,
        endDate.value,
        selectedCabang.value,
      ),
    ]);

    const detailRows = resDetail.data.data as any[];
    if (!detailRows.length) {
      toast.warning("Tidak ada data detail untuk diexport.");
      return;
    }

    const masterMap: Record<string, any> = {};
    for (const m of resBrowse.data.data as any[]) {
      masterMap[m.Nomor] = m;
    }

    const merged = detailRows.map((d) => {
      const m = masterMap[d.Nomor] || {};
      return {
        Nomor: d.Nomor,
        TglSetor: m.TglSetor ? formatTanggal(m.TglSetor) : "",
        TglVerifikasi: m.TglVerifikasi ? formatTanggal(m.TglVerifikasi) : "",
        Created: m.Created || "",
        Verified: m.Verified || "",
        NomorDtl: d.Nomor,
        Jenis: d.Jenis,
        NominalSetor: Number(d.NominalSetor) || 0,
        NominalVerifikasi: Number(d.NominalVerifikasi) || 0,
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

    const periodeLabel = `Cabang: ${cabangLabel.value}  |  Periode: ${formatTanggal(startDate.value)} s/d ${formatTanggal(endDate.value)}`;
    await exportExcelSingle(
      `Terima_Setoran_Detail_${startDate.value}_${endDate.value}.xlsx`,
      "Terima Setoran Detail",
      detailExportColumns,
      rows,
      `Laporan Detail Terima Setoran Kasir  |  ${periodeLabel}`,
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
    title="Terima Setoran Kasir"
    menu-id="959"
    :icon="IconReceipt"
    :headers="headers"
    :items="itemsDisplayed ?? []"
    :is-loading="isLoading"
    v-model:selected="selected"
    v-model:filter-state="filterState"
    :can-export="true"
    item-value="Nomor"
    :row-props-fn="rowPropsFn"
    show-expand
    :expanded="expanded"
    @update:expanded="onUpdateExpanded"
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
      <div class="f-divider" />
      <div class="f-group">
        <span class="f-label">Store</span>
        <select v-model="selectedCabang" class="f-select">
          <option v-for="c in cabangList" :key="c.kode" :value="c.kode">
            {{ c.kode }} - {{ c.nama }}
          </option>
        </select>
      </div>
      <div class="f-divider" />
      <div class="legend-wrap">
        <span class="legend-dot" style="background: #cc0000"></span>
        <span class="legend-lbl">Belum di Verifikasi</span>
        <span
          v-if="isPendingFilter"
          class="pending-badge"
          title="Klik untuk tampilkan semua"
          @click="resetPendingFilter"
        >
          ⚠ Menampilkan yang belum verifikasi · ✕ Reset
        </span>
      </div>
    </template>

    <template #extra-actions>
      <v-btn
        size="small"
        color="primary"
        :disabled="!selectedItem"
        @click="onTerima"
      >
        <template #prepend><IconReceipt :size="15" /></template>Terima
      </v-btn>
      <v-btn
        size="small"
        color="teal-darken-2"
        :loading="isExportingDetail"
        @click="onExportDetail"
      >
        <template #prepend><IconFileExport :size="15" /></template>Export Detail
      </v-btn>
    </template>

    <template #item.TglSetor="{ item }">
      {{ formatTanggal((item.raw || item).TglSetor) }}
    </template>

    <template #item.TglVerifikasi="{ item }">
      {{ formatTanggal((item.raw || item).TglVerifikasi) }}
    </template>

    <template #summary-row>
      <div class="summary-inner">
        <span class="summary-lbl">Total</span>
        <span class="summary-val">{{ itemsDisplayed.length }} data</span>
        <span class="summary-sep">|</span>
        <span class="summary-lbl">Belum Verifikasi</span>
        <span class="summary-val" style="color: #ffcdd2">
          {{ items.filter((r) => !r.Verified).length }}
        </span>
      </div>
    </template>

    <template #detail="{ item }">
      <div class="expand-wrap">
        <div class="expand-title mb-2">
          Detail Setoran - {{ (item.raw || item).Nomor }}
        </div>
        <table class="detail-table">
          <thead>
            <tr>
              <th width="180">Nomor</th>
              <th width="200">Jenis</th>
              <th width="140" class="tr">Nominal Setor</th>
              <th width="150" class="tr">Nominal Verifikasi</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(d, idx) in detailCache[(item.raw || item).Nomor] || []"
              :key="idx"
            >
              <td>{{ d.Nomor }}</td>
              <td>{{ d.Jenis }}</td>
              <td class="tr">{{ numFmt(d.NominalSetor) }}</td>
              <td class="tr">{{ numFmt(d.NominalVerifikasi) }}</td>
            </tr>
            <tr
              v-if="
                !detailCache[(item.raw || item).Nomor] ||
                detailCache[(item.raw || item).Nomor].length === 0
              "
            >
              <td colspan="4" class="text-center text-grey py-4 font-italic">
                Tidak ada detail.
              </td>
            </tr>
          </tbody>
          <tfoot v-if="(detailCache[(item.raw || item).Nomor] || []).length">
            <tr class="detail-foot">
              <td colspan="2" class="tr detail-foot-lbl">Total</td>
              <td class="tr detail-foot-val">
                {{
                  numFmt(
                    (detailCache[(item.raw || item).Nomor] || []).reduce(
                      (s: number, d: any) => s + Number(d.NominalSetor),
                      0,
                    ),
                  )
                }}
              </td>
              <td class="tr detail-foot-val">
                {{
                  numFmt(
                    (detailCache[(item.raw || item).Nomor] || []).reduce(
                      (s: number, d: any) => s + Number(d.NominalVerifikasi),
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
.f-date,
.f-select {
  height: 28px;
  border: 1px solid #ccc;
  border-radius: 4px;
  padding: 0 6px;
  font-size: 12px;
  outline: none;
  background: white;
  color: #212121;
}
.f-select {
  cursor: pointer;
  min-width: 160px;
}
.f-divider {
  width: 1px;
  height: 20px;
  background: #ddd;
  margin: 0 8px;
}

.legend-wrap {
  display: flex;
  align-items: center;
  gap: 5px;
}
.legend-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
}
.legend-lbl {
  font-size: 11px;
  color: #374151;
}
.pending-badge {
  font-size: 11px;
  font-weight: 600;
  color: #cc0000;
  background: #ffebee;
  border: 1px solid #ef9a9a;
  border-radius: 20px;
  padding: 2px 10px;
  cursor: pointer;
  white-space: nowrap;
  margin-left: 8px;
}
.pending-badge:hover {
  background: #ffcdd2;
}

.summary-inner {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 4px;
  white-space: nowrap;
}
.summary-lbl {
  font-size: 11px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.75);
}
.summary-val {
  font-size: 12px;
  font-weight: 700;
  color: white;
  font-variant-numeric: tabular-nums;
}
.summary-sep {
  color: rgba(255, 255, 255, 0.4);
  font-size: 11px;
}

.expand-wrap {
  padding: 10px 10px 10px 50px;
  background: #eceff1;
}
.expand-title {
  font-size: 12px;
  font-weight: 700;
  color: #37474f;
}
.detail-table {
  width: 100%;
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
}
.detail-table td {
  padding: 4px 10px;
  border-bottom: 1px solid #eee;
  font-size: 12px;
}
.tr {
  text-align: right !important;
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
