<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useToast } from "vue-toastification";
import { useAuthStore } from "@/stores/authStore";
import BaseForm from "@/components/BaseForm.vue";
import { useForm } from "@/composables/useForm";
import { maklonBarangFormService } from "@/services/garmen/maklonBarangFormService";
import {
  IconArrowsExchange,
  IconSearch,
  IconPhotoPlus,
  IconTrash,
  IconAlertTriangle,
  IconChevronDown,
  IconChevronUp,
  IconPlus,
} from "@tabler/icons-vue";
import BarangGarmenSearchModal from "@/components/lookups/BarangGarmenSearchModal.vue";

interface GambarRow {
  file_path: string; // server URL (existing) ATAU blob: URL (baru dipilih, belum tersimpan)
  keterangan: string;
  file?: File; // ⬅ BARU: File mentah, cuma ada kalau gambar ini belum ke-upload
  pendingKey?: string; // ⬅ BARU: id unik, dipakai backend buat matching file
}
interface TargetJadiRow {
  kode_jadi: string;
  nama_jadi: string;
  estimasi_qty: number | string;
  gambar: GambarRow[];
}
interface DetailRow {
  mkld_id?: number;
  kode_polos: string;
  nama_polos: string;
  is_freetext: boolean;
  nama_polos_manual: string;
  qty_kirim: number | string;
  satuan_kirim: string;
  keterangan: string;
  target_jadi: TargetJadiRow[];
  expanded: boolean;
}
interface MaklonFormData {
  Nomor: string;
  Tanggal: string;
  CabAsal: string;
  CabTujuan: string;
  Deadline: string;
  Keterangan: string;
  Status: string;
  Details: DetailRow[];
}

const route = useRoute();
const router = useRouter();
const toast = useToast();
const authStore = useAuthStore();

const isEditMode = computed(() => !!route.params.nomor);
const todayLocal = new Date().toISOString().slice(0, 10);

const emptyTargetJadi = (): TargetJadiRow => ({
  kode_jadi: "",
  nama_jadi: "",
  estimasi_qty: 0,
  gambar: [],
});

const emptyDetailRow = (): DetailRow => ({
  kode_polos: "",
  nama_polos: "",
  is_freetext: false,
  nama_polos_manual: "",
  qty_kirim: 0,
  satuan_kirim: "",
  keterangan: "",
  target_jadi: [emptyTargetJadi()],
  expanded: true,
});

const defaultData: MaklonFormData = {
  Nomor: "",
  Tanggal: todayLocal,
  CabAsal: authStore.userCabang?.replace("-", "") || "",
  CabTujuan: "",
  Deadline: "",
  Keterangan: "",
  Status: "",
  Details: [],
};

