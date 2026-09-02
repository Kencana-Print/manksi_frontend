<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useRouter } from "vue-router";
import { useForm } from "@/composables/useForm";
import { praOrderService } from "@/services/penjualan/praOrderService";
import { useToast } from "vue-toastification";
import BaseForm from "@/components/BaseForm.vue";
import PraOrderTabRencana from "./components/PraOrderTabRencana.vue";
import PraOrderTabUkuran from "./components/PraOrderTabUkuran.vue";
import PraOrderTabKatalog from "./components/PraOrderTabKatalog.vue";
import { IconNotebook, IconRuler2, IconPhoto } from "@tabler/icons-vue";

type PraOrderForm = typeof initialData;
type RouteParams = { nomor?: string };

const toast = useToast();
const router = useRouter();
const pendingFiles = ref<File[]>([]);

const formatDateLocal = (value?: string | Date) => {
  if (!value) return "";
  const d = new Date(value);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const initialData = {
  Nomor: "",
  Tanggal: new Date().toISOString().substring(0, 10),
  Divisi: "1",
  CustKode: "",
  CustNama: "",
  SalesKode: "",
  SalesNama: "",
  NamaPekerjaan: "",
  Finishing: "",
  Spesifikasi: "",
  Sampel: "N",
  TglKirim: new Date().toISOString().substring(0, 10),
  CatatanDeadline: "",
  Keterangan: "",
  StatusBahan: "BELUM DICEK",
  StatusPpic: "PENDING",
  CatatanPpic: "",
  NomorMH: "",
  Status: "OPEN",
  StatusEdit: "",
  isTutupBuku: false,
  Created: "",
  User: "",
  Bahan: [] as {
    ProbId?: number;
    Kode: string;
    Nama: string;
    StatusReady?: string;
  }[],
  Ukuran: [] as { Kode: string; Ukuran: string; Qty: number }[],
  Gambar: [] as { Id?: number; Path: string; Keterangan: string }[],
};

const {
  isEditMode,
  isLoading,
  isSaving,
  showSaveDialog,
  showCancelDialog,
  showCloseDialog,
  formData,
  fetchData,
  executeSave,
  executeCancel,
  executeClose,
  params,
} = useForm<PraOrderForm, RouteParams>({
  menuId: "175",
  initialData,
  fetchApi: async (): Promise<PraOrderForm> => {
    const res = await praOrderService.getById(params.nomor!);
    const d: any = res.data.data;
    return {
      Nomor: d.pro_nomor,
      Tanggal: formatDateLocal(d.pro_tanggal),
      Divisi: String(d.pro_divisi),
      CustKode: d.pro_cus_kode,
      CustNama: d.pro_cus_nama,
      SalesKode: d.pro_sal_kode,
      SalesNama: d.SalesNama,
      NamaPekerjaan: d.pro_nama_pekerjaan,
      Finishing: d.pro_finishing,
      Spesifikasi: d.pro_spesifikasi,
      Sampel: d.pro_sampel,
      TglKirim: formatDateLocal(d.pro_tgl_kirim),
      CatatanDeadline: d.pro_catatan_deadline,
      Keterangan: d.pro_keterangan,
      StatusBahan: d.pro_status_bahan,
      StatusPpic: d.pro_status_ppic,
      CatatanPpic: d.pro_catatan_ppic,
      NomorMH: d.pro_mh_nomor,
      Status: d.pro_status,
      StatusEdit: d.StatusEdit,
      isTutupBuku: d.isTutupBuku,
      Created: d.date_create || "",
      User: d.user_create || "",
      Bahan: (d.bahan || []).map((b: any) => ({
        ProbId: b.prob_id,
        Kode: b.prob_bahan_kode,
        Nama: b.NamaBahan,
        StatusReady: b.prob_status_ready,
      })),
      Ukuran: (d.ukuran || []).map((u: any) => ({
        Kode: u.prou_ukuran,
        Ukuran: u.NamaUkuran,
        Qty: Number(u.prou_qty) || 0,
      })),
      Gambar: (d.gambar || []).map((g: any) => ({
        Id: g.prog_id,
        Path: g.prog_file_path,
        Keterangan: g.prog_keterangan,
      })),
    };
  },
  submitApi: async (dataToSave: PraOrderForm): Promise<unknown> => {
    return await praOrderService.save(
      {
        nomor: dataToSave.Nomor,
        tanggal: dataToSave.Tanggal,
        cusKode: dataToSave.CustKode,
        cusNama: dataToSave.CustNama,
        salKode: dataToSave.SalesKode,
        namaPekerjaan: dataToSave.NamaPekerjaan,
        divisi: dataToSave.Divisi,
        finishing: dataToSave.Finishing,
        spesifikasi: dataToSave.Spesifikasi,
        sampel: dataToSave.Sampel,
        tglKirim: dataToSave.TglKirim,
        catatanDeadline: dataToSave.CatatanDeadline,
        keterangan: dataToSave.Keterangan,
        bahan: dataToSave.Bahan.map((b) => ({ kode: b.Kode })),
        ukuran: dataToSave.Ukuran.map((u) => ({ kode: u.Kode, qty: u.Qty })),
        StatusEdit: dataToSave.StatusEdit,
      },
      isEditMode.value,
    );
  },
  onSuccess: async (response: any) => {
    const nomor = response.data?.nomor || formData.value.Nomor;
    if (pendingFiles.value.length > 0 && nomor) {
      try {
        const fd = new FormData();
        pendingFiles.value.forEach((f) => fd.append("files", f));
        await praOrderService.uploadGambar(nomor, fd);
        toast.success("Data dan gambar berhasil disimpan!");
      } catch {
        toast.error("Data tersimpan, tapi gagal mengunggah gambar.");
      }
    } else {
      toast.success("Data berhasil disimpan!");
    }
    router.push("/penjualan/pra-order");
  },
});

onMounted(() => {
  if (isEditMode.value) fetchData();
});

const currentTab = ref(0);
const tabs = [
  { text: "1. Rencana Order", icon: IconNotebook },
  { text: "2. Ukuran & Keterangan", icon: IconRuler2 },
  { text: "3. Katalog Referensi", icon: IconPhoto },
];

const handleFilesSelected = (files: File[]) => {
  pendingFiles.value = [...pendingFiles.value, ...files];
};
</script>

<template>
  <BaseForm
    :title="isEditMode ? 'Ubah Pra Order' : 'Tambah Pra Order'"
    menu-id="175"
    :icon="IconNotebook"
    :is-loading="isLoading"
    :is-saving="isSaving"
    item-name="Pra Order"
    v-model:show-save-dialog="showSaveDialog"
    v-model:show-cancel-dialog="showCancelDialog"
    v-model:show-close-dialog="showCloseDialog"
    @validate-save="showSaveDialog = true"
    @confirm-save="executeSave"
    @confirm-cancel="executeCancel"
    @confirm-close="executeClose"
  >
    <div class="po-container">
      <div class="po-tab-nav">
        <button
          v-for="(tab, idx) in tabs"
          :key="idx"
          class="po-tab-btn"
          :class="{ active: currentTab === idx }"
          @click="currentTab = idx"
        >
          <component :is="tab.icon" :size="13" class="mr-1" />
          {{ tab.text }}
        </button>
      </div>
      <div class="po-tab-body">
        <div v-show="currentTab === 0" class="po-tab-pane">
          <PraOrderTabRencana
            :form-data="formData"
            :is-edit="isEditMode"
            @files-selected="handleFilesSelected"
          />
        </div>
        <div v-show="currentTab === 1" class="po-tab-pane">
          <PraOrderTabUkuran :form-data="formData" :is-edit="isEditMode" />
        </div>
        <div
          v-show="currentTab === 2"
          class="po-tab-pane"
          style="padding: 0; overflow: hidden; height: 100%"
        >
          <PraOrderTabKatalog
            :cust-kode="formData.CustKode"
            :cust-nama="formData.CustNama"
          />
        </div>
      </div>
    </div>
  </BaseForm>
</template>

<style scoped>
.po-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
}
.po-tab-nav {
  display: flex;
  align-items: center;
  gap: 2px;
  padding: 6px 10px 0;
  background: #fafafa;
  border-bottom: 2px solid #e0e0e0;
  flex-shrink: 0;
}
.po-tab-btn {
  display: inline-flex;
  align-items: center;
  padding: 5px 14px;
  font-size: 12px;
  font-weight: 600;
  color: #757575;
  background: transparent;
  border: 1px solid transparent;
  border-bottom: none;
  border-radius: 4px 4px 0 0;
  cursor: pointer;
  transition: all 0.15s;
  margin-bottom: -2px;
}
.po-tab-btn:hover {
  color: #1565c0;
  background: #e3f2fd;
}
.po-tab-btn.active {
  color: #1565c0;
  background: white;
  border-color: #e0e0e0;
  border-bottom-color: white;
}
.po-tab-body {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  min-height: 0;
  background: #f4f5f7;
}
.po-tab-pane {
  padding: 10px;
}
</style>
