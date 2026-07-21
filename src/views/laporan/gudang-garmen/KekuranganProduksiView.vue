<script setup lang="ts">
import { ref, computed, watch, nextTick } from "vue";
import { useAuthStore } from "@/stores/authStore";
import { useToast } from "vue-toastification";
import PageLayout from "@/components/PageLayout.vue";
import BaseTable from "@/components/BaseTable.vue";
import SpkSearchModal from "@/components/lookups/SpkSearchModal.vue";
import BahanSearchModal from "@/components/lookups/BahanSearchModal.vue";
import { laporanKekuranganProduksiService } from "@/services/laporan/gudang-garmen/laporanKekuranganProduksiService";
import { exportExcelSingle } from "@/utils/excelExport";
import {
  IconRefresh,
  IconFileSpreadsheet,
  IconX,
  IconTable,
  IconChartBar,
  IconLayoutGrid,
  IconSearch,
  IconAlertTriangle,
} from "@tabler/icons-vue";

const MENU_ID = "525";
const authStore = useAuthStore();
const toast = useToast();

// ── Filter ──
const toLocalDateStr = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const today = toLocalDateStr(new Date());
const firstDayOfYear = toLocalDateStr(new Date(new Date().getFullYear(), 0, 1));
const startDate = ref(firstDayOfYear);
const endDate = ref(today);

const isMap = ref(false);
const status = ref("ALL");
const nomorSpk = ref("");
const namaSpkTerpilih = ref("");
const namaSpk = ref("");
const komponen = ref("LL-000400");
const komponenNama = ref("");

const showSpkModal = ref(false);
const onSpkSelected = (item: any) => {
  nomorSpk.value = item.Nomor;
  namaSpkTerpilih.value = item.Nama || item.Nama2 || "";
  namaSpk.value = "";
};
const clearSpk = () => {
  nomorSpk.value = "";
  namaSpkTerpilih.value = "";
};

const showBahanModal = ref(false);
const onBahanSelected = (item: any) => {
  komponen.value = item.Kode;
  komponenNama.value = item.Nama || "";
};
const resetKomponen = () => {
  komponen.value = "LL-000400";
  komponenNama.value = "";
};

// ── Tab ──
const activeTab = ref<"grid" | "pivot" | "chart">("grid");

// ── Data ──
const items = ref<any[]>([]);
const isLoading = ref(false);
const hasSearched = ref(false);
const canExport = computed(() => authStore.can(MENU_ID, "view"));

const fetchData = async () => {
  isLoading.value = true;
  items.value = [];
  hasSearched.value = true;
  try {
    const res = await laporanKekuranganProduksiService.getBrowse({
      startDate: startDate.value,
      endDate: endDate.value,
      komponen: komponen.value,
      spk: nomorSpk.value.trim(),
      nama: namaSpk.value.trim(),
      status: status.value,
      map: isMap.value,
    });
    items.value = res.data.data || [];
  } catch (e: any) {
    toast.error(e.response?.data?.message || "Gagal memuat data.");
  } finally {
    isLoading.value = false;
  }
};

watch(activeTab, async (tab) => {
  await nextTick();
  if (tab === "pivot") renderPivot();
  if (tab === "chart") renderChart();
});
watch(items, () => {
  if (activeTab.value === "pivot") renderPivot();
  if (activeTab.value === "chart") renderChart();
});

