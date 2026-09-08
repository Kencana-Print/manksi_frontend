<script setup lang="ts">
import { ref, computed, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useToast } from "vue-toastification";
import BaseForm from "@/components/BaseForm.vue";
import { useForm } from "@/composables/useForm";
import { lhkPolaFormService } from "@/services/garmen/lhkPolaFormService";
import SpkPolaSearchModal from "@/components/lookups/SpkPolaSearchModal.vue";
import SpkSearchModal from "@/components/lookups/SpkSearchModal.vue";
import { IconRuler2, IconSearch, IconTrash } from "@tabler/icons-vue";
import api from "@/services/api";

const route = useRoute();
const router = useRouter();
const toast = useToast();
const isEditMode = computed(() => !!route.params.nomor);

const gradingImageFiles = ref<Record<string, File>>({});

const emptyGradingRow = () => ({
  spkNomor: "",
  namaSpk: "",
  divisi: "",
  gradingSize: "",
  panjang: null as number | null,
  lebar: null as number | null,
  keterangan: "",
  gambar: "",
});

const defaultData = {
  nomor: "",
  tanggal: new Date().toISOString().substring(0, 10),
  keterangan: "",
  pembuatPola: "",
  grading: [emptyGradingRow()],
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
  menuId: "174",
  initialData: defaultData,
  fetchApi: async () => {
    const nomor = String(route.params.nomor);
    const res = await lhkPolaFormService.getDetail(nomor);
    const d = res.data.data;
    return {
      nomor: d.header.lhkp_nomor,
      tanggal: String(d.header.lhkp_tanggal).substring(0, 10),
      keterangan: d.header.lhkp_keterangan || "",
      pembuatPola: d.header.pembuatPola || "",
      grading:
        d.grading.length > 0
          ? d.grading.map((r: any) => ({
              spkNomor: r.spkNomor,
              namaSpk: r.namaSpk || "",
              divisi: r.divisi || "",
              gradingSize: r.gradingSize || "",
              panjang:
                r.panjang !== null && r.panjang !== undefined
                  ? Number(r.panjang)
                  : null,
              lebar:
                r.lebar !== null && r.lebar !== undefined
                  ? Number(r.lebar)
                  : null,
              keterangan: r.keterangan || "",
              gambar: r.gambar || "",
            }))
          : [emptyGradingRow()],
    };
  },
  submitApi: async (data: any) => {
    const payload = {
      tanggal: data.tanggal,
      keterangan: data.keterangan,
      pembuatPola: data.pembuatPola,
      grading: data.grading,
    };
    const res = isEditMode.value
      ? await lhkPolaFormService.update(String(route.params.nomor), payload)
      : await lhkPolaFormService.create(payload);
    const savedNomor = res.data.data.nomor;
    try {
      for (const [spkNomor, file] of Object.entries(gradingImageFiles.value)) {
        await lhkPolaFormService.uploadGambar(
          file,
          savedNomor,
          "grading",
          spkNomor,
        );
      }
    } catch (imgError: any) {
      toast.warning(
        `Data tersimpan, namun ada gambar gagal terupload: ${imgError.message}`,
      );
    }
    return res;
  },
  onSuccess: () => {
    toast.success(
      isEditMode.value
        ? "LHK Pola berhasil diupdate."
        : "LHK Pola berhasil disimpan.",
    );
    router.push({ name: "LhkPolaBrowse" });
  },
});

// Auto-generate Keterangan dari gabungan Nama SPK yang terisi,
// supaya browse langsung menampilkan konteks tanpa user ketik manual.
watch(
  () => formData.value.grading.map((r: any) => r.namaSpk).join("|"),
  () => {
    const namaList = formData.value.grading
      .map((r: any) => r.namaSpk)
      .filter((n: string) => n && n.trim());
    const unique = [...new Set(namaList)];
    if (unique.length > 0) {
      formData.value.keterangan = unique.join(", ");
    }
  },
);

