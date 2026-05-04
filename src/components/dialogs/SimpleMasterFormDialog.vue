<script setup lang="ts">
import { ref, watch, computed } from "vue";
import type { VForm } from "vuetify/components";
import api from "@/services/api";
import { useToast } from "vue-toastification";

const props = defineProps<{
  modelValue: boolean;
  isNewMode: boolean;
  editData?: any;
  title: string;
  icon: string;
  apiEndpoint: string;
  codeMaxLength?: number;
}>();

const emit = defineEmits(["update:modelValue", "saved"]);
const toast = useToast();
const formRef = ref<VForm | null>(null);
const isSaving = ref(false);
const formData = ref({ Kode: "", Nama: "" });

const dialogVisible = computed({
  get: () => props.modelValue,
  set: (val) => emit("update:modelValue", val),
});

watch(
  () => props.modelValue,
  (isOpen) => {
    if (isOpen) {
      // Reset atau isi data
      formData.value = props.isNewMode
        ? { Kode: "", Nama: "" }
        : { ...props.editData };
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
      await api.post(props.apiEndpoint, formData.value);
      toast.success(`Berhasil menyimpan ${props.title}`);
    } else {
      await api.put(
        `${props.apiEndpoint}/${formData.value.Kode}`,
        formData.value,
      );
      toast.success(`Berhasil memperbarui ${props.title}`);
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
  <v-dialog v-model="dialogVisible" persistent max-width="450px">
    <v-card class="dialog-card">
      <v-card-title class="bg-primary text-white d-flex align-center pa-2 px-4">
        <v-icon start color="white" size="small">{{ icon }}</v-icon>
        <span class="text-subtitle-2 font-weight-bold">
          {{ isNewMode ? "TAMBAH" : "UBAH" }} {{ title.toUpperCase() }}
        </span>
        <v-spacer></v-spacer>
        <v-btn
          icon="mdi-close"
          variant="text"
          size="small"
          color="white"
          @click="dialogVisible = false"
        ></v-btn>
      </v-card-title>

      <v-card-text class="pa-4">
        <v-form ref="formRef" @submit.prevent="handleSave">
          <v-text-field
            v-model="formData.Kode"
            label="Kode"
            variant="outlined"
            density="compact"
            :readonly="!isNewMode"
            :bg-color="!isNewMode ? 'grey-lighten-4' : ''"
            :maxlength="codeMaxLength || 5"
            :rules="[(v) => !!v || 'Kode wajib diisi']"
            class="mb-2"
          ></v-text-field>

          <v-text-field
            v-model="formData.Nama"
            label="Nama / Keterangan"
            variant="outlined"
            density="compact"
            :rules="[(v) => !!v || 'Nama wajib diisi']"
            autofocus
            hide-details
          ></v-text-field>
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