// ── Headers — 1 baris per (SPK, lini produksi) ──
const headers = [
  { title: "No. SPK", key: "Nomor", width: "140px" },
  { title: "Divisi", key: "Divisi", width: "80px" },
  { title: "Nama", key: "Nama", minWidth: "220px" },
  { title: "Kain", key: "Kain", minWidth: "160px" },
  { title: "Jumlah", key: "Jumlah", width: "90px", align: "right" },
  { title: "Kirim", key: "Kirim", width: "80px", align: "right" },
  { title: "Kurang Kirim", key: "KurangKirim", width: "100px", align: "right" },
  { title: "Jadi", key: "Jadi", width: "80px", align: "right" },
  { title: "Tanggal", key: "Tanggal", width: "95px", align: "center" },
  { title: "Dateline", key: "Dateline", width: "95px", align: "center" },
  { title: "Status", key: "Closed", width: "80px", align: "center" },
  { title: "Produksi", key: "Produksi", width: "110px" },
  { title: "Sudah", key: "Sudah", width: "90px", align: "right" },
  { title: "Kurang", key: "Kurang", width: "90px", align: "right" },
  { title: "Cab", key: "Cab", width: "60px" },
];

const fmtNum = (n: any) =>
  new Intl.NumberFormat("id-ID", { maximumFractionDigits: 2 }).format(
    Number(n) || 0,
  );
const fmtDate = (v: string) => {
  if (!v) return "-";
  const s = String(v).substring(0, 10);
  const [y, m, d] = s.split("-");
  if (!y || !m || !d) return v;
  return `${d}-${m}-${y}`;
};

const itemsWithBulan = computed(() =>
  items.value.map((r) => ({
    ...r,
    Bulan: r.Tanggal ? String(r.Tanggal).substring(0, 7) : "-",
  })),
);

// ── Export ──
const onExport = async () => {
  if (!canExport.value) return toast.error("Akses ditolak.");
  if (!items.value.length) return toast.warning("Tidak ada data.");
  await exportExcelSingle(
    `Kekurangan_Produksi_${startDate.value}_${endDate.value}`,
    "Kekurangan Produksi",
    [
      { header: "No. SPK", key: "Nomor", width: 18 },
      { header: "Divisi", key: "Divisi", width: 10 },
      { header: "Nama", key: "Nama", width: 28 },
      { header: "Kain", key: "Kain", width: 22 },
      {
        header: "Jumlah",
        key: "Jumlah",
        width: 12,
        align: "right",
        numFmt: "#,##0",
      },
      {
        header: "Kirim",
        key: "Kirim",
        width: 12,
        align: "right",
        numFmt: "#,##0",
      },
      {
        header: "Kurang Kirim",
        key: "KurangKirim",
        width: 14,
        align: "right",
        numFmt: "#,##0",
      },
      {
        header: "Jadi",
        key: "Jadi",
        width: 12,
        align: "right",
        numFmt: "#,##0",
      },
      { header: "Tanggal", key: "Tanggal", width: 14, align: "center" },
      { header: "Dateline", key: "Dateline", width: 14, align: "center" },
      { header: "Status", key: "Closed", width: 12, align: "center" },
      { header: "Produksi", key: "Produksi", width: 14 },
      {
        header: "Sudah",
        key: "Sudah",
        width: 12,
        align: "right",
        numFmt: "#,##0",
      },
      {
        header: "Kurang",
        key: "Kurang",
        width: 12,
        align: "right",
        numFmt: "#,##0",
      },
      { header: "Cab", key: "Cab", width: 10 },
    ],
    items.value,
    `Laporan Kekurangan Produksi — ${startDate.value} s.d. ${endDate.value}`,
  );
};

// ── Pivot — sesuai konfigurasi Delphi (SetPivotRow/Col/Data):
// row=[Spk_Nomor, Tanggal, Nama, Jumlah, Kirim], col=[Produksi], val=[Kurang] ──
const pivotEl = ref<HTMLElement | null>(null);
const renderPivot = async () => {
  await nextTick();
  if (!pivotEl.value || !itemsWithBulan.value.length) return;
  const win = window as any;
  if (!win.jQuery || !win.jQuery.fn.pivotUI) return;
  win.jQuery(pivotEl.value).pivotUI(
    itemsWithBulan.value,
    {
      rows: ["Nomor", "Tanggal", "Nama", "Jumlah", "Kirim"],
      cols: ["Produksi"],
      vals: ["Kurang"],
      aggregatorName: "Sum",
      rendererName: "Table",
      unusedAttrsVertical: false,
    },
    true,
  );
};

