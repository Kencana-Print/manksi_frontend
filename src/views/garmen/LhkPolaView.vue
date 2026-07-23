<script setup lang="ts">
import { ref, onMounted, watch, computed } from "vue";
import { useRouter } from "vue-router";
import { useToast } from "vue-toastification";
import BaseBrowse from "@/components/BaseBrowse.vue";
import { useBrowse } from "@/composables/useBrowse";
import { lhkPolaService } from "@/services/garmen/lhkPolaService";
import { IconRuler2, IconChevronRight } from "@tabler/icons-vue";
import { formatTanggal, formatTanggalJam } from "@/utils/dateFormat";

const router = useRouter();
const toast = useToast();

// ── Filter periode ───────────────────────────────────────────────────
const today = new Date().toISOString().substring(0, 10);
const SESSION_KEY = "lhk_pola_browse_filter";
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
  selected,
  canInsert,
  canEdit,
  canDelete,
  canExport,
  selectedItem,
  fetchData,
} = useBrowse({
  menuId: "174",
  fetchApi: async () => {
    const res = await lhkPolaService.getBrowse({
      startDate: filterState.value.dtAwal,
      endDate: filterState.value.dtAkhir,
    });
    return res.data.data;
  },
  immediate: false,
});

onMounted(fetchData);

// ── Headers ────────────────────────────────────────────────────────────
const headers = [
  { title: "Nomor", key: "Nomor", width: "150px" },
  { title: "Tanggal", key: "Tanggal", width: "100px", align: "center" },
  { title: "Keterangan", key: "Keterangan", minWidth: "220px" },
  { title: "Jml Marker", key: "JmlMarker", width: "100px", align: "right" },
  { title: "Jml Grading", key: "JmlGrading", width: "100px", align: "right" },
  { title: "User", key: "UserCreate", width: "90px" },
  { title: "Created", key: "DateCreate", width: "140px", align: "center" },
];

// ── Expand row — muat detail Marker & Grading on-demand ────────────────
const expandedRows = ref<any[]>([]);
const detailCache = ref<Record<string, { marker: any[]; grading: any[] }>>({});
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
      const res = await lhkPolaService.getDetail(nomor);
      detailCache.value[nomor] = {
        marker: res.data.data.marker || [],
        grading: res.data.data.grading || [],
      };
    } catch {
      toast.error(`Gagal muat detail ${nomor}`);
      detailCache.value[nomor] = { marker: [], grading: [] };
    } finally {
      expandedLoading.value[nomor] = false;
    }
  }
};

// ── Handlers ─────────────────────────────────────────────────────────
const onAdd = () => router.push("/garmen/lhk-pola/create");
const onEdit = (item: any) =>
  router.push(`/garmen/lhk-pola/edit/${encodeURIComponent(item.Nomor)}`);
const onDelete = async (item: any) => {
  try {
    await lhkPolaService.deleteData(item.Nomor);
    toast.success("LHK Pola berhasil dihapus.");
    delete detailCache.value[item.Nomor];
    fetchData();
  } catch (e: any) {
    toast.error(e.response?.data?.message || "Gagal menghapus.");
  }
};
</script>

