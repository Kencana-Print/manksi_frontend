<script setup lang="ts">
import { ref, computed, watch } from "vue";
import { useRouter } from "vue-router";
import { useToast } from "vue-toastification";
import PageLayout from "@/components/PageLayout.vue";
import FakturPajakDocument from "./components/FakturPajakDocument.vue";
import InvoiceFakturPajakSearchModal from "@/components/lookups/InvoiceFakturPajakSearchModal.vue";
import { cetakFakturPajakService as svc } from "@/services/penjualan/cetakFakturPajakService";
import { IconReceiptTax, IconSearch, IconPrinter } from "@tabler/icons-vue";

const router = useRouter();
const toast = useToast();

const nomor = ref("");
const noSeri = ref("");
const isChecking = ref(false);
const isCetak = ref(false);
const showInvoiceModal = ref(false);

const invoiceInfo = ref<{
  Tanggal: string;
  Customer: string;
  SudahAdaFaktur: boolean;
  NoFpExisting: string;
} | null>(null);

const isLocked = computed(() => !!invoiceInfo.value);
const hasResult = computed(() => !!invoiceInfo.value);

// ── Live preview (belum disimpan) ─────────────────────────────────────
const previewHeader = ref<any>(null);
const previewDetail = ref<any[]>([]);
const isLoadingPreview = ref(false);

let previewDebounce: ReturnType<typeof setTimeout> | null = null;
const fetchPreview = async () => {
  if (!nomor.value) return;
  isLoadingPreview.value = true;
  try {
    const res = await svc.getDataCetak(nomor.value, noSeri.value);
    previewHeader.value = res.data.data.header;
    previewDetail.value = res.data.data.detail;
  } catch {
    // diamkan — preview optional, error utama sudah ditangani di checkNomor
  } finally {
    isLoadingPreview.value = false;
  }
};

watch(noSeri, () => {
  if (!invoiceInfo.value) return;
  if (previewDebounce) clearTimeout(previewDebounce);
  previewDebounce = setTimeout(fetchPreview, 350);
});

// ── Cek nomor ────────────────────────────────────────────────────────
const onNomorBlur = async () => {
  const kode = nomor.value.trim();
  if (!kode) return;

  isChecking.value = true;
  try {
    const res = await svc.checkNomor(kode);
    const d = res.data.data;
    invoiceInfo.value = {
      Tanggal: d.Tanggal,
      Customer: d.Customer,
      SudahAdaFaktur: d.SudahAdaFaktur,
      NoFpExisting: d.NoFpExisting,
    };
    noSeri.value = d.NoFpExisting || "";
    await fetchPreview();
  } catch (e: any) {
    toast.error(e.response?.data?.message || "Nomor tidak ditemukan.");
    resetForm();
  } finally {
    isChecking.value = false;
  }
};

const selectInvoice = (item: any) => {
  nomor.value = item.Nomor;
  showInvoiceModal.value = false;
  onNomorBlur();
};

const resetForm = () => {
  nomor.value = "";
  noSeri.value = "";
  invoiceInfo.value = null;
  previewHeader.value = null;
  previewDetail.value = [];
};

// ── Cetak (simpan + buka print) ────────────────────────────────────────
const showOverwriteDialog = ref(false);

const onCetakClick = () => {
  if (!nomor.value) {
    toast.warning("Nomor Penjualan belum diisi.");
    return;
  }
  if (!noSeri.value.trim()) {
    toast.warning("Nomor Pajak belum diisi.");
    return;
  }
  if (
    invoiceInfo.value?.SudahAdaFaktur &&
    noSeri.value.trim() !== invoiceInfo.value.NoFpExisting
  ) {
    showOverwriteDialog.value = true;
    return;
  }
  doCetak();
};

