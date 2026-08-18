<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from "vue";
import { useAuthStore } from "@/stores/authStore";
import logoSrc from "@/assets/logo.png";

import { usePasswordDialog } from "@/composables/usePasswordDialog";
import ChangePasswordDialog from "@/components/dialogs/ChangePasswordDialog.vue";

import {
  IconShield,
  IconSpeakerphone,
  IconBuildingWarehouse,
  IconTie,
  IconChevronDown,
  IconMenu2,
  IconLogout,
  IconLock,
} from "@tabler/icons-vue";
import { createMenuItems, type NavItem } from "@/config/menuItems";

const authStore = useAuthStore();

const scrolled = ref(false);
const drawer = ref(false);
const drawerExpanded = ref<string[]>([]);
const openedGroups = ref<string[]>([]);
const availableNavWidth = ref(9999);
const showDesktopNav = computed(() => availableNavWidth.value >= 1200);

const toolsMenu = ref(false);
const daftarMenu = ref(false);
const pembelianMenu = ref(false);
const ppicMenu = ref(false);
const garmenMenu = ref(false);
const penjualanMenu = ref(false);
const piutangMenu = ref(false);
const laporanMenu = ref(false);

const isScrolled = computed(() => scrolled.value);
const appBarElevation = computed(() => (scrolled.value ? 2 : 0));
const hasSpkNotif = computed(() => authStore.spkUrgent?.length > 0);

const userRoleConfig = computed(() => {
  const name = authStore.userName?.toUpperCase() || "";
  const bagian = authStore.user?.bagian?.toUpperCase() || "";
  if (name.includes("ADMIN") || name === "DEVELOPER")
    return { icon: IconShield, color: "red-darken-2" };
  if (bagian === "MARKETING")
    return { icon: IconSpeakerphone, color: "orange-darken-3" };
  if (bagian.includes("GUDANG"))
    return { icon: IconBuildingWarehouse, color: "teal-darken-1" };
  return { icon: IconTie, color: "indigo-darken-2" };
});

const isAdmin = computed(() => {
  const kode = authStore.user?.kode?.toUpperCase() || "";
  return kode === "ADMIN" || kode === "DEVELOPER";
});

const hasAccess = (item: NavItem): boolean => {
  if (item.adminOnly && !isAdmin.value) return false; // Cek admin
  if (item.menuId && !authStore.can(item.menuId.toString(), "view"))
    return false;
  if (item.subItems?.length) return item.subItems.some((s) => hasAccess(s));
  if (item.items?.length) return item.items.some((c) => hasAccess(c));
  return true;
};

// Filter item sesuai akses, lalu bersihkan divider yang jadi yatim:
// di awal/akhir list, atau nempel berturut-turut karena item
// di antaranya ke-filter habis (gak ada akses).
const visibleItems = (items: NavItem[] = []): NavItem[] => {
  const filtered = items.filter((x) => x.divider || hasAccess(x));

  const result: NavItem[] = [];
  for (const item of filtered) {
    if (item.divider) {
      // Skip kalau ini divider pertama, atau item sebelumnya juga divider
      if (result.length === 0 || result[result.length - 1].divider) continue;
      result.push(item);
    } else {
      result.push(item);
    }
  }
  // Skip kalau divider ada di posisi paling akhir
  if (result.length > 0 && result[result.length - 1].divider) {
    result.pop();
  }
  return result;
};

const openMenu = (targetModel: { value: boolean }) => {
  menuItems.forEach((m) => {
    if (m.model && m.model !== targetModel) m.model.value = false;
  });
  targetModel.value = true;
};

const menuItems: NavItem[] = createMenuItems();

const closeMenus = () => {
  menuItems.forEach((m) => {
    if (m.model) m.model.value = false;
  });
  openedGroups.value = [];
  drawer.value = false;
};

const handleLogout = async () => {
  sessionStorage.removeItem("hasSeenSpk");
  closeMenus();
  await authStore.logout();
};

const { openPasswordDialog } = usePasswordDialog();

const openPasswordDialogHandler = () => {
  closeMenus();
  openPasswordDialog(); // Membuka modal kustom global
};

const handleScroll = () => {
  scrolled.value = window.scrollY > 10;
};

let resizeObserver: ResizeObserver | null = null;

onMounted(() => {
  window.addEventListener("scroll", handleScroll);
  resizeObserver = new ResizeObserver((entries) => {
    for (const e of entries) availableNavWidth.value = e.contentRect.width;
  });
  const toolbar = document.querySelector(".v-toolbar__content");
  if (toolbar) resizeObserver.observe(toolbar);
  availableNavWidth.value = window.innerWidth;
});

