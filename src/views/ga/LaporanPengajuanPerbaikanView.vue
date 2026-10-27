<script setup lang="ts">
import { ref, computed, onMounted, watch } from "vue";
import { useToast } from "vue-toastification";
import BaseBrowse from "@/components/BaseBrowse.vue";
import { useBrowse } from "@/composables/useBrowse";
import {
  laporanPengajuanPerbaikanService,
  type PengajuanPerbaikanRow,
  type PengajuanPerbaikanDetailRow,
} from "@/services/ga/laporanPengajuanPerbaikanService";
import { exportExcelSingle, type ExcelColumn } from "@/utils/excelExport";
import { formatTanggal } from "@/utils/dateFormat";
import {
  IconFileDescription,
  IconFileSpreadsheet,
  IconCheck,
  IconClock,
  IconAlertCircle,
} from "@tabler/icons-vue";

const toast = useToast();

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
const filterCabang = ref("ALL");

const filterState = computed(() => ({
  tglAwal: tglAwal.value,
  tglAkhir: tglAkhir.value,
  filterCabang: filterCabang.value,
}));

const onFilterStateRestore = (val: any) => {
  if (val?.tglAwal) tglAwal.value = val.tglAwal;
  if (val?.tglAkhir) tglAkhir.value = val.tglAkhir;
  if (val?.filterCabang) filterCabang.value = val.filterCabang;
};

// ── Composable useBrowse (menuId: 621) ─────────────────────────────────
const {
  items,
  isLoading,
  selected,
  fetchData,
} = useBrowse({
  menuId: "621",
  fetchApi: async () => {
    const res = await laporanPengajuanPerbaikanService.getBrowse({
      tglAwal: tglAwal.value,
      tglAkhir: tglAkhir.value,
      cabang: filterCabang.value,
    });
    return res.data.data ?? [];
  },
});

// ── Headers Tabel Master Sesuai Delphi 7 ufrmLapJobKP ─────────────────
const headers = [
  { title: "NOMOR", key: "Nomor", width: "160px" },
  { title: "TANGGAL", key: "Tanggal", width: "135px", align: "center" as const },
  { title: "CAB", key: "Cabang", width: "70px", align: "center" as const },
  { title: "PEMOHON", key: "Pemohon", width: "140px" },
  { title: "BAGIAN", key: "Bagian", width: "130px" },
  { title: "LOKASI", key: "Lokasi", width: "150px" },
  { title: "JENIS", key: "Jenis", width: "140px" },
  { title: "KETERANGAN", key: "Keterangan", minWidth: "220px" },
  {
    title: "STATUS PENGERJAAN",
    key: "StatusPengerjaan",
    width: "150px",
    align: "center" as const,
  },
  { title: "TEKNISI", key: "Teknisi", width: "140px" },
  {
    title: "KONFIRMASI TEKNISI",
    key: "DiKonfirmasiTeknisi",
    width: "140px",
    align: "center" as const,
  },
  { title: "ESTIMASI MULAI", key: "Jadwal1", width: "120px", align: "center" as const },
  { title: "ESTIMASI SELESAI", key: "Jadwal2", width: "120px", align: "center" as const },
  { title: "TGL SELESAI", key: "TglSelesai", width: "135px", align: "center" as const },
  { title: "STATUS CLOSE", key: "IsClose", width: "110px", align: "center" as const },
];

// ── Headers Detail Expandable Row ─────────────────────────────────────
const detailHeaders = [
  { title: "ID", key: "Id", width: "50px", align: "center" as const },
  { title: "Nama Barang / Alat", key: "Nama", minWidth: "200px" },
  { title: "Spesifikasi", key: "Spesifikasi", minWidth: "180px" },
  { title: "Satuan", key: "Satuan", width: "80px", align: "center" as const },
  { title: "Qty Diajukan", key: "Qty", width: "100px", align: "right" as const },
  { title: "Verifikasi", key: "Verifikasi", width: "95px", align: "right" as const },
  { title: "Realisasi", key: "Realisasi", width: "95px", align: "right" as const },
  { title: "Terpakai", key: "Terpakai", width: "95px", align: "right" as const },
  { title: "Keterangan Status Item", key: "Keterangan", width: "150px" },
];

// ── Row Styling Sesuai Delphi cxStyle ─────────────────────────────────
// Belum = Merah, Proses = Biru, Selesai = Normal/Hijau
const rowPropsFn = (data: any) => {
  const item = data.item?.raw || data.item;
  const status = item?.StatusPengerjaan;
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
  }
  return {};
};

