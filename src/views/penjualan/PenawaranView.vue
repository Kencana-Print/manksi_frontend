<script setup lang="ts">
import { ref, watch, computed } from "vue";
import { useRouter } from "vue-router";
import { useToast } from "vue-toastification";
import BaseBrowse from "@/components/BaseBrowse.vue";
import { useBrowse } from "@/composables/useBrowse";
import { penawaranService } from "@/services/penjualan/penawaranService";
import {
  IconFileText,
  IconPrinter,
  IconFileSpreadsheet,
  IconInfoCircle,
  IconDeviceFloppy,
  IconX,
  IconPhoto,
  IconPhotoOff,
  IconLayoutColumns,
  IconLayoutRows,
} from "@tabler/icons-vue";

const router = useRouter();
const toast = useToast();
const menuId = "151";

const today = new Date().toISOString().substring(0, 10);
const filterState = ref({
  startDate: today,
  endDate: today,
  status: "ALL",
});

const statusOptions = ["ALL", "OPEN", "BATAL", "CLOSE"];
const expanded = ref<any[]>([]);
const detailsCache = ref<Record<string, any[]>>({});
const loadingDetails = ref(new Set<string>());

const statusDialog = ref(false);
const statusNomor = ref("");
const statusDetails = ref<any[]>([]);
const isSavingStatus = ref(false);

const showPrintDialog = ref(false);
const printStep = ref(1);
const savedNomor = ref("");

const {
  items,
  isLoading,
  selected,
  canInsert,
  canEdit,
  canDelete,
  fetchData,
  exportToExcel,
} = useBrowse({
  menuId,
  fetchApi: async () => {
    const res = await penawaranService.getBrowseList(filterState.value);
    expanded.value = [];
    return res.data.data || [];
  },
  immediate: true,
});

watch(expanded, (newVal) => {
  newVal.forEach(async (rowItem) => {
    const nomor =
      typeof rowItem === "object"
        ? rowItem.raw?.Nomor || rowItem.Nomor
        : rowItem;
    if (
      nomor &&
      !detailsCache.value[nomor] &&
      !loadingDetails.value.has(nomor)
    ) {
      loadingDetails.value.add(nomor);
      try {
        const res = await penawaranService.getBrowseDetail(nomor);
        detailsCache.value[nomor] = res.data.data;
      } catch {
        toast.error(`Gagal memuat detail untuk ${nomor}`);
      } finally {
        loadingDetails.value.delete(nomor);
      }
    }
  });
});

const headers = [
  { title: "Nomor", key: "Nomor", width: "140px" },
  { title: "Tanggal", key: "Tanggal", width: "100px" },
  { title: "Divisi", key: "Divisi", width: "80px", align: "center" },
  { title: "Tipe", key: "Tipe", width: "90px" },
  { title: "Perusahaan", key: "Perusahaan", width: "160px" },
  { title: "Nominal", key: "Nominal", width: "130px", align: "right" },
  { title: "Nama Customer", key: "NamaCustomer", minWidth: "200px" },
  { title: "Keterangan", key: "Keterangan", minWidth: "150px" },
  { title: "Sales", key: "Sales", width: "100px" },
  { title: "Det", key: "jumlahDetail", width: "55px", align: "center" },
  { title: "Fu1", key: "Fu1", width: "46px", align: "center" },
  { title: "Fu2", key: "Fu2", width: "46px", align: "center" },
  { title: "Fu3", key: "Fu3", width: "46px", align: "center" },
  { title: "Proyeksi", key: "Proyeksi", width: "90px" },
];