const {
  isLoading,
  isSaving,
  showSaveDialog,
  showCancelDialog,
  showCloseDialog,
  formData,
  fetchData,
  executeSave,
  executeCancel,
  executeClose,
} = useForm<MaklonFormData>({
  menuId: "181",
  initialData: defaultData,
  fetchApi: async (): Promise<MaklonFormData> => {
    const res = await maklonBarangFormService.getById(
      String(route.params.nomor),
    );
    const { header: h, details: d } = res.data.data;
    return {
      Nomor: h.mkl_nomor,
      Tanggal: String(h.mkl_tanggal).slice(0, 10),
      CabAsal: h.mkl_cab_asal,
      CabTujuan: h.mkl_cab_tujuan,
      Deadline: h.mkl_deadline ? String(h.mkl_deadline).slice(0, 10) : "",
      Keterangan: h.mkl_keterangan || "",
      Status: h.mkl_status,
      Details: (d || []).map((row: any) => ({
        mkld_id: row.mkld_id,
        kode_polos: row.mkld_kode_polos,
        nama_polos: row.NamaPolos || "",
        is_freetext: !!row.mkld_is_freetext,
        nama_polos_manual: row.mkld_is_freetext ? row.NamaPolos || "" : "",
        qty_kirim: row.mkld_qty_kirim,
        satuan_kirim: row.mkld_satuan_kirim,
        keterangan: row.mkld_keterangan || "",
        expanded: false,
        target_jadi: (row.target_jadi || []).map((t: any) => ({
          kode_jadi: t.mkldj_kode_jadi,
          nama_jadi: t.NamaJadi || "",
          estimasi_qty: t.mkldj_estimasi_qty,
          gambar: (t.gambar || []).map((g: any) => ({
            file_path: g.mklg_file_path,
            keterangan: g.mklg_keterangan,
          })),
        })),
      })),
    };
  },
  submitApi: async (data: MaklonFormData) => {
    const detailsPayload = data.Details.map((r) => ({
      kode_polos: r.is_freetext ? r.nama_polos_manual : r.kode_polos,
      is_freetext: r.is_freetext,
      nama_polos_manual: r.nama_polos_manual,
      qty_kirim: Number(r.qty_kirim) || 0,
      satuan_kirim: r.satuan_kirim,
      keterangan: r.keterangan,
      target_jadi: r.target_jadi
        .filter((t) => t.kode_jadi)
        .map((t) => ({
          kode_jadi: t.kode_jadi,
          estimasi_qty: Number(t.estimasi_qty) || 0,
          // ⬅ DIUBAH: gambar yang punya `file` (belum ke-upload) dikirim
          // sebagai { pendingKey, keterangan } saja — bukan file_path blob
          // yang tidak berarti apa-apa buat backend. Gambar lama (edit
          // mode, sudah ada di server) tetap kirim file_path aslinya.
          gambar: t.gambar.map((g) =>
            g.file
              ? { pendingKey: g.pendingKey, keterangan: g.keterangan }
              : { file_path: g.file_path, keterangan: g.keterangan },
          ),
        })),
    }));

    const fd = new FormData();
    fd.append(
      "header",
      JSON.stringify({
        mkl_nomor: isEditMode.value ? data.Nomor : undefined,
        mkl_tanggal: data.Tanggal,
        mkl_cab_asal: data.CabAsal,
        mkl_cab_tujuan: data.CabTujuan,
        mkl_deadline: data.Deadline,
        mkl_keterangan: data.Keterangan,
      }),
    );
    fd.append("details", JSON.stringify(detailsPayload));

    // ⬅ BARU: kumpulkan file mentah + pendingKeys, urutan HARUS sejajar
    // — file di-append ke FormData urut sama persis dengan pendingKeys,
    // karena backend zip dua array ini by index.
    const pendingKeys: string[] = [];
    for (const row of data.Details) {
      for (const t of row.target_jadi) {
        for (const g of t.gambar) {
          if (g.file) {
            fd.append("images", g.file);
            pendingKeys.push(g.pendingKey!);
          }
        }
      }
    }
    fd.append("pendingKeys", JSON.stringify(pendingKeys));

    return await maklonBarangFormService.save(fd);
  },
  onSuccess: (res: any) => {
    const nomor = res?.data?.data?.nomor || "";
    const sjkNomor = res?.data?.data?.sjkNomor || "";
    toast.success(`Maklon Barang ${nomor} berhasil disimpan dan dikirim.`);
    if (nomor && sjkNomor) {
      const url = router.resolve({
        name: "MaklonGabunganPrint",
        params: { nomor, sjkNomor },
      }).href;
      window.open(url, "_blank");
    }
    router.push("/garmen/maklon/makloon-barang");
  },
});

const isLockedByStatus = computed(
  () =>
    !!(
      isEditMode.value &&
      formData.value.Status &&
      formData.value.Status !== "DRAFT"
    ),
);

const gudangOptions = ref<{ Kode: string; Nama: string }[]>([]);
onMounted(async () => {
  try {
    const res = await maklonBarangFormService.getCabangOptions();
    gudangOptions.value = res.data.data;
  } catch {
    console.error("Gagal memuat daftar Cabang.");
  }
  if (isEditMode.value) await fetchData();
});

// ── Baris polos ──
const addRow = () => {
  formData.value.Details.push(emptyDetailRow());
};
const removeRow = (idx: number) => {
  formData.value.Details.splice(idx, 1);
};
const toggleRow = (idx: number) => {
  formData.value.Details[idx].expanded = !formData.value.Details[idx].expanded;
};

