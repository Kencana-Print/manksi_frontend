<script setup lang="ts">
import { ref, watch, onMounted, computed } from "vue";
import { useToast } from "vue-toastification";
import BaseBrowse from "@/components/BaseBrowse.vue";
import { useBrowse } from "@/composables/useBrowse";
import { mutasiInBarangService } from "@/services/garmen/mutasiInBarangService";
import { useAuthStore } from "@/stores/authStore";
import {
  IconTruckDelivery,
  IconCheck,
  IconFileExport,
} from "@tabler/icons-vue";
import * as XLSX from "xlsx";

const toast = useToast();
const authStore = useAuthStore();

// ── LOGIKA HAK AKSES FILTER (MIGRASI DELPHI FormCreate) ──
const userBagian = computed(() => authStore.user?.bagian?.toUpperCase() || "");
const userCabang = computed(() => authStore.userCabang || "");

// Akses filter cabang
const isAllCabangAllowed = computed(() => {
  return ["FINANCE", "AUDIT", "EDP", "DIREKSI", "ADMIN"].includes(
    userBagian.value,
  );
});

const cabangOptions = ref<string[]>([]);

const showTerimaDialog = ref(false);

// Akses filter jenis
const showFilterAcc = computed(() => {
  return [
    "ADMIN",
    "PPIC",
    "GUDANG",
    "PRODUKSI",
    "POTONG",
    "CETAK",
    "JAHIT",
    "LIPAT",
    "FINANCE",
    "AUDIT",
    "DIREKSI",
    "EDP",
  ].includes(userBagian.value);
});
const showFilterObat = computed(() => showFilterAcc.value); // Sama dengan ACC
const showFilterSparepart = computed(() => {
  return [
    "TEKNISI",
    "IT",
    "FINANCE",
    "AUDIT",
    "DIREKSI",
    "EDP",
    "ADMIN",
  ].includes(userBagian.value);
});
const showFilterAtk = computed(() => {
  return ["GA", "FINANCE", "AUDIT", "DIREKSI", "EDP", "ADMIN"].includes(
    userBagian.value,
  );
});

// Penentuan Default Check Radio & Cabang saat komponen di-mount
const initFilters = () => {
  // Set Options Cabang
  if (userCabang.value !== "" && !isAllCabangAllowed.value) {
    cabangOptions.value = [userCabang.value];
    filterState.value.cabang = userCabang.value;
  } else {
    cabangOptions.value = ["ALL", "HO-", "P01", "P02", "P03", "P04", "P05"];
    filterState.value.cabang = "ALL";
  }

  // Set Default Jenis
  if (showFilterAcc.value) filterState.value.jenis = "ACCESORIES";
  else if (showFilterAtk.value) filterState.value.jenis = "ATK/RTK";
  else if (showFilterSparepart.value) filterState.value.jenis = "SPAREPART";
};

// ── Penanganan Tanggal Lokal (Anti Mundur) ──
const today = new Date();
const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);

const formatDateLocal = (value?: string | Date) => {
  if (!value) return "";
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }
  const d = new Date(value);
  if (isNaN(d.getTime())) return "";

  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const dtAwal = ref(formatDateLocal(firstDay));
const dtAkhir = ref(formatDateLocal(today));

const filterState = ref({
  dtAwal: dtAwal.value,
  dtAkhir: dtAkhir.value,
  jenis: "ACCESORIES", // Default Delphi
  cabang: "ALL",
});

watch(
  filterState,
  (newVal) => {
    if (newVal.dtAwal) dtAwal.value = newVal.dtAwal;
    if (newVal.dtAkhir) dtAkhir.value = newVal.dtAkhir;
  },
  { deep: true },
);

// ── Header Master ──
const headers = [
  { title: "Nomor", key: "Nomor", width: "160px", fixed: true },
  { title: "Jenis", key: "Jenis", width: "100px" },
  { title: "Tanggal", key: "Tanggal", width: "100px", align: "center" },
  { title: "Cab", key: "Cab", width: "80px", align: "center" },
  { title: "Tujuan", key: "Tujuan", width: "80px", align: "center" },
  { title: "Keterangan", key: "Keterangan", minWidth: "200px" },
  { title: "Usr", key: "Usr", width: "100px" },
  { title: "Bagian", key: "Bagian", width: "100px" },
  { title: "Created", key: "Created", width: "140px", align: "center" },
  { title: "No. Terima", key: "NoTerima", width: "160px" },
  { title: "Usr Terima", key: "UsrTerima", width: "100px" },
  { title: "Tgl Terima", key: "TglTerima", width: "140px", align: "center" },
];

