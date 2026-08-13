<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useToast } from "vue-toastification";
import BaseForm from "@/components/BaseForm.vue";
import { useForm } from "@/composables/useForm";
import {
  IconMessageExclamation,
  IconSearch,
  IconUpload,
  IconMaximize,
  IconRefresh,
} from "@tabler/icons-vue";
import { complainCustomerFormService } from "@/services/master/complainCustomerFormService";

import SpkSearchModal from "@/components/lookups/SpkSearchModal.vue";

const route = useRoute();
const router = useRouter();
const toast = useToast();

const isEditMode = computed(() => !!route.params.nomor);
const nomorUrl = route.params.nomor as string;
const menuId = "36";

const toLocalDate = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
};
const todayLocal = toLocalDate(new Date());

const jenisComplainOptions = ref<string[]>([]);

const defaultData = {
  Nomor: "",
  Tanggal: todayLocal,
  SpkNomor: "",
  SpkNama: "",
  SpkTanggal: "",
  Divisi: "",
  Tipe: "",
  CusKode: "",
  CusNama: "",
  Alamat: "",
  Kota: "",
  Telp: "",
  Nama: "",
  Jenis: "",
  Keterangan: "",
  Action: "",
  KetDiv1: "",
  KetDiv2: "",
  KetDiv3: "",
  Image1Name: "",
  Image2Name: "",
  Image3Name: "",
};

const {
  isLoading,
  isSaving,
  showSaveDialog,
  showCancelDialog,
  showCloseDialog,
  formData,
  executeSave,
  executeCancel,
  executeClose,
} = useForm({
  menuId,
  initialData: defaultData,
  fetchApi: async () => {
    const res = await complainCustomerFormService.getDetail(nomorUrl);
    const d = res.data.data;
    const h = d.header;
    const spk = d.spkDetail;

    return {
      ...defaultData,
      Nomor: h.tc_nomor,
      Tanggal: (h.tc_date || todayLocal).substring(0, 10),
      SpkNomor: h.tc_spk_nomor || "",
      SpkNama: spk?.Nama || "",
      SpkTanggal: spk?.Tanggal || "",
      Divisi: spk?.Divisi || "",
      Tipe: spk?.Tipe || "",
      CusKode: h.tc_cus_kode || "",
      CusNama: spk?.CusNama || "",
      Alamat: spk?.Alamat || "",
      Kota: spk?.Kota || "",
      Telp: spk?.Telp || "",
      Nama: h.tc_nama || "",
      Jenis: h.tc_jenis || "",
      Keterangan: h.tc_description || "",
      Action: h.tc_action || "",
      KetDiv1: h.tc_ket_div1 || "",
      KetDiv2: h.tc_ket_div2 || "",
      KetDiv3: h.tc_ket_div3 || "",
      Image1Name: h.tc_image1 || "",
      Image2Name: h.tc_image2 || "",
      Image3Name: h.tc_image3 || "",
    };
  },
  submitApi: async (data: any) => {
    const payload = {
      tanggal: data.Tanggal,
      spkNomor: data.SpkNomor,
      cusKode: data.CusKode,
      nama: data.Nama,
      jenis: data.Jenis,
      keterangan: data.Keterangan,
      action: data.Action,
      ketDiv1: data.KetDiv1,
      ketDiv2: data.KetDiv2,
      ketDiv3: data.KetDiv3,
    };

    const res = isEditMode.value
      ? await complainCustomerFormService.update(nomorUrl, payload)
      : await complainCustomerFormService.create(payload);

    const savedNomor = res.data?.data?.nomor || data.Nomor;

    // Upload gambar (kalau ada file baru dipilih), sesuai slot masing-masing
    for (const slot of [1, 2, 3] as const) {
      const file = pendingFiles.value[slot];
      if (file) {
        try {
          await complainCustomerFormService.uploadImage(file, savedNomor, slot);
        } catch {
          toast.warning(`Data tersimpan, tapi gambar ${slot} gagal diupload.`);
        }
      }
    }

    return res;
  },
  onSuccess: (res: any) => {
    toast.success("Data Complain berhasil disimpan.");
    router.push("/daftar/complain-customer");
  },
});

// ── SPK/MAP Search & Validasi ──
const showSpkModal = ref(false);
const isValidatingSpk = ref(false);

