<script setup lang="ts">
import { ref, computed, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useToast } from "vue-toastification";
import BaseForm from "@/components/BaseForm.vue";
import { useForm } from "@/composables/useForm";
import {
    IconBuildingFactory2,
    IconSearch,
    IconPlus,
    IconTrash,
    IconPrinter,
    IconX,
} from "@tabler/icons-vue";
import api from "@/services/api";

import BahanMmtSearchModal from "@/components/lookups/BahanMmtSearchModal.vue";
import SpkSearchModal from "@/components/lookups/SpkSearchModal.vue";
import GudangMmtSearchModal from "@/components/lookups/GudangMmtSearchModal.vue";

const route = useRoute();
const router = useRouter();
const toast = useToast();

const kategoriOptions = ["MMT/TEKSTIL", "SUBLIM"];
const divisiOptions = ["CUTING", "SUBLIM", "PROOF", "FINISHING"];
const ketOptions = ["BARU", "GANTI BS", "GANTI HILANG", "TAMBAHAN", "LAINNYA"];
const komponenOptions = [
    "BODY",
    "LENGAN",
    "KERAH",
    "MANSET",
    "KANTONG",
    "KOMBINASI",
    "LAINNYA",
];

interface DetailItem {
    no: number;
    kode: string;
    nama: string;
    satuan: string;
    panjang: number | string;
    lebar: number | string;
    babaran: number;
    pcs: number;
    jumlah: number;
    komponen: string;
    ket: string;
}

interface PermintaanProduksiForm {
    nomor: string;
    tanggal: string;
    kategori: string;
    gudangAsalKode: string;
    gudangAsalNama: string;
    divisi: string;
    spk: string;
    namaSpk: string;
    jumlahSpk: number;
    mkbNomor: string;
    mkbTanggal: string;
    keterangan: string;
    status: string;
    items: DetailItem[];
}

