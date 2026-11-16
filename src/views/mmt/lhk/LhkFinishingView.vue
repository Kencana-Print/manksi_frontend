<template>
  <div>
    <BaseBrowse
      title="LHK Finishing MMT"
      icon="mdi-printer-3d"
      menu-id="5511"
      :headers="masterHeaders"
      :items="headers"
      v-model:filtered-items="filteredHeaders"
      :can-insert="true"
      :can-edit="true"
      :can-delete="true"
      :is-loading="loading.headers"
      :loading="loading.headers"
      :search="searchKeyword"
      item-value="Nomor"
      v-model:selected="selected"
      v-model:expanded="expanded"
      :filters="filters"
      @update:filters="Object.assign(filters, $event)"
      show-expand
      has-print
      :summary-fields="[]"
      @refresh="fetchHeaders"
      @add="handleNewEdit('new')"
      @edit="handleNewEdit('edit')"
      @delete="handleDelete"
      @print="handlePrint"
      @update:expanded="loadDetails"
      @row-click="handleRowClick"
      :row-props-fn="getRowProps"
      :row-props="getRowProps"
    >
      <!-- Action Buttons Tambahan di Header Toolbar -->
      <template #extra-actions>
        <v-btn size="small" color="success" @click="handleNewEdit('rekap')">
          <v-icon start>mdi-plus</v-icon> Rekap
        </v-btn>

        <v-btn
          size="small"
          color="primary"
          :disabled="!isSingleSelected"
          @click="handleAccClick"
        >
          <v-icon start>mdi-check-decagram</v-icon> ACC
        </v-btn>

        <v-divider vertical class="mx-2" />

        <v-btn
          size="small"
          color="info"
          :disabled="!isSingleSelected"
          @click="handlePrint"
        >
          <v-icon start>mdi-printer</v-icon> Cetak Slip
        </v-btn>

        <v-btn
          size="small"
          color="success"
          :disabled="filteredHeaders.length === 0"
          @click="handleExportDetail"
          :loading="loading.headers"
        >
          <v-icon start>mdi-file-excel</v-icon> Export Detail
        </v-btn>
      </template>

      <!-- Slot Filter Tambahan: Input Search SPK & Tombol Cari -->
      <template #filter-fields>
        <div class="d-flex align-center ga-2 ml-2">
          <v-text-field
            v-model="searchKeyword"
            placeholder="Cari No SPK / Nama SPK..."
            density="compact"
            hide-details
            variant="outlined"
            style="min-width: 200px; max-width: 250px"
            append-inner-icon="mdi-magnify"
            clearable
            @keyup.enter="handleSearchSpk"
            @click:clear="searchResults = []"
          />
          <v-btn
            color="primary"
            size="small"
            @click="handleSearchSpk"
            :loading="loadingSearch"
          >
            Cari SPK
          </v-btn>
        </div>

        <v-spacer />

        <div class="d-flex align-center ga-2 text-caption">
          <v-icon color="red" size="small">mdi-square-rounded</v-icon>
          <span class="ml-1"><strong>LENGKAP: TIDAK</strong></span>
        </div>
      </template>

      <!-- Custom Formatter Kolom Tabel Master -->
      <template #item.Tanggal="{ item }">
        {{ safeFormatDate(item.Tanggal) }}
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

      <!-- Sub-Tabel Detail (Expansion Row) menggunakan format BaseBrowse -->
      <template #expanded-content="{ item }">
        <div class="detail-container">
          <div
            v-if="isLoadingDetails(item.Nomor)"
            class="text-center pa-4 text-caption text-grey"
          >
            <v-progress-circular
              indeterminate
              size="20"
              color="primary"
              class="mr-2"
            />
            Memuat detail...
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
            <template #item.J_Order="{ value }">{{
              Number(value ?? 0).toLocaleString("id-ID")
            }}</template>
            <template #item.J_Potong="{ value }">{{
              Number(value ?? 0).toLocaleString("id-ID")
            }}</template>
            <template #item.J_Seaming="{ value }">{{
              Number(value ?? 0).toLocaleString("id-ID")
            }}</template>
            <template #item.J_MataAyam="{ value }">{{
              Number(value ?? 0).toLocaleString("id-ID")
            }}</template>
            <template #item.J_Coly="{ value }">{{
              Number(value ?? 0).toLocaleString("id-ID")
            }}</template>
            <template #item.J_Bs="{ value }">{{
              Number(value ?? 0).toLocaleString("id-ID")
            }}</template>
            <template #item.Mata_Ayam="{ value }">{{
              Number(value ?? 0).toLocaleString("id-ID")
            }}</template>
            <template #item.XBanner="{ value }">{{
              Number(value ?? 0).toLocaleString("id-ID")
            }}</template>
            <template #item.Plastik="{ value }">{{
              Number(value ?? 0).toLocaleString("id-ID")
            }}</template>
          </v-data-table>

          <div v-else class="text-center pa-4 text-caption text-grey">
            Tidak ada data detail untuk nomor {{ item.Nomor }}.
          </div>
        </div>
      </template>
    </BaseBrowse>

    <!-- Dialog Hasil Pencarian Progres SPK -->
    <v-dialog v-model="showSearchModal" max-width="1100px">
      <v-card>
        <v-card-title
          class="d-flex align-center justify-space-between bg-primary text-white pa-4"
        >
          <span>
            <v-icon start>mdi-file-find</v-icon> Progres Finishing SPK
          </span>
          <v-btn
            icon="mdi-close"
            variant="text"
            density="compact"
            @click="showSearchModal = false"
          />
        </v-card-title>

        <v-card-text class="pa-4">
          <v-data-table
            :headers="spkSearchHeaders"
            :items="searchResults"
            density="compact"
            class="elevation-1"
            :loading="loadingSearch"
          >
            <template #item.Panjang="{ item }">
              {{
                Number(
                  item.Panjang ??
                    item.raw?.Panjang ??
                    item.panjang ??
                    item.raw?.panjang ??
                    0,
                ).toLocaleString("id-ID", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })
              }}
            </template>

            <template #item.Lebar="{ item }">
              {{
                Number(
                  item.Lebar ??
                    item.raw?.Lebar ??
                    item.lebar ??
                    item.raw?.lebar ??
                    0,
                ).toLocaleString("id-ID", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })
              }}
            </template>

            <template #item.Qty_Order="{ item }">
              {{
                Number(
                  item.Qty_Order ?? item.raw?.Qty_Order ?? 0,
                ).toLocaleString("id-ID")
              }}
            </template>

            <template #item.Total_Potong="{ item }">
              {{
                Number(
                  item.Total_Potong ?? item.raw?.Total_Potong ?? 0,
                ).toLocaleString("id-ID")
              }}
            </template>

            <template #item.Total_Seaming="{ item }">
              {{
                Number(
                  item.Total_Seaming ?? item.raw?.Total_Seaming ?? 0,
                ).toLocaleString("id-ID")
              }}
            </template>

            <template #item.Total_MataAyam="{ item }">
              {{
                Number(
                  item.Total_MataAyam ?? item.raw?.Total_MataAyam ?? 0,
                ).toLocaleString("id-ID")
              }}
            </template>

            <template #item.Total_Coly="{ item }">
              {{
                Number(
                  item.Total_Coly ?? item.raw?.Total_Coly ?? 0,
                ).toLocaleString("id-ID")
              }}
            </template>

            <template #item.Total_BS="{ item }">
              {{
                Number(item.Total_BS ?? item.raw?.Total_BS ?? 0).toLocaleString(
                  "id-ID",
                )
              }}
            </template>

            <template #item.Sisa_Kurang="{ item }">
              <v-chip
                size="x-small"
                :color="
                  (item.Sisa_Kurang ?? item.raw?.Sisa_Kurang ?? 0) <= 0
                    ? 'success'
                    : 'error'
                "
                class="font-weight-bold"
              >
                {{
                  (item.Sisa_Kurang ?? item.raw?.Sisa_Kurang ?? 0) <= 0
                    ? "LENGKAP (0)"
                    : Number(
                        item.Sisa_Kurang ?? item.raw?.Sisa_Kurang ?? 0,
                      ).toLocaleString("id-ID")
                }}
              </v-chip>
            </template>
          </v-data-table>
        </v-card-text>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, computed, watch } from "vue";
