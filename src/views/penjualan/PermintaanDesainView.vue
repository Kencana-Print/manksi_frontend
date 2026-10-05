<script setup lang="ts">
import { ref, computed, onMounted, watch } from "vue";
import { useRouter } from "vue-router";
import { useToast } from "vue-toastification";
import { useAuthStore } from "@/stores/authStore";
import BaseBrowse from "@/components/BaseBrowse.vue";
import { useBrowse } from "@/composables/useBrowse";
import { permintaanDesainService as svc } from "@/services/penjualan/permintaanDesainService";
import { exportExcelSingle } from "@/utils/excelExport";
import {
  IconPalette,
  IconEdit,
  IconFileExport,
  IconListDetails,
  IconPaperclip,
  IconTrash,
  IconPrinter,
  IconBan,
  IconRefresh,
  IconSearch,
} from "@tabler/icons-vue";
import { getFileUrl } from "@/utils/fileUrl";
import PermintaanDesainSearchModal from "@/components/lookups/PermintaanDesainSearchModal.vue";

const router = useRouter();
const toast = useToast();
const authStore = useAuthStore();

const isDesain = computed(
  () => (authStore.user?.bagian || "").toUpperCase() === "DESAIN",
);

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
const statusFilter = ref("");
const jenisFilter = ref("");

const filterState = computed(() => ({
  tglAwal: tglAwal.value,
  tglAkhir: tglAkhir.value,
  statusFilter: statusFilter.value,
  jenisFilter: jenisFilter.value,
}));
const onFilterStateRestore = (val: any) => {
  if (val?.tglAwal) tglAwal.value = val.tglAwal;
  if (val?.tglAkhir) tglAkhir.value = val.tglAkhir;
  if (val?.statusFilter != null) statusFilter.value = val.statusFilter;
  if (val?.jenisFilter != null) jenisFilter.value = val.jenisFilter;
};

const baseBrowseRef = ref<InstanceType<typeof BaseBrowse> | null>(null);

const { items, isLoading, selected, canInsert, fetchData } = useBrowse({
  menuId: "184",
  fetchApi: async () => {
    const res = await svc.getBrowse({
      startDate: tglAwal.value,
      endDate: tglAkhir.value,
      status: statusFilter.value || undefined,
      jenisPekerjaan: jenisFilter.value || undefined,
    });
    return res.data.data ?? [];
  },
});

const selectedItem = computed(() => selected.value[0] ?? null);

watch([tglAwal, tglAkhir, statusFilter, jenisFilter], fetchData);
onMounted(fetchData);

const headers = [
  { title: "Nomor", key: "Nomor", width: "150px" },
  { title: "Tanggal", key: "Tanggal", width: "100px" },
  { title: "Nama Project", key: "NamaProject", minWidth: "180px" },
  { title: "Customer", key: "Customer", minWidth: "160px" },
  { title: "Jenis", key: "JenisPekerjaan", width: "100px" },
  { title: "Dateline", key: "Dateline", width: "100px" },
  { title: "Prioritas", key: "Prioritas", width: "110px" },
  { title: "Desainer", key: "Desainer", width: "130px" },
  { title: "Jml", key: "Jml", width: "70px", align: "right" },
  { title: "Jadi", key: "JmlJadi", width: "70px", align: "right" },
  { title: "Status", key: "Status", width: "110px" },
  { title: "Marketing", key: "NamaMarketing", width: "130px" },
];

const STATUS_LABEL: Record<string, { label: string; bg: string; fg: string }> =
  {
    OPEN: { label: "Open", bg: "#e3f2fd", fg: "#1565c0" },
    PROGRESS: { label: "Progress", bg: "#fff3e0", fg: "#e65100" },
    CLOSE: { label: "Close", bg: "#e8f5e9", fg: "#2e7d32" },
    PENDING: { label: "Pending", bg: "#eeeeee", fg: "#757575" },
    CANCEL: { label: "Cancel", bg: "#eeeeee", fg: "#9e9e9e" },
    CANCEL_ALT: { label: "Cancel Alt", bg: "#eeeeee", fg: "#9e9e9e" },
  };
