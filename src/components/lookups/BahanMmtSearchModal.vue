<script setup lang="ts">
import { ref, watch, computed } from "vue";
import api from "@/services/api";
import { IconTexture, IconSearch, IconDatabaseOff } from "@tabler/icons-vue";

const props = defineProps<{
    modelValue: boolean;
}>();
const emit = defineEmits(["update:modelValue", "selected"]);

const search = ref("");
const items = ref<any[]>([]);
const isLoading = ref(false);

// State Pagination
const currentPage = ref(1);
const perPage = ref(50);
const totalItems = ref(0);

const totalPages = computed(() =>
    Math.max(1, Math.ceil(totalItems.value / perPage.value)),
);

const pageStart = computed(() =>
    totalItems.value === 0 ? 0 : (currentPage.value - 1) * perPage.value + 1,
);

const pageEnd = computed(() =>
    Math.min(currentPage.value * perPage.value, totalItems.value),
);

const visiblePages = computed(() => {
    const total = totalPages.value;
    const cur = currentPage.value;
    if (total <= 5) return Array.from({ length: total }, (_, i) => i + 1);
    let start = Math.max(1, cur - 2);
    let end = Math.min(total, start + 4);
    if (end - start < 4) start = Math.max(1, end - 4);
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
});

let debounceTimer: ReturnType<typeof setTimeout> | null = null;

const fetchData = async () => {
    isLoading.value = true;
    try {
        const q = search.value.trim();
        const res = await api.get("/mmt/daftar/bahan", {
            params: {
                q,
                search: q,
                page: currentPage.value,
                limit: perPage.value,
            },
        });
        const data = res.data;
        items.value = data?.data || [];
        totalItems.value = Number(data?.total ?? items.value.length);
    } catch (err) {
        console.error("Gagal load bahan MMT:", err);
        items.value = [];
        totalItems.value = 0;
    } finally {
        isLoading.value = false;
    }
};

const onSearch = (val: string) => {
    search.value = val;
    currentPage.value = 1;
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(fetchData, 350);
};

const goToPage = (p: number) => {
    currentPage.value = Math.max(1, Math.min(p, totalPages.value));
    fetchData();
};

watch(
    () => props.modelValue,
    (val) => {
        if (val) {
            search.value = "";
            currentPage.value = 1;
            fetchData();
        }
    },
);

const selectItem = (item: any) => {
    emit("selected", item);
    emit("update:modelValue", false);
};
</script>

