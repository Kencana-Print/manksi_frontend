<script setup lang="ts">
import { ref, computed, watch } from "vue";
import { useAuthStore } from "@/stores/authStore";
import { useRouter } from "vue-router";
import { useToast } from "vue-toastification";
import BaseBrowse from "@/components/BaseBrowse.vue";
import { penjadwalanPpicService } from "@/services/ppic/penjadwalanPpicService";
import {
  IconCalendarWeek,
  IconLock,
  IconLockOpen,
  IconTrash,
  IconFileExport,
  IconListDetails,
  IconEye,
  IconX,
} from "@tabler/icons-vue";
import { exportExcelSingle, exportExcel } from "@/utils/excelExport";
import { formatTanggal } from "@/utils/dateFormat";

interface BrowseItem {
  Nomor: string;
  TglAwal: string;
  TglAkhir: string;
  Cabang: string;
  Close: string;
  Keterangan: string;
  JumlahSO: number;
}
interface DetailRow {
  PjwdId: number;
  Nomor: string;
  Sumber: string;
  NomorMap: string;
  Nama: string;
  Tanggal: string;
  Pesan: number;
  Kirim: number;
  Kurang: number;
  Rencana: number;
  Realisasi: number;
  PermintaanKirim: string;
  StatusPermintaan: string;
  Kesepakatan: string;
  KetKesepakatan: string;
  NomorPraOrder: string;
}

const router = useRouter();
const toast = useToast();
const authStore = useAuthStore();
const canCreate = computed(() => {
  const isAdmin = authStore.user?.kode?.toUpperCase() === "ADMIN";
  const isMarketing = authStore.user?.bagian?.toUpperCase() === "MARKETING";
  return isAdmin || isMarketing;
});

const pad = (n: number) => String(n).padStart(2, "0");
const toLocalDate = (d: Date) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

const HARI = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
const getMonthRange = (d: Date) => {
  const first = new Date(d.getFullYear(), d.getMonth(), 1);
  const last = new Date(d.getFullYear(), d.getMonth() + 1, 0);
  return { first, last };
};

const today = new Date();
const { first: monthStart, last: monthEnd } = getMonthRange(today);

const filterState = ref({
  start: toLocalDate(monthStart),
  end: toLocalDate(monthEnd),
  cabang: "",
});

const filterStart = computed({
  get: () => filterState.value.start,
  set: (v) => {
    filterState.value = { ...filterState.value, start: v };
  },
});
const filterEnd = computed({
  get: () => filterState.value.end,
  set: (v) => {
    filterState.value = { ...filterState.value, end: v };
  },
});

const filterCabang = computed({
  get: () => filterState.value.cabang,
  set: (v) => {
    filterState.value = { ...filterState.value, cabang: v };
  },
});

const hariStart = computed(() =>
  filterStart.value
    ? HARI[new Date(filterStart.value + "T00:00:00").getDay()]
    : "",
);
const hariEnd = computed(() =>
  filterEnd.value ? HARI[new Date(filterEnd.value + "T00:00:00").getDay()] : "",
);

const onFilterStateRestored = (state: Record<string, any>) => {
  if (state.start) filterState.value.start = state.start;
  if (state.end) filterState.value.end = state.end;
  if (state.cabang !== undefined) filterState.value.cabang = state.cabang;
};

const items = ref<BrowseItem[]>([]);
const isLoading = ref(false);
const cabangOptions = ref<{ value: string; title: string }[]>([]);

const selected = ref<BrowseItem[]>([]);
const expandedRows = ref<BrowseItem[]>([]);
const detailCache = ref<Record<string, DetailRow[]>>({});
const detailLoading = ref<Set<string>>(new Set());

const showCloseDialog = ref(false);
const showOpenDialog = ref(false);
const showDeleteDialog = ref(false);
const isActioning = ref(false);
const selectedItem = ref<BrowseItem | null>(null);

const showPreviewDialog = ref(false);
const previewNomor = ref("");
const previewDetail = ref<DetailRow[]>([]);
const previewLoading = ref(false);

const loadCabang = async () => {
  try {
    const res = await penjadwalanPpicService.getCabang();
    cabangOptions.value = res.data.data.map((c: any) => ({
      value: c.Kode,
      title: `${c.Kode} - ${c.Nama}`,
    }));
  } catch {
    console.error("Gagal load cabang");
  }
};

