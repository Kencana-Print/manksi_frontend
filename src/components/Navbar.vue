<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from "vue";
import { useRouter } from "vue-router";
import { useAuthStore } from "@/stores/authStore";
import { useDisplay } from "vuetify";
import logoSrc from "@/assets/logo.png";

interface NavSection {
  title: string;
  icon: string;
  items: NavItem[];
}

interface NavItem {
  title?: string;
  icon?: string;
  to?: string;
  divider?: boolean;
  onClick?: () => void;
  badgeKey?: string;
  menuId?: number;
  items?: NavItem[];
  subItems?: NavItem[];
  isLarge?: boolean;
  sections?: NavSection[];
  model?: { value: boolean };
}

const authStore = useAuthStore();
const router = useRouter();

const scrolled = ref(false);
const drawer = ref(false);
const drawerExpanded = ref<string[]>([]);

// Deteksi lebar navbar secara dinamis menggunakan ResizeObserver
// Ini jauh lebih akurat dibanding breakpoint CSS Vuetify
const navbarRef = ref<HTMLElement | null>(null);
const availableNavWidth = ref(9999);
const openedGroups = ref<string[]>([]);
const showDesktopNav = computed(() => availableNavWidth.value >= 1050);

const fileMenu = ref(false);
const daftarMenu = ref(false);
const pembelianMenu = ref(false);
const garmenMenu = ref(false);
const penjualanMenu = ref(false);
const hutangMenu = ref(false);
const piutangMenu = ref(false);
const laporanMenu = ref(false);

const appBarElevation = computed(() => (scrolled.value ? 2 : 0));
const isScrolled = computed(() => scrolled.value);

const hasSpkNotif = computed(() => {
  return authStore.spkUrgent && authStore.spkUrgent.length > 0;
});

const userRoleConfig = computed(() => {
  const name = authStore.userName?.toUpperCase() || "";
  const bagian = authStore.user?.bagian?.toUpperCase() || "";
  if (name.includes("ADMIN") || name === "DEVELOPER") {
    return { icon: "mdi-shield-account", color: "red-darken-2" };
  }
  if (bagian === "MARKETING") {
    return { icon: "mdi-bullhorn-outline", color: "orange-darken-3" };
  }
  if (bagian.includes("GUDANG")) {
    return { icon: "mdi-warehouse", color: "teal-darken-1" };
  }
  return { icon: "mdi-account-tie", color: "indigo-darken-2" };
});

const hasAccess = (item: NavItem): boolean => {
  // 1. Cek hak akses item/folder itu sendiri (jika ada menuId)
  let isAllowed = true;
  if (item.menuId) {
    isAllowed = authStore.can(item.menuId.toString(), "view");
  }

  // Jika akses ke folder/item ini ditolak, langsung return false
  if (!isAllowed) return false;

  // 2. Cegah "Folder Kosong":
  // Jika item ini punya subItems, pastikan minimal ada 1 subItem yang bisa diakses
  if (item.subItems && item.subItems.length > 0) {
    return item.subItems.some((sub) => hasAccess(sub));
  }

  // Berlaku juga untuk level items pertama
  if (item.items && item.items.length > 0) {
    return item.items.some((child) => hasAccess(child));
  }

  // Lolos semua pengecekan
  return true;
};

const openMenu = (targetModel: { value: boolean }) => {
  // Tutup semua menu lain dulu
  menuItems.forEach((menu) => {
    if (menu.model && menu.model !== targetModel) {
      menu.model.value = false;
    }
  });
  // Buka menu yang dipilih
  targetModel.value = true;
};

