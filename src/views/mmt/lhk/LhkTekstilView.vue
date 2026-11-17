<template>
  <BaseBrowse
    title="Hasil Kerja Tekstil MMT"
    menu-id="mmt-lhk-tekstil"
    icon="mdi-factory"
    :headers="masterHeaders"
    :items="masterData"
    :can-insert="true"
    :can-edit="true"
    :can-delete="canDelete"
    :is-loading="loading.master"
    :loading="loading.master"
    v-model:selected="selected"
    v-model:expanded="expanded"
    v-model:startDate="filters.startDate"
    v-model:endDate="filters.endDate"
    item-value="Nomor"
    has-print
    show-expand
    :summary-fields="[
      'JumlahOrder',
      'jumlah_cetak',
      'PanjangBahanAwal',
      'SisaMeterAkhir',
    ]"
    @refresh="fetchMasterData"
    @add="handleCreate"
    @edit="handleEdit"
    @delete="handleDelete"
    @print="handlePrint"
    @row-click="handleRowClick"
  >
    <!-- Keterangan Warna Status di atas tabel -->
    <template #prepend-content>
      <div class="d-flex align-center flex-wrap ga-2 mb-2 text-caption">
        <span class="text-medium-emphasis d-flex align-center font-weight-medium">
          <v-icon size="14" class="me-1">mdi-information-outline</v-icon>
          Keterangan:
        </span>
        <v-chip size="x-small" variant="tonal" color="error" class="font-weight-medium">
          <span class="status-dot bg-error me-1"></span>
          Merah = Draft / Belum Lengkap
        </v-chip>
        <v-chip size="x-small" variant="tonal" color="grey-darken-3" class="font-weight-medium">
          <span class="status-dot bg-grey-darken-3 me-1"></span>
          Hitam = Posted / Approve
        </v-chip>
      </div>
    </template>

    <!-- Tombol Ekstra (Export Excel) -->
    <template #extra-actions>
      <v-btn
        size="x-small"
        color="success"
        :disabled="masterData.length === 0"
        @click="exportToExcel"
        :loading="loading.master"
      >
        <v-icon start>mdi-file-excel</v-icon> Export Excel
      </v-btn>
    </template>

    <!-- Filter Tambahan di Toolbar (Pencarian Nama SPK / Nomor) -->
    <template #filter-fields>
      <v-text-field
        v-model="filters.search"
        prepend-inner-icon="mdi-magnify"
        label="Cari Nama SPK / Nomor"
        density="compact"
        hide-details
        variant="outlined"
        clearable
        style="max-width: 300px"
        @keyup.enter="fetchMasterData"
      />
    </template>

    <!-- Custom Template Kolom Tabel Utama -->
    <template #item.Tanggal="{ item }">
      <span :class="getRowTextColor(item)">{{
        safeFormatDate(item.Tanggal)
      }}</span>
    </template>

    <template #item.Status="{ item }">
      <v-chip
        size="x-small"
        :color="
          item.Status === 'APPROVE'
            ? 'success'
            : item.Status === 'POSTED'
              ? 'info'
              : 'warning'
        "
        class="font-weight-bold"
      >
        {{ item.Status || "DRAFT" }}
      </v-chip>
    </template>

    <template #item.Lengkap="{ item }">
      <v-chip
        size="x-small"
        :color="item.Lengkap === 'Y' ? 'success' : 'error'"
      >
        {{ item.Lengkap === "Y" ? "YA" : "TIDAK" }}
      </v-chip>
    </template>

    <template #item.Nomor="{ item }">
      <span :class="getRowTextColor(item)">{{ item.Nomor }}</span>
    </template>

    <template #item.NomorSPK="{ item }">
      <span :title="item.NomorSPK" :class="getRowTextColor(item)">
        {{ truncateString(item.NomorSPK || "", 20) }}
      </span>
    </template>

    <template #item.jumlah_cetak="{ item }">
      <span :class="getRowTextColor(item)">
        {{ Math.round(Number(item.jumlah_cetak || 0)) }} pcs
      </span>
    </template>

    <template #item.PanjangBahanAwal="{ item }">
      <span :class="getRowTextColor(item)"
        >{{ formatMeter(Number(item.PanjangBahanAwal || 0) * 0.9) }} m</span
      >
    </template>

    <template #item.SisaMeterAkhir="{ item }">
      <span :class="getRowTextColor(item)">{{
        (Number(item.SisaMeterAkhir || 0) * 0.9).toFixed(2)
      }}</span>
    </template>

    <template #item.status_bahan="{ item }">
      <span
        v-if="Number(item.SisaMeterAkhir || 0) * 0.9 < 0"
        class="text-success font-weight-bold"
      >
        SURPLUS
        {{ Math.abs(Number(item.SisaMeterAkhir || 0) * 0.9).toFixed(2) }}m
      </span>
      <span
        v-else-if="Number(item.SisaMeterAkhir || 0) * 0.9 > 0"
        class="text-orange font-weight-bold"
      >
        SISA {{ (Number(item.SisaMeterAkhir || 0) * 0.9).toFixed(2) }}m
      </span>
      <span v-else class="text-grey font-weight-bold"> PAS </span>
    </template>

    <!-- Slot Expanded Content untuk Menampilkan Detail -->
    <template #expanded-content="{ item }">
      <div class="detail-container">
        <div class="detail-table-wrapper">
          <div v-if="loadingDetails.has(item.Nomor)" class="text-center pa-4">
            <v-progress-circular indeterminate size="20" color="primary" />
            <span class="ml-2 text-caption">Memuat data...</span>
          </div>

          <v-data-table
            v-else-if="details[item.Nomor] && details[item.Nomor].length"
            :headers="detailHeaders"
            :items="details[item.Nomor]"
            density="compact"
            hide-default-footer
            class="detail-table border"
          >
            <template #item.Ukuran="{ item: detailItem }">
              {{ detailItem.Panjang }} x {{ detailItem.Lebar }}
            </template>

            <template #item.Jml_Cetak="{ value }">
              <strong class="total-bold">{{ value }}</strong>
            </template>

            <template #item.Warna>
              <div class="d-flex ga-1 align-center py-1">
                <v-chip
                  size="x-small"
                  color="cyan"
                  variant="flat"
                  text="C"
                  class="color-badge"
                />
                <v-chip
                  size="x-small"
                  color="magenta"
                  variant="flat"
                  text="M"
                  class="color-badge"
                />
                <v-chip
                  size="x-small"
                  color="yellow"
                  variant="flat"
                  text="Y"
                  class="color-badge"
                />
                <v-chip
                  size="x-small"
                  color="black"
                  variant="flat"
                  text="K"
                  class="color-badge"
                />
              </div>
            </template>
          </v-data-table>

          <div v-else class="text-center pa-4 text-caption text-grey">
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
import api from "@/services/api";
import { useAuthStore } from "@/stores/authStore";
import * as XLSX from "xlsx";

