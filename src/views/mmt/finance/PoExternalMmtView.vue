<script setup lang="ts">
import { ref, reactive, computed, onMounted, watch } from "vue";
import { useRouter } from "vue-router";
import { useToast } from "vue-toastification";
import BaseBrowse from "@/components/BaseBrowse.vue";
import { useBrowse } from "@/composables/useBrowse";
import {
  IconShoppingCartDown,
  IconPrinter,
  IconLockAccess,
  IconCheck,
  IconAlertCircle,
  IconClock,
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

// --- HEADERS TABEL UTAMA ---
const headers = computed(() => {
  const cols: any[] = [
    { title: "Nomor PO", key: "Nomor", width: "150px" },
    { title: "Tanggal", key: "Tanggal", width: "100px", align: "center" as const },
    { title: "Deadline", key: "DateLinePO", width: "100px", align: "center" as const },
    { title: "Cab", key: "Cab", width: "70px", align: "center" as const },
    { title: "No. SPK", key: "SPK", width: "140px" },
    { title: "Nama SPK", key: "NamaSPK", minWidth: "180px" },
    { title: "Kd Sup", key: "KdSup", width: "85px", align: "center" as const },
    { title: "Supplier", key: "Supplier", minWidth: "160px" },
    { title: "Qty PO", key: "QtyPO", width: "85px", align: "end" as const },
    { title: "Qty BPB", key: "QtyBPB", width: "85px", align: "end" as const },
  ];

  if (canSeePrice.value) {
    cols.push(
      { title: "Nominal", key: "Nominal", width: "120px", align: "end" as const },
      { title: "DP", key: "DP", width: "110px", align: "end" as const },
      { title: "Voucher", key: "Voucher", width: "110px", align: "end" as const },
      { title: "Belum Bayar", key: "BelumBayar", width: "120px", align: "end" as const }
    );
  }

  cols.push(
    { title: "Status", key: "Status", width: "95px", align: "center" as const },
    { title: "Ngedit", key: "Ngedit", width: "85px", align: "center" as const },
    { title: "User", key: "Usr", width: "85px" },
    { title: "Created", key: "Created", width: "135px", align: "center" as const }
  );

  return cols;
});

// --- DETAIL EXPANDED ROW (ALOKASI KOTA) ---
const expanded = ref<any[]>([]);
const detailCache = ref<Record<string, any[]>>({});
const loadingDetails = ref<Set<string>>(new Set());

const getItemNomor = (item: any): string => {
  if (!item) return "";
  if (typeof item === "string") return item;
  const raw = item.raw || item;
  return raw.Nomor || "";
};

const getItemDetails = (item: any): any[] => {
  const nomor = getItemNomor(item);
  return detailCache.value[nomor] || [];
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
    const res = await api.get(`/mmt/po-external-mmt/detail/${encodeURIComponent(nomor)}`);
    const d = res.data?.data || res.data || {};
    const list = d.details || d.alokasi || d.Detail || [];
    detailCache.value = {
      ...detailCache.value,
      [nomor]: Array.isArray(list) ? list : [],
    };
  } catch (err) {
    console.error("Gagal memuat detail alokasi:", err);
  } finally {
    loadingDetails.value.delete(nomor);
  }
};

