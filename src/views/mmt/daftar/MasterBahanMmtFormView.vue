<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from "vue";
import { useRouter, useRoute } from "vue-router";
import { useToast } from "vue-toastification";
import api from "@/services/api";
import PageLayout from "@/components/PageLayout.vue";
import GudangLookupView from "@/modal/GudangLookupView.vue";
import SupplierLookupModal from "@/modal/SupplierLookupModal.vue";

const router = useRouter();
const route = useRoute();
const toast = useToast();
const API_MASTERBAHAN = "/master/bahan";

const isEditMode = ref(false);
const isSaving = ref(false);
const initialLoadComplete = ref(false);

const formData = ref({
    kode: "",
    nama: "",
    divisiKode: null,
    tipeKode: null,
    jenisKode: null,
    gudangKode: "WH-16",
    gudangNama: "",
    supplierKode: null,
    supplierNama: "",
    satuan: "ROLL",
    lebar: 0,
    panjang: 0,
    isAktif: true,
    isStok: true,
    isExpired: false,
    status: "S",
});

const formTitle = computed(() =>
    isEditMode.value
        ? `Edit Master Barang: ${formData.value.kode || ""}`
        : "Tambah Master Barang",
);

const divisiOptions = ref([]);
const kategoriOptions = ref([]);
const jenisOptions = ref([]);
const gudangOptions = ref([]);
const supplierOptions = ref([]);
const satuanOptions = ref([
    "ROLL",
    "M",
    "Y",
    "PCS",
    "PACK",
    "BOTOL",
    "MILILITER",
    "BOX",
]);

const isGudangLookupOpen = ref(false);
const isSupplierLookupOpen = ref(false);
const extraRows = ref([]);
const activeGudangExtraRowIndex = ref(null);
const activeSupplierExtraRowIndex = ref(null);

function createExtraRow() {
    return {
        kode: "",
        nama: "",
        satuan: "ROLL",
        gudangKode: "WH-16",
        gudangNama: "",
        supplierKode: null,
        supplierNama: "",
        lebar: 0,
        panjang: 0,
    };
}

function isRowValid(row) {
    return (
        String(row?.kode || "").trim().length >= 3 &&
        String(row?.nama || "").trim() !== ""
    );
}

const isFormValid = computed(() => {
    const mainValid =
        formData.value.kode.trim().length >= 3 &&
        formData.value.nama.trim() !== "";

    if (isEditMode.value) return mainValid;
    return mainValid || extraRows.value.some((row) => isRowValid(row));
});

function normalizeLookupCode(value) {
    const v = String(value ?? "").trim();
    return v === "" ? null : v;
}

function findByKode(items, kode) {
    return items.find((x) => String(x?.Kode ?? "") === String(kode ?? ""));
}

function syncGudangNama() {
    const found = findByKode(gudangOptions.value, formData.value.gudangKode);
    formData.value.gudangNama = found?.Nama ?? "";
}

function syncSupplierNama() {
    const found = findByKode(
        supplierOptions.value,
        formData.value.supplierKode,
    );
    formData.value.supplierNama =
        found?.Nama ?? formData.value.supplierNama ?? "";
}

async function ensureSupplierNamaFromKode() {
    const kode = normalizeLookupCode(formData.value.supplierKode);
    if (!kode || formData.value.supplierNama) return;

    try {
        const res = await api.get(`${API_MASTERBAHAN}/lookup/supplier`, {
            params: { q: kode },
        });

        const items = Array.isArray(res.data?.data) ? res.data.data : [];
        const exact = items.find((x) => String(x?.Kode ?? "") === String(kode));
        const found = exact ?? items[0];

        if (found?.Nama) {
            formData.value.supplierNama = String(found.Nama);
            supplierOptions.value = [found];
        }
    } catch {
        // biarkan kosong jika lookup gagal
    }
}

function resetForm() {
    formData.value = {
        kode: "",
        nama: "",
        divisiKode: null,
        tipeKode: null,
        jenisKode: null,
        gudangKode: "WH-16",
        gudangNama: "",
        supplierKode: null,
        supplierNama: "",
        satuan: "ROLL",
        lebar: 0,
        panjang: 0,
        isAktif: true,
        isStok: true,
        isExpired: false,
        status: "S",
    };
    supplierOptions.value = [];
    extraRows.value = [];
    activeGudangExtraRowIndex.value = null;
    activeSupplierExtraRowIndex.value = null;
    isEditMode.value = false;
}

