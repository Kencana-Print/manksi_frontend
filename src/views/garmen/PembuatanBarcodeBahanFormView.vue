<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useToast } from "vue-toastification";
import BaseForm from "@/components/BaseForm.vue";
import PembuatanBarcodeBahanStickerDialog from "./PembuatanBarcodeBahanStickerDialog.vue";
import { pembuatanBarcodeBahanFormService } from "@/services/garmen/pembuatanBarcodeBahanFormService";
import { useAuthStore } from "@/stores/authStore";
import {
  IconBarcode,
  IconSearch,
  IconTrash,
  IconPrinter,
} from "@tabler/icons-vue";

import BahanSearchModal from "@/components/lookups/BahanSearchModal.vue";
import BpbSearchModal from "@/components/lookups/BpbSearchModal.vue";
import ReturBahanSearchModal from "@/components/lookups/ReturBahanSearchModal.vue";

interface Grid1Row {
  kode: string;
  kodex: string; // locked kalau dari BPB/Retur
  nama: string;
  satuan: string;
  jumlah: number;
  roll: number;
  rollx: number; // locked kalau dari BPB/Retur
}

interface Grid2Row {
  no: number;
  kode: string;
  nama: string;
  barcode: string;
  jumlah: number;
}

const route = useRoute();
const router = useRouter();
const toast = useToast();
const authStore = useAuthStore();

const nomorParam = computed(() => route.params.nomor as string | undefined);
const isEditMode = computed(() => !!nomorParam.value);

const isLoading = ref(true);
const isSaving = ref(false);

const showSaveDialog = ref(false);
const showCancelDialog = ref(false);
const showCloseDialog = ref(false);

// --- STATE HEADER ---
const nomor = ref("");
const tanggal = ref("");
const cabang = ref("");
const cabangLocked = ref(false);
const bpbNomor = ref("");
const poNomor = ref("");
const langsungCetak = ref(false);
const printerName = ref("Xprinter XP-360B"); // ✅ placeholder doang, bukan dropdown fungsional

// ✅ hardcode sesuai instruksi — list cabang combo gak ketemu
// sumbernya di source Delphi (kemungkinan hardcode di .dfm designer)
const CABANG_OPTIONS = ["P01", "P04"];

// --- GRID STATE ---
const grid1 = ref<Grid1Row[]>([]);
const grid2 = ref<Grid2Row[]>([]);

const blankGrid1Row = (): Grid1Row => ({
  kode: "",
  kodex: "",
  nama: "",
  satuan: "",
  jumlah: 0,
  roll: 0,
  rollx: 0,
});

const ensureTrailingGrid1Row = () => {
  const last = grid1.value[grid1.value.length - 1];
  if (!last || last.kode) grid1.value.push(blankGrid1Row());
};

// --- SAVE STATE (buat workflow Langsung Cetak) ---
const isSavedOnce = ref(false); // sama kayak FLAGEDIT

// --- MODAL BAHAN (mode manual) ---
const showBahanModal = ref(false);
const activeGrid1Index = ref<number | null>(null);

const openBahanModal = (idx: number) => {
  const row = grid1.value[idx];
  if (row.kodex) return; // ✅ locked (dari BPB/Retur), gak bisa diganti
  if (bpbNomor.value.trim()) return; // ✅ F1 cuma aktif kalau No.BPB/Retur kosong
  activeGrid1Index.value = idx;
  showBahanModal.value = true;
};

const onKodeKeydown = (e: KeyboardEvent, idx: number) => {
  if (e.key === "F1") {
    e.preventDefault();
    openBahanModal(idx);
  }
};

const applyKodeToGrid1 = (
  idx: number,
  item: { kode: string; nama: string; satuan: string },
) => {
  const dupIdx = grid1.value.findIndex(
    (r, i) => i !== idx && r.kode === item.kode,
  );
  if (dupIdx !== -1) {
    toast.warning(`Kode Bahan ini sudah di input, di baris ${dupIdx + 1}`);
    return;
  }
  grid1.value[idx] = {
    ...grid1.value[idx],
    kode: item.kode,
    nama: item.nama,
    satuan: item.satuan,
  };
  ensureTrailingGrid1Row();
};

