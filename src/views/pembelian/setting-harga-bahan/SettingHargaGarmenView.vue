<script setup lang="ts">
import { ref, reactive, watch, computed } from "vue";
import { useRoute } from "vue-router";
import { useToast } from "vue-toastification";
import {
    IconShirt,
    IconPlus,
    IconPencil,
    IconTrash,
    IconFileSpreadsheet,
    IconX,
    IconRefresh,
    IconSearch,
    IconHelpCircle,
    IconSparkles,
    IconFolderOff,
    IconFilter,
    IconFilterOff,
    IconAdjustmentsHorizontal,
} from "@tabler/icons-vue";
import { useBrowse } from "@/composables/useBrowse";
import BaseBrowse from "@/components/BaseBrowse.vue";
import PageLayout from "@/components/PageLayout.vue";
import { useTabsStore } from "@/stores/tabsStore";
import { settingHargaBahanService } from "@/services/pembelian/settingHargaBahanService";
import { exportExcelSingle, type ExcelColumn } from "@/utils/excelExport";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";

const toast = useToast();
const route = useRoute();
const tabsStore = useTabsStore();

// Mode aktif: 'kh0001' | 'kh0002' | 'tambahan'
const activeSub = ref<"kh0001" | "kh0002" | "tambahan">("kh0001");
const searchQuery = ref("");

const closeCurrentTab = () => {
    tabsStore.closeTab(route.path);
};

// ==========================================
// 1. DATA MASTER KAIN GARMEN
// ==========================================
const {
    items: rawKainItems,
    isLoading: kainLoading,
    canInsert,
    canEdit,
    canDelete,
    canExport,
    fetchData: fetchKain,
} = useBrowse({
    menuId: "210",
    fetchApi: async () => {
        const res = await settingHargaBahanService.getKainGarmen();
        return res.data.data;
    },
});

// Selection untuk Model 1 dan Model 2
const selectedRow = ref<any | null>(null);

// Helper Gramasi berdasarkan Jenis Kain
const getGramasi = (jenisKain: string): string => {
    const jk = (jenisKain || "").toUpperCase();
    if (jk.includes("20S")) return "190 - 200";
    if (jk.includes("24S")) return "175 - 185";
    if (jk.includes("30S")) return "140 - 150";
    if (jk.includes("LACOST")) return "220 - 230";
    if (jk.includes("PE SINGLE")) return "150 - 160";
    if (jk.includes("PE DOUBLE")) return "200 - 210";
    if (jk.includes("HYGIT")) return "100 - 110";
    if (jk.includes("DRYFIT")) return "140 - 150";
    return "-";
};

// Custom settings override untuk Biaya Jahit dan Margin Tier per item kain
const customKainSettings = ref<
    Record<
        string,
        {
            biayaJahit?: number;
            t1?: number;
            t2?: number;
            t3?: number;
            t4?: number;
            t5?: number;
        }
    >
>({});

// Parser data spreadsheet lengkap untuk model garmen
const parseKainData = (kodeModel: "KH-0001" | "KH-0002") => {
    if (!rawKainItems.value || !Array.isArray(rawKainItems.value)) return [];

    const itemsForModel = rawKainItems.value.filter(
        (item: any) => (item.mhk_kode || "").toUpperCase() === kodeModel,
    );

    // Kumpulkan master babaran per jenis kain
    const babaranMap = new Map<
        string,
        { body: number; lengan: number; rib: number; lenganText: string }
    >();

    itemsForModel.forEach((item: any) => {
        const jk = (item.mhk_jeniskain || "").trim();
        if (!babaranMap.has(jk)) {
            babaranMap.set(jk, {
                body: 0,
                lengan: 0,
                rib: 70,
                lenganText: "PENDEK",
            });
        }
        const b = babaranMap.get(jk)!;
        const komp = (item.mhk_komponen || "").toUpperCase();
        const val = Number(item.mhk_babaran) || 0;

        if (komp === "BODY" && val > 0) b.body = val;
        else if (komp === "LENGAN" && val > 0) b.lengan = val;
        else if (komp === "RIB" && val > 0) b.rib = val;
        else if (val > 0 && b.body === 0) b.body = val;

        if (item.mhk_lengan) b.lenganText = item.mhk_lengan;
    });

    return itemsForModel.map((item: any) => {
        const jk = (item.mhk_jeniskain || "").trim();
        const ktg = (item.mhk_ktg || "").toUpperCase();
        const b = babaranMap.get(jk) || {
            body: 0,
            lengan: 0,
            rib: 70,
            lenganText: "PENDEK",
        };

        const isSport = ktg === "PE" || ktg === "HYGIT" || ktg === "DRYFIT";
        const allowancePersen = Number(item.mhk_allow) || (isSport ? 5 : 17);
        const hargaBahan = Number(item.mhk_harga) || 0;

        const hargaBody = b.body > 0 ? hargaBahan / b.body / 1.11 : 0;
        const hargaLengan =
            kodeModel === "KH-0002" && b.lengan > 0
                ? hargaBahan / b.lengan / 1.11
                : 0;
        const hargaRib = b.rib > 0 ? hargaBahan / b.rib / 1.11 : 0;

        const totalHargaBahan = hargaBody + hargaLengan + hargaRib;
        const allowanceRp = totalHargaBahan * (allowancePersen / 100);
        const totalBahan = totalHargaBahan + allowanceRp;

        const itemRowId = `${item.mhk_kode}_${jk}_${item.mhk_warna}_${item.mhk_komponen}`;
        const customSet = customKainSettings.value[itemRowId] || {};

        // Biaya Konveksi / Jahit (Default: 5610 / 2800, dapat di-override)
        const biayaKonveksi =
            customSet.biayaJahit !== undefined
                ? customSet.biayaJahit
                : isSport
                  ? 2800
                  : 5610;
        const hpp = totalBahan + biayaKonveksi;

        // Tangga Margin Qty
        const calcTier = (persen: number) => {
            const margin = hpp * (persen / 100);
            const jual = hpp + margin;
            const up = Math.ceil(jual / 1000) * 1000;
            return { margin, jual, up };
        };

        const t1 = calcTier(customSet.t1 ?? 20);
        const t2 = calcTier(customSet.t2 ?? 15);
        const t3 = calcTier(customSet.t3 ?? 10);
        const t4 = calcTier(customSet.t4 ?? 7.5);
        const t5 = calcTier(customSet.t5 ?? 2);

        return {
            rowId: `${item.mhk_kode}_${jk}_${item.mhk_warna}_${item.mhk_komponen}`,
            rawItem: item,
            kode: item.mhk_kode || kodeModel,
            ktg,
            jenisKain: jk,
            lengan: item.mhk_lengan || b.lenganText,
            gramasi: getGramasi(jk),
            babaranBody: b.body,
            babaranLengan: b.lengan,
            babaranRib: b.rib,
            warna: item.mhk_warna || "-",
            hargaBahan,
            hargaBody,
            hargaLengan,
            hargaRib,
            totalHargaBahan,
            allowancePersen,
            allowanceRp,
            totalBahan,
            biayaKonveksi,
            hpp,
            tier1_margin: t1.margin,
            tier1_jual: t1.jual,
            tier1_up: t1.up,
            tier2_margin: t2.margin,
            tier2_jual: t2.jual,
            tier2_up: t2.up,
            tier3_margin: t3.margin,
            tier3_jual: t3.jual,
            tier3_up: t3.up,
            tier4_margin: t4.margin,
            tier4_jual: t4.jual,
            tier4_up: t4.up,
            tier5_margin: t5.margin,
            tier5_jual: t5.jual,
            tier5_up: t5.up,
        };
    });
};

const itemsKh0001All = computed(() => parseKainData("KH-0001"));
const itemsKh0002All = computed(() => parseKainData("KH-0002"));

// Format Rupiah Helper
const formatRp = (val: number) => {
    return Math.round(val || 0).toLocaleString("id-ID");
};

// Row & Chip styling helper berdasarkan kategori warna (Muda, Sedang, Tua)
const getRowWarnaClass = (warna: string) => {
    const w = (warna || "").trim().toUpperCase();
    if (w.includes("MUDA")) return "row-warna-muda";
    if (w.includes("SEDANG")) return "row-warna-sedang";
    if (w.includes("TUA")) return "row-warna-tua";
    return "";
};

const getWarnaChipColor = (warna: string) => {
    const w = (warna || "").trim().toUpperCase();
    if (w.includes("MUDA")) return "info";
    if (w.includes("SEDANG")) return "warning";
    if (w.includes("TUA")) return "purple";
    return "primary";
};

// Selection handler
const selectRow = (row: any) => {
    if (selectedRow.value?.rowId === row.rowId) {
        selectedRow.value = null;
    } else {
        selectedRow.value = row;
    }
};

const getColValue = (row: any, key: string): string => {
    switch (key) {
        case "jenisKain":
            return row.jenisKain || "-";
        case "lengan":
            return row.lengan || "-";
        case "gramasi":
            return row.gramasi || "-";
        case "babaran":
        case "babaranBody":
            return row.babaranBody
                ? `${Number(row.babaranBody).toLocaleString("id-ID")} kg`
                : "-";
        case "babaranLengan":
            return row.babaranLengan
                ? `${Number(row.babaranLengan).toLocaleString("id-ID")} kg`
                : "-";
        case "warna":
            return row.warna || "-";
        case "hargaBahan":
            return `Rp ${formatRp(row.hargaBahan)}`;
        case "hargaBody":
            return `Rp ${formatRp(row.hargaBody)}`;
        case "hargaLengan":
            return `Rp ${formatRp(row.hargaLengan)}`;
        case "hargaRib":
            return `Rp ${formatRp(row.hargaRib)}`;
        case "totalHargaBahan":
            return `Rp ${formatRp(row.totalHargaBahan)}`;
        case "allowance":
            return `${row.allowancePersen}%`;
        case "totalBahan":
            return `Rp ${formatRp(row.totalBahan)}`;
        case "biayaKonveksi":
            return `Rp ${formatRp(row.biayaKonveksi)}`;
        case "hpp":
            return `Rp ${formatRp(row.hpp)}`;
        case "tier1":
            return `Rp ${formatRp(row.tier1_up)}`;
        case "tier2":
            return `Rp ${formatRp(row.tier2_up)}`;
        case "tier3":
            return `Rp ${formatRp(row.tier3_up)}`;
        case "tier4":
            return `Rp ${formatRp(row.tier4_up)}`;
        case "tier5":
            return `Rp ${formatRp(row.tier5_up)}`;
        default:
            return String(row[key] ?? "");
    }
};

// ==========================================
// 1.2 FITUR FILTER HEADER KOLOM (ala BaseBrowse)
// ==========================================
const activeFilterCol = ref<string | null>(null);
const filterDropdownStyle = ref<Record<string, string>>({});
const colFilterSearch = ref<Record<string, string>>({});
const columnFilters = ref<Record<string, Set<string>>>({});

const uniqueValuesPerCol = computed(() => {
    const result: Record<string, string[]> = {};
    const source =
        activeSub.value === "kh0001"
            ? itemsKh0001All.value
            : itemsKh0002All.value;
    const cols = [
        { key: "jenisKain", title: "JENIS KAIN" },
        ...currentCols.value,
    ];

    for (const col of cols) {
        const key = col.key;
        if (!key) continue;
        const vals = new Set<string>();
        for (const item of source) {
            vals.add(getColValue(item, key));
        }
        result[key] = Array.from(vals).sort((a, b) =>
            a.localeCompare(b, "id", { numeric: true }),
        );
    }
    return result;
});

const filteredUniqueVals = (key: string) => {
    const s = (colFilterSearch.value[key] ?? "").toLowerCase();
    const all = uniqueValuesPerCol.value[key] ?? [];
    return s ? all.filter((v) => v.toLowerCase().includes(s)) : all;
};

const colHasFilter = (key: string) => {
    const s = columnFilters.value[key];
    if (!s) return false;
    const total = uniqueValuesPerCol.value[key]?.length ?? 0;
    return s.size < total;
};

const toggleColFilter = (key: string, val: string) => {
    if (!columnFilters.value[key]) {
        const allVals = uniqueValuesPerCol.value[key] ?? [];
        columnFilters.value[key] = new Set(allVals);
    }
    const s = columnFilters.value[key];
    if (s.has(val)) s.delete(val);
    else s.add(val);
    columnFilters.value = { ...columnFilters.value };
};

