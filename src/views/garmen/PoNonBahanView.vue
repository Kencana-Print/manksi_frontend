<script setup lang="ts">
import { ref, watch, onMounted, computed } from "vue";
import { useRouter } from "vue-router";
import { useToast } from "vue-toastification";
import BaseBrowse from "@/components/BaseBrowse.vue";
import { useBrowse } from "@/composables/useBrowse";
import { poNonBahanService } from "@/services/garmen/poNonBahanService";
import { useAuthStore } from "@/stores/authStore";
import {
  IconFileInvoice,
  IconPrinter,
  IconFileExport,
  IconShieldLock,
} from "@tabler/icons-vue";
import * as XLSX from "xlsx";
import { formatTanggal } from "@/utils/dateFormat";

const router = useRouter();
const toast = useToast();
const authStore = useAuthStore();

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
  jenis: "ACCESORIES",
  cabang: "ALL",
});

// ── LOGIKA HAK AKSES FILTER (MIGRASI DELPHI FormCreate) ──
const userBagian = computed(() => authStore.user?.bagian?.toUpperCase() || "");
const userCabang = computed(() => authStore.userCabang || "");

const isAllCabangAllowed = computed(() => {
  return ["FINANCE", "AUDIT", "EDP", "DIREKSI", "ADMIN"].includes(
    userBagian.value,
  );
});

const cabangOptions = ref<string[]>([]);
const showFilterAcc = computed(() =>
  [
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
  ].includes(userBagian.value),
);
const showFilterObat = computed(() => showFilterAcc.value);
const showFilterSparepart = computed(() =>
  ["TEKNISI", "IT", "FINANCE", "AUDIT", "DIREKSI", "EDP", "ADMIN"].includes(
    userBagian.value,
  ),
);
const showFilterAtk = computed(() =>
  ["GA", "FINANCE", "AUDIT", "DIREKSI", "EDP", "ADMIN"].includes(
    userBagian.value,
  ),
);

const initFilters = () => {
  if (userCabang.value !== "" && !isAllCabangAllowed.value) {
    cabangOptions.value = [userCabang.value];
    filterState.value.cabang = userCabang.value;
  } else {
    cabangOptions.value = ["ALL", "HO-", "P01", "P02", "P03", "P04", "P05"];
    filterState.value.cabang = "ALL";
  }

  if (showFilterAcc.value) filterState.value.jenis = "ACCESORIES";
  else if (showFilterAtk.value) filterState.value.jenis = "ATK/RTK";
  else if (showFilterSparepart.value) filterState.value.jenis = "SPAREPART";
};

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
  { title: "Tanggal", key: "Tanggal", width: "90px", align: "center" },
  { title: "No. Minta", key: "NoMinta", width: "140px" },
  { title: "Kd Sup", key: "KdSup", width: "90px" },
  { title: "Supplier", key: "Supplier", minWidth: "180px" },
  { title: "Keterangan", key: "Keterangan", minWidth: "200px" },
  { title: "Status", key: "Status", width: "90px", align: "center" },
  { title: "Cab", key: "Cab", width: "60px", align: "center" },
  { title: "KeCab", key: "KeCab", width: "60px", align: "center" },
  { title: "Usr", key: "Usr", width: "80px" },
  { title: "Modified", key: "Modified", width: "80px" },
];

const rawDetails = ref<any[]>([]);

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
  menuId: "66", // Menu ID PO Non Bahan
  fetchApi: async () => {
    const res = await poNonBahanService.getBrowse({
      startDate: dtAwal.value,
      endDate: dtAkhir.value,
      jenis: filterState.value.jenis,
      cabang: filterState.value.cabang,
    });
    rawDetails.value = res.data.data.detail;
    return res.data.data.master;
  },
  immediate: false,
});