const initialData: PermintaanProduksiForm = {
    nomor: "AUTO",
    tanggal: new Date().toISOString().substring(0, 10),
    kategori: "MMT/TEKSTIL",
    gudangAsalKode: "",
    gudangAsalNama: "",
    divisi: "CUTING",
    spk: "",
    namaSpk: "Nama SPK...",
    jumlahSpk: 0,
    mkbNomor: "",
    mkbTanggal: "",
    keterangan: "BARU",
    status: "OPEN",
    items: [
        {
            no: 1,
            kode: "",
            nama: "",
            satuan: "ROLL",
            panjang: "",
            lebar: "",
            babaran: 0,
            pcs: 0,
            jumlah: 1,
            komponen: "BODY",
            ket: "",
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

const showBahanModal = ref(false);
const showSpkModal = ref(false);
const showGudangModal = ref(false);
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
} = useForm<PermintaanProduksiForm>({
    menuId: "5536",
    initialData,
    fetchApi: async () => {
        const nomor = route.params.nomor || route.query.nomor;
        if (!nomor) return { ...initialData };

        const res = await api.get(
            `/mmt/bahan-baku-produksi/permintaan-produksi/${encodeURIComponent(String(nomor))}`,
        );
        const data = res.data?.data;
        if (!data) return { ...initialData };

        const header = data.header || data;
        const details = data.details || data.Details || data.items || [];

        return {
            nomor: header.Nomor || header.min_nomor || String(nomor),
            tanggal:
                toDateInputValue(header.Tanggal || header.min_tanggal) ||
                initialData.tanggal,
            kategori: header.Kategori || header.min_kategori || "MMT/TEKSTIL",
            gudangAsalKode: header.GudangKode || header.min_cab || "WH-16",
            gudangAsalNama:
                header.NamaGudang || header.Nama || "GUDANG UTAMA MMT",
            divisi: header.Divisi || header.min_divisi || "CUTING",
            spk: header.Nomor_SPK || header.min_spk_nomor || "",
            namaSpk:
                header.spk_nama ||
                header.namaspk ||
                "NON-SPK (PERMINTAAN LANGSUNG)",
            jumlahSpk: Number(header.JumlahSpk || header.jumlahspk || 0),
            mkbNomor: header.MkbNomor || header.mkb_nomor || "",
            mkbTanggal: toDateInputValue(
                header.MkbTanggal || header.mkb_tanggal,
            ),
            keterangan: header.Keterangan || header.min_ket || "BARU",
            status:
                header.Status || (header.min_close === 0 ? "OPEN" : "CLOSED"),
            items: details.map((d: any, idx: number) => ({
                no: idx + 1,
                kode: d.kode || d.Kode || d.sku || "",
                nama: d.nama || d.Nama || d.Nama_Bahan || "",
                satuan: d.satuan || d.Satuan || "ROLL",
                panjang: d.panjang || d.Panjang || "",
                lebar: d.lebar || d.Lebar || "",
                babaran: Number(d.babaran || d.Babaran || d.mind_babaran || 0),
                pcs: Number(d.pcs || d.Pcs || d.mind_pcs || 0),
                jumlah: Number(d.jumlah || d.Jumlah || d.qtyMinta || 1),
                komponen: d.komponen || d.Komponen || d.mind_komponen || "BODY",
                ket: d.ket || d.keterangan || d.mind_ket || "",
            })),
        };
    },
    submitApi: async (dataToSave) => {
        if (!dataToSave.gudangAsalKode) {
            throw new Error("Gudang tujuan/asal permintaan wajib dipilih.");
        }

        const validItems = dataToSave.items.filter(
            (it) => it.kode.trim() !== "" && it.jumlah > 0,
        );
        if (validItems.length === 0) {
            throw new Error(
                "Mohon isi minimal satu item bahan dengan QTY > 0.",
            );
        }

        const payload = {
            isEditMode: isEditMode.value,
            nomor: dataToSave.nomor,
            tanggal: dataToSave.tanggal,
            kategori: dataToSave.kategori,
            cabang: dataToSave.gudangAsalKode,
            gudangAsalKode: dataToSave.gudangAsalKode,
            divisi: dataToSave.divisi,
            spk: dataToSave.spk || "",
            keterangan: dataToSave.keterangan,
            details: validItems.map((it) => ({
                kode: it.kode,
                nama: it.nama,
                satuan: it.satuan,
                panjang: Number(it.panjang || 0),
                lebar: Number(it.lebar || 0),
                babaran: Number(it.babaran || 0),
                pcs: Number(it.pcs || 0),
                jumlah: Number(it.jumlah || 0),
                komponen: it.komponen || "BODY",
                ket: it.ket || "",
            })),
        };

        if (isEditMode.value) {
            await api.put(
                "/mmt/bahan-baku-produksi/permintaan-produksi",
                payload,
            );
        } else {
            await api.post(
                "/mmt/bahan-baku-produksi/permintaan-produksi",
                payload,
            );
        }
    },
});

// Watcher pergantian kategori produksi
watch(
    () => formData.value.kategori,
    (newKategori) => {
        if (!isEditMode.value) {
            if (newKategori === "MMT/TEKSTIL") {
                formData.value.gudangAsalKode = "WH-16";
                formData.value.gudangAsalNama = "GUDANG UTAMA MMT";
                formData.value.divisi = "CUTING";
            } else if (newKategori === "SUBLIM") {
                formData.value.gudangAsalKode = "P04";
                formData.value.gudangAsalNama = "GUDANG UTAMA P04";
                formData.value.divisi = "SUBLIM";
            }
        }
    },
);

const onSelectGudang = (g: { Kode: string; Nama: string }) => {
    formData.value.gudangAsalKode = g.Kode;
    formData.value.gudangAsalNama = g.Nama;
};

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
        row.kode = b.Kode || b.brg_kode || "";
        row.nama = b.Nama || b.brg_nama || "";
        row.satuan = b.Satuan || b.brg_satuan || "ROLL";
        row.panjang = Number(b.Panjang || b.brg_panjang || 0);
        row.lebar = Number(b.Lebar || b.brg_lebar || 0);

        if (formData.value.kategori === "SUBLIM") {
            calculateJumlah(row);
        }
    }
};

const openSpkLookup = () => {
    showSpkModal.value = true;
};

