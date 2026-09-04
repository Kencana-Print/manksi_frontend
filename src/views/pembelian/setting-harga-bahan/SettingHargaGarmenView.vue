<script setup lang="ts">
import { ref, reactive, computed, watch } from "vue";
import { useToast } from "vue-toastification";
import { IconShirt, IconHelpCircle, IconTags } from "@tabler/icons-vue";
import { useBrowse } from "@/composables/useBrowse";
import BaseBrowse from "@/components/BaseBrowse.vue";
import { settingHargaBahanService } from "@/services/pembelian/settingHargaBahanService";
import { exportExcelSingle } from "@/utils/excelExport";

const toast = useToast();

// Mode aktif: 'kain' atau 'tambahan'
const activeSub = ref<"kain" | "tambahan">("kain");

// ==========================================
// 1. DATA MASTER KAIN GARMEN
// ==========================================
const {
    items: kainItems,
    isLoading: kainLoading,
    canInsert,
    canEdit,
    canDelete,
    canExport,
    selected: kainSelected,
    fetchData: fetchKain,
} = useBrowse({
    menuId: "210",
    fetchApi: async () => {
        const res = await settingHargaBahanService.getKainGarmen();
        return res.data.data;
    },
});

const kainHeaders = [
    { title: "KODE", key: "mhk_kode", width: "90px" },
    { title: "KATEGORI", key: "mhk_ktg", width: "110px" },
    { title: "JENIS KAIN", key: "mhk_jeniskain", minWidth: "180px" },
    { title: "WARNA", key: "mhk_warna", width: "100px" },
    { title: "LENGAN", key: "mhk_lengan", width: "90px" },
    { title: "KOMPONEN", key: "mhk_komponen", width: "100px" },
    {
        title: "BABARAN (KG)",
        key: "mhk_babaran",
        width: "110px",
        align: "end" as const,
    },
    {
        title: "HARGA / KG (RP)",
        key: "mhk_harga",
        width: "140px",
        align: "end" as const,
    },
    {
        title: "ALLOWANCE (%)",
        key: "mhk_allow",
        width: "110px",
        align: "end" as const,
    },
];

// ==========================================
// 2. DATA TAMBAHAN / CUSTOM GARMEN
// ==========================================
const {
    items: tambahanItems,
    isLoading: tambahanLoading,
    selected: tambahanSelected,
    fetchData: fetchTambahan,
} = useBrowse({
    menuId: "210",
    fetchApi: async () => {
        const res = await settingHargaBahanService.getTambahanGarmen();
        return res.data.data;
    },
});

const tambahanHeaders = [
    { title: "KETERANGAN ITEM CUSTOM", key: "mht_ket", minWidth: "250px" },
    {
        title: "LACOST (RP)",
        key: "mht_lacost",
        width: "160px",
        align: "end" as const,
    },
    {
        title: "COTTON (RP)",
        key: "mht_cotton",
        width: "160px",
        align: "end" as const,
    },
    { title: "PE (RP)", key: "mht_pe", width: "160px", align: "end" as const },
];

// Refresh data ketika mode berganti
watch(activeSub, (newVal) => {
    if (newVal === "kain") {
        fetchKain();
    } else {
        fetchTambahan();
    }
});

// ==========================================
// DIALOG STATES & HANDLERS
// ==========================================
const kainDialog = ref(false);
const isEditKain = ref(false);
const confirmKainSave = ref(false);

const kainForm = reactive({
    mhk_kode: "",
    mhk_ktg: "COTTON",
    mhk_jeniskain: "",
    mhk_lengan: "",
    mhk_komponen: "BODY",
    mhk_babaran: 0,
    mhk_warna: "MUDA",
    mhk_harga: 0,
    mhk_allow: 17,
    old_jeniskain: "",
    old_warna: "",
    old_komponen: "",
    old_lengan: "",
});

const tambahanDialog = ref(false);
const isEditTambahan = ref(false);
const oldTambahanKet = ref("");
const confirmTambahanSave = ref(false);

const tambahanForm = reactive({
    mht_ket: "",
    mht_lacost: 0,
    mht_cotton: 0,
    mht_pe: 0,
});

