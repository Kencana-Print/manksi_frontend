<script setup lang="ts">
import { ref, computed, onMounted, watch } from "vue";
import { useAuthStore } from "@/stores/authStore";
import { useToast } from "vue-toastification";
import PageLayout from "@/components/PageLayout.vue";
import BaseTable from "@/components/BaseTable.vue";
import { rekapPenawaranService } from "@/services/laporan/marketing/rekapPenawaranService";
import { exportExcelSingle } from "@/utils/excelExport";
import {
  IconRefresh,
  IconFileSpreadsheet,
  IconX,
  IconLayoutGrid,
} from "@tabler/icons-vue";

const MENU_ID = "310";
const authStore = useAuthStore();
const toast = useToast();

// ── Filter ──
const now = new Date();
const bulan = ref(now.getMonth() + 1);
const tahun = ref(now.getFullYear());

const BULAN_NAMES = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];
const TAHUN_LIST = Array.from({ length: 6 }, (_, i) => now.getFullYear() - i);

// ── Tab ──
const activeTab = ref<"rekap" | "spanduk" | "garmen" | "mmt">("rekap");

// ── Data ──
const rekapRows = ref<any[]>([]);
const spandukRows = ref<any[]>([]);
const garmenRows = ref<any[]>([]);
const mmtRows = ref<any[]>([]);
const isLoading = ref(false);

const canExport = computed(() => authStore.can(MENU_ID, "view"));

// ── Active rows ──
const activeRows = computed(() => {
  if (activeTab.value === "rekap") return rekapRows.value;
  if (activeTab.value === "spanduk") return spandukRows.value;
  if (activeTab.value === "garmen") return garmenRows.value;
  return mmtRows.value;
});

// ── Fetch ──
const fetchData = async () => {
  isLoading.value = true;
  rekapRows.value = [];
  spandukRows.value = [];
  garmenRows.value = [];
  mmtRows.value = [];

  try {
    const params = { bulan: bulan.value, tahun: tahun.value };
    const [rRekap, rSpanduk, rGarmen, rMmt] = await Promise.allSettled([
      rekapPenawaranService.getRekap(params),
      rekapPenawaranService.getDetail({ ...params, divisi: "SPANDUK" }),
      rekapPenawaranService.getDetail({ ...params, divisi: "GARMEN" }),
      rekapPenawaranService.getDetail({ ...params, divisi: "MMT" }),
    ]);

    // ── Tambah handler untuk rejected ──
    if (rRekap.status === "fulfilled")
      rekapRows.value = rRekap.value.data.data || [];
    else
      toast.error(
        "Gagal memuat rekap: " + rRekap.reason?.response?.data?.message,
      );

    if (rSpanduk.status === "fulfilled")
      spandukRows.value = rSpanduk.value.data.data || [];
    else
      toast.error(
        "Gagal memuat spanduk: " + rSpanduk.reason?.response?.data?.message,
      );

    if (rGarmen.status === "fulfilled")
      garmenRows.value = rGarmen.value.data.data || [];
    else
      toast.error(
        "Gagal memuat garmen: " + rGarmen.reason?.response?.data?.message,
      );

    if (rMmt.status === "fulfilled") mmtRows.value = rMmt.value.data.data || [];
    else
      toast.error("Gagal memuat MMT: " + rMmt.reason?.response?.data?.message);
  } finally {
    isLoading.value = false;
  }
};

onMounted(fetchData);
watch([bulan, tahun], fetchData);

