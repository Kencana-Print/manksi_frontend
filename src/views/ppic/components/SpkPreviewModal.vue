<script setup lang="ts">
import { ref, computed, watch, nextTick, onBeforeUnmount } from "vue";
import { useToast } from "vue-toastification";
import { IconX } from "@tabler/icons-vue";
import { spkFormService } from "@/services/ppic/spkFormService";

const props = defineProps<{ modelValue: boolean; nomor: string }>();
const emit = defineEmits<{ (e: "update:modelValue", v: boolean): void }>();

interface SpkHeaderMini {
  spk_nomor?: string;
  spk_cab?: string;
  spk_cab2?: string;
}
type PrintFormat = "p01" | "spanduk" | "baru";

const toast = useToast();
const open = computed({
  get: () => props.modelValue,
  set: (v: boolean) => emit("update:modelValue", v),
});

const ready = ref(false);
const printFormat = ref<PrintFormat>("spanduk");
const containerEl = ref<HTMLElement | null>(null);
const iframeEl = ref<HTMLIFrameElement | null>(null);
const contentHeight = ref(1123);
const scale = ref(1);
const manualZoom = ref<number | null>(null);
let resizeObserver: ResizeObserver | null = null;

const MIN_ZOOM = 0.25;
const MAX_ZOOM = 3;
const ZOOM_STEP = 0.1;

const pageWidth = computed(() => {
  if (printFormat.value === "p01") return 1047;
  if (printFormat.value === "spanduk") return 1123;
  return 793;
});
const isLandscape = computed(() => printFormat.value !== "baru");
const zoomPercent = computed(() => Math.round(scale.value * 100));

// Aturan sama dengan SpkPrintView
const tentukanFormat = (h: SpkHeaderMini): PrintFormat => {
  const cabs = [h.spk_cab, h.spk_cab2];
  if (cabs.some((c) => c === "P02" || c === "P05")) return "spanduk";
  const legacy = !!h.spk_nomor && !String(h.spk_nomor).startsWith("SPK-");
  if (cabs.includes("P01") || legacy) return "p01";
  return "baru";
};

const recompute = () => {
  if (manualZoom.value !== null) {
    scale.value = manualZoom.value;
    return;
  }
  const el = containerEl.value;
  if (!el) return;
  const availW = el.clientWidth - 24;
  const availH = el.clientHeight - 24;
  if (availW < 50 || availH < 50) return;
  const fit = Math.min(
    availW / pageWidth.value,
    availH / contentHeight.value,
    MAX_ZOOM,
  );
  scale.value = fit > 0 ? fit : 1;
};

const zoomIn = () => {
  manualZoom.value = Math.min(
    MAX_ZOOM,
    +((manualZoom.value ?? scale.value) + ZOOM_STEP).toFixed(2),
  );
  recompute();
};
const zoomOut = () => {
  manualZoom.value = Math.max(
    MIN_ZOOM,
    +((manualZoom.value ?? scale.value) - ZOOM_STEP).toFixed(2),
  );
  recompute();
};
const zoomFit = () => {
  manualZoom.value = null;
  recompute();
};
const onWheel = (e: WheelEvent) => {
  if (!e.ctrlKey && !e.metaKey) return;
  e.preventDefault();
  if (e.deltaY < 0) zoomIn();
  else zoomOut();
};

const onMessage = (e: MessageEvent) => {
  if (e.source !== iframeEl.value?.contentWindow) return;
  if (e.data?.type === "spk-print-ready" && typeof e.data.height === "number") {
    contentHeight.value = e.data.height > 0 ? e.data.height : 1123;
    recompute();
  }
};

const blokirCetak = (e: KeyboardEvent) => {
  const key = e.key.toLowerCase();
  if ((e.ctrlKey || e.metaKey) && (key === "p" || key === "s")) {
    e.preventDefault();
    toast.warning("Mode Preview — dokumen ini tidak dapat dicetak/disimpan.");
  }
};