const onColSearchInput = (key: string, val: string) => {
    colFilterSearch.value[key] = val;
    if (val) {
        const matched = filteredUniqueVals(key);
        columnFilters.value[key] = new Set(matched);
    } else {
        const allVals = uniqueValuesPerCol.value[key] ?? [];
        columnFilters.value[key] = new Set(allVals);
    }
    columnFilters.value = { ...columnFilters.value };
};

const selectAllCol = (key: string) => {
    colFilterSearch.value[key] = "";
    const allVals = uniqueValuesPerCol.value[key] ?? [];
    columnFilters.value[key] = new Set(allVals);
    columnFilters.value = { ...columnFilters.value };
};

const hideAllCol = (key: string) => {
    columnFilters.value[key] = new Set();
    columnFilters.value = { ...columnFilters.value };
};

const openColFilter = (key: string, event: MouseEvent) => {
    if (activeFilterCol.value === key) {
        activeFilterCol.value = null;
        return;
    }

    if (!columnFilters.value[key]) {
        const allVals = uniqueValuesPerCol.value[key] ?? [];
        columnFilters.value[key] = new Set(allVals);
        columnFilters.value = { ...columnFilters.value };
    }

    const th = (event.currentTarget as HTMLElement).closest("th");
    if (th) {
        const rect = th.getBoundingClientRect();
        const dropdownWidth = 220;
        const left = Math.min(
            rect.left,
            window.innerWidth - dropdownWidth - 10,
        );
        filterDropdownStyle.value = {
            position: "fixed",
            top: `${rect.bottom + 2}px`,
            left: `${Math.max(10, left)}px`,
            zIndex: "9999",
        };
    }
    activeFilterCol.value = key;
    if (!colFilterSearch.value[key]) colFilterSearch.value[key] = "";
};

const closeColFilter = () => {
    activeFilterCol.value = null;
};

const onTableWrapClick = (e: MouseEvent) => {
    const target = e.target as HTMLElement;
    if (
        !target.closest(".col-filter-dropdown") &&
        !target.closest(".col-filter-btn")
    ) {
        activeFilterCol.value = null;
    }
};

const activeFilterCount = computed(() => {
    let count = 0;
    if (searchQuery.value.trim()) count++;
    count += Object.keys(columnFilters.value).filter((k) =>
        colHasFilter(k),
    ).length;
    return count;
});

const resetFilters = () => {
    searchQuery.value = "";
    columnFilters.value = {};
    colFilterSearch.value = {};
    activeFilterCol.value = null;
};

const filterRow = (r: any, q: string) => {
    // Filter Kolom Header
    for (const [key, allowed] of Object.entries(columnFilters.value)) {
        if (!colHasFilter(key)) continue;
        const val = getColValue(r, key);
        if (!allowed.has(String(val))) return false;
    }

    if (!q) return true;
    return (
        r.jenisKain.toLowerCase().includes(q) ||
        r.warna.toLowerCase().includes(q) ||
        r.ktg.toLowerCase().includes(q) ||
        r.lengan.toLowerCase().includes(q) ||
        r.gramasi.toLowerCase().includes(q) ||
        String(r.hargaBahan).includes(q) ||
        String(r.hpp).includes(q) ||
        String(r.tier1_up).includes(q)
    );
};

const filteredKh0001 = computed(() => {
    const q = searchQuery.value.toLowerCase().trim();
    return itemsKh0001All.value.filter((r) => filterRow(r, q));
});

const filteredKh0002 = computed(() => {
    const q = searchQuery.value.toLowerCase().trim();
    return itemsKh0002All.value.filter((r) => filterRow(r, q));
});

// ==========================================
// 1.1 FITUR PINDAH KOLOM (DRAG & DROP ala BaseBrowse)
// ==========================================
interface GarmenColDef {
    key: string;
    title: string;
    width?: string;
    align?: "start" | "center" | "end";
    isGroup?: boolean;
    colSpan?: number;
    subHeaders?: { key: string; title: string; subClass?: string }[];
}

const defaultColsKh0001: GarmenColDef[] = [
    { key: "lengan", title: "LENGAN", width: "80px", align: "center" },
    { key: "gramasi", title: "GRAMASI", width: "90px", align: "center" },
    { key: "babaran", title: "BABARAN", width: "95px", align: "end" },
    { key: "warna", title: "WARNA", width: "80px", align: "center" },
    { key: "hargaBahan", title: "HARGA / KG", width: "115px", align: "end" },
    { key: "hargaBody", title: "HRG BODY", width: "100px", align: "end" },
    { key: "hargaRib", title: "HRG RIB", width: "95px", align: "end" },
    {
        key: "totalHargaBahan",
        title: "Hrg Bahan",
        width: "105px",
        align: "end",
    },
    { key: "allowance", title: "ALLOW (%)", width: "85px", align: "center" },
    { key: "biayaKonveksi", title: "JAHIT", width: "95px", align: "end" },
    { key: "hpp", title: "HPP", width: "105px", align: "end" },
    {
        key: "tier1",
        title: "100 - 249 PCS (20%)",
        isGroup: true,
        colSpan: 3,
        subHeaders: [
            { key: "tier1_margin", title: "MARGIN" },
            { key: "tier1_jual", title: "HRG JUAL" },
            { key: "tier1_up", title: "HARGA UP", subClass: "th-up" },
        ],
    },
    {
        key: "tier2",
        title: "250 - 499 PCS (15%)",
        isGroup: true,
        colSpan: 3,
        subHeaders: [
            { key: "tier2_margin", title: "MARGIN" },
            { key: "tier2_jual", title: "HRG JUAL" },
            { key: "tier2_up", title: "HARGA UP", subClass: "th-up" },
        ],
    },
    {
        key: "tier3",
        title: "500 - 749 PCS (10%)",
        isGroup: true,
        colSpan: 3,
        subHeaders: [
            { key: "tier3_margin", title: "MARGIN" },
            { key: "tier3_jual", title: "HRG JUAL" },
            { key: "tier3_up", title: "HARGA UP", subClass: "th-up" },
        ],
    },
    {
        key: "tier4",
        title: "750 - 999 PCS (7.5%)",
        isGroup: true,
        colSpan: 3,
        subHeaders: [
            { key: "tier4_margin", title: "MARGIN" },
            { key: "tier4_jual", title: "HRG JUAL" },
            { key: "tier4_up", title: "HARGA UP", subClass: "th-up" },
        ],
    },
    {
        key: "tier5",
        title: "≥ 1000 PCS (2%)",
        isGroup: true,
        colSpan: 3,
        subHeaders: [
            { key: "tier5_margin", title: "MARGIN" },
            { key: "tier5_jual", title: "HRG JUAL" },
            { key: "tier5_up", title: "HARGA UP", subClass: "th-up" },
        ],
    },
];

const defaultColsKh0002: GarmenColDef[] = [
    { key: "lengan", title: "LENGAN", width: "80px", align: "center" },
    { key: "gramasi", title: "GRAMASI", width: "90px", align: "center" },
    { key: "babaranBody", title: "BABARAN BODY", width: "115px", align: "end" },
    {
        key: "babaranLengan",
        title: "BABARAN LENGAN",
        width: "125px",
        align: "end",
    },
    { key: "warna", title: "WARNA", width: "80px", align: "center" },
    { key: "hargaBahan", title: "HARGA / KG", width: "115px", align: "end" },
    { key: "hargaBody", title: "HRG BODY", width: "100px", align: "end" },
    { key: "hargaLengan", title: "HRG LENGAN", width: "105px", align: "end" },
    { key: "hargaRib", title: "HRG RIB", width: "95px", align: "end" },
    {
        key: "totalHargaBahan",
        title: "Hrg Bahan",
        width: "105px",
        align: "end",
    },
    { key: "allowance", title: "ALLOW (%)", width: "85px", align: "center" },
    { key: "biayaKonveksi", title: "KONVEKSI", width: "95px", align: "end" },
    { key: "hpp", title: "HPP", width: "105px", align: "end" },
    {
        key: "tier1",
        title: "100 - 249 PCS (20%)",
        isGroup: true,
        colSpan: 3,
        subHeaders: [
            { key: "tier1_margin", title: "MARGIN" },
            { key: "tier1_jual", title: "HRG JUAL" },
            { key: "tier1_up", title: "HARGA UP", subClass: "th-up" },
        ],
    },
    {
        key: "tier2",
        title: "250 - 499 PCS (15%)",
        isGroup: true,
        colSpan: 3,
        subHeaders: [
            { key: "tier2_margin", title: "MARGIN" },
            { key: "tier2_jual", title: "HRG JUAL" },
            { key: "tier2_up", title: "HARGA UP", subClass: "th-up" },
        ],
    },
    {
        key: "tier3",
        title: "500 - 749 PCS (10%)",
        isGroup: true,
        colSpan: 3,
        subHeaders: [
            { key: "tier3_margin", title: "MARGIN" },
            { key: "tier3_jual", title: "HRG JUAL" },
            { key: "tier3_up", title: "HARGA UP", subClass: "th-up" },
        ],
    },
    {
        key: "tier4",
        title: "750 - 999 PCS (7.5%)",
        isGroup: true,
        colSpan: 3,
        subHeaders: [
            { key: "tier4_margin", title: "MARGIN" },
            { key: "tier4_jual", title: "HRG JUAL" },
            { key: "tier4_up", title: "HARGA UP", subClass: "th-up" },
        ],
    },
    {
        key: "tier5",
        title: "≥ 1000 PCS (2%)",
        isGroup: true,
        colSpan: 3,
        subHeaders: [
            { key: "tier5_margin", title: "MARGIN" },
            { key: "tier5_jual", title: "HRG JUAL" },
            { key: "tier5_up", title: "HARGA UP", subClass: "th-up" },
        ],
    },
];

const colOrderKeyKh0001 = "garmen_colorder_kh0001";
const colOrderKeyKh0002 = "garmen_colorder_kh0002";

const loadColOrder = (key: string): string[] => {
    try {
        const raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) : [];
    } catch {
        return [];
    }
};

const saveColOrder = (key: string, order: string[]) => {
    try {
        localStorage.setItem(key, JSON.stringify(order));
    } catch {}
};

const colOrderKh0001 = ref<string[]>(loadColOrder(colOrderKeyKh0001));
const colOrderKh0002 = ref<string[]>(loadColOrder(colOrderKeyKh0002));

const currentCols = computed(() => {
    const isKh0001 = activeSub.value === "kh0001";
    const defaults = isKh0001 ? defaultColsKh0001 : defaultColsKh0002;
    const orders = isKh0001 ? colOrderKh0001.value : colOrderKh0002.value;

    if (orders.length === 0) return defaults;

    const map = new Map(defaults.map((c) => [c.key, c]));
    const result: GarmenColDef[] = [];

    for (const key of orders) {
        if (map.has(key)) result.push(map.get(key)!);
    }
    for (const c of defaults) {
        if (!orders.includes(c.key)) result.push(c);
    }
    return result;
});

const isColOrderChanged = computed(() => {
    return activeSub.value === "kh0001"
        ? colOrderKh0001.value.length > 0
        : colOrderKh0002.value.length > 0;
});

const resetColOrder = () => {
    if (activeSub.value === "kh0001") {
        colOrderKh0001.value = [];
        localStorage.removeItem(colOrderKeyKh0001);
    } else {
        colOrderKh0002.value = [];
        localStorage.removeItem(colOrderKeyKh0002);
    }
};

const tableWrapRef = ref<HTMLElement | null>(null);
const dragSrcKey = ref<string | null>(null);
const dragOverKey = ref<string | null>(null);
const isDragging = ref(false);

let pointerDragKey: string | null = null;
let autoScrollTimer: number | null = null;

const onColPointerDown = (key: string, e: PointerEvent) => {
    const target = e.target as HTMLElement;
    if (!target.classList.contains("col-drag-handle")) return;

    pointerDragKey = key;
    dragSrcKey.value = key;
    isDragging.value = true;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
};

const onColPointerMove = (e: PointerEvent) => {
    if (!isDragging.value || !pointerDragKey) return;

    const els = document.elementsFromPoint(e.clientX, e.clientY);
    const th = els.find(
        (el) => el.tagName === "TH" && el.hasAttribute("data-col-key"),
    ) as HTMLElement | undefined;

    if (th) {
        const key = th.getAttribute("data-col-key");
        if (key && key !== pointerDragKey) {
            dragOverKey.value = key;
        }
    }

    const wrapper = tableWrapRef.value;
    if (!wrapper) return;

    const rect = wrapper.getBoundingClientRect();
    const EDGE = 80;
    const SPEED = 12;

    if (autoScrollTimer) {
        clearInterval(autoScrollTimer);
        autoScrollTimer = null;
    }

    if (e.clientX < rect.left + EDGE) {
        autoScrollTimer = window.setInterval(() => {
            wrapper.scrollLeft -= SPEED;
        }, 16);
    } else if (e.clientX > rect.right - EDGE) {
        autoScrollTimer = window.setInterval(() => {
            wrapper.scrollLeft += SPEED;
        }, 16);
    }
};

