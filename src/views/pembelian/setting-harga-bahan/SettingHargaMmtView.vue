<script setup lang="ts">
import { ref, reactive, watch, computed } from "vue";
import { useToast } from "vue-toastification";
import { IconPhoto, IconSparkles, IconHelpCircle } from "@tabler/icons-vue";
import { useBrowse } from "@/composables/useBrowse";
import BaseBrowse from "@/components/BaseBrowse.vue";
import { settingHargaBahanService } from "@/services/pembelian/settingHargaBahanService";
import { exportExcelSingle } from "@/utils/excelExport";

const toast = useToast();

// Mode aktif: 'bahan' atau 'topping'
const activeSub = ref<"bahan" | "topping">("bahan");
const filterNettoOnly = ref(false);

// ==========================================
// 1. DATA STRATA BAHAN MMT
// ==========================================
const {
    items: mmtItems,
    isLoading: mmtLoading,
    canInsert,
    canEdit,
    canDelete,
    canExport,
    selected: mmtSelected,
    fetchData: fetchMmt,
} = useBrowse({
    menuId: "211",
    fetchApi: async () => {
        const res = await settingHargaBahanService.getMmt();
        return res.data.data;
    },
});

const displayedMmtItems = computed(() => {
    if (!mmtItems.value) return [];
    if (filterNettoOnly.value) {
        return mmtItems.value.filter(
            (item: any) =>
                Number(item.is_netto) === 1 || Number(item.mhm_is_netto) === 1,
        );
    }
    return mmtItems.value;
});

const mmtHeaders = [
    { title: "ID", key: "id", width: "70px", align: "center" as const },
    { title: "KATEGORI", key: "kategori", width: "130px" },
    { title: "KODE", key: "bahan_kode", width: "110px" },
    { title: "NAMA BAHAN", key: "nama_bahan", minWidth: "220px" },
    {
        title: "MIN LUAS (M²)",
        key: "qmin",
        width: "130px",
        align: "end" as const,
    },
    {
        title: "MAX LUAS (M²)",
        key: "qmax",
        width: "130px",
        align: "end" as const,
    },
    {
        title: "TARIF / M² (RP)",
        key: "harga",
        width: "150px",
        align: "end" as const,
    },
];

const rowPropsFn = (data: any) => {
    const item = data.item?.raw || data.item;
    if (Number(item?.is_netto) === 1 || Number(item?.mhm_is_netto) === 1) {
        return { class: "row-netto" };
    }
    return {};
};

// ==========================================
// 2. DATA TOPPING & AKSESORIS MMT
// ==========================================
const {
    items: toppingItems,
    isLoading: toppingLoading,
    selected: toppingSelected,
    fetchData: fetchTopping,
} = useBrowse({
    menuId: "211",
    fetchApi: async () => {
        const res = await settingHargaBahanService.getMmtTambahan();
        return res.data.data;
    },
});

const toppingHeaders = [
    { title: "KODE", key: "kode", width: "140px" },
    { title: "NAMA TOPPING / AKSESORIS", key: "nama", minWidth: "240px" },
    { title: "KATEGORI", key: "kategori", width: "150px" },
    { title: "UKURAN", key: "ukuran", width: "120px" },
    { title: "MATERIAL", key: "material", width: "120px" },
    {
        title: "HARGA (RP)",
        key: "harga",
        width: "140px",
        align: "end" as const,
    },
];

watch(activeSub, (newVal) => {
    if (newVal === "bahan") fetchMmt();
    else fetchTopping();
});

// ==========================================
// DIALOG STATES & HANDLERS
// ==========================================
const mmtDialog = ref(false);
const isEditMmt = ref(false);
const selectedMmtId = ref<number | null>(null);
const confirmMmtSave = ref(false);

const mmtForm = reactive({
    kategori: "VYNIL",
    bahan_kode: "260",
    nama_bahan: "",
    qmin: 0,
    qmax: 999999,
    harga: 0,
    is_netto: 0,
    resolusi_tipe: "",
});

watch(
    () => mmtForm.is_netto,
    (val) => {
        if (val) {
            mmtForm.qmin = 0;
            mmtForm.qmax = 999999;
        }
    },
);

