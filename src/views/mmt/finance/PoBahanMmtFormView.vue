<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useRoute } from "vue-router";
import { useToast } from "vue-toastification";
import BaseForm from "@/components/BaseForm.vue";
import { useForm } from "@/composables/useForm";
import {
    IconShoppingCart,
    IconSearch,
    IconPlus,
    IconTrash,
} from "@tabler/icons-vue";
import api from "@/services/api";

import SupplierSearchModal from "@/components/lookups/SupplierSearchModal.vue";
import BahanMmtSearchModal from "@/components/lookups/BahanMmtSearchModal.vue";
import PabrikSearchModal from "@/components/lookups/PabrikSearchModal.vue";
import SpkSearchModal from "@/components/lookups/SpkSearchModal.vue";
import PermintaanBahanMmtSearchModal from "@/components/lookups/PermintaanBahanMmtSearchModal.vue";

const route = useRoute();
const toast = useToast();

interface DetailItem {
    no: number;
    kode: string;
    nama: string;
    satuan: string;
    qty: number;
    harga: number;
    discPr: number;
    spk: string;
    keterangan: string;
}

interface PoBahanForm {
    nomor: string;
    tanggal: string;
    dateline: string;
    nomorPermintaan: string;
    supKode: string;
    supNama: string;
    supAlamat: string;
    supKota: string;
    pabrikNama: string;
    alamatPabrik: string;
    isPpn: boolean;
    keterangan: string;
    note: string;
    items: DetailItem[];
}

const initialData: PoBahanForm = {
    nomor: "AUTO",
    tanggal: new Date().toISOString().substring(0, 10),
    dateline: new Date().toISOString().substring(0, 10),
    nomorPermintaan: "",
    supKode: "",
    supNama: "",
    supAlamat: "",
    supKota: "",
    pabrikNama: "",
    alamatPabrik: "",
    isPpn: true,
    keterangan: "",
    note: "",
    items: [],
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
const showSupplierModal = ref(false);
const showBahanModal = ref(false);
const showPabrikModal = ref(false);
const showSpkModal = ref(false);
const showPermintaanModal = ref(false);
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
} = useForm<PoBahanForm>({
    menuId: "5504",
    initialData,
    fetchApi: async () => {
        const nomor = route.params.nomor || route.query.nomor;
        if (!nomor) return { ...initialData };

        const res = await api.get(
            `/mmt/po-bahan-mmt/${encodeURIComponent(String(nomor))}`,
        );
        const data = res.data?.data || res.data;
        if (!data) return { ...initialData };

        const header = data.header || data;
        const details =
            data.Detail || data.detail || data.details || data.items || [];

        return {
            nomor: header.Nomor || header.nomor || String(nomor),
            tanggal:
                toDateInputValue(header.Tanggal || header.tanggal) ||
                initialData.tanggal,
            dateline:
                toDateInputValue(header.Dateline || header.dateline) ||
                initialData.dateline,
            nomorPermintaan:
                header.NomorPermintaan ||
                header.po_mppb_nomor ||
                header.nomorPermintaan ||
                "",
            supKode:
                header.KodeSup || header.supKode || header.po_sup_kode || "",
            supNama: header.SupNama || header.Nama || header.supNama || "",
            supAlamat:
                header.SupAlamat || header.Alamat || header.supAlamat || "",
            supKota: header.SupKota || header.Kota || header.supKota || "",
            pabrikNama: header.Pabrik || header.pabrikNama || "",
            alamatPabrik:
                header.AlamatPabrik ||
                header.alamatPabrik ||
                header.po_kirim ||
                "",
            isPpn:
                header.IsPpn === 1 ||
                header.IsTax === 1 ||
                header.isPpn === true ||
                String(header.IsPpn) === "1" ||
                String(header.IsTax) === "1",
            keterangan:
                header.Keterangan || header.keterangan || header.po_memo || "",
            note: header.Note || header.note || "",
            items: details.map((d: any, idx: number) => ({
                no: d.no || idx + 1,
                kode: d.kode || d.Kode || d.pod_brg_kode || "",
                nama: d.nama || d.Nama || d.namaext || "",
                satuan: d.satuan || d.Satuan || d.pod_brg_satuan || "MTR",
                qty: Number(
                    d.jumlah ?? d.qty ?? d.Qty ?? d.QTY ?? d.pod_qty ?? 0,
                ),
                harga: Number(d.harga ?? d.Harga ?? d.pod_harga ?? 0),
                discPr: Number(
                    d.diskon ?? d.discPr ?? d.DiscPr ?? d.pod_discpr ?? 0,
                ),
                spk: d.spk || d.Spk || d.pod_spk_nomor || "",
                keterangan:
                    d.namaext ||
                    d.keterangan ||
                    d.Keterangan ||
                    d.pod_keterangan ||
                    "",
            })),
        };
    },
    submitApi: async (dataToSave) => {
        const payload = {
            ...dataToSave,
            AlamatPabrik: dataToSave.alamatPabrik,
            ppnRate: dataToSave.isPpn ? 11 : 0,
            jenisPo: 0,
            detail: dataToSave.items.map((it) => {
                const qty = Number(it.qty) || 0;
                const harga = Number(it.harga) || 0;
                const discPr = Number(it.discPr) || 0;
                const net = qty * harga * (1 - discPr / 100);
                return {
                    ...it,
                    jumlah: qty,
                    harga: harga,
                    diskon: discPr,
                    namaext: it.keterangan || it.nama,
                    mb_nomor: dataToSave.nomorPermintaan || null,
                    total: net,
                };
            }),
        };
        if (isEditMode.value) {
            return await api.put(
                `/mmt/po-bahan-mmt/${encodeURIComponent(dataToSave.nomor)}`,
                payload,
            );
        }
        return await api.post("/mmt/po-bahan-mmt", payload);
    },
    onSuccessRoute: "/mmt/finance/po-bahan",
});

