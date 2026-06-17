<script setup lang="ts">
import { ref } from "vue";
import { useToast } from "vue-toastification";
import BaseBrowse from "@/components/BaseBrowse.vue";
import { useBrowse } from "@/composables/useBrowse";
import { daftarPenerimaanService } from "@/services/laporan/piutang/daftarPenerimaanService";
import { IconCurrencyDollar, IconTableOptions } from "@tabler/icons-vue";

const toast = useToast();
const menuId = "968";

const getStartOfMonth = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
};

const getLocalDate = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const filterState = ref({
  startDate: getStartOfMonth(),
  endDate: getLocalDate(),
});

const expanded = ref<any[]>([]);
const loadingDetails = ref(new Set<string>());
const detailData = ref<Record<string, any[]>>({});

// Headers Master Sesuai Kolom yang Diminta
const headers = [
  { title: "No Penerimaan", key: "NoPenerimaan", width: "160px" },
  { title: "Tanggal", key: "Tanggal", width: "100px", align: "center" },
  { title: "Kode", key: "Kode", width: "80px", align: "center" },
  { title: "Customer", key: "Customer", minWidth: "200px" },
  { title: "Kode Acc", key: "KodeAccount", width: "90px", align: "center" },
  { title: "Rekening", key: "Rekening", width: "110px" },
  { title: "Nama Account", key: "NamaAccount", minWidth: "160px" },
  { title: "Debet", key: "Debet", width: "120px", align: "right" },
  { title: "Kredit", key: "Kredit", width: "120px", align: "right" },
  { title: "Saldo", key: "Saldo", width: "120px", align: "right" },
  { title: "Notes", key: "Notes", minWidth: "150px" },
];

const { items, isLoading, canExport, fetchData, exportToExcel } = useBrowse({
  menuId,
  fetchApi: async () => {
    const res = await daftarPenerimaanService.getBrowse(filterState.value);
    return res.data.data || [];
  },
  immediate: true,
});

const loadDetailData = async (noPenerimaan: string) => {
  loadingDetails.value.add(noPenerimaan);
  try {
    const res = await daftarPenerimaanService.getBrowseDetail(noPenerimaan);
    detailData.value = {
      ...detailData.value,
      [noPenerimaan]: res.data.data || [],
    };
  } catch {
    toast.error("Gagal memuat rincian alokasi penerimaan.");
  } finally {
    loadingDetails.value.delete(noPenerimaan);
  }
};

const handleExpanded = (newExpanded: any[]) => {
  expanded.value = newExpanded;
  for (const val of newExpanded) {
    const noPenerimaan =
      typeof val === "object" && val !== null ? val.NoPenerimaan : val;
    if (noPenerimaan && !detailData.value[noPenerimaan]) {
      loadDetailData(noPenerimaan);
    }
  }
};

const onRowClick = (item: any) => {
  const noPenerimaan = item.NoPenerimaan;
  let newExpanded = [...expanded.value];
  const index = newExpanded.indexOf(noPenerimaan);

  if (index === -1) newExpanded.push(noPenerimaan);
  else newExpanded.splice(index, 1);

  handleExpanded(newExpanded);
};

const fmtNum = (val: number) =>
  new Intl.NumberFormat("id-ID").format(Math.ceil(val || 0));

const getTotal = (key: string, filteredItems: any[]) => {
  return filteredItems.reduce((sum, item) => sum + (Number(item[key]) || 0), 0);
};
</script>

