<script setup lang="ts">
import { ref, watch } from "vue";
import { useToast } from "vue-toastification";
import { useAuthStore } from "@/stores/authStore";
import BaseBrowse from "@/components/BaseBrowse.vue";
import { useBrowse } from "@/composables/useBrowse";
import { approvalService } from "@/services/tools/approvalService";
import { IconShieldCheck, IconCurrencyDollar } from "@tabler/icons-vue";

const toast = useToast();
const authStore = useAuthStore();
const menuId = "263";

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
  belumAccSaja: true,
  jenis: "PENDING_MANAGER",
});

const showAuthDialog = ref(false);
const isSubmitting = ref(false);
const selectedRows = ref<any[]>([]);
const authData = ref<any>({});
const authStatus = ref("Y");

const headers = [
  { title: "Kode", key: "KdCus", width: "100px" },
  { title: "Nama Customer", key: "Nama", minWidth: "220px" },
  { title: "Kota", key: "Kota", width: "120px" },
  {
    title: "Plafon (Rp)",
    key: "Plafon",
    width: "140px",
    align: "right" as const,
  },
  {
    title: "Status",
    key: "PlafonAcc",
    width: "140px",
    align: "center" as const,
  },
  {
    title: "Tgl Minta",
    key: "TglMinta",
    width: "140px",
    align: "center" as const,
  },
  { title: "Peminta", key: "Peminta", width: "100px" },
  { title: "Tgl Acc", key: "TglAcc", width: "140px", align: "center" as const },
  { title: "Otorisasi", key: "Otorisasi", width: "100px" },
];

const formatDateTime = (val: string) => {
  if (!val) return "";
  const parts = val.split(" ");
  if (parts.length !== 2) return val;
  const d = parts[0].split("-");
  if (d.length !== 3) return val;
  return `${d[2]}/${d[1]}/${d[0]} ${parts[1]}`;
};

const fmtNum = (val: any) =>
  new Intl.NumberFormat("id-ID").format(Number(val) || 0);

const { items, isLoading, canEdit, fetchData, exportToExcel } = useBrowse({
  menuId,
  fetchApi: async () => {
    const res = await approvalService.getPlafonList(filterState.value);
    return res.data.data || [];
  },
  immediate: true,
});

watch(() => filterState.value.belumAccSaja, fetchData);

const openOtorisasi = (row: any) => {
  authData.value = row;
  authStatus.value = row.PlafonAcc === "TOLAK" ? "N" : "Y";
  showAuthDialog.value = true;
};

const openOtorisasiHeader = (selected: any[]) => {
  if (selected.length === 0) {
    toast.warning("Silahkan pilih baris customer terlebih dahulu.");
    return;
  }
  openOtorisasi(selected[0]);
};

const submitOtorisasi = async () => {
  isSubmitting.value = true;
  try {
    const res = await approvalService.submitPlafonOtorisasi({
      cus_kode: authData.value.KdCus,
      status_acc: authStatus.value,
    });

    const peminta = res.data.data?.peminta || "";
    toast.success(
      `Otorisasi plafon berhasil.${peminta ? `\nSilahkan info ke ${peminta}.` : ""}`,
    );
    showAuthDialog.value = false;

    // Mutasi lokal
    const targetRow = items.value?.find(
      (i: any) => i.KdCus === authData.value.KdCus,
    );
    if (targetRow) {
      targetRow.PlafonAcc = authStatus.value === "Y" ? "ACC" : "TOLAK";
      targetRow.Otorisasi = authStore.user?.kode || "Anda";
      const now = new Date();
      const pad = (n: number) => String(n).padStart(2, "0");
      targetRow.TglAcc = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
    }
  } catch (error: any) {
    toast.error(error.response?.data?.message || "Gagal memproses keputusan.");
  } finally {
    isSubmitting.value = false;
  }
};

const getRowProps = (data: any) => {
  const item = data.item?.raw || data.item;
  if (!item?.PlafonAcc || item.PlafonAcc === "PENDING_MANAGER") {
    return { class: "row-pending" };
  }
  return {};
};
</script>