const calculateTotalDetailQty = (details: any[]) => {
  if (!Array.isArray(details)) return 0;
  return details.reduce(
    (sum, d) => sum + Number(d.poeda_jumlah || d.QtyPO || d.Jumlah || 0),
    0
  );
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
  menuId: "5505",
  fetchApi: async () => {
    const res = await api.get("/mmt/po-external-mmt", {
      params: {
        startDate: startDate.value,
        endDate: endDate.value,
      },
    });
    const rawList = Array.isArray(res.data) ? res.data : (res.data?.data || []);
    return rawList.map((row: any) => ({
      ...row,
      BelumBayar:
        Number(row.Nominal || 0) -
        Number(row.DP || 0) -
        Number(row.Voucher || 0),
    }));
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
  router.push("/mmt/finance/po-external/create");
};

const handleEdit = (item?: any) => {
  const row = item?.Nomor
    ? (item.raw || item)
    : (selected.value[0]?.raw || selected.value[0]);
  if (!row?.Nomor) return;

  // 1. Validasi Otoritas Cabang (Aturan Delphi)
  const u = user.value as any;
  const userCab = u?.cabang || u?.CAB;
  if (userCab && row.Cab && row.Cab !== userCab) {
    toast.warning(`Data tsb bukan cabang anda (${row.Cab} ≠ ${userCab}).`);
    return;
  }

  // 2. Validasi Status Ngedit (PIN)
  if (row.Ngedit === "WAIT") {
    toast.warning("Pengajuan edit data PO ini masih menunggu persetujuan (ACC).");
    return;
  }
  if (row.Ngedit === "TOLAK") {
    toast.error("Pengajuan edit data PO ini telah DITOLAK.");
    return;
  }

  router.push(`/mmt/finance/po-external/edit/${encodeURIComponent(row.Nomor)}`);
};

const handleDelete = async (item?: any) => {
  const row = item?.Nomor
    ? (item.raw || item)
    : (selected.value[0]?.raw || selected.value[0]);
  if (!row?.Nomor) return;

  const u = user.value as any;
  const userCab = u?.cabang || u?.CAB;

  // 1. Validasi Hak Otoritas Cabang
  if (userCab && row.Cab && row.Cab !== userCab) {
    toast.warning(`Data tsb bukan cabang anda (${row.Cab} ≠ ${userCab}).`);
    return;
  }

  // 2. Validasi Batas Penguncian Periode (Closing Bulanan Delphi)
  if (row.Tanggal) {
    const tgl = new Date(row.Tanggal);
    const zDay = u?.ztglclose || 25;
    const limitClose = new Date(tgl.getFullYear(), tgl.getMonth() + 1, zDay);
    if (new Date() > limitClose) {
      toast.error("Transaksi tsb sudah close. Tidak bisa dihapus.");
      return;
    }
  }

  // 3. Validasi Status Operasional PO
  if (row.Status && row.Status !== "OPEN") {
    toast.error("PO tsb sudah di proses/close. Tidak bisa dihapus.");
    return;
  }

  // 4. Validasi Penerimaan BPB
  if (Number(row.QtyBPB || 0) > 0) {
    toast.error("PO tsb sudah ada Penerimaan (BPB). Tidak bisa dihapus.");
    return;
  }

  // 5. Validasi Pembayaran Voucher
  if (Number(row.Voucher || 0) > 0) {
    toast.error("PO tsb sudah ada dibuatkan Voucher pembayaran. Tidak bisa dihapus.");
    return;
  }

  if (!confirm(`Hapus data PO External nomor ${row.Nomor}?`)) return;

  try {
    await api.delete(`/mmt/po-external-mmt/${encodeURIComponent(row.Nomor)}`);
    toast.success("PO External berhasil dihapus.");
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
  router.push(`/mmt/finance/po-external/print/${encodeURIComponent(row.Nomor)}`);
};

// --- LOGIKA PENGAJUAN EDIT (PIN PERUBAHAN DATA) ---
const openPengajuanDialog = async (item?: any) => {
  const row = item?.Nomor
    ? (item.raw || item)
    : (selected.value[0]?.raw || selected.value[0]);
  if (!row?.Nomor) {
    toast.warning("Pilih 1 data PO External terlebih dahulu.");
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
    const configRes = await api.get(`/mmt/po-external-mmt/date-close/PO EXT MMT`);
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
        `/mmt/po-external-mmt/check-pin/${encodeURIComponent(row.Nomor)}`
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

  if (!confirm("Yakin ingin mengajukan perubahan data PO ini?")) return;

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

    await api.post(`/mmt/po-external-mmt/submit-pin`, payload);
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
    title="PO External MMT"
    menu-id="5505"
    item-value="Nomor"
    :icon="IconShoppingCartDown"
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
    @export="exportToExcel('PO_External_MMT')"
  >
    <!-- FILTER KIRI (PERIODE TANGGAL) -->
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
        Cetak
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
    <!-- Nomor PO + Indikator Ngedit -->
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

    <template #item.KdSup="{ item }">
      <span class="font-monospace text-caption">{{ (item.raw || item).KdSup || "-" }}</span>
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

    <!-- Kolom Harga / Nominal (Jika Berhak Lihat) -->
    <template #item.Nominal="{ item }">
      <span class="font-monospace font-weight-bold text-blue-darken-3">
        {{ formatRupiah((item.raw || item).Nominal) }}
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

    <!-- ── DROPDOWN SUB-TABEL RINCIAN ALOKASI KOTA (SELARAS SISTEM MMT) ── -->
    <template #detail="{ item }">
      <div class="expand-detail-container pa-3">
        <div class="d-flex align-center justify-space-between mb-2">
          <div class="d-flex align-center">
            <span class="expand-title font-weight-bold">
              Rincian Alokasi Kota (PO: {{ (item.raw || item).Nomor }})
            </span>
            <v-chip size="x-small" color="primary" class="ml-2 font-weight-bold">
              {{ getItemDetails(item).length }} Kota
            </v-chip>
          </div>
          <span class="text-caption text-grey">
            SPK: {{ (item.raw || item).SPK }} — {{ (item.raw || item).NamaSPK }}
          </span>
        </div>

        <div v-if="loadingDetails.has(getItemNomor(item))" class="text-center py-4">
          <v-progress-circular indeterminate size="20" color="primary" />
          <span class="ml-2 text-caption text-grey">Memuat data rincian alokasi...</span>
        </div>

        <div v-else-if="getItemDetails(item).length > 0" class="sub-table-wrapper">
          <table class="sub-table">
            <thead>
              <tr>
                <th style="width: 45px" class="text-center">No.</th>
                <th style="width: 140px">Nomor PO</th>
                <th>Kota Alokasi</th>
                <th style="width: 130px" class="text-end">Jumlah Alokasi</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(d, idx) in getItemDetails(item)" :key="idx">
                <td class="text-center text-caption font-monospace">{{ idx + 1 }}</td>
                <td class="font-monospace text-caption font-weight-medium">
                  {{ d.NomorPO || d.Nomor || (item.raw || item).Nomor }}
                </td>
                <td class="font-weight-medium text-caption">
                  {{ d.poeda_kota || d.kota || d.NamaBrg || d.KodeBrg || "-" }}
                </td>
                <td class="text-end font-weight-bold font-monospace text-blue-darken-3">
                  {{ formatNumber(d.poeda_jumlah || d.QtyPO || d.Jumlah || 0) }}
                </td>
              </tr>
            </tbody>
            <tfoot>
              <tr class="sub-footer-row font-weight-bold">
                <td colspan="3" class="text-end">TOTAL ALOKASI:</td>
                <td class="text-end font-monospace text-blue-darken-3 total-cell">
                  {{ formatNumber(calculateTotalDetailQty(getItemDetails(item))) }}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        <div v-else class="text-center py-4 text-caption text-grey">
          Data detail alokasi kota tidak ditemukan untuk PO ini.
        </div>
      </div>
    </template>
  </BaseBrowse>

  <!-- ── DIALOG PENGAJUAN PERUBAHAN DATA (PENGUNCIAN DELPHI) ── -->
  <v-dialog v-model="panelAlasanVisible" max-width="500px" persistent>
    <v-card class="pengajuan-card">
      <v-card-title class="dialog-header py-3 px-4 bg-purple-darken-2 text-white d-flex align-center">
        <IconLockAccess :size="20" class="mr-2" />
        <span class="text-subtitle-1 font-weight-bold">
          Pengajuan Perubahan Data PO [Urut: {{ pengajuanState.lblUrut }}]
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
          Data PO nomor
          <strong class="font-monospace text-primary">
            {{ activePengajuanRow?.Nomor }}
          </strong>
          telah terkunci oleh tanggal closing sistem. Silakan isi alasan perubahan untuk mengajukan pembukaan akses edit ke pihak otoritas.
        </div>

        <v-textarea
          v-model="pengajuanState.edtAlasan"
          label="Alasan Perubahan Data (Wajib Diisi)"
          variant="outlined"
          density="compact"
          rows="4"
          bg-color="white"
          hide-details
          placeholder="Contoh: Perubahan Qty alokasi karena revisi SPK..."
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
  border: 1px solid #fca5a5;
}
.status-proses {
  background-color: #e0f2fe;
  color: #0369a1;
  border: 1px solid #7dd3fc;
}
.status-close {
  background-color: #dcfce7;
  color: #15803d;
  border: 1px solid #86efac;
}

/* ── CABANG TAG ── */
.cab-tag {
  display: inline-block;
  background-color: #f1f5f9;
  color: #475569;
  font-size: 10px;
  font-weight: 700;
  padding: 1px 5px;
  border-radius: 3px;
  border: 1px solid #cbd5e1;
}

/* ── NGEDIT BADGES (DELPHI STYLING) ── */
.ngedit-chip {
  display: inline-block;
  font-size: 8px;
  font-weight: 800;
  padding: 1px 4px;
  border-radius: 3px;
  line-height: 1.1;
  text-transform: uppercase;
}
.ngedit-chip.wait {
  background-color: #2563eb;
  color: white;
}
.ngedit-chip.acc {
  background-color: #16a34a;
  color: white;
}
.ngedit-chip.tolak {
  background-color: #dc2626;
  color: white;
}

.ngedit-badge {
  display: inline-block;
  padding: 2px 6px;
  border-radius: 3px;
  font-size: 9px;
  font-weight: 700;
}
.ngedit-badge.wait {
  background-color: #dbeafe;
  color: #1d4ed8;
}
.ngedit-badge.acc {
  background-color: #dcfce7;
  color: #15803d;
}
.ngedit-badge.tolak {
  background-color: #fee2e2;
  color: #b91c1c;
}

/* ── EXPANDED SUB TABLE ── */
.expand-detail-container {
  background: #f8fafc;
  border-top: 1px dashed #cbd5e1;
}
.expand-title {
  font-size: 11px;
  color: #1e293b;
  text-transform: uppercase;
}

.sub-table-wrapper {
  overflow-x: auto;
  border: 1px solid #cbd5e1;
  border-radius: 4px;
  background: white;
}

.sub-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 11px;
}
.sub-table th {
  background: #1565c0;
  color: white;
  padding: 5px 8px;
  font-weight: 700;
  text-align: left;
  border-right: 1px solid rgba(255, 255, 255, 0.2);
  white-space: nowrap;
}
.sub-table td {
  padding: 4px 8px;
  border-bottom: 1px solid #f1f5f9;
  border-right: 1px solid #f1f5f9;
  color: #334155;
}
.sub-table tr:hover td {
  background: #f8fafc;
}
.sub-footer-row td {
  background: #f1f5f9;
  border-top: 2px solid #cbd5e1;
  padding: 6px 8px;
}
.total-cell {
  font-size: 12px;
}
</style>
