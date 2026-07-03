<script setup lang="ts">
import { ref, computed, watch, onMounted } from "vue";
import { useToast } from "vue-toastification";
import { useAuthStore } from "@/stores/authStore";
import BaseBrowse from "@/components/BaseBrowse.vue";
import { useBrowse } from "@/composables/useBrowse";
import { approvalSjService as svc } from "@/services/penjualan/approvalSjService";
import { exportExcelSingle } from "@/utils/excelExport";
import {
  IconClipboardCheck,
  IconFileExport,
  IconListDetails,
  IconCheck,
  IconChecks,
  IconAlertTriangle,
} from "@tabler/icons-vue";

const toast = useToast();
const auth = useAuthStore();
const userCab = computed(() => auth.user?.cabang || "");

// ── Helpers ────────────────────────────────────────────────
const todayLocal = () => {
  const d = new Date(
    new Date().toLocaleString("en-US", { timeZone: "Asia/Jakarta" }),
  );
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const firstOfMonth = () => {
  const d = new Date(
    new Date().toLocaleString("en-US", { timeZone: "Asia/Jakarta" }),
  );
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
};
const num = (v: any) => Number(v || 0).toLocaleString("id-ID");

// ── Filter ─────────────────────────────────────────────────
const tglAwal = ref(firstOfMonth());
const tglAkhir = ref(todayLocal());
const showAllMode = ref(false); // toggle "Show All Not Approved"

// ── useBrowse ──────────────────────────────────────────────
const { items, isLoading, selected, fetchData } = useBrowse({
  menuId: "165",
  fetchApi: async () => {
    if (showAllMode.value) {
      const res = await svc.getAllNotApproved();
      return res.data.data ?? [];
    }
    const res = await svc.getBrowse(
      tglAwal.value,
      tglAkhir.value,
      userCab.value,
    );
    return res.data.data ?? [];
  },
});

const selectedItem = computed(() => selected.value[0] ?? null);

// ── Expand detail ────────────────────────────────────────────
const detailCache = ref<Record<string, any[]>>({});
const loadingDetails = ref<Set<string>>(new Set());
const expandedItems = ref<any[]>([]);

const onExpandChange = async (newExpanded: any[]) => {
  expandedItems.value = newExpanded;
  const newNomors = newExpanded.map((i: any) => (i.raw || i).Nomor);
  for (const nomor of newNomors) {
    if (!detailCache.value[nomor] && !loadingDetails.value.has(nomor)) {
      loadingDetails.value = new Set([...loadingDetails.value, nomor]);
      try {
        const res = await svc.getBrowseDetail(
          tglAwal.value,
          tglAkhir.value,
          userCab.value,
          nomor,
        );
        detailCache.value[nomor] = res.data.data ?? [];
      } catch {
        detailCache.value[nomor] = [];
      } finally {
        loadingDetails.value.delete(nomor);
        loadingDetails.value = new Set(loadingDetails.value);
      }
    }
  }
};

// ── Headers ────────────────────────────────────────────────
const headers = [
  { title: "Approved", key: "Approved", width: "90px" },
  { title: "Divisi", key: "Divisi", width: "90px" },
  { title: "Nomor", key: "Nomor", width: "140px" },
  { title: "Tanggal", key: "Tanggal", width: "90px" },
  { title: "Kode Gdg", key: "KodeGdg", width: "80px" },
  { title: "Gudang", key: "Gudang", minWidth: "160px" },
  { title: "Kode Customer", key: "KodeCustomer", width: "100px" },
  { title: "Customer", key: "Customer", minWidth: "180px" },
  { title: "Alamat", key: "Alamat", minWidth: "220px" },
];

const detailHeaders = [
  { title: "SPK", key: "SpkNomor", width: "130px" },
  { title: "Nama", key: "Nama", minWidth: "180px" },
  { title: "Ukuran", key: "Ukuran", width: "110px" },
  { title: "Panjang", key: "Panjang", width: "70px", align: "end" },
  { title: "Lebar", key: "Lebar", width: "70px", align: "end" },
  { title: "Jumlah", key: "Jumlah", width: "80px", align: "end" },
  { title: "Keterangan", key: "Keterangan", minWidth: "140px" },
];

// ── Row color — merah belum approve, biru batal ────────────
const rowPropsFn = (data: any) => {
  const item = data.item?.raw || data.item;
  if (item?.Approved === "Batal") return { style: "color:#1565c0" };
  if (!item?.Approved) return { style: "color:#c62828" };
  return {};
};

// ── Auto refresh ───────────────────────────────────────────
watch([tglAwal, tglAkhir], () => {
  if (!showAllMode.value) fetchData();
});
onMounted(fetchData);

const toggleShowAll = () => {
  showAllMode.value = !showAllMode.value;
  fetchData();
};

// ── Approve / Pending / Batal — context menu per row ────────
const showActionMenu = ref(false);

const onApprove = async () => {
  if (!selectedItem.value) return;
  try {
    await svc.approveSingle(selectedItem.value.Nomor);
    toast.success("Sukses.");
    fetchData();
  } catch (e: any) {
    toast.error(e.response?.data?.message || "Gagal Approve.");
  }
};

const showPendingDialog = ref(false);
const onPendingClick = () => {
  if (!selectedItem.value) return;
  if (!selectedItem.value.Approved) {
    toast.warning("Status belum di approve.\nTidak perlu dibatalkan.");
    return;
  }
  if (selectedItem.value.Approved !== "Sudah") {
    toast.warning("Hanya SJ berstatus Sudah yang bisa di-pending.");
    return;
  }
  showPendingDialog.value = true;
};
const confirmPending = async () => {
  showPendingDialog.value = false;
  try {
    await svc.setPending(selectedItem.value!.Nomor);
    toast.success("Sukses.");
    fetchData();
  } catch (e: any) {
    toast.error(e.response?.data?.message || "Gagal.");
  }
};

const showBatalDialog = ref(false);
const onBatalClick = () => {
  if (!selectedItem.value) return;
  if (selectedItem.value.Approved === "Sudah") {
    toast.warning(
      "Sudah di approve.\nSilahkan di Pending utk membatalkan Approve, baru di batalkan.",
    );
    return;
  }
  if (selectedItem.value.Approved === "Batal") {
    toast.warning("SJ ini sudah batal.");
    return;
  }
  showBatalDialog.value = true;
};
const confirmBatal = async () => {
  showBatalDialog.value = false;
  try {
    await svc.batalSj(selectedItem.value!.Nomor);
    toast.success("Sukses.");
    fetchData();
  } catch (e: any) {
    toast.error(e.response?.data?.message || "Gagal.");
  }
};

// ── Approval Massal (bulk dialog) ───────────────────────────
const showBulkDialog = ref(false);
const isLoadingBulk = ref(false);
const isApprovingBulk = ref(false);
const bulkList = ref<any[]>([]);
const bulkChecked = ref<Record<string, boolean>>({});
const bulkDivisiList = ref<{ kode: number; nama: string }[]>([]);
const bulkDivisiFilter = ref("0");
const bulkProgress = ref(0);
const showBulkConfirmDialog = ref(false);
const bulkFailedList = ref<any[]>([]);
const showBulkResultDialog = ref(false);

const bulkCheckedCount = computed(
  () => Object.values(bulkChecked.value).filter(Boolean).length,
);
const bulkAllChecked = computed({
  get: () =>
    bulkList.value.length > 0 &&
    bulkCheckedCount.value === bulkList.value.length,
  set: (val: boolean) => {
    for (const row of bulkList.value) {
      bulkChecked.value[row.Nomor] = val;
    }
  },
});

const openBulkDialog = async () => {
  showBulkDialog.value = true;
  bulkDivisiFilter.value = "0";
  bulkChecked.value = {};
  await Promise.all([loadBulkDivisi(), loadBulkList()]);
};

const loadBulkDivisi = async () => {
  if (bulkDivisiList.value.length) return;
  try {
    const res = await svc.getDivisiList();
    bulkDivisiList.value = res.data.data || [];
  } catch {
    /* ignore */
  }
};

const onClickBulkApprove = () => {
  const count = bulkCheckedCount.value;
  if (!count) {
    toast.warning(
      "Tidak ada data yang akan di approval.\nSilahkan dicentang dulu.",
    );
    return;
  }
  showBulkConfirmDialog.value = true;
};

const confirmBulkApprove = async () => {
  showBulkConfirmDialog.value = false;
  await submitBulkApprove();
};

const loadBulkList = async () => {
  isLoadingBulk.value = true;
  bulkChecked.value = {};
  try {
    const res = await svc.getBulkList(bulkDivisiFilter.value, userCab.value);
    bulkList.value = res.data.data || [];
  } catch (e: any) {
    toast.error(e.response?.data?.message || "Gagal memuat data.");
    bulkList.value = [];
  } finally {
    isLoadingBulk.value = false;
  }
};

const closeBulkDialog = () => {
  showBulkDialog.value = false;
  bulkList.value = [];
  bulkChecked.value = {};
  bulkProgress.value = 0;
};

const submitBulkApprove = async () => {
  isApprovingBulk.value = true;
  bulkProgress.value = 0;
  const selectedNomors = Object.keys(bulkChecked.value).filter(
    (k) => bulkChecked.value[k],
  );

  try {
    const res = await svc.approveBulk(selectedNomors);
    const result = res.data.data;
    bulkProgress.value = 100;

    if (result.failed?.length) {
      bulkFailedList.value = result.failed;
      showBulkResultDialog.value = true;
    } else {
      toast.success(
        `Selesai. ${result.success.length} SJ berhasil di-approve.`,
      );
    }

    closeBulkDialog();
    fetchData();
  } catch (e: any) {
    toast.error(e.response?.data?.message || "Gagal Simpan.");
  } finally {
    isApprovingBulk.value = false;
  }
};

// ── Export ─────────────────────────────────────────────────
const isExporting = ref(false);
const isExportingDetail = ref(false);

const onExport = async () => {
  isExporting.value = true;
  try {
    const res = await svc.getExportData(
      tglAwal.value,
      tglAkhir.value,
      userCab.value,
    );
    const data = res.data.data ?? [];
    await exportExcelSingle(
      `Approval_SJ_${tglAwal.value}_${tglAkhir.value}`,
      "Approval SJ",
      [
        { header: "Approved", key: "Approved" },
        { header: "Divisi", key: "Divisi" },
        { header: "Nomor", key: "Nomor" },
        { header: "Tanggal", key: "Tanggal" },
        { header: "Kode Gudang", key: "KodeGdg" },
        { header: "Gudang", key: "Gudang" },
        { header: "Kode Customer", key: "KodeCustomer" },
        { header: "Customer", key: "Customer" },
        { header: "Alamat", key: "Alamat" },
        { header: "Kota", key: "Kota" },
        { header: "Keterangan", key: "Keterangan" },
      ],
      data,
    );
  } catch {
    toast.error("Gagal export.");
  } finally {
    isExporting.value = false;
  }
};

const onExportDetail = async () => {
  isExportingDetail.value = true;
  try {
    const res = await svc.getExportDetail(
      tglAwal.value,
      tglAkhir.value,
      userCab.value,
    );
    const data = res.data.data ?? [];
    await exportExcelSingle(
      `Approval_SJ_Detail_${tglAwal.value}_${tglAkhir.value}`,
      "Detail",
      [
        { header: "Nomor SJ", key: "Nomor" },
        { header: "SPK", key: "SpkNomor" },
        { header: "Nama", key: "Nama" },
        { header: "Ukuran", key: "Ukuran" },
        { header: "Panjang", key: "Panjang", align: "right" },
        { header: "Lebar", key: "Lebar", align: "right" },
        { header: "Jumlah", key: "Jumlah", align: "right" },
        { header: "Keterangan", key: "Keterangan" },
      ],
      data,
    );
  } catch {
    toast.error("Gagal export detail.");
  } finally {
    isExportingDetail.value = false;
  }
};
</script>

<template>
  <BaseBrowse
    title="Approval Surat Jalan"
    menu-id="165"
    :icon="IconClipboardCheck"
    :is-loading="isLoading"
    :headers="headers"
    :items="items ?? []"
    item-value="Nomor"
    :can-edit="false"
    search-placeholder="Cari nomor, customer, alamat..."
    :selected="selected"
    :show-expand="true"
    :loading-details="loadingDetails"
    :expanded="expandedItems"
    @update:selected="selected = $event"
    @update:expanded="onExpandChange"
    @refresh="fetchData"
    :row-props-fn="rowPropsFn"
  >
    <!-- ── Filter ── -->
    <template #filter-left>
      <label class="flbl">Tanggal</label>
      <input
        type="date"
        v-model="tglAwal"
        class="finp"
        :disabled="showAllMode"
      />
      <span class="fsep">s.d.</span>
      <input
        type="date"
        v-model="tglAkhir"
        class="finp"
        :disabled="showAllMode"
      />
    </template>

    <template #filter-right>
      <div class="legend-row">
        <span class="legend-dot dot-red"></span>
        <span class="legend-lbl">Belum Approval/Pending</span>
        <span class="legend-dot dot-blue" style="margin-left: 12px"></span>
        <span class="legend-lbl">Batal</span>
      </div>
    </template>

    <!-- ── Extra actions ── -->
    <template #extra-actions>
      <v-btn
        size="small"
        variant="outlined"
        color="success"
        :loading="isExporting"
        @click="onExport"
      >
        <IconFileExport :size="14" style="margin-right: 4px" />
        Export
      </v-btn>

      <v-btn
        size="small"
        variant="outlined"
        color="success"
        :loading="isExportingDetail"
        @click="onExportDetail"
      >
        <IconListDetails :size="14" style="margin-right: 4px" />
        Export Detail
      </v-btn>

      <v-btn
        size="small"
        variant="flat"
        color="success"
        :disabled="!selectedItem"
        @click="onApprove"
      >
        <IconCheck :size="14" style="margin-right: 4px" />
        Approve
      </v-btn>

      <v-menu v-if="selectedItem">
        <template #activator="{ props }">
          <v-btn
            v-bind="props"
            size="small"
            variant="outlined"
            color="secondary"
          >
            Tindakan ▾
          </v-btn>
        </template>
        <v-list density="compact" style="font-size: 12px; min-width: 200px">
          <v-list-item @click="onPendingClick">
            <v-list-item-title>Set Pending</v-list-item-title>
          </v-list-item>
          <v-list-item @click="onBatalClick">
            <v-list-item-title>Batalkan SJ</v-list-item-title>
          </v-list-item>
        </v-list>
      </v-menu>

      <v-btn
        size="small"
        :variant="showAllMode ? 'flat' : 'outlined'"
        :color="showAllMode ? 'warning' : 'default'"
        @click="toggleShowAll"
      >
        <IconAlertTriangle :size="14" style="margin-right: 4px" />
        {{ showAllMode ? "Kembali ke Filter" : "Show All Not Approved" }}
      </v-btn>

      <v-btn
        size="small"
        variant="outlined"
        color="indigo"
        @click="openBulkDialog"
      >
        <IconChecks :size="14" style="margin-right: 4px" />
        Approval Massal
      </v-btn>
    </template>

    <!-- ── Custom cell rendering ── -->
    <template #item.Approved="{ item }">
      <span v-if="item.Approved === 'Sudah'" class="chip chip-green"
        >Sudah</span
      >
      <span v-else-if="item.Approved === 'Batal'" class="chip chip-blue"
        >Batal</span
      >
      <span v-else class="chip chip-red">Pending</span>
    </template>

    <!-- ── Expanded detail ── -->
    <template #detail="{ item }">
      <table class="dtbl">
        <thead>
          <tr>
            <th style="width: 26px">#</th>
            <th style="width: 130px">SPK</th>
            <th style="min-width: 180px">Nama</th>
            <th style="width: 110px">Ukuran</th>
            <th style="width: 70px; text-align: right">Panjang</th>
            <th style="width: 70px; text-align: right">Lebar</th>
            <th style="width: 80px; text-align: right">Jumlah</th>
            <th style="min-width: 140px">Keterangan</th>
          </tr>
        </thead>
        <tbody>
          <template v-if="detailCache[item.Nomor]?.length">
            <tr v-for="(d, j) in detailCache[item.Nomor]" :key="j">
              <td style="text-align: center; color: #9e9e9e; font-size: 10px">
                {{ j + 1 }}
              </td>
              <td
                style="font-family: monospace; font-size: 10px; color: #1565c0"
              >
                {{ d.SpkNomor }}
              </td>
              <td>{{ d.Nama }}</td>
              <td>{{ d.Ukuran }}</td>
              <td style="text-align: right">{{ d.Panjang || "-" }}</td>
              <td style="text-align: right">{{ d.Lebar || "-" }}</td>
              <td style="text-align: right">{{ num(d.Jumlah) }}</td>
              <td>{{ d.Keterangan }}</td>
            </tr>
          </template>
          <tr v-else-if="loadingDetails.has(item.Nomor)">
            <td
              colspan="8"
              style="text-align: center; padding: 8px; color: #9e9e9e"
            >
              Memuat...
            </td>
          </tr>
          <tr v-else>
            <td
              colspan="8"
              style="
                text-align: center;
                padding: 8px;
                color: #9e9e9e;
                font-style: italic;
              "
            >
              Tidak ada detail
            </td>
          </tr>
        </tbody>
      </table>
    </template>
  </BaseBrowse>

  <!-- ── Dialog Konfirmasi Pending ── -->
  <v-dialog v-model="showPendingDialog" max-width="360px" persistent>
    <v-card class="rounded-lg">
      <v-card-title
        class="pa-3 bg-warning text-white"
        style="font-size: 13px; font-weight: 700"
      >
        <IconAlertTriangle :size="15" style="margin-right: 6px" />
        Konfirmasi Pending
      </v-card-title>
      <v-card-text class="pa-4" style="font-size: 12px">
        Yakin akan di Batalkan (kembali ke pending) untuk
        <b>{{ selectedItem?.Nomor }}</b
        >?
      </v-card-text>
      <v-card-actions class="pa-3 border-t">
        <v-btn variant="text" size="small" @click="showPendingDialog = false"
          >Batal</v-btn
        >
        <v-spacer />
        <v-btn
          variant="flat"
          size="small"
          color="warning"
          @click="confirmPending"
          >Ya, Pending</v-btn
        >
      </v-card-actions>
    </v-card>
  </v-dialog>

  <!-- ── Dialog Konfirmasi Batal SJ ── -->
  <v-dialog v-model="showBatalDialog" max-width="360px" persistent>
    <v-card class="rounded-lg">
      <v-card-title
        class="pa-3 bg-error text-white"
        style="font-size: 13px; font-weight: 700"
      >
        <IconAlertTriangle :size="15" style="margin-right: 6px" />
        Konfirmasi Batal SJ
      </v-card-title>
      <v-card-text class="pa-4" style="font-size: 12px">
        Yakin SJ <b>{{ selectedItem?.Nomor }}</b> ini akan dibatalkan?<br />
        <span style="color: #e65100; font-size: 11px"
          >Alokasi piutang SPK akan dikembalikan.</span
        >
      </v-card-text>
      <v-card-actions class="pa-3 border-t">
        <v-btn variant="text" size="small" @click="showBatalDialog = false"
          >Batal</v-btn
        >
        <v-spacer />
        <v-btn variant="flat" size="small" color="error" @click="confirmBatal"
          >Ya, Batalkan</v-btn
        >
      </v-card-actions>
    </v-card>
  </v-dialog>

  <!-- ── Dialog Approval Massal ── -->
  <v-dialog v-model="showBulkDialog" max-width="980px" persistent>
    <v-card class="rounded-lg">
      <v-card-title
        class="pa-3 bg-indigo text-white d-flex align-center"
        style="font-size: 13px; font-weight: 700"
      >
        <IconChecks :size="15" style="margin-right: 6px" />
        Approval Massal Surat Jalan
        <v-spacer />
        <select
          v-model="bulkDivisiFilter"
          class="bulk-divisi-sel"
          @change="loadBulkList"
        >
          <option value="0">Semua Divisi</option>
          <option
            v-for="d in bulkDivisiList"
            :key="d.kode"
            :value="String(d.kode)"
          >
            {{ d.kode }} - {{ d.nama }}
          </option>
        </select>
      </v-card-title>

      <v-card-text class="pa-0">
        <!-- Loading -->
        <div v-if="isLoadingBulk" class="bulk-loading">
          <v-progress-circular
            indeterminate
            color="primary"
            size="28"
            width="3"
          />
          <span>Memuat data...</span>
        </div>

        <template v-else>
          <!-- Toolbar -->
          <div class="bulk-toolbar">
            <label class="bulk-check-all">
              <input type="checkbox" v-model="bulkAllChecked" />
              Centang Semua
            </label>
            <span class="bulk-count"
              >{{ bulkCheckedCount }} dari {{ bulkList.length }} dipilih</span
            >
            <v-spacer />
            <button class="bulk-refresh" @click="loadBulkList">
              ↻ Refresh
            </button>
          </div>

          <!-- Progress bar saat approving -->
          <div v-if="isApprovingBulk" class="bulk-progress-wrap">
            <div class="bulk-progress-bar">
              <div
                class="bulk-progress-fill"
                :style="`width:${bulkProgress}%`"
              ></div>
            </div>
            <span class="bulk-progress-text"
              >Memproses... {{ bulkProgress }}%</span
            >
          </div>

          <!-- Table -->
          <div class="bulk-table-wrap">
            <table v-if="bulkList.length" class="bulk-table">
              <thead>
                <tr>
                  <th style="width: 36px"></th>
                  <th style="width: 26px">#</th>
                  <th style="width: 90px">Divisi</th>
                  <th style="width: 140px">Nomor</th>
                  <th style="width: 95px">Tanggal</th>
                  <th style="min-width: 160px">Gudang</th>
                  <th style="width: 90px">Kd Cus</th>
                  <th style="min-width: 180px">Customer</th>
                  <th style="min-width: 220px">Alamat</th>
                  <th style="width: 100px">Kota</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="(row, i) in bulkList"
                  :key="row.Nomor"
                  :class="bulkChecked[row.Nomor] ? 'bulk-row-checked' : ''"
                  @click="bulkChecked[row.Nomor] = !bulkChecked[row.Nomor]"
                >
                  <td class="tc" @click.stop>
                    <input type="checkbox" v-model="bulkChecked[row.Nomor]" />
                  </td>
                  <td class="tc muted" style="font-size: 10px">{{ i + 1 }}</td>
                  <td>{{ row.Divisi }}</td>
                  <td class="mono" style="color: #1565c0; font-weight: 600">
                    {{ row.Nomor }}
                  </td>
                  <td>{{ row.Tanggal }}</td>
                  <td>{{ row.Gudang }}</td>
                  <td>{{ row.KdCus }}</td>
                  <td>{{ row.Nama }}</td>
                  <td>{{ row.Alamat }}</td>
                  <td>{{ row.Kota }}</td>
                </tr>
              </tbody>
            </table>
            <div v-else class="bulk-empty">
              Tidak ada SJ yang menunggu approval
            </div>
          </div>
        </template>
      </v-card-text>

      <v-card-actions class="pa-3 border-t">
        <v-btn
          variant="text"
          size="small"
          :disabled="isApprovingBulk"
          @click="closeBulkDialog"
        >
          Tutup
        </v-btn>
        <v-spacer />
        <v-btn
          variant="flat"
          size="small"
          color="success"
          :loading="isApprovingBulk"
          :disabled="isLoadingBulk || !bulkCheckedCount"
          @click="onClickBulkApprove"
        >
          Approve ({{ bulkCheckedCount }})
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <v-dialog v-model="showBulkConfirmDialog" max-width="360px" persistent>
    <v-card class="rounded-lg">
      <v-card-title
        class="pa-3 bg-success text-white"
        style="font-size: 13px; font-weight: 700"
      >
        Konfirmasi Approval Massal
      </v-card-title>
      <v-card-text class="pa-4" style="font-size: 12px">
        Yakin akan meng-approve <b>{{ bulkCheckedCount }}</b> Surat Jalan
        sekaligus?
      </v-card-text>
      <v-card-actions class="pa-3 border-t">
        <v-btn
          variant="text"
          size="small"
          @click="showBulkConfirmDialog = false"
          >Batal</v-btn
        >
        <v-spacer />
        <v-btn
          variant="flat"
          size="small"
          color="success"
          @click="confirmBulkApprove"
        >
          Ya, Approve
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <v-dialog v-model="showBulkResultDialog" max-width="480px">
    <v-card class="rounded-lg">
      <v-card-title
        class="pa-3 bg-warning text-white"
        style="font-size: 13px; font-weight: 700"
      >
        Sebagian Gagal Di-approve
      </v-card-title>
      <v-card-text class="pa-0">
        <table style="width: 100%; border-collapse: collapse; font-size: 12px">
          <thead>
            <tr style="background: #fff3e0">
              <th style="padding: 6px 10px; text-align: left">Nomor</th>
              <th style="padding: 6px 10px; text-align: left">Alasan</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(f, i) in bulkFailedList" :key="i">
              <td
                style="
                  padding: 5px 10px;
                  font-family: monospace;
                  color: #1565c0;
                "
              >
                {{ f.nomor }}
              </td>
              <td style="padding: 5px 10px; color: #c62828">{{ f.reason }}</td>
            </tr>
          </tbody>
        </table>
      </v-card-text>
      <v-card-actions class="pa-2">
        <v-spacer />
        <v-btn size="small" variant="text" @click="showBulkResultDialog = false"
          >Tutup</v-btn
        >
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.flbl {
  font-size: 11px;
  font-weight: 600;
  color: #444;
  white-space: nowrap;
}
.finp {
  height: 28px;
  border: 1px solid #bdbdbd;
  border-radius: 4px;
  padding: 0 6px;
  font-size: 12px;
  outline: none;
}
.finp:focus {
  border-color: #1565c0;
}
.finp:disabled {
  background: #f0f0f0;
  color: #999;
}
.fsep {
  font-size: 11px;
  color: #777;
}

.legend-row {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
}
.legend-dot {
  width: 12px;
  height: 12px;
  border-radius: 2px;
  flex-shrink: 0;
}
.dot-red {
  background: #c62828;
}
.dot-blue {
  background: #1565c0;
}
.legend-lbl {
  color: #555;
}

.chip {
  font-size: 10px;
  font-weight: 700;
  padding: 1px 7px;
  border-radius: 8px;
}
.chip-green {
  background: #e8f5e9;
  color: #2e7d32;
}
.chip-red {
  background: #ffebee;
  color: #c62828;
}
.chip-blue {
  background: #e3f2fd;
  color: #1565c0;
}

.dtbl {
  width: 100%;
  min-width: 700px;
  border-collapse: collapse;
  font-size: 11px;
  margin: 6px 0 6px 32px;
  width: calc(100% - 32px);
}
.dtbl th {
  background: #455a64;
  color: white;
  padding: 3px 6px;
  font-size: 10px;
  font-weight: 700;
  text-align: left;
  white-space: nowrap;
}
.dtbl td {
  padding: 3px 6px;
  border-bottom: 0.3px solid #ececec;
}
.bulk-divisi-sel {
  height: 26px;
  border: 1px solid rgba(255, 255, 255, 0.4);
  border-radius: 4px;
  padding: 0 6px;
  font-size: 11px;
  background: rgba(255, 255, 255, 0.15);
  color: white;
  outline: none;
}
.bulk-divisi-sel option {
  color: #212121;
}

.bulk-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 50px;
  color: #1565c0;
  font-size: 12px;
  font-weight: 600;
}

