<script setup lang="ts">
import { ref, computed, onMounted, nextTick } from "vue";
import { useRoute } from "vue-router";
import { useToast } from "vue-toastification";
import BaseForm from "@/components/BaseForm.vue";
import { useForm } from "@/composables/useForm";
import { lhkSoDtfFormService } from "@/services/garmen/lhkSoDtfFormService";
import { IconSearch, IconTrash, IconClipboardList } from "@tabler/icons-vue";

import SpkSearchModal from "@/components/lookups/SpkSearchModal.vue";
import SoDtfSearchModal from "@/components/lookups/SoDtfSearchModal.vue";

interface DtfRow {
  Kode: string;
  Nama: string;
  Depan: number;
  Belakang: number;
  Lengan: number;
  Variasi: number;
  Saku: number;
  Panjang: number;
  Buangan: number;
  Ket: string;
}
interface DtfFormData {
  cab: string;
  tanggal: string;
  rows: DtfRow[];
}

const route = useRoute();
const toast = useToast();

const emptyRow = (): DtfRow => ({
  Kode: "",
  Nama: "",
  Depan: 0,
  Belakang: 0,
  Lengan: 0,
  Variasi: 0,
  Saku: 0,
  Panjang: 0,
  Buangan: 0,
  Ket: "",
});

const initialCab = (route.query.cab as string) || "";
const initialTanggal =
  (route.query.tanggal as string) || new Date().toISOString().substring(0, 10);

const {
  isSaving,
  showSaveDialog,
  showCancelDialog,
  showCloseDialog,
  formData,
  goBack,
  executeCancel,
  executeClose,
  executeSave,
} = useForm<DtfFormData>({
  menuId: "123",
  initialData: { cab: initialCab, tanggal: initialTanggal, rows: [emptyRow()] },
  // Simpan = full replace baris cab+tanggal. Baris kosong (Kode='')
  // difilter di sini, backend juga memfilter ulang sebagai pengaman.
  submitApi: (data) =>
    lhkSoDtfFormService.save({
      cab: data.cab,
      tanggal: data.tanggal,
      rows: data.rows.filter((r) => r.Kode.trim() !== ""),
    }),
  // Replikasi F10 Delphi: setelah simpan sukses TIDAK keluar dari form,
  // cuma reload data (refreshdata()) dan tampilkan pesan sukses.
  onSuccess: async () => {
    toast.success("Berhasil Simpan");
    await reloadRows();
  },
  immediate: false,
});

const isLoadingRows = ref(false);

// ── Load / reload baris untuk cab+tanggal aktif ──
const reloadRows = async () => {
  isLoadingRows.value = true;
  try {
    const res = await lhkSoDtfFormService.getDetail(
      formData.value.cab,
      formData.value.tanggal,
    );
    const rows: DtfRow[] = (res.data.data || []).map((r: any) => ({
      Kode: r.Kode || "",
      Nama: r.Nama || "",
      Depan: Number(r.Depan) || 0,
      Belakang: Number(r.Belakang) || 0,
      Lengan: Number(r.Lengan) || 0,
      Variasi: Number(r.Variasi) || 0,
      Saku: Number(r.Saku) || 0,
      Panjang: Number(r.Panjang) || 0,
      Buangan: Number(r.Buangan) || 0,
      Ket: r.Ket || "",
    }));
    formData.value.rows = rows;
    ensureTrailingEmptyRow();
  } catch (e: any) {
    toast.error(e.response?.data?.message || "Gagal memuat data.");
  } finally {
    isLoadingRows.value = false;
  }
};

onMounted(() => {
  if (!formData.value.cab || !formData.value.tanggal) {
    toast.error("Cabang/Tanggal tidak valid.");
    goBack();
    return;
  }
  reloadRows();
});

// ── Tanggal berubah (replikasi dtTanggalExit → loaddataall) ──
const onTanggalChange = async () => {
  await reloadRows();
  toast.info(`Data dimuat ulang untuk tanggal ${formData.value.tanggal}.`);
};

// ── Auto-tambah baris kosong kalau baris terakhir sudah terisi ──
// (emulasi behavior grid infinite-row AdvGrid di Delphi)
const ensureTrailingEmptyRow = () => {
  const rows = formData.value.rows;
  const last = rows[rows.length - 1];
  if (!last || last.Kode.trim() !== "") {
    rows.push(emptyRow());
  }
};

