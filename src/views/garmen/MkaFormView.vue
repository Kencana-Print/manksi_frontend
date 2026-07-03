<script setup lang="ts">
import { ref, computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useToast } from "vue-toastification";
import { useForm } from "@/composables/useForm";
import { mkaFormService } from "@/services/garmen/mkaFormService";
import BaseForm from "@/components/BaseForm.vue";
import SpkSearchModal from "@/components/lookups/SpkSearchModal.vue";
import AksesorisSearchModal from "@/components/lookups/AccesoriesSearchModal.vue";
import { IconNotes, IconSearch } from "@tabler/icons-vue";

// ─── Types ────────────────────────────────────────────────────────────────────
interface MkaDetailRow {
  kode: string;
  nama: string;
  satuan: string;
  pemakaian: number;
  jumlah: number;
  ready: number;
  free: number;
  po: number;
  keterangan: string;
  _key: number;
}

interface MkaFormState {
  mkb_nomor: string;
  mkb_tanggal: string;
  mkb_spk_nomor: string;
  mkb_note: string;
  spk_nama: string;
  spk_jumlah: number;
  spk_memo: string;
  divisi: string;
  detail: MkaDetailRow[];
}

// ─── Router / Toast ───────────────────────────────────────────────────────────
const route = useRoute();
const router = useRouter();
const toast = useToast();

const isEdit = computed(() => !!route.params.nomor);
const nomorParam = computed(() =>
  route.params.nomor ? decodeURIComponent(route.params.nomor as string) : "",
);

// ─── Helpers ──────────────────────────────────────────────────────────────────
const formatDateLocal = (value?: string | Date): string => {
  if (!value) return "";
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value))
    return value;
  const d = new Date(value);
  if (isNaN(d.getTime())) return "";
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const fmt = (n: number | null | undefined) =>
  (n ?? 0).toLocaleString("id-ID", { maximumFractionDigits: 2 });

let _keySeq = 0;
const newKey = () => ++_keySeq;

// ─── emptyData ────────────────────────────────────────────────────────────────
const emptyData: MkaFormState = {
  mkb_nomor: "",
  mkb_tanggal: formatDateLocal(new Date()),
  mkb_spk_nomor: "",
  mkb_note: "",
  spk_nama: "",
  spk_jumlah: 0,
  spk_memo: "",
  divisi: "",
  detail: [],
};

// ─── useForm ──────────────────────────────────────────────────────────────────
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
} = useForm<MkaFormState>({
  menuId: "57",
  initialData: emptyData,
  fetchApi: async () => {
    const res = await mkaFormService.getDetail(nomorParam.value);
    const d = res.data;
    return {
      mkb_nomor: d.mkb_nomor ?? "",
      mkb_tanggal:
        formatDateLocal(d.mkb_tanggal) || formatDateLocal(new Date()),
      mkb_spk_nomor: d.mkb_spk_nomor ?? "",
      mkb_note: d.mkb_note ?? "",
      spk_nama: d.spk_nama ?? "",
      spk_jumlah: Number(d.spk_jumlah) || 0,
      spk_memo: d.spk_memo ?? "",
      divisi: d.divisi ?? "",
      detail: (d.detail ?? []).map((row: Omit<MkaDetailRow, "_key">) => ({
        kode: row.kode ?? "",
        nama: row.nama ?? "",
        satuan: row.satuan ?? "",
        pemakaian: Number(row.pemakaian) || 0,
        jumlah: Number(row.jumlah) || 0,
        ready: Number(row.ready) || 0,
        free: Number(row.free) || 0,
        po: Number(row.po) || 0,
        keterangan: row.keterangan ?? "",
        _key: newKey(),
      })),
    };
  },
  submitApi: async (payload) => {
    const clean = {
      ...payload,
      detail: (payload.detail as MkaDetailRow[])
        .filter((d: MkaDetailRow) => d.nama)
        .map(({ _key, ...rest }) => rest),
    };
    return mkaFormService.saveData(clean);
  },
  onSuccessRoute: "",
  onSuccess: (res: any) => {
    toast.success("MKA berhasil disimpan.");
    savedNomor.value = res.data?.nomor ?? formData.value.mkb_nomor;
    showPrintDialog.value = true;
  },
});

