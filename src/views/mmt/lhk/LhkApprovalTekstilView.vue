<template>
  <BaseBrowse
    title="LHK Approval Tekstil"
    icon="mdi-factory"
    menu-id="5510"
    :headers="masterHeaders"
    :items="filteredMasterData"
    :can-insert="true"
    :can-edit="true"
    :can-delete="canDelete"
    :is-loading="loading.master"
    :loading="loading.master"
    :search="filters.search"
    item-value="Nomor"
    v-model:selected="selected"
    v-model:expanded="expanded"
    :filters="filters"
    @update:filters="Object.assign(filters, $event)"
    show-expand
    has-print
    @refresh="fetchMasterData"
    @add="handleCreate"
    @edit="handleEdit"
    @delete="handleDelete"
    @print="handlePrint"
    @update:expanded="handleExpandUpdate"
    @row-click="handleRowClick"
    :row-props-fn="getRowProps"
    :row-props="getRowProps"
  >
    <!-- Action Buttons Tambahan di Header Toolbar -->
    <template #extra-actions>
      <v-btn
        size="small"
        color="secondary"
        :disabled="!isSingleSelected"
        @click="handleBahan"
      >
        <v-icon start size="14">mdi-package-variant</v-icon> Bahan
      </v-btn>

      <v-btn
        size="small"
        color="success"
        :disabled="filteredMasterData.length === 0"
        @click="exportToExcel"
        :loading="loading.master"
      >
        <v-icon start size="14">mdi-file-excel</v-icon> Export Excel
      </v-btn>
    </template>

    <!-- Custom Formatter Tanggal dd/MM/yyyy -->
    <template #item.Tanggal="{ item }">
      <span>{{ safeFormatDate(item.Tanggal) }}</span>
    </template>

    <!-- Hapus class teks merah, biarkan warna default -->
    <template #item.Nomor="{ item }">
      <span>
        {{ item.Nomor }}
      </span>
    </template>

    <template #item.Total_Meter="{ value }">
      <span class="font-weight-bold">
        {{ Number(value || 0).toFixed(2) }} m
      </span>
    </template>

    <!-- Sub-Tabel Detail (Expansion Row) -->
    <template #expanded-row="{ columns, item }">
      <tr>
        <td :colspan="columns.length" class="pa-0">
          <div class="detail-container pa-4 bg-grey-lighten-4">
            <div class="detail-table-wrapper">
              <div
                v-if="loadingDetails.has(item.Nomor)"
                class="text-center pa-4 text-caption text-grey"
              >
                <v-progress-circular
                  indeterminate
                  size="20"
                  color="primary"
                  class="mr-2"
                />
                Memuat detail pekerjaan...
              </div>

              <v-data-table
                v-else-if="details[item.Nomor] && details[item.Nomor].length"
                :headers="detailHeaders"
                :items="details[item.Nomor]"
                density="compact"
                class="detail-table elevation-1 rounded bg-white"
                :items-per-page="-1"
                hide-default-footer
              >
                <template #item.Panjang="{ value }">
                  {{
                    Number(value ?? 0).toLocaleString("id-ID", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })
                  }}
                </template>
                <template #item.Lebar="{ value }">
                  {{
                    Number(value ?? 0).toLocaleString("id-ID", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })
                  }}
                </template>

                <template #item.Jumlah_SPK="{ value }">
                  <div class="text-right">
                    {{ Number(value || 0).toLocaleString("id-ID") }}
                  </div>
                </template>

                <template #item.Warna>
                  <div class="d-flex ga-1">
                    <v-chip
                      size="x-small"
                      color="cyan"
                      variant="flat"
                      text="C"
                      style="font-size: 9px"
                    />
                    <v-chip
                      size="x-small"
                      color="magenta"
                      variant="flat"
                      text="M"
                      style="font-size: 9px"
                    />
                    <v-chip
                      size="x-small"
                      color="yellow"
                      variant="flat"
                      text="Y"
                      style="font-size: 9px"
                    />
                    <v-chip
                      size="x-small"
                      color="black"
                      variant="flat"
                      text="K"
                      style="font-size: 9px"
                    />
                  </div>
                </template>

                <template #item.Jml_Cetak="{ value }">
                  <div class="text-right">
                    {{ Number(value || 0).toLocaleString("id-ID") }}
                  </div>
                </template>
              </v-data-table>

              <div v-else class="text-center pa-4 text-caption text-grey">
                Tidak ada data detail pekerjaan untuk nomor {{ item.Nomor }}.
              </div>
            </div>
          </div>
        </td>
      </tr>
    </template>
  </BaseBrowse>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, watch } from "vue";
