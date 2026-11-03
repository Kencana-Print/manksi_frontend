<script setup lang="ts">
import { ref, computed, watch } from "vue";
import { useRoute } from "vue-router";
import { useToast } from "vue-toastification";
import axios from "axios";
import BaseForm from "@/components/BaseForm.vue";
import KoliBarcodeDialog from "./KoliBarcodeDialog.vue";
import { useForm } from "@/composables/useForm";
import {
  cetakBarcodeKoliFormService as svc,
  type KoliRow,
  type PrintUnit,
  type StatusKoli,
} from "@/services/garmen/cetakBarcodeKoliFormService";
import { IconQrcode, IconPrinter, IconBan } from "@tabler/icons-vue";

// Menu 188 = hasil QR koli yang dibuat otomatis saat simpan STBJ.
// Di sini hanya: lihat, cetak ulang, VOID, tes printer.

interface CetakBarcodeKoliFormState {
  nomor: string;
  tanggal: string;
  cab: string;
  stbjNomor: string;
  keterangan: string;
}

const route = useRoute();
const toast = useToast();

const nomorParam = computed(() => (route.params.nomor as string) || "");

const pesanError = (e: unknown, fallback: string): string =>
  axios.isAxiosError<{ message?: string }>(e)
    ? (e.response?.data?.message ?? fallback)
    : fallback;

const todayLocal = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const emptyData: CetakBarcodeKoliFormState = {
  nomor: "",
  tanggal: "",
  cab: "",
  stbjNomor: "",
  keterangan: "",
};

const koliList = ref<KoliRow[]>([]);
const selectedKoli = ref<string[]>([]);
const isBusy = ref(false);

// ─── useForm (hanya memuat detail; dokumen tidak bisa diubah) ──
const {
  formData,
  isLoading,
  isSaving,
  showSaveDialog,
  showCancelDialog,
  showCloseDialog,
  executeSave,
  executeCancel,
  executeClose,
} = useForm<CetakBarcodeKoliFormState>({
  menuId: "188",
  initialData: emptyData,
  onFormReset: () => {
    koliList.value = [];
    selectedKoli.value = [];
    showVoidDialog.value = false;
    voidAlasan.value = "";
    showCetak.value = false;
  },
  fetchApi: async () => {
    const res = await svc.getDetail(nomorParam.value);
    const d = res.data.data;
    koliList.value = d.koli;
    return {
      nomor: d.header.nomor,
      tanggal: d.header.tanggal,
      cab: d.header.cab,
      stbjNomor: d.header.stbjNomor,
      keterangan: d.header.keterangan ?? "",
    };
  },
  submitApi: async () => {
    throw new Error("Dokumen koli tidak dapat diubah.");
  },
});

const validateSave = () => {
  toast.info(
    "Dokumen koli dibuat otomatis dari STBJ dan tidak dapat diubah di sini. Gunakan Cetak Ulang atau VOID.",
  );
};

// ─── Daftar koli ─────────────────────────────────────────
const KOLI_STATUS_CLASS: Record<StatusKoli, string> = {
  DIBUAT: "badge-amber",
  DITERIMA_FG: "badge-green",
  DIMUAT: "badge-blue",
  VOID: "badge-red",
};

const koliBisaDipilih = computed(() =>
  koliList.value.filter((k) => k.status !== "VOID"),
);
const semuaTerpilih = computed(
  () =>
    koliBisaDipilih.value.length > 0 &&
    koliBisaDipilih.value.every((k) => selectedKoli.value.includes(k.koliId)),
);
const toggleSemua = () => {
  selectedKoli.value = semuaTerpilih.value
    ? []
    : koliBisaDipilih.value.map((k) => k.koliId);
};

const ringkasan = computed(() => ({
  aktif: koliList.value.filter((k) => k.status !== "VOID").length,
  diterima: koliList.value.filter(
    (k) => k.status === "DITERIMA_FG" || k.status === "DIMUAT",
  ).length,
  voided: koliList.value.filter((k) => k.status === "VOID").length,
}));

const muatUlangDetail = async () => {
  try {
    const res = await svc.getDetail(nomorParam.value);
    koliList.value = res.data.data.koli;
    selectedKoli.value = [];
  } catch (e) {
    toast.error(pesanError(e, "Gagal memuat ulang daftar koli."));
  }
};

