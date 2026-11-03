<script setup lang="ts">
import { ref, computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useToast } from "vue-toastification";
import BaseForm from "@/components/BaseForm.vue";
import { useForm } from "@/composables/useForm";
import {
    IconPackageImport,
    IconSearch,
    IconPlus,
    IconTrash,
    IconCheck,
    IconX,
} from "@tabler/icons-vue";
import api from "@/services/api";

import BahanMmtSearchModal from "@/components/lookups/BahanMmtSearchModal.vue";
import SpkSearchModal from "@/components/lookups/SpkSearchModal.vue";
import PermintaanPembelianSearchModal from "@/components/lookups/PermintaanPembelianSearchModal.vue";
import GudangMmtSearchModal from "@/components/lookups/GudangMmtSearchModal.vue";
import PabrikSearchModal from "@/components/lookups/PabrikSearchModal.vue";
import MppbLookupView from "@/modal/MppbLookupView.vue";

const route = useRoute();
const router = useRouter();
const toast = useToast();

interface DetailItem {
    no: number;
    isAcc: boolean;
    spk: string;
    namaSpk: string;
    kodeBahan: string;
    namaBahan: string;
    qty: number;
    lebar: number | string;
    panjang: number | string;
    satuan: string;
    keterangan: string;
    jumlahPo?: number;
    jumlahDatang?: number;
    nomorPo?: string;
}

interface PermintaanForm {
    nomor: string;
    tanggal: string;
    gudangKode: string;
    gudangNama: string;
    noPengajuan: string;
    noMppb: string;
    jenis: string;
    kepada: string;
    pabrikKode: string;
    pabrikNama: string;
    cabang: string;
    priority: string;
    keteranganHeader: string;
    statusAccSpv: string;
    accSpvUser: string;
    statusAccManager: string;
    accManagerUser: string;
    items: DetailItem[];
}

const createEmptyDetail = (no = 1): DetailItem => ({
    no,
    isAcc: true,
    spk: "",
    namaSpk: "",
    kodeBahan: "",
    namaBahan: "",
    qty: 1,
    lebar: 0,
    panjang: 0,
    satuan: "ROLL",
    keterangan: "",
    jumlahPo: 0,
    jumlahDatang: 0,
    nomorPo: "",
});