const openPreview = async () => {
  if (!selected.value.length) return;
  const item = selected.value[0];
  previewNomor.value = item.Nomor;
  showPreviewDialog.value = true;

  if (detailCache.value[item.Nomor]) {
    previewDetail.value = detailCache.value[item.Nomor];
    return;
  }

  previewLoading.value = true;
  try {
    const res = await penjadwalanPpicService.getDetail(item.Nomor);
    previewDetail.value = res.data.data ?? [];
    detailCache.value = {
      ...detailCache.value,
      [item.Nomor]: previewDetail.value,
    };
  } catch {
    toast.error(`Gagal memuat detail ${item.Nomor}`);
  } finally {
    previewLoading.value = false;
  }
};

const baseBrowseRef = ref<InstanceType<typeof BaseBrowse> | null>(null);
const isExporting = ref(false);
const isExportingDetail = ref(false);

const headers = [
  { title: "NOMOR", key: "Nomor", width: "200px" },
  { title: "TGL AWAL", key: "TglAwal", width: "100px", align: "center" },
  { title: "TGL AKHIR", key: "TglAkhir", width: "100px", align: "center" },
  { title: "CABANG", key: "Cabang", width: "70px", align: "center" },
  { title: "STATUS", key: "Close", width: "80px", align: "center" },
  { title: "JML SO", key: "JumlahSO", width: "80px", align: "center" },
  { title: "KETERANGAN", key: "Keterangan", width: "300px" },
];

let filterTimer: ReturnType<typeof setTimeout> | null = null;
watch(
  filterState,
  () => {
    expandedRows.value = [];
    detailCache.value = {};
    if (filterTimer) clearTimeout(filterTimer);
    filterTimer = setTimeout(fetchData, 400);
  },
  { deep: true },
);

const fetchData = async () => {
  isLoading.value = true;
  selected.value = [];
  expandedRows.value = [];
  detailCache.value = {};
  try {
    const res = await penjadwalanPpicService.getBrowse({
      startDate: filterStart.value,
      endDate: filterEnd.value,
      cabang: filterState.value.cabang,
    });
    items.value = res.data.data ?? [];
  } catch (e: any) {
    toast.error(e.response?.data?.message || "Gagal memuat data");
  } finally {
    isLoading.value = false;
  }
};

const handleExpand = async (newExpanded: BrowseItem[]) => {
  const added = newExpanded.find((i) => !expandedRows.value.includes(i));
  expandedRows.value = newExpanded;
  if (!added) return;

  const nomor = added.Nomor;
  if (detailCache.value[nomor]) return;

  detailLoading.value = new Set([...detailLoading.value, nomor]);
  try {
    const res = await penjadwalanPpicService.getDetail(nomor);
    detailCache.value = { ...detailCache.value, [nomor]: res.data.data ?? [] };
  } catch {
    toast.error(`Gagal memuat detail ${nomor}`);
  } finally {
    const s = new Set(detailLoading.value);
    s.delete(nomor);
    detailLoading.value = s;
  }
};

const rowPropsFn = (data: any) => {
  const item = data.item?.raw || data.item;
  if (item.Close === "Y") return { class: "text-grey-darken-1" };
  return {};
};

const rowStyleForStatus = (
  statusPermintaan: string,
): import("@/utils/excelExport").RowStyleResult | null => {
  if (statusPermintaan === "NECESSARY")
    return { fillColor: "B71C1C", fontColor: "FFFFFF", bold: true };
  if (statusPermintaan === "PARTIAL") return { fillColor: "FFF3E0" };
  return null; // CLOSE / default — tidak ada override, ikut zebra biasa
};

const detailRowClass = (d: DetailRow) => {
  if (d.StatusPermintaan === "NECESSARY") return "row-necessary";
  if (d.StatusPermintaan === "PARTIAL") return "row-partial";
  if (Number(d.Kurang) <= 0) return "row-done";
  return "";
};

const handleAdd = () => router.push("/ppic/penjadwalan/create");
const handleEdit = (item: BrowseItem) =>
  router.push(`/ppic/penjadwalan/edit/${encodeURIComponent(item.Nomor)}`);

