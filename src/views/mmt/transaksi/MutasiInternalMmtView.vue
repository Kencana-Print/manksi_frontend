<template>
  <BaseBrowse
    title="Data Mutasi Internal (Ex Sublim)"
    menu-id="mmt-mutasi-internal"
    icon="mdi-vector-arrange-redirect"
    :headers="masterHeaders"
    :items="masterData"
    :can-insert="true"
    :can-edit="true"
    :can-delete="true"
    :is-loading="loading.headers"
    :loading="loading.headers"
    v-model:selected="selected"
    v-model:expanded="expanded"
    :filters="filters"
    v-model:startDate="filters.startDate"
    v-model:endDate="filters.endDate"
    item-value="Nomor_Mutasi"
    has-print
    :row-props-fn="getRowProps"
    :row-props="getRowProps"
    :summary-fields="['Total_Qty']"
    @refresh="fetchData"
    @add="actionSaveRedirect('new')"
    @edit="actionSaveRedirect('edit')"
    @delete="handleDelete"
    @print="handlePrintAction"
    @row-click="handleRowClick"
    @update:expanded="handleExpandUpdate"
  >
    <!-- Keterangan Warna Status di atas tabel -->
    <template #prepend-content>
      <div
        class="d-flex align-center px-4 py-2 bg-grey-lighten-4 mb-2 rounded text-caption"
      >
        <span class="font-weight-bold mr-4">Keterangan Dokumen:</span>
        <span class="d-flex align-center mr-4">
          <span class="color-indicator bg-primary rounded-circle mr-1"></span>
          Mutasi Internal Aktif / Tersimpan
        </span>
      </div>
    </template>

    <!-- Tombol Ekstra: Export Detail -->
    <template #extra-actions="{ isSingleSelected }">
      <v-btn
        size="x-small"
        color="success"
        :disabled="masterData.length === 0"
        @click="exportToExcel"
      >
        <v-icon start>mdi-download</v-icon> Export Detail
      </v-btn>
    </template>

    <!-- Filter Tambahan di Toolbar -->
    <template #filter-fields>
      <v-text-field
        v-model="filters.search"
        prepend-inner-icon="mdi-magnify"
        label="Cari No. Mutasi / Keterangan..."
        density="compact"
        hide-details
        variant="outlined"
        clearable
        style="max-width: 300px"
        @keyup.enter="fetchData"
      />
    </template>

    <!-- Custom Template Kolom Tabel Utama -->
    <template #item.Tanggal="{ item }">
      {{ safeFormatDate(item.Tanggal) }}
    </template>

    <template #item.Nomor_Mutasi="{ item }">
      <span class="font-weight-bold text-blue-grey-darken-4">{{
        item.Nomor_Mutasi
      }}</span>
    </template>

    <template #item.Bagian_Asal="{ item }">
      <v-chip
        size="small"
        :color="getBagianColor(item.Bagian_Asal)"
        variant="outlined"
        class="font-weight-medium rounded px-2 text-caption border-opacity-50"
      >
        {{ getBagianNama(item.Bagian_Asal) }}
      </v-chip>
    </template>

    <template #item.Bagian_Tujuan="{ item }">
      <v-chip
        size="small"
        :color="getBagianColor(item.Bagian_Tujuan)"
        variant="tonal"
        class="font-weight-medium rounded px-2 text-caption"
      >
        {{ getBagianNama(item.Bagian_Tujuan) }}
      </v-chip>
    </template>

    <template #item.Total_Qty="{ item }">
      <div class="text-right font-weight-bold text-grey-darken-4">
        {{ Number(item.Total_Qty || 0).toLocaleString("id-ID") }}
      </div>
    </template>

    <template #item.Keterangan="{ item }">
      <span class="text-caption text-grey-darken-1">
        {{ item.Keterangan || "—" }}
      </span>
    </template>

    <!-- Slot Expanded Content untuk Menampilkan Detail -->
    <template #expanded-content="{ item }">
      <div class="detail-container">
        <div class="detail-table-wrapper">
          <div
            v-if="isLoadingDetails(item.Nomor_Mutasi)"
            class="text-center pa-4"
          >
            <v-progress-circular indeterminate size="20" />
            <span class="ml-2 text-caption">Memuat detail...</span>
          </div>

          <v-data-table
            v-else-if="
              details[item.Nomor_Mutasi] && details[item.Nomor_Mutasi].length
            "
            :headers="detailHeaders"
            :items="details[item.Nomor_Mutasi]"
            density="compact"
            hide-default-footer
            class="detail-table border"
          >
            <template #item.Nomor_SPK="{ item: d }">
              <span class="text-grey-darken-3 font-weight-medium">{{
                d.Nomor_SPK
              }}</span>
            </template>

            <template #item.Nama_Komponen="{ item: d }">
              <v-chip
                size="x-small"
                variant="outlined"
                color="grey-darken-2"
                class="font-weight-medium rounded-sm"
              >
                {{ d.Nama_Komponen || "ALL SET" }}
              </v-chip>
            </template>

            <template #item.Qty_Mutasi="{ item: d }">
              <div class="text-right font-weight-bold text-grey-darken-4">
                {{ Number(d.Qty_Mutasi || 0).toLocaleString("id-ID") }}
              </div>
            </template>
          </v-data-table>

          <div v-else class="text-center pa-4 text-caption">
            Data detail tidak ditemukan atau gagal dimuat.
          </div>
        </div>
      </div>
    </template>
  </BaseBrowse>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, computed, watch } from "vue";
