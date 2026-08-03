<script setup lang="ts">
import { ref, computed, onMounted, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useToast } from "vue-toastification";
import { useForm } from "@/composables/useForm";
import BaseForm from "@/components/BaseForm.vue";
import { spkFormService } from "@/services/ppic/spkFormService";
import { IconClipboardText } from "@tabler/icons-vue";

import SpkTabOrder from "./components/SpkTabOrder.vue";
import SpkTabKomponen from "./components/SpkTabKomponen.vue";
import SpkTabLayoutProses from "./components/SpkTabLayoutProses.vue";
import SpkTabKeterangan from "./components/SpkTabKeterangan.vue";
import SpkTabAlokasi from "./components/SpkTabAlokasi.vue";

const route = useRoute();
const router = useRouter();
const toast = useToast();
const activeTab = ref(0);

const isEditMode = computed(() => !!route.params.nomor);

const defaultData = {
  // Referensi SO (readonly, hasil copy dari SO saat create / dari tspk saat edit)
  so_nomor: "",
  so_nama: "",
  so_map: "",
  so_ket_ukuran: "",
  so_kain: "",
  so_finishing: "",
  so_jumlah: 0,
  so_cab: "",
  so_jo_kode: "",
  so_kepentingan: "",
  so_divisi: "",
  so_nomor_po: "",
  so_dateline: "",
  so_tipe: "",
  so_gramasi: "",
  so_panjang: 0,
  so_lebar: 0,
  so_warna_badan: "",
  so_warna_lengan: "",
  so_warna_lain: "",
  so_sablon: "N",
  so_bordir: "N",
  so_sublim: "N",
  so_cust_perfect: "N",

  // SPK header (yang benar-benar diisi/diubah form PPIC)
  spk_nomor: "",
  spk_tanggal: new Date().toISOString().substring(0, 10),
  spk_ketbeli: "",
  spk_keterangan: "",

  spk_cab: "",
  isPremiumFlow: true,

  Sizes: [] as any[],
  KomponenSpk: {
    ListPotong: [] as any[],
    ListCetakBordir: [] as any[],
  },
  KeteranganKhusus: [] as string[],
  KetKomponenList: [] as any[],
  Alokasi: [] as any[],
};

const {
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
} = useForm({
  menuId: "152",
  initialData: defaultData,

  // Mode EDIT: baca dari tspk milik SPK itu sendiri (sudah copy lengkap dari SO saat create)
  fetchApi: async () => {
    const nomor = String(route.params.nomor);
    const res = await spkFormService.getDetail(nomor);
    const h = res.data.data?.header || {};
    const d = res.data.data || {};

    const mapped = mapHeaderToFormData(h);

    // Kalau field SO tertentu kosong di row SPK (data lama sebelum field diisi),
    // ambil ulang dari SO sumber secara live
    if (
      mapped.so_nomor &&
      (!mapped.so_tipe || !mapped.so_kepentingan || !mapped.so_dateline)
    ) {
      try {
        const resSo = await spkFormService.getSoSource(mapped.so_nomor);
        const soH = resSo.data.data?.header || {};
        if (!mapped.so_tipe) mapped.so_tipe = soH.spk_tipe || "";
        if (!mapped.so_kepentingan)
          mapped.so_kepentingan = soH.spk_statuskerja || "";
        if (!mapped.so_dateline)
          mapped.so_dateline = soH.spk_dateline?.substring(0, 10) || "";
      } catch {
        // SO mungkin sudah tidak aktif/approved, biarkan kosong
      }
    }

    return {
      ...mapped,
      isPremiumFlow: d.isPremiumFlow ?? true,
      Sizes: d.dtlSize || [],
      KomponenSpk: d.komponenSpk || { ListPotong: [], ListCetakBordir: [] },
      KeteranganKhusus: d.keteranganKhusus || [],
      KetKomponenList: (d.ketKomponenList || []).map((k: any) => ({
        ...k,
        checked: k.checked === 1 || k.checked === true,
      })),
      Alokasi: d.alokasi || [],
    };
  },

  // Mode CREATE / EDIT: payload dipangkas, sesuai saveData backend baru
  submitApi: async (data: any) => {
    const payload: any = {
      isEdit: isEditMode.value,
      spk_ketbeli: data.spk_ketbeli,
      spk_keterangan: data.spk_keterangan,
      dtlSize: data.Sizes,
      komponenSpk: data.KomponenSpk,
      keteranganKhusus: data.KeteranganKhusus,
      ketKomponenList: data.KetKomponenList,
      alokasi: data.Alokasi,
    };

    if (isEditMode.value) {
      payload.spk_nomor = data.spk_nomor;
    } else {
      payload.so_nomor = data.so_nomor;
    }

    return spkFormService.save(payload);
  },

  onSuccess: () => {
    toast.success("SPK berhasil disimpan.");
    router.push("/ppic/spk");
  },
});

