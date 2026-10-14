<script setup lang="ts">
import { ref, computed, watch } from "vue";
import { useToast } from "vue-toastification";
import * as toleransiService from "@/services/spanduk/daftar/toleransiService";
import type {
  LookupOption,
  ToleransiDetail,
  ToleransiPayload,
} from "@/services/spanduk/daftar/toleransiService";

const props = defineProps<{
  modelValue: boolean;
  isNewMode: boolean;
  data: ToleransiDetail | null;
}>();

const emit = defineEmits<{
  (e: "update:modelValue", value: boolean): void;
  (e: "saved"): void;
}>();

const toast = useToast();

interface FormState {
  Jenis: string | null;
  Ukuran: string;
  Toleransi: string;
}

const formKosong = (): FormState => ({
  Jenis: null,
  Ukuran: "",
  Toleransi: "",
});

const form = ref<FormState>(formKosong());
const formRef = ref<{ validate: () => Promise<{ valid: boolean }> } | null>(
  null,
);
const isSaving = ref(false);
const isLoadingLookup = ref(false);
const jenisOpts = ref<LookupOption[]>([]);

// Delphi: nama jenis hanya tampil (dari jo_nama pilihan), tidak disimpan
const namaJenis = computed(
  () => jenisOpts.value.find((j) => j.Kode === form.value.Jenis)?.Nama ?? "",
);

const muatLookup = async () => {
  isLoadingLookup.value = true;
  try {
    jenisOpts.value = await toleransiService.getLookupJenis();
  } catch (e) {
    toast.error(toleransiService.pesanError(e, "Gagal memuat pilihan jenis."));
  } finally {
    isLoadingLookup.value = false;
  }
};

watch(
  () => props.modelValue,
  async (terbuka) => {
    if (!terbuka) return;
    form.value = formKosong();
    await muatLookup();

    const d = props.data;
    if (!props.isNewMode && d) {
      // Jenis lama di luar pilihan (mis. BT/UM/VB) tetap ditampilkan apa adanya
      if (!jenisOpts.value.some((j) => j.Kode === d.Jenis)) {
        jenisOpts.value = [
          { Kode: d.Jenis, Nama: d.Nama ?? "" },
          ...jenisOpts.value,
        ];
      }
      form.value = {
        Jenis: d.Jenis,
        Ukuran: String(d.Ukuran ?? ""),
        Toleransi: d.Toleransi === null ? "" : String(d.Toleransi),
      };
    } else {
      // Delphi: form baru memilih jenis pertama (ItemIndex := 0)
      form.value.Jenis = jenisOpts.value[0]?.Kode ?? null;
    }
  },
);

const wajib = (v: string | null) => !!v || "Wajib diisi";
const aturanUkuran = (v: string): string | true => {
  const s = (v ?? "").trim();
  if (!/^\d+(\.\d+)?$/.test(s)) return "Harus angka (desimal pakai titik)";
  return Number(s) > 0 || "Harus lebih dari 0";
};
const aturanToleransi = (v: string): string | true =>
  /^\d+(\.\d+)?$/.test((v ?? "").trim()) ||
  "Harus angka tidak negatif (desimal pakai titik)";

const tutup = () => emit("update:modelValue", false);

const simpan = async () => {
  const hasil = await formRef.value?.validate();
  if (!hasil?.valid) return;

  const f = form.value;
  const payload: ToleransiPayload = {
    Jenis: f.Jenis ?? "",
    Ukuran: f.Ukuran.trim(),
    Toleransi: f.Toleransi.trim(),
  };

  isSaving.value = true;
  try {
    if (props.isNewMode) {
      const kode = await toleransiService.create(payload);
      toast.success(`Tersimpan dengan kode: ${kode}`);
    } else {
      if (!props.data) return;
      await toleransiService.update(props.data.Kode, payload);
      toast.success("Perubahan berhasil disimpan.");
    }
    emit("saved");
    tutup();
  } catch (e) {
    toast.error(toleransiService.pesanError(e, "Gagal menyimpan data."));
  } finally {
    isSaving.value = false;
  }
};
</script>

<template>
  <v-dialog
    :model-value="modelValue"
    max-width="520"
    persistent
    scrollable
    @update:model-value="emit('update:modelValue', $event)"
  >
    <v-card :loading="isLoadingLookup" class="dlg-card">
      <v-card-title class="dlg-title">
        {{ isNewMode ? "Tambah" : "Ubah" }} Toleransi Spanduk
        <span v-if="!isNewMode && data" class="dlg-kode">
          — {{ data.Kode }}
        </span>
      </v-card-title>
      <v-divider />

      <v-card-text>
        <v-form ref="formRef" @submit.prevent="simpan">
          <v-row dense>
            <v-col cols="12" md="4">
              <v-text-field
                :model-value="isNewMode ? 'Otomatis' : data?.Kode"
                label="Kode"
                density="compact"
                variant="outlined"
                readonly
                disabled
              />
            </v-col>
            <v-col cols="12" md="8">
              <v-select
                v-model="form.Jenis"
                :items="jenisOpts"
                item-title="Kode"
                item-value="Kode"
                label="Jenis"
                density="compact"
                variant="outlined"
                :rules="[wajib]"
              />
            </v-col>

            <v-col cols="12">
              <v-text-field
                :model-value="namaJenis"
                label="Nama Jenis"
                density="compact"
                variant="outlined"
                readonly
                disabled
              />
            </v-col>

            <v-col cols="6">
              <v-text-field
                v-model="form.Ukuran"
                label="Ukuran"
                density="compact"
                variant="outlined"
                :rules="[aturanUkuran]"
              />
            </v-col>
            <v-col cols="6">
              <v-text-field
                v-model="form.Toleransi"
                label="Toleransi"
                density="compact"
                variant="outlined"
                :rules="[aturanToleransi]"
              />
            </v-col>
          </v-row>
        </v-form>
      </v-card-text>

      <v-divider />
      <v-card-actions class="dlg-actions">
        <v-spacer />
        <v-btn variant="text" :disabled="isSaving" @click="tutup">Batal</v-btn>
        <v-btn
          color="primary"
          variant="flat"
          :loading="isSaving"
          @click="simpan"
        >
          Simpan
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.dlg-title {
  background: #1565c0;
  color: #fff;
  font-size: 13px !important;
  font-weight: 700;
  padding: 10px 16px !important;
}
.dlg-kode {
  opacity: 0.8;
  font-weight: 500;
  margin-left: 4px;
}

/* Input dirapatkan agar selevel dengan browse (font 12px, tinggi 34px) */
.dlg-card :deep(.v-input__control) {
  min-height: 34px;
}
.dlg-card :deep(.v-field) {
  font-size: 12px;
  --v-input-control-height: 34px;
}
.dlg-card :deep(.v-field__input) {
  min-height: 34px;
  padding-top: 6px;
  padding-bottom: 6px;
}
.dlg-card :deep(.v-label) {
  font-size: 12px;
}
.dlg-card :deep(.v-input__details) {
  min-height: 16px;
  padding-top: 2px;
  font-size: 10px;
}

.dlg-actions {
  padding: 8px 16px;
  background: rgb(var(--v-theme-surface-variant), 0.35);
}
</style>