const ensureTrailingGradingRow = () => {
  const list = formData.value.grading;
  const last = list[list.length - 1];
  if (list.length === 0 || (last && last.spkNomor.trim())) {
    list.push(emptyGradingRow());
  }
};
const removeGradingRow = (idx: number) => {
  formData.value.grading.splice(idx, 1);
  if (formData.value.grading.length === 0) ensureTrailingGradingRow();
};

const showSpkModal = ref(false);
const spkModalIdx = ref<number>(-1);
const openSpkModal = (idx: number) => {
  spkModalIdx.value = idx;
  showSpkModal.value = true;
};
const checkDuplicateSpk = (nomor: string, excludeIdx: number) =>
  formData.value.grading.some(
    (r: any, i: number) => i !== excludeIdx && r.spkNomor === nomor,
  );
const onSpkSelected = (item: any) => {
  const idx = spkModalIdx.value;
  if (idx < 0) return;
  if (checkDuplicateSpk(item.Nomor, idx)) {
    toast.warning(`SPK ${item.Nomor} sudah ada di baris lain.`);
    return;
  }
  formData.value.grading[idx].spkNomor = item.Nomor;
  formData.value.grading[idx].namaSpk = item.Nama;
  lookupDivisiForRow(idx);
  ensureTrailingGradingRow();
};
const lookupDivisiForRow = async (idx: number) => {
  const row = formData.value.grading[idx];
  if (!row.spkNomor) return;
  try {
    const res = await lhkPolaFormService.getSpkByNomor(row.spkNomor);
    formData.value.grading[idx].divisi = res.data.data.DivisiNama || "";
  } catch {
    formData.value.grading[idx].divisi = "";
  }
};
const onGradingSpkEnter = async (idx: number) => {
  const nomor = formData.value.grading[idx].spkNomor.trim();
  if (!nomor) return;
  if (checkDuplicateSpk(nomor, idx)) {
    toast.warning(`SPK ${nomor} sudah ada di baris lain.`);
    formData.value.grading[idx].spkNomor = "";
    return;
  }
  try {
    const res = await lhkPolaFormService.getSpkByNomor(nomor);
    formData.value.grading[idx].namaSpk = res.data.data.Nama;
    formData.value.grading[idx].divisi = res.data.data.DivisiNama || "";
    ensureTrailingGradingRow();
  } catch {
    toast.error(`SPK/MAP "${nomor}" tidak ditemukan.`);
    formData.value.grading[idx].spkNomor = "";
    formData.value.grading[idx].namaSpk = "";
    formData.value.grading[idx].divisi = "";
  }
};

const onGradingImageChange = (e: Event, idx: number) => {
  const file = (e.target as HTMLInputElement).files?.[0];
  const row = formData.value.grading[idx];
  if (!file || !row.spkNomor) return;
  if (file.size > 1_000_000) {
    toast.error("Ukuran gambar tidak boleh > 1 Mb.");
    return;
  }
  gradingImageFiles.value[row.spkNomor] = file;
  row.gambar = URL.createObjectURL(file);
};
const getGambarUrl = (row: any) => {
  if (!row.gambar) return "";
  if (row.gambar.startsWith("blob:")) return row.gambar;
  const base = api.defaults.baseURL?.replace(/\/api\/?$/, "") || "";
  return `${base}/images/lhkpola/${encodeURIComponent(row.gambar)}`;
};

const showImagePreview = ref(false);
const previewImageUrl = ref("");
const openImagePreview = (row: any) => {
  const url = getGambarUrl(row);
  if (!url) return;
  previewImageUrl.value = url;
  showImagePreview.value = true;
};

const validateSave = () => {
  if (!formData.value.tanggal) {
    toast.warning("Tanggal wajib diisi.");
    return;
  }
  const gradingFilled = formData.value.grading.filter((r: any) =>
    r.spkNomor.trim(),
  );
  if (gradingFilled.length === 0) {
    toast.warning("Minimal harus ada 1 baris SPK terisi di Pola/Grading.");
    return;
  }
  const invalidRow = gradingFilled.find(
    (r: any) =>
      r.panjang === null ||
      r.panjang === "" ||
      r.lebar === null ||
      r.lebar === "",
  );
  if (invalidRow) {
    toast.warning(
      `Panjang dan Lebar wajib diisi untuk SPK ${invalidRow.spkNomor}.`,
    );
    return;
  }
  showSaveDialog.value = true;
};
</script>

