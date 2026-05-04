<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useRouter } from "vue-router";
import api from "@/services/api";
import { useBrowse } from "@/composables/useBrowse";
import { useToast } from "vue-toastification";
import BaseBrowse from "@/components/BaseBrowse.vue";

const toast = useToast();
const router = useRouter();

// ── Filter state ──────────────────────────────────────────────────────
const getToday = () => new Date().toISOString().substr(0, 10);
const getPlus5 = () => {
  const d = new Date();
  d.setDate(d.getDate() + 5);
  return d.toISOString().substr(0, 10);
};

const startDate = ref(getToday());
const endDate = ref(getPlus5());
const divisiKode = ref("0");
const divisiOptions = ref<any[]>([{ Kode: "0", Nama: "ALL" }]);

const loadDivisi = async () => {
  try {
    const res = await api.get("/penjualan/minta-harga/divisi");
    divisiOptions.value = [
      { Kode: "0", Nama: "ALL" },
      ...res.data.data.map((d: any) => ({
        Kode: d.Kode,
        Nama: `${d.Kode} - ${d.Nama}`,
      })),
    ];
  } catch {
    console.error("Gagal load divisi");
  }
};
onMounted(loadDivisi);

// ── Browse ────────────────────────────────────────────────────────────
const {
  items,
  isLoading,
  canInsert,
  canEdit,
  canDelete,
  canExport,
  selected,
  fetchData,
  exportToExcel,
} = useBrowse({
  menuId: "166",
  fetchApi: async () => {
    const res = await api.get("/penjualan/minta-harga/browse", {
      params: {
        startDate: startDate.value,
        endDate: endDate.value,
        divisi: divisiKode.value,
      },
    });
    return res.data.data;
  },
});

// ── Headers ───────────────────────────────────────────────────────────
const headers = [
  { title: "NOMOR", key: "Nomor", width: "140px" },
  { title: "DIVISI", key: "Divisi", width: "120px" },
  { title: "TANGGAL", key: "Tanggal", width: "100px", align: "center" },
  { title: "CUSTOMER", key: "Customer", minWidth: "150px" },
  { title: "SALES", key: "Sales", minWidth: "120px" },
  { title: "NAMA PEKERJAAN", key: "NamaPekerjaan", minWidth: "250px" },
  { title: "Rencana Order", key: "RencanaOrder", width: "130px", align: "end" },
  { title: "Harga Lama", key: "HargaLama", width: "120px", align: "end" },
  { title: "Harga Budget", key: "HargaBudget", width: "120px", align: "end" },
  {
    title: "Order Terakhir",
    key: "OrderTerakhir",
    width: "120px",
    align: "center",
  },
  { title: "Kain", key: "Kain", minWidth: "150px" },
  { title: "Panjang", key: "Panjang", width: "90px", align: "end" },
  { title: "Lebar", key: "Lebar", width: "90px", align: "end" },
  { title: "Ukuran", key: "Ukuran", minWidth: "120px" },
  { title: "Gramasi", key: "Gramasi", width: "100px" },
  { title: "Finishing", key: "Finishing", minWidth: "150px" },
  { title: "Sublim", key: "Sublim", width: "100px" },
  { title: "Keterangan", key: "Keterangan", minWidth: "200px" },
  { title: "Harga MAP", key: "HargaMAP", width: "120px", align: "end" },
  {
    title: "Harga Kalkulasi",
    key: "HargaKalkulasi",
    width: "130px",
    align: "end",
  },
  {
    title: "Tgl Kalkulasi",
    key: "TglKalkulasi",
    width: "120px",
    align: "center",
  },
  { title: "No. Kalkulasi", key: "NoKalkulasi", width: "130px" },
  { title: "Ket. Kalkulasi", key: "KeteranganKalkulasi", minWidth: "150px" },
  { title: "Status", key: "Status", width: "100px" },
  { title: "Approved", key: "Approved", width: "150px", align: "center" },
  { title: "Di Apv Oleh", key: "diApvOleh", width: "120px" },
];