const MANUAL_STATUSES = ["PENDING", "CANCEL", "CANCEL_ALT"];
const PRIORITAS_LABEL: Record<
  string,
  { label: string; bg: string; fg: string }
> = {
  NORMAL: { label: "Normal", bg: "#f5f5f5", fg: "#616161" },
  URGENT: { label: "Urgent", bg: "#fff3e0", fg: "#e65100" },
  "TOP URGENT": { label: "Top Urgent", bg: "#ffebee", fg: "#c62828" },
};

// ── Highlight baris berdasar deadline ──
const rowStyleFn = (data: any) => {
  const item = data.item?.raw || data.item;
  if (!item) return {};
  if (MANUAL_STATUSES.includes(item.Status)) {
    return { style: "opacity: 0.5" };
  }
  if (item.Status === "CLOSE" || !item.Dateline) return {};
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dl = new Date(item.Dateline);
  const diffDays = Math.floor((dl.getTime() - today.getTime()) / 86400000);
  if (diffDays < 0) return { style: "color: #c62828; font-weight: 700" };
  if (diffDays <= 1) return { style: "color: #e65100; font-weight: 600" };
  return {};
};

// ── Expand detail item per PD ──
const expandedRows = ref<any[]>([]);
const detailCache = ref<Record<string, any[]>>({});
const detailLoading = ref<Record<string, boolean>>({});

const onUpdateExpanded = async (newExpanded: any[]) => {
  expandedRows.value = newExpanded;
  const newlyExpanded = newExpanded.filter(
    (item) =>
      !detailCache.value[item.Nomor] && !detailLoading.value[item.Nomor],
  );
  for (const item of newlyExpanded) {
    const nomor = item.Nomor;
    detailLoading.value[nomor] = true;
    try {
      const res = await svc.getDetail(nomor);
      detailCache.value[nomor] = res.data.data?.detail ?? [];
    } catch {
      toast.error(`Gagal memuat detail ${nomor}`);
    } finally {
      detailLoading.value[nomor] = false;
    }
  }
};

// ── Dialog Lampiran ──
const showLampiranDialog = ref(false);
const lampiranNomor = ref("");
const lampiranItems = ref<any[]>([]);
const isLoadingLampiran = ref(false);
const isUploadingLampiran = ref(false);
const lampiranFileInput = ref<HTMLInputElement | null>(null);

const openLampiranDialog = async () => {
  if (!selectedItem.value) return;
  lampiranNomor.value = selectedItem.value.Nomor;
  showLampiranDialog.value = true;
  await fetchLampiran();
};

const fetchLampiran = async () => {
  isLoadingLampiran.value = true;
  try {
    const res = await svc.getLampiran(lampiranNomor.value);
    lampiranItems.value = res.data.data ?? [];
  } catch {
    toast.error("Gagal memuat lampiran.");
  } finally {
    isLoadingLampiran.value = false;
  }
};

const onLampiranFileChange = async (e: Event) => {
  const input = e.target as HTMLInputElement;
  if (!input.files?.length) return;
  isUploadingLampiran.value = true;
  try {
    await svc.addLampiran(lampiranNomor.value, Array.from(input.files));
    toast.success("Lampiran berhasil diupload.");
    await fetchLampiran();
  } catch (err: any) {
    toast.error(err.response?.data?.message || "Gagal upload lampiran.");
  } finally {
    isUploadingLampiran.value = false;
    if (lampiranFileInput.value) lampiranFileInput.value.value = "";
  }
};

const deleteLampiranItem = async (id: number) => {
  try {
    await svc.deleteLampiran(id);
    toast.success("Lampiran dihapus.");
    await fetchLampiran();
  } catch {
    toast.error("Gagal menghapus lampiran.");
  }
};

const goCreate = () => router.push({ name: "PermintaanDesainCreate" });

const openPrint = () => {
  if (!selectedItem.value) return;
  window.open(
    `/penjualan/permintaan-desain/print/${encodeURIComponent(selectedItem.value.Nomor)}`,
    "_blank",
  );
};

