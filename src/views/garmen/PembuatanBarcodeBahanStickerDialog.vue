<script setup lang="ts">
import { ref, computed } from "vue";
import QrcodeVue from "qrcode.vue";
import { IconX, IconPrinter } from "@tabler/icons-vue";

const props = defineProps<{
  modelValue: boolean;
  barcodes: { kode: string; nama: string; barcode: string; jumlah: number }[];
  satuan?: string;
  tanggal?: string;
  po?: string;
}>();

const emit = defineEmits(["update:modelValue"]);

const isOpen = computed({
  get: () => props.modelValue,
  set: (val) => emit("update:modelValue", val),
});

const formatDate = (val?: string) => {
  if (!val) return "";
  const d = new Date(val);
  if (isNaN(d.getTime())) return "";
  return `${String(d.getDate()).padStart(2, "0")}-${String(
    d.getMonth() + 1,
  ).padStart(2, "0")}-${d.getFullYear()}`;
};

const formatQty = (val: any) =>
  Number(val || 0).toLocaleString("id-ID", { maximumFractionDigits: 2 });

const printBarcode = () => {
  const printArea = document.getElementById("barcode-print-area");
  if (!printArea) return;

  const clone = printArea.cloneNode(true) as HTMLElement;
  const canvases = printArea.querySelectorAll("canvas");
  const cloneCanvases = clone.querySelectorAll("canvas");

  canvases.forEach((canvas, i) => {
    const img = document.createElement("img");
    img.src = canvas.toDataURL("image/png");
    img.width = canvas.width;
    img.height = canvas.height;
    cloneCanvases[i].replaceWith(img);
  });

  // ✅ Window print kecil — pemilihan printer fisik (mis. Xprinter
  // XP-360B) diserahkan ke dialog print bawaan browser/OS, bukan
  // dropdown custom kita.
  const printWindow = window.open("", "_blank", "width=400,height=600");
  if (!printWindow) return;

  printWindow.document.write(`
    <!DOCTYPE html><html><head>
    <style>
      * { margin:0; padding:0; box-sizing:border-box; }
      @page { size: 7.2cm 5cm; margin: 0; }
      .sticker-page {
        width:7.2cm; height:5cm; padding:0.3cm 0.4cm;
        display:flex; flex-direction:column;
        font-family:Arial,sans-serif; color:black;
        page-break-after:always; break-after:page;
        background: white;
      }
      .sticker-title {
        font-size:8pt; font-weight:700; text-align:center;
        line-height:1.1; margin-bottom:0.15cm; height:20pt;
        overflow:hidden; text-transform:uppercase;
      }
      .sticker-content {
        display:flex; flex-direction:row; align-items:center; justify-content:center; gap:0.25cm; flex:1;
      }
      .qr-col {
        display:flex; flex-direction:column; align-items:center;
      }
      .barcode-text {
        font-size:7.5pt; margin-top:2px; font-weight:600;
      }
      .info-col {
        display:flex; flex-direction:column; justify-content:center; gap:3px;
      }
      .info-qty { font-size:11pt; font-weight:800; }
      .info-date, .info-po { font-size:8pt; font-weight:700; }
    </style>
    </head><body>
      ${clone.innerHTML}
    </body></html>
  `);

  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => {
    printWindow.print();
    printWindow.close();
  }, 350);
};
</script>

<template>
  <v-dialog v-model="isOpen" max-width="500" persistent>
    <v-card>
      <v-card-title
        class="bg-teal-darken-3 text-white d-flex justify-space-between align-center px-4 py-2"
      >
        <span>Preview Barcode</span>
        <v-btn variant="text" icon @click="isOpen = false"
          ><IconX :size="18"
        /></v-btn>
      </v-card-title>
      <v-card-text class="pa-4 bg-grey-lighten-4">
        <v-btn
          color="success"
          block
          class="mb-4"
          @click="printBarcode"
          :disabled="barcodes.length === 0"
        >
          <template #prepend><IconPrinter :size="16" /></template>
          Cetak {{ barcodes.length }} Stiker
        </v-btn>

        <div id="barcode-print-area" class="print-container">
          <div v-for="(bc, idx) in barcodes" :key="idx" class="sticker-page">
            <div class="sticker-title">{{ bc.nama }}</div>
            <div class="sticker-content">
              <div class="qr-col">
                <qrcode-vue
                  :value="bc.barcode"
                  :size="75"
                  level="M"
                  :margin="0"
                />
                <div class="barcode-text">{{ bc.barcode }}</div>
              </div>
              <div class="info-col">
                <div class="info-qty">
                  {{ formatQty(bc.jumlah) }} {{ satuan || "" }}
                </div>
                <div class="info-date">{{ formatDate(tanggal) }}</div>
                <div v-if="po" class="info-po">{{ po }}</div>
              </div>
            </div>
          </div>
          <div v-if="barcodes.length === 0" class="empty-note">
            Belum ada barcode untuk dicetak.
          </div>
        </div>
      </v-card-text>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.print-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  max-height: 400px;
  overflow-y: auto;
  padding: 8px;
}
.sticker-page {
  width: 7.2cm;
  height: 5cm;
  background: white;
  border: 1px solid #ccc;
  box-sizing: border-box;
  padding: 0.3cm 0.4cm;
  display: flex;
  flex-direction: column;
  color: black;
}
.sticker-title {
  font-size: 8pt;
  font-weight: 700;
  text-align: center;
  line-height: 1.1;
  margin-bottom: 0.15cm;
  height: 20pt;
  overflow: hidden;
  text-transform: uppercase;
}
.sticker-content {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  gap: 0.25cm;
  flex: 1;
}
.qr-col {
  display: flex;
  flex-direction: column;
  align-items: center;
}
.barcode-text {
  font-size: 7.5pt;
  margin-top: 2px;
  font-weight: 600;
}
.info-col {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 3px;
}
.info-qty {
  font-size: 11pt;
  font-weight: 800;
}
.info-date,
.info-po {
  font-size: 8pt;
  font-weight: 700;
}
.empty-note {
  color: #9e9e9e;
  font-style: italic;
  font-size: 12px;
  padding: 20px;
}
</style>