import { useRouter } from "vue-router";
import { useToast } from "vue-toastification";
import { format, subDays, parseISO, isValid } from "date-fns";
import BaseBrowse from "@/components/BaseBrowse.vue";
import * as XLSX from "xlsx";
import api from "@/services/api";

const router = useRouter();
const toast = useToast();
const API_MUTASI_INTERNAL = "/mmt/mutasi-internal";

const masterData = ref<any[]>([]);
const details = ref<Record<string, any[]>>({});
const loading = reactive({ headers: true, details: false });
const loadingDetails = ref<Set<string>>(new Set());
const selected = ref<any[]>([]);
const expanded = ref<any[]>([]);

const filters = reactive({
  startDate: format(subDays(new Date(), 30), "yyyy-MM-dd"),
  endDate: format(new Date(), "yyyy-MM-dd"),
  search: "",
});

const masterHeaders = [
  {
    title: "No. Mutasi",
    key: "Nomor_Mutasi",
    minWidth: "160px",
    width: "160px",
  },
  { title: "Tanggal", key: "Tanggal", minWidth: "120px", width: "120px" },
  {
    title: "Asal",
    key: "Bagian_Asal",
    minWidth: "120px",
    width: "120px",
    align: "center",
  },
  {
    title: "Tujuan",
    key: "Bagian_Tujuan",
    minWidth: "160px",
    width: "160px",
    align: "center",
  },
  {
    title: "Total Qty Item",
    key: "Total_Qty",
    minWidth: "120px",
    width: "120px",
    align: "end",
  },
  { title: "Keterangan", key: "Keterangan", minWidth: "250px" },
];

const detailHeaders = [
  { title: "No. SPK", key: "Nomor_SPK", minWidth: "130px" },
  { title: "PO Internal", key: "No_PO_Internal", minWidth: "140px" },
  { title: "Size", key: "Size", minWidth: "80px" },
  { title: "Nama Order", key: "Nama_SPK", minWidth: "200px" },
  { title: "Komponen", key: "Nama_Komponen", minWidth: "130px" },
  { title: "Qty Mutasi", key: "Qty_Mutasi", minWidth: "100px", align: "end" },
];

const selectedRow = computed(() =>
  selected.value.length === 1 ? selected.value[0] : null,
);

const safeFormatDate = (dateString: string | undefined): string => {
  if (!dateString) return "";
  try {
    const parsedDate = parseISO(dateString);
    if (isValid(parsedDate)) return format(parsedDate, "dd/MM/yyyy");
    const parts = dateString.split("T")[0].split("-");
    if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
    return dateString;
  } catch {
    return dateString || "";
  }
};