// --- Mapping kolom tspk -> field referensi SO di form (dipakai mode edit) ---
function mapHeaderToFormData(h: any) {
  return {
    spk_nomor: h.spk_nomor || "",
    spk_tanggal: h.spk_tanggal?.substring(0, 10) || "",
    spk_ketbeli: h.spk_ketbeli || "",
    spk_keterangan: h.spk_keterangan || "",

    so_nomor: h.spk_so_ref || "",
    so_nama: h.spk_nama || "",
    so_customer: h.cus_nama || "",
    so_cust_perfect: h.cus_perfect || "N",
    so_map: h.spk_memo || "",
    so_ket_ukuran: h.spk_ukuran || "",
    so_kain: h.spk_kain || "",
    so_finishing: h.spk_finishing || "",
    so_jumlah: Number(h.spk_jumlah) || 0,
    so_cab: h.spk_cab || "",
    so_jo_kode: h.spk_jo_kode || "",
    so_kepentingan: h.spk_statuskerja || "",
    so_divisi: h.spk_divisi || "",
    so_nomor_po: h.spk_nomor_po || "",
    so_dateline: h.spk_dateline?.substring(0, 10) || "",
    so_tipe: h.spk_tipe || "",
    spk_cab: h.spk_cab || "",
    so_gramasi: h.spk_gramasi || "",
    so_panjang: Number(h.spk_panjang) || 0,
    so_lebar: Number(h.spk_lebar) || 0,
    so_warna_badan: h.spk_warna_badan || "",
    so_warna_lengan: h.spk_warna_lengan || "",
    so_warna_lain: h.spk_warna_lain || "",
    so_sablon: h.spk_sablon || "N",
    so_bordir: h.spk_bordir || "N",
    so_sublim: h.spk_sublim || "N",
  };
}

// --- Mode CREATE: SpkTabOrder sudah memuat & mengisi formData sendiri
// lewat getSoSource saat user pilih SO. Handler ini cuma dengerin event
// untuk keperluan tab lain (misal reset komponen/keterangan saat ganti SO). ---
const handleSoLoaded = (soData: any) => {
  if (!isEditMode.value) {
    formData.value.spk_nomor = "";
    formData.value.spk_ketbeli = "";
    formData.value.KomponenSpk = { ListPotong: [], ListCetakBordir: [] };
    formData.value.KeteranganKhusus = [];

    formData.value.isPremiumFlow = soData?.isPremiumFlow ?? true;
    formData.value.spk_cab = soData?.header?.spk_cab || "";
    formData.value.Alokasi = soData?.soAlokasi || [];
  }
};

const validateSave = () => {
  if (!formData.value.so_nomor?.trim()) {
    toast.warning("Sales Order harus dipilih terlebih dahulu.");
    return;
  }
  showSaveDialog.value = true;
};

onMounted(async () => {
  if (isEditMode.value) await fetchData();
});