const onBahanSelected = (item: any) => {
  const idx = activeGrid1Index.value;
  if (idx === null) return;
  applyKodeToGrid1(idx, {
    kode: item.Kode,
    nama: item.Nama,
    satuan: item.Satuan,
  });
};

const onKodeBlur = async (idx: number) => {
  const row = grid1.value[idx];
  if (row.kodex || bpbNomor.value.trim()) return; // locked / mode BPB
  const kode = (row.kode || "").trim().toUpperCase();
  if (!kode) return;

  const dupIdx = grid1.value.findIndex((r, i) => i !== idx && r.kode === kode);
  if (dupIdx !== -1) {
    toast.warning(`Kode Bahan ini sudah di input, di baris ${dupIdx + 1}`);
    grid1.value[idx].kode = "";
    return;
  }

  try {
    const res = await pembuatanBarcodeBahanFormService.getBarang(kode);
    applyKodeToGrid1(idx, res.data.data);
  } catch (e: any) {
    toast.error(e.response?.data?.message || "Kode Bahan tsb tidak ada.");
    grid1.value[idx].kode = "";
  }
};

// --- ROLL CHANGE (generate barcode) ---
const onRollBlur = async (idx: number) => {
  const row = grid1.value[idx];
  if (!row.kode) return;

  if (row.rollx !== 0) {
    // ✅ locked (dari BPB/Retur) — apapun yg diketik, balik ke rollx
    row.roll = row.rollx;
    return;
  }

  // Mode manual — regenerate barcode utk kode ini
  grid2.value = grid2.value.filter((b) => b.kode !== row.kode);
  const roll = Number(row.roll) || 0;
  if (roll <= 0) return;

  try {
    const res = await pembuatanBarcodeBahanFormService.generateRoll({
      kode: row.kode,
      nama: row.nama,
      roll,
      tanggal: tanggal.value,
    });
    grid2.value.push(...res.data.data);
  } catch (e: any) {
    toast.error(e.response?.data?.message || "Gagal generate barcode.");
  }
};

// --- HAPUS BARIS GRID 1 ---
const deleteRowDialog = ref(false);
const rowToDeleteIdx = ref<number | null>(null);

const requestRemoveGrid1Row = (idx: number) => {
  if (bpbNomor.value.trim()) return; // ✅ delete cuma aktif mode manual
  rowToDeleteIdx.value = idx;
  deleteRowDialog.value = true;
};

const confirmRemoveGrid1Row = () => {
  if (rowToDeleteIdx.value === null) return;
  const row = grid1.value[rowToDeleteIdx.value];
  grid1.value.splice(rowToDeleteIdx.value, 1);
  grid2.value = grid2.value.filter((b) => b.kode !== row.kode);
  ensureTrailingGrid1Row();
  deleteRowDialog.value = false;
  rowToDeleteIdx.value = null;
};

// --- BPB / RETUR LOOKUP ---
const showBpbModal = ref(false);
const showReturModal = ref(false);

const onBpbRetKeydown = (e: KeyboardEvent) => {
  if (e.key === "F1") {
    e.preventDefault();
    showBpbModal.value = true;
  } else if (e.key === "F2") {
    e.preventDefault();
    showReturModal.value = true;
  }
};