const onColPointerUp = () => {
    if (!isDragging.value) return;

    if (autoScrollTimer) {
        clearInterval(autoScrollTimer);
        autoScrollTimer = null;
    }

    if (
        pointerDragKey &&
        dragOverKey.value &&
        pointerDragKey !== dragOverKey.value
    ) {
        const currentOrder = currentCols.value.map((c) => c.key);
        const srcIdx = currentOrder.indexOf(pointerDragKey);
        const tgtIdx = currentOrder.indexOf(dragOverKey.value);

        if (srcIdx !== -1 && tgtIdx !== -1) {
            const newOrder = [...currentOrder];
            newOrder.splice(srcIdx, 1);
            newOrder.splice(tgtIdx, 0, pointerDragKey);

            if (activeSub.value === "kh0001") {
                colOrderKh0001.value = newOrder;
                saveColOrder(colOrderKeyKh0001, newOrder);
            } else {
                colOrderKh0002.value = newOrder;
                saveColOrder(colOrderKeyKh0002, newOrder);
            }
        }
    }

    pointerDragKey = null;
    dragSrcKey.value = null;
    dragOverKey.value = null;
    isDragging.value = false;
};

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

watch(activeSub, (newVal) => {
    selectedRow.value = null;
    if (newVal === "tambahan") fetchTambahan();
    else fetchKain();
});

// ==========================================
// DIALOG STATES & HANDLERS
// ==========================================
const kainDialog = ref(false);
const isEditKain = ref(false);
const confirmKainSave = ref(false);

