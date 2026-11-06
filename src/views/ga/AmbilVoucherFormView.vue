<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useToast } from "vue-toastification";
import BaseForm from "@/components/BaseForm.vue";
import { useForm } from "@/composables/useForm";
import {
  ambilVoucherService,
  type VoucherFormData,
  type VoucherLookups,
} from "@/services/ga/ambilVoucherService";
import { IconTicket } from "@tabler/icons-vue";

const route = useRoute();
const router = useRouter();
const toast = useToast();

const editKode = computed(() =>
  decodeURIComponent(String(route.params.kode || "")),
);
const editId = computed(() =>
  decodeURIComponent(String(route.params.id || "")),
);
const isEdit = computed(() => !!editKode.value && !!editId.value);

const todayStr = () => {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const initialData: VoucherFormData = {
  no_voucher: "",
  id: null,
  tanggal: todayStr(),
  id_spbu: 1,
  kode_pengguna: "",
  pengguna: "",
  nopol: "",
  odometer: 0,
  id_bbm: null,
  jumlah: 0,
};

// ── Lookups state ──────────────────────────────────────────────────────
const lookups = ref<VoucherLookups>({
  spbu: [],
  pengguna: [],
  kendaraan: [],
  bbm: [],
});
const isLoadingLookups = ref(false);

// Format list untuk v-autocomplete - semua huruf besar (uppercase)
const spbuItems = computed(() =>
  (lookups.value.spbu || []).map((s) => ({
    title: (s.nama || "").toUpperCase(),
    value: s.id,
  })),
);

const penggunaItems = computed(() => {
  const list = (lookups.value.pengguna || []).map((p) =>
    (p.nama || "").toUpperCase(),
  );
  if (
    formData.value.pengguna &&
    !list.includes(formData.value.pengguna.toUpperCase())
  ) {
    list.unshift(formData.value.pengguna.toUpperCase());
  }
  return list;
});

const onPenggunaChange = (val: any) => {
  const nameStr = (
    typeof val === "string" ? val : val?.title || ""
  ).trim().toUpperCase();
  formData.value.pengguna = nameStr;
  const match = (lookups.value.pengguna || []).find(
    (p) => (p.nama || "").trim().toUpperCase() === nameStr,
  );
  if (match) {
    formData.value.kode_pengguna = match.kode;
  }
};

const kendaraanItems = computed(() => {
  const list = (lookups.value.kendaraan || []).map((k) => ({
    title: (
      (k.nopol || "") + (k.keterangan ? ` - ${k.keterangan}` : "")
    ).toUpperCase(),
    value: (k.nopol || "").toUpperCase(),
  }));

  // Jika sedang edit data lama dan nopolnya tidak ada di daftar kendaraan aktif, tambahkan agar tetap tampil
  if (
    formData.value.nopol &&
    !list.some((item) => item.value === formData.value.nopol.toUpperCase())
  ) {
    list.unshift({
      title: `${formData.value.nopol.toUpperCase()} (TIDAK AKTIF)`,
      value: formData.value.nopol.toUpperCase(),
    });
  }

  return list;
});

const bbmItems = computed(() =>
  (lookups.value.bbm || []).map((b) => ({
    title: (b.nama || "").toUpperCase(),
    value: b.id,
  })),
);

const {
  isSaving,
  showSaveDialog,
  showCancelDialog,
  showCloseDialog,
  formData,
  goBack,
  executeSave,
  executeCancel,
  executeClose,
} = useForm<VoucherFormData>({
  menuId: "613",
  initialData,
  submitApi: async (data) => {
    const namaPengguna = (data.pengguna || "").trim().toUpperCase();
    let kodePengguna = (data.kode_pengguna || "").trim().toUpperCase();
    if (!kodePengguna && namaPengguna) {
      const match = (lookups.value.pengguna || []).find(
        (p) => (p.nama || "").trim().toUpperCase() === namaPengguna,
      );
      if (match) kodePengguna = match.kode;
    }

    const payload: VoucherFormData = {
      ...data,
      no_voucher: isEdit.value ? (data.no_voucher || "").toUpperCase() : "",
      id: isEdit.value && data.id ? Number(data.id) : null,
      tanggal: data.tanggal || todayStr(),
      id_spbu: data.id_spbu ? Number(data.id_spbu) : null,
      kode_pengguna: kodePengguna,
      pengguna: namaPengguna,
      nopol: (data.nopol || "").trim().toUpperCase(),
      odometer: Number(data.odometer) || 0,
      id_bbm: data.id_bbm ? Number(data.id_bbm) : null,
      jumlah: Number(data.jumlah) || 0,
    };

    if (isEdit.value) {
      return ambilVoucherService.update(editKode.value, editId.value, payload);
    } else {
      return ambilVoucherService.create(payload);
    }
  },
  onSuccess: (res: any) => {
    const voucherSaved =
      res?.data?.data?.no_voucher ||
      formData.value.no_voucher ||
      editKode.value ||
      "";
    toast.success(
      isEdit.value
        ? `Voucher ${editKode.value} berhasil diperbarui.`
        : `Berhasil disimpan: Voucher nomor ${voucherSaved}`,
    );
    router.push({ name: "GaAmbilVoucher" });
  },
});

// ── Validasi Sesuai Delphi 7 ───────────────────────────────────────────
const onValidate = () => {
  if (!formData.value.id_spbu) {
    toast.warning("SPBU harus di isi");
    return;
  }
  if (!formData.value.pengguna?.trim()) {
    toast.warning("Pengguna harus di isi");
    return;
  }
  if (!formData.value.nopol?.trim()) {
    toast.warning("No.Polisi harus di isi");
    return;
  }
  if (!formData.value.id_bbm) {
    toast.warning("Nama bbm harus di isi");
    return;
  }
  if (Number(formData.value.jumlah) <= 0) {
    toast.warning("Jumlah bbm harus di isi");
    return;
  }

  showSaveDialog.value = true;
};

// ── Load lookups & data ────────────────────────────────────────────────
const loadLookups = async () => {
  isLoadingLookups.value = true;
  try {
    const res = await ambilVoucherService.getLookups();
    if (res.data?.data) {
      lookups.value = res.data.data;
    }
  } catch (err: any) {
    console.error("Gagal memuat lookup data:", err);
  } finally {
    isLoadingLookups.value = false;
  }
};

onMounted(async () => {
  await loadLookups();

  if (isEdit.value) {
    try {
      const res = await ambilVoucherService.getById(editKode.value, editId.value);
      const d = res.data.data;
      if (!d) throw new Error("Data tidak ditemukan");

      // Saat ubah, isian text di form pengguna mengambil dari tvoucher.pengguna
      const namaPengguna = (d.pengguna || d.nama_pengguna || "").toUpperCase();

      formData.value = {
        no_voucher: (d.no_voucher || "").toUpperCase(),
        id: Number(d.id),
        tanggal: d.tanggal,
        id_spbu: d.id_spbu ? Number(d.id_spbu) : null,
        kode_pengguna: (d.kode_pengguna || "").toUpperCase(),
        pengguna: namaPengguna,
        nopol: (d.nopol || "").toUpperCase(),
        odometer: Number(d.odometer) || 0,
        id_bbm: d.id_bbm ? Number(d.id_bbm) : null,
        jumlah: Number(d.jumlah) || 0,
      };
    } catch (err: any) {
      toast.error(
        err.response?.data?.message ||
          err.message ||
          "Gagal memuat data Voucher.",
      );
      goBack();
    }
  } else {
    // Mode Tambah Baru: Nomor bon kosong & tercipta saat simpan
    formData.value.no_voucher = "";
    formData.value.id = null;
    formData.value.nopol = ""; // default nomor polisi kosong
    formData.value.kode_pengguna = "";
    formData.value.pengguna = "";
    formData.value.id_bbm = null;

    // Default SPBU 'SPBU 44.571.11'
    if (lookups.value.spbu.length > 0) {
      const spbuSolo = lookups.value.spbu.find((s) =>
        s.nama.includes("44.571.11"),
      );
      formData.value.id_spbu = spbuSolo
        ? spbuSolo.id
        : lookups.value.spbu[0].id;
    }
  }
});
</script>

<template>
  <BaseForm
    :title="isEdit ? 'Ubah Ambil Voucher' : 'Ambil Voucher'"
    menu-id="613"
    :icon="IconTicket"
    :is-saving="isSaving"
    :item-name="isEdit ? `Voucher ${editKode}` : 'Voucher Baru'"
    v-model:show-save-dialog="showSaveDialog"
    v-model:show-cancel-dialog="showCancelDialog"
    v-model:show-close-dialog="showCloseDialog"
    @validate-save="onValidate"
    @confirm-save="executeSave"
    @confirm-cancel="executeCancel"
    @confirm-close="executeClose"
  >
    <div class="delphi-wrapper">
      <div class="delphi-container">
        <!-- Judul Form Delphi 7 (AdvPanel2 / lbljudul: Ambil Voucher) -->
        <div class="delphi-header-title">Ambil Voucher</div>
        <div class="delphi-top-line"></div>

        <!-- Form Inputs (AdvPanel1 Sesuai Layout Delphi 7) -->
        <div class="delphi-form-content">
          <!-- 1. Nomor Bon (edtKode + lblid: tercipta saat simpan untuk input baru) -->
          <div class="delphi-row">
            <label class="delphi-lbl">Nomor Bon</label>
            <div class="delphi-val">
              <input
                type="text"
                :value="isEdit ? formData.no_voucher : '[OTOMATIS SAAT SIMPAN]'"
                :class="['delphi-ctrl', isEdit ? 'ctrl-bon' : 'ctrl-bon-auto']"
                disabled
              />
              <span class="delphi-id-badge ml-2" v-if="isEdit && formData.id">
                ID: {{ formData.id }}
              </span>
            </div>
          </div>

          <!-- 2. Tanggal (dttanggal) -->
          <div class="delphi-row">
            <label class="delphi-lbl">Tanggal</label>
            <div class="delphi-val">
              <input
                type="date"
                v-model="formData.tanggal"
                class="delphi-ctrl ctrl-date"
              />
            </div>
          </div>

          <!-- 3. Kepada SPBU (cxExtLookupSPBU) -->
          <div class="delphi-row">
            <label class="delphi-lbl">Kepada SPBU</label>
            <div class="delphi-val">
              <v-autocomplete
                v-model="formData.id_spbu"
                :items="spbuItems"
                item-title="title"
                item-value="value"
                placeholder="PILIH SPBU..."
                density="compact"
                variant="outlined"
                hide-details
                class="delphi-select"
              />
            </div>
          </div>

          <!-- 4. Pengguna (cxExtLookupPengguna) -->
          <div class="delphi-row">
            <label class="delphi-lbl">Pengguna</label>
            <div class="delphi-val">
              <v-combobox
                v-model="formData.pengguna"
                :items="penggunaItems"
                placeholder="PILIH / KETIK PENGGUNA..."
                density="compact"
                variant="outlined"
                hide-details
                maxlength="30"
                class="delphi-select"
                style="text-transform: uppercase"
                @update:model-value="onPenggunaChange"
              />
            </div>
          </div>

          <!-- 5. Nomor Polisi (cxExtLookupKendaraan - default kosong) -->
          <div class="delphi-row">
            <label class="delphi-lbl">Nomor Polisi</label>
            <div class="delphi-val">
              <v-autocomplete
                v-model="formData.nopol"
                :items="kendaraanItems"
                item-title="title"
                item-value="value"
                placeholder="PILIH KENDARAAN..."
                density="compact"
                variant="outlined"
                hide-details
                class="delphi-select"
              />
            </div>
          </div>

          <!-- 6. Odometer (edtOdometer) -->
          <div class="delphi-row">
            <label class="delphi-lbl">Odometer</label>
            <div class="delphi-val">
              <input
                type="number"
                v-model.number="formData.odometer"
                class="delphi-ctrl ctrl-number"
                min="0"
                step="1"
              />
            </div>
          </div>

          <!-- 7. Nama BBM (cxExtLookupBBM) -->
          <div class="delphi-row">
            <label class="delphi-lbl">Nama Bbm</label>
            <div class="delphi-val">
              <v-autocomplete
                v-model="formData.id_bbm"
                :items="bbmItems"
                item-title="title"
                item-value="value"
                placeholder="PILIH BBM..."
                density="compact"
                variant="outlined"
                hide-details
                class="delphi-select"
              />
            </div>
          </div>

          <!-- 8. Jumlah (edtJml) + Liter (Label9) -->
          <div class="delphi-row">
            <label class="delphi-lbl">Jumlah</label>
            <div class="delphi-val align-center">
              <input
                type="number"
                v-model.number="formData.jumlah"
                class="delphi-ctrl ctrl-number"
                min="0"
                step="0.01"
              />
              <span class="delphi-unit-lbl ml-2">Liter</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </BaseForm>
</template>

<style scoped>
/* ── Wrapper Auto Center / Tengah ── */
.delphi-wrapper {
  display: flex;
  justify-content: center;
  align-items: flex-start;
  padding: 24px 16px;
  width: 100%;
  box-sizing: border-box;
}

/* ── Container Form Bergaya Delphi 7 ── */
.delphi-container {
  background-color: #ffffff;
  padding: 24px 28px;
  font-family: Tahoma, "Segoe UI", Arial, sans-serif;
  color: #000000;
  box-sizing: border-box;
  width: 100%;
  max-width: 530px;
  border: 1px solid #7f9db9;
  border-radius: 4px;
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.08);
}