// ─── Print dialog ─────────────────────────────────────────────────────────────
const showPrintDialog = ref(false);
const savedNomor = ref("");

const closePrintAndExit = () => {
  showPrintDialog.value = false;
  router.back();
};
const doCetak = () => {
  showPrintDialog.value = false;
  window.open(
    `/garmen/mka/print/${encodeURIComponent(savedNomor.value)}`,
    "_blank",
  );
  router.back();
};

// ─── SPK Modal ────────────────────────────────────────────────────────────────
// Pakai SpkSearchModal yang sudah ada (emit 'selected' dengan item.Nomor)
const showSpkModal = ref(false);
const spkLoading = ref(false);
const lastResolvedSpk = ref("");

const openSpkModal = () => {
  if (isEdit.value) return;
  showSpkModal.value = true;
};

// Dipanggil setelah user pilih dari modal atau Enter di input
const onSpkSelected = async (item: any) => {
  const spkNomor = (item?.Nomor ?? item?.spk_nomor ?? "").trim();
  if (!spkNomor) return;
  formData.value.mkb_spk_nomor = spkNomor;
  await doResolveSpk(spkNomor);
};

const onSpkKeydown = (e: KeyboardEvent) => {
  if (e.key === "F1") {
    e.preventDefault();
    openSpkModal();
  }
};

const onSpkEnter = () => doResolveSpk(formData.value.mkb_spk_nomor.trim());

// Delphi: edtNomorSPKExit
const doResolveSpk = async (spkNomor: string) => {
  if (!spkNomor || spkNomor === lastResolvedSpk.value || isEdit.value) return;
  lastResolvedSpk.value = spkNomor;
  spkLoading.value = true;
  try {
    const res = await mkaFormService.getSpkInfo(spkNomor);
    const result = res.data;

    if (!result.exists) {
      toast.error(result.error ?? "SPK tidak ditemukan");
      formData.value.mkb_spk_nomor = "";
      lastResolvedSpk.value = "";
      return;
    }

    if (result.hasExisting && result.existing) {
      // SPK sudah punya MKA → load existing & redirect ke edit
      toast.info(
        `SPK ini sudah punya MKA ${result.existing.mkb_nomor}, data dimuat.`,
      );
      const ex = result.existing;
      formData.value = {
        ...ex,
        detail: (ex.detail ?? []).map((d: Omit<MkaDetailRow, "_key">) => ({
          ...d,
          _key: newKey(),
        })),
      };
      router.replace({
        name: "GarmenMkaEdit",
        params: { nomor: encodeURIComponent(ex.mkb_nomor) },
      });
      return;
    }

    // SPK valid, belum punya MKA
    const spk = result.spk;
    formData.value.spk_nama = spk.spk_nama;
    formData.value.spk_jumlah = spk.spk_jumlah;
    formData.value.spk_memo = spk.spk_memo;
    formData.value.divisi = spk.divisi;
    formData.value.detail = (result.prefillDetail ?? []).map(
      (d: Omit<MkaDetailRow, "_key">) => ({ ...d, _key: newKey() }),
    );
    // Selalu ada 1 baris kosong di akhir untuk langsung input
    addEmptyRow();
    if (result.prefillDetail?.length) {
      toast.success(
        `${result.prefillDetail.length} aksesoris dimuat dari MAP.`,
      );
    }
  } catch (e: any) {
    toast.error(e.response?.data?.message ?? "Gagal cek SPK");
    formData.value.mkb_spk_nomor = "";
    lastResolvedSpk.value = "";
  } finally {
    spkLoading.value = false;
  }
};

// ─── Aksesoris Modal ──────────────────────────────────────────────────────────
// Pakai AksesorisSearchModal yang sudah ada (emit 'selected' dengan item.Kode)
const showAksesoriModal = ref(false);
const aksTargetIdx = ref<number | undefined>(undefined);

