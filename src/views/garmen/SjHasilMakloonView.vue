<script setup lang="ts">
import { ref, computed, onMounted, watch } from "vue";
import { useRouter } from "vue-router";
import { useToast } from "vue-toastification";
import BaseBrowse from "@/components/BaseBrowse.vue";
import { sjHasilMakloonService } from "@/services/garmen/sjHasilMakloonService";
import { IconTruckDelivery, IconPrinter } from "@tabler/icons-vue";

const router = useRouter();
const toast = useToast();

const activeTab = ref<"outstanding" | "history">("outstanding");

const today = new Date();
const padDate = (n: number) => String(n).padStart(2, "0");
const toLocalDate = (d: Date) =>
  `${d.getFullYear()}-${padDate(d.getMonth() + 1)}-${padDate(d.getDate())}`;
const firstDayOfMonth = toLocalDate(
  new Date(today.getFullYear(), today.getMonth(), 1),
);
const todayStr = toLocalDate(today);

const dtAwal = ref(firstDayOfMonth);
const dtAkhir = ref(todayStr);
const cabFilter = ref("ALL");
const CABANG_LIST = ["ALL", "P01", "P02", "P04", "P05"];

const outstandingItems = ref<any[]>([]);
const historyItems = ref<any[]>([]);
const isLoading = ref(false);
const selectedOutstanding = ref<any[]>([]);
const selectedHistory = ref<any[]>([]);

const fetchOutstanding = async () => {
  isLoading.value = true;
  try {
    const res = await sjHasilMakloonService.getOutstanding({
      startDate: dtAwal.value,
      endDate: dtAkhir.value,
      cab: cabFilter.value,
    });
    outstandingItems.value = res.data.data;
    selectedOutstanding.value = [];
  } catch (e: any) {
    toast.error(e.response?.data?.message || "Gagal memuat data outstanding.");
  } finally {
    isLoading.value = false;
  }
};

const fetchHistory = async () => {
  isLoading.value = true;
  try {
    const res = await sjHasilMakloonService.getHistory({
      startDate: dtAwal.value,
      endDate: dtAkhir.value,
      cab: cabFilter.value,
    });
    historyItems.value = res.data.data;
  } catch (e: any) {
    toast.error(e.response?.data?.message || "Gagal memuat riwayat SJ.");
  } finally {
    isLoading.value = false;
  }
};

const fetchActiveTab = () => {
  if (activeTab.value === "outstanding") fetchOutstanding();
  else fetchHistory();
};

watch(activeTab, fetchActiveTab);
watch([dtAwal, dtAkhir, cabFilter], fetchActiveTab);
onMounted(fetchActiveTab);

// ── Guard: cuma boleh gabung baris dari 1 No. Maklon yang sama.
// Divalidasi SETELAH seleksi (bukan intercept klik), sesuai pola
// BaseBrowse yang tidak punya hook per-row selection custom.
const distinctMklNomor = computed(
  () => new Set(selectedOutstanding.value.map((r) => r.MklNomor)),
);
const canBuatSj = computed(
  () =>
    selectedOutstanding.value.length > 0 && distinctMklNomor.value.size === 1,
);

const goBuatSj = () => {
  if (selectedOutstanding.value.length === 0) return;
  if (distinctMklNomor.value.size > 1) {
    toast.warning(
      `Baris yang dipilih berasal dari No. Maklon berbeda (${Array.from(distinctMklNomor.value).join(", ")}). ` +
        `Pilih baris dari 1 No. Maklon yang sama saja.`,
    );
    return;
  }
  const ids = selectedOutstanding.value.map((r) => r.DtfMaklonId).join(",");
  router.push(`/garmen/makloon/sj-hasil-makloon/create?ids=${ids}`);
};

const outstandingHeaders = [
  { title: "No. Maklon", key: "MklNomor", width: "150px" },
  { title: "Tanggal", key: "Tanggal", width: "100px", align: "center" },
  { title: "Cab Asal", key: "CabAsal", width: "160px" },
  { title: "Cab Tujuan", key: "CabTujuan", width: "160px" },
  { title: "Item Polos", key: "KodePolos", width: "200px" },
  { title: "Qty Masuk", key: "QtyMasuk", width: "90px", align: "right" },
  { title: "Item Hasil", key: "KodeHasil", width: "200px" },
  { title: "Qty Hasil", key: "QtyHasil", width: "90px", align: "right" },
  { title: "BS/Afval", key: "BsAfval", width: "90px", align: "right" },
  { title: "Satuan", key: "Satuan", width: "70px" },
  { title: "Keterangan", key: "Keterangan", minWidth: "160px" },
];

const historyHeaders = [
  { title: "No. SJ", key: "Nomor", width: "170px" },
  { title: "No. Maklon", key: "MklNomor", width: "150px" },
  { title: "Tanggal", key: "Tanggal", width: "100px", align: "center" },
  { title: "Cab Penerima", key: "CabPenerima", width: "170px" },
  { title: "Jml Item", key: "JmlItem", width: "80px", align: "center" },
  { title: "Total Terima", key: "TotalTerima", width: "110px", align: "right" },
  { title: "Total BS", key: "TotalBs", width: "90px", align: "right" },
  { title: "User", key: "UserCreate", width: "90px" },
];

