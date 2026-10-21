<script setup lang="ts">
import { ref, computed, watch } from "vue";
import { useRouter } from "vue-router";
import { useToast } from "vue-toastification";
import BaseBrowse from "@/components/BaseBrowse.vue";
import { IconNotes, IconTrash, IconFileExport } from "@tabler/icons-vue";
import { exportExcelSingle } from "@/utils/excelExport";
import { formatTanggal } from "@/utils/dateFormat";
import {
  notulensiMeetingService,
  pesanError,
  type NotulensiBrowseItem,
  type NotulensiDetailRow,
} from "@/services/tools/notulensiMeetingService";

interface RowCtx {
  item: NotulensiBrowseItem & { raw?: NotulensiBrowseItem };
}

const router = useRouter();
const toast = useToast();
const browseRef = ref<InstanceType<typeof BaseBrowse> | null>(null);

// ─── Helpers ──────────────────────────────────────────────
const pad = (n: number) => String(n).padStart(2, "0");
const toLocalDate = (d: Date) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

// ─── Filter (default: awal bulan ini s/d hari ini) ────────
const now = new Date();
const filterState = ref({
  start: toLocalDate(new Date(now.getFullYear(), now.getMonth(), 1)),
  end: toLocalDate(now),
});

const filterStart = computed({
  get: () => filterState.value.start,
  set: (v: string) => {
    filterState.value = { ...filterState.value, start: v };
  },
});
const filterEnd = computed({
  get: () => filterState.value.end,
  set: (v: string) => {
    filterState.value = { ...filterState.value, end: v };
  },
});

const onFilterStateRestored = (state: Record<string, unknown>) => {
  if (typeof state.start === "string") filterState.value.start = state.start;
  if (typeof state.end === "string") filterState.value.end = state.end;
};

// ─── State ────────────────────────────────────────────────
const items = ref<NotulensiBrowseItem[]>([]);
const isLoading = ref(false);
const selected = ref<NotulensiBrowseItem[]>([]);
const expandedRows = ref<NotulensiBrowseItem[]>([]);
const detailCache = ref<Record<string, NotulensiDetailRow[]>>({});
const detailLoading = ref<Set<string>>(new Set());

const showDeleteDialog = ref(false);
const isActioning = ref(false);
const selectedItem = ref<NotulensiBrowseItem | null>(null);
const isExportingDetail = ref(false);

// ─── Headers ──────────────────────────────────────────────
const headers = [
  { title: "NOMOR", key: "nomor", width: "190px" },
  { title: "TANGGAL", key: "tanggal", width: "100px", align: "center" },
  { title: "AGENDA", key: "agenda" },
  { title: "LOKASI", key: "lokasi", width: "160px" },
  {
    title: "TINDAK LANJUT",
    key: "jmlTindakLanjut",
    width: "110px",
    align: "center",
  },
  { title: "SELESAI", key: "jmlSelesai", width: "80px", align: "center" },
  { title: "TERLAMBAT", key: "jmlTerlambat", width: "90px", align: "center" },
  { title: "PEMBUAT", key: "pembuat", width: "90px", align: "center" },
];

// ─── Fetch ────────────────────────────────────────────────
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
    const res = await notulensiMeetingService.getBrowse({
      startDate: filterStart.value,
      endDate: filterEnd.value,
    });
    items.value = res.data.data ?? [];
  } catch (e) {
    toast.error(pesanError(e, "Gagal memuat data."));
  } finally {
    isLoading.value = false;
  }
};

// ─── Expand ───────────────────────────────────────────────
const handleExpand = async (newExpanded: NotulensiBrowseItem[]) => {
  const added = newExpanded.find((i) => !expandedRows.value.includes(i));
  expandedRows.value = newExpanded;
  if (!added) return;

  const nomor = added.nomor;
  if (detailCache.value[nomor]) return;

  detailLoading.value = new Set([...detailLoading.value, nomor]);
  try {
    const res = await notulensiMeetingService.getDetail(nomor);
    detailCache.value = {
      ...detailCache.value,
      [nomor]: res.data.data ?? [],
    };
  } catch (e) {
    toast.error(pesanError(e, `Gagal memuat detail ${nomor}.`));
  } finally {
    const s = new Set(detailLoading.value);
    s.delete(nomor);
    detailLoading.value = s;
  }
};

