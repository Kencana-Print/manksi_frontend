<script setup lang="ts">
import { ref, computed } from "vue";
import { useRouter } from "vue-router";
import { useToast } from "vue-toastification";
import BaseBrowse from "@/components/BaseBrowse.vue";
import { useBrowse } from "@/composables/useBrowse";
import {
  IconPrinter,
  IconFileSpreadsheet,
  IconCheck,
  IconClock,
} from "@tabler/icons-vue";
import api from "@/services/api";
import { formatTanggal } from "@/utils/dateFormat";
import { exportExcelSingle, type ExcelColumn } from "@/utils/excelExport";

const router = useRouter();
const toast = useToast();

const getStartOfMonth = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
};
const getToday = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const startDate = ref(getStartOfMonth());
const endDate = ref(getToday());

const headers = [
  { title: "Nomor LHK", key: "Nomor", width: "170px" },
  { title: "Status", key: "Status", width: "95px", align: "center" as const },
  { title: "Shift", key: "Shift", width: "70px", align: "center" as const },
  { title: "Tanggal", key: "Tanggal", width: "110px", align: "center" as const },
  { title: "Mesin", key: "Mesin", width: "95px", align: "center" as const },
  { title: "Nomor SPK", key: "NomorSPK", width: "180px" },
  { title: "Nama SPK", key: "NamaOrder", minWidth: "200px" },
  { title: "P (m)", key: "spk_panjang", width: "75px", align: "end" as const },
  { title: "L (m)", key: "spk_lebar", width: "75px", align: "end" as const },
  { title: "Jml Order", key: "JumlahOrder", width: "95px", align: "end" as const },
  { title: "Jml Cetak", key: "TotalCetak", width: "95px", align: "end" as const },
  { title: "Bahan Awal", key: "PanjangBahanAwal", width: "100px", align: "end" as const },
  { title: "Sisa (m)", key: "SisaMeterAkhir", width: "85px", align: "end" as const },
  { title: "Status Bahan", key: "status_bahan", width: "130px", align: "center" as const },
  { title: "Kode Bahan", key: "Kode_bahan", width: "110px" },
  { title: "Nama Bahan", key: "nama_Bahan", minWidth: "170px" },
  { title: "Operator", key: "Operator", width: "110px" },
];

const {
  items,
  isLoading,
  selected,
  canInsert,
  canEdit,
  canDelete,
  canExport,
  fetchData,
} = useBrowse<any>({
  menuId: "5507",
  fetchApi: async (): Promise<any[]> => {
    const res = await api.get("/mmt/lhk/mesin-cetak", {
      params: {
        startDate: startDate.value,
        endDate: endDate.value,
      },
    });
    const data = Array.isArray(res.data) ? res.data : (res.data?.data ?? []);
    return data ?? [];
  },
});

const getItemNomor = (item: any): string => {
  if (!item) return "";
  if (typeof item === "string") return item;
  const raw = item.raw || item;
  return raw.Nomor || raw.lnomor || "";
};

const selectedItem = computed(() => {
  if (!selected.value || selected.value.length !== 1) return null;
  return selected.value[0]?.raw || selected.value[0];
});

// --- EXPAND LOGIC (RINCIAN DETAIL SPK PER LHK) ---
const expanded = ref<any[]>([]);
const detailCache = ref<Record<string, any[]>>({});
const loadingDetails = ref<Record<string, boolean>>({});

const getItemDetails = (item: any): any[] => {
  const nomor = getItemNomor(item);
  return detailCache.value[nomor] || [];
};

const onUpdateExpanded = async (newExpanded: any[]) => {
  expanded.value = newExpanded;
  for (const it of newExpanded) {
    const nomor = getItemNomor(it);
    if (!nomor) continue;
    if (detailCache.value[nomor] && detailCache.value[nomor].length > 0) continue;
    if (loadingDetails.value[nomor]) continue;

    loadingDetails.value = { ...loadingDetails.value, [nomor]: true };
    try {
      const res = await api.get("/mmt/lhk/mesin-cetak/details", {
        params: { nomor },
      });
      const d = res.data?.data?.details || res.data?.details || [];
      detailCache.value = {
        ...detailCache.value,
        [nomor]: Array.isArray(d) ? d : [],
      };
    } catch (err) {
      console.error(`Gagal load detail LHK ${nomor}:`, err);
      detailCache.value = { ...detailCache.value, [nomor]: [] };
    } finally {
      loadingDetails.value = { ...loadingDetails.value, [nomor]: false };
    }
  }
};