const initialData: PermintaanForm = {
    nomor: "AUTO",
    tanggal: new Date().toISOString().substring(0, 10),
    gudangKode: "",
    gudangNama: "",
    noPengajuan: "",
    noMppb: "",
    jenis: "",
    kepada: "",
    pabrikKode: "",
    pabrikNama: "",
    cabang: "",
    priority: "",
    keteranganHeader: "",
    statusAccSpv: "N",
    accSpvUser: "",
    statusAccManager: "N",
    accManagerUser: "",
    items: [createEmptyDetail(1)],
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
const showPengajuanModal = ref(false);
const showMppbModal = ref(false);
const showGudangModal = ref(false);
const showPabrikModal = ref(false);
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
} = useForm<PermintaanForm>({
    menuId: "5532",
    initialData,
    fetchApi: async () => {
        const nomor = route.params.nomor || route.query.nomor;
        if (!nomor) return { ...initialData };

        const res = await api.get(
            `/mmt/bahan-baku-produksi/permintaan-bahan/${encodeURIComponent(String(nomor))}`,
        );
        const data = res.data?.data || res.data;
        if (!data) return { ...initialData };

        const details = data.Detail || data.detail || [];

        return {
            nomor: data.Nomor || String(nomor),
            tanggal: toDateInputValue(data.Tanggal) || initialData.tanggal,
            gudangKode: data.Gudang_Asal_Kode || data.mb_gdg_kode || "",
            gudangNama: data.Gudang_Asal_Nama || "",
            noPengajuan: data.NoPengajuan || data.mb_pp_nomor || "",
            noMppb: data.NoMPPB || "",
            jenis: data.Jenis || "Bahan Baku",
            kepada: data.Kepada || data.mb_to_user || "Purchasing",
            pabrikKode: data.PabrikKode || "",
            pabrikNama:
                data.Cabang ||
                data.To_Cabang ||
                data.mb_to_cab ||
                "HEAD OFFICE",
            cabang:
                data.Cabang ||
                data.To_Cabang ||
                data.mb_to_cab ||
                "HEAD OFFICE",
            priority: data.Priority || data.mb_priority || "Urgent",
            keteranganHeader: data.Keterangan || data.mb_keterangan || "",
            statusAccSpv: data.Req_ACC || data.mb_acc_req || "N",
            accSpvUser: data.Req_ACC_User || data.mb_acc_req_user || "",
            statusAccManager: data.ACC || data.mb_acc || "N",
            accManagerUser: data.Acc_User || data.mb_acc_user || "",
            items:
                details.length > 0
                    ? details.map((d: any, idx: number) => ({
                          no: idx + 1,
                          isAcc: d.Is_Acc !== "N" && d.mbd_acc !== "N",
                          spk: d.Nomor_SPK || d.mbd_spk_nomor || d.spk || "",
                          namaSpk: d.spk_nama || "",
                          kodeBahan:
                              d.Kode ||
                              d.mbd_brg_kode ||
                              d.Kode_Bahan ||
                              d.kode ||
                              "",
                          namaBahan: d.Nama_Bahan || d.brg_nama || d.nama || "",
                          qty: Number(d.Jumlah ?? d.mbd_qty ?? d.qty ?? 1),
                          lebar: d.Lebar ?? d.brg_lebar ?? 0,
                          panjang: d.Panjang ?? d.brg_panjang ?? 0,
                          satuan: d.Satuan || d.mbd_brg_satuan || "ROLL",
                          keterangan:
                              d.KeteranganItem ||
                              d.mbd_keterangan ||
                              d.Keterangan ||
                              "",
                          jumlahPo: Number(d.Jumlah_PO ?? d.mbd_qty_po ?? 0),
                          jumlahDatang: Number(
                              d.Jumlah_Datang ?? d.mbd_qty_datang ?? 0,
                          ),
                          nomorPo: d.Nomor_PO || "",
                      }))
                    : [createEmptyDetail(1)],
        };
    },
    submitApi: async (dataToSave) => {
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
            Kepada: dataToSave.kepada,
            Cabang: dataToSave.cabang || dataToSave.pabrikNama,
            PabrikKode: dataToSave.pabrikKode,
            Priority: dataToSave.priority,
            Keterangan: dataToSave.keteranganHeader,
            NoPengajuan: dataToSave.noPengajuan || null,
            NoMPPB: dataToSave.noMppb || null,
            AccSpv: dataToSave.statusAccSpv === "Y" ? "Y" : "N",
            AccSpvUser: dataToSave.accSpvUser || null,
            Detail: validItems.map((it) => ({
                SPK: it.spk || null,
                SKU: it.kodeBahan,
                Satuan: it.satuan,
                QTY: it.qty,
                Panjang: Number(it.panjang) || 0,
                Lebar: Number(it.lebar) || 0,
                KeteranganItem: it.keterangan,
                IsAcc: it.isAcc ? "Y" : "N",
            })),
        };

        if (isEditMode.value) {
            await api.put(
                `/mmt/bahan-baku-produksi/permintaan-bahan/${encodeURIComponent(dataToSave.nomor)}`,
                payload,
            );
        } else {
            await api.post(
                "/mmt/bahan-baku-produksi/permintaan-bahan",
                payload,
            );
        }
    },
});

// Logika Kunci jika sudah di-ACC Manager (sesuai sistem MMT)
const isLocked = computed(() => {
    if (formData.value.nomor === "AUTO") return false;
    return (
        formData.value.statusAccManager === "Y" &&
        formData.value.accManagerUser !== "" &&
        formData.value.accManagerUser !== "-"
    );
});

// ==========================================
// LOOKUP HANDLERS
// ==========================================
const onSelectGudang = (g: { Kode: string; Nama: string }) => {
    const hasItems = formData.value.items.some((d) => d.kodeBahan !== "");
    if (hasItems && formData.value.gudangKode !== g.Kode) {
        if (
            !confirm(
                "Gudang diubah, daftar barang sebelumnya mungkin tidak sesuai dengan master bahan gudang ini. Kosongkan daftar barang?",
            )
        ) {
            showGudangModal.value = false;
            return;
        }
        formData.value.items = [createEmptyDetail(1)];
    }
    formData.value.gudangKode = g.Kode;
    formData.value.gudangNama = g.Nama;
    showGudangModal.value = false;
};

const onSelectPabrik = (pabrik: { Kode: string; Nama: string }) => {
    formData.value.pabrikKode = pabrik.Kode;
    formData.value.pabrikNama = pabrik.Nama;
    formData.value.cabang = pabrik.Nama;
    showPabrikModal.value = false;
};