const fetchData = async () => {
  loading.headers = true;
  try {
    const res = await api.get(API_MUTASI_INTERNAL, {
      params: {
        startDate: filters.startDate,
        endDate: filters.endDate,
        search: filters.search,
      },
    });
    masterData.value = res.data.data || [];
    selected.value = [];
    expanded.value = [];
  } catch (error) {
    toast.error("Gagal memuat data utama mutasi internal.");
  } finally {
    loading.headers = false;
  }
};

const handlePrintAction = () => {
  const nomor = selectedRow.value?.Nomor_Mutasi;
  if (!nomor) {
    toast.warning(
      "Silakan pilih dokumen mutasi yang ingin dicetak terlebih dahulu.",
    );
    return;
  }
  router.push({
    name: 'MutasiInternalMmtPrint',
    params: { nomor },
  });
};

const handleExpandUpdate = async (newlyExpandedItems: any[]) => {
  const itemToLoad = newlyExpandedItems?.find(
    (it) =>
      it &&
      !details.value[it.Nomor_Mutasi] &&
      !loadingDetails.value.has(it.Nomor_Mutasi),
  );
  if (!itemToLoad) return;

  const nomor = itemToLoad.Nomor_Mutasi;
  loadingDetails.value.add(nomor);
  try {
    const response = await api.get(
      `${API_MUTASI_INTERNAL}/detail/${encodeURIComponent(nomor)}`,
    );
    details.value[nomor] = response.data?.data ?? response.data ?? [];
  } catch (error) {
    details.value[nomor] = [];
  } finally {
    loadingDetails.value.delete(nomor);
  }
};

const isLoadingDetails = (nomor: string) => loadingDetails.value.has(nomor);

const actionSaveRedirect = (mode: "new" | "edit") => {
  if (mode === "new") {
    router.push({ name: 'MutasiInternalMmtNew' });
  } else if (selectedRow.value?.Nomor_Mutasi) {
    router.push({
      name: 'MutasiInternalMmtEdit',
      params: { nomor: selectedRow.value.Nomor_Mutasi },
    });
  }
};

const handleDelete = async () => {
  const nomor = selectedRow.value?.Nomor_Mutasi;
  if (!nomor) return;
  if (
    confirm(
      `Apakah Anda yakin ingin menghapus dokumen mutasi ${nomor}? Sisa stok bagian tujuan akan dikembalikan.`,
    )
  ) {
    try {
      await api.delete(`${API_MUTASI_INTERNAL}/${nomor}`);
      toast.success("Dokumen mutasi berhasil dihapus!");
      fetchData();
    } catch (e: any) {
      toast.error("Gagal menghapus data mutasi.");
    }
  }
};

const handleRowClick = (_event: any, row: any) => {
  const item = row?.item ?? row;
  const isSelected = selected.value.some(
    (s) => s.Nomor_Mutasi === item.Nomor_Mutasi,
  );
  selected.value = isSelected ? [] : [item];
};

const getRowProps = ({ item }: any) => {
  const isSelected = selected.value.some(
    (s) => s?.Nomor_Mutasi === item?.Nomor_Mutasi,
  );
  return { class: isSelected ? "selected-row" : "" };
};

const getBagianNama = (kode: string) => {
  if (!kode) return "SUBLIM";
  const k = kode.toUpperCase();
  switch (k) {
    case "PTG":
    case "GP001":
      return "POTONG / CUTTING";
    case "JHT":
    case "GJ001":
      return "JAHIT / SEWING";
    case "FIN":
    case "GF001":
      return "FINISHING / QC";
    case "GGD":
    case "GB001":
      return "GUDANG JADI";
    default:
      return k;
  }
};

const getBagianColor = (kode: string) => {
  if (!kode) return "grey-darken-1";
  const k = kode.toUpperCase();
  switch (k) {
    case "PTG":
    case "GP001":
      return "grey-darken-3";
    default:
      return "grey-darken-2";
  }
};

