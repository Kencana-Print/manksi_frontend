<script setup lang="ts">
import { ref, watch, computed, onMounted } from "vue";
import type { VForm } from "vuetify/components";
import api from "@/services/api";
import { useToast } from "vue-toastification";
import { useAuthStore } from "@/stores/authStore";
import CustomerSearchModal from "@/components/lookups/CustomerSearchModal.vue";
import { IconUsers, IconSearch, IconX } from "@tabler/icons-vue";

const props = defineProps<{
  modelValue: boolean;
  isNewMode: boolean;
  editData?: any;
}>();

const emit = defineEmits(["update:modelValue", "saved"]);
const toast = useToast();
const authStore = useAuthStore();

const formRef = ref<VForm | null>(null);
const isSaving = ref(false);
const showCustomerModal = ref(false);
const jenisUsahaOptions = ref<any[]>([]);

const dialogVisible = computed({
  get: () => props.modelValue,
  set: (val) => emit("update:modelValue", val),
});

const isManager = computed(() => authStore.isManager);

const emptyForm = () => ({
  Kode: "",
  Nama: "",
  Alamat: "",
  Kota: "",
  Telp: "",
  Telp2: "",
  Fax: "",
  Contact: "",
  Email: "",
  Korporasi: "Y",
  JenisUsaha: "",
  NpwpKode: "",
  NpwpNama: "",
  NpwpAlamat: "",
  NpwpKota: "",
  DiscPersen: 0,
  Top: 30,
  Prioritas: "N",
  Keramat: "N",
  Spanduk: false,
  Garmen: false,
  Mmt: false,
  Perfect: "",
  KodeInduk: "",
  NamaInduk: "",
  AlamatInduk: "",
  KotaInduk: "",
  Plafon: 0,
});

const formData = ref(emptyForm());

const plafonWarning = computed(() => {
  const p = formData.value.Plafon || 0;
  if (p > 20_000_000)
    return { text: "Butuh ACC Direksi/Owner", color: "#c62828" };
  if (p > 0) return { text: "Butuh ACC Manager", color: "#e65100" };
  return null;
});

const loadLookups = async () => {
  try {
    const res = await api.get("/master/customer/jenis-usaha");
    jenisUsahaOptions.value = res.data.data.map((item: any) => item.Jenis);
  } catch (e) {
    console.error("Gagal load jenis usaha", e);
  }
};

// Load saat komponen dipasang — tidak perlu tunggu dialog buka
onMounted(() => {
  loadLookups();
});

watch(
  () => props.modelValue,
  (isOpen) => {
    if (!isOpen) return;

    if (props.isNewMode) {
      formData.value = emptyForm();
    } else if (props.editData) {
      formData.value = {
        ...emptyForm(),
        ...props.editData,
      };
    }
    formRef.value?.resetValidation();
  },
);

const handleCustomerSelected = (cus: any) => {
  formData.value.KodeInduk = cus.Kode;
  formData.value.NamaInduk = cus.Nama;
  formData.value.AlamatInduk = cus.Alamat; // Asumsi Modal lookup mengirim ini
  formData.value.KotaInduk = cus.Kota; // Asumsi Modal lookup mengirim ini
};

