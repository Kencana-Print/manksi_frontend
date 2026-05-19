<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useRouter } from "vue-router";
import { useToast } from "vue-toastification";
import BaseBrowse from "@/components/BaseBrowse.vue";
import { useBrowse } from "@/composables/useBrowse";
import { useAuthStore } from "@/stores/authStore";
import api from "@/services/api";
// Import service yang baru dibuat
import { realisasiBarangService } from "@/services/garmen/realisasiBarangService";
import {
  IconChecks,
  IconFileDots,
  IconPrinter,
  IconFileSpreadsheet,
  IconPencil,
} from "@tabler/icons-vue";

const router = useRouter();
const toast = useToast();
const authStore = useAuthStore();

const getLocalDate = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

// --- STATE FILTER ---
const filterState = ref({
  startDate: getLocalDate(),
  endDate: getLocalDate(),
  cabang: "ALL",
  jenis: "ACCESORIES",
});

const cabangOptions = ref<string[]>(["ALL"]);
const jenisOptions = ref<string[]>([]);

onMounted(async () => {
  // Penyesuaian Jenis berdasarkan Bagian/Role User (Sesuai FormCreate Delphi)
  const bagian = (authStore.user?.bagian || "").toUpperCase();

  if (
    [
      "ADMIN",
      "PPIC",
      "GUDANG",
      "PRODUKSI",
      "POTONG",
      "CETAK",
      "JAHIT",
      "LIPAT",
    ].includes(bagian)
  ) {
    jenisOptions.value = ["ACCESORIES", "OBAT"];
    filterState.value.jenis = "ACCESORIES";
  } else if (bagian === "GA") {
    jenisOptions.value = ["ATK/RTK"];
    filterState.value.jenis = "ATK/RTK";
  } else if (bagian === "TEKNISI" || bagian === "IT") {
    jenisOptions.value = ["SPAREPART"];
    filterState.value.jenis = "SPAREPART";
  } else {
    jenisOptions.value = ["ACCESORIES", "OBAT", "SPAREPART", "ATK/RTK"];
    filterState.value.jenis = "ACCESORIES";
  }

  try {
    const res = await api.get("/lookups/cabang-pabrik");
    cabangOptions.value = ["ALL", ...res.data.data.map((b: any) => b.Kode)];
  } catch {
    /* silent */
  }
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
  menuId: "62",
  fetchApi: async () => {
    // Menggunakan service getBrowse
    const res = await realisasiBarangService.getBrowse(
      filterState.value.startDate,
      filterState.value.endDate,
      filterState.value.cabang,
      filterState.value.jenis,
    );
    return res.data.data;
  },
  deleteApi: async (nomor: string) => {
    // Menggunakan service deleteData
    await realisasiBarangService.deleteData(nomor);
  },
});

// --- KONFIGURASI TABEL ---
const headers = [
  { title: "Nomor", key: "Nomor", width: "135px" },
  { title: "Jenis", key: "Jenis", width: "100px" },
  { title: "Tanggal", key: "Tanggal", width: "90px" },
  { title: "Jam", key: "Jam", width: "75px" },
  { title: "No Minta", key: "NoMinta", width: "135px" },
  { title: "Approve", key: "Approve", width: "80px", align: "center" },
  { title: "Keterangan", key: "Keterangan", minWidth: "150px" },
  { title: "SPK", key: "SPK", width: "140px" },
  { title: "Nama SPK", key: "NamaSpk", minWidth: "200px" },
  { title: "Jml SPK", key: "JmlSPK", width: "80px", align: "end" },
  { title: "Usr", key: "Usr", width: "80px" },
];

const fmtDate = (val: string) => {
  if (!val) return "";
  const d = new Date(val);
  if (isNaN(d.getTime())) return val;
  return `${String(d.getDate()).padStart(2, "0")}-${String(d.getMonth() + 1).padStart(2, "0")}-${d.getFullYear()}`;
};
const fmtDateTime = (val: string) => {
  if (!val) return "";
  const d = new Date(val);
  if (isNaN(d.getTime())) return val;
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  const ss = String(d.getSeconds()).padStart(2, "0");
  return `${dd}/${mm}/${yyyy} ${hh}:${mi}:${ss}`;
};

