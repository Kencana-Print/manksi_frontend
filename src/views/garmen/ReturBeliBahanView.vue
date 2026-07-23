<script setup lang="ts">
import { ref, computed, watch, onMounted } from "vue";
import { useRouter } from "vue-router";
import { useToast } from "vue-toastification";
import BaseBrowse from "@/components/BaseBrowse.vue";
import { useBrowse } from "@/composables/useBrowse";
import { useAuthStore } from "@/stores/authStore";
import { returBeliBahanService } from "@/services/garmen/returBeliBahanService";
import { exportExcelSingle, type ExcelColumn } from "@/utils/excelExport";
import {
  IconArrowBackUp,
  IconPrinter,
  IconFileExport,
} from "@tabler/icons-vue";
import { formatTanggal } from "@/utils/dateFormat";

const router = useRouter();
const toast = useToast();
const authStore = useAuthStore();

// ✅ Padanan zLihatBeli Delphi — dari JWT flags (kolom user_lihat_beli)
const canLihatBeli = computed(() => authStore.user?.flags?.lihatBeli === 1);

// --- STATE FILTER (default: awal bulan s.d. hari ini) ---
const d = new Date();
const toLocalDateStr = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};
const firstDay = toLocalDateStr(new Date(d.getFullYear(), d.getMonth(), 1));
const today = toLocalDateStr(d);

const filterState = ref({
  dtAwal: firstDay,
  dtAkhir: today,
});

// --- BROWSE SETUP ---
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
  menuId: "55",
  fetchApi: async () => {
    const res = await returBeliBahanService.getBrowse({
      startDate: filterState.value.dtAwal,
      endDate: filterState.value.dtAkhir,
    });
    return res.data.data;
  },
  immediate: false,
});

// --- HEADERS UTAMA ---
const headers = [
  { title: "Nomor", key: "nomor", width: "150px", fixed: true },
  { title: "Tanggal", key: "tanggal", width: "100px", align: "center" },
  { title: "No. BPB", key: "noBpb", width: "150px" },
  { title: "Kd. Supplier", key: "kdSup", width: "100px" },
  { title: "Supplier", key: "supplier", width: "220px" },
  { title: "Keterangan", key: "keterangan", width: "260px" },
];

// --- EXPAND LOGIC (DETAIL) ---
const expandedRows = ref<any[]>([]);
const detailCache = ref<Record<string, any[]>>({});
const expandedLoading = ref<Record<string, boolean>>({});

const onUpdateExpanded = async (newExpanded: any[]) => {
  expandedRows.value = newExpanded;
  const newlyExpanded = newExpanded.filter(
    (item) =>
      !detailCache.value[item.nomor] && !expandedLoading.value[item.nomor],
  );

  for (const item of newlyExpanded) {
    const nomor = item.nomor;
    expandedLoading.value[nomor] = true;
    try {
      const res = await returBeliBahanService.getDetail(nomor);
      detailCache.value[nomor] = res.data.data;
    } catch {
      toast.error(`Gagal memuat detail Retur ${nomor}`);
    } finally {
      expandedLoading.value[nomor] = false;
    }
  }
};

// --- HANDLERS ---
onMounted(() => fetchData());
watch(() => filterState.value.dtAwal, fetchData);
watch(() => filterState.value.dtAkhir, fetchData);

const onAdd = () => {
  router.push({ name: "ReturBeliBahanCreate" });
};

const onEdit = (item: any) => {
  if (!item || !item.nomor) return;
  router.push(
    `/garmen/bahan-baku/retur-pembelian-bahan/form/${encodeURIComponent(item.nomor)}`,
  );
};

const onDelete = async (item: any) => {
  try {
    await returBeliBahanService.delete(item.nomor);
    toast.success("Retur pembelian berhasil dihapus.");
    fetchData();
  } catch (e: any) {
    toast.error(e.response?.data?.message || "Gagal menghapus data.");
  }
};

const onPrint = () => {
  if (!selectedItem.value) {
    return toast.warning("Pilih data terlebih dahulu.");
  }
  const url = router.resolve({
    name: "ReturBeliBahanPrint",
    params: { nomor: selectedItem.value.nomor },
  }).href;
  window.open(url, "_blank");
};

