<script setup lang="ts">
import { ref, computed, nextTick } from "vue";
import { useRoute } from "vue-router";
import BaseForm from "@/components/BaseForm.vue";
import { useForm } from "@/composables/useForm";
import api from "@/services/api";
import GudangMmtSearchModal from "@/components/lookups/GudangMmtSearchModal.vue";
import SupplierSearchModal from "@/components/lookups/SupplierSearchModal.vue";
import BahanMmtSearchModal from "@/components/lookups/BahanMmtSearchModal.vue";
import PenerimaanBahanLookupModal from "@/modal/PenerimaanBahanLookupModal.vue";
import {
    IconArrowBack,
    IconPlus,
    IconTrash,
    IconSearch,
    IconBarcode,
    IconBoxSeam,
} from "@tabler/icons-vue";

const route = useRoute();

// --- Formatting Helpers ---
const formatThousand = (val: number | string | null | undefined): string => {
    if (val === null || val === undefined || val === "") return "";
    const numStr = String(val).replace(/\D/g, "");
    if (!numStr) return "";
    return numStr.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
};

const handleNumberInput = (
    e: Event,
    targetObj: Record<string, any>,
    key: string,
) => {
    const el = e.target as HTMLInputElement;
    const rawCursor = el.selectionStart || 0;
    const oldVal = el.value;
    const cleanDigits = oldVal.replace(/\D/g, "");
    const numVal = cleanDigits ? parseInt(cleanDigits, 10) : 0;
    targetObj[key] = numVal;

    const formatted = cleanDigits.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    el.value = formatted;

    const diff = formatted.length - oldVal.length;
    const newPos = Math.max(0, rawCursor + diff);
    el.setSelectionRange(newPos, newPos);
};

const fmt = (v: number | string | null | undefined): string =>
    new Intl.NumberFormat("id-ID").format(Math.round(Number(v) || 0));

// --- Interfaces ---
interface DetailItem {
    noUrut: number;
    barcode: string;
    sku: string;
    namaBarang: string;
    qty: number;
    satuan: string;
    panjang: number;
    lebar: number;
    harga: number;
    disc: number;
    expired?: string;
    keterangan: string;
}

interface SummaryResult {
    subtotal: number;
    discTotal: number;
    netSubtotal: number;
    ppn: number;
    grandTotal: number;
}

interface ReturBeliForm {
    nomor: string;
    tanggal: string;
    gudangKode: string;
    gudangNama: string;
    supplierKode: string;
    supplierNama: string;
    noPenerimaan: string;
    keterangan: string;
    isPajak: boolean;
    discPrHeader: number;
    discRpHeader: number;
    items: DetailItem[];
}

const initialData: ReturBeliForm = {
    nomor: "AUTO",
    tanggal: new Date().toISOString().substring(0, 10),
    gudangKode: "",
    gudangNama: "",
    supplierKode: "",
    supplierNama: "",
    noPenerimaan: "",
    keterangan: "",
    isPajak: true,
    discPrHeader: 0,
    discRpHeader: 0,
    items: [],
};