const exportToExcel = async () => {
  loading.headers = true;
  try {
    for (const header of masterData.value) {
      if (
        !details.value[header.Nomor_Mutasi] ||
        details.value[header.Nomor_Mutasi].length === 0
      ) {
        try {
          const res = await api.get(
            `${API_MUTASI_INTERNAL}/detail/${encodeURIComponent(header.Nomor_Mutasi)}`,
          );
          details.value[header.Nomor_Mutasi] = res.data?.data || res.data || [];
        } catch {
          details.value[header.Nomor_Mutasi] = [];
        }
      }
    }

    const worksheetData: any[] = [];
    worksheetData.push([
      {
        v: "LAPORAN DATA MUTASI INTERNAL",
        s: { font: { bold: true, sz: 14 } },
      },
    ]);
    worksheetData.push([
      {
        v: `Periode : ${filters.startDate} s/d ${filters.endDate}`,
        s: { font: { sz: 10 } },
      },
    ]);
    worksheetData.push([]);

    const headers = [
      { v: "NO. MUTASI" },
      { v: "TANGGAL" },
      { v: "BAGIAN ASAL" },
      { v: "BAGIAN TUJUAN" },
      { v: "KETERANGAN" },
      { v: "NOMOR SPK" },
      { v: "PO INTERNAL" },
      { v: "SIZE" },
      { v: "NAMA ORDER" },
      { v: "KOMPONEN" },
      { v: "QTY MUTASI" },
    ];
    worksheetData.push(headers);

    masterData.value.forEach((header) => {
      const targetDetails = details.value[header.Nomor_Mutasi] || [];
      if (targetDetails.length > 0) {
        targetDetails.forEach((dtl) => {
          worksheetData.push([
            { v: header.Nomor_Mutasi },
            { v: header.Tanggal },
            { v: getBagianNama(header.Bagian_Asal) },
            { v: getBagianNama(header.Bagian_Tujuan) },
            { v: header.Keterangan || "" },
            { v: dtl.Nomor_SPK || "" },
            { v: dtl.No_PO_Internal || "" },
            { v: dtl.Size || "" },
            { v: dtl.Nama_SPK || "" },
            { v: dtl.Nama_Komponen || "ALL SET" },
            { v: Number(dtl.Qty_Mutasi || 0), t: "n" },
          ]);
        });
      }
    });

    const ws = XLSX.utils.aoa_to_sheet(worksheetData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Mutasi_Internal");
    XLSX.writeFile(
      wb,
      `Laporan_Mutasi_Internal_${filters.startDate}_to_${filters.endDate}.xlsx`,
    );
    toast.success("Excel Berhasil Diunduh!");
  } catch (error) {
    toast.error("Gagal mengekspor data ke Excel.");
  } finally {
    loading.headers = false;
  }
};

watch(
  [() => filters.startDate, () => filters.endDate, () => filters.search],
  () => {
    fetchData();
  },
);

onMounted(fetchData);
</script>

<style scoped>
:deep(.detail-container),
.detail-container {
  display: flex !important;
  justify-content: flex-start !important;
  align-items: flex-start !important;
  padding: 6px 0 !important;
  background-color: transparent !important;
  border-top: none !important;
  width: 100% !important;
}
:deep(.detail-table-wrapper),
.detail-table-wrapper {
  padding: 0 !important;
  width: auto !important;
  max-width: 100% !important;
  overflow-x: auto !important;
  margin-left: 0 !important;
  margin-right: auto !important;
}
:deep(.detail-table),
.detail-table {
  background-color: white !important;
  font-size: 0.8rem !important;
  width: auto !important;
}
.color-indicator {
  width: 10px;
  height: 10px;
  display: inline-block;
}
.bg-primary {
  background-color: #1976d2 !important;
}
:deep(.selected-row),
:deep(.v-data-table__tr.selected-row),
:deep(.v-data-table__tr.selected-row > td) {
  background-color: #d8efff !important;
}
:deep(.v-data-table__tr.selected-row:hover > td) {
  background-color: #c0e4ff !important;
}
</style>