function onLookupChange(field, value) {
    formData.value[field] = normalizeLookupCode(value);

    const findByKode = (items, kode) =>
        items.find((x) => String(x?.Kode ?? "") === String(kode ?? ""));

    if (field === "gudangKode") {
        syncGudangNama();
    }
    if (field === "supplierKode") {
        syncSupplierNama();
    }
}

function openGudangLookup(extraRowIndex = null) {
    activeGudangExtraRowIndex.value = extraRowIndex;
    isGudangLookupOpen.value = true;
}

function openSupplierLookup(extraRowIndex = null) {
    activeSupplierExtraRowIndex.value = extraRowIndex;
    isSupplierLookupOpen.value = true;
}

function selectGudang(item) {
    const idx = activeGudangExtraRowIndex.value;
    if (idx === null) {
        formData.value.gudangKode = normalizeLookupCode(item?.Kode) ?? "WH-16";
        formData.value.gudangNama = String(item?.Nama ?? "");
    } else if (extraRows.value[idx]) {
        extraRows.value[idx].gudangKode =
            normalizeLookupCode(item?.Kode) ?? "WH-16";
        extraRows.value[idx].gudangNama = String(item?.Nama ?? "");
    }
    activeGudangExtraRowIndex.value = null;
    isGudangLookupOpen.value = false;
}

function selectSupplier(item) {
    const idx = activeSupplierExtraRowIndex.value;
    if (idx === null) {
        formData.value.supplierKode = normalizeLookupCode(item?.Kode);
        formData.value.supplierNama = String(item?.Nama ?? "");
    } else if (extraRows.value[idx]) {
        extraRows.value[idx].supplierKode = normalizeLookupCode(item?.Kode);
        extraRows.value[idx].supplierNama = String(item?.Nama ?? "");
    }
    activeSupplierExtraRowIndex.value = null;
    isSupplierLookupOpen.value = false;
}

function addRow() {
    if (isEditMode.value) return;
    extraRows.value.push(createExtraRow());
}

function removeRow(index) {
    if (isEditMode.value) return;
    extraRows.value.splice(index, 1);
}

function buildPayloadFromRow(row, editMode = false) {
    return {
        Kode: String(row?.kode || "").trim(),
        Nama: String(row?.nama || "").trim(),
        Satuan: String(row?.satuan || formData.value.satuan || "ROLL").trim(),
        Panjang: Number(row?.panjang || 0),
        Lebar: Number(row?.lebar || 0),
        Stok: 0,
        KtgKode: String(formData.value.tipeKode || ""),
        GdgDefault: String(row?.gudangKode || "WH-16"),
        SupKode: String(row?.supplierKode || ""),
        HrgJual: 0,
        HrgBeli: 0,
        isAktif: formData.value.isAktif ? 1 : 0,
        isStok: formData.value.isStok ? 1 : 0,
        isExpired: formData.value.isExpired ? 1 : 0,
        Status: String(formData.value.status || "S"),
        Jenis: String(formData.value.jenisKode || ""),
        Divisi: String(formData.value.divisiKode || ""),
        isEditMode: editMode,
    };
}

async function loadMasterData() {
    try {
        const [divisi, kategori, jenis, gudang] = await Promise.all([
            api.get(`${API_MASTERBAHAN}/lookup/divisi`),
            api.get(`${API_MASTERBAHAN}/lookup/kategori`),
            api.get(`${API_MASTERBAHAN}/lookup/jenis`),
            api.get(`${API_MASTERBAHAN}/lookup/gudang`),
        ]);

        divisiOptions.value = Array.isArray(divisi.data?.data)
            ? divisi.data.data.map((item) => ({
                  ...item,
                  // Samakan tipe dengan v-model (string) agar label yang tampil adalah Nama, bukan Kode
                  Kode: String(item?.Kode ?? ""),
              }))
            : [];
        kategoriOptions.value = Array.isArray(kategori.data?.data)
            ? kategori.data.data
            : [];
        jenisOptions.value = Array.isArray(jenis.data?.data)
            ? jenis.data.data
            : [];
        gudangOptions.value = Array.isArray(gudang.data?.data)
            ? gudang.data.data
            : [];

        if (formData.value.gudangKode) {
            syncGudangNama();
        }
    } catch (_error) {
        toast.error("Gagal memuat data lookup.");
    }
}

