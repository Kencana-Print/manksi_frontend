<script setup lang="ts">
import { ref, watch } from "vue";
import { useRouter } from "vue-router";
import { useToast } from "vue-toastification";
import * as XLSX from "xlsx";
import BaseBrowse from "@/components/BaseBrowse.vue";
import { useBrowse } from "@/composables/useBrowse";
import { realisasiBahanService } from "@/services/garmen/realisasiBahanService";
import {
  IconClipboardCheck,
  IconFileDescription,
  IconPrinter,
  IconFileSpreadsheet,
} from "@tabler/icons-vue";
import { formatTanggal } from "@/utils/dateFormat";

const router = useRouter();
const toast = useToast();

const getLocalDate = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

// Filter hanya tanggal sesuai instruksi
const filterState = ref({
  startDate: getLocalDate(),
  endDate: getLocalDate(),
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
  menuId: "108",
  fetchApi: async () => {
    const res = await realisasiBahanService.getBrowse(
      filterState.value.startDate,
      filterState.value.endDate,
    );
    return res.data.data;
  },
  deleteApi: async (nomor: string) => {
    await realisasiBahanService.deleteData(nomor);
  },
});

// Headers persis sesuai Delphi
const headers = [
  { title: "Nomor", key: "Nomor", width: "130px" },
  { title: "Tanggal", key: "Tanggal", width: "95px" },
  { title: "No. Minta", key: "NoMinta", width: "130px" },
  { title: "Gudang", key: "Gudang", minWidth: "150px" },
  { title: "Gdg Produksi", key: "GdgProduksi", width: "100px" },
  { title: "Keterangan", key: "Keterangan", minWidth: "150px" },
  { title: "SPK", key: "SPK", width: "130px" },
  { title: "Nama SPK", key: "NamaSPK", minWidth: "220px" },
  { title: "Jumlah", key: "Jumlah", width: "80px", align: "end" },
  { title: "Jml Order", key: "JmlOrder", width: "85px", align: "end" },
  { title: "Usr", key: "Usr", width: "70px" },
];

const num = (val: number) => new Intl.NumberFormat("id-ID").format(val || 0);

// --- EXPAND DETAIL ---
const expandedRows = ref<any[]>([]);
const detailsData = ref<Record<string, any[]>>({});
const loadingDetails = ref<Set<string>>(new Set());

watch(expandedRows, async (newVal) => {
  if (newVal.length === 0) return;
  const nomor = newVal[newVal.length - 1]?.Nomor;
  if (!nomor || detailsData.value[nomor] || loadingDetails.value.has(nomor))
    return;

  loadingDetails.value.add(nomor);
  try {
    const res = await realisasiBahanService.getDetail(nomor);
    detailsData.value[nomor] = res.data.data;
  } catch {
    toast.error("Gagal memuat detail data");
  } finally {
    loadingDetails.value.delete(nomor);
  }
});

// --- AKSI STANDAR ---
const onAdd = () => {
  router.push("/garmen/bahan-baku/realisasi-minta/form");
};

const onEdit = (item: any) => {
  router.push(
    `/garmen/bahan-baku/realisasi-minta/form/${encodeURIComponent(item.Nomor)}`,
  );
};

const onDelete = async (item: any) => {
  try {
    await realisasiBahanService.deleteData(item.Nomor);
    toast.success("Berhasil dihapus. Status Minta Bahan dikalkulasi ulang.");
    fetchData();
  } catch (error: any) {
    toast.error(error.response?.data?.message || "Gagal menghapus data");
  }
};

const onPrint = () => {
  if (!selected.value.length)
    return toast.warning("Pilih data terlebih dahulu.");
  const nomor = selected.value[0].Nomor;
  // Route print bisa disiapkan nanti
  window.open(
    `/garmen/bahan-baku/realisasi-minta/print/${encodeURIComponent(nomor)}`,
    "_blank",
  );
};

// --- EXPORT DETAIL ---
const isExportingDetail = ref(false);
const onExportDetail = async () => {
  if (!canExport.value) return toast.error("Anda tidak memiliki akses Export.");

  isExportingDetail.value = true;
  try {
    const res = await realisasiBahanService.getExportDetail(
      filterState.value.startDate,
      filterState.value.endDate,
    );
    const data = res.data.data;

    if (data.length === 0) {
      toast.warning("Tidak ada data detail di periode ini.");
      return;
    }

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Detail_Realisasi");
    XLSX.writeFile(
      workbook,
      `Detail_Realisasi_${filterState.value.startDate}.xlsx`,
    );

    toast.success("Berhasil export detail Excel.");
  } catch (error: any) {
    toast.error("Gagal export detail.");
  } finally {
    isExportingDetail.value = false;
  }
};

