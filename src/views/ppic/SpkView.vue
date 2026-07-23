<script setup lang="ts">
import { ref, onMounted, watch, computed } from "vue";
import { useRouter } from "vue-router";
import { useToast } from "vue-toastification";
import { useAuthStore } from "@/stores/authStore";
import BaseBrowse from "@/components/BaseBrowse.vue";
import { useBrowse } from "@/composables/useBrowse";
import { spkService } from "@/services/ppic/spkService";
import { exportExcelSingle } from "@/utils/excelExport";
import CustomerSearchModal from "@/components/lookups/CustomerSearchModal.vue";
import api from "@/services/api";
import {
  IconClipboardText,
  IconPrinter,
  IconFileExport,
  IconPhoto,
  IconShieldLock,
  IconSearch,
  IconDotsVertical,
  IconCheck,
  IconX,
  IconLockSquare,
} from "@tabler/icons-vue";
import { formatTanggal, formatTanggalJam } from "@/utils/dateFormat";

const authStore = useAuthStore();
const router = useRouter();
const toast = useToast();

// --- FILTERS ---
const listWorkshop = ref<string[]>([]);
const showCusModal = ref(false);

const today = new Date().toISOString().substring(0, 10);
const SESSION_KEY = "spk_ppic_browse_filter";

const savedFilter = (() => {
  try {
    return JSON.parse(sessionStorage.getItem(SESSION_KEY) || "{}");
  } catch {
    return {};
  }
})();

const filterState = ref({
  dtAwal: savedFilter.dtAwal || today,
  dtAkhir: savedFilter.dtAkhir || today,
  workshop: savedFilter.workshop || "ALL",
  customer: savedFilter.customer || "",
  cusNama: savedFilter.cusNama || "",
});

const dtAwal = computed({
  get: () => filterState.value.dtAwal,
  set: (v) => {
    filterState.value = { ...filterState.value, dtAwal: v };
  },
});
const dtAkhir = computed({
  get: () => filterState.value.dtAkhir,
  set: (v) => {
    filterState.value = { ...filterState.value, dtAkhir: v };
  },
});
const workshop = computed({
  get: () => filterState.value.workshop,
  set: (v) => {
    filterState.value = { ...filterState.value, workshop: v };
  },
});
const selectedCustomer = computed({
  get: () =>
    filterState.value.customer
      ? { kode: filterState.value.customer, nama: filterState.value.cusNama }
      : null,
  set: (v: { kode: string; nama: string } | null) => {
    filterState.value = {
      ...filterState.value,
      customer: v?.kode || "",
      cusNama: v?.nama || "",
    };
  },
});

