<script setup lang="ts">
import { ref, computed, onMounted, watch } from "vue";
import { useRouter } from "vue-router";
import { useToast } from "vue-toastification";
import { useAuthStore } from "@/stores/authStore";
import { useBrowse } from "@/composables/useBrowse";
import api from "@/services/api";
import BaseBrowse from "@/components/BaseBrowse.vue";
import { exportExcelSingle } from "@/utils/excelExport";
import {
  IconClipboardList,
  IconSearch,
  IconPrinter,
  IconTruckDelivery,
  IconTableExport,
  IconAlertTriangle,
  IconCheck,
} from "@tabler/icons-vue";
import { formatTanggal, formatTanggalJam } from "@/utils/dateFormat";

// ── Types ──────────────────────────────────────────────────────────────
interface PoJasaRow {
  Nomor: string;
  Cab: string;
  Tanggal: string;
  Jasa: string;
  JasaKode: string;
  Keterangan: string;
  KodeSupplier: string;
  Supplier: string;
  Gudang: string;
  SPK: string;
  spk_nama: string;
  pojh_tarif: number;
  pojh_jumlah: number;
  Status: string;
  Usr: string;
  Created: string;
  Ngedit: string; // WAIT | ACC | TOLAK | ""
  hapus: string; // "Y" | ""
}

interface DetailRow {
  Nomor: string;
  Kode: string;
  Nama: string;
  Satuan: string;
  Jumlah: number;
  Terima: number;
  Status_barang: string;
}

// ── Store & Router ─────────────────────────────────────────────────────
const authStore = useAuthStore();
const router = useRouter();
const toast = useToast();
const userCab = computed(() => authStore.user?.cabang || "");