const onSelectSpk = async (spk: any) => {
    const nomorSpk = spk.Nomor || spk.spk_nomor || spk.Spk || spk.spk;
    if (!nomorSpk) return;

    formData.value.spk = nomorSpk;
    formData.value.namaSpk =
        spk.Nama || spk.spk_nama || spk.Produk || spk.nama || "";

    // Auto-fetch info SPK & MKB dari backend
    try {
        const res = await api.get(
            `/mmt/bahan-baku-produksi/permintaan-produksi/minta-bahan/${encodeURIComponent(
                nomorSpk,
            )}`,
        );
        const resData = res.data?.data;
        if (resData) {
            if (resData.spkInfo?.Nama || resData.Nama) {
                formData.value.namaSpk = resData.spkInfo?.Nama || resData.Nama;
            }
            if (resData.spkInfo?.Jumlah || resData.Jumlah) {
                formData.value.jumlahSpk = Number(
                    resData.spkInfo?.Jumlah || resData.Jumlah || 0,
                );
            }
            if (resData.mkbHeader) {
                formData.value.mkbNomor =
                    resData.mkbHeader.nomor || resData.mkbHeader.Nomor || "";
                formData.value.mkbTanggal = toDateInputValue(
                    resData.mkbHeader.tanggal || resData.mkbHeader.Tanggal,
                );
            }
            if (
                Array.isArray(resData.mkbDetails) &&
                resData.mkbDetails.length > 0
            ) {
                formData.value.items = resData.mkbDetails.map(
                    (item: any, idx: number) => ({
                        no: idx + 1,
                        kode: item.kode || item.Kode || item.sku || "",
                        nama: item.nama || item.Nama || item.Nama_Bahan || "",
                        satuan: item.satuan || item.Satuan || "ROLL",
                        panjang: Number(item.panjang || item.Panjang || 0),
                        lebar: Number(item.lebar || item.Lebar || 0),
                        babaran: Number(item.babaran || item.Babaran || 0),
                        pcs: Number(
                            item.pcs ||
                                item.Pcs ||
                                formData.value.jumlahSpk ||
                                0,
                        ),
                        jumlah: Number(item.jumlah || item.Jumlah || 1),
                        komponen: item.komponen || item.Komponen || "BODY",
                        ket: item.ket || item.Ket || "",
                    }),
                );
                toast.info(
                    `Memuat ${resData.mkbDetails.length} item bahan dari SPK ${nomorSpk}`,
                );
            }
        }
    } catch (err: any) {
        console.error("Gagal load info SPK:", err);
    }
};

const clearSpkSelection = () => {
    formData.value.spk = "";
    formData.value.namaSpk = "NON-SPK (PERMINTAAN LANGSUNG)";
    formData.value.jumlahSpk = 0;
    formData.value.mkbNomor = "";
    formData.value.mkbTanggal = "";
};

const calculateJumlah = (item: DetailItem) => {
    if (formData.value.kategori === "MMT/TEKSTIL") return;
    const pcs = Number(item.pcs) || 0;
    const babaran = Number(item.babaran) || 0;
    if (babaran === 0) return;

    item.jumlah =
        item.satuan?.toUpperCase() === "KG"
            ? Number((pcs / babaran).toFixed(2))
            : Number((pcs * babaran).toFixed(2));
};

const addItem = () => {
    formData.value.items.push({
        no: formData.value.items.length + 1,
        kode: "",
        nama: "",
        satuan: "ROLL",
        panjang: "",
        lebar: "",
        babaran: 0,
        pcs:
            formData.value.kategori === "SUBLIM"
                ? formData.value.jumlahSpk || 0
                : 0,
        jumlah: 1,
        komponen: "BODY",
        ket: "",
    });
};

const removeItem = (idx: number) => {
    if (formData.value.items.length <= 1) {
        formData.value.items[0] = {
            no: 1,
            kode: "",
            nama: "",
            satuan: "ROLL",
            panjang: "",
            lebar: "",
            babaran: 0,
            pcs: 0,
            jumlah: 1,
            komponen: "BODY",
            ket: "",
        };
        return;
    }
    formData.value.items.splice(idx, 1);
    formData.value.items.forEach((it, i) => (it.no = i + 1));
};

const handlePrint = () => {
    if (!formData.value.nomor || formData.value.nomor === "AUTO") {
        toast.warning(
            "Simpan formulir permintaan terlebih dahulu sebelum mencetak.",
        );
        return;
    }
    const url = router.resolve({
        path: `/mmt/bahan-baku-produksi/permintaan-produksi/print/${encodeURIComponent(
            formData.value.nomor,
        )}`,
    }).href;
    window.open(url, "_blank");
};

