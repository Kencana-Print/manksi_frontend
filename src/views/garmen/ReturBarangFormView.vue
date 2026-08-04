<script setup lang="ts">
import { computed, ref, nextTick } from "vue";
import { useRoute } from "vue-router";
import { useToast } from "vue-toastification";
import { useForm } from "@/composables/useForm";
import { useAuthStore } from "@/stores/authStore";
import BaseForm from "@/components/BaseForm.vue";
import { returBarangFormService } from "@/services/garmen/returBarangFormService";
import { IconArrowBack, IconSearch } from "@tabler/icons-vue";

import GudangProduksiSearchModal from "@/components/lookups/GudangProduksiSearchModal.vue";
import RealisasiSearchModal from "@/components/lookups/RealisasiSearchModal.vue";
import BarangReturSearchModal from "@/components/lookups/BarangReturSearchModal.vue";

interface DetailItem {
  nominta: string;
  kode: string;
  nama: string;
  satuan: string;
  minta: number;
  jumlah: number;
  sudah: number;
  keterangan: string;
  spk: string;
}

const route = useRoute();
const toast = useToast();
const authStore = useAuthStore();

const isEdit = computed(() => !!route.params.nomor);
const nomorParam = computed(() => route.params.nomor as string);

const emptyRow = (): DetailItem => ({
  nominta: "",
  kode: "",
  nama: "",
  satuan: "",
  minta: 0,
  jumlah: 0,
  sudah: 0,
  keterangan: "",
  spk: "",
});