// ── Totals rekap ──
const totalNominal = computed(() =>
  rekapRows.value.reduce((s, r) => s + Number(r.Nominal || 0), 0),
);
const totalRealisasi = computed(() =>
  rekapRows.value.reduce((s, r) => s + Number(r.Realisasi || 0), 0),
);
const totalBatal = computed(() =>
  rekapRows.value.reduce((s, r) => s + Number(r.Batal || 0), 0),
);
const totalConfirm = computed(() =>
  rekapRows.value.reduce((s, r) => s + Number(r.Confirm || 0), 0),
);
const totalPresentase = computed(() =>
  totalNominal.value > 0
    ? Math.round((totalRealisasi.value / totalNominal.value) * 100 * 100) / 100
    : 0,
);
const totalPresentaseBatal = computed(() =>
  totalNominal.value > 0
    ? Math.round((totalBatal.value / totalNominal.value) * 100 * 100) / 100
    : 0,
);

const fmtNum = (n: number) =>
  new Intl.NumberFormat("id-ID").format(Math.round(n || 0));
const shortNum = (n: number) => {
  if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(1) + "M";
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "jt";
  if (n >= 1_000) return (n / 1_000).toFixed(0) + "rb";
  return String(n);
};

// ── Headers ──
const headersRekap = [
  { title: "Sales", key: "Sales", width: "140px" },
  { title: "Perusahaan", key: "Perush", width: "100px", align: "center" },
  { title: "Divisi", key: "Divisi", width: "90px" },
  { title: "Jml Pen.", key: "JmlPenawaran", width: "80px", align: "center" },
  { title: "Qty", key: "Qty", width: "100px", align: "right" },
  { title: "Nominal", key: "Nominal", width: "140px", align: "right" },
  { title: "Realisasi", key: "Realisasi", width: "140px", align: "right" },
  { title: "%", key: "Presentase", width: "65px", align: "right" },
  { title: "Batal", key: "Batal", width: "130px", align: "right" },
  { title: "% Batal", key: "PresentaseBatal", width: "75px", align: "right" },
  { title: "Confirm", key: "Confirm", width: "130px", align: "right" },
  {
    title: "% Confirm",
    key: "PresentaseConfirm",
    width: "80px",
    align: "right",
  },
];

const headersDetail = [
  { title: "Nomor", key: "Nomor", width: "150px" },
  { title: "Tanggal", key: "Tanggal", width: "100px", align: "center" },
  { title: "Perus.", key: "Perusahaan", width: "80px", align: "center" },
  { title: "Sales", key: "Sales", width: "130px" },
  { title: "Customer", key: "Customer", minWidth: "180px" },
  { title: "Status", key: "Status", width: "90px", align: "center" },
  { title: "Nama", key: "Nama", minWidth: "200px" },
  { title: "Ukuran", key: "Ukuran", width: "90px" },
  { title: "Bahan", key: "Bahan", width: "120px" },
  { title: "Harga", key: "Harga", width: "110px", align: "right" },
  { title: "Qty", key: "Qty", width: "80px", align: "right" },
  { title: "Nilai", key: "Nilai", width: "130px", align: "right" },
  { title: "Ket.", key: "Keterangan", width: "100px", align: "center" },
  { title: "Note", key: "Note", minWidth: "160px" },
];

// ── Row props rekap ──
const rowPropsRekap = (data: any) => {
  const div = (data.item?.Divisi || "").toUpperCase();
  if (div === "GARMEN") return { class: "row-garmen" };
  if (div === "SPANDUK") return { class: "row-spanduk" };
  if (div === "MMT") return { class: "row-mmt" };
  return {};
};

// ── Row props detail — warna per status ──
const rowPropsDetail = (data: any) => {
  const status = (data.item?.Status || "").toUpperCase();
  const ket = (data.item?.Keterangan || "").toUpperCase();
  if (status === "BATAL") return { class: "row-batal" };
  if (status === "CLOSE") return { class: "row-close" };
  if (ket === "ALTERNATIF") return { class: "row-alternatif" };
  return {};
};

