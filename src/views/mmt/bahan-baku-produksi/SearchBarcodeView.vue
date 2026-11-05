<script setup lang="ts">
import { ref, computed, onMounted, watch, nextTick } from "vue";
import { useRouter, useRoute } from "vue-router";
import { useToast } from "vue-toastification";
import PageLayout from "@/components/PageLayout.vue";
import {
    IconBarcode,
    IconRefresh,
    IconSearch,
    IconHistory,
    IconFileSpreadsheet,
    IconRotateClockwise,
    IconX,
    IconCheck,
    IconPackage,
    IconArrowRight,
} from "@tabler/icons-vue";
import api from "@/services/api";
import { exportExcelSingle, type ExcelColumn } from "@/utils/excelExport";
import { useTabsStore } from "@/stores/tabsStore";

interface InventoryItem {
    Barcode: string;
    Kode: string;
    Nama_Bahan: string;
    Gudang: string;
    Stok_Sistem: number | string;
    Satuan?: string;
    status_aktif?: string;
}

interface HistoryMovement {
    Tanggal?: string;
    mst_tanggal?: string;
    Referensi?: string;
    mst_noreferensi?: string;
    Keterangan?: string;
    keterangan?: string;
    MasukM?: number;
    mst_stok_in?: number;
    KeluarM?: number;
    mst_stok_out?: number;
    SaldoM?: number | string;
    saldo?: number | string;
}

interface LhkUsageItem {
    Lhk?: string;
    Jenis?: string;
    Tanggal?: string;
    Spk?: string | null;
    Jumlah?: number;
}

interface SaldoGudangItem {
    Gudang?: string;
    SaldoM?: number;
}

interface BarcodeHistoryData {
    info?: {
        Barcode?: string;
        Kode?: string;
        Nama_Bahan?: string;
        Satuan?: string;
    };
    moves?: HistoryMovement[];
    saldoPerGudang?: SaldoGudangItem[];
    saldoTotalM?: number;
    lhkUsage?: LhkUsageItem[];
}

const router = useRouter();
const route = useRoute();
const toast = useToast();
const tabsStore = useTabsStore();

// --- STATE ---
const isLoading = ref(false);
const isSearchingScan = ref(false);
const scanInput = ref("");
const barcodeInput = ref<HTMLInputElement | null>(null);

const selectedGudang = ref("");
const brgSearchInput = ref("");
const showSuggestions = ref(false);
const debouncedBrgSearch = ref("");
let brgTimer: any = null;

const listSearchQuery = ref("");
const debouncedListQuery = ref("");
let listTimer: any = null;

const fullInventory = ref<InventoryItem[]>([]);
const lastScanned = ref<InventoryItem | null>(null);
const scannedBarcodes = ref<Set<string>>(new Set());
const displayLimit = ref(100);

// History Dialog
const showHistoryDialog = ref(false);
const historyLoading = ref(false);
const historyData = ref<BarcodeHistoryData | null>(null);

// Watchers debounced
watch(brgSearchInput, (val) => {
    clearTimeout(brgTimer);
    brgTimer = setTimeout(() => {
        debouncedBrgSearch.value = val;
    }, 200);
});

watch(listSearchQuery, (val) => {
    clearTimeout(listTimer);
    listTimer = setTimeout(() => {
        debouncedListQuery.value = val;
    }, 200);
});

// --- SUGGESTIONS BARANG ---
const uniqueBrgOptions = computed(() => {
    const map = new Map<string, string>();
    fullInventory.value.forEach((i) => {
        if (i.Kode && i.Nama_Bahan) {
            const key = `${i.Kode} - ${i.Nama_Bahan}`;
            if (!map.has(key)) map.set(key, key);
        }
    });
    return [...map.values()].sort((a, b) => a.localeCompare(b));
});

const filteredSuggestions = computed(() => {
    const q = debouncedBrgSearch.value.trim().toLowerCase();
    if (!q) return uniqueBrgOptions.value.slice(0, 8);

    const matched = new Set<string>();
    const res: string[] = [];
    const scanLimit = Math.min(fullInventory.value.length, 800);

    for (let i = 0; i < scanLimit; i++) {
        const item = fullInventory.value[i];
        const hay =
            `${item.Kode ?? ""} ${item.Nama_Bahan ?? ""} ${item.Barcode ?? ""} ${item.Gudang ?? ""}`.toLowerCase();
        if (hay.includes(q)) {
            const key = `${item.Kode ?? "-"} - ${item.Nama_Bahan ?? ""}`.trim();
            if (!matched.has(key)) {
                matched.add(key);
                res.push(key);
                if (res.length >= 8) break;
            }
        }
    }
    if (res.length > 0) return res;
    return uniqueBrgOptions.value
        .filter((o) => o.toLowerCase().includes(q))
        .slice(0, 8);
});

const selectBrgSuggestion = (val: string) => {
    const kode = val.split(" - ")[0];
    brgSearchInput.value = kode;
    showSuggestions.value = false;
};

const clearBrgSearch = () => {
    brgSearchInput.value = "";
    showSuggestions.value = false;
};

const handleBrgBlur = () => {
    setTimeout(() => {
        showSuggestions.value = false;
    }, 180);
};

