<script setup lang="ts">
import { ref, computed } from "vue";
import { useRouter } from "vue-router";
import { useToast } from "vue-toastification";
import BaseBrowse from "@/components/BaseBrowse.vue";
import { useBrowse } from "@/composables/useBrowse";
import { giroService } from "@/services/piutang/penerimaan/giroService";
import { IconCreditCard, IconFileDescription } from "@tabler/icons-vue";

const router = useRouter();
const toast = useToast();
const menuId = "251";

// Fungsi untuk mendapat awal bulan s/d hari ini secara lokal
const getStartOfMonth = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
};
const getLocalDate = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const filterState = ref({
  startDate: getStartOfMonth(),
  endDate: getLocalDate(),
});

// Dialog Alasan
const dialogAlasan = ref(false);
const alasanText = ref("");
const alasanNomor = ref("");

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
    const payload = {
      startDate: filterState.value.startDate,
      endDate: filterState.value.endDate,
    };
    const res = await giroService.getBrowseList(payload);
    return res.data.data || [];
  },
  immediate: true,
});

const headers = [
  { title: "Nomor", key: "Nomor", width: "160px" },
  { title: "Cabang", key: "Cabang", width: "80px", align: "center" },
  { title: "Bayar", key: "Bayar", width: "120px" },
  { title: "Tanggal", key: "Tanggal", width: "100px", align: "center" },
  { title: "Tempo", key: "Tempo", width: "100px", align: "center" },
  { title: "Account", key: "account", width: "140px" },
  { title: "Debet", key: "Debet", width: "130px", align: "right" },
  { title: "Customer", key: "customer", minWidth: "250px" },
  { title: "Notes", key: "Notes", minWidth: "250px" },
];

const fmtDate = (val: string) => {
  if (!val) return "";
  const d = new Date(val);
  if (isNaN(d.getTime())) return val;
  return `${String(d.getDate()).padStart(2, "0")}-${String(d.getMonth() + 1).padStart(2, "0")}-${d.getFullYear()}`;
};

const fmtNum = (val: number | string | null) => {
  if (!val) return "0";
  return new Intl.NumberFormat("id-ID").format(Number(val));
};

const goAdd = () => {
  router.push({ name: "PenerimaanGiroCreate", query: { mode: "new" } });
};

const goEdit = (item: any) => {
  router.push({
    name: "PenerimaanGiroEdit",
    params: { nomor: encodeURIComponent(item.Nomor) },
  });
};

const goDelete = async (item: any) => {
  isLoading.value = true;
  try {
    await giroService.deleteGiro(encodeURIComponent(item.Nomor));
    toast.success("Berhasil dihapus.");
    fetchData();
  } catch (e: any) {
    toast.error(e.response?.data?.message || "Gagal menghapus data.");
  } finally {
    isLoading.value = false;
  }
};

const pengajuanPerubahan = async () => {
  if (selected.value.length === 0) return;
  const nomorGiro = selected.value[0].Nomor;

  isLoading.value = true;
  try {
    // 1. Lakukan Pengecekan Tutup Buku ke Backend
    await giroService.checkPengajuan(nomorGiro);

    // 2. Jika lolos (belum dilempar error), baru buka Modal Alasan
    alasanNomor.value = nomorGiro;
    alasanText.value = "";
    dialogAlasan.value = true;
  } catch (error: any) {
    // 3. Menampilkan peringatan khas Delphi jika data belum di-close
    toast.warning(
      error.response?.data?.message || "Tidak dapat memproses pengajuan.",
    );
  } finally {
    isLoading.value = false;
  }
};

const submitPengajuan = async () => {
  if (!alasanText.value.trim()) {
    toast.warning("Alasan harus diisi!");
    return;
  }
  isLoading.value = true;
  try {
    await giroService.requestPin5(alasanNomor.value, alasanText.value);
    toast.success("Berhasil diajukan. Menunggu ACC.");
    dialogAlasan.value = false;
    fetchData(); // Merefresh list agar status Ngedit berubah
  } catch (error: any) {
    toast.error(error.response?.data?.message || "Gagal mengajukan.");
  } finally {
    isLoading.value = false;
  }
};

// Styling baris secara opsional jika diperlukan
const getRowProps = () => ({});
</script>