watch(
  filterState,
  (val) => {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(val));
    fetchData();
  },
  { deep: true },
);

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
} = useBrowse({
  menuId: "152",
  fetchApi: async () => {
    const res = await spkService.getBrowse({
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
  {
    title: "Status Cetak",
    key: "CetakStatusDisplay",
    width: "120px",
    align: "center",
  },
  { title: "Alasan Close", key: "AlasanClose", width: "150px" },
  { title: "No Penawaran", key: "NoPenawaran", width: "130px" },
  { title: "MAP", key: "MAP", width: "130px" },
  { title: "Repeat", key: "Repeat", width: "80px" },
  { title: "SO", key: "IsSO", width: "60px", align: "center" },
  // Produksi
  { title: "Potong", key: "Potong", width: "80px", align: "right" },
  { title: "Qc Potong", key: "QcPotong", width: "80px", align: "right" },
  { title: "Bordir", key: "Bordir", width: "80px", align: "right" },
  { title: "Cetak", key: "Cetak", width: "80px", align: "right" },
  { title: "Qc Cetak", key: "QcCetak", width: "80px", align: "right" },
  { title: "DC", key: "DC", width: "80px", align: "right" },
  { title: "Jahit", key: "Jahit", width: "80px", align: "right" },
  { title: "Lipat", key: "Lipat", width: "80px", align: "right" },
  { title: "Jadi", key: "Jadi", width: "80px", align: "right" },
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
  // Status & ACC
  { title: "Aktif", key: "Aktif", width: "60px", align: "center" },
  { title: "Acc", key: "Acc", width: "60px", align: "center" },
  { title: "Acc H0", key: "AccH0", width: "60px", align: "center" },
  { title: "Acc JO", key: "AccJO", width: "80px", align: "center" },
  { title: "Acc Pending", key: "AccPending", width: "90px", align: "center" },
  { title: "MPPB", key: "MPPB", width: "120px" },
  // Design
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

// --- EXPAND ---
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
      const res = await spkService.getSizes(nomor);
      sizeCache.value[nomor] = res.data.data;
    } catch {
      toast.error(`Gagal muat detail size ${nomor}`);
    } finally {
      expandedLoading.value[nomor] = false;
    }
  }
};

// --- ROW COLOR ---
const rowPropsFn = (data: any) => {
  const item = data.item?.raw || data.item;
  const classes: string[] = ["font-weight-bold"];

  if (item.Status === "Open") classes.push("text-red-darken-1");
  if (item.Aktif === "N") {
    if (item.Acc === "Y" || item.AccH0 === "Y" || item.AccJO === "ACC")
      classes.push("text-blue-darken-2");
    else classes.push("text-grey-darken-1");
  } else {
    if (item.Acc === "N" || item.AccH0 === "N" || item.AccJO === "TOLAK")
      classes.push("text-green-darken-2");
  }
  if (item.Pending !== "NORMAL") {
    if (item.AccPending === "N") classes.push("text-fuchsia-darken-1");
    else if (item.AccPending === "ACC") classes.push("text-orange-darken-3");
  }
  return { class: classes.join(" ") };
};

const getNomorStyle = (ngedit: string) => {
  if (ngedit === "WAIT") return "background-color: #1976d2; color: #fff;";
  if (ngedit === "TOLAK") return "background-color: #d32f2f; color: #fff;";
  if (ngedit === "ACC") return "background-color: #388e3c; color: #fff;";
  return "";
};

// --- HANDLERS ---
onMounted(async () => {
  try {
    const res = await spkService.getWorkshops();
    const data = res.data.data;
    if (Array.isArray(data)) {
      listWorkshop.value = data.map((w: any) =>
        typeof w === "object" ? w.pab_kode || w.Kode || w.kode : w,
      );
    }
  } catch (e) {
    console.error("Gagal load workshop:", e);
  }
  fetchData();
});

const onAdd = () => router.push("/ppic/spk/create");
const onEdit = (item: any) =>
  router.push(`/ppic/spk/edit/${encodeURIComponent(item.Nomor)}`);

const onDelete = async (item: any) => {
  try {
    await spkService.deleteData(item.Nomor);
    toast.success("SPK berhasil dihapus.");
    fetchData();
  } catch (e: any) {
    toast.error(e.response?.data?.message || "Gagal menghapus.");
  }
};

const onExport = async () => {
  if (!items.value?.length)
    return toast.warning("Tidak ada data untuk diekspor.");

  await exportExcelSingle(
    `SPK_${dtAwal.value}_${dtAkhir.value}.xlsx`,
    "SPK",
    [
      { header: "Nomor", key: "Nomor", width: 20 },
      { header: "MO", key: "MO", width: 12 },
      { header: "CMO", key: "CMO", width: 12 },
      { header: "Tanggal", key: "Tanggal", width: 14, align: "center" },
      { header: "Dateline", key: "Dateline", width: 14, align: "center" },
      { header: "Kepentingan", key: "Kepentingan", width: 14 },
      { header: "Divisi", key: "Divisi", width: 14 },
      { header: "Kode Customer", key: "KodeCustomer", width: 14 },
      { header: "Customer", key: "Customer", width: 28 },
      { header: "Nama Pesanan", key: "Nama", width: 35 },
      { header: "Ukuran", key: "Ukuran", width: 16 },
      { header: "Cab", key: "Cab", width: 10, align: "center" },
      { header: "Workshop", key: "Workshop", width: 16 },
      { header: "Tipe", key: "Tipe", width: 12 },
      { header: "Kain", key: "Kain", width: 20 },
      { header: "Finishing", key: "Finishing", width: 20 },
      {
        header: "Harga",
        key: "Harga",
        width: 14,
        align: "right",
        numFmt: "#,##0",
      },
      {
        header: "Pesan",
        key: "Pesan",
        width: 12,
        align: "right",
        numFmt: "#,##0",
      },
      {
        header: "Kirim",
        key: "Kirim",
        width: 12,
        align: "right",
        numFmt: "#,##0",
      },
      {
        header: "Kurang",
        key: "Kurang",
        width: 12,
        align: "right",
        numFmt: "#,##0",
      },
      { header: "Sales", key: "Sales", width: 18 },
      { header: "PO", key: "PO", width: 20 },
      { header: "Ket PO", key: "KetPO", width: 20 },
      { header: "Status", key: "Status", width: 10, align: "center" },
      { header: "MAP", key: "MAP", width: 18 },
      { header: "No Penawaran", key: "NoPenawaran", width: 18 },
      { header: "MPPB", key: "MPPB", width: 18 },
      {
        header: "Potong",
        key: "Potong",
        width: 12,
        align: "right",
        numFmt: "#,##0",
      },
      {
        header: "Bordir",
        key: "Bordir",
        width: 12,
        align: "right",
        numFmt: "#,##0",
      },
      {
        header: "Cetak",
        key: "Cetak",
        width: 12,
        align: "right",
        numFmt: "#,##0",
      },
      {
        header: "Jahit",
        key: "Jahit",
        width: 12,
        align: "right",
        numFmt: "#,##0",
      },
      {
        header: "Lipat",
        key: "Lipat",
        width: 12,
        align: "right",
        numFmt: "#,##0",
      },
      {
        header: "Jadi",
        key: "Jadi",
        width: 12,
        align: "right",
        numFmt: "#,##0",
      },
      {
        header: "Kurang Jadi",
        key: "Kurang_Jadi",
        width: 14,
        align: "right",
        numFmt: "#,##0",
      },
      { header: "Aktif", key: "Aktif", width: 10, align: "center" },
      { header: "Keterangan", key: "Keterangan", width: 35 },
      { header: "Created", key: "Created", width: 18, align: "center" },
    ],
    items.value,
    `SPK Periode ${dtAwal.value} s/d ${dtAkhir.value}`,
  );
};

// --- GAMBAR ---
const dialogGambar = ref(false);
const gambarUrl = ref("");
const gambarFallbackStep = ref(0);
const showPrintApprovalDialog = ref(false);
const printApprovalAlasan = ref("");
const printCheckInfo = ref<{ count: number; approvalStatus: string } | null>(
  null,
);

const onGambarError = () => {
  if (!selectedItem.value) return;
  const base = (api.defaults.baseURL || "").replace(/\/api\/?$/, "");
  const nomor = selectedItem.value.Nomor;
  const cab = selectedItem.value.Cab || "HO-";
  const map = selectedItem.value.MAP || "";
  if (gambarFallbackStep.value === 0 && map) {
    gambarFallbackStep.value = 1;
    gambarUrl.value = `${base}/images/${cab}/map/${encodeURIComponent(map)}.jpg`;
  } else if (gambarFallbackStep.value <= 1) {
    gambarFallbackStep.value = 2;
    gambarUrl.value = `/file-gambar/${encodeURIComponent(nomor)}.jpg`;
  }
};
const onLihatGambar = () => {
  if (!selectedItem.value) return;
  gambarFallbackStep.value = 0;
  const base = (api.defaults.baseURL || "").replace(/\/api\/?$/, "");
  const nomor = selectedItem.value.Nomor;
  const cab = selectedItem.value.Cab || "HO-";
  gambarUrl.value = `${base}/images/${cab}/${encodeURIComponent(nomor)}.jpg`;
  dialogGambar.value = true;
};

// --- CETAK ---
const onPrint = async () => {
  if (!selectedItem.value) return;
  if (selectedItem.value.Aktif === "N") {
    toast.warning("SPK tersebut statusnya pasif. Tidak bisa dicetak.");
    return;
  }
  const nomor = selectedItem.value.Nomor;
  try {
    const res = await spkService.checkPrintPermission(nomor);
    const info = res.data.data;
    if (!info.allowed) {
      printCheckInfo.value = info;

      // Sudah pernah minta approval dan masih menunggu — cukup beritahu,
      // jangan buka dialog isi alasan lagi (mencegah user isi ulang
      // alasan padahal pengajuan lama masih aktif).
      if (info.approvalStatus === "WAIT") {
        toast.info("Pengajuan cetak ulang masih menunggu approval manager.");
        return;
      }

      // Belum pernah ajukan ("") atau pengajuan sebelumnya ditolak
      // ("TOLAK") — keduanya butuh dialog baru untuk isi alasan.
      if (info.approvalStatus === "TOLAK") {
        toast.error(
          "Pengajuan cetak ulang sebelumnya DITOLAK. Ajukan ulang jika perlu.",
        );
      } else {
        toast.warning(
          `SPK ini sudah pernah dicetak (${info.count}x). Cetak berikutnya butuh approval manager.`,
        );
      }
      printApprovalAlasan.value = "";
      showPrintApprovalDialog.value = true;
      return;
    }
    window.open(`/ppic/spk/print/${encodeURIComponent(nomor)}`, "_blank");
    await spkService.recordPrint(nomor);
    fetchData();
  } catch (e: any) {
    toast.error(e.response?.data?.message || "Gagal memeriksa izin cetak.");
  }
};

const submitPrintApproval = async () => {
  if (!selectedItem.value) return;
  try {
    await spkService.requestPrintApproval(
      selectedItem.value.Nomor,
      printApprovalAlasan.value,
    );
    toast.success("Pengajuan approval cetak ulang berhasil dikirim.");
    showPrintApprovalDialog.value = false;
  } catch (e: any) {
    toast.error(e.response?.data?.message || "Gagal mengirim pengajuan.");
  }
};

// --- APPROVE ---
const showApproveDialog = ref(false);
const openApproveDialog = () => {
  if (!selectedItem.value) return;
  showApproveDialog.value = true;
};
const confirmApprove = async () => {
  try {
    await spkService.approveCmo(selectedItem.value.Nomor);
    toast.success("SPK berhasil di-approve.");
    showApproveDialog.value = false;
    fetchData();
  } catch (e: any) {
    toast.error(e.response?.data?.message || "Gagal approve SPK.");
  }
};

// --- CLOSE ---
const showCloseDialog = ref(false);
const alasanClose = ref("");
const openCloseDialog = () => {
  if (!selectedItem.value) return;
  if (selectedItem.value.Status === "Closed")
    return toast.warning("Status sudah Close.");
  alasanClose.value = "";
  showCloseDialog.value = true;
};
const submitClose = async () => {
  if (!alasanClose.value.trim())
    return toast.error("Alasan close wajib diisi.");
  try {
    await spkService.toggleClose(selectedItem.value.Nomor, {
      isClose: true,
      alasan: alasanClose.value,
    });
    toast.success("SPK berhasil diclose.");
    showCloseDialog.value = false;
    fetchData();
  } catch (e: any) {
    toast.error(e.response?.data?.message || "Gagal close SPK.");
  }
};
const onBatalClose = async () => {
  if (!selectedItem.value) return;
  if (selectedItem.value.Status === "Open")
    return toast.warning("SPK ini belum Close.");
  if (selectedItem.value.Status === "Closed" && !selectedItem.value.AlasanClose)
    return toast.warning(
      "SPK ini diclose Otomatis. Tidak bisa dibatalkan manual.",
    );
  if (
    confirm(
      `Yakin ingin membatalkan Close untuk SPK ${selectedItem.value.Nomor}?`,
    )
  ) {
    try {
      await spkService.toggleClose(selectedItem.value.Nomor, {
        isClose: false,
      });
      toast.success("Close SPK berhasil dibatalkan.");
      fetchData();
    } catch (e: any) {
      toast.error(e.response?.data?.message || "Gagal membatalkan close.");
    }
  }
};

// --- PIN ---
const pinDialog = ref(false);
const pinAlasan = ref("");
const openPinDialog = () => {
  if (!selectedItem.value) return;
  pinAlasan.value = "";
  pinDialog.value = true;
};
const submitPin = async () => {
  try {
    await spkService.requestPin(selectedItem.value.Nomor, pinAlasan.value);
    toast.success("Pengajuan PIN dikirim.");
    pinDialog.value = false;
    fetchData();
  } catch (e: any) {
    toast.error(e.response?.data?.message || "Gagal kirim PIN.");
  }
};

// --- FORMAT ---
const numFmt = (v: any) => (v ? Number(v).toLocaleString("id-ID") : "0");
</script>

<template>
  <BaseBrowse
    title="SPK (Surat Perintah Kerja)"
    menu-id="152"
    :icon="IconClipboardText"
    :headers="headers"
    :items="items ?? []"
    :is-loading="isLoading"
    v-model:selected="selected"
    v-model:filter-state="filterState"
    :can-insert="canInsert"
    :can-edit="canEdit"
    :can-delete="canDelete"
    :can-export="canExport"
    item-value="Nomor"
    :row-props-fn="rowPropsFn"
    @delete="onDelete"
    @refresh="fetchData"
    @export="onExport"
    show-expand
    :expanded="expandedRows"
    @update:expanded="onUpdateExpanded"
    @add="onAdd"
    @edit="onEdit"
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

    <template #item.IsSO="{ item }">
      <v-chip v-if="item.IsSO" size="x-small" color="primary" variant="tonal"
        >SO</v-chip
      >
    </template>

    <template #item.CetakStatusDisplay="{ item }">
      <span v-if="Number(item.CetakCount) === 0" class="cetak-badge badge-grey">
        Belum Dicetak
      </span>
      <span
        v-else-if="item.CetakApprovalStatus === 'WAIT'"
        class="cetak-badge badge-blue"
      >
        Cetak {{ item.CetakCount }}x · Nunggu ACC
      </span>
      <span
        v-else-if="item.CetakApprovalStatus === 'TOLAK'"
        class="cetak-badge badge-red"
      >
        Cetak {{ item.CetakCount }}x · Ditolak
      </span>
      <span
        v-else-if="item.CetakApprovalStatus === 'ACC_READY'"
        class="cetak-badge badge-green"
      >
        Cetak {{ item.CetakCount }}x · Siap Cetak
      </span>
      <span v-else class="cetak-badge badge-neutral">
        Sudah Dicetak {{ item.CetakCount }}x
      </span>
    </template>

    <template #item.Tanggal="{ item }">
      {{ formatTanggal(item.Tanggal) }}
    </template>

    <template #item.Dateline="{ item }">
      {{ formatTanggal(item.Dateline) }}
    </template>

    <template #item.DatePO="{ item }">
      {{ formatTanggal(item.DatePO) }}
    </template>

    <template #item.DatelinePO="{ item }">
      {{ formatTanggal(item.DatelinePO) }}
    </template>

    <template #item.Design_Tanggal="{ item }">
      {{ formatTanggal(item.Design_Tanggal) }}
    </template>

    <template #item.Created="{ item }">
      {{ formatTanggalJam(item.Created) }}
    </template>
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
        <template #prepend><IconPhoto :size="15" /></template>Gambar
      </v-btn>

      <v-menu v-if="selected.length > 0">
        <template #activator="{ props }">
          <v-btn size="small" color="teal-darken-3" v-bind="props">
            <template #prepend><IconDotsVertical :size="15" /></template
            >Tindakan
          </v-btn>
        </template>
        <v-list density="compact" class="text-caption">
          <v-list-item @click="openPinDialog">
            <template #prepend
              ><IconShieldLock :size="14" class="mr-2 text-primary"
            /></template>
            <v-list-item-title>Pengajuan Perubahan Data</v-list-item-title>
          </v-list-item>
          <v-list-item @click="openApproveDialog" :disabled="!canEdit">
            <template #prepend
              ><IconCheck :size="14" class="mr-2 text-success"
            /></template>
            <v-list-item-title>Approval SPK</v-list-item-title>
          </v-list-item>
          <v-divider class="my-1" />
          <v-list-item @click="openCloseDialog" :disabled="!canDelete">
            <template #prepend
              ><IconLockSquare :size="14" class="mr-2 text-warning"
            /></template>
            <v-list-item-title>Close SPK</v-list-item-title>
          </v-list-item>
          <v-list-item @click="onBatalClose" :disabled="!canDelete">
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
    @selected="
      (v) =>
        (selectedCustomer = {
          kode: v.Kode || v.cus_kode,
          nama: v.Nama || v.cus_nama,
        })
    "
  />

  <!-- Dialog PIN -->
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

  <!-- Dialog Close -->
  <v-dialog v-model="showCloseDialog" max-width="400">
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
        <v-btn variant="text" @click="showCloseDialog = false">Batal</v-btn>
        <v-btn color="warning" variant="elevated" @click="submitClose"
          >Proses Close</v-btn
        >
      </v-card-actions>
    </v-card>
  </v-dialog>

  <!-- Dialog Approve -->
  <v-dialog v-model="showApproveDialog" max-width="380" persistent>
    <v-card rounded="lg">
      <v-card-title
        class="bg-success text-white pa-3 text-subtitle-1 d-flex align-center"
      >
        <IconCheck :size="16" color="white" class="mr-2" />Konfirmasi Approval
        SPK
      </v-card-title>
      <v-card-text class="pa-4 text-body-2">
        Yakin ingin menyetujui (Approve) SPK:
        <div class="font-weight-bold text-primary mt-1">
          {{ selectedItem?.Nomor }}
        </div>
        <div class="text-caption text-grey mt-1">{{ selectedItem?.Nama }}</div>
      </v-card-text>
      <v-card-actions class="pa-3 border-t bg-grey-lighten-4">
        <v-spacer />
        <v-btn variant="text" @click="showApproveDialog = false">Batal</v-btn>
        <v-btn color="success" variant="elevated" @click="confirmApprove"
          >Ya, Approve</v-btn
        >
      </v-card-actions>
    </v-card>
  </v-dialog>

  <!-- Dialog Gambar -->
  <v-dialog v-model="dialogGambar" max-width="800px">
    <v-card rounded="lg">
      <v-card-title
        class="bg-primary text-white d-flex justify-space-between align-center pa-3"
      >
        <span>Gambar SPK: {{ selectedItem?.Nomor }}</span>
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
          @error="onGambarError"
          max-height="600"
          contain
          class="bg-white rounded border"
        >
          <template #placeholder>
            <div class="d-flex align-center justify-center fill-height">
              <v-progress-circular indeterminate color="primary" size="40" />
            </div>
          </template>
        </v-img>
      </v-card-text>
    </v-card>
  </v-dialog>

  <v-dialog v-model="showPrintApprovalDialog" max-width="400">
    <v-card rounded="lg">
      <v-card-title class="bg-warning text-white pa-3 text-subtitle-1">
        Cetak Ulang Butuh Approval
      </v-card-title>
      <v-card-text class="pa-4">
        <p class="text-caption mb-2">
          SPK <b>{{ selectedItem?.Nomor }}</b> sudah pernah dicetak
          <b>{{ printCheckInfo?.count }}x</b>. Ajukan approval ke Manager untuk
          mencetak lagi.
        </p>
        <v-textarea
          v-model="printApprovalAlasan"
          label="Alasan cetak ulang"
          variant="outlined"
          density="compact"
          rows="3"
          hide-details
          autofocus
        />
      </v-card-text>
      <v-card-actions class="pa-3 border-t">
        <v-spacer />
        <v-btn variant="text" @click="showPrintApprovalDialog = false"
          >Tutup</v-btn
        >
        <v-btn color="warning" variant="elevated" @click="submitPrintApproval">
          Ajukan Approval
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
.f-sep {
  font-size: 11px;
  color: #555;
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
.expand-wrap {
  padding: 10px 10px 10px 50px;
  background: #eceff1;
}
.expand-title {
  font-size: 12px;
  font-weight: 700;
  color: #1565c0;
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
.cetak-badge {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 9.5px;
  font-weight: 700;
  white-space: nowrap;
}
.badge-grey {
  background: #f5f5f5;
  color: #757575;
}
.badge-neutral {
  background: #eceff1;
  color: #455a64;
}
.badge-blue {
  background: #e3f2fd;
  color: #1565c0;
}
.badge-red {
  background: #ffebee;
  color: #c62828;
}
.badge-green {
  background: #e8f5e9;
  color: #2e7d32;
}
</style>
