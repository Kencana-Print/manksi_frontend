<script setup lang="ts">
import { ref, computed } from "vue";
import { useRouter } from "vue-router";
import { useToast } from "vue-toastification";
import { useAuthStore } from "@/stores/authStore";
import BaseBrowse from "@/components/BaseBrowse.vue";
import { useBrowse } from "@/composables/useBrowse";
import { poDtfService } from "@/services/garmen/poDtfService";
import SpkSearchModal from "@/components/lookups/SpkSearchModal.vue";
import { exportExcelSingle, type ExcelColumn } from "@/utils/excelExport";
import {
  IconPhotoScan,
  IconPrinter,
  IconFileSpreadsheet,
  IconSearch,
  IconX,
} from "@tabler/icons-vue";
import { formatTanggal } from "@/utils/dateFormat";

const router = useRouter();
const toast = useToast();
const authStore = useAuthStore();

const getLocalDate = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
const getAwalBulan = () => {
  const d = new Date();
  return getLocalDate(new Date(d.getFullYear(), d.getMonth(), 1));
};

// --- CABANG --- (ALL/P01/P04, default sesuai cabang user)
const CABANG_OPTIONS = ["ALL", "P01", "P04"];
const resolveDefaultCabang = () => {
  const userCab = authStore.user?.cabang || "";
  return CABANG_OPTIONS.includes(userCab) ? userCab : "ALL";
};

// Cek akses cabang per-row (replikasi pengecekan Ubah/Hapus di source)
const canAccessCabang = (rowCab: string) => {
  const userCab = authStore.user?.cabang || "";
  if (userCab === "" || userCab === "HO-") return true;
  return rowCab === userCab;
};

// --- STATE FILTER ---
const filterState = ref({
  startDate: getAwalBulan(),
  endDate: getLocalDate(),
  cabang: resolveDefaultCabang(),
  spk: "",
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
  menuId: "141",
  fetchApi: async () => {
    const res = await poDtfService.getBrowse(
      filterState.value.startDate,
      filterState.value.endDate,
      filterState.value.cabang,
      filterState.value.spk,
    );
    return res.data.data;
  },
  deleteApi: async (nomor: string) => {
    await poDtfService.deleteData(nomor);
  },
});

// --- FILTER SPK (search modal) ---
const spkModalOpen = ref(false);
const onSpkSelected = (item: any) => {
  filterState.value.spk = item.Nomor;
  fetchData();
};
const clearSpkFilter = () => {
  filterState.value.spk = "";
  fetchData();
};

// --- KONFIGURASI TABEL ---
const headers = [
  { title: "Nomor", key: "Nomor", width: "140px" },
  { title: "Cab", key: "Cab", width: "60px" },
  { title: "Tanggal", key: "Tanggal", width: "95px" },
  { title: "Dateline", key: "Dateline", width: "95px" },
  { title: "Kode Sup", key: "KodeSup", width: "90px" },
  { title: "Nama", key: "Nama", minWidth: "180px" },
  { title: "Alamat", key: "Alamat", minWidth: "200px" },
  { title: "Keterangan", key: "Keterangan", minWidth: "180px" },
];

const num = (v: any) => new Intl.NumberFormat("id-ID").format(Number(v) || 0);

const expandedRows = ref<any[]>([]);

// --- FUNGSI AKSI ---
// TODO: named route form/print belum didaftarkan — nunggu source
// ufrmPoDtf.pas (form) & report cetak.
const onAdd = () => {
  router.push({ name: "PoDtfFormCreate" });
};

const onEdit = (item: any) => {
  if (!canAccessCabang(item.Cab)) {
    toast.warning("Data tsb bukan cabang anda.");
    return;
  }
  router.push({ name: "PoDtfFormEdit", params: { nomor: item.Nomor } });
};

const onDelete = async (item: any) => {
  if (!canAccessCabang(item.Cab)) {
    toast.warning("Data tsb bukan cabang anda.");
    return;
  }
  try {
    await poDtfService.deleteData(item.Nomor);
    toast.success("Sukses");
    fetchData();
  } catch (error: any) {
    toast.error(error.response?.data?.message || "Gagal Hapus.");
  }
};

const onPrint = () => {
  // ⚠️ Tidak ada pengecekan cabang di source utk Cetak (asimetri asli,
  // sama seperti modul Pemakaian Obat)
  if (!selected.value.length)
    return toast.warning("Pilih data terlebih dahulu.");
  const nomor = selected.value[0].Nomor;
  window.open(`/garmen/po-dtf/print/${encodeURIComponent(nomor)}`, "_blank");
};

