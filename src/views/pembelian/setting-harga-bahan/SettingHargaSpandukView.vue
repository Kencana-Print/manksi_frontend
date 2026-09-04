<script setup lang="ts">
import { ref } from "vue";
import { useToast } from "vue-toastification";
import { IconFlag, IconHelpCircle } from "@tabler/icons-vue";
import { useBrowse } from "@/composables/useBrowse";
import BaseBrowse from "@/components/BaseBrowse.vue";
import { settingHargaBahanService } from "@/services/pembelian/settingHargaBahanService";

const toast = useToast();

const {
    items,
    isLoading,
    canInsert,
    canEdit,
    canDelete,
    canExport,
    selected,
    fetchData,
    exportToExcel,
} = useBrowse({
    menuId: "212",
    fetchApi: async () => {
        const res = await settingHargaBahanService.getSpanduk();
        return res.data.data;
    },
});

const headers = [
    { title: "ID", key: "id", width: "70px", align: "center" as const },
    { title: "METODE CETAK", key: "metode", width: "140px" },
    {
        title: "LEBAR (CM)",
        key: "lebar",
        width: "110px",
        align: "end" as const,
    },
    { title: "JENIS KAIN", key: "jenis_kain", minWidth: "180px" },
    {
        title: "MIN Panjang (m)",
        key: "qmin",
        width: "130px",
        align: "end" as const,
    },
    {
        title: "MAX Panjang (m)",
        key: "qmax",
        width: "130px",
        align: "end" as const,
    },
    {
        title: "TARIF / M",
        key: "harga",
        width: "150px",
        align: "end" as const,
    },
];

const showDialog = ref(false);
const isNewMode = ref(true);
const selectedId = ref<number | null>(null);
const confirmSaveDialog = ref(false);

const formData = ref({
    metode: "MANUAL",
    lebar: 90,
    jenis_kain: "POLYESTER 50/36",
    qmin: 100,
    qmax: 299,
    harga: 0,
});

const handleAdd = () => {
    isNewMode.value = true;
    selectedId.value = null;
    formData.value = {
        metode: "MANUAL",
        lebar: 90,
        jenis_kain: "POLYESTER 50/36",
        qmin: 100,
        qmax: 299,
        harga: 9750,
    };
    showDialog.value = true;
};

const handleEdit = (item: any) => {
    isNewMode.value = false;
    selectedId.value = item.id;
    formData.value = {
        metode: item.metode,
        lebar: Number(item.lebar) || 90,
        jenis_kain: item.jenis_kain,
        qmin: Number(item.qmin) || 0,
        qmax: Number(item.qmax) || 999999,
        harga: Number(item.harga) || 0,
    };
    showDialog.value = true;
};

const handleDelete = async (item: any) => {
    try {
        await settingHargaBahanService.deleteSpanduk(item.id);
        toast.success(`Strata ${item.jenis_kain} berhasil dihapus.`);
        fetchData();
    } catch (err: any) {
        toast.error(err.response?.data?.message || "Gagal menghapus data");
    }
};

const submitForm = () => {
    if (!formData.value.lebar || Number(formData.value.lebar) <= 0) {
        toast.error("Lebar kain (cm) wajib diisi dengan angka valid");
        return;
    }
    if (!formData.value.jenis_kain.trim()) {
        toast.error("Jenis kain wajib diisi");
        return;
    }
    confirmSaveDialog.value = true;
};

const executeSave = async () => {
    try {
        if (isNewMode.value) {
            await settingHargaBahanService.createSpanduk(formData.value);
            toast.success("Strata spanduk berhasil ditambahkan");
        } else if (selectedId.value) {
            await settingHargaBahanService.updateSpanduk(
                selectedId.value,
                formData.value,
            );
            toast.success("Strata spanduk berhasil diperbarui");
        }
        confirmSaveDialog.value = false;
        showDialog.value = false;
        fetchData();
    } catch (err: any) {
        toast.error(err.response?.data?.message || "Gagal menyimpan data");
    }
};
</script>