const handleNew = () => {
  router.push("/mmt/lhk/mesin-cetak/create");
};

const handleEdit = (item?: any) => {
  const target = item || selectedItem.value;
  const nomor = getItemNomor(target);
  if (!nomor) return;
  router.push(`/mmt/lhk/mesin-cetak/edit/${encodeURIComponent(nomor)}`);
};

const handleDelete = async (item?: any) => {
  const target = item || selectedItem.value;
  const nomor = getItemNomor(target);
  if (!nomor) return;
  if (!confirm(`Hapus data LHK Cetak Mesin nomor ${nomor}?`)) return;
  try {
    await api.delete(`/mmt/lhk/mesin-cetak/${encodeURIComponent(nomor)}`);
    toast.success(`LHK Cetak Mesin ${nomor} berhasil dihapus.`);
    fetchData();
  } catch (err: any) {
    toast.error(err.response?.data?.message || "Gagal menghapus data LHK.");
  }
};

const handlePrint = (item?: any) => {
  const target = item || selectedItem.value;
  const nomor = getItemNomor(target);
  if (!nomor) {
    toast.warning("Silakan pilih data LHK terlebih dahulu.");
    return;
  }
  const url = router.resolve({
    path: `/mmt/lhk/mesin-cetak/print/${encodeURIComponent(nomor)}`,
  }).href;
  window.open(url, "_blank");
};