const tglFmt = (v: any) => {
  if (!v) return "-";
  const d = new Date(v);
  if (isNaN(d.getTime())) return v;
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
};

const isExporting = ref(false);
const isExportingDetail = ref(false);

const onExport = async () => {
  const data = baseBrowseRef.value?.getFilteredItems?.() ?? items.value ?? [];
  if (!data.length) {
    toast.warning("Tidak ada data untuk diexport.");
    return;
  }
  isExporting.value = true;
  try {
    const rows = data.map((r: any) => ({
      Nomor: r.Nomor,
      Tanggal: tglFmt(r.Tanggal),
      NamaProject: r.NamaProject,
      Customer: r.Customer || "-",
      JenisPekerjaan: r.JenisPekerjaan,
      Dateline: tglFmt(r.Dateline),
      Prioritas: PRIORITAS_LABEL[r.Prioritas]?.label || r.Prioritas,
      Desainer: r.Desainer || "-",
      Jml: Number(r.Jml) || 0,
      JmlJadi: Number(r.JmlJadi) || 0,
      Status: STATUS_LABEL[r.Status]?.label || r.Status,
      Marketing: r.NamaMarketing,
    }));
    await exportExcelSingle(
      `PermintaanDesain_${tglAwal.value}_${tglAkhir.value}`,
      "Permintaan Desain",
      [
        { header: "Nomor", key: "Nomor" },
        { header: "Tanggal", key: "Tanggal" },
        { header: "Nama Project", key: "NamaProject" },
        { header: "Customer", key: "Customer" },
        { header: "Jenis Pekerjaan", key: "JenisPekerjaan" },
        { header: "Dateline", key: "Dateline" },
        { header: "Prioritas", key: "Prioritas" },
        { header: "Desainer", key: "Desainer" },
        { header: "Jml", key: "Jml", align: "right" },
        { header: "Jml Jadi", key: "JmlJadi", align: "right" },
        { header: "Status", key: "Status" },
        { header: "Marketing", key: "Marketing" },
      ],
      rows,
    );
  } catch {
    toast.error("Gagal export.");
  } finally {
    isExporting.value = false;
  }
};

const onExportDetail = async () => {
  const masters =
    baseBrowseRef.value?.getFilteredItems?.() ?? items.value ?? [];
  if (!masters.length) {
    toast.warning("Tidak ada data untuk diexport.");
    return;
  }
  isExportingDetail.value = true;
  try {
    const results = await Promise.all(
      masters.map((h: any) =>
        svc
          .getDetail(h.Nomor)
          .then((res: any) => ({
            header: h,
            items: res.data?.data?.detail ?? [],
          }))
          .catch(() => ({ header: h, items: [] })),
      ),
    );

    const combinedRows: any[] = [];
    results.forEach(({ header, items: dtl }) => {
      const masterCells = {
        Nomor: header.Nomor,
        Tanggal: tglFmt(header.Tanggal),
        NamaProject: header.NamaProject,
        Customer: header.Customer || "-",
        JenisPekerjaan: header.JenisPekerjaan,
        Status: STATUS_LABEL[header.Status]?.label || header.Status,
      };
      const blankMaster = Object.fromEntries(
        Object.keys(masterCells).map((k) => [k, ""]),
      );

      if (!dtl.length) {
        combinedRows.push({ ...masterCells, ItemDesain: "", ItemJml: "" });
        return;
      }

      dtl.forEach((d: any, idx: number) => {
        combinedRows.push({
          ...(idx === 0 ? masterCells : blankMaster),
          ItemDesain: d.pd2_pd_desain,
          ItemJml: Number(d.pd2_pd_jml) || 0,
        });
      });
    });

    await exportExcelSingle(
      `PermintaanDesain_Detail_${tglAwal.value}_${tglAkhir.value}`,
      "Detail",
      [
        { header: "Nomor", key: "Nomor" },
        { header: "Tanggal", key: "Tanggal" },
        { header: "Nama Project", key: "NamaProject" },
        { header: "Customer", key: "Customer" },
        { header: "Jenis Pekerjaan", key: "JenisPekerjaan" },
        { header: "Status", key: "Status" },
        { header: "Nama Desain", key: "ItemDesain" },
        { header: "Jumlah", key: "ItemJml", align: "right" },
      ],
      combinedRows,
    );
  } catch {
    toast.error("Gagal export detail.");
  } finally {
    isExportingDetail.value = false;
  }
};