import { useRouter } from "vue-router";
import { useToast } from "vue-toastification";
import { useAuthStore } from "@/stores/authStore";
import api from "@/services/api";
import { format, subDays } from "date-fns";
import BaseBrowse from "@/components/BaseBrowse.vue";
import * as XLSX from "xlsx";

interface LhkFinishingHeader {
  Nomor: string;
  Tanggal?: string;
  Gudang?: string;
  Nama_Gudang?: string;
  Shift?: string;
  Operator?: string;
  Lengkap?: "Y" | "N";
  [key: string]: any;
}

interface LhkFinishingDetail {
  Nomor_SPK?: string;
  Nama_SPK?: string;
  Panjang?: number;
  Lebar?: number;
  panjang?: number;
  lebar?: number;
  spk_panjang?: number;
  spk_lebar?: number;
  J_Order?: number;
  J_Potong?: number;
  J_Seaming?: number;
  J_MataAyam?: number;
  J_Coly?: number;
  J_Bs?: number;
  Mata_Ayam?: number;
  XBanner?: number;
  Plastik?: number;
  [key: string]: any;
}

interface SpkSearchResult {
  Nomor_SPK: string;
  Nama_SPK: string;
  Panjang?: number;
  Lebar?: number;
  Qty_Order: number;
  Total_Potong: number;
  Total_Seaming: number;
  Total_MataAyam: number;
  Total_Coly: number;
  Total_BS: number;
  Sisa_Kurang: number;
  raw?: any;
}

