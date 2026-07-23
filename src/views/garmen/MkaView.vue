<script setup lang="ts">
import { ref, computed, onMounted, watch } from "vue";
import { useRouter } from "vue-router";
import { useToast } from "vue-toastification";
import BaseBrowse from "@/components/BaseBrowse.vue";
import { useBrowse } from "@/composables/useBrowse";
import { mkaService } from "@/services/garmen/mkaService";
import { exportExcelSingle } from "@/utils/excelExport";
import { IconNotes, IconFileExport } from "@tabler/icons-vue";
import { formatTanggal, formatTanggalJam } from "@/utils/dateFormat";

const router = useRouter();
const toast = useToast();

// Default filter: awal bulan s.d. hari ini
const today = new Date();
const padDate = (n: number) => String(n).padStart(2, "0");
const toLocalDate = (d: Date) =>
  `${d.getFullYear()}-${padDate(d.getMonth() + 1)}-${padDate(d.getDate())}`;

const firstDayOfMonth = toLocalDate(
  new Date(today.getFullYear(), today.getMonth(), 1),
);
const todayStr = toLocalDate(today);

const SESSION_KEY = "mka_browse_filter";
const savedFilter = (() => {
  try {
    return JSON.parse(sessionStorage.getItem(SESSION_KEY) || "{}");
  } catch {
    return {};
  }
})();

const dtAwal = ref(savedFilter.dtAwal || firstDayOfMonth);
const dtAkhir = ref(savedFilter.dtAkhir || todayStr);
const filterKode = ref(savedFilter.filterKode || "");

watch(
  [dtAwal, dtAkhir, filterKode],
  () => {
    sessionStorage.setItem(
      SESSION_KEY,
      JSON.stringify({
        dtAwal: dtAwal.value,
        dtAkhir: dtAkhir.value,
        filterKode: filterKode.value,
      }),
    );
    fetchData();
  },
  { deep: true },
);

const {
  items,
  isLoading,
  selected,
  canInsert,
  canEdit,
  canDelete,
  canExport,
  selectedItem,
  fetchData,
} = useBrowse({
  menuId: "57",
  fetchApi: async () => {
    const res = await mkaService.getBrowse({
      startDate: dtAwal.value,
      endDate: dtAkhir.value,
      kodeBarang: filterKode.value,
    });
    return res.data.data;
  },
  immediate: false,
});

// --- Headers ---
const headers = [
  { title: "Nomor", key: "Nomor", width: "140px", fixed: true },
  { title: "Tanggal", key: "Tanggal", width: "100px", align: "center" },
  { title: "Divisi", key: "Divisi", width: "90px" },
  { title: "No. SPK", key: "SPK", width: "150px" },
  { title: "Nama SPK", key: "NamaSpk", width: "300px" },
  { title: "Qty SPK", key: "JumlahSPK", width: "80px", align: "right" },
  { title: "Status SPK", key: "StatusSPK", width: "90px", align: "center" },
  { title: "Keterangan", key: "Keterangan", width: "250px" },
  { title: "User", key: "UserCreate", width: "80px" },
  { title: "Created", key: "Created", width: "140px", align: "center" },
];

// --- Expand detail ---
const expandedRows = ref<any[]>([]);
const detailCache = ref<Record<string, any[]>>({});
const detailLoading = ref<Record<string, boolean>>({});

const onUpdateExpanded = async (newExpanded: any[]) => {
  expandedRows.value = newExpanded;
  const newlyExpanded = newExpanded.filter(
    (item) =>
      !detailCache.value[item.Nomor] && !detailLoading.value[item.Nomor],
  );
  for (const item of newlyExpanded) {
    const nomor = item.Nomor;
    detailLoading.value[nomor] = true;
    try {
      const res = await mkaService.getDetail(nomor);
      detailCache.value[nomor] = res.data.data || [];
    } catch {
      toast.error(`Gagal memuat detail ${nomor}`);
    } finally {
      detailLoading.value[nomor] = false;
    }
  }
};

// --- Row color: StatusSPK OPEN → merah, sesuai Delphi ---
const rowPropsFn = (_data: any) => ({});

// --- Handlers ---
onMounted(() => fetchData());

const onAdd = () => router.push("/garmen/mka/create");
const onEdit = (item: any) =>
  router.push(`/garmen/mka/edit/${encodeURIComponent(item.Nomor)}`);

