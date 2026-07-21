<script setup lang="ts">
import { ref, onMounted, watch } from "vue";
import { useToast } from "vue-toastification";
import BaseBrowse from "@/components/BaseBrowse.vue";
import { useBrowse } from "@/composables/useBrowse";
import { spkDtfBelumPoService } from "@/services/laporan/gudang-garmen/spkDtfBelumPoService";
import SupplierSearchModal from "@/components/lookups/SupplierSearchModal.vue";
import { exportExcelSingle } from "@/utils/excelExport";
import { IconFileAlert, IconSearch } from "@tabler/icons-vue";

const toast = useToast();
const menuId = "516";

const toLocalDateStr = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const today = new Date();
const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
const dtAwal = ref(toLocalDateStr(firstDayOfMonth));
const dtAkhir = ref(toLocalDateStr(today));

const cab = ref("P04");

const supplierKode = ref("00274");
const supplierNama = ref("P1 KAOSAN");
const showSupplierModal = ref(false);

const onSupplierSelected = (item: any) => {
  supplierKode.value = item.Kode || item.sup_kode;
  supplierNama.value = item.Nama || item.sup_nama;
};
const clearSupplier = () => {
  supplierKode.value = "";
  supplierNama.value = "";
};

const { items, isLoading, canExport, fetchData } = useBrowse({
  menuId,
  fetchApi: async () => {
    const res = await spkDtfBelumPoService.getBrowse(
      dtAwal.value,
      dtAkhir.value,
      cab.value,
      supplierKode.value,
    );
    return res.data.data;
  },
  immediate: true,
});

watch([dtAwal, dtAkhir, cab, supplierKode], fetchData);

const headers = [
  { title: "SPK", key: "SPK", width: "130px" },
  { title: "Divisi", key: "Divisi", width: "90px" },
  { title: "Workshop", key: "Workshop", width: "90px" },
  { title: "Tanggal", key: "Tanggal", width: "95px", align: "center" },
  { title: "Dateline", key: "Dateline", width: "95px", align: "center" },
  { title: "Nama", key: "Nama", minWidth: "300px" },
  { title: "Order", key: "OrderQty", width: "90px", align: "right" },
  { title: "Kirim", key: "Kirim", width: "90px", align: "right" },
  { title: "Finishing", key: "Finishing", minWidth: "220px" },
];

const numFmt = (v: any) => (v ? Number(v).toLocaleString("id-ID") : "0");
const formatTgl = (v: string) => {
  if (!v) return "-";
  const s = String(v).substring(0, 10);
  const [y, m, d] = s.split("-");
  if (!y || !m || !d) return v;
  return `${d}-${m}-${y}`;
};

const onExport = async () => {
  if (!items.value?.length)
    return toast.warning("Tidak ada data untuk diekspor.");
  await exportExcelSingle(
    `SPK_DTF_Belum_PO_${dtAwal.value}_${dtAkhir.value}.xlsx`,
    "SPK DTF Belum PO",
    [
      { header: "SPK", key: "SPK", width: 16 },
      { header: "Divisi", key: "Divisi", width: 12 },
      { header: "Workshop", key: "Workshop", width: 12 },
      { header: "Tanggal", key: "Tanggal", width: 12, align: "center" },
      { header: "Dateline", key: "Dateline", width: 12, align: "center" },
      { header: "Nama", key: "Nama", width: 34 },
      {
        header: "Order",
        key: "OrderQty",
        width: 12,
        align: "right",
        numFmt: "#,##0.00",
      },
      {
        header: "Kirim",
        key: "Kirim",
        width: 12,
        align: "right",
        numFmt: "#,##0.00",
      },
      { header: "Finishing", key: "Finishing", width: 30 },
    ],
    items.value,
    `Laporan SPK DTF Belum PO DTF — ${dtAwal.value} s/d ${dtAkhir.value}`,
  );
};

onMounted(fetchData);
</script>

<template>
  <BaseBrowse
    title="SPK DTF Belum PO DTF"
    :menu-id="menuId"
    :icon="IconFileAlert"
    :headers="headers"
    :items="items ?? []"
    :is-loading="isLoading"
    :can-export="canExport"
    item-value="SPK"
    @refresh="fetchData"
    @export="onExport"
  >
    <template #filter-left>
      <div class="f-group">
        <span class="f-label">Tanggal SPK</span>
        <input type="date" v-model="dtAwal" class="f-date" />
        <span class="f-sep">sd</span>
        <input type="date" v-model="dtAkhir" class="f-date" />
      </div>

      <div class="f-divider" />

      <div class="f-group">
        <span class="f-label">Workshop</span>
        <select v-model="cab" class="f-select">
          <option value="P04">P04</option>
        </select>
      </div>

      <div class="f-divider" />

      <div class="f-group">
        <span class="f-label">Tujuan PO</span>
        <div class="spk-picker">
          <input
            type="text"
            :value="supplierKode"
            readonly
            class="text-inp"
            style="width: 80px; cursor: pointer"
            placeholder="Klik..."
            @click="showSupplierModal = true"
          />
          <button
            v-if="supplierKode"
            type="button"
            class="btn-clear-spk"
            @click="clearSupplier"
          >
            ✕
          </button>
          <button
            type="button"
            class="btn-search-spk"
            @click="showSupplierModal = true"
          >
            <IconSearch :size="13" />
          </button>
        </div>
        <span v-if="supplierNama" class="spk-nama-hint">{{
          supplierNama
        }}</span>
        <span v-else class="spk-nama-hint muted">Kosong=Semua tujuan</span>
      </div>
    </template>

    <template #item.Tanggal="{ item }">{{ formatTgl(item.Tanggal) }}</template>
    <template #item.Dateline="{ item }">{{
      formatTgl(item.Dateline)
    }}</template>
    <template #item.OrderQty="{ item }">{{ numFmt(item.OrderQty) }}</template>
    <template #item.Kirim="{ item }">{{ numFmt(item.Kirim) }}</template>
  </BaseBrowse>

  <SupplierSearchModal
    v-model="showSupplierModal"
    @selected="onSupplierSelected"
  />
</template>

<style scoped>
.f-group {
  display: flex;
  align-items: center;
  gap: 6px;
}
.f-label {
  font-size: 11px;
  font-weight: 700;
  color: #555;
  white-space: nowrap;
}
.f-date,
.f-select {
  height: 28px;
  border: 1px solid #ccc;
  border-radius: 4px;
  padding: 0 6px;
  font-size: 12px;
  outline: none;
  background: white;
}
.f-sep {
  font-size: 11px;
  color: #555;
}
.f-divider {
  width: 1px;
  height: 20px;
  background: #ddd;
  margin: 0 4px;
}
.spk-picker {
  display: inline-flex;
  align-items: center;
  border: 1px solid #ccc;
  border-radius: 4px;
  overflow: hidden;
  height: 28px;
}
.text-inp {
  border: none;
  height: 26px;
  padding: 0 8px;
  font-size: 12px;
  outline: none;
}
.btn-clear-spk {
  background: #ffebee;
  border: none;
  color: #c62828;
  font-size: 11px;
  width: 22px;
  height: 26px;
  cursor: pointer;
}
.btn-search-spk {
  background: #e3f2fd;
  border: none;
  border-left: 1px solid #ccc;
  color: #1565c0;
  width: 24px;
  height: 26px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}
.spk-nama-hint {
  font-size: 11px;
  color: #757575;
  font-style: italic;
  max-width: 160px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.spk-nama-hint.muted {
  color: #bdbdbd;
}
</style>