.bulk-toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 14px;
  background: #f5f5f5;
  border-bottom: 1px solid #e0e0e0;
}
.bulk-check-all {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 600;
  color: #444;
  cursor: pointer;
}
.bulk-check-all input {
  width: 14px;
  height: 14px;
  cursor: pointer;
}
.bulk-count {
  font-size: 11px;
  color: #777;
}
.bulk-refresh {
  background: none;
  border: 1px solid #bdbdbd;
  border-radius: 4px;
  padding: 3px 10px;
  font-size: 11px;
  color: #1565c0;
  cursor: pointer;
}
.bulk-refresh:hover {
  background: #e3f2fd;
}

.bulk-progress-wrap {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 14px;
  background: #e8f5e9;
}
.bulk-progress-bar {
  flex: 1;
  height: 8px;
  background: #c8e6c9;
  border-radius: 4px;
  overflow: hidden;
}
.bulk-progress-fill {
  height: 100%;
  background: #2e7d32;
  transition: width 0.3s;
}
.bulk-progress-text {
  font-size: 11px;
  font-weight: 600;
  color: #2e7d32;
  white-space: nowrap;
}

.bulk-table-wrap {
  max-height: 420px;
  overflow: auto;
}
.bulk-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 11.5px;
}
.bulk-table thead tr {
  position: sticky;
  top: 0;
  background: #1565c0;
  z-index: 1;
}
.bulk-table th {
  padding: 6px 8px;
  color: white;
  font-weight: 700;
  text-align: left;
  white-space: nowrap;
  font-size: 10.5px;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}
.bulk-table td {
  padding: 4px 8px;
  border-bottom: 0.5px solid #f0f0f0;
}
.bulk-table tbody tr {
  cursor: pointer;
}
.bulk-table tbody tr:hover td {
  background: #f5f5f5;
}
.bulk-row-checked td {
  background: #e8f5e9 !important;
}
.bulk-table input[type="checkbox"] {
  width: 14px;
  height: 14px;
  cursor: pointer;
}
.bulk-empty {
  padding: 40px;
  text-align: center;
  color: #9e9e9e;
  font-size: 12px;
  font-style: italic;
}
</style>
