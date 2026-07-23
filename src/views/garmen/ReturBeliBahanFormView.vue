<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useToast } from "vue-toastification";
import BaseForm from "@/components/BaseForm.vue";
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

const route = useRoute();
const router = useRouter();
const toast = useToast();
const authStore = useAuthStore();

const canLihatBeli = computed(() => authStore.user?.flags?.lihatBeli === 1);
const canLihatSup = computed(() => authStore.user?.flags?.lihatSup === 1);

const nomorParam = computed(() => route.params.nomor as string | undefined);
const isEditMode = computed(() => !!nomorParam.value);

const isLoading = ref(true);
const isSaving = ref(false);

const showSaveDialog = ref(false);
const showCancelDialog = ref(false);
const showCloseDialog = ref(false);
const showPrintConfirm = ref(false);
const nomorTerakhir = ref("");

// --- STATE HEADER ---
const nomor = ref("");
const tanggal = ref("");
const keterangan = ref("");
const bpbNomor = ref("");
const bpbTanggal = ref("");
const supKode = ref("");
const supNama = ref("");
const supAlamat = ref("");
const supKota = ref("");
const ppnChecked = ref(false);
const ppnValue = ref(0);

// --- GRID 1 (scan barcode) ---
const grid1 = ref<Grid1Row[]>([]);
const blankGrid1Row = (): Grid1Row => ({
  barcode: "",
  kode: "",
  nama: "",
  satuan: "",
  stok: 0,
  jumlah: 0,
});
const ensureTrailingGrid1Row = () => {
  const last = grid1.value[grid1.value.length - 1];
  if (!last || last.kode) grid1.value.push(blankGrid1Row());
};

// --- GRID 2 (agregat bahan, dihitung client-side buat preview) ---
const grid2 = ref<Grid2Row[]>([]);

const recomputeGrid2 = () => {
  const agregat: Record<string, number> = {};
  grid1.value
    .filter((r) => r.kode)
    .forEach((r) => {
      agregat[r.kode] = (agregat[r.kode] || 0) + (Number(r.jumlah) || 0);
    });
  grid2.value.forEach((row) => {
    row.jumlah = agregat[row.kode] || 0;
    row.total = row.jumlah * (row.harga || 0);
  });
};

// --- BARCODE SCAN ---
const onBarcodeBlur = async (idx: number) => {
  const kodeBarcode = (grid1.value[idx].barcode || "").trim();
  if (!kodeBarcode) return;

  if (!bpbNomor.value) {
    toast.warning("No.BPB di isi dulu ya!");
    grid1.value[idx].barcode = "";
    return;
  }

  // ✅ Replikasi cek "barcode sudah discan di baris lain" — state lokal
  const dupIdx = grid1.value.findIndex(
    (r, i) => i !== idx && r.barcode === kodeBarcode,
  );
  if (dupIdx !== -1) {
    toast.warning(`Barcode tsb sudah discan, di baris ${dupIdx + 1}`);
    grid1.value[idx].barcode = "";
    return;
  }

  try {
    const res = await returBeliBahanFormService.getBarcode(
      kodeBarcode,
      bpbNomor.value,
    );
    const d = res.data.data;
    grid1.value[idx] = {
      barcode: d.barcode,
      kode: d.kode,
      nama: d.nama,
      satuan: d.satuan,
      stok: d.stok,
      jumlah: d.jumlah,
    };
    ensureTrailingGrid1Row();
    recomputeGrid2();
  } catch (e: any) {
    toast.error(e.response?.data?.message || "Gagal memuat data barcode.");
    grid1.value[idx].barcode = "";
  }
};

const onJumlahGrid1Change = () => {
  recomputeGrid2();
};

// --- HAPUS BARIS GRID 1 (konfirmasi dialog) ---
const deleteRowDialog = ref(false);
const rowToDeleteIdx = ref<number | null>(null);

const requestRemoveGrid1Row = (idx: number) => {
  rowToDeleteIdx.value = idx;
  deleteRowDialog.value = true;
};

const confirmRemoveGrid1Row = () => {
  if (rowToDeleteIdx.value === null) return;
  grid1.value.splice(rowToDeleteIdx.value, 1);
  ensureTrailingGrid1Row();
  recomputeGrid2();
  deleteRowDialog.value = false;
  rowToDeleteIdx.value = null;
};

// --- BPB LOOKUP ---
const bpbLastFetched = ref(""); // ✅ replikasi xbpb — hindari re-fetch kalau value gak berubah
const showBpbModal = ref(false);