import { useRouter } from "vue-router";
import { useToast } from "vue-toastification";
import api from "@/services/api";
import { format, subDays, parseISO } from "date-fns";
import * as XLSX from "xlsx";
import BaseBrowse from "@/components/BaseBrowse.vue";
import { useAuthStore } from "@/stores/authStore";

const router = useRouter();
const toast = useToast();
const authStore = useAuthStore();

const canDelete = computed(() => {
  const u = authStore.user as any;
  const code = String(u?.kode || u?.kdUser || u?.username || "").toUpperCase();
  const role = String(u?.role || u?.level || u?.bagian || "").toUpperCase();
  const isAdmin = code === "ADMIN" || role === "ADMIN";
  return (
    isAdmin ||
    authStore.can("1292", "delete") ||
    authStore.can("5510", "delete")
  );
});

const selected = ref<any[]>([]);
const expanded = ref<any[]>([]);
const masterData = ref<any[]>([]);
const details = ref<Record<string, any[]>>({});
const loading = reactive({ master: false });
const loadingDetails = ref<Set<string>>(new Set());

const filters = reactive({
  startDate: format(subDays(new Date(), 30), "yyyy-MM-dd"),
  endDate: format(new Date(), "yyyy-MM-dd"),
  search: "",
});

const masterHeaders = [
  { title: "Nomor", key: "Nomor", minWidth: "180px", fixed: true },
  { title: "Tanggal", key: "Tanggal", minWidth: "120px" },
  { title: "Gudang", key: "Nama_Gudang", minWidth: "180px" },
  { title: "Shift", key: "Shift", minWidth: "80px" },
  { title: "Cetak (m)", key: "Total_Meter", align: "end", minWidth: "120px" },
];

const detailHeaders: any[] = [
  { title: "Mesin", key: "Mesin", minWidth: "120px" },
  { title: "SPK", key: "Nomor_SPK", minWidth: "150px" },
  { title: "Nama SPK", key: "Nama_SPK", minWidth: "250px" },
  { title: "Jumlah SPK", key: "Jumlah_SPK", align: "end", minWidth: "110px" },
  { title: "Panjang", key: "Panjang", align: "end", minWidth: "90px" },
  { title: "Lebar", key: "Lebar", align: "end", minWidth: "90px" },
  { title: "Jml Cetak", key: "Jml_Cetak", align: "end", minWidth: "120px" },
  { title: "Bahan", key: "Nama", minWidth: "150px" },
  { title: "Warna (CMYK)", key: "Warna", sortable: false, minWidth: "120px" },
];

const isSingleSelected = computed(() => selected.value.length === 1);
const selectedItem = computed(() => selected.value[0]);

const filteredMasterData = computed(() => {
  if (!filters.search) return masterData.value;
  const kw = filters.search.toLowerCase();
  return (masterData.value || []).filter(
    (item) =>
      (item.Nomor && item.Nomor.toLowerCase().includes(kw)) ||
      (item.Nama_Gudang && item.Nama_Gudang.toLowerCase().includes(kw)) ||
      (item.Shift && String(item.Shift).toLowerCase().includes(kw)),
  );
});

// --- Helper Format Tanggal dd/MM/yyyy ---
const safeFormatDate = (dateString: string | undefined): string => {
  if (!dateString) return "-";
  try {
    if (dateString.includes("-") && dateString.length === 10) {
      const parts = dateString.split("-");
      if (parts.length === 3 && parts[0].length === 2) {
        return `${parts[0]}/${parts[1]}/${parts[2]}`;
      }
      if (parts.length === 3 && parts[0].length === 4) {
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
      }
    }
    const cleanDate = dateString.split("T")[0];
    if (cleanDate.includes("-")) {
      const parts = cleanDate.split("-");
      if (parts.length === 3) {
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
      }
    }
    return format(parseISO(dateString), "dd/MM/yyyy");
  } catch {
    return dateString || "-";
  }
};