const totalJumlah = computed(() => {
    return formData.value.items.reduce(
        (sum, it) => sum + (Number(it.jumlah) || 0),
        0,
    );
});
</script>

<template>
    <BaseForm
        :title="
            isEditMode
                ? `Ubah Permintaan Produksi (${formData.nomor})`
                : 'Tambah Permintaan Produksi Baru'
        "
        menu-id="5536"
        :icon="IconBuildingFactory2"
        :is-loading="isLoading"
        :is-saving="isSaving"
        item-name="Permintaan Produksi"
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

        <!-- ── KOLOM KIRI (HEADER & ASAL PERMINTAAN) ── -->
        <template #left-column>
            <!-- Section 1: Data Header Permintaan -->
            <div class="desktop-form-section header-section">
                <div class="section-label">Data Header Permintaan</div>

                <!-- Kategori Produksi -->
                <div class="fr">
                    <label class="lbl">Kategori</label>
                    <select
                        v-model="formData.kategori"
                        class="inp flex-grow-1 font-weight-bold text-primary"
                        :disabled="isEditMode"
                    >
                        <option
                            v-for="opt in kategoriOptions"
                            :key="opt"
                            :value="opt"
                        >
                            {{ opt }}
                        </option>
                    </select>
                </div>

                <!-- Nomor Permintaan -->
                <div class="fr">
                    <label class="lbl">Nomor Transaksi</label>
                    <input
                        :value="formData.nomor"
                        readonly
                        class="inp ro fw flex-grow-1"
                        placeholder="AUTO"
                    />
                </div>

                <!-- Tanggal Permintaan -->
                <div class="fr">
                    <label class="lbl">Tanggal</label>
                    <input
                        type="date"
                        v-model="formData.tanggal"
                        class="idate flex-grow-1"
                        required
                    />
                </div>

                <!-- Gudang Asal/Tujuan (Lookup GudangMmtSearchModal) -->
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
                            @click="showGudangModal = true"
                        />
                        <button
                            type="button"
                            class="blkp"
                            @click="showGudangModal = true"
                            title="Pilih Gudang (WH)"
                        >
                            <IconSearch :size="13" />
                        </button>
                    </div>
                </div>

                <!-- Divisi Peminta -->
                <div class="fr">
                    <label class="lbl">Divisi Peminta</label>
                    <select v-model="formData.divisi" class="inp flex-grow-1">
                        <option
                            v-for="opt in divisiOptions"
                            :key="opt"
                            :value="opt"
                        >
                            {{ opt }}
                        </option>
                    </select>
                </div>
            </div>

            <!-- Section 2: Informasi SPK & Catatan -->
            <div class="desktop-form-section">
                <div class="section-label">Informasi SPK & Catatan</div>

                <!-- Nomor SPK (Lookup SpkSearchModal) -->
                <div class="fr">
                    <label class="lbl">Nomor SPK</label>
                    <div class="igrp flex-grow-1">
                        <input
                            type="text"
                            v-model="formData.spk"
                            class="inp font-weight-medium"
                            placeholder="Pilih SPK (Opsional)..."
                            @click="openSpkLookup"
                        />
                        <button
                            v-if="formData.spk"
                            type="button"
                            class="blkp text-error"
                            @click.stop="clearSpkSelection"
                            title="Hapus pilihan SPK"
                        >
                            <IconX :size="13" />
                        </button>
                        <button
                            type="button"
                            class="blkp"
                            @click="openSpkLookup"
                            title="Cari SPK"
                        >
                            <IconSearch :size="13" />
                        </button>
                    </div>
                </div>

                <!-- Referensi MKB (Khusus Sublim jika ada) -->
                <div
                    v-if="formData.kategori === 'SUBLIM' && formData.mkbNomor"
                    class="fr"
                >
                    <label class="lbl">Ref. MKB</label>
                    <div class="d-flex align-center gap-2 flex-grow-1">
                        <input
                            type="text"
                            :value="formData.mkbNomor"
                            readonly
                            class="inp ro fw text-caption flex-grow-1"
                        />
                        <span class="text-caption text-grey">Tgl:</span>
                        <input
                            type="text"
                            :value="formData.mkbTanggal || '-'"
                            readonly
                            class="inp ro text-caption"
                            style="width: 90px"
                        />
                    </div>
                </div>

                <!-- Nama SPK / Pekerjaan -->
                <div class="fr align-start">
                    <label class="lbl" style="padding-top: 4px">Nama SPK</label>
                    <textarea
                        :value="formData.namaSpk"
                        readonly
                        class="ta flex-grow-1"
                        rows="2"
                        placeholder="Keterangan nama SPK / item..."
                    ></textarea>
                </div>

                <!-- Keterangan Alasan -->
                <div class="fr">
                    <label class="lbl">Alasan Minta</label>
                    <select
                        v-model="formData.keterangan"
                        class="inp flex-grow-1"
                    >
                        <option
                            v-for="opt in ketOptions"
                            :key="opt"
                            :value="opt"
                        >
                            {{ opt }}
                        </option>
                    </select>
                </div>

                <!-- Status Dokumen (Mode Edit) -->
                <div
                    v-if="isEditMode"
                    class="fr align-center mt-2 pt-2 border-top"
                >
                    <label class="lbl">Status</label>
                    <v-chip
                        size="small"
                        :color="
                            formData.status === 'OPEN' ? 'warning' : 'success'
                        "
                        class="font-weight-bold"
                    >
                        {{ formData.status }}
                    </v-chip>
                </div>
            </div>
        </template>

        <!-- ── KOLOM KANAN (GRID TABEL RINCIAN BAHAN PRODUKSI) ── -->
        <template #right-column>
            <div class="desktop-form-section d-flex flex-column h-100 pa-0">
                <!-- Table Header Bar -->
                <div class="tbl-header">
                    <span class="tbl-title">Rincian Bahan Produksi</span>
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
                            <!-- Header Kolom untuk MMT / TEKSTIL -->
                            <tr v-if="formData.kategori === 'MMT/TEKSTIL'">
                                <th style="width: 35px" class="tc">No</th>
                                <th style="width: 140px">Kode Bahan</th>
                                <th style="min-width: 180px">
                                    Nama Bahan Baku
                                </th>
                                <th style="width: 65px" class="tc">Satuan</th>
                                <th style="width: 80px" class="tr">
                                    Panjang (m)
                                </th>
                                <th style="width: 80px" class="tr">
                                    Lebar (m)
                                </th>
                                <th style="width: 95px" class="tr">
                                    Jml Order
                                </th>
                                <th style="min-width: 140px">
                                    Keterangan Detail
                                </th>
                                <th style="width: 35px" class="tc"></th>
                            </tr>
                            <!-- Header Kolom untuk SUBLIM -->
                            <tr v-else>
                                <th style="width: 35px" class="tc">No</th>
                                <th style="width: 140px">Kode Bahan</th>
                                <th style="min-width: 180px">Nama Bahan</th>
                                <th style="width: 65px" class="tc">Satuan</th>
                                <th style="width: 75px" class="tr">Babaran</th>
                                <th style="width: 75px" class="tr">Pcs</th>
                                <th style="width: 90px" class="tr">Jumlah</th>
                                <th style="width: 110px">Komponen</th>
                                <th style="min-width: 120px">Keterangan</th>
                                <th style="width: 35px" class="tc"></th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-for="(it, idx) in formData.items" :key="idx">
                                <!-- No -->
                                <td class="tc">{{ idx + 1 }}</td>

                                <!-- Kode Bahan -->
                                <td class="p0">
                                    <div
                                        class="igrp w-100"
                                        style="border: none; height: 100%"
                                    >
                                        <input
                                            type="text"
                                            v-model="it.kode"
                                            class="ci fw text-primary"
                                            placeholder="Cari..."
                                            @click="openBahanLookup(idx)"
                                        />
                                        <button
                                            type="button"
                                            class="blkp"
                                            @click="openBahanLookup(idx)"
                                            title="Cari Bahan MMT"
                                        >
                                            <IconSearch :size="13" />
                                        </button>
                                    </div>
                                </td>

                                <!-- Nama Bahan (Readonly) -->
                                <td class="p0">
                                    <input
                                        type="text"
                                        v-model="it.nama"
                                        class="ci ro fw"
                                        readonly
                                        placeholder="Nama Bahan..."
                                    />
                                </td>

                                <!-- Satuan -->
                                <td class="p0">
                                    <input
                                        type="text"
                                        v-model="it.satuan"
                                        class="ci tc"
                                        placeholder="ROLL"
                                    />
                                </td>

                                <!-- Bagian Spesifik MMT/TEKSTIL -->
                                <template
                                    v-if="formData.kategori === 'MMT/TEKSTIL'"
                                >
                                    <!-- Panjang -->
                                    <td class="p0">
                                        <input
                                            type="number"
                                            v-model.number="it.panjang"
                                            step="any"
                                            class="ci tr"
                                            placeholder="0"
                                        />
                                    </td>

                                    <!-- Lebar -->
                                    <td class="p0">
                                        <input
                                            type="number"
                                            v-model.number="it.lebar"
                                            step="any"
                                            class="ci tr"
                                            placeholder="0"
                                        />
                                    </td>

                                    <!-- Jumlah Order -->
                                    <td class="p0">
                                        <input
                                            type="number"
                                            v-model.number="it.jumlah"
                                            min="0.01"
                                            step="any"
                                            class="ci tr fw"
                                        />
                                    </td>

                                    <!-- Keterangan -->
                                    <td class="p0">
                                        <input
                                            type="text"
                                            v-model="it.ket"
                                            class="ci"
                                            placeholder="Keterangan..."
                                        />
                                    </td>
                                </template>

                                <!-- Bagian Spesifik SUBLIM -->
                                <template v-else>
                                    <!-- Babaran -->
                                    <td class="p0">
                                        <input
                                            type="number"
                                            v-model.number="it.babaran"
                                            step="any"
                                            class="ci tr"
                                            placeholder="0"
                                            @input="calculateJumlah(it)"
                                        />
                                    </td>

                                    <!-- Pcs -->
                                    <td class="p0">
                                        <input
                                            type="number"
                                            v-model.number="it.pcs"
                                            step="any"
                                            class="ci tr"
                                            placeholder="0"
                                            @input="calculateJumlah(it)"
                                        />
                                    </td>

                                    <!-- Jumlah -->
                                    <td class="p0">
                                        <input
                                            type="number"
                                            v-model.number="it.jumlah"
                                            min="0.01"
                                            step="any"
                                            class="ci tr fw"
                                        />
                                    </td>

                                    <!-- Komponen -->
                                    <td class="p0">
                                        <select
                                            v-model="it.komponen"
                                            class="ci"
                                        >
                                            <option
                                                v-for="opt in komponenOptions"
                                                :key="opt"
                                                :value="opt"
                                            >
                                                {{ opt }}
                                            </option>
                                        </select>
                                    </td>

                                    <!-- Keterangan -->
                                    <td class="p0">
                                        <input
                                            type="text"
                                            v-model="it.ket"
                                            class="ci"
                                            placeholder="Ket..."
                                        />
                                    </td>
                                </template>

                                <!-- Aksi Hapus -->
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

                <!-- Summary Footer -->
                <div class="summary-footer">
                    <div class="sum-item">
                        <span>Jumlah Baris:</span>
                        <strong>{{ formData.items.length }} Item</strong>
                    </div>
                    <div class="sum-item grand fw">
                        <span>Total QTY Diminta:</span>
                        <span>{{ totalJumlah.toLocaleString("id-ID") }}</span>
                    </div>
                </div>
            </div>
        </template>
    </BaseForm>

    <!-- Modals Lookup -->
    <GudangMmtSearchModal
        v-model="showGudangModal"
        @selected="onSelectGudang"
    />
    <BahanMmtSearchModal v-model="showBahanModal" @selected="onSelectBahan" />
    <SpkSearchModal v-model="showSpkModal" @selected="onSelectSpk" />
</template>

<style scoped>
:deep(.form-grid-container.two-column) {
    --left-col-width: 330px;
}
@media (max-width: 1400px) {
    :deep(.form-grid-container.two-column) {
        --left-col-width: 300px;
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
.border-top {
    border-top: 1px dashed #e0e0e0;
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