const applySpkDetail = (spk: any) => {
  formData.value.SpkNomor = spk.Nomor;
  formData.value.SpkNama = spk.Nama || "";
  formData.value.SpkTanggal = spk.Tanggal || "";
  formData.value.Divisi = spk.Divisi || "";
  formData.value.Tipe = spk.Tipe || "";
  formData.value.CusKode = spk.CusKode || "";
  formData.value.CusNama = spk.CusNama || "";
  formData.value.Alamat = spk.Alamat || "";
  formData.value.Kota = spk.Kota || "";
  formData.value.Telp = spk.Telp || "";
};

const clearSpkDetail = () => {
  formData.value.SpkNama = "";
  formData.value.SpkTanggal = "";
  formData.value.Divisi = "";
  formData.value.Tipe = "";
  formData.value.CusKode = "";
  formData.value.CusNama = "";
  formData.value.Alamat = "";
  formData.value.Kota = "";
  formData.value.Telp = "";
};

const onSpkSelected = async (item: any) => {
  const nomor = item.Nomor || item.so_nomor || item.spk_nomor;
  try {
    isValidatingSpk.value = true;
    const res = await complainCustomerFormService.getSpkDetail(nomor);
    applySpkDetail(res.data.data);
  } catch (e: any) {
    toast.error(e.response?.data?.message || "Nomor SO/MAP tidak ditemukan.");
    formData.value.SpkNomor = "";
    clearSpkDetail();
  } finally {
    isValidatingSpk.value = false;
  }
};

const onSpkKeydown = (e: KeyboardEvent) => {
  if (e.key === "F1") {
    e.preventDefault();
    if (!isEditMode.value) showSpkModal.value = true;
  }
};

const onSpkEnter = async () => {
  const nomor = (formData.value.SpkNomor || "").trim().toUpperCase();
  if (!nomor) {
    clearSpkDetail();
    return;
  }
  try {
    isValidatingSpk.value = true;
    const res = await complainCustomerFormService.getSpkDetail(nomor);
    formData.value.SpkNomor = nomor;
    applySpkDetail(res.data.data);
  } catch (e: any) {
    toast.error(e.response?.data?.message || "Nomor SO/MAP tidak ditemukan.");
    formData.value.SpkNomor = "";
    clearSpkDetail();
  } finally {
    isValidatingSpk.value = false;
  }
};

// ── Upload Gambar 3 Slot ──
const pendingFiles = ref<Record<1 | 2 | 3, File | null>>({
  1: null,
  2: null,
  3: null,
});
const previewUrls = ref<Record<1 | 2 | 3, string>>({ 1: "", 2: "", 3: "" });
const fileRefs = {
  1: ref<HTMLInputElement | null>(null),
  2: ref<HTMLInputElement | null>(null),
  3: ref<HTMLInputElement | null>(null),
};

const getBaseUrl = () => {
  const raw = (import.meta.env.VITE_API_URL || "").replace(/\/api\/?$/, "");
  return raw;
};

const existingImageUrl = (slot: 1 | 2 | 3) => {
  const key = `Image${slot}Name` as "Image1Name" | "Image2Name" | "Image3Name";
  if (!formData.value[key] || !formData.value.Nomor) return "";
  return `${getBaseUrl()}/images/complain/${encodeURIComponent(formData.value.Nomor)}-0${slot}.jpg`;
};

const displayImageUrl = (slot: 1 | 2 | 3) => {
  if (previewUrls.value[slot]) return previewUrls.value[slot];
  return existingImageUrl(slot);
};

const triggerFileSelect = (slot: 1 | 2 | 3) => {
  fileRefs[slot].value?.click();
};

const onFileChange = (e: Event, slot: 1 | 2 | 3) => {
  const target = e.target as HTMLInputElement;
  const file = target.files?.[0];
  if (!file) return;

  if (file.size > 2_000_000) {
    toast.error("Ukuran gambar tidak boleh > 2 Mb.");
    target.value = "";
    return;
  }

  pendingFiles.value[slot] = file;
  previewUrls.value[slot] = URL.createObjectURL(file);
  target.value = "";
};

const showPreviewDialog = ref(false);
const previewSlot = ref<1 | 2 | 3>(1);
const openPreview = (slot: 1 | 2 | 3) => {
  previewSlot.value = slot;
  showPreviewDialog.value = true;
};