const router = useRouter();
const toast = useToast();
const authStore = useAuthStore();

const canDelete = computed(() => {
  const code = String(
    authStore.user?.kode || authStore.user?.kdUser || authStore.user?.username || "",
  ).toUpperCase();
  const role = String(
    authStore.user?.role || authStore.user?.level || authStore.user?.bagian || "",
  ).toUpperCase();
  const isAdmin = code === "ADMIN" || role === "ADMIN";
  return (
    isAdmin ||
    authStore.can("1292", "delete") ||
    authStore.can("5509", "delete")
  );
});

// --- State ---
const masterData = ref<any[]>([]);
const details = ref<Record<string, any[]>>({});
const loading = reactive({ master: true });
const loadingDetails = ref<Set<string>>(new Set());
const selected = ref<any[]>([]);
const expanded = ref<any[]>([]);

const filters = reactive({
  startDate: format(subDays(new Date(), 30), "yyyy-MM-dd"),
  endDate: format(new Date(), "yyyy-MM-dd"),
  search: "",
});

// --- Computed ---
const isSingleSelected = computed(() => selected.value.length === 1);
const selectedItem = computed(() => selected.value[0]);

const getRowTextColor = (item: any) => {
  const status = (item.Status || "DRAFT").toUpperCase();
  const isLengkap = item.Lengkap === "Y";
  if (status === "DRAFT" || !isLengkap) {
    return "text-red font-weight-bold";
  }
  return "";
};

