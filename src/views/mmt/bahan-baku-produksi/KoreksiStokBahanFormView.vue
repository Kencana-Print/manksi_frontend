<script setup lang="ts">
import { ref, computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useToast } from "vue-toastification";
import QRCode from "qrcode";
import BaseForm from "@/components/BaseForm.vue";
import { useForm } from "@/composables/useForm";
import {
    IconAdjustments,
    IconSearch,
    IconPlus,
    IconTrash,
    IconRefresh,
    IconBarcode,
    IconPrinter,
    IconX,
    IconCheck,
} from "@tabler/icons-vue";
import api from "@/services/api";

import MasterBahanModal from "@/modal/MasterBahanModal.vue";
import GudangMmtSearchModal from "@/components/lookups/GudangMmtSearchModal.vue";

const route = useRoute();
const router = useRouter();
const toast = useToast();

interface DetailItem {
    no: number;
    kode: string; // SKU / Barcode roll atau Kode Bahan
    kodeBarang: string; // Kode Barang master
    nama: string;
    satuan: string;
    panjang: string | number;
    lebar: string | number;
    system: number;
    fisik: number;
    qty: number;
    harga: number;
    nilai: number;
}

interface KoreksiForm {
    nomor: string;
    tanggal: string;
    gudangKode: string;
    gudangNama: string;
    typeKor: number;
    keterangan: string;
    items: DetailItem[];
}

interface PrintItem {
    Nama_Bahan: string;
    qrValue: string;
    qrImage: string;
    Panjang: number;
    Lebar: number;
}

const LIST_TYPE_KOR = [
    { nama: "Terima", kode: 100 },
    { nama: "Keluar", kode: 200 },
    { nama: "Sisa Produksi", kode: 300 },
];

const initialData: KoreksiForm = {
    nomor: "AUTO",
    tanggal: new Date().toISOString().substring(0, 10),
    gudangKode: "",
    gudangNama: "",
    typeKor: 0,
    keterangan: "",
    items: [
        {
            no: 1,
            kode: "",
            kodeBarang: "",
            nama: "",
            satuan: "ROLL",
            panjang: "",
            lebar: "",
            system: 0,
            fisik: 0,
            qty: 0,
            harga: 0,
            nilai: 0,
        },
    ],
};

const toDateInputValue = (val: any): string => {
    if (!val) return "";
    const s = String(val);
    if (s.includes("T")) {
        const d = new Date(s);
        if (!isNaN(d.getTime())) {
            const yyyy = d.getFullYear();
            const mm = String(d.getMonth() + 1).padStart(2, "0");
            const dd = String(d.getDate()).padStart(2, "0");
            return `${yyyy}-${mm}-${dd}`;
        }
    }
    return s.substring(0, 10);
};

// State Lookups
const showBahanModal = ref(false);
const showGudangModal = ref(false);
const activeRowIndex = ref<number | null>(null);
const isLoadingStock = ref(false);

// Mode MasterBahanModal selaras dengan sistem MMT
const bahanModalMode = computed<"mmt" | "produksi" | "obat">(() => {
    const kode = formData.value.gudangKode?.toUpperCase() || "";
    const nama = formData.value.gudangNama?.toLowerCase() || "";

    if (Number(formData.value.typeKor) === 300 && kode === "GPM") {
        return "produksi";
    }
    if (kode === "WH-20" || nama.includes("tinta") || nama.includes("obat")) {
        return "obat";
    }
    if (kode === "GPM" || nama.includes("produksi")) {
        return "produksi";
    }
    return "mmt";
});

// State Print Barcode
const showQRDialog = ref(false);
const isGeneratingQR = ref(false);
const itemsToPrint = ref<PrintItem[]>([]);
const printCopies = ref<number>(1);
const selectedPrintIndices = ref<number[]>([]);

const {
    isEditMode,
    isLoading,
    isSaving,
    formData,
    showSaveDialog,
    showCancelDialog,
    showCloseDialog,
    executeSave,
    executeCancel,
    executeClose,
} = useForm<KoreksiForm>({
    menuId: "5535",
    initialData,
    fetchApi: async () => {
        const nomor = route.params.nomor || route.query.nomor;
        if (!nomor) return { ...initialData };

        const res = await api.get(
            `/mmt/bahan-baku-produksi/koreksi-stok/${encodeURIComponent(String(nomor))}`,
        );
        const data = res.data?.data;
        if (!data) return { ...initialData };

        const header = data.header || {};
        const details = data.details || [];

        return {
            nomor: header.Nomor || String(nomor),
            tanggal: toDateInputValue(header.Tanggal) || initialData.tanggal,
            gudangKode: header.GudangKode || "WH-16",
            gudangNama: header.Gudang || "GUDANG UTAMA MMT",
            typeKor: Number(header.TypeKor || 100),
            keterangan: header.Keterangan || "",
            items: details.map((d: any, idx: number) => ({
                no: idx + 1,
                kode: d.SKU || d.KodeBarang || "",
                kodeBarang: d.KodeBarang || d.SKU || "",
                nama: d.NamaBarang || "",
                satuan: d.Satuan || "ROLL",
                panjang: d.Panjang ?? "",
                lebar: d.Lebar ?? "",
                system: Number(d.System || 0),
                fisik: Number(d.Fisik || 0),
                qty: Number(d.Qty || 0),
                harga: Number(d.Harga || 0),
                nilai: Number(d.Nilai || 0),
            })),
        };
    },
    submitApi: async (dataToSave) => {
        const validItems = dataToSave.items.filter(
            (it) => it.kode && it.kode.trim() !== "",
        );
        if (validItems.length === 0) {
            throw new Error("Mohon pilih minimal satu bahan untuk dikoreksi.");
        }

        const typeKorNum = Number(dataToSave.typeKor) || 100;
        const typeKorObj = LIST_TYPE_KOR.find((t) => t.kode === typeKorNum);

        const payload = {
            header: {
                Nomor: dataToSave.nomor,
                Tanggal: dataToSave.tanggal,
                GudangKode: dataToSave.gudangKode,
                TypeKor: typeKorNum,
                TypeName: typeKorObj ? typeKorObj.nama : "Terima",
                Keterangan: dataToSave.keterangan,
            },
            details: validItems.map((it) => ({
                SKU: it.kode,
                KodeBarang: it.kodeBarang || it.kode,
                NamaBarang: it.nama,
                Satuan: it.satuan,
                Panjang: Number(it.panjang) || 0,
                Lebar: Number(it.lebar) || 0,
                System: Number(it.system) || 0,
                Fisik: Number(it.fisik) || 0,
                Qty: Number(it.qty) || 0,
                Harga: Number(it.harga) || 0,
                Nilai: Number(it.nilai) || 0,
            })),
        };

        await api.post("/mmt/bahan-baku-produksi/koreksi-stok", payload);
    },
});