const showResetDialog = ref(false);
const confirmResetImages = async () => {
  if (!formData.value.Nomor) {
    // Belum tersimpan — cukup bersihkan state lokal
    pendingFiles.value = { 1: null, 2: null, 3: null };
    previewUrls.value = { 1: "", 2: "", 3: "" };
    showResetDialog.value = false;
    return;
  }
  try {
    await complainCustomerFormService.resetImages(formData.value.Nomor);
    formData.value.Image1Name = "";
    formData.value.Image2Name = "";
    formData.value.Image3Name = "";
    pendingFiles.value = { 1: null, 2: null, 3: null };
    previewUrls.value = { 1: "", 2: "", 3: "" };
    toast.success("Reset gambar berhasil.");
  } catch (e: any) {
    toast.error(e.response?.data?.message || "Gagal reset gambar.");
  } finally {
    showResetDialog.value = false;
  }
};

// ── Validasi & Simpan ──
const validateSave = () => {
  if (!formData.value.SpkNomor?.trim()) {
    return toast.warning("Nomor SPK/Memo belum diisi.");
  }
  if (!formData.value.Jenis?.trim()) {
    return toast.warning("Jenis Complain silahkan dipilih dulu dong!");
  }
  showSaveDialog.value = true;
};

onMounted(async () => {
  try {
    const res = await complainCustomerFormService.getJenisComplainOptions();
    jenisComplainOptions.value = res.data.data || [];
  } catch {
    /* silent */
  }
});
</script>

