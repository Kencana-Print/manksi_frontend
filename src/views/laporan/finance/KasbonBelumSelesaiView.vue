<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useToast } from "vue-toastification";
import { useAuthStore } from "@/stores/authStore";
import BaseBrowse from "@/components/BaseBrowse.vue";
import {
  kasbonBelumSelesaiService,
  type KasbonMasterRow,
  type KasbonDetailRow,
  type AccountItem,
} from "@/services/laporan/finance/kasbonBelumSelesaiService";
import { IconReceipt2, IconFileExport, IconSearch } from "@tabler/icons-vue";
import { formatTanggal } from "@/utils/dateFormat";
import { exportExcelSingle, type ExcelColumn } from "@/utils/excelExport";

const toast = useToast();
const authStore = useAuthStore();
const baseBrowseRef = ref<InstanceType<typeof BaseBrowse> | null>(null);

// ── Account ──
const filterState = ref<Record<string, any>>({});
const rekkode = ref("");
const reknama = ref("");

// ── Data ──
const items = ref<KasbonMasterRow[]>([]);
const detailCache = ref<Record<string, KasbonDetailRow[]>>({});
const isLoading = ref(false);
const expanded = ref<any[]>([]);

const headers = [
  { title: "Nomor", key: "Nomor", width: "190px", fixed: true },
  { title: "Tanggal", key: "Tanggal", width: "100px", align: "center" },
  { title: "Jenis", key: "Jenis", width: "70px", align: "center" },
  { title: "Pjh", key: "Pjh", width: "140px" },
  { title: "Nota", key: "Nota", width: "110px" },
  { title: "Penerima", key: "Penerima", width: "140px" },
  { title: "Nominal", key: "Nominal", width: "140px", align: "end" },
  { title: "Keterangan", key: "Keterangan", width: "300px" },
];

const numFmt = (v: any) => (v ? Number(v).toLocaleString("id-ID") : "");

const groupDetail = (rows: KasbonDetailRow[]) => {
  const grouped: Record<string, KasbonDetailRow[]> = {};
  for (const row of rows) {
    if (!grouped[row.Nomor]) grouped[row.Nomor] = [];
    grouped[row.Nomor].push(row);
  }
  detailCache.value = grouped;
};

const fetchData = async () => {
  if (!rekkode.value || !reknama.value) return;
  isLoading.value = true;
  expanded.value = [];
  try {
    const res = await kasbonBelumSelesaiService.getData(rekkode.value);
    items.value = res.data.data.master || [];
    groupDetail(res.data.data.detail || []);
  } catch (e: any) {
    toast.error(e.response?.data?.message || "Gagal memuat data.");
  } finally {
    isLoading.value = false;
  }
};

onMounted(async () => {
  try {
    const cabang = authStore.userCabang || "P01";
    const resDef = await kasbonBelumSelesaiService.getDefaultAccount(cabang);
    const kode = resDef.data.data.kode;
    const resAcc = await kasbonBelumSelesaiService.getAccountByKode(kode);
    rekkode.value = kode;
    reknama.value = resAcc.data.data.nama;
  } catch {
    /* silent — biar user pilih manual lewat modal */
  }
  await fetchData();
});

// ── Modal Search Account ──
const showModal = ref(false);
const modalSearch = ref("");
const modalLoading = ref(false);
const modalItems = ref<AccountItem[]>([]);
const modalPage = ref(1);
const MODAL_PAGE_SIZE = 50;

const modalFiltered = computed(() => {
  const q = modalSearch.value.toLowerCase();
  if (!q) return modalItems.value;
  return modalItems.value.filter(
    (a) => a.kode.toLowerCase().includes(q) || a.nama.toLowerCase().includes(q),
  );
});
const modalPaged = computed(() =>
  modalFiltered.value.slice(0, modalPage.value * MODAL_PAGE_SIZE),
);
const modalHasMore = computed(
  () => modalPaged.value.length < modalFiltered.value.length,
);

let debounceTimer: ReturnType<typeof setTimeout>;
const onModalSearchInput = () => {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    modalPage.value = 1;
  }, 350);
};

