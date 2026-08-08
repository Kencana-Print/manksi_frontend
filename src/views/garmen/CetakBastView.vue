<script setup lang="ts">
import { ref } from "vue";
import { useRouter } from "vue-router";
import { useToast } from "vue-toastification";
import BaseBrowse from "@/components/BaseBrowse.vue";
import { useBrowse } from "@/composables/useBrowse";
import { bastService } from "@/services/garmen/bastService";
import { IconPrinter, IconFileSpreadsheet } from "@tabler/icons-vue";
import { formatTanggal } from "@/utils/dateFormat";
import { exportExcelSingle, type ExcelColumn } from "@/utils/excelExport";

const router = useRouter();
const toast = useToast();
const menuId = "117";

const getLocalDate = () => new Date().toISOString().substring(0, 10);

const filterState = ref({
  startDate: getLocalDate(),
  endDate: getLocalDate(),
  onProgress: false,
});

const { items, isLoading, selected, canInsert, canEdit, canDelete, fetchData } =
  useBrowse({
    menuId,
    fetchApi: async () => {
      // MENGGUNAKAN SERVICE
      const res = await bastService.getBrowseList({
        startDate: filterState.value.startDate,
        endDate: filterState.value.endDate,
        onProgress: filterState.value.onProgress,
      });
      return res.data.data || [];
    },
    immediate: true,
  });

const headers = [
  { title: "Nomor", key: "Nomor", width: "160px" },
  { title: "Divisi", key: "Divisi", width: "100px" },
  { title: "Tipe", key: "Tipe", width: "80px" },
  { title: "Tanggal", key: "Tanggal", width: "100px" },
  { title: "Status BAST", key: "CetakBAST", width: "100px", align: "center" },
  { title: "Nama Pekerjaan", key: "NamaPekerjaan", width: "250px" },
  { title: "Nama Ext", key: "NamaExt", width: "250px" },
  { title: "Ukuran", key: "Ukuran", width: "150px" },
  { title: "Gramasi", key: "Gramasi", width: "130px" },
  { title: "Gramasi Aktual", key: "GramasiSetting_Aktual", width: "150px" },
  { title: "Kain", key: "Kain", width: "180px" },
  { title: "Finishing", key: "Finishing", width: "150px" },
  { title: "Jumlah", key: "Jumlah", width: "80px", align: "right" },
  { title: "Keterangan", key: "Keterangan", width: "200px" },
  { title: "Kendala", key: "kendalaProduksi", width: "200px" },
];

const getRowTextColor = (item: any) => {
  const row = item?.raw || item;
  // Delphi logic: OnProgres='N' -> Red, OnProgres='Y' -> Blue
  if (row.OnProgres === "N") return "text-red-darken-2";
  if (row.OnProgres === "Y") return "text-blue-darken-2";
  return "";
};

// ── AKSI ──
const goAdd = () => router.push({ name: "CetakBastFormCreate" });
const goEdit = (item: any) =>
  router.push({ name: "CetakBastFormEdit", params: { nomor: item.Nomor } });

const goDelete = async (item: any) => {
  if (!confirm(`Yakin hapus BAST untuk MAP ${item.Nomor}?`)) return;
  try {
    // MENGGUNAKAN SERVICE
    await bastService.deleteBast(item.Nomor);
    toast.success("Berhasil dihapus.");
    fetchData();
  } catch (e: any) {
    toast.error(e.response?.data?.message || "Gagal menghapus.");
  }
};

const cetak = () => {
  if (selected.value.length === 0) return;
  const nomor = selected.value[0].Nomor;
  window.open(
    `/garmen/cetak-bast/print/${encodeURIComponent(nomor)}`,
    "_blank",
  );
};