// ── Dialog Update Progress (Tim Desain) ──
const showProgressDialog = ref(false);
const progressNomor = ref("");
const progressJml = ref(0);
const progressJmlJadi = ref(0);
const isSavingProgress = ref(false);

const openProgressDialog = () => {
  if (!selectedItem.value) return;
  progressNomor.value = selectedItem.value.Nomor;
  progressJml.value = Number(selectedItem.value.Jml);
  progressJmlJadi.value = Number(selectedItem.value.JmlJadi);
  showProgressDialog.value = true;
};

const saveProgress = async () => {
  isSavingProgress.value = true;
  try {
    if (authStore.user?.kode !== (selectedItem.value?.DesainerKode || "")) {
      await svc.updateDesainer(progressNomor.value, authStore.user!.kode);
    }
    await svc.updateProgress(progressNomor.value, progressJmlJadi.value);
    toast.success("Progress berhasil diupdate.");
    showProgressDialog.value = false;
    fetchData();
  } catch (e: any) {
    toast.error(e.response?.data?.message || "Gagal update progress.");
  } finally {
    isSavingProgress.value = false;
  }
};

const isSelectedManual = computed(() =>
  selectedItem.value
    ? MANUAL_STATUSES.includes(selectedItem.value.Status)
    : false,
);

const showStatusDialog = ref(false);
const showStatusReferensiModal = ref(false);
const statusNomor = ref("");
const statusValue = ref("PENDING");
const statusKeterangan = ref("");
const statusReferensi = ref("");
const isSavingStatus = ref(false);
const isResumingStatus = ref(false);

const openStatusDialog = () => {
  if (!selectedItem.value) return;
  statusNomor.value = selectedItem.value.Nomor;
  statusValue.value = "PENDING";
  statusKeterangan.value = "";
  statusReferensi.value = "";
  showStatusDialog.value = true;
};

const onStatusReferensiSelected = (item: any) => {
  statusReferensi.value = item.Nomor;
};

const saveStatusManual = async () => {
  if (!statusKeterangan.value.trim()) {
    toast.error("Keterangan wajib diisi.");
    return;
  }
  if (statusValue.value === "CANCEL_ALT" && !statusReferensi.value) {
    toast.error("PD terkait wajib dipilih untuk status Cancel Alt.");
    return;
  }
  isSavingStatus.value = true;
  try {
    await svc.setStatusManual(statusNomor.value, {
      status: statusValue.value,
      keterangan: statusKeterangan.value.trim(),
      referensi:
        statusValue.value === "CANCEL_ALT" ? statusReferensi.value : undefined,
    });
    toast.success("Status berhasil diubah.");
    showStatusDialog.value = false;
    fetchData();
  } catch (e: any) {
    toast.error(e.response?.data?.message || "Gagal mengubah status.");
  } finally {
    isSavingStatus.value = false;
  }
};

const resumeSelected = async () => {
  if (!selectedItem.value) return;
  isResumingStatus.value = true;
  try {
    await svc.resumeStatus(selectedItem.value.Nomor);
    toast.success("PD diaktifkan kembali.");
    fetchData();
  } catch (e: any) {
    toast.error(e.response?.data?.message || "Gagal mengaktifkan kembali.");
  } finally {
    isResumingStatus.value = false;
  }
};

// ── Edit PD (non-Desain) ──
const canEditPD = computed(() => {
  const it = selectedItem.value;
  if (!it) return false;
  const bagian = (authStore.user?.bagian || "").toUpperCase();
  if (["EDP", "IT"].includes(bagian)) return true;
  if (bagian === "DESAIN") return false;
  const kode = authStore.user?.kode;
  return it.Marketing === kode || it.UserCreate === kode;
});

