<script setup lang="ts">
import { ref, computed, onMounted, nextTick } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useToast } from "vue-toastification";
import BaseForm from "@/components/BaseForm.vue";
import { useForm } from "@/composables/useForm";
import {
  penggunaService,
  type PenggunaFormData,
} from "@/services/ga/penggunaService";
import { IconUsers } from "@tabler/icons-vue";

const route = useRoute();
const router = useRouter();
const toast = useToast();

const editKode = computed(() =>
  decodeURIComponent(String(route.params.kode || "")),
);
const isEdit = computed(() => !!editKode.value);
const namaInputRef = ref<HTMLInputElement | null>(null);

const initialData: PenggunaFormData = {
  kode: "",
  nama: "",
};

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
} = useForm<PenggunaFormData>({
  menuId: "602",
  initialData,
  submitApi: async (data) => {
    const payload: PenggunaFormData = {
      kode: (data.kode || "").trim(),
      nama: (data.nama || "").trim().toUpperCase(),
    };

    if (isEdit.value) {
      return penggunaService.update(editKode.value, { nama: payload.nama });
    } else {
      return penggunaService.create({ kode: "", nama: payload.nama });
    }
  },
  onSuccess: (res: any) => {
    const kodeSaved =
      res?.data?.data?.kode || formData.value.kode || editKode.value || "";
    toast.success(
      isEdit.value
        ? `Pengguna ${formData.value.nama} (${editKode.value}) berhasil diperbarui.`
        : `Berhasil disimpan: ${formData.value.nama} (${kodeSaved})`,
    );
    router.push({ name: "GaMasterPengguna" });
  },
});

const onValidate = () => {
  const nama = (formData.value.nama || "").trim();
  if (!nama) {
    toast.warning("Nama pengguna harus diisi.");
    if (namaInputRef.value) namaInputRef.value.focus();
    return;
  }
  showSaveDialog.value = true;
};

onMounted(async () => {
  if (isEdit.value) {
    try {
      const res = await penggunaService.getById(editKode.value);
      const d = res.data.data;
      if (!d) throw new Error("Data tidak ditemukan");
      formData.value = {
        kode: d.Kode,
        nama: d.Nama || "",
      };
    } catch (err: any) {
      toast.error(
        err.response?.data?.message || err.message || "Gagal memuat data Pengguna.",
      );
      goBack();
    }
  } else {
    // Mode Tambah Baru: Kode kosong, baru tercipta saat simpan
    formData.value.kode = "";
  }

  nextTick(() => {
    if (namaInputRef.value) namaInputRef.value.focus();
  });
});
</script>

<template>
  <BaseForm
    :title="isEdit ? 'Ubah Pengguna' : 'Master Pengguna'"
    menu-id="602"
    :icon="IconUsers"
    :is-saving="isSaving"
    :item-name="isEdit ? `Pengguna ${editKode}` : 'Pengguna Baru'"
    v-model:show-save-dialog="showSaveDialog"
    v-model:show-cancel-dialog="showCancelDialog"
    v-model:show-close-dialog="showCloseDialog"
    @validate-save="onValidate"
    @confirm-save="executeSave"
    @confirm-cancel="executeCancel"
    @confirm-close="executeClose"
  >
    <div class="delphi-container">
      <!-- Judul Form Delphi 7 (lbljudul: Pengguna) -->
      <div class="delphi-header-title">Pengguna</div>
      <div class="delphi-top-line"></div>

      <!-- Form Inputs Header (Layout Delphi 7) -->
      <div class="delphi-form-content">
        <!-- Row 1: Kode (Baru tercipta saat simpan) -->
        <div class="delphi-row">
          <label class="delphi-lbl">Kode</label>
          <div class="delphi-val">
            <input
              type="text"
              :value="isEdit ? formData.kode : ''"
              class="delphi-ctrl ctrl-kode"
              disabled
              placeholder=""
            />
          </div>
        </div>

        <!-- Row 2: Nama (Otomatis Huruf Kapital) -->
        <div class="delphi-row">
          <label class="delphi-lbl">Nama</label>
          <div class="delphi-val">
            <input
              ref="namaInputRef"
              type="text"
              v-model="formData.nama"
              class="delphi-ctrl ctrl-nama"
              maxlength="30"
              placeholder="Nama pengguna..."
              style="text-transform: uppercase"
              @input="formData.nama = ($event.target as HTMLInputElement).value.toUpperCase()"
            />
          </div>
        </div>
      </div>
    </div>
  </BaseForm>
</template>

<style scoped>
/* ── Wrapper Form Tema Delphi 7 ── */
.delphi-container {
  background-color: #ffffff;
  padding: 16px 24px;
  font-family: Tahoma, "Segoe UI", Arial, sans-serif;
  color: #000000;
  box-sizing: border-box;
}

.delphi-header-title {
  font-size: 16px;
  font-weight: bold;
  color: #000000;
  letter-spacing: 0.5px;
  margin-bottom: 8px;
}

.delphi-top-line {
  height: 2px;
  background-color: #808080;
  margin-bottom: 16px;
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
}

.delphi-lbl {
  width: 100px;
  font-size: 12px;
  color: #000000;
  flex-shrink: 0;
  user-select: none;
}

.delphi-val {
  flex-grow: 1;
}

/* ── Input Controls Delphi 7 ── */
.delphi-ctrl {
  font-size: 12px;
  font-family: Tahoma, sans-serif;
  color: #000000;
  background-color: #ffffff;
  border: 1px solid #7f9db9;
  padding: 2px 6px;
  height: 24px;
  outline: none;
  box-sizing: border-box;
}

.delphi-ctrl:focus {
  border-color: #0055ea;
  box-shadow: 0 0 0 1px #0055ea;
}

.delphi-ctrl:disabled {
  background-color: #d4d0c8;
  color: #444444;
  cursor: not-allowed;
  border-color: #abadb3;
}

.ctrl-kode {
  width: 90px;
  font-weight: 600;
}

.ctrl-nama {
  width: 300px;
}
</style>
