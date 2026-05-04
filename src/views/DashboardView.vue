<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useAuthStore } from "@/stores/authStore";

const authStore = useAuthStore();
const isSpkDialogVisible = ref(false);

onMounted(() => {
  if (
    authStore.spkUrgent &&
    authStore.spkUrgent.length > 0 &&
    !sessionStorage.getItem("hasSeenSpk")
  ) {
    isSpkDialogVisible.value = true;
  }
});

const closeSpkDialog = () => {
  isSpkDialogVisible.value = false;
  sessionStorage.setItem("hasSeenSpk", "true");
};

// ── Helper functions untuk status dateline ──
const parseDate = (dateStr: string): Date | null => {
  if (!dateStr) return null;
  const parts = dateStr.split("-").map(Number);
  // Coba format DD-MM-YYYY dulu, fallback ke YYYY-MM-DD
  if (parts[2] > 1000) {
    // format YYYY-MM-DD
    return new Date(parts[0], parts[1] - 1, parts[2]);
  }
  // format DD-MM-YYYY
  return new Date(parts[2], parts[1] - 1, parts[0]);
};

const isOverdue = (dateline: string): boolean => {
  const dl = parseDate(dateline);
  if (!dl) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return dl < today;
};

const isToday = (dateline: string): boolean => {
  const dl = parseDate(dateline);
  if (!dl) return false;
  const today = new Date();
  return dl.toDateString() === today.toDateString();
};

const sisa = (item: any): number => (item.QtyOrder ?? 0) - (item.QtyJadi ?? 0);

const sisaClass = (item: any): string => {
  const s = sisa(item);
  if (s > 0) return "val-danger";
  if (s === 0) return "val-done";
  return "val-warn";
};
</script>

