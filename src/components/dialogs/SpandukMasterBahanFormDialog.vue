<script setup lang="ts">
import { ref, watch, onBeforeUnmount } from "vue";
import { useToast } from "vue-toastification";
import * as masterBahanService from "@/services/spanduk/daftar/masterBahanService";
import type {
  LookupOption,
  MasterBahanDetail,
  MasterBahanPayload,
} from "@/services/spanduk/daftar/masterBahanService";

const props = defineProps<{
  modelValue: boolean;
  isNewMode: boolean;
  data: MasterBahanDetail | null;
}>();

const emit = defineEmits<{
  (e: "update:modelValue", value: boolean): void;
  (e: "saved"): void;
}>();

const toast = useToast();

interface FormState {
  Brg_nama: string;
  Brg_divisi: string | null;
  Brg_ktg_kode: string | null;
  Brg_jenis: string | null;
  Brg_gdg_default: string | null;
  Brg_sup_kode: string | null;
  Brg_satuan: string;
  Brg_gramasi: string;
  Brg_panjang: string;
  Brg_lebar: string;
  Brg_status: string;
  Brg_hrgbeli: number;
  Brg_hrgjual: number;
  Brg_isaktif: boolean;
  Brg_isstok: boolean;
  Brg_isexpired: boolean;
}

const STATUS_BOLEH = ["F", "S", "P", "B"];

// Aktif default dicentang untuk barang baru
const formKosong = (): FormState => ({
  Brg_nama: "",
  Brg_divisi: null,
  Brg_ktg_kode: null,
  Brg_jenis: null,
  Brg_gdg_default: null,
  Brg_sup_kode: null,
  Brg_satuan: "",
  Brg_gramasi: "",
  Brg_panjang: "",
  Brg_lebar: "",
  Brg_status: "S",
  Brg_hrgbeli: 0,
  Brg_hrgjual: 0,
  Brg_isaktif: true,
  Brg_isstok: false,
  Brg_isexpired: false,
});

const form = ref<FormState>(formKosong());
const formRef = ref<{ validate: () => Promise<{ valid: boolean }> } | null>(
  null,
);
const isSaving = ref(false);
const isLoadingLookup = ref(false);

const kategoriOpts = ref<LookupOption[]>([]);
const gudangOpts = ref<LookupOption[]>([]);
const jenisOpts = ref<LookupOption[]>([]);
const divisiOpts = ref<LookupOption[]>([]);
const statusOpts = ref<LookupOption[]>([]);
const supplierOpts = ref<LookupOption[]>([]);

const strOrNull = (v: string | number | null | undefined): string | null =>
  v === null || v === undefined || v === "" ? null : String(v);

const isiDariData = (d: MasterBahanDetail): FormState => ({
  Brg_nama: d.Brg_nama ?? "",
  Brg_divisi: strOrNull(d.Brg_divisi),
  Brg_ktg_kode: strOrNull(d.Brg_ktg_kode),
  Brg_jenis: strOrNull(d.Brg_jenis),
  Brg_gdg_default: strOrNull(d.Brg_gdg_default),
  Brg_sup_kode: strOrNull(d.Brg_sup_kode),
  Brg_satuan: d.Brg_satuan ?? "",
  Brg_gramasi: d.Brg_gramasi ?? "",
  Brg_panjang: d.Brg_panjang ?? "",
  Brg_lebar: d.Brg_lebar ?? "",
  // Delphi: status tidak dikenal dianggap default "S"
  Brg_status: STATUS_BOLEH.includes(d.Brg_status ?? "")
    ? (d.Brg_status as string)
    : "S",
  Brg_hrgbeli: Number(d.Brg_hrgbeli) || 0,
  Brg_hrgjual: Number(d.Brg_hrgjual) || 0,
  Brg_isaktif: Number(d.Brg_isaktif) === 1,
  Brg_isstok: Number(d.Brg_isstok) === 1,
  Brg_isexpired: Number(d.Brg_isexpired) === 1,
});

const muatLookup = async () => {
  isLoadingLookup.value = true;
  try {
    const [kategori, gudang, jenis, divisi, status, supplier] =
      await Promise.all([
        masterBahanService.getLookup("kategori"),
        masterBahanService.getLookup("gudang"),
        masterBahanService.getLookup("jenis"),
        masterBahanService.getLookup("divisi"),
        masterBahanService.getLookup("status"),
        masterBahanService.getLookup("supplier"),
      ]);
    kategoriOpts.value = kategori;
    gudangOpts.value = gudang;
    jenisOpts.value = jenis;
    divisiOpts.value = divisi;
    statusOpts.value = status;
    supplierOpts.value = supplier;
  } catch (e) {
    toast.error(masterBahanService.pesanError(e, "Gagal memuat pilihan."));
  } finally {
    isLoadingLookup.value = false;
  }
};