// Lookup Handlers
const loadPermintaanDetail = async (mbNomor: string) => {
    if (!mbNomor) return;
    try {
        const res = await api.get(
            `/mmt/po-bahan-mmt/unfulfilled-mb-detail/${encodeURIComponent(mbNomor)}`,
        );
        const data = res.data;
        const details = data?.Detail || data?.details || [];
        if (details.length > 0) {
            formData.value.nomorPermintaan = mbNomor;
            formData.value.items = details.map((d: any, idx: number) => ({
                no: idx + 1,
                kode: d.Kode || "",
                nama: d.Nama_Bahan || d.Nama || "",
                satuan: d.Satuan || "MTR",
                qty: Number(d.Jumlah || d.Qty || 0),
                harga: Number(d.Harga || 0),
                discPr: Number(d.Diskon || 0),
                spk: d.Nomor_SPK || "",
                keterangan: d.Keterangan || "",
            }));
            if (data.Keterangan && !formData.value.keterangan) {
                formData.value.keterangan = data.Keterangan;
            }
            toast.success(`Data permintaan ${mbNomor} berhasil dimuat.`);
        } else {
            toast.warning(
                `Tidak ada item bahan yang belum di-PO pada permintaan ${mbNomor}.`,
            );
        }
    } catch (err: any) {
        console.error("Gagal load detail permintaan:", err);
        toast.error(
            err.response?.data?.message ||
                "Gagal memuat detail permintaan bahan.",
        );
    }
};

const onSelectPermintaan = (item: any) => {
    if (item && item.Nomor) {
        loadPermintaanDetail(item.Nomor);
    }
};

const onPermintaanEnter = () => {
    const no = formData.value.nomorPermintaan.trim();
    if (no) {
        loadPermintaanDetail(no);
    }
};

const onSelectSupplier = (sup: any) => {
    formData.value.supKode = sup.Kode;
    formData.value.supNama = sup.Nama;
    formData.value.supAlamat = sup.Alamat || "";
    formData.value.supKota = sup.Kota || "";
};

