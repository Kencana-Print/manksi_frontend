<script setup lang="ts">
import { ref, computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useToast } from "vue-toastification";
import BaseForm from "@/components/BaseForm.vue";
import { useForm } from "@/composables/useForm";
import {
    IconClipboardCheck,
    IconSearch,
    IconPlus,
    IconTrash,
    IconX,
    IconPrinter,
    IconBarcode,
} from "@tabler/icons-vue";
import api from "@/services/api";

import PermintaanProduksiMmtSearchModal from "@/components/lookups/PermintaanProduksiMmtSearchModal.vue";
import GudangMmtSearchModal from "@/components/lookups/GudangMmtSearchModal.vue";
import BahanMmtSearchModal from "@/components/lookups/BahanMmtSearchModal.vue";
import SpkSearchModal from "@/components/lookups/SpkSearchModal.vue";

const route = useRoute();
const router = useRouter();
const toast = useToast();

interface DetailItem {
    no: number;
    barcode: string;
    sku: string;
    nama: string;
    satuan: string;
    panjang: string | number;
    lebar: string | number;
    qty: number;
    spk: string;
    keterangan: string;
}

interface RealisasiForm {
    nomor: string;
    tanggal: string;
    gudangKode: string;
    gudangNama: string;
    lokasiProduksi: string;
    lokasiProduksiNama: string;
    permintaan: string;
    keterangan: string;
    items: DetailItem[];
}

