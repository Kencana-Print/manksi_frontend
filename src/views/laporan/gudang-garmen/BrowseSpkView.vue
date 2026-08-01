<script setup lang="ts">
import { ref, onMounted, watch, computed, nextTick } from "vue";
import { useToast } from "vue-toastification";
import BaseBrowse from "@/components/BaseBrowse.vue";
import { useBrowse } from "@/composables/useBrowse";
import {
  browseSpkService,
  type PrintPermission,
} from "@/services/laporan/gudang-garmen/browseSpkService";
import { exportExcelSingle } from "@/utils/excelExport";
import {
  IconClipboardList,
  IconPrinter,
  IconEye,
  IconX,
} from "@tabler/icons-vue";

const toast = useToast();
const menuId = "527";

const toLocalDateStr = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const today = new Date();
const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
const dtAwal = ref(toLocalDateStr(firstDayOfMonth));
const dtAkhir = ref(toLocalDateStr(today));

const { items, isLoading, selected, canExport, selectedItem, fetchData } =
  useBrowse({
    menuId,
    fetchApi: async () => {
      const res = await browseSpkService.getBrowse(dtAwal.value, dtAkhir.value);
      return res.data.data;
    },
    immediate: true,
  });

watch([dtAwal, dtAkhir], fetchData);

const headers = [
  { title: "Nomor", key: "Nomor", width: "130px", fixed: true },
  { title: "Tanggal", key: "Tanggal", width: "100px", align: "center" },
  { title: "Dateline", key: "Dateline", width: "100px", align: "center" },
  { title: "MAP", key: "MAP", width: "130px" },
  { title: "PO", key: "PO", width: "140px" },
  { title: "Tipe", key: "Tipe", width: "80px" },
  { title: "Divisi", key: "Divisi", width: "70px" },
  { title: "Cab", key: "Cab", width: "60px", align: "center" },
  { title: "Workshop", key: "Workshop", width: "100px" },
  { title: "Jenis Order", key: "JoNama", width: "120px" },
  { title: "Nama SPK", key: "NamaSPK", width: "260px" },
  { title: "Jumlah", key: "Jumlah", width: "90px", align: "right" },
  { title: "Ukuran", key: "Ukuran", width: "160px" },
  { title: "Kain", key: "Kain", width: "140px" },
  { title: "Gramasi", key: "Gramasi", width: "90px" },
  { title: "Finishing", key: "Finishing", width: "160px" },
  { title: "Keterangan", key: "Keterangan", width: "200px" },
];

const numFmt = (v: any) => (v ? Number(v).toLocaleString("id-ID") : "0");
const formatTgl = (v: string) => {
  if (!v) return "-";
  const s = String(v).substring(0, 10);
  const [y, m, d] = s.split("-");
  if (!y || !m || !d) return v;
  return `${d}/${m}/${y}`;
};

// ── Export ──
const onExport = async () => {
  if (!items.value?.length)
    return toast.warning("Tidak ada data untuk diekspor.");
  await exportExcelSingle(
    `Browse_SPK_${dtAwal.value}_${dtAkhir.value}.xlsx`,
    "Browse SPK",
    [
      { header: "Nomor", key: "Nomor", width: 16 },
      { header: "Tanggal", key: "Tanggal", width: 12, align: "center" },
      { header: "Dateline", key: "Dateline", width: 12, align: "center" },
      { header: "MAP", key: "MAP", width: 16 },
      { header: "PO", key: "PO", width: 18 },
      { header: "Tipe", key: "Tipe", width: 10 },
      { header: "Divisi", key: "Divisi", width: 8 },
      { header: "Cab", key: "Cab", width: 8 },
      { header: "Workshop", key: "Workshop", width: 12 },
      { header: "Jenis Order", key: "JoNama", width: 14 },
      { header: "Nama SPK", key: "NamaSPK", width: 32 },
      {
        header: "Jumlah",
        key: "Jumlah",
        width: 12,
        align: "right",
        numFmt: "#,##0.00",
      },
      { header: "Ukuran", key: "Ukuran", width: 22 },
      { header: "Kain", key: "Kain", width: 18 },
      { header: "Gramasi", key: "Gramasi", width: 12 },
      { header: "Finishing", key: "Finishing", width: 22 },
      { header: "Keterangan", key: "Keterangan", width: 28 },
    ],
    items.value,
    `Browse SPK Periode ${dtAwal.value} s/d ${dtAkhir.value}`,
  );
};

