<script setup lang="ts">
import { ref, computed } from "vue";
import { useAuthStore } from "@/stores/authStore";
import api from "@/services/api";
import { useBrowse } from "@/composables/useBrowse";
import { useToast } from "vue-toastification";
import BaseBrowse from "@/components/BaseBrowse.vue";
import SupplierFormDialog from "@/components/dialogs/SupplierFormDialog.vue";
import { IconTruck } from "@tabler/icons-vue";

const toast = useToast();

const authStore = useAuthStore();

// Harus sama dengan BAGIAN_LIHAT_REKENING di backend (backend yang menentukan
// data terkirim atau tidak; ini hanya mengatur tampilan kolom).
const BAGIAN_LIHAT_REKENING = ["PEMBELIAN", "FINANCE", "EDP", "DIR", "AUDIT"];
const canLihatRekening = computed(() =>
  BAGIAN_LIHAT_REKENING.includes((authStore.user?.bagian || "").toUpperCase()),
);

// ID 12 untuk Master Supplier
const {
  items,
  isLoading,
  canInsert,
  canEdit,
  canExport,
  selected,
  fetchData,
  exportToExcel,
} = useBrowse({
  menuId: "12",
  fetchApi: async () => {
    const res = await api.get("/master/supplier");
    return res.data.data;
  },
});

const headers = computed(() => [
  { title: "KODE", key: "Kode", width: "100px" },
  { title: "NAMA", key: "Nama", minWidth: "200px" },
  { title: "ALAMAT", key: "Alamat", minWidth: "250px" },
  { title: "KOTA", key: "Kota", width: "120px" },
  ...(canLihatRekening.value
    ? [
        { title: "BANK", key: "Bank", width: "130px" },
        { title: "ATAS NAMA", key: "AtasNama", minWidth: "180px" },
        { title: "REKENING", key: "Rekening", width: "160px" },
      ]
    : []),
  { title: "TELP", key: "Telp", width: "120px" },
  { title: "FAX", key: "Fax", width: "120px" },
  { title: "CONTACT", key: "Contact", width: "120px" },
  { title: "HP", key: "HP", width: "120px" },
  { title: "TARGET MITRA", key: "TargetMitra", width: "120px", align: "right" },
  { title: "KETERANGAN", key: "Keterangan", minWidth: "200px" },
  { title: "AKTIF", key: "Aktif", width: "80px", align: "center" },
  { title: "USER CREATE", key: "Usr", width: "110px" },
  { title: "DATE CREATE", key: "Created", width: "150px" },
]);

// Pewarnaan jika Aktif = 'N' / Pasif
const rowPropsFn = (data: any) => {
  const item = data.item?.raw || data.item;
  if (item.Aktif === "N") return { class: "text-red font-weight-bold" };
  return {};
};

const showDialog = ref(false);
const isNewMode = ref(true);
const editData = ref(null);

const handleAdd = () => {
  isNewMode.value = true;
  editData.value = null;
  showDialog.value = true;
};

const handleEdit = async (item: any) => {
  try {
    isNewMode.value = false;
    // Panggil API getById untuk mengambil data Rekening Bank yang ada di tabel detail
    const res = await api.get(`/master/supplier/${item.Kode}`);
    editData.value = res.data.data;
    showDialog.value = true;
  } catch (error) {
    toast.error("Gagal memuat detail supplier");
  }
};

// Tanpa columns, export mengambil semua key (termasuk RowId). Pakai headers
// supaya kolom Excel sama dengan yang tampil.
const onExport = () =>
  exportToExcel("Data_Master_Supplier", {
    columns: headers.value.map((h) => ({ header: h.title, key: h.key })),
  });
</script>

<template>
  <BaseBrowse
    title="Master Supplier"
    menu-id="12"
    :icon="IconTruck"
    :headers="headers"
    :items="items ?? []"
    :is-loading="isLoading"
    v-model:selected="selected"
    :can-insert="canInsert"
    :can-edit="canEdit"
    :can-delete="false"
    :can-export="canExport"
    :row-props-fn="rowPropsFn"
    item-value="RowId"
    @refresh="fetchData"
    @add="handleAdd"
    @edit="handleEdit"
    @export="onExport"
  >
    <template #filter-right>
      <div class="d-flex align-center bg-white pa-1 px-3 rounded border mr-2">
        <div class="d-flex align-center">
          <div
            class="legend-box bg-red mr-1"
            style="width: 14px; height: 14px; border-radius: 2px"
          ></div>
          <span class="text-caption font-weight-bold text-red">Pasif</span>
        </div>
      </div>
    </template>
  </BaseBrowse>

  <SupplierFormDialog
    v-model="showDialog"
    :is-new-mode="isNewMode"
    :edit-data="editData"
    @saved="fetchData"
  />
</template>
