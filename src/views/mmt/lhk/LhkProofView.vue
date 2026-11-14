<template>
  <BaseBrowse
    title="Browse Hasil Kerja Proof MMT"
    menu-id="mmt-lhk-proof"
    icon="mdi-printer-check"
    :headers="masterHeaders"
    :items="masterData"
    v-model:filtered-items="filteredMasterData"
    :can-insert="true"
    :can-edit="true"
    :can-delete="true"
    :is-loading="loading.master"
    :loading="loading.master"
    v-model:selected="selected"
    v-model:expanded="expanded"
    :filters="filters"
    @update:filters="Object.assign(filters, $event)"
    item-value="nomor"
    show-expand
    has-print
    :summary-fields="[
      'Panjang_Awal',
      'Panjang_Terpakai',
      'Sisa_Bahan',
      'Total_J_Meter',
    ]"
    @refresh="fetchMasterData"
    @add="handleCreate"
    @edit="handleEdit"
    @delete="handleDelete"
    @print="handlePrint"
    @update:expanded="loadDetails"
    @row-click="handleRowClick"
    :row-props-fn="getRowProps"
    :row-props="getRowProps"
  >
    <!-- Header Action Tombol Ekstra (ACC & Export) -->
    <template #extra-actions="{ isSingleSelected }">
      <v-btn
        size="x-small"
        color="teal-darken-1"
        :disabled="!isSingleSelected || selectedObject?.Status_Acc === 'ACC'"
        :loading="loading.acc"
        @click="handleAcc"
      >
        <v-icon start size="14">mdi-check-decagram</v-icon> ACC
      </v-btn>

      <v-divider vertical class="mx-2" />

      <v-btn
        size="x-small"
        color="success"
        :disabled="filteredMasterData.length === 0"
        @click="exportToExcel"
        :loading="loading.master"
      >
        <v-icon start size="14">mdi-file-excel</v-icon> Export Excel
      </v-btn>
    </template>

    <!-- Custom Formatter Kolom Tabel Master -->
    <template #item.Jenis="{ item }">
      <v-chip size="x-small" :color="getJenisColor(item.Jenis)" variant="tonal">
        {{ item.Jenis }}
      </v-chip>
    </template>

    <template #item.Status_Acc="{ item }">
      <v-chip
        size="x-small"
        :color="item.Status_Acc === 'ACC' ? 'success' : 'grey'"
        variant="flat"
      >
        {{ item.Status_Acc === "ACC" ? "ACC" : "DRAFT" }}
      </v-chip>
    </template>

    <!-- Sub-Tabel Detail (Expansion Row) -->
    <template #expanded-content="{ item }">
      <div class="pa-2">
        <v-card
          variant="outlined"
          title="Detail Item Proofing"
          class="custom-font"
        >
          <v-data-table
            :headers="detailHeaders"
            :items="details[item.nomor] || []"
            :loading="loadingDetails.has(item.nomor)"
            density="compact"
            hide-default-footer
            :items-per-page="-1"
            class="custom-table"
          >
            <template #item.Ukuran="{ item: detailItem }">
              {{ detailItem.Panjang }} x {{ detailItem.Lebar }}
            </template>
          </v-data-table>
        </v-card>
      </div>
    </template>
  </BaseBrowse>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, watch } from "vue";
import { useRouter } from "vue-router";
import { useToast } from "vue-toastification";
import Swal from "sweetalert2";
import BaseBrowse from "@/components/BaseBrowse.vue";
import api from "@/services/api";
import { format, subDays } from "date-fns";
import * as XLSX from "xlsx";

const router = useRouter();
const toast = useToast();

// --- State ---
const selected = ref<any[]>([]);
const expanded = ref<any[]>([]);
const masterData = ref<any[]>([]);
const filteredMasterData = ref<any[]>([]);
const details = ref<Record<string, any[]>>({});

const loading = reactive({
  master: false,
  acc: false,
});

const loadingDetails = ref<Set<string>>(new Set());

const filters = reactive({
  startDate: format(subDays(new Date(), 30), "yyyy-MM-dd"),
  endDate: format(new Date(), "yyyy-MM-dd"),
});