// ── Grafik ──
const chartEl = ref<HTMLElement | null>(null);
const renderChart = async () => {
  await nextTick();
  if (!chartEl.value || !itemsWithBulan.value.length) return;
  const win = window as any;
  if (!win.jQuery || !win.jQuery.fn.pivotUI) return;
  if (!win.$.pivotUtilities?.c3_renderers) return;
  win.jQuery(chartEl.value).pivotUI(
    itemsWithBulan.value,
    {
      rows: ["Produksi"],
      cols: ["Bulan"],
      vals: ["Kurang"],
      aggregatorName: "Sum",
      rendererName: "Bar Chart",
      renderers: Object.assign(
        {},
        win.$.pivotUtilities.renderers,
        win.$.pivotUtilities.c3_renderers,
      ),
      unusedAttrsVertical: false,
    },
    true,
  );
};
</script>

<template>
  <PageLayout
    title="Laporan Kekurangan Produksi"
    :menu-id="MENU_ID"
    :icon="IconAlertTriangle"
  >
    <template #header-actions>
      <v-btn
        size="small"
        color="green"
        :disabled="!items.length"
        @click="onExport"
      >
        <template #prepend>
          <IconFileSpreadsheet :size="15" :stroke-width="1.7" />
        </template>
        Export
      </v-btn>
      <v-btn size="small" variant="text" @click="$router.back()">
        <template #prepend><IconX :size="15" :stroke-width="2" /></template>
        Tutup
      </v-btn>
    </template>

    <div class="kp-wrap">
      <!-- ── Filter bar ── -->
      <div class="filter-bar">
        <span class="filter-lbl">Periode Mutasi:</span>
        <input type="date" v-model="startDate" class="date-inp" />
        <span class="filter-sep">s.d.</span>
        <input type="date" v-model="endDate" class="date-inp" />

        <span class="filter-lbl ml">No. SPK:</span>
        <div class="spk-picker">
          <input
            type="text"
            :value="nomorSpk"
            readonly
            class="text-inp"
            style="width: 120px; cursor: pointer"
            placeholder="Klik untuk pilih..."
            @click="showSpkModal = true"
          />
          <button
            type="button"
            class="btn-clear-spk"
            v-if="nomorSpk"
            @click="clearSpk"
          >
            ✕
          </button>
          <button
            type="button"
            class="btn-search-spk"
            @click="showSpkModal = true"
          >
            <IconSearch :size="13" />
          </button>
        </div>
        <span v-if="namaSpkTerpilih" class="spk-nama-hint">{{
          namaSpkTerpilih
        }}</span>

        <label class="chk-lbl ml">
          <input type="checkbox" v-model="isMap" />
          <span>MAP</span>
        </label>

        <span class="filter-lbl ml">Status Closed:</span>
        <select v-model="status" class="sel-inp">
          <option value="ALL">All</option>
          <option value="SUDAH">Sudah</option>
          <option value="BELUM">Belum</option>
        </select>

        <span class="filter-lbl ml">Nama SPK:</span>
        <input
          type="text"
          v-model="namaSpk"
          class="text-inp"
          placeholder="Ketik nama..."
          style="width: 140px"
          :disabled="!!nomorSpk"
        />

        <span class="filter-lbl ml">Komponen:</span>
        <div class="spk-picker">
          <input
            type="text"
            :value="komponen"
            readonly
            class="text-inp"
            style="width: 110px; cursor: pointer"
            @click="showBahanModal = true"
          />
          <button
            type="button"
            class="btn-clear-spk"
            v-if="komponen !== 'LL-000400'"
            @click="resetKomponen"
          >
            ✕
          </button>
          <button
            type="button"
            class="btn-search-spk"
            @click="showBahanModal = true"
          >
            <IconSearch :size="13" />
          </button>
        </div>
        <span v-if="komponenNama" class="spk-nama-hint">{{
          komponenNama
        }}</span>

        <v-btn
          size="small"
          color="primary"
          :loading="isLoading"
          @click="fetchData"
        >
          <template #prepend>
            <IconRefresh :size="14" :stroke-width="1.7" />
          </template>
          Tampilkan
        </v-btn>

        <v-spacer />
        <div class="summary-chips">
          <span class="chip chip--blue">{{ items.length }} baris</span>
        </div>
      </div>

      <!-- ── Tab bar ── -->
      <div class="tab-bar">
        <button
          class="tab-btn"
          :class="{ active: activeTab === 'grid' }"
          @click="activeTab = 'grid'"
        >
          <IconTable :size="14" class="mr-1" />
          Grid Data
        </button>
        <button
          class="tab-btn"
          :class="{ active: activeTab === 'pivot' }"
          @click="activeTab = 'pivot'"
        >
          <IconLayoutGrid :size="14" class="mr-1" />
          Pivot
        </button>
        <button
          class="tab-btn"
          :class="{ active: activeTab === 'chart' }"
          @click="activeTab = 'chart'"
        >
          <IconChartBar :size="14" class="mr-1" />
          Grafik
        </button>
      </div>

      <!-- ── Grid Data ── -->
      <div v-show="activeTab === 'grid'" class="tab-content">
        <div v-if="!hasSearched" class="search-guide">
          <IconSearch :size="40" :stroke-width="1.2" color="#bdbdbd" />
          <div class="sg-title">Klik "Tampilkan" untuk memuat data</div>
          <div class="sg-sub">
            Satu baris mewakili satu kombinasi SPK dan lini produksi (Potong,
            Cetak, Bordir, Jahit, Lipat, DC, dst).
          </div>
        </div>
        <BaseTable
          v-else
          :headers="headers"
          :items="items"
          :is-loading="isLoading"
          item-value="Nomor"
        >
          <template #item.Jumlah="{ item }">{{ fmtNum(item.Jumlah) }}</template>
          <template #item.Kirim="{ item }">{{ fmtNum(item.Kirim) }}</template>
          <template #item.KurangKirim="{ item }">{{
            fmtNum(item.KurangKirim)
          }}</template>
          <template #item.Jadi="{ item }">{{ fmtNum(item.Jadi) }}</template>
          <template #item.Tanggal="{ item }">{{
            fmtDate(item.Tanggal)
          }}</template>
          <template #item.Dateline="{ item }">{{
            fmtDate(item.Dateline)
          }}</template>
          <template #item.Closed="{ item }">
            <span
              :class="item.Closed === 'Sudah' ? 'badge-sudah' : 'badge-belum'"
              >{{ item.Closed }}</span
            >
          </template>
          <template #item.Sudah="{ item }">{{ fmtNum(item.Sudah) }}</template>
          <template #item.Kurang="{ item }">
            <span :class="{ 'text-kurang': Number(item.Kurang) > 0 }">{{
              fmtNum(item.Kurang)
            }}</span>
          </template>
        </BaseTable>
      </div>

      <!-- ── Pivot ── -->
      <div v-show="activeTab === 'pivot'" class="tab-content pivot-wrap">
        <div v-if="!items.length && !isLoading" class="empty-hint">
          Tampilkan data terlebih dahulu.
        </div>
        <div ref="pivotEl" class="pivot-container" />
      </div>

      <!-- ── Grafik ── -->
      <div v-show="activeTab === 'chart'" class="tab-content chart-wrap">
        <div v-if="!items.length && !isLoading" class="empty-hint">
          Tampilkan data terlebih dahulu.
        </div>
        <div ref="chartEl" class="chart-container" />
      </div>
    </div>

    <SpkSearchModal
      v-model="showSpkModal"
      filter-mode="all"
      @selected="onSpkSelected"
    />
    <BahanSearchModal
      v-model="showBahanModal"
      mode="komponen"
      @selected="onBahanSelected"
    />
  </PageLayout>
