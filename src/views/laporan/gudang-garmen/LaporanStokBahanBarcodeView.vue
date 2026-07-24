<script setup lang="ts">
import { ref, watch, onMounted } from "vue";
import { useToast } from "vue-toastification";
import BaseBrowse from "@/components/BaseBrowse.vue";
import { useBrowse } from "@/composables/useBrowse";
import { laporanStokBahanBarcodeService } from "@/services/laporan/gudang-garmen/laporanStokBahanBarcodeService";
import { IconEdit, IconX, IconDatabase } from "@tabler/icons-vue";
import { exportExcelSingle, type ExcelColumn } from "@/utils/excelExport";
import { formatTanggal } from "@/utils/dateFormat";

const toast = useToast();

const getLocalDate = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const filterState = ref({
  endDate: getLocalDate(),
  tampilkanKosong: false,
  janganTampilkanKosongDetail: true,
});

// Cache & Loading State Expand Detail
const expandedRows = ref<any[]>([]);
const detailsCache = ref<Record<string, any[]>>({});
const loadingDetails = ref(new Set<string>());
const mkbDetailCache = ref<Record<string, any[]>>({});
const loadingMkbDetail = ref(new Set<string>());

// Dialog Update Keterangan
const dialogKeterangan = ref(false);
const isLoadingKeterangan = ref(false);
const barcodeItems = ref<any[]>([]);
const selectedBahan = ref({ kode: "", nama: "" });

const headers = [
  { title: "KODE", key: "Kode", width: "120px" },
  { title: "NAMA BAHAN", key: "Nama", minWidth: "250px" },
  { title: "SATUAN", key: "Satuan", width: "90px", align: "center" },
  { title: "WARNA", key: "Warna", width: "130px" },
  { title: "GRAMASI", key: "Gramasi", width: "100px" },
  { title: "SETTING", key: "Setting", width: "100px" },
  { title: "BUFFER", key: "Buffer", width: "90px", align: "right" },
  { title: "IN", key: "Masuk_In", width: "100px", align: "right" },
  { title: "OUT", key: "Keluar_Out", width: "100px", align: "right" },
  { title: "STOK", key: "Stok", width: "100px", align: "right" },
  {
    title: "MKB BELUM REALISASI",
    key: "MkbBelumRealisasi",
    width: "150px",
    align: "right",
  },
];

const fetchApi = async () => {
  const res = await laporanStokBahanBarcodeService.getBrowse({
    endDate: filterState.value.endDate,
    tampilkanKosong: filterState.value.tampilkanKosong,
  });
  detailsCache.value = {}; // Reset cache saat master di-refresh
  expandedRows.value = [];
  return res.data?.data || [];
};

const { items, isLoading, selected, fetchData } = useBrowse({
  menuId: "501",
  fetchApi,
  immediate: false,
});

onMounted(() => fetchData());

// Trigger reload otomatis saat filter berubah
watch(filterState, () => fetchData(), { deep: true });

// Handler Rincian Barcode saat Baris di-Expand
const onUpdateExpanded = async (newExpanded: any[]) => {
  expandedRows.value = newExpanded;
  const newlyExpanded = newExpanded.filter(
    (item) =>
      !detailsCache.value[item.Kode] && !loadingDetails.value.has(item.Kode),
  );
  for (const item of newlyExpanded) {
    const kodeBahan = item.Kode;
    loadingDetails.value.add(kodeBahan);
    loadingMkbDetail.value.add(kodeBahan);
    try {
      const [resBarcode, resMkb] = await Promise.all([
        laporanStokBahanBarcodeService.getBrowseDetail(kodeBahan, {
          endDate: filterState.value.endDate,
          janganTampilkanKosongDetail:
            filterState.value.janganTampilkanKosongDetail,
        }),
        laporanStokBahanBarcodeService.getMkbBelumRealisasiDetail(kodeBahan),
      ]);
      detailsCache.value[kodeBahan] = resBarcode.data?.data || [];
      mkbDetailCache.value[kodeBahan] = resMkb.data?.data || [];
    } catch {
      toast.error(`Gagal memuat rincian untuk kode ${kodeBahan}`);
    } finally {
      loadingDetails.value.delete(kodeBahan);
      loadingMkbDetail.value.delete(kodeBahan);
    }
  }
};