// ── Row coloring ──────────────────────────────────────────────────────
const rowPropsFn = (data: any) => {
  const item = data.item?.raw || data.item;
  const s = item.Status;
  if (s === "MINTA") return { class: "text-red font-weight-medium" };
  if (s === "WAIT") return { class: "text-green font-weight-medium" };
  if (s === "CANCEL") return { class: "text-blue font-weight-medium" };
  if (s === "BELUM") return { class: "text-grey-darken-1 font-weight-medium" };
  return {};
};

const fmtNum = (v: any) =>
  new Intl.NumberFormat("id-ID").format(Number(v) || 0);

// ── Navigation ────────────────────────────────────────────────────────
const handleAdd = () => router.push("/penjualan/minta-harga/create");
const handleEdit = (item: any) =>
  router.push(`/penjualan/minta-harga/edit/${item.Nomor}`);
const handleDelete = async (item: any) => {
  try {
    await api.delete(`/penjualan/minta-harga/${item.Nomor}`);
    toast.success("Berhasil dihapus.");
    fetchData();
  } catch (e: any) {
    toast.error(e.response?.data?.message || "Gagal menghapus data.");
  }
};

// ── Pengajuan perubahan (PIN 5) ───────────────────────────────────────
const showPinDialog = ref(false);
const isPinLoading = ref(false);
const pinData = ref({ Nomor: "", Urut: 1, Alasan: "" });

const openPengajuanEdit = async () => {
  if (!selected.value.length) return;
  const item = selected.value[0];
  isPinLoading.value = true;
  try {
    const res = await api.get(`/penjualan/minta-harga/pengajuan/${item.Nomor}`);
    pinData.value = {
      Nomor: item.Nomor,
      Urut: res.data.data.urut,
      Alasan: res.data.data.alasan,
    };
    showPinDialog.value = true;
  } catch (e: any) {
    toast.error(
      e.response?.data?.message || "Gagal mengecek status pengajuan.",
    );
  } finally {
    isPinLoading.value = false;
  }
};

const submitPengajuan = async () => {
  if (!pinData.value.Alasan.trim()) {
    toast.warning("Alasan harus diisi.");
    return;
  }
  isPinLoading.value = true;
  try {
    const res = await api.post(
      `/penjualan/minta-harga/pengajuan/${pinData.value.Nomor}`,
      {
        urut: pinData.value.Urut,
        alasan: pinData.value.Alasan,
      },
    );
    toast.success(res.data.message);
    showPinDialog.value = false;
    fetchData();
  } catch (e: any) {
    toast.error(e.response?.data?.message || "Gagal melakukan pengajuan.");
  } finally {
    isPinLoading.value = false;
  }
};
</script>