async function loadFormData(kode) {
    if (!kode) return;
    const res = await api.get(
        `${API_MASTERBAHAN}/mmt/${encodeURIComponent(kode)}`,
    );
    const data = res.data?.data;
    if (!data?.Kode) return;

    isEditMode.value = true;
    formData.value = {
        ...formData.value,
        kode: String(data.Kode ?? kode),
        nama: String(data.Nama ?? ""),
        satuan: String(data.Satuan ?? "ROLL"),
        panjang: Number(data.Panjang ?? 0),
        lebar: Number(data.Lebar ?? 0),
        gudangKode: normalizeLookupCode(data.GdgDefault) ?? "WH-16",
        gudangNama: String(data.GudangNama ?? ""),
        supplierKode: normalizeLookupCode(data.SupKode),
        supplierNama: String(data.SupplierNama ?? ""),
        jenisKode: normalizeLookupCode(data.Jenis),
        tipeKode: normalizeLookupCode(data.KtgKode),
        divisiKode: normalizeLookupCode(data.Divisi),
        isAktif: Number(data.isAktif ?? 0) === 1,
        isStok: Number(data.isStok ?? 0) === 1,
        isExpired: Number(data.isExpired ?? 0) === 1,
        status: String(data.Status ?? "S"),
    };

    if (formData.value.supplierKode && formData.value.supplierNama) {
        supplierOptions.value = [
            {
                Kode: formData.value.supplierKode,
                Nama: formData.value.supplierNama,
            },
        ];
    }

    await ensureSupplierNamaFromKode();
    syncGudangNama();
}

async function handleKodeExit() {
    const kode = String(formData.value.kode || "").trim();
    if (kode.length < 3 || !initialLoadComplete.value || isEditMode.value)
        return;
    try {
        await loadFormData(kode);
    } catch {}
}

async function saveForm(andNew) {
    if (!isFormValid.value) return;
    isSaving.value = true;
    try {
        if (isEditMode.value) {
            const payload = buildPayloadFromRow(
                {
                    kode: formData.value.kode,
                    nama: formData.value.nama,
                    satuan: formData.value.satuan,
                    gudangKode: formData.value.gudangKode,
                    supplierKode: formData.value.supplierKode,
                    panjang: formData.value.panjang,
                    lebar: formData.value.lebar,
                },
                true,
            );
            const res = await api.post(`${API_MASTERBAHAN}/save`, payload);
            toast.success(
                `Data berhasil disimpan. Kode: ${res.data?.kode || formData.value.kode}`,
            );
        } else {
            const rowsToSave = [
                {
                    kode: formData.value.kode,
                    nama: formData.value.nama,
                    satuan: formData.value.satuan,
                    gudangKode: formData.value.gudangKode,
                    supplierKode: formData.value.supplierKode,
                    panjang: formData.value.panjang,
                    lebar: formData.value.lebar,
                },
                ...extraRows.value,
            ].filter((row) => isRowValid(row));

            for (const row of rowsToSave) {
                const payload = buildPayloadFromRow(row, false);
                await api.post(`${API_MASTERBAHAN}/save`, payload);
            }

            toast.success(
                `Data berhasil disimpan (${rowsToSave.length} baris).`,
            );
        }

        if (andNew) resetForm();
        else closeForm();
    } catch (error) {
        toast.error(error?.response?.data?.message || "Gagal menyimpan data.");
    } finally {
        isSaving.value = false;
    }
}

function closeForm() {
    router.back();
}

onMounted(async () => {
    await loadMasterData();

    const kodeParam = String(
        route.query.kode || route.params.kode || "",
    ).trim();
    const modeParam = String(route.query.mode || "").toLowerCase();
    if (
        kodeParam &&
        (modeParam === "edit" ||
            modeParam === "ubah" ||
            Boolean(route.params.kode))
    ) {
        try {
            await loadFormData(kodeParam);
        } catch {
            toast.error("Gagal memuat data edit.");
        }
    }

    initialLoadComplete.value = true;
});

onBeforeUnmount(() => {});
</script>