const openModal = async () => {
  showModal.value = true;
  modalSearch.value = "";
  modalPage.value = 1;
  modalLoading.value = true;
  try {
    const cabang = authStore.userCabang || "P01";
    const res = await kasbonBelumSelesaiService.searchAccount(cabang);
    modalItems.value = res.data.data || [];
  } catch {
    toast.error("Gagal memuat daftar account.");
  } finally {
    modalLoading.value = false;
  }
};

const selectAccount = (item: AccountItem) => {
  rekkode.value = item.kode;
  reknama.value = item.nama;
  showModal.value = false;
  fetchData();
};

const onRekkodeBlur = async () => {
  if (!rekkode.value) return;
  try {
    const res = await kasbonBelumSelesaiService.getAccountByKode(rekkode.value);
    reknama.value = res.data.data.nama;
    fetchData();
  } catch {
    reknama.value = "";
    toast.error("Account tersebut belum terdaftar.");
  }
};

// ── Summary footer — sticky bawaan BaseBrowse ──
const summaryFormatters = {
  Penerima: () => "TOTAL :",
  Nominal: (filteredItems: any[]) =>
    numFmt(
      Math.round(
        filteredItems.reduce((s, r) => s + (Number(r.Nominal) || 0), 0),
      ),
    ),
};

// ── Export ──
const isExporting = ref(false);

const onExport = async () => {
  const dataToExport =
    baseBrowseRef.value?.getFilteredItems?.() ?? items.value ?? [];

  if (!dataToExport || dataToExport.length === 0) {
    toast.warning("Tidak ada data untuk diexport.");
    return;
  }

  isExporting.value = true;
  try {
    const columns: ExcelColumn[] = headers.map((h: any) => ({
      header: h.title,
      key: h.key,
      width: h.width ? Math.max(10, Math.round(parseInt(h.width) / 7)) : 16,
      align: h.align ?? "left",
      numFmt: h.key === "Nominal" ? "#,##0" : undefined,
    }));

    const rows = dataToExport.map((it: any) => {
      const row: Record<string, any> = {};
      columns.forEach((c) => {
        let val = it[c.key];
        if (c.key === "Tanggal") val = val ? formatTanggal(val) : "";
        row[c.key] = val ?? "";
      });
      return row;
    });

    await exportExcelSingle(
      `Kasbon_Belum_Selesai_${rekkode.value}.xlsx`,
      "Kasbon Belum Selesai",
      columns,
      rows,
      `Laporan Kasbon Belum Selesai — ${rekkode.value} ${reknama.value}`,
    );

    toast.success("Berhasil export data.");
  } catch (e) {
    console.error(e);
    toast.error("Terjadi kesalahan saat export.");
  } finally {
    isExporting.value = false;
  }
};

// ── Export Detail ──
const isExportingDetail = ref(false);

const HEADER_COLS_DETAIL = [
  "Nomor",
  "Tanggal",
  "Jenis",
  "Pjh",
  "Nota",
  "Penerima",
  "Nominal",
  "Keterangan",
];

const detailExportColumns: ExcelColumn[] = [
  { header: "Nomor", key: "Nomor", width: 20 },
  { header: "Tanggal", key: "Tanggal", width: 14, align: "center" },
  { header: "Jenis", key: "Jenis", width: 10, align: "center" },
  { header: "Pjh", key: "Pjh", width: 18 },
  { header: "Nota", key: "Nota", width: 16 },
  { header: "Penerima", key: "Penerima", width: 20 },
  {
    header: "Nominal (Master)",
    key: "Nominal",
    width: 16,
    align: "end",
    numFmt: "#,##0",
  },
  { header: "Keterangan", key: "Keterangan", width: 26 },
  { header: "Uraian", key: "Uraian", width: 30 },
  { header: "Satuan", key: "Satuan", width: 10, align: "center" },
  { header: "Qty", key: "Qty", width: 12, align: "end", numFmt: "#,##0" },
  {
    header: "Nominal (Detail)",
    key: "NominalDtl",
    width: 16,
    align: "end",
    numFmt: "#,##0",
  },
  {
    header: "Total",
    key: "Total",
    width: 16,
    align: "end",
    numFmt: "#,##0",
  },
  { header: "Kegunaan", key: "Kegunaan", width: 20 },
  { header: "Ket. Sumber", key: "KetSumber", width: 16 },
];