const WARNA_STATUS: Record<string, string> = {
  DONE: "success",
  PROGRESS: "primary",
  OPEN: "blue-grey",
  BATAL: "grey",
};
const warnaStatus = (s: string) => WARNA_STATUS[s] ?? "grey";

// ─── Row props: warnai TEKS (bukan latar) bila ada yang terlambat ───
const rowPropsFn = (data: RowCtx) => {
  const item = data.item.raw ?? data.item;
  if (item.jmlTerlambat > 0) {
    return {
      class: "font-weight-bold",
      style: "color: #c62828 !important;",
    };
  }
  return {};
};

// ─── Actions ──────────────────────────────────────────────
const handleAdd = () => router.push("/tools/notulensi-meeting/create");

const handleEdit = (item: NotulensiBrowseItem) => {
  if (!item.bisaUbah) {
    toast.warning(
      "Notulensi hanya bisa diubah oleh pembuat dokumen atau superadmin.",
    );
    return;
  }
  router.push(
    `/tools/notulensi-meeting/edit/${encodeURIComponent(item.nomor)}`,
  );
};

const handleCetak = (nomor: string) => {
  const url = router.resolve({
    name: "NotulensiMeetingPrint",
    params: { nomor },
  }).href;
  window.open(url, "_blank");
};

const openDeleteDialog = () => {
  if (!selected.value.length) return;
  selectedItem.value = selected.value[0];
  showDeleteDialog.value = true;
};

const confirmDelete = async () => {
  if (!selectedItem.value) return;
  isActioning.value = true;
  try {
    await notulensiMeetingService.deleteData(selectedItem.value.nomor);
    toast.success("Notulensi berhasil dihapus.");
    showDeleteDialog.value = false;
    fetchData();
  } catch (e) {
    toast.error(pesanError(e, "Gagal menghapus."));
  } finally {
    isActioning.value = false;
  }
};

// ─── Export ───────────────────────────────────────────────
// Data yang tampil di grid (search + filter kolom ikut dihitung)
const dataTampil = (): NotulensiBrowseItem[] =>
  (browseRef.value?.getFilteredItems() as NotulensiBrowseItem[] | undefined) ??
  items.value;

const doExportMaster = async () => {
  const rows = dataTampil();
  if (!rows.length) {
    toast.warning("Tidak ada data untuk diekspor.");
    return;
  }
  try {
    await exportExcelSingle(
      `NotulensiMeeting_${filterStart.value}_${filterEnd.value}.xlsx`,
      "Notulensi Meeting",
      [
        { header: "Nomor", key: "nomor", width: 20 },
        { header: "Tanggal", key: "tanggal", width: 12 },
        { header: "Agenda", key: "agenda", width: 40 },
        { header: "Lokasi", key: "lokasi", width: 22 },
        { header: "Peserta", key: "peserta", width: 40 },
        {
          header: "Tindak Lanjut",
          key: "jmlTindakLanjut",
          align: "right",
          numFmt: "#,##0",
        },
        {
          header: "Selesai",
          key: "jmlSelesai",
          align: "right",
          numFmt: "#,##0",
        },
        {
          header: "Terlambat",
          key: "jmlTerlambat",
          align: "right",
          numFmt: "#,##0",
        },
        { header: "Pembuat", key: "pembuat", width: 12 },
      ],
      rows.map((r) => ({
        nomor: r.nomor,
        tanggal: formatTanggal(r.tanggal),
        agenda: r.agenda,
        lokasi: r.lokasi,
        peserta: r.peserta ?? "",
        jmlTindakLanjut: r.jmlTindakLanjut,
        jmlSelesai: r.jmlSelesai,
        jmlTerlambat: r.jmlTerlambat,
        pembuat: r.pembuat,
      })),
    );
  } catch (e) {
    toast.error(pesanError(e, "Gagal export."));
  }
};

