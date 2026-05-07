<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useForm } from "@/composables/useForm";
import api from "@/services/api";
import { useToast } from "vue-toastification";
import BaseForm from "@/components/BaseForm.vue";
import TabPermintaan from "./components/TabPermintaan.vue";
import TabKalkulasi from "./components/TabKalkulasi.vue";
import { IconCash, IconCalculator } from "@tabler/icons-vue";

type MintaHargaForm = typeof initialData;

type RouteParams = {
  nomor?: string;
};

const selectedImageFile = ref<File | null>(null);
const toast = useToast();

const initialData = {
  Nomor: "",
  Tanggal: new Date().toISOString().substring(0, 10),
  Divisi: "1",
  CustKode: "",
  CustNama: "",
  SalesKode: "",
  SalesNama: "",
  NamaPekerjaan: "",
  RencanaOrder: 0,
  HargaLama: 0,
  HargaBudget: 0,
  TanggalOrderTerakhir: new Date().toISOString().substring(0, 10),
  Kain: "",
  Ukuran: "",
  Panjang: 0,
  Lebar: 0,
  Gramasi: "",
  Finishing: "",
  Sublim: "",
  CabKaos: "",
  Keterangan: "",
  Status: "MINTA",
  StatusEdit: "",
  SimpanKalkulasi: false,
  PathImage: "",
  isKalkulasiLocked: false,
  KalkulasiInfo: "",
  isTutupBuku: false,
  Created: "",
  User: "",
  Perfect: "",
  Kalkulasi: {
    NomorKalkulasi: "",
    TanggalKalkulasi: "",
    Model: "KH-0001",
    JenisKain: "",
    Warna: "MUDA",
    KategoriKain: "",
    RpPotong: 0,
    RpJahit: 0,
    RpFinishing: 0,
    RpKirim: 0,
    RpObat: 0,
    RpCetakTotal: 0,
    RpBordirTotal: 0,
    RpDtfTotal: 0,
    GridKomponen: [],
    GridCetak: [],
    GridAksesoris: [],
    Bordir: {
      Cm: 0,
      P1: 0,
      P2: 0,
      P3: 0,
      P4: 0,
      P5: 0,
      P6: 0,
      P7: 0,
      P8: 0,
      L1: 0,
      L2: 0,
      L3: 0,
      L4: 0,
      L5: 0,
      L6: 0,
      L7: 0,
      L8: 0,
    },
    Dtf: {
      Cm: 0,
      P1: 0,
      P2: 0,
      P3: 0,
      P4: 0,
      P5: 0,
      P6: 0,
      P7: 0,
      P8: 0,
      L1: 0,
      L2: 0,
      L3: 0,
      L4: 0,
      L5: 0,
      L6: 0,
      L7: 0,
      L8: 0,
    },
    RpAllowance: 0,
    PersenAllowance: 0,
    RpLaba: 0,
    PersenLaba: 0,
    HargaSesuai: 0,
  },
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
} = useForm<MintaHargaForm, RouteParams>({
  menuId: "166",
  initialData,
  fetchApi: async (): Promise<MintaHargaForm> => {
    const res: { data: { data: any } } = await api.get(
      `/penjualan/minta-harga-form/${params.nomor}`,
    );

    const d: any = res.data.data;
    return {
      Nomor: d.mh_nomor,
      Tanggal: d.mh_tanggal?.substring(0, 10) ?? "",
      Divisi: d.mh_divisi,
      CustKode: d.mh_cus_kode,
      CustNama: d.mh_cus_nama,
      SalesKode: d.mh_sal_kode,
      SalesNama: d.SalesNama,
      NamaPekerjaan: d.mh_nama,
      RencanaOrder: Number(d.mh_jmlorder) || 0,
      HargaLama: Number(d.mh_harga) || 0,
      HargaBudget: Number(d.mh_budget) || 0,
      TanggalOrderTerakhir: d.mh_dateorder?.substring(0, 10) ?? "",
      Kain: d.mh_kain,
      Ukuran: d.mh_ukuran,
      Panjang: Number(d.mh_panjang) || 0,
      Lebar: Number(d.mh_lebar) || 0,
      Gramasi: d.mh_gramasi,
      Finishing: d.mh_finishing,
      Sublim: d.mh_sublim,
      CabKaos: d.mh_cabkaos,
      Keterangan: d.mh_ket,
      Status: d.mh_status,
      StatusEdit: d.StatusEdit,
      SimpanKalkulasi: !!d.mh_nomor_kalkulasi,
      PathImage: d.imageUrl || "",
      isKalkulasiLocked: d.isKalkulasiLocked || false,
      KalkulasiInfo: d.KalkulasiInfo || "",
      isTutupBuku: d.isTutupBuku || false,
      Created: d.mh_created || d.Created || "",
      User: d.mh_user || d.User || "",
      Perfect: d.mh_perfect || d.Perfect || "",
      Kalkulasi: d.Kalkulasi
        ? {
            NomorKalkulasi: d.mh_nomor_kalkulasi,
            TanggalKalkulasi: d.Kalkulasi.Header.tglFormat,
            Model: d.Kalkulasi.Header.kal_kh_kode || "KH-0001",
            JenisKain: d.Kalkulasi.LoadedJenisKain,
            Warna: d.Kalkulasi.LoadedWarna,
            KategoriKain: "",
            RpPotong: Number(d.Kalkulasi.Detail.kald_rppotong) || 0,
            RpJahit: Number(d.Kalkulasi.Detail.kald_rpjahit) || 0,
            RpFinishing: Number(d.Kalkulasi.Detail.kald_rpfinishing) || 0,
            RpKirim: Number(d.Kalkulasi.Detail.kald_rpkirim) || 0,
            RpObat: Number(d.Kalkulasi.Detail.kald_rpbiayaobat) || 0,
            RpCetakTotal: Number(d.Kalkulasi.Cetak.kald_rpcetak) || 0,
            RpBordirTotal: Number(d.Kalkulasi.Bordir.kald_rpbordir) || 0,
            RpDtfTotal: Number(d.Kalkulasi.Dtf.kald_rpdtf) || 0,
            GridKomponen: (d.Kalkulasi.GridKomponen || []).map((k: any) => ({
              Komponen: k.kk_komponen,
              Kg: k.kk_kg === "Y",
              Pabrik: k.kk_pabrik === "Y",
              JenisKain: k.kk_jeniskain,
              Lengan: k.kk_lengan,
              Warna: k.kk_warna,
              Harga: Number(k.kk_harga),
              Babaran: Number(k.kk_babaran),
              Pcs: Number(k.kk_pcs),
              Kebutuhan: 0,
              Bruto: 0,
            })),
            GridCetak: (d.Kalkulasi.GridCetak || []).map((c: any) => ({
              Keterangan: c.kc_ket,
              Harga: Number(c.kc_biaya),
            })),
            GridAksesoris: (d.Kalkulasi.GridAksesoris || []).map((a: any) => ({
              Keterangan: a.ka_aksesories,
              Harga: Number(a.ka_biaya),
            })),
            Bordir: {
              Cm: Number(d.Kalkulasi.Bordir.kald_cmbordir) || 0,

              P1: Number(d.Kalkulasi.Bordir.kald_bordirp1) || 0,
              P2: 0,
              P3: 0,
              P4: 0,
              P5: 0,
              P6: 0,
              P7: 0,
              P8: 0,

              L1: Number(d.Kalkulasi.Bordir.kald_bordirl1) || 0,
              L2: 0,
              L3: 0,
              L4: 0,
              L5: 0,
              L6: 0,
              L7: 0,
              L8: 0,
            },
            Dtf: {
              Cm: Number(d.Kalkulasi.Dtf.kald_cmdtf) || 0,

              P1: Number(d.Kalkulasi.Dtf.kald_dtfp1) || 0,
              P2: 0,
              P3: 0,
              P4: 0,
              P5: 0,
              P6: 0,
              P7: 0,
              P8: 0,

              L1: Number(d.Kalkulasi.Dtf.kald_dtfl1) || 0,
              L2: 0,
              L3: 0,
              L4: 0,
              L5: 0,
              L6: 0,
              L7: 0,
              L8: 0,
            },
            RpAllowance: Number(d.Kalkulasi.Header.kal_rpallowance) || 0,
            PersenAllowance: Number(d.Kalkulasi.Header.kal_allowance) || 0,
            RpLaba: Number(d.Kalkulasi.Header.kal_rplaba) || 0,
            PersenLaba: Number(d.Kalkulasi.Header.kal_laba) || 0,
            HargaSesuai: Number(d.Kalkulasi.Header.kal_rpsesuai) || 0,
          }
        : initialData.Kalkulasi,
    };
  },
  submitApi: async (dataToSave: MintaHargaForm): Promise<unknown> => {
    return await api.post("/penjualan/minta-harga-form/save", {
      isNewMode: !isEditMode.value,
      data: dataToSave,
    });
  },
  onSuccess: async (response: any) => {
    const nomor = response.data?.nomor;
    if (selectedImageFile.value && nomor) {
      try {
        const imgData = new FormData();
        imgData.append("image", selectedImageFile.value);
        await api.post(
          `/penjualan/minta-harga-form/upload-image/${nomor}`,
          imgData,
          {
            headers: { "Content-Type": "multipart/form-data" },
          },
        );
        toast.success("Data dan gambar berhasil disimpan!");
      } catch {
        toast.error("Data tersimpan, tapi gagal mengunggah gambar.");
      }
    } else {
      toast.success("Data berhasil disimpan!");
    }
  },
  onSuccessRoute: "/penjualan/minta-harga",
});