const doCetak = async () => {
  showOverwriteDialog.value = false;
  isCetak.value = true;
  try {
    await svc.cetak(nomor.value, noSeri.value.trim());
    const url = router.resolve({
      name: "CetakFakturPajakPrint",
      query: { nomor: nomor.value },
    }).href;
    window.open(url, "_blank");
    toast.success("Nomor Pajak berhasil disimpan.");
  } catch (e: any) {
    toast.error(e.response?.data?.message || "Gagal cetak.");
  } finally {
    isCetak.value = false;
  }
};
</script>

<template>
  <PageLayout title="Cetak Faktur Pajak" menu-id="159" :icon="IconReceiptTax">
    <div class="stage">
      <div class="form-card" :class="{ docked: hasResult }">
        <div class="fg">
          <label class="lb w120">Nomor Penjualan</label>
          <div class="ig" style="flex: 1">
            <input
              v-model="nomor"
              class="inp"
              style="flex: 1; text-transform: uppercase"
              :readonly="isLocked"
              placeholder="Ketik nomor invoice..."
              @keydown.enter.prevent="
                ($event.target as HTMLInputElement).blur()
              "
              @keydown.f1.prevent="showInvoiceModal = true"
              @blur="onNomorBlur"
            />
            <button
              class="ibtn"
              :disabled="isLocked"
              @click="showInvoiceModal = true"
            >
              <IconSearch :size="11" color="#1565c0" />
            </button>
          </div>
          <v-progress-circular
            v-if="isChecking"
            indeterminate
            color="primary"
            size="16"
            width="2"
            style="margin-left: 8px"
          />
        </div>

        <template v-if="invoiceInfo">
          <div class="fg mt6">
            <label class="lb w120">Tanggal</label>
            <span class="val">{{ invoiceInfo.Tanggal }}</span>
          </div>
          <div class="fg mt6">
            <label class="lb w120">Customer</label>
            <span class="val">{{ invoiceInfo.Customer }}</span>
          </div>

          <div v-if="invoiceInfo.SudahAdaFaktur" class="existing-banner">
            Invoice ini sudah punya Nomor Pajak:
            <b>{{ invoiceInfo.NoFpExisting }}</b>
          </div>

          <div class="fg mt10">
            <label class="lb w120">Nomor Pajak</label>
            <input
              v-model="noSeri"
              class="inp"
              style="flex: 1"
              placeholder="Ketik nomor seri faktur pajak..."
              autofocus
            />
          </div>

          <div class="fg mt14">
            <v-btn
              color="primary"
              size="small"
              :loading="isCetak"
              @click="onCetakClick"
            >
              <IconPrinter :size="15" style="margin-right: 6px" />
              Cetak
            </v-btn>
            <v-btn
              variant="text"
              size="small"
              style="margin-left: 8px"
              @click="resetForm"
            >
              Reset
            </v-btn>
          </div>
        </template>
      </div>

      <Transition name="preview-fade">
        <div v-if="hasResult" class="preview-panel">
          <div v-if="isLoadingPreview" class="preview-loading">
            <v-progress-circular indeterminate color="primary" size="24" />
          </div>
          <div class="preview-paper-wrap">
            <div class="preview-paper">
              <FakturPajakDocument
                v-if="previewHeader"
                :header="previewHeader"
                :detail="previewDetail"
                :lembar="1"
              />
            </div>
          </div>
        </div>
      </Transition>
    </div>

    <InvoiceFakturPajakSearchModal
      v-model="showInvoiceModal"
      @selected="selectInvoice"
    />

    <v-dialog v-model="showOverwriteDialog" max-width="380px" persistent>
      <v-card class="rounded-lg">
        <v-card-title
          class="pa-3 bg-warning text-white"
          style="font-size: 13px; font-weight: 700"
        >
          Konfirmasi Ganti Nomor Pajak
        </v-card-title>
        <v-card-text class="pa-4" style="font-size: 12px">
          Invoice ini sudah punya Nomor Pajak
          <b>{{ invoiceInfo?.NoFpExisting }}</b
          >.<br /><br />
          Yakin ingin menggantinya dengan
          <b>{{ noSeri }}</b
          >?
        </v-card-text>
        <v-card-actions class="pa-3 border-t">
          <v-btn
            variant="text"
            size="small"
            @click="showOverwriteDialog = false"
            >Batal</v-btn
          >
          <v-spacer />
          <v-btn
            variant="flat"
            size="small"
            color="warning"
            :loading="isCetak"
            @click="doCetak"
            >Ya, Ganti & Cetak</v-btn
          >
        </v-card-actions>
      </v-card>
    </v-dialog>
  </PageLayout>
