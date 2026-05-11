<script setup lang="ts">
import { ref, onMounted, watch, computed } from "vue";
import { useRouter } from "vue-router";
import { useToast } from "vue-toastification";
import { useAuthStore } from "@/stores/authStore";
import BaseBrowse from "@/components/BaseBrowse.vue";
import { useBrowse } from "@/composables/useBrowse";
import { salesOrderService } from "@/services/penjualan/salesOrderService";
import CustomerSearchModal from "@/components/lookups/CustomerSearchModal.vue";
import {
  IconShoppingCartCopy,
  IconPrinter,
  IconFileExport,
  IconPhoto,
  IconLock,
  IconLockOpen,
  IconShieldLock,
  IconSearch,
  IconDotsVertical,
  IconCheck,
  IconX,
  IconLockSquare,
  IconPalette,
} from "@tabler/icons-vue";

const authStore = useAuthStore();
const router = useRouter();
const toast = useToast();

const isTimDesain = computed(
  () => authStore.user?.bagian?.toUpperCase() === "DESAIN",
);

// --- FILTERS ---
const today = new Date().toISOString().substring(0, 10);
const dtAwal = ref(today);
const dtAkhir = ref(today);
const workshop = ref("ALL");
const selectedCustomer = ref<{ kode: string; nama: string } | null>(null);
const listWorkshop = ref<string[]>([]);
const showCusModal = ref(false);

const filterState = ref({
  dtAwal: dtAwal.value,
  dtAkhir: dtAkhir.value,
  workshop: workshop.value,
  customer: selectedCustomer.value?.kode || "",
});

// --- STATE MODAL DESAIN ---
const showDesignDialog = ref(false);
const pendingDesigns = ref<any[]>([]);
const selectedDesigns = ref<any[]>([]);
const isDesignLoading = ref(false);
const isDesignSaving = ref(false);

const {
  items,
  isLoading,
  selected,
  canInsert,
  canEdit,
  canDelete,
  canExport,
  selectedItem,
  fetchData,
  exportToExcel,
} = useBrowse({
  menuId: "172",
  fetchApi: async () => {
    const res = await salesOrderService.getBrowse({
      startDate: dtAwal.value,
      endDate: dtAkhir.value,
      workshop: workshop.value,
      customer: selectedCustomer.value?.kode,
    });
    return res.data.data;
  },
  immediate: false,
});

