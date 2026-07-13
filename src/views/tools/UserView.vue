<script setup lang="ts">
import { ref, computed } from "vue";
import { useRouter } from "vue-router";
import api from "@/services/api";
import { useBrowse } from "@/composables/useBrowse";
import { useToast } from "vue-toastification";
import { useAuthStore } from "@/stores/authStore";
import BaseBrowse from "@/components/BaseBrowse.vue";
import { IconUsers } from "@tabler/icons-vue";

const toast = useToast();
const router = useRouter();
const authStore = useAuthStore();

// Modul ini admin-only (dijaga di backend via requireAdmin), BUKAN via
// sistem permission thakuser/menuId — makanya menuId dikirim kosong ke
// useBrowse/BaseBrowse dan validasi akses sesungguhnya cukup mengandalkan
// backend + guard ringan berikut.
const isAdmin = computed(() => {
  const kode = authStore.user?.kode?.toUpperCase();
  return kode === "ADMIN" || kode === "DEVELOPER";
});

const { items, isLoading, selected, fetchData, exportToExcel } = useBrowse({
  menuId: "",
  fetchApi: async () => {
    const res = await api.get("/tools/users");
    return res.data.data;
  },
});

const headers = [
  { title: "KODE USER", key: "Kode", width: "150px" },
  { title: "NAMA USER", key: "Nama", minWidth: "300px" },
  { title: "CABANG", key: "Cabang", width: "100px", align: "center" },
  { title: "BAGIAN", key: "Bagian", width: "130px" },
  { title: "AKTIF", key: "Aktif", width: "120px", align: "center" },
];

const rowPropsFn = (data: any) => {
  const item = data.item?.raw || data.item;
  if (item.Aktif === "TIDAK") return { class: "text-red font-weight-bold" };
  return {};
};

const handleAdd = () => router.push({ name: "UserFormCreate" });
const handleEdit = (item: any) =>
  router.push({ name: "UserFormEdit", params: { kode: item.Kode } });
</script>

<template>
  <BaseBrowse
    title="Master User"
    menu-id=""
    :icon="IconUsers"
    :headers="headers"
    :items="items ?? []"
    :is-loading="isLoading"
    v-model:selected="selected"
    :can-insert="true"
    :can-edit="true"
    :can-delete="false"
    :can-export="true"
    :row-props-fn="rowPropsFn"
    item-value="Kode"
    @refresh="fetchData"
    @add="handleAdd"
    @edit="handleEdit"
    @export="exportToExcel('Data_Master_User')"
  >
    <template #item.Aktif="{ item }">
      <span
        class="status-chip"
        :class="item.Aktif === 'TIDAK' ? 'chip-red' : 'chip-green'"
      >
        {{ item.Aktif === "TIDAK" ? "PASIF" : "AKTIF" }}
      </span>
    </template>

    <template #filter-right>
      <div class="legend-box">
        <div class="legend-row">
          <span class="legend-title">Keterangan:</span>
          <div class="legend-item">
            <div class="legend-dot" style="background: #2e7d32"></div>
            Aktif
          </div>
          <div class="legend-item">
            <div class="legend-dot" style="background: #c62828"></div>
            User Pasif
          </div>
        </div>
      </div>
    </template>
  </BaseBrowse>
</template>

<style scoped>
.status-chip {
  display: inline-block;
  padding: 2px 10px;
  border-radius: 10px;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.03em;
}
.chip-green {
  background: #e8f5e9;
  color: #2e7d32;
}
.chip-red {
  background: #ffebee;
  color: #c62828;
}
.legend-box {
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  padding: 4px 8px;
  display: flex;
  flex-direction: column;
  gap: 3px;
}
.legend-row {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: nowrap;
}
.legend-title {
  font-size: 10px;
  font-weight: 700;
  color: #555;
  white-space: nowrap;
  flex-shrink: 0;
}
.legend-item {
  display: flex;
  align-items: center;
  gap: 3px;
  font-size: 10px;
  color: #424242;
  white-space: nowrap;
}
.legend-dot {
  width: 9px;
  height: 9px;
  border-radius: 2px;
  flex-shrink: 0;
}
</style>
