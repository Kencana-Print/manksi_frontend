<script setup lang="ts">
import { ref, computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useToast } from "vue-toastification";
import BaseForm from "@/components/BaseForm.vue";
import { useForm } from "@/composables/useForm";
import {
    IconClipboardList,
    IconSearch,
    IconPlus,
    IconTrash,
    IconCheck,
    IconPrinter,
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
    spk: string;
    namaSpk: string;
    kodeBahan: string;
    namaBahan: string;
    qty: number;
    satuan: string;
    panjang: string | number;
    lebar: string | number;
    keterangan: string;
}

interface PengajuanForm {
    nomor: string;
    tanggal: string;
    gudangKode: string;
    gudangNama: string;
    jenis: string;
    priority: string;
    kepada: string;
    keterangan: string;
    statusAcc: string;
    accSpv: string;
    items: DetailItem[];
}

const initialData: PengajuanForm = {
    nomor: "AUTO",
    tanggal: new Date().toISOString().substring(0, 10),
    gudangKode: "",
    gudangNama: "",
    jenis: "",
    priority: "Urgent",
    kepada: "",
    keterangan: "",
    statusAcc: "N",
    accSpv: "",
    items: [
        {
            no: 1,
            spk: "",
            namaSpk: "",
            kodeBahan: "",
            namaBahan: "",
            qty: 1,
            satuan: "",
            panjang: "",
            lebar: "",
            keterangan: "",
        },
    ],
};

const toDateInputValue = (val: any): string => {
    if (!val) return "";
    const s = String(val).trim();
    // dd/MM/yyyy
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(s)) {
        const [d, m, y] = s.split("/");
        return `${y}-${m}-${d}`;
    }
    // dd-MM-yyyy
    if (/^\d{2}-\d{2}-\d{4}$/.test(s)) {
        const [d, m, y] = s.split("-");
        return `${y}-${m}-${d}`;
    }
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
const isApproving = ref(false);

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
} = useForm<PengajuanForm>({
    menuId: "5531",
    initialData,
    fetchApi: async () => {
        const nomor = route.params.nomor || route.query.nomor;
        if (!nomor) return { ...initialData };

        const res = await api.get(
            `/mmt/bahan-baku-produksi/permintaan-pembelian/${encodeURIComponent(String(nomor))}`,
        );
        const data = res.data?.data || res.data;
        if (!data) return { ...initialData };

        const details = data.Detail || data.detail || [];

        return {
            nomor: data.Nomor || String(nomor),
            tanggal: toDateInputValue(data.Tanggal) || initialData.tanggal,
            gudangKode: data.Gudang || "",
            gudangNama: data.Nama || "",
            jenis: data.Jenis || "",
            priority: data.Priority || "Urgent",
            kepada: data.Ditujukan_Ke || data.Kepada || "",
            keterangan: data.Keterangan || "",
            statusAcc: data.Status_Acc || "N",
            accSpv: data.Acc_SPV || "",
            items: details.map((d: any, idx: number) => ({
                no: idx + 1,
                spk: d.Nomor_SPK || d.spk || "",
                namaSpk: d.spk_nama || "",
                kodeBahan: d.Kode || d.Kode_Bahan || d.kode || "",
                namaBahan: d.Nama_Bahan || d.nama || "",
                qty: Number(d.Jumlah ?? d.qty ?? 1),
                satuan: d.Satuan || d.satuan || "",
                panjang: d.Panjang ?? "",
                lebar: d.Lebar ?? "",
                keterangan:
                    d.KeteranganItem || d.Keterangan || d.keterangan || "",
            })),
        };
    },
    submitApi: async (dataToSave: PengajuanForm) => {
        if (!dataToSave.gudangKode || !dataToSave.gudangKode.trim()) {
            throw new Error("Mohon pilih Gudang Peminta terlebih dahulu.");
        }

        const validItems = dataToSave.items.filter(
            (it) => it.kodeBahan.trim() !== "" && it.qty > 0,
        );
        if (validItems.length === 0) {
            throw new Error(
                "Mohon isi minimal satu item bahan dengan QTY > 0.",
            );
        }

        const payload = {
            NomorToEdit: isEditMode.value ? dataToSave.nomor : null,
            Tanggal: dataToSave.tanggal,
            GudangKode: dataToSave.gudangKode,
            GudangNama: dataToSave.gudangNama,
            Jenis: dataToSave.jenis,
            Keterangan: dataToSave.keterangan,
            Kepada: dataToSave.kepada,
            Priority: dataToSave.priority,
            Detail: validItems.map((it) => ({
                Nomor_SPK: it.spk || null,
                Kode_Bahan: it.kodeBahan,
                Jumlah: it.qty,
                Satuan: it.satuan,
                Keterangan: it.keterangan,
            })),
        };

        if (isEditMode.value) {
            await api.put(
                `/mmt/bahan-baku-produksi/permintaan-pembelian/${encodeURIComponent(dataToSave.nomor)}`,
                payload,
            );
        } else {
            await api.post(
                "/mmt/bahan-baku-produksi/permintaan-pembelian",
                payload,
            );
        }
    },
});