const toppingDialog = ref(false);
const isEditTopping = ref(false);
const selectedToppingId = ref<number | null>(null);
const confirmToppingSave = ref(false);

const toppingForm = reactive({
    kode: "",
    nama: "",
    kategori: "STANDING_BANNER",
    ukuran: "",
    material: "-",
    harga: 0,
    aktif: 1,
});

const handleAdd = () => {
    if (activeSub.value === "bahan") {
        isEditMmt.value = false;
        selectedMmtId.value = null;
        Object.assign(mmtForm, {
            kategori: "VYNIL",
            bahan_kode: "260",
            nama_bahan: "Vynil Bahan 260 Gram",
            qmin: 0,
            qmax: 99.99,
            harga: 13000,
            is_netto: 0,
            resolusi_tipe: "",
        });
        mmtDialog.value = true;
    } else {
        isEditTopping.value = false;
        selectedToppingId.value = null;
        Object.assign(toppingForm, {
            kode: "",
            nama: "",
            kategori: "STANDING_BANNER",
            ukuran: "",
            material: "-",
            harga: 0,
            aktif: 1,
        });
        toppingDialog.value = true;
    }
};

const handleEdit = (item: any) => {
    if (activeSub.value === "bahan") {
        isEditMmt.value = true;
        selectedMmtId.value = item.id;
        Object.assign(mmtForm, {
            kategori: item.kategori,
            bahan_kode: item.bahan_kode,
            nama_bahan: item.nama_bahan,
            qmin: Number(item.qmin) || 0,
            qmax: Number(item.qmax) || 999999,
            harga: Number(item.harga) || 0,
            is_netto: item.is_netto ? 1 : 0,
            resolusi_tipe: item.resolusi_tipe || "",
        });
        mmtDialog.value = true;
    } else {
        isEditTopping.value = true;
        selectedToppingId.value = item.id;
        Object.assign(toppingForm, {
            kode: item.kode,
            nama: item.nama,
            kategori: item.kategori,
            ukuran: item.ukuran,
            material: item.material,
            harga: Number(item.harga) || 0,
            aktif: item.aktif ? 1 : 0,
        });
        toppingDialog.value = true;
    }
};

const handleDelete = async (item: any) => {
    if (activeSub.value === "bahan") {
        try {
            await settingHargaBahanService.deleteMmt(item.id);
            toast.success(`Bahan MMT ${item.nama_bahan} berhasil dihapus`);
            fetchMmt();
        } catch (err: any) {
            toast.error(
                err.response?.data?.message || "Gagal menghapus bahan MMT",
            );
        }
    } else {
        try {
            await settingHargaBahanService.deleteMmtTambahan(item.id);
            toast.success(`Topping MMT "${item.nama}" berhasil dihapus`);
            fetchTopping();
        } catch (err: any) {
            toast.error(
                err.response?.data?.message || "Gagal menghapus topping MMT",
            );
        }
    }
};

const handleRefresh = () => {
    if (activeSub.value === "bahan") fetchMmt();
    else fetchTopping();
};

const handleExport = () => {
    if (activeSub.value === "bahan") {
        exportExcelSingle(
            "Setting_Harga_MMT.xlsx",
            "Bahan MMT",
            [
                { key: "id", header: "ID", width: 8 },
                { key: "kategori", header: "KATEGORI", width: 15 },
                { key: "bahan_kode", header: "KODE", width: 15 },
                { key: "nama_bahan", header: "NAMA BAHAN", width: 30 },
                {
                    key: "qmin",
                    header: "MIN LUAS (M2)",
                    width: 15,
                    numFmt: "#,##0.00",
                },
                {
                    key: "qmax",
                    header: "MAX LUAS (M2)",
                    width: 15,
                    numFmt: "#,##0.00",
                },
                {
                    key: "harga",
                    header: "TARIF / M2 (RP)",
                    width: 18,
                    numFmt: "Rp #,##0",
                },
            ],
            mmtItems.value ?? [],
            "Master Bahan MMT",
        );
    } else {
        exportExcelSingle(
            "Topping_Aksesoris_MMT.xlsx",
            "Topping MMT",
            [
                { key: "kode", header: "KODE", width: 15 },
                { key: "nama", header: "NAMA TOPPING", width: 30 },
                { key: "kategori", header: "KATEGORI", width: 20 },
                { key: "ukuran", header: "UKURAN", width: 15 },
                { key: "material", header: "MATERIAL", width: 15 },
                {
                    key: "harga",
                    header: "HARGA (RP)",
                    width: 18,
                    numFmt: "Rp #,##0",
                },
            ],
            toppingItems.value ?? [],
            "Master Topping & Aksesoris MMT",
        );
    }
};