// --- HEADERS ---
const headers = [
  { title: "Nomor", key: "Nomor", width: "135px", fixed: true },
  { title: "MO", key: "MO", width: "80px" },
  { title: "CMO", key: "CMO", width: "80px" },
  { title: "Tanggal", key: "Tanggal", width: "100px", align: "center" },
  { title: "Dateline", key: "Dateline", width: "100px", align: "center" },
  { title: "Kepentingan", key: "Kepentingan", width: "100px" },
  { title: "Divisi", key: "Divisi", width: "100px" },
  { title: "Kode Customer", key: "KodeCustomer", width: "100px" },
  { title: "Customer", key: "Customer", width: "200px" },
  { title: "Nama Pesanan", key: "Nama", width: "250px" },
  { title: "Ukuran", key: "Ukuran", width: "100px" },
  { title: "Cab", key: "Cab", width: "60px", align: "center" },
  { title: "Workshop", key: "Workshop", width: "100px" },
  { title: "Pending", key: "Pending", width: "80px" },
  { title: "Ket Pending", key: "KetPending", width: "150px" },
  { title: "Tipe", key: "Tipe", width: "80px" },
  { title: "Panjang", key: "Panjang", width: "80px", align: "right" },
  { title: "Lebar", key: "Lebar", width: "80px", align: "right" },
  { title: "Gramasi", key: "Gramasi", width: "80px" },
  { title: "Kain", key: "Kain", width: "150px" },
  { title: "Finishing", key: "Finishing", width: "150px" },
  { title: "Harga", key: "Harga", width: "100px", align: "right" },
  { title: "Pesan", key: "Pesan", width: "80px", align: "right" },
  { title: "Pra SJ", key: "Prasj", width: "80px", align: "right" },
  { title: "Kirim", key: "Kirim", width: "80px", align: "right" },
  { title: "Kurang", key: "Kurang", width: "80px", align: "right" },
  { title: "Sales", key: "Sales", width: "120px" },
  { title: "Created", key: "Created", width: "140px", align: "center" },
  { title: "Group Customer", key: "GroupCustomer", width: "150px" },
  { title: "PO", key: "PO", width: "120px" },
  { title: "Ket PO", key: "KetPO", width: "150px" },
  { title: "Date PO", key: "DatePO", width: "100px", align: "center" },
  { title: "Dateline PO", key: "DatelinePO", width: "100px", align: "center" },
  { title: "Status", key: "Status", width: "80px", align: "center" },
  { title: "Alasan Close", key: "AlasanClose", width: "150px" },
  { title: "No Penawaran", key: "NoPenawaran", width: "130px" },
  { title: "MAP", key: "MAP", width: "130px" },
  { title: "Repeat", key: "Repeat", width: "80px" },

  // --- Kolom Produksi ---
  { title: "Potong", key: "Potong", width: "80px", align: "right" },
  { title: "Qc Potong", key: "QcPotong", width: "80px", align: "right" },
  { title: "Bordir", key: "Bordir", width: "80px", align: "right" },
  { title: "Cetak", key: "Cetak", width: "80px", align: "right" },
  { title: "Qc Cetak", key: "QcCetak", width: "80px", align: "right" },
  { title: "DC", key: "DC", width: "80px", align: "right" },
  { title: "Jahit", key: "Jahit", width: "80px", align: "right" },
  { title: "Lipat", key: "Lipat", width: "80px", align: "right" },
  { title: "Jadi", key: "Jadi", width: "80px", align: "right" },

  // --- Kolom Kekurangan Produksi ---
  { title: "Kurang Jadi", key: "Kurang_Jadi", width: "90px", align: "right" },
  {
    title: "Kurang Potong",
    key: "Kurang_Potong",
    width: "90px",
    align: "right",
  },
  {
    title: "Kurang Bordir",
    key: "Kurang_Bordir",
    width: "90px",
    align: "right",
  },
  { title: "Kurang Cetak", key: "Kurang_Cetak", width: "90px", align: "right" },
  {
    title: "Kurang Qc Cetak",
    key: "Kurang_QcCetak",
    width: "110px",
    align: "right",
  },
  { title: "Kurang Jahit", key: "Kurang_Jahit", width: "90px", align: "right" },
  { title: "Kurang Lipat", key: "Kurang_Lipat", width: "90px", align: "right" },

  // --- Kolom Status & ACC ---
  { title: "Aktif", key: "Aktif", width: "60px", align: "center" },
  { title: "Acc", key: "Acc", width: "60px", align: "center" },
  { title: "Acc H0", key: "AccH0", width: "60px", align: "center" },
  { title: "Acc JO", key: "AccJO", width: "80px", align: "center" },
  { title: "Acc Pending", key: "AccPending", width: "90px", align: "center" },
  { title: "MPPB", key: "MPPB", width: "120px" },

  // --- Kolom Design ---
  {
    title: "Design Tgl",
    key: "Design_Tanggal",
    width: "100px",
    align: "center",
  },
  { title: "Design User", key: "Design_User", width: "100px" },
  { title: "Design Note", key: "Design_Note", width: "200px" },
  { title: "Design Baru", key: "Design_Baru", width: "90px", align: "center" },
  { title: "Design Done", key: "Design_Done", width: "90px", align: "center" },

  { title: "Keterangan", key: "Keterangan", width: "250px" },
  { title: "Pesanan/Invoice", key: "Pesanan/Invoice", width: "150px" },
];

// --- EXPAND LOGIC (Breakdown Size) ---
const expandedRows = ref<any[]>([]);
const sizeCache = ref<Record<string, any[]>>({});
const expandedLoading = ref<Record<string, boolean>>({});

