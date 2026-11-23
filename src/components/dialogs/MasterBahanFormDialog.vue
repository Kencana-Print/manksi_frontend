<script setup lang="ts">
import { ref, watch, computed } from "vue";
import type { VForm } from "vuetify/components";
import api from "@/services/api";
import { useToast } from "vue-toastification";
import { useAuthStore } from "@/stores/authStore";
import SearchLookup from "@/components/SearchLookup.vue";
import {
  IconDatabase,
  IconX,
  IconSearch,
  IconHelpCircle,
  IconAlertTriangle,
  IconCheck,
  IconAlertCircle,
} from "@tabler/icons-vue";

const props = defineProps<{
  modelValue: boolean;
  isNewMode: boolean;
  bahanData?: any;
}>();

const emit = defineEmits(["update:modelValue", "saved"]);

const toast = useToast();
const authStore = useAuthStore();
const dialogVisible = computed({
  get: () => props.modelValue,
  set: (val) => emit("update:modelValue", val),
});

const formRef = ref<VForm | null>(null);
const isSaving = ref(false);
const confirmDialogVisible = ref(false);
const confirmCancelDialogVisible = ref(false);

const projectOptions = ref<any[]>([]);
const satuanOptions = ref<string[]>([]);
const tipeOptions = ref<{ Kode: string; Nama: string }[]>([]);

// MMT Options
const kategoriOptions = ref<any[]>([]);
const jenisBarangOptions = ref<any[]>([]);
const gudangOptions = ref<any[]>([]);

// Realtime check kode duplicate state
const isCheckingKode = ref(false);
const kodeCheckResult = ref<{ exists: boolean; message: string } | null>(null);
let debounceTimer: ReturnType<typeof setTimeout> | null = null;

// --- LOOKUP STATES ---
const lookupState = ref({
  show: false,
  title: "",
  category: "",
  targetKey: "",
});

const openLookup = (
  category: string,
  title: string,
  target: string,
  allowInEdit = false,
) => {
  if (!props.isNewMode && !allowInEdit) return;
  lookupState.value = { show: true, title, category, targetKey: target };
};

const handleLookupSelect = (item: any) => {
  const key = lookupState.value.targetKey;
  if (key === "jenis") {
    formData.value.kdJenis = item.Kode;
    formData.value.nmJenis = item.Nama;
  } else if (key === "warna") {
    formData.value.kdWarna = item.Kode;
    formData.value.nmWarna = item.Nama;
  } else if (key === "gramasi") {
    formData.value.kdGramasi = item.Kode;
    formData.value.nmGramasi = item.Nama;
  } else if (key === "setting") {
    formData.value.kdSetting = item.Kode;
    formData.value.nmSetting = item.Nama;
  } else if (key === "supplier") {
    formData.value.bhn_sup_kode = item.Kode;
    formData.value.nmSupplier = item.Nama;
  }
};

// --- STATE FORM ---
const buatFormKosong = () => ({
  Tipe: "GARMEN",
  Bhn_kode: "",
  Bhn_name: "",
  Bhn_satuan: "KG",
  Bhn_ket: "",
  Bhn_buffer: 0,
  Bhn_dead: 0,
  Bhn_hargabeli: 0,
  bhn_hrgjual: 0,
  Bhn_avgcost: 0,
  kdJenis: "",
  nmJenis: "",
  kdWarna: "",
  nmWarna: "",
  kdGramasi: "",
  nmGramasi: "",
  kdSetting: "",
  nmSetting: "",
  project: "REGULER",
  Bhn_konstruksi: "",
  Bhn_panjang: "",
  Bhn_lebar: "",
  // MMT Fields
  bhn_divisi: "GARMEN",
  bhn_ktg_kode: "",
  nmKategori: "",
  bhn_gdg_default: "WH-16",
  nmGudang: "",
  bhn_sup_kode: "",
  nmSupplier: "",
  Bhn_jb_kode: "BB",
  nmJenisBarang: "",
  bhn_status: "S",
  isAktif: true,
  isStok: true,
  isExpired: false,
});