const processBpbOrRetur = async (kodeInput: string) => {
  const kode = (kodeInput || "").trim();
  if (!kode) return;
  bpbNomor.value = kode;

  try {
    isLoading.value = true;
    const res = await pembuatanBarcodeBahanFormService.getBpbOrRetur(
      kode,
      tanggal.value,
    );
    const d = res.data.data;

    if (d.existingNomor) {
      toast.info(
        `Nomor ini sudah pernah dibuatkan barcode: ${d.existingNomor}`,
      );
      router.replace(
        `/garmen/bahan-baku/pembuatan-barcode-bahan/form/${encodeURIComponent(d.existingNomor)}`,
      );
      return;
    }

    poNomor.value = d.poNomor || "";
    grid1.value = d.grid1.length > 0 ? d.grid1 : [blankGrid1Row()];
    grid2.value = d.grid2;
  } catch (e: any) {
    toast.error(e.response?.data?.message || "BPB/Retur tsb belum ada.");
    bpbNomor.value = "";
  } finally {
    isLoading.value = false;
  }
};

const onBpbRetLostFocus = () => processBpbOrRetur(bpbNomor.value);
const onBpbSelected = (item: any) => processBpbOrRetur(item.Nomor);
const onReturSelected = (item: any) => processBpbOrRetur(item.Nomor);

// --- LANGSUNG CETAK: incremental save per baris + auto print ---
const showStickerDialog = ref(false);
const printBatch = ref<Grid2Row[]>([]);
const activeSatuan = ref("");

const onJumlahBlur = async (idx: number) => {
  if (!langsungCetak.value) return;

  const row = grid2.value[idx];
  if (!row.kode) return;

  try {
    const res = await pembuatanBarcodeBahanFormService.saveRowQty({
      nomor: nomor.value || null,
      tanggal: tanggal.value,
      bpbNomor: bpbNomor.value,
      cabang: cabang.value,
      grid1: grid1.value.filter((r) => r.kode),
      grid2: grid2.value.filter((r) => r.kode),
      isFirstSave: !isSavedOnce.value,
      row: { kode: row.kode, barcode: row.barcode, jumlah: row.jumlah },
    });

    if (!isSavedOnce.value) {
      nomor.value = res.data.data.nomor;
      isSavedOnce.value = true;
    }

    if (res.data.data.shouldPrint) {
      const g1 = grid1.value.find((r) => r.kode === row.kode);
      activeSatuan.value = g1?.satuan || "";
      printBatch.value = [row];
      showStickerDialog.value = true;
    }
  } catch (e: any) {
    toast.error(e.response?.data?.message || "Gagal menyimpan qty.");
  }
};

const printSingleBarcode = (row: Grid2Row) => {
  const g1 = grid1.value.find((r) => r.kode === row.kode);
  activeSatuan.value = g1?.satuan || "";
  printBatch.value = [row];
  showStickerDialog.value = true;
};

const printAllBarcode = () => {
  if (grid2.value.length === 0) {
    return toast.warning("Belum ada barcode untuk dicetak.");
  }
  activeSatuan.value = grid1.value[0]?.satuan || "";
  printBatch.value = grid2.value.filter((r) => r.kode);
  showStickerDialog.value = true;
};

// --- LOAD DATA ---
const loadData = async () => {
  isLoading.value = true;
  try {
    if (isEditMode.value) {
      const res = await pembuatanBarcodeBahanFormService.getFormData(
        nomorParam.value!,
      );
      const d = res.data.data;
      nomor.value = d.header.nomor;
      tanggal.value = String(d.header.tanggal).substring(0, 10);
      cabang.value = d.header.cabang;
      cabangLocked.value = true; // ✅ selalu locked pas mode Ubah (edtbpb.Enabled:=false dkk)
      bpbNomor.value = d.header.bpbNomor || "";
      poNomor.value = d.header.poNomor || "";
      grid1.value = d.grid1.length > 0 ? d.grid1 : [blankGrid1Row()];
      grid2.value = d.grid2;
      isSavedOnce.value = true;
    } else {
      const res = await pembuatanBarcodeBahanFormService.getDefault();
      const d = res.data.data;
      tanggal.value = d.tanggal;
      cabang.value = d.cabang;
      cabangLocked.value = d.cabangLocked;
      grid1.value = [blankGrid1Row()];
      grid2.value = [];
    }
  } catch (e: any) {
    toast.error(e.response?.data?.message || "Gagal memuat data.");
    router.push({ name: "PembuatanBarcodeBahanBrowse" });
  } finally {
    isLoading.value = false;
  }
};