<template>
  <BaseBrowse
    title="LHK Pola"
    menu-id="174"
    :icon="IconRuler2"
    :headers="headers"
    :items="items ?? []"
    :is-loading="isLoading"
    v-model:selected="selected"
    v-model:filter-state="filterState"
    :can-insert="canInsert"
    :can-edit="canEdit"
    :can-delete="canDelete"
    :can-export="canExport"
    item-value="Nomor"
    show-expand
    :expanded="expandedRows"
    @update:expanded="onUpdateExpanded"
    @refresh="fetchData"
    @add="onAdd"
    @edit="onEdit"
    @delete="onDelete"
  >
    <template #filter-left>
      <div class="f-group">
        <span class="f-label">Periode</span>
        <input type="date" v-model="filterState.dtAwal" class="f-date" />
        <span class="f-sep">s/d</span>
        <input type="date" v-model="filterState.dtAkhir" class="f-date" />
      </div>
    </template>

    <template #item.Tanggal="{ item }">
      {{ formatTanggal(item.Tanggal) }}
    </template>
    <template #item.DateCreate="{ item }">
      {{ formatTanggalJam(item.DateCreate) }}
    </template>

    <!-- ── Expand: dua tabel bersanding, Marker (kiri) & Grading (kanan) ── -->
    <template #detail="{ item }">
      <div class="expand-wrap">
        <v-progress-linear
          v-if="expandedLoading[item.Nomor]"
          indeterminate
          color="primary"
          height="2"
        />
        <div v-else class="expand-cols">
          <!-- Marker / Mika / Duplek -->
          <div class="expand-col">
            <div class="expand-title">Daily Out Marker, Mika &amp; Duplek</div>
            <table class="det-table">
              <thead>
                <tr>
                  <th style="width: 26px">No</th>
                  <th style="width: 100px">No SPK</th>
                  <th>Nama SPK</th>
                  <th style="width: 90px">Lebar Kain</th>
                  <th style="width: 90px">Size</th>
                  <th style="width: 80px">For</th>
                  <th style="width: 80px">Mesin</th>
                  <th style="width: 130px">Keterangan</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="(r, i) in detailCache[item.Nomor]?.marker"
                  :key="r.id"
                >
                  <td class="tc">{{ i + 1 }}</td>
                  <td class="mono">{{ r.spkNomor }}</td>
                  <td>{{ r.namaSpk || "-" }}</td>
                  <td>{{ r.lebarKain || "-" }}</td>
                  <td>{{ r.size || "-" }}</td>
                  <td>{{ r.tujuanProses || "-" }}</td>
                  <td>
                    <span
                      class="mesin-chip"
                      :class="'chip-' + (r.mesin || '').toLowerCase()"
                    >
                      {{ r.mesin || "-" }}
                    </span>
                  </td>
                  <td>{{ r.keterangan || "-" }}</td>
                </tr>
                <tr v-if="!detailCache[item.Nomor]?.marker?.length">
                  <td colspan="8" class="empty-row">Tidak ada data</td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Pola / Grading -->
          <div class="expand-col">
            <div class="expand-title">Daily Out Pola</div>
            <table class="det-table">
              <thead>
                <tr>
                  <th style="width: 26px">No</th>
                  <th style="width: 100px">No SPK</th>
                  <th>Nama SPK</th>
                  <th style="width: 90px">Divisi</th>
                  <th style="width: 130px">Grading Size</th>
                  <th style="width: 130px">Keterangan</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="(r, i) in detailCache[item.Nomor]?.grading"
                  :key="r.id"
                >
                  <td class="tc">{{ i + 1 }}</td>
                  <td class="mono">{{ r.spkNomor }}</td>
                  <td>{{ r.namaSpk || "-" }}</td>
                  <td>
                    <span class="divisi-chip">{{ r.divisi || "-" }}</span>
                  </td>
                  <td>{{ r.gradingSize || "-" }}</td>
                  <td>{{ r.keterangan || "-" }}</td>
                </tr>
                <tr v-if="!detailCache[item.Nomor]?.grading?.length">
                  <td colspan="6" class="empty-row">Tidak ada data</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
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
.expand-cols {
  display: flex;
  gap: 10px;
}
.expand-col {
  flex: 1;
  min-width: 0;
}
.expand-title {
  font-size: 11px;
  font-weight: 700;
  color: #1565c0;
  margin-bottom: 4px;
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
.mesin-chip {
  display: inline-block;
  padding: 1px 7px;
  border-radius: 8px;
  font-size: 9.5px;
  font-weight: 700;
  background: #eceff1;
  color: #455a64;
}
.chip-marker {
  background: #e3f2fd;
  color: #1565c0;
}
.chip-duplek {
  background: #fff3e0;
  color: #e65100;
}
.chip-mika {
  background: #f3e5f5;
  color: #7b1fa2;
}
.chip-cutting {
  background: #e8f5e9;
  color: #2e7d32;
}
.divisi-chip {
  display: inline-block;
  padding: 1px 7px;
  border-radius: 8px;
  font-size: 9.5px;
  font-weight: 700;
  background: #e8f5e9;
  color: #2e7d32;
}
</style>
