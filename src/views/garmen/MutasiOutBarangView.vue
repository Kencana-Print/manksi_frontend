<script setup lang="ts">
import { ref, watch, onMounted } from "vue";
import { useRouter } from "vue-router";
import { useToast } from "vue-toastification";
import BaseBrowse from "@/components/BaseBrowse.vue";
import { useBrowse } from "@/composables/useBrowse";
import { mutasiOutBarangService } from "@/services/garmen/mutasiOutBarangService";
import {
  IconTruckDelivery,
  IconPrinter,
  IconFileExport,
  IconShieldLock,
} from "@tabler/icons-vue";
import * as XLSX from "xlsx";

const router = useRouter();
const toast = useToast();

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
  { title: "Cabang", key: "Cab", width: "80px", align: "center" },
  { title: "Tujuan", key: "Tujuan", width: "80px", align: "center" },
  { title: "Keterangan", key: "Keterangan", minWidth: "200px" },
  { title: "User", key: "Usr", width: "100px" },
  { title: "Bagian", key: "Bagian", width: "100px" },
  { title: "Created", key: "Created", width: "140px", align: "center" },
  { title: "No. Terima", key: "NoTerima", width: "160px" },
  { title: "User Terima", key: "UsrTerima", width: "100px" },
  { title: "Tgl Terima", key: "TglTerima", width: "140px", align: "center" },
];

const {
  items,
  isLoading,
  selected,
  canInsert,
  canEdit,
  canDelete,
  canExport,
  isSingleSelected,
  selectedItem,
  fetchData,
  exportToExcel,
} = useBrowse({
  menuId: "70",
  fetchApi: async () => {
    const res = await mutasiOutBarangService.getBrowse({
      startDate: dtAwal.value,
      endDate: dtAkhir.value,
      jenis: filterState.value.jenis,
      cabang: filterState.value.cabang,
    });
    return res.data.data;
  },
  immediate: false,
});

onMounted(() => fetchData());

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

// ── Expand State (Detail Mutasi Out) ──
const expandedRows = ref<any[]>([]);
const dtlCache = ref<Record<string, any[]>>({});
const expandedLoading = ref<Record<string, boolean>>({});

const onUpdateExpanded = async (newExpanded: any[]) => {
  expandedRows.value = newExpanded;
  const newlyExpanded = newExpanded.filter(
    (item) => !dtlCache.value[item.Nomor] && !expandedLoading.value[item.Nomor],
  );

  for (const item of newlyExpanded) {
    const nomor = item.Nomor;
    expandedLoading.value = { ...expandedLoading.value, [nomor]: true };
    try {
      const res = await mutasiOutBarangService.getDetail(nomor);
      dtlCache.value = { ...dtlCache.value, [nomor]: res.data.data };
    } catch {
      toast.error(`Gagal memuat rincian untuk ${nomor}`);
    } finally {
      expandedLoading.value = { ...expandedLoading.value, [nomor]: false };
    }
  }
};

// ── Actions ──
const onAdd = () =>
  router.push(
    `/garmen/barang/mutasi-out/create?jenis=${filterState.value.jenis}`,
  );
const onEdit = (item: any) => {
  const safeNomor = encodeURIComponent(encodeURIComponent(item.Nomor));
  router.push(`/garmen/barang/mutasi-out/edit/${safeNomor}`);
};
const onDelete = async (item: any) => {
  try {
    await mutasiOutBarangService.deleteData(item.Nomor);
    toast.success("Mutasi Out berhasil dihapus.");
    fetchData();
  } catch (e: any) {
    toast.error(e.response?.data?.message || "Gagal menghapus data.");
  }
};
const onPrint = () => {
  if (!selectedItem.value) return toast.warning("Pilih data yang akan dicetak");
  const safeNomor = encodeURIComponent(
    encodeURIComponent(selectedItem.value.Nomor),
  );

  // PERBAIKAN: Gunakan slash (/) bukan tanda tanya (?)
  window.open(`/garmen/barang/mutasi-out/print/${safeNomor}`, "_blank");
};