<template>
    <PageLayout :title="formTitle" icon="mdi-tools">
        <template #header-actions>
            <v-btn
                size="x-small"
                color="primary"
                :loading="isSaving"
                :disabled="isSaving || !isFormValid"
                @click="saveForm(false)"
            >
                <v-icon start>mdi-check-circle</v-icon> Simpan
            </v-btn>
            <v-btn
                size="x-small"
                color="success"
                class="ml-1"
                :disabled="isSaving || !isFormValid"
                @click="saveForm(true)"
            >
                <v-icon start>mdi-content-save-all</v-icon> Simpan & Baru
            </v-btn>
            <v-btn size="x-small" class="ml-1" @click="closeForm">
                <v-icon start>mdi-close</v-icon> Tutup
            </v-btn>
        </template>

        <div class="main-form-wrapper">
            <!-- ==================== SIDEBAR KIRI ==================== -->
            <aside class="sidebar-header">
                <div class="section-title">Data Header</div>

                <!-- Divisi -->
                <div class="field-group">
                    <label class="field-label">Divisi</label>
                    <v-select
                        v-model="formData.divisiKode"
                        :items="divisiOptions"
                        item-title="Nama"
                        item-value="Kode"
                        density="compact"
                        variant="outlined"
                        hide-details
                        @update:modelValue="
                            onLookupChange('divisiKode', $event)
                        "
                    />
                </div>

                <!-- Kategori / Tipe -->
                <div class="field-group">
                    <label class="field-label">Kategori / Tipe</label>
                    <v-select
                        v-model="formData.tipeKode"
                        :items="kategoriOptions"
                        item-title="Nama"
                        item-value="Kode"
                        density="compact"
                        variant="outlined"
                        hide-details
                        @update:modelValue="onLookupChange('tipeKode', $event)"
                    />
                </div>

                <!-- Jenis Bahan -->
                <div class="field-group">
                    <label class="field-label">Jenis Bahan</label>
                    <v-select
                        v-model="formData.jenisKode"
                        :items="jenisOptions"
                        item-title="Nama"
                        item-value="Kode"
                        density="compact"
                        variant="outlined"
                        hide-details
                        @update:modelValue="onLookupChange('jenisKode', $event)"
                    />
                </div>
            </aside>

            <!-- ==================== AREA TABEL KANAN ==================== -->
            <main class="table-content-area">
                <div class="table-card">
                    <!-- Header Tabel -->
                    <div class="table-header-blue">
                        <v-row no-gutters align="center">
                            <v-col cols="1" class="text-center th-col"
                                >No</v-col
                            >
                            <v-col cols="1" class="px-2 th-col"
                                >Kode Barang</v-col
                            >
                            <v-col cols="3" class="px-2 th-col"
                                >Nama Bahan</v-col
                            >
                            <v-col cols="2" class="px-2 th-col"
                                >Gudang Default</v-col
                            >
                            <v-col cols="2" class="px-2 th-col">Supplier</v-col>
                            <v-col cols="1" class="text-center th-col"
                                >Satuan</v-col
                            >

                            <v-col cols="1" class="text-center th-col"
                                >Panjang</v-col
                            >

                            <v-col cols="1" class="text-center th-col"
                                >Lebar</v-col
                            >
                        </v-row>
                    </div>

                    <!-- Baris Data -->
                    <div class="table-row-item">
                        <v-row no-gutters align="center">
                            <v-col cols="1" class="text-center td-col row-num"
                                >1</v-col
                            >

                            <!-- kode barang -->
                            <v-col cols="1" class="px-1 td-col">
                                <v-text-field
                                    v-model="formData.kode"
                                    :readonly="isEditMode"
                                    variant="plain"
                                    density="compact"
                                    hide-details
                                    class="plain-input"
                                />
                            </v-col>

                            <!-- nama bahan -->
                            <v-col cols="3" class="px-1 td-col">
                                <v-text-field
                                    v-model="formData.nama"
                                    variant="plain"
                                    density="compact"
                                    hide-details
                                    class="plain-input"
                                />
                            </v-col>

                            <!-- gudang -->
                            <v-col cols="2" class="px-1 td-col">
                                <v-text-field
                                    placeholder="Cari gudang..."
                                    persistent-placeholder
                                    :model-value="formData.gudangKode"
                                    variant="plain"
                                    density="compact"
                                    hide-details
                                    class="plain-input"
                                    append-inner-icon="mdi-magnify"
                                    readonly
                                    @click="openGudangLookup()"
                                />
                            </v-col>

                            <!-- supplier -->
                            <v-col cols="2" class="px-1 td-col">
                                <v-text-field
                                    :model-value="formData.supplierNama || ''"
                                    placeholder="Cari supplier..."
                                    variant="plain"
                                    density="compact"
                                    hide-details
                                    class="plain-input"
                                    append-inner-icon="mdi-magnify"
                                    readonly
                                    @click="openSupplierLookup()"
                                />
                            </v-col>

                            <!-- satuan -->
                            <v-col cols="1" class="px-1 td-col">
                                <v-select
                                    v-model="formData.satuan"
                                    :items="satuanOptions"
                                    variant="plain"
                                    density="compact"
                                    hide-details
                                    class="plain-input text-center"
                                />
                            </v-col>

                            <!-- panjang -->
                            <v-col cols="1" class="px-1 td-col">
                                <v-text-field
                                    v-model.number="formData.panjang"
                                    type="number"
                                    variant="plain"
                                    density="compact"
                                    hide-details
                                    class="plain-input text-center"
                                />
                            </v-col>

                            <!-- lebar -->
                            <v-col cols="1" class="px-1 td-col">
                                <v-text-field
                                    v-model.number="formData.lebar"
                                    type="number"
                                    variant="plain"
                                    density="compact"
                                    hide-details
                                    class="plain-input text-center"
                                />
                            </v-col>
                        </v-row>
                    </div>

                    <div
                        v-for="(row, rowIndex) in extraRows"
                        :key="`extra-row-${rowIndex}`"
                        class="table-row-item"
                    >
                        <v-row no-gutters align="center">
                            <v-col cols="1" class="text-center td-col row-num">
                                <div
                                    class="d-flex align-center justify-center ga-1"
                                >
                                    <span>{{ rowIndex + 2 }}</span>
                                    <v-btn
                                        icon="mdi-delete"
                                        size="x-small"
                                        color="error"
                                        variant="text"
                                        @click="removeRow(rowIndex)"
                                    />
                                </div>
                            </v-col>

                            <v-col cols="1" class="px-1 td-col">
                                <v-text-field
                                    v-model="row.kode"
                                    variant="plain"
                                    density="compact"
                                    hide-details
                                    class="plain-input"
                                />
                            </v-col>

                            <v-col cols="3" class="px-1 td-col">
                                <v-text-field
                                    v-model="row.nama"
                                    variant="plain"
                                    density="compact"
                                    hide-details
                                    class="plain-input"
                                />
                            </v-col>

                            <v-col cols="2" class="px-1 td-col">
                                <v-text-field
                                    :model-value="
                                        row.gudangNama || row.gudangKode
                                    "
                                    placeholder="Cari gudang..."
                                    persistent-placeholder
                                    variant="plain"
                                    density="compact"
                                    hide-details
                                    class="plain-input"
                                    append-inner-icon="mdi-magnify"
                                    readonly
                                    @click="openGudangLookup(rowIndex)"
                                />
                            </v-col>

                            <v-col cols="2" class="px-1 td-col">
                                <v-text-field
                                    :model-value="
                                        row.supplierNama ||
                                        row.supplierKode ||
                                        ''
                                    "
                                    placeholder="Cari supplier..."
                                    variant="plain"
                                    density="compact"
                                    hide-details
                                    class="plain-input"
                                    append-inner-icon="mdi-magnify"
                                    readonly
                                    @click="openSupplierLookup(rowIndex)"
                                />
                            </v-col>

                            <v-col cols="1" class="px-1 td-col">
                                <v-select
                                    v-model="row.satuan"
                                    :items="satuanOptions"
                                    variant="plain"
                                    density="compact"
                                    hide-details
                                    class="plain-input text-center"
                                />
                            </v-col>

                            <v-col cols="1" class="px-1 td-col">
                                <v-text-field
                                    v-model.number="row.panjang"
                                    type="number"
                                    variant="plain"
                                    density="compact"
                                    hide-details
                                    class="plain-input text-center"
                                />
                            </v-col>

                            <v-col cols="1" class="px-1 td-col">
                                <v-text-field
                                    v-model.number="row.lebar"
                                    type="number"
                                    variant="plain"
                                    density="compact"
                                    hide-details
                                    class="plain-input text-center"
                                />
                            </v-col>
                        </v-row>
                    </div>

                    <!-- Ruang kosong bergaris -->
                    <div class="empty-table-space"></div>

                    <!-- Footer Tabel -->
                    <div class="table-footer pa-2">
                        <v-btn
                            prepend-icon="mdi-plus"
                            size="small"
                            variant="text"
                            color="primary"
                            :disabled="isEditMode"
                            @click="addRow"
                        >
                            Tambah Baris
                        </v-btn>
                    </div>
                </div>
            </main>
        </div>

        <GudangLookupView
            :isVisible="isGudangLookupOpen"
            @close="isGudangLookupOpen = false"
            @select="selectGudang"
        />

        <SupplierLookupModal
            v-if="isSupplierLookupOpen"
            :isVisible="isSupplierLookupOpen"
            @close="isSupplierLookupOpen = false"
            @select="selectSupplier"
        />
    </PageLayout>