const kainForm = reactive({
    mhk_kode: "KH-0001",
    mhk_ktg: "COTTON",
    mhk_jeniskain: "",
    mhk_lengan: "PENDEK",
    mhk_komponen: "BODY",
    mhk_babaran: 0,
    mhk_warna: "MUDA",
    mhk_harga: 0,
    mhk_allow: 17,
    biayaJahit: 5610,
    tier1_margin_pct: 20,
    tier2_margin_pct: 15,
    tier3_margin_pct: 10,
    tier4_margin_pct: 7.5,
    tier5_margin_pct: 2,
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

const handleAdd = () => {
    if (activeSub.value === "tambahan") {
        isEditTambahan.value = false;
        oldTambahanKet.value = "";
        Object.assign(tambahanForm, {
            mht_ket: "",
            mht_lacost: 0,
            mht_cotton: 0,
            mht_pe: 0,
        });
        tambahanDialog.value = true;
    } else {
        isEditKain.value = false;
        Object.assign(kainForm, {
            mhk_kode: activeSub.value === "kh0001" ? "KH-0001" : "KH-0002",
            mhk_ktg: "COTTON",
            mhk_jeniskain: "",
            mhk_lengan: "PENDEK",
            mhk_komponen: "BODY",
            mhk_babaran: 0,
            mhk_warna: "MUDA",
            mhk_harga: 0,
            mhk_allow: 17,
            biayaJahit: 5610,
            tier1_margin_pct: 20,
            tier2_margin_pct: 15,
            tier3_margin_pct: 10,
            tier4_margin_pct: 7.5,
            tier5_margin_pct: 2,
            old_jeniskain: "",
            old_warna: "",
            old_komponen: "",
            old_lengan: "",
        });
        kainDialog.value = true;
    }
};

const handleEdit = (item?: any) => {
    if (activeSub.value === "tambahan") {
        const target = item || tambahanSelected.value?.[0];
        if (!target) return;
        isEditTambahan.value = true;
        oldTambahanKet.value = target.mht_ket;
        Object.assign(tambahanForm, {
            mht_ket: target.mht_ket,
            mht_lacost: Number(target.mht_lacost) || 0,
            mht_cotton: Number(target.mht_cotton) || 0,
            mht_pe: Number(target.mht_pe) || 0,
        });
        tambahanDialog.value = true;
    } else {
        const target = item || selectedRow.value;
        if (!target) return;
        const raw = target.rawItem || target;
        isEditKain.value = true;

        const isSport =
            (raw.mhk_ktg || target.ktg || "").toUpperCase() === "PE" ||
            (raw.mhk_ktg || target.ktg || "").toUpperCase() === "HYGIT" ||
            (raw.mhk_ktg || target.ktg || "").toUpperCase() === "DRYFIT";
        const rowId = `${raw.mhk_kode || target.kode}_${raw.mhk_jeniskain || target.jenisKain}_${raw.mhk_warna || target.warna}_${raw.mhk_komponen || "BODY"}`;
        const savedCustom = customKainSettings.value[rowId] || {};

        Object.assign(kainForm, {
            ...raw,
            mhk_kode: raw.mhk_kode || target.kode || (activeSub.value === "kh0001" ? "KH-0001" : "KH-0002"),
            mhk_ktg: raw.mhk_ktg || target.ktg || "COTTON",
            mhk_jeniskain: raw.mhk_jeniskain || target.jenisKain,
            mhk_lengan: raw.mhk_lengan || target.lengan || "PENDEK",
            mhk_komponen: raw.mhk_komponen || "BODY",
            mhk_warna: raw.mhk_warna || target.warna,
            mhk_babaran: Number(raw.mhk_babaran || target.babaranBody || target.babaran) || 0,
            mhk_harga: Number(raw.mhk_harga || target.hargaBahan) || 0,
            mhk_allow: Number(raw.mhk_allow || target.allowancePersen) || 17,
            biayaJahit: savedCustom.biayaJahit ?? (isSport ? 2800 : 5610),
            tier1_margin_pct: savedCustom.t1 ?? 20,
            tier2_margin_pct: savedCustom.t2 ?? 15,
            tier3_margin_pct: savedCustom.t3 ?? 10,
            tier4_margin_pct: savedCustom.t4 ?? 7.5,
            tier5_margin_pct: savedCustom.t5 ?? 2,
            old_jeniskain: raw.mhk_jeniskain || target.jenisKain,
            old_warna: raw.mhk_warna || target.warna,
            old_komponen: raw.mhk_komponen || "BODY",
            old_lengan: raw.mhk_lengan || target.lengan || "PENDEK",
        });
        kainDialog.value = true;
    }
};

const handleDelete = async (item?: any) => {
    if (activeSub.value === "tambahan") {
        const target = item || tambahanSelected.value?.[0];
        if (!target) return;
        try {
            await settingHargaBahanService.deleteTambahanGarmen(target.mht_ket);
            toast.success(
                `Biaya tambahan "${target.mht_ket}" berhasil dihapus`,
            );
            fetchTambahan();
        } catch (err: any) {
            toast.error(
                err.response?.data?.message || "Gagal menghapus biaya tambahan",
            );
        }
    } else {
        const target = item || selectedRow.value;
        if (!target) return;
        const raw = target.rawItem || target;
        if (
            confirm(
                `Yakin ingin menghapus harga kain ${raw.mhk_jeniskain} (${raw.mhk_warna})?`,
            )
        ) {
            try {
                await settingHargaBahanService.deleteKainGarmen(raw);
                toast.success(
                    `Harga kain ${raw.mhk_jeniskain} (${raw.mhk_warna}) berhasil dihapus`,
                );
                selectedRow.value = null;
                fetchKain();
            } catch (err: any) {
                toast.error(
                    err.response?.data?.message || "Gagal menghapus kain",
                );
            }
        }
    }
};

const handleRefresh = () => {
    selectedRow.value = null;
    if (activeSub.value === "tambahan") fetchTambahan();
    else fetchKain();
};

const handleExport = async () => {
    if (activeSub.value === "tambahan") {
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
                    align: "right",
                },
                {
                    key: "mht_cotton",
                    header: "COTTON (RP)",
                    width: 18,
                    numFmt: "Rp #,##0",
                    align: "right",
                },
                {
                    key: "mht_pe",
                    header: "PE (RP)",
                    width: 18,
                    numFmt: "Rp #,##0",
                    align: "right",
                },
            ],
            tambahanItems.value ?? [],
            "Biaya Custom Tambahan Garmen",
        );
    } else {
        const isModel1 = activeSub.value === "kh0001";
        const dataRows = isModel1 ? filteredKh0001.value : filteredKh0002.value;
        const filename = isModel1
            ? "Setting_Harga_Kaos_1_Warna_KH0001.xlsx"
            : "Setting_Harga_Kaos_2_Warna_KH0002.xlsx";
        const titleSheet = isModel1
            ? "SETTING HARGA BAHAN KAOS1 WARNA"
            : "SETTING HARGA BAHAN KAOS 2 WARNA";
        const sheetName = isModel1 ? "Kaos 1 Warna" : "Kaos 2 Warna";

        const wb = new ExcelJS.Workbook();
        wb.creator = "MANKSI ERP";
        wb.created = new Date();

        const ws = wb.addWorksheet(sheetName, {
            views: [{ state: "frozen", xSplit: 2, ySplit: 4 }],
        });

        // ── Row 1: Title ──
        const titleRow = ws.addRow([titleSheet]);
        titleRow.getCell(1).font = {
            bold: true,
            size: 13,
            color: { argb: "FF1565C0" },
        };
        titleRow.height = 24;

        // ── Row 2: Empty Spacer ──
        ws.addRow([]);

        // ── Row 3 & 4: Two-Level Header ──
        interface ExportLeafCol {
            key: string;
            header: string;
            width: number;
            align: "left" | "center" | "right";
            numFmt?: string;
            isUp?: boolean;
            isTier?: boolean;
        }

        const leafCols: ExportLeafCol[] = [
            { key: "_no", header: "NO", width: 6, align: "center" },
            {
                key: "jenisKain",
                header: "JENIS KAIN",
                width: 25,
                align: "left",
            },
        ];

        const headerRow1Texts: string[] = ["NO", "JENIS KAIN"];
        const headerRow2Texts: string[] = ["", ""];

        const mergeRanges: {
            sRow: number;
            sCol: number;
            eRow: number;
            eCol: number;
        }[] = [
            { sRow: 3, sCol: 1, eRow: 4, eCol: 1 },
            { sRow: 3, sCol: 2, eRow: 4, eCol: 2 },
        ];

        let currentColIdx = 3;

        for (const col of currentCols.value) {
            if (col.isGroup && col.subHeaders) {
                const groupSpan = col.subHeaders.length;
                mergeRanges.push({
                    sRow: 3,
                    sCol: currentColIdx,
                    eRow: 3,
                    eCol: currentColIdx + groupSpan - 1,
                });

                headerRow1Texts.push(col.title);
                for (let i = 1; i < groupSpan; i++) headerRow1Texts.push("");

                for (const sub of col.subHeaders) {
                    headerRow2Texts.push(sub.title);
                    leafCols.push({
                        key: sub.key,
                        header: sub.title,
                        width: sub.key.includes("_up") ? 16 : 14,
                        align: "right",
                        numFmt: "Rp #,##0",
                        isUp: sub.key.includes("_up"),
                        isTier: true,
                    });
                    currentColIdx++;
                }
            } else {
                mergeRanges.push({
                    sRow: 3,
                    sCol: currentColIdx,
                    eRow: 4,
                    eCol: currentColIdx,
                });

                headerRow1Texts.push(col.title);
                headerRow2Texts.push("");

                let width = 14;
                let align: "left" | "center" | "right" = "right";
                let numFmt: string | undefined = "Rp #,##0";
                let dataKey = col.key;

                if (col.key === "lengan") {
                    width = 12;
                    align = "center";
                    numFmt = undefined;
                } else if (col.key === "gramasi") {
                    width = 14;
                    align = "center";
                    numFmt = undefined;
                } else if (col.key === "babaran" || col.key === "babaranBody") {
                    dataKey = "babaranBody";
                    width = 15;
                    align = "right";
                    numFmt = '#,##0.0 "kg"';
                } else if (col.key === "babaranLengan") {
                    width = 15;
                    align = "right";
                    numFmt = '#,##0.0 "kg"';
                } else if (col.key === "warna") {
                    width = 13;
                    align = "center";
                    numFmt = undefined;
                } else if (col.key === "allowance") {
                    dataKey = "allowancePersen";
                    width = 12;
                    align = "center";
                    numFmt = '0"%"';
                }

                leafCols.push({
                    key: dataKey,
                    header: col.title,
                    width,
                    align,
                    numFmt,
                    isTier: false,
                });
                currentColIdx++;
            }
        }

        // Set Widths
        ws.columns = leafCols.map((c) => ({
            key: c.key,
            width: c.width,
        }));

        // Add Header Rows
        const hRow1 = ws.addRow(headerRow1Texts);
        const hRow2 = ws.addRow(headerRow2Texts);

        hRow1.height = 24;
        hRow2.height = 22;

        // Apply Merges
        for (const m of mergeRanges) {
            ws.mergeCells(m.sRow, m.sCol, m.eRow, m.eCol);
        }

        // Style Header Cells (Level 1 & 2)
        for (let colIdx = 1; colIdx <= leafCols.length; colIdx++) {
            const c1 = ws.getCell(3, colIdx);
            const c2 = ws.getCell(4, colIdx);
            const colCfg = leafCols[colIdx - 1];

            const bgH1 = colCfg?.isTier ? "0D47A1" : "1565C0";
            const bgH2 = colCfg?.isUp
                ? "0D47A1"
                : colCfg?.isTier
                  ? "1976D2"
                  : "1565C0";

            c1.font = {
                bold: true,
                color: { argb: "FFFFFFFF" },
                size: 10,
            };
            c1.fill = {
                type: "pattern",
                pattern: "solid",
                fgColor: { argb: "FF" + bgH1 },
            };
            c1.alignment = {
                horizontal: "center",
                vertical: "middle",
                wrapText: false,
            };
            c1.border = {
                top: { style: "thin", color: { argb: "FFE0E0E0" } },
                left: { style: "thin", color: { argb: "FFE0E0E0" } },
                bottom: { style: "thin", color: { argb: "FFE0E0E0" } },
                right: { style: "thin", color: { argb: "FFE0E0E0" } },
            };

            c2.font = {
                bold: true,
                color: { argb: "FFFFFFFF" },
                size: 9.5,
            };
            c2.fill = {
                type: "pattern",
                pattern: "solid",
                fgColor: { argb: "FF" + bgH2 },
            };
            c2.alignment = {
                horizontal: "center",
                vertical: "middle",
                wrapText: false,
            };
            c2.border = {
                top: { style: "thin", color: { argb: "FFE0E0E0" } },
                left: { style: "thin", color: { argb: "FFE0E0E0" } },
                bottom: { style: "thin", color: { argb: "FFE0E0E0" } },
                right: { style: "thin", color: { argb: "FFE0E0E0" } },
            };
        }

        // Mapping Huruf Kolom Excel (A, B, C, ... AA, AB)
        const getExcelColLetter = (colIdx1Based: number): string => {
            let letter = "";
            let temp = colIdx1Based;
            while (temp > 0) {
                const rem = (temp - 1) % 26;
                letter = String.fromCharCode(65 + rem) + letter;
                temp = Math.floor((temp - 1) / 26);
            }
            return letter;
        };

        const colLetterMap: Record<string, string> = {};
        leafCols.forEach((c, idx) => {
            colLetterMap[c.key] = getExcelColLetter(idx + 1);
        });

        // ── Data Rows dengan Live Formula Excel ──
        dataRows.forEach((row, idx) => {
            const r = idx + 5; // Baris data Excel dimulai dari baris ke-5
            const values: any[] = [];

            const hrgBahanCol = colLetterMap["hargaBahan"];
            const babaranBodyCol =
                colLetterMap["babaranBody"] || colLetterMap["babaran"];
            const babaranLenganCol = colLetterMap["babaranLengan"];
            const hrgBodyCol = colLetterMap["hargaBody"];
            const hrgLenganCol = colLetterMap["hargaLengan"];
            const hrgRibCol = colLetterMap["hargaRib"];
            const ttlBahanCol = colLetterMap["totalHargaBahan"];
            const allowCol =
                colLetterMap["allowancePersen"] || colLetterMap["allowance"];
            const konveksiCol = colLetterMap["biayaKonveksi"];
            const hppCol = colLetterMap["hpp"];

            for (const colCfg of leafCols) {
                const key = colCfg.key;
                if (key === "_no") {
                    values.push(idx + 1);
                } else if (key === "hargaBody") {
                    if (hrgBahanCol && babaranBodyCol) {
                        values.push({
                            formula: `=${hrgBahanCol}${r}/${babaranBodyCol}${r}/1.11`,
                            result: row.hargaBody,
                        });
                    } else {
                        values.push(row.hargaBody ?? 0);
                    }
                } else if (key === "hargaLengan") {
                    if (hrgBahanCol && babaranLenganCol) {
                        values.push({
                            formula: `=${hrgBahanCol}${r}/${babaranLenganCol}${r}/1.11`,
                            result: row.hargaLengan,
                        });
                    } else {
                        values.push(row.hargaLengan ?? 0);
                    }
                } else if (key === "hargaRib") {
                    if (hrgBahanCol) {
                        values.push({
                            formula: `=${hrgBahanCol}${r}/70/1.11`,
                            result: row.hargaRib,
                        });
                    } else {
                        values.push(row.hargaRib ?? 0);
                    }
                } else if (key === "totalHargaBahan") {
                    if (hrgBodyCol && hrgRibCol) {
                        const parts = [
                            `${hrgBodyCol}${r}`,
                            hrgLenganCol ? `${hrgLenganCol}${r}` : null,
                            `${hrgRibCol}${r}`,
                        ].filter(Boolean);
                        values.push({
                            formula: `=${parts.join("+")}`,
                            result: row.totalHargaBahan,
                        });
                    } else {
                        values.push(row.totalHargaBahan ?? 0);
                    }
                } else if (key === "allowance" || key === "allowancePersen") {
                    values.push((Number(row.allowancePersen) || 0) / 100);
                } else if (key === "hpp") {
                    if (ttlBahanCol && allowCol && konveksiCol) {
                        values.push({
                            formula: `=${ttlBahanCol}${r}*(1+${allowCol}${r})+${konveksiCol}${r}`,
                            result: row.hpp,
                        });
                    } else {
                        values.push(row.hpp ?? 0);
                    }
                } else if (key === "tier1_margin") {
                    values.push(
                        hppCol
                            ? {
                                  formula: `=${hppCol}${r}*0.2`,
                                  result: row.tier1_margin,
                              }
                            : (row.tier1_margin ?? 0),
                    );
                } else if (key === "tier1_jual") {
                    const mCol = colLetterMap["tier1_margin"];
                    values.push(
                        hppCol && mCol
                            ? {
                                  formula: `=${hppCol}${r}+${mCol}${r}`,
                                  result: row.tier1_jual,
                              }
                            : (row.tier1_jual ?? 0),
                    );
                } else if (key === "tier1_up") {
                    const jCol = colLetterMap["tier1_jual"];
                    values.push(
                        jCol
                            ? {
                                  formula: `=ROUNDUP(${jCol}${r}/1000,0)*1000`,
                                  result: row.tier1_up,
                              }
                            : (row.tier1_up ?? 0),
                    );
                } else if (key === "tier2_margin") {
                    values.push(
                        hppCol
                            ? {
                                  formula: `=${hppCol}${r}*0.15`,
                                  result: row.tier2_margin,
                              }
                            : (row.tier2_margin ?? 0),
                    );
                } else if (key === "tier2_jual") {
                    const mCol = colLetterMap["tier2_margin"];
                    values.push(
                        hppCol && mCol
                            ? {
                                  formula: `=${hppCol}${r}+${mCol}${r}`,
                                  result: row.tier2_jual,
                              }
                            : (row.tier2_jual ?? 0),
                    );
                } else if (key === "tier2_up") {
                    const jCol = colLetterMap["tier2_jual"];
                    values.push(
                        jCol
                            ? {
                                  formula: `=ROUNDUP(${jCol}${r}/1000,0)*1000`,
                                  result: row.tier2_up,
                              }
                            : (row.tier2_up ?? 0),
                    );
                } else if (key === "tier3_margin") {
                    values.push(
                        hppCol
                            ? {
                                  formula: `=${hppCol}${r}*0.1`,
                                  result: row.tier3_margin,
                              }
                            : (row.tier3_margin ?? 0),
                    );
                } else if (key === "tier3_jual") {
                    const mCol = colLetterMap["tier3_margin"];
                    values.push(
                        hppCol && mCol
                            ? {
                                  formula: `=${hppCol}${r}+${mCol}${r}`,
                                  result: row.tier3_jual,
                              }
                            : (row.tier3_jual ?? 0),
                    );
                } else if (key === "tier3_up") {
                    const jCol = colLetterMap["tier3_jual"];
                    values.push(
                        jCol
                            ? {
                                  formula: `=ROUNDUP(${jCol}${r}/1000,0)*1000`,
                                  result: row.tier3_up,
                              }
                            : (row.tier3_up ?? 0),
                    );
                } else if (key === "tier4_margin") {
                    values.push(
                        hppCol
                            ? {
                                  formula: `=${hppCol}${r}*0.075`,
                                  result: row.tier4_margin,
                              }
                            : (row.tier4_margin ?? 0),
                    );
                } else if (key === "tier4_jual") {
                    const mCol = colLetterMap["tier4_margin"];
                    values.push(
                        hppCol && mCol
                            ? {
                                  formula: `=${hppCol}${r}+${mCol}${r}`,
                                  result: row.tier4_jual,
                              }
                            : (row.tier4_jual ?? 0),
                    );
                } else if (key === "tier4_up") {
                    const jCol = colLetterMap["tier4_jual"];
                    values.push(
                        jCol
                            ? {
                                  formula: `=ROUNDUP(${jCol}${r}/1000,0)*1000`,
                                  result: row.tier4_up,
                              }
                            : (row.tier4_up ?? 0),
                    );
                } else if (key === "tier5_margin") {
                    values.push(
                        hppCol
                            ? {
                                  formula: `=${hppCol}${r}*0.02`,
                                  result: row.tier5_margin,
                              }
                            : (row.tier5_margin ?? 0),
                    );
                } else if (key === "tier5_jual") {
                    const mCol = colLetterMap["tier5_margin"];
                    values.push(
                        hppCol && mCol
                            ? {
                                  formula: `=${hppCol}${r}+${mCol}${r}`,
                                  result: row.tier5_jual,
                              }
                            : (row.tier5_jual ?? 0),
                    );
                } else if (key === "tier5_up") {
                    const jCol = colLetterMap["tier5_jual"];
                    values.push(
                        jCol
                            ? {
                                  formula: `=ROUNDUP(${jCol}${r}/1000,0)*1000`,
                                  result: row.tier5_up,
                              }
                            : (row.tier5_up ?? 0),
                    );
                } else {
                    values.push((row as any)[key] ?? "");
                }
            }

            const dataRow = ws.addRow(values);
            dataRow.height = 19;

            // Soft Row Background sesuai warna (Muda, Sedang, Tua)
            const w = (row.warna || "").toUpperCase();
            let rowBaseBg = "FFFFFF";
            let rowStickyBg = "FFFFFF";
            if (w.includes("MUDA")) {
                rowBaseBg = "F0F7FF";
                rowStickyBg = "E3EFFD";
            } else if (w.includes("SEDANG")) {
                rowBaseBg = "FEFCE8";
                rowStickyBg = "FEF9C3";
            } else if (w.includes("TUA")) {
                rowBaseBg = "F5F3FF";
                rowStickyBg = "EDE9FE";
            }

            dataRow.eachCell((cell, colIdx) => {
                const colCfg = leafCols[colIdx - 1];
                if (!colCfg) return;

                cell.font = {
                    size: 9.5,
                    bold:
                        colCfg.isUp ||
                        colCfg.key === "hpp" ||
                        colCfg.key === "jenisKain",
                    color: colCfg.isUp
                        ? { argb: "FF1565C0" }
                        : colCfg.key === "jenisKain"
                          ? { argb: "FF1E293B" }
                          : { argb: "FF334155" },
                };

                cell.alignment = {
                    horizontal: colCfg.align,
                    vertical: "middle",
                };

                if (colCfg.numFmt) {
                    cell.numFmt = colCfg.numFmt;
                }

                let cellBg = rowBaseBg;
                if (colCfg.key === "_no" || colCfg.key === "jenisKain") {
                    cellBg = rowStickyBg;
                } else if (colCfg.isUp) {
                    cellBg = "EBF3FE";
                }

                cell.fill = {
                    type: "pattern",
                    pattern: "solid",
                    fgColor: { argb: "FF" + cellBg },
                };

                cell.border = {
                    top: { style: "thin", color: { argb: "FFE2E8F0" } },
                    bottom: { style: "thin", color: { argb: "FFE2E8F0" } },
                    left: { style: "thin", color: { argb: "FFE2E8F0" } },
                    right: { style: "thin", color: { argb: "FFE2E8F0" } },
                };
            });
        });

        // Merge Title
        ws.mergeCells(1, 1, 1, leafCols.length);

        // Save File
        const buf = await wb.xlsx.writeBuffer();
        saveAs(
            new Blob([buf], {
                type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            }),
            filename,
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

            // Simpan override setting jahit & margin tier
            const rowId = `${kainForm.mhk_kode}_${kainForm.mhk_jeniskain}_${kainForm.mhk_warna}_${kainForm.mhk_komponen || "BODY"}`;
            customKainSettings.value[rowId] = {
                biayaJahit: kainForm.biayaJahit,
                t1: kainForm.tier1_margin_pct,
                t2: kainForm.tier2_margin_pct,
                t3: kainForm.tier3_margin_pct,
                t4: kainForm.tier4_margin_pct,
                t5: kainForm.tier5_margin_pct,
            };

            toast.success(
                "Harga bahan, allowance, jahit, dan margin berhasil diperbarui",
            );
        } else {
            await settingHargaBahanService.createKainGarmen(kainForm);
            toast.success("Harga kain berhasil ditambahkan");
        }
        confirmKainSave.value = false;
        kainDialog.value = false;
        fetchKain();
    } catch (err: any) {
        toast.error(
            err.response?.data?.message || "Gagal menyimpan data harga kain",
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
        <!-- VIEW 1 & 2: SPREADSHEET MULTI-LEVEL HEADER (KH-0001 & KH-0002) -->
        <PageLayout
            v-if="activeSub !== 'tambahan'"
            title="Setting Harga Bahan Garmen"
            :icon="IconShirt"
            :loading="kainLoading"
        >
            <template #header-actions>
                <v-btn
                    v-if="canInsert"
                    size="small"
                    color="primary"
                    @click="handleAdd"
                >
                    <template #prepend
                        ><IconPlus :size="15" :stroke-width="2"
                    /></template>
                    Baru
                </v-btn>
                <v-btn
                    v-if="canEdit"
                    size="small"
                    :disabled="!selectedRow"
                    @click="handleEdit(selectedRow)"
                >
                    <template #prepend
                        ><IconPencil :size="15" :stroke-width="1.7"
                    /></template>
                    Ubah
                </v-btn>
                <v-btn
                    v-if="canDelete"
                    size="small"
                    color="error"
                    :disabled="!selectedRow"
                    @click="handleDelete(selectedRow)"
                >
                    <template #prepend
                        ><IconTrash :size="15" :stroke-width="1.7"
                    /></template>
                    Hapus
                </v-btn>
                <v-btn
                    v-if="canExport"
                    size="small"
                    color="green"
                    @click="handleExport"
                >
                    <template #prepend
                        ><IconFileSpreadsheet :size="15" :stroke-width="1.7"
                    /></template>
                    Export
                </v-btn>
                <v-btn size="small" variant="text" @click="closeCurrentTab">
                    <template #prepend
                        ><IconX :size="15" :stroke-width="2"
                    /></template>
                    Tutup
                </v-btn>
            </template>

            <div class="browse-content">
                <!-- Filter Bar (Identik dengan SettingHargaMmtView & BaseBrowse) -->
                <div class="filter-bar">
                    <div class="d-flex align-center ga-2 flex-wrap">
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
                                value="kh0001"
                                size="small"
                                class="text-none font-weight-bold px-3"
                            >
                                Kaos 1 Warna
                            </v-btn>
                            <v-btn
                                value="kh0002"
                                size="small"
                                class="text-none font-weight-bold px-3"
                            >
                                Kaos 2 Warna
                            </v-btn>
                            <v-btn
                                value="tambahan"
                                size="small"
                                class="text-none font-weight-bold px-3"
                            >
                                Biaya Tambahan
                            </v-btn>
                        </v-btn-toggle>
                    </div>

                    <!-- Global Search -->
                    <v-text-field
                        v-model="searchQuery"
                        placeholder="Cari data..."
                        variant="outlined"
                        density="compact"
                        hide-details
                        clearable
                        class="search-field"
                    >
                        <template #prepend-inner>
                            <IconSearch
                                :size="15"
                                :stroke-width="1.7"
                                style="opacity: 0.55; margin-top: 1px"
                            />
                        </template>
                    </v-text-field>

                    <v-btn
                        @click="handleRefresh"
                        color="primary"
                        variant="text"
                        :loading="kainLoading"
                        size="small"
                        icon
                        title="Segarkan data"
                    >
                        <IconRefresh :size="18" :stroke-width="1.7" />
                    </v-btn>

                    <!-- Reset Filter -->
                    <v-btn
                        v-if="activeFilterCount > 0"
                        size="small"
                        color="warning"
                        variant="tonal"
                        @click="resetFilters"
                    >
                        <template #prepend>
                            <IconFilterOff :size="15" :stroke-width="1.7" />
                        </template>
                        Reset Filter ({{ activeFilterCount }})
                    </v-btn>

                    <!-- Reset Urutan Kolom -->
                    <v-btn
                        v-if="isColOrderChanged"
                        size="small"
                        color="blue-grey"
                        variant="tonal"
                        @click="resetColOrder"
                        title="Reset urutan kolom ke default"
                    >
                        <template #prepend>
                            <IconAdjustmentsHorizontal :size="15" />
                        </template>
                        Reset Kolom
                    </v-btn>

                    <v-spacer />
                </div>

                <!-- Table + Summary wrapper -->
                <div class="table-section">
                    <div
                        class="table-wrap"
                        ref="tableWrapRef"
                        @click="onTableWrapClick"
                    >
                        <table class="spreadsheet-table">
                            <thead>
                                <!-- BARIS 1: GROUP HEADER (Semua Mengikuti Manksi Blue Theme + Drag Reorder + Filter) -->
                                <tr class="header-level-1">
                                    <th rowspan="2" class="sticky-col col-no">
                                        NO
                                    </th>
                                    <th
                                        rowspan="2"
                                        class="sticky-col col-jeniskain base-th"
                                        data-col-key="jenisKain"
                                    >
                                        <div class="th-inner">
                                            <span class="th-title"
                                                >JENIS KAIN</span
                                            >
                                            <button
                                                class="col-filter-btn"
                                                :class="{
                                                    active: colHasFilter(
                                                        'jenisKain',
                                                    ),
                                                }"
                                                @click.stop="
                                                    openColFilter(
                                                        'jenisKain',
                                                        $event,
                                                    )
                                                "
                                                title="Filter kolom"
                                            >
                                                <IconFilter
                                                    v-if="
                                                        colHasFilter(
                                                            'jenisKain',
                                                        )
                                                    "
                                                    :size="10"
                                                    :stroke-width="2"
                                                />
                                                <IconAdjustmentsHorizontal
                                                    v-else
                                                    :size="10"
                                                    :stroke-width="2"
                                                />
                                            </button>
                                        </div>
                                    </th>

                                    <template
                                        v-for="col in currentCols"
                                        :key="col.key"
                                    >
                                        <!-- Group Header (Tiers) -->
                                        <th
                                            v-if="col.isGroup"
                                            :colspan="col.colSpan"
                                            class="group-tier base-th"
                                            :data-col-key="col.key"
                                            :class="[
                                                dragOverKey === col.key &&
                                                dragSrcKey !== col.key
                                                    ? 'col-drag-over'
                                                    : '',
                                                dragSrcKey === col.key
                                                    ? 'col-dragging'
                                                    : '',
                                            ]"
                                            @pointerdown="
                                                onColPointerDown(
                                                    col.key,
                                                    $event,
                                                )
                                            "
                                            @pointermove="
                                                onColPointerMove($event)
                                            "
                                            @pointerup="onColPointerUp"
                                            @pointercancel="onColPointerUp"
                                        >
                                            <div
                                                class="th-inner justify-center"
                                            >
                                                <span
                                                    class="col-drag-handle"
                                                    title="Drag untuk pindah kolom"
                                                    >⠿</span
                                                >
                                                <span class="th-title">{{
                                                    col.title
                                                }}</span>
                                                <button
                                                    class="col-filter-btn"
                                                    :class="{
                                                        active: colHasFilter(
                                                            col.key,
                                                        ),
                                                    }"
                                                    @click.stop="
                                                        openColFilter(
                                                            col.key,
                                                            $event,
                                                        )
                                                    "
                                                    title="Filter kolom"
                                                >
                                                    <IconFilter
                                                        v-if="
                                                            colHasFilter(
                                                                col.key,
                                                            )
                                                        "
                                                        :size="10"
                                                        :stroke-width="2"
                                                    />
                                                    <IconAdjustmentsHorizontal
                                                        v-else
                                                        :size="10"
                                                        :stroke-width="2"
                                                    />
                                                </button>
                                            </div>
                                        </th>

                                        <!-- Single Column Header -->
                                        <th
                                            v-else
                                            rowspan="2"
                                            class="base-th"
                                            :data-col-key="col.key"
                                            :style="{
                                                width: col.width,
                                                minWidth: col.width,
                                            }"
                                            :class="[
                                                col.align
                                                    ? `text-${col.align}`
                                                    : '',
                                                dragOverKey === col.key &&
                                                dragSrcKey !== col.key
                                                    ? 'col-drag-over'
                                                    : '',
                                                dragSrcKey === col.key
                                                    ? 'col-dragging'
                                                    : '',
                                            ]"
                                            @pointerdown="
                                                onColPointerDown(
                                                    col.key,
                                                    $event,
                                                )
                                            "
                                            @pointermove="
                                                onColPointerMove($event)
                                            "
                                            @pointerup="onColPointerUp"
                                            @pointercancel="onColPointerUp"
                                        >
                                            <div class="th-inner">
                                                <span
                                                    class="col-drag-handle"
                                                    title="Drag untuk pindah kolom"
                                                    >⠿</span
                                                >
                                                <span class="th-title">{{
                                                    col.title
                                                }}</span>
                                                <button
                                                    class="col-filter-btn"
                                                    :class="{
                                                        active: colHasFilter(
                                                            col.key,
                                                        ),
                                                    }"
                                                    @click.stop="
                                                        openColFilter(
                                                            col.key,
                                                            $event,
                                                        )
                                                    "
                                                    title="Filter kolom"
                                                >
                                                    <IconFilter
                                                        v-if="
                                                            colHasFilter(
                                                                col.key,
                                                            )
                                                        "
                                                        :size="10"
                                                        :stroke-width="2"
                                                    />
                                                    <IconAdjustmentsHorizontal
                                                        v-else
                                                        :size="10"
                                                        :stroke-width="2"
                                                    />
                                                </button>
                                            </div>
                                        </th>
                                    </template>
                                </tr>

                                <!-- BARIS 2: SUB HEADERS PER TIER -->
                                <tr class="header-level-2">
                                    <template
                                        v-for="col in currentCols"
                                        :key="'sub_' + col.key"
                                    >
                                        <template
                                            v-if="col.isGroup && col.subHeaders"
                                        >
                                            <th
                                                v-for="sub in col.subHeaders"
                                                :key="sub.key"
                                                :class="[
                                                    'th-sub',
                                                    sub.subClass || '',
                                                ]"
                                            >
                                                {{ sub.title }}
                                            </th>
                                        </template>
                                    </template>
                                </tr>
                            </thead>

                            <tbody>
                                <tr
                                    v-for="(row, idx) in activeSub === 'kh0001'
                                        ? filteredKh0001
                                        : filteredKh0002"
                                    :key="row.rowId"
                                    class="table-row cursor-pointer"
                                    :class="[
                                        getRowWarnaClass(row.warna),
                                        {
                                            'row-selected':
                                                selectedRow?.rowId ===
                                                row.rowId,
                                        },
                                    ]"
                                    @click="selectRow(row)"
                                    @dblclick="handleEdit(row)"
                                >
                                    <!-- No -->
                                    <td
                                        class="text-center text-caption text-medium-emphasis sticky-col col-no"
                                    >
                                        {{ idx + 1 }}
                                    </td>

                                    <!-- Jenis Kain -->
                                    <td
                                        class="font-weight-bold sticky-col col-jeniskain"
                                    >
                                        {{ row.jenisKain }}
                                    </td>

                                    <template
                                        v-for="col in currentCols"
                                        :key="col.key"
                                    >
                                        <!-- Lengan -->
                                        <td
                                            v-if="col.key === 'lengan'"
                                            class="text-center text-caption"
                                        >
                                            {{ row.lengan }}
                                        </td>

                                        <!-- Gramasi -->
                                        <td
                                            v-else-if="col.key === 'gramasi'"
                                            class="text-center text-caption text-medium-emphasis"
                                        >
                                            {{ row.gramasi }}
                                        </td>

                                        <!-- Babaran -->
                                        <td
                                            v-else-if="col.key === 'babaran'"
                                            class="text-end num-cell"
                                        >
                                            {{
                                                row.babaranBody
                                                    ? Number(
                                                          row.babaranBody,
                                                      ).toLocaleString("id-ID")
                                                    : "-"
                                            }}
                                            kg
                                        </td>
                                        <td
                                            v-else-if="
                                                col.key === 'babaranBody'
                                            "
                                            class="text-end num-cell"
                                        >
                                            {{
                                                row.babaranBody
                                                    ? Number(
                                                          row.babaranBody,
                                                      ).toLocaleString("id-ID")
                                                    : "-"
                                            }}
                                            kg
                                        </td>
                                        <td
                                            v-else-if="
                                                col.key === 'babaranLengan'
                                            "
                                            class="text-end num-cell"
                                        >
                                            {{
                                                row.babaranLengan
                                                    ? Number(
                                                          row.babaranLengan,
                                                      ).toLocaleString("id-ID")
                                                    : "-"
                                            }}
                                            kg
                                        </td>

                                        <!-- Warna -->
                                        <td
                                            v-else-if="col.key === 'warna'"
                                            class="text-center"
                                        >
                                            <v-chip
                                                size="x-small"
                                                variant="tonal"
                                                :color="
                                                    getWarnaChipColor(row.warna)
                                                "
                                                class="font-weight-bold"
                                            >
                                                {{ row.warna }}
                                            </v-chip>
                                        </td>

                                        <!-- Harga Bahan / Kg -->
                                        <td
                                            v-else-if="col.key === 'hargaBahan'"
                                            class="text-end font-weight-bold num-cell"
                                        >
                                            Rp {{ formatRp(row.hargaBahan) }}
                                        </td>

                                        <!-- Komponen Biaya -->
                                        <td
                                            v-else-if="col.key === 'hargaBody'"
                                            class="text-end num-cell text-medium-emphasis"
                                        >
                                            Rp {{ formatRp(row.hargaBody) }}
                                        </td>
                                        <td
                                            v-else-if="
                                                col.key === 'hargaLengan'
                                            "
                                            class="text-end num-cell text-medium-emphasis"
                                        >
                                            Rp {{ formatRp(row.hargaLengan) }}
                                        </td>
                                        <td
                                            v-else-if="col.key === 'hargaRib'"
                                            class="text-end num-cell text-medium-emphasis"
                                        >
                                            Rp {{ formatRp(row.hargaRib) }}
                                        </td>
                                        <td
                                            v-else-if="
                                                col.key === 'totalHargaBahan'
                                            "
                                            class="text-end num-cell font-weight-medium"
                                        >
                                            Rp
                                            {{ formatRp(row.totalHargaBahan) }}
                                        </td>
                                        <td
                                            v-else-if="col.key === 'allowance'"
                                            class="text-center text-caption"
                                        >
                                            {{ row.allowancePersen }}%
                                        </td>

                                        <!-- Biaya Konveksi & HPP -->
                                        <td
                                            v-else-if="
                                                col.key === 'biayaKonveksi'
                                            "
                                            class="text-end num-cell text-medium-emphasis"
                                        >
                                            Rp
                                            {{ formatRp(row.biayaKonveksi) }}
                                        </td>
                                        <td
                                            v-else-if="col.key === 'hpp'"
                                            class="text-end font-weight-bold num-cell cell-hpp"
                                        >
                                            Rp {{ formatRp(row.hpp) }}
                                        </td>

                                        <!-- Tier 1: 100 - 249 PCS (20%) -->
                                        <template
                                            v-else-if="col.key === 'tier1'"
                                        >
                                            <td
                                                class="text-end num-cell text-medium-emphasis"
                                            >
                                                Rp
                                                {{ formatRp(row.tier1_margin) }}
                                            </td>
                                            <td
                                                class="text-end num-cell text-medium-emphasis"
                                            >
                                                Rp
                                                {{ formatRp(row.tier1_jual) }}
                                            </td>
                                            <td
                                                class="text-end font-weight-bold num-cell text-primary cell-up"
                                            >
                                                Rp {{ formatRp(row.tier1_up) }}
                                            </td>
                                        </template>

                                        <!-- Tier 2: 250 - 499 PCS (15%) -->
                                        <template
                                            v-else-if="col.key === 'tier2'"
                                        >
                                            <td
                                                class="text-end num-cell text-medium-emphasis"
                                            >
                                                Rp
                                                {{ formatRp(row.tier2_margin) }}
                                            </td>
                                            <td
                                                class="text-end num-cell text-medium-emphasis"
                                            >
                                                Rp
                                                {{ formatRp(row.tier2_jual) }}
                                            </td>
                                            <td
                                                class="text-end font-weight-bold num-cell text-primary cell-up"
                                            >
                                                Rp {{ formatRp(row.tier2_up) }}
                                            </td>
                                        </template>

                                        <!-- Tier 3: 500 - 749 PCS (10%) -->
                                        <template
                                            v-else-if="col.key === 'tier3'"
                                        >
                                            <td
                                                class="text-end num-cell text-medium-emphasis"
                                            >
                                                Rp
                                                {{ formatRp(row.tier3_margin) }}
                                            </td>
                                            <td
                                                class="text-end num-cell text-medium-emphasis"
                                            >
                                                Rp
                                                {{ formatRp(row.tier3_jual) }}
                                            </td>
                                            <td
                                                class="text-end font-weight-bold num-cell text-primary cell-up"
                                            >
                                                Rp {{ formatRp(row.tier3_up) }}
                                            </td>
                                        </template>

                                        <!-- Tier 4: 750 - 999 PCS (7.5%) -->
                                        <template
                                            v-else-if="col.key === 'tier4'"
                                        >
                                            <td
                                                class="text-end num-cell text-medium-emphasis"
                                            >
                                                Rp
                                                {{ formatRp(row.tier4_margin) }}
                                            </td>
                                            <td
                                                class="text-end num-cell text-medium-emphasis"
                                            >
                                                Rp
                                                {{ formatRp(row.tier4_jual) }}
                                            </td>
                                            <td
                                                class="text-end font-weight-bold num-cell text-primary cell-up"
                                            >
                                                Rp {{ formatRp(row.tier4_up) }}
                                            </td>
                                        </template>

                                        <!-- Tier 5: ≥ 1000 PCS (2%) -->
                                        <template
                                            v-else-if="col.key === 'tier5'"
                                        >
                                            <td
                                                class="text-end num-cell text-medium-emphasis"
                                            >
                                                Rp
                                                {{ formatRp(row.tier5_margin) }}
                                            </td>
                                            <td
                                                class="text-end num-cell text-medium-emphasis"
                                            >
                                                Rp
                                                {{ formatRp(row.tier5_jual) }}
                                            </td>
                                            <td
                                                class="text-end font-weight-bold num-cell text-primary cell-up"
                                            >
                                                Rp {{ formatRp(row.tier5_up) }}
                                            </td>
                                        </template>
                                    </template>
                                </tr>
                            </tbody>
                        </table>

                        <!-- Empty State (Identik dengan BaseBrowse) -->
                        <div
                            v-if="
                                (activeSub === 'kh0001'
                                    ? filteredKh0001.length
                                    : filteredKh0002.length) === 0
                            "
                            class="empty-state"
                        >
                            <IconFolderOff
                                :size="36"
                                :stroke-width="1.3"
                                class="empty-icon"
                            />
                            <div class="empty-text">
                                {{
                                    activeFilterCount > 0
                                        ? `Tidak ada hasil untuk filter yang dipilih`
                                        : "Belum ada data tersedia"
                                }}
                            </div>
                            <div class="empty-subtext">
                                {{
                                    activeFilterCount > 0
                                        ? "Coba kata kunci lain atau reset filter pencarian"
                                        : "Klik tombol + Baru untuk menambahkan data pertama"
                                }}
                            </div>
                        </div>
                    </div>

                    <!-- Footer Pagination / Status Bar (Identik dengan BaseBrowse) -->
                    <div class="pagination-bar">
                        <div class="page-info">
                            Menampilkan 1–{{
                                activeSub === "kh0001"
                                    ? filteredKh0001.length
                                    : filteredKh0002.length
                            }}
                            dari
                            {{
                                activeSub === "kh0001"
                                    ? itemsKh0001All.length
                                    : itemsKh0002All.length
                            }}
                            data
                            <span
                                v-if="selectedRow"
                                class="ml-3 text-primary font-weight-bold"
                            >
                                • Terpilih: {{ selectedRow.jenisKain }} ({{
                                    selectedRow.warna
                                }})
                            </span>
                        </div>
                        <v-spacer />
                        <div class="text-caption text-medium-emphasis">
                            Klik baris untuk memilih • Klik 2x untuk ubah
                        </div>
                    </div>
                </div>
            </div>
        </PageLayout>

        <!-- VIEW 3: BIAYA CUSTOM / TAMBAHAN GARMEN (BaseBrowse Standard) -->
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
                            value="kh0001"
                            size="small"
                            class="text-none font-weight-bold px-3"
                        >
                            Kaos 1 Warna
                        </v-btn>
                        <v-btn
                            value="kh0002"
                            size="small"
                            class="text-none font-weight-bold px-3"
                        >
                            Kaos 2 Warna
                        </v-btn>
                        <v-btn
                            value="tambahan"
                            size="small"
                            class="text-none font-weight-bold px-3"
                        >
                            Biaya Tambahan
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

    <!-- FORM DIALOG KAIN (Ubah Parameter: Harga Bahan, Allowance, Jahit, Margin) -->
    <v-dialog v-model="kainDialog" max-width="540px" persistent>
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
                            ? "Ubah Parameter Harga Bahan & Margin"
                            : "Tambah Harga Kain Garmen"
                    }}
                </div>
            </v-card-title>

            <v-card-text class="pa-4">
                <!-- ── MODE UBAH: DIBATASI HANYA HARGA BAHAN, ALLOWANCE, JAHIT, DAN MARGIN ── -->
                <div v-if="isEditKain">
                    <!-- Read-Only Master Info Card -->
                    <div
                        class="pa-3 mb-3 rounded-lg border bg-grey-lighten-5"
                    >
                        <div
                            class="d-flex justify-space-between align-center mb-1"
                        >
                            <span
                                class="font-weight-bold text-subtitle-2 text-primary"
                            >
                                {{ kainForm.mhk_jeniskain }}
                            </span>
                            <v-chip
                                size="x-small"
                                :color="getWarnaChipColor(kainForm.mhk_warna)"
                                variant="tonal"
                                class="font-weight-bold"
                            >
                                {{ kainForm.mhk_warna }}
                            </v-chip>
                        </div>
                        <div
                            class="d-flex flex-wrap ga-x-3 ga-y-1 text-caption text-medium-emphasis"
                        >
                            <span><strong>Model:</strong> {{
                                kainForm.mhk_kode === "KH-0001"
                                    ? "Kaos 1 Warna"
                                    : "Kaos 2 Warna"
                            }}</span>
                            <span><strong>Kategori:</strong> {{ kainForm.mhk_ktg }}</span>
                            <span><strong>Lengan:</strong> {{ kainForm.mhk_lengan || "-" }}</span>
                            <span v-if="kainForm.mhk_komponen"><strong>Komponen:</strong> {{ kainForm.mhk_komponen }}</span>
                            <span><strong>Babaran:</strong> {{ kainForm.mhk_babaran }} kg</span>
                        </div>
                    </div>

                    <!-- Input Fields yang Diizinkan Diedit -->
                    <div
                        class="text-caption font-weight-bold text-uppercase text-medium-emphasis mb-2"
                    >
                        Parameter Biaya & Margin
                    </div>
                    <v-row dense>
                        <!-- 1. HARGA BAHAN -->
                        <v-col cols="12" sm="6">
                            <v-text-field
                                v-model.number="kainForm.mhk_harga"
                                label="Harga Bahan / Kg (Rp) *"
                                type="number"
                                prefix="Rp"
                                variant="outlined"
                                density="compact"
                                hide-details="auto"
                            />
                        </v-col>

                        <!-- 2. ALLOWANCE -->
                        <v-col cols="12" sm="6">
                            <v-text-field
                                v-model.number="kainForm.mhk_allow"
                                label="Allowance (%) *"
                                type="number"
                                suffix="%"
                                variant="outlined"
                                density="compact"
                                hide-details="auto"
                            />
                        </v-col>

                        <!-- 3. JAHIT (BIAYA KONVEKSI) -->
                        <v-col cols="12">
                            <v-text-field
                                v-model.number="kainForm.biayaJahit"
                                label="Biaya Jahit / Konveksi (Rp) *"
                                type="number"
                                prefix="Rp"
                                variant="outlined"
                                density="compact"
                                hide-details="auto"
                            />
                        </v-col>

                        <!-- 4. MARGIN TIER (%) -->
                        <v-col cols="12">
                            <div
                                class="text-caption font-weight-bold text-uppercase text-medium-emphasis mt-2 mb-1"
                            >
                                Margin Penjualan Tiap Tier (%)
                            </div>
                        </v-col>
                        <v-col cols="6" sm="4">
                            <v-text-field
                                v-model.number="kainForm.tier1_margin_pct"
                                label="Tier 1 (20%)"
                                type="number"
                                suffix="%"
                                variant="outlined"
                                density="compact"
                                hide-details="auto"
                            />
                        </v-col>
                        <v-col cols="6" sm="4">
                            <v-text-field
                                v-model.number="kainForm.tier2_margin_pct"
                                label="Tier 2 (15%)"
                                type="number"
                                suffix="%"
                                variant="outlined"
                                density="compact"
                                hide-details="auto"
                            />
                        </v-col>
                        <v-col cols="6" sm="4">
                            <v-text-field
                                v-model.number="kainForm.tier3_margin_pct"
                                label="Tier 3 (10%)"
                                type="number"
                                suffix="%"
                                variant="outlined"
                                density="compact"
                                hide-details="auto"
                            />
                        </v-col>
                        <v-col cols="6" sm="6">
                            <v-text-field
                                v-model.number="kainForm.tier4_margin_pct"
                                label="Tier 4 (7.5%)"
                                type="number"
                                suffix="%"
                                variant="outlined"
                                density="compact"
                                hide-details="auto"
                            />
                        </v-col>
                        <v-col cols="12" sm="6">
                            <v-text-field
                                v-model.number="kainForm.tier5_margin_pct"
                                label="Tier 5 (2%)"
                                type="number"
                                suffix="%"
                                variant="outlined"
                                density="compact"
                                hide-details="auto"
                            />
                        </v-col>
                    </v-row>
                </div>

                <!-- ── MODE TAMBAH BARU: FORM MASTER LENGKAP ── -->
                <v-row v-else dense>
                    <v-col cols="12" sm="6">
                        <v-select
                            v-model="kainForm.mhk_kode"
                            label="Model Kaos *"
                            :items="[
                                {
                                    title: '1 Warna',
                                    value: 'KH-0001',
                                },
                                {
                                    title: '2 Warna',
                                    value: 'KH-0002',
                                },
                            ]"
                            variant="outlined"
                            density="compact"
                            hide-details="auto"
                        />
                    </v-col>
                    <v-col cols="12" sm="6">
                        <v-select
                            v-model="kainForm.mhk_ktg"
                            label="Kategori *"
                            :items="[
                                'COTTON',
                                'TC',
                                'PE',
                                'LACOST',
                                'HYGIT',
                                'DRYFIT',
                            ]"
                            variant="outlined"
                            density="compact"
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
                        <v-select
                            v-model="kainForm.mhk_lengan"
                            label="Lengan"
                            :items="['PENDEK', 'PANJANG']"
                            variant="outlined"
                            density="compact"
                            hide-details="auto"
                        />
                    </v-col>
                    <v-col cols="12" sm="6">
                        <v-select
                            v-model="kainForm.mhk_komponen"
                            label="Komponen"
                            :items="['BODY', 'LENGAN', 'RIB', '']"
                            variant="outlined"
                            density="compact"
                            hide-details="auto"
                        />
                    </v-col>
                    <v-col cols="12" sm="6">
                        <v-text-field
                            v-model="kainForm.mhk_warna"
                            label="Warna *"
                            variant="outlined"
                            density="compact"
                            placeholder="MUDA / SEDANG / TUA"
                            hide-details="auto"
                        />
                    </v-col>
                    <v-col cols="12" sm="6">
                        <v-text-field
                            v-model.number="kainForm.mhk_babaran"
                            label="Babaran (Kg)"
                            type="number"
                            step="0.1"
                            variant="outlined"
                            density="compact"
                            hide-details="auto"
                        />
                    </v-col>
                    <v-col cols="12" sm="6">
                        <v-text-field
                            v-model.number="kainForm.mhk_harga"
                            label="Harga / Kg (Rp) *"
                            type="number"
                            prefix="Rp"
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
                            suffix="%"
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
                >
                    Batal
                </v-btn>
                <v-btn
                    color="primary"
                    variant="elevated"
                    size="small"
                    @click="submitKain"
                >
                    Simpan
                </v-btn>
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
                    <IconSparkles :size="16" class="mr-2 text-primary" />
                    {{
                        isEditTambahan
                            ? "Ubah Biaya Tambahan"
                            : "Tambah Biaya Tambahan"
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
                            hide-details="auto"
                        />
                    </v-col>
                    <v-col cols="12">
                        <v-text-field
                            v-model.number="tambahanForm.mht_lacost"
                            label="Biaya Lacost (Rp)"
                            type="number"
                            variant="outlined"
                            density="compact"
                            hide-details="auto"
                        />
                    </v-col>
                    <v-col cols="12">
                        <v-text-field
                            v-model.number="tambahanForm.mht_cotton"
                            label="Biaya Cotton (Rp)"
                            type="number"
                            variant="outlined"
                            density="compact"
                            hide-details="auto"
                        />
                    </v-col>
                    <v-col cols="12">
                        <v-text-field
                            v-model.number="tambahanForm.mht_pe"
                            label="Biaya PE (Rp)"
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
                >
                    Batal
                </v-btn>
                <v-btn
                    color="primary"
                    variant="elevated"
                    size="small"
                    @click="submitTambahan"
                >
                    Simpan
                </v-btn>
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
                Yakin ingin menyimpan data harga kain ini?
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
                >
                    Ya, Simpan
                </v-btn>
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
                Yakin ingin menyimpan data biaya tambahan ini?
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
                >
                    Ya, Simpan
                </v-btn>
            </v-card-actions>
        </v-card>
    </v-dialog>

    <!-- ── Column Filter Dropdown — Teleport ke body agar tidak ter-clip ── -->
    <Teleport to="body">
        <div
            v-if="activeFilterCol"
            class="col-filter-dropdown"
            :style="filterDropdownStyle"
            @click.stop
        >
            <!-- Search dalam dropdown -->
            <div class="cfd-search">
                <input
                    :value="colFilterSearch[activeFilterCol]"
                    @input="
                        onColSearchInput(
                            activeFilterCol,
                            ($event.target as HTMLInputElement).value,
                        )
                    "
                    type="text"
                    placeholder="Cari nilai..."
                    class="cfd-search-input"
                    @click.stop
                />
            </div>
            <div class="cfd-search-hint">
                {{ filteredUniqueVals(activeFilterCol).length }} dari
                {{ uniqueValuesPerCol[activeFilterCol]?.length ?? 0 }} nilai
                ditampilkan
            </div>

            <!-- Aksi cepat -->
            <div class="cfd-actions">
                <button
                    class="cfd-action-btn"
                    @click="selectAllCol(activeFilterCol)"
                >
                    Pilih Semua
                </button>
                <span class="cfd-sep">|</span>
                <button
                    class="cfd-action-btn text-error"
                    @click="hideAllCol(activeFilterCol)"
                >
                    Hapus Semua
                </button>
            </div>

            <div class="cfd-divider" />

            <!-- List nilai unik -->
            <div class="cfd-list">
                <label
                    v-for="val in filteredUniqueVals(activeFilterCol)"
                    :key="val"
                    class="cfd-item"
                >
                    <input
                        type="checkbox"
                        :checked="
                            columnFilters[activeFilterCol]?.has(val) ?? true
                        "
                        @change="toggleColFilter(activeFilterCol, val)"
                    />
                    <span class="cfd-val">{{
                        val === "" ? "(Kosong)" : val
                    }}</span>
                </label>
                <div
                    v-if="filteredUniqueVals(activeFilterCol).length === 0"
                    class="cfd-empty"
                >
                    Tidak ada hasil
                </div>
            </div>

            <!-- Footer -->
            <div class="cfd-footer">
                <button class="cfd-ok-btn" @click="closeColFilter">OK</button>
            </div>
        </div>
    </Teleport>
</template>

<style scoped>
/* ── Layout Utama (Identik dengan BaseBrowse) ── */
.browse-content {
    display: flex;
    flex-direction: column;
    height: 100%;
    flex: 1 1 0;
    min-height: 0;
    gap: 8px;
    padding: 8px;
    overflow: hidden;
}

/* ── Filter bar ── */
.filter-bar {
    display: flex;
    align-items: center;
    gap: 8px;
    background: rgb(var(--v-theme-surface));
    border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
    border-radius: 6px;
    padding: 7px 12px;
    flex-shrink: 0;
    min-height: 50px;
    flex-wrap: wrap;
    z-index: 5;
}

.search-field {
    width: 220px;
    min-width: 140px;
    flex-shrink: 0;
}
.search-field :deep(.v-input__control) {
    height: 34px;
}
.search-field :deep(.v-field) {
    height: 34px;
    font-size: 12px;
    background: rgb(var(--v-theme-surface));
}
.search-field :deep(.v-field__input) {
    padding-top: 0;
    padding-bottom: 0;
    min-height: unset;
    font-size: 12px;
    align-self: center;
}
.search-field :deep(.v-field__prepend-inner) {
    padding-top: 0;
    align-items: center;
    align-self: center;
}
.search-field :deep(.v-field__clearable) {
    align-items: center;
    align-self: center;
    padding-top: 0;
}

/* ── Filter Select (Identik BaseBrowse) ── */
.filter-select {
    width: 170px;
    min-width: 130px;
    flex-shrink: 0;
}
.filter-select :deep(.v-input__control) {
    height: 34px;
}
.filter-select :deep(.v-field) {
    height: 34px;
    font-size: 12px;
    background: rgb(var(--v-theme-surface));
}
.filter-select :deep(.v-field__input) {
    padding-top: 0;
    padding-bottom: 0;
    min-height: unset;
    font-size: 12px;
    align-self: center;
}

/* ── Table Section (Tabel + Status Bar) ── */
.table-section {
    display: flex;
    flex-direction: column;
    border: 1px solid #e0e0e0;
    border-radius: 6px;
    overflow: hidden;
    flex: 1;
    min-height: 0;
    background: #ffffff;
}

.table-wrap {
    flex: 1;
    min-height: 0;
    overflow: auto;
    scrollbar-width: auto;
    scrollbar-color: #90a4ae #f1f5f9;
}

/* ── Custom Scrollbar Horizontal Bawah (Lebih Lebar & Nyaman) ── */
.table-wrap::-webkit-scrollbar {
    height: 12px;
    width: 10px;
}

.table-wrap::-webkit-scrollbar-track {
    background: #f1f5f9;
    border-top: 1px solid #e2e8f0;
}

.table-wrap::-webkit-scrollbar-thumb {
    background: #94a3b8;
    border-radius: 6px;
    border: 2px solid #f1f5f9;
}

.table-wrap::-webkit-scrollbar-thumb:hover {
    background: #64748b;
}

/* ── SPREADSHEET MULTI-LEVEL TABLE STYLES (Identik BaseBrowse) ── */
.spreadsheet-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 12px;
    white-space: nowrap;
    border-spacing: 0;
}

/* Body cells: identik BaseBrowse — hanya border-bottom, no border-right */
.spreadsheet-table td {
    padding: 0 8px !important;
    height: 28px !important;
    max-height: 28px !important;
    box-sizing: border-box !important;
    font-size: 12px;
    border-bottom: 1px solid
        rgba(var(--v-border-color), var(--v-border-opacity)) !important;
    vertical-align: middle;
    white-space: nowrap !important;
    overflow: hidden !important;
    text-overflow: ellipsis !important;
}

/* Header cells: pembatas kolom vertikal putih semi-transparan */
.spreadsheet-table th {
    padding: 0 8px !important;
    box-sizing: border-box !important;
    vertical-align: middle;
    border-right: 1px solid rgba(255, 255, 255, 0.15) !important;
    border-bottom: 1px solid rgba(255, 255, 255, 0.2) !important;
}

.num-cell {
    font-variant-numeric: tabular-nums;
}

/* ── Column Reorder Drag & Drop & Filter (Identik BaseBrowse) ── */
.th-inner {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 4px;
    width: 100%;
}

.th-title {
    flex: 1;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    text-align: center;
}

.col-drag-handle {
    cursor: grab;
    color: rgba(255, 255, 255, 0.55);
    font-size: 13px;
    line-height: 1;
    flex-shrink: 0;
    margin-right: 2px;
    user-select: none;
    touch-action: none;
    display: inline-flex;
    align-items: center;
    transition: color 0.15s ease;
}

.col-drag-handle:hover {
    color: #ffffff;
}

.col-drag-handle:active {
    cursor: grabbing;
}

.col-filter-btn {
    flex-shrink: 0;
    width: 18px;
    height: 18px;
    border: 1px solid rgba(255, 255, 255, 0.35);
    border-radius: 3px;
    background: transparent;
    color: rgba(255, 255, 255, 0.7);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0;
    transition: all 0.15s;
    line-height: 1;
}

.col-filter-btn:hover {
    background: rgba(255, 255, 255, 0.2);
    color: white;
    border-color: rgba(255, 255, 255, 0.7);
}

.col-filter-btn.active {
    background: #ffd54f;
    border-color: #ffd54f;
    color: #1a1a1a;
}

.col-dragging {
    opacity: 0.5;
    background-color: #0a3d91 !important;
}

.col-drag-over {
    background-color: #0d47a1 !important;
    box-shadow: inset 3px 0 0 #ffd54f !important;
}

/* STICKY HEADER 2 TINGKAT (SERAGAM BIRU PRIMER MANKSI SEPERTI MMT) */
.spreadsheet-table thead {
    position: sticky;
    top: 0;
    z-index: 10;
}

.header-level-1 th {
    height: 34px !important;
    max-height: 34px !important;
    font-size: 11px !important;
    font-weight: 700 !important;
    text-transform: uppercase;
    letter-spacing: 0.03em;
    text-align: center;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    color: #ffffff !important;
    background-color: #1565c0 !important; /* Biru Primer Khas Manksi (BaseBrowse) */
    border-bottom: 1px solid rgba(255, 255, 255, 0.2) !important;
    border-right: 1px solid rgba(255, 255, 255, 0.15) !important;
}

/* GROUP TIERS HEADER (Biru Tua Manksi - Senada dan Elegan) */
.group-tier {
    background-color: #0d47a1 !important;
    color: #ffffff !important;
    text-align: center;
    font-size: 11px !important;
    font-weight: 700 !important;
    letter-spacing: 0.03em;
}

/* HEADER LEVEL 2 (SUB HEADERS) */
.header-level-2 th {
    height: 28px !important;
    max-height: 28px !important;
    font-size: 10.5px !important;
    font-weight: 700 !important;
    text-transform: uppercase;
    letter-spacing: 0.02em;
    text-align: center;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    color: #ffffff !important;
    background-color: #1976d2 !important; /* Biru Manksi Sedang yang Selaras */
    border-bottom: 1px solid
        rgba(var(--v-border-color), var(--v-border-opacity)) !important;
    border-right: 1px solid rgba(255, 255, 255, 0.15) !important;
}

.th-sub {
    color: #ffffff !important;
}

/* Sub-header Harga UP diberi aksen Navy tegas yang elegan */
.th-up {
    background-color: #0d47a1 !important;
    color: #ffffff !important;
    font-weight: 700 !important;
}

/* STICKY COLUMNS NO & JENIS KAIN */
.sticky-col {
    position: sticky;
    z-index: 5;
    background-clip: padding-box;
}

thead .sticky-col {
    z-index: 20;
    background-color: #1565c0 !important;
    color: #ffffff !important;
}

.col-no {
    left: 0;
    width: 42px;
    min-width: 42px;
    max-width: 42px;
    z-index: 6;
}

thead .col-no {
    z-index: 21;
}

.col-jeniskain {
    left: 42px;
    min-width: 175px;
    max-width: 220px;
    /* Border pemisah tegas + drop-shadow halus bertingkat agar kolom yang di-slide tidak menabrak */
    border-right: 2px solid #cbd5e1 !important;
    box-shadow: 4px 0 8px -2px rgba(0, 0, 0, 0.12) !important;
}

thead .col-jeniskain {
    border-right: 2px solid #0d47a1 !important;
    box-shadow: 4px 0 10px -2px rgba(0, 0, 0, 0.22) !important;
}

/* CELL HIGHLIGHTS (Konsisten dan Bersih seperti MMT) */
.cell-hpp {
    font-weight: 700 !important;
    color: rgba(var(--v-theme-on-surface), 0.9) !important;
}

.cell-up {
    font-weight: 700 !important;
    color: rgb(var(--v-theme-primary)) !important;
}

/* ROW BACKGROUND SOFT KATEGORI WARNA (MUDA, SEDANG, TUA) */
.spreadsheet-table tbody tr.row-warna-muda td {
    background-color: #f0f7ff !important;
}
.spreadsheet-table tbody tr.row-warna-muda .sticky-col {
    background-color: #e3effd !important;
}
.spreadsheet-table tbody tr.row-warna-muda:hover td {
    background-color: #d6e8fb !important;
}
.spreadsheet-table tbody tr.row-warna-muda:hover .sticky-col {
    background-color: #c9e0f9 !important;
}

.spreadsheet-table tbody tr.row-warna-sedang td {
    background-color: #fefce8 !important;
}
.spreadsheet-table tbody tr.row-warna-sedang .sticky-col {
    background-color: #fef9c3 !important;
}
.spreadsheet-table tbody tr.row-warna-sedang:hover td {
    background-color: #fef08a !important;
}
.spreadsheet-table tbody tr.row-warna-sedang:hover .sticky-col {
    background-color: #fde047 !important;
}

.spreadsheet-table tbody tr.row-warna-tua td {
    background-color: #f5f3ff !important;
}
.spreadsheet-table tbody tr.row-warna-tua .sticky-col {
    background-color: #ede9fe !important;
}
.spreadsheet-table tbody tr.row-warna-tua:hover td {
    background-color: #ddd6fe !important;
}
.spreadsheet-table tbody tr.row-warna-tua:hover .sticky-col {
    background-color: #c4b5fd !important;
}

/* ROW INTERACTION (Default / Fallback & Selected State) */
.spreadsheet-table tbody tr:nth-of-type(even) .sticky-col {
    background-color: #ffffff;
}

.spreadsheet-table tbody tr:nth-of-type(odd) td {
    background-color: rgba(var(--v-theme-on-surface), 0.02);
}

.spreadsheet-table tbody tr:nth-of-type(odd) .sticky-col {
    background-color: #f8fafc;
}

.spreadsheet-table tbody tr:hover td {
    background-color: rgba(var(--v-theme-primary), 0.06);
}

.spreadsheet-table tbody tr:hover .sticky-col {
    background-color: #eef2f6;
}

.spreadsheet-table tbody tr.row-selected td {
    background-color: rgba(var(--v-theme-primary), 0.18) !important;
    color: rgb(var(--v-theme-primary)) !important;
}

.spreadsheet-table tbody tr.row-selected .sticky-col {
    background-color: #dbeafe !important;
    color: rgb(var(--v-theme-primary)) !important;
}

.spreadsheet-table tbody tr.row-selected:hover td {
    background-color: rgba(var(--v-theme-primary), 0.25) !important;
}

.spreadsheet-table tbody tr.row-selected:hover .sticky-col {
    background-color: #bfdbfe !important;
}

/* ── Empty state (Identik BaseBrowse) ── */
.empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 40px 16px;
    gap: 6px;
}

