<script setup lang="ts">
import { ref, computed, watch } from "vue";
import { useToast } from "vue-toastification";
import BaseBrowse from "@/components/BaseBrowse.vue";
import { useBrowse } from "@/composables/useBrowse";
import { targetSpkService } from "@/services/laporan/marketing/targetSpkService";
import CustomerSearchModal from "@/components/lookups/CustomerSearchModal.vue";
import SalesSearchModal from "@/components/lookups/SalesSearchModal.vue";
import {
  IconTarget,
  IconSettings,
  IconSearch,
  IconRefresh,
} from "@tabler/icons-vue";

const MENU_ID = "312";
const toast = useToast();

const DIVISI_OPTIONS = [
  { value: "SPANDUK", title: "SPANDUK" },
  { value: "KAOSAN", title: "KAOSAN" },
  { value: "GARMEN_MEDIUM", title: "GARMEN MEDIUM" },
  { value: "GARMEN_PREMIUM", title: "GARMEN PREMIUM" },
  { value: "MMT", title: "MMT" },
  { value: "FIT_U", title: "FIT U" },
  { value: "ALL", title: "ALL DIVISI" },
];

const toLocalDateStr = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};
const today = new Date();
const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

const filterState = ref({
  dtAwal: toLocalDateStr(firstDayOfMonth),
  dtAkhir: toLocalDateStr(today),
  divisi: "SPANDUK",
  salesKode: "",
  salesNama: "",
  cusKode: "",
  cusNama: "",
});

const isAllMode = computed(() => filterState.value.divisi === "ALL");
const meta = ref<{ tahun: number; n3: number; n2: number; n1: number } | null>(
  null,
);

const { items, isLoading, canExport, canEdit, fetchData } = useBrowse({
  menuId: MENU_ID,
  fetchApi: async () => {
    const res = await targetSpkService.getBrowse({
      startDate: filterState.value.dtAwal,
      endDate: filterState.value.dtAkhir,
      divisi: filterState.value.divisi,
      salesKode: filterState.value.salesKode,
      cusKode: filterState.value.cusKode,
    });
    meta.value = res.data.meta || null;
    return res.data.data || [];
  },
});

watch(
  () => [
    filterState.value.dtAwal,
    filterState.value.dtAkhir,
    filterState.value.divisi,
    filterState.value.salesKode,
    filterState.value.cusKode,
  ],
  fetchData,
);

const numFmt = (v: any) =>
  v || v === 0 ? Number(v).toLocaleString("id-ID") : "0";
const pctFmt = (v: any) =>
  v || v === 0 ? `${(Number(v) * 100).toFixed(1)}%` : "0%";

const ALL_PREFIXES = [
  { key: "sp", label: "SP" },
  { key: "gm", label: "GM" },
  { key: "gp", label: "GP" },
  { key: "mmt", label: "MMT" },
];

// ── Headers — flat, disesuaikan mode single-divisi vs ALL DIVISI ──
const headersSingle = computed(() => [
  { title: "Kode", key: "Kode", width: "90px" },
  { title: "Customer", key: "Customer", minWidth: "200px" },
  { title: "Alamat", key: "Alamat", minWidth: "180px" },
  { title: "Sales Terakhir", key: "Sales", minWidth: "140px" },
  {
    title: `SPK ${meta.value?.n3 ?? ""}`,
    key: "Spk3",
    width: "100px",
    align: "end",
  },
  {
    title: `SPK ${meta.value?.n2 ?? ""}`,
    key: "Spk2",
    width: "100px",
    align: "end",
  },
  {
    title: `SPK ${meta.value?.n1 ?? ""}`,
    key: "Spk1",
    width: "100px",
    align: "end",
  },
  { title: "Average", key: "Average", width: "110px", align: "end" },
  { title: "Target", key: "Target", width: "110px", align: "end" },
  {
    title: `Actual ${meta.value?.tahun ?? ""}`,
    key: "Actual",
    width: "110px",
    align: "end",
  },
  { title: "% Average", key: "PctAverage", width: "90px", align: "end" },
  { title: "% Target", key: "PctTarget", width: "90px", align: "end" },
  { title: "Kode Sales", key: "KodeSales", width: "90px" },
  { title: "Nama Sales", key: "NamaSales", minWidth: "140px" },
]);

