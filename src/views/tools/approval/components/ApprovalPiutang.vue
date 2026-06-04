<script setup lang="ts">
import { ref, watch, computed } from "vue";
import { useToast } from "vue-toastification";
import { useAuthStore } from "@/stores/authStore";
import BaseBrowse from "@/components/BaseBrowse.vue";
import { useBrowse } from "@/composables/useBrowse";
import { approvalService } from "@/services/tools/approvalService";
import { IconShieldCheck, IconAlertTriangle } from "@tabler/icons-vue";

const toast = useToast();
const authStore = useAuthStore();
const menuId = "256";

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

const expanded = ref<string[]>([]);
const loadingDetails = ref(new Set<string>());
const detailPengajuan = ref<Record<string, any[]>>({});
const detailInvoice = ref<Record<string, any[]>>({});

const showAuthDialog = ref(false);
const authData = ref<any>({}); // Menyimpan master row (Customer)
const formAuth = ref({ spk: "" }); // Menyimpan pilihan SPK
const authStatus = ref("Y");
const isSubmitting = ref(false);
const selectedRows = ref<any[]>([]);

const headers = [
  { title: "Kode Customer", key: "Kode", width: "160px" },
  { title: "Nama Customer", key: "Nama", minWidth: "250px" },
  { title: "Alamat", key: "Alamat", minWidth: "300px" },
  { title: "Status", key: "Status", width: "110px", align: "center" },
];

const { items, isLoading, canEdit, fetchData, exportToExcel } = useBrowse({
  menuId,
  fetchApi: async () => {
    const res = await approvalService.getPiutangMaster(filterState.value);
    return res.data.data || [];
  },
  immediate: true,
});

watch(() => filterState.value.belumAccSaja, fetchData);

const loadDetailData = async (kode: string, status: string) => {
  loadingDetails.value.add(kode);
  try {
    const [resPengajuan, resInvoice] = await Promise.all([
      approvalService.getPiutangPengajuan(kode, filterState.value),
      approvalService.getPiutangInvoice(kode, status, filterState.value),
    ]);
    detailPengajuan.value = {
      ...detailPengajuan.value,
      [kode]: resPengajuan.data.data,
    };
    detailInvoice.value = {
      ...detailInvoice.value,
      [kode]: resInvoice.data.data,
    };
  } catch {
    toast.error("Gagal memuat detail data pengajuan.");
  } finally {
    loadingDetails.value.delete(kode);
  }
};

const handleExpanded = (newExpanded: any[]) => {
  expanded.value = newExpanded;
  for (const val of newExpanded) {
    const kode = typeof val === "object" && val !== null ? val.Kode : val;
    if (kode && !detailPengajuan.value[kode]) {
      const item = items.value?.find((i: any) => i.Kode === kode);
      if (item) loadDetailData(kode, item.Status);
    }
  }
};

const onRowClick = (item: any) => {
  // BaseBrowse sudah handle selected otomatis
  // Di sini hanya handle expand/collapse
  const kode = item.Kode;
  const newExpanded = [...expanded.value];
  const index = newExpanded.indexOf(kode);
  if (index === -1) newExpanded.push(kode);
  else newExpanded.splice(index, 1);
  handleExpanded(newExpanded);
};

// --- LOGIKA MODAL OTORISASI DARI HEADER ---

// Mendapatkan daftar SPK yang masih pending untuk customer yang dipilih
const pendingOptions = computed(() => {
  if (!authData.value?.Kode) return [];
  const list = detailPengajuan.value[authData.value.Kode] || [];
  return list.filter(
    (d: any) => (!d.Acc || d.Acc.trim() === "") && d.StatusPakai !== "Sudah",
  );
});

// Mencari nama peminta berdasarkan SPK yang dipilih di dropdown modal
const currentPeminta = computed(() => {
  const spkData = pendingOptions.value.find(
    (p: any) => p.SPK === formAuth.value.spk,
  );
  return spkData ? spkData.Peminta : "-";
});

const openOtorisasiRow = (row: any, masterItem: any) => {
  if (row.StatusPakai === "Sudah") {
    toast.warning("PIN tersebut sudah dipakai marketing.");
    return;
  }
  authData.value = masterItem; // master (customer)
  formAuth.value.spk = row.SPK;
  authStatus.value = row.Acc === "N" ? "N" : "Y";
  showAuthDialog.value = true;
};