const doExportDetail = async () => {
  const nomorTampil = new Set(dataTampil().map((r) => r.nomor));
  if (!nomorTampil.size) {
    toast.warning("Tidak ada data untuk diekspor.");
    return;
  }
  isExportingDetail.value = true;
  try {
    const res = await notulensiMeetingService.getExportDetail({
      startDate: filterStart.value,
      endDate: filterEnd.value,
    });
    // ikuti search/filter grid: hanya nomor yang sedang tampil
    const rows = (res.data.data ?? []).filter((r) => nomorTampil.has(r.nomor));
    if (!rows.length) {
      toast.warning("Tidak ada tindak lanjut untuk diekspor.");
      return;
    }
    await exportExcelSingle(
      `NotulensiMeetingDetail_${filterStart.value}_${filterEnd.value}.xlsx`,
      "Detail Tindak Lanjut",
      [
        { header: "Nomor", key: "nomor", width: 20 },
        { header: "Tanggal", key: "tanggal", width: 12 },
        { header: "Agenda", key: "agenda", width: 36 },
        { header: "Lokasi", key: "lokasi", width: 20 },
        { header: "Peserta", key: "peserta", width: 36 },
        { header: "No", key: "noUrut", align: "right", width: 6 },
        { header: "Hasil / Tindak Lanjut", key: "hasil", width: 60 },
        { header: "PIC", key: "pic", width: 20 },
        { header: "Deadline", key: "deadline", width: 12 },
        { header: "Status User", key: "statusUser", width: 12 },
        { header: "Status Sistem", key: "statusSistem", width: 16 },
        { header: "Terlambat", key: "terlambat", width: 10 },
      ],
      rows.map((r) => ({
        nomor: r.nomor,
        tanggal: formatTanggal(r.tanggal),
        agenda: r.agenda,
        lokasi: r.lokasi,
        peserta: r.peserta ?? "",
        noUrut: r.noUrut,
        hasil: r.hasil,
        pic: r.pic,
        deadline: r.deadline ? formatTanggal(r.deadline) : "",
        statusUser: r.statusUser,
        statusSistem: r.statusSistem,
        terlambat: r.terlambat ? "YA" : "",
      })),
    );
  } catch (e) {
    toast.error(pesanError(e, "Gagal export detail."));
  } finally {
    isExportingDetail.value = false;
  }
};

// ─── Init ─────────────────────────────────────────────────
fetchData();
</script>

