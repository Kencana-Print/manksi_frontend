<script setup lang="ts">
import { ref, watch } from "vue";
import { useToast } from "vue-toastification";
import { jenisPembayaranService } from "@/services/master/jenisPembayaranService";

const props = defineProps<{
  modelValue: boolean;
}>();

const emit = defineEmits(["update:modelValue", "saved"]);
const toast = useToast();

const isSaving = ref(false);
const nama = ref("");

watch(
  () => props.modelValue,
  (val) => {
    if (val) nama.value = "";
  },
);

const close = () => emit("update:modelValue", false);

const handleSave = async () => {
  if (!nama.value.trim()) return toast.warning("Jenis pembayaran wajib diisi.");

  isSaving.value = true;
  try {
    await jenisPembayaranService.save({ nama: nama.value.trim() });
    toast.success("Jenis pembayaran berhasil disimpan.");
    emit("saved");
    close();
  } catch (error: any) {
    toast.error(
      error?.response?.data?.message || "Gagal menyimpan jenis pembayaran.",
    );
  } finally {
    isSaving.value = false;
  }
};
</script>

<template>
  <v-dialog
    :model-value="modelValue"
    @update:model-value="close"
    max-width="380px"
    persistent
  >
    <v-card rounded="lg">
      <v-card-title class="bg-primary text-white pa-3 text-subtitle-1">
        Tambah Jenis Pembayaran
      </v-card-title>
      <v-card-text class="pa-4">
        <v-text-field
          v-model="nama"
          label="Jenis Pembayaran"
          variant="outlined"
          density="compact"
          autofocus
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
