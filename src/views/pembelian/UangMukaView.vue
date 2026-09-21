<script setup lang="ts">
import { ref, computed, onMounted, watch } from "vue";
import { useAuthStore } from "@/stores/authStore";
import { useRouter } from "vue-router";
import { useToast } from "vue-toastification";
import BaseBrowse from "@/components/BaseBrowse.vue";
import { uangMukaService } from "@/services/pembelian/uangMukaService";
import { pengajuanUangMukaService } from "@/services/pembelian/pengajuanUangMukaService";
import { IconCash, IconSend } from "@tabler/icons-vue";
import NumberInputIDR from "@/components/NumberInputIDR.vue";

const authStore = useAuthStore();
const router = useRouter();
const toast = useToast();

const userBagian = computed(() => (authStore.user?.bagian || "").toUpperCase());
const isAdmin = computed(
  () => (authStore.user?.kode || "").toUpperCase() === "ADMIN",
);

const activeTab = ref<"outstanding" | "pum-outstanding" | "history">(
  "outstanding",
);

const canSeeOutstandingSumber = computed(
  () =>
    isAdmin.value || ["PEMBELIAN", "EDP", "AUDIT"].includes(userBagian.value),
);
const canRealisasi = computed(
  () => isAdmin.value || userBagian.value === "FINANCE",
);

const today = new Date();
const padDate = (n: number) => String(n).padStart(2, "0");
const toLocalDate = (d: Date) =>
  `${d.getFullYear()}-${padDate(d.getMonth() + 1)}-${padDate(d.getDate())}`;
const firstDayOfMonth = toLocalDate(
  new Date(today.getFullYear(), today.getMonth(), 1),
);
const todayStr = toLocalDate(today);

const filters = ref({
  dtAwal: firstDayOfMonth,
  dtAkhir: todayStr,
  cabFilter: "ALL",
});

const CABANG_LIST = ["ALL", "P01", "P02", "P04", "P05"];

const outstandingItems = ref<any[]>([]);
const isLoading = ref(false);
const selectedOutstanding = ref<any[]>([]);
const pumOutstandingItems = ref<any[]>([]);
const pumHistoryItems = ref<any[]>([]);
const selectedPumOutstanding = ref<any[]>([]);
const selectedPumHistory = ref<any[]>([]);

const fetchOutstanding = async () => {
  isLoading.value = true;
  try {
    const res = await uangMukaService.getOutstanding({
      startDate: filters.value.dtAwal,
      endDate: filters.value.dtAkhir,
    });
    outstandingItems.value = res.data.items.map((r: any) => ({
      ...r,
      RowKey: `${r.Sumber}-${r.Nomor}`,
    }));
    selectedOutstanding.value = [];
  } catch (e: any) {
    toast.error(e.response?.data?.message || "Gagal memuat data outstanding.");
  } finally {
    isLoading.value = false;
  }
};

const fetchPumOutstanding = async () => {
  isLoading.value = true;
  try {
    const res = await pengajuanUangMukaService.getBrowse({
      startDate: filters.value.dtAwal,
      endDate: filters.value.dtAkhir,
      cabang:
        filters.value.cabFilter === "ALL" ? undefined : filters.value.cabFilter,
      status: "OUTSTANDING",
    });
    pumOutstandingItems.value = res.data;
  } catch (e: any) {
    toast.error(
      e.response?.data?.message || "Gagal memuat Pengajuan Uang Muka.",
    );
  } finally {
    isLoading.value = false;
  }
};

const fetchPumHistory = async () => {
  isLoading.value = true;
  try {
    const res = await pengajuanUangMukaService.getBrowse({
      startDate: filters.value.dtAwal,
      endDate: filters.value.dtAkhir,
      cabang:
        filters.value.cabFilter === "ALL" ? undefined : filters.value.cabFilter,
      status: "HISTORY",
    });
    pumHistoryItems.value = res.data;
  } catch (e: any) {
    toast.error(
      e.response?.data?.message || "Gagal memuat riwayat Pengajuan Uang Muka.",
    );
  } finally {
    isLoading.value = false;
  }
};