// ── Hapus baris (replikasi VK_DELETE + MessageDlg confirm) ──
const showDeleteRowDialog = ref(false);
const rowIndexToDelete = ref<number | null>(null);
const confirmDeleteRow = (idx: number) => {
  // Baris kosong terakhir (placeholder) tidak perlu dikonfirmasi, langsung no-op
  if (
    formData.value.rows[idx]?.Kode.trim() === "" &&
    idx === formData.value.rows.length - 1
  ) {
    return;
  }
  rowIndexToDelete.value = idx;
  showDeleteRowDialog.value = true;
};
const doDeleteRow = () => {
  if (rowIndexToDelete.value !== null) {
    formData.value.rows.splice(rowIndexToDelete.value, 1);
    ensureTrailingEmptyRow();
  }
  showDeleteRowDialog.value = false;
  rowIndexToDelete.value = null;
};

// ── Kode manual diketik (blur) → validateKode, replikasi loadspk() ──
// ⚠️ Scope BEDA dari F1: hanya tspk(spk_aktif='Y') + retail.tsodtf_hdr,
// TIDAK termasuk tmemospk. Kalau nomor MAP, harus dipilih via F1.
const onKodeBlur = async (row: DtfRow) => {
  const kode = row.Kode.trim();
  if (!kode || row.Nama) return; // sudah ada Nama = sudah tervalidasi (dari F1/F2)
  try {
    const res = await lhkSoDtfFormService.validateKode(kode);
    row.Kode = res.data.data.Nomor;
    row.Nama = res.data.data.Nama;
    ensureTrailingEmptyRow();
  } catch (e: any) {
    toast.warning(e.response?.data?.message || "Spk/SO DTF tsb belum ada.");
  }
};

// ── F1 (SPK/MAP) & F2 (SO DTF Kaosan) — sekarang pakai SearchModal reusable ──
const showSpkMapLookup = ref(false);
const showSoDtfLookup = ref(false);
const lookupTargetIndex = ref<number | null>(null);

const openSpkMapLookup = (idx: number) => {
  if (formData.value.rows[idx].Nama) return; // sudah terisi — replikasi guard Delphi
  lookupTargetIndex.value = idx;
  showSpkMapLookup.value = true;
};
const openSoDtfLookup = (idx: number) => {
  if (formData.value.rows[idx].Nama) return; // sudah terisi — replikasi guard Delphi
  lookupTargetIndex.value = idx;
  showSoDtfLookup.value = true;
};

// Selection langsung assign Kode+Nama tanpa validasi tambahan —
// replikasi persis cxGrdMainEditKeyDown (assign langsung dari hasil
// frmbantuan, tidak lewat loadspk()).
const selectLookupResult = (item: any) => {
  if (lookupTargetIndex.value === null) return;
  const row = formData.value.rows[lookupTargetIndex.value];
  row.Kode = item.Nomor;
  row.Nama = item.Nama;
  ensureTrailingEmptyRow();
};

// ── Enter = pindah field berikutnya ──
// Replikasi FormKeyPress Delphi: `if Key=#13 then SelectNext(ActiveControl,True,True)`
// yaitu Enter berperan sama seperti Tab di SELURUH form, bukan cuma di grid.
const handleEnterAsTab = (e: KeyboardEvent) => {
  if (e.key !== "Enter") return;
  e.preventDefault();
  const focusable = Array.from(
    document.querySelectorAll<HTMLElement>(
      "input:not([disabled]):not([readonly]):not([tabindex='-1'])",
    ),
  ).filter((el) => el.offsetParent !== null); // hanya elemen yang tampak
  const idx = focusable.indexOf(document.activeElement as HTMLElement);
  if (idx > -1 && idx < focusable.length - 1) {
    focusable[idx + 1].focus();
    (focusable[idx + 1] as HTMLInputElement).select?.();
  }
};

// ── Cari SPK (edtspk) — pencarian client-side di baris yang sudah dimuat ──
const cariSpkKeyword = ref("");
const highlightedRowIndex = ref<number | null>(null);
const rowRefs = ref<Record<number, HTMLElement>>({});
const onCariSpk = () => {
  const kw = cariSpkKeyword.value.trim();
  if (!kw) return;
  const idx = formData.value.rows.findIndex((r) => r.Kode === kw);
  if (idx === -1) {
    toast.warning("Tidak ketemu.");
    highlightedRowIndex.value = null;
    return;
  }
  highlightedRowIndex.value = idx;
  nextTick(() => {
    rowRefs.value[idx]?.scrollIntoView({ block: "center", behavior: "smooth" });
  });
};