onUnmounted(() => {
  window.removeEventListener("scroll", handleScroll);
  resizeObserver?.disconnect();
});
</script>

<template>
  <!-- ── APP BAR ── -->
  <v-app-bar
    flat
    height="60"
    :elevation="appBarElevation"
    fixed
    :class="['desktop-navbar', { 'navbar-scrolled': isScrolled }]"
  >
    <v-app-bar-nav-icon
      v-if="!showDesktopNav"
      class="ml-1"
      @click="drawer = !drawer"
      color="primary"
      size="small"
    >
      <IconMenu2 :size="20" :stroke-width="1.5" />
    </v-app-bar-nav-icon>

    <RouterLink to="/" class="logo-section">
      <img :src="logoSrc" alt="Logo" class="brand-logo" />
    </RouterLink>

    <v-spacer />

    <!-- Desktop Nav -->
    <nav v-if="showDesktopNav" class="main-nav">
      <template
        v-for="menu in menuItems.filter((m) => hasAccess(m))"
        :key="menu.title"
      >
        <v-menu
          v-if="menu.model"
          v-model="menu.model.value"
          :close-on-content-click="false"
          transition="fade-transition"
          location="bottom center"
          origin="top center"
          @update:modelValue="
            (val) => {
              if (val) openMenu(menu.model!);
            }
          "
        >
          <template #activator="{ props }">
            <v-badge
              color="error"
              dot
              :model-value="
                (menu.title === 'Garmen' && hasSpkNotif) ||
                (menu.title === 'Tools' &&
                  authStore.canSeeApproval &&
                  authStore.approvalPendingTotal > 0)
              "
              offset-x="10"
              offset-y="10"
            >
              <button v-bind="props" class="nav-btn">
                <component
                  :is="menu.icon"
                  :size="15"
                  :stroke-width="1.6"
                  class="nav-btn-icon"
                />
                <span>{{ menu.title }}</span>
                <IconChevronDown
                  :size="12"
                  :stroke-width="2.2"
                  class="nav-btn-chev"
                  :style="{
                    transform: menu.model.value ? 'rotate(180deg)' : '',
                  }"
                />
              </button>
            </v-badge>
          </template>

          <v-card class="nav-dropdown" elevation="6">
            <v-list
              class="nav-list"
              density="comfortable"
              :opened="openedGroups"
              @update:opened="openedGroups = $event.slice(-1)"
            >
              <template v-for="(item, i) in visibleItems(menu.items)" :key="i">
                <v-divider v-if="item.divider" class="nav-divider" />

                <!-- Folder dengan subItems -->
                <v-list-group
                  v-else-if="'subItems' in item"
                  :value="item.title"
                >
                  <template #activator="{ props, isOpen }">
                    <v-list-item v-bind="props" class="nav-item">
                      <template #prepend>
                        <component
                          :is="item.icon"
                          :size="15"
                          :stroke-width="1.5"
                          class="ic mr-2"
                        />
                      </template>
                      <v-list-item-title class="nav-item-title">{{
                        item.title
                      }}</v-list-item-title>
                      <template #append>
                        <IconChevronDown
                          :size="13"
                          :stroke-width="2"
                          :style="{
                            transform: isOpen ? 'rotate(180deg)' : '',
                            transition: 'transform 0.2s',
                          }"
                        />
                      </template>
                    </v-list-item>
                  </template>
                  <template
                    v-for="(sub, si) in visibleItems(item.subItems)"
                    :key="si"
                  >
                    <v-divider v-if="sub.divider" class="my-1 mx-2" />
                    <v-list-item
                      v-else
                      :to="sub.to"
                      class="nav-item nested"
                      @click="closeMenus"
                    >
                      <template #prepend>
                        <component
                          :is="sub.icon"
                          :size="13"
                          :stroke-width="1.5"
                          class="ic mr-2"
                        />
                      </template>
                      <v-list-item-title class="nav-item-title">{{
                        sub.title
                      }}</v-list-item-title>
                    </v-list-item>
                  </template>
                </v-list-group>

                <!-- Item biasa -->
                <v-list-item
                  v-else
                  :to="item.to"
                  class="nav-item"
                  @click="item.onClick ? item.onClick() : closeMenus()"
                >
                  <template #prepend>
                    <component
                      :is="item.icon"
                      :size="15"
                      :stroke-width="1.5"
                      class="ic mr-2"
                    />
                  </template>
                  <v-list-item-title class="nav-item-title">{{
                    item.title
                  }}</v-list-item-title>
                  <template #append>
                    <span
                      v-if="
                        item.to === '/tools/approval' &&
                        authStore.canSeeApproval &&
                        authStore.approvalPendingTotal > 0
                      "
                      class="approval-count-badge"
                    >
                      {{
                        authStore.approvalPendingTotal > 99
                          ? "99+"
                          : authStore.approvalPendingTotal
                      }}
                    </span>
                  </template>
                </v-list-item>
              </template>
            </v-list>
          </v-card>
        </v-menu>
      </template>
    </nav>

    <v-spacer />

    <!-- User Menu -->
    <v-menu location="bottom end" transition="fade-transition">
      <template #activator="{ props }">
        <button v-bind="props" class="user-btn">
          <v-avatar :color="userRoleConfig.color" size="27">
            <component
              :is="userRoleConfig.icon"
              :size="15"
              :stroke-width="1.6"
              color="white"
            />
          </v-avatar>
          <span class="user-name">{{ authStore.userName }}</span>
          <IconChevronDown :size="12" :stroke-width="2.2" class="user-chev" />
        </button>
      </template>

      <v-card class="user-dropdown" elevation="6">
        <v-list class="user-list">
          <div class="user-profile">
            <v-avatar :color="userRoleConfig.color" size="32" class="mr-3">
              <component
                :is="userRoleConfig.icon"
                :size="17"
                :stroke-width="1.5"
                color="white"
              />
            </v-avatar>
            <div>
              <div class="up-name">{{ authStore.userName }}</div>
              <div class="up-sub">
                {{ authStore.userCabang }} ·
                {{ authStore.user?.bagian || "STAFF" }}
              </div>
            </div>
          </div>
          <v-divider class="my-1" />
          <v-list-item class="drw-item" @click="openPasswordDialogHandler">
            <template #prepend>
              <IconLock :size="15" :stroke-width="1.5" class="ic mr-2" />
            </template>
            <v-list-item-title class="nav-item-title"
              >Ganti Password</v-list-item-title
            >
          </v-list-item>
          <v-divider class="my-1" />
          <v-list-item
            class="um-item"
            style="color: #dc2626"
            @click="handleLogout"
          >
            <template #prepend>
              <IconLogout
                :size="15"
                :stroke-width="1.5"
                style="color: #dc2626"
                class="mr-2"
              />
            </template>
            <v-list-item-title class="nav-item-title">Logout</v-list-item-title>
          </v-list-item>
        </v-list>
      </v-card>
    </v-menu>
  </v-app-bar>

  <!-- ── MOBILE DRAWER ── -->
  <v-navigation-drawer v-model="drawer" temporary location="left" width="272">
    <div class="drw-header">
      <v-avatar :color="userRoleConfig.color" size="34">
        <component
          :is="userRoleConfig.icon"
          :size="18"
          :stroke-width="1.5"
          color="white"
        />
      </v-avatar>
      <div class="ml-3">
        <div class="drw-name">{{ authStore.userName }}</div>
        <div class="drw-sub">
          {{ authStore.userCabang }} · {{ authStore.user?.bagian || "STAFF" }}
        </div>
      </div>
    </div>
    <v-divider />

    <v-list density="compact" v-model:opened="drawerExpanded">
      <template
        v-for="menu in menuItems.filter((m) => hasAccess(m))"
        :key="menu.title"
      >
        <v-list-group :value="menu.title" v-if="menu.items?.length">
          <template #activator="{ props, isOpen }">
            <v-list-item v-bind="props" class="drw-item">
              <template #prepend>
                <component
                  :is="menu.icon"
                  :size="17"
                  :stroke-width="1.5"
                  class="ic mr-2"
                />
              </template>
              <v-list-item-title>{{ menu.title }}</v-list-item-title>
              <template #append>
                <IconChevronDown
                  :size="13"
                  :stroke-width="2"
                  :style="{
                    transform: isOpen ? 'rotate(180deg)' : '',
                    transition: 'transform 0.2s',
                  }"
                />
              </template>
            </v-list-item>
          </template>

          <template v-for="(item, i) in visibleItems(menu.items)" :key="i">
            <v-divider v-if="item.divider" class="mx-3 my-1" />
            <v-list-group :value="item.title" v-else-if="'subItems' in item">
              <template #activator="{ props, isOpen }">
                <v-list-item v-bind="props" class="drw-sub">
                  <template #prepend>
                    <component
                      :is="item.icon"
                      :size="15"
                      :stroke-width="1.5"
                      class="ic mr-2"
                    />
                  </template>
                  <v-list-item-title>{{ item.title }}</v-list-item-title>
                  <template #append>
                    <IconChevronDown
                      :size="12"
                      :stroke-width="2"
                      :style="{
                        transform: isOpen ? 'rotate(180deg)' : '',
                        transition: 'transform 0.2s',
                      }"
                    />
                  </template>
                </v-list-item>
              </template>
              <template
                v-for="(sub, si) in visibleItems(item.subItems)"
                :key="si"
              >
                <v-divider v-if="sub.divider" class="mx-3 my-1" />
                <v-list-item
                  v-else
                  :to="sub.to"
                  class="drw-subsub"
                  @click="closeMenus"
                >
                  <template #prepend>
                    <component
                      :is="sub.icon"
                      :size="13"
                      :stroke-width="1.5"
                      class="ic mr-2"
                    />
                  </template>
                  <v-list-item-title>{{ sub.title }}</v-list-item-title>
                </v-list-item>
              </template>
            </v-list-group>
            <v-list-item
              v-else
              :to="item.to"
              class="drw-sub"
              @click="item.onClick ? item.onClick() : closeMenus()"
            >
              <template #prepend>
                <component
                  :is="item.icon"
                  :size="15"
                  :stroke-width="1.5"
                  class="ic mr-2"
                />
              </template>
              <v-list-item-title>{{ item.title }}</v-list-item-title>
            </v-list-item>
          </template>
        </v-list-group>
      </template>
    </v-list>

    <template #append>
      <v-divider />
      <div class="drw-footer">
        <v-list density="compact">
          <v-list-item class="drw-item" @click="openPasswordDialog">
            <template #prepend
              ><IconLock :size="16" :stroke-width="1.5" class="ic mr-2"
            /></template>
            <v-list-item-title>Ganti Password</v-list-item-title>
          </v-list-item>
          <v-list-item
            class="drw-item"
            style="color: #dc2626"
            @click="handleLogout"
          >
            <template #prepend
              ><IconLogout
                :size="16"
                :stroke-width="1.5"
                style="color: #dc2626"
                class="mr-2"
            /></template>
            <v-list-item-title>Logout</v-list-item-title>
          </v-list-item>
        </v-list>
      </div>
    </template>
  </v-navigation-drawer>

  <ChangePasswordDialog />
