<script setup lang="ts">
import { ref, watch, computed } from "vue";
import api from "@/services/api";
import { useToast } from "vue-toastification";
import {
    IconShoppingCart,
    IconSearch,
    IconDatabaseOff,
} from "@tabler/icons-vue";

interface PoLookupItem {
    Nomor: string;
    Tanggal: string;
    Supplier: string;
    NamaSupplier?: string;
    NomorRequest?: string;
    TotalHarga?: number;
    Status?: string;
    [key: string]: any;
}

const props = defineProps<{
    modelValue: boolean;
}>();

const emit = defineEmits<{
    (e: "update:modelValue", value: boolean): void;
    (e: "selected", item: PoLookupItem): void;
}>();

const toast = useToast();

const search = ref("");
const items = ref<PoLookupItem[]>([]);
const isLoading = ref(false);
const statusFilter = ref<"ALL" | "ACTIVE" | "CLOSE">("ALL");

const fetchData = async () => {
    isLoading.value = true;
    try {
        const res = await api.get("/mmt/bahan-baku-produksi/penerimaan-bahan/po/lookup", {
            params: { q: search.value.trim() },
        });
        const rawData: PoLookupItem[] = res.data?.data || (Array.isArray(res.data) ? res.data : []);

        // Prioritas sorting: OPEN/ONPROSES di atas, CLOSE di bawah
        items.value = [...rawData].sort((a, b) => {
            const isClosedA = a.Status === "CLOSED" || a.Status === "CLOSE" ? 1 : 0;
            const isClosedB = b.Status === "CLOSED" || b.Status === "CLOSE" ? 1 : 0;
            const diff = isClosedA - isClosedB;
            if (diff !== 0) return diff;
            return (b.Nomor || "").localeCompare(a.Nomor || "");
        });
    } catch (err: any) {
        console.error("Gagal load lookup PO penerimaan:", err);
        items.value = [];
    } finally {
        isLoading.value = false;
    }
};

let debounceTimer: ReturnType<typeof setTimeout> | null = null;
const onSearch = (val: string) => {
    search.value = val;
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(fetchData, 300);
};

const countActive = computed(() => {
    return items.value.filter(
        (it) => it.Status === "OPEN" || it.Status === "ONPROSES" || !it.Status,
    ).length;
});

const countClose = computed(() => {
    return items.value.filter(
        (it) => it.Status === "CLOSED" || it.Status === "CLOSE",
    ).length;
});

const filteredItems = computed(() => {
    if (statusFilter.value === "ACTIVE") {
        return items.value.filter(
            (it) => it.Status === "OPEN" || it.Status === "ONPROSES" || !it.Status,
        );
    }
    if (statusFilter.value === "CLOSE") {
        return items.value.filter(
            (it) => it.Status === "CLOSED" || it.Status === "CLOSE",
        );
    }
    return items.value;
});

watch(
    () => props.modelValue,
    (isOpen) => {
        if (isOpen) {
            search.value = "";
            statusFilter.value = "ALL";
            fetchData();
        }
    },
);

const isItemClosed = (item: PoLookupItem) => {
    return item.Status === "CLOSED" || item.Status === "CLOSE";
};

const selectItem = (item: PoLookupItem) => {
    if (isItemClosed(item)) {
        toast.warning("PO ini sudah selesai/ditutup dan tidak dapat dipilih kembali.");
        return;
    }
    emit("selected", item);
    emit("update:modelValue", false);
};

const getStatusBadgeClass = (status?: string) => {
    switch (status) {
        case "OPEN":
            return "badge-open";
        case "ONPROSES":
            return "badge-onproses";
        case "CLOSED":
        case "CLOSE":
            return "badge-close";
        default:
            return "badge-open";
    }
};

const formatCurrency = (val?: number) => {
    if (val === undefined || val === null || isNaN(Number(val))) return "-";
    return Number(val).toLocaleString("id-ID");
};
</script>