onMounted(loadData);

// --- VALIDASI + SIMPAN (F10, simpan penuh) ---
const onValidateSave = () => {
  // ✅ source Delphi gak punya validasi konten selain permission+
  // confirm — sengaja gak nambah validasi blocking di luar itu.
  showSaveDialog.value = true;
};

const onConfirmSave = async () => {
  isSaving.value = true;
  try {
    const payload = {
      tanggal: tanggal.value,
      bpbNomor: bpbNomor.value,
      cabang: cabang.value,
      grid1: grid1.value.filter((r) => r.kode),
      grid2: grid2.value.filter((r) => r.kode),
    };

    const res =
      isEditMode.value || isSavedOnce.value
        ? await pembuatanBarcodeBahanFormService.update(nomor.value, payload)
        : await pembuatanBarcodeBahanFormService.create(payload);

    toast.success(res.data.message || "Berhasil disimpan.");
    showSaveDialog.value = false;
    router.push({ name: "PembuatanBarcodeBahanBrowse" });
  } catch (e: any) {
    toast.error(e.response?.data?.message || "Gagal menyimpan data.");
  } finally {
    isSaving.value = false;
  }
};

const onConfirmCancel = () => {
  showCancelDialog.value = false;
  loadData();
};

const onConfirmClose = () => {
  router.push({ name: "PembuatanBarcodeBahanBrowse" });
};

const numFmt = (v: any) => (v ? Number(v).toLocaleString("id-ID") : "0");
</script>

