<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from "vue";
import { useAuthStore } from "@/stores/authStore";
import logoSrc from "@/assets/logo.png";

import { usePasswordDialog } from "@/composables/usePasswordDialog";
import ChangePasswordDialog from "@/components/dialogs/ChangePasswordDialog.vue";

import {
  IconFolder,
  IconLayoutList,
  IconShoppingCartDown,
  IconShirt,
  IconCashRegister,
  IconCreditCardPay,
  IconCreditCard,
  IconChartBar,
  IconShield,
  IconSpeakerphone,
  IconBuildingWarehouse,
  IconTie,
  IconChevronDown,
  IconMenu2,
  IconLogout,
  IconLock,
  IconSettings,
  IconHistory,
  IconTexture,
  IconPaperclip,
  IconTool,
  IconFlask,
  IconPuzzle,
  IconTruck,
  IconUsers,
  IconFileText,
  IconTruckDelivery,
  IconChecks,
  IconReceipt,
  IconListDetails,
  IconChartLine,
  IconNotes,
  IconBriefcase,
  IconReport,
  IconFileInvoice,
  IconArrowBack,
  IconWeight,
  IconRuler,
  IconTag,
  IconPrinter,
  IconBarcode,
  IconShoppingCart,
  IconArrowRight,
  IconPackage,
  IconAlertCircle,
  IconFileDescription,
  IconShoppingCartCopy,
  IconReportAnalytics,
  IconFileAnalytics,
  IconClipboardText,
  IconCash,
  IconBuildingBank,
  IconScissors,
  IconShieldCheck,
  IconFileSpreadsheet,
  IconCurrencyDollar,
  IconLinkOff,
  IconFileAlert,
  IconClipboardList,
  IconClipboardX,
  IconTrendingUp,
  IconLayoutGrid,
  IconCoin,
  IconReportSearch,
} from "@tabler/icons-vue";

interface NavItem {
  title?: string;
  icon?: any;
  to?: string;
  divider?: boolean;
  onClick?: () => void;
  menuId?: number;
  items?: NavItem[];
  subItems?: NavItem[];
  model?: { value: boolean };
  adminOnly?: boolean;
}

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

const openMenu = (targetModel: { value: boolean }) => {
  menuItems.forEach((m) => {
    if (m.model && m.model !== targetModel) m.model.value = false;
  });
  targetModel.value = true;
};