// --- Modal Visibility State ---
const isGudangModalVisible = ref(false);
const isSupplierModalVisible = ref(false);
const isPenerimaanModalVisible = ref(false);
const isBahanModalVisible = ref(false);
const activeRowIndex = ref<number>(-1);

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
} = useForm<ReturBeliForm>({
    menuId: "5506",
    initialData,
    fetchApi: async (): Promise<ReturBeliForm> => {
        const nomor = route.params.nomor;
        const res = await api.get(
            `/mmt/retur-beli/${encodeURIComponent(String(nomor))}`,
        );
        const data = res.data?.data || res.data;
        const header = data.header || data;
        const details = data.Details || data.details || [];

        return {
            nomor: header.Nomor || header.nomor || String(nomor),
            tanggal: header.Tanggal
                ? String(header.Tanggal).substring(0, 10)
                : initialData.tanggal,
            gudangKode: header.Gudang || header.gudangKode || "WH-16",
            gudangNama:
                header.GudangNama || header.gudangNama || "GUDANG UTAMA MMT",
            supplierKode: header.SupplierKode || header.supplierKode || "",
            supplierNama: header.SupplierNama || header.supplierNama || "",
            noPenerimaan:
                header.NoPenerimaan ||
                header.noPenerimaan ||
                header.InvoiceNomor ||
                "",
            keterangan:
                header.Keterangan || header.keterangan || header.Memo || "",
            isPajak:
                header.IsPajak !== undefined
                    ? Boolean(header.IsPajak)
                    : header.isPajak !== undefined
                      ? Boolean(header.isPajak)
                      : true,
            discPrHeader: Number(
                header.DiscPrHeader || header.discPrHeader || 0,
            ),
            discRpHeader: Number(
                header.DiscRpHeader || header.discRpHeader || 0,
            ),
            items: details.map(
                (d: any, idx: number): DetailItem => ({
                    noUrut: idx + 1,
                    barcode: d.barcode || d.Barcode || "",
                    sku: d.sku || d.Kode || d.rbd_sku || "",
                    namaBarang: d.namaBarang || d.Nama || d.brg_nama || "",
                    qty: Number(d.qty || d.rbd_qty || 0),
                    satuan: d.satuan || d.rbd_satuan || "ROLL",
                    panjang: Number(d.panjang || d.rbd_panjang || 0),
                    lebar: Number(d.lebar || d.rbd_lebar || 0),
                    harga: Number(d.harga || d.rbd_harga || 0),
                    disc: Number(d.disc || d.diskon || d.rbd_diskon || 0),
                    expired: d.expired
                        ? String(d.expired).substring(0, 10)
                        : "",
                    keterangan: d.keterangan || d.rbd_keterangan || "",
                }),
            ),
        };
    },
    submitApi: async (dataToSave: ReturBeliForm): Promise<any> => {
        const validItems = dataToSave.items.filter(
            (it: DetailItem) =>
                (it.sku.trim() !== "" || it.barcode.trim() !== "") &&
                Number(it.qty) > 0,
        );

        const sub = validItems.reduce((sum: number, it: DetailItem) => {
            const netto =
                Number(it.qty || 0) *
                Number(it.harga || 0) *
                (1 - Number(it.disc || 0) / 100);
            return sum + netto;
        }, 0);
        const discVal =
            (sub * Number(dataToSave.discPrHeader || 0)) / 100 +
            Number(dataToSave.discRpHeader || 0);
        const net = Math.max(0, sub - discVal);
        const tax = dataToSave.isPajak ? net * 0.11 : 0;
        const total = net + tax;

        const payload = {
            Nomor: dataToSave.nomor,
            Tanggal: dataToSave.tanggal,
            GudangKode: dataToSave.gudangKode,
            Gudang: dataToSave.gudangKode,
            SupplierKode: dataToSave.supplierKode,
            NoPenerimaan: dataToSave.noPenerimaan,
            Keterangan: dataToSave.keterangan,
            IsPajak: dataToSave.isPajak ? 1 : 0,
            DiscPrHeader: Number(dataToSave.discPrHeader || 0),
            DiscRpHeader: Number(dataToSave.discRpHeader || 0),
            TotalAmount: total,
            TaxAmount: tax,
            Details: validItems.map((it: DetailItem) => ({
                sku: it.sku,
                barcode: it.barcode,
                namaBarang: it.namaBarang,
                qty: Number(it.qty),
                satuan: it.satuan || "ROLL",
                panjang: Number(it.panjang || 0),
                lebar: Number(it.lebar || 0),
                harga: Number(it.harga || 0),
                diskon: Number(it.disc || 0),
                expired: it.expired || null,
                keterangan: it.keterangan || "",
            })),
        };

        if (isEditMode.value) {
            return await api.put(
                `/mmt/retur-beli/${encodeURIComponent(dataToSave.nomor)}`,
                payload,
            );
        }
        return await api.post("/mmt/retur-beli", payload);
    },
    onSuccessRoute: "/mmt/finance/retur-beli",
});

