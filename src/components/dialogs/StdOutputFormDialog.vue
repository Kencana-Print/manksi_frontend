<script setup lang="ts">
import { ref, watch, computed } from "vue";
import type { VForm } from "vuetify/components";
import api from "@/services/api";
import { useToast } from "vue-toastification";
import { IconChartLine, IconX } from "@tabler/icons-vue";

const props = defineProps<{
  modelValue: boolean;
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
  Potong: 0,
  Cetak: 0,
  Bordir: 0,
  Hotpres: 0,
  QcCetak: 0,
  DC: 0,
  Jahit: 0,
  Lipat: 0,
});

watch(
  () => props.modelValue,
  (isOpen) => {
    if (isOpen && props.editData) {
      // Map data dari props ke form
      formData.value = {
        Potong: Number(props.editData.Potong) || 0,
        Cetak: Number(props.editData.Cetak) || 0,
        Bordir: Number(props.editData.Bordir) || 0,
        Hotpres: Number(props.editData.Hotpres) || 0,
        QcCetak: Number(props.editData.QcCetak) || 0,
        DC: Number(props.editData.DC) || 0,
        Jahit: Number(props.editData.Jahit) || 0,
        Lipat: Number(props.editData.Lipat) || 0,
      };
      formRef.value?.resetValidation();
    }
  },
);

const handleSave = async () => {
  const { valid } = await formRef.value!.validate();
  if (!valid) return;

  isSaving.value = true;
  try {
    await api.put(`/master/standart-output`, formData.value);
    toast.success("Standar Output berhasil diperbarui");
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
  <v-dialog v-model="dialogVisible" persistent max-width="400px">
    <v-card class="dialog-card">
      <v-card-title class="bg-primary text-white d-flex align-center pa-2 px-4">
        <IconChartLine
          :size="16"
          :stroke-width="1.7"
          color="white"
          class="mr-2"
        />
        <span class="text-subtitle-2 font-weight-bold"
          >Standar Output per Hari</span
        >
        <v-spacer></v-spacer>
        <v-btn variant="text" size="small" @click="dialogVisible = false">
          <IconX :size="16" :stroke-width="2" color="white" />
        </v-btn>
      </v-card-title>

      <v-card-text class="pa-4 bg-grey-lighten-4">
        <v-form ref="formRef" @submit.prevent="handleSave">
          <v-row dense>
            <v-col cols="12" sm="6">
              <v-text-field
                v-model.number="formData.Potong"
                label="Potong"
                type="number"
                variant="outlined"
                density="compact"
                hide-details="auto"
                class="mb-2 bg-white"
                v-select-on-focus
              ></v-text-field>
            </v-col>
            <v-col cols="12" sm="6">
              <v-text-field
                v-model.number="formData.Cetak"
                label="Cetak"
                type="number"
                variant="outlined"
                density="compact"
                hide-details="auto"
                class="mb-2 bg-white"
                v-select-on-focus
              ></v-text-field>
            </v-col>
            <v-col cols="12" sm="6">
              <v-text-field
                v-model.number="formData.Bordir"
                label="Bordir"
                type="number"
                variant="outlined"
                density="compact"
                hide-details="auto"
                class="mb-2 bg-white"
                v-select-on-focus
              ></v-text-field>
            </v-col>
            <v-col cols="12" sm="6">
              <v-text-field
                v-model.number="formData.Hotpres"
                label="Hotpres"
                type="number"
                variant="outlined"
                density="compact"
                hide-details="auto"
                class="mb-2 bg-white"
                v-select-on-focus
              ></v-text-field>
            </v-col>
            <v-col cols="12" sm="6">
              <v-text-field
                v-model.number="formData.QcCetak"
                label="QC Cetak"
                type="number"
                variant="outlined"
                density="compact"
                hide-details="auto"
                class="mb-2 bg-white"
                v-select-on-focus
              ></v-text-field>
            </v-col>
            <v-col cols="12" sm="6">
              <v-text-field
                v-model.number="formData.DC"
                label="DC"
                type="number"
                variant="outlined"
                density="compact"
                hide-details="auto"
                class="mb-2 bg-white"
                v-select-on-focus
              ></v-text-field>
            </v-col>
            <v-col cols="12" sm="6">
              <v-text-field
                v-model.number="formData.Jahit"
                label="Jahit"
                type="number"
                variant="outlined"
                density="compact"
                hide-details="auto"
                class="mb-2 bg-white"
                v-select-on-focus
              ></v-text-field>
            </v-col>
            <v-col cols="12" sm="6">
              <v-text-field
                v-model.number="formData.Lipat"
                label="Lipat"
                type="number"
                variant="outlined"
                density="compact"
                hide-details="auto"
                class="mb-2 bg-white"
                v-select-on-focus
              ></v-text-field>
            </v-col>
          </v-row>
        </v-form>
      </v-card-text>

      <v-divider></v-divider>

      <v-card-actions class="pa-3">
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
          >Simpan (F10)</v-btn
        >
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.dialog-card :deep(*) {
  font-size: 12px !important;
}
</style>
