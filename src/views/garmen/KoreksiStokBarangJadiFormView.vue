<script setup lang="ts">
import { ref, computed, nextTick } from "vue";
import { useToast } from "vue-toastification";
import { useAuthStore } from "@/stores/authStore";
import BaseForm from "@/components/BaseForm.vue";
import { useForm } from "@/composables/useForm";
import GudangJadiSearchModal from "@/components/lookups/GudangJadiSearchModal.vue";
import BarangJadiSearchModal from "@/components/lookups/BarangJadiSearchModal.vue";
import { koreksiStokBarangJadiFormService } from "@/services/garmen/koreksiStokBarangJadiFormService";
import { IconSettings, IconSearch, IconTrash } from "@tabler/icons-vue";

interface DetailRow {
  kode: string;
  nama: string;
  satuan: string;
  stok: number;
  jumlah: number;
  selisih: number;
  hpp: number; // internal only — tidak dirender, cuma buat hitung Total
  keterangan: string;
}

interface KoreksiStokBarangJadiFormData {
  nomor: string;
  tanggal: string;
  keterangan: string;
  gdgKode: string;
  gdgNama: string;
  rows: DetailRow[];
}

const toast = useToast();
const authStore = useAuthStore();

const BROWSE_PATH = "/garmen/bahan-jadi/koreksi-stok";