// --- Headers ---
const masterHeaders = [
  { title: "", key: "data-table-expand", width: "48px", fixed: true },
  { title: "Nomor", key: "Nomor", width: "250px", minWidth: "250px", fixed: true },
  { title: "Status", key: "Status", width: "100px", align: "center" },
  { title: "Shift", key: "Shift", minWidth: "50px" },
  { title: "Tanggal", key: "Tanggal" },
  { title: "Mesin", key: "Mesin" },
  { title: "Nomor SPK", key: "NomorSPK" },
  { title: "Nama SPK", key: "NamaOrder" },
  { title: "Panjang", key: "spk_panjang", align: "end" },
  { title: "Lebar", key: "spk_lebar", align: "end" },
  { title: "Jml Order", key: "JumlahOrder", align: "end" },
  { title: "Jml Cetak", key: "jumlah_cetak", align: "end" },
  { title: "Bahan Awal", key: "PanjangBahanAwal", align: "end" },
  { title: "Sisa", key: "SisaMeterAkhir", align: "end" },
  { title: "Status Bahan", key: "status_bahan", align: "center" },
  { title: "Bahan", key: "Kode_bahan" },
  { title: "Nama Bahan", key: "nama_Bahan" },
  { title: "Gudang", key: "Nama_Gudang" },
  { title: "Lengkap", key: "Lengkap", align: "center" },
];

const detailHeaders = [
  { title: "Mesin", key: "Mesin", minWidth: "120px" },
  { title: "SPK", key: "Nomor_SPK", minWidth: "150px" },
  { title: "Nama SPK", key: "Nama_SPK", minWidth: "250px" },
  { title: "Ukuran", key: "Ukuran", width: "120px" },
  { title: "Jml Cetak", key: "Jml_Cetak", align: "end", width: "120px" },
  { title: "Bahan", key: "Nama", minWidth: "150px" },
  { title: "Warna (CMYK)", key: "Warna", sortable: false, width: "120px" },
];

// --- API Calls ---
const fetchMasterData = async () => {
  loading.master = true;
  try {
    const response = await api.get("/mmt/lhk-tekstil-mmt", { params: filters });
    masterData.value = response.data || [];
    selected.value = [];
    expanded.value = [];
  } catch (err) {
    toast.error("Gagal mengambil data LHK Tekstil.");
  } finally {
    loading.master = false;
  }
};

watch(
  expanded,
  async (newVal) => {
    const lastExpanded = newVal[newVal.length - 1];
    if (
      lastExpanded &&
      lastExpanded.Nomor &&
      !details.value[lastExpanded.Nomor]
    ) {
      const nomorLhk = lastExpanded.Nomor;
      loadingDetails.value.add(nomorLhk);
      try {
        const res = await api.get(`mmt/lhk-tekstil-mmt/detail/${nomorLhk}`);
        if (res.data && res.data.details) {
          details.value[nomorLhk] = res.data.details;
        } else {
          details.value[nomorLhk] = res.data || [];
        }
      } catch (e) {
        toast.error(`Gagal memuat detail untuk ${nomorLhk}`);
        details.value[nomorLhk] = [];
      } finally {
        loadingDetails.value.delete(nomorLhk);
      }
    }
  },
  { deep: true },
);

const handleRowClick = (_event: any, row: any) => {
  const item = row.item;
  const isSelected = selected.value.some((s) => s.Nomor === item.Nomor);
  selected.value = isSelected ? [] : [item];
};

// --- Helpers ---
const safeFormatDate = (dateString: string | undefined): string => {
  if (!dateString) return "";
  try {
    const parsedDate = parseISO(dateString);
    if (isValid(parsedDate)) {
      return format(parsedDate, "dd/MM/yyyy");
    }
    return "";
  } catch (e) {
    return "";
  }
};

const formatMeter = (value: number) => {
  const num = Number(value);
  return Number.isNaN(num) ? "0.00" : num.toFixed(2);
};

const truncateString = (str: string, num: number) => {
  if (str?.length > num) {
    return str.slice(0, num) + "...";
  }
  return str;
};

// --- Actions ---
const handleCreate = () => {
  router.push({ name: 'LhkTekstilCreate' });
};

const handleEdit = () => {
  if (!selectedItem.value) return;
  router.push({
    name: 'LhkTekstilEdit',
    params: { nomor: selectedItem.value.Nomor },
  });
};