// ── Cetak SPK Cutting — sama persis alur/dialog dengan SpkView.vue ──
const showPrintApprovalDialog = ref(false);
const printApprovalAlasan = ref("");
const printCheckInfo = ref<PrintPermission | null>(null);

const onPrint = async () => {
  if (!selectedItem.value) return;
  const nomor = selectedItem.value.Nomor;
  try {
    const res = await browseSpkService.getPrintPermission(nomor);
    const info = res.data.data;
    if (!info.allowed) {
      printCheckInfo.value = info;
      if (info.approvalStatus === "WAIT") {
        toast.info("Pengajuan cetak ulang masih menunggu approval manager.");
        return;
      }
      if (info.approvalStatus === "TOLAK") {
        toast.error(
          "Pengajuan cetak ulang sebelumnya DITOLAK. Ajukan ulang jika perlu.",
        );
      } else {
        toast.warning(
          `SPK ini sudah pernah dicetak (${info.count}x). Cetak berikutnya butuh approval manager.`,
        );
      }
      printApprovalAlasan.value = "";
      showPrintApprovalDialog.value = true;
      return;
    }
    window.open(`/ppic/spk/print/${encodeURIComponent(nomor)}`, "_blank");
    await browseSpkService.recordPrint(nomor);
    fetchData();
  } catch (e: any) {
    toast.error(e.response?.data?.message || "Gagal memeriksa izin cetak.");
  }
};

const submitPrintApproval = async () => {
  if (!selectedItem.value) return;
  try {
    await browseSpkService.requestPrintApproval(
      selectedItem.value.Nomor,
      printApprovalAlasan.value,
    );
    toast.success("Pengajuan approval cetak ulang berhasil dikirim.");
    showPrintApprovalDialog.value = false;
  } catch (e: any) {
    toast.error(e.response?.data?.message || "Gagal mengirim pengajuan.");
  }
};

// ── Preview Cetak (embed, bukan tab baru) — sama persis alur dengan SpkView.vue ──
const showPreviewDialog = ref(false);
const previewNomor = ref("");
const onPreviewCetak = () => {
  if (!selectedItem.value) return;
  previewNomor.value = selectedItem.value.Nomor;
  showPreviewDialog.value = true;
};

const blockPrintShortcutParent = (e: KeyboardEvent) => {
  if (!showPreviewDialog.value) return;
  const key = e.key.toLowerCase();
  if ((e.ctrlKey || e.metaKey) && (key === "p" || key === "s")) {
    e.preventDefault();
    toast.warning("Mode Preview — dokumen ini tidak dapat dicetak/disimpan.");
  }
};

const previewContainerEl = ref<HTMLElement | null>(null);
const previewIframeEl = ref<HTMLIFrameElement | null>(null);
const previewScale = ref(1);
const previewContentHeight = ref(1123);
let previewResizeObserver: ResizeObserver | null = null;
const PAGE_WIDTH_PX = 793;

const recomputePreviewScale = () => {
  const el = previewContainerEl.value;
  if (!el) return;
  const w = el.clientWidth - 24;
  if (w < 50) return;
  const scale = Math.min(w / PAGE_WIDTH_PX, 1);
  previewScale.value = scale > 0 ? scale : 1;
};

const onPreviewIframeLoad = () => {
  const iframe = previewIframeEl.value;
  if (!iframe?.contentDocument) return;
  const h = iframe.contentDocument.documentElement.scrollHeight;
  previewContentHeight.value = h > 0 ? h : 1123;
};

const previewWrapperStyle = computed(() => ({
  width: `${PAGE_WIDTH_PX}px`,
  height: `${previewContentHeight.value}px`,
  transform: `scale(${previewScale.value})`,
  transformOrigin: "top left",
}));

watch(showPreviewDialog, async (open) => {
  if (open) {
    window.addEventListener("keydown", blockPrintShortcutParent, true);
    previewContentHeight.value = 1123;
    await nextTick();
    if (previewContainerEl.value) {
      previewResizeObserver = new ResizeObserver(() => recomputePreviewScale());
      previewResizeObserver.observe(previewContainerEl.value);
    }
    recomputePreviewScale();
  } else {
    window.removeEventListener("keydown", blockPrintShortcutParent, true);
    previewResizeObserver?.disconnect();
    previewResizeObserver = null;
    previewNomor.value = "";
  }
});

onMounted(fetchData);
</script>