const onSelectPengajuan = (pengajuan: any) => {
    if (!pengajuan) return;
    if (pengajuan.Status_Proses === "CLOSE") {
        toast.warning(
            `Dokumen Pengajuan ${pengajuan.Nomor} sudah diproses (Status CLOSE) dan tidak dapat diambil kembali.`,
        );
        return;
    }
    formData.value.noPengajuan = pengajuan.Nomor;
    formData.value.noMppb = ""; // Reset MPPB jika memilih pengajuan

    if (pengajuan.Keterangan) {
        formData.value.keteranganHeader = `Ref Pengajuan: ${pengajuan.Nomor}. ${pengajuan.Keterangan}`;
    } else {
        formData.value.keteranganHeader = `Ref Pengajuan: ${pengajuan.Nomor}.`;
    }
    if (pengajuan.Priority) formData.value.priority = pengajuan.Priority;
    if (pengajuan.Ditujukan_Ke) formData.value.kepada = pengajuan.Ditujukan_Ke;
    if (pengajuan.Jenis) formData.value.jenis = pengajuan.Jenis;

    // Tarik item detail
    if (Array.isArray(pengajuan.Detail) && pengajuan.Detail.length > 0) {
        formData.value.items = pengajuan.Detail.map((d: any, idx: number) => ({
            no: idx + 1,
            isAcc: pengajuan.Status_Acc === "Y",
            spk: d.Nomor_SPK || d.spk || "",
            namaSpk: d.spk_nama || d.Nama_SPK || "",
            kodeBahan: d.Kode_Bahan || d.Kode || "",
            namaBahan: d.Nama_Bahan || d.Nama || "",
            qty: Number(d.Jumlah || d.Qty || d.qty || 1),
            lebar: d.Lebar || 0,
            panjang: d.Panjang || 0,
            satuan: d.Satuan || "ROLL",
            keterangan: d.KeteranganItem || d.Keterangan || "",
            jumlahPo: 0,
            jumlahDatang: 0,
            nomorPo: "",
        }));
        toast.info(
            `Berhasil memuat ${pengajuan.Detail.length} item dari Pengajuan ${pengajuan.Nomor}.`,
        );
    }
    showPengajuanModal.value = false;
};

const clearPengajuan = () => {
    formData.value.noPengajuan = "";
    formData.value.items = [createEmptyDetail(1)];
};

const parseUkuran = (ukuranStr: string | null | number) => {
    let panjang = 0;
    let lebar = 0;
    if (ukuranStr) {
        const str = String(ukuranStr).toLowerCase().trim();
        if (str.includes("x")) {
            const parts = str.split("x");
            panjang = Number(parts[0]) || 0;
            lebar = Number(parts[1]) || 0;
        } else {
            panjang = Number(str) || 0;
        }
    }
    return { panjang, lebar };
};

const onSelectMppb = async (mppb: any) => {
    if (!mppb) return;
    formData.value.noMppb = mppb.nomor || mppb.Nomor || "";
    formData.value.noPengajuan = ""; // Reset pengajuan jika memilih MPPB

    formData.value.keteranganHeader = `Ref MPPB: ${formData.value.noMppb}. ${mppb.keterangan || mppb.Keterangan || ""}`;
    formData.value.kepada = "Purchasing";
    formData.value.jenis = "Bahan Baku";

    try {
        const res = await api.get(`/mmt/mppb/${formData.value.noMppb}`);
        const data = res.data?.data || res.data;
        const isApproved = data.Approve === "Y" || mppb.approve === "Y";

        if (Array.isArray(data.Detail) && data.Detail.length > 0) {
            formData.value.items = data.Detail.map((item: any, idx: number) => {
                const ukuranRaw =
                    item.Lebar ||
                    item.mpb_ukuran ||
                    data.mpb_ukuran ||
                    mppb.ukuran ||
                    "";
                const dim = parseUkuran(ukuranRaw);

                return {
                    no: idx + 1,
                    isAcc: isApproved,
                    spk: item.Nomor_SPK || data.spk || mppb.spk || "",
                    namaSpk: item.Nama_SPK || "",
                    kodeBahan: item.Kode || item.mpb_bahan || mppb.bahan || "",
                    namaBahan:
                        item.Nama_Bahan ||
                        item.mpb_nama ||
                        mppb.nama_produk ||
                        "",
                    qty: Number(
                        item.Jumlah || item.mpb_jmlorder || mppb.qty_order || 1,
                    ),
                    lebar: dim.lebar,
                    panjang: dim.panjang,
                    satuan: item.Satuan || "MTR",
                    keterangan:
                        item.Keterangan ||
                        item.mpb_ket ||
                        mppb.keterangan ||
                        "",
                    jumlahPo: 0,
                    jumlahDatang: 0,
                    nomorPo: "",
                };
            });
        } else {
            const ukuranRaw = data.mpb_ukuran || mppb.ukuran || "";
            const dim = parseUkuran(ukuranRaw);

            formData.value.items = [
                {
                    no: 1,
                    isAcc: isApproved,
                    spk: mppb.spk || data.spk || "",
                    namaSpk: "",
                    kodeBahan: mppb.bahan || data.mpb_bahan || "",
                    namaBahan: mppb.nama_produk || data.mpb_nama || "",
                    qty: Number(mppb.qty_order || data.mpb_jmlorder || 1),
                    lebar: dim.lebar,
                    panjang: dim.panjang,
                    satuan: "MTR",
                    keterangan: mppb.keterangan || data.Keterangan || "",
                    jumlahPo: 0,
                    jumlahDatang: 0,
                    nomorPo: "",
                },
            ];
        }
        toast.success(
            `Berhasil menarik data dari MPPB ${formData.value.noMppb}.`,
        );
    } catch (error: any) {
        console.error("Gagal menarik detail MPPB:", error);
        const dim = parseUkuran(mppb.ukuran);
        formData.value.items = [
            {
                no: 1,
                isAcc: mppb.approve === "Y",
                spk: mppb.spk || "",
                namaSpk: "",
                kodeBahan: mppb.bahan || "",
                namaBahan: mppb.nama_produk || "",
                qty: Number(mppb.qty_order || 1),
                lebar: dim.lebar,
                panjang: dim.panjang,
                satuan: "MTR",
                keterangan: mppb.keterangan || "",
                jumlahPo: 0,
                jumlahDatang: 0,
                nomorPo: "",
            },
        ];
        toast.info(
            `Berhasil menarik data ringkasan MPPB ${formData.value.noMppb}.`,
        );
    }
    showMppbModal.value = false;
};