const onDelete = async (item: any) => {
  try {
    await mkaService.deleteData(item.Nomor);
    toast.success("MKA berhasil dihapus.");
    fetchData();
  } catch (e: any) {
    toast.error(e.response?.data?.message || "Gagal menghapus.");
  }
};

const onPrint = () => {
  if (!selectedItem.value) return;
  window.open(
    `/garmen/mka/print/${encodeURIComponent(selectedItem.value.Nomor)}`,
    "_blank",
  );
};

const onExportHeader = async () => {
  if (!items.value?.length)
    return toast.warning("Tidak ada data untuk diekspor.");
  try {
    const res = await mkaService.exportHeader({
      startDate: dtAwal.value,
      endDate: dtAkhir.value,
      kodeBarang: filterKode.value,
    });
    await exportExcelSingle(
      `MKA_Header_${dtAwal.value}_${dtAkhir.value}.xlsx`,
      "MKA Header",
      [
        { header: "Nomor", key: "Nomor", width: 18 },
        { header: "Tanggal", key: "Tanggal", width: 12, align: "center" },
        { header: "Divisi", key: "Divisi", width: 12 },
        { header: "No. SPK", key: "SPK", width: 18 },
        { header: "Nama SPK", key: "NamaSpk", width: 40 },
        {
          header: "Qty SPK",
          key: "JumlahSPK",
          width: 10,
          align: "right",
          numFmt: "#,##0",
        },
        { header: "Status SPK", key: "StatusSPK", width: 12, align: "center" },
        { header: "Keterangan", key: "Keterangan", width: 35 },
        { header: "User", key: "UserCreate", width: 12 },
      ],
      res.data.data,
      `MKA Periode ${dtAwal.value} s/d ${dtAkhir.value}`,
    );
  } catch (e: any) {
    toast.error("Gagal export header.");
  }
};

const onExportDetail = async () => {
  try {
    const res = await mkaService.exportDetail({
      startDate: dtAwal.value,
      endDate: dtAkhir.value,
      kodeBarang: filterKode.value,
    });
    if (!res.data.data?.length)
      return toast.warning("Tidak ada detail untuk diekspor.");
    await exportExcelSingle(
      `MKA_Detail_${dtAwal.value}_${dtAkhir.value}.xlsx`,
      "MKA Detail",
      [
        { header: "Nomor MKA", key: "Nomor", width: 18 },
        { header: "Tanggal", key: "Tanggal", width: 12, align: "center" },
        { header: "No. SPK", key: "SPK", width: 18 },
        { header: "Nama SPK", key: "NamaSpk", width: 40 },
        { header: "Kode", key: "Kode", width: 14 },
        { header: "Nama Aksesoris", key: "NamaAksesoris", width: 40 },
        { header: "Satuan", key: "Satuan", width: 10 },
        {
          header: "Ready",
          key: "Ready",
          width: 12,
          align: "right",
          numFmt: "#,##0",
        },
        {
          header: "Free",
          key: "Free",
          width: 12,
          align: "right",
          numFmt: "#,##0",
        },
        {
          header: "Jumlah",
          key: "Jumlah",
          width: 12,
          align: "right",
          numFmt: "#,##0",
        },
      ],
      res.data.data,
      `MKA Detail Periode ${dtAwal.value} s/d ${dtAkhir.value}`,
    );
  } catch (e: any) {
    toast.error("Gagal export detail.");
  }
};

// --- Format ---
const numFmt = (v: any) =>
  v != null ? Number(v).toLocaleString("id-ID") : "0";
</script>