const handleSave = async () => {
  const { valid } = await formRef.value!.validate();
  if (!valid) return;
  if (formData.value.Korporasi === "Y") {
    if (!formData.value.NpwpKode) {
      toast.warning("Korporasi: NPWP wajib diisi!");
      return;
    }
    // Validasi format NPWP (xx.xxx.xxx.x-xxx.xxx = 20 karakter)
    if (formData.value.Korporasi === "Y" && formData.value.NpwpKode) {
      const npwp = formData.value.NpwpKode.trim();
      const validPos: Record<number, string> = {
        2: ".",
        6: ".",
        10: ".",
        12: "-",
        16: ".",
      };
      let npwpValid = npwp.length === 20;
      if (npwpValid) {
        for (let i = 0; i < npwp.length; i++) {
          const expected = validPos[i];
          if (expected) {
            if (npwp[i] !== expected) {
              npwpValid = false;
              break;
            }
          } else {
            if (!/\d/.test(npwp[i])) {
              npwpValid = false;
              break;
            }
          }
        }
      }
      if (!npwpValid) {
        toast.warning("Format NPWP tidak valid. Contoh: 02.843.715.0-651.000");
        return;
      }
    }
    if (!formData.value.NpwpNama) {
      toast.warning("Korporasi: Nama NPWP wajib diisi!");
      return;
    }
    if (!formData.value.NpwpAlamat) {
      toast.warning("Korporasi: Alamat NPWP wajib diisi!");
      return;
    }
    if (!formData.value.NpwpKota) {
      toast.warning("Korporasi: Kota NPWP wajib diisi!");
      return;
    }
  }
  isSaving.value = true;
  try {
    if (props.isNewMode) {
      const res = await api.post("/master/customer", formData.value);
      const plafonAcc = res.data.data?.plafonAcc;
      if (plafonAcc === "PENDING_MANAGER") {
        toast.success("Customer disimpan. Plafon menunggu ACC Manager.");
      } else if (plafonAcc === "PENDING_DIREKSI") {
        toast.success("Customer disimpan. Plafon > 20jt menunggu ACC Direksi.");
      } else {
        toast.success("Customer berhasil disimpan.");
      }
    } else {
      const res = await api.put(
        `/master/customer/${formData.value.Kode}`,
        formData.value,
      );
      const plafonAcc = res.data.data?.plafonAcc;
      if (plafonAcc === "PENDING_MANAGER") {
        toast.success(
          "Customer diperbarui. Plafon berubah, menunggu ACC Manager.",
        );
      } else if (plafonAcc === "PENDING_DIREKSI") {
        toast.success(
          "Customer diperbarui. Plafon > 20jt menunggu ACC Direksi.",
        );
      } else {
        toast.success("Customer berhasil diperbarui.");
      }
    }
    dialogVisible.value = false;
    emit("saved");
  } catch (error: any) {
    toast.error(error.response?.data?.message || "Gagal menyimpan data.");
  } finally {
    isSaving.value = false;
  }
};

const divisiItems = [
  { key: "Spanduk", label: "Spanduk" },
  { key: "Garmen", label: "Garmen" },
  { key: "Mmt", label: "MMT" },
] as const;
</script>