<template>
  <BaseBrowse
    ref="browseRef"
    title="Notulensi Meeting"
    menu-id="1328"
    :icon="IconNotes"
    :headers="headers"
    :items="items"
    :is-loading="isLoading"
    v-model:selected="selected"
    :expanded="expandedRows"
    @update:expanded="handleExpand"
    show-expand
    :can-insert="true"
    :can-edit="true"
    :can-delete="false"
    :can-export="true"
    item-value="nomor"
    :row-props-fn="rowPropsFn"
    :filter-state="filterState"
    @update:filter-state="onFilterStateRestored"
    @refresh="fetchData"
    @add="handleAdd"
    @edit="handleEdit"
    @export="doExportMaster"
  >
    <!-- ─── Filter ─── -->
    <template #filter-left>
      <div class="date-filter">
        <span class="f-label">Tanggal Meeting</span>
        <input type="date" v-model="filterStart" class="f-date" />
        <span class="f-sep">sd</span>
        <input type="date" v-model="filterEnd" class="f-date" />
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

    <!-- ─── Extra actions ─── -->
    <template #extra-actions="{ selected }">
      <v-btn
        size="small"
        color="error"
        :disabled="!selected.length || !selected[0].bisaUbah"
        :title="
          selected.length && !selected[0].bisaUbah
            ? 'Hanya pembuat dokumen atau superadmin yang dapat menghapus'
            : ''
        "
        @click="openDeleteDialog"
      >
        <template #prepend><IconTrash :size="15" /></template>
        Hapus
      </v-btn>
      <v-btn
        size="small"
        variant="tonal"
        color="primary"
        :disabled="selected.length !== 1"
        @click="handleCetak(selected[0].nomor)"
      >
        Cetak
      </v-btn>
      <v-btn
        size="small"
        color="green-darken-2"
        :loading="isExportingDetail"
        @click="doExportDetail"
      >
        <template #prepend><IconFileExport :size="14" /></template>Export Detail
      </v-btn>
    </template>

    <template #item.tanggal="{ item }">
      {{ formatTanggal(item.tanggal) }}
    </template>

    <!-- ─── Expand: peserta + tindak lanjut ─── -->
    <template #detail="{ item }">
      <div class="expand-wrap">
        <div v-if="detailLoading.has(item.nomor)" class="expand-loading">
          <v-progress-circular indeterminate color="primary" size="20" />
          <span>Memuat detail...</span>
        </div>

        <template v-else-if="detailCache[item.nomor]">
          <div v-if="item.peserta" class="expand-peserta">
            <b>Peserta:</b> {{ item.peserta }}
          </div>
          <table class="dt">
            <colgroup>
              <col style="width: 40px" />
              <col />
              <col style="width: 160px" />
              <col style="width: 150px" />
              <col style="width: 110px" />
              <col style="width: 110px" />
            </colgroup>
            <thead>
              <tr>
                <th style="width: 40px">NO</th>
                <th>HASIL / TINDAK LANJUT</th>
                <th style="width: 160px">PIC</th>
                <th style="width: 100px">DEADLINE</th>
                <th style="width: 190px">STATUS USER</th>
                <th style="width: 190px">STATUS SISTEM</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="d in detailCache[item.nomor]" :key="d.noUrut">
                <td>{{ d.noUrut }}</td>
                <td class="cell-wrap">{{ d.hasil }}</td>
                <td>{{ d.pic || "-" }}</td>
                <td>
                  <span :class="{ 'txt-late': d.terlambat }">{{
                    d.deadline ? formatTanggal(d.deadline) : "-"
                  }}</span>
                  <v-chip
                    v-if="d.terlambat"
                    size="x-small"
                    color="error"
                    variant="flat"
                    class="ml-1 font-weight-bold"
                  >
                    TERLAMBAT
                  </v-chip>
                </td>
                <td>
                  <v-chip
                    size="x-small"
                    :color="warnaStatus(d.statusUser)"
                    variant="flat"
                    class="font-weight-bold"
                  >
                    {{ d.statusUser }}
                  </v-chip>
                </td>
                <td>
                  <v-chip
                    size="x-small"
                    :color="warnaStatus(d.statusSistem)"
                    variant="flat"
                    class="font-weight-bold"
                  >
                    {{ d.statusSistem }}
                  </v-chip>
                </td>
              </tr>
              <tr v-if="!detailCache[item.nomor].length">
                <td colspan="6" class="empty-row">
                  &lt;Tidak ada tindak lanjut&gt;
                </td>
              </tr>
            </tbody>
          </table>
        </template>

        <div v-else class="expand-empty">Tidak ada data detail.</div>
      </div>
    </template>
  </BaseBrowse>

  <!-- ─── Dialog Delete ─── -->
  <v-dialog v-model="showDeleteDialog" max-width="400" persistent>
    <v-card class="rounded-lg">
      <v-card-title class="bg-error text-white pa-3 text-subtitle-1">
        Konfirmasi Hapus
      </v-card-title>
      <v-card-text class="pa-4">
        Yakin ingin menghapus notulensi <b>{{ selectedItem?.nomor }}</b
        >? Seluruh tindak lanjutnya ikut terhapus dan tidak bisa dipulihkan.
      </v-card-text>
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
</template>

<style scoped>
/* ─── Filter ─── */
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
.f-sep {
  font-size: 11px;
  color: #757575;
}

/* ─── Expand ─── */
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
.expand-peserta {
  font-size: 11px;
  color: #37474f;
  padding: 2px 2px 6px;
  white-space: pre-wrap;
}

/* ─── Detail table ─── */
.dt {
  table-layout: fixed;
  width: 100%;
  min-width: 900px;
}
.expand-wrap .dt tbody td.cell-wrap {
  white-space: pre-wrap !important;
  overflow: visible !important;
  text-overflow: clip !important;
  max-width: none !important;
  height: auto !important;
  word-break: break-word;
  line-height: 1.4;
}
.expand-wrap .dt tbody td {
  height: auto !important;
  vertical-align: top;
}
.dt thead th {
  padding: 4px 8px;
  font-weight: 700;
  font-size: 10px;
  text-align: left;
  white-space: nowrap;
  background: #546e7a;
  color: white;
}
.dt tbody td {
  padding: 3px 8px;
  border-bottom: 1px solid #eee;
  white-space: nowrap;
  vertical-align: top;
}
.dt td.cell-wrap {
  white-space: pre-wrap;
  min-width: 300px;
  max-width: 560px;
}
.dt tbody tr:nth-of-type(even) td {
  background: #fafafa;
}
.dt tbody tr:hover td {
  background: #e8f5e9 !important;
}
.empty-row {
  text-align: center;
  color: #9e9e9e;
  font-style: italic;
  padding: 10px;
  font-size: 11px;
}
.txt-late {
  color: #c62828;
  font-weight: 700;
}
</style>
