<script setup lang="ts">
import { ref, computed, onMounted, watch } from "vue";
import { useRouter } from "vue-router";
import { useToast } from "vue-toastification";
import { useAuthStore } from "@/stores/authStore";
import BaseBrowse from "@/components/BaseBrowse.vue";
import { useBrowse } from "@/composables/useBrowse";
import {
  permintaanDriverService,
  type PermintaanDriverRow,
  type PermintaanDriverDetailRow,
} from "@/services/penjualan/permintaanDriverService";
import { exportExcelSingle, type ExcelColumn } from "@/utils/excelExport";
import { formatTanggal } from "@/utils/dateFormat";
import { IconSteeringWheel, IconTrash, IconEye, IconBan } from "@tabler/icons-vue";

const router = useRouter();
const toast = useToast();
const authStore = useAuthStore();

// ── Helpers Tanggal ──────────────────────────────────────────────────
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

const tglAwal = ref(firstOfMonth());
const tglAkhir = ref(todayLocal());

const filterState = computed(() => ({
  tglAwal: tglAwal.value,
  tglAkhir: tglAkhir.value,
}));

const onFilterStateRestore = (val: any) => {
  if (val?.tglAwal) tglAwal.value = val.tglAwal;
  if (val?.tglAkhir) tglAkhir.value = val.tglAkhir;
};

// ── Composable useBrowse ──────────────────────────────────────────────
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
} = useBrowse({
  menuId: "189",
  fetchApi: async () => {
    const res = await permintaanDriverService.getBrowse({
      tglAwal: tglAwal.value,
      tglAkhir: tglAkhir.value,
    });
    return res.data.data ?? [];
  },
});

const selectedItem = computed(() => (selected.value[0] as unknown as PermintaanDriverRow) ?? null);

// ── Warna Font Record Berdasarkan Status Pengerjaan (Delphi cxStyle) ────
// Belum = Merah, Proses = Biru, Sudah = Hitam
const rowPropsFn = (data: any) => {
  const item = data.item?.raw || data.item;
  const status = item?.IsClosed;
  if (status === "Belum") {
    return {
      class: "row-status-belum",
      style: "color: #d32f2f !important;",
    };
  } else if (status === "Proses") {
    return {
      class: "row-status-proses",
      style: "color: #1976d2 !important;",
    };
  } else if (status === "Sudah") {
    return {
      class: "row-status-sudah",
      style: "color: #000000 !important;",
    };
  }
  return {};
};

// ── Headers Tabel Master ──────────────────────────────────────────────
const headers = [
  { title: "Nomor", key: "Nomor", width: "140px" },
  { title: "Tanggal", key: "Tanggal", width: "100px" },
  { title: "Jam Minta", key: "Jam_Minta", width: "90px" },
  { title: "Peminta", key: "Peminta", width: "90px" },
  { title: "Pengambilan", key: "Pengambilan", width: "130px" },
  { title: "Customer / Tujuan", key: "Customer", width: "160px" },
  { title: "PIC", key: "PIC", width: "120px" },
  { title: "Uraian", key: "Uraian", width: "220px" },
  { title: "Status", key: "Status", width: "110px" },
  { title: "Tipe Jadwal", key: "Tipe", width: "130px" },
  { title: "Tgl Kerja", key: "TglKerja", width: "100px" },
  { title: "Jam Kerja", key: "JamKerja", width: "90px" },
  { title: "Hari Kerja", key: "Hari_Kerja", width: "110px" },
  { title: "Driver", key: "Driver", width: "110px" },
  { title: "Status Pengerjaan", key: "IsClosed", width: "110px" },
];

// ── Headers Detail ────────────────────────────────────────────────────
const detailHeaders = [
  { title: "No", key: "No_urut", width: "50px" },
  { title: "SPK / Memo", key: "SPK", width: "170px" },
  { title: "Keterangan", key: "Keterangan", width: "350px" },
  { title: "Penerima", key: "Penerima", width: "150px" },
];

// ── Expanded Detail Cache ──────────────────────────────────────────────
const expanded = ref<PermintaanDriverRow[]>([]);
const detailCache = ref<Record<string, PermintaanDriverDetailRow[]>>({});
const loadingDetails = ref<Set<string>>(new Set());