const goDetailHistory = (item: any) => {
  router.push(
    `/garmen/makloon/sj-hasil-makloon/${encodeURIComponent(item.Nomor)}`,
  );
};

const numFmt = (v: any) =>
  v != null ? Number(v).toLocaleString("id-ID") : "0";
const tglFmt = (v: any) => {
  if (!v) return "-";
  const d = new Date(v);
  if (isNaN(d.getTime())) return v;
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
};

const expandedHistory = ref<any[]>([]);
const historyDetailCache = ref<Record<string, any[]>>({});
const historyDetailLoading = ref<Record<string, boolean>>({});

const onUpdateExpandedHistory = async (newExpanded: any[]) => {
  expandedHistory.value = newExpanded;
  const newlyExpanded = newExpanded.filter(
    (item) =>
      !historyDetailCache.value[item.Nomor] &&
      !historyDetailLoading.value[item.Nomor],
  );
  for (const item of newlyExpanded) {
    const nomor = item.Nomor;
    historyDetailLoading.value[nomor] = true;
    try {
      const res = await sjHasilMakloonService.getHistoryDetail(nomor);
      historyDetailCache.value[nomor] = res.data.data;
    } catch {
      toast.error(`Gagal memuat detail ${nomor}`);
    } finally {
      historyDetailLoading.value[nomor] = false;
    }
  }
};

const openPrintTab = (nomor: string) => {
  const url = router.resolve({
    name: "SjHasilMakloonPrint",
    params: { nomor },
  }).href;
  window.open(url, "_blank");
};
</script>