// ─── Cetak ulang & Tes Printer (satu dialog) ─────────────
const showCetak = ref(false);
const cetakIds = ref<string[]>([]);
// diisi = mode Tes Printer (tanpa panggil backend, tidak menaikkan jumlah cetak)
const unitsTes = ref<PrintUnit[] | undefined>(undefined);

const cetakUlang = () => {
  unitsTes.value = undefined;
  cetakIds.value = [...selectedKoli.value]; // kosong = semua koli aktif
  showCetak.value = true;
};

// Tes printer: ID KL00000000 tidak pernah dipakai koli asli
const testPrinter = () => {
  unitsTes.value = [
    {
      koliId: "KL00000000",
      spk: "SPK-JA-KO-000000",
      namaSpk: "CONTOH LABEL TES PRINTER KOLI",
      stbj: "STBJ/00000/0000",
      tanggal: todayLocal(),
      urut: 1,
      cab: "P04",
    },
  ];
  showCetak.value = true;
};

// Dialog ditutup: jumlah cetak berubah di server, muat ulang daftar
watch(showCetak, async (terbuka) => {
  if (terbuka) return;
  const tes = !!unitsTes.value;
  unitsTes.value = undefined;
  if (!tes) await muatUlangDetail();
});

// ─── VOID ────────────────────────────────────────────────
const showVoidDialog = ref(false);
const voidAlasan = ref("");

const koliTerpilihObj = computed(() =>
  koliList.value.filter((k) => selectedKoli.value.includes(k.koliId)),
);
const bisaVoid = computed(
  () =>
    koliTerpilihObj.value.length > 0 &&
    koliTerpilihObj.value.every((k) => k.status === "DIBUAT"),
);

const bukaVoidDialog = () => {
  if (!bisaVoid.value) {
    toast.warning(
      "Pilih koli berstatus DIBUAT. Koli yang sudah diterima FG tidak bisa di-VOID.",
    );
    return;
  }
  voidAlasan.value = "";
  showVoidDialog.value = true;
};

const konfirmasiVoid = async () => {
  if (voidAlasan.value.trim().length < 5) {
    toast.warning("Alasan VOID wajib diisi (minimal 5 karakter).");
    return;
  }
  isBusy.value = true;
  try {
    const res = await svc.voidKoli({
      koliIds: selectedKoli.value,
      alasan: voidAlasan.value.trim(),
    });
    toast.success(`${res.data.data.jumlah} koli berhasil di-VOID.`);
    showVoidDialog.value = false;
    await muatUlangDetail();
  } catch (e) {
    toast.error(pesanError(e, "Gagal VOID koli."));
  } finally {
    isBusy.value = false;
  }
};
</script>