// Dari tombol header (pilih dari dropdown jika ada banyak pending)
const openOtorisasiHeader = async (selected: any[]) => {
  // Prioritas: selected row → customer yang terakhir di-expand
  const item =
    selected.length > 0
      ? selected[0]
      : expanded.value.length > 0
        ? (items.value?.find(
            (i: any) => i.Kode === expanded.value[expanded.value.length - 1],
          ) ?? null)
        : null;

  if (!item) {
    toast.warning("Expand atau pilih customer terlebih dahulu.");
    return;
  }

  if (!detailPengajuan.value[item.Kode]) {
    await loadDetailData(item.Kode, item.Status);
  }

  authData.value = item;

  if (pendingOptions.value.length === 0) {
    toast.warning(
      "Tidak ada pengajuan SPK yang butuh otorisasi untuk customer ini.",
    );
    return;
  }

  formAuth.value.spk = pendingOptions.value[0].SPK;
  authStatus.value = "Y";
  showAuthDialog.value = true;
};

const submitOtorisasi = async () => {
  isSubmitting.value = true;
  try {
    const res = await approvalService.submitPiutangOtorisasi({
      spk_nomor: formAuth.value.spk,
      status_acc: authStatus.value,
    });
    const peminta = res.data.peminta || "";
    toast.success(
      `Otorisasi berhasil disimpan.${peminta ? `\nSilahkan info ke ${peminta}.` : ""}`,
    );
    showAuthDialog.value = false;

    // --- LOKAL MUTASI ---
    // Update data lokal agar tidak menghilang meskipun filter "Belum Acc Saja" menyala
    const parentKode = authData.value.Kode;
    const targetDetail = detailPengajuan.value[parentKode]?.find(
      (d: any) => d.SPK === formAuth.value.spk,
    );

    if (targetDetail) {
      targetDetail.Acc = authStatus.value;
      targetDetail.Otorisasi = authStore.user?.kode || "Anda";

      const now = new Date();
      const pad = (n: number) => String(n).padStart(2, "0");
      targetDetail.TglAcc = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
    }
  } catch (error: any) {
    toast.error(error.response?.data?.message || "Gagal menyimpan otorisasi.");
  } finally {
    isSubmitting.value = false;
  }
};

const fmtNum = (val: number) => new Intl.NumberFormat("id-ID").format(val || 0);
</script>

