<script setup lang="ts">
import { ref, computed, nextTick } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useToast } from "vue-toastification";
import BaseForm from "@/components/BaseForm.vue";
import { useForm } from "@/composables/useForm";
import {
    IconArrowsExchange,
    IconSearch,
    IconPlus,
    IconTrash,
    IconBarcode,
} from "@tabler/icons-vue";
import api from "@/services/api";

import BahanMmtSearchModal from "@/components/lookups/BahanMmtSearchModal.vue";
import SpkSearchModal from "@/components/lookups/SpkSearchModal.vue";
import GudangMmtSearchModal from "@/components/lookups/GudangMmtSearchModal.vue";

const route = useRoute();
const router = useRouter();
const toast = useToast();

interface DetailItem {
    no: number;
    barcode: string;
    kode_barang: string;
    Nama_Bahan: string;
    satuan: string;
    panjang: string | number;
    lebar: string | number;
    qty: number;
    spk: string;
    keterangan: string;
}

interface MutasiForm {
    nomor: string;
    tanggal: string;
    gudangAsalKode: string;
    gudangAsalNama: string;
    gudangTujuanKode: string;
    gudangTujuanNama: string;
    tipe: number;
    keterangan: string;
    items: DetailItem[];
}

const initialData: MutasiForm = {
    nomor: "AUTO",
    tanggal: new Date().toISOString().substring(0, 10),
    gudangAsalKode: "",
    gudangAsalNama: "",
    gudangTujuanKode: "",
    gudangTujuanNama: "",
    tipe: 0,
    keterangan: "",
    items: [
        {
            no: 1,
            barcode: "",
            kode_barang: "",
            Nama_Bahan: "",
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

// Modal Lookups State
const showBahanModal = ref(false);
const showSpkModal = ref(false);
const showGudangAsalModal = ref(false);
const showGudangTujuanModal = ref(false);
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
} = useForm<MutasiForm>({
    menuId: "5534",
    initialData,
    fetchApi: async () => {
        const nomor = route.params.nomor || route.query.nomor;
        if (!nomor) return { ...initialData };

        const res = await api.get(
            `/mmt/bahan-baku-produksi/mutasi-bahan/${encodeURIComponent(String(nomor))}`,
        );
        const data = res.data?.data || res.data;
        if (!data) return { ...initialData };

        const header = data.header || data;
        const details =
            data.details || data.Detail || data.Details || data.items || [];

        return {
            nomor: header.Nomor || String(nomor),
            tanggal: toDateInputValue(header.Tanggal) || initialData.tanggal,
            gudangAsalKode: header.GudangAsal || header.Asal || "WH-16",
            gudangAsalNama:
                header.NamaGudangAsal || header.GudangAsal || "Gudang Asal",
            gudangTujuanKode: header.GudangTujuan || header.Tujuan || "GPM",
            gudangTujuanNama:
                header.NamaGudangTujuan ||
                header.GudangTujuan ||
                "Gudang Tujuan",
            tipe: Number(header.Type ?? header.mut_type ?? 0),
            keterangan: header.Keterangan || header.mut_keterangan || "",
            items: details.map((d: any, idx: number) => ({
                no: idx + 1,
                barcode: d.barcode || d.Barcode || "",
                kode_barang: d.kode_barang || d.Kode || d.kode || "",
                Nama_Bahan: d.Nama_Bahan || d.Nama_Barang || d.nama || "",
                satuan: d.satuan || d.Satuan || "ROLL",
                panjang: d.panjang ?? d.Panjang ?? "",
                lebar: d.lebar ?? d.Lebar ?? "",
                qty: Number(d.qty ?? d.Qty ?? 1),
                spk: d.spk || d.SPK || "",
                keterangan: d.keterangan || d.Ket || "",
            })),
        };
    },
    submitApi: async (dataToSave) => {
        if (!dataToSave.gudangAsalKode) {
            throw new Error("Gudang asal wajib dipilih.");
        }
        if (!dataToSave.gudangTujuanKode) {
            throw new Error("Gudang tujuan wajib dipilih.");
        }
        if (dataToSave.gudangAsalKode === dataToSave.gudangTujuanKode) {
            throw new Error("Gudang asal dan gudang tujuan tidak boleh sama.");
        }

        const validItems = dataToSave.items.filter(
            (it) => it.kode_barang.trim() !== "" && Number(it.qty) > 0,
        );
        if (validItems.length === 0) {
            throw new Error(
                "Mohon isi minimal satu item bahan dengan QTY > 0.",
            );
        }

        const payload = {
            Nomor: dataToSave.nomor,
            Tanggal: dataToSave.tanggal,
            GudangAsal: dataToSave.gudangAsalKode,
            GudangTujuan: dataToSave.gudangTujuanKode,
            Keterangan: dataToSave.keterangan,
            Type: Number(dataToSave.tipe),
            Details: validItems.map((it) => ({
                kode_barang: it.kode_barang,
                barcode: it.barcode?.trim() || null,
                qty: Number(it.qty),
                panjang: Number(it.panjang) || 0,
                lebar: Number(it.lebar) || 0,
                spk: it.spk?.trim() || null,
                keterangan: it.keterangan?.trim() || "",
            })),
        };

        if (isEditMode.value) {
            await api.put(
                `/mmt/bahan-baku-produksi/mutasi-bahan/${encodeURIComponent(dataToSave.nomor)}`,
                payload,
            );
        } else {
            await api.post("/mmt/bahan-baku-produksi/mutasi-bahan", payload);
        }
    },
});

// Barcode Scan Handler
const onBarcodeScan = async (idx: number) => {
    const item = formData.value.items[idx];
    const bc = item.barcode?.trim();
    if (!bc) return;

    // Cek duplikasi di tabel
    const duplicateIdx = formData.value.items.findIndex(
        (it, i) => i !== idx && it.barcode?.trim() === bc,
    );
    if (duplicateIdx !== -1) {
        toast.warning(`Barcode ${bc} sudah ada di baris #${duplicateIdx + 1}`);
        item.barcode = "";
        return;
    }

    try {
        const res = await api.get(
            "/mmt/bahan-baku-produksi/barcode/search/quick-check",
            { params: { barcode: bc, gudang: formData.value.gudangAsalKode } },
        );
        const b = res.data?.data;
        if (b) {
            item.kode_barang = b.Kode || b.mst_brg_kode || "";
            item.Nama_Bahan = b.Nama_Bahan || b.brg_nama || "";
            item.panjang = b.Panjang || b.mst_panjang || "";
            item.lebar = b.Lebar || b.mst_lebar || "";
            item.satuan = b.Satuan || "ROLL";
            item.qty = 1;
            item.spk =
                b.Nomor_SPK && b.Nomor_SPK !== "0"
                    ? b.Nomor_SPK
                    : b.mst_spk_nomor || "";
            toast.success(`Barcode cocok: ${item.Nama_Bahan}`);

            // Jika scan pada baris terakhir, otomatis tambah baris baru untuk scan berikutnya
            if (idx === formData.value.items.length - 1) {
                addItem();
            }
        } else {
            toast.warning(`Barcode ${bc} tidak ditemukan di master stok.`);
        }
    } catch (err: any) {
        toast.warning(`Barcode ${bc} tidak ditemukan atau gagal dicek.`);
    }
};

// Lookups Selection
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
        row.kode_barang = b.Kode || b.brg_kode || "";
        row.Nama_Bahan = b.Nama || b.brg_nama || "";
        row.satuan = b.Satuan || b.brg_satuan || "ROLL";
        row.panjang = b.Panjang || b.brg_panjang || "";
        row.lebar = b.Lebar || b.brg_lebar || "";
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
    formData.value.gudangAsalKode = g.Kode;
    formData.value.gudangAsalNama = g.Nama;
};

const onSelectGudangTujuan = (g: { Kode: string; Nama: string }) => {
    formData.value.gudangTujuanKode = g.Kode;
    formData.value.gudangTujuanNama = g.Nama;
};

const addItem = () => {
    formData.value.items.push({
        no: formData.value.items.length + 1,
        barcode: "",
        kode_barang: "",
        Nama_Bahan: "",
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
            kode_barang: "",
            Nama_Bahan: "",
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

const totalQty = computed(() => {
    return formData.value.items.reduce(
        (sum, it) => sum + (Number(it.qty) || 0),
        0,
    );
});
</script>

<template>
    <BaseForm
        :title="
            isEditMode
                ? `Ubah Mutasi Bahan MMT (${formData.nomor})`
                : 'Tambah Mutasi Bahan MMT Baru'
        "
        menu-id="5534"
        :icon="IconArrowsExchange"
        :is-loading="isLoading"
        :is-saving="isSaving"
        item-name="Mutasi Bahan MMT"
        desktop-mode
        v-model:show-save-dialog="showSaveDialog"
        v-model:show-cancel-dialog="showCancelDialog"
        v-model:show-close-dialog="showCloseDialog"
        @validate-save="showSaveDialog = true"
        @confirm-save="executeSave"
        @confirm-cancel="executeCancel"
        @confirm-close="executeClose"
    >
        <!-- ── KOLOM KIRI (HEADER & INFORMASI GUDANG) ── -->
        <template #left-column>
            <!-- Section 1: Data Header Dokumen -->
            <div class="desktop-form-section header-section">
                <div class="section-label">Data Header Dokumen</div>

                <!-- Nomor Mutasi -->
                <div class="fr">
                    <label class="lbl">Nomor Mutasi</label>
                    <input
                        :value="formData.nomor"
                        readonly
                        class="inp ro fw flex-grow-1"
                        placeholder="AUTO"
                    />
                </div>

                <!-- Tanggal Mutasi -->
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
                            title="Cari Gudang Asal"
                        >
                            <IconSearch :size="13" />
                        </button>
                    </div>
                </div>

                <!-- Gudang Tujuan (Lookup GudangMmtSearchModal) -->
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
                            title="Cari Gudang Tujuan"
                        >
                            <IconSearch :size="13" />
                        </button>
                    </div>
                </div>
            </div>

            <!-- Section 2: Tipe & Keterangan Transaksi -->
            <div class="desktop-form-section note-section">
                <div class="section-label">Tipe & Keterangan</div>

                <!-- Tipe Mutasi -->
                <div class="fr">
                    <label class="lbl">Tipe Mutasi</label>
                    <select
                        v-model.number="formData.tipe"
                        class="inp flex-grow-1 font-weight-medium"
                    >
                        <option :value="0">0 - Mutasi Antar Gudang</option>
                        <option :value="1">1 - Mutasi Produksi</option>
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
                        placeholder="Keterangan..."
                    ></textarea>
                </div>
            </div>
        </template>

        <!-- ── KOLOM KANAN (GRID TABEL RINCIAN BAHAN MUTASI) ── -->
        <template #right-column>
            <div class="desktop-form-section d-flex flex-column h-100 pa-0">
                <!-- Table Header Bar -->
                <div class="tbl-header">
                    <span class="tbl-title">Rincian Bahan yang Dimutasi</span>
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
                                <th style="width: 80px" class="tr">Qty</th>
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
                                            class="ci fw font-monospace text-primary"
                                            placeholder="Scan / ketik..."
                                            @keyup.enter="onBarcodeScan(idx)"
                                        />
                                        <button
                                            type="button"
                                            class="blkp"
                                            @click="onBarcodeScan(idx)"
                                            title="Cek Barcode"
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
                                            v-model="it.kode_barang"
                                            class="ci fw"
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

                                <!-- 4. Nama Bahan (Readonly / Otomatis dari Master) -->
                                <td class="p0">
                                    <input
                                        type="text"
                                        v-model="it.Nama_Bahan"
                                        class="ci ro fw"
                                        readonly
                                        placeholder="Pilih Bahan..."
                                    />
                                </td>

                                <!-- 5. Qty Mutasi -->
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
                                            class="ci"
                                            placeholder="Cari..."
                                            @click="openSpkLookup(idx)"
                                        />
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

                <!-- Summary Footer -->
                <div class="summary-footer">
                    <div class="sum-item">
                        <span>Jumlah Baris:</span>
                        <strong>{{ formData.items.length }} Item</strong>
                    </div>
                    <div class="sum-item grand fw">
                        <span>Total QTY Mutasi:</span>
                        <span>{{ totalQty.toLocaleString("id-ID") }}</span>
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
.font-monospace {
    font-family: monospace;
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