<template>
  <div class="sjhm-tabs-wrap">
    <div class="sjhm-tabs">
      <button
        type="button"
        class="sjhm-tab"
        :class="{ active: activeTab === 'outstanding' }"
        @click="activeTab = 'outstanding'"
      >
        Outstanding
      </button>
      <button
        type="button"
        class="sjhm-tab"
        :class="{ active: activeTab === 'history' }"
        @click="activeTab = 'history'"
      >
        History
      </button>
    </div>

    <!-- TAB OUTSTANDING -->
    <BaseBrowse
      v-if="activeTab === 'outstanding'"
      title="SJ Hasil Maklon — Outstanding"
      menu-id="182"
      :icon="IconTruckDelivery"
      :headers="outstandingHeaders"
      :items="outstandingItems"
      :is-loading="isLoading"
      v-model:selected="selectedOutstanding"
      select-strategy="page"
      :can-insert="false"
      :can-edit="false"
      :can-delete="false"
      :can-export="false"
      item-value="DtfMaklonId"
      @refresh="fetchOutstanding"
    >
      <template #filter-left>
        <div class="f-group">
          <span class="f-label">Periode</span>
          <input type="date" v-model="dtAwal" class="f-inp" />
          <span class="f-sep">s/d</span>
          <input type="date" v-model="dtAkhir" class="f-inp" />
        </div>
        <div class="f-group">
          <span class="f-label">Cab</span>
          <select v-model="cabFilter" class="f-inp">
            <option v-for="c in CABANG_LIST" :key="c" :value="c">
              {{ c === "ALL" ? "SEMUA CABANG" : c }}
            </option>
          </select>
        </div>
      </template>

      <template #extra-actions>
        <v-btn
          color="primary"
          size="small"
          :disabled="!canBuatSj"
          @click="goBuatSj"
        >
          <template #prepend><IconTruckDelivery :size="15" /></template>
          Buat SJ Hasil Maklon ({{ selectedOutstanding.length }})
        </v-btn>
      </template>

      <template #item.MklNomor="{ item }">
        <span class="mono">{{ item.MklNomor }}</span>
      </template>
      <template #item.Tanggal="{ item }">{{ tglFmt(item.Tanggal) }}</template>
      <template #item.CabAsal="{ item }"
        >{{ item.CabAsal }} — {{ item.NamaCabAsal }}</template
      >
      <template #item.CabTujuan="{ item }"
        >{{ item.CabTujuan }} — {{ item.NamaCabTujuan }}</template
      >
      <template #item.KodePolos="{ item }">
        <div class="mono">{{ item.KodePolos }}</div>
        <div class="row-subtext">{{ item.NamaPolos }}</div>
      </template>
      <template #item.KodeHasil="{ item }">
        <div class="mono">{{ item.KodeHasil }}</div>
        <div class="row-subtext">{{ item.NamaHasil }}</div>
      </template>
      <template #item.QtyMasuk="{ item }">{{ numFmt(item.QtyMasuk) }}</template>
      <template #item.QtyHasil="{ item }">{{ numFmt(item.QtyHasil) }}</template>
      <template #item.BsAfval="{ item }">{{ numFmt(item.BsAfval) }}</template>
    </BaseBrowse>

    <!-- TAB HISTORY -->
    <BaseBrowse
      v-else
      title="SJ Hasil Maklon — History"
      menu-id="182"
      :icon="IconTruckDelivery"
      :headers="historyHeaders"
      :items="historyItems"
      :is-loading="isLoading"
      v-model:selected="selectedHistory"
      select-strategy="single"
      :can-insert="false"
      :can-edit="false"
      :can-delete="false"
      :can-export="false"
      item-value="Nomor"
      show-expand
      :expanded="expandedHistory"
      @update:expanded="onUpdateExpandedHistory"
      @refresh="fetchHistory"
    >
      <template #filter-left>
        <div class="f-group">
          <span class="f-label">Periode</span>
          <input type="date" v-model="dtAwal" class="f-inp" />
          <span class="f-sep">s/d</span>
          <input type="date" v-model="dtAkhir" class="f-inp" />
        </div>
        <div class="f-group">
          <span class="f-label">Cab</span>
          <select v-model="cabFilter" class="f-inp">
            <option v-for="c in CABANG_LIST" :key="c" :value="c">
              {{ c === "ALL" ? "SEMUA CABANG" : c }}
            </option>
          </select>
        </div>
      </template>

      <template #extra-actions>
        <v-btn
          size="small"
          color="grey-darken-3"
          :disabled="!selectedHistory[0]"
          @click="openPrintTab(selectedHistory[0].Nomor)"
        >
          <template #prepend><IconPrinter :size="15" /></template>
          Cetak Ulang
        </v-btn>
      </template>

      <template #item.Nomor="{ item }">
        <span class="mono">{{ item.Nomor }}</span>
      </template>
      <template #item.MklNomor="{ item }">
        <span class="mono">{{ item.MklNomor }}</span>
      </template>
      <template #item.Tanggal="{ item }">{{ tglFmt(item.Tanggal) }}</template>
      <template #item.CabPenerima="{ item }"
        >{{ item.CabPenerima }} — {{ item.NamaCabPenerima }}</template
      >
      <template #item.TotalTerima="{ item }">{{
        numFmt(item.TotalTerima)
      }}</template>
      <template #item.TotalBs="{ item }">{{ numFmt(item.TotalBs) }}</template>
      <template #detail="{ item }">
        <div class="expand-wrap">
          <v-progress-linear
            v-if="historyDetailLoading[item.Nomor]"
            indeterminate
            color="primary"
            height="2"
          />
          <div v-else-if="historyDetailCache[item.Nomor]">
            <div class="expand-title mb-2">Detail SJ — {{ item.Nomor }}</div>
            <table class="detail-table">
              <thead>
                <tr>
                  <th>Item Barang Jadi</th>
                  <th class="tr">Qty Terima</th>
                  <th class="tr">BS</th>
                  <th>Satuan</th>
                  <th>No. LHK DTF</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(d, i) in historyDetailCache[item.Nomor]" :key="i">
                  <td>
                    <div class="mono">{{ d.KodeJadi }}</div>
                    <div class="row-subtext">{{ d.NamaJadi }}</div>
                  </td>
                  <td class="tr fw">{{ numFmt(d.QtyTerima) }}</td>
                  <td class="tr">{{ numFmt(d.QtyBs) }}</td>
                  <td>{{ d.Satuan }}</td>
                  <td class="mono">{{ d.LhkNomor || "-" }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </template>
    </BaseBrowse>
  </div>
</template>

<style scoped>
.sjhm-tabs-wrap {
  display: flex;
  flex-direction: column;
  height: 100%;
}
.sjhm-tabs {
  display: flex;
  gap: 4px;
  padding: 8px 8px 0;
  flex-shrink: 0;
}
.sjhm-tab {
  padding: 8px 16px;
  font-size: 12px;
  font-weight: 700;
  border: none;
  background: transparent;
  color: #757575;
  cursor: pointer;
  border-bottom: 2px solid transparent;
}
.sjhm-tab.active {
  color: #1565c0;
  border-bottom-color: #1565c0;
}
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
.f-inp {
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
.mono {
  font-family: monospace;
  font-weight: 600;
}
.row-subtext {
  font-size: 10px;
  color: #888;
}
.expand-wrap {
  padding: 10px 10px 10px 50px;
  background: #eceff1;
}
.expand-title {
  font-size: 12px;
  font-weight: 700;
  color: #1565c0;
}
.mb-2 {
  margin-bottom: 8px;
}
.detail-table {
  width: 100%;
  border-collapse: collapse;
  background: white;
  border-radius: 4px;
  overflow: hidden;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.08);
}
.detail-table th {
  background: #546e7a;
  color: white;
  text-align: left;
  padding: 6px 10px;
  font-size: 11px;
  font-weight: 600;
}
.detail-table th.tr {
  text-align: right;
}
.detail-table td {
  padding: 4px 10px;
  border-bottom: 1px solid #eee;
  font-size: 11px;
}
.detail-table td.tr {
  text-align: right;
}
.detail-table td.fw {
  font-weight: 700;
}
.mono {
  font-family: monospace;
  font-weight: 600;
}
.row-subtext {
  font-size: 10px;
  color: #888;
}
</style>