const onUpdateExpanded = async (newExpanded: any[]) => {
  expandedRows.value = newExpanded;
  const newlyExpanded = newExpanded.filter(
    (item) =>
      !sizeCache.value[item.Nomor] && !expandedLoading.value[item.Nomor],
  );

  for (const item of newlyExpanded) {
    const nomor = item.Nomor;
    expandedLoading.value[nomor] = true;
    try {
      const res = await salesOrderService.getSizes(nomor);
      sizeCache.value[nomor] = res.data.data;
    } catch {
      toast.error(`Gagal muat detail size ${nomor}`);
    } finally {
      expandedLoading.value[nomor] = false;
    }
  }
};

// --- LOGIKA PEWARNAAN BARIS (REPLIKA DELPHI) ---
const rowPropsFn = (data: any) => {
  const item = data.item?.raw || data.item;
  const classes: string[] = ["font-weight-bold"];
  let style = "";

  // 1. Logika Font Color
  if (item.Status === "Open") {
    classes.push("text-red-darken-1"); // clRed
  }

  if (item.Aktif === "N") {
    if (item.Acc === "Y" || item.AccH0 === "Y" || item.AccJO === "ACC") {
      classes.push("text-blue-darken-2"); // clBlue
    } else {
      classes.push("text-grey-darken-1"); // clGrayText
    }
  } else {
    // Jika Aktif Y tapi ada penolakan
    if (item.Acc === "N" || item.AccH0 === "N" || item.AccJO === "TOLAK") {
      classes.push("text-green-darken-2"); // clGreen
    }
  }

  // Pending Status
  if (item.Pending !== "NORMAL") {
    if (item.AccPending === "N") classes.push("text-fuchsia-darken-1");
    else if (item.AccPending === "ACC") classes.push("text-orange-darken-3");
  }

  // 2. Logika Nama SPK Kuning (Design Status)
  // Di handle via template slot Nama

  return { class: classes.join(" "), style };
};

// Logika khusus untuk kolom Nomor (Status PIN / Ngedit)
const getNomorStyle = (ngedit: string) => {
  if (ngedit === "WAIT") return "background-color: #1976d2; color: #fff;"; // Blue
  if (ngedit === "TOLAK") return "background-color: #d32f2f; color: #fff;"; // Red
  if (ngedit === "ACC") return "background-color: #388e3c; color: #fff;"; // Green
  return "";
};

// --- HANDLERS ---
onMounted(async () => {
  fetchData();
  try {
    const res = await salesOrderService.getWorkshops();
    listWorkshop.value = res.data.data; // Sekarang res.data.data berisi array ["HO-", "P01", ...]
  } catch (e) {
    console.error("Gagal load workshop:", e);
  }
});

watch([dtAwal, dtAkhir, workshop], () => fetchData());

const onAdd = () => router.push("/penjualan/sales-order/create");
const onEdit = (item: any) =>
  router.push(`/penjualan/sales-order/edit/${encodeURIComponent(item.Nomor)}`);

const onDelete = async (item: any) => {
  try {
    await salesOrderService.deleteData(item.Nomor);
    toast.success("Data berhasil dihapus.");
    fetchData();
  } catch (e: any) {
    toast.error(e.response?.data?.message || "Gagal menghapus.");
  }
};

const onPrint = () => {
  if (!selectedItem.value) return;
  window.open(
    `/penjualan/sales-order/print/${encodeURIComponent(selectedItem.value.Nomor)}`,
    "_blank",
  );
};

// State Gambar
const dialogGambar = ref(false);
const gambarUrl = ref("");
const onLihatGambar = () => {
  if (!selectedItem.value) return;
  gambarUrl.value = `http://103.94.238.252:8888/file-gambar/${selectedItem.value.Nomor}.jpg`;
  dialogGambar.value = true;
};

// PIN Dialog
const pinDialog = ref(false);
const pinAlasan = ref("");
const openPinDialog = () => {
  if (!selectedItem.value) return;
  pinAlasan.value = "";
  pinDialog.value = true;
};
const submitPin = async () => {
  try {
    await salesOrderService.requestPin(
      selectedItem.value.Nomor,
      pinAlasan.value,
    );
    toast.success("Pengajuan PIN dikirim.");
    pinDialog.value = false;
    fetchData();
  } catch (e: any) {
    toast.error(e.response?.data?.message || "Gagal kirim PIN.");
  }
};

