<script setup lang="ts">
import { ref, computed, onMounted, watch, onBeforeUnmount } from "vue";
import { useRouter } from "vue-router";
import { useToast } from "vue-toastification";
import { useAuthStore } from "@/stores/authStore";
import BaseBrowse from "@/components/BaseBrowse.vue";
import { useBrowse } from "@/composables/useBrowse";
import { poExternalGarmenService } from "@/services/pembelian/poExternalGarmenService";
import { exportExcelSingle, type ExcelColumn } from "@/utils/excelExport";
import { formatTanggal, formatTanggalJam } from "@/utils/dateFormat";
import {
  IconShoppingBagPlus,
  IconPrinter,
  IconFileExport,
  IconShieldLock,
  IconDotsVertical,
  IconX,
} from "@tabler/icons-vue";

const router = useRouter();
const toast = useToast();
const authStore = useAuthStore();

const canLihatHarga = computed(() => authStore.user?.flags?.lihatHarga === 1);

// ── Filter tanggal — default awal bulan s.d. hari ini ──
const today = new Date();
const padDate = (n: number) => String(n).padStart(2, "0");
const toLocalDate = (d: Date) =>
  `${d.getFullYear()}-${padDate(d.getMonth() + 1)}-${padDate(d.getDate())}`;
const firstDayOfMonth = toLocalDate(
  new Date(today.getFullYear(), today.getMonth(), 1),
);
const todayStr = toLocalDate(today);

const SESSION_KEY = "po_external_garmen_filter";
const savedFilter = (() => {
  try {
    return JSON.parse(sessionStorage.getItem(SESSION_KEY) || "{}");
  } catch {
    return {};
  }
})();

const filterState = ref({
  dtAwal: savedFilter.dtAwal || firstDayOfMonth,
  dtAkhir: savedFilter.dtAkhir || todayStr,
});

// ── Debounce fetch saat filter tanggal diketik manual — mencegah
// fetch berkali-kali per keystroke ──
const isInitialized = ref(false);
let filterDebounceTimer: ReturnType<typeof setTimeout> | null = null;
watch(
  filterState,
  (val) => {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(val));
    if (!isInitialized.value) return;
    if (filterDebounceTimer) clearTimeout(filterDebounceTimer);
    filterDebounceTimer = setTimeout(() => {
      fetchData();
    }, 500);
  },
  { deep: true },
);
onBeforeUnmount(() => {
  if (filterDebounceTimer) clearTimeout(filterDebounceTimer);
});

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
  menuId: "144",
  fetchApi: async () => {
    const res = await poExternalGarmenService.getBrowse({
      startDate: filterState.value.dtAwal,
      endDate: filterState.value.dtAkhir,
    });
    return res.data.data;
  },
  immediate: false,
});

onMounted(() => {
  isInitialized.value = true;
  fetchData();
});

// ── Headers ──
const baseHeaders = [
  { title: "Nomor", key: "Nomor", width: "150px", fixed: true },
  { title: "Tanggal", key: "Tanggal", width: "100px", align: "center" },
  { title: "Dateline PO", key: "DatelinePO", width: "100px", align: "center" },
  { title: "Cab", key: "Cab", width: "60px", align: "center" },
  { title: "SPK", key: "SPK", width: "150px" },
  { title: "Nama SPK", key: "NamaSPK", width: "220px" },
  { title: "Kd Sup", key: "KdSup", width: "80px" },
  { title: "Supplier", key: "Supplier", width: "180px" },
];
const hargaHeaders = [
  { title: "Nominal", key: "Nominal", width: "110px", align: "right" },
  { title: "DP", key: "DP", width: "100px", align: "right" },
  { title: "Voucher", key: "Voucher", width: "100px", align: "right" },
  { title: "Belum Bayar", key: "BelumBayar", width: "110px", align: "right" },
];
const tailHeaders = [
  { title: "Status", key: "Status", width: "90px", align: "center" },
  { title: "User", key: "Usr", width: "80px" },
  { title: "Created", key: "Created", width: "140px", align: "center" },
];
const headers = computed(() => [
  ...baseHeaders,
  ...(canLihatHarga.value ? hargaHeaders : []),
  ...tailHeaders,
]);

