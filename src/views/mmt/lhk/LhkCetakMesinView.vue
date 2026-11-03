<script setup lang="ts">
import { ref } from "vue";
import { useRouter } from "vue-router";
import { useToast } from "vue-toastification";
import BaseBrowse from "@/components/BaseBrowse.vue";
import { useBrowse } from "@/composables/useBrowse";
import { IconPrinter } from "@tabler/icons-vue";
import api from "@/services/api";
import { formatTanggal } from "@/utils/dateFormat";

const router = useRouter();
const toast = useToast();

const getStartOfMonth = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
};
const getToday = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const startDate = ref(getStartOfMonth());
const endDate = ref(getToday());

const headers = [
  { title: "Nomor", key: "Nomor", width: "170px" },
  { title: "Status", key: "Status", width: "90px", align: "center" },
  { title: "Shift", key: "Shift", width: "70px", align: "center" },
  { title: "Tanggal", key: "Tanggal", width: "110px", align: "center" },
  { title: "Mesin", key: "Mesin", width: "100px" },
  { title: "Nomor SPK", key: "NomorSPK", width: "140px" },
  { title: "Nama SPK", key: "NamaOrder", minWidth: "180px" },
  { title: "Panjang", key: "spk_panjang", width: "90px", align: "end" },
  { title: "Lebar", key: "spk_lebar", width: "90px", align: "end" },
  { title: "Jml Order", key: "JumlahOrder", width: "90px", align: "end" },
  { title: "Jml Cetak", key: "TotalCetak", width: "90px", align: "end" },
  { title: "Bahan Awal", key: "PanjangBahanAwal", width: "100px", align: "end" },
  { title: "Sisa", key: "SisaMeterAkhir", width: "80px", align: "end" },
  { title: "Status Bahan", key: "status_bahan", width: "120px", align: "center" },
  { title: "Bahan", key: "Kode_bahan", width: "100px" },
  { title: "Nama Bahan", key: "nama_Bahan", minWidth: "160px" },
  { title: "Operator", key: "Operator", width: "110px" },
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
  menuId: "5507",
  fetchApi: async (): Promise<any[]> => {
    const res = await api.get("/mmt/lhk/mesin-cetak", {
      params: {
        startDate: startDate.value,
        endDate: endDate.value,
      },
    });
    const data = Array.isArray(res.data) ? res.data : (res.data?.data ?? []);
    return data ?? [];
  },
});

const handleNew = () => {
  router.push("/mmt/lhk/mesin-cetak/create");
};

const handleEdit = (item: any) => {
  const nomor = item?.Nomor || selected.value[0]?.Nomor;
  if (!nomor) return;
  router.push(`/mmt/lhk/mesin-cetak/edit/${encodeURIComponent(nomor)}`);
};

const handleDelete = async (item: any) => {
  const nomor = item?.Nomor || selected.value[0]?.Nomor;
  if (!nomor) return;
  if (!confirm(`Hapus data LHK Cetak Mesin nomor ${nomor}?`)) return;
  try {
    await api.delete(`/mmt/lhk/mesin-cetak/${encodeURIComponent(nomor)}`);
    toast.success(`LHK Cetak Mesin ${nomor} berhasil dihapus.`);
    fetchData();
  } catch (err: any) {
    toast.error(err.response?.data?.message || "Gagal menghapus data LHK.");
  }
};

const handlePrint = (item: any) => {
  const nomor = item?.Nomor || selected.value[0]?.Nomor;
  if (!nomor) return;
  router.push(`/mmt/lhk/mesin-cetak/print/${encodeURIComponent(nomor)}`);
};
</script>

<template>
  <BaseBrowse
    title="LHK Cetak (Mesin)"
    menu-id="5507"
    item-value="Nomor"
    :icon="IconPrinter"
    :headers="headers"
    :items="items || []"
    :is-loading="isLoading"
    v-model:selected="selected"
    :can-insert="canInsert"
    :can-edit="canEdit"
    :can-delete="canDelete"
    :can-export="canExport"
    @refresh="fetchData"
    @add="handleNew"
    @edit="handleEdit"
    @delete="handleDelete"
    @export="exportToExcel('LHK_Cetak_Mesin')"
  >
    <!-- Filter Periode Tanggal -->
    <template #filter-left>
      <div class="filter-group">
        <span class="filter-label">Periode</span>
        <input
          type="date"
          v-model="startDate"
          class="date-inp"
          @change="fetchData"
        />
        <span class="filter-sep">s/d</span>
        <input
          type="date"
          v-model="endDate"
          class="date-inp"
          @change="fetchData"
        />
      </div>
    </template>

    <!-- Tombol Cetak Dokumen -->
    <template #extra-actions="{ selected }">
      <v-btn
        size="small"
        color="info"
        variant="elevated"
        :disabled="selected.length !== 1"
        @click="handlePrint(selected[0])"
      >
        <IconPrinter :size="15" class="mr-1" /> Cetak LHK
      </v-btn>
    </template>

    <!-- Custom Render Kolom -->
    <template #item.Tanggal="{ item }">
      {{ formatTanggal((item.raw || item).Tanggal) }}
    </template>

    <template #item.Status="{ item }">
      <v-chip
        size="x-small"
        :color="(item.raw || item).Status === 'POSTED' ? 'success' : 'warning'"
        class="font-weight-bold"
      >
        {{ (item.raw || item).Status || "DRAFT" }}
      </v-chip>
    </template>

    <template #item.status_bahan="{ item }">
      <span
        v-if="Number((item.raw || item).SisaMeterAkhir || 0) < 0"
        class="text-green-darken-2 font-weight-bold text-caption"
      >
        SURPLUS {{ Math.abs(Number((item.raw || item).SisaMeterAkhir)).toFixed(1) }}m
      </span>
      <span
        v-else-if="Number((item.raw || item).SisaMeterAkhir || 0) > 0"
        class="text-orange-darken-3 font-weight-bold text-caption"
      >
        SISA {{ Number((item.raw || item).SisaMeterAkhir).toFixed(1) }}m
      </span>
      <span v-else class="text-grey-darken-1 text-caption">PAS</span>
    </template>
  </BaseBrowse>
</template>

<style scoped>
.filter-group {
  display: flex;
  align-items: center;
  gap: 4px;
}
.filter-label {
  font-size: 11px;
  font-weight: 600;
  color: #555;
  margin-right: 2px;
}
.filter-sep {
  font-size: 11px;
  color: #777;
}
.date-inp {
  height: 26px;
  border: 1px solid #ccc;
  border-radius: 4px;
  padding: 0 4px;
  font-size: 11px;
  background: white;
  color: #212121;
}
</style>