// Open Dialog Update Keterangan
const openUpdateKeterangan = async () => {
  if (selected.value.length === 0) return;
  const row = selected.value[0];
  selectedBahan.value = { kode: row.Kode, nama: row.Nama };

  barcodeItems.value = [];
  dialogKeterangan.value = true;
  isLoadingKeterangan.value = true;
  try {
    const res = await laporanStokBahanBarcodeService.getKeteranganList(
      row.Kode,
    );
    barcodeItems.value = res.data?.data || [];
  } catch {
    toast.error("Gagal mengambil data rincian barcode.");
    dialogKeterangan.value = false;
  } finally {
    isLoadingKeterangan.value = false;
  }
};

const saveKeterangan = async () => {
  if (barcodeItems.value.length === 0) return;
  isLoadingKeterangan.value = true;
  try {
    await laporanStokBahanBarcodeService.updateKeteranganList(
      barcodeItems.value,
    );
    toast.success("Berhasil menyimpan keterangan barcode.");
    dialogKeterangan.value = false;
    fetchData(); // Refresh data master
  } catch (error: any) {
    toast.error(error.response?.data?.message || "Gagal menyimpan data.");
  } finally {
    isLoadingKeterangan.value = false;
  }
};

const fmtNum = (val: any) =>
  new Intl.NumberFormat("id-ID").format(Number(val) || 0);

const isExporting = ref(false);
const onExport = async () => {
  if (!items.value || items.value.length === 0) {
    return toast.warning("Tidak ada data untuk diexport.");
  }
  isExporting.value = true;
  try {
    const columns: ExcelColumn[] = [
      { header: "Kode", key: "Kode", width: 14 },
      { header: "Nama Bahan", key: "Nama", width: 32 },
      { header: "Satuan", key: "Satuan", width: 10, align: "center" },
      { header: "Warna", key: "Warna", width: 16 },
      { header: "Gramasi", key: "Gramasi", width: 14 },
      { header: "Setting", key: "Setting", width: 14 },
      {
        header: "Buffer",
        key: "Buffer",
        width: 12,
        align: "right",
        numFmt: "#,##0",
      },
      {
        header: "In",
        key: "Masuk_In",
        width: 12,
        align: "right",
        numFmt: "#,##0",
      },
      {
        header: "Out",
        key: "Keluar_Out",
        width: 12,
        align: "right",
        numFmt: "#,##0",
      },
      {
        header: "Stok",
        key: "Stok",
        width: 12,
        align: "right",
        numFmt: "#,##0",
      },
      {
        header: "MKB Belum Realisasi",
        key: "MkbBelumRealisasi",
        width: 18,
        align: "right",
        numFmt: "#,##0",
      },
    ];

    const rows = items.value.map((it: any) => ({
      Kode: it.Kode,
      Nama: it.Nama,
      Satuan: it.Satuan,
      Warna: it.Warna,
      Gramasi: it.Gramasi,
      Setting: it.Setting,
      Buffer: Number(it.Buffer) || 0,
      Masuk_In: Number(it.Masuk_In) || 0,
      Keluar_Out: Number(it.Keluar_Out) || 0,
      Stok: Number(it.Stok) || 0,
      MkbBelumRealisasi: Number(it.MkbBelumRealisasi) || 0,
    }));

    await exportExcelSingle(
      `Laporan_Stok_Bahan_Barcode_${filterState.value.endDate}.xlsx`,
      "Stok Bahan Barcode",
      columns,
      rows,
      `Laporan Stok Bahan Barcode  |  Per Tanggal: ${formatTanggal(filterState.value.endDate)}`,
    );

    toast.success("Berhasil export data.");
  } catch (e) {
    console.error(e);
    toast.error("Terjadi kesalahan saat export.");
  } finally {
    isExporting.value = false;
  }
};
</script>