<template>
    <v-dialog
        :model-value="modelValue"
        @update:model-value="emit('update:modelValue', $event)"
        max-width="980px"
    >
        <div class="lookup-card">
            <!-- Header Modal Khas MMT / Manksi -->
            <div class="lookup-header">
                <IconShoppingCart :size="15" :stroke-width="1.7" color="white" />
                <span>Pilih Purchase Order (PO) Bahan</span>
                <v-spacer />
                <button
                    class="lookup-close"
                    @click="emit('update:modelValue', false)"
                    title="Tutup (Esc)"
                >
                    ✕
                </button>
            </div>

            <!-- Search Bar & Status Filter Pills -->
            <div class="lookup-search">
                <div class="search-input-wrap">
                    <IconSearch :size="15" :stroke-width="1.7" color="#9e9e9e" />
                    <input
                        :value="search"
                        @input="onSearch(($event.target as HTMLInputElement).value)"
                        type="text"
                        placeholder="Cari no. PO, supplier, atau nomor permintaan..."
                        class="search-input"
                        autofocus
                    />
                    <button
                        v-if="search"
                        class="search-clear"
                        @click="onSearch('')"
                        title="Hapus pencarian"
                    >
                        ✕
                    </button>
                </div>

                <!-- Filter Pills -->
                <div class="filter-pills">
                    <button
                        type="button"
                        class="pill-btn"
                        :class="{ active: statusFilter === 'ALL' }"
                        @click="statusFilter = 'ALL'"
                    >
                        Semua ({{ items.length }})
                    </button>
                    <button
                        type="button"
                        class="pill-btn pill-active"
                        :class="{ active: statusFilter === 'ACTIVE' }"
                        @click="statusFilter = 'ACTIVE'"
                    >
                        Bisa Diterima ({{ countActive }})
                    </button>
                    <button
                        type="button"
                        class="pill-btn pill-close"
                        :class="{ active: statusFilter === 'CLOSE' }"
                        @click="statusFilter = 'CLOSE'"
                    >
                        Selesai ({{ countClose }})
                    </button>
                </div>
            </div>

            <!-- Table Content -->
            <div class="lookup-table-wrap">
                <div v-if="isLoading" class="lookup-state">
                    <v-progress-circular indeterminate color="primary" size="24" />
                    <span>Memuat data PO...</span>
                </div>
                <div v-else-if="filteredItems.length === 0" class="lookup-state">
                    <IconDatabaseOff :size="28" :stroke-width="1.5" class="mb-2 text-grey" />
                    <span>Tidak ada dokumen PO ditemukan</span>
                </div>
                <table v-else class="lookup-table">
                    <thead>
                        <tr>
                            <th style="width: 170px" class="text-left">NO. PO</th>
                            <th style="width: 100px" class="text-center">TANGGAL</th>
                            <th class="text-left">SUPPLIER</th>
                            <th style="width: 170px" class="text-left">NO. PERMINTAAN</th>
                            <th style="width: 125px" class="text-right">TOTAL NILAI</th>
                            <th style="width: 100px" class="text-center">STATUS</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr
                            v-for="item in filteredItems"
                            :key="item.Nomor"
                            class="lookup-row"
                            :class="{ 'row-closed': isItemClosed(item) }"
                            @click="selectItem(item)"
                        >
                            <td class="text-left td-kode" :class="{ 'text-strike': isItemClosed(item) }">
                                {{ item.Nomor }}
                            </td>
                            <td class="text-center">{{ item.Tanggal }}</td>
                            <td class="text-left">
                                <div class="sup-nama">{{ item.NamaSupplier || item.Supplier || "-" }}</div>
                                <div v-if="item.NamaSupplier && item.Supplier" class="sup-kode">
                                    {{ item.Supplier }}
                                </div>
                            </td>
                            <td class="text-left">{{ item.NomorRequest || "-" }}</td>
                            <td class="text-right font-weight-medium">
                                {{ formatCurrency(item.TotalHarga) }}
                            </td>
                            <td class="text-center">
                                <span class="status-badge" :class="getStatusBadgeClass(item.Status)">
                                    {{ item.Status || "OPEN" }}
                                </span>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <!-- Footer -->
            <div class="lookup-footer">
                <span class="footer-count">
                    Menampilkan {{ filteredItems.length }} dari {{ items.length }} data PO
                </span>
                <button
                    type="button"
                    class="btn-batal"
                    @click="emit('update:modelValue', false)"
                >
                    Batal
                </button>
            </div>
        </div>
    </v-dialog>
</template>

<style scoped>
.lookup-card {
    background: white;
    border-radius: 8px;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    font-family: "Segoe UI", system-ui, sans-serif;
    font-size: 12px;
    max-height: 85vh;
}

/* Header */
.lookup-header {
    display: flex;
    align-items: center;
    background: #1565c0;
    color: white;
    padding: 8px 14px;
    font-size: 13px;
    font-weight: 700;
    flex-shrink: 0;
    gap: 6px;
}

.lookup-close {
    background: transparent;
    border: none;
    color: rgba(255, 255, 255, 0.8);
    font-size: 15px;
    cursor: pointer;
    line-height: 1;
}