const openAksesoriModal = () => {
  if (!formData.value.mkb_spk_nomor) return;
  aksTargetIdx.value = undefined;
  showAksesoriModal.value = true;
};

const openAksesoriModalForRow = (idx: number) => {
  aksTargetIdx.value = idx;
  showAksesoriModal.value = true;
};

// Dipanggil setelah user pilih dari modal
const onAksesoriSelected = async (item: any) => {
  const kode = (item?.Kode ?? item?.kode ?? "").trim();
  if (!kode) return;
  await addBahanByKode(kode, aksTargetIdx.value);
};

// ─── Resolve kode diketik langsung (Delphi: loadkode) ────────────────────────
const onKodeKeydown = (e: KeyboardEvent, idx: number) => {
  if (e.key === "F1") {
    e.preventDefault();
    openAksesoriModalForRow(idx);
  }
};

const resolveKodeBahan = async (idx: number) => {
  const row = formData.value.detail[idx];
  if (!row?.kode?.trim() || row.nama) return;
  await addBahanByKode(row.kode.trim(), idx);
};

const addBahanByKode = async (kode: string, replaceIdx?: number) => {
  // Cek duplikat — Delphi: "Kode tsb sudah di input, di baris N"
  const dupIdx = formData.value.detail.findIndex(
    (d: MkaDetailRow, i: number) =>
      d.kode === kode && i !== replaceIdx && !!d.nama,
  );
  if (dupIdx !== -1) {
    toast.warning(`Kode ${kode} sudah ada di baris ${dupIdx + 1}`);
    if (replaceIdx !== undefined) formData.value.detail[replaceIdx].kode = "";
    return;
  }
  try {
    const res = await mkaFormService.getAksesorisByKode(
      kode,
      formData.value.spk_jumlah,
      formData.value.mkb_nomor,
    );
    const bahan = res.data;
    if (!bahan) {
      toast.error(`Kode ${kode} tidak ditemukan`);
      if (replaceIdx !== undefined) formData.value.detail[replaceIdx].kode = "";
      return;
    }
    const newRow: MkaDetailRow = {
      kode: bahan.kode ?? "",
      nama: bahan.nama ?? "",
      satuan: bahan.satuan ?? "",
      pemakaian: Number(bahan.pemakaian) || 0,
      jumlah: Number(bahan.jumlah) || 0,
      ready: Number(bahan.ready) || 0,
      free: Number(bahan.free) || 0,
      po: Number(bahan.po) || 0,
      keterangan: bahan.keterangan ?? "",
      _key: newKey(),
    };
    if (replaceIdx !== undefined) {
      formData.value.detail[replaceIdx] = newRow;
    } else {
      formData.value.detail.push(newRow);
    }
    // Auto-tambah baris kosong jika baris terakhir sudah terisi
    const lastRow = formData.value.detail[formData.value.detail.length - 1];
    if (lastRow.nama) {
      addEmptyRow();
    }
  } catch {
    toast.error("Gagal memuat data aksesoris");
  }
};

// ─── Recalc ───────────────────────────────────────────────────────────────────
// Delphi: clpemakaianPropertiesEditValueChanged
const recalcRow = (idx: number) => {
  const row = formData.value.detail[idx];
  row.jumlah = (formData.value.spk_jumlah || 0) * (row.pemakaian || 0);
  recalcPo(idx);
};
// Delphi: clJumlahPropertiesEditValueChanged
const recalcPo = (idx: number) => {
  const row = formData.value.detail[idx];
  row.po = row.ready >= row.jumlah ? 0 : row.jumlah - row.ready;
};

const addEmptyRow = () => {
  if (!formData.value.mkb_spk_nomor) return;
  formData.value.detail.push({
    kode: "",
    nama: "",
    satuan: "",
    pemakaian: 0,
    jumlah: 0,
    ready: 0,
    free: 0,
    po: 0,
    keterangan: "",
    _key: newKey(),
  });
};

const removeRow = (idx: number) => formData.value.detail.splice(idx, 1);