const menuItems: NavItem[] = [
  {
    title: "File",
    icon: "mdi-folder-outline",
    model: fileMenu,
    // File statis tidak ada ID di database
    items: [
      {
        title: "Pengaturan Profil",
        to: "/file/profil",
        icon: "mdi-account-cog-outline",
      },
      { title: "Log Aktivitas", to: "/file/log", icon: "mdi-history" },
    ],
  },
  {
    title: "Daftar",
    icon: "mdi-clipboard-list-outline",
    model: daftarMenu,
    menuId: 1,
    items: [
      {
        title: "Bahan",
        icon: "mdi-texture",
        menuId: 900,
        subItems: [
          {
            title: "Master Bahan",
            to: "/daftar/bahan/master",
            icon: "mdi-shape-outline",
            menuId: 11,
          },
          { divider: true },
          {
            title: "Jenis Bahan",
            to: "/daftar/bahan/jenis",
            icon: "mdi-format-list-bulleted-type",
            menuId: 25,
          },
          {
            title: "Warna Bahan",
            to: "/daftar/bahan/warna",
            icon: "mdi-palette-outline",
            menuId: 26,
          },
          {
            title: "Gramasi",
            to: "/daftar/bahan/gramasi",
            icon: "mdi-weight",
            menuId: 27,
          },
          {
            title: "Setting",
            to: "/daftar/bahan/setting",
            icon: "mdi-ruler-square",
            menuId: 28,
          },
        ],
      },
      {
        title: "Barang Garmen",
        to: "/daftar/barang-garmen",
        icon: "mdi-tshirt-crew-outline",
        menuId: 58,
      },
      {
        title: "Accesories",
        icon: "mdi-paperclip",
        menuId: 901,
        subItems: [
          {
            title: "Master Accesories",
            to: "/daftar/accesories/master",
            icon: "mdi-necklace",
            menuId: 30,
          },
          { divider: true },
          {
            title: "Barang",
            to: "/daftar/accesories/barang",
            icon: "mdi-shape-outline",
            menuId: 31,
          },
          {
            title: "Warna",
            to: "/daftar/accesories/warna",
            icon: "mdi-palette-outline",
            menuId: 32,
          },
          {
            title: "Ukuran",
            to: "/daftar/accesories/ukuran",
            icon: "mdi-ruler",
            menuId: 33,
          },
          {
            title: "Keterangan",
            to: "/daftar/accesories/keterangan",
            icon: "mdi-tag-text-outline",
            menuId: 34,
          },
        ],
      },
      {
        title: "Spare Part",
        to: "/daftar/sparepart",
        icon: "mdi-cog-outline",
        menuId: 35,
      },
      {
        title: "Obat",
        to: "/daftar/obat",
        icon: "mdi-flask-outline",
        menuId: 24,
      },
      {
        title: "Aset Perusahaan",
        to: "/daftar/aset-perusahaan",
        icon: "mdi-domain",
        menuId: 38,
      },
      {
        title: "Komponen",
        to: "/daftar/komponen",
        icon: "mdi-puzzle-outline",
        menuId: 10,
      },
      {
        title: "Identitas Komponen SPK",
        to: "/daftar/komponen-spk",
        icon: "mdi-format-list-bulleted-type",
        menuId: 18,
      },
      {
        title: "Standar Output per Hari",
        to: "/daftar/standart-output",
        icon: "mdi-chart-timeline-variant",
        menuId: 29,
      },
      {
        title: "Supplier",
        to: "/daftar/supplier",
        icon: "mdi-truck-outline",
        menuId: 12,
      },
      { divider: true },
      {
        title: "Barang",
        to: "/daftar/barang",
        icon: "mdi-tshirt-crew-outline",
        menuId: 19,
      },
      {
        title: "Jenis Barang",
        to: "/daftar/jenis-barang",
        icon: "mdi-format-list-bulleted-type",
        menuId: 14,
      },
      {
        title: "Customer",
        to: "/daftar/customer",
        icon: "mdi-account-group-outline",
        menuId: 20,
      },
      {
        title: "Jenis Order",
        to: "/daftar/jenis-order",
        icon: "mdi-format-list-bulleted-type",
        menuId: 22,
      },
      {
        title: "Sales",
        to: "/daftar/sales",
        icon: "mdi-account-tie",
        menuId: 23,
      },
      { divider: true },
      {
        title: "BAP dan Komplain Produksi",
        to: "/daftar/berita-acara",
        icon: "mdi-alert-circle-outline",
        menuId: 142,
      },
    ],
  },
  {
    title: "Pembelian",
    icon: "mdi-cart-arrow-down",
    model: pembelianMenu,
    menuId: 2,
    items: [
      {
        title: "Pesanan Pembelian",
        to: "/pembelian/pesanan",
        icon: "mdi-file-document-outline",
      },
      {
        title: "Penerimaan Barang",
        to: "/pembelian/terima",
        icon: "mdi-truck-check-outline",
      },
    ],
  },
  {
    title: "Garmen",
    icon: "mdi-tshirt-crew-outline",
    model: garmenMenu,
    menuId: 3,
    items: [
      // ----- 1. BAHAN BAKU -----
      {
        title: "Bahan Baku",
        icon: "mdi-texture",
        menuId: 920,
        subItems: [
          {
            title: "Permintaan Bahan",
            to: "/garmen/bahan-baku/minta-bahan",
            icon: "mdi-file-document-outline",
            menuId: 127,
          },
          {
            title: "Retur Bahan",
            to: "/garmen/bahan-baku/retur-bahan",
            icon: "mdi-keyboard-return",
            menuId: 110,
          },
          { divider: true },
          {
            title: "Realisasi Permintaan",
            to: "/garmen/bahan-baku/realisasi-minta",
            icon: "mdi-check-all",
            menuId: 108,
          },
          {
            title: "Approve Retur",
            to: "/garmen/bahan-baku/approve-retur", // <-- Sesuaikan dengan Router
            icon: "mdi-check-decagram-outline",
            menuId: 137, // <-- Sesuai instruksi Anda
          },
          {
            title: "Koreksi Stok",
            to: "/garmen/bahan/koreksi",
            icon: "mdi-pencil-box-outline",
            menuId: 108,
          },
          { divider: true },
          {
            title: "BPB",
            to: "/garmen/bahan/bpb",
            icon: "mdi-truck-check-outline",
            menuId: 109,
          },
          {
            title: "Retur Pembelian",
            to: "/garmen/bahan/retur-beli",
            icon: "mdi-truck-fast-outline",
            menuId: 110,
          },
          { divider: true },
          {
            title: "Pembuatan Barcode Bahan",
            to: "/garmen/bahan/barcode",
            icon: "mdi-barcode",
            menuId: 111,
          },
          {
            title: "Cetak Barcode",
            to: "/garmen/bahan/cetak-barcode",
            icon: "mdi-printer-pos",
            menuId: 112,
          },
        ],
      },

      // ----- 2. BARANG -----
      {
        title: "Barang",
        icon: "mdi-package-variant-closed",
        // Misal ID untuk "GARMEN > Barang" adalah 924
        menuId: 59,
        subItems: [
          {
            title: "Permintaan Barang",
            to: "/garmen/barang/permintaan",
            icon: "mdi-file-document-outline",
            menuId: 60,
          },
          {
            title: "Realisasi Permintaan",
            to: "/garmen/barang/realisasi",
            icon: "mdi-check-all",
            menuId: 114,
          },
          {
            title: "Retur Barang",
            to: "/garmen/barang/retur",
            icon: "mdi-keyboard-return",
            menuId: 115,
          },
          {
            title: "Approve Retur",
            to: "/garmen/barang/approve-retur",
            icon: "mdi-check-decagram-outline",
            menuId: 116,
          },
          {
            title: "Koreksi Stok",
            to: "/garmen/barang/koreksi",
            icon: "mdi-pencil-box-outline",
            menuId: 117,
          },
          {
            title: "Permintaan Pembelian",
            to: "/garmen/barang/minta-beli",
            icon: "mdi-cart-plus",
            menuId: 118,
          },
          {
            title: "Mutasi In",
            to: "/garmen/barang/mutasi-in",
            icon: "mdi-arrow-right-bottom",
            menuId: 119,
          },
          {
            title: "Mutasi Out",
            to: "/garmen/barang/mutasi-out",
            icon: "mdi-arrow-top-right",
            menuId: 120,
          },
          {
            title: "PO",
            to: "/garmen/barang/po",
            icon: "mdi-file-document-multiple-outline",
            menuId: 121,
          },
          {
            title: "BPB",
            to: "/garmen/barang/bpb",
            icon: "mdi-truck-check-outline",
            menuId: 122,
          },
          {
            title: "Voucher Pembelian",
            to: "/garmen/barang/voucher",
            icon: "mdi-ticket-percent-outline",
            menuId: 123,
          },
          {
            title: "Permintaan Retur Pembelian",
            to: "/garmen/barang/minta-retur",
            icon: "mdi-file-undo-outline",
            menuId: 124,
          },
          {
            title: "Retur Pembelian",
            to: "/garmen/barang/retur-beli",
            icon: "mdi-truck-fast-outline",
            menuId: 125,
          },
        ],
      },

      { divider: true },
      {
        title: "Memo Kebutuhan Bahan (MKB)",
        to: "/garmen/mkb",
        icon: "mdi-note-text-outline",
        menuId: 999, // Pastikan ID ini ada di tabel thakuser Delphi
      },
      { divider: true },
      {
        title: "PO Internal MAP",
        icon: "mdi-cart-arrow-right",
        menuId: 925,
        subItems: [
          {
            title: "Daftar PO Internal MAP",
            to: "/garmen/po-internal-map",
            icon: "mdi-format-list-bulleted",
            menuId: 138,
          },
          {
            title: "Surat Jalan MAP",
            to: "/garmen/po-internal-map/surat-jalan",
            icon: "mdi-truck-delivery-outline",
            menuId: 139,
          },
          {
            title: "Approval Surat Jalan",
            to: "/garmen/po-internal-map/approve",
            icon: "mdi-check-decagram-outline",
            menuId: 140,
          },
        ],
      },
      { divider: true },
      {
        title: "SPK Garmen",
        to: "/garmen/spk",
        icon: "mdi-clipboard-edit-outline",
      },
      {
        title: "Progress Produksi",
        to: "/garmen/progress",
        icon: "mdi-chart-timeline-variant",
      },
      { divider: true },
      {
        title: "Cetak BAST",
        to: "/garmen/cetak-bast",
        icon: "mdi-printer-check",
        menuId: 117,
      },
    ],
  },
  {
    title: "Penjualan",
    icon: "mdi-cash-register",
    model: penjualanMenu,
    menuId: 6,
    items: [
      // Tambahkan menu Permintaan Harga di atas
      {
        title: "Permintaan Harga",
        to: "/penjualan/minta-harga",
        icon: "mdi-cash-multiple",
        menuId: 166,
      },
      {
        title: "Penawaran",
        to: "/penjualan/penawaran",
        icon: "mdi-file-document-outline",
        menuId: 151, // Wajib sama dengan di router
      },
      { divider: true },
      {
        title: "Memo Approval Produk (MAP)",
        icon: "mdi-clipboard-text-outline",
        to: "/penjualan/map",
        menuId: 162,
      },
      {
        title: "Surat Jalan MAP",
        to: "/penjualan/sj-map",
        icon: "mdi-truck-delivery-outline",
        menuId: 163,
      },
      {
        title: "Update Status SJ Memo",
        icon: "mdi-truck-check-outline",
        to: "/penjualan/update-sj-map",
        menuId: 164,
      },
    ],
  },
  {
    title: "Hutang",
    icon: "mdi-credit-card-minus-outline",
    model: hutangMenu,
    menuId: 7,
    items: [
      {
        title: "Daftar Hutang",
        to: "/hutang/daftar",
        icon: "mdi-format-list-bulleted",
      },
      {
        title: "Pembayaran Hutang",
        to: "/hutang/bayar",
        icon: "mdi-cash-minus",
      },
    ],
  },
  {
    title: "Piutang",
    icon: "mdi-credit-card-plus-outline",
    model: piutangMenu,
    menuId: 8,
    items: [
      {
        title: "Daftar Piutang",
        to: "/piutang/daftar",
        icon: "mdi-format-list-bulleted",
      },
      {
        title: "Penerimaan Piutang",
        to: "/piutang/terima",
        icon: "mdi-cash-plus",
      },
    ],
  },
  {
    title: "Laporan",
    icon: "mdi-chart-box-outline",
    model: laporanMenu,
    menuId: 9,
    items: [
      {
        title: "Laporan Penjualan",
        to: "/laporan/penjualan",
        icon: "mdi-chart-bar",
      },
      {
        title: "Laporan Pembelian",
        to: "/laporan/pembelian",
        icon: "mdi-chart-line",
      },
    ],
  },
];