// ── Detail (expand) ──
const expandedRows = ref<any[]>([]);
const detailCache = ref<Record<string, any[]>>({});
const detailLoading = ref<Record<string, boolean>>({});
const onUpdateExpanded = async (newExpanded: any[]) => {
  expandedRows.value = newExpanded;
  const newlyExpanded = newExpanded.filter(
    (item) =>
      !detailCache.value[item.Nomor] && !detailLoading.value[item.Nomor],
  );
  for (const item of newlyExpanded) {
    const nomor = item.Nomor;
    detailLoading.value[nomor] = true;
    try {
      const res = await poExternalGarmenService.getDetail(nomor);
      detailCache.value[nomor] = res.data.data || [];
    } catch {
      toast.error(`Gagal memuat detail ${nomor}`);
    } finally {
      detailLoading.value[nomor] = false;
    }
  }
};

// ── Pewarnaan baris — replikasi persis cxGrdMasterCustomDrawCell Delphi ──
const rowPropsFn = (data: any) => {
  const item = data.item?.raw || data.item;
  const classes: string[] = ["font-weight-bold"];
  if (item.Status === "OPEN") classes.push("text-red-darken-1");
  else if (item.Status === "PROSES") classes.push("text-blue-darken-2");
  // CLOSE tidak diberi class khusus — default hitam
  return { class: classes.join(" ") };
};
const getNomorStyle = (ngedit: string) => {
  if (ngedit === "WAIT") return "background-color: #1976d2; color: #fff;";
  if (ngedit === "TOLAK") return "background-color: #d32f2f; color: #fff;";
  if (ngedit === "ACC") return "background-color: #388e3c; color: #fff;";
  return "";
};

// ── Handlers ──
const onAdd = () => router.push("/pembelian/po-external-garmen/create");
const onEdit = (item: any) => {
  const userCab = authStore.user?.cabang;
  if (userCab && userCab !== "HO-" && item.Cab !== userCab) {
    toast.warning("Data tsb bukan cabang anda.");
    return;
  }
  router.push(
    `/pembelian/po-external-garmen/edit/${encodeURIComponent(item.Nomor)}`,
  );
};
const onDelete = async (item: any) => {
  try {
    await poExternalGarmenService.deleteData(item.Nomor);
    toast.success("Data berhasil dihapus.");
    fetchData();
  } catch (e: any) {
    toast.error(e.response?.data?.message || "Gagal menghapus.");
  }
};
const onPrint = () => {
  if (!selectedItem.value) return;
  window.open(
    `/pembelian/po-external-garmen/print/${encodeURIComponent(selectedItem.value.Nomor)}`,
    "_blank",
  );
};

// ── Export ──
const isExporting = ref(false);
const NUMERIC_KEYS = new Set(["Nominal", "DP", "Voucher", "BelumBayar"]);
const onExportHeader = async () => {
  isExporting.value = true;
  try {
    const res = await poExternalGarmenService.exportHeader({
      startDate: filterState.value.dtAwal,
      endDate: filterState.value.dtAkhir,
    });
    const dataToExport = res.data.data || [];
    if (!dataToExport.length) {
      toast.warning("Tidak ada data untuk diexport.");
      return;
    }
    const columns: ExcelColumn[] = headers.value
      .filter((h) => h.key)
      .map((h: any) => ({
        header: h.title,
        key: h.key,
        width: h.width ? Math.max(10, Math.round(parseInt(h.width) / 7)) : 16,
        align: h.align ?? "left",
        numFmt: NUMERIC_KEYS.has(h.key) ? "#,##0" : undefined,
      }));
    const rows = dataToExport.map((it: any) => {
      const row: Record<string, any> = {};
      columns.forEach((c) => {
        let val = it[c.key];
        if (["Tanggal", "DatelinePO"].includes(c.key)) {
          val = val ? formatTanggal(val) : "";
        } else if (c.key === "Created") {
          val = val ? formatTanggalJam(val) : "";
        } else if (NUMERIC_KEYS.has(c.key)) {
          val = Number(val) || 0;
        }
        row[c.key] = val ?? "";
      });
      return row;
    });
    const periodeLabel = `Periode: ${formatTanggal(filterState.value.dtAwal)} s/d ${formatTanggal(filterState.value.dtAkhir)}`;
    await exportExcelSingle(
      `PO_External_Garmen_${filterState.value.dtAwal}_${filterState.value.dtAkhir}.xlsx`,
      "PO External Garmen",
      columns,
      rows,
      `Laporan PO External Garmen  |  ${periodeLabel}`,
    );
    toast.success("Berhasil export data.");
  } catch (e) {
    console.error(e);
    toast.error("Gagal export data.");
  } finally {
    isExporting.value = false;
  }
};