const handleDelete = async (item?: any) => {
  if (!canDelete.value) {
    toast.error("Akses ditolak: Anda tidak memiliki izin untuk menghapus data LHK Tekstil.");
    return;
  }
  const target = item || selectedItem.value;
  const nomor = target?.Nomor || target;
  if (!nomor) return;
  if (confirm(`Yakin ingin menghapus LHK nomor ${nomor}?`)) {
    try {
      await api.delete(`/mmt/lhk-tekstil-mmt/${encodeURIComponent(nomor)}`);
      toast.success("Berhasil dihapus.");
      await fetchMasterData();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Gagal Hapus.");
    }
  }
};

const handlePrint = () => {
  if (!selectedItem.value) return;
  toast.info(`Mencetak slip untuk ${selectedItem.value.Nomor}...`);
  window.open(`/api/report/lhk-slip/${selectedItem.value.Nomor}`, "_blank");
};

// --- Export Excel ---
const exportToExcel = async () => {
  loading.master = true;
  try {
    for (const header of masterData.value) {
      if (
        !details.value[header.Nomor] ||
        details.value[header.Nomor].length === 0
      ) {
        try {
          const res = await api.get(
            `mmt/lhk-tekstil-mmt/detail/${header.Nomor}`,
          );
          details.value[header.Nomor] = res.data?.details || res.data || [];
        } catch (e) {
          details.value[header.Nomor] = [];
        }
      }
    }

    const fileName = `LHK_Tekstil_MMT_${filters.startDate}_to_${filters.endDate}.xlsx`;

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

    const formatTglManual = (dateStr: string) => {
      if (!dateStr) return "-";
      try {
        if (dateStr.includes("-")) {
          const parts = dateStr.split("T")[0].split("-");
          if (parts.length === 3) {
            return `${parts[2]}/${parts[1]}/${parts[0]}`;
          }
        }
        return safeFormatDate(dateStr) || dateStr;
      } catch {
        return dateStr;
      }
    };

    const worksheetData: any[] = [];
    worksheetData.push([
      {
        v: "LAPORAN HASIL KERJA TEKSTIL MMT",
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

    const headers = [
      { v: "NOMOR LHK", s: styleHeaderMain },
      { v: "TANGGAL", s: styleHeaderMain },
      { v: "SHIFT", s: styleHeaderMain },
      { v: "MESIN", s: styleHeaderMain },
      { v: "NOMOR SPK", s: styleHeaderMain },
      { v: "NAMA SPK / ORDER", s: styleHeaderMain },
      { v: "PANJANG", s: styleHeaderMain },
      { v: "LEBAR", s: styleHeaderMain },
      { v: "JML ORDER", s: styleHeaderMain },
      { v: "JML CETAK (PCS)", s: styleHeaderMain },
      { v: "BAHAN AWAL", s: styleHeaderMain },
      { v: "SISA", s: styleHeaderMain },
      { v: "STATUS BAHAN", s: styleHeaderMain },
      { v: "KODE BAHAN", s: styleHeaderMain },
      { v: "NAMA BAHAN", s: styleHeaderMain },
      { v: "GUDANG", s: styleHeaderMain },
      { v: "DETAIL SPK", s: styleHeaderMain },
      { v: "DETAIL ORDER", s: styleHeaderMain },
      { v: "DETAIL UKURAN", s: styleHeaderMain },
      { v: "DETAIL QTY", s: styleHeaderMain },
    ];
    worksheetData.push(headers);

    let grandTotalJumlahOrderMaster = 0;
    let grandTotalCetakPcsMaster = 0;
    let grandTotalQtyDetail = 0;

    masterData.value.forEach((header) => {
      const targetDetails = details.value[header.Nomor] || [];
      const tglHeader = header.Tanggal ? formatTglManual(header.Tanggal) : "-";
      const sisaMeter = parseNum(header.SisaMeterAkhir) * 0.9;

      let statusBahanText = "PAS";
      if (sisaMeter < 0) {
        statusBahanText = `SURPLUS ${Math.abs(sisaMeter).toFixed(2)}m`;
      } else if (sisaMeter > 0) {
        statusBahanText = `SISA ${sisaMeter.toFixed(2)}m`;
      }

      if (targetDetails.length > 0) {
        targetDetails.forEach((dtl, index) => {
          const isFirstRow = index === 0;
          const detailUkuranText =
            dtl.Panjang && dtl.Lebar ? `${dtl.Panjang} x ${dtl.Lebar}` : "-";
          const detailCetakQty = parseNum(dtl.Jml_Cetak || dtl.jumlah);

          if (isFirstRow) {
            grandTotalJumlahOrderMaster += parseNum(header.JumlahOrder);
            grandTotalCetakPcsMaster += parseNum(header.jumlah_cetak);
          }
          grandTotalQtyDetail += detailCetakQty;

          worksheetData.push([
            { v: isFirstRow ? header.Nomor : "-", s: styleDataCellCenter },
            { v: isFirstRow ? tglHeader : "-", s: styleDataCellCenter },
            {
              v: isFirstRow ? header.Shift || "-" : "-",
              s: styleDataCellCenter,
            },
            {
              v: isFirstRow ? header.Mesin || "-" : "-",
              s: styleDataCellCenter,
            },
            {
              v: isFirstRow ? header.NomorSPK || "-" : "-",
              s: styleDataCellCenter,
            },
            { v: isFirstRow ? header.NamaOrder || "-" : "-", s: styleDataCell },
            isFirstRow
              ? {
                  v: parseNum(header.spk_panjang),
                  t: "n",
                  z: "#,##0.00",
                  s: styleDataCellRight,
                }
              : { v: "-", s: styleDataCellCenter },
            isFirstRow
              ? {
                  v: parseNum(header.spk_lebar),
                  t: "n",
                  z: "#,##0.00",
                  s: styleDataCellRight,
                }
              : { v: "-", s: styleDataCellCenter },
            isFirstRow
              ? {
                  v: parseNum(header.JumlahOrder),
                  t: "n",
                  z: "#,##0",
                  s: styleDataCellRight,
                }
              : { v: "-", s: styleDataCellCenter },
            isFirstRow
              ? {
                  v: parseNum(header.jumlah_cetak),
                  t: "n",
                  z: "#,##0",
                  s: styleDataCellRight,
                }
              : { v: "-", s: styleDataCellCenter },
            isFirstRow
              ? {
                  v: parseNum(header.PanjangBahanAwal) * 0.9,
                  t: "n",
                  z: "#,##0.00",
                  s: styleDataCellRight,
                }
              : { v: "-", s: styleDataCellCenter },
            isFirstRow
              ? { v: sisaMeter, t: "n", z: "#,##0.00", s: styleDataCellRight }
              : { v: "-", s: styleDataCellCenter },
            { v: isFirstRow ? statusBahanText : "-", s: styleDataCellCenter },
            {
              v: isFirstRow ? header.Kode_bahan || "-" : "-",
              s: styleDataCellCenter,
            },
            {
              v: isFirstRow ? header.nama_Bahan || "-" : "-",
              s: styleDataCell,
            },
            {
              v: isFirstRow ? header.Nama_Gudang || "-" : "-",
              s: styleDataCell,
            },
            { v: dtl.Nomor_SPK || dtl.spk || "-", s: styleDataCellCenter },
            { v: dtl.Nama_SPK || dtl.Nama || "-", s: styleDataCell },
            { v: detailUkuranText, s: styleDataCellCenter },
            { v: detailCetakQty, t: "n", z: "#,##0", s: styleDataCellRight },
          ]);
        });
      } else {
        grandTotalJumlahOrderMaster += parseNum(header.JumlahOrder);
        grandTotalCetakPcsMaster += parseNum(header.jumlah_cetak);

        worksheetData.push([
          { v: header.Nomor, s: styleDataCellCenter },
          { v: tglHeader, s: styleDataCellCenter },
          { v: header.Shift || "-", s: styleDataCellCenter },
          { v: header.Mesin || "-", s: styleDataCellCenter },
          { v: header.NomorSPK || "-", s: styleDataCellCenter },
          { v: header.NamaOrder || "-", s: styleDataCell },
          {
            v: parseNum(header.spk_panjang),
            t: "n",
            z: "#,##0.00",
            s: styleDataCellRight,
          },
          {
            v: parseNum(header.spk_lebar),
            t: "n",
            z: "#,##0.00",
            s: styleDataCellRight,
          },
          {
            v: parseNum(header.JumlahOrder),
            t: "n",
            z: "#,##0",
            s: styleDataCellRight,
          },
          {
            v: parseNum(header.jumlah_cetak),
            t: "n",
            z: "#,##0",
            s: styleDataCellRight,
          },
          {
            v: parseNum(header.PanjangBahanAwal) * 0.9,
            t: "n",
            z: "#,##0.00",
            s: styleDataCellRight,
          },
          { v: sisaMeter, t: "n", z: "#,##0.00", s: styleDataCellRight },
          { v: statusBahanText, s: styleDataCellCenter },
          { v: header.Kode_bahan || "-", s: styleDataCellCenter },
          { v: header.nama_Bahan || "-", s: styleDataCell },
          { v: header.Nama_Gudang || "-", s: styleDataCell },
          { v: "-", s: styleDataCellCenter },
          { v: "Tidak ada data detail", s: styleDataCell },
          { v: "-", s: styleDataCellCenter },
          { v: 0, t: "n", z: "#,##0", s: styleDataCellRight },
        ]);
      }
    });

    const footerRow = [
      {
        v: "GRAND TOTAL",
        s: { ...styleFooter, alignment: { horizontal: "right" } },
      },
      ...Array(7).fill({ v: "", s: styleFooter }),
      {
        v: grandTotalJumlahOrderMaster,
        t: "n",
        z: "#,##0",
        s: { ...styleFooter, alignment: { horizontal: "right" } },
      },
      {
        v: grandTotalCetakPcsMaster,
        t: "n",
        z: "#,##0",
        s: { ...styleFooter, alignment: { horizontal: "right" } },
      },
      ...Array(9).fill({ v: "", s: styleFooter }),
      {
        v: grandTotalQtyDetail,
        t: "n",
        z: "#,##0",
        s: { ...styleFooter, alignment: { horizontal: "right" } },
      },
    ];
    worksheetData.push(footerRow);

    const ws = XLSX.utils.aoa_to_sheet(worksheetData);
    ws["!merges"] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 19 } },
      {
        s: { r: worksheetData.length - 1, c: 0 },
        e: { r: worksheetData.length - 1, c: 7 },
      },
    ];

    ws["!cols"] = [
      { wch: 22 },
      { wch: 12 },
      { wch: 8 },
      { wch: 10 },
      { wch: 18 },
      { wch: 35 },
      { wch: 10 },
      { wch: 10 },
      { wch: 12 },
      { wch: 12 },
      { wch: 12 },
      { wch: 10 },
      { wch: 15 },
      { wch: 22 },
      { wch: 28 },
      { wch: 18 },
      { wch: 18 },
      { wch: 30 },
      { wch: 15 },
      { wch: 12 },
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "LHK_Tekstil");
    XLSX.writeFile(wb, fileName);
    toast.success("Excel Tekstil Berhasil Diunduh!");
  } catch (error) {
    console.error("Export Error:", error);
    toast.error("Gagal mengekspor data ke Excel.");
  } finally {
    loading.master = false;
  }
};

onMounted(() => {
  fetchMasterData();
});

watch(filters, fetchMasterData, { deep: true });
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
  font-size: 11px !important;
  width: auto !important;
}
:deep(.detail-table th),
:deep(.detail-table td) {
  font-size: 11px !important;
  white-space: nowrap;
}
:deep(.detail-table thead tr) {
  background-color: #f5f5f5 !important;
}
:deep(.detail-table thead th) {
  font-weight: 700 !important;
  color: #333 !important;
}
.text-red {
  color: #f44336 !important;
}
.text-success {
  color: #4caf50 !important;
}
.text-orange {
  color: #fb8c00 !important;
}
.text-grey {
  color: #757575 !important;
}
.font-weight-bold {
  font-weight: bold !important;
}
.total-bold {
  font-weight: 700;
  color: #1976d2;
}

.status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  display: inline-block;
}
.bg-error {
  background-color: #f44336 !important;
}
.bg-grey-darken-3 {
  background-color: #424242 !important;
}
.color-badge {
  font-size: 9px;
  min-width: 18px;
  justify-content: center;
}
</style>