// --- EXPORT (header) ---
const onExport = async () => {
  if (!items.value || items.value.length === 0) {
    return toast.warning("Tidak ada data untuk diexport.");
  }
  try {
    await exportExcelSingle(
      `Export_Retur_Pembelian_Bahan_${today}.xlsx`,
      "Retur Pembelian Bahan",
      [
        { header: "Nomor", key: "nomor", width: 20 },
        { header: "Tanggal", key: "tanggal", width: 14, align: "center" },
        { header: "No. BPB", key: "noBpb", width: 20 },
        { header: "Kd. Supplier", key: "kdSup", width: 14 },
        { header: "Supplier", key: "supplier", width: 26 },
        { header: "Keterangan", key: "keterangan", width: 30 },
      ],
      items.value.map((it: any) => ({
        ...it,
        tanggal: formatTanggal(it.tanggal),
      })),
      "Laporan Retur Pembelian Bahan",
    );
    toast.success("Berhasil export data.");
  } catch (e) {
    console.error(e);
    toast.error("Terjadi kesalahan saat export.");
  }
};

// --- EXPORT DETAIL ---
const exportDetail = async () => {
  if (!items.value || items.value.length === 0) {
    return toast.warning("Tidak ada data untuk diexport.");
  }
  toast.info("Menyiapkan data detail untuk diexport... Mohon tunggu.");

  try {
    const allDetails: any[] = [];

    for (const item of items.value) {
      let detail = detailCache.value[item.nomor];
      if (!detail) {
        const res = await returBeliBahanService.getDetail(item.nomor);
        detail = res.data.data;
        detailCache.value[item.nomor] = detail;
      }

      if (detail && detail.length > 0) {
        detail.forEach((dRow: any) => {
          const row: any = {
            nomor: item.nomor,
            tanggal: formatTanggal(item.tanggal),
            noBpb: item.noBpb,
            supplier: item.supplier,
            kode: dRow.kode,
            nama: dRow.nama,
            satuan: dRow.satuan,
            jumlah: Number(dRow.jumlah) || 0,
          };
          if (canLihatBeli.value) {
            row.harga = Number(dRow.harga) || 0;
            row.total = Number(dRow.total) || 0;
          }
          allDetails.push(row);
        });
      }
    }

    if (allDetails.length === 0) {
      return toast.warning(
        "Tidak ada satupun detail yang ditemukan dari rentang tanggal ini.",
      );
    }

    const columns: ExcelColumn[] = [
      { header: "No. Retur", key: "nomor", width: 20 },
      { header: "Tanggal", key: "tanggal", width: 14, align: "center" },
      { header: "No. BPB", key: "noBpb", width: 20 },
      { header: "Supplier", key: "supplier", width: 24 },
      { header: "Kode Bahan", key: "kode", width: 14 },
      { header: "Nama Bahan", key: "nama", width: 30 },
      { header: "Satuan", key: "satuan", width: 10, align: "center" },
      {
        header: "Jumlah",
        key: "jumlah",
        width: 14,
        align: "right",
        numFmt: "#,##0",
      },
    ];
    if (canLihatBeli.value) {
      columns.push(
        {
          header: "Harga",
          key: "harga",
          width: 14,
          align: "right",
          numFmt: "#,##0",
        },
        {
          header: "Total",
          key: "total",
          width: 16,
          align: "right",
          numFmt: "#,##0",
        },
      );
    }

    await exportExcelSingle(
      `Export_Detail_Retur_Pembelian_Bahan_${today}.xlsx`,
      "Detail Retur Pembelian",
      columns,
      allDetails,
      "Detail Retur Pembelian Bahan",
    );

    toast.success("Berhasil export detail.");
  } catch (e) {
    console.error(e);
    toast.error("Terjadi kesalahan saat mengekspor detail.");
  }
};

const numFmt = (v: any) => (v ? Number(v).toLocaleString("id-ID") : "0");
</script>

