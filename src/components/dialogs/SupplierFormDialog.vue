<script setup lang="ts">
import { ref, watch, computed } from "vue";
import type { VForm } from "vuetify/components";
import api from "@/services/api";
import { useToast } from "vue-toastification";
import { IconTruck, IconBuildingBank } from "@tabler/icons-vue";

const props = defineProps<{
  modelValue: boolean;
  isNewMode: boolean;
  editData?: any;
}>();

const emit = defineEmits(["update:modelValue", "saved"]);
const toast = useToast();
const formRef = ref<VForm | null>(null);
const isSaving = ref(false);

const dialogVisible = computed({
  get: () => props.modelValue,
  set: (val) => emit("update:modelValue", val),
});

const emptyForm = () => ({
  Kode: "",
  Nama: "",
  Alamat: "",
  Kota: "",
  Telp: "",
  Hp: "",
  Fax: "",
  Contact: "",
  NpwpKode: "",
  NpwpNama: "",
  NpwpAlamat: "",
  NpwpKota: "",
  Top: 0,
  TargetMitra: 0,
  Keterangan: "",
  Aktif: "Y",
  Jenis: {
    Bahan: false,
    Cmt: false,
    Acc: false,
    Obat: false,
    Sparepart: false,
    Atk: false,
    Jasa: false,
  },
  RekeningList: [] as any[],
});

const formData = ref(emptyForm());

watch(
  () => props.modelValue,
  (isOpen) => {
    if (!isOpen) return;
    if (props.isNewMode) {
      formData.value = emptyForm();
    } else {
      const ed = props.editData;
      formData.value = {
        Kode: ed.sup_kode,
        Nama: ed.sup_nama,
        Alamat: ed.sup_alamat,
        Kota: ed.sup_kota,
        Telp: ed.sup_telp,
        Hp: ed.sup_hp,
        Fax: ed.sup_fax,
        Contact: ed.sup_cp,
        NpwpKode: ed.sup_npwp,
        NpwpNama: ed.sup_nama_npwp,
        NpwpAlamat: ed.sup_alamat_npwp,
        NpwpKota: ed.sup_kota_npwp,
        Top: Number(ed.sup_top) || 0,
        TargetMitra: Number(ed.sup_targetmitra) || 0,
        Keterangan: ed.sup_ket,
        Aktif: ed.sup_aktif || "Y",
        Jenis: {
          Bahan: ed.sup_bahan === "Y",
          Cmt: ed.sup_cmt === "Y",
          Acc: ed.sup_accesories === "Y",
          Obat: ed.sup_obat === "Y",
          Sparepart: ed.sup_sparepart === "Y",
          Atk: ed.sup_atk === "Y",
          Jasa: ed.sup_jasa === "Y",
        },
        RekeningList: ed.RekeningList ? [...ed.RekeningList] : [],
      };
    }
    formRef.value?.resetValidation();
  },
);

const addRekening = () => {
  formData.value.RekeningList.push({ Bank: "", Rekening: "", AtasNama: "" });
};
const removeRekening = (index: number) => {
  formData.value.RekeningList.splice(index, 1);
};

const handleSave = async () => {
  const { valid } = await formRef.value!.validate();
  if (!valid) return;
  if (!Object.values(formData.value.Jenis).some(Boolean)) {
    toast.warning("Minimal pilih satu Jenis Supplier!");
    return;
  }
  isSaving.value = true;
  try {
    if (props.isNewMode) {
      await api.post("/master/supplier", formData.value);
      toast.success("Berhasil menyimpan Master Supplier");
    } else {
      await api.put(`/master/supplier/${formData.value.Kode}`, formData.value);
      toast.success("Berhasil memperbarui Master Supplier");
    }
    dialogVisible.value = false;
    emit("saved");
  } catch (error: any) {
    toast.error(error.response?.data?.message || "Gagal menyimpan data.");
  } finally {
    isSaving.value = false;
  }
};

const jenisItems = [
  { key: "Bahan", label: "Bahan" },
  { key: "Cmt", label: "CMT" },
  { key: "Acc", label: "Accesories" },
  { key: "Obat", label: "Obat" },
  { key: "Sparepart", label: "Sparepart" },
  { key: "Atk", label: "ATK/RTK" },
  { key: "Jasa", label: "Jasa" },
] as const;
</script>

