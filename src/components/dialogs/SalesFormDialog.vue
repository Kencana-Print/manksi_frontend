<script setup lang="ts">
import { ref, watch, computed } from "vue";
import type { VForm } from "vuetify/components";
import api from "@/services/api";
import { useToast } from "vue-toastification";
import { IconTie, IconX } from "@tabler/icons-vue";

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
  Alamat: "",
  Kota: "",
  Telp: "",
});

watch(
  () => props.modelValue,
  (isOpen) => {
    if (isOpen) {
      if (props.isNewMode) {
        formData.value = { Kode: "", Nama: "", Alamat: "", Kota: "", Telp: "" };
      } else {
        const ed = props.editData;
        formData.value = {
          Kode: ed.Kode,
          Nama: ed.Nama,
          Alamat: ed.Alamat || "",
          Kota: ed.Kota || "",
          Telp: ed.Telp || "",
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
      await api.post("/master/sales", formData.value);
      toast.success("Berhasil menyimpan data Sales");
    } else {
      await api.put(`/master/sales/${formData.value.Kode}`, formData.value);
      toast.success("Berhasil memperbarui data Sales");
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
  <v-dialog v-model="dialogVisible" persistent max-width="600px" scrollable>
    <v-card class="dialog-card bg-grey-lighten-4">
      <v-card-title class="bg-primary text-white d-flex align-center pa-2 px-4">
        <IconTie :size="16" :stroke-width="1.7" color="white" class="mr-2" />
        <span class="text-subtitle-2 font-weight-bold">
          {{ isNewMode ? "TAMBAH" : "UBAH" }} MASTER SALES
        </span>
        <v-spacer></v-spacer>
        <v-btn variant="text" size="small" @click="dialogVisible = false">
          <IconX :size="16" :stroke-width="2" color="white" />
        </v-btn>
      </v-card-title>

      <v-card-text class="pa-4">
        <v-form ref="formRef" @submit.prevent="handleSave">
          <div class="bg-white border rounded pa-4">
            <v-row dense align="center">
              <v-col cols="12" sm="3" class="text-caption font-weight-bold"
                >Kode</v-col
              >
              <v-col cols="12" sm="9">
                <v-text-field
                  v-model="formData.Kode"
                  variant="outlined"
                  density="compact"
                  readonly
                  bg-color="grey-lighten-4"
                  :placeholder="isNewMode ? '<- Kosong = Baru' : ''"
                  hide-details="auto"
                  class="mb-2"
                ></v-text-field>
              </v-col>

              <v-col cols="12" sm="3" class="text-caption font-weight-bold"
                >Nama *</v-col
              >
              <v-col cols="12" sm="9">
                <v-text-field
                  v-model="formData.Nama"
                  variant="outlined"
                  density="compact"
                  :rules="[(v) => !!v || 'Nama wajib diisi']"
                  hide-details="auto"
                  class="mb-2"
                  autofocus
                ></v-text-field>
              </v-col>

              <v-col cols="12" sm="3" class="text-caption font-weight-bold"
                >Alamat</v-col
              >
              <v-col cols="12" sm="9">
                <v-text-field
                  v-model="formData.Alamat"
                  variant="outlined"
                  density="compact"
                  hide-details="auto"
                  class="mb-2"
                ></v-text-field>
              </v-col>

              <v-col cols="12" sm="3" class="text-caption font-weight-bold"
                >Kota</v-col
              >
              <v-col cols="12" sm="9">
                <v-text-field
                  v-model="formData.Kota"
                  variant="outlined"
                  density="compact"
                  hide-details="auto"
                  class="mb-2"
                ></v-text-field>
              </v-col>

              <v-col cols="12" sm="3" class="text-caption font-weight-bold"
                >No Telp</v-col
              >
              <v-col cols="12" sm="9">
                <v-text-field
                  v-model="formData.Telp"
                  variant="outlined"
                  density="compact"
                  hide-details="auto"
                  class="mb-2"
                ></v-text-field>
              </v-col>
            </v-row>
          </div>
        </v-form>
      </v-card-text>

      <v-divider></v-divider>

      <v-card-actions class="pa-3 bg-white">
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
  font-size: 11px !important;
}
</style>