const rawDetails = ref<any[]>([]);

const {
  items,
  isLoading,
  selected,
  canExport,
  selectedItem,
  fetchData,
  exportToExcel,
} = useBrowse({
  menuId: "69", // Sesuai ID Mutasi In Barang Garmen
  fetchApi: async () => {
    const res = await mutasiInBarangService.getBrowse({
      startDate: dtAwal.value,
      endDate: dtAkhir.value,
      jenis: filterState.value.jenis,
      cabang: filterState.value.cabang,
    });
    // Simpan raw detail untuk keperluan expand dan export
    rawDetails.value = res.data.data.detail;
    return res.data.data.master;
  },
  immediate: false,
});

onMounted(() => {
  initFilters(); // SET FILTER SESUAI ROLE DULU
  fetchData(); // BARU FETCH
});

watch(
  [
    dtAwal,
    dtAkhir,
    () => filterState.value.jenis,
    () => filterState.value.cabang,
  ],
  () => {
    filterState.value.dtAwal = dtAwal.value;
    filterState.value.dtAkhir = dtAkhir.value;
    fetchData();
  },
);

// ── Expand State (Detail Mutasi In) ──
const expandedRows = ref<any[]>([]);

// Filter detail berdasarkan baris parent yang sedang dibuka
const getDetailItems = (nomor: string) => {
  return rawDetails.value.filter((d) => d.Nomor === nomor);
};

// ── Actions ──
const isSaving = ref(false);

// Export Detail Manual (Export Master + Rincian Detailnya)
const onExportDetail = () => {
  if (!canExport.value) return toast.error("Hak akses ditolak");
  if (!items.value?.length)
    return toast.warning("Tidak ada data untuk diexport");

  const exportData: any[] = [];
  (items.value ?? []).forEach((master: any) => {
    // Baris Master
    exportData.push({
      Nomor: master.Nomor,
      Jenis: master.Jenis,
      Tanggal: formatTgl(master.Tanggal),
      Cabang: master.Cab,
      Tujuan: master.Tujuan,
      Keterangan: master.Keterangan,
      "No. Permintaan": "",
      "Kode Barang": "",
      "Nama Barang": "",
      Spesifikasi: "",
      Satuan: "",
      Jumlah: "",
    });

    // Baris Detail yang menempel pada master terkait
    const details = getDetailItems(master.Nomor);
    details.forEach((det: any) => {
      exportData.push({
        Nomor: "",
        Jenis: "",
        Tanggal: "",
        Cabang: "",
        Tujuan: "",
        Keterangan: "",
        "No. Permintaan": det.NoPermintaan,
        "Kode Barang": det.Kode,
        "Nama Barang": det.Nama,
        Spesifikasi: det.Spesifikasi,
        Satuan: det.Satuan,
        Jumlah: Number(det.Jumlah) || 0,
      });
    });
  });

  if (exportData.length === 0)
    return toast.warning("Tidak ada data detail untuk diexport");

  const ws = XLSX.utils.json_to_sheet(exportData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Mutasi In Detail");
  XLSX.writeFile(wb, "Laporan_Detail_Mutasi_In.xlsx");
};

// ── Helpers Formatting ──
const formatTgl = (val: string) => {
  if (!val) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(val)) {
    const [y, m, d] = val.split("-");
    return `${d}-${m}-${y}`;
  }
  const d = new Date(val);
  return `${String(d.getDate()).padStart(2, "0")}-${String(d.getMonth() + 1).padStart(2, "0")}-${d.getFullYear()}`;
};