// --- FILTERED INVENTORY LIST ---
const filteredList = computed(() => {
    const q = debouncedListQuery.value.trim().toLowerCase();
    const bq = debouncedBrgSearch.value.trim().toLowerCase();

    if (!q && !bq) return fullInventory.value;

    return fullInventory.value.filter((item) => {
        if (q) {
            const hayList =
                `${item.Barcode ?? ""} ${item.Nama_Bahan ?? ""} ${item.Kode ?? ""} ${item.Gudang ?? ""}`.toLowerCase();
            if (!hayList.includes(q)) return false;
        }
        if (bq) {
            const hayBrg =
                `${item.Kode ?? ""} ${item.Nama_Bahan ?? ""} ${item.Barcode ?? ""} ${item.Gudang ?? ""} ${String(item.Stok_Sistem ?? "")}`.toLowerCase();
            if (!hayBrg.includes(bq)) return false;
        }
        return true;
    });
});

const displayedList = computed(() => {
    return filteredList.value.slice(0, displayLimit.value);
});

watch(filteredList, () => {
    displayLimit.value = 100;
});

const loadMore = () => {
    displayLimit.value += 100;
};

// --- API ACTIONS ---
const fetchInventoryList = async () => {
    isLoading.value = true;
    try {
        const res = await api.get(
            "/mmt/bahan-baku-produksi/barcode/search/list",
            {
                params: {
                    gdg_kode: selectedGudang.value || undefined,
                },
            },
        );
        fullInventory.value = Array.isArray(res.data)
            ? res.data
            : res.data?.data || [];
    } catch (err: any) {
        console.error("Gagal memuat inventaris barcode:", err);
        toast.error("Gagal memuat daftar inventaris barcode.");
    } finally {
        isLoading.value = false;
    }
};

const handleScanCheck = async () => {
    const rawBarcode = scanInput.value.trim();
    if (!rawBarcode) return;

    isSearchingScan.value = true;
    try {
        const res = await api.get(
            "/mmt/bahan-baku-produksi/barcode/search/quick-check",
            {
                params: { barcode: rawBarcode },
            },
        );

        if (res.data?.success && res.data?.data) {
            const found = res.data.data as InventoryItem;
            lastScanned.value = found;
            scannedBarcodes.value.add(found.Barcode);

            toast.success(
                `Barcode [${found.Barcode}] ditemukan: ${found.Nama_Bahan} (${found.Stok_Sistem} m)`,
            );

            // Jika item belum ada di list karena filter gudang, reload data
            const existsInList = fullInventory.value.some(
                (i) => i.Barcode === found.Barcode,
            );
            if (!existsInList) {
                selectedGudang.value = "";
                await fetchInventoryList();
            }
        } else {
            toast.warning(`Barcode ${rawBarcode} tidak ditemukan.`);
        }
    } catch (err: any) {
        const msg =
            err.response?.data?.message ||
            `Barcode ${rawBarcode} tidak terdaftar atau stok sudah kosong.`;
        toast.error(msg);
    } finally {
        isSearchingScan.value = false;
        scanInput.value = "";
        nextTick(() => {
            barcodeInput.value?.focus();
        });
    }
};

const selectItemFromRow = (item: InventoryItem) => {
    lastScanned.value = item;
};

const openHistory = async (barcodeVal?: string) => {
    const targetBarcode = barcodeVal || lastScanned.value?.Barcode || "";
    if (!targetBarcode) {
        toast.warning("Pilih atau scan barcode terlebih dahulu.");
        return;
    }

    showHistoryDialog.value = true;
    historyLoading.value = true;
    historyData.value = null;

    try {
        const res = await api.get(
            "/mmt/bahan-baku-produksi/barcode/search/history",
            {
                params: { barcode: targetBarcode },
            },
        );
        historyData.value = res.data?.data || null;
    } catch (err: any) {
        console.error("Gagal memuat riwayat barcode:", err);
        toast.error("Gagal mengambil riwayat mutasi barcode.");
    } finally {
        historyLoading.value = false;
    }
};

const goToKartuBarcode = (barcodeVal?: string) => {
    const target = barcodeVal || lastScanned.value?.Barcode;
    if (!target) {
        toast.warning("Pilih atau scan barcode terlebih dahulu.");
        return;
    }
    showHistoryDialog.value = false;
    router.push({
        path: "/mmt/bahan-baku-produksi/kartu-barcode",
        query: { barcode: target },
    });
};

const resetAllScans = () => {
    if (
        confirm(
            "Reset semua tanda scan? Riwayat centang sesi ini akan dibersihkan.",
        )
    ) {
        scannedBarcodes.value.clear();
        lastScanned.value = null;
        toast.info("Status scan telah direset.");
        barcodeInput.value?.focus();
    }
};

const clearAllFilters = () => {
    selectedGudang.value = "";
    brgSearchInput.value = "";
    listSearchQuery.value = "";
    lastScanned.value = null;
    fetchInventoryList();
};

const handleExportExcel = async () => {
    if (filteredList.value.length === 0) {
        toast.warning("Tidak ada data inventaris untuk di-export.");
        return;
    }

    try {
        const fileName = `Inventaris_Barcode_MMT_${new Date().toISOString().substring(0, 10)}.xlsx`;
        const columns: ExcelColumn[] = [
            {
                header: "Barcode Rol",
                key: "Barcode",
                width: 20,
                align: "center",
            },
            { header: "Kode Bahan", key: "Kode", width: 16, align: "center" },
            { header: "Nama Bahan", key: "Nama_Bahan", width: 34 },
            { header: "Gudang", key: "Gudang", width: 14, align: "center" },
            {
                header: "Stok Sistem (m)",
                key: "Stok_Sistem",
                width: 16,
                numFmt: "#,##0.00",
                align: "right",
            },
            {
                header: "Status Scan",
                key: "Status_Scan",
                width: 14,
                align: "center",
            },
        ];

        const rows = filteredList.value.map((item) => ({
            Barcode: item.Barcode,
            Kode: item.Kode || "-",
            Nama_Bahan: item.Nama_Bahan || "-",
            Gudang: item.Gudang || "-",
            Stok_Sistem: Number(item.Stok_Sistem || 0),
            Status_Scan: scannedBarcodes.value.has(item.Barcode)
                ? "TER-SCAN"
                : "BELUM",
        }));

        await exportExcelSingle(
            fileName,
            "InventarisBarcode",
            columns,
            rows,
            `DAFTAR INVENTARIS BARCODE ROL (Gudang: ${selectedGudang.value || "SEMUA GUDANG"})`,
        );
        toast.success("Export Excel berhasil diunduh.");
    } catch (err: any) {
        toast.error("Gagal export Excel: " + (err.message || err));
    }
};

