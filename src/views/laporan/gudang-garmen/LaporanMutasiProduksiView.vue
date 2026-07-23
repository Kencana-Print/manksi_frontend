<script setup lang="ts">
import { ref, computed, watch, nextTick } from "vue";
import { useAuthStore } from "@/stores/authStore";
import { useToast } from "vue-toastification";
import PageLayout from "@/components/PageLayout.vue";
import BaseTable from "@/components/BaseTable.vue";
import SpkSearchModal from "@/components/lookups/SpkSearchModal.vue";
import { laporanMutasiProduksiService } from "@/services/laporan/gudang-garmen/laporanMutasiProduksiService";
import { exportExcelSingle } from "@/utils/excelExport";
import {
  IconRefresh,
  IconFileSpreadsheet,
  IconX,
  IconTable,
  IconChartBar,
  IconLayoutGrid,
  IconSearch,
} from "@tabler/icons-vue";

const MENU_ID = "524";
const authStore = useAuthStore();
const toast = useToast();

// ── Filter ──
// Helper: format Date ke "YYYY-MM-DD" pakai komponen LOKAL
// (getFullYear/getMonth/getDate), BUKAN toISOString() yang convert
// ke UTC dulu dan bisa geser tanggal kalau timezone browser bukan UTC.
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
const cab = ref("ALL");
const nomorSpk = ref("");
const namaSpkTerpilih = ref(""); // nama produk hasil pilih SpkSearchModal (readonly display)
const namaSpk = ref(""); // teks pencarian bebas oleh user

const showSpkModal = ref(false);
const onSpkSelected = (item: any) => {
  nomorSpk.value = item.Nomor;
  namaSpkTerpilih.value = item.Nama || item.Nama2 || "";
  namaSpk.value = ""; // pilih SPK spesifik menggantikan pencarian nama bebas
  fetchData(); // ← auto-fetch begitu SPK dipilih
};
const clearSpk = () => {
  nomorSpk.value = "";
  namaSpkTerpilih.value = "";
  items.value = [];
  hasSearched.value = false;
};

// Sesuai perilaku Delphi: data hanya boleh dimuat kalau ada SPK spesifik
// dipilih ATAU nama SPK diketik — mencegah query tanpa filter yang berat
// (query ini narik dari 4 sumber sekaligus, LIKE '%%' bakal scan semua).
const canFetch = computed(
  () => !!nomorSpk.value.trim() || !!namaSpk.value.trim(),
);

// ── Tab ──
const activeTab = ref<"grid" | "pivot" | "chart">("grid");

// ── Data ──
const items = ref<any[]>([]);
const isLoading = ref(false);
const hasSearched = ref(false);
const canExport = computed(() => authStore.can(MENU_ID, "view"));

