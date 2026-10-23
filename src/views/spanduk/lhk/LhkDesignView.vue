<script setup lang="ts">
import { ref, watch, onMounted } from "vue";
import { useToast } from "vue-toastification";
import { useRouter } from "vue-router";
import BaseBrowse from "@/components/BaseBrowse.vue";
import { useBrowse } from "@/composables/useBrowse";
import { exportExcelSingle, type ExcelColumn } from "@/utils/excelExport";
import * as lhkService from "@/services/spanduk/lhk/lhkDesignService";
import type {
  LhkDesignRow,
  LhkDesignKomponenRow,
  LhkDesignStatusRow,
} from "@/services/spanduk/lhk/lhkDesignService";
import { IconSkull, IconFileExport } from "@tabler/icons-vue";
import { formatTanggal } from "@/utils/dateFormat";

interface ExportMasterRow {
  Nomor: string;
  Nama_SPK: string;
  Tanggal_SPK: string;
  Dateline: string;
  Tanggal_LHK: string;
  Status_Terakhir: string;
  User_Create: string;
}

interface ExportDetailRow {
  Nomor: string;
  Nama_SPK: string;
  Bahan: string;
  Panjang_Output: number;
  Jumlah_Output: number;
  Total_Output: number;
  Tinta_C: number;
  Tinta_M: number;
  Tinta_Y: number;
  Tinta_K: number;
  Mesin: string;
  Keterangan: string;
}

const toast = useToast();
const router = useRouter();

// --- STATE FILTER: default awal bulan s.d. hari ini ---
const d = new Date();

const toLocalDateStr = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const firstDay = toLocalDateStr(new Date(d.getFullYear(), d.getMonth(), 1));
const today = toLocalDateStr(d);

const filterState = ref({
  dtAwal: firstDay,
  dtAkhir: today,
});

// --- DETAIL: dimuat sekali untuk seluruh periode, dikelompokkan per nomor ---
const komponenMap = ref<Record<string, LhkDesignKomponenRow[]>>({});
const statusMap = ref<Record<string, LhkDesignStatusRow[]>>({});
const expandedRows = ref<unknown[]>([]);

const muatData = async (): Promise<LhkDesignRow[]> => {
  const { dtAwal, dtAkhir } = filterState.value;
  if (!dtAwal || !dtAkhir) {
    toast.warning("Periode tanggal harus diisi.");
    return [];
  }
  if (dtAwal > dtAkhir) {
    toast.warning("Tanggal awal tidak boleh lebih besar dari tanggal akhir.");
    return [];
  }

  const [master, komponen, status] = await Promise.all([
    lhkService.getBrowse(dtAwal, dtAkhir),
    lhkService.getDetail(dtAwal, dtAkhir),
    lhkService.getStatus(dtAwal, dtAkhir),
  ]);

  const petaKomponen: Record<string, LhkDesignKomponenRow[]> = {};
  for (const row of komponen) {
    (petaKomponen[row.Nomor] ??= []).push(row);
  }
  const petaStatus: Record<string, LhkDesignStatusRow[]> = {};
  for (const row of status) {
    (petaStatus[row.Nomor] ??= []).push(row);
  }
  komponenMap.value = petaKomponen;
  statusMap.value = petaStatus;
  expandedRows.value = [];
  return master;
};

// --- BROWSE SETUP ---
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
} = useBrowse<LhkDesignRow>({
  menuId: "4",
  fetchApi: muatData,
  immediate: false, // dipanggil manual setelah mount
});

const baseBrowseRef = ref<InstanceType<typeof BaseBrowse> | null>(null);

const headers = [
  { title: "Nomor SPK/MAP", key: "Nomor", width: "170px" },
  { title: "Nama SPK", key: "Nama_SPK", width: "280px" },
  { title: "Tgl SPK", key: "Tanggal_SPK", width: "110px", align: "center" },
  { title: "Dateline", key: "Dateline", width: "110px", align: "center" },
  { title: "Tgl LHK", key: "Tanggal_LHK", width: "110px", align: "center" },
  { title: "Status Terakhir", key: "Status_Terakhir", width: "140px" },
  { title: "User", key: "User_Create", width: "100px" },
];

