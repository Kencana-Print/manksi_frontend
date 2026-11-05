<script setup lang="ts">
import { ref, computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useToast } from "vue-toastification";
import BaseForm from "@/components/BaseForm.vue";
import { useForm } from "@/composables/useForm";
import {
    IconArrowBackUp,
    IconSearch,
    IconPlus,
    IconTrash,
    IconX,
    IconPrinter,
    IconBarcode,
} from "@tabler/icons-vue";
import api from "@/services/api";

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

interface ReturForm {
    nomor: string;
    tanggal: string;
    gudangAsalKode: string;
    gudangAsalNama: string;
    gudangTujuanKode: string;
    gudangTujuanNama: string;
    nomorSpk: string;
    tipe: number;
    keterangan: string;
    items: DetailItem[];
}

const initialData: ReturForm = {
    nomor: "AUTO",
    tanggal: new Date().toISOString().substring(0, 10),
    gudangAsalKode: "",
    gudangAsalNama: "",
    gudangTujuanKode: "",
    gudangTujuanNama: "",
    nomorSpk: "",
    tipe: 1,
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

// Modal State
const showGudangAsalModal = ref(false);
const showGudangTujuanModal = ref(false);
const showHeaderSpkModal = ref(false);
const showRowSpkModal = ref(false);
const showBahanModal = ref(false);
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
} = useForm<ReturForm>({
    menuId: "5539",
    initialData,
    fetchApi: async () => {
        const nomor = route.params.nomor || route.query.nomor;
        if (!nomor) return { ...initialData };

        const res = await api.get(
            `/mmt/bahan-baku-produksi/retur-produksi/${encodeURIComponent(String(nomor))}`,
        );
        const data = res.data?.data;
        if (!data) return { ...initialData };

        const header = data.header || {};
        const details = data.details || [];

        const gAsalKode = header.GudangAsal || "GPM";
        const gAsalNama =
            gAsalKode === "GPM" ? "Gudang Produksi MMT" : gAsalKode;
        const gTujuanKode = header.GudangTujuan || "WH-16";
        const gTujuanNama =
            header.NamaGudangTujuan ||
            (gTujuanKode === "WH-16" ? "GUDANG UTAMA MMT" : gTujuanKode);

        return {
            nomor: header.Nomor || String(nomor),
            tanggal: toDateInputValue(header.Tanggal) || initialData.tanggal,
            gudangAsalKode: gAsalKode,
            gudangAsalNama: gAsalNama,
            gudangTujuanKode: gTujuanKode,
            gudangTujuanNama: gTujuanNama,
            nomorSpk: header.NomorSPK || "",
            tipe: Number(header.TypeCode ?? 1),
            keterangan: header.Keterangan || "",
            items: details.map((d: any, idx: number) => ({
                no: idx + 1,
                barcode: d.barcode || "",
                sku: d.sku || d.Kode || "",
                nama: d.Nama_Bahan || d.nama || "",
                satuan: d.satuan || "ROLL",
                panjang: d.panjang ?? "",
                lebar: d.lebar ?? "",
                qty: Number(d.qty ?? d.Jumlah ?? 1),
                spk: d.spk && d.spk !== "0" ? d.spk : "",
                keterangan: d.keterangan || "",
            })),
        };
    },
    submitApi: async (dataToSave) => {
        if (!dataToSave.gudangAsalKode) {
            throw new Error("Gudang asal (produksi) wajib dipilih.");
        }
        if (!dataToSave.gudangTujuanKode) {
            throw new Error("Gudang tujuan (bahan) wajib dipilih.");
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
            Nomor: dataToSave.nomor,
            Tanggal: dataToSave.tanggal,
            GudangAsal: dataToSave.gudangAsalKode,
            GudangTujuan: dataToSave.gudangTujuanKode,
            NomorSPK: dataToSave.nomorSpk || null,
            Type: Number(dataToSave.tipe),
            Keterangan: dataToSave.keterangan || null,
            Details: validItems.map((it, idx) => ({
                nourut: idx + 1,
                barcode: it.barcode?.trim() || null,
                sku: it.sku,
                qty: Number(it.qty) || 1,
                satuan: it.satuan || "ROLL",
                spk: it.spk || dataToSave.nomorSpk || "0",
                panjang: Number(it.panjang) || 0,
                lebar: Number(it.lebar) || 0,
                keterangan: it.keterangan || null,
            })),
        };

        if (isEditMode.value) {
            await api.put(
                `/mmt/bahan-baku-produksi/retur-produksi/${encodeURIComponent(dataToSave.nomor)}`,
                payload,
            );
        } else {
            await api.post("/mmt/bahan-baku-produksi/retur-produksi", payload);
        }
    },
});

