<script setup lang="ts">
import { computed, ref, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useToast } from "vue-toastification";
import { useForm } from "@/composables/useForm";
import api from "@/services/api";
import BaseForm from "@/components/BaseForm.vue";
import { mppbFormService } from "@/services/penjualan/mppbFormService";
import {
  IconLock,
  IconPhoto,
  IconX,
  IconPhotoOff,
  IconExternalLink,
  IconFileDescription,
} from "@tabler/icons-vue";

const route = useRoute();
const router = useRouter();
const toast = useToast();

const isEdit = computed(() => !!route.params.nomor);
const nomorParam = computed(() => route.params.nomor as string);

const showPrintDialog = ref(false);
const savedNomor = ref("");

// ── Dropdown Divisi ──
const divisiOptions = ref<any[]>([]);

const loadDivisi = async () => {
  try {
    // Sesuaikan endpoint divisi yang biasa dipakai
    const res = await api.get("/lookups/divisi");
    divisiOptions.value = res.data.data
      .filter((d: any) => d.kode !== 0) // Menghilangkan opsi "0 - ALL"
      .map((d: any) => ({
        value: String(d.kode),
        title: `${d.kode} - ${d.nama}`,
      }));
  } catch {
    console.error("Gagal memuat divisi");
  }
};

onMounted(() => {
  loadDivisi();
});

// ── State Gambar ──
const fileRef = ref<HTMLInputElement | null>(null);
const fileDocRef = ref<HTMLInputElement | null>(null);
const uploadName = ref("");
const uploadDocName = ref("");
const showPreviewDialog = ref(false);
const previewUrlActive = ref("");

const emptyData = {
  nomor: "",
  tanggal: new Date().toISOString().substring(0, 10),
  divisi: "1",
  namaProduk: "",
  ukuran: "",
  bahan: "",
  gramasi: "",
  jumlahOrder: 0,
  keterangan: "",
  noDokumen: "",
  date_create: "",
  user_create: "",
  pin_status: "",
  imgDesainLokal: "",
  imgDokumenLokal: "",
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
  menuId: "150",
  initialData: emptyData,
  fetchApi: async () => {
    const res = await mppbFormService.getDetail(nomorParam.value);
    const h = res.data.data;

    return {
      nomor: h.mpb_nomor,
      tanggal: new Date(h.mpb_tanggal).toISOString().substring(0, 10),
      divisi: String(h.mpb_divisi),
      namaProduk: h.mpb_nama,
      ukuran: h.mpb_ukuran,
      bahan: h.mpb_bahan,
      gramasi: h.mpb_gramasi,
      jumlahOrder: h.mpb_jmlorder,
      keterangan: h.mpb_ket,
      noDokumen: h.mpb_dokumen,
      date_create: h.date_create,
      user_create: h.user_create,
      pin_status: h.pin_status,
      imgDesainLokal: "",
      imgDokumenLokal: "",
    };
  },
  submitApi: async (payload) => {
    return await mppbFormService.saveData(payload);
  },
  onSuccess: async (res: any) => {
    const nomorTersimpan = res.data?.data?.nomor || formData.value.nomor;

    let uploadDesainPromise = Promise.resolve();
    let uploadDocPromise = Promise.resolve();

    if (fileRef.value?.files?.[0]) {
      uploadDesainPromise = mppbFormService.uploadGambar(
        nomorTersimpan,
        "desain",
        fileRef.value.files[0],
      );
    }
    if (fileDocRef.value?.files?.[0]) {
      uploadDocPromise = mppbFormService.uploadGambar(
        nomorTersimpan,
        "dokumen",
        fileDocRef.value.files[0],
      );
    }

    try {
      await Promise.all([uploadDesainPromise, uploadDocPromise]);
    } catch {
      toast.error("Data tersimpan, tapi GAGAL mengupload sebagian gambar.");
    }

    savedNomor.value = nomorTersimpan;
    showPrintDialog.value = true;
  },
});

const isTutupBuku = computed(() => {
  return ["WAIT", "TOLAK", "MINTA"].includes(formData.value.pin_status);
});

// ── FUNGSI GAMBAR ──
const onFileChange = (e: Event, tipe: "desain" | "dokumen") => {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (!file) return;

  if (file.size > 1_000_000) {
    toast.error("Ukuran gambar tidak boleh > 1 Mb.");
    (e.target as HTMLInputElement).value = "";
    return;
  }

  if (tipe === "desain") {
    uploadName.value = file.name;
    formData.value.imgDesainLokal = URL.createObjectURL(file);
  } else {
    uploadDocName.value = file.name;
    formData.value.imgDokumenLokal = URL.createObjectURL(file);
  }
};

