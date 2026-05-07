<script setup lang="ts">
import { ref, watch, computed } from "vue";
import type { VForm } from "vuetify/components";
import api from "@/services/api";
import { useToast } from "vue-toastification";
import { useAuthStore } from "@/stores/authStore";
import SearchLookup from "@/components/SearchLookup.vue";
import {
  IconDatabase,
  IconX,
  IconSearch,
  IconHelpCircle,
  IconAlertTriangle,
} from "@tabler/icons-vue";

const props = defineProps<{
  modelValue: boolean;
  isNewMode: boolean;
  bahanData?: any;
}>();

const emit = defineEmits(["update:modelValue", "saved"]);

const toast = useToast();
const authStore = useAuthStore();
const dialogVisible = computed({
  get: () => props.modelValue,
  set: (val) => emit("update:modelValue", val),
});

const formRef = ref<VForm | null>(null);
const isSaving = ref(false);
const confirmDialogVisible = ref(false);
const confirmCancelDialogVisible = ref(false);

const projectOptions = ref<any[]>([]);
const satuanOptions = ref<string[]>([]);

// --- LOOKUP STATES ---
const lookupState = ref({
  show: false,
  title: "",
  category: "",
  targetKey: "",
});

const openLookup = (category: string, title: string, target: string) => {
  if (!props.isNewMode) return;
  lookupState.value = { show: true, title, category, targetKey: target };
};

const handleLookupSelect = (item: any) => {
  const key = lookupState.value.targetKey;
  if (key === "jenis") {
    formData.value.kdJenis = item.Kode;
    formData.value.nmJenis = item.Nama;
  } else if (key === "warna") {
    formData.value.kdWarna = item.Kode;
    formData.value.nmWarna = item.Nama;
  } else if (key === "gramasi") {
    formData.value.kdGramasi = item.Kode;
    formData.value.nmGramasi = item.Nama;
  } else if (key === "setting") {
    formData.value.kdSetting = item.Kode;
    formData.value.nmSetting = item.Nama;
  }
};

// --- STATE FORM ---
const formData = ref({
  Bhn_kode: "",
  Bhn_name: "",
  Bhn_satuan: "KG",
  Bhn_ket: "",
  Bhn_buffer: 0,
  Bhn_dead: 0,
  Bhn_hargabeli: 0,
  Bhn_avgcost: 0,
  kdJenis: "",
  nmJenis: "",
  kdWarna: "",
  nmWarna: "",
  kdGramasi: "",
  nmGramasi: "",
  kdSetting: "",
  nmSetting: "",
  project: "REGULER",
});

const generatedName = computed(() => {
  const p = formData.value.project === "REGULER" ? "" : formData.value.project;
  return `${formData.value.nmJenis} ${formData.value.nmWarna} ${formData.value.nmGramasi} ${formData.value.nmSetting} ${p}`
    .trim()
    .toUpperCase();
});

watch(generatedName, (newVal) => {
  formData.value.Bhn_name = newVal;
});

const loadOptions = async () => {
  try {
    const [resProject, resSatuan] = await Promise.all([
      api.get("/master/bahan/lookups/project"),
      api.get("/master/bahan/lookups/satuan"),
    ]);
    projectOptions.value = resProject.data.data;
    satuanOptions.value = resSatuan.data.data.map((i: any) => i.Nama);
  } catch (e) {
    toast.error("Gagal memuat opsi referensi");
  }
};

watch(
  () => props.modelValue,
  (isOpen) => {
    if (isOpen) {
      loadOptions();
      if (props.isNewMode) {
        resetForm();
      } else if (props.bahanData) {
        formData.value = { ...props.bahanData };
      }
      formRef.value?.resetValidation();
    }
  },
);

const resetForm = () => {
  formData.value = {
    Bhn_kode: "",
    Bhn_name: "",
    Bhn_satuan: "KG",
    Bhn_ket: "",
    Bhn_buffer: 0,
    Bhn_dead: 0,
    Bhn_hargabeli: 0,
    Bhn_avgcost: 0,
    kdJenis: "",
    nmJenis: "",
    kdWarna: "",
    nmWarna: "",
    kdGramasi: "",
    nmGramasi: "",
    kdSetting: "",
    nmSetting: "",
    project: "REGULER",
  };
};

const handleSave = async () => {
  const { valid } = await formRef.value!.validate();
  if (!valid) return toast.warning("Lengkapi data yang diwajibkan.");
  confirmDialogVisible.value = true;
};

