<script setup lang="ts">
import {
  ref,
  computed,
  watch,
  onMounted,
  onUnmounted,
  type Component,
} from "vue";
import { useRoute, useRouter } from "vue-router";
import { useTheme } from "vuetify";
import { useAuthStore } from "@/stores/authStore";
import { dashboardService } from "@/services/dashboard/dashboardService";
import Navbar from "@/components/Navbar.vue";
import {
  IconUserCircle,
  IconMoon,
  IconSun,
  IconBell,
  IconPackage,
  IconClipboardList,
  IconClock,
  IconCreditCard,
  IconCurrencyDollar,
  IconShieldCheck,
  IconFileInvoice,
  IconHistory,
  IconTrash,
  IconCoin,
  IconBan,
  IconReplace,
  IconArrowsExchange,
  IconPrinter,
  IconFileOff,
  IconScale,
} from "@tabler/icons-vue";

import { useVersionCheck } from "@/composables/useVersionCheck";
import ChangelogDialog from "@/components/ChangelogDialog.vue";
import TabBar from "@/components/TabBar.vue";
import TabView from "@/components/TabView.vue";
import AgendaKerjaModal from "@/components/AgendaKerjaModal.vue";
import { agendaKerjaService } from "@/services/tools/agendaKerjaService";
import { IconCalendarEvent } from "@tabler/icons-vue";

const {
  buildVersion,
  changelog,
  isLoaded: isChangelogLoaded,
  updateAvailable,
  hasUnseenChangelog,
  markChangelogSeen,
  dismissUpdate,
  reloadApp,
} = useVersionCheck();

const showChangelog = ref(false);
const hadPendingUpdate = ref(false);

const openUpdateDialog = () => {
  updateAvailable.value = false;
  hadPendingUpdate.value = true;
  showChangelog.value = true;
};

const openChangelog = () => {
  hadPendingUpdate.value = false;
  showChangelog.value = true;
  markChangelogSeen();
};

// ⚠️ baru: dipanggil dari tombol "Nanti Saja" di dialog
const onDismissUpdate = () => {
  dismissUpdate();
  showChangelog.value = false;
};

const theme = useTheme();
const authStore = useAuthStore();
const router = useRouter();
const route = useRoute();

const toggleTheme = () => {
  theme.global.name.value = theme.global.current.value.dark ? "light" : "dark";
  localStorage.setItem("manksi-theme", theme.global.name.value);
};

// ── Jam real-time ──
const currentTime = ref("");
let clockInterval: ReturnType<typeof setInterval> | null = null;

const updateClock = () => {
  currentTime.value = new Date().toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
};

let notifTimer: ReturnType<typeof setInterval> | null = null;

onMounted(() => {
  updateClock();
  clockInterval = setInterval(updateClock, 1000);

  const savedTheme = localStorage.getItem("manksi-theme");
  if (savedTheme) theme.global.name.value = savedTheme;
  if (canSeeNotif.value) {
    loadNotifications();
    notifTimer = setInterval(() => loadNotifications(true), 120_000);
  }
  loadAgendaBadge();
});

onUnmounted(() => {
  if (clockInterval) clearInterval(clockInterval);
  if (notifTimer) clearInterval(notifTimer);
});

// Selesai approve lalu pindah dari halaman Approval → segarkan bulatan.
watch(
  () => route.path,
  (_sekarang, sebelum) => {
    if (sebelum === "/tools/approval" && canSeeNotif.value) {
      loadNotifications(true);
    }
  },
);

// ── Role ──
const bagian = computed(() =>
  (authStore.user?.bagian || "").toUpperCase().trim(),
);
const isSuperViewer = computed(() =>
  ["EDP", "DIREKSI", "OWNER", "IT"].includes(bagian.value),
);
const canSeePoAlert = computed(
  () =>
    ["PEMBELIAN", "GUDANG", "PPIC"].includes(bagian.value) ||
    isSuperViewer.value,
);
const canSeeNotif = computed(
  () => canSeePoAlert.value || authStore.canSeeApproval,
);

// ── Notifikasi state ──
interface NotifItem {
  id: string;
  icon: any;
  color: string;
  label: string;
  count: number;
  route: string;
}

const notifItems = ref<NotifItem[]>([]);
const isLoading = ref(false);
const showPopover = ref(false);

const totalCount = computed(() =>
  notifItems.value.reduce((s, n) => s + n.count, 0),
);

const APPROVAL_META: Record<
  string,
  { label: string; icon: Component; color: string }