<template>
  <v-dialog v-model="dialogVisible" persistent max-width="860px" scrollable>
    <v-card class="sup-dialog-card">
      <!-- Header -->
      <div class="sup-header">
        <IconTruck :size="15" :stroke-width="1.7" color="white" class="mr-2" />
        <span>{{ isNewMode ? "TAMBAH" : "UBAH" }} MASTER SUPPLIER</span>
        <v-spacer />
        <button class="sup-close-btn" @click="dialogVisible = false">✕</button>
      </div>

      <!-- Body -->
      <v-card-text class="sup-body">
        <v-form ref="formRef" @submit.prevent="handleSave">
          <!-- ── Seksi 1: Identitas ── -->
          <div class="sup-section">
            <!-- Baris 1: Kode | Nama | Status -->
            <div class="sup-row">
              <div class="sup-field" style="width: 110px; flex-shrink: 0">
                <label class="sup-label">Kode</label>
                <v-text-field
                  v-model="formData.Kode"
                  variant="outlined"
                  density="compact"
                  readonly
                  bg-color="grey-lighten-4"
                  hide-details
                  :placeholder="isNewMode ? 'Auto' : ''"
                  class="sup-input"
                />
              </div>
              <div class="sup-field" style="flex: 1">
                <label class="sup-label"
                  >Nama Supplier <span class="req">*</span></label
                >
                <v-text-field
                  v-model="formData.Nama"
                  variant="outlined"
                  density="compact"
                  :rules="[(v) => !!v || 'Wajib diisi']"
                  hide-details="auto"
                  autofocus
                  class="sup-input"
                />
              </div>
              <div class="sup-field" style="width: 130px; flex-shrink: 0">
                <label class="sup-label">Status</label>
                <div class="d-flex align-center gap-3 pt-1">
                  <label class="radio-label">
                    <input type="radio" v-model="formData.Aktif" value="Y" />
                    Aktif
                  </label>
                  <label class="radio-label text-error">
                    <input type="radio" v-model="formData.Aktif" value="N" />
                    Pasif
                  </label>
                </div>
              </div>
            </div>

            <!-- Baris 2: Jenis Supplier -->
            <div class="sup-row" style="align-items: flex-start">
              <div class="sup-field" style="flex: 1">
                <label class="sup-label"
                  >Jenis Supplier <span class="req">*</span></label
                >
                <div class="jenis-wrap">
                  <label
                    v-for="j in jenisItems"
                    :key="j.key"
                    class="jenis-item"
                    :class="{ active: formData.Jenis[j.key] }"
                  >
                    <input type="checkbox" v-model="formData.Jenis[j.key]" />
                    {{ j.label }}
                  </label>
                </div>
              </div>
            </div>

            <!-- Baris 3: Alamat | Kota -->
            <div class="sup-row">
              <div class="sup-field" style="flex: 2">
                <label class="sup-label"
                  >Alamat <span class="req">*</span></label
                >
                <v-text-field
                  v-model="formData.Alamat"
                  variant="outlined"
                  density="compact"
                  :rules="[(v) => !!v || 'Wajib diisi']"
                  hide-details="auto"
                  class="sup-input"
                />
              </div>
              <div class="sup-field" style="flex: 1">
                <label class="sup-label">Kota <span class="req">*</span></label>
                <v-text-field
                  v-model="formData.Kota"
                  variant="outlined"
                  density="compact"
                  :rules="[(v) => !!v || 'Wajib diisi']"
                  hide-details="auto"
                  class="sup-input"
                />
              </div>
            </div>

            <!-- Baris 4: Contact | HP | Telp | Fax -->
            <div class="sup-row">
              <div class="sup-field" style="flex: 1">
                <label class="sup-label"
                  >Contact Person <span class="req">*</span></label
                >
                <v-text-field
                  v-model="formData.Contact"
                  variant="outlined"
                  density="compact"
                  :rules="[(v) => !!v || 'Wajib diisi']"
                  hide-details="auto"
                  class="sup-input"
                />
              </div>
              <div class="sup-field" style="flex: 1">
                <label class="sup-label"
                  >No HP <span class="req">*</span></label
                >
                <v-text-field
                  v-model="formData.Hp"
                  variant="outlined"
                  density="compact"
                  :rules="[(v) => !!v || 'Wajib diisi']"
                  hide-details="auto"
                  class="sup-input"
                />
              </div>
              <div class="sup-field" style="flex: 1">
                <label class="sup-label">No Telp Kantor</label>
                <v-text-field
                  v-model="formData.Telp"
                  variant="outlined"
                  density="compact"
                  hide-details
                  class="sup-input"
                />
              </div>
              <div class="sup-field" style="flex: 1">
                <label class="sup-label">No Fax</label>
                <v-text-field
                  v-model="formData.Fax"
                  variant="outlined"
                  density="compact"
                  hide-details
                  class="sup-input"
                />
              </div>
            </div>

            <!-- Baris 5: Keterangan | TOP + TargetMitra + NPWP -->
            <div class="sup-row" style="align-items: flex-start">
              <div class="sup-field" style="flex: 1">
                <label class="sup-label">Keterangan</label>
                <v-textarea
                  v-model="formData.Keterangan"
                  variant="outlined"
                  density="compact"
                  hide-details
                  rows="3"
                  class="sup-input"
                />
              </div>

              <div class="sup-field" style="flex: 1; gap: 0">
                <!-- TOP & Target dalam satu baris -->
                <div class="sup-row" style="margin-bottom: 6px">
                  <div class="sup-field" style="flex: 1">
                    <label class="sup-label">T.O.P (Hari)</label>
                    <v-text-field
                      v-model.number="formData.Top"
                      type="number"
                      variant="outlined"
                      density="compact"
                      hide-details
                      class="sup-input"
                    />
                  </div>
                  <div class="sup-field" style="flex: 1">
                    <label class="sup-label">Target Mitra</label>
                    <v-text-field
                      v-model.number="formData.TargetMitra"
                      type="number"
                      variant="outlined"
                      density="compact"
                      hide-details
                      class="sup-input"
                    />
                  </div>
                </div>

                <!-- NPWP subsection -->
                <div class="npwp-section">
                  <div class="npwp-title">DATA NPWP</div>
                  <v-text-field
                    v-model="formData.NpwpKode"
                    placeholder="No. NPWP"
                    variant="outlined"
                    density="compact"
                    hide-details
                    class="sup-input mb-1"
                  />
                  <v-text-field
                    v-model="formData.NpwpNama"
                    placeholder="Nama NPWP"
                    variant="outlined"
                    density="compact"
                    hide-details
                    class="sup-input mb-1"
                  />
                  <div class="sup-row">
                    <div class="sup-field" style="flex: 2">
                      <v-text-field
                        v-model="formData.NpwpAlamat"
                        placeholder="Alamat NPWP"
                        variant="outlined"
                        density="compact"
                        hide-details
                        class="sup-input"
                      />
                    </div>
                    <div class="sup-field" style="flex: 1">
                      <v-text-field
                        v-model="formData.NpwpKota"
                        placeholder="Kota NPWP"
                        variant="outlined"
                        density="compact"
                        hide-details
                        class="sup-input"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- ── Seksi 2: Rekening ── -->
          <div class="sup-section" style="padding: 0">
            <div class="rek-header">
              <span>
                <IconBuildingBank
                  :size="13"
                  :stroke-width="1.7"
                  class="mr-1"
                  style="vertical-align: middle"
                />
                DATA REKENING
              </span>
              <button type="button" class="rek-add-btn" @click="addRekening">
                + Tambah Rekening
              </button>
            </div>
            <table class="rek-table">
              <thead>
                <tr>
                  <th style="width: 36px" class="text-center">No</th>
                  <th style="width: 180px">Nama Bank</th>
                  <th style="width: 180px">No. Rekening</th>
                  <th>Atas Nama</th>
                  <th style="width: 40px" class="text-center">Aksi</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(rek, idx) in formData.RekeningList" :key="idx">
                  <td class="text-center">{{ idx + 1 }}</td>
                  <td class="rek-td">
                    <v-text-field
                      v-model="rek.Bank"
                      variant="outlined"
                      density="compact"
                      hide-details
                      class="sup-input"
                    />
                  </td>
                  <td class="rek-td">
                    <v-text-field
                      v-model="rek.Rekening"
                      variant="outlined"
                      density="compact"
                      hide-details
                      class="sup-input"
                    />
                  </td>
                  <td class="rek-td">
                    <v-text-field
                      v-model="rek.AtasNama"
                      variant="outlined"
                      density="compact"
                      hide-details
                      class="sup-input"
                    />
                  </td>
                  <td class="text-center">
                    <button
                      type="button"
                      class="rek-del-btn"
                      @click="removeRekening(idx)"
                      title="Hapus"
                    >
                      ✕
                    </button>
                  </td>
                </tr>
                <tr v-if="formData.RekeningList.length === 0">
                  <td colspan="5" class="rek-empty">Belum ada rekening</td>
                </tr>
              </tbody>
            </table>
          </div>
        </v-form>
      </v-card-text>

      <!-- Footer -->
      <div class="sup-footer">
        <button
          type="button"
          class="sup-btn-cancel"
          @click="dialogVisible = false"
          :disabled="isSaving"
        >
          Batal
        </button>
        <button
          type="button"
          class="sup-btn-save"
          @click="handleSave"
          :disabled="isSaving"
        >
          <span v-if="isSaving">Menyimpan...</span>
          <span v-else>Simpan (F10)</span>
        </button>
      </div>
    </v-card>
  </v-dialog>