const formData = ref(buatFormKosong());
const isGarmen = computed(() => formData.value.Tipe === "GARMEN");
const isSpanduk = computed(() => formData.value.Tipe === "SPANDUK");
const isMmt = computed(() => formData.value.Tipe === "MMT");

const wajibIsi = (v: string | number) =>
  (v !== "" && v !== null && v !== undefined) || "Wajib diisi";
const lebihDariNol = (v: string | number) => Number(v) > 0 || "Harus > 0";
const panjangValid = (v: string | number) =>
  v === "" || Number(v) > 0 || "Harus > 0";

const kodeMin3 = (v: string) =>
  String(v || "").trim().length >= 3 || "Minimal 3 karakter";

const kodeTidakBolehDuplikat = () => {
  if (isMmt.value && props.isNewMode && kodeCheckResult.value?.exists) {
    return kodeCheckResult.value.message || "Kode bahan sudah digunakan";
  }
  return true;
};

const generatedName = computed(() => {
  const p = formData.value.project === "REGULER" ? "" : formData.value.project;
  return `${formData.value.nmJenis} ${formData.value.nmWarna} ${formData.value.nmGramasi} ${formData.value.nmSetting} ${p}`
    .trim()
    .toUpperCase();
});

const cekDuplikatKodeMmt = async (kode: string) => {
  const k = String(kode || "").trim();
  if (!k || k.length < 3) {
    kodeCheckResult.value = null;
    return;
  }
  isCheckingKode.value = true;
  try {
    const res = await api.get(
      `/master/bahan/check-kode/${encodeURIComponent(k)}`,
    );
    if (res.data?.data) {
      kodeCheckResult.value = {
        exists: res.data.data.exists,
        message: res.data.data.message,
      };
      if (res.data.data.exists) {
        toast.warning(res.data.data.message);
      }
    }
  } catch (err: any) {
    console.error("Gagal cek duplikat kode:", err);
  } finally {
    isCheckingKode.value = false;
  }
};

const handleKodeInput = (val: string) => {
  if (!isMmt.value || !props.isNewMode) return;
  formData.value.Bhn_kode = String(val || "")
    .toUpperCase()
    .trim();

  if (debounceTimer) clearTimeout(debounceTimer);

  if (formData.value.Bhn_kode.length < 3) {
    kodeCheckResult.value = null;
    return;
  }

  debounceTimer = setTimeout(async () => {
    await cekDuplikatKodeMmt(formData.value.Bhn_kode);
  }, 450);
};

const loadSatuan = async (tipe: string) => {
  try {
    const res = await api.get("/master/bahan/lookups/satuan", {
      params: { tipe },
    });
    satuanOptions.value = res.data.data.map((i: { Nama: string }) => i.Nama);
  } catch (e) {
    toast.error("Gagal memuat opsi satuan");
  }
};

const loadMmtLookups = async () => {
  if (kategoriOptions.value.length > 0) return;
  try {
    const [resKat, resGdg, resJb] = await Promise.all([
      api.get("/master/bahan/lookups/kategori"),
      api.get("/master/bahan/lookups/gudang"),
      api.get("/master/bahan/lookups/jenis_mmt"),
    ]);
    kategoriOptions.value = resKat.data.data || [];
    gudangOptions.value = (resGdg.data.data || []).map((g: any) => ({
      Kode: g.Kode,
      Nama: `${g.Kode} - ${g.Nama}`,
    }));
    jenisBarangOptions.value = (resJb.data.data || []).map((j: any) => ({
      Kode: j.Kode,
      Nama: `${j.Kode} - ${j.Nama}`,
    }));
  } catch (e) {
    console.error("Gagal memuat lookup MMT:", e);
  }
};

