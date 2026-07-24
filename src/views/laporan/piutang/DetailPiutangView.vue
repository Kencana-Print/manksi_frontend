<script setup lang="ts">
import { ref } from "vue";
import { useToast } from "vue-toastification";
import BaseBrowse from "@/components/BaseBrowse.vue";
import { useBrowse } from "@/composables/useBrowse";
import { detailPiutangService } from "@/services/laporan/piutang/detailPiutangService";
import { IconFileInvoice, IconTableOptions } from "@tabler/icons-vue";

const toast = useToast();
const menuId = "968"; // Menggunakan ID Parent Laporan Piutang

const getLocalDate = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const filterState = ref({
  endDate: getLocalDate(), // Hanya 1 filter s.d tanggal sesuai Delphi
});

const expanded = ref<any[]>([]);
const loadingDetails = ref(new Set<string>());
const detailData = ref<Record<string, any[]>>({});

// Headers untuk Master Sesuai Delphi
const headers = [
  { title: "Nomor", key: "Nomor", width: "160px" },
  { title: "Tanggal", key: "Tanggal", width: "90px", align: "center" },
  { title: "Bulan", key: "Bulan", width: "60px", align: "center" },
  { title: "Divisi", key: "Divisi", width: "80px", align: "center" },
  { title: "Customer", key: "Customer", minWidth: "200px" },
  { title: "Keterangan", key: "Keterangan", minWidth: "160px" },
  { title: "Dpp", key: "Dpp", width: "120px", align: "right" },
  { title: "PPn", key: "PPn", width: "100px", align: "right" },
  { title: "Total", key: "Total", width: "120px", align: "right" },
  { title: "Tgl Bayar", key: "TglBayar", width: "90px", align: "center" },
  {
    title: "Nominal Bayar",
    key: "NominalBayar",
    width: "120px",
    align: "right",
  },
  { title: "Sisa Piutang", key: "SisaPiutang", width: "120px", align: "right" },
  {
    title: "Faktur Pajak",
    key: "FakturPajak",
    width: "120px",
    align: "center",
  },
];

const { items, isLoading, canExport, fetchData, exportToExcel } = useBrowse({
  menuId,
  fetchApi: async () => {
    const res = await detailPiutangService.getBrowse(filterState.value);
    return res.data.data || [];
  },
  immediate: true,
});

const loadDetailData = async (nomor: string) => {
  loadingDetails.value.add(nomor);
  try {
    const res = await detailPiutangService.getBrowseDetail(
      nomor,
      filterState.value,
    );
    detailData.value = { ...detailData.value, [nomor]: res.data.data };
  } catch {
    toast.error("Gagal memuat detail pembayaran.");
  } finally {
    loadingDetails.value.delete(nomor);
  }
};

const handleExpanded = (newExpanded: any[]) => {
  expanded.value = newExpanded;
  for (const val of newExpanded) {
    const nomor = typeof val === "object" && val !== null ? val.Nomor : val;
    if (nomor && !detailData.value[nomor]) {
      loadDetailData(nomor);
    }
  }
};

const onRowClick = (item: any) => {
  const nomor = item.Nomor;
  let newExpanded = [...expanded.value];
  const index = newExpanded.indexOf(nomor);

  if (index === -1) newExpanded.push(nomor);
  else newExpanded.splice(index, 1);

  handleExpanded(newExpanded);
};

const getRowProps = () => ({});

const fmtNum = (val: number) => new Intl.NumberFormat("id-ID").format(val || 0);

// Hitung total untuk Summary Row
const getTotal = (key: string, filteredItems: any[]) => {
  return filteredItems.reduce((sum, item) => sum + (Number(item[key]) || 0), 0);
};
</script>