const pabrikList = ref<any[]>([]);

const loadPabrikList = async () => {
    try {
        const res = await api.get("/lookups/cabang-pabrik");
        pabrikList.value = res.data?.data?.items || res.data?.data || [];

        // Jika form baru dibuka dan alamatPabrik masih kosong, coba sinkronkan dengan default pabrik
        if (
            !isEditMode.value &&
            !formData.value.alamatPabrik &&
            formData.value.pabrikNama
        ) {
            const q = formData.value.pabrikNama.trim().toLowerCase();
            const match = pabrikList.value.find(
                (p: any) =>
                    (p.Kode && p.Kode.toLowerCase() === q) ||
                    (p.Nama && p.Nama.toLowerCase() === q) ||
                    (p.Nama && q.includes(p.Nama.toLowerCase())) ||
                    (p.Kode && q.includes(p.Kode.toLowerCase())),
            );
            if (match) {
                const alamat = match.Alamat || match.pab_alamat;
                if (
                    alamat &&
                    String(alamat).trim() !== "" &&
                    String(alamat).trim().toLowerCase() !== "null"
                ) {
                    formData.value.alamatPabrik = String(alamat).trim();
                }
            }
        }
    } catch (e) {
        console.error("Gagal memuat list pabrik:", e);
    }
};

const onSelectPabrik = (pab: any) => {
    formData.value.pabrikNama = pab.Nama || pab.pab_nama || pab.Kode || "";
    const alamat = pab.Alamat || pab.pab_alamat || pab.alamat;
    if (
        alamat &&
        String(alamat).trim() !== "" &&
        String(alamat).trim().toLowerCase() !== "null"
    ) {
        formData.value.alamatPabrik = String(alamat).trim();
    }
};

const onPabrikInput = () => {
    const query = formData.value.pabrikNama;
    if (!query || !pabrikList.value.length) return;
    const q = query.trim().toLowerCase();
    const match = pabrikList.value.find(
        (p: any) =>
            (p.Kode && p.Kode.toLowerCase() === q) ||
            (p.Nama && p.Nama.toLowerCase() === q) ||
            (p.Nama && q.includes(p.Nama.toLowerCase())) ||
            (p.Kode && q.includes(p.Kode.toLowerCase())),
    );
    if (match) {
        const alamat = match.Alamat || match.pab_alamat;
        if (
            alamat &&
            String(alamat).trim() !== "" &&
            String(alamat).trim().toLowerCase() !== "null"
        ) {
            formData.value.alamatPabrik = String(alamat).trim();
        }
    }
};

onMounted(() => {
    loadPabrikList();
});

const openBahanLookup = (idx: number) => {
    activeRowIndex.value = idx;
    showBahanModal.value = true;
};