</template>

<style scoped>
.kp-wrap {
  display: flex;
  flex-direction: column;
  height: 100%;
  gap: 0;
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
.filter-lbl {
  font-size: 12px;
  font-weight: 600;
  color: #424242;
  white-space: nowrap;
}
.filter-lbl.ml {
  margin-left: 6px;
}
.filter-sep {
  font-size: 12px;
  color: #9e9e9e;
}
.date-inp,
.sel-inp,
.text-inp {
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  padding: 4px 8px;
  font-size: 12px;
  color: #424242;
  outline: none;
  height: 32px;
}
.date-inp:focus,
.sel-inp:focus,
.text-inp:focus {
  border-color: #1867c0;
}
.chk-lbl {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: #424242;
  cursor: pointer;
}
.summary-chips {
  display: flex;
  align-items: center;
  gap: 6px;
}
.chip {
  font-size: 11px;
  padding: 2px 10px;
  border-radius: 10px;
  font-weight: 500;
  white-space: nowrap;
}
.chip--blue {
  background: #e3f2fd;
  color: #1565c0;
}
.tab-bar {
  display: flex;
  border-bottom: 2px solid #e0e0e0;
  background: white;
  flex-shrink: 0;
}
.tab-btn {
  padding: 8px 18px;
  font-size: 12px;
  font-weight: 600;
  border: none;
  background: transparent;
  cursor: pointer;
  color: #757575;
  display: flex;
  align-items: center;
  border-bottom: 2px solid transparent;
  margin-bottom: -2px;
  transition:
    color 0.15s,
    border-color 0.15s;
}
.tab-btn:hover {
  color: #1565c0;
}
.tab-btn.active {
  color: #1565c0;
  border-bottom-color: #1565c0;
}
.tab-content {
  flex: 1;
  min-height: 0;
  overflow: auto;
}
.pivot-wrap,
.chart-wrap {
  padding: 12px;
  background: white;
}
.pivot-container,
.chart-container {
  overflow: auto;
}
.pivot-container :deep(.pvtUi),
.chart-container :deep(.pvtUi) {
  font-size: 12px;
}
.empty-hint {
  padding: 32px;
  text-align: center;
  font-size: 12px;
  color: #9e9e9e;
}
.spk-picker {
  display: inline-flex;
  align-items: center;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  overflow: hidden;
  height: 32px;
}
.spk-picker .text-inp {
  border: none;
  height: 30px;
}
.btn-clear-spk {
  background: #ffebee;
  border: none;
  color: #c62828;
  font-size: 11px;
  width: 22px;
  height: 30px;
  cursor: pointer;
}
.btn-search-spk {
  background: #e3f2fd;
  border: none;
  border-left: 1px solid #e0e0e0;
  color: #1565c0;
  width: 26px;
  height: 30px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}
.spk-nama-hint {
  font-size: 11px;
  color: #757575;
  font-style: italic;
  max-width: 160px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.search-guide {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 24px;
  gap: 10px;
  text-align: center;
}
.sg-title {
  font-size: 14px;
  font-weight: 700;
  color: #616161;
}
.sg-sub {
  font-size: 12px;
  color: #9e9e9e;
  max-width: 380px;
  line-height: 1.5;
}
.text-kurang {
  color: #c62828;
  font-weight: 700;
}
.badge-sudah {
  background: #e8f5e9;
  color: #2e7d32;
  padding: 1px 8px;
  border-radius: 10px;
  font-weight: 600;
}
.badge-belum {
  background: #fff3e0;
  color: #e65100;
  padding: 1px 8px;
  border-radius: 10px;
  font-weight: 600;
}
</style>