// --- Calculations ---
const calculatedSummary = computed<SummaryResult>(() => {
    const subtotal = formData.value.items.reduce(
        (sum: number, it: DetailItem) => {
            const netto =
                Number(it.qty || 0) *
                Number(it.harga || 0) *
                (1 - Number(it.disc || 0) / 100);
            return sum + netto;
        },
        0,
    );

    const discFromPercent =
        (subtotal * Number(formData.value.discPrHeader || 0)) / 100;
    const discTotal =
        discFromPercent + Number(formData.value.discRpHeader || 0);
    const netSubtotal = Math.max(0, subtotal - discTotal);
    const ppn = formData.value.isPajak ? netSubtotal * 0.11 : 0;
    const grandTotal = netSubtotal + ppn;

    return { subtotal, discTotal, netSubtotal, ppn, grandTotal };
});

const totalQty = computed<number>(() => {
    return formData.value.items.reduce(
        (sum: number, it: DetailItem) => sum + Number(it.qty || 0),
        0,
    );
});

// --- Item Grid Operations ---
const createEmptyItem = (): DetailItem => ({
    noUrut: formData.value.items.length + 1,
    barcode: "",
    sku: "",
    namaBarang: "",
    qty: 1,
    satuan: "",
    panjang: 0,
    lebar: 0,
    harga: 0,
    disc: 0,
    keterangan: "",
});

const addItem = () => {
    formData.value.items.push(createEmptyItem());
};

const removeItem = (idx: number) => {
    formData.value.items.splice(idx, 1);
    formData.value.items.forEach(
        (it: DetailItem, i: number) => (it.noUrut = i + 1),
    );
};

// --- Barcode / SKU Scan Handler ---
const handleBarcodeScan = async (idx: number) => {
    const target = formData.value.items[idx];
    const query = (target.barcode || target.sku || "").trim();
    if (!query) return;

    try {
        const res = await api.get(
            `/mmt/retur-beli/scan/${encodeURIComponent(query)}`,
        );
        const item = res.data?.data || res.data;
        if (item) {
            target.barcode = item.barcode || target.barcode;
            target.sku = item.sku || target.sku;
            target.namaBarang = item.namaBarang || target.namaBarang;
            target.satuan = item.satuan || target.satuan;
            target.panjang = Number(item.panjang || 0);
            target.lebar = Number(item.lebar || 0);
            target.harga = Number(item.harga || 0);
            if (!target.qty || target.qty <= 0) target.qty = 1;

            // Auto tambah baris baru jika ini baris terakhir
            if (idx === formData.value.items.length - 1) {
                formData.value.items.push(createEmptyItem());
            }
            await nextTick();
            const nextInput = document.getElementById(
                `barcode-input-${idx + 1}`,
            );
            if (nextInput) (nextInput as HTMLInputElement).focus();
        }
    } catch (err) {
        console.warn("Scan barcode retur tidak ditemukan:", err);
    }
};

// --- Modal Handlers ---
const handleGudangSelect = (gudang: any) => {
    formData.value.gudangKode = gudang.Kode || gudang.kode || "";
    formData.value.gudangNama = gudang.Nama || gudang.nama || "";
};

const handleSupplierSelect = (supplier: any) => {
    formData.value.supplierKode =
        supplier.Kode || supplier.sup_kode || supplier.kode || "";
    formData.value.supplierNama =
        supplier.Nama || supplier.sup_nama || supplier.nama || "";
};