<template>
  <BaseForm
    :title="
      isEditMode
        ? `Ubah Pembuatan Barcode - ${nomor}`
        : 'Tambah Pembuatan Barcode Bahan'
    "
    menu-id="135"
    :icon="IconBarcode"
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
    <!-- LEFT COLUMN: Header -->
    <template #left-column>
      <div class="bcb-left">
        <div class="fr">
          <label class="lbl">Nomor</label>
          <input
            :value="nomor || '<-- Kosong = Baru'"
            readonly
            class="inp ro"
            style="flex: 1"
          />
        </div>
        <div class="fr">
          <label class="lbl">Tanggal</label>
          <input type="date" v-model="tanggal" class="idate" style="flex: 1" />
        </div>
        <div class="fr">
          <label class="lbl">Cabang</label>
          <select
            v-model="cabang"
            class="inp"
            style="flex: 1"
            :disabled="cabangLocked"
          >
            <option value="">- Pilih -</option>
            <option v-for="c in CABANG_OPTIONS" :key="c" :value="c">
              {{ c }}
            </option>
          </select>
        </div>

        <div class="sep" />

        <div class="fr">
          <label class="lbl">No.BPB/Retur</label>
          <input
            v-model="bpbNomor"
            class="inp"
            style="flex: 1; background: #ddeeff"
            :readonly="isEditMode"
            placeholder="F1=BPB, F2=Retur (kosong=manual)"
            @keydown="onBpbRetKeydown"
            @keydown.enter.prevent="($event.target as HTMLInputElement).blur()"
            @blur="onBpbRetLostFocus"
          />
        </div>
        <div class="fr" v-if="poNomor">
          <label class="lbl">No. PO</label>
          <input :value="poNomor" readonly class="inp ro" style="flex: 1" />
        </div>

        <div class="sep" />

        <div class="fr">
          <label class="chk-lbl">
            <input type="checkbox" v-model="langsungCetak" />
            Langsung Cetak
          </label>
        </div>

        <div class="fieldset-box mt-1">
          <div class="fieldset-legend">Printer</div>
          <input
            v-model="printerName"
            class="inp"
            style="width: 100%"
            placeholder="Nama printer (info saja)"
          />
          <div class="hint-text">
            Pemilihan printer fisik dilakukan lewat dialog print browser.
          </div>
        </div>

        <div class="sep" />

        <button type="button" class="btn-print-all" @click="printAllBarcode">
          <IconPrinter :size="14" class="mr-1" /> Cetak Semua Barcode
        </button>
      </div>
    </template>

    <!-- RIGHT COLUMN: 2 tabel -->
    <template #right-column>
      <div class="bcb-right">
        <!-- Tabel 1: Bahan -->
        <div class="tbl-header">
          <span class="tbl-title">1. Rincian Bahan</span>
        </div>
        <div class="tbl-wrap" style="max-height: 40vh">
          <table class="gt">
            <thead>
              <tr>
                <th style="width: 32px" class="tc">No</th>
                <th style="width: 100px">Kode Bahan</th>
                <th>Nama Barang</th>
                <th style="width: 60px" class="tc">Satuan</th>
                <th style="width: 85px" class="tr">Jml Terima</th>
                <th style="width: 70px" class="tr bg-yellow">Roll</th>
                <th style="width: 32px" class="tc"></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(row, idx) in grid1" :key="idx">
                <td class="tc gt-lbl">{{ idx + 1 }}</td>
                <td class="p0">
                  <div class="cell-grp">
                    <input
                      v-model="row.kode"
                      class="ci"
                      :readonly="!!row.kodex || !!bpbNomor.trim()"
                      placeholder="Kode bahan..."
                      @keydown="onKodeKeydown($event, idx)"
                      @keydown.enter.prevent="
                        ($event.target as HTMLInputElement).blur()
                      "
                      @blur="onKodeBlur(idx)"
                    />
                    <button
                      v-if="!row.kodex && !bpbNomor.trim()"
                      type="button"
                      class="ci-btn"
                      title="Cari Bahan (F1)"
                      @click="openBahanModal(idx)"
                    >
                      <IconSearch :size="11" />
                    </button>
                  </div>
                </td>
                <td class="px-1">{{ row.nama }}</td>
                <td class="tc px-1">{{ row.satuan }}</td>
                <td class="tr px-1">{{ numFmt(row.jumlah) }}</td>
                <td class="p0">
                  <input
                    v-model.number="row.roll"
                    type="number"
                    class="ci tr fw bg-yellow-light"
                    :disabled="!row.kode"
                    @blur="onRollBlur(idx)"
                  />
                </td>
                <td class="tc">
                  <button
                    v-if="row.kode && !bpbNomor.trim()"
                    type="button"
                    class="btn-del"
                    @click="requestRemoveGrid1Row(idx)"
                  >
                    <IconTrash :size="13" />
                  </button>
                </td>
              </tr>
              <tr v-if="grid1.length === 0">
                <td colspan="7" class="empty-row">
                  Isi No.BPB/Retur, atau ketik Kode Bahan manual.
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Tabel 2: Barcode -->
        <div class="tbl-header teal mt-2">
          <span class="tbl-title">2. Barcode yang Akan Dicetak</span>
        </div>
        <div class="tbl-wrap" style="max-height: 35vh">
          <table class="gt">
            <thead>
              <tr>
                <th style="width: 32px" class="tc">No</th>
                <th style="width: 90px">Kode</th>
                <th>Nama Barang</th>
                <th style="width: 140px" class="tc">Barcode</th>
                <th style="width: 90px" class="tr bg-yellow">Jml/Roll</th>
                <th style="width: 32px" class="tc"></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(row, idx) in grid2" :key="idx">
                <td class="tc gt-lbl">{{ row.no }}</td>
                <td class="px-1">{{ row.kode }}</td>
                <td class="px-1" :title="row.nama">{{ row.nama }}</td>
                <td class="tc px-1 font-family-mono">{{ row.barcode }}</td>
                <td class="p0">
                  <input
                    v-model.number="row.jumlah"
                    type="number"
                    class="ci tr fw bg-yellow-light"
                    @blur="onJumlahBlur(idx)"
                  />
                </td>
                <td class="tc">
                  <button
                    type="button"
                    class="btn-print-single"
                    title="Cetak barcode ini"
                    @click="printSingleBarcode(row)"
                  >
                    <IconPrinter :size="12" />
                  </button>
                </td>
              </tr>
              <tr v-if="grid2.length === 0">
                <td colspan="6" class="empty-row">
                  Isi kolom <strong>Roll</strong> di tabel atas untuk
                  menghasilkan barcode.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </template>
  </BaseForm>

  <BahanSearchModal v-model="showBahanModal" @selected="onBahanSelected" />
  <BpbSearchModal
    v-model="showBpbModal"
    endpoint="/lookups/bpb"
    @selected="onBpbSelected"
  />
  <ReturBahanSearchModal v-model="showReturModal" @selected="onReturSelected" />

  <PembuatanBarcodeBahanStickerDialog
    v-model="showStickerDialog"
    :barcodes="printBatch"
    :satuan="activeSatuan"
    :tanggal="tanggal"
    :po="poNomor"
  />

  <!-- Dialog Konfirmasi Hapus Baris -->
  <v-dialog v-model="deleteRowDialog" max-width="360">
    <v-card rounded="lg">
      <v-card-title class="text-subtitle-1 pa-4 d-flex align-center">
        <IconTrash :size="18" color="#d32f2f" class="mr-2" />
        Hapus Baris?
      </v-card-title>
      <v-card-text class="pa-4 pt-0 text-body-2">
        Baris
        <b>{{ rowToDeleteIdx !== null ? grid1[rowToDeleteIdx]?.nama : "" }}</b>
        akan dihapus beserta barcode-nya. Lanjutkan?
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
</template>