const closeMenus = () => {
  menuItems.forEach((menu) => {
    if (menu.model && menu.model.value) {
      menu.model.value = false;
    }
  });
  openedGroups.value = []; // ← reset submenu
  drawer.value = false;
};

const handleLogout = async () => {
  sessionStorage.removeItem("hasSeenSpk");
  // Tutup menu dan drawer sebelum logout
  closeMenus();
  drawer.value = false;
  // Logout dari authStore
  await authStore.logout();
};

const openPasswordDialog = () => {
  alert("Dialog Ganti Password belum diimplementasi.");
  closeMenus();
};

const handleScroll = () => {
  scrolled.value = window.scrollY > 10;
};

let resizeObserver: ResizeObserver | null = null;

onMounted(() => {
  window.addEventListener("scroll", handleScroll);

  // Observasi lebar toolbar secara langsung — akurat saat devtools terbuka
  resizeObserver = new ResizeObserver((entries) => {
    for (const entry of entries) {
      availableNavWidth.value = entry.contentRect.width;
    }
  });
  const toolbar = document.querySelector(".v-toolbar__content");
  if (toolbar) resizeObserver.observe(toolbar);
  // fallback jika ResizeObserver terlambat
  availableNavWidth.value = window.innerWidth;
});

onUnmounted(() => {
  window.removeEventListener("scroll", handleScroll);
  resizeObserver?.disconnect();
});
</script>

