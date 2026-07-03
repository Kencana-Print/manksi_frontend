<script setup lang="ts">
import { ref, computed } from "vue";
import { useRouter } from "vue-router";
import { useToast } from "vue-toastification";
import PageLayout from "@/components/PageLayout.vue";
import KuitansiDocument from "./components/KuitansiDocument.vue";
import InvoiceKuitansiSearchModal from "@/components/lookups/InvoiceKuitansiSearchModal.vue";
import { cetakKuitansiService as svc } from "@/services/penjualan/cetakKuitansiService";
import { IconReceipt2, IconSearch, IconPrinter } from "@tabler/icons-vue";

const router = useRouter();
const toast = useToast();

const nomor = ref("");
const isChecking = ref(false);
const isCetak = ref(false);
const showInvoiceModal = ref(false);

const header = ref<any>(null);
const detail = ref<any[]>([]);
const isLoadingPreview = ref(false);

const hasResult = computed(() => !!header.value);

const fmtDate = (v: string) => {
  if (!v) return "-";
  const d = new Date(v);
  if (isNaN(d.getTime())) return v;
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
};

const fetchPreview = async () => {
  if (!nomor.value) return;
  isLoadingPreview.value = true;
  try {
    const res = await svc.getDataCetak(nomor.value);
    header.value = res.data.data.header;
    detail.value = res.data.data.detail;
  } catch (e: any) {
    toast.error(e.response?.data?.message || "Invoice tidak ditemukan.");
    resetForm();
  } finally {
    isLoadingPreview.value = false;
  }
};

const onNomorBlur = async () => {
  const kode = nomor.value.trim();
  if (!kode) return;
  isChecking.value = true;
  await fetchPreview();
  isChecking.value = false;
};

const selectInvoice = (item: any) => {
  nomor.value = item.Nomor;
  showInvoiceModal.value = false;
  onNomorBlur();
};

const resetForm = () => {
  nomor.value = "";
  header.value = null;
  detail.value = [];
};

// ── Cetak — sesuai Delphi btncetakClick: save + print + reset LANGSUNG,
// tanpa dialog konfirmasi apapun (beda dari pola form lain yg lebih
// hati-hati) ───────────────────────────────────────────────────────
const doCetak = async () => {
  if (!nomor.value) {
    toast.warning("Nomor invoice belum diisi.");
    return;
  }
  isCetak.value = true;
  try {
    await svc.cetak(nomor.value);
    const url = router.resolve({
      name: "CetakKuitansiPrint",
      query: { nomor: nomor.value },
    }).href;
    window.open(url, "_blank");
    toast.success("Kuitansi berhasil disimpan.");
    resetForm();
  } catch (e: any) {
    toast.error(e.response?.data?.message || "Gagal cetak.");
  } finally {
    isCetak.value = false;
  }
};
</script>

<template>
  <PageLayout title="Cetak Kuitansi" menu-id="1317" :icon="IconReceipt2">
    <div class="stage">
      <div class="form-card" :class="{ docked: hasResult }">
        <div class="fg">
          <label class="lb w110">No. Invoice</label>
          <div class="ig" style="flex: 1">
            <input
              v-model="nomor"
              class="inp"
              style="flex: 1; text-transform: uppercase"
              placeholder="Ketik nomor invoice..."
              @keydown.enter.prevent="
                ($event.target as HTMLInputElement).blur()
              "
              @keydown.f1.prevent="showInvoiceModal = true"
              @blur="onNomorBlur"
            />
            <button class="ibtn" @click="showInvoiceModal = true">
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

        <template v-if="header">
          <div class="fg mt6">
            <label class="lb w110">Tanggal</label>
            <span class="val">{{ fmtDate(header.inv_tanggal) }}</span>
          </div>
          <div class="fg mt6">
            <label class="lb w110">Customer</label>
            <span class="val">{{ header.cus_nama }}</span>
          </div>
          <div class="fg mt6">
            <label class="lb w110">Total</label>
            <span class="val val-bold"
              >Rp {{ Number(header.Total || 0).toLocaleString("id-ID") }}</span
            >
          </div>

          <div class="fg mt14">
            <v-btn
              color="primary"
              size="small"
              :loading="isCetak"
              @click="doCetak"
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
              <KuitansiDocument
                v-if="header"
                :header="header"
                :detail="detail"
              />
            </div>
          </div>
        </div>
      </Transition>
    </div>

    <InvoiceKuitansiSearchModal
      v-model="showInvoiceModal"
      @selected="selectInvoice"
    />
  </PageLayout>
</template>

<style scoped>
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
  width: 420px;
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
  left: 460px;
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
  transform: scale(0.7);
  transform-origin: top center;
  margin-bottom: -60mm;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.12);
  border: 1px solid #ddd;
}
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
.mt14 {
  margin-top: 14px;
}
.lb {
  font-size: 12px;
  font-weight: 600;
  color: #444;
  white-space: nowrap;
}
.w110 {
  width: 110px;
  flex-shrink: 0;
}
.val {
  font-size: 12px;
  color: #333;
}
.val-bold {
  font-weight: 700;
  color: #1565c0;
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
</style>