const onSelectBahan = (bhn: any) => {
    if (
        activeRowIndex.value !== null &&
        formData.value.items[activeRowIndex.value]
    ) {
        const row = formData.value.items[activeRowIndex.value];
        row.kode = bhn.Kode;
        row.nama = bhn.Nama;
        row.satuan = bhn.Satuan || "MTR";
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

const addItem = () => {
    formData.value.items.push({
        no: formData.value.items.length + 1,
        kode: "",
        nama: "",
        satuan: "MTR",
        qty: 1,
        harga: 0,
        discPr: 0,
        spk: "",
        keterangan: "",
    });
};

const removeItem = (idx: number) => {
    formData.value.items.splice(idx, 1);
    formData.value.items.forEach((it, i) => (it.no = i + 1));
};

const subTotal = computed(() => {
    return formData.value.items.reduce((sum, it) => {
        const net = it.qty * it.harga * (1 - (it.discPr || 0) / 100);
        return sum + net;
    }, 0);
});

const ppnNominal = computed(() => {
    return formData.value.isPpn ? Math.round(subTotal.value * 0.11) : 0;
});

const grandTotal = computed(() => subTotal.value + ppnNominal.value);
const fmt = (v: number) =>
    new Intl.NumberFormat("id-ID").format(Math.round(v || 0));
</script>

<template>
    <BaseForm
        :title="
            isEditMode
                ? `Ubah PO Bahan MMT (${formData.nomor})`
                : 'Tambah PO Bahan MMT Baru'
        "
        menu-id="5504"
        :icon="IconShoppingCart"
        :is-loading="isLoading"
        :is-saving="isSaving"
        item-name="PO Bahan MMT"
        desktop-mode
        v-model:show-save-dialog="showSaveDialog"
        v-model:show-cancel-dialog="showCancelDialog"
        v-model:show-close-dialog="showCloseDialog"
        @validate-save="showSaveDialog = true"
        @confirm-save="executeSave"
        @confirm-cancel="executeCancel"
        @confirm-close="executeClose"
    >
        <!-- ── KOLOM KIRI (HEADER & SUPPLIER SESUAI MMT) ── -->
        <template #left-column>
            <div class="desktop-form-section header-section">
                <div class="section-label">Data Header PO</div>

                <div class="fr">
                    <label class="lbl">Nomor PO</label>
                    <input
                        :value="formData.nomor"
                        readonly
                        class="inp ro"
                        style="width: 150px"
                        placeholder="← Auto"
                    />
                </div>

                <div class="fr">
                    <label class="lbl">Tanggal PO</label>
                    <input
                        type="date"
                        v-model="formData.tanggal"
                        class="idate"
                        style="width: 150px"
                    />
                </div>

                <div class="fr">
                    <label class="lbl">Dateline Kirim</label>
                    <input
                        type="date"
                        v-model="formData.dateline"
                        class="idate"
                        style="width: 150px"
                    />
                </div>

                <!-- No. Permintaan Lookup -->
                <div class="fr">
                    <label class="lbl">No. Permintaan</label>
                    <div class="igrp flex-grow-1">
                        <input
                            v-model="formData.nomorPermintaan"
                            class="inp"
                            placeholder="Cari..."
                            @click="showPermintaanModal = true"
                            @keydown.enter.prevent="onPermintaanEnter"
                        />
                        <button
                            type="button"
                            class="blkp"
                            title="Cari Permintaan Bahan"
                            @click="showPermintaanModal = true"
                        >
                            <IconSearch :size="13" />
                        </button>
                    </div>
                </div>

                <div class="fr">
                    <label class="lbl">PPN (11%)</label>
                    <label class="ck">
                        <input type="checkbox" v-model="formData.isPpn" />
                    </label>
                </div>
            </div>

            <div class="desktop-form-section">
                <div class="section-label">Supplier & Pabrik</div>

                <!-- Supplier Lookup -->
                <div class="fr">
                    <label class="lbl">Kode Sup</label>
                    <div class="igrp" style="width: 130px">
                        <input
                            v-model="formData.supKode"
                            class="inp"
                            placeholder="Cari..."
                            @click="showSupplierModal = true"
                        />
                        <button
                            type="button"
                            class="blkp"
                            title="Cari Supplier"
                            @click="showSupplierModal = true"
                        >
                            <IconSearch :size="13" />
                        </button>
                    </div>
                </div>

                <div class="fr">
                    <label class="lbl">Supplier</label>
                    <input
                        :value="formData.supNama"
                        readonly
                        class="inp ro flex-grow-1"
                        placeholder="Otomatis dari supplier..."
                    />
                </div>

                <div class="fr">
                    <label class="lbl">Alamat</label>
                    <input
                        :value="formData.supAlamat"
                        readonly
                        class="inp ro flex-grow-1"
                        placeholder="Otomatis dari supplier..."
                    />
                </div>

                <div class="fr">
                    <label class="lbl">Kota</label>
                    <input
                        :value="formData.supKota"
                        readonly
                        class="inp ro flex-grow-1"
                        placeholder="Otomatis dari supplier..."
                    />
                </div>

                <div class="sep my-1" />

                <!-- Pabrik / Lokasi Kirim Lookup -->
                <div class="fr">
                    <label class="lbl">Kirim Ke</label>
                    <div class="igrp flex-grow-1">
                        <input
                            v-model="formData.pabrikNama"
                            class="inp"
                            placeholder="Cari..."
                            @input="onPabrikInput"
                            @click="showPabrikModal = true"
                        />
                        <button
                            type="button"
                            class="blkp"
                            title="Pilih Pabrik"
                            @click="showPabrikModal = true"
                        >
                            <IconSearch :size="13" />
                        </button>
                    </div>
                </div>

                <div class="fr">
                    <label class="lbl">Alamat Kirim</label>
                    <input
                        v-model="formData.alamatPabrik"
                        class="inp flex-grow-1"
                        placeholder="Alamat Kirim..."
                    />
                </div>

                <div class="fr">
                    <label class="lbl">Keterangan</label>
                    <input
                        v-model="formData.keterangan"
                        class="inp flex-grow-1"
                        placeholder="Keterangan..."
                    />
                </div>

                <div class="fr">
                    <label class="lbl">Note</label>
                    <textarea
                        v-model="formData.note"
                        class="ta flex-grow-1"
                        rows="2"
                        placeholder="Catatan tambahan..."
                    ></textarea>
                </div>
            </div>
        </template>

        <!-- ── KOLOM KANAN (GRID BAHAN & KALKULASI SESUAI MMT) ── -->
        <template #right-column>
            <div class="desktop-form-section d-flex flex-column h-100 pa-0">
                <div class="tbl-header">
                    <span class="tbl-title">Rincian Item Bahan MMT</span>
                    <button type="button" class="btn-add" @click="addItem">
                        <IconPlus :size="13" class="mr-1" /> Tambah Baris
                    </button>
                </div>

                <div
                    class="tbl-wrap flex-grow-1"
                    style="min-height: 280px; max-height: calc(100vh - 350px)"
                >
                    <table class="gt">
                        <thead>
                            <tr>
                                <th style="width: 35px" class="tc">No</th>
                                <th style="width: 140px">Kode Bahan</th>
                                <th>Nama Bahan</th>
                                <th style="width: 70px" class="tc">Satuan</th>
                                <th style="width: 80px" class="tr">Qty</th>
                                <th style="width: 110px" class="tr">Harga</th>
                                <th style="width: 65px" class="tr">Disc %</th>
                                <th style="width: 120px" class="tr">
                                    Subtotal
                                </th>
                                <th style="width: 130px">No. SPK</th>
                                <th style="width: 130px">Keterangan</th>
                                <th style="width: 35px" class="tc"></th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-for="(it, idx) in formData.items" :key="idx">
                                <td class="tc">{{ it.no }}</td>
                                <td class="p0">
                                    <div
                                        class="igrp w-100"
                                        style="border: none; height: 100%"
                                    >
                                        <input
                                            type="text"
                                            v-model="it.kode"
                                            class="ci"
                                            placeholder="Kode..."
                                            @click="openBahanLookup(idx)"
                                        />
                                        <button
                                            type="button"
                                            class="blkp"
                                            style="height: 100%; border: none"
                                            @click="openBahanLookup(idx)"
                                        >
                                            <IconSearch :size="11" />
                                        </button>
                                    </div>
                                </td>
                                <td class="p0">
                                    <input
                                        type="text"
                                        :value="it.nama"
                                        readonly
                                        class="ci ro"
                                        placeholder="Auto..."
                                    />
                                </td>
                                <td class="p0">
                                    <input
                                        type="text"
                                        :value="it.satuan"
                                        readonly
                                        class="ci tc ro"
                                    />
                                </td>
                                <td class="p0">
                                    <input
                                        type="number"
                                        v-model.number="it.qty"
                                        class="ci tr fw"
                                    />
                                </td>
                                <td class="p0">
                                    <input
                                        type="number"
                                        v-model.number="it.harga"
                                        class="ci tr"
                                    />
                                </td>
                                <td class="p0">
                                    <input
                                        type="number"
                                        v-model.number="it.discPr"
                                        class="ci tr"
                                    />
                                </td>
                                <td class="tr fw ro">
                                    {{
                                        fmt(
                                            it.qty *
                                                it.harga *
                                                (1 - (it.discPr || 0) / 100),
                                        )
                                    }}
                                </td>
                                <td class="p0">
                                    <div
                                        class="igrp w-100"
                                        style="border: none; height: 100%"
                                    >
                                        <input
                                            type="text"
                                            v-model="it.spk"
                                            class="ci"
                                            placeholder="SPK..."
                                            @click="openSpkLookup(idx)"
                                        />
                                        <button
                                            type="button"
                                            class="blkp"
                                            style="height: 100%; border: none"
                                            @click="openSpkLookup(idx)"
                                        >
                                            <IconSearch :size="11" />
                                        </button>
                                    </div>
                                </td>
                                <td class="p0">
                                    <input
                                        type="text"
                                        v-model="it.keterangan"
                                        class="ci"
                                        placeholder="Ket..."
                                    />
                                </td>
                                <td class="tc p0">
                                    <button
                                        type="button"
                                        class="btn-del"
                                        @click="removeItem(idx)"
                                    >
                                        <IconTrash :size="13" />
                                    </button>
                                </td>
                            </tr>
                            <tr v-if="formData.items.length === 0">
                                <td
                                    colspan="11"
                                    class="tc py-4 text-grey text-caption"
                                >
                                    Belum ada item bahan. Klik '+ Tambah Baris'
                                    di atas.
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <!-- Summary Footer Kanan Bawah -->
                <div class="summary-footer">
                    <div class="sum-item">
                        <span>Subtotal:</span>
                        <b>Rp {{ fmt(subTotal) }}</b>
                    </div>
                    <div v-if="formData.isPpn" class="sum-item">
                        <span>PPN (11%):</span>
                        <b>Rp {{ fmt(ppnNominal) }}</b>
                    </div>
                    <div class="sum-item grand">
                        <span>Grand Total:</span>
                        <b>Rp {{ fmt(grandTotal) }}</b>
                    </div>
                </div>
            </div>
        </template>
    </BaseForm>

    <!-- Modals Lookup -->
    <PermintaanBahanMmtSearchModal
        v-model="showPermintaanModal"
        @selected="onSelectPermintaan"
    />

    <SupplierSearchModal
        v-model="showSupplierModal"
        @selected="onSelectSupplier"
    />

    <PabrikSearchModal v-model="showPabrikModal" @selected="onSelectPabrik" />

    <BahanMmtSearchModal v-model="showBahanModal" @selected="onSelectBahan" />

    <SpkSearchModal v-model="showSpkModal" @selected="onSelectSpk" />
</template>

<style scoped>
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
.idate {
    height: 24px;
    border: 1px solid #ccc;
    border-radius: 3px;
    padding: 0 4px;
    font-size: 11px;
    background: white;
    outline: none;
}
.ta {
    border: 1px solid #ccc;
    border-radius: 3px;
    padding: 4px 6px;
    font-size: 11px;
    outline: none;
    font-family: inherit;
}
.ck {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 11px;
    cursor: pointer;
}
.sep {
    height: 1px;
    background: #eee;
    width: 100%;
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

/* ── Input Group Lookup ── */
.igrp {
    display: flex;
    align-items: center;
    border: 1px solid #ccc;
    border-radius: 3px;
    background: white;
    height: 24px;
    overflow: hidden;
}
.igrp .inp {
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
}
.btn-del:hover {
    color: #b71c1c;
}

/* ── Summary Footer ── */
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
}
.sum-item.grand {
    color: #1565c0;
    font-size: 12px;
}
</style>
