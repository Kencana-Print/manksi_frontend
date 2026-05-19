<script setup lang="ts">
import { computed, ref } from "vue";
import { useRoute } from "vue-router";
import { useToast } from "vue-toastification";
import { useForm } from "@/composables/useForm";
import BaseForm from "@/components/BaseForm.vue";
import { realisasiBarangFormService } from "@/services/garmen/realisasiBarangFormService";
// Import Tabler Icon
import { IconListCheck, IconSearch } from "@tabler/icons-vue";

// Modal Pencarian Permintaan
import PermintaanBarangSearchModal from "@/components/lookups/PermintaanBarangSearchModal.vue";

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

const isEdit = computed(() => !!route.params.nomor);
const nomorParam = computed(() => route.params.nomor as string);

const showMintaModal = ref(false);

const showPrintDialog = ref(false);
const savedNomor = ref("");

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
      noMinta: header.re_minta,
      cabMinta: reqHeader.min_cab,
      keterangan: header.re_keterangan,
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

const isAccesories = computed(() => formData.value.jenis === "ACCESORIES");

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

    formData.value.noMinta = header.min_nomor;
    formData.value.cabMinta = header.min_cab;
    formData.value.peminta = header.user_create;
    formData.value.spk = header.min_spk_nomor;
    formData.value.namaSpk = header.namaspk;
    formData.value.jumlahSpk = header.jumlahspk || 0;
    formData.value.mka = header.mkb_nomor;
    formData.value.mkaTanggal = formatDateLocal(header.mkb_tanggal);

    formData.value.details = details;
    toast.success("Detail rincian barang berhasil ditarik.");
  } catch (error: any) {
    toast.error(
      error.response?.data?.message || "Gagal menarik detail permintaan.",
    );
  }
};

// --- VALIDASI SIMPAN ---
const validateSave = () => {
  if (!canSave.value)
    return toast.error("Anda tidak memiliki hak akses simpan.");

  if (formData.value.approve && formData.value.approve !== "") {
    return toast.error("Realisasi tsb sudah di approve.\nTidak bisa disimpan.");
  }

  if (!formData.value.noMinta) {
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
};

const numFmt = (val: any) =>
  Number(val || 0).toLocaleString("id-ID", { maximumFractionDigits: 2 });
</script>

<template>
  <BaseForm
    :title="`Form Realisasi Permintaan ${formData.jenis}`"
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
          <div class="inp-grp" style="flex: 1">
            <input
              :value="formData.noMinta"
              readonly
              class="f-inp"
              style="
                flex: 1;
                background: #ddeeff;
                cursor: pointer;
                font-weight: 600;
              "
              @mousedown.prevent="openMintaModal"
            />
            <button
              type="button"
              class="btn-lkp"
              @mousedown.prevent="openMintaModal"
              :disabled="isEdit"
            >
              <IconSearch :size="14" :stroke-width="1.7" />
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
          class="bg-blue-grey-darken-3 text-white px-3 py-2 font-weight-bold text-caption d-flex align-center"
        >
          Detail Barang
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
              </tr>
            </thead>
            <tbody>
              <tr v-for="(item, index) in formData.details" :key="index">
                <td class="text-center bg-grey-lighten-4">
                  {{ Number(index) + 1 }}
                </td>
                <td
                  class="bg-grey-lighten-4 font-weight-bold text-primary px-2"
                >
                  {{ item.kode }}
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
                  />
                </td>
                <td class="bg-yellow-lighten-5">
                  <input
                    v-model="item.ket"
                    class="cell-input"
                    placeholder="..."
                  />
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
        <v-btn variant="text" color="error" @click="showPrintDialog = false">
          Tidak
        </v-btn>
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
  border-radius: 3px;
  overflow: hidden;
  height: 26px;
  background: white;
}
.inp-grp .f-inp {
  border: none;
  height: 24px;
  border-radius: 0;
}
.btn-lkp {
  width: 26px;
  background: #f5f5f5;
  border: none;
  border-left: 1px solid #bdbdbd;
  cursor: pointer;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #424242;
}
.btn-lkp:hover:not(:disabled) {
  background: #e0e0e0;
}
.btn-lkp:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.w-100 {
  width: 100%;
}
</style>