const isExportingDetail = ref(false);
const onExportDetail = async () => {
  isExportingDetail.value = true;
  try {
    const res = await poExternalGarmenService.exportDetail({
      startDate: filterState.value.dtAwal,
      endDate: filterState.value.dtAkhir,
    });
    const allDetail: any[] = res.data.data || [];
    if (!allDetail.length) {
      toast.warning("Tidak ada detail untuk diexport.");
      return;
    }

    // ✅ Kelompokkan per Nomor PO External — sama pola dgn export
    // detail MKB: baris pertama tiap grup bawa data header, baris
    // berikutnya dikosongkan supaya header tidak berulang di Excel.
    const groups: Record<string, any[]> = {};
    const order: string[] = [];
    allDetail.forEach((r) => {
      const key = r.Nomor;
      if (!groups[key]) {
        groups[key] = [];
        order.push(key);
      }
      groups[key].push(r);
    });

    const combinedRows: any[] = [];
    order.forEach((key) => {
      const rowsInGroup = groups[key];
      const first = rowsInGroup[0];
      // Data header — hanya muncul di baris pertama grup.
      // ⚠️ getExportDetail backend saat ini hanya return kolom
      // Nomor/Size/Jumlah/Terima/Kurang(+Tarif/Total) — TIDAK ada
      // kolom header lain (Tanggal, SPK, Supplier, dst). Kalau mau
      // kolom header itu ikut tampil di export detail, backend
      // getExportDetail perlu ditambah JOIN ke tpoexternal_hdr dulu
      // (lihat catatan di bawah kode ini).
      const masterCells = {
        Nomor: first.Nomor,
      };
      const blankMaster = Object.fromEntries(
        Object.keys(masterCells).map((k) => [k, ""]),
      );
      rowsInGroup.forEach((r, idx) => {
        combinedRows.push({
          ...(idx === 0 ? masterCells : blankMaster),
          Size: r.Size,
          Jumlah: Number(r.Jumlah) || 0,
          Terima: Number(r.Terima) || 0,
          Kurang: Number(r.Kurang) || 0,
          ...(canLihatHarga.value
            ? {
                Tarif: Number(r.Tarif) || 0,
                Total: Number(r.Total) || 0,
              }
            : {}),
        });
      });
    });

    const columns: ExcelColumn[] = [
      { header: "Nomor", key: "Nomor", width: 18 },
      { header: "Size", key: "Size", width: 12 },
      {
        header: "Jumlah",
        key: "Jumlah",
        width: 12,
        align: "right",
        numFmt: "#,##0",
      },
      {
        header: "Terima",
        key: "Terima",
        width: 12,
        align: "right",
        numFmt: "#,##0",
      },
      {
        header: "Kurang",
        key: "Kurang",
        width: 12,
        align: "right",
        numFmt: "#,##0",
      },
      ...(canLihatHarga.value
        ? [
            {
              header: "Tarif",
              key: "Tarif",
              width: 14,
              align: "right" as const,
              numFmt: "#,##0",
            },
            {
              header: "Total",
              key: "Total",
              width: 16,
              align: "right" as const,
              numFmt: "#,##0",
            },
          ]
        : []),
    ];

    const periodeLabel = `Periode: ${formatTanggal(filterState.value.dtAwal)} s/d ${formatTanggal(filterState.value.dtAkhir)}`;
    await exportExcelSingle(
      `PO_External_Garmen_Detail_${filterState.value.dtAwal}_${filterState.value.dtAkhir}.xlsx`,
      "PO External Garmen Detail",
      columns,
      combinedRows,
      `Detail PO External Garmen  |  ${periodeLabel}`,
    );
    toast.success("Berhasil export detail.");
  } catch (e) {
    console.error(e);
    toast.error("Gagal export detail.");
  } finally {
    isExportingDetail.value = false;
  }
};

// ── Pengajuan Perubahan Data ──
const pengajuanDialog = ref(false);
const pengajuanAlasan = ref("");
const pengajuanUrut = ref(0);
const isPengajuanLoading = ref(false);
const openPengajuanDialog = async () => {
  if (!selectedItem.value) return;
  isPengajuanLoading.value = true;
  try {
    const res = await poExternalGarmenService.getPengajuanInfo(
      selectedItem.value.Nomor,
    );
    const info = res.data.data;
    if (!info.perluPengajuan) {
      toast.info("Tidak perlu pengajuan perubahan data.");
      return;
    }
    pengajuanUrut.value = info.urut;
    pengajuanAlasan.value = info.alasan || "";
    pengajuanDialog.value = true;
  } catch (e: any) {
    toast.error(e.response?.data?.message || "Gagal memuat info pengajuan.");
  } finally {
    isPengajuanLoading.value = false;
  }
};
const submitPengajuan = async () => {
  if (!pengajuanAlasan.value.trim()) {
    toast.warning("Alasan harus di isi.");
    return;
  }
  try {
    await poExternalGarmenService.ajukanPerubahan(
      selectedItem.value.Nomor,
      pengajuanUrut.value,
      pengajuanAlasan.value,
    );
    toast.success("Berhasil diajukkan. Nunggu ACC");
    pengajuanDialog.value = false;
    fetchData();
  } catch (e: any) {
    toast.error(e.response?.data?.message || "Gagal mengirim pengajuan.");
  }
};

