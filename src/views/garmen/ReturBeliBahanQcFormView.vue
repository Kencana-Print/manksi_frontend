<script setup lang="ts">
import { ref, computed } from "vue";
import { useRouter } from "vue-router";
import { useToast } from "vue-toastification";
import BaseForm from "@/components/BaseForm.vue";
import { useForm } from "@/composables/useForm";
import { useAuthStore } from "@/stores/authStore";
import {
  returBeliBahanService,
  type QcSiapRow,
  type QcRejectLot,
  type QcReturRow,
  type QcReturFormData as QcReturFormResponse,
} from "@/services/garmen/returBeliBahanService";
import { formatTanggal } from "@/utils/dateFormat";
import { IconArrowBackUp, IconSearch, IconPrinter } from "@tabler/icons-vue";

interface LotRow extends QcRejectLot {
  qtyRetur: number;
  rollRetur: number;
}

interface ReturQcFormData {
  nomor: string;
  tanggal: string;
  qcNomor: string;
  noPo: string;
  jenisKain: string;
  noSj: string;
  keterangan: string;
  supKode: string;
  supNama: string;
  supAlamat: string;
  lots: LotRow[];
}

interface SaveResponse {
  data?: { data?: { nomor?: string }; message?: string };
}

const router = useRouter();
const toast = useToast();
const authStore = useAuthStore();

const BROWSE_PATH = "/garmen/bahan-baku/retur-pembelian-bahan";

const canLihatSup = computed(() => authStore.user?.flags?.lihatSup === 1);

