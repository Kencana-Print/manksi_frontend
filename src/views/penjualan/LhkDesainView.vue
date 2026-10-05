<script setup lang="ts">
import { ref, computed, onMounted, watch } from "vue";
import { useToast } from "vue-toastification";
import BaseBrowse from "@/components/BaseBrowse.vue";
import { lhkDesainService as svc } from "@/services/penjualan/lhkDesainService";
import { permintaanDesainService as pdSvc } from "@/services/penjualan/permintaanDesainService";
import { formatTanggal } from "@/utils/dateFormat";
import { IconChecklist, IconPlaylistAdd } from "@tabler/icons-vue";

const toast = useToast();

const activeTab = ref<"outstanding" | "history">("outstanding");

const today = new Date();
const pad = (n: number) => String(n).padStart(2, "0");
const toLocalDate = (d: Date) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const firstOfMonth = toLocalDate(
  new Date(today.getFullYear(), today.getMonth(), 1),
);
const todayStr = toLocalDate(today);

const filters = ref({
  tglAwal: firstOfMonth,
  tglAkhir: todayStr,
  jenisFilter: "",
});

const outstandingItems = ref<any[]>([]);
const historyItems = ref<any[]>([]);
const isLoading = ref(false);
const selectedOutstanding = ref<any[]>([]);

const baseBrowseRef = ref<InstanceType<typeof BaseBrowse> | null>(null);

const expandedRows = ref<any[]>([]);
const detailCache = ref<Record<string, any[]>>({});
const detailLoading = ref<Record<string, boolean>>({});

const onUpdateExpanded = async (newExpanded: any[]) => {
  expandedRows.value = newExpanded;
  const newlyExpanded = newExpanded.filter(
    (item) =>
      !detailCache.value[item.PdNomor] && !detailLoading.value[item.PdNomor],
  );
  for (const item of newlyExpanded) {
    const nomor = item.PdNomor;
    detailLoading.value[nomor] = true;
    try {
      const res = await pdSvc.getDetail(nomor);
      detailCache.value[nomor] = res.data.data?.detail ?? [];
    } catch {
      toast.error(`Gagal memuat detail ${nomor}`);
    } finally {
      detailLoading.value[nomor] = false;
    }
  }
};

const fetchOutstanding = async () => {
  isLoading.value = true;
  try {
    const res = await svc.getOutstanding({
      startDate: filters.value.tglAwal,
      endDate: filters.value.tglAkhir,
      jenisPekerjaan: filters.value.jenisFilter || undefined,
    });
    outstandingItems.value = res.data.data ?? [];
    selectedOutstanding.value = [];
  } catch {
    toast.error("Gagal memuat data Outstanding.");
  } finally {
    isLoading.value = false;
  }
};

const fetchHistory = async () => {
  isLoading.value = true;
  try {
    const res = await svc.getHistory({
      startDate: filters.value.tglAwal,
      endDate: filters.value.tglAkhir,
    });
    historyItems.value = res.data.data ?? [];
  } catch {
    toast.error("Gagal memuat riwayat LHK.");
  } finally {
    isLoading.value = false;
  }
};

const fetchActiveTab = () => {
  if (activeTab.value === "outstanding") fetchOutstanding();
  else fetchHistory();
};

watch(
  [() => filters.value.tglAwal, () => filters.value.tglAkhir],
  fetchActiveTab,
);
watch(activeTab, fetchActiveTab);
onMounted(fetchActiveTab);

const outstandingHeaders = [
  { title: "Nomor PD", key: "PdNomor", width: "150px" },
  { title: "Tanggal", key: "Tanggal", width: "100px" },
  { title: "Nama Project", key: "NamaProject", minWidth: "180px" },
  { title: "Customer", key: "Customer", minWidth: "160px" },
  { title: "Jenis", key: "JenisPekerjaan", width: "100px" },
  { title: "Jml", key: "Jml", width: "70px", align: "right" },
  { title: "Desainer", key: "Desainer", width: "130px" },
  { title: "Tgl Close", key: "TglClose", width: "140px" },
];

const historyHeaders = [
  { title: "Nomor LHK", key: "LhkNomor", width: "160px" },
  { title: "Nomor PD", key: "PdNomor", width: "150px" },
  { title: "Tanggal", key: "Tanggal", width: "100px" },
  { title: "Nama Project", key: "NamaProject", minWidth: "180px" },
  { title: "Customer", key: "Customer", minWidth: "160px" },
  { title: "Jml", key: "Jml", width: "70px", align: "right" },
  { title: "Desainer", key: "Desainer", width: "130px" },
  { title: "Tgl Selesai", key: "TglSelesai", width: "140px" },
  { title: "Dibuat Oleh", key: "UserCreate", width: "110px" },
];