const totalQtyKirim = computed(() =>
  formData.value.Details.reduce((s, r) => s + (Number(r.qty_kirim) || 0), 0),
);

// ── Target jadi (per baris polos) ──
const addTargetJadi = (rowIdx: number) => {
  formData.value.Details[rowIdx].target_jadi.push(emptyTargetJadi());
};
const removeTargetJadi = (rowIdx: number, targetIdx: number) => {
  const row = formData.value.Details[rowIdx];
  if (row.target_jadi.length <= 1) {
    toast.warning("Minimal 1 Barang Jadi harus ada per baris.");
    return;
  }
  row.target_jadi.splice(targetIdx, 1);
};

// ── Search modal: Barang Polos & Barang Jadi ──
const showBarangModal = ref(false);
const barangModalTitle = ref("Cari Barang");
const activeRowIdx = ref<number | null>(null);
const activeTargetIdx = ref<number | null>(null);
const activeField = ref<"polos" | "jadi" | null>(null);
const activeBarangCabang = ref("");

const openPolosModal = (rowIdx: number) => {
  if (!formData.value.CabAsal) {
    toast.warning("Pilih Cabang Asal terlebih dahulu.");
    return;
  }
  activeRowIdx.value = rowIdx;
  activeField.value = "polos";
  activeBarangCabang.value = formData.value.CabAsal;
  barangModalTitle.value = "Cari Barang Polos";
  showBarangModal.value = true;
};

const openJadiModal = (rowIdx: number, targetIdx: number) => {
  if (!formData.value.CabTujuan) {
    toast.warning("Pilih Cabang Tujuan terlebih dahulu.");
    return;
  }
  activeRowIdx.value = rowIdx;
  activeTargetIdx.value = targetIdx;
  activeField.value = "jadi";
  activeBarangCabang.value = formData.value.CabTujuan;
  barangModalTitle.value = "Cari Barang Jadi (Rencana)";
  showBarangModal.value = true;
};

const selectBarang = (item: any) => {
  const rowIdx = activeRowIdx.value;
  if (rowIdx === null) return;
  const row = formData.value.Details[rowIdx];

  if (activeField.value === "polos") {
    row.kode_polos = item.Kode;
    row.nama_polos = item.Nama;
    row.satuan_kirim = item.Satuan;
  } else if (activeField.value === "jadi" && activeTargetIdx.value !== null) {
    const target = row.target_jadi[activeTargetIdx.value];
    target.kode_jadi = item.Kode;
    target.nama_jadi = item.Nama;
  }

  showBarangModal.value = false;
  activeRowIdx.value = null;
  activeTargetIdx.value = null;
  activeField.value = null;
};

// ── Upload gambar (per target jadi) ──
const uploadingKey = ref<string | null>(null);
const fileInputRefs = ref<Record<string, HTMLInputElement | null>>({});

const fileInputKey = (rowIdx: number, targetIdx: number) =>
  `${rowIdx}-${targetIdx}`;

const triggerFileInput = (rowIdx: number, targetIdx: number) => {
  fileInputRefs.value[fileInputKey(rowIdx, targetIdx)]?.click();
};

const onFilesSelected = (e: Event, rowIdx: number, targetIdx: number) => {
  const input = e.target as HTMLInputElement;
  if (!input.files || !input.files.length) return;

  const files = Array.from(input.files);
  const target = formData.value.Details[rowIdx].target_jadi[targetIdx];

  files.forEach((file, i) => {
    if (!file.type.startsWith("image/")) {
      toast.error(`${file.name} bukan file gambar, dilewati.`);
      return;
    }
    target.gambar.push({
      file_path: URL.createObjectURL(file),
      keterangan: "",
      file,
      pendingKey: `${rowIdx}-${targetIdx}-${Date.now()}-${i}`,
    });
  });

  input.value = "";
};