const openCloseDialog = () => {
  if (!selected.value.length) return;
  selectedItem.value = selected.value[0];
  if (selectedItem.value.Close === "Y") {
    toast.warning("Sudah Close.");
    return;
  }
  showCloseDialog.value = true;
};
const openOpenDialog = () => {
  if (!selected.value.length) return;
  selectedItem.value = selected.value[0];
  if (selectedItem.value.Close === "N") {
    toast.warning("Sudah Open.");
    return;
  }
  showOpenDialog.value = true;
};
const openDeleteDialog = () => {
  if (!selected.value.length) return;
  selectedItem.value = selected.value[0];
  showDeleteDialog.value = true;
};

const confirmClose = async () => {
  if (!selectedItem.value) return;
  isActioning.value = true;
  try {
    await penjadwalanPpicService.toggleClose(selectedItem.value.Nomor, true);
    toast.success("Periode berhasil diclose.");
    showCloseDialog.value = false;
    fetchData();
  } catch (e: any) {
    toast.error(e.response?.data?.message || "Gagal close.");
  } finally {
    isActioning.value = false;
  }
};
const confirmOpen = async () => {
  if (!selectedItem.value) return;
  isActioning.value = true;
  try {
    await penjadwalanPpicService.toggleClose(selectedItem.value.Nomor, false);
    toast.success("Periode berhasil dibuka.");
    showOpenDialog.value = false;
    fetchData();
  } catch (e: any) {
    toast.error(e.response?.data?.message || "Gagal membuka.");
  } finally {
    isActioning.value = false;
  }
};
const confirmDelete = async () => {
  if (!selectedItem.value) return;
  isActioning.value = true;
  try {
    await penjadwalanPpicService.deleteData(selectedItem.value.Nomor);
    toast.success("Periode berhasil dihapus.");
    showDeleteDialog.value = false;
    fetchData();
  } catch (e: any) {
    toast.error(e.response?.data?.message || "Gagal menghapus.");
  } finally {
    isActioning.value = false;
  }
};

const onExport = async () => {
  const rawData =
    baseBrowseRef.value?.getFilteredItems?.() ?? items.value ?? [];
  if (!rawData.length) {
    toast.warning("Tidak ada data untuk diekspor.");
    return;
  }
  isExporting.value = true;
  try {
    await exportExcelSingle(
      `Komitmen_Kirim_${filterStart.value}_${filterEnd.value}.xlsx`,
      "Komitmen Kirim",
      [
        { header: "Nomor", key: "Nomor" },
        { header: "Tgl Awal", key: "TglAwal" },
        { header: "Tgl Akhir", key: "TglAkhir" },
        { header: "Cabang", key: "Cabang" },
        { header: "Status", key: "Status" },
        { header: "Jumlah SO", key: "JumlahSO", align: "right" },
        { header: "Keterangan", key: "Keterangan" },
      ],
      rawData.map((r: BrowseItem) => ({
        ...r,
        TglAwal: formatTanggal(r.TglAwal),
        TglAkhir: formatTanggal(r.TglAkhir),
        Status: r.Close === "Y" ? "Closed" : "Open",
      })),
    );
  } catch {
    toast.error("Gagal export.");
  } finally {
    isExporting.value = false;
  }
};

