<script setup lang="ts">
import { ref } from "vue";
import { useRouter } from "vue-router";
import { useToast } from "vue-toastification";
import BaseBrowse from "@/components/BaseBrowse.vue";
import { useBrowse } from "@/composables/useBrowse";
import { mppbService } from "@/services/penjualan/mppbService";
import {
  IconFileDescription,
  IconPrinter,
  IconDiscountCheck,
  IconPencilOff,
  IconSend,
} from "@tabler/icons-vue";

const router = useRouter();
const toast = useToast();
const menuId = "150";

// Filter Default (Awal bulan s/d hari ini)
const getStartOfMonth = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
};
const getToday = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const filterState = ref({
  startDate: getStartOfMonth(),
  endDate: getToday(),
});

// State Pengajuan PIN 5
const showPinDialog = ref(false);
const isPinLoading = ref(false);
const pinData = ref({ nomor: "", alasan: "" });

const {
  items,
  isLoading,
  selected,
  canInsert,
  canEdit,
  canDelete,
  canExport,
  fetchData,
  exportToExcel,
} = useBrowse({
  menuId,
  fetchApi: async () => {
    const res = await mppbService.getBrowseList(
      filterState.value.startDate,
      filterState.value.endDate,
    );
    return res.data.data || [];
  },
  immediate: true,
});

// Definisi Kolom (Sesuai query ufrmBrowseMPPB Delphi)
const headers = [
  { title: "NOMOR", key: "Nomor", width: "160px" },
  { title: "NO PO", key: "NO_PO", width: "140px" },
  { title: "TANGGAL", key: "Tanggal", width: "100px", align: "center" },
  { title: "DIVISI", key: "Divisi", width: "120px" },
  { title: "NAMA PRODUK", key: "NamaProduk", minWidth: "250px" },
  { title: "UKURAN", key: "Ukuran", width: "120px" },
  { title: "BAHAN", key: "Bahan", width: "180px" },
  { title: "GRAMASI", key: "Gramasi", width: "120px" },
  { title: "QTY ORDER", key: "QtyOrder", width: "100px", align: "end" },
  { title: "NO DOKUMEN", key: "NoDokumen", width: "140px" },
  { title: "APPROVE", key: "Approve", width: "90px", align: "center" },
  { title: "SPK", key: "SPK", width: "150px" },
  { title: "KETERANGAN", key: "Keterangan", minWidth: "250px" },
  { title: "CREATED", key: "Created", width: "120px" },
];

const fmtDate = (val: string) => {
  if (!val) return "";
  const d = new Date(val);
  return `${String(d.getDate()).padStart(2, "0")}-${String(d.getMonth() + 1).padStart(2, "0")}-${d.getFullYear()}`;
};

const fmtNum = (val: any) =>
  new Intl.NumberFormat("id-ID").format(Number(val) || 0);

// Logika Pewarnaan Baris
const getRowProps = (data: any) => {
  const row = data.item?.raw || data.item;
  // Jika belum di-approve (Approve = 'N'), warna font jadi merah
  if (row.Approve === "N")
    return { class: "text-red-darken-2 font-weight-medium" };
  return {};
};

// --- NAVIGATION ACTIONS ---
const goAdd = () => router.push("/penjualan/mppb/create");
const goEdit = (item: any) => {
  if (item.Approve === "Y")
    return toast.warning("Nomor tsb sudah di Approve.\nTidak bisa diubah.");
  router.push(`/penjualan/mppb/edit/${encodeURIComponent(item.Nomor)}`);
};

const goDelete = async (item: any) => {
  isLoading.value = true;
  try {
    await mppbService.deleteData(item.Nomor);
    toast.success("Berhasil dihapus.");
    fetchData();
  } catch (e: any) {
    toast.error(e.response?.data?.message || "Gagal menghapus data.");
  } finally {
    isLoading.value = false;
  }
};

const cetak = () => {
  if (selected.value.length === 0)
    return toast.warning("Pilih data terlebih dahulu.");
  window.open(
    `/penjualan/mppb/print/${encodeURIComponent(selected.value[0].Nomor)}`,
    "_blank",
  );
};

// --- ACTION APPROVAL ---
const toggleApprove = async () => {
  if (selected.value.length === 0) return;
  const item = selected.value[0];
  const isApproveNow = item.Approve === "Y";

  const msg = isApproveNow ? "Akan Batal Approve?" : "Yakin akan di Approve?";
  if (!confirm(msg)) return;

  isLoading.value = true;
  try {
    const res = await mppbService.toggleApprove(item.Nomor, item.Approve);
    toast.success(res.data.message);
    fetchData();
  } catch (e: any) {
    toast.error(e.response?.data?.message || "Gagal update status approve.");
  } finally {
    isLoading.value = false;
  }
};

// --- ACTION PENGAJUAN PIN 5 ---
const openPengajuan = () => {
  if (selected.value.length === 0) return;
  const item = selected.value[0];
  if (item.Approve === "Y")
    return toast.warning(
      "Nomor tsb sudah di Approve.\nTidak bisa diajukan perubahan.",
    );

  pinData.value = { nomor: item.Nomor, alasan: "" };
  showPinDialog.value = true;
};

