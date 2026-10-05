<script setup lang="ts">
import { ref, computed } from "vue";
import BaseBrowse from "@/components/BaseBrowse.vue";
import { useBrowse } from "@/composables/useBrowse";
import { spkTerkirimBelumInvoiceService } from "@/services/laporan/piutang/spkTerkirimBelumInvoiceService";
import { IconTruckDelivery, IconSearch } from "@tabler/icons-vue";
import PerusahaanSearchModal from "@/components/lookups/PerusahaanSearchModal.vue";

const menuId = "968"; // Akses ikut parent Laporan Piutang

const getLocalDate = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const getAwalBulan = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
};

const filterState = ref({
  startDate: getAwalBulan(),
  endDate: getLocalDate(),
  perusahaan: "",
});

// State hasil restore bisa tidak punya startDate/endDate (versi lama), isi ulang
const onFilterStateRestored = () => {
  if (!filterState.value.startDate)
    filterState.value.startDate = getAwalBulan();
  if (!filterState.value.endDate) filterState.value.endDate = getLocalDate();
};

// ── Modal Perusahaan ──
const showPerusahaanModal = ref(false);
const selectedPerusahaanNama = ref("");

const openPerusahaanModal = () => {
  showPerusahaanModal.value = true;
};
const onPerusahaanSelected = (item: any) => {
  filterState.value.perusahaan = item.perush_kode;
  selectedPerusahaanNama.value = item.perush_nama;
  fetchData();
};
const clearPerusahaan = () => {
  filterState.value.perusahaan = "";
  selectedPerusahaanNama.value = "";
  fetchData();
};

// ── Tabel ──
const headers = [
  { title: "Nomor", key: "Nomor", width: "160px" },
  { title: "Jenis", key: "Jenis", width: "70px", align: "center" },
  { title: "Nama", key: "Nama", minWidth: "220px" },
  { title: "Customer", key: "Customer", minWidth: "220px" },
  { title: "Perush.", key: "Perusahaan", width: "80px", align: "center" },
  { title: "Tgl Order", key: "TglOrder", width: "100px", align: "center" },
  { title: "Qty Kirim", key: "QtyKirim", width: "100px", align: "right" },
  { title: "Qty Invoice", key: "QtyInvoice", width: "100px", align: "right" },
  {
    title: "Belum Ditagih",
    key: "QtyBelumDitagih",
    width: "120px",
    align: "right",
  },
  {
    title: "Kirim Terakhir",
    key: "TglKirimTerakhir",
    width: "110px",
    align: "center",
  },
  { title: "Umur (hr)", key: "UmurHari", width: "90px", align: "right" },
  { title: "Status", key: "Status", width: "100px", align: "center" },
];

const { items, isLoading, canExport, fetchData, exportToExcel } = useBrowse({
  menuId,
  fetchApi: async () => {
    const res = await spkTerkirimBelumInvoiceService.getBrowse({
      startDate: filterState.value.startDate || getAwalBulan(),
      endDate: filterState.value.endDate || getLocalDate(),
      perusahaan: filterState.value.perusahaan || undefined,
    });
    return res.data.data || [];
  },
  immediate: true,
});

const getRowProps = () => ({});

const fmtNum = (val: number) =>
  new Intl.NumberFormat("id-ID", { maximumFractionDigits: 2 }).format(
    Number(val) || 0,
  );

// 'YYYY-MM-DD' → 'DD/MM/YYYY' tanpa lewat Date (hindari geser zona waktu)
const fmtDate = (val: string) => {
  if (!val) return "";
  const [y, m, d] = val.split("-");
  return `${d}/${m}/${y}`;
};

const umurClass = (hari: number) =>
  hari > 30 ? "umur-merah" : hari > 14 ? "umur-oranye" : "";

// ── Summary footer ──
const numericKeys = ["QtyKirim", "QtyInvoice", "QtyBelumDitagih"];
const summaryFormatters: Record<string, (rows: any[]) => string> = {};
for (const key of numericKeys) {
  summaryFormatters[key] = (rows: any[]) =>
    fmtNum(rows.reduce((s, r) => s + (Number(r[key]) || 0), 0));
}

// ── Export: ikut search + filter kolom di BaseBrowse ──
const browseRef = ref<InstanceType<typeof BaseBrowse> | null>(null);

const buildExportData = () => {
  const rows: any[] =
    browseRef.value?.getFilteredItems?.() ?? items.value ?? [];
  const exportRows = rows.map((r) => ({
    ...r,
    TglOrder: fmtDate(r.TglOrder),
    TglKirimTerakhir: fmtDate(r.TglKirimTerakhir),
  }));
  const total: Record<string, any> = { Nomor: "TOTAL" };
  for (const key of numericKeys) {
    total[key] = rows.reduce((s, r) => s + (Number(r[key]) || 0), 0);
  }
  return [...exportRows, total];
};