</template>

<style scoped>
/* ================================================================
   LAYOUT UTAMA
   ================================================================ */
.main-form-wrapper {
    display: flex;
    gap: 16px;
    padding: 16px;
    background-color: #f5f5f5;
    height: calc(100vh - 100px);
    box-sizing: border-box;
}

/* ================================================================
   SIDEBAR KIRI
   ================================================================ */
.sidebar-header {
    width: 320px;
    min-width: 280px;
    flex-shrink: 0;
    background: #ffffff;
    border: 1px solid #e0e0e0;
    border-radius: 8px;
    padding: 16px;
    display: flex;
    flex-direction: column;
    overflow-y: auto;
}

.section-title {
    font-weight: 700;
    font-size: 15px;
    color: #1a1a1a;
    margin-bottom: 14px;
    padding-bottom: 10px;
    border-bottom: 1px solid #f0f0f0;
}

/* ── Field Group ── */
.field-group {
    margin-bottom: 10px;
}

.field-label {
    display: block;
    font-size: 11px;
    font-weight: 600;
    color: #666666;
    text-transform: uppercase;
    letter-spacing: 0.4px;
    margin-bottom: 3px;
}

/* ── Status Approval Box ── */
.status-approval-box {
    border-top: 1px solid #eeeeee;
    padding-top: 12px;
    margin-top: 6px;
    margin-bottom: 16px;
}

