<script setup lang="ts">
import { ref, reactive, computed } from "vue";
import { useRouter } from "vue-router";
import { useToast } from "vue-toastification";
import BaseBrowse from "@/components/BaseBrowse.vue";
import { useBrowse } from "@/composables/useBrowse";
import {
  IconTools,
  IconPrinter,
  IconLockAccess,
  IconAlertTriangle,
  IconLayersLinked,
  IconX,
} from "@tabler/icons-vue";
import api from "@/services/api";
import { formatTanggal } from "@/utils/dateFormat";
import { useAuthStore } from "@/stores/authStore";
import { parseISO, format, isValid, isBefore } from "date-fns";

const router = useRouter();
const toast = useToast();
const authStore = useAuthStore();
const user = computed(() => authStore.user);

// --- PERIODE FILTER ---
const getStartOfMonth = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
};
const getToday = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const startDate = ref(getStartOfMonth());
const endDate = ref(getToday());

// --- OTORITAS LIHAT HARGA ---
const canSeePrice = computed(() => {
  const u = user.value as any;
  if (!u) return true;
  if (u.flags && u.flags.lihatHarga !== undefined) {
    return u.flags.lihatHarga !== 0;
  }
  if (u.zLihatHarga !== undefined) {
    return u.zLihatHarga !== 0;
  }
  return true;
});

// --- HEADERS TABEL UTAMA PO JASA MMT ---
const headers = computed(() => {
  const cols: any[] = [
    { title: "Nomor PO Jasa", key: "Nomor", width: "155px" },
    { title: "Tanggal", key: "Tanggal", width: "95px", align: "center" as const },
    { title: "Deadline", key: "DateLinePO", width: "95px", align: "center" as const },
    { title: "Cab", key: "Cab", width: "65px", align: "center" as const },
    { title: "No. SPK", key: "SPK", width: "135px" },
    { title: "Nama SPK", key: "NamaSPK", minWidth: "170px" },
    { title: "Vendor Jasa", key: "Supplier", minWidth: "150px" },
    { title: "Qty Jasa", key: "QtyPO", width: "80px", align: "end" as const },
    { title: "Qty BPB", key: "QtyBPB", width: "80px", align: "end" as const },
    { title: "Status Bahan", key: "StatusBahan", width: "115px", align: "center" as const },
    { title: "Selisih Bahan", key: "SelisihBahan", width: "125px", align: "center" as const },
  ];

  if (canSeePrice.value) {
    cols.push(
      { title: "Tarif Jasa", key: "Nominal", width: "110px", align: "end" as const },
      { title: "Potongan Bahan", key: "PotonganBahan", width: "120px", align: "end" as const },
      { title: "Tagihan Bersih", key: "TagihanBersih", width: "120px", align: "end" as const },
      { title: "DP", key: "DP", width: "100px", align: "end" as const },
      { title: "Voucher", key: "Voucher", width: "100px", align: "end" as const },
      { title: "Sisa Tagihan", key: "BelumBayar", width: "120px", align: "end" as const }
    );
  }

  cols.push(
    { title: "Status", key: "Status", width: "90px", align: "center" as const },
    { title: "Ngedit", key: "Ngedit", width: "80px", align: "center" as const },
    { title: "User", key: "Usr", width: "80px" },
    { title: "Created", key: "Created", width: "130px", align: "center" as const }
  );

  return cols;
});

// --- DETAIL EXPANDED ROW (RINCIAN BAHAN & ALOKASI) ---
const expanded = ref<any[]>([]);
const detailCache = ref<Record<string, any>>({});
const loadingDetails = ref<Set<string>>(new Set());

const getItemNomor = (item: any): string => {
  if (!item) return "";
  if (typeof item === "string") return item;
  const raw = item.raw || item;
  return raw.Nomor || "";
};

const getItemDetailData = (item: any): any => {
  const nomor = getItemNomor(item);
  return detailCache.value[nomor] || { alokasi: [], bahan: [] };
};