.delphi-header-title {
  font-size: 17px;
  font-weight: bold;
  color: #000000;
  letter-spacing: 0.5px;
  margin-bottom: 8px;
}

.delphi-top-line {
  height: 2px;
  background-color: #808080;
  margin-bottom: 18px;
}

.delphi-form-content {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

/* ── Baris Label & Input Delphi ── */
.delphi-row {
  display: flex;
  align-items: center;
  min-height: 30px;
}

/* Label lebih besar & jelas */
.delphi-lbl {
  width: 135px;
  font-size: 14px;
  font-weight: 600;
  color: #111111;
  flex-shrink: 0;
  user-select: none;
}

.delphi-val {
  flex-grow: 1;
  display: flex;
  align-items: center;
}

/* ── Input Controls Delphi 7 - Auto Uppercase ── */
.delphi-ctrl {
  font-size: 13px;
  font-family: Tahoma, sans-serif;
  color: #000000;
  background-color: #ffffff;
  border: 1px solid #7f9db9;
  padding: 3px 8px;
  height: 28px;
  outline: none;
  box-sizing: border-box;
  text-transform: uppercase;
}

.delphi-ctrl:focus {
  border-color: #0055ea;
  box-shadow: 0 0 0 1px #0055ea;
}

.delphi-ctrl:disabled {
  background-color: #e5e5e5;
  color: #444444;
  cursor: not-allowed;
}

/* ── Ukuran Kontrol Spesifik Sesuai Delphi 7 ── */
.ctrl-bon {
  width: 85px;
  font-weight: bold;
}

.ctrl-bon-auto {
  width: 175px;
  font-style: italic;
  font-size: 12px;
  color: #555555 !important;
}

.ctrl-date {
  width: 155px;
}

.ctrl-number {
  width: 125px;
  text-align: right;
}

.delphi-id-badge {
  font-size: 12px;
  color: #666666;
  font-weight: 500;
}

.delphi-unit-lbl {
  font-size: 14px;
  font-weight: 500;
  color: #111111;
}

/* ── Autocomplete Bergaya Delphi cxExtLookup - Auto Uppercase ── */
.delphi-select {
  max-width: 250px;
  width: 250px;
}

:deep(.delphi-select .v-field) {
  min-height: 28px !important;
  height: 28px !important;
  font-size: 13px !important;
  font-family: Tahoma, sans-serif !important;
  border-radius: 0 !important;
  border: 1px solid #7f9db9 !important;
  background-color: #ffffff !important;
  padding-inline-start: 6px !important;
  padding-inline-end: 6px !important;
}

:deep(.delphi-select .v-field--focused) {
  border-color: #0055ea !important;
  box-shadow: 0 0 0 1px #0055ea !important;
}

:deep(.delphi-select input),
:deep(.delphi-select .v-field__input),
:deep(.delphi-select .v-autocomplete__selection-text) {
  min-height: 26px !important;
  padding-top: 0 !important;
  padding-bottom: 0 !important;
  font-size: 13px !important;
  color: #000000 !important;
  text-transform: uppercase !important;
}

:deep(.delphi-select input::placeholder) {
  text-transform: uppercase !important;
}

:deep(.delphi-select .v-field__outline) {
  display: none !important;
}

:deep(.delphi-select .v-field__append-inner) {
  padding-top: 0 !important;
  align-items: center !important;
}
</style>
