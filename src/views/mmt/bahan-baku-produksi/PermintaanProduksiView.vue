<script setup lang="ts">
import { ref, computed } from "vue";
import { useRouter } from "vue-router";
import { useToast } from "vue-toastification";
import BaseBrowse from "@/components/BaseBrowse.vue";
import { useBrowse } from "@/composables/useBrowse";
import { IconBuildingFactory2, IconPrinter } from "@tabler/icons-vue";
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
  { title: "Nomor", key: "Nomor", width: "160px" },
  { title: "Tanggal", key: "Tanggal", width: "120px", align: "center" as const },
  { title: "Gudang", key: "Gudang", width: "110px", align: "center" as const },
  { title: "Lokasi", key: "Lokasi", width: "100px", align: "center" as const },
  { title: "Tipe", key: "Tipe", width: "100px", align: "center" as const },
  { title: "Status", key: "Status", width: "100px", align: "center" as const },
  { title: "Keterangan", key: "Keterangan", minWidth: "220px" },
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
  menuId: "5536",
  fetchApi: async () => {
    const res = await api.get("/mmt/bahan-baku-produksi/permintaan-produksi", {
      params: { startDate: startDate.value, endDate: endDate.value },
    });
    return Array.isArray(res.data) ? res.data : (res.data?.data || []);
  },
});

const getItemNomor = (item: any): string => {
  if (!item) return "";
  if (typeof item === "string") return item;
  const raw = item.raw || item;
  return raw.Nomor || raw.nomor || "";
};

const selectedItem = computed(() => {
  if (!selected.value || selected.value.length !== 1) return null;
  return selected.value[0]?.raw || selected.value[0];
});

const handleNew = () => {
  router.push("/mmt/bahan-baku-produksi/permintaan-produksi/create");
};

const handleEdit = (item: any) => {
  const target = item || selected.value[0];
  const nomor = getItemNomor(target);
  if (!nomor) return;
  router.push(
    `/mmt/bahan-baku-produksi/permintaan-produksi/edit/${encodeURIComponent(nomor)}`
  );
};

const handleDelete = async (item: any) => {
  const target = item || selected.value[0];
  const nomor = getItemNomor(target);
  if (!nomor) return;

  if (!confirm(`Hapus data permintaan produksi nomor ${nomor}?`)) return;
  try {
    await api.delete(
      `/mmt/bahan-baku-produksi/permintaan-produksi/${encodeURIComponent(nomor)}`
    );
    toast.success("Permintaan produksi berhasil dihapus.");
    fetchData();
  } catch (err: any) {
    toast.error(err.response?.data?.message || "Gagal menghapus data.");
  }
};

const handlePrint = (item?: any) => {
  const target = item || selected.value[0];
  const nomor = getItemNomor(target);
  if (!nomor) return;
  router.push(
    `/mmt/bahan-baku-produksi/permintaan-produksi/print/${encodeURIComponent(nomor)}`
  );
};
</script>

<template>
  <BaseBrowse
    title="Permintaan Produksi"
    menu-id="5536"
    item-value="Nomor"
    :icon="IconBuildingFactory2"
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
    @export="exportToExcel('Permintaan_Produksi')"
  >
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
        <v-btn
          size="small"
          color="secondary"
          variant="tonal"
          class="ml-2 text-none"
          :disabled="!selectedItem"
          @click="handlePrint()"
        >
          <v-icon :icon="IconPrinter" size="16" class="mr-1" />
          Cetak
        </v-btn>
      </div>
    </template>
  
    <template #item.Tanggal="{ item }">
      {{ formatTanggal((item.raw || item).Tanggal) }}
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