// ── Filter State ───────────────────────────────────────────────────────
const todayWIB = () => {
  const d = new Date(
    new Date().toLocaleString("en-US", { timeZone: "Asia/Jakarta" }),
  );
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const today = todayWIB();

const getDefaultCab = () => {
  const c = authStore.user?.cabang || "";
  if (!c || c.startsWith("HO") || c === "ALL") return "ALL";
  return c;
};

const filterState = ref({
  tglAwal: today,
  tglAkhir: today,
  cab: getDefaultCab(),
});

// ── useBrowse ──────────────────────────────────────────────────────────
const {
  items,
  isLoading,
  selected,
  canInsert,
  canEdit,
  canDelete,
  canExport,
  fetchData,
  clearSelection,
} = useBrowse<PoJasaRow>({
  menuId: "102",
  immediate: false,
  fetchApi: async () => {
    const res = await api.get("/garmen/po-jasa", {
      params: {
        tglAwal: filterState.value.tglAwal,
        tglAkhir: filterState.value.tglAkhir,
        cab: filterState.value.cab,
      },
    });
    return res.data.data || [];
  },
  deleteApi: async (nomor) => {
    await api.delete(`/garmen/po-jasa/${encodeURIComponent(nomor)}`);
  },
});

// ── Selected item ──────────────────────────────────────────────────────
const selectedItem = computed(() =>
  selected.value.length === 1 ? selected.value[0] : null,
);

// ── Detail expand ──────────────────────────────────────────────────────
const expanded = ref<PoJasaRow[]>([]);
const detailCache = ref<Record<string, DetailRow[]>>({});
const loadingDetails = ref<Set<string>>(new Set());

const onUpdateExpanded = async (val: any[]) => {
  expanded.value = val;
  for (const v of val) {
    const nomor = typeof v === "object" ? v.Nomor : v;
    if (!detailCache.value[nomor]) {
      loadingDetails.value = new Set([...loadingDetails.value, nomor]);
      try {
        const res = await api.get(
          `/garmen/po-jasa/${encodeURIComponent(nomor)}/detail`,
        );
        detailCache.value[nomor] = res.data.data || [];
      } catch {
        detailCache.value[nomor] = [];
      } finally {
        const next = new Set(loadingDetails.value);
        next.delete(nomor);
        loadingDetails.value = next;
      }
    }
  }
};

// ── Row color sesuai Delphi cxGrdMasterCustomDrawCell ─────────────────
// hapus='Y' → font abu-abu
// Ngedit='WAIT' → background biru, font putih (kolom Nomor)
// Ngedit='ACC' → background hijau, font putih
// Ngedit='TOLAK' → background merah, font putih
const rowClass = (item: PoJasaRow) => {
  if (item.hapus === "Y") return "row-hapus";
  if (item.Ngedit === "WAIT") return "row-wait";
  if (item.Ngedit === "ACC") return "row-acc";
  if (item.Ngedit === "TOLAK") return "row-tolak";
  return "";
};

const rowPropsFn = (data: any) => {
  const item: PoJasaRow = data.item?.raw || data.item;
  if (!item) return {};
  if (item.hapus === "Y") return { style: "color: #9e9e9e;" };
  return {};
};

// ── Pengajuan dialog ───────────────────────────────────────────────────
const showPengajuanDialog = ref(false);
const pengajuanMode = ref<"ubah" | "hapus">("ubah");
const pengajuanAlasan = ref("");
const isPengajuanLoading = ref(false);
const isCekTutupBukuLoading = ref(false);

const openPengajuanUbah = async () => {
  if (!selectedItem.value) return;

  isCekTutupBukuLoading.value = true;
  try {
    // getById sudah include isClose dari tutupBukuService
    const res = await api.get("/garmen/po-jasa/by-nomor", {
      params: { nomor: selectedItem.value.Nomor },
    });
    const { isClose } = res.data.data;

    if (!isClose) {
      toast.info("Tidak perlu pengajuan perubahan data.");
      return;
    }
  } catch (err: any) {
    toast.error(err.response?.data?.message ?? "Gagal cek status data.");
    return;
  } finally {
    isCekTutupBukuLoading.value = false;
  }

  pengajuanMode.value = "ubah";
  pengajuanAlasan.value = "";
  showPengajuanDialog.value = true;
};

// Sesuai Delphi PengajuanPenghapusanData1Click
// Jika date_create = today → tidak perlu pengajuan, hapus langsung
// Jika bukan today → buka dialog pengajuan hapus
const openPengajuanHapus = async () => {
  if (!selectedItem.value) return;
  // Cek apakah bisa hapus langsung (date_create = today)
  try {
    await api.delete(
      `/garmen/po-jasa/${encodeURIComponent(selectedItem.value.Nomor)}`,
    );
    toast.success(`Data ${selectedItem.value.Nomor} berhasil dihapus.`);
    delete detailCache.value[selectedItem.value.Nomor];
    clearSelection();
    await fetchData();
  } catch (err: any) {
    const msg = err.response?.data?.message || "Gagal menghapus.";
    if (msg === "Perlu Pengajuan Hapus Data.") {
      // date_create bukan hari ini → buka dialog pengajuan hapus
      pengajuanMode.value = "hapus";
      pengajuanAlasan.value = "";
      showPengajuanDialog.value = true;
    } else {
      toast.error(msg);
    }
  }
};

const submitPengajuan = async () => {
  if (!pengajuanAlasan.value.trim()) {
    toast.warning("Alasan harus diisi.");
    return;
  }
  if (!selectedItem.value) return;
  isPengajuanLoading.value = true;
  try {
    const endpoint =
      pengajuanMode.value === "ubah"
        ? "/garmen/po-jasa/pengajuan-ubah"
        : "/garmen/po-jasa/pengajuan-hapus";
    await api.post(endpoint, {
      nomor: selectedItem.value.Nomor,
      tanggal: selectedItem.value.Tanggal,
      keterangan: selectedItem.value.Keterangan,
      alasan: pengajuanAlasan.value.trim(),
    });
    toast.success("Berhasil diajukkan. Nunggu ACC.");
    showPengajuanDialog.value = false;
    await fetchData();
  } catch (e: any) {
    toast.error(e.response?.data?.message || "Gagal pengajuan.");
  } finally {
    isPengajuanLoading.value = false;
  }
};

// ── Delete — sesuai Delphi cxButton4Click
// Tombol Hapus di BaseBrowse trigger ini, flow sama dengan openPengajuanHapus
// (cek date_create = today di backend, kalau bukan → throw "Perlu Pengajuan Hapus Data.")
const onDelete = async (item: PoJasaRow) => {
  selected.value = [item];
  await openPengajuanHapus();
};

// ── Cetak & Cetak SJ ───────────────────────────────────────────────────
const onCetak = (item: PoJasaRow) => {
  const encoded = encodeURIComponent(item.Nomor);
  window.open(`/garmen/po-jasa/print/${encoded}`, "_blank");
};

const onCetakSJ = (item: PoJasaRow) => {
  const encoded = encodeURIComponent(item.Nomor);
  window.open(`/garmen/po-jasa/print-sj/${encoded}`, "_blank");
};

// ── Export ─────────────────────────────────────────────────────────────
const isExporting = ref(false);
const isExportingDetail = ref(false);

const onExport = async () => {
  isExporting.value = true;
  try {
    await exportExcelSingle(
      `POJasa_${filterState.value.tglAwal}_${filterState.value.tglAkhir}.xlsx`,
      "PO Jasa",
      [
        { header: "Nomor", key: "Nomor", width: 18 },
        { header: "Cab", key: "Cab", width: 6 },
        { header: "Tanggal", key: "Tanggal", width: 12 },
        { header: "Jasa", key: "Jasa", width: 14 },
        { header: "Keterangan", key: "Keterangan", width: 30 },
        { header: "Kode Supplier", key: "KodeSupplier", width: 12 },
        { header: "Supplier", key: "Supplier", width: 24 },
        { header: "Gudang", key: "Gudang", width: 16 },
        { header: "SPK", key: "SPK", width: 16 },
        { header: "Nama SPK", key: "spk_nama", width: 28 },
        {
          header: "Tarif",
          key: "pojh_tarif",
          width: 12,
          numFmt: "#,##0.00",
          align: "right",
        },
        {
          header: "Jumlah",
          key: "pojh_jumlah",
          width: 10,
          numFmt: "#,##0",
          align: "right",
        },
        { header: "Status", key: "Status", width: 10 },
        { header: "User", key: "Usr", width: 12 },
        { header: "Dibuat", key: "Created", width: 18 },
      ],
      items.value ?? [],
      `PO Jasa — ${filterState.value.tglAwal} s/d ${filterState.value.tglAkhir}`,
    );
    toast.success("Export berhasil.");
  } catch {
    toast.error("Gagal export.");
  } finally {
    isExporting.value = false;
  }
};

const onExportDetail = async () => {
  isExportingDetail.value = true;
  try {
    const res = await api.get("/garmen/po-jasa/export-detail", {
      params: {
        tglAwal: filterState.value.tglAwal,
        tglAkhir: filterState.value.tglAkhir,
        cab: filterState.value.cab,
      },
    });
    const rows: any[] = res.data.data ?? [];
    await exportExcelSingle(
      `POJasaDetail_${filterState.value.tglAwal}_${filterState.value.tglAkhir}.xlsx`,
      "Detail",
      [
        { header: "Nomor", key: "Nomor", width: 18 },
        { header: "Cab", key: "Cab", width: 6 },
        { header: "Tanggal", key: "Tanggal", width: 12 },
        { header: "Jasa", key: "Jasa", width: 14 },
        { header: "Keterangan", key: "Keterangan", width: 30 },
        { header: "Supplier", key: "Supplier", width: 24 },
        { header: "Nama SPK", key: "spk_nama", width: 28 },
        { header: "Kode Bahan", key: "Kode", width: 14 },
        { header: "Nama Bahan", key: "Nama", width: 24 },
        { header: "Satuan", key: "Satuan", width: 8 },
        {
          header: "Jumlah",
          key: "Jumlah",
          width: 10,
          numFmt: "#,##0",
          align: "right",
        },
        {
          header: "Terima",
          key: "Terima",
          width: 10,
          numFmt: "#,##0",
          align: "right",
        },
        { header: "Status Barang", key: "Status_barang", width: 12 },
      ],
      rows,
      `Detail PO Jasa — ${filterState.value.tglAwal} s/d ${filterState.value.tglAkhir}`,
    );
    toast.success("Export detail berhasil.");
  } catch {
    toast.error("Gagal export detail.");
  } finally {
    isExportingDetail.value = false;
  }
};

// ── Approve ─────────────────────────────────────────────────────────────
const showApproveDialog = ref(false);
const isApproving = ref(false);

const openApprove = () => {
  if (!selectedItem.value) return;
  showApproveDialog.value = true;
};

const confirmApprove = async () => {
  if (!selectedItem.value) return;
  isApproving.value = true;
  try {
    await api.post("/garmen/po-jasa/approve", {
      nomor: selectedItem.value.Nomor,
    });
    toast.success("Berhasil di-approve.");
    showApproveDialog.value = false;
    await fetchData();
  } catch (e: any) {
    toast.error(e.response?.data?.message || "Gagal approve.");
  } finally {
    isApproving.value = false;
  }
};

// ── Headers ────────────────────────────────────────────────────────────
const headers = [
  { title: "Nomor", key: "Nomor", width: "140px" },
  { title: "Cab", key: "Cab", width: "50px" },
  { title: "Tanggal", key: "Tanggal", width: "95px" },
  { title: "Jasa", key: "Jasa", width: "100px" },
  { title: "Keterangan", key: "Keterangan", width: "240px" },
  { title: "Kode Sup", key: "KodeSupplier", width: "80px" },
  { title: "Supplier", key: "Supplier", width: "180px" },
  { title: "Gudang", key: "Gudang", width: "120px" },
  { title: "SPK", key: "SPK", width: "140px" },
  { title: "Nama SPK", key: "spk_nama", width: "220px" },
  { title: "Tarif", key: "pojh_tarif", width: "80px", align: "end" },
  { title: "Jumlah", key: "pojh_jumlah", width: "80px", align: "end" },
  { title: "Status", key: "Status", width: "80px" },
  { title: "User", key: "Usr", width: "80px" },
  { title: "Dibuat", key: "Created", width: "160px" },
];

const detailHeaders = [
  { title: "Kode", key: "Kode", width: "120px" },
  { title: "Nama", key: "Nama", width: "200px" },
  { title: "Satuan", key: "Satuan", width: "60px" },
  { title: "Jumlah", key: "Jumlah", width: "80px", align: "end" },
  { title: "Terima", key: "Terima", width: "80px", align: "end" },
  { title: "Status Barang", key: "Status_barang", width: "100px" },
];

// ── Filter state restore ───────────────────────────────────────────────
const onFilterStateRestored = (saved: Record<string, any>) => {
  if (saved.tglAwal) filterState.value.tglAwal = saved.tglAwal;
  if (saved.tglAkhir) filterState.value.tglAkhir = saved.tglAkhir;
  if (saved.cab !== undefined) filterState.value.cab = saved.cab;
};

// ── Lifecycle ──────────────────────────────────────────────────────────
onMounted(async () => {
  await fetchData();
});

let filterTimer: ReturnType<typeof setTimeout> | null = null;
watch(
  () => [
    filterState.value.tglAwal,
    filterState.value.tglAkhir,
    filterState.value.cab,
  ],
  () => {
    if (filterTimer) clearTimeout(filterTimer);
    filterTimer = setTimeout(() => fetchData(), 400);
  },
);

const num = (v: any, d = 0) =>
  Number(v || 0).toLocaleString("id-ID", {
    minimumFractionDigits: d,
    maximumFractionDigits: d,
  });
</script>

<template>
  <BaseBrowse
    title="PO Jasa"
    menu-id="102"
    :icon="IconClipboardList"
    :headers="headers"
    :items="items ?? []"
    :is-loading="isLoading"
    item-value="Nomor"
    :can-insert="canInsert"
    :can-edit="canEdit"
    :can-delete="canDelete"
    :can-export="canExport"
    :show-expand="true"
    :expanded="expanded"
    :selected="selected"
    :row-props-fn="rowPropsFn"
    :filter-state="filterState"
    search-placeholder="Cari nomor, SPK, supplier, keterangan..."
    @refresh="fetchData"
    @add="router.push('/garmen/po-jasa/create')"
    @edit="
      (item) =>
        router.push(`/garmen/po-jasa/edit/${encodeURIComponent(item.Nomor)}`)
    "
    @delete="onDelete"
    @export="onExport"
    @update:expanded="onUpdateExpanded"
    @update:selected="(val) => (selected = val)"
    @update:filter-state="onFilterStateRestored"
  >
    <!-- ── Filter kiri ── -->
    <template #filter-left>
      <div class="f-grp">
        <label class="f-lbl">Dari</label>
        <input type="date" v-model="filterState.tglAwal" class="f-date" />
      </div>
      <div class="f-grp">
        <label class="f-lbl">S/D</label>
        <input type="date" v-model="filterState.tglAkhir" class="f-date" />
      </div>
      <div class="f-grp">
        <label class="f-lbl">Cabang</label>
        <select v-model="filterState.cab" class="f-sel">
          <option value="ALL">ALL</option>
          <option value="P01">P01</option>
          <option value="P04">P04</option>
        </select>
      </div>
    </template>

    <!-- ── Extra actions: Cetak, Cetak SJ, Export Detail ── -->
    <template #extra-actions>
      <!-- Cetak -->
      <v-btn
        size="small"
        color="indigo"
        :disabled="!selectedItem"
        @click="selectedItem && onCetak(selectedItem)"
      >
        <template #prepend>
          <IconPrinter :size="15" :stroke-width="1.7" />
        </template>
        Cetak
      </v-btn>

      <!-- Cetak SJ -->
      <v-btn
        size="small"
        color="teal"
        :disabled="!selectedItem"
        @click="selectedItem && onCetakSJ(selectedItem)"
      >
        <template #prepend>
          <IconTruckDelivery :size="15" :stroke-width="1.7" />
        </template>
        Cetak SJ
      </v-btn>

      <!-- Approve -->
      <v-btn
        v-if="selectedItem?.JasaKode === 'J08'"
        size="small"
        color="green-darken-2"
        :disabled="selectedItem?.Status === 'Closed'"
        @click="openApprove"
      >
        <template #prepend>
          <IconCheck :size="15" :stroke-width="1.7" />
        </template>
        Approve
      </v-btn>

      <!-- Export Detail -->
      <v-btn
        size="small"
        color="green-darken-2"
        :loading="isExportingDetail"
        @click="onExportDetail"
      >
        <template #prepend>
          <IconTableExport :size="15" :stroke-width="1.7" />
        </template>
        Export Detail
      </v-btn>

      <!-- Tindakan dropdown -->
      <v-menu>
        <template #activator="{ props: menuProps }">
          <v-btn
            size="small"
            color="orange-darken-1"
            :disabled="!selectedItem"
            :loading="isCekTutupBukuLoading"
            v-bind="menuProps"
          >
            <template #prepend>
              <IconAlertTriangle :size="15" :stroke-width="1.7" />
            </template>
            Tindakan
          </v-btn>
        </template>
        <v-list density="compact" min-width="220">
          <v-list-item
            prepend-icon="mdi-pencil-lock"
            title="Pengajuan Perubahan Data"
            @click="openPengajuanUbah"
          />
          <v-list-item
            prepend-icon="mdi-delete-clock"
            title="Pengajuan Penghapusan Data"
            @click="openPengajuanHapus"
          />
        </v-list>
      </v-menu>
    </template>

    <!-- ── Kolom Nomor custom cell dengan warna sesuai Ngedit ── -->
    <template #item.Nomor="{ item }">
      <span
        :class="{
          'nomor-wait': item.Ngedit === 'WAIT',
          'nomor-acc': item.Ngedit === 'ACC',
          'nomor-tolak': item.Ngedit === 'TOLAK',
        }"
        :style="item.hapus === 'Y' ? 'color: #9e9e9e' : ''"
        >{{ item.Nomor }}</span
      >
    </template>

    <!-- Kolom Tanggal -->
    <template #item.Tanggal="{ item }">
      {{ formatTanggal(item.Tanggal) }}
    </template>

    <template #item.Created="{ item }">
      {{ formatTanggalJam(item.Created) }}
    </template>

    <!-- ── Kolom Status ── -->
    <template #item.Status="{ item }">
      <span
        :class="{
          'status-proses': item.Status === 'Proses',
          'status-closed': item.Status === 'Closed',
          'status-belum': item.Status === 'Belum',
        }"
        >{{ item.Status }}</span
      >
    </template>

    <!-- ── Kolom Tarif & Jumlah (right align) ── -->
    <template #item.pojh_tarif="{ item }">
      <span class="tr">{{ num(item.pojh_tarif, 2) }}</span>
    </template>
    <template #item.pojh_jumlah="{ item }">
      <span class="tr">{{ num(item.pojh_jumlah) }}</span>
    </template>

    <!-- ── Expanded detail ── -->
    <template #detail="{ item }">
      <div v-if="loadingDetails.has(item.Nomor)" class="detail-loading">
        <v-progress-circular indeterminate size="18" color="primary" />
        <span>Memuat detail...</span>
      </div>
      <template v-else-if="detailCache[item.Nomor]?.length">
        <table
          style="
            border-collapse: collapse;
            font-size: 11px;
            white-space: nowrap;
          "
        >
          <thead>
            <tr>
              <th
                style="
                  background: #1565c0;
                  color: white;
                  padding: 4px 10px;
                  font-weight: 700;
                  white-space: nowrap;
                "
              >
                Kode
              </th>
              <th
                style="
                  background: #1565c0;
                  color: white;
                  padding: 4px 10px;
                  font-weight: 700;
                  white-space: nowrap;
                  min-width: 180px;
                "
              >
                Nama
              </th>
              <th
                style="
                  background: #1565c0;
                  color: white;
                  padding: 4px 10px;
                  font-weight: 700;
                  white-space: nowrap;
                "
              >
                Satuan
              </th>
              <th
                style="
                  background: #1565c0;
                  color: white;
                  padding: 4px 10px;
                  font-weight: 700;
                  white-space: nowrap;
                  text-align: right;
                "
              >
                Jumlah
              </th>
              <th
                style="
                  background: #1565c0;
                  color: white;
                  padding: 4px 10px;
                  font-weight: 700;
                  white-space: nowrap;
                  text-align: right;
                "
              >
                Terima
              </th>
              <th
                style="
                  background: #1565c0;
                  color: white;
                  padding: 4px 10px;
                  font-weight: 700;
                  white-space: nowrap;
                "
              >
                Status
              </th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(row, idx) in detailCache[item.Nomor]"
              :key="idx"
              :style="idx % 2 === 1 ? 'background:#f5f5f5' : ''"
            >
              <td
                style="
                  padding: 3px 10px;
                  border-bottom: 1px solid #e0e0e0;
                  white-space: nowrap;
                  font-family: monospace;
                  font-size: 10px;
                  color: #1565c0;
                  font-weight: 600;
                "
              >
                {{ row.Kode }}
              </td>
              <td
                style="
                  padding: 3px 10px;
                  border-bottom: 1px solid #e0e0e0;
                  white-space: nowrap;
                "
              >
                {{ row.Nama }}
              </td>
              <td
                style="
                  padding: 3px 10px;
                  border-bottom: 1px solid #e0e0e0;
                  white-space: nowrap;
                  text-align: center;
                "
              >
                {{ row.Satuan }}
              </td>
              <td
                style="
                  padding: 3px 10px;
                  border-bottom: 1px solid #e0e0e0;
                  white-space: nowrap;
                  text-align: right;
                "
              >
                {{ num(row.Jumlah) }}
              </td>
              <td
                style="
                  padding: 3px 10px;
                  border-bottom: 1px solid #e0e0e0;
                  white-space: nowrap;
                  text-align: right;
                "
              >
                {{ num(row.Terima) }}
              </td>
              <td
                style="
                  padding: 3px 10px;
                  border-bottom: 1px solid #e0e0e0;
                  white-space: nowrap;
                "
              >
                <span
                  :class="{
                    'sb-delay': row.Status_barang === 'Delay',
                    'sb-true': row.Status_barang === 'True',
                    'sb-cancel': row.Status_barang === 'Cancel',
                  }"
                  >{{ row.Status_barang }}</span
                >
              </td>
            </tr>
          </tbody>
        </table>
      </template>
      <div v-else class="detail-empty">
        Tidak ada detail untuk {{ item.Nomor }}
      </div>
    </template>

    <!-- ── Legend warna ── -->
    <template #footer-left>
      <div class="legend">
        <span class="leg-item"
          ><span class="leg-dot leg-wait"></span>Nunggu ACC</span
        >
        <span class="leg-item"
          ><span class="leg-dot leg-acc"></span>Sudah ACC</span
        >
        <span class="leg-item"
          ><span class="leg-dot leg-tolak"></span>Tolak</span
        >
        <span class="leg-item"
          ><span class="leg-dot leg-hapus"></span>Diajukan hapus</span
        >
      </div>
    </template>
  </BaseBrowse>

  <!-- ── Dialog Pengajuan Ubah/Hapus ── -->
  <v-dialog v-model="showPengajuanDialog" max-width="480px" persistent>
    <v-card class="rounded-lg">
      <v-card-title
        class="pa-3 text-white"
        :class="
          pengajuanMode === 'ubah' ? 'bg-orange-darken-2' : 'bg-red-darken-2'
        "
        style="font-size: 13px; font-weight: 700"
      >
        {{
          pengajuanMode === "ubah"
            ? "Pengajuan Ubah Data"
            : "Pengajuan Hapus Data"
        }}
        —
        {{ selectedItem?.Nomor }}
      </v-card-title>
      <v-card-text class="pa-4">
        <div style="font-size: 12px; color: #555; margin-bottom: 8px">
          Alasan pengajuan:
        </div>
        <v-textarea
          v-model="pengajuanAlasan"
          variant="outlined"
          density="compact"
          rows="3"
          placeholder="Isi alasan..."
          style="font-size: 12px"
          autofocus
        />
      </v-card-text>
      <v-card-actions class="pa-3 border-t">
        <v-btn variant="text" size="small" @click="showPengajuanDialog = false"
          >Batal</v-btn
        >
        <v-spacer />
        <v-btn
          variant="flat"
          size="small"
          :color="pengajuanMode === 'ubah' ? 'orange-darken-2' : 'red-darken-2'"
          :loading="isPengajuanLoading"
          @click="submitPengajuan"
        >
          Ajukkan
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <v-dialog v-model="showApproveDialog" max-width="400px" persistent>
    <v-card class="rounded-lg">
      <v-card-title
        class="pa-3 bg-green-darken-2 text-white"
        style="font-size: 13px; font-weight: 700"
      >
        Konfirmasi Approve
      </v-card-title>
      <v-card-text class="pa-4">
        Yakin ingin approve <b>{{ selectedItem?.Nomor }}</b
        >?<br />
        <span class="text-caption text-grey">
          Setelah di-approve, PO dapat dicetak (khususnya J08 Bordir).
        </span>
      </v-card-text>
      <v-card-actions class="pa-3 border-t">
        <v-btn variant="text" size="small" @click="showApproveDialog = false"
          >Batal</v-btn
        >
        <v-spacer />
        <v-btn
          variant="flat"
          size="small"
          color="green-darken-2"
          :loading="isApproving"
          @click="confirmApprove"
        >
          Ya, Approve
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style scoped>
/* ── Filter bar ── */
.f-grp {
  display: flex;
  align-items: center;
  gap: 5px;
}
.f-lbl {
  font-size: 11px;
  font-weight: 600;
  color: #555;
  white-space: nowrap;
}
.f-date {
  height: 30px;
  border: 1px solid #bdbdbd;
  border-radius: 4px;
  padding: 0 6px;
  font-size: 12px;
  outline: none;
  background: white;
}
.f-date:focus {
  border-color: #1565c0;
}
.f-sel {
  height: 30px;
  border: 1px solid #bdbdbd;
  border-radius: 4px;
  padding: 0 6px;
  font-size: 12px;
  outline: none;
  background: white;
  cursor: pointer;
}