const removeGambar = (rowIdx: number, targetIdx: number, gIdx: number) => {
  const g = formData.value.Details[rowIdx].target_jadi[targetIdx].gambar[gIdx];
  if (g.file && g.file_path.startsWith("blob:")) {
    URL.revokeObjectURL(g.file_path);
  }
  formData.value.Details[rowIdx].target_jadi[targetIdx].gambar.splice(gIdx, 1);
};

const openImage = (url: string) => window.open(url, "_blank");

// ── Validasi ──
const validateSave = () => {
  if (!formData.value.CabAsal || !formData.value.CabTujuan) {
    return toast.warning("Cabang Asal dan Cabang Tujuan wajib diisi.");
  }
  if (formData.value.CabAsal === formData.value.CabTujuan) {
    return toast.warning("Cabang Asal dan Cabang Tujuan tidak boleh sama.");
  }
  if (!formData.value.Deadline) {
    return toast.warning("Deadline wajib diisi.");
  }
  if (formData.value.Details.length === 0) {
    return toast.warning("Minimal 1 baris barang polos harus diisi.");
  }
  for (const [i, r] of formData.value.Details.entries()) {
    if (r.is_freetext) {
      if (!r.nama_polos_manual)
        return toast.warning(
          `Baris ${i + 1}: Nama Barang (manual) wajib diisi.`,
        );
    } else {
      if (!r.kode_polos)
        return toast.warning(`Baris ${i + 1}: Kode Barang Polos wajib diisi.`);
    }
    if (!Number(r.qty_kirim) || Number(r.qty_kirim) <= 0)
      return toast.warning(`Baris ${i + 1}: Qty Kirim harus lebih dari 0.`);
    const validTargets = r.target_jadi.filter((t) => t.kode_jadi);
    if (validTargets.length === 0)
      return toast.warning(
        `Baris ${i + 1}: minimal 1 Barang Jadi harus diisi.`,
      );
  }
  showSaveDialog.value = true;
};

const numFmt = (v: any) =>
  v != null ? Number(v).toLocaleString("id-ID") : "0";
</script>