const initialData: RealisasiForm = {
    nomor: "AUTO",
    tanggal: new Date().toISOString().substring(0, 10),
    gudangKode: "",
    gudangNama: "",
    lokasiProduksi: "",
    lokasiProduksiNama: "",
    permintaan: "",
    keterangan: "",
    items: [
        {
            no: 1,
            barcode: "",
            sku: "",
            nama: "",
            satuan: "ROLL",
            panjang: "",
            lebar: "",
            qty: 1,
            spk: "",
            keterangan: "",
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

const showPermintaanModal = ref(false);
const showGudangAsalModal = ref(false);
const showLokasiProdModal = ref(false);
const showBahanModal = ref(false);
const showSpkModal = ref(false);
const activeRowIndex = ref<number | null>(null);

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
} = useForm<RealisasiForm>({
    menuId: "5537",
    initialData,
    fetchApi: async () => {
        const nomor = route.params.nomor || route.query.nomor;
        if (!nomor) return { ...initialData };

        const res = await api.get(
            `/mmt/bahan-baku-produksi/realisasi-produksi/${encodeURIComponent(String(nomor))}`,
        );
        const data = res.data?.data;
        if (!data) return { ...initialData };

        const header = data.header || {};
        const details = data.details || [];

        const gKode = header.GudangKode || "WH-16";
        const gNama =
            header.NamaGudang ||
            (gKode === "WH-16" ? "GUDANG UTAMA MMT" : gKode);
        const lKode = header.LokasiProduksi || "GPM";
        const lNama =
            header.NamaLokasiProduksi ||
            (lKode === "GPM" ? "Gudang Produksi MMT" : lKode);

        return {
            nomor: header.Nomor || String(nomor),
            tanggal: toDateInputValue(header.Tanggal) || initialData.tanggal,
            gudangKode: gKode,
            gudangNama: gNama,
            lokasiProduksi: lKode,
            lokasiProduksiNama: lNama,
            permintaan: header.Permintaan || "",
            keterangan: header.Keterangan || "",
            items: details.map((d: any, idx: number) => ({
                no: idx + 1,
                barcode: d.barcode || "",
                sku: d.sku || "",
                nama: d.nama || "",
                satuan: d.satuan || "ROLL",
                panjang: d.panjang ?? "",
                lebar: d.lebar ?? "",
                qty: Number(d.qty ?? 1),
                spk: d.spk && d.spk !== "0" ? d.spk : "",
                keterangan: d.keterangan || "",
            })),
        };
    },
    submitApi: async (dataToSave) => {
        if (!dataToSave.gudangKode) {
            throw new Error("Gudang asal wajib dipilih.");
        }
        if (!dataToSave.lokasiProduksi) {
            throw new Error("Lokasi produksi peminta wajib dipilih.");
        }

        const validItems = dataToSave.items.filter(
            (it) => it.sku.trim() !== "" && it.qty > 0,
        );
        if (validItems.length === 0) {
            throw new Error(
                "Mohon isi minimal satu item bahan dengan QTY > 0.",
            );
        }

        // Validasi barcode tidak boleh duplikat jika terisi
        const barcodeMap = new Set<string>();
        for (const it of validItems) {
            const bc = it.barcode?.trim();
            if (bc) {
                if (barcodeMap.has(bc)) {
                    throw new Error(
                        `Barcode ${bc} diinput lebih dari satu kali.`,
                    );
                }
                barcodeMap.add(bc);
            }
        }

        const payload = {
            isEditMode: isEditMode.value,
            header: {
                nomor: dataToSave.nomor,
                tanggal: dataToSave.tanggal,
                mnt_gdg_kode: dataToSave.gudangKode,
                mnt_lokasiproduksi: dataToSave.lokasiProduksi,
                mnt_permintaan: dataToSave.permintaan || null,
                mnt_keterangan: dataToSave.keterangan || null,
            },
            details: validItems.map((it, idx) => ({
                nourut: idx + 1,
                barcode: it.barcode?.trim() || null,
                sku: it.sku,
                qty: Number(it.qty) || 1,
                satuan: it.satuan || "ROLL",
                spk: it.spk || "0",
                panjang: Number(it.panjang) || 0,
                lebar: Number(it.lebar) || 0,
                keterangan: it.keterangan || null,
            })),
        };

        if (isEditMode.value) {
            await api.put(
                "/mmt/bahan-baku-produksi/realisasi-produksi",
                payload,
            );
        } else {
            await api.post(
                "/mmt/bahan-baku-produksi/realisasi-produksi",
                payload,
            );
        }
    },
});

// Handler saat dokumen permintaan dipilih dari modal
const onSelectPermintaan = async (p: { Nomor: string }) => {
    formData.value.permintaan = p.Nomor;
    try {
        const res = await api.get(
            `/mmt/bahan-baku-produksi/permintaan-produksi/${encodeURIComponent(p.Nomor)}`,
        );
        const data = res.data?.data || res.data;
        if (data) {
            if (data.GudangKode) {
                formData.value.gudangKode = data.GudangKode;
                formData.value.gudangNama =
                    data.GudangNama ||
                    (data.GudangKode === "WH-16"
                        ? "GUDANG UTAMA MMT"
                        : data.GudangKode);
            }
            if (data.Lokasi || data.LokasiProduksi) {
                formData.value.lokasiProduksi =
                    data.Lokasi || data.LokasiProduksi;
                formData.value.lokasiProduksiNama =
                    data.LokasiNama ||
                    data.NamaLokasiProduksi ||
                    (formData.value.lokasiProduksi === "GPM"
                        ? "Gudang Produksi MMT"
                        : formData.value.lokasiProduksi);
            }
            if (data.Keterangan && !formData.value.keterangan) {
                formData.value.keterangan = data.Keterangan;
            }

            // Muat item rincian bahan dari dokumen permintaan
            const reqDetails = data.Details || data.details || [];
            if (reqDetails.length > 0) {
                formData.value.items = reqDetails.map(
                    (d: any, idx: number) => ({
                        no: idx + 1,
                        barcode: d.barcode || "",
                        sku: d.Kode || d.sku || "",
                        nama: d.Nama_Bahan || d.nama || "",
                        satuan: d.Satuan || d.satuan || "ROLL",
                        panjang: d.Panjang ?? d.panjang ?? "",
                        lebar: d.Lebar ?? d.lebar ?? "",
                        qty: Number(d.Jumlah ?? d.qty ?? 1),
                        spk:
                            d.Nomor_SPK && d.Nomor_SPK !== "0"
                                ? d.Nomor_SPK
                                : d.spk || "",
                        keterangan: d.Keterangan || d.keterangan || "",
                    }),
                );
                toast.success(
                    `Berhasil menarik ${reqDetails.length} item dari Dokumen Permintaan ${p.Nomor}`,
                );
            }
        }
    } catch (err: any) {
        console.error("Gagal menarik detail dokumen permintaan:", err);
        toast.warning(
            `Dokumen permintaan ${p.Nomor} dipilih, namun gagal memuat rincian bahan.`,
        );
    }
};

const clearPermintaan = () => {
    formData.value.permintaan = "";
};

// Barcode Scan Handler
const onBarcodeScan = async (idx: number) => {
    const item = formData.value.items[idx];
    const bc = item.barcode?.trim();
    if (!bc) return;

    if (!formData.value.gudangKode) {
        toast.error("Silakan pilih Gudang Asal terlebih dahulu.");
        item.barcode = "";
        return;
    }

    // 1. Validasi duplikasi barcode pada baris lain di form
    const isDuplicate = formData.value.items.some(
        (it, i) => i !== idx && it.barcode.trim() === bc,
    );
    if (isDuplicate) {
        toast.warning(`Barcode ${bc} sudah di-scan pada daftar.`);
        item.barcode = "";
        return;
    }

    try {
        const res = await api.get(
            `/mmt/bahan-baku-produksi/realisasi-produksi/stok-barcode/${encodeURIComponent(bc)}`,
            { params: { gudang: formData.value.gudangKode } },
        );
        const b = res.data?.data;
        if (!b) {
            toast.warning(
                `Barcode ${bc} tidak ditemukan di gudang ${formData.value.gudangKode}.`,
            );
            item.barcode = "";
            return;
        }

        // 2. Cek apakah ada baris bahan permintaan yang cocok dengan SKU ini dan belum memiliki barcode
        const matchIdx = formData.value.items.findIndex(
            (it) =>
                it.sku === b.Kode && (!it.barcode || it.barcode.trim() === ""),
        );

        if (matchIdx !== -1) {
            const matchedRow = formData.value.items[matchIdx];
            matchedRow.barcode = b.Barcode || bc;
            matchedRow.nama = b.Nama_Bahan || matchedRow.nama;
            matchedRow.satuan = b.Satuan || matchedRow.satuan;
            matchedRow.panjang = b.Panjang ?? matchedRow.panjang;
            matchedRow.lebar = b.Lebar ?? matchedRow.lebar;
            matchedRow.qty = 1;
            if (b.Nomor_SPK && b.Nomor_SPK !== "0") {
                matchedRow.spk = b.Nomor_SPK;
            }

            if (idx !== matchIdx) {
                item.barcode = "";
            }
            toast.success(
                `Barcode cocok dengan permintaan: ${matchedRow.nama} (P: ${b.Panjang}m)`,
            );
        } else {
            // Isi baris aktif
            item.barcode = b.Barcode || bc;
            item.sku = b.Kode;
            item.nama = b.Nama_Bahan;
            item.satuan = b.Satuan || "ROLL";
            item.panjang = b.Panjang ?? "";
            item.lebar = b.Lebar ?? "";
            item.qty = 1;
            item.spk = b.Nomor_SPK && b.Nomor_SPK !== "0" ? b.Nomor_SPK : "";

            toast.success(`Barcode terbaca: ${item.nama} (P: ${b.Panjang}m)`);

            // Jika scan pada baris terakhir, otomatis tambah baris baru
            if (idx === formData.value.items.length - 1) {
                addItem();
            }
        }
    } catch (err: any) {
        toast.warning(`Barcode ${bc} tidak ditemukan atau gagal diverifikasi.`);
        item.barcode = "";
    }
};

// Modal Lookups Handlers
const openBahanLookup = (idx: number) => {
    activeRowIndex.value = idx;
    showBahanModal.value = true;
};

const onSelectBahan = (b: any) => {
    if (
        activeRowIndex.value !== null &&
        formData.value.items[activeRowIndex.value]
    ) {
        const row = formData.value.items[activeRowIndex.value];
        row.sku = b.Kode || b.brg_kode || "";
        row.nama = b.Nama || b.brg_nama || "";
        row.satuan = b.Satuan || b.brg_satuan || "ROLL";
        row.panjang = b.Panjang || b.brg_panjang || "";
        row.lebar = b.Lebar || b.brg_lebar || "";
        if (!row.barcode && b.Barcode) {
            row.barcode = b.Barcode;
        }

        if (activeRowIndex.value === formData.value.items.length - 1) {
            addItem();
        }
    }
};

const openSpkLookup = (idx: number) => {
    activeRowIndex.value = idx;
    showSpkModal.value = true;
};

const onSelectSpk = (spk: any) => {
    if (
        activeRowIndex.value !== null &&
        formData.value.items[activeRowIndex.value]
    ) {
        const row = formData.value.items[activeRowIndex.value];
        row.spk = spk.Nomor || spk.spk_nomor || "";
    }
};

const onSelectGudangAsal = (g: { Kode: string; Nama: string }) => {
    formData.value.gudangKode = g.Kode;
    formData.value.gudangNama = g.Nama;
};

const onSelectLokasiProd = (g: { Kode: string; Nama: string }) => {
    formData.value.lokasiProduksi = g.Kode;
    formData.value.lokasiProduksiNama = g.Nama;
};

const addItem = () => {
    formData.value.items.push({
        no: formData.value.items.length + 1,
        barcode: "",
        sku: "",
        nama: "",
        satuan: "ROLL",
        panjang: "",
        lebar: "",
        qty: 1,
        spk: "",
        keterangan: "",
    });
};

const removeItem = (idx: number) => {
    if (formData.value.items.length <= 1) {
        formData.value.items[0] = {
            no: 1,
            barcode: "",
            sku: "",
            nama: "",
            satuan: "ROLL",
            panjang: "",
            lebar: "",
            qty: 1,
            spk: "",
            keterangan: "",
        };
        return;
    }
    formData.value.items.splice(idx, 1);
    formData.value.items.forEach((it, i) => (it.no = i + 1));
};

const handlePrint = () => {
    if (!formData.value.nomor || formData.value.nomor === "AUTO") {
        toast.warning(
            "Simpan formulir realisasi terlebih dahulu sebelum mencetak.",
        );
        return;
    }
    const url = router.resolve({
        path: `/mmt/bahan-baku-produksi/realisasi-permintaan-produksi/print/${encodeURIComponent(
            formData.value.nomor,
        )}`,
    }).href;
    window.open(url, "_blank");
};

const totalQty = computed(() => {
    return formData.value.items.reduce(
        (sum, it) => sum + (Number(it.qty) || 0),
        0,
    );
});

const totalPanjang = computed(() => {
    return formData.value.items.reduce(
        (sum, it) => sum + (Number(it.panjang) || 0) * (Number(it.qty) || 1),
        0,
    );
});

const totalItem = computed(() => {
    return formData.value.items.filter((it) => it.sku.trim() !== "").length;
});
</script>

<template>
    <BaseForm
        :title="
            isEditMode
                ? `Ubah Realisasi Permintaan Produksi (${formData.nomor})`
                : 'Tambah Realisasi Permintaan Produksi Baru'
        "
        menu-id="5537"
        :icon="IconClipboardCheck"
        :is-loading="isLoading"
        :is-saving="isSaving"
        item-name="Realisasi Permintaan Produksi"
        desktop-mode
        v-model:show-save-dialog="showSaveDialog"
        v-model:show-cancel-dialog="showCancelDialog"
        v-model:show-close-dialog="showCloseDialog"
        @validate-save="showSaveDialog = true"
        @confirm-save="executeSave"
        @confirm-cancel="executeCancel"
        @confirm-close="executeClose"
    >
        <!-- ── HEADER ACTIONS PREPEND (TOMBOL CETAK SAAT EDIT MODE) ── -->
        <template #header-actions-prepend>
            <v-btn
                v-if="isEditMode"
                size="small"
                variant="tonal"
                color="secondary"
                class="mr-2"
                @click="handlePrint"
            >
                <template #prepend>
                    <span class="d-flex align-center">
                        <IconPrinter :size="15" :stroke-width="1.7" />
                    </span>
                </template>
                Cetak Slip
            </v-btn>
        </template>

        <!-- ══════════════════════════════════════════════════════════
     ── KOLOM KIRI (HEADER, DOKUMEN ASAL & RINGKASAN FORM) ──
     ══════════════════════════════════════════════════════════ -->
        <template #left-column>
            <!-- Section 1: Data Header Dokumen -->
            <div class="desktop-form-section header-section">
                <div class="section-label">Data Header Dokumen</div>

                <!-- Nomor Dokumen -->
                <div class="fr">
                    <label class="lbl">Nomor Dokumen</label>
                    <input
                        :value="formData.nomor"
                        readonly
                        class="inp ro fw flex-grow-1"
                        placeholder="AUTO"
                    />
                </div>

                <!-- Tanggal Dokumen -->
                <div class="fr">
                    <label class="lbl">Tanggal</label>
                    <input
                        type="date"
                        v-model="formData.tanggal"
                        class="idate flex-grow-1"
                        required
                    />
                </div>

                <!-- Gudang Asal (Lookup GudangMmtSearchModal) -->
                <div class="fr">
                    <label class="lbl">Gudang Asal</label>
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
                            @click="showGudangAsalModal = true"
                        />
                        <button
                            type="button"
                            class="blkp"
                            @click="showGudangAsalModal = true"
                            title="Cari Gudang Asal"
                        >
                            <IconSearch :size="13" />
                        </button>
                    </div>
                </div>

                <!-- Lokasi Produksi (Lookup GudangMmtSearchModal) -->
                <div class="fr">
                    <label class="lbl">Lokasi Produksi</label>
                    <div class="igrp flex-grow-1">
                        <input
                            type="text"
                            :value="
                                formData.lokasiProduksi
                                    ? `${formData.lokasiProduksi} - ${formData.lokasiProduksiNama}`
                                    : ''
                            "
                            class="inp ro fw text-primary"
                            readonly
                            placeholder="Cari..."
                            @click="showLokasiProdModal = true"
                        />
                        <button
                            type="button"
                            class="blkp"
                            @click="showLokasiProdModal = true"
                            title="Cari Lokasi Produksi"
                        >
                            <IconSearch :size="13" />
                        </button>
                    </div>
                </div>

                <!-- No. Permintaan (Lookup PermintaanProduksiMmtSearchModal) -->
                <div class="fr">
                    <label class="lbl">No. Permintaan</label>
                    <div class="igrp flex-grow-1">
                        <input
                            type="text"
                            :value="formData.permintaan"
                            class="inp ro fw text-primary"
                            readonly
                            placeholder="Cari Dokumen..."
                            @click="showPermintaanModal = true"
                        />
                        <button
                            v-if="formData.permintaan"
                            type="button"
                            class="bclr"
                            @click.stop="clearPermintaan"
                            title="Hapus referensi permintaan"
                        >
                            <IconX :size="13" />
                        </button>
                        <button
                            type="button"
                            class="blkp"
                            @click="showPermintaanModal = true"
                            title="Cari Dokumen Permintaan Produksi"
                        >
                            <IconSearch :size="13" />
                        </button>
                    </div>
                </div>
            </div>

            <!-- Section 2: Catatan / Keterangan -->
            <div class="desktop-form-section note-section">
                <div class="section-label">Catatan & Keterangan</div>

                <div class="fr align-start">
                    <label class="lbl" style="padding-top: 4px"
                        >Keterangan</label
                    >
                    <textarea
                        v-model="formData.keterangan"
                        class="ta flex-grow-1"
                        rows="3"
                        placeholder="Keterangan pengeluaran / realisasi..."
                    ></textarea>
                </div>
            </div>

            <!-- Section 3: Ringkasan Transaksi -->
            <div class="desktop-form-section summary-section">
                <div class="section-label">Ringkasan Dokumen</div>

                <div class="fr">
                    <label class="lbl">Item Bahan</label>
                    <span class="fw text-primary">{{ totalItem }} Item</span>
                </div>
                <div class="fr">
                    <label class="lbl">Total Rol</label>
                    <span class="fw text-success">{{ totalQty }} Rol</span>
                </div>
                <div class="fr">
                    <label class="lbl">Total Panjang</label>
                    <span class="fw text-info"
                        >{{ totalPanjang.toFixed(1) }} m</span
                    >
                </div>
            </div>
        </template>

        <!-- ══════════════════════════════════════════════════════════
     ── KOLOM KANAN (GRID TABEL RINCIAN REALISASI BAHAN) ──
     ══════════════════════════════════════════════════════════ -->
        <template #right-column>
            <div class="desktop-form-section d-flex flex-column h-100 pa-0">
                <!-- Table Header Bar Standar Manksi (Navy Blue) -->
                <div class="tbl-header">
                    <span class="tbl-title"
                        >Rincian Bahan yang Direalisasikan</span
                    >
                    <button type="button" class="btn-add" @click="addItem">
                        <IconPlus :size="13" class="mr-1" /> Tambah Baris
                    </button>
                </div>

                <!-- Table Scroll Container -->
                <div
                    class="tbl-wrap flex-grow-1"
                    style="min-height: 280px; max-height: calc(100vh - 310px)"
                >
                    <table class="gt">
                        <thead>
                            <tr>
                                <th style="width: 35px" class="tc">No</th>
                                <th style="width: 160px">Barcode Rol</th>
                                <th style="width: 130px">Kode Bahan</th>
                                <th style="min-width: 180px">Nama Bahan</th>
                                <th style="width: 75px" class="tr">Qty</th>
                                <th style="width: 65px" class="tc">Satuan</th>
                                <th style="width: 65px" class="tc">P (m)</th>
                                <th style="width: 65px" class="tc">L (m)</th>
                                <th style="width: 140px">No. SPK</th>
                                <th style="min-width: 140px">Keterangan</th>
                                <th style="width: 35px" class="tc"></th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-for="(it, idx) in formData.items" :key="idx">
                                <!-- 1. No -->
                                <td class="tc">{{ idx + 1 }}</td>

                                <!-- 2. Barcode Rol (Scan / Ketik) -->
                                <td class="p0">
                                    <div
                                        class="igrp w-100"
                                        style="border: none; height: 100%"
                                    >
                                        <input
                                            type="text"
                                            v-model="it.barcode"
                                            class="ci fw text-primary"
                                            placeholder="Scan / ketik..."
                                            @keyup.enter="onBarcodeScan(idx)"
                                        />
                                        <button
                                            type="button"
                                            class="blkp"
                                            @click="onBarcodeScan(idx)"
                                            title="Cek / Validasi Barcode"
                                        >
                                            <IconBarcode :size="14" />
                                        </button>
                                    </div>
                                </td>

                                <!-- 3. Kode Bahan (Lookup BahanMmtSearchModal) -->
                                <td class="p0">
                                    <div
                                        class="igrp w-100"
                                        style="border: none; height: 100%"
                                    >
                                        <input
                                            type="text"
                                            :value="it.sku"
                                            readonly
                                            class="ci ro fw"
                                            placeholder="Cari..."
                                            @click="openBahanLookup(idx)"
                                        />
                                        <button
                                            type="button"
                                            class="blkp"
                                            @click="openBahanLookup(idx)"
                                            title="Cari Master Bahan"
                                        >
                                            <IconSearch :size="13" />
                                        </button>
                                    </div>
                                </td>

                                <!-- 4. Nama Bahan (Readonly dari Master) -->
                                <td class="p0">
                                    <input
                                        type="text"
                                        :value="it.nama"
                                        readonly
                                        class="ci ro fw"
                                        placeholder="Pilih Bahan..."
                                    />
                                </td>

                                <!-- 5. Qty Realisasi -->
                                <td class="p0">
                                    <input
                                        type="number"
                                        v-model.number="it.qty"
                                        min="1"
                                        step="1"
                                        class="ci tr fw"
                                    />
                                </td>

                                <!-- 6. Satuan -->
                                <td class="p0">
                                    <input
                                        type="text"
                                        v-model="it.satuan"
                                        class="ci tc"
                                        placeholder="ROLL"
                                    />
                                </td>

                                <!-- 7. Panjang (m) -->
                                <td class="p0">
                                    <input
                                        type="text"
                                        :value="it.panjang || '-'"
                                        class="ci ro tc"
                                        readonly
                                    />
                                </td>

                                <!-- 8. Lebar (m) -->
                                <td class="p0">
                                    <input
                                        type="text"
                                        :value="it.lebar || '-'"
                                        class="ci ro tc"
                                        readonly
                                    />
                                </td>

                                <!-- 9. No. SPK (Lookup SpkSearchModal) -->
                                <td class="p0">
                                    <div
                                        class="igrp w-100"
                                        style="border: none; height: 100%"
                                    >
                                        <input
                                            type="text"
                                            v-model="it.spk"
                                            class="ci text-secondary"
                                            placeholder="Cari SPK..."
                                            @click="openSpkLookup(idx)"
                                        />
                                        <button
                                            v-if="it.spk"
                                            type="button"
                                            class="bclr"
                                            @click.stop="it.spk = ''"
                                            title="Hapus pilihan SPK"
                                        >
                                            <IconX :size="12" />
                                        </button>
                                        <button
                                            type="button"
                                            class="blkp"
                                            @click="openSpkLookup(idx)"
                                            title="Cari SPK"
                                        >
                                            <IconSearch :size="13" />
                                        </button>
                                    </div>
                                </td>

                                <!-- 10. Keterangan Item -->
                                <td class="p0">
                                    <input
                                        type="text"
                                        v-model="it.keterangan"
                                        class="ci"
                                        placeholder="Keterangan..."
                                    />
                                </td>

                                <!-- 11. Aksi Hapus -->
                                <td class="tc p0">
                                    <button
                                        type="button"
                                        class="btn-del"
                                        @click="removeItem(idx)"
                                        title="Hapus baris"
                                    >
                                        <IconTrash :size="15" />
                                    </button>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <!-- Summary Footer Standar Manksi -->
                <div class="summary-footer">
                    <div class="sum-item">
                        <span>Jumlah Baris:</span>
                        <strong>{{ totalItem }} Item</strong>
                    </div>
                    <div class="d-flex align-center gap-4">
                        <div class="sum-item">
                            <span>Total QTY:</span>
                            <strong class="text-primary"
                                >{{ totalQty }} Rol</strong
                            >
                        </div>
                        <div class="sum-item grand fw">
                            <span>Total Panjang:</span>
                            <span>{{ totalPanjang.toFixed(1) }} m</span>
                        </div>
                    </div>
                </div>
            </div>
        </template>
    </BaseForm>

    <!-- Modals Lookup -->
    <PermintaanProduksiMmtSearchModal
        v-model="showPermintaanModal"
        @selected="onSelectPermintaan"
    />

    <GudangMmtSearchModal
        v-model="showGudangAsalModal"
        @selected="onSelectGudangAsal"
    />

    <GudangMmtSearchModal
        v-model="showLokasiProdModal"
        @selected="onSelectLokasiProd"
    />

    <BahanMmtSearchModal v-model="showBahanModal" @selected="onSelectBahan" />

    <SpkSearchModal v-model="showSpkModal" @selected="onSelectSpk" />
</template>

<style scoped>
:deep(.form-grid-container.two-column) {
    --left-col-width: 340px;
}
@media (max-width: 1400px) {
    :deep(.form-grid-container.two-column) {
        --left-col-width: 310px;
    }
}

/* ── Form Section Standar Manksi ── */
.desktop-form-section {
    background: white;
    border: 1px solid #e0e0e0;
    border-radius: 6px;
    padding: 12px;
    margin-bottom: 10px;
    font-family: "Segoe UI", system-ui, sans-serif;
    font-size: 11px;
}
.header-section {
    padding-right: 32px; /* Ruang aman agar tombol collapse panel kiri tidak menimpa judul */
}
.section-label {
    font-size: 11px;
    font-weight: 700;
    color: #1565c0;
    text-transform: uppercase;
    margin-bottom: 8px;
    border-bottom: 1px solid #f0f0f0;
    padding-bottom: 4px;
}
.fr {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 8px;
    min-height: 26px;
}
.lbl {
    width: 95px;
    flex-shrink: 0;
    font-weight: 600;
    color: #444;
    font-size: 11px;
}
.inp {
    height: 24px;
    border: 1px solid #ccc;
    border-radius: 3px;
    padding: 0 6px;
    font-size: 11px;
    background: white;
    outline: none;
    min-width: 0;
    box-sizing: border-box;
}
.inp:focus,
.idate:focus,
.ta:focus {
    border-color: #1976d2;
}
.ro {
    background: #f5f5f5 !important;
    color: #555 !important;
}
.fw {
    font-weight: 700;
}
.idate {
    height: 24px;
    border: 1px solid #ccc;
    border-radius: 3px;
    padding: 0 4px;
    font-size: 11px;
    background: white;
    outline: none;
    min-width: 0;
    box-sizing: border-box;
}
.ta {
    border: 1px solid #ccc;
    border-radius: 3px;
    padding: 4px 6px;
    font-size: 11px;
    outline: none;
    font-family: inherit;
    min-width: 0;
    box-sizing: border-box;
}
.tc {
    text-align: center;
}
.tr {
    text-align: right;
}
.p0 {
    padding: 0 !important;
}
.w-100 {
    width: 100%;
}

/* ── Input Group Lookup ── */
.igrp {
    display: flex;
    align-items: center;
    border: 1px solid #ccc;
    border-radius: 3px;
    background: white;
    height: 24px;
    overflow: hidden;
    min-width: 0;
    box-sizing: border-box;
}
.igrp .inp,
.igrp .ci {
    border: none;
    border-radius: 0;
    flex: 1;
}
.blkp {
    background: #f0f0f0;
    border: none;
    border-left: 1px solid #ccc;
    height: 100%;
    padding: 0 6px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #555;
}
.blkp:hover {
    background: #e0e0e0;
    color: #1565c0;
}
.bclr {
    background: #fff;
    border: none;
    height: 100%;
    padding: 0 4px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #999;
}
.bclr:hover {
    color: #d32f2f;
}

/* ── Grid Table Kanan ── */
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
}
.btn-add {
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
}
.btn-add:hover {
    background: rgba(255, 255, 255, 0.3);
}
.tbl-wrap {
    overflow: auto;
    border: 1px solid #ccc;
    border-top: none;
    background: white;
}
.gt {
    width: 100%;
    border-collapse: collapse;
    font-size: 11px;
}
.gt th {
    background: #f5f5f5;
    border-bottom: 2px solid #ddd;
    border-right: 1px solid #e0e0e0;
    padding: 5px 6px;
    text-align: left;
    font-weight: 700;
    white-space: nowrap;
}
.gt td {
    border-bottom: 1px solid #eee;
    border-right: 1px solid #f0f0f0;
    padding: 4px 6px;
    vertical-align: middle;
}
.ci {
    width: 100%;
    height: 24px;
    border: none;
    outline: none;
    padding: 0 4px;
    font-size: 11px;
    background: transparent;
}
.ci:focus {
    background: #e3f2fd;
}
.btn-del {
    background: transparent;
    border: none;
    color: #e53935;
    cursor: pointer;
    padding: 2px;
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0 auto;
}
.btn-del:hover {
    color: #b71c1c;
}

/* ── Summary Footer ── */
.summary-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px 12px;
    background: #fafafa;
    border: 1px solid #ccc;
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
    color: #1565c0;
    font-size: 12px;
}
</style>