const NUM = "#,##0.00";

const kolomMaster: ExcelColumn[] = [
  { header: "Nomor SPK/MAP", key: "Nomor", width: 20 },
  { header: "Nama SPK", key: "Nama_SPK", width: 36 },
  { header: "Tgl SPK", key: "Tanggal_SPK", width: 14, align: "center" },
  { header: "Dateline", key: "Dateline", width: 14, align: "center" },
  { header: "Tgl LHK", key: "Tanggal_LHK", width: 14, align: "center" },
  { header: "Status Terakhir", key: "Status_Terakhir", width: 18 },
  { header: "User", key: "User_Create", width: 12 },
];

const kolomDetail: ExcelColumn[] = [
  { header: "Nomor SPK/MAP", key: "Nomor", width: 20 },
  { header: "Nama SPK", key: "Nama_SPK", width: 36 },
  { header: "Bahan", key: "Bahan", width: 28 },
  {
    header: "Panjang Output",
    key: "Panjang_Output",
    width: 15,
    align: "right",
    numFmt: NUM,
  },
  {
    header: "Jumlah Output",
    key: "Jumlah_Output",
    width: 14,
    align: "right",
    numFmt: NUM,
  },
  {
    header: "Total Output",
    key: "Total_Output",
    width: 14,
    align: "right",
    numFmt: NUM,
  },
  { header: "C", key: "Tinta_C", width: 8, align: "right", numFmt: NUM },
  { header: "M", key: "Tinta_M", width: 8, align: "right", numFmt: NUM },
  { header: "Y", key: "Tinta_Y", width: 8, align: "right", numFmt: NUM },
  { header: "K", key: "Tinta_K", width: 8, align: "right", numFmt: NUM },
  { header: "Mesin", key: "Mesin", width: 18 },
  { header: "Keterangan", key: "Keterangan", width: 36 },
];

// Data master yang sedang tampil (ikut search + filter kolom BaseBrowse)
const dataTampil = (): LhkDesignRow[] =>
  baseBrowseRef.value?.getFilteredItems() ?? items.value ?? [];

onMounted(() => fetchData());

watch(() => filterState.value.dtAwal, fetchData);
watch(() => filterState.value.dtAkhir, fetchData);

// --- FORMAT ---
const selesai = (status: string | null) =>
  (status ?? "").trim().toUpperCase() === "DONE";

// Angka bila bisa dibaca sebagai angka, selain itu tampil apa adanya
const angkaAtauTeks = (v: number | string | null): string => {
  if (v === null || v === undefined || v === "") {
    return "-";
  }
  const n = Number(v);
  return Number.isNaN(n)
    ? String(v)
    : n.toLocaleString("id-ID", { maximumFractionDigits: 2 });
};

const angkaExcel = (v: number | string | null) => Number(v) || 0;

