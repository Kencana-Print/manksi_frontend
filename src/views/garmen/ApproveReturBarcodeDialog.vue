<script setup lang="ts">
import { ref, watch, computed } from "vue";
import QrcodeVue from "qrcode.vue";
import { approveReturBahanFormService } from "@/services/garmen/approveReturBahanFormService";
import { useToast } from "vue-toastification";
import { IconX, IconPrinter } from "@tabler/icons-vue";

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  nomor: { type: String, default: "" },
});

const emit = defineEmits(["update:modelValue"]);
const toast = useToast();

const isOpen = computed({
  get: () => props.modelValue,
  set: (val) => emit("update:modelValue", val),
});

const isLoading = ref(false);
const barcodes = ref<any[]>([]);
const tanggalRetur = ref("");

const loadData = async () => {
  if (!props.nomor) return;
  isLoading.value = true;
  try {
    const res = await approveReturBahanFormService.getDetail(props.nomor);
    barcodes.value = res.data.data.barcodes;
    tanggalRetur.value = res.data.data.header.proret_tanggal;
  } catch (error: any) {
    toast.error(error.message || "Gagal memuat data barcode");
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
  const printArea = document.getElementById("print-area");
  if (!printArea) return;

  // Convert semua canvas QR ke img tag
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

  printWindow.document.write(`
    <!DOCTYPE html><html><head>
    <style>
      * { margin:0; padding:0; box-sizing:border-box; }
      @page { size: 7.2cm 5cm; margin: 0; }
      .sticker-page {
        width:7.2cm; height:5cm; padding:0.2cm 0.4cm;
        display:flex; flex-direction:column;
        font-family:Arial,sans-serif; color:black;
        page-break-after:always; break-after:page;
      }
      .sticker-title { font-size:8pt; font-weight:700; text-align:center; line-height:1.1; margin-bottom:0.3cm; height:24pt; overflow:hidden; text-transform:uppercase; }
      .sticker-content { display:flex; align-items:flex-start; flex:1; }
      .qr-wrapper { display:flex; flex-direction:column; align-items:center; margin-right:0.3cm; }
      .barcode-text { font-size:7.5pt; margin-top:2px; font-weight:600; }
      .info-wrapper { display:flex; flex-direction:column; padding-top:0.2cm; }
      .info-qty { font-size:11pt; font-weight:800; margin-bottom:0.1cm; }
      .info-date { font-size:9pt; font-weight:600; }
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
  }, 300);
};
</script>

<template>
  <v-dialog v-model="isOpen" max-width="500" persistent>
    <v-card>
      <v-card-title
        class="bg-blue-grey-darken-3 text-white d-flex justify-space-between align-center px-4 py-2 text-subtitle-1 font-weight-bold"
      >
        <span>Cetak Barcode: {{ nomor }}</span>
        <v-btn
          variant="text"
          size="small"
          @click="isOpen = false"
          density="comfortable"
        >
          <IconX :size="18" :stroke-width="2" />
        </v-btn>
      </v-card-title>

      <v-card-text class="pa-4 pb-6 bg-grey-lighten-4">
        <div v-if="isLoading" class="d-flex justify-center my-4">
          <v-progress-circular
            indeterminate
            color="primary"
          ></v-progress-circular>
        </div>

        <div v-else>
          <div class="d-flex justify-space-between align-center mb-4">
            <span class="text-caption text-grey-darken-1"
              >Preview Stiker ({{ barcodes.length }} Item)</span
            >

            <v-btn color="success" @click="printBarcode">
              <template #prepend
                ><IconPrinter :size="15" :stroke-width="1.7"
              /></template>
              Cetak Sekarang
            </v-btn>
          </div>

          <!-- Area Preview (Hanya ini yang akan diprint) -->
          <div id="print-area" class="print-container">
            <div v-for="(bc, idx) in barcodes" :key="idx" class="sticker-page">
              <div class="sticker-title">{{ bc.nama }}</div>

              <div class="sticker-content">
                <div class="qr-wrapper">
                  <!-- Margin margin QR kita set ke 0 agar rapat -->
                  <qrcode-vue
                    :value="bc.barcode"
                    :size="75"
                    level="M"
                    :margin="0"
                  />
                  <div class="barcode-text">{{ bc.barcode }}</div>
                </div>

                <div class="info-wrapper">
                  <div class="info-qty">{{ formatQty(bc.jumlah) }} KG</div>
                  <div class="info-date">{{ formatDate(tanggalRetur) }}</div>
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
/* --- STYLE UNTUK PREVIEW DI LAYAR --- */
.print-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  max-height: 400px;
  overflow-y: auto;
  padding: 8px;
  background-color: #f5f5f5;
}

/* Base ukuran sticker: 7.2cm x 5cm */
.sticker-page {
  width: 7.2cm;
  height: 5cm;
  background: white;
  border: 1px solid #ccc;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  box-sizing: border-box;
  padding: 0.2cm 0.4cm;
  display: flex;
  flex-direction: column;
  font-family: Arial, Helvetica, sans-serif;
  color: black;
}

.sticker-title {
  font-size: 8pt;
  font-weight: 700;
  text-align: center;
  line-height: 1.1;
  margin-bottom: 0.3cm;
  height: 24pt;
  overflow: hidden;
  text-transform: uppercase;
}

.sticker-content {
  display: flex;
  align-items: flex-start;
  flex: 1;
}

.qr-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-right: 0.3cm;
}

.barcode-text {
  font-size: 7.5pt;
  margin-top: 2px;
  font-weight: 600;
}

.info-wrapper {
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  padding-top: 0.2cm;
}

.info-qty {
  font-size: 11pt;
  font-weight: 800;
  margin-bottom: 0.1cm;
}

.info-date {
  font-size: 9pt;
  font-weight: 600;
}
</style>
