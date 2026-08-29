<script setup lang="ts">
import { ref, computed, onMounted, nextTick, watch } from "vue";
import type { ComponentPublicInstance } from "vue";
import { useRoute } from "vue-router";
import { useToast } from "vue-toastification";
import { useForm } from "@/composables/useForm";
import { useAuthStore } from "@/stores/authStore";
import BaseForm from "@/components/BaseForm.vue";
import { realisasiBarangFormService } from "@/services/garmen/realisasiBarangFormService";
// Import Tabler Icon
import { IconListCheck, IconSearch, IconTrash } from "@tabler/icons-vue";

// Modal Pencarian
import PermintaanBarangSearchModal from "@/components/lookups/PermintaanBarangSearchModal.vue";
import BarangGarmenSearchModal from "@/components/lookups/BarangGarmenSearchModal.vue";

interface DetailItem {
  kode: string;
  nama: string;
  satuan: string;
  stk: number;
  minta: number;
  sudah: number;
  kurang: number;
  jumlah: number;
  ket: string;
}

const route = useRoute();
const toast = useToast();
const authStore = useAuthStore();
const isEdit = computed(() => !!route.params.nomor);
const nomorParam = computed(() => route.params.nomor as string);
const formTitle = computed(() =>
  isEdit.value
    ? `Ubah Realisasi Permintaan ${formData.value.jenis || "Barang"}`
    : `Realisasi Permintaan ${formData.value.jenis || "Barang"}`,
);
const jenisSlugReverseMap: Record<string, string> = {
  ACCESORIES: "ACCESORIES",
  OBAT: "OBAT",
  SPAREPART: "SPAREPART",
  "ATK-RTK": "ATK/RTK",
};
const jenisFromParam = computed(() => {
  const raw = route.params.jenis as string;
  if (!raw) return "";
  return jenisSlugReverseMap[raw] || raw;
});
const showMintaModal = ref(false);
const showBarangModal = ref(false);
const activeRowIndex = ref(0);
const showPrintDialog = ref(false);
const savedNomor = ref("");
// ─────────────────────────────────────────────
// FOKUS ANTAR FIELD DI GRID (Kode -> Jumlah -> Keterangan -> Kode baris berikutnya)
// ─────────────────────────────────────────────
const detailFieldRefs = ref<Record<string, HTMLInputElement>>({});
const setDetailFieldRef = (el: any, index: number, col: string) => {
  if (el) detailFieldRefs.value[`${index}_${col}`] = el as HTMLInputElement;
};
const focusDetailField = async (index: number, col: string) => {
  await nextTick();
  const el = detailFieldRefs.value[`${index}_${col}`];
  if (el) {
    el.focus();
    if (el instanceof HTMLInputElement) el.select();
  }
};

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
  jenis: sessionStorage.getItem("last_jenis_realisasi") || "ACCESORIES",
  noMinta: "",
  cabMinta: "",
  keterangan: "",
  bagian: authStore.user?.bagian,
  cabang: authStore.userCabang === "ALL" ? "" : authStore.userCabang,
  spk: "",
  namaSpk: "",
  jumlahSpk: 0,
  mka: "",
  mkaTanggal: "",
  peminta: "",
  approve: "",
  details: [] as DetailItem[],
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
  menuId: "62",
  initialData,
  fetchApi: async () => {
    const res = await realisasiBarangFormService.getDetail(nomorParam.value);
    const { header, reqHeader, details } = res.data.data;

    return {
      nomor: header.re_nomor,
      tanggal: formatDateLocal(header.re_tanggal),
      jenis: header.re_jenis,
      cabang: header.re_cab,
      noMinta: header.re_minta,
      cabMinta: reqHeader.min_cab,
      keterangan: header.re_keterangan,
      bagian: header.re_bagian,
      spk: header.re_spk_nomor,
      namaSpk: header.spknama,
      jumlahSpk: header.spkjml || 0,
      mka: header.re_mka,
      mkaTanggal: formatDateLocal(header.mkb_tanggal),
      peminta: header.peminta,
      approve: header.apv,
      details: details,
    };
  },
  submitApi: async (payload) => {
    return await realisasiBarangFormService.saveData(payload);
  },
  onSuccess: (res: any) => {
    savedNomor.value = res.data?.data?.nomor || formData.value.nomor;
    showPrintDialog.value = true;
  },
});