const onExportDetail = async () => {
  const rawData =
    baseBrowseRef.value?.getFilteredItems?.() ?? items.value ?? [];
  if (!rawData.length) {
    toast.warning("Tidak ada data untuk diekspor.");
    return;
  }
  isExportingDetail.value = true;
  try {
    // Pastikan detail semua periode yang tampil sudah ter-fetch —
    // pakai cache kalau ada, fetch baru kalau belum pernah di-expand.
    const detailPerNomor: Record<string, DetailRow[]> = {
      ...detailCache.value,
    };
    const belumAda = rawData.filter(
      (r: BrowseItem) => !detailPerNomor[r.Nomor],
    );
    if (belumAda.length) {
      const results = await Promise.all(
        belumAda.map((r: BrowseItem) =>
          penjadwalanPpicService.getDetail(r.Nomor).then((res) => ({
            nomor: r.Nomor,
            data: res.data.data ?? [],
          })),
        ),
      );
      results.forEach((r) => (detailPerNomor[r.nomor] = r.data));
    }

    const combinedRows: any[] = [];
    for (const periode of rawData as BrowseItem[]) {
      const detailRows = detailPerNomor[periode.Nomor] || [];
      if (!detailRows.length) continue;

      const masterCells = {
        NomorPeriode: periode.Nomor,
        TglAwal: formatTanggal(periode.TglAwal),
        TglAkhir: formatTanggal(periode.TglAkhir),
        Cabang: periode.Cabang,
      };
      const blankMaster = Object.fromEntries(
        Object.keys(masterCells).map((k) => [k, ""]),
      );

      detailRows.forEach((d, idx) => {
        combinedRows.push({
          ...(idx === 0 ? masterCells : blankMaster),
          Tanggal: formatTanggal(d.Tanggal),
          NomorSo: d.Nomor || d.NomorPraOrder,
          Nama: d.Nama,
          Pesan: Number(d.Pesan) || 0,
          Kirim: Number(d.Kirim) || 0,
          Kurang: Number(d.Kurang) || 0,
          Rencana: Number(d.Rencana) || 0,
          Realisasi: Number(d.Realisasi) || 0,
          PermintaanKirim: formatTanggal(d.PermintaanKirim),
          StatusPermintaan: d.StatusPermintaan,
          Kesepakatan: formatTanggal(d.Kesepakatan),
          KetKesepakatan: d.KetKesepakatan || "",
        });
      });
    }

    if (!combinedRows.length) {
      toast.warning(
        "Tidak ada detail SO/Pra Order/MAP untuk periode yang ditampilkan.",
      );
      return;
    }

    await exportExcel(
      `Komitmen_Kirim_Detail_${filterStart.value}_${filterEnd.value}.xlsx`,
      [
        {
          sheetName: "Detail",
          headerColor: "FFEB3B", // kuning, sesuai gaya tracker Excel referensi
          columns: [
            { header: "Periode", key: "NomorPeriode" },
            { header: "Tgl Awal", key: "TglAwal" },
            { header: "Tgl Akhir", key: "TglAkhir" },
            { header: "Cabang", key: "Cabang" },
            { header: "Tanggal", key: "Tanggal" },
            { header: "Nomor", key: "NomorSo" },
            { header: "Nama", key: "Nama" },
            { header: "Pesan", key: "Pesan", align: "right", numFmt: "#,##0" },
            { header: "Kirim", key: "Kirim", align: "right", numFmt: "#,##0" },
            {
              header: "Kurang",
              key: "Kurang",
              align: "right",
              numFmt: "#,##0",
            },
            {
              header: "Rencana",
              key: "Rencana",
              align: "right",
              numFmt: "#,##0",
            },
            {
              header: "Realisasi",
              key: "Realisasi",
              align: "right",
              numFmt: "#,##0",
            },
            {
              header: "Permintaan Kirim",
              key: "PermintaanKirim",
              align: "center",
            },
            { header: "Permintaan", key: "StatusPermintaan", align: "center" },
            { header: "Kesepakatan", key: "Kesepakatan", align: "center" },
            { header: "Ket Kesepakatan", key: "KetKesepakatan" },
          ],
          rows: combinedRows,
          rowStyleFn: (row) => rowStyleForStatus(row.StatusPermintaan),
        },
      ],
    );
  } catch (e) {
    console.error(e);
    toast.error("Gagal export detail.");
  } finally {
    isExportingDetail.value = false;
  }
};

const fmt = (n: number | null | undefined) => (n ?? 0).toLocaleString("id-ID");

loadCabang();
fetchData();
</script>