// --- PENGAJUAN PERUBAHAN (PIN 5) ---
const actionDialog = ref(false);
const actionForm = ref({
  nomor: "",
  urut: 1,
  tanggal: "",
  keterangan: "",
  alasan: "",
});

const onAjukanPerubahan = () => {
  if (!selected.value.length)
    return toast.warning("Pilih data terlebih dahulu.");
  const item = selected.value[0];

  // Sama seperti di Delphi, user menginput alasan pengajuan (PIN 5)
  actionForm.value = {
    nomor: item.Nomor,
    urut: 1, // Di backend kalau bisa auto-increment, atau kita set 1 sbg fallback
    tanggal: item.Tanggal,
    keterangan: item.Keterangan || "",
    alasan: "",
  };
  actionDialog.value = true;
};

const submitPengajuan = async () => {
  if (!actionForm.value.alasan) return toast.warning("Alasan harus diisi.");
  try {
    await realisasiBahanService.ajukanPerubahan(actionForm.value);
    toast.success("Berhasil diajukan. Menunggu ACC.");
    actionDialog.value = false;
    fetchData(); // Refresh grid agar kolom "Ngedit" berubah jadi WAIT
  } catch (e: any) {
    toast.error(e.response?.data?.message || "Gagal melakukan pengajuan.");
  }
};

// Format warna text Ngedit
const getNomorClass = (item: any) => {
  if (item.Ngedit === "WAIT") return "badge-wait";
  if (item.Ngedit === "TOLAK") return "badge-tolak";
  if (item.Ngedit === "ACC") return "badge-acc";
  return "";
};
</script>