// ── Export ──
const onExport = async () => {
  if (!canExport.value) return toast.error("Akses ditolak.");
  const tab = activeTab.value;
  const label = BULAN_NAMES[bulan.value - 1] + "_" + tahun.value;

  if (tab === "rekap") {
    await exportExcelSingle(
      `RekapPenawaran_${label}`,
      "Rekap Penawaran",
      [
        { header: "Sales", key: "Sales", width: 20 },
        { header: "Perusahaan", key: "Perush", width: 12, align: "center" },
        { header: "Divisi", key: "Divisi", width: 12 },
        { header: "Jml Pen.", key: "JmlPenawaran", width: 10, align: "center" },
        {
          header: "Qty",
          key: "Qty",
          width: 14,
          align: "right",
          numFmt: "#,##0.##",
        },
        {
          header: "Nominal",
          key: "Nominal",
          width: 18,
          align: "right",
          numFmt: "#,##0",
        },
        {
          header: "Realisasi",
          key: "Realisasi",
          width: 18,
          align: "right",
          numFmt: "#,##0",
        },
        {
          header: "%",
          key: "Presentase",
          width: 10,
          align: "right",
          numFmt: "0.00",
        },
        {
          header: "Batal",
          key: "Batal",
          width: 18,
          align: "right",
          numFmt: "#,##0",
        },
        {
          header: "% Batal",
          key: "PresentaseBatal",
          width: 10,
          align: "right",
          numFmt: "0.00",
        },
        {
          header: "Confirm",
          key: "Confirm",
          width: 18,
          align: "right",
          numFmt: "#,##0",
        },
        {
          header: "% Confirm",
          key: "PresentaseConfirm",
          width: 10,
          align: "right",
          numFmt: "0.00",
        },
      ],
      rekapRows.value,
      `Rekap Penawaran — ${BULAN_NAMES[bulan.value - 1]} ${tahun.value}`,
    );
  } else {
    const rows =
      tab === "spanduk"
        ? spandukRows.value
        : tab === "garmen"
          ? garmenRows.value
          : mmtRows.value;
    const tabLabel = tab.charAt(0).toUpperCase() + tab.slice(1);
    await exportExcelSingle(
      `RekapPenawaran_${tabLabel}_${label}`,
      `Detail ${tabLabel}`,
      [
        { header: "Nomor", key: "Nomor", width: 18 },
        { header: "Tanggal", key: "Tanggal", width: 12, align: "center" },
        { header: "Perus.", key: "Perusahaan", width: 8, align: "center" },
        { header: "Sales", key: "Sales", width: 18 },
        { header: "Customer", key: "Customer", width: 30 },
        { header: "Status", key: "Status", width: 10, align: "center" },
        { header: "Nama", key: "Nama", width: 32 },
        { header: "Ukuran", key: "Ukuran", width: 12 },
        { header: "Bahan", key: "Bahan", width: 16 },
        {
          header: "Harga",
          key: "Harga",
          width: 14,
          align: "right",
          numFmt: "#,##0",
        },
        {
          header: "Qty",
          key: "Qty",
          width: 10,
          align: "right",
          numFmt: "#,##0",
        },
        {
          header: "Nilai",
          key: "Nilai",
          width: 16,
          align: "right",
          numFmt: "#,##0",
        },
        { header: "Ket.", key: "Keterangan", width: 14, align: "center" },
        { header: "Note", key: "Note", width: 24 },
      ],
      rows,
      `Detail Penawaran ${tabLabel} — ${BULAN_NAMES[bulan.value - 1]} ${tahun.value}`,
    );
  }
};
</script>

