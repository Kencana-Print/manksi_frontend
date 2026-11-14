<template>
    <PageLayout title="Data Master Barang" icon="mdi-cube-outline">
        <template #header-actions>
            <v-btn size="x-small" color="success" @click="handleNew">
                <v-icon start>mdi-plus</v-icon> Baru
            </v-btn>
            <v-btn
                size="x-small"
                color="warning"
                :disabled="!isSingleSelected"
                @click="handleEditClick"
            >
                <v-icon start>mdi-pencil</v-icon> Ubah
            </v-btn>
            <v-btn size="x-small" color="info" @click="btnRefreshClick">
                <v-icon start>mdi-refresh</v-icon> Refresh
            </v-btn>
        </template>

        <div class="browse-content">
            <v-card flat class="mb-4">
                <v-card-text>
                    <div
                        class="filter-section d-flex align-center flex-wrap ga-4"
                    >
                        <v-text-field
                            v-model="filters.keyword"
                            label="Cari Kode / Nama Barang"
                            density="compact"
                            hide-details
                            variant="outlined"
                            style="max-width: 340px"
                            prepend-inner-icon="mdi-magnify"
                        />
                        <v-spacer />
                    </div>
                </v-card-text>
            </v-card>

            <div class="table-container">
                <v-data-table
                    v-model:selected="selected"
                    :headers="headers"
                    :items="filteredMasterData"
                    :loading="loading"
                    :row-props="rowProps"
                    item-value="Kode"
                    density="compact"
                    fixed-header
                    class="desktop-table elevation-1"
                    return-object
                    show-select
                    select-strategy="single"
                    @click:row="handleRowClick"
                >
                </v-data-table>
            </div>
        </div>
    </PageLayout>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, reactive } from "vue";
import { useRouter } from "vue-router";
import { useToast } from "vue-toastification";
import { useAuthStore } from "@/stores/authStore";
import api from "@/services/api";
import PageLayout from "@/components/PageLayout.vue";

interface MasterBarang {
    Kode: string;
    Nama: string;
    GudangDefault: string;
    Jenis?: string;
    Satuan?: string;
    Panjang?: number | string;
    Lebar?: number | string;
    [key: string]: any;
}

const API_MASTER_BARANG = "/master/bahan/mmt";
const FORM_NAME = "frmBrowBarang";

const router = useRouter();
const toast = useToast();
const authStore = useAuthStore();

const masterData = ref<MasterBarang[]>([]);
const selected = ref<MasterBarang[]>([]);
const loading = ref(true);

const filters = reactive({
    keyword: "",
});

const headers = [
    { title: "Kode", key: "Kode", width: "120px", fixed: true },
    { title: "Nama", key: "Nama", width: "300px" },
    { title: "Gudang Default", key: "GudangDefault", width: "140px" },
    { title: "Jenis", key: "Jenis", width: "100px" },
    { title: "Satuan", key: "Satuan", width: "100px" },
    { title: "Panjang", key: "Panjang", width: "100px", align: "end" as const },
    { title: "Lebar", key: "Lebar", width: "100px", align: "end" as const },
];

const isSingleSelected = computed(() => selected.value.length === 1);
const selectedKode = computed(() => {
    if (!selected.value.length) return "";
    const first: any = selected.value[0];
    return String(first?.Kode ?? first?.raw?.Kode ?? first?.value?.Kode ?? "");
});

const btnRefreshClick = async () => {
    loading.value = true;
    try {
        const response = await api.get(API_MASTER_BARANG);
        const res = response.data;
        masterData.value =
            (Array.isArray(res) && res) ||
            (Array.isArray(res.data) && res.data) ||
            (Array.isArray(res.result) && res.result) ||
            [];
        selected.value = [];
    } catch (error) {
        toast.error("Gagal mengambil data Master Barang.");
    } finally {
        loading.value = false;
    }
};

const hasAccess = (type: "insert" | "edit") => {
    const permissions = (authStore.permissions as any) ?? [];

    if (!Array.isArray(permissions) || permissions.length === 0) return true;

    const found = permissions.find(
        (p: any) => String(p?.form ?? p?.module ?? p?.menu ?? "") === FORM_NAME,
    );

    if (!found) return true;

    if (type === "insert") {
        return Boolean(found.insert ?? found.canInsert ?? found.tambah ?? true);
    }

    return Boolean(found.edit ?? found.canEdit ?? found.ubah ?? true);
};

const handleNew = () => {
    if (!hasAccess("insert")) {
        toast.warning("Anda tidak berhak menambah data di modul ini.");
        return;
    }
    router.push({ name: 'MasterBahanMmtCreate' });
};

const handleEditClick = async () => {
    if (!selectedKode.value) return;

    if (!hasAccess("edit")) {
        toast.warning("Anda tidak berhak mengubah data di modul ini.");
        return;
    }

    try {
        await api.get(
            `${API_MASTER_BARANG}/${encodeURIComponent(selectedKode.value)}`,
        );
    } catch (error) {
        toast.error(
            "Data barang tidak ditemukan atau gagal dimuat untuk mode ubah.",
        );
        return;
    }

    router.push({
        name: 'MasterBahanMmtCreate',
        query: { kode: selectedKode.value, mode: "edit" },
    });
};

const handleRowClick = (_event: unknown, payload: any) => {
    const row = payload?.item ?? payload;
    const raw = row?.raw ?? row;
    if (!raw?.Kode) return;
    selected.value = [raw];
};

const rowProps = ({ item }: any) => {
    const raw = item?.raw ?? item;
    const kode = String(raw?.Kode ?? "");
    const isActive = kode && kode === selectedKode.value;

    return {
        class: isActive ? "row-selected" : "",
    };
};

const filteredMasterData = computed(() => {
    const keyword = filters.keyword.trim().toLowerCase();
    if (!keyword) return masterData.value;
    return masterData.value.filter((item) => {
        return (
            String(item.Kode).toLowerCase().includes(keyword) ||
            String(item.Nama).toLowerCase().includes(keyword) ||
            String(item.GudangDefault ?? "")
                .toLowerCase()
                .includes(keyword) ||
            String(item.Jenis ?? "")
                .toLowerCase()
                .includes(keyword) ||
            String(item.Satuan ?? "")
                .toLowerCase()
                .includes(keyword) ||
            String(item.Panjang ?? "")
                .toLowerCase()
                .includes(keyword) ||
            String(item.Lebar ?? "")
                .toLowerCase()
                .includes(keyword)
        );
    });
});

onMounted(() => {
    btnRefreshClick();
});
</script>

<style scoped>
.browse-content {
    padding: 12px;
}

.table-container {
    height: calc(100vh - 220px);
}

:deep(.v-data-table) {
    height: 100%;
}

:deep(.v-data-table .row-selected) {
    background-color: #e8eaf6 !important;
}

:deep(.v-data-table .row-selected:hover) {
    background-color: #dfe4fb !important;
}
</style>