// Supplier bisa ratusan: dicari ke server (maks 50 hasil).
// Supplier barang yang sedang diubah dipastikan tetap ada di daftar.
const pastikanSupplierTerpilih = () => {
  const d = props.data;
  if (props.isNewMode || !d?.Brg_sup_kode) return;
  const kode = String(d.Brg_sup_kode);
  if (!supplierOpts.value.some((s) => s.Kode === kode)) {
    supplierOpts.value = [
      { Kode: kode, Nama: d.nmSupplier || kode },
      ...supplierOpts.value,
    ];
  }
};

let timerCari: ReturnType<typeof setTimeout> | null = null;
const cariSupplier = (teks: string) => {
  if (timerCari) clearTimeout(timerCari);
  timerCari = setTimeout(async () => {
    try {
      supplierOpts.value = await masterBahanService.getLookup("supplier", teks);
      pastikanSupplierTerpilih();
    } catch {
      /* abaikan, daftar lama tetap dipakai */
    }
  }, 300);
};

onBeforeUnmount(() => {
  if (timerCari) clearTimeout(timerCari);
});

watch(
  () => props.modelValue,
  async (terbuka) => {
    if (!terbuka) return;
    form.value =
      !props.isNewMode && props.data ? isiDariData(props.data) : formKosong();
    await muatLookup();
    pastikanSupplierTerpilih();
  },
);

const wajib = (v: string | null) => !!v || "Wajib diisi";
const angkaDesimal = (v: string) =>
  v === "" || /^\d+(\.\d+)?$/.test(v) || "Harus angka (desimal pakai titik)";

const tutup = () => emit("update:modelValue", false);

const simpan = async () => {
  const hasil = await formRef.value?.validate();
  if (!hasil?.valid) return;

  const f = form.value;
  const payload: MasterBahanPayload = {
    Brg_nama: f.Brg_nama.trim(),
    Brg_divisi: f.Brg_divisi ?? "",
    Brg_ktg_kode: f.Brg_ktg_kode ?? "",
    Brg_jenis: f.Brg_jenis ?? "",
    Brg_gdg_default: f.Brg_gdg_default ?? "",
    Brg_sup_kode: f.Brg_sup_kode ?? "",
    Brg_satuan: f.Brg_satuan.trim(),
    Brg_gramasi: f.Brg_gramasi.trim(),
    Brg_panjang: f.Brg_panjang.trim(),
    Brg_lebar: f.Brg_lebar.trim(),
    Brg_status: f.Brg_status,
    Brg_hrgbeli: Number(f.Brg_hrgbeli) || 0,
    Brg_hrgjual: Number(f.Brg_hrgjual) || 0,
    Brg_isaktif: f.Brg_isaktif ? 1 : 0,
    Brg_isstok: f.Brg_isstok ? 1 : 0,
    Brg_isexpired: f.Brg_isexpired ? 1 : 0,
  };

  isSaving.value = true;
  try {
    if (props.isNewMode) {
      await masterBahanService.create(payload);
      toast.success("Bahan baru berhasil disimpan.");
    } else {
      if (!props.data) return;
      await masterBahanService.update(props.data.Brg_kode, payload);
      toast.success("Perubahan berhasil disimpan.");
    }
    emit("saved");
    tutup();
  } catch (e) {
    toast.error(masterBahanService.pesanError(e, "Gagal menyimpan data."));
  } finally {
    isSaving.value = false;
  }
};
</script>

