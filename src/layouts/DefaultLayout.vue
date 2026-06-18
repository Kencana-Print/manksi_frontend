<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from "vue";
import { useRouter } from "vue-router";
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
} from "@tabler/icons-vue";

import { version as appVersion } from "../../package.json";

const theme = useTheme();
const authStore = useAuthStore();
const router = useRouter();

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

onMounted(() => {
  updateClock();
  clockInterval = setInterval(updateClock, 1000);

  const savedTheme = localStorage.getItem("manksi-theme");
  if (savedTheme) theme.global.name.value = savedTheme;
  if (canSeeNotif.value) loadNotifications();
});

onUnmounted(() => {
  if (clockInterval) clearInterval(clockInterval);
});

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
const canSeeNotif = computed(() => canSeePoAlert.value);

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

const loadNotifications = async () => {
  isLoading.value = true;
  try {
    const items: NotifItem[] = [];

    if (canSeePoAlert.value) {
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

      // ── SPK belum MKB ──
      const mkbRes = await dashboardService.getSpkBelumMkbCount();
      const mkbCount = Number(mkbRes.data.data ?? 0);
      if (mkbCount > 0) {
        items.push({
          id: "spk-belum-mkb",
          icon: IconClipboardList,
          color: "#6a1b9a",
          label: "SPK belum ada MKB",
          count: mkbCount,
          route: "/laporan/gudang-garmen/spk-belum-mkb",
        });
      }
    }

    // Tambah kategori lain di sini nanti
    notifItems.value = items;
  } catch {
    /* silent */
  } finally {
    isLoading.value = false;
  }
};

const onNotifClick = (item: NotifItem) => {
  showPopover.value = false;
  router.push(item.route);
};

const onClickOutside = () => {
  showPopover.value = false;
};
</script>

<template>
  <v-app>
    <Navbar />

    <v-main style="background-color: #f8f9fa">
      <router-view />
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

      <!-- Tengah: lonceng notifikasi -->
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
                  :style="{ background: item.color + '20', color: item.color }"
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
            <div v-else class="notif-empty">Tidak ada notifikasi saat ini</div>
          </div>

          <div class="notif-footer">
            <button class="notif-refresh" @click="loadNotifications">
              Perbarui
            </button>
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

      <div class="text-medium-emphasis">
        v{{ appVersion }} &copy; 2026 IT Kencana
      </div>

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
</style>