// ── Expanded Detail Cache ──────────────────────────────────────────────
const expanded = ref<PengajuanPerbaikanRow[]>([]);
const detailCache = ref<Record<string, PengajuanPerbaikanDetailRow[]>>({});
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
        const res =
          await laporanPengajuanPerbaikanService.getDetailByNomor(nomor);
        detailCache.value[nomor] = res.data.data || [];
      } catch {
        detailCache.value[nomor] = [];
        toast.error(`Gagal memuat rincian perbaikan ${nomor}`);
      } finally {
        const next = new Set(loadingDetails.value);
        next.delete(nomor);
        loadingDetails.value = next;
      }
    }
  }
};

// ── Export Master ke Excel ─────────────────────────────────────────────
const isExportingMaster = ref(false);

const exportColumnsMaster: ExcelColumn[] = [
  { header: "Nomor", key: "Nomor", width: 18, align: "left" },
  { header: "Tanggal", key: "Tanggal", width: 16, align: "center" },
  { header: "Cabang", key: "Cabang", width: 10, align: "center" },
  { header: "Pemohon", key: "Pemohon", width: 18, align: "left" },
  { header: "Bagian", key: "Bagian", width: 16, align: "left" },
  { header: "Lokasi", key: "Lokasi", width: 18, align: "left" },
  { header: "Jenis Pekerjaan", key: "Jenis", width: 18, align: "left" },
  { header: "Keterangan", key: "Keterangan", width: 30, align: "left" },
  { header: "Status Pengerjaan", key: "StatusPengerjaan", width: 16, align: "center" },
  { header: "Teknisi", key: "Teknisi", width: 18, align: "left" },
  { header: "Konfirmasi Teknisi", key: "DiKonfirmasiTeknisi", width: 16, align: "center" },
  { header: "Tgl Konfir Teknisi", key: "TglKonfirmasiTeknisi", width: 16, align: "center" },
  { header: "Estimasi Mulai", key: "Jadwal1", width: 14, align: "center" },
  { header: "Estimasi Selesai", key: "Jadwal2", width: 14, align: "center" },
  { header: "Tgl Selesai", key: "TglSelesai", width: 16, align: "center" },
  { header: "Status Close", key: "IsClose", width: 12, align: "center" },
  { header: "Tgl Close", key: "TglClose", width: 16, align: "center" },
];

const onExportMaster = async () => {
  const rows = items.value ?? [];
  if (!rows.length) {
    toast.warning("Tidak ada data untuk diexport.");
    return;
  }
  isExportingMaster.value = true;
  try {
    const title = `Laporan Pengajuan Perbaikan — ${tglAwal.value} s.d. ${tglAkhir.value}`;
    await exportExcelSingle(
      `Laporan_Pengajuan_Perbaikan_${tglAwal.value}_${tglAkhir.value}.xlsx`,
      "Pengajuan Perbaikan",
      exportColumnsMaster,
      rows,
      title,
    );
    toast.success("Export data berhasil.");
  } catch {
    toast.error("Gagal export Excel.");
  } finally {
    isExportingMaster.value = false;
  }
};

// ── Export Detail ke Excel ─────────────────────────────────────────────
const isExportingDetail = ref(false);

const exportColumnsDetail: ExcelColumn[] = [
  { header: "Nomor Job", key: "Nomor", width: 18, align: "left" },
  { header: "Tanggal", key: "Tanggal", width: 16, align: "center" },
  { header: "Cabang", key: "Cabang", width: 10, align: "center" },
  { header: "Pemohon", key: "Pemohon", width: 18, align: "left" },
  { header: "Bagian", key: "Bagian", width: 16, align: "left" },
  { header: "Lokasi", key: "Lokasi", width: 18, align: "left" },
  { header: "Jenis Pekerjaan", key: "JenisPekerjaan", width: 18, align: "left" },
  { header: "Nama Barang / Alat", key: "NamaBarang", width: 25, align: "left" },
  { header: "Spesifikasi", key: "Spesifikasi", width: 25, align: "left" },
  { header: "Satuan", key: "Satuan", width: 10, align: "center" },
  { header: "Qty Diajukan", key: "Qty", width: 12, align: "right" },
  { header: "Qty Verifikasi", key: "Verifikasi", width: 12, align: "right" },
  { header: "Qty Realisasi", key: "Realisasi", width: 12, align: "right" },
  { header: "Qty Terpakai", key: "Terpakai", width: 12, align: "right" },
  { header: "Status Item", key: "StatusItem", width: 16, align: "center" },
  { header: "Status Pengerjaan", key: "StatusPengerjaan", width: 16, align: "center" },
  { header: "Teknisi", key: "Teknisi", width: 18, align: "left" },
];