// HANDLERS UTAMA UNTUK BASE BROWSE
const handleAdd = () => {
    if (activeSub.value === "kain") {
        isEditKain.value = false;
        Object.assign(kainForm, {
            mhk_kode: "",
            mhk_ktg: "COTTON",
            mhk_jeniskain: "",
            mhk_lengan: "",
            mhk_komponen: "BODY",
            mhk_babaran: 0,
            mhk_warna: "MUDA",
            mhk_harga: 0,
            mhk_allow: 17,
            old_jeniskain: "",
            old_warna: "",
            old_komponen: "",
            old_lengan: "",
        });
        kainDialog.value = true;
    } else {
        isEditTambahan.value = false;
        oldTambahanKet.value = "";
        Object.assign(tambahanForm, {
            mht_ket: "",
            mht_lacost: 0,
            mht_cotton: 0,
            mht_pe: 0,
        });
        tambahanDialog.value = true;
    }
};

const handleEdit = (item: any) => {
    if (activeSub.value === "kain") {
        isEditKain.value = true;
        Object.assign(kainForm, {
            ...item,
            old_jeniskain: item.mhk_jeniskain,
            old_warna: item.mhk_warna,
            old_komponen: item.mhk_komponen,
            old_lengan: item.mhk_lengan,
        });
        kainDialog.value = true;
    } else {
        isEditTambahan.value = true;
        oldTambahanKet.value = item.mht_ket;
        Object.assign(tambahanForm, {
            mht_ket: item.mht_ket,
            mht_lacost: Number(item.mht_lacost) || 0,
            mht_cotton: Number(item.mht_cotton) || 0,
            mht_pe: Number(item.mht_pe) || 0,
        });
        tambahanDialog.value = true;
    }
};

const handleDelete = async (item: any) => {
    if (activeSub.value === "kain") {
        try {
            await settingHargaBahanService.deleteKainGarmen(item);
            toast.success(
                `Harga kain ${item.mhk_jeniskain} (${item.mhk_warna}) berhasil dihapus`,
            );
            fetchKain();
        } catch (err: any) {
            toast.error(err.response?.data?.message || "Gagal menghapus kain");
        }
    } else {
        try {
            await settingHargaBahanService.deleteTambahanGarmen(item.mht_ket);
            toast.success(`Biaya tambahan "${item.mht_ket}" berhasil dihapus`);
            fetchTambahan();
        } catch (err: any) {
            toast.error(
                err.response?.data?.message || "Gagal menghapus biaya tambahan",
            );
        }
    }
};

const handleRefresh = () => {
    if (activeSub.value === "kain") fetchKain();
    else fetchTambahan();
};

const handleExport = () => {
    if (activeSub.value === "kain") {
        exportExcelSingle(
            "Master_Kain_Garmen.xlsx",
            "Kain Garmen",
            [
                { key: "mhk_kode", header: "KODE", width: 12 },
                { key: "mhk_ktg", header: "KATEGORI", width: 15 },
                { key: "mhk_jeniskain", header: "JENIS KAIN", width: 25 },
                { key: "mhk_warna", header: "WARNA", width: 15 },
                { key: "mhk_lengan", header: "LENGAN", width: 12 },
                { key: "mhk_komponen", header: "KOMPONEN", width: 15 },
                {
                    key: "mhk_babaran",
                    header: "BABARAN",
                    width: 12,
                    numFmt: "#,##0.00",
                },
                {
                    key: "mhk_harga",
                    header: "HARGA",
                    width: 15,
                    numFmt: "Rp #,##0",
                },
                {
                    key: "mhk_allow",
                    header: "ALLOWANCE",
                    width: 12,
                    numFmt: "0.00%",
                },
            ],
            kainItems.value ?? [],
            "Master Kain Garmen",
        );
    } else {
        exportExcelSingle(
            "Biaya_Tambahan_Garmen.xlsx",
            "Tambahan Garmen",
            [
                { key: "mht_ket", header: "KETERANGAN", width: 30 },
                {
                    key: "mht_lacost",
                    header: "LACOST (RP)",
                    width: 18,
                    numFmt: "Rp #,##0",
                },
                {
                    key: "mht_cotton",
                    header: "COTTON (RP)",
                    width: 18,
                    numFmt: "Rp #,##0",
                },
                {
                    key: "mht_pe",
                    header: "PE (RP)",
                    width: 18,
                    numFmt: "Rp #,##0",
                },
            ],
            tambahanItems.value ?? [],
            "Biaya Custom Tambahan Garmen",
        );
    }
};

