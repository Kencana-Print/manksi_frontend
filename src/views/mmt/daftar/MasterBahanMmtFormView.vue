<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useRoute } from "vue-router";
import BaseForm from "@/components/BaseForm.vue";
import { useForm } from "@/composables/useForm";
import { IconTexture, IconSearch } from "@tabler/icons-vue";
import api from "@/services/api";
import SupplierSearchModal from "@/components/lookups/SupplierSearchModal.vue";
import GudangMmtSearchModal from "@/components/lookups/GudangMmtSearchModal.vue";

const route = useRoute();

interface MasterBahanForm {
    Kode: string;
    Nama: string;
    Satuan: string;
    Gramasi: string;
    Panjang: number;
    Lebar: number;
    KtgKode: string;
    GdgDefault: string;
    GdgNama: string;
    SupKode: string;
    SupNama: string;
    HrgJual: number;
    HrgBeli: number;
    isAktif: boolean;
    isStok: boolean;
    isExpired: boolean;
    Status: string;
    Jenis: string;
    Divisi: number;
}

const initialData: MasterBahanForm = {
    Kode: "",
    Nama: "",
    Satuan: "",
    Gramasi: "",
    Panjang: 0,
    Lebar: 0,
    KtgKode: "",
    GdgDefault: "",
    GdgNama: "",
    SupKode: "",
    SupNama: "",
    HrgJual: 0,
    HrgBeli: 0,
    isAktif: true,
    isStok: true,
    isExpired: false,
    Status: "",
    Jenis: "",
    Divisi: 5,
};

const showSupplierModal = ref(false);
const showGudangModal = ref(false);

const divisiOptions = ref<{ Kode: number; Nama: string }[]>([]);
const kategoriOptions = ref<{ Kode: string; Nama: string }[]>([]);
const jenisOptions = ref<{ Kode: string; Nama: string }[]>([]);
const satuanOptions = [
    "ROLL",
    "M",
    "Y",
    "PCS",
    "PACK",
    "BOTOL",
    "MILILITER",
    "BOX",
];

const isRollOrMeter = computed(() => {
    return ["ROLL", "M", "Y"].includes(formData.value.Satuan);
});

const loadDropdowns = async () => {
    try {
        const [resDivisi, resKtg, resJenis] = await Promise.all([
            api.get("/mmt/daftar/bahan/lookup/divisi"),
            api.get("/mmt/daftar/bahan/lookup/kategori"),
            api.get("/mmt/daftar/bahan/lookup/jenis"),
        ]);
        divisiOptions.value = resDivisi.data?.data || [];
        kategoriOptions.value = resKtg.data?.data || [];
        jenisOptions.value = resJenis.data?.data || [];
    } catch (err) {
        console.error("Gagal load dropdown master bahan:", err);
    }
};

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
} = useForm<MasterBahanForm>({
    menuId: "5501",
    initialData,
    fetchApi: async () => {
        const kode = route.params.kode;
        const res = await api.get(
            `/mmt/daftar/bahan/${encodeURIComponent(String(kode))}`,
        );
        const d = res.data?.data || res.data || {};
        return {
            Kode: d.Kode || d.brg_kode || String(kode),
            Nama: d.Nama || d.brg_nama || "",
            Satuan: d.Satuan || d.brg_satuan || "ROLL",
            Gramasi: d.Gramasi || d.brg_gramasi || "",
            Panjang: Number(d.Panjang || d.brg_panjang || 0),
            Lebar: Number(d.Lebar || d.brg_lebar || 0),
            KtgKode: d.KtgKode || d.brg_ktg_kode || "BU",
            GdgDefault: d.GdgDefault || d.brg_gdg_default || "WH-16",
            GdgNama:
                d.GudangNama || d.GdgNama || d.gdg_nama || "GUDANG UTAMA MMT",
            SupKode: d.SupKode || d.brg_sup_kode || "",
            SupNama: d.SupNama || "",
            HrgJual: Number(d.HrgJual || d.brg_hrgjual || 0),
            HrgBeli: Number(d.HrgBeli || d.brg_hrgbeli || 0),
            isAktif: d.isAktif !== undefined ? Boolean(d.isAktif) : true,
            isStok: d.isStok !== undefined ? Boolean(d.isStok) : true,
            isExpired: d.isExpired !== undefined ? Boolean(d.isExpired) : false,
            Status: d.Status || d.brg_status || "S",
            Jenis: d.Jenis || d.brg_jenis || "GY",
            Divisi: Number(d.Divisi || d.brg_divisi || 5),
        };
    },
    submitApi: async (dataToSave: MasterBahanForm) => {
        const isEdit = Boolean(
            route.params.kode ||
            (dataToSave.Kode && dataToSave.Kode.trim() !== ""),
        );
        const payload = {
            ...dataToSave,
            isEditMode: isEdit,
        };
        return await api.post("/mmt/daftar/bahan/save", payload);
    },
    onSuccessRoute: "/mmt/daftar/bahan",
});

