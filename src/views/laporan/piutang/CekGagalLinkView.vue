<script setup lang="ts">
import { ref } from "vue";
import { useToast } from "vue-toastification";
import BaseBrowse from "@/components/BaseBrowse.vue";
import { useBrowse } from "@/composables/useBrowse";
import { cekGagalLinkService } from "@/services/laporan/piutang/cekGagalLinkService";
import {
  IconLinkOff,
  IconLink,
  IconTableOptions,
  IconAlertTriangle,
} from "@tabler/icons-vue";

const toast = useToast();
const menuId = "968";

// Tidak ada filter, biarkan kosong
const filterState = ref({});

const expanded = ref<any[]>([]);
const loadingDetails = ref(new Set<string>());
const detailData = ref<Record<string, any[]>>({});

// Headers Master Sesuai Delphi
const headers = [
  { title: "Nota", key: "Nota", width: "160px" },
  { title: "Tanggal", key: "Tanggal", width: "100px", align: "center" },
  { title: "Customer", key: "Customer", width: "90px", align: "center" },
  { title: "Nama Customer", key: "NamaCustomer", minWidth: "200px" },
  { title: "Alamat", key: "Alamat", minWidth: "250px" },
  { title: "Debet", key: "Debet", width: "110px", align: "right" },
  { title: "Kredit", key: "Kredit", width: "110px", align: "right" },
  { title: "Bayar (Detail)", key: "Bayar", width: "110px", align: "right" },
  { title: "Selisih", key: "Selisih", width: "110px", align: "right" },
];

const {
  items,
  isLoading,
  canExport,
  canEdit, // <- Mengambil hak akses edit
  selected,
  isSingleSelected,
  fetchData,
  exportToExcel,
  clearSelection,
} = useBrowse({
  menuId,
  fetchApi: async () => {
    const res = await cekGagalLinkService.getBrowse();
    return res.data.data || [];
  },
  immediate: true,
});

// ── LAZY LOAD DETAIL PEMBAYARAN ──
const loadDetailData = async (nota: string) => {
  loadingDetails.value.add(nota);
  try {
    const res = await cekGagalLinkService.getBrowseDetail(nota);
    detailData.value = { ...detailData.value, [nota]: res.data.data || [] };
  } catch {
    toast.error("Gagal memuat rincian histori pembayaran.");
  } finally {
    loadingDetails.value.delete(nota);
  }
};

const handleExpanded = (newExpanded: any[]) => {
  expanded.value = newExpanded;
  for (const val of newExpanded) {
    const nota = typeof val === "object" && val !== null ? val.Nota : val;
    if (nota && !detailData.value[nota]) {
      loadDetailData(nota);
    }
  }
};

const onRowClick = (item: any) => {
  const nota = item.Nota;
  let newExpanded = [...expanded.value];
  const index = newExpanded.indexOf(nota);

  if (index === -1) newExpanded.push(nota);
  else newExpanded.splice(index, 1);

  handleExpanded(newExpanded);
};

// ── AKSI FIX / LINK PEMBAYARAN ──
const showConfirmDialog = ref(false);
const isFixing = ref(false);

const openConfirmDialog = () => {
  showConfirmDialog.value = true;
};

const confirmFixLink = async () => {
  if (!isSingleSelected.value) return;
  const target = selected.value[0];

  isFixing.value = true;
  try {
    await cekGagalLinkService.fixLink(target.Nota, target.Bayar);
    toast.success(
      `Berhasil dilink. Kredit Nota ${target.Nota} telah disinkronkan.`,
    );
    showConfirmDialog.value = false;
    clearSelection();
    fetchData(); // Refresh grid master agar baris yang sudah fix hilang dari daftar
  } catch (error: any) {
    toast.error(
      error.response?.data?.message || "Gagal melakukan link pembayaran.",
    );
  } finally {
    isFixing.value = false;
  }
};

const fmtNum = (val: number) =>
  new Intl.NumberFormat("id-ID").format(Math.ceil(val || 0));

const getTotal = (key: string, filteredItems: any[]) => {
  return filteredItems.reduce((sum, item) => sum + (Number(item[key]) || 0), 0);
};
</script>

