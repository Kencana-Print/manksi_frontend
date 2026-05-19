<script setup lang="ts">
import { ref } from "vue";
import api from "@/services/api";
import { useBrowse } from "@/composables/useBrowse";
import { useToast } from "vue-toastification";
import { useRouter } from "vue-router";
import BaseBrowse from "@/components/BaseBrowse.vue";
import BapAjukanEditDialog from "@/components/dialogs/BapAjukanEditDialog.vue";
import { IconAlertCircle, IconPrinter, IconPencil } from "@tabler/icons-vue";

const toast = useToast();
const router = useRouter();

const formatDateLocal = (value?: string | Date) => {
  if (!value) return "";

  const d = new Date(value);

  if (isNaN(d.getTime())) return "";

  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

// Default Tanggal: Awal Bulan sd Hari Ini
const getFirstDayOfMonth = () => {
  const date = new Date();
  return formatDateLocal(new Date(date.getFullYear(), date.getMonth(), 1));
};
const getToday = () => formatDateLocal(new Date());

const startDate = ref(getFirstDayOfMonth());
const endDate = ref(getToday());

// ID 142 = BAP dan Komplain Produksi
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
  menuId: "142",
  fetchApi: async () => {
    const res = await api.get("/master/bap-produksi", {
      params: { startDate: startDate.value, endDate: endDate.value },
    });
    return res.data.data;
  },
});

const headers = [
  { title: "NOMOR", key: "Nomor", width: "130px" },
  { title: "TANGGAL", key: "Tanggal", width: "100px", align: "center" },
  { title: "CAB", key: "Cab", width: "60px", align: "center" },
  { title: "TIPE", key: "Tipe", width: "120px" },
  { title: "BAGIAN", key: "Bagian", width: "120px" },
  { title: "MASALAH", key: "Masalah", minWidth: "250px" },
  { title: "SUMBER MASALAH", key: "SumberMasalah", minWidth: "250px" },
  { title: "SOLUSI", key: "Solusi", minWidth: "250px" },
  { title: "PERTANGGUNGJAWABAN", key: "Pertanggungjawaban", minWidth: "250px" },
  { title: "SPK", key: "SPK", width: "120px" },
  { title: "CREATED", key: "Created", width: "100px" },
  { title: "APPROVE", key: "Approve", width: "100px" },
];

const rowPropsFn = (data: any) => {
  const item = data.item?.raw || data.item;
  // Jika Approve kosong, warna teks baris jadi merah (seperti baris kedua di screenshot)
  if (!item.Approve) {
    return { class: "text-red" };
  }
  return {};
};

const handleAdd = () => {
  router.push("/daftar/berita-acara/create");
};

const handleEdit = async (item: any) => {
  if (!item.Approve) {
    router.push(`/daftar/berita-acara/edit/${item.Nomor}`);
  } else {
    handleAjukanEdit(item);
  }
};

const handleDelete = async (item: any) => {
  if (item.Approve) {
    toast.error("Sudah di-approve, tidak bisa dihapus.");
    return;
  }
  try {
    await api.delete(`/master/bap-produksi/${item.Nomor}`);
    toast.success("BAP berhasil dihapus.");
    fetchData();
  } catch (error) {
    toast.error("Gagal menghapus BAP.");
  }
};

// --- PENGAJUAN EDIT (Pin 5) ---
const showAjukanDialog = ref(false);
const activeBapNomor = ref<string | null>(null);

const handleAjukanEdit = (item: any) => {
  activeBapNomor.value = item.Nomor;
  showAjukanDialog.value = true;
};

const handlePrint = () => {
  if (selected.value.length === 0) {
    toast.warning("Pilih BAP yang akan dicetak terlebih dahulu.");
    return;
  }

  const nomor = selected.value[0].Nomor;
  // Buka rute print di Tab baru
  const url = router.resolve({
    name: "BapProduksiPrint",
    params: { nomor },
  }).href;
  window.open(url, "_blank");
};
</script>

