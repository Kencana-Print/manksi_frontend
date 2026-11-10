// config/menuItems.ts
import { ref } from "vue";
import {
  IconSettings,
  IconFolder,
  IconLayoutList,
  IconShoppingCartDown,
  IconShirt,
  IconCashRegister,
  IconCreditCard,
  IconChartBar,
  IconSpeakerphone,
  IconBuildingWarehouse,
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
  IconFileInvoice,
  IconArrowBack,
  IconWeight,
  IconRuler,
  IconTag,
  IconPrinter,
  IconBarcode,
  IconShoppingCart,
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
  IconCalendarStats,
  IconBuildingFactory2,
  IconClipboardCheck,
  IconFileCheck,
  IconReceipt2,
  IconFileDots,
  IconTruckOff,
  IconReceiptTax,
  IconRuler2,
  IconArrowsExchange,
  IconScale,
  IconBoxSeam,
  IconClipboardData,
  IconGauge,
  IconListCheck,
  IconTruckLoading,
  IconCircleCheck,
  IconAlertTriangle,
  IconActivity,
  IconArrowBackUp,
  IconFileShredder,
  IconCalendarDue,
  IconClockHour4,
  IconTarget,
  IconFileDiff,
  IconHierarchy3,
  IconPhotoScan,
  IconPhotoSearch,
  IconMessageExclamation,
  IconDatabaseSearch,
  IconHourglass,
  IconShoppingBagPlus,
  IconCalendarCog,
  IconNotebook,
  IconCalendarWeek,
  IconTags,
  IconPhoto,
  IconFlag,
  IconRecycle,
  IconCashBanknote,
  IconMapPin,
  IconBook,
  IconTransfer,
  IconList,
  IconPalette,
  IconChecklist,
  IconTargetArrow,
  IconGavel,
  IconEraser,
  IconBulb,
  IconFlame,
  IconFold,
  IconSkull,
  IconSteeringWheel,
  IconBox,
  IconCar,
  IconBuildingSkyscraper,
  IconQrcode,
  IconTicket,
  IconShieldLock,
} from "@tabler/icons-vue";
import { useMemoInternal } from "@/composables/useMemoInternal";

export interface NavItem {
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
  sembunyikanCabang?: string[];
  tampilan?: "rail" | "kolom";
}

// Satu baris hasil pencarian menu (hasil perataan NavItem yang lolos hak akses)
export interface MenuCari {
  judul: string;
  jalur: string;
  to?: string;
  aksi?: () => void;
}

// ⚠️ PENTING: array di bawah pakai `model: daftarMenu` dst yang tadinya
// ref() lokal di Navbar.vue. Karena file config ini sekarang di luar
// component scope, ref-ref itu dipindah jadi factory function supaya
// tiap kali Navbar.vue import, dia dapat instance ref baru (bukan
// singleton yang ke-share lintas komponen kalau suatu saat menuItems
// dipakai di >1 tempat).