<template>
  <BaseBrowse
    title="Retur Pembelian Bahan"
    menu-id="55"
    :icon="IconArrowBackUp"
    :headers="headers"
    :items="items ?? []"
    :is-loading="isLoading"
    v-model:selected="selected"
    v-model:filter-state="filterState"
    :can-insert="canInsert"
    :can-edit="canEdit"
    :can-delete="canDelete"
    :can-export="canExport"
    item-value="nomor"
    @add="onAdd"
    @edit="onEdit"
    @delete="onDelete"
    @refresh="fetchData"
    @export="onExport"
    show-expand
    :expanded="expandedRows"
    @update:expanded="onUpdateExpanded"
  >
    <template #filter-left>
      <div class="f-group">
        <span class="f-label">Tanggal</span>
        <input type="date" v-model="filterState.dtAwal" class="f-date" />
        <span class="f-sep">s/d</span>
        <input type="date" v-model="filterState.dtAkhir" class="f-date" />
      </div>
    </template>

    <template #item.tanggal="{ item }">
      {{ formatTanggal(item.tanggal) }}
    </template>

    <!-- Detail Expand (Lazy Load) -->
    <template #detail="{ item }">
      <div class="expand-wrap">
        <v-progress-linear
          v-if="expandedLoading[item.nomor]"
          indeterminate
          color="primary"
          height="2"
        />
        <div v-else>
          <div class="expand-title mb-2">Detail Retur - {{ item.nomor }}</div>
          <table class="detail-table">
            <thead>
              <tr>
                <th width="100">Kode</th>
                <th>Nama Bahan</th>
                <th width="80" class="text-center">Satuan</th>
                <th width="100" class="tr">Jumlah</th>
                <th v-if="canLihatBeli" width="100" class="tr">Harga</th>
                <th v-if="canLihatBeli" width="120" class="tr">Total</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(dRow, i) in detailCache[item.nomor]" :key="i">
                <td>{{ dRow.kode }}</td>
                <td class="font-weight-bold">{{ dRow.nama }}</td>
                <td class="text-center">{{ dRow.satuan }}</td>
                <td class="tr text-blue-darken-2 font-weight-bold">
                  {{ numFmt(dRow.jumlah) }}
                </td>
                <td v-if="canLihatBeli" class="tr">
                  {{ numFmt(dRow.harga) }}
                </td>
                <td v-if="canLihatBeli" class="tr font-weight-bold">
                  {{ numFmt(dRow.total) }}
                </td>
              </tr>
              <tr
                v-if="
                  !detailCache[item.nomor] ||
                  detailCache[item.nomor].length === 0
                "
              >
                <td
                  :colspan="canLihatBeli ? 6 : 4"
                  class="text-center text-grey py-3 font-italic"
                >
                  Detail retur tidak ditemukan.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </template>

    <!-- Additional Actions -->
    <template #extra-actions="{ selected }">
      <v-btn
        size="small"
        color="grey-darken-3"
        :disabled="selected.length === 0"
        @click="onPrint"
      >
        <template #prepend><IconPrinter :size="15" /></template>Cetak
      </v-btn>
      <v-btn size="small" color="deep-purple-darken-1" @click="exportDetail">
        <template #prepend><IconFileExport :size="15" /></template>Export Detail
      </v-btn>
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
.f-date {
  height: 28px;
  border: 1px solid #ccc;
  border-radius: 4px;
  padding: 0 6px;
  font-size: 12px;
  background: white;
  outline: none;
}
.f-sep {
  font-size: 11px;
  color: #777;
}

.expand-wrap {
  padding: 10px 10px 10px 40px;
  background: #eceff1;
}
.expand-title {
  font-size: 12px;
  font-weight: bold;
  color: #1565c0;
  text-transform: uppercase;
}
.detail-table {
  width: 100%;
  border-collapse: collapse;
  background: white;
  border-radius: 4px;
  overflow: hidden;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
  font-size: 11px;
}
.detail-table th {
  background: #546e7a;
  color: white;
  text-align: left;
  padding: 6px 8px;
  font-weight: bold;
}
.detail-table td {
  padding: 4px 8px;
  border-bottom: 1px solid #eee;
}
.tr {
  text-align: right !important;
}
</style>