.status-approval-label {
    font-size: 11px;
    font-weight: 700;
    color: #999999;
    letter-spacing: 0.5px;
    margin-bottom: 4px;
}

.compact-cb :deep(.v-label) {
    font-size: 13px !important;
}

/* ── Total Box ── */
.total-qty-box {
    background-color: #e3f2fd;
    border: 1px solid #bbdefb;
    border-radius: 6px;
    padding: 14px 16px;
    text-align: right;
    margin-top: auto;
}

.total-label {
    font-size: 11px;
    font-weight: 700;
    color: #1976d2;
    letter-spacing: 0.5px;
    margin-bottom: 2px;
}

.total-value {
    font-size: 30px;
    font-weight: 800;
    color: #0d47a1;
    line-height: 1.1;
}

/* ================================================================
   AREA TABEL KANAN
   ================================================================ */
.table-content-area {
    flex: 1;
    min-width: 0;
    background: #ffffff;
    border: 1px solid #e0e0e0;
    border-radius: 8px;
    overflow: hidden;
    display: flex;
    flex-direction: column;
}

.table-card {
    display: flex;
    flex-direction: column;
    height: 100%;
}

/* ── Header Tabel Biru ── */
.table-header-blue {
    background-color: #64b5f6;
    color: #ffffff;
    font-weight: 600;
    font-size: 12px;
    padding: 8px 0;
    flex-shrink: 0;
}

/* Border kolom header (putih transparan) */
.th-col {
    border-right: 1px solid rgba(255, 255, 255, 0.35);
    padding: 0 8px;
}

/* ── Baris Data ── */
.table-row-item {
    border-bottom: 1px solid #eeeeee;
    min-height: 40px;
    flex-shrink: 0;
}

/* Border kolom baris data (abu-abu) */
.td-col {
    border-right: 1px solid #eeeeee;
}

.row-num {
    font-size: 13px;
    color: #555555;
    padding: 0 8px;
}

/* ── Input Plain Dalam Tabel ── */
.plain-input :deep(.v-field__input) {
    padding: 2px 5px !important;
    min-height: 32px !important;
    font-size: 13px;
}

/* ── Ruang Kosong Bergaris ── */
.empty-table-space {
    flex: 1;
    background-image: repeating-linear-gradient(
        to bottom,
        #ffffff 0px,
        #ffffff 39px,
        #f7f7f7 39px,
        #f7f7f7 40px
    );
}

/* ── Footer Tabel ── */
.table-footer {
    border-top: 1px solid #eeeeee;
    flex-shrink: 0;
}
</style>