const submitMmt = () => {
    if (!mmtForm.bahan_kode.trim() || !mmtForm.nama_bahan.trim()) {
        toast.error("Kode dan nama bahan wajib diisi");
        return;
    }
    confirmMmtSave.value = true;
};

const executeSaveMmt = async () => {
    try {
        if (isEditMmt.value && selectedMmtId.value) {
            await settingHargaBahanService.updateMmt(
                selectedMmtId.value,
                mmtForm,
            );
            toast.success("Bahan MMT berhasil diperbarui");
        } else {
            await settingHargaBahanService.createMmt(mmtForm);
            toast.success("Bahan MMT berhasil ditambahkan");
        }
        confirmMmtSave.value = false;
        mmtDialog.value = false;
        fetchMmt();
    } catch (err: any) {
        toast.error(err.response?.data?.message || "Gagal menyimpan bahan MMT");
    }
};

const submitTopping = () => {
    if (!toppingForm.kode.trim() || !toppingForm.nama.trim()) {
        toast.error("Kode dan nama topping wajib diisi");
        return;
    }
    confirmToppingSave.value = true;
};

const executeSaveTopping = async () => {
    try {
        if (isEditTopping.value && selectedToppingId.value) {
            await settingHargaBahanService.updateMmtTambahan(
                selectedToppingId.value,
                toppingForm,
            );
            toast.success("Topping MMT berhasil diperbarui");
        } else {
            await settingHargaBahanService.createMmtTambahan(toppingForm);
            toast.success("Topping MMT berhasil ditambahkan");
        }
        confirmToppingSave.value = false;
        toppingDialog.value = false;
        fetchTopping();
    } catch (err: any) {
        toast.error(
            err.response?.data?.message || "Gagal menyimpan topping MMT",
        );
    }
};
</script>