<template>
  <BaseBrowse
    title="Laporan Stok Bahan Barcode"
    menu-id="501"
    :headers="headers"
    :items="items ?? []"
    :is-loading="isLoading"
    item-value="Kode"
    v-model:filter-state="filterState"
    v-model:selected="selected"
    show-expand
    :expanded="expandedRows"
    can-export
    @update:expanded="onUpdateExpanded"
    @export="onExport"
    @refresh="fetchData"
  >
    <template #filter-left>
      <div class="filter-group">
        <input type="date" v-model="filterState.endDate" class="date-inp" />

        <label class="chk-lbl">
          <input type="checkbox" v-model="filterState.tampilkanKosong" />
          Tampilkan Stok Kosong
        </label>

        <label class="chk-lbl border-l pl-3">
          <input
            type="checkbox"
            v-model="filterState.janganTampilkanKosongDetail"
          />
          Jangan Tampilkan Stok Kosong di Detail
        </label>
      </div>
    </template>

    <template #extra-actions="{ selected }">
      <v-btn
        size="small"
        color="orange-darken-2"
        :disabled="selected.length === 0"
        @click="openUpdateKeterangan"
      >
        <template #prepend><IconEdit :size="15" /></template>
        Update Keterangan
      </v-btn>
    </template>

    <template #item.Buffer="{ item }">{{ fmtNum(item.Buffer) }}</template>
    <template #item.Masuk_In="{ item }">{{ fmtNum(item.Masuk_In) }}</template>
    <template #item.Keluar_Out="{ item }">{{
      fmtNum(item.Keluar_Out)
    }}</template>
    <template #item.Stok="{ item }">{{ fmtNum(item.Stok) }}</template>
    <template #item.MkbBelumRealisasi="{ item }">
      <span
        :class="{ 'text-mkb-outstanding': Number(item.MkbBelumRealisasi) > 0 }"
        >{{ fmtNum(item.MkbBelumRealisasi) }}</span
      >
    </template>

    <template #detail="{ item }">
      <div class="expand-container pa-3 bg-grey-lighten-4">
        <div class="detail-side-by-side">
          <!-- ── MKB Belum Realisasi ── -->
          <div v-if="item.MkbBelumRealisasi > 0" class="detail-col">
            <v-progress-linear
              v-if="loadingMkbDetail.has(item.Kode)"
              indeterminate
              color="orange"
              height="2"
              class="mb-2"
            />
            <div
              v-else
              class="border rounded overflow-hidden shadow-sm bg-white h-100"
            >
              <div
                class="detail-header px-3 py-1-5 bg-orange-darken-3 text-white font-weight-bold d-flex align-center gap-2"
              >
                MKB Belum Realisasi: {{ item.Kode }} - {{ item.Nama }}
              </div>
              <div class="overflow-x-auto">
                <table class="detail-nested-table">
                  <thead>
                    <tr>
                      <th>NO MKB</th>
                      <th class="text-center">TGL MKB</th>
                      <th>SPK</th>
                      <th>NAMA SPK</th>
                      <th class="text-right">BUTUH</th>
                      <th class="text-right">READY</th>
                      <th class="text-right">TERIMA</th>
                      <th class="text-right">KURANG</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr
                      v-for="row in mkbDetailCache[item.Kode]"
                      :key="row.NomorMkb"
                    >
                      <td
                        class="font-monospace text-orange-darken-4 font-weight-medium"
                      >
                        {{ row.NomorMkb }}
                      </td>
                      <td class="text-center">
                        {{ formatTanggal(row.TglMkb) }}
                      </td>
                      <td>{{ row.Spk }}</td>
                      <td>{{ row.NamaSpk }}</td>
                      <td class="text-right">{{ fmtNum(row.Butuh) }}</td>
                      <td class="text-right">{{ fmtNum(row.Ready) }}</td>
                      <td class="text-right">{{ fmtNum(row.Terima) }}</td>
                      <td class="text-right font-weight-bold text-error">
                        {{ fmtNum(row.Kurang) }}
                      </td>
                    </tr>
                    <tr
                      v-if="
                        !mkbDetailCache[item.Kode] ||
                        mkbDetailCache[item.Kode].length === 0
                      "
                    >
                      <td
                        colspan="8"
                        class="text-center text-grey pa-3 font-italic"
                      >
                        Tidak ada MKB outstanding.
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <!-- ── Rincian Barcode ── -->
          <div class="detail-col">
            <v-progress-linear
              v-if="loadingDetails.has(item.Kode)"
              indeterminate
              color="primary"
              height="2"
              class="mb-2"
            />
            <div
              v-else
              class="border rounded overflow-hidden shadow-sm bg-white h-100"
            >
              <div
                class="detail-header px-3 py-1-5 bg-blue-grey-darken-3 text-white font-weight-bold d-flex align-center gap-2"
              >
                <IconDatabase :size="14" />
                Rincian Barcode: {{ item.Kode }} - {{ item.Nama }}
              </div>
              <div class="overflow-x-auto">
                <table class="detail-nested-table">
                  <thead>
                    <tr>
                      <th>KODE</th>
                      <th>BARCODE</th>
                      <th class="text-center">FIRST IN</th>
                      <th class="text-right">IN</th>
                      <th class="text-center">LAST OUT</th>
                      <th class="text-right">OUT</th>
                      <th class="text-right">STOK</th>
                      <th>NOMOR PO / TANGGAL</th>
                      <th>KETERANGAN</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr
                      v-for="row in detailsCache[item.Kode]"
                      :key="row.Barcode"
                    >
                      <td
                        class="font-monospace text-blue-darken-3 font-weight-medium"
                      >
                        {{ row.Kode || item.Kode }}
                      </td>
                      <td class="font-monospace">{{ row.Barcode }}</td>
                      <td class="text-center text-grey-darken-2">
                        {{ row.Firts_In ? formatTanggal(row.Firts_In) : "-" }}
                      </td>
                      <td class="text-right font-weight-medium text-success">
                        {{ fmtNum(row.IN) }}
                      </td>
                      <td class="text-center text-grey-darken-2">
                        {{ row.Last_Out ? formatTanggal(row.Last_Out) : "-" }}
                      </td>
                      <td class="text-right font-weight-medium text-error">
                        {{ fmtNum(row.OUT) }}
                      </td>
                      <td
                        class="text-right font-weight-bold"
                        :class="
                          row.Stok > 0 ? 'text-blue-darken-4' : 'text-grey'
                        "
                      >
                        {{ fmtNum(row.Stok) }}
                      </td>
                      <td>{{ row.NomorPO || "-" }}</td>
                      <td
                        class="text-truncate text-grey-darken-2"
                        style="max-width: 250px"
                        :title="row.Keterangan"
                      >
                        {{ row.Keterangan || "-" }}
                      </td>
                    </tr>
                    <tr
                      v-if="
                        !detailsCache[item.Kode] ||
                        detailsCache[item.Kode].length === 0
                      "
                    >
                      <td
                        colspan="9"
                        class="text-center text-grey pa-3 font-italic"
                      >
                        Tidak ada rincian data barcode untuk spesifikasi filter
                        ini.
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>
  </BaseBrowse>

  <v-dialog v-model="dialogKeterangan" max-width="900px" persistent>
    <v-card class="rounded-lg">
      <v-card-title
        class="bg-orange-darken-2 text-white pa-3 d-flex align-center justify-space-between"
      >
        <span class="text-subtitle-1 font-weight-bold"
          >Update Keterangan Per Barcode (F10)</span
        >
        <v-btn
          icon
          variant="text"
          color="white"
          density="compact"
          @click="dialogKeterangan = false"
        >
          <IconX :size="18" />
        </v-btn>
      </v-card-title>

      <v-card-text class="pa-4 bg-grey-lighten-4">
        <div class="d-flex gap-4 mb-3 bg-white pa-3 border rounded">
          <div>
            <span class="text-caption text-grey d-block">Kode Bahan</span>
            <span class="text-body-2 font-weight-bold text-blue-darken-4">{{
              selectedBahan.kode
            }}</span>
          </div>
          <div class="border-l pl-4">
            <span class="text-caption text-grey d-block">Nama Bahan</span>
            <span class="text-body-2 font-weight-medium">{{
              selectedBahan.nama
            }}</span>
          </div>
        </div>

        <div
          class="border rounded overflow-hidden bg-white shadow-sm"
          style="max-height: 400px; overflow-y: auto"
        >
          <div v-if="isLoadingKeterangan" class="pa-5 text-center text-grey">
            <v-progress-circular
              indeterminate
              color="primary"
              size="24"
              class="mr-2"
            />
            <span>Memuat data barcode...</span>
          </div>

          <table v-else class="detail-nested-table w-100">
            <thead style="position: sticky; top: 0; z-index: 2">
              <tr>
                <th style="width: 50px" class="text-center">NO</th>
                <th style="width: 200px">BARCODE</th>
                <th style="width: 120px" class="text-right">STOK</th>
                <th>KETERANGAN</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="(subRow, subIdx) in barcodeItems"
                :key="subRow.Barcode"
              >
                <td class="text-center text-grey">{{ subIdx + 1 }}</td>
                <td class="font-monospace font-weight-medium">
                  {{ subRow.Barcode }}
                </td>
                <td class="text-right font-weight-bold text-blue-darken-3">
                  {{ fmtNum(subRow.Stok) }}
                </td>
                <td class="pa-1">
                  <input
                    v-model="subRow.Keterangan"
                    type="text"
                    class="grid-cell-input-text"
                    placeholder="Ketik keterangan di sini..."
                    @keydown.enter.prevent
                  />
                </td>
              </tr>
              <tr v-if="barcodeItems.length === 0">
                <td colspan="4" class="text-center text-grey pa-4 font-italic">
                  Tidak ada rincian barcode aktif untuk bahan ini.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </v-card-text>

      <v-card-actions class="pa-3 bg-white border-t">
        <v-spacer />
        <v-btn
          variant="text"
          :disabled="isLoadingKeterangan"
          @click="dialogKeterangan = false"
          >Batal</v-btn
        >
        <v-btn
          color="orange-darken-3"
          variant="elevated"
          :loading="isLoadingKeterangan"
          :disabled="barcodeItems.length === 0"
          class="px-5 font-weight-bold"
          @click="saveKeterangan"
        >
          Simpan Data (F10)
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.filter-group {
  display: flex;
  align-items: center;
  gap: 12px;
}
.date-inp {
  height: 30px;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 4px;
  padding: 0 8px;
  font-size: 12px;
  background: rgb(var(--v-theme-surface));
  color: rgb(var(--v-theme-on-surface));
  outline: none;
  cursor: pointer;
}
.date-inp:focus {
  border-color: rgb(var(--v-theme-primary));
}
.chk-lbl {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
}
.chk-lbl input[type="checkbox"] {
  accent-color: rgb(var(--v-theme-primary));
  cursor: pointer;
}
.border-l {
  border-left: 1px solid #d0d0d0;
}
.gap-2 {
  gap: 8px;
}
.text-mkb-outstanding {
  color: #e65100;
  font-weight: 700;
}

