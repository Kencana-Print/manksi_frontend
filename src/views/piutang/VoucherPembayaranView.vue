<script setup lang="ts">
import { ref, computed, onMounted, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useToast } from "vue-toastification";
import BaseBrowse from "@/components/BaseBrowse.vue";
import { voucherPembayaranService } from "@/services/piutang/voucherPembayaranService";
import {
  IconFileInvoice,
  IconPrinter,
  IconFileExport,
} from "@tabler/icons-vue";
import { formatTanggal } from "@/utils/dateFormat";
import { exportExcelSingle, type ExcelColumn } from "@/utils/excelExport";

const route = useRoute();
const router = useRouter();
const toast = useToast();
const baseBrowseRef = ref<InstanceType<typeof BaseBrowse> | null>(null);

const isPendingFilter = computed(() => route.query.filter === "pending");

// --- Periode ---
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

const filterState = ref<Record<string, any>>({});
const startDate = ref(getAwalBulan());
const endDate = ref(getToday());

watch([startDate, endDate], () => {
  if (!isPendingFilter.value) fetchData();
});

// --- Data ---
const items = ref<any[]>([]);
const detailCache = ref<Record<string, any[]>>({});
const isLoading = ref(false);
const selected = ref<any[]>([]);
const expanded = ref<any[]>([]);

const selectedItem = computed(() => selected.value[0] ?? null);

const headers = [
  { title: "Nomor", key: "Nomor", width: "190px", fixed: true },
  { title: "Tanggal", key: "Tanggal", width: "100px", align: "center" },
  { title: "Kode Sup", key: "KodeSupplier", width: "90px" },
  { title: "Supplier", key: "Supplier", width: "260px" },
  { title: "No. Pajak", key: "NomorPajak", width: "130px" },
  { title: "Total", key: "Total", width: "140px", align: "end" },
  {
    title: "Bahan Tambahan",
    key: "BahanTambahan",
    width: "140px",
    align: "end",
  },
  { title: "Net", key: "Net", width: "140px", align: "end" },
  { title: "Disc", key: "Disc", width: "60px", align: "end" },
  { title: "Status", key: "Status", width: "80px", align: "center" },
  {
    title: "No. Pengajuan Transfer",
    key: "NomorRealisasi",
    width: "160px",
  },
  {
    title: "Tgl Realisasi",
    key: "TanggalRealisasi",
    width: "100px",
    align: "center",
  },
  { title: "Account", key: "AccountBayar", width: "100px" },
  { title: "Nama Account", key: "NamaAccount", width: "160px" },
  { title: "Cost Center", key: "CcNama", width: "140px" },
  { title: "DC", key: "DcNama", width: "120px" },
  { title: "User", key: "Usr", width: "80px", align: "center" },
  { title: "Created", key: "Created", width: "160px" },
];

const numFmt = (v: any) => (v ? Number(v).toLocaleString("id-ID") : "");

// --- Summary footer formatters — sticky row di dalam tabel, ikut
// scroll horizontal otomatis (pola sama seperti InvoiceView) ---
const summaryFormatters = {
  NomorPajak: () => "TOTAL :",
  Total: (filteredItems: any[]) =>
    numFmt(
      Math.round(filteredItems.reduce((s, r) => s + (Number(r.Total) || 0), 0)),
    ),
  BahanTambahan: (filteredItems: any[]) =>
    numFmt(
      Math.round(
        filteredItems.reduce((s, r) => s + (Number(r.BahanTambahan) || 0), 0),
      ),
    ),
  Net: (filteredItems: any[]) =>
    numFmt(
      Math.round(filteredItems.reduce((s, r) => s + (Number(r.Net) || 0), 0)),
    ),
};

const groupDetail = (rows: any[]) => {
  const grouped: Record<string, any[]> = {};
  for (const row of rows) {
    if (!grouped[row.Nomor]) grouped[row.Nomor] = [];
    grouped[row.Nomor].push(row);
  }
  detailCache.value = grouped;
};

const fetchData = async () => {
  isLoading.value = true;
  selected.value = [];
  expanded.value = [];
  try {
    if (isPendingFilter.value) {
      const [resBrowse, resDetail] = await Promise.all([
        voucherPembayaranService.getBrowsePendingAll(),
        voucherPembayaranService.getBrowseDetailPendingAll(),
      ]);
      items.value = resBrowse.data.data || [];
      groupDetail(resDetail.data.data || []);
    } else {
      const [resBrowse, resDetail] = await Promise.all([
        voucherPembayaranService.getBrowse(startDate.value, endDate.value),
        voucherPembayaranService.getBrowseDetail(
          startDate.value,
          endDate.value,
        ),
      ]);
      items.value = resBrowse.data.data || [];
      groupDetail(resDetail.data.data || []);
    }
  } catch (e: any) {
    toast.error(e.response?.data?.message || "Gagal memuat data.");
  } finally {
    isLoading.value = false;
  }
};