<template>
  <BaseBrowse
    title="Cek Gagal Link Pembayaran"
    :menu-id="menuId"
    :icon="IconLinkOff"
    :headers="headers"
    :items="items ?? []"
    item-value="Nota"
    :is-loading="isLoading"
    v-model:filterState="filterState"
    v-model:selected="selected"
    show-expand
    :expanded="expanded"
    @update:expanded="handleExpanded"
    :can-export="canExport"
    @row-click="onRowClick"
    @refresh="fetchData"
    @export="exportToExcel('Cek_Gagal_Link_Piutang')"
  >
    <template #filter-left>
      <div class="d-flex align-center gap-2">
        <span class="f-label text-grey"
          >Menampilkan seluruh data piutang dengan status gagal link
          (selisih).</span
        >
      </div>
    </template>

    <template #extra-actions>
      <v-btn
        v-if="canEdit"
        size="small"
        color="warning"
        variant="elevated"
        class="mr-2"
        :disabled="!isSingleSelected"
        @click="openConfirmDialog"
      >
        <template #prepend><IconLink :size="15" /></template>
        Link Pembayaran
      </v-btn>
    </template>

    <template #item.Debet="{ item }">{{ fmtNum(item.Debet) }}</template>
    <template #item.Kredit="{ item }">{{ fmtNum(item.Kredit) }}</template>
    <template #item.Bayar="{ item }">
      <span class="font-weight-bold text-success">{{
        fmtNum(item.Bayar)
      }}</span>
    </template>
    <template #item.Selisih="{ item }">
      <span class="font-weight-bold text-error">
        {{ fmtNum(item.Selisih) }}
      </span>
    </template>

    <template #detail="{ item }">
      <div class="detail-wrap">
        <div v-if="loadingDetails.has(item.Nota)" class="detail-loading">
          <v-progress-circular indeterminate color="primary" size="24" />
          <span class="ml-2 text-caption text-grey"
            >Memuat detail pelunasan...</span
          >
        </div>

        <div v-else class="detail-panel">
          <div class="panel-head">
            <IconTableOptions :size="14" class="mr-1" />
            Detail Pembayaran:
            <span class="text-warning ml-1">{{ item.Nota }}</span>
          </div>
          <div class="panel-body">
            <table class="dtl-table">
              <thead>
                <tr>
                  <th style="width: 150px">Nota (Invoice)</th>
                  <th style="width: 130px">Nomor Pelunasan</th>
                  <th style="width: 90px" class="tc">Tanggal</th>
                  <th style="width: 140px">No Penerimaan</th>
                  <th class="tr" style="width: 110px">Bayar</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(d, i) in detailData[item.Nota]" :key="i">
                  <td class="font-weight-bold text-primary">{{ d.Nota }}</td>
                  <td>{{ d.Nomor }}</td>
                  <td class="tc">{{ d.Tanggal }}</td>
                  <td class="monospace">{{ d.NoBukti }}</td>
                  <td class="tr text-success fw">{{ fmtNum(d.Bayar) }}</td>
                </tr>
                <tr v-if="!detailData[item.Nota]?.length">
                  <td colspan="5" class="empty-row">
                    Tidak ada riwayat pembayaran di tabel detail.
                  </td>
                </tr>
              </tbody>
              <tfoot v-if="detailData[item.Nota]?.length">
                <tr class="tfoot-row">
                  <td colspan="4" class="tr font-weight-bold">
                    TOTAL DETAIL BAYAR :
                  </td>
                  <td
                    class="tr text-success font-weight-bold"
                    style="font-size: 12px"
                  >
                    {{ fmtNum(getTotal("Bayar", detailData[item.Nota])) }}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>
    </template>
  </BaseBrowse>

  <v-dialog v-model="showConfirmDialog" max-width="400px" persistent>
    <v-card class="rounded-lg">
      <v-card-title class="d-flex align-center pa-4 bg-warning-lighten-5">
        <IconAlertTriangle
          :size="20"
          :stroke-width="1.7"
          color="#f57f17"
          class="mr-2"
        />
        <span class="text-subtitle-1 font-weight-bold text-warning-darken-3">
          Konfirmasi Link
        </span>
      </v-card-title>

      <v-card-text class="pa-5 pt-4">
        <div class="text-body-2 mb-2">
          Apakah Anda yakin ingin melakukan link pembayaran (sinkronisasi nilai
          kredit) untuk nota ini?
        </div>
        <div
          v-if="selected.length"
          class="pa-3 bg-grey-lighten-4 rounded border"
        >
          <div class="d-flex justify-space-between mb-1">
            <span class="text-caption text-grey">Nota:</span>
            <span class="text-caption font-weight-bold">{{
              selected[0].Nota
            }}</span>
          </div>
          <div class="d-flex justify-space-between mb-1">
            <span class="text-caption text-grey">Kredit Saat Ini:</span>
            <span class="text-caption text-error">{{
              fmtNum(selected[0].Kredit)
            }}</span>
          </div>
          <div class="d-flex justify-space-between">
            <span class="text-caption text-grey">Disinkronkan Menjadi:</span>
            <span class="text-caption text-success font-weight-bold">{{
              fmtNum(selected[0].Bayar)
            }}</span>
          </div>
        </div>
      </v-card-text>

      <v-divider />

      <v-card-actions class="pa-3 bg-grey-lighten-4">
        <v-spacer />
        <v-btn
          variant="text"
          class="font-weight-bold"
          :disabled="isFixing"
          @click="showConfirmDialog = false"
        >
          Batal
        </v-btn>
        <v-btn
          color="warning"
          variant="elevated"
          class="font-weight-bold px-5 text-white"
          :loading="isFixing"
          @click="confirmFixLink"
        >
          Yakin, Link!
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style scoped>
/* ── Filter ── */
.gap-2 {
  gap: 8px;
}
.f-label {
  font-size: 11px;
  font-weight: 600;
  color: #757575;
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
  max-width: 800px;
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
  background: #fffde7;
  padding: 6px 10px;
  border-top: 2px solid #fff59d;
  color: #f57f17;
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
.bg-warning-lighten-5 {
  background-color: #fffde7;
}
.text-warning-darken-3 {
  color: #f57f17;
}
</style>