type LhkFinishingItem = LhkFinishingHeader;

const API_BASE_URL = "/mmt/lhk-finishing";

const router = useRouter();
const toast = useToast();
const authStore = useAuthStore();
const MENU_ID = "MMT_LHK_FINISHING";

const searchKeyword = ref("");
const loadingSearch = ref(false);
const showSearchModal = ref(false);
const searchResults = ref<SpkSearchResult[]>([]);

const headers = ref<LhkFinishingHeader[]>([]);
const filteredHeaders = ref<LhkFinishingHeader[]>([]);
const details = ref<Record<string, LhkFinishingDetail[]>>({});
const loading = ref({ headers: true, details: false });
const loadingDetails = ref<Set<string>>(new Set());
const selected = ref<LhkFinishingHeader[]>([]);
const expanded = ref<any[]>([]);

const filters = reactive({
  startDate: format(subDays(new Date(), 30), "yyyy-MM-dd"),
  endDate: format(new Date(), "yyyy-MM-dd"),
});

const isSingleSelected = computed(() => selected.value.length === 1);
const selectedRow = computed<LhkFinishingItem | null>(() =>
  isSingleSelected.value ? selected.value[0] : null,
);
const selectedNomor = computed(() => selectedRow.value?.Nomor || null);

const handleRowClick = (_event: Event, row: any) => {
  const item = row?.item?.raw || row?.item || row;
  if (!item || !item.Nomor) return;

  selected.value = selected.value.some((s) => s.Nomor === item.Nomor)
    ? []
    : [item];
};

const getRowProps = ({ item }: { item: any }) => {
  const itemData = item?.raw || item;
  return {
    class: selected.value.some((s) => s.Nomor === itemData?.Nomor)
      ? "row-selected"
      : "",
  };
};

const safeFormatDate = (dateString: string | undefined): string => {
  if (!dateString) return "";
  try {
    const cleanDate = dateString.split("T")[0];
    if (cleanDate.includes("-")) {
      const parts = cleanDate.split("-");
      if (parts.length === 3) {
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
      }
    }
    return cleanDate;
  } catch {
    return dateString || "";
  }
};

const isLoadingDetails = (nomor: string) => loadingDetails.value.has(nomor);

const getRowTextColor = (item: LhkFinishingItem) => {
  return item.Lengkap !== "Y" ? "text-red font-weight-bold" : "";
};

const masterHeaders = [
  { title: "Nomor", key: "Nomor", minWidth: "180px", fixed: true },
  { title: "Tanggal", key: "Tanggal", minWidth: "120px" },
  { title: "Gudang", key: "Gudang", minWidth: "100px" },
  { title: "Nama Gudang", key: "Nama_Gudang", minWidth: "150px" },
  { title: "Shift", key: "Shift", minWidth: "80px" },
  { title: "Operator", key: "Operator", minWidth: "150px" },
];

const detailHeaders = [
  { title: "Nomor SPK", key: "Nomor_SPK", minWidth: "150px" },
  { title: "Nama SPK", key: "Nama_SPK", minWidth: "250px" },
  { title: "Panjang", key: "Panjang", align: "end", minWidth: "90px" },
  { title: "Lebar", key: "Lebar", align: "end", minWidth: "90px" },
  { title: "Jml Order", key: "J_Order", align: "end" },
  { title: "Jml Potong", key: "J_Potong", align: "end" },
  { title: "Jml Seaming", key: "J_Seaming", align: "end" },
  { title: "Jml Mata Ayam", key: "J_MataAyam", align: "end" },
  { title: "Jml Coly", key: "J_Coly", align: "end" },
  { title: "Jml BS", key: "J_Bs", align: "end" },
  { title: "Qty Mata Ayam", key: "Mata_Ayam", align: "end" },
  { title: "Qty XBanner", key: "XBanner", align: "end" },
  { title: "Qty Plastik", key: "Plastik", align: "end" },
];

