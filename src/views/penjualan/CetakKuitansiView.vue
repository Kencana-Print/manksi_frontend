<script setup lang="ts">
import { ref, computed, watch, onMounted } from "vue";
import { useRouter } from "vue-router";
import BaseBrowse from "@/components/BaseBrowse.vue";
import { useBrowse } from "@/composables/useBrowse";
import { cetakKuitansiService as svc } from "@/services/penjualan/cetakKuitansiService";
import { IconReceipt2 } from "@tabler/icons-vue";
import { formatTanggal, formatTanggalJam } from "@/utils/dateFormat";

const router = useRouter();

// ── Helpers ────────────────────────────────────────────────
const firstOfMonth = () => {
  const d = new Date(
    new Date().toLocaleString("en-US", { timeZone: "Asia/Jakarta" }),
  );
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
};
const todayLocal = () => {
  const d = new Date(
    new Date().toLocaleString("en-US", { timeZone: "Asia/Jakarta" }),
  );
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

// ── Filter — default awal bulan s.d. hari ini ─────────────────
const tglAwal = ref(firstOfMonth());
const tglAkhir = ref(todayLocal());

const filterState = computed(() => ({
  tglAwal: tglAwal.value,
  tglAkhir: tglAkhir.value,
}));
const onFilterStateRestore = (val: any) => {
  if (val?.tglAwal) tglAwal.value = val.tglAwal;
  if (val?.tglAkhir) tglAkhir.value = val.tglAkhir;
};

// ── useBrowse ──────────────────────────────────────────────
const { items, isLoading, selected, canInsert, fetchData } = useBrowse({
  menuId: "1317",
  fetchApi: async () => {
    const res = await svc.getBrowse(tglAwal.value, tglAkhir.value);
    return res.data.data ?? [];
  },
});

// ── Headers ────────────────────────────────────────────────
const headers = [
  { title: "Nomor Inv", key: "Nomor_Inv", width: "150px" },
  { title: "Tanggal Inv", key: "Tanggal_Inv", width: "100px" },
  { title: "Perusahaan", key: "Perusahaan", minWidth: "160px" },
  { title: "Kode Cus", key: "Cus_kode", width: "90px" },
  { title: "Nama Customer", key: "cus_nama", minWidth: "180px" },
  { title: "Dibuat", key: "Date_Create", width: "150px" },
  { title: "User", key: "User_Create", width: "100px" },
];

// ── Auto refresh ───────────────────────────────────────────
watch([tglAwal, tglAkhir], fetchData);
onMounted(fetchData);

// ── Navigate ─────────────────────────────────────────────────
// CATATAN: route & view Form belum dibuat — akan error sampai
// CetakKuitansiFormView.vue dibuat.
const goNew = () => {
  router.push({ name: "CetakKuitansiFormCreate" });
};
</script>

<template>
  <BaseBrowse
    title="Cetak Kuitansi"
    menu-id="1317"
    :icon="IconReceipt2"
    :is-loading="isLoading"
    :headers="headers"
    :items="items ?? []"
    item-value="Nomor_Inv"
    :can-insert="canInsert"
    search-placeholder="Cari nomor invoice, customer..."
    :selected="selected"
    :filter-state="filterState"
    @update:filter-state="onFilterStateRestore"
    @update:selected="selected = $event"
    @add="goNew"
    @refresh="fetchData"
  >
    <!-- ── Filter ── -->
    <template #filter-left>
      <label class="flbl">Filter Periode</label>
      <input type="date" v-model="tglAwal" class="finp" />
      <span class="fsep">s.d.</span>
      <input type="date" v-model="tglAkhir" class="finp" />
    </template>

    <!-- ── Custom cell rendering ── -->
    <template #item.Tanggal_Inv="{ item }">
      {{ formatTanggal(item.Tanggal_Inv) }}
    </template>

    <template #item.Date_Create="{ item }">
      {{ formatTanggalJam(item.Date_Create) }}
    </template>
  </BaseBrowse>
</template>

<style scoped>
.flbl {
  font-size: 11px;
  font-weight: 600;
  color: #444;
  white-space: nowrap;
}
.finp {
  height: 28px;
  border: 1px solid #bdbdbd;
  border-radius: 4px;
  padding: 0 6px;
  font-size: 12px;
  outline: none;
}
.finp:focus {
  border-color: #1565c0;
}
.fsep {
  font-size: 11px;
  color: #777;
}
</style>