<style scoped>
.bcb-left {
  display: flex;
  flex-direction: column;
  gap: 3px;
  padding: 10px 12px;
  font-family: "Segoe UI", system-ui, sans-serif;
  font-size: 11px;
  box-sizing: border-box;
}
.bcb-right {
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
  width: 90px;
  flex-shrink: 0;
  font-weight: 600;
  color: #333;
  font-size: 11px;
  white-space: nowrap;
}
.sep {
  height: 1px;
  background: #e0e0e0;
  margin: 6px 0;
  width: 100%;
}
.mt-1 {
  margin-top: 4px;
}
.mt-2 {
  margin-top: 8px;
}
.mr-1 {
  margin-right: 4px;
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
  padding: 10px 8px 6px;
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
.hint-text {
  font-size: 9.5px;
  color: #888;
  margin-top: 4px;
  font-style: italic;
}

.btn-print-all {
  height: 30px;
  background: #e8f5e9;
  border: 1px solid #4caf50;
  color: #2e7d32;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  border-radius: 3px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.btn-print-all:hover {
  background: #c8e6c9;
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
.fw {
  font-weight: 700;
}
.font-family-mono {
  font-family: monospace;
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
.ci:disabled {
  background: #f5f5f5 !important;
  color: #9e9e9e;
}

.cell-grp {
  display: flex;
  align-items: center;
  height: 25px;
}
.cell-grp .ci {
  flex: 1;
}
.ci-btn {
  width: 22px;
  flex-shrink: 0;
  background: #eeeeee;
  border: none;
  border-left: 1px solid #e0e0e0;
  cursor: pointer;
  height: 25px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.ci-btn:hover {
  background: #e0e0e0;
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
.btn-print-single {
  width: 22px;
  height: 22px;
  background: #e3f2fd;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto;
  border-radius: 2px;
  color: #1565c0;
}
.btn-print-single:hover {
  background: #bbdefb;
}

.empty-row {
  text-align: center;
  color: #9e9e9e;
  font-style: italic;
  padding: 14px 8px;
  font-size: 11px;
}
</style>
