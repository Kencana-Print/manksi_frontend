<script setup lang="ts">
import { ref, computed } from "vue";
import { useRouter } from "vue-router";
import { useToast } from "vue-toastification";
import BaseBrowse from "@/components/BaseBrowse.vue";
import { useBrowse } from "@/composables/useBrowse";
import { useAuthStore } from "@/stores/authStore";
import { pemakaianObatService } from "@/services/garmen/pemakaianObatService";
import { exportExcelSingle, type ExcelColumn } from "@/utils/excelExport";
import { IconFlask, IconPrinter, IconFileSpreadsheet } from "@tabler/icons-vue";
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

// --- CABANG --- (dropdown TIDAK dikunci, cuma dibatasi pilihan dropdown
// -- replikasi cbCabKeyPress yang cegah ketik manual)
const CABANG_OPTIONS = ["ALL", "P01", "P04"];
const resolveDefaultCabang = () => {
  const userCab = authStore.user?.cabang || "";
  return CABANG_OPTIONS.includes(userCab) ? userCab : "ALL";
};

// Cek akses cabang per-row (replikasi pengecekan Ubah/Hapus di source).
// "" atau "HO-" dianggap TIDAK terkunci (staff HO bebas semua cabang).
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
  menuId: "120",
  fetchApi: async () => {
    const res = await pemakaianObatService.getBrowse(
      filterState.value.startDate,
      filterState.value.endDate,
      filterState.value.cabang,
    );
    return res.data.data;
  },
  deleteApi: async (nomor: string) => {
    await pemakaianObatService.deleteData(nomor);
  },
});

// --- KONFIGURASI TABEL ---
const headers = [
  { title: "Nomor", key: "Nomor", width: "130px" },
  { title: "Cab", key: "Cab", width: "60px" },
  { title: "Tanggal", key: "Tanggal", width: "95px" },
  { title: "Spk", key: "Spk", width: "130px" },
  { title: "Nama Spk", key: "NamaSpk", minWidth: "220px" },
  { title: "Jenis Order", key: "JenisOrder", width: "110px" },
  { title: "Jumlah Spk", key: "JumlahSpk", width: "90px" },
  { title: "Lini", key: "Lini", width: "110px" },
  {
    title: "Hasil Produksi Rata2(Pcs)",
    key: "HasilProduksiRata2",
    width: "110px",
  },
  { title: "Tot.PakaiObat(Gram)", key: "TotPakaiObat", width: "110px" },
  {
    title: "Konsumsi Obat/Pcs(Gram)",
    key: "KonsumsiObatPerPcs",
    width: "110px",
  },
  { title: "Rp PakaiObat", key: "RpPakaiObat", width: "110px" },
  { title: "Rp Obat/Set", key: "RpObatPerSet", width: "100px" },
  { title: "Created", key: "Created", width: "90px" },
  { title: "Komponen", key: "Komponen", minWidth: "220px" },
];

const num = (v: any, decimals = 0) => {
  if (v === null || v === undefined) return "-";
  return new Intl.NumberFormat("id-ID", {
    maximumFractionDigits: decimals,
  }).format(Number(v));
};

const totalPakaiObat = computed(() =>
  (items.value ?? []).reduce(
    (sum, r: any) => sum + Number(r.TotPakaiObat || 0),
    0,
  ),
);

const expandedRows = ref<any[]>([]);

// --- FUNGSI AKSI ---
// TODO: named route form/print belum didaftarkan — nunggu source
// ufrmPakaiObat.pas (form) & report cetak.
const onAdd = () => {
  router.push({ name: "PemakaianObatFormCreate" });
};

const onEdit = (item: any) => {
  if (!canAccessCabang(item.Cab)) {
    toast.warning("Data tsb bukan cabang anda.");
    return;
  }
  router.push({ name: "PemakaianObatFormEdit", params: { nomor: item.Nomor } });
};

const onDelete = async (item: any) => {
  if (!canAccessCabang(item.Cab)) {
    toast.warning("Data tsb bukan cabang anda.");
    return;
  }
  try {
    await pemakaianObatService.deleteData(item.Nomor);
    toast.success("Sukses.");
    fetchData();
  } catch (error: any) {
    toast.error(error.response?.data?.message || "Gagal Hapus.");
  }
};

const onPrint = () => {
  // ⚠️ Tidak ada pengecekan cabang di source utk Cetak (asimetri asli)
  if (!selected.value.length)
    return toast.warning("Pilih data terlebih dahulu.");
  const nomor = selected.value[0].Nomor;
  router.push({ name: "PemakaianObatPrint", params: { nomor } });
};

