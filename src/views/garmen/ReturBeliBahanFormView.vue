<script setup lang="ts">
import { ref, computed } from "vue";
import { useRouter } from "vue-router";
import { useToast } from "vue-toastification";
import BaseForm from "@/components/BaseForm.vue";
import { useForm } from "@/composables/useForm";
import { useAuthStore } from "@/stores/authStore";
import { returBeliBahanFormService } from "@/services/garmen/returBeliBahanFormService";
import {
  IconArrowBackUp,
  IconSearch,
  IconTrash,
  IconPrinter,
} from "@tabler/icons-vue";
import BpbSearchModal from "@/components/lookups/BpbSearchModal.vue";

interface Grid1Row {
  barcode: string;
  kode: string;
  nama: string;
  satuan: string;
  stok: number;
  jumlah: number;
}

interface Grid2Row {
  kode: string;
  nama: string;
  satuan: string;
  qtybpb: number;
  roll: number;
  jumlah: number;
  harga: number;
  total: number;
}

interface ReturBeliBahanFormData {
  nomor: string;
  tanggal: string;
  keterangan: string;
  bpbNomor: string;
  bpbTanggal: string;
  supKode: string;
  supNama: string;
  supAlamat: string;
  supKota: string;
  ppnChecked: boolean;
  ppnValue: number;
  grid1: Grid1Row[];
  grid2: Grid2Row[];
}

const router = useRouter();
const toast = useToast();
const authStore = useAuthStore();

const BROWSE_PATH = "/garmen/bahan-baku/retur-pembelian-bahan";

const canLihatBeli = computed(() => authStore.user?.flags?.lihatBeli === 1);
const canLihatSup = computed(() => authStore.user?.flags?.lihatSup === 1);

const blankGrid1Row = (): Grid1Row => ({
  barcode: "",
  kode: "",
  nama: "",
  satuan: "",
  stok: 0,
  jumlah: 0,
});

const ensureTrailingGrid1Row = (grid1: Grid1Row[]) => {
  const last = grid1[grid1.length - 1];
  if (!last || last.kode) grid1.push(blankGrid1Row());
};

// ── fetchApi / submitApi ────────────────────────────────────────────────
const fetchApi = async (): Promise<ReturBeliBahanFormData> => {
  const nomorEdit = params.nomor as string;
  const res = await returBeliBahanFormService.getFormData(nomorEdit);
  const d = res.data.data;

  bpbLastFetched.value = d.header.bpbNomor;

  const grid1: Grid1Row[] = d.grid1.map((r: any) => ({
    barcode: r.barcode,
    kode: r.kode,
    nama: r.nama,
    satuan: r.satuan,
    stok: Number(r.stok) || 0,
    jumlah: Number(r.jumlah) || 0,
  }));
  ensureTrailingGrid1Row(grid1);

  return {
    nomor: d.header.nomor,
    tanggal: String(d.header.tanggal).substring(0, 10),
    keterangan: d.header.keterangan,
    bpbNomor: d.header.bpbNomor,
    bpbTanggal: String(d.header.bpbTanggal || "").substring(0, 10),
    supKode: d.header.supKode,
    supNama: d.header.supNama,
    supAlamat: d.header.supAlamat,
    supKota: d.header.supKota,
    ppnChecked: Number(d.header.ppnChecked) !== 0,
    ppnValue: Number(d.header.ppnValue) || 0,
    grid1,
    grid2: d.grid2.map((r: any) => ({
      kode: r.kode,
      nama: r.nama,
      satuan: r.satuan,
      qtybpb: Number(r.qtybpb) || 0,
      roll: Number(r.roll) || 0,
      jumlah: Number(r.jumlah) || 0,
      harga: Number(r.harga) || 0,
      total: Number(r.total) || 0,
    })),
  };
};