const onExport = async () => {
  if (!items.value?.length)
    return toast.warning("Tidak ada data untuk diexport.");

  const columns: ExcelColumn[] = [
    { header: "Nomor", key: "Nomor", width: 18 },
    { header: "Cab", key: "Cab", width: 8 },
    { header: "Tanggal", key: "Tanggal", width: 12 },
    { header: "Dateline", key: "Dateline", width: 12 },
    { header: "Kode Sup", key: "KodeSup", width: 12 },
    { header: "Nama", key: "Nama", width: 24 },
    { header: "Alamat", key: "Alamat", width: 30 },
    { header: "Keterangan", key: "Keterangan", width: 24 },
  ];

  const rows = items.value.map((r: any) => ({
    ...r,
    Tanggal: formatTanggal(r.Tanggal),
    Dateline: formatTanggal(r.Dateline),
  }));

  await exportExcelSingle(
    `PO_DTF_${filterState.value.startDate}.xlsx`,
    "PO DTF",
    columns,
    rows,
    "PO DTF",
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
          Spk: dtl.Spk,
          NamaSpk: dtl.NamaSpk,
          Ukuran: dtl.Ukuran,
          Bahan: dtl.Bahan,
          JmlCetak: dtl.JmlCetak,
          JmlLayout: dtl.JmlLayout,
          Keterangan: dtl.Keterangan,
        });
      });
    }
  });

  if (rows.length === 0)
    return toast.warning("Tidak ada rincian untuk diexport.");

  const columns: ExcelColumn[] = [
    { header: "Nomor", key: "Nomor", width: 18 },
    { header: "Spk", key: "Spk", width: 20 },
    { header: "Nama Spk", key: "NamaSpk", width: 34 },
    { header: "Ukuran", key: "Ukuran", width: 12 },
    { header: "Bahan", key: "Bahan", width: 14 },
    { header: "Jml Cetak", key: "JmlCetak", width: 10, align: "right" },
    { header: "Jml/Layout", key: "JmlLayout", width: 12 },
    { header: "Keterangan", key: "Keterangan", width: 26 },
  ];

  await exportExcelSingle(
    `Detail_PO_DTF_${filterState.value.startDate}.xlsx`,
    "Detail PO DTF",
    columns,
    rows,
    "Detail PO DTF",
  );
  toast.success("Berhasil export detail data.");
};
</script>

<template>
  <BaseBrowse
    title="PO DTF"
    menu-id="141"
    :icon="IconPhotoScan"
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

      <div class="filter-group ml-3">
        <span class="filter-label">Cabang</span>
        <select
          v-model="filterState.cabang"
          class="date-inp"
          style="width: 80px"
          @change="fetchData"
        >
          <option v-for="c in CABANG_OPTIONS" :key="c" :value="c">
            {{ c }}
          </option>
        </select>
      </div>

      <div class="filter-group ml-3">
        <span class="filter-label">Filter SPK</span>
        <div class="spk-inp-group">
          <input
            :value="filterState.spk"
            readonly
            placeholder="Semua SPK"
            class="date-inp"
            style="width: 160px; cursor: pointer"
            @click="spkModalOpen = true"
          />
          <button class="spk-btn" @click="spkModalOpen = true">
            <IconSearch :size="13" :stroke-width="1.7" />
          </button>
          <button
            v-if="filterState.spk"
            class="spk-btn spk-clear"
            @click="clearSpkFilter"
          >
            <IconX :size="13" :stroke-width="1.7" />
          </button>
        </div>
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
    <template #item.Dateline="{ item }">
      {{ formatTanggal(item.Dateline) }}
    </template>

    <template #detail="{ item }">
      <div v-if="item" class="det-wrap">
        <div class="det-card">
          <div class="det-head">Detail Data</div>
          <div class="dt-scroll">
            <table class="dt">
              <thead>
                <tr>
                  <th style="width: 120px; text-align: left">Spk</th>
                  <th style="text-align: left">Nama Spk</th>
                  <th style="width: 90px">Ukuran</th>
                  <th style="width: 90px">Bahan</th>
                  <th style="width: 70px; text-align: right">Jml Cetak</th>
                  <th style="width: 90px">Jml/Layout</th>
                  <th style="text-align: left">Keterangan</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(dtl, i) in item.details" :key="i">
                  <td style="font-weight: 600; color: #00796b">
                    {{ dtl.Spk }}
                  </td>
                  <td>{{ dtl.NamaSpk }}</td>
                  <td class="tc">{{ dtl.Ukuran }}</td>
                  <td class="tc">{{ dtl.Bahan }}</td>
                  <td class="tr">{{ num(dtl.JmlCetak) }}</td>
                  <td class="tc">{{ dtl.JmlLayout }}</td>
                  <td>{{ dtl.Keterangan }}</td>
                </tr>
                <tr v-if="!item.details?.length">
                  <td colspan="7" class="empty-td">Tidak ada rincian.</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </template>
  </BaseBrowse>

  <SpkSearchModal
    v-model="spkModalOpen"
    filter-mode="all"
    @selected="onSpkSelected"
  />
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
.ml-3 {
  margin-left: 12px;
}
.ml-2 {
  margin-left: 8px;
}
.spk-inp-group {
  display: flex;
  align-items: center;
  gap: 4px;
}
.spk-btn {
  height: 28px;
  width: 28px;
  border: 1px solid #ccc;
  border-radius: 4px;
  background: #fafafa;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}
.spk-btn:hover {
  background: #e3f2fd;
}
.spk-clear {
  color: #c62828;
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