const clearMppb = () => {
    formData.value.noMppb = "";
    formData.value.items = [createEmptyDetail(1)];
};

const openBahanLookup = (idx: number) => {
    if (isLocked.value) return;
    activeRowIndex.value = idx;
    showBahanModal.value = true;
};

const onSelectBahan = (b: any) => {
    if (
        activeRowIndex.value !== null &&
        formData.value.items[activeRowIndex.value]
    ) {
        const isDuplicate = formData.value.items.some(
            (d, i) =>
                (d.kodeBahan === b.Kode || d.kodeBahan === b.brg_kode) &&
                i !== activeRowIndex.value,
        );
        if (isDuplicate) {
            toast.warning(
                `Bahan ${b.Kode || b.brg_kode} sudah ada dalam daftar.`,
            );
            return;
        }

        const row = formData.value.items[activeRowIndex.value];
        row.kodeBahan = b.Kode || b.brg_kode || "";
        row.namaBahan = b.Nama || b.brg_nama || "";
        row.satuan = b.Satuan || b.brg_satuan || "ROLL";
        row.panjang = b.Panjang || b.brg_panjang || 0;
        row.lebar = b.Lebar || b.brg_lebar || 0;
        if (!row.qty || row.qty === 0) row.qty = 1;

        // Auto add row jika baris terakhir terisi (perilaku praktis MMT)
        if (activeRowIndex.value === formData.value.items.length - 1) {
            addItem();
        }
    }
    showBahanModal.value = false;
};

const openSpkLookup = (idx: number) => {
    if (isLocked.value) return;
    activeRowIndex.value = idx;
    showSpkModal.value = true;
};

const onSelectSpk = (spk: any) => {
    if (
        activeRowIndex.value !== null &&
        formData.value.items[activeRowIndex.value]
    ) {
        const row = formData.value.items[activeRowIndex.value];
        row.spk = spk.Nomor || spk.Spk || spk.spk_nomor || "";
        row.namaSpk = spk.Nama || spk.spk_nama || "";
    }
    showSpkModal.value = false;
};

const addItem = () => {
    if (isLocked.value) return;
    formData.value.items.push(
        createEmptyDetail(formData.value.items.length + 1),
    );
};

const removeItem = (idx: number) => {
    if (isLocked.value) return;
    if (formData.value.items.length <= 1) {
        formData.value.items[0] = createEmptyDetail(1);
        return;
    }
    formData.value.items.splice(idx, 1);
    formData.value.items.forEach((it, i) => (it.no = i + 1));
};