<template>
  <!-- ===================== APP BAR ===================== -->
  <v-app-bar
    flat
    height="64"
    :elevation="appBarElevation"
    fixed
    :class="['desktop-navbar', { 'navbar-scrolled': isScrolled }]"
  >
    <!-- Hamburger — hanya muncul saat nav desktop tidak cukup lebar -->
    <v-app-bar-nav-icon
      v-if="!showDesktopNav"
      class="ml-1"
      @click="drawer = !drawer"
      color="primary"
      size="small"
    />

    <!-- Logo -->
    <RouterLink to="/" class="logo-section">
      <img :src="logoSrc" alt="Logo" class="brand-logo" />
    </RouterLink>

    <v-spacer />

    <!-- Nav Desktop — tampil saat lebar toolbar >= 900px, di-tengah dengan dua spacer -->
    <nav v-if="showDesktopNav" class="main-navigation">
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
              :model-value="menu.title === 'Garmen' && hasSpkNotif"
              offset-x="10"
              offset-y="10"
            >
              <v-btn
                variant="text"
                v-bind="props"
                :prepend-icon="menu.icon"
                class="nav-button"
              >
                {{ menu.title }}
              </v-btn>
            </v-badge>
          </template>

          <v-card class="nav-dropdown" elevation="8">
            <v-list
              class="nav-list"
              density="comfortable"
              :opened="openedGroups"
              @update:opened="openedGroups = $event.slice(-1)"
            >
              <template
                v-for="(item, index) in (menu.items ?? []).filter((i) =>
                  hasAccess(i),
                )"
                :key="index"
              >
                <v-divider v-if="item.divider" class="nav-divider" />

                <v-list-group
                  v-else-if="'subItems' in item"
                  :value="item.title"
                >
                  <template #activator="{ props }">
                    <v-list-item
                      v-bind="props"
                      :prepend-icon="item.icon"
                      class="nav-list-item"
                    >
                      <v-list-item-title>{{ item.title }}</v-list-item-title>
                    </v-list-item>
                  </template>
                  <template
                    v-for="(subItem, subIndex) in (item.subItems ?? []).filter(
                      (i) => hasAccess(i),
                    )"
                    :key="subIndex"
                  >
                    <v-divider v-if="subItem.divider" class="my-1" />
                    <v-list-item
                      v-else
                      :to="subItem.to"
                      :prepend-icon="subItem.icon"
                      class="nav-list-item nested"
                      @click="closeMenus"
                    >
                      <v-list-item-title>{{ subItem.title }}</v-list-item-title>
                    </v-list-item>
                  </template>
                </v-list-group>

                <v-list-item
                  v-else
                  :to="item.to"
                  class="nav-list-item"
                  @click="item.onClick ? item.onClick() : closeMenus()"
                >
                  <template #prepend>
                    <v-icon>{{ item.icon }}</v-icon>
                  </template>
                  <v-list-item-title>{{ item.title }}</v-list-item-title>
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
        <v-btn variant="text" v-bind="props" class="user-button">
          <v-avatar :color="userRoleConfig.color" size="30" class="user-avatar">
            <v-icon :icon="userRoleConfig.icon" size="18" color="white" />
          </v-avatar>
          <!-- Nama user selalu tampil, chevron juga -->
          <span class="user-name">{{ authStore.userName }}</span>
          <v-icon icon="mdi-chevron-down" size="14" class="user-chevron" />
        </v-btn>
      </template>

      <v-card class="user-dropdown" elevation="8">
        <v-list class="user-list">
          <v-list-item class="user-profile-item">
            <template #prepend>
              <v-avatar :color="userRoleConfig.color" size="32">
                <v-icon :icon="userRoleConfig.icon" size="20" color="white" />
              </v-avatar>
            </template>
            <v-list-item-title class="user-profile-name">{{
              authStore.userName
            }}</v-list-item-title>
            <v-list-item-subtitle class="user-profile-branch">
              {{ authStore.userCabang }} -
              {{ authStore.user?.bagian || "STAFF" }}
            </v-list-item-subtitle>
          </v-list-item>
          <v-divider />
          <v-list-item
            @click="openPasswordDialog"
            prepend-icon="mdi-lock-outline"
            class="user-menu-item"
          >
            <v-list-item-title>Ganti Password</v-list-item-title>
          </v-list-item>
          <v-divider />
          <v-list-item
            @click="handleLogout"
            prepend-icon="mdi-logout"
            class="user-menu-item logout"
          >
            <v-list-item-title>Logout</v-list-item-title>
          </v-list-item>
        </v-list>
      </v-card>
    </v-menu>
  </v-app-bar>

  <!-- ===================== MOBILE / MEDIUM DRAWER ===================== -->
  <v-navigation-drawer
    v-model="drawer"
    temporary
    location="left"
    width="280"
    class="mobile-drawer"
  >
    <!-- Header Drawer -->
    <v-list-item class="drawer-header py-3">
      <template #prepend>
        <v-avatar :color="userRoleConfig.color" size="38">
          <v-icon :icon="userRoleConfig.icon" size="22" color="white" />
        </v-avatar>
      </template>
      <v-list-item-title class="font-weight-bold text-subtitle-2">{{
        authStore.userName
      }}</v-list-item-title>
      <v-list-item-subtitle class="text-caption">
        {{ authStore.userCabang }} · {{ authStore.user?.bagian || "STAFF" }}
      </v-list-item-subtitle>
    </v-list-item>

    <v-divider />

    <!-- Menu Items di Drawer -->
    <v-list density="compact" nav v-model:opened="drawerExpanded">
      <template
        v-for="menu in menuItems.filter((m) => hasAccess(m))"
        :key="menu.title"
      >
        <!-- Menu dengan subitem -->
        <v-list-group
          :value="menu.title"
          v-if="menu.items && menu.items.length"
        >
          <template #activator="{ props }">
            <v-list-item
              v-bind="props"
              :prepend-icon="menu.icon"
              :title="menu.title"
              class="drawer-menu-item"
            >
              <template #append>
                <v-badge
                  v-if="menu.title === 'Garmen' && hasSpkNotif"
                  color="error"
                  dot
                  inline
                  class="mr-2"
                />
              </template>
            </v-list-item>
          </template>

          <template
            v-for="(item, idx) in (menu.items ?? []).filter((i) =>
              hasAccess(i),
            )"
            :key="idx"
          >
            <v-divider v-if="item.divider" class="mx-4 my-1" />

            <!-- Item dengan sub-subitem (Bahan, Accesories) -->
            <v-list-group :value="item.title" v-else-if="'subItems' in item">
              <template #activator="{ props }">
                <v-list-item
                  v-bind="props"
                  :prepend-icon="item.icon"
                  :title="item.title"
                  class="drawer-sub-item"
                />
              </template>
              <template
                v-for="(subItem, subIdx) in (item.subItems ?? []).filter((i) =>
                  hasAccess(i),
                )"
                :key="subIdx"
              >
                <v-divider v-if="subItem.divider" class="mx-4 my-1" />
                <v-list-item
                  v-else
                  :to="subItem.to"
                  :prepend-icon="subItem.icon"
                  :title="subItem.title"
                  class="drawer-sub-sub-item"
                  @click="closeMenus"
                />
              </template>
            </v-list-group>

            <!-- Item biasa -->
            <v-list-item
              v-else
              :to="item.to"
              :prepend-icon="item.icon"
              :title="item.title"
              class="drawer-sub-item"
              @click="item.onClick ? item.onClick() : closeMenus()"
            />
          </template>
        </v-list-group>
      </template>
    </v-list>

    <template #append>
      <v-divider />
      <div class="drawer-footer">
        <v-list density="compact">
          <v-list-item
            @click="openPasswordDialog"
            prepend-icon="mdi-lock-outline"
            title="Ganti Password"
            class="drawer-menu-item"
          />
          <v-list-item
            @click="handleLogout"
            prepend-icon="mdi-logout"
            title="Logout"
            class="drawer-menu-item text-error"
          />
        </v-list>
      </div>
    </template>
  </v-navigation-drawer>