const onSelectGudang = (g: { Kode: string; Nama: string }) => {
    formData.value.gudangKode = g.Kode;
    formData.value.gudangNama = g.Nama;
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
        row.kodeBahan = b.Kode || b.brg_kode || "";
        row.namaBahan = b.Nama || b.brg_nama || "";
        row.satuan = b.Satuan || b.brg_satuan || "";
        row.panjang = b.Panjang ?? b.brg_panjang ?? "";
        row.lebar = b.Lebar ?? b.brg_lebar ?? "";
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
        row.namaSpk = spk.Nama || spk.Nama2 || spk.spk_nama || spk.Produk || "";
    }
};

const addItem = () => {
    formData.value.items.push({
        no: formData.value.items.length + 1,
        spk: "",
        namaSpk: "",
        kodeBahan: "",
        namaBahan: "",
        qty: 1,
        satuan: "",
        panjang: "",
        lebar: "",
        keterangan: "",
    });
};

const removeItem = (idx: number) => {
    if (formData.value.items.length <= 1) {
        formData.value.items[0] = {
            no: 1,
            spk: "",
            namaSpk: "",
            kodeBahan: "",
            namaBahan: "",
            qty: 1,
            satuan: "",
            panjang: "",
            lebar: "",
            keterangan: "",
        };
        return;
    }
    formData.value.items.splice(idx, 1);
    formData.value.items.forEach((it, i) => (it.no = i + 1));
};

const handleApproveSpv = async () => {
    if (
        !confirm(
            `ACC Permintaan Pembelian nomor ${formData.value.nomor} sekarang?`,
        )
    )
        return;
    isApproving.value = true;
    try {
        await api.post(
            "/mmt/bahan-baku-produksi/permintaan-pembelian/approve",
            {
                nomor: formData.value.nomor,
            },
        );
        toast.success("Permintaan Pembelian berhasil di-ACC oleh SPV!");
        formData.value.statusAcc = "Y";
    } catch (err: any) {
        toast.error(
            err.response?.data?.message || "Gagal ACC Permintaan Pembelian.",
        );
    } finally {
        isApproving.value = false;
    }
};