// Barcode Scan Handler
const onBarcodeScan = async (idx: number) => {
    const item = formData.value.items[idx];
    const bc = item.barcode?.trim();
    if (!bc) return;

    if (!formData.value.gudangAsalKode) {
        toast.error("Silakan tentukan Gudang Asal terlebih dahulu.");
        return;
    }

    // Validasi duplikasi barcode pada baris lain di form
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
            "/mmt/bahan-baku-produksi/retur-produksi/scan",
            {
                params: {
                    barcode: bc,
                    gudangAsal: formData.value.gudangAsalKode,
                },
            },
        );
        const b = res.data;
        if (b) {
            item.sku = b.Kode || b.sku || "";
            item.nama = b.Nama_Bahan || b.Nama || "";
            item.panjang = b.Panjang ?? "";
            item.lebar = b.Lebar ?? "";
            item.satuan = b.Satuan || "ROLL";
            item.qty = 1;
            if (b.Nomor_SPK && b.Nomor_SPK !== "0" && !item.spk) {
                item.spk = b.Nomor_SPK;
            }

            toast.success(`Barcode ${bc} teridentifikasi: ${item.nama}`);

            // Jika scan pada baris terakhir, otomatis tambahkan baris baru
            if (idx === formData.value.items.length - 1) {
                addItem();
            }
        }
    } catch (err: any) {
        toast.warning(
            `Barcode ${bc} tidak ditemukan atau stok kosong di ${formData.value.gudangAsalKode}.`,
        );
    }
};

// Modal Lookup Handlers
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

const onSelectGudangAsal = (g: { Kode: string; Nama: string }) => {
    formData.value.gudangAsalKode = g.Kode;
    formData.value.gudangAsalNama = g.Nama;
};

const onSelectGudangTujuan = (g: { Kode: string; Nama: string }) => {
    formData.value.gudangTujuanKode = g.Kode;
    formData.value.gudangTujuanNama = g.Nama;
};

const onSelectHeaderSpk = (spk: any) => {
    formData.value.nomorSpk = spk.Nomor || spk.spk_nomor || "";
};

const openRowSpkLookup = (idx: number) => {
    activeRowIndex.value = idx;
    showRowSpkModal.value = true;
};

