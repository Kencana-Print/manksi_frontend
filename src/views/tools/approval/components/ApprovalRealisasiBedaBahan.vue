<script setup lang="ts">
import { ref, watch } from "vue";
import { useToast } from "vue-toastification";
import { useAuthStore } from "@/stores/authStore";
import BaseBrowse from "@/components/BaseBrowse.vue";
import { useBrowse } from "@/composables/useBrowse";
import { approvalService } from "@/services/tools/approvalService";
import { IconPackageImport } from "@tabler/icons-vue";

const toast = useToast();
const authStore = useAuthStore();
const menuId = "269"; // MENU_ID Approve Realisasi Beda Bahan

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
});

// State untuk Dialog Otorisasi Popup
const showAuthDialog = ref(false);
const isSubmitting = ref(false);
const isLoadingDetail = ref(false);
const selectedRows = ref<any[]>([]);
const authData = ref<any>({});
const authStatus = ref("Y");
const detailSelisih = ref<any[]>([]);

const headers = [
  { title: "Nomor Realisasi", key: "Nomor", width: "150px" },
  { title: "No. Minta", key: "NomorMinta", width: "130px" },
  { title: "Nomor SPK", key: "NomorSpk", width: "130px" },
  { title: "Nama SPK", key: "NamaSpk", minWidth: "180px" },
  { title: "Gdg Produksi", key: "GdgProduksi", width: "110px" },
  {
    title: "Tgl Realisasi",
    key: "TglRealisasi",
    width: "100px",
    align: "center",
  },
  { title: "Keterangan Selisih", key: "Keterangan", minWidth: "220px" },
  { title: "TglMinta", key: "TglMinta", width: "140px", align: "center" },
  { title: "Peminta", key: "Peminta", width: "100px" },
  { title: "TglAcc", key: "TglAcc", width: "140px", align: "center" },
  { title: "Otorisasi", key: "Otorisasi", width: "100px" },
  { title: "Acc", key: "Acc", width: "60px", align: "center" },
];

const formatDateTime = (val: string) => {
  if (!val) return "";
  const parts = val.split(" ");
  if (parts.length !== 2) return val;
  const d = parts[0].split("-");
  if (d.length !== 3) return val;
  return `${d[2]}/${d[1]}/${d[0]} ${parts[1]}`;
};

const { items, isLoading, canEdit, fetchData, exportToExcel } = useBrowse({
  menuId,
  fetchApi: async () => {
    const res = await approvalService.getRealisasiBedaBahanList(
      filterState.value,
    );
    return res.data.data || [];
  },
  immediate: true,
});

watch(() => filterState.value.belumAccSaja, fetchData);

const loadDetailSelisih = async (nomor: string) => {
  isLoadingDetail.value = true;
  detailSelisih.value = [];
  try {
    const res = await approvalService.getRealisasiBedaBahanDetail(nomor);
    detailSelisih.value = res.data.data || [];
  } catch (error: any) {
    toast.error(
      error.response?.data?.message || "Gagal mengambil detail selisih.",
    );
  } finally {
    isLoadingDetail.value = false;
  }
};

const openOtorisasi = (row: any) => {
  authData.value = row;
  authStatus.value = row.Acc === "N" ? "N" : "Y";
  showAuthDialog.value = true;
  loadDetailSelisih(row.Nomor);
};

const openOtorisasiHeader = (selected: any[]) => {
  if (selected.length === 0) {
    toast.warning("Silahkan pilih baris data terlebih dahulu.");
    return;
  }
  openOtorisasi(selected[0]);
};