const closeTab = () => {
    tabsStore.closeTab(route.path);
};

onMounted(() => {
    fetchInventoryList();
    nextTick(() => {
        barcodeInput.value?.focus();
    });
});
</script>

<template>
    <PageLayout
        title="Search Barcode"
        menu-id="5540"
        :icon="IconBarcode"
        :loading="isLoading"
    >
        <!-- ── HEADER ACTIONS TOP BAR ── -->
        <template #header-actions>
            <v-btn
                size="small"
                variant="tonal"
                color="secondary"
                class="text-none font-weight-medium"
                @click="fetchInventoryList"
            >
                <template #prepend>
                    <IconRefresh :size="15" />
                </template>
                Refresh
            </v-btn>

            <v-btn
                v-if="scannedBarcodes.size > 0"
                size="small"
                variant="tonal"
                color="warning"
                class="text-none font-weight-medium"
                @click="resetAllScans"
            >
                <template #prepend>
                    <IconRotateClockwise :size="15" />
                </template>
                Reset Scan ({{ scannedBarcodes.size }})
            </v-btn>

            <v-btn
                size="small"
                variant="tonal"
                color="success"
                class="text-none font-weight-medium"
                :disabled="filteredList.length === 0"
                @click="handleExportExcel"
            >
                <template #prepend>
                    <IconFileSpreadsheet :size="15" />
                </template>
                Export Excel
            </v-btn>

            <v-btn
                size="small"
                variant="text"
                class="text-none text-grey-darken-1"
                @click="closeTab"
            >
                <template #prepend>
                    <IconX :size="15" />
                </template>
                Tutup
            </v-btn>
        </template>

        <!-- ── TOP SCAN & FILTER BANNER (HERO BARCODE SCANNER) ── -->
        <div class="scan-hero-banner">
            <div class="d-flex align-center flex-wrap ga-3 w-100">
                <!-- 1. Filter Gudang -->
                <div class="filter-box">
                    <label class="banner-lbl">Gudang</label>
                    <select
                        v-model="selectedGudang"
                        class="banner-select"
                        @change="fetchInventoryList"
                    >
                        <option value="">Semua Gudang</option>
                        <option value="WH-16">WH-16 (Utama MMT)</option>
                        <option value="GPM">GPM (Produksi)</option>
                    </select>
                </div>

                <!-- 2. Pencarian Nama/Kode Bahan (Autocomplete) -->
                <div
                    class="filter-box autocomplete-box flex-grow-1"
                    style="min-width: 240px"
                >
                    <label class="banner-lbl">Filter Bahan</label>
                    <div class="input-with-action">
                        <IconSearch :size="14" class="input-prefix-icon" />
                        <input
                            type="text"
                            v-model="brgSearchInput"
                            class="banner-input"
                            placeholder="Cari kode / nama bahan..."
                            @focus="showSuggestions = true"
                            @blur="handleBrgBlur"
                        />
                        <button
                            v-if="brgSearchInput"
                            type="button"
                            class="btn-clear-inline"
                            @click="clearBrgSearch"
                            title="Bersihkan"
                        >
                            <IconX :size="13" />
                        </button>
                    </div>

                    <!-- Dropdown Sugesti -->
                    <div
                        v-if="showSuggestions && filteredSuggestions.length > 0"
                        class="suggestions-popup elevation-3"
                    >
                        <div
                            v-for="sug in filteredSuggestions"
                            :key="sug"
                            class="suggestion-row"
                            @mousedown.prevent="selectBrgSuggestion(sug)"
                        >
                            <span class="sug-code">{{
                                sug.split(" - ")[0]
                            }}</span>
                            <span class="sug-name">{{
                                sug.split(" - ").slice(1).join(" - ") || sug
                            }}</span>
                        </div>
                    </div>
                </div>

                <!-- 3. SCAN BARCODE BOX HERO (SCAN GUN READY) -->
                <div
                    class="scan-input-box flex-grow-1"
                    style="min-width: 280px"
                >
                    <label class="banner-lbl text-primary font-weight-bold">
                        Scan Barcode
                    </label>
                    <div class="scan-wrapper">
                        <IconBarcode
                            :size="18"
                            class="scan-prefix-icon text-primary"
                        />
                        <input
                            ref="barcodeInput"
                            type="text"
                            v-model="scanInput"
                            class="scan-field"
                            placeholder="Scan barcode..."
                            autofocus
                            @keyup.enter="handleScanCheck"
                        />
                        <button
                            type="button"
                            class="btn-enter"
                            :disabled="isSearchingScan || !scanInput.trim()"
                            @click="handleScanCheck"
                        >
                            <v-progress-circular
                                v-if="isSearchingScan"
                                indeterminate
                                size="14"
                                width="2"
                                class="mr-1"
                            />
                            <span v-else>ENTER ↵</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>

        <!-- ── 2-COLUMN CONTENT WORKSPACE ── -->
        <div class="workspace-grid">
            <!-- ── KOLOM KIRI: DETAIL HASIL SCAN INSTAN & TRACKER ── -->
            <div class="left-panel">
                <!-- Card Hasil Scan Terakhir -->
                <div
                    class="scan-result-card"
                    :class="{ 'has-result': lastScanned }"
                >
                    <div class="card-top-label">
                        <span class="badge-tag">HASIL SCAN TERAKHIR</span>
                        <span v-if="lastScanned" class="status-chip success">
                            TERSEDIA
                        </span>
                    </div>

                    <div v-if="lastScanned" class="result-body animate-fade-in">
                        <!-- Big Monospace Barcode -->
                        <div class="barcode-display">
                            <span class="barcode-text font-monospace">{{
                                lastScanned.Barcode
                            }}</span>
                        </div>

                        <!-- Detail Grid Info -->
                        <div class="info-table">
                            <div class="info-row">
                                <span class="info-lbl">Nama Bahan:</span>
                                <span
                                    class="info-val font-weight-bold text-slate-800"
                                >
                                    {{ lastScanned.Nama_Bahan }}
                                </span>
                            </div>
                            <div class="info-row">
                                <span class="info-lbl">Kode Item:</span>
                                <span
                                    class="info-val font-monospace text-primary font-weight-semibold"
                                >
                                    {{ lastScanned.Kode }}
                                </span>
                            </div>
                            <div class="info-row">
                                <span class="info-lbl">Gudang:</span>
                                <span class="info-val">
                                    <v-chip
                                        size="x-small"
                                        color="primary"
                                        variant="tonal"
                                        class="font-weight-medium"
                                    >
                                        {{ lastScanned.Gudang }}
                                    </v-chip>
                                </span>
                            </div>
                            <div class="info-row highlight-stok">
                                <span class="info-lbl">Stok Tersisa:</span>
                                <span class="info-val stok-big">
                                    {{
                                        Number(lastScanned.Stok_Sistem).toFixed(
                                            2,
                                        )
                                    }}
                                    m
                                </span>
                            </div>
                        </div>

                        <!-- Tombol Riwayat Pergerakan Rol (Navigasi ke Kartu Barcode / Popup) -->
                        <v-btn
                            block
                            color="primary"
                            variant="flat"
                            size="small"
                            class="mt-3 text-none font-weight-bold"
                            @click="goToKartuBarcode(lastScanned.Barcode)"
                        >
                            <template #prepend>
                                <IconHistory :size="16" />
                            </template>
                            Riwayat Pergerakan (Kartu Barcode) &rarr;
                        </v-btn>

                        <v-btn
                            block
                            variant="tonal"
                            color="secondary"
                            size="x-small"
                            class="mt-2 text-none"
                            @click="openHistory(lastScanned.Barcode)"
                        >
                            Pratinjau Riwayat di Pop-up
                        </v-btn>
                    </div>

                    <!-- Empty State Scan Box -->
                    <div v-else class="empty-scan-state">
                        <v-icon
                            :icon="IconBarcode"
                            size="44"
                            class="text-grey-lighten-1 mb-2"
                        />
                        <div class="font-weight-bold text-grey-darken-2">
                            Belum Ada Barcode Di-scan
                        </div>
                        <div class="text-caption text-grey">
                            Arahkan scanner ke barcode rol atau ketik nomor
                            barcode di kotak atas lalu tekan ENTER
                        </div>
                    </div>
                </div>

                <!-- Card Scanner Progress / Status Centang Sesi -->
                <div class="scanner-tracker-card mt-3">
                    <div class="tracker-header">
                        <span
                            class="font-weight-bold text-caption text-uppercase text-grey-darken-2"
                        >
                            Checklist
                        </span>
                        <span
                            class="font-weight-bold text-primary text-caption font-monospace"
                        >
                            {{ scannedBarcodes.size }}
                        </span>
                    </div>

                    <v-progress-linear
                        :model-value="
                            fullInventory.length > 0
                                ? (scannedBarcodes.size /
                                      fullInventory.length) *
                                  100
                                : 0
                        "
                        color="primary"
                        height="6"
                        rounded
                        class="my-2"
                    />

                    <div
                        class="d-flex align-center justify-space-between mt-2 pt-2 border-top"
                    >
                        <span class="text-caption text-grey">
                            {{
                                scannedBarcodes.size > 0
                                    ? `${scannedBarcodes.size} rol telah diverifikasi`
                                    : "Siap scan verifikasi fisik"
                            }}
                        </span>
                        <v-btn
                            v-if="scannedBarcodes.size > 0"
                            size="x-small"
                            variant="text"
                            color="error"
                            class="text-none px-1"
                            @click="resetAllScans"
                        >
                            Reset
                        </v-btn>
                    </div>
                </div>
            </div>

            <!-- ── KOLOM KANAN: DAFTAR INVENTARIS BARCODE ── -->
            <div class="right-panel">
                <div class="table-card d-flex flex-column h-100">
                    <!-- Table Toolbar -->
                    <div class="table-toolbar">
                        <div class="d-flex align-center">
                            <span class="toolbar-title font-weight-bold">
                                Daftar Inventaris Barcode
                            </span>
                            <v-chip
                                size="x-small"
                                color="primary"
                                class="ml-2 font-weight-bold"
                            >
                                {{ filteredList.length }} Rol
                            </v-chip>
                        </div>

                        <!-- Mini Search di List -->
                        <div class="mini-search-wrapper">
                            <IconSearch
                                :size="13"
                                class="mini-icon text-grey"
                            />
                            <input
                                type="text"
                                v-model="listSearchQuery"
                                class="mini-search-input"
                                placeholder="Cari barcode / nama di tabel..."
                            />
                            <button
                                v-if="listSearchQuery"
                                type="button"
                                class="btn-mini-clear"
                                @click="listSearchQuery = ''"
                            >
                                ✕
                            </button>
                        </div>
                    </div>

                    <!-- Table Container -->
                    <div class="table-scroll-wrap flex-grow-1">
                        <table class="inventory-table">
                            <thead>
                                <tr>
                                    <th style="width: 46px" class="text-center">
                                        Status
                                    </th>
                                    <th style="width: 170px">Barcode Rol</th>
                                    <th style="width: 120px">Kode Bahan</th>
                                    <th style="min-width: 200px">
                                        Nama Bahan Baku
                                    </th>
                                    <th style="width: 85px" class="text-center">
                                        Gudang
                                    </th>
                                    <th style="width: 110px" class="text-end">
                                        Stok Sistem
                                    </th>
                                    <th style="width: 70px" class="text-center">
                                        Aksi
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr
                                    v-for="item in displayedList"
                                    :key="item.Barcode"
                                    class="table-row-item"
                                    :class="{
                                        'is-active':
                                            lastScanned?.Barcode ===
                                            item.Barcode,
                                        'is-scanned': scannedBarcodes.has(
                                            item.Barcode,
                                        ),
                                    }"
                                    @click="selectItemFromRow(item)"
                                >
                                    <!-- Status Scan -->
                                    <td class="text-center">
                                        <span
                                            v-if="
                                                scannedBarcodes.has(
                                                    item.Barcode,
                                                )
                                            "
                                            class="status-indicator scanned"
                                            title="Sudah ter-scan"
                                        >
                                            <IconCheck
                                                :size="13"
                                                stroke-width="3"
                                            />
                                        </span>
                                        <span
                                            v-else
                                            class="status-indicator pending"
                                            title="Belum ter-scan"
                                        >
                                            &bull;
                                        </span>
                                    </td>

                                    <!-- Barcode -->
                                    <td>
                                        <span class="barcode-badge">{{
                                            item.Barcode
                                        }}</span>
                                    </td>

                                    <!-- Kode Bahan -->
                                    <td
                                        class="font-monospace text-caption font-weight-medium text-grey-darken-2"
                                    >
                                        {{ item.Kode }}
                                    </td>

                                    <!-- Nama Bahan -->
                                    <td class="font-weight-medium text-caption">
                                        {{ item.Nama_Bahan }}
                                    </td>

                                    <!-- Gudang -->
                                    <td class="text-center">
                                        <span class="gdg-tag">{{
                                            item.Gudang
                                        }}</span>
                                    </td>

                                    <!-- Stok Sistem -->
                                    <td
                                        class="text-end font-weight-bold text-primary font-monospace"
                                    >
                                        {{
                                            Number(item.Stok_Sistem).toFixed(2)
                                        }}
                                        m
                                    </td>

                                    <!-- Aksi -->
                                    <td class="text-center" @click.stop>
                                        <div
                                            class="d-flex align-center justify-center"
                                        >
                                            <!-- <v-btn
                        icon
                        size="x-small"
                        variant="text"
                        color="secondary"
                        title="Pratinjau Riwayat"
                        @click="openHistory(item.Barcode)"
                      >
                        <IconHistory :size="14" />
                      </v-btn> -->
                                            <v-btn
                                                icon
                                                size="x-small"
                                                variant="text"
                                                color="primary"
                                                title="Buka Kartu Barcode Penuh"
                                                @click="
                                                    goToKartuBarcode(
                                                        item.Barcode,
                                                    )
                                                "
                                            >
                                                <IconArrowRight :size="14" />
                                            </v-btn>
                                        </div>
                                    </td>
                                </tr>

                                <tr v-if="filteredList.length === 0">
                                    <td
                                        colspan="7"
                                        class="text-center py-6 text-grey"
                                    >
                                        <v-icon
                                            :icon="IconPackage"
                                            size="32"
                                            class="mb-1 text-grey-lighten-1"
                                        />
                                        <div>
                                            Tidak ada data barcode ditemukan.
                                        </div>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    <!-- Table Footer / Load More Info -->
                    <div class="table-footer">
                        <span class="text-caption text-grey-darken-1">
                            Menampilkan {{ displayedList.length }} dari
                            {{ filteredList.length }} barcode rol
                        </span>
                        <v-btn
                            v-if="displayedList.length < filteredList.length"
                            size="x-small"
                            variant="tonal"
                            color="primary"
                            class="text-none font-weight-medium"
                            @click="loadMore"
                        >
                            Muat 100 Lagi
                        </v-btn>
                    </div>
                </div>
            </div>
        </div>

        <!-- ── DIALOG RIWAYAT PERGERAKAN BARCODE (KARTU STOK PER ROL) ── -->
        <v-dialog v-model="showHistoryDialog" max-width="850" scrollable>
            <v-card class="history-dialog-card">
                <v-card-title class="dialog-header py-3 px-4 border-b">
                    <div class="d-flex align-center">
                        <v-avatar
                            color="primary"
                            variant="tonal"
                            size="36"
                            class="mr-3"
                        >
                            <IconHistory :size="20" />
                        </v-avatar>
                        <div>
                            <div class="text-subtitle-1 font-weight-bold">
                                Riwayat Pergerakan Barcode Rol
                            </div>
                            <div class="text-caption text-medium-emphasis">
                                Lacak seluruh transaksi mutasi dan pemakaian rol
                                bahan ini
                            </div>
                        </div>
                    </div>
                    <v-spacer />
                    <v-btn
                        icon
                        size="small"
                        variant="text"
                        @click="showHistoryDialog = false"
                    >
                        <IconX :size="18" />
                    </v-btn>
                </v-card-title>

                <v-card-text class="pa-4 bg-grey-lighten-5">
                    <div v-if="historyLoading" class="text-center py-8">
                        <v-progress-circular indeterminate color="primary" />
                        <div class="mt-2 text-caption text-grey">
                            Memuat riwayat mutasi...
                        </div>
                    </div>

                    <div v-else-if="historyData">
                        <!-- Sheet Ringkasan Informasi Rol -->
                        <v-sheet border rounded class="pa-3 mb-3 bg-white">
                            <v-row dense>
                                <v-col cols="6" md="3">
                                    <div
                                        class="text-caption text-grey-darken-1"
                                    >
                                        Barcode Rol
                                    </div>
                                    <div
                                        class="font-monospace font-weight-bold text-primary"
                                    >
                                        {{ historyData.info?.Barcode }}
                                    </div>
                                </v-col>
                                <v-col cols="6" md="3">
                                    <div
                                        class="text-caption text-grey-darken-1"
                                    >
                                        Kode Bahan
                                    </div>
                                    <div
                                        class="font-monospace font-weight-medium"
                                    >
                                        {{ historyData.info?.Kode }}
                                    </div>
                                </v-col>
                                <v-col cols="12" md="6">
                                    <div
                                        class="text-caption text-grey-darken-1"
                                    >
                                        Nama Bahan Baku
                                    </div>
                                    <div
                                        class="font-weight-bold text-slate-800"
                                    >
                                        {{ historyData.info?.Nama_Bahan }}
                                    </div>
                                </v-col>
                            </v-row>
                        </v-sheet>

                        <!-- Tabel Riwayat Pergerakan -->
                        <div
                            class="text-subtitle-2 font-weight-bold mb-2 text-primary"
                        >
                            Rincian Mutasi / Kartu Stok
                        </div>
                        <v-table
                            density="compact"
                            class="border rounded bg-white mb-3"
                        >
                            <thead>
                                <tr class="bg-grey-lighten-4">
                                    <th
                                        class="text-center"
                                        style="width: 100px"
                                    >
                                        Tanggal
                                    </th>
                                    <th style="width: 160px">No. Referensi</th>
                                    <th>Keterangan</th>
                                    <th class="text-end" style="width: 85px">
                                        Masuk
                                    </th>
                                    <th class="text-end" style="width: 85px">
                                        Keluar
                                    </th>
                                    <th class="text-end" style="width: 95px">
                                        Saldo (m)
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr
                                    v-for="(m, idx) in historyData.moves || []"
                                    :key="idx"
                                >
                                    <td
                                        class="text-center text-caption font-monospace"
                                    >
                                        {{
                                            m.Tanggal ||
                                            (m.mst_tanggal
                                                ? String(m.mst_tanggal).slice(
                                                      0,
                                                      10,
                                                  )
                                                : "-")
                                        }}
                                    </td>
                                    <td
                                        class="font-monospace font-weight-medium text-caption text-primary"
                                    >
                                        {{ m.Referensi || m.mst_noreferensi }}
                                    </td>
                                    <td class="text-caption">
                                        {{
                                            m.Keterangan || m.keterangan || "-"
                                        }}
                                    </td>
                                    <td
                                        class="text-end text-caption text-success font-weight-semibold"
                                    >
                                        {{
                                            Number(
                                                m.MasukM ?? m.mst_stok_in ?? 0,
                                            ) > 0
                                                ? Number(
                                                      m.MasukM ?? m.mst_stok_in,
                                                  ).toFixed(2)
                                                : "-"
                                        }}
                                    </td>
                                    <td
                                        class="text-end text-caption text-error font-weight-semibold"
                                    >
                                        {{
                                            Number(
                                                m.KeluarM ??
                                                    m.mst_stok_out ??
                                                    0,
                                            ) > 0
                                                ? Number(
                                                      m.KeluarM ??
                                                          m.mst_stok_out,
                                                  ).toFixed(2)
                                                : "-"
                                        }}
                                    </td>
                                    <td
                                        class="text-end text-caption font-weight-bold text-primary font-monospace"
                                    >
                                        {{
                                            m.SaldoM !== undefined &&
                                            m.SaldoM !== null
                                                ? Number(m.SaldoM).toFixed(2)
                                                : m.saldo !== undefined &&
                                                    m.saldo !== null
                                                  ? Number(m.saldo).toFixed(2)
                                                  : "-"
                                        }}
                                    </td>
                                </tr>
                                <tr v-if="!historyData.moves?.length">
                                    <td
                                        colspan="6"
                                        class="text-center py-4 text-grey text-caption"
                                    >
                                        Tidak ada riwayat pergerakan pada
                                        barcode ini.
                                    </td>
                                </tr>
                            </tbody>
                        </v-table>

                        <!-- Tabel Pemakaian di LHK (Proof & Cetak Mesin) -->
                        <div
                            class="d-flex align-center justify-space-between mb-2"
                        >
                            <div
                                class="text-subtitle-2 font-weight-bold text-primary"
                            >
                                Pemakaian di LHK
                                <span
                                    v-if="historyData.lhkUsage?.length"
                                    class="text-caption text-grey ml-1"
                                >
                                    ({{ historyData.lhkUsage.length }} catatan)
                                </span>
                            </div>
                            <span class="text-caption text-grey"
                                >Informatif (Proof & Mesin Cetak)</span
                            >
                        </div>
                        <v-table
                            density="compact"
                            class="border rounded bg-white"
                        >
                            <thead>
                                <tr class="bg-grey-lighten-4">
                                    <th style="width: 150px">Dokumen LHK</th>
                                    <th
                                        style="width: 100px"
                                        class="text-center"
                                    >
                                        Jenis
                                    </th>
                                    <th
                                        style="width: 100px"
                                        class="text-center"
                                    >
                                        Tanggal
                                    </th>
                                    <th style="width: 140px">Nomor SPK</th>
                                    <th class="text-end" style="width: 100px">
                                        Jumlah (m)
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr
                                    v-for="(u, idx) in historyData.lhkUsage ||
                                    []"
                                    :key="idx"
                                >
                                    <td
                                        class="font-monospace text-caption font-weight-medium text-primary"
                                    >
                                        {{ u.Lhk }}
                                    </td>
                                    <td class="text-center">
                                        <v-chip
                                            size="x-small"
                                            :color="
                                                u.Jenis === 'PROOF'
                                                    ? 'info'
                                                    : 'purple'
                                            "
                                            variant="tonal"
                                            class="font-weight-bold"
                                        >
                                            {{ u.Jenis }}
                                        </v-chip>
                                    </td>
                                    <td
                                        class="text-center text-caption font-monospace"
                                    >
                                        {{ u.Tanggal || "-" }}
                                    </td>
                                    <td class="font-monospace text-caption">
                                        {{ u.Spk || "-" }}
                                    </td>
                                    <td
                                        class="text-end text-caption font-weight-bold font-monospace"
                                    >
                                        {{ Number(u.Jumlah || 0).toFixed(2) }}
                                    </td>
                                </tr>
                                <tr v-if="!historyData.lhkUsage?.length">
                                    <td
                                        colspan="5"
                                        class="text-center py-3 text-grey text-caption"
                                    >
                                        Belum ada pemakaian LHK tercatat untuk
                                        barcode ini.
                                    </td>
                                </tr>
                            </tbody>
                        </v-table>
                    </div>

                    <div v-else class="text-center py-8 text-grey">
                        Data riwayat barcode tidak ditemukan.
                    </div>
                </v-card-text>

                <v-card-actions
                    class="pa-3 bg-white border-t d-flex justify-space-between"
                >
                    <v-btn
                        variant="text"
                        size="small"
                        color="grey-darken-1"
                        class="text-none"
                        @click="showHistoryDialog = false"
                    >
                        Tutup
                    </v-btn>
                    <v-btn
                        v-if="historyData?.info?.Barcode"
                        variant="tonal"
                        size="small"
                        color="primary"
                        class="text-none font-weight-bold"
                        @click="goToKartuBarcode(historyData.info.Barcode)"
                    >
                        Buka Kartu Barcode Penuh &rarr;
                    </v-btn>
                </v-card-actions>
            </v-card>
        </v-dialog>
    </PageLayout>
