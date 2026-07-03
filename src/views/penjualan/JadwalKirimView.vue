<script setup lang="ts">
import { ref, computed, onMounted, watch } from "vue";
import { useAuthStore } from "@/stores/authStore";
import { useRouter } from "vue-router";
import { useToast } from "vue-toastification";
import { useBrowse } from "@/composables/useBrowse";
import { jadwalKirimService } from "@/services/penjualan/jadwalKirimService";
import BaseBrowse from "@/components/BaseBrowse.vue";
import {
  exportExcel,
  exportExcelSingle,
  type ExcelColumn,
} from "@/utils/excelExport";
import {
  IconTruckDelivery,
  IconSearch,
  IconTableExport,
  IconPrinter,
} from "@tabler/icons-vue";

// ── Tipe data ──────────────────────────────────────────────────────────
interface JadwalKirimRow {
  Nomor: string;
  Gudang: string;
  Nama_Gudang: string;
  Tanggal: string;
  No_SPK: string;
  Nama_Spk: string;
  Ukuran: string;
  Kain: string;
  Jumlah: number;
  Koli: number;
  Realisasi: number;
  Koli_Realisasi: number;
  Selisih_Jumlah: number;
  Selisih_Koli: number;
  usr_create: string;
}

interface DetailRow {
  Nomor: string;
  No_urut: number;
  Kota: string;
  Uraian: string;
  Size: string;
  Jumlah: number;
  Koli: number;
  Jam_Input: string;
  Jam_Ready: string;
  Nomor_SJ: string;
  Realisasi_Kirim: number;
  Jam_Kirim: string;
  Jam_Ambil: string;
  Expedisi: string;
}

// ── Router & Toast ─────────────────────────────────────────────────────
const authStore = useAuthStore();
const router = useRouter();
const toast = useToast();

const canInsertJK = computed(
  () =>
    canInsert.value &&
    !!authStore.user?.cabang &&
    authStore.user.cabang !== "HO-",
);

// ── Filter State ───────────────────────────────────────────────────────
// PENTING: toISOString() mengembalikan UTC — bisa mundur 1 hari saat jam < 07:00 WIB.
// Gunakan format manual dari komponen lokal agar tanggal selalu tepat.
const todayWIB = new Date(
  new Date().toLocaleString("en-US", { timeZone: "Asia/Jakarta" }),
);

const toISODate = (d: Date): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const firstOfMonth = new Date(todayWIB.getFullYear(), todayWIB.getMonth(), 1);

const filterState = ref({
  tglAwal: toISODate(firstOfMonth),
  tglAkhir: toISODate(todayWIB),
  gudang: "",
  gudangNama: "",
});

// ── List gudang untuk dropdown search ─────────────────────────────────
const gudangList = ref<Array<{ Kode: string; Nama: string }>>([]);
const gudangLoading = ref(false);

const loadGudang = async () => {
  gudangLoading.value = true;
  try {
    const res = await jadwalKirimService.getListGudang();
    gudangList.value = res.data.data || [];
  } catch {
    // silent — tidak kritis
  } finally {
    gudangLoading.value = false;
  }
};

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
} = useBrowse<JadwalKirimRow>({
  menuId: "119",
  immediate: false, // kita fetch manual setelah filter siap
  fetchApi: async () => {
    const res = await jadwalKirimService.getBrowse({
      tglAwal: filterState.value.tglAwal,
      tglAkhir: filterState.value.tglAkhir,
      gudang: filterState.value.gudang,
    });
    return res.data.data || [];
  },
  deleteApi: async (nomor) => {
    await jadwalKirimService.deleteData(nomor);
  },
});

// ── Expanded rows & detail cache ───────────────────────────────────────
const expanded = ref<JadwalKirimRow[]>([]);
const detailCache = ref<Record<string, DetailRow[]>>({});
const loadingDetails = ref<Set<string>>(new Set());