const onExportDetail = async () => {
  isExportingDetail.value = true;
  try {
    const res = await laporanPengajuanPerbaikanService.getAllDetail({
      tglAwal: tglAwal.value,
      tglAkhir: tglAkhir.value,
      cabang: filterCabang.value,
    });
    const rows = res.data.data ?? [];
    if (!rows.length) {
      toast.warning("Tidak ada rincian detail barang untuk diexport pada periode ini.");
      return;
    }
    const title = `Laporan Rincian Detail Pengajuan Perbaikan — ${tglAwal.value} s.d. ${tglAkhir.value}`;
    await exportExcelSingle(
      `Laporan_Pengajuan_Perbaikan_Detail_${tglAwal.value}_${tglAkhir.value}.xlsx`,
      "Detail Perbaikan",
      exportColumnsDetail,
      rows,
      title,
    );
    toast.success("Export detail berhasil.");
  } catch (err: any) {
    toast.error(err.response?.data?.message || "Gagal export detail Excel.");
  } finally {
    isExportingDetail.value = false;
  }
};

let timer: ReturnType<typeof setTimeout> | null = null;
watch([tglAwal, tglAkhir, filterCabang], () => {
  if (timer) clearTimeout(timer);
  timer = setTimeout(fetchData, 400);
});

onMounted(() => {
  fetchData();
});
</script>

