<script setup lang="ts">
import { ref, watch } from "vue";
import { useToast } from "vue-toastification";
import { kelompokService } from "@/services/master/kelompokService";

const props = defineProps<{
  modelValue: boolean;
  isNewMode: boolean;
  editData: any;
}>();

const emit = defineEmits(["update:modelValue", "saved"]);
const toast = useToast();

const isSaving = ref(false);
const form = ref({
  kode: "",
  nama: "",
  keterangan: "",
});

const resetForm = () => {
  form.value = { kode: "", nama: "", keterangan: "" };
};

watch(
  () => props.modelValue,
  (val) => {
    if (val) {
      if (props.isNewMode) {
        resetForm();
      } else if (props.editData) {
        form.value = {
          kode: props.editData.kode ?? "",
          nama: props.editData.nama ?? "",
          keterangan: props.editData.keterangan ?? "",
        };
      }
    }
  },
);

const close = () => emit("update:modelValue", false);

const handleSave = async () => {
  if (!form.value.kode.trim()) return toast.warning("Kode wajib diisi.");
  if (!form.value.nama.trim()) return toast.warning("Nama wajib diisi.");

  isSaving.value = true;
  try {
    await kelompokService.save({
      isEdit: !props.isNewMode,
      kode: form.value.kode.trim(),
      nama: form.value.nama.trim(),
      keterangan: form.value.keterangan.trim(),
    });
    toast.success(
      props.isNewMode
        ? "Kelompok berhasil disimpan."
        : "Kelompok berhasil diupdate.",
    );
    emit("saved");
    close();
  } catch (error: any) {
    toast.error(error?.response?.data?.message || "Gagal menyimpan kelompok.");
  } finally {
    isSaving.value = false;
  }
};
</script>

<template>
  <v-dialog
    :model-value="modelValue"
    @update:model-value="close"
    max-width="420px"
    persistent
  >
    <v-card rounded="lg">
      <v-card-title class="bg-primary text-white pa-3 text-subtitle-1">
        {{ isNewMode ? "Tambah Kelompok" : "Edit Kelompok" }}
      </v-card-title>
      <v-card-text class="pa-4">
        <v-text-field
          v-model="form.kode"
          label="Kode"
          variant="outlined"
          density="compact"
          :disabled="!isNewMode"
          class="mb-3"
          hide-details
        />
        <v-text-field
          v-model="form.nama"
          label="Nama"
          variant="outlined"
          density="compact"
          class="mb-3"
          hide-details
        />
        <v-textarea
          v-model="form.keterangan"
          label="Keterangan"
          variant="outlined"
          density="compact"
          rows="3"
          hide-details
        />
      </v-card-text>
      <v-card-actions class="pa-3 border-t bg-grey-lighten-4">
        <v-spacer />
        <v-btn variant="text" :disabled="isSaving" @click="close">Batal</v-btn>
        <v-btn
          color="primary"
          variant="elevated"
          :loading="isSaving"
          @click="handleSave"
        >
          Simpan
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
