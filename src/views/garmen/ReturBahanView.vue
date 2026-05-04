<script setup lang="ts">
import { ref } from "vue";
import { useRouter } from "vue-router";
import { useToast } from "vue-toastification";
import { useBrowse } from "@/composables/useBrowse";
import { returBahanService } from "@/services/garmen/returBahanService";
import { useAuthStore } from "@/stores/authStore";
import BaseBrowse from "@/components/BaseBrowse.vue";

const router = useRouter();
const toast = useToast();
const authStore = useAuthStore();

const getToday = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const getFirstDayOfMonth = () => {
  const d = new Date();
  // Set tanggal menjadi "01" (Awal bulan)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
};

const filterState = ref({
  startDate: getFirstDayOfMonth(), // <-- Default: Tanggal 1 bulan ini
  endDate: getToday(), // <-- Default: Hari ini
});

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
  menuId: "110",
  fetchApi: async () => {
    const res = await returBahanService.getBrowse({
      startDate: filterState.value.startDate,
      endDate: filterState.value.endDate,
    });
    return res.data.data || [];
  },
  // Pastikan deleteApi mengirimkan data yang cukup untuk divalidasi backend
  deleteApi: async (nomor) => {
    // Logika validasi delete sama dengan edit (RETL Approved / RETP Role)
    const item = items.value.find((i) => i.Nomor === nomor);
    if (item && item.Nomor.startsWith("RETL") && item.NoApprov) {
      throw new Error("Data sudah di-approve.");
    }
    return await returBahanService.deleteData(nomor);
  },
});

const headers = [
  { title: "Nomor", key: "Nomor", width: "150px" },
  { title: "Tanggal", key: "Tanggal", width: "110px" },
  { title: "Tujuan", key: "Tujuan", width: "160px" },
  { title: "Dari", key: "Dari", width: "160px" },
  { title: "Keterangan", key: "Keterangan", minWidth: "150px" },
  { title: "Created", key: "Created", width: "100px" },
  { title: "No. Approv", key: "NoApprov", width: "130px" },
  { title: "Tgl. Approv", key: "TglApprov", width: "110px" },
  { title: "Approved", key: "Approved", width: "90px", align: "center" },
  { title: "Usr", key: "Usr", width: "80px" },
];

const getRowProps = (data: any) => {
  const item = data.item?.raw || data.item;
  if (item.Ngedit === "WAIT")
    return { style: "color:#1565c0!important;font-weight:600" };
  if (item.Ngedit === "TOLAK")
    return { style: "color:#c62828!important;font-weight:600" };
  if (item.Ngedit === "ACC")
    return { style: "color:#2e7d32!important;font-weight:600" };
  if (!item.NoApprov || item.NoApprov.trim() === "")
    return { style: "color:#c62828!important" };
  return {};
};

const fmtDate = (val: string) => {
  if (!val) return "";
  const d = new Date(val);
  if (isNaN(d.getTime())) return val;
  return `${String(d.getDate()).padStart(2, "0")}-${String(d.getMonth() + 1).padStart(2, "0")}-${d.getFullYear()}`;
};

const num = (val: any) =>
  Number(val || 0).toLocaleString("id-ID", { maximumFractionDigits: 2 });

const expandedRows = ref<any[]>([]);

const onAdd = () => router.push({ name: "GarmenReturBahanCreate" });
const onEdit = (item: any) => {
  // 1. Replikasi Validasi Delphi: RETL & NoApprov
  if (
    item.Nomor.startsWith("RETL") &&
    item.NoApprov &&
    item.NoApprov.trim() !== ""
  ) {
    return toast.warning(`No. Retur ${item.Nomor} sudah di-approve.`);
  }

  // 2. Replikasi Validasi Delphi: RETP & Role Bukan Gudang
  if (
    item.Nomor.startsWith("RETP") &&
    authStore.user?.bagian?.toUpperCase() !== "GUDANG"
  ) {
    return toast.warning(
      "Retur tersebut di-input oleh admin gudang. Anda tidak berhak merubah data ini.",
    );
  }

  // 3. Jika Lolos, Baru Navigasi
  router.push({ name: "GarmenReturBahanEdit", params: { nomor: item.Nomor } });
};
const onDelete = async (item: any) => {
  // BaseBrowse biasanya menghandle dialog konfirmasi,
  // tapi kita bisa tambahkan validasi awal di sini atau di deleteApi useBrowse
};
const onPrint = (item: any) => {
  // Gunakan encodeURIComponent agar RETL/00118/2026 aman di URL
  const nomorEncoded = encodeURIComponent(item.Nomor);
  window.open(`/garmen/bahan-baku/retur-bahan/print/${nomorEncoded}`, "_blank");
};