> = {
  piutang_90: {
    label: "SO Piutang >90 Hari",
    icon: IconCreditCard,
    color: "#e65100",
  },
  harga_nol: {
    label: "SO Harga 0",
    icon: IconCurrencyDollar,
    color: "#c62828",
  },
  prioritas: {
    label: "SO Klien Prioritas",
    icon: IconShieldCheck,
    color: "#2e7d32",
  },
  perubahan_data: {
    label: "Perubahan Data",
    icon: IconHistory,
    color: "#6a1b9a",
  },
  invoice_blmsj: {
    label: "Invoice Belum SJ",
    icon: IconFileInvoice,
    color: "#1565c0",
  },
  hapus_data: { label: "Hapus Data", icon: IconTrash, color: "#c62828" },
  pembatalan_spk: { label: "Pembatalan SO", icon: IconBan, color: "#ad1457" },
  plafon_manager: {
    label: "Plafon Customer (Manager)",
    icon: IconCoin,
    color: "#f57f17",
  },
  plafon_direksi: {
    label: "Plafon Customer (Direksi)",
    icon: IconCoin,
    color: "#ef6c00",
  },
  ganti_qty_kain: {
    label: "Ganti Qty & Jenis Kain",
    icon: IconReplace,
    color: "#00838f",
  },
  mutasi_noplan: {
    label: "Mutasi Produksi Tanpa Planning",
    icon: IconArrowsExchange,
    color: "#4527a0",
  },
  spk_cetak_ulang: {
    label: "Cetak SPK > 1 Kali",
    icon: IconPrinter,
    color: "#37474f",
  },
  nopo: { label: "SO/MAP Tanpa Nomor PO", icon: IconFileOff, color: "#bf360c" },
  realisasi_beda_bahan: {
    label: "Realisasi Beda Bahan",
    icon: IconScale,
    color: "#558b2f",
  },
};

// silent = refresh latar belakang (tanpa tanda "..." di lonceng).
const loadNotifications = async (silent = false) => {
  if (!silent) isLoading.value = true;
  const items: NotifItem[] = [];

  // Alert PO/MKB dibungkus sendiri supaya kegagalannya tidak ikut
  // menggagalkan hitungan approval.
  if (canSeePoAlert.value) {
    try {
      const res = await dashboardService.getPoBahanSisa();
      const sisa = Number(res.data.data?.PoAdaSisa ?? 0);
      if (sisa > 0) {
        items.push({
          id: "po-sisa",
          icon: IconPackage,
          color: "#e65100",
          label: "PO ada sisa MKB",
          count: sisa,
          route: "/laporan/gudang-garmen/po-bahan-vs-mkb",
        });
      }

      const mkbRes = await dashboardService.getSpkBelumMkbCount();
      const mkbCount = Number(mkbRes.data.data ?? 0);
      if (mkbCount > 0) {
        items.push({
          id: "spk-belum-mkb",
          icon: IconClipboardList,
          color: "#6a1b9a",
          label: "SO belum ada MKB",
          count: mkbCount,
          route: "/laporan/gudang-garmen/spk-belum-mkb",
        });
      }
    } catch {
      /* silent */
    }
  }

  // Backend hanya mengembalikan jenis yang user berhak melihatnya.
  if (authStore.canSeeApproval) {
    try {
      const apvRes = await dashboardService.getApprovalPendingCount();
      const apv = (apvRes.data.data || {}) as Record<string, number>;
      let total = 0;
      for (const [id, meta] of Object.entries(APPROVAL_META)) {
        const count = Number(apv[id] ?? 0);
        if (count <= 0) continue;
        total += count;
        items.push({
          id: `apv-${id}`,
          icon: meta.icon,
          color: meta.color,
          label: meta.label,
          count,
          route: "/tools/approval",
        });
      }
      authStore.setApprovalPendingTotal(total);
    } catch {
      /* silent: pertahankan angka sebelumnya */
    }
  } else {
    authStore.setApprovalPendingTotal(0);
  }

  notifItems.value = items;
  isLoading.value = false;
};

const onNotifClick = (item: NotifItem) => {
  showPopover.value = false;
  // id notif approval = "apv-<id jenis>", sama dengan ?type= di ToolsApprovalView
  if (item.id.startsWith("apv-")) {
    router.push({ path: "/tools/approval", query: { type: item.id.slice(4) } });
    return;
  }
  router.push(item.route);
};

const onClickOutside = () => {
  showPopover.value = false;
};

const agendaBadgeCount = ref(0);
const showAgendaModal = ref(false);

const loadAgendaBadge = async () => {
  try {
    const res = await agendaKerjaService.getBadgeCount();
    agendaBadgeCount.value = res.data.data?.count || 0;
  } catch {
    /* silent */
  }
};
</script>