.lookup-close:hover {
    color: white;
}

/* Search Bar */
.lookup-search {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 8px 14px;
    border-bottom: 1px solid #e0e0e0;
    background: #fafafa;
    flex-wrap: wrap;
}

.search-input-wrap {
    display: flex;
    align-items: center;
    gap: 6px;
    flex: 1;
    min-width: 250px;
    background: white;
    border: 1px solid #ccc;
    border-radius: 4px;
    padding: 3px 8px;
    height: 28px;
}

.search-input {
    flex: 1;
    border: none;
    outline: none;
    font-size: 12px;
    background: transparent;
}

.search-clear {
    background: transparent;
    border: none;
    color: #9e9e9e;
    cursor: pointer;
    font-size: 12px;
}

.search-clear:hover {
    color: #333;
}

/* Filter Pills */
.filter-pills {
    display: flex;
    align-items: center;
    gap: 4px;
}

.pill-btn {
    padding: 3px 8px;
    border: 1px solid #ddd;
    border-radius: 3px;
    background: white;
    font-size: 11px;
    cursor: pointer;
    color: #555;
    transition: all 0.12s;
}

.pill-btn:hover {
    background: #f0f0f0;
}

.pill-btn.active {
    background: #1565c0;
    border-color: #1565c0;
    color: white;
    font-weight: 600;
}

.pill-active.active {
    background: #2e7d32;
    border-color: #2e7d32;
    color: white;
}

.pill-close.active {
    background: #757575;
    border-color: #757575;
    color: white;
}

/* Table Area */
.lookup-table-wrap {
    flex: 1;
    overflow-y: auto;
    min-height: 240px;
    max-height: 420px;
}

.lookup-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 40px;
    color: #9e9e9e;
}

.lookup-table {
    width: 100%;
    border-collapse: collapse;
}

.lookup-table thead tr {
    position: sticky;
    top: 0;
    background: #f5f5f5;
    z-index: 1;
}

.lookup-table th {
    padding: 7px 10px;
    font-size: 11px;
    font-weight: 700;
    color: #424242;
    border-bottom: 2px solid #e0e0e0;
    border-right: 1px solid #e8e8e8;
    white-space: nowrap;
    vertical-align: middle;
}

.lookup-table th:last-child {
    border-right: none;
}

.lookup-table td {
    padding: 6px 10px;
    font-size: 11px;
    border-bottom: 1px solid #f0f0f0;
    border-right: 1px solid #f8f8f8;
    vertical-align: middle;
}

.lookup-table td:last-child {
    border-right: none;
}

.lookup-row {
    cursor: pointer;
    transition: background-color 0.1s;
}

.lookup-row:hover td {
    background: #e3f2fd;
}

.td-kode {
    font-family: monospace;
    font-weight: 600;
    color: #1565c0;
}

.sup-nama {
    font-weight: 500;
    color: #333;
}

.sup-kode {
    font-size: 10px;
    color: #888;
}

/* Status Badges */
.status-badge {
    display: inline-block;
    padding: 2px 6px;
    border-radius: 3px;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.3px;
}

.badge-open {
    background: #e8f5e9;
    color: #2e7d32;
    border: 1px solid #c8e6c9;
}

.badge-onproses {
    background: #fff3e0;
    color: #ef6c00;
    border: 1px solid #ffe0b2;
}

.badge-close {
    background: #eeeeee;
    color: #757575;
    border: 1px solid #e0e0e0;
}

/* Row Closed / Disabled */
.row-closed {
    background: #fafafa;
    cursor: not-allowed;
}

.row-closed td {
    opacity: 0.65;
    color: #888;
}

.row-closed:hover td {
    background: #f5f5f5 !important;
}

.text-strike {
    text-decoration: line-through;
}

/* Footer */
.lookup-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 14px;
    border-top: 1px solid #e0e0e0;
    background: #fafafa;
    flex-shrink: 0;
}

.footer-count {
    font-size: 11px;
    color: #666;
}

.btn-batal {
    padding: 3px 12px;
    background: white;
    border: 1px solid #ccc;
    border-radius: 3px;
    cursor: pointer;
    font-size: 11px;
    color: #424242;
}

.btn-batal:hover {
    background: #f5f5f5;
}

/* Helpers */
.text-left {
    text-align: left !important;
}
.text-center {
    text-align: center !important;
}
.text-right {
    text-align: right !important;
}
.font-weight-medium {
    font-weight: 500;
}
</style>