<template>
    <BaseBrowse
        title="Setting Harga Bahan Spanduk"
        menu-id="212"
        :icon="IconFlag"
        :headers="headers"
        :items="items ?? []"
        :is-loading="isLoading"
        v-model:selected="selected"
        :can-insert="canInsert"
        :can-edit="canEdit"
        :can-delete="canDelete"
        :can-export="canExport"
        item-value="id"
        @refresh="fetchData"
        @add="handleAdd"
        @edit="handleEdit"
        @delete="handleDelete"
        @export="exportToExcel('Setting_Harga_Spanduk')"
    >
        <template #item.metode="{ value }">
            <v-chip
                size="x-small"
                :color="value === 'MANUAL' ? 'primary' : 'purple'"
                variant="tonal"
                class="font-weight-bold"
            >
                {{ value }}
            </v-chip>
        </template>
        <template #item.lebar="{ value }">
            <span>{{ value }} cm</span>
        </template>
        <template #item.qmin="{ value }">
            <span>{{ Number(value || 0).toLocaleString("id-ID") }} m</span>
        </template>
        <template #item.qmax="{ value }">
            <span>{{
                Number(value) >= 99999
                    ? "≥ " + Number(value || 0).toLocaleString("id-ID") + " m"
                    : Number(value || 0).toLocaleString("id-ID") + " m"
            }}</span>
        </template>
        <template #item.harga="{ value }">
            <span class="font-weight-bold text-primary">
                Rp {{ Number(value || 0).toLocaleString("id-ID") }}
            </span>
        </template>
    </BaseBrowse>

    <!-- FORM DIALOG (Tema Khas Manksi) -->
    <v-dialog v-model="showDialog" max-width="480px" persistent>
        <v-card class="dialog-card rounded-lg">
            <v-card-title
                class="dialog-header pa-3 d-flex align-center justify-space-between bg-grey-lighten-4 border-b"
            >
                <div
                    class="d-flex align-center font-weight-bold"
                    style="font-size: 13px"
                >
                    <IconFlag :size="16" class="mr-2 text-primary" />
                    {{
                        isNewMode
                            ? "Tambah Strata Spanduk"
                            : "Ubah Strata Spanduk"
                    }}
                </div>
            </v-card-title>

            <v-card-text class="pa-4">
                <v-row dense>
                    <v-col cols="12" sm="6">
                        <v-select
                            v-model="formData.metode"
                            :items="['MANUAL', 'MACHINE']"
                            label="Metode Cetak *"
                            variant="outlined"
                            density="compact"
                            hide-details="auto"
                        />
                    </v-col>
                    <v-col cols="12" sm="6">
                        <v-text-field
                            v-model.number="formData.lebar"
                            label="Lebar Kain (cm) *"
                            type="number"
                            placeholder="Contoh: 90 / 115"
                            variant="outlined"
                            density="compact"
                            hide-details="auto"
                        />
                    </v-col>
                    <v-col cols="12">
                        <v-text-field
                            v-model="formData.jenis_kain"
                            label="Jenis Kain *"
                            variant="outlined"
                            density="compact"
                            placeholder="POLYESTER 50/36 / OPTIC 70/40"
                            hide-details="auto"
                        />
                    </v-col>
                    <v-col cols="12" sm="6">
                        <v-text-field
                            v-model.number="formData.qmin"
                            label="Batas Bawah Meter (qmin) *"
                            type="number"
                            variant="outlined"
                            density="compact"
                            hide-details="auto"
                        />
                    </v-col>
                    <v-col cols="12" sm="6">
                        <v-text-field
                            v-model.number="formData.qmax"
                            label="Batas Atas Meter (qmax) *"
                            type="number"
                            variant="outlined"
                            density="compact"
                            hint="999999 = tanpa batas"
                            persistent-hint
                        />
                    </v-col>
                    <v-col cols="12">
                        <v-text-field
                            v-model.number="formData.harga"
                            label="Tarif per Meter (Rp) *"
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
                    @click="showDialog = false"
                    >Batal</v-btn
                >
                <v-btn
                    color="primary"
                    variant="elevated"
                    size="small"
                    @click="submitForm"
                    >Simpan</v-btn
                >
            </v-card-actions>
        </v-card>
    </v-dialog>

    <!-- CONFIRM DIALOG -->
    <v-dialog v-model="confirmSaveDialog" max-width="360px">
        <v-card class="rounded-lg">
            <v-card-title
                class="text-subtitle-1 font-weight-bold pa-4 d-flex align-center"
            >
                <IconHelpCircle :size="18" color="#1565c0" class="mr-2" />
                Konfirmasi
            </v-card-title>
            <v-card-text class="pa-4 pt-0 text-body-2">
                Yakin ingin menyimpan data strata spanduk ini?
            </v-card-text>
            <v-card-actions class="pa-3 border-t justify-end ga-2">
                <v-btn
                    variant="text"
                    size="small"
                    @click="confirmSaveDialog = false"
                    >Batal</v-btn
                >
                <v-btn
                    color="primary"
                    variant="elevated"
                    size="small"
                    @click="executeSave"
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