onMounted(() => {
  if (isEditMode.value) fetchData();
});

const currentTab = ref(0);
const tabs = [
  { text: "1. Price Request", icon: IconCash },
  { text: "2. Get Price (Kalkulasi)", icon: IconCalculator },
];

const handleImageSelected = (file: File) => {
  selectedImageFile.value = file;
};
</script>

<template>
  <BaseForm
    :title="isEditMode ? 'Ubah Permintaan Harga' : 'Tambah Permintaan Harga'"
    menu-id="166"
    :icon="IconCash"
    :is-loading="isLoading"
    :is-saving="isSaving"
    item-name="Permintaan Harga"
    v-model:show-save-dialog="showSaveDialog"
    v-model:show-cancel-dialog="showCancelDialog"
    v-model:show-close-dialog="showCloseDialog"
    @validate-save="showSaveDialog = true"
    @confirm-save="executeSave"
    @confirm-cancel="executeCancel"
    @confirm-close="executeClose"
  >
    <div class="mh-container">
      <div class="mh-tab-nav">
        <button
          v-for="(tab, idx) in tabs"
          :key="idx"
          class="mh-tab-btn"
          :class="{ active: currentTab === idx }"
          @click="currentTab = idx"
        >
          <component :is="tab.icon" :size="13" class="mr-1" />
          {{ tab.text }}
        </button>
      </div>
      <div class="mh-tab-body">
        <div v-show="currentTab === 0" class="mh-tab-pane">
          <TabPermintaan
            :form-data="formData"
            :is-edit="isEditMode"
            @image-selected="handleImageSelected"
          />
        </div>
        <div v-show="currentTab === 1" class="mh-tab-pane">
          <TabKalkulasi :form-data="formData" :is-edit="isEditMode" />
        </div>
      </div>
    </div>
  </BaseForm>
</template>

<style scoped>
.mh-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
}
.mh-tab-nav {
  display: flex;
  align-items: center;
  gap: 2px;
  padding: 6px 10px 0;
  background: #fafafa;
  border-bottom: 2px solid #e0e0e0;
  flex-shrink: 0;
}
.mh-tab-btn {
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
.mh-tab-btn:hover {
  color: #1565c0;
  background: #e3f2fd;
}
.mh-tab-btn.active {
  color: #1565c0;
  background: white;
  border-color: #e0e0e0;
  border-bottom-color: white;
}
.mh-tab-body {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  min-height: 0;
  background: #f4f5f7;
}
.mh-tab-pane {
  padding: 10px;
}
</style>
