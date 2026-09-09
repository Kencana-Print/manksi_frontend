<script setup lang="ts">
import { ref, watch, onMounted } from "vue";
import BaseBrowse from "@/components/BaseBrowse.vue";
import { useBrowse } from "@/composables/useBrowse";
import { soBelumKomitmenService } from "@/services/laporan/marketing/soBelumKomitmenService";
import { formatTanggal } from "@/utils/dateFormat";

const today = new Date();
const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);

const formatDateLocal = (value?: string | Date) => {
  if (!value) return "";
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }
  const d = new Date(value);
  if (isNaN(d.getTime())) return "";
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const dtAwal = ref(formatDateLocal(firstDay));
const dtAkhir = ref(formatDateLocal(today));

const cabangOptions = ref<{ Kode: string; Nama: string }[]>([]);
const divisiOptions = ref<{ Kode: string; Nama: string }[]>([]);
const filterCabang = ref("");
const filterDivisi = ref("");

const filterState = ref({
  startDate: dtAwal.value,
  endDate: dtAkhir.value,
});

watch(
  filterState,
  (newVal) => {
    if (newVal.startDate) dtAwal.value = newVal.startDate;
    if (newVal.endDate) dtAkhir.value = newVal.endDate;
  },
  { deep: true },
);

const headers = [
  { title: "Nomor", key: "Nomor", width: "150px" },
  { title: "Tanggal", key: "Tanggal", width: "100px", align: "center" },
  { title: "Customer", key: "Customer", minWidth: "200px" },
  { title: "Nama SO", key: "Nama", minWidth: "220px" },
  { title: "Divisi", key: "DivisiNama", width: "110px" },
  { title: "Cabang", key: "Cabang", width: "90px" },
  { title: "Sales", key: "Sales", width: "130px" },
  { title: "Pesan", key: "Pesan", width: "90px", align: "end" },
  { title: "Kirim", key: "Kirim", width: "90px", align: "end" },
  { title: "Kurang", key: "Kurang", width: "90px", align: "end" },
  { title: "Dateline", key: "Dateline", width: "100px", align: "center" },
];

const fetchApi = async () => {
  const response = await soBelumKomitmenService.getBrowse({
    startDate: filterState.value.startDate,
    endDate: filterState.value.endDate,
    cabang: filterCabang.value || undefined,
    divisi: filterDivisi.value || undefined,
  });
  return response.data?.data || [];
};

const { items, isLoading, fetchData, exportToExcel } = useBrowse({
  menuId: "571",
  fetchApi,
  immediate: false,
});

const loadLookups = async () => {
  try {
    const [cabRes, divRes] = await Promise.all([
      soBelumKomitmenService.getCabang(),
      soBelumKomitmenService.getDivisi(),
    ]);
    cabangOptions.value = cabRes.data.data || [];
    divisiOptions.value = divRes.data.data || [];
  } catch {
    /* silent */
  }
};

onMounted(async () => {
  await loadLookups();
  fetchData();
});

watch([dtAwal, dtAkhir, filterCabang, filterDivisi], () => {
  filterState.value.startDate = dtAwal.value;
  filterState.value.endDate = dtAkhir.value;
  fetchData();
});
</script>

<template>
  <BaseBrowse
    title="Laporan SO Belum Komitmen Kirim"
    menu-id="571"
    :headers="headers"
    :items="items ?? []"
    :is-loading="isLoading"
    item-value="Nomor"
    v-model:filter-state="filterState"
    can-export
    @export="exportToExcel('Laporan_SO_Belum_Komitmen_Kirim')"
    @refresh="fetchData"
  >
    <template #filter-left>
      <div class="filter-group">
        <input
          type="date"
          v-model="dtAwal"
          class="date-inp"
          @change="fetchData"
        />
        <span class="filter-sep">s.d</span>
        <input
          type="date"
          v-model="dtAkhir"
          class="date-inp"
          @change="fetchData"
        />

        <select v-model="filterCabang" class="date-inp select-inp">
          <option value="">- Semua Cabang -</option>
          <option v-for="c in cabangOptions" :key="c.Kode" :value="c.Kode">
            {{ c.Kode }} - {{ c.Nama }}
          </option>
        </select>

        <select v-model="filterDivisi" class="date-inp select-inp">
          <option value="">- Semua Divisi -</option>
          <option v-for="d in divisiOptions" :key="d.Kode" :value="d.Kode">
            {{ d.Kode }} - {{ d.Nama }}
          </option>
        </select>
      </div>
    </template>

    <template #item.Pesan="{ item }">
      {{ Number(item.Pesan).toLocaleString("id-ID") }}
    </template>
    <template #item.Kirim="{ item }">
      {{ Number(item.Kirim).toLocaleString("id-ID") }}
    </template>
    <template #item.Kurang="{ item }">
      <span :class="{ 'text-red font-weight-bold': Number(item.Kurang) > 0 }">
        {{ Number(item.Kurang).toLocaleString("id-ID") }}
      </span>
    </template>
  </BaseBrowse>
</template>

<style scoped>
.filter-group {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}
.filter-sep {
  font-size: 12px;
  font-weight: 500;
  color: rgba(var(--v-theme-on-surface), 0.6);
  padding: 0 4px;
}
.date-inp {
  height: 30px;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 4px;
  padding: 0 8px;
  font-size: 12px;
  background: rgb(var(--v-theme-surface));
  color: rgb(var(--v-theme-on-surface));
  outline: none;
  cursor: pointer;
}
.date-inp:focus {
  border-color: rgb(var(--v-theme-primary));
}
.select-inp {
  min-width: 150px;
}
.text-red {
  color: #c62828;
}
</style>