<template>
  <PageLayout title="Rekap Penawaran" :menu-id="MENU_ID" :icon="IconLayoutGrid">
    <template #header-actions>
      <v-btn
        size="small"
        color="green"
        :disabled="!activeRows.length"
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

    <div class="rekap-pen-wrap">
      <!-- ── Filter bar ── -->
      <div class="filter-bar">
        <span class="filter-lbl">Periode:</span>
        <select v-model="bulan" class="sel-inp">
          <option v-for="(nm, i) in BULAN_NAMES" :key="i" :value="i + 1">
            {{ nm }}
          </option>
        </select>
        <select v-model="tahun" class="sel-inp">
          <option v-for="y in TAHUN_LIST" :key="y" :value="y">{{ y }}</option>
        </select>

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
          <span class="chip chip--blue">{{ rekapRows.length }} baris</span>
          <span class="chip chip--purple">
            Nominal: <b>{{ shortNum(totalNominal) }}</b>
          </span>
          <span class="chip chip--green">
            Realisasi: <b>{{ shortNum(totalRealisasi) }}</b>
            <span class="chip-pct">{{ totalPresentase }}%</span>
          </span>
          <span class="chip chip--red">
            Batal: <b>{{ shortNum(totalBatal) }}</b>
            <span class="chip-pct">{{ totalPresentaseBatal }}%</span>
          </span>
          <span class="chip chip--teal">
            Confirm: <b>{{ shortNum(totalConfirm) }}</b>
          </span>
        </div>
      </div>

      <!-- ── Tab bar ── -->
      <div class="tab-bar">
        <button
          class="tab-btn"
          :class="{ active: activeTab === 'rekap' }"
          @click="activeTab = 'rekap'"
        >
          Rekap Penawaran
          <span v-if="rekapRows.length" class="tab-count">{{
            rekapRows.length
          }}</span>
        </button>
        <button
          class="tab-btn"
          :class="{ active: activeTab === 'spanduk' }"
          @click="activeTab = 'spanduk'"
        >
          Spanduk
          <span v-if="spandukRows.length" class="tab-count tab-count--spanduk">
            {{ spandukRows.length }}
          </span>
        </button>
        <button
          class="tab-btn"
          :class="{ active: activeTab === 'garmen' }"
          @click="activeTab = 'garmen'"
        >
          Garmen
          <span v-if="garmenRows.length" class="tab-count tab-count--garmen">
            {{ garmenRows.length }}
          </span>
        </button>
        <button
          class="tab-btn"
          :class="{ active: activeTab === 'mmt' }"
          @click="activeTab = 'mmt'"
        >
          MMT
          <span v-if="mmtRows.length" class="tab-count tab-count--mmt">
            {{ mmtRows.length }}
          </span>
        </button>
      </div>

      <!-- ── Tab Rekap ── -->
      <div v-show="activeTab === 'rekap'" class="tab-content">
        <BaseTable
          :headers="headersRekap"
          :items="rekapRows"
          :is-loading="isLoading"
          item-value="Sales"
          :row-props-fn="rowPropsRekap"
          summary-key="Nominal"
          summary-label="Total Nominal"
        >
          <template #item.Qty="{ item }">
            <span style="font-family: monospace">
              {{ Number(item.Qty || 0).toLocaleString("id-ID") }}
            </span>
          </template>
          <template #item.Nominal="{ item }">
            <span
              style="font-family: monospace; font-weight: 700; color: #1565c0"
            >
              {{ fmtNum(item.Nominal) }}
            </span>
          </template>
          <template #item.Realisasi="{ item }">
            <span
              style="font-family: monospace; color: #2e7d32; font-weight: 600"
            >
              {{ fmtNum(item.Realisasi) }}
            </span>
          </template>
          <template #item.Presentase="{ item }">
            <span
              style="font-weight: 700"
              :style="{
                color:
                  Number(item.Presentase) >= 100
                    ? '#2e7d32'
                    : Number(item.Presentase) >= 50
                      ? '#f57f17'
                      : '#c62828',
              }"
            >
              {{ Number(item.Presentase || 0).toFixed(2) }}%
            </span>
          </template>
          <template #item.Batal="{ item }">
            <span style="font-family: monospace; color: #c62828">
              {{ fmtNum(item.Batal) }}
            </span>
          </template>
          <template #item.PresentaseBatal="{ item }">
            <span
              style="font-weight: 700"
              :style="{
                color:
                  Number(item.PresentaseBatal) > 50
                    ? '#c62828'
                    : Number(item.PresentaseBatal) > 20
                      ? '#f57f17'
                      : '#424242',
              }"
            >
              {{ Number(item.PresentaseBatal || 0).toFixed(2) }}%
            </span>
          </template>
          <template #item.Confirm="{ item }">
            <span
              style="font-family: monospace; color: #6a1b9a; font-weight: 600"
            >
              {{ fmtNum(item.Confirm) }}
            </span>
          </template>
          <template #item.PresentaseConfirm="{ item }">
            <span style="font-weight: 700; color: #6a1b9a">
              {{ Number(item.PresentaseConfirm || 0).toFixed(2) }}%
            </span>
          </template>

          <template #summary-row="{ filteredItems }">
            <div class="multi-summary-bar">
              <span class="ms-item">
                <span class="ms-lbl">Nominal</span>
                <span class="ms-val">
                  {{
                    fmtNum(
                      filteredItems.reduce(
                        (s: number, r: any) => s + Number(r.Nominal || 0),
                        0,
                      ),
                    )
                  }}
                </span>
              </span>
              <span class="ms-sep">|</span>
              <span class="ms-item">
                <span class="ms-lbl">Realisasi</span>
                <span class="ms-val ms-green">
                  {{
                    fmtNum(
                      filteredItems.reduce(
                        (s: number, r: any) => s + Number(r.Realisasi || 0),
                        0,
                      ),
                    )
                  }}
                </span>
              </span>
              <span class="ms-sep">|</span>
              <span class="ms-item">
                <span class="ms-lbl">%</span>
                <span class="ms-val ms-green">
                  {{
                    (() => {
                      const nom = filteredItems.reduce(
                        (s: number, r: any) => s + Number(r.Nominal || 0),
                        0,
                      );
                      const rel = filteredItems.reduce(
                        (s: number, r: any) => s + Number(r.Realisasi || 0),
                        0,
                      );
                      return nom > 0
                        ? ((rel / nom) * 100).toFixed(2) + "%"
                        : "0%";
                    })()
                  }}
                </span>
              </span>
              <span class="ms-sep">|</span>
              <span class="ms-item">
                <span class="ms-lbl">Batal</span>
                <span class="ms-val ms-red">
                  {{
                    fmtNum(
                      filteredItems.reduce(
                        (s: number, r: any) => s + Number(r.Batal || 0),
                        0,
                      ),
                    )
                  }}
                </span>
              </span>
              <span class="ms-sep">|</span>
              <span class="ms-item">
                <span class="ms-lbl">% Batal</span>
                <span class="ms-val ms-red">
                  {{
                    (() => {
                      const nom = filteredItems.reduce(
                        (s: number, r: any) => s + Number(r.Nominal || 0),
                        0,
                      );
                      const bat = filteredItems.reduce(
                        (s: number, r: any) => s + Number(r.Batal || 0),
                        0,
                      );
                      return nom > 0
                        ? ((bat / nom) * 100).toFixed(2) + "%"
                        : "0%";
                    })()
                  }}
                </span>
              </span>
              <span class="ms-sep">|</span>
              <span class="ms-item">
                <span class="ms-lbl">Confirm</span>
                <span class="ms-val ms-purple">
                  {{
                    fmtNum(
                      filteredItems.reduce(
                        (s: number, r: any) => s + Number(r.Confirm || 0),
                        0,
                      ),
                    )
                  }}
                </span>
              </span>
            </div>
          </template>
        </BaseTable>
      </div>

      <!-- ── Tab Detail (Spanduk / Garmen / MMT) ── -->
      <template
        v-for="tabKey in ['spanduk', 'garmen', 'mmt'] as const"
        :key="tabKey"
      >
        <div v-show="activeTab === tabKey" class="tab-content">
          <div class="detail-table-wrap">
            <BaseTable
              :headers="headersDetail"
              :items="
                tabKey === 'spanduk'
                  ? spandukRows
                  : tabKey === 'garmen'
                    ? garmenRows
                    : mmtRows
              "
              :is-loading="isLoading"
              item-value="Nomor"
              :row-props-fn="rowPropsDetail"
              summary-key="Nilai"
              summary-label="Total Nilai"
            >
              <template #item.Tanggal="{ item }">
                {{ item.Tanggal?.replace(/-/g, "/") }}
              </template>
              <template #item.Status="{ item }">
                <span
                  class="status-badge"
                  :class="{
                    'badge-close': item.Status === 'CLOSE',
                    'badge-batal': item.Status === 'BATAL',
                    'badge-open': item.Status === 'OPEN',
                  }"
                >
                  {{ item.Status }}
                </span>
              </template>
              <template #item.Harga="{ item }">
                <span style="font-family: monospace">{{
                  fmtNum(item.Harga)
                }}</span>
              </template>
              <template #item.Qty="{ item }">
                <span style="font-family: monospace">{{
                  fmtNum(item.Qty)
                }}</span>
              </template>
              <template #item.Nilai="{ item }">
                <span
                  style="
                    font-family: monospace;
                    font-weight: 700;
                    color: #1565c0;
                  "
                >
                  {{ fmtNum(item.Nilai) }}
                </span>
              </template>
              <template #item.Keterangan="{ item }">
                <span v-if="item.Keterangan" class="alt-badge">
                  {{ item.Keterangan }}
                </span>
                <span v-else>-</span>
              </template>
              <template #item.Note="{ item }">
                <span class="note-text" :title="item.Note">{{
                  item.Note || "-"
                }}</span>
              </template>

              <template #summary-row="{ filteredItems }">
                <div class="multi-summary-bar">
                  <span class="ms-item">
                    <span class="ms-lbl">Total Nilai</span>
                    <span class="ms-val">
                      {{
                        fmtNum(
                          filteredItems.reduce(
                            (s: number, r: any) => s + Number(r.Nilai || 0),
                            0,
                          ),
                        )
                      }}
                    </span>
                  </span>
                  <span class="ms-sep">|</span>
                  <span class="ms-item">
                    <span class="ms-lbl">Total Qty</span>
                    <span class="ms-val ms-teal">
                      {{
                        fmtNum(
                          filteredItems.reduce(
                            (s: number, r: any) => s + Number(r.Qty || 0),
                            0,
                          ),
                        )
                      }}
                    </span>
                  </span>
                  <span class="ms-sep">|</span>
                  <span class="ms-item">
                    <span class="ms-lbl">Close</span>
                    <span class="ms-val ms-green">
                      {{
                        filteredItems.filter((r: any) => r.Status === "CLOSE")
                          .length
                      }}
                    </span>
                  </span>
                  <span class="ms-sep">|</span>
                  <span class="ms-item">
                    <span class="ms-lbl">Batal</span>
                    <span class="ms-val ms-red">
                      {{
                        filteredItems.filter((r: any) => r.Status === "BATAL")
                          .length
                      }}
                    </span>
                  </span>
                  <span class="ms-sep">|</span>
                  <span class="ms-item">
                    <span class="ms-lbl">Open</span>
                    <span class="ms-val ms-orange">
                      {{
                        filteredItems.filter((r: any) => r.Status === "OPEN")
                          .length
                      }}
                    </span>
                  </span>
                </div>
              </template>
            </BaseTable>
          </div>
        </div>
      </template>
    </div>
  </PageLayout>