const spkSearchHeaders = [
  { title: "Nomor SPK", key: "Nomor_SPK", minWidth: "150px" },
  { title: "Nama SPK", key: "Nama_SPK", minWidth: "200px" },
  { title: "Panjang", key: "Panjang", align: "end" },
  { title: "Lebar", key: "Lebar", align: "end" },
  { title: "Qty Order", key: "Qty_Order", align: "end" },
  { title: "Potong", key: "Total_Potong", align: "end" },
  { title: "Seaming", key: "Total_Seaming", align: "end" },
  { title: "Mata Ayam", key: "Total_MataAyam", align: "end" },
  { title: "Hasil Coly", key: "Total_Coly", align: "end" },
  { title: "BS", key: "Total_BS", align: "end" },
  { title: "Sisa Kurang", key: "Sisa_Kurang", align: "end" },
];

const handleSearchSpk = async () => {
  if (!searchKeyword.value || !searchKeyword.value.trim()) {
    toast.warning("Masukkan nomor atau nama SPK yang ingin dicari.");
    return;
  }

  loadingSearch.value = true;
  try {
    const res = await api.get(`${API_BASE_URL}/search-spk`, {
      params: { q: searchKeyword.value.trim() },
    });

    searchResults.value = res.data.data || res.data || [];
    showSearchModal.value = true;

    if (searchResults.value.length === 0) {
      toast.info("Data SPK tidak ditemukan.");
    }
  } catch (error) {
    console.error("Error searching SPK:", error);
    toast.error("Gagal melakukan pencarian SPK.");
  } finally {
    loadingSearch.value = false;
  }
};

const fetchHeaders = async () => {
  loading.value.headers = true;
  try {
    const response = await api.get(API_BASE_URL, {
      params: {
        startDate: filters.startDate,
        endDate: filters.endDate,
      },
    });
    headers.value = response.data.data || [];
    selected.value = [];
    expanded.value = [];
  } catch (err) {
    console.error("Fetch error:", err);
    toast.error("Gagal mengambil data LHK Finishing.");
  } finally {
    loading.value.headers = false;
  }
};

const loadDetails = async (newlyExpandedItems: any[]) => {
  if (!newlyExpandedItems || newlyExpandedItems.length === 0) return;

  const lastItem = newlyExpandedItems[newlyExpandedItems.length - 1];
  const nomor =
    typeof lastItem === "object"
      ? lastItem.Nomor || lastItem.raw?.Nomor
      : lastItem;

  if (!nomor || details.value[nomor]) return;

  loadingDetails.value.add(nomor);
  try {
    const res = await api.get(`${API_BASE_URL}/details`, {
      params: { nomor },
    });
    const result = res.data.data;
    const rawDetails = result.Detail || result || [];

    details.value[nomor] = rawDetails.map((dtl: any) => ({
      ...dtl,
      Panjang: Number(dtl.Panjang ?? dtl.panjang ?? dtl.spk_panjang ?? 0),
      Lebar: Number(dtl.Lebar ?? dtl.lebar ?? dtl.spk_lebar ?? 0),
    }));
  } catch (err) {
    console.error(err);
    toast.error(`Gagal memuat detail untuk ${nomor}`);
    details.value[nomor] = [];
  } finally {
    loadingDetails.value.delete(nomor);
  }
};