<template>
  <BaseForm
    title="Detail Cetak Barcode Koli"
    menu-id="188"
    :icon="IconQrcode"
    :is-loading="isLoading"
    :is-saving="isSaving"
    v-model:show-save-dialog="showSaveDialog"
    v-model:show-cancel-dialog="showCancelDialog"
    v-model:show-close-dialog="showCloseDialog"
    @validate-save="validateSave"
    @confirm-save="executeSave"
    @confirm-cancel="executeCancel"
    @confirm-close="executeClose"
  >
    <!-- ═══ KOLOM KIRI ═══ -->
    <template #left-column>
      <div class="header-section">
        <div class="fr">
          <label class="lbl">Nomor</label>
          <input
            :value="formData.nomor"
            class="inp ro text-primary font-weight-bold"
            readonly
          />
        </div>
        <div class="fr mt-1">
          <label class="lbl">Tanggal</label>
          <input :value="formData.tanggal" class="inp ro" readonly />
        </div>
        <div class="fr mt-1">
          <label class="lbl">Cab</label>
          <input :value="formData.cab" class="inp ro" readonly />
        </div>
        <div class="fr mt-1">
          <label class="lbl">No. STBJ</label>
          <input :value="formData.stbjNomor" class="inp ro" readonly />
        </div>
        <div class="fr mt-1">
          <label class="lbl">Ket.</label>
          <input :value="formData.keterangan" class="inp ro" readonly />
        </div>

        <div class="sep mt-2 mb-2" />

        <div class="info-box">
          Aktif <b>{{ ringkasan.aktif }}</b> · Diterima FG
          <b>{{ ringkasan.diterima }}</b> · Void
          <b>{{ ringkasan.voided }}</b>
        </div>
        <button
          type="button"
          class="btn-cetak-ulang mt-2"
          :disabled="isBusy || !koliBisaDipilih.length"
          @click="cetakUlang"
        >
          <IconPrinter :size="14" class="mr-1" />
          Cetak Ulang
          {{ selectedKoli.length ? `(${selectedKoli.length})` : "(Semua)" }}
        </button>
        <button
          type="button"
          class="btn-void mt-1"
          :disabled="isBusy || !selectedKoli.length"
          @click="bukaVoidDialog"
        >
          <IconBan :size="14" class="mr-1" /> VOID Terpilih
        </button>

        <div class="sep mt-2 mb-2" />

        <button type="button" class="btn-tes-printer" @click="testPrinter">
          <IconPrinter :size="14" class="mr-1" /> Tes Printer (XP-360B 70×50)
        </button>
      </div>
    </template>

    <!-- ═══ KOLOM KANAN ═══ -->
    <template #right-column>
      <div class="right-content-wrapper d-flex flex-column h-100 gap-2 pa-2">
        <div class="d-flex flex-column" style="flex: 1; min-height: 0">
          <div class="tbl-header blue">
            <span class="font-weight-bold">Daftar Koli</span>
            <span>{{ formData.stbjNomor }}</span>
          </div>
          <div class="tbl-wrap flex-grow-1">
            <table class="gt">
              <thead>
                <tr>
                  <th style="width: 32px" class="text-center">
                    <input
                      type="checkbox"
                      :checked="semuaTerpilih"
                      @change="toggleSemua"
                    />
                  </th>
                  <th style="width: 110px">ID Koli</th>
                  <th style="width: 150px">SPK</th>
                  <th style="min-width: 200px">Nama SPK</th>
                  <th style="width: 70px" class="text-center">Urut</th>
                  <th style="width: 120px" class="text-center">Status</th>
                  <th style="width: 70px" class="text-right">Cetak</th>
                  <th style="min-width: 200px">Alasan VOID</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="k in koliList"
                  :key="k.koliId"
                  :class="{ 'row-void': k.status === 'VOID' }"
                >
                  <td class="text-center">
                    <input
                      v-if="k.status !== 'VOID'"
                      type="checkbox"
                      :value="k.koliId"
                      v-model="selectedKoli"
                    />
                  </td>
                  <td class="mono">{{ k.koliId }}</td>
                  <td>{{ k.spk }}</td>
                  <td>{{ k.namaSpk }}</td>
                  <td class="text-center">{{ k.urut }}</td>
                  <td class="text-center">
                    <span class="kk-badge" :class="KOLI_STATUS_CLASS[k.status]">
                      {{ k.status }}
                    </span>
                  </td>
                  <td class="text-right">{{ k.jumlahCetak }}x</td>
                  <td class="ket">{{ k.voidAlasan }}</td>
                </tr>
                <tr v-if="!koliList.length">
                  <td colspan="8" class="empty-row">Tidak ada koli</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </template>
  </BaseForm>

  <!-- Pratinjau & cetak label (cetak ulang / tes printer) -->
  <KoliBarcodeDialog
    v-model="showCetak"
    :nomor="formData.nomor"
    :koli-ids="cetakIds"
    :units="unitsTes"
  />

  <!-- VOID koli -->
  <v-dialog v-model="showVoidDialog" max-width="440px" persistent>
    <v-card rounded="lg">
      <v-card-title
        class="bg-error text-white pa-3 text-subtitle-1 d-flex align-center"
      >
        <IconBan :size="16" color="white" class="mr-2" />
        VOID {{ selectedKoli.length }} Koli
      </v-card-title>
      <v-card-text class="pa-4 dlg-text">
        Koli yang di-VOID tidak bisa dipakai lagi dan labelnya harus dibuang.
        Hanya koli yang belum diterima Gudang FG yang bisa di-VOID.
        <textarea
          v-model="voidAlasan"
          class="alasan mt-2"
          rows="3"
          maxlength="200"
          placeholder="Alasan VOID (wajib, min. 5 karakter)"
        />
      </v-card-text>
      <v-card-actions class="pa-3 border-t bg-grey-lighten-4">
        <v-spacer />
        <v-btn variant="text" :disabled="isBusy" @click="showVoidDialog = false"
          >Kembali</v-btn
        >
        <v-btn
          color="error"
          variant="elevated"
          :loading="isBusy"
          @click="konfirmasiVoid"
          >Ya, VOID</v-btn
        >
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.header-section {
  display: flex;
  flex-direction: column;
  padding: 12px;
  background: white;
  border-radius: 6px;
  border: 1px solid #e0e0e0;
}
.fr {
  display: flex;
  align-items: center;
  width: 100%;
  gap: 6px;
  min-height: 24px;
}
.lbl {
  width: 60px;
  flex-shrink: 0;
  font-size: 11px;
  font-weight: 600;
  color: #424242;
}
.inp {
  flex: 1;
  height: 26px;
  border: 1px solid #ccc;
  border-radius: 3px;
  padding: 0 6px;
  font-size: 11px;
  outline: none;
  background: white;
  box-sizing: border-box;
  font-family: inherit;
}
.ro {
  background: #f0f4f8 !important;
  color: #555 !important;
  cursor: default;
}
.sep {
  height: 1px;
  background: #eee;
  width: 100%;
}
.info-box {
  font-size: 11px;
  color: #37474f;
  background: #eceff1;
  border-radius: 4px;
  padding: 6px 8px;
}