export const createMenuItems = (): NavItem[] => {
  const daftarMenu = ref(false);
  const pembelianMenu = ref(false);
  const ppicMenu = ref(false);
  const spandukMenu = ref(false);
  const garmenMenu = ref(false);
  const mmtMenu = ref(false);
  const penjualanMenu = ref(false);
  const gaMenu = ref(false);
  const piutangMenu = ref(false);
  const laporanMenu = ref(false);
  const toolsMenu = ref(false);
  const transaksiMenu = ref(false);

  const { openMemoDialog } = useMemoInternal();

  const modul: NavItem[] = [
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
        {
          title: "Barang",
          to: "/daftar/barang",
          icon: IconPackage,
          menuId: 19,
        },
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
        {
          title: "Sales",
          to: "/daftar/sales",
          icon: IconBriefcase,
          menuId: 23,
        },
        { divider: true },
        {
          title: "Cost Center",
          to: "/daftar/cost-center",
          icon: IconBuildingBank,
          menuId: 39,
        },
        {
          title: "Account",
          to: "/daftar/account",
          icon: IconCreditCard,
          menuId: 40,
        },
        {
          title: "Kelompok",
          to: "/daftar/kelompok",
          icon: IconLayoutGrid,
          menuId: 41,
        },
        {
          title: "Jenis Pembayaran",
          to: "/daftar/jenis-pembayaran",
          icon: IconCash,
          menuId: 42,
        },

        { divider: true },
        {
          title: "BAP & Komplain",
          to: "/daftar/berita-acara",
          icon: IconAlertCircle,
          menuId: 142,
        },
        {
          title: "Complain Customer",
          to: "/daftar/complain-customer",
          icon: IconMessageExclamation,
          menuId: 36,
        },
        {
          title: "Kendala",
          to: "/daftar/kendala",
          icon: IconAlertTriangle,
          menuId: 37,
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
          title: "Memo Kebutuhan Bahan (MKB)",
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
        {
          title: "PO Non Bahan",
          to: "/garmen/barang/po-nonbahan",
          icon: IconFileInvoice,
          menuId: 66,
        },
        {
          title: "PO External Garmen",
          to: "/pembelian/po-external-garmen",
          icon: IconShoppingBagPlus,
          menuId: 144,
        },
        {
          title: "Uang Muka",
          icon: IconCashBanknote,
          to: "/pembelian/uang-muka",
          menuId: 315,
        },
        {
          title: "Mutasi Out Garmen",
          to: "/garmen/barang/mutasi-out",
          icon: IconTruckDelivery,
          menuId: 70,
        },
        {
          title: "Pengajuan Transfer",
          to: "/pembelian/pengajuan-transfer",
          icon: IconTransfer,
          menuId: 958,
        },
        {
          title: "Tindak Lanjut QC Bahan",
          to: "/pembelian/tindak-lanjut-qc",
          icon: IconGavel,
          menuId: 187,
        },
        { divider: true },
        {
          title: "Setting Harga Bahan",
          icon: IconTags,
          subItems: [
            {
              title: "Garmen",
              to: "/pembelian/setting-harga-bahan/garmen",
              icon: IconShirt,
              menuId: 210,
            },
            {
              title: "MMT",
              to: "/pembelian/setting-harga-bahan/mmt",
              icon: IconPhoto,
              menuId: 211,
            },
            {
              title: "Spanduk",
              to: "/pembelian/setting-harga-bahan/spanduk",
              icon: IconFlag,
              menuId: 212,
            },
          ],
        },
      ],
    },
    {
      title: "PPIC",
      icon: IconClipboardText,
      model: ppicMenu,
      menuId: 9000,
      items: [
        {
          title: "Proof Garmen",
          to: "/ppic/proof",
          icon: IconClipboardCheck,
          menuId: 122,
        },
        {
          title: "Cetak BAST-MAP",
          to: "/garmen/cetak-bast",
          icon: IconPrinter,
          menuId: 117,
        },
        {
          title: "SPK (Surat Perintah Kerja)",
          to: "/ppic/spk",
          icon: IconClipboardText,
          menuId: 152,
        },
        {
          title: "Planning SPK PPIC",
          to: "/ppic/planning-spk",
          icon: IconCalendarStats,
          menuId: 56,
        },
        {
          title: "Konfirmasi Pra Order",
          to: "/ppic/konfirmasi-pra-order",
          icon: IconClipboardCheck,
          menuId: 1325,
        },
        {
          title: "LHK PPIC",
          icon: IconRuler2,
          subItems: [
            {
              title: "LHK Pola",
              to: "/garmen/lhk-pola",
              icon: IconRuler2,
              menuId: 174,
            },
            {
              title: "LHK Marker",
              to: "/ppic/lhk-marker",
              icon: IconRuler2,
              menuId: 179,
            },
          ],
        },
      ],
    },
    {
      title: "Spanduk",
      icon: IconFlag,
      model: spandukMenu,
      menuId: 4,
      items: [
        {
          title: "Daftar",
          icon: IconLayoutList,
          subItems: [
            {
              title: "Toleransi",
              to: "/spanduk/daftar/toleransi",
              icon: IconRuler2,
              // Tanpa menuId, mengikuti hak akses parent (4)
            },
          ],
        },
        {
          title: "Laporan Harian Kerja (LHK)",
          icon: IconClipboardList,
          subItems: [
            {
              title: "LHK Design",
              to: "/spanduk/lhk/lhk-design",
              icon: IconSkull,
            },
            {
              title: "LHK Hapus Plankan",
              to: "/spanduk/lhk/lhk-hapus-plankan",
              icon: IconEraser,
            },
            {
              title: "LHK Afdruk",
              to: "/spanduk/lhk/lhk-afdruk",
              icon: IconBulb,
            },
            {
              title: "LHK Cetak",
              to: "/spanduk/lhk/lhk-cetak",
              icon: IconPrinter,
            },
            {
              title: "LHK Pemakaian Obat",
              to: "/spanduk/lhk/lhk-tinta",
              icon: IconPalette,
            },
            {
              title: "LHK Proof",
              to: "/spanduk/lhk/lhk-proof",
              icon: IconFileCheck,
            },
            {
              title: "LHK Quiring",
              to: "/spanduk/lhk/lhk-quiring",
              icon: IconFlame,
              menuId: 1224,
            },
            {
              title: "LHK Jahit",
              to: "/spanduk/lhk/lhk-jahit",
              icon: IconScissors,
              menuId: 1222,
            },
            {
              title: "LHK Lipat",
              to: "/spanduk/lhk/lhk-lipat",
              icon: IconFold,
              menuId: 1223,
            },
            {
              title: "LHK Koli",
              to: "/spanduk/lhk/lhk-koli",
              icon: IconBox,
            },
            {
              title: "LHK BS (Bad Stock)",
              to: "/spanduk/lhk/lhk-bs",
              icon: IconAlertTriangle,
            },
          ],
        },
        { divider: true },
        {
          title: "Cetak BAST MAP",
          to: "/spanduk/bast-map",
          icon: IconPrinter,
          // Tanpa menuId, mengikuti hak akses parent (4)
        },
        {
          title: "Form Mutasi (Sampel)",
          to: "/spanduk/mutasi-marketing",
          icon: IconTruckDelivery,
          menuId: 1327,
        },
        // {
        //   title: "Mutasi Produksi",
        //   to: "/spanduk/mutasi-produksi",
        //   icon: IconArrowsExchange,
        //   // Tanpa menuId, mengikuti hak akses parent (4)
        // },
        {
          title: "Surat Terima Barang Jadi (STBJ)",
          to: "/spanduk/stbj",
          icon: IconClipboardCheck,
          menuId: 105,
        },
        {
          title: "Jadwal Kirim",
          to: "/spanduk/jadwal-kirim",
          icon: IconTruckDelivery,
          menuId: 119,
        },
        {
          title: "Approval Surat Jalan",
          to: "/spanduk/approval-sj",
          icon: IconClipboardCheck,
          menuId: 165,
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
              menuId: 110,
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
              to: "/garmen/bahan-baku/koreksi-stok",
              icon: IconSettings,
              menuId: 115,
            },
            { divider: true },
            {
              title: "QC Bahan",
              to: "/garmen/bahan-baku/qc-bahan",
              icon: IconClipboardCheck,
              menuId: 186,
            },
            {
              title: "BPB",
              to: "/garmen/bahan-baku/bpb-bahan",
              icon: IconTruckDelivery,
              menuId: 101,
            },
            {
              title: "Retur Pembelian Bahan",
              to: "/garmen/bahan-baku/retur-pembelian-bahan",
              icon: IconArrowBackUp,
              menuId: 55,
            },
            { divider: true },
            {
              title: "Pembuatan Barcode Bahan",
              to: "/garmen/bahan-baku/pembuatan-barcode-bahan",
              icon: IconBarcode,
              menuId: 135,
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
          title: "Bahan Jadi",
          icon: IconShirt,
          menuId: 921,
          subItems: [
            {
              title: "Cetak Barcode Kaosan",
              to: "/garmen/bahan-jadi/cetak-barcode-kaosan",
              icon: IconBarcode,
              menuId: 130,
            },
            {
              title: "Cetak Barcode Koli",
              to: "/garmen/bahan-jadi/cetak-barcode-koli",
              icon: IconQrcode,
              menuId: 188,
            },
            {
              title: "Surat Terima Barang Jadi (STBJ)",
              to: "/garmen/bahan-jadi/stbj",
              icon: IconClipboardCheck,
              menuId: 105,
              sembunyikanCabang: ["P02"],
            },
            {
              title: "Cetak Bukti Keluar Barang Jadi (BKBJ)",
              to: "/garmen/bahan-jadi/cetak-bkbj",
              icon: IconFileInvoice,
              menuId: 143,
            },
            {
              title: "Koreksi Stok Barang Jadi",
              to: "/garmen/bahan-jadi/koreksi-stok",
              icon: IconSettings,
              menuId: 114,
            },
          ],
        },
        {
          title: "MKA (Memo Kebutuhan Accesories)",
          to: "/garmen/mka",
          icon: IconNotes,
          menuId: 57,
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
              menuId: 62,
            },
            {
              title: "Retur Barang",
              to: "/garmen/barang/retur-barang",
              icon: IconArrowBack,
              menuId: 61,
            },
            {
              title: "Approve Retur",
              to: "/garmen/barang/approve-retur-barang",
              icon: IconChecks,
              menuId: 63,
            },
            {
              title: "Koreksi Stok",
              to: "/garmen/barang/koreksi-stok",
              icon: IconSettings,
              menuId: 64,
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
              title: "BPB Non Bahan",
              to: "/garmen/barang/bpb-nonbahan",
              icon: IconPackage,
              menuId: 67,
            },
            {
              title: "Retur Pembelian",
              to: "/garmen/barang/retur-pembelian",
              icon: IconTruckOff,
              menuId: 68,
            },
          ],
        },
        {
          title: "Pengajuan Dana",
          to: "/piutang/pengajuan-dana",
          icon: IconCash,
          menuId: 177,
        },
        {
          title: "SPK Gudang",
          to: "/garmen/spk-gudang",
          icon: IconClipboardList,
          menuId: 79,
        },
        {
          title: "Maklon Barang",
          icon: IconArrowsExchange,
          menuId: 181,
          subItems: [
            {
              title: "Makloon Barang",
              to: "/garmen/maklon/makloon-barang",
              icon: IconArrowsExchange,
              menuId: 180,
            },
            {
              title: "SJ Hasil Maklon",
              to: "/garmen/makloon/sj-hasil-makloon",
              icon: IconTruckDelivery,
              menuId: 182,
            },
          ],
        },
        {
          title: "Permintaan Marker",
          to: "/garmen/permintaan-marker",
          icon: IconScissors,
          menuId: 189,
        },
        {
          title: "CMT",
          icon: IconScissors,
          subItems: [
            {
              title: "PO Jasa",
              to: "/garmen/po-jasa",
              icon: IconClipboardList,
              menuId: 102,
            },
            {
              title: "Approve PO Jasa",
              to: "/garmen/approve-po-jasa",
              icon: IconClipboardCheck,
              menuId: 113,
            },
            {
              title: "Bukti Penerimaan Jasa (BPB Jasa)",
              to: "/garmen/bpb-jasa",
              icon: IconFileCheck,
              menuId: 104,
            },
          ],
        },
        {
          title: "PO Internal MAP",
          icon: IconFileShredder,
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
        {
          title: "PO Internal SPK",
          icon: IconFileInvoice,
          menuId: 926,
          subItems: [
            {
              title: "PO Internal",
              to: "/garmen/po-internal-spk/po-internal",
              icon: IconListDetails,
              menuId: 124,
            },
            {
              title: "Surat Jalan PO Internal",
              to: "/garmen/po-internal-spk/sj-po-internal",
              icon: IconTruckDelivery,
              menuId: 125,
            },
            {
              title: "Approval Surat Jalan PO Internal",
              to: "/garmen/po-internal-spk/approve-sj",
              icon: IconCircleCheck,
              menuId: 126,
            },
          ],
        },
        {
          title: "Planning per SPK",
          icon: IconCalendarStats,
          menuId: 927,
          subItems: [
            {
              title: "Input Planning",
              to: "/garmen/planning-per-spk/input-planning",
              icon: IconCalendarStats,
              menuId: 80,
            },
            {
              title: "Planning per Tanggal",
              to: "/garmen/planning-per-spk/planning-per-tgl",
              icon: IconCalendarDue,
              menuId: 81,
            },
            {
              title: "Planning SPK vs Realisasi",
              to: "/garmen/planning-per-spk/plan-vs-realisasi",
              icon: IconChartBar,
              menuId: 82,
            },
          ],
        },
        {
          title: "LHK Garmen",
          icon: IconClipboardList,
          subItems: [
            {
              title: "Mutasi Produksi",
              to: "/garmen/mutasi-produksi",
              icon: IconBuildingFactory2,
              menuId: 109,
            },
          ],
        },
        {
          title: "DTF/DTG",
          icon: IconPhotoSearch,
          menuId: 928,
          subItems: [
            {
              title: "SO DTF/DTG",
              to: "/garmen/dtf/so-dtf",
              icon: IconPhotoSearch,
              menuId: 128,
            },
            {
              title: "LHK SO DTF/DTG",
              to: "/garmen/dtf/lhk-so-dtf",
              icon: IconClipboardList,
              menuId: 123,
            },
          ],
        },
        {
          title: "Jasa Internal",
          icon: IconBuildingFactory2,
          subItems: [
            {
              title: "Pemakaian Obat",
              to: "/garmen/pemakaian-obat",
              icon: IconFlask,
              menuId: 120,
            },
            {
              title: "PO Paperprint",
              to: "/garmen/po-paperprint",
              icon: IconFileText,
              menuId: 103,
            },
            {
              title: "PO DTF",
              to: "/garmen/po-dtf",
              icon: IconPhotoScan,
              menuId: 141,
            },
          ],
        },
      ],
    },
    {
      title: "MMT",
      icon: IconPrinter,
      model: mmtMenu,
      menuId: 5,
      items: [
        {
          title: "Daftar",
          icon: IconLayoutList,
          subItems: [
            {
              title: "Master Bahan MMT",
              to: "/mmt/daftar/bahan",
              icon: IconTexture,
              menuId: 5501,
            },
            {
              title: "Operator",
              to: "/mmt/daftar/operator",
              icon: IconUsers,
              menuId: 5502,
            },
            {
              title: "Mesin Produksi",
              to: "/mmt/daftar/mesin",
              icon: IconTool,
              menuId: 5503,
            },
          ],
        },
        {
          title: "Bahan Baku & Produksi",
          icon: IconBuildingFactory2,
          subItems: [
            {
              title: "Permintaan Pembelian",
              to: "/mmt/bahan-baku-produksi/permintaan-pembelian",
              icon: IconClipboardList,
              menuId: 5531,
            },
            {
              title: "Purchase Request (PR)",
              to: "/mmt/bahan-baku-produksi/purchase-request",
              icon: IconPackage,
              menuId: 5532,
            },
            {
              title: "Penerimaan Bahan",
              to: "/mmt/bahan-baku-produksi/penerimaan-bahan",
              icon: IconPackage,
              menuId: 5533,
            },
            {
              title: "Mutasi Bahan MMT",
              to: "/mmt/bahan-baku-produksi/mutasi-bahan-mmt",
              icon: IconArrowsExchange,
              menuId: 5534,
            },
            {
              title: "Koreksi Stok Bahan",
              to: "/mmt/bahan-baku-produksi/koreksi-stok-bahan",
              icon: IconClipboardCheck,
              menuId: 5535,
            },
            {
              title: "Permintaan Produksi",
              to: "/mmt/bahan-baku-produksi/permintaan-produksi",
              icon: IconBuildingFactory2,
              menuId: 5536,
            },
            {
              title: "Realisasi Produksi",
              to: "/mmt/bahan-baku-produksi/realisasi-permintaan-produksi",
              icon: IconChecks,
              menuId: 5537,
            },
            // {
            //   title: "Pinjam Bahan MMT",
            //   to: "/mmt/bahan-baku-produksi/pinjam-bahan-mmt",
            //   icon: IconArrowsExchange,
            //   menuId: 5538,
            // },
            {
              title: "Retur Produksi",
              to: "/mmt/bahan-baku-produksi/retur-permintaan-produksi",
              icon: IconArrowBackUp,
              menuId: 5539,
            },
            {
              title: "Barcode",
              icon: IconBarcode,
              subItems: [
                {
                  title: "Search Barcode",
                  to: "/mmt/bahan-baku-produksi/search-barcode",
                  icon: IconBarcode,
                  menuId: 5540,
                },
                {
                  title: "Create Barcode",
                  to: "/mmt/bahan-baku-produksi/create-barcode",
                  icon: IconBarcode,
                  menuId: 5541,
                },
                {
                  title: "Kartu Barcode",
                  to: "/mmt/bahan-baku-produksi/kartu-barcode",
                  icon: IconReportAnalytics,
                  menuId: 5542,
                },
              ],
            },
          ],
        },
        {
          title: "Finance",
          icon: IconCash,
          subItems: [
            {
              title: "PO Bahan MMT",
              to: "/mmt/finance/po-bahan",
              icon: IconShoppingCart,
              menuId: 5504,
            },
            {
              title: "PO External MMT",
              to: "/mmt/finance/po-external",
              icon: IconShoppingCartDown,
              menuId: 5505,
            },
            {
              title: "Retur Beli",
              to: "/mmt/finance/retur-beli",
              icon: IconArrowBack,
              menuId: 5506,
            },
          ],
        },
        {
          title: "LHK",
          icon: IconClipboardList,
          subItems: [
            {
              title: "LHK Cetak (Mesin)",
              to: "/mmt/lhk/mesin-cetak",
              icon: IconPrinter,
              menuId: 5507,
            },
            {
              title: "LHK Approval Cetak",
              to: "/mmt/lhk/cetak-mmt",
              icon: IconPhoto,
              menuId: 5508,
            },
            {
              title: "LHK Tekstil",
              to: "/mmt/lhk/tekstil",
              icon: IconTexture,
              menuId: 5509,
            },
            {
              title: "LHK Approval Tekstil",
              to: "/mmt/lhk/tekstil/approve",
              icon: IconChecks,
              menuId: 5510,
            },
            {
              title: "LHK Finishing",
              to: "/mmt/lhk/finishing",
              icon: IconScissors,
              menuId: 5511,
            },
            {
              title: "LHK Proof",
              to: "/mmt/lhk/proof",
              icon: IconFileCheck,
              menuId: 5512,
            },
            {
              title: "LHK Paperprint",
              to: "/mmt/lhk/paperprint",
              icon: IconFileText,
              menuId: 5513,
            },
            {
              title: "LHK Sublim",
              to: "/mmt/lhk/sublim",
              icon: IconFlame,
              menuId: 5514,
            },
            {
              title: "LHK Layout",
              to: "/mmt/lhk/layout",
              icon: IconLayoutGrid,
              menuId: 5515,
            },
          ],
        },
        {
          title: "Maklon Barang",
          to: "/mmt/maklon/barang",
          icon: IconPackage,
          menuId: 5516,
        },
        {
          title: "SJ Hasil Maklon",
          to: "/mmt/sj-hasil-maklon",
          icon: IconTruckDelivery,
          menuId: 5517,
        },
        {
          title: "Planning Produksi",
          to: "/mmt/planning-produksi",
          icon: IconCalendarStats,
          menuId: 5518,
        },
        {
          title: "Komitmen Kirim",
          to: "/mmt/komitmen-kirim",
          icon: IconChecks,
          menuId: 5519,
        },
        {
          title: "Memo Approval Produk (MAP)",
          to: "/mmt/map",
          icon: IconFileDescription,
          menuId: 5520,
        },
        {
          title: "BAST-MAP",
          to: "/mmt/bast-map",
          icon: IconFileCheck,
          menuId: 5521,
        },
        {
          title: "Relationship Map",
          to: "/mmt/relationship-map",
          icon: IconChartLine,
          menuId: 5522,
        },
        {
          title: "SO TO SPK (Surat Perintah Kerja)",
          to: "/mmt/so-spk",
          icon: IconFileInvoice,
          menuId: 5523,
        },
        {
          title: "STBJ",
          to: "/mmt/stbj",
          icon: IconBoxSeam,
          menuId: 5524,
        },
        {
          title: "Surat Jalan",
          to: "/mmt/surat-jalan",
          icon: IconTruck,
          menuId: 5525,
        },
        {
          title: "Surat Jalan Approve",
          to: "/mmt/surat-jalan/approve",
          icon: IconShieldCheck,
          menuId: 5526,
        },
        {
          title: "Jadwal Kirim",
          to: "/mmt/jadwal-kirim",
          icon: IconCalendarWeek,
          menuId: 5527,
        },
        {
          title: "PO Internal",
          to: "/mmt/po-paperprint",
          icon: IconFileText,
          menuId: 5528,
        },
        {
          title: "Mutasi Internal",
          to: "/mmt/mutasi-internal",
          icon: IconArrowsExchange,
          menuId: 5529,
        },
        {
          title: "Penerimaan PO External",
          to: "/mmt/penerimaan-po-external",
          icon: IconShoppingCartDown,
          menuId: 5530,
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
          title: "Marketing",
          icon: IconSpeakerphone,
          subItems: [
            {
              title: "MPPB",
              to: "/penjualan/mppb",
              icon: IconFileDescription,
              menuId: 150,
            },
            {
              title: "Pra Order",
              to: "/penjualan/pra-order",
              icon: IconNotebook,
              menuId: 175,
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
              title: "MAP (Memo Approval Produk)",
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
            {
              title: "Sales Order",
              to: "/penjualan/sales-order",
              icon: IconShoppingCartCopy,
              menuId: 172,
            },
            {
              title: "Alokasi SO",
              to: "/penjualan/alokasi-so",
              icon: IconMapPin,
              menuId: 183,
            },
            {
              title: "Insentif",
              to: "/penjualan/insentif",
              icon: IconCoin,
              menuId: 167,
            },
          ],
        },
        {
          title: "Desain Marketing",
          icon: IconPalette,
          subItems: [
            {
              title: "Permintaan Desain",
              to: "/penjualan/permintaan-desain",
              icon: IconPalette,
              menuId: 184,
            },
            {
              title: "LHK Desain",
              to: "/penjualan/lhk-desain",
              icon: IconChecklist,
              menuId: 185,
            },
          ],
        },
        {
          title: "Pengiriman",
          icon: IconTruckDelivery,
          subItems: [
            {
              title: "Pra Surat Jalan",
              to: "/penjualan/pra-sj",
              icon: IconFileDots,
              menuId: 168,
            },
            {
              title: "Surat Jalan",
              to: "/penjualan/surat-jalan",
              icon: IconTruck,
              menuId: 153,
            },
            {
              title: "Surat Jalan Tak Normal",
              to: "/penjualan/sj-tak-normal",
              icon: IconTruckOff,
              menuId: 154,
            },
            {
              title: "Update Status Surat Jalan",
              to: "/penjualan/update-status-sj",
              icon: IconTruckDelivery,
              menuId: 155,
            },
            {
              title: "Terima Mutasi dari Produksi",
              to: "/penjualan/terima-mutasi",
              icon: IconClipboardCheck,
              menuId: 191,
            },
            // Tiga menu di bawah dicabut ke Lintas Divisi oleh komposisi di akhir
            // createMenuItems; tetap ditulis di sini sebagai sumbernya.
            {
              title: "Approval Surat Jalan",
              to: "/penjualan/approval-sj",
              icon: IconClipboardCheck,
              menuId: 165,
              sembunyikanCabang: ["P02"],
            },
            {
              title: "Jadwal Kirim",
              to: "/penjualan/jadwal-kirim",
              icon: IconTruckDelivery,
              menuId: 119,
              sembunyikanCabang: ["P02"],
            },
            {
              title: "Komitmen Kirim",
              to: "/ppic/penjadwalan",
              icon: IconCalendarWeek,
              menuId: 176,
            },
          ],
        },
        {
          title: "Invoice",
          icon: IconFileInvoice,
          subItems: [
            {
              title: "Invoice",
              to: "/penjualan/invoice",
              icon: IconReceipt,
              menuId: 156,
            },
            {
              title: "Invoice Proforma",
              to: "/penjualan/invoice-proforma",
              icon: IconFileInvoice,
              menuId: 157,
            },
            {
              title: "Invoice Tak Normal",
              to: "/penjualan/invoice-tak-normal",
              icon: IconReceipt2,
              menuId: 158,
            },
            {
              title: "Cetak Kuitansi",
              to: "/penjualan/cetak-kuitansi",
              icon: IconReceipt2,
              menuId: 1317,
            },
            {
              title: "Cetak Faktur Pajak",
              to: "/penjualan/cetak-faktur-pajak",
              icon: IconReceiptTax,
              menuId: 159,
            },
            {
              title: "Export CSV ke Faktur Pajak",
              to: "/penjualan/export-csv-pajak",
              icon: IconFileSpreadsheet,
              menuId: 160,
            },
          ],
        },
      ],
    },
    {
      title: "GA",
      icon: IconBuildingSkyscraper,
      model: gaMenu,
      menuId: 600,
      items: [
        {
          title: "Master Kendaraan",
          to: "/ga/master-kendaraan",
          icon: IconCar,
          menuId: 601,
        },
        {
          title: "Master Pengguna",
          to: "/ga/master-pengguna",
          icon: IconUsers,
          menuId: 602,
        },
        {
          title: "Perawatan",
          to: "/ga/perawatan",
          icon: IconTool,
          menuId: 611,
        },
        {
          title: "Ambil Voucher",
          to: "/ga/ambil-voucher",
          icon: IconTicket,
          menuId: 613,
        },
        {
          title: "Permintaan Driver",
          to: "/ga/permintaan-driver",
          icon: IconSteeringWheel,
          menuId: 612,
        },
        { divider: true },
        {
          title: "Laporan Pengajuan Perbaikan",
          to: "/ga/laporan-pengajuan-perbaikan",
          icon: IconFileDescription,
          menuId: 621,
        },
      ],
    },
    {
      title: "Finance",
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
        { divider: true },
        {
          title: "Bukti Kas Masuk (BKM)",
          to: "/piutang/bkm",
          icon: IconReceipt,
          menuId: 952,
        },
        {
          title: "Bukti Kas Keluar (BKK)",
          to: "/piutang/bkk",
          icon: IconReceipt2,
          menuId: 953,
        },
        {
          title: "Bukti Bank Masuk (BBM)",
          to: "/piutang/bbm",
          icon: IconBuildingBank,
          menuId: 954,
        },
        {
          title: "Bukti Bank Keluar (BBK)",
          to: "/piutang/bbk",
          icon: IconBuildingBank,
          menuId: 955,
        },
        {
          title: "Klaim Kas Kecil/ATM",
          to: "/piutang/klaim-kas-kecil",
          icon: IconCashBanknote,
          menuId: 971,
        },
        {
          title: "Jurnal Umum",
          to: "/piutang/jurnal-umum",
          icon: IconBook,
          menuId: 956,
        },
        {
          title: "Rekonsiliasi Bank",
          to: "/piutang/rekonsiliasi-bank",
          icon: IconArrowsExchange,
          menuId: 957,
        },
        {
          title: "Terima Setoran Kasir",
          to: "/piutang/terima-setoran",
          icon: IconReceipt,
          menuId: 959,
        },
        {
          title: "Rekap Pembayaran",
          to: "/piutang/rekap-pembayaran",
          icon: IconCalendarDue,
          menuId: 970,
        },
        {
          title: "Voucher Pembayaran",
          to: "/piutang/voucher-pembayaran",
          icon: IconFileInvoice,
          menuId: 201,
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
          icon: IconBuildingWarehouse,
          menuId: 960,
          subItems: [
            {
              title: "Stok & Kartu Stok",
              icon: IconClipboardList,
              subItems: [
                {
                  title: "Stok Bahan Barcode",
                  to: "/laporan/gudang-garmen/stok-bahan-barcode",
                  icon: IconFileDescription,
                  menuId: 501,
                },
                {
                  title: "Kartu Stok Bahan",
                  to: "/laporan/gudang-garmen/kartu-stok-bahan",
                  icon: IconClipboardList,
                  menuId: 502,
                },
                {
                  title: "Kartu Stok Barang",
                  to: "/laporan/gudang-garmen/kartu-stok-barang",
                  icon: IconFileSpreadsheet,
                  menuId: 503,
                },
                {
                  title: "Mutasi Stok Bahan",
                  to: "/laporan/gudang-garmen/mutasi-stok-bahan",
                  icon: IconArrowsExchange,
                  menuId: 505,
                },
                {
                  title: "Stok Accesories vs MKA",
                  to: "/laporan/gudang-garmen/stok-acc-vs-mka",
                  icon: IconScale,
                  menuId: 569,
                },
                {
                  title: "Monitoring Status & Stock Transaksi Maklon",
                  to: "/laporan/gudang-garmen/monitoring-makloon",
                  icon: IconArrowsExchange,
                  menuId: 572,
                },
                {
                  title: "Stok Gudang DC",
                  to: "/laporan/gudang-garmen/stok-dc",
                  icon: IconBuildingWarehouse,
                  menuId: 570,
                },
              ],
            },
            {
              title: "Barang Jadi & Bahan",
              icon: IconBoxSeam,
              subItems: [
                {
                  title: "Stok Barang Jadi",
                  to: "/laporan/gudang-garmen/stok-barang-jadi",
                  icon: IconBoxSeam,
                  menuId: 506,
                },
                {
                  title: "Kartu Stok Barang Jadi",
                  to: "/laporan/gudang-garmen/kartu-stok-barangjadi",
                  icon: IconClipboardData,
                  menuId: 507,
                },
                {
                  title: "Mutasi Stok Barang Jadi",
                  to: "/laporan/gudang-garmen/mutasi-stok-barang-jadi",
                  icon: IconArrowsExchange,
                  menuId: 508,
                },
                {
                  title: "Realisasi Keluar Bahan",
                  to: "/laporan/gudang-garmen/realisasi-keluar-bahan",
                  icon: IconClipboardCheck,
                  menuId: 529,
                },
                {
                  title: "Umur Stok Bahan",
                  to: "/laporan/gudang-garmen/umur-stok-bahan",
                  icon: IconHourglass,
                  menuId: 530,
                },
              ],
            },
            {
              title: "PO & Penerimaan",
              icon: IconFileInvoice,
              subItems: [
                {
                  title: "SO Belum Ada MKB",
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
                {
                  title: "PO Jasa vs BPB Jasa",
                  to: "/laporan/gudang-garmen/poj-vs-bpj",
                  icon: IconFileInvoice,
                  menuId: 513,
                },
                {
                  title: "Outstanding PO Mitra",
                  to: "/laporan/gudang-garmen/outstanding-po-mitra",
                  icon: IconGauge,
                  menuId: 514,
                },
                {
                  title: "SPK DTF Belum PO DTF",
                  to: "/laporan/gudang-garmen/spk-dtf-belum-po",
                  icon: IconFileAlert,
                  menuId: 516,
                },
                {
                  title: "SPK MKB vs PO BPB",
                  to: "/laporan/gudang-garmen/spk-mkb-vs-po-bpb",
                  icon: IconFileAnalytics,
                  menuId: 519,
                },
                {
                  title: "SPK vs PO",
                  to: "/laporan/gudang-garmen/spk-vs-po",
                  icon: IconFileInvoice,
                  menuId: 520,
                },
                {
                  title: "SPK vs BPB",
                  to: "/laporan/gudang-garmen/spk-vs-bpb",
                  icon: IconTruckDelivery,
                  menuId: 521,
                },
                {
                  title: "SPK vs BPB Non PO",
                  to: "/laporan/gudang-garmen/spk-vs-bpb-non-po",
                  icon: IconTruckDelivery,
                  menuId: 522,
                },
              ],
            },
            {
              title: "Realisasi Bahan & Produksi",
              icon: IconChecks,
              subItems: [
                {
                  title: "Standart Babaran vs Realisasi",
                  to: "/laporan/gudang-garmen/standart-babaran-vs-realisasi",
                  icon: IconScale,
                  menuId: 509,
                },
                {
                  title: "Realisasi Minta Bahan",
                  to: "/laporan/gudang-garmen/realisasi-minta-bahan",
                  icon: IconClipboardList,
                  menuId: 515,
                },
                {
                  title: "Realisasi Minta Bahan vs LHK Cutting",
                  to: "/laporan/gudang-garmen/realisasi-minta-vs-lhk-cutt",
                  icon: IconClipboardCheck,
                  menuId: 568,
                },
                {
                  title: "SPK vs Realisasi vs LHK Cutting",
                  to: "/laporan/gudang-garmen/spkv-realisasiv-lhkcutt",
                  icon: IconListCheck,
                  menuId: 517,
                },
                {
                  title: "Mutasi Produksi with Detail",
                  to: "/laporan/gudang-garmen/mutasi-prod-detail",
                  icon: IconLayoutGrid,
                  menuId: 524,
                },
                {
                  title: "Laporan Kekurangan Produksi",
                  to: "/laporan/gudang-garmen/kekurangan-produksi",
                  icon: IconAlertTriangle,
                  menuId: 525,
                },
              ],
            },
            {
              title: "SPK & MAP",
              icon: IconClipboardCheck,
              subItems: [
                {
                  title: "SPK vs STBJ vs SJ",
                  to: "/laporan/gudang-garmen/spk-vs-stbj-vs-sj",
                  icon: IconTruckLoading,
                  menuId: 518,
                },
                {
                  title: "SPK Close STBJ",
                  to: "/laporan/gudang-garmen/spk-close-stbj",
                  icon: IconCircleCheck,
                  menuId: 523,
                },
                {
                  title: "Outstanding SPK",
                  to: "/laporan/gudang-garmen/lap-outstanding-spk",
                  icon: IconClipboardList,
                  menuId: 526,
                },
                {
                  title: "Browse SPK",
                  to: "/laporan/gudang-garmen/browse-spk",
                  icon: IconClipboardList,
                  menuId: 527,
                },
                {
                  title: "Browse MAP",
                  to: "/laporan/gudang-garmen/browse-map",
                  icon: IconClipboardList,
                  menuId: 528,
                },
              ],
            },
          ],
        },
        {
          title: "Laporan Produksi Garmen",
          icon: IconActivity,
          menuId: 961,
          subItems: [
            {
              title: "Monitoring Proof",
              to: "/laporan/produksi-garmen/monitoring-proof",
              icon: IconClipboardCheck,
              menuId: 553,
            },
            {
              title: "Monitoring Produksi",
              to: "/laporan/produksi-garmen/monitoring-produksi",
              icon: IconGauge,
              menuId: 554,
            },
            {
              title: "Monitoring Kekurangan Produksi (All Divisi)",
              to: "/laporan/produksi-garmen/monitoring-kurang-prod",
              icon: IconAlertTriangle,
              menuId: 555,
            },
            {
              title: "Monitoring Kekurangan Produksi (Jahit/Line)",
              to: "/laporan/produksi-garmen/monitoring-kurang-prod-jahit",
              icon: IconAlertTriangle,
            },
            {
              title: "Monitoring Kekurangan Produksi v2",
              to: "/laporan/produksi-garmen/monitoring-kurang-prodv2",
              icon: IconAlertTriangle,
              menuId: 556,
            },
            {
              title: "Monitoring Kedatangan Bahan",
              to: "/laporan/produksi-garmen/monitoring-bhn-datang",
              icon: IconTruckDelivery,
              menuId: 557,
            },
            {
              title: "Outstanding Bordir",
              to: "/laporan/produksi-garmen/outstanding-bordir",
              icon: IconAlertTriangle,
              menuId: 558,
            },
            {
              title: "Standar Babaran Proof",
              to: "/laporan/produksi-garmen/std-babaran-proof",
              icon: IconRuler2,
              menuId: 559,
            },
            {
              title: "Study Time Proses Proof Jahit",
              to: "/laporan/produksi-garmen/study-time-proof-jahit",
              icon: IconClockHour4,
              menuId: 560,
            },
            {
              title: "Study Time Proses Proof Cetak",
              to: "/laporan/produksi-garmen/study-time-proof-cetak",
              icon: IconClockHour4,
              menuId: 561,
            },
            {
              title: "Study Time Proses Proof Bordir",
              to: "/laporan/produksi-garmen/study-time-proof-bordir",
              icon: IconClockHour4,
              menuId: 562,
            },
            {
              title: "Monitoring BS",
              to: "/laporan/produksi-garmen/monitoring-bs",
              icon: IconAlertTriangle,
              menuId: 563,
            },
            {
              title: "Stok Produksi by Line",
              to: "/laporan/produksi-garmen/stok-by-line",
              icon: IconLayoutGrid,
              menuId: 564,
            },
            {
              title: "Pemakaian Obat",
              to: "/laporan/produksi-garmen/pemakaian-obat",
              icon: IconFlask,
              menuId: 565,
            },
          ],
        },
        {
          title: "Laporan PPIC Garmen",
          icon: IconCalendarStats,
          menuId: 962,
          subItems: [
            {
              title: "Keberhasilan Komitmen Kirim",
              to: "/laporan/ppic/keberhasilan-komitmen-kirim",
              icon: IconTargetArrow,
              menuId: 1326,
            },
          ],
        },
        {
          title: "Laporan Produksi Spanduk",
          icon: IconPrinter,
          menuId: 963,
          subItems: [
            {
              title: "Monitoring Produksi",
              icon: IconActivity,
              subItems: [
                {
                  title: "Output by SPK",
                  to: "/laporan/produksi-spanduk/output-by-spk",
                  icon: IconListCheck,
                },
                {
                  title: "Kekurangan Produksi",
                  to: "/laporan/produksi-spanduk/kekurangan-produksi",
                  icon: IconAlertTriangle,
                },
                { divider: true },
                {
                  title: "Monitoring Proof",
                  to: "/laporan/produksi-spanduk/monitoring-proof",
                  icon: IconFileCheck,
                },
                {
                  title: "Resume Proof",
                  to: "/laporan/produksi-spanduk/resume-proof",
                  icon: IconChartBar,
                },
                { divider: true },
                {
                  title: "Monitoring Afdruk",
                  to: "/laporan/produksi-spanduk/monitoring-afdruk",
                  icon: IconPrinter,
                },
                {
                  title: "Monitoring Cetak",
                  to: "/laporan/produksi-spanduk/monitoring-cetak",
                  icon: IconPrinter,
                },
                {
                  title: "Monitoring Hasil Proof",
                  to: "/laporan/produksi-spanduk/monitoring-hasil-proof",
                  icon: IconPalette,
                },
                {
                  title: "Monitoring Cuiring",
                  to: "/laporan/produksi-spanduk/monitoring-cuiring",
                  icon: IconFlame,
                },
                {
                  title: "Monitoring Jahit",
                  to: "/laporan/produksi-spanduk/monitoring-jahit",
                  icon: IconScissors,
                },
                {
                  title: "Monitoring Lipat",
                  to: "/laporan/produksi-spanduk/monitoring-lipat",
                  icon: IconFold,
                },
                {
                  title: "Monitoring Koli",
                  to: "/laporan/produksi-spanduk/monitoring-koli",
                  icon: IconPackage,
                },
                { divider: true },
                {
                  title: "Rekap Monitoring by SPK",
                  to: "/laporan/produksi-spanduk/rekap-monitoring-by-spk",
                  icon: IconListDetails,
                },
                {
                  title: "Rekap Monitoring by Gudang",
                  to: "/laporan/produksi-spanduk/rekap-monitoring-by-gudang",
                  icon: IconBuildingWarehouse,
                },
              ],
            },
            {
              title: "Pemakaian Bahan",
              to: "/laporan/produksi-spanduk/pemakaian-bahan",
              icon: IconRuler,
            },
            {
              title: "Ketercapaian Komitmen Kirim",
              to: "/laporan/produksi-spanduk/ketercapaian-komitmen-kirim",
              icon: IconTruckDelivery,
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
              title: "SPK vs STBJ",
              to: "/laporan/penjualan/spk-vs-stbj",
              icon: IconClipboardList,
              menuId: 304,
            },
            {
              title: "SPK vs SJ",
              to: "/laporan/penjualan/spk-vs-sj",
              icon: IconTruckDelivery,
              menuId: 305,
            },
            {
              title: "SO vs SJ vs Invoice",
              to: "/laporan/penjualan/spk-vs-sj-vs-inv",
              icon: IconFileInvoice,
              menuId: 306,
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
              icon: IconClipboardList,
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
              title: "Laporan Desain Marketing",
              to: "/laporan/marketing/laporan-desain",
              icon: IconPalette,
              menuId: 316,
            },
            {
              title: "SO Belum Komitmen Kirim",
              to: "/laporan/marketing/so-belum-komitmen",
              icon: IconClipboardX,
              menuId: 571,
            },
            {
              title: "Penawaran vs MAP",
              to: "/laporan/marketing/penawaran-vs-map",
              icon: IconReportAnalytics,
            },
            {
              title: "Target SPK",
              to: "/laporan/marketing/target-spk",
              icon: IconTarget,
              menuId: 312,
            },
            {
              title: "Target vs Realisasi",
              to: "/laporan/marketing/target-vs-realisasi",
              icon: IconTarget,
              menuId: 966,
            },
            {
              title: "Proyeksi vs Realisasi",
              to: "/laporan/marketing/proyeksi-vs-realisasi",
              icon: IconTrendingUp,
              menuId: 1244,
            },
            {
              title: "MAP Belum Terealisasi",
              to: "/laporan/marketing/map-belum-realisasi",
              icon: IconFileAlert,
            },
            {
              title: "SO Belum Closing",
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
              title: "Revisi Memo SPK",
              to: "/laporan/marketing/revisi-map",
              icon: IconFileDiff,
              menuId: 966,
            },
            {
              title: "Realisasi Pengiriman SPK",
              to: "/laporan/marketing/realisasi-kirim-spk",
              icon: IconTruckDelivery,
              menuId: 302,
            },
            {
              title: "Realisasi Pengiriman Memo",
              to: "/laporan/marketing/realisasi-kirim-memo",
              icon: IconTruckDelivery,
              menuId: 303,
            },
            {
              title: "Proyeksi Bulanan",
              to: "/laporan/marketing/proyeksi-bulanan",
              icon: IconChartLine,
              menuId: 1294,
            },
            {
              title: "Kunjungan Sales",
              to: "/laporan/marketing/kunjungan-sales",
              icon: IconTruckDelivery,
              menuId: 313,
            },
            {
              title: "Target vs Achievement",
              to: "/laporan/marketing/target-vs-achievement",
              icon: IconChartBar,
              menuId: 314,
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
            {
              title: "SPK Terkirim Belum Invoice",
              to: "/laporan/piutang/spk-terkirim-belum-invoice",
              icon: IconTruckDelivery,
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
        {
          title: "Laporan Finance",
          icon: IconBuildingBank,
          menuId: 969,
          subItems: [
            {
              title: "List Jurnal",
              to: "/laporan/finance/list-jurnal",
              icon: IconList,
            },
            {
              title: "Buku Besar",
              to: "/laporan/finance/buku-besar",
              icon: IconBook,
            },
            {
              title: "Kasbon Belum Selesai",
              to: "/laporan/finance/kasbon-belum-selesai",
              icon: IconReceipt2,
            },
            {
              title: "Rekonsiliasi Bank",
              to: "/laporan/finance/rekonsiliasi-bank",
              icon: IconBuildingBank,
            },
            {
              title: "Stok Finance",
              to: "/laporan/finance/stok-finance",
              icon: IconList,
            },
            {
              title: "Daftar Hutang",
              to: "/laporan/finance/daftar-hutang",
              icon: IconFileInvoice,
            },
            {
              title: "Biaya per Divisi",
              to: "/laporan/finance/biaya-per-divisi",
              icon: IconFileText,
            },
          ],
        },
      ],
    },
    {
      title: "Tools",
      icon: IconTool,
      model: toolsMenu,
      adminOnly: false,
      items: [
        {
          title: "Memo Internal",
          icon: IconFileText,
          onClick: () => openMemoDialog(),
        },
        {
          title: "Master User",
          to: "/tools/users",
          icon: IconUsers,
          adminOnly: true,
        },
        {
          title: "Master Role",
          to: "/tools/master-role",
          icon: IconShieldLock,
          adminOnly: true,
        },
        { title: "Approval", to: "/tools/approval", icon: IconShieldCheck },
        { divider: true },
        {
          title: "Relationship Map",
          to: "/tools/relationship-map",
          icon: IconHierarchy3,
          menuId: 1321,
        },
        {
          title: "Sistem Informasi Bahan",
          to: "/tools/sistem-informasi-bahan",
          icon: IconDatabaseSearch,
          menuId: 1322,
        },
        {
          title: "Kelola PIC Agenda",
          to: "/tools/kelola-pic-agenda",
          icon: IconCalendarCog,
          menuId: 1324,
        },
        {
          title: "Notulensi Meeting",
          to: "/tools/notulensi-meeting",
          icon: IconNotes,
          menuId: 1328,
        },
      ],
    },
  ];

  // ── PENATAAN ULANG: 4 menu utama (Daftar, Transaksi, Laporan, Tools) ──────
  // Aturan hak akses: menu utama baru (Daftar, Transaksi) tidak punya pintu
  // sendiri; tiap bagian membawa menuId pintu lama modulnya, sehingga siapa
  // yang melihat menu apa tidak berubah. Pengecualian yang disengaja: 9 menu
  // Lintas Divisi dilepas dari pintu modul dan hanya dikendalikan menuId-nya.
  const dapatkan = (judul: string): NavItem => {
    const m = modul.find((x) => x.title === judul);
    if (!m) {
      console.error(`[menuItems] modul "${judul}" tidak ditemukan`);
      return { title: judul, items: [] };
    }
    return m;
  };

  // Cabut satu item (rekursif) dari sumbernya; null + log bila tidak ketemu.
  const cabut = (
    daftar: NavItem[] | undefined,
    cocok: (it: NavItem) => boolean,
    label: string,
  ): NavItem | null => {
    const cari = (arr: NavItem[] | undefined): NavItem | null => {
      if (!arr) return null;
      for (let i = 0; i < arr.length; i++) {
        const it = arr[i];
        if (cocok(it)) return arr.splice(i, 1)[0];
        const dalam = cari(it.subItems ?? it.items);
        if (dalam) return dalam;
      }
      return null;
    };
    const hasil = cari(daftar);
    if (!hasil) console.error(`[menuItems] item "${label}" tidak ditemukan`);
    return hasil;
  };

  const daftar = dapatkan("Daftar");
  const pembelian = dapatkan("Pembelian");
  const ppic = dapatkan("PPIC");
  const spanduk = dapatkan("Spanduk");
  const garmen = dapatkan("Garmen");
  const mmt = dapatkan("MMT");
  const penjualan = dapatkan("Penjualan");
  const ga = dapatkan("GA");
  const finance = dapatkan("Finance");
  const laporan = dapatkan("Laporan");
  const tools = dapatkan("Tools");

  // Menu "Daftar" milik Spanduk dan MMT pindah ke menu utama Daftar
  const daftarSpanduk = cabut(
    spanduk.items,
    (i) => i.title === "Daftar",
    "Spanduk > Daftar",
  );
  const daftarMmt = cabut(
    mmt.items,
    (i) => i.title === "Daftar",
    "MMT > Daftar",
  );

  // Menu Lintas Divisi: dicabut dari modul asalnya
  const lintasDivisi: NavItem[] = [
    cabut(ppic.items, (i) => i.to === "/garmen/cetak-bast", "Cetak BAST MAP"),
    cabut(
      spanduk.items,
      (i) => i.to === "/spanduk/mutasi-marketing",
      "Form Mutasi (Sample)",
    ),
    cabut(garmen.items, (i) => i.to === "/garmen/bahan-jadi/stbj", "STBJ"),
    cabut(
      penjualan.items,
      (i) => i.to === "/penjualan/jadwal-kirim",
      "Jadwal Kirim",
    ),
    cabut(
      penjualan.items,
      (i) => i.to === "/penjualan/approval-sj",
      "Approval Surat Jalan",
    ),
    cabut(
      garmen.items,
      (i) => i.to === "/piutang/pengajuan-dana",
      "Pengajuan Dana",
    ),
    cabut(
      penjualan.items,
      (i) => i.to === "/ppic/penjadwalan",
      "Komitmen Kirim",
    ),
    cabut(garmen.items, (i) => i.menuId === 59, "Barang (Garmen)"),
    cabut(garmen.items, (i) => i.menuId === 920, "Bahan Baku (Garmen)"),
    cabut(garmen.items, (i) => i.menuId === 188, "Cetak Barcode Koli"),
  ].filter((i): i is NavItem => i !== null);

  // Satu modul menjadi satu bagian, membawa menuId pintu lamanya
  const bagian = (m: NavItem): NavItem => ({
    title: m.title,
    icon: m.icon,
    menuId: m.menuId,
    subItems: m.items,
  });

  return [
    {
      title: "Daftar",
      icon: IconLayoutList,
      model: daftarMenu,
      tampilan: "kolom",
      items: [
        {
          title: "Umum",
          icon: IconLayoutList,
          menuId: daftar.menuId,
          subItems: daftar.items,
        },
        {
          title: "Spanduk",
          icon: IconFlag,
          menuId: spanduk.menuId,
          subItems: daftarSpanduk?.subItems,
        },
        {
          title: "MMT",
          icon: IconPrinter,
          menuId: mmt.menuId,
          subItems: daftarMmt?.subItems,
        },
      ],
    },
    {
      title: "Transaksi",
      icon: IconReceipt2,
      model: transaksiMenu,
      tampilan: "rail",
      items: [
        {
          title: "Lintas Divisi",
          icon: IconArrowsExchange,
          subItems: lintasDivisi,
        },
        bagian(pembelian),
        bagian(ppic),
        bagian(spanduk),
        bagian(garmen),
        bagian(mmt),
        bagian(penjualan),
        bagian(ga),
        bagian(finance),
      ],
    },
    { ...laporan, tampilan: "rail" },
    {
      ...tools,
      tampilan: "kolom",
      items: [{ title: "Tools", icon: tools.icon, subItems: tools.items }],
    },
  ];
};