const calculateRow = (idx: number) => {
    const item = formData.value.items[idx];
    const fisik = Number(item.fisik) || 0;
    const sys = Number(item.system) || 0;
    item.qty = fisik - sys;
    item.nilai = item.qty * (Number(item.harga) || 0);
};

const handleSelectGudang = (g: { Kode: string; Nama: string }) => {
    if (
        formData.value.items.some((it) => it.kode && it.kode.trim() !== "") &&
        formData.value.gudangKode !== g.Kode
    ) {
        if (
            !confirm(
                "Gudang diubah, daftar barang sebelumnya akan dikosongkan. Lanjutkan?",
            )
        ) {
            showGudangModal.value = false;
            return;
        }
        formData.value.items = [];
        addItem();
    }
    formData.value.gudangKode = g.Kode;
    formData.value.gudangNama = g.Nama;
    showGudangModal.value = false;
};

const initialSearchKeyword = ref("");

const openBahanLookup = (idx: number, keyword: string = "") => {
    activeRowIndex.value = idx;
    initialSearchKeyword.value =
        keyword || formData.value.items[idx]?.kode || "";
    showBahanModal.value = true;
};

const onSkuScanOrEnter = async (idx: number) => {
    const row = formData.value.items[idx];
    if (!row) return;

    const rawKode = (row.kode || "").trim();
    if (!rawKode) {
        openBahanLookup(idx);
        return;
    }

    // 1. Cek duplikasi di baris lain
    const isDuplicate = formData.value.items.some(
        (it, i) =>
            i !== idx &&
            it.kode?.trim().toUpperCase() === rawKode.toUpperCase(),
    );
    if (isDuplicate) {
        toast.warning(
            `Barang dengan Barcode/SKU '${rawKode}' sudah ada di daftar.`,
        );
        return;
    }

    try {
        // 2. Prioritas 1: Cari sebagai Barcode Roll di Master Stok (quick-check)
        try {
            const bcRes = await api.get(
                "/mmt/bahan-baku-produksi/barcode/search/quick-check",
                {
                    params: {
                        barcode: rawKode,
                        gudang: formData.value.gudangKode || undefined,
                    },
                },
            );
            const b = bcRes.data?.data;
            if (b) {
                row.kode = b.Barcode || b.mst_barcode || rawKode;
                row.kodeBarang = b.Kode || b.mst_brg_kode || "";
                row.nama = b.Nama_Bahan || b.brg_nama || "";
                row.satuan = b.Satuan || b.brg_satuan || "ROLL";
                row.panjang = b.Panjang ?? b.mst_panjang ?? "";
                row.lebar = b.Lebar ?? b.mst_lebar ?? "";
                row.system = Number(b.Stok_Sistem ?? b.mst_stok ?? 0);
                row.fisik = 0;
                row.harga = Number(b.HargaBeli ?? b.HRGBELI ?? 0);
                calculateRow(idx);
                toast.success(`Barcode roll teridentifikasi: ${row.nama}`);

                if (idx === formData.value.items.length - 1) {
                    addItem();
                }
                return;
            }
        } catch {
            // Lanjut ke pengecekan master bahan
        }

        // 3. Prioritas 2: Cari di Master Bahan MMT (/mmt/daftar/bahan)
        const bahanRes = await api.get("/mmt/daftar/bahan", {
            params: {
                q: rawKode,
                limit: 10,
            },
        });
        const listBahan = bahanRes.data?.data || [];

        // Cari exact match kode atau barcode
        const exactMatch = listBahan.find(
            (item: any) =>
                (item.Kode &&
                    item.Kode.trim().toUpperCase() === rawKode.toUpperCase()) ||
                (item.Barcode &&
                    item.Barcode.trim().toUpperCase() === rawKode.toUpperCase()),
        );

        if (exactMatch) {
            row.kode = exactMatch.Kode || rawKode;
            row.kodeBarang = exactMatch.Kode || "";
            row.nama = exactMatch.Nama || exactMatch.brg_nama || "";
            row.satuan = exactMatch.Satuan || exactMatch.brg_satuan || "ROLL";
            row.panjang = exactMatch.Panjang ?? exactMatch.brg_panjang ?? "";
            row.lebar = exactMatch.Lebar ?? exactMatch.brg_lebar ?? "";
            row.system = Number(exactMatch.Stok ?? 0);
            row.fisik = 0;
            row.harga = Number(exactMatch.HargaBeli ?? exactMatch.HRGBELI ?? 0);
            calculateRow(idx);
            toast.success(`Bahan ditemukan: ${row.nama}`);

            if (idx === formData.value.items.length - 1) {
                addItem();
            }
            return;
        }

        // Jika hanya ada satu hasil pencarian
        if (listBahan.length === 1) {
            const singleItem = listBahan[0];
            row.kode = singleItem.Kode || rawKode;
            row.kodeBarang = singleItem.Kode || "";
            row.nama = singleItem.Nama || singleItem.brg_nama || "";
            row.satuan = singleItem.Satuan || singleItem.brg_satuan || "ROLL";
            row.panjang = singleItem.Panjang ?? singleItem.brg_panjang ?? "";
            row.lebar = singleItem.Lebar ?? singleItem.brg_lebar ?? "";
            row.system = Number(singleItem.Stok ?? 0);
            row.fisik = 0;
            row.harga = Number(
                singleItem.HargaBeli ?? singleItem.HRGBELI ?? 0,
            );
            calculateRow(idx);
            toast.success(`Bahan terpilih: ${row.nama}`);

            if (idx === formData.value.items.length - 1) {
                addItem();
            }
            return;
        }

        // Buka modal pencarian dengan kata kunci jika banyak atau tidak exact
        openBahanLookup(idx, rawKode);
        if (listBahan.length > 1) {
            toast.info(
                `Ditemukan ${listBahan.length} bahan serupa. Silakan pilih dari daftar.`,
            );
        } else {
            toast.warning(
                `SKU / Kode '${rawKode}' tidak ditemukan. Silakan cari di master.`,
            );
        }
    } catch (err: any) {
        toast.error(
            err.response?.data?.message || "Gagal memproses kode barang.",
        );
        openBahanLookup(idx, rawKode);
    }
};