<template>
    <v-dialog
        :model-value="modelValue"
        @update:model-value="emit('update:modelValue', $event)"
        max-width="950px"
    >
        <div class="lookup-card">
            <!-- Header -->
            <div class="lookup-header">
                <IconTexture :size="15" :stroke-width="1.7" color="white" />
                <span>Cari Master Bahan MMT</span>
                <v-spacer />
                <button
                    class="lookup-close"
                    @click="emit('update:modelValue', false)"
                    title="Tutup (Esc)"
                >
                    ✕
                </button>
            </div>

            <!-- Search Input -->
            <div class="lookup-search">
                <IconSearch :size="16" :stroke-width="1.7" color="#9e9e9e" />
                <input
                    :value="search"
                    @input="onSearch(($event.target as HTMLInputElement).value)"
                    type="text"
                    placeholder="Cari kode atau nama bahan MMT..."
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

            <!-- Table Content -->
            <div class="lookup-table-wrap">
                <div v-if="isLoading" class="lookup-state">
                    <v-progress-circular
                        indeterminate
                        color="primary"
                        size="24"
                    />
                    <span>Memuat data bahan...</span>
                </div>
                <div v-else-if="items.length === 0" class="lookup-state">
                    <IconDatabaseOff
                        :size="32"
                        :stroke-width="1.3"
                        color="#bdbdbd"
                    />
                    <span>Tidak ada data bahan ditemukan</span>
                </div>
                <table v-else class="lookup-table">
                    <thead>
                        <tr>
                            <th style="width: 120px" class="text-left">KODE</th>
                            <th class="text-left">NAMA BAHAN</th>
                            <th style="width: 80px" class="text-center">
                                SATUAN
                            </th>
                            <th style="width: 90px" class="text-right">
                                PANJANG (M)
                            </th>
                            <th style="width: 90px" class="text-right">
                                LEBAR (M)
                            </th>
                            <th style="width: 95px" class="text-right">STOK</th>
                            <th style="width: 140px" class="text-left">
                                GUDANG
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr
                            v-for="item in items"
                            :key="item.Kode"
                            class="lookup-row"
                            @click="selectItem(item)"
                        >
                            <td class="text-left td-kode">{{ item.Kode }}</td>
                            <td class="text-left font-weight-medium">
                                {{ item.Nama }}
                            </td>
                            <td class="text-center">
                                {{ item.Satuan || "-" }}
                            </td>
                            <td class="text-right">{{ item.Panjang || 0 }}</td>
                            <td class="text-right">{{ item.Lebar || 0 }}</td>
                            <td class="text-right font-weight-bold">
                                {{
                                    Number(item.Stok || 0).toLocaleString(
                                        "id-ID",
                                    )
                                }}
                            </td>
                            <td class="text-left">
                                {{ item.GudangDefault || "-" }}
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <!-- Footer & Pagination -->
            <div class="lookup-footer">
                <span class="footer-count">
                    {{ pageStart }}–{{ pageEnd }} dari {{ totalItems }} data
                </span>

                <!-- Pagination Controls -->
                <div class="page-controls" v-if="totalPages > 1">
                    <button
                        type="button"
                        class="page-btn"
                        :disabled="currentPage === 1"
                        @click="goToPage(1)"
                        title="Halaman Pertama"
                    >
                        «
                    </button>
                    <button
                        type="button"
                        class="page-btn"
                        :disabled="currentPage === 1"
                        @click="goToPage(currentPage - 1)"
                        title="Halaman Sebelumnya"
                    >
                        ‹
                    </button>
                    <button
                        type="button"
                        v-for="p in visiblePages"
                        :key="p"
                        class="page-btn"
                        :class="{ active: p === currentPage }"
                        @click="goToPage(p)"
                    >
                        {{ p }}
                    </button>
                    <button
                        type="button"
                        class="page-btn"
                        :disabled="currentPage === totalPages"
                        @click="goToPage(currentPage + 1)"
                        title="Halaman Berikutnya"
                    >
                        ›
                    </button>
                    <button
                        type="button"
                        class="page-btn"
                        :disabled="currentPage === totalPages"
                        @click="goToPage(totalPages)"
                        title="Halaman Terakhir"
                    >
                        »
                    </button>
                </div>

                <div class="d-flex align-center gap-2">
                    <select
                        v-model.number="perPage"
                        class="per-page-select"
                        @change="goToPage(1)"
                    >
                        <option v-for="n in [25, 50, 100]" :key="n" :value="n">
                            {{ n }}
                        </option>
                    </select>
                </div>
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
.lookup-header {
    display: flex;
    align-items: center;
    background: #1565c0;
    color: white;
    padding: 9px 14px;
    font-size: 13px;
    font-weight: 700;
    gap: 6px;
    flex-shrink: 0;
}
.lookup-close {
    background: transparent;
    border: none;
    color: rgba(255, 255, 255, 0.8);
    font-size: 15px;
    cursor: pointer;
}
.lookup-close:hover {
    color: white;
}
.lookup-search {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    border-bottom: 1px solid #e0e0e0;
    background: #fafafa;
    flex-shrink: 0;
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
}
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
}
.lookup-row:hover td {
    background: #e3f2fd;
}
.td-kode {
    font-family: monospace;
    font-weight: 600;
    color: #1565c0;
}

/* ── Alignment Helpers ── */
.text-left {
    text-align: left !important;
}
.text-center {
    text-align: center !important;
}
.text-right {
    text-align: right !important;
}

/* Footer & Pagination */
.lookup-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 14px;
    border-top: 1px solid #e0e0e0;
    background: #fafafa;
    flex-shrink: 0;
    gap: 8px;
}
.footer-count {
    font-size: 11px;
    color: #666;
    white-space: nowrap;
}
.page-controls {
    display: flex;
    align-items: center;
    gap: 2px;
}
.page-btn {
    min-width: 26px;
    height: 24px;
    padding: 0 4px;
    border: 1px solid #e0e0e0;
    border-radius: 3px;
    background: white;
    font-size: 11px;
    color: #424242;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.12s;
}
.page-btn:hover:not(:disabled) {
    background: #e3f2fd;
    border-color: #90caf9;
    color: #1565c0;
}
.page-btn.active {
    background: #1976d2;
    border-color: #1976d2;
    color: white;
    font-weight: 700;
}
.page-btn:disabled {
    opacity: 0.35;
    cursor: default;
}
.per-page-select {
    height: 24px;
    padding: 0 4px;
    border: 1px solid #ccc;
    border-radius: 3px;
    font-size: 11px;
    color: #424242;
    background: white;
    cursor: pointer;
    outline: none;
}
.btn-batal {
    padding: 3px 10px;
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
</style>