const fetchBpbData = async (kodeRaw: string) => {
  const kode = (kodeRaw || "").trim().toUpperCase();
  bpbNomor.value = kode;
  if (!kode || kode === bpbLastFetched.value) return;

  try {
    isLoading.value = true;
    const res = await returBeliBahanFormService.getBpb(kode);
    const d = res.data.data;
    bpbLastFetched.value = kode;

    supKode.value = d.header.supKode;
    supNama.value = d.header.supNama;
    supAlamat.value = d.header.supAlamat;
    supKota.value = d.header.supKota;
    bpbTanggal.value = String(d.header.bpbTanggal || "").substring(0, 10);
    ppnChecked.value = Number(d.header.ppnChecked) !== 0;
    ppnValue.value = Number(d.header.ppnValue) || 0;

    // ✅ Ganti BPB → reset grid 1 (scan ulang dari awal), seed grid 2
    grid1.value = [blankGrid1Row()];
    grid2.value = d.grid2.map((r: any) => ({
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
    bpbNomor.value = "";
    bpbLastFetched.value = "";
  } finally {
    isLoading.value = false;
  }
};

const onBpbBlur = () => fetchBpbData(bpbNomor.value);
const onBpbSelected = (item: any) => fetchBpbData(item.Nomor);

// --- TOTAL (footer, cuma dihitung kalau canLihatBeli) ---
const totalNominal = computed(() =>
  grid2.value.reduce((s, r) => s + (r.total || 0), 0),
);
const totalPpn = computed(() =>
  ppnChecked.value ? (totalNominal.value * ppnValue.value) / 100 : 0,
);
const grandTotal = computed(() => totalNominal.value + totalPpn.value);

// ✅ replikasi cbbPPNClick — centang PPN auto-isi 11%, uncheck jadi 0
const onPpnCheckedChange = () => {
  ppnValue.value = ppnChecked.value ? 11 : 0;
};

// ✅ replikasi edtPpnExit — sinkron balik: isi manual 0 → auto uncheck,
// isi manual >0 → auto checked
const onPpnValueBlur = () => {
  ppnChecked.value = Number(ppnValue.value) !== 0;
};

// --- LOAD DATA ---
const loadData = async () => {
  isLoading.value = true;
  try {
    if (isEditMode.value) {
      const res = await returBeliBahanFormService.getFormData(
        nomorParam.value!,
      );
      const d = res.data.data;
      nomor.value = d.header.nomor;
      tanggal.value = String(d.header.tanggal).substring(0, 10);
      keterangan.value = d.header.keterangan;
      bpbNomor.value = d.header.bpbNomor;
      bpbLastFetched.value = d.header.bpbNomor;
      bpbTanggal.value = String(d.header.bpbTanggal || "").substring(0, 10);
      supKode.value = d.header.supKode;
      supNama.value = d.header.supNama;
      supAlamat.value = d.header.supAlamat;
      supKota.value = d.header.supKota;
      ppnChecked.value = Number(d.header.ppnChecked) !== 0;
      ppnValue.value = Number(d.header.ppnValue) || 0;

      grid1.value = d.grid1.map((r: any) => ({
        barcode: r.barcode,
        kode: r.kode,
        nama: r.nama,
        satuan: r.satuan,
        stok: Number(r.stok) || 0,
        jumlah: Number(r.jumlah) || 0,
      }));
      ensureTrailingGrid1Row();

      grid2.value = d.grid2.map((r: any) => ({
        kode: r.kode,
        nama: r.nama,
        satuan: r.satuan,
        qtybpb: Number(r.qtybpb) || 0,
        roll: Number(r.roll) || 0,
        jumlah: Number(r.jumlah) || 0,
        harga: Number(r.harga) || 0,
        total: Number(r.total) || 0,
      }));
    } else {
      const res = await returBeliBahanFormService.getDefault();
      tanggal.value = res.data.data.tanggal;
      grid1.value = [blankGrid1Row()];
      grid2.value = [];
    }
  } catch (e: any) {
    toast.error(e.response?.data?.message || "Gagal memuat data.");
    router.push({ name: "ReturBeliBahanBrowse" });
  } finally {
    isLoading.value = false;
  }
};

onMounted(loadData);

// --- VALIDASI SEBELUM SIMPAN (replikasi F10) ---
const onValidateSave = () => {
  const filled = grid1.value.filter((r) => r.kode);
  if (filled.length === 0) {
    return toast.error("Tidak ada detail,tidak dapat di simpan");
  }
  const totalQty = filled.reduce((s, r) => s + (Number(r.jumlah) || 0), 0);
  if (totalQty === 0) {
    return toast.error("Qty Retur 0 semua , tidak bisa di simpan.");
  }
  if (!bpbNomor.value) {
    return toast.error("Nomor BPB harus diisi.");
  }
  showSaveDialog.value = true;
};

// --- SUBMIT SIMPAN ---
const onConfirmSave = async () => {
  isSaving.value = true;
  try {
    const payload = {
      tanggal: tanggal.value,
      keterangan: keterangan.value,
      bpbNomor: bpbNomor.value,
      supKode: supKode.value,
      ppnChecked: ppnChecked.value,
      ppnValue: ppnValue.value,
      barcodeRows: grid1.value
        .filter((r) => r.kode)
        .map((r) => ({
          barcode: r.barcode,
          kode: r.kode,
          jumlah: r.jumlah,
        })),
    };

    const res = isEditMode.value
      ? await returBeliBahanFormService.update(nomor.value, payload)
      : await returBeliBahanFormService.create(payload);

    const savedNomor = res.data.data?.nomor;
    toast.success(res.data.message || "Berhasil disimpan.");
    showSaveDialog.value = false;

    if (savedNomor) {
      nomorTerakhir.value = savedNomor;
      showPrintConfirm.value = true;
    } else {
      router.push({ name: "ReturBeliBahanBrowse" });
    }
  } catch (e: any) {
    toast.error(e.response?.data?.message || "Gagal menyimpan data.");
  } finally {
    isSaving.value = false;
  }
};

const doPrintDocument = () => {
  showPrintConfirm.value = false;
  const url = router.resolve({
    name: "ReturBeliBahanPrint",
    params: { nomor: nomorTerakhir.value },
  }).href;
  window.open(url, "_blank");
  router.push({ name: "ReturBeliBahanBrowse" });
};

const skipPrint = () => {
  showPrintConfirm.value = false;
  router.push({ name: "ReturBeliBahanBrowse" });
};

// --- BATAL / TUTUP ---
const onConfirmCancel = () => {
  showCancelDialog.value = false;
  loadData();
};

const onConfirmClose = () => {
  router.push({ name: "ReturBeliBahanBrowse" });
};

const numFmt = (v: any) => (v ? Number(v).toLocaleString("id-ID") : "0");
</script>

<template>
  <BaseForm
    :title="
      isEditMode
        ? `Ubah Retur Pembelian Bahan - ${nomor}`
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
    @confirm-save="onConfirmSave"
    @confirm-cancel="onConfirmCancel"
    @confirm-close="onConfirmClose"
  >
    <!-- LEFT COLUMN: Header + Grand Total -->
    <template #left-column>
      <div class="rbb-left">
        <div class="fr">
          <label class="lbl">Nomor</label>
          <input
            :value="nomor || '<-- Kosong=Baru'"
            readonly
            class="inp ro"
            style="flex: 1"
          />
        </div>
        <div class="fr">
          <label class="lbl">Tanggal</label>
          <input type="date" v-model="tanggal" class="idate" style="flex: 1" />
        </div>

        <div class="sep" />

        <div class="fr">
          <label class="lbl">No. BPB</label>
          <div class="igrp" style="flex: 1">
            <input
              v-model="bpbNomor"
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
        <div class="fr" v-if="bpbTanggal">
          <label class="lbl">Tgl. BPB</label>
          <input :value="bpbTanggal" readonly class="inp ro" style="flex: 1" />
        </div>

        <div class="fr">
          <label class="lbl" style="align-self: flex-start; padding-top: 4px"
            >Keterangan</label
          >
          <textarea v-model="keterangan" class="ta" rows="2" style="flex: 1" />
        </div>

        <template v-if="canLihatSup">
          <div class="sep" />
          <div class="fieldset-box">
            <div class="fieldset-legend">Supplier</div>
            <div class="fr">
              <input
                :value="supKode"
                readonly
                class="inp ro"
                style="width: 70px"
              />
              <input
                :value="supNama"
                readonly
                class="inp ro ml-1"
                style="flex: 1"
              />
            </div>
            <div class="fr">
              <input
                :value="supAlamat"
                readonly
                class="inp ro"
                style="flex: 1"
              />
            </div>
            <div class="fr">
              <input :value="supKota" readonly class="inp ro" style="flex: 1" />
            </div>
          </div>
        </template>

        <div class="sep" />

        <div class="fr">
          <label class="chk-lbl">
            <input
              type="checkbox"
              v-model="ppnChecked"
              @change="onPpnCheckedChange"
            />
            PPN %
          </label>
          <input
            v-model.number="ppnValue"
            type="number"
            class="inp ml-1"
            style="width: 70px"
            :disabled="!ppnChecked"
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

    <!-- RIGHT COLUMN: 2 tabel stacked -->
    <template #right-column>
      <div class="rbb-right">
        <!-- Tabel 1: Scan Barcode -->
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
              <tr v-for="(row, idx) in grid1" :key="idx">
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
              <tr v-if="grid1.length === 0">
                <td colspan="8" class="empty-row">
                  Isi No. BPB dulu, lalu scan barcode di sini.
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Tabel 2: Agregat Bahan (read-only) -->
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
              <tr v-for="(row, idx) in grid2" :key="idx">
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
              <tr v-if="grid2.length === 0">
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

  <!-- Dialog Konfirmasi Hapus Baris -->
  <v-dialog v-model="deleteRowDialog" max-width="360">
    <v-card rounded="lg">
      <v-card-title class="text-subtitle-1 pa-4 d-flex align-center">
        <v-icon color="warning" class="mr-2">mdi-alert-circle-outline</v-icon>
        Hapus Baris?
      </v-card-title>
      <v-card-text class="pa-4 pt-0 text-body-2">
        Baris scan
        <b>{{ rowToDeleteIdx !== null ? grid1[rowToDeleteIdx]?.nama : "" }}</b>
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

  <!-- Dialog Konfirmasi Cetak Setelah Simpan -->
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