const executeSave = async () => {
  isSaving.value = true;
  try {
    const selectedProj = projectOptions.value.find(
      (p) => p.Nama === formData.value.project,
    );
    const ckdProject = selectedProj ? selectedProj.Kode.trim() : "";

    if (props.isNewMode) {
      formData.value.Bhn_kode = (
        formData.value.kdJenis +
        formData.value.kdWarna +
        formData.value.kdGramasi +
        formData.value.kdSetting +
        ckdProject
      ).toUpperCase();
      await api.post("/master/bahan", formData.value);
      toast.success("Master Bahan berhasil dibuat.");
    } else {
      await api.put(`/master/bahan/${formData.value.Bhn_kode}`, formData.value);
      toast.success("Master Bahan berhasil diperbarui.");
    }
    confirmDialogVisible.value = false;
    dialogVisible.value = false;
    emit("saved");
  } catch (error: any) {
    toast.error(error.response?.data?.message || "Gagal menyimpan data.");
  } finally {
    isSaving.value = false;
  }
};
</script>

<template>
  <v-dialog v-model="dialogVisible" persistent max-width="800px">
    <v-card class="dialog-card">
      <v-form ref="formRef" @submit.prevent="handleSave">
        <v-card-title
          class="bg-primary text-white d-flex align-center pa-2 px-4"
        >
          <IconDatabase
            :size="16"
            :stroke-width="1.7"
            color="white"
            class="mr-2"
          />
          <span class="text-subtitle-2 font-weight-bold">
            {{ isNewMode ? "TAMBAH MASTER BAHAN" : "UBAH MASTER BAHAN" }}
          </span>
          <v-spacer></v-spacer>
          <v-btn
            variant="text"
            size="small"
            @click="confirmCancelDialogVisible = true"
          >
            <IconX :size="16" :stroke-width="2" color="white" />
          </v-btn>
        </v-card-title>

        <v-card-text class="pa-4">
          <v-row dense>
            <v-col cols="12" md="4">
              <v-text-field
                v-model="formData.Bhn_kode"
                label="Kode Bahan"
                variant="outlined"
                density="compact"
                readonly
                bg-color="grey-lighten-4"
                hide-details="auto"
              />
            </v-col>
            <v-col cols="12" md="8" class="d-flex align-center">
              <span class="text-error text-caption font-italic" v-if="isNewMode"
                >* Terbentuk otomatis</span
              >
            </v-col>

            <v-col cols="12">
              <v-text-field
                v-model="formData.Bhn_name"
                label="Nama Bahan (Otomatis)"
                variant="outlined"
                density="compact"
                readonly
                bg-color="grey-lighten-4"
                hide-details="auto"
              />
            </v-col>

            <v-col cols="6" md="3">
              <v-text-field
                v-model="formData.kdJenis"
                label="Jenis"
                variant="outlined"
                density="compact"
                readonly
                hide-details="auto"
              >
                <template #append-inner>
                  <IconSearch
                    :size="15"
                    :stroke-width="1.7"
                    color="#1565c0"
                    style="cursor: pointer"
                    @click="openLookup('jenis', 'Jenis Bahan', 'jenis')"
                  />
                </template>
              </v-text-field>
            </v-col>
            <v-col cols="6" md="3">
              <v-text-field
                v-model="formData.kdWarna"
                label="Warna"
                variant="outlined"
                density="compact"
                readonly
                hide-details="auto"
              >
                <template #append-inner>
                  <IconSearch
                    :size="15"
                    :stroke-width="1.7"
                    color="#1565c0"
                    style="cursor: pointer"
                    @click="openLookup('warna', 'Warna Bahan', 'warna')"
                  />
                </template>
              </v-text-field>
            </v-col>
            <v-col cols="6" md="3">
              <v-text-field
                v-model="formData.kdGramasi"
                label="Gramasi"
                variant="outlined"
                density="compact"
                readonly
                hide-details="auto"
              >
                <template #append-inner>
                  <IconSearch
                    :size="15"
                    :stroke-width="1.7"
                    color="#1565c0"
                    style="cursor: pointer"
                    @click="openLookup('gramasi', 'Gramasi Bahan', 'gramasi')"
                  />
                </template>
              </v-text-field>
            </v-col>
            <v-col cols="6" md="3">
              <v-text-field
                v-model="formData.kdSetting"
                label="Setting"
                variant="outlined"
                density="compact"
                readonly
                hide-details="auto"
              >
                <template #append-inner>
                  <IconSearch
                    :size="15"
                    :stroke-width="1.7"
                    color="#1565c0"
                    style="cursor: pointer"
                    @click="openLookup('setting', 'Setting Bahan', 'setting')"
                  />
                </template>
              </v-text-field>
            </v-col>

            <v-col cols="12" md="6">
              <v-select
                v-model="formData.project"
                :items="projectOptions"
                item-title="Nama"
                item-value="Nama"
                label="Project"
                variant="outlined"
                density="compact"
                hide-details="auto"
                :readonly="!isNewMode"
              />
            </v-col>
            <v-col cols="12" md="6">
              <v-select
                v-model="formData.Bhn_satuan"
                :items="satuanOptions"
                label="Satuan"
                variant="outlined"
                density="compact"
                hide-details="auto"
              />
            </v-col>

            <v-col cols="12">
              <v-radio-group
                v-model="formData.Bhn_dead"
                inline
                label="Kategori"
                density="compact"
                hide-details
              >
                <v-radio label="Reguler" :value="0" color="primary"></v-radio>
                <v-radio label="Dead Stock" :value="1" color="error"></v-radio>
              </v-radio-group>
            </v-col>

            <v-col cols="12">
              <v-text-field
                v-model="formData.Bhn_ket"
                label="Keterangan"
                variant="outlined"
                density="compact"
                hide-details="auto"
              />
            </v-col>
            <v-col cols="12" md="4">
              <v-text-field
                v-model.number="formData.Bhn_buffer"
                label="Buffer Stok"
                type="number"
                variant="outlined"
                density="compact"
                hide-details="auto"
              />
            </v-col>

            <v-col cols="12" v-if="authStore.canLihatHarga">
              <div class="pa-3 bg-blue-lighten-5 rounded border mt-2">
                <v-row dense>
                  <v-col cols="12" md="6">
                    <v-text-field
                      v-model="formData.Bhn_avgcost"
                      label="Avg Cost"
                      prefix="Rp"
                      variant="outlined"
                      density="compact"
                      readonly
                      hide-details
                    />
                  </v-col>
                  <v-col cols="12" md="6">
                    <v-text-field
                      v-model.number="formData.Bhn_hargabeli"
                      label="Harga Beli Terakhir"
                      prefix="Rp"
                      variant="outlined"
                      density="compact"
                      hide-details
                    />
                  </v-col>
                </v-row>
              </div>
            </v-col>
          </v-row>
        </v-card-text>

        <v-card-actions class="bg-grey-lighten-4 border-t pa-3">
          <v-spacer></v-spacer>
          <v-btn
            variant="text"
            @click="confirmCancelDialogVisible = true"
            :disabled="isSaving"
            >Batal</v-btn
          >
          <v-btn
            color="primary"
            type="submit"
            variant="elevated"
            :loading="isSaving"
            class="px-6"
            >Simpan Data (F10)</v-btn
          >
        </v-card-actions>
      </v-form>
    </v-card>
  </v-dialog>

  <SearchLookup
    v-model="lookupState.show"
    :title="lookupState.title"
    :lookup-category="lookupState.category"
    @on-select="handleLookupSelect"
  />

  <v-dialog v-model="confirmDialogVisible" max-width="400px">
    <v-card class="rounded-lg">
      <v-card-title class="text-subtitle-1 font-weight-bold pa-4">
        <IconHelpCircle
          :size="18"
          :stroke-width="1.7"
          color="#1565c0"
          class="mr-2"
        />
        Konfirmasi
      </v-card-title>
      <v-card-text class="pa-4 pt-0 text-body-2"
        >Yakin ingin menyimpan data bahan ini?</v-card-text
      >
      <v-card-actions class="pa-4">
        <v-spacer></v-spacer>
        <v-btn variant="text" @click="confirmDialogVisible = false"
          >Batal</v-btn
        >
        <v-btn color="primary" variant="elevated" @click="executeSave"
          >Ya, Simpan</v-btn
        >
      </v-card-actions>
    </v-card>
  </v-dialog>

  <v-dialog v-model="confirmCancelDialogVisible" max-width="400px">
    <v-card class="rounded-lg">
      <v-card-title class="text-subtitle-1 font-weight-bold pa-4 text-error">
        <IconAlertTriangle
          :size="18"
          :stroke-width="1.7"
          color="#c62828"
          class="mr-2"
        />
        Batalkan
      </v-card-title>
      <v-card-text class="pa-4 pt-0 text-body-2"
        >Perubahan belum disimpan. Yakin ingin keluar?</v-card-text
      >
      <v-card-actions class="pa-4">
        <v-spacer></v-spacer>
        <v-btn variant="text" @click="confirmCancelDialogVisible = false"
          >Lanjut Input</v-btn
        >
        <v-btn
          color="error"
          variant="elevated"
          @click="
            () => {
              confirmCancelDialogVisible = false;
              dialogVisible = false;
            }
          "
          >Ya, Tutup</v-btn
        >
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.dialog-card :deep(*) {
  font-size: 11px !important;
}
</style>
