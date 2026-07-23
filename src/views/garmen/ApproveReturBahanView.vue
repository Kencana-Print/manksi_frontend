<script setup lang="ts">
import { ref } from "vue";
import { useRouter } from "vue-router";
import { useToast } from "vue-toastification";
import { useBrowse } from "@/composables/useBrowse";
import { approveReturBahanService } from "@/services/garmen/approveReturBahanService";
import BaseBrowse from "@/components/BaseBrowse.vue";
import ApproveReturBarcodeDialog from "./ApproveReturBarcodeDialog.vue";
import {
  IconDiscountCheckFilled,
  IconCircleCheck,
  IconBarcode,
  IconFileSpreadsheet,
} from "@tabler/icons-vue";
import { formatTanggal } from "@/utils/dateFormat";

const router = useRouter();
const toast = useToast();

const getToday = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const getFirstDayOfMonth = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
};

const filterState = ref({
  startDate: getFirstDayOfMonth(),
  endDate: getToday(),
});

const {
  items,
  isLoading,
  selected,
  fetchData,
  canInsert, // Tidak dipakai untuk Insert baru
  canEdit,
  canDelete,
  canExport,
  exportToExcel,
} = useBrowse({
  menuId: "137",
  fetchApi: async () => {
    const res = await approveReturBahanService.getBrowse({
      startDate: filterState.value.startDate,
      endDate: filterState.value.endDate,
    });
    return res.data.data || [];
  },
  // Batal Approve di-mapping ke deleteApi
  deleteApi: async (nomor) => {
    if (!items.value) return;

    const item = items.value.find((i: any) => i.Nomor === nomor);
    // VALIDASI: Jika tidak ada NoApprov (berarti belum di-approve) -> Error
    if (!item?.NoApprov || item.NoApprov.trim() === "") {
      throw new Error("No. Retur tersebut belum di-approve.");
    }
    await approveReturBahanService.batalApprove(item.NoApprov);
  },
});

const headers = [
  { title: "Nomor", key: "Nomor", width: "150px" },
  { title: "Tanggal", key: "Tanggal", width: "110px" },
  { title: "Tujuan", key: "Tujuan", width: "180px" },
  { title: "Dari", key: "Dari", width: "160px" },
  { title: "Keterangan", key: "Keterangan", minWidth: "150px" },
  { title: "Created", key: "Created", width: "100px" },
  { title: "NoApprov", key: "NoApprov", width: "140px" },
  { title: "TglApprov", key: "TglApprov", width: "110px" },
  { title: "Approved", key: "Approved", width: "100px" },
];

// Pewarnaan baris: Merah jika belum di-approve
const getRowProps = (data: any) => {
  const item = data.item?.raw || data.item;
  if (!item.NoApprov || item.NoApprov.trim() === "") {
    return { style: "color:#c62828!important;" }; // Merah
  }
  return {};
};

const num = (val: any) =>
  Number(val || 0).toLocaleString("id-ID", { maximumFractionDigits: 2 });

const expandedRows = ref<any[]>([]);

// Aksi Tombol
const onApprove = (item: any) => {
  if (!canEdit.value)
    return toast.warning("Anda tidak berhak mengakses modul ini.");

  // Jika sudah di-approve, kita lempar nomor RETP-nya agar form masuk ke mode Edit
  // Jika belum, kita lempar nomor RETL-nya agar form masuk ke mode Generate
  const nomorToOpen =
    item.NoApprov && item.NoApprov.trim() !== "" ? item.NoApprov : item.Nomor;

  router.push({
    name: "GarmenApproveReturBahanForm",
    params: { nomor: nomorToOpen },
  });
};

