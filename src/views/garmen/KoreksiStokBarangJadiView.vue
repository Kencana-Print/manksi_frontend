<script setup lang="ts">
import { ref } from "vue";
import { useRouter } from "vue-router";
import { useToast } from "vue-toastification";
import BaseBrowse from "@/components/BaseBrowse.vue";
import { useBrowse } from "@/composables/useBrowse";
import { koreksiStokBarangJadiService } from "@/services/garmen/koreksiStokBarangJadiService";
import { exportExcelSingle, type ExcelColumn } from "@/utils/excelExport";
import {
  IconSettings,
  IconPrinter,
  IconFileSpreadsheet,
} from "@tabler/icons-vue";
import { formatTanggal } from "@/utils/dateFormat";

const router = useRouter();
const toast = useToast();

const getLocalDate = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
const getAwalBulan = () => {
  const d = new Date();
  return getLocalDate(new Date(d.getFullYear(), d.getMonth(), 1));
};

// --- STATE FILTER --- (⚠️ hanya tanggal — modul ini tidak punya filter
// cabang/jenis sama sekali di source .pas, beda dari Koreksi Stok Garmen)
const filterState = ref({
  startDate: getAwalBulan(),
  endDate: getLocalDate(),
});

// --- KOMPOSISI BROWSE ---
const {
  items,
  isLoading,
  selected,
  fetchData,
  canInsert,
  canEdit,
  canDelete,
  canExport,
} = useBrowse({
  menuId: "114",
  fetchApi: async () => {
    const res = await koreksiStokBarangJadiService.getBrowse(
      filterState.value.startDate,
      filterState.value.endDate,
    );
    return res.data.data;
  },
  deleteApi: async (nomor: string) => {
    await koreksiStokBarangJadiService.deleteData(nomor);
  },
});

// --- KONFIGURASI TABEL --- (Kode/Nama = gudang, bukan barang — sesuai
// query browse: h.kor_gdg_kode / g.gdg_nama)
const headers = [
  { title: "Nomor", key: "Nomor", width: "150px" },
  { title: "Tanggal", key: "Tanggal", width: "100px" },
  { title: "Kode", key: "Kode", width: "90px" },
  { title: "Nama", key: "Nama", minWidth: "200px" },
  { title: "Keterangan", key: "Keterangan", minWidth: "180px" },
];

const num = (val: number) => new Intl.NumberFormat("id-ID").format(val || 0);

const expandedRows = ref<any[]>([]);

// --- FUNGSI AKSI ---
// TODO: named route "KoreksiStokBarangJadiFormCreate/Edit/Print" belum
// didaftarkan di router — nunggu source ufrmKorJadi.pas (form) &
// .fr3 (cetak). router.push ini aman (tidak break build), cuma bakal
// warning di console kalau diklik sebelum route-nya ada.
const onAdd = () => {
  router.push({ name: "KoreksiStokBarangJadiFormCreate" });
};

const onEdit = (item: any) => {
  router.push({
    name: "KoreksiStokBarangJadiFormEdit",
    params: { nomor: item.Nomor },
  });
};

const onDelete = async (item: any) => {
  try {
    await koreksiStokBarangJadiService.deleteData(item.Nomor);
    toast.success("Berhasil dihapus.");
    fetchData();
  } catch (error: any) {
    toast.error(error.response?.data?.message || "Gagal menghapus data.");
  }
};

const onPrint = () => {
  if (!selected.value.length)
    return toast.warning("Pilih data terlebih dahulu.");
  const nomor = selected.value[0].Nomor;
  router.push({ name: "KoreksiStokBarangJadiPrint", params: { nomor } });
};

const onExport = async () => {
  if (!items.value?.length)
    return toast.warning("Tidak ada data untuk diexport.");

  const columns: ExcelColumn[] = [
    { header: "Nomor", key: "Nomor", width: 18 },
    { header: "Tanggal", key: "Tanggal", width: 12 },
    { header: "Kode", key: "Kode", width: 12 },
    { header: "Nama", key: "Nama", width: 30 },
    { header: "Keterangan", key: "Keterangan", width: 28 },
  ];

  const rows = items.value.map((r: any) => ({
    ...r,
    Tanggal: formatTanggal(r.Tanggal),
  }));

  await exportExcelSingle(
    `Koreksi_Stok_Barang_Jadi_${filterState.value.startDate}.xlsx`,
    "Koreksi Stok Barang Jadi",
    columns,
    rows,
    "Koreksi Stok Barang Jadi",
  );
  toast.success("Berhasil export data.");
};