</template>

<style scoped>
/* ── TOP SCAN HERO BANNER ── */
.scan-hero-banner {
    background: white;
    border-bottom: 1px solid #e2e8f0;
    padding: 10px 16px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.banner-lbl {
    display: block;
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    color: #64748b;
    margin-bottom: 2px;
    letter-spacing: 0.3px;
}

.banner-select {
    height: 28px;
    border: 1px solid #cbd5e1;
    border-radius: 4px;
    padding: 0 8px;
    font-size: 11px;
    background: white;
    color: #1e293b;
    outline: none;
}
.banner-select:focus {
    border-color: #1976d2;
}

.autocomplete-box {
    position: relative;
}

.input-with-action {
    position: relative;
    display: flex;
    align-items: center;
}

.input-prefix-icon {
    position: absolute;
    left: 8px;
    color: #94a3b8;
}

.banner-input {
    width: 100%;
    height: 28px;
    border: 1px solid #cbd5e1;
    border-radius: 4px;
    padding: 0 26px 0 26px;
    font-size: 11px;
    background: white;
    color: #1e293b;
    outline: none;
}
.banner-input:focus {
    border-color: #1976d2;
}

.btn-clear-inline {
    position: absolute;
    right: 6px;
    background: transparent;
    border: none;
    cursor: pointer;
    color: #94a3b8;
    display: flex;
    align-items: center;
}
.btn-clear-inline:hover {
    color: #e53935;
}

.suggestions-popup {
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    background: white;
    border: 1px solid #cbd5e1;
    border-radius: 4px;
    max-height: 220px;
    overflow-y: auto;
    z-index: 99;
    margin-top: 2px;
}

.suggestion-row {
    padding: 6px 10px;
    display: flex;
    align-items: center;
    gap: 8px;
    cursor: pointer;
    border-bottom: 1px solid #f1f5f9;
    font-size: 11px;
}
.suggestion-row:hover {
    background: #f0f7ff;
}
.sug-code {
    font-family: monospace;
    font-weight: 700;
    color: #1976d2;
}
.sug-name {
    color: #334155;
}

/* Scan Box Hero */
.scan-wrapper {
    position: relative;
    display: flex;
    align-items: center;
    background: #f8fafc;
    border: 1.5px solid #1976d2;
    border-radius: 4px;
    overflow: hidden;
}

.scan-prefix-icon {
    margin-left: 8px;
}

.scan-field {
    flex: 1;
    height: 28px;
    border: none;
    background: transparent;
    padding: 0 8px;
    font-size: 11px;
    font-weight: 600;
    color: #0f172a;
    outline: none;
}
.scan-field:focus {
    background: white;
}

.btn-enter {
    height: 28px;
    background: #1976d2;
    color: white;
    border: none;
    font-size: 10px;
    font-weight: 700;
    padding: 0 10px;
    cursor: pointer;
    display: flex;
    align-items: center;
}
.btn-enter:hover:not(:disabled) {
    background: #1565c0;
}
.btn-enter:disabled {
    opacity: 0.6;
    cursor: not-allowed;
}

/* ── WORKSPACE 2-COLUMN GRID ── */
.workspace-grid {
    display: grid;
    grid-template-columns: 360px 1fr;
    gap: 12px;
    padding: 12px;
    height: calc(100vh - 130px);
    box-sizing: border-box;
}

@media (max-width: 1080px) {
    .workspace-grid {
        grid-template-columns: 1fr;
        height: auto;
    }
}

/* ── LEFT PANEL ── */
.left-panel {
    display: flex;
    flex-direction: column;
}

.scan-result-card {
    background: white;
    border: 1px solid #cbd5e1;
    border-radius: 6px;
    padding: 14px;
    transition: all 0.2s ease;
}

.scan-result-card.has-result {
    border-color: #1976d2;
    box-shadow: 0 2px 8px rgba(25, 118, 210, 0.12);
}

.card-top-label {
    display: flex;
    align-items: center;
    justify-content: space-between;
    border-bottom: 1px solid #f1f5f9;
    padding-bottom: 6px;
    margin-bottom: 10px;
}

.badge-tag {
    font-size: 10px;
    font-weight: 700;
    color: #1976d2;
    letter-spacing: 0.4px;
}

.status-chip.success {
    font-size: 9px;
    font-weight: 700;
    background: #dcfce7;
    color: #15803d;
    padding: 1px 6px;
    border-radius: 3px;
}

.barcode-display {
    background: #f1f5f9;
    padding: 6px 10px;
    border-radius: 4px;
    text-align: center;
    margin-bottom: 10px;
    border: 1px dashed #cbd5e1;
}

.barcode-text {
    font-size: 14px;
    font-weight: 800;
    color: #0f172a;
}

.info-table {
    display: flex;
    flex-direction: column;
    gap: 6px;
    font-size: 11px;
}

.info-row {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 8px;
}

.info-lbl {
    color: #64748b;
    flex-shrink: 0;
    width: 80px;
}

.info-val {
    text-align: right;
    word-break: break-word;
}

.highlight-stok {
    background: #f0fdf4;
    border: 1px solid #bbf7d0;
    padding: 6px 8px;
    border-radius: 4px;
    margin-top: 4px;
}

.stok-big {
    font-size: 14px;
    font-weight: 800;
    color: #166534;
}

.empty-scan-state {
    text-align: center;
    padding: 30px 16px;
}

.scanner-tracker-card {
    background: white;
    border: 1px solid #cbd5e1;
    border-radius: 6px;
    padding: 10px 14px;
}

.tracker-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
}