const onUpdateExpanded = async (val: any[]) => {
  // Vuetify emit array of objects
  const nomors: string[] = val.map((v) =>
    typeof v === "object" ? v.Nomor : v,
  );

  expanded.value = val;

  // Fetch detail yang belum di-cache
  for (const nomor of nomors) {
    if (!detailCache.value[nomor]) {
      loadingDetails.value = new Set([...loadingDetails.value, nomor]);
      try {
        const res = await jadwalKirimService.getDetail(nomor);
        detailCache.value[nomor] = res.data.data || [];
      } catch {
        detailCache.value[nomor] = [];
        toast.error(`Gagal memuat detail ${nomor}`);
      } finally {
        const next = new Set(loadingDetails.value);
        next.delete(nomor);
        loadingDetails.value = next;
      }
    }
  }
};

// ── Headers master ─────────────────────────────────────────────────────
const headers = [
  { title: "Nomor", key: "Nomor", width: "150px" },
  { title: "Gudang", key: "Gudang", width: "70px" },
  { title: "Nama Gudang", key: "Nama_Gudang", width: "180px" },
  { title: "Tanggal", key: "Tanggal", width: "100px" },
  { title: "No SPK", key: "No_SPK", width: "150px" },
  { title: "Nama SPK", key: "Nama_Spk", width: "280px" },
  { title: "Ukuran", key: "Ukuran", width: "200px" },
  { title: "Kain", key: "Kain", width: "160px" },
  { title: "Jumlah", key: "Jumlah", width: "80px", align: "end" },
  { title: "Koli", key: "Koli", width: "65px", align: "end" },
  { title: "Realisasi", key: "Realisasi", width: "90px", align: "end" },
  { title: "Koli Real.", key: "Koli_Realisasi", width: "90px", align: "end" },
  { title: "Selisih Jml", key: "Selisih_Jumlah", width: "95px", align: "end" },
  { title: "Selisih Koli", key: "Selisih_Koli", width: "95px", align: "end" },
  { title: "User", key: "usr_create", width: "90px" },
];

// ── Headers detail (tabel dalam expanded row) ──────────────────────────
const detailHeaders = [
  { title: "No", key: "No_urut", width: "40px" },
  { title: "Kota", key: "Kota", width: "100px" },
  { title: "Uraian", key: "Uraian", width: "240px" },
  { title: "Size", key: "Size", width: "100px" },
  { title: "Jumlah", key: "Jumlah", width: "70px" },
  { title: "Koli", key: "Koli", width: "55px" },
  { title: "Jam Input", key: "Jam_Input", width: "80px" },
  { title: "Jam Ready", key: "Jam_Ready", width: "80px" },
  { title: "Nomor SJ", key: "Nomor_SJ", width: "120px" },
  { title: "Realisasi Kirim", key: "Realisasi_Kirim", width: "110px" },
  { title: "Jam Kirim", key: "Jam_Kirim", width: "80px" },
  { title: "Jam Ambil", key: "Jam_Ambil", width: "80px" },
  { title: "Expedisi", key: "Expedisi", width: "140px" },
];

// ── Row color: selisih negatif → merah muda ────────────────────────────
const rowPropsFn = (data: any) => {
  const item = data.item?.raw || data.item;
  if (Number(item?.Selisih_Jumlah) < 0 || Number(item?.Selisih_Koli) < 0) {
    return { style: "background-color: #fff8f8 !important; color: #c62828;" };
  }
  return {};
};

// ── Delete ─────────────────────────────────────────────────────────────
const onDelete = async (item: JadwalKirimRow) => {
  try {
    await jadwalKirimService.deleteData(item.Nomor);
    toast.success(`Data ${item.Nomor} berhasil dihapus.`);
    // Bersihkan cache detail jika ada
    delete detailCache.value[item.Nomor];
    clearSelection();
    await fetchData();
  } catch (err: any) {
    toast.error(err.response?.data?.message || "Gagal menghapus data.");
  }
};

// ── Export ─────────────────────────────────────────────────────────────
const isExporting = ref(false);
const isExportingDetail = ref(false);