const onExportDetail = async () => {
  if (!items.value?.length)
    return toast.warning("Tidak ada data untuk diexport.");

  const rows: any[] = [];
  items.value.forEach((master: any) => {
    if (master.details?.length > 0) {
      master.details.forEach((dtl: any) => {
        rows.push({
          Nomor: master.Nomor,
          Tanggal: formatTanggal(master.Tanggal),
          KodeGudang: master.Kode,
          NamaGudang: master.Nama,
          Kode: dtl.Kode,
          Nama: dtl.Nama,
          Satuan: dtl.Satuan,
          Stok: dtl.Stok,
          Jumlah: dtl.Jumlah,
          Selisih: dtl.Selisih,
        });
      });
    }
  });

  if (rows.length === 0)
    return toast.warning("Tidak ada rincian untuk diexport.");

  const columns: ExcelColumn[] = [
    { header: "Nomor Koreksi", key: "Nomor", width: 18 },
    { header: "Tanggal", key: "Tanggal", width: 12 },
    { header: "Kode Gudang", key: "KodeGudang", width: 12 },
    { header: "Nama Gudang", key: "NamaGudang", width: 24 },
    { header: "Kode Barang", key: "Kode", width: 16 },
    { header: "Nama Barang", key: "Nama", width: 30 },
    { header: "Satuan", key: "Satuan", width: 10 },
    { header: "Stok (Sebelum)", key: "Stok", width: 14, align: "right" },
    { header: "Jumlah (Koreksi)", key: "Jumlah", width: 14, align: "right" },
    { header: "Selisih", key: "Selisih", width: 12, align: "right" },
  ];

  await exportExcelSingle(
    `Detail_Koreksi_Stok_Barang_Jadi_${filterState.value.startDate}.xlsx`,
    "Detail Koreksi Stok Barang Jadi",
    columns,
    rows,
    "Detail Koreksi Stok Barang Jadi",
  );
  toast.success("Berhasil export detail data.");
};
</script>

<template>
  <BaseBrowse
    title="Koreksi Stok Barang Jadi"
    menu-id="114"
    :icon="IconSettings"
    :headers="headers"
    :items="items ?? []"
    :is-loading="isLoading"
    item-value="Nomor"
    show-expand
    v-model:expanded="expandedRows"
    v-model:selected="selected"
    v-model:filter-state="filterState"
    :can-insert="canInsert"
    :can-edit="canEdit"
    :can-delete="canDelete"
    :can-export="canExport"
    @refresh="fetchData"
    @add="onAdd"
    @edit="onEdit"
    @delete="onDelete"
    @export="onExport"
  >
    <template #filter-left>
      <div class="filter-group">
        <span class="filter-label">Filter Periode</span>
        <input
          type="date"
          v-model="filterState.startDate"
          class="date-inp"
          @change="fetchData"
        />
        <span class="filter-sep">s/d</span>
        <input
          type="date"
          v-model="filterState.endDate"
          class="date-inp"
          @change="fetchData"
        />
      </div>
    </template>

    <template #extra-actions>
      <v-btn
        size="small"
        color="grey-darken-3"
        :disabled="selected.length === 0"
        @click="onPrint"
      >
        <template #prepend
          ><IconPrinter :size="15" :stroke-width="1.7"
        /></template>
        Cetak
      </v-btn>
      <v-btn
        size="small"
        color="green-darken-3"
        variant="outlined"
        class="ml-2"
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

    <template #detail="{ item }">
      <div v-if="item" class="det-wrap">
        <div class="det-card">
          <div class="det-head">Detail Koreksi Stok</div>
          <div class="dt-scroll">
            <table class="dt">
              <thead>
                <tr>
                  <th style="width: 28px">No</th>
                  <th style="width: 140px; text-align: left">Kode</th>
                  <th style="text-align: left">Nama Barang</th>
                  <th style="width: 60px">Satuan</th>
                  <th style="width: 90px; text-align: right">Stok</th>
                  <th style="width: 90px; text-align: right">Jumlah</th>
                  <th style="width: 90px; text-align: right">Selisih</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(dtl, i) in item.details" :key="i">
                  <td class="tc">{{ Number(i) + 1 }}</td>
                  <td style="font-weight: 600; color: #00796b">
                    {{ dtl.Kode }}
                  </td>
                  <td>{{ dtl.Nama }}</td>
                  <td class="tc">{{ dtl.Satuan }}</td>
                  <td class="tr">{{ num(dtl.Stok) }}</td>
                  <td class="tr" style="font-weight: 700; background: #fffde7">
                    {{ num(dtl.Jumlah) }}
                  </td>
                  <td
                    class="tr"
                    :style="
                      Number(dtl.Selisih) < 0
                        ? 'color:#c62828;font-weight:700'
                        : Number(dtl.Selisih) > 0
                          ? 'color:#2e7d32;font-weight:700'
                          : ''
                    "
                  >
                    {{ num(dtl.Selisih) }}
                  </td>
                </tr>
                <tr v-if="!item.details?.length">
                  <td colspan="7" class="empty-td">
                    Tidak ada rincian barang.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
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
  white-space: nowrap;
}
.filter-sep {
  font-size: 11px;
  color: #888;
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
.date-inp:focus {
  border-color: #1976d2;
}
.ml-2 {
  margin-left: 8px;
}
.det-wrap {
  padding: 6px 8px 8px 48px;
  background: #f5f6f8;
}
.det-card {
  border: 1px solid #d0d0d0;
  border-radius: 4px;
  overflow: hidden;
  background: white;
}
.det-head {
  background: #00796b;
  color: white;
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  padding: 4px 9px;
  flex-shrink: 0;
}
.dt-scroll {
  overflow-y: auto;
  max-height: 200px;
}
.dt {
  width: 100%;
  border-collapse: collapse;
  font-size: 11px;
}
.dt th {
  padding: 4px 7px;
  font-size: 10px;
  font-weight: 700;
  text-align: center;
  border: 1px solid rgba(0, 0, 0, 0.15);
  background: #f5f5f5;
  color: #333;
  position: sticky;
  top: 0;
  z-index: 2;
}
.dt td {
  border-bottom: 1px solid #eeeeee;
  padding: 3px 6px;
}
.tc {
  text-align: center;
}
.tr {
  text-align: right;
}
.empty-td {
  text-align: center;
  color: #9e9e9e;
  font-style: italic;
  padding: 12px !important;
}
</style>