</template>

<style scoped>
/* ===== APP BAR ===== */
.desktop-navbar {
  border-bottom: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  background-color: rgba(var(--v-theme-surface), 0.92) !important;
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
  transition: all 0.25s ease;
}

.navbar-scrolled {
  background-color: rgba(var(--v-theme-surface), 0.99) !important;
  box-shadow: 0 2px 16px rgba(0, 0, 0, 0.06) !important;
}

/* ===== LOGO ===== */
.logo-section {
  display: flex;
  align-items: center;
  text-decoration: none;
  padding: 4px 8px;
  border-radius: 6px;
  transition: background-color 0.2s ease;
  margin-right: 8px;
  flex-shrink: 0; /* penting: logo tidak pernah menyusut */
}

.logo-section:hover {
  background-color: rgba(var(--v-theme-primary), 0.05);
}

.brand-logo {
  height: 38px;
  width: auto;
  object-fit: contain;
}

/* ===== MAIN NAV (Desktop) ===== */
.main-navigation {
  display: flex;
  align-items: center;
  gap: 0px;
  flex: 1 1 auto;
  min-width: 0;
  /* Biarkan nav mengambil sisa ruang antara logo dan user button */
}

.nav-button {
  height: 40px;
  padding: 0 14px;
  font-weight: 600;
  font-size: 0.875rem;
  color: rgb(var(--v-theme-on-surface));
  border-radius: 8px;
  text-transform: none;
  letter-spacing: 0.01em;
  transition: all 0.2s ease;
  white-space: nowrap;
  flex-shrink: 0;
}

