<script setup lang="ts">
import { ref, watch, computed } from "vue";
import type { VForm } from "vuetify/components";
import api from "@/services/api";
import { useToast } from "vue-toastification";
import { IconPencil, IconX } from "@tabler/icons-vue";

const props = defineProps<{
  modelValue: boolean;
  bapNomor: string | null;
}>();

const emit = defineEmits(["update:modelValue", "saved"]);
const toast = useToast();
const formRef = ref<VForm | null>(null);
const isSaving = ref(false);

const dialogVisible = computed({
  get: () => props.modelValue,
  set: (val) => emit("update:modelValue", val),
});

const alasan = ref("");

watch(
  () => props.modelValue,
  (isOpen) => {
    if (isOpen) {
      alasan.value = "";
      formRef.value?.resetValidation();
    }
  },
);

const handleSave = async () => {
  const { valid } = await formRef.value!.validate();
  if (!valid) return;

  if (!props.bapNomor) return;

  isSaving.value = true;
  try {
    await api.post(`/master/bap-produksi/${props.bapNomor}/ajukan`, {
      alasan: alasan.value,
    });
    toast.success("Pengajuan berhasil. Menunggu ACC.");
    dialogVisible.value = false;
    emit("saved");
  } catch (error: any) {
    toast.error(error.response?.data?.message || "Gagal mengajukan perubahan.");
  } finally {
    isSaving.value = false;
  }
};
</script>

<template>
  <v-dialog v-model="dialogVisible" persistent max-width="500px">
    <v-card class="dialog-card">
      <v-card-title class="bg-primary text-white d-flex align-center pa-2 px-4">
        <IconPencil :size="16" :stroke-width="1.7" color="white" class="mr-2" />
        <span class="text-subtitle-2 font-weight-bold"
          >PENGAJUAN PERUBAHAN DATA</span
        >
        <v-spacer></v-spacer>
        <v-btn variant="text" size="small" @click="dialogVisible = false">
          <IconX :size="16" :stroke-width="2" color="white" />
        </v-btn>
      </v-card-title>

      <v-card-text class="pa-4 bg-grey-lighten-4">
        <div class="text-caption font-weight-bold mb-2">
          No. BAP: {{ bapNomor }}
        </div>
        <v-form ref="formRef" @submit.prevent="handleSave">
          <v-textarea
            v-model="alasan"
            label="Alasan Perubahan *"
            variant="outlined"
            density="compact"
            rows="3"
            :rules="[(v) => !!v || 'Alasan wajib diisi']"
            hide-details="auto"
            bg-color="white"
            autofocus
          ></v-textarea>
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
          >Ajukan</v-btn
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
