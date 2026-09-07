<script setup lang="ts">
import { ref, onMounted, watch, computed } from "vue";
import { useToast } from "vue-toastification";
import { useRouter } from "vue-router";
import BaseBrowse from "@/components/BaseBrowse.vue";
import { useBrowse } from "@/composables/useBrowse";
import { lhkMarkerService } from "@/services/ppic/lhkMarkerService";
import { lhkMarkerFormService } from "@/services/ppic/lhkMarkerFormService";
import { IconRuler2, IconFileSpreadsheet } from "@tabler/icons-vue";
import { formatTanggal, formatTanggalJam } from "@/utils/dateFormat";
import { exportExcelSingle, type ExcelColumn } from "@/utils/excelExport";

const toast = useToast();
const router = useRouter();

// ── Filter periode ───────────────────────────────────────────────────
const today = new Date().toISOString().substring(0, 10);
const SESSION_KEY = "lhk_marker_browse_filter";
const savedFilter = (() => {
  try {
    return JSON.parse(sessionStorage.getItem(SESSION_KEY) || "{}");
  } catch {
    return {};
  }
})();
const filterState = ref({
  dtAwal: savedFilter.dtAwal || today,
  dtAkhir: savedFilter.dtAkhir || today,
});

watch(
  filterState,
  (val) => {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(val));
    fetchData();
  },
  { deep: true },
);

const {
  items,
  isLoading,
  canInsert,
  canEdit,
  canDelete,
  canExport,
  selected,
  fetchData,
} = useBrowse({
  menuId: "179",
  fetchApi: async () => {
    const res = await lhkMarkerService.getBrowse({
      startDate: filterState.value.dtAwal,
      endDate: filterState.value.dtAkhir,
    });
    return res.data.data;
  },
  immediate: false,
});
const selectedItem = computed(() => selected.value?.[0] ?? null);

const onAdd = () => router.push({ name: "PpicLhkMarkerCreate" });
const onEdit = (item: any) =>
  router.push({ name: "PpicLhkMarkerEdit", params: { nomor: item.Nomor } });
const onDelete = async (item: any) => {
  try {
    await lhkMarkerFormService.deleteData(item.Nomor);
    toast.success("LHK Marker berhasil dihapus.");
    fetchData();
  } catch (e: any) {
    toast.error(e.response?.data?.message || "Gagal hapus.");
  }
};

onMounted(fetchData);

// ── Headers — read-only browse, khusus sisi Marker ──────────────────
const headers = [
  { title: "Nomor", key: "Nomor", width: "150px" },
  { title: "Tanggal", key: "Tanggal", width: "100px", align: "center" },
  { title: "Keterangan", key: "Keterangan", minWidth: "200px" },
  { title: "Pembuat", key: "Pembuat", width: "140px" },
  { title: "Jml Marker", key: "JmlMarker", width: "100px", align: "right" },
  { title: "User", key: "UserCreate", width: "90px" },
  { title: "Created", key: "DateCreate", width: "140px", align: "center" },
];

// ── Expand row — cuma tabel Marker (bukan Grading) ──────────────────
const expandedRows = ref<any[]>([]);
const detailCache = ref<Record<string, any[]>>({});
const expandedLoading = ref<Record<string, boolean>>({});

const onUpdateExpanded = async (newExpanded: any[]) => {
  expandedRows.value = newExpanded;
  const newlyExpanded = newExpanded.filter(
    (item) =>
      !detailCache.value[item.Nomor] && !expandedLoading.value[item.Nomor],
  );
  for (const item of newlyExpanded) {
    const nomor = item.Nomor;
    expandedLoading.value[nomor] = true;
    try {
      const res = await lhkMarkerService.getDetail(nomor);
      detailCache.value[nomor] = res.data.data.marker || [];
    } catch {
      toast.error(`Gagal muat detail ${nomor}`);
      detailCache.value[nomor] = [];
    } finally {
      expandedLoading.value[nomor] = false;
    }
  }
};