<template>
  <div class="app-layout">
    <Navbar />

    <v-main class="bg-grey-lighten-4">
      <v-container fluid class="pa-3">
        <div
          class="manksi-panel header-panel mb-3 d-flex justify-space-between align-center"
        >
          <div>
            <div
              class="text-primary font-weight-bold"
              style="font-size: 13px; margin-bottom: 2px"
            >
              DASHBOARD MANKSI
            </div>
            <div class="text-grey-darken-2">
              Selamat datang kembali,
              <strong>{{ authStore.userName }}</strong> ({{
                authStore.userCabang
              }})
            </div>
          </div>
          <div class="text-right text-grey-darken-2">
            <div>
              Divisi:
              <strong class="text-black">{{
                authStore.user?.bagian || "-"
              }}</strong>
            </div>
            <div>
              Gudang Jadi:
              <strong class="text-black">{{
                authStore.gudangJadi?.nama || "-"
              }}</strong>
            </div>
          </div>
        </div>

        <v-row dense>
          <v-col cols="12" md="8">
            <div class="manksi-panel content-panel fill-height">
              <div class="panel-header bg-grey-lighten-3 text-primary">
                <v-icon size="14" class="mr-1">mdi-bulletin-board</v-icon>
                Papan Informasi
              </div>
              <div class="panel-body pa-3">
                <p>Belum ada informasi terbaru hari ini.</p>
              </div>
            </div>
          </v-col>

          <v-col cols="12" md="4">
            <div class="manksi-panel content-panel fill-height">
              <div
                class="panel-header bg-error-lighten-5 text-error border-error-bottom"
              >
                <v-icon size="14" class="mr-1">mdi-clock-alert-outline</v-icon>
                Ringkasan SPK Urgent
              </div>
              <div class="panel-body pa-3">
                <div
                  v-if="authStore.spkUrgent && authStore.spkUrgent.length > 0"
                >
                  <v-alert
                    density="compact"
                    type="error"
                    variant="tonal"
                    class="mb-0 py-1"
                  >
                    Ada
                    <strong>{{ authStore.spkUrgent.length }} SPK</strong> yang
                    akan/sudah Dateline!
                  </v-alert>
                </div>
                <div v-else class="text-center text-grey py-3">
                  Aman, tidak ada SPK urgent.
                </div>
              </div>
            </div>
          </v-col>
        </v-row>
      </v-container>
    </v-main>

    <!-- ── Dialog SPK Urgent ── -->
    <v-dialog
      v-model="isSpkDialogVisible"
      persistent
      max-width="1150px"
      :max-height="'90vh'"
    >
      <v-card class="spk-dialog-card" rounded="lg">
        <!-- Header -->
        <div class="spk-header">
          <div class="spk-header-left">
            <div class="spk-header-icon">
              <v-icon size="18" color="white">mdi-clock-alert</v-icon>
            </div>
            <div>
              <div class="spk-header-title">SPK Akan / Sudah Dateline</div>
              <div class="spk-header-sub">
                {{ authStore.spkUrgent?.length }} SPK membutuhkan perhatian
                segera
              </div>
            </div>
          </div>
          <v-btn
            icon
            variant="text"
            size="small"
            color="white"
            @click="closeSpkDialog"
          >
            <v-icon>mdi-close</v-icon>
          </v-btn>
        </div>

        <!-- Tabel — tidak ada scroll horizontal, semua kolom muat -->
        <div class="spk-table-wrap">
          <table class="spk-table">
            <thead>
              <tr>
                <th class="col-spk">SPK</th>
                <th class="col-nama">Nama Pekerjaan</th>
                <th class="col-customer">Customer</th>
                <th class="col-tgl">Tanggal</th>
                <th class="col-dl">Dateline</th>
                <th class="col-num">Qty Order</th>
                <th class="col-num">Qty Jadi</th>
                <th class="col-num">Sisa</th>
                <th class="col-divisi">Divisi</th>
                <th class="col-cab">Cab</th>
                <th class="col-ws">Workshop</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="(item, index) in authStore.spkUrgent"
                :key="index"
                :class="{
                  'row-overdue': isOverdue(item.Dateline),
                  'row-today': isToday(item.Dateline),
                }"
              >
                <td class="col-spk">
                  <span class="spk-badge">{{ item.Spk }}</span>
                </td>
                <td class="col-nama">{{ item.Nama }}</td>
                <td class="col-customer">{{ item.Customer || "—" }}</td>
                <td class="col-tgl">{{ item.Tanggal }}</td>
                <td class="col-dl">
                  <span
                    class="dl-badge"
                    :class="{
                      overdue: isOverdue(item.Dateline),
                      today: isToday(item.Dateline),
                    }"
                  >
                    {{ item.Dateline }}
                  </span>
                </td>
                <td class="col-num">{{ item.QtyOrder }}</td>
                <td class="col-num">{{ item.QtyJadi }}</td>
                <td class="col-num">
                  <span :class="sisaClass(item)">{{ sisa(item) }}</span>
                </td>
                <td class="col-divisi">{{ item.Divisi || "—" }}</td>
                <td class="col-cab">{{ item.Cab || "—" }}</td>
                <td class="col-ws">{{ item.Workshop || "—" }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Footer -->
        <div class="spk-footer">
          <div class="spk-legend">
            <span class="legend-dot overdue" />
            <span>Sudah lewat dateline</span>
            <span class="legend-dot today" style="margin-left: 12px" />
            <span>Dateline hari ini</span>
          </div>
          <v-btn
            color="primary"
            variant="flat"
            size="small"
            @click="closeSpkDialog"
          >
            Mengerti, Tutup
          </v-btn>
        </div>
      </v-card>
    </v-dialog>
  </div>
</template>

<style scoped>
.app-layout {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}
.v-main {
  min-height: calc(100vh - 64px);
}

/* ── Panel Dashboard ── */
.manksi-panel {
  background-color: #ffffff;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
  overflow: hidden;
}
.header-panel {
  padding: 10px 14px;
  border-left: 4px solid #1867c0;
}
.content-panel {
  display: flex;
  flex-direction: column;
}
.panel-header {
  padding: 6px 12px;
  font-weight: 600;
  border-bottom: 1px solid #e0e0e0;
  display: flex;
  align-items: center;
  font-size: 12px;
}
.border-error-bottom {
  border-bottom: 1px solid #ffcdd2;
}
.panel-body {
  flex-grow: 1;
}

/* ── Dialog Card ── */
.spk-dialog-card {
  display: flex;
  flex-direction: column;
  max-height: 88vh;
  overflow: hidden;
}

/* ── Dialog Header ── */
.spk-header {
  background: linear-gradient(135deg, #c62828 0%, #e53935 100%);
  padding: 12px 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-shrink: 0;
}
.spk-header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}
.spk-header-icon {
  width: 36px;
  height: 36px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.spk-header-title {
  font-size: 14px;
  font-weight: 700;
  color: white;
  line-height: 1.3;
}
.spk-header-sub {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.8);
  margin-top: 1px;
}

/* ── Tabel ── */
.spk-table-wrap {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden; /* tidak ada scroll horizontal */
}

.spk-table {
  width: 100%;
  border-collapse: collapse;
  table-layout: fixed; /* KUNCI: lebar kolom dikontrol, tidak auto-expand */
}

.spk-table thead tr {
  background: #f5f5f5;
  position: sticky;
  top: 0;
  z-index: 1;
}

.spk-table th {
  padding: 8px 10px;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: #424242;
  border-bottom: 2px solid #e0e0e0;
  white-space: nowrap;
  text-align: left;
}
.spk-table th.col-num {
  text-align: right;
}

.spk-table td {
  padding: 6px 10px;
  font-size: 12px;
  color: #212121;
  border-bottom: 1px solid #f0f0f0;
  /* overflow hidden + ellipsis agar teks panjang tidak jebol kolom */
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.spk-table td.col-num {
  text-align: right;
}

/* Lebar kolom — total harus <= 960px */
.col-spk {
  width: 130px;
}
.col-nama {
  width: auto;
} /* sisanya untuk nama */
.col-customer {
  width: 110px;
}
.col-tgl {
  width: 95px;
}
.col-dl {
  width: 100px;
}
.col-num {
  width: 80px;
}
.col-divisi {
  width: 70px;
}
.col-cab {
  width: 60px;
}
.col-ws {
  width: 110px;
}

/* Row states */
.row-overdue td {
  background-color: #fff5f5;
}
.row-today td {
  background-color: #fffde7;
}
.spk-table tbody tr:hover td {
  background-color: #e8f4fd !important;
}

/* SPK badge */
.spk-badge {
  font-family: monospace;
  font-size: 11px;
  font-weight: 600;
  color: #1565c0;
}

/* Dateline badge */
.dl-badge {
  display: inline-block;
  padding: 2px 7px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 600;
  background: #f5f5f5;
  color: #424242;
}
.dl-badge.overdue {
  background: #ffebee;
  color: #c62828;
}
.dl-badge.today {
  background: #fff8e1;
  color: #f57f17;
}

/* ── Footer ── */
.spk-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 16px;
  background: #fafafa;
  border-top: 1px solid #e0e0e0;
  flex-shrink: 0;
}
.spk-legend {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  color: #757575;
}
.legend-dot {
  display: inline-block;
  width: 10px;
  height: 10px;
  border-radius: 50%;
}
.legend-dot.overdue {
  background: #ef9a9a;
}
.legend-dot.today {
  background: #ffe082;
}

/* Sisa qty classes */
.val-danger {
  color: #c62828;
  font-weight: 700;
}
.val-done {
  color: #2e7d32;
}
.val-warn {
  color: #f57f17;
  font-weight: 600;
}
</style>
