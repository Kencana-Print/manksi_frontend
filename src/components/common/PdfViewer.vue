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
  // posisi baca (proporsi) dipulihkan setelah render ulang
  const rasioY =
    container.scrollHeight > 0
      ? container.scrollTop / container.scrollHeight
      : 0;
  const rasioX =
    container.scrollWidth > 0
      ? container.scrollLeft / container.scrollWidth
      : 0;
  const lebar = Math.max(container.clientWidth - 24, 200);
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  // digambar di luar layar dulu, ditukar sekaligus agar tidak berkedip/meloncat
  const frag = document.createDocumentFragment();
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
      const cssW = Math.floor(vp.width / dpr);
      const cssH = Math.floor(vp.height / dpr);
      canvas.style.width = `${cssW}px`;
      canvas.style.height = `${cssH}px`;
      canvas.dataset.w = String(cssW);
      canvas.dataset.h = String(cssH);
      frag.appendChild(canvas);
      task = page.render({ canvas, viewport: vp });
      await task.promise;
    }
    if (myId !== renderId) return;
    container.replaceChildren(frag);
    container.scrollTop = rasioY * container.scrollHeight;
    container.scrollLeft = rasioX * container.scrollWidth;
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

// Ctrl + scroll = zoom; scroll biasa tetap menggulung halaman
const onWheel = (e: WheelEvent) => {
  if (!e.ctrlKey) return;
  e.preventDefault();
  ubahZoom(e.deltaY < 0 ? 0.1 : -0.1);
};

// Ctrl +, Ctrl -, Ctrl 0 (menggantikan zoom halaman browser selama viewer terbuka)
const onKey = (e: KeyboardEvent) => {
  if (!(e.ctrlKey || e.metaKey)) return;
  if (e.key === "+" || e.key === "=") {
    e.preventDefault();
    ubahZoom(0.25);
  } else if (e.key === "-") {
    e.preventDefault();
    ubahZoom(-0.25);
  } else if (e.key === "0") {
    e.preventDefault();
    zoom.value = 1;
  }
};

// ── Pinch dua jari (tablet) ──
interface PinchState {
  jarak: number; // jarak dua jari di awal
  zoom: number; // zoom saat pinch dimulai
  x: number; // posisi scroll (proporsi) di awal
  y: number;
  akhir: number; // zoom hasil gerakan terakhir
}
let pinch: PinchState | null = null;

const jarakJari = (t: TouchList): number => {
  const a = t.item(0);
  const b = t.item(1);
  if (!a || !b) return 0;
  return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
};

const onTouchStart = (e: TouchEvent) => {
  const el = wrap.value;
  if (!el || e.touches.length !== 2) return;
  const jarak = jarakJari(e.touches);
  if (jarak === 0) return;
  pinch = {
    jarak,
    zoom: zoom.value,
    x: el.scrollWidth > 0 ? el.scrollLeft / el.scrollWidth : 0,
    y: el.scrollHeight > 0 ? el.scrollTop / el.scrollHeight : 0,
    akhir: zoom.value,
  };
};

const onTouchMove = (e: TouchEvent) => {
  const el = wrap.value;
  if (!pinch || !el || e.touches.length !== 2) return;
  e.preventDefault();
  const baru = Math.min(
    3,
    Math.max(0.5, pinch.zoom * (jarakJari(e.touches) / pinch.jarak)),
  );
  // umpan balik langsung: skalakan halaman yang sudah tergambar (belum tajam)
  const rasio = baru / pinch.zoom;
  el.querySelectorAll<HTMLCanvasElement>("canvas.pv-page").forEach((c) => {
    c.style.width = `${Number(c.dataset.w) * rasio}px`;
    c.style.height = `${Number(c.dataset.h) * rasio}px`;
  });
  el.scrollLeft = pinch.x * el.scrollWidth;
  el.scrollTop = pinch.y * el.scrollHeight;
  pinch.akhir = +baru.toFixed(2);
};

// Jari dilepas: simpan zoom, render ulang tajam lewat watch(zoom)
const onTouchEnd = (e: TouchEvent) => {
  if (!pinch || e.touches.length >= 2) return;
  zoom.value = pinch.akhir;
  pinch = null;
};

watch(
  () => props.data,
  (buf) => void load(buf),
);
watch(zoom, () => {
  clearTimeout(timer);
  timer = setTimeout(() => void render(), 150);
});

onMounted(() => {
  void load(props.data);
  window.addEventListener("keydown", onKey);
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
  window.removeEventListener("keydown", onKey);
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
      <span class="pv-zoom" title="Klik untuk 100% (Ctrl+0)" @click="zoom = 1"
        >{{ Math.round(zoom * 100) }}%</span
      >
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
    <div
      ref="wrap"
      class="pv-scroll"
      @wheel="onWheel"
      @touchstart="onTouchStart"
      @touchmove="onTouchMove"
      @touchend="onTouchEnd"
      @touchcancel="onTouchEnd"
    />
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
  cursor: pointer;
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
  touch-action: pan-x pan-y;
}
/* canvas dibuat lewat JS, jadi butuh :deep agar scoped style terbaca */
.pv-scroll :deep(.pv-page) {
  display: block;
  margin: 0 auto 10px;
  background: white;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.18);
}
</style>