<template>
  <v-dialog
    :model-value="modelValue"
    max-width="860"
    persistent
    scrollable
    @update:model-value="emit('update:modelValue', $event)"
  >
    <v-card :loading="isLoadingLookup" class="dlg-card">
      <v-card-title class="dlg-title">
        {{ isNewMode ? "Tambah" : "Ubah" }} Master Bahan Spanduk
        <span v-if="!isNewMode && data" class="dlg-kode">
          — {{ data.Brg_kode }}
        </span>
      </v-card-title>
      <v-divider />

      <v-card-text>
        <v-form ref="formRef" @submit.prevent="simpan">
          <v-row dense>
            <v-col cols="12" md="8">
              <v-text-field
                v-model="form.Brg_nama"
                label="Nama Barang"
                density="compact"
                variant="outlined"
                :rules="[(v: string) => !!v?.trim() || 'Wajib diisi']"
              />
            </v-col>
            <v-col cols="12" md="4">
              <v-text-field
                :model-value="isNewMode ? 'Otomatis' : data?.Brg_kode"
                label="Kode"
                density="compact"
                variant="outlined"
                readonly
                disabled
              />
            </v-col>

            <v-col cols="12" md="4">
              <v-select
                v-model="form.Brg_divisi"
                :items="divisiOpts"
                item-title="Nama"
                item-value="Kode"
                label="Divisi"
                density="compact"
                variant="outlined"
                :rules="[wajib]"
              />
            </v-col>
            <v-col cols="12" md="4">
              <v-select
                v-model="form.Brg_ktg_kode"
                :items="kategoriOpts"
                item-title="Nama"
                item-value="Kode"
                label="Kategori"
                density="compact"
                variant="outlined"
                :rules="[wajib]"
              />
            </v-col>
            <v-col cols="12" md="4">
              <v-select
                v-model="form.Brg_jenis"
                :items="jenisOpts"
                item-title="Nama"
                item-value="Kode"
                label="Jenis"
                density="compact"
                variant="outlined"
                clearable
              />
            </v-col>

            <v-col cols="12" md="6">
              <v-select
                v-model="form.Brg_gdg_default"
                :items="gudangOpts"
                item-title="Nama"
                item-value="Kode"
                label="Gudang Default"
                density="compact"
                variant="outlined"
                clearable
              />
            </v-col>
            <v-col cols="12" md="6">
              <v-autocomplete
                v-model="form.Brg_sup_kode"
                :items="supplierOpts"
                item-title="Nama"
                item-value="Kode"
                label="Supplier"
                density="compact"
                variant="outlined"
                no-filter
                clearable
                @update:search="cariSupplier"
              />
            </v-col>

            <v-col cols="6" md="3">
              <v-text-field
                v-model="form.Brg_satuan"
                label="Satuan"
                density="compact"
                variant="outlined"
              />
            </v-col>
            <v-col cols="6" md="3">
              <v-text-field
                v-model="form.Brg_gramasi"
                label="Konstruksi"
                density="compact"
                variant="outlined"
              />
            </v-col>
            <v-col cols="6" md="3">
              <v-text-field
                v-model="form.Brg_panjang"
                label="Panjang"
                density="compact"
                variant="outlined"
                :rules="[angkaDesimal]"
              />
            </v-col>
            <v-col cols="6" md="3">
              <v-text-field
                v-model="form.Brg_lebar"
                label="Lebar"
                density="compact"
                variant="outlined"
                :rules="[angkaDesimal]"
              />
            </v-col>

            <v-col cols="12" md="4">
              <v-select
                v-model="form.Brg_status"
                :items="statusOpts"
                item-title="Nama"
                item-value="Kode"
                label="Status"
                density="compact"
                variant="outlined"
              />
            </v-col>
            <v-col cols="6" md="4">
              <v-text-field
                v-model.number="form.Brg_hrgbeli"
                label="Harga Beli"
                type="number"
                min="0"
                density="compact"
                variant="outlined"
              />
            </v-col>
            <v-col cols="6" md="4">
              <v-text-field
                v-model.number="form.Brg_hrgjual"
                label="Harga Jual"
                type="number"
                min="0"
                density="compact"
                variant="outlined"
              />
            </v-col>

            <v-col cols="12" class="d-flex flex-wrap ga-4">
              <v-checkbox
                v-model="form.Brg_isaktif"
                label="Aktif"
                density="compact"
                hide-details
              />
              <v-checkbox
                v-model="form.Brg_isstok"
                label="Stok"
                density="compact"
                hide-details
              />
              <v-checkbox
                v-model="form.Brg_isexpired"
                label="Expired"
                density="compact"
                hide-details
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
.dlg-card :deep(.v-selection-control) {
  --v-selection-control-size: 20px;
}
.dlg-card :deep(.v-selection-control .v-label) {
  font-size: 12px;
}

.dlg-actions {
  padding: 8px 16px;
  background: rgb(var(--v-theme-surface-variant), 0.35);
}
</style>