// --- Table Headers ---
const masterHeaders = [
  { title: "Nomor LHK", key: "nomor", width: "150px" },
  { title: "Tanggal", key: "Tanggal", width: "110px" },
  { title: "Gudang", key: "Nama_Gudang", width: "120px" },
  { title: "Jenis", key: "Jenis", width: "90px" },
  { title: "Operator", key: "Operator", width: "110px" },
  { title: "Barcode Roll", key: "Barcode_Roll", width: "130px" },
  { title: "P. Awal", key: "Panjang_Awal", align: "end", width: "90px" },
  { title: "P. Pakai", key: "Panjang_Terpakai", align: "end", width: "90px" },
  { title: "P. Sisa", key: "Sisa_Bahan", align: "end", width: "90px" },
  {
    title: "Total J_Meter",
    key: "Total_J_Meter",
    align: "end",
    width: "110px",
  },
  { title: "Status ACC", key: "Status_Acc", width: "100px" },
  { title: "Keterangan", key: "Keterangan" },
];

const detailHeaders = [
  { title: "No. Urut", key: "No_Urut", width: "80px" },
  { title: "No. SPK", key: "Nomor_SPK" },
  { title: "Nama SPK", key: "Nama_SPK" },
  { title: "Ukuran", key: "Ukuran" },
  { title: "J_Order", key: "J_Order", align: "end" as const },
  { title: "J_Proof", key: "J_Proof", align: "end" as const },
  { title: "Keterangan", key: "Keterangan" },
];

// --- Computed ---
const isSingleSelected = computed(() => selected.value.length === 1);
const selectedItem = computed(() => selected.value[0]);
const selectedObject = computed(() => {
  if (!selectedItem.value) return null;
  const nomor =
    typeof selectedItem.value === "object"
      ? selectedItem.value.nomor
      : selectedItem.value;
  return masterData.value.find((m) => m.nomor === nomor);
});

// --- Methods ---
const getJenisColor = (jenis: string) => {
  if (jenis === "MMT") return "blue";
  if (jenis === "SUBLIM") return "purple";
  if (jenis === "TEKSTIL") return "green";
  return "grey";
};

const fetchMasterData = async () => {
  loading.master = true;
  try {
    const response = await api.get("/mmt/lhk-proof", { params: filters });
    masterData.value = response.data || [];
    selected.value = [];
    expanded.value = [];
  } catch (error) {
    toast.error("Gagal mengambil data master");
  } finally {
    loading.master = false;
  }
};

const loadDetails = async (newlyExpandedItems: any[]) => {
  if (!newlyExpandedItems || newlyExpandedItems.length === 0) return;

  const lastExpanded: any = newlyExpandedItems[newlyExpandedItems.length - 1];
  const noKey =
    typeof lastExpanded === "object" ? lastExpanded.nomor : lastExpanded;

  if (noKey && !details.value[noKey]) {
    loadingDetails.value.add(noKey);
    try {
      const res = await api.get(`/mmt/lhk-proof/detail/${noKey}`);
      details.value[noKey] = res.data || [];
    } catch (e) {
      toast.error("Gagal memuat detail");
    } finally {
      loadingDetails.value.delete(noKey);
    }
  }
};

const handleRowClick = (_event: any, row: any) => {
  const item = row?.item;
  if (!item) return;
  const isAlreadySelected = selected.value.some(
    (s: any) => (s.nomor || s) === (item.nomor || item),
  );
  selected.value = isAlreadySelected ? [] : [item];
};

const getRowProps = ({ item }: { item: any }) => {
  const isSelected = selected.value.some(
    (s: any) => (s.nomor || s) === item.nomor,
  );
  return {
    class: isSelected ? "row-selected" : "",
  };
};

const handleCreate = () => {
  router.push({ name: 'LhkProofCreate' });
};

const handleEdit = () => {
  const nomor = selectedItem.value?.nomor || selectedItem.value;
  if (!nomor) return;
  router.push({
    name: 'LhkProofEdit',
    params: { nomor },
  });
};

const handleAcc = async () => {
  const nomor = selectedItem.value?.nomor || selectedItem.value;
  if (!nomor) return;

  const result = await Swal.fire({
    title: "Konfirmasi ACC LHK",
    text: `Apakah Anda yakin ingin menyetujui (ACC) LHK Proof Nomor: ${nomor}?`,
    icon: "question",
    showCancelButton: true,
    confirmButtonColor: "#00897B",
    confirmButtonText: "Ya, ACC!",
    cancelButtonText: "Batal",
  });

  if (result.isConfirmed) {
    loading.acc = true;
    try {
      await api.post(`/mmt/lhk-proof/acc/${nomor}`);
      toast.success(`LHK ${nomor} berhasil di-ACC.`);
      fetchMasterData();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Gagal memproses ACC LHK.");
    } finally {
      loading.acc = false;
    }
  }
};