const handlePenerimaanSelect = async (rec: any) => {
    formData.value.noPenerimaan = rec.Nomor || rec.rec_nomor || "";
    if (rec.Kode_Supplier || rec.sup_kode) {
        formData.value.supplierKode = rec.Kode_Supplier || rec.sup_kode;
    }
    if (rec.Supplier || rec.sup_nama) {
        formData.value.supplierNama = rec.Supplier || rec.sup_nama;
    }
    isPenerimaanModalVisible.value = false;

    // Auto-load details dari BPB Penerimaan tersebut
    if (formData.value.noPenerimaan) {
        try {
            const res = await api.get(
                `/mmt/penerimaan-bahan/detail-invoice/${encodeURIComponent(formData.value.noPenerimaan)}`,
            );
            const detData = res.data?.data || res.data;
            const dtl = detData.details || [];
            if (dtl && dtl.length > 0) {
                formData.value.items = dtl.map((d: any, idx: number) => ({
                    noUrut: idx + 1,
                    barcode: "",
                    sku: d.Kode || d.sku || "",
                    namaBarang: d.Nama_Barang || d.namaBarang || "",
                    satuan: d.Satuan || d.satuan,
                    panjang: Number(d.Panjang || d.panjang || 0),
                    lebar: Number(d.Lebar || d.lebar || 0),
                    qty: Number(d.Qty || d.qty || 1),
                    harga: Number(d.Harga_Beli || d.harga || 0),
                    disc: Number(d.Diskon_Item || d.disc || 0),
                    keterangan: "",
                    expired: "",
                }));
            }
        } catch (e) {
            console.error("Gagal load detail penerimaan:", e);
        }
    }
};

const openBahanLookup = (idx: number) => {
    activeRowIndex.value = idx;
    isBahanModalVisible.value = true;
};

const handleBahanSelect = (item: any) => {
    const sku = item.brg_kode || item.Kode || item.sku || "";
    const nama = item.brg_nama || item.Nama || item.namaBarang || "";
    const sat = item.brg_satuan || item.Satuan;
    const p = Number(item.brg_panjang || item.panjang || 0);
    const l = Number(item.brg_lebar || item.lebar || 0);
    const hrg = Number(item.brg_hrgbeli || item.harga || 0);

    if (
        activeRowIndex.value >= 0 &&
        activeRowIndex.value < formData.value.items.length
    ) {
        const row = formData.value.items[activeRowIndex.value];
        row.sku = sku;
        row.namaBarang = nama;
        row.satuan = sat;
        row.panjang = p;
        row.lebar = l;
        row.harga = hrg;
    } else {
        formData.value.items.push({
            noUrut: formData.value.items.length + 1,
            barcode: "",
            sku,
            namaBarang: nama,
            qty: 1,
            satuan: sat,
            panjang: p,
            lebar: l,
            harga: hrg,
            disc: 0,
            keterangan: "",
        });
    }
    isBahanModalVisible.value = false;
};

// --- Validation Before Save ---
const validateBeforeSave = () => {
    if (!formData.value.supplierKode && !formData.value.supplierNama) {
        alert("Supplier retur wajib dipilih!");
        return;
    }
    if (!formData.value.gudangKode) {
        alert("Gudang retur wajib dipilih!");
        return;
    }
    const hasValidItem = formData.value.items.some(
        (it: DetailItem) =>
            (it.sku.trim() !== "" || it.barcode.trim() !== "") &&
            Number(it.qty) > 0,
    );
    if (!hasValidItem) {
        alert("Minimal harus ada 1 barang retur yang valid (SKU dan Qty > 0)!");
        return;
    }
    showSaveDialog.value = true;
};
</script>

