<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount } from "vue";
import { useToast } from "vue-toastification";
import axios from "axios";
import QRCode from "qrcode";
import { IconPrinter } from "@tabler/icons-vue";
import {
  cetakBarcodeKoliFormService as svc,
  type PrintUnit,
} from "@/services/garmen/cetakBarcodeKoliFormService";

interface KoliLabel {
  _k: number;
  koliId: string;
  spk: string;
  namaSpk: string;
  stbj: string;
  tgl: string;
  urut: number;
  cab: string;
  qrSvg: string;
}

const props = withDefaults(
  defineProps<{
    modelValue: boolean;
    nomor?: string; // nomor dokumen CBK
    koliIds?: string[]; // kosong = semua koli aktif dokumen
    units?: PrintUnit[]; // diisi = tanpa panggil backend (Tes Printer)
  }>(),
  { nomor: "", koliIds: () => [], units: undefined },
);
const emit = defineEmits<{ (e: "update:modelValue", v: boolean): void }>();

const toast = useToast();
const isOpen = computed({
  get: () => props.modelValue,
  set: (v: boolean) => emit("update:modelValue", v),
});

const labels = ref<KoliLabel[]>([]);
const isLoading = ref(false);
const areaRef = ref<HTMLElement | null>(null);
let loadSeq = 0; // buang hasil load yang basi (dialog ditutup/dibuka ulang)

const pesanError = (e: unknown, fallback: string): string =>
  axios.isAxiosError<{ message?: string }>(e)
    ? (e.response?.data?.message ?? fallback)
    : fallback;

// CSS label: SATU sumber untuk preview layar dan iframe cetak.
// Label 70 x 50 mm. QR 25 mm = 25 modul (21 + quiet zone 2x2) x 8 dot (203 dpi).
const LABEL_CSS = `
.kli-sheet { display:flex; flex-direction:column; align-items:center; }
.kli-sheet .kli-label { width:70mm; height:50mm; box-sizing:border-box; padding:2mm; background:#fff; color:#000; display:flex; flex-direction:column; overflow:hidden; font-family:Arial,Helvetica,sans-serif; }
.kli-sheet .kli-top { display:flex; height:25mm; gap:2mm; flex:none; }
.kli-sheet .kli-qr { flex:none; width:25mm; height:25mm; }
.kli-sheet .kli-qr svg { display:block; width:100%; height:100%; }
.kli-sheet .kli-right { flex:1; min-width:0; display:flex; flex-direction:column; justify-content:center; }
.kli-sheet .kli-cap { font:bold 7pt/3mm Arial,Helvetica,sans-serif; letter-spacing:0.3mm; }
.kli-sheet .kli-urut { font:bold 30pt/12mm Arial,Helvetica,sans-serif; white-space:nowrap; }
.kli-sheet .kli-meta { font:7pt/3mm Arial,Helvetica,sans-serif; white-space:nowrap; }
.kli-sheet .kli-nama { margin-top:1mm; height:7.4mm; overflow:hidden; font:bold 8pt/3.7mm Arial,Helvetica,sans-serif; display:-webkit-box; -webkit-line-clamp:2; line-clamp:2; -webkit-box-orient:vertical; word-break:break-word; }
.kli-sheet .kli-line { font:7.5pt/3.4mm Arial,Helvetica,sans-serif; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.kli-sheet .kli-bold { font-weight:bold; }
.kli-sheet .kli-id { font:bold 8pt/4mm 'Courier New',monospace; letter-spacing:0.2mm; }
`;

const PAGE_CSS = `
@page { size: 70mm 50mm; margin: 0 !important; }
html, body { margin:0; padding:0; width:70mm; background:#fff; -webkit-print-color-adjust:exact; print-color-adjust:exact; }
.kli-label:not(:last-child) { page-break-after: always !important; }
`;

let labelStyleEl: HTMLStyleElement | null = null;
onMounted(() => {
  labelStyleEl = document.createElement("style");
  labelStyleEl.textContent = LABEL_CSS;
  document.head.appendChild(labelStyleEl);
});
onBeforeUnmount(() => {
  labelStyleEl?.remove();
  labelStyleEl = null;
});

const fmtTgl = (iso: string) => {
  const [y, m, d] = (iso || "").split("-");
  return y && m && d ? `${d}/${m}/${y.slice(2)}` : "";
};

// QR vektor, margin 2 modul (quiet zone), EC M. Isi QR = ID koli saja.
const buatQrSvg = (isi: string) =>
  QRCode.toString(isi, { type: "svg", margin: 2, errorCorrectionLevel: "M" });