// ── Dialog Pengajuan ──
const showPengajuanDialog = ref(false);
const isSubmittingPengajuan = ref(false);
const pengajuanForm = ref({
  nomor: "",
  tanggal: "",
  keterangan: "",
  alasan: "",
});

const openPengajuan = (item: any) => {
  pengajuanForm.value = {
    nomor: item.Nomor,
    tanggal: item.Tanggal,
    keterangan: item.Keterangan,
    alasan: "",
  };
  showPengajuanDialog.value = true;
};

const submitPengajuan = async () => {
  if (!pengajuanForm.value.alasan) return toast.warning("Alasan harus di isi.");
  isSubmittingPengajuan.value = true;
  try {
    await returBahanService.requestEdit(pengajuanForm.value);
    toast.success("Berhasil diajukan. Nunggu ACC.");
    showPengajuanDialog.value = false;
    fetchData();
  } catch (err: any) {
    toast.error(err.response?.data?.message || "Gagal Pengajuan.");
  } finally {
    isSubmittingPengajuan.value = false;
  }
};
</script>

<template>
  <BaseBrowse
    title="Daftar Retur Permintaan Bahan"
    menu-id="110"
    icon="mdi-arrow-u-left-top-bold"
    :headers="headers"
    :items="items"
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
    :row-props-fn="getRowProps"
    @refresh="fetchData"
    @add="onAdd"
    @edit="onEdit"
    @delete="onDelete"
    @export="exportToExcel('Retur_Bahan')"
  >
    <!-- Filter bar -->
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
          <div class="ldot" style="background: #c62828"></div>
          <span>Belum Approve / Tolak</span>
        </div>
        <div class="legend-item">
          <div class="ldot" style="background: #1565c0"></div>
          <span>Nunggu ACC</span>
        </div>
        <div class="legend-item">
          <div class="ldot" style="background: #2e7d32"></div>
          <span>Sudah ACC</span>
        </div>
      </div>
    </template>

    <!-- Extra actions untuk Header Action Panel -->
    <template #extra-actions="{ selected }">
      <v-btn
        size="small"
        prepend-icon="mdi-printer"
        color="grey-darken-3"
        :disabled="selected.length === 0"
        @click="onPrint(selected[0])"
        >Cetak</v-btn
      >
      <v-btn
        size="small"
        prepend-icon="mdi-file-document-edit-outline"
        color="warning"
        :disabled="selected.length === 0 || !canEdit"
        @click="openPengajuan(selected[0])"
        >Pengajuan</v-btn
      >
    </template>

    <!-- Format kolom (diinject langsung ke BaseBrowse) -->
    <template #item.Tanggal="{ item }">{{
      fmtDate(item.raw?.Tanggal || item.Tanggal)
    }}</template>
    <template #item.TglApprov="{ item }">{{
      fmtDate(item.raw?.TglApprov || item.TglApprov)
    }}</template>

    <!-- Detail expand -->
    <template #detail="{ item }">
      <div class="det-wrap">
        <div class="det-title">
          Detail Barang Retur: <strong>{{ item.Nomor }}</strong>
        </div>
        <table class="dt" v-if="item.details?.length">
          <thead>
            <tr>
              <th style="width: 32px">No</th>
              <th style="width: 100px; text-align: left">Kode</th>
              <th style="text-align: left">Nama Bahan</th>
              <th style="width: 55px">Satuan</th>
              <th style="width: 80px; text-align: right">Jumlah</th>
              <th style="width: 60px; text-align: right">Roll</th>
              <th style="width: 120px; text-align: left">No. Minta</th>
              <th style="width: 120px; text-align: left">SPK</th>
              <th style="text-align: left">Keterangan</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(d, i) in item.details" :key="i">
              <td class="tc">{{ i + 1 }}</td>
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

  <!-- Dialog Pengajuan -->
  <v-dialog v-model="showPengajuanDialog" max-width="480px" persistent>
    <div class="dlg-card">
      <div class="dlg-header">
        <v-icon size="14" color="white" class="mr-2"
          >mdi-file-document-edit-outline</v-icon
        >
        Pengajuan Perubahan Data
        <button class="dlg-close" @click="showPengajuanDialog = false">
          ✕
        </button>
      </div>
      <div class="dlg-body">
        <div class="f-row">
          <label class="f-lbl">No. Transaksi</label>
          <input :value="pengajuanForm.nomor" readonly class="f-inp f-ro" />
        </div>
        <div class="f-row" style="align-items: flex-start; margin-top: 4px">
          <label class="f-lbl" style="padding-top: 3px">Alasan</label>
          <textarea
            v-model="pengajuanForm.alasan"
            class="f-textarea"
            rows="3"
            placeholder="Tulis alasan mengapa data ini perlu dirubah..."
          ></textarea>
        </div>
      </div>
      <div class="dlg-footer">
        <button
          class="dlg-btn save"
          :disabled="isSubmittingPengajuan"
          @click="submitPengajuan"
        >
          {{ isSubmittingPengajuan ? "Mengajukan..." : "Ajukan" }}
        </button>
        <button
          class="dlg-btn cancel"
          :disabled="isSubmittingPengajuan"
          @click="showPengajuanDialog = false"
        >
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
  color: #212121;
}
.date-inp:focus {
  border-color: #1976d2;
}
.legend-group {
  display: flex;
  align-items: center;
  gap: 10px;
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
.det-title {
  font-size: 11px;
  font-weight: 600;
  color: #1565c0;
  margin-bottom: 6px;
  text-transform: uppercase;
}
.dt {
  width: 100%;
  border-collapse: collapse;
  font-size: 11px;
}
.dt thead tr {
  background: #1565c0;
}
.dt th {
  padding: 4px 7px;
  font-size: 10px;
  font-weight: 700;
  color: white;
  text-align: center;
  border: 1px solid #0d47a1;
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

.dlg-card {
  background: white;
  border-radius: 8px;
  overflow: hidden;
  font-family: "Segoe UI", sans-serif;
  font-size: 12px;
}
.dlg-header {
  display: flex;
  align-items: center;
  background: #f57f17;
  color: white;
  padding: 9px 14px;
  font-size: 13px;
  font-weight: 700;
  gap: 4px;
}
.dlg-close {
  margin-left: auto;
  background: transparent;
  border: none;
  color: rgba(255, 255, 255, 0.8);
  font-size: 15px;
  cursor: pointer;
}
.dlg-close:hover {
  color: white;
}
.dlg-body {
  padding: 14px;
}
.f-row {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 6px;
}
.f-lbl {
  width: 90px;
  flex-shrink: 0;
  font-size: 11px;
  font-weight: 600;
  color: #555;
}
.f-inp {
  height: 26px;
  border: 1px solid #bdbdbd;
  border-radius: 3px;
  padding: 0 6px;
  font-size: 11px;
  outline: none;
  background: white;
  flex: 1;
  box-sizing: border-box;
}
.f-ro {
  background: #f0f0f0 !important;
  color: #616161 !important;
  cursor: default;
}
.f-textarea {
  border: 1px solid #bdbdbd;
  border-radius: 3px;
  padding: 5px 6px;
  font-size: 11px;
  font-family: inherit;
  outline: none;
  resize: none;
  box-sizing: border-box;
  flex: 1;
}
.f-textarea:focus {
  border-color: #1565c0;
}
.dlg-footer {
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
.dlg-btn:disabled {
  opacity: 0.5;
  cursor: default;
}
.dlg-btn.save {
  background: #f57f17;
  color: white;
}
.dlg-btn.save:hover:not(:disabled) {
  background: #e65100;
}
.dlg-btn.cancel {
  background: #e0e0e0;
  color: #424242;
  margin-left: auto;
}
.dlg-btn.cancel:hover:not(:disabled) {
  background: #d0d0d0;
}
</style>