const onUpdateExpanded = (newExpanded: any[]) => {
  expanded.value = newExpanded;
  for (const expItem of newExpanded) {
    const nomor = getItemNomor(expItem);
    if (!nomor) continue;
    if (!detailCache.value[nomor] && !loadingDetails.value.has(nomor)) {
      loadDetail(nomor);
    }
  }
};

const loadDetail = async (nomor: string) => {
  if (detailCache.value[nomor] || loadingDetails.value.has(nomor)) return;
  loadingDetails.value.add(nomor);
  try {
    const res = await api.get(`/mmt/po-jasa-mmt/detail/${encodeURIComponent(nomor)}`);
    const d = res.data?.data || res.data || {};
    detailCache.value = {
      ...detailCache.value,
      [nomor]: {
        alokasi: Array.isArray(d.alokasi) ? d.alokasi : [],
        bahan: Array.isArray(d.bahanList || d.bahan) ? (d.bahanList || d.bahan) : [],
      },
    };
  } catch (err) {
    console.error("Gagal memuat detail PO Jasa:", err);
  } finally {
    loadingDetails.value.delete(nomor);
  }
};

// --- DIALOG PENGAJUAN EDIT (PIN PERUBAHAN DATA) ---
const panelAlasanVisible = ref(false);
const isSubmittingPengajuan = ref(false);
const activePengajuanRow = ref<any>(null);
const pengajuanState = reactive({
  lblUrut: "0",
  edtAlasan: "",
});

// --- USE BROWSE COMPOSABLE ---
const {
  items,
  isLoading,
  selected,
  canInsert,
  canEdit,
  canDelete,
  canExport,
  fetchData,
  exportToExcel,
} = useBrowse<any>({
  menuId: "5565",
  fetchApi: async () => {
    const res = await api.get("/mmt/po-jasa-mmt", {
      params: {
        startDate: startDate.value,
        endDate: endDate.value,
      },
    });
    const rawList = Array.isArray(res.data) ? res.data : (res.data?.data || []);
    return rawList.map((row: any) => {
      const nominal = Number(row.Nominal || 0);
      const potBahan = Number(row.PotonganBahan || row.poe_potongan_bahan || 0);
      const tagihanBersih = Number(row.TagihanBersih || row.poe_total_bersih || (nominal - potBahan));
      const dp = Number(row.DP || 0);
      const voucher = Number(row.Voucher || 0);
      const sisaTagihan = Math.max(0, tagihanBersih - dp - voucher);

      return {
        ...row,
        PotonganBahan: potBahan,
        TagihanBersih: tagihanBersih,
        BelumBayar: sisaTagihan,
        StatusBahan: row.BahanSendiri === "Y" || row.poe_bahansendiri === "Y" ? "Bahan Sendiri" : "Bahan Rekanan",
        HasSelisih: Number(row.SelisihBahan || row.poe_selisih_bahan || 0) > 0 || potBahan > 0,
        SelisihBahanQty: Number(row.SelisihBahan || row.poe_selisih_bahan || 0),
      };
    });
  },
});