const baseBrowseRef = ref<InstanceType<typeof BaseBrowse> | null>(null);
const getExportSource = () =>
  baseBrowseRef.value?.getFilteredItems() ?? items.value ?? [];

// ── Export ────────────────────────────────────────────────────────
const onExport = async () => {
  const source = getExportSource();
  if (!source.length) return toast.warning("Tidak ada data untuk diekspor.");

  const columns: ExcelColumn[] = [
    { header: "Nomor", key: "Nomor", width: 18 },
    { header: "Tanggal", key: "Tanggal", width: 12, align: "center" },
    { header: "Keterangan", key: "Keterangan", width: 30 },
    { header: "Pembuat", key: "Pembuat", width: 20 },
    {
      header: "Jml Marker",
      key: "JmlMarker",
      width: 12,
      align: "right",
      numFmt: "#,##0",
    },
    { header: "User", key: "UserCreate", width: 12 },
    { header: "Created", key: "DateCreate", width: 16, align: "center" },
  ];

  const rows = source.map((r: any) => ({
    ...r,
    Tanggal: formatTanggal(r.Tanggal),
    DateCreate: formatTanggalJam(r.DateCreate),
  }));

  await exportExcelSingle(
    `LHK_Marker_${filterState.value.dtAwal}_${filterState.value.dtAkhir}.xlsx`,
    "LHK Marker",
    columns,
    rows,
    `LHK Marker Periode ${filterState.value.dtAwal} s/d ${filterState.value.dtAkhir}`,
  );
};

const isExportingDetail = ref(false);

const onExportDetail = async () => {
  const source = getExportSource();
  if (!source.length) return toast.warning("Tidak ada data untuk diexport.");

  isExportingDetail.value = true;
  try {
    const missing = source.filter((r: any) => !detailCache.value[r.Nomor]);
    if (missing.length > 0) {
      await Promise.all(
        missing.map(async (r: any) => {
          try {
            const res = await lhkMarkerService.getDetail(r.Nomor);
            detailCache.value[r.Nomor] = res.data.data.marker || [];
          } catch {
            detailCache.value[r.Nomor] = [];
          }
        }),
      );
    }

    const rows: any[] = [];
    source.forEach((master: any) => {
      const det = detailCache.value[master.Nomor] || [];
      if (det.length > 0) {
        det.forEach((r: any) => {
          rows.push({
            Nomor: master.Nomor,
            Tanggal: formatTanggal(master.Tanggal),
            Pembuat: master.Pembuat || "",
            "No SPK": r.spkNomor,
            "Nama SPK": r.namaSpk || "",
            "Lebar Kain": r.lebarKain || "",
            Size: r.size || "",
            For: r.tujuanProses || "",
            Keterangan: r.keterangan || "",
          });
        });
      } else {
        rows.push({
          Nomor: master.Nomor,
          Tanggal: formatTanggal(master.Tanggal),
          Pembuat: master.Pembuat || "",
          "No SPK": "",
          "Nama SPK": "(Tidak ada data marker)",
          "Lebar Kain": "",
          Size: "",
          For: "",
          Keterangan: "",
        });
      }
    });

    if (!rows.length) return toast.warning("Tidak ada rincian untuk diexport.");

    const columns: ExcelColumn[] = [
      { header: "Nomor", key: "Nomor", width: 16 },
      { header: "Tanggal", key: "Tanggal", width: 12, align: "center" },
      { header: "Pembuat", key: "Pembuat", width: 20 },
      { header: "No SPK", key: "No SPK", width: 14 },
      { header: "Nama SPK", key: "Nama SPK", width: 26 },
      { header: "Lebar Kain", key: "Lebar Kain", width: 12 },
      { header: "Size", key: "Size", width: 10 },
      { header: "For", key: "For", width: 12 },
      { header: "Keterangan", key: "Keterangan", width: 20 },
    ];

    await exportExcelSingle(
      `LHK_Marker_Detail_${filterState.value.dtAwal}_${filterState.value.dtAkhir}.xlsx`,
      "Detail Marker",
      columns,
      rows,
      `Daily Out Marker | Periode ${filterState.value.dtAwal} s/d ${filterState.value.dtAkhir}`,
    );
    toast.success("Berhasil export detail data.");
  } catch (e) {
    console.error(e);
    toast.error("Gagal melakukan export detail.");
  } finally {
    isExportingDetail.value = false;
  }
};
</script>

