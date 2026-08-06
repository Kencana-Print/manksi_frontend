<script setup lang="ts">
import { ref, computed, onMounted, nextTick } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useToast } from "vue-toastification";
import BaseForm from "@/components/BaseForm.vue";
import SupplierSearchModal from "@/components/lookups/SupplierSearchModal.vue";
import SpkSearchModal from "@/components/lookups/SpkSearchModal.vue";
import { poDtfFormService } from "@/services/garmen/poDtfFormService";
import {
  IconDroplet,
  IconSearch,
  IconTrash,
  IconPhoto,
  IconX,
} from "@tabler/icons-vue";

interface DetailRow {
  spk: string;
  nama: string;
  ukuran: string;
  bahan: string;
  jumlah: number; // Jml Cetak
  jmlLayout: string; // Jml/Layout — FREE TEXT, bukan angka
  harga: number;
  ket: string;
  idgambar: string;
  imageUrl: string | null;
  newFile: File | null;
  removeImage: boolean;
}

const route = useRoute();
const router = useRouter();
const toast = useToast();

const nomorParam = computed(() => route.params.nomor as string | undefined);
const isEditMode = computed(() => !!nomorParam.value);

const isLoading = ref(true);
const isSaving = ref(false);

const showSaveDialog = ref(false);
const showCancelDialog = ref(false);
const showCloseDialog = ref(false);
const showPrintDialog = ref(false);
const savedNomor = ref("");

