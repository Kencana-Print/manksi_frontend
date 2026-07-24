<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useRouter } from "vue-router";
import { useToast } from "vue-toastification";
import BaseBrowse from "@/components/BaseBrowse.vue";
import { useBrowse } from "@/composables/useBrowse";
import { invoiceProformaService } from "@/services/penjualan/invoiceProformaService";
import {
  IconFileInvoice,
  IconPrinter,
  IconFileSpreadsheet,
  IconFileDescription,
} from "@tabler/icons-vue";
import { formatTanggal, formatTanggalJam } from "@/utils/dateFormat";

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

// --- STATE FILTER ---
const filterState = ref({
  startDate: getStartOfMonth(),
  endDate: getToday(),
});

// --- KOMPOSISI BROWSE ---
const {
  items,
  isLoading,
  selected,
  fetchData,
  canInsert,
  canEdit,
  canDelete,
  canExport,
  exportToExcel,
} = useBrowse({
  menuId: "157",
  fetchApi: async () => {
    const res = await invoiceProformaService.getBrowseList(
      filterState.value.startDate,
      filterState.value.endDate,
    );
    return res.data.data;
  },
  deleteApi: async (nomor: string) => {
    await invoiceProformaService.deleteData(nomor);
  },
});

// --- KONFIGURASI TABEL ---
const headers = [
  { title: "Nomor", key: "Nomor", width: "140px" },
  { title: "Tanggal", key: "Tanggal", width: "90px" },
  { title: "Divisi", key: "Divisi", width: "100px" },
  { title: "Nama Customer", key: "NamaCustomer", minWidth: "200px" },
  { title: "Keterangan", key: "Keterangan", minWidth: "150px" },
  { title: "Status", key: "Status", width: "90px", align: "center" },
  { title: "Otomatis", key: "Otomatis", width: "80px", align: "center" },
  { title: "Total", key: "Total", width: "120px", align: "end" },
  { title: "Faktur Pajak", key: "Faktur_Pajak", width: "140px" },
  { title: "Stat Exp", key: "Stat_Exp", width: "100px", align: "center" },
  { title: "Bayar", key: "Bayar", width: "110px", align: "end" },
  { title: "Tgl Pelunasan", key: "Tanggal_Pelunasan", width: "100px" },
  { title: "Tgl Bayar", key: "Tanggal_bayar", width: "100px" },
  { title: "Created", key: "Created", width: "140px" },
];

const num = (val: number) => new Intl.NumberFormat("id-ID").format(val || 0);

// Mewarnai baris berdasarkan Status Pengajuan PIN 5 (Sesuai cxGrdMasterCustomDrawCell Delphi)
const handleRowProps = (data: any) => {
  const item = data.item?.raw || data.item;
  if (item.Ngedit === "WAIT") {
    return {
      style: "color: white !important; background-color: #1976d2 !important;",
    }; // Biru
  } else if (item.Ngedit === "ACC") {
    return {
      style: "color: white !important; background-color: #2e7d32 !important;",
    }; // Hijau
  } else if (item.Ngedit === "TOLAK") {
    return {
      style: "color: white !important; background-color: #c62828 !important;",
    }; // Merah
  }
  return {};
};

const expandedRows = ref<any[]>([]);

// --- FUNGSI AKSI (BUTTONS) ---
const onAdd = () => {
  router.push("/penjualan/invoice-proforma/create");
};

const onEdit = (item: any) => {
  router.push(
    `/penjualan/invoice-proforma/edit/${encodeURIComponent(item.Nomor)}`,
  );
};

const onDelete = async (item: any) => {
  try {
    await invoiceProformaService.deleteData(item.Nomor);
    toast.success("Berhasil dihapus.");
    fetchData();
  } catch (error: any) {
    toast.error(error.response?.data?.message || "Gagal menghapus data.");
  }
};

const onPrint = () => {
  if (!selected.value.length)
    return toast.warning("Pilih data terlebih dahulu.");
  const nomor = selected.value[0].Nomor;
  window.open(
    `/penjualan/invoice-proforma/print/${encodeURIComponent(nomor)}`,
    "_blank",
  );
};