const handleExportDetail = async () => {
  loading.value.headers = true;
  try {
    const missingHeaders = headers.value.filter(
      (header) =>
        !details.value[header.Nomor] ||
        details.value[header.Nomor].length === 0,
    );

    if (missingHeaders.length > 0) {
      await Promise.all(
        missingHeaders.map(async (header) => {
          try {
            const res = await api.get(`${API_BASE_URL}/details`, {
              params: { nomor: header.Nomor },
            });
            const result = res.data.data;
            const rawDetails = result.Detail || result || [];
            details.value[header.Nomor] = rawDetails.map((dtl: any) => ({
              ...dtl,
              Panjang: Number(
                dtl.Panjang ?? dtl.panjang ?? dtl.spk_panjang ?? 0,
              ),
              Lebar: Number(dtl.Lebar ?? dtl.lebar ?? dtl.spk_lebar ?? 0),
            }));
          } catch (e) {
            console.error(
              `Gagal pre-fetch detail finishing ${header.Nomor}:`,
              e,
            );
            details.value[header.Nomor] = [];
          }
        }),
      );
    }

    const fileName = `LHK_Finishing_MMT_${filters.startDate}_to_${filters.endDate}.xlsx`;

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

    const num = (v: any) => (isNaN(Number(v)) ? 0 : Number(v));

    const worksheetData: any[] = [];
    worksheetData.push([
      {
        v: "LAPORAN HASIL KERJA FINISHING MMT",
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

    const headersTable = [
      { v: "NOMOR LHK", s: styleHeaderMain },
      { v: "TANGGAL", s: styleHeaderMain },
      { v: "KODE GUDANG", s: styleHeaderMain },
      { v: "NAMA GUDANG", s: styleHeaderMain },
      { v: "SHIFT", s: styleHeaderMain },
      { v: "OPERATOR", s: styleHeaderMain },
      { v: "NOMOR SPK", s: styleHeaderMain },
      { v: "NAMA SPK", s: styleHeaderMain },
      { v: "PANJANG", s: styleHeaderMain },
      { v: "LEBAR", s: styleHeaderMain },
      { v: "JML ORDER", s: styleHeaderMain },
      { v: "JML POTONG", s: styleHeaderMain },
      { v: "JML SEAMING", s: styleHeaderMain },
      { v: "JML MATA AYAM", s: styleHeaderMain },
      { v: "JML COLY", s: styleHeaderMain },
      { v: "JML BS", s: styleHeaderMain },
      { v: "QTY MATA AYAM", s: styleHeaderMain },
      { v: "QTY XBANNER", s: styleHeaderMain },
      { v: "QTY PLASTIK", s: styleHeaderMain },
    ];
    worksheetData.push(headersTable);

    headers.value.forEach((header) => {
      const targetDetails = details.value[header.Nomor] || [];
      const tglHeader = header.Tanggal ? safeFormatDate(header.Tanggal) : "";

      if (targetDetails.length > 0) {
        targetDetails.forEach((dtl, index) => {
          const row = [
            { v: index === 0 ? header.Nomor : "", s: styleDataCellCenter },
            { v: index === 0 ? tglHeader : "", s: styleDataCellCenter },
            {
              v: index === 0 ? header.Gudang || "-" : "",
              s: styleDataCellCenter,
            },
            {
              v: index === 0 ? header.Nama_Gudang || "-" : "",
              s: styleDataCell,
            },
            {
              v: index === 0 ? header.Shift || "-" : "",
              s: styleDataCellCenter,
            },
            { v: index === 0 ? header.Operator || "-" : "", s: styleDataCell },
            { v: dtl.Nomor_SPK || "-", s: styleDataCellCenter },
            { v: dtl.Nama_SPK || "-", s: styleDataCell },
            {
              v: num(dtl.Panjang ?? dtl.panjang ?? dtl.spk_panjang),
              t: "n",
              z: "#,##0.00",
              s: styleDataCellRight,
            },
            {
              v: num(dtl.Lebar ?? dtl.lebar ?? dtl.spk_lebar),
              t: "n",
              z: "#,##0.00",
              s: styleDataCellRight,
            },
            {
              v: num(dtl.J_Order),
              t: "n",
              z: "#,##0",
              s: styleDataCellRight,
            },
            {
              v: num(dtl.J_Potong),
              t: "n",
              z: "#,##0",
              s: styleDataCellRight,
            },
            {
              v: num(dtl.J_Seaming),
              t: "n",
              z: "#,##0",
              s: styleDataCellRight,
            },
            {
              v: num(dtl.J_MataAyam),
              t: "n",
              z: "#,##0",
              s: styleDataCellRight,
            },
            {
              v: num(dtl.J_Coly),
              t: "n",
              z: "#,##0",
              s: styleDataCellRight,
            },
            {
              v: num(dtl.J_Bs),
              t: "n",
              z: "#,##0",
              s: styleDataCellRight,
            },
            {
              v: num(dtl.Mata_Ayam),
              t: "n",
              z: "#,##0",
              s: styleDataCellRight,
            },
            {
              v: num(dtl.XBanner),
              t: "n",
              z: "#,##0",
              s: styleDataCellRight,
            },
            {
              v: num(dtl.Plastik),
              t: "n",
              z: "#,##0",
              s: styleDataCellRight,
            },
          ];
          worksheetData.push(row);
        });
      } else {
        const row = [
          { v: header.Nomor, s: styleDataCellCenter },
          { v: tglHeader, s: styleDataCellCenter },
          { v: header.Gudang || "-", s: styleDataCellCenter },
          { v: header.Nama_Gudang || "-", s: styleDataCell },
          { v: header.Shift || "-", s: styleDataCellCenter },
          { v: header.Operator || "-", s: styleDataCell },
          { v: "-", s: styleDataCellCenter },
          { v: "Tidak ada data detail pekerjaan", s: styleDataCell },
          { v: 0, t: "n", z: "#,##0.00", s: styleDataCellRight },
          { v: 0, t: "n", z: "#,##0.00", s: styleDataCellRight },
          { v: 0, t: "n", z: "#,##0", s: styleDataCellRight },
          { v: 0, t: "n", z: "#,##0", s: styleDataCellRight },
          { v: 0, t: "n", z: "#,##0", s: styleDataCellRight },
          { v: 0, t: "n", z: "#,##0", s: styleDataCellRight },
          { v: 0, t: "n", z: "#,##0", s: styleDataCellRight },
          { v: 0, t: "n", z: "#,##0", s: styleDataCellRight },
          { v: 0, t: "n", z: "#,##0", s: styleDataCellRight },
          { v: 0, t: "n", z: "#,##0", s: styleDataCellRight },
          { v: 0, t: "n", z: "#,##0", s: styleDataCellRight },
        ];
        worksheetData.push(row);
      }
    });

    const ws = XLSX.utils.aoa_to_sheet(worksheetData);
    ws["!merges"] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 18 } }];
    ws["!cols"] = [
      { wch: 22 },
      { wch: 14 },
      { wch: 15 },
      { wch: 20 },
      { wch: 8 },
      { wch: 18 },
      { wch: 18 },
      { wch: 35 },
      { wch: 10 },
      { wch: 10 },
      { wch: 12 },
      { wch: 12 },
      { wch: 12 },
      { wch: 15 },
      { wch: 12 },
      { wch: 12 },
      { wch: 15 },
      { wch: 15 },
      { wch: 15 },
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "LHK_Finishing");
    XLSX.writeFile(wb, fileName);
    toast.success("Excel Detail Finishing berhasil diunduh");
  } catch (error) {
    console.error("Export Error:", error);
    toast.error("Gagal mengekspor data ke Excel.");
  } finally {
    loading.value.headers = false;
  }
};