// --- EXPORT DETAIL KE EXCEL (SESUAI SISTEM MMT) ---
const isExporting = ref(false);
const handleExportDetailExcel = async () => {
  if (!items.value || items.value.length === 0) {
    toast.warning("Tidak ada data LHK untuk di-export.");
    return;
  }

  isExporting.value = true;
  try {
    // 1. Pastikan detail untuk semua header yang sedang tertampil termuat di cache
    for (const h of items.value) {
      const nomor = getItemNomor(h);
      if (!detailCache.value[nomor] || detailCache.value[nomor].length === 0) {
        try {
          const res = await api.get("/mmt/lhk/mesin-cetak/details", {
            params: { nomor },
          });
          const d = res.data?.data?.details || res.data?.details || [];
          detailCache.value[nomor] = Array.isArray(d) ? d : [];
        } catch {
          detailCache.value[nomor] = [];
        }
      }
    }

    const fileName = `Laporan_Detail_LHK_Cetak_Mesin_${startDate.value}_to_${endDate.value}.xlsx`;
    const columns: ExcelColumn[] = [
      { header: "Nomor LHK", key: "Nomor", width: 22, align: "center" },
      { header: "Tanggal", key: "Tanggal", width: 14, align: "center" },
      { header: "Shift", key: "Shift", width: 10, align: "center" },
      { header: "Mesin", key: "Mesin", width: 12, align: "center" },
      { header: "Operator", key: "Operator", width: 16 },
      { header: "Status", key: "Status", width: 12, align: "center" },
      { header: "Bahan Awal (m)", key: "BahanAwal", width: 14, numFmt: "#,##0.00", align: "right" },
      { header: "Sisa Akhir (m)", key: "SisaAkhir", width: 14, numFmt: "#,##0.00", align: "right" },
      { header: "Nomor SPK", key: "NomorSPK", width: 20, align: "center" },
      { header: "Nama Produk SPK", key: "NamaSPK", width: 32 },
      { header: "Ukuran P x L", key: "Ukuran", width: 14, align: "center" },
      { header: "Order", key: "QtyOrder", width: 12, numFmt: "#,##0", align: "right" },
      { header: "C1", key: "C1", width: 8, numFmt: "#,##0", align: "right" },
      { header: "C2", key: "C2", width: 8, numFmt: "#,##0", align: "right" },
      { header: "C3", key: "C3", width: 8, numFmt: "#,##0", align: "right" },
      { header: "C4", key: "C4", width: 8, numFmt: "#,##0", align: "right" },
      { header: "C5", key: "C5", width: 8, numFmt: "#,##0", align: "right" },
      { header: "C6", key: "C6", width: 8, numFmt: "#,##0", align: "right" },
      { header: "C7", key: "C7", width: 8, numFmt: "#,##0", align: "right" },
      { header: "Total Cetak", key: "TotalCetak", width: 14, numFmt: "#,##0", align: "right" },
    ];

    const rows: any[] = [];
    for (const h of items.value) {
      const nomor = getItemNomor(h);
      const dtls = detailCache.value[nomor] || [];
      const tglFormatted = formatTanggal(h.Tanggal) || h.Tanggal || "-";

      if (dtls.length > 0) {
        dtls.forEach((d: any, idx: number) => {
          const totCtk = Number(
            d.totalcetak ??
              (Number(d.cetak1 || 0) +
                Number(d.cetak2 || 0) +
                Number(d.cetak3 || 0) +
                Number(d.cetak4 || 0) +
                Number(d.cetak5 || 0) +
                Number(d.cetak6 || 0) +
                Number(d.cetak7 || 0))
          );

          rows.push({
            Nomor: idx === 0 ? nomor : "",
            Tanggal: idx === 0 ? tglFormatted : "",
            Shift: idx === 0 ? (h.Shift || "-") : "",
            Mesin: idx === 0 ? (h.Mesin || "-") : "",
            Operator: idx === 0 ? (h.Operator || "-") : "",
            Status: idx === 0 ? (h.Status || "DRAFT") : "",
            BahanAwal: idx === 0 ? Number(h.PanjangBahanAwal || 0) : 0,
            SisaAkhir: idx === 0 ? Number(h.SisaMeterAkhir || 0) : 0,
            NomorSPK: d.nomor_spk || "-",
            NamaSPK: d.nama_spk || "-",
            Ukuran: `${Number(d.spk_panjang || 0).toFixed(2)} x ${Number(d.spk_lebar || 0).toFixed(2)}`,
            QtyOrder: Number(d.qty_order || 0),
            C1: Number(d.cetak1 || 0),
            C2: Number(d.cetak2 || 0),
            C3: Number(d.cetak3 || 0),
            C4: Number(d.cetak4 || 0),
            C5: Number(d.cetak5 || 0),
            C6: Number(d.cetak6 || 0),
            C7: Number(d.cetak7 || 0),
            TotalCetak: totCtk,
          });
        });
      } else {
        rows.push({
          Nomor: nomor,
          Tanggal: tglFormatted,
          Shift: h.Shift || "-",
          Mesin: h.Mesin || "-",
          Operator: h.Operator || "-",
          Status: h.Status || "DRAFT",
          BahanAwal: Number(h.PanjangBahanAwal || 0),
          SisaAkhir: Number(h.SisaMeterAkhir || 0),
          NomorSPK: h.NomorSPK || "-",
          NamaSPK: h.NamaOrder || "-",
          Ukuran: `${Number(h.spk_panjang || 0).toFixed(2)} x ${Number(h.spk_lebar || 0).toFixed(2)}`,
          QtyOrder: Number(h.JumlahOrder || 0),
          C1: 0,
          C2: 0,
          C3: 0,
          C4: 0,
          C5: 0,
          C6: 0,
          C7: 0,
          TotalCetak: Number(h.TotalCetak || 0),
        });
      }
    }

    await exportExcelSingle(
      fileName,
      "Detail_LHK_Cetak",
      columns,
      rows,
      `LAPORAN DETAIL LHK CETAK MESIN (${startDate.value} s/d ${endDate.value})`
    );
    toast.success("Export Detail Excel berhasil diunduh.");
  } catch (err: any) {
    toast.error("Gagal export Excel: " + (err.message || err));
  } finally {
    isExporting.value = false;
  }
};
</script>