</template>

<style scoped>
.rekap-pen-wrap {
  display: flex;
  flex-direction: column;
  height: 100%;
  gap: 0;
}

/* ── Filter bar ── */
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
}
.sel-inp {
  height: 32px;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  padding: 0 8px;
  font-size: 12px;
  color: #424242;
  background: white;
  outline: none;
  cursor: pointer;
}
.sel-inp:focus {
  border-color: #1867c0;
}

/* ── Summary chips ── */
.summary-chips {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}
.chip {
  font-size: 11px;
  padding: 2px 10px;
  border-radius: 10px;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 4px;
}
.chip--blue {
  background: #e3f2fd;
  color: #1565c0;
}
.chip--purple {
  background: #f3e5f5;
  color: #6a1b9a;
}
.chip--green {
  background: #e8f5e9;
  color: #2e7d32;
}
.chip--red {
  background: #ffebee;
  color: #c62828;
}
.chip--teal {
  background: #e0f2f1;
  color: #00695c;
}
.chip-pct {
  font-size: 10px;
  opacity: 0.75;
  margin-left: 2px;
}

/* ── Tab bar ── */
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
  gap: 6px;
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

.tab-count {
  font-size: 10px;
  font-weight: 700;
  background: #e3f2fd;
  color: #1565c0;
  padding: 1px 6px;
  border-radius: 8px;
}
.tab-count--spanduk {
  background: #e3f2fd;
  color: #1565c0;
}
.tab-count--garmen {
  background: #fce4ec;
  color: #c62828;
}
.tab-count--mmt {
  background: #e8f5e9;
  color: #2e7d32;
}

