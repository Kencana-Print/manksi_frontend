<script setup lang="ts">
import { ref, computed, nextTick } from "vue";
import { useToast } from "vue-toastification";
import { useAuthStore } from "@/stores/authStore";
import BaseForm from "@/components/BaseForm.vue";
import { useForm } from "@/composables/useForm";
import BarangGarmenSearchModal from "@/components/lookups/BarangGarmenSearchModal.vue";
import { koreksiStokFormService } from "@/services/garmen/koreksiStokBarangFormService";
import { IconSettings, IconSearch, IconTrash } from "@tabler/icons-vue";

interface DetailRow {
  kode: string;
  nama: string;
  satuan: string;
  stok: number;
  jumlah: number;
  selisih: number;
  keterangan: string;
}

interface KoreksiStokFormData {
  nomor: string;
  jenis: string;
  tanggal: string;
  cabang: string;
  keterangan: string;
  statusPin5: string;
  rows: DetailRow[];
}

const toast = useToast();
const authStore = useAuthStore();

const BROWSE_PATH = "/garmen/barang/koreksi-stok";

function getLocalDate(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

const isCabangLocked = computed(() => !!authStore.user?.cabang);
const cabangOptions = computed(() => {
  if (isCabangLocked.value) return [authStore.user?.cabang || ""];
  return ["P01", "P02", "P03", "P04", "P05", "HO-"];
});

const statusLabel: Record<string, { text: string; color: string }> = {
  MINTA: { text: "Perlu Pengajuan", color: "#c62828" },
  WAIT: { text: "Nunggu ACC", color: "#1976d2" },
  ACC: { text: "Sudah ACC", color: "#2e7d32" },
  TOLAK: { text: "Ditolak", color: "#c62828" },
};

const blankRow = (): DetailRow => ({
  kode: "",
  nama: "",
  satuan: "",
  stok: 0,
  jumlah: 0,
  selisih: 0,
  keterangan: "",
});

const ensureTrailingBlankRow = (rows: DetailRow[]) => {
  const last = rows[rows.length - 1];
  if (!last || last.kode) rows.push(blankRow());
};

// ── fetchApi / submitApi ────────────────────────────────────────────────
const fetchApi = async (): Promise<KoreksiStokFormData> => {
  const nomorEdit = params.nomor as string; // ✅ benar — tanpa .value
  const res = await koreksiStokFormService.getFormData(nomorEdit);
  const d = res.data.data;
  const rows: DetailRow[] = d.details.map((r: any) => ({
    kode: r.kode,
    nama: r.nama,
    satuan: r.satuan,
    stok: Number(r.stok) || 0,
    jumlah: Number(r.jumlah) || 0,
    selisih: Number(r.selisih) || 0,
    keterangan: r.keterangan || "",
  }));
  ensureTrailingBlankRow(rows);
  return {
    nomor: d.nomor,
    jenis: d.jenis,
    tanggal: String(d.tanggal).substring(0, 10),
    cabang: d.cabang,
    keterangan: d.keterangan,
    statusPin5: d.statusPin5,
    rows,
  };
};

const submitApi = async (data: KoreksiStokFormData) => {
  const payload = {
    jenis: data.jenis,
    tanggal: data.tanggal,
    cabang: data.cabang,
    keterangan: data.keterangan,
    details: data.rows
      .filter((r) => r.kode)
      .map((r) => ({
        kode: r.kode,
        stok: r.stok,
        jumlah: r.jumlah,
        selisih: r.selisih,
        keterangan: r.keterangan,
      })),
  };
  return isEditMode.value
    ? koreksiStokFormService.update(data.nomor, payload)
    : koreksiStokFormService.create(payload);
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
} = useForm<KoreksiStokFormData>({
  menuId: "64",
  initialData: {
    nomor: "",
    // Default jenis dari sessionStorage cuma relevan pas create — kalau
    // edit, fetchApi bakal timpa ini dengan jenis asli dari data.
    jenis: sessionStorage.getItem("last_jenis_koreksi_stok") || "ACCESORIES",
    tanggal: getLocalDate(),
    cabang: "",
    keterangan: "",
    statusPin5: "",
    rows: [blankRow()],
  },
  fetchApi,
  submitApi,
  onSuccessRoute: BROWSE_PATH,
  immediate: false,
  onSuccess: (res: any) => {
    savedNomor.value = res?.data?.data?.nomor || formData.value.nomor;
    showPrintDialog.value = true;
  },
});

const fd = formData;
const isSaveBlocked = computed(() =>
  ["MINTA", "WAIT", "TOLAK"].includes(fd.value.statusPin5),
);

// Isi default khusus mode create (cabang belum ke-set dari fetchApi
// karena create gak fetch apa-apa) — dilakukan setelah fetchData supaya
// gak konflik dengan hasil fetch pas edit mode.
const initCreateDefaults = () => {
  if (!isEditMode.value) {
    fd.value.cabang = cabangOptions.value[0];
  }
};

const loadData = async () => {
  await fetchData();
  initCreateDefaults();
  ensureTrailingBlankRow(fd.value.rows);
};
loadData();

// ══ Refs untuk focus-chain ══
const tanggalRef = ref<HTMLInputElement | null>(null);
const cabangRef = ref<any>(null);
const keteranganRef = ref<HTMLTextAreaElement | null>(null);

const kodeRefs = ref<Record<number, HTMLInputElement | null>>({});
const jumlahRefs = ref<Record<number, HTMLInputElement | null>>({});
const rowKetRefs = ref<Record<number, HTMLInputElement | null>>({});

const setKodeRef = (el: any, idx: number) => (kodeRefs.value[idx] = el);
const setJumlahRef = (el: any, idx: number) => (jumlahRefs.value[idx] = el);
const setRowKetRef = (el: any, idx: number) => (rowKetRefs.value[idx] = el);

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

const onJumlahInput = (row: DetailRow, e: Event) => {
  const el = e.target as HTMLInputElement;
  let v = el.value.replace(/[^0-9.-]/g, "");
  v = v.replace(/(?!^)-/g, "");
  const firstDot = v.indexOf(".");
  if (firstDot !== -1) {
    v = v.slice(0, firstDot + 1) + v.slice(firstDot + 1).replace(/\./g, "");
  }
  el.value = v;
  row.jumlah = v === "" || v === "-" ? 0 : Number(v);
  onJumlahChange(row);
};

const onTanggalEnter = async () => {
  await nextTick();
  cabangRef.value?.$el?.querySelector("input,select")?.focus?.() ??
    cabangRef.value?.focus?.();
};
const onKeteranganEnter = async (e: KeyboardEvent) => {
  e.preventDefault();
  await nextTick();
  kodeRefs.value[0]?.focus();
};

const onKodeEnterKey = () => {
  /* blur -> onKodeBlur menangani resolve */
};

const onJumlahEnter = async (idx: number) => {
  await nextTick();
  rowKetRefs.value[idx]?.focus();
};

const onRowKetEnter = async (idx: number) => {
  await nextTick();
  const nextIdx = idx + 1;
  const nextRow = fd.value.rows[nextIdx];
  if (nextRow?.nama) {
    jumlahRefs.value[nextIdx]?.focus();
  } else {
    kodeRefs.value[nextIdx]?.focus();
  }
};

// --- KONFIRMASI HAPUS BARIS ---
const deleteRowDialog = ref(false);
const rowToDeleteIdx = ref<number | null>(null);

const requestRemoveRow = (idx: number) => {
  rowToDeleteIdx.value = idx;
  deleteRowDialog.value = true;
};

const confirmRemoveRow = () => {
  if (rowToDeleteIdx.value === null) return;
  fd.value.rows.splice(rowToDeleteIdx.value, 1);
  ensureTrailingBlankRow(fd.value.rows);
  deleteRowDialog.value = false;
  rowToDeleteIdx.value = null;
};

const onJumlahChange = (row: DetailRow) => {
  row.selisih = Number(row.jumlah || 0) - Number(row.stok || 0);
};

// --- MODAL BARANG ---
const barangModalOpen = ref(false);
const activeRowIndex = ref<number | null>(null);

const openBarangModal = (idx: number) => {
  activeRowIndex.value = idx;
  barangModalOpen.value = true;
};

const fetchBarangIntoRow = async (idx: number, kodeBaru: string) => {
  const dupIdx = fd.value.rows.findIndex(
    (r, i) => i !== idx && r.kode === kodeBaru,
  );
  if (dupIdx !== -1) {
    toast.warning(`Kode tsb sudah di input, di baris ${dupIdx + 1}`);
    fd.value.rows[idx].kode = "";
    return;
  }

  try {
    const res = await koreksiStokFormService.resolveKode(
      fd.value.jenis,
      kodeBaru,
      fd.value.cabang,
      fd.value.tanggal,
      isEditMode.value ? fd.value.nomor : "",
    );
    const d = res.data.data;
    fd.value.rows[idx] = {
      kode: d.Kode,
      nama: d.Nama,
      satuan: d.Satuan,
      stok: Number(d.Stok),
      jumlah: 0,
      selisih: 0 - Number(d.Stok),
      keterangan: "",
    };
    ensureTrailingBlankRow(fd.value.rows);
    await nextTick();
    jumlahRefs.value[idx]?.focus();
  } catch (e: any) {
    toast.error(e.response?.data?.message || "Kode tsb tidak ada.");
    fd.value.rows[idx].kode = "";
  }
};

const onBarangSelected = (item: any) => {
  const idx = activeRowIndex.value;
  if (idx === null) return;
  fetchBarangIntoRow(idx, item.Kode);
};

const onKodeKeydown = (e: KeyboardEvent, idx: number) => {
  if (e.key === "F1") {
    e.preventDefault();
    openBarangModal(idx);
  }
};

const onKodeBlur = (idx: number) => {
  const kode = (fd.value.rows[idx].kode || "").trim().toUpperCase();
  if (!kode) return;
  fetchBarangIntoRow(idx, kode);
};

// --- VALIDASI LOKAL ---
const onValidateSave = () => {
  if (isSaveBlocked.value) {
    toast.warning(
      "Transaksi tsb sudah diclose. Silahkan minta approve untuk bisa menyimpan perubahan data.",
    );
    return;
  }
  if (!fd.value.keterangan.trim()) {
    toast.error("Keterangan harus diisi.");
    return;
  }
  const filled = fd.value.rows.filter((r) => r.kode);
  if (filled.length === 0) {
    toast.error("Detail barang harus diisi.");
    return;
  }
  for (const r of filled) {
    if (!r.keterangan.trim()) {
      toast.error("Detail Keterangan harus diisi.");
      return;
    }
  }
  showSaveDialog.value = true;
};

// --- PRINT DIALOG ---
const showPrintDialog = ref(false);
const savedNomor = ref("");

// Sama seperti pola Insentif: setelah save sukses, tunggu user pilih
// cetak/tidak dulu baru executeClose() (tutup tab + navigasi ke browse).
const doCetak = () => {
  showPrintDialog.value = false;
  window.open(
    `/garmen/barang/koreksi-stok/print/${encodeURIComponent(savedNomor.value)}`,
    "_blank",
  );
  executeClose();
};

const skipCetak = () => {
  showPrintDialog.value = false;
  executeClose();
};

const numFmt = (v: any) => (v ? Number(v).toLocaleString("id-ID") : "0");
</script>

<template>
  <BaseForm
    :title="
      isEditMode ? `Ubah Koreksi Stok ${fd.jenis}` : `Koreksi Stok ${fd.jenis}`
    "
    menu-id="64"
    :icon="IconSettings"
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
      <div class="desktop-form-section header-section">
        <div class="mb-3">
          <label class="f-label">No. Koreksi</label>
          <v-text-field
            :model-value="fd.nomor || '<-- Kosong = Baru'"
            variant="outlined"
            density="compact"
            readonly
            hide-details
          />
          <div v-if="fd.statusPin5" class="mt-1">
            <span
              class="status-badge"
              :style="{ background: statusLabel[fd.statusPin5]?.color }"
            >
              {{ statusLabel[fd.statusPin5]?.text || fd.statusPin5 }}
            </span>
          </div>
        </div>

        <div class="mb-3">
          <label class="f-label">Tanggal</label>
          <v-text-field
            ref="tanggalRef"
            v-model="fd.tanggal"
            type="date"
            variant="outlined"
            density="compact"
            hide-details
            @keydown.enter.prevent="onTanggalEnter"
          />
        </div>

        <div class="mb-3">
          <label class="f-label">Cabang</label>
          <v-select
            ref="cabangRef"
            v-model="fd.cabang"
            :items="cabangOptions"
            variant="outlined"
            density="compact"
            hide-details
            :disabled="isCabangLocked"
          />
        </div>

        <div class="mb-3">
          <label class="f-label">Keterangan</label>
          <v-textarea
            ref="keteranganRef"
            v-model="fd.keterangan"
            variant="outlined"
            density="compact"
            rows="3"
            hide-details
            @keydown.enter="onKeteranganEnter"
          />
        </div>

        <v-alert
          type="info"
          variant="tonal"
          density="compact"
          class="text-caption"
        >
          Note: Jumlah Koreksi adalah Jumlah Stok Awal pada tanggal ini. Jika
          sudah ada transaksi, maka akan di akumulasi ke stok pagi.
        </v-alert>
      </div>
    </template>

    <template #right-column>
      <div class="desktop-form-section" style="flex: 1">
        <table class="detail-table">
          <thead>
            <tr>
              <th width="36" class="text-center">No</th>
              <th width="110">Kode</th>
              <th>Nama Barang</th>
              <th width="70" class="text-center">Satuan</th>
              <th width="90" class="tr">Stok Awal</th>
              <th width="90" class="tr">Jumlah</th>
              <th width="90" class="tr">Selisih</th>
              <th>Keterangan</th>
              <th width="36"></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(row, idx) in fd.rows" :key="idx">
              <td class="text-center">{{ idx + 1 }}</td>
              <td class="p0">
                <div class="cell-grp">
                  <input
                    v-model="row.kode"
                    :ref="(el) => setKodeRef(el, idx)"
                    class="ci"
                    style="
                      text-transform: uppercase;
                      font-weight: 600;
                      color: #1565c0;
                    "
                    placeholder="F1 / kode + Enter"
                    :readonly="!!row.nama"
                    autocomplete="off"
                    :name="`kode-koreksi-${idx}`"
                    @keydown="onKodeKeydown($event, idx)"
                    @keydown.enter.prevent="
                      ($event.target as HTMLInputElement).blur()
                    "
                    @blur="onKodeBlur(idx)"
                  />
                  <button
                    v-if="!row.nama"
                    type="button"
                    class="ci-btn"
                    title="Cari Barang (F1)"
                    @click="openBarangModal(idx)"
                  >
                    <IconSearch :size="11" />
                  </button>
                </div>
              </td>
              <td>{{ row.nama }}</td>
              <td class="text-center">{{ row.satuan }}</td>
              <td class="tr">{{ numFmt(row.stok) }}</td>
              <td>
                <input
                  :value="row.jumlah"
                  :ref="(el) => setJumlahRef(el, idx)"
                  type="text"
                  inputmode="decimal"
                  class="cell-input tr"
                  :disabled="!row.nama"
                  @input="onJumlahInput(row, $event)"
                  @focus="moveCursorToEnd"
                  @keydown.enter.prevent="onJumlahEnter(idx)"
                />
              </td>
              <td
                class="tr font-weight-bold"
                :class="row.selisih < 0 ? 'text-red' : 'text-green'"
              >
                {{ numFmt(row.selisih) }}
              </td>
              <td>
                <input
                  v-model="row.keterangan"
                  :ref="(el) => setRowKetRef(el, idx)"
                  class="cell-input"
                  :disabled="!row.nama"
                  placeholder="Keterangan detail..."
                  @keydown.enter.prevent="onRowKetEnter(idx)"
                />
              </td>
              <td class="text-center">
                <v-btn
                  v-if="row.kode"
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
        </table>
      </div>
    </template>
  </BaseForm>

  <BarangGarmenSearchModal
    v-model="barangModalOpen"
    :jenis="fd.jenis"
    :cabang="fd.cabang"
    @selected="onBarangSelected"
  />

  <v-dialog v-model="deleteRowDialog" max-width="360">
    <v-card rounded="lg">
      <v-card-title class="text-subtitle-1 pa-4 d-flex align-center">
        <v-icon color="warning" class="mr-2">mdi-alert-circle-outline</v-icon>
        Hapus Baris?
      </v-card-title>
      <v-card-text class="pa-4 pt-0 text-body-2">
        Baris
        <b>{{
          rowToDeleteIdx !== null ? fd.rows[rowToDeleteIdx]?.nama : ""
        }}</b>
        akan dihapus dari daftar koreksi. Lanjutkan?
      </v-card-text>
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
      <v-card-title class="bg-primary text-white pa-3">
        Simpan Berhasil
      </v-card-title>
      <v-card-text class="pa-4 text-center">
        Berhasil Simpan dengan Nomor <b>{{ savedNomor }}</b
        ><br />Ingin cetak transaksi ini sekarang?
      </v-card-text>
      <v-card-actions class="pa-3 border-t bg-grey-lighten-4">
        <v-btn variant="text" color="error" @click="skipCetak">Tidak</v-btn>
        <v-spacer />
        <v-btn color="primary" variant="elevated" @click="doCetak">
          Ya, Cetak
        </v-btn>
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
.status-badge {
  color: white;
  font-size: 10px;
  font-weight: 700;
  padding: 3px 10px;
  border-radius: 10px;
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
  position: sticky;
  top: 0;
  z-index: 1;
}
.detail-table td {
  padding: 2px 4px;
  border-bottom: 1px solid #eee;
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
</style>