const onSelectBahan = (b: any) => {
    if (
        activeRowIndex.value !== null &&
        formData.value.items[activeRowIndex.value]
    ) {
        const rawKode =
            b.Barcode && b.Barcode !== "-"
                ? b.Barcode
                : b.Kode || b.brg_kode || "";
        const kodeBarangAsli = b.Kode || b.brg_kode || "";

        // Cegah duplikasi
        const isDuplicate = formData.value.items.some(
            (it, idx) => it.kode === rawKode && idx !== activeRowIndex.value,
        );
        if (isDuplicate) {
            toast.warning(
                `Barang dengan Barcode/Kode ${rawKode} sudah ada di daftar.`,
            );
            return;
        }

        const row = formData.value.items[activeRowIndex.value];
        row.kode = rawKode;
        row.kodeBarang = kodeBarangAsli;
        row.nama = b.Nama || b.brg_nama || "";
        row.satuan = b.Satuan || b.brg_satuan || "ROLL";
        row.panjang = b.Panjang ?? b.brg_panjang ?? "";
        row.lebar = b.Lebar ?? b.brg_lebar ?? "";
        row.system = Number(b.Stok ?? b.mst_stok ?? 0);
        row.harga = Number(b.HargaBeli ?? b.HRGBELI ?? b.brg_hrgbeli ?? 0);
        row.fisik = 0; // Default di MMT 0, agar user mengisi fisik aktual
        calculateRow(activeRowIndex.value);

        if (activeRowIndex.value === formData.value.items.length - 1) {
            addItem();
        }
    }
    showBahanModal.value = false;
};

// Tarik Seluruh Stok Gudang Terpilih
const loadStockAllGudang = async () => {
    if (!formData.value.gudangKode) {
        toast.warning("Silakan pilih gudang terlebih dahulu.");
        return;
    }
    isLoadingStock.value = true;
    try {
        const res = await api.get(
            "/mmt/bahan-baku-produksi/koreksi-stok/stok",
            {
                params: {
                    gudangKode: formData.value.gudangKode,
                    tanggal: formData.value.tanggal,
                },
            },
        );
        const dataStok = res.data?.data || [];
        if (dataStok.length > 0) {
            formData.value.items = dataStok.map((item: any, idx: number) => ({
                no: idx + 1,
                kode: item.Kode,
                kodeBarang: item.Kode,
                nama: item.Nama,
                satuan: item.Satuan || "ROLL",
                panjang: item.Panjang || "",
                lebar: item.Lebar || "",
                system: Number(item.Stok || 0),
                fisik: 0,
                qty: 0 - Number(item.Stok || 0),
                harga: Number(item.HRGBELI || 0),
                nilai: (0 - Number(item.Stok || 0)) * Number(item.HRGBELI || 0),
            }));
            toast.success(
                `Berhasil memuat ${dataStok.length} stok bahan dari gudang ${formData.value.gudangKode}.`,
            );
        } else {
            toast.info("Tidak ada data stok di gudang terpilih.");
        }
    } catch (err: any) {
        toast.error(err.response?.data?.message || "Gagal memuat stok gudang.");
    } finally {
        isLoadingStock.value = false;
    }
};

const addItem = () => {
    formData.value.items.push({
        no: formData.value.items.length + 1,
        kode: "",
        kodeBarang: "",
        nama: "",
        satuan: "ROLL",
        panjang: "",
        lebar: "",
        system: 0,
        fisik: 0,
        qty: 0,
        harga: 0,
        nilai: 0,
    });
};

const removeItem = (idx: number) => {
    if (formData.value.items.length <= 1) {
        formData.value.items[0] = {
            no: 1,
            kode: "",
            kodeBarang: "",
            nama: "",
            satuan: "ROLL",
            panjang: "",
            lebar: "",
            system: 0,
            fisik: 0,
            qty: 0,
            harga: 0,
            nilai: 0,
        };
        return;
    }
    formData.value.items.splice(idx, 1);
    formData.value.items.forEach((it, i) => (it.no = i + 1));
};

const totalSystem = computed(() => {
    return formData.value.items.reduce(
        (sum, it) => sum + (Number(it.system) || 0),
        0,
    );
});