// Kolom export master — urutan & lebar sesuai browse
const masterColumns: ExcelColumn[] = [
  { header: "Nomor", key: "Nomor", width: 20, align: "left" },
  { header: "Gudang", key: "Gudang", width: 8, align: "center" },
  { header: "Nama Gudang", key: "Nama_Gudang", width: 24, align: "left" },
  { header: "Tanggal", key: "Tanggal", width: 12, align: "center" },
  { header: "No SPK", key: "No_SPK", width: 18, align: "left" },
  { header: "Nama SPK", key: "Nama_Spk", width: 36, align: "left" },
  { header: "Ukuran", key: "Ukuran", width: 26, align: "left" },
  { header: "Kain", key: "Kain", width: 20, align: "left" },
  {
    header: "Jumlah",
    key: "Jumlah",
    width: 10,
    align: "right",
    numFmt: "#,##0",
  },
  { header: "Koli", key: "Koli", width: 8, align: "right", numFmt: "#,##0" },
  {
    header: "Realisasi",
    key: "Realisasi",
    width: 12,
    align: "right",
    numFmt: "#,##0",
  },
  {
    header: "Koli Real.",
    key: "Koli_Realisasi",
    width: 12,
    align: "right",
    numFmt: "#,##0",
  },
  {
    header: "Selisih Jml",
    key: "Selisih_Jumlah",
    width: 12,
    align: "right",
    numFmt: "#,##0",
  },
  {
    header: "Selisih Koli",
    key: "Selisih_Koli",
    width: 12,
    align: "right",
    numFmt: "#,##0",
  },
  { header: "User", key: "usr_create", width: 10, align: "left" },
];

// Kolom export detail
const detailColumns: ExcelColumn[] = [
  { header: "Nomor Kirim", key: "Nomor", width: 20, align: "left" },
  { header: "No", key: "No_urut", width: 6, align: "center" },
  { header: "Kota", key: "Kota", width: 14, align: "left" },
  { header: "Uraian", key: "Uraian", width: 36, align: "left" },
  { header: "Size", key: "Size", width: 14, align: "left" },
  {
    header: "Jumlah",
    key: "Jumlah",
    width: 10,
    align: "right",
    numFmt: "#,##0",
  },
  { header: "Koli", key: "Koli", width: 8, align: "right", numFmt: "#,##0" },
  { header: "Jam Input", key: "Jam_Input", width: 10, align: "center" },
  { header: "Jam Ready", key: "Jam_Ready", width: 10, align: "center" },
  { header: "Nomor SJ", key: "Nomor_SJ", width: 16, align: "left" },
  {
    header: "Realisasi Kirim",
    key: "Realisasi_Kirim",
    width: 14,
    align: "right",
    numFmt: "#,##0",
  },
  { header: "Jam Kirim", key: "Jam_Kirim", width: 10, align: "center" },
  { header: "Jam Ambil", key: "Jam_Ambil", width: 10, align: "center" },
  { header: "Expedisi", key: "Expedisi", width: 20, align: "left" },
];