.empty-icon {
    color: rgba(var(--v-theme-on-surface), 0.3);
    margin-bottom: 4px;
}

.empty-text {
    font-size: 13px;
    font-weight: 600;
    color: rgba(var(--v-theme-on-surface), 0.6);
}

.empty-subtext {
    font-size: 11px;
    color: rgba(var(--v-theme-on-surface), 0.4);
}

/* ── Pagination / Status bar (Identik BaseBrowse) ── */
.pagination-bar {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 12px;
    min-height: 38px;
    flex-shrink: 0;
    flex-grow: 0;
    border-top: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
    background: rgb(var(--v-theme-surface));
}

.page-info {
    font-size: 12px;
    color: rgba(var(--v-theme-on-surface), 0.6);
    white-space: nowrap;
}

.dialog-card :deep(*) {
    font-size: 11px !important;
}
</style>

<!-- ── Column Filter Dropdown — global (tidak scoped) ── -->
<style>
.col-filter-dropdown {
    background: rgb(var(--v-theme-surface, 255, 255, 255));
    border: 1px solid
        rgba(var(--v-border-color, 0, 0, 0), var(--v-border-opacity, 0.12));
    border-radius: 6px;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.18);
    width: 220px;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    font-family: inherit;
}

.cfd-search {
    padding: 8px 8px 4px;
}