.btn-tes-printer,
.btn-cetak-ulang,
.btn-void {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 28px;
  width: 100%;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
}
.btn-tes-printer,
.btn-cetak-ulang {
  border: 1px solid #1565c0;
  background: #e3f2fd;
  color: #1565c0;
}
.btn-void {
  border: 1px solid #c62828;
  background: #ffebee;
  color: #c62828;
}
.btn-cetak-ulang:disabled,
.btn-void:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.right-content-wrapper {
  font-size: 11px;
}
.tbl-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 10px;
  font-size: 11px;
  border-radius: 4px 4px 0 0;
  color: white;
}
.tbl-header.blue {
  background: #1565c0;
}
.tbl-wrap {
  border: 1px solid #bdbdbd;
  border-top: none;
  background: white;
  overflow: auto;
}
.gt {
  width: 100%;
  border-collapse: collapse;
  font-size: 11px;
  white-space: nowrap;
}
.gt thead th {
  background: #455a64;
  color: white;
  border-right: 1px solid rgba(255, 255, 255, 0.15);
  border-bottom: 2px solid #37474f;
  font-weight: 700;
  font-size: 10px;
  text-transform: uppercase;
  padding: 5px 7px;
  position: sticky;
  top: 0;
  z-index: 1;
}
.gt tbody td {
  border-bottom: 1px solid #eee;
  border-right: 1px solid #f0f0f0;
  height: 26px;
  vertical-align: middle;
  padding: 0 7px;
}
.gt tbody tr:nth-of-type(even) td {
  background-color: rgba(0, 0, 0, 0.015);
}
.ket {
  white-space: normal;
  color: #616161;
}
.mono {
  font-family: monospace;
  font-weight: 700;
}
.row-void td {
  background: #fafafa !important;
  color: #9e9e9e;
  text-decoration: line-through;
}
.row-void td .kk-badge {
  text-decoration: none;
}
.empty-row {
  text-align: center;
  color: #9e9e9e;
  font-style: italic;
  padding: 12px 8px;
  font-size: 11px;
}

.kk-badge {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 10px;
  font-weight: 700;
}
.badge-blue {
  background: #e3f2fd;
  color: #1565c0;
}
.badge-green {
  background: #e8f5e9;
  color: #2e7d32;
}
.badge-red {
  background: #ffebee;
  color: #c62828;
}
.badge-amber {
  background: #fff8e1;
  color: #f57f17;
}

.dlg-text {
  font-size: 11px;
}
.alasan {
  width: 100%;
  border: 1px solid #bdbdbd;
  border-radius: 4px;
  padding: 6px 8px;
  font-size: 11px;
  outline: none;
  resize: vertical;
  box-sizing: border-box;
  font-family: inherit;
}
</style>
