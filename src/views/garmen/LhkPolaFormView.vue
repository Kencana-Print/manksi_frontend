<script setup lang="ts">
import { ref, computed, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useToast } from "vue-toastification";
import BaseForm from "@/components/BaseForm.vue";
import { useForm } from "@/composables/useForm";
import { lhkPolaFormService } from "@/services/garmen/lhkPolaFormService";
import SpkPolaSearchModal from "@/components/lookups/SpkPolaSearchModal.vue";
import { IconRuler2, IconSearch, IconTrash, IconPlus } from "@tabler/icons-vue";
import api from "@/services/api";

const route = useRoute();
const router = useRouter();
const toast = useToast();

const isEditMode = computed(() => !!route.params.nomor);
const activeTab = ref(0);

// Tambah state file holder — per baris, keyed by spkNomor
const markerImageFiles = ref<Record<string, File>>({});
const gradingImageFiles = ref<Record<string, File>>({});

const emptyMarkerRow = () => ({
  spkNomor: "",
  namaSpk: "",
  lebarKain: "",
  size: "",
  tujuanProses: "",
  keterangan: "",
  gambar: "",
});
const emptyGradingRow = () => ({
  spkNomor: "",
  namaSpk: "",
  divisi: "",
  gradingSize: "",
  keterangan: "",
  gambar: "",
});

