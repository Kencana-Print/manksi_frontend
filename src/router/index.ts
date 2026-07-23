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
        menuId: "14",
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

    // ── PPIC ──────────────────────────────────────────────────────────
    {
      path: "/ppic/proof",
      name: "ProofBrowse",
      component: () => import("@/views/ppic/ProofView.vue"),
      meta: {
        title: "Proof Garmen",
        layout: "DefaultLayout",
        requiresAuth: true,
        menuId: "122",
      },
    },
    {
      path: "/ppic/proof/create",
      name: "ProofCreate",
      component: () => import("@/views/ppic/ProofFormView.vue"),
      meta: {
        title: "Buat Proof",
        layout: "DefaultLayout",
        requiresAuth: true,
        menuId: "122",
      },
    },
    {
      path: "/ppic/proof/edit/:nomor",
      name: "ProofEdit",
      component: () => import("@/views/ppic/ProofFormView.vue"),
      meta: {
        title: "Ubah Proof",
        layout: "DefaultLayout",
        requiresAuth: true,
        menuId: "122",
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
    {
      path: "/ppic/spk",
      name: "PpicSpkBrowse",
      component: () => import("@/views/ppic/SpkView.vue"),
      meta: {
        title: "SPK (Surat Perintah Kerja)",
        layout: "DefaultLayout",
        requiresAuth: true,
        menuId: "152",
      },
    },
    {
      path: "/ppic/spk/create",
      name: "PpicSpkCreate",
      component: () => import("@/views/ppic/SpkFormView.vue"),
      meta: {
        title: "Buat SPK",
        layout: "DefaultLayout",
        requiresAuth: true,
        menuId: "152",
        browseRoute: "PpicSpkBrowse",
      },
    },
    {
      path: "/ppic/spk/edit/:nomor",
      name: "PpicSpkEdit",
      component: () => import("@/views/ppic/SpkFormView.vue"),
      meta: {
        title: "Ubah SPK",
        layout: "DefaultLayout",
        requiresAuth: true,
        menuId: "152",
        browseRoute: "PpicSpkBrowse",
      },
    },
    {
      path: "/ppic/spk/print/:nomor",
      name: "PpicSpkPrint",
      component: () => import("@/views/ppic/SpkPrintView.vue"),
      meta: {
        title: "Cetak SPK",
        layout: "BlankLayout",
        requiresAuth: true,
      },
    },
    {
      path: "/ppic/planning-spk",
      name: "PpicPlanningSpk",
      component: () => import("@/views/ppic/PlanningSpkView.vue"),
      meta: {
        title: "Planning SPK PPIC",
        layout: "DefaultLayout",
        requiresAuth: true,
        menuId: "56",
      },
    },
    {
      path: "/ppic/planning-spk/create",
      name: "PpicPlanningSpkCreate",
      component: () => import("@/views/ppic/PlanningSpkFormView.vue"),
      meta: {
        title: "Buat Planning SPK PPIC",
        layout: "DefaultLayout",
        requiresAuth: true,
        menuId: "56",
        browseRoute: "PpicPlanningSpk",
      },
    },
    {
      path: "/ppic/planning-spk/edit/:nomor",
      name: "PpicPlanningSpkEdit",
      component: () => import("@/views/ppic/PlanningSpkFormView.vue"),
      meta: {
        title: "Ubah Planning SPK PPIC",
        layout: "DefaultLayout",
        requiresAuth: true,
        menuId: "56",
        browseRoute: "PpicPlanningSpk",
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
        browseRoute: "GarmenApproveReturBahan",
      },
    },
    {
      path: "/garmen/bahan-baku/koreksi-stok",
      name: "KoreksiStokBahanBrowse",
      component: () => import("@/views/garmen/KoreksiStokBahanView.vue"),
      meta: {
        title: "Koreksi Stok Bahan",
        layout: "DefaultLayout",
        requiresAuth: true,
        menuId: "115",
      },
    },
    {
      path: "/garmen/bahan-baku/koreksi-stok/form",
      name: "KoreksiStokBahanCreate",
      component: () => import("@/views/garmen/KoreksiStokBahanFormView.vue"),
      meta: {
        title: "Tambah Koreksi Stok",
        layout: "DefaultLayout",
        requiresAuth: true,
        menuId: "115",
        browseRoute: "KoreksiStokBahanBrowse",
      },
    },
    {
      path: "/garmen/bahan-baku/koreksi-stok/form/:nomor",
      name: "KoreksiStokBahanEdit",
      component: () => import("@/views/garmen/KoreksiStokBahanFormView.vue"),
      meta: {
        title: "Ubah Koreksi Stok",
        layout: "DefaultLayout",
        requiresAuth: true,
        menuId: "115",
        browseRoute: "KoreksiStokBahanBrowse",
      },
    },
    {
      path: "/garmen/bahan-baku/koreksi-stok/print/:nomor",
      name: "KoreksiStokBahanPrint",
      component: () => import("@/views/garmen/KoreksiStokBahanPrintView.vue"),
      meta: {
        title: "Cetak Koreksi Stok",
        layout: "BlankLayout",
        requiresAuth: true,
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
        layout: "BlankLayout",
        requiresAuth: true,
      },
    },
    {
      path: "/garmen/bahan-baku/retur-pembelian-bahan",
      name: "ReturBeliBahanBrowse",
      component: () => import("@/views/garmen/ReturBeliBahanView.vue"),
      meta: {
        title: "Retur Pembelian Bahan",
        layout: "DefaultLayout",
        requiresAuth: true,
        menuId: "55",
      },
    },
    {
      path: "/garmen/bahan-baku/retur-pembelian-bahan/form",
      name: "ReturBeliBahanCreate",
      component: () => import("@/views/garmen/ReturBeliBahanFormView.vue"),
      meta: {
        title: "Tambah Retur Pembelian Bahan",
        layout: "DefaultLayout",
        requiresAuth: true,
        menuId: "55",
        browseRoute: "ReturBeliBahanBrowse",
      },
    },
    {
      path: "/garmen/bahan-baku/retur-pembelian-bahan/form/:nomor",
      name: "ReturBeliBahanEdit",
      component: () => import("@/views/garmen/ReturBeliBahanFormView.vue"),
      meta: {
        title: "Ubah Retur Pembelian Bahan",
        layout: "DefaultLayout",
        requiresAuth: true,
        menuId: "55",
        browseRoute: "ReturBeliBahanBrowse",
      },
    },
    {
      path: "/garmen/bahan-baku/retur-pembelian-bahan/print/:nomor",
      name: "ReturBeliBahanPrint",
      component: () => import("@/views/garmen/ReturBeliBahanPrintView.vue"),
      meta: {
        title: "Cetak Retur Pembelian Bahan",
        layout: "BlankLayout",
        requiresAuth: true,
      },
    },
    {
      path: "/garmen/bahan-baku/pembuatan-barcode-bahan",
      name: "PembuatanBarcodeBahanBrowse",
      component: () => import("@/views/garmen/PembuatanBarcodeBahanView.vue"),
      meta: {
        title: "Pembuatan Barcode Bahan",
        layout: "DefaultLayout",
        requiresAuth: true,
        menuId: "135",
      },
    },
    {
      path: "/garmen/bahan-baku/pembuatan-barcode-bahan/form",
      name: "PembuatanBarcodeBahanCreate",
      component: () =>
        import("@/views/garmen/PembuatanBarcodeBahanFormView.vue"),
      meta: {
        title: "Tambah Pembuatan Barcode Bahan",
        layout: "DefaultLayout",
        requiresAuth: true,
        menuId: "135",
        browseRoute: "PembuatanBarcodeBahanBrowse",
      },
    },
    {
      path: "/garmen/bahan-baku/pembuatan-barcode-bahan/form/:nomor",
      name: "PembuatanBarcodeBahanEdit",
      component: () =>
        import("@/views/garmen/PembuatanBarcodeBahanFormView.vue"),
      meta: {
        title: "Ubah Pembuatan Barcode Bahan",
        layout: "DefaultLayout",
        requiresAuth: true,
        menuId: "135",
        browseRoute: "PembuatanBarcodeBahanBrowse",
      },
    },

    {
      path: "/garmen/bahan-jadi/stbj",
      name: "StbjBrowse",
      component: () => import("@/views/garmen/StbjView.vue"),
      meta: {
        title: "Surat Terima Barang Jadi",
        layout: "DefaultLayout",
        requiresAuth: true,
        menuId: "105",
      },
    },
    {
      path: "/garmen/bahan-jadi/stbj",
      name: "StbjBrowse",
      component: () => import("@/views/garmen/StbjView.vue"),
      meta: {
        title: "Surat Terima Bahan Jadi",
        layout: "DefaultLayout",
        requiresAuth: true,
        menuId: "105",
      },
    },
    {
      path: "/garmen/bahan-jadi/stbj/create",
      name: "StbjFormCreate",
      component: () => import("@/views/garmen/StbjFormView.vue"),
      meta: {
        title: "Tambah STBJ",
        layout: "DefaultLayout",
        requiresAuth: true,
        menuId: "105",
        browseRoute: "StbjBrowse",
      },
    },
    {
      path: "/garmen/bahan-jadi/stbj/edit",
      name: "StbjFormEdit",
      component: () => import("@/views/garmen/StbjFormView.vue"),
      meta: {
        title: "Ubah STBJ",
        layout: "DefaultLayout",
        requiresAuth: true,
        menuId: "105",
        browseRoute: "StbjBrowse",
      },
    },
    {
      path: "/garmen/bahan-jadi/stbj/print",
      name: "StbjPrint",
      component: () => import("@/views/garmen/StbjPrintView.vue"),
      meta: {
        title: "Cetak STBJ",
        layout: "BlankLayout",
        requiresAuth: true,
      },
    },

    {
      path: "/garmen/mka",
      name: "GarmenMkaBrowse",
      component: () => import("@/views/garmen/MkaView.vue"),
      meta: {
        title: "MKA",
        layout: "DefaultLayout",
        requiresAuth: true,
        menuId: "57",
      },
    },
    {
      path: "/garmen/mka/create",
      name: "GarmenMkaCreate",
      component: () => import("@/views/garmen/MkaFormView.vue"),
      meta: {
        title: "Buat MKA",
        layout: "DefaultLayout",
        requiresAuth: true,
        menuId: "57",
        browseRoute: "GarmenMkaBrowse",
      },
    },
    {
      path: "/garmen/mka/edit/:nomor",
      name: "GarmenMkaEdit",
      component: () => import("@/views/garmen/MkaFormView.vue"),
      meta: {
        title: "Ubah MKA",
        layout: "DefaultLayout",
        requiresAuth: true,
        menuId: "57",
        browseRoute: "GarmenMkaBrowse",
      },
    },
    {
      path: "/garmen/mka/print/:nomor",
      name: "GarmenMkaPrint",
      component: () => import("@/views/garmen/MkaPrintView.vue"),
      meta: { title: "Cetak MKA", layout: "BlankLayout", requiresAuth: true },
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
      meta: { requiresAuth: true, layout: "BlankLayout" },
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
        browseRoute: "GarmenRealisasiBarang",
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
        layout: "BlankLayout",
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
        layout: "BlankLayout",
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
        layout: "BlankLayout",
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
        menuId: "69",
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
        menuId: "66",
      },
    },
    {
      path: "/garmen/barang/po-nonbahan/create",
      name: "PoNonBahanGarmenFormCreate",
      component: () => import("@/views/garmen/PoNonBahanFormView.vue"),
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
      component: () => import("@/views/garmen/PoNonBahanFormView.vue"),
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
      component: () => import("@/views/garmen/PoNonBahanPrintView.vue"),
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
      path: "/garmen/po-jasa",
      name: "PoJasaBrowse",
      component: () => import("@/views/garmen/PoJasaView.vue"),
      meta: {
        title: "PO Jasa",
        layout: "DefaultLayout",
        requiresAuth: true,
        menuId: "102",
      },
    },
    {
      path: "/garmen/po-jasa/create",
      name: "PoJasaFormCreate",
      component: () => import("@/views/garmen/PoJasaFormView.vue"),
      meta: {
        title: "Tambah PO Jasa",
        layout: "DefaultLayout",
        requiresAuth: true,
        menuId: "102",
        browseRoute: "PoJasaBrowse",
      },
    },
    {
      path: "/garmen/po-jasa/edit/:nomor",
      name: "PoJasaFormEdit",
      component: () => import("@/views/garmen/PoJasaFormView.vue"),
      meta: {
        title: "Ubah PO Jasa",
        layout: "DefaultLayout",
        requiresAuth: true,
        menuId: "102",
        browseRoute: "PoJasaBrowse",
      },
    },
    {
      path: "/garmen/po-jasa/print/:nomor",
      name: "PoJasaPrint",
      component: () => import("@/views/garmen/PoJasaPrintView.vue"),
      meta: {
        title: "Cetak PO Jasa",
        layout: "BlankLayout",
        requiresAuth: true,
      },
    },
    {
      path: "/garmen/po-jasa/print-sj/:nomor",
      name: "PoJasaPrintSJ",
      component: () => import("@/views/garmen/PoJasaPrintSjView.vue"),
      meta: {
        title: "Cetak SJ PO Jasa",
        layout: "BlankLayout",
        requiresAuth: true,
      },
    },
    {
      path: "/garmen/approve-po-jasa",
      name: "ApprovePOJasa",
      component: () => import("@/views/garmen/ApprovePoJasaView.vue"),
      meta: {
        title: "Approve PO Jasa",
        layout: "DefaultLayout",
        requiresAuth: true,
        menuId: "113",
      },
    },
    {
      path: "/garmen/bpb-jasa",
      name: "BpbJasaBrowse",
      component: () => import("@/views/garmen/BpbJasaView.vue"),
      meta: {
        title: "BPB Jasa",
        layout: "DefaultLayout",
        requiresAuth: true,
        menuId: "104",
      },
    },
    {
      path: "/garmen/bpb-jasa/create",
      name: "BpbJasaFormCreate",
      component: () => import("@/views/garmen/BpbJasaFormView.vue"),
      meta: {
        title: "Tambah BPB Jasa",
        layout: "DefaultLayout",
        requiresAuth: true,
        menuId: "104",
        browseRoute: "BpbJasaBrowse",
      },
    },
    {
      path: "/garmen/bpb-jasa/edit",
      name: "BpbJasaFormEdit",
      component: () => import("@/views/garmen/BpbJasaFormView.vue"),
      meta: {
        title: "Ubah BPB Jasa",
        layout: "DefaultLayout",
        requiresAuth: true,
        menuId: "104",
        browseRoute: "BpbJasaBrowse",
      },
    },
    {
      path: "/garmen/bpb-jasa/print",
      name: "BpbJasaPrint",
      component: () => import("@/views/garmen/BpbJasaPrintView.vue"),
      meta: {
        title: "Cetak BPB Jasa",
        layout: "BlankLayout",
        requiresAuth: true,
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
        menuId: "138",
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
        layout: "BlankLayout",
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
        browseRoute: "PoInternalMapSjBrowse",
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
      component: () => import("@/views/garmen/PoInternalMapSjPrintView.vue"),
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
      path: "/garmen/mutasi-produksi",
      name: "MutasiProduksiBrowse",
      component: () => import("@/views/garmen/MutasiProduksiView.vue"),
      meta: {
        title: "Mutasi Produksi",
        layout: "DefaultLayout",
        requiresAuth: true,
        menuId: "109",
      },
    },
    {
      path: "/garmen/mutasi-produksi/create",
      name: "MutasiProduksiCreate",
      component: () => import("@/views/garmen/MutasiProduksiFormView.vue"),
      meta: {
        title: "Tambah Mutasi Produksi",
        layout: "DefaultLayout",
        requiresAuth: true,
        menuId: "109",
      },
    },
    {
      path: "/garmen/mutasi-produksi/edit/:nomor",
      name: "MutasiProduksiEdit",
      component: () => import("@/views/garmen/MutasiProduksiFormView.vue"),
      meta: {
        title: "Ubah Mutasi Produksi",
        layout: "DefaultLayout",
        requiresAuth: true,
        menuId: "109",
      },
    },
    {
      path: "/garmen/mutasi-produksi/print",
      name: "MutasiProduksiPrint",
      component: () => import("@/views/garmen/MutasiProduksiPrintView.vue"),
      meta: {
        title: "Cetak Mutasi Produksi",
        layout: "BlankLayout",
        requiresAuth: true,
      },
    },
    {
      path: "/garmen/lhk-pola",
      name: "LhkPolaBrowse",
      component: () => import("@/views/garmen/LhkPolaView.vue"),
      meta: {
        title: "LHK Pola",
        layout: "DefaultLayout",
        requiresAuth: true,
        menuId: "174",
      },
    },
    {
      path: "/garmen/lhk-pola",
      name: "LhkPolaBrowse",
      component: () => import("@/views/garmen/LhkPolaView.vue"),
      meta: {
        title: "LHK Pola",
        layout: "DefaultLayout",
        requiresAuth: true,
        menuId: "174",
      },
    },
    {
      path: "/garmen/lhk-pola/create",
      name: "LhkPolaCreate",
      component: () => import("@/views/garmen/LhkPolaFormView.vue"),
      meta: {
        title: "Buat LHK Pola",
        layout: "DefaultLayout",
        requiresAuth: true,
        menuId: "174",
        browseRoute: "LhkPolaBrowse",
      },
    },
    {
      path: "/garmen/lhk-pola/edit/:nomor",
      name: "LhkPolaEdit",
      component: () => import("@/views/garmen/LhkPolaFormView.vue"),
      meta: {
        title: "Ubah LHK Pola",
        layout: "DefaultLayout",
        requiresAuth: true,
        menuId: "174",
        browseRoute: "LhkPolaBrowse",
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
        title: "Cetak Sales Order",
        layout: "BlankLayout",
        requiresAuth: true,
      },
    },
    {
      path: "/penjualan/pra-sj",
      name: "PraSJBrowse",
      component: () => import("@/views/penjualan/PraSJView.vue"),
      meta: {
        title: "Pra Surat Jalan",
        layout: "DefaultLayout",
        requiresAuth: true,
        menuId: "168",
      },
    },
    {
      path: "/penjualan/pra-sj/create",
      name: "PraSJFormCreate",
      component: () => import("@/views/penjualan/PraSJFormView.vue"),
      meta: {
        title: "Tambah Pra SJ",
        layout: "DefaultLayout",
        requiresAuth: true,
        menuId: "168",
        browseRoute: "PraSJBrowse",
      },
    },
    {
      path: "/penjualan/pra-sj/edit",
      name: "PraSJFormEdit",
      component: () => import("@/views/penjualan/PraSJFormView.vue"),
      meta: {
        title: "Ubah Pra SJ",
        layout: "DefaultLayout",
        requiresAuth: true,
        menuId: "168",
        browseRoute: "PraSJBrowse",
      },
    },
    {
      path: "/penjualan/surat-jalan",
      name: "SuratJalanBrowse",
      component: () => import("@/views/penjualan/SuratJalanView.vue"),
      meta: {
        title: "Surat Jalan",
        layout: "DefaultLayout",
        requiresAuth: true,
        menuId: "153",
      },
    },
    {
      path: "/penjualan/surat-jalan/create",
      name: "SuratJalanFormCreate",
      component: () => import("@/views/penjualan/SuratJalanFormView.vue"),
      meta: {
        title: "Tambah Surat Jalan",
        layout: "DefaultLayout",
        requiresAuth: true,
        menuId: "153",
        browseRoute: "SuratJalanBrowse",
      },
    },
    {
      path: "/penjualan/surat-jalan/edit",
      name: "SuratJalanFormEdit",
      component: () => import("@/views/penjualan/SuratJalanFormView.vue"),
      meta: {
        title: "Ubah Surat Jalan",
        layout: "DefaultLayout",
        requiresAuth: true,
        menuId: "153",
        browseRoute: "SuratJalanBrowse",
      },
    },
    {
      path: "/penjualan/surat-jalan/print",
      name: "SuratJalanPrint",
      component: () => import("@/views/penjualan/SuratJalanPrintView.vue"),
      meta: {
        title: "Cetak Surat Jalan",
        layout: "BlankLayout",
        requiresAuth: true,
      },
    },
    {
      path: "/penjualan/sj-tak-normal",
      name: "SjTakNormalBrowse",
      component: () => import("@/views/penjualan/SjTakNormalView.vue"),
      meta: {
        title: "Surat Jalan Tak Normal",
        layout: "DefaultLayout",
        requiresAuth: true,
        menuId: "154",
      },
    },
    {
      path: "/penjualan/sj-tak-normal/create",
      name: "SjTakNormalFormCreate",
      component: () => import("@/views/penjualan/SjTakNormalFormView.vue"),
      meta: {
        title: "Tambah Surat Jalan Tak Normal",
        layout: "DefaultLayout",
        requiresAuth: true,
        menuId: "154",
        browseRoute: "SjTakNormalBrowse",
      },
    },
    {
      path: "/penjualan/sj-tak-normal/edit",
      name: "SjTakNormalFormEdit",
      component: () => import("@/views/penjualan/SjTakNormalFormView.vue"),
      meta: {
        title: "Ubah Surat Jalan Tak Normal",
        layout: "DefaultLayout",
        requiresAuth: true,
        menuId: "154",
        browseRoute: "SjTakNormalBrowse",
      },
    },
    {
      path: "/penjualan/sj-tak-normal/print",
      name: "SjTakNormalPrint",
      component: () => import("@/views/penjualan/SjTakNormalPrintView.vue"),
      meta: {
        title: "Cetak Surat Jalan Tak Normal",
        layout: "BlankLayout",
        requiresAuth: true,
      },
    },
    {
      path: "/penjualan/update-status-sj",
      name: "UpdateStatusSjBrowse",
      component: () => import("@/views/penjualan/UpdateStatusSjView.vue"),
      meta: {
        title: "Update Status Surat Jalan",
        layout: "DefaultLayout",
        requiresAuth: true,
        menuId: "155",
      },
    },
    {
      path: "/penjualan/approval-sj",
      name: "ApprovalSjBrowse",
      component: () => import("@/views/penjualan/ApprovalSjView.vue"),
      meta: {
        title: "Approval Surat Jalan",
        layout: "DefaultLayout",
        requiresAuth: true,
        menuId: "165",
      },
    },
    {
      path: "/penjualan/invoice",
      name: "InvoiceBrowse",
      component: () => import("@/views/penjualan/InvoiceView.vue"),
      meta: {
        title: "Invoice",
        layout: "DefaultLayout",
        requiresAuth: true,
        menuId: "156",
      },
    },
    {
      path: "/penjualan/invoice/create",
      name: "InvoiceFormCreate",
      component: () => import("@/views/penjualan/InvoiceFormView.vue"),
      meta: {
        title: "Tambah Invoice",
        layout: "DefaultLayout",
        requiresAuth: true,
        menuId: "156",
        browseRoute: "InvoiceBrowse",
      },
    },
    {
      path: "/penjualan/invoice/edit",
      name: "InvoiceFormEdit",
      component: () => import("@/views/penjualan/InvoiceFormView.vue"),
      meta: {
        title: "Ubah Invoice",
        layout: "DefaultLayout",
        requiresAuth: true,
        menuId: "156",
        browseRoute: "InvoiceBrowse",
      },
    },
    {
      path: "/penjualan/invoice/print",
      name: "InvoicePrint",
      component: () => import("@/views/penjualan/InvoicePrintView.vue"),
      meta: {
        title: "Cetak Invoice",
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
        browseRoute: "InvoiceProformaBrowse",
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
      path: "/penjualan/invoice-tak-normal",
      name: "InvoiceTakNormalBrowse",
      component: () => import("@/views/penjualan/InvoiceTakNormalView.vue"),
      meta: {
        title: "Invoice Tak Normal",
        layout: "DefaultLayout",
        requiresAuth: true,
        menuId: "158",
      },
    },
    {
      path: "/penjualan/invoice-tak-normal/create",
      name: "InvoiceTakNormalFormCreate",
      component: () => import("@/views/penjualan/InvoiceTakNormalFormView.vue"),
      meta: {
        title: "Tambah Invoice Tak Normal",
        layout: "DefaultLayout",
        requiresAuth: true,
        menuId: "158",
        browseRoute: "InvoiceTakNormalBrowse",
      },
    },
    {
      path: "/penjualan/invoice-tak-normal/edit",
      name: "InvoiceTakNormalFormEdit",
      component: () => import("@/views/penjualan/InvoiceTakNormalFormView.vue"),
      meta: {
        title: "Ubah Invoice Tak Normal",
        layout: "DefaultLayout",
        requiresAuth: true,
        menuId: "158",
        browseRoute: "InvoiceTakNormalBrowse",
      },
    },
    {
      path: "/penjualan/invoice-tak-normal/print",
      name: "InvoiceTakNormalPrint",
      component: () =>
        import("@/views/penjualan/InvoiceTakNormalPrintView.vue"),
      meta: {
        title: "Cetak Invoice Tak Normal",
        layout: "BlankLayout",
        requiresAuth: true,
      },
    },
    {
      path: "/penjualan/cetak-kuitansi",
      name: "CetakKuitansiBrowse",
      component: () => import("@/views/penjualan/CetakKuitansiView.vue"),
      meta: {
        title: "Cetak Kuitansi",
        layout: "DefaultLayout",
        requiresAuth: true,
        menuId: "1317",
      },
    },
    {
      path: "/penjualan/cetak-kuitansi/create",
      name: "CetakKuitansiFormCreate",
      component: () => import("@/views/penjualan/CetakKuitansiFormView.vue"),
      meta: {
        title: "Cetak Kuitansi",
        layout: "DefaultLayout",
        requiresAuth: true,
        menuId: "1317",
        browseRoute: "CetakKuitansiBrowse",
      },
    },
    {
      path: "/penjualan/cetak-kuitansi/print",
      name: "CetakKuitansiPrint",
      component: () => import("@/views/penjualan/CetakKuitansiPrintView.vue"),
      meta: {
        title: "Cetak Kuitansi",
        layout: "BlankLayout",
        requiresAuth: true,
      },
    },
    {
      path: "/penjualan/cetak-faktur-pajak",
      name: "CetakFakturPajakBrowse",
      component: () => import("@/views/penjualan/CetakFakturPajakView.vue"),
      meta: {
        title: "Cetak Faktur Pajak",
        layout: "DefaultLayout",
        requiresAuth: true,
        menuId: "159",
      },
    },
    {
      path: "/penjualan/cetak-faktur-pajak/print",
      name: "CetakFakturPajakPrint",
      component: () =>
        import("@/views/penjualan/CetakFakturPajakPrintView.vue"),
      meta: {
        title: "Cetak Faktur Pajak",
        layout: "BlankLayout",
        requiresAuth: true,
      },
    },
    {
      path: "/penjualan/export-csv-pajak",
      name: "ExportCsvPajakBrowse",
      component: () => import("@/views/penjualan/ExportCsvPajakView.vue"),
      meta: {
        title: "Export CSV ke Faktur Pajak",
        layout: "DefaultLayout",
        requiresAuth: true,
        menuId: "160",
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

    {
      path: "/penjualan/jadwal-kirim",
      name: "JadwalKirimBrowse",
      component: () => import("@/views/penjualan/JadwalKirimView.vue"),
      meta: {
        title: "Jadwal Kirim",
        layout: "DefaultLayout",
        requiresAuth: true,
        menuId: "119",
      },
    },
    {
      path: "/penjualan/jadwal-kirim/create",
      name: "JadwalKirimCreate",
      component: () => import("@/views/penjualan/JadwalKirimFormView.vue"),
      meta: {
        title: "Tambah Jadwal Kirim",
        layout: "DefaultLayout",
        requiresAuth: true,
        menuId: "119",
        browseRoute: "JadwalKirimBrowse",
      },
    },
    {
      path: "/penjualan/jadwal-kirim/edit/:nomor",
      name: "JadwalKirimEdit",
      component: () => import("@/views/penjualan/JadwalKirimFormView.vue"),
      meta: {
        title: "Ubah Jadwal Kirim",
        layout: "DefaultLayout",
        requiresAuth: true,
        menuId: "119",
        browseRoute: "JadwalKirimBrowse",
      },
    },
    {
      path: "/penjualan/jadwal-kirim/print",
      name: "JadwalKirimPrint",
      component: () => import("@/views/penjualan/JadwalKirimPrintView.vue"),
      meta: {
        title: "Cetak Jadwal Kirim",
        layout: "BlankLayout",
        requiresAuth: true,
        menuId: "119",
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
      path: "/laporan/gudang-garmen/kartu-stok-bahan",
      name: "LapKartuStokBahan",
      component: () =>
        import("@/views/laporan/gudang-garmen/KartuStokBahanView.vue"),
      meta: {
        title: "Kartu Stok Bahan",
        layout: "DefaultLayout",
        requiresAuth: true,
        menuId: "502",
      },
    },
    {
      path: "/laporan/gudang-garmen/mutasi-stok-bahan",
      name: "LapMutasiStokBahan",
      component: () =>
        import("@/views/laporan/gudang-garmen/MutasiStokBahanView.vue"),
      meta: {
        title: "Mutasi Stok Bahan",
        layout: "DefaultLayout",
        requiresAuth: true,
        menuId: "505",
      },
    },
    {
      path: "/laporan/gudang-garmen/stok-acc-vs-mka",
      name: "LapStokAccVsMka",
      component: () =>
        import("@/views/laporan/gudang-garmen/StokAccVsMkaView.vue"),
      meta: {
        title: "Laporan Stok Accesories vs MKA",
        layout: "DefaultLayout",
        requiresAuth: true,
        menuId: "569",
      },
    },
    {
      path: "/laporan/gudang-garmen/stok-dc",
      name: "LapStokDc",
      component: () => import("@/views/laporan/gudang-garmen/StokDcView.vue"),
      meta: {
        title: "Laporan Stok Gudang DC",
        layout: "DefaultLayout",
        requiresAuth: true,
        menuId: "570",
      },
    },
    {
      path: "/laporan/gudang-garmen/stok-barang-jadi",
      name: "LapStokBarangJadi",
      component: () =>
        import("@/views/laporan/gudang-garmen/StokBarangJadiView.vue"),
      meta: {
        title: "Laporan Stok Barang Jadi",
        layout: "DefaultLayout",
        requiresAuth: true,
        menuId: "506",
      },
    },
    {
      path: "/laporan/gudang-garmen/kartu-stok-barangjadi",
      name: "LapKartuStokBarangJadi",
      component: () =>
        import("@/views/laporan/gudang-garmen/KartuStokBarangJadiView.vue"),
      meta: {
        title: "Kartu Stok Barang Jadi",
        layout: "DefaultLayout",
        requiresAuth: true,
        menuId: "507",
      },
    },
    {
      path: "/laporan/gudang-garmen/mutasi-stok-barang-jadi",
      name: "LapMutasiStokBarangJadi",
      component: () =>
        import("@/views/laporan/gudang-garmen/MutasiStokBarangJadiView.vue"),
      meta: {
        title: "Mutasi Stok Barang Jadi",
        layout: "DefaultLayout",
        requiresAuth: true,
        menuId: "508",
      },
    },
    {
      path: "/laporan/gudang-garmen/standart-babaran-vs-realisasi",
      name: "LapStandartBabaranVsRealisasi",
      component: () =>
        import("@/views/laporan/gudang-garmen/StandartBabaranVsRealisasiView.vue"),
      meta: {
        title: "Standart Babaran vs Realisasi",
        layout: "DefaultLayout",
        requiresAuth: true,
        menuId: "509",
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
      path: "/laporan/gudang-garmen/poj-vs-bpj",
      name: "LapPojVsBpj",
      component: () => import("@/views/laporan/gudang-garmen/PojVsBpjView.vue"),
      meta: {
        title: "Laporan PO Jasa vs BPB Jasa",
        layout: "DefaultLayout",
        requiresAuth: true,
        menuId: "513",
      },
    },
    {
      path: "/laporan/gudang-garmen/outstanding-po-mitra",
      name: "LapOutstandingPoMitra",
      component: () =>
        import("@/views/laporan/gudang-garmen/OutstandingPoMitraView.vue"),
      meta: {
        title: "Laporan Outstanding PO Mitra",
        layout: "DefaultLayout",
        requiresAuth: true,
        menuId: "514",
      },
    },
    {
      path: "/laporan/gudang-garmen/realisasi-minta-bahan",
      name: "LapRealisasiMintaBahan",
      component: () =>
        import("@/views/laporan/gudang-garmen/RealisasiMintaBahanView.vue"),
      meta: {
        title: "Realisasi Minta Bahan (Sisa/Belum Potong)",
        layout: "DefaultLayout",
        requiresAuth: true,
        menuId: "515",
      },
    },
    {
      path: "/laporan/gudang-garmen/spk-dtf-belum-po",
      name: "LapSpkDtfBelumPo",
      component: () =>
        import("@/views/laporan/gudang-garmen/SpkDtfBelumPoView.vue"),
      meta: {
        title: "SPK DTF Belum PO DTF",
        layout: "DefaultLayout",
        requiresAuth: true,
        menuId: "516",
      },
    },
    {
      path: "/laporan/gudang-garmen/realisasi-minta-vs-lhk-cutt",
      name: "LapRealisasiMintaVsLhkCutt",
      component: () =>
        import("@/views/laporan/gudang-garmen/RealisasiMintaVsLhkCuttView.vue"),
      meta: {
        title: "Realisasi Minta Bahan vs LHK Cutting",
        layout: "DefaultLayout",
        requiresAuth: true,
        menuId: "568",
      },
    },
    {
      path: "/laporan/gudang-garmen/spkv-realisasiv-lhkcutt",
      name: "LapSpkVsRealisasiVsLhkCutt",
      component: () =>
        import("@/views/laporan/gudang-garmen/SpkVsRealisasiVsLhkCuttView.vue"),
      meta: {
        title: "SPK vs Realisasi Permintaan vs LHK Cutting",
        layout: "DefaultLayout",
        requiresAuth: true,
        menuId: "517",
      },
    },
    {
      path: "/laporan/gudang-garmen/spk-vs-stbj-vs-sj",
      name: "LapSpkVsStbjVsSj",
      component: () =>
        import("@/views/laporan/gudang-garmen/SpkVsStbjVsSjView.vue"),
      meta: {
        title: "SPK vs STBJ vs SJ",
        layout: "DefaultLayout",
        requiresAuth: true,
        menuId: "518",
      },
    },
    {
      path: "/laporan/gudang-garmen/spk-mkb-vs-po-bpb",
      name: "LapSpkMkbVsPoBpb",
      component: () =>
        import("@/views/laporan/gudang-garmen/SpkMkbVsPoBpbView.vue"),
      meta: {
        title: "SPK MKB vs PO BPB",
        layout: "DefaultLayout",
        requiresAuth: true,
        menuId: "519",
      },
    },
    {
      path: "/laporan/gudang-garmen/spk-vs-po",
      name: "LapSpkVsPo",
      component: () => import("@/views/laporan/gudang-garmen/SpkVsPoView.vue"),
      meta: {
        title: "SPK vs PO",
        layout: "DefaultLayout",
        requiresAuth: true,
        menuId: "520",
      },
    },
    {
      path: "/laporan/gudang-garmen/spk-vs-bpb",
      name: "LapSpkVsBpb",
      component: () => import("@/views/laporan/gudang-garmen/SpkVsBpbView.vue"),
      meta: {
        title: "SPK vs BPB",
        layout: "DefaultLayout",
        requiresAuth: true,
        menuId: "521",
      },
    },
    {
      path: "/laporan/gudang-garmen/spk-vs-bpb-non-po",
      name: "LapSpkVsBpbNonPo",
      component: () =>
        import("@/views/laporan/gudang-garmen/SpkVsBpbNonPoView.vue"),
      meta: {
        title: "SPK vs BPB Non PO",
        layout: "DefaultLayout",
        requiresAuth: true,
        menuId: "522",
      },
    },
    {
      path: "/laporan/gudang-garmen/spk-close-stbj",
      name: "LapSpkCloseStbj",
      component: () =>
        import("@/views/laporan/gudang-garmen/SpkCloseStbjView.vue"),
      meta: {
        title: "SPK Close STBJ",
        layout: "DefaultLayout",
        requiresAuth: true,
        menuId: "523",
      },
    },
    {
      path: "/laporan/gudang-garmen/mutasi-prod-detail",
      name: "LapMutasiProdDetail",
      component: () =>
        import("@/views/laporan/gudang-garmen/LaporanMutasiProduksiView.vue"),
      meta: {
        title: "Laporan Mutasi Produksi Detail",
        layout: "DefaultLayout",
        requiresAuth: true,
        menuId: "524",
      },
    },
    {
      path: "/laporan/gudang-garmen/kekurangan-produksi",
      name: "LapKekuranganProduksi",
      component: () =>
        import("@/views/laporan/gudang-garmen/KekuranganProduksiView.vue"),
      meta: {
        title: "Laporan Kekurangan Produksi",
        layout: "DefaultLayout",
        requiresAuth: true,
        menuId: "525",
      },
    },
    {
      path: "/laporan/gudang-garmen/lap-outstanding-spk",
      name: "LapOutstandingSpk",
      component: () =>
        import("@/views/laporan/gudang-garmen/OutstandingSpkView.vue"),
      meta: {
        title: "Laporan Outstanding SPK",
        layout: "DefaultLayout",
        requiresAuth: true,
        menuId: "526",
      },
    },
    {
      path: "/laporan/gudang-garmen/browse-spk",
      name: "LapBrowseSpk",
      component: () =>
        import("@/views/laporan/gudang-garmen/BrowseSpkView.vue"),
      meta: {
        title: "Browse SPK",
        layout: "DefaultLayout",
        requiresAuth: true,
        menuId: "527",
      },
    },
    {
      path: "/laporan/gudang-garmen/browse-map",
      name: "LapBrowseMap",
      component: () =>
        import("@/views/laporan/gudang-garmen/BrowseMapView.vue"),
      meta: {
        title: "Browse MAP",
        layout: "DefaultLayout",
        requiresAuth: true,
        menuId: "528",
      },
    },

    {
      path: "/laporan/produksi-garmen/monitoring-produksi",
      name: "LapMonitoringProduksi",
      component: () =>
        import("@/views/laporan/produksi-garmen/MonitoringProduksiView.vue"),
      meta: {
        title: "Laporan Monitoring Produksi",
        layout: "DefaultLayout",
        requiresAuth: true,
        menuId: "554",
      },
    },
    {
      path: "/laporan/produksi-garmen/monitoring-kurang-prod",
      name: "LapMonitoringKekuranganProduksi",
      component: () =>
        import("@/views/laporan/produksi-garmen/MonitoringKekuranganProduksiView.vue"),
      meta: {
        title: "Laporan Monitoring Kekurangan Produksi",
        layout: "DefaultLayout",
        requiresAuth: true,
        menuId: "555",
      },
    },
    {
      path: "/laporan/produksi-garmen/monitoring-kurang-prod-jahit",
      name: "LapMonitoringKekuranganProduksiJahit",
      component: () =>
        import("@/views/laporan/produksi-garmen/MonitoringKekuranganProduksiJahitView.vue"),
      meta: {
        title: "Monitoring Kekurangan Produksi (Jahit/Line)",
        layout: "DefaultLayout",
        requiresAuth: true,
        menuId: "961",
      },
    },
    {
      path: "/laporan/produksi-garmen/monitoring-kurang-prodv2",
      name: "LapMonitoringKekuranganProduksiV2",
      component: () =>
        import("@/views/laporan/produksi-garmen/MonitoringKekuranganProduksiV2View.vue"),
      meta: {
        title: "Laporan Monitoring Kekurangan Produksi v2",
        layout: "DefaultLayout",
        requiresAuth: true,
        menuId: "556",
      },
    },
    {
      path: "/laporan/produksi-garmen/monitoring-bhn-datang",
      name: "LapMonitoringKedatanganBahan",
      component: () =>
        import("@/views/laporan/produksi-garmen/MonitoringKedatanganBahanView.vue"),
      meta: {
        title: "Laporan Monitoring Kedatangan Bahan",
        layout: "DefaultLayout",
        requiresAuth: true,
        menuId: "557",
      },
    },
    {
      path: "/laporan/produksi-garmen/outstanding-bordir",
      name: "LapOutstandingBordir",
      component: () =>
        import("@/views/laporan/produksi-garmen/OutstandingBordirView.vue"),
      meta: {
        title: "Outstanding Bordir",
        layout: "DefaultLayout",
        requiresAuth: true,
        menuId: "558",
      },
    },
    {
      path: "/laporan/produksi-garmen/monitoring-bs",
      name: "LapMonitoringBs",
      component: () =>
        import("@/views/laporan/produksi-garmen/MonitoringBsView.vue"),
      meta: {
        title: "Laporan Monitoring BS",
        layout: "DefaultLayout",
        requiresAuth: true,
        menuId: "563",
      },
    },
    {
      path: "/laporan/produksi-garmen/stok-by-line",
      name: "LapStokProduksiByLine",
      component: () =>
        import("@/views/laporan/produksi-garmen/StokProduksibyLineView.vue"),
      meta: {
        title: "Stok Produksi by Line",
        layout: "DefaultLayout",
        requiresAuth: true,
        menuId: "564",
      },
    },
    {
      path: "/laporan/produksi-garmen/pemakaian-obat",
      name: "LapPemakaianObat",
      component: () =>
        import("@/views/laporan/produksi-garmen/PemakaianObatView.vue"),
      meta: {
        title: "Laporan Pemakaian Obat",
        layout: "DefaultLayout",
        requiresAuth: true,
        menuId: "565",
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
      path: "/tools/users/create",
      name: "UserFormCreate",
      component: () => import("@/views/tools/UserFormView.vue"),
      meta: { title: "Buat User", layout: "DefaultLayout", requiresAuth: true },
    },
    {
      path: "/tools/users/edit/:kode",
      name: "UserFormEdit",
      component: () => import("@/views/tools/UserFormView.vue"),
      meta: { title: "Ubah User", layout: "DefaultLayout", requiresAuth: true },
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