<template>
    <BaseForm
        :title="
            isEditMode
                ? `Ubah Retur Beli MMT (${formData.nomor})`
                : 'Tambah Retur Beli MMT Baru'
        "
        menu-id="5506"
        :icon="IconArrowBack"
        :is-loading="isLoading"
        :is-saving="isSaving"
        item-name="Retur Beli MMT"
        desktop-mode
        v-model:show-save-dialog="showSaveDialog"
        v-model:show-cancel-dialog="showCancelDialog"
        v-model:show-close-dialog="showCloseDialog"
        @validate-save="validateBeforeSave"
        @confirm-save="executeSave"
        @confirm-cancel="executeCancel"
        @confirm-close="executeClose"
    >
        <!-- ── KOLOM KIRI (HEADER, SUPPLIER, GUDANG & RINGKASAN PAJAK MMT) ── -->
        <template #left-column>
            <!-- Section 1: Header Form -->
            <div class="desktop-form-section header-section">
                <div class="section-label">Data Header Retur</div>

                <div class="fr">
                    <label class="lbl">Nomor Retur</label>
                    <input
                        :value="formData.nomor"
                        readonly
                        class="inp ro fw text-primary"
                        style="width: 160px"
                        placeholder="← AUTO"
                    />
                </div>

                <div class="fr">
                    <label class="lbl">Tanggal Retur</label>
                    <input
                        type="date"
                        v-model="formData.tanggal"
                        class="idate"
                        style="width: 160px"
                    />
                </div>

                <div class="fr">
                    <label class="lbl">No. Penerimaan</label>
                    <div class="igrp flex-1">
                        <input
                            v-model="formData.noPenerimaan"
                            class="inp fw text-primary cursor-pointer"
                            placeholder="Cari..."
                            readonly
                            @click="isPenerimaanModalVisible = true"
                        />
                        <button
                            type="button"
                            class="blkp"
                            title="Lookup Penerimaan Bahan"
                            @click="isPenerimaanModalVisible = true"
                        >
                            <IconSearch :size="13" />
                        </button>
                    </div>
                </div>

                <div class="fr">
                    <label class="lbl">Gudang</label>
                    <div class="igrp flex-1">
                        <input
                            :value="
                                formData.gudangKode
                                    ? `${formData.gudangKode} - ${formData.gudangNama}`
                                    : ''
                            "
                            class="inp cursor-pointer ro"
                            placeholder="Cari..."
                            readonly
                            @click="isGudangModalVisible = true"
                        />
                        <button
                            type="button"
                            class="blkp"
                            title="Lookup Gudang"
                            @click="isGudangModalVisible = true"
                        >
                            <IconSearch :size="13" />
                        </button>
                    </div>
                </div>

                <div class="fr">
                    <label class="lbl">Supplier</label>
                    <div class="igrp flex-1">
                        <input
                            :value="
                                formData.supplierKode
                                    ? `${formData.supplierKode} - ${formData.supplierNama}`
                                    : formData.supplierNama || ''
                            "
                            class="inp cursor-pointer ro"
                            placeholder="Cari..."
                            readonly
                            @click="isSupplierModalVisible = true"
                        />
                        <button
                            type="button"
                            class="blkp"
                            title="Lookup Supplier"
                            @click="isSupplierModalVisible = true"
                        >
                            <IconSearch :size="13" />
                        </button>
                    </div>
                </div>

                <div class="fr align-start">
                    <label class="lbl pt-1">Keterangan</label>
                    <textarea
                        v-model="formData.keterangan"
                        class="ta flex-1"
                        rows="2"
                        placeholder="Keterangan..."
                    ></textarea>
                </div>
            </div>

            <!-- Section 2: Ringkasan Nilai, Diskon Faktur & PPN (Sesuai Sistem MMT) -->
            <div class="desktop-form-section">
                <div class="section-label">Perhitungan & Pajak</div>

                <div class="fr justify-space-between text-muted mb-1">
                    <span class="lbl-calc">Subtotal Nilai:</span>
                    <span class="val-calc fw"
                        >Rp {{ fmt(calculatedSummary.subtotal) }}</span
                    >
                </div>

                <div class="fr mb-1">
                    <label class="lbl">Diskon Faktur (%)</label>
                    <div class="d-flex align-center gap-1" style="width: 80px">
                        <input
                            type="number"
                            v-model.number="formData.discPrHeader"
                            class="inp tr flex-1"
                            placeholder="0"
                            min="0"
                            max="100"
                        />
                        <span class="text-caption">%</span>
                    </div>
                </div>

                <div class="fr mb-1">
                    <label class="lbl">Diskon Faktur (Rp)</label>
                    <input
                        type="text"
                        :value="formatThousand(formData.discRpHeader)"
                        @input="
                            (e) =>
                                handleNumberInput(e, formData, 'discRpHeader')
                        "
                        class="inp tr flex-1"
                        placeholder="0"
                    />
                </div>

                <div class="fr justify-space-between mb-1">
                    <label class="d-flex align-center gap-1 cursor-pointer">
                        <input
                            type="checkbox"
                            v-model="formData.isPajak"
                            style="cursor: pointer"
                        />
                        <span class="lbl-calc" style="font-weight: 600"
                            >PPN (11%)</span
                        >
                    </label>
                    <span class="val-calc"
                        >Rp {{ fmt(calculatedSummary.ppn) }}</span
                    >
                </div>

                <div class="divider my-2"></div>

                <div class="grand-total-row">
                    <div class="d-flex justify-space-between align-center">
                        <span class="grand-label">TOTAL RETUR:</span>
                        <span class="grand-value"
                            >Rp {{ fmt(calculatedSummary.grandTotal) }}</span
                        >
                    </div>
                </div>

                <div class="fr justify-space-between text-muted mt-2">
                    <span class="lbl-calc">Total Qty Retur:</span>
                    <span class="val-calc fw" style="color: #2e7d32"
                        >{{ totalQty }} Satuan</span
                    >
                </div>
            </div>
        </template>

        <!-- ── KOLOM KANAN (GRID ITEM RETUR SESUAI SISTEM MMT) ── -->
        <template #right-column>
            <div class="desktop-form-section d-flex flex-column h-100 pa-0">
                <!-- Toolbar Atas Grid -->
                <div class="tbl-header">
                    <div class="d-flex align-center gap-2">
                        <IconBoxSeam :size="16" />
                        <span class="tbl-title"
                            >Rincian Barang yang Diretur</span
                        >
                    </div>
                    <div class="d-flex align-center gap-2">
                        <button type="button" class="btn-add" @click="addItem">
                            <IconPlus :size="13" class="mr-1" /> Tambah Baris
                        </button>
                    </div>
                </div>

                <!-- Tabel Grid MMT Kompak -->
                <div
                    class="tbl-wrap flex-grow-1"
                    style="min-height: 300px; max-height: calc(100vh - 330px)"
                >
                    <table class="gt">
                        <thead>
                            <tr>
                                <th style="width: 32px" class="tc">No</th>
                                <th style="width: 130px">
                                    <div class="d-flex align-center gap-1">
                                        <IconBarcode :size="13" /> Barcode / Rol
                                    </div>
                                </th>
                                <th style="width: 110px">Kode SKU</th>
                                <th style="min-width: 170px">
                                    Nama Bahan / Barang
                                </th>
                                <th style="width: 55px" class="tc">Satuan</th>
                                <th style="width: 55px" class="tr">P (m)</th>
                                <th style="width: 55px" class="tr">L (m)</th>
                                <th
                                    style="width: 65px"
                                    class="tr"
                                    title="Qty Retur"
                                >
                                    Qty
                                </th>
                                <th style="width: 105px" class="tr">
                                    Harga Beli
                                </th>
                                <th style="width: 55px" class="tr">Disc %</th>
                                <th style="width: 110px" class="tr">
                                    Subtotal
                                </th>
                                <th style="min-width: 130px">Keterangan</th>
                                <th style="width: 32px" class="tc"></th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-for="(it, idx) in formData.items" :key="idx">
                                <td class="tc ro">{{ it.noUrut }}</td>
                                <!-- Barcode -->
                                <td class="p0">
                                    <input
                                        :id="`barcode-input-${idx}`"
                                        type="text"
                                        v-model="it.barcode"
                                        class="ci fw text-primary font-monospace"
                                        placeholder="Scan Barcode..."
                                        @keyup.enter="handleBarcodeScan(idx)"
                                    />
                                </td>
                                <!-- Kode SKU & Lookup Icon -->
                                <td class="p0">
                                    <div class="cell-igrp">
                                        <input
                                            type="text"
                                            v-model="it.sku"
                                            class="ci flex-1"
                                            placeholder="SKU..."
                                            @keyup.enter="
                                                handleBarcodeScan(idx)
                                            "
                                        />
                                        <button
                                            type="button"
                                            class="cell-btn-lookup"
                                            title="Cari Bahan MMT"
                                            @click="openBahanLookup(idx)"
                                        >
                                            <IconSearch :size="12" />
                                        </button>
                                    </div>
                                </td>
                                <!-- Nama Barang -->
                                <td class="p0">
                                    <input
                                        type="text"
                                        v-model="it.namaBarang"
                                        class="ci"
                                        placeholder="Nama Bahan..."
                                    />
                                </td>
                                <!-- Satuan -->
                                <td class="p0">
                                    <input
                                        type="text"
                                        v-model="it.satuan"
                                        class="ci tc"
                                        placeholder="..."
                                    />
                                </td>
                                <!-- Panjang -->
                                <td class="p0">
                                    <input
                                        type="number"
                                        v-model.number="it.panjang"
                                        class="ci tr"
                                        step="0.01"
                                        placeholder="0"
                                    />
                                </td>
                                <!-- Lebar -->
                                <td class="p0">
                                    <input
                                        type="number"
                                        v-model.number="it.lebar"
                                        class="ci tr"
                                        step="0.01"
                                        placeholder="0"
                                    />
                                </td>
                                <!-- Qty (Highlight Editable) -->
                                <td class="p0 bg-qty-edit">
                                    <input
                                        type="number"
                                        v-model.number="it.qty"
                                        class="ci tr fw"
                                        min="0"
                                        step="0.01"
                                    />
                                </td>
                                <!-- Harga Beli (Format Ribuan) -->
                                <td class="p0">
                                    <input
                                        type="text"
                                        :value="formatThousand(it.harga)"
                                        @input="
                                            (e) =>
                                                handleNumberInput(
                                                    e,
                                                    it,
                                                    'harga',
                                                )
                                        "
                                        class="ci tr"
                                        placeholder="0"
                                    />
                                </td>
                                <!-- Disc % -->
                                <td class="p0">
                                    <input
                                        type="number"
                                        v-model.number="it.disc"
                                        class="ci tr"
                                        min="0"
                                        max="100"
                                        placeholder="0"
                                    />
                                </td>
                                <!-- Subtotal Readonly -->
                                <td class="tr fw ro">
                                    {{
                                        fmt(
                                            Number(it.qty || 0) *
                                                Number(it.harga || 0) *
                                                (1 -
                                                    Number(it.disc || 0) / 100),
                                        )
                                    }}
                                </td>
                                <!-- Keterangan -->
                                <td class="p0">
                                    <input
                                        type="text"
                                        v-model="it.keterangan"
                                        class="ci"
                                        placeholder="Catatan..."
                                    />
                                </td>
                                <!-- Tombol Hapus -->
                                <td class="tc p0">
                                    <button
                                        type="button"
                                        class="btn-del"
                                        title="Hapus Baris"
                                        @click="removeItem(idx)"
                                    >
                                        <IconTrash :size="13" />
                                    </button>
                                </td>
                            </tr>
                            <tr v-if="formData.items.length === 0">
                                <td
                                    colspan="13"
                                    class="tc py-4 text-grey text-caption"
                                >
                                    Belum ada item retur. Pilih 'No. Penerimaan'
                                    di kolom kiri, atau klik '+ Tambah Baris'.
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <!-- Footer Ringkasan Grid -->
                <div class="summary-footer">
                    <div class="sum-item">
                        <span>Total Item:</span>
                        <b>{{ formData.items.length }} Baris</b>
                    </div>
                    <div class="sum-item">
                        <span>Total Qty Retur:</span>
                        <b style="color: #2e7d32">{{ totalQty }}</b>
                    </div>
                    <div class="sum-item grand">
                        <span>Subtotal Nilai Retur:</span>
                        <b>Rp {{ fmt(calculatedSummary.subtotal) }}</b>
                    </div>
                </div>
            </div>
        </template>
    </BaseForm>

    <!-- Modals Lookup -->
    <GudangMmtSearchModal
        v-model="isGudangModalVisible"
        @selected="handleGudangSelect"
    />

    <SupplierSearchModal
        v-model="isSupplierModalVisible"
        @selected="handleSupplierSelect"
    />

    <PenerimaanBahanLookupModal
        :isVisible="isPenerimaanModalVisible"
        @close="isPenerimaanModalVisible = false"
        @select="handlePenerimaanSelect"
    />

    <BahanMmtSearchModal
        v-model="isBahanModalVisible"
        @selected="handleBahanSelect"
    />