const totalFisik = computed(() => {
    return formData.value.items.reduce(
        (sum, it) => sum + (Number(it.fisik) || 0),
        0,
    );
});

const totalQtyKoreksi = computed(() => {
    return formData.value.items.reduce(
        (sum, it) => sum + (Number(it.qty) || 0),
        0,
    );
});

const totalNilaiKoreksi = computed(() => {
    return formData.value.items.reduce(
        (sum, it) => sum + (Number(it.nilai) || 0),
        0,
    );
});

// --- BARCODE PREVIEW / PRINT LOGIC ---
const openBarcodePreview = async () => {
    const validItems = formData.value.items.filter(
        (it) => it.kode && it.kode.trim() !== "",
    );
    if (validItems.length === 0) {
        toast.warning("Silakan pilih bahan terlebih dahulu.");
        return;
    }

    isGeneratingQR.value = true;
    try {
        const tempPrintList: PrintItem[] = [];
        for (const item of validItems) {
            const qrImage = await QRCode.toDataURL(item.kode, {
                width: 300,
                margin: 0,
                errorCorrectionLevel: "H",
            });

            // Sesuai sistem MMT: Cetak 2 label roll per barcode
            for (let i = 0; i < 2; i++) {
                tempPrintList.push({
                    Nama_Bahan: item.nama || "-",
                    qrValue: item.kode,
                    qrImage,
                    Panjang: Number(item.panjang) || 0,
                    Lebar: Number(item.lebar) || 0,
                });
            }
        }

        itemsToPrint.value = tempPrintList;
        selectedPrintIndices.value = tempPrintList.map((_, i) => i);
        printCopies.value = 1;
        showQRDialog.value = true;
    } catch (err: any) {
        console.error("Gagal menyiapkan barcode:", err);
        toast.error("Gagal memproses QR Code item.");
    } finally {
        isGeneratingQR.value = false;
    }
};

const toggleSelectAll = () => {
    if (selectedPrintIndices.value.length === itemsToPrint.value.length) {
        selectedPrintIndices.value = [];
    } else {
        selectedPrintIndices.value = itemsToPrint.value.map((_, i) => i);
    }
};