<template>
  <BaseBrowse
    ref="baseBrowseRef"
    title="Komitmen Kirim"
    menu-id="176"
    :icon="IconCalendarWeek"
    :headers="headers"
    :items="items"
    :is-loading="isLoading"
    v-model:selected="selected"
    :expanded="expandedRows"
    @update:expanded="handleExpand"
    show-expand
    :can-insert="canCreate"
    :can-edit="true"
    :can-delete="false"
    :can-export="false"
    item-value="Nomor"
    :row-props-fn="rowPropsFn"
    :filter-state="filterState"
    @update:filter-state="onFilterStateRestored"
    @refresh="fetchData"
    @add="handleAdd"
    @edit="handleEdit"
  >
    <template #filter-left>
      <div class="date-filter">
        <span class="f-label" style="margin-left: 10px">Periode</span>
        <div class="date-with-day">
          <input type="date" v-model="filterStart" class="f-date" />
          <span class="f-day">{{ hariStart }}</span>
        </div>
        <span class="f-sep">sd</span>
        <div class="date-with-day">
          <input type="date" v-model="filterEnd" class="f-date" />
          <span class="f-day">{{ hariEnd }}</span>
        </div>
        <span class="f-label">Cabang</span>
        <select v-model="filterCabang" class="f-select">
          <option value="">Semua Cabang</option>
          <option v-for="c in cabangOptions" :key="c.value" :value="c.value">
            {{ c.title }}
          </option>
        </select>
        <v-btn
          color="primary"
          variant="tonal"
          size="small"
          height="26"
          class="px-2"
          @click="fetchData"
          >Filter</v-btn
        >
      </div>
    </template>

    <template #extra-actions="{ selected }">
      <v-btn
        size="small"
        color="error"
        :disabled="!selected.length"
        @click="openDeleteDialog"
      >
        <template #prepend><IconTrash :size="15" /></template>
        Hapus
      </v-btn>
      <v-btn
        size="small"
        variant="outlined"
        color="primary"
        :disabled="selected.length !== 1"
        @click="openPreview"
      >
        <template #prepend><IconEye :size="14" /></template>
        Preview
      </v-btn>
      <v-btn
        size="small"
        color="blue-grey-darken-2"
        :disabled="!selected.length"
        @click="openCloseDialog"
      >
        <template #prepend><IconLock :size="14" /></template>Close
      </v-btn>
      <v-btn
        size="small"
        color="teal-darken-2"
        :disabled="!selected.length"
        @click="openOpenDialog"
      >
        <template #prepend><IconLockOpen :size="14" /></template>Open
      </v-btn>
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
    </template>

    <template #item.Close="{ item }">
      <v-chip
        size="x-small"
        :color="item.Close === 'Y' ? 'grey' : 'success'"
        variant="flat"
        class="font-weight-bold"
      >
        {{ item.Close === "Y" ? "Closed" : "Open" }}
      </v-chip>
    </template>
    <template #item.TglAwal="{ item }">{{
      formatTanggal(item.TglAwal)
    }}</template>
    <template #item.TglAkhir="{ item }">{{
      formatTanggal(item.TglAkhir)
    }}</template>

    <!-- ── Expand: tabel detail SO periode ini ── -->
    <template #detail="{ item }">
      <div class="expand-wrap">
        <div v-if="detailLoading.has(item.Nomor)" class="expand-loading">
          <v-progress-circular indeterminate color="primary" size="20" />
          <span>Memuat detail...</span>
        </div>

        <table v-else-if="detailCache[item.Nomor]" class="dt">
          <thead>
            <tr>
              <th>Tanggal</th>
              <th>Nomor / Nama SO</th>
              <th class="tr">Pesan</th>
              <th class="tr">Kirim</th>
              <th class="tr">Kurang</th>
              <th class="tr">Rencana</th>
              <th class="tr">Realisasi</th>
              <th class="tc">Permintaan Kirim</th>
              <th class="tc">Permintaan</th>
              <th>Kesepakatan</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="d in detailCache[item.Nomor]"
              :key="d.PjwdId"
              :class="detailRowClass(d)"
            >
              <td>{{ formatTanggal(d.Tanggal) }}</td>
              <td>
                <div class="mono">{{ d.Nomor }}</div>
                <div>{{ d.Nama }}</div>
                <div v-if="d.NomorPraOrder" class="praorder-badge">
                  dari {{ d.NomorPraOrder }}
                </div>
              </td>
              <td class="tr">{{ fmt(d.Pesan) }}</td>
              <td class="tr">{{ fmt(d.Kirim) }}</td>
              <td class="tr" :class="{ 'text-red fw': Number(d.Kurang) > 0 }">
                {{ fmt(d.Kurang) }}
              </td>
              <td class="tr">{{ fmt(d.Rencana) }}</td>
              <td class="tr">{{ fmt(d.Realisasi) }}</td>
              <td class="tc">{{ formatTanggal(d.PermintaanKirim) }}</td>
              <td class="tc">
                <v-chip
                  size="x-small"
                  :color="d.StatusPermintaan === 'CLOSE' ? 'success' : 'grey'"
                  variant="flat"
                >
                  {{ d.StatusPermintaan }}
                </v-chip>
              </td>
              <td>
                <span v-if="d.Kesepakatan" class="kesepakatan-tgl">{{
                  formatTanggal(d.Kesepakatan)
                }}</span>
                <span v-if="d.KetKesepakatan" class="kesepakatan-ket">
                  — {{ d.KetKesepakatan }}</span
                >
                <span v-if="!d.Kesepakatan" class="text-grey">-</span>
              </td>
            </tr>
            <tr v-if="!detailCache[item.Nomor].length">
              <td colspan="10" class="empty-row">
                Belum ada SO ditambahkan di periode ini.
              </td>
            </tr>
          </tbody>
        </table>

        <div v-else class="expand-empty">Tidak ada data detail.</div>
      </div>
    </template>
  </BaseBrowse>

  <v-dialog v-model="showCloseDialog" max-width="380" persistent>
    <v-card class="rounded-lg">
      <v-card-title
        class="bg-blue-grey-darken-2 text-white pa-3 text-subtitle-1"
        >Konfirmasi Close Periode</v-card-title
      >
      <v-card-text class="pa-4"
        >Yakin ingin menutup periode <b>{{ selectedItem?.Nomor }}</b
        >?</v-card-text
      >
      <v-card-actions class="pa-3 border-t bg-grey-lighten-4">
        <v-btn variant="text" @click="showCloseDialog = false">Batal</v-btn>
        <v-spacer />
        <v-btn
          color="blue-grey-darken-2"
          variant="elevated"
          :loading="isActioning"
          @click="confirmClose"
          >Ya, Close</v-btn
        >
      </v-card-actions>
    </v-card>
  </v-dialog>

  <v-dialog v-model="showOpenDialog" max-width="380" persistent>
    <v-card class="rounded-lg">
      <v-card-title class="bg-teal-darken-2 text-white pa-3 text-subtitle-1"
        >Konfirmasi Buka Periode</v-card-title
      >
      <v-card-text class="pa-4"
        >Yakin ingin membuka periode <b>{{ selectedItem?.Nomor }}</b
        >?</v-card-text
      >
      <v-card-actions class="pa-3 border-t bg-grey-lighten-4">
        <v-btn variant="text" @click="showOpenDialog = false">Batal</v-btn>
        <v-spacer />
        <v-btn
          color="teal-darken-2"
          variant="elevated"
          :loading="isActioning"
          @click="confirmOpen"
          >Ya, Buka</v-btn
        >
      </v-card-actions>
    </v-card>
  </v-dialog>

  <v-dialog v-model="showDeleteDialog" max-width="380" persistent>
    <v-card class="rounded-lg">
      <v-card-title class="bg-error text-white pa-3 text-subtitle-1"
        >Konfirmasi Hapus</v-card-title
      >
      <v-card-text class="pa-4"
        >Yakin ingin menghapus periode <b>{{ selectedItem?.Nomor }}</b
        >? Data tidak bisa dipulihkan.</v-card-text
      >
      <v-card-actions class="pa-3 border-t bg-grey-lighten-4">
        <v-btn variant="text" @click="showDeleteDialog = false">Batal</v-btn>
        <v-spacer />
        <v-btn
          color="error"
          variant="elevated"
          :loading="isActioning"
          @click="confirmDelete"
          >Ya, Hapus</v-btn
        >
      </v-card-actions>
    </v-card>
  </v-dialog>

  <v-dialog v-model="showPreviewDialog" max-width="1150">
    <v-card class="rounded-lg">
      <v-card-title
        class="bg-primary text-white pa-3 text-subtitle-1 d-flex align-center justify-space-between"
      >
        <span>Preview Komitmen Kirim — {{ previewNomor }}</span>
        <v-btn
          icon
          size="small"
          variant="text"
          color="white"
          @click="showPreviewDialog = false"
        >
          <IconX :size="18" />
        </v-btn>
      </v-card-title>
      <v-card-text class="pa-0">
        <div v-if="previewLoading" class="expand-loading pa-4">
          <v-progress-circular indeterminate color="primary" size="20" />
          <span>Memuat detail...</span>
        </div>
        <table v-else class="dt" style="width: 100%">
          <thead>
            <tr>
              <th>Tanggal</th>
              <th>Sumber</th>
              <th>Nomor / Nama</th>
              <th class="tr">Pesan</th>
              <th class="tr">Kirim</th>
              <th class="tr">Kurang</th>
              <th class="tr">Rencana</th>
              <th class="tr">Realisasi</th>
              <th class="tc">Permintaan Kirim</th>
              <th class="tc">Permintaan</th>
              <th>Kesepakatan</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="d in previewDetail"
              :key="d.PjwdId"
              :class="detailRowClass(d)"
            >
              <td>{{ formatTanggal(d.Tanggal) }}</td>
              <td>
                <v-chip size="x-small" variant="tonal">{{ d.Sumber }}</v-chip>
              </td>
              <td>
                <div class="mono">
                  {{ d.Nomor || d.NomorPraOrder || d.NomorMap || "-" }}
                </div>
                <div>{{ d.Nama }}</div>
              </td>
              <td class="tr">{{ fmt(d.Pesan) }}</td>
              <td class="tr">{{ fmt(d.Kirim) }}</td>
              <td class="tr" :class="{ 'text-red fw': Number(d.Kurang) > 0 }">
                {{ fmt(d.Kurang) }}
              </td>
              <td class="tr">{{ fmt(d.Rencana) }}</td>
              <td class="tr">{{ fmt(d.Realisasi) }}</td>
              <td class="tc">{{ formatTanggal(d.PermintaanKirim) }}</td>
              <td class="tc">
                <v-chip
                  size="x-small"
                  :color="d.StatusPermintaan === 'CLOSE' ? 'success' : 'grey'"
                  variant="flat"
                >
                  {{ d.StatusPermintaan }}
                </v-chip>
              </td>
              <td>
                <span v-if="d.Kesepakatan" class="kesepakatan-tgl">{{
                  formatTanggal(d.Kesepakatan)
                }}</span>
                <span v-if="d.KetKesepakatan" class="kesepakatan-ket">
                  — {{ d.KetKesepakatan }}</span
                >
                <span v-if="!d.Kesepakatan" class="text-grey">-</span>
              </td>
            </tr>
            <tr v-if="!previewDetail.length">
              <td colspan="11" class="empty-row">
                Belum ada SO/MAP/Pra Order/Manual di periode ini.
              </td>
            </tr>
          </tbody>
        </table>
      </v-card-text>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.date-filter {
  display: flex;
  align-items: center;
  gap: 6px;
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  padding: 4px 10px;
}
.f-label {
  font-size: 11px;
  font-weight: 600;
  color: #424242;
  white-space: nowrap;
}
.f-date {
  height: 26px;
  border: 1px solid #ccc;
  border-radius: 4px;
  padding: 0 4px;
  font-size: 11px;
  outline: none;
  background: white;
}
.f-date:focus {
  border-color: #1976d2;
}
.f-select {
  height: 26px;
  border: 1px solid #ccc;
  border-radius: 4px;
  padding: 0 4px;
  font-size: 11px;
  outline: none;
  background: white;
}
.f-select:focus {
  border-color: #1976d2;
}
.f-sep {
  font-size: 11px;
  color: #757575;
}
.date-with-day {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1px;
}
.f-day {
  font-size: 10px;
  font-weight: 700;
  color: #1565c0;
  line-height: 1;
}