const toLocalDateStr = (date: Date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

const getErr = (e: unknown, fallback: string) => {
  const err = e as { response?: { data?: { message?: string } } };
  return err.response?.data?.message || fallback;
};

const toRows = (lots: QcRejectLot[], saved: QcReturRow[]): LotRow[] => {
  const savedMap = new Map(saved.map((s) => [s.lot, s]));
  return lots.map((l) => ({
    ...l,
    qtyRetur: savedMap.get(l.Lot)?.qty ?? 0,
    rollRetur: savedMap.get(l.Lot)?.roll ?? 0,
  }));
};

// ── fetchApi / submitApi ────────────────────────────────────────────────
const fetchApi = async (): Promise<ReturQcFormData> => {
  const res = await returBeliBahanService.getQcFormData(params.nomor as string);
  const d = res.data.data as QcReturFormResponse;

  return {
    nomor: d.header.nomor,
    tanggal: String(d.header.tanggal).substring(0, 10),
    qcNomor: d.header.qcNomor,
    noPo: d.header.noPo || "",
    jenisKain: d.header.jenisKain || "",
    noSj: d.header.noSj || "",
    keterangan: d.header.keterangan || "",
    supKode: d.header.supKode,
    supNama: d.header.supNama,
    supAlamat: d.header.supAlamat,
    lots: toRows(d.lots, d.rows),
  };
};

const submitApi = async (data: ReturQcFormData) => {
  const rows: QcReturRow[] = data.lots
    .filter((r) => (Number(r.qtyRetur) || 0) > 0)
    .map((r) => ({
      lot: r.Lot,
      qty: Number(r.qtyRetur) || 0,
      roll: Number(r.rollRetur) || 0,
    }));

  const payload = {
    tanggal: data.tanggal,
    qcNomor: data.qcNomor,
    noSj: data.noSj.trim(),
    keterangan: data.keterangan.trim(),
    rows,
  };
  return isEditMode.value
    ? returBeliBahanService.updateQc(data.nomor, payload)
    : returBeliBahanService.createQc(payload);
};

// ── useForm ──────────────────────────────────────────────────────────────
const {
  isEditMode,
  isLoading,
  isSaving,
  showSaveDialog,
  showCancelDialog,
  showCloseDialog,
  formData,
  fetchData,
  executeSave,
  executeCancel,
  executeClose,
  params,
} = useForm<ReturQcFormData>({
  menuId: "55",
  initialData: {
    nomor: "",
    tanggal: toLocalDateStr(new Date()),
    qcNomor: "",
    noPo: "",
    jenisKain: "",
    noSj: "",
    keterangan: "",
    supKode: "",
    supNama: "",
    supAlamat: "",
    lots: [],
  },
  fetchApi,
  submitApi,
  onSuccessRoute: BROWSE_PATH,
  immediate: false,
  onSuccess: (response: unknown) => {
    const res = response as SaveResponse;
    const savedNomor = res?.data?.data?.nomor;
    toast.success(res?.data?.message || "Berhasil disimpan.");
    if (savedNomor) {
      nomorTerakhir.value = savedNomor;
      showPrintConfirm.value = true;
    } else {
      executeClose();
    }
  },
});

const fd = formData;

// --- PILIH DOKUMEN QC (mode baru) ---
const showQcModal = ref(false);
const qcLoading = ref(false);
const qcList = ref<QcSiapRow[]>([]);
const qcSearch = ref("");

const filteredQc = computed(() => {
  const q = qcSearch.value.trim().toLowerCase();
  if (!q) return qcList.value;
  return qcList.value.filter((r) =>
    [r.Nomor, r.Nomor_PO, r.JenisKain, r.Supplier]
      .map((v) => String(v ?? "").toLowerCase())
      .some((v) => v.includes(q)),
  );
});

const openQcModal = async () => {
  showQcModal.value = true;
  qcLoading.value = true;
  try {
    const res = await returBeliBahanService.qcSiap();
    qcList.value = res.data.data as QcSiapRow[];
  } catch (e) {
    toast.error(getErr(e, "Gagal memuat daftar QC."));
    showQcModal.value = false;
  } finally {
    qcLoading.value = false;
  }
};

const pilihQc = async (row: QcSiapRow) => {
  try {
    isLoading.value = true;
    const res = await returBeliBahanService.getLotReject(row.Nomor);
    const d = res.data.data as {
      header: {
        qcNomor: string;
        noPo: string;
        jenisKain: string;
        supKode: string;
        supNama: string;
        supAlamat: string;
      };
      lots: QcRejectLot[];
    };
    fd.value.qcNomor = d.header.qcNomor;
    fd.value.noPo = d.header.noPo;
    fd.value.jenisKain = d.header.jenisKain;
    fd.value.supKode = d.header.supKode;
    fd.value.supNama = d.header.supNama;
    fd.value.supAlamat = d.header.supAlamat;
    fd.value.lots = toRows(d.lots, []);
    showQcModal.value = false;
  } catch (e) {
    toast.error(getErr(e, "Gagal memuat lot REJECT."));
  } finally {
    isLoading.value = false;
  }
};

// --- INPUT ---
const isiSisa = () => {
  fd.value.lots.forEach((r) => {
    r.qtyRetur = r.SisaQty;
    r.rollRetur = r.SisaRoll;
  });
};

const kosongkan = () => {
  fd.value.lots.forEach((r) => {
    r.qtyRetur = 0;
    r.rollRetur = 0;
  });
};

const totalLot = computed(
  () => fd.value.lots.filter((r) => (Number(r.qtyRetur) || 0) > 0).length,
);
const totalQty = computed(() =>
  fd.value.lots.reduce((s, r) => s + (Number(r.qtyRetur) || 0), 0),
);
const totalRoll = computed(() =>
  fd.value.lots.reduce((s, r) => s + (Number(r.rollRetur) || 0), 0),
);

// --- VALIDASI ---
const onValidateSave = () => {
  if (!fd.value.tanggal) return toast.error("Tanggal wajib diisi.");
  if (!fd.value.qcNomor) return toast.error("Dokumen QC wajib dipilih.");

  let adaIsi = false;
  for (const r of fd.value.lots) {
    const qty = Number(r.qtyRetur) || 0;
    const roll = Number(r.rollRetur) || 0;
    if (qty <= 0) continue;
    adaIsi = true;
    if (qty > r.SisaQty + 0.0001) {
      return toast.error(
        `Qty retur lot ${r.Lot} melebihi sisa (${numFmt(r.SisaQty)}).`,
      );
    }
    if (roll < 0 || !Number.isInteger(roll)) {
      return toast.error(`Roll retur lot ${r.Lot} tidak valid.`);
    }
    if (roll > r.SisaRoll) {
      return toast.error(
        `Roll retur lot ${r.Lot} melebihi sisa (${numFmt(r.SisaRoll)}).`,
      );
    }
  }
  if (!adaIsi) {
    return toast.error("Qty retur 0 semua, tidak bisa disimpan.");
  }
  showSaveDialog.value = true;
};

// --- PRINT DIALOG ---
const showPrintConfirm = ref(false);
const nomorTerakhir = ref("");

const doPrintDocument = () => {
  showPrintConfirm.value = false;
  const url = router.resolve({
    name: "ReturBeliBahanPrint",
    params: { nomor: nomorTerakhir.value },
  }).href;
  window.open(url, "_blank");
  executeClose();
};

const skipPrint = () => {
  showPrintConfirm.value = false;
  executeClose();
};

const numFmt = (v: number | string | null) =>
  v ? Number(v).toLocaleString("id-ID") : "0";

// --- INIT ---
const loadData = async () => {
  if (isEditMode.value) {
    await fetchData();
  } else {
    openQcModal();
  }
};
loadData();
</script>

<template>
  <BaseForm
    :title="
      isEditMode
        ? `Ubah Retur dari QC Reject - ${fd.nomor}`
        : 'Tambah Retur dari QC Reject'
    "
    menu-id="55"
    :icon="IconArrowBackUp"
    :is-loading="isLoading"
    :is-saving="isSaving"
    v-model:show-save-dialog="showSaveDialog"
    v-model:show-cancel-dialog="showCancelDialog"
    v-model:show-close-dialog="showCloseDialog"
    @validate-save="onValidateSave"
    @confirm-save="executeSave"
    @confirm-cancel="executeCancel"
    @confirm-close="executeClose"
  >
    <template #left-column>
      <div class="rbb-left">
        <div class="fr">
          <label class="lbl">Nomor</label>
          <input
            :value="fd.nomor || '<-- Kosong=Baru'"
            readonly
            class="inp ro"
            style="flex: 1"
          />
        </div>
        <div class="fr">
          <label class="lbl">Tanggal</label>
          <input
            type="date"
            v-model="fd.tanggal"
            class="idate"
            style="flex: 1"
          />
        </div>

        <div class="sep" />

        <div class="fr">
          <label class="lbl">Dokumen QC</label>
          <div class="igrp" style="flex: 1">
            <input
              :value="fd.qcNomor"
              class="inp ro"
              style="flex: 1"
              readonly
              placeholder="Klik tombol cari untuk memilih dokumen QC..."
            />
            <button
              type="button"
              class="blkp"
              title="Cari dokumen QC (ada lot REJECT)"
              :disabled="isEditMode"
              @mousedown.prevent="openQcModal"
            >
              <IconSearch :size="12" color="#1565c0" />
            </button>
          </div>
        </div>
        <div class="fr" v-if="fd.noPo">
          <label class="lbl">No. PO</label>
          <input :value="fd.noPo" readonly class="inp ro" style="flex: 1" />
        </div>
        <div class="fr" v-if="fd.jenisKain">
          <label class="lbl">Jenis Kain</label>
          <input
            :value="fd.jenisKain"
            readonly
            class="inp ro"
            style="flex: 1"
          />
        </div>
        <div class="fr">
          <label class="lbl">No. Surat Jalan</label>
          <input
            v-model="fd.noSj"
            class="inp"
            style="flex: 1"
            maxlength="50"
            placeholder="Opsional"
          />
        </div>
        <div class="fr">
          <label class="lbl" style="align-self: flex-start; padding-top: 4px"
            >Keterangan</label
          >
          <textarea
            v-model="fd.keterangan"
            class="ta"
            rows="2"
            maxlength="255"
            style="flex: 1"
          />
        </div>

        <template v-if="canLihatSup">
          <div class="sep" />
          <div class="fieldset-box">
            <div class="fieldset-legend">Supplier</div>
            <div class="fr">
              <input
                :value="fd.supKode"
                readonly
                class="inp ro"
                style="width: 70px"
              />
              <input
                :value="fd.supNama"
                readonly
                class="inp ro ml-1"
                style="flex: 1"
              />
            </div>
            <div class="fr">
              <input
                :value="fd.supAlamat"
                readonly
                class="inp ro"
                style="flex: 1"
              />
            </div>
          </div>
        </template>

        <div class="sep" />

        <div class="fieldset-box">
          <div class="fieldset-legend">Total Retur</div>
          <div class="fr">
            <label class="lbl">Jumlah Lot</label>
            <input
              :value="numFmt(totalLot)"
              readonly
              class="inp ro text-right"
              style="flex: 1"
            />
          </div>
          <div class="fr">
            <label class="lbl">Qty</label>
            <input
              :value="numFmt(totalQty)"
              readonly
              class="inp ro text-right"
              style="flex: 1"
            />
          </div>
          <div class="fr">
            <label class="lbl">Roll</label>
            <input
              :value="numFmt(totalRoll)"
              readonly
              class="inp ro text-right"
              style="flex: 1"
            />
          </div>
        </div>

        <div class="note">
          Retur ini tidak mengubah stok dan hutang. Pengembalian parsial
          diperbolehkan; sisa lot bisa diretur di dokumen berikutnya.
        </div>
      </div>
    </template>

    <template #right-column>
      <div class="rbb-right">
        <div class="tbl-header">
          <span class="tbl-title">Lot REJECT yang Dikembalikan</span>
          <span class="tbl-actions">
            <button
              type="button"
              class="btn-hdr"
              :disabled="fd.lots.length === 0"
              @click="isiSisa"
            >
              Isi semua sisa
            </button>
            <button
              type="button"
              class="btn-hdr"
              :disabled="fd.lots.length === 0"
              @click="kosongkan"
            >
              Kosongkan
            </button>
          </span>
        </div>
        <div class="tbl-wrap" style="max-height: 70vh">
          <table class="gt">
            <thead>
              <tr>
                <th style="width: 32px" class="tc">No</th>
                <th style="width: 120px">Lot No.</th>
                <th>Bahan</th>
                <th style="width: 100px">Warna</th>
                <th style="width: 95px" class="tr">Qty Lot</th>
                <th style="width: 85px" class="tr">Diretur</th>
                <th style="width: 85px" class="tr">Sisa Qty</th>
                <th style="width: 65px" class="tr">Sisa Roll</th>
                <th style="width: 95px" class="tr bg-yellow">Qty Retur</th>
                <th style="width: 75px" class="tr bg-yellow">Roll Retur</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(row, idx) in fd.lots" :key="row.Nourut">
                <td class="tc gt-lbl">{{ idx + 1 }}</td>
                <td class="px-1 fw">{{ row.Lot }}</td>
                <td class="px-1" :title="row.Nama">
                  {{ row.Nama || row.Kode }}
                </td>
                <td class="px-1">{{ row.Warna || "-" }}</td>
                <td class="tr px-1">{{ numFmt(row.Qty) }} {{ row.Satuan }}</td>
                <td class="tr px-1">{{ numFmt(row.QtyRetur) }}</td>
                <td class="tr px-1 fw">{{ numFmt(row.SisaQty) }}</td>
                <td class="tr px-1">{{ numFmt(row.SisaRoll) }}</td>
                <td class="p0">
                  <input
                    v-model.number="row.qtyRetur"
                    type="number"
                    min="0"
                    step="0.01"
                    class="ci tr fw bg-yellow-light"
                    :disabled="row.SisaQty <= 0"
                  />
                </td>
                <td class="p0">
                  <input
                    v-model.number="row.rollRetur"
                    type="number"
                    min="0"
                    step="1"
                    class="ci tr fw bg-yellow-light"
                    :disabled="row.SisaQty <= 0"
                  />
                </td>
              </tr>
              <tr v-if="fd.lots.length === 0">
                <td colspan="10" class="empty-row">
                  Pilih dokumen QC dulu untuk menampilkan lot REJECT.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </template>
  </BaseForm>

  <!-- Dialog pilih dokumen QC -->
  <v-dialog v-model="showQcModal" max-width="980">
    <v-card rounded="lg" class="rbb-dialog">
      <v-card-title class="bg-deep-orange-darken-2 text-white pa-3">
        Pilih Dokumen QC (lot REJECT belum habis diretur)
      </v-card-title>
      <v-card-text class="pa-3">
        <div class="pick-search mb-2">
          <IconSearch :size="14" color="#757575" />
          <input
            v-model="qcSearch"
            type="text"
            placeholder="Cari nomor QC, PO, kain, supplier..."
            class="pick-search-inp"
          />
        </div>
        <v-progress-linear v-if="qcLoading" indeterminate height="2" />
        <div v-else class="tbl-wrap" style="max-height: 55vh">
          <table class="gt">
            <thead>
              <tr>
                <th style="width: 150px">Nomor QC</th>
                <th style="width: 100px">Tgl Datang</th>
                <th style="width: 140px">No. PO</th>
                <th>Jenis Kain</th>
                <th style="width: 170px">Supplier</th>
                <th style="width: 60px" class="tr">Lot</th>
                <th style="width: 120px" class="tr">Sisa Qty</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="r in filteredQc"
                :key="r.Nomor"
                class="pick-row"
                @click="pilihQc(r)"
              >
                <td class="px-1 fw">{{ r.Nomor }}</td>
                <td class="px-1">{{ formatTanggal(r.TglDatang) }}</td>
                <td class="px-1">{{ r.Nomor_PO }}</td>
                <td class="px-1" :title="r.JenisKain">{{ r.JenisKain }}</td>
                <td class="px-1">{{ r.Supplier || "-" }}</td>
                <td class="tr px-1">{{ numFmt(r.LotReject) }}</td>
                <td class="tr px-1">{{ numFmt(r.SisaQty) }} {{ r.Satuan }}</td>
              </tr>
              <tr v-if="filteredQc.length === 0">
                <td colspan="7" class="empty-row">
                  Tidak ada dokumen QC dengan lot REJECT yang belum diretur.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </v-card-text>
      <v-card-actions class="pa-3 border-t">
        <v-spacer />
        <v-btn variant="text" @click="showQcModal = false">Tutup</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <v-dialog v-model="showPrintConfirm" max-width="400" persistent>
    <v-card class="rounded-lg rbb-dialog">
      <v-card-title class="bg-primary text-white d-flex align-center pa-3">
        <IconPrinter class="mr-2" :size="16" />
        <span>Simpan Berhasil</span>
      </v-card-title>
      <v-card-text class="pa-4 text-center">
        <div class="mb-2">
          Data Retur <b>{{ nomorTerakhir }}</b> telah disimpan.
        </div>
        <div class="text-grey-darken-1">
          Apakah Anda ingin mencetak dokumen retur ini sekarang?
        </div>
      </v-card-text>
      <v-card-actions class="pa-3 border-t">
        <v-btn variant="text" @click="skipPrint">Tidak, Tutup</v-btn>
        <v-spacer />
        <v-btn color="primary" variant="elevated" @click="doPrintDocument">
          <IconPrinter :size="14" class="mr-1" /> Ya, Cetak
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.rbb-left {
  display: flex;
  flex-direction: column;
  gap: 3px;
  padding: 10px 12px;
  font-family: "Segoe UI", system-ui, sans-serif;
  font-size: 11px;
  box-sizing: border-box;
}
.rbb-right {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 10px 12px;
  font-family: "Segoe UI", system-ui, sans-serif;
  font-size: 11px;
  box-sizing: border-box;
  min-height: 0;
  overflow: hidden;
}

.fr {
  display: flex;
  align-items: center;
  min-height: 24px;
  gap: 4px;
  width: 100%;
}
.lbl {
  width: 80px;
  flex-shrink: 0;
  font-weight: 600;
  color: #333;
  font-size: 11px;
  white-space: nowrap;
}
.fw {
  font-weight: 700;
}
.sep {
  height: 1px;
  background: #e0e0e0;
  margin: 6px 0;
  width: 100%;
}
.ml-1 {
  margin-left: 4px;
}
.text-right {
  text-align: right;
}
.note {
  margin-top: 8px;
  font-size: 10px;
  color: #757575;
  line-height: 1.4;
}

.inp {
  height: 24px;
  border: 1px solid #a0a0a0;
  padding: 0 5px;
  font-size: 11px;
  background: white;
  outline: none;
  box-sizing: border-box;
  font-family: inherit;
  color: #212121;
}
.inp:focus {
  border-color: #1565c0;
}
.ro {
  background: #dde8f0 !important;
  color: #444 !important;
}
.idate {
  height: 24px;
  border: 1px solid #a0a0a0;
  padding: 0 4px;
  font-size: 11px;
  background: white;
  outline: none;
  box-sizing: border-box;
}
.ta {
  border: 1px solid #a0a0a0;
  padding: 3px 5px;
  font-size: 11px;
  font-family: inherit;
  outline: none;
  box-sizing: border-box;
  resize: vertical;
}

.fieldset-box {
  border: 1px solid #9e9e9e;
  padding: 7px 8px 6px;
  padding-top: 15px;
  position: relative;
  background: #fafafa;
}
.fieldset-legend {
  position: absolute;
  top: -8px;
  left: 10px;
  background: #fafafa;
  padding: 0 4px;
  font-weight: 700;
  font-size: 11px;
  color: #424242;
}

.tbl-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #d84315;
  color: white;
  padding: 5px 10px;
  border-radius: 3px 3px 0 0;
  flex-shrink: 0;
}
.tbl-title {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
}
.tbl-actions {
  display: flex;
  gap: 6px;
}
.btn-hdr {
  background: rgba(255, 255, 255, 0.18);
  color: white;
  border: 1px solid rgba(255, 255, 255, 0.5);
  border-radius: 3px;
  font-size: 10px;
  font-weight: 600;
  padding: 2px 8px;
  cursor: pointer;
}
.btn-hdr:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.32);
}
.btn-hdr:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}
.tbl-wrap {
  overflow: auto;
  border: 1px solid #bdbdbd;
  border-top: none;
  background: white;
  border-radius: 0 0 3px 3px;
}
.gt {
  width: 100%;
  border-collapse: collapse;
  table-layout: fixed;
}
.gt thead th {
  background: #f0f4f8;
  border: 1px solid #bdbdbd;
  padding: 4px 5px;
  font-size: 10px;
  font-weight: 700;
  color: #37474f;
  white-space: nowrap;
  position: sticky;
  top: 0;
  z-index: 1;
}
.gt thead th.bg-yellow {
  background: #fff9c4;
}
.gt tbody td {
  border: 1px solid #e8e8e8;
  height: 26px;
  font-size: 11px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.gt tbody tr:nth-of-type(even) td {
  background: #fafafa;
}
.p0 {
  padding: 0 !important;
}
.px-1 {
  padding: 0 5px;
}
.gt-lbl {
  background: #f5f5f5 !important;
  color: #555;
  padding: 0 4px;
  font-size: 11px;
}
.tc {
  text-align: center;
}
.tr {
  text-align: right;
}

.ci {
  width: 100%;
  height: 25px;
  border: none;
  background: transparent;
  outline: none;
  font-size: 11px;
  padding: 0 5px;
  font-family: inherit;
  color: #212121;
}
.ci.bg-yellow-light {
  background: #fffde7 !important;
}
.ci:focus {
  background: #e3f2fd !important;
  outline: 1px solid #1976d2;
  outline-offset: -1px;
}
.ci.tr {
  text-align: right;
}
.ci.fw {
  font-weight: 700;
}
.ci:disabled {
  background: #f5f5f5 !important;
  color: #9e9e9e;
}

.empty-row {
  text-align: center;
  color: #9e9e9e;
  font-style: italic;
  padding: 14px 8px;
  font-size: 11px;
}

.igrp {
  display: flex;
  border: 1px solid #a0a0a0;
  overflow: hidden;
  height: 24px;
  background: white;
  flex-shrink: 0;
}
.igrp .inp {
  border: none;
  height: 22px;
  flex-shrink: 0;
}
.blkp {
  width: 24px;
  min-width: 24px;
  flex-shrink: 0;
  background: #e3f2fd;
  border: none;
  border-left: 1px solid #a0a0a0;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  height: 100%;
}
.blkp:hover:not(:disabled) {
  background: #bbdefb;
}
.blkp:disabled {
  background: #f5f5f5;
  cursor: not-allowed;
  opacity: 0.45;
}

.pick-search {
  display: flex;
  align-items: center;
  gap: 6px;
  background: white;
  border: 1px solid #ccc;
  border-radius: 4px;
  padding: 0 8px;
  height: 28px;
  width: 300px;
}
.pick-search-inp {
  border: none;
  outline: none;
  font-size: 11px;
  width: 100%;
}
.pick-row {
  cursor: pointer;
}
.pick-row:hover td {
  background: #fff3e0 !important;
}
.rbb-dialog {
  font-size: 11px;
}
.rbb-dialog :deep(.v-card-title) {
  font-size: 13px !important;
  font-weight: 700;
}
.rbb-dialog :deep(.v-card-text) {
  font-size: 11px;
}
.rbb-dialog :deep(.v-btn) {
  font-size: 11px;
}
</style>