const fetchActiveTab = () => {
  if (activeTab.value === "outstanding") fetchOutstanding();
  else if (activeTab.value === "pum-outstanding") fetchPumOutstanding();
  else fetchPumHistory();
};

watch(() => [filters.value.dtAwal, filters.value.dtAkhir], fetchActiveTab);
watch(
  () => filters.value.cabFilter,
  () => {
    if (activeTab.value !== "outstanding") fetchActiveTab();
  },
);
onMounted(() => {
  if (!canSeeOutstandingSumber.value && userBagian.value === "FINANCE") {
    activeTab.value = "pum-outstanding";
  }
  fetchActiveTab();
});

// ── Guard: baris Outstanding yang dipilih tidak harus dari Sumber yang sama ──
const canAjukan = computed(() => selectedOutstanding.value.length > 0);

const numFmt = (v: any) =>
  v != null ? Number(v).toLocaleString("id-ID") : "0";
const tglFmt = (v: any) => {
  if (!v) return "-";
  const d = new Date(v);
  if (isNaN(d.getTime())) return v;
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
};
const sumberLabel = (v: string) =>
  v === "PENGAJUAN_DANA" ? "Pengajuan Dana" : "Permintaan Pembelian";

const STATUS_LABEL: Record<
  string,
  { label: string; color: string; bg: string }
> = {
  DIAJUKAN: { label: "Diajukan", color: "#e65100", bg: "#fff3e0" },
  REALISASI: { label: "Realisasi", color: "#2e7d32", bg: "#e8f5e9" },
  DITOLAK: { label: "Ditolak", color: "#c62828", bg: "#ffebee" },
  BATAL: { label: "Batal", color: "#616161", bg: "#f5f5f5" },
};

// ── Dialog Ajukan ──
const showAjukanDialog = ref(false);
const ajukanTanggal = ref(todayStr);
const ajukanKeterangan = ref("");
const isSubmittingAjukan = ref(false);
const ajukanItems = ref<any[]>([]);
const isLoadingAjukanDetail = ref(false);

const openAjukanDialog = async () => {
  if (!canAjukan.value) return;
  ajukanTanggal.value = todayStr;
  ajukanKeterangan.value = "";
  showAjukanDialog.value = true;
  isLoadingAjukanDetail.value = true;
  try {
    const results = await Promise.all(
      selectedOutstanding.value.map((h) =>
        uangMukaService
          .getOutstandingDetail(h.Sumber, h.Nomor)
          .then((res) => ({ header: h, items: res.data })),
      ),
    );
    ajukanItems.value = results.flatMap(({ header, items }) =>
      items.map((it: any) => {
        // Field nominal beda nama tergantung sumber: PENGAJUAN_DANA pakai
        // RpPengajuan (dari ga2.viewpengajuan), PERMINTAAN_PEMBELIAN pakai
        // Nominal langsung (dari tgarmenmintabeli_dtl).
        const nominalSumber =
          header.Sumber === "PENGAJUAN_DANA"
            ? Number(it.RpPengajuan) || 0
            : Number(it.Nominal) || 0;
        return {
          Sumber: header.Sumber,
          NomorHeader: header.Nomor,
          ItemNourut: it.ItemNourut,
          Nama: it.Nama,
          Satuan: it.Satuan,
          Qty: it.Qty,
          Keterangan: header.Keterangan,
          NominalSumber: nominalSumber, // readonly, dari sumber — audit trail
          NominalAjuan: nominalSumber, // editable manual oleh Purchasing
        };
      }),
    );
  } catch (e: any) {
    toast.error(e.response?.data?.message || "Gagal memuat rincian item.");
    showAjukanDialog.value = false;
  } finally {
    isLoadingAjukanDetail.value = false;
  }
};

const ajukanTotal = computed(() =>
  ajukanItems.value.reduce((s, r) => s + Number(r.NominalAjuan || 0), 0),
);