onMounted(() => {
  if (!isEdit.value) {
    const bag = (authStore.user?.bagian || "").toUpperCase();
    if (jenisFromParam.value) {
      formData.value.jenis = jenisFromParam.value;
    } else if (bag === "GA") {
      formData.value.jenis = "ATK/RTK";
    } else if (bag === "TEKNISI" || bag === "IT") {
      formData.value.jenis = "SPAREPART";
      formData.value.bagian = bag;
    }
  }
});

const isAccesories = computed(() => formData.value.jenis === "ACCESORIES");
const isSparepart = computed(() => formData.value.jenis === "SPAREPART");

// --- HANDLER PENCARIAN PERMINTAAN ---
const openMintaModal = () => {
  if (isEdit.value) return;
  showMintaModal.value = true;
};

const onMintaSelected = async (item: any) => {
  try {
    const res = await realisasiBarangFormService.getPermintaanDetail(
      item.Nomor,
    );
    const { header, details } = res.data.data;

    if (!applyPermintaanDetail(header, details)) return;

    toast.success("Detail rincian barang berhasil ditarik.");
  } catch (error: any) {
    toast.error(
      error.response?.data?.message || "Gagal menarik detail permintaan.",
    );
  }
};

// ─────────────────────────────────────────────
// KEYBOARD HANDLERS: NO. PERMINTAAN
// ─────────────────────────────────────────────

const onMintaKeydown = (e: KeyboardEvent) => {
  if (e.key === "F1") {
    e.preventDefault();
    openMintaModal();
  }
};

// ─── Validasi jenis permintaan harus sama dengan jenis form ──────────────
const applyPermintaanDetail = (header: any, details: any[]): boolean => {
  if (header.min_jenis && header.min_jenis !== formData.value.jenis) {
    toast.error(
      `Nomor tsb adalah permintaan ${header.min_jenis}, bukan ${formData.value.jenis}.`,
    );
    return false;
  }

  formData.value.noMinta = header.min_nomor;
  formData.value.cabMinta = header.min_cab;
  formData.value.peminta = header.user_create;
  formData.value.spk = header.min_spk_nomor;
  formData.value.namaSpk = header.namaspk;
  formData.value.jumlahSpk = header.jumlahspk || 0;
  formData.value.mka = header.mkb_nomor;
  formData.value.mkaTanggal = formatDateLocal(header.mkb_tanggal);
  formData.value.details = details;
  return true;
};

const onMintaEnter = async () => {
  const nomor = (formData.value.noMinta || "").trim().toUpperCase();
  if (!nomor || isEdit.value) return;

  try {
    isLoading.value = true;
    const res = await realisasiBarangFormService.getPermintaanDetail(nomor);
    const { header, details } = res.data.data;

    if (!applyPermintaanDetail(header, details)) {
      formData.value.noMinta = "";
      return;
    }

    toast.success("Detail rincian barang berhasil ditarik.");
  } catch (error: any) {
    toast.error(
      error.response?.data?.message || "No. Permintaan tidak ditemukan.",
    );
    formData.value.noMinta = "";
  } finally {
    isLoading.value = false;
  }
};

// ─── Auto-fill No. Permintaan dari query (klik baris "Belum Direalisasi" merah di browse, lalu klik Baru) ──
watch(
  () => route.query.minta,
  (val) => {
    if (isEdit.value) return;
    const nomor = ((val as string) || "").trim().toUpperCase();
    if (!nomor) return;
    formData.value.noMinta = nomor;
    onMintaEnter();
  },
  { immediate: true },
);

// Simpan referensi elemen input "Jumlah" per baris untuk navigasi Enter
const jumlahInputs = ref<(HTMLInputElement | null)[]>([]);

const setJumlahRef = (
  el: Element | ComponentPublicInstance | null,
  index: number | string,
) => {
  jumlahInputs.value[Number(index)] = el as HTMLInputElement | null;
};

const onJumlahEnter = (index: number | string) => {
  const i = Number(index);
  const next = jumlahInputs.value[i + 1];
  if (next) {
    next.focus();
    next.select();
  } else {
    jumlahInputs.value[i]?.blur();
  }
};