const fmtWaktu = (v: string | null): string => {
  if (!v) {
    return "-";
  }
  const dt = new Date(v);
  if (Number.isNaN(dt.getTime())) {
    return String(v);
  }
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(dt.getDate())}-${p(dt.getMonth() + 1)}-${dt.getFullYear()} ${p(dt.getHours())}:${p(dt.getMinutes())}`;
};

// --- HANDLERS ---
const onAdd = () => {
  router.push({ name: "SpandukLhkDesignCreate" });
};

const onEdit = (item: LhkDesignRow) => {
  if (!item?.Nomor) {
    return;
  }
  router.push({
    name: "SpandukLhkDesignEdit",
    params: { nomor: item.Nomor },
  });
};

const onDelete = async (item: LhkDesignRow) => {
  try {
    await lhkService.remove(item.Nomor);
    toast.success(`LHK Design ${item.Nomor} berhasil dihapus.`);
    fetchData();
  } catch (e) {
    toast.error(lhkService.pesanError(e, "Gagal menghapus data."));
  }
};

// --- EXPORT ---
const exportMaster = () =>
  exportToExcel("LHK_Design_Header", {
    columns: kolomMaster,
    getData: (): ExportMasterRow[] =>
      dataTampil().map((r) => ({
        Nomor: r.Nomor,
        Nama_SPK: r.Nama_SPK ?? "",
        Tanggal_SPK: formatTanggal(r.Tanggal_SPK),
        Dateline: formatTanggal(r.Dateline),
        Tanggal_LHK: formatTanggal(r.Tanggal_LHK),
        Status_Terakhir: r.Status_Terakhir ?? "",
        User_Create: r.User_Create ?? "",
      })),
  });

// Hanya komponen dari LHK yang sedang tampil di grid
const exportDetail = async () => {
  if (!canExport.value) {
    return toast.error("Akses ditolak: Anda tidak memiliki izin untuk export.");
  }

  const master = dataTampil();
  if (master.length === 0) {
    return toast.warning("Tidak ada data untuk diexport.");
  }

  const rows: ExportDetailRow[] = [];
  for (const item of master) {
    for (const r of komponenMap.value[item.Nomor] ?? []) {
      rows.push({
        Nomor: item.Nomor,
        Nama_SPK: item.Nama_SPK ?? "",
        Bahan: r.Bahan ?? "",
        Panjang_Output: angkaExcel(r.Panjang_Output),
        Jumlah_Output: angkaExcel(r.Jumlah_Output),
        Total_Output: angkaExcel(r.Total_Output),
        Tinta_C: angkaExcel(r.Tinta_C),
        Tinta_M: angkaExcel(r.Tinta_M),
        Tinta_Y: angkaExcel(r.Tinta_Y),
        Tinta_K: angkaExcel(r.Tinta_K),
        Mesin: r.Mesin ?? "",
        Keterangan: r.Keterangan ?? "",
      });
    }
  }

  if (rows.length === 0) {
    return toast.warning("Tidak ada komponen pada data yang tampil.");
  }

  try {
    await exportExcelSingle(
      `Export_Detail_LHK_Design_${today}.xlsx`,
      "Detail LHK Design",
      kolomDetail,
      rows,
    );
    toast.success("Berhasil export detail LHK Design.");
  } catch (e) {
    console.error(e);
    toast.error("Terjadi kesalahan saat mengekspor detail LHK Design.");
  }
};
</script>

<template>
  <BaseBrowse
    ref="baseBrowseRef"
    title="LHK Design"
    menu-id="4"
    storage-id="spanduk-lhk-design"
    :icon="IconSkull"
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
    @add="onAdd"
    @edit="onEdit"
    @delete="onDelete"
    @refresh="fetchData"
    @export="exportMaster"
    show-expand
    v-model:expanded="expandedRows"
  >
    <template #filter-left>
      <div class="f-group">
        <span class="f-label">Tanggal LHK</span>
        <input type="date" v-model="filterState.dtAwal" class="f-date" />
        <span class="f-sep">s/d</span>
        <input type="date" v-model="filterState.dtAkhir" class="f-date" />
      </div>
    </template>

    <template #item.Tanggal_SPK="{ item }">
      {{ formatTanggal(item.Tanggal_SPK) }}
    </template>
    <template #item.Dateline="{ item }">
      {{ formatTanggal(item.Dateline) }}
    </template>
    <template #item.Tanggal_LHK="{ item }">
      {{ formatTanggal(item.Tanggal_LHK) }}
    </template>

    <template #item.Status_Terakhir="{ item }">
      <span :class="selesai(item.Status_Terakhir) ? 'st-done' : 'st-open'">
        {{ item.Status_Terakhir || "-" }}
      </span>
    </template>

    <!-- Detail Expand -->
    <template #detail="{ item }">
      <div class="expand-wrap">
        <div class="expand-title mb-2">Komponen - {{ item.Nomor }}</div>
        <table class="detail-table">
          <thead>
            <tr>
              <th>Bahan</th>
              <th width="100" class="tr">Panjang</th>
              <th width="90" class="tr">Jumlah</th>
              <th width="90" class="tr">Total</th>
              <th width="50" class="tr">C</th>
              <th width="50" class="tr">M</th>
              <th width="50" class="tr">Y</th>
              <th width="50" class="tr">K</th>
              <th width="130">Mesin</th>
              <th>Keterangan</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(r, i) in komponenMap[item.Nomor]" :key="i">
              <td class="font-weight-bold">{{ r.Bahan }}</td>
              <td class="tr">{{ angkaAtauTeks(r.Panjang_Output) }}</td>
              <td class="tr">{{ angkaAtauTeks(r.Jumlah_Output) }}</td>
              <td class="tr">{{ angkaAtauTeks(r.Total_Output) }}</td>
              <td class="tr">{{ angkaAtauTeks(r.Tinta_C) }}</td>
              <td class="tr">{{ angkaAtauTeks(r.Tinta_M) }}</td>
              <td class="tr">{{ angkaAtauTeks(r.Tinta_Y) }}</td>
              <td class="tr">{{ angkaAtauTeks(r.Tinta_K) }}</td>
              <td>{{ r.Mesin }}</td>
              <td>{{ r.Keterangan }}</td>
            </tr>
            <tr v-if="!komponenMap[item.Nomor]?.length">
              <td colspan="10" class="text-center text-grey py-3 font-italic">
                Komponen LHK Design tidak ditemukan.
              </td>
            </tr>
          </tbody>
        </table>

        <div class="expand-title mt-4 mb-2">Riwayat Status</div>
        <table class="detail-table">
          <thead>
            <tr>
              <th width="110">Design</th>
              <th width="130">Status</th>
              <th width="150">Tanggal</th>
              <th width="90" class="tr">Durasi</th>
              <th>Catatan</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(r, i) in statusMap[item.Nomor]" :key="i">
              <td>{{ r.Design }}</td>
              <td :class="selesai(r.Status) ? 'st-done' : 'st-open'">
                {{ r.Status }}
              </td>
              <td>{{ fmtWaktu(r.Tanggal) }}</td>
              <td class="tr">{{ angkaAtauTeks(r.Durasi) }}</td>
              <td>{{ r.Catatan }}</td>
            </tr>
            <tr v-if="!statusMap[item.Nomor]?.length">
              <td colspan="5" class="text-center text-grey py-3 font-italic">
                Belum ada riwayat status.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>

    <template #extra-actions>
      <v-btn size="small" color="deep-purple-darken-1" @click="exportDetail">
        <template #prepend><IconFileExport :size="15" /></template>Export Detail
      </v-btn>
    </template>
  </BaseBrowse>
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
.f-date {
  height: 28px;
  border: 1px solid #ccc;
  border-radius: 4px;
  padding: 0 6px;
  font-size: 12px;
  background: white;
  outline: none;
}
.f-sep {
  font-size: 11px;
  color: #777;
}

.expand-wrap {
  padding: 10px 10px 10px 40px;
  background: #eceff1;
}
.expand-title {
  font-size: 12px;
  font-weight: bold;
  color: #1565c0;
  text-transform: uppercase;
}
.detail-table {
  width: 100%;
  border-collapse: collapse;
  background: white;
  border-radius: 4px;
  overflow: hidden;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
  font-size: 11px;
}
.detail-table th {
  background: #546e7a;
  color: white;
  text-align: left;
  padding: 6px 8px;
  font-weight: bold;
}
.detail-table td {
  padding: 4px 8px;
  border-bottom: 1px solid #eee;
}
.tr {
  text-align: right !important;
}
.st-done {
  color: #2e7d32;
  font-weight: 600;
}
.st-open {
  color: #c62828;
  font-weight: 600;
}
</style>