const submitAjukan = async () => {
  isSubmittingAjukan.value = true;
  try {
    const items = ajukanItems.value.map((r) => ({
      sumber: r.Sumber,
      nomorHeader: r.NomorHeader,
      itemNourut: r.ItemNourut,
      nama: r.Nama,
      satuan: r.Satuan,
      qty: r.Qty,
      keterangan: r.Keterangan,
      nominal: r.NominalAjuan,
      nominalAsli: r.NominalSumber,
    }));
    const res = await pengajuanUangMukaService.create({
      tanggal: ajukanTanggal.value,
      keterangan: ajukanKeterangan.value,
      items,
    });
    toast.success(`Pengajuan Uang Muka ${res.data.nomor} berhasil dibuat.`);
    showAjukanDialog.value = false;
    fetchOutstanding();
  } catch (e: any) {
    toast.error(e.response?.data?.message || "Gagal membuat pengajuan.");
  } finally {
    isSubmittingAjukan.value = false;
  }
};
const outstandingHeaders = [
  { title: "Sumber", key: "Sumber", width: "150px" },
  { title: "Nomor", key: "Nomor", width: "150px" },
  { title: "Tanggal", key: "Tanggal", width: "100px", align: "center" },
  { title: "Keterangan", key: "Keterangan", minWidth: "180px" },
  { title: "Pemohon", key: "Pemohon", width: "150px" },
  { title: "Bagian", key: "Bagian", width: "120px" },
  { title: "Cabang", key: "Cabang", width: "90px" },
  { title: "Nominal", key: "Nominal", width: "120px", align: "right" },
];

const pumHeaders = [
  { title: "Nomor", key: "Nomor", width: "150px" },
  { title: "Tanggal", key: "Tanggal", width: "100px", align: "center" },
  { title: "Status", key: "Status", width: "110px", align: "center" },
  { title: "Keterangan", key: "Keterangan", minWidth: "180px" },
  { title: "Cabang", key: "Cabang", width: "90px" },
  {
    title: "Total Nominal",
    key: "TotalNominal",
    width: "130px",
    align: "right",
  },
  { title: "No. Bon", key: "BonNomor", width: "150px" },
  { title: "User", key: "UserCreate", width: "90px" },
];

const expandedOutstanding = ref<any[]>([]);
const outstandingDetailCache = ref<Record<string, any[]>>({});
const outstandingDetailLoading = ref<Record<string, boolean>>({});

const onUpdateExpandedOutstanding = async (newExpanded: any[]) => {
  expandedOutstanding.value = newExpanded;
  const newlyExpanded = newExpanded.filter(
    (item) =>
      !outstandingDetailCache.value[item.RowKey] &&
      !outstandingDetailLoading.value[item.RowKey],
  );
  for (const item of newlyExpanded) {
    const key = item.RowKey;
    outstandingDetailLoading.value[key] = true;
    try {
      const res = await uangMukaService.getOutstandingDetail(
        item.Sumber,
        item.Nomor,
      );
      outstandingDetailCache.value[key] = res.data;
    } catch {
      toast.error(`Gagal memuat detail ${item.Nomor}`);
    } finally {
      outstandingDetailLoading.value[key] = false;
    }
  }
};

// ── Expand detail PUM ──
const expandedPum = ref<any[]>([]);
const pumDetailCache = ref<Record<string, any[]>>({});
const pumDetailLoading = ref<Record<string, boolean>>({});

const onUpdateExpandedPum = async (newExpanded: any[]) => {
  expandedPum.value = newExpanded;
  const newlyExpanded = newExpanded.filter(
    (item) =>
      !pumDetailCache.value[item.Nomor] && !pumDetailLoading.value[item.Nomor],
  );
  for (const item of newlyExpanded) {
    const nomor = item.Nomor;
    pumDetailLoading.value[nomor] = true;
    try {
      const res = await pengajuanUangMukaService.getDetail(nomor);
      pumDetailCache.value[nomor] = res.data;
    } catch {
      toast.error(`Gagal memuat detail ${nomor}`);
    } finally {
      pumDetailLoading.value[nomor] = false;
    }
  }
};

