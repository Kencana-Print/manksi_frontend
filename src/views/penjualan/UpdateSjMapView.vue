<script setup lang="ts">
import { ref } from "vue";
import { useRouter } from "vue-router";
import { useToast } from "vue-toastification";
import BaseBrowse from "@/components/BaseBrowse.vue";
import { useBrowse } from "@/composables/useBrowse";
import { updateSjMapService } from "@/services/penjualan/updateSjMapService";
import UpdateSjMapFormDialog from "@/components/dialogs/UpdateSjMapFormDialog.vue";
import { IconTruckDelivery, IconEdit } from "@tabler/icons-vue";

const router = useRouter();
const toast = useToast();

const today = new Date();
const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
const formatDate = (d: Date) => d.toISOString().substring(0, 10);
const showDialog = ref(false);
const selectedNomor = ref("");

const filterState = ref({
  startDate: formatDate(firstDay),
  endDate: formatDate(today),
});

const {
  items,
  isLoading,
  selected,
  fetchData,
  canEdit,
  canExport,
  exportToExcel,
} = useBrowse({
  menuId: "164",
  fetchApi: async () => {
    const res = await updateSjMapService.getBrowseData(
      filterState.value.startDate,
      filterState.value.endDate,
    );
    return res.data.data;
  },
});

const headers = [
  { title: "Nomor", key: "Nomor", width: "160px" },
  { title: "Tanggal", key: "Tanggal", width: "100px" },
  { title: "Status", key: "Status", width: "150px" },
  { title: "Customer", key: "Customer", width: "220px" },
  { title: "Alamat", key: "Alamat", width: "250px" },
  { title: "Kota", key: "Kota", width: "120px" },
  { title: "Divisi", key: "Divisi", width: "100px" },
  { title: "Ekspedisi", key: "Expedisi", width: "120px" },
  { title: "Kurir", key: "Kurir", width: "120px" },
  { title: "No. Resi", key: "Nomor_resi", width: "150px" },
  { title: "Biaya Kirim", key: "Biaya_Kirim", width: "110px", align: "end" },
  { title: "Tgl Kirim", key: "Tanggal_kirim", width: "100px" },
  { title: "Tgl Kembali", key: "Tanggal_kembali", width: "100px" },
  { title: "Penerima Barang", key: "Penerima_barang", width: "150px" },
  { title: "Tgl Terima SJ", key: "Tanggal_terima_sj", width: "110px" },
  { title: "Contact Person", key: "Contact_person", width: "150px" },
  { title: "Tgl Konf.", key: "Tanggal_konfirmasi", width: "100px" },
  { title: "Tgl Terima", key: "Tanggal_terima", width: "100px" },
  { title: "Tgl Serah Terima", key: "Tanggal_serahterima", width: "130px" },
];

// Helper untuk format Rupiah
const formatRupiah = (val: number) =>
  new Intl.NumberFormat("id-ID").format(val || 0);

// Pewarnaan teks baris sesuai instruksi Saved Info & Referensi Delphi
const handleRowProps = (data: any) => {
  const row = data.item?.raw || data.item;
  // Sesuai logic Delphi: Status 'Tidak Ada Status' -> Warna Biru
  if (row.Status === "Tidak Ada Status") {
    return {
      // Gunakan style untuk warna teks sesuai Saved Info
      style: "color: #2196F3 !important; font-weight: bold;",
    };
  }
  return {};
};

const onUpdateStatus = () => {
  if (selected.value.length === 0) {
    return toast.warning("Pilih data terlebih dahulu");
  }
  // Ambil Nomor dari baris yang dipilih (Pastikan "Nomor" huruf N besar sesuai key di headers)
  selectedNomor.value = selected.value[0].Nomor;
  showDialog.value = true;
};
</script>

<template>
  <BaseBrowse
    title="Update Status Surat Jalan Memo"
    menu-id="164"
    :icon="IconTruckDelivery"
    :headers="headers"
    :items="items ?? []"
    :is-loading="isLoading"
    item-value="Nomor"
    :can-edit="false"
    :can-export="canExport"
    v-model:selected="selected"
    v-model:filter-state="filterState"
    :row-props-fn="handleRowProps"
    @refresh="fetchData"
    @export="exportToExcel('Update_Status_SJ_MAP')"
  >
    <template #filter-left>
      <div
        class="d-flex align-center gap-2 mr-4 bg-white px-2 py-1 border rounded"
      >
        <input
          type="date"
          v-model="filterState.startDate"
          class="date-inp"
          @change="fetchData"
        />
        <span class="text-caption">s.d</span>
        <input
          type="date"
          v-model="filterState.endDate"
          class="date-inp"
          @change="fetchData"
        />
      </div>
    </template>

    <template #extra-actions="{ selected }">
      <v-btn
        size="small"
        color="orange-darken-2"
        :disabled="selected.length === 0"
        @click="onUpdateStatus"
      >
        <template #prepend
          ><IconEdit :size="15" :stroke-width="1.7"
        /></template>
        Update Status
      </v-btn>
    </template>

    <template #filter-right>
      <div class="d-flex align-center gap-2 text-caption ml-4">
        <div class="dot bg-blue"></div>
        <span class="text-blue font-weight-bold">Tidak Ada Status</span>
      </div>
    </template>

    <template #item.Tanggal="{ item }">
      {{ item.Tanggal ? item.Tanggal.substring(0, 10) : "" }}
    </template>
    <template #item.Tanggal_kirim="{ item }">
      {{ item.Tanggal_kirim ? item.Tanggal_kirim.substring(0, 10) : "-" }}
    </template>
    <template #item.Tanggal_terima="{ item }">
      {{ item.Tanggal_terima ? item.Tanggal_terima.substring(0, 10) : "-" }}
    </template>
    <template #item.Biaya_Kirim="{ item }">
      {{ formatRupiah(item.Biaya_Kirim) }}
    </template>

    <template #item.Tanggal_kembali="{ item }">
      {{ item.Tanggal_kembali ? item.Tanggal_kembali.substring(0, 10) : "-" }}
    </template>
    <template #item.Tanggal_terima_sj="{ item }">
      {{
        item.Tanggal_terima_sj ? item.Tanggal_terima_sj.substring(0, 10) : "-"
      }}
    </template>
    <template #item.Tanggal_konfirmasi="{ item }">
      {{
        item.Tanggal_konfirmasi ? item.Tanggal_konfirmasi.substring(0, 10) : "-"
      }}
    </template>
    <template #item.Tanggal_serahterima="{ item }">
      {{
        item.Tanggal_serahterima
          ? item.Tanggal_serahterima.substring(0, 10)
          : "-"
      }}
    </template>
  </BaseBrowse>

  <UpdateSjMapFormDialog
    v-model="showDialog"
    :nomor="selectedNomor"
    @refresh="fetchData"
  />
</template>

<style scoped>
.date-inp {
  border: none;
  outline: none;
  font-size: 12px;
  width: 110px;
}
.dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
}
.gap-2 {
  gap: 8px;
}
</style>