<template>
  <BaseBrowse
    title="Tools Approval"
    :menu-id="menuId"
    :icon="IconShieldCheck"
    :headers="headers"
    :items="items ?? []"
    item-value="KdCus"
    :is-loading="isLoading"
    v-model:filterState="filterState"
    can-export
    v-model:selected="selectedRows"
    :row-props-fn="getRowProps"
    @refresh="fetchData"
    @row-click="openOtorisasi"
    @export="exportToExcel('Approval_Plafon_Manager')"
  >
    <template #filter-left>
      <slot name="filter-dropdown" />

      <span class="f-label">Tgl Pengajuan</span>
      <input
        type="date"
        v-model="filterState.startDate"
        class="f-date"
        @change="fetchData"
      />
      <span class="f-sep">s/d</span>
      <input
        type="date"
        v-model="filterState.endDate"
        class="f-date"
        @change="fetchData"
      />

      <div class="f-divider" />

      <label class="chk-lbl">
        <input type="checkbox" v-model="filterState.belumAccSaja" />
        Belum acc saja
      </label>
    </template>

    <template #extra-actions="{ selected }">
      <v-btn
        v-if="canEdit"
        size="small"
        variant="flat"
        color="orange-darken-3"
        :disabled="selectedRows.length === 0"
        @click="openOtorisasiHeader(selectedRows)"
      >
        <template #prepend><IconShieldCheck :size="15" /></template>
        Otorisasi
      </v-btn>
    </template>

    <template #item.Plafon="{ item }">
      <span class="font-weight-bold">{{ fmtNum(item.Plafon) }}</span>
    </template>

    <template #item.PlafonAcc="{ item }">
      <span
        class="font-weight-bold"
        :class="
          item.PlafonAcc === 'ACC'
            ? 'text-success'
            : item.PlafonAcc === 'TOLAK'
              ? 'text-error'
              : 'text-warning'
        "
      >
        {{ item.PlafonAcc || "PENDING" }}
      </span>
    </template>

    <template #item.TglMinta="{ item }">
      {{ formatDateTime(item.TglMinta) }}
    </template>
    <template #item.TglAcc="{ item }">
      {{ formatDateTime(item.TglAcc) }}
    </template>
  </BaseBrowse>

  <!-- Dialog Otorisasi -->
  <v-dialog v-model="showAuthDialog" max-width="460px" persistent>
    <v-card class="rounded-lg">
      <v-card-title class="auth-dialog-head">
        <IconCurrencyDollar :size="18" color="white" class="mr-2" />
        Otorisasi Plafon Customer
      </v-card-title>

      <v-card-text class="pa-4">
        <div class="delphi-blue-box pa-3 rounded border">
          <div class="d-row">
            <span class="d-lbl">Kode</span>
            <input
              type="text"
              :value="authData.KdCus"
              readonly
              class="d-inp"
              style="width: 90px"
            />
          </div>

          <div class="d-row">
            <span class="d-lbl">Customer</span>
            <input
              type="text"
              :value="authData.Nama"
              readonly
              class="d-inp flex-1 font-weight-bold"
            />
          </div>

          <div class="d-row">
            <span class="d-lbl">Kota</span>
            <input
              type="text"
              :value="authData.Kota"
              readonly
              class="d-inp flex-1"
            />
          </div>

          <div class="d-row">
            <span class="d-lbl">Plafon</span>
            <input
              type="text"
              :value="fmtNum(authData.Plafon)"
              readonly
              class="d-inp font-weight-bold text-primary"
              style="width: 160px; text-align: right"
            />
            <span class="ml-2 text-caption text-grey-darken-1">
              {{
                Number(authData.Plafon) <= 20_000_000
                  ? "≤ 20 juta"
                  : "> 20 juta"
              }}
            </span>
          </div>

          <div class="d-row">
            <span class="d-lbl">Peminta</span>
            <input
              type="text"
              :value="authData.Peminta"
              readonly
              class="d-inp flex-1 font-weight-bold"
            />
          </div>

          <div class="d-row mt-3 pt-2 border-t align-center">
            <span class="d-lbl font-weight-bold">Keputusan</span>
            <v-radio-group
              v-model="authStatus"
              inline
              hide-details
              class="ma-0"
            >
              <v-radio
                label="ACC (Setujui)"
                value="Y"
                color="success"
                class="mr-4"
              />
              <v-radio label="TOLAK" value="N" color="error" />
            </v-radio-group>
          </div>
        </div>
      </v-card-text>

      <v-card-actions class="pa-3 bg-grey-lighten-4 border-t">
        <v-spacer />
        <v-btn
          variant="text"
          color="grey-darken-1"
          @click="showAuthDialog = false"
        >
          Batal
        </v-btn>
        <v-btn
          color="primary"
          variant="elevated"
          :loading="isSubmitting"
          @click="submitOtorisasi"
        >
          Simpan
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.f-label {
  font-size: 11px;
  font-weight: 700;
  color: #555;
  white-space: nowrap;
}
.f-date {
  height: 27px;
  border: 1px solid #ccc;
  border-radius: 4px;
  padding: 0 6px;
  font-size: 11px;
  background: white;
  outline: none;
  margin: 0 4px;
}
.f-date:focus {
  border-color: #1976d2;
}
.f-sep {
  font-size: 11px;
  color: #888;
}
.f-divider {
  width: 1px;
  height: 20px;
  background: #ddd;
  margin: 0 10px;
}
.chk-lbl {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  color: #444;
}
.chk-lbl input {
  accent-color: #1565c0;
}

.delphi-blue-box {
  background-color: #eef4f9;
  border-color: #b0bec5 !important;
}
.d-row {
  display: flex;
  align-items: center;
  margin-bottom: 5px;
  min-height: 26px;
}
.d-lbl {
  width: 80px;
  font-size: 11px;
  font-weight: 600;
  color: #37474f;
  flex-shrink: 0;
}
.d-inp {
  height: 24px;
  border: 1px solid #b0bec5;
  border-radius: 3px;
  padding: 0 6px;
  font-size: 11px;
  background: #fff !important;
  color: #263238;
  outline: none;
}
.flex-1 {
  flex: 1;
  min-width: 0;
}
.mt-3 {
  margin-top: 12px;
}
.pt-2 {
  padding-top: 8px;
}
.ml-2 {
  margin-left: 8px;
}

.auth-dialog-head {
  background: #1565c0;
  color: white;
  display: flex;
  align-items: center;
  padding: 12px 16px;
  font-size: 13px;
  font-weight: 700;
}

:deep(table tbody tr.row-pending td) {
  color: #e65100 !important;
  font-weight: 600 !important;
}
</style>
