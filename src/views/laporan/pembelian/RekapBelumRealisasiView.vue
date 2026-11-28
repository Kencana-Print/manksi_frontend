<script setup lang="ts">
import { ref, watch, onMounted } from "vue";
import { useToast } from "vue-toastification";
import BaseBrowse from "@/components/BaseBrowse.vue";
import {
  rekapBelumRealisasiService,
  type RekapBelumRealisasiRow,
  type RekapTahapFilter,
} from "@/services/laporan/pembelian/rekapBelumRealisasiService";
import { IconReceipt2 } from "@tabler/icons-vue";
import { formatTanggal } from "@/utils/dateFormat";
import { exportExcelSingle, type ExcelColumn } from "@/utils/excelExport";

const toast = useToast();
const baseBrowseRef = ref<InstanceType<typeof BaseBrowse> | null>(null);

interface HeaderDef {
  title: string;
  key: keyof RekapBelumRealisasiRow;
  width: string;
  align?: "center" | "end";
  fixed?: boolean;
}

// ── Filter: periode (tanggal rekap, default awal bulan s/d hari ini) & tahap ──
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
const tahap = ref<RekapTahapFilter>("ALL");

watch([startDate, endDate, tahap], () => {
  fetchData();
});

// ── Data ──
const items = ref<RekapBelumRealisasiRow[]>([]);
const isLoading = ref(false);

const headers: HeaderDef[] = [
  { title: "Tgl Rekap", key: "TglRekap", width: "100px", align: "center" },
  { title: "No. Rekap", key: "NomorRekap", width: "150px", fixed: true },
  { title: "Tahap", key: "Tahap", width: "120px", align: "center" },
  { title: "Kategori", key: "Kategori", width: "150px" },
  { title: "Kode Supp", key: "KodeSupplier", width: "90px" },
  { title: "Supplier", key: "Supplier", width: "200px" },
  { title: "Nota", key: "Nota", width: "150px" },
  { title: "Tgl Nota", key: "TglNota", width: "100px", align: "center" },
  {
    title: "Bulan Tagihan",
    key: "BulanTagihan",
    width: "110px",
    align: "center",
  },
  { title: "Nominal", key: "Nominal", width: "130px", align: "end" },
  { title: "Tgl Rencana", key: "TglRencana", width: "110px", align: "center" },
  { title: "Voucher", key: "Voucher", width: "140px" },
  { title: "PJT", key: "Pjt", width: "140px" },
  { title: "Keterangan", key: "Keterangan", width: "240px" },
];

const numFmt = (v: number | string | null | undefined) =>
  v ? Number(v).toLocaleString("id-ID", { maximumFractionDigits: 2 }) : "";

// Slot/row dari BaseBrowse bisa berbentuk { raw } atau item langsung
const rowOf = (item: unknown): RekapBelumRealisasiRow => {
  const wrapped = item as { raw?: RekapBelumRealisasiRow };
  return (wrapped.raw ?? item) as RekapBelumRealisasiRow;
};