/* Styling Detail Table Nested */
.detail-header {
  font-size: 11px;
  letter-spacing: 0.02em;
}
.py-1-5 {
  padding-top: 6px;
  padding-bottom: 6px;
}
.detail-nested-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 11px;
}
.detail-nested-table th {
  background: #455a64;
  color: white;
  padding: 6px 10px;
  font-weight: 700;
  text-align: left;
  white-space: nowrap;
}
.detail-nested-table td {
  padding: 5px 10px;
  border-bottom: 1px solid #e0e0e0;
  border-right: 1px solid #f5f5f5;
  white-space: nowrap;
}
.detail-nested-table tbody tr:hover {
  background: #f5f6f8;
}

.grid-cell-input-text {
  width: 100%;
  height: 26px;
  border: 1px solid #ccc;
  border-radius: 3px;
  padding: 0 6px;
  font-size: 11px;
  background: white;
  outline: none;
  box-sizing: border-box;
}
.grid-cell-input-text:focus {
  border-color: rgb(var(--v-theme-primary));
  background: #fdfdfd;
}

.detail-side-by-side {
  display: flex;
  gap: 12px;
  align-items: flex-start;
  flex-wrap: wrap;
}
.detail-col {
  flex: 1 1 480px;
  min-width: 0;
}
.h-100 {
  height: 100%;
}
</style>