<template>
  <BaseBrowse
    title="Permintaan Harga"
    menu-id="166"
    icon="mdi-cash-multiple"
    :headers="headers"
    :items="items ?? []"
    :is-loading="isLoading"
    v-model:selected="selected"
    :can-insert="canInsert"
    :can-edit="canEdit"
    :can-delete="canDelete"
    :can-export="canExport"
    :row-props-fn="rowPropsFn"
    item-value="Nomor"
    @refresh="fetchData"
    @add="handleAdd"
    @edit="handleEdit"
    @delete="handleDelete"
    @export="exportToExcel('Data_Permintaan_Harga')"
  >
    <!-- ── Filter kiri: Periode + Divisi ── -->
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

      <div class="filter-divider" />

      <div class="filter-group">
        <span class="filter-label">Divisi</span>
        <select v-model="divisiKode" class="filter-select" @change="fetchData">
          <option
            v-for="opt in divisiOptions"
            :key="opt.Kode"
            :value="opt.Kode"
          >
            {{ opt.Nama }}
          </option>
        </select>
      </div>
    </template>

    <!-- ── Extra actions ── -->
    <template #extra-actions="{ selected }">
      <v-btn
        v-if="canEdit"
        size="small"
        color="warning"
        variant="elevated"
        prepend-icon="mdi-pencil-lock-outline"
        :disabled="selected.length === 0"
        :loading="isPinLoading"
        @click="openPengajuanEdit"
        >Pengajuan Perubahan Data</v-btn
      >
    </template>

    <!-- ── Legend kanan ── -->
    <template #filter-right>
      <div class="legend-box">
        <div class="legend-row">
          <div class="legend-item">
            <div class="legend-dot" style="background: #757575"></div>
            <span>BELUM</span>
          </div>
          <div class="legend-item">
            <div class="legend-dot" style="background: #e53935"></div>
            <span>MINTA</span>
          </div>
          <div class="legend-item">
            <div class="legend-dot" style="background: #1565c0"></div>
            <span>CANCEL</span>
          </div>
          <div class="legend-item">
            <div class="legend-dot" style="background: #212121"></div>
            <span>DONE</span>
          </div>
        </div>
        <div class="legend-divider" />
        <div class="legend-row">
          <span class="legend-title">Back Color Ngedit:</span>
          <div class="legend-item">
            <div class="legend-dot" style="background: #1565c0"></div>
            <span>WAIT</span>
          </div>
          <div class="legend-item">
            <div class="legend-dot" style="background: #2e7d32"></div>
            <span>ACC</span>
          </div>
          <div class="legend-item">
            <div class="legend-dot" style="background: #e53935"></div>
            <span>TOLAK</span>
          </div>
        </div>
      </div>
    </template>

    <!-- ── Column slots: format angka ── -->
    <template #item.RencanaOrder="{ item }">{{
      fmtNum((item.raw || item).RencanaOrder)
    }}</template>
    <template #item.HargaLama="{ item }">{{
      fmtNum((item.raw || item).HargaLama)
    }}</template>
    <template #item.HargaBudget="{ item }">{{
      fmtNum((item.raw || item).HargaBudget)
    }}</template>
    <template #item.HargaMAP="{ item }">{{
      fmtNum((item.raw || item).HargaMAP)
    }}</template>
    <template #item.HargaKalkulasi="{ item }">{{
      fmtNum((item.raw || item).HargaKalkulasi)
    }}</template>

    <!-- Nomor dengan badge Ngedit -->
    <template #item.Nomor="{ item }">
      <div
        :class="[
          'nomor-badge',
          (item.raw || item).Ngedit === 'WAIT'
            ? 'ngedit-wait'
            : (item.raw || item).Ngedit === 'ACC'
              ? 'ngedit-acc'
              : (item.raw || item).Ngedit === 'TOLAK'
                ? 'ngedit-tolak'
                : '',
        ]"
      >
        {{ (item.raw || item).Nomor }}
      </div>
    </template>
  </BaseBrowse>

  <!-- ── Dialog Pengajuan Perubahan — di LUAR BaseBrowse ── -->
  <v-dialog v-model="showPinDialog" max-width="480px" persistent>
    <div class="pin-card">
      <div class="pin-header">
        <v-icon size="15" color="white" class="mr-2">mdi-pencil-lock</v-icon>
        <span>Pengajuan Perubahan Data</span>
        <button class="pin-close" @click="showPinDialog = false">✕</button>
      </div>
      <div class="pin-body">
        <div class="pin-row">
          <span class="pin-label">Nomor</span>
          <span class="pin-value fw">{{ pinData.Nomor }}</span>
        </div>
        <div class="pin-row">
          <span class="pin-label">Urut Ke</span>
          <span class="pin-value fw">{{ pinData.Urut }}</span>
        </div>
        <div class="pin-row" style="align-items: flex-start; margin-top: 8px">
          <span class="pin-label" style="padding-top: 4px">Alasan *</span>
          <textarea
            v-model="pinData.Alasan"
            class="pin-textarea"
            rows="4"
            placeholder="Tuliskan alasan pengajuan..."
          ></textarea>
        </div>
      </div>
      <div class="pin-footer">
        <button
          class="pin-btn primary"
          :disabled="isPinLoading"
          @click="submitPengajuan"
        >
          <v-icon size="13" class="mr-1">mdi-send</v-icon>
          {{ isPinLoading ? "Mengajukan..." : "Ajukan Sekarang" }}
        </button>
        <button
          class="pin-btn secondary"
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
/* ── Filter groups ── */
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

