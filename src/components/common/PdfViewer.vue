<script setup lang="ts">
import { ref, watch, onMounted, onBeforeUnmount, nextTick } from "vue";
import { IconZoomIn, IconZoomOut } from "@tabler/icons-vue";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";
import PdfWorker from "pdfjs-dist/legacy/build/pdf.worker.min.mjs?worker";
import type {
  PDFDocumentLoadingTask,
  PDFDocumentProxy,
  RenderTask,
} from "pdfjs-dist/types/src/display/api";

const props = defineProps<{ data: ArrayBuffer | null }>();
const emit = defineEmits<{ (e: "error", pesan: string): void }>();

const wrap = ref<HTMLDivElement | null>(null);
const jumlahHalaman = ref(0);
const zoom = ref(1); // 1 = pas lebar area
const isRendering = ref(false);

let doc: PDFDocumentProxy | null = null;
let loadingTask: PDFDocumentLoadingTask | null = null;
let task: RenderTask | null = null;
let renderId = 0;
let ro: ResizeObserver | null = null;
let lastW = 0;
let timer: ReturnType<typeof setTimeout> | undefined;

const render = async () => {
  const container = wrap.value;
  if (!doc || !container) return;
  const myId = ++renderId;
  task?.cancel();
  isRendering.value = true;
  container.replaceChildren();
  const lebar = Math.max(container.clientWidth - 24, 200);
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  try {
    for (let n = 1; n <= doc.numPages; n++) {
      const page = await doc.getPage(n);
      if (myId !== renderId) return;
      const dasar = page.getViewport({ scale: 1 });
      const skala = (lebar / dasar.width) * zoom.value;
      const vp = page.getViewport({ scale: skala * dpr });
      const canvas = document.createElement("canvas");
      canvas.className = "pv-page";
      canvas.width = Math.floor(vp.width);
      canvas.height = Math.floor(vp.height);
      canvas.style.width = `${Math.floor(vp.width / dpr)}px`;
      canvas.style.height = `${Math.floor(vp.height / dpr)}px`;
      container.appendChild(canvas);
      task = page.render({ canvas, viewport: vp });
      await task.promise;
    }
  } catch {
    // render dibatalkan karena zoom/ukuran berubah: abaikan; selain itu lapor
    if (myId === renderId) emit("error", "PDF tidak dapat ditampilkan.");
  } finally {
    if (myId === renderId) isRendering.value = false;
  }
};

const buangDokumen = async () => {
  task?.cancel();
  task = null;
  const lt = loadingTask;
  loadingTask = null;
  doc = null;
  await lt?.destroy();
};

const load = async (buf: ArrayBuffer | null) => {
  renderId++;
  await buangDokumen();
  jumlahHalaman.value = 0;
  wrap.value?.replaceChildren();
  if (!buf) return;
  try {
    // getDocument memindahkan buffer ke worker, jadi kirim salinan
    // worker baru per dokumen: loadingTask.destroy() mematikan worker-nya,
    // jadi worker lama tidak boleh dipakai ulang
    pdfjsLib.GlobalWorkerOptions.workerPort = new PdfWorker();
    const lt = pdfjsLib.getDocument({ data: new Uint8Array(buf.slice(0)) });
    loadingTask = lt;
    const hasil = await lt.promise;
    if (loadingTask !== lt) return; // dokumen diganti saat masih memuat
    doc = hasil;
    jumlahHalaman.value = hasil.numPages;
    await nextTick();
    await render();
  } catch {
    emit("error", "PDF tidak dapat dibaca.");
  }
};

const ubahZoom = (delta: number) => {
  zoom.value = Math.min(3, Math.max(0.5, +(zoom.value + delta).toFixed(2)));
};

watch(
  () => props.data,
  (buf) => void load(buf),
);
watch(zoom, () => void render());

onMounted(() => {
  void load(props.data);
  if (!wrap.value) return;
  // Tablet diputar / dialog berubah ukuran: render ulang pas lebar baru
  ro = new ResizeObserver(() => {
    const w = wrap.value?.clientWidth ?? 0;
    if (w === lastW) return;
    lastW = w;
    clearTimeout(timer);
    timer = setTimeout(() => void render(), 200);
  });
  ro.observe(wrap.value);
});

onBeforeUnmount(() => {
  renderId++;
  clearTimeout(timer);
  ro?.disconnect();
  void buangDokumen();
});
</script>

<template>
  <div class="pv-root">
    <div class="pv-toolbar">
      <button
        type="button"
        class="pv-btn"
        title="Perkecil"
        @click="ubahZoom(-0.25)"
      >
        <IconZoomOut :size="14" :stroke-width="2" />
      </button>
      <span class="pv-zoom">{{ Math.round(zoom * 100) }}%</span>
      <button
        type="button"
        class="pv-btn"
        title="Perbesar"
        @click="ubahZoom(0.25)"
      >
        <IconZoomIn :size="14" :stroke-width="2" />
      </button>
      <span class="pv-info">
        {{ isRendering ? "Memuat halaman..." : `${jumlahHalaman} halaman` }}
      </span>
    </div>
    <div ref="wrap" class="pv-scroll" />
  </div>
</template>

<style scoped>
.pv-root {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  font-size: 11px;
}
.pv-toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  border-bottom: 1px solid #eeeeee;
  background: #fafafa;
  flex-shrink: 0;
}
.pv-btn {
  width: 28px;
  height: 28px;
  border: 1.5px solid #e0e0e0;
  border-radius: 6px;
  background: white;
  color: #424242;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}
.pv-btn:hover {
  background: #f5f5f5;
}
.pv-zoom {
  min-width: 38px;
  text-align: center;
  font-weight: 600;
  color: #424242;
}
.pv-info {
  margin-left: auto;
  color: #9e9e9e;
}
.pv-scroll {
  flex: 1;
  min-height: 0;
  overflow: auto;
  scrollbar-gutter: stable;
  background: #eceff1;
  padding: 12px;
}
/* canvas dibuat lewat JS, jadi butuh :deep agar scoped style terbaca */
.pv-scroll :deep(.pv-page) {
  display: block;
  margin: 0 auto 10px;
  background: white;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.18);
}
</style>