<template>
  <v-app>
    <Navbar />

    <v-main
      style="background-color: #f8f9fa; display: flex; flex-direction: column"
    >
      <TabBar />
      <TabView />
    </v-main>

    <!-- ── Footer — style TIDAK diubah dari versi asli ── -->
    <v-footer
      app
      class="pa-2"
      style="font-size: 11px; border-top: 1px solid #e0e0e0; height: 32px"
    >
      <!-- Kiri: info user -->
      <div class="d-flex align-center">
        <IconUserCircle
          :size="14"
          :stroke-width="1.5"
          class="mr-2"
          style="opacity: 0.6"
        />
        <strong>{{ authStore.userName }}</strong>
        <span class="mx-2 text-disabled">|</span>
        <span>{{ authStore.userCabang }} - {{ authStore.user?.bagian }}</span>
      </div>

      <v-spacer />

      <div class="d-flex align-center" style="gap: 6px">
        <!-- Agenda Kerja -->
        <div class="notif-wrap">
          <button
            class="notif-bell"
            :class="{ 'has-notif': agendaBadgeCount > 0 }"
            @click="showAgendaModal = true"
            title="Agenda Kerja"
          >
            <IconCalendarEvent :size="15" :stroke-width="1.7" />
            <span v-if="agendaBadgeCount > 0" class="notif-badge">
              {{ agendaBadgeCount > 99 ? "99+" : agendaBadgeCount }}
            </span>
          </button>
        </div>

        <!-- Notifikasi (existing) -->
        <div
          v-if="canSeeNotif"
          class="notif-wrap"
          v-click-outside="onClickOutside"
        >
          <button
            class="notif-bell"
            :class="{ 'has-notif': totalCount > 0 }"
            @click="showPopover = !showPopover"
            title="Notifikasi"
          >
            <IconBell :size="15" :stroke-width="1.7" />
            <span v-if="isLoading" class="notif-badge loading">...</span>
            <span v-else-if="totalCount > 0" class="notif-badge">
              {{ totalCount > 99 ? "99+" : totalCount }}
            </span>
          </button>

          <!-- Popover — muncul ke ATAS karena di footer bawah -->
          <div v-if="showPopover" class="notif-popover">
            <div class="notif-header">
              <span class="notif-title">Pemberitahuan</span>
              <span v-if="totalCount > 0" class="notif-total-badge">
                {{ totalCount }} Pending
              </span>
            </div>

            <div class="notif-body">
              <template v-if="notifItems.length">
                <button
                  v-for="item in notifItems"
                  :key="item.id"
                  class="notif-item"
                  @click="onNotifClick(item)"
                >
                  <div
                    class="notif-item-icon"
                    :style="{
                      background: item.color + '20',
                      color: item.color,
                    }"
                  >
                    <component :is="item.icon" :size="16" :stroke-width="1.6" />
                  </div>
                  <span class="notif-item-label">{{ item.label }}</span>
                  <span
                    class="notif-item-count"
                    :style="{ background: item.color }"
                    >{{ item.count }}</span
                  >
                </button>
              </template>
              <div v-else class="notif-empty">
                Tidak ada notifikasi saat ini
              </div>
            </div>

            <div class="notif-footer">
              <button class="notif-refresh" @click="loadNotifications()">
                Perbarui
              </button>
            </div>
          </div>
        </div>
      </div>

      <v-spacer />

      <!-- Kanan: toggle theme + versi + jam -->
      <v-btn
        icon
        variant="text"
        size="x-small"
        class="mr-3"
        @click="toggleTheme"
      >
        <IconMoon
          v-if="theme.global.current.value.dark"
          :size="16"
          :stroke-width="1.5"
        />
        <IconSun v-else :size="16" :stroke-width="1.5" />
      </v-btn>

      <button class="version-btn" @click="openChangelog">
        <span class="version-dot" v-if="hasUnseenChangelog" />
        v{{ buildVersion }} &copy; 2026 IT Kencana
      </button>

      <span class="mx-2 text-disabled">|</span>

      <div
        class="d-flex align-center"
        style="
          gap: 4px;
          font-size: 11px;
          font-weight: 600;
          color: #1565c0;
          font-variant-numeric: tabular-nums;
        "
      >
        <IconClock :size="13" :stroke-width="1.7" style="opacity: 0.8" />
        {{ currentTime }}
      </div>
    </v-footer>

    <ChangelogDialog
      v-model="showChangelog"
      :entries="changelog"
      :is-loaded="isChangelogLoaded"
      :show-reload-prompt="hadPendingUpdate"
      @reload="reloadApp"
      @dismiss="onDismissUpdate"
    />

    <AgendaKerjaModal v-model="showAgendaModal" @updated="loadAgendaBadge" />

    <!-- Snackbar: muncul otomatis kalau backend punya versi lebih baru
     dari bundle JS yang sedang jalan — deteksi real-time via polling,
     tidak perlu user refresh duluan untuk tahu. -->
    <v-snackbar
      v-model="updateAvailable"
      :timeout="-1"
      location="bottom"
      color="primary"
      style="margin-bottom: 40px"
    >
      <div class="d-flex align-center">
        <v-icon size="18" class="mr-2">mdi-cloud-download-outline</v-icon>
        Versi baru MANKSI tersedia.
      </div>
      <template #actions>
        <v-btn variant="text" color="white" @click="openUpdateDialog">
          Lihat Perubahan
        </v-btn>
      </template>
    </v-snackbar>
  </v-app>