// --- EKSPORT DETAIL ---
const onExportDetail = async () => {
  try {
    const res = await invoiceProformaService.getExportDetail(
      filterState.value.startDate,
      filterState.value.endDate,
    );
    const rows = res.data.data;

    if (!rows || rows.length === 0)
      return toast.warning("Tidak ada detail untuk diexport.");

    const headersStr = Object.keys(rows[0]).join(",");
    const csvContent = [
      headersStr,
      ...rows.map((row: any) =>
        Object.keys(rows[0])
          .map((fieldName) => {
            let data = String(row[fieldName] ?? "");
            data = data.replace(/"/g, '""');
            if (
              data.includes(",") ||
              data.includes("\n") ||
              data.includes('"')
            ) {
              data = `"${data}"`;
            }
            return data;
          })
          .join(","),
      ),
    ].join("\n");

    const blob = new Blob(["\uFEFF" + csvContent], {
      type: "text/csv;charset=utf-8;",
    });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `Detail_InvoiceProforma_${filterState.value.startDate}_sd_${filterState.value.endDate}.csv`;
    link.click();
    toast.success("Berhasil export detail data.");
  } catch (error: any) {
    toast.error("Gagal export detail data.");
  }
};

// --- DIALOG PENGAJUAN PIN 5 ---
const actionDialog = ref(false);
const actionForm = ref({ nomor: "", alasan: "" });

const onAjukanPerubahan = () => {
  if (!selected.value.length)
    return toast.warning("Pilih data terlebih dahulu.");
  const item = selected.value[0];

  if (item.Ngedit === "ACC" || item.Ngedit === "") {
    actionForm.value = { nomor: item.Nomor, alasan: "" };
    actionDialog.value = true;
  } else {
    toast.info("Data ini sedang dalam antrian pengajuan.");
  }
};

const submitAjukan = async () => {
  if (!actionForm.value.alasan) return toast.warning("Alasan harus diisi.");
  try {
    await invoiceProformaService.ajukanPerubahan({
      nomor: actionForm.value.nomor,
      alasan: actionForm.value.alasan,
    });
    toast.success("Berhasil diajukan. Menunggu ACC.");
    actionDialog.value = false;
    fetchData();
  } catch (e: any) {
    toast.error(e.response?.data?.message || "Gagal Pengajuan.");
  }
};

onMounted(() => {
  fetchData();
});
</script>

<template>
  <BaseBrowse
    title="Invoice Proforma"
    menu-id="157"
    :icon="IconFileInvoice"
    :headers="headers"
    :items="items ?? []"
    :is-loading="isLoading"
    item-value="Nomor"
    show-expand
    v-model:expanded="expandedRows"
    v-model:selected="selected"
    v-model:filter-state="filterState"
    :can-insert="canInsert"
    :can-edit="canEdit"
    :can-delete="canDelete"
    :can-export="canExport"
    :row-props-fn="handleRowProps"
    @refresh="fetchData"
    @add="onAdd"
    @edit="onEdit"
    @delete="onDelete"
    @export="exportToExcel('Daftar_Invoice_Proforma')"
  >
    <!-- FILTER -->
    <template #filter-left>
      <div class="filter-group">
        <span class="filter-label">Tanggal</span>
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

      <!-- LEGEND PIN 5 -->
      <div class="legend-group">
        <span class="filter-label" style="color: #888">Status Ngedit:</span>
        <span class="badge-wait">Nunggu Acc</span>
        <span class="badge-acc">Sudah Acc</span>
        <span class="badge-tolak">Tolak</span>
      </div>
    </template>

    <!-- EXTRA TOMBOL -->
    <template #extra-actions="{ selected }">
      <v-btn
        v-if="canEdit"
        size="small"
        color="orange-darken-3"
        variant="outlined"
        :disabled="selected.length === 0"
        @click="onAjukanPerubahan"
      >
        <template #prepend>
          <span class="d-flex align-center">
            <IconFileDescription :size="15" :stroke-width="1.7" />
          </span>
        </template>
        Pengajuan
      </v-btn>

      <v-btn
        size="small"
        color="grey-darken-3"
        variant="flat"
        class="ml-2"
        :disabled="selected.length === 0"
        @click="onPrint"
      >
        <template #prepend>
          <span class="d-flex align-center">
            <IconPrinter :size="15" :stroke-width="1.7" />
          </span>
        </template>
        Cetak
      </v-btn>

      <v-btn
        size="small"
        color="green-darken-3"
        variant="outlined"
        class="ml-2"
        @click="onExportDetail"
      >
        <template #prepend>
          <span class="d-flex align-center">
            <IconFileSpreadsheet :size="15" :stroke-width="1.7" />
          </span>
        </template>
        Export Detail
      </v-btn>
    </template>

    <!-- FORMAT KOLOM UTAMA -->
    <template #item.Tanggal="{ item }">
      {{ formatTanggal(item.Tanggal) }}
    </template>
    <template #item.Tanggal_Pelunasan="{ item }">
      {{ formatTanggal(item.Tanggal_Pelunasan) }}
    </template>
    <template #item.Tanggal_bayar="{ item }">
      {{ formatTanggal(item.Tanggal_bayar) }}
    </template>
    <template #item.Total="{ item }">{{ num(item.Total) }}</template>
    <template #item.Bayar="{ item }">{{ num(item.Bayar) }}</template>
    <template #item.Created="{ item }">
      {{ formatTanggalJam(item.Created) }}
    </template>

    <!-- GRID DETAIL EXPAND -->
    <template #detail="{ item }">
      <div class="det-wrap">
        <div class="det-card">
          <div class="det-head">Detail Barang Invoice</div>
          <div class="dt-scroll">
            <table class="dt">
              <thead>
                <tr>
                  <th style="width: 28px">No</th>
                  <th style="width: 140px; text-align: left">Kode SPK</th>
                  <th style="text-align: left">Nama Barang</th>
                  <th style="width: 100px; text-align: left">Ukuran</th>
                  <th style="width: 80px; text-align: right">Jumlah</th>
                  <th style="width: 100px; text-align: right">Harga</th>
                  <th style="width: 100px; text-align: right">Harga Riil</th>
                  <th style="width: 100px; text-align: right">Fee</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(dtl, i) in item.details" :key="i">
                  <td class="tc">{{ Number(i) + 1 }}</td>
                  <td style="font-weight: 600; color: #00796b">
                    {{ dtl.Kode }}
                  </td>
                  <td>{{ dtl.Nama }}</td>
                  <td>{{ dtl.Ukuran }}</td>
                  <td class="tr" style="font-weight: 700">
                    {{ num(dtl.Jumlah) }}
                  </td>
                  <td class="tr">{{ num(dtl.Harga) }}</td>
                  <td class="tr text-grey">{{ num(dtl.HargaRiil) }}</td>
                  <td class="tr text-grey">{{ num(dtl.Fee) }}</td>
                </tr>
                <tr v-if="!item.details?.length">
                  <td colspan="8" class="empty-td">
                    Tidak ada rincian barang.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </template>
  </BaseBrowse>

  <!-- DIALOG PENGAJUAN PIN 5 -->
  <v-dialog v-model="actionDialog" max-width="400px" persistent>
    <div class="close-dlg">
      <div class="close-dlg-header" style="background: #1565c0">
        <span class="d-flex align-center mr-2"
          ><IconFileDescription size="16" color="white"
        /></span>
        Pengajuan Perubahan Data
        <button class="dlg-x" @click="actionDialog = false">✕</button>
      </div>
      <div class="close-dlg-body">
        <div class="f-lbl-sm mb-1">Alasan Pengajuan:</div>
        <textarea
          v-model="actionForm.alasan"
          class="close-area"
          rows="3"
          placeholder="Masukkan alasan pengajuan edit (wajib)..."
        ></textarea>
      </div>
      <div class="close-dlg-footer">
        <button
          class="dlg-btn text-white"
          style="background: #1565c0"
          @click="submitAjukan"
        >
          Kirim Pengajuan
        </button>
        <button class="dlg-btn cancel" @click="actionDialog = false">
          Batal
        </button>
      </div>
    </div>
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
}
.date-inp:focus {
  border-color: #1976d2;
}