const onUpdateExpanded = async (val: any[]) => {
  const nomors: string[] = val.map((v) =>
    typeof v === "object" ? v.Nomor : v,
  );
  expanded.value = val;

  for (const nomor of nomors) {
    if (!detailCache.value[nomor]) {
      loadingDetails.value = new Set([...loadingDetails.value, nomor]);
      try {
        const res = await permintaanDriverService.getDetail(nomor);
        detailCache.value[nomor] = res.data.data || [];
      } catch {
        detailCache.value[nomor] = [];
        toast.error(`Gagal memuat detail permintaan ${nomor}`);
      } finally {
        const next = new Set(loadingDetails.value);
        next.delete(nomor);
        loadingDetails.value = next;
      }
    }
  }
};

// ── Navigasi Form ─────────────────────────────────────────────────────
const goNew = () => {
  router.push({ name: "PermintaanDriverCreate" });
};

const goEdit = (item: { Nomor: string }) => {
  router.push({
    name: "PermintaanDriverEdit",
    params: { nomor: item.Nomor },
  });
};

// ── Hapus / Batalkan Data ──────────────────────────────────────────────
const onDelete = async (item: { Nomor: string; Peminta?: string; IsClosed?: string }) => {
  const currentUser = (authStore.user?.kode || "").toUpperCase();
  const isOwner = (item.Peminta || "").toUpperCase() === currentUser;
  const isAdmin = authStore.user?.bagian?.toUpperCase() === "IT" || authStore.isAdmin;

  if (!isOwner && !isAdmin) {
    toast.warning("Anda hanya bisa membatalkan permintaan driver milik Anda sendiri.");
    return;
  }

  if (item.IsClosed === "Sudah") {
    toast.warning("Permintaan driver ini sudah selesai dan tidak bisa dibatalkan.");
    return;
  }

  try {
    await permintaanDriverService.deleteData(item.Nomor);
    toast.success(`Permintaan Driver ${item.Nomor} berhasil dibatalkan.`);
    delete detailCache.value[item.Nomor];
    clearSelection();
    await fetchData();
  } catch (err: any) {
    toast.error(err.response?.data?.message || "Gagal membatalkan permintaan driver.");
  }
};

// ── Export Excel ───────────────────────────────────────────────────────
const isExporting = ref(false);

const exportColumns: ExcelColumn[] = [
  { header: "Nomor", key: "Nomor", width: 18, align: "left" },
  { header: "Tanggal", key: "Tanggal", width: 12, align: "center" },
  { header: "Jam Minta", key: "Jam_Minta", width: 10, align: "center" },
  { header: "Peminta", key: "Peminta", width: 12, align: "left" },
  { header: "Pengambilan", key: "Pengambilan", width: 20, align: "left" },
  { header: "Customer / Tujuan", key: "Customer", width: 25, align: "left" },
  { header: "PIC", key: "PIC", width: 18, align: "left" },
  { header: "Uraian", key: "Uraian", width: 35, align: "left" },
  { header: "Status", key: "Status", width: 14, align: "center" },
  { header: "Tipe Jadwal", key: "Tipe", width: 16, align: "center" },
  { header: "Tgl Kerja", key: "TglKerja", width: 12, align: "center" },
  { header: "Jam Kerja", key: "JamKerja", width: 10, align: "center" },
  { header: "Hari Kerja", key: "Hari_Kerja", width: 14, align: "center" },
  { header: "Driver", key: "Driver", width: 16, align: "left" },
  { header: "Status Pengerjaan", key: "IsClosed", width: 16, align: "center" },
];

const onExport = async () => {
  const rows = items.value ?? [];
  if (!rows.length) {
    toast.warning("Tidak ada data untuk diexport.");
    return;
  }
  isExporting.value = true;
  try {
    const title = `Permintaan Driver — ${tglAwal.value} s.d. ${tglAkhir.value}`;
    await exportExcelSingle(
      `Permintaan_Driver_${tglAwal.value}_${tglAkhir.value}.xlsx`,
      "Permintaan Driver",
      exportColumns,
      rows,
      title,
    );
    toast.success("Export berhasil.");
  } catch {
    toast.error("Gagal export Excel.");
  } finally {
    isExporting.value = false;
  }
};

