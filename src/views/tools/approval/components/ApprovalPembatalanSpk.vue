<script setup lang="ts">
import { ref, watch } from "vue";
import { useToast } from "vue-toastification";
import { useAuthStore } from "@/stores/authStore";
import BaseBrowse from "@/components/BaseBrowse.vue";
import { useBrowse } from "@/composables/useBrowse";
import { approvalService } from "@/services/tools/approvalService";
import { salesOrderService } from "@/services/penjualan/salesOrderService";
import { IconBan } from "@tabler/icons-vue";

const toast = useToast();
const authStore = useAuthStore();
const menuId = "262"; // MENU_ID Approve Pembatalan SPK/SO

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

const showAuthDialog = ref(false);
const isSubmitting = ref(false);
const isDetailLoading = ref(false);
const selectedRows = ref<any[]>([]);
const authData = ref<any>({});
const detail = ref<any>(null);
const authStatus = ref("Y");

const headers = [
  { title: "No. Pengajuan", key: "Nomor", width: "150px" },
  { title: "No. SPK/SO", key: "Spk", width: "150px" },
  { title: "Nama SPK", key: "NamaSpk", minWidth: "200px" },
  { title: "Qty", key: "JmlSpk", width: "70px", align: "center" },
  { title: "Customer", key: "Customer", minWidth: "160px" },
  {
    title: "Tgl Pengajuan",
    key: "TglPengajuan",
    width: "110px",
    align: "center",
  },
  { title: "Dibuat", key: "Dibuat", width: "90px" },
  { title: "ApvUser", key: "ApvUser", width: "100px" },
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
    const res = await approvalService.getPembatalanSpkList(filterState.value);
    return res.data.data || [];
  },
  immediate: true,
});

watch(() => filterState.value.belumAccSaja, fetchData);

const isY = (v: any) => v === "Y";

const openOtorisasi = async (row: any) => {
  authData.value = row;
  authStatus.value = row.Approved === "N" ? "N" : "Y";
  detail.value = null;
  showAuthDialog.value = true;

  isDetailLoading.value = true;
  try {
    const res = await salesOrderService.getPembatalanDetail({
      fbNomor: row.Nomor,
    });
    detail.value = res.data.data;
  } catch (e: any) {
    toast.error(e.response?.data?.message || "Gagal memuat detail pengajuan.");
  } finally {
    isDetailLoading.value = false;
  }
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
    const res = await approvalService.submitPembatalanSpkOtorisasi({
      nomor: authData.value.Nomor,
      status_acc: authStatus.value,
    });
    const peminta = res.data.data?.peminta || "";
    toast.success(
      `Otorisasi berhasil disimpan.${peminta ? `\nSilahkan info ke ${peminta}.` : ""}`,
    );
    showAuthDialog.value = false;

    const targetRow = items.value?.find(
      (i: any) => i.Nomor === authData.value.Nomor,
    );
    if (targetRow) {
      targetRow.ApvUser = authStore.user?.kode || "Anda";
      const now = new Date();
      const pad = (n: number) => String(n).padStart(2, "0");
      targetRow.ApvTgl = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
    }
  } catch (error: any) {
    toast.error(error.response?.data?.message || "Gagal memproses keputusan.");
  } finally {
    isSubmitting.value = false;
  }
};

const getRowProps = (data: any) => {
  const item = data.item?.raw || data.item;
  if (!item?.ApvUser || item.ApvUser.trim() === "") {
    return { class: "row-pending" };
  }
  return {};
};
</script>