<template>
  <BaseBrowse
    title="BAP dan Komplain Produksi"
    menu-id="142"
    :icon="IconAlertCircle"
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
    @export="exportToExcel('Data_BAP_Produksi')"
  >
    <template #filter-left>
      <div class="f-group">
        <span class="f-label">Periode</span>
        <input
          type="date"
          v-model="startDate"
          class="f-date"
          @change="fetchData"
        />
        <span class="f-sep">s/d</span>
        <input
          type="date"
          v-model="endDate"
          class="f-date"
          @change="fetchData"
        />
      </div>
    </template>

    <template #extra-actions="{ selected }">
      <v-btn
        size="small"
        color="indigo"
        variant="elevated"
        :disabled="selected.length === 0"
        @click="handlePrint"
      >
        <template #prepend
          ><IconPrinter :size="15" :stroke-width="1.7"
        /></template>
        Cetak
      </v-btn>
      <v-btn
        size="small"
        color="warning"
        variant="elevated"
        :disabled="selected.length === 0"
        v-if="canEdit"
        @click="handleAjukanEdit(selected[0])"
      >
        <template #prepend
          ><IconPencil :size="15" :stroke-width="1.7"
        /></template>
        Ajukan Perubahan
      </v-btn>
    </template>

    <template #filter-right>
      <div class="legend-box">
        <div class="legend-row">
          <span class="legend-title">Font:</span>
          <div class="legend-item">
            <div class="legend-dot" style="background: #e53935"></div>
            Belum Approve
          </div>
        </div>
        <div class="legend-divider" />
        <div class="legend-row">
          <span class="legend-title">Back (No. BAP):</span>
          <div class="legend-item">
            <div class="legend-dot" style="background: #1565c0"></div>
            Nunggu Acc
          </div>
          <div class="legend-item">
            <div class="legend-dot" style="background: #2e7d32"></div>
            Sudah Acc
          </div>
          <div class="legend-item">
            <div class="legend-dot" style="background: #c62828"></div>
            Tolak
          </div>
        </div>
      </div>
    </template>

    <template #item.Nomor="{ item }">
      <div
        :class="[
          'pa-1 px-2 rounded font-weight-bold',
          item.raw?.Ngedit === 'WAIT'
            ? 'bg-blue text-white'
            : item.raw?.Ngedit === 'ACC'
              ? 'bg-green text-white'
              : item.raw?.Ngedit === 'TOLAK'
                ? 'bg-red text-white'
                : !item.raw?.Approve
                  ? 'text-red bg-transparent'
                  : 'text-black bg-transparent',
        ]"
        style="min-width: 100px; display: inline-block"
      >
        {{ item.raw?.Nomor || item.Nomor }}
      </div>
    </template>
  </BaseBrowse>

  <BapAjukanEditDialog
    v-model="showAjukanDialog"
    :bap-nomor="activeBapNomor"
    @saved="fetchData"
  />
</template>

<style scoped>
.f-group {
  display: flex;
  align-items: center;
  gap: 6px;
}
.f-label {
  font-size: 11px;
  font-weight: 700;
  color: #555;
  white-space: nowrap;
}
.f-sep {
  font-size: 11px;
  color: #777;
}
.f-date {
  height: 28px;
  border: 1px solid #ccc;
  border-radius: 4px;
  padding: 0 6px;
  font-size: 12px;
  background: white;
  outline: none;
}
.f-date:focus {
  border-color: #1565c0;
}

.legend-box {
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  padding: 4px 8px;
  display: flex;
  flex-direction: column;
  gap: 3px;
}
.legend-row {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: nowrap;
}
.legend-title {
  font-size: 10px;
  font-weight: 700;
  color: #555;
  white-space: nowrap;
  flex-shrink: 0;
}
.legend-item {
  display: flex;
  align-items: center;
  gap: 3px;
  font-size: 10px;
  color: #424242;
  white-space: nowrap;
}
.legend-dot {
  width: 9px;
  height: 9px;
  border-radius: 2px;
  flex-shrink: 0;
}
.legend-divider {
  height: 1px;
  background: #eeeeee;
}
</style>