const num = (val: number) => new Intl.NumberFormat("id-ID").format(val || 0);

// Mewarnai baris berdasarkan Status PIN 5 (Sesuai CustomDrawCell Delphi)
const handleRowProps = (data: any) => {
  const item = data.item?.raw || data.item;
  if (item.Ngedit === "WAIT") {
    return {
      style: "color: white !important; background-color: #1976d2 !important;",
    }; // Blue
  } else if (item.Ngedit === "ACC") {
    return {
      style: "color: white !important; background-color: #2e7d32 !important;",
    }; // Green
  } else if (item.Ngedit === "TOLAK") {
    return {
      style: "color: white !important; background-color: #c62828 !important;",
    }; // Red
  }
  return {};
};

const expandedRows = ref<any[]>([]);

// --- FUNGSI AKSI ---
const onAdd = () => {
  sessionStorage.setItem("last_jenis_realisasi", filterState.value.jenis);
  router.push("/garmen/barang/realisasi/form");
};

const onEdit = (item: any) => {
  router.push(
    `/garmen/barang/realisasi/form/${encodeURIComponent(item.Nomor)}`,
  );
};

const onDelete = async (item: any) => {
  try {
    await realisasiBarangService.deleteData(item.Nomor);
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
    `/garmen/barang/realisasi/print/${encodeURIComponent(nomor)}`,
    "_blank",
  );
};

const onExportDetail = () => {
  if (!items.value || items.value.length === 0)
    return toast.warning("Tidak ada data untuk diexport.");

  const rows: any[] = [];
  items.value.forEach((master: any) => {
    if (master.details?.length > 0) {
      master.details.forEach((dtl: any) => {
        rows.push({
          "Nomor Realisasi": master.Nomor,
          "No Minta": master.NoMinta,
          Tanggal: fmtDate(master.Tanggal),
          Jenis: master.Jenis,
          SPK: master.SPK,
          "Nama SPK": master.NamaSpk,
          "Kode Barang": dtl.Kode,
          "Nama Barang": dtl.Nama,
          Satuan: dtl.Satuan,
          Jumlah: dtl.Jumlah,
          Keterangan: dtl.Keterangan || "",
        });
      });
    }
  });

  if (rows.length === 0)
    return toast.warning("Tidak ada rincian untuk diexport.");

  const headersStr = Object.keys(rows[0]).join(",");
  const csvContent = [
    headersStr,
    ...rows.map((row) =>
      Object.keys(rows[0])
        .map((f) => `"${String(row[f] ?? "").replace(/"/g, '""')}"`)
        .join(","),
    ),
  ].join("\n");

  const blob = new Blob(["\uFEFF" + csvContent], {
    type: "text/csv;charset=utf-8;",
  });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `Detail_Realisasi_${filterState.value.startDate}.csv`;
  link.click();
  toast.success("Berhasil export detail data.");
};

// --- DIALOG PENGAJUAN PIN 5 ---
const actionDialog = ref(false);
const actionForm = ref({ nomor: "", tanggal: "", keterangan: "", alasan: "" });

const onAjukanPerubahan = () => {
  if (!selected.value.length)
    return toast.warning("Pilih data terlebih dahulu.");
  const item = selected.value[0];

  if (item.Ngedit === "ACC" || item.Ngedit === "") {
    actionForm.value = {
      nomor: item.Nomor,
      tanggal: item.Tanggal,
      keterangan: item.Keterangan,
      alasan: "",
    };
    actionDialog.value = true;
  } else {
    toast.info("Data ini sedang dalam antrian pengajuan.");
  }
};

const submitAjukan = async () => {
  if (!actionForm.value.alasan) return toast.warning("Alasan harus diisi.");
  try {
    // Menggunakan service ajukanPerubahan
    await realisasiBarangService.ajukanPerubahan(actionForm.value);
    toast.success("Berhasil diajukan. Menunggu ACC.");
    actionDialog.value = false;
    fetchData();
  } catch (e: any) {
    toast.error(e.response?.data?.message || "Gagal Pengajuan.");
  }
};
</script>