<template>
  <BaseForm
    :title="isEditMode ? 'Ubah LHK Pola' : 'Buat LHK Pola'"
    menu-id="174"
    :icon="IconRuler2"
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
    <div class="lp-container">
      <div class="lp-header-card">
        <div class="fr">
          <label class="lbl">No. LHK Pola</label>
          <input
            :value="formData.nomor || '(Otomatis)'"
            readonly
            class="inp ro"
            style="width: 180px"
          />
          <label class="lbl ml-3" style="width: 60px">Tanggal</label>
          <input
            type="date"
            v-model="formData.tanggal"
            class="inp"
            style="width: 160px"
          />
        </div>
        <div class="fr">
          <label class="lbl">Keterangan</label>
          <input v-model="formData.keterangan" class="inp" style="flex: 1" />
        </div>
        <div class="fr">
          <label class="lbl">Pembuat</label>
          <input
            v-model="formData.pembuatPola"
            class="inp"
            style="flex: 1"
            placeholder="Nama pembuat pola..."
          />
        </div>
      </div>

      <div class="lp-tab-body">
        <table class="lp-table">
          <thead>
            <tr>
              <th style="width: 32px">No</th>
              <th style="width: 150px">No. SPK</th>
              <th>Nama SPK</th>
              <th style="width: 110px">Divisi</th>
              <th style="width: 140px">Grading Size</th>
              <th style="width: 90px">Panjang (cm)</th>
              <th style="width: 90px">Lebar (cm)</th>
              <th style="width: 180px">Keterangan</th>
              <th style="width: 90px">Gambar</th>
              <th style="width: 36px"></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(row, idx) in formData.grading" :key="idx">
              <td class="tc">{{ Number(idx) + 1 }}</td>
              <td>
                <div class="igrp">
                  <input
                    v-model="row.spkNomor"
                    class="cell-inp"
                    placeholder="F1/Enter cari..."
                    @keydown.enter.prevent="onGradingSpkEnter(Number(idx))"
                    @keydown.f1.prevent="openSpkModal(Number(idx))"
                  />
                  <button
                    type="button"
                    class="btn-lkp"
                    @click="openSpkModal(Number(idx))"
                  >
                    <IconSearch :size="12" color="#1565c0" />
                  </button>
                </div>
              </td>
              <td>
                <input :value="row.namaSpk" readonly class="cell-inp ro" />
              </td>
              <td>
                <input :value="row.divisi" readonly class="cell-inp ro" />
              </td>
              <td>
                <input
                  v-model="row.gradingSize"
                  class="cell-inp"
                  placeholder="S,M,L,XL"
                />
              </td>
              <td>
                <input
                  v-model.number="row.panjang"
                  type="number"
                  step="0.01"
                  min="0"
                  class="cell-inp"
                  :class="{
                    'cell-inp--required':
                      row.spkNomor &&
                      (row.panjang === null || row.panjang === ''),
                  }"
                />
              </td>
              <td>
                <input
                  v-model.number="row.lebar"
                  type="number"
                  step="0.01"
                  min="0"
                  class="cell-inp"
                  :class="{
                    'cell-inp--required':
                      row.spkNomor && (row.lebar === null || row.lebar === ''),
                  }"
                />
              </td>
              <td>
                <input v-model="row.keterangan" class="cell-inp" />
              </td>
              <td>
                <div class="cell-img-cell">
                  <img
                    v-if="getGambarUrl(row)"
                    :src="getGambarUrl(row)"
                    class="cell-thumb"
                    style="cursor: pointer"
                    @click="openImagePreview(row)"
                    @error="
                      (e) =>
                        ((e.target as HTMLImageElement).style.display = 'none')
                    "
                  />
                  <input
                    type="file"
                    accept="image/*"
                    class="cell-file-inp"
                    :disabled="!row.spkNomor"
                    @change="onGradingImageChange($event, Number(idx))"
                  />
                </div>
              </td>
              <td class="tc">
                <button
                  v-if="formData.grading.length > 1"
                  type="button"
                  class="btn-del"
                  @click="removeGradingRow(Number(idx))"
                >
                  <IconTrash :size="13" color="#c62828" />
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <SpkSearchModal
      v-model="showSpkModal"
      filter-mode="spk-map"
      @selected="onSpkSelected"
    />

    <v-dialog v-model="showImagePreview" max-width="800px">
      <div class="preview-card">
        <div class="preview-header">
          <span>Preview Gambar</span>
          <button class="preview-close" @click="showImagePreview = false">
            ✕
          </button>
        </div>
        <div class="preview-body">
          <v-img
            :src="previewImageUrl"
            max-height="600"
            contain
            class="bg-white rounded"
          >
            <template #placeholder>
              <div class="d-flex align-center justify-center fill-height">
                <v-progress-circular indeterminate color="primary" />
              </div>
            </template>
            <template #error>
              <div
                class="d-flex align-center justify-center fill-height text-grey"
              >
                Gambar tidak tersedia
              </div>
            </template>
          </v-img>
        </div>
      </div>
    </v-dialog>
  </BaseForm>