onMounted(() => {
  fetchData();
});

const resetPendingFilter = () => {
  router.replace({ path: "/piutang/voucher-pembayaran" });
  fetchData();
};

// --- Row coloring: Ngedit (WAIT/ACC/TOLAK) atau belum ada PT ---
const rowPropsFn = (data: any) => {
  const item = data.item?.raw || data.item;
  const ngedit = item?.Ngedit ?? "";
  if (ngedit === "WAIT")
    return { style: "background:#e3f2fd;color:#1565c0;font-weight:600" };
  if (ngedit === "ACC")
    return { style: "background:#e8f5e9;color:#2e7d32;font-weight:600" };
  if (ngedit === "TOLAK")
    return { style: "background:#ffebee;color:#c62828;font-weight:600" };
  if (!item?.NomorRealisasi)
    return { style: "background:#fff3e0;color:#e65100" };
  return {};
};

const requireSelected = (): boolean => {
  if (!selectedItem.value) {
    toast.warning("Pilih data terlebih dahulu.");
    return false;
  }
  return true;
};

// --- Add / Edit / Print ---
const onAdd = () => router.push("/piutang/voucher-pembayaran/create");
const onEdit = () => {
  if (!requireSelected()) return;
  router.push(
    `/piutang/voucher-pembayaran/edit/${encodeURIComponent(selectedItem.value!.Nomor)}`,
  );
};
const onPrint = () => {
  if (!requireSelected()) return;
  window.open(
    `/piutang/voucher-pembayaran/print/${encodeURIComponent(selectedItem.value!.Nomor)}`,
    "_blank",
  );
};

// --- Delete ---
const showDeleteDialog = ref(false);
const isDeleting = ref(false);

const onHapus = () => {
  if (!requireSelected()) return;
  showDeleteDialog.value = true;
};

const confirmDelete = async () => {
  if (!selectedItem.value) return;
  isDeleting.value = true;
  try {
    await voucherPembayaranService.deleteData(selectedItem.value.Nomor);
    toast.success("Data berhasil dihapus.");
    showDeleteDialog.value = false;
    fetchData();
  } catch (e: any) {
    toast.error(e.response?.data?.message || "Gagal menghapus data.");
  } finally {
    isDeleting.value = false;
  }
};

// --- Pengajuan Perubahan Data ---
const showPengajuanDialog = ref(false);
const pengajuanAlasan = ref("");
const pengajuanLoading = ref(false);
const pengajuanSaving = ref(false);

const onPengajuan = async () => {
  if (!requireSelected()) return;
  pengajuanLoading.value = true;
  try {
    const res = await voucherPembayaranService.cekPengajuan(
      selectedItem.value!.Nomor,
    );
    const data = res.data.data;
    if (!data.perlu) {
      toast.info(data.message || "Tidak perlu pengajuan perubahan data.");
      return;
    }
    pengajuanAlasan.value = data.alasanLama || "";
    showPengajuanDialog.value = true;
  } catch (e: any) {
    toast.error(
      e.response?.data?.message || "Gagal memeriksa status pengajuan.",
    );
  } finally {
    pengajuanLoading.value = false;
  }
};

const confirmPengajuan = async () => {
  if (!pengajuanAlasan.value.trim()) {
    toast.warning("Alasan harus diisi.");
    return;
  }
  pengajuanSaving.value = true;
  try {
    await voucherPembayaranService.requestPin5(
      selectedItem.value!.Nomor,
      pengajuanAlasan.value.trim(),
    );
    toast.success("Berhasil diajukan. Menunggu ACC.");
    showPengajuanDialog.value = false;
    pengajuanAlasan.value = "";
    fetchData();
  } catch (e: any) {
    toast.error(e.response?.data?.message || "Gagal mengajukan.");
  } finally {
    pengajuanSaving.value = false;
  }
};