<template>
  <BaseBrowse
    title="Browse SPK"
    :menu-id="menuId"
    :icon="IconClipboardList"
    :headers="headers"
    :items="items ?? []"
    :is-loading="isLoading"
    v-model:selected="selected"
    :can-export="canExport"
    item-value="Nomor"
    @refresh="fetchData"
    @export="onExport"
  >
    <template #filter-left>
      <div class="f-group">
        <span class="f-label">Periode</span>
        <input type="date" v-model="dtAwal" class="f-date" />
        <span class="f-sep">s/d</span>
        <input type="date" v-model="dtAkhir" class="f-date" />
      </div>
    </template>

    <template #item.Tanggal="{ item }">{{ formatTgl(item.Tanggal) }}</template>
    <template #item.Dateline="{ item }">{{
      formatTgl(item.Dateline)
    }}</template>
    <template #item.Jumlah="{ item }">{{ numFmt(item.Jumlah) }}</template>

    <template #extra-actions="{ selected }">
      <v-btn
        size="small"
        color="grey-darken-3"
        :disabled="selected.length === 0"
        @click="onPrint"
      >
        <template #prepend><IconPrinter :size="15" /></template>Cetak SPK
        Cutting
      </v-btn>
      <v-btn
        size="small"
        color="deep-purple-darken-1"
        :disabled="selected.length === 0"
        @click="onPreviewCetak"
      >
        <template #prepend><IconEye :size="15" /></template>Preview Cetak
      </v-btn>
    </template>
  </BaseBrowse>

  <v-dialog v-model="showPrintApprovalDialog" max-width="400">
    <v-card rounded="lg">
      <v-card-title class="bg-warning text-white pa-3 text-subtitle-1">
        Cetak Ulang Butuh Approval
      </v-card-title>
      <v-card-text class="pa-4">
        <p class="text-caption mb-2">
          SPK <b>{{ selectedItem?.Nomor }}</b> sudah pernah dicetak
          <b>{{ printCheckInfo?.count }}x</b>. Ajukan approval ke Manager untuk
          mencetak lagi.
        </p>
        <v-textarea
          v-model="printApprovalAlasan"
          label="Alasan cetak ulang"
          variant="outlined"
          density="compact"
          rows="3"
          hide-details
          autofocus
        />
      </v-card-text>
      <v-card-actions class="pa-3 border-t">
        <v-spacer />
        <v-btn variant="text" @click="showPrintApprovalDialog = false"
          >Tutup</v-btn
        >
        <v-btn color="warning" variant="elevated" @click="submitPrintApproval">
          Ajukan Approval
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <!-- Dialog Preview Cetak SPK (embed, bukan tab baru) -->
  <v-dialog
    v-model="showPreviewDialog"
    max-width="98vw"
    scrollable
    @contextmenu.prevent
  >
    <v-card
      rounded="lg"
      style="
        height: 90vh;
        width: 850px;
        max-width: 96vw;
        min-width: 420px;
        min-height: 320px;
        display: flex;
        flex-direction: column;
        resize: both;
        overflow: hidden;
        margin: 0 auto;
      "
    >
      <v-card-title
        class="bg-primary text-white pa-3 flex-shrink-0"
        style="cursor: default"
      >
        <div class="d-flex align-center justify-space-between">
          <span class="text-subtitle-2 font-weight-bold"
            >Preview Cetak SPK: {{ previewNomor }}</span
          >
          <v-btn
            variant="text"
            size="small"
            color="white"
            density="comfortable"
            @click="showPreviewDialog = false"
          >
            <IconX :size="18" />
          </v-btn>
        </div>
        <div class="text-caption" style="opacity: 0.75; line-height: 1.2">
          ↘ Seret pojok kanan-bawah untuk mengubah ukuran jendela
        </div>
      </v-card-title>
      <div
        ref="previewContainerEl"
        style="
          flex: 1;
          min-height: 0;
          background: #616161;
          overflow-y: auto;
          overflow-x: hidden;
          display: flex;
          justify-content: center;
          padding: 12px;
        "
      >
        <div :style="previewWrapperStyle" style="flex-shrink: 0">
          <iframe
            v-if="showPreviewDialog && previewNomor"
            ref="previewIframeEl"
            :key="previewNomor"
            :src="`/ppic/spk/print/${encodeURIComponent(previewNomor)}?preview=1`"
            :style="{
              width: PAGE_WIDTH_PX + 'px',
              height: previewContentHeight + 'px',
              border: 'none',
              display: 'block',
            }"
            title="Preview Cetak SPK"
            @load="onPreviewIframeLoad"
          />
        </div>
      </div>
    </v-card>
  </v-dialog>
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
  outline: none;
  background: white;
}
.f-sep {
  font-size: 11px;
  color: #555;
}
</style>