const printContent = () => {
    const iframe = document.createElement("iframe");
    Object.assign(iframe.style, {
        position: "fixed",
        right: "0",
        bottom: "0",
        width: "0",
        height: "0",
        border: "0",
    });
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (!doc) {
        document.body.removeChild(iframe);
        return;
    }

    const selectedItems = itemsToPrint.value.filter((_, idx) =>
        selectedPrintIndices.value.includes(idx),
    );

    if (selectedItems.length === 0) {
        toast.warning("Pilih minimal satu label untuk dicetak.");
        document.body.removeChild(iframe);
        return;
    }

    const labelHtml = selectedItems
        .map(
            (item) => `
    <div class="label-box">
      <div class="border-inner">
        <div class="top-row">
          <img src="${item.qrImage}" class="qr-img" />
          <div class="info-column">
            <div class="qr-text">${item.qrValue}</div>
            <div class="dimens-text">${item.Panjang} x ${item.Lebar}</div>
          </div>
        </div>
        <div class="divider"></div>
        <div class="product-name">${item.Nama_Bahan}</div>
      </div>
    </div>
  `,
        )
        .join("");

    doc.open();
    doc.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Preview Barcode Koreksi - ${formData.value.nomor}</title>
        <style>
          @page { size: 101.2mm 101mm portrait; margin: 0; }
          body { 
            margin: 0; 
            padding: 0; 
            font-family: Arial, sans-serif; 
            display: flex; 
            flex-direction: column; 
            align-items: center; 
            justify-content: center; 
            min-height: 100vh; 
            background: white;
          }
          .label-box { 
            width: 70mm; 
            height: 50mm; 
            padding: 3mm; 
            box-sizing: border-box; 
          }
          .label-box:nth-child(2n) { 
            page-break-after: always; 
          }
          .border-inner { 
            border: 1pt solid black; 
            height: 100%; 
            width: 100%; 
            padding: 2mm; 
            display: flex; 
            flex-direction: column; 
            box-sizing: border-box; 
          }
          .top-row { 
            display: flex; 
            gap: 10px; 
            margin-bottom: 4px; 
          }
          .qr-img { 
            width: 1.5cm; 
            height: 1.5cm; 
          }
          .info-column {
            display: flex;
            flex-direction: column;
            justify-content: center;
          }
          .qr-text { 
            font-weight: bold; 
            font-size: 8pt; 
            word-break: break-all; 
          }
          .dimens-text { 
            font-size: 11pt; 
            font-weight: bold; 
            margin-top: 5px; 
          }
          .divider { 
            border-top: 1pt solid black; 
            width: 100%; 
            margin: 4px 0; 
          }
          .product-name { 
            font-size: 13pt; 
            font-weight: bold; 
            text-align: center; 
            flex-grow: 1; 
            display: flex; 
            align-items: center; 
            justify-content: center; 
            overflow: hidden; 
          }
        </style>
      </head>
      <body>${labelHtml}</body>
    </html>
  `);
    doc.close();

    setTimeout(() => {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
        document.body.removeChild(iframe);
    }, 500);
};
</script>

<template>
    <BaseForm
        :title="
            isEditMode
                ? `Ubah Koreksi Stok Bahan (${formData.nomor})`
                : 'Tambah Koreksi Stok Bahan Baru'
        "
        menu-id="5535"
        :icon="IconAdjustments"
        :is-loading="isLoading"
        :is-saving="isSaving"
        item-name="Koreksi Stok Bahan"
        desktop-mode
        v-model:show-save-dialog="showSaveDialog"
        v-model:show-cancel-dialog="showCancelDialog"
        v-model:show-close-dialog="showCloseDialog"
        @validate-save="showSaveDialog = true"
        @confirm-save="executeSave"
        @confirm-cancel="executeCancel"
        @confirm-close="executeClose"
    >
        <!-- ══════════════════════════════════════════════════════════
         ── KOLOM KIRI (SIDEBAR FORM HEADER & INFORMASI GUDANG) ──
         ══════════════════════════════════════════════════════════ -->
        <template #left-column>
            <!-- Section 1: Data Header Dokumen -->
            <div class="desktop-form-section header-section">
                <div class="section-label">Data Header Dokumen</div>

                <!-- Nomor Bukti / Koreksi -->
                <div class="fr">
                    <label class="lbl">Nomor Bukti</label>
                    <input
                        :value="formData.nomor"
                        readonly
                        class="inp ro fw flex-grow-1"
                        placeholder="AUTO"
                    />
                </div>

                <!-- Tanggal Koreksi -->
                <div class="fr">
                    <label class="lbl">Tanggal</label>
                    <input
                        type="date"
                        v-model="formData.tanggal"
                        class="idate flex-grow-1"
                        required
                    />
                </div>

                <!-- Gudang (Lookup GudangMmtSearchModal) -->
                <div class="fr">
                    <label class="lbl">Gudang</label>
                    <div class="igrp flex-grow-1">
                        <input
                            type="text"
                            :value="
                                formData.gudangKode
                                    ? `${formData.gudangKode} - ${formData.gudangNama}`
                                    : ''
                            "
                            class="inp ro fw text-primary"
                            readonly
                            placeholder="Cari..."
                            @click="showGudangModal = true"
                        />
                        <button
                            type="button"
                            class="blkp"
                            @click="showGudangModal = true"
                            title="Cari Gudang"
                        >
                            <IconSearch :size="13" />
                        </button>
                    </div>
                </div>

                <!-- Tipe Koreksi (100, 200, 300) -->
                <div class="fr">
                    <label class="lbl">Tipe Koreksi</label>
                    <select
                        v-model.number="formData.typeKor"
                        class="inp iselect flex-grow-1"
                    >
                        <option
                            v-for="t in LIST_TYPE_KOR"
                            :key="t.kode"
                            :value="t.kode"
                        >
                            {{ t.nama }}
                        </option>
                    </select>
                </div>

                <!-- Keterangan -->
                <div class="fr fr-top mt-1">
                    <label class="lbl">Keterangan</label>
                    <textarea
                        v-model="formData.keterangan"
                        class="inp ta flex-grow-1"
                        rows="3"
                        placeholder="Keterangan..."
                    ></textarea>
                </div>
            </div>

            <!-- Section 2: Aksi Cepat Dokumen -->
            <div class="desktop-form-section mt-2">
                <div class="section-label">Aksi Cepat Dokumen</div>
                <v-btn
                    block
                    size="small"
                    color="secondary"
                    variant="tonal"
                    class="text-none font-weight-medium"
                    :loading="isLoadingStock"
                    @click="loadStockAllGudang"
                >
                    <template #prepend>
                        <IconRefresh :size="15" />
                    </template>
                    Tarik Seluruh Stok Gudang Terpilih
                </v-btn>
            </div>

            <!-- Section 3: Ringkasan Total Koreksi (Sidebar) -->
            <div class="desktop-form-section mt-2 pa-3">
                <div class="total-summary-card">
                    <div class="d-flex justify-space-between align-center mb-1">
                        <span class="total-label">TOTAL QTY KOREKSI:</span>
                        <span
                            class="total-value"
                            :class="
                                totalQtyKoreksi > 0
                                    ? 'text-success'
                                    : totalQtyKoreksi < 0
                                      ? 'text-error'
                                      : 'text-primary'
                            "
                        >
                            {{
                                totalQtyKoreksi > 0
                                    ? `+${totalQtyKoreksi}`
                                    : totalQtyKoreksi
                            }}
                        </span>
                    </div>
                    <div class="d-flex justify-space-between align-center">
                        <span class="total-label text-caption"
                            >TOTAL NILAI:</span
                        >
                        <span
                            class="text-caption font-weight-bold text-grey-darken-3"
                        >
                            Rp {{ totalNilaiKoreksi.toLocaleString("id-ID") }}
                        </span>
                    </div>
                </div>
            </div>
        </template>

        <!-- ══════════════════════════════════════════════════════════
         ── KOLOM KANAN (AREA UTAMA: GRID TABEL LIST INPUTAN BARANG) ──
         ══════════════════════════════════════════════════════════ -->
        <template #right-column>
            <div class="desktop-form-section d-flex flex-column h-100 pa-0">
                <!-- Table Header Bar Khas Manksi Web -->
                <div class="tbl-header">
                    <span class="tbl-title"
                        >Rincian Barang / Bahan yang Dikoreksi</span
                    >
                    <div class="d-flex align-center ga-2">
                        <!-- Tombol Cetak Barcode Sesuai Sistem MMT -->
                        <button
                            type="button"
                            class="btn-action"
                            @click="openBarcodePreview"
                            title="Preview dan Cetak Label Barcode"
                        >
                            <IconBarcode :size="13" class="mr-1" />
                            Cetak Barcode
                        </button>

                        <!-- Tombol Tambah Baris -->
                        <button
                            type="button"
                            class="btn-add"
                            @click="addItem"
                            title="Tambah Baris Baru"
                        >
                            <IconPlus :size="13" class="mr-1" />
                            Tambah Baris
                        </button>
                    </div>
                </div>

                <!-- Table Scroll Container Khas Manksi Web -->
                <div
                    class="tbl-wrap flex-grow-1"
                    style="min-height: 380px; max-height: calc(100vh - 240px)"
                >
                    <table class="gt">
                        <thead>
                            <tr>
                                <th style="width: 35px" class="tc">No</th>
                                <th style="width: 160px">SKU / Kode Bahan</th>
                                <th style="min-width: 190px">Nama Bahan</th>
                                <th style="width: 65px" class="tc">Satuan</th>
                                <th style="width: 75px" class="tr">P (m)</th>
                                <th style="width: 75px" class="tr">L (m)</th>
                                <th style="width: 90px" class="tr">
                                    Stok Sistem
                                </th>
                                <th style="width: 90px" class="tr">
                                    Stok Fisik
                                </th>
                                <th style="width: 90px" class="tr">
                                    Qty Koreksi
                                </th>
                                <th style="width: 35px" class="tc">Aksi</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-for="(it, idx) in formData.items" :key="idx">
                                <td class="tc text-caption text-grey">
                                    {{ idx + 1 }}
                                </td>

                                <!-- SKU / Barcode / Kode Bahan dengan tombol lookup -->
                                <td>
                                    <div class="igrp-table">
                                        <input
                                            type="text"
                                            v-model="it.kode"
                                            class="ci fw text-primary"
                                            placeholder="Scan Barcode / SKU..."
                                            @keyup.enter="onSkuScanOrEnter(idx)"
                                        />
                                        <button
                                            type="button"
                                            class="blkp-mini"
                                            @click="openBahanLookup(idx)"
                                            title="Pilih Bahan / Barcode"
                                        >
                                            <IconSearch :size="12" />
                                        </button>
                                    </div>
                                </td>

                                <!-- Nama Bahan (Readonly) -->
                                <td>
                                    <input
                                        type="text"
                                        v-model="it.nama"
                                        class="ci ro"
                                        readonly
                                        placeholder="Nama bahan..."
                                    />
                                </td>

                                <!-- Satuan -->
                                <td class="tc">
                                    <input
                                        type="text"
                                        v-model="it.satuan"
                                        class="ci tc ro"
                                        readonly
                                    />
                                </td>

                                <!-- Panjang (m) - Editable -->
                                <td>
                                    <input
                                        type="number"
                                        step="any"
                                        v-model.number="it.panjang"
                                        class="ci tr"
                                        placeholder="0"
                                    />
                                </td>

                                <!-- Lebar (m) - Editable -->
                                <td>
                                    <input
                                        type="number"
                                        step="any"
                                        v-model.number="it.lebar"
                                        class="ci tr"
                                        placeholder="0"
                                    />
                                </td>

                                <!-- Stok Sistem (Readonly) -->
                                <td
                                    class="tr text-caption font-weight-medium text-grey-darken-3 pr-2"
                                >
                                    {{ it.system }}
                                </td>

                                <!-- Stok Fisik (Editable Number) -->
                                <td>
                                    <input
                                        type="number"
                                        step="any"
                                        v-model.number="it.fisik"
                                        class="ci tr fw text-primary"
                                        @input="calculateRow(idx)"
                                        placeholder="0"
                                    />
                                </td>

                                <!-- Qty Koreksi (Fisik - Sistem) -->
                                <td
                                    class="tr font-weight-bold pr-2"
                                    :class="
                                        it.qty > 0
                                            ? 'text-success'
                                            : it.qty < 0
                                              ? 'text-error'
                                              : 'text-grey'
                                    "
                                >
                                    {{ it.qty > 0 ? `+${it.qty}` : it.qty }}
                                </td>

                                <!-- Tombol Hapus Baris -->
                                <td class="tc">
                                    <button
                                        type="button"
                                        class="btn-del"
                                        @click="removeItem(idx)"
                                        title="Hapus baris"
                                    >
                                        <IconTrash :size="14" />
                                    </button>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <!-- Summary Footer Khas Manksi Web -->
                <div class="summary-footer">
                    <div class="sum-item">
                        <span class="text-caption text-grey"
                            >Total Baris:
                            <strong>{{ formData.items.length }}</strong></span
                        >
                    </div>
                    <div class="d-flex align-center ga-4">
                        <div class="sum-item">
                            <span>Total Sistem:</span>
                            <strong>{{ totalSystem }}</strong>
                        </div>
                        <div class="sum-item">
                            <span>Total Fisik:</span>
                            <strong>{{ totalFisik }}</strong>
                        </div>
                        <div class="sum-item grand">
                            <span>Total Selisih:</span>
                            <span
                                class="font-weight-bold"
                                :class="
                                    totalQtyKoreksi > 0
                                        ? 'text-success'
                                        : totalQtyKoreksi < 0
                                          ? 'text-error'
                                          : 'text-primary'
                                "
                            >
                                {{
                                    totalQtyKoreksi > 0
                                        ? `+${totalQtyKoreksi}`
                                        : totalQtyKoreksi
                                }}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </template>
    </BaseForm>

    <!-- Modal Lookups -->
    <GudangMmtSearchModal
        v-model="showGudangModal"
        @selected="handleSelectGudang"
    />

    <MasterBahanModal
        :is-visible="showBahanModal"
        :mode="bahanModalMode"
        :initial-keyword="initialSearchKeyword"
        @close="showBahanModal = false"
        @select="onSelectBahan"
    />

    <!-- Dialog Preview Barcode / Label Roll (70mm x 50mm) -->
    <v-dialog v-model="showQRDialog" max-width="900" scrollable>
        <v-card class="rounded-lg">
            <v-card-title
                class="d-flex align-center py-3 px-4 border-b bg-grey-lighten-4"
            >
                <v-avatar color="teal" variant="tonal" size="32" class="mr-2">
                    <IconBarcode :size="18" />
                </v-avatar>
                <div>
                    <div class="text-subtitle-1 font-weight-bold">
                        Preview Cetak Label Barcode Koreksi
                    </div>
                    <div class="text-caption text-medium-emphasis">
                        Total Terpilih:
                        <strong
                            >{{
                                selectedPrintIndices.length * (printCopies || 1)
                            }}
                            Label</strong
                        >
                    </div>
                </div>
                <v-spacer />
                <div class="d-flex align-center ga-2">
                    <v-btn
                        color="primary"
                        size="small"
                        class="text-none font-weight-bold px-4"
                        :disabled="selectedPrintIndices.length === 0"
                        @click="printContent"
                    >
                        <template #prepend>
                            <IconPrinter :size="16" />
                        </template>
                        PRINT SEKARANG
                    </v-btn>
                    <v-btn
                        icon
                        size="small"
                        variant="text"
                        @click="showQRDialog = false"
                    >
                        <IconX :size="18" />
                    </v-btn>
                </div>
            </v-card-title>

            <v-card-text class="pa-4 bg-grey-lighten-5">
                <v-card
                    variant="flat"
                    border
                    class="pa-3 mb-3 bg-white rounded-lg"
                >
                    <div
                        class="d-flex align-center flex-wrap justify-space-between ga-3"
                    >
                        <div class="text-caption font-weight-medium">
                            Setiap barcode dicetak 2 label roll secara otomatis
                            sesuai standar MMT.
                        </div>
                        <div>
                            <v-btn
                                size="small"
                                variant="outlined"
                                color="secondary"
                                class="text-none"
                                @click="toggleSelectAll"
                            >
                                {{
                                    selectedPrintIndices.length ===
                                    itemsToPrint.length
                                        ? "Batalkan Semua"
                                        : "Pilih Semua"
                                }}
                            </v-btn>
                        </div>
                    </div>
                </v-card>

                <!-- Grid Preview Label -->
                <div class="preview-grid">
                    <div
                        v-for="(item, idx) in itemsToPrint"
                        :key="idx"
                        class="preview-card-item"
                        :class="{ active: selectedPrintIndices.includes(idx) }"
                        @click="
                            selectedPrintIndices.includes(idx)
                                ? selectedPrintIndices.splice(
                                      selectedPrintIndices.indexOf(idx),
                                      1,
                                  )
                                : selectedPrintIndices.push(idx)
                        "
                    >
                        <div class="selection-indicator">
                            <v-icon
                                v-if="selectedPrintIndices.includes(idx)"
                                size="16"
                                color="primary"
                                :icon="IconCheck"
                            />
                        </div>
                        <div class="label-box bg-white">
                            <div class="border-inner">
                                <div class="top-row">
                                    <img :src="item.qrImage" class="qr-img" />
                                    <div class="info-column">
                                        <div class="qr-text">
                                            {{ item.qrValue }}
                                        </div>
                                        <div class="dimens-text">
                                            {{ item.Panjang }} x
                                            {{ item.Lebar }}
                                        </div>
                                    </div>
                                </div>
                                <div class="divider"></div>
                                <div class="product-name">
                                    {{ item.Nama_Bahan }}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </v-card-text>
        </v-card>
    </v-dialog>
</template>

<style scoped>
/* ── Lebar Kolom Kiri / Card Data Header Dokumen ── */
:deep(.form-grid-container.two-column) {
    --left-col-width: 390px;
}
@media (min-width: 1600px) {
    :deep(.form-grid-container.two-column) {
        --left-col-width: 420px;
    }
}
@media (max-width: 1400px) {
    :deep(.form-grid-container.two-column) {
        --left-col-width: 360px;
    }
}

/* ── Kolom Kiri: Sidebar Header Dokumen Khas Manksi Web ── */
.desktop-form-section {
    background: white;
    border: 1px solid #e2e8f0;
    border-radius: 6px;
    padding: 12px 14px;
    margin-bottom: 10px;
}
.header-section {
    padding-right: 32px; /* Ruang aman agar tombol collapse panel kiri tidak menimpa judul */
}
.section-label {
    font-size: 11px;
    font-weight: 700;
    color: #1976d2;
    text-transform: uppercase;
    margin-bottom: 10px;
    letter-spacing: 0.5px;
}
.fr {
    display: flex;
    align-items: center;
    margin-bottom: 8px;
    gap: 8px;
    min-height: 28px;
}
.fr:last-child {
    margin-bottom: 0;
}
.fr-top {
    align-items: flex-start;
}
.lbl {
    width: 95px;
    flex-shrink: 0;
    font-size: 11px;
    font-weight: 600;
    color: #475569;
}
.inp {
    height: 28px;
    border: 1px solid #cbd5e1;
    border-radius: 4px;
    padding: 0 8px;
    font-size: 11px;
    color: #1e293b;
    background: white;
    outline: none;
    transition: border-color 0.15s;
}
.inp:focus {
    border-color: #1976d2;
}
.inp.ro {
    background: #f8fafc;
    color: #64748b;
    cursor: default;
}
.inp.fw {
    font-weight: 600;
}
.inp.ta {
    height: auto;
    padding: 5px 8px;
    resize: vertical;
}
.idate {
    height: 28px;
    border: 1px solid #cbd5e1;
    border-radius: 4px;
    padding: 0 8px;
    font-size: 11px;
    color: #1e293b;
    background: white;
    outline: none;
}
.iselect {
    height: 28px;
    border: 1px solid #cbd5e1;
    border-radius: 4px;
    padding: 0 6px;
    font-size: 11px;
    color: #1e293b;
    background: white;
    outline: none;
}
.igrp {
    display: flex;
    align-items: center;
    border: 1px solid #cbd5e1;
    border-radius: 4px;
    background: white;
    height: 28px;
    overflow: hidden;
    min-width: 0;
    box-sizing: border-box;
}
.igrp .inp,
.igrp .ci {
    border: none;
    border-radius: 0;
    flex: 1;
    height: 100%;
}
.blkp {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0 8px;
    background: #f1f5f9;
    border: none;
    border-left: 1px solid #cbd5e1;
    height: 100%;
    cursor: pointer;
    color: #475569;
    transition: background 0.15s;
}
.blkp:hover {
    background: #e2e8f0;
    color: #1976d2;
}

/* ── Summary Card di Sidebar Kiri ── */
.total-summary-card {
    background: #f0fdf4;
    border: 1px solid #bbf7d0;
    border-radius: 6px;
    padding: 8px 12px;
}
.total-label {
    font-size: 11px;
    font-weight: 700;
    color: #166534;
}
.total-value {
    font-size: 15px;
    font-weight: 800;
}

/* ── Kolom Kanan: Grid Tabel List Inputan Khas Manksi Web ── */
.tbl-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    background: #1565c0;
    color: white;
    padding: 6px 12px;
    border-radius: 6px 6px 0 0;
}
.tbl-title {
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.3px;
}
.btn-add,
.btn-action {
    background: rgba(255, 255, 255, 0.2);
    color: white;
    border: 1px solid rgba(255, 255, 255, 0.4);
    padding: 3px 8px;
    font-size: 11px;
    font-weight: 600;
    cursor: pointer;
    border-radius: 3px;
    display: flex;
    align-items: center;
    transition: background 0.15s;
}
.btn-add:hover,
.btn-action:hover {
    background: rgba(255, 255, 255, 0.35);
}

.tbl-wrap {
    overflow: auto;
    border: 1px solid #cbd5e1;
    border-top: none;
    background: white;
}
.gt {
    width: 100%;
    border-collapse: collapse;
    font-size: 11px;
}
.gt th {
    background: #f8fafc;
    border-bottom: 2px solid #cbd5e1;
    border-right: 1px solid #e2e8f0;
    padding: 5px 6px;
    text-align: left;
    font-weight: 700;
    color: #475569;
    white-space: nowrap;
}
.gt td {
    border-bottom: 1px solid #f1f5f9;
    border-right: 1px solid #f8fafc;
    padding: 2px 4px;
    vertical-align: middle;
}
.tc {
    text-align: center;
}
.tr {
    text-align: right;
}

.ci {
    width: 100%;
    height: 24px;
    border: none;
    outline: none;
    padding: 0 4px;
    font-size: 11px;
    background: transparent;
    color: #1e293b;
}
.ci:focus:not(:read-only) {
    background: #eff6ff;
    border-radius: 2px;
}
.ci.ro {
    cursor: default;
    color: #475569;
}
.ci.fw {
    font-weight: 600;
}

.igrp-table {
    display: flex;
    align-items: center;
    gap: 2px;
}
.blkp-mini {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0 4px;
    height: 22px;
    background: #f1f5f9;
    border: 1px solid #cbd5e1;
    border-radius: 3px;
    cursor: pointer;
    color: #64748b;
    flex-shrink: 0;
}
.blkp-mini:hover {
    background: #e2e8f0;
    color: #1976d2;
}

.btn-del {
    background: transparent;
    border: none;
    color: #ef4444;
    cursor: pointer;
    padding: 2px;
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0 auto;
    border-radius: 3px;
}
.btn-del:hover {
    background: #fee2e2;
}

/* ── Summary Footer ── */
.summary-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 6px 12px;
    background: #f8fafc;
    border: 1px solid #cbd5e1;
    border-top: none;
    border-radius: 0 0 6px 6px;
    font-size: 11px;
}
.sum-item {
    display: flex;
    align-items: center;
    gap: 6px;
}
.sum-item.grand {
    font-size: 12px;
}

/* Preview Barcode Label Styling (Ukuran 70mm x 50mm) */
.preview-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 16px;
    max-height: 60vh;
    overflow-y: auto;
    padding: 8px;
}
.preview-card-item {
    position: relative;
    cursor: pointer;
    border-radius: 8px;
    border: 2px solid #e2e8f0;
    padding: 10px;
    display: flex;
    justify-content: center;
    align-items: center;
    background: #f8fafc;
    transition: all 0.2s ease;
}
.preview-card-item:hover {
    border-color: #94a3b8;
}
.preview-card-item.active {
    border-color: rgb(var(--v-theme-primary));
    background-color: #eff6ff;
}
.selection-indicator {
    position: absolute;
    top: 6px;
    right: 6px;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    border: 1px solid #cbd5e1;
    background: white;
    display: flex;
    align-items: center;
    justify-content: center;
}
.preview-card-item.active .selection-indicator {
    border-color: rgb(var(--v-theme-primary));
}
.label-box {
    width: 70mm;
    height: 50mm;
    padding: 3mm;
    box-sizing: border-box;
    background: #ffffff;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}
.border-inner {
    border: 1pt solid black;
    height: 100%;
    width: 100%;
    padding: 2mm;
    display: flex;
    flex-direction: column;
    box-sizing: border-box;
}
.top-row {
    display: flex;
    gap: 8px;
}
.qr-img {
    width: 1.4cm;
    height: 1.4cm;
    flex-shrink: 0;
}
.info-column {
    display: flex;
    flex-direction: column;
    justify-content: center;
    overflow: hidden;
}
.qr-text {
    font-weight: bold;
    font-size: 8pt;
    word-break: break-all;
    line-height: 1.1;
}
.dimens-text {
    font-size: 9pt;
    font-weight: bold;
    margin-top: 3px;
}
.divider {
    border-top: 1pt solid black;
    width: 100%;
    margin: 3px 0;
}
.product-name {
    font-size: 11pt;
    font-weight: bold;
    text-align: center;
    flex-grow: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    line-height: 1.1;
}
</style>