const submitOtorisasi = async () => {
  isSubmitting.value = true;
  try {
    const res = await approvalService.submitRealisasiBedaBahanOtorisasi({
      nomor: authData.value.Nomor,
      status_acc: authStatus.value,
    });
    const peminta = res.data.data?.peminta || "";
    toast.success(
      `Otorisasi berhasil disimpan.${peminta ? `\nSilahkan info ke ${peminta}.` : ""}${
        authStatus.value === "Y" ? "\nBahan sudah bisa keluar." : ""
      }`,
    );
    showAuthDialog.value = false;
    const targetRow = items.value?.find(
      (i: any) => i.Nomor === authData.value.Nomor,
    );
    if (targetRow) {
      targetRow.Acc = authStatus.value;
      targetRow.Otorisasi = authStore.user?.kode || "Anda";
      targetRow.StatusAktif = authStatus.value === "Y" ? "Y" : "N";
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
  if (!item?.Acc || item.Acc.trim() === "") {
    return { class: "row-pending" };
  }
  return {};
};
</script>

<template>
  <BaseBrowse
    title="Approval Realisasi Beda Bahan"
    :menu-id="menuId"
    :icon="IconPackageImport"
    :headers="headers"
    :items="items ?? []"
    item-value="Nomor"
    :is-loading="isLoading"
    v-model:filterState="filterState"
    can-export
    v-model:selected="selectedRows"
    :row-props-fn="getRowProps"
    @refresh="fetchData"
    @row-click="openOtorisasi"
    @export="exportToExcel('Approval_Realisasi_Beda_Bahan')"
  >
    <template #filter-left>
      <slot name="filter-dropdown" />
      <span class="f-label">Tgl Realisasi</span>
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
    <template #extra-actions>
      <v-btn
        v-if="canEdit"
        size="small"
        variant="flat"
        color="orange-darken-3"
        :disabled="selectedRows.length === 0"
        @click="openOtorisasiHeader(selectedRows)"
      >
        <template #prepend><IconPackageImport :size="15" /></template>
        Otorisasi
      </v-btn>
    </template>
    <template #item.Acc="{ item }">
      <span
        class="font-weight-bold"
        :class="
          item.Acc === 'Y'
            ? 'text-success'
            : item.Acc === 'N'
              ? 'text-error'
              : 'text-warning'
        "
      >
        {{ item.Acc || "–" }}
      </span>
    </template>
    <template #item.TglMinta="{ item }">
      {{ formatDateTime(item.TglMinta) }}
    </template>
    <template #item.TglAcc="{ item }">
      {{ formatDateTime(item.TglAcc) }}
    </template>
  </BaseBrowse>

  <v-dialog v-model="showAuthDialog" max-width="560px" persistent>
    <v-card class="rounded-lg">
      <v-card-title class="auth-dialog-head">
        <IconPackageImport :size="18" color="white" class="mr-2" />
        Otorisasi Realisasi Beda Bahan
      </v-card-title>
      <v-card-text class="pa-4">
        <div class="delphi-blue-box pa-3 rounded border">
          <div class="d-row">
            <span class="d-lbl">No. Realisasi</span>
            <input
              type="text"
              :value="authData.Nomor"
              readonly
              class="d-inp flex-1 font-weight-bold text-primary"
            />
          </div>
          <div class="d-row">
            <span class="d-lbl">No. Minta</span>
            <input
              type="text"
              :value="authData.NomorMinta"
              readonly
              class="d-inp flex-1"
            />
            <span class="d-lbl ml-3" style="width: auto">Tgl</span>
            <input
              type="text"
              :value="authData.TglRealisasi"
              readonly
              class="d-inp"
              style="width: 90px"
            />
          </div>
          <div class="d-row align-start">
            <span class="d-lbl mt-1">Nama SPK</span>
            <input
              type="text"
              :value="authData.NamaSpk"
              readonly
              class="d-inp flex-1"
            />
          </div>

          <div
            class="mt-2 mb-1 text-caption font-weight-bold text-grey-darken-2"
          >
            Detail Selisih (Diminta → Discan)
          </div>
          <v-table density="compact" class="selisih-table">
            <thead>
              <tr>
                <th class="text-caption">Kode Seharusnya</th>
                <th class="text-caption">Nama</th>
                <th class="text-caption">Kode Discan</th>
                <th class="text-caption">Nama</th>
                <th class="text-caption text-right">Jumlah</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="isLoadingDetail">
                <td colspan="5" class="text-center py-3">
                  <v-progress-circular
                    indeterminate
                    size="18"
                    color="primary"
                  />
                </td>
              </tr>
              <tr v-else-if="detailSelisih.length === 0">
                <td colspan="5" class="text-center py-3 text-grey">
                  Tidak ada baris selisih.
                </td>
              </tr>
              <tr v-for="(row, idx) in detailSelisih" :key="idx">
                <td class="text-error font-weight-bold">
                  {{ row.KodeSeharusnya }}
                </td>
                <td>{{ row.NamaSeharusnya }}</td>
                <td class="text-success font-weight-bold">
                  {{ row.KodeDiscan }}
                </td>
                <td>{{ row.NamaDiscan }}</td>
                <td class="text-right">{{ row.Jumlah }}</td>
              </tr>
            </tbody>
          </v-table>

          <div class="d-row mt-3">
            <span class="d-lbl">Peminta</span>
            <input
              type="text"
              :value="authData.Peminta"
              readonly
              class="d-inp flex-1 font-weight-bold"
            />
          </div>
          <div class="d-row mt-3 pt-2 border-t align-center">
            <span class="d-lbl font-weight-bold">Otorisasi</span>
            <v-radio-group
              v-model="authStatus"
              inline
              hide-details
              class="ma-0"
            >
              <v-radio
                label="Acc (Aktifkan & keluarkan bahan)"
                value="Y"
                color="success"
                class="mr-4 text-caption"
              />
              <v-radio
                label="Tolak"
                value="N"
                color="error"
                class="text-caption"
              />
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
          >Batal</v-btn
        >
        <v-btn
          color="primary"
          variant="elevated"
          :loading="isSubmitting"
          @click="submitOtorisasi"
          >Simpan</v-btn
        >
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
.align-start {
  align-items: flex-start !important;
}
.d-lbl {
  width: 85px;
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
  background: #ffffff !important;
  color: #263238;
  outline: none;
}
.flex-1 {
  flex: 1;
  min-width: 0;
}
.ml-3 {
  margin-left: 12px;
}
.mt-1 {
  margin-top: 4px;
}
.mt-2 {
  margin-top: 8px;
}
.mt-3 {
  margin-top: 12px;
}
.pt-2 {
  padding-top: 8px;
}
.selisih-table {
  background: #fff;
  border: 1px solid #cfd8dc;
  border-radius: 4px;
}
.selisih-table th {
  background: #f5f7fa;
}
.auth-dialog-head {
  background: #1565c0;
  color: white;
  display: flex;
  align-items: center;
  padding: 12px 16px;
  font-size: 13px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.02em;
}
:deep(table tbody tr.row-pending td) {
  color: #c62828 !important;
  font-weight: 600 !important;
}
:deep(table tbody tr.row-pending:hover td) {
  color: #c62828 !important;
}
:deep(table tbody tr.row-pending.row-selected td) {
  color: #1565c0 !important;
}
</style>