const onSelectRowSpk = (spk: any) => {
    if (
        activeRowIndex.value !== null &&
        formData.value.items[activeRowIndex.value]
    ) {
        const row = formData.value.items[activeRowIndex.value];
        row.spk = spk.Nomor || spk.spk_nomor || "";
    }
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
        spk: formData.value.nomorSpk || "",
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
            "Simpan formulir retur terlebih dahulu sebelum mencetak.",
        );
        return;
    }
    const url = router.resolve({
        path: `/mmt/bahan-baku-produksi/retur-permintaan-produksi/print/${encodeURIComponent(
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
                ? `Ubah Retur Produksi (${formData.nomor})`
                : 'Tambah Retur Produksi Baru'
        "
        menu-id="5539"
        :icon="IconArrowBackUp"
        :is-loading="isLoading"
        :is-saving="isSaving"
        item-name="Retur Produksi"
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
     ── KOLOM KIRI (HEADER, SPK & RINGKASAN FORM) ──
     ══════════════════════════════════════════════════════════ -->
        <template #left-column>
            <!-- Section 1: Data Header Retur -->
            <div class="desktop-form-section header-section">
                <div class="section-label">Data Header Retur</div>

                <!-- Nomor Retur -->
                <div class="fr">
                    <label class="lbl">Nomor Retur</label>
                    <input
                        :value="formData.nomor"
                        readonly
                        class="inp ro fw flex-grow-1"
                        placeholder="AUTO"
                    />
                </div>

                <!-- Tanggal Retur -->
                <div class="fr">
                    <label class="lbl">Tanggal</label>
                    <input
                        type="date"
                        v-model="formData.tanggal"
                        class="idate flex-grow-1"
                        required
                    />
                </div>

                <!-- Gudang Asal / Produksi (Lookup GudangMmtSearchModal) -->
                <div class="fr">
                    <label class="lbl">Gudang Asal</label>
                    <div class="igrp flex-grow-1">
                        <input
                            type="text"
                            :value="
                                formData.gudangAsalKode
                                    ? `${formData.gudangAsalKode} - ${formData.gudangAsalNama}`
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
                            title="Pilih Gudang Asal"
                        >
                            <IconSearch :size="13" />
                        </button>
                    </div>
                </div>

                <!-- Gudang Tujuan / Bahan (Lookup GudangMmtSearchModal) -->
                <div class="fr">
                    <label class="lbl">Gudang Tujuan</label>
                    <div class="igrp flex-grow-1">
                        <input
                            type="text"
                            :value="
                                formData.gudangTujuanKode
                                    ? `${formData.gudangTujuanKode} - ${formData.gudangTujuanNama}`
                                    : ''
                            "
                            class="inp ro fw text-primary"
                            readonly
                            placeholder="Cari..."
                            @click="showGudangTujuanModal = true"
                        />
                        <button
                            type="button"
                            class="blkp"
                            @click="showGudangTujuanModal = true"
                            title="Pilih Gudang Tujuan"
                        >
                            <IconSearch :size="13" />
                        </button>
                    </div>
                </div>
            </div>

            <!-- Section 2: Informasi SPK & Catatan -->
            <div class="desktop-form-section note-section">
                <div class="section-label">Informasi SPK & Catatan</div>

                <!-- Nomor SPK Referensi -->
                <div class="fr">
                    <label class="lbl">Nomor SPK</label>
                    <div class="igrp flex-grow-1">
                        <input
                            type="text"
                            v-model="formData.nomorSpk"
                            class="inp text-primary"
                            placeholder="Cari SPK (Opsional)..."
                            @click="showHeaderSpkModal = true"
                        />
                        <button
                            v-if="formData.nomorSpk"
                            type="button"
                            class="bclr"
                            @click.stop="formData.nomorSpk = ''"
                            title="Hapus referensi SPK"
                        >
                            <IconX :size="13" />
                        </button>
                        <button
                            type="button"
                            class="blkp"
                            @click="showHeaderSpkModal = true"
                            title="Cari SPK"
                        >
                            <IconSearch :size="13" />
                        </button>
                    </div>
                </div>

                <!-- Tipe Retur -->
                <div class="fr">
                    <label class="lbl">Tipe Retur</label>
                    <select
                        v-model.number="formData.tipe"
                        class="inp flex-grow-1"
                    >
                        <option :value="1">1 - Retur Bahan Produksi</option>
                        <option :value="2">2 - Retur Lainnya</option>
                    </select>
                </div>

                <!-- Keterangan -->
                <div class="fr align-start">
                    <label class="lbl" style="padding-top: 4px"
                        >Keterangan</label
                    >
                    <textarea
                        v-model="formData.keterangan"
                        class="ta flex-grow-1"
                        rows="3"
                        placeholder="Keterangan pengembalian bahan..."
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
     ── KOLOM KANAN (GRID TABEL RINCIAN BAHAN YANG DIRETUR) ──
     ══════════════════════════════════════════════════════════ -->
        <template #right-column>
            <div class="desktop-form-section d-flex flex-column h-100 pa-0">
                <!-- Table Header Bar Standar Manksi (Navy Blue) -->
                <div class="tbl-header">
                    <span class="tbl-title">Rincian Bahan yang Diretur</span>
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
                                        placeholder="Nama Bahan..."
                                    />
                                </td>

                                <!-- 5. Qty Retur -->
                                <td class="p0">
                                    <input
                                        type="number"
                                        v-model.number="it.qty"
                                        min="0.01"
                                        step="any"
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
                                            @click="openRowSpkLookup(idx)"
                                        />
                                        <button
                                            v-if="it.spk"
                                            type="button"
                                            class="bclr"
                                            @click.stop="it.spk = ''"
                                            title="Hapus SPK"
                                        >
                                            <IconX :size="12" />
                                        </button>
                                        <button
                                            type="button"
                                            class="blkp"
                                            @click="openRowSpkLookup(idx)"
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
    <GudangMmtSearchModal
        v-model="showGudangAsalModal"
        @selected="onSelectGudangAsal"
    />

    <GudangMmtSearchModal
        v-model="showGudangTujuanModal"
        @selected="onSelectGudangTujuan"
    />

    <SpkSearchModal
        v-model="showHeaderSpkModal"
        @selected="onSelectHeaderSpk"
    />

    <SpkSearchModal v-model="showRowSpkModal" @selected="onSelectRowSpk" />

    <BahanMmtSearchModal v-model="showBahanModal" @selected="onSelectBahan" />
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
