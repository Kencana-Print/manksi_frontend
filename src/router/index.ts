import { createRouter, createWebHistory } from "vue-router";
import { useAuthStore } from "@/stores/authStore";

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    // ── Auth ──────────────────────────────────────────────────────────
    {
      path: "/login",
      name: "Login",
      component: () => import("@/views/user/LoginView.vue"), // Sesuaikan path komponen login kamu
      meta: {
        title: "Login Aplikasi Manksi",
        layout: "BlankLayout", // <--- INI KUNCI UTAMANYA
        requiresAuth: false,
      },
    },

    // ── Dashboard ─────────────────────────────────────────────────────
    {
      path: "/",
      name: "Dashboard",
      component: () => import("@/views/DashboardView.vue"),
      meta: { layout: "DefaultLayout", requiresAuth: true, title: "Dashboard" },
    },

    // ── Daftar ───────────────────────────────────────────────────────
    {
      path: "/daftar/bahan/master",
      name: "MasterBahan",
      component: () => import("@/views/daftar/MasterBahanView.vue"),
      meta: {
        layout: "DefaultLayout",
        requiresAuth: true,
        menuId: "11",
        title: "Master Bahan",
      },
    },
    {
      path: "/daftar/bahan/jenis",
      name: "JenisBahan",
      component: () => import("@/views/daftar/JenisBahanView.vue"),
      meta: {
        layout: "DefaultLayout",
        requiresAuth: true,
        menuId: "14",
        title: "Jenis Bahan",
      },
    },
    {
      path: "/daftar/bahan/warna",
      name: "WarnaBahan",
      component: () => import("@/views/daftar/WarnaBahanView.vue"),
      meta: {
        layout: "DefaultLayout",
        requiresAuth: true,
        menuId: "26",
        title: "Warna Bahan",
      },
    },
    {
      path: "/daftar/bahan/gramasi",
      name: "GramasiBahan",
      component: () => import("@/views/daftar/GramasiBahanView.vue"),
      meta: {
        layout: "DefaultLayout",
        requiresAuth: true,
        menuId: "27",
        title: "Gramasi Bahan",
      },
    },
    {
      path: "/daftar/bahan/setting",
      name: "SettingBahan",
      component: () => import("@/views/daftar/SettingBahanView.vue"),
      meta: {
        layout: "DefaultLayout",
        requiresAuth: true,
        menuId: "28",
        title: "Setting Bahan",
      },
    },
    {
      path: "/daftar/barang-garmen",
      name: "BarangGarmen",
      component: () => import("@/views/daftar/BarangGarmenView.vue"),
      meta: {
        layout: "DefaultLayout",
        requiresAuth: true,
        menuId: "58",
        title: "Barang Garmen",
      },
    },
    {
      path: "/daftar/accesories/master",
      name: "MasterAccesories",
      component: () => import("@/views/daftar/AccesoriesView.vue"),
      meta: {
        layout: "DefaultLayout",
        requiresAuth: true,
        menuId: "30",
        title: "Master Accesories",
      },
    },
    {
      path: "/daftar/accesories/barang",
      name: "AccesoriesBarang",
      component: () => import("@/views/daftar/AccesoriesBarangView.vue"),
      meta: {
        layout: "DefaultLayout",
        requiresAuth: true,
        menuId: "31",
        title: "Barang Accesories",
      },
    },
    {
      path: "/daftar/accesories/warna",
      name: "AccesoriesWarna",
      component: () => import("@/views/daftar/AccesoriesWarnaView.vue"),
      meta: {
        layout: "DefaultLayout",
        requiresAuth: true,
        menuId: "32",
        title: "Warna Accesories",
      },
    },
    {
      path: "/daftar/accesories/ukuran",
      name: "AccesoriesUkuran",
      component: () => import("@/views/daftar/AccesoriesUkuranView.vue"),
      meta: {
        layout: "DefaultLayout",
        requiresAuth: true,
        menuId: "33",
        title: "Ukuran Accesories",
      },
    },
    {
      path: "/daftar/accesories/keterangan",
      name: "AccesoriesKeterangan",
      component: () => import("@/views/daftar/AccesoriesKeteranganView.vue"),
      meta: {
        layout: "DefaultLayout",
        requiresAuth: true,
        menuId: "34",
        title: "Keterangan Accesories",
      },
    },
    {
      path: "/daftar/sparepart",
      name: "MasterSparepart",
      component: () => import("@/views/daftar/SparepartView.vue"),
      meta: {
        layout: "DefaultLayout",
        requiresAuth: true,
        menuId: "35",
        title: "Master Sparepart",
      },
    },
    {
      path: "/daftar/obat",
      name: "MasterObat",
      component: () => import("@/views/daftar/ObatView.vue"),
      meta: {
        layout: "DefaultLayout",
        requiresAuth: true,
        menuId: "24",
        title: "Master Obat",
      },
    },
    {
      path: "/daftar/aset-perusahaan",
      name: "MasterAset",
      component: () => import("@/views/daftar/AsetPerusahaanView.vue"),
      meta: {
        layout: "DefaultLayout",
        requiresAuth: true,
        menuId: "38",
        title: "Aset Perusahaan",
      },
    },
    {
      path: "/daftar/komponen",
      name: "MasterKomponen",
      component: () => import("@/views/daftar/KomponenView.vue"),
      meta: {
        layout: "DefaultLayout",
        requiresAuth: true,
        menuId: "10",
        title: "Master Komponen",
      },
    },
    {
      path: "/daftar/komponen-spk",
      name: "IdentitasKomponenSPK",
      component: () => import("@/views/daftar/IdentitasKomponenSpkView.vue"),
      meta: {
        title: "Identitas Komponen SPK",
        layout: "DefaultLayout",
        requiresAuth: true,
        menuId: "18",
      },
    },
    {
      path: "/daftar/komponen-spk/create",
      name: "IdentitasKomponenSPKCreate",
      component: () =>
        import("@/views/daftar/IdentitasKomponenSpkCreateView.vue"),
      meta: {
        title: "Tambah Identitas Komponen",
        layout: "DefaultLayout",
        requiresAuth: true,
        menuId: "18",
        browseRoute: "IdentitasKomponenSPK",
      },
    },
    {
      path: "/daftar/komponen-spk/edit/:nomor",
      name: "IdentitasKomponenSPKEdit",
      component: () =>
        import("@/views/daftar/IdentitasKomponenSpkCreateView.vue"),
      meta: {
        title: "Ubah Identitas Komponen",
        layout: "DefaultLayout",
        requiresAuth: true,
        menuId: "18",
        browseRoute: "IdentitasKomponenSPK",
      },
    },
    {
      path: "/daftar/standart-output",
      name: "StandartOutput",
      component: () => import("@/views/daftar/StdOutputView.vue"),
      meta: {
        title: "Standar Output per Hari",
        layout: "DefaultLayout",
        requiresAuth: true,
        menuId: "29",
      },
    },
    {
      path: "/daftar/supplier",
      name: "MasterSupplier",
      component: () => import("@/views/daftar/SupplierView.vue"),
      meta: {
        title: "Master Supplier",
        layout: "DefaultLayout",
        requiresAuth: true,
        menuId: "12",
      },
    },
    {
      path: "/daftar/barang",
      name: "MasterBarang",
      component: () => import("@/views/daftar/BarangView.vue"),
      meta: {
        title: "Master Barang",
        layout: "DefaultLayout",
        requiresAuth: true,
        menuId: "19", // Di navbar sebelumnya kamu menaruh ID 58, pastikan di db Hak Akses aslinya itu ID berapa ya (19 atau 58). Sesuai prompt-mu ini 19.
      },
    },
    {
      path: "/daftar/jenis-barang",
      name: "MasterJenisBarang",
      component: () => import("@/views/daftar/JenisBarangView.vue"),
      meta: {
        title: "Master Jenis Barang",
        layout: "DefaultLayout",
        requiresAuth: true,
        menuId: "14", // Di navbar sub-menu Bahan kamu sebelumnya kasih ID 25, pastikan sesuai DB. Saya asumsikan ID-nya 14 (Sesuai delphi dan prompt-mu) atau 25.
      },
    },
    {
      path: "/daftar/customer",
      name: "MasterCustomer",
      component: () => import("@/views/daftar/CustomerView.vue"),
      meta: {
        title: "Master Customer",
        layout: "DefaultLayout",
        requiresAuth: true,
        menuId: "20",
      },
    },
    {
      path: "/daftar/jenis-order",
      name: "MasterJenisOrder",
      component: () => import("@/views/daftar/JenisOrderView.vue"),
      meta: {
        title: "Master Jenis Order",
        layout: "DefaultLayout",
        requiresAuth: true,
        menuId: "22",
      },
    },
    {
      path: "/daftar/sales",
      name: "MasterSales",
      component: () => import("@/views/daftar/SalesView.vue"),
      meta: {
        title: "Master Sales",
        layout: "DefaultLayout",
        requiresAuth: true,
        menuId: "23",
      },
    },
    {
      path: "/daftar/berita-acara",
      name: "BapProduksiBrowse",
      component: () => import("@/views/daftar/BapProduksiView.vue"),
      meta: {
        title: "BAP dan Komplain Produksi",
        layout: "DefaultLayout",
        requiresAuth: true,
        menuId: "142",
      },
    },
    {
      path: "/daftar/berita-acara/create",
      name: "BapProduksiCreate",
      component: () => import("@/views/daftar/BapProduksiCreateView.vue"),
      meta: {
        title: "Tambah BAP Produksi",
        layout: "DefaultLayout",
        requiresAuth: true,
        menuId: "142",
      },
    },
    {
      path: "/daftar/berita-acara/edit/:nomor",
      name: "BapProduksiEdit",
      component: () => import("@/views/daftar/BapProduksiCreateView.vue"),
      meta: {
        title: "Ubah BAP Produksi",
        layout: "DefaultLayout",
        requiresAuth: true,
        menuId: "142",
      },
    },
    {
      path: "/daftar/berita-acara/print/:nomor",
      name: "BapProduksiPrint",
      component: () => import("@/views/daftar/BapProduksiPrintView.vue"),
      meta: {
        title: "Cetak Berita Acara",
        layout: "BlankLayout", // Gunakan layout kosong tanpa navbar
        requiresAuth: true,
      },
    },

    // ── Pembelian ─────────────────────────────────────────────────────
    {
      path: "/pembelian/mkb",
      name: "MkbBrowse",
      component: () => import("@/views/pembelian/MkbView.vue"),
      meta: {
        title: "Memo Kebutuhan Bahan (MKB)",
        layout: "DefaultLayout",
        requiresAuth: true,
        menuId: "51",
      },
    },
    {
      path: "/pembelian/mkb/create",
      name: "MkbFormCreate",
      component: () => import("@/views/pembelian/MkbFormView.vue"),
      meta: {
        title: "Buat Memo Kebutuhan Bahan",
        layout: "DefaultLayout",
        requiresAuth: true,
        menuId: "51",
      },
    },
    {
      path: "/pembelian/mkb/edit/:nomor",
      name: "MkbFormEdit",
      component: () => import("@/views/pembelian/MkbFormView.vue"),
      meta: {
        title: "Ubah Memo Kebutuhan Bahan",
        layout: "DefaultLayout",
        requiresAuth: true,
        menuId: "51",
      },
    },
    {
      path: "/pembelian/mkb/print",
      name: "MkbPrint",
      component: () => import("@/views/pembelian/MkbPrintView.vue"),
      meta: {
        title: "Cetak MKB",
        layout: "BlankLayout",
        requiresAuth: true,
      },
    },
    {
      path: "/pembelian/po-bahan",
      name: "PoBahan",
      component: () => import("@/views/pembelian/PoBahanView.vue"),
      meta: {
        title: "PO Bahan",
        layout: "DefaultLayout",
        requiresAuth: true,
        menuId: "52",
      },
    },
    {
      path: "/pembelian/po-bahan/create",
      name: "PoBahanCreate",
      component: () => import("@/views/pembelian/PoBahanFormView.vue"),
      meta: {
        title: "Buat PO Bahan Baru",
        layout: "DefaultLayout",
        requiresAuth: true,
        menuId: "52",
        browseRoute: "PoBahan",
      },
    },
    {
      path: "/pembelian/po-bahan/edit/:nomor",
      name: "PoBahanEdit",
      component: () => import("@/views/pembelian/PoBahanFormView.vue"),
      meta: {
        title: "Ubah PO Bahan",
        layout: "DefaultLayout",
        requiresAuth: true,
        menuId: "52",
        browseRoute: "PoBahan",
      },
    },
    {
      path: "/pembelian/po-bahan/print/:nomor",
      name: "PoBahanPrint",
      component: () => import("@/views/pembelian/PoBahanPrintView.vue"),
      meta: {
        title: "Cetak PO Bahan",
        layout: "BlankLayout", // Gunakan layout kosong agar sidebar/header aplikasi tidak ikut tercetak
        requiresAuth: true,
      },
    },

    // ── Garmen ──────────────────────────────────────────────────────────
    {
      path: "/garmen/bahan-baku/minta-bahan",
      name: "GarmenMintaBahan",
      component: () => import("@/views/garmen/MintaBahanView.vue"),
      meta: {
        title: "Permintaan Bahan Baku",
        layout: "DefaultLayout",
        requiresAuth: true,
        menuId: "127",
      },
    },
    {
      path: "/garmen/bahan-baku/minta-bahan/form",
      name: "GarmenMintaBahanAdd",
      component: () => import("@/views/garmen/MintaBahanFormView.vue"),
      meta: {
        title: "Tambah Permintaan Bahan",
        layout: "DefaultLayout",
        requiresAuth: true,
        menuId: "127",
      },
    },
    {
      path: "/garmen/bahan-baku/minta-bahan/form/:nomor",
      name: "GarmenMintaBahanEdit",
      component: () => import("@/views/garmen/MintaBahanFormView.vue"),
      meta: {
        title: "Ubah Permintaan Bahan",
        layout: "DefaultLayout",
        requiresAuth: true,
        menuId: "127",
      },
    },
    {
      path: "/garmen/bahan-baku/minta-bahan/print/:nomor",
      name: "GarmenMintaBahanPrint",
      component: () => import("@/views/garmen/MintaBahanPrintView.vue"),
      meta: {
        title: "Cetak Permintaan Bahan",
        layout: "BlankLayout", // Wajib agar tidak ada navbar/sidebar saat diprint
        requiresAuth: true,
      },
    },
    {
      path: "/garmen/bahan-baku/realisasi-minta",
      name: "GarmenRealisasiBahan",
      component: () => import("@/views/garmen/RealisasiBahanView.vue"),
      meta: {
        title: "Realisasi Permintaan Bahan",
        layout: "DefaultLayout",
        requiresAuth: true,
        menuId: "108",
      },
    },
    {
      path: "/garmen/bahan-baku/realisasi-minta/form",
      name: "GarmenRealisasiBahanAdd",
      component: () => import("@/views/garmen/RealisasiBahanFormView.vue"),
      meta: {
        title: "Tambah Realisasi Permintaan",
        layout: "DefaultLayout",
        requiresAuth: true,
        menuId: "108",
      },
    },
    {
      path: "/garmen/bahan-baku/realisasi-minta/form/:nomor",
      name: "GarmenRealisasiBahanEdit",
      component: () => import("@/views/garmen/RealisasiBahanFormView.vue"),
      meta: {
        title: "Ubah Realisasi Permintaan",
        layout: "DefaultLayout",
        requiresAuth: true,
        menuId: "108",
      },
    },
    {
      path: "/garmen/bahan-baku/realisasi-minta/print/:nomor",
      name: "GarmenRealisasiBahanPrint",
      component: () => import("@/views/garmen/RealisasiBahanPrintView.vue"),
      meta: {
        title: "Cetak Realisasi Permintaan",
        layout: "BlankLayout", // Penting: Gunakan layout kosong agar navbar tidak ikut terprint
        requiresAuth: true,
      },
    },
    {
      path: "/garmen/bahan-baku/retur-bahan",
      name: "GarmenReturBahan",
      component: () => import("@/views/garmen/ReturBahanView.vue"),
      meta: {
        title: "Retur Bahan Baku",
        layout: "DefaultLayout",
        requiresAuth: true,
        menuId: "110",
      },
    },
    {
      path: "/garmen/bahan-baku/retur-bahan/tambah",
      name: "GarmenReturBahanCreate",
      component: () => import("@/views/garmen/ReturBahanFormView.vue"),
      meta: {
        title: "Buat Retur Bahan Baku",
        layout: "DefaultLayout",
        requiresAuth: true,
        menuId: "110",
      },
    },
    {
      path: "/garmen/bahan-baku/retur-bahan/ubah/:nomor",
      name: "GarmenReturBahanEdit",
      component: () => import("@/views/garmen/ReturBahanFormView.vue"),
      meta: {
        title: "Ubah Retur Bahan Baku",
        layout: "DefaultLayout",
        requiresAuth: true,
        menuId: "110",
      },
    },
    {
      path: "/garmen/bahan-baku/retur-bahan/print/:nomor",
      name: "GarmenReturBahanPrint",
      component: () => import("@/views/garmen/ReturBahanPrintView.vue"),
      meta: {
        title: "Cetak Retur Bahan",
        layout: "BlankLayout",
        requiresAuth: true,
      },
    },
    {
      path: "/garmen/bahan-baku/approve-retur",
      name: "GarmenApproveReturBahan",
      component: () => import("@/views/garmen/ApproveReturBahanView.vue"),
      meta: {
        title: "Approve Retur Bahan Baku",
        layout: "DefaultLayout",
        requiresAuth: true,
        menuId: "137",
      },
    },
    {
      path: "/garmen/bahan-baku/approve-retur/:nomor",
      name: "GarmenApproveReturBahanForm",
      component: () => import("@/views/garmen/ApproveReturBahanFormView.vue"),
      meta: {
        title: "Form Approve Retur Bahan",
        layout: "DefaultLayout",
        requiresAuth: true,
        menuId: "137",
        browseRoute: "GarmenApproveReturBahan", // Helper back button
      },
    },
    {
      path: "/garmen/bahan-baku/bpb-bahan",
      name: "BpbBahanBrowse",
      component: () => import("@/views/garmen/BpbBahanView.vue"),
      meta: {
        title: "Browse BPB Bahan",
        layout: "DefaultLayout",
        requiresAuth: true,
        menuId: "101",
      },
    },
    {
      path: "/garmen/bahan-baku/bpb-bahan/form",
      name: "BpbBahanCreate",
      component: () => import("@/views/garmen/BpbBahanFormView.vue"),
      meta: {
        title: "Tambah BPB Bahan",
        layout: "DefaultLayout",
        requiresAuth: true,
        menuId: "101",
        browseRoute: "BpbBahanBrowse",
      },
    },
    {
      path: "/garmen/bahan-baku/bpb-bahan/form/:nomor",
      name: "BpbBahanEdit",
      component: () => import("@/views/garmen/BpbBahanFormView.vue"),
      meta: {
        title: "Ubah BPB Bahan",
        layout: "DefaultLayout",
        requiresAuth: true,
        menuId: "101",
        browseRoute: "BpbBahanBrowse",
      },
    },
    {
      path: "/garmen/bahan-baku/bpb-bahan/print/:nomor",
      name: "BpbBahanPrint",
      component: () => import("@/views/garmen/BpbBahanPrintView.vue"),
      meta: {
        title: "Cetak BPB Bahan",
        layout: "BlankLayout", // Penting agar navbar tidak ikut terprint
        requiresAuth: true,
      },
    },

    {
      path: "/garmen/barang/permintaan",
      name: "GarmenPermintaanBarang",
      component: () => import("@/views/garmen/MintaBarangView.vue"),
      meta: {
        title: "Permintaan Barang Garmen",
        layout: "DefaultLayout",
        requiresAuth: true,
        menuId: "60",
      },
    },
    {
      path: "/garmen/barang/permintaan/form",
      name: "GarmenPermintaanBarangCreate",
      component: () => import("@/views/garmen/MintaBarangFormView.vue"), // File form yang akan dibuat selanjutnya
      meta: {
        title: "Buat Permintaan Barang Garmen",
        layout: "DefaultLayout",
        requiresAuth: true,
        menuId: "60",
        browseRoute: "GarmenPermintaanBarang",
      },
    },
    {
      path: "/garmen/barang/permintaan/form/:nomor",
      name: "GarmenPermintaanBarangEdit",
      component: () => import("@/views/garmen/MintaBarangFormView.vue"),
      meta: {
        title: "Ubah Permintaan Barang Garmen",
        layout: "DefaultLayout",
        requiresAuth: true,
        menuId: "60",
        browseRoute: "GarmenPermintaanBarang",
      },
    },
    {
      path: "/garmen/barang/permintaan/print/:nomor",
      name: "MintaBarangPrint",
      component: () => import("@/views/garmen/MintaBarangPrintView.vue"),
      meta: { requiresAuth: true, layout: "BlankLayout" }, // pastikan layout blank agar navbar tidak ikut ter-print
    },
    {
      path: "/garmen/barang/realisasi",
      name: "GarmenRealisasiBarang",
      component: () => import("@/views/garmen/RealisasiBarangView.vue"),
      meta: {
        title: "Realisasi Permintaan Barang",
        layout: "DefaultLayout",
        requiresAuth: true,
        menuId: "62",
      },
    },
    {
      path: "/garmen/barang/realisasi/form",
      name: "GarmenRealisasiBarangCreate",
      component: () => import("@/views/garmen/RealisasiBarangFormView.vue"),
      meta: {
        title: "Tambah Realisasi Permintaan",
        layout: "DefaultLayout",
        requiresAuth: true,
        menuId: "62",
        browseRoute: "GarmenRealisasiBarang", // Fungsi "kembali" di BaseForm
      },
    },
    {
      path: "/garmen/barang/realisasi/form/:nomor",
      name: "GarmenRealisasiBarangEdit",
      component: () => import("@/views/garmen/RealisasiBarangFormView.vue"),
      meta: {
        title: "Ubah Realisasi Permintaan",
        layout: "DefaultLayout",
        requiresAuth: true,
        menuId: "62",
        browseRoute: "GarmenRealisasiBarang",
      },
    },
    {
      path: "/garmen/barang/realisasi/print/:nomor",
      name: "GarmenRealisasiBarangPrint",
      component: () => import("@/views/garmen/RealisasiBarangPrintView.vue"),
      meta: {
        title: "Cetak Realisasi Permintaan",
        layout: "BlankLayout", // WAJIB BLANK LAYOUT
        requiresAuth: true,
      },
    },
    {
      path: "/garmen/barang/permintaan-pembelian",
      name: "PermintaanPembelianGarmen",
      component: () => import("@/views/garmen/PermintaanPembelianView.vue"),
      meta: {
        title: "Permintaan Pembelian Garmen",
        layout: "DefaultLayout",
        requiresAuth: true,
        menuId: "65",
      },
    },
    {
      path: "/garmen/barang/permintaan-pembelian/create",
      name: "PermintaanPembelianFormCreate",
      component: () => import("@/views/garmen/PermintaanPembelianFormView.vue"),
      meta: {
        title: "Tambah Permintaan Pembelian",
        layout: "DefaultLayout",
        requiresAuth: true,
        menuId: "65",
        browseRoute: "PermintaanPembelianGarmen",
      },
    },
    {
      path: "/garmen/barang/permintaan-pembelian/edit/:nomor",
      name: "PermintaanPembelianFormEdit",
      component: () => import("@/views/garmen/PermintaanPembelianFormView.vue"),
      meta: {
        title: "Ubah Permintaan Pembelian",
        layout: "DefaultLayout",
        requiresAuth: true,
        menuId: "65",
        browseRoute: "PermintaanPembelianGarmen",
      },
    },
    {
      path: "/garmen/barang/permintaan-pembelian/print/:nomor",
      name: "PermintaanPembelianPrint",
      component: () =>
        import("@/views/garmen/PermintaanPembelianPrintView.vue"),
      meta: {
        title: "Cetak Permintaan Pembelian",
        layout: "BlankLayout", // Wajib menggunakan BlankLayout agar sidebar/navbar hilang
        requiresAuth: true,
      },
    },
    {
      path: "/garmen/barang/mutasi-out",
      name: "MutasiOutGarmenBrowse",
      component: () => import("@/views/garmen/MutasiOutBarangView.vue"),
      meta: {
        title: "Mutasi Out Garmen",
        layout: "DefaultLayout",
        requiresAuth: true,
        menuId: "70",
      },
    },
    {
      path: "/garmen/barang/mutasi-out/create",
      name: "MutasiOutGarmenFormCreate",
      component: () => import("@/views/garmen/MutasiOutBarangFormView.vue"),
      meta: {
        title: "Tambah Mutasi Out",
        layout: "DefaultLayout",
        requiresAuth: true,
        menuId: "70",
        browseRoute: "MutasiOutGarmenBrowse",
      },
    },
    {
      path: "/garmen/barang/mutasi-out/edit/:nomor",
      name: "MutasiOutGarmenFormEdit",
      component: () => import("@/views/garmen/MutasiOutBarangFormView.vue"),
      meta: {
        title: "Ubah Mutasi Out",
        layout: "DefaultLayout",
        requiresAuth: true,
        menuId: "70",
        browseRoute: "MutasiOutGarmenBrowse",
      },
    },
    {
      path: "/garmen/barang/mutasi-out/print/:nomor",
      name: "MutasiOutGarmenPrint",
      component: () => import("@/views/garmen/MutasiOutBarangPrintView.vue"),
      meta: {
        title: "Cetak Mutasi Out Garmen",
        layout: "BlankLayout", // WAJIB
        requiresAuth: true,
      },
    },
    {
      path: "/garmen/barang/mutasi-in",
      name: "MutasiInGarmenBrowse",
      component: () => import("@/views/garmen/MutasiInBarangView.vue"),
      meta: {
        title: "Mutasi In Garmen",
        layout: "DefaultLayout",
        requiresAuth: true,
        menuId: "69", // Sesuai ID di database Delphi
      },
    },
    {
      path: "/garmen/barang/po-nonbahan",
      name: "PoNonBahanGarmenBrowse",
      component: () => import("@/views/garmen/PoNonBahanView.vue"),
      meta: {
        title: "PO Non Bahan Garmen",
        layout: "DefaultLayout",
        requiresAuth: true,
        menuId: "66", // Menu ID sesuai Delphi
      },
    },
    {
      path: "/garmen/barang/po-nonbahan/create",
      name: "PoNonBahanGarmenFormCreate",
      component: () => import("@/views/garmen/PoNonBahanFormView.vue"), // Placeholder
      meta: {
        title: "Tambah PO Non Bahan",
        layout: "DefaultLayout",
        requiresAuth: true,
        menuId: "66",
        browseRoute: "PoNonBahanGarmenBrowse",
      },
    },
    {
      path: "/garmen/barang/po-nonbahan/edit/:nomor",
      name: "PoNonBahanGarmenFormEdit",
      component: () => import("@/views/garmen/PoNonBahanFormView.vue"), // Placeholder
      meta: {
        title: "Ubah PO Non Bahan",
        layout: "DefaultLayout",
        requiresAuth: true,
        menuId: "66",
        browseRoute: "PoNonBahanGarmenBrowse",
      },
    },
    {
      path: "/garmen/barang/po-nonbahan/print/:nomor",
      name: "PoNonBahanGarmenPrint",
      component: () => import("@/views/garmen/PoNonBahanPrintView.vue"), // Placeholder
      meta: {
        title: "Cetak PO Non Bahan",
        layout: "BlankLayout",
        requiresAuth: true,
      },
    },
    {
      path: "/garmen/barang/bpb-nonbahan",
      name: "BpbNonBahanGarmenBrowse",
      component: () => import("@/views/garmen/BpbNonBahanView.vue"),
      meta: {
        title: "BPB Non Bahan Garmen",
        layout: "DefaultLayout",
        requiresAuth: true,
        menuId: "67",
      },
    },
    {
      path: "/garmen/barang/bpb-nonbahan/create",
      name: "BpbNonBahanGarmenFormCreate",
      component: () => import("@/views/garmen/BpbNonBahanFormView.vue"),
      meta: {
        title: "Tambah BPB Non Bahan",
        layout: "DefaultLayout",
        requiresAuth: true,
        menuId: "67",
        browseRoute: "BpbNonBahanGarmenBrowse",
      },
    },
    {
      path: "/garmen/barang/bpb-nonbahan/edit/:nomor",
      name: "BpbNonBahanGarmenFormEdit",
      component: () => import("@/views/garmen/BpbNonBahanFormView.vue"),
      meta: {
        title: "Ubah BPB Non Bahan",
        layout: "DefaultLayout",
        requiresAuth: true,
        menuId: "67",
        browseRoute: "BpbNonBahanGarmenBrowse",
      },
    },

    {
      path: "/garmen/po-internal-map",
      name: "PoInternalMapBrowse",
      component: () => import("@/views/garmen/PoInternalMapView.vue"),
      meta: {
        title: "PO Internal MAP",
        layout: "DefaultLayout",
        requiresAuth: true,
        menuId: "138", // Sesuai instruksi: Menu ID = 138
      },
    },
    {
      path: "/garmen/po-internal-map/create",
      name: "PoInternalMapFormCreate",
      component: () => import("@/views/garmen/PoInternalMapFormView.vue"),
      meta: {
        title: "Tambah PO Internal MAP",
        layout: "DefaultLayout",
        requiresAuth: true,
        menuId: "138",
      },
    },
    {
      path: "/garmen/po-internal-map/edit/:nomor",
      name: "PoInternalMapFormEdit",
      component: () => import("@/views/garmen/PoInternalMapFormView.vue"),
      meta: {
        title: "Edit PO Internal MAP",
        layout: "DefaultLayout",
        requiresAuth: true,
        menuId: "138",
      },
    },
    {
      path: "/garmen/po-internal-map/print/:nomor",
      name: "PoInternalMapPrint",
      component: () => import("@/views/garmen/PoInternalMapPrintView.vue"),
      meta: {
        title: "Cetak PO Internal MAP",
        layout: "BlankLayout", // Wajib agar full layar putih
        requiresAuth: true,
      },
    },
    {
      path: "/garmen/po-internal-map/surat-jalan",
      name: "PoInternalMapSjBrowse",
      component: () => import("@/views/garmen/PoInternalMapSjView.vue"),
      meta: {
        title: "Surat Jalan PO Internal MAP",
        layout: "DefaultLayout",
        requiresAuth: true,
        menuId: "139",
      },
    },
    {
      path: "/garmen/po-internal-map/surat-jalan/create",
      name: "PoInternalMapSjFormCreate",
      component: () => import("@/views/garmen/PoInternalMapSjFormView.vue"),
      meta: {
        title: "Tambah Surat Jalan MAP",
        layout: "DefaultLayout",
        requiresAuth: true,
        menuId: "139",
        browseRoute: "PoInternalMapSjBrowse", // Helper untuk tombol kembali
      },
    },
    {
      path: "/garmen/po-internal-map/surat-jalan/edit/:nomor",
      name: "PoInternalMapSjFormEdit",
      component: () => import("@/views/garmen/PoInternalMapSjFormView.vue"),
      meta: {
        title: "Ubah Surat Jalan MAP",
        layout: "DefaultLayout",
        requiresAuth: true,
        menuId: "139",
        browseRoute: "PoInternalMapSjBrowse",
      },
    },
    {
      path: "/garmen/po-internal-map/surat-jalan/print/:nomor",
      name: "PoInternalMapSjPrint",
      component: () => import("@/views/garmen/PoInternalMapSjPrintView.vue"), // Pastikan file print sudah dibuat
      meta: {
        title: "Cetak SJ MAP",
        layout: "BlankLayout",
        requiresAuth: true,
      },
    },
    {
      path: "/garmen/po-internal-map/approve",
      name: "PoInternalMapApprove",
      component: () => import("@/views/garmen/PoInternalMapApproveView.vue"),
      meta: {
        title: "Approval Surat Jalan MAP",
        layout: "DefaultLayout",
        requiresAuth: true,
        menuId: "140",
      },
    },
    {
      path: "/garmen/cetak-bast",
      name: "CetakBastBrowse",
      component: () => import("@/views/garmen/CetakBastView.vue"),
      meta: {
        title: "Cetak BAST",
        layout: "DefaultLayout",
        requiresAuth: true,
        menuId: "117",
      },
    },
    {
      path: "/garmen/cetak-bast/create",
      name: "CetakBastFormCreate",
      component: () => import("@/views/garmen/CetakBastFormView.vue"),
      meta: {
        title: "Buat BAST Baru",
        layout: "DefaultLayout",
        requiresAuth: true,
        menuId: "117",
      },
    },
    {
      path: "/garmen/cetak-bast/edit/:nomor",
      name: "CetakBastFormEdit",
      component: () => import("@/views/garmen/CetakBastFormView.vue"),
      meta: {
        title: "Ubah BAST",
        layout: "DefaultLayout",
        requiresAuth: true,
        menuId: "117",
      },
    },
    {
      path: "/garmen/cetak-bast/print/:nomor",
      name: "CetakBastPrint",
      component: () => import("@/views/garmen/CetakBastPrintView.vue"),
      meta: {
        title: "Cetak BAST MAP",
        layout: "BlankLayout",
        requiresAuth: true,
      },
    },

    // ── Penjualan ───────────────────────────────────────────────────────
    {
      path: "/penjualan/mppb",
      name: "MppbBrowse",
      component: () => import("@/views/penjualan/MppbView.vue"),
      meta: {
        title: "Memo Permintaan Pembelian Bahan",
        layout: "DefaultLayout",
        requiresAuth: true,
        menuId: "150",
      },
    },
    {
      path: "/penjualan/mppb/create",
      name: "MppbFormCreate",
      component: () => import("@/views/penjualan/MppbFormView.vue"),
      meta: {
        title: "Buat MPPB Baru",
        layout: "DefaultLayout",
        requiresAuth: true,
        menuId: "150",
        browseRoute: "MppbBrowse",
      },
    },
    {
      path: "/penjualan/mppb/edit/:nomor",
      name: "MppbFormEdit",
      component: () => import("@/views/penjualan/MppbFormView.vue"),
      meta: {
        title: "Ubah MPPB",
        layout: "DefaultLayout",
        requiresAuth: true,
        menuId: "150",
        browseRoute: "MppbBrowse",
      },
    },
    {
      path: "/penjualan/mppb/print/:nomor",
      name: "MppbPrint",
      component: () => import("@/views/penjualan/MppbPrintView.vue"),
      meta: {
        title: "Cetak MPPB",
        layout: "BlankLayout",
        requiresAuth: true,
        menuId: "150",
      },
    },

    {
      path: "/penjualan/minta-harga",
      name: "PermintaanHarga",
      component: () => import("@/views/penjualan/MintaHargaView.vue"),
      meta: {
        title: "Permintaan Harga",
        layout: "DefaultLayout",
        requiresAuth: true,
        menuId: "166", // Wajib sama dengan ID di database
      },
    },
    // Tambah Permintaan Harga (Baru)
    {
      path: "/penjualan/minta-harga/create",
      name: "PermintaanHargaCreate",
      component: () => import("@/views/penjualan/MintaHargaFormView.vue"),
      meta: {
        title: "Tambah Permintaan Harga",
        layout: "DefaultLayout",
        requiresAuth: true,
        menuId: "166",
      },
    },
    // Ubah Permintaan Harga (Edit)
    {
      path: "/penjualan/minta-harga/edit/:nomor",
      name: "PermintaanHargaEdit",
      component: () => import("@/views/penjualan/MintaHargaFormView.vue"),
      meta: {
        title: "Ubah Permintaan Harga",
        layout: "DefaultLayout",
        requiresAuth: true,
        menuId: "166",
      },
    },
    {
      path: "/penjualan/penawaran",
      name: "PenawaranBrowse",
      component: () => import("@/views/penjualan/PenawaranView.vue"),
      meta: {
        title: "Penawaran",
        layout: "DefaultLayout",
        requiresAuth: true,
        menuId: "151", // Sesuai ID di database Delphi
      },
    },
    {
      path: "/penjualan/penawaran/create",
      name: "PenawaranFormCreate",
      component: () => import("@/views/penjualan/PenawaranFormView.vue"),
      meta: {
        title: "Tambah Penawaran",
        layout: "DefaultLayout",
        requiresAuth: true,
        menuId: "151",
      },
    },
    {
      path: "/penjualan/penawaran/edit/:nomor",
      name: "PenawaranFormEdit",
      component: () => import("@/views/penjualan/PenawaranFormView.vue"),
      meta: {
        title: "Ubah Penawaran",
        layout: "DefaultLayout",
        requiresAuth: true,
        menuId: "151",
      },
    },
    {
      path: "/penjualan/penawaran/print/:nomor",
      name: "PenawaranPrint",
      component: () => import("@/views/penjualan/PenawaranPrintView.vue"),
      meta: {
        title: "Cetak Penawaran",
        layout: "BlankLayout", // WAJIB BlankLayout
        requiresAuth: true,
      },
    },
    {
      path: "/penjualan/sales-order",
      name: "SalesOrderBrowse",
      component: () => import("@/views/penjualan/SalesOrderView.vue"),
      meta: {
        title: "Sales Order",
        layout: "DefaultLayout",
        requiresAuth: true,
        menuId: "172",
      },
    },
    {
      path: "/penjualan/sales-order/create",
      name: "SalesOrderCreate",
      component: () => import("@/views/penjualan/SalesOrderFormView.vue"),
      meta: {
        title: "Tambah Sales Order",
        layout: "DefaultLayout",
        requiresAuth: true,
        menuId: "172",
        browseRoute: "SalesOrderBrowse",
      },
    },
    {
      path: "/penjualan/sales-order/edit/:nomor",
      name: "SalesOrderEdit",
      component: () => import("@/views/penjualan/SalesOrderFormView.vue"),
      meta: {
        title: "Ubah Sales Order",
        layout: "DefaultLayout",
        requiresAuth: true,
        menuId: "172",
        browseRoute: "SalesOrderBrowse",
      },
    },
    {
      path: "/penjualan/sales-order/print/:nomor",
      name: "SalesOrderPrint",
      component: () => import("@/views/penjualan/SalesOrderPrintView.vue"),
      meta: {
        title: "Cetak SPK",
        layout: "BlankLayout",
        requiresAuth: true,
      },
    },

    {
      path: "/penjualan/invoice-proforma",
      name: "InvoiceProformaBrowse",
      component: () => import("@/views/penjualan/InvoiceProformaView.vue"),
      meta: {
        title: "Invoice Proforma",
        layout: "DefaultLayout",
        requiresAuth: true,
        menuId: "157",
      },
    },
    {
      path: "/penjualan/invoice-proforma/create",
      name: "InvoiceProformaCreate",
      component: () => import("@/views/penjualan/InvoiceProformaFormView.vue"),
      meta: {
        title: "Tambah Invoice Proforma",
        layout: "DefaultLayout",
        requiresAuth: true,
        menuId: "157",
        browseRoute: "InvoiceProformaBrowse", // Helper kembali
      },
    },
    {
      path: "/penjualan/invoice-proforma/edit/:nomor",
      name: "InvoiceProformaEdit",
      component: () => import("@/views/penjualan/InvoiceProformaFormView.vue"),
      meta: {
        title: "Edit Invoice Proforma",
        layout: "DefaultLayout",
        requiresAuth: true,
        menuId: "157",
        browseRoute: "InvoiceProformaBrowse",
      },
    },
    {
      path: "/penjualan/invoice-proforma/print/:nomor",
      name: "InvoiceProformaPrint",
      component: () => import("@/views/penjualan/InvoiceProformaPrintView.vue"),
      meta: {
        title: "Cetak Invoice Proforma",
        layout: "BlankLayout",
        requiresAuth: true,
      },
    },

    {
      path: "/penjualan/map",
      name: "MapBrowse",
      component: () => import("@/views/penjualan/MapView.vue"),
      meta: {
        title: "Memo Approval Produk (MAP)",
        requiresAuth: true,
        menuId: "162",
      },
    },
    {
      path: "/penjualan/map/form",
      name: "MapFormCreate",
      component: () => import("@/views/penjualan/MapFormView.vue"),
      meta: { title: "Tambah MAP", requiresAuth: true, menuId: "162" },
    },
    {
      path: "/penjualan/map/form/:nomor",
      name: "MapFormEdit",
      component: () => import("@/views/penjualan/MapFormView.vue"),
      meta: { title: "Edit MAP", requiresAuth: true, menuId: "162" },
    },
    {
      path: "/penjualan/map/print/:nomor",
      name: "MapPrintView",
      component: () => import("@/views/penjualan/MapPrintView.vue"),
      meta: { title: "Cetak MAP", layout: "BlankLayout", requiresAuth: true },
    },
    {
      path: "/penjualan/sj-map",
      name: "SjMapBrowse",
      component: () => import("@/views/penjualan/SjMapView.vue"),
      meta: {
        title: "Surat Jalan MAP",
        layout: "DefaultLayout",
        requiresAuth: true,
        menuId: "163",
      },
    },
    {
      path: "/penjualan/sj-map/create",
      name: "SjMapCreate",
      component: () => import("@/views/penjualan/SjMapFormView.vue"),
      meta: {
        title: "Buat Surat Jalan MAP",
        layout: "DefaultLayout",
        requiresAuth: true,
        menuId: "163",
        browseRoute: "SjMapBrowse",
      },
    },
    {
      path: "/penjualan/sj-map/edit/:nomor",
      name: "SjMapEdit",
      component: () => import("@/views/penjualan/SjMapFormView.vue"),
      meta: {
        title: "Ubah Surat Jalan MAP",
        layout: "DefaultLayout",
        requiresAuth: true,
        menuId: "163",
        browseRoute: "SjMapBrowse",
      },
    },
    {
      path: "/penjualan/sj-map/print/:nomor",
      name: "SjMapPrint",
      component: () => import("@/views/penjualan/SjMapPrintView.vue"),
      meta: {
        title: "Cetak Surat Jalan MAP",
        layout: "BlankLayout",
        requiresAuth: true,
      },
    },
    {
      path: "/penjualan/update-sj-map",
      name: "UpdateSjMapBrowse",
      component: () => import("@/views/penjualan/UpdateSjMapView.vue"),
      meta: {
        title: "Update Status SJ Memo",
        layout: "DefaultLayout",
        requiresAuth: true,
        menuId: "164",
      },
    },

    // ── Piutang ───────────────────────────────────────────────────
    {
      path: "/piutang/penerimaan/giro",
      name: "PenerimaanGiro",
      component: () => import("@/views/piutang/penerimaan/GiroView.vue"),
      meta: {
        title: "Penerimaan Giro",
        layout: "DefaultLayout",
        requiresAuth: true,
        menuId: "251",
      },
    },
    {
      path: "/piutang/penerimaan/giro/create",
      name: "PenerimaanGiroCreate",
      component: () => import("@/views/piutang/penerimaan/GiroFormView.vue"),
      meta: {
        title: "Tambah Penerimaan Giro",
        layout: "DefaultLayout",
        requiresAuth: true,
        menuId: "251",
      },
    },
    {
      path: "/piutang/penerimaan/giro/edit/:nomor",
      name: "PenerimaanGiroEdit",
      component: () => import("@/views/piutang/penerimaan/GiroFormView.vue"),
      meta: {
        title: "Ubah Penerimaan Giro",
        layout: "DefaultLayout",
        requiresAuth: true,
        menuId: "251",
      },
    },
    {
      path: "/piutang/penerimaan/cash",
      name: "PenerimaanCash",
      component: () => import("@/views/piutang/penerimaan/CashView.vue"),
      meta: {
        title: "Penerimaan Cash",
        layout: "DefaultLayout",
        requiresAuth: true,
        menuId: "252",
      },
    },
    {
      path: "/piutang/penerimaan/cash/create",
      name: "PenerimaanCashCreate",
      component: () => import("@/views/piutang/penerimaan/CashFormView.vue"),
      meta: {
        title: "Tambah Penerimaan Cash",
        layout: "DefaultLayout",
        requiresAuth: true,
        menuId: "252",
      },
    },
    {
      path: "/piutang/penerimaan/cash/edit/:nomor",
      name: "PenerimaanCashEdit",
      component: () => import("@/views/piutang/penerimaan/CashFormView.vue"),
      meta: {
        title: "Ubah Penerimaan Cash",
        layout: "DefaultLayout",
        requiresAuth: true,
        menuId: "252",
      },
    },
    {
      path: "/piutang/penerimaan/transfer",
      name: "PenerimaanTransfer",
      component: () => import("@/views/piutang/penerimaan/TransferView.vue"),
      meta: {
        title: "Penerimaan Transfer",
        layout: "DefaultLayout",
        requiresAuth: true,
        menuId: "253",
      },
    },
    {
      path: "/piutang/penerimaan/transfer/create",
      name: "PenerimaanTransferCreate",
      component: () =>
        import("@/views/piutang/penerimaan/TransferFormView.vue"),
      meta: {
        title: "Tambah Penerimaan Transfer",
        layout: "DefaultLayout",
        requiresAuth: true,
        menuId: "253",
      },
    },
    {
      path: "/piutang/penerimaan/transfer/edit/:nomor",
      name: "PenerimaanTransferEdit",
      component: () =>
        import("@/views/piutang/penerimaan/TransferFormView.vue"),
      meta: {
        title: "Ubah Penerimaan Transfer",
        layout: "DefaultLayout",
        requiresAuth: true,
        menuId: "253",
      },
    },
    {
      path: "/piutang/penerimaan/potongan",
      name: "PenerimaanPotongan",
      component: () => import("@/views/piutang/penerimaan/PotonganView.vue"),
      meta: {
        title: "Penerimaan Potongan",
        layout: "DefaultLayout",
        requiresAuth: true,
        menuId: "254",
      },
    },
    {
      path: "/piutang/penerimaan/potongan/create",
      name: "PenerimaanPotonganCreate",
      component: () =>
        import("@/views/piutang/penerimaan/PotonganFormView.vue"),
      meta: {
        title: "Tambah Penerimaan Potongan",
        layout: "DefaultLayout",
        requiresAuth: true,
        menuId: "254",
      },
    },
    {
      path: "/piutang/penerimaan/potongan/edit/:nomor",
      name: "PenerimaanPotonganEdit",
      component: () =>
        import("@/views/piutang/penerimaan/PotonganFormView.vue"),
      meta: {
        title: "Ubah Penerimaan Potongan",
        layout: "DefaultLayout",
        requiresAuth: true,
        menuId: "254",
      },
    },
    {
      path: "/piutang/pelunasan",
      name: "PelunasanPiutangBrowse",
      component: () => import("@/views/piutang/PelunasanView.vue"),
      meta: {
        title: "Pelunasan Piutang",
        layout: "DefaultLayout",
        requiresAuth: true,
        menuId: "255",
      },
    },
    {
      path: "/piutang/pelunasan/create",
      name: "PelunasanPiutangCreate",
      component: () => import("@/views/piutang/PelunasanFormView.vue"),
      meta: {
        title: "Input Pelunasan Piutang",
        layout: "DefaultLayout",
        requiresAuth: true,
        menuId: "255", // Tetap menggunakan menuId parent agar hak akses sinkron
        browseRoute: "PelunasanPiutangBrowse", // Untuk tombol back useForm
      },
    },
    {
      path: "/piutang/pelunasan/edit/:nomor",
      name: "PelunasanPiutangEdit",
      component: () => import("@/views/piutang/PelunasanFormView.vue"),
      meta: {
        title: "Ubah Pelunasan Piutang",
        layout: "DefaultLayout",
        requiresAuth: true,
        menuId: "255",
        browseRoute: "PelunasanPiutangBrowse",
      },
    },
    {
      path: "/piutang/pelunasan/print/:nomor",
      name: "PelunasanPiutangPrint",
      component: () => import("@/views/piutang/PelunasanPrintView.vue"),
      meta: {
        title: "Cetak Pelunasan Piutang",
        layout: "BlankLayout",
        requiresAuth: true,
        menuId: "255",
      },
    },

    // ── Laporan ───────────────────────────────────────────────────
    {
      path: "/laporan/gudang-garmen/stok-bahan-barcode",
      name: "LapStokBahanBarcode",
      component: () =>
        import("@/views/laporan/gudang-garmen/LaporanStokBahanBarcodeView.vue"),
      meta: {
        title: "Laporan Stok Bahan Barcode",
        layout: "DefaultLayout",
        requiresAuth: true,
        menuId: "501",
      },
    },
    {
      path: "/laporan/gudang-garmen/kartu-stok-barang",
      name: "LapKartuStokBarang",
      component: () =>
        import("@/views/laporan/gudang-garmen/KartuStokBarangView.vue"),
      meta: {
        title: "Kartu Stok Barang",
        layout: "DefaultLayout",
        requiresAuth: true,
        menuId: "503",
      },
    },
    {
      path: "/laporan/gudang-garmen/spk-belum-mkb",
      name: "LapSpkBelumMkb",
      component: () =>
        import("@/views/laporan/gudang-garmen/SpkBelumMkbView.vue"),
      meta: {
        title: "Laporan SPK Belum Ada MKB",
        layout: "DefaultLayout",
        requiresAuth: true,
        menuId: "510",
      },
    },
    {
      path: "/laporan/gudang-garmen/po-bahan-vs-mkb",
      name: "LapPoBahanVsMkb",
      component: () =>
        import("@/views/laporan/gudang-garmen/PoBahanVsMkbView.vue"),
      meta: {
        title: "PO Bahan vs MKB",
        layout: "DefaultLayout",
        requiresAuth: true,
        menuId: "511",
      },
    },
    {
      path: "/laporan/gudang-garmen/po-bahan-vs-bpb",
      name: "LapPoBahanVsBpb",
      component: () =>
        import("@/views/laporan/gudang-garmen/PoBahanVsBpbView.vue"),
      meta: {
        title: "PO Bahan vs BPB",
        layout: "DefaultLayout",
        requiresAuth: true,
        menuId: "512",
      },
    },

    {
      path: "/laporan/marketing/penawaran-vs-map",
      name: "LapPenawaranVsMap",
      component: () =>
        import("@/views/laporan/marketing/PenawaranVsMapView.vue"),
      meta: {
        title: "Penawaran vs MAP",
        layout: "DefaultLayout",
        requiresAuth: true,
        menuId: "966",
      },
    },
    {
      path: "/laporan/marketing/map-belum-realisasi",
      name: "LapMapBelumRealisasi",
      component: () =>
        import("@/views/laporan/marketing/MapBelumRealisasiView.vue"),
      meta: {
        title: "MAP Belum Terealisasi",
        layout: "DefaultLayout",
        requiresAuth: true,
        menuId: "966",
      },
    },
    {
      path: "/laporan/marketing/spk-belum-closing",
      name: "LapSpkBelumClosing",
      component: () =>
        import("@/views/laporan/marketing/SpkBelumClosingView.vue"),
      meta: {
        title: "SPK Belum Closing",
        layout: "DefaultLayout",
        requiresAuth: true,
        menuId: "966",
      },
    },
    {
      path: "/laporan/marketing/realisasi-penjualan",
      name: "LapRealisasiPenjualan",
      component: () =>
        import("@/views/laporan/marketing/RealisasiPenjualanView.vue"),
      meta: {
        title: "Realisasi Penjualan",
        layout: "DefaultLayout",
        requiresAuth: true,
        menuId: "966",
      },
    },
    {
      path: "/laporan/marketing/rekap-map",
      name: "LapRekapMap",
      component: () => import("@/views/laporan/marketing/RekapMapView.vue"),
      meta: {
        title: "Rekap MAP",
        layout: "DefaultLayout",
        requiresAuth: true,
        menuId: "311",
      },
    },
    {
      path: "/laporan/marketing/rekap-penawaran",
      name: "LapRekapPenawaran",
      component: () =>
        import("@/views/laporan/marketing/RekapPenawaranView.vue"),
      meta: {
        title: "Rekap Penawaran",
        layout: "DefaultLayout",
        requiresAuth: true,
        menuId: "310",
      },
    },
    {
      path: "/laporan/marketing/kunjungan-sales",
      name: "LapKunjunganSales",
      component: () =>
        import("@/views/laporan/marketing/KunjunganSalesView.vue"),
      meta: {
        title: "Laporan Kunjungan Sales",
        layout: "DefaultLayout",
        requiresAuth: true,
        menuId: "313",
      },
    },

    {
      path: "/laporan/penjualan/penawaran-vs-spk",
      name: "LapPenawaranVsSpk",
      component: () =>
        import("@/views/laporan/penjualan/PenawaranVsSpkView.vue"),
      meta: {
        title: "Penawaran vs SPK",
        layout: "DefaultLayout",
        requiresAuth: true,
        menuId: "301",
      },
    },
    {
      path: "/laporan/penjualan/realisasi-penawaran",
      name: "LapRealisasiPenawaran",
      component: () =>
        import("@/views/laporan/penjualan/RealisasiPenawaranView.vue"),
      meta: {
        title: "Laporan Realisasi Penawaran",
        layout: "DefaultLayout",
        requiresAuth: true,
      },
    },
    {
      path: "/laporan/penjualan/map-vs-sj",
      name: "LapMapVsSj",
      component: () => import("@/views/laporan/penjualan/MapVsSjView.vue"),
      meta: {
        title: "Laporan MAP vs Surat Jalan",
        layout: "DefaultLayout",
        requiresAuth: true,
        menuId: "307",
      },
    },
    {
      path: "/laporan/penjualan/map-vs-spk",
      name: "LapMapVsSpk",
      component: () => import("@/views/laporan/penjualan/MapVsSpkView.vue"),
      meta: {
        title: "Laporan MAP vs SPK",
        layout: "DefaultLayout",
        requiresAuth: true,
        menuId: "308",
      },
    },

    {
      path: "/laporan/piutang/detail-piutang",
      name: "LapDetailPiutang",
      component: () => import("@/views/laporan/piutang/DetailPiutangView.vue"),
      meta: {
        title: "Laporan Detail Piutang",
        layout: "DefaultLayout",
        requiresAuth: true,
        menuId: "968", // Pakai ID parent sebagai penjaga halaman
      },
    },
    {
      path: "/laporan/piutang/rekap-piutang",
      name: "LapRekapPiutang",
      component: () => import("@/views/laporan/piutang/RekapPiutangView.vue"),
      meta: {
        title: "Laporan Rekap Piutang",
        layout: "DefaultLayout",
        requiresAuth: true,
        menuId: "968",
      },
    },
    {
      path: "/laporan/piutang/kartu-piutang",
      name: "LapKartuPiutang",
      component: () => import("@/views/laporan/piutang/KartuPiutangView.vue"),
      meta: {
        title: "Laporan Kartu Piutang",
        layout: "DefaultLayout",
        requiresAuth: true,
        menuId: "968", // Parent Menu ID Laporan Piutang
      },
    },
    {
      path: "/laporan/piutang/daftar-penerimaan",
      name: "LapDaftarPenerimaan",
      component: () =>
        import("@/views/laporan/piutang/DaftarPenerimaanView.vue"),
      meta: {
        title: "Laporan Daftar Penerimaan",
        layout: "DefaultLayout",
        requiresAuth: true,
        menuId: "968", // Mengikuti hak akses parent menu piutang
      },
    },
    {
      path: "/laporan/piutang/cek-gagal-link",
      name: "LapCekGagalLink",
      component: () => import("@/views/laporan/piutang/CekGagalLinkView.vue"),
      meta: {
        title: "Cek Gagal Link Pembayaran",
        layout: "DefaultLayout",
        requiresAuth: true,
        menuId: "968", // Mengikuti parent Laporan Piutang
      },
    },

    // ── Tools ───────────────────────────────────────────────────
    {
      path: "/tools/users",
      name: "MasterUser",
      component: () => import("@/views/tools/UserView.vue"),
      meta: {
        title: "Master User",
        layout: "DefaultLayout",
        requiresAuth: true,
        // Tidak perlu menuId karena backend menggunakan requireAdmin
      },
    },
    {
      path: "/tools/approval",
      name: "ToolsApproval",
      component: () => import("@/views/tools/approval/ToolsApprovalView.vue"),
      meta: {
        title: "Tools Approval",
        layout: "DefaultLayout",
        requiresAuth: true,
        // Tidak perlu menuId tunggal di meta sini, karena divalidasi di dalam halamannya
      },
    },

    // ── Error Pages ───────────────────────────────────────────────────
    {
      path: "/403",
      name: "Unauthorized",
      component: () => import("@/views/errors/UnauthorizedView.vue"),
      meta: {
        layout: "AuthLayout",
        requiresAuth: false,
        title: "Akses Ditolak",
      },
    },
    {
      // Catch-all — HARUS paling bawah
      path: "/:pathMatch(.*)*",
      name: "NotFound",
      component: () => import("@/views/errors/NotFoundView.vue"),
      meta: {
        layout: "AuthLayout",
        requiresAuth: false,
        title: "Halaman Tidak Ditemukan",
      },
    },
  ],
});

// ── Navigation Guard ──────────────────────────────────────────────────
router.beforeEach((to, _from) => {
  const authStore = useAuthStore();

  // Update judul tab browser
  const pageTitle = to.meta?.title || to.name || "App";
  document.title = `${String(pageTitle)} - MANKSI`;

  // 1. Belum login → ke Login
  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    return { name: "Login" }; // Gunakan return object, bukan next()
  }

  // 2. Sudah login tapi buka halaman Login → ke Dashboard
  if (to.name === "Login" && authStore.isAuthenticated) {
    return { name: "Dashboard" };
  }

  // 3. Punya menuId tapi tidak ada hak akses → ke 403
  // Perhatikan: Karena menu Master User tidak punya to.meta.menuId, blok ini akan dilewati.
  // Ini aman karena Master User tidak mewajibkan menuId, melainkan cukup proteksi Admin dari backend/URL
  if (to.meta.menuId && !authStore.can(to.meta.menuId as string, "view")) {
    return { name: "Unauthorized", query: { from: to.fullPath } };
  }

  // Jika semua kondisi aman, router otomatis melanjutkan perjalanan tanpa return apa pun
  // (Sama dengan memanggil next() tanpa parameter di versi Vue Router lama)
});

export default router;