// Export Detail Manual
const onExportDetail = () => {
  if (!canExport.value) return;
  if (!items.value?.length)
    return toast.warning("Tidak ada data untuk diexport");

  const exportData: any[] = [];
  (items.value ?? []).forEach((master: any) => {
    // Master Row
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

    // Detail Row
    const details = dtlCache.value[master.Nomor] || [];
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
    return toast.warning("Tidak ada data untuk diexport");

  const ws = XLSX.utils.json_to_sheet(exportData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Mutasi Out Detail");
  XLSX.writeFile(wb, "Laporan_Detail_Mutasi_Out.xlsx");
};

// ── PIN Dialog ──
const pinDialog = ref(false);
const pinForm = ref({ alasan: "" });

const openPinDialog = () => {
  if (!selectedItem.value) return;
  pinForm.value.alasan = "";
  pinDialog.value = true;
};

const submitPin = async () => {
  if (!pinForm.value.alasan) return toast.error("Alasan wajib diisi.");
  try {
    await mutasiOutBarangService.requestPin({
      nomor: selectedItem.value.Nomor,
      tanggal: selectedItem.value.Tanggal,
      keterangan: selectedItem.value.Keterangan,
      alasan: pinForm.value.alasan,
    });
    toast.success("Berhasil diajukan. Menunggu ACC.");
    pinDialog.value = false;
    fetchData();
  } catch (e: any) {
    toast.error(e.response?.data?.message || "Gagal mengajukan PIN.");
  }
};

// ── Helpers Formatting ──
const getNomorStyle = (ngedit: string) => {
  if (ngedit === "WAIT") return "background-color: #1976d2; color: #fff;"; // Biru
  if (ngedit === "TOLAK") return "background-color: #d32f2f; color: #fff;"; // Merah
  if (ngedit === "ACC") return "background-color: #388e3c; color: #fff;"; // Hijau
  return "";
};

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
</script>

<template>
  <BaseBrowse
    title="Mutasi Out Garmen"
    menu-id="70"
    :icon="IconTruckDelivery"
    :headers="headers"
    :items="items ?? []"
    :is-loading="isLoading"
    v-model:selected="selected"
    v-model:filter-state="filterState"
    :can-insert="canInsert"
    :can-edit="canEdit"
    :can-delete="canDelete"
    :can-export="canExport"
    show-expand
    :expanded="expandedRows"
    @update:expanded="onUpdateExpanded"
    @add="onAdd"
    @edit="onEdit"
    @delete="onDelete"
    @export="exportToExcel('Data_Mutasi_Out')"
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
          <label class="radio-label">
            <input
              type="radio"
              v-model="filterState.jenis"
              value="ACCESORIES"
              @change="fetchData"
            />
            ACC
          </label>
          <label class="radio-label">
            <input
              type="radio"
              v-model="filterState.jenis"
              value="OBAT"
              @change="fetchData"
            />
            OBAT
          </label>
          <label class="radio-label">
            <input
              type="radio"
              v-model="filterState.jenis"
              value="SPAREPART"
              @change="fetchData"
            />
            SPAREPART
          </label>
          <label class="radio-label">
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
        >
          <option value="ALL">ALL</option>
          <option value="HO-">HO-</option>
          <option value="P01">P01</option>
          <option value="P02">P02</option>
          <option value="P03">P03</option>
          <option value="P04">P04</option>
          <option value="P05">P05</option>
        </select>
      </div>
    </template>

    <template #extra-actions="{ selected }">
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

      <v-btn size="small" color="teal-darken-2" @click="onExportDetail">
        <template #prepend
          ><IconFileExport :size="15" :stroke-width="1.7"
        /></template>
        Export Detail
      </v-btn>

      <v-btn
        v-if="canEdit"
        size="small"
        color="primary"
        variant="outlined"
        :disabled="selected.length === 0"
        @click="openPinDialog"
      >
        <template #prepend
          ><IconShieldLock :size="15" :stroke-width="1.7"
        /></template>
        Pengajuan Ubah
      </v-btn>
    </template>

    <template #item.Nomor="{ item }">
      <div class="custom-cell" :style="getNomorStyle(item.Ngedit)">
        {{ item.Nomor }}
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
        <v-progress-linear
          v-if="expandedLoading[item.Nomor]"
          indeterminate
          color="primary"
          height="2"
          class="mb-2"
        />

        <div v-else class="d-flex flex-column gap-3">
          <div class="border rounded overflow-hidden">
            <div
              class="bg-blue-lighten-4 px-3 py-1 text-caption font-weight-bold"
            >
              Rincian Barang - {{ item.Nomor }}
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
                  <tr v-for="(dtl, i) in dtlCache[item.Nomor]" :key="i">
                    <td class="fw-mono">{{ dtl.NoPermintaan }}</td>
                    <td class="fw-mono text-primary">{{ dtl.Kode }}</td>
                    <td class="font-weight-bold">{{ dtl.Nama }}</td>
                    <td>{{ dtl.Spesifikasi }}</td>
                    <td class="text-center">{{ dtl.Satuan }}</td>
                    <td class="text-right font-weight-bold text-success">
                      {{ formatQty(dtl.Jumlah) }}
                    </td>
                  </tr>
                  <tr
                    v-if="
                      !dtlCache[item.Nomor] || dtlCache[item.Nomor].length === 0
                    "
                  >
                    <td
                      colspan="6"
                      class="text-center text-grey py-3 font-italic"
                    >
                      Tidak ada detail barang.
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

  <v-dialog v-model="pinDialog" max-width="400px" persistent>
    <v-card class="rounded-lg">
      <v-card-title class="bg-primary text-white pa-3">
        Pengajuan Perubahan Data
      </v-card-title>
      <v-card-text class="pa-4">
        <div class="mb-3 text-body-2">
          <div><strong>Mutasi:</strong> {{ selectedItem?.Nomor }}</div>
          <div><strong>Tujuan:</strong> {{ selectedItem?.Tujuan }}</div>
        </div>
        <v-textarea
          v-model="pinForm.alasan"
          label="Alasan Pengajuan"
          variant="outlined"
          density="compact"
          rows="3"
          autofocus
          hide-details
        />
      </v-card-text>
      <v-card-actions class="pa-3 border-t bg-grey-lighten-4">
        <v-btn variant="text" color="error" @click="pinDialog = false"
          >Batal</v-btn
        >
        <v-spacer />
        <v-btn color="primary" variant="elevated" @click="submitPin"
          >Ajukan Sekarang</v-btn
        >
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
  padding: 0 4px;
  margin: 0 -8px;
  font-family: monospace;
  font-weight: bold;
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