.expand-wrap {
  padding: 6px 6px 6px 48px;
  background: #eceff1;
  min-width: 0;
}
.expand-loading {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px;
  font-size: 12px;
  color: #555;
}
.expand-empty {
  text-align: center;
  color: #9e9e9e;
  font-style: italic;
  padding: 12px;
  font-size: 11px;
}

.dt {
  width: 100%;
  border-collapse: collapse;
  font-size: 11px;
  background: white;
}
.dt thead th {
  padding: 5px 8px;
  font-weight: 700;
  font-size: 10px;
  text-align: left;
  white-space: nowrap;
  background: #ffeb3b;
  color: #212121;
}
.dt tbody td {
  padding: 4px 8px;
  border-bottom: 1px solid #eee;
  vertical-align: top;
}
.dt tbody tr:nth-of-type(even) td {
  background: #fafafa;
}
.dt tbody tr:hover td {
  background: #e8f5e9 !important;
}
.dt tbody tr.row-done td {
  background: #e3f2fd;
}
.dt tbody tr.row-necessary td {
  background: #b71c1c !important;
  color: white;
  font-weight: 700;
}
.dt tbody tr.row-partial td {
  background: #fff3e0;
}

.tr {
  text-align: right !important;
}
.tc {
  text-align: center !important;
}
.fw {
  font-weight: bold;
}
.mono {
  font-weight: 700;
}
.empty-row {
  text-align: center;
  color: #9e9e9e;
  font-style: italic;
  padding: 12px;
  font-size: 11px;
}
.praorder-badge {
  display: inline-block;
  margin-top: 2px;
  font-size: 9px;
  background: #1565c0;
  color: white;
  padding: 1px 6px;
  border-radius: 8px;
}
.kesepakatan-tgl {
  font-weight: 700;
  color: #e65100;
}
.kesepakatan-ket {
  color: #757575;
}
</style>