// ─── Validasi (Delphi: VK_F10 handler) ───────────────────────────────────────
const validateSave = () => {
  if (!formData.value.mkb_spk_nomor?.trim()) {
    return toast.warning("SPK harus diisi");
  }
  const validDetail = formData.value.detail.filter((d: MkaDetailRow) => d.nama);
  if (!validDetail.length) {
    return toast.warning("Tidak ada detail, tidak dapat disimpan");
  }
  const zeroRow = validDetail.find(
    (d: MkaDetailRow) => !d.jumlah || d.jumlah === 0,
  );
  if (zeroRow) {
    return toast.warning(`Jumlah untuk ${zeroRow.nama} belum diisi`);
  }
  showSaveDialog.value = true;
};
</script>

<template>
  <BaseForm
    :title="(isEdit ? 'Ubah' : 'Baru') + ' MKA (Memo Kebutuhan Aksesoris)'"
    menu-id="57"
    :icon="IconNotes"
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
    <!-- ═══ KOLOM KIRI: Info Dokumen & SPK ═══ -->
    <template #left-column>
      <div class="header-section">
        <div class="fr">
          <label class="lbl">Nomor</label>
          <input
            :value="formData.mkb_nomor"
            class="inp ro text-primary font-weight-bold"
            placeholder="<-- Kosong=Baru"
            readonly
          />
        </div>
        <div class="fr mt-1">
          <label class="lbl">Tanggal</label>
          <input
            type="date"
            v-model="formData.mkb_tanggal"
            class="idate"
            :disabled="isEdit"
          />
        </div>
        <div class="fr mt-1">
          <label class="lbl">Keterangan</label>
          <input
            v-model="formData.mkb_note"
            class="inp"
            maxlength="200"
            placeholder="Keterangan..."
          />
        </div>

        <div class="sep mt-2 mb-2" />

        <div class="fr">
          <label class="lbl">Nomor SPK</label>
          <div class="inp-grp" style="flex: 1">
            <input
              v-model="formData.mkb_spk_nomor"
              class="inp"
              :class="{ ro: isEdit || spkLoading }"
              :readonly="isEdit || spkLoading"
              placeholder="F1 / ketik + Enter"
              style="
                text-transform: uppercase;
                flex: 1;
                border: none;
                height: 100%;
              "
              @keydown="onSpkKeydown"
              @keydown.enter.prevent="onSpkEnter"
            />
            <button
              type="button"
              class="btn-lkp"
              :disabled="isEdit || spkLoading"
              title="Cari SPK (F1)"
              @click="openSpkModal"
            >
              <IconSearch :size="13" />
            </button>
          </div>
        </div>
        <div class="fr mt-1">
          <label class="lbl">Nama Barang</label>
          <input :value="formData.spk_nama" class="inp ro" readonly />
        </div>
        <div class="fr mt-1">
          <label class="lbl">Jumlah SPK</label>
          <input
            :value="formData.spk_jumlah"
            class="inp ro"
            style="width: 80px; flex: none"
            readonly
          />
        </div>
        <div class="fr mt-1">
          <label class="lbl">MAP</label>
          <input :value="formData.spk_memo" class="inp ro" readonly />
        </div>
        <div class="fr mt-1">
          <label class="lbl">Divisi</label>
          <input :value="formData.divisi" class="inp ro" readonly />
        </div>
      </div>
    </template>

    <!-- ═══ KOLOM KANAN: Grid Detail Aksesoris ═══ -->
    <template #right-column>
      <div class="right-content-wrapper d-flex flex-column h-100 gap-2 pa-2">
        <div class="d-flex flex-column" style="flex: 1; min-height: 0">
          <div class="tbl-header blue">
            <span class="font-weight-bold">Detail Aksesoris</span>
            <button
              type="button"
              class="btn-add"
              :disabled="!formData.mkb_spk_nomor"
              @click="addEmptyRow"
            >
              + Tambah Baris
            </button>
          </div>
          <div class="tbl-wrap flex-grow-1">
            <table class="gt">
              <thead>
                <tr>
                  <th style="width: 32px" class="text-center">No</th>
                  <th style="width: 110px">Kode</th>
                  <th style="min-width: 180px">Nama Aksesoris</th>
                  <th style="width: 60px" class="text-center">Satuan</th>
                  <th style="width: 80px" class="text-right">Pemakaian</th>
                  <th
                    style="width: 85px; background: #f9a825"
                    class="text-right text-dark"
                  >
                    Jumlah
                  </th>
                  <th style="width: 80px" class="text-right">Ready</th>
                  <th style="width: 80px" class="text-right">Free</th>
                  <th
                    style="width: 80px; background: #c62828"
                    class="text-right text-white"
                  >
                    PO
                  </th>
                  <th style="min-width: 150px">Keterangan</th>
                  <th style="width: 36px" class="text-center">Aksi</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="(row, idx) in formData.detail"
                  :key="row._key"
                  :class="{ 'row-negative': row.free < 0 }"
                >
                  <td class="text-center gt-lbl">{{ (idx as number) + 1 }}</td>

                  <td class="p0">
                    <div class="cell-grp">
                      <input
                        v-model="row.kode"
                        class="ci font-weight-bold text-primary"
                        :class="{ ro: !!row.nama }"
                        :readonly="!!row.nama"
                        placeholder="F1/kode"
                        @keydown="onKodeKeydown($event, idx as number)"
                        @keydown.enter.prevent="resolveKodeBahan(idx as number)"
                        @blur="resolveKodeBahan(idx as number)"
                      />
                      <button
                        type="button"
                        class="ci-btn"
                        title="Cari Aksesoris (F1)"
                        @click.stop="openAksesoriModalForRow(idx as number)"
                      >
                        <IconSearch :size="12" />
                      </button>
                    </div>
                  </td>

                  <td class="p0">
                    <input
                      :value="row.nama"
                      class="ci ro"
                      readonly
                      tabindex="-1"
                    />
                  </td>

                  <td class="text-center">{{ row.satuan }}</td>

                  <td class="p0">
                    <input
                      v-model.number="row.pemakaian"
                      type="number"
                      min="0"
                      class="ci text-right"
                      @input="recalcRow(idx as number)"
                      v-select-on-focus
                    />
                  </td>

                  <td class="p0">
                    <input
                      v-model.number="row.jumlah"
                      type="number"
                      min="0"
                      class="ci text-right font-weight-bold"
                      style="background: #fffde7"
                      @input="recalcPo(idx as number)"
                      v-select-on-focus
                    />
                  </td>

                  <td
                    class="text-right pr-1"
                    :class="{
                      'text-red-darken-2 font-weight-bold': row.ready < 0,
                    }"
                  >
                    {{ fmt(row.ready) }}
                  </td>

                  <td
                    class="text-right pr-1"
                    :class="{
                      'text-red-darken-2 font-weight-bold': row.free < 0,
                    }"
                  >
                    {{ fmt(row.free) }}
                  </td>

                  <td
                    class="text-right pr-1"
                    style="color: #c62828; font-weight: 600"
                  >
                    {{ fmt(row.po) }}
                  </td>

                  <td class="p0">
                    <input
                      v-model="row.keterangan"
                      class="ci"
                      maxlength="100"
                    />
                  </td>

                  <td class="text-center p0">
                    <button
                      type="button"
                      class="btn-del"
                      @click="removeRow(idx as number)"
                    >
                      ✕
                    </button>
                  </td>
                </tr>
                <tr v-if="!formData.detail.length">
                  <td colspan="11" class="empty-row">
                    Pilih SPK terlebih dahulu, lalu tambah aksesoris
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </template>
  </BaseForm>

  <!-- Pakai komponen modal yang sudah ada -->
  <SpkSearchModal
    v-model="showSpkModal"
    filter-mode="spk-ppic"
    @selected="onSpkSelected"
  />

  <AksesorisSearchModal
    v-model="showAksesoriModal"
    @selected="onAksesoriSelected"
  />

  <!-- Dialog cetak setelah simpan -->
  <v-dialog v-model="showPrintDialog" max-width="400" persistent>
    <v-card class="rounded-lg">
      <v-card-title
        class="bg-primary text-white pa-3 text-subtitle-1 font-weight-bold"
      >
        Simpan Berhasil
      </v-card-title>
      <v-card-text class="pa-4 text-center">
        MKA <b>{{ savedNomor }}</b> telah tersimpan.<br />
        Apakah Anda ingin mencetak dokumen ini?
      </v-card-text>
      <v-card-actions class="pa-3 border-t bg-grey-lighten-4">
        <v-btn variant="text" color="error" @click="closePrintAndExit"
          >Tutup</v-btn
        >
        <v-spacer />
        <v-btn color="primary" variant="elevated" @click="doCetak"
          >Ya, Cetak</v-btn
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
  width: 85px;
  flex-shrink: 0;
  font-size: 11px;
  font-weight: 600;
  color: #424242;
}
.inp,
.idate {
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
.inp:focus,
.idate:focus {
  border-color: #1565c0;
}
.ro {
  background: #f0f4f8 !important;
  color: #555 !important;
  cursor: default;
}
.idate:disabled {
  background: #f0f4f8;
  color: #555;
}
.sep {
  height: 1px;
  background: #eee;
  width: 100%;
}

.inp-grp {
  display: flex;
  border: 1px solid #ccc;
  border-radius: 3px;
  overflow: hidden;
  height: 26px;
}
.inp-grp:focus-within {
  border-color: #1565c0;
}
.btn-lkp {
  width: 28px;
  background: #f5f5f5;
  border: none;
  border-left: 1px solid #ccc;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #424242;
  flex-shrink: 0;
}
.btn-lkp:hover {
  background: #e0e0e0;
}
.btn-lkp:disabled {
  opacity: 0.45;
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
}
.tbl-header.blue {
  background: #1565c0;
  color: white;
}
.btn-add {
  background: rgba(255, 255, 255, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.5);
  color: white;
  padding: 2px 8px;
  border-radius: 3px;
  cursor: pointer;
  font-size: 11px;
}
.btn-add:hover {
  background: rgba(255, 255, 255, 0.3);
}
.btn-add:disabled {
  opacity: 0.45;
  cursor: not-allowed;
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
  padding: 0 4px;
}
.gt tbody tr:nth-of-type(even) td {
  background-color: rgba(0, 0, 0, 0.015);
}
.gt tbody tr:hover td {
  background-color: #e8f5e9 !important;
}
.row-negative td {
  background-color: rgba(198, 40, 40, 0.04) !important;
}
.gt-lbl {
  background: #f5f5f5;
  font-size: 10px;
  color: #666;
}

.p0 {
  padding: 0 !important;
}
.ci {
  width: 100%;
  height: 25px;
  border: none;
  background: transparent;
  padding: 0 6px;
  font-size: 11px;
  outline: none;
  font-family: inherit;
  box-sizing: border-box;
}
.ci:focus:not(.ro) {
  background: #e3f2fd !important;
  box-shadow: inset 0 0 0 1.5px #1976d2;
}
.cell-grp {
  display: flex;
  align-items: center;
  height: 25px;
}
.cell-grp .ci {
  flex: 1;
  min-width: 0;
}
.ci-btn {
  width: 22px;
  min-width: 22px;
  height: 25px;
  background: #e3f2fd;
  border: none;
  border-left: 1px solid #ccc;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #1565c0;
  flex-shrink: 0;
}
.ci-btn:hover {
  background: #bbdefb;
}
.btn-del {
  width: 100%;
  height: 25px;
  background: transparent;
  color: #d32f2f;
  border: none;
  cursor: pointer;
  font-weight: bold;
}
.btn-del:hover {
  background: #ffebee;
}
.pr-1 {
  padding-right: 6px !important;
}
.empty-row {
  text-align: center;
  color: #9e9e9e;
  font-style: italic;
  padding: 12px 8px;
  font-size: 11px;
}
</style>