const lepas = () => {
  window.removeEventListener("message", onMessage);
  window.removeEventListener("keydown", blokirCetak, true);
  resizeObserver?.disconnect();
  resizeObserver = null;
};

watch(
  () => props.modelValue,
  async (isOpen) => {
    if (!isOpen) {
      lepas();
      ready.value = false;
      manualZoom.value = null;
      return;
    }
    window.addEventListener("message", onMessage);
    window.addEventListener("keydown", blokirCetak, true);
    contentHeight.value = 1123;
    manualZoom.value = null;
    ready.value = false;
    try {
      const res = await spkFormService.getDetail(props.nomor);
      printFormat.value = tentukanFormat(res.data.data?.header ?? {});
    } catch {
      toast.error("Gagal memuat data SPK untuk preview.");
      open.value = false;
      return;
    }
    ready.value = true;
    await nextTick();
    if (containerEl.value) {
      resizeObserver = new ResizeObserver(() => recompute());
      resizeObserver.observe(containerEl.value);
    }
    recompute();
  },
);

onBeforeUnmount(lepas);
</script>

<template>
  <v-dialog v-model="open" max-width="99vw" scrollable @contextmenu.prevent>
    <v-card
      rounded="lg"
      :style="{
        height: '96vh',
        width: isLandscape ? '97vw' : '75vw',
        maxWidth: '99vw',
        minWidth: '420px',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        margin: '0 auto',
      }"
    >
      <v-card-title class="bg-primary text-white pa-3 flex-shrink-0">
        <div class="d-flex align-center justify-space-between">
          <span class="spm-title">Preview SPK: {{ nomor }}</span>
          <div class="d-flex align-center">
            <div class="spm-zoom">
              <button class="spm-zbtn" title="Perkecil" @click="zoomOut">
                −
              </button>
              <button class="spm-zpct" title="Sesuaikan layar" @click="zoomFit">
                {{ zoomPercent }}%
              </button>
              <button class="spm-zbtn" title="Perbesar" @click="zoomIn">
                +
              </button>
            </div>
            <v-btn
              variant="text"
              size="small"
              color="white"
              density="comfortable"
              @click="open = false"
            >
              <IconX :size="18" />
            </v-btn>
          </div>
        </div>
      </v-card-title>
      <div ref="containerEl" class="spm-body" @wheel="onWheel">
        <div
          v-if="ready"
          :style="{
            width: pageWidth + 'px',
            height: contentHeight + 'px',
            transform: `scale(${scale})`,
            transformOrigin: 'top left',
            flexShrink: 0,
          }"
        >
          <iframe
            ref="iframeEl"
            :key="nomor"
            :src="`/ppic/spk/print/${encodeURIComponent(nomor)}?preview=1`"
            :style="{
              width: pageWidth + 'px',
              height: contentHeight + 'px',
              border: 'none',
              display: 'block',
            }"
            title="Preview SPK"
          />
        </div>
        <div v-else class="spm-loading">Memuat...</div>
      </div>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.spm-title {
  font-size: 11px;
  font-weight: 700;
}
.spm-body {
  flex: 1;
  min-height: 0;
  background: #616161;
  overflow: auto;
  display: flex;
  justify-content: center;
  padding: 6px;
}
.spm-loading {
  color: white;
  font-size: 11px;
  align-self: center;
}
.spm-zoom {
  display: flex;
  gap: 2px;
  margin-right: 8px;
  background: rgba(255, 255, 255, 0.12);
  border-radius: 4px;
  padding: 2px;
}
.spm-zbtn,
.spm-zpct {
  height: 22px;
  border: none;
  background: transparent;
  color: white;
  border-radius: 3px;
  cursor: pointer;
  font-size: 11px;
  font-weight: 700;
}
.spm-zbtn {
  width: 22px;
}
.spm-zpct {
  min-width: 44px;
}
.spm-zbtn:hover,
.spm-zpct:hover {
  background: rgba(255, 255, 255, 0.2);
}
</style>