<template>
  <v-dialog v-model="dialogVisible" persistent max-width="900px" scrollable>
    <v-card class="cus-dialog-card">
      <!-- Header -->
      <div class="cus-header">
        <IconUsers :size="15" :stroke-width="1.7" color="white" class="mr-2" />
        <span>{{ isNewMode ? "TAMBAH" : "UBAH" }} MASTER CUSTOMER</span>
        <v-spacer />
        <button class="cus-close-btn" @click="dialogVisible = false">✕</button>
      </div>

      <!-- Body -->
      <v-card-text class="cus-body">
        <v-form ref="formRef" @submit.prevent="handleSave">
          <div class="cus-layout">
            <!-- ── Kolom kiri: data utama ── -->
            <div class="cus-col">
              <div class="cus-section">
                <div class="cus-section-title">DATA UTAMA</div>

                <!-- Kode -->
                <div class="f-row">
                  <label class="f-label">Kode</label>
                  <v-text-field
                    v-model="formData.Kode"
                    variant="outlined"
                    density="compact"
                    readonly
                    bg-color="grey-lighten-4"
                    :placeholder="isNewMode ? 'Auto' : ''"
                    hide-details
                    class="f-input"
                  />
                </div>

                <!-- Status Korporasi -->
                <div class="f-row">
                  <label class="f-label">Status</label>
                  <div class="d-flex align-center gap-3 pt-1">
                    <label class="radio-label"
                      ><input
                        type="radio"
                        v-model="formData.Korporasi"
                        value="Y"
                      />
                      Korporasi</label
                    >
                    <label class="radio-label"
                      ><input
                        type="radio"
                        v-model="formData.Korporasi"
                        value="N"
                      />
                      Perorangan</label
                    >
                  </div>
                </div>

                <!-- Jenis Usaha -->
                <div class="f-row">
                  <label class="f-label"
                    >Jenis Usaha <span class="req">*</span></label
                  >
                  <v-select
                    v-model="formData.JenisUsaha"
                    :items="jenisUsahaOptions"
                    variant="outlined"
                    density="compact"
                    :rules="[(v) => !!v || 'Wajib dipilih']"
                    hide-details="auto"
                    class="f-input"
                  />
                </div>

                <!-- Nama -->
                <div class="f-row">
                  <label class="f-label">Nama <span class="req">*</span></label>
                  <v-text-field
                    v-model="formData.Nama"
                    variant="outlined"
                    density="compact"
                    :rules="[(v) => !!v || 'Wajib diisi']"
                    hide-details="auto"
                    autofocus
                    class="f-input"
                  />
                </div>

                <!-- Alamat -->
                <div class="f-row">
                  <label class="f-label"
                    >Alamat <span class="req">*</span></label
                  >
                  <v-text-field
                    v-model="formData.Alamat"
                    variant="outlined"
                    density="compact"
                    :rules="[(v) => !!v || 'Wajib diisi']"
                    hide-details="auto"
                    class="f-input"
                  />
                </div>

                <!-- Kota -->
                <div class="f-row">
                  <label class="f-label">Kota <span class="req">*</span></label>
                  <v-text-field
                    v-model="formData.Kota"
                    variant="outlined"
                    density="compact"
                    :rules="[(v) => !!v || 'Wajib diisi']"
                    hide-details="auto"
                    class="f-input"
                  />
                </div>

                <!-- Contact -->
                <div class="f-row">
                  <label class="f-label"
                    >Contact <span class="req">*</span></label
                  >
                  <v-text-field
                    v-model="formData.Contact"
                    variant="outlined"
                    density="compact"
                    :rules="[(v) => !!v || 'Wajib diisi']"
                    hide-details="auto"
                    class="f-input"
                  />
                </div>

                <!-- HP & HP2 dalam satu baris -->
                <div class="f-row">
                  <label class="f-label"
                    >No HP <span class="req">*</span></label
                  >
                  <v-text-field
                    v-model="formData.Telp"
                    variant="outlined"
                    density="compact"
                    :rules="[(v) => !!v || 'Wajib diisi']"
                    hide-details="auto"
                    class="f-input"
                  />
                </div>
                <div class="f-row">
                  <label class="f-label">No HP 2</label>
                  <v-text-field
                    v-model="formData.Telp2"
                    variant="outlined"
                    density="compact"
                    hide-details
                    class="f-input"
                  />
                </div>

                <!-- Fax & Email -->
                <div class="f-row">
                  <label class="f-label">Fax</label>
                  <v-text-field
                    v-model="formData.Fax"
                    variant="outlined"
                    density="compact"
                    hide-details
                    class="f-input"
                  />
                </div>
                <div class="f-row">
                  <label class="f-label"
                    >Email <span class="req">*</span></label
                  >
                  <v-text-field
                    v-model="formData.Email"
                    variant="outlined"
                    density="compact"
                    :rules="[(v) => !!v || 'Wajib diisi']"
                    hide-details="auto"
                    class="f-input"
                  />
                </div>
              </div>
            </div>

            <!-- ── Kolom kanan: NPWP + atribut ── -->
            <div class="cus-col">
              <!-- NPWP -->
              <div class="cus-section">
                <div class="cus-section-title">
                  DATA NPWP
                  <span class="cus-section-hint">(wajib jika Korporasi)</span>
                </div>
                <div class="f-row">
                  <label class="f-label">No. NPWP</label>
                  <v-text-field
                    v-model="formData.NpwpKode"
                    variant="outlined"
                    density="compact"
                    hide-details="auto"
                    class="f-input"
                  />
                </div>
                <div class="f-row">
                  <label class="f-label">Nama</label>
                  <v-text-field
                    v-model="formData.NpwpNama"
                    variant="outlined"
                    density="compact"
                    hide-details="auto"
                    class="f-input"
                  />
                </div>
                <div class="f-row">
                  <label class="f-label">Alamat</label>
                  <v-text-field
                    v-model="formData.NpwpAlamat"
                    variant="outlined"
                    density="compact"
                    hide-details="auto"
                    class="f-input"
                  />
                </div>
                <div class="f-row">
                  <label class="f-label">Kota</label>
                  <v-text-field
                    v-model="formData.NpwpKota"
                    variant="outlined"
                    density="compact"
                    hide-details="auto"
                    class="f-input"
                  />
                </div>
              </div>

              <!-- Atribut -->
              <div class="cus-section" style="margin-top: 8px">
                <div class="cus-section-title">ATRIBUT</div>

                <!-- Disc & TOP dalam satu baris -->
                <div class="f-row">
                  <label class="f-label">Disc (%)</label>
                  <v-text-field
                    v-model.number="formData.DiscPersen"
                    type="number"
                    variant="outlined"
                    density="compact"
                    hide-details
                    class="f-input"
                    style="max-width: 100px"
                    v-select-on-focus
                  />
                  <label class="f-label" style="margin-left: 8px"
                    >T.O.P (Hari)</label
                  >
                  <v-text-field
                    v-model.number="formData.Top"
                    type="number"
                    variant="outlined"
                    density="compact"
                    hide-details
                    class="f-input"
                    style="max-width: 80px"
                    v-select-on-focus
                  />
                </div>

                <div class="f-row">
                  <label class="f-label">Plafon (Rp)</label>
                  <v-text-field
                    v-model.number="formData.Plafon"
                    type="number"
                    variant="outlined"
                    density="compact"
                    hide-details
                    class="f-input"
                    style="max-width: 160px"
                    v-select-on-focus
                  />
                  <span
                    v-if="plafonWarning"
                    class="text-caption font-weight-bold ml-2"
                    :style="{ color: plafonWarning.color }"
                  >
                    ⚠ {{ plafonWarning.text }}
                  </span>
                </div>

                <!-- Prioritas & Perfect dalam satu baris -->
                <div class="f-row">
                  <label class="f-label">Prioritas</label>
                  <div class="d-flex align-center gap-3">
                    <label
                      class="radio-label"
                      :class="{ 'opacity-50': !isManager }"
                    >
                      <input
                        type="radio"
                        v-model="formData.Prioritas"
                        value="Y"
                        :disabled="!isManager"
                      />
                      Ya
                    </label>
                    <label
                      class="radio-label"
                      :class="{ 'opacity-50': !isManager }"
                    >
                      <input
                        type="radio"
                        v-model="formData.Prioritas"
                        value="N"
                        :disabled="!isManager"
                      />
                      Tidak
                    </label>
                  </div>
                  <label class="f-label" style="margin-left: 8px"
                    >Perfect</label
                  >
                  <v-select
                    v-model="formData.Perfect"
                    :items="['Y', 'N', '']"
                    variant="outlined"
                    density="compact"
                    hide-details
                    class="f-input"
                    style="max-width: 80px"
                  />
                </div>

                <!-- Divisi -->
                <div class="f-row" style="align-items: flex-start">
                  <label class="f-label" style="padding-top: 4px">Divisi</label>
                  <div class="divisi-wrap">
                    <label
                      v-for="d in divisiItems"
                      :key="d.key"
                      class="divisi-item"
                      :class="{
                        active: formData[d.key],
                        'opacity-50': !isManager,
                      }"
                    >
                      <input
                        type="checkbox"
                        v-model="formData[d.key]"
                        :disabled="!isManager"
                      />
                      {{ d.label }}
                    </label>
                  </div>
                </div>
              </div>

              <!-- Customer Induk -->
              <div class="cus-section" style="margin-top: 8px">
                <div class="cus-section-title">CUSTOMER INDUK</div>
                <div class="f-row">
                  <label class="f-label">Kode Induk</label>
                  <div class="induk-wrap f-input">
                    <v-text-field
                      v-model="formData.KodeInduk"
                      variant="outlined"
                      density="compact"
                      placeholder="Klik 🔍 untuk cari"
                      hide-details
                      readonly
                      bg-color="grey-lighten-4"
                      class="f-input"
                    >
                      <template #append-inner>
                        <IconSearch
                          :size="16"
                          color="#1565c0"
                          style="cursor: pointer"
                          @mousedown.prevent="showCustomerModal = true"
                        />
                        <IconX
                          v-if="formData.KodeInduk"
                          :size="14"
                          color="#c62828"
                          class="ml-1"
                          style="cursor: pointer"
                          @click.stop="
                            formData.KodeInduk = '';
                            formData.NamaInduk = '';
                            formData.AlamatInduk = '';
                            formData.KotaInduk = '';
                          "
                        />
                      </template>
                    </v-text-field>
                  </div>
                </div>

                <div
                  v-if="formData.KodeInduk"
                  class="mt-2 pa-2 bg-grey-lighten-4 rounded text-caption"
                >
                  <div class="font-weight-bold text-primary">
                    {{ formData.NamaInduk }}
                  </div>
                  <div class="text-grey-darken-1">
                    {{ formData.AlamatInduk }}
                  </div>
                  <div class="text-grey-darken-1">{{ formData.KotaInduk }}</div>
                </div>
              </div>
            </div>
          </div>
        </v-form>
      </v-card-text>

      <!-- Footer -->
      <div class="cus-footer">
        <button
          type="button"
          class="cus-btn-cancel"
          @click="dialogVisible = false"
          :disabled="isSaving"
        >
          Batal
        </button>
        <button
          type="button"
          class="cus-btn-save"
          @click="handleSave"
          :disabled="isSaving"
        >
          <span v-if="isSaving">Menyimpan...</span>
          <span v-else>Simpan (F10)</span>
        </button>
      </div>
    </v-card>

    <CustomerSearchModal
      v-model="showCustomerModal"
      @selected="handleCustomerSelected"
    />
  </v-dialog>