<template>
  <BaseBrowse
    ref="baseBrowseRef"
    title="LHK Marker"
    menu-id="179"
    :icon="IconRuler2"
    :headers="headers"
    :items="items ?? []"
    :is-loading="isLoading"
    v-model:filter-state="filterState"
    :can-insert="canInsert"
    :can-edit="canEdit"
    :can-delete="canDelete"
    :can-export="canExport"
    :selected="selected"
    @update:selected="selected = $event"
    @add="onAdd"
    @edit="onEdit"
    @delete="onDelete"
    item-value="Nomor"
    show-expand
    :expanded="expandedRows"
    @update:expanded="onUpdateExpanded"
    @refresh="fetchData"
    @export="onExport"
  >
    <template #filter-left>
      <div class="f-group">
        <span class="f-label">Periode</span>
        <input type="date" v-model="filterState.dtAwal" class="f-date" />
        <span class="f-sep">s/d</span>
        <input type="date" v-model="filterState.dtAkhir" class="f-date" />
      </div>
    </template>

    <template #extra-actions>
      <v-btn
        size="small"
        color="green-darken-3"
        variant="outlined"
        :loading="isExportingDetail"
        @click="onExportDetail"
      >
        <template #prepend>
          <IconFileSpreadsheet :size="15" :stroke-width="1.7" />
        </template>
        Export Detail
      </v-btn>
    </template>

    <template #item.Tanggal="{ item }">
      {{ formatTanggal(item.Tanggal) }}
    </template>
    <template #item.DateCreate="{ item }">
      {{ formatTanggalJam(item.DateCreate) }}
    </template>

    <!-- ── Expand: hanya tabel Marker ── -->
    <template #detail="{ item }">
      <div class="expand-wrap">
        <v-progress-linear
          v-if="expandedLoading[item.Nomor]"
          indeterminate
          color="primary"
          height="2"
        />
        <table v-else class="det-table">
          <thead>
            <tr>
              <th style="width: 26px">No</th>
              <th style="width: 100px">No SPK</th>
              <th>Nama SPK</th>
              <th style="width: 90px">Lebar Kain</th>
              <th style="width: 90px">Size</th>
              <th style="width: 80px">For</th>
              <th style="width: 130px">Keterangan</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(r, i) in detailCache[item.Nomor]" :key="r.id">
              <td class="tc">{{ i + 1 }}</td>
              <td class="mono">{{ r.spkNomor }}</td>
              <td>{{ r.namaSpk || "-" }}</td>
              <td>{{ r.lebarKain || "-" }}</td>
              <td>{{ r.size || "-" }}</td>
              <td>{{ r.tujuanProses || "-" }}</td>
              <td>{{ r.keterangan || "-" }}</td>
            </tr>
            <tr v-if="!detailCache[item.Nomor]?.length">
              <td colspan="7" class="empty-row">Tidak ada data</td>
            </tr>
          </tbody>
        </table>
      </div>
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
.f-date {
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
.expand-wrap {
  padding: 10px 10px 10px 40px;
  background: #eceff1;
}
.det-table {
  width: 100%;
  border-collapse: collapse;
  background: white;
  border-radius: 4px;
  overflow: hidden;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
  font-size: 10.5px;
}
.det-table th {
  background: #546e7a;
  color: white;
  text-align: left;
  padding: 5px 7px;
  font-size: 10px;
  white-space: nowrap;
}
.det-table td {
  padding: 4px 7px;
  border-bottom: 1px solid #eee;
}
.tc {
  text-align: center;
}
.mono {
  font-family: monospace;
  color: #1565c0;
  font-weight: 600;
}
.empty-row {
  text-align: center;
  padding: 12px;
  color: #9e9e9e;
  font-style: italic;
}
</style>
