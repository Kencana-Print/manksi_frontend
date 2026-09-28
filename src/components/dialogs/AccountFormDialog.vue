<script setup lang="ts">
import { ref, watch } from "vue";
import { useToast } from "vue-toastification";
import { accountService } from "@/services/master/accountService";

const props = defineProps<{
  modelValue: boolean;
  isNewMode: boolean;
  editData: any;
}>();

const emit = defineEmits(["update:modelValue", "saved"]);

const toast = useToast();
const isSaving = ref(false);
const kelompokList = ref<{ id: number; nama: string }[]>([]);
const cabangList = ref<{ cabang: string }[]>([]);

const form = ref({
  kode: "",
  nama: "",
  no_rekening: "",
  kol_id: null as number | null,
  cabang: "",
  store: "",
  keterangan: "",
  is_aktif: true,
});

const loadOptions = async () => {
  try {
    const [resKelompok, resCabang] = await Promise.all([
      accountService.getKelompok(),
      accountService.getCabang(),
    ]);
    kelompokList.value = resKelompok.data.data;
    cabangList.value = resCabang.data.data;
  } catch (error) {
    toast.error("Gagal memuat data kelompok/cabang.");
  }
};

watch(
  () => props.modelValue,
  (v) => {
    if (!v) return;
    loadOptions();
    if (props.isNewMode) {
      form.value = {
        kode: "",
        nama: "",
        no_rekening: "",
        kol_id: null,
        cabang: "",
        store: "",
        keterangan: "",
        is_aktif: true,
      };
    } else if (props.editData) {
      form.value = {
        kode: props.editData.kode,
        nama: props.editData.nama,
        no_rekening: props.editData.no_rekening || "",
        kol_id: props.editData.kol_id,
        cabang: props.editData.cabang || "",
        store: props.editData.store || "",
        keterangan: props.editData.keterangan || "",
        is_aktif: Number(props.editData.is_aktif) === 0,
      };
    }
  },
);

const close = () => {
  emit("update:modelValue", false);
};

const handleSave = async () => {
  if (!form.value.nama.trim()) {
    toast.error("Nama Account wajib diisi.");
    return;
  }
  if (!form.value.kol_id) {
    toast.error("Kelompok wajib dipilih.");
    return;
  }
  if (props.isNewMode && !form.value.kode.trim()) {
    toast.error("Kode Account wajib diisi.");
    return;
  }
  if (props.isNewMode && !form.value.cabang) {
    toast.error("Cabang wajib dipilih.");
    return;
  }

  isSaving.value = true;
  try {
    await accountService.save({
      isEdit: !props.isNewMode,
      kode: form.value.kode.trim(),
      nama: form.value.nama.trim(),
      no_rekening: form.value.no_rekening.trim(),
      kol_id: form.value.kol_id,
      cabang: form.value.cabang,
      store: form.value.store.trim(),
      keterangan: form.value.keterangan.trim(),
      is_aktif: form.value.is_aktif,
    });
    toast.success("Account berhasil disimpan.");
    emit("saved");
    close();
  } catch (error: any) {
    toast.error(error?.response?.data?.message || "Gagal menyimpan Account.");
  } finally {
    isSaving.value = false;
  }
};
</script>

<template>
  <v-dialog
    :model-value="modelValue"
    max-width="560px"
    persistent
    @update:model-value="(v) => emit('update:modelValue', v)"
  >
    <v-card>
      <v-card-title class="pa-4">
        <span class="text-subtitle-1 font-weight-bold">
          {{ isNewMode ? "Tambah Account" : "Edit Account" }}
        </span>
      </v-card-title>
      <v-divider />
      <v-card-text class="pa-4">
        <v-row dense>
          <v-col cols="5">
            <v-text-field
              v-model="form.kode"
              label="Kode"
              density="compact"
              variant="outlined"
              :readonly="!isNewMode"
              class="mb-2"
            />
          </v-col>
          <v-col cols="7">
            <v-select
              v-model="form.cabang"
              :items="cabangList"
              item-title="cabang"
              item-value="cabang"
              label="Cabang"
              density="compact"
              variant="outlined"
              :disabled="!isNewMode"
              class="mb-2"
            />
          </v-col>
        </v-row>

        <v-text-field
          v-model="form.nama"
          label="Nama Account"
          density="compact"
          variant="outlined"
          class="mb-2"
        />

        <v-select
          v-model="form.kol_id"
          :items="kelompokList"
          item-title="nama"
          item-value="id"
          label="Kelompok"
          density="compact"
          variant="outlined"
          class="mb-2"
        />

        <v-text-field
          v-model="form.no_rekening"
          label="No. Rekening"
          density="compact"
          variant="outlined"
          class="mb-2"
        />

        <v-text-field
          v-model="form.store"
          label="Store (Kaosan)"
          density="compact"
          variant="outlined"
          class="mb-2"
        />

        <v-textarea
          v-model="form.keterangan"
          label="Keterangan"
          density="compact"
          variant="outlined"
          rows="2"
          class="mb-2"
        />

        <v-switch
          v-model="form.is_aktif"
          label="Aktif"
          color="success"
          density="compact"
          hide-details
          class="mb-1"
        />
      </v-card-text>
      <v-divider />
      <v-card-actions class="pa-3">
        <v-spacer />
        <v-btn variant="text" @click="close">Batal</v-btn>
        <v-btn
          color="primary"
          variant="flat"
          :loading="isSaving"
          @click="handleSave"
        >
          Simpan
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style scoped>
:deep(.v-card) {
  font-size: 12px;
}
.text-subtitle-1 {
  font-size: 13px !important;
}
:deep(.v-field__input),
:deep(.v-label),
:deep(input),
:deep(textarea) {
  font-size: 12px !important;
}
:deep(.v-btn) {
  font-size: 11px !important;
  letter-spacing: normal;
}
:deep(.v-selection-control-group),
:deep(.v-switch .v-label) {
  font-size: 12px !important;
}
</style>