</template>

<style scoped>
/* ── Wrapper lonceng ── */
.notif-wrap {
  position: relative;
  display: inline-flex;
  align-items: center;
}

/* ── Tombol lonceng ── */
.notif-bell {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  border: none;
  background: transparent;
  border-radius: 50%;
  cursor: pointer;
  color: rgba(var(--v-theme-on-surface), 0.55);
  transition:
    background 0.15s,
    color 0.15s;
}
.notif-bell:hover {
  background: rgba(var(--v-theme-primary), 0.08);
}
.notif-bell.has-notif {
  color: #e65100;
  animation: bell-shake 2s ease-in-out infinite;
  transform-origin: top center;
}

@keyframes bell-shake {
  0% {
    transform: rotate(0deg);
  }
  10% {
    transform: rotate(15deg);
  }
  20% {
    transform: rotate(-12deg);
  }
  30% {
    transform: rotate(10deg);
  }
  40% {
    transform: rotate(-8deg);
  }
  50% {
    transform: rotate(5deg);
  }
  60% {
    transform: rotate(-3deg);
  }
  70% {
    transform: rotate(2deg);
  }
  80% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(0deg);
  }
}

/* ── Badge merah ── */
.notif-badge {
  position: absolute;
  top: -2px;
  right: -4px;
  min-width: 16px;
  height: 16px;
  background: #e53935;
  color: white;
  border-radius: 8px;
  font-size: 9px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 3px;
  line-height: 1;
  border: 1.5px solid white;
}
.notif-badge.loading {
  font-size: 8px;
  background: #9e9e9e;
}

/* ── Popover — ke atas ── */
.notif-popover {
  position: fixed; /* fixed supaya tidak terpengaruh overflow parent */
  bottom: 36px; /* tepat di atas footer (height 32px + sedikit gap) */
  left: 50%;
  transform: translateX(-50%);
  width: 260px;
  background: rgb(var(--v-theme-surface));
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 10px;
  box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.14);
  overflow: hidden;
  z-index: 9999;
}

.notif-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px 8px;
  border-bottom: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}
.notif-title {
  font-size: 12px;
  font-weight: 700;
  color: rgb(var(--v-theme-on-surface));
}
.notif-total-badge {
  font-size: 10px;
  font-weight: 700;
  background: #e53935;
  color: white;
  padding: 2px 8px;
  border-radius: 10px;
}

.notif-body {
  padding: 6px 0;
  max-height: 240px;
  overflow-y: auto;
}

.notif-item {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 14px;
  background: transparent;
  border: none;
  cursor: pointer;
  text-align: left;
  transition: background 0.12s;
}
.notif-item:hover {
  background: rgba(var(--v-theme-on-surface), 0.05);
}
.notif-item-icon {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.notif-item-label {
  flex: 1;
  font-size: 12px;
  color: rgb(var(--v-theme-on-surface));
  line-height: 1.3;
}
.notif-item-count {
  min-width: 24px;
  height: 24px;
  border-radius: 12px;
  color: white;
  font-size: 11px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 6px;
  flex-shrink: 0;
}

.notif-empty {
  padding: 16px 14px;
  font-size: 11px;
  color: rgba(var(--v-theme-on-surface), 0.4);
  text-align: center;
}

.notif-footer {
  border-top: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  padding: 6px 14px;
  display: flex;
  justify-content: flex-end;
}
.notif-refresh {
  font-size: 11px;
  color: rgb(var(--v-theme-primary));
  background: none;
  border: none;
  cursor: pointer;
  padding: 2px 0;
}
.notif-refresh:hover {
  text-decoration: underline;
}
.notif-section-title {
  font-size: 9px;
  font-weight: 700;
  color: rgba(var(--v-theme-on-surface), 0.4);
  letter-spacing: 0.08em;
  padding: 4px 14px 2px;
}
.notif-badge {
  font-size: 10px;
  font-weight: 700;
  color: white;
  padding: 1px 6px;
  border-radius: 8px;
  min-width: 20px;
  text-align: center;
}

.version-btn {
  position: relative;
  background: none;
  border: none;
  cursor: pointer;
  font-size: 11px;
  color: rgba(var(--v-theme-on-surface), 0.6);
  padding: 2px 4px;
  border-radius: 4px;
  transition: background 0.15s;
}
.version-btn:hover {
  background: rgba(var(--v-theme-primary), 0.08);
  color: rgb(var(--v-theme-primary));
}
.version-dot {
  position: absolute;
  top: -1px;
  right: -1px;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #e53935;
}
</style>