const onExportDetail = () => {
  if (!items.value || items.value.length === 0) {
    return toast.warning("Tidak ada data untuk diexport.");
  }

  // 1. Ratakan (Flatten) data master dan detail menjadi satu array
  const rows: any[] = [];
  items.value.forEach((master: any) => {
    if (master.details && master.details.length > 0) {
      master.details.forEach((dtl: any) => {
        rows.push({
          "Nomor Approve": master.NoApprov || "",
          "Tgl. Approve": master.TglApprov
            ? formatTanggal(master.TglApprov)
            : "",
          "Nomor Retur Log": master.Nomor,
          "Tgl. Retur": formatTanggal(master.Tanggal),
          "Gudang Tujuan": master.Tujuan,
          "Gudang Dari": master.Dari,
          "Status Approve": master.NoApprov ? "SUDAH" : "BELUM",
          "Kode Bahan": dtl.Kode,
          "Nama Bahan": dtl.Nama,
          Satuan: dtl.Satuan,
          Jumlah: dtl.Jumlah,
          Roll: dtl.Roll,
          "No. Minta": dtl.NoMinta,
          SPK: dtl.SPK,
          "Keterangan Detail": dtl.Keterangan || "",
        });
      });
    }
  });

  if (rows.length === 0) {
    return toast.warning("Tidak ada rincian barang untuk diexport.");
  }

  // 2. Buat header CSV berdasarkan key object
  const headers = Object.keys(rows[0]);

  // 3. Konversi data ke string CSV
  const csvContent = [
    headers.join(","),
    ...rows.map((row) =>
      headers
        .map((fieldName) => {
          let data =
            row[fieldName] !== null && row[fieldName] !== undefined
              ? String(row[fieldName])
              : "";
          // Escape tanda kutip ganda dan bungkus dengan kutip jika ada koma/enter (standar CSV Excel)
          data = data.replace(/"/g, '""');
          if (data.includes(",") || data.includes("\n") || data.includes('"')) {
            data = `"${data}"`;
          }
          return data;
        })
        .join(","),
    ),
  ].join("\n");

  // 4. Proses Download Otomatis
  const blob = new Blob(["\uFEFF" + csvContent], {
    type: "text/csv;charset=utf-8;",
  }); // \uFEFF agar Excel membaca UTF-8 dengan benar
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);

  link.setAttribute("href", url);
  link.setAttribute(
    "download",
    `Export_Detail_Approve_Retur_${filterState.value.startDate}_sd_${filterState.value.endDate}.csv`,
  );
  link.style.visibility = "hidden";

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  toast.success("Berhasil meng-export detail data.");
};

const showPrintDialog = ref(false);
const nomorToPrint = ref("");

const onCetakBarcode = (item: any) => {
  nomorToPrint.value = item.Nomor;
  showPrintDialog.value = true;
};
</script>

