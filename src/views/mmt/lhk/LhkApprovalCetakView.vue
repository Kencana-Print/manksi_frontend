<script setup lang="ts">
import { ref, computed } from "vue";
import { useRouter } from "vue-router";
import { useToast } from "vue-toastification";
import BaseBrowse from "@/components/BaseBrowse.vue";
import { useBrowse } from "@/composables/useBrowse";
import { IconPhoto, IconPrinter, IconFileSpreadsheet } from "@tabler/icons-vue";
import api from "@/services/api";
import { formatTanggal } from "@/utils/dateFormat";
import * as XLSX from "xlsx-js-style";

const router = useRouter();
const toast = useToast();

const getStartOfMonth = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
};
const getToday = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const startDate = ref(getStartOfMonth());
const endDate = ref(getToday());
const selectedMesin = ref<string[]>([]);
const listMesin = ["MT01", "MT02", "MT03", "MT04", "MT05"];

const headers = [
  { title: "Nomor LHK", key: "Nomor", width: "170px" },
  { title: "Tanggal", key: "Tanggal", width: "110px", align: "center" as const },
  { title: "Shift", key: "Shift", width: "70px", align: "center" as const },
  { title: "Operator", key: "Operator", width: "140px" },
  { title: "Mesin", key: "Mesin", width: "100px", align: "center" as const },
  { title: "Gudang", key: "Nama_Gudang", width: "130px" },
  { title: "Total (m²)", key: "cetak_meter", width: "110px", align: "end" as const },
  { title: "Lengkap", key: "Lengkap", width: "95px", align: "center" as const },
];

const detailHeaders = [
  { title: "Mesin", key: "Mesin", width: "90px" },
  { title: "Nomor SPK", key: "Nomor_SPK", width: "140px" },
  { title: "Nama Order", key: "Nama_SPK", minWidth: "200px" },
  { title: "Panjang", key: "Panjang", width: "80px", align: "end" as const },
  { title: "Lebar", key: "Lebar", width: "80px", align: "end" as const },
  { title: "Jml Order", key: "Jml_Order", width: "90px", align: "end" as const },
  { title: "Qty Cetak", key: "Jml_Cetak", width: "90px", align: "end" as const },
  { title: "Total (m²)", key: "m2_cetak", width: "100px", align: "end" as const },
  { title: "Operator", key: "Operator", width: "120px" },
];

const {
  items,
  isLoading,
  selected,
  canInsert,
  canEdit,
  canDelete,
  canExport,
  fetchData,
} = useBrowse<any>({
  menuId: "5508",
  fetchApi: async () => {
    const res = await api.get("/mmt/lhk/cetak-mmt", {
      params: {
        startDate: startDate.value,
        endDate: endDate.value,
        mesin: selectedMesin.value.length > 0 ? selectedMesin.value.join(",") : undefined,
      },
    });
    return Array.isArray(res.data) ? res.data : (res.data?.data || []);
  },
});

const getItemNomor = (item: any): string => {
  if (!item) return "";
  if (typeof item === "string") return item;
  const raw = item.raw || item;
  return raw.Nomor || raw.lnomor || "";
};

const selectedItem = computed(() => {
  if (!selected.value || selected.value.length !== 1) return null;
  return selected.value[0]?.raw || selected.value[0];
});

// --- EXPAND LOGIC (RINCIAN DETAIL SPK PER LHK) ---
const expanded = ref<any[]>([]);
const detailCache = ref<Record<string, any[]>>({});
const loadingDetails = ref<Record<string, boolean>>({});

const getItemDetails = (item: any): any[] => {
  const nomor = getItemNomor(item);
  return detailCache.value[nomor] || [];
};

const onUpdateExpanded = async (newExpanded: any[]) => {
  expanded.value = newExpanded;
  for (const it of newExpanded) {
    const nomor = getItemNomor(it);
    if (!nomor) continue;
    if (detailCache.value[nomor] && detailCache.value[nomor].length > 0) continue;
    if (loadingDetails.value[nomor]) continue;

    loadingDetails.value = { ...loadingDetails.value, [nomor]: true };
    try {
      const res = await api.get(`/mmt/lhk-cetak-mmt/detail/${encodeURIComponent(nomor)}`, {
        params: {
          mesin: selectedMesin.value.length > 0 ? selectedMesin.value.join(",") : undefined,
        },
      });
      const d = res.data?.data || res.data || [];
      detailCache.value = {
        ...detailCache.value,
        [nomor]: Array.isArray(d) ? d : [],
      };
    } catch (err) {
      console.error(`Gagal load detail LHK ${nomor}:`, err);
      detailCache.value = { ...detailCache.value, [nomor]: [] };
    } finally {
      loadingDetails.value = { ...loadingDetails.value, [nomor]: false };
    }
  }
};

