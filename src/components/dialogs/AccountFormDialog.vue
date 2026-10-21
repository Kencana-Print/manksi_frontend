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
const indukList = ref<
  { kode: string; nama: string; kol_id: number; cabang: string }[]
>([]);
const pemilikList = ref<{ kode: string; nama: string }[]>([]);

const form = ref({
  kode: "",
  nama: "",
  no_rekening: "",
  kol_id: null as number | null,
  cabang: "",
  store: "",
  keterangan: "",
  is_aktif: true,
  parent: "",
  pemilik: "",
});

const loadOptions = async () => {
  try {
    const [resKelompok, resCabang, resInduk, resPemilik] = await Promise.all([
      accountService.getKelompok(),
      accountService.getCabang(),
      accountService.getInduk(),
      accountService.getPemilik(),
    ]);
    kelompokList.value = resKelompok.data.data;
    cabangList.value = resCabang.data.data;
    indukList.value = resInduk.data.data;
    pemilikList.value = resPemilik.data.data;
  } catch (error) {
    toast.error("Gagal memuat data kelompok/cabang/induk/pemilik.");
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
        parent: "",
        pemilik: "",
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
        parent: props.editData.parent || "",
        pemilik: props.editData.pemilik || "",
      };
    }
  },
);

watch(
  () => form.value.parent,
  (kode) => {
    if (!props.isNewMode || !kode) return;
    const induk = indukList.value.find((i) => i.kode === kode);
    if (!induk) return;
    form.value.kol_id = induk.kol_id;
    form.value.cabang = induk.cabang;
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
  if (props.isNewMode && form.value.parent && !form.value.pemilik) {
    toast.error("Pemilik wajib dipilih untuk sub-account.");
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
      parent: form.value.parent,
      pemilik: form.value.pemilik,
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
              :disabled="!isNewMode || !!form.parent"
              class="mb-2"
            />
          </v-col>
        </v-row>

        <v-select
          v-if="isNewMode"
          v-model="form.parent"
          :items="indukList"
          item-title="nama"
          item-value="kode"
          label="Induk (kosongkan jika bukan sub-account)"
          density="compact"
          variant="outlined"
          clearable
          class="mb-2"
        />
        <v-text-field
          v-else-if="form.parent"
          :model-value="form.parent"
          label="Induk"
          density="compact"
          variant="outlined"
          readonly
          class="mb-2"
        />
        <v-autocomplete
          v-if="form.parent"
          v-model="form.pemilik"
          :items="pemilikList"
          item-title="nama"
          item-value="kode"
          label="Pemilik (pemegang kas)"
          density="compact"
          variant="outlined"
          clearable
          class="mb-2"
        />

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
          :disabled="!!form.parent"
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