const jumlahBaris = computed(() => (items.value ?? []).length);
</script>

<template>
  <BaseBrowse
    ref="browseRef"
    title="SPK Terkirim Belum Invoice"
    :menu-id="menuId"
    :icon="IconTruckDelivery"
    :headers="headers"
    :items="items ?? []"
    item-value="Nomor"
    :is-loading="isLoading"
    v-model:filterState="filterState"
    @update:filter-state="onFilterStateRestored"
    :can-export="canExport"
    :row-props-fn="getRowProps"
    :summary-columns="numericKeys"
    :summary-formatters="summaryFormatters"
    @refresh="fetchData"
    @export="
      exportToExcel('Laporan_SPK_Terkirim_Belum_Invoice', {
        getData: buildExportData,
      })
    "
  >
    <template #filter-left>
      <div class="d-flex align-center gap-2">
        <span class="f-label">Periode Kirim</span>
        <input
          type="date"
          v-model="filterState.startDate"
          class="f-date"
          @change="fetchData"
        />
        <span class="f-label">s.d.</span>
        <input
          type="date"
          v-model="filterState.endDate"
          class="f-date"
          @change="fetchData"
        />

        <div class="f-divider" />

        <span class="f-label">Perusahaan</span>
        <v-text-field
          :model-value="
            filterState.perusahaan
              ? `[${filterState.perusahaan}] ${selectedPerusahaanNama}`
              : ''
          "
          placeholder="F1 atau klik icon..."
          variant="outlined"
          density="compact"
          hide-details
          readonly
          clearable
          class="f-search-perusahaan"
          @keydown.f1.prevent="openPerusahaanModal"
          @click:clear="clearPerusahaan"
        >
          <template #append-inner>
            <IconSearch
              :size="16"
              color="#1565c0"
              style="cursor: pointer; align-self: center"
              @click="openPerusahaanModal"
            />
          </template>
        </v-text-field>
      </div>
    </template>

    <template #item.Jenis="{ item }">
      <v-chip
        size="x-small"
        :color="item.Jenis === 'SO' ? 'deep-purple' : 'blue-grey'"
        variant="flat"
        class="font-weight-bold"
      >
        {{ item.Jenis }}
      </v-chip>
    </template>

    <template #item.Customer="{ item }">
      <span v-if="item.Customer">{{ item.Customer }}</span>
      <span v-else class="text-medium-emphasis">{{ item.CusKode || "—" }}</span>
    </template>

    <template #item.TglOrder="{ item }">{{ fmtDate(item.TglOrder) }}</template>
    <template #item.TglKirimTerakhir="{ item }">{{
      fmtDate(item.TglKirimTerakhir)
    }}</template>

    <template #item.QtyKirim="{ item }">{{ fmtNum(item.QtyKirim) }}</template>
    <template #item.QtyInvoice="{ item }">{{
      fmtNum(item.QtyInvoice)
    }}</template>
    <template #item.QtyBelumDitagih="{ item }">
      <span class="font-weight-bold text-primary">{{
        fmtNum(item.QtyBelumDitagih)
      }}</span>
    </template>

    <template #item.UmurHari="{ item }">
      <span :class="umurClass(item.UmurHari)">{{ item.UmurHari }}</span>
    </template>

    <template #item.Status="{ item }">
      <v-chip
        size="x-small"
        :color="item.Status === 'BELUM' ? 'error' : 'warning'"
        variant="flat"
        class="font-weight-bold"
      >
        {{ item.Status }}
      </v-chip>
    </template>
  </BaseBrowse>

  <PerusahaanSearchModal
    v-model="showPerusahaanModal"
    @selected="onPerusahaanSelected"
  />
</template>

<style scoped>
.gap-2 {
  gap: 8px;
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
  font-size: 11px;
  background: white;
  outline: none;
}
.f-date:focus {
  border-color: #1976d2;
}
.f-divider {
  width: 1px;
  height: 20px;
  background: #ddd;
  margin: 0 10px;
}
.f-search-perusahaan {
  width: 280px;
  background: white;
  border-radius: 4px;
}
.f-search-perusahaan :deep(.v-field__input) {
  min-height: 28px !important;
  padding-top: 0 !important;
  padding-bottom: 0 !important;
  font-size: 11px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.f-search-perusahaan :deep(.v-field__clearable) {
  align-items: center;
  align-self: center;
  padding-top: 0;
}
.umur-merah {
  color: #c62828;
  font-weight: 700;
}
.umur-oranye {
  color: #ef6c00;
  font-weight: 700;
}
</style>