<template>
  <BaseBrowse
    title="Laporan Detail Piutang"
    :menu-id="menuId"
    :icon="IconFileInvoice"
    :headers="headers"
    :items="items ?? []"
    item-value="Nomor"
    :is-loading="isLoading"
    v-model:filterState="filterState"
    show-expand
    :expanded="expanded"
    @update:expanded="handleExpanded"
    :can-export="canExport"
    :row-props-fn="getRowProps"
    @row-click="onRowClick"
    @refresh="fetchData"
    @export="exportToExcel('Laporan_Detail_Piutang')"
  >
    <template #filter-left>
      <div class="d-flex align-center gap-2">
        <span class="f-label">S.D Tanggal</span>
        <input
          type="date"
          v-model="filterState.endDate"
          class="f-date"
          @change="fetchData"
        />
        <div class="f-divider" />
      </div>
    </template>

    <template #item.Tanggal="{ item }">
      {{ item.Tanggal?.replace(/-/g, "/") }}
    </template>

    <template #item.TglBayar="{ item }">
      {{ item.TglBayar ? item.TglBayar.replace(/-/g, "/") : "-" }}
    </template>
    <template #item.Dpp="{ item }">{{ fmtNum(item.Dpp) }}</template>
    <template #item.PPn="{ item }">{{ fmtNum(item.PPn) }}</template>
    <template #item.Total="{ item }">
      <span class="font-weight-bold text-primary">{{
        fmtNum(item.Total)
      }}</span>
    </template>
    <template #item.NominalBayar="{ item }">
      <span class="font-weight-bold text-success">{{
        fmtNum(item.NominalBayar)
      }}</span>
    </template>
    <template #item.SisaPiutang="{ item }">
      <span class="font-weight-bold text-error">{{
        fmtNum(item.SisaPiutang)
      }}</span>
    </template>

    <template #summary-row="{ filteredItems }">
      <div class="d-flex align-center gap-4 w-100 pr-2">
        <span class="summary-lbl ml-auto">TOTAL KESELURUHAN:</span>

        <div class="d-flex flex-column align-end mx-2">
          <span class="summary-sublbl">DPP</span>
          <span class="summary-val">{{
            fmtNum(getTotal("Dpp", filteredItems))
          }}</span>
        </div>
        <div class="d-flex flex-column align-end mx-2">
          <span class="summary-sublbl">PPN</span>
          <span class="summary-val">{{
            fmtNum(getTotal("PPn", filteredItems))
          }}</span>
        </div>
        <div class="d-flex flex-column align-end mx-2">
          <span class="summary-sublbl">TOTAL</span>
          <span class="summary-val text-yellow-accent-2">{{
            fmtNum(getTotal("Total", filteredItems))
          }}</span>
        </div>
        <div class="d-flex flex-column align-end mx-2">
          <span class="summary-sublbl">BAYAR</span>
          <span class="summary-val text-green-accent-2">{{
            fmtNum(getTotal("NominalBayar", filteredItems))
          }}</span>
        </div>
        <div
          class="d-flex flex-column align-end pl-2"
          style="border-left: 1px solid rgba(255, 255, 255, 0.3)"
        >
          <span class="summary-sublbl">SISA PIUTANG</span>
          <span class="summary-val text-red-accent-1" style="font-size: 14px">{{
            fmtNum(getTotal("SisaPiutang", filteredItems))
          }}</span>
        </div>
      </div>
    </template>

    <template #detail="{ item }">
      <div class="detail-wrap">
        <div v-if="loadingDetails.has(item.Nomor)" class="detail-loading">
          <v-progress-circular indeterminate color="primary" size="24" />
          <span class="ml-2 text-caption text-grey"
            >Memuat detail pembayaran...</span
          >
        </div>

        <div v-else class="detail-panel">
          <div class="panel-head">
            <IconTableOptions :size="14" class="mr-1" />
            Detail Pembayaran:
            <span class="text-warning ml-1">{{ item.Nomor }}</span>
          </div>
          <div class="panel-body">
            <table class="dtl-table">
              <thead>
                <tr>
                  <th style="width: 150px">Nomor Bukti</th>
                  <th style="width: 100px" class="tc">Tanggal</th>
                  <th style="width: 120px">Cara Bayar</th>
                  <th class="tr" style="width: 120px">Bayar</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(d, i) in detailData[item.Nomor]" :key="i">
                  <td class="fw">{{ d.NoBukti }}</td>
                  <td class="tc">
                    {{ d.Tanggal?.replace(/-/g, "/") || "-" }}
                  </td>
                  <td>{{ d.CaraBayar }}</td>
                  <td class="tr text-success fw">
                    {{ d.Bayar !== 0 ? fmtNum(d.Bayar) : "-" }}
                  </td>
                </tr>
                <tr v-if="!detailData[item.Nomor]?.length">
                  <td colspan="4" class="empty-row">
                    Belum ada riwayat pembayaran.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </template>
  </BaseBrowse>
</template>

<style scoped>
/* ── Filter ── */
.gap-2 {
  gap: 8px;
}
.gap-4 {
  gap: 16px;
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

/* ── Summary Row Styles ── */
.summary-lbl {
  font-size: 11px;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.7);
}
.summary-sublbl {
  font-size: 9px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.6);
  margin-bottom: -2px;
}
.summary-val {
  font-size: 12px;
  font-weight: 700;
  color: white;
  letter-spacing: 0.02em;
}

/* ── Detail Wrapper ── */
.detail-wrap {
  padding: 10px 14px 16px;
  background: #f0f4f8;
  border-top: 2px solid #e3e8ef;
}
.detail-loading {
  display: flex;
  align-items: center;
  padding: 16px;
  color: #555;
}
.ml-2 {
  margin-left: 8px;
}
.ml-1 {
  margin-left: 4px;
}

/* ── Panels ── */
.detail-panel {
  background: white;
  border-radius: 6px;
  overflow: hidden;
  border: 1px solid #cfd8dc;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08);
  max-width: 600px;
}
.panel-head {
  display: flex;
  align-items: center;
  background: #263238;
  color: white;
  padding: 8px 12px;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.02em;
}
.panel-body {
  overflow-x: auto;
}

/* ── Detail Table ── */
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
}
.dtl-table tbody tr:hover td {
  background: #f5f9ff;
}

/* ── Cell Helpers ── */
.tc {
  text-align: center !important;
}
.tr {
  text-align: right !important;
}
.fw {
  font-weight: 700;
}
.empty-row {
  text-align: center;
  color: #9e9e9e;
  padding: 14px;
  font-style: italic;
}
</style>