<template>
  <BaseBrowse
    title="Realisasi Permintaan Bahan"
    menu-id="108"
    :icon="IconClipboardCheck"
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
    @refresh="fetchData"
    @add="onAdd"
    @edit="onEdit"
    @delete="onDelete"
    @export="exportToExcel('Realisasi_Permintaan')"
  >
    <!-- Filter Kiri (Hanya Tanggal) -->
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

      <!-- Legend -->
      <div class="legend-group">
        <span class="filter-label" style="color: #888">Ngedit:</span>
        <span class="badge-wait" style="font-size: 10px; padding: 2px 6px"
          >Nunggu Acc</span
        >
        <span class="badge-acc" style="font-size: 10px; padding: 2px 6px"
          >Sudah Acc</span
        >
        <span class="badge-tolak" style="font-size: 10px; padding: 2px 6px"
          >Tolak</span
        >
      </div>
    </template>

    <!-- Extra Actions -->
    <template #extra-actions="{ selected }">
      <v-btn
        v-if="canEdit"
        size="small"
        color="orange-darken-3"
        :disabled="selected.length === 0"
        @click="onAjukanPerubahan"
      >
        <template #prepend
          ><IconFileDescription :size="15" :stroke-width="1.7"
        /></template>
        Pengajuan
      </v-btn>

      <v-btn
        size="small"
        color="grey-darken-3"
        :disabled="selected.length === 0"
        @click="onPrint"
      >
        <template #prepend>
          <IconPrinter :size="15" :stroke-width="1.7" />
        </template>
        Cetak
      </v-btn>

      <v-btn
        v-if="canExport"
        size="small"
        color="teal-darken-2"
        :loading="isExportingDetail"
        @click="onExportDetail"
      >
        <template #prepend
          ><IconFileSpreadsheet :size="15" :stroke-width="1.7"
        /></template>
        Export Detail
      </v-btn>
    </template>

    <!-- Custom Column Styling -->
    <template #item.Tanggal="{ item }">
      {{ formatTanggal(item.Tanggal) }}
    </template>
    <template #item.Nomor="{ item }">
      <span :class="getNomorClass(item)">{{ item.Nomor }}</span>
    </template>
    <template #item.Jumlah="{ item }">{{ num(item.Jumlah) }}</template>
    <template #item.JmlOrder="{ item }">{{ num(item.JmlOrder) }}</template>

    <!-- Expand Detail Row -->
    <template #detail="{ item }">
      <div class="det-wrap">
        <div v-if="loadingDetails.has(item.Nomor)" class="det-loading">
          <v-progress-circular
            indeterminate
            color="primary"
            size="20"
            width="2"
          />
          <span class="ml-2">Memuat detail...</span>
        </div>
        <div v-else-if="detailsData[item.Nomor]" class="det-card">
          <table class="dt">
            <thead>
              <tr>
                <th style="width: 30px">No</th>
                <th style="width: 100px; text-align: left">Kode</th>
                <th style="text-align: left">Nama Bahan</th>
                <th style="width: 70px">Satuan</th>
                <th style="width: 90px; text-align: right">Net</th>
                <th style="width: 90px; text-align: right">Gross</th>
                <th style="text-align: left">Keterangan</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(dtl, i) in detailsData[item.Nomor]" :key="i">
                <td class="text-center">{{ i + 1 }}</td>
                <td style="font-weight: 600; color: #1565c0">{{ dtl.Kode }}</td>
                <td>{{ dtl.Nama }}</td>
                <td class="text-center">{{ dtl.Satuan }}</td>
                <td
                  class="text-right font-weight-bold"
                  style="background: #fffde7"
                >
                  {{ num(dtl.Net) }}
                </td>
                <td class="text-right font-weight-bold">
                  {{ num(dtl.Gross) }}
                </td>
                <td>{{ dtl.Keterangan }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </template>
  </BaseBrowse>

  <!-- Dialog Pengajuan Perubahan -->
  <v-dialog v-model="actionDialog" max-width="400px" persistent>
    <div class="close-dlg">
      <div class="close-dlg-header" style="background: #ef6c00">
        <IconFileDescription :size="14" color="white" class="mr-2" />
        Pengajuan Perubahan
        <button class="dlg-x" @click="actionDialog = false">✕</button>
      </div>
      <div class="close-dlg-body">
        <div class="f-lbl-sm mb-1">Alasan Pengajuan (Wajib):</div>
        <textarea
          v-model="actionForm.alasan"
          class="close-area"
          rows="3"
          placeholder="Masukkan alasan pengajuan revisi data..."
        ></textarea>
      </div>
      <div class="close-dlg-footer">
        <button
          class="dlg-btn text-white"
          style="background: #ef6c00"
          @click="submitPengajuan"
        >
          Ajukan
        </button>
        <button class="dlg-btn cancel" @click="actionDialog = false">
          Batal
        </button>
      </div>
    </div>
  </v-dialog>
</template>

<style scoped>
/* (Salin style yang sama persis seperti MintaBahanView.vue yang kita buat sebelumnya) */
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
.legend-group {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.badge-wait {
  background: #1565c0;
  color: white;
  border-radius: 3px;
  font-weight: 700;
}
.badge-acc {
  background: #2e7d32;
  color: white;
  border-radius: 3px;
  font-weight: 700;
}
.badge-tolak {
  background: #c62828;
  color: white;
  border-radius: 3px;
  font-weight: 700;
}

.det-wrap {
  padding: 8px 12px 10px 48px;
  background: #f5f6f8;
}
.det-card {
  border: 1px solid #d0d0d0;
  border-radius: 4px;
  overflow: hidden;
  background: white;
}
.dt {
  width: 100%;
  border-collapse: collapse;
  font-size: 11px;
}
.dt th {
  background: #455a64;
  padding: 5px 8px;
  font-size: 10px;
  font-weight: 700;
  color: white;
  border: 1px solid rgba(0, 0, 0, 0.1);
}
.dt td {
  border-bottom: 1px solid #eeeeee;
  padding: 4px 8px;
  vertical-align: middle;
}
.dt tbody tr:nth-of-type(even) td {
  background: #fafafa;
}

.close-dlg {
  background: white;
  border-radius: 8px;
  overflow: hidden;
  font-family: "Segoe UI", sans-serif;
  font-size: 12px;
}
.close-dlg-header {
  display: flex;
  align-items: center;
  color: white;
  padding: 9px 14px;
  font-size: 13px;
  font-weight: 700;
  gap: 4px;
}
.dlg-x {
  margin-left: auto;
  background: transparent;
  border: none;
  color: rgba(255, 255, 255, 0.8);
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
  outline: none;
  resize: none;
}
.close-area:focus {
  border-color: #ef6c00;
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