<template>
  <BaseForm
    :title="isEditMode ? 'Ubah Complain Customer' : 'Tambah Complain Customer'"
    :menu-id="menuId"
    :icon="IconMessageExclamation"
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
    <div class="cc-layout">
      <!-- ══ Kolom Kiri: Header + Info SPK/Customer ══ -->
      <div class="cc-left">
        <div class="cc-section">
          <div class="fr">
            <label class="lbl">Nomor</label>
            <input
              :value="formData.Nomor"
              class="inp ro fw"
              readonly
              placeholder="<-- Kosong=Baru"
            />
          </div>
          <div class="fr">
            <label class="lbl">Tgl Complain</label>
            <input type="date" v-model="formData.Tanggal" class="idate" />
          </div>

          <div class="divider" />

          <div class="fr">
            <label class="lbl">No. SPK/Memo</label>
            <div class="igrp">
              <input
                v-model="formData.SpkNomor"
                class="inp"
                style="background: #ddeeff; text-transform: uppercase"
                :readonly="isEditMode"
                :class="{ ro: isEditMode }"
                placeholder="F1 / nomor + Enter"
                @keydown="onSpkKeydown"
                @keydown.enter.prevent="onSpkEnter"
              />
              <button
                type="button"
                class="ci-btn"
                :disabled="isEditMode"
                title="Cari SO/MAP (F1)"
                @click="showSpkModal = true"
              >
                <IconSearch :size="13" />
              </button>
            </div>
          </div>
          <div class="fr">
            <label class="lbl"></label>
            <input
              :value="formData.SpkNama"
              class="inp ro"
              readonly
              placeholder="Nama SO/MAP..."
            />
          </div>
          <div class="fr">
            <label class="lbl">Tanggal</label>
            <input :value="formData.SpkTanggal" class="inp ro" readonly />
          </div>
          <div class="fr">
            <label class="lbl">Divisi</label>
            <input
              :value="formData.Divisi"
              class="inp ro"
              readonly
              style="width: 140px; flex: none"
            />
            <label class="lbl" style="width: 40px; margin-left: 8px"
              >Type</label
            >
            <input :value="formData.Tipe" class="inp ro" readonly />
          </div>
          <div class="fr" style="align-items: flex-start">
            <label class="lbl" style="padding-top: 3px">Nama</label>
            <input
              v-model="formData.Nama"
              class="inp"
              placeholder="Nama PIC / pelapor..."
            />
          </div>
          <div class="fr">
            <label class="lbl">Jenis Complain</label>
            <select v-model="formData.Jenis" class="inp sel">
              <option value=""></option>
              <option v-for="j in jenisComplainOptions" :key="j" :value="j">
                {{ j }}
              </option>
            </select>
          </div>
        </div>

        <div class="cc-section mt-2">
          <div class="section-title">CUSTOMER</div>
          <div class="fr">
            <label class="lbl w80">Kode</label>
            <input
              :value="formData.CusKode"
              class="inp ro"
              style="width: 90px; flex: none"
              readonly
            />
            <input
              :value="formData.CusNama"
              class="inp ro"
              readonly
              style="flex: 1; margin-left: 6px"
            />
          </div>
          <div class="fr">
            <label class="lbl w80">Alamat</label>
            <input :value="formData.Alamat" class="inp ro" readonly />
          </div>
          <div class="fr">
            <label class="lbl w80"></label>
            <input :value="formData.Kota" class="inp ro" readonly />
          </div>
          <div class="fr">
            <label class="lbl w80">Telp</label>
            <input :value="formData.Telp" class="inp ro" readonly />
          </div>
        </div>

        <div class="cc-section mt-2">
          <div class="section-title">LAMPIRAN GAMBAR</div>
          <div
            v-for="slot in [1, 2, 3] as const"
            :key="slot"
            class="img-slot-row"
          >
            <button
              type="button"
              class="btn-slot"
              @click="triggerFileSelect(slot)"
            >
              <IconUpload :size="13" class="mr-1" /> Image{{ slot }}
            </button>
            <button
              type="button"
              class="btn-slot blue"
              :disabled="!displayImageUrl(slot)"
              @click="openPreview(slot)"
            >
              <IconMaximize :size="13" class="mr-1" /> Full Screen
            </button>
            <span v-if="displayImageUrl(slot)" class="img-ok"
              >✓ Ada gambar</span
            >
            <input
              :ref="(el) => (fileRefs[slot].value = el as HTMLInputElement)"
              type="file"
              accept="image/*"
              style="display: none"
              @change="onFileChange($event, slot)"
            />
          </div>
          <button
            type="button"
            class="btn-reset mt-2"
            @click="showResetDialog = true"
          >
            <IconRefresh :size="13" class="mr-1" /> Reset Image
          </button>
        </div>
      </div>

      <!-- ══ Kolom Kanan: Uraian, Action, Ket Div ══ -->
      <div class="cc-right">
        <div class="cc-section h-full">
          <div class="fr-col">
            <label class="lbl-block">Uraian</label>
            <textarea
              v-model="formData.Keterangan"
              class="ta"
              rows="8"
              placeholder="Uraian complain..."
            />
          </div>
          <div class="fr-col mt-2">
            <label class="lbl-block">Action/Solution</label>
            <textarea
              v-model="formData.Action"
              class="ta"
              rows="4"
              placeholder="Tindakan/solusi..."
            />
          </div>
          <div class="fr-col mt-2">
            <label class="lbl-block">Ket Div 1</label>
            <input v-model="formData.KetDiv1" class="inp" />
          </div>
          <div class="fr-col mt-1">
            <label class="lbl-block">Ket Div 2</label>
            <input v-model="formData.KetDiv2" class="inp" />
          </div>
          <div class="fr-col mt-1">
            <label class="lbl-block">Ket Div 3</label>
            <input v-model="formData.KetDiv3" class="inp" />
          </div>
        </div>
      </div>
    </div>
  </BaseForm>

  <SpkSearchModal v-model="showSpkModal" mode="so" @selected="onSpkSelected" />

  <v-dialog v-model="showPreviewDialog" max-width="800px">
    <div class="preview-card">
      <div class="preview-header">
        <span>Preview Gambar {{ previewSlot }}</span>
        <button class="preview-close" @click="showPreviewDialog = false">
          ✕
        </button>
      </div>
      <div class="preview-body">
        <img
          :src="displayImageUrl(previewSlot)"
          style="
            max-width: 100%;
            max-height: 75vh;
            display: block;
            margin: 0 auto;
          "
        />
      </div>
    </div>
  </v-dialog>

  <v-dialog v-model="showResetDialog" max-width="380px" persistent>
    <v-card class="rounded-lg">
      <v-card-title
        class="pa-3 bg-error text-white"
        style="font-size: 13px; font-weight: 700"
      >
        Konfirmasi Reset Gambar
      </v-card-title>
      <v-card-text class="pa-4" style="font-size: 12px">
        Yakin akan reset (hapus) ketiga gambar lampiran?
      </v-card-text>
      <v-card-actions class="pa-3 border-t">
        <v-spacer />
        <v-btn variant="text" size="small" @click="showResetDialog = false"
          >Batal</v-btn
        >
        <v-btn
          variant="flat"
          size="small"
          color="error"
          @click="confirmResetImages"
          >Ya, Reset</v-btn
        >
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.cc-layout {
  display: flex;
  gap: 10px;
  height: 100%;
  overflow-y: auto;
  padding: 6px;
  font-family: "Segoe UI", system-ui, sans-serif;
  font-size: 12px;
}
.cc-left {
  width: 420px;
  flex-shrink: 0;
}
.cc-right {
  flex: 1;
  min-width: 0;
}
.cc-section {
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  padding: 10px 12px;
}
.cc-section.h-full {
  height: 100%;
  box-sizing: border-box;
}
.mt-1 {
  margin-top: 4px;
}
.mt-2 {
  margin-top: 8px;
}
.mr-1 {
  margin-right: 4px;
}