const headersAll = computed(() => {
  const base = [
    { title: "Kode", key: "kode", width: "90px" },
    { title: "Customer", key: "customer", minWidth: "200px" },
    { title: "Alamat", key: "alamat", minWidth: "160px" },
  ];
  const perDivisi = ALL_PREFIXES.flatMap((p) => [
    {
      title: `${p.label} SPK${meta.value?.n3 ?? ""}`,
      key: `${p.key}_spk3`,
      width: "95px",
      align: "end",
    },
    {
      title: `${p.label} SPK${meta.value?.n2 ?? ""}`,
      key: `${p.key}_spk2`,
      width: "95px",
      align: "end",
    },
    {
      title: `${p.label} SPK${meta.value?.n1 ?? ""}`,
      key: `${p.key}_spk1`,
      width: "95px",
      align: "end",
    },
    {
      title: `${p.label} Avg`,
      key: `${p.key}_average`,
      width: "95px",
      align: "end",
    },
    {
      title: `${p.label} Target`,
      key: `${p.key}_target`,
      width: "95px",
      align: "end",
    },
    {
      title: `${p.label} Actual`,
      key: `${p.key}_actual`,
      width: "95px",
      align: "end",
    },
    {
      title: `${p.label} %Tgt`,
      key: `${p.key}_pct_target`,
      width: "80px",
      align: "end",
    },
  ]);
  return [
    ...base,
    ...perDivisi,
    { title: "Kode Sales", key: "kodeSales", width: "90px" },
    { title: "Nama Sales", key: "namaSales", minWidth: "140px" },
  ];
});

const headers = computed(() =>
  isAllMode.value ? headersAll.value : headersSingle.value,
);
const itemValue = computed(() => (isAllMode.value ? "kode" : "Kode"));

// ── Lookup Customer & Sales ──
const showCustModal = ref(false);
const showSalesModal = ref(false);

const onCustSelected = (item: any) => {
  filterState.value.cusKode = item.Kode;
  filterState.value.cusNama = item.Nama;
};
const clearCust = () => {
  filterState.value.cusKode = "";
  filterState.value.cusNama = "";
};
const onSalesSelected = (item: any) => {
  filterState.value.salesKode = item.sal_kode;
  filterState.value.salesNama = item.sal_nama;
};
const clearSales = () => {
  filterState.value.salesKode = "";
  filterState.value.salesNama = "";
};

// ── Setting Modal (inline-edit, custom — bukan BaseBrowse) ──
const showSetting = ref(false);
const settingDivisi = ref("SPANDUK");
const settingTahun = ref(today.getFullYear());
const settingRows = ref<any[]>([]);
const settingMeta = ref<any>(null);
const isLoadingSetting = ref(false);
const savingRow = ref<Record<string, boolean>>({});

const fetchSetting = async () => {
  isLoadingSetting.value = true;
  try {
    const res = await targetSpkService.getSettingList({
      tahun: settingTahun.value,
      divisi: settingDivisi.value,
    });
    settingRows.value = (res.data.data || []).map((r: any) => ({
      ...r,
      _targetEdit: r.Target,
      _kodeSalesEdit: r.KodeSales,
    }));
    settingMeta.value = res.data.meta || null;
  } catch (e: any) {
    toast.error(e.response?.data?.message || "Gagal memuat data setting.");
    settingRows.value = [];
  } finally {
    isLoadingSetting.value = false;
  }
};

const openSetting = () => {
  if (!canEdit.value) {
    toast.error("Akses ditolak untuk mengubah Setting Target.");
    return;
  }
  settingDivisi.value =
    filterState.value.divisi === "ALL" ? "SPANDUK" : filterState.value.divisi;
  settingTahun.value = meta.value?.tahun || today.getFullYear();
  showSetting.value = true;
  fetchSetting();
};

