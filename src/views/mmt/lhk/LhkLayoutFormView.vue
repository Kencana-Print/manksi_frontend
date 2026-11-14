<template>
  <BaseForm
    :title="formTitle"
    menu-id="5515"
    :icon="IconVectorTriangle"
    :is-loading="isLoading"
    :is-saving="isSaving"
    v-model:showSaveDialog="showSaveDialog"
    v-model:showCancelDialog="showCancelDialog"
    v-model:showCloseDialog="showCloseDialog"
    @validate-save="validateBeforeSave"
    @confirm-save="executeSave"
    @confirm-cancel="executeCancel"
    @confirm-close="executeClose"
  >
    <template #left-column>
      <div class="desktop-form-section header-section">
        <div class="text-caption font-weight-bold mb-3 text-primary">
          HEADER SPK SETTING
        </div>

        <v-text-field
          v-model="formData.ld_spk"
          label="No. SPK / MAP"
          density="compact"
          variant="outlined"
          hide-details
          class="mb-2 font-weight-bold"
          :disabled="isEditMode"
          @keydown="handleKeyDownSpk"
          @keydown.enter="onSpkBlur"
        >
          <template #append-inner>
            <div class="d-flex align-center ga-1">
              <v-tooltip
                text="Cari dari Master SPK (MMT/Sticker)"
                location="top"
              >
                <template #activator="{ props }">
                  <v-btn
                    v-bind="props"
                    icon
                    size="x-small"
                    variant="text"
                    color="primary"
                    @click="openSpkLookup"
                  >
                    <IconSearch :size="16" />
                  </v-btn>
                </template>
              </v-tooltip>
            </div>
          </template>
        </v-text-field>

        <v-text-field
          v-model="formData.ld_spk"
          label="No. LHK Pola"
          density="compact"
          variant="outlined"
          hide-details
          class="mb-2 font-weight-bold"
          :disabled="isEditMode"
          @keydown="handleKeyDownSpk"
          @keydown.enter="onSpkBlur"
        >
          <template #append-inner>
            <div class="d-flex align-center ga-1">
              <v-tooltip
                text="Ambil dari LHK Pola (Jersey/Garment)"
                location="top"
              >
                <template #activator="{ props }">
                  <v-btn
                    v-bind="props"
                    icon
                    size="x-small"
                    variant="text"
                    color="purple"
                    @click="openPolaLookup"
                  >
                    <IconShirt :size="16" />
                  </v-btn>
                </template>
              </v-tooltip>
            </div>
          </template>
        </v-text-field>
        <v-text-field
          v-model="formData.ld_tanggal"
          type="date"
          label="Tanggal Kerja LHK"
          density="compact"
          variant="outlined"
          hide-details
          class="mb-2"
        />
        <v-text-field
          v-model="formData.spk_nama"
          label="Nama SPK"
          readonly
          density="compact"
          variant="outlined"
          hide-details
          class="mb-2 bg-grey-lighten-4"
        />
        <v-text-field
          v-model="formData.spk_tanggal"
          label="Tanggal SPK"
          readonly
          density="compact"
          variant="outlined"
          hide-details
          class="mb-2 bg-grey-lighten-4"
        />
        <v-text-field
          v-model="formData.spk_dateline"
          label="Dateline Produksi"
          readonly
          density="compact"
          variant="outlined"
          hide-details
          class="mb-2 bg-grey-lighten-4 text-error font-weight-bold"
        />

        <v-row dense class="mb-1" v-if="currentSourceType === 'SPK'">
          <v-col cols="6">
            <v-text-field
              v-model="formData.spk_panjang"
              label="P. SPK Master"
              suffix="m"
              readonly
              density="compact"
              variant="outlined"
              hide-details
              class="bg-grey-lighten-4 text-end"
            />
          </v-col>
          <v-col cols="6">
            <v-text-field
              v-model="formData.spk_lebar"
              label="L. SPK Master"
              suffix="m"
              readonly
              density="compact"
              variant="outlined"
              hide-details
              class="bg-grey-lighten-4 text-end"
            />
          </v-col>
        </v-row>

        <v-text-field
          v-model="formData.spk_finishing"
          label="Finishing Dasar SPK"
          readonly
          density="compact"
          variant="outlined"
          hide-details
          class="mb-2 bg-grey-lighten-4"
        />
      </div>
    </template>

    <template #right-column>
      <v-card border flat class="d-flex flex-column fill-height">
        <div class="table-container flex-grow-1">
          <table class="manksi-table">
            <thead>
              <tr>
                <th width="40">No</th>
                <th width="120">Output</th>
                <th width="85">Gambar SS</th>
                <th width="250">Path Lokasi File Mentah Server</th>
                <th width="100">QTY (Pcs)</th>
                <th>Keterangan</th>
                <th width="40"></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(item, index) in formData.details" :key="index">
                <td class="text-center bg-grey-lighten-4">{{ index + 1 }}</td>
                <td class="pa-0">
                  <select
                    v-model="item.ldk_output"
                    class="cell-input text-center"
                  >
                    <option
                      v-for="opt in outputOptions"
                      :key="opt"
                      :value="opt"
                    >
                      {{ opt }}
                    </option>
                  </select>
                </td>

                <td class="text-center pa-0">
                  <div
                    class="d-flex align-center justify-center fill-height ga-1"
                  >
                    <v-avatar
                      v-if="item.preview_url"
                      size="22"
                      rounded="sm"
                      class="border elevation-1 cursor-pointer"
                      @click="triggerImagePreview(item.preview_url)"
                    >
                      <v-img :src="item.preview_url" cover />
                    </v-avatar>

                    <v-tooltip text="Upload Gambar Kerja" location="top">
                      <template #activator="{ props }">
                        <v-btn
                          v-bind="props"
                          size="x-small"
                          variant="text"
                          :color="item.preview_url ? 'success' : 'grey'"
                          @click="triggerFileInput(index)"
                        >
                          <IconUpload :size="14" :stroke-width="2" />
                        </v-btn>
                      </template>
                    </v-tooltip>

                    <v-tooltip
                      v-if="item.preview_url"
                      text="Buka Pratinjau Gambar"
                      location="top"
                    >
                      <template #activator="{ props }">
                        <v-btn
                          v-bind="props"
                          size="x-small"
                          variant="text"
                          color="indigo-darken-1"
                          @click="triggerImagePreview(item.preview_url)"
                        >
                          <IconEye :size="14" :stroke-width="2" />
                        </v-btn>
                      </template>
                    </v-tooltip>
                    <input
                      type="file"
                      :id="'file-ds-' + index"
                      accept="image/*"
                      style="display: none"
                      @change="handleFileChange($event, index)"
                    />
                  </div>
                </td>

                <td class="pa-0">
                  <div class="d-flex align-center fill-height px-1">
                    <input
                      v-model="item.lokasi_file"
                      class="cell-input font-mono flex-grow-1"
                      placeholder="\\SERVER-DESAIN\SUBLIM\..."
                    />
                    <v-btn
                      size="x-small"
                      variant="text"
                      color="grey-darken-1"
                      :disabled="!item.lokasi_file"
                      @click="copyToClipboard(item.lokasi_file)"
                    >
                      <IconCopy :size="12" />
                    </v-btn>
                  </div>
                </td>

                <td>
                  <input
                    type="number"
                    v-model.number="item.ldk_jumlah"
                    class="cell-input text-end font-weight-bold"
                    placeholder="0"
                  />
                </td>

                <td>
                  <input
                    v-model="item.ldk_finishing"
                    class="cell-input"
                    placeholder="Catatan instruksi pengerjaan setting..."
                  />
                </td>

                <td class="text-center">
                  <v-btn
                    size="x-small"
                    variant="text"
                    color="error"
                    @click="formData.details.splice(index, 1)"
                  >
                    <IconTrash :size="14" />
                  </v-btn>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <v-divider />
        <div class="pa-2 d-flex bg-grey-lighten-4 align-center">
          <v-btn
            size="x-small"
            color="primary"
            variant="flat"
            @click="formData.details.push(createEmptyRow())"
          >
            <template #prepend
              ><IconPlus :size="14" :stroke-width="2"
            /></template>
            Tambah Baris Detail
          </v-btn>
          <v-spacer />
          <div class="text-subtitle-2 font-weight-bold text-indigo px-3">
            Total Qty Seting:
            {{
              formData.details.reduce(
                (sum, b) => sum + (Number(b.ldk_jumlah) || 0),
                0,
              )
            }}
            Pcs
          </div>
        </div>
      </v-card>
    </template>
  </BaseForm>

  <SpkSearchModal
    :isVisible="showSpkModal"
    @close="showSpkModal = false"
    @select="handleSpkSelect"
  />
  <LhkPolaLookupModal
    :isVisible="lookup.pola"
    @close="lookup.pola = false"
    @select="handlePolaSelect"
  />

  <v-dialog v-model="previewDialog.show" max-width="700px">
    <v-card class="rounded-lg">
      <v-card-title
        class="bg-grey-lighten-4 text-subtitle-2 d-flex align-center pa-2"
      >
        Pratinjau Hasil Kerja Setting Desain
        <v-spacer />
        <v-btn
          icon="mdi-close"
          size="x-small"
          variant="text"
          @click="previewDialog.show = false"
        />
      </v-card-title>
      <v-img
        :src="previewDialog.url"
        max-height="75vh"
        contain
        class="bg-black"
      />
    </v-card>
  </v-dialog>

  <v-dialog v-model="showPrintConfirm" max-width="400px" persistent>
    <v-card class="rounded-lg">
      <v-card-title
        class="bg-primary text-white text-subtitle-1 font-weight-bold pa-3"
        >Simpan Berhasil</v-card-title
      >
      <v-card-text class="pa-4 text-center mt-2">
        <IconCircleCheck :size="48" color="green" class="mb-3" />
        <div class="text-body-1 font-weight-medium">
          Laporan Kerja Setting Desain berhasil disimpan!
        </div>
      </v-card-text>
      <v-card-actions class="bg-grey-lighten-4 pa-3">
        <v-btn
          color="grey-darken-2"
          variant="outlined"
          @click="
            showPrintConfirm = false;
            router.push('/mmt/lhk-layout');
          "
          >Tutup</v-btn
        >
        <v-spacer></v-spacer>
        <v-btn
          color="primary"
          variant="elevated"
          @click="
            showPrintConfirm = false;
            window.open(`/mmt/lhk-layout/print/${savedNomor}`, '_blank');
            router.push('/mmt/lhk-layout');
          "
        >
          <template #prepend><IconPrinter :size="15" /></template> Ya, Cetak
          Bukti
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import { format } from "date-fns";
import api from "@/services/api";
import { useToast } from "vue-toastification";
import BaseForm from "@/components/BaseForm.vue";
import { useForm } from "@/composables/useForm";
import SpkSearchModal from "@/modal/SpkLookupModal.vue";
import LhkPolaLookupModal from "@/modal/LhkPolaLookupModal.vue";
import {
  IconVectorTriangle,
  IconSearch,
  IconTrash,
  IconPlus,
  IconCircleCheck,
  IconPrinter,
  IconCopy,
  IconPhoto,
  IconUpload,
  IconEye,
  IconShirt,
} from "@tabler/icons-vue";