const onExportDetail = async () => {
  const allDetail = Object.values(detailCache.value).flat();
  if (!allDetail.length) {
    toast.warning("Tidak ada data detail untuk diexport.");
    return;
  }

  isExportingDetail.value = true;
  try {
    const masterMap: Record<string, any> = {};
    for (const m of items.value) {
      masterMap[m.Nomor] = m;
    }

    const merged = allDetail.map((d) => {
      const m = masterMap[d.Nomor] || {};
      return {
        Nomor: d.Nomor,
        Tanggal: m.Tanggal ? formatTanggal(m.Tanggal) : "",
        Jenis: m.Jenis || "",
        Pjh: m.Pjh || "",
        Nota: m.Nota || "",
        Penerima: m.Penerima || "",
        Nominal: Number(m.Nominal) || 0,
        Keterangan: m.Keterangan || "",
        Uraian: d.Uraian,
        Satuan: d.Satuan,
        Qty: Number(d.Qty) || 0,
        NominalDtl: Number(d.Nominal) || 0,
        Total: Number(d.Total) || 0,
        Kegunaan: d.Kegunaan,
        KetSumber: d.Keterangan,
      };
    });

    let lastNomor: string | null = null;
    const rows = merged.map((row) => {
      if (row.Nomor === lastNomor) {
        const copy: Record<string, any> = { ...row };
        HEADER_COLS_DETAIL.forEach((c) => (copy[c] = ""));
        return copy;
      }
      lastNomor = row.Nomor;
      return row;
    });

    await exportExcelSingle(
      `Kasbon_Belum_Selesai_Detail_${rekkode.value}.xlsx`,
      "Kasbon Belum Selesai Detail",
      detailExportColumns,
      rows,
      `Laporan Detail Kasbon Belum Selesai — ${rekkode.value} ${reknama.value}`,
    );

    toast.success("Berhasil export detail data.");
  } catch (e) {
    console.error(e);
    toast.error("Terjadi kesalahan saat export detail.");
  } finally {
    isExportingDetail.value = false;
  }
};
</script>