.cfd-search-input {
    width: 100%;
    height: 28px;
    border: 1px solid
        rgba(var(--v-border-color, 0, 0, 0), var(--v-border-opacity, 0.15));
    border-radius: 4px;
    padding: 0 8px;
    font-size: 12px;
    outline: none;
    box-sizing: border-box;
    background: rgb(var(--v-theme-surface, 255, 255, 255));
    color: rgb(var(--v-theme-on-surface, 33, 33, 33));
}

.cfd-search-input:focus {
    border-color: rgb(var(--v-theme-primary, 21, 101, 192));
}

.cfd-search-hint {
    font-size: 10px;
    color: rgba(var(--v-theme-on-surface, 0, 0, 0), 0.5);
    padding: 2px 8px 4px;
}

.cfd-actions {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 4px 8px;
}

.cfd-action-btn {
    background: none;
    border: none;
    font-size: 11px;
    color: rgb(var(--v-theme-primary, 21, 101, 192));
    cursor: pointer;
    padding: 2px 0;
}

.cfd-action-btn:hover {
    text-decoration: underline;
}

.cfd-action-btn.text-error {
    color: #c62828;
}

.cfd-sep {
    color: rgba(var(--v-border-color, 0, 0, 0), var(--v-border-opacity, 0.2));
    font-size: 11px;
}