const defaultData = {
  nomor: "",
  tanggal: new Date().toISOString().substring(0, 10),
  keterangan: "",
  marker: [emptyMarkerRow()],
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
      marker:
        d.marker.length > 0
          ? d.marker.map((r: any) => ({
              spkNomor: r.spkNomor,
              namaSpk: r.namaSpk || "",
              lebarKain: r.lebarKain || "",
              size: r.size || "",
              tujuanProses: r.tujuanProses || "",
              keterangan: r.keterangan || "",
              gambar: r.gambar || "",
            }))
          : [emptyMarkerRow()],
      grading:
        d.grading.length > 0
          ? d.grading.map((r: any) => ({
              spkNomor: r.spkNomor,
              namaSpk: r.namaSpk || "",
              divisi: r.divisi || "",
              gradingSize: r.gradingSize || "",
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
      marker: data.marker,
      grading: data.grading,
    };
    const res = isEditMode.value
      ? await lhkPolaFormService.update(String(route.params.nomor), payload)
      : await lhkPolaFormService.create(payload);

    const savedNomor = res.data.data.nomor;

    // Upload gambar per baris yang ada file baru dipilih
    try {
      for (const [spkNomor, file] of Object.entries(markerImageFiles.value)) {
        await lhkPolaFormService.uploadGambar(
          file,
          savedNomor,
          "marker",
          spkNomor,
        );
      }
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

// ── Trailing empty row — auto nambah baris kosong saat baris terakhir mulai diisi ──
const ensureTrailingMarkerRow = () => {
  const list = formData.value.marker;
  const last = list[list.length - 1];
  if (list.length === 0 || (last && last.spkNomor.trim())) {
    list.push(emptyMarkerRow());
  }
};
const ensureTrailingGradingRow = () => {
  const list = formData.value.grading;
  const last = list[list.length - 1];
  if (list.length === 0 || (last && last.spkNomor.trim())) {
    list.push(emptyGradingRow());
  }
};

const removeMarkerRow = (idx: number) => {
  formData.value.marker.splice(idx, 1);
  if (formData.value.marker.length === 0) ensureTrailingMarkerRow();
};
const removeGradingRow = (idx: number) => {
  formData.value.grading.splice(idx, 1);
  if (formData.value.grading.length === 0) ensureTrailingGradingRow();
};

// ── Lookup SPK — modal & manual entry (F1/Enter) ──────────────────────
const showSpkModal = ref(false);
const spkModalTarget = ref<{ tab: "marker" | "grading"; idx: number } | null>(
  null,
);

const openSpkModal = (tab: "marker" | "grading", idx: number) => {
  spkModalTarget.value = { tab, idx };
  showSpkModal.value = true;
};

const checkDuplicateSpk = (
  tab: "marker" | "grading",
  nomor: string,
  excludeIdx: number,
) => {
  const list =
    tab === "marker" ? formData.value.marker : formData.value.grading;
  return list.some(
    (r: any, i: number) => i !== excludeIdx && r.spkNomor === nomor,
  );
};

const onSpkSelected = (item: any) => {
  if (!spkModalTarget.value) return;
  const { tab, idx } = spkModalTarget.value;

  if (checkDuplicateSpk(tab, item.Nomor, idx)) {
    toast.warning(`SPK ${item.Nomor} sudah ada di baris lain.`);
    return;
  }

  if (tab === "marker") {
    formData.value.marker[idx].spkNomor = item.Nomor;
    formData.value.marker[idx].namaSpk = item.Nama;
    ensureTrailingMarkerRow();
  } else {
    formData.value.grading[idx].spkNomor = item.Nomor;
    formData.value.grading[idx].namaSpk = item.Nama;
    lookupDivisiForRow(idx);
    ensureTrailingGradingRow();
  }
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

// Manual entry: user ketik nomor SPK langsung + Enter (tanpa modal)
const onMarkerSpkEnter = async (idx: number) => {
  const nomor = formData.value.marker[idx].spkNomor.trim();
  if (!nomor) return;
  if (checkDuplicateSpk("marker", nomor, idx)) {
    toast.warning(`SPK ${nomor} sudah ada di baris lain.`);
    formData.value.marker[idx].spkNomor = "";
    return;
  }
  try {
    const res = await lhkPolaFormService.getSpkByNomor(nomor);
    formData.value.marker[idx].namaSpk = res.data.data.Nama;
    ensureTrailingMarkerRow();
  } catch {
    toast.error(`SPK/MAP "${nomor}" tidak ditemukan.`);
    formData.value.marker[idx].spkNomor = "";
    formData.value.marker[idx].namaSpk = "";
  }
};

const onGradingSpkEnter = async (idx: number) => {
  const nomor = formData.value.grading[idx].spkNomor.trim();
  if (!nomor) return;
  if (checkDuplicateSpk("grading", nomor, idx)) {
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

const onMarkerImageChange = (e: Event, idx: number) => {
  const file = (e.target as HTMLInputElement).files?.[0];
  const row = formData.value.marker[idx];
  if (!file || !row.spkNomor) return;
  if (file.size > 1_000_000) {
    toast.error("Ukuran gambar tidak boleh > 1 Mb.");
    return;
  }
  markerImageFiles.value[row.spkNomor] = file;
  row.gambar = URL.createObjectURL(file); // preview sementara
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
  if (row.gambar.startsWith("blob:")) return row.gambar; // preview lokal
  const base = api.defaults.baseURL?.replace(/\/api\/?$/, "") || "";
  return `${base}/images/lhkpola/${encodeURIComponent(row.gambar)}`;
};

// ── Validasi sebelum simpan ────────────────────────────────────────────
const validateSave = () => {
  if (!formData.value.tanggal) {
    toast.warning("Tanggal wajib diisi.");
    return;
  }
  const markerFilled = formData.value.marker.filter((r: any) =>
    r.spkNomor.trim(),
  );
  const gradingFilled = formData.value.grading.filter((r: any) =>
    r.spkNomor.trim(),
  );
  if (markerFilled.length === 0 && gradingFilled.length === 0) {
    toast.warning(
      "Minimal harus ada 1 baris SPK terisi (di tab Marker/Mika/Duplek atau Pola/Grading).",
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
      <!-- ── Header ── -->
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
      </div>

      <!-- ── Tab Nav ── -->
      <div class="lp-tab-nav">
        <button
          class="lp-tab-btn"
          :class="{ active: activeTab === 0 }"
          @click="activeTab = 0"
        >
          Marker / Mika / Duplek
        </button>
        <button
          class="lp-tab-btn"
          :class="{ active: activeTab === 1 }"
          @click="activeTab = 1"
        >
          Pola / Grading
        </button>
      </div>

      <!-- ── Tab: Marker/Mika/Duplek ── -->
      <div v-show="activeTab === 0" class="lp-tab-body">
        <table class="lp-table">
          <thead>
            <tr>
              <th style="width: 32px">No</th>
              <th style="width: 150px">No. SPK</th>
              <th>Nama SPK</th>
              <th style="width: 100px">Lebar Kain</th>
              <th style="width: 110px">Size</th>
              <th style="width: 100px">For</th>
              <th style="width: 160px">Keterangan</th>
              <th style="width: 90px">Gambar</th>
              <th style="width: 36px"></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(row, idx) in formData.marker" :key="idx">
              <td class="tc">{{ Number(idx) + 1 }}</td>
              <td>
                <div class="igrp">
                  <input
                    v-model="row.spkNomor"
                    class="cell-inp"
                    placeholder="F1/Enter cari..."
                    @keydown.enter.prevent="onMarkerSpkEnter(Number(idx))"
                    @keydown.f1.prevent="openSpkModal('marker', Number(idx))"
                  />
                  <button
                    type="button"
                    class="btn-lkp"
                    @click="openSpkModal('marker', Number(idx))"
                  >
                    <IconSearch :size="12" color="#1565c0" />
                  </button>
                </div>
              </td>
              <td>
                <input :value="row.namaSpk" readonly class="cell-inp ro" />
              </td>
              <td>
                <input
                  v-model="row.lebarKain"
                  class="cell-inp"
                  placeholder="147CM"
                />
              </td>
              <td>
                <input
                  v-model="row.size"
                  class="cell-inp"
                  placeholder="M,L,XL"
                />
              </td>
              <td>
                <input
                  v-model="row.tujuanProses"
                  class="cell-inp"
                  placeholder="CUTTING"
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
                    @change="onMarkerImageChange($event, Number(idx))"
                  />
                </div>
              </td>
              <td class="tc">
                <button
                  v-if="formData.marker.length > 1"
                  type="button"
                  class="btn-del"
                  @click="removeMarkerRow(Number(idx))"
                >
                  <IconTrash :size="13" color="#c62828" />
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- ── Tab: Pola/Grading ── -->
      <div v-show="activeTab === 1" class="lp-tab-body">
        <table class="lp-table">
          <thead>
            <tr>
              <th style="width: 32px">No</th>
              <th style="width: 150px">No. SPK</th>
              <th>Nama SPK</th>
              <th style="width: 110px">Divisi</th>
              <th style="width: 160px">Grading Size</th>
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
                    @keydown.f1.prevent="openSpkModal('grading', Number(idx))"
                  />
                  <button
                    type="button"
                    class="btn-lkp"
                    @click="openSpkModal('grading', Number(idx))"
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
                <input v-model="row.keterangan" class="cell-inp" />
              </td>
              <td>
                <div class="cell-img-cell">
                  <img
                    v-if="getGambarUrl(row)"
                    :src="getGambarUrl(row)"
                    class="cell-thumb"
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

    <SpkPolaSearchModal v-model="showSpkModal" @selected="onSpkSelected" />
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
.lp-tab-nav {
  display: flex;
  gap: 4px;
  border-bottom: 2px solid #bdbdbd;
  flex-shrink: 0;
}
.lp-tab-btn {
  padding: 7px 16px;
  font-size: 11px;
  font-weight: 600;
  color: #555;
  background: #eee;
  border: 1px solid #ccc;
  border-bottom: none;
  border-radius: 4px 4px 0 0;
  cursor: pointer;
}
.lp-tab-btn.active {
  background: white;
  color: #1565c0;
  border-color: #bdbdbd;
  margin-bottom: -2px;
  border-bottom: 2px solid white;
}
.lp-tab-body {
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 0 0 6px 6px;
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
</style>