/* Divisi select */
.filter-select {
  height: 28px;
  border: 1px solid #ccc;
  border-radius: 4px;
  padding: 0 6px;
  font-size: 12px;
  background: white;
  color: #212121;
  cursor: pointer;
  outline: none;
  min-width: 140px;
}
.filter-select:focus {
  border-color: #1976d2;
}

/* ── Legend box ── */
.legend-box {
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  padding: 5px 10px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.legend-row {
  display: flex;
  align-items: center;
  gap: 10px;
}
.legend-item {
  display: flex;
  align-items: center;
  gap: 3px;
}
.legend-dot {
  width: 10px;
  height: 10px;
  border-radius: 2px;
  flex-shrink: 0;
}
.legend-item span {
  font-size: 10px;
  color: #424242;
  white-space: nowrap;
}
.legend-title {
  font-size: 10px;
  font-weight: 700;
  color: #424242;
  white-space: nowrap;
}
.legend-divider {
  height: 1px;
  background: #eeeeee;
}

/* ── Nomor badge ── */
.nomor-badge {
  display: inline-block;
  padding: 1px 6px;
  border-radius: 3px;
  font-size: 12px;
  font-weight: 600;
  min-width: 110px;
}
.ngedit-wait {
  background: #1565c0;
  color: white;
}
.ngedit-acc {
  background: #2e7d32;
  color: white;
}
.ngedit-tolak {
  background: #e53935;
  color: white;
}

/* ── Dialog Pengajuan ── */
.pin-card {
  background: white;
  border-radius: 8px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  font-family: "Segoe UI", system-ui, sans-serif;
  font-size: 12px;
}
.pin-header {
  display: flex;
  align-items: center;
  background: #f57c00;
  color: white;
  padding: 9px 14px;
  font-size: 13px;
  font-weight: 700;
  flex-shrink: 0;
  gap: 6px;
}
.pin-close {
  margin-left: auto;
  background: transparent;
  border: none;
  color: rgba(255, 255, 255, 0.8);
  font-size: 15px;
  cursor: pointer;
}
.pin-close:hover {
  color: white;
}

.pin-body {
  padding: 14px 16px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.pin-row {
  display: flex;
  align-items: center;
  gap: 10px;
}
.pin-label {
  width: 70px;
  flex-shrink: 0;
  font-size: 11px;
  font-weight: 600;
  color: #555;
}
.pin-value {
  font-size: 12px;
  color: #212121;
}
.fw {
  font-weight: 700;
}

.pin-textarea {
  flex: 1;
  border: 1px solid #bdbdbd;
  border-radius: 4px;
  padding: 6px 8px;
  font-size: 12px;
  font-family: inherit;
  resize: vertical;
  outline: none;
  color: #212121;
  min-height: 80px;
}
.pin-textarea:focus {
  border-color: #1976d2;
}

.pin-footer {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  background: #fafafa;
  border-top: 1px solid #e0e0e0;
  flex-shrink: 0;
}
.pin-btn {
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
.pin-btn:disabled {
  opacity: 0.5;
  cursor: default;
}
.pin-btn.primary {
  background: #1565c0;
  color: white;
}
.pin-btn.primary:hover:not(:disabled) {
  background: #1557a8;
}
.pin-btn.secondary {
  background: #e0e0e0;
  color: #424242;
  margin-left: auto;
}
.pin-btn.secondary:hover:not(:disabled) {
  background: #d0d0d0;
}
</style>