</template>

<style scoped>
/* ── App Bar ── */
.desktop-navbar {
  border-bottom: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  background-color: rgba(var(--v-theme-surface), 0.94) !important;
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  transition: all 0.2s ease;
}
.navbar-scrolled {
  background-color: rgba(var(--v-theme-surface), 0.99) !important;
  box-shadow: 0 1px 10px rgba(0, 0, 0, 0.07) !important;
}

/* ── Logo ── */
.logo-section {
  display: flex;
  align-items: center;
  text-decoration: none;
  padding: 4px 8px;
  border-radius: 6px;
  margin-right: 4px;
  flex-shrink: 0;
  transition: background 0.15s;
}
.logo-section:hover {
  background: rgba(var(--v-theme-primary), 0.05);
}
.brand-logo {
  height: 34px;
  width: auto;
  object-fit: contain;
}

/* ── Nav ── */
.main-nav {
  display: flex;
  align-items: center;
  flex: 1 1 auto;
  overflow: hidden;
  min-width: 0;
  justify-content: center;
}

.nav-btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  height: 34px;
  padding: 0 7px;
  border: none;
  background: transparent;
  border-radius: 7px;
  cursor: pointer;
  font-size: 0.78rem;
  font-weight: 600;
  color: rgb(var(--v-theme-on-surface));
  font-family: inherit;
  transition:
    background 0.15s,
    color 0.15s;
  white-space: nowrap;
  flex-shrink: 0;
}
.nav-btn:hover {
  background: rgba(var(--v-theme-primary), 0.08);
  color: rgb(var(--v-theme-primary));
}
.nav-btn-icon {
  opacity: 0.65;
}
.nav-btn-chev {
  opacity: 0.45;
  transition: transform 0.2s;
  flex-shrink: 0;
}

