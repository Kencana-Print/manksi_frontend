<script setup lang="ts">
import { ref, watch, computed } from "vue";
import QrcodeVue from "qrcode.vue";
import { bpbBahanFormService } from "@/services/garmen/bpbBahanFormService";
import { useToast } from "vue-toastification";
import { IconX, IconPrinter } from "@tabler/icons-vue";

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  nomor: { type: String, default: "" }, // Nomor BPB
  barcodeHdr: { type: String, default: "" }, // No Pembuatan Barcode (Header)
  singleBarcode: { type: String, default: "" }, // Jika cetak satu saja
});

const emit = defineEmits(["update:modelValue"]);
const toast = useToast();

const isOpen = computed({
  get: () => props.modelValue,
  set: (val) => emit("update:modelValue", val),
});

const isLoading = ref(false);
const barcodes = ref<any[]>([]);
const tanggalBpb = ref("");
const poNomor = ref(""); // State baru untuk No PO

const loadData = async () => {
  if (!props.nomor && !props.barcodeHdr) return;
  isLoading.value = true;
  try {
    const res = await bpbBahanFormService.getDetail(props.nomor);
    const data = res.data.data;

    tanggalBpb.value = data.header.bpb_tanggal;
    // Tangkap No PO (handle huruf besar/kecil dari MySQL)
    poNomor.value = data.header.bpb_po_Nomor || data.header.bpb_po_nomor || "";

    if (props.singleBarcode) {
      // Cetak Satu Baris Saja (F3)
      barcodes.value = data.barcodes.filter(
        (b: any) => b.barcode === props.singleBarcode,
      );
    } else {
      // Cetak Semua (F5)
      barcodes.value = data.barcodes;
    }
  } catch (error: any) {
    toast.error("Gagal memuat data barcode");
    isOpen.value = false;
  } finally {
    isLoading.value = false;
  }
};

watch(
  () => props.modelValue,
  (newVal) => {
    if (newVal) loadData();
  },
);

const formatDate = (val: string) => {
  if (!val) return "";
  const d = new Date(val);
  return `${String(d.getDate()).padStart(2, "0")}-${String(d.getMonth() + 1).padStart(2, "0")}-${d.getFullYear()}`;
};

const formatQty = (val: any) =>
  Number(val || 0).toLocaleString("id-ID", { maximumFractionDigits: 2 });

const printBarcode = () => {
  const printArea = document.getElementById("bpb-print-area");
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

  const printWindow = window.open("", "_blank", "width=400,height=600");
  if (!printWindow) return;

  // Injeksi HTML dan CSS khusus untuk jendela print
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
        <div v-if="isLoading" class="d-flex justify-center my-4">
          <v-progress-circular indeterminate color="primary" />
        </div>
        <div v-else>
          <v-btn
            color="success"
            block
            class="mb-4"
            @click="printBarcode"
            prepend-icon="mdi-printer"
          >
            Cetak {{ barcodes.length }} Stiker
          </v-btn>

          <div id="bpb-print-area" class="print-container">
            <div v-for="(bc, idx) in barcodes" :key="idx" class="sticker-page">
              <div class="sticker-title">{{ bc.nama }}</div>
              <div class="sticker-content">
                <!-- Kolom Kiri: QR Code + Text Barcode -->
                <div class="qr-col">
                  <qrcode-vue
                    :value="bc.barcode"
                    :size="75"
                    level="M"
                    :margin="0"
                  />
                  <div class="barcode-text">{{ bc.barcode }}</div>
                </div>
                <!-- Kolom Kanan: Qty, Tanggal, No PO -->
                <div class="info-col">
                  <div class="info-qty">{{ formatQty(bc.jumlah) }} KG</div>
                  <div class="info-date">{{ formatDate(tanggalBpb) }}</div>
                  <div v-if="poNomor" class="info-po">{{ poNomor }}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </v-card-text>
    </v-card>
  </v-dialog>
</template>

<style scoped>
/* Style ini dibuat identik dengan yang ada di script print HTML agar preview sesuai */
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
</style>