</template>

<style scoped>
/* ── Dialog ── */
.cus-dialog-card {
  font-size: 12px;
  font-family: "Segoe UI", system-ui, sans-serif;
  display: flex;
  flex-direction: column;
  max-height: 92vh;
}

/* ── Header ── */
.cus-header {
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
.cus-close-btn {
  background: transparent;
  border: none;
  color: rgba(255, 255, 255, 0.8);
  font-size: 14px;
  cursor: pointer;
  padding: 0 2px;
}
.cus-close-btn:hover {
  color: white;
}

/* ── Body ── */
.cus-body {
  padding: 10px 12px !important;
  overflow-y: auto;
  flex: 1;
  background: #f4f5f7;
}

/* ── Two-column layout ── */
.cus-layout {
  display: flex;
  gap: 10px;
  align-items: flex-start;
}
.cus-col {
  flex: 1 1 0;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

/* ── Section card ── */
.cus-section {
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  padding: 8px 12px 10px;
}
.cus-section-title {
  font-size: 10px;
  font-weight: 700;
  color: #1565c0;
  letter-spacing: 0.06em;
  margin-bottom: 7px;
  display: flex;
  align-items: center;
  gap: 6px;
}
.cus-section-hint {
  font-size: 10px;
  font-weight: 400;
  color: #e53935;
  letter-spacing: 0;
}

/* ── Field row ── */
.f-row {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 5px;
}
.f-row:last-child {
  margin-bottom: 0;
}

.f-label {
  width: 76px;
  flex-shrink: 0;
  font-size: 11px;
  font-weight: 600;
  color: #555;
  text-align: right;
  white-space: nowrap;
}

.f-input {
  flex: 1;
  min-width: 0;
}

.req {
  color: #e53935;
}

/* ── Vuetify field height ── */
.f-input :deep(.v-field) {
  font-size: 12px;
  min-height: 30px;
  height: 30px;
}
.f-input :deep(.v-field__input) {
  min-height: 30px;
  padding-top: 0;
  padding-bottom: 0;
  font-size: 12px;
}
.f-input :deep(.v-input__control) {
  min-height: 30px;
}

/* ── Radio ── */
.radio-label {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  cursor: pointer;
  white-space: nowrap;
}
.radio-label input[type="radio"] {
  accent-color: #1565c0;
  cursor: pointer;
}
.radio-label.text-error {
  color: #c62828;
}

/* ── Divisi pills ── */
.divisi-wrap {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
}
.divisi-item {
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
.divisi-item input[type="checkbox"] {
  width: 12px;
  height: 12px;
  accent-color: #1565c0;
  cursor: pointer;
}
.divisi-item.active {
  background: #e3f2fd;
  border-color: #1565c0;
  color: #1565c0;
  font-weight: 600;
}

/* ── Footer ── */
.cus-footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  padding: 7px 12px;
  border-top: 1px solid #e0e0e0;
  background: #fafafa;
  flex-shrink: 0;
}
.cus-btn-cancel {
  background: transparent;
  border: 1px solid #d0d0d0;
  border-radius: 4px;
  padding: 5px 14px;
  font-size: 12px;
  cursor: pointer;
  color: #555;
}
.cus-btn-cancel:hover {
  background: #f5f5f5;
}
.cus-btn-save {
  background: #1565c0;
  color: white;
  border: none;
  border-radius: 4px;
  padding: 5px 18px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
}
.cus-btn-save:hover {
  background: #1557a8;
}
.cus-btn-save:disabled,
.cus-btn-cancel:disabled {
  opacity: 0.5;
  cursor: default;
}

.opacity-50 {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