</template>

<style scoped>
/* ── Stage: form-card mulai di tengah, geser ke kiri-atas begitu ada
   hasil, preview muncul mengisi sisa ruang kanan ── */
.stage {
  position: relative;
  min-height: calc(100vh - 130px);
  overflow: hidden;
}

.form-card {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 460px;
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.07);
  z-index: 2;
  transition:
    top 0.6s cubic-bezier(0.4, 0, 0.2, 1),
    left 0.6s cubic-bezier(0.4, 0, 0.2, 1),
    transform 0.6s cubic-bezier(0.4, 0, 0.2, 1);
}
.form-card.docked {
  top: 24px;
  left: 24px;
  transform: translate(0, 0);
}

.preview-panel {
  position: absolute;
  top: 24px;
  left: 500px;
  right: 24px;
  bottom: 24px;
  overflow: auto;
  z-index: 1;
}
.preview-loading {
  position: absolute;
  top: 8px;
  right: 8px;
  z-index: 3;
}
.preview-paper-wrap {
  display: flex;
  justify-content: center;
}
.preview-paper {
  width: 190mm;
  transform: scale(0.62);
  transform-origin: top center;
  margin-bottom: -100mm; /* kompensasi ruang kosong akibat scale */
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.12);
  border: 1px solid #ddd;
}

/* Keyframe animasi kemunculan preview */
@keyframes previewSlideIn {
  from {
    opacity: 0;
    transform: translateX(24px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}
.preview-fade-enter-active {
  animation: previewSlideIn 0.5s ease 0.25s both;
}
.preview-fade-leave-active {
  transition: opacity 0.2s ease;
}
.preview-fade-leave-to {
  opacity: 0;
}

.fg {
  display: flex;
  align-items: center;
  gap: 8px;
}
.mt6 {
  margin-top: 6px;
}
.mt10 {
  margin-top: 10px;
}
.mt14 {
  margin-top: 14px;
}
.lb {
  font-size: 12px;
  font-weight: 600;
  color: #444;
  white-space: nowrap;
}
.w120 {
  width: 120px;
  flex-shrink: 0;
}
.val {
  font-size: 12px;
  color: #333;
}
.ig {
  display: flex;
  border: 1px solid #bdbdbd;
  border-radius: 4px;
  height: 30px;
  background: white;
  overflow: hidden;
}
.ig .inp {
  border: none;
  height: 28px;
  border-radius: 0;
  flex: 1;
  min-width: 0;
}
.ibtn {
  width: 28px;
  min-width: 28px;
  flex-shrink: 0;
  background: #e3f2fd;
  border: none;
  border-left: 1px solid #bdbdbd;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}
.ibtn:hover {
  background: #bbdefb;
}
.inp {
  height: 30px;
  border: 1px solid #bdbdbd;
  border-radius: 4px;
  padding: 0 8px;
  font-size: 12px;
  outline: none;
  background: white;
  font-family: inherit;
}
.inp:focus {
  border-color: #1565c0;
}
.inp[readonly] {
  background: #f0f0f0;
  color: #555;
}

.existing-banner {
  margin-top: 10px;
  background: #fff3e0;
  color: #e65100;
  padding: 6px 10px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 600;
}
</style>
