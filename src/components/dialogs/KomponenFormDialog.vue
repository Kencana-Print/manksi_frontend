<script setup lang="ts">
import { ref, watch, computed } from "vue";
import type { VForm } from "vuetify/components";
import api from "@/services/api";
import { useToast } from "vue-toastification";
import { IconPuzzle, IconX } from "@tabler/icons-vue";

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

const formData = ref({
  Kode: "",
  Nama: "",
  Satuan: "PCS",
  Gramasi: "",
  Setting: "",
  HargaBeli: 0,
  StokAkhir: 0, // Readonly
  AvgCost: 0, // Readonly
  Aktif: "Y",
});

watch(
  () => props.modelValue,
  (isOpen) => {
    if (isOpen) {
      if (props.isNewMode) {
        formData.value = {
          Kode: "",
          Nama: "",
          Satuan: "PCS",
          Gramasi: "",
          Setting: "",
          HargaBeli: 0,
          StokAkhir: 0,
          AvgCost: 0,
          Aktif: "Y",
        };
      } else {
        const ed = props.editData;
        formData.value = {
          Kode: ed.Kode,
          Nama: ed.Nama,
          Satuan: ed.Satuan || "PCS",
          Gramasi: ed.Gramasi || "",
          Setting: ed.Setting || "",
          HargaBeli: Number(ed.HargaBeli) || 0,
          StokAkhir: Number(ed.StokAkhir) || 0,
          AvgCost: Number(ed.AvgCost) || 0,
          Aktif: ed.Aktif === 1 ? "N" : "Y", // Di backend tbahan: 0 = Aktif, 1 = Pasif
        };
      }
      formRef.value?.resetValidation();
    }
  },
);

const handleSave = async () => {
  const { valid } = await formRef.value!.validate();
  if (!valid) return;

  isSaving.value = true;
  try {
    if (props.isNewMode) {
      await api.post("/master/komponen", formData.value);
      toast.success("Berhasil menyimpan Master Komponen");
    } else {
      await api.put(`/master/komponen/${formData.value.Kode}`, formData.value);
      toast.success("Berhasil memperbarui Master Komponen");
    }
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
  <v-dialog v-model="dialogVisible" persistent max-width="650px">
    <v-card class="dialog-card">
      <v-card-title class="bg-primary text-white d-flex align-center pa-2 px-4">
        <IconPuzzle :size="16" :stroke-width="1.7" color="white" class="mr-2" />
        <span class="text-subtitle-2 font-weight-bold">
          {{ isNewMode ? "TAMBAH" : "UBAH" }} MASTER KOMPONEN
        </span>
        <v-spacer></v-spacer>
        <v-btn variant="text" size="small" @click="dialogVisible = false">
          <IconX :size="16" :stroke-width="2" color="white" />
        </v-btn>
      </v-card-title>

      <v-card-text class="pa-4">
        <v-form ref="formRef" @submit.prevent="handleSave">
          <v-row dense>
            <v-col cols="12" md="4">
              <v-text-field
                v-model="formData.Kode"
                label="Kode"
                variant="outlined"
                density="compact"
                :readonly="!isNewMode"
                :bg-color="!isNewMode ? 'grey-lighten-4' : ''"
                :rules="[(v) => !!v || 'Kode wajib diisi']"
                :placeholder="isNewMode ? 'Baru= Kode diisi' : ''"
                hide-details="auto"
                class="mb-2"
              ></v-text-field>
            </v-col>
            <v-col cols="12" md="8">
              <v-text-field
                model-value="LL - LAIN-LAIN"
                label="Jenis Bahan"
                variant="outlined"
                density="compact"
                readonly
                bg-color="grey-lighten-4"
                hide-details="auto"
              ></v-text-field>
            </v-col>

            <v-col cols="12">
              <v-text-field
                v-model="formData.Nama"
                label="Nama Komponen"
                variant="outlined"
                density="compact"
                :rules="[(v) => !!v || 'Nama wajib diisi']"
                autofocus
                hide-details="auto"
                class="mb-2"
              ></v-text-field>
            </v-col>

            <v-col cols="12" md="4">
              <v-text-field
                v-model="formData.Satuan"
                label="Satuan"
                variant="outlined"
                density="compact"
                :rules="[(v) => !!v || 'Satuan wajib diisi']"
                hide-details="auto"
              ></v-text-field>
            </v-col>
            <v-col cols="12" md="4">
              <v-text-field
                v-model="formData.Gramasi"
                label="Gramasi"
                variant="outlined"
                density="compact"
                hide-details="auto"
              ></v-text-field>
            </v-col>
            <v-col cols="12" md="4">
              <v-text-field
                v-model="formData.Setting"
                label="Setting"
                variant="outlined"
                density="compact"
                hide-details="auto"
              ></v-text-field>
            </v-col>

            <v-col cols="12" md="4" class="mt-2">
              <v-text-field
                v-model.number="formData.StokAkhir"
                label="Stok Akhir"
                type="number"
                variant="outlined"
                density="compact"
                readonly
                bg-color="grey-lighten-4"
                hide-details="auto"
                v-select-on-focus
              ></v-text-field>
            </v-col>
            <v-col cols="12" md="4" class="mt-2">
              <v-text-field
                v-model.number="formData.AvgCost"
                label="Avg Cost"
                type="number"
                variant="outlined"
                density="compact"
                readonly
                bg-color="grey-lighten-4"
                hide-details="auto"
                v-select-on-focus
              ></v-text-field>
            </v-col>
            <v-col cols="12" md="4" class="mt-2">
              <v-text-field
                v-model.number="formData.HargaBeli"
                label="Harga Beli"
                type="number"
                variant="outlined"
                density="compact"
                hide-details="auto"
                v-select-on-focus
              ></v-text-field>
            </v-col>

            <v-col cols="12" class="mt-2">
              <v-radio-group
                v-model="formData.Aktif"
                inline
                label="Status"
                density="compact"
                hide-details
              >
                <v-radio label="Aktif" value="Y" color="primary"></v-radio>
                <v-radio label="Pasif" value="N" color="error"></v-radio>
              </v-radio-group>
            </v-col>
          </v-row>
        </v-form>
      </v-card-text>

      <v-divider></v-divider>

      <v-card-actions class="pa-3 bg-grey-lighten-4">
        <v-spacer></v-spacer>
        <v-btn
          variant="text"
          @click="dialogVisible = false"
          :disabled="isSaving"
          >Batal</v-btn
        >
        <v-btn
          color="primary"
          variant="elevated"
          :loading="isSaving"
          @click="handleSave"
          class="px-6"
        >
          Simpan (F10)
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.dialog-card :deep(*) {
  font-size: 11px !important;
}
</style>