<template>
  <BaseBrowse
    title="Laporan Daftar Penerimaan Piutang"
    :menu-id="menuId"
    :icon="IconCurrencyDollar"
    :headers="headers"
    :items="items ?? []"
    item-value="NoPenerimaan"
    :is-loading="isLoading"
    v-model:filterState="filterState"
    show-expand
    :expanded="expanded"
    @update:expanded="handleExpanded"
    :can-export="canExport"
    @row-click="onRowClick"
    @refresh="fetchData"
    @export="exportToExcel('Laporan_Daftar_Penerimaan')"
  >
    <template #filter-left>
      <div class="d-flex align-center gap-2">
        <span class="f-label">Periode</span>
        <input
          type="date"
          v-model="filterState.startDate"
          class="f-date"
          @change="fetchData"
        />
        <span class="f-sep">s/d</span>
        <input
          type="date"
          v-model="filterState.endDate"
          class="f-date"
          @change="fetchData"
        />
        <div class="f-divider" />
      </div>
    </template>

    <template #item.Debet="{ item }">{{ fmtNum(item.Debet) }}</template>
    <template #item.Kredit="{ item }">{{ fmtNum(item.Kredit) }}</template>
    <template #item.Saldo="{ item }">
      <span
        :class="
          Number(item.Saldo) !== 0 ? 'text-error font-weight-bold' : 'text-grey'
        "
      >
        {{ fmtNum(item.Saldo) }}
      </span>
    </template>

    <template #summary-row="{ filteredItems }">
      <div class="d-flex align-center gap-4 w-100 pr-2">
        <span class="summary-lbl ml-auto">TOTAL KESELURUHAN:</span>
        <div class="d-flex flex-column align-end mx-2">
          <span class="summary-sublbl">DEBET</span>
          <span class="summary-val">{{
            fmtNum(getTotal("Debet", filteredItems))
          }}</span>
        </div>
        <div class="d-flex flex-column align-end mx-2">
          <span class="summary-sublbl">KREDIT</span>
          <span class="summary-val text-green-accent-2">{{
            fmtNum(getTotal("Kredit", filteredItems))
          }}</span>
        </div>
        <div
          class="d-flex flex-column align-end pl-3 ml-2"
          style="border-left: 1px solid rgba(255, 255, 255, 0.3)"
        >
          <span class="summary-sublbl text-yellow-accent-2">SALDO</span>
          <span class="summary-val text-yellow-accent-2">{{
            fmtNum(getTotal("Saldo", filteredItems))
          }}</span>
        </div>
        <div style="width: 150px"></div>
      </div>
    </template>

    <template #detail="{ item }">
      <div class="detail-wrap">
        <div
          v-if="loadingDetails.has(item.NoPenerimaan)"
          class="detail-loading"
        >
          <v-progress-circular indeterminate color="primary" size="24" />
          <span class="ml-2 text-caption text-grey"
            >Memuat rincian alokasi nota...</span
          >
        </div>

        <div v-else class="detail-panel">
          <div class="panel-head">
            <IconTableOptions :size="14" class="mr-1" />
            Alokasi Invoice untuk Penerimaan:
            <span class="text-warning ml-1">{{ item.NoPenerimaan }}</span>
          </div>
          <div class="panel-body">
            <table class="dtl-table">
              <thead>
                <tr>
                  <th style="width: 150px">No Pelunasan</th>
                  <th style="width: 90px" class="tc">Tgl Lunas</th>
                  <th style="width: 140px">Invoice / Nota</th>
                  <th style="width: 80px" class="tc">Kode Cus</th>
                  <th style="width: 180px">Nama Customer</th>
                  <th style="width: 180px">Alamat & Kota</th>
                  <th class="tr" style="width: 110px">Nilai Bayar</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(d, i) in detailData[item.NoPenerimaan]" :key="i">
                  <td>{{ d.NoPelunasan }}</td>
                  <td class="tc">{{ d.Tanggal }}</td>
                  <td class="font-weight-bold text-primary">{{ d.Invoice }}</td>
                  <td class="tc monospace">{{ d.KodeCus }}</td>
                  <td>{{ d.Customer }}</td>
                  <td>{{ d.Alamat }} {{ d.Kota ? `(${d.Kota})` : "" }}</td>
                  <td class="tr text-success fw">{{ fmtNum(d.Bayar) }}</td>
                  <td style="white-space: normal; line-height: 1.2">
                    {{ d.Notes }}
                  </td>
                </tr>
                <tr v-if="!detailData[item.NoPenerimaan]?.length">
                  <td colspan="8" class="empty-row">
                    Penerimaan ini belum dialokasikan ke invoice mana pun.
                  </td>
                </tr>
              </tbody>
              <tfoot v-if="detailData[item.NoPenerimaan]?.length">
                <tr class="tfoot-row">
                  <td colspan="6" class="tr font-weight-bold">
                    TOTAL ALOKASI :
                  </td>
                  <td
                    class="tr text-success font-weight-bold"
                    style="font-size: 12px"
                  >
                    {{
                      fmtNum(getTotal("Bayar", detailData[item.NoPenerimaan]))
                    }}
                  </td>
                  <td></td>
                </tr>
              </tfoot>
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
.f-sep {
  font-size: 11px;
  color: #888;
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
  max-width: 1100px;
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
  table-layout: fixed;
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
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.dtl-table tbody tr:hover td {
  background: #f5f9ff;
}
.dtl-table tfoot tr td {
  background: #e0f2f1;
  padding: 6px 10px;
  border-top: 2px solid #4db6ac;
  color: #004d40;
  position: sticky;
  bottom: 0;
  z-index: 2;
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
.monospace {
  font-family: monospace;
  font-size: 12px;
}
.empty-row {
  text-align: center;
  color: #9e9e9e;
  padding: 14px;
  font-style: italic;
}
</style>
