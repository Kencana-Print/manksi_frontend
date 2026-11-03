<script setup lang="ts">
import { ref, computed, onMounted, watch } from "vue";
import { useRouter } from "vue-router";
import { useToast } from "vue-toastification";
import BaseBrowse from "@/components/BaseBrowse.vue";
import { useBrowse } from "@/composables/useBrowse";
import {
  ambilVoucherService,
  type VoucherRow,
} from "@/services/ga/ambilVoucherService";
import { exportExcelSingle, type ExcelColumn } from "@/utils/excelExport";
import { formatTanggal } from "@/utils/dateFormat";
import { IconTicket } from "@tabler/icons-vue";

const router = useRouter();
const toast = useToast();

// ── Helpers Tanggal ──────────────────────────────────────────────────
const todayLocal = () => {
  const d = new Date(
    new Date().toLocaleString("en-US", { timeZone: "Asia/Jakarta" }),
  );
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const firstOfMonth = () => {
  const d = new Date(
    new Date().toLocaleString("en-US", { timeZone: "Asia/Jakarta" }),
  );
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
};

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

// ── Composable useBrowse (menuId: 613) ─────────────────────────────────
const {
  items,
  isLoading,
  selected,
  canInsert,
  canEdit,
  canDelete,
  canExport,
  fetchData,
  clearSelection,
} = useBrowse({
  menuId: "613",
  fetchApi: async () => {
    const res = await ambilVoucherService.getBrowse({
      tglAwal: tglAwal.value,
      tglAkhir: tglAkhir.value,
    });
    return res.data.data ?? [];
  },
});

const selectedItem = computed(
  () => (selected.value[0] as unknown as VoucherRow) ?? null,
);

// ── Headers Sesuai Delphi 7 ufrmBrowseVoucher ──────────────────────────
const headers = [
  { title: "NOMOR BON", key: "Kode", width: "120px", align: "center" as const },
  { title: "ID", key: "Id", width: "70px", align: "center" as const },
  { title: "TANGGAL", key: "Tanggal", width: "110px", align: "center" as const },
  { title: "KEPADA SPBU", key: "NamaSpbu", minWidth: "160px" },
  { title: "PENGGUNA", key: "Nama_Pengguna", minWidth: "160px" },
  { title: "NO. POLISI", key: "Nopol", width: "130px", align: "center" as const },
  { title: "ODOMETER", key: "Odometer", width: "120px", align: "right" as const },
  { title: "NAMA BBM", key: "NamaBBM", width: "140px" },
  { title: "JUMLAH (LITER)", key: "Jumlah", width: "140px", align: "right" as const },
];

const summaryColumns = ["Jumlah"];
const summaryFormatters = {
  Jumlah: (filteredList: any[]) => {
    const total = (filteredList || []).reduce(
      (sum: number, row: any) => sum + (Number(row.Jumlah) || 0),
      0,
    );
    return Number(total.toFixed(2)).toLocaleString("id-ID", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  },
};

// ── Navigasi Form ─────────────────────────────────────────────────────
const goNew = () => {
  router.push({ name: "GaAmbilVoucherCreate" });
};

const goEdit = (item: { Kode: string; Id: number }) => {
  const target = item || selectedItem.value;
  if (!target || !target.Kode) return;
  router.push({
    name: "GaAmbilVoucherEdit",
    params: { kode: target.Kode, id: String(target.Id) },
  });
};

// ── Hapus Data ────────────────────────────────────────────────────────
const onDelete = async (item: { Kode: string; Id: number }) => {
  const target = item || selectedItem.value;
  if (!target || !target.Kode) {
    toast.warning("Pilih data yang ingin dihapus terlebih dahulu.");
    return;
  }

  const konfirmasi = window.confirm(
    `Yakin ingin menghapus voucher nomor [${target.Kode}] (ID: ${target.Id})?`,
  );
  if (!konfirmasi) return;

  try {
    await ambilVoucherService.deleteData(target.Kode, target.Id);
    toast.success(`Data Voucher ${target.Kode} berhasil dihapus.`);
    clearSelection();
    await fetchData();
  } catch (err: any) {
    toast.error(
      err.response?.data?.message || err.message || "Gagal menghapus data voucher.",
    );
  }
};

// ── Export Excel ───────────────────────────────────────────────────────
const isExporting = ref(false);

const exportColumns: ExcelColumn[] = [
  { header: "Nomor Bon", key: "Kode", width: 14, align: "center" },
  { header: "ID", key: "Id", width: 8, align: "center" },
  { header: "Tanggal", key: "Tanggal", width: 12, align: "center" },
  { header: "Kepada SPBU", key: "NamaSpbu", width: 22, align: "left" },
  { header: "No. Polisi", key: "Nopol", width: 14, align: "center" },
  { header: "Pengguna", key: "Nama_Pengguna", width: 22, align: "left" },
  { header: "Odometer", key: "Odometer", width: 14, align: "right" },
  { header: "Nama BBM", key: "NamaBBM", width: 16, align: "left" },
  { header: "Jumlah (Liter)", key: "Jumlah", width: 16, align: "right" },
];

const onExport = async () => {
  const rows = items.value ?? [];
  if (!rows.length) {
    toast.warning("Tidak ada data untuk diexport.");
    return;
  }
  isExporting.value = true;
  try {
    const title = `Browse Voucher — ${tglAwal.value} s.d. ${tglAkhir.value}`;
    await exportExcelSingle(
      `Browse_Voucher_${tglAwal.value}_${tglAkhir.value}.xlsx`,
      "Voucher",
      exportColumns,
      rows,
      title,
    );
    toast.success("Export berhasil.");
  } catch {
    toast.error("Gagal export Excel.");
  } finally {
    isExporting.value = false;
  }
};

let timer: ReturnType<typeof setTimeout> | null = null;
watch([tglAwal, tglAkhir], () => {
  if (timer) clearTimeout(timer);
  timer = setTimeout(fetchData, 400);
});

onMounted(() => {
  fetchData();
});
</script>

<template>
  <BaseBrowse
    title="Browse Voucher"
    menu-id="613"
    storage-id="613"
    :icon="IconTicket"
    :headers="headers"
    :items="items ?? []"
    :is-loading="isLoading"
    item-value="Kode"
    :can-insert="canInsert"
    :can-edit="canEdit"
    :can-delete="canDelete"
    :can-export="canExport"
    :selected="selected"
    :filter-state="filterState"
    :summary-columns="summaryColumns"
    :summary-formatters="summaryFormatters"
    summary-key="Jumlah"
    summary-label="Total Jumlah (Liter)"
    search-placeholder="Cari nomor bon, nopol, pengguna, SPBU, BBM..."
    @refresh="fetchData"
    @add="goNew"
    @edit="goEdit"
    @delete="onDelete"
    @export="onExport"
    @update:selected="(val) => (selected = val)"
    @update:filter-state="onFilterStateRestore"
  >
    <!-- Filter Kiri: Tanggal -->
    <template #filter-left>
      <div class="f-grp">
        <label class="f-lbl">Dari</label>
        <input type="date" v-model="tglAwal" class="f-date" />
      </div>
      <div class="f-grp">
        <label class="f-lbl">S/D</label>
        <input type="date" v-model="tglAkhir" class="f-date" />
      </div>
    </template>

    <!-- Custom Render Nomor Bon -->
    <template #item.Kode="{ item }">
      <span class="font-weight-bold font-mono text-primary">
        {{ item.Kode }}
      </span>
    </template>

    <!-- Custom Render ID -->
    <template #item.Id="{ item }">
      <span class="font-mono text-medium-emphasis">
        {{ item.Id }}
      </span>
    </template>

    <!-- Custom Render Tanggal -->
    <template #item.Tanggal="{ item }">
      {{ formatTanggal(item.Tanggal) }}
    </template>

    <!-- Custom Render No. Polisi -->
    <template #item.Nopol="{ item }">
      <span class="font-weight-bold font-mono">
        {{ item.Nopol || "—" }}
      </span>
    </template>

    <!-- Custom Render Odometer -->
    <template #item.Odometer="{ item }">
      {{ Number(item.Odometer || 0).toLocaleString("id-ID") }}
    </template>

    <!-- Custom Render Jumlah -->
    <template #item.Jumlah="{ item }">
      <span class="font-weight-bold font-mono text-primary">
        {{ Number(item.Jumlah || 0).toLocaleString("id-ID", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}
      </span>
    </template>
  </BaseBrowse>
</template>

<style scoped>
.f-grp {
  display: flex;
  align-items: center;
  gap: 6px;
}

.f-lbl {
  font-size: 11px;
  font-weight: 600;
  color: var(--v-theme-on-surface);
  white-space: nowrap;
}

.f-date {
  height: 28px;
  padding: 2px 6px;
  font-size: 11px;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 4px;
  background: var(--v-theme-surface);
  color: var(--v-theme-on-surface);
  outline: none;
}

.f-date:focus {
  border-color: rgb(var(--v-theme-primary));
}

.font-mono {
  font-family: monospace;
}
</style>