.border-top {
    border-top: 1px solid #f1f5f9;
}

/* ── RIGHT PANEL (TABLE) ── */
.right-panel {
    display: flex;
    flex-direction: column;
    min-height: 0;
}

.table-card {
    background: white;
    border: 1px solid #cbd5e1;
    border-radius: 6px;
    overflow: hidden;
}

.table-toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 12px;
    background: #f8fafc;
    border-bottom: 1px solid #e2e8f0;
}

.toolbar-title {
    font-size: 11px;
    color: #1e293b;
    text-transform: uppercase;
}

.mini-search-wrapper {
    position: relative;
    display: flex;
    align-items: center;
    width: 220px;
}

.mini-icon {
    position: absolute;
    left: 6px;
}

.mini-search-input {
    width: 100%;
    height: 24px;
    border: 1px solid #cbd5e1;
    border-radius: 3px;
    padding: 0 20px 0 24px;
    font-size: 11px;
    outline: none;
}
.mini-search-input:focus {
    border-color: #1976d2;
}

.btn-mini-clear {
    position: absolute;
    right: 6px;
    background: transparent;
    border: none;
    font-size: 10px;
    color: #94a3b8;
    cursor: pointer;
}

.table-scroll-wrap {
    overflow: auto;
}

.inventory-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 11px;
}

