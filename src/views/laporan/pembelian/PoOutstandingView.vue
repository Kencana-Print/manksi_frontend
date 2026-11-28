<script setup lang="ts">
import { ref, watch, onMounted } from "vue";
import { useToast } from "vue-toastification";
import BaseBrowse from "@/components/BaseBrowse.vue";
import {
  poOutstandingService,
  type PoOutstandingRow,
  type PoOutstandingJenisFilter,
} from "@/services/laporan/pembelian/poOutstandingService";
import { IconClipboardList } from "@tabler/icons-vue";
import { formatTanggal } from "@/utils/dateFormat";
import { exportExcelSingle, type ExcelColumn } from "@/utils/excelExport";

const toast = useToast();
const baseBrowseRef = ref<InstanceType<typeof BaseBrowse> | null>(null);

interface HeaderDef {
  title: string;
  key: keyof PoOutstandingRow;
  width: string;
  align?: "center" | "end";
  fixed?: boolean;
}

// ── Filter: periode (tanggal PO, default awal bulan s/d hari ini) & jenis ──
const filterState = ref<Record<string, unknown>>({});
const getToday = () => {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};
const getAwalBulan = () => {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}-01`;
};

const startDate = ref(getAwalBulan());
const endDate = ref(getToday());
const jenis = ref<PoOutstandingJenisFilter>("ALL");

watch([startDate, endDate, jenis], () => {
  fetchData();
});

// ── Data ──
const items = ref<PoOutstandingRow[]>([]);
const isLoading = ref(false);

const headers: HeaderDef[] = [
  { title: "Tanggal", key: "Tanggal", width: "100px", align: "center" },
  { title: "Nomor PO", key: "Nomor", width: "150px", fixed: true },
  { title: "Tipe", key: "Tipe", width: "90px" },
  { title: "Jenis", key: "Jenis", width: "100px" },
  { title: "Kode Supp", key: "KodeSupplier", width: "90px" },
  { title: "Supplier", key: "Supplier", width: "200px" },
  { title: "Kode", key: "Kode", width: "110px" },
  { title: "Nama", key: "Nama", width: "280px" },
  { title: "Satuan", key: "Satuan", width: "70px", align: "center" },
  { title: "Qty PO", key: "QtyPo", width: "100px", align: "end" },
  { title: "Qty Terima", key: "QtyTerima", width: "100px", align: "end" },
  { title: "Sisa", key: "Sisa", width: "100px", align: "end" },
  { title: "Umur (hr)", key: "Umur", width: "80px", align: "end" },
  { title: "Janji Kirim", key: "TglJanji", width: "110px", align: "center" },
  { title: "Cabang", key: "Cabang", width: "80px", align: "center" },
];

const numFmt = (v: number | string | null | undefined) =>
  v ? Number(v).toLocaleString("id-ID", { maximumFractionDigits: 2 }) : "";

const tipeLabel = (t: string) => (t === "BAHAN" ? "Bahan" : "Non Bahan");

// Slot/row dari BaseBrowse bisa berbentuk { raw } atau item langsung
const rowOf = (item: unknown): PoOutstandingRow => {
  const wrapped = item as { raw?: PoOutstandingRow };
  return (wrapped.raw ?? item) as PoOutstandingRow;
};

const fetchData = async () => {
  isLoading.value = true;
  try {
    const res = await poOutstandingService.getPoOutstanding({
      startDate: startDate.value,
      endDate: endDate.value,
      jenis: jenis.value,
    });
    items.value = res.data.data || [];
  } catch (e) {
    const err = e as { response?: { data?: { message?: string } } };
    toast.error(err.response?.data?.message || "Gagal memuat data.");
  } finally {
    isLoading.value = false;
  }
};

onMounted(fetchData);

// ── Row coloring: baris yang janji kirimnya sudah lewat ditandai merah muda ──
const rowPropsFn = (data: unknown) => {
  const r = rowOf((data as { item?: unknown }).item);
  if (r?.Telat) return { style: "background:#fff1f0" };
  return {};
};

// ── Summary footer: hanya kolom qty ──
const sumQty = (
  rows: PoOutstandingRow[],
  key: "QtyPo" | "QtyTerima" | "Sisa",
) =>
  numFmt(
    Math.round(rows.reduce((s, r) => s + (Number(r[key]) || 0), 0) * 100) / 100,
  );

const summaryFormatters = {
  QtyPo: (rows: PoOutstandingRow[]) => sumQty(rows, "QtyPo"),
  QtyTerima: (rows: PoOutstandingRow[]) => sumQty(rows, "QtyTerima"),
  Sisa: (rows: PoOutstandingRow[]) => sumQty(rows, "Sisa"),
};

// ── Export ──
const isExporting = ref(false);

const onExport = async () => {
  const dataToExport: PoOutstandingRow[] =
    baseBrowseRef.value?.getFilteredItems?.() ?? items.value ?? [];

  if (!dataToExport.length) {
    toast.warning("Tidak ada data untuk diexport.");
    return;
  }

  isExporting.value = true;
  try {
    const qtyKeys: string[] = ["QtyPo", "QtyTerima", "Sisa"];
    const columns: ExcelColumn[] = headers.map((h) => ({
      header: h.title,
      key: h.key,
      width: Math.max(10, Math.round(parseInt(h.width) / 7)),
      align: h.align ?? "left",
      numFmt: qtyKeys.includes(h.key) ? "#,##0.##" : undefined,
    }));

    const rows = dataToExport.map((it) => {
      const row: Record<string, string | number> = {};
      columns.forEach((c) => {
        const val = it[c.key as keyof PoOutstandingRow];
        if (c.key === "Tanggal" || c.key === "TglJanji")
          row[c.key] = val ? formatTanggal(String(val)) : "";
        else if (c.key === "Tipe") row[c.key] = tipeLabel(it.Tipe);
        else row[c.key] = (val as string | number | null) ?? "";
      });
      return row;
    });

    const periode =
      startDate.value || endDate.value
        ? `${startDate.value ? formatTanggal(startDate.value) : "awal"} s/d ${endDate.value ? formatTanggal(endDate.value) : "sekarang"}`
        : "Semua";

    await exportExcelSingle(
      `PO_Outstanding_${new Date().toISOString().slice(0, 10)}.xlsx`,
      "PO Outstanding",
      columns,
      rows,
      `Laporan PO Outstanding  |  Tgl PO: ${periode}`,
    );

    toast.success("Berhasil export data.");
  } catch (e) {
    console.error(e);
    toast.error("Terjadi kesalahan saat export.");
  } finally {
    isExporting.value = false;
  }
};
</script>

<template>
  <BaseBrowse
    ref="baseBrowseRef"
    title="PO Outstanding"
    menu-id="975"
    :icon="IconClipboardList"
    :headers="headers"
    :items="items ?? []"
    :is-loading="isLoading"
    v-model:filter-state="filterState"
    :can-export="true"
    item-value="id"
    :row-props-fn="rowPropsFn"
    :summary-columns="['QtyPo', 'QtyTerima', 'Sisa']"
    :summary-formatters="summaryFormatters"
    @refresh="fetchData"
    @export="onExport"
  >
    <template #filter-left>
      <div class="f-group">
        <span class="f-label">Tgl PO</span>
        <input type="date" v-model="startDate" class="f-date" />
        <span class="f-sep">s/d</span>
        <input type="date" v-model="endDate" class="f-date" />
      </div>
      <div class="f-divider" />
      <div class="f-group">
        <span class="f-label">Jenis</span>
        <select v-model="jenis" class="f-select">
          <option value="ALL">Semua</option>
          <option value="BAHAN">PO Bahan</option>
          <option value="NON_BAHAN">PO Non Bahan</option>
        </select>
      </div>
    </template>

    <template #item.Tanggal="{ item }">
      {{ formatTanggal(rowOf(item).Tanggal) }}
    </template>
    <template #item.Tipe="{ item }">
      {{ tipeLabel(rowOf(item).Tipe) }}
    </template>
    <template
      v-for="col in ['QtyPo', 'QtyTerima']"
      :key="col"
      v-slot:[`item.${col}`]="{ item }"
    >
      <span class="num-cell">{{
        numFmt(rowOf(item)[col as "QtyPo" | "QtyTerima"])
      }}</span>
    </template>
    <template #item.Sisa="{ item }">
      <span class="num-cell sisa-cell">{{ numFmt(rowOf(item).Sisa) }}</span>
    </template>
    <template #item.Umur="{ item }">
      <span class="num-cell">{{ rowOf(item).Umur }}</span>
    </template>
    <template #item.TglJanji="{ item }">
      <span :class="{ 'janji-telat': rowOf(item).Telat }">
        {{ rowOf(item).TglJanji ? formatTanggal(rowOf(item).TglJanji!) : "" }}
      </span>
    </template>
  </BaseBrowse>
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
.f-sep {
  font-size: 11px;
  color: #777;
}
.f-date,
.f-select {
  height: 28px;
  border: 1px solid #ccc;
  border-radius: 4px;
  padding: 0 6px;
  font-size: 11px;
  outline: none;
  background: white;
  color: #212121;
}
.f-date:focus,
.f-select:focus {
  border-color: #1565c0;
}
.f-divider {
  width: 1px;
  height: 20px;
  background: #ddd;
  margin: 0 8px;
}

.num-cell {
  font-variant-numeric: tabular-nums;
}
.sisa-cell {
  font-weight: 700;
  color: #cc0000;
}
.janji-telat {
  color: #cc0000;
  font-weight: 700;
}
</style>