</template>

<style scoped>
:deep(.form-grid-container.two-column) {
    --left-col-width: 370px;
}
@media (max-width: 1400px) {
    :deep(.form-grid-container.two-column) {
        --left-col-width: 340px;
    }
}

*,
*::before,
*::after {
    box-sizing: border-box;
}

.desktop-form-section {
    background: white;
    border: 1px solid #e0e0e0;
    border-radius: 6px;
    padding: 10px 12px;
    margin-bottom: 8px;
    font-family: "Segoe UI", system-ui, sans-serif;
    font-size: 11px;
    box-sizing: border-box;
}
.header-section {
    padding-right: 32px; /* Ruang aman untuk tombol collapse panel kiri */
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
    gap: 6px;
    margin-bottom: 6px;
    min-height: 24px;
}
.align-start {
    align-items: flex-start;
}
.pt-1 {
    padding-top: 4px;
}
.lbl {
    width: 100px;
    flex-shrink: 0;
    font-weight: 600;
    color: #444;
    font-size: 11px;
}
.lbl-calc {
    font-size: 11px;
    color: #555;
}
.val-calc {
    font-size: 11px;
    color: #333;
}
.flex-1 {
    flex: 1 1 0;
    min-width: 0;
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
    box-shadow: 0 0 0 1px #1976d233;
}
.ro {
    background: #f8f9fa !important;
    color: #495057 !important;
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
    box-sizing: border-box;
    resize: vertical;
}