.inventory-table th {
    background: #f1f5f9;
    border-bottom: 1px solid #cbd5e1;
    border-right: 1px solid #e2e8f0;
    padding: 6px 8px;
    text-align: left;
    font-weight: 700;
    color: #334155;
    white-space: nowrap;
    position: sticky;
    top: 0;
    z-index: 10;
}

.inventory-table td {
    border-bottom: 1px solid #f1f5f9;
    border-right: 1px solid #f8fafc;
    padding: 4px 8px;
    vertical-align: middle;
}

.table-row-item {
    cursor: pointer;
    transition: background 0.1s ease;
}

.table-row-item:hover {
    background: #f8fafc;
}

.table-row-item.is-scanned {
    background: #f0fdf4;
}

.table-row-item.is-active {
    background: #e0f2fe !important;
}

.barcode-badge {
    font-family: monospace;
    font-size: 10px;
    font-weight: 700;
    color: #1976d2;
    background: #eef2f6;
    padding: 2px 5px;
    border-radius: 3px;
    border: 1px solid #cbd5e1;
}

.status-indicator {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 18px;
    height: 18px;
    border-radius: 50%;
    font-size: 10px;
}

.status-indicator.scanned {
    background: #22c55e;
    color: white;
}

.status-indicator.pending {
    color: #cbd5e1;
    font-size: 14px;
}

.gdg-tag {
    font-size: 9px;
    font-weight: 700;
    color: #475569;
    background: #f1f5f9;
    padding: 1px 4px;
    border-radius: 2px;
}

.table-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 6px 12px;
    background: #f8fafc;
    border-top: 1px solid #e2e8f0;
}

.animate-fade-in {
    animation: fadeIn 0.25s ease-in-out;
}

@keyframes fadeIn {
    from {
        opacity: 0;
        transform: translateY(4px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}
</style>