</template>

<style scoped>
.lp-container {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 10px;
  height: 100%;
  overflow-y: auto;
  font-family: "Segoe UI", system-ui, sans-serif;
  font-size: 11px;
}
.lp-header-card {
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  padding: 10px 14px;
}
.fr {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 6px;
  min-height: 26px;
}
.fr:last-child {
  margin-bottom: 0;
}
.lbl {
  width: 90px;
  flex-shrink: 0;
  font-weight: 600;
  color: #424242;
}
.ml-3 {
  margin-left: 12px;
}
.inp {
  height: 26px;
  border: 1px solid #bdbdbd;
  border-radius: 3px;
  padding: 0 6px;
  font-size: 11px;
  outline: none;
}
.inp:focus {
  border-color: #1565c0;
}
.ro {
  background: #f0f0f0;
  color: #616161;
}
.lp-tab-body {
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  padding: 8px;
  flex: 1;
  overflow: auto;
}
.lp-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 11px;
}
.lp-table thead th {
  background: #f5f5f5;
  padding: 6px 8px;
  font-weight: 700;
  text-align: left;
  border-bottom: 1px solid #e0e0e0;
  white-space: nowrap;
}
.lp-table tbody td {
  padding: 3px 6px;
  border-bottom: 1px solid #eee;
}
.tc {
  text-align: center;
}
.cell-inp {
  width: 100%;
  height: 26px;
  border: 1px solid #bdbdbd;
  border-radius: 3px;
  padding: 0 6px;
  font-size: 11px;
  outline: none;
  box-sizing: border-box;
}
.cell-inp:focus {
  border-color: #1565c0;
}
.cell-inp.ro {
  background: #f0f0f0;
  color: #616161;
}
.igrp {
  display: flex;
  border: 1px solid #bdbdbd;
  border-radius: 3px;
  overflow: hidden;
  height: 26px;
}
.igrp .cell-inp {
  border: none;
  height: 24px;
}
.btn-lkp {
  width: 24px;
  min-width: 24px;
  background: #e3f2fd;
  border: none;
  border-left: 1px solid #bdbdbd;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}
.btn-lkp:hover {
  background: #bbdefb;
}
.btn-del {
  background: #ffebee;
  border: 1px solid #ef9a9a;
  border-radius: 3px;
  padding: 3px 6px;
  cursor: pointer;
}
.btn-del:hover {
  background: #ffcdd2;
}
.cell-img-cell {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}
.cell-thumb {
  width: 40px;
  height: 40px;
  object-fit: cover;
  border: 1px solid #ddd;
  border-radius: 3px;
}
.cell-file-inp {
  font-size: 9px;
  width: 90px;
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
.preview-close:hover {
  color: white;
}
.preview-body {
  padding: 16px;
  background: #f5f5f5;
}
.cell-inp--required {
  border-color: #ef5350;
  background: #fff5f5;
}
</style>