const handlePrint = () => {
    if (!formData.value.nomor || formData.value.nomor === "AUTO") {
        toast.warning(
            "Simpan formulir Permintaan Pembelian terlebih dahulu sebelum mencetak.",
        );
        return;
    }
    const url = router.resolve({
        path: `/mmt/bahan-baku-produksi/permintaan-pembelian/print/${encodeURIComponent(
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
</script>

<template>
    <BaseForm
        :title="
            isEditMode
                ? `Ubah Permintaan Pembelian (${formData.nomor})`
                : 'Tambah Permintaan Pembelian Baru'
        "
        menu-id="5531"
        :icon="IconClipboardList"
        :is-loading="isLoading"
        :is-saving="isSaving"
        item-name="Permintaan Pembelian"
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
                Cetak
            </v-btn>
        </template>

        <!-- ── KOLOM KIRI (HEADER & INFORMASI TUJUAN) ── -->
        <template #left-column>
            <!-- Section 1: Data Header Permintaan Pembelian -->
            <div class="desktop-form-section header-section">
                <div class="section-label">
                    Data Header Permintaan Pembelian
                </div>

                <!-- Nomor Permintaan -->
                <div class="fr">
                    <label class="lbl">Nomor Permintaan</label>
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

                <!-- Gudang Peminta (Lookup) -->
                <div class="fr">
                    <label class="lbl">Gudang Peminta</label>
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
                            placeholder="Pilih Gudang..."
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

                <!-- Jenis Permintaan -->
                <div class="fr">
                    <label class="lbl">Jenis Permintaan</label>
                    <select v-model="formData.jenis" class="inp flex-grow-1">
                        <option value="Bahan Baku">Bahan Baku</option>
                        <option value="Sparepart">Sparepart</option>
                        <option value="ATK">ATK</option>
                    </select>
                </div>
            </div>

            <!-- Section 2: Tujuan & Approval -->
            <div class="desktop-form-section">
                <div class="section-label">Informasi Tujuan & Approval</div>

                <!-- Priority -->
                <div class="fr">
                    <label class="lbl">Priority</label>
                    <select v-model="formData.priority" class="inp flex-grow-1">
                        <option value="Normal">Normal</option>
                        <option value="Urgent">Urgent</option>
                    </select>
                </div>

                <!-- Ditujukan Ke -->
                <div class="fr">
                    <label class="lbl">Ditujukan Ke</label>
                    <input
                        type="text"
                        v-model="formData.kepada"
                        class="inp flex-grow-1"
                        placeholder="Contoh: Purchasing / Head Office"
                    />
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
                        placeholder="Keterangan pengajuan / no referensi..."
                    ></textarea>
                </div>

                <!-- Status ACC (Mode Edit) -->
                <div
                    v-if="isEditMode"
                    class="fr align-center mt-2 pt-2 border-top"
                >
                    <label class="lbl">Status ACC</label>
                    <div
                        class="d-flex align-center gap-2 flex-grow-1 flex-wrap"
                    >
                        <v-chip
                            size="small"
                            :color="
                                formData.statusAcc === 'Y'
                                    ? 'success'
                                    : 'warning'
                            "
                            class="font-weight-bold"
                        >
                            {{
                                formData.statusAcc === "Y"
                                    ? `ACC (${formData.accSpv || "SPV"})`
                                    : "PENDING"
                            }}
                        </v-chip>
                        <v-btn
                            v-if="formData.statusAcc !== 'Y'"
                            size="x-small"
                            color="primary"
                            variant="flat"
                            :loading="isApproving"
                            @click="handleApproveSpv"
                        >
                            <IconCheck :size="14" class="mr-1" />
                            ACC SPV
                        </v-btn>
                    </div>
                </div>
            </div>
        </template>

        <!-- ── KOLOM KANAN (GRID TABEL ITEM RINCIAN BAHAN) ── -->
        <template #right-column>
            <div class="desktop-form-section d-flex flex-column h-100 pa-0">
                <!-- Table Header Bar -->
                <div class="tbl-header">
                    <span class="tbl-title">Rincian Bahan yang Diajukan</span>
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
                                <th style="width: 145px">Nomor SPK</th>
                                <th style="min-width: 160px">Nama SPK</th>
                                <th style="width: 140px">Kode Bahan</th>
                                <th style="min-width: 180px">Nama Bahan</th>
                                <th style="width: 70px" class="tc">P (m)</th>
                                <th style="width: 70px" class="tc">L (m)</th>
                                <th style="width: 85px" class="tr">
                                    Qty Diminta
                                </th>
                                <th style="width: 70px" class="tc">Satuan</th>
                                <th style="min-width: 140px">Keterangan</th>
                                <th style="width: 35px" class="tc"></th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-for="(it, idx) in formData.items" :key="idx">
                                <!-- No -->
                                <td class="tc">{{ idx + 1 }}</td>

                                <!-- Nomor SPK -->
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

                                <!-- Nama SPK (Readonly) -->
                                <td class="p0">
                                    <input
                                        type="text"
                                        :value="it.namaSpk"
                                        class="ci ro"
                                        readonly
                                        placeholder="Nama SPK..."
                                    />
                                </td>

                                <!-- Kode Bahan -->
                                <td class="p0">
                                    <div
                                        class="igrp w-100"
                                        style="border: none; height: 100%"
                                    >
                                        <input
                                            type="text"
                                            v-model="it.kodeBahan"
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
                                        v-model="it.namaBahan"
                                        class="ci ro fw"
                                        readonly
                                        placeholder="Nama Bahan..."
                                    />
                                </td>

                                <!-- Panjang (m) -->
                                <td class="p0">
                                    <input
                                        type="text"
                                        :value="it.panjang || '-'"
                                        class="ci ro tc"
                                        readonly
                                    />
                                </td>

                                <!-- Lebar (m) -->
                                <td class="p0">
                                    <input
                                        type="text"
                                        :value="it.lebar || '-'"
                                        class="ci ro tc"
                                        readonly
                                    />
                                </td>

                                <!-- Qty Diminta -->
                                <td class="p0">
                                    <input
                                        type="number"
                                        v-model.number="it.qty"
                                        min="0.01"
                                        step="any"
                                        class="ci tr fw"
                                    />
                                </td>

                                <!-- Satuan -->
                                <td class="p0">
                                    <input
                                        type="text"
                                        v-model="it.satuan"
                                        class="ci tc"
                                        placeholder=""
                                    />
                                </td>

                                <!-- Keterangan Item -->
                                <td class="p0">
                                    <input
                                        type="text"
                                        v-model="it.keterangan"
                                        class="ci"
                                        placeholder="Keterangan..."
                                    />
                                </td>

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
                        <span>{{ totalQty.toLocaleString("id-ID") }}</span>
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