// --- HANDLERS TINDAKAN SPK ---
const onApproveSpk = async () => {
  if (!selectedItem.value) return;
  if (
    confirm(`Yakin ingin menyetujui (Approve) SPK ${selectedItem.value.Nomor}?`)
  ) {
    try {
      await salesOrderService.approveCmo(selectedItem.value.Nomor);
      toast.success("SPK berhasil di-approve.");
      fetchData();
    } catch (e: any) {
      toast.error(e.response?.data?.message || "Gagal approve SPK.");
    }
  }
};

const showCloseSpkDialog = ref(false);
const alasanClose = ref("");

const openCloseSpk = () => {
  if (!selectedItem.value) return;
  if (selectedItem.value.Status === "Closed")
    return toast.warning("Status sudah Close.");
  alasanClose.value = "";
  showCloseSpkDialog.value = true;
};

const submitCloseSpk = async () => {
  if (!alasanClose.value.trim())
    return toast.error("Alasan close wajib diisi.");
  try {
    await salesOrderService.toggleClose(selectedItem.value.Nomor, {
      isClose: true,
      alasan: alasanClose.value,
    });
    toast.success("SPK berhasil diclose.");
    showCloseSpkDialog.value = false;
    fetchData();
  } catch (e: any) {
    toast.error(e.response?.data?.message || "Gagal close SPK.");
  }
};

const onBatalCloseSpk = async () => {
  if (!selectedItem.value) return;
  if (selectedItem.value.Status === "Open")
    return toast.warning("SPK ini belum Close. Tidak perlu dibatalkan.");
  if (
    selectedItem.value.Status === "Closed" &&
    !selectedItem.value.AlasanClose
  ) {
    return toast.warning(
      "SPK ini diclose Otomatis. Tidak bisa dibatalkan manual.",
    );
  }

  if (
    confirm(
      `Yakin ingin membatalkan Close untuk SPK ${selectedItem.value.Nomor}?`,
    )
  ) {
    try {
      await salesOrderService.toggleClose(selectedItem.value.Nomor, {
        isClose: false,
      });
      toast.success("Close SPK berhasil dibatalkan.");
      fetchData();
    } catch (e: any) {
      toast.error(e.response?.data?.message || "Gagal membatalkan close.");
    }
  }
};

const openDesignDialog = async () => {
  showDesignDialog.value = true;
  isDesignLoading.value = true;
  selectedDesigns.value = []; // Reset pilihan
  try {
    const res = await salesOrderService.getPendingDesigns({
      startDate: dtAwal.value,
      endDate: dtAkhir.value,
    });
    pendingDesigns.value = res.data.data;
  } catch (e: any) {
    toast.error(
      e.response?.data?.message || "Gagal mengambil data antrean desain.",
    );
  } finally {
    isDesignLoading.value = false;
  }
};

const submitDesignStatus = async () => {
  if (selectedDesigns.value.length === 0) {
    return toast.warning(
      "Pilih minimal satu SPK yang desainnya sudah selesai.",
    );
  }

  isDesignSaving.value = true;
  try {
    const listNomor = selectedDesigns.value.map((item) => item.Nomor);
    await salesOrderService.updateDesignStatus(listNomor);
    toast.success("Status desain berhasil diupdate!");
    showDesignDialog.value = false;
    fetchData(); // Refresh tabel utama agar highlight kuning hilang
  } catch (e: any) {
    toast.error(e.response?.data?.message || "Gagal menyimpan status desain.");
  } finally {
    isDesignSaving.value = false;
  }
};

const formatTgl = (v: string) => {
  if (!v) return "-";
  const d = new Date(v);
  return `${String(d.getDate()).padStart(2, "0")}-${String(d.getMonth() + 1).padStart(2, "0")}-${d.getFullYear()}`;
};