/* ── Input Group Lookup Standar Manksi ── */
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
.igrp:focus-within {
    border-color: #1565c0;
    box-shadow: 0 0 0 1px #1565c033;
}
.igrp .inp {
    border: none;
    border-radius: 0;
    flex: 1 1 0;
    min-width: 0;
    height: 100%;
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
    transition: background 0.15s;
    flex-shrink: 0;
}
.blkp:hover {
    background: #e3f2fd;
    color: #1565c0;
}

.tc {
    text-align: center;
}
.tr {
    text-align: right;
}
.fw {
    font-weight: 700;
}
.p0 {
    padding: 0 !important;
}
.cursor-pointer {
    cursor: pointer;
}
.font-monospace {
    font-family: Consolas, "Liberation Mono", Menlo, Courier, monospace;
}
.divider {
    border-top: 1px dashed #ccc;
}
.grand-total-row {
    background: #e8f5e9;
    padding: 6px 10px;
    border-radius: 4px;
    border: 1px solid #c8e6c9;
}
.grand-label {
    font-size: 11px;
    font-weight: 700;
    color: #1b5e20;
}
.grand-value {
    font-size: 13px;
    font-weight: 800;
    color: #1b5e20;
}

/* ── Grid Table ── */
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
.btn-action-hdr {
    background: rgba(255, 255, 255, 0.15);
    color: white;
    border: 1px solid rgba(255, 255, 255, 0.3);
    padding: 3px 8px;
    font-size: 11px;
    font-weight: 600;
    cursor: pointer;
    border-radius: 3px;
    display: flex;
    align-items: center;
}
.btn-action-hdr:hover {
    background: rgba(255, 255, 255, 0.25);
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
    min-width: 1050px;
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
    position: sticky;
    top: 0;
    z-index: 2;
    white-space: nowrap;
}
.gt td {
    border-bottom: 1px solid #eee;
    border-right: 1px solid #f0f0f0;
    padding: 2px 4px;
    height: 26px;
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
    box-sizing: border-box;
}
.ci:focus {
    background: #e3f2fd;
}
.cell-igrp {
    display: flex;
    align-items: center;
    height: 100%;
    width: 100%;
    box-sizing: border-box;
}
.cell-btn-lookup {
    background: transparent;
    border: none;
    cursor: pointer;
    color: #1565c0;
    padding: 0 4px;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
}
.cell-btn-lookup:hover {
    background: #e3f2fd;
    border-radius: 2px;
}
.bg-qty-edit {
    background-color: #fffde7 !important;
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

.summary-footer {
    display: flex;
    justify-content: flex-end;
    gap: 16px;
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
    color: #444;
}
.sum-item.grand {
    color: #1565c0;
    font-size: 12px;
}
</style>