<template>
  <BaseForm
    :title="isEditMode ? 'Ubah Maklon Barang' : 'Buat Maklon Barang'"
    menu-id="181"
    :icon="IconArrowsExchange"
    :is-loading="isLoading"
    :is-saving="isSaving"
    item-name="Maklon Barang"
    v-model:show-save-dialog="showSaveDialog"
    v-model:show-cancel-dialog="showCancelDialog"
    v-model:show-close-dialog="showCloseDialog"
    @validate-save="validateSave"
    @confirm-save="executeSave"
    @confirm-cancel="executeCancel"
    @confirm-close="executeClose"
  >
    <template #left-column>
      <div class="mkl-left-container desktop-form-section header-section">
        <div v-if="isLockedByStatus" class="mkl-alert warning">
          <IconAlertTriangle :size="14" />
          Maklon ini sudah ada penerimaan (Status: {{ formData.Status }}). Tidak
          bisa diubah.
        </div>

        <div class="fr">
          <label class="lbl">No. Maklon</label>
          <input
            :value="formData.Nomor || '(Otomatis)'"
            readonly
            class="inp ro"
            style="width: 160px"
          />
        </div>
        <div class="fr">
          <label class="lbl">Tanggal</label>
          <input
            type="date"
            v-model="formData.Tanggal"
            class="idate"
            style="width: 160px"
            :disabled="isLockedByStatus"
          />
        </div>
        <div class="fr">
          <label class="lbl">Deadline</label>
          <input
            type="date"
            v-model="formData.Deadline"
            class="idate"
            style="width: 160px"
            :disabled="isLockedByStatus"
          />
        </div>

        <div class="sep mt-1 mb-1" />

        <div class="fr">
          <label class="lbl">Cabang Asal</label>
          <select
            v-model="formData.CabAsal"
            class="inp flex-grow-1"
            :disabled="isLockedByStatus"
          >
            <option value="" disabled>Pilih cabang...</option>
            <option v-for="g in gudangOptions" :key="g.Kode" :value="g.Kode">
              {{ g.Kode }} — {{ g.Nama }}
            </option>
          </select>
        </div>
        <div class="fr">
          <label class="lbl">Cabang Tujuan</label>
          <select
            v-model="formData.CabTujuan"
            class="inp flex-grow-1"
            :disabled="isLockedByStatus"
          >
            <option value="" disabled>Pilih cabang...</option>
            <option v-for="g in gudangOptions" :key="g.Kode" :value="g.Kode">
              {{ g.Kode }} — {{ g.Nama }}
            </option>
          </select>
        </div>

        <div class="sep mt-1 mb-1" />

        <div class="fr" style="align-items: flex-start">
          <label class="lbl">Keterangan</label>
          <textarea
            v-model="formData.Keterangan"
            class="ta flex-grow-1"
            rows="5"
            :disabled="isLockedByStatus"
          />
        </div>
      </div>
    </template>

    <template #right-column>
      <div class="mkl-right desktop-form-section">
        <div class="mkl-right-header">
          <span class="mkl-right-title">Detail Barang Dimaklon</span>
          <button
            type="button"
            class="btn-add"
            :disabled="isLockedByStatus"
            @click="addRow"
          >
            + Tambah Baris
          </button>
        </div>

        <div class="polos-list">
          <div v-for="(row, i) in formData.Details" :key="i" class="polos-card">
            <div class="polos-card-header" @click="toggleRow(i)">
              <component
                :is="row.expanded ? IconChevronUp : IconChevronDown"
                :size="14"
              />
              <span class="polos-no">{{ i + 1 }}</span>

              <div class="polos-summary" @click.stop>
                <div class="mode-toggle">
                  <label>
                    <input
                      type="checkbox"
                      :checked="row.is_freetext"
                      :disabled="isLockedByStatus"
                      @change="
                        row.is_freetext = !row.is_freetext;
                        row.kode_polos = '';
                        row.nama_polos = '';
                      "
                    />
                    Input Manual
                  </label>
                </div>

                <div v-if="!row.is_freetext" class="ig-cell">
                  <span class="cell-text mono">{{
                    row.kode_polos || "Pilih barang polos..."
                  }}</span>
                  <button
                    type="button"
                    class="ibtn-sm"
                    :disabled="isLockedByStatus"
                    @click="openPolosModal(i)"
                  >
                    <IconSearch :size="10" color="#1565c0" />
                  </button>
                </div>
                <input
                  v-else
                  v-model="row.nama_polos_manual"
                  class="inp-freetext"
                  placeholder="Ketik nama barang polos..."
                  :disabled="isLockedByStatus"
                />

                <div
                  v-if="!row.is_freetext && row.nama_polos"
                  class="row-subtext"
                >
                  {{ row.nama_polos }}
                </div>
                <div v-if="row.is_freetext" class="row-subtext freetext-note">
                  ⚠ Tidak memotong stok gudang asal
                </div>
              </div>

              <input
                type="number"
                min="0"
                v-model.number="row.qty_kirim"
                class="qty-inline tr"
                placeholder="Qty"
                :disabled="isLockedByStatus"
                @click.stop
              />
              <input
                v-model="row.satuan_kirim"
                class="satuan-inline"
                :class="{ 'satuan-editable': row.is_freetext }"
                :readonly="!row.is_freetext"
                placeholder="Satuan"
                @click.stop
              />

              <span class="target-count-badge"
                >{{ row.target_jadi.filter((t) => t.kode_jadi).length }} Barang
                Jadi</span
              >

              <button
                type="button"
                class="btn-del-row"
                :disabled="isLockedByStatus"
                @click.stop="removeRow(i)"
              >
                <IconTrash :size="14" />
              </button>
            </div>

            <div v-show="row.expanded" class="polos-card-body">
              <div class="fr mb-2">
                <label class="lbl-sm">Keterangan Baris</label>
                <input
                  v-model="row.keterangan"
                  class="inp flex-grow-1"
                  :disabled="isLockedByStatus"
                />
              </div>

              <div class="target-jadi-header">
                <span>Target Barang Jadi</span>
                <button
                  type="button"
                  class="btn-add-target"
                  :disabled="isLockedByStatus"
                  @click="addTargetJadi(i)"
                >
                  <IconPlus :size="12" /> Tambah Target
                </button>
              </div>

              <div class="target-tbl-scroll">
                <table class="target-tbl">
                  <thead>
                    <tr>
                      <th style="width: 26px">No</th>
                      <th style="width: 220px">Barang Jadi</th>
                      <th style="width: 100px" class="tr">Estimasi Qty</th>
                      <th style="width: 110px" class="tc">Gambar</th>
                      <th style="width: 26px"></th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="(t, ti) in row.target_jadi" :key="ti">
                      <td class="tc">{{ ti + 1 }}</td>
                      <td>
                        <div class="ig-cell">
                          <span class="cell-text mono">{{
                            t.kode_jadi || "—"
                          }}</span>
                          <button
                            type="button"
                            class="ibtn-sm"
                            :disabled="isLockedByStatus"
                            @click="openJadiModal(i, ti)"
                          >
                            <IconSearch :size="10" color="#1565c0" />
                          </button>
                        </div>
                        <div v-if="t.nama_jadi" class="row-subtext">
                          {{ t.nama_jadi }}
                        </div>
                      </td>
                      <td>
                        <input
                          type="number"
                          min="0"
                          v-model.number="t.estimasi_qty"
                          class="ci tr"
                          :disabled="isLockedByStatus"
                        />
                      </td>
                      <td class="tc">
                        <input
                          type="file"
                          multiple
                          accept="image/*"
                          class="d-none"
                          :ref="
                            (el) =>
                              (fileInputRefs[fileInputKey(i, ti)] =
                                el as HTMLInputElement)
                          "
                          @change="onFilesSelected($event, i, ti)"
                        />
                        <button
                          type="button"
                          class="btn-gambar"
                          :disabled="
                            isLockedByStatus ||
                            uploadingKey === fileInputKey(i, ti)
                          "
                          @click="triggerFileInput(i, ti)"
                        >
                          <IconPhotoPlus :size="13" />
                          {{ t.gambar.length || "" }}
                        </button>
                        <div v-if="t.gambar.length" class="gambar-thumbs">
                          <div
                            v-for="(g, gi) in t.gambar"
                            :key="gi"
                            class="thumb-item"
                          >
                            <img
                              :src="g.file_path"
                              class="thumb-img"
                              @click="openImage(g.file_path)"
                            />
                            <button
                              type="button"
                              class="thumb-del"
                              :disabled="isLockedByStatus"
                              @click="removeGambar(i, ti, gi)"
                            >
                              ✕
                            </button>
                          </div>
                        </div>
                      </td>
                      <td class="tc">
                        <button
                          type="button"
                          class="btn-del"
                          :disabled="isLockedByStatus"
                          @click="removeTargetJadi(i, ti)"
                        >
                          ✕
                        </button>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div v-if="formData.Details.length === 0" class="empty-row">
            Belum ada baris. Klik "+ Tambah Baris".
          </div>
        </div>

        <div v-if="formData.Details.length" class="polos-total">
          Total Qty Kirim: <b>{{ numFmt(totalQtyKirim) }}</b>
        </div>
      </div>
    </template>
  </BaseForm>

  <BarangGarmenSearchModal
    v-model="showBarangModal"
    jenis="ACCESORIES"
    :title="barangModalTitle"
    :cabang="activeBarangCabang"
    @selected="selectBarang"
  />