const menuItems: NavItem[] = [
  {
    title: "Daftar",
    icon: IconLayoutList,
    model: daftarMenu,
    menuId: 1,
    items: [
      {
        title: "Bahan",
        icon: IconTexture,
        menuId: 900,
        subItems: [
          {
            title: "Master Bahan",
            to: "/daftar/bahan/master",
            icon: IconListDetails,
            menuId: 11,
          },
          { divider: true },
          {
            title: "Jenis Bahan",
            to: "/daftar/bahan/jenis",
            icon: IconLayoutList,
            menuId: 25,
          },
          {
            title: "Warna Bahan",
            to: "/daftar/bahan/warna",
            icon: IconPaperclip,
            menuId: 26,
          },
          {
            title: "Gramasi",
            to: "/daftar/bahan/gramasi",
            icon: IconWeight,
            menuId: 27,
          },
          {
            title: "Setting",
            to: "/daftar/bahan/setting",
            icon: IconRuler,
            menuId: 28,
          },
        ],
      },
      {
        title: "Barang Garmen",
        to: "/daftar/barang-garmen",
        icon: IconShirt,
        menuId: 58,
      },
      {
        title: "Pengaturan Accesories",
        icon: IconPaperclip,
        menuId: 901,
        subItems: [
          {
            title: "Barang",
            to: "/daftar/accesories/barang",
            icon: IconPackage,
            menuId: 31,
          },
          {
            title: "Warna",
            to: "/daftar/accesories/warna",
            icon: IconPaperclip,
            menuId: 32,
          },
          {
            title: "Ukuran",
            to: "/daftar/accesories/ukuran",
            icon: IconRuler,
            menuId: 33,
          },
          {
            title: "Keterangan",
            to: "/daftar/accesories/keterangan",
            icon: IconTag,
            menuId: 34,
          },
        ],
      },
      {
        title: "Spare Part",
        to: "/daftar/sparepart",
        icon: IconTool,
        menuId: 35,
      },
      { title: "Obat", to: "/daftar/obat", icon: IconFlask, menuId: 24 },
      // {
      //   title: "Aset Perusahaan",
      //   to: "/daftar/aset-perusahaan",
      //   icon: IconBuildingBank,
      //   menuId: 38,
      // },
      {
        title: "Komponen",
        to: "/daftar/komponen",
        icon: IconPuzzle,
        menuId: 10,
      },
      {
        title: "Identitas Komp.",
        to: "/daftar/komponen-spk",
        icon: IconLayoutList,
        menuId: 18,
      },
      {
        title: "Standar Output",
        to: "/daftar/standart-output",
        icon: IconChartLine,
        menuId: 29,
      },
      {
        title: "Supplier",
        to: "/daftar/supplier",
        icon: IconTruck,
        menuId: 12,
      },
      { divider: true },
      { title: "Barang", to: "/daftar/barang", icon: IconPackage, menuId: 19 },
      {
        title: "Jenis Barang",
        to: "/daftar/jenis-barang",
        icon: IconLayoutList,
        menuId: 14,
      },
      {
        title: "Customer",
        to: "/daftar/customer",
        icon: IconUsers,
        menuId: 20,
      },
      {
        title: "Jenis Order",
        to: "/daftar/jenis-order",
        icon: IconLayoutList,
        menuId: 22,
      },
      { title: "Sales", to: "/daftar/sales", icon: IconBriefcase, menuId: 23 },
      { divider: true },
      {
        title: "BAP & Komplain",
        to: "/daftar/berita-acara",
        icon: IconAlertCircle,
        menuId: 142,
      },
    ],
  },
  {
    title: "Pembelian",
    icon: IconShoppingCartDown,
    model: pembelianMenu,
    menuId: 2,
    items: [
      {
        title: "Memo Kebutuhan Bahan", // Nama disingkat agar rapi di sidebar
        to: "/pembelian/mkb",
        icon: IconFileText,
        menuId: 51,
      },
      {
        title: "PO Bahan",
        to: "/pembelian/po-bahan",
        icon: IconFileText,
        menuId: 52,
      },
    ],
  },
  {
    title: "PPIC",
    icon: IconClipboardText, // ← import IconClipboardText dari tabler
    model: ppicMenu,
    menuId: 9000,
    items: [
      {
        title: "Cetak BAST",
        to: "/garmen/cetak-bast",
        icon: IconPrinter,
        menuId: 117,
      },
    ],
  },
  {
    title: "Garmen",
    icon: IconShirt,
    model: garmenMenu,
    menuId: 3,
    items: [
      {
        title: "Bahan Baku",
        icon: IconTexture,
        menuId: 920,
        subItems: [
          {
            title: "Permintaan Bahan",
            to: "/garmen/bahan-baku/minta-bahan",
            icon: IconFileText,
            menuId: 127,
          },
          {
            title: "Retur Bahan",
            to: "/garmen/bahan-baku/retur-bahan",
            icon: IconArrowBack,
            menuId: 61,
          },
          { divider: true },
          {
            title: "Realisasi Permintaan",
            to: "/garmen/bahan-baku/realisasi-minta",
            icon: IconChecks,
            menuId: 108,
          },
          {
            title: "Approve Retur",
            to: "/garmen/bahan-baku/approve-retur",
            icon: IconChecks,
            menuId: 137,
          },
          {
            title: "Koreksi Stok",
            to: "/garmen/bahan/koreksi",
            icon: IconSettings,
            menuId: 108,
          },
          { divider: true },
          {
            title: "BPB",
            to: "/garmen/bahan-baku/bpb-bahan",
            icon: IconTruckDelivery,
            menuId: 101,
          },
          {
            title: "Retur Pembelian",
            to: "/garmen/bahan/retur-beli",
            icon: IconTruck,
            menuId: 110,
          },
          { divider: true },
          {
            title: "Barcode Bahan",
            to: "/garmen/bahan/barcode",
            icon: IconBarcode,
            menuId: 111,
          },
          {
            title: "Cetak Barcode",
            to: "/garmen/bahan/cetak-barcode",
            icon: IconPrinter,
            menuId: 112,
          },
        ],
      },
      {
        title: "Barang",
        icon: IconPackage,
        menuId: 59,
        subItems: [
          {
            title: "Permintaan Barang",
            to: "/garmen/barang/permintaan",
            icon: IconFileText,
            menuId: 60,
          },
          {
            title: "Realisasi Permintaan",
            to: "/garmen/barang/realisasi",
            icon: IconChecks,
            menuId: 114,
          },
          {
            title: "Retur Barang",
            to: "/garmen/barang/retur",
            icon: IconArrowBack,
            menuId: 115,
          },
          {
            title: "Approve Retur",
            to: "/garmen/barang/approve-retur",
            icon: IconChecks,
            menuId: 116,
          },
          {
            title: "Koreksi Stok",
            to: "/garmen/barang/koreksi",
            icon: IconSettings,
            menuId: 117,
          },
          {
            title: "Minta Pembelian",
            to: "/garmen/barang/permintaan-pembelian",
            icon: IconShoppingCart,
            menuId: 65,
          },
          {
            title: "Mutasi In",
            to: "/garmen/barang/mutasi-in",
            icon: IconTruckDelivery,
            menuId: 69,
          },
          {
            title: "Mutasi Out",
            to: "/garmen/barang/mutasi-out",
            icon: IconTruckDelivery,
            menuId: 70,
          },
          {
            title: "PO Non Bahan",
            to: "/garmen/barang/po-nonbahan",
            icon: IconFileInvoice,
            menuId: 66,
          },
          {
            title: "BPB Non Bahan",
            to: "/garmen/barang/bpb-nonbahan",
            icon: IconPackage,
            menuId: 67,
          },
          {
            title: "Retur Pembelian",
            to: "/garmen/barang/retur-beli",
            icon: IconTruck,
            menuId: 125,
          },
        ],
      },
      { divider: true },
      { title: "MKB", to: "/garmen/mkb", icon: IconNotes, menuId: 999 },
      { divider: true },
      {
        title: "PO Internal MAP",
        icon: IconArrowRight,
        menuId: 925,
        subItems: [
          {
            title: "Daftar PO Internal MAP",
            to: "/garmen/po-internal-map",
            icon: IconListDetails,
            menuId: 138,
          },
          {
            title: "Surat Jalan MAP",
            to: "/garmen/po-internal-map/surat-jalan",
            icon: IconTruckDelivery,
            menuId: 139,
          },
          {
            title: "Approval Surat Jalan",
            to: "/garmen/po-internal-map/approve",
            icon: IconChecks,
            menuId: 140,
          },
        ],
      },
    ],
  },
  {
    title: "Penjualan",
    icon: IconCashRegister,
    model: penjualanMenu,
    menuId: 6,
    items: [
      {
        title: "MPPB",
        to: "/penjualan/mppb",
        icon: IconFileDescription,
        menuId: 150,
      },
      {
        title: "Permintaan Harga",
        to: "/penjualan/minta-harga",
        icon: IconReceipt,
        menuId: 166,
      },
      {
        title: "Penawaran",
        to: "/penjualan/penawaran",
        icon: IconFileText,
        menuId: 151,
      },
      {
        title: "Sales Order",
        to: "/penjualan/sales-order",
        icon: IconShoppingCartCopy,
        menuId: 172,
      },
      { divider: true },
      {
        title: "Invoice Proforma",
        to: "/penjualan/invoice-proforma",
        icon: IconFileInvoice, // Menggunakan Tabler Icon
        menuId: 157,
      },
      { divider: true },
      {
        title: "MAP",
        to: "/penjualan/map",
        icon: IconFileInvoice,
        menuId: 162,
      },
      {
        title: "Surat Jalan MAP",
        to: "/penjualan/sj-map",
        icon: IconTruckDelivery,
        menuId: 163,
      },
      {
        title: "Update Status SJ Memo",
        to: "/penjualan/update-sj-map",
        icon: IconChecks,
        menuId: 164,
      },
    ],
  },
  {
    title: "Piutang",
    icon: IconCreditCard,
    model: piutangMenu,
    menuId: 8,
    items: [
      {
        title: "Penerimaan",
        icon: IconLayoutList,
        menuId: 950,
        subItems: [
          {
            title: "Giro",
            to: "/piutang/penerimaan/giro",
            icon: IconCreditCard,
            menuId: 251,
          },
          {
            title: "Cash",
            to: "/piutang/penerimaan/cash",
            icon: IconCash,
            menuId: 252,
          },
          {
            title: "Transfer",
            to: "/piutang/penerimaan/transfer",
            icon: IconBuildingBank,
            menuId: 253,
          },
          {
            title: "Potongan",
            to: "/piutang/penerimaan/potongan",
            icon: IconScissors,
            menuId: 254,
          },
        ],
      },
      {
        title: "Pelunasan",
        to: "/piutang/pelunasan",
        icon: IconCoin,
        menuId: 255,
      },
    ],
  },
  {
    title: "Laporan",
    icon: IconChartBar,
    model: laporanMenu,
    menuId: 9,
    items: [
      {
        title: "Laporan Gudang Garmen",
        icon: IconBuildingWarehouse, // Import IconBuildingWarehouse di atas
        menuId: 960,
        subItems: [
          {
            title: "Stok Bahan Barcode",
            to: "/laporan/gudang-garmen/stok-bahan-barcode",
            icon: IconFileDescription,
            menuId: 501,
          },
          {
            title: "Kartu Stok Barang",
            to: "/laporan/gudang-garmen/kartu-stok-barang",
            icon: IconFileSpreadsheet,
            menuId: 503,
          },
          { divider: true },
          {
            title: "SPK Belum Ada MKB",
            to: "/laporan/gudang-garmen/spk-belum-mkb",
            icon: IconFileAlert,
            menuId: 510,
          },
          {
            title: "PO Bahan vs MKB",
            to: "/laporan/gudang-garmen/po-bahan-vs-mkb",
            icon: IconFileAnalytics,
            menuId: 511,
          },
          {
            title: "PO Bahan vs BPB",
            to: "/laporan/gudang-garmen/po-bahan-vs-bpb",
            icon: IconTruckDelivery,
            menuId: 512,
          },
        ],
      },
      {
        title: "Laporan Penjualan",
        icon: IconChartBar,
        menuId: 965,
        subItems: [
          {
            title: "Penawaran vs SPK",
            to: "/laporan/penjualan/penawaran-vs-spk",
            icon: IconReportAnalytics,
            menuId: 301,
          },
          {
            title: "Realisasi Penawaran",
            to: "/laporan/penjualan/realisasi-penawaran",
            icon: IconReportAnalytics,
          },
          {
            title: "MAP vs Surat Jalan",
            to: "/laporan/penjualan/map-vs-sj",
            icon: IconTruckDelivery,
            menuId: 307,
          },
          {
            title: "MAP vs SPK",
            to: "/laporan/penjualan/map-vs-spk",
            icon: IconClipboardList, // Bisa disesuaikan ikonnya
            menuId: 308,
          },
        ],
      },
      {
        title: "Laporan Marketing",
        icon: IconChartBar,
        menuId: 966,
        subItems: [
          {
            title: "Penawaran vs MAP",
            to: "/laporan/marketing/penawaran-vs-map",
            icon: IconReportAnalytics,
          },
          {
            title: "MAP Belum Terealisasi",
            to: "/laporan/marketing/map-belum-realisasi",
            icon: IconFileAlert,
          },
          {
            title: "SPK Belum Closing",
            to: "/laporan/marketing/spk-belum-closing",
            icon: IconClipboardX,
          },
          {
            title: "Realisasi Penjualan",
            to: "/laporan/marketing/realisasi-penjualan",
            icon: IconTrendingUp,
            menuId: 966,
          },
          {
            title: "Rekap MAP",
            to: "/laporan/marketing/rekap-map",
            icon: IconLayoutGrid,
            menuId: 311,
          },
          {
            title: "Rekap Penawaran",
            to: "/laporan/marketing/rekap-penawaran",
            icon: IconReportSearch,
            menuId: 310,
          },
          {
            title: "Kunjungan Sales",
            to: "/laporan/marketing/kunjungan-sales",
            icon: IconTruckDelivery,
            menuId: 313,
          },
        ],
      },
      {
        title: "Laporan Piutang",
        icon: IconCreditCard,
        menuId: 968,
        subItems: [
          {
            title: "Detail Piutang",
            to: "/laporan/piutang/detail-piutang",
            icon: IconFileInvoice,
            // Sengaja tanpa menuId, agar mengikuti hak akses parent-nya (968)
          },
          {
            title: "Rekap Piutang",
            to: "/laporan/piutang/rekap-piutang",
            icon: IconFileAnalytics, // Pastikan di-import di menu definition
          },
          {
            title: "Kartu Piutang",
            to: "/laporan/piutang/kartu-piutang",
            icon: IconFileDescription,
          },
          { divider: true },
          {
            title: "Daftar Penerimaan",
            to: "/laporan/piutang/daftar-penerimaan",
            icon: IconCurrencyDollar,
          },
          {
            title: "Cek Gagal Link",
            to: "/laporan/piutang/cek-gagal-link",
            icon: IconLinkOff,
          },
        ],
      },
    ],
  },
  {
    title: "Tools",
    icon: IconTool,
    model: toolsMenu,
    adminOnly: true, // Hanya muncul untuk Admin/Developer
    items: [
      { title: "Master User", to: "/tools/users", icon: IconUsers },
      { title: "Approval", to: "/tools/approval", icon: IconShieldCheck },
      { divider: true },
    ],
  },
];

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
              :model-value="menu.title === 'Garmen' && hasSpkNotif"
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
              <template
                v-for="(item, i) in (menu.items ?? []).filter((x) =>
                  hasAccess(x),
                )"
                :key="i"
              >
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
                    v-for="(sub, si) in (item.subItems ?? []).filter((x) =>
                      hasAccess(x),
                    )"
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

          <template
            v-for="(item, i) in (menu.items ?? []).filter((x) => hasAccess(x))"
            :key="i"
          >
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
                v-for="(sub, si) in (item.subItems ?? []).filter((x) =>
                  hasAccess(x),
                )"
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
  max-width: 120px;
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
</style>