const loadOptions = async () => {
  try {
    const [resProject, resTipe] = await Promise.all([
      api.get("/master/bahan/lookups/project"),
      api.get("/master/bahan/lookups/tipe"),
    ]);
    projectOptions.value = resProject.data.data;
    tipeOptions.value = resTipe.data.data;
    await loadMmtLookups();
  } catch (e) {
    toast.error("Gagal memuat opsi referensi");
  }
};

// Dipanggil saat memilih tipe di mode tambah
const gantiTipe = async (tipe: string | null) => {
  if (!tipe) return;
  kodeCheckResult.value = null;
  if (tipe === "SPANDUK") {
    formData.value.Bhn_satuan = "YARD";
    formData.value.Bhn_kode = "";
  } else if (tipe === "MMT") {
    formData.value.Bhn_satuan = "ROLL";
    formData.value.Bhn_kode = "";
    formData.value.bhn_gdg_default = "WH-16";
    formData.value.Bhn_jb_kode = "BB";
    formData.value.bhn_status = "S";
    formData.value.isAktif = true;
    formData.value.isStok = true;
    formData.value.isExpired = false;
    await loadMmtLookups();
  } else {
    formData.value.Bhn_satuan = "KG";
    formData.value.Bhn_kode = "";
  }
  await loadSatuan(tipe);
  formRef.value?.resetValidation();
};

const resetForm = () => {
  formData.value = buatFormKosong();
  kodeCheckResult.value = null;
};

watch(
  () => props.modelValue,
  async (isOpen) => {
    if (!isOpen) return;
    if (props.isNewMode) {
      resetForm();
    } else if (props.bahanData) {
      const b = props.bahanData;
      const t =
        b.Tipe ||
        b.Divisi ||
        b.bhn_divisi ||
        (b.Bhn_kode?.startsWith("SB") ? "SPANDUK" : "GARMEN");
      formData.value = {
        ...buatFormKosong(),
        ...b,
        Tipe: t,
        Bhn_ket: b.Bhn_ket || "",
        Bhn_hargabeli: Number(b.Bhn_hargabeli) || 0,
        bhn_hrgjual: Number(b.bhn_hrgjual || b.Bhn_hrgjual) || 0,
        Bhn_buffer: Number(b.Bhn_buffer) || 0,
        Bhn_dead: b.Bhn_dead ?? 0,
        Bhn_konstruksi: b.Bhn_konstruksi ?? "",
        Bhn_panjang: String(b.Bhn_panjang ?? ""),
        Bhn_lebar: String(b.Bhn_lebar ?? ""),
        bhn_ktg_kode: b.bhn_ktg_kode || "",
        nmKategori: b.KategoriNama || b.Kategori || "",
        bhn_gdg_default: b.bhn_gdg_default || "WH-16",
        nmGudang: b.GudangNama || b.GudangDefault || "WH-16",
        bhn_sup_kode: b.bhn_sup_kode || "",
        nmSupplier: b.SupplierNama || b.Supplier || "",
        Bhn_jb_kode: b.Bhn_jb_kode || "BB",
        nmJenisBarang: b.JenisNama || "",
        bhn_status: b.bhn_status || b.Bhn_status || b.Status || "S",
        isAktif:
          b.isAktif !== undefined ? Boolean(b.isAktif) : b.bhn_aktif === 0,
        isStok: b.isStok !== undefined ? Boolean(b.isStok) : b.bhn_isstok !== 0,
        isExpired: Boolean(b.isExpired ?? b.bhn_isexpired),
      };
    }
    await loadOptions();
    if (
      props.isNewMode &&
      !tipeOptions.value.some((t) => t.Kode === formData.value.Tipe)
    ) {
      formData.value.Tipe = tipeOptions.value[0]?.Kode ?? "GARMEN";
      formData.value.Bhn_satuan =
        formData.value.Tipe === "SPANDUK"
          ? "YARD"
          : formData.value.Tipe === "MMT"
            ? "ROLL"
            : "KG";
    }
    await loadSatuan(formData.value.Tipe);
    formRef.value?.resetValidation();
  },
);