const submitApi = async (data: ReturBeliBahanFormData) => {
  const payload = {
    tanggal: data.tanggal,
    keterangan: data.keterangan,
    bpbNomor: data.bpbNomor,
    supKode: data.supKode,
    ppnChecked: data.ppnChecked,
    ppnValue: data.ppnValue,
    barcodeRows: data.grid1
      .filter((r) => r.kode)
      .map((r) => ({
        barcode: r.barcode,
        kode: r.kode,
        jumlah: r.jumlah,
      })),
  };
  return isEditMode.value
    ? returBeliBahanFormService.update(data.nomor, payload)
    : returBeliBahanFormService.create(payload);
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
} = useForm<ReturBeliBahanFormData>({
  menuId: "55",
  initialData: {
    nomor: "",
    tanggal: "",
    keterangan: "",
    bpbNomor: "",
    bpbTanggal: "",
    supKode: "",
    supNama: "",
    supAlamat: "",
    supKota: "",
    ppnChecked: false,
    ppnValue: 0,
    grid1: [blankGrid1Row()],
    grid2: [],
  },
  fetchApi,
  submitApi,
  onSuccessRoute: BROWSE_PATH,
  immediate: false,
  onSuccess: (res: any) => {
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

// Default tanggal mode-create diambil dari endpoint terpisah (getDefault),
// bukan dari fetchApi (yang cuma jalan pas edit).
const loadData = async () => {
  await fetchData();
  if (!isEditMode.value) {
    const res = await returBeliBahanFormService.getDefault();
    fd.value.tanggal = res.data.data.tanggal;
  }
};
loadData();

// --- GRID 2 (agregat, dihitung client-side buat preview) ---
const recomputeGrid2 = () => {
  const agregat: Record<string, number> = {};
  fd.value.grid1
    .filter((r) => r.kode)
    .forEach((r) => {
      agregat[r.kode] = (agregat[r.kode] || 0) + (Number(r.jumlah) || 0);
    });
  fd.value.grid2.forEach((row) => {
    row.jumlah = agregat[row.kode] || 0;
    row.total = row.jumlah * (row.harga || 0);
  });
};

// --- BARCODE SCAN ---
const onBarcodeBlur = async (idx: number) => {
  const kodeBarcode = (fd.value.grid1[idx].barcode || "").trim();
  if (!kodeBarcode) return;

  if (!fd.value.bpbNomor) {
    toast.warning("No.BPB di isi dulu ya!");
    fd.value.grid1[idx].barcode = "";
    return;
  }

  const dupIdx = fd.value.grid1.findIndex(
    (r, i) => i !== idx && r.barcode === kodeBarcode,
  );
  if (dupIdx !== -1) {
    toast.warning(`Barcode tsb sudah discan, di baris ${dupIdx + 1}`);
    fd.value.grid1[idx].barcode = "";
    return;
  }

  try {
    const res = await returBeliBahanFormService.getBarcode(
      kodeBarcode,
      fd.value.bpbNomor,
    );
    const d = res.data.data;
    fd.value.grid1[idx] = {
      barcode: d.barcode,
      kode: d.kode,
      nama: d.nama,
      satuan: d.satuan,
      stok: d.stok,
      jumlah: d.jumlah,
    };
    ensureTrailingGrid1Row(fd.value.grid1);
    recomputeGrid2();
  } catch (e: any) {
    toast.error(e.response?.data?.message || "Gagal memuat data barcode.");
    fd.value.grid1[idx].barcode = "";
  }
};

const onJumlahGrid1Change = () => {
  recomputeGrid2();
};

// --- HAPUS BARIS GRID 1 ---
const deleteRowDialog = ref(false);
const rowToDeleteIdx = ref<number | null>(null);

const requestRemoveGrid1Row = (idx: number) => {
  rowToDeleteIdx.value = idx;
  deleteRowDialog.value = true;
};

const confirmRemoveGrid1Row = () => {
  if (rowToDeleteIdx.value === null) return;
  fd.value.grid1.splice(rowToDeleteIdx.value, 1);
  ensureTrailingGrid1Row(fd.value.grid1);
  recomputeGrid2();
  deleteRowDialog.value = false;
  rowToDeleteIdx.value = null;
};

// --- BPB LOOKUP ---
const bpbLastFetched = ref("");
const showBpbModal = ref(false);

const fetchBpbData = async (kodeRaw: string) => {
  const kode = (kodeRaw || "").trim().toUpperCase();
  fd.value.bpbNomor = kode;
  if (!kode || kode === bpbLastFetched.value) return;

  try {
    isLoading.value = true;
    const res = await returBeliBahanFormService.getBpb(kode);
    const d = res.data.data;
    bpbLastFetched.value = kode;

    fd.value.supKode = d.header.supKode;
    fd.value.supNama = d.header.supNama;
    fd.value.supAlamat = d.header.supAlamat;
    fd.value.supKota = d.header.supKota;
    fd.value.bpbTanggal = String(d.header.bpbTanggal || "").substring(0, 10);
    fd.value.ppnChecked = Number(d.header.ppnChecked) !== 0;
    fd.value.ppnValue = Number(d.header.ppnValue) || 0;

    fd.value.grid1 = [blankGrid1Row()];
    fd.value.grid2 = d.grid2.map((r: any) => ({
      kode: r.kode,
      nama: r.nama,
      satuan: r.satuan,
      qtybpb: r.qtybpb,
      roll: r.roll,
      jumlah: 0,
      harga: r.harga ?? 0,
      total: 0,
    }));
  } catch (e: any) {
    toast.error(e.response?.data?.message || "BPB tsb belum ada.");
    fd.value.bpbNomor = "";
    bpbLastFetched.value = "";
  } finally {
    isLoading.value = false;
  }
};

const onBpbBlur = () => fetchBpbData(fd.value.bpbNomor);
const onBpbSelected = (item: any) => fetchBpbData(item.Nomor);

// --- TOTAL ---
const totalNominal = computed(() =>
  fd.value.grid2.reduce((s, r) => s + (r.total || 0), 0),
);
const totalPpn = computed(() =>
  fd.value.ppnChecked ? (totalNominal.value * fd.value.ppnValue) / 100 : 0,
);
const grandTotal = computed(() => totalNominal.value + totalPpn.value);

const onPpnCheckedChange = () => {
  fd.value.ppnValue = fd.value.ppnChecked ? 11 : 0;
};
const onPpnValueBlur = () => {
  fd.value.ppnChecked = Number(fd.value.ppnValue) !== 0;
};

// --- VALIDASI ---
const onValidateSave = () => {
  const filled = fd.value.grid1.filter((r) => r.kode);
  if (filled.length === 0) {
    toast.error("Tidak ada detail,tidak dapat di simpan");
    return;
  }
  const totalQty = filled.reduce((s, r) => s + (Number(r.jumlah) || 0), 0);
  if (totalQty === 0) {
    toast.error("Qty Retur 0 semua , tidak bisa di simpan.");
    return;
  }
  if (!fd.value.bpbNomor) {
    toast.error("Nomor BPB harus diisi.");
    return;
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

const numFmt = (v: any) => (v ? Number(v).toLocaleString("id-ID") : "0");
</script>

<template>
  <BaseForm
    :title="
      isEditMode
        ? `Ubah Retur Pembelian Bahan - ${fd.nomor}`
        : 'Tambah Retur Pembelian Bahan'
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
          <label class="lbl">No. BPB</label>
          <div class="igrp" style="flex: 1">
            <input
              v-model="fd.bpbNomor"
              class="inp"
              style="flex: 1; background: #ddeeff"
              :readonly="isEditMode"
              placeholder="Ketik No. BPB (dari PO) lalu Enter..."
              @keydown.enter.prevent="
                ($event.target as HTMLInputElement).blur()
              "
              @blur="onBpbBlur"
            />
            <button
              type="button"
              class="blkp"
              title="Cari BPB (dari PO)"
              :disabled="isEditMode"
              @mousedown.prevent="showBpbModal = true"
            >
              <IconSearch :size="12" color="#1565c0" />
            </button>
          </div>
        </div>
        <div class="fr" v-if="fd.bpbTanggal">
          <label class="lbl">Tgl. BPB</label>
          <input
            :value="fd.bpbTanggal"
            readonly
            class="inp ro"
            style="flex: 1"
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
            <div class="fr">
              <input
                :value="fd.supKota"
                readonly
                class="inp ro"
                style="flex: 1"
              />
            </div>
          </div>
        </template>

        <div class="sep" />

        <div class="fr">
          <label class="chk-lbl">
            <input
              type="checkbox"
              v-model="fd.ppnChecked"
              @change="onPpnCheckedChange"
            />
            PPN %
          </label>
          <input
            v-model.number="fd.ppnValue"
            type="number"
            class="inp ml-1"
            style="width: 70px"
            :disabled="!fd.ppnChecked"
            @blur="onPpnValueBlur"
          />
        </div>

        <template v-if="canLihatBeli">
          <div class="sep" />
          <div class="fieldset-box">
            <div class="fieldset-legend">Grand Total</div>
            <div class="fr">
              <label class="lbl">Total</label>
              <input
                :value="numFmt(totalNominal)"
                readonly
                class="inp ro text-right"
                style="flex: 1"
              />
            </div>
            <div class="fr">
              <label class="lbl">Ppn</label>
              <input
                :value="numFmt(totalPpn)"
                readonly
                class="inp ro text-right"
                style="flex: 1"
              />
            </div>
            <div class="fr">
              <label class="lbl fw">Grand Total</label>
              <input
                :value="numFmt(grandTotal)"
                readonly
                class="inp ro text-right fw"
                style="flex: 1; background: #fff9c4"
              />
            </div>
          </div>
        </template>
      </div>
    </template>

    <template #right-column>
      <div class="rbb-right">
        <div class="tbl-header">
          <span class="tbl-title">1. Scan / Input Barcode</span>
        </div>
        <div class="tbl-wrap" style="max-height: 42vh">
          <table class="gt">
            <thead>
              <tr>
                <th style="width: 32px" class="tc">No</th>
                <th style="width: 140px">Barcode</th>
                <th style="width: 90px">Kode</th>
                <th>Nama Bahan</th>
                <th style="width: 55px" class="tc">Satuan</th>
                <th style="width: 85px" class="tr">Stok</th>
                <th style="width: 85px" class="tr bg-yellow">Jumlah</th>
                <th style="width: 32px" class="tc"></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(row, idx) in fd.grid1" :key="idx">
                <td class="tc gt-lbl">{{ idx + 1 }}</td>
                <td class="p0">
                  <input
                    v-model="row.barcode"
                    class="ci"
                    :readonly="!!row.kode"
                    placeholder="Scan / ketik barcode..."
                    @keydown.enter.prevent="
                      ($event.target as HTMLInputElement).blur()
                    "
                    @blur="onBarcodeBlur(idx)"
                  />
                </td>
                <td class="px-1">{{ row.kode }}</td>
                <td class="px-1" :title="row.nama">{{ row.nama }}</td>
                <td class="tc px-1">{{ row.satuan }}</td>
                <td class="tr px-1">{{ numFmt(row.stok) }}</td>
                <td class="p0">
                  <input
                    v-model.number="row.jumlah"
                    type="number"
                    class="ci tr fw bg-yellow-light"
                    :disabled="!row.kode"
                    @input="onJumlahGrid1Change"
                  />
                </td>
                <td class="tc">
                  <button
                    v-if="row.kode"
                    type="button"
                    class="btn-del"
                    @click="requestRemoveGrid1Row(idx)"
                  >
                    <IconTrash :size="13" />
                  </button>
                </td>
              </tr>
              <tr v-if="fd.grid1.length === 0">
                <td colspan="8" class="empty-row">
                  Isi No. BPB dulu, lalu scan barcode di sini.
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="tbl-header teal mt-2">
          <span class="tbl-title">2. Rekap Retur per Bahan</span>
        </div>
        <div class="tbl-wrap" style="max-height: 30vh">
          <table class="gt">
            <thead>
              <tr>
                <th style="width: 32px" class="tc">No</th>
                <th style="width: 90px">Kode</th>
                <th>Nama Bahan</th>
                <th style="width: 55px" class="tc">Satuan</th>
                <th style="width: 75px" class="tr">Qty BPB</th>
                <th style="width: 60px" class="tr">Roll</th>
                <th style="width: 85px" class="tr bg-yellow">Qty Retur</th>
                <th v-if="canLihatBeli" style="width: 90px" class="tr">
                  Harga
                </th>
                <th v-if="canLihatBeli" style="width: 100px" class="tr">
                  Total Retur
                </th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(row, idx) in fd.grid2" :key="idx">
                <td class="tc gt-lbl">{{ idx + 1 }}</td>
                <td class="px-1">{{ row.kode }}</td>
                <td class="px-1" :title="row.nama">{{ row.nama }}</td>
                <td class="tc px-1">{{ row.satuan }}</td>
                <td class="tr px-1">{{ numFmt(row.qtybpb) }}</td>
                <td class="tr px-1">{{ numFmt(row.roll) }}</td>
                <td class="tr px-1 fw text-blue-darken-2">
                  {{ numFmt(row.jumlah) }}
                </td>
                <td v-if="canLihatBeli" class="tr px-1">
                  {{ numFmt(row.harga) }}
                </td>
                <td v-if="canLihatBeli" class="tr px-1 fw">
                  {{ numFmt(row.total) }}
                </td>
              </tr>
              <tr v-if="fd.grid2.length === 0">
                <td :colspan="canLihatBeli ? 9 : 7" class="empty-row">
                  Belum ada bahan — isi No. BPB dulu.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </template>
  </BaseForm>

  <v-dialog v-model="deleteRowDialog" max-width="360">
    <v-card rounded="lg">
      <v-card-title class="text-subtitle-1 pa-4 d-flex align-center">
        <v-icon color="warning" class="mr-2">mdi-alert-circle-outline</v-icon>
        Hapus Baris?
      </v-card-title>
      <v-card-text class="pa-4 pt-0 text-body-2">
        Baris scan
        <b>{{
          rowToDeleteIdx !== null ? fd.grid1[rowToDeleteIdx]?.nama : ""
        }}</b>
        akan dihapus. Lanjutkan?
      </v-card-text>
      <v-card-actions class="pa-3 border-t">
        <v-spacer />
        <v-btn variant="text" @click="deleteRowDialog = false">Batal</v-btn>
        <v-btn color="error" variant="elevated" @click="confirmRemoveGrid1Row"
          >Ya, Hapus</v-btn
        >
      </v-card-actions>
    </v-card>
  </v-dialog>

  <v-dialog v-model="showPrintConfirm" max-width="400" persistent>
    <v-card class="rounded-lg">
      <v-card-title class="bg-primary text-white d-flex align-center pa-3">
        <IconPrinter class="mr-2" :size="20" />
        <span>Simpan Berhasil</span>
      </v-card-title>
      <v-card-text class="pa-4 text-center">
        <div class="text-body-1 mb-2">
          Data Retur <b>{{ nomorTerakhir }}</b> telah disimpan.
        </div>
        <div class="text-body-2 text-grey-darken-1">
          Apakah Anda ingin mencetak dokumen retur ini sekarang?
        </div>
      </v-card-text>
      <v-card-actions class="pa-3 border-t">
        <v-btn variant="text" @click="skipPrint">Tidak, Tutup</v-btn>
        <v-spacer />
        <v-btn color="primary" variant="elevated" @click="doPrintDocument">
          <IconPrinter :size="16" class="mr-1" /> Ya, Cetak
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <BpbSearchModal v-model="showBpbModal" @selected="onBpbSelected" />
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
.mt-2 {
  margin-top: 8px;
}
.text-right {
  text-align: right;
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
.inp:disabled {
  background: #f0f0f0 !important;
  color: #9e9e9e;
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
.chk-lbl {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
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
  background: #1565c0;
  color: white;
  padding: 5px 10px;
  border-radius: 3px 3px 0 0;
  flex-shrink: 0;
}
.tbl-header.teal {
  background: #00695c;
}
.tbl-title {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
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
  font-size: 10px;
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

.btn-del {
  background: transparent;
  color: #d32f2f;
  border: none;
  cursor: pointer;
  padding: 3px 5px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto;
}
.btn-del:hover {
  background: #ffebee;
  border-radius: 2px;
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
</style>