const fetchMasterData = async () => {
  loading.master = true;
  selected.value = [];
  expanded.value = [];
  try {
    const response = await api.get("/mmt/lhk-tekstil-mmt/approval-list", {
      params: filters,
    });

    const rawData = response.data || [];
    masterData.value = rawData.map((item: any) => ({
      ...item,
      Tanggal: safeFormatDate(item.Tanggal),
    }));
  } catch (error) {
    toast.error("Gagal mengambil data master");
  } finally {
    loading.master = false;
  }
};

const handleExpandUpdate = async (expandedKeys: any[]) => {
  const lastItem = expandedKeys[expandedKeys.length - 1];
  if (!lastItem) return;

  const lastExpandedNomor =
    typeof lastItem === "object" ? lastItem.Nomor : lastItem;
  if (!lastExpandedNomor || details.value[lastExpandedNomor]) return;

  loadingDetails.value.add(lastExpandedNomor);
  try {
    const res = await api.get(
      `mmt/lhk-tekstil-mmt/approval/${lastExpandedNomor}`,
    );
    if (res.data?.success && res.data?.data) {
      details.value[lastExpandedNomor] = res.data.data.details || [];
    } else {
      details.value[lastExpandedNomor] = res.data?.details || res.data || [];
    }
  } catch (e) {
    console.error("Detail error:", e);
    toast.error("Gagal memuat detail");
  } finally {
    loadingDetails.value.delete(lastExpandedNomor);
  }
};

const handleRowClick = (_event: any, row: any) => {
  const itemData = row.item?.raw || row.item || row;
  if (!itemData || !itemData.Nomor) return;

  selected.value = selected.value.some((s: any) => s.Nomor === itemData.Nomor)
    ? []
    : [itemData];
};

const getRowProps = ({ item }: any) => {
  const itemData = item?.raw || item;
  return {
    class: selected.value.some((s: any) => s.Nomor === itemData?.Nomor)
      ? "row-selected cursor-pointer"
      : "cursor-pointer",
  };
};

const handleCreate = () => {
  router.push({ name: 'LhkApprovalTekstilCreate' });
};

const handleEdit = () => {
  if (!selectedItem.value?.Nomor) {
    toast.warning("Silahkan pilih baris data terlebih dahulu.");
    return;
  }
  router.push({
    name: 'LhkApprovalTekstilEdit',
    params: { nomor: selectedItem.value.Nomor },
  });
};

const handleBahan = () => {
  if (!selectedItem.value?.Nomor) return;
  toast.info("Fitur rincian pemakaian bahan tekstil sedang disiapkan.");
};
const handleDelete = async (item?: any) => {
  if (!canDelete.value) {
    toast.error("Akses ditolak: Anda tidak memiliki izin untuk menghapus data.");
    return;
  }
  const target = item || selectedItem.value;
  const nomor = target?.Nomor || target;
  if (!nomor) return;
  if (confirm(`Yakin ingin menghapus LHK nomor ${nomor}?`)) {
    try {
      await api.delete(`/mmt/lhk-tekstil-mmt/${encodeURIComponent(nomor)}`);
      toast.success("Berhasil dihapus.");
      fetchMasterData();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Gagal Hapus.");
    }
  }
};

const handlePrint = () => {
  if (!selectedItem.value?.Nomor) return;
  const nomor = selectedItem.value.Nomor;
  toast.info(`Mencetak slip untuk ${nomor}...`);
  window.open(`/api/report/lhk-slip/${nomor}`, "_blank");
};

