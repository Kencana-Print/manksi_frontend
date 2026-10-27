<script setup lang="ts">
import { ref, computed, onMounted, watch } from "vue";
import { useRouter } from "vue-router";
import { useToast } from "vue-toastification";
import BaseBrowse from "@/components/BaseBrowse.vue";
import { useBrowse } from "@/composables/useBrowse";
import {
  perawatanService,
  type PerawatanRow,
  type PerawatanDetailRow,
} from "@/services/ga/perawatanService";
import { exportExcelSingle, type ExcelColumn } from "@/utils/excelExport";
import { formatTanggal } from "@/utils/dateFormat";
import { IconTool, IconEye, IconTrash } from "@tabler/icons-vue";

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

// ── Composable useBrowse (menuId: 611) ─────────────────────────────────
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
  menuId: "611",
  fetchApi: async () => {
    const res = await perawatanService.getBrowse({
      tglAwal: tglAwal.value,
      tglAkhir: tglAkhir.value,
    });
    return res.data.data ?? [];
  },
});

const selectedItem = computed(
  () => (selected.value[0] as unknown as PerawatanRow) ?? null,
);

// ── Headers Tabel Master Sesuai Delphi 7 ───────────────────────────────
const headers = [
  { title: "NOMOR", key: "Nomor", width: "150px" },
  { title: "TANGGAL", key: "Tanggal", width: "110px", align: "center" as const },
  { title: "NO. POLISI", key: "NoPolisi", width: "130px", align: "center" as const },
  { title: "NAMA KENDARAAN", key: "NamaKendaraan", width: "180px" },
  { title: "STATUS", key: "Stat", width: "120px", align: "center" as const },
  { title: "BENGKEL", key: "Bengkel", width: "180px" },
  { title: "KM", key: "KM", width: "110px", align: "right" as const },
  { title: "KETERANGAN", key: "Keterangan", minWidth: "220px" },
  {
    title: "TOTAL BIAYA (RP)",
    key: "TotalBiaya",
    width: "160px",
    align: "right" as const,
  },
];

// ── Headers Detail Expandable Row ─────────────────────────────────────
const detailHeaders = [
  { title: "No", key: "No_urut", width: "50px" },
  { title: "Nama Barang / Jasa", key: "Nama", minWidth: "220px" },
  { title: "Satuan", key: "Satuan", width: "90px" },
  { title: "Qty", key: "Qty", width: "70px", align: "right" as const },
  { title: "Nominal (Rp)", key: "Nominal", width: "130px", align: "right" as const },
  { title: "Total (Rp)", key: "Total", width: "140px", align: "right" as const },
  { title: "Tgl Beli", key: "TglBeli", width: "110px", align: "center" as const },
];

const expanded = ref<PerawatanRow[]>([]);
const detailCache = ref<Record<string, PerawatanDetailRow[]>>({});
const loadingDetails = ref<Set<string>>(new Set());

const onUpdateExpanded = async (val: any[]) => {
  const nomors: string[] = val.map((v) =>
    typeof v === "object" ? v.Nomor : v,
  );
  expanded.value = val;

  for (const nomor of nomors) {
    if (!detailCache.value[nomor]) {
      loadingDetails.value = new Set([...loadingDetails.value, nomor]);
      try {
        const res = await perawatanService.getDetail(nomor);
        detailCache.value[nomor] = res.data.data || [];
      } catch {
        detailCache.value[nomor] = [];
        toast.error(`Gagal memuat detail perawatan ${nomor}`);
      } finally {
        const next = new Set(loadingDetails.value);
        next.delete(nomor);
        loadingDetails.value = next;
      }
    }
  }
};

// ── Navigasi Form ─────────────────────────────────────────────────────
const goNew = () => {
  router.push({ name: "GaPerawatanCreate" });
};

const goEdit = (item: { Nomor: string }) => {
  router.push({
    name: "GaPerawatanEdit",
    params: { nomor: item.Nomor },
  });
};

// ── Hapus Data ────────────────────────────────────────────────────────
const onDelete = async (item: { Nomor: string; NoPolisi?: string }) => {
  const target = item || selectedItem.value;
  if (!target || !target.Nomor) {
    toast.warning("Pilih data yang ingin dihapus terlebih dahulu.");
    return;
  }

  const konfirmasi = window.confirm(
    `Yakin ingin menghapus data perawatan [${target.Nomor}] ${target.NoPolisi ? `(Kendaraan ${target.NoPolisi})` : ""} ?`,
  );
  if (!konfirmasi) return;

  try {
    await perawatanService.deleteData(target.Nomor);
    toast.success(`Data Perawatan ${target.Nomor} berhasil dihapus.`);
    delete detailCache.value[target.Nomor];
    clearSelection();
    await fetchData();
  } catch (err: any) {
    toast.error(
      err.response?.data?.message || err.message || "Gagal menghapus data perawatan.",
    );
  }
};

// ── Export Excel ───────────────────────────────────────────────────────
const isExporting = ref(false);

const exportColumns: ExcelColumn[] = [
  { header: "Nomor", key: "Nomor", width: 18, align: "left" },
  { header: "Tanggal", key: "Tanggal", width: 12, align: "center" },
  { header: "No. Polisi", key: "NoPolisi", width: 14, align: "center" },
  { header: "Nama Kendaraan", key: "NamaKendaraan", width: 22, align: "left" },
  { header: "Status", key: "Stat", width: 14, align: "center" },
  { header: "Bengkel", key: "Bengkel", width: 22, align: "left" },
  { header: "KM", key: "KM", width: 12, align: "right" },
  { header: "Keterangan", key: "Keterangan", width: 30, align: "left" },
  { header: "Total Biaya", key: "TotalBiaya", width: 18, align: "right" },
];