// ── Fetch — HANYA dipanggil manual lewat tombol Tampilkan, tidak ada
// auto-fetch saat mount maupun saat filter berubah. ──
const fetchData = async () => {
  if (!canFetch.value) {
    toast.warning("Pilih No. SPK atau ketik Nama SPK terlebih dahulu.");
    return;
  }
  isLoading.value = true;
  items.value = [];
  hasSearched.value = true;
  try {
    const res = await laporanMutasiProduksiService.getBrowse({
      startDate: startDate.value,
      endDate: endDate.value,
      cab: cab.value,
      nomorSpk: nomorSpk.value.trim(),
      namaSpk: namaSpk.value.trim(),
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

// ── Headers ──
const headers = [
  { title: "No. SPK", key: "Nomor", width: "140px" },
  { title: "Nama SPK", key: "NamaSpk", width: "220px" },
  { title: "Tgl SPK", key: "TglSpk", width: "95px", align: "center" },
  { title: "Jumlah SPK", key: "JumlahSpk", width: "100px", align: "right" },
  { title: "Jenis Order", key: "JoKode", width: "110px" },
  { title: "Divisi", key: "DivisiNama", width: "100px" },
  { title: "Tipe", key: "Tipe", width: "80px" },
  { title: "No. Mutasi", key: "NomorMutasi", width: "120px" },
  { title: "No. Permintaan", key: "NoPermintaan", width: "120px" },
  { title: "Terpakai", key: "Terpakai", width: "90px", align: "right" },
  { title: "Babaran", key: "Babaran", width: "80px", align: "right" },
  { title: "Kelompok", key: "Kelompok", width: "110px" },
  { title: "Gudang Asal", key: "GudangAsal", width: "150px" },
  { title: "Gudang Tujuan", key: "GudangTujuan", width: "150px" },
  { title: "Tgl Mutasi", key: "TanggalMutasi", width: "95px", align: "center" },
  { title: "Kode", key: "Kode", width: "100px" },
  { title: "Komponen", key: "Komponen", minWidth: "150px" },
  { title: "Jumlah", key: "Jumlah", width: "90px", align: "right" },
  { title: "BS Lini", key: "BsLini", width: "80px", align: "right" },
  { title: "BS Kain Sbl", key: "BsKainSablon", width: "90px", align: "right" },
  { title: "BS Kain", key: "BsKain", width: "80px", align: "right" },
  { title: "Satuan", key: "Satuan", width: "70px", align: "center" },
  { title: "Size", key: "Size", width: "60px", align: "center" },
  { title: "Cab", key: "Cab", width: "60px" },
];

const totalJumlah = computed(() =>
  items.value.reduce((s, r) => s + Number(r.Jumlah || 0), 0),
);
const fmtNum = (n: any) =>
  new Intl.NumberFormat("id-ID").format(Math.round(Number(n) || 0));
const fmtDate = (v: string) => {
  if (!v) return "-";
  // Ambil 10 karakter pertama (YYYY-MM-DD) langsung dari string mentah,
  // TANPA lewat new Date() — mencegah pergeseran akibat konversi UTC→lokal.
  const s = String(v).substring(0, 10);
  const [y, m, d] = s.split("-");
  if (!y || !m || !d) return v;
  return `${d}/${m}/${y}`;
};

// ── Bulan helper — dipakai sebagai kolom pivot/chart (Delphi punya Bulan/Tahun) ──
const itemsWithBulan = computed(() =>
  items.value.map((r) => {
    const d = r.TanggalMutasi ? new Date(r.TanggalMutasi) : null;
    return {
      ...r,
      Bulan:
        d && !isNaN(d.getTime())
          ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
          : "-",
    };
  }),
);

// ── Export ──
const onExport = async () => {
  if (!canExport.value) return toast.error("Akses ditolak.");
  if (!items.value.length) return toast.warning("Tidak ada data.");
  await exportExcelSingle(
    `Mutasi_Produksi_Detail_${startDate.value}_${endDate.value}`,
    "Mutasi Produksi Detail",
    [
      { header: "No. SPK", key: "Nomor", width: 18 },
      { header: "Nama SPK", key: "NamaSpk", width: 26 },
      { header: "Tgl SPK", key: "TglSpk", width: 14, align: "center" },
      { header: "Divisi", key: "Divisi", width: 10 },
      { header: "Tipe", key: "Tipe", width: 12 },
      { header: "No. Mutasi", key: "NomorMutasi", width: 16 },
      { header: "No. Permintaan", key: "NoPermintaan", width: 16 },
      {
        header: "Terpakai",
        key: "Terpakai",
        width: 12,
        align: "right",
        numFmt: "#,##0.00",
      },
      {
        header: "Babaran",
        key: "Babaran",
        width: 10,
        align: "right",
        numFmt: "#,##0.0000",
      },
      { header: "Kelompok", key: "Kelompok", width: 14 },
      { header: "Gudang Asal", key: "GudangAsal", width: 20 },
      { header: "Gudang Tujuan", key: "GudangTujuan", width: 20 },
      {
        header: "Tgl Mutasi",
        key: "TanggalMutasi",
        width: 14,
        align: "center",
      },
      { header: "Kode", key: "Kode", width: 14 },
      { header: "Komponen", key: "Komponen", width: 20 },
      {
        header: "Jumlah",
        key: "Jumlah",
        width: 12,
        align: "right",
        numFmt: "#,##0",
      },
      {
        header: "BS Lini",
        key: "BsLini",
        width: 10,
        align: "right",
        numFmt: "#,##0",
      },
      {
        header: "BS Kain Sbl",
        key: "BsKainSablon",
        width: 12,
        align: "right",
        numFmt: "#,##0",
      },
      {
        header: "BS Kain",
        key: "BsKain",
        width: 10,
        align: "right",
        numFmt: "#,##0",
      },
      { header: "Satuan", key: "Satuan", width: 10 },
      { header: "Size", key: "Size", width: 10 },
      { header: "Cab", key: "Cab", width: 10 },
    ],
    items.value,
    `Laporan Mutasi Produksi Detail — ${startDate.value} s.d. ${endDate.value}`,
  );
};

// ── Pivot — default sesuai konfigurasi Delphi:
// cols=[Gudang_Asal], rows=[Spk_nama, Komponen], vals=[Jumlah] ──
const pivotEl = ref<HTMLElement | null>(null);
const renderPivot = async () => {
  await nextTick();
  if (!pivotEl.value || !itemsWithBulan.value.length) return;
  const win = window as any;
  if (!win.jQuery || !win.jQuery.fn.pivotUI) return;
  win.jQuery(pivotEl.value).pivotUI(
    itemsWithBulan.value,
    {
      rows: ["NamaSpk", "Komponen"],
      cols: ["GudangAsal"],
      vals: ["Jumlah"],
      aggregatorName: "Sum",
      rendererName: "Table",
      unusedAttrsVertical: false,
    },
    true,
  );
};

// ── Chart ──
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
      rows: ["GudangAsal"],
      cols: ["Bulan"],
      vals: ["Jumlah"],
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
    title="Laporan Mutasi Produksi Detail"
    :menu-id="MENU_ID"
    :icon="IconLayoutGrid"
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

    <div class="mp-wrap">
      <!-- ── Filter bar ── -->
      <div class="filter-bar">
        <span class="filter-lbl">Periode Mutasi:</span>
        <input type="date" v-model="startDate" class="date-inp" />
        <span class="filter-sep">s.d.</span>
        <input type="date" v-model="endDate" class="date-inp" />

        <span class="filter-lbl ml">Cabang:</span>
        <select v-model="cab" class="sel-inp">
          <option value="ALL">ALL</option>
          <option value="P01">P01</option>
          <option value="P04">P04</option>
        </select>

        <span class="filter-lbl ml">No. SPK:</span>
        <div class="spk-picker">
          <input
            type="text"
            :value="nomorSpk"
            readonly
            class="text-inp"
            style="width: 130px; cursor: pointer"
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

        <span class="filter-lbl ml">Nama SPK:</span>
        <input
          type="text"
          v-model="namaSpk"
          class="text-inp"
          placeholder="Atau ketik nama..."
          style="width: 150px"
          :disabled="!!nomorSpk"
        />

        <v-btn
          size="small"
          color="primary"
          :loading="isLoading"
          :disabled="!canFetch"
          @click="fetchData"
        >
          <template #prepend>
            <IconRefresh :size="14" :stroke-width="1.7" />
          </template>
          Refresh
        </v-btn>

        <v-spacer />
        <div class="summary-chips">
          <span class="chip chip--blue">{{ items.length }} baris</span>
          <span class="chip chip--teal">
            Total Jumlah: <b>{{ fmtNum(totalJumlah) }}</b>
          </span>
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
          <div class="sg-title">Pilih No. SPK atau ketik Nama SPK</div>
          <div class="sg-sub">
            Laporan ini menggabungkan data dari 4 sumber transaksi sekaligus —
            untuk menjaga performa, data hanya dimuat setelah SPK ditentukan.
          </div>
        </div>
        <BaseTable
          v-else
          :headers="headers"
          :items="items"
          :is-loading="isLoading"
          item-value="NomorMutasi"
          summary-key="Jumlah"
          summary-label="Total Jumlah"
        >
          <template #item.TglSpk="{ item }">{{
            fmtDate(item.TglSpk)
          }}</template>
          <template #item.JumlahSpk="{ item }">{{
            fmtNum(item.JumlahSpk)
          }}</template>
          <template #item.TanggalMutasi="{ item }">{{
            fmtDate(item.TanggalMutasi)
          }}</template>
          <template #item.Terpakai="{ item }">
            <span style="font-family: monospace">{{
              fmtNum(item.Terpakai)
            }}</span>
          </template>
          <template #item.Babaran="{ item }">
            <span style="font-family: monospace">{{
              Number(item.Babaran || 0).toFixed(4)
            }}</span>
          </template>
          <template #item.Jumlah="{ item }">
            <span
              style="font-family: monospace; font-weight: 700; color: #1565c0"
            >
              {{ fmtNum(item.Jumlah) }}
            </span>
          </template>
          <template #item.BsLini="{ item }">
            <span style="font-family: monospace">{{
              fmtNum(item.BsLini)
            }}</span>
          </template>
          <template #item.BsKainSablon="{ item }">
            <span style="font-family: monospace">{{
              fmtNum(item.BsKainSablon)
            }}</span>
          </template>
          <template #item.BsKain="{ item }">
            <span style="font-family: monospace">{{
              fmtNum(item.BsKain)
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
      filter-mode="spk-ppic"
      @selected="onSpkSelected"
    />
  </PageLayout>
</template>

<style scoped>
.mp-wrap {
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
.chip--teal {
  background: #e0f2f1;
  color: #00695c;
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
</style>