const submitKain = () => {
    if (!kainForm.mhk_jeniskain.trim() || !kainForm.mhk_warna.trim()) {
        toast.error("Jenis kain dan warna wajib diisi");
        return;
    }
    confirmKainSave.value = true;
};

const executeSaveKain = async () => {
    try {
        if (isEditKain.value) {
            await settingHargaBahanService.updateKainGarmen("update", kainForm);
            toast.success("Harga kain berhasil diperbarui");
        } else {
            await settingHargaBahanService.createKainGarmen(kainForm);
            toast.success("Harga kain berhasil ditambahkan");
        }
        confirmKainSave.value = false;
        kainDialog.value = false;
        fetchKain();
    } catch (err: any) {
        toast.error(
            err.response?.data?.message || "Gagal menyimpan harga kain",
        );
    }
};

const submitTambahan = () => {
    if (!tambahanForm.mht_ket.trim()) {
        toast.error("Keterangan item tambahan wajib diisi");
        return;
    }
    confirmTambahanSave.value = true;
};

const executeSaveTambahan = async () => {
    try {
        if (isEditTambahan.value) {
            await settingHargaBahanService.updateTambahanGarmen(
                oldTambahanKet.value,
                tambahanForm,
            );
            toast.success("Biaya tambahan berhasil diperbarui");
        } else {
            await settingHargaBahanService.createTambahanGarmen(tambahanForm);
            toast.success("Biaya tambahan berhasil ditambahkan");
        }
        confirmTambahanSave.value = false;
        tambahanDialog.value = false;
        fetchTambahan();
    } catch (err: any) {
        toast.error(
            err.response?.data?.message || "Gagal menyimpan biaya tambahan",
        );
    }
};
</script>