<template>
  <BaseBrowse
    title="Penerimaan Giro"
    :menu-id="menuId"
    :icon="IconCreditCard"
    :headers="headers"
    :items="items ?? []"
    item-value="Nomor"
    :is-loading="isLoading"
    v-model:selected="selected"
    v-model:filterState="filterState"
    :can-insert="canInsert"
    :can-edit="canEdit"
    :can-delete="canDelete"
    can-export
    :row-props-fn="getRowProps"
    summary-key="Debet"
    summary-label="Total Debet"
    @refresh="fetchData"
    @add="goAdd"
    @edit="goEdit"
    @delete="goDelete"
    @export="exportToExcel('Penerimaan_Giro')"
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
      <div class="filter-divider"></div>

      <div class="legend-group">
        <div class="legend-item">
          <div class="legend-box bg-blue"></div>
          <span>= Menunggu Acc</span>
        </div>
        <div class="legend-item">
          <div class="legend-box bg-green"></div>
          <span>= Sudah Acc</span>
        </div>
        <div class="legend-item">
          <div class="legend-box bg-red"></div>
          <span>= Ditolak</span>
        </div>
      </div>
    </template>

    <template #extra-actions="{ selected }">
      <v-btn
        v-if="canEdit"
        size="small"
        variant="flat"
        color="orange-darken-3"
        :disabled="selected.length === 0"
        @click="pengajuanPerubahan"
      >
        <template #prepend><IconFileDescription :size="15" /></template>
        Pengajuan Perubahan Data
      </v-btn>
    </template>

    <template #item.Nomor="{ item }">
      <div
        class="pa-1 rounded text-center font-weight-bold"
        :class="{
          'bg-blue text-white': item.Ngedit === 'WAIT',
          'bg-green text-white': item.Ngedit === 'ACC',
          'bg-red text-white': item.Ngedit === 'TOLAK',
        }"
      >
        {{ item.Nomor }}
      </div>
    </template>

    <template #item.Tanggal="{ item }">{{ fmtDate(item.Tanggal) }}</template>
    <template #item.Tempo="{ item }">{{ fmtDate(item.Tempo) }}</template>
    <template #item.Debet="{ item }">{{ fmtNum(item.Debet) }}</template>
  </BaseBrowse>

  <v-dialog v-model="dialogAlasan" max-width="500px" persistent>
    <v-card class="rounded-lg">
      <v-card-title
        class="bg-primary text-white pa-3 text-subtitle-1 font-weight-bold d-flex align-center"
      >
        <IconFileDescription :size="18" color="white" class="mr-2" />
        Pengajuan Perubahan Data
      </v-card-title>
      <v-card-text class="pa-4 pt-4">
        <div class="text-body-2 mb-2 font-weight-medium">
          Nomor Giro: {{ alasanNomor }}
        </div>
        <v-textarea
          v-model="alasanText"
          label="Alasan Pengajuan"
          variant="outlined"
          auto-grow
          rows="3"
          hide-details
          placeholder="Tuliskan alasan perubahan data secara jelas..."
        ></v-textarea>
      </v-card-text>
      <v-card-actions class="pa-3 bg-grey-lighten-4 border-t">
        <v-spacer></v-spacer>
        <v-btn variant="text" color="error" @click="dialogAlasan = false"
          >Batal</v-btn
        >
        <v-btn
          color="primary"
          variant="elevated"
          :loading="isLoading"
          @click="submitPengajuan"
          >Kirim Pengajuan</v-btn
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
.filter-divider {
  width: 1px;
  height: 24px;
  background-color: #d0d0d0;
  margin: 0 12px;
}

/* Keterangan Status Ngedit */
.legend-group {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 11px;
  font-weight: 500;
  color: #333;
}
.legend-item {
  display: flex;
  align-items: center;
  gap: 5px;
}
.legend-box {
  width: 14px;
  height: 14px;
  border-radius: 2px;
  border: 1px solid rgba(0, 0, 0, 0.1);
}
.bg-blue {
  background-color: #1e88e5 !important;
}
.bg-green {
  background-color: #43a047 !important;
}
.bg-red {
  background-color: #e53935 !important;
}
</style>