const isSelectedClosed = computed(() => selectedItem.value?.Status === "CLOSE");

const openEdit = () => {
  if (!selectedItem.value) return;
  router.push({
    name: "PermintaanDesainEdit",
    params: { nomor: selectedItem.value.Nomor },
  });
};
</script>

<template>
  <BaseBrowse
    ref="baseBrowseRef"
    title="Permintaan Desain"
    menu-id="184"
    :icon="IconPalette"
    :headers="headers"
    :items="items ?? []"
    :is-loading="isLoading"
    item-value="Nomor"
    :can-insert="canInsert"
    :can-edit="false"
    :can-delete="false"
    :can-export="false"
    select-strategy="single"
    v-model:selected="selected"
    :filter-state="filterState"
    @update:filter-state="onFilterStateRestore"
    @add="goCreate"
    @refresh="fetchData"
    :row-props-fn="rowStyleFn"
    show-expand
    :expanded="expandedRows"
    @update:expanded="onUpdateExpanded"
  >
    <template #filter-left>
      <label class="flbl">Tanggal</label>
      <input type="date" v-model="tglAwal" class="finp" />
      <span class="fsep">s.d.</span>
      <input type="date" v-model="tglAkhir" class="finp" />
      <select v-model="statusFilter" class="finp">
        <option value="">Semua Status</option>
        <option value="OPEN">Open</option>
        <option value="PROGRESS">Progress</option>
        <option value="CLOSE">Close</option>
        <option value="PENDING">Pending</option>
        <option value="CANCEL">Cancel</option>
        <option value="CANCEL_ALT">Cancel Alt</option>
      </select>
      <select v-model="jenisFilter" class="finp">
        <option value="">Semua Jenis</option>
        <option value="BARU">Baru</option>
        <option value="REVISI">Revisi</option>
        <option value="CEK">Cek</option>
        <option value="PLOTTER">Plotter</option>
        <option value="EDIT">Edit</option>
      </select>
    </template>

    <template #extra-actions>
      <v-btn
        v-if="canEditPD"
        size="small"
        color="orange-darken-2"
        :disabled="!selectedItem || isSelectedManual || isSelectedClosed"
        @click="openEdit"
      >
        <template #prepend><IconEdit :size="15" /></template>
        Edit
      </v-btn>
      <v-btn
        v-if="isDesain"
        size="small"
        color="teal"
        :disabled="!selectedItem || isSelectedManual"
        @click="openProgressDialog"
      >
        <template #prepend><IconEdit :size="15" /></template>
        Update Progress
      </v-btn>
      <v-btn
        size="small"
        color="grey-darken-1"
        :disabled="!selectedItem || isSelectedManual"
        @click="openStatusDialog"
      >
        <template #prepend><IconBan :size="15" /></template>
        Set Status
      </v-btn>
      <v-btn
        v-if="isSelectedManual"
        size="small"
        color="primary"
        :disabled="!selectedItem"
        :loading="isResumingStatus"
        @click="resumeSelected"
      >
        <template #prepend><IconRefresh :size="15" /></template>
        Aktifkan Kembali
      </v-btn>
      <v-btn
        size="small"
        color="indigo"
        :disabled="!selectedItem"
        @click="openPrint"
      >
        <template #prepend><IconPrinter :size="15" /></template>
        Cetak
      </v-btn>
      <v-btn
        size="small"
        variant="outlined"
        color="success"
        :loading="isExporting"
        @click="onExport"
      >
        <template #prepend><IconFileExport :size="15" /></template>
        Export
      </v-btn>
      <v-btn
        size="small"
        variant="outlined"
        color="success"
        :loading="isExportingDetail"
        @click="onExportDetail"
      >
        <template #prepend><IconListDetails :size="15" /></template>
        Export Detail
      </v-btn>
      <v-btn
        size="small"
        color="indigo"
        :disabled="!selectedItem"
        @click="openLampiranDialog"
      >
        <template #prepend><IconPaperclip :size="15" /></template>
        Lampiran
      </v-btn>
    </template>

    <template #item.Status="{ item }">
      <v-chip
        size="x-small"
        :style="{
          backgroundColor: STATUS_LABEL[item.Status]?.bg,
          color: STATUS_LABEL[item.Status]?.fg,
        }"
        class="font-weight-bold"
      >
        {{ STATUS_LABEL[item.Status]?.label || item.Status }}
      </v-chip>
    </template>

    <template #item.Prioritas="{ item }">
      <v-chip
        size="x-small"
        :style="{
          backgroundColor: PRIORITAS_LABEL[item.Prioritas]?.bg,
          color: PRIORITAS_LABEL[item.Prioritas]?.fg,
        }"
        class="font-weight-bold"
      >
        {{ PRIORITAS_LABEL[item.Prioritas]?.label || item.Prioritas }}
      </v-chip>
    </template>

    <template #detail="{ item }">
      <div class="pd-detail-wrap">
        <v-progress-linear
          v-if="detailLoading[item.Nomor]"
          indeterminate
          color="primary"
          height="2"
        />
        <table v-else-if="detailCache[item.Nomor]" class="pd-detail-table">
          <thead>
            <tr>
              <th>Nama Desain</th>
              <th style="width: 100px">Jumlah</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(d, i) in detailCache[item.Nomor]" :key="i">
              <td>{{ d.pd2_pd_desain }}</td>
              <td class="tr">{{ d.pd2_pd_jml }}</td>
            </tr>
            <tr v-if="!detailCache[item.Nomor]?.length">
              <td colspan="2" class="tc" style="color: #999">
                Tidak ada item.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>
  </BaseBrowse>

  <v-dialog v-model="showProgressDialog" max-width="380px" persistent>
    <v-card class="rounded-lg">
      <v-card-title
        class="pa-3 bg-primary text-white"
        style="font-size: 13px; font-weight: 700"
      >
        Update Progress — {{ progressNomor }}
      </v-card-title>
      <v-card-text class="pa-4">
        <label class="status-lbl">Jumlah Jadi (dari {{ progressJml }})</label>
        <input
          type="number"
          v-model.number="progressJmlJadi"
          class="status-inp"
          :min="0"
          :max="progressJml"
        />
      </v-card-text>
      <v-card-actions class="pa-3 border-t">
        <v-btn variant="text" size="small" @click="showProgressDialog = false"
          >Batal</v-btn
        >
        <v-spacer />
        <v-btn
          variant="flat"
          size="small"
          color="primary"
          :loading="isSavingProgress"
          @click="saveProgress"
        >
          Simpan
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <v-dialog v-model="showStatusDialog" max-width="420px" persistent>
    <v-card class="rounded-lg">
      <v-card-title
        class="pa-3 bg-primary text-white"
        style="font-size: 13px; font-weight: 700"
      >
        Set Status Manual — {{ statusNomor }}
      </v-card-title>
      <v-card-text class="pa-4">
        <v-select
          v-model="statusValue"
          :items="[
            { title: 'Pending', value: 'PENDING' },
            { title: 'Cancel', value: 'CANCEL' },
            { title: 'Cancel Alt', value: 'CANCEL_ALT' },
          ]"
          item-title="title"
          item-value="value"
          label="Status"
          variant="outlined"
          density="compact"
          class="mb-3"
          hide-details
        />
        <div v-if="statusValue === 'CANCEL_ALT'" class="lookup-field mb-3">
          <label class="lookup-label">PD Terkait (wajib)</label>
          <div
            class="lookup-input-wrap"
            @click="showStatusReferensiModal = true"
          >
            <span :class="{ 'text-grey': !statusReferensi }">
              {{ statusReferensi || "Pilih PD pasangan yang sudah di-ACC..." }}
            </span>
            <IconSearch :size="15" :stroke-width="1.7" />
          </div>
        </div>
        <v-textarea
          v-model="statusKeterangan"
          label="Keterangan (wajib)"
          variant="outlined"
          density="compact"
          rows="3"
          hide-details
        />
      </v-card-text>
      <v-card-actions class="pa-3 border-t">
        <v-btn
          variant="text"
          size="small"
          @click="showStatusDialog = false"
          :disabled="isSavingStatus"
          >Batal</v-btn
        >
        <v-spacer />
        <v-btn
          variant="flat"
          size="small"
          color="primary"
          :loading="isSavingStatus"
          @click="saveStatusManual"
        >
          Simpan
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <PermintaanDesainSearchModal
    v-model="showStatusReferensiModal"
    @selected="onStatusReferensiSelected"
  />

  <v-dialog v-model="showLampiranDialog" max-width="480px">
    <v-card class="rounded-lg">
      <v-card-title
        class="pa-3 bg-primary text-white"
        style="font-size: 13px; font-weight: 700"
      >
        Lampiran — {{ lampiranNomor }}
      </v-card-title>
      <v-card-text class="pa-4">
        <input
          ref="lampiranFileInput"
          type="file"
          multiple
          accept="image/*,application/pdf"
          @change="onLampiranFileChange"
          class="mb-3"
        />
        <v-progress-linear
          v-if="isUploadingLampiran"
          indeterminate
          color="primary"
          class="mb-2"
        />

        <v-progress-linear
          v-if="isLoadingLampiran"
          indeterminate
          color="primary"
          class="mb-2"
        />
        <div v-else-if="!lampiranItems.length" class="text-caption text-grey">
          Belum ada lampiran.
        </div>
        <div v-else class="lampiran-list">
          <div v-for="f in lampiranItems" :key="f.id" class="lampiran-row">
            <a
              :href="getFileUrl(f.url)"
              target="_blank"
              class="lampiran-link"
              >{{ f.originalName }}</a
            >
            <v-btn
              icon
              size="x-small"
              variant="text"
              color="error"
              @click="deleteLampiranItem(f.id)"
            >
              <IconTrash :size="14" />
            </v-btn>
          </div>
        </div>
      </v-card-text>
      <v-card-actions class="pa-3 border-t">
        <v-spacer />
        <v-btn variant="text" size="small" @click="showLampiranDialog = false"
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
.fsep {
  font-size: 11px;
  color: #777;
}
.status-lbl {
  font-size: 11px;
  font-weight: 600;
  color: #444;
  display: block;
  margin-bottom: 4px;
}
.status-inp {
  width: 100%;
  height: 28px;
  border: 1px solid #bdbdbd;
  border-radius: 4px;
  padding: 0 8px;
  font-size: 12px;
  outline: none;
}
.status-inp:focus {
  border-color: #1565c0;
}
.mt8 {
  margin-top: 8px;
}

.pd-detail-wrap {
  padding: 8px 16px 12px;
  background: #f5f7fb;
}
.pd-detail-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 11px;
  background: white;
  border-radius: 4px;
  overflow: hidden;
}
.pd-detail-table thead th {
  background: #37474f;
  color: white;
  padding: 6px 10px;
  text-align: left;
}
.pd-detail-table tbody td {
  padding: 5px 10px;
  border-bottom: 1px solid #eee;
}
.lampiran-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.lampiran-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  border: 1px solid #eee;
  border-radius: 4px;
  padding: 6px 10px;
}
.lampiran-link {
  font-size: 12px;
  color: #1565c0;
  text-decoration: none;
}
.lookup-field {
  display: flex;
  flex-direction: column;
}
.lookup-label {
  font-size: 10px;
  color: #666;
  margin-bottom: 4px;
}
.lookup-input-wrap {
  display: flex;
  align-items: center;
  justify-content: space-between;
  border: 1px solid #ccc;
  border-radius: 4px;
  padding: 8px 10px;
  cursor: pointer;
  font-size: 12px;
  background: white;
}
.lookup-input-wrap:hover {
  border-color: #1565c0;
}
</style>