const handleApprove = async (role: "SPV" | "MANAGER") => {
    if (
        role === "MANAGER" &&
        (!formData.value.statusAccSpv || formData.value.statusAccSpv !== "Y")
    ) {
        toast.warning(
            "Manager tidak dapat melakukan ACC sebelum SPV menyetujui.",
        );
        return;
    }

    if (
        !confirm(
            `Lakukan ACC ${role} untuk permintaan nomor ${formData.value.nomor}?`,
        )
    )
        return;
    isApproving.value = true;
    try {
        await api.post("/mmt/bahan-baku-produksi/permintaan-bahan/approve", {
            nomor: formData.value.nomor,
            role,
        });
        toast.success(`Permintaan berhasil di-ACC oleh ${role}!`);
        if (role === "SPV") {
            formData.value.statusAccSpv = "Y";
            formData.value.accSpvUser = "ACC";
        } else {
            formData.value.statusAccManager = "Y";
            formData.value.accManagerUser = "ACC";
        }
    } catch (err: any) {
        toast.error(err.response?.data?.message || `Gagal ACC ${role}.`);
    } finally {
        isApproving.value = false;
    }
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
                ? `Ubah Purchase Request (PR) (${formData.nomor})`
                : 'Tambah Purchase Request (PR) Baru'
        "
        menu-id="5532"
        :icon="IconPackageImport"
        :is-loading="isLoading"
        :is-saving="isSaving"
        item-name="Purchase Request (PR)"
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
         ── KOLOM KIRI (SIDEBAR UNTUK HEADER, TUJUAN & KETERANGAN) ──
         ══════════════════════════════════════════════════════════ -->
        <template #left-column>
            <!-- Section 1: Data Header Transaksi -->
            <div class="desktop-form-section header-section">
                <div class="section-label">Data Header Transaksi</div>

                <!-- Nomor Transaksi -->
                <div class="fr">
                    <label class="lbl">Nomor Transaksi</label>
                    <input
                        :value="formData.nomor"
                        readonly
                        class="inp ro fw flex-grow-1"
                        placeholder="AUTO"
                    />
                </div>

                <!-- Tanggal Transaksi -->
                <div class="fr">
                    <label class="lbl">Tanggal</label>
                    <input
                        type="date"
                        v-model="formData.tanggal"
                        class="idate flex-grow-1"
                        :readonly="isLocked"
                        required
                    />
                </div>

                <!-- Untuk Gudang (Lookup GudangMmtSearchModal) -->
                <div class="fr">
                    <label class="lbl">Untuk Gudang</label>
                    <div class="igrp flex-grow-1">
                        <input
                            type="text"
                            :value="formData.gudangKode"
                            class="inp ro fw text-primary"
                            style="max-width: 85px"
                            readonly
                            placeholder="Cari..."
                            @click="!isLocked && (showGudangModal = true)"
                        />
                        <input
                            type="text"
                            :value="formData.gudangNama"
                            class="inp ro flex-grow-1"
                            readonly
                            placeholder=""
                            @click="!isLocked && (showGudangModal = true)"
                        />
                        <button
                            type="button"
                            class="blkp"
                            @click="!isLocked && (showGudangModal = true)"
                            :disabled="isLocked"
                            title="Pilih Gudang"
                        >
                            <IconSearch :size="13" />
                        </button>
                    </div>
                </div>

                <!-- Ambil Dari Pengajuan (Persiapan) -->
                <div class="fr">
                    <label class="lbl">Ambil Pengajuan (Persiapan)</label>
                    <div class="igrp flex-grow-1">
                        <input
                            type="text"
                            :value="formData.noPengajuan"
                            class="inp ro fw text-orange-darken-3"
                            readonly
                            placeholder="Cari..."
                            @click="
                                !isLocked &&
                                !formData.noMppb &&
                                (showPengajuanModal = true)
                            "
                            :disabled="
                                isEditMode || isLocked || !!formData.noMppb
                            "
                        />
                        <button
                            v-if="
                                formData.noPengajuan && !isEditMode && !isLocked
                            "
                            type="button"
                            class="blkp text-danger"
                            @click.stop="clearPengajuan"
                            title="Hapus referensi Pengajuan"
                        >
                            <IconX :size="13" />
                        </button>
                        <button
                            v-else
                            type="button"
                            class="blkp"
                            @click="
                                !isLocked &&
                                !formData.noMppb &&
                                (showPengajuanModal = true)
                            "
                            :disabled="
                                isEditMode || isLocked || !!formData.noMppb
                            "
                            title="Cari Dokumen Pengajuan Permintaan"
                        >
                            <IconSearch :size="13" />
                        </button>
                    </div>
                </div>

                <!-- Ambil Dari MPPB (Memo Bahan) -->
                <div class="fr">
                    <label class="lbl">Ambil MPPB (Memo Bahan)</label>
                    <div class="igrp flex-grow-1">
                        <input
                            type="text"
                            :value="formData.noMppb"
                            class="inp ro fw text-blue-darken-3"
                            readonly
                            placeholder="Cari..."
                            @click="
                                !isLocked &&
                                !formData.noPengajuan &&
                                (showMppbModal = true)
                            "
                            :disabled="
                                isEditMode || isLocked || !!formData.noPengajuan
                            "
                        />
                        <button
                            v-if="formData.noMppb && !isEditMode && !isLocked"
                            type="button"
                            class="blkp text-danger"
                            @click.stop="clearMppb"
                            title="Hapus referensi MPPB"
                        >
                            <IconX :size="13" />
                        </button>
                        <button
                            v-else
                            type="button"
                            class="blkp"
                            @click="
                                !isLocked &&
                                !formData.noPengajuan &&
                                (showMppbModal = true)
                            "
                            :disabled="
                                isEditMode || isLocked || !!formData.noPengajuan
                            "
                            title="Cari Dokumen MPPB"
                        >
                            <IconSearch :size="13" />
                        </button>
                    </div>
                </div>

                <!-- Jenis Permintaan (Bahan Baku, Sparepart, ATK) -->
                <div class="fr">
                    <label class="lbl">Jenis</label>
                    <select
                        v-model="formData.jenis"
                        class="inp flex-grow-1"
                        :disabled="isLocked"
                    >
                        <option value="Bahan Baku">Bahan Baku</option>
                        <option value="Sparepart">Sparepart</option>
                        <option value="ATK">ATK</option>
                    </select>
                </div>
            </div>

            <!-- Section 2: Tujuan & Keterangan -->
            <div class="desktop-form-section">
                <div class="section-label">Tujuan & Keterangan</div>

                <!-- Kepada (Purchasing, Gudang, GA) -->
                <div class="fr">
                    <label class="lbl">Kepada</label>
                    <select
                        v-model="formData.kepada"
                        class="inp flex-grow-1"
                        :disabled="isLocked"
                    >
                        <option value="Purchasing">Purchasing</option>
                        <option value="Gudang">Gudang</option>
                        <option value="GA">GA</option>
                    </select>
                </div>

                <!-- Pilih Tujuan (Pabrik / Cabang Lookup) -->
                <div class="fr">
                    <label class="lbl">Pilih Tujuan (Pabrik)</label>
                    <div class="igrp flex-grow-1">
                        <input
                            type="text"
                            :value="formData.pabrikNama || formData.cabang"
                            class="inp ro fw flex-grow-1"
                            readonly
                            placeholder="Cari..."
                            @click="!isLocked && (showPabrikModal = true)"
                        />
                        <button
                            type="button"
                            class="blkp"
                            @click="!isLocked && (showPabrikModal = true)"
                            :disabled="isLocked"
                            title="Pilih Pabrik"
                        >
                            <IconSearch :size="13" />
                        </button>
                    </div>
                </div>

                <!-- Priority (Urgent, Top Urgent) -->
                <div class="fr">
                    <label class="lbl">Priority</label>
                    <select
                        v-model="formData.priority"
                        class="inp fw flex-grow-1"
                        :disabled="isLocked"
                    >
                        <option value="Urgent">Urgent</option>
                        <option value="Top Urgent">Top Urgent</option>
                    </select>
                </div>

                <!-- Keterangan Header -->
                <div class="fr align-start">
                    <label class="lbl" style="padding-top: 4px"
                        >Keterangan Header</label
                    >
                    <textarea
                        v-model="formData.keteranganHeader"
                        class="ta flex-grow-1"
                        rows="3"
                        :readonly="isLocked"
                        placeholder="Catatan umum transaksi permintaan..."
                    ></textarea>
                </div>
            </div>

            <!-- Section 3: Status Approval & Total Ringkasan -->
            <div class="desktop-form-section">
                <div class="section-label">Status Approval & Ringkasan</div>

                <!-- Status Approval -->
                <div class="fr align-center">
                    <label class="lbl">Approval</label>
                    <div
                        class="d-flex align-center gap-2 flex-wrap flex-grow-1"
                    >
                        <v-chip
                            size="x-small"
                            :color="
                                formData.statusAccSpv === 'Y'
                                    ? 'success'
                                    : 'warning'
                            "
                            class="font-weight-bold"
                        >
                            {{
                                formData.statusAccSpv === "Y"
                                    ? `SPV: ${formData.accSpvUser || "ACC"}`
                                    : "SPV: Pending"
                            }}
                        </v-chip>
                        <v-btn
                            v-if="isEditMode && formData.statusAccSpv !== 'Y'"
                            size="x-small"
                            color="primary"
                            variant="flat"
                            :loading="isApproving"
                            @click="handleApprove('SPV')"
                        >
                            <v-icon :icon="IconCheck" size="13" class="mr-1" />
                            ACC SPV
                        </v-btn>

                        <v-chip
                            size="x-small"
                            :color="
                                formData.statusAccManager === 'Y'
                                    ? 'success'
                                    : 'grey-darken-1'
                            "
                            class="font-weight-bold"
                        >
                            {{
                                formData.statusAccManager === "Y"
                                    ? `MGR: ${formData.accManagerUser || "ACC"}`
                                    : "MGR: Pending"
                            }}
                        </v-chip>
                        <v-btn
                            v-if="
                                isEditMode &&
                                formData.statusAccSpv === 'Y' &&
                                formData.statusAccManager !== 'Y'
                            "
                            size="x-small"
                            color="secondary"
                            variant="flat"
                            :loading="isApproving"
                            @click="handleApprove('MANAGER')"
                        >
                            <v-icon :icon="IconCheck" size="13" class="mr-1" />
                            ACC MGR
                        </v-btn>
                    </div>
                </div>

                <!-- Total Qty Minta Card -->
                <div class="total-summary-card mt-3">
                    <span class="total-label">TOTAL QTY MINTA:</span>
                    <span class="total-value">{{ totalQty.toFixed(2) }}</span>
                </div>
            </div>
        </template>

        <!-- ══════════════════════════════════════════════════════════
         ── KOLOM KANAN (AREA UTAMA: GRID TABEL LIST INPUTAN BARANG) ──
         ══════════════════════════════════════════════════════════ -->
        <template #right-column>
            <div class="desktop-form-section d-flex flex-column h-100 pa-0">
                <!-- Table Header Bar Khas Manksi -->
                <div class="tbl-header">
                    <span class="tbl-title"
                        >Rincian Barang / Bahan yang Diminta</span
                    >
                    <button
                        v-if="!isLocked"
                        type="button"
                        class="btn-add"
                        @click="addItem"
                        title="Tambah Baris Baru"
                    >
                        <IconPlus :size="13" class="mr-1" /> Tambah Baris
                    </button>
                </div>

                <!-- Table Scroll Container -->
                <div
                    class="tbl-wrap flex-grow-1"
                    style="min-height: 340px; max-height: calc(100vh - 250px)"
                >
                    <table class="gt">
                        <thead>
                            <tr>
                                <th style="width: 35px" class="tc">No</th>
                                <th style="width: 44px" class="tc">ACC</th>
                                <th style="width: 140px">Nomor SPK</th>
                                <th style="min-width: 150px">Nama SPK</th>
                                <th style="width: 130px">Kode Bahan</th>
                                <th style="min-width: 200px">Nama Bahan</th>
                                <th style="width: 85px" class="tr">Jumlah</th>
                                <th style="width: 70px" class="tc">Lebar</th>
                                <th style="width: 70px" class="tc">Panjang</th>
                                <th style="width: 75px" class="tc">Satuan</th>
                                <th
                                    v-if="isEditMode"
                                    style="width: 75px"
                                    class="tr"
                                >
                                    Di PO
                                </th>
                                <th
                                    v-if="isEditMode"
                                    style="width: 75px"
                                    class="tr"
                                >
                                    Diterima
                                </th>
                                <th style="min-width: 150px">Keterangan</th>
                                <th
                                    v-if="!isLocked"
                                    style="width: 40px"
                                    class="tc"
                                >
                                    Aksi
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-for="(it, idx) in formData.items" :key="idx">
                                <!-- 1. No -->
                                <td class="tc text-caption text-grey">
                                    {{ idx + 1 }}
                                </td>

                                <!-- 2. ACC Checkbox -->
                                <td class="tc">
                                    <input
                                        type="checkbox"
                                        v-model="it.isAcc"
                                        :disabled="isLocked"
                                        class="cursor-pointer"
                                        title="Status Persetujuan Item"
                                    />
                                </td>

                                <!-- 3. Nomor SPK Lookup -->
                                <td class="p0">
                                    <div class="igrp border-0">
                                        <input
                                            type="text"
                                            v-model="it.spk"
                                            class="ci"
                                            :readonly="isLocked"
                                            placeholder="Pilih SPK..."
                                            @click="openSpkLookup(idx)"
                                        />
                                        <button
                                            v-if="!isLocked"
                                            type="button"
                                            class="blkp"
                                            @click="openSpkLookup(idx)"
                                            title="Cari SPK"
                                        >
                                            <IconSearch :size="12" />
                                        </button>
                                    </div>
                                </td>

                                <!-- 4. Nama SPK -->
                                <td class="p0">
                                    <input
                                        type="text"
                                        v-model="it.namaSpk"
                                        class="ci text-grey-darken-2"
                                        :readonly="isLocked"
                                        placeholder="Nama SPK..."
                                    />
                                </td>

                                <!-- 5. Kode Bahan Lookup -->
                                <td class="p0">
                                    <div class="igrp border-0">
                                        <input
                                            type="text"
                                            v-model="it.kodeBahan"
                                            class="ci fw"
                                            :class="{
                                                'item-struck': !it.isAcc,
                                            }"
                                            :readonly="isLocked"
                                            placeholder="Kode..."
                                            @click="openBahanLookup(idx)"
                                        />
                                        <button
                                            v-if="!isLocked"
                                            type="button"
                                            class="blkp"
                                            @click="openBahanLookup(idx)"
                                            title="Cari Master Bahan"
                                        >
                                            <IconSearch :size="12" />
                                        </button>
                                    </div>
                                </td>

                                <!-- 6. Nama Bahan -->
                                <td class="p0">
                                    <input
                                        type="text"
                                        v-model="it.namaBahan"
                                        class="ci"
                                        :class="{ 'item-struck': !it.isAcc }"
                                        :readonly="isLocked"
                                        placeholder="Nama Bahan..."
                                    />
                                </td>

                                <!-- 7. Jumlah QTY -->
                                <td class="p0">
                                    <input
                                        type="number"
                                        v-model.number="it.qty"
                                        min="0.01"
                                        step="any"
                                        :readonly="isLocked"
                                        class="ci tr fw"
                                    />
                                </td>

                                <!-- 8. Lebar -->
                                <td class="p0">
                                    <input
                                        type="text"
                                        v-model="it.lebar"
                                        :readonly="isLocked"
                                        class="ci tc"
                                        placeholder="0"
                                    />
                                </td>

                                <!-- 9. Panjang -->
                                <td class="p0">
                                    <input
                                        type="text"
                                        v-model="it.panjang"
                                        :readonly="isLocked"
                                        class="ci tc"
                                        placeholder="0"
                                    />
                                </td>

                                <!-- 10. Satuan -->
                                <td class="p0">
                                    <input
                                        type="text"
                                        v-model="it.satuan"
                                        :readonly="isLocked"
                                        class="ci tc"
                                        placeholder="Satuan"
                                    />
                                </td>

                                <!-- 11. Di PO (Khusus mode edit) -->
                                <td
                                    v-if="isEditMode"
                                    class="tr text-caption text-grey-darken-2"
                                >
                                    {{ it.jumlahPo || 0 }}
                                </td>

                                <!-- 12. Diterima (Khusus mode edit) -->
                                <td
                                    v-if="isEditMode"
                                    class="tr text-caption text-grey-darken-2"
                                >
                                    {{ it.jumlahDatang || 0 }}
                                </td>

                                <!-- 13. Keterangan Item -->
                                <td class="p0">
                                    <input
                                        type="text"
                                        v-model="it.keterangan"
                                        :readonly="isLocked"
                                        class="ci"
                                        placeholder="Keterangan item..."
                                    />
                                </td>

                                <!-- 14. Aksi Hapus -->
                                <td v-if="!isLocked" class="tc">
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

                <!-- Summary Footer Bar Khas Manksi -->
                <div class="summary-footer">
                    <div class="sum-item">
                        <span>Total Item:</span>
                        <strong>{{
                            formData.items.filter((it) => it.kodeBahan).length
                        }}</strong>
                        baris
                    </div>
                    <div class="sum-item grand">
                        <span>Total QTY Minta:</span>
                        <strong>{{ totalQty.toFixed(2) }}</strong>
                    </div>
                </div>
            </div>
        </template>
    </BaseForm>

    <!-- ══════════════════════════════════════════════════════════
     ── MODAL LOOKUP SESUAI SISTEM MMT (DI LUAR BASEFORM) ──
     ══════════════════════════════════════════════════════════ -->
    <GudangMmtSearchModal
        v-model="showGudangModal"
        @selected="onSelectGudang"
    />

    <PabrikSearchModal v-model="showPabrikModal" @selected="onSelectPabrik" />

    <PermintaanPembelianSearchModal
        v-model="showPengajuanModal"
        @selected="onSelectPengajuan"
    />

    <MppbLookupView v-model:is-visible="showMppbModal" @select="onSelectMppb" />

    <BahanMmtSearchModal v-model="showBahanModal" @selected="onSelectBahan" />

    <SpkSearchModal v-model="showSpkModal" @selected="onSelectSpk" />