</template>

<style scoped>
.mkl-left-container {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 12px !important;
  width: 100%;
  box-sizing: border-box;
}
.fr {
  display: flex;
  align-items: center;
  min-height: 24px;
  gap: 4px;
  width: 100%;
}
.lbl {
  width: 100px;
  flex-shrink: 0;
  font-weight: 600;
  color: #444;
  font-size: 11px;
}
.sep {
  height: 1px;
  background: #e0e0e0;
  width: 100%;
}
.mt-1 {
  margin-top: 4px;
}
.mb-1 {
  margin-bottom: 4px;
}
.mb-2 {
  margin-bottom: 8px;
}
.tc {
  text-align: center;
}
.tr {
  text-align: right;
}
.flex-grow-1 {
  flex: 1;
}

.inp {
  height: 24px;
  border: 1px solid #a0a0a0;
  padding: 0 6px;
  font-size: 11px;
  background: white;
  outline: none;
  border-radius: 2px;
  min-width: 0;
}
.inp:disabled {
  background: #f0f0f0 !important;
  color: #9e9e9e;
}
.ro {
  background: #dde8f0 !important;
  color: #444 !important;
}
.idate {
  height: 24px;
  border: 1px solid #a0a0a0;
  padding: 0 4px;
  font-size: 11px;
  background: white;
  outline: none;
  box-sizing: border-box;
  border-radius: 2px;
}
.ta {
  border: 1px solid #a0a0a0;
  border-radius: 2px;
  padding: 6px;
  font-size: 11px;
  font-family: inherit;
  outline: none;
  resize: vertical;
}
.ta:disabled {
  background: #f0f0f0;
  color: #9e9e9e;
}