<template>
  <BaseBrowse
    title="Tools Approval"
    :menu-id="menuId"
    :icon="IconShieldCheck"
    :headers="headers"
    :items="items ?? []"
    item-value="Kode"
    :is-loading="isLoading"
    v-model:filterState="filterState"
    show-expand
    :expanded="expanded"
    @update:expanded="handleExpanded"
    can-export
    v-model:selected="selectedRows"
    @refresh="fetchData"
    @row-click="onRowClick"
    @export="exportToExcel('Approval_Piutang_90Hari')"
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
        :disabled="selectedRows.length === 0 && expanded.length === 0"
        @click="openOtorisasiHeader(selectedRows)"
      >
        <template #prepend><IconShieldCheck :size="15" /></template>
        Otorisasi
      </v-btn>
    </template>

    <template #detail="{ item }">
      <div class="detail-wrap">
        <div v-if="loadingDetails.has(item.Kode)" class="detail-loading">
          <v-progress-circular indeterminate color="primary" size="28" />
          <span class="ml-2 text-caption text-grey">Memuat data...</span>
        </div>

        <div v-else class="detail-panels">
          <div class="detail-panel panel-left">
            <div class="panel-head panel-head--blue">
              <IconShieldCheck :size="14" class="mr-1" />
              Riwayat Pengajuan ACC — {{ item.Nama }}
              <span class="panel-badge">
                {{ detailPengajuan[item.Kode]?.length || 0 }} data
              </span>
            </div>
            <div class="panel-body">
              <table class="dtl-table">
                <thead>
                  <tr>
                    <th v-if="canEdit" style="width: 80px">Aksi</th>
                    <th style="width: 145px">SPK</th>
                    <th style="width: 45px" class="tc">Div</th>
                    <th style="width: 130px">Tgl Minta</th>
                    <th>Peminta</th>
                    <th style="width: 130px">Tgl Acc</th>
                    <th>Otorisasi</th>
                    <th style="width: 50px" class="tc">Acc</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="d in detailPengajuan[item.Kode]" :key="d.SPK">
                    <td v-if="canEdit" class="tc">
                      <button
                        v-if="!d.Acc || d.Acc.trim() === ''"
                        class="btn-otorisasi"
                        @click.stop="openOtorisasiRow(d, item)"
                      >
                        Otorisasi
                      </button>
                      <span
                        v-else
                        class="acc-done"
                        :class="d.Acc === 'Y' ? 'acc-y' : 'acc-n'"
                      >
                        {{ d.Acc === "Y" ? "✓ ACC" : "✗ TOLAK" }}
                      </span>
                    </td>
                    <td class="spk-cell">{{ d.SPK }}</td>
                    <td class="tc">{{ d.Divisi }}</td>
                    <td>{{ d.TglMinta }}</td>
                    <td>{{ d.Peminta }}</td>
                    <td>{{ d.TglAcc }}</td>
                    <td>{{ d.Otorisasi }}</td>
                    <td
                      class="tc fw"
                      :class="
                        d.Acc === 'Y'
                          ? 'acc-y'
                          : d.Acc === 'N'
                            ? 'acc-n'
                            : 'acc-pending'
                      "
                    >
                      {{ d.Acc || "–" }}
                    </td>
                  </tr>
                  <tr v-if="!detailPengajuan[item.Kode]?.length">
                    <td colspan="7" class="empty-row">
                      Tidak ada riwayat pengajuan.
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div class="detail-panel panel-right">
            <div class="panel-head panel-head--red">
              <IconAlertTriangle :size="14" class="mr-1" />
              Invoice Menunggak &gt; 90 Hari
              <span class="panel-badge panel-badge--red">
                {{ detailInvoice[item.Kode]?.length || 0 }} inv
              </span>
            </div>
            <div class="panel-body">
              <table class="dtl-table">
                <thead>
                  <tr>
                    <th style="width: 30px" class="tc">No.</th>
                    <th style="width: 135px">Invoice</th>
                    <th style="width: 85px" class="tc">Tanggal</th>
                    <th style="width: 75px" class="tc">Tempo</th>
                    <th class="tr">Debet</th>
                    <th class="tr">Kredit</th>
                    <th class="tr">Saldo</th>
                    <th style="width: 50px" class="tc">Umur</th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="(inv, index) in detailInvoice[item.Kode]"
                    :key="inv.Invoice"
                  >
                    <td class="tc">{{ index + 1 }}</td>
                    <td class="fw">{{ inv.Invoice }}</td>
                    <td class="tc">{{ inv.Tanggal }}</td>
                    <td class="tc">{{ inv.Tempo }}</td>
                    <td class="tr">{{ fmtNum(inv.Debet) }}</td>
                    <td class="tr">{{ fmtNum(inv.Kredit) }}</td>
                    <td class="tr fw saldo-cell">{{ fmtNum(inv.Saldo) }}</td>
                    <td class="tc fw umur-cell">{{ inv.Umur }}</td>
                  </tr>
                  <tr v-if="!detailInvoice[item.Kode]?.length">
                    <td colspan="8" class="empty-row">
                      Tidak ada invoice menunggak.
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </template>
  </BaseBrowse>

  <v-dialog v-model="showAuthDialog" max-width="450px" persistent>
    <v-card class="rounded-lg">
      <v-card-title class="auth-dialog-head">
        <IconShieldCheck :size="18" color="white" class="mr-2" />
        Otorisasi SPK
      </v-card-title>

      <v-card-text class="pa-4">
        <div class="auth-info-box">
          <div class="auth-info-row mb-2">
            <span class="auth-info-label">Customer</span>
            <span class="auth-info-value fw text-uppercase">{{
              authData.Nama
            }}</span>
          </div>

          <div class="auth-info-row mb-2" v-if="pendingOptions.length > 1">
            <span class="auth-info-label">Pilih SPK</span>
            <v-select
              v-model="formAuth.spk"
              :items="pendingOptions"
              item-title="SPK"
              item-value="SPK"
              density="compact"
              variant="outlined"
              hide-details
              class="flex-grow-1"
            />
          </div>
          <div class="auth-info-row mb-2" v-else>
            <span class="auth-info-label">SPK</span>
            <span class="auth-info-value text-primary fw">{{
              formAuth.spk
            }}</span>
          </div>

          <div class="auth-info-row">
            <span class="auth-info-label">Peminta</span>
            <span class="auth-info-value">{{ currentPeminta }}</span>
          </div>
        </div>

        <div class="auth-decision-label">Keputusan:</div>
        <v-radio-group v-model="authStatus" inline hide-details class="mt-1">
          <v-radio
            label="ACC (Setujui)"
            value="Y"
            color="success"
            class="mr-4"
          />
          <v-radio label="TOLAK" value="N" color="error" />
        </v-radio-group>
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
/* ── Filter ── */
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