const buildLabels = (units: PrintUnit[]): Promise<KoliLabel[]> =>
  Promise.all(
    units.map(
      async (u, i): Promise<KoliLabel> => ({
        _k: i,
        koliId: u.koliId,
        spk: u.spk,
        namaSpk: u.namaSpk ?? "",
        stbj: u.stbj,
        tgl: fmtTgl(u.tanggal),
        urut: u.urut,
        cab: u.cab,
        qrSvg: await buatQrSvg(u.koliId),
      }),
    ),
  );

// Memanggil endpoint cetak = koli_cetak_count naik + tercatat di log,
// jadi dialog hanya boleh dibuka setelah user memutuskan mau mencetak.
const muat = async () => {
  const seq = ++loadSeq;
  labels.value = [];
  isLoading.value = true;
  try {
    let units: PrintUnit[];
    if (props.units) {
      units = props.units;
    } else {
      if (!props.nomor) throw new Error("Nomor dokumen kosong.");
      const res = await svc.cetakUlang(props.nomor, props.koliIds);
      units = res.data.data.units;
    }
    const hasil = await buildLabels(units);
    if (seq !== loadSeq) return;
    labels.value = hasil;
  } catch (e) {
    if (seq !== loadSeq) return;
    toast.error(pesanError(e, "Gagal memuat label koli."));
    isOpen.value = false;
  } finally {
    if (seq === loadSeq) isLoading.value = false;
  }
};

watch(
  () => props.modelValue,
  (open) => {
    if (open) muat();
    else loadSeq++;
  },
);

const cetak = () => {
  const content = areaRef.value;
  if (!content || !labels.value.length) return;
  const frame = document.createElement("iframe");
  frame.style.position = "fixed";
  frame.style.width = "70mm";
  frame.style.height = "50mm";
  frame.style.border = "none";
  frame.style.top = "-9999px";
  document.body.appendChild(frame);

  const doc = frame.contentWindow?.document;
  if (doc) {
    doc.open();
    doc.write(
      `<html><head><title>Cetak QR Koli</title><style>${LABEL_CSS}${PAGE_CSS}</style></head><body><div class="kli-sheet">${content.innerHTML}</div></body></html>`,
    );
    doc.close();
    setTimeout(() => {
      frame.contentWindow?.focus();
      frame.contentWindow?.print();
      setTimeout(() => document.body.removeChild(frame), 1500);
    }, 300);
  }
  isOpen.value = false;
};
</script>

<template>
  <v-dialog v-model="isOpen" max-width="460px" scrollable>
    <v-card>
      <v-toolbar color="primary" density="compact">
        <v-toolbar-title>Pratinjau Label Koli</v-toolbar-title>
        <v-spacer />
        <v-btn icon="mdi-close" size="small" @click="isOpen = false" />
      </v-toolbar>
      <v-card-text class="pa-4" style="background: #525659">
        <div v-if="isLoading" class="d-flex justify-center pa-6">
          <v-progress-circular indeterminate color="white" />
        </div>
        <div v-else ref="areaRef" class="kli-sheet kli-area">
          <div
            v-for="item in labels"
            :key="item._k"
            class="kli-label kli-preview-label"
          >
            <div class="kli-top">
              <!-- eslint-disable-next-line vue/no-v-html -->
              <div class="kli-qr" v-html="item.qrSvg"></div>
              <div class="kli-right">
                <div class="kli-cap">KOLI</div>
                <div class="kli-urut">{{ item.urut }}</div>
                <div class="kli-meta">{{ item.tgl }} · {{ item.cab }}</div>
              </div>
            </div>
            <div class="kli-nama">{{ item.namaSpk }}</div>
            <div class="kli-line kli-bold">{{ item.spk }}</div>
            <div class="kli-line">{{ item.stbj }}</div>
            <div class="kli-id">{{ item.koliId }}</div>
          </div>
        </div>
      </v-card-text>
      <v-card-actions class="pa-3 border-t">
        <v-spacer />
        <v-btn variant="text" @click="isOpen = false">Tutup</v-btn>
        <v-btn
          color="primary"
          :disabled="isLoading || !labels.length"
          @click="cetak"
        >
          <template #prepend><IconPrinter :size="15" /></template>Cetak
          {{ labels.length }} Label
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.kli-area {
  gap: 8px;
}
.kli-preview-label {
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.3);
}
</style>