onMounted(() => {
  initFilters();
  fetchData();
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

// ── Expand State (Detail PO) ──
const expandedRows = ref<any[]>([]);

const getDetailItems = (nomor: string) => {
  return rawDetails.value.filter((d) => d.Nomor === nomor);
};

// ── Actions ──
const onAdd = () =>
  router.push(
    `/garmen/barang/po-nonbahan/create?jenis=${filterState.value.jenis}`,
  );

const onEdit = (item: any) => {
  const safeNomor = encodeURIComponent(encodeURIComponent(item.Nomor));
  router.push(`/garmen/barang/po-nonbahan/edit/${safeNomor}`);
};

const onDelete = async (item: any) => {
  try {
    await poNonBahanService.deleteData(item.Nomor);
    toast.success("PO berhasil dihapus.");
    fetchData();
  } catch (e: any) {
    toast.error(e.response?.data?.message || "Gagal menghapus data.");
  }
};

const onPrint = () => {
  if (selected.value.length === 0) {
    return toast.warning("Pilih data PO yang akan dicetak terlebih dahulu.");
  }

  const nomor = selected.value[0].Nomor;
  // Resolve URL target cetak berdasarkan rute index.ts
  const url = router.resolve({
    name: "PoNonBahanGarmenPrint",
    params: { nomor: nomor },
  }).href;

  window.open(url, "_blank");
};

// ── Export Detail ──
const onExportDetail = () => {
  if (!canExport.value) return toast.error("Hak akses ditolak");
  if (!items.value?.length)
    return toast.warning("Tidak ada data untuk diexport");

  const exportData: any[] = [];
  (items.value ?? []).forEach((master: any) => {
    exportData.push({
      Nomor: master.Nomor,
      Jenis: master.Jenis,
      Tanggal: formatTanggal(master.Tanggal),
      "No Minta": master.NoMinta,
      Supplier: master.Supplier,
      Keterangan: master.Keterangan,
      Status: master.Status,
      "Kode Barang": "",
      "Nama Barang": "",
      Spesifikasi: "",
      Satuan: "",
      Jumlah: "",
      "Qty BPB": "",
      Harga: "",
      Total: "",
    });

    const details = getDetailItems(master.Nomor);
    details.forEach((det: any) => {
      exportData.push({
        Nomor: "",
        Jenis: "",
        Tanggal: "",
        "No Minta": "",
        Supplier: "",
        Keterangan: "",
        Status: "",
        "Kode Barang": det.Kode,
        "Nama Barang": det.Nama,
        Spesifikasi: det.Spesifikasi || det.Kegunaan,
        Satuan: det.Satuan,
        Jumlah: Number(det.Jumlah) || 0,
        "Qty BPB": Number(det.QtyBpb) || 0,
        Harga: Number(det.Harga) || 0,
        Total: Number(det.Total) || 0,
      });
    });
  });

  const ws = XLSX.utils.json_to_sheet(exportData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "PO Detail");
  XLSX.writeFile(wb, "Laporan_Detail_PO_NonBahan.xlsx");
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
    await poNonBahanService.requestPin({
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

const getStatusColor = (status: string) => {
  if (!status) return "text-red font-weight-bold";
  if (status === "PROSES") return "text-blue font-weight-bold";
  return "font-weight-bold"; // CLOSE
};

const formatQty = (val: any) => {
  return Number(val || 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

// ── PEWARNAAN BARIS (Migrasi cxGrdMasterCustomDrawCell Delphi) ──
const rowPropsFn = (data: any) => {
  const item = data.item?.raw || data.item;

  if (!item.Status || item.Status.trim() === "") {
    return { class: "text-red" }; // Status kosong/Open jadi Merah
  } else if (item.Status === "PROSES") {
    return { class: "text-blue" }; // Status PROSES jadi Biru
  }

  return {};
};
</script>

<template>
  <BaseBrowse
    title="PO Garmen"
    menu-id="66"
    :icon="IconFileInvoice"
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
    v-model:expanded="expandedRows"
    @add="onAdd"
    @edit="onEdit"
    @delete="onDelete"
    @export="exportToExcel('Data_PO_NonBahan')"
    @refresh="fetchData"
    :row-props-fn="rowPropsFn"
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
        <span class="filter-label">Ke Cabang:</span>
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

    <template #filter-right>
      <div class="d-flex align-center bg-white pa-1 px-3 rounded border mr-2">
        <div class="d-flex align-center mr-3">
          <div
            class="legend-box bg-red mr-1"
            style="width: 14px; height: 14px; border-radius: 2px"
          ></div>
          <span class="text-caption font-weight-bold">Open</span>
        </div>
        <div class="d-flex align-center">
          <div
            class="legend-box bg-blue mr-1"
            style="width: 14px; height: 14px; border-radius: 2px"
          ></div>
          <span class="text-caption font-weight-bold">Proses</span>
        </div>
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

    <template #item.Tanggal="{ item }">
      {{ formatTanggal(item.Tanggal) }}
    </template>

    <template #item.Status="{ item }">
      <span :class="getStatusColor(item.Status)">{{ item.Status }}</span>
    </template>

    <template #detail="{ item }">
      <div class="det-wrap">
        <div class="d-flex flex-column gap-3">
          <div class="border rounded overflow-hidden">
            <div
              class="bg-blue-lighten-4 px-3 py-1 text-caption font-weight-bold"
            >
              Rincian Barang PO - {{ item.Nomor }}
            </div>
            <div class="table-scroll-x">
              <table class="dt">
                <thead>
                  <tr>
                    <th style="width: 100px">Kode</th>
                    <th style="min-width: 250px">Nama Barang</th>
                    <th style="width: 80px" class="text-center">Satuan</th>
                    <th
                      v-if="
                        filterState.jenis === 'SPAREPART' ||
                        filterState.jenis === 'ATK/RTK'
                      "
                      style="min-width: 150px"
                    >
                      Spesifikasi
                    </th>
                    <th
                      v-if="
                        filterState.jenis === 'SPAREPART' ||
                        filterState.jenis === 'ATK/RTK'
                      "
                      style="min-width: 150px"
                    >
                      Kegunaan
                    </th>
                    <th style="width: 80px" class="text-right">Jumlah</th>
                    <th style="width: 80px" class="text-right">Qty BPB</th>
                    <th
                      v-if="item.Harga !== 0"
                      style="width: 100px"
                      class="text-right"
                    >
                      Harga
                    </th>
                    <th
                      v-if="item.Total !== 0"
                      style="width: 110px"
                      class="text-right"
                    >
                      Total
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(dtl, i) in getDetailItems(item.Nomor)" :key="i">
                    <td class="fw-mono text-primary">{{ dtl.Kode }}</td>
                    <td class="font-weight-bold">{{ dtl.Nama }}</td>
                    <td class="text-center">{{ dtl.Satuan }}</td>
                    <td
                      v-if="
                        filterState.jenis === 'SPAREPART' ||
                        filterState.jenis === 'ATK/RTK'
                      "
                    >
                      {{ dtl.Spesifikasi }}
                    </td>
                    <td
                      v-if="
                        filterState.jenis === 'SPAREPART' ||
                        filterState.jenis === 'ATK/RTK'
                      "
                    >
                      {{ dtl.Kegunaan }}
                    </td>
                    <td class="text-right font-weight-bold">
                      {{ formatQty(dtl.Jumlah) }}
                    </td>
                    <td class="text-right font-weight-bold text-success">
                      {{ formatQty(dtl.QtyBpb) }}
                    </td>
                    <td v-if="dtl.Harga > 0" class="text-right">
                      {{ formatQty(dtl.Harga) }}
                    </td>
                    <td
                      v-if="dtl.Total > 0"
                      class="text-right font-weight-bold text-error"
                    >
                      {{ formatQty(dtl.Total) }}
                    </td>
                  </tr>
                  <tr v-if="getDetailItems(item.Nomor).length === 0">
                    <td
                      colspan="9"
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
      <v-card-title class="bg-primary text-white pa-3"
        >Pengajuan Perubahan Data</v-card-title
      >
      <v-card-text class="pa-4">
        <div class="mb-3 text-body-2">
          <div><strong>PO:</strong> {{ selectedItem?.Nomor }}</div>
          <div>
            <strong>Supplier:</strong> {{ selectedItem?.Supplier || "-" }}
          </div>
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