<template>
  <BaseBrowse
    title="Realisasi Permintaan Barang Garmen"
    menu-id="62"
    :icon="IconChecks"
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
    @export="exportToExcel('Realisasi_Barang_Garmen')"
  >
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

      <div class="filter-group ml-3">
        <span class="filter-label">Jenis</span>
        <div class="radio-wrap">
          <label v-for="jns in jenisOptions" :key="jns" class="radio-label">
            <input
              type="radio"
              v-model="filterState.jenis"
              :value="jns"
              @change="fetchData"
            />
            {{ jns === "ATK/RTK" ? "ATK" : jns === "ACCESORIES" ? "ACC" : jns }}
          </label>
        </div>
      </div>

      <div class="filter-group ml-3">
        <span class="filter-label">Jenis</span>
        <select
          v-model="filterState.jenis"
          class="date-inp"
          style="width: 120px"
          @change="fetchData"
        >
          <option v-for="jns in jenisOptions" :key="jns" :value="jns">
            {{ jns }}
          </option>
        </select>
      </div>

      <div class="filter-divider" />

      <div class="legend-group">
        <span class="filter-label" style="color: #888">Ngedit:</span>
        <span class="badge-wait">Nunggu Acc</span>
        <span class="badge-acc">Sudah Acc</span>
        <span class="badge-tolak">Tolak</span>
      </div>
    </template>

    <template #extra-actions="{ selected }">
      <v-btn
        v-if="canEdit"
        size="small"
        color="orange-darken-3"
        :disabled="selected.length === 0"
        @click="onAjukanPerubahan"
      >
        <template #prepend
          ><IconFileDots :size="15" :stroke-width="1.7"
        /></template>
        Pengajuan
      </v-btn>
      <v-btn
        size="small"
        color="grey-darken-3"
        class="ml-2"
        :disabled="selected.length === 0"
        @click="onPrint"
      >
        <template #prepend
          ><IconPrinter :size="15" :stroke-width="1.7"
        /></template>
        Cetak
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

    <template #item.Tanggal="{ item }">{{ fmtDate(item.Tanggal) }}</template>
    <template #item.Approve="{ item }">{{
      fmtDateTime(item.Approve)
    }}</template>
    <template #item.JmlSPK="{ item }">{{ num(item.JmlSPK) }}</template>

    <template #detail="{ item }">
      <div v-if="item" class="det-wrap">
        <div class="det-card">
          <div class="det-head">Detail Barang Realisasi</div>
          <div class="dt-scroll">
            <table class="dt">
              <thead>
                <tr>
                  <th style="width: 28px">No</th>
                  <th style="width: 140px; text-align: left">Kode</th>
                  <th style="text-align: left">Nama Barang</th>
                  <th style="width: 60px">Satuan</th>
                  <th style="width: 90px; text-align: right">Jumlah</th>
                  <th style="text-align: left">Keterangan</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(dtl, i) in item.details" :key="i">
                  <td class="tc">{{ Number(i) + 1 }}</td>
                  <td style="font-weight: 600; color: #00796b">
                    {{ dtl.Kode }}
                  </td>
                  <td>{{ dtl.Nama }}</td>
                  <td class="tc">{{ dtl.Satuan }}</td>
                  <td class="tr" style="font-weight: 700; background: #fffde7">
                    {{ num(dtl.Jumlah) }}
                  </td>
                  <td>{{ dtl.Keterangan }}</td>
                </tr>
                <tr v-if="!item.details?.length">
                  <td colspan="6" class="empty-td">
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

  <v-dialog v-model="actionDialog" max-width="400px" persistent>
    <div class="close-dlg">
      <div class="close-dlg-header" style="background: #1565c0">
        <IconPencil :size="14" :stroke-width="1.7" color="white" class="mr-2" />
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
/* (Gaya tetap sama seperti sebelumnya) */
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
.ml-3 {
  margin-left: 12px;
}
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

.radio-wrap {
  display: flex;
  align-items: center;
  gap: 8px;
  background: white;
  border: 1px solid #ccc;
  border-radius: 4px;
  padding: 0 8px;
  height: 28px;
}
.radio-label {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  font-weight: 600;
  color: #424242;
  cursor: pointer;
  white-space: nowrap;
}
.radio-label input[type="radio"] {
  accent-color: #1565c0;
  cursor: pointer;
  width: 13px;
  height: 13px;
  margin: 0;
}
</style>