const goRealisasi = (item: any) => {
  router.push(
    `/pembelian/uang-muka/realisasi/${encodeURIComponent(item.Nomor)}`,
  );
};
</script>

<template>
  <div class="um-tabs-wrap">
    <div class="um-tabs">
      <button
        v-if="canSeeOutstandingSumber"
        type="button"
        class="um-tab"
        :class="{ active: activeTab === 'outstanding' }"
        @click="activeTab = 'outstanding'"
      >
        Outstanding
      </button>
      <button
        type="button"
        class="um-tab"
        :class="{ active: activeTab === 'pum-outstanding' }"
        @click="activeTab = 'pum-outstanding'"
      >
        Pengajuan Uang Muka
      </button>
      <button
        type="button"
        class="um-tab"
        :class="{ active: activeTab === 'history' }"
        @click="activeTab = 'history'"
      >
        Realisasi Pengajuan UM
      </button>
    </div>

    <!-- TAB OUTSTANDING -->
    <BaseBrowse
      v-if="activeTab === 'outstanding'"
      title="Uang Muka — Outstanding"
      menu-id="315"
      :icon="IconCash"
      :headers="outstandingHeaders"
      :items="outstandingItems"
      :is-loading="isLoading"
      v-model:selected="selectedOutstanding"
      select-strategy="page"
      :can-insert="false"
      :can-edit="false"
      :can-delete="false"
      :can-export="false"
      item-value="RowKey"
      show-expand
      :expanded="expandedOutstanding"
      @update:expanded="onUpdateExpandedOutstanding"
      @refresh="fetchOutstanding"
      v-model:filterState="filters"
    >
      <template #filter-left>
        <div class="f-group">
          <span class="f-label">Periode</span>
          <input type="date" v-model="filters.dtAwal" class="f-inp" />
          <span class="f-sep">s/d</span>
          <input type="date" v-model="filters.dtAkhir" class="f-inp" />
        </div>
      </template>

      <template #extra-actions>
        <v-btn
          color="primary"
          size="small"
          :disabled="!canAjukan"
          @click="openAjukanDialog"
        >
          <template #prepend><IconSend :size="15" /></template>
          Ajukan ({{ selectedOutstanding.length }})
        </v-btn>
      </template>

      <template #item.Sumber="{ item }">
        <v-chip
          size="x-small"
          :color="item.Sumber === 'PENGAJUAN_DANA' ? 'blue' : 'orange'"
          variant="flat"
        >
          {{ sumberLabel(item.Sumber) }}
        </v-chip>
      </template>
      <template #item.Nomor="{ item }"
        ><span class="mono">{{ item.Nomor }}</span></template
      >
      <template #item.Tanggal="{ item }">{{ tglFmt(item.Tanggal) }}</template>
      <template #item.Nominal="{ item }">{{ numFmt(item.Nominal) }}</template>

      <template #detail="{ item }">
        <div class="detail-wrap">
          <v-progress-linear
            v-if="outstandingDetailLoading[item.RowKey]"
            indeterminate
            color="primary"
            height="2"
          />
          <div
            v-else-if="outstandingDetailCache[item.RowKey]"
            class="detail-panel"
          >
            <div class="panel-head">
              Rincian Item —
              <span class="text-warning ml-1">{{ item.Nomor }}</span>
            </div>
            <div class="dtl-scroll">
              <table v-if="item.Sumber === 'PENGAJUAN_DANA'" class="dtl-table">
                <thead>
                  <tr>
                    <th>Nama</th>
                    <th>Spesifikasi</th>
                    <th class="tc">Satuan</th>
                    <th class="tr">Qty Ajukan</th>
                    <th class="tr">Qty Verif</th>
                    <th class="tr">Qty Beli</th>
                    <th class="tr">Qty Realisasi</th>
                    <th class="tr">Rp Ajukan</th>
                    <th class="tr">Rp Approved</th>
                    <th>Deadline</th>
                    <th>Verified Oleh</th>
                    <th>Approved Oleh</th>
                    <th>Kegunaan</th>
                    <th>Keterangan</th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="(d, i) in outstandingDetailCache[item.RowKey]"
                    :key="i"
                  >
                    <td class="fw">{{ d.Nama }}</td>
                    <td>{{ d.Spesifikasi }}</td>
                    <td class="tc">{{ d.Satuan }}</td>
                    <td class="tr">{{ numFmt(d.QtyPengajuan) }}</td>
                    <td class="tr">{{ numFmt(d.QtyVerifikasi) }}</td>
                    <td class="tr">{{ numFmt(d.QtyBeli) }}</td>
                    <td class="tr">{{ numFmt(d.QtyRealisasi) }}</td>
                    <td class="tr">{{ numFmt(d.RpPengajuan) }}</td>
                    <td class="tr text-success fw">
                      {{ numFmt(d.RpApproved) }}
                    </td>
                    <td>{{ tglFmt(d.Deadline) }}</td>
                    <td>{{ d.NameVerified || "-" }}</td>
                    <td>{{ d.NameApproved || "-" }}</td>
                    <td style="white-space: normal">{{ d.Kegunaan }}</td>
                    <td style="white-space: normal">{{ d.Keterangan }}</td>
                  </tr>
                  <tr v-if="!outstandingDetailCache[item.RowKey]?.length">
                    <td colspan="14" class="tc" style="color: #999">
                      Tidak ada item tersisa.
                    </td>
                  </tr>
                </tbody>
              </table>

              <table v-else class="dtl-table">
                <thead>
                  <tr>
                    <th>Kode</th>
                    <th>Item</th>
                    <th class="tr">Qty</th>
                    <th>Satuan</th>
                    <th class="tr">Nominal</th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="(d, i) in outstandingDetailCache[item.RowKey]"
                    :key="i"
                  >
                    <td class="mono">{{ d.Kode }}</td>
                    <td class="fw">{{ d.Nama }}</td>
                    <td class="tr">{{ numFmt(d.Qty) }}</td>
                    <td>{{ d.Satuan }}</td>
                    <td class="tr">{{ numFmt(d.Nominal) }}</td>
                  </tr>
                  <tr v-if="!outstandingDetailCache[item.RowKey]?.length">
                    <td colspan="5" class="tc" style="color: #999">
                      Tidak ada item tersisa.
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </template>
    </BaseBrowse>

    <!-- TAB OUTSTANDING PUM -->
    <BaseBrowse
      v-else-if="activeTab === 'pum-outstanding'"
      title="Pengajuan Uang Muka — Outstanding"
      menu-id="315"
      :icon="IconCash"
      :headers="pumHeaders"
      :items="pumOutstandingItems"
      :is-loading="isLoading"
      v-model:selected="selectedPumOutstanding"
      select-strategy="single"
      :can-insert="false"
      :can-edit="false"
      :can-delete="false"
      :can-export="false"
      item-value="Nomor"
      show-expand
      :expanded="expandedPum"
      @update:expanded="onUpdateExpandedPum"
      @refresh="fetchPumOutstanding"
    >
      <template #filter-left>
        <div class="f-group">
          <span class="f-label">Periode</span>
          <input type="date" v-model="filters.dtAwal" class="f-inp" />
          <span class="f-sep">s/d</span>
          <input type="date" v-model="filters.dtAkhir" class="f-inp" />
        </div>
        <div class="f-group">
          <span class="f-label">Cab</span>
          <select v-model="filters.cabFilter" class="f-inp">
            <option v-for="c in CABANG_LIST" :key="c" :value="c">
              {{ c === "ALL" ? "SEMUA CABANG" : c }}
            </option>
          </select>
        </div>
      </template>

      <template #extra-actions>
        <v-btn
          v-if="canRealisasi"
          size="small"
          color="teal"
          :disabled="!selectedPumOutstanding[0]"
          @click="goRealisasi(selectedPumOutstanding[0])"
        >
          Realisasi
        </v-btn>
      </template>

      <template #item.Nomor="{ item }"
        ><span class="mono">{{ item.Nomor }}</span></template
      >
      <template #item.Tanggal="{ item }">{{ tglFmt(item.Tanggal) }}</template>
      <template #item.TotalNominal="{ item }">{{
        numFmt(item.TotalNominal)
      }}</template>
      <template #item.BonNomor="{ item }">-</template>
      <template #item.Status="{ item }">
        <v-chip
          size="x-small"
          :style="{
            backgroundColor: STATUS_LABEL[item.Status]?.bg,
            color: STATUS_LABEL[item.Status]?.color,
          }"
          class="font-weight-bold"
        >
          {{ STATUS_LABEL[item.Status]?.label || item.Status }}
        </v-chip>
      </template>

      <template #detail="{ item }">
        <div class="detail-wrap">
          <v-progress-linear
            v-if="pumDetailLoading[item.Nomor]"
            indeterminate
            color="primary"
            height="2"
          />
          <div v-else-if="pumDetailCache[item.Nomor]" class="detail-panel">
            <div class="panel-head">
              Rincian — <span class="text-warning ml-1">{{ item.Nomor }}</span>
            </div>
            <div class="dtl-scroll">
              <table class="dtl-table">
                <thead>
                  <tr>
                    <th>Sumber</th>
                    <th>Nomor</th>
                    <th>Item</th>
                    <th class="tr">Qty</th>
                    <th class="tr">Nominal Sumber</th>
                    <th class="tr">Nominal Ajuan</th>
                    <th class="tc">Status ACC</th>
                    <th class="tr">Nominal ACC</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(d, i) in pumDetailCache[item.Nomor]" :key="i">
                    <td>
                      <v-chip
                        size="x-small"
                        :color="
                          d.Sumber === 'PENGAJUAN_DANA' ? 'blue' : 'orange'
                        "
                        variant="flat"
                        >{{ sumberLabel(d.Sumber) }}</v-chip
                      >
                    </td>
                    <td class="mono">{{ d.NomorHeader }}</td>
                    <td>{{ d.Nama }}</td>
                    <td class="tr">{{ numFmt(d.Qty) }} {{ d.Satuan }}</td>
                    <td
                      class="tr"
                      :class="{
                        'text-warning fw':
                          Number(d.NominalSumber) !== Number(d.NominalAjuan),
                      }"
                    >
                      {{ numFmt(d.NominalSumber) }}
                    </td>
                    <td class="tr">{{ numFmt(d.NominalAjuan) }}</td>
                    <td class="tc">{{ d.StatusAcc || "-" }}</td>
                    <td class="tr fw">
                      {{ d.NominalAcc != null ? numFmt(d.NominalAcc) : "-" }}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </template>
    </BaseBrowse>

    <!-- TAB HISTORY -->
    <BaseBrowse
      v-else
      title="Pengajuan Uang Muka — History"
      menu-id="315"
      :icon="IconCash"
      :headers="pumHeaders"
      :items="pumHistoryItems"
      :is-loading="isLoading"
      v-model:selected="selectedPumHistory"
      select-strategy="single"
      :can-insert="false"
      :can-edit="false"
      :can-delete="false"
      :can-export="false"
      item-value="Nomor"
      show-expand
      :expanded="expandedPum"
      @update:expanded="onUpdateExpandedPum"
      @refresh="fetchPumHistory"
    >
      <template #filter-left>
        <div class="f-group">
          <span class="f-label">Periode</span>
          <input type="date" v-model="filters.dtAwal" class="f-inp" />
          <span class="f-sep">s/d</span>
          <input type="date" v-model="filters.dtAkhir" class="f-inp" />
        </div>
        <div class="f-group">
          <span class="f-label">Cab</span>
          <select v-model="filters.cabFilter" class="f-inp">
            <option v-for="c in CABANG_LIST" :key="c" :value="c">
              {{ c === "ALL" ? "SEMUA CABANG" : c }}
            </option>
          </select>
        </div>
      </template>

      <template #item.Nomor="{ item }"
        ><span class="mono">{{ item.Nomor }}</span></template
      >
      <template #item.Tanggal="{ item }">{{ tglFmt(item.Tanggal) }}</template>
      <template #item.TotalNominal="{ item }">{{
        numFmt(item.TotalNominal)
      }}</template>
      <template #item.BonNomor="{ item }"
        ><span class="mono">{{ item.BonNomor || "-" }}</span></template
      >
      <template #item.Status="{ item }">
        <v-chip
          size="x-small"
          :style="{
            backgroundColor: STATUS_LABEL[item.Status]?.bg,
            color: STATUS_LABEL[item.Status]?.color,
          }"
          class="font-weight-bold"
        >
          {{ STATUS_LABEL[item.Status]?.label || item.Status }}
        </v-chip>
      </template>

      <template #detail="{ item }">
        <div class="detail-wrap">
          <v-progress-linear
            v-if="pumDetailLoading[item.Nomor]"
            indeterminate
            color="primary"
            height="2"
          />
          <div v-else-if="pumDetailCache[item.Nomor]" class="detail-panel">
            <div class="panel-head">
              Rincian — <span class="text-warning ml-1">{{ item.Nomor }}</span>
            </div>
            <div class="dtl-scroll">
              <table class="dtl-table">
                <thead>
                  <tr>
                    <th>Sumber</th>
                    <th>Nomor</th>
                    <th>Keterangan</th>
                    <th class="tr">Nominal Sumber</th>
                    <th class="tr">Nominal Ajuan</th>
                    <th class="tc">Status ACC</th>
                    <th class="tr">Nominal ACC</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(d, i) in pumDetailCache[item.Nomor]" :key="i">
                    <td>
                      <v-chip
                        size="x-small"
                        :color="
                          d.Sumber === 'PENGAJUAN_DANA' ? 'blue' : 'orange'
                        "
                        variant="flat"
                      >
                        {{ sumberLabel(d.Sumber) }}
                      </v-chip>
                    </td>
                    <td class="mono">{{ d.NomorSumber }}</td>
                    <td>{{ d.Keterangan }}</td>
                    <td
                      class="tr"
                      :class="{
                        'text-warning fw':
                          Number(d.NominalSumber) !== Number(d.NominalAjuan),
                      }"
                    >
                      {{ numFmt(d.NominalSumber) }}
                    </td>
                    <td class="tr">{{ numFmt(d.NominalAjuan) }}</td>
                    <td class="tc">{{ d.StatusAcc || "-" }}</td>
                    <td class="tr fw">
                      {{ d.NominalAcc != null ? numFmt(d.NominalAcc) : "-" }}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </template>
    </BaseBrowse>
  </div>

  <!-- DIALOG AJUKAN -->
  <v-dialog v-model="showAjukanDialog" max-width="900px" persistent>
    <v-card class="rounded-lg">
      <v-card-title
        class="bg-primary text-white pa-3"
        style="font-size: 13px; font-weight: 700"
      >
        Ajukan Uang Muka
      </v-card-title>
      <v-card-text class="pa-4">
        <div class="d-flex gap-2 mb-3">
          <v-text-field
            v-model="ajukanTanggal"
            type="date"
            label="Tanggal"
            variant="outlined"
            density="compact"
            hide-details
            style="max-width: 220px"
          />
        </div>
        <v-textarea
          v-model="ajukanKeterangan"
          label="Keterangan"
          variant="outlined"
          density="compact"
          rows="2"
          hide-details="auto"
          class="mb-3"
        />

        <v-progress-linear
          v-if="isLoadingAjukanDetail"
          indeterminate
          color="primary"
          class="mb-2"
        />

        <div class="panel-head" style="border-radius: 4px">
          Rincian Pengajuan
        </div>
        <div class="dtl-scroll" style="max-height: 280px; overflow-y: auto">
          <table class="dtl-table ajukan-table">
            <thead>
              <tr>
                <th style="width: 40px">No</th>
                <th style="width: 130px">Nomor</th>
                <th>Item</th>
                <th style="width: 150px" class="tr">Nominal Sumber</th>
                <th style="width: 160px" class="tr">Nominal Ajuan</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="(r, i) in ajukanItems"
                :key="`${r.NomorHeader}-${r.ItemNourut}`"
              >
                <td class="tc">{{ i + 1 }}</td>
                <td class="mono">{{ r.NomorHeader }}</td>
                <td class="wrap-cell">{{ r.Nama }}</td>
                <td class="tr">{{ numFmt(r.NominalSumber) }}</td>
                <td class="tr">
                  <NumberInputIDR v-model="r.NominalAjuan" cursor-to-end />
                </td>
              </tr>
            </tbody>
            <tfoot>
              <tr>
                <td colspan="3" class="tr fw">Total</td>
                <td class="tr fw">
                  {{
                    numFmt(
                      ajukanItems.reduce(
                        (s, r) => s + Number(r.NominalSumber || 0),
                        0,
                      ),
                    )
                  }}
                </td>
                <td class="tr fw">{{ numFmt(ajukanTotal) }}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </v-card-text>
      <v-card-actions class="pa-3 border-t bg-grey-lighten-4">
        <v-spacer />
        <v-btn
          variant="text"
          @click="showAjukanDialog = false"
          :disabled="isSubmittingAjukan"
          >Batal</v-btn
        >
        <v-btn
          variant="elevated"
          color="primary"
          :loading="isSubmittingAjukan"
          @click="submitAjukan"
        >
          Ajukan
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.um-tabs-wrap {
  display: flex;
  flex-direction: column;
  height: 100%;
}
.um-tabs {
  display: flex;
  gap: 4px;
  padding: 8px 8px 0;
  flex-shrink: 0;
}
.um-tab {
  padding: 8px 16px;
  font-size: 12px;
  font-weight: 700;
  border: none;
  background: transparent;
  color: #757575;
  cursor: pointer;
  border-bottom: 2px solid transparent;
}
.um-tab.active {
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
.gap-2 {
  gap: 8px;
}

.detail-wrap {
  padding: 10px 14px 16px;
  background: #f5f7fb;
  border-top: 2px solid #dde3ea;
}
.detail-panel {
  background: white;
  border-radius: 6px;
  overflow: hidden;
  border: 1px solid #cfd8dc;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08);
}
.panel-head {
  display: flex;
  align-items: center;
  background: #37474f;
  color: white;
  padding: 8px 12px;
  font-size: 11.5px;
  font-weight: 700;
  letter-spacing: 0.02em;
}
.dtl-scroll {
  overflow-x: auto;
}
.dtl-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 11px;
}
.dtl-table thead th {
  background: #eceff1;
  color: #37474f;
  padding: 6px 10px;
  text-align: left;
  font-weight: 700;
  border-bottom: 2px solid #b0bec5;
  border-right: 1px solid #dde3ea;
  white-space: nowrap;
}
.dtl-table tbody td {
  padding: 5px 10px;
  border-bottom: 1px solid #f0f0f0;
  border-right: 1px solid #f0f0f0;
  vertical-align: middle;
  white-space: nowrap;
}
.dtl-table tfoot td {
  padding: 6px 10px;
  border-top: 2px solid #b0bec5;
}
.tc {
  text-align: center !important;
}
.tr {
  text-align: right !important;
}
.fw {
  font-weight: 700;
}
.ajukan-table td.wrap-cell {
  white-space: normal;
  word-break: break-word;
}
.nominal-inp {
  width: 100%;
  text-align: right;
  border: 1px solid #ccc;
  border-radius: 3px;
  padding: 3px 6px;
  font-size: 12px;
}
.nominal-inp:focus {
  border-color: #1565c0;
  outline: none;
}
</style>