const fetchData = async () => {
  isLoading.value = true;
  try {
    const res = await rekapBelumRealisasiService.getRekapBelumRealisasi({
      startDate: startDate.value,
      endDate: endDate.value,
      tahap: tahap.value,
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

// ── Row coloring: baris yang tanggal rencananya sudah lewat ditandai merah muda ──
const rowPropsFn = (data: unknown) => {
  const r = rowOf((data as { item?: unknown }).item);
  if (r?.Telat) return { style: "background:#fff1f0" };
  return {};
};

// ── Summary footer: hanya kolom Nominal (RET/PJG bernilai negatif) ──
const summaryFormatters = {
  Nominal: (rows: RekapBelumRealisasiRow[]) =>
    numFmt(
      Math.round(rows.reduce((s, r) => s + (Number(r.Nominal) || 0), 0) * 100) /
        100,
    ),
};

// ── Export ──
const isExporting = ref(false);

const onExport = async () => {
  const dataToExport: RekapBelumRealisasiRow[] =
    baseBrowseRef.value?.getFilteredItems?.() ?? items.value ?? [];

  if (!dataToExport.length) {
    toast.warning("Tidak ada data untuk diexport.");
    return;
  }

  isExporting.value = true;
  try {
    const columns: ExcelColumn[] = headers.map((h) => ({
      header: h.title,
      key: h.key,
      width: Math.max(10, Math.round(parseInt(h.width) / 7)),
      align: h.align ?? "left",
      numFmt: h.key === "Nominal" ? "#,##0.##" : undefined,
    }));

    const tanggalKeys: string[] = ["TglRekap", "TglNota", "TglRencana"];
    const rows = dataToExport.map((it) => {
      const row: Record<string, string | number> = {};
      columns.forEach((c) => {
        const val = it[c.key as keyof RekapBelumRealisasiRow];
        if (tanggalKeys.includes(c.key))
          row[c.key] = val ? formatTanggal(String(val)) : "";
        else row[c.key] = (val as string | number | null) ?? "";
      });
      return row;
    });

    const periode =
      startDate.value || endDate.value
        ? `${startDate.value ? formatTanggal(startDate.value) : "awal"} s/d ${endDate.value ? formatTanggal(endDate.value) : "sekarang"}`
        : "Semua";

    await exportExcelSingle(
      `Rekap_Belum_Realisasi_${new Date().toISOString().slice(0, 10)}.xlsx`,
      "Rekap Belum Realisasi",
      columns,
      rows,
      `Rekap Pembayaran Belum Realisasi  |  Tgl Rekap: ${periode}`,
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
    title="Rekap Pembayaran Belum Realisasi"
    menu-id="975"
    :icon="IconReceipt2"
    :headers="headers"
    :items="items ?? []"
    :is-loading="isLoading"
    v-model:filter-state="filterState"
    :can-export="true"
    item-value="id"
    :row-props-fn="rowPropsFn"
    :summary-columns="['Nominal']"
    :summary-formatters="summaryFormatters"
    @refresh="fetchData"
    @export="onExport"
  >
    <template #filter-left>
      <div class="f-group">
        <span class="f-label">Tgl Rekap</span>
        <input type="date" v-model="startDate" class="f-date" />
        <span class="f-sep">s/d</span>
        <input type="date" v-model="endDate" class="f-date" />
      </div>
      <div class="f-divider" />
      <div class="f-group">
        <span class="f-label">Tahap</span>
        <select v-model="tahap" class="f-select">
          <option value="ALL">Semua</option>
          <option value="BELUM_VOUCHER">Belum Voucher</option>
          <option value="BELUM_DIAJUKAN">Belum Diajukan</option>
          <option value="BELUM_REALISASI">Belum Realisasi</option>
        </select>
      </div>
    </template>

    <template #item.TglRekap="{ item }">
      {{ formatTanggal(rowOf(item).TglRekap) }}
    </template>
    <template #item.Tahap="{ item }">
      <span class="tahap-chip" :class="`tahap-${rowOf(item).TahapKode}`">
        {{ rowOf(item).Tahap }}
      </span>
    </template>
    <template #item.TglNota="{ item }">
      {{ rowOf(item).TglNota ? formatTanggal(rowOf(item).TglNota!) : "" }}
    </template>
    <template #item.Nominal="{ item }">
      <span class="num-cell">{{ numFmt(rowOf(item).Nominal) }}</span>
    </template>
    <template #item.TglRencana="{ item }">
      <span :class="{ 'rencana-telat': rowOf(item).Telat }">
        {{
          rowOf(item).TglRencana ? formatTanggal(rowOf(item).TglRencana!) : ""
        }}
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
.rencana-telat {
  color: #cc0000;
  font-weight: 700;
}

.tahap-chip {
  display: inline-block;
  padding: 1px 8px;
  border-radius: 10px;
  font-size: 11px;
  font-weight: 700;
  white-space: nowrap;
}
.tahap-BELUM_VOUCHER {
  background: #eceff1;
  color: #455a64;
}
.tahap-BELUM_DIAJUKAN {
  background: #fff3e0;
  color: #e65100;
}
.tahap-BELUM_REALISASI {
  background: #e3f2fd;
  color: #1565c0;
}
</style>