<template>
  <BaseBrowse
    ref="baseBrowseRef"
    title="Kasbon Belum Selesai"
    menu-id="969"
    :icon="IconReceipt2"
    :headers="headers"
    :items="items ?? []"
    :is-loading="isLoading"
    v-model:filter-state="filterState"
    :can-export="true"
    item-value="Nomor"
    show-expand
    :expanded="expanded"
    :summary-columns="['Nominal']"
    :summary-formatters="summaryFormatters"
    @update:expanded="(val) => (expanded = val)"
    @refresh="fetchData"
    @export="onExport"
  >
    <template #filter-left>
      <div class="f-group">
        <span class="f-label">Account</span>
        <input
          v-model="rekkode"
          type="text"
          class="f-kode"
          placeholder="Kode..."
          @blur="onRekkodeBlur"
          @keydown.enter.prevent="onRekkodeBlur"
        />
        <button
          type="button"
          class="f-search-btn"
          title="Cari Account"
          @click="openModal"
        >
          <IconSearch :size="14" />
        </button>
        <input
          :value="reknama"
          readonly
          class="f-nama"
          placeholder="Nama account..."
        />
      </div>
    </template>

    <template #extra-actions>
      <v-btn
        size="small"
        color="teal-darken-2"
        :loading="isExportingDetail"
        @click="onExportDetail"
      >
        <template #prepend><IconFileExport :size="15" /></template>Export Detail
      </v-btn>
    </template>

    <template #item.Tanggal="{ item }">
      {{ formatTanggal((item.raw || item).Tanggal) }}
    </template>
    <template #item.Nominal="{ item }">
      <span class="num-cell">{{ numFmt((item.raw || item).Nominal) }}</span>
    </template>

    <template #detail="{ item }">
      <div class="expand-wrap">
        <div
          v-if="!(detailCache[(item.raw || item).Nomor] || []).length"
          class="detail-empty"
        >
          Tidak ada detail untuk kasbon ini.
        </div>
        <table v-else class="detail-table">
          <thead>
            <tr>
              <th width="300">Uraian</th>
              <th width="80">Satuan</th>
              <th width="80" class="tr">Qty</th>
              <th width="120" class="tr">Nominal</th>
              <th width="120" class="tr">Total</th>
              <th width="160">Kegunaan</th>
              <th width="120">Keterangan</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(d, idx) in detailCache[(item.raw || item).Nomor] || []"
              :key="idx"
            >
              <td>{{ d.Uraian }}</td>
              <td class="tc">{{ d.Satuan }}</td>
              <td class="tr">{{ numFmt(d.Qty) }}</td>
              <td class="tr">{{ numFmt(d.Nominal) }}</td>
              <td class="tr">{{ numFmt(d.Total) }}</td>
              <td>{{ d.Kegunaan }}</td>
              <td>
                <span v-if="d.Keterangan" class="ket-badge">{{
                  d.Keterangan
                }}</span>
              </td>
            </tr>
          </tbody>
          <tfoot>
            <tr class="detail-foot">
              <td colspan="3" class="tr detail-foot-lbl">Total</td>
              <td class="tr detail-foot-val">
                {{
                  numFmt(
                    (detailCache[(item.raw || item).Nomor] || []).reduce(
                      (s: number, d: any) => s + Number(d.Nominal),
                      0,
                    ),
                  )
                }}
              </td>
              <td class="tr detail-foot-val">
                {{
                  numFmt(
                    (detailCache[(item.raw || item).Nomor] || []).reduce(
                      (s: number, d: any) => s + Number(d.Total),
                      0,
                    ),
                  )
                }}
              </td>
              <td colspan="2"></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </template>
  </BaseBrowse>

  <!-- ── Modal Search Account ── -->
  <v-dialog v-model="showModal" max-width="520" scrollable>
    <v-card rounded="lg">
      <v-card-title
        class="pa-4 pb-2"
        style="font-size: 13px; font-weight: 700; border-top: 3px solid #1565c0"
      >
        Pilih Account
      </v-card-title>

      <v-card-text class="pa-3 pt-2" style="max-height: 480px">
        <div class="modal-search-row">
          <input
            v-model="modalSearch"
            type="text"
            class="modal-search-inp"
            placeholder="Cari kode atau nama..."
            @input="onModalSearchInput"
            autofocus
          />
          <span class="modal-total-badge">
            {{ modalFiltered.length.toLocaleString("id-ID") }} data
          </span>
        </div>

        <div v-if="modalLoading" class="modal-loading">
          <v-progress-circular indeterminate color="primary" size="28" />
        </div>
        <div v-else class="modal-list">
          <div
            v-for="item in modalPaged"
            :key="item.kode"
            class="modal-item"
            @click="selectAccount(item)"
          >
            <span class="modal-kode">{{ item.kode }}</span>
            <span class="modal-nama">{{ item.nama }}</span>
          </div>

          <div v-if="modalHasMore" class="modal-load-more">
            <v-btn
              size="small"
              variant="tonal"
              color="primary"
              @click="modalPage++"
            >
              Tampilkan lebih banyak
              <span class="modal-load-more-count">
                ({{ modalPaged.length }} / {{ modalFiltered.length }})
              </span>
            </v-btn>
          </div>

          <div v-else-if="modalPaged.length > 0" class="modal-end-info">
            Menampilkan semua
            {{ modalFiltered.length.toLocaleString("id-ID") }} data
          </div>

          <div v-if="!modalPaged.length" class="modal-empty">
            Tidak ada data.
          </div>
        </div>
      </v-card-text>

      <v-card-actions class="pa-3" style="border-top: 1px solid #eee">
        <span class="modal-footer-info">
          Total:
          <strong>{{ modalItems.length.toLocaleString("id-ID") }}</strong>
          account
          <template v-if="modalSearch">
            · Hasil filter:
            <strong>{{ modalFiltered.length.toLocaleString("id-ID") }}</strong>
          </template>
        </span>
        <v-spacer />
        <v-btn variant="text" size="small" @click="showModal = false"
          >Tutup</v-btn
        >
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
.f-kode {
  height: 28px;
  width: 100px;
  border: 1px solid #ccc;
  border-radius: 4px;
  padding: 0 6px;
  font-size: 12px;
  font-family: monospace;
  outline: none;
  background: white;
}
.f-kode:focus {
  border-color: #1565c0;
}
.f-search-btn {
  width: 28px;
  height: 28px;
  border: 1px solid #ccc;
  border-radius: 4px;
  background: #e3f2fd;
  color: #1565c0;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}
.f-search-btn:hover {
  background: #bbdefb;
}
.f-nama {
  height: 28px;
  width: 220px;
  border: 1px solid #ccc;
  border-radius: 4px;
  padding: 0 6px;
  font-size: 12px;
  outline: none;
  background: #f5f5f5;
  color: #555;
}

.num-cell {
  font-variant-numeric: tabular-nums;
}

.modal-search-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}
.modal-search-inp {
  flex: 1;
  height: 34px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  padding: 0 10px;
  font-size: 12px;
  outline: none;
  box-sizing: border-box;
}
.modal-search-inp:focus {
  border-color: #1565c0;
}
.modal-total-badge {
  font-size: 11px;
  font-weight: 600;
  color: #1565c0;
  background: #e3f2fd;
  border: 1px solid #90caf9;
  border-radius: 20px;
  padding: 3px 10px;
  white-space: nowrap;
  flex-shrink: 0;
}
.modal-loading {
  display: flex;
  justify-content: center;
  padding: 24px;
}
.modal-list {
  max-height: 360px;
  overflow-y: auto;
}
.modal-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 8px;
  cursor: pointer;
  border-radius: 4px;
  font-size: 12px;
  transition: background 0.1s;
}
.modal-item:hover {
  background: rgba(21, 101, 192, 0.08);
}
.modal-kode {
  font-family: monospace;
  font-size: 11px;
  font-weight: 700;
  color: #1565c0;
  min-width: 80px;
}
.modal-nama {
  color: #374151;
}
.modal-empty {
  text-align: center;
  padding: 20px;
  color: #9e9e9e;
  font-size: 12px;
}
.modal-load-more {
  display: flex;
  justify-content: center;
  padding: 10px 0 4px;
}
.modal-load-more-count {
  font-size: 10px;
  opacity: 0.7;
  margin-left: 4px;
}
.modal-end-info {
  text-align: center;
  font-size: 10px;
  color: #9ca3af;
  padding: 8px 0 2px;
}
.modal-footer-info {
  font-size: 11px;
  color: #6b7280;
}

.expand-wrap {
  padding: 10px 10px 10px 50px;
  background: #eceff1;
  overflow-x: auto;
}
.detail-empty {
  padding: 12px 10px;
  font-size: 11px;
  color: #9e9e9e;
  font-style: italic;
}
.detail-table {
  width: 100%;
  min-width: 900px;
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
  white-space: nowrap;
}
.detail-table td {
  padding: 4px 10px;
  border-bottom: 1px solid #eee;
  font-size: 12px;
}
.tr {
  text-align: right !important;
}
.tc {
  text-align: center;
}

.detail-foot td {
  background: #f0fdf4;
  border-top: 2px solid #2e7d32;
}
.detail-foot-lbl {
  font-size: 11px;
  font-weight: 700;
  color: #374151;
}
.detail-foot-val {
  font-size: 11px;
  font-weight: 700;
  color: #1b5e20;
}
.ket-badge {
  background: rgba(21, 101, 192, 0.1);
  color: #1565c0;
  border-radius: 3px;
  padding: 1px 5px;
  font-size: 10px;
  font-weight: 600;
}
</style>