/* ── Dropdown ── */
.nav-dropdown {
  border-radius: 10px;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  background: rgba(var(--v-theme-surface), 0.98) !important;
  backdrop-filter: blur(16px);
  min-width: 205px;
}
.nav-list {
  padding: 4px;
  max-height: calc(100vh - 80px);
  overflow-y: auto;
}
.nav-list::-webkit-scrollbar {
  width: 4px;
}
.nav-list::-webkit-scrollbar-thumb {
  background: rgba(0, 0, 0, 0.12);
  border-radius: 3px;
}

.nav-item {
  min-height: 32px !important;
  border-radius: 6px;
  margin: 1px 0;
}
.nav-item.nested {
  padding-left: 26px !important;
}
.nav-item-title {
  font-size: 0.82rem !important;
}
.nav-divider {
  margin: 3px 0;
}

/* icons */
.ic {
  color: rgba(var(--v-theme-on-surface), 0.5);
  flex-shrink: 0;
}

/* ── User Button ── */
.user-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 34px;
  padding: 0 9px;
  border: none;
  background: transparent;
  border-radius: 20px;
  cursor: pointer;
  font-family: inherit;
  transition: background 0.15s;
  flex-shrink: 0;
}
.user-btn:hover {
  background: rgba(var(--v-theme-primary), 0.07);
}
.user-name {
  font-size: 0.84rem;
  font-weight: 500;
  color: rgb(var(--v-theme-on-surface));
  max-width: clamp(80px, 15vw, 200px);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.user-chev {
  color: rgba(var(--v-theme-on-surface), 0.4);
}

/* ── User Dropdown ── */
.user-dropdown {
  min-width: 205px;
  border-radius: 10px;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}
.user-list {
  padding: 5px;
}
.user-profile {
  display: flex;
  align-items: center;
  padding: 9px 10px;
  border-radius: 8px;
  background: rgba(var(--v-theme-primary), 0.05);
  margin-bottom: 2px;
}
.up-name {
  font-size: 0.84rem;
  font-weight: 700;
  line-height: 1.2;
}
.up-sub {
  font-size: 0.73rem;
  color: rgba(var(--v-theme-on-surface), 0.5);
}
.um-item {
  min-height: 33px !important;
  border-radius: 6px;
}

/* ── Drawer ── */
.drw-header {
  display: flex;
  align-items: center;
  padding: 14px 16px;
  background: rgba(var(--v-theme-primary), 0.04);
  min-height: 62px;
}
.drw-name {
  font-size: 0.87rem;
  font-weight: 700;
  line-height: 1.2;
}
.drw-sub {
  font-size: 0.73rem;
  color: rgba(var(--v-theme-on-surface), 0.5);
}
.drw-item {
  min-height: 38px !important;
  border-radius: 6px;
  font-size: 0.875rem;
}
.drw-sub {
  min-height: 35px !important;
  border-radius: 6px;
  font-size: 0.85rem;
}
.drw-subsub {
  min-height: 32px !important;
  border-radius: 6px;
  font-size: 0.82rem;
}
.drw-footer {
  padding: 4px 0 8px;
}

.ml-3 {
  margin-left: 12px;
}

:deep(.v-toolbar__content) {
  gap: 0;
  padding: 0 8px;
}

.mr-2 {
  margin-right: 8px;
}

:deep(.v-list-group__header .v-list-item__append .v-icon) {
  display: none;
}

/* Matikan semua indent calculation Vuetify */
:deep(.v-navigation-drawer .v-list-group) {
  --prepend-width: 0px;
  --list-indent-size: 0px;
}

/* Force padding semua item */
:deep(.v-navigation-drawer .v-list-item.v-list-item--nav) {
  padding-inline-start: 8px !important;
}

/* Level 2 */
:deep(.v-navigation-drawer .v-list-group__items .v-list-item--nav) {
  padding-inline-start: 14px !important;
}

/* Level 3 */
:deep(
  .v-navigation-drawer
    .v-list-group__items
    .v-list-group__items
    .v-list-item--nav
) {
  padding-inline-start: 22px !important;
}

/* Hapus spacer Vuetify yang bikin indent */
:deep(.v-navigation-drawer .v-list-item__prepend > .v-list-item__spacer),
:deep(.v-navigation-drawer .v-list-item__append > .v-list-item__spacer) {
  display: none !important;
  width: 0 !important;
  min-width: 0 !important;
  flex: none !important;
}

/* Padding ulang karena spacer sudah dihapus */
:deep(.v-navigation-drawer .v-list-item) {
  padding-inline-start: 12px !important;
  padding-left: 12px !important;
}
:deep(.v-navigation-drawer .v-list-group__items > .v-list-item),
:deep(
  .v-navigation-drawer
    .v-list-group__items
    > .v-list-group
    > .v-list-group__header
) {
  padding-inline-start: 16px !important;
  padding-left: 16px !important;
}
:deep(
  .v-navigation-drawer .v-list-group__items .v-list-group__items > .v-list-item
) {
  padding-inline-start: 24px !important;
  padding-left: 24px !important;
}
.approval-count-badge {
  font-size: 10px;
  font-weight: 700;
  background: #e53935;
  color: white;
  padding: 1px 6px;
  border-radius: 8px;
  min-width: 18px;
  text-align: center;
  line-height: 16px;
  height: 16px;
  display: inline-flex;
  align-items: center;
}
</style>