watch([settingDivisi, settingTahun], () => {
  if (showSetting.value) fetchSetting();
});

const saveTarget = async (row: any) => {
  savingRow.value[row.Kode] = true;
  try {
    await targetSpkService.updateTarget(
      row.Kode,
      settingTahun.value,
      settingDivisi.value,
      Number(row._targetEdit) || 0,
    );
    row.Target = row._targetEdit;
    toast.success(`Target ${row.Kode} tersimpan.`);
  } catch (e: any) {
    toast.error(e.response?.data?.message || "Gagal simpan target.");
    row._targetEdit = row.Target;
  } finally {
    savingRow.value[row.Kode] = false;
  }
};

const saveKodeSales = async (row: any) => {
  const kodeBaru = (row._kodeSalesEdit || "").trim().toUpperCase();
  if (!kodeBaru) return;
  savingRow.value[row.Kode] = true;
  try {
    const res = await targetSpkService.updateKodeSales(row.Kode, kodeBaru);
    row.KodeSales = res.data.data.kodeSales;
    row.NamaSales = res.data.data.namaSales;
    row._kodeSalesEdit = row.KodeSales;
    toast.success(`Sales ${row.Kode} tersimpan.`);
  } catch (e: any) {
    toast.error(e.response?.data?.message || "Sales tsb tidak ada / pasif.");
    row._kodeSalesEdit = row.KodeSales;
  } finally {
    savingRow.value[row.Kode] = false;
  }
};
</script>