<template>
  <BaseBrowse
    title="Tools Approval"
    :menu-id="menuId"
    :icon="IconBan"
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
    @export="exportToExcel('Approval_Pembatalan_SPK')"
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

    <template #extra-actions>
      <v-btn
        v-if="canEdit"
        size="small"
        variant="flat"
        color="orange-darken-3"
        :disabled="selectedRows.length === 0"
        @click="openOtorisasiHeader(selectedRows)"
      >
        <template #prepend><IconBan :size="15" /></template>
        Otorisasi
      </v-btn>
    </template>

    <template #item.ApvUser="{ item }">
      <span
        class="font-weight-bold"
        :class="item.ApvUser ? 'text-success' : 'text-warning'"
      >
        {{ item.ApvUser || "–" }}
      </span>
    </template>
    <template #item.TglPengajuan="{ item }">
      {{ item.TglPengajuan }}
    </template>
  </BaseBrowse>

  <v-dialog v-model="showAuthDialog" max-width="680px" persistent scrollable>
    <v-card class="rounded-lg">
      <v-card-title class="auth-dialog-head">
        <IconBan :size="18" color="white" class="mr-2" />
        Otorisasi Pembatalan SPK/SO
      </v-card-title>
      <v-card-text class="pa-4" style="max-height: 70vh">
        <div v-if="isDetailLoading" class="text-center py-6 text-grey">
          Memuat detail pengajuan...
        </div>

        <div v-else class="delphi-blue-box pa-3 rounded border">
          <!-- Info dasar -->
          <div class="d-row">
            <span class="d-lbl">No. SPK/SO</span>
            <input
              type="text"
              :value="authData.Spk"
              readonly
              class="d-inp flex-1 font-weight-bold text-primary"
            />
          </div>
          <div class="d-row align-start">
            <span class="d-lbl mt-1">Nama</span>
            <input
              type="text"
              :value="authData.NamaSpk"
              readonly
              class="d-inp flex-1"
            />
          </div>
          <div class="d-row">
            <span class="d-lbl">Customer</span>
            <input
              type="text"
              :value="authData.Customer"
              readonly
              class="d-inp flex-1"
            />
            <span class="d-lbl ml-3" style="width: auto">Qty</span>
            <input
              type="text"
              :value="authData.JmlSpk"
              readonly
              class="d-inp"
              style="width: 70px; text-align: center"
            />
          </div>

          <template v-if="detail">
            <!-- Alasan Pembatalan -->
            <div class="d-section-title">Alasan Pembatalan</div>
            <div class="d-check-grid">
              <label class="d-check">
                <input
                  type="checkbox"
                  :checked="isY(detail.fb_abubah)"
                  disabled
                />
                Perubahan permintaan customer
              </label>
              <label class="d-check">
                <input
                  type="checkbox"
                  :checked="isY(detail.fb_abmap)"
                  disabled
                />
                MAP tidak disetujui customer
              </label>
              <label class="d-check">
                <input
                  type="checkbox"
                  :checked="isY(detail.fb_abbahan)"
                  disabled
                />
                Kendala bahan
              </label>
              <label class="d-check">
                <input
                  type="checkbox"
                  :checked="isY(detail.fb_abqty)"
                  disabled
                />
                Kendala kualitas
              </label>
              <label class="d-check flex-1">
                <input
                  type="checkbox"
                  :checked="isY(detail.fb_ablain)"
                  disabled
                />
                Lainnya:
                <span class="d-check-text">{{ detail.fb_ablain2 || "-" }}</span>
              </label>
            </div>
            <div class="d-row align-start mt-1">
              <span class="d-lbl mt-1">Ket. tambahan</span>
              <textarea
                readonly
                class="d-inp flex-1 d-textarea"
                rows="2"
                :value="detail.fb_abket"
              ></textarea>
            </div>

            <!-- Status Proses Produksi -->
            <div class="d-section-title mt-3">Status Proses Produksi</div>
            <div class="d-check-grid">
              <label class="d-check">
                <input
                  type="checkbox"
                  :checked="isY(detail.fb_spbelum)"
                  disabled
                />
                Belum diproses
              </label>
              <label class="d-check">
                <input
                  type="checkbox"
                  :checked="isY(detail.fb_spcuting)"
                  disabled
                />
                Cutting
              </label>
              <label class="d-check">
                <input
                  type="checkbox"
                  :checked="isY(detail.fb_spsewing)"
                  disabled
                />
                Sewing
              </label>
              <label class="d-check">
                <input
                  type="checkbox"
                  :checked="isY(detail.fb_spfinishing)"
                  disabled
                />
                Finishing
              </label>
              <label class="d-check">
                <input
                  type="checkbox"
                  :checked="isY(detail.fb_spsudah)"
                  disabled
                />
                Sudah selesai produksi
              </label>
            </div>

            <!-- Status Pembelian dan Penggunaan Bahan -->
            <div class="d-section-title mt-3">
              Status Pembelian dan Penggunaan Bahan
            </div>
            <div class="d-check-grid">
              <label class="d-check">
                <input
                  type="checkbox"
                  :checked="isY(detail.fb_sbbeli)"
                  disabled
                />
                Belum dilakukan pembelian bahan
              </label>
              <label class="d-check">
                <input
                  type="checkbox"
                  :checked="isY(detail.fb_sbdireksi)"
                  disabled
                />
                Sudah diajukan pembatalan ke Direksi
              </label>
              <label class="d-check">
                <input
                  type="checkbox"
                  :checked="isY(detail.fb_sbsup)"
                  disabled
                />
                Sudah diajukan pembatalan ke Supplier
              </label>
              <label class="d-check">
                <input
                  type="checkbox"
                  :checked="isY(detail.fb_sbsudah)"
                  disabled
                />
                Bahan sudah digunakan (sebagian/seluruhnya)
              </label>
            </div>
            <div class="d-row mt-1">
              <span class="d-lbl">Estimasi dampak</span>
              <input
                type="text"
                :value="detail.fb_dampak"
                readonly
                class="d-inp flex-1"
              />
            </div>

            <!-- Rencana Tindak Lanjut -->
            <div class="d-section-title mt-3">Rencana Tindak Lanjut</div>
            <div class="d-check-grid">
              <label class="d-check">
                <input
                  type="checkbox"
                  :checked="isY(detail.fb_rtbatal)"
                  disabled
                />
                Pembatalan penuh
              </label>
              <label class="d-check">
                <input
                  type="checkbox"
                  :checked="isY(detail.fb_rtalih)"
                  disabled
                />
                Alih order
              </label>
              <label class="d-check">
                <input
                  type="checkbox"
                  :checked="isY(detail.fb_rtsisa)"
                  disabled
                />
                Penyelesaian sisa bahan
              </label>
              <label class="d-check flex-1">
                <input
                  type="checkbox"
                  :checked="isY(detail.fb_rtlain)"
                  disabled
                />
                Lainnya:
                <span class="d-check-text">{{ detail.fb_rtlain2 || "-" }}</span>
              </label>
            </div>

            <!-- Info pengajuan -->
            <div class="d-row mt-3 pt-2 border-t">
              <span class="d-lbl">Dibuat</span>
              <input
                type="text"
                :value="`${detail.fb_user_create} / ${formatDateTime(detail.Created)}`"
                readonly
                class="d-inp flex-1"
              />
            </div>
          </template>

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
          :disabled="isDetailLoading"
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
.d-textarea {
  height: auto;
  padding: 6px;
  resize: vertical;
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
.mt-3 {
  margin-top: 12px;
}
.pt-2 {
  padding-top: 8px;
}
.d-section-title {
  font-size: 10.5px;
  font-weight: 700;
  color: #1565c0;
  text-transform: uppercase;
  letter-spacing: 0.02em;
  margin-bottom: 4px;
  border-bottom: 1px solid #cfd8dc;
  padding-bottom: 2px;
}
.d-check-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 16px;
  margin-bottom: 4px;
}
.d-check {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 11px;
  color: #37474f;
}
.d-check input {
  accent-color: #1565c0;
  cursor: default;
}
.d-check-text {
  font-weight: 600;
  color: #1565c0;
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