const displayImgDesain = computed(() => {
  if (formData.value.imgDesainLokal) return formData.value.imgDesainLokal;
  if (isEdit.value && formData.value.nomor) {
    return `http://103.94.238.252:8888/file-gambar/${encodeURIComponent(formData.value.nomor)}.jpg`;
  }
  return "";
});

const displayImgDokumen = computed(() => {
  if (formData.value.imgDokumenLokal) return formData.value.imgDokumenLokal;
  if (isEdit.value && formData.value.nomor) {
    return `http://103.94.238.252:8888/file-gambar/${encodeURIComponent(formData.value.nomor)}-doc.jpg`;
  }
  return "";
});

const openPreview = (url: string) => {
  if (!url) return;
  previewUrlActive.value = url;
  showPreviewDialog.value = true;
};

// ── VALIDASI SIMPAN ──
const validateSave = () => {
  if (!canSave.value) return toast.error("Hak akses simpan ditolak.");
  if (isTutupBuku.value) {
    return toast.error(
      "Transaksi tsb sudah diclose.\nSilahkan minta approve (PIN 5) untuk menyimpan.",
    );
  }
  if (!formData.value.namaProduk?.trim()) {
    return toast.warning("Nama Produk wajib diisi.");
  }
  showSaveDialog.value = true;
};

const doCetak = () => {
  showPrintDialog.value = false;
  window.open(
    `/penjualan/mppb/print/${encodeURIComponent(savedNomor.value)}`,
    "_blank",
  );
  router.back();
};

const doTidakCetak = () => {
  showPrintDialog.value = false;
  router.back();
};