const handleNewEdit = (mode: "new" | "edit" | "rekap") => {
  if (mode === "new") {
    router.push({ name: 'LhkFinishingCreate' });
  } else if (mode === "rekap") {
    router.push({ name: "LhkFinishingRekap" });
  } else if (mode === "edit") {
    if (selectedNomor.value) {
      router.push({
        name: 'LhkFinishingEdit',
        params: { nomor: selectedNomor.value },
      });
    } else {
      toast.warning("Pilih data yang ingin diubah terlebih dahulu.");
    }
  }
};

const handleAccClick = () => {
  if (selectedNomor.value) {
    router.push({
      name: "LhkFinishingAcc",
      params: { nomor: selectedNomor.value },
    });
  } else {
    toast.warning("Pilih data terlebih dahulu.");
  }
};

const handleDelete = async () => {
  if (!selectedNomor.value) return;
  if (
    confirm(`Yakin ingin menghapus LHK Finishing nomor ${selectedNomor.value}?`)
  ) {
    try {
      await api.delete(`${API_BASE_URL}/${selectedNomor.value}`);
      toast.success(`LHK ${selectedNomor.value} berhasil dihapus.`);
      await fetchHeaders();
    } catch (error) {
      console.error(error);
      toast.error("Gagal menghapus data.");
    }
  }
};

const handlePrint = () => {
  if (!selectedNomor.value) return;
  alert(`TODO: Cetak LHK ${selectedNomor.value}`);
};

onMounted(() => {
  fetchHeaders();
});

watch(filters, fetchHeaders, { deep: true });
</script>

<style scoped>
.text-red {
  color: #f44336 !important;
}
.font-weight-bold {
  font-weight: bold !important;
}

.row-selected {
  background-color: #d8efff !important;
}
:deep(.row-selected td) {
  background-color: #d8efff !important;
}
:deep(.v-data-table__tr.row-selected:hover > td) {
  background-color: #c0e4ff !important;
}
</style>