<template>
  <BaseBrowse
    title="LHK Cetak (Mesin)"
    menu-id="5507"
    item-value="Nomor"
    :icon="IconPrinter"
    :headers="headers"
    :items="items || []"
    :is-loading="isLoading"
    v-model:selected="selected"
    :show-expand="true"
    :expanded="expanded"
    @update:expanded="onUpdateExpanded"
    :can-insert="canInsert"
    :can-edit="canEdit"
    :can-delete="canDelete"
    :can-export="canExport"
    :summary-columns="['JumlahOrder', 'TotalCetak', 'PanjangBahanAwal', 'SisaMeterAkhir']"
    @refresh="fetchData"
    @add="handleNew"
    @edit="handleEdit"
    @delete="handleDelete"
    @export="handleExportDetailExcel"
  >
    <!-- Header Extra Actions (Sejajar dengan CRUD di header atas) -->
    <template #extra-actions>
      <v-btn
        size="small"
        color="secondary"
        variant="tonal"
        class="text-none font-weight-medium"
        :disabled="!selectedItem"
        @click="handlePrint(selectedItem)"
      >
        <template #prepend>
          <IconPrinter :size="15" />
        </template>
        Cetak Slip LHK
      </v-btn>

      <v-btn
        size="small"
        color="success"
        variant="tonal"
        class="text-none font-weight-medium"
        :disabled="!items || items.length === 0"
        :loading="isExporting"
        @click="handleExportDetailExcel"
      >
        <template #prepend>
          <IconFileSpreadsheet :size="15" />
        </template>
        Export Detail
      </v-btn>
    </template>

    <!-- Filter Periode Tanggal -->
    <template #filter-left>
      <div class="filter-group">
        <span class="filter-label">Periode</span>
        <input
          type="date"
          v-model="startDate"
          class="date-inp"
          @change="fetchData"
        />
        <span class="filter-sep">s/d</span>
        <input
          type="date"
          v-model="endDate"
          class="date-inp"
          @change="fetchData"
        />
      </div>

      <!-- Keterangan Indikator Status (Sesuai MMT) -->
      <div class="status-legend-bar ml-3">
        <span class="legend-item">
          <span class="dot posted"></span> Posted
        </span>
        <span class="legend-item">
          <span class="dot draft"></span> Draft
        </span>
      </div>
    </template>

    <!-- Kolom Nomor LHK -->
    <template #item.Nomor="{ item }">
      <span class="font-monospace font-weight-bold text-primary">
        {{ (item.raw || item).Nomor }}
      </span>
    </template>

    <!-- Kolom Nomor SPK -->
    <template #item.NomorSPK="{ item }">
      <span
        class="font-monospace text-caption font-weight-medium text-truncate d-inline-block"
        style="max-width: 175px"
        :title="(item.raw || item).NomorSPK"
      >
        {{ (item.raw || item).NomorSPK || "-" }}
      </span>
    </template>

    <!-- Kolom Tanggal -->
    <template #item.Tanggal="{ item }">
      <span class="font-monospace text-caption">
        {{ formatTanggal((item.raw || item).Tanggal) }}
      </span>
    </template>

    <!-- Kolom Status -->
    <template #item.Status="{ item }">
      <v-chip
        size="x-small"
        :color="(item.raw || item).Status === 'POSTED' ? 'success' : 'warning'"
        class="font-weight-bold"
      >
        {{ (item.raw || item).Status || "DRAFT" }}
      </v-chip>
    </template>

    <!-- Kolom Shift & Mesin -->
    <template #item.Shift="{ item }">
      <span class="font-weight-bold text-caption">
        {{ (item.raw || item).Shift || "-" }}
      </span>
    </template>

    <template #item.Mesin="{ item }">
      <v-chip size="x-small" color="primary" variant="tonal" class="font-weight-medium">
        {{ (item.raw || item).Mesin || "-" }}
      </v-chip>
    </template>

    <!-- Kolom Format Angka -->
    <template #item.spk_panjang="{ item }">
      <span class="font-monospace text-caption">
        {{ Number((item.raw || item).spk_panjang || 0).toFixed(2) }}
      </span>
    </template>

    <template #item.spk_lebar="{ item }">
      <span class="font-monospace text-caption">
        {{ Number((item.raw || item).spk_lebar || 0).toFixed(2) }}
      </span>
    </template>

    <template #item.JumlahOrder="{ item }">
      <span class="font-monospace text-caption">
        {{ Number((item.raw || item).JumlahOrder || 0).toLocaleString("id-ID") }}
      </span>
    </template>

    <template #item.TotalCetak="{ item }">
      <span class="font-monospace font-weight-bold text-primary">
        {{ Number((item.raw || item).TotalCetak || 0).toLocaleString("id-ID") }}
      </span>
    </template>

    <template #item.PanjangBahanAwal="{ item }">
      <span class="font-monospace text-caption font-weight-semibold text-teal-darken-2">
        {{ Number((item.raw || item).PanjangBahanAwal || 0).toFixed(2) }} m
      </span>
    </template>

    <template #item.SisaMeterAkhir="{ item }">
      <span class="font-monospace font-weight-bold">
        {{ Number((item.raw || item).SisaMeterAkhir || 0).toFixed(2) }}
      </span>
    </template>

    <!-- Kolom Status Bahan (Surplus / Sisa / Pas Sesuai MMT) -->
    <template #item.status_bahan="{ item }">
      <span
        v-if="Number((item.raw || item).SisaMeterAkhir || 0) < 0"
        class="status-bahan-tag surplus"
      >
        SURPLUS {{ Math.abs(Number((item.raw || item).SisaMeterAkhir)).toFixed(1) }}m
      </span>
      <span
        v-else-if="Number((item.raw || item).SisaMeterAkhir || 0) > 0"
        class="status-bahan-tag sisa"
      >
        SISA {{ Number((item.raw || item).SisaMeterAkhir).toFixed(1) }}m
      </span>
      <span v-else class="status-bahan-tag pas">PAS</span>
    </template>

    <!-- ── DROPDOWN SUB-TABEL RINCIAN SPK COMBINE PER LHK ── -->
    <template #detail="{ item }">
      <div class="expand-detail-container pa-3">
        <div class="d-flex align-center justify-space-between mb-2">
          <div class="d-flex align-center">
            <span class="font-weight-bold text-primary text-caption">
              Rincian SPK Combine LHK: {{ getItemNomor(item) }}
            </span>
            <span class="text-caption text-grey ml-2">
              (Mesin: <strong>{{ (item.raw || item).Mesin }}</strong> &bull; Operator:
              <strong>{{ (item.raw || item).Operator || "-" }}</strong>)
            </span>
          </div>

          <v-btn
            size="x-small"
            color="primary"
            variant="tonal"
            class="text-none font-weight-medium"
            @click="handlePrint(item)"
          >
            <template #prepend>
              <IconPrinter :size="13" />
            </template>
            Cetak LHK Ini
          </v-btn>
        </div>

        <div v-if="loadingDetails[getItemNomor(item)]" class="text-center py-4 text-grey text-caption">
          <v-progress-circular indeterminate size="18" width="2" color="primary" class="mr-2" />
          Memuat rincian SPK...
        </div>

        <div v-else-if="getItemDetails(item).length === 0" class="text-caption text-grey py-3 text-center">
          Tidak ada detail SPK untuk dokumen LHK ini.
        </div>

        <v-table v-else density="compact" class="sub-detail-table border rounded">
          <thead>
            <tr>
              <th style="width: 35px" class="text-center">No</th>
              <th style="width: 160px">Nomor SPK</th>
              <th style="min-width: 180px">Nama Produk / SPK</th>
              <th style="width: 90px" class="text-center">Ukuran (m)</th>
              <th style="width: 75px" class="text-end">Order</th>
              <th style="width: 45px" class="text-end">C1</th>
              <th style="width: 45px" class="text-end">C2</th>
              <th style="width: 45px" class="text-end">C3</th>
              <th style="width: 45px" class="text-end">C4</th>
              <th style="width: 45px" class="text-end">C5</th>
              <th style="width: 45px" class="text-end">C6</th>
              <th style="width: 45px" class="text-end">C7</th>
              <th style="width: 80px" class="text-end font-weight-bold text-primary">Total Ctk</th>
              <th style="width: 80px" class="text-end">Luas (m²)</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(d, idx) in getItemDetails(item)" :key="idx">
              <td class="text-center text-caption">{{ idx + 1 }}</td>
              <td class="font-monospace text-caption font-weight-bold text-primary">
                {{ d.nomor_spk || d.spk_nomor }}
              </td>
              <td class="text-caption font-weight-medium">
                {{ d.nama_spk || d.spk_nama || "-" }}
              </td>
              <td class="text-center text-caption font-monospace">
                {{ Number(d.spk_panjang || 0).toFixed(2) }} &times; {{ Number(d.spk_lebar || 0).toFixed(2) }}
              </td>
              <td class="text-end text-caption font-monospace">
                {{ Number(d.qty_order || d.spk_qty || 0).toLocaleString("id-ID") }}
              </td>
              <td class="text-end text-caption">{{ Number(d.cetak1 || 0) || "-" }}</td>
              <td class="text-end text-caption">{{ Number(d.cetak2 || 0) || "-" }}</td>
              <td class="text-end text-caption">{{ Number(d.cetak3 || 0) || "-" }}</td>
              <td class="text-end text-caption">{{ Number(d.cetak4 || 0) || "-" }}</td>
              <td class="text-end text-caption">{{ Number(d.cetak5 || 0) || "-" }}</td>
              <td class="text-end text-caption">{{ Number(d.cetak6 || 0) || "-" }}</td>
              <td class="text-end text-caption">{{ Number(d.cetak7 || 0) || "-" }}</td>
              <td class="text-end text-caption font-weight-bold text-primary font-monospace">
                {{
                  Number(
                    d.totalcetak ??
                      (Number(d.cetak1 || 0) +
                        Number(d.cetak2 || 0) +
                        Number(d.cetak3 || 0) +
                        Number(d.cetak4 || 0) +
                        Number(d.cetak5 || 0) +
                        Number(d.cetak6 || 0) +
                        Number(d.cetak7 || 0))
                  ).toLocaleString("id-ID")
                }}
              </td>
              <td class="text-end text-caption font-monospace font-weight-semibold text-teal-darken-2">
                {{ Number(d.total_luas || d.luasm2 || 0).toFixed(2) }}
              </td>
            </tr>
          </tbody>
        </v-table>
      </div>
    </template>
  </BaseBrowse>