const numFmt = (v: any) => (v ? Number(v).toLocaleString("id-ID") : "0");
const formatWaktu = (v: string) => {
  if (!v) return "-";
  const d = new Date(v);
  return `${String(d.getDate()).padStart(2, "0")}-${String(d.getMonth() + 1).padStart(2, "0")}-${d.getFullYear()} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};
</script>

<template>
  <BaseBrowse
    title="Sales Order"
    menu-id="172"
    :icon="IconShoppingCartCopy"
    :headers="headers"
    :items="items"
    :is-loading="isLoading"
    v-model:selected="selected"
    v-model:filter-state="filterState"
    :can-insert="canInsert"
    :can-edit="canEdit"
    :can-delete="canDelete"
    :can-export="canExport"
    item-value="Nomor"
    :row-props-fn="rowPropsFn"
    @add="onAdd"
    @edit="onEdit"
    @delete="onDelete"
    @refresh="fetchData"
    @export="exportToExcel('Sales_Order')"
    show-expand
    :expanded="expandedRows"
    @update:expanded="onUpdateExpanded"
  >
    <template #filter-left>
      <div class="f-group">
        <span class="f-label">Periode</span>
        <input type="date" v-model="dtAwal" class="f-date" />
        <span class="f-sep">s/d</span>
        <input type="date" v-model="dtAkhir" class="f-date" />
      </div>
      <div class="f-divider" />
      <div class="f-group">
        <span class="f-label">Workshop</span>
        <select v-model="workshop" class="f-select">
          <option value="ALL">SEMUA WORKSHOP</option>
          <option v-for="w in listWorkshop" :key="w" :value="w">{{ w }}</option>
        </select>
      </div>
      <div class="f-divider" />
      <div class="f-group">
        <div class="f-lookup" @click="showCusModal = true">
          {{ selectedCustomer?.nama || "SEMUA CUSTOMER" }}
          <IconSearch :size="14" class="ml-auto" />
        </div>
        <button
          v-if="selectedCustomer"
          class="f-clear"
          @click="selectedCustomer = null"
        >
          ✕
        </button>
      </div>
    </template>

    <template #filter-right>
      <div class="legend-box">
        <div class="legend-row">
          <span class="legend-title">Font:</span>
          <div class="legend-item">
            <div class="legend-dot" style="background: #e53935"></div>
            Aktif/Open
          </div>
          <div class="legend-item">
            <div class="legend-dot" style="background: #757575"></div>
            Pasif Blm Acc
          </div>
          <div class="legend-item">
            <div class="legend-dot" style="background: #1565c0"></div>
            Pasif Sdh Acc
          </div>
          <div class="legend-item">
            <div class="legend-dot" style="background: #2e7d32"></div>
            Tolak
          </div>
          <div class="legend-item">
            <div class="legend-dot" style="background: #ab47bc"></div>
            Pending
          </div>
          <div class="legend-item">
            <div class="legend-dot" style="background: #e65100"></div>
            Pending Acc
          </div>
        </div>
        <div class="legend-divider" />
        <div class="legend-row">
          <span class="legend-title">Back (No):</span>
          <div class="legend-item">
            <div class="legend-dot" style="background: #1565c0"></div>
            Nunggu
          </div>
          <div class="legend-item">
            <div class="legend-dot" style="background: #2e7d32"></div>
            Acc
          </div>
          <div class="legend-item">
            <div class="legend-dot" style="background: #c62828"></div>
            Tolak
          </div>
        </div>
      </div>
    </template>

    <template #item.Nomor="{ item }">
      <div class="nomor-cell" :style="getNomorStyle(item.Ngedit)">
        {{ item.Nomor }}
      </div>
    </template>

    <template #item.Nama="{ item }">
      <span
        :class="{
          'design-warning':
            item.Design_Baru === 'Y' && item.Design_Done === 'N',
        }"
      >
        {{ item.Nama }}
      </span>
    </template>

    <template #item.Tanggal="{ item }">{{ formatTgl(item.Tanggal) }}</template>
    <template #item.Dateline="{ item }">{{
      formatTgl(item.Dateline)
    }}</template>
    <template #item.DatePO="{ item }">{{ formatTgl(item.DatePO) }}</template>
    <template #item.DatelinePO="{ item }">{{
      formatTgl(item.DatelinePO)
    }}</template>
    <template #item.Design_Tanggal="{ item }">{{
      formatTgl(item.Design_Tanggal)
    }}</template>
    <template #item.Created="{ item }">{{
      formatWaktu(item.Created)
    }}</template>

    <template #item.Harga="{ item }">{{ numFmt(item.Harga) }}</template>
    <template #item.Pesan="{ item }">{{ numFmt(item.Pesan) }}</template>
    <template #item.Kirim="{ item }">{{ numFmt(item.Kirim) }}</template>
    <template #item.Kurang="{ item }">{{ numFmt(item.Kurang) }}</template>

    <template
      v-for="col in [
        'Potong',
        'QcPotong',
        'Bordir',
        'Cetak',
        'QcCetak',
        'DC',
        'Jahit',
        'Lipat',
        'Jadi',
        'Kurang_Jadi',
        'Kurang_Potong',
        'Kurang_Bordir',
        'Kurang_Cetak',
        'Kurang_QcCetak',
        'Kurang_Jahit',
        'Kurang_Lipat',
      ]"
      :key="col"
      v-slot:[`item.${col}`]="{ item }"
    >
      {{ numFmt(item[col]) }}
    </template>

    <template #detail="{ item }">
      <div class="expand-wrap">
        <v-progress-linear
          v-if="expandedLoading[item.Nomor]"
          indeterminate
          color="primary"
          height="2"
        />
        <div v-else>
          <div class="expand-title mb-2">
            Detail Breakdown Size - {{ item.Nomor }}
          </div>
          <table class="size-table">
            <thead>
              <tr>
                <th width="150">Nomor SPK</th>
                <th width="80">Size</th>
                <th width="100" class="tr">Qty Pesan</th>
                <th width="100" class="tr">Sudah Stbj</th>
                <th width="100" class="tr">Sisa Kurang</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="s in sizeCache[item.Nomor]" :key="s.Size">
                <td>{{ s.Nomor }}</td>
                <td class="fw-bold">{{ s.Size }}</td>
                <td class="tr">{{ numFmt(s.Qty) }}</td>
                <td class="tr">{{ numFmt(s.Stbj) }}</td>
                <td class="tr text-error fw-bold">{{ numFmt(s.Kurang) }}</td>
              </tr>
              <tr
                v-if="
                  !sizeCache[item.Nomor] || sizeCache[item.Nomor].length === 0
                "
              >
                <td colspan="5" class="text-center text-grey italic py-4">
                  Data breakdown size tidak ditemukan.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </template>

    <template #extra-actions="{ selected }">
      <v-btn
        v-if="isTimDesain"
        size="small"
        color="orange-darken-3"
        @click="openDesignDialog"
      >
        <template #prepend><IconPalette :size="15" /></template>Update Desain
      </v-btn>

      <v-btn
        size="small"
        color="grey-darken-3"
        :disabled="selected.length === 0"
        @click="onPrint"
      >
        <template #prepend><IconPrinter :size="15" /></template>Cetak
      </v-btn>
      <v-btn
        size="small"
        color="indigo"
        :disabled="selected.length === 0"
        @click="onLihatGambar"
      >
        <template #prepend><IconPhoto :size="15" /></template>
        Gambar
      </v-btn>

      <v-menu v-if="selected.length > 0">
        <template #activator="{ props }">
          <v-btn size="small" color="teal-darken-3" v-bind="props">
            <template #prepend><IconDotsVertical :size="15" /></template>
            Tindakan
          </v-btn>
        </template>
        <v-list density="compact" class="text-caption">
          <v-list-item @click="openPinDialog">
            <template #prepend
              ><IconShieldLock :size="14" class="mr-2 text-primary"
            /></template>
            <v-list-item-title>Pengajuan Perubahan Data</v-list-item-title>
          </v-list-item>
          <v-list-item @click="onApproveSpk" :disabled="!canEdit">
            <template #prepend
              ><IconCheck :size="14" class="mr-2 text-success"
            /></template>
            <v-list-item-title>Approval SPK</v-list-item-title>
          </v-list-item>
          <v-divider class="my-1"></v-divider>
          <v-list-item @click="openCloseSpk" :disabled="!canDelete">
            <template #prepend
              ><IconLockSquare :size="14" class="mr-2 text-warning"
            /></template>
            <v-list-item-title>Close SPK</v-list-item-title>
          </v-list-item>
          <v-list-item @click="onBatalCloseSpk" :disabled="!canDelete">
            <template #prepend
              ><IconX :size="14" class="mr-2 text-error"
            /></template>
            <v-list-item-title>Batal Close</v-list-item-title>
          </v-list-item>
        </v-list>
      </v-menu>
    </template>
  </BaseBrowse>

  <CustomerSearchModal
    v-model="showCusModal"
    @selected="(c) => (selectedCustomer = { kode: c.Kode, nama: c.Nama })"
  />

  <v-dialog v-model="pinDialog" max-width="400">
    <v-card rounded="lg">
      <v-card-title class="bg-primary text-white pa-3 text-subtitle-1"
        >Pengajuan Perubahan Data</v-card-title
      >
      <v-card-text class="pa-4">
        <p class="text-caption mb-2">
          Nomor: <b>{{ selectedItem?.Nomor }}</b>
        </p>
        <v-textarea
          v-model="pinAlasan"
          label="Alasan Perubahan"
          variant="outlined"
          density="compact"
          rows="3"
          hide-details
        />
      </v-card-text>
      <v-card-actions class="pa-3 border-t">
        <v-spacer />
        <v-btn variant="text" @click="pinDialog = false">Batal</v-btn>
        <v-btn color="primary" variant="elevated" @click="submitPin"
          >Kirim Pengajuan</v-btn
        >
      </v-card-actions>
    </v-card>
  </v-dialog>

  <v-dialog v-model="showCloseSpkDialog" max-width="400">
    <v-card rounded="lg">
      <v-card-title class="bg-warning text-white pa-3 text-subtitle-1"
        >Close SPK</v-card-title
      >
      <v-card-text class="pa-4">
        <p class="text-caption mb-2">
          Menutup SPK Nomor: <b>{{ selectedItem?.Nomor }}</b>
        </p>
        <v-textarea
          v-model="alasanClose"
          label="Alasan Close"
          variant="outlined"
          density="compact"
          rows="3"
          hide-details
          autofocus
        />
      </v-card-text>
      <v-card-actions class="pa-3 border-t">
        <v-spacer />
        <v-btn variant="text" @click="showCloseSpkDialog = false">Batal</v-btn>
        <v-btn color="warning" variant="elevated" @click="submitCloseSpk"
          >Proses Close</v-btn
        >
      </v-card-actions>
    </v-card>
  </v-dialog>

  <v-dialog v-model="dialogGambar" max-width="800px">
    <v-card class="rounded-lg">
      <v-card-title
        class="bg-primary text-white d-flex justify-space-between align-center pa-3"
      >
        <span>Gambar SPK: {{ selected[0]?.Nomor }}</span>
        <v-btn
          variant="text"
          size="small"
          color="white"
          @click="dialogGambar = false"
          ><IconX :size="18"
        /></v-btn>
      </v-card-title>
      <v-card-text class="pa-4 text-center bg-grey-lighten-4">
        <v-img
          :src="gambarUrl"
          max-height="600"
          contain
          class="bg-white rounded border"
        >
          <template v-slot:placeholder>
            <div
              class="d-flex flex-column align-center justify-center fill-height"
            >
              <v-progress-circular
                indeterminate
                color="primary"
                size="40"
              ></v-progress-circular>
            </div>
          </template>
          <template v-slot:error>
            <div
              class="d-flex flex-column align-center justify-center fill-height text-grey"
            >
              <IconPhotoOff :size="48" color="#bdbdbd" />
              <div class="text-subtitle-2 mt-2">
                Gambar tidak tersedia di server
              </div>
            </div>
          </template>
        </v-img>
      </v-card-text>
      <v-card-actions class="bg-white pa-2 border-t">
        <v-spacer></v-spacer>
        <v-btn color="primary" variant="text" :href="gambarUrl" target="_blank">
          <template #prepend><IconExternalLink :size="15" /></template>Buka di
          Tab Baru
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <v-dialog v-model="showDesignDialog" max-width="600" scrollable>
    <v-card rounded="lg">
      <v-card-title
        class="bg-orange-darken-3 text-white pa-3 text-subtitle-1 d-flex align-center"
      >
        <IconPalette :size="18" class="mr-2" />
        Checklist Antrean Desain Selesai
      </v-card-title>
      <v-card-text class="pa-0">
        <v-data-table
          v-model="selectedDesigns"
          :items="pendingDesigns"
          :loading="isDesignLoading"
          item-value="Nomor"
          show-select
          return-object
          density="compact"
          height="400px"
          fixed-header
          hide-default-footer
          :items-per-page="-1"
          class="text-caption"
        >
          <template #headers>
            <tr>
              <th width="40"></th>
              <th width="150" class="text-left font-weight-bold">Nomor SPK</th>
              <th class="text-left font-weight-bold">Nama Pesanan</th>
            </tr>
          </template>
          <template #item.Nomor="{ item }">
            <span class="font-weight-bold">{{ item.Nomor }}</span>
          </template>
          <template #no-data>
            <div class="pa-4 text-center text-grey">
              Tidak ada antrean desain untuk periode ini.
            </div>
          </template>
        </v-data-table>
      </v-card-text>
      <v-card-actions class="pa-3 border-t bg-grey-lighten-4">
        <v-spacer />
        <v-btn variant="text" @click="showDesignDialog = false">Tutup</v-btn>
        <v-btn
          color="orange-darken-3"
          variant="elevated"
          :loading="isDesignSaving"
          @click="submitDesignStatus"
        >
          Simpan Ceklis
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.f-group {
  display: flex;
  align-items: center;
  gap: 6px;
}
.f-label {
  font-size: 11px;
  font-weight: 700;
  color: #555;
  white-space: nowrap;
}
.f-date,
.f-select {
  height: 28px;
  border: 1px solid #ccc;
  border-radius: 4px;
  padding: 0 6px;
  font-size: 12px;
  outline: none;
  background: white;
}
.f-divider {
  width: 1px;
  height: 20px;
  background: #ddd;
  margin: 0 8px;
}
.f-lookup {
  height: 28px;
  border: 1px solid #ccc;
  border-radius: 4px;
  padding: 0 8px;
  font-size: 11px;
  display: flex;
  align-items: center;
  min-width: 150px;
  cursor: pointer;
  background: #f9f9f9;
}
.f-clear {
  background: none;
  border: none;
  color: #f44336;
  cursor: pointer;
  font-size: 14px;
  padding: 0 4px;
}

.nomor-cell {
  padding: 2px 8px;
  border-radius: 4px;
  font-family: monospace;
  display: inline-block;
  min-width: 100%;
}
.design-warning {
  background-color: #fff176;
  color: #000;
  padding: 0 4px;
  border-radius: 2px;
}

/* Styling Detail Expand */
.expand-wrap {
  padding: 10px 10px 10px 50px;
  background: #eceff1;
}
.size-table {
  width: 100%;
  border-collapse: collapse;
  background: white;
  border-radius: 4px;
  overflow: hidden;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
}
.size-table th {
  background: #546e7a;
  color: white;
  text-align: left;
  padding: 6px 10px;
  font-size: 11px;
}
.size-table td {
  padding: 4px 10px;
  border-bottom: 1px solid #eee;
  font-size: 12px;
}
.tr {
  text-align: right !important;
}

/* Styling Legend */
.legend-box {
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  padding: 4px 8px;
  display: flex;
  flex-direction: column;
  gap: 3px;
}
.legend-row {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: nowrap;
}
.legend-title {
  font-size: 10px;
  font-weight: 700;
  color: #555;
  white-space: nowrap;
  flex-shrink: 0;
}
.legend-item {
  display: flex;
  align-items: center;
  gap: 3px;
  font-size: 10px;
  color: #424242;
  white-space: nowrap;
}
.legend-dot {
  width: 9px;
  height: 9px;
  border-radius: 2px;
  flex-shrink: 0;
}
.legend-divider {
  height: 1px;
  background: #eeeeee;
}
</style>