/* ── Detail wrapper ── */
.detail-wrap {
  padding: 10px 12px 12px;
  background: #f0f4f8;
  border-top: 2px solid #e3e8ef;
}
.detail-loading {
  display: flex;
  align-items: center;
  padding: 16px;
  color: #888;
}
.ml-2 {
  margin-left: 8px;
}

.detail-panels {
  display: flex;
  gap: 12px;
  align-items: flex-start;
}

/* ── Panels ── */
.detail-panel {
  background: white;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid #dde3ea;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
}
.panel-left {
  flex: 1;
  min-width: 0;
}
.panel-right {
  width: 680px;
  flex-shrink: 0;
}

.panel-head {
  display: flex;
  align-items: center;
  padding: 7px 12px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.02em;
  gap: 2px;
}
.panel-head--blue {
  background: #1565c0;
  color: white;
}
.panel-head--red {
  background: #c62828;
  color: white;
}
.panel-badge {
  margin-left: auto;
  background: rgba(255, 255, 255, 0.22);
  padding: 1px 8px;
  border-radius: 10px;
  font-size: 10px;
  font-weight: 700;
}
.panel-badge--red {
  background: rgba(255, 255, 255, 0.22);
}
.panel-body {
  overflow-x: auto;
}

/* ── Detail Table ── */
.dtl-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 11px;
}
.dtl-table thead th {
  background: #eceff1;
  color: #37474f;
  padding: 5px 8px;
  text-align: left;
  font-weight: 700;
  border-bottom: 1px solid #cfd8dc;
  border-right: 1px solid #dde3ea;
  white-space: nowrap;
}
.dtl-table thead th:last-child {
  border-right: none;
}
.dtl-table tbody td {
  padding: 4px 8px;
  border-bottom: 1px solid #f0f0f0;
  border-right: 1px solid #f0f0f0;
  vertical-align: middle;
}
.dtl-table tbody td:last-child {
  border-right: none;
}
.dtl-table tbody tr:hover td {
  background: #f5f9ff;
}

/* ── Cell helpers ── */
.tc {
  text-align: center !important;
}
.tr {
  text-align: right !important;
}
.fw {
  font-weight: 700;
}
.spk-cell {
  color: #1565c0;
  font-weight: 700;
  font-family: monospace;
  font-size: 11px;
}
.saldo-cell {
  color: #c62828;
}
.umur-cell {
  color: #e65100;
}
.acc-y {
  color: #2e7d32;
}
.acc-n {
  color: #c62828;
}
.acc-pending {
  color: #f57f17;
}
.empty-row {
  text-align: center;
  color: #9e9e9e;
  padding: 14px;
  font-style: italic;
}

/* ── Dialog ── */
.auth-dialog-head {
  background: #1565c0;
  color: white;
  display: flex;
  align-items: center;
  padding: 12px 16px;
  font-size: 14px;
  font-weight: 700;
}
.auth-info-box {
  background: #f5f7fa;
  border: 1px solid #e0e7ef;
  border-radius: 6px;
  padding: 10px 14px;
  margin-bottom: 14px;
}
.auth-info-row {
  display: flex;
  align-items: center;
  font-size: 12px;
}
.auth-info-label {
  width: 80px;
  font-weight: 700;
  color: #555;
  flex-shrink: 0;
}
.auth-info-value {
  color: #222;
}
.auth-decision-label {
  font-size: 11px;
  font-weight: 700;
  color: #444;
  margin-bottom: 2px;
}

.acc-done {
  font-size: 10px;
  font-weight: 700;
  padding: 1px 6px;
  border-radius: 3px;
}
.acc-y {
  color: #2e7d32;
}
.acc-n {
  color: #c62828;
}

.btn-otorisasi {
  background: #e65100;
  color: white;
  border: none;
  border-radius: 4px;
  padding: 2px 8px;
  font-size: 10px;
  font-weight: 700;
  cursor: pointer;
  white-space: nowrap;
  transition: background 0.15s;
}
.btn-otorisasi:hover {
  background: #bf360c;
}

.acc-done {
  font-size: 10px;
  font-weight: 700;
  padding: 1px 6px;
  border-radius: 3px;
}
</style>