<template>
  <BaseBrowse
    title="Approve Retur Permintaan Bahan"
    menu-id="137"
    :icon="IconDiscountCheckFilled"
    :headers="headers"
    :items="items ?? []"
    :is-loading="isLoading"
    item-value="Nomor"
    show-expand
    v-model:expanded="expandedRows"
    v-model:selected="selected"
    v-model:filter-state="filterState"
    :can-insert="false"
    :can-edit="false"
    :can-delete="canDelete"
    :can-export="canExport"
    :row-props-fn="getRowProps"
    @refresh="fetchData"
    @export="exportToExcel('Approve_Retur_Bahan')"
  >
    <!-- Filter Bar -->
    <template #filter-left>
      <div class="filter-group">
        <span class="filter-label">Tgl Retur</span>
        <input
          type="date"
          v-model="filterState.startDate"
          class="date-inp"
          @change="fetchData"
        />
        <span class="filter-sep">sd</span>
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
          <div class="ldot" style="background: #c62828"></div>
          <span>Belum di Approve</span>
        </div>
      </div>
    </template>

    <!-- Tombol Custom sesuai referensi Delphi -->
    <template #extra-actions="{ selected }">
      <v-btn
        size="small"
        :color="
          selected[0]?.NoApprov && selected[0].NoApprov.trim() !== ''
            ? 'warning'
            : 'success'
        "
        :disabled="selected.length === 0"
        @click="onApprove(selected[0])"
      >
        <template #prepend>
          <IconCircleCheck :size="15" :stroke-width="1.7" />
        </template>
        {{
          selected[0]?.NoApprov && selected[0].NoApprov.trim() !== ""
            ? "Ubah / Cek"
            : "Approve"
        }}
      </v-btn>

      <v-btn
        size="small"
        color="grey-darken-3"
        class="ml-2"
        :disabled="
          selected.length === 0 ||
          !selected[0]?.NoApprov ||
          selected[0].NoApprov.trim() === ''
        "
        @click="onCetakBarcode(selected[0])"
      >
        <template #prepend>
          <IconBarcode :size="15" :stroke-width="1.7" />
        </template>
        Cetak Barcode
      </v-btn>

      <v-btn
        size="small"
        color="green-darken-3"
        variant="outlined"
        class="ml-2"
        @click="onExportDetail"
      >
        <template #prepend>
          <IconFileSpreadsheet :size="15" :stroke-width="1.7" />
        </template>
        Export Detail
      </v-btn>
    </template>

    <!-- Kustomisasi Tampilan Kolom Tanggal -->
    <template #item.Tanggal="{ item }">
      {{ formatTanggal(item.raw?.Tanggal || item.Tanggal) }}
    </template>

    <template #item.TglApprov="{ item }">
      {{ formatTanggal(item.raw?.TglApprov || item.TglApprov) }}
    </template>

    <!-- Expandable Details -->
    <template #detail="{ item }">
      <div class="det-wrap">
        <table class="dt" v-if="item.details?.length">
          <thead>
            <tr>
              <th style="width: 40px">No</th>
              <th style="width: 120px; text-align: left">Kode</th>
              <th style="text-align: left">Nama Bahan</th>
              <th style="width: 60px">Satuan</th>
              <th style="width: 90px; text-align: right">Jumlah</th>
              <th style="width: 70px; text-align: right">Roll</th>
              <th style="width: 150px; text-align: left">No. Minta</th>
              <th style="width: 150px; text-align: left">SPK</th>
              <th style="text-align: left">Keterangan</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(d, i) in item.details" :key="i">
              <td class="tc">{{ Number(i) + 1 }}</td>
              <td style="font-weight: 600; color: #1565c0">{{ d.Kode }}</td>
              <td>{{ d.Nama }}</td>
              <td class="tc">{{ d.Satuan }}</td>
              <td class="tr" style="font-weight: 600">{{ num(d.Jumlah) }}</td>
              <td class="tr">{{ num(d.Roll) }}</td>
              <td>{{ d.NoMinta }}</td>
              <td>{{ d.SPK }}</td>
              <td>{{ d.Keterangan }}</td>
            </tr>
          </tbody>
        </table>
        <div v-else class="empty-td">Tidak ada detail barang.</div>
      </div>
    </template>
  </BaseBrowse>

  <ApproveReturBarcodeDialog v-model="showPrintDialog" :nomor="nomorToPrint" />
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
.legend-group {
  display: flex;
  align-items: center;
  gap: 6px;
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

.det-wrap {
  padding: 8px;
  background: #f5f6f8;
}
.dt {
  width: 100%;
  border-collapse: collapse;
  font-size: 11px;
}
.dt thead tr {
  background: #455a64;
}
.dt th {
  padding: 4px 7px;
  font-size: 10px;
  font-weight: 700;
  color: white;
  text-align: center;
  border: 1px solid rgba(255, 255, 255, 0.2);
  white-space: nowrap;
}
.dt td {
  border-bottom: 1px solid #eeeeee;
  padding: 3px 7px;
  vertical-align: middle;
}
.dt tbody tr:nth-of-type(even) td {
  background: #fafafa;
}
.dt tbody tr:hover td {
  background: #e3f2fd !important;
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
  padding: 12px;
}
</style>