.nav-button:hover {
  background-color: rgba(var(--v-theme-primary), 0.08);
  color: rgb(var(--v-theme-primary));
}

/* ===== DROPDOWN CARD ===== */
.nav-dropdown {
  border-radius: 10px;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  overflow: hidden;
  background-color: rgba(var(--v-theme-surface), 0.97);
  backdrop-filter: blur(16px);
  min-width: 200px;
}

.nav-list {
  padding: 6px;
  max-height: calc(100vh - 90px);
  overflow-y: auto;
}

.nav-list::-webkit-scrollbar {
  width: 6px;
}
.nav-list::-webkit-scrollbar-thumb {
  background-color: rgba(0, 0, 0, 0.2);
  border-radius: 4px;
}
.nav-list::-webkit-scrollbar-track {
  background-color: transparent;
}

.nav-list-item {
  min-height: 34px;
  border-radius: 6px;
  margin: 1px 0;
  font-size: 0.85rem;
  transition: all 0.15s ease;
}

.nav-list-item:hover {
  background-color: rgba(var(--v-theme-primary), 0.06);
  color: rgb(var(--v-theme-primary));
}

.nav-list-item.nested {
  padding-left: 32px;
}

.nav-divider {
  margin: 6px 0;
}

/* ===== USER BUTTON ===== */
.user-button {
  height: 38px;
  padding: 0 10px;
  border-radius: 20px;
  text-transform: none;
  font-weight: 500;
  flex-shrink: 0;
  transition: all 0.2s ease;
}