// --- VALIDASI SIMPAN ---
const validateSave = () => {
  if (!canSave.value)
    return toast.error("Anda tidak memiliki hak akses simpan.");

  if (formData.value.approve && formData.value.approve !== "") {
    return toast.error("Realisasi tsb sudah di approve.\nTidak bisa disimpan.");
  }

  if (!formData.value.noMinta && !isSparepart.value) {
    return toast.warning("Nomor Permintaan belum dipilih.");
  }

  const totalQty = formData.value.details.reduce(
    (sum: number, d: DetailItem) => sum + (Number(d.jumlah) || 0),
    0,
  );

  if (totalQty <= 0) {
    return toast.error("Jumlah realisasi masih kosong semua!");
  }

  showSaveDialog.value = true;
};

const doCetak = () => {
  showPrintDialog.value = false;
  window.open(
    `/garmen/barang/realisasi/print/${encodeURIComponent(savedNomor.value)}`,
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

// -- FUNGSI MANIPULASI GRID --
const addRow = () => {
  formData.value.details.push({
    kode: "",
    nama: "",
    satuan: "",
    stk: 0,
    minta: 0,
    sudah: 0,
    kurang: 0,
    jumlah: 0,
    ket: "",
  });
};

const removeRow = (index: number) => {
  formData.value.details.splice(index, 1);
  if (formData.value.details.length === 0) addRow();
};

const openBarangModal = (index: number) => {
  activeRowIndex.value = index;
  showBarangModal.value = true;
};

// Menangkap item barang yang dipilih
const onBarangSelected = (item: any) => {
  const i = activeRowIndex.value;
  const isDuplicate = formData.value.details.some(
    (d: any, idx: number) => idx !== i && d.kode === item.Kode,
  );
  if (isDuplicate) {
    return toast.error(`Kode ${item.Kode} sudah diinput di baris lain.`);
  }
  formData.value.details[i].kode = item.Kode;
  formData.value.details[i].nama = item.Nama;
  formData.value.details[i].satuan = item.Satuan;
  // [BARU] Sama seperti onBarangEnter — pindah fokus ke Jumlah
  focusDetailField(i, "jumlah");
};
</script>

<template>
  <BaseForm
    :title="formTitle"
    menuId="62"
    :icon="IconListCheck"
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
        <div class="tm-sec-title text-primary mb-2">HEADER REALISASI</div>

        <v-text-field
          v-model="formData.nomor"
          label="No. Realisasi"
          readonly
          hide-details
          variant="outlined"
          density="compact"
          class="mb-2 bg-grey-lighten-4"
          placeholder="<--Kosong=Baru"
        />

        <v-text-field
          v-model="formData.tanggal"
          label="Tgl. Realisasi"
          type="date"
          hide-details
          variant="outlined"
          density="compact"
          class="mb-2"
        />

        <div class="f-row mb-2">
          <label class="f-lbl">No. Permintaan</label>
          <div class="inp-grp" style="flex: 1; min-width: 0">
            <input
              v-model="formData.noMinta"
              class="f-inp"
              style="
                flex: 1;
                min-width: 0;
                background: #ddeeff;
                font-weight: 600;
                text-transform: uppercase;
              "
              placeholder="F1 / nomor + Enter"
              :readonly="isEdit"
              :class="{ 'f-ro': isEdit }"
              @keydown="onMintaKeydown"
              @keydown.enter.prevent="onMintaEnter"
            />
            <button
              type="button"
              class="btn-lkp"
              :disabled="isEdit"
              title="Cari Permintaan (F1)"
              @click="openMintaModal"
            >
              <IconSearch :size="13" color="#1565c0" />
            </button>
          </div>
        </div>

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

      <div class="desktop-form-section">
        <div class="tm-sec-title">INFO PERMINTAAN & SPK</div>

        <div class="f-row mb-1">
          <label class="f-lbl">Peminta</label>
          <input :value="formData.peminta" readonly class="f-inp f-ro w-100" />
        </div>

        <div class="f-row mb-3">
          <label class="f-lbl">Approve</label>
          <input :value="formData.approve" readonly class="f-inp f-ro w-100" />
        </div>

        <template v-if="isAccesories">
          <div class="f-row mb-1">
            <label class="f-lbl">SPK</label>
            <input :value="formData.spk" readonly class="f-inp f-ro w-100" />
          </div>
          <div class="f-row mb-1">
            <label class="f-lbl"></label>
            <input
              :value="formData.namaSpk"
              readonly
              class="f-inp f-ro w-100"
            />
          </div>
          <div class="f-row mb-1">
            <label class="f-lbl">Jml SPK</label>
            <input
              :value="numFmt(formData.jumlahSpk)"
              readonly
              class="f-inp f-ro tr"
              style="width: 80px"
            />
          </div>

          <v-divider class="my-2" />

          <div class="f-row mb-1">
            <label class="f-lbl">MKA</label>
            <input :value="formData.mka" readonly class="f-inp f-ro w-100" />
          </div>
          <div class="f-row mb-1">
            <label class="f-lbl">Tgl. MKA</label>
            <input
              :value="formData.mkaTanggal"
              type="date"
              readonly
              class="f-date f-ro"
              style="width: 120px"
            />
          </div>
        </template>
      </div>
    </template>

    <template #right-column>
      <v-card border flat class="d-flex flex-column h-100">
        <div
          class="bg-blue-grey-darken-3 text-white px-3 py-2 font-weight-bold text-caption d-flex align-center justify-space-between"
        >
          <div class="d-flex align-center">
            <IconListDetails :size="14" :stroke-width="1.7" class="mr-2" />
            Detail Barang
          </div>
          <v-btn
            v-if="isSparepart"
            size="x-small"
            color="success"
            variant="flat"
            @click="addRow"
          >
            <template #prepend
              ><IconPlus :size="13" :stroke-width="2"
            /></template>
            Tambah Baris
          </v-btn>
        </div>
        <div style="overflow: auto; flex-grow: 1; background: #fff">
          <table class="manksi-table">
            <thead>
              <tr>
                <th width="40">No.</th>
                <th width="120">Kode</th>
                <th>Nama Barang</th>
                <th width="60">Satuan</th>
                <th width="70" class="tr">Stok</th>
                <th width="70" class="bg-green-darken-2 tr">Minta</th>
                <th width="70" class="tr">Sudah</th>
                <th width="70" class="tr">Kurang</th>
                <th width="80" class="bg-yellow-darken-2 tr">Jumlah</th>
                <th width="160" class="bg-yellow-darken-2">Keterangan</th>
                <th width="40" class="text-center">Aksi</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(item, index) in formData.details" :key="index">
                <td class="text-center bg-grey-lighten-4">
                  {{ Number(index) + 1 }}
                </td>
                <td
                  class="bg-grey-lighten-4 px-2 text-truncate"
                  style="max-width: 80px"
                >
                  <div
                    class="field-row-2col"
                    style="
                      display: grid;
                      grid-template-columns: 3fr 1fr;
                      gap: 1rem;
                    "
                  >
                    <div class="field-row">
                      {{ item.kode }}
                    </div>
                    <div class="field-row">
                      <button
                        v-if="isSparepart"
                        :disabled="!!formData.noMinta"
                        type="button"
                        class="cell-search-btn"
                        @click="openBarangModal(Number(index))"
                        title="Cari Barang"
                      >
                        <IconSearch :size="12" color="#1565c0" />
                      </button>
                    </div>
                  </div>
                </td>
                <td
                  class="bg-grey-lighten-4 px-2 text-truncate"
                  style="max-width: 180px"
                >
                  {{ item.nama }}
                </td>
                <td class="text-center bg-grey-lighten-4">{{ item.satuan }}</td>

                <td class="tr bg-grey-lighten-4 px-2">
                  {{ numFmt(item.stk) }}
                </td>
                <td
                  class="tr bg-green-lighten-5 px-2 font-weight-bold text-green-darken-4"
                >
                  {{ numFmt(item.minta) }}
                </td>
                <td class="tr bg-grey-lighten-4 px-2">
                  {{ numFmt(item.sudah) }}
                </td>
                <td
                  class="tr bg-red-lighten-5 px-2 font-weight-bold text-red-darken-2"
                >
                  {{ numFmt(item.kurang) }}
                </td>

                <td class="bg-yellow-lighten-5">
                  <input
                    type="number"
                    v-model.number="item.jumlah"
                    class="cell-input tr fw-bold"
                    min="0"
                    step="any"
                    v-select-on-focus
                    :ref="(el) => setJumlahRef(el, index)"
                    @keydown.enter.prevent="onJumlahEnter(index)"
                  />
                </td>
                <td class="bg-yellow-lighten-5">
                  <input
                    v-model="item.ket"
                    class="cell-input"
                    placeholder="..."
                  />
                </td>
                <td class="text-center">
                  <v-btn
                    v-if="isSparepart"
                    :disabled="!!formData.noMinta"
                    size="x-small"
                    variant="text"
                    color="error"
                    @click="removeRow(Number(index))"
                  >
                    <IconTrash :size="14" :stroke-width="1.7" />
                  </v-btn>
                </td>
              </tr>
              <tr v-if="formData.details.length === 0">
                <td colspan="10" class="text-center py-4 text-grey">
                  Pilih No. Permintaan terlebih dahulu...
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </v-card>
    </template>
  </BaseForm>

  <!-- Modal Lookup Permintaan -->
  <PermintaanBarangSearchModal
    v-model="showMintaModal"
    :jenis="formData.jenis"
    @selected="onMintaSelected"
  />

  <BarangGarmenSearchModal
    v-model="showBarangModal"
    :jenis="formData.jenis"
    :cabang="formData.cabang"
    @selected="onBarangSelected"
  />

  <v-dialog v-model="showPrintDialog" max-width="400px" persistent>
    <v-card class="rounded-lg">
      <v-card-title class="bg-primary text-white pa-3">
        Simpan Berhasil
      </v-card-title>
      <v-card-text class="pa-4 text-center">
        Realisasi <b>{{ savedNomor }}</b> tersimpan.<br />Cetak dokumen ini
        sekarang?
      </v-card-text>
      <v-card-actions class="pa-3 border-t bg-grey-lighten-4">
        <v-btn variant="text" color="error" @click="skipCetak"> Tidak </v-btn>
        <v-spacer />
        <v-btn color="primary" variant="elevated" @click="doCetak">
          Ya, Cetak
        </v-btn>
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
.tc {
  text-align: center !important;
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
.f-date {
  height: 26px;
  border: 1px solid #bdbdbd;
  border-radius: 3px;
  padding: 0 4px;
  font-size: 12px;
  outline: none;
  background: white;
  box-sizing: border-box;
}
.inp-grp {
  display: flex;
  border: 1px solid #bdbdbd;
  border-radius: 4px;
  overflow: hidden;
  height: 28px;
  background: white;
  min-width: 0; /* ← kunci agar flex child tidak overflow */
  width: 100%;
  box-sizing: border-box;
}
.inp-grp .f-inp {
  border: none;
  border-radius: 0;
  flex: 1;
  min-width: 0; /* ← izinkan shrink */
  height: 100%;
  padding: 0 6px;
}
.btn-lkp {
  width: 30px;
  min-width: 30px; /* ← tidak boleh lebih kecil dari ini */
  height: 100%;
  background: #e3f2fd;
  border: none;
  border-left: 1px solid #bdbdbd;
  cursor: pointer;
  flex-shrink: 0; /* ← tidak boleh menyusut */
  display: flex;
  align-items: center;
  justify-content: center;
  color: #1565c0;
}
.btn-lkp:hover:not(:disabled) {
  background: #bbdefb;
}
.btn-lkp:disabled {
  opacity: 0.45;
  cursor: not-allowed;
  background: #f5f5f5;
}
.w-100 {
  width: 100%;
}

/* ── Field row responsif ── */
.f-row {
  display: flex;
  align-items: center;
  gap: 6px;
  min-height: 28px;
  flex-wrap: nowrap; /* default satu baris */
}

/* Label lebar fixed tapi tidak shrink */
.f-lbl {
  width: 90px;
  min-width: 70px; /* ← boleh sedikit menyusut di layar kecil */
  flex-shrink: 0;
  font-size: 11px;
  font-weight: 600;
  color: #555;
  white-space: nowrap;
}

/* Layar < 400px: label di atas, input di bawah */
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