const rp = (v: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(v || 0);
const num = (v: number) => new Intl.NumberFormat("id-ID").format(v || 0);

// Format tanggal ISO → "05-04-2026"
const fmtDate = (val: string) => {
  if (!val) return "";
  const d = new Date(val);
  if (isNaN(d.getTime())) return val;
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
};

const getRowProps = (data: any) => {
  const status = data.item?.raw?.StatusApproval || data.item?.StatusApproval;
  if (status === "WAIT")
    return { class: "bg-blue-lighten-4 font-weight-bold text-blue-darken-4" };
  if (status === "TOLAK")
    return { class: "bg-red-lighten-4 font-weight-bold text-red-darken-4" };
  if (status === "ACC")
    return { class: "bg-green-lighten-4 font-weight-bold text-green-darken-4" };
  return {};
};

const goAdd = () =>
  router.push({ name: "PenawaranFormCreate", query: { mode: "new" } });
const goEdit = (item: any) =>
  router.push({ name: "PenawaranFormEdit", params: { nomor: item.Nomor } });
const goDelete = async (item: any) => {
  isLoading.value = true;
  try {
    await penawaranService.deletePenawaran(item.Nomor);
    toast.success("Berhasil dihapus.");
    fetchData();
  } catch (e: any) {
    toast.error(e.response?.data?.message || "Gagal menghapus data.");
  } finally {
    isLoading.value = false;
  }
};

const openPrintDialog = (item: any) => {
  if (!item || !item.Nomor) return;
  savedNomor.value = item.Nomor;
  printStep.value = 1;
  showPrintDialog.value = true;
};

const closePrintDialog = () => {
  showPrintDialog.value = false;
};

const cetakTanpaGambar = () => {
  showPrintDialog.value = false;
  window.open(
    `/penjualan/penawaran/print/${encodeURIComponent(savedNomor.value)}?img=0`,
    "_blank",
  );
};

const pilihGambarHorizontal = () => {
  showPrintDialog.value = false;
  window.open(
    `/penjualan/penawaran/print/${encodeURIComponent(savedNomor.value)}?img=1&layout=horz`,
    "_blank",
  );
};

const pilihGambarVertikal = () => {
  showPrintDialog.value = false;
  window.open(
    `/penjualan/penawaran/print/${encodeURIComponent(savedNomor.value)}?img=1&layout=vert`,
    "_blank",
  );
};

const openStatusModal = async (item: any) => {
  statusNomor.value = item.Nomor;
  statusDetails.value = [];
  statusDialog.value = true;
  isLoading.value = true;
  try {
    const res = await penawaranService.getBrowseDetail(item.Nomor);
    statusDetails.value = res.data.data;
  } catch {
    toast.error("Gagal memuat data status.");
    statusDialog.value = false;
  } finally {
    isLoading.value = false;
  }
};

const saveStatus = async () => {
  isSavingStatus.value = true;
  try {
    await penawaranService.updateStatus(statusNomor.value, statusDetails.value);
    toast.success("Status berhasil disimpan.");
    statusDialog.value = false;
    delete detailsCache.value[statusNomor.value];
    fetchData();
  } catch {
    toast.error("Gagal menyimpan status.");
  } finally {
    isSavingStatus.value = false;
  }
};

const totalStatusGrid = computed(() => {
  let qty = 0,
    nominal = 0;
  statusDetails.value.forEach((d) => {
    qty += Number(d.Qty) || 0;
    nominal += Number(d.Nominal) || 0;
  });
  return { qty, nominal };
});
</script>

<template>
  <BaseBrowse
    title="Penawaran"
    :menu-id="menuId"
    :icon="IconFileText"
    :headers="headers"
    :items="items ?? []"
    item-value="Nomor"
    :is-loading="isLoading"
    show-expand
    v-model:expanded="expanded"
    v-model:selected="selected"
    v-model:filterState="filterState"
    :can-insert="canInsert"
    :can-edit="canEdit"
    :can-delete="canDelete"
    can-export
    :row-props-fn="getRowProps"
    summary-key="Nominal"
    summary-label="Total Nominal"
    @refresh="fetchData"
    @add="goAdd"
    @edit="goEdit"
    @delete="goDelete"
    @export="exportToExcel('Penawaran')"
  >
    <!-- Filter bar -->
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
      <div class="filter-group">
        <span class="filter-label">Status</span>
        <div class="status-tabs">
          <button
            v-for="opt in statusOptions"
            :key="opt"
            class="status-tab"
            :class="{ active: filterState.status === opt }"
            @click="
              filterState.status = opt;
              fetchData();
            "
          >
            {{ opt }}
          </button>
        </div>
      </div>
    </template>

    <!-- Extra action buttons -->
    <template #extra-actions="{ selected }">
      <v-btn
        size="small"
        variant="flat"
        color="blue-grey"
        :disabled="selected.length === 0"
        @click="openPrintDialog(selected[0])"
      >
        <template #prepend
          ><IconPrinter :size="15" :stroke-width="1.7"
        /></template>
        Cetak
      </v-btn>
      <v-btn size="small" variant="flat" color="teal-darken-1">
        <template #prepend
          ><IconFileSpreadsheet :size="15" :stroke-width="1.7"
        /></template>
        Export Detail
      </v-btn>
      <v-btn
        size="small"
        variant="flat"
        color="indigo"
        :disabled="selected.length === 0"
        @click="openStatusModal(selected[0])"
      >
        <template #prepend
          ><IconInfoCircle :size="15" :stroke-width="1.7"
        /></template>
        Status
      </v-btn>
    </template>

    <!-- Format kolom Tanggal -->
    <template #item.Tanggal="{ item }">
      {{ fmtDate(item.Tanggal) }}
    </template>

    <!-- Format kolom Nominal -->
    <template #item.Nominal="{ item }">
      {{ rp(item.Nominal) }}
    </template>

    <!-- Expand detail -->
    <template #detail="{ item }">
      <div class="detail-wrap">
        <div v-if="loadingDetails.has(item.Nomor)" class="detail-loading">
          <v-progress-circular
            indeterminate
            size="20"
            color="primary"
            width="2"
          />
          <span>Memuat detail...</span>
        </div>
        <table
          v-else-if="detailsCache[item.Nomor]?.length"
          class="detail-table"
        >
          <thead>
            <tr>
              <th style="width: 36px">ID</th>
              <th>Nama Barang</th>
              <th style="width: 110px">Bahan</th>
              <th style="width: 80px">Ukuran</th>
              <th style="width: 70px; text-align: right">Panjang</th>
              <th style="width: 70px; text-align: right">Lebar</th>
              <th style="width: 80px; text-align: right">Qty Mtr</th>
              <th style="width: 60px; text-align: center">Satuan</th>
              <th style="width: 60px; text-align: right">Qty</th>
              <th style="width: 100px; text-align: right">Harga</th>
              <th style="width: 120px; text-align: right">Nominal</th>
              <th style="width: 70px; text-align: center">Status</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="d in detailsCache[item.Nomor]" :key="d.ID">
              <td class="tc">{{ d.ID }}</td>
              <td>{{ d.NamaBarang }}</td>
              <td>{{ d.Bahan }}</td>
              <td>{{ d.Ukuran }}</td>
              <td class="tr">{{ num(d.Panjang) }}</td>
              <td class="tr">{{ num(d.Lebar) }}</td>
              <td class="tr">{{ num(d.QtyMeter) }}</td>
              <td class="tc">{{ d.Satuan }}</td>
              <td class="tr">{{ num(d.Qty) }}</td>
              <td class="tr">{{ rp(d.Harga) }}</td>
              <td class="tr fw">{{ rp(d.Nominal) }}</td>
              <td class="tc">
                <span
                  class="status-chip"
                  :class="`s-${(d.Status || '').toLowerCase()}`"
                >
                  {{ d.Status || "OPEN" }}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
        <div v-else class="detail-empty">Tidak ada detail barang.</div>
      </div>
    </template>
  </BaseBrowse>

  <!-- Dialog Status — di LUAR BaseBrowse -->
  <v-dialog v-model="statusDialog" max-width="1200px" persistent>
    <div class="status-card">
      <div class="status-header">
        <span>Status Penawaran</span>
        <button class="status-close" @click="statusDialog = false">✕</button>
      </div>
      <div class="status-body">
        <div class="status-nomor-row">
          <span class="status-nomor-label">Nomor Penawaran</span>
          <input :value="statusNomor" readonly class="status-nomor-inp" />
        </div>
        <div class="status-table-wrap">
          <table class="status-table">
            <thead>
              <tr>
                <th style="width: 40px">ID</th>
                <th>Nama</th>
                <th>Bahan</th>
                <th>Ukuran</th>
                <th style="width: 60px">Satuan</th>
                <th style="width: 70px; text-align: right">Qty</th>
                <th style="width: 110px; text-align: right">Harga</th>
                <th style="width: 120px; text-align: right">Total</th>
                <th style="width: 110px">Status</th>
                <th style="width: 160px">Ket. Batal</th>
                <th style="width: 160px">Ket. Confirm</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="d in statusDetails" :key="d.ID">
                <td class="tc">{{ d.ID }}</td>
                <td>{{ d.NamaBarang }}</td>
                <td>{{ d.Bahan }}</td>
                <td>{{ d.Ukuran }}</td>
                <td class="tc">{{ d.Satuan }}</td>
                <td class="tr">{{ num(d.Qty) }}</td>
                <td class="tr">{{ rp(d.Harga) }}</td>
                <td class="tr fw">{{ rp(d.Nominal) }}</td>
                <td class="td-inp">
                  <select v-model="d.Status" class="cell-inp">
                    <option value="">OPEN</option>
                    <option value="BATAL">BATAL</option>
                    <option value="CLOSE">CLOSE</option>
                  </select>
                </td>
                <td class="td-inp">
                  <input type="text" v-model="d.KetBatal" class="cell-inp" />
                </td>
                <td class="td-inp">
                  <input type="text" v-model="d.KetConfirm" class="cell-inp" />
                </td>
              </tr>
              <tr class="total-row">
                <td colspan="5" class="tr">TOTAL</td>
                <td class="tr fw">{{ num(totalStatusGrid.qty) }}</td>
                <td></td>
                <td class="tr fw">{{ rp(totalStatusGrid.nominal) }}</td>
                <td colspan="3"></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      <div class="status-footer">
        <button
          class="status-btn save"
          :disabled="isSavingStatus"
          @click="saveStatus"
        >
          <IconDeviceFloppy :size="13" class="mr-1" />
          {{ isSavingStatus ? "Menyimpan..." : "Simpan" }}
        </button>
        <button
          class="status-btn cancel"
          :disabled="isSavingStatus"
          @click="statusDialog = false"
        >
          <IconX :size="13" class="mr-1" />
          Batal
        </button>
      </div>
    </div>
  </v-dialog>

  <v-dialog v-model="showPrintDialog" max-width="450px" persistent>
    <v-card class="rounded-lg">
      <v-card-title class="bg-primary text-white d-flex align-center pa-3">
        <IconPrinter
          :size="18"
          :stroke-width="1.7"
          color="white"
          class="mr-2"
        />
        <span class="text-subtitle-1 font-weight-bold"
          >Cetak Surat Penawaran</span
        >
      </v-card-title>

      <v-card-text class="pa-4 text-center">
        <template v-if="printStep === 1">
          <div class="text-body-1 mb-4 text-grey-darken-3">
            Apakah Anda ingin mencetak dokumen ini menggunakan lampiran
            gambar/desain?
          </div>
          <div class="d-flex flex-column gap-2">
            <v-btn color="primary" variant="flat" @click="printStep = 2">
              <template #prepend
                ><IconPhoto :size="15" :stroke-width="1.7"
              /></template>
              Cetak Dengan Gambar
            </v-btn>
            <v-btn color="info" variant="tonal" @click="cetakTanpaGambar">
              <template #prepend
                ><IconPhotoOff :size="15" :stroke-width="1.7"
              /></template>
              Cetak Tanpa Gambar
            </v-btn>
          </div>
        </template>

        <template v-if="printStep === 2">
          <div class="text-body-1 mb-4 text-grey-darken-3">
            Pilih orientasi posisi gambar pada tabel rincian:
          </div>
          <div class="d-flex flex-column gap-2">
            <v-btn
              color="primary"
              variant="flat"
              @click="pilihGambarHorizontal"
            >
              <template #prepend
                ><IconLayoutColumns :size="15" :stroke-width="1.7"
              /></template>
              Gambar Horizontal (Kanan)
            </v-btn>
            <v-btn color="info" variant="tonal" @click="pilihGambarVertikal">
              <template #prepend
                ><IconLayoutRows :size="15" :stroke-width="1.7"
              /></template>
              Gambar Vertikal (Bawah)
            </v-btn>
          </div>
        </template>
      </v-card-text>

      <v-card-actions class="pa-3 border-t bg-grey-lighten-4">
        <v-btn variant="text" color="error" @click="closePrintDialog"
          >Tutup</v-btn
        >
        <v-spacer></v-spacer>
        <v-btn v-if="printStep === 2" variant="text" @click="printStep = 1"
          >Kembali</v-btn
        >
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style scoped>
/* ── Filter bar ── */
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
  height: 20px;
  background: #d0d0d0;
  margin: 0 8px;
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

/* Status tabs (pill buttons) */
.status-tabs {
  display: flex;
  gap: 3px;
}
.status-tab {
  height: 26px;
  padding: 0 10px;
  border: 1px solid #d0d0d0;
  border-radius: 13px;
  background: white;
  font-size: 11px;
  font-weight: 600;
  color: #555;
  cursor: pointer;
  transition: all 0.12s;
  white-space: nowrap;
}
.status-tab:hover {
  background: #e3f2fd;
  border-color: #90caf9;
  color: #1565c0;
}
.status-tab.active {
  background: #1565c0;
  border-color: #1565c0;
  color: white;
}

/* ── Expand detail ── */
.detail-wrap {
  font-family: "Segoe UI", system-ui, sans-serif;
}
.detail-loading {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  font-size: 12px;
  color: #757575;
}
.detail-empty {
  text-align: center;
  font-size: 11px;
  color: #9e9e9e;
  padding: 12px;
}
.detail-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
  background: white;
}
.detail-table thead tr {
  background: #1565c0;
}
.detail-table th {
  padding: 6px 8px;
  font-size: 11px;
  font-weight: 700;
  color: white;
  text-align: left;
  white-space: nowrap;
  letter-spacing: 0.03em;
}
.detail-table td {
  padding: 5px 8px;
  font-size: 12px;
  border-bottom: 1px solid #f0f0f0;
  color: #212121;
  vertical-align: middle;
}
.detail-table tbody tr:nth-of-type(odd) {
  background: #fafafa;
}
.detail-table tbody tr:hover td {
  background: #e3f2fd;
}
.tc {
  text-align: center;
}
.tr {
  text-align: right;
}
.fw {
  font-weight: 700;
}