<template>
  <BaseBrowse
    title="Browse Pengajuan Perbaikan"
    menu-id="621"
    storage-id="621"
    :icon="IconFileDescription"
    :headers="headers"
    :items="items ?? []"
    :is-loading="isLoading"
    item-value="Nomor"
    :can-insert="false"
    :can-edit="false"
    :can-delete="false"
    :can-export="true"
    :show-expand="true"
    :expanded="expanded"
    :selected="selected"
    :row-props-fn="rowPropsFn"
    :filter-state="filterState"
    search-placeholder="Cari nomor, pemohon, bagian, lokasi, keterangan..."
    @refresh="fetchData"
    @export="onExportMaster"
    @update:expanded="onUpdateExpanded"
    @update:selected="(val) => (selected = val)"
    @update:filter-state="onFilterStateRestore"
  >
    <!-- Tombol Khusus: Export Detail Sesuai Permintaan User -->
    <template #extra-actions>
      <v-btn
        size="small"
        variant="flat"
        color="teal-darken-1"
        :loading="isExportingDetail"
        @click="onExportDetail"
      >
        <template #prepend>
          <span class="d-flex align-center">
            <IconFileSpreadsheet :size="15" :stroke-width="1.8" />
          </span>
        </template>
        Export Detail
      </v-btn>
    </template>

    <!-- Filter Kiri: Tanggal & Legend Status Pengerjaan (Delphi cxStyle) -->
    <template #filter-left>
      <div class="f-grp">
        <label class="f-lbl">Dari</label>
        <input type="date" v-model="tglAwal" class="f-date" />
      </div>
      <div class="f-grp">
        <label class="f-lbl">S/D</label>
        <input type="date" v-model="tglAkhir" class="f-date" />
      </div>

      <!-- Keterangan Legend Status Pengerjaan (Delphi cxStyle) -->
      <div class="status-legend-bar ml-4">
        <span class="legend-title">Status:</span>
        <div class="legend-item">
          <span class="legend-box box-red"></span>
          <span>Belum</span>
        </div>
        <div class="legend-item">
          <span class="legend-box box-blue"></span>
          <span>Proses</span>
        </div>
        <div class="legend-item">
          <span class="legend-box box-green"></span>
          <span>Selesai</span>
        </div>
      </div>
    </template>

    <!-- Custom Render Kolom Nomor -->
    <template #item.Nomor="{ item }">
      <span class="font-weight-bold font-mono text-primary">
        {{ item.Nomor }}
      </span>
    </template>

    <!-- Custom Render Kolom Tanggal -->
    <template #item.Tanggal="{ item }">
      {{ item.Tanggal ? formatTanggal(item.Tanggal) : "—" }}
    </template>

    <!-- Custom Render Status Pengerjaan -->
    <template #item.StatusPengerjaan="{ item }">
      <v-chip
        v-if="item.StatusPengerjaan === 'Belum'"
        size="x-small"
        color="error"
        variant="flat"
        class="font-weight-bold"
      >
        <template #prepend>
          <IconAlertCircle :size="12" class="mr-1" />
        </template>
        Belum
      </v-chip>
      <v-chip
        v-else-if="item.StatusPengerjaan === 'Proses'"
        size="x-small"
        color="primary"
        variant="flat"
        class="font-weight-bold"
      >
        <template #prepend>
          <IconClock :size="12" class="mr-1" />
        </template>
        Proses
      </v-chip>
      <v-chip
        v-else-if="item.StatusPengerjaan === 'Selesai'"
        size="x-small"
        color="success"
        variant="flat"
        class="font-weight-bold"
      >
        <template #prepend>
          <IconCheck :size="12" class="mr-1" />
        </template>
        Selesai
      </v-chip>
      <span v-else>{{ item.StatusPengerjaan }}</span>
    </template>

    <!-- Custom Render Konfirmasi Teknisi -->
    <template #item.DiKonfirmasiTeknisi="{ item }">
      <v-chip
        size="x-small"
        :color="item.DiKonfirmasiTeknisi === 'Sudah' ? 'teal' : 'grey'"
        variant="tonal"
      >
        {{ item.DiKonfirmasiTeknisi }}
      </v-chip>
    </template>

    <!-- Custom Render Tanggal Estimasi -->
    <template #item.Jadwal1="{ item }">
      {{ item.Jadwal1 ? formatTanggal(item.Jadwal1) : "—" }}
    </template>

    <template #item.Jadwal2="{ item }">
      {{ item.Jadwal2 ? formatTanggal(item.Jadwal2) : "—" }}
    </template>

    <template #item.TglSelesai="{ item }">
      {{ item.TglSelesai ? formatTanggal(item.TglSelesai) : "—" }}
    </template>

    <!-- Custom Render Close -->
    <template #item.IsClose="{ item }">
      <v-chip
        size="x-small"
        :color="item.IsClose === 'Sudah' ? 'success' : 'blue-grey'"
        variant="outlined"
      >
        {{ item.IsClose }}
      </v-chip>
    </template>

    <!-- Expanded Row: Detail Barang / Alat Perbaikan -->
    <template #detail="{ item }">
      <div v-if="loadingDetails.has(item.Nomor)" class="detail-loading">
        <v-progress-circular indeterminate size="20" color="primary" />
        <span>Memuat rincian barang perbaikan...</span>
      </div>

      <div v-else-if="detailCache[item.Nomor]?.length" class="detail-wrapper">
        <div class="detail-title">
          Rincian Kebutuhan Barang / Alat ({{ detailCache[item.Nomor].length }} item):
        </div>
        <table class="detail-table">
          <thead>
            <tr>
              <th
                v-for="h in detailHeaders"
                :key="h.key"
                :style="{ width: h.width, textAlign: (h.align as any) || 'left' }"
              >
                {{ h.title }}
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(row, idx) in detailCache[item.Nomor]" :key="idx">
              <td class="text-center font-mono">{{ row.Id || idx + 1 }}</td>
              <td class="font-weight-medium">{{ row.Nama }}</td>
              <td>{{ row.Spesifikasi || "—" }}</td>
              <td class="text-center">{{ row.Satuan || "—" }}</td>
              <td class="text-right">{{ Number(row.Qty).toLocaleString("id-ID") }}</td>
              <td class="text-right">{{ Number(row.Verifikasi).toLocaleString("id-ID") }}</td>
              <td class="text-right">{{ Number(row.Realisasi).toLocaleString("id-ID") }}</td>
              <td class="text-right">{{ Number(row.Terpakai).toLocaleString("id-ID") }}</td>
              <td>
                <v-chip
                  v-if="row.Keterangan"
                  size="x-small"
                  :color="
                    row.Keterangan === 'Ditolak'
                      ? 'error'
                      : row.Keterangan === 'Selesai'
                        ? 'success'
                        : 'indigo'
                  "
                  variant="tonal"
                >
                  {{ row.Keterangan }}
                </v-chip>
                <span v-else>—</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-else class="detail-empty">
        Tidak ada rincian barang/alat terdaftar untuk perbaikan ini.
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

.font-mono {
  font-family: monospace;
}

/* ── Keterangan Legend Status Pengerjaan ── */
.status-legend-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 11px;
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
  gap: 5px;
  font-weight: 500;
  color: #1f2937;
}
.legend-box {
  width: 12px;
  height: 12px;
  border-radius: 3px;
  display: inline-block;
}
.box-red {
  background-color: #d32f2f;
}
.box-blue {
  background-color: #1976d2;
}
.box-green {
  background-color: #2e7d32;
}

/* ── Warna Font Record Berdasarkan Status Pengerjaan (Delphi cxStyle) ── */
:deep(.v-data-table tbody tr.row-status-belum td),
:deep(.v-data-table tbody tr.row-status-belum) {
  color: #d32f2f !important;
}

:deep(.v-data-table tbody tr.row-status-proses td),
:deep(.v-data-table tbody tr.row-status-proses) {
  color: #1976d2 !important;
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
  padding: 6px 10px;
  border: 1px solid #e0e0e0;
}
.detail-table td {
  padding: 6px 10px;
  border: 1px solid #eee;
  color: #333;
}
</style>
