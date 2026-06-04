<script setup lang="ts">
import { ref } from "vue";
import { useRouter } from "vue-router";
import { useToast } from "vue-toastification";
import BaseBrowse from "@/components/BaseBrowse.vue";
import { useBrowse } from "@/composables/useBrowse";
import { potonganService } from "@/services/piutang/penerimaan/potonganService";
import {
  IconScissors,
  IconFileDescription,
  IconUpload,
} from "@tabler/icons-vue";

const router = useRouter();
const toast = useToast();
const menuId = "254";

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

// State untuk Dialog Alasan Pengajuan
const dialogAlasan = ref(false);
const alasanText = ref("");
const alasanNomor = ref("");

// State untuk Dialog Update PPh23
const dialogPph = ref(false);
const selectedPphNomor = ref("");
const formPph = ref({
  noBukti: "",
  tglTrs: "",
  bruto: 0,
  pph: 0,
});

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
    const res = await potonganService.getBrowseList(payload);
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
  { title: "Account", key: "account", width: "100px" },
  { title: "Debet", key: "Debet", width: "130px", align: "right" },
  { title: "Customer", key: "customer", minWidth: "250px" },
  { title: "Notes", key: "Notes", minWidth: "200px" },
  { title: "No. Bukti", key: "NoBukti", width: "130px" },
  { title: "Tgl. Trs", key: "TglTrs", width: "100px", align: "center" },
  { title: "Bruto", key: "Bruto", width: "120px", align: "right" },
  { title: "PPh", key: "PPh", width: "120px", align: "right" },
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
  router.push({ name: "PenerimaanPotonganCreate", query: { mode: "new" } });
};

const goEdit = (item: any) => {
  router.push({
    name: "PenerimaanPotonganEdit",
    params: { nomor: encodeURIComponent(item.Nomor) },
  });
};

const goDelete = async (item: any) => {
  isLoading.value = true;
  try {
    await potonganService.deletePotongan(encodeURIComponent(item.Nomor));
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
  const nomorPotongan = selected.value[0].Nomor;

  isLoading.value = true;
  try {
    await potonganService.checkPengajuan(nomorPotongan);

    alasanNomor.value = nomorPotongan;
    alasanText.value = "";
    dialogAlasan.value = true;
  } catch (error: any) {
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
    await potonganService.requestPin5(alasanNomor.value, alasanText.value);
    toast.success("Berhasil diajukan. Menunggu ACC.");
    dialogAlasan.value = false;
    fetchData();
  } catch (error: any) {
    toast.error(error.response?.data?.message || "Gagal mengajukan.");
  } finally {
    isLoading.value = false;
  }
};

// --- LOGIKA UPDATE PPh23 ---
const openUpdatePph = () => {
  if (selected.value.length === 0) return;
  const item = selected.value[0];

  if (item.account !== "001") {
    toast.error(
      "Bukan PPh23. (Hanya transaksi dengan Account '001' yang diizinkan)",
    );
    return;
  }

  selectedPphNomor.value = item.Nomor;

  // Format ulang TglTrs dari YYYY-MM-DD jika tersedia, atau gunakan hari ini
  let defaultTglTrs = getLocalDate();
  if (item.TglTrs && item.TglTrs !== "0000-00-00") {
    defaultTglTrs = item.TglTrs;
  }

  formPph.value = {
    noBukti: item.NoBukti || "",
    tglTrs: defaultTglTrs,
    bruto: Number(item.Bruto) || 0,
    pph: Number(item.PPh) || 0,
  };

  dialogPph.value = true;
};

const submitPph23 = async () => {
  isLoading.value = true;
  try {
    await potonganService.updatePph23(selectedPphNomor.value, formPph.value);
    toast.success("PPh23 berhasil diperbarui.");
    dialogPph.value = false;
    fetchData();
  } catch (error: any) {
    toast.error(error.response?.data?.message || "Gagal update PPh23.");
  } finally {
    isLoading.value = false;
  }
};

const getRowProps = () => ({});
</script>

<template>
  <BaseBrowse
    title="Penerimaan Potongan"
    :menu-id="menuId"
    :icon="IconScissors"
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
    @export="exportToExcel('Penerimaan_Potongan')"
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
        color="blue-darken-2"
        :disabled="selected.length === 0"
        @click="openUpdatePph"
        class="mr-2"
      >
        <template #prepend><IconUpload :size="15" /></template>
        Update PPh23
      </v-btn>

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
    <template #item.TglTrs="{ item }">{{ fmtDate(item.TglTrs) }}</template>
    <template #item.Debet="{ item }">{{ fmtNum(item.Debet) }}</template>
    <template #item.Bruto="{ item }">{{ fmtNum(item.Bruto) }}</template>
    <template #item.PPh="{ item }">{{ fmtNum(item.PPh) }}</template>
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
          Nomor Transaksi: {{ alasanNomor }}
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
        >
          Kirim Pengajuan
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <v-dialog v-model="dialogPph" max-width="400px" persistent>
    <v-card class="rounded-lg">
      <v-card-title
        class="bg-blue-darken-2 text-white pa-3 text-subtitle-1 font-weight-bold d-flex align-center"
      >
        <IconUpload :size="18" color="white" class="mr-2" />
        Update PPh23
      </v-card-title>
      <v-card-text class="pa-4 pt-4">
        <div class="text-body-2 mb-4 font-weight-bold text-blue-darken-3">
          No. Potongan: {{ selectedPphNomor }}
        </div>

        <div class="form-row mb-3">
          <label class="font-weight-medium text-caption">No. Bukti</label>
          <v-text-field
            v-model="formPph.noBukti"
            variant="outlined"
            density="compact"
            hide-details
            placeholder="Masukkan No Bukti..."
          />
        </div>

        <div class="form-row mb-3">
          <label class="font-weight-medium text-caption">Tgl. Transaksi</label>
          <input type="date" v-model="formPph.tglTrs" class="date-inp w-100" />
        </div>

        <div class="form-row mb-3">
          <label class="font-weight-medium text-caption">Nilai Bruto</label>
          <v-number-input
            v-model="formPph.bruto"
            variant="outlined"
            density="compact"
            hide-details
          />
        </div>

        <div class="form-row">
          <label class="font-weight-medium text-caption">Nilai PPh</label>
          <v-number-input
            v-model="formPph.pph"
            variant="outlined"
            density="compact"
            hide-details
          />
        </div>
      </v-card-text>
      <v-card-actions class="pa-3 bg-grey-lighten-4 border-t">
        <v-spacer></v-spacer>
        <v-btn variant="text" color="error" @click="dialogPph = false"
          >Batal</v-btn
        >
        <v-btn
          color="blue-darken-2"
          variant="elevated"
          :loading="isLoading"
          @click="submitPph23"
        >
          Simpan PPh
        </v-btn>
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
.w-100 {
  width: 100%;
  box-sizing: border-box;
}
.filter-divider {
  width: 1px;
  height: 24px;
  background-color: #d0d0d0;
  margin: 0 12px;
}

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

/* Menghilangkan margin bawaan Vuetify pada number-input di dalam form row */
.form-row :deep(.v-field__input) {
  min-height: 32px !important;
  padding-top: 0 !important;
  padding-bottom: 0 !important;
}
</style>