<template>
  <BaseBrowse
    title="Laporan Target SPK"
    :menu-id="MENU_ID"
    :icon="IconTarget"
    :headers="headers"
    :items="items ?? []"
    :is-loading="isLoading"
    :item-value="itemValue"
    :can-export="canExport"
    search-placeholder="Cari kode / nama customer..."
    @refresh="fetchData"
  >
    <template #filter-left>
      <div class="f-group">
        <span class="f-label">Periode</span>
        <input type="date" v-model="filterState.dtAwal" class="f-date" />
        <span class="f-sep">s.d</span>
        <input type="date" v-model="filterState.dtAkhir" class="f-date" />
      </div>
      <div class="f-divider" />
      <div class="f-group">
        <span class="f-label">Divisi</span>
        <select v-model="filterState.divisi" class="f-select">
          <option v-for="d in DIVISI_OPTIONS" :key="d.value" :value="d.value">
            {{ d.title }}
          </option>
        </select>
      </div>
      <div class="f-divider" />
      <div class="f-group">
        <div class="f-lookup" @click="showSalesModal = true">
          {{ filterState.salesNama || "SEMUA SALES" }}
          <IconSearch :size="14" class="ml-auto" />
        </div>
        <button
          v-if="filterState.salesKode"
          class="f-clear"
          @click="clearSales"
        >
          ✕
        </button>
      </div>
      <div class="f-divider" />
      <div class="f-group">
        <div class="f-lookup" @click="showCustModal = true">
          {{ filterState.cusNama || "SEMUA CUSTOMER" }}
          <IconSearch :size="14" class="ml-auto" />
        </div>
        <button v-if="filterState.cusKode" class="f-clear" @click="clearCust">
          ✕
        </button>
      </div>
    </template>

    <template #extra-actions>
      <v-btn size="small" color="blue-grey" @click="openSetting">
        <template #prepend><IconSettings :size="15" /></template>Setting
      </v-btn>
    </template>

    <!-- Format angka & persen — mode single-divisi -->
    <template v-if="!isAllMode" #item.Spk3="{ item }">{{
      numFmt(item.Spk3)
    }}</template>
    <template v-if="!isAllMode" #item.Spk2="{ item }">{{
      numFmt(item.Spk2)
    }}</template>
    <template v-if="!isAllMode" #item.Spk1="{ item }">{{
      numFmt(item.Spk1)
    }}</template>
    <template v-if="!isAllMode" #item.Average="{ item }">{{
      numFmt(item.Average)
    }}</template>
    <template v-if="!isAllMode" #item.Target="{ item }">{{
      numFmt(item.Target)
    }}</template>
    <template v-if="!isAllMode" #item.Actual="{ item }">{{
      numFmt(item.Actual)
    }}</template>
    <template v-if="!isAllMode" #item.PctAverage="{ item }">{{
      pctFmt(item.PctAverage)
    }}</template>
    <template v-if="!isAllMode" #item.PctTarget="{ item }">{{
      pctFmt(item.PctTarget)
    }}</template>

    <!-- Format angka & persen — mode ALL DIVISI -->
    <template
      v-if="isAllMode"
      v-for="p in ALL_PREFIXES"
      :key="p.key + '-spk3'"
      #[`item.${p.key}_spk3`]="{ item }"
      >{{ numFmt(item[`${p.key}_spk3`]) }}</template
    >
    <template
      v-if="isAllMode"
      v-for="p in ALL_PREFIXES"
      :key="p.key + '-spk2'"
      #[`item.${p.key}_spk2`]="{ item }"
      >{{ numFmt(item[`${p.key}_spk2`]) }}</template
    >
    <template
      v-if="isAllMode"
      v-for="p in ALL_PREFIXES"
      :key="p.key + '-spk1'"
      #[`item.${p.key}_spk1`]="{ item }"
      >{{ numFmt(item[`${p.key}_spk1`]) }}</template
    >
    <template
      v-if="isAllMode"
      v-for="p in ALL_PREFIXES"
      :key="p.key + '-avg'"
      #[`item.${p.key}_average`]="{ item }"
      >{{ numFmt(item[`${p.key}_average`]) }}</template
    >
    <template
      v-if="isAllMode"
      v-for="p in ALL_PREFIXES"
      :key="p.key + '-tgt'"
      #[`item.${p.key}_target`]="{ item }"
      >{{ numFmt(item[`${p.key}_target`]) }}</template
    >
    <template
      v-if="isAllMode"
      v-for="p in ALL_PREFIXES"
      :key="p.key + '-act'"
      #[`item.${p.key}_actual`]="{ item }"
      >{{ numFmt(item[`${p.key}_actual`]) }}</template
    >
    <template
      v-if="isAllMode"
      v-for="p in ALL_PREFIXES"
      :key="p.key + '-pcttgt'"
      #[`item.${p.key}_pct_target`]="{ item }"
      >{{ pctFmt(item[`${p.key}_pct_target`]) }}</template
    >
  </BaseBrowse>

  <CustomerSearchModal v-model="showCustModal" @selected="onCustSelected" />
  <SalesSearchModal v-model="showSalesModal" @selected="onSalesSelected" />

  <!-- ── Modal Setting (inline-edit) ── -->
  <v-dialog v-model="showSetting" max-width="1100px">
    <div class="setting-card">
      <div class="setting-header">
        <IconSettings :size="15" />
        Setting Target SPK
        <v-spacer />
        <button class="setting-close" @click="showSetting = false">✕</button>
      </div>

      <div class="setting-filter">
        <span class="f-label">Tahun</span>
        <input
          v-model.number="settingTahun"
          type="number"
          class="f-date"
          style="width: 90px"
        />
        <span class="f-label">Divisi</span>
        <select v-model="settingDivisi" class="f-select">
          <option
            v-for="d in DIVISI_OPTIONS.filter((x) => x.value !== 'ALL')"
            :key="d.value"
            :value="d.value"
          >
            {{ d.title }}
          </option>
        </select>
        <v-btn
          size="small"
          color="primary"
          :loading="isLoadingSetting"
          @click="fetchSetting"
        >
          <template #prepend><IconRefresh :size="14" /></template>Muat Ulang
        </v-btn>
      </div>

      <div class="setting-table-wrap">
        <table class="setting-table">
          <thead>
            <tr>
              <th style="min-width: 90px">Kode</th>
              <th style="min-width: 200px">Customer</th>
              <th style="width: 90px" class="tr">SPK{{ settingMeta?.n3 }}</th>
              <th style="width: 90px" class="tr">SPK{{ settingMeta?.n2 }}</th>
              <th style="width: 90px" class="tr">SPK{{ settingMeta?.n1 }}</th>
              <th style="width: 100px" class="tr">Average</th>
              <th style="width: 130px">Target</th>
              <th style="width: 130px">Kode Sales</th>
              <th style="min-width: 140px">Nama Sales</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="isLoadingSetting">
              <td colspan="9" class="tc py-4 text-grey">Memuat data...</td>
            </tr>
            <tr v-else-if="!settingRows.length">
              <td colspan="9" class="tc py-4 text-grey">Tidak ada data.</td>
            </tr>
            <tr v-for="r in settingRows" :key="r.Kode">
              <td>{{ r.Kode }}</td>
              <td>{{ r.Customer }}</td>
              <td class="tr">{{ numFmt(r.Spk3) }}</td>
              <td class="tr">{{ numFmt(r.Spk2) }}</td>
              <td class="tr">{{ numFmt(r.Spk1) }}</td>
              <td class="tr">{{ numFmt(r.Average) }}</td>
              <td>
                <input
                  v-model.number="r._targetEdit"
                  type="number"
                  class="edit-inp"
                  :disabled="savingRow[r.Kode]"
                  @keydown.enter="saveTarget(r)"
                  @blur="r._targetEdit !== r.Target && saveTarget(r)"
                />
              </td>
              <td>
                <input
                  v-model="r._kodeSalesEdit"
                  class="edit-inp"
                  style="text-transform: uppercase"
                  :disabled="savingRow[r.Kode]"
                  @keydown.enter="saveKodeSales(r)"
                  @blur="r._kodeSalesEdit !== r.KodeSales && saveKodeSales(r)"
                />
              </td>
              <td>{{ r.NamaSales }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </v-dialog>
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
  background: white;
  outline: none;
  color: #212121;
}
.f-sep {
  font-size: 11px;
  color: #777;
}
.f-divider {
  width: 1px;
  height: 20px;
  background: #ddd;
  margin: 0 8px;
}
.f-lookup {
  height: 28px;
  border: 1px solid #ccc;
  border-radius: 4px;
  padding: 0 8px;
  font-size: 11px;
  display: flex;
  align-items: center;
  min-width: 140px;
  cursor: pointer;
  background: #f9f9f9;
}
.f-clear {
  background: none;
  border: none;
  color: #f44336;
  cursor: pointer;
  font-size: 14px;
  padding: 0 4px;
}