const numFmt = (v: any) => (v ? Number(v).toLocaleString("id-ID") : "0");
</script>

<template>
  <BaseBrowse
    title="PO External Garmen"
    menu-id="144"
    :icon="IconShoppingBagPlus"
    :headers="headers"
    :items="items ?? []"
    :is-loading="isLoading"
    v-model:selected="selected"
    :can-insert="canInsert"
    :can-edit="canEdit"
    :can-delete="canDelete"
    :can-export="canExport"
    item-value="Nomor"
    :row-props-fn="rowPropsFn"
    show-expand
    :expanded="expandedRows"
    @update:expanded="onUpdateExpanded"
    @add="onAdd"
    @edit="onEdit"
    @delete="onDelete"
    @refresh="fetchData"
    @export="onExportHeader"
  >
    <template #filter-left>
      <div class="f-group">
        <span class="f-label">Periode</span>
        <input type="date" v-model="filterState.dtAwal" class="f-date" />
        <span class="f-sep">s/d</span>
        <input type="date" v-model="filterState.dtAkhir" class="f-date" />
      </div>
    </template>

    <template #filter-right>
      <div class="legend-box">
        <div class="legend-row">
          <span class="legend-title">Status:</span>
          <div class="legend-item">
            <div class="legend-dot" style="background: #e53935"></div>
            Open
          </div>
          <div class="legend-item">
            <div class="legend-dot" style="background: #1565c0"></div>
            Proses
          </div>
          <div class="legend-item">
            <div class="legend-dot" style="background: #212121"></div>
            Close
          </div>
        </div>
        <div class="legend-divider" />
        <div class="legend-row">
          <span class="legend-title">Back (Nomor):</span>
          <div class="legend-item">
            <div class="legend-dot" style="background: #1565c0"></div>
            Nunggu
          </div>
          <div class="legend-item">
            <div class="legend-dot" style="background: #2e7d32"></div>
            Acc
          </div>
          <div class="legend-item">
            <div class="legend-dot" style="background: #c62828"></div>
            Tolak
          </div>
        </div>
      </div>
    </template>

    <template #extra-actions="{ selected }">
      <v-btn
        size="small"
        color="grey-darken-3"
        :disabled="selected.length === 0"
        @click="onPrint"
      >
        <template #prepend><IconPrinter :size="15" /></template>Cetak
      </v-btn>
      <v-btn
        size="small"
        color="teal-darken-2"
        :loading="isExportingDetail"
        @click="onExportDetail"
      >
        <template #prepend><IconFileExport :size="15" /></template>Export Detail
      </v-btn>
      <v-menu v-if="selected.length > 0">
        <template #activator="{ props }">
          <v-btn size="small" color="indigo-darken-2" v-bind="props">
            <template #prepend><IconDotsVertical :size="15" /></template>
            Tindakan
          </v-btn>
        </template>
        <v-list density="compact" class="text-caption">
          <v-list-item
            @click="openPengajuanDialog"
            :disabled="isPengajuanLoading"
          >
            <template #prepend>
              <IconShieldLock :size="14" class="mr-2 text-primary" />
            </template>
            <v-list-item-title>Pengajuan Perubahan Data</v-list-item-title>
          </v-list-item>
        </v-list>
      </v-menu>
    </template>

    <template #item.Nomor="{ item }">
      <div class="nomor-cell" :style="getNomorStyle(item.Ngedit)">
        {{ item.Nomor }}
      </div>
    </template>
    <template #item.Tanggal="{ item }">
      {{ formatTanggal(item.Tanggal) }}
    </template>
    <template #item.DatelinePO="{ item }">
      {{ formatTanggal(item.DatelinePO) }}
    </template>
    <template #item.Created="{ item }">
      {{ formatTanggalJam(item.Created) }}
    </template>
    <template #item.Nominal="{ item }">{{ numFmt(item.Nominal) }}</template>
    <template #item.DP="{ item }">{{ numFmt(item.DP) }}</template>
    <template #item.Voucher="{ item }">{{ numFmt(item.Voucher) }}</template>
    <template #item.BelumBayar="{ item }">
      <span :style="item.BelumBayar < 0 ? 'color:#c62828;font-weight:700' : ''">
        {{ numFmt(item.BelumBayar) }}
      </span>
    </template>

    <template #detail="{ item }">
      <div class="expand-wrap">
        <v-progress-linear
          v-if="detailLoading[item.Nomor]"
          indeterminate
          color="primary"
          height="2"
        />
        <div v-else>
          <div class="expand-title mb-2">Detail — {{ item.Nomor }}</div>
          <table class="detail-table">
            <thead>
              <tr>
                <th width="80">Size</th>
                <th width="90" class="tr">Jumlah</th>
                <th width="90" class="tr">Terima</th>
                <th width="90" class="tr">Kurang</th>
                <th v-if="canLihatHarga" width="100" class="tr">Tarif</th>
                <th v-if="canLihatHarga" width="110" class="tr">Total</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(d, i) in detailCache[item.Nomor]" :key="i">
                <td class="fw-bold">{{ d.Size }}</td>
                <td class="tr">{{ numFmt(d.Jumlah) }}</td>
                <td class="tr">{{ numFmt(d.Terima) }}</td>
                <td
                  class="tr"
                  :class="{ 'text-error fw-bold': Number(d.Kurang) > 0 }"
                >
                  {{ numFmt(d.Kurang) }}
                </td>
                <td v-if="canLihatHarga" class="tr">{{ numFmt(d.Tarif) }}</td>
                <td v-if="canLihatHarga" class="tr">{{ numFmt(d.Total) }}</td>
              </tr>
              <tr
                v-if="
                  !detailCache[item.Nomor] ||
                  detailCache[item.Nomor].length === 0
                "
              >
                <td
                  :colspan="canLihatHarga ? 6 : 4"
                  class="text-center text-grey italic py-4"
                >
                  Data detail tidak ditemukan.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </template>
  </BaseBrowse>

  <!-- Dialog Pengajuan Perubahan Data -->
  <v-dialog v-model="pengajuanDialog" max-width="420px" persistent>
    <v-card rounded="lg">
      <v-card-title class="bg-primary text-white pa-3 text-subtitle-1">
        Pengajuan Perubahan Data
      </v-card-title>
      <v-card-text class="pa-4">
        <p class="text-caption mb-2">
          Nomor: <b>{{ selectedItem?.Nomor }}</b>
        </p>
        <v-textarea
          v-model="pengajuanAlasan"
          label="Alasan"
          variant="outlined"
          density="compact"
          rows="3"
          hide-details
          autofocus
        />
      </v-card-text>
      <v-card-actions class="pa-3 border-t">
        <v-spacer />
        <v-btn variant="text" @click="pengajuanDialog = false">Batal</v-btn>
        <v-btn color="primary" variant="elevated" @click="submitPengajuan">
          Ajukan
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
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
.nomor-cell {
  padding: 2px 8px;
  border-radius: 4px;
  font-family: monospace;
  display: inline-block;
  min-width: 100%;
}
.legend-box {
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  padding: 4px 8px;
  display: flex;
  flex-direction: column;
  gap: 3px;
}
.legend-row {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: nowrap;
}
.legend-title {
  font-size: 10px;
  font-weight: 700;
  color: #555;
  white-space: nowrap;
  flex-shrink: 0;
}
.legend-item {
  display: flex;
  align-items: center;
  gap: 3px;
  font-size: 10px;
  color: #424242;
  white-space: nowrap;
}
.legend-dot {
  width: 9px;
  height: 9px;
  border-radius: 2px;
  flex-shrink: 0;
}
.legend-divider {
  height: 1px;
  background: #eeeeee;
}
.expand-wrap {
  padding: 10px 10px 10px 50px;
  background: #eceff1;
}
.expand-title {
  font-size: 12px;
  font-weight: 700;
  color: #1565c0;
}
.mb-2 {
  margin-bottom: 8px;
}
.detail-table {
  width: 100%;
  border-collapse: collapse;
  background: white;
  border-radius: 4px;
  overflow: hidden;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
}
.detail-table th {
  background: #546e7a;
  color: white;
  text-align: left;
  padding: 6px 10px;
  font-size: 11px;
}
.detail-table td {
  padding: 4px 10px;
  border-bottom: 1px solid #eee;
  font-size: 12px;
}
.tr {
  text-align: right !important;
}
.fw-bold {
  font-weight: 700;
}
</style>