.mkl-alert {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 5px 10px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 700;
  margin-bottom: 4px;
}
.mkl-alert.warning {
  background: #fff3e0;
  color: #e65100;
  border: 1px solid #ffcc80;
}

.mkl-right {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 12px;
  background: white;
  border-radius: 8px;
  border: 1px solid #e0e0e0;
  font-family: "Segoe UI", system-ui, sans-serif;
  font-size: 11px;
  box-sizing: border-box;
  min-height: 0;
  overflow: hidden;
}
.mkl-right-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
  flex-shrink: 0;
}
.mkl-right-title {
  font-weight: 700;
  color: #424242;
  font-size: 12px;
}
.btn-add {
  height: 26px;
  padding: 0 12px;
  font-size: 11px;
  font-weight: 700;
  border: none;
  border-radius: 4px;
  background: #1565c0;
  color: white;
  cursor: pointer;
}
.btn-add:disabled {
  opacity: 0.5;
  cursor: default;
}

.polos-list {
  flex: 1;
  overflow: auto;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.polos-card {
  border: 1px solid #ddd;
  border-radius: 6px;
  overflow: hidden;
}
.polos-card-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  background: #f5f5f5;
  cursor: pointer;
}
.polos-no {
  font-weight: 700;
  color: #555;
  width: 16px;
  flex-shrink: 0;
}
.polos-summary {
  flex: 1;
  min-width: 0;
}
.qty-inline {
  width: 70px;
  height: 26px;
  border: 1px solid #ccc;
  border-radius: 3px;
  padding: 0 6px;
  font-size: 11px;
}
.satuan-inline {
  width: 65px;
  height: 26px;
  border: 1px solid #ccc;
  border-radius: 3px;
  padding: 0 6px;
  font-size: 11px;
  background: #f0f0f0;
  color: #666; /* ⬅ visual readonly */
}
.target-count-badge {
  font-size: 10px;
  font-weight: 700;
  color: #1565c0;
  background: #e3f2fd;
  padding: 2px 8px;
  border-radius: 10px;
  white-space: nowrap;
}
.btn-del-row {
  border: none;
  background: transparent;
  color: #d32f2f;
  cursor: pointer;
  padding: 4px;
  display: flex;
}
.btn-del-row:disabled {
  opacity: 0.3;
}

.polos-card-body {
  padding: 10px;
  border-top: 1px solid #eee;
  background: white;
}
.lbl-sm {
  width: 100px;
  font-weight: 600;
  color: #555;
  font-size: 10px;
  flex-shrink: 0;
}

.target-jadi-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 6px;
  font-weight: 700;
  color: #424242;
  font-size: 11px;
}
.btn-add-target {
  display: flex;
  align-items: center;
  gap: 3px;
  height: 22px;
  padding: 0 8px;
  border: 1px solid #90caf9;
  background: #e3f2fd;
  color: #1565c0;
  border-radius: 3px;
  cursor: pointer;
  font-size: 10px;
}
.btn-add-target:disabled {
  opacity: 0.4;
  cursor: default;
}