/* LEGEND PIN 5 */
.legend-group {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.badge-wait {
  background: #1976d2;
  color: white;
  border-radius: 3px;
  padding: 2px 6px;
  font-size: 10px;
  font-weight: 700;
}
.badge-acc {
  background: #2e7d32;
  color: white;
  border-radius: 3px;
  padding: 2px 6px;
  font-size: 10px;
  font-weight: 700;
}
.badge-tolak {
  background: #c62828;
  color: white;
  border-radius: 3px;
  padding: 2px 6px;
  font-size: 10px;
  font-weight: 700;
}

/* GRID EXPAND DETAIL */
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
  padding: 4px 9px;
  flex-shrink: 0;
}
.dt-scroll {
  overflow-y: auto;
  max-height: 250px;
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
  text-align: center;
  border: 1px solid rgba(0, 0, 0, 0.15);
  background: #f5f5f5;
  color: #333;
  position: sticky;
  top: 0;
  z-index: 2;
}
.dt td {
  border-bottom: 1px solid #eeeeee;
  padding: 3px 6px;
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

/* DIALOG PENGAJUAN */
.close-dlg {
  background: white;
  border-radius: 8px;
  overflow: hidden;
  font-family: sans-serif;
  font-size: 12px;
}
.close-dlg-header {
  display: flex;
  align-items: center;
  padding: 9px 14px;
  font-size: 13px;
  font-weight: 700;
  color: white;
}
.dlg-x {
  margin-left: auto;
  background: transparent;
  border: none;
  color: white;
  font-size: 15px;
  cursor: pointer;
}
.close-dlg-body {
  padding: 14px;
}
.f-lbl-sm {
  font-size: 11px;
  font-weight: 600;
  color: #424242;
}
.close-area {
  width: 100%;
  border: 1px solid #bdbdbd;
  border-radius: 4px;
  padding: 6px 8px;
  font-size: 11px;
  outline: none;
  resize: none;
  box-sizing: border-box;
}
.close-area:focus {
  border-color: #1565c0;
}
.close-dlg-footer {
  display: flex;
  gap: 8px;
  padding: 10px 14px;
  border-top: 1px solid #e0e0e0;
  background: #fafafa;
}
.dlg-btn {
  height: 28px;
  padding: 0 14px;
  border: none;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
}
.dlg-btn.cancel {
  background: #e0e0e0;
  color: #424242;
  margin-left: auto;
}
</style>