const submitPengajuan = async () => {
  if (!pinData.value.alasan.trim())
    return toast.warning("Alasan harus di isi.");

  isPinLoading.value = true;
  try {
    await mppbService.requestPin5(pinData.value.nomor, pinData.value.alasan);
    toast.success("Berhasil diajukan. Nunggu ACC.");
    showPinDialog.value = false;
    fetchData();
  } catch (e: any) {
    toast.error(e.response?.data?.message || "Gagal Pengajuan.");
  } finally {
    isPinLoading.value = false;
  }
};
</script>

<template>
  <BaseBrowse
    title="Memo Permintaan Pembelian Bahan (MPPB)"
    :menu-id="menuId"
    :icon="IconFileDescription"
    :headers="headers"
    :items="items ?? []"
    item-value="Nomor"
    :is-loading="isLoading"
    v-model:selected="selected"
    v-model:filterState="filterState"
    :can-insert="canInsert"
    :can-edit="canEdit"
    :can-delete="canDelete"
    :can-export="canExport"
    :row-props-fn="getRowProps"
    @refresh="fetchData"
    @add="goAdd"
    @edit="goEdit"
    @delete="goDelete"
    @export="exportToExcel('Data_MPPB')"
  >
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

      <div class="filter-divider"></div>

      <div class="legend-group">
        <span class="filter-label" style="color: #888">Status Ngedit:</span>
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
        variant="outlined"
        :disabled="selected.length === 0"
        @click="openPengajuan"
      >
        <template #prepend
          ><span class="d-flex align-center"
            ><IconPencilOff :size="15" :stroke-width="1.7" /></span
        ></template>
        Pengajuan
      </v-btn>

      <v-btn
        size="small"
        :color="selected[0]?.Approve === 'Y' ? 'error' : 'success'"
        variant="elevated"
        :disabled="selected.length === 0"
        @click="toggleApprove"
      >
        <template #prepend>
          <span class="d-flex align-center">
            <IconDiscountCheck
              v-if="selected[0]?.Approve !== 'Y'"
              :size="15"
              :stroke-width="1.7"
            />
            <IconPencilOff v-else :size="15" :stroke-width="1.7" />
          </span>
        </template>
        {{ selected[0]?.Approve === "Y" ? "Batal Approve" : "Approve" }}
      </v-btn>

      <v-btn
        size="small"
        variant="flat"
        color="blue-grey"
        :disabled="selected.length === 0"
        @click="cetak"
      >
        <template #prepend
          ><span class="d-flex align-center"
            ><IconPrinter :size="15" :stroke-width="1.7" /></span
        ></template>
        Cetak
      </v-btn>
    </template>

    <template #item.Tanggal="{ item }">{{
      fmtDate((item.raw || item).Tanggal)
    }}</template>
    <template #item.QtyOrder="{ item }">{{
      fmtNum((item.raw || item).QtyOrder)
    }}</template>

    <template #item.NamaProduk="{ item }">
      <div
        style="
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 100%;
          display: block;
        "
        :title="(item.raw || item).NamaProduk"
      >
        {{ (item.raw || item).NamaProduk }}
      </div>
    </template>
    <template #item.Keterangan="{ item }">
      <div
        style="
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 100%;
          display: block;
        "
        :title="(item.raw || item).Keterangan"
      >
        {{ (item.raw || item).Keterangan }}
      </div>
    </template>

    <template #item.Nomor="{ item }">
      <div class="d-flex align-center gap-2">
        <span class="font-weight-bold">{{ (item.raw || item).Nomor }}</span>
        <v-chip
          v-if="(item.raw || item).Ngedit === 'WAIT'"
          color="blue"
          size="x-small"
          density="comfortable"
          class="font-weight-bold"
          >WAIT</v-chip
        >
        <v-chip
          v-if="(item.raw || item).Ngedit === 'ACC'"
          color="green"
          size="x-small"
          density="comfortable"
          class="font-weight-bold"
          >ACC</v-chip
        >
        <v-chip
          v-if="(item.raw || item).Ngedit === 'TOLAK'"
          color="red"
          size="x-small"
          density="comfortable"
          class="font-weight-bold"
          >TOLAK</v-chip
        >
      </div>
    </template>
  </BaseBrowse>

  <v-dialog v-model="showPinDialog" max-width="400px" persistent>
    <div class="close-dlg">
      <div class="close-dlg-header" style="background: #ef6c00">
        <span class="d-flex align-center mr-2"
          ><IconPencilOff size="16" color="white"
        /></span>
        Pengajuan Perubahan Data
        <button class="dlg-x" @click="showPinDialog = false">✕</button>
      </div>
      <div class="close-dlg-body">
        <div class="f-lbl-sm mb-1">MAPB: {{ pinData.nomor }}</div>
        <div class="f-lbl-sm mb-1 mt-2">Alasan Pengajuan:</div>
        <textarea
          v-model="pinData.alasan"
          class="close-area"
          rows="3"
          placeholder="Masukkan alasan pengajuan edit (wajib)..."
        ></textarea>
      </div>
      <div class="close-dlg-footer">
        <button
          class="dlg-btn text-white"
          style="background: #ef6c00"
          :disabled="isPinLoading"
          @click="submitPengajuan"
        >
          <span class="d-flex align-center gap-1"
            ><IconSend size="13" />
            {{ isPinLoading ? "Mengirim..." : "Kirim Pengajuan" }}</span
          >
        </button>
        <button
          class="dlg-btn cancel"
          :disabled="isPinLoading"
          @click="showPinDialog = false"
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