// ── EXPORT HEADER (MASTER) ──
const isExportingHeader = ref(false);
const onExportHeader = async () => {
  if (!items.value || items.value.length === 0) {
    return toast.warning("Tidak ada data untuk diexport.");
  }
  isExportingHeader.value = true;
  try {
    const columns: ExcelColumn[] = [
      { header: "Nomor", key: "Nomor", width: 18 },
      { header: "Divisi", key: "Divisi", width: 12 },
      { header: "Tipe", key: "Tipe", width: 10, align: "center" },
      { header: "Tanggal", key: "Tanggal", width: 12, align: "center" },
      { header: "Status BAST", key: "CetakBAST", width: 14, align: "center" },
      { header: "Nama Pekerjaan", key: "NamaPekerjaan", width: 30 },
      { header: "Nama Ext", key: "NamaExt", width: 30 },
      { header: "Ukuran", key: "Ukuran", width: 16 },
      { header: "Gramasi", key: "Gramasi", width: 14 },
      { header: "Gramasi Aktual", key: "GramasiSetting_Aktual", width: 16 },
      { header: "Kain", key: "Kain", width: 22 },
      { header: "Finishing", key: "Finishing", width: 20 },
      {
        header: "Jumlah",
        key: "Jumlah",
        width: 10,
        align: "right",
        numFmt: "#,##0",
      },
      { header: "Keterangan", key: "Keterangan", width: 24 },
      { header: "Kendala", key: "kendalaProduksi", width: 24 },
    ];

    const formattedData = items.value.map((item) => ({
      ...item,
      Tanggal: formatTanggal(item.Tanggal),
    }));

    await exportExcelSingle(
      `BAST_Header_${filterState.value.startDate}_to_${filterState.value.endDate}.xlsx`,
      "Data BAST",
      columns,
      formattedData,
      `LAPORAN BAST MAP (HEADER) | Periode: ${formatTanggal(filterState.value.startDate)} s.d ${formatTanggal(filterState.value.endDate)}`,
    );
    toast.success("Berhasil export header BAST.");
  } catch {
    toast.error("Gagal export header.");
  } finally {
    isExportingHeader.value = false;
  }
};

// ── EXPORT DETAIL ──
const isExportingDetail = ref(false);
const onExportDetail = async () => {
  isExportingDetail.value = true;
  try {
    const res = await bastService.getExportDetail({
      startDate: filterState.value.startDate,
      endDate: filterState.value.endDate,
      onProgress: filterState.value.onProgress,
    });

    const allData: any[] = res.data.data || [];
    if (!allData.length) {
      toast.warning("Tidak ada data detail pada filter ini.");
      return;
    }

    const combinedRows: any[] = [];

    allData.forEach((master) => {
      // Data Header/Master yang hanya muncul di baris pertama
      const masterCells = {
        Nomor: master.Nomor,
        Divisi: master.Divisi,
        Tipe: master.Tipe,
        Tanggal: formatTanggal(master.Tanggal),
        CetakBAST: master.CetakBAST,
        NamaPekerjaan: master.NamaPekerjaan,
        NamaExt: master.NamaExt,
        Ukuran: master.Ukuran,
        Gramasi: master.Gramasi,
        GramasiSetting_Aktual: master.GramasiSetting_Aktual,
        Kain: master.Kain,
        Finishing: master.Finishing,
        Jumlah: Number(master.Jumlah) || 0,
        Keterangan: master.Keterangan,
        kendalaProduksi: master.kendalaProduksi,
      };

      // Baris blanko untuk detail kedua dan seterusnya
      const blankMaster = Object.fromEntries(
        Object.keys(masterCells).map((k) => [k, ""]),
      );

      if (master.details && master.details.length > 0) {
        master.details.forEach((dtl: any, idx: number) => {
          combinedRows.push({
            ...(idx === 0 ? masterCells : blankMaster),
            JenisDetail: dtl.Jenis,
            KodeBahan: dtl.Kode,
            NamaBahan: dtl.Nama,
            Satuan: dtl.Satuan,
            Qty: Number(dtl.Qty) || 0,
          });
        });
      } else {
        // Jika BAST tidak punya detail bahan sama sekali
        combinedRows.push({
          ...masterCells,
          JenisDetail: "",
          KodeBahan: "",
          NamaBahan: "",
          Satuan: "",
          Qty: "",
        });
      }
    });

    const columns: ExcelColumn[] = [
      { header: "Nomor", key: "Nomor", width: 16 },
      { header: "Divisi", key: "Divisi", width: 12 },
      { header: "Tipe", key: "Tipe", width: 10, align: "center" },
      { header: "Tanggal", key: "Tanggal", width: 12, align: "center" },
      { header: "Status BAST", key: "CetakBAST", width: 12, align: "center" },
      { header: "Nama Pekerjaan", key: "NamaPekerjaan", width: 26 },
      { header: "Nama Ext", key: "NamaExt", width: 26 },
      { header: "Ukuran", key: "Ukuran", width: 14 },
      { header: "Gramasi", key: "Gramasi", width: 12 },
      { header: "Gramasi Aktual", key: "GramasiSetting_Aktual", width: 14 },
      { header: "Kain", key: "Kain", width: 18 },
      { header: "Finishing", key: "Finishing", width: 18 },
      {
        header: "Jumlah",
        key: "Jumlah",
        width: 10,
        align: "right",
        numFmt: "#,##0",
      },
      {
        header: "Jenis Rincian",
        key: "JenisDetail",
        width: 14,
        align: "center",
      },
      { header: "Kode Bahan", key: "KodeBahan", width: 14 },
      { header: "Nama Bahan", key: "NamaBahan", width: 26 },
      { header: "Sat", key: "Satuan", width: 8, align: "center" },
      {
        header: "Qty",
        key: "Qty",
        width: 10,
        align: "right",
        numFmt: "#,##0.00",
      },
    ];

    await exportExcelSingle(
      `BAST_Detail_${filterState.value.startDate}_to_${filterState.value.endDate}.xlsx`,
      "Detail BAST",
      columns,
      combinedRows,
      `RINCIAN BAST MAP | Periode: ${formatTanggal(filterState.value.startDate)} s.d ${formatTanggal(filterState.value.endDate)}`,
    );
    toast.success("Berhasil export detail BAST.");
  } catch {
    toast.error("Gagal export detail.");
  } finally {
    isExportingDetail.value = false;
  }
};
</script>

