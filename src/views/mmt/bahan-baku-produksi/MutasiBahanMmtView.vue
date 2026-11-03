<script setup lang="ts">
import { ref, computed } from "vue";
import { useRouter } from "vue-router";
import { useToast } from "vue-toastification";
import BaseBrowse from "@/components/BaseBrowse.vue";
import { useBrowse } from "@/composables/useBrowse";
import { IconArrowsExchange, IconPrinter } from "@tabler/icons-vue";
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
  { title: "Nomor Mutasi", key: "Nomor", width: "160px" },
  { title: "Tanggal", key: "Tanggal", width: "120px", align: "center" as const },
  { title: "Gudang Asal", key: "Asal", width: "130px", align: "center" as const },
  { title: "Gudang Tujuan", key: "Tujuan", width: "130px", align: "center" as const },
  { title: "Status", key: "Status", width: "110px", align: "center" as const },
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
  menuId: "5534",
  fetchApi: async () => {
    const res = await api.get("/mmt/bahan-baku-produksi/mutasi-bahan", {
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
  router.push("/mmt/bahan-baku-produksi/mutasi-bahan-mmt/create");
};

const handleEdit = (item: any) => {
  const target = item || selected.value[0];
  const nomor = getItemNomor(target);
  if (!nomor) return;
  router.push(
    `/mmt/bahan-baku-produksi/mutasi-bahan-mmt/edit/${encodeURIComponent(nomor)}`
  );
};

const handleDelete = async (item: any) => {
  const target = item || selected.value[0];
  const nomor = getItemNomor(target);
  if (!nomor) return;

  if (!confirm(`Hapus data mutasi bahan nomor ${nomor}?`)) return;
  try {
    await api.delete(
      `/mmt/bahan-baku-produksi/mutasi-bahan/${encodeURIComponent(nomor)}`
    );
    toast.success("Mutasi bahan berhasil dihapus.");
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
    `/mmt/bahan-baku-produksi/mutasi-bahan-mmt/print/${encodeURIComponent(nomor)}`
  );
};
</script>

<template>
  <BaseBrowse
    title="Mutasi Bahan MMT"
    menu-id="5534"
    item-value="Nomor"
    :icon="IconArrowsExchange"
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
    @export="exportToExcel('Mutasi_Bahan_MMT')"
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