<template>
    <div class="h-100 d-flex flex-column">
        <!-- VIEW 1: STRATA BAHAN MMT -->
        <BaseBrowse
            v-if="activeSub === 'bahan'"
            title="Setting Harga Bahan MMT"
            menu-id="211"
            :icon="IconPhoto"
            :headers="mmtHeaders"
            :items="displayedMmtItems"
            :is-loading="mmtLoading"
            :row-props-fn="rowPropsFn"
            v-model:selected="mmtSelected"
            :can-insert="canInsert"
            :can-edit="canEdit"
            :can-delete="canDelete"
            :can-export="canExport"
            item-value="id"
            @refresh="handleRefresh"
            @add="handleAdd"
            @edit="handleEdit"
            @delete="handleDelete"
            @export="handleExport"
        >
            <template #filter-left>
                <div class="d-flex align-center ga-2">
                    <v-btn-toggle
                        v-model="activeSub"
                        mandatory
                        density="compact"
                        color="primary"
                        variant="outlined"
                        divided
                        class="elevation-0 mr-2"
                    >
                        <v-btn
                            value="bahan"
                            size="small"
                            class="text-none font-weight-bold px-3"
                        >
                            1. Master Bahan
                        </v-btn>
                        <v-btn
                            value="topping"
                            size="small"
                            class="text-none font-weight-bold px-3"
                        >
                            2. Topping & Aksesoris
                        </v-btn>
                    </v-btn-toggle>
                </div>
            </template>

            <template #filter-right-prepend>
                <div
                    class="d-flex align-center pa-1 px-2 rounded border mr-2 user-select-none transition-swing"
                    :class="
                        filterNettoOnly
                            ? 'bg-amber-lighten-4 border-amber-darken-2 elevation-1'
                            : 'bg-amber-lighten-5 border-amber-lighten-2'
                    "
                    style="font-size: 11.5px; cursor: pointer"
                    @click="filterNettoOnly = !filterNettoOnly"
                >
                    <v-checkbox-btn
                        v-model="filterNettoOnly"
                        density="compact"
                        color="amber-darken-4"
                        class="mr-1"
                        style="height: 16px; width: 16px"
                    />
                    <span class="font-weight-bold text-amber-darken-4 ml-1">
                        Harga Netto ({{
                            mmtItems?.filter(
                                (i: any) =>
                                    Number(i.is_netto) === 1 ||
                                    Number(i.mhm_is_netto) === 1,
                            ).length || 0
                        }})
                    </span>
                </div>
            </template>

            <template #item.kategori="{ value }">
                <v-chip
                    size="x-small"
                    :color="value === 'VYNIL' ? 'primary' : 'teal'"
                    variant="tonal"
                    class="font-weight-bold"
                >
                    {{ value }}
                </v-chip>
            </template>
            <template #item.qmin="{ value }">
                <span>{{ Number(value || 0).toLocaleString("id-ID") }} m²</span>
            </template>
            <template #item.qmax="{ value }">
                <span>{{
                    Number(value) >= 99999
                        ? "≥ " +
                          Number(value || 0).toLocaleString("id-ID") +
                          " m²"
                        : Number(value || 0).toLocaleString("id-ID") + " m²"
                }}</span>
            </template>
            <template #item.harga="{ value }">
                <span class="font-weight-bold text-primary">
                    Rp {{ Number(value || 0).toLocaleString("id-ID") }}
                </span>
            </template>
        </BaseBrowse>

        <!-- VIEW 2: TOPPING & AKSESORIS MMT -->
        <BaseBrowse
            v-else
            title="Setting Harga Bahan MMT"
            menu-id="211"
            :icon="IconPhoto"
            :headers="toppingHeaders"
            :items="toppingItems ?? []"
            :is-loading="toppingLoading"
            v-model:selected="toppingSelected"
            :can-insert="canInsert"
            :can-edit="canEdit"
            :can-delete="canDelete"
            :can-export="canExport"
            item-value="id"
            @refresh="handleRefresh"
            @add="handleAdd"
            @edit="handleEdit"
            @delete="handleDelete"
            @export="handleExport"
        >
            <template #filter-left>
                <div class="d-flex align-center ga-2">
                    <v-btn-toggle
                        v-model="activeSub"
                        mandatory
                        density="compact"
                        color="primary"
                        variant="outlined"
                        divided
                        class="elevation-0 mr-2"
                    >
                        <v-btn
                            value="bahan"
                            size="small"
                            class="text-none font-weight-bold px-3"
                        >
                            1. Master Bahan
                        </v-btn>
                        <v-btn
                            value="topping"
                            size="small"
                            class="text-none font-weight-bold px-3"
                        >
                            2. Topping & Aksesoris
                        </v-btn>
                    </v-btn-toggle>
                </div>
            </template>

            <template #item.harga="{ value }">
                <span class="font-weight-bold text-primary">
                    Rp {{ Number(value || 0).toLocaleString("id-ID") }}
                </span>
            </template>
            <template #item.aktif="{ value }">
                <v-chip
                    size="x-small"
                    :color="value ? 'success' : 'grey'"
                    variant="flat"
                >
                    {{ value ? "AKTIF" : "NONAKTIF" }}
                </v-chip>
            </template>
        </BaseBrowse>
    </div>

    <!-- FORM DIALOG BAHAN MMT -->
    <v-dialog v-model="mmtDialog" max-width="480px" persistent>
        <v-card class="dialog-card rounded-lg">
            <v-card-title
                class="dialog-header pa-3 d-flex align-center justify-space-between bg-grey-lighten-4 border-b"
            >
                <div
                    class="d-flex align-center font-weight-bold"
                    style="font-size: 13px"
                >
                    <IconPhoto :size="16" class="mr-2 text-primary" />
                    {{ isEditMmt ? "Ubah Bahan MMT" : "Tambah Bahan MMT" }}
                </div>
            </v-card-title>
            <v-card-text class="pa-4">
                <v-row dense>
                    <v-col cols="12" sm="6">
                        <v-select
                            v-model="mmtForm.kategori"
                            :items="['VYNIL', 'NON_VYNIL']"
                            label="Kategori Bahan *"
                            variant="outlined"
                            density="compact"
                            hide-details="auto"
                        />
                    </v-col>
                    <v-col cols="12" sm="6">
                        <v-text-field
                            v-model="mmtForm.bahan_kode"
                            label="Kode Bahan *"
                            variant="outlined"
                            density="compact"
                            placeholder="260 / 280 / ALBATROS"
                            hide-details="auto"
                        />
                    </v-col>
                    <v-col cols="12">
                        <v-text-field
                            v-model="mmtForm.nama_bahan"
                            label="Nama Bahan *"
                            variant="outlined"
                            density="compact"
                            placeholder="Vynil Bahan 260 Gram"
                            hide-details="auto"
                        />
                    </v-col>
                    <v-col cols="12" sm="6">
                        <v-text-field
                            v-model.number="mmtForm.qmin"
                            label="Batas Bawah m² (qmin) *"
                            type="number"
                            variant="outlined"
                            density="compact"
                            hide-details="auto"
                        />
                    </v-col>
                    <v-col cols="12" sm="6">
                        <v-text-field
                            v-model.number="mmtForm.qmax"
                            label="Batas Atas m² (qmax) *"
                            type="number"
                            variant="outlined"
                            density="compact"
                            hide-details="auto"
                        />
                    </v-col>
                    <v-col cols="12">
                        <v-text-field
                            v-model.number="mmtForm.harga"
                            label="Tarif per m² (Rp) *"
                            type="number"
                            variant="outlined"
                            density="compact"
                            hide-details="auto"
                        />
                    </v-col>
                    <v-col cols="12">
                        <v-checkbox
                            v-model="mmtForm.is_netto"
                            :true-value="1"
                            :false-value="0"
                            label="Harga Netto (Tanpa Tier Strata)"
                            density="compact"
                            hide-details
                        />
                    </v-col>
                </v-row>
            </v-card-text>
            <v-card-actions
                class="pa-3 border-t bg-grey-lighten-4 justify-end ga-2"
            >
                <v-btn
                    variant="outlined"
                    size="small"
                    color="secondary"
                    @click="mmtDialog = false"
                    >Batal</v-btn
                >
                <v-btn
                    color="primary"
                    variant="elevated"
                    size="small"
                    @click="submitMmt"
                    >Simpan</v-btn
                >
            </v-card-actions>
        </v-card>
    </v-dialog>

    <!-- FORM DIALOG TOPPING -->
    <v-dialog v-model="toppingDialog" max-width="480px" persistent>
        <v-card class="dialog-card rounded-lg">
            <v-card-title
                class="dialog-header pa-3 d-flex align-center justify-space-between bg-grey-lighten-4 border-b"
            >
                <div
                    class="d-flex align-center font-weight-bold"
                    style="font-size: 13px"
                >
                    <IconSparkles :size="16" class="mr-2 text-primary" />
                    {{
                        isEditTopping
                            ? "Ubah Topping MMT"
                            : "Tambah Topping MMT"
                    }}
                </div>
            </v-card-title>
            <v-card-text class="pa-4">
                <v-row dense>
                    <v-col cols="12" sm="6">
                        <v-text-field
                            v-model="toppingForm.kode"
                            label="Kode Topping *"
                            variant="outlined"
                            density="compact"
                            placeholder="X_BANNER_AL"
                            hide-details="auto"
                        />
                    </v-col>
                    <v-col cols="12" sm="6">
                        <v-text-field
                            v-model="toppingForm.kategori"
                            label="Kategori *"
                            variant="outlined"
                            density="compact"
                            placeholder="STANDING_BANNER"
                            hide-details="auto"
                        />
                    </v-col>
                    <v-col cols="12">
                        <v-text-field
                            v-model="toppingForm.nama"
                            label="Nama Topping *"
                            variant="outlined"
                            density="compact"
                            placeholder="Standing X Banner (Aluminium)"
                            hide-details="auto"
                        />
                    </v-col>
                    <v-col cols="12" sm="6">
                        <v-text-field
                            v-model="toppingForm.ukuran"
                            label="Ukuran"
                            variant="outlined"
                            density="compact"
                            placeholder="1,6 x 0,6 M"
                            hide-details="auto"
                        />
                    </v-col>
                    <v-col cols="12" sm="6">
                        <v-text-field
                            v-model="toppingForm.material"
                            label="Material"
                            variant="outlined"
                            density="compact"
                            placeholder="Aluminium / Stainless"
                            hide-details="auto"
                        />
                    </v-col>
                    <v-col cols="12">
                        <v-text-field
                            v-model.number="toppingForm.harga"
                            label="Harga Aksesoris (Rp) *"
                            type="number"
                            variant="outlined"
                            density="compact"
                            hide-details="auto"
                        />
                    </v-col>
                    <v-col cols="12">
                        <v-checkbox
                            v-model="toppingForm.aktif"
                            :true-value="1"
                            :false-value="0"
                            label="Status Aktif"
                            density="compact"
                            hide-details
                        />
                    </v-col>
                </v-row>
            </v-card-text>
            <v-card-actions
                class="pa-3 border-t bg-grey-lighten-4 justify-end ga-2"
            >
                <v-btn
                    variant="outlined"
                    size="small"
                    color="secondary"
                    @click="toppingDialog = false"
                    >Batal</v-btn
                >
                <v-btn
                    color="primary"
                    variant="elevated"
                    size="small"
                    @click="submitTopping"
                    >Simpan</v-btn
                >
            </v-card-actions>
        </v-card>
    </v-dialog>

    <!-- CONFIRM DIALOG MMT -->
    <v-dialog v-model="confirmMmtSave" max-width="360px">
        <v-card class="rounded-lg">
            <v-card-title
                class="text-subtitle-1 font-weight-bold pa-4 d-flex align-center"
            >
                <IconHelpCircle :size="18" color="#1565c0" class="mr-2" />
                Konfirmasi
            </v-card-title>
            <v-card-text class="pa-4 pt-0 text-body-2">
                Yakin ingin menyimpan data bahan MMT ini?
            </v-card-text>
            <v-card-actions class="pa-3 border-t justify-end ga-2">
                <v-btn
                    variant="text"
                    size="small"
                    @click="confirmMmtSave = false"
                    >Batal</v-btn
                >
                <v-btn
                    color="primary"
                    variant="elevated"
                    size="small"
                    @click="executeSaveMmt"
                    >Ya, Simpan</v-btn
                >
            </v-card-actions>
        </v-card>
    </v-dialog>

    <!-- CONFIRM DIALOG TOPPING -->
    <v-dialog v-model="confirmToppingSave" max-width="360px">
        <v-card class="rounded-lg">
            <v-card-title
                class="text-subtitle-1 font-weight-bold pa-4 d-flex align-center"
            >
                <IconHelpCircle :size="18" color="#1565c0" class="mr-2" />
                Konfirmasi
            </v-card-title>
            <v-card-text class="pa-4 pt-0 text-body-2">
                Yakin ingin menyimpan data topping MMT ini?
            </v-card-text>
            <v-card-actions class="pa-3 border-t justify-end ga-2">
                <v-btn
                    variant="text"
                    size="small"
                    @click="confirmToppingSave = false"
                    >Batal</v-btn
                >
                <v-btn
                    color="primary"
                    variant="elevated"
                    size="small"
                    @click="executeSaveTopping"
                    >Ya, Simpan</v-btn
                >
            </v-card-actions>
        </v-card>
    </v-dialog>
</template>

<style scoped>
/* ── Highlight Baris Netto (Warna Kuning Soft / Amber) ── */
:deep(tr.row-netto) {
    background-color: #fffde7 !important;
}

:deep(tr.row-netto:hover) {
    background-color: #fff9c4 !important;
}

:deep(tr.row-netto td) {
    font-weight: 600 !important;
}

.dialog-card :deep(*) {
    font-size: 11px !important;
}
</style>