const handleNew = () => {
  router.push("/mmt/lhk/cetak-mmt/create");
};

const handleEdit = (item?: any) => {
  const target = item || selectedItem.value;
  const nomor = getItemNomor(target);
  if (!nomor) {
    toast.warning("Pilih data LHK yang akan diubah.");
    return;
  }
  router.push(`/mmt/lhk/cetak-mmt/edit/${encodeURIComponent(nomor)}`);
};

const handleDelete = async (item?: any) => {
  const target = item || selectedItem.value;
  const nomor = getItemNomor(target);
  if (!nomor) {
    toast.warning("Pilih data LHK yang akan dihapus.");
    return;
  }
  if (!confirm(`Hapus data LHK Approval Cetak ${nomor}?`)) return;
  try {
    await api.delete(`/mmt/lhk-cetak-mmt/${encodeURIComponent(nomor)}`);
    toast.success(`LHK Approval Cetak ${nomor} berhasil dihapus.`);
    fetchData();
  } catch (err: any) {
    toast.error(err.response?.data?.message || "Gagal menghapus data LHK.");
  }
};

// --- Export Excel Logic (Sesuai Format MMT) ---
const handleExportExcel = async () => {
  try {
    const payload = {
      startDate: startDate.value,
      endDate: endDate.value,
      mesin: selectedMesin.value.length > 0 ? selectedMesin.value.join(",") : undefined,
    };

    const res = await api.get("/mmt/lhk-cetak-mmt/export", { params: payload });
    const rawData = res.data && res.data.data ? res.data.data : [];

    if (rawData.length === 0) {
      toast.warning("Tidak ada data untuk diekspor");
      return;
    }

    const fileName = `Laporan_Hasil_Kerja_Approval_Cetak_MMT_${startDate.value}_sd_${endDate.value}.xlsx`;

    const parseNum = (val: any): number => {
      if (val === null || val === undefined || val === "") return 0;
      const parsed = Number(val);
      return isNaN(parsed) ? 0 : parsed;
    };

    const styleHeaderMain = {
      fill: { fgColor: { rgb: "D9E1F2" } },
      font: { bold: true, color: { rgb: "000000" }, sz: 11, name: "Calibri" },
      alignment: { horizontal: "center", vertical: "center", wrapText: true },
      border: {
        top: { style: "thin", color: { rgb: "BFBFBF" } },
        bottom: { style: "thin", color: { rgb: "BFBFBF" } },
        left: { style: "thin", color: { rgb: "BFBFBF" } },
        right: { style: "thin", color: { rgb: "BFBFBF" } },
      },
    };

    const styleDataCell = {
      font: { sz: 11, name: "Calibri" },
      border: {
        top: { style: "thin", color: { rgb: "BFBFBF" } },
        bottom: { style: "thin", color: { rgb: "BFBFBF" } },
        left: { style: "thin", color: { rgb: "BFBFBF" } },
        right: { style: "thin", color: { rgb: "BFBFBF" } },
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

    const worksheetData: any[] = [];
    worksheetData.push([
      {
        v: "LAPORAN HASIL KERJA APPROVAL CETAK MMT",
        s: { font: { bold: true, sz: 14, name: "Calibri" } },
      },
    ]);
    worksheetData.push([
      {
        v: `Tanggal : ${formatTanggal(startDate.value)} s.d ${formatTanggal(endDate.value)}`,
        s: { font: { italic: true, sz: 11, name: "Calibri" } },
      },
    ]);
    worksheetData.push([]);

    const excelHeaders = [
      { v: "NOMOR LHK", s: styleHeaderMain },
      { v: "TANGGAL", s: styleHeaderMain },
      { v: "SHIFT", s: styleHeaderMain },
      { v: "TOTAL (M²)", s: styleHeaderMain },
      { v: "MESIN", s: styleHeaderMain },
      { v: "NOMOR SPK", s: styleHeaderMain },
      { v: "NAMA ORDER", s: styleHeaderMain },
      { v: "PANJANG", s: styleHeaderMain },
      { v: "LEBAR", s: styleHeaderMain },
      { v: "JML ORDER", s: styleHeaderMain },
      { v: "QTY CETAK", s: styleHeaderMain },
      { v: "TOTAL DETAIL (M²)", s: styleHeaderMain },
    ];
    worksheetData.push(excelHeaders);

    const grouped = rawData.reduce((acc: any, item: any) => {
      const noLhk = item.Nomor_LHK || item.Nomor || "TANPA_NOMOR";
      if (!acc[noLhk]) {
        acc[noLhk] = {
          items: [],
          totalM2: 0,
          tanggal: item.Tanggal,
          shift: item.Shift_LHK || item.Shift,
        };
      }
      acc[noLhk].items.push(item);
      acc[noLhk].totalM2 += parseNum(item.m2_cetak || item.cetak_meter);
      return acc;
    }, {});

    Object.keys(grouped).forEach((nomorLhk) => {
      const group = grouped[nomorLhk];

      group.items.forEach((row: any, index: number) => {
        const isFirstRow = index === 0;
        const tglFormatted = isFirstRow ? formatTanggal(group.tanggal) : "";
        const totalM2Val = parseNum(group.totalM2);
        const panjangVal = parseNum(row.Panjang || row.panjang);
        const lebarVal = parseNum(row.Lebar || row.lebar);
        const jmlOrderVal = parseNum(row.Jml_Order || row.jml_order || 0);
        const qtyCetakVal = parseNum(row.Qty_Cetak || row.Jml_Cetak || 0);
        const m2CetakVal = parseNum(row.m2_cetak || 0);

        worksheetData.push([
          { v: isFirstRow ? nomorLhk : "", s: styleDataCellCenter },
          { v: tglFormatted, s: styleDataCellCenter },
          { v: isFirstRow ? group.shift : "", s: styleDataCellCenter },
          {
            v: isFirstRow ? totalM2Val : "",
            t: isFirstRow ? "n" : "s",
            z: "#,##0.00",
            s: styleDataCellRight,
          },
          { v: row.Mesin || "-", s: styleDataCellCenter },
          { v: row.Nomor_SPK || row.nomor_spk || "-", s: styleDataCellCenter },
          { v: row.Nama_SPK || row.nama_spk || "-", s: styleDataCell },
          { v: panjangVal, t: "n", z: "#,##0.00", s: styleDataCellRight },
          { v: lebarVal, t: "n", z: "#,##0.00", s: styleDataCellRight },
          { v: jmlOrderVal, t: "n", z: "#,##0", s: styleDataCellRight },
          { v: qtyCetakVal, t: "n", z: "#,##0", s: styleDataCellRight },
          { v: m2CetakVal, t: "n", z: "#,##0.00", s: styleDataCellRight },
        ]);
      });
    });

    const ws = XLSX.utils.aoa_to_sheet(worksheetData);
    ws["!cols"] = [
      { wch: 18 },
      { wch: 13 },
      { wch: 8 },
      { wch: 14 },
      { wch: 12 },
      { wch: 18 },
      { wch: 32 },
      { wch: 10 },
      { wch: 10 },
      { wch: 12 },
      { wch: 12 },
      { wch: 18 },
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "LHK Approval Cetak");
    XLSX.writeFile(wb, fileName);
    toast.success("Export Excel berhasil");
  } catch (error) {
    console.error("Export Error:", error);
    toast.error("Gagal melakukan export excel");
  }
};
</script>

<template>
  <BaseBrowse
    title="LHK Approval Cetak"
    menu-id="5508"
    :icon="IconPhoto"
    :headers="headers"
    :items="items || []"
    :is-loading="isLoading"
    v-model:selected="selected"
    :can-insert="canInsert"
    :can-edit="canEdit"
    :can-delete="canDelete"
    :can-export="canExport"
    show-expand
    v-model:expanded="expanded"
    @update:expanded="onUpdateExpanded"
    @refresh="fetchData"
    @insert="handleNew"
    @edit="handleEdit"
    @delete="handleDelete"
    @export="handleExportExcel"
  >
    <!-- FILTER KIRI: PERIODE & FILTER MESIN -->
    <template #filter-left>
      <div class="filter-group">
        <span class="filter-label">Periode</span>
        <input
          type="date"
          v-model="startDate"
          class="date-inp"
          @change="fetchData"
        />
        <span class="filter-sep">s/d</span>
        <input
          type="date"
          v-model="endDate"
          class="date-inp"
          @change="fetchData"
        />
      </div>

      <div class="filter-group ml-3">
        <span class="filter-label">Mesin</span>
        <v-select
          v-model="selectedMesin"
          :items="listMesin"
          placeholder="Semua Mesin"
          multiple
          chips
          closable-chips
          density="compact"
          variant="outlined"
          hide-details
          style="min-width: 180px; max-width: 320px"
          class="bg-white"
          @update:model-value="fetchData"
        >
          <template #selection="{ item, index }">
            <v-chip v-if="index < 2" size="x-small">
              <span>{{ item.title }}</span>
            </v-chip>
            <span v-if="index === 2" class="text-grey text-caption">
              (+{{ selectedMesin.length - 2 }})
            </span>
          </template>
        </v-select>
      </div>

      <!-- Indikator Belum Lengkap -->
      <div class="d-flex align-center ga-1 ml-3 text-caption">
        <span class="badge-red-indicator"></span>
        <span class="text-grey-darken-1">Merah = Belum Lengkap</span>
      </div>
    </template>

    <!-- CUSTOM ROW CELLS -->
    <template #item.Nomor="{ item }">
      <span
        :class="[
          'font-weight-medium',
          (item.raw || item).Lengkap !== 'Y' ? 'text-red font-weight-bold' : ''
        ]"
      >
        {{ (item.raw || item).Nomor }}
      </span>
    </template>

    <template #item.Tanggal="{ item }">
      <span>{{ formatTanggal((item.raw || item).Tanggal) }}</span>
    </template>

    <template #item.cetak_meter="{ item }">
      <span class="font-weight-bold">
        {{ Number((item.raw || item).cetak_meter || (item.raw || item).Total_Meter || 0).toFixed(2) }} m²
      </span>
    </template>

    <template #item.Lengkap="{ item }">
      <v-chip
        size="x-small"
        :color="(item.raw || item).Lengkap === 'Y' ? 'success' : 'error'"
        class="font-weight-bold"
        variant="flat"
      >
        {{ (item.raw || item).Lengkap === "Y" ? "LENGKAP" : "BELUM" }}
      </v-chip>
    </template>

    <!-- EXPANDED CONTENT: DETAIL SPK PER LHK -->
    <template #expanded-row="{ columns, item }">
      <tr>
        <td :colspan="columns.length" class="pa-2 bg-grey-lighten-4">
          <div v-if="loadingDetails[getItemNomor(item)]" class="text-center pa-2">
            <v-progress-circular indeterminate size="18" color="primary" />
            <span class="ml-2 text-caption">Memuat rincian pekerjaan...</span>
          </div>

          <v-data-table
            v-else-if="getItemDetails(item).length > 0"
            :headers="detailHeaders"
            :items="getItemDetails(item)"
            density="compact"
            class="border rounded desktop-table bg-white"
            hide-default-footer
          >
            <template #[`item.Panjang`]="{ value }">
              <span>{{ Number(value || 0).toFixed(2) }}</span>
            </template>
            <template #[`item.Lebar`]="{ value }">
              <span>{{ Number(value || 0).toFixed(2) }}</span>
            </template>
            <template #[`item.Jml_Order`]="{ value }">
              <span>{{ Number(value || 0).toLocaleString() }}</span>
            </template>
            <template #[`item.Jml_Cetak`]="{ value }">
              <span class="font-weight-bold">{{ Number(value || 0).toLocaleString() }}</span>
            </template>
            <template #[`item.m2_cetak`]="{ value }">
              <span class="font-weight-bold text-blue-darken-2">
                {{ Number(value || 0).toFixed(2) }} m²
              </span>
            </template>
          </v-data-table>

          <div v-else class="text-caption text-grey text-center pa-2">
            Tidak ada detail pekerjaan untuk LHK ini.
          </div>
        </td>
      </tr>
    </template>
  </BaseBrowse>
</template>

<style scoped>
.date-inp {
  height: 28px;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  padding: 0 6px;
  font-size: 12px;
}
.filter-group {
  display: flex;
  align-items: center;
  gap: 6px;
}
.filter-label {
  font-size: 12px;
  font-weight: 500;
  color: #606266;
}
.filter-sep {
  font-size: 12px;
  color: #909399;
}
.badge-red-indicator {
  display: inline-block;
  width: 10px;
  height: 10px;
  background-color: #ef4444;
  border-radius: 2px;
}
.desktop-table {
  font-size: 11px;
}
</style>
