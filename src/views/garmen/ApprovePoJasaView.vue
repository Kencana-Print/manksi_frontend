<script setup lang="ts">
import { ref, watch } from "vue";
import { useToast } from "vue-toastification";
import { useBrowse } from "@/composables/useBrowse";
import BaseBrowse from "@/components/BaseBrowse.vue";
import { approvePoJasaService } from "@/services/garmen/approvePoJasaService";
import { exportExcelSingle } from "@/utils/excelExport";
import { IconClipboardCheck, IconFileSpreadsheet } from "@tabler/icons-vue";
import { formatTanggal } from "@/utils/dateFormat";

const toast = useToast();

interface ApproveRow {
  Nomor: string;
  Tanggal: string;
  Keterangan: string;
  KodeSupplier: string;
  Supplier: string;
  Jasa: string;
  Jumlah: number;
  Tarif: number;
  Total: number;
  Approve: string;
}
interface DetailRow {
  Kode: string;
  Nama: string;
  Jml: number;
  Terima: number;
  HargaBeli: number;
}

const todayWIB = () => {
  const d = new Date(
    new Date().toLocaleString("en-US", { timeZone: "Asia/Jakarta" }),
  );
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const firstOfMonth = () => todayWIB().substring(0, 8) + "01";

const tglAwal = ref(firstOfMonth());
const tglAkhir = ref(todayWIB());

watch([tglAwal, tglAkhir], () => {
  fetchData();
});

const { items, isLoading, selected, selectedItem, fetchData } =
  useBrowse<ApproveRow>({
    menuId: "113",
    fetchApi: async () => {
      const r = await approvePoJasaService.getBrowse(
        tglAwal.value,
        tglAkhir.value,
      );
      return r.data.data ?? [];
    },
    immediate: false,
  });

// Headers wajib ada untuk BaseBrowse meski kita pakai slot #table
const headers = [
  { title: "Nomor", key: "Nomor", width: "150px" },
  { title: "Tanggal", key: "Tanggal", width: "100px" },
  { title: "Keterangan", key: "Keterangan" },
  { title: "Kode Supplier", key: "KodeSupplier", width: "110px" },
  { title: "Supplier", key: "Supplier" },
  { title: "Jasa", key: "Jasa", width: "120px" },
  { title: "Jumlah", key: "Jumlah", width: "80px" },
  { title: "Tarif", key: "Tarif", width: "90px" },
  { title: "Total", key: "Total", width: "100px" },
  { title: "Approve", key: "Approve", width: "80px" },
];

// Expanded rows
const expanded = ref<ApproveRow[]>([]);
const detailCache = ref<Record<string, DetailRow[]>>({});
const loadingDetails = ref<Set<string>>(new Set());

const onUpdateExpanded = async (val: any[]) => {
  expanded.value = val;
  const nomors: string[] = val.map((v) =>
    typeof v === "object" ? v.Nomor : v,
  );
  for (const nomor of nomors) {
    if (!detailCache.value[nomor]) {
      loadingDetails.value = new Set([...loadingDetails.value, nomor]);
      try {
        const r = await approvePoJasaService.getDetail(nomor);
        detailCache.value[nomor] = r.data.data ?? [];
      } catch {
        detailCache.value[nomor] = [];
      } finally {
        const next = new Set(loadingDetails.value);
        next.delete(nomor);
        loadingDetails.value = next;
      }
    }
  }
};

// Toggle approve
const isToggling = ref(false);
const onToggle = async () => {
  if (!selected.value.length) return;
  isToggling.value = true;
  try {
    const r = await approvePoJasaService.toggleApprove(selected.value[0].Nomor);
    const updated = r.data.data;
    toast.success(`${updated.nomor} → ${updated.status}`);
    const row = (items.value ?? []).find((i) => i.Nomor === updated.nomor);
    if (row) row.Approve = updated.status;
  } catch (e: any) {
    toast.error(e.response?.data?.message || "Gagal ubah status.");
  } finally {
    isToggling.value = false;
  }
};

const rowPropsFn = (data: any) => {
  const item = data.item?.raw || data.item;
  if (item.Approve === "Sudah") return { style: "background:#e0f7fa" };
  return {};
};

// Export — pakai exportExcelSingle dengan 4 positional args
const isExporting = ref(false);
const onExport = async () => {
  if (!(items.value ?? []).length) {
    toast.warning("Tidak ada data.");
    return;
  }
  isExporting.value = true;
  try {
    await exportExcelSingle(
      `ApprovePOJasa_${tglAwal.value}_${tglAkhir.value}`,
      "Approve PO Jasa",
      [
        { header: "Nomor", key: "Nomor", width: 20 },
        { header: "Tanggal", key: "Tanggal", width: 12 },
        { header: "Keterangan", key: "Keterangan", width: 30 },
        { header: "Kode Supplier", key: "KodeSupplier", width: 14 },
        { header: "Supplier", key: "Supplier", width: 28 },
        { header: "Jasa", key: "Jasa", width: 16 },
        { header: "Jumlah", key: "Jumlah", width: 10, numFmt: "#,##0" },
        { header: "Tarif", key: "Tarif", width: 12, numFmt: "#,##0" },
        { header: "Total", key: "Total", width: 14, numFmt: "#,##0" },
        { header: "Approve", key: "Approve", width: 10 },
      ],
      items.value ?? [],
      `APPROVE PO JASA — ${tglAwal.value} s.d. ${tglAkhir.value}`,
    );
  } catch {
    toast.error("Gagal export.");
  } finally {
    isExporting.value = false;
  }
};

const num = (v: any) => Number(v || 0).toLocaleString("id-ID");
</script>

<template>
  <BaseBrowse
    title="Approve PO Jasa"
    menu-id="113"
    :icon="IconClipboardCheck"
    :is-loading="isLoading"
    :items="items ?? []"
    :headers="headers"
    item-value="Nomor"
    :can-export="false"
    :show-expand="true"
    :expanded="expanded"
    :selected="selected"
    @refresh="fetchData"
    @update:expanded="onUpdateExpanded"
    @update:selected="(val) => (selected = val)"
    :row-props-fn="rowPropsFn"
  >
    <template #filter-left>
      <div class="d-flex align-center gap-2">
        <label class="flbl">Tanggal</label>
        <input type="date" v-model="tglAwal" class="finp" />
        <span class="flbl">s.d.</span>
        <input type="date" v-model="tglAkhir" class="finp" />
      </div>
    </template>

    <template #extra-actions="{ selected: sel }">
      <v-btn
        size="small"
        color="warning"
        variant="flat"
        :disabled="!sel.length"
        :loading="isToggling"
        @click="onToggle"
      >
        <template #prepend><IconClipboardCheck :size="14" /></template>
        Ubah Status
      </v-btn>
      <v-btn
        size="small"
        color="success"
        variant="outlined"
        :loading="isExporting"
        @click="onExport"
      >
        <template #prepend><IconFileSpreadsheet :size="14" /></template>
        Export
      </v-btn>
    </template>

    <!-- item.Approve warna -->
    <template #item.Approve="{ item }">
      <span :class="item.Approve === 'Sudah' ? 'chip-sudah' : 'chip-belum'">
        {{ item.Approve }}
      </span>
    </template>

    <!-- item.Tanggal -->
    <template #item.Tanggal="{ item }">
      {{ formatTanggal(item.Tanggal) }}
    </template>

    <!-- item.Total format -->
    <template #item.Total="{ item }">{{ num(item.Total) }}</template>
    <template #item.Jumlah="{ item }">{{ num(item.Jumlah) }}</template>
    <template #item.Tarif="{ item }">{{ num(item.Tarif) }}</template>

    <!-- Expand detail -->
    <template #detail="{ item }">
      <div v-if="loadingDetails.has(item.Nomor)" class="det-loading">
        <v-progress-circular indeterminate size="18" color="primary" />
        <span>Memuat...</span>
      </div>
      <table v-else-if="detailCache[item.Nomor]?.length" class="det-tbl">
        <thead>
          <tr>
            <th>Kode</th>
            <th>Nama</th>
            <th class="tr">Jml</th>
            <th class="tr">Terima</th>
            <th class="tr">Harga Beli</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="d in detailCache[item.Nomor]" :key="d.Kode">
            <td class="mono">{{ d.Kode }}</td>
            <td>{{ d.Nama }}</td>
            <td class="tr">{{ num(d.Jml) }}</td>
            <td class="tr">{{ num(d.Terima) }}</td>
            <td class="tr">{{ num(d.HargaBeli) }}</td>
          </tr>
        </tbody>
      </table>
      <div v-else class="det-empty">Tidak ada detail</div>
    </template>
  </BaseBrowse>
</template>

<style scoped>
.flbl {
  font-size: 11px;
  font-weight: 500;
  color: #444;
  white-space: nowrap;
}
.finp {
  height: 26px;
  border: 1px solid #bdbdbd;
  border-radius: 3px;
  padding: 0 6px;
  font-size: 12px;
  outline: none;
}
.finp:focus {
  border-color: #1565c0;
}
.tr {
  text-align: right;
}
.mono {
  font-family: monospace;
  font-size: 10px;
  color: #1565c0;
  font-weight: 600;
}
.exp-link {
  cursor: pointer;
}
.exp-link:hover {
  text-decoration: underline;
}
.chip-sudah {
  background: #00897b;
  color: white;
  padding: 1px 7px;
  border-radius: 10px;
  font-size: 10px;
  font-weight: 700;
}
.chip-belum {
  background: #e0e0e0;
  color: #555;
  padding: 1px 7px;
  border-radius: 10px;
  font-size: 10px;
  font-weight: 700;
}
.det-loading {
  font-size: 11px;
  color: #9e9e9e;
  padding: 6px;
}
.det-tbl {
  border-collapse: collapse;
  font-size: 10.5px;
}
.det-tbl th {
  background: #f0f4c3;
  color: #333;
  padding: 3px 6px;
  font-weight: 700;
}
.det-tbl td {
  padding: 2px 6px;
  border-bottom: 1px solid #e8f5e9;
}
</style>