/* ── Tab content ── */
.tab-content {
  flex: 1;
  min-height: 0;
  overflow: auto;
}

/* ── Detail table scroll ── */
.detail-table-wrap {
  height: 100%;
  display: flex;
  flex-direction: column;
}
.detail-table-wrap :deep(.bt-table table) {
  table-layout: auto !important;
  min-width: 1600px;
}
.detail-table-wrap :deep(.bt-table tbody td) {
  max-width: none !important;
  white-space: nowrap !important;
  overflow: visible !important;
  text-overflow: unset !important;
}

/* ── Row coloring rekap ── */
:deep(.row-garmen td) {
  background: #fce4ec !important;
}
:deep(.row-spanduk td) {
  background: #e3f2fd !important;
}
:deep(.row-mmt td) {
  background: #e8f5e9 !important;
}

/* ── Row coloring detail ── */
:deep(.row-batal td) {
  background: #ffebee !important;
}
:deep(.row-close td) {
  background: #f1f8e9 !important;
}
:deep(.row-alternatif td) {
  background: #fff8e1 !important;
}

/* ── Status badge ── */
.status-badge {
  display: inline-block;
  font-size: 10px;
  font-weight: 700;
  padding: 1px 8px;
  border-radius: 3px;
}
.badge-close {
  background: #e8f5e9;
  color: #2e7d32;
}
.badge-batal {
  background: #ffebee;
  color: #c62828;
}
.badge-open {
  background: #e3f2fd;
  color: #1565c0;
}

/* ── Alternatif badge ── */
.alt-badge {
  display: inline-block;
  font-size: 10px;
  font-weight: 700;
  padding: 1px 8px;
  border-radius: 3px;
  background: #fff8e1;
  color: #f57f17;
}

.note-text {
  font-size: 11px;
  color: #616161;
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  display: block;
}

/* ── Multi summary bar ── */
.multi-summary-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 5px 12px;
  background: #1565c0;
  min-width: max-content;
  height: 30px;
}
.ms-item {
  display: flex;
  align-items: center;
  gap: 6px;
}
.ms-lbl {
  font-size: 10px;
  color: rgba(255, 255, 255, 0.7);
  font-weight: 600;
  text-transform: uppercase;
}
.ms-val {
  font-size: 12px;
  font-weight: 700;
  color: white;
  font-family: monospace;
}
.ms-green {
  color: #a5d6a7;
}
.ms-teal {
  color: #80cbc4;
}
.ms-red {
  color: #ef9a9a;
}
.ms-orange {
  color: #ffcc80;
}
.ms-purple {
  color: #ce93d8;
}
.ms-sep {
  color: rgba(255, 255, 255, 0.3);
  font-size: 12px;
}
</style>