interface DetailItem {
  ldk_output: string;
  ldk_kode: string;
  brg_nama: string;
  ldk_finishing: string;
  ldk_panjang: number;
  ldk_lebar: number;
  ldk_jumlah: number;
  ldk_skala: string;
  ldk_mode_warna: string;
  ldk_luas_m2: number;
  ldk_sticth: number;
  ldk_pakai: number;
  lokasi_file: string;
  file_gambar: File | null;
  preview_url: string;
}

const route = useRoute();
const router = useRouter();
const toast = useToast();

const previewDialog = reactive({ show: false, url: "" });
const showSpkModal = ref(false);
const showPrintConfirm = ref(false);
const savedNomor = ref("");

// State penanda tipe asal pengambilan data: 'SPK' (MMT) atau 'POLA' (Jersey Garment)
const currentSourceType = ref<"SPK" | "POLA">("SPK");

const lookup = reactive({ spk: false, pola: false });
const outputOptions = ["SUBLIM", "MMT", "STICKER", "LAIN-LAIN"];

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
  ld_spk: "",
  ld_tanggal: formatDateLocal(new Date()),
  spk_nama: "",
  spk_tanggal: "",
  spk_dateline: "",
  spk_finishing: "",
  spk_panjang: 0,
  spk_lebar: 0,
  spk_bordir: "N",
  details: [] as DetailItem[],
};