/* Status chip */
.status-chip {
  display: inline-block;
  padding: 1px 7px;
  border-radius: 10px;
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  background: #e0e0e0;
  color: #424242;
}
.s-batal {
  background: #ffebee;
  color: #c62828;
}
.s-acc {
  background: #e8f5e9;
  color: #2e7d32;
}
.s-open {
  background: #e3f2fd;
  color: #1565c0;
}
.s-close {
  background: #f3e5f5;
  color: #6a1b9a;
}
.s-wait {
  background: #fff8e1;
  color: #f57f17;
}

/* ── Dialog Status ── */
.status-card {
  background: white;
  border-radius: 8px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  font-family: "Segoe UI", system-ui, sans-serif;
  font-size: 12px;
  max-height: 88vh;
}
.status-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #1565c0;
  color: white;
  padding: 10px 16px;
  font-size: 13px;
  font-weight: 700;
  flex-shrink: 0;
}
.status-close {
  background: transparent;
  border: none;
  color: rgba(255, 255, 255, 0.8);
  font-size: 16px;
  cursor: pointer;
}
.status-close:hover {
  color: white;
}
.status-body {
  flex: 1;
  overflow-y: auto;
  padding: 14px 16px;
  background: #f5f5f5;
  min-height: 0;
}
.status-nomor-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
}
.status-nomor-label {
  font-size: 12px;
  font-weight: 600;
  color: #424242;
}
.status-nomor-inp {
  height: 28px;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  padding: 0 8px;
  font-size: 12px;
  font-weight: 700;
  background: #f0f0f0;
  color: #212121;
  width: 160px;
  outline: none;
}
.status-table-wrap {
  overflow-x: auto;
  background: white;
  border-radius: 4px;
  border: 1px solid #e0e0e0;
}
.status-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 11px;
}
.status-table thead tr {
  background: #f5f5f5;
  position: sticky;
  top: 0;
  z-index: 1;
}
.status-table th {
  padding: 6px 8px;
  font-size: 11px;
  font-weight: 700;
  color: #424242;
  border-bottom: 2px solid #e0e0e0;
  text-align: left;
  white-space: nowrap;
}
.status-table td {
  padding: 3px 6px;
  border-bottom: 1px solid #f0f0f0;
  vertical-align: middle;
}
.status-table tr:hover td {
  background: #f9f9f9;
}
.td-inp {
  padding: 2px 4px;
}
.total-row td {
  background: #f5f5f5;
  font-weight: 700;
  font-size: 11px;
  padding: 5px 6px;
  border-top: 2px solid #e0e0e0;
}
.cell-inp {
  width: 100%;
  height: 24px;
  border: 1px solid #e0e0e0;
  border-radius: 3px;
  padding: 0 4px;
  font-size: 11px;
  outline: none;
  background: white;
}
.cell-inp:focus {
  border-color: #1976d2;
}
.status-footer {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  background: #fafafa;
  border-top: 1px solid #e0e0e0;
  flex-shrink: 0;
}
.status-btn {
  display: inline-flex;
  align-items: center;
  padding: 5px 14px;
  border: none;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.15s;
}
.status-btn:disabled {
  opacity: 0.5;
  cursor: default;
}
.status-btn.save {
  background: #1565c0;
  color: white;
}
.status-btn.save:hover:not(:disabled) {
  background: #1557a8;
}
.status-btn.cancel {
  background: #e53935;
  color: white;
  margin-left: auto;
}
.status-btn.cancel:hover:not(:disabled) {
  background: #c62828;
}
</style>