const handleSave = async () => {
  const { valid } = await formRef.value!.validate();
  if (!valid) return toast.warning("Lengkapi data yang diwajibkan.");

  if (isMmt.value && props.isNewMode && kodeCheckResult.value?.exists) {
    return toast.error(
      kodeCheckResult.value.message ||
        "Kode bahan sudah ada, silakan ganti kode lain.",
    );
  }

  confirmDialogVisible.value = true;
};

const executeSave = async () => {
  isSaving.value = true;
  try {
    if (isMmt.value) {
      if (props.isNewMode) {
        // Cek kembali duplikat sebelum simpan
        const resCheck = await api.get(
          `/master/bahan/check-kode/${encodeURIComponent(formData.value.Bhn_kode)}`,
        );
        if (resCheck.data?.data?.exists) {
          toast.error(resCheck.data.data.message);
          isSaving.value = false;
          confirmDialogVisible.value = false;
          return;
        }
      }
    } else if (isGarmen.value) {
      const selectedProj = projectOptions.value.find(
        (p) => p.Nama === formData.value.project,
      );
      const ckdProject = selectedProj ? selectedProj.Kode.trim() : "";

      formData.value.Bhn_name = generatedName.value;

      if (props.isNewMode) {
        formData.value.Bhn_kode = (
          formData.value.kdJenis +
          formData.value.kdWarna +
          formData.value.kdGramasi +
          formData.value.kdSetting +
          ckdProject
        ).toUpperCase();
      }
    }
    // Spanduk: nama diisi manual, kode (SB + nomor urut) dibuat server.

    if (props.isNewMode) {
      const res = await api.post("/master/bahan", formData.value);
      toast.success(`Master Bahan berhasil dibuat (${res.data.kode}).`);
    } else {
      await api.put(`/master/bahan/${formData.value.Bhn_kode}`, formData.value);
      toast.success("Master Bahan berhasil diperbarui.");
    }
    confirmDialogVisible.value = false;
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
  <v-dialog v-model="dialogVisible" persistent max-width="850px">
    <v-card class="dialog-card">
      <v-form ref="formRef" @submit.prevent="handleSave">
        <v-card-title
          class="bg-primary text-white d-flex align-center pa-2 px-4"
        >
          <IconDatabase
            :size="16"
            :stroke-width="1.7"
            color="white"
            class="mr-2"
          />
          <span class="text-subtitle-2 font-weight-bold">
            {{ isNewMode ? "TAMBAH MASTER BAHAN" : "UBAH MASTER BAHAN" }}
            <span v-if="formData.Tipe"> ({{ formData.Tipe }})</span>
          </span>
          <v-spacer></v-spacer>
          <v-btn
            variant="text"
            size="small"
            @click="confirmCancelDialogVisible = true"
          >
            <IconX :size="16" :stroke-width="2" color="white" />
          </v-btn>
        </v-card-title>

        <v-card-text class="pa-4">
          <v-row dense>
            <!-- Tipe Bahan (Radio) -->
            <v-col cols="12" v-if="isNewMode && tipeOptions.length > 1">
              <v-radio-group
                v-model="formData.Tipe"
                inline
                label="Tipe Bahan"
                density="compact"
                hide-details
                @update:model-value="gantiTipe"
              >
                <v-radio
                  v-for="t in tipeOptions"
                  :key="t.Kode"
                  :label="t.Nama"
                  :value="t.Kode"
                  color="primary"
                />
              </v-radio-group>
            </v-col>

            <!-- Kode Bahan -->
            <v-col cols="12" md="5">
              <v-text-field
                v-if="isMmt && isNewMode"
                v-model="formData.Bhn_kode"
                label="Kode Bahan MMT *"
                variant="outlined"
                density="compact"
                :rules="[wajibIsi, kodeMin3, kodeTidakBolehDuplikat]"
                :loading="isCheckingKode"
                placeholder="Masukkan kode custom (min 3 huruf)..."
                maxlength="20"
                hide-details="auto"
                @input="handleKodeInput(formData.Bhn_kode)"
                @blur="cekDuplikatKodeMmt(formData.Bhn_kode)"
              >
                <template #append-inner>
                  <IconCheck
                    v-if="kodeCheckResult && !kodeCheckResult.exists"
                    :size="18"
                    color="#2e7d32"
                  />
                  <IconAlertCircle
                    v-else-if="kodeCheckResult && kodeCheckResult.exists"
                    :size="18"
                    color="#c62828"
                  />
                </template>
              </v-text-field>

              <v-text-field
                v-else
                v-model="formData.Bhn_kode"
                label="Kode Bahan"
                variant="outlined"
                density="compact"
                readonly
                bg-color="grey-lighten-4"
                hide-details="auto"
              />
            </v-col>

            <v-col cols="12" md="7" class="d-flex align-center">
              <div v-if="isNewMode">
                <div v-if="isMmt">
                  <span
                    v-if="kodeCheckResult?.exists"
                    class="text-error font-weight-bold text-caption d-flex align-center"
                  >
                    <IconAlertTriangle :size="16" class="mr-1" />
                    {{ kodeCheckResult.message }}
                  </span>
                  <span
                    v-else-if="kodeCheckResult && !kodeCheckResult.exists"
                    class="text-success font-weight-bold text-caption d-flex align-center"
                  >
                    <IconCheck :size="16" class="mr-1" />
                    Kode bahan tersedia
                  </span>
                  <span
                    v-else
                    class="text-caption text-grey-darken-1 font-italic"
                  >
                    * Kode custom (min 3 karakter). Sistem akan mengecek
                    duplikasi otomatis.
                  </span>
                </div>
                <span
                  v-else-if="isSpanduk"
                  class="text-error text-caption font-italic"
                >
                  * Terbentuk otomatis (SB + nomor urut)
                </span>
                <span v-else class="text-error text-caption font-italic">
                  * Terbentuk otomatis dari kombinasi atribut
                </span>
              </div>
            </v-col>

            <!-- ================= GARMEN FIELDS ================= -->
            <template v-if="isGarmen">
              <v-col cols="12">
                <v-text-field
                  :model-value="generatedName"
                  label="Nama Bahan (Otomatis)"
                  variant="outlined"
                  density="compact"
                  readonly
                  bg-color="grey-lighten-4"
                  hide-details="auto"
                />
              </v-col>

              <v-col cols="6" md="3">
                <v-text-field
                  v-model="formData.kdJenis"
                  label="Jenis"
                  variant="outlined"
                  density="compact"
                  readonly
                  hide-details="auto"
                >
                  <template #append-inner>
                    <IconSearch
                      :size="15"
                      :stroke-width="1.7"
                      color="#1565c0"
                      style="cursor: pointer"
                      @click="openLookup('jenis', 'Jenis Bahan', 'jenis')"
                    />
                  </template>
                </v-text-field>
              </v-col>
              <v-col cols="6" md="3">
                <v-text-field
                  v-model="formData.kdWarna"
                  label="Warna"
                  variant="outlined"
                  density="compact"
                  readonly
                  hide-details="auto"
                >
                  <template #append-inner>
                    <IconSearch
                      :size="15"
                      :stroke-width="1.7"
                      color="#1565c0"
                      style="cursor: pointer"
                      @click="openLookup('warna', 'Warna Bahan', 'warna')"
                    />
                  </template>
                </v-text-field>
              </v-col>
              <v-col cols="6" md="3">
                <v-text-field
                  v-model="formData.kdGramasi"
                  label="Gramasi"
                  variant="outlined"
                  density="compact"
                  readonly
                  hide-details="auto"
                >
                  <template #append-inner>
                    <IconSearch
                      :size="15"
                      :stroke-width="1.7"
                      color="#1565c0"
                      style="cursor: pointer"
                      @click="openLookup('gramasi', 'Gramasi Bahan', 'gramasi')"
                    />
                  </template>
                </v-text-field>
              </v-col>
              <v-col cols="6" md="3">
                <v-text-field
                  v-model="formData.kdSetting"
                  label="Setting *"
                  variant="outlined"
                  density="compact"
                  readonly
                  hide-details="auto"
                  :rules="isNewMode ? [wajibIsi] : []"
                >
                  <template #append-inner>
                    <IconSearch
                      :size="15"
                      :stroke-width="1.7"
                      color="#1565c0"
                      style="cursor: pointer"
                      @click="openLookup('setting', 'Setting Bahan', 'setting')"
                    />
                  </template>
                </v-text-field>
              </v-col>

              <v-col cols="12" md="6">
                <v-select
                  v-model="formData.project"
                  :items="projectOptions"
                  item-title="Nama"
                  item-value="Nama"
                  label="Project"
                  variant="outlined"
                  density="compact"
                  hide-details="auto"
                  :readonly="!isNewMode"
                />
              </v-col>

              <v-col cols="12" md="6">
                <v-select
                  v-model="formData.Bhn_satuan"
                  :items="satuanOptions"
                  label="Satuan"
                  variant="outlined"
                  density="compact"
                  hide-details="auto"
                />
              </v-col>
            </template>

            <!-- ================= SPANDUK FIELDS ================= -->
            <template v-else-if="isSpanduk">
              <v-col cols="12">
                <v-text-field
                  v-model="formData.Bhn_name"
                  label="Nama Bahan"
                  variant="outlined"
                  density="compact"
                  hide-details="auto"
                  :rules="[wajibIsi]"
                />
              </v-col>
              <v-col cols="12" md="4">
                <v-text-field
                  v-model="formData.Bhn_konstruksi"
                  label="Konstruksi"
                  variant="outlined"
                  density="compact"
                  hide-details="auto"
                  maxlength="20"
                />
              </v-col>
              <v-col cols="6" md="4">
                <v-text-field
                  v-model="formData.Bhn_panjang"
                  label="Panjang (opsional)"
                  type="number"
                  variant="outlined"
                  density="compact"
                  hide-details="auto"
                  :rules="[panjangValid]"
                  v-select-on-focus
                />
              </v-col>
              <v-col cols="6" md="4">
                <v-text-field
                  v-model="formData.Bhn_lebar"
                  label="Lebar"
                  type="number"
                  variant="outlined"
                  density="compact"
                  hide-details="auto"
                  :rules="[wajibIsi, lebihDariNol]"
                  v-select-on-focus
                />
              </v-col>
              <v-col cols="12" md="6">
                <v-select
                  v-model="formData.Bhn_satuan"
                  :items="satuanOptions"
                  label="Satuan"
                  variant="outlined"
                  density="compact"
                  hide-details="auto"
                />
              </v-col>
            </template>

            <!-- ================= MMT FIELDS ================= -->
            <template v-else-if="isMmt">
              <v-col cols="12">
                <v-text-field
                  v-model="formData.Bhn_name"
                  label="Nama Bahan MMT *"
                  variant="outlined"
                  density="compact"
                  hide-details="auto"
                  :rules="[wajibIsi]"
                  placeholder="Contoh: FLEXY CHINA 280 GR 3.2M"
                />
              </v-col>

              <v-col cols="12" md="6">
                <v-select
                  v-model="formData.bhn_ktg_kode"
                  :items="kategoriOptions"
                  item-title="Nama"
                  item-value="Kode"
                  label="Kategori MMT"
                  variant="outlined"
                  density="compact"
                  clearable
                  hide-details="auto"
                />
              </v-col>

              <v-col cols="12" md="6">
                <v-select
                  v-model="formData.Bhn_jb_kode"
                  :items="jenisBarangOptions"
                  item-title="Nama"
                  item-value="Kode"
                  label="Jenis Barang"
                  variant="outlined"
                  density="compact"
                  clearable
                  hide-details="auto"
                />
              </v-col>

              <v-col cols="12" md="6">
                <v-select
                  v-model="formData.bhn_gdg_default"
                  :items="gudangOptions"
                  item-title="Nama"
                  item-value="Kode"
                  label="Gudang Default"
                  variant="outlined"
                  density="compact"
                  hide-details="auto"
                />
              </v-col>

              <v-col cols="12" md="6">
                <v-text-field
                  v-model="formData.nmSupplier"
                  label="Supplier"
                  variant="outlined"
                  density="compact"
                  readonly
                  placeholder="Pilih Supplier..."
                  hide-details="auto"
                  clearable
                  @click:clear="
                    formData.bhn_sup_kode = '';
                    formData.nmSupplier = '';
                  "
                >
                  <template #append-inner>
                    <IconSearch
                      :size="15"
                      :stroke-width="1.7"
                      color="#1565c0"
                      style="cursor: pointer"
                      @click="
                        openLookup(
                          'supplier',
                          'Daftar Supplier',
                          'supplier',
                          true,
                        )
                      "
                    />
                  </template>
                </v-text-field>
              </v-col>

              <v-col cols="6" md="4">
                <v-text-field
                  v-model="formData.Bhn_lebar"
                  label="Lebar"
                  type="number"
                  variant="outlined"
                  density="compact"
                  hide-details="auto"
                  v-select-on-focus
                />
              </v-col>

              <v-col cols="6" md="4">
                <v-text-field
                  v-model="formData.Bhn_panjang"
                  label="Panjang"
                  type="number"
                  variant="outlined"
                  density="compact"
                  hide-details="auto"
                  v-select-on-focus
                />
              </v-col>

              <v-col cols="12" md="4">
                <v-select
                  v-model="formData.Bhn_satuan"
                  :items="satuanOptions"
                  label="Satuan"
                  variant="outlined"
                  density="compact"
                  hide-details="auto"
                />
              </v-col>

              <v-col cols="12">
                <v-radio-group
                  v-model="formData.bhn_status"
                  inline
                  label="Status Moving"
                  density="compact"
                  hide-details
                >
                  <v-radio label="Fast Moving" value="F" color="success" />
                  <v-radio label="Slow Moving" value="S" color="primary" />
                  <v-radio label="Non Flexy" value="N" color="grey" />
                </v-radio-group>
              </v-col>

              <v-col cols="12">
                <div class="d-flex align-center gap-4 py-1">
                  <v-checkbox
                    v-model="formData.isAktif"
                    label="Aktif"
                    color="success"
                    density="compact"
                    hide-details
                    class="mr-4"
                  />
                  <v-checkbox
                    v-model="formData.isStok"
                    label="Hitung Stok"
                    color="primary"
                    density="compact"
                    hide-details
                    class="mr-4"
                  />
                  <v-checkbox
                    v-model="formData.isExpired"
                    label="Ada Expired"
                    color="warning"
                    density="compact"
                    hide-details
                  />
                </div>
              </v-col>
            </template>

            <!-- Reguler vs Dead Stock Radio (Garmen & Spanduk) -->
            <v-col cols="12" v-if="!isMmt">
              <v-radio-group
                v-model="formData.Bhn_dead"
                inline
                label="Kategori"
                density="compact"
                hide-details
              >
                <v-radio label="Reguler" :value="0" color="primary"></v-radio>
                <v-radio label="Dead Stock" :value="1" color="error"></v-radio>
              </v-radio-group>
            </v-col>

            <!-- Keterangan & Buffer Stok (Semua Tipe) -->
            <v-col cols="12">
              <v-text-field
                v-model="formData.Bhn_ket"
                label="Keterangan"
                variant="outlined"
                density="compact"
                hide-details="auto"
              />
            </v-col>

            <v-col cols="12" md="4">
              <v-text-field
                v-model.number="formData.Bhn_buffer"
                label="Buffer Stok"
                type="number"
                variant="outlined"
                density="compact"
                hide-details="auto"
                v-select-on-focus
              />
            </v-col>

            <!-- Bagian Harga -->
            <v-col cols="12" v-if="authStore.canLihatHarga">
              <div class="pa-3 bg-blue-lighten-5 rounded border mt-2">
                <v-row dense>
                  <v-col cols="12" :md="isMmt ? 4 : 6">
                    <v-text-field
                      v-model="formData.Bhn_avgcost"
                      label="Avg Cost"
                      prefix="Rp"
                      variant="outlined"
                      density="compact"
                      readonly
                      hide-details
                    />
                  </v-col>
                  <v-col cols="12" :md="isMmt ? 4 : 6">
                    <v-text-field
                      v-model.number="formData.Bhn_hargabeli"
                      label="Harga Beli Terakhir"
                      prefix="Rp"
                      variant="outlined"
                      density="compact"
                      hide-details
                    />
                  </v-col>
                  <v-col cols="12" md="4" v-if="isMmt">
                    <v-text-field
                      v-model.number="formData.bhn_hrgjual"
                      label="Harga Jual"
                      prefix="Rp"
                      variant="outlined"
                      density="compact"
                      hide-details
                    />
                  </v-col>
                </v-row>
              </div>
            </v-col>
          </v-row>
        </v-card-text>

        <v-card-actions class="bg-grey-lighten-4 border-t pa-3">
          <v-spacer></v-spacer>
          <v-btn
            variant="text"
            @click="confirmCancelDialogVisible = true"
            :disabled="isSaving"
            >Batal</v-btn
          >
          <v-btn
            color="primary"
            type="submit"
            variant="elevated"
            :loading="isSaving"
            class="px-6"
            :disabled="isMmt && isNewMode && Boolean(kodeCheckResult?.exists)"
            >Simpan Data (F10)</v-btn
          >
        </v-card-actions>
      </v-form>
    </v-card>
  </v-dialog>

  <SearchLookup
    v-model="lookupState.show"
    :title="lookupState.title"
    :lookup-category="lookupState.category"
    @on-select="handleLookupSelect"
  />

  <v-dialog v-model="confirmDialogVisible" max-width="400px">
    <v-card class="rounded-lg">
      <v-card-title class="text-subtitle-1 font-weight-bold pa-4">
        <IconHelpCircle
          :size="18"
          :stroke-width="1.7"
          color="#1565c0"
          class="mr-2"
        />
        Konfirmasi
      </v-card-title>
      <v-card-text class="pa-4 pt-0 text-body-2"
        >Yakin ingin menyimpan data bahan ini?</v-card-text
      >
      <v-card-actions class="pa-4">
        <v-spacer></v-spacer>
        <v-btn variant="text" @click="confirmDialogVisible = false"
          >Batal</v-btn
        >
        <v-btn color="primary" variant="elevated" @click="executeSave"
          >Ya, Simpan</v-btn
        >
      </v-card-actions>
    </v-card>
  </v-dialog>

  <v-dialog v-model="confirmCancelDialogVisible" max-width="400px">
    <v-card class="rounded-lg">
      <v-card-title class="text-subtitle-1 font-weight-bold pa-4 text-error">
        <IconAlertTriangle
          :size="18"
          :stroke-width="1.7"
          color="#c62828"
          class="mr-2"
        />
        Batalkan
      </v-card-title>
      <v-card-text class="pa-4 pt-0 text-body-2"
        >Perubahan belum disimpan. Yakin ingin keluar?</v-card-text
      >
      <v-card-actions class="pa-4">
        <v-spacer></v-spacer>
        <v-btn variant="text" @click="confirmCancelDialogVisible = false"
          >Lanjut Input</v-btn
        >
        <v-btn
          color="error"
          variant="elevated"
          @click="
            () => {
              confirmCancelDialogVisible = false;
              dialogVisible = false;
            }
          "
          >Ya, Tutup</v-btn
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