<template>
  <BaseBrowse
    title="MKA (Memo Kebutuhan Aksesoris)"
    menu-id="57"
    :icon="IconNotes"
    :headers="headers"
    :items="items ?? []"
    :is-loading="isLoading"
    v-model:selected="selected"
    :can-insert="canInsert"
    :can-edit="canEdit"
    :can-delete="canDelete"
    :can-export="canExport"
    item-value="Nomor"
    :row-props-fn="rowPropsFn"
    show-expand
    :expanded="expandedRows"
    @update:expanded="onUpdateExpanded"
    @add="onAdd"
    @edit="onEdit"
    @delete="onDelete"
    @refresh="fetchData"
    @export="onExportHeader"
  >
    <!-- Filter -->
    <template #filter-left>
      <div class="f-group">
        <span class="f-label">Periode</span>
        <input type="date" v-model="dtAwal" class="f-inp" />
        <span class="f-sep">s/d</span>
        <input type="date" v-model="dtAkhir" class="f-inp" />
      </div>
      <div class="f-divider" />
      <div class="f-group">
        <span class="f-label">Kode Barang</span>
        <input
          v-model="filterKode"
          class="f-inp"
          style="width: 140px"
          placeholder="Filter kode aksesoris..."
          @keydown.enter="fetchData"
        />
      </div>
    </template>

    <!-- Tombol ekstra: Cetak + Export Detail -->
    <template #extra-actions="{ selected }">
      <v-btn
        size="small"
        color="grey-darken-3"
        :disabled="selected.length === 0"
        @click="onPrint"
      >
        <template #prepend
          ><i class="ti ti-printer" style="font-size: 15px"
        /></template>
        Cetak
      </v-btn>
      <v-btn
        size="small"
        color="teal-darken-2"
        :disabled="!canExport"
        @click="onExportDetail"
      >
        <template #prepend><IconFileExport :size="15" /></template>
        Export Detail
      </v-btn>
    </template>

    <!-- Kolom custom -->
    <template #item.Tanggal="{ item }">
      {{ formatTanggal(item.Tanggal) }}
    </template>
    <template #item.Created="{ item }">
      {{ formatTanggalJam(item.Created) }}
    </template>
    <template #item.JumlahSPK="{ item }">{{ numFmt(item.JumlahSPK) }}</template>
    <template #item.StatusSPK="{ item }">
      <span
        class="status-chip"
        :class="item.StatusSPK === 'OPEN' ? 'chip-open' : 'chip-close'"
        >{{ item.StatusSPK }}</span
      >
    </template>

    <!-- Expand detail -->
    <template #detail="{ item }">
      <div class="expand-wrap">
        <v-progress-linear
          v-if="detailLoading[item.Nomor]"
          indeterminate
          color="primary"
          height="2"
        />
        <div v-else>
          <div class="expand-title mb-2">
            Detail Aksesoris — {{ item.Nomor }}
          </div>
          <table class="detail-table">
            <thead>
              <tr>
                <th>Kode</th>
                <th>Nama Aksesoris</th>
                <th>Satuan</th>
                <th class="tr">Ready (Stok)</th>
                <th class="tr">Free</th>
                <th class="tr">Jumlah MKA</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(d, i) in detailCache[item.Nomor]" :key="i">
                <td class="mono">{{ d.Kode }}</td>
                <td>{{ d.NamaAksesoris }}</td>
                <td class="tc">{{ d.Satuan }}</td>
                <td class="tr">{{ numFmt(d.Ready) }}</td>
                <td class="tr" :class="{ 'text-red': Number(d.Free) < 0 }">
                  {{ numFmt(d.Free) }}
                </td>
                <td class="tr fw">{{ numFmt(d.Jumlah) }}</td>
              </tr>
              <tr v-if="!detailCache[item.Nomor]?.length">
                <td
                  colspan="6"
                  class="tc text-grey pa-3"
                  style="font-size: 11px"
                >
                  Tidak ada detail aksesoris.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </template>
  </BaseBrowse>
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
.f-divider {
  width: 1px;
  height: 20px;
  background: #ddd;
  margin: 0 8px;
}

.status-chip {
  display: inline-block;
  font-size: 10px;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 3px;
}
.chip-open {
  background: #ffebee;
  color: #c62828;
  border: 1px solid #ef9a9a;
}
.chip-close {
  background: #f5f5f5;
  color: #616161;
  border: 1px solid #e0e0e0;
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
.detail-table td {
  padding: 4px 10px;
  border-bottom: 1px solid #eee;
  font-size: 11px;
}
.detail-table tbody tr:hover td {
  background: #f5f5f5;
}
.tr {
  text-align: right !important;
}
.tc {
  text-align: center !important;
}
.fw {
  font-weight: 700;
}
.mono {
  font-family: monospace;
  font-size: 10px;
}
.text-red {
  color: #c62828 !important;
  font-weight: 700;
}
</style>