const formatWaktu = (dt: string) => {
  if (!dt) return "";
  const d = new Date(dt);
  return `${String(d.getDate()).padStart(2, "0")}-${String(d.getMonth() + 1).padStart(2, "0")}-${d.getFullYear()} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};
</script>

<template>
  <BaseForm
    :title="(isEdit ? 'Ubah' : 'Baru') + ' Memo Permintaan Pembelian Bahan'"
    menuId="150"
    :icon="IconFileDescription"
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
    <div
      class="tp-layout"
      :style="isTutupBuku ? 'pointer-events:none; opacity:0.8' : ''"
    >
      <div class="tp-left">
        <div class="tp-alert warning mb-2" v-if="isTutupBuku">
          <IconLock :size="14" class="mr-1" />
          Transaksi sudah diclose. Menunggu ACC PIN untuk membuka.
        </div>

        <div class="tp-section">
          <div class="tp-row">
            <label class="tp-lbl">Divisi</label>
            <v-select
              v-model="formData.divisi"
              :items="divisiOptions"
              variant="outlined"
              density="compact"
              hide-details
              class="f-inp"
              style="max-width: 200px"
            />
          </div>

          <div class="tp-row">
            <label class="tp-lbl">Nomor</label>
            <v-text-field
              v-model="formData.nomor"
              variant="outlined"
              density="compact"
              readonly
              bg-color="grey-lighten-4"
              hide-details
              class="f-inp"
              style="max-width: 180px"
            >
              <template #append-inner>
                <span v-if="!isEdit" class="hint-new"><-- Kosong=Baru</span>
              </template>
            </v-text-field>
          </div>

          <div class="tp-row">
            <label class="tp-lbl">Tanggal</label>
            <input
              type="date"
              v-model="formData.tanggal"
              class="tp-date"
              style="width: 130px"
            />
            <label class="tp-lbl" style="width: 50px; margin-left: 20px"
              >Created</label
            >
            <input
              :value="formatWaktu(formData.date_create)"
              readonly
              class="tp-inp-ro"
              style="flex: 1"
              placeholder="-"
            />
          </div>

          <v-divider class="my-3" />

          <div class="tp-row">
            <label class="tp-lbl">Nama Produk</label>
            <v-text-field
              v-model="formData.namaProduk"
              variant="outlined"
              density="compact"
              hide-details
              class="f-inp"
            />
          </div>

          <div class="tp-row">
            <label class="tp-lbl">Ukuran</label>
            <v-text-field
              v-model="formData.ukuran"
              variant="outlined"
              density="compact"
              hide-details
              class="f-inp"
              style="max-width: 250px"
            />
          </div>

          <div class="tp-row">
            <label class="tp-lbl">Bahan</label>
            <v-text-field
              v-model="formData.bahan"
              variant="outlined"
              density="compact"
              hide-details
              class="f-inp"
            />
          </div>

          <div class="tp-row">
            <label class="tp-lbl">Gramasi</label>
            <v-text-field
              v-model="formData.gramasi"
              variant="outlined"
              density="compact"
              hide-details
              class="f-inp"
              style="max-width: 250px"
            />
          </div>

          <div class="tp-row">
            <label class="tp-lbl">Jumlah Order</label>
            <v-text-field
              v-model.number="formData.jumlahOrder"
              type="number"
              variant="outlined"
              density="compact"
              hide-details
              class="f-inp"
              style="max-width: 150px"
            />
          </div>

          <div class="tp-row" style="align-items: flex-start; margin-top: 6px">
            <label class="tp-lbl pt-2">Keterangan</label>
            <v-textarea
              v-model="formData.keterangan"
              variant="outlined"
              density="compact"
              hide-details
              rows="4"
              class="f-inp"
            />
          </div>
        </div>
      </div>

      <div class="tp-right">
        <div
          class="tp-section mb-2"
          style="background: #e3f2fd; border-color: #90caf9"
        >
          <div class="tp-sec-title">Upload Desain</div>
          <div class="tp-img-box">
            <img
              v-if="displayImgDesain"
              :src="displayImgDesain"
              class="tp-img"
              @click="openPreview(displayImgDesain)"
            />
            <div v-else class="tp-img-empty">
              <IconPhoto :size="28" color="#90caf9" />
              <div class="mt-1">No Image available</div>
            </div>
          </div>
          <div class="tp-upload-row">
            <input
              ref="fileRef"
              type="file"
              accept="image/jpeg, image/jpg, image/png"
              style="display: none"
              @change="onFileChange($event, 'desain')"
            />
            <div class="tp-upload-name" :title="uploadName">
              {{ uploadName || "Pilih file..." }}
            </div>
            <button
              class="tp-upload-btn"
              type="button"
              @click="fileRef?.click()"
            >
              Upload
            </button>
          </div>
          <div class="tp-img-hint text-blue-darken-2">Ukuran Maksimal 1 Mb</div>
        </div>

        <div class="tp-section">
          <div class="tp-row mb-2">
            <label class="tp-lbl" style="width: 75px">No. Dokumen</label>
            <v-text-field
              v-model="formData.noDokumen"
              variant="outlined"
              density="compact"
              hide-details
              class="f-inp"
            />
          </div>
          <div class="tp-img-box" style="height: 120px">
            <img
              v-if="displayImgDokumen"
              :src="displayImgDokumen"
              class="tp-img"
              @click="openPreview(displayImgDokumen)"
            />
            <div v-else class="tp-img-empty">
              <IconPhoto :size="28" color="#bdbdbd" />
              <div class="mt-1">No Image available</div>
            </div>
          </div>
          <div class="tp-upload-row">
            <input
              ref="fileDocRef"
              type="file"
              accept="image/jpeg, image/jpg, image/png"
              style="display: none"
              @change="onFileChange($event, 'dokumen')"
            />
            <div class="tp-upload-name" :title="uploadDocName">
              {{ uploadDocName || "Pilih file..." }}
            </div>
            <button
              class="tp-upload-btn"
              type="button"
              @click="fileDocRef?.click()"
            >
              Upload
            </button>
          </div>
          <div class="tp-img-hint">Ukuran Maksimal 1 Mb</div>
        </div>
      </div>
    </div>
  </BaseForm>

  <v-dialog v-model="showPreviewDialog" max-width="800px">
    <v-card class="rounded-lg">
      <v-card-title
        class="bg-primary text-white d-flex justify-space-between align-center pa-3"
      >
        <span class="text-subtitle-1 font-weight-bold"
          >Preview Desain / Dokumen</span
        >
        <v-btn
          variant="text"
          size="small"
          color="white"
          @click="showPreviewDialog = false"
        >
          <IconX :size="18" :stroke-width="2" />
        </v-btn>
      </v-card-title>
      <v-card-text class="pa-4 text-center bg-grey-lighten-4">
        <v-img
          :src="previewUrlActive"
          max-height="600"
          contain
          class="bg-white rounded border"
        >
          <template v-slot:placeholder>
            <div
              class="d-flex flex-column align-center justify-center fill-height"
            >
              <v-progress-circular
                indeterminate
                color="primary"
                size="40"
              ></v-progress-circular>
            </div>
          </template>
          <template v-slot:error>
            <div
              class="d-flex flex-column align-center justify-center fill-height text-grey"
            >
              <IconPhotoOff :size="48" color="#bdbdbd" />
              <div class="text-subtitle-2 mt-2">Gagal memuat gambar</div>
            </div>
          </template>
        </v-img>
      </v-card-text>
      <v-card-actions class="bg-white pa-2 border-t">
        <v-spacer></v-spacer>
        <v-btn
          color="primary"
          variant="text"
          :href="previewUrlActive"
          target="_blank"
        >
          <template #prepend
            ><IconExternalLink :size="15" :stroke-width="1.7"
          /></template>
          Buka di Tab Baru
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <v-dialog v-model="showPrintDialog" max-width="400px" persistent>
    <v-card class="rounded-lg">
      <v-card-title class="bg-primary text-white pa-3">
        Simpan Berhasil
      </v-card-title>
      <v-card-text class="pa-4 text-center">
        MPPB <b>{{ savedNomor }}</b> tersimpan.<br />Cetak dokumen ini sekarang?
      </v-card-text>
      <v-card-actions class="pa-3 border-t bg-grey-lighten-4">
        <v-btn variant="text" color="error" @click="doTidakCetak">
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
.tp-layout {
  display: flex;
  flex-direction: row;
  gap: 16px;
  align-items: flex-start;
  font-family: "Segoe UI", system-ui, sans-serif;
  font-size: 12px;
  height: 100%;
  padding: 16px;
}
.tp-left {
  flex: 1;
  min-width: 0;
}
.tp-right {
  width: 340px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.tp-alert {
  display: flex;
  align-items: center;
  padding: 6px 12px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 600;
}
.tp-alert.warning {
  background: #fff8e1;
  color: #f57f17;
  border: 1px solid #ffe082;
}

.tp-section {
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 16px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}
.tp-sec-title {
  font-size: 11px;
  font-weight: 700;
  color: #1565c0;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  margin-bottom: 8px;
}

.tp-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
  min-height: 26px;
}
.tp-lbl {
  width: 110px;
  flex-shrink: 0;
  font-size: 11px;
  font-weight: 600;
  color: #424242;
  white-space: nowrap;
}

.f-inp {
  flex: 1;
  min-width: 0;
}
.f-inp :deep(.v-field) {
  font-size: 12px;
  min-height: 26px;
  height: 26px;
}
.f-inp :deep(.v-field__input) {
  min-height: 26px;
  padding-top: 0;
  padding-bottom: 0;
  font-size: 12px;
}
.f-inp :deep(.v-input__control) {
  min-height: 26px;
}

.v-textarea.f-inp :deep(.v-field),
.v-textarea.f-inp :deep(.v-input__control) {
  height: auto !important;
  min-height: 90px !important;
}
.v-textarea.f-inp :deep(.v-field__input) {
  height: auto !important;
  min-height: 90px !important;
  padding-top: 8px !important;
  padding-bottom: 8px !important;
}

.tp-inp-ro {
  height: 26px;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  padding: 0 6px;
  font-size: 12px;
  background: #eeeeee;
  color: #616161;
  outline: none;
}
.tp-date {
  height: 26px;
  border: 1px solid #bdbdbd;
  border-radius: 4px;
  padding: 0 6px;
  font-size: 12px;
  outline: none;
  background: white;
  color: #212121;
}
.tp-date:focus {
  border-color: #1976d2;
}
.hint-new {
  font-size: 10px;
  color: #e53935;
  font-style: italic;
  font-weight: 600;
  white-space: nowrap;
}

/* Upload Area */
.tp-img-box {
  width: 100%;
  height: 180px;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  background: #fafafa;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  margin-bottom: 6px;
}
.tp-img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  cursor: pointer;
  transition: transform 0.2s;
}
.tp-img:hover {
  transform: scale(1.02);
}
.tp-img-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  color: #bdbdbd;
  font-size: 11px;
}

.tp-upload-row {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 3px;
}
.tp-upload-name {
  flex: 1;
  font-size: 11px;
  color: #757575;
  background: #f5f5f5;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  padding: 4px 6px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  min-width: 0;
}
.tp-upload-btn {
  background: #546e7a;
  color: white;
  border: none;
  border-radius: 4px;
  padding: 4px 12px;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  flex-shrink: 0;
}
.tp-upload-btn:hover {
  background: #455a64;
}
.tp-img-hint {
  font-size: 10px;
  font-weight: 500;
  font-style: italic;
  text-align: right;
}
</style>