function getLocalDate(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

// --- STATE HEADER ---
const nomor = ref("");
const tanggal = ref(getLocalDate());
const dateline = ref(getLocalDate());
const cabang = ref("");
const supKode = ref("");
const supNama = ref("");
const supAlamat = ref("");
const kodeKaosan = ref("");
const keterangan = ref("");

// --- META ---
const cabangOptions = ref<string[]>([]);

// ⚠️ Cabang TIDAK dikunci saat edit — sama seperti PO Paperprint,
// tidak ada cbcab.Enabled:=False di source ini.

// --- GRID DETAIL ---
const rows = ref<DetailRow[]>([]);
const blankRow = (): DetailRow => ({
  spk: "",
  nama: "",
  ukuran: "",
  bahan: "",
  jumlah: 0,
  jmlLayout: "",
  harga: 0,
  ket: "",
  idgambar: "",
  imageUrl: null,
  newFile: null,
  removeImage: false,
});
const ensureTrailingRow = () => {
  const last = rows.value[rows.value.length - 1];
  if (!last || last.spk) rows.value.push(blankRow());
};

const totalJumlah = computed(() =>
  rows.value.reduce((s, r) => (r.spk ? s + Number(r.jumlah || 0) : s), 0),
);
const numFmt = (v: any) => (v ? Number(v).toLocaleString("id-ID") : "0");

// ══ Kursor selalu di belakang angka saat fokus (bukan select-all) ══
const moveCursorToEnd = (e: FocusEvent) => {
  const el = e.target as HTMLInputElement;
  const len = el.value.length;
  requestAnimationFrame(() => {
    try {
      el.setSelectionRange(len, len);
    } catch {
      /* abaikan */
    }
  });
};

// ══ Refs focus-chain (Enter pindah ke field editable berikutnya) ══
const supKodeRef = ref<HTMLInputElement | null>(null);
const spkRefs = ref<Record<number, HTMLInputElement | null>>({});
const ukuranRefs = ref<Record<number, HTMLInputElement | null>>({});
const bahanRefs = ref<Record<number, HTMLInputElement | null>>({});
const jumlahRefs = ref<Record<number, HTMLInputElement | null>>({});
const jmlLayoutRefs = ref<Record<number, HTMLInputElement | null>>({});
const ketRefs = ref<Record<number, HTMLInputElement | null>>({});
const fileInputRefs = ref<Record<number, HTMLInputElement | null>>({});

const onUkuranEnter = async (idx: number) => {
  await nextTick();
  bahanRefs.value[idx]?.focus();
};
const onBahanEnter = async (idx: number) => {
  await nextTick();
  jumlahRefs.value[idx]?.focus();
};
const onJumlahEnter = async (idx: number) => {
  await nextTick();
  jmlLayoutRefs.value[idx]?.focus();
};
const onJmlLayoutEnter = async (idx: number) => {
  await nextTick();
  ketRefs.value[idx]?.focus();
};
const onKetEnter = async (idx: number) => {
  await nextTick();
  const nextIdx = idx + 1;
  const nextRow = rows.value[nextIdx];
  if (nextRow?.nama) {
    ukuranRefs.value[nextIdx]?.focus();
  } else {
    spkRefs.value[nextIdx]?.focus();
  }
};

// --- LOAD META ---
const loadMeta = async () => {
  const res = await poDtfFormService.getMeta();
  cabangOptions.value = res.data.data.cabangOptions;
};

// --- LOAD DATA ---
const loadData = async () => {
  isLoading.value = true;
  try {
    await loadMeta();

    if (isEditMode.value) {
      const res = await poDtfFormService.getFormData(nomorParam.value!);
      const d = res.data.data;
      nomor.value = d.pjh_nomor;
      tanggal.value = String(d.pjh_tanggal).substring(0, 10);
      dateline.value = String(d.pjh_dateline).substring(0, 10);
      cabang.value = d.pjh_cab;
      supKode.value = d.pjh_sup_kode;
      supNama.value = d.sup_nama;
      supAlamat.value = d.sup_alamat;
      kodeKaosan.value = d.pjh_kode_kaosan || "";
      keterangan.value = d.pjh_ket || "";

      rows.value = (d.details || []).map((r: any) => ({
        spk: r.spk,
        nama: r.nama,
        ukuran: r.ukuran || "",
        bahan: r.bahan || "",
        jumlah: Number(r.jumlah) || 0,
        jmlLayout: r.jmlLayout || "",
        harga: Number(r.harga) || 0,
        ket: r.ket || "",
        idgambar: r.idgambar || "",
        imageUrl: r.hasImage ? r.imageUrl : null,
        newFile: null,
        removeImage: false,
      }));
      ensureTrailingRow();
    } else {
      // ⚠️ Default supplier hardcode — replikasi refreshdata() persis
      cabang.value = cabangOptions.value[0] || "";
      supKode.value = "00274";
      supNama.value = "KAOSAN K01";
      supAlamat.value = "PADOKAN";
      kodeKaosan.value = "K01";
      keterangan.value = "";
      rows.value = [blankRow()];
    }
  } catch (e: any) {
    toast.error(e.response?.data?.message || "Gagal memuat data.");
    router.push("/garmen/po-dtf");
  } finally {
    isLoading.value = false;
  }
};

onMounted(loadData);

// --- SUPPLIER ---
const supModalOpen = ref(false);
const supDirty = ref(false);

const onSupSelected = (item: any) => {
  supKode.value = item.Kode || item.sup_kode || "";
  supNama.value = item.Nama || item.sup_nama || "";
  supAlamat.value = item.Alamat || item.sup_alamat || "";
};

const onSupBlur = async () => {
  if (!supDirty.value || !supKode.value.trim()) return;
  supDirty.value = false;
  try {
    const res = await poDtfFormService.resolveSupplier(supKode.value.trim());
    supNama.value = res.data.data.nama;
    supAlamat.value = res.data.data.alamat;
    kodeKaosan.value = res.data.data.kodeKaosan || "";
  } catch (e: any) {
    toast.error(
      e.response?.data?.message || "Supplier tsb tidak ada di database.",
    );
  }
};

// --- SPK (per baris) --- (mode spk-map, F1/icon/ketik+Enter)
const spkModalOpen = ref(false);
const activeSpkIdx = ref<number | null>(null);

const openSpkModal = (idx: number) => {
  activeSpkIdx.value = idx;
  spkModalOpen.value = true;
};

// ⚠️ Ukuran/Bahan SELALU kosong (manual 100%), tidak ada exception P05
// seperti PO Paperprint — modul ini tidak fetch field itu dari SPK.
const applySpkToRow = (
  idx: number,
  data: {
    Nomor?: string;
    nomor?: string;
    Nama?: string;
    nama?: string;
  },
) => {
  const row = rows.value[idx];
  row.spk = data.Nomor || data.nomor || "";
  row.nama = data.Nama || data.nama || "";
  row.ukuran = "";
  row.bahan = "";
  row.jumlah = 0;
  row.jmlLayout = "";
  row.harga = 0;
  row.idgambar = "";
  row.imageUrl = null;
  row.newFile = null;
  row.removeImage = false;

  ensureTrailingRow();
  // ⚠️ TIDAK ADA cek duplikat SPK — dikonfirmasi cek duplikat
  // di-comment-out di KEDUA tempat pada source (search-modal & manual).
  nextTick(() => ukuranRefs.value[idx]?.focus());
};

const onSpkSelected = (item: any) => {
  const idx = activeSpkIdx.value;
  if (idx === null) return;
  applySpkToRow(idx, item);
};

const onSpkKeydown = (e: KeyboardEvent, idx: number) => {
  if (e.key === "F1") {
    e.preventDefault();
    openSpkModal(idx);
  }
};

const onSpkBlur = async (idx: number) => {
  const kode = (rows.value[idx].spk || "").trim();
  if (!kode || rows.value[idx].nama) return;
  try {
    const res = await poDtfFormService.resolveSpk(kode);
    applySpkToRow(idx, res.data.data);
  } catch (e: any) {
    toast.error(e.response?.data?.message || "Spk ini belum ada.");
    rows.value[idx].spk = "";
  }
};

// --- HAPUS BARIS --- (selalu boleh)
const deleteRowDialog = ref(false);
const rowToDeleteIdx = ref<number | null>(null);
const requestRemoveRow = (idx: number) => {
  rowToDeleteIdx.value = idx;
  deleteRowDialog.value = true;
};
const confirmRemoveRow = () => {
  if (rowToDeleteIdx.value === null) return;
  rows.value.splice(rowToDeleteIdx.value, 1);
  ensureTrailingRow();
  deleteRowDialog.value = false;
  rowToDeleteIdx.value = null;
};

// --- UPLOAD GAMBAR PER BARIS ---
const triggerFileInput = (idx: number) => {
  fileInputRefs.value[idx]?.click();
};

const onFileSelected = (idx: number, e: Event) => {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (!file) return;

  if (file.size > 1_000_000) {
    toast.error("Ukuran gambar tidak boleh > 1 Mb.");
    (e.target as HTMLInputElement).value = "";
    return;
  }

  const row = rows.value[idx];
  row.newFile = file;
  row.imageUrl = URL.createObjectURL(file);
  row.removeImage = false;
};

const removeRowImage = (idx: number) => {
  const row = rows.value[idx];
  if (row.newFile) {
    row.newFile = null;
    row.imageUrl = null;
    return;
  }
  if (!row.idgambar) return;
  toast.warning(
    "Gambar existing akan dihapus permanen saat disimpan (tampilan asli dari SPK tetap kembali jika ada).",
  );
  row.removeImage = true;
  row.imageUrl = null;
};

// --- VALIDASI LOKAL --- (replikasi btnSimpanClick)
const onValidateSave = () => {
  if (!supKode.value.trim()) {
    toast.error("Supplier harus diisi.");
    return;
  }
  const filled = rows.value.filter((r) => r.spk);
  if (filled.length === 0) {
    return toast.error("Detail harus diisi.");
  }
  for (const r of filled) {
    if (!r.jumlah || Number(r.jumlah) === 0) {
      return toast.error("Jumlah harus diisi.");
    }
  }
  showSaveDialog.value = true;
};

// --- SUBMIT SIMPAN ---
const onConfirmSave = async () => {
  isSaving.value = true;
  try {
    const filled = rows.value.filter((r) => r.spk);

    const formData = new FormData();
    const detailsPayload = filled.map((r, i) => {
      const hasNewFile = !!r.newFile;
      if (hasNewFile) {
        formData.append(`img_${i}`, r.newFile as File);
      }
      return {
        spk: r.spk,
        nama: r.nama,
        ukuran: r.ukuran,
        bahan: r.bahan,
        jumlah: r.jumlah,
        jmlLayout: r.jmlLayout,
        harga: r.harga,
        ket: r.ket,
        idgambar: r.idgambar,
        newImageField: hasNewFile ? `img_${i}` : null,
        removeImage: r.removeImage,
      };
    });

    formData.append(
      "data",
      JSON.stringify({
        tanggal: tanggal.value,
        dateline: dateline.value,
        cabang: cabang.value,
        supKode: supKode.value,
        kodeKaosan: kodeKaosan.value,
        keterangan: keterangan.value,
        details: detailsPayload,
      }),
    );

    let resultNomor = nomor.value;
    if (isEditMode.value) {
      const res = await poDtfFormService.update(nomor.value, formData);
      resultNomor = res.data.data.nomor;
    } else {
      const res = await poDtfFormService.create(formData);
      resultNomor = res.data.data.nomor;
    }

    showSaveDialog.value = false;
    savedNomor.value = resultNomor;
    showPrintDialog.value = true;
  } catch (e: any) {
    toast.error(e.response?.data?.message || "Gagal Simpan");
  } finally {
    isSaving.value = false;
  }
};

// --- BATAL / TUTUP ---
const onConfirmCancel = () => {
  showCancelDialog.value = false;
  loadData();
};
const onConfirmClose = () => {
  router.push("/garmen/po-dtf");
};

const doCetak = () => {
  showPrintDialog.value = false;
  window.open(
    `/garmen/po-dtf/print/${encodeURIComponent(savedNomor.value)}`,
    "_blank",
  );
  router.push("/garmen/po-dtf");
};
const skipCetak = () => {
  showPrintDialog.value = false;
  router.push("/garmen/po-dtf");
};
</script>

<template>
  <BaseForm
    :title="isEditMode ? 'Ubah PO DTF' : 'PO DTF'"
    menu-id="141"
    :icon="IconDroplet"
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
    <!-- LEFT COLUMN: Header + Tujuan/Supplier -->
    <template #left-column>
      <div class="desktop-form-section header-section">
        <div class="mb-3">
          <label class="f-label">Nomor</label>
          <v-text-field
            :model-value="nomor || '<-- Kosong = Baru'"
            variant="outlined"
            density="compact"
            readonly
            hide-details
          />
        </div>

        <div class="mb-3">
          <label class="f-label">Tanggal</label>
          <v-text-field
            v-model="tanggal"
            type="date"
            variant="outlined"
            density="compact"
            hide-details
          />
        </div>

        <div class="mb-3">
          <label class="f-label">Dateline</label>
          <v-text-field
            v-model="dateline"
            type="date"
            variant="outlined"
            density="compact"
            hide-details
          />
        </div>

        <div class="mb-3">
          <label class="f-label">Asal PO</label>
          <select v-model="cabang" class="sel-inp">
            <option v-for="c in cabangOptions" :key="c" :value="c">
              {{ c }}
            </option>
          </select>
        </div>

        <div class="mb-3">
          <label class="f-label">Keterangan</label>
          <v-text-field
            v-model="keterangan"
            variant="outlined"
            density="compact"
            hide-details
          />
        </div>
      </div>

      <div class="desktop-form-section">
        <div class="sec-title">Tujuan</div>
        <div class="fg mt4">
          <label class="lb w70">Kode</label>
          <div class="ig" style="flex: 1">
            <input
              :ref="(el) => (supKodeRef = el as any)"
              v-model="supKode"
              class="inp"
              style="width: 70px; flex-shrink: 0"
              placeholder="(F1)"
              @input="supDirty = true"
              @keydown.enter.prevent="onSupBlur"
              @blur="onSupBlur"
              @keydown.f1.prevent="supModalOpen = true"
            />
            <input
              :value="supNama"
              readonly
              class="inp ro"
              style="flex: 1; min-width: 0"
            />
            <button
              class="ibtn"
              style="flex-shrink: 0"
              @click="supModalOpen = true"
            >
              <IconSearch :size="11" color="#1565c0" />
            </button>
          </div>
        </div>
        <div v-if="supAlamat" class="note mt2">{{ supAlamat }}</div>

        <div class="fg mt4">
          <label class="lb w70">Kode Kaosan</label>
          <input v-model="kodeKaosan" class="inp" style="width: 90px" />
        </div>
      </div>
    </template>

    <!-- RIGHT COLUMN: Grid Detail (full) -->
    <template #right-column>
      <div class="desktop-form-section" style="flex: 1">
        <div class="grid-title">Detail SPK</div>
        <div class="gwrap">
          <table class="detail-table">
            <thead>
              <tr>
                <th width="30" class="text-center">No</th>
                <th width="110">No. SPK</th>
                <th style="min-width: 150px">Nama SPK</th>
                <th width="90">Ukuran</th>
                <th width="90">Bahan</th>
                <th width="75" class="tr">Jml Cetak</th>
                <th width="90">Jml/Layout</th>
                <th width="70" class="text-center">Desain</th>
                <th style="min-width: 120px">Keterangan</th>
                <th width="30"></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(row, idx) in rows" :key="idx">
                <td class="text-center">{{ idx + 1 }}</td>
                <td class="p0">
                  <div class="cell-grp">
                    <input
                      v-model="row.spk"
                      :ref="(el) => (spkRefs[idx] = el as any)"
                      class="ci"
                      style="
                        text-transform: uppercase;
                        font-weight: 600;
                        color: #1565c0;
                      "
                      placeholder="F1 / kode + Enter"
                      :readonly="!!row.nama"
                      autocomplete="off"
                      @keydown="onSpkKeydown($event, idx)"
                      @keydown.enter.prevent="
                        ($event.target as HTMLInputElement).blur()
                      "
                      @blur="onSpkBlur(idx)"
                    />
                    <button
                      v-if="!row.nama"
                      type="button"
                      class="ci-btn"
                      title="Cari SPK (F1)"
                      @click="openSpkModal(idx)"
                    >
                      <IconSearch :size="11" />
                    </button>
                  </div>
                </td>
                <td>{{ row.nama }}</td>
                <td>
                  <input
                    :ref="(el) => (ukuranRefs[idx] = el as any)"
                    v-model="row.ukuran"
                    class="cell-input"
                    :disabled="!row.nama"
                    @keydown.enter.prevent="onUkuranEnter(idx)"
                  />
                </td>
                <td>
                  <input
                    :ref="(el) => (bahanRefs[idx] = el as any)"
                    v-model="row.bahan"
                    class="cell-input"
                    :disabled="!row.nama"
                    @keydown.enter.prevent="onBahanEnter(idx)"
                  />
                </td>
                <td>
                  <input
                    :ref="(el) => (jumlahRefs[idx] = el as any)"
                    v-model.number="row.jumlah"
                    type="text"
                    inputmode="decimal"
                    class="cell-input tr"
                    :disabled="!row.nama"
                    @focus="moveCursorToEnd"
                    @keydown.enter.prevent="onJumlahEnter(idx)"
                  />
                </td>
                <td>
                  <input
                    :ref="(el) => (jmlLayoutRefs[idx] = el as any)"
                    v-model="row.jmlLayout"
                    class="cell-input"
                    placeholder="cth: 1 SET"
                    :disabled="!row.nama"
                    @keydown.enter.prevent="onJmlLayoutEnter(idx)"
                  />
                </td>
                <td class="text-center">
                  <div v-if="row.imageUrl" class="img-thumb-wrap">
                    <img
                      :src="row.imageUrl"
                      class="img-thumb"
                      @click="triggerFileInput(idx)"
                    />
                    <button
                      class="img-remove-btn"
                      title="Hapus gambar"
                      @click="removeRowImage(idx)"
                    >
                      <IconX :size="10" />
                    </button>
                  </div>
                  <button
                    v-else-if="row.nama"
                    class="img-upload-btn"
                    title="Upload gambar"
                    @click="triggerFileInput(idx)"
                  >
                    <IconPhoto :size="14" />
                  </button>
                  <input
                    type="file"
                    accept="image/*"
                    :ref="(el) => (fileInputRefs[idx] = el as any)"
                    style="display: none"
                    @change="onFileSelected(idx, $event)"
                  />
                </td>
                <td>
                  <input
                    :ref="(el) => (ketRefs[idx] = el as any)"
                    v-model="row.ket"
                    class="cell-input"
                    :disabled="!row.nama"
                    @keydown.enter.prevent="onKetEnter(idx)"
                  />
                </td>
                <td class="text-center">
                  <v-btn
                    v-if="row.spk"
                    icon
                    size="x-small"
                    variant="text"
                    color="error"
                    @click="requestRemoveRow(idx)"
                  >
                    <IconTrash :size="14" />
                  </v-btn>
                </td>
              </tr>
            </tbody>
            <tfoot>
              <tr>
                <td colspan="5" class="total-label">Total</td>
                <td class="tr total-val">{{ numFmt(totalJumlah) }}</td>
                <td colspan="4"></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </template>
  </BaseForm>

  <SupplierSearchModal v-model="supModalOpen" @selected="onSupSelected" />
  <SpkSearchModal
    v-model="spkModalOpen"
    filter-mode="spk-map"
    @selected="onSpkSelected"
  />

  <v-dialog v-model="deleteRowDialog" max-width="360">
    <v-card rounded="lg">
      <v-card-title class="text-subtitle-1 pa-4 d-flex align-center">
        <v-icon color="warning" class="mr-2">mdi-alert-circle-outline</v-icon>
        Ingin dihapus?
      </v-card-title>
      <v-card-actions class="pa-3 border-t">
        <v-spacer />
        <v-btn variant="text" @click="deleteRowDialog = false">Batal</v-btn>
        <v-btn color="error" variant="elevated" @click="confirmRemoveRow"
          >Ya, Hapus</v-btn
        >
      </v-card-actions>
    </v-card>
  </v-dialog>

  <v-dialog v-model="showPrintDialog" max-width="400px" persistent>
    <v-card class="rounded-lg">
      <v-card-title class="bg-primary text-white pa-3"
        >Simpan Berhasil</v-card-title
      >
      <v-card-text class="pa-4 text-center">
        Data <b>{{ savedNomor }}</b> berhasil disimpan.<br />Ingin cetak
        transaksi ini sekarang?
      </v-card-text>
      <v-card-actions class="pa-3 border-t bg-grey-lighten-4">
        <v-btn variant="text" color="error" @click="skipCetak">Tidak</v-btn>
        <v-spacer />
        <v-btn color="primary" variant="elevated" @click="doCetak"
          >Ya, Cetak</v-btn
        >
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.f-label {
  display: block;
  font-size: 11px;
  font-weight: 700;
  color: #555;
  margin-bottom: 4px;
}
.sec-title {
  font-size: 10px;
  font-weight: 700;
  color: #1565c0;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 3px;
}
.grid-title {
  font-size: 11px;
  font-weight: 700;
  color: #455a64;
  text-transform: uppercase;
  margin-bottom: 6px;
}
.sel-inp {
  height: 36px;
  width: 100%;
  border: 1px solid #ccc;
  border-radius: 4px;
  padding: 0 8px;
  font-size: 13px;
  background: white;
  outline: none;
}
.fg {
  display: flex;
  align-items: center;
  gap: 5px;
}
.mt4 {
  margin-top: 4px;
}
.mt2 {
  margin-top: 2px;
}
.lb {
  font-size: 11px;
  font-weight: 500;
  color: #444;
  white-space: nowrap;
}
.w70 {
  width: 70px;
  flex-shrink: 0;
}
.note {
  font-size: 10px;
  color: #777;
}
.inp {
  height: 24px;
  border: 1px solid #bdbdbd;
  border-radius: 3px;
  padding: 0 5px;
  font-size: 12px;
  outline: none;
  background: white;
  font-family: inherit;
}
.inp:focus {
  border-color: #1565c0;
}
.ro {
  background: #f0f0f0 !important;
  color: #555 !important;
}
.ig {
  display: flex;
  border: 1px solid #bdbdbd;
  border-radius: 3px;
  height: 24px;
  background: white;
  overflow: hidden;
}
.ig .inp {
  border: none;
  height: 22px;
  border-radius: 0;
  flex: 1;
  min-width: 0;
}
.ibtn {
  width: 24px;
  min-width: 24px;
  flex-shrink: 0;
  background: #e3f2fd;
  border: none;
  border-left: 1px solid #bdbdbd;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.gwrap {
  overflow-x: auto;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
}
.detail-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 11px;
}
.detail-table th {
  background: #546e7a;
  color: white;
  text-align: left;
  padding: 6px 8px;
  font-weight: bold;
  white-space: nowrap;
}
.detail-table td {
  padding: 2px 4px;
  border-bottom: 1px solid #eee;
  vertical-align: middle;
}
.detail-table tfoot td {
  border-top: 2px solid #546e7a;
  border-bottom: none;
  padding: 6px 8px;
}
.total-label {
  text-align: right;
  font-weight: 700;
  color: #455a64;
}
.total-val {
  font-weight: 700;
  color: #1565c0;
}
.cell-input {
  width: 100%;
  border: 1px solid transparent;
  padding: 4px 6px;
  font-size: 11px;
  outline: none;
  background: transparent;
}
.cell-input:not([disabled]):not([readonly]) {
  border-color: #ccc;
  background: white;
  border-radius: 3px;
}
.cell-input:focus {
  border-color: #1976d2;
}
.tr {
  text-align: right !important;
}
.cell-grp {
  display: flex;
  align-items: center;
  height: 25px;
}
.cell-grp .ci {
  flex: 1;
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

.img-upload-btn {
  width: 26px;
  height: 26px;
  border: 1px dashed #90caf9;
  border-radius: 4px;
  background: #e3f2fd;
  color: #1565c0;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.img-upload-btn:hover {
  background: #bbdefb;
}
.img-thumb-wrap {
  position: relative;
  display: inline-block;
}
.img-thumb {
  width: 32px;
  height: 32px;
  object-fit: cover;
  border-radius: 3px;
  cursor: pointer;
  border: 1px solid #ccc;
}
.img-remove-btn {
  position: absolute;
  top: -5px;
  right: -5px;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: #c62828;
  color: white;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  padding: 0;
}
</style>