const onExport = async () => {
  const rows = items.value ?? [];
  if (!rows.length) {
    toast.warning("Tidak ada data untuk diexport.");
    return;
  }
  isExporting.value = true;
  try {
    const title = `Perawatan Kendaraan — ${tglAwal.value} s.d. ${tglAkhir.value}`;
    await exportExcelSingle(
      `Perawatan_Kendaraan_${tglAwal.value}_${tglAkhir.value}.xlsx`,
      "Perawatan",
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
    title="Browse Perawatan"
    menu-id="611"
    storage-id="611"
    :icon="IconTool"
    :headers="headers"
    :items="items ?? []"
    :is-loading="isLoading"
    item-value="Nomor"
    :can-insert="canInsert"
    :can-edit="canEdit"
    :can-delete="canDelete"
    :can-export="canExport"
    :show-expand="true"
    :expanded="expanded"
    :selected="selected"
    :filter-state="filterState"
    search-placeholder="Cari nomor, nopol, bengkel, keterangan..."
    @refresh="fetchData"
    @add="goNew"
    @edit="goEdit"
    @delete="onDelete"
    @export="onExport"
    @update:expanded="onUpdateExpanded"
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

    <!-- Custom Render Kolom Nomor -->
    <template #item.Nomor="{ item }">
      <span class="font-weight-bold font-mono text-primary">
        {{ item.Nomor }}
      </span>
    </template>

    <!-- Custom Render Kolom Tanggal -->
    <template #item.Tanggal="{ item }">
      {{ formatTanggal(item.Tanggal) }}
    </template>

    <!-- Custom Render No. Polisi -->
    <template #item.NoPolisi="{ item }">
      <span class="font-weight-bold font-mono">
        {{ item.NoPolisi || "—" }}
      </span>
    </template>

    <!-- Custom Render Status Kendaraan -->
    <template #item.Stat="{ item }">
      <v-chip
        v-if="item.Stat"
        size="x-small"
        :color="item.Stat === 'INVENTARIS' ? 'primary' : 'teal'"
        variant="tonal"
      >
        {{ item.Stat }}
      </v-chip>
      <span v-else>—</span>
    </template>

    <!-- Custom Render KM -->
    <template #item.KM="{ item }">
      {{ Number(item.KM || 0).toLocaleString("id-ID") }}
    </template>

    <!-- Custom Render Total Biaya -->
    <template #item.TotalBiaya="{ item }">
      <span class="font-weight-bold font-mono text-primary">
        Rp {{ Number(item.TotalBiaya || 0).toLocaleString("id-ID") }}
      </span>
    </template>

    <!-- Expanded Row: Detail Barang/Jasa Perawatan -->
    <template #detail="{ item }">
      <div v-if="loadingDetails.has(item.Nomor)" class="detail-loading">
        <v-progress-circular indeterminate size="20" color="primary" />
        <span>Memuat rincian perawatan...</span>
      </div>

      <div v-else-if="detailCache[item.Nomor]?.length" class="detail-wrapper">
        <div class="detail-title">
          Rincian Barang / Jasa Perawatan ({{ detailCache[item.Nomor].length }} item):
        </div>
        <table class="detail-table">
          <thead>
            <tr>
              <th
                v-for="h in detailHeaders"
                :key="h.key"
                :style="{ width: h.width, textAlign: (h.align as any) || 'left' }"
              >
                {{ h.title }}
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(row, idx) in detailCache[item.Nomor]" :key="idx">
              <td class="text-center">{{ row.No_urut || idx + 1 }}</td>
              <td class="font-weight-medium">{{ row.Nama }}</td>
              <td>{{ row.Satuan || "—" }}</td>
              <td class="text-right">{{ Number(row.Qty).toLocaleString("id-ID") }}</td>
              <td class="text-right font-mono">
                Rp {{ Number(row.Nominal).toLocaleString("id-ID") }}
              </td>
              <td class="text-right font-mono font-weight-bold">
                Rp {{ Number(row.Total).toLocaleString("id-ID") }}
              </td>
              <td class="text-center">
                {{ row.TglBeli ? formatTanggal(row.TglBeli) : "—" }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-else class="detail-empty">
        Tidak ada rincian barang/jasa terdaftar untuk perawatan ini.
      </div>
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
  color: #555;
  white-space: nowrap;
}
.f-date {
  font-size: 11px;
  padding: 3px 6px;
  border: 1px solid #ccc;
  border-radius: 4px;
  outline: none;
  background-color: #fff;
  height: 26px;
}
.f-date:focus {
  border-color: #1565c0;
}

.font-mono {
  font-family: monospace;
}

.detail-wrapper {
  padding: 10px 16px;
  background-color: #fcfcfc;
}
.detail-title {
  font-size: 12px;
  font-weight: 700;
  color: #37474f;
  margin-bottom: 6px;
}
.detail-loading {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  font-size: 12px;
  color: #666;
}
.detail-empty {
  padding: 10px 16px;
  font-size: 11px;
  font-style: italic;
  color: #888;
}
.detail-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
  background-color: #fff;
  border: 1px solid #e0e0e0;
}
.detail-table th {
  background-color: #f5f5f5;
  color: #424242;
  font-weight: 600;
  padding: 6px 10px;
  border: 1px solid #e0e0e0;
}
.detail-table td {
  padding: 6px 10px;
  border: 1px solid #eee;
  color: #333;
}
</style>
