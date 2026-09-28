<script setup lang="ts">
import { ref, watch } from "vue";
import { useToast } from "vue-toastification";
import { costCenterService } from "@/services/master/costCenterService";
import { IconTrash, IconPlus } from "@tabler/icons-vue";

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
  detail: [] as { nama: string; pakai?: boolean }[],
});

watch(
  () => props.modelValue,
  (v) => {
    if (!v) return;
    if (props.isNewMode) {
      form.value = { kode: "", nama: "", detail: [{ nama: "" }] };
    } else if (props.editData) {
      form.value = {
        kode: props.editData.kode,
        nama: props.editData.nama,
        detail: (props.editData.detail || []).map((d: any) => ({
          nama: d.nama,
          pakai: d.pakai,
        })),
      };
    }
  },
);

const addDetail = () => {
  form.value.detail.push({ nama: "" });
};

const removeDetail = (idx: number) => {
  const d = form.value.detail[idx];
  if (d.pakai) {
    toast.warning(
      `"${d.nama}" sudah dipakai untuk transaksi, tidak bisa dihapus.`,
    );
    return;
  }
  form.value.detail.splice(idx, 1);
};

const close = () => {
  emit("update:modelValue", false);
};

const handleSave = async () => {
  if (!form.value.nama.trim()) {
    toast.error("Nama Cost Center wajib diisi.");
    return;
  }
  const detailValid = form.value.detail.filter((d) => d.nama.trim());
  if (!detailValid.length) {
    toast.error("Minimal harus ada 1 detail Cost Center.");
    return;
  }

  isSaving.value = true;
  try {
    await costCenterService.save({
      isEdit: !props.isNewMode,
      kode: form.value.kode,
      nama: form.value.nama.trim(),
      detail: detailValid,
    });
    toast.success("Cost Center berhasil disimpan.");
    emit("saved");
    close();
  } catch (error: any) {
    toast.error(
      error?.response?.data?.message || "Gagal menyimpan Cost Center.",
    );
  } finally {
    isSaving.value = false;
  }
};
</script>

<template>
  <v-dialog
    :model-value="modelValue"
    max-width="600px"
    persistent
    @update:model-value="(v) => emit('update:modelValue', v)"
  >
    <v-card>
      <v-card-title class="pa-4">
        <span class="text-subtitle-1 font-weight-bold">
          {{ isNewMode ? "Tambah Cost Center" : "Edit Cost Center" }}
        </span>
      </v-card-title>
      <v-divider />
      <v-card-text class="pa-4">
        <v-text-field
          v-if="!isNewMode"
          v-model="form.kode"
          label="Kode"
          density="compact"
          variant="outlined"
          readonly
          class="mb-2"
        />
        <v-text-field
          v-model="form.nama"
          label="Nama Cost Center"
          density="compact"
          variant="outlined"
          class="mb-3"
        />

        <div class="d-flex align-center justify-space-between mb-2">
          <span class="text-caption font-weight-bold text-medium-emphasis">
            DETAIL COST CENTER
          </span>
          <v-btn size="small" variant="text" @click="addDetail">
            <IconPlus :size="14" class="mr-1" /> Tambah Baris
          </v-btn>
        </div>

        <div
          v-for="(d, idx) in form.detail"
          :key="idx"
          class="d-flex align-center mb-2"
          style="gap: 8px"
        >
          <v-text-field
            v-model="d.nama"
            density="compact"
            variant="outlined"
            hide-details
            :disabled="d.pakai"
            placeholder="Nama detail..."
          />
          <v-chip v-if="d.pakai" size="x-small" color="grey" variant="flat">
            Terpakai
          </v-chip>
          <v-btn
            icon
            size="small"
            variant="text"
            color="error"
            :disabled="d.pakai"
            @click="removeDetail(idx)"
          >
            <IconTrash :size="16" />
          </v-btn>
        </div>
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
:deep(input) {
  font-size: 12px !important;
}
.text-caption {
  font-size: 11px !important;
}
:deep(.v-btn) {
  font-size: 11px !important;
  letter-spacing: normal;
}
:deep(.v-chip) {
  font-size: 10px !important;
}
</style>