// --- EXPORT EXCEL ---
const exportToExcel = async () => {
  loading.master = true;
  try {
    const listToProcess = filteredMasterData.value;
    if (listToProcess.length === 0) {
      toast.warning("Tidak ada data untuk diekspor.");
      return;
    }

    const fetchPromises = listToProcess.map(async (header) => {
      if (
        !details.value[header.Nomor] ||
        details.value[header.Nomor].length === 0
      ) {
        try {
          const res = await api.get(
            `mmt/lhk-tekstil-mmt/approval/${header.Nomor}`,
          );
          if (res.data?.success && res.data?.data?.details) {
            details.value[header.Nomor] = res.data.data.details;
          } else if (res.data?.data) {
            details.value[header.Nomor] = Array.isArray(res.data.data)
              ? res.data.data
              : res.data.data.details || [];
          } else if (res.data?.details) {
            details.value[header.Nomor] = res.data.details;
          } else {
            details.value[header.Nomor] = Array.isArray(res.data)
              ? res.data
              : [];
          }
        } catch (e) {
          details.value[header.Nomor] = [];
        }
      }
    });

    await Promise.all(fetchPromises);

    const fileName = `LHK_Approval_Tekstil_${filters.startDate}_to_${filters.endDate}.xlsx`;

    const parseNum = (val: any): number => {
      if (val === null || val === undefined || val === "") return 0;
      const parsed = Number(val);
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

    const worksheetData: any[] = [];
    worksheetData.push([
      {
        v: "DAFTAR APPROVAL HASIL KERJA TEKSTIL MMT (HEADER & DETAIL)",
        s: { font: { bold: true, sz: 14 } },
      },
    ]);
    worksheetData.push([
      {
        v: `Periode : ${safeFormatDate(filters.startDate)} s/d ${safeFormatDate(filters.endDate)}`,
        s: { font: { sz: 10 } },
      },
    ]);
    worksheetData.push([]);

    const headers = [
      { v: "NOMOR APPROVAL", s: styleHeaderMain },
      { v: "TANGGAL", s: styleHeaderMain },
      { v: "NAMA GUDANG", s: styleHeaderMain },
      { v: "SHIFT", s: styleHeaderMain },
      { v: "TOTAL METER (MASTER)", s: styleHeaderMain },
      { v: "MESIN", s: styleHeaderMain },
      { v: "NOMOR SPK", s: styleHeaderMain },
      { v: "NAMA SPK / ORDER", s: styleHeaderMain },
      { v: "JUMLAH SPK", s: styleHeaderMain },
      { v: "PANJANG", s: styleHeaderMain },
      { v: "LEBAR", s: styleHeaderMain },
      { v: "QTY CETAK DETAIL", s: styleHeaderMain },
      { v: "NAMA BAHAN", s: styleHeaderMain },
    ];
    worksheetData.push(headers);

    let grandTotalMeterMaster = 0;
    let grandTotalJmlSpkDetail = 0;
    let grandTotalQtyDetail = 0;

    listToProcess.forEach((header) => {
      const targetDetails = details.value[header.Nomor] || [];
      const tglHeader = safeFormatDate(header.Tanggal || "");
      const totalMeterVal = parseNum(
        header.Total_Meter ?? header.Cetak ?? header.jumlah_meter,
      );

      if (targetDetails.length > 0) {
        targetDetails.forEach((dtl, index) => {
          const isFirstRow = index === 0;
          const jumlahSpkVal = parseNum(dtl.Jumlah_SPK ?? dtl.jumlah_spk);
          const panjangVal = parseNum(dtl.Panjang ?? dtl.panjang);
          const lebarVal = parseNum(dtl.Lebar ?? dtl.lebar);
          const detailCetakQty = parseNum(
            dtl.Jml_Cetak ?? dtl.jumlah_cetak ?? dtl.Qty,
          );

          if (isFirstRow) {
            grandTotalMeterMaster += totalMeterVal;
          }
          grandTotalJmlSpkDetail += jumlahSpkVal;
          grandTotalQtyDetail += detailCetakQty;

          worksheetData.push([
            { v: isFirstRow ? header.Nomor : "-", s: styleDataCellCenter },
            { v: isFirstRow ? tglHeader : "-", s: styleDataCellCenter },
            {
              v: isFirstRow ? header.Nama_Gudang || "-" : "-",
              s: styleDataCell,
            },
            {
              v: isFirstRow ? header.Shift || "-" : "-",
              s: styleDataCellCenter,
            },
            isFirstRow
              ? {
                  v: totalMeterVal,
                  t: "n",
                  z: "#,##0.00",
                  s: styleDataCellRight,
                }
              : { v: "-", s: styleDataCellCenter },
            { v: dtl.Mesin || "-", s: styleDataCellCenter },
            { v: dtl.Nomor_SPK || dtl.spk || "-", s: styleDataCellCenter },
            { v: dtl.Nama_SPK || dtl.Nama || "-", s: styleDataCell },
            { v: jumlahSpkVal, t: "n", z: "#,##0", s: styleDataCellRight },
            { v: panjangVal, t: "n", z: "#,##0.00", s: styleDataCellRight },
            { v: lebarVal, t: "n", z: "#,##0.00", s: styleDataCellRight },
            { v: detailCetakQty, t: "n", z: "#,##0", s: styleDataCellRight },
            { v: dtl.Nama || dtl.Bahan || "-", s: styleDataCell },
          ]);
        });
      } else {
        grandTotalMeterMaster += totalMeterVal;
        worksheetData.push([
          { v: header.Nomor, s: styleDataCellCenter },
          { v: tglHeader, s: styleDataCellCenter },
          { v: header.Nama_Gudang || "-", s: styleDataCell },
          { v: header.Shift || "-", s: styleDataCellCenter },
          { v: totalMeterVal, t: "n", z: "#,##0.00", s: styleDataCellRight },
          { v: "-", s: styleDataCellCenter },
          { v: "-", s: styleDataCellCenter },
          { v: "Tidak ada data detail pengerjaan", s: styleDataCell },
          { v: 0, t: "n", z: "#,##0", s: styleDataCellRight },
          { v: 0, t: "n", z: "#,##0.00", s: styleDataCellRight },
          { v: 0, t: "n", z: "#,##0.00", s: styleDataCellRight },
          { v: 0, t: "n", z: "#,##0", s: styleDataCellRight },
          { v: "-", s: styleDataCell },
        ]);
      }
    });

    const footerRow = [
      {
        v: "GRAND TOTAL",
        s: {
          ...styleFooter,
          alignment: { horizontal: "right", vertical: "center" },
        },
      },
      { v: "", s: styleFooter },
      { v: "", s: styleFooter },
      { v: "", s: styleFooter },
      {
        v: grandTotalMeterMaster,
        t: "n",
        z: "#,##0.00",
        s: {
          ...styleFooter,
          alignment: { horizontal: "right", vertical: "center" },
        },
      },
      { v: "", s: styleFooter },
      { v: "", s: styleFooter },
      { v: "", s: styleFooter },
      {
        v: grandTotalJmlSpkDetail,
        t: "n",
        z: "#,##0",
        s: {
          ...styleFooter,
          alignment: { horizontal: "right", vertical: "center" },
        },
      },
      { v: "", s: styleFooter },
      { v: "", s: styleFooter },
      {
        v: grandTotalQtyDetail,
        t: "n",
        z: "#,##0",
        s: {
          ...styleFooter,
          alignment: { horizontal: "right", vertical: "center" },
        },
      },
      { v: "", s: styleFooter },
    ];
    worksheetData.push(footerRow);

    const ws = XLSX.utils.aoa_to_sheet(worksheetData);
    ws["!merges"] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 12 } },
      {
        s: { r: worksheetData.length - 1, c: 0 },
        e: { r: worksheetData.length - 1, c: 3 },
      },
    ];

    ws["!cols"] = [
      { wch: 22 },
      { wch: 12 },
      { wch: 20 },
      { wch: 8 },
      { wch: 22 },
      { wch: 10 },
      { wch: 18 },
      { wch: 35 },
      { wch: 14 },
      { wch: 12 },
      { wch: 12 },
      { wch: 15 },
      { wch: 20 },
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "LHK_Approval_Tekstil");
    XLSX.writeFile(wb, fileName);
    toast.success("Excel Approval berhasil diunduh!");
  } catch (error) {
    console.error("Export Error:", error);
    toast.error("Gagal mengekspor data approval ke Excel.");
  } finally {
    loading.master = false;
  }
};

watch([() => filters.startDate, () => filters.endDate], fetchMasterData);

onMounted(() => {
  fetchMasterData();
});
</script>

<style scoped>
.font-weight-bold {
  font-weight: bold !important;
}
.row-selected {
  background-color: #d8efff !important;
}
:deep(.row-selected td) {
  background-color: #d8efff !important;
}
</style>