// ── Validasi sebelum Simpan (replikasi urutan & pesan F10 persis) ──
const onValidateSave = () => {
  const filled = formData.value.rows.filter((r) => r.Kode.trim() !== "");

  if (filled.length === 0) {
    toast.error("Detail harus diisi.");
    return;
  }
  for (const r of filled) {
    if (!r.Ket.trim()) {
      toast.error("Keterangan harus diisi.");
      return;
    }
    const qtySum = r.Depan + r.Belakang + r.Lengan + r.Variasi + r.Saku;
    if (qtySum === 0) {
      toast.error("Qty harus di isi");
      return;
    }
  }
  showSaveDialog.value = true;
};

const num = (v: number) => new Intl.NumberFormat("id-ID").format(v || 0);
</script>

<template>
  <BaseForm
    title="Form LHK SO DTF/DTG"
    menu-id="123"
    :icon="IconClipboardList"
    :is-loading="isLoadingRows"
    :is-saving="isSaving"
    v-model:show-save-dialog="showSaveDialog"
    v-model:show-cancel-dialog="showCancelDialog"
    v-model:show-close-dialog="showCloseDialog"
    @validate-save="onValidateSave"
    @confirm-save="executeSave"
    @confirm-cancel="executeCancel"
    @confirm-close="executeClose"
  >
    <!-- Kiri: Gudang (readonly), Tanggal, Cari SPK -->
    <template #left-column>
      <div class="desktop-form-section" @keydown="handleEnterAsTab">
        <div class="section-title">Filter</div>

        <label class="f-lbl">Gudang</label>
        <input :value="formData.cab" disabled class="f-input f-readonly" />
        <div class="f-hint">Mengikuti cabang Anda — tidak dapat diubah.</div>

        <label class="f-lbl mt-3">Tanggal</label>
        <input
          type="date"
          v-model="formData.tanggal"
          class="f-input"
          @change="onTanggalChange"
        />

        <label class="f-lbl mt-3">Cari SPK</label>
        <input
          type="text"
          v-model="cariSpkKeyword"
          class="f-input"
          placeholder="Ketik nomor SPK..."
          @keydown.enter="onCariSpk"
        />
      </div>
    </template>

    <!-- Kanan: Grid detail -->
    <template #right-column>
      <div class="desktop-form-section grid-wrap" @keydown="handleEnterAsTab">
        <div class="section-title">
          Detail LHK
          <span class="section-hint"
            >F1: Help SPK/MAP · F2: Help SO DTF Kaosan</span
          >
        </div>
        <div class="table-scroll">
          <table class="dt-tbl">
            <thead>
              <tr>
                <th style="width: 30px">No</th>
                <th style="width: 220px">SPK/MAP</th>
                <th style="min-width: 220px">Nama</th>
                <th style="width: 75px">Depan</th>
                <th style="width: 75px">Belakang</th>
                <th style="width: 75px">Lengan</th>
                <th style="width: 75px">Variasi</th>
                <th style="width: 65px">Saku</th>
                <th style="width: 80px">Panjang(M)</th>
                <th style="width: 80px">Buangan(M)</th>
                <th style="min-width: 160px">Keterangan</th>
                <th style="width: 36px"></th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="(row, idx) in formData.rows"
                :key="idx"
                :ref="
                  (el) => {
                    if (el) rowRefs[idx] = el as HTMLElement;
                  }
                "
                :class="{ 'row-highlight': highlightedRowIndex === idx }"
              >
                <td class="tc">{{ idx + 1 }}</td>
                <td>
                  <div class="kode-cell">
                    <input
                      type="text"
                      v-model="row.Kode"
                      class="cell-input nav-field"
                      @blur="onKodeBlur(row)"
                      @keydown.f1.prevent="openSpkMapLookup(idx)"
                      @keydown.f2.prevent="openSoDtfLookup(idx)"
                    />
                    <button
                      class="lk-btn"
                      tabindex="-1"
                      :disabled="!!row.Nama"
                      title="F1 Help SPK/MAP"
                      @click="openSpkMapLookup(idx)"
                    >
                      F1
                    </button>
                    <button
                      class="lk-btn"
                      tabindex="-1"
                      :disabled="!!row.Nama"
                      title="F2 Help SO DTF Kaosan"
                      @click="openSoDtfLookup(idx)"
                    >
                      F2
                    </button>
                  </div>
                </td>
                <td>
                  <input
                    type="text"
                    v-model="row.Nama"
                    class="cell-input"
                    readonly
                  />
                </td>
                <td>
                  <input
                    type="number"
                    v-model.number="row.Depan"
                    class="cell-input tr"
                  />
                </td>
                <td>
                  <input
                    type="number"
                    v-model.number="row.Belakang"
                    class="cell-input tr"
                  />
                </td>
                <td>
                  <input
                    type="number"
                    v-model.number="row.Lengan"
                    class="cell-input tr"
                  />
                </td>
                <td>
                  <input
                    type="number"
                    v-model.number="row.Variasi"
                    class="cell-input tr"
                  />
                </td>
                <td>
                  <input
                    type="number"
                    v-model.number="row.Saku"
                    class="cell-input tr"
                  />
                </td>
                <td>
                  <input
                    type="number"
                    step="0.1"
                    v-model.number="row.Panjang"
                    class="cell-input tr"
                  />
                </td>
                <td>
                  <input
                    type="number"
                    step="0.1"
                    v-model.number="row.Buangan"
                    class="cell-input tr"
                  />
                </td>
                <td>
                  <input type="text" v-model="row.Ket" class="cell-input" />
                </td>
                <td class="tc">
                  <button
                    class="del-btn"
                    tabindex="-1"
                    title="Hapus baris"
                    @click="confirmDeleteRow(idx)"
                  >
                    <IconTrash :size="14" />
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </template>
  </BaseForm>

  <!-- Dialog Lookup F1/F2 -->
  <SpkSearchModal
    v-model="showSpkMapLookup"
    filter-mode="spk-map"
    @selected="selectLookupResult"
  />
  <SoDtfSearchModal v-model="showSoDtfLookup" @selected="selectLookupResult" />

  <!-- Dialog Konfirmasi Hapus Baris -->
  <v-dialog v-model="showDeleteRowDialog" max-width="360px">
    <v-card rounded="lg">
      <v-card-title class="bg-error text-white pa-3 text-subtitle-1"
        >Hapus Record?</v-card-title
      >
      <v-card-text class="pa-4"
        >Baris ini akan dihapus dari daftar.</v-card-text
      >
      <v-card-actions class="pa-3 border-t">
        <v-spacer />
        <v-btn variant="text" @click="showDeleteRowDialog = false">Tidak</v-btn>
        <v-btn color="error" variant="elevated" @click="doDeleteRow"
          >Ya, Hapus</v-btn
        >
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.section-title {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  color: #1565c0;
  margin-bottom: 10px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.section-hint {
  font-size: 9px;
  font-weight: 400;
  color: #888;
  text-transform: none;
}
.f-lbl {
  display: block;
  font-size: 10px;
  font-weight: 700;
  color: #555;
  margin-bottom: 3px;
}
.mt-3 {
  margin-top: 12px;
}
.f-input {
  width: 100%;
  height: 30px;
  border: 1px solid #ccc;
  border-radius: 4px;
  padding: 0 8px;
  font-size: 12px;
  outline: none;
}
.f-input:focus {
  border-color: #1976d2;
}
.f-readonly {
  background: #eeeeee;
  color: #555;
  cursor: not-allowed;
}
.f-hint {
  font-size: 9px;
  color: #999;
  margin-top: 3px;
}
.grid-wrap {
  height: 100%;
  display: flex;
  flex-direction: column;
}
.table-scroll {
  flex: 1;
  overflow: auto;
  border: 1px solid #ddd;
  border-radius: 4px;
}
.dt-tbl {
  width: 100%;
  border-collapse: collapse;
  font-size: 11px;
}
.dt-tbl thead th {
  background: #f5f5f5;
  padding: 5px 6px;
  border-bottom: 1px solid #ccc;
  position: sticky;
  top: 0;
  z-index: 1;
  white-space: nowrap;
}
.dt-tbl tbody td {
  border-bottom: 1px solid #eee;
  padding: 2px 4px;
}
.tc {
  text-align: center;
}
.tr {
  text-align: right;
}
.muted {
  color: #999;
  font-style: italic;
  padding: 12px !important;
}
.cell-input {
  width: 100%;
  height: 26px;
  border: 1px solid transparent;
  padding: 0 4px;
  font-size: 11px;
  outline: none;
  background: transparent;
}
.cell-input:focus {
  border-color: #1976d2;
  background: white;
}
.kode-cell {
  display: flex;
  align-items: center;
  gap: 2px;
}
.lk-btn {
  flex-shrink: 0;
  font-size: 9px;
  font-weight: 700;
  padding: 2px 5px;
  border: 1px solid #ccc;
  border-radius: 3px;
  background: #f5f5f5;
  cursor: pointer;
}
.lk-btn:hover {
  background: #e3f2fd;
  border-color: #1976d2;
}
.lk-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
.del-btn {
  border: none;
  background: transparent;
  color: #c62828;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}
.row-highlight {
  background: #fff9c4 !important;
}
.lookup-scroll {
  max-height: 340px;
  overflow-y: auto;
  border: 1px solid #ddd;
  border-radius: 4px;
}
.lookup-row {
  cursor: pointer;
}
.lookup-row:hover {
  background: #e3f2fd;
}
</style>
