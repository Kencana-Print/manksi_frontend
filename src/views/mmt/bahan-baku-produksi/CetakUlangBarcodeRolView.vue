<script setup lang="ts">
import { ref, computed } from "vue";
import { useRouter } from "vue-router";
import BaseBrowse from "@/components/BaseBrowse.vue";
import { useBrowse } from "@/composables/useBrowse";
import { IconBarcode, IconListDetails } from "@tabler/icons-vue";
import api from "@/services/api";
import { formatTanggal } from "@/utils/dateFormat";

const router = useRouter();
const showDetailDialog = ref(false);

const headers = [
  { title: "No Referensi", key: "mst_noreferensi", width: "180px" },
  { title: "Tanggal", key: "mst_tanggal", width: "130px", align: "center" as const },
  { title: "Gudang", key: "mst_gdg_kode", width: "100px", align: "center" as const },
  { title: "Total Rol Barcode", key: "total_qty", width: "140px", align: "end" as const },
];

const {
  items,
  isLoading,
  selected,
  canInsert,
  canExport,
  fetchData,
  exportToExcel,
} = useBrowse<any>({
  menuId: "5541",
  fetchApi: async () => {
    const res = await api.get("/mmt/bahan-baku-produksi/barcode/create/history");
    return Array.isArray(res.data) ? res.data : (res.data?.data || []);
  },
});

const selectedItem = computed(() => {
  if (!selected.value || selected.value.length !== 1) return null;
  return selected.value[0]?.raw || selected.value[0];
});

const handleNew = () => {
  router.push("/mmt/bahan-baku-produksi/cetak-ulang-barcode-rol/create");
};

const openDetails = () => {
  if (!selectedItem.value) return;
  showDetailDialog.value = true;
};
</script>

<template>
  <BaseBrowse
    title="Cetak Ulang Barcode Rol"
    menu-id="5541"
    item-value="mst_noreferensi"
    :icon="IconBarcode"
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
    @export="exportToExcel('Riwayat_Cetak_Barcode_Rol')"
  >
    <template #filter-left>
      <v-btn
        size="small"
        color="primary"
        variant="tonal"
        class="text-none"
        :disabled="!selectedItem"
        @click="openDetails"
      >
        <v-icon :icon="IconListDetails" size="16" class="mr-1" />
        Lihat Daftar Barcode
      </v-btn>
    </template>
  
    <template #item.mst_tanggal="{ item }">
      {{ formatTanggal((item.raw || item).mst_tanggal) }}
    </template>
  </BaseBrowse>

  <!-- Dialog Daftar Barcode per No Referensi -->
  <v-dialog v-model="showDetailDialog" max-width="850">
    <v-card class="pa-4">
      <div class="d-flex justify-space-between align-center mb-3">
        <div class="d-flex align-center">
          <v-icon :icon="IconBarcode" size="24" class="mr-2 text-primary" />
          <h3 class="text-subtitle-1 font-weight-bold mb-0">
            Daftar Barcode: {{ selectedItem?.mst_noreferensi }}
          </h3>
        </div>
        <v-btn icon variant="text" size="small" @click="showDetailDialog = false">
          ✕
        </v-btn>
      </div>

      <v-table density="compact" class="border rounded">
        <thead>
          <tr>
            <th style="width: 50px" class="text-center">No</th>
            <th style="width: 170px">Barcode</th>
            <th style="width: 120px">Kode Bahan</th>
            <th>Nama Bahan</th>
            <th style="width: 90px" class="text-end">Panjang</th>
            <th style="width: 90px" class="text-end">Lebar</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(b, idx) in selectedItem?.details || []" :key="idx">
            <td class="text-center">{{ idx + 1 }}</td>
            <td class="font-weight-medium">{{ b.mst_barcode }}</td>
            <td>{{ b.mst_brg_kode }}</td>
            <td>{{ b.nama_asli || '-' }}</td>
            <td class="text-end">{{ b.mst_panjang }} m</td>
            <td class="text-end">{{ b.mst_lebar }} m</td>
          </tr>
          <tr v-if="!selectedItem?.details?.length">
            <td colspan="6" class="text-center py-4 text-grey">Tidak ada detail barcode.</td>
          </tr>
        </tbody>
      </v-table>
    </v-card>
  </v-dialog>
</template>