const formatWaktu = (val: string) => {
  if (!val) return "";
  const d = new Date(val);
  if (isNaN(d.getTime())) return val;
  return `${String(d.getDate()).padStart(2, "0")}-${String(d.getMonth() + 1).padStart(2, "0")}-${d.getFullYear()} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};

const formatQty = (val: any) => {
  return Number(val || 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

const openTerimaDialog = () => {
  if (!selectedItem.value)
    return toast.warning("Pilih data yang akan diterima.");
  if (selectedItem.value.NoTerima)
    return toast.warning("Mutasi tersebut sudah diterima.");
  showTerimaDialog.value = true;
};

const confirmTerimaMutasi = async () => {
  isSaving.value = true;
  try {
    await mutasiInBarangService.terimaMutasi(selectedItem.value.Nomor);
    toast.success("Mutasi berhasil diterima.");
    showTerimaDialog.value = false;
    fetchData();
  } catch (e: any) {
    toast.error(e.response?.data?.message || "Gagal menerima mutasi.");
  } finally {
    isSaving.value = false;
  }
};
</script>

<template>
  <BaseBrowse
    title="Mutasi In Garmen"
    menu-id="69"
    :icon="IconTruckDelivery"
    :headers="headers"
    :items="items ?? []"
    :is-loading="isLoading"
    v-model:selected="selected"
    v-model:filter-state="filterState"
    :can-insert="false"
    :can-edit="false"
    :can-delete="false"
    :can-export="canExport"
    show-expand
    v-model:expanded="expandedRows"
    @export="exportToExcel('Data_Mutasi_In')"
    @refresh="fetchData"
    item-value="Nomor"
  >
    <template #filter-left>
      <div class="filter-group">
        <span class="filter-label">Tanggal</span>
        <input
          type="date"
          v-model="dtAwal"
          class="date-inp"
          @change="fetchData"
        />
        <span class="filter-sep">s/d</span>
        <input
          type="date"
          v-model="dtAkhir"
          class="date-inp"
          @change="fetchData"
        />
      </div>

      <div class="filter-divider" />

      <div class="filter-group">
        <span class="filter-label">Jenis</span>
        <div class="radio-wrap">
          <label class="radio-label" v-if="showFilterAcc">
            <input
              type="radio"
              v-model="filterState.jenis"
              value="ACCESORIES"
              @change="fetchData"
            />
            ACC
          </label>
          <label class="radio-label" v-if="showFilterObat">
            <input
              type="radio"
              v-model="filterState.jenis"
              value="OBAT"
              @change="fetchData"
            />
            OBAT
          </label>
          <label class="radio-label" v-if="showFilterSparepart">
            <input
              type="radio"
              v-model="filterState.jenis"
              value="SPAREPART"
              @change="fetchData"
            />
            SPAREPART
          </label>
          <label class="radio-label" v-if="showFilterAtk">
            <input
              type="radio"
              v-model="filterState.jenis"
              value="ATK/RTK"
              @change="fetchData"
            />
            ATK
          </label>
        </div>
      </div>

      <div class="filter-divider" />

      <div class="filter-group">
        <span class="filter-label">Cabang:</span>
        <select
          v-model="filterState.cabang"
          class="date-inp"
          style="width: 80px"
          @change="fetchData"
        >
          <option v-for="cab in cabangOptions" :key="cab" :value="cab">
            {{ cab }}
          </option>
        </select>
      </div>
    </template>

    <template #extra-actions="{ selected }">
      <v-btn
        size="small"
        color="primary"
        :disabled="selected.length === 0"
        :loading="isSaving"
        @click="openTerimaDialog"
      >
        <template #prepend><IconCheck :size="15" :stroke-width="2" /></template>
        Terima
      </v-btn>

      <v-btn size="small" color="teal-darken-2" @click="onExportDetail">
        <template #prepend
          ><IconFileExport :size="15" :stroke-width="1.7"
        /></template>
        Export Detail
      </v-btn>
    </template>

    <template #item.Nomor="{ item }">
      <div class="custom-cell font-weight-bold text-primary">
        {{ item.Nomor }}
      </div>
    </template>

    <template #item.NoTerima="{ item }">
      <div v-if="!item.NoTerima" class="custom-cell font-weight-bold text-red">
        Belum diterima
      </div>
      <div v-else class="custom-cell font-weight-bold text-success">
        {{ item.NoTerima }}
      </div>
    </template>

    <template #item.Tanggal="{ item }">{{ formatTgl(item.Tanggal) }}</template>
    <template #item.Created="{ item }">{{
      formatWaktu(item.Created)
    }}</template>
    <template #item.TglTerima="{ item }">{{
      formatWaktu(item.TglTerima)
    }}</template>

    <template #detail="{ item }">
      <div class="det-wrap">
        <div class="d-flex flex-column gap-3">
          <div class="border rounded overflow-hidden">
            <div
              class="bg-blue-lighten-4 px-3 py-1 text-caption font-weight-bold"
            >
              Rincian Barang Masuk - {{ item.Nomor }}
            </div>
            <div class="table-scroll-x">
              <table class="dt">
                <thead>
                  <tr>
                    <th style="width: 150px">No. Permintaan</th>
                    <th style="width: 100px">Kode</th>
                    <th style="min-width: 250px">Nama Barang</th>
                    <th style="min-width: 200px">Spesifikasi</th>
                    <th style="width: 80px" class="text-center">Satuan</th>
                    <th style="width: 100px" class="text-right">Jumlah</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(dtl, i) in getDetailItems(item.Nomor)" :key="i">
                    <td class="fw-mono">{{ dtl.NoPermintaan }}</td>
                    <td class="fw-mono text-primary">{{ dtl.Kode }}</td>
                    <td class="font-weight-bold">{{ dtl.Nama }}</td>
                    <td>{{ dtl.Spesifikasi }}</td>
                    <td class="text-center">{{ dtl.Satuan }}</td>
                    <td class="text-right font-weight-bold text-success">
                      {{ formatQty(dtl.Jumlah) }}
                    </td>
                  </tr>
                  <tr v-if="getDetailItems(item.Nomor).length === 0">
                    <td
                      colspan="6"
                      class="text-center text-grey py-3 font-italic"
                    >
                      Tidak ada rincian barang.
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </template>
  </BaseBrowse>

  <v-dialog v-model="showTerimaDialog" max-width="400px" persistent>
    <v-card class="rounded-lg">
      <v-card-title
        class="bg-primary text-white pa-3 text-subtitle-1 d-flex align-center"
      >
        <IconCheck :size="16" color="white" class="mr-2" />
        Konfirmasi Terima Mutasi
      </v-card-title>
      <v-card-text class="pa-4 text-body-2">
        Yakin ingin menerima mutasi:
        <div class="font-weight-bold text-primary mt-1" style="font-size: 13px">
          {{ selectedItem?.Nomor }}
        </div>
        <div class="text-caption text-grey mt-1">
          {{ selectedItem?.Keterangan }}
        </div>
      </v-card-text>
      <v-card-actions class="pa-3 border-t bg-grey-lighten-4">
        <v-spacer />
        <v-btn variant="text" @click="showTerimaDialog = false">Batal</v-btn>
        <v-btn
          color="primary"
          variant="elevated"
          :loading="isSaving"
          @click="confirmTerimaMutasi"
        >
          Ya, Terima
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style scoped>
/* ── Filter ── */
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
.filter-divider {
  width: 1px;
  height: 22px;
  background: #d0d0d0;
  margin: 0 10px;
  flex-shrink: 0;
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

/* ── Custom cell ── */
.custom-cell {
  height: 100%;
  display: flex;
  align-items: center;
}

/* ── Detail expand ── */
.det-wrap {
  padding: 8px 12px 10px 48px;
  background: #f5f6f8;
}

.table-scroll-x {
  overflow-x: auto;
  max-width: 100%;
}

.dt {
  width: 100%;
  border-collapse: collapse;
  font-size: 11px;
  background: white;
  border: 1px solid #d0d0d0;
  border-radius: 4px;
  overflow: hidden;
}
.dt th {
  background: #455a64;
  color: white;
  padding: 5px 8px;
  font-size: 10px;
  font-weight: 700;
  border: 1px solid rgba(0, 0, 0, 0.1);
  white-space: nowrap;
  text-align: left;
}
.dt td {
  border-bottom: 1px solid #eeeeee;
  padding: 4px 8px;
  vertical-align: middle;
  font-size: 11px;
  white-space: nowrap;
}
.dt tbody tr:nth-of-type(even) td {
  background: #fafafa;
}

.fw-mono {
  font-family: monospace;
}

.radio-wrap {
  display: flex;
  align-items: center;
  gap: 8px;
  background: white;
  border: 1px solid #ccc;
  border-radius: 4px;
  padding: 0 8px;
  height: 28px;
}
.radio-label {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  font-weight: 600;
  color: #424242;
  cursor: pointer;
  white-space: nowrap;
}
.radio-label input[type="radio"] {
  accent-color: #1565c0;
  cursor: pointer;
  width: 13px;
  height: 13px;
  margin: 0;
}
</style>