// ── Dialog review "Buat LHK" ──
const showReviewDialog = ref(false);
const isSavingLhk = ref(false);

const openReviewDialog = () => {
  if (!selectedOutstanding.value.length) return;
  showReviewDialog.value = true;
};

const totalJmlSelected = computed(() =>
  selectedOutstanding.value.reduce((s, r) => s + (Number(r.Jml) || 0), 0),
);

const confirmCreateLhk = async () => {
  isSavingLhk.value = true;
  try {
    const pdNomorList = selectedOutstanding.value.map((r) => r.PdNomor);
    const res = await svc.createBatch(pdNomorList);
    const jumlahDibuat = res.data.data?.length ?? pdNomorList.length;
    toast.success(`${jumlahDibuat} LHK Desain berhasil dibuat.`);
    showReviewDialog.value = false;
    await fetchOutstanding();
  } catch (err: any) {
    toast.error(err.response?.data?.message || "Gagal membuat LHK Desain.");
  } finally {
    isSavingLhk.value = false;
  }
};
</script>

<template>
  <div class="lhk-tabs-wrap">
    <div class="lhk-tabs">
      <button
        type="button"
        class="lhk-tab"
        :class="{ active: activeTab === 'outstanding' }"
        @click="activeTab = 'outstanding'"
      >
        Outstanding
      </button>
      <button
        type="button"
        class="lhk-tab"
        :class="{ active: activeTab === 'history' }"
        @click="activeTab = 'history'"
      >
        History
      </button>
    </div>

    <BaseBrowse
      ref="baseBrowseRef"
      v-if="activeTab === 'outstanding'"
      title="LHK Desain — Outstanding"
      menu-id="185"
      :icon="IconChecklist"
      :headers="outstandingHeaders"
      :items="outstandingItems"
      :is-loading="isLoading"
      v-model:selected="selectedOutstanding"
      select-strategy="page"
      :can-insert="false"
      :can-edit="false"
      :can-delete="false"
      :can-export="false"
      item-value="PdNomor"
      @refresh="fetchOutstanding"
      show-expand
      :expanded="expandedRows"
      @update:expanded="onUpdateExpanded"
    >
      <template #filter-left>
        <label class="flbl">Tanggal</label>
        <input type="date" v-model="filters.tglAwal" class="finp" />
        <span class="fsep">s.d.</span>
        <input type="date" v-model="filters.tglAkhir" class="finp" />
        <select
          v-model="filters.jenisFilter"
          class="finp"
          @change="fetchOutstanding"
        >
          <option value="">Semua Jenis</option>
          <option value="BARU">Baru</option>
          <option value="REVISI">Revisi</option>
          <option value="CEK">Cek</option>
          <option value="PLOTTER">Plotter</option>
          <option value="EDIT">Edit</option>
        </select>
      </template>

      <template #extra-actions>
        <v-btn
          size="small"
          color="primary"
          :disabled="!selectedOutstanding.length"
          @click="openReviewDialog"
        >
          <template #prepend><IconPlaylistAdd :size="15" /></template>
          Buat LHK ({{ selectedOutstanding.length }})
        </v-btn>
      </template>

      <template #item.Tanggal="{ item }">{{
        formatTanggal(item.Tanggal)
      }}</template>
      <template #item.TglClose="{ item }">{{
        formatTanggal(item.TglClose)
      }}</template>

      <template #detail="{ item }">
        <div class="lhk-detail-wrap">
          <v-progress-linear
            v-if="detailLoading[item.PdNomor]"
            indeterminate
            color="primary"
            height="2"
          />
          <table v-else-if="detailCache[item.PdNomor]" class="lhk-detail-table">
            <thead>
              <tr>
                <th>Nama Desain</th>
                <th style="width: 100px">Jumlah</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(d, i) in detailCache[item.PdNomor]" :key="i">
                <td>{{ d.pd2_pd_desain }}</td>
                <td class="tr">{{ d.pd2_pd_jml }}</td>
              </tr>
              <tr v-if="!detailCache[item.PdNomor]?.length">
                <td colspan="2" class="tc" style="color: #999">
                  Tidak ada item.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </template>
    </BaseBrowse>

    <BaseBrowse
      v-else
      title="LHK Desain — History"
      menu-id="185"
      :icon="IconChecklist"
      :headers="historyHeaders"
      :items="historyItems"
      :is-loading="isLoading"
      select-strategy="single"
      :can-insert="false"
      :can-edit="false"
      :can-delete="false"
      :can-export="false"
      item-value="LhkNomor"
      @refresh="fetchHistory"
    >
      <template #filter-left>
        <label class="flbl">Tanggal</label>
        <input type="date" v-model="filters.tglAwal" class="finp" />
        <span class="fsep">s.d.</span>
        <input type="date" v-model="filters.tglAkhir" class="finp" />
      </template>

      <template #item.Tanggal="{ item }">{{
        formatTanggal(item.Tanggal)
      }}</template>
      <template #item.TglSelesai="{ item }">{{
        formatTanggal(item.TglSelesai)
      }}</template>
    </BaseBrowse>
  </div>

  <v-dialog v-model="showReviewDialog" max-width="700px" persistent>
    <v-card class="rounded-lg">
      <v-card-title
        class="pa-3 bg-primary text-white"
        style="font-size: 13px; font-weight: 700"
      >
        Review — Buat LHK Desain ({{ selectedOutstanding.length }} PD)
      </v-card-title>
      <v-card-text class="pa-4">
        <table class="review-table">
          <thead>
            <tr>
              <th>Nomor PD</th>
              <th>Nama Project</th>
              <th style="width: 70px" class="tr">Jml</th>
              <th>Desainer</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="r in selectedOutstanding" :key="r.PdNomor">
              <td class="mono">{{ r.PdNomor }}</td>
              <td>{{ r.NamaProject }}</td>
              <td class="tr">{{ r.Jml }}</td>
              <td>{{ r.Desainer || "-" }}</td>
            </tr>
          </tbody>
          <tfoot>
            <tr>
              <td colspan="2" class="tr fw">Total</td>
              <td class="tr fw">{{ totalJmlSelected }}</td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      </v-card-text>
      <v-card-actions class="pa-3 border-t">
        <v-btn
          variant="text"
          size="small"
          @click="showReviewDialog = false"
          :disabled="isSavingLhk"
        >
          Batal
        </v-btn>
        <v-spacer />
        <v-btn
          variant="flat"
          size="small"
          color="primary"
          :loading="isSavingLhk"
          @click="confirmCreateLhk"
        >
          Simpan &amp; Buat LHK
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.lhk-tabs-wrap {
  display: flex;
  flex-direction: column;
  height: 100%;
}
.lhk-tabs {
  display: flex;
  gap: 4px;
  padding: 8px 8px 0;
  flex-shrink: 0;
}
.lhk-tab {
  padding: 8px 16px;
  font-size: 12px;
  font-weight: 700;
  border: none;
  background: transparent;
  color: #757575;
  cursor: pointer;
  border-bottom: 2px solid transparent;
}
.lhk-tab.active {
  color: #1565c0;
  border-bottom-color: #1565c0;
}
.flbl {
  font-size: 11px;
  font-weight: 600;
  color: #444;
  white-space: nowrap;
}
.finp {
  height: 28px;
  border: 1px solid #bdbdbd;
  border-radius: 4px;
  padding: 0 6px;
  font-size: 12px;
  outline: none;
}
.finp:focus {
  border-color: #1565c0;
}
.fsep {
  font-size: 11px;
  color: #777;
}
.review-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
}
.review-table thead th {
  background: #eceff1;
  padding: 6px 10px;
  text-align: left;
  border-bottom: 2px solid #b0bec5;
}
.review-table tbody td {
  padding: 5px 10px;
  border-bottom: 1px solid #f0f0f0;
}
.review-table tfoot td {
  padding: 6px 10px;
  border-top: 2px solid #b0bec5;
}
.mono {
  font-family: monospace;
  font-weight: 600;
}
.tr {
  text-align: right;
}
.fw {
  font-weight: 700;
}
.lhk-detail-wrap {
  padding: 8px 16px 12px;
  background: #f5f7fb;
}
.lhk-detail-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 11px;
  background: white;
  border-radius: 4px;
  overflow: hidden;
}
.lhk-detail-table thead th {
  background: #37474f;
  color: white;
  padding: 6px 10px;
  text-align: left;
}
.lhk-detail-table tbody td {
  padding: 5px 10px;
  border-bottom: 1px solid #eee;
}
.tc {
  text-align: center;
}
.tr {
  text-align: right;
}
</style>