</template>

<style scoped>
.filter-group {
  display: flex;
  align-items: center;
  gap: 4px;
}
.filter-label {
  font-size: 11px;
  font-weight: 600;
  color: #555;
  margin-right: 2px;
}
.filter-sep {
  font-size: 11px;
  color: #777;
}
.date-inp {
  height: 26px;
  border: 1px solid #ccc;
  border-radius: 4px;
  padding: 0 4px;
  font-size: 11px;
  background: white;
  color: #212121;
}

/* ── STATUS LEGEND ── */
.status-legend-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  background: #f1f5f9;
  border: 1px solid #e2e8f0;
  border-radius: 4px;
  padding: 3px 8px;
  font-size: 10px;
  color: #475569;
}
.legend-item {
  display: flex;
  align-items: center;
  gap: 4px;
  font-weight: 600;
}
.dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
}
.dot.posted {
  background: #16a34a;
}
.dot.draft {
  background: #f59e0b;
}

/* ── STATUS BAHAN TAGS ── */
.status-bahan-tag {
  display: inline-block;
  padding: 2px 6px;
  border-radius: 3px;
  font-size: 9.5px;
  font-weight: 700;
  text-transform: uppercase;
}
.status-bahan-tag.surplus {
  background: #dcfce7;
  color: #15803d;
  border: 1px solid #bbf7d0;
}
.status-bahan-tag.sisa {
  background: #ffedd5;
  color: #c2410c;
  border: 1px solid #fed7aa;
}
.status-bahan-tag.pas {
  background: #f1f5f9;
  color: #64748b;
  border: 1px solid #cbd5e1;
}

/* ── SUB DETAIL TABLE EXPAND ── */
.expand-detail-container {
  background-color: #f8fafc;
  border-top: 1px dashed #cbd5e1;
  border-bottom: 1px dashed #cbd5e1;
  border-left: 3px solid #1976d2;
}

.sub-detail-table {
  background-color: #ffffff !important;
}

.sub-detail-table th {
  background-color: #f1f5f9 !important;
  color: #334155 !important;
  font-weight: 700 !important;
  font-size: 10.5px !important;
  text-transform: uppercase;
  letter-spacing: 0.2px;
  height: 28px !important;
  padding: 3px 6px !important;
}

.sub-detail-table td {
  font-size: 11px !important;
  height: 26px !important;
  padding: 2px 6px !important;
  color: #1e293b;
}
</style>