// --- FORMATTERS ---
const formatRupiah = (v: any) => {
  if (v === null || v === undefined || v === "") return "0";
  const num = Number(v);
  if (isNaN(num)) return "0";
  return new Intl.NumberFormat("id-ID", {
    style: "decimal",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(num);
};

const formatNumber = (v: any) => {
  if (v === null || v === undefined || v === "") return "0";
  const num = Number(v);
  if (isNaN(num)) return "0";
  return new Intl.NumberFormat("id-ID", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(num);
};

const formatDateTime = (v: string | null | undefined): string => {
  if (!v) return "-";
  const s = String(v).trim();
  if (s.includes("T")) {
    const d = parseISO(s);
    if (isValid(d)) return format(d, "dd/MM/yyyy HH:mm");
  }
  return formatTanggal(s);
};

// --- ACTION HANDLERS ---
const handleNew = () => {
  router.push("/mmt/finance/po-jasa/create");
};

const handleEdit = (item?: any) => {
  const row = item?.Nomor
    ? (item.raw || item)
    : (selected.value[0]?.raw || selected.value[0]);
  if (!row?.Nomor) return;

  const u = user.value as any;
  const userCab = String(u?.cabang || u?.CAB || "").trim().toUpperCase();
  const isBypassCabang =
    !userCab ||
    ["HO", "HO-", "PUSAT", "ALL", "ADMIN"].includes(userCab) ||
    u?.is_admin ||
    u?.role === "ADMIN" ||
    u?.level === "ADMIN" ||
    canEdit.value;

  if (!isBypassCabang && row.Cab && userCab && row.Cab.trim().toUpperCase() !== userCab) {
    toast.warning(`Data tsb bukan cabang anda (${row.Cab} ≠ ${userCab}).`);
    return;
  }

  if (row.Ngedit === "WAIT") {
    toast.warning("Pengajuan edit data PO Jasa ini masih menunggu persetujuan (ACC).");
    return;
  }
  if (row.Ngedit === "TOLAK") {
    toast.error("Pengajuan edit data PO Jasa ini telah DITOLAK.");
    return;
  }

  router.push(`/mmt/finance/po-jasa/edit/${encodeURIComponent(row.Nomor)}`);
};

const handleDelete = async (item?: any) => {
  const row = item?.Nomor
    ? (item.raw || item)
    : (selected.value[0]?.raw || selected.value[0]);
  if (!row?.Nomor) return;

  const u = user.value as any;
  const userCab = String(u?.cabang || u?.CAB || "").trim().toUpperCase();
  const isBypassCabang =
    !userCab ||
    ["HO", "HO-", "PUSAT", "ALL", "ADMIN"].includes(userCab) ||
    u?.is_admin ||
    u?.role === "ADMIN" ||
    u?.level === "ADMIN" ||
    canDelete.value;

  if (!isBypassCabang && userCab && row.Cab && row.Cab.trim().toUpperCase() !== userCab) {
    toast.warning(`Data tsb bukan cabang anda (${row.Cab} ≠ ${userCab}).`);
    return;
  }

  if (row.Tanggal) {
    const tgl = new Date(row.Tanggal);
    const zDay = u?.ztglclose || 25;
    const limitClose = new Date(tgl.getFullYear(), tgl.getMonth() + 1, zDay);
    if (new Date() > limitClose) {
      toast.error("Transaksi tsb sudah close. Tidak bisa dihapus.");
      return;
    }
  }

  if (row.Status && row.Status !== "OPEN") {
    toast.error("PO Jasa tsb sudah di proses/close. Tidak bisa dihapus.");
    return;
  }

  if (Number(row.QtyBPB || 0) > 0) {
    toast.error("PO Jasa tsb sudah ada Penerimaan (BPB). Tidak bisa dihapus.");
    return;
  }

  if (Number(row.Voucher || 0) > 0) {
    toast.error("PO Jasa tsb sudah ada dibuatkan Voucher pembayaran. Tidak bisa dihapus.");
    return;
  }

  if (!confirm(`Hapus data PO Jasa MMT nomor ${row.Nomor}?`)) return;

  try {
    await api.delete(`/mmt/po-jasa-mmt/${encodeURIComponent(row.Nomor)}`);
    toast.success("PO Jasa MMT berhasil dihapus.");
    fetchData();
  } catch (err: any) {
    toast.error(err.response?.data?.message || "Gagal menghapus data.");
  }
};

const handlePrint = (item?: any) => {
  const row = item?.Nomor
    ? (item.raw || item)
    : (selected.value[0]?.raw || selected.value[0]);
  if (!row?.Nomor) return;
  router.push(`/mmt/finance/po-jasa/print/${encodeURIComponent(row.Nomor)}`);
};

// --- LOGIKA PENGAJUAN EDIT PIN ---
const openPengajuanDialog = async (item?: any) => {
  const row = item?.Nomor
    ? (item.raw || item)
    : (selected.value[0]?.raw || selected.value[0]);
  if (!row?.Nomor) {
    toast.warning("Pilih 1 data PO Jasa MMT terlebih dahulu.");
    return;
  }

  const u = user.value as any;
  const tglTransaksi = row.Tanggal ? parseISO(String(row.Tanggal).substring(0, 10)) : new Date();
  const zDay = u?.ztglclose || 25;
  let zMonth = parseInt(format(tglTransaksi, "M"));
  let zYear = parseInt(format(tglTransaksi, "yyyy"));
  if (zMonth === 12) {
    zMonth = 1;
    zYear += 1;
  } else {
    zMonth += 1;
  }

  const limitClosingDate = new Date(zYear, zMonth - 1, zDay);

  let zcloseDate: Date | null = null;
  try {
    const configRes = await api.get(`/mmt/po-jasa-mmt/date-close/PO JASA MMT`);
    if (configRes.data?.closeDate) {
      zcloseDate = parseISO(configRes.data.closeDate);
    }
  } catch (e) {
    console.error("Gagal memeriksa tanggal close:", e);
  }

  const isLockedByDate = new Date() > limitClosingDate && !zcloseDate;
  const isLockedByConfig = zcloseDate ? isBefore(tglTransaksi, zcloseDate) : false;

  if (isLockedByDate || isLockedByConfig) {
    try {
      const pinRes = await api.get(
        `/mmt/po-jasa-mmt/check-pin/${encodeURIComponent(row.Nomor)}`
      );
      const latestPin = pinRes.data;

      if (!latestPin) {
        pengajuanState.lblUrut = "1";
        pengajuanState.edtAlasan = "";
      } else {
        if (!latestPin.pin_dipakai) {
          pengajuanState.lblUrut = String(latestPin.pin_urut || "1");
          pengajuanState.edtAlasan = latestPin.pin_alasan || "";
        } else {
          pengajuanState.lblUrut = String(Number(latestPin.pin_urut || 0) + 1);
          pengajuanState.edtAlasan = "";
        }
      }

      activePengajuanRow.value = row;
      panelAlasanVisible.value = true;
    } catch (err) {
      toast.error("Gagal memvalidasi status PIN internal.");
    }
  } else {
    toast.info("Tidak perlu pengajuan perubahan data (Data belum terkunci periode).");
  }
};

const handleAjukanPengajuan = async () => {
  if (!pengajuanState.edtAlasan.trim()) {
    toast.warning("Alasan perubahan data harus diisi.");
    return;
  }

  if (!confirm("Yakin ingin mengajukan perubahan data PO Jasa ini?")) return;

  isSubmittingPengajuan.value = true;
  try {
    const u = user.value as any;
    const payload = {
      pin_nomor: activePengajuanRow.value.Nomor,
      pin_urut: pengajuanState.lblUrut,
      pin_tgl_trs: activePengajuanRow.value.Tanggal,
      pin_ket: activePengajuanRow.value.SPK,
      pin_alasan: pengajuanState.edtAlasan,
      pin_user_minta: u?.kode || u?.kdUser || u?.nama || "UNKNOWN",
    };

    await api.post(`/mmt/po-jasa-mmt/submit-pin`, payload);
    toast.success("Pengajuan berhasil diajukan. Menunggu ACC.");
    activePengajuanRow.value.Ngedit = "WAIT";
    closePengajuanDialog();
    fetchData();
  } catch (err: any) {
    toast.error(err.response?.data?.message || "Gagal mengajukan perubahan.");
  } finally {
    isSubmittingPengajuan.value = false;
  }
};

const closePengajuanDialog = () => {
  panelAlasanVisible.value = false;
  activePengajuanRow.value = null;
  pengajuanState.edtAlasan = "";
};
</script>

<template>
  <BaseBrowse
    title="PO Jasa MMT (Makloon)"
    menu-id="5565"
    item-value="Nomor"
    :icon="IconTools"
    :headers="headers"
    :items="items || []"
    :is-loading="isLoading"
    v-model:selected="selected"
    :can-insert="canInsert"
    :can-edit="canEdit"
    :can-delete="canDelete"
    :can-export="canExport"
    :show-expand="true"
    :expanded="expanded"
    @update:expanded="onUpdateExpanded"
    @refresh="fetchData"
    @add="handleNew"
    @edit="handleEdit"
    @delete="handleDelete"
    @export="exportToExcel('PO_Jasa_MMT')"
  >
    <!-- FILTER PERIODE TANGGAL -->
    <template #filter-left>
      <div class="filter-group">
        <span class="filter-label">Periode</span>
        <input
          type="date"
          v-model="startDate"
          class="date-inp"
          @change="fetchData"
        />
        <span class="filter-sep">s/d</span>
        <input
          type="date"
          v-model="endDate"
          class="date-inp"
          @change="fetchData"
        />
      </div>
    </template>

    <!-- EXTRA ACTIONS: CETAK & PENGAJUAN EDIT -->
    <template #extra-actions="{ selected }">
      <v-btn
        size="small"
        color="info"
        variant="elevated"
        class="text-none mr-2 font-weight-medium"
        :disabled="selected.length !== 1"
        @click="handlePrint(selected[0])"
      >
        <template #prepend>
          <IconPrinter :size="15" />
        </template>
        Cetak PO Jasa
      </v-btn>

      <v-btn
        size="small"
        color="purple-darken-1"
        variant="elevated"
        class="text-none font-weight-medium"
        :disabled="selected.length !== 1"
        @click="openPengajuanDialog(selected[0])"
      >
        <template #prepend>
          <IconLockAccess :size="15" />
        </template>
        Pengajuan Edit
      </v-btn>
    </template>

    <!-- TEMPLATE KOLOM DATA -->
    <template #item.Nomor="{ item }">
      <div class="d-flex align-center gap-1">
        <span class="font-monospace font-weight-bold text-primary">
          {{ (item.raw || item).Nomor }}
        </span>
        <span
          v-if="(item.raw || item).Ngedit === 'WAIT'"
          class="ngedit-chip wait"
          title="Menunggu Persetujuan Edit"
        >
          WAIT
        </span>
        <span
          v-else-if="(item.raw || item).Ngedit === 'ACC'"
          class="ngedit-chip acc"
          title="Edit Disetujui"
        >
          ACC
        </span>
        <span
          v-else-if="(item.raw || item).Ngedit === 'TOLAK'"
          class="ngedit-chip tolak"
          title="Edit Ditolak"
        >
          TOLAK
        </span>
      </div>
    </template>

    <template #item.Tanggal="{ item }">
      <span class="font-monospace text-caption">
        {{ formatTanggal((item.raw || item).Tanggal) }}
      </span>
    </template>

    <template #item.DateLinePO="{ item }">
      <span class="font-monospace text-caption">
        {{ formatTanggal((item.raw || item).DateLinePO) }}
      </span>
    </template>

    <template #item.Cab="{ item }">
      <span class="cab-tag">{{ (item.raw || item).Cab || "-" }}</span>
    </template>

    <template #item.SPK="{ item }">
      <span class="font-monospace text-caption text-grey-darken-3">
        {{ (item.raw || item).SPK || "-" }}
      </span>
    </template>

    <template #item.QtyPO="{ item }">
      <span class="font-monospace font-weight-bold">
        {{ formatNumber((item.raw || item).QtyPO) }}
      </span>
    </template>

    <template #item.QtyBPB="{ item }">
      <span class="font-monospace font-weight-bold text-teal-darken-2">
        {{ formatNumber((item.raw || item).QtyBPB) }}
      </span>
    </template>

    <!-- Status Bahan Sendiri / Vendor -->
    <template #item.StatusBahan="{ item }">
      <v-chip
        size="x-small"
        :color="(item.raw || item).StatusBahan === 'Bahan Sendiri' ? 'primary' : 'grey'"
        variant="tonal"
        class="font-weight-bold"
      >
        {{ (item.raw || item).StatusBahan }}
      </v-chip>
    </template>

    <!-- Indikator Deteksi Selisih Bahan -->
    <template #item.SelisihBahan="{ item }">
      <v-chip
        v-if="(item.raw || item).HasSelisih"
        size="x-small"
        color="error"
        variant="flat"
        class="font-weight-bold"
        title="Terdapat selisih bahan yang dipotongkan ke vendor"
      >
        <IconAlertTriangle :size="12" class="mr-1" />
        SELISIH ({{ formatNumber((item.raw || item).SelisihBahanQty) }})
      </v-chip>
      <v-chip
        v-else
        size="x-small"
        color="success"
        variant="tonal"
        class="font-weight-bold"
      >
        SESUAI
      </v-chip>
    </template>

    <!-- Kolom Harga & Potongan Finance -->
    <template #item.Nominal="{ item }">
      <span class="font-monospace text-blue-darken-3">
        {{ formatRupiah((item.raw || item).Nominal) }}
      </span>
    </template>

    <template #item.PotonganBahan="{ item }">
      <span
        class="font-monospace font-weight-bold"
        :class="Number((item.raw || item).PotonganBahan || 0) > 0 ? 'text-red-darken-3' : 'text-grey'"
      >
        {{ Number((item.raw || item).PotonganBahan || 0) > 0 ? '- ' + formatRupiah((item.raw || item).PotonganBahan) : '0' }}
      </span>
    </template>

    <template #item.TagihanBersih="{ item }">
      <span class="font-monospace font-weight-bold text-teal-darken-4">
        {{ formatRupiah((item.raw || item).TagihanBersih) }}
      </span>
    </template>

    <template #item.DP="{ item }">
      <span class="font-monospace text-grey-darken-2">
        {{ formatRupiah((item.raw || item).DP) }}
      </span>
    </template>

    <template #item.Voucher="{ item }">
      <span class="font-monospace text-grey-darken-2">
        {{ formatRupiah((item.raw || item).Voucher) }}
      </span>
    </template>

    <template #item.BelumBayar="{ item }">
      <span
        class="font-monospace font-weight-bold"
        :class="Number((item.raw || item).BelumBayar || 0) > 0 ? 'text-red-darken-3' : 'text-green-darken-3'"
      >
        {{ formatRupiah((item.raw || item).BelumBayar) }}
      </span>
    </template>

    <!-- Status PO -->
    <template #item.Status="{ item }">
      <span
        class="status-pill"
        :class="{
          'status-open': (item.raw || item).Status === 'OPEN',
          'status-proses': (item.raw || item).Status === 'PROSES',
          'status-close': (item.raw || item).Status === 'CLOSE' || (item.raw || item).Status === 'SELESAI',
        }"
      >
        {{ (item.raw || item).Status || "-" }}
      </span>
    </template>

    <!-- Ngedit Column -->
    <template #item.Ngedit="{ item }">
      <span v-if="(item.raw || item).Ngedit" class="ngedit-badge" :class="(item.raw || item).Ngedit.toLowerCase()">
        {{ (item.raw || item).Ngedit }}
      </span>
      <span v-else class="text-caption text-grey">-</span>
    </template>

    <template #item.Created="{ item }">
      <span class="font-monospace text-caption text-grey">
        {{ formatDateTime((item.raw || item).Created) }}
      </span>
    </template>

    <!-- ── DROPDOWN SUB-TABEL: RINCIAN PENGGUNAAN BAHAN & ALOKASI KOTA ── -->
    <template #detail="{ item }">
      <div class="expand-detail-container pa-3">
        <div class="d-flex align-center justify-space-between mb-2">
          <div class="d-flex align-center">
            <IconLayersLinked :size="18" class="text-primary mr-1" />
            <span class="expand-title font-weight-bold">
              Monitoring Bahan & Alokasi (PO Jasa: {{ (item.raw || item).Nomor }})
            </span>
          </div>
          <span class="text-caption text-grey">
            SPK: {{ (item.raw || item).SPK }} — {{ (item.raw || item).NamaSPK }}
          </span>
        </div>

        <div v-if="loadingDetails.has(getItemNomor(item))" class="text-center py-4">
          <v-progress-circular indeterminate size="20" color="primary" />
          <span class="ml-2 text-caption text-grey">Memuat data rincian bahan...</span>
        </div>

        <div v-else class="sub-detail-grid">
          <!-- SUB-TABEL 1: PENGGUNAAN BAHAN & SELISIH -->
          <div class="sub-card">
            <div class="sub-card-title text-primary font-weight-bold mb-1">
              Rincian Penggunaan & Selisih Bahan
            </div>
            <div class="sub-table-wrapper">
              <table class="sub-table">
                <thead>
                  <tr>
                    <th style="width: 35px" class="text-center">No</th>
                    <th>Nama Bahan</th>
                    <th style="width: 50px" class="text-center">Sat</th>
                    <th style="width: 75px" class="text-end">Est SPK</th>
                    <th style="width: 75px" class="text-end">Keluar</th>
                    <th style="width: 75px" class="text-end">Kembali</th>
                    <th style="width: 70px" class="text-end text-error">Selisih</th>
                    <th style="width: 90px" class="text-end text-error">Potongan</th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="(b, idx) in getItemDetailData(item).bahan"
                    :key="idx"
                    :class="{ 'row-warning': Number(b.poeb_selisih || b.selisih || 0) > 0 }"
                  >
                    <td class="text-center text-caption font-monospace">{{ idx + 1 }}</td>
                    <td class="font-weight-medium text-caption">
                      {{ b.poeb_nama || b.nama || "-" }}
                    </td>
                    <td class="text-center text-caption font-monospace">
                      {{ b.poeb_satuan || b.satuan || "m²" }}
                    </td>
                    <td class="text-end font-monospace text-caption">
                      {{ formatNumber(b.poeb_est_pakai || b.estPakai || 0) }}
                    </td>
                    <td class="text-end font-monospace text-caption">
                      {{ formatNumber(b.poeb_qty_keluar || b.qtyKeluar || 0) }}
                    </td>
                    <td class="text-end font-monospace text-caption">
                      {{ formatNumber(b.poeb_qty_kembali || b.qtyKembali || 0) }}
                    </td>
                    <td class="text-end font-monospace font-weight-bold" :class="Number(b.poeb_selisih || b.selisih || 0) > 0 ? 'text-red-darken-3' : 'text-grey'">
                      {{ formatNumber(b.poeb_selisih || b.selisih || 0) }}
                    </td>
                    <td class="text-end font-monospace font-weight-bold" :class="Number(b.poeb_potongan || b.nilaiPotongan || 0) > 0 ? 'text-red-darken-3' : 'text-grey'">
                      Rp {{ formatRupiah(b.poeb_potongan || b.nilaiPotongan || 0) }}
                    </td>
                  </tr>
                  <tr v-if="getItemDetailData(item).bahan.length === 0">
                    <td colspan="8" class="text-center py-2 text-caption text-grey">
                      Tidak ada data rincian bahan.
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- SUB-TABEL 2: ALOKASI KOTA -->
          <div class="sub-card">
            <div class="sub-card-title text-primary font-weight-bold mb-1">
              Alokasi Kota Pengiriman
            </div>
            <div class="sub-table-wrapper">
              <table class="sub-table">
                <thead>
                  <tr>
                    <th style="width: 35px" class="text-center">No</th>
                    <th>Kota Alokasi</th>
                    <th style="width: 100px" class="text-end">Jumlah (Pcs)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(a, idx) in getItemDetailData(item).alokasi" :key="idx">
                    <td class="text-center text-caption font-monospace">{{ idx + 1 }}</td>
                    <td class="font-weight-medium text-caption">
                      {{ a.poeda_kota || a.kota || "-" }}
                    </td>
                    <td class="text-end font-monospace font-weight-bold text-blue-darken-3">
                      {{ formatNumber(a.poeda_jumlah || a.jumlah || 0) }}
                    </td>
                  </tr>
                  <tr v-if="getItemDetailData(item).alokasi.length === 0">
                    <td colspan="3" class="text-center py-2 text-caption text-grey">
                      Tidak ada data alokasi kota.
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

  <!-- DIALOG PENGAJUAN PIN PERUBAHAN DATA -->
  <v-dialog v-model="panelAlasanVisible" max-width="500px" persistent>
    <v-card class="pengajuan-card">
      <v-card-title class="dialog-header py-3 px-4 bg-purple-darken-2 text-white d-flex align-center">
        <IconLockAccess :size="20" class="mr-2" />
        <span class="text-subtitle-1 font-weight-bold">
          Pengajuan Perubahan PO Jasa [Urut: {{ pengajuanState.lblUrut }}]
        </span>
        <v-spacer />
        <v-btn
          icon
          size="x-small"
          variant="text"
          color="white"
          :disabled="isSubmittingPengajuan"
          @click="closePengajuanDialog"
        >
          <IconX :size="18" />
        </v-btn>
      </v-card-title>

      <v-card-text class="pa-4 bg-grey-lighten-5">
        <div class="mb-3 text-caption text-grey-darken-2">
          Data PO Jasa nomor
          <strong class="font-monospace text-primary">
            {{ activePengajuanRow?.Nomor }}
          </strong>
          telah terkunci oleh tanggal closing sistem. Silakan isi alasan perubahan data untuk pengajuan ACC.
        </div>

        <v-textarea
          v-model="pengajuanState.edtAlasan"
          label="Alasan Perubahan Data (Wajib Diisi)"
          variant="outlined"
          density="compact"
          rows="4"
          bg-color="white"
          hide-details
          placeholder="Contoh: Koreksi pemakaian bahan keluar..."
          autofocus
        />
      </v-card-text>

      <v-card-actions class="pa-3 bg-white border-t d-flex justify-end gap-2">
        <v-btn
          color="grey-darken-1"
          size="small"
          variant="outlined"
          class="text-none font-weight-medium"
          :disabled="isSubmittingPengajuan"
          @click="closePengajuanDialog"
        >
          Batal
        </v-btn>
        <v-btn
          color="purple-darken-2"
          size="small"
          variant="elevated"
          class="text-none font-weight-bold"
          :loading="isSubmittingPengajuan"
          :disabled="!pengajuanState.edtAlasan.trim()"
          @click="handleAjukanPengajuan"
        >
          Ajukan Persetujuan
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.filter-group {
  display: flex;
  align-items: center;
  gap: 4px;
}
.filter-label {
  font-size: 11px;
  font-weight: 600;
  color: #555;
  margin-right: 2px;
}
.filter-sep {
  font-size: 11px;
  color: #777;
}
.date-inp {
  height: 26px;
  border: 1px solid #ccc;
  border-radius: 4px;
  padding: 0 4px;
  font-size: 11px;
  background: white;
  color: #212121;
}

/* ── STATUS PILLS ── */
.status-pill {
  display: inline-block;
  padding: 1px 7px;
  border-radius: 3px;
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.3px;
}
.status-open {
  background-color: #fee2e2;
  color: #b91c1c;
}
.status-proses {
  background-color: #fef3c7;
  color: #b45309;
}
.status-close {
  background-color: #d1fae5;
  color: #047857;
}

/* ── NGEDIT BADGE ── */
.ngedit-chip {
  font-size: 9px;
  font-weight: 700;
  padding: 1px 4px;
  border-radius: 3px;
}
.ngedit-chip.wait {
  background: #fff3e0;
  color: #e65100;
}
.ngedit-chip.acc {
  background: #e8f5e9;
  color: #2e7d32;
}
.ngedit-chip.tolak {
  background: #ffebee;
  color: #b71c1c;
}

.cab-tag {
  display: inline-block;
  background: #e0f2fe;
  color: #0369a1;
  padding: 1px 6px;
  border-radius: 3px;
  font-size: 10px;
  font-weight: 700;
}

/* ── SUB TABLES IN EXPANDED ROW ── */
.sub-detail-grid {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 12px;
}
@media (max-width: 1000px) {
  .sub-detail-grid {
    grid-template-columns: 1fr;
  }
}
.sub-card {
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 4px;
  padding: 8px 10px;
}
.sub-card-title {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.3px;
}
.sub-table-wrapper {
  overflow-x: auto;
}
.sub-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 11px;
}
.sub-table th,
.sub-table td {
  border: 1px solid #e2e8f0;
  padding: 4px 6px;
}
.sub-table th {
  background: #f8fafc;
  color: #334155;
  font-weight: 700;
  font-size: 10px;
  text-transform: uppercase;
}
.row-warning {
  background: #fff5f5;
}
</style>