// Re-fetch saat filter berubah
let timer: ReturnType<typeof setTimeout> | null = null;
watch([tglAwal, tglAkhir], () => {
  if (timer) clearTimeout(timer);
  timer = setTimeout(fetchData, 400);
});

onMounted(() => {
  fetchData();
});
</script>

<template>
  <BaseBrowse
    title="Permintaan Driver"
    menu-id="189"
    storage-id="189"
    :icon="IconSteeringWheel"
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
    edit-text="Lihat"
    :edit-icon="IconEye"
    delete-text="Batal"
    :delete-icon="IconBan"
    :filter-state="filterState"
    search-placeholder="Cari nomor, peminta, customer, PIC, uraian..."
    @refresh="fetchData"
    @add="goNew"
    @edit="goEdit"
    @delete="onDelete"
    @export="onExport"
    @update:expanded="onUpdateExpanded"
    @update:selected="(val) => (selected = val)"
    @update:filter-state="onFilterStateRestore"
  >
    <!-- Filter Kiri: Tanggal & Keterangan Status Pengerjaan -->
    <template #filter-left>
      <div class="f-grp">
        <label class="f-lbl">Dari</label>
        <input type="date" v-model="tglAwal" class="f-date" />
      </div>
      <div class="f-grp">
        <label class="f-lbl">S/D</label>
        <input type="date" v-model="tglAkhir" class="f-date" />
      </div>

      <!-- Keterangan Status Pengerjaan (Image 1) -->
      <div class="status-legend-bar ml-4">
        <span class="legend-title">Status Pengerjaan:</span>
        <div class="legend-item">
          <span class="legend-box box-red"></span>
          <span>Belum</span>
        </div>
        <div class="legend-item">
          <span class="legend-box box-blue"></span>
          <span>Proses</span>
        </div>
        <div class="legend-item">
          <span class="legend-box box-black"></span>
          <span>Sudah</span>
        </div>
      </div>
    </template>

    <!-- Custom Render Kolom Tanggal -->
    <template #item.Tanggal="{ item }">
      {{ formatTanggal(item.Tanggal) }}
    </template>

    <template #item.TglKerja="{ item }">
      {{ item.TglKerja ? formatTanggal(item.TglKerja) : "—" }}
    </template>

    <!-- Custom Render Status Prioritas -->
    <template #item.Status="{ item }">
      <v-chip
        v-if="item.Status === 'Top Urgent'"
        size="x-small"
        color="error"
        variant="flat"
        class="font-weight-bold"
      >
        Top Urgent
      </v-chip>
      <v-chip
        v-else-if="item.Status === 'Urgent'"
        size="x-small"
        color="amber-darken-3"
        variant="flat"
      >
        Urgent
      </v-chip>
      <span v-else class="text-caption text-medium-emphasis">Biasa</span>
    </template>

    <!-- Custom Render Tipe Jadwal -->
    <template #item.Tipe="{ item }">
      <v-chip
        v-if="item.Tipe === 'Keterlaluan'"
        size="x-small"
        color="purple-darken-2"
        variant="tonal"
      >
        Keterlaluan
      </v-chip>
      <v-chip
        v-else-if="item.Tipe === 'Tidak Terjadwal'"
        size="x-small"
        color="blue-grey"
        variant="tonal"
      >
        Tidak Terjadwal
      </v-chip>
      <v-chip v-else size="x-small" color="primary" variant="tonal">
        Terjadwal
      </v-chip>
    </template>

    <!-- Custom Render Hari Kerja -->
    <template #item.Hari_Kerja="{ item }">
      <v-chip
        v-if="item.Hari_Kerja"
        size="x-small"
        color="indigo"
        variant="flat"
      >
        {{ item.Hari_Kerja }}
      </v-chip>
      <span v-else class="text-caption text-disabled">—</span>
    </template>

    <!-- Custom Render Status Pengerjaan (IsClosed) -->
    <template #item.IsClosed="{ item }">
      <span
        v-if="item.IsClosed === 'Belum'"
        class="font-weight-bold"
        style="color: #d32f2f"
      >
        Belum
      </span>
      <span
        v-else-if="item.IsClosed === 'Proses'"
        class="font-weight-bold"
        style="color: #1976d2"
      >
        Proses
      </span>
      <span
        v-else-if="item.IsClosed === 'Sudah'"
        class="font-weight-bold"
        style="color: #000000"
      >
        Sudah
      </span>
      <v-chip
        v-else-if="item.IsClosed === 'Batal' || item.IsClosed === 'Cancel'"
        size="x-small"
        color="grey"
        variant="tonal"
      >
        {{ item.IsClosed }}
      </v-chip>
      <span v-else>{{ item.IsClosed }}</span>
    </template>

    <!-- Expanded Row: Detail Barang / Dokumen -->
    <template #detail="{ item }">
      <div v-if="loadingDetails.has(item.Nomor)" class="detail-loading">
        <v-progress-circular indeterminate size="20" color="primary" />
        <span>Memuat barang yang dibawa...</span>
      </div>

      <div v-else-if="detailCache[item.Nomor]?.length" class="detail-wrapper">
        <div class="detail-title">
          Barang / Dokumen yang dibawa ({{ detailCache[item.Nomor].length }} item):
        </div>
        <table class="detail-table">
          <thead>
            <tr>
              <th
                v-for="h in detailHeaders"
                :key="h.key"
                :style="{ width: h.width }"
              >
                {{ h.title }}
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(row, idx) in detailCache[item.Nomor]" :key="idx">
              <td class="text-center">{{ row.No_urut }}</td>
              <td class="font-weight-medium">{{ row.SPK || "—" }}</td>
              <td>{{ row.Keterangan }}</td>
              <td>{{ row.Penerima || "—" }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-else class="detail-empty">
        Tidak ada rincian barang/dokumen terdaftar untuk permintaan ini.
      </div>
    </template>
  </BaseBrowse>
</template>

<style scoped>
.f-grp {
  display: flex;
  align-items: center;
  gap: 6px;
}
.f-lbl {
  font-size: 11px;
  font-weight: 600;
  color: #555;
  white-space: nowrap;
}
.f-date {
  font-size: 11px;
  padding: 3px 6px;
  border: 1px solid #ccc;
  border-radius: 4px;
  outline: none;
  background-color: #fff;
  height: 26px;
}
.f-date:focus {
  border-color: #1565c0;
}

.detail-wrapper {
  padding: 10px 16px;
  background-color: #fcfcfc;
}
.detail-title {
  font-size: 12px;
  font-weight: 700;
  color: #37474f;
  margin-bottom: 6px;
}
.detail-loading {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  font-size: 12px;
  color: #666;
}
.detail-empty {
  padding: 10px 16px;
  font-size: 11px;
  font-style: italic;
  color: #888;
}
.detail-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
  background-color: #fff;
  border: 1px solid #e0e0e0;
}
.detail-table th {
  background-color: #f5f5f5;
  color: #424242;
  font-weight: 600;
  text-align: left;
  padding: 6px 10px;
  border: 1px solid #e0e0e0;
}
.detail-table td {
  padding: 6px 10px;
  border: 1px solid #eee;
  color: #333;
}

/* ── Keterangan Legend Status Pengerjaan (Image 1) ── */
.status-legend-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 12px;
  padding-left: 14px;
  border-left: 1px solid #d1d5db;
}
.legend-title {
  font-weight: 600;
  color: #4b5563;
}
.legend-item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-weight: 500;
  color: #1f2937;
}
.legend-box {
  width: 14px;
  height: 14px;
  border-radius: 3px;
  display: inline-block;
}
.box-red {
  background-color: #d32f2f;
}
.box-blue {
  background-color: #1976d2;
}
.box-black {
  background-color: #000000;
}

/* ── Warna Font Record Berdasarkan Status Pengerjaan ── */
:deep(.v-data-table tbody tr.row-status-belum td),
:deep(.v-data-table tbody tr.row-status-belum) {
  color: #d32f2f !important;
}

:deep(.v-data-table tbody tr.row-status-proses td),
:deep(.v-data-table tbody tr.row-status-proses) {
  color: #1976d2 !important;
}

:deep(.v-data-table tbody tr.row-status-sudah td),
:deep(.v-data-table tbody tr.row-status-sudah) {
  color: #000000 !important;
}
</style>