.section-title {
  font-size: 10px;
  font-weight: 700;
  color: #1565c0;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  padding-bottom: 4px;
  border-bottom: 1px solid #e3f2fd;
  margin-bottom: 6px;
}

.fr {
  display: flex;
  align-items: center;
  gap: 6px;
  min-height: 26px;
  margin-bottom: 5px;
}
.fr-col {
  display: flex;
  flex-direction: column;
  gap: 3px;
}
.lbl {
  width: 90px;
  flex-shrink: 0;
  font-size: 11px;
  font-weight: 600;
  color: #333;
}
.lbl.w80 {
  width: 60px;
}
.lbl-block {
  font-size: 11px;
  font-weight: 700;
  color: #333;
}

.inp {
  flex: 1;
  height: 26px;
  border: 1px solid #a0a0a0;
  padding: 0 6px;
  font-size: 12px;
  background: white;
  outline: none;
  border-radius: 3px;
  color: #212121;
}
.inp:focus {
  border-color: #1565c0;
}
.inp.ro {
  background: #f0f0f0 !important;
  color: #555;
}
.inp.sel {
  cursor: pointer;
}
.fw {
  font-weight: 700;
  color: #c62828;
}

.idate {
  height: 26px;
  border: 1px solid #a0a0a0;
  padding: 0 5px;
  font-size: 12px;
  border-radius: 3px;
  outline: none;
  width: 160px;
}

.ta {
  width: 100%;
  border: 1px solid #a0a0a0;
  border-radius: 3px;
  padding: 6px 8px;
  font-size: 12px;
  outline: none;
  resize: vertical;
  font-family: inherit;
  box-sizing: border-box;
}
.ta:focus {
  border-color: #1565c0;
}

.igrp {
  flex: 1;
  display: flex;
  border: 1px solid #a0a0a0;
  border-radius: 3px;
  overflow: hidden;
  height: 26px;
}
.igrp .inp {
  border: none;
  height: 100%;
  border-radius: 0;
}
.ci-btn {
  width: 28px;
  min-width: 28px;
  background: #e3f2fd;
  border: none;
  border-left: 1px solid #a0a0a0;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #1565c0;
}
.ci-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.divider {
  height: 1px;
  background: #e0e0e0;
  margin: 6px 0;
}

.img-slot-row {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 6px;
}
.btn-slot {
  background: #78909c;
  color: white;
  border: none;
  border-radius: 3px;
  padding: 4px 10px;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
}
.btn-slot.blue {
  background: #1565c0;
}
.btn-slot:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
.img-ok {
  font-size: 11px;
  color: #2e7d32;
  font-weight: 600;
}
.btn-reset {
  background: #ef6c00;
  color: white;
  border: none;
  border-radius: 3px;
  padding: 5px 12px;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
}

.preview-card {
  background: white;
  border-radius: 8px;
  overflow: hidden;
}
.preview-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #1565c0;
  color: white;
  padding: 9px 14px;
  font-size: 13px;
  font-weight: 700;
}
.preview-close {
  background: transparent;
  border: none;
  color: rgba(255, 255, 255, 0.8);
  font-size: 16px;
  cursor: pointer;
}
.preview-body {
  padding: 16px;
  background: #f5f5f5;
}
</style>