.target-tbl {
  width: 100%;
  border-collapse: collapse;
}
.target-tbl th {
  background: #eeeeee;
  border: 1px solid #ddd;
  padding: 4px 6px;
  font-size: 10px;
  font-weight: 700;
  text-align: left;
}
.target-tbl th.tc {
  text-align: center;
}
.target-tbl th.tr {
  text-align: right;
}
.target-tbl td {
  border: 1px solid #eee;
  padding: 3px;
  vertical-align: middle;
}

.ci {
  width: 100%;
  height: 24px;
  border: none;
  background: transparent;
  outline: none;
  font-size: 11px;
  padding: 0 6px;
  box-sizing: border-box;
}
.ci:disabled {
  background: #f5f5f5;
  color: #9e9e9e;
}
.ci:focus {
  background: #e3f2fd !important;
}
.ci.tr {
  text-align: right;
}
.mono {
  font-family: monospace;
  font-size: 11px;
}
.row-subtext {
  font-size: 9px;
  color: #888;
  padding: 0 6px;
  line-height: 1.2;
}
.empty-row {
  text-align: center;
  color: #9e9e9e;
  font-style: italic;
  padding: 16px;
  font-size: 11px;
}

.ig-cell {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
  height: 24px;
  padding: 0 6px;
}
.ig-cell .cell-text {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
}
.ibtn-sm {
  width: 18px;
  height: 18px;
  flex-shrink: 0;
  background: #e3f2fd;
  border: 1px solid #90caf9;
  border-radius: 3px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
}
.ibtn-sm:disabled {
  opacity: 0.4;
  cursor: default;
}

.d-none {
  display: none;
}
.btn-gambar {
  display: flex;
  align-items: center;
  gap: 3px;
  height: 22px;
  padding: 0 6px;
  border: 1px solid #90caf9;
  background: #e3f2fd;
  color: #1565c0;
  border-radius: 3px;
  cursor: pointer;
  font-size: 10px;
  margin: 0 auto;
}
.btn-gambar:disabled {
  opacity: 0.4;
  cursor: default;
}
.gambar-thumbs {
  display: flex;
  flex-wrap: wrap;
  gap: 3px;
  justify-content: center;
  margin-top: 3px;
}
.thumb-item {
  position: relative;
  width: 26px;
  height: 26px;
}
.thumb-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 3px;
  border: 1px solid #ccc;
  cursor: pointer;
}
.thumb-del {
  position: absolute;
  top: -4px;
  right: -4px;
  width: 13px;
  height: 13px;
  border-radius: 50%;
  background: #d32f2f;
  color: white;
  border: none;
  font-size: 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
}
.thumb-del:disabled {
  opacity: 0.4;
  cursor: default;
}

.btn-del {
  background: transparent;
  color: #d32f2f;
  border: none;
  cursor: pointer;
  padding: 3px;
  font-size: 11px;
}
.btn-del:disabled {
  opacity: 0.3;
  cursor: default;
}

.polos-total {
  text-align: right;
  padding: 8px 4px 0;
  font-size: 12px;
  flex-shrink: 0;
}

.target-tbl-scroll {
  max-height: 280px;
  overflow-y: auto;
  overscroll-behavior: contain; /* stop parent .polos-list from stealing the wheel scroll */
}
.target-tbl thead th {
  position: sticky;
  top: 0;
  z-index: 1;
  background: #eeeeee; /* keep header visible while scrolling, and signals "there's more" */
}

.mode-toggle {
  font-size: 9px;
  color: #666;
  margin-bottom: 2px;
}
.mode-toggle label {
  display: flex;
  align-items: center;
  gap: 3px;
  cursor: pointer;
}
.mode-toggle input[type="checkbox"] {
  width: 11px;
  height: 11px;
  cursor: pointer;
}
.inp-freetext {
  width: 100%;
  height: 24px;
  border: 1px solid #ffb74d;
  background: #fff8e1;
  border-radius: 3px;
  padding: 0 6px;
  font-size: 11px;
  outline: none;
}
.freetext-note {
  color: #e65100;
  font-weight: 600;
}
.satuan-editable {
  background: white !important;
  color: #333 !important;
}
</style>