// --- Export ---
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
      numFmt: ["Total", "BahanTambahan", "Net", "Disc"].includes(h.key)
        ? "#,##0"
        : undefined,
    }));

    const rows = dataToExport.map((it: any) => {
      const row: Record<string, any> = {};
      columns.forEach((c) => {
        let val = it[c.key];
        if (c.key === "Tanggal" || c.key === "TanggalRealisasi")
          val = val ? formatTanggal(val) : "";
        row[c.key] = val ?? "";
      });
      return row;
    });

    const periodeLabel = isPendingFilter.value
      ? "Filter: Belum Pengajuan Transfer (Semua Periode)"
      : `Periode: ${formatTanggal(startDate.value)} s/d ${formatTanggal(endDate.value)}`;
    await exportExcelSingle(
      `Voucher_Pembayaran_${startDate.value}_${endDate.value}.xlsx`,
      "Voucher Pembayaran",
      columns,
      rows,
      `Laporan Voucher Pembayaran  |  ${periodeLabel}`,
    );

    toast.success("Berhasil export data.");
  } catch (e) {
    console.error(e);
    toast.error("Terjadi kesalahan saat export.");
  } finally {
    isExporting.value = false;
  }
};

// --- Export Detail ---
const isExportingDetail = ref(false);

const HEADER_COLS_DETAIL = [
  "Nomor",
  "Tanggal",
  "KodeSupplier",
  "Supplier",
  "NomorPajak",
  "Total",
  "Status",
];

const detailExportColumns: ExcelColumn[] = [
  { header: "Nomor", key: "Nomor", width: 20 },
  { header: "Tanggal", key: "Tanggal", width: 14, align: "center" },
  { header: "Kode Sup", key: "KodeSupplier", width: 12 },
  { header: "Supplier", key: "Supplier", width: 26 },
  { header: "No. Pajak", key: "NomorPajak", width: 16 },
  {
    header: "Total",
    key: "Total",
    width: 16,
    align: "end",
    numFmt: "#,##0",
  },
  { header: "Status", key: "Status", width: 10, align: "center" },
  { header: "Nota", key: "Nota", width: 16 },
  { header: "Nomor PO", key: "NomorPO", width: 16 },
  { header: "Tgl Nota", key: "TglNota", width: 14, align: "center" },
  { header: "Type", key: "Type", width: 10 },
  {
    header: "Total Detail",
    key: "TotalDetail",
    width: 16,
    align: "end",
    numFmt: "#,##0",
  },
  { header: "SPK Nomor", key: "SpkNomor", width: 16 },
  { header: "SPK Nama", key: "SpkNama", width: 24 },
  {
    header: "Jumlah",
    key: "Jumlah",
    width: 12,
    align: "end",
    numFmt: "#,##0",
  },
  { header: "BS", key: "Bs", width: 10, align: "end", numFmt: "#,##0" },
  {
    header: "Tarif BS",
    key: "TarifBS",
    width: 12,
    align: "end",
    numFmt: "#,##0",
  },
];

