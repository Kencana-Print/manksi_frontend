<script setup lang="ts">
import { ref, computed } from "vue";
import { useRouter } from "vue-router";
import { useToast } from "vue-toastification";
import BaseBrowse from "@/components/BaseBrowse.vue";
import { useBrowse } from "@/composables/useBrowse";
import { insentifService } from "@/services/penjualan/insentifService";
import {
  IconCoin,
  IconPrinter,
  IconFileSpreadsheet,
  IconCash,
} from "@tabler/icons-vue";
import { formatTanggal, formatTanggalJam } from "@/utils/dateFormat";
import { exportExcelSingle } from "@/utils/excelExport";
import { cetakInsentifExcel } from "@/utils/cetakInsentif";

const router = useRouter();
const toast = useToast();
const menuId = "167";

// ── Filter default: awal bulan s.d. hari ini ────────────────────────
const getStartOfMonth = () => {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}-01`;
};
const getToday = () => {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const filterState = ref({
  startDate: getStartOfMonth(),
  endDate: getToday(),
});

const { items, isLoading, selected, fetchData, canInsert, canDelete } =
  useBrowse({
    menuId,
    fetchApi: async () => {
      const res = await insentifService.getBrowseList(filterState.value);
      return res.data.data || [];
    },
    immediate: true,
  });

const expandedRows = ref<any[]>([]);

// ── Kolom ──────────────────────────────────────────────────────────
const headers = [
  { title: "Nomor", key: "Nomor", width: "150px" },
  { title: "Tanggal", key: "Tanggal", width: "100px" },
  { title: "Customer", key: "Cus_nama", minWidth: "220px" },
  { title: "Alamat", key: "Cus_alamat", minWidth: "220px" },
  { title: "Kota", key: "Cus_kota", width: "130px" },
  { title: "Created", key: "Created", width: "100px" },
  { title: "Realisasi", key: "Realisasi", width: "90px", align: "center" },
  { title: "Tgl. Realisasi", key: "TglRealisasi", width: "110px" },
];

// Baris merah untuk yang belum realisasi — replikasi
// cxGrdMasterCustomDrawCell (font merah selama Realisasi <> 'SUDAH')
const getRowProps = (data: any) => {
  const item = data.item?.raw || data.item;
  if (item.Realisasi !== "SUDAH") {
    return { style: "color:#d32f2f!important;font-weight:600" };
  }
  return {};
};

const num = (val: number | string | null) => {
  if (!val) return "0";
  return new Intl.NumberFormat("id-ID").format(Number(val));
};

// ── Aksi: Baru ─────────────────────────────────────────────────────
const goAdd = () => router.push({ name: "InsentifFormCreate" });

// ── Aksi: Hapus ────────────────────────────────────────────────────
const goDelete = async (item: any) => {
  isLoading.value = true;
  try {
    await insentifService.deleteData(item.Nomor);
    toast.success("Berhasil dihapus.");
    fetchData();
  } catch (e: any) {
    toast.error(e.response?.data?.message || "Gagal menghapus data.");
  } finally {
    isLoading.value = false;
  }
};

// ── Aksi: Cetak (Excel, replikasi persis cetak() Delphi) ──────────
const isCetaking = ref(false);
const onCetak = async () => {
  if (!selected.value.length) return;
  isCetaking.value = true;
  try {
    await cetakInsentifExcel(selected.value[0].Nomor);
  } catch (e: any) {
    toast.error(e.response?.data?.message || "Gagal mencetak.");
  } finally {
    isCetaking.value = false;
  }
};

// ── Aksi: Export ───────────────────────────────────────────────────
const onExport = async () => {
  if (!items.value?.length) {
    return toast.warning("Tidak ada data untuk diexport.");
  }
  const rows = items.value.map((m: any) => ({
    Nomor: m.Nomor,
    Tanggal: formatTanggal(m.Tanggal),
    Customer: m.Cus_nama,
    Alamat: m.Cus_alamat,
    Kota: m.Cus_kota,
    Created: m.Created,
    Realisasi: m.Realisasi || "",
    TglRealisasi: m.Realisasi === "SUDAH" ? formatTanggal(m.TglRealisasi) : "",
  }));
  await exportExcelSingle(
    `Insentif_${filterState.value.startDate}_sd_${filterState.value.endDate}.xlsx`,
    "Insentif",
    [
      { header: "Nomor", key: "Nomor", width: 18 },
      { header: "Tanggal", key: "Tanggal", width: 12 },
      { header: "Customer", key: "Customer", width: 30 },
      { header: "Alamat", key: "Alamat", width: 35 },
      { header: "Kota", key: "Kota", width: 18 },
      { header: "Created", key: "Created", width: 14 },
      { header: "Realisasi", key: "Realisasi", width: 12 },
      { header: "Tgl. Realisasi", key: "TglRealisasi", width: 14 },
    ],
    rows,
    `Insentif — Periode ${formatTanggal(filterState.value.startDate)} s/d ${formatTanggal(filterState.value.endDate)}`,
  );
};

// ── Aksi: Export Detail ────────────────────────────────────────────
const onExportDetail = async () => {
  if (!items.value?.length) {
    return toast.warning("Tidak ada data untuk diexport.");
  }
  const rows: any[] = [];
  items.value.forEach((master: any) => {
    if (master.detail && master.detail.length > 0) {
      master.detail.forEach((d: any) => {
        rows.push({
          Nomor: master.Nomor,
          Tanggal: formatTanggal(master.Tanggal),
          Customer: master.Cus_nama,
          Invoice: d.Invoice,
          TglInvoice: formatTanggal(d.TglInvoice),
          FakturPajak: d.FakturPajak || "",
          Nominal: Number(d.Nominal) || 0,
          Bayar: Number(d.Bayar) || 0,
          SisaPiutang: Number(d.SisaPiutang) || 0,
          Keterangan: d.Keterangan || "",
        });
      });
    }
  });
  if (rows.length === 0) {
    return toast.warning("Tidak ada rincian invoice untuk diexport.");
  }
  await exportExcelSingle(
    `Insentif_Detail_${filterState.value.startDate}_sd_${filterState.value.endDate}.xlsx`,
    "Detail Insentif",
    [
      { header: "Nomor", key: "Nomor", width: 18 },
      { header: "Tanggal", key: "Tanggal", width: 12 },
      { header: "Customer", key: "Customer", width: 28 },
      { header: "Invoice", key: "Invoice", width: 18 },
      { header: "Tgl Invoice", key: "TglInvoice", width: 12 },
      { header: "Faktur Pajak", key: "FakturPajak", width: 22 },
      {
        header: "Nominal",
        key: "Nominal",
        width: 16,
        align: "right",
        numFmt: "#,##0",
      },
      {
        header: "Bayar",
        key: "Bayar",
        width: 16,
        align: "right",
        numFmt: "#,##0",
      },
      {
        header: "Sisa Piutang",
        key: "SisaPiutang",
        width: 16,
        align: "right",
        numFmt: "#,##0",
      },
      { header: "Keterangan", key: "Keterangan", width: 30 },
    ],
    rows,
  );
};

// ── Aksi: Realisasi Transfer ───────────────────────────────────────
const showRealisasiDialog = ref(false);
const realisasiItem = ref<any>(null);
const tanggalRealisasi = ref(getToday());
const isSavingRealisasi = ref(false);

const openRealisasiDialog = () => {
  if (!selected.value.length) return;
  const item = selected.value[0];
  if (item.Realisasi === "SUDAH") {
    return toast.warning("Data ini sudah direalisasi.");
  }
  realisasiItem.value = item;
  tanggalRealisasi.value = getToday();
  showRealisasiDialog.value = true;
};

const confirmRealisasi = async () => {
  if (!tanggalRealisasi.value) {
    return toast.warning("Tanggal realisasi wajib diisi.");
  }
  isSavingRealisasi.value = true;
  try {
    await insentifService.realisasiTransfer(
      realisasiItem.value.Nomor,
      tanggalRealisasi.value,
    );
    toast.success("Realisasi transfer berhasil disimpan.");
    showRealisasiDialog.value = false;
    fetchData();
  } catch (e: any) {
    toast.error(e.response?.data?.message || "Gagal menyimpan realisasi.");
  } finally {
    isSavingRealisasi.value = false;
  }
};
</script>

<template>
  <BaseBrowse
    title="Insentif"
    :menu-id="menuId"
    :icon="IconCoin"
    :headers="headers"
    :items="items ?? []"
    :is-loading="isLoading"
    item-value="Nomor"
    show-expand
    v-model:expanded="expandedRows"
    v-model:selected="selected"
    v-model:filter-state="filterState"
    :can-insert="canInsert"
    :can-delete="canDelete"
    :row-props-fn="getRowProps"
    @refresh="fetchData"
    @add="goAdd"
    @delete="goDelete"
  >
    <!-- ── Filter bar ── -->
    <template #filter-left>
      <div class="filter-group">
        <span class="filter-label">Periode</span>
        <input
          type="date"
          v-model="filterState.startDate"
          class="date-inp"
          @change="fetchData"
        />
        <span class="filter-sep">s/d</span>
        <input
          type="date"
          v-model="filterState.endDate"
          class="date-inp"
          @change="fetchData"
        />
      </div>

      <div class="filter-divider" />

      <div class="legend-group">
        <div class="legend-item">
          <div class="ldot" style="background: #d32f2f"></div>
          <span>Belum Realisasi Transfer</span>
        </div>
      </div>
    </template>

    <!-- ── Tombol aksi tambahan ── -->
    <template #extra-actions="{ selected }">
      <v-btn
        size="small"
        color="teal-darken-1"
        :disabled="selected.length === 0"
        @click="openRealisasiDialog"
      >
        <template #prepend
          ><IconCash :size="15" :stroke-width="1.7"
        /></template>
        Realisasi Transfer
      </v-btn>

      <v-btn
        size="small"
        color="blue-grey"
        class="ml-2"
        :disabled="selected.length === 0"
        :loading="isCetaking"
        @click="onCetak"
      >
        <template #prepend
          ><IconPrinter :size="15" :stroke-width="1.7"
        /></template>
        Cetak Excel
      </v-btn>

      <v-btn
        size="small"
        color="green-darken-2"
        variant="outlined"
        class="ml-2"
        @click="onExport"
      >
        <template #prepend
          ><IconFileSpreadsheet :size="15" :stroke-width="1.7"
        /></template>
        Export
      </v-btn>

      <v-btn
        size="small"
        color="green-darken-3"
        variant="outlined"
        class="ml-2"
        @click="onExportDetail"
      >
        <template #prepend
          ><IconFileSpreadsheet :size="15" :stroke-width="1.7"
        /></template>
        Export Detail
      </v-btn>
    </template>

    <!-- ── Kolom custom ── -->
    <template #item.Tanggal="{ item }">
      {{ formatTanggal(item.Tanggal) }}
    </template>
    <template #item.Realisasi="{ item }">
      <span v-if="item.Realisasi === 'SUDAH'" class="chip-sudah">SUDAH</span>
      <span v-else class="chip-belum">BELUM</span>
    </template>
    <template #item.TglRealisasi="{ item }">
      {{ item.Realisasi === "SUDAH" ? formatTanggal(item.TglRealisasi) : "-" }}
    </template>

    <!-- ── Detail Expand ── -->
    <template #detail="{ item }">
      <div class="det-wrap">
        <div class="det-card">
          <div class="det-head">Detail Invoice</div>
          <div class="dt-scroll">
            <table class="dt">
              <thead>
                <tr>
                  <th style="width: 28px">No</th>
                  <th style="width: 130px; text-align: left">Invoice</th>
                  <th style="width: 90px">Tgl Invoice</th>
                  <th style="width: 150px">Faktur Pajak</th>
                  <th style="width: 100px; text-align: right">Nominal</th>
                  <th style="width: 100px; text-align: right">Bayar</th>
                  <th style="width: 100px; text-align: right">Sisa Piutang</th>
                  <th style="text-align: left">Keterangan</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(d, i) in item.detail" :key="i">
                  <td class="tc">{{ Number(i) + 1 }}</td>
                  <td style="font-weight: 600; color: #1565c0">
                    {{ d.Invoice }}
                  </td>
                  <td class="tc">{{ formatTanggal(d.TglInvoice) }}</td>
                  <td>{{ d.FakturPajak }}</td>
                  <td class="tr" style="font-weight: 700">
                    {{ num(d.Nominal) }}
                  </td>
                  <td class="tr">{{ num(d.Bayar) }}</td>
                  <td
                    class="tr"
                    :style="
                      Number(d.SisaPiutang) > 0
                        ? 'color:#c62828;font-weight:700'
                        : ''
                    "
                  >
                    {{ num(d.SisaPiutang) }}
                  </td>
                  <td>{{ d.Keterangan }}</td>
                </tr>
                <tr v-if="!item.detail?.length">
                  <td colspan="8" class="empty-td">
                    Tidak ada rincian invoice.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </template>
  </BaseBrowse>

  <!-- ── Dialog Realisasi Transfer ── -->
  <v-dialog v-model="showRealisasiDialog" max-width="380px" persistent>
    <v-card class="rounded-lg">
      <v-card-title
        class="pa-3 bg-teal-darken-1 text-white"
        style="font-size: 13px; font-weight: 700"
      >
        Realisasi Transfer
      </v-card-title>
      <v-card-text class="pa-4" style="font-size: 12px">
        <div class="mb-2">
          <b>{{ realisasiItem?.Nomor }}</b> — {{ realisasiItem?.Cus_nama }}
        </div>
        <label style="font-size: 11px; font-weight: 600; color: #444"
          >Tanggal Realisasi</label
        >
        <input
          type="date"
          v-model="tanggalRealisasi"
          class="date-inp"
          style="width: 100%; margin-top: 4px"
        />
      </v-card-text>
      <v-card-actions class="pa-3 border-t">
        <v-spacer />
        <v-btn
          variant="text"
          size="small"
          :disabled="isSavingRealisasi"
          @click="showRealisasiDialog = false"
          >Batal</v-btn
        >
        <v-btn
          variant="flat"
          size="small"
          color="teal-darken-1"
          :loading="isSavingRealisasi"
          @click="confirmRealisasi"
          >Ya, Simpan</v-btn
        >
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.filter-group {
  display: flex;
  align-items: center;
  gap: 6px;
}
.filter-label {
  font-size: 11px;
  font-weight: 700;
  color: #555;
  white-space: nowrap;
}
.filter-sep {
  font-size: 11px;
  color: #888;
}
.filter-divider {
  width: 1px;
  height: 22px;
  background: #d0d0d0;
  margin: 0 10px;
  flex-shrink: 0;
}
.date-inp {
  height: 28px;
  border: 1px solid #ccc;
  border-radius: 4px;
  padding: 0 6px;
  font-size: 12px;
  background: white;
  outline: none;
  color: #212121;
}
.date-inp:focus {
  border-color: #1976d2;
}
.ml-2 {
  margin-left: 8px;
}

.legend-group {
  display: flex;
  align-items: center;
  gap: 8px;
}
.legend-item {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
}
.ldot {
  width: 11px;
  height: 11px;
  border-radius: 2px;
  border: 1px solid rgba(0, 0, 0, 0.1);
  flex-shrink: 0;
}

.chip-sudah {
  background: #e8f5e9;
  color: #2e7d32;
  border-radius: 10px;
  padding: 1px 8px;
  font-size: 10px;
  font-weight: 700;
}
.chip-belum {
  background: #ffebee;
  color: #c62828;
  border-radius: 10px;
  padding: 1px 8px;
  font-size: 10px;
  font-weight: 700;
}

.det-wrap {
  padding: 6px 8px 8px 48px;
  background: #f5f6f8;
}
.det-card {
  border: 1px solid #d0d0d0;
  border-radius: 4px;
  overflow: hidden;
  background: white;
}
.det-head {
  background: #00796b;
  color: white;
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  padding: 4px 9px;
}
.dt-scroll {
  overflow-y: auto;
  max-height: 200px;
}
.dt {
  width: 100%;
  border-collapse: collapse;
  font-size: 11px;
}
.dt th {
  padding: 4px 7px;
  font-size: 10px;
  font-weight: 700;
  color: white;
  background: #00796b;
  text-align: center;
  border: 1px solid rgba(0, 0, 0, 0.15);
  white-space: nowrap;
  position: sticky;
  top: 0;
  z-index: 2;
}
.dt td {
  border-bottom: 1px solid #eeeeee;
  padding: 3px 6px;
  vertical-align: middle;
}
.dt tbody tr:nth-of-type(even) td {
  background: #fafafa;
}
.tc {
  text-align: center;
}
.tr {
  text-align: right;
}
.empty-td {
  text-align: center;
  color: #9e9e9e;
  font-style: italic;
  padding: 12px !important;
}
</style>