<template>
  <BaseBrowse
    title="Cetak BAST MAP"
    :menu-id="menuId"
    :icon="IconPrinter"
    :headers="headers"
    :items="items ?? []"
    item-value="Nomor"
    :is-loading="isLoading"
    v-model:selected="selected"
    v-model:filterState="filterState"
    :can-insert="canInsert"
    :can-edit="canEdit"
    :can-delete="canDelete"
    :row-text-color-fn="getRowTextColor"
    @refresh="fetchData"
    @add="goAdd"
    @edit="goEdit"
    @delete="goDelete"
    @export="onExportHeader"
  >
    <template #filter-left>
      <div class="filter-group">
        <span class="filter-label">Tanggal MAP</span>
        <input
          type="date"
          v-model="filterState.startDate"
          class="date-inp"
          @change="fetchData"
          :disabled="filterState.onProgress"
        />
        <span class="filter-sep">s/d</span>
        <input
          type="date"
          v-model="filterState.endDate"
          class="date-inp"
          @change="fetchData"
          :disabled="filterState.onProgress"
        />
      </div>

      <v-checkbox
        v-model="filterState.onProgress"
        label="Tampilkan saja BAST MAP On Progress"
        density="compact"
        hide-details
        class="ml-4 cust-cb"
        @change="fetchData"
      ></v-checkbox>

      <div class="filter-divider"></div>

      <div class="legend-group">
        <div class="legend-item">
          <div class="legend-box bg-red"></div>
          <span>= On Progress</span>
        </div>
        <div class="legend-item">
          <div class="legend-box bg-blue"></div>
          <span>= Sudah Approval</span>
        </div>
      </div>
    </template>

    <template #extra-actions>
      <v-btn
        size="small"
        variant="flat"
        color="blue-grey"
        :disabled="selected.length === 0"
        @click="cetak"
      >
        <template #prepend
          ><IconPrinter :size="15" :stroke-width="1.7"
        /></template>
        Cetak
      </v-btn>
      <v-btn
        size="small"
        variant="flat"
        color="green-darken-1"
        :loading="isExportingDetail"
        @click="onExportDetail"
      >
        <template #prepend
          ><IconFileSpreadsheet :size="15" :stroke-width="1.7"
        /></template>
        Export Detail
      </v-btn>
    </template>

    <template #item.Tanggal="{ item }">
      {{ formatTanggal(item.Tanggal) }}
    </template>
    <template #item.CetakBAST="{ item }">
      <v-chip
        v-if="item.CetakBAST"
        color="success"
        size="x-small"
        label
        class="font-weight-bold"
        >SUDAH</v-chip
      >
    </template>
  </BaseBrowse>
</template>

<style scoped>
.filter-group {
  display: flex;
  align-items: center;
  gap: 6px;
}
.filter-label {
  font-size: 11px;
  font-weight: 700;
  color: #555;
}
.date-inp {
  height: 28px;
  border: 1px solid #ccc;
  border-radius: 4px;
  padding: 0 6px;
  font-size: 12px;
  background: white;
  outline: none;
}
.filter-divider {
  width: 1px;
  height: 24px;
  background-color: #d0d0d0;
  margin: 0 12px;
}
.legend-group {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 11px;
  font-weight: 500;
}
.legend-item {
  display: flex;
  align-items: center;
  gap: 4px;
}
.legend-box {
  width: 14px;
  height: 14px;
  border-radius: 2px;
}
.bg-red {
  background-color: #d32f2f;
}
.bg-blue {
  background-color: #1976d2;
}

/* Menyesuaikan ukuran font checkbox agar serasi */
.cust-cb :deep(.v-label) {
  font-size: 11px !important;
  font-weight: 600;
  opacity: 1;
  color: #333;
}
.cust-cb :deep(.v-selection-control) {
  min-height: unset;
}
</style>