const onSelectSupplier = (sup: any) => {
    formData.value.SupKode = sup.Kode;
    formData.value.SupNama = sup.Nama;
};

const onSelectGudang = (gdg: any) => {
    formData.value.GdgDefault = gdg.Kode;
    formData.value.GdgNama = gdg.Nama;
};

onMounted(() => {
    loadDropdowns();
});
</script>

<template>
    <BaseForm
        :title="
            isEditMode
                ? `Ubah Master Bahan MMT (${formData.Kode})`
                : 'Tambah Master Bahan MMT Baru'
        "
        menu-id="5501"
        :icon="IconTexture"
        :is-loading="isLoading"
        :is-saving="isSaving"
        item-name="Master Bahan MMT"
        desktop-mode
        v-model:show-save-dialog="showSaveDialog"
        v-model:show-cancel-dialog="showCancelDialog"
        v-model:show-close-dialog="showCloseDialog"
        @validate-save="showSaveDialog = true"
        @confirm-save="executeSave"
        @confirm-cancel="executeCancel"
        @confirm-close="executeClose"
    >
        <!-- ── KOLOM KIRI (KATEGORI & STATUS) ── -->
        <template #left-column>
            <div class="desktop-form-section header-section">
                <div class="section-label">Klasifikasi Bahan</div>

                <div class="fr">
                    <label class="lbl">Divisi</label>
                    <select
                        v-model.number="formData.Divisi"
                        class="inp flex-grow-1"
                    >
                        <option
                            v-for="d in divisiOptions"
                            :key="d.Kode"
                            :value="d.Kode"
                        >
                            {{ d.Nama }}
                        </option>
                    </select>
                </div>

                <div class="fr">
                    <label class="lbl">Kategori</label>
                    <select v-model="formData.KtgKode" class="inp flex-grow-1">
                        <option
                            v-for="k in kategoriOptions"
                            :key="k.Kode"
                            :value="k.Kode"
                        >
                            {{ k.Kode }} - {{ k.Nama }}
                        </option>
                    </select>
                </div>

                <div class="fr">
                    <label class="lbl">Jenis Bahan</label>
                    <select v-model="formData.Jenis" class="inp flex-grow-1">
                        <option
                            v-for="j in jenisOptions"
                            :key="j.Kode"
                            :value="j.Kode"
                        >
                            {{ j.Kode }} - {{ j.Nama }}
                        </option>
                    </select>
                </div>
            </div>

            <div class="desktop-form-section">
                <div class="section-label">Status & Pengaturan</div>

                <div class="fr">
                    <label class="lbl">Pergerakan</label>
                    <select v-model="formData.Status" class="inp flex-grow-1">
                        <option value="F">Fast Moving (FM)</option>
                        <option value="S">Slow Moving (SM)</option>
                        <option value="N">Non Flexy (NF)</option>
                        <option value="-">- Standar -</option>
                    </select>
                </div>

                <div class="fr align-start">
                    <label class="lbl pt-1">Opsi Bahan</label>
                    <div class="ck-wrap pt-1">
                        <label class="ck">
                            <input type="checkbox" v-model="formData.isAktif" />
                            <span>Aktif</span>
                        </label>
                        <label class="ck">
                            <input type="checkbox" v-model="formData.isStok" />
                            <span>Kelola Stok</span>
                        </label>
                        <label class="ck">
                            <input
                                type="checkbox"
                                v-model="formData.isExpired"
                            />
                            <span>Expired</span>
                        </label>
                    </div>
                </div>

                <div class="fr mt-2 align-start">
                    <label class="lbl pt-1">Gudang Default</label>
                    <div
                        class="d-flex flex-column flex-grow-1 ga-1"
                        style="min-width: 0"
                    >
                        <div class="igrp" style="width: 90px">
                            <input
                                v-model="formData.GdgDefault"
                                class="inp"
                                placeholder="Cari..."
                                readonly
                                @click="showGudangModal = true"
                            />
                            <button
                                type="button"
                                class="blkp"
                                title="Pilih Gudang Default"
                                @click="showGudangModal = true"
                            >
                                <IconSearch :size="13" />
                            </button>
                        </div>
                        <input
                            :value="formData.GdgNama"
                            readonly
                            class="inp ro w-100"
                            style="min-width: 0"
                            placeholder=""
                            tabindex="-1"
                        />
                    </div>
                </div>
            </div>
        </template>

        <!-- ── KOLOM KANAN (DETAIL BARANG & HARGA) ── -->
        <template #right-column>
            <div class="desktop-form-section header-section">
                <div class="section-label">Identitas Bahan MMT</div>

                <div class="fr">
                    <label class="lbl">Kode Bahan</label>
                    <input
                        v-model="formData.Kode"
                        class="inp"
                        style="width: 180px; text-transform: uppercase"
                        :readonly="isEditMode"
                        :class="{ ro: isEditMode }"
                        placeholder="..."
                    />
                </div>

                <div class="fr">
                    <label class="lbl">Nama Bahan</label>
                    <input
                        v-model="formData.Nama"
                        class="inp flex-grow-1"
                        placeholder="..."
                    />
                </div>

                <div class="fr">
                    <label class="lbl">Satuan</label>
                    <select
                        v-model="formData.Satuan"
                        class="inp"
                        style="width: 140px"
                    >
                        <option v-for="s in satuanOptions" :key="s" :value="s">
                            {{ s }}
                        </option>
                    </select>
                </div>

                <div class="fr">
                    <label class="lbl">
                        {{ isRollOrMeter ? "Ukuran Roll" : "Dimensi Fisik" }}
                    </label>
                    <div class="d-flex align-center ga-2">
                        <span>P:</span>
                        <input
                            type="number"
                            step="0.01"
                            v-model.number="formData.Panjang"
                            class="inp tr"
                            style="width: 70px"
                            :placeholder="isRollOrMeter ? '50' : '0'"
                        />
                        <span>m</span>
                        <span class="ml-2">L:</span>
                        <input
                            type="number"
                            step="0.01"
                            v-model.number="formData.Lebar"
                            class="inp tr"
                            style="width: 70px"
                            :placeholder="isRollOrMeter ? '3.2' : '0'"
                        />
                        <span>m</span>
                        <span
                            v-if="!isRollOrMeter"
                            class="text-caption text-grey ml-1"
                        >
                            (Opsional / isi 0)
                        </span>
                    </div>
                </div>

                <div class="fr">
                    <label class="lbl">Gramasi</label>
                    <input
                        v-model="formData.Gramasi"
                        class="inp"
                        style="width: 160px"
                        :placeholder="
                            isRollOrMeter
                                ? 'Contoh: 340 GR'
                                : 'Opsional (misal: 3 mm)...'
                        "
                    />
                </div>
            </div>

            <div class="desktop-form-section">
                <div class="section-label">Supplier & Informasi Harga</div>

                <div class="fr">
                    <label class="lbl">Supplier</label>
                    <div class="igrp" style="width: 120px">
                        <input
                            v-model="formData.SupKode"
                            class="inp"
                            placeholder="Cari..."
                            @click="showSupplierModal = true"
                        />
                        <button
                            type="button"
                            class="blkp"
                            @click="showSupplierModal = true"
                        >
                            <IconSearch :size="13" />
                        </button>
                    </div>
                    <input
                        :value="formData.SupNama"
                        readonly
                        class="inp ro flex-grow-1 ml-1"
                        placeholder="Nama Supplier..."
                    />
                </div>

                <div class="fr">
                    <label class="lbl">Harga Beli</label>
                    <div class="igrp" style="width: 160px">
                        <span class="addon">Rp</span>
                        <input
                            type="number"
                            v-model.number="formData.HrgBeli"
                            class="inp tr"
                            placeholder="0"
                        />
                    </div>
                </div>

                <div class="fr">
                    <label class="lbl">Harga Jual</label>
                    <div class="igrp" style="width: 160px">
                        <span class="addon">Rp</span>
                        <input
                            type="number"
                            v-model.number="formData.HrgJual"
                            class="inp tr"
                            placeholder="0"
                        />
                    </div>
                </div>
            </div>
        </template>
    </BaseForm>

    <SupplierSearchModal
        v-model="showSupplierModal"
        @selected="onSelectSupplier"
    />

    <GudangMmtSearchModal
        v-model="showGudangModal"
        @selected="onSelectGudang"
    />
</template>

<style scoped>
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
.inp:focus {
    border-color: #1976d2;
}
.ro {
    background: #f5f5f5 !important;
    color: #555 !important;
}
.ck {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 11px;
    cursor: pointer;
}
.ck-wrap {
    display: flex;
    flex-wrap: wrap;
    gap: 6px 12px;
}
.tr {
    text-align: right;
}
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
.addon {
    background: #f5f5f5;
    color: #666;
    font-size: 11px;
    font-weight: 600;
    padding: 0 8px;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    border-right: 1px solid #ccc;
    user-select: none;
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
</style>