.setting-card {
  background: white;
  border-radius: 8px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  max-height: 85vh;
}
.setting-header {
  display: flex;
  align-items: center;
  gap: 6px;
  background: #1565c0;
  color: white;
  padding: 10px 14px;
  font-size: 13px;
  font-weight: 700;
}
.setting-close {
  background: transparent;
  border: none;
  color: rgba(255, 255, 255, 0.85);
  font-size: 15px;
  cursor: pointer;
}
.setting-filter {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-bottom: 1px solid #e0e0e0;
  background: #fafafa;
}
.setting-table-wrap {
  flex: 1;
  overflow: auto;
}
.setting-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 11px;
}
.setting-table th {
  background: #87ceeb;
  padding: 5px 8px;
  border: 1px solid #6ba8c4;
  position: sticky;
  top: 0;
}
.setting-table td {
  padding: 4px 8px;
  border: 1px solid #e0e0e0;
}
.tc {
  text-align: center;
}
.tr {
  text-align: right;
}
.edit-inp {
  width: 100%;
  height: 24px;
  border: 1px solid #bdbdbd;
  border-radius: 3px;
  padding: 0 5px;
  font-size: 11px;
  outline: none;
}
.edit-inp:focus {
  border-color: #1565c0;
  background: #fffde7;
}
</style>