/* ── Nomor cell warna (sesuai Delphi) ── */
.nomor-wait {
  background: #1565c0;
  color: white;
  padding: 2px 6px;
  border-radius: 3px;
  font-size: 11px;
  font-weight: 700;
}
.nomor-acc {
  background: #2e7d32;
  color: white;
  padding: 2px 6px;
  border-radius: 3px;
  font-size: 11px;
  font-weight: 700;
}
.nomor-tolak {
  background: #c62828;
  color: white;
  padding: 2px 6px;
  border-radius: 3px;
  font-size: 11px;
  font-weight: 700;
}

/* ── Status badge ── */
.status-proses {
  background: #e3f2fd;
  color: #1565c0;
  padding: 1px 6px;
  border-radius: 8px;
  font-size: 10px;
  font-weight: 700;
}
.status-closed {
  background: #e8f5e9;
  color: #2e7d32;
  padding: 1px 6px;
  border-radius: 8px;
  font-size: 10px;
  font-weight: 700;
}
.status-belum {
  background: #fff3e0;
  color: #e65100;
  padding: 1px 6px;
  border-radius: 8px;
  font-size: 10px;
  font-weight: 700;
}

/* ── Status barang ── */
.sb-delay {
  color: #e65100;
  font-weight: 600;
  font-size: 11px;
}
.sb-true {
  color: #2e7d32;
  font-weight: 600;
  font-size: 11px;
}
.sb-cancel {
  color: #9e9e9e;
  font-size: 11px;
}

/* ── Legend ── */
.legend {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 11px;
  color: #555;
}
.leg-item {
  display: flex;
  align-items: center;
  gap: 4px;
}
.leg-dot {
  width: 12px;
  height: 12px;
  border-radius: 2px;
  flex-shrink: 0;
}
.leg-wait {
  background: #1565c0;
}
.leg-acc {
  background: #2e7d32;
}
.leg-tolak {
  background: #c62828;
}
.leg-hapus {
  background: transparent;
  border: 1px solid #9e9e9e;
}

/* ── Alignment ── */
.tr {
  text-align: right;
  display: block;
}
.tc {
  text-align: center;
}
.mono {
  font-family: monospace;
  font-size: 11px;
  color: #1565c0;
  font-weight: 600;
}
</style>
