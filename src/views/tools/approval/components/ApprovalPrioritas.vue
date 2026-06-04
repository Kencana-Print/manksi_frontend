<script setup lang="ts">
import { ref, watch } from "vue";
import { useToast } from "vue-toastification";
import { useAuthStore } from "@/stores/authStore";
import BaseBrowse from "@/components/BaseBrowse.vue";
import { useBrowse } from "@/composables/useBrowse";
import { approvalService } from "@/services/tools/approvalService";
import { IconShieldCheck } from "@tabler/icons-vue";

const toast = useToast();
const authStore = useAuthStore();
const menuId = "258"; // MENU_ID SPK Prioritas

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
const selectedRows = ref<any[]>([]);

const authData = ref<any>({}); // Data row dari grid
const authStatus = ref("Y");

// Sesuai dengan kolom di Delphi
const headers = [
  { title: "Nomor", key: "Nomor", width: "160px" },
  { title: "NamaSPK", key: "NamaSPK", minWidth: "250px" },
  { title: "Divisi", key: "Divisi", width: "70px", align: "center" },
  { title: "TglMinta", key: "TglMinta", width: "140px", align: "center" },
  { title: "Peminta", key: "Peminta", width: "100px" },
  { title: "TglAcc", key: "TglAcc", width: "140px", align: "center" },
  { title: "Otorisasi", key: "Otorisasi", width: "100px" },
  { title: "Acc", key: "Acc", width: "60px", align: "center" },
  { title: "Kdcus", key: "KdCus", width: "90px", align: "center" },
  { title: "Customer", key: "Customer", minWidth: "220px" },
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
    const res = await approvalService.getPrioritasList(filterState.value);
    return res.data.data || [];
  },
  immediate: true,
});

watch(() => filterState.value.belumAccSaja, fetchData);

const openOtorisasi = (row: any) => {
  authData.value = row;
  authStatus.value = row.Acc === "N" ? "N" : "Y";
  showAuthDialog.value = true;
};

const openOtorisasiHeader = (selected: any[]) => {
  if (selected.length === 0) {
    toast.warning("Silahkan pilih baris SPK terlebih dahulu.");
    return;
  }
  openOtorisasi(selected[0]);
};

const submitOtorisasi = async () => {
  isSubmitting.value = true;
  try {
    const res = await approvalService.submitPrioritasOtorisasi({
      spk_nomor: authData.value.Nomor,
      status_acc: authStatus.value,
    });

    const peminta = res.data.data?.peminta || "";
    toast.success(
      `Otorisasi berhasil disimpan.${peminta ? `\nSilahkan info ke ${peminta}.` : ""}`,
    );
    showAuthDialog.value = false;

    // MUTASI LOKAL: Update array data table di layar
    const targetRow = items.value?.find(
      (i: any) => i.Nomor === authData.value.Nomor,
    );
    if (targetRow) {
      targetRow.Acc = authStatus.value;
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

const getRowProps = () => ({});
</script>

<template>
  <BaseBrowse
    title="Tools Approval"
    :menu-id="menuId"
    :icon="IconShieldCheck"
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
    @export="exportToExcel('Approval_SPK_Prioritas')"
  >
    <!-- ── Filter Kiri ── -->
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

    <!-- ── Tombol Otorisasi di Header Atas ── -->
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

    <!-- ── Custom Render Column ── -->
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

  <!-- ── Dialog Otorisasi Berkas Prioritas ── -->
  <v-dialog v-model="showAuthDialog" max-width="480px" persistent>
    <v-card class="rounded-lg">
      <v-card-title class="auth-dialog-head">
        <IconShieldCheck :size="18" color="white" class="mr-2" />
        Otorisasi SPK Klien Prioritas
      </v-card-title>

      <v-card-text class="pa-4">
        <div class="d-flex flex-column gap-y-2">
          <!-- Kotak Form Blue-Grey -->
          <div class="delphi-blue-box pa-3 rounded border">
            <div class="d-row">
              <span class="d-lbl">Nomor</span>
              <input
                type="text"
                :value="authData.Nomor"
                readonly
                class="d-inp flex-1 font-weight-bold text-primary"
              />
            </div>

            <div class="d-row">
              <span class="d-lbl">Nama SPK</span>
              <input
                type="text"
                :value="authData.NamaSPK"
                readonly
                class="d-inp flex-1"
              />
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

            <!-- Radio Button Otorisasi Bagian Bawah -->
            <div class="d-row mt-3 pt-2 border-t align-center">
              <span class="d-lbl font-weight-bold">Otorisasi</span>
              <v-radio-group
                v-model="authStatus"
                inline
                hide-details
                class="ma-0"
              >
                <v-radio
                  label="Acc"
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

/* ── Form Style Struktur Box Delphi ── */
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
.gap-y-2 {
  row-gap: 8px;
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
</style>