<template>
    <div class="h-100 d-flex flex-column">
        <!-- VIEW 1: MASTER KAIN GARMEN -->
        <BaseBrowse
            v-if="activeSub === 'kain'"
            title="Setting Harga Bahan Garmen"
            menu-id="210"
            :icon="IconShirt"
            :headers="kainHeaders"
            :items="kainItems ?? []"
            :is-loading="kainLoading"
            v-model:selected="kainSelected"
            :can-insert="canInsert"
            :can-edit="canEdit"
            :can-delete="canDelete"
            :can-export="canExport"
            item-value="mhk_jeniskain"
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
                            value="kain"
                            size="small"
                            class="text-none font-weight-bold px-3"
                        >
                            1. Master Kain
                        </v-btn>
                        <v-btn
                            value="tambahan"
                            size="small"
                            class="text-none font-weight-bold px-3"
                        >
                            2. Biaya Tambahan
                        </v-btn>
                    </v-btn-toggle>
                </div>
            </template>

            <template #item.mhk_harga="{ value }">
                <span class="font-weight-bold text-primary">
                    Rp {{ Number(value || 0).toLocaleString("id-ID") }}
                </span>
            </template>
            <template #item.mhk_babaran="{ value }">
                <span>{{ Number(value || 0).toLocaleString("id-ID") }} kg</span>
            </template>
            <template #item.mhk_allow="{ value }">
                <span>{{ value || 0 }}%</span>
            </template>
        </BaseBrowse>

        <!-- VIEW 2: BIAYA CUSTOM / TAMBAHAN GARMEN -->
        <BaseBrowse
            v-else
            title="Setting Harga Bahan Garmen"
            menu-id="210"
            :icon="IconShirt"
            :headers="tambahanHeaders"
            :items="tambahanItems ?? []"
            :is-loading="tambahanLoading"
            v-model:selected="tambahanSelected"
            :can-insert="canInsert"
            :can-edit="canEdit"
            :can-delete="canDelete"
            :can-export="canExport"
            item-value="mht_ket"
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
                            value="kain"
                            size="small"
                            class="text-none font-weight-bold px-3"
                        >
                            1. Master Kain
                        </v-btn>
                        <v-btn
                            value="tambahan"
                            size="small"
                            class="text-none font-weight-bold px-3"
                        >
                            2. Biaya Tambahan
                        </v-btn>
                    </v-btn-toggle>
                </div>
            </template>

            <template #item.mht_lacost="{ value }">
                <span>Rp {{ Number(value || 0).toLocaleString("id-ID") }}</span>
            </template>
            <template #item.mht_cotton="{ value }">
                <span>Rp {{ Number(value || 0).toLocaleString("id-ID") }}</span>
            </template>
            <template #item.mht_pe="{ value }">
                <span>Rp {{ Number(value || 0).toLocaleString("id-ID") }}</span>
            </template>
        </BaseBrowse>
    </div>

    <!-- FORM DIALOG KAIN -->
    <v-dialog v-model="kainDialog" max-width="500px" persistent>
        <v-card class="dialog-card rounded-lg">
            <v-card-title
                class="dialog-header pa-3 d-flex align-center justify-space-between bg-grey-lighten-4 border-b"
            >
                <div
                    class="d-flex align-center font-weight-bold"
                    style="font-size: 13px"
                >
                    <IconShirt :size="16" class="mr-2 text-primary" />
                    {{
                        isEditKain
                            ? "Ubah Harga Kain Garmen"
                            : "Tambah Harga Kain Garmen"
                    }}
                </div>
            </v-card-title>
            <v-card-text class="pa-4">
                <v-row dense>
                    <v-col cols="12" sm="6">
                        <v-text-field
                            v-model="kainForm.mhk_kode"
                            label="Kode Kain"
                            variant="outlined"
                            density="compact"
                            placeholder="KH-0001"
                            hide-details="auto"
                        />
                    </v-col>
                    <v-col cols="12" sm="6">
                        <v-text-field
                            v-model="kainForm.mhk_ktg"
                            label="Kategori"
                            variant="outlined"
                            density="compact"
                            placeholder="COTTON / PE / TC"
                            hide-details="auto"
                        />
                    </v-col>
                    <v-col cols="12">
                        <v-text-field
                            v-model="kainForm.mhk_jeniskain"
                            label="Jenis Kain *"
                            variant="outlined"
                            density="compact"
                            placeholder="CARDED 20S / COMBED 30S"
                            hide-details="auto"
                        />
                    </v-col>
                    <v-col cols="12" sm="6">
                        <v-text-field
                            v-model="kainForm.mhk_warna"
                            label="Kategori Warna *"
                            variant="outlined"
                            density="compact"
                            placeholder="PUTIH / MUDA / SEDANG / TUA"
                            hide-details="auto"
                        />
                    </v-col>
                    <v-col cols="12" sm="6">
                        <v-text-field
                            v-model="kainForm.mhk_komponen"
                            label="Komponen"
                            variant="outlined"
                            density="compact"
                            placeholder="BODY / RIB / KERAH"
                            hide-details="auto"
                        />
                    </v-col>
                    <v-col cols="12" sm="6">
                        <v-text-field
                            v-model="kainForm.mhk_lengan"
                            label="Lengan"
                            variant="outlined"
                            density="compact"
                            placeholder="PENDEK / PANJANG"
                            hide-details="auto"
                        />
                    </v-col>
                    <v-col cols="12" sm="6">
                        <v-text-field
                            v-model.number="kainForm.mhk_babaran"
                            label="Babaran (Kg)"
                            type="number"
                            variant="outlined"
                            density="compact"
                            hide-details="auto"
                        />
                    </v-col>
                    <v-col cols="12" sm="6">
                        <v-text-field
                            v-model.number="kainForm.mhk_harga"
                            label="Harga per Kg (Rp) *"
                            type="number"
                            variant="outlined"
                            density="compact"
                            hide-details="auto"
                        />
                    </v-col>
                    <v-col cols="12" sm="6">
                        <v-text-field
                            v-model.number="kainForm.mhk_allow"
                            label="Allowance (%)"
                            type="number"
                            variant="outlined"
                            density="compact"
                            hide-details="auto"
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
                    @click="kainDialog = false"
                    >Batal</v-btn
                >
                <v-btn
                    color="primary"
                    variant="elevated"
                    size="small"
                    @click="submitKain"
                    >Simpan</v-btn
                >
            </v-card-actions>
        </v-card>
    </v-dialog>

    <!-- FORM DIALOG TAMBAHAN -->
    <v-dialog v-model="tambahanDialog" max-width="480px" persistent>
        <v-card class="dialog-card rounded-lg">
            <v-card-title
                class="dialog-header pa-3 d-flex align-center justify-space-between bg-grey-lighten-4 border-b"
            >
                <div
                    class="d-flex align-center font-weight-bold"
                    style="font-size: 13px"
                >
                    <IconTags :size="16" class="mr-2 text-primary" />
                    {{
                        isEditTambahan
                            ? "Ubah Biaya Custom Garmen"
                            : "Tambah Biaya Custom Garmen"
                    }}
                </div>
            </v-card-title>
            <v-card-text class="pa-4">
                <v-row dense>
                    <v-col cols="12">
                        <v-text-field
                            v-model="tambahanForm.mht_ket"
                            label="Keterangan Item Custom *"
                            variant="outlined"
                            density="compact"
                            placeholder="Contoh: KRAH BIASA DAN KANCING"
                            hide-details="auto"
                        />
                    </v-col>
                    <v-col cols="12">
                        <v-text-field
                            v-model.number="tambahanForm.mht_lacost"
                            label="Tambahan Bahan Lacost (Rp)"
                            type="number"
                            variant="outlined"
                            density="compact"
                            hide-details="auto"
                        />
                    </v-col>
                    <v-col cols="12">
                        <v-text-field
                            v-model.number="tambahanForm.mht_cotton"
                            label="Tambahan Bahan Cotton (Rp)"
                            type="number"
                            variant="outlined"
                            density="compact"
                            hide-details="auto"
                        />
                    </v-col>
                    <v-col cols="12">
                        <v-text-field
                            v-model.number="tambahanForm.mht_pe"
                            label="Tambahan Bahan PE (Rp)"
                            type="number"
                            variant="outlined"
                            density="compact"
                            hide-details="auto"
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
                    @click="tambahanDialog = false"
                    >Batal</v-btn
                >
                <v-btn
                    color="primary"
                    variant="elevated"
                    size="small"
                    @click="submitTambahan"
                    >Simpan</v-btn
                >
            </v-card-actions>
        </v-card>
    </v-dialog>

    <!-- CONFIRM DIALOG KAIN -->
    <v-dialog v-model="confirmKainSave" max-width="360px">
        <v-card class="rounded-lg">
            <v-card-title
                class="text-subtitle-1 font-weight-bold pa-4 d-flex align-center"
            >
                <IconHelpCircle :size="18" color="#1565c0" class="mr-2" />
                Konfirmasi
            </v-card-title>
            <v-card-text class="pa-4 pt-0 text-body-2">
                Yakin ingin menyimpan harga kain garmen ini?
            </v-card-text>
            <v-card-actions class="pa-3 border-t justify-end ga-2">
                <v-btn
                    variant="text"
                    size="small"
                    @click="confirmKainSave = false"
                    >Batal</v-btn
                >
                <v-btn
                    color="primary"
                    variant="elevated"
                    size="small"
                    @click="executeSaveKain"
                    >Ya, Simpan</v-btn
                >
            </v-card-actions>
        </v-card>
    </v-dialog>

    <!-- CONFIRM DIALOG TAMBAHAN -->
    <v-dialog v-model="confirmTambahanSave" max-width="360px">
        <v-card class="rounded-lg">
            <v-card-title
                class="text-subtitle-1 font-weight-bold pa-4 d-flex align-center"
            >
                <IconHelpCircle :size="18" color="#1565c0" class="mr-2" />
                Konfirmasi
            </v-card-title>
            <v-card-text class="pa-4 pt-0 text-body-2">
                Yakin ingin menyimpan biaya custom garmen ini?
            </v-card-text>
            <v-card-actions class="pa-3 border-t justify-end ga-2">
                <v-btn
                    variant="text"
                    size="small"
                    @click="confirmTambahanSave = false"
                    >Batal</v-btn
                >
                <v-btn
                    color="primary"
                    variant="elevated"
                    size="small"
                    @click="executeSaveTambahan"
                    >Ya, Simpan</v-btn
                >
            </v-card-actions>
        </v-card>
    </v-dialog>
</template>

<style scoped>
.dialog-card :deep(*) {
    font-size: 11px !important;
}
</style>