.user-button:hover {
  background-color: rgba(var(--v-theme-primary), 0.06);
}

.user-avatar {
  margin-right: 6px;
}

.user-name {
  font-size: 0.875rem;
  font-weight: 500;
  color: rgb(var(--v-theme-on-surface));
  margin: 0 4px;
  max-width: 140px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.user-chevron {
  color: rgba(var(--v-theme-on-surface), 0.5);
}

/* ===== USER DROPDOWN ===== */
.user-dropdown {
  min-width: 220px;
  border-radius: 10px;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}

.user-list {
  padding: 6px;
}

.user-profile-item {
  padding: 10px 12px;
  border-radius: 8px;
  background-color: rgba(var(--v-theme-primary), 0.05);
  margin-bottom: 2px;
}

.user-profile-name {
  font-weight: 600;
  font-size: 0.88rem;
}

.user-menu-item {
  min-height: 36px;
  border-radius: 6px;
  font-size: 0.85rem;
}

.user-menu-item.logout {
  color: #dc2626;
}

.user-menu-item.logout:hover {
  background-color: rgba(220, 38, 38, 0.06);
}

/* ===== DRAWER ===== */
.mobile-drawer {
  border-right: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}

.drawer-header {
  background-color: rgba(var(--v-theme-primary), 0.04);
  min-height: 64px;
}

.drawer-menu-item {
  border-radius: 6px;
  font-size: 0.875rem;
  min-height: 40px;
}

.drawer-sub-item {
  border-radius: 6px;
  font-size: 0.85rem;
  min-height: 36px;
}

.drawer-sub-sub-item {
  border-radius: 6px;
  font-size: 0.82rem;
  min-height: 34px;
  padding-left: 8px;
}

.drawer-footer {
  padding: 4px 0 8px;
}

/* ===== TOOLBAR LAYOUT FIX ===== */
:deep(.v-toolbar__content) {
  /* Jangan overflow:hidden — itu yang membuat ResizeObserver tidak akurat */
  gap: 0;
  padding: 0 8px;
}
</style>