function getLocalDate(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

const blankRow = (): DetailRow => ({
  kode: "",
  nama: "",
  satuan: "",
  stok: 0,
  jumlah: 0,
  selisih: 0,
  hpp: 0,
  keterangan: "",
});

const ensureTrailingBlankRow = (rows: DetailRow[]) => {
  const last = rows[rows.length - 1];
  if (!last || last.kode) rows.push(blankRow());
};

// ── fetchApi / submitApi ────────────────────────────────────────────────
const fetchApi = async (): Promise<KoreksiStokBarangJadiFormData> => {
  const nomorEdit = params.nomor as string;
  const res = await koreksiStokBarangJadiFormService.getFormData(nomorEdit);
  const d = res.data.data;
  const rows: DetailRow[] = d.details.map((r: any) => ({
    kode: r.kode,
    nama: r.nama,
    satuan: r.satuan,
    stok: Number(r.stok) || 0,
    jumlah: Number(r.jumlah) || 0,
    selisih: Number(r.selisih) || 0,
    hpp: Number(r.hpp) || 0,
    keterangan: r.ket || "",
  }));
  ensureTrailingBlankRow(rows);
  return {
    nomor: d.kor_nomor,
    tanggal: String(d.kor_tanggal).substring(0, 10),
    keterangan: d.kor_ket || "",
    gdgKode: d.kor_gdg_kode,
    gdgNama: d.gdg_nama,
    rows,
  };
};

const submitApi = async (data: KoreksiStokBarangJadiFormData) => {
  const payload = {
    tanggal: data.tanggal,
    keterangan: data.keterangan,
    gdgKode: data.gdgKode,
    details: data.rows
      .filter((r) => r.kode)
      .map((r) => ({
        kode: r.kode,
        stok: r.stok,
        jumlah: r.jumlah,
        hpp: r.hpp,
        ket: r.keterangan,
      })),
  };
  return isEditMode.value
    ? koreksiStokBarangJadiFormService.update(data.nomor, payload)
    : koreksiStokBarangJadiFormService.create(payload);
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
} = useForm<KoreksiStokBarangJadiFormData>({
  menuId: "114",
  initialData: {
    nomor: "",
    tanggal: getLocalDate(),
    keterangan: "",
    gdgKode: "",
    gdgNama: "",
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

// Gudang immutable begitu sudah edit mode — replikasi
// edtgdgkode.ReadOnly:=true di loaddataall() source Delphi.
const isGudangLocked = computed(() => isEditMode.value);

// Default gudang untuk mode create diambil dari authStore, bukan dari
// fetchApi (yang cuma jalan pas edit) — jadi diisi manual setelah fetchData.
const loadData = async () => {
  await fetchData();
  if (!isEditMode.value) {
    fd.value.gdgKode = authStore.gudangJadi.kode;
    fd.value.gdgNama = authStore.gudangJadi.nama;
  }
};
loadData();

const total = computed(() =>
  fd.value.rows.reduce((sum, r) => (r.kode ? sum + r.selisih * r.hpp : sum), 0),
);

// ══ Refs untuk focus-chain ══
const gdgKodeRef = ref<HTMLInputElement | null>(null);
const keteranganRef = ref<HTMLInputElement | null>(null);
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

const onJumlahChange = (row: DetailRow) => {
  row.selisih = Number(row.jumlah || 0) - Number(row.stok || 0);
};

const onTanggalEnter = async () => {
  await nextTick();
  gdgKodeRef.value?.focus();
};
const onKeteranganEnter = async (e: KeyboardEvent) => {
  e.preventDefault();
  await nextTick();
  kodeRefs.value[0]?.focus();
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

// --- GUDANG ---
const gudangModalOpen = ref(false);
const onGudangSelected = (item: any) => {
  fd.value.gdgKode = item.Kode;
  fd.value.gdgNama = item.Nama;
};

const onGdgKodeKeydown = (e: KeyboardEvent) => {
  if (e.key === "F1" && !isGudangLocked.value) {
    e.preventDefault();
    gudangModalOpen.value = true;
  }
};

const onGdgKodeBlur = async () => {
  if (isGudangLocked.value) return;
  const kode = (fd.value.gdgKode || "").trim().toUpperCase();
  if (!kode) return;
  try {
    const res = await koreksiStokBarangJadiFormService.validateGudang(kode);
    fd.value.gdgKode = res.data.data.kode;
    fd.value.gdgNama = res.data.data.nama;
  } catch {
    toast.error("Kode gudang tsb tidak ada.");
    gdgKodeRef.value?.focus();
  }
};

// --- MODAL BARANG ---
const barangModalOpen = ref(false);
const activeRowIndex = ref<number | null>(null);

const openBarangModal = (idx: number) => {
  if (!fd.value.gdgKode) {
    toast.warning("Pilih Gudang terlebih dahulu.");
    return;
  }
  activeRowIndex.value = idx;
  barangModalOpen.value = true;
};

const fetchBarangIntoRow = async (idx: number, kodeBaru: string) => {
  const dupIdx = fd.value.rows.findIndex(
    (r, i) => i !== idx && r.kode === kodeBaru,
  );
  if (dupIdx !== -1) {
    toast.warning(`Barang ini sudah di input, di baris ${dupIdx + 1}`);
    fd.value.rows[idx].kode = "";
    return;
  }
  try {
    const res = await koreksiStokBarangJadiFormService.resolveKode(
      kodeBaru,
      fd.value.gdgKode,
      fd.value.tanggal,
      isEditMode.value ? fd.value.nomor : "",
    );
    const d = res.data.data;
    fd.value.rows[idx] = {
      kode: d.kode,
      nama: d.nama,
      satuan: d.satuan,
      stok: Number(d.stok),
      jumlah: 0,
      selisih: 0 - Number(d.stok),
      hpp: Number(d.hpp),
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
  if (!fd.value.gdgKode) {
    toast.warning("Pilih Gudang terlebih dahulu.");
    fd.value.rows[idx].kode = "";
    return;
  }
  fetchBarangIntoRow(idx, kode);
};

// --- VALIDASI LOKAL ---
const onValidateSave = () => {
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

const doCetak = () => {
  showPrintDialog.value = false;
  window.open(
    `/garmen/bahan-jadi/koreksi-stok/print/${encodeURIComponent(savedNomor.value)}`,
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
      isEditMode ? 'Ubah Koreksi Stok Barang Jadi' : 'Koreksi Stok Barang Jadi'
    "
    menu-id="114"
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
        </div>
        <div class="mb-3">
          <label class="f-label">Tanggal</label>
          <v-text-field
            v-model="fd.tanggal"
            type="date"
            variant="outlined"
            density="compact"
            hide-details
            @keydown.enter.prevent="onTanggalEnter"
          />
        </div>
        <div class="mb-3">
          <label class="f-label">Keterangan</label>
          <v-text-field
            :ref="(el) => (keteranganRef = el as any)"
            v-model="fd.keterangan"
            variant="outlined"
            density="compact"
            hide-details
            @keydown.enter.prevent="onKeteranganEnter"
          />
        </div>
        <div class="mb-3">
          <label class="f-label">Gudang</label>
          <div class="cell-grp gdg-grp">
            <input
              :ref="(el) => (gdgKodeRef = el as any)"
              v-model="fd.gdgKode"
              class="ci"
              style="
                text-transform: uppercase;
                font-weight: 600;
                color: #1565c0;
              "
              placeholder="F1 / kode"
              :readonly="isGudangLocked"
              autocomplete="off"
              @keydown="onGdgKodeKeydown"
              @keydown.enter.prevent="
                ($event.target as HTMLInputElement).blur()
              "
              @blur="onGdgKodeBlur"
            />
            <button
              v-if="!isGudangLocked"
              type="button"
              class="ci-btn"
              title="Cari Gudang (F1)"
              @click="gudangModalOpen = true"
            >
              <IconSearch :size="11" />
            </button>
          </div>
          <div class="gdg-nama">{{ fd.gdgNama }}</div>
        </div>
        <v-alert
          type="info"
          variant="tonal"
          density="compact"
          class="text-caption"
        >
          Note: Jumlah Koreksi adalah Jumlah yang ada pada pagi hari sebelum ada
          transaksi. Jika sudah ada transaksi, maka akan di akumulasi ke stok
          pagi.
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
                    :name="`kode-korjadi-${idx}`"
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
        <div class="total-row">
          <span class="f-label">Total</span>
          <span class="total-val">{{ numFmt(total) }}</span>
        </div>
      </div>
    </template>
  </BaseForm>

  <GudangJadiSearchModal
    v-model="gudangModalOpen"
    @selected="onGudangSelected"
  />
  <BarangJadiSearchModal
    v-model="barangModalOpen"
    :gdg-kode="fd.gdgKode"
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
.gdg-grp {
  border: 1px solid #ccc;
  border-radius: 4px;
  overflow: hidden;
}
.gdg-nama {
  margin-top: 3px;
  font-size: 11px;
  color: #757575;
}
.total-row {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 10px;
  padding: 10px 6px;
}
.total-val {
  font-size: 15px;
  font-weight: 700;
  color: #1565c0;
}
</style>