const {
  formData,
  isEditMode,
  isLoading,
  isSaving,
  showSaveDialog,
  showCancelDialog,
  showCloseDialog,
  executeSave,
  executeCancel,
  executeClose,
} = useForm({
  menuId: "128",
  initialData,
  fetchApi: async () => {
    const res = await api.get(`/mmt/lhk-layout/load-all/${route.params.nomor}`);
    const resData = res.data.data || res.data;
    const h = resData.header;

    // Auto deteksi mode saat edit data lama
    currentSourceType.value = h.spk?.startsWith("MAP") ? "POLA" : "SPK";

    return {
      ld_spk: h.spk || h.ld_spk || route.params.nomor,
      ld_tanggal: h.ld_tanggal
        ? formatDateLocal(h.ld_tanggal)
        : formatDateLocal(new Date()),
      spk_nama: h.nama || "",
      spk_tanggal: h.tgl ? formatDateLocal(h.tgl) : "",
      spk_dateline: h.dateline ? formatDateLocal(h.dateline) : "",
      spk_finishing: h.finishing || "",
      spk_panjang: parseFloat(h.panjang) || 0,
      spk_lebar: parseFloat(h.lebar) || 0,
      spk_bordir: h.bordir === "Y" ? "Y" : "N",
      details: (resData.komponen || []).map((k: any) => ({
        ldk_output: k.ldk_output || "SUBLIM",
        ldk_kode: k.ldk_kode || "SETTING",
        brg_nama: k.brg_nama || "JASA SETTING DESAIN",
        ldk_finishing: k.ldk_finishing || "",
        ldk_panjang: parseFloat(k.ldk_panjang) || 0,
        ldk_lebar: parseFloat(k.ldk_lebar) || 0,
        ldk_jumlah: parseFloat(k.ldk_jumlah) || 1,
        ldk_skala: k.ldk_skala || "1:1",
        ldk_mode_warna: k.ldk_mode_warna || "CMYK",
        ldk_luas_m2:
          parseFloat(k.ldk_panjang * k.ldk_lebar * k.ldk_jumlah) || 0,
        ldk_sticth: parseFloat(k.ldk_sticth) || 0,
        ldk_pakai: parseFloat(k.ldk_pakai) || 0,
        lokasi_file: k.lokasi_file || "",
        file_gambar: null,
        preview_url: k.path_gambar_url || "",
      })),
    };
  },
  submitApi: async (data: typeof initialData): Promise<unknown> => {
    const multiPayload = new FormData();
    multiPayload.append("flagEdit", String(isEditMode.value));
    multiPayload.append("header", JSON.stringify(data));

    const cleanDetails = data.details
      .filter((k) => k.ldk_kode !== "")
      .map((k) => ({
        ldk_output: k.ldk_output,
        ldk_kode: k.ldk_kode,
        ldk_finishing: k.ldk_finishing,
        ldk_panjang: k.ldk_panjang,
        ldk_lebar: k.ldk_lebar,
        ldk_jumlah: k.ldk_jumlah,
        lokasi_file: k.lokasi_file,
      }));
    multiPayload.append("komponen", JSON.stringify(cleanDetails));

    data.details.forEach((k, idx) => {
      if (k.file_gambar) {
        multiPayload.append(`image_row_${idx}`, k.file_gambar);
      }
    });

    const res = await api.post("/mmt/lhk-layout/save", multiPayload, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    savedNomor.value = data.ld_spk;
    showPrintConfirm.value = true;
    return res;
  },
});

const createEmptyRow = (): DetailItem => ({
  ldk_output: "SUBLIM",
  ldk_kode: "SETTING",
  brg_nama: "JASA SETTING DESAIN",
  ldk_finishing: "",
  ldk_panjang: 0,
  ldk_lebar: 0,
  ldk_jumlah: 1,
  ldk_skala: "1:1",
  ldk_mode_warna: "CMYK",
  ldk_luas_m2: 0,
  ldk_sticth: 0,
  ldk_pakai: 0,
  lokasi_file: "",
  file_gambar: null,
  preview_url: "",
});

const openSpkLookup = () => {
  showSpkModal.value = true;
};
const openPolaLookup = () => {
  lookup.pola = true;
};

const handleKeyDownSpk = (event: KeyboardEvent) => {
  if (event.key === "F1") {
    event.preventDefault();
    openSpkLookup();
  }
};

// 1. Triggered By SPK Master
const handleSpkSelect = async (spk: any) => {
  const nomorSpk =
    spk.Nomor || spk.Spk || spk.spk || spk.nomor || spk.spk_nomor;
  if (!nomorSpk || nomorSpk === "undefined") return;

  currentSourceType.value = "SPK"; // Set mode cetak MMT
  formData.value.ld_spk = nomorSpk;
  showSpkModal.value = false;
  await loadDataAll(nomorSpk);
};

// 2. Triggered By Hasil Potong Kerja LHK Pola
const handlePolaSelect = async (pola: any) => {
  const nomorSpkDariPola =
    pola.Nomor_SPK || pola.spk_nomor || pola.Nomor || pola.Spk;
  if (!nomorSpkDariPola || nomorSpkDariPola === "undefined") return;

  currentSourceType.value = "POLA"; // Set mode Jersey/Pola Garment
  formData.value.ld_spk = nomorSpkDariPola;
  lookup.pola = false;

  await loadDataAll(nomorSpkDariPola);

  // Suntik otomatis nilai PCS potong kain tim cutting ke baris Qty
  if (pola.Qty_Pola || pola.Jumlah) {
    formData.value.details.forEach((d) => {
      d.ldk_jumlah = parseFloat(pola.Qty_Pola || pola.Jumlah) || d.ldk_jumlah;
    });
  }
};

const onSpkBlur = () => {
  if (formData.value.ld_spk.trim() !== "") {
    currentSourceType.value = formData.value.ld_spk.startsWith("MAP")
      ? "POLA"
      : "SPK";
    loadDataAll(formData.value.ld_spk);
  }
};

const loadDataAll = async (nomorSpk: string) => {
  if (!nomorSpk || nomorSpk === "undefined") return;
  isLoading.value = true;
  try {
    const res = await api.get(
      `/mmt/lhk-layout/load-all/${encodeURIComponent(nomorSpk)}`,
    );
    const resData = res.data.data || res.data;
    const { header, komponen } = resData;

    if (!header) {
      toast.warning("SPK/MAP tersebut tidak ditemukan di server.");
      return;
    }

    formData.value.ld_spk = header.spk || nomorSpk;
    formData.value.spk_nama = header.nama || "";
    formData.value.spk_tanggal = header.tgl ? formatDateLocal(header.tgl) : "";
    formData.value.spk_dateline = header.dateline
      ? formatDateLocal(header.dateline)
      : "";
    formData.value.spk_finishing = header.finishing || "";
    formData.value.spk_panjang = parseFloat(header.panjang) || 0;
    formData.value.spk_lebar = parseFloat(header.lebar) || 0;
    formData.value.spk_bordir = header.bordir === "Y" ? "Y" : "N";

    if (komponen && komponen.length > 0) {
      formData.value.details = komponen.map((k: any) => ({
        ldk_output:
          k.ldk_output ||
          (currentSourceType.value === "POLA" ? "SUBLIM" : "MMT"),
        ldk_kode: k.ldk_kode || "SETTING",
        brg_nama: k.brg_nama || "JASA SETTING DESAIN",
        ldk_finishing: k.ldk_finishing || "",
        ldk_panjang: parseFloat(k.ldk_panjang) || 0,
        ldk_lebar: parseFloat(k.ldk_lebar) || 0,
        ldk_jumlah: parseFloat(k.ldk_jumlah) || 1,
        ldk_skala: k.ldk_skala || "1:1",
        ldk_mode_warna: k.ldk_mode_warna || "CMYK",
        ldk_luas_m2:
          parseFloat(k.ldk_panjang * k.ldk_lebar * k.ldk_jumlah) || 0,
        ldk_sticth: parseFloat(k.ldk_sticth) || 0,
        ldk_pakai: parseFloat(k.ldk_pakai) || 0,
        lokasi_file: k.lokasi_file || "",
        file_gambar: null,
        preview_url: k.path_gambar_url || "",
      }));
    } else {
      formData.value.details = [createEmptyRow()];
    }

    toast.success("Data SPK berhasil disinkronkan.");
  } catch (error) {
    toast.error("Gagal memuat rincian SPK.");
  } finally {
    isLoading.value = false;
  }
};

const updateLuasM2 = (item: DetailItem) => {
  const p = Number(item.ldk_panjang) || 0;
  const l = Number(item.ldk_lebar) || 0;
  const qty = Number(item.ldk_jumlah) || 0;
  item.ldk_luas_m2 = Number((p * l * qty).toFixed(3));
};

const triggerFileInput = (index: number) => {
  const el = document.getElementById(`file-ds-${index}`);
  if (el) el.click();
};

const handleFileChange = (event: any, index: number) => {
  const file = event.target.files[0];
  if (file) {
    if (file.size > 3 * 1024 * 1024) {
      toast.error("Ukuran file pratinjau desain maksimal 3MB!");
      return;
    }
    formData.value.details[index].file_gambar = file;
    formData.value.details[index].preview_url = URL.createObjectURL(file);
  }
};

const triggerImagePreview = (url: string) => {
  previewDialog.url = url;
  previewDialog.show = true;
};

const copyToClipboard = (text: string) => {
  if (!text) return;
  navigator.clipboard.writeText(text);
  toast.success("Path file server berhasil disalin!");
};

const validateBeforeSave = () => {
  if (!formData.value.ld_spk)
    return toast.warning("Nomor SPK/MAP wajib diisi.");
  showSaveDialog.value = true;
};

onMounted(async () => {
  if (route.params.nomor) {
    formData.value.ld_spk = route.params.nomor as string;
    currentSourceType.value = formData.value.ld_spk.startsWith("MAP")
      ? "POLA"
      : "SPK";
    await loadDataAll(formData.value.ld_spk);
  } else {
    formData.value.details = [createEmptyRow()];
  }
});
</script>

<style scoped>
/* Style sama seperti sebelumnya, dijamin rapi dan stabil */
.manksi-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 11px;
}
.manksi-table th {
  background: #1e88e5;
  color: white;
  padding: 6px;
  position: sticky;
  top: 0;
  z-index: 1;
  font-weight: bold;
  border: 1px solid rgba(255, 255, 255, 0.2);
}
.manksi-table td {
  border: 1px solid #e0e0e0;
  padding: 0;
  height: 32px;
}
.cell-input {
  width: 100%;
  height: 100%;
  border: none;
  padding: 0 6px;
  outline: none;
  background: transparent;
}
.cell-input:focus {
  background: #e3f2fd;
}
.font-mono {
  font-family: monospace !important;
  font-size: 10px !important;
}
.table-container {
  overflow: auto;
  height: 100%;
}
.tr {
  text-align: right;
}
.cursor-pointer {
  cursor: pointer;
}
</style>