.cfd-divider {
    height: 1px;
    background: rgba(
        var(--v-border-color, 0, 0, 0),
        var(--v-border-opacity, 0.12)
    );
    margin: 0;
}

.cfd-list {
    max-height: 240px;
    overflow-y: auto;
    padding: 4px 0;
}

.cfd-item {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 3px 10px;
    cursor: pointer;
    font-size: 12px;
    color: rgb(var(--v-theme-on-surface, 33, 33, 33));
    transition: background 0.1s;
}

.cfd-item:hover {
    background: rgba(var(--v-theme-on-surface, 0, 0, 0), 0.06);
}

.cfd-item input[type="checkbox"] {
    width: 13px;
    height: 13px;
    cursor: pointer;
    flex-shrink: 0;
    accent-color: rgb(var(--v-theme-primary, 21, 101, 192));
}

.cfd-val {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.cfd-empty {
    padding: 12px;
    text-align: center;
    font-size: 11px;
    color: rgba(var(--v-theme-on-surface, 0, 0, 0), 0.4);
}

.cfd-footer {
    padding: 6px 8px;
    border-top: 1px solid
        rgba(var(--v-border-color, 0, 0, 0), var(--v-border-opacity, 0.12));
    display: flex;
    justify-content: flex-end;
    background: rgba(var(--v-theme-on-surface, 0, 0, 0), 0.02);
}

.cfd-ok-btn {
    padding: 3px 14px;
    font-size: 11px;
    font-weight: 600;
    border-radius: 4px;
    border: none;
    background: #1565c0;
    color: white;
    cursor: pointer;
}

.cfd-ok-btn:hover {
    background: #0d47a1;
}
</style>