const onExportDetail = async () => {
  isExportingDetail.value = true;
  try {
    const [resBrowse, resDetail] = isPendingFilter.value
      ? await Promise.all([
          voucherPembayaranService.getBrowsePendingAll(),
          voucherPembayaranService.getBrowseDetailPendingAll(),
        ])
      : await Promise.all([
          voucherPembayaranService.getBrowse(startDate.value, endDate.value),
          voucherPembayaranService.getBrowseDetail(
            startDate.value,
            endDate.value,
          ),
        ]);

    const detailRows = resDetail.data.data as any[];
    if (!detailRows.length) {
      toast.warning("Tidak ada data detail untuk diexport.");
      return;
    }

    const masterMap: Record<string, any> = {};
    for (const m of resBrowse.data.data as any[]) {
      masterMap[m.Nomor] = m;
    }

    const merged = detailRows.map((d) => {
      const m = masterMap[d.Nomor] || {};
      return {
        Nomor: d.Nomor,
        Tanggal: m.Tanggal ? formatTanggal(m.Tanggal) : "",
        KodeSupplier: m.KodeSupplier || "",
        Supplier: m.Supplier || "",
        NomorPajak: m.NomorPajak || "",
        Total: Number(m.Total) || 0,
        Status: m.Status || "",
        Nota: d.Nota || "",
        NomorPO: d.NomorPO || "",
        TglNota: d.Tanggal ? formatTanggal(d.Tanggal) : "",
        Type: d.Type || "",
        TotalDetail: Number(d.Total) || 0,
        SpkNomor: d.SpkNomor || "",
        SpkNama: d.SpkNama || "",
        Jumlah: Number(d.Jumlah) || 0,
        Bs: Number(d.Bs) || 0,
        TarifBS: Number(d.TarifBS) || 0,
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

    const periodeLabel = isPendingFilter.value
      ? "Filter: Belum Pengajuan Transfer (Semua Periode)"
      : `Periode: ${formatTanggal(startDate.value)} s/d ${formatTanggal(endDate.value)}`;
    await exportExcelSingle(
      `Voucher_Pembayaran_Detail_${startDate.value}_${endDate.value}.xlsx`,
      "Voucher Pembayaran Detail",
      detailExportColumns,
      rows,
      `Laporan Detail Voucher Pembayaran  |  ${periodeLabel}`,
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
    title="Voucher Pembayaran"
    menu-id="201"
    :icon="IconFileInvoice"
    :headers="headers"
    :items="items ?? []"
    :is-loading="isLoading"
    v-model:selected="selected"
    v-model:filter-state="filterState"
    :can-insert="true"
    :can-edit="true"
    :can-delete="true"
    :can-export="true"
    item-value="Nomor"
    :row-props-fn="rowPropsFn"
    show-expand
    :expanded="expanded"
    :summary-columns="['Total', 'BahanTambahan', 'Net']"
    :summary-formatters="summaryFormatters"
    @update:expanded="(val) => (expanded = val)"
    @add="onAdd"
    @edit="onEdit"
    @refresh="fetchData"
    @delete="onHapus"
    @export="onExport"
  >
    <template #filter-left>
      <div class="f-group">
        <span class="f-label">Periode</span>
        <input
          type="date"
          v-model="startDate"
          class="f-date"
          :disabled="isPendingFilter"
        />
        <span class="f-sep">s/d</span>
        <input
          type="date"
          v-model="endDate"
          class="f-date"
          :disabled="isPendingFilter"
        />
        <span
          v-if="isPendingFilter"
          class="pending-badge"
          title="Klik untuk tampilkan semua"
          @click="resetPendingFilter"
        >
          ⚠ Belum PT (Semua) · ✕ Reset
        </span>
      </div>
      <div class="f-divider" />
      <div class="legend-wrap">
        <span class="legend-dot" style="background: #1565c0"></span>
        <span class="legend-lbl">Nunggu Acc</span>
        <span class="legend-dot" style="background: #2e7d32"></span>
        <span class="legend-lbl">Sudah Acc</span>
        <span class="legend-dot" style="background: #c62828"></span>
        <span class="legend-lbl">Tolak</span>
        <span class="legend-dot" style="background: #e65100"></span>
        <span class="legend-lbl">Belum PT</span>
      </div>
    </template>

    <template #extra-actions="{ selected }">
      <v-btn
        size="small"
        color="warning"
        :disabled="selected.length === 0"
        :loading="pengajuanLoading"
        @click="onPengajuan"
      >
        Pengajuan Ubah
      </v-btn>
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
    </template>

    <template #item.Tanggal="{ item }">
      {{ formatTanggal((item.raw || item).Tanggal) }}
    </template>
    <template #item.TanggalRealisasi="{ item }">
      {{ formatTanggal((item.raw || item).TanggalRealisasi) }}
    </template>
    <template #item.Created="{ item }">
      <span style="font-size: 10px">{{ (item.raw || item).Created }}</span>
    </template>
    <template
      v-for="col in ['Total', 'BahanTambahan', 'Net', 'Disc']"
      :key="col"
      v-slot:[`item.${col}`]="{ item }"
    >
      <span class="num-cell">{{ numFmt((item.raw || item)[col]) }}</span>
    </template>

    <template #detail="{ item }">
      <div class="expand-wrap">
        <div
          v-if="!(detailCache[(item.raw || item).Nomor] || []).length"
          class="detail-empty"
        >
          Tidak ada detail untuk voucher ini.
        </div>
        <table v-else class="detail-table">
          <thead>
            <tr>
              <th width="140">Nota</th>
              <th width="140">Nomor PO</th>
              <th width="100">Tanggal</th>
              <th width="80">Type</th>
              <th width="130" class="tr">Total</th>
              <th width="130">SPK Nomor</th>
              <th width="220">SPK Nama</th>
              <th width="100" class="tr">Jumlah</th>
              <th width="80" class="tr">BS</th>
              <th width="100" class="tr">Tarif BS</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(d, idx) in detailCache[(item.raw || item).Nomor] || []"
              :key="idx"
            >
              <td>{{ d.Nota }}</td>
              <td>{{ d.NomorPO || "-" }}</td>
              <td class="tc">{{ formatTanggal(d.Tanggal) }}</td>
              <td class="tc">{{ d.Type }}</td>
              <td class="tr">{{ numFmt(d.Total) }}</td>
              <td>{{ d.SpkNomor || "-" }}</td>
              <td>{{ d.SpkNama || "-" }}</td>
              <td class="tr">{{ numFmt(d.Jumlah) }}</td>
              <td class="tr">{{ numFmt(d.Bs) }}</td>
              <td class="tr">{{ numFmt(d.TarifBS) }}</td>
            </tr>
          </tbody>
          <tfoot>
            <tr class="detail-foot">
              <td colspan="4" class="tr detail-foot-lbl">Total</td>
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
              <td colspan="5"></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </template>
  </BaseBrowse>

  <v-dialog v-model="showDeleteDialog" max-width="420px" persistent>
    <v-card rounded="lg">
      <v-card-title
        class="bg-error text-white pa-3 text-subtitle-1 d-flex align-center"
      >
        <IconFileInvoice :size="16" color="white" class="mr-2" />
        Konfirmasi Hapus
      </v-card-title>
      <v-card-text class="pa-4 text-body-2">
        Yakin ingin menghapus:
        <div class="font-weight-bold text-primary mt-1">
          {{ selectedItem?.Nomor }}
        </div>
        <div class="text-caption text-error mt-2">
          Detail voucher juga akan ikut dihapus.
        </div>
      </v-card-text>
      <v-card-actions class="pa-3 border-t bg-grey-lighten-4">
        <v-spacer />
        <v-btn
          variant="text"
          :disabled="isDeleting"
          @click="showDeleteDialog = false"
          >Batal</v-btn
        >
        <v-btn
          color="error"
          variant="elevated"
          :loading="isDeleting"
          @click="confirmDelete"
          >Ya, Hapus</v-btn
        >
      </v-card-actions>
    </v-card>
  </v-dialog>

  <v-dialog v-model="showPengajuanDialog" max-width="420px" persistent>
    <v-card rounded="lg">
      <v-card-title
        class="pa-3"
        style="font-size: 13px; font-weight: 700; border-top: 3px solid #f57c00"
      >
        Pengajuan Perubahan Data
      </v-card-title>
      <v-card-text class="pa-4">
        <div style="font-size: 11px; color: #6b7280; margin-bottom: 8px">
          Nomor: <strong>{{ selectedItem?.Nomor }}</strong> —
          {{ selectedItem?.Supplier }}
        </div>
        <label style="font-size: 11px; font-weight: 600; color: #4b5563">
          Alasan <span style="color: red">*</span>
        </label>
        <textarea
          v-model="pengajuanAlasan"
          rows="3"
          class="alasan-inp"
          placeholder="Isi alasan pengajuan perubahan data..."
          autofocus
        />
      </v-card-text>
      <v-card-actions class="pa-3 border-t bg-grey-lighten-4">
        <v-btn variant="text" @click="showPengajuanDialog = false">Batal</v-btn>
        <v-spacer />
        <v-btn
          color="warning"
          variant="flat"
          :loading="pengajuanSaving"
          :disabled="!pengajuanAlasan.trim()"
          @click="confirmPengajuan"
        >
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
  color: #212121;
}
.f-divider {
  width: 1px;
  height: 20px;
  background: #ddd;
  margin: 0 8px;
}

.legend-wrap {
  display: flex;
  align-items: center;
  gap: 5px;
}
.legend-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
}
.legend-lbl {
  font-size: 11px;
  color: #374151;
  margin-right: 6px;
}

.pending-badge {
  font-size: 11px;
  font-weight: 600;
  color: #e65100;
  background: #fff3e0;
  border: 1px solid #ffcc80;
  border-radius: 20px;
  padding: 2px 10px;
  cursor: pointer;
  white-space: nowrap;
  margin-left: 8px;
}
.pending-badge:hover {
  background: #ffe0b2;
}

.num-cell {
  font-variant-numeric: tabular-nums;
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
  min-width: 1200px;
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

.alasan-inp {
  width: 100%;
  margin-top: 4px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  padding: 8px 10px;
  font-size: 12px;
  outline: none;
  resize: vertical;
  box-sizing: border-box;
  font-family: inherit;
}
.alasan-inp:focus {
  border-color: #f57c00;
}
</style>