</template>

<style scoped>
/* ── Dialog card ── */
.sup-dialog-card {
  font-size: 12px;
  font-family: "Segoe UI", system-ui, sans-serif;
  display: flex;
  flex-direction: column;
  max-height: 92vh;
}

/* ── Header ── */
.sup-header {
  display: flex;
  align-items: center;
  background: #1565c0;
  color: white;
  padding: 8px 14px;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.04em;
  flex-shrink: 0;
}
.sup-close-btn {
  background: transparent;
  border: none;
  color: rgba(255, 255, 255, 0.8);
  font-size: 14px;
  cursor: pointer;
  padding: 0 2px;
  line-height: 1;
}
.sup-close-btn:hover {
  color: white;
}

/* ── Body ── */
.sup-body {
  padding: 10px 12px !important;
  overflow-y: auto;
  flex: 1;
}

/* ── Section ── */
.sup-section {
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  padding: 10px 12px;
  margin-bottom: 8px;
}

/* ── Row & Field ── */
.sup-row {
  display: flex;
  align-items: flex-end;
  gap: 8px;
  margin-bottom: 6px;
}
.sup-row:last-child {
  margin-bottom: 0;
}

.sup-field {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.sup-label {
  font-size: 11px;
  font-weight: 600;
  color: #555;
  line-height: 1;
  white-space: nowrap;
}
.req {
  color: #e53935;
}

/* Override Vuetify field height supaya lebih kompak */
.sup-input :deep(.v-field) {
  font-size: 12px;
  min-height: 30px;
  height: 30px;
}
.sup-input :deep(.v-field__input) {
  min-height: 30px;
  padding-top: 0;
  padding-bottom: 0;
  font-size: 12px;
}
.sup-input :deep(.v-textarea .v-field__input) {
  min-height: unset;
  padding-top: 6px;
}
.sup-input :deep(.v-input__control) {
  min-height: 30px;
}

/* ── Jenis Supplier chips ── */
.jenis-wrap {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  padding: 5px 8px;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  background: #fafafa;
}
.jenis-item {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 3px 8px;
  border: 1px solid #d0d0d0;
  border-radius: 12px;
  font-size: 11px;
  cursor: pointer;
  user-select: none;
  transition: all 0.15s;
  background: white;
  color: #424242;
}
.jenis-item input[type="checkbox"] {
  width: 12px;
  height: 12px;
  accent-color: #1565c0;
  cursor: pointer;
}
.jenis-item.active {
  background: #e3f2fd;
  border-color: #1565c0;
  color: #1565c0;
  font-weight: 600;
}

/* ── Radio button manual ── */
.radio-label {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  cursor: pointer;
}
.radio-label input[type="radio"] {
  accent-color: #1565c0;
  cursor: pointer;
}

/* ── NPWP subsection ── */
.npwp-section {
  border: 1px solid #e8e8e8;
  border-radius: 4px;
  padding: 6px 8px;
  background: #fafafa;
}
.npwp-title {
  font-size: 10px;
  font-weight: 700;
  color: #1565c0;
  letter-spacing: 0.05em;
  margin-bottom: 5px;
}
.mb-1 {
  margin-bottom: 4px;
}

/* ── Rekening section ── */
.rek-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 10px;
  background: #f5f5f5;
  border-bottom: 1px solid #e0e0e0;
  font-size: 11px;
  font-weight: 700;
  color: #1565c0;
}
.rek-add-btn {
  background: #1565c0;
  color: white;
  border: none;
  border-radius: 4px;
  padding: 3px 10px;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
}
.rek-add-btn:hover {
  background: #1557a8;
}