const formatDateLocal = (value?: string | Date) => {
  if (!value) return "";
  const d = new Date(value);
  if (isNaN(d.getTime())) return "";
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const initialData = {
  nomor: "",
  tanggal: formatDateLocal(new Date()),
  jenis: sessionStorage.getItem("last_jenis_retur_barang") || "ACCESORIES",
  cabang: authStore.user?.cabang || "",
  gpKode: "",
  gpNama: "",
  keterangan: "",
  statusPin5: "",
  details: [emptyRow()] as DetailItem[],
};

const {
  formData,
  isLoading,
  isSaving,
  showSaveDialog,
  showCancelDialog,
  showCloseDialog,
  canSave,
  executeSave,
  executeCancel,
  executeClose,
  goBack,
} = useForm({
  menuId: "61",
  initialData,
  fetchApi: async () => {
    const res = await returBarangFormService.getDetail(nomorParam.value);
    const data = res.data.data;
    return {
      nomor: data.nomor,
      tanggal: formatDateLocal(data.tanggal),
      jenis: data.jenis,
      cabang: data.cabang,
      gpKode: data.gudangProduksi?.kode || "",
      gpNama: data.gudangProduksi?.nama || "",
      keterangan: data.keterangan,
      statusPin5: data.statusPin5,
      details: data.details.length > 0 ? data.details : [emptyRow()],
    };
  },
  submitApi: async (payload: any) => {
    const body = {
      jenis: payload.jenis,
      tanggal: payload.tanggal,
      cabang: payload.cabang,
      gudangProduksi: { kode: payload.gpKode, nama: payload.gpNama },
      keterangan: payload.keterangan,
      details: payload.details,
    };
    if (isEdit.value) {
      return await returBarangFormService.update(nomorParam.value, body);
    }
    return await returBarangFormService.create(body);
  },
  onSuccess: (res: any) => {
    savedNomor.value = res.data?.data?.nomor || formData.value.nomor;
    showPrintDialog.value = true;
  },
});

// Alias bertipe eksplisit — formData dari useForm kemungkinan generic/loose,
// jadi formData.value.details bisa ke-infer 'any'. Ini menjalar ke v-for
// index (jadi string|number, bukan number) dan ke parameter callback
// (.some/.find/.filter jadi implicit any). Pakai computed ini di template
// dan di semua helper function di bawah, bukan formData.value.details langsung.
const details = computed<DetailItem[]>({
  get: () => formData.value.details as DetailItem[],
  set: (val) => {
    formData.value.details = val;
  },
});

// ⚠️ Visibilitas kolom No.Minta/Minta/Sudah/SPK + panel "Retur Dari" pakai
// CABANG SESSION USER (bukan cabang record), replikasi literal FormCreate
// Delphi yang pakai variabel global zcab. Kalau perilaku ini bermasalah
// utk user cross-cabang (mis. HO edit retur milik P02), beri tahu saya.
const showApproveFields = computed(
  () =>
    ["ACCESORIES", "OBAT"].includes(formData.value.jenis) &&
    authStore.user?.cabang !== "P03",
);
// F1 pada Kode: ACCESORIES -> Realisasi search; OBAT/SPAREPART/ATK-RTK -> Barang search
const kodeUsesRealisasi = computed(() => formData.value.jenis === "ACCESORIES");
// F2 multi-select barang: semua jenis SELAIN ACCESORIES
const canMultiSelectBarang = computed(
  () => formData.value.jenis !== "ACCESORIES",
);

const statusLabel: Record<string, { text: string; color: string }> = {
  MINTA: { text: "Perlu Pengajuan", color: "#c62828" },
  WAIT: { text: "Nunggu ACC", color: "#1976d2" },
  ACC: { text: "Sudah ACC", color: "#2e7d32" },
  TOLAK: { text: "Ditolak", color: "#c62828" },
};

// --- MODAL STATE ---
const showGpModal = ref(false);
const showRealisasiModal = ref(false);
const showBarangModal = ref(false);
const barangMultiMode = ref(false);
const activeRowIndex = ref<number | null>(null);
const presetRealisasiNomor = ref("");
const jumlahRefs = ref<Record<number, HTMLInputElement | null>>({});
const keteranganRefs = ref<Record<number, HTMLInputElement | null>>({});
const nomintaRefs = ref<Record<number, HTMLInputElement | null>>({});
const kodeRefs = ref<Record<number, HTMLInputElement | null>>({});

const setJumlahRef = (el: any, index: number) => {
  jumlahRefs.value[index] = el;
};
const setKeteranganRef = (el: any, index: number) => {
  keteranganRefs.value[index] = el;
};
const setNomintaRef = (el: any, index: number) => {
  nomintaRefs.value[index] = el;
};
const setKodeRef = (el: any, index: number) => {
  kodeRefs.value[index] = el;
};

// Setelah row berhasil diisi via search picker -> fokus ke Qty Retur
const focusJumlahAt = async (index: number) => {
  await nextTick();
  const el = jumlahRefs.value[index];
  if (el) {
    el.focus();
    el.select();
  }
};

// Enter di Jumlah -> pindah ke Keterangan baris yang sama
const onJumlahEnter = async (index: number) => {
  await nextTick();
  const el = keteranganRefs.value[index];
  if (el) el.focus();
};

// Enter di Keterangan -> pindah ke Nominta/Kode baris berikutnya (siap dicari)
const onKeteranganEnter = async (index: number) => {
  await nextTick();
  const nextIndex = index + 1;
  if (showApproveFields.value) {
    const el = nomintaRefs.value[nextIndex];
    if (el) {
      el.focus();
      return;
    }
  }
  const el = kodeRefs.value[nextIndex];
  if (el) el.focus();
};

const onGpKeydown = (e: KeyboardEvent) => {
  if (e.key === "F1" || e.key === "Enter") {
    e.preventDefault();
    openGpModal();
  }
};

const openGpModal = () => {
  if (isEdit.value) return;
  showGpModal.value = true;
};
const onGpSelected = (item: any) => {
  formData.value.gpKode = item.Kode;
  formData.value.gpNama = item.Nama;
};

const openRowSearch = (index: number) => {
  const row = details.value[index];
  if (row.nama) return;
  activeRowIndex.value = index;
  if (kodeUsesRealisasi.value) {
    presetRealisasiNomor.value = "";
    showRealisasiModal.value = true;
  } else {
    barangMultiMode.value = false;
    showBarangModal.value = true;
  }
};

// Khusus kolom No.Realisasi Minta — selalu ke Realisasi search (utk
// ACCESORIES maupun OBAT), beda dari kolom Kode yang jenis-dependent
const openRowRealisasiSearch = (index: number) => {
  const row = details.value[index];
  if (row.nama) return; // terkunci kalau row sudah terisi
  activeRowIndex.value = index;
  showRealisasiModal.value = true;
};

// Trigger F1/Enter -> buka modal pencarian (row Kode, jenis-dependent)
const onKodeKeydown = (e: KeyboardEvent, index: number) => {
  if (e.key === "F1") {
    e.preventDefault();
    openRowSearch(index);
  }
};

const onKodeEnter = async (index: number) => {
  const row = details.value[index];
  if (row.nama) return; // row terkunci

  // ACCESORIES: kode tidak bisa dicari langsung by kode, selalu ke Realisasi
  // header-picker (sesuai loadbrg('') di Delphi saat clkode F1 utk ACCESORIES)
  if (kodeUsesRealisasi.value) {
    activeRowIndex.value = index;
    presetRealisasiNomor.value = "";
    showRealisasiModal.value = true;
    return;
  }

  const kode = (row.kode || "").trim().toUpperCase();
  if (!kode) {
    openRowSearch(index);
    return;
  }

  try {
    isLoading.value = true;
    const res = await returBarangFormService.searchBarang(
      formData.value.jenis,
      kode,
      1,
      50,
    );
    const exact = res.data.data.items.find(
      (i: any) => i.Kode.toUpperCase() === kode,
    );
    if (!exact) {
      toast.error("Kode tsb tidak ada.");
      row.kode = "";
      return;
    }
    if (isDuplicateKode(exact.Kode, index)) {
      toast.warning("Kode tsb sudah di input di baris lain.");
      row.kode = "";
      return;
    }
    row.nominta = "";
    row.spk = "";
    row.kode = exact.Kode;
    row.nama = exact.Nama;
    row.satuan = exact.Satuan;
    row.minta = 0;
    row.sudah = 0;
    ensureTrailingEmptyRow();
    focusJumlahAt(index);
  } catch {
    toast.error("Kode tsb tidak ada.");
    row.kode = "";
  } finally {
    isLoading.value = false;
  }
};

// Trigger F1/Enter -> buka Realisasi search (row No.Minta)
const onNomintaKeydown = (e: KeyboardEvent, index: number) => {
  if (e.key === "F1") {
    e.preventDefault();
    presetRealisasiNomor.value = "";
    openRowRealisasiSearch(index);
  }
};

const onNomintaEnter = async (index: number) => {
  const row = details.value[index];
  if (row.nama) return; // row terkunci
  const nomor = (row.nominta || "").trim().toUpperCase();
  if (!nomor) {
    presetRealisasiNomor.value = "";
    openRowRealisasiSearch(index);
    return;
  }

  try {
    isLoading.value = true;
    const res = await returBarangFormService.searchRealisasiDetail(
      formData.value.jenis,
      nomor,
      formData.value.nomor,
    );
    if (!res.data.data || res.data.data.length === 0) {
      toast.error("No.Realisasi tsb tidak ada.");
      row.nominta = "";
      return;
    }
    // Nomor valid -> buka modal langsung di step detail (skip pilih header)
    activeRowIndex.value = index;
    presetRealisasiNomor.value = nomor;
    showRealisasiModal.value = true;
  } catch {
    toast.error("No.Realisasi tsb tidak ada.");
    row.nominta = "";
  } finally {
    isLoading.value = false;
  }
};

const isDuplicateNomintaKode = (
  nominta: string,
  kode: string,
  excludeIdx: number,
) =>
  details.value.some(
    (d: DetailItem, i: number) =>
      i !== excludeIdx && d.nama && d.nominta === nominta && d.kode === kode,
  );
const isDuplicateKode = (kode: string, excludeIdx: number) =>
  details.value.some(
    (d: DetailItem, i: number) => i !== excludeIdx && d.nama && d.kode === kode,
  );

const onRealisasiSelected = (item: any) => {
  const idx = activeRowIndex.value;
  if (idx === null) return;

  if (isDuplicateNomintaKode(item.NoRealisasi, item.Kode, idx)) {
    toast.warning("Barang dgn No.Permintaan tsb sudah di input di baris lain.");
    return;
  }

  const row = details.value[idx];
  row.nominta = item.NoRealisasi;
  row.spk = item.SPK;
  row.kode = item.Kode;
  row.nama = item.Nama;
  row.satuan = item.Satuan;
  row.minta = Number(item.Minta) || 0;
  row.sudah = Number(item.Sudah) || 0;

  ensureTrailingEmptyRow();
};

const onBarangSelected = (item: any) => {
  const idx = activeRowIndex.value;
  if (idx === null) return;

  if (isDuplicateKode(item.Kode, idx)) {
    toast.warning(`Kode tsb sudah di input di baris lain.`);
    return;
  }

  const row = details.value[idx];
  row.nominta = "";
  row.spk = "";
  row.kode = item.Kode;
  row.nama = item.Nama;
  row.satuan = item.Satuan;
  row.minta = 0;
  row.sudah = 0;

  ensureTrailingEmptyRow();
  focusJumlahAt(idx);
};

const openMultiBarangModal = () => {
  barangMultiMode.value = true;
  showBarangModal.value = true;
};

const onBarangMultiSelected = (picked: any[]) => {
  let added = 0;
  let skipped = 0;
  let firstAddedIndex: number | null = null;

  for (const item of picked) {
    if (isDuplicateKode(item.Kode, -1)) {
      skipped += 1;
      continue;
    }
    // isi baris kosong pertama, atau tambah baris baru
    let target = details.value.find((d: DetailItem) => !d.nama);
    if (!target) {
      target = emptyRow();
      details.value.push(target);
    }
    target.nominta = "";
    target.spk = "";
    target.kode = item.Kode;
    target.nama = item.Nama;
    target.satuan = item.Satuan;
    target.minta = 0;
    target.sudah = 0;
    added += 1;

    if (firstAddedIndex === null) {
      firstAddedIndex = details.value.indexOf(target);
    }
  }

  ensureTrailingEmptyRow();

  if (firstAddedIndex !== null) {
    focusJumlahAt(firstAddedIndex);
  }

  toast.success(
    `${added} barang ditambahkan.` +
      (skipped > 0 ? ` ${skipped} duplikat dilewati.` : ""),
  );
};

const ensureTrailingEmptyRow = () => {
  const last = details.value[details.value.length - 1];
  if (last && last.nama) {
    details.value.push(emptyRow());
  }
};

const removeRow = (index: number) => {
  if (details.value.length <= 1) {
    details.value[0] = emptyRow();
    return;
  }
  details.value.splice(index, 1);
};

// --- VALIDASI SIMPAN ---
const validateSave = () => {
  if (!canSave.value)
    return toast.error("Anda tidak memiliki hak akses simpan.");

  if (
    isEdit.value &&
    ["MINTA", "WAIT", "TOLAK"].includes(formData.value.statusPin5)
  ) {
    return toast.error(
      "Transaksi tsb sudah diclose. Silahkan minta approve (menu Pengajuan di Browse) untuk bisa menyimpan perubahan data.",
    );
  }

  if (showApproveFields.value && !formData.value.gpNama) {
    return toast.error("Gudang Produksi tidak boleh kosong.");
  }

  const filled = details.value.filter((d: DetailItem) => d.nama);
  if (filled.length === 0) {
    return toast.error("Detail harus diisi.");
  }
  for (const d of filled) {
    if (!d.jumlah || Number(d.jumlah) === 0) {
      return toast.error("Jumlah harus di isi!");
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
    `/garmen/barang/retur-barang/print/${encodeURIComponent(savedNomor.value)}`,
    "_blank",
  );
  goBack();
};
const skipCetak = () => {
  showPrintDialog.value = false;
  goBack();
};

const numFmt = (val: any) =>
  Number(val || 0).toLocaleString("id-ID", { maximumFractionDigits: 2 });
</script>

<template>
  <BaseForm
    :title="`Form Retur ${formData.jenis}`"
    menuId="61"
    :icon="IconArrowBack"
    :is-loading="isLoading"
    :is-saving="isSaving"
    v-model:showSaveDialog="showSaveDialog"
    v-model:showCancelDialog="showCancelDialog"
    v-model:showCloseDialog="showCloseDialog"
    @validate-save="validateSave"
    @confirm-save="executeSave"
    @confirm-cancel="executeCancel"
    @confirm-close="executeClose"
  >
    <template #left-column>
      <div class="desktop-form-section header-section">
        <div class="tm-sec-title text-primary mb-2">HEADER RETUR</div>

        <v-text-field
          v-model="formData.nomor"
          label="Nomor"
          readonly
          hide-details
          variant="outlined"
          density="compact"
          class="mb-2 bg-grey-lighten-4"
          placeholder="<--Kosong=Baru"
        />

        <v-text-field
          v-model="formData.tanggal"
          label="Tanggal"
          type="date"
          hide-details
          variant="outlined"
          density="compact"
          class="mb-2"
        />

        <div class="f-row mb-2">
          <label class="f-lbl">Cabang</label>
          <input :value="formData.cabang" readonly class="f-inp f-ro w-100" />
        </div>

        <template v-if="showApproveFields">
          <div class="f-row mb-2">
            <label class="f-lbl">Retur Dari</label>
            <div class="inp-grp" style="flex: 1; min-width: 0">
              <input
                v-model="formData.gpNama"
                class="f-inp"
                style="
                  flex: 1;
                  min-width: 0;
                  background: #ddeeff;
                  font-weight: 600;
                "
                placeholder="F1 + Enter untuk cari..."
                @keydown="onGpKeydown"
              />
              <button
                type="button"
                class="btn-lkp"
                title="Cari Gudang Produksi (F1)"
                @click="openGpModal"
              >
                <IconSearch :size="13" color="#1565c0" />
              </button>
            </div>
          </div>

          <div v-if="formData.statusPin5" class="f-row mb-2">
            <label class="f-lbl">Status</label>
            <span
              class="status-badge"
              :style="{
                background: statusLabel[formData.statusPin5]?.color,
              }"
            >
              {{
                statusLabel[formData.statusPin5]?.text || formData.statusPin5
              }}
            </span>
          </div>
        </template>

        <v-textarea
          v-model="formData.keterangan"
          label="Keterangan"
          hide-details
          variant="outlined"
          density="compact"
          rows="2"
          class="mb-2"
        />
      </div>
    </template>

    <template #right-column>
      <v-card border flat class="d-flex flex-column h-100">
        <div
          class="bg-blue-grey-darken-3 text-white px-3 py-2 font-weight-bold text-caption d-flex align-center"
        >
          Detail Barang
          <v-spacer />
          <v-btn
            v-if="canMultiSelectBarang"
            size="x-small"
            variant="outlined"
            color="white"
            @click="openMultiBarangModal"
          >
            + Pilih Banyak
          </v-btn>
        </div>
        <div style="overflow: auto; flex-grow: 1; background: #fff">
          <table class="manksi-table">
            <thead>
              <tr>
                <th width="36">No.</th>
                <th v-if="showApproveFields" width="140">No.Realisasi Minta</th>
                <th width="120">Kode</th>
                <th>Nama Barang</th>
                <th width="60">Satuan</th>
                <th v-if="showApproveFields" width="70" class="tr">Minta</th>
                <th width="80" class="bg-yellow-darken-2 tr">Qty Retur</th>
                <th v-if="showApproveFields" width="70" class="tr">Sudah</th>
                <th width="160" class="bg-yellow-darken-2">Keterangan</th>
                <th v-if="showApproveFields" width="120">SPK</th>
                <th width="36"></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(item, index) in details" :key="index">
                <td class="text-center bg-grey-lighten-4">
                  {{ Number(index) + 1 }}
                </td>

                <td v-if="showApproveFields" class="bg-grey-lighten-4 px-1">
                  <div class="cell-search-grp" :class="{ locked: item.nama }">
                    <input
                      v-model="item.nominta"
                      :ref="(el) => setNomintaRef(el, index)"
                      class="cell-search-input"
                      :readonly="!!item.nama"
                      placeholder="F1 / nomor + Enter"
                      @keydown="onNomintaKeydown($event, index)"
                      @keydown.enter.prevent="onNomintaEnter(index)"
                    />
                    <button
                      v-if="!item.nama"
                      type="button"
                      class="cell-search-btn"
                      tabindex="-1"
                      @click="openRowRealisasiSearch(index)"
                    >
                      <IconSearch :size="11" />
                    </button>
                  </div>
                </td>

                <td class="bg-grey-lighten-4 px-1">
                  <div class="cell-search-grp" :class="{ locked: item.nama }">
                    <input
                      v-model="item.kode"
                      :ref="(el) => setKodeRef(el, index)"
                      class="cell-search-input font-weight-bold text-primary"
                      :readonly="!!item.nama || kodeUsesRealisasi"
                      placeholder="F1 / kode + Enter"
                      @keydown="onKodeKeydown($event, index)"
                      @keydown.enter.prevent="onKodeEnter(index)"
                    />
                    <button
                      v-if="!item.nama"
                      type="button"
                      class="cell-search-btn"
                      tabindex="-1"
                      @click="openRowSearch(index)"
                    >
                      <IconSearch :size="11" />
                    </button>
                  </div>
                </td>

                <td
                  class="bg-grey-lighten-4 px-2 text-truncate"
                  style="max-width: 180px"
                >
                  {{ item.nama }}
                </td>
                <td class="text-center bg-grey-lighten-4">{{ item.satuan }}</td>

                <td v-if="showApproveFields" class="tr bg-grey-lighten-4 px-2">
                  {{ numFmt(item.minta) }}
                </td>

                <td class="bg-yellow-lighten-5">
                  <input
                    type="number"
                    v-model.number="item.jumlah"
                    :ref="(el) => setJumlahRef(el, index)"
                    class="cell-input tr fw-bold"
                    min="0"
                    step="any"
                    @keydown.enter.prevent="onJumlahEnter(index)"
                  />
                </td>

                <td v-if="showApproveFields" class="tr bg-grey-lighten-4 px-2">
                  {{ numFmt(item.sudah) }}
                </td>

                <td class="bg-yellow-lighten-5">
                  <input
                    v-model="item.keterangan"
                    :ref="(el) => setKeteranganRef(el, index)"
                    class="cell-input"
                    placeholder="..."
                    @keydown.enter.prevent="onKeteranganEnter(index)"
                  />
                </td>

                <td v-if="showApproveFields" class="bg-grey-lighten-4 px-2">
                  {{ item.spk }}
                </td>

                <td class="text-center">
                  <button
                    v-if="item.nama"
                    type="button"
                    class="row-del-btn"
                    title="Hapus baris"
                    @click="removeRow(Number(index))"
                  >
                    ✕
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </v-card>
    </template>
  </BaseForm>

  <GudangProduksiSearchModal
    v-model="showGpModal"
    :cabang="authStore.user?.cabang || ''"
    @selected="onGpSelected"
  />
  <RealisasiSearchModal
    v-model="showRealisasiModal"
    :jenis="formData.jenis"
    :current-nomor="formData.nomor"
    :preset-header-nomor="presetRealisasiNomor"
    @selected="onRealisasiSelected"
  />
  <BarangReturSearchModal
    v-model="showBarangModal"
    :jenis="formData.jenis"
    :multi-select="barangMultiMode"
    @selected="onBarangSelected"
    @selected-multiple="onBarangMultiSelected"
  />

  <v-dialog v-model="showPrintDialog" max-width="400px" persistent>
    <v-card class="rounded-lg">
      <v-card-title class="bg-primary text-white pa-3"
        >Simpan Berhasil</v-card-title
      >
      <v-card-text class="pa-4 text-center">
        Retur <b>{{ savedNomor }}</b> tersimpan.<br />Cetak dokumen ini
        sekarang?
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
.h-100 {
  height: 100%;
}
.manksi-table {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
  font-size: 11px;
}
.manksi-table th {
  border-bottom: 2px solid #cfd8dc;
  border-right: 1px solid #e0e0e0;
  padding: 6px 8px;
  text-align: left;
  font-weight: 700;
  color: #37474f;
  white-space: nowrap;
  position: sticky;
  top: 0;
  z-index: 2;
  background: #f5f6f8;
}
.manksi-table td {
  border-bottom: 1px solid #eeeeee;
  border-right: 1px solid #eeeeee;
  padding: 0;
  height: 28px;
  vertical-align: middle;
}
.cell-input {
  width: 100%;
  height: 100%;
  border: none;
  background: transparent;
  padding: 0 8px;
  outline: none;
  font-family: inherit;
  font-size: inherit;
  color: inherit;
}
.cell-input:focus {
  background-color: #fff3e0;
  box-shadow: inset 0 0 0 1px #ff9800;
}
.tr {
  text-align: right !important;
}
.fw-bold {
  font-weight: 600;
  color: #1565c0;
}
.tm-sec-title {
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 6px;
  color: #1565c0;
}
.f-row {
  display: flex;
  align-items: center;
  gap: 5px;
  min-height: 26px;
}
.f-lbl {
  width: 90px;
  flex-shrink: 0;
  font-size: 11px;
  font-weight: 600;
  color: #555;
  white-space: nowrap;
}
.f-inp {
  height: 26px;
  border: 1px solid #bdbdbd;
  border-radius: 3px;
  padding: 0 5px;
  font-size: 12px;
  outline: none;
  background: white;
  color: #212121;
  box-sizing: border-box;
  font-family: inherit;
}
.f-ro {
  background: #f0f0f0 !important;
  color: #555 !important;
}
.inp-grp {
  display: flex;
  border: 1px solid #bdbdbd;
  border-radius: 4px;
  overflow: hidden;
  height: 28px;
  background: white;
  min-width: 0;
  width: 100%;
  box-sizing: border-box;
}
.inp-grp .f-inp {
  border: none;
  border-radius: 0;
  flex: 1;
  min-width: 0;
  height: 100%;
  padding: 0 6px;
}
.btn-lkp {
  width: 30px;
  min-width: 30px;
  height: 100%;
  background: #e3f2fd;
  border: none;
  border-left: 1px solid #bdbdbd;
  cursor: pointer;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #1565c0;
}
.btn-lkp:hover:not(:disabled) {
  background: #bbdefb;
}
.w-100 {
  width: 100%;
}
.status-badge {
  color: white;
  font-size: 10px;
  font-weight: 700;
  padding: 3px 10px;
  border-radius: 10px;
}
.cell-search-grp {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 2px;
  height: 100%;
  padding: 0 4px;
}
.cell-search-input {
  border: none;
  background: transparent;
  outline: none;
  font-size: 11px;
  width: 100%;
  min-width: 0;
  padding: 0;
  cursor: pointer;
  font-family: inherit;
  color: inherit;
}
.cell-search-input:focus {
  background-color: #fff3e0;
  box-shadow: inset 0 0 0 1px #ff9800;
  cursor: text;
}
.cell-search-grp.locked .cell-search-input {
  cursor: default;
  color: #757575;
}
.cell-search-btn {
  background: #e3f2fd;
  border: none;
  border-radius: 3px;
  width: 18px;
  height: 18px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: #1565c0;
}
.cell-search-btn:hover {
  background: #bbdefb;
}
.row-del-btn {
  background: transparent;
  border: none;
  color: #c62828;
  cursor: pointer;
  font-size: 12px;
  opacity: 0.6;
}
.row-del-btn:hover {
  opacity: 1;
}

@media (max-width: 400px) {
  .f-row {
    flex-wrap: wrap;
    gap: 2px;
  }
  .f-lbl {
    width: 100%;
    min-width: unset;
  }
  .inp-grp,
  .f-inp,
  .w-100 {
    width: 100% !important;
  }
}
</style>