</template>

<style scoped>
/* =========================================================
   SIDEBAR & FORM STYLING KHAS MANKSI WEB
========================================================= */
.desktop-form-section {
    padding: 14px 16px;
    border: 1px solid #e0e0e0;
    border-radius: 8px;
    background-color: white !important;
    margin-bottom: 12px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.header-section {
    border-top: 3px solid #1976d2 !important;
}

.section-label {
    font-size: 11px;
    font-weight: 700;
    color: #1976d2;
    text-transform: uppercase;
    margin-bottom: 10px;
    border-bottom: 1px solid #e0e0e0;
    padding-bottom: 4px;
    letter-spacing: 0.3px;
}

.fr {
    display: flex;
    align-items: center;
    margin-bottom: 8px;
    gap: 8px;
}

.lbl {
    width: 125px;
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

.inp:focus:not(:read-only):not(:disabled),
.idate:focus:not(:read-only):not(:disabled),
.ta:focus:not(:read-only):not(:disabled) {
    border-color: #1976d2;
}

.ro {
    background: #f5f5f5 !important;
    color: #555 !important;
    cursor: pointer;
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
    resize: vertical;
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

.igrp.border-0 {
    border: none;
    height: 26px;
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

.blkp:hover:not(:disabled) {
    background: #e0e0e0;
    color: #1565c0;
}

.blkp:disabled {
    opacity: 0.6;
    cursor: not-allowed;
}

/* ── Total Summary Card di Sidebar ── */
.total-summary-card {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px 12px;
    background: #e3f2fd;
    border: 1px solid #bbdefb;
    border-radius: 4px;
}

.total-label {
    font-size: 11px;
    font-weight: 700;
    color: #1565c0;
}

.total-value {
    font-size: 15px;
    font-weight: 800;
    color: #0d47a1;
}

/* =========================================================
   GRID TABEL LIST INPUTAN (KANAN) KHAS MANKSI WEB
========================================================= */
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
    transition: background 0.15s;
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
    padding: 3px 4px;
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

.ci:focus:not(:read-only) {
    background: #e3f2fd;
}

.item-struck {
    text-decoration: line-through;
    color: #dc2626 !important;
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

.cursor-pointer {
    cursor: pointer;
}
</style>