const onExport = async () => {
  if (!items.value?.length)
    return toast.warning("Tidak ada data untuk diexport.");

  const columns: ExcelColumn[] = [
    { header: "Nomor", key: "Nomor", width: 16 },
    { header: "Cab", key: "Cab", width: 8 },
    { header: "Tanggal", key: "Tanggal", width: 12 },
    { header: "Spk", key: "Spk", width: 16 },
    { header: "Nama Spk", key: "NamaSpk", width: 30 },
    { header: "Jenis Order", key: "JenisOrder", width: 14 },
    { header: "Jumlah Spk", key: "JumlahSpk", width: 12, align: "right" },
    { header: "Lini", key: "Lini", width: 14 },
    {
      header: "Hasil Produksi Rata2(Pcs)",
      key: "HasilProduksiRata2",
      width: 16,
      align: "right",
    },
    {
      header: "Tot.PakaiObat(Gram)",
      key: "TotPakaiObat",
      width: 16,
      align: "right",
    },
    {
      header: "Konsumsi Obat/Pcs(Gram)",
      key: "KonsumsiObatPerPcs",
      width: 18,
      align: "right",
    },
    { header: "Rp PakaiObat", key: "RpPakaiObat", width: 14, align: "right" },
    { header: "Rp Obat/Set", key: "RpObatPerSet", width: 14, align: "right" },
    { header: "Created", key: "Created", width: 12 },
    { header: "Komponen", key: "Komponen", width: 30 },
  ];

  const rows = items.value.map((r: any) => ({
    ...r,
    Tanggal: formatTanggal(r.Tanggal),
  }));

  await exportExcelSingle(
    `Pemakaian_Obat_${filterState.value.startDate}.xlsx`,
    "Pemakaian Obat",
    columns,
    rows,
    "Pemakaian Obat",
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
          JenisObat: dtl.JenisObat,
          Jumlah: dtl.Jumlah,
          Satuan: dtl.Satuan,
          Harga: dtl.Harga,
        });
      });
    }
  });

  if (rows.length === 0)
    return toast.warning("Tidak ada rincian untuk diexport.");

  const columns: ExcelColumn[] = [
    { header: "Nomor", key: "Nomor", width: 16 },
    { header: "Jenis Obat", key: "JenisObat", width: 26 },
    { header: "Jumlah(Gram)", key: "Jumlah", width: 14, align: "right" },
    { header: "Satuan", key: "Satuan", width: 10 },
    { header: "Harga", key: "Harga", width: 14, align: "right" },
  ];

  await exportExcelSingle(
    `Detail_Pemakaian_Obat_${filterState.value.startDate}.xlsx`,
    "Detail Pemakaian Obat",
    columns,
    rows,
    "Detail Pemakaian Obat",
  );
  toast.success("Berhasil export detail data.");
};
</script>

<template>
  <BaseBrowse
    title="Pemakaian Obat"
    menu-id="120"
    :icon="IconFlask"
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
    <template #item.JumlahSpk="{ item }">
      {{ num(item.JumlahSpk) }}
    </template>
    <template #item.HasilProduksiRata2="{ item }">
      {{ num(item.HasilProduksiRata2) }}
    </template>
    <template #item.TotPakaiObat="{ item }">
      {{ num(item.TotPakaiObat) }}
    </template>
    <template #item.KonsumsiObatPerPcs="{ item }">
      {{ num(item.KonsumsiObatPerPcs) }}
    </template>
    <template #item.RpPakaiObat="{ item }">
      {{ num(item.RpPakaiObat) }}
    </template>
    <template #item.RpObatPerSet="{ item }">
      {{ num(item.RpObatPerSet) }}
    </template>

    <template #footer-summary>
      <div class="summary-bar">{{ num(totalPakaiObat) }}</div>
    </template>

    <template #detail="{ item }">
      <div v-if="item" class="det-wrap">
        <div class="det-card">
          <div class="det-head">Detail Pemakaian Obat</div>
          <div class="dt-scroll">
            <table class="dt">
              <thead>
                <tr>
                  <th style="width: 28px">No</th>
                  <th style="text-align: left">Jenis Obat</th>
                  <th style="width: 110px; text-align: right">Jumlah(Gram)</th>
                  <th style="width: 70px">Satuan</th>
                  <th style="width: 110px; text-align: right">Harga</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(dtl, i) in item.details" :key="i">
                  <td class="tc">{{ Number(i) + 1 }}</td>
                  <td>{{ dtl.JenisObat }}</td>
                  <td class="tr">{{ num(dtl.Jumlah, 3) }}</td>
                  <td class="tc">{{ dtl.Satuan }}</td>
                  <td class="tr">{{ num(dtl.Harga) }}</td>
                </tr>
                <tr v-if="!item.details?.length">
                  <td colspan="5" class="empty-td">Tidak ada rincian obat.</td>
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
.ml-3 {
  margin-left: 12px;
}
.ml-2 {
  margin-left: 8px;
}
.summary-bar {
  background: #1976d2;
  color: white;
  font-weight: 700;
  text-align: right;
  padding: 6px 12px;
  font-size: 13px;
  border-radius: 3px;
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