const handleDelete = async () => {
  const nomor = selectedItem.value?.nomor || selectedItem.value;
  if (!nomor) return;

  const result = await Swal.fire({
    title: "Yakin ingin hapus?",
    text: `Data LHK Proof Nomor: ${nomor} akan dihapus permanen.`,
    icon: "warning",
    showCancelButton: true,
    confirmButtonColor: "#d33",
    confirmButtonText: "Ya, Hapus!",
    cancelButtonText: "Batal",
  });

  if (result.isConfirmed) {
    try {
      await api.delete(`/mmt/lhk-proof/${nomor}`);
      toast.success("Berhasil dihapus.");
      fetchMasterData();
    } catch (e) {
      toast.error("Gagal menghapus data.");
    }
  }
};

const handlePrint = () => {
  const nomor = selectedItem.value?.nomor || selectedItem.value;
  if (!nomor) return;
  toast.info(`Mencetak slip ${nomor}...`);
  window.open(`/api/report/lhk-proof-slip/${nomor}`, "_blank");
};

onMounted(() => {
  fetchMasterData();
});

watch(
  () => [filters.startDate, filters.endDate],
  () => fetchMasterData(),
);

// --- EXPORT LOGIC ---
const exportToExcel = async () => {
  loading.master = true;
  try {
    for (const header of filteredMasterData.value) {
      if (
        !details.value[header.nomor] ||
        details.value[header.nomor].length === 0
      ) {
        try {
          const res = await api.get(`/mmt/lhk-proof/detail/${header.nomor}`);
          details.value[header.nomor] = res.data || [];
        } catch (e) {
          console.error(
            `Gagal pre-fetch detail proof nomor ${header.nomor}:`,
            e,
          );
          details.value[header.nomor] = [];
        }
      }
    }

    const fileName = `LHK_Proof_MMT_${filters.startDate}_to_${filters.endDate}.xlsx`;

    const num = (value: any) => {
      const parsed = Number(value);
      return isNaN(parsed) ? 0 : parsed;
    };

    const styleHeaderMain = {
      fill: { fgColor: { rgb: "B3E5FC" } },
      font: { bold: true, color: { rgb: "000000" }, sz: 10 },
      alignment: { horizontal: "center", vertical: "center", wrapText: true },
      border: {
        top: { style: "thin", color: { rgb: "000000" } },
        bottom: { style: "thin", color: { rgb: "000000" } },
        left: { style: "thin", color: { rgb: "000000" } },
        right: { style: "thin", color: { rgb: "000000" } },
      },
    };

    const styleDataCell = {
      font: { sz: 10 },
      border: {
        top: { style: "thin", color: { rgb: "000000" } },
        bottom: { style: "thin", color: { rgb: "000000" } },
        left: { style: "thin", color: { rgb: "000000" } },
        right: { style: "thin", color: { rgb: "000000" } },
      },
      alignment: { vertical: "center" },
    };

    const styleDataCellCenter = {
      ...styleDataCell,
      alignment: { horizontal: "center", vertical: "center" },
    };

    const styleDataCellRight = {
      ...styleDataCell,
      alignment: { horizontal: "right", vertical: "center" },
    };

    const styleFooter = {
      ...styleDataCell,
      fill: { fgColor: { rgb: "F0F4F8" } },
      font: { bold: true, sz: 10 },
    };

    const formatTglManual = (dateStr: string) => {
      if (!dateStr) return "-";
      try {
        if (dateStr.includes("-")) {
          const parts = dateStr.split("T")[0].split("-");
          if (parts.length === 3) {
            return `${parts[2]}/${parts[1]}/${parts[0]}`;
          }
        }
        return dateStr;
      } catch {
        return dateStr;
      }
    };

    const worksheetData: any[] = [];
    worksheetData.push([
      {
        v: "LAPORAN HASIL KERJA PROOF MMT",
        s: { font: { bold: true, sz: 14 } },
      },
    ]);
    worksheetData.push([
      {
        v: `Periode : ${formatTglManual(filters.startDate)} s/d ${formatTglManual(filters.endDate)}`,
        s: { font: { sz: 10 } },
      },
    ]);
    worksheetData.push([]);

    const headersTable = [
      { v: "NOMOR LHK", s: styleHeaderMain },
      { v: "TANGGAL", s: styleHeaderMain },
      { v: "GUDANG", s: styleHeaderMain },
      { v: "JENIS", s: styleHeaderMain },
      { v: "KETERANGAN MASTER", s: styleHeaderMain },
      { v: "NO URUT", s: styleHeaderMain },
      { v: "NOMOR SPK", s: styleHeaderMain },
      { v: "NAMA SPK / ORDER", s: styleHeaderMain },
      { v: "UKURAN (PxL)", s: styleHeaderMain },
      { v: "J_ORDER", s: styleHeaderMain },
      { v: "J_PROOF", s: styleHeaderMain },
      { v: "KETERANGAN DETAIL", s: styleHeaderMain },
    ];
    worksheetData.push(headersTable);

    let grandTotalOrder = 0;
    let grandTotalProof = 0;

    filteredMasterData.value.forEach((header) => {
      const targetDetails = details.value[header.nomor] || [];
      const tglHeader = formatTglManual(header.Tanggal || "");

      if (targetDetails.length > 0) {
        targetDetails.forEach((dtl, index) => {
          const isFirstRow = index === 0;
          const ukuranText =
            dtl.Panjang && dtl.Lebar ? `${dtl.Panjang} x ${dtl.Lebar}` : "-";

          const valOrder = num(dtl.J_Order);
          const valProof = num(dtl.J_Proof);

          grandTotalOrder += valOrder;
          grandTotalProof += valProof;

          worksheetData.push([
            { v: isFirstRow ? header.nomor : "-", s: styleDataCellCenter },
            { v: isFirstRow ? tglHeader : "-", s: styleDataCellCenter },
            {
              v: isFirstRow ? header.Nama_Gudang || "-" : "-",
              s: styleDataCell,
            },
            {
              v: isFirstRow ? header.Jenis || "-" : "-",
              s: styleDataCellCenter,
            },
            {
              v: isFirstRow ? header.Keterangan || "-" : "-",
              s: styleDataCell,
            },
            { v: dtl.No_Urut || index + 1, s: styleDataCellCenter },
            { v: dtl.Nomor_SPK || "-", s: styleDataCellCenter },
            { v: dtl.Nama_SPK || "-", s: styleDataCell },
            { v: ukuranText, s: styleDataCellCenter },
            { v: valOrder, t: "n", z: "#,##0", s: styleDataCellRight },
            { v: valProof, t: "n", z: "#,##0", s: styleDataCellRight },
            { v: dtl.Keterangan || "-", s: styleDataCell },
          ]);
        });
      } else {
        worksheetData.push([
          { v: header.nomor, s: styleDataCellCenter },
          { v: tglHeader, s: styleDataCellCenter },
          { v: header.Nama_Gudang || "-", s: styleDataCell },
          { v: header.Jenis || "-", s: styleDataCellCenter },
          { v: header.Keterangan || "-", s: styleDataCell },
          { v: "-", s: styleDataCellCenter },
          { v: "-", s: styleDataCellCenter },
          { v: "Tidak ada data detail proofing", s: styleDataCell },
          { v: "-", s: styleDataCellCenter },
          { v: 0, t: "n", z: "#,##0", s: styleDataCellRight },
          { v: 0, t: "n", z: "#,##0", s: styleDataCellRight },
          { v: "-", s: styleDataCell },
        ]);
      }
    });

    const footerRow = [
      {
        v: "GRAND TOTAL",
        s: { ...styleFooter, alignment: { horizontal: "right" } },
      },
      ...Array(8).fill({ v: "", s: styleFooter }),
      {
        v: grandTotalOrder,
        t: "n",
        z: "#,##0",
        s: { ...styleFooter, alignment: { horizontal: "right" } },
      },
      {
        v: grandTotalProof,
        t: "n",
        z: "#,##0",
        s: { ...styleFooter, alignment: { horizontal: "right" } },
      },
      { v: "", s: styleFooter },
    ];
    worksheetData.push(footerRow);

    const ws = XLSX.utils.aoa_to_sheet(worksheetData);

    ws["!merges"] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 11 } },
      {
        s: { r: worksheetData.length - 1, c: 0 },
        e: { r: worksheetData.length - 1, c: 8 },
      },
    ];

    ws["!cols"] = [
      { wch: 22 },
      { wch: 12 },
      { wch: 20 },
      { wch: 10 },
      { wch: 25 },
      { wch: 8 },
      { wch: 18 },
      { wch: 35 },
      { wch: 15 },
      { wch: 12 },
      { wch: 12 },
      { wch: 25 },
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "LHK_Proof");
    XLSX.writeFile(wb, fileName);
    toast.success("Excel Hasil Kerja Proof berhasil diunduh");
  } catch (error) {
    console.error("Export Error:", error);
    toast.error("Gagal mengekspor data ke Excel.");
  } finally {
    loading.master = false;
  }
};
</script>

<style scoped>
.custom-font {
  font-size: 11px !important;
}

.custom-table :deep(th),
.custom-table :deep(td) {
  font-size: 11px !important;
}

.row-selected {
  background-color: #d8efff !important;
}
:deep(.row-selected td) {
  background-color: #d8efff !important;
}
</style>