const onExport = async () => {
  const rows = items.value ?? [];
  if (!rows.length) {
    toast.warning("Tidak ada data untuk diexport.");
    return;
  }
  isExporting.value = true;
  try {
    const title = `Jadwal Kirim — ${filterState.value.tglAwal} s.d. ${filterState.value.tglAkhir}${filterState.value.gudang ? " | Gudang: " + filterState.value.gudang : ""}`;
    await exportExcelSingle(
      `JadwalKirim_${filterState.value.tglAwal}_${filterState.value.tglAkhir}.xlsx`,
      "Jadwal Kirim",
      masterColumns,
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

const onExportDetail = async () => {
  isExportingDetail.value = true;
  try {
    // Fetch semua detail sesuai filter dari backend
    const res = await jadwalKirimService.getDetailByFilter({
      tglAwal: filterState.value.tglAwal,
      tglAkhir: filterState.value.tglAkhir,
      gudang: filterState.value.gudang,
    });
    const detailRows = res.data.data || [];

    if (!detailRows.length) {
      toast.warning("Tidak ada data detail untuk diexport.");
      return;
    }

    const title = `Detail Jadwal Kirim — ${filterState.value.tglAwal} s.d. ${filterState.value.tglAkhir}${filterState.value.gudang ? " | Gudang: " + filterState.value.gudang : ""}`;
    await exportExcelSingle(
      `JadwalKirimDetail_${filterState.value.tglAwal}_${filterState.value.tglAkhir}.xlsx`,
      "Detail Jadwal Kirim",
      detailColumns,
      detailRows,
      title,
    );
    toast.success("Export detail berhasil.");
  } catch {
    toast.error("Gagal export detail Excel.");
  } finally {
    isExportingDetail.value = false;
  }
};

const onCetak = () => {
  const params = new URLSearchParams({
    tglAwal: filterState.value.tglAwal,
    tglAkhir: filterState.value.tglAkhir,
    gudang: filterState.value.gudang || "",
  });
  window.open(`/penjualan/jadwal-kirim/print?${params.toString()}`, "_blank");
};

// ── Gudang search modal ────────────────────────────────────────────────
const showGudangModal = ref(false);
const gudangSearch = ref("");

const filteredGudangList = computed(() => {
  const q = gudangSearch.value.toLowerCase();
  if (!q) return gudangList.value;
  return gudangList.value.filter(
    (g) => g.Kode.toLowerCase().includes(q) || g.Nama.toLowerCase().includes(q),
  );
});

const selectGudang = (item: { Kode: string; Nama: string }) => {
  filterState.value.gudang = item.Kode;
  filterState.value.gudangNama = item.Nama;
  showGudangModal.value = false;
  gudangSearch.value = "";
};

const clearGudang = () => {
  filterState.value.gudang = "";
  filterState.value.gudangNama = "";
};

// ── Filter state restore dari BaseBrowse sessionStorage ───────────────
const onFilterStateRestored = (saved: Record<string, any>) => {
  if (saved.tglAwal) filterState.value.tglAwal = saved.tglAwal;
  if (saved.tglAkhir) filterState.value.tglAkhir = saved.tglAkhir;
  // Restore gudang hanya jika ada nilai (tidak override default GJ001 dengan kosong)
  if (saved.gudang !== undefined && saved.gudang !== "") {
    filterState.value.gudang = saved.gudang;
    filterState.value.gudangNama = saved.gudangNama || "";
  }
};

// ── Lifecycle ──────────────────────────────────────────────────────────
onMounted(async () => {
  await loadGudang();

  // Set default gudang GJ001 dari list yang sudah diload
  // (hanya jika belum ada nilai dari sessionStorage)
  if (!filterState.value.gudang) {
    const defaultGudang = gudangList.value.find((g) => g.Kode === "GJ001");
    if (defaultGudang) {
      filterState.value.gudang = defaultGudang.Kode;
      filterState.value.gudangNama = defaultGudang.Nama;
    }
  }

  await fetchData();
});

// Re-fetch otomatis saat filter tanggal berubah (debounce 400ms)
let filterTimer: ReturnType<typeof setTimeout> | null = null;
watch(
  () => [
    filterState.value.tglAwal,
    filterState.value.tglAkhir,
    filterState.value.gudang,
  ],
  () => {
    if (filterTimer) clearTimeout(filterTimer);
    filterTimer = setTimeout(() => fetchData(), 400);
  },
);
</script>

<template>
  <BaseBrowse
    title="Jadwal Kirim"
    menu-id="119"
    :icon="IconTruckDelivery"
    :headers="headers"
    :items="items ?? []"
    :is-loading="isLoading"
    item-value="Nomor"
    :can-insert="canInsertJK"
    :can-edit="canEdit"
    :can-delete="canDelete"
    :can-export="canExport"
    :show-expand="true"
    :expanded="expanded"
    :selected="selected"
    :row-props-fn="rowPropsFn"
    :filter-state="filterState"
    search-placeholder="Cari nomor, SPK, nama..."
    @refresh="fetchData"
    @add="router.push('/penjualan/jadwal-kirim/create')"
    @edit="
      (item) =>
        router.push(
          `/penjualan/jadwal-kirim/edit/${encodeURIComponent(item.Nomor)}`,
        )
    "
    @delete="onDelete"
    @export="onExport"
    @update:expanded="onUpdateExpanded"
    @update:selected="(val) => (selected = val)"
    @update:filter-state="onFilterStateRestored"
  >
    <!-- ── Filter kiri: periode + gudang ── -->
    <template #filter-left>
      <!-- Periode Awal -->
      <div class="f-grp">
        <label class="f-lbl">Dari</label>
        <input type="date" v-model="filterState.tglAwal" class="f-date" />
      </div>

      <!-- Periode Akhir -->
      <div class="f-grp">
        <label class="f-lbl">S/D</label>
        <input type="date" v-model="filterState.tglAkhir" class="f-date" />
      </div>

      <!-- Filter Gudang -->
      <div class="f-grp">
        <label class="f-lbl">Gudang</label>
        <div class="f-inp-grp">
          <input
            :value="filterState.gudang"
            readonly
            class="f-inp"
            style="width: 60px; cursor: pointer"
            placeholder="Semua"
            @click="showGudangModal = true"
          />
          <input
            :value="filterState.gudangNama"
            readonly
            class="f-inp f-ro"
            style="width: 220px"
          />
          <button
            class="f-btn-icon"
            title="Cari Gudang"
            @click="showGudangModal = true"
          >
            <IconSearch :size="13" color="#1565c0" />
          </button>
          <button
            v-if="filterState.gudang"
            class="f-btn-icon"
            title="Hapus Filter Gudang"
            @click="clearGudang"
          >
            ✕
          </button>
        </div>
      </div>
    </template>

    <!-- ── Extra actions: Export Detail ── -->
    <template #extra-actions>
      <v-btn
        size="small"
        color="teal"
        :loading="isExportingDetail"
        @click="onExportDetail"
      >
        <template #prepend>
          <IconTableExport :size="15" :stroke-width="1.7" />
        </template>
        Export Detail
      </v-btn>

      <v-btn size="small" color="grey-darken-2" @click="onCetak">
        <template #prepend>
          <IconPrinter :size="15" :stroke-width="1.7" />
        </template>
        Cetak
      </v-btn>
    </template>

    <!-- ── Expanded detail ── -->
    <template #detail="{ item }">
      <div v-if="loadingDetails.has(item.Nomor)" class="detail-loading">
        <v-progress-circular indeterminate size="20" color="primary" />
        <span>Memuat detail...</span>
      </div>

      <template v-else-if="detailCache[item.Nomor]?.length">
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
              <td>{{ row.No_urut }}</td>
              <td>{{ row.Kota }}</td>
              <td>{{ row.Uraian }}</td>
              <td>{{ row.Size }}</td>
              <td class="text-right">
                {{ row.Jumlah?.toLocaleString("id-ID") }}
              </td>
              <td class="text-right">
                {{ row.Koli?.toLocaleString("id-ID") }}
              </td>
              <td>{{ row.Jam_Input }}</td>
              <td>{{ row.Jam_Ready }}</td>
              <td :class="row.Nomor_SJ ? 'sj-nomor' : 'sj-empty'">
                {{ row.Nomor_SJ || "—" }}
              </td>
              <td
                class="text-right"
                :class="{ 'real-ok': Number(row.Realisasi_Kirim) > 0 }"
              >
                {{ row.Realisasi_Kirim?.toLocaleString("id-ID") }}
              </td>
              <td>{{ row.Jam_Kirim }}</td>
              <td>{{ row.Jam_Ambil }}</td>
              <td>{{ row.Expedisi }}</td>
            </tr>
          </tbody>
        </table>
      </template>

      <div v-else class="detail-empty">
        Tidak ada detail untuk {{ item.Nomor }}
      </div>
    </template>
  </BaseBrowse>

  <!-- ── Modal Pilih Gudang ── -->
  <v-dialog v-model="showGudangModal" max-width="420px">
    <v-card class="rounded-lg">
      <v-card-title class="bg-primary text-white pa-3 d-flex align-center">
        <IconSearch :size="16" class="mr-2" />
        <span style="font-size: 13px; font-weight: 700">Pilih Gudang</span>
      </v-card-title>

      <v-card-text class="pa-3">
        <!-- Search input -->
        <input
          v-model="gudangSearch"
          type="text"
          class="gudang-search-input"
          placeholder="Cari kode atau nama gudang..."
          autofocus
        />

        <!-- List gudang -->
        <div class="gudang-list">
          <!-- Opsi semua gudang -->
          <div
            class="gudang-item"
            :class="{ active: !filterState.gudang }"
            @click="
              clearGudang();
              showGudangModal = false;
            "
          >
            <span class="gudang-kode" style="color: #9e9e9e">—</span>
            <span class="gudang-nama" style="color: #9e9e9e">Semua Gudang</span>
          </div>

          <div
            v-for="g in filteredGudangList"
            :key="g.Kode"
            class="gudang-item"
            :class="{ active: filterState.gudang === g.Kode }"
            @click="selectGudang(g)"
          >
            <span class="gudang-kode">{{ g.Kode }}</span>
            <span class="gudang-nama">{{ g.Nama }}</span>
          </div>

          <div v-if="filteredGudangList.length === 0" class="gudang-empty">
            Tidak ada gudang ditemukan
          </div>
        </div>
      </v-card-text>

      <v-card-actions class="pa-3 border-t">
        <v-spacer />
        <v-btn variant="text" @click="showGudangModal = false">Tutup</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style scoped>
/* ── Filter bar elements ── */
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
.f-inp-grp {
  display: flex;
  border: 1px solid #bdbdbd;
  border-radius: 4px;
  overflow: hidden;
  height: 30px;
  background: white;
}
.f-inp {
  height: 28px;
  border: none;
  padding: 0 6px;
  font-size: 12px;
  outline: none;
  background: white;
}
.f-ro {
  background: #f0f0f0 !important;
  color: #555;
}
.f-btn-icon {
  width: 28px;
  min-width: 28px;
  background: #e3f2fd;
  border: none;
  border-left: 1px solid #bdbdbd;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  color: #555;
}
.f-btn-icon:hover {
  background: #bbdefb;
}

/* ── Detail tabel ── */
.detail-table {
  border-collapse: collapse;
  font-size: 11px;
  min-width: max-content;
}
.detail-table th {
  background: #1565c0;
  color: white;
  padding: 4px 8px;
  white-space: nowrap;
  font-weight: 700;
  font-size: 11px;
  letter-spacing: 0.02em;
}
.detail-table td {
  padding: 3px 8px;
  border-bottom: 1px solid #e0e0e0;
  white-space: nowrap;
  font-size: 11px;
  vertical-align: middle;
}
.detail-table tbody tr:nth-of-type(even) td {
  background: #f5f5f5;
}
.detail-table tbody tr:hover td {
  background: #e3f2fd !important;
}
.text-right {
  text-align: right;
}
.sj-nomor {
  font-weight: 700;
  color: #1565c0;
}
.sj-empty {
  color: #bdbdbd;
  text-align: center;
}
.real-ok {
  color: #2e7d32;
  font-weight: 600;
}

.detail-loading {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  font-size: 12px;
  color: #555;
}
.detail-empty {
  padding: 12px 16px;
  font-size: 11px;
  color: #9e9e9e;
}

/* ── Gudang modal ── */
.gudang-search-input {
  width: 100%;
  height: 32px;
  border: 1px solid #bdbdbd;
  border-radius: 4px;
  padding: 0 10px;
  font-size: 12px;
  outline: none;
  box-sizing: border-box;
  margin-bottom: 8px;
}
.gudang-search-input:focus {
  border-color: #1565c0;
}
.gudang-list {
  max-height: 300px;
  overflow-y: auto;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
}
.gudang-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 7px 10px;
  cursor: pointer;
  font-size: 12px;
  border-bottom: 1px solid #f5f5f5;
  transition: background 0.1s;
}
.gudang-item:hover {
  background: #e3f2fd;
}
.gudang-item.active {
  background: #1565c0;
  color: white;
}
.gudang-item.active .gudang-kode,
.gudang-item.active .gudang-nama {
  color: white !important;
}
.gudang-kode {
  font-weight: 700;
  width: 60px;
  flex-shrink: 0;
  font-family: monospace;
}
.gudang-nama {
  flex: 1;
}
.gudang-empty {
  padding: 16px;
  text-align: center;
  color: #9e9e9e;
  font-size: 11px;
}
</style>