const tabs = computed(() => {
  if (formData.value.isPremiumFlow) {
    return [
      { key: "order", title: "Order" },
      { key: "komponen", title: "Komponen SPK" },
      { key: "layout", title: "Layout Proses" },
      { key: "keterangan", title: "Keterangan" },
    ];
  }
  return [
    { key: "order", title: "Order" },
    { key: "alokasi", title: "Alokasi" },
    { key: "keterangan", title: "Keterangan" },
  ];
});

// Reset activeTab kalau sedang di tab yang hilang setelah flow berubah
watch(tabs, (newTabs) => {
  if (activeTab.value >= newTabs.length) activeTab.value = 0;
});
</script>

<template>
  <BaseForm
    :title="isEditMode ? 'Ubah SPK' : 'Buat SPK (Surat Perintah Kerja)'"
    menu-id="152"
    :icon="IconClipboardText"
    :is-loading="isLoading"
    :is-saving="isSaving"
    item-name="SPK"
    v-model:show-save-dialog="showSaveDialog"
    v-model:show-cancel-dialog="showCancelDialog"
    v-model:show-close-dialog="showCloseDialog"
    @validate-save="validateSave"
    @confirm-save="executeSave"
    @confirm-cancel="executeCancel"
    @confirm-close="executeClose"
  >
    <div class="pf-container">
      <div class="pf-tab-nav">
        <button
          v-for="(tab, idx) in tabs"
          :key="idx"
          class="pf-tab-btn"
          :class="{ active: activeTab === idx }"
          @click="activeTab = idx"
        >
          {{ tab.title }}
        </button>
      </div>

      <div class="pf-tab-body">
        <div v-show="tabs[activeTab]?.key === 'order'" class="pf-tab-pane">
          <SpkTabOrder
            :form-data="formData"
            :is-edit="isEditMode"
            @so-loaded="handleSoLoaded"
          />
        </div>

        <!-- Tab premium only -->
        <template v-if="formData.isPremiumFlow">
          <div v-show="tabs[activeTab]?.key === 'komponen'" class="pf-tab-pane">
            <SpkTabKomponen :form-data="formData" :is-edit="isEditMode" />
          </div>
          <div v-show="tabs[activeTab]?.key === 'layout'" class="pf-tab-pane">
            <SpkTabLayoutProses :form-data="formData" :is-edit="isEditMode" />
          </div>
        </template>

        <!-- Tab legacy only -->
        <div
          v-if="!formData.isPremiumFlow"
          v-show="tabs[activeTab]?.key === 'alokasi'"
          class="pf-tab-pane"
        >
          <SpkTabAlokasi :form-data="formData" />
        </div>

        <!-- Keterangan — tersedia di KEDUA flow -->
        <div v-show="tabs[activeTab]?.key === 'keterangan'" class="pf-tab-pane">
          <SpkTabKeterangan
            :form-data="formData"
            :is-edit="isEditMode"
            :is-premium-flow="formData.isPremiumFlow"
          />
        </div>
      </div>
    </div>
  </BaseForm>
</template>

<style scoped>
.pf-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #f4f5f7;
}
.pf-tab-nav {
  display: flex;
  background: #e0e0e0;
  border-bottom: 2px solid #bdbdbd;
  padding: 4px 8px 0;
}
.pf-tab-btn {
  padding: 6px 16px;
  font-size: 12px;
  font-weight: 600;
  color: #555;
  background: #eeeeee;
  border: 1px solid #ccc;
  border-bottom: none;
  border-radius: 4px 4px 0 0;
  cursor: pointer;
  margin-right: 4px;
}
.pf-tab-btn.active {
  background: white;
  color: #1565c0;
  border-color: #bdbdbd;
  border-bottom: 2px solid white;
  margin-bottom: -2px;
}
.pf-tab-body {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
.pf-tab-pane {
  padding: 8px;
  overflow-y: auto;
  flex: 1;
  display: flex;
  flex-direction: column;
}
</style>
