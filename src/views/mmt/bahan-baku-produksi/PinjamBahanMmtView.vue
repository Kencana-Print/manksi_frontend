<script setup lang="ts">
import { ref, computed } from "vue";
import { useRouter } from "vue-router";
import { useToast } from "vue-toastification";
import BaseBrowse from "@/components/BaseBrowse.vue";
import { useBrowse } from "@/composables/useBrowse";
import { IconArrowsExchange, IconCheck } from "@tabler/icons-vue";
import api from "@/services/api";
import { formatTanggal } from "@/utils/dateFormat";

const router = useRouter();
const toast = useToast();
const isApproving = ref(false);

const headers = [
  { title: "ID", key: "id", width: "80px", align: "center" as const },
  { title: "Barcode", key: "barcode", width: "150px" },
  { title: "Nama Bahan", key: "nama_bahan", minWidth: "200px" },
  { title: "Operator", key: "operator", width: "130px" },
  { title: "No SPK", key: "nomor_spk", width: "140px", align: "center" as const },
  { title: "Panjang", key: "panjang", width: "100px", align: "end" as const },
  { title: "Lebar", key: "lebar", width: "100px", align: "end" as const },
  { title: "Status", key: "status", width: "110px", align: "center" as const },
  { title: "Tgl Permintaan", key: "tgl_permintaan", width: "130px", align: "center" as const },
];

const {
  items,
  isLoading,
  selected,
  canInsert,
  canEdit,
  canDelete,
  canExport,
  fetchData,
  exportToExcel,
} = useBrowse<any>({
  menuId: "5538",
  fetchApi: async () => {
    const res = await api.get("/mmt/bahan-baku-produksi/pinjam");
    return Array.isArray(res.data) ? res.data : (res.data?.data || []);
  },
});

const selectedItem = computed(() => {
  if (!selected.value || selected.value.length !== 1) return null;
  return selected.value[0]?.raw || selected.value[0];
});

const handleNew = () => {
  router.push("/mmt/bahan-baku-produksi/pinjam-bahan-mmt/create");
};

const handleApprove = async () => {
  const item = selectedItem.value;
  if (!item || !item.barcode) return;

  if (!confirm(`Setujui peminjaman bahan barcode ${item.barcode}?`)) return;
  isApproving.value = true;
  try {
    await api.post("/mmt/bahan-baku-produksi/pinjam/approve-pinjam", {
      barcode: item.barcode,
      nomor_permintaan: item.nomor_spk,
    });
    toast.success(`Barcode ${item.barcode} berhasil di-approve!`);
    fetchData();
  } catch (err: any) {
    toast.error(err.response?.data?.message || "Gagal approve pinjaman.");
  } finally {
    isApproving.value = false;
  }
};
</script>

<template>
  <BaseBrowse
    title="Pinjam Bahan MMT"
    menu-id="5538"
    item-value="id"
    :icon="IconArrowsExchange"
    :headers="headers"
    :items="items || []"
    :is-loading="isLoading"
    v-model:selected="selected"
    :can-insert="canInsert"
    :can-edit="false"
    :can-delete="false"
    :can-export="canExport"
    @refresh="fetchData"
    @add="handleNew"
    @export="exportToExcel('Pinjam_Bahan_MMT')"
  >
    <template #filter-left>
      <v-btn
        size="small"
        color="success"
        variant="tonal"
        class="text-none"
        :disabled="!selectedItem || selectedItem.status !== 'PENDING'"
        :loading="isApproving"
        @click="handleApprove"
      >
        <v-icon :icon="IconCheck" size="16" class="mr-1" />
        Setujui Peminjaman (Approve)
      </v-btn>
    </template>
  
    <template #item.tgl_permintaan="{ item }">
      {{ formatTanggal((item.raw || item).tgl_permintaan) }}
    </template>
  </BaseBrowse>
</template>