.rek-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
}
.rek-table th {
  background: #f5f5f5;
  padding: 5px 8px;
  font-size: 11px;
  font-weight: 700;
  color: #424242;
  border-bottom: 1px solid #e0e0e0;
  text-align: left;
}
.rek-table td {
  padding: 3px 6px;
  border-bottom: 1px solid #f0f0f0;
  vertical-align: middle;
}
.rek-td {
  padding: 3px 4px !important;
}
.rek-empty {
  text-align: center;
  color: #9e9e9e;
  padding: 12px !important;
  font-size: 11px;
}
.rek-del-btn {
  background: transparent;
  border: none;
  color: #e53935;
  cursor: pointer;
  font-size: 13px;
  padding: 0 2px;
}
.rek-del-btn:hover {
  color: #b71c1c;
}

/* ── Footer ── */
.sup-footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  padding: 8px 12px;
  border-top: 1px solid #e0e0e0;
  background: #fafafa;
  flex-shrink: 0;
}
.sup-btn-cancel {
  background: transparent;
  border: 1px solid #d0d0d0;
  border-radius: 4px;
  padding: 5px 16px;
  font-size: 12px;
  cursor: pointer;
  color: #555;
}
.sup-btn-cancel:hover {
  background: #f5f5f5;
}
.sup-btn-save {
  background: #1565c0;
  color: white;
  border: none;
  border-radius: 4px;
  padding: 5px 20px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
}
.sup-btn-save:hover {
  background: #1557a8;
}
.sup-btn-save:disabled,
.sup-btn-cancel:disabled {
  opacity: 0.5;
  cursor: default;
}
</style>
