<template>
    <div>
        <!-- Dialog Utama Lookup PO Internal -->
        <v-dialog
            :model-value="isVisible"
            @update:modelValue="emit('close')"
            max-width="1250px"
            persistent
        >
            <v-card class="dialog-card d-flex flex-column" style="height: 85vh">
                <!-- Toolbar Header Manksi -->
                <v-toolbar color="primary" density="compact">
                    <v-toolbar-title
                        class="text-subtitle-1 font-weight-bold d-flex align-center"
                    >
                        <v-icon
                            icon="mdi-file-document-box-outline"
                            class="mr-2"
                            size="20"
                        />
                        Lookup PO Internal MMT
                    </v-toolbar-title>
                    <v-spacer></v-spacer>
                    <v-btn
                        icon="mdi-close"
                        @click="emit('close')"
                        variant="text"
                        size="small"
                    ></v-btn>
                </v-toolbar>

                <!-- Content Area -->
                <v-card-text class="pa-4 d-flex flex-column grow">
                    <v-text-field
                        v-model="search"
                        label="Cari Nomor PO, SPK, Nama Order, atau Supplier..."
                        prepend-inner-icon="mdi-magnify"
                        variant="outlined"
                        density="compact"
                        clearable
                        class="mb-3 shrink-0"
                        hide-details
                        @keyup.enter="fetchData"
                    >
                        <template #append-inner>
                            <v-btn
                                color="primary"
                                size="small"
                                variant="flat"
                                class="mt-n1 mb-n1"
                                @click="fetchData"
                            >
                                <v-icon icon="mdi-refresh" />
                            </v-btn>
                        </template>
                    </v-text-field>

                    <v-data-table
                        :headers="headers"
                        :items="groupedPos"
                        :loading="loading"
                        hover
                        class="desktop-table grow clickable-row border rounded"
                        density="compact"
                        item-key="poi_nomor"
                        fixed-header
                        :items-per-page="20"
                        @click:row="handleRowClick"
                        @dblclick:row="handleRowClick"
                    >
                        <template #item.poi_nomor="{ item }">
                            <span class="font-weight-bold color-po">{{
                                item.poi_nomor
                            }}</span>
                        </template>

                        <template #item.poi_tanggal="{ item }">
                            {{ formatDate(item.poi_tanggal) }}
                        </template>

                        <template #item.cab="{ item }">
                            <v-chip
                                size="x-small"
                                label
                                color="grey-lighten-2"
                                class="text-caption font-weight-medium"
                            >
                                {{ item.cab }}
                            </v-chip>
                        </template>

                        <template #item.spk_nomor="{ item }">
                            <v-chip
                                v-if="item.spk_nomor"
                                size="x-small"
                                color="primary"
                                label
                                class="font-weight-medium"
                            >
                                {{ item.spk_nomor }}
                            </v-chip>
                            <span v-else class="text-grey">-</span>
                        </template>

                        <template #item.sizes="{ item }">
                            <span
                                v-if="item.sizes"
                                class="text-caption font-weight-medium text-grey-darken-3"
                            >
                                {{ item.sizes }}
                            </span>
                            <span v-else class="text-grey">-</span>
                        </template>

                        <template #item.total_qty="{ item }">
                            <span class="font-weight-bold text-primary">
                                {{ formatNumber(item.total_qty) }}
                            </span>
                        </template>

                        <template #item.actions="{ item }">
                            <div class="text-center">
                                <v-btn
                                    color="primary"
                                    size="x-small"
                                    @click.stop="handleRowClick(null, { item })"
                                    variant="flat"
                                >
                                    Pilih
                                </v-btn>
                            </div>
                        </template>

                        <template #no-data>
                            <div class="text-center pa-4 text-grey-darken-1">
                                Tidak ada data PO Internal ditemukan.
                            </div>
                        </template>

                        <template #loading>
                            <v-progress-linear
                                indeterminate
                                color="primary"
                            ></v-progress-linear>
                        </template>
                    </v-data-table>
                </v-card-text>

                <!-- Footer -->
                <v-card-actions
                    class="d-flex justify-space-between border-top pa-3 bg-grey-lighten-5"
                >
                    <div class="text-caption text-grey-darken-1">
                        Total Data PO: <b>{{ groupedPos.length }}</b> dokumen
                    </div>
                    <v-btn
                        @click="emit('close')"
                        color="secondary"
                        variant="outlined"
                        size="small"
                    >
                        Tutup
                    </v-btn>
                </v-card-actions>
            </v-card>
        </v-dialog>

        <!-- Sub-dialog: Pemilihan Size & Komponen -->
        <v-dialog v-model="componentDialog" max-width="620px" scrollable>
            <v-card border>
                <v-toolbar color="primary" density="compact">
                    <v-toolbar-title class="text-subtitle-2 font-weight-bold">
                        Pilih Ukuran & Komponen PO [{{ selectedPoiNo }}]
                    </v-toolbar-title>
                    <v-spacer></v-spacer>
                    <v-btn
                        icon="mdi-close"
                        variant="text"
                        size="small"
                        @click="componentDialog = false"
                    />
                </v-toolbar>

                <v-card-text class="pa-4">
                    <!-- Info Ringkas PO Terpilih -->
                    <div
                        class="pa-3 mb-3 bg-blue-lighten-5 rounded border border-blue-lighten-4"
                    >
                        <div class="d-flex justify-space-between mb-1">
                            <span class="text-caption text-grey-darken-2"
                                >Nomor PO:</span
                            >
                            <span
                                class="text-caption font-weight-bold color-po"
                                >{{ selectedPoiNo }}</span
                            >
                        </div>
                        <div
                            v-if="activePoiItem?.spk_nomor"
                            class="d-flex justify-space-between mb-1"
                        >
                            <span class="text-caption text-grey-darken-2"
                                >SPK / Order:</span
                            >
                            <span
                                class="text-caption font-weight-medium text-grey-darken-4"
                            >
                                {{ activePoiItem.spk_nomor }}
                                {{
                                    activePoiItem.spk_nama
                                        ? `(${activePoiItem.spk_nama})`
                                        : ""
                                }}
                            </span>
                        </div>
                        <div
                            v-if="
                                activePoiItem?.supplier &&
                                activePoiItem.supplier !== '-'
                            "
                            class="d-flex justify-space-between"
                        >
                            <span class="text-caption text-grey-darken-2"
                                >Supplier:</span
                            >
                            <span
                                class="text-caption font-weight-medium text-grey-darken-3"
                                >{{ activePoiItem.supplier }}</span
                            >
                        </div>
                    </div>

                    <!-- 1. Metode Pengambilan -->
                    <div
                        class="text-subtitle-2 font-weight-bold text-primary mb-1"
                    >
                        1. Metode Pengambilan:
                    </div>
                    <v-radio-group
                        v-model="extractMode"
                        inline
                        density="compact"
                        class="mb-3"
                        hide-details
                    >
                        <v-radio
                            label="Ambil Semua Set (All Set)"
                            value="SET"
                            color="primary"
                        ></v-radio>
                        <v-radio
                            label="Pilih Komponen Tertentu"
                            value="KOMPONEN"
                            color="primary"
                        ></v-radio>
                    </v-radio-group>
                    <v-divider class="mb-3"></v-divider>

                    <!-- 2. Pilih Ukuran (Size) -->
                    <div
                        class="text-subtitle-2 font-weight-bold text-primary mb-1"
                    >
                        2. Pilih Ukuran (Size - Multi-Select):
                    </div>
                    <v-select
                        v-model="selectedSizes"
                        :items="availableSizes"
                        label="Pilih Size..."
                        variant="outlined"
                        density="compact"
                        class="mb-3"
                        multiple
                        chips
                        closable-chips
                        hide-details
                        @update:model-value="onSizeChange"
                    >
                        <template #item="{ props: itemProps, item }">
                            <v-list-item v-bind="itemProps" density="compact">
                                <template #prepend>
                                    <v-checkbox-btn
                                        :model-value="
                                            selectedSizes.includes(
                                                (item as any).raw ?? item,
                                            )
                                        "
                                        color="primary"
                                        density="compact"
                                        class="mr-2"
                                        hide-details
                                    ></v-checkbox-btn>
                                </template>
                                <v-list-item-title class="font-weight-medium">{{
                                    (item as any).raw ?? item
                                }}</v-list-item-title>
                            </v-list-item>
                        </template>
                    </v-select>
                    <v-divider class="mb-3"></v-divider>

                    <!-- 3. Pilih Komponen Jika Mode KOMPONEN -->
                    <div v-if="extractMode === 'KOMPONEN'">
                        <div
                            class="text-subtitle-2 font-weight-bold text-primary mb-1"
                        >
                            3. Pilih Komponen:
                        </div>
                        <div
                            v-if="selectedSizes.length > 0"
                            class="text-caption text-grey-darken-1 mb-2"
                        >
                            Centang komponen untuk size yang dipilih:
                        </div>
                        <div v-else class="text-caption text-error mb-2">
                            Harap pilih minimal 1 Size terlebih dahulu.
                        </div>

                        <v-list
                            v-if="selectedSizes.length > 0"
                            density="compact"
                            class="border rounded bg-grey-lighten-5"
                            style="max-height: 220px; overflow-y: auto"
                        >
                            <v-list-item
                                v-for="(comp, idx) in currentSizeComponents"
                                :key="idx"
                                class="border-bottom"
                            >
                                <template #prepend>
                                    <v-checkbox-btn
                                        v-model="selectedComponentKeys"
                                        :value="getKomponenKey(comp, idx)"
                                        color="primary"
                                        class="mr-2"
                                    ></v-checkbox-btn>
                                </template>
                                <v-list-item-title
                                    class="font-weight-bold text-body-2"
                                >
                                    {{ getKomponenName(comp, idx) }}
                                    <span
                                        class="text-caption text-primary font-weight-medium"
                                    >
                                        ({{
                                            comp.poid_size ||
                                            comp.poi_size ||
                                            comp.Size ||
                                            "-"
                                        }})
                                    </span>
                                </v-list-item-title>
                                <v-list-item-subtitle class="text-caption">
                                    Kode: {{ getKomponenKode(comp) }} | Qty PO:
                                    {{
                                        formatNumber(
                                            comp.poid_jumlah || comp.Qty || 0,
                                        )
                                    }}
                                </v-list-item-subtitle>
                            </v-list-item>
                        </v-list>
                    </div>

                    <div
                        v-else-if="
                            extractMode === 'SET' && selectedSizes.length > 0
                        "
                        class="text-body-2 text-grey-darken-2 pa-3 bg-grey-lighten-4 rounded text-center"
                    >
                        Semua komponen untuk Size
                        <b>{{ selectedSizes.join(", ") }}</b> akan diambil
                        sebagai kesatuan set (All Set).
                    </div>
                    <div
                        v-else
                        class="text-body-2 text-grey pa-3 bg-grey-lighten-4 rounded text-center"
                    >
                        Silakan pilih Size di atas.
                    </div>
                </v-card-text>

                <v-card-actions class="bg-grey-lighten-4 pa-3">
                    <v-btn
                        size="small"
                        variant="text"
                        @click="componentDialog = false"
                        >Batal</v-btn
                    >
                    <v-spacer />
                    <v-btn
                        size="small"
                        color="primary"
                        variant="flat"
                        :disabled="
                            selectedSizes.length === 0 ||
                            (extractMode === 'KOMPONEN' &&
                                selectedComponentKeys.length === 0)
                        "
                        @click="confirmSelection"
                    >
                        Konfirmasi & Pilih
                    </v-btn>
                </v-card-actions>
            </v-card>
        </v-dialog>
    </div>
</template>

<script setup lang="ts">
import { ref, watch, computed } from "vue";
import api from "@/services/api";
import { format } from "date-fns";

const props = defineProps<{
    isVisible: boolean;
}>();

const emit = defineEmits<{
    (e: "close"): void;
    (e: "select", payload: { mode: "SET" | "KOMPONEN"; data: any[] }): void;
    (e: "update:isVisible", val: boolean): void;
}>();

const items = ref<any[]>([]);
const loading = ref(false);
const search = ref("");

// Sub-dialog state
const componentDialog = ref(false);
const extractMode = ref<"SET" | "KOMPONEN">("SET");
const selectedSizes = ref<string[]>([]);
const availableSizes = ref<string[]>([]);
const currentSizeComponents = ref<any[]>([]);
const selectedComponentKeys = ref<string[]>([]);
const selectedPoiNo = ref("");
const activePoiItem = ref<any>(null);

const headers = [
    { title: "Nomor PO", key: "poi_nomor", width: "160px" },
    { title: "Tanggal", key: "poi_tanggal", width: "105px" },
    { title: "Cab", key: "cab", width: "80px", align: "center" as const },
    { title: "Nama Supplier", key: "supplier", minWidth: "160px" },
    { title: "No. SPK", key: "spk_nomor", width: "150px" },
    { title: "Nama SPK / Order", key: "spk_nama", minWidth: "180px" },
    { title: "Ukuran", key: "sizes", width: "130px" },
    {
        title: "Total Qty",
        key: "total_qty",
        width: "100px",
        align: "end" as const,
    },
    { title: "Keterangan", key: "keterangan", minWidth: "160px" },
    {
        title: "Aksi",
        key: "actions",
        width: "85px",
        align: "center" as const,
        sortable: false,
    },
];

const groupedPos = computed(() => {
    const map = new Map<string, any>();
    items.value.forEach((it: any) => {
        const key = it.poi_nomor || it.Nomor || it.poiNomor;
        if (!key) return;
        if (!map.has(key)) {
            const allForPo = items.value.filter(
                (x: any) => (x.poi_nomor || x.Nomor || x.poiNomor) === key,
            );
            const spkSet = new Set<string>();
            const spkNamaSet = new Set<string>();
            const sizeSet = new Set<string>();
            let totalQty = 0;

            allForPo.forEach((x: any) => {
                const spkNo =
                    x.poi_spk_nomor || x.spk_nomor || x.Nomor_SPK || x.Spk;
                if (spkNo) spkSet.add(spkNo);

                const spkNm =
                    x.spk_nama ||
                    x.Nama_SPK ||
                    x.NamaSpk ||
                    x.NamaOrder ||
                    x.Nama;
                if (spkNm) spkNamaSet.add(spkNm);

                const sz = x.poid_size || x.poi_size || x.Size || x.Ukuran;
                if (sz) sizeSet.add(sz);

                const q = Number(
                    x.poid_jumlah ?? x.spk_qty ?? x.Qty ?? x.Jumlah ?? 0,
                );
                totalQty += q;
            });

            const first = allForPo[0] || {};
            map.set(key, {
                poi_nomor: key,
                poi_tanggal: first.poi_tanggal || first.Tanggal || "",
                cab: first.poi_cabang || first.cab || first.Cab || "-",
                supplier:
                    first.poi_supplier ||
                    first.supplier ||
                    first.Supplier ||
                    first.Nama_Supplier ||
                    first.Nama ||
                    "-",
                spk_nomor: Array.from(spkSet).join(", "),
                spk_nama: Array.from(spkNamaSet).join(", "),
                sizes: Array.from(sizeSet).join(", "),
                jumlahSpk: spkSet.size,
                jumlahSize: sizeSet.size,
                total_qty: totalQty,
                keterangan:
                    first.poi_keterangan ||
                    first.keterangan ||
                    first.Keterangan ||
                    "-",
                raw_items: allForPo,
            });
        }
    });

    let list = Array.from(map.values());
    if (search.value) {
        const q = search.value.trim().toLowerCase();
        list = list.filter(
            (r: any) =>
                String(r.poi_nomor || "")
                    .toLowerCase()
                    .includes(q) ||
                String(r.spk_nomor || "")
                    .toLowerCase()
                    .includes(q) ||
                String(r.spk_nama || "")
                    .toLowerCase()
                    .includes(q) ||
                String(r.supplier || "")
                    .toLowerCase()
                    .includes(q) ||
                String(r.keterangan || "")
                    .toLowerCase()
                    .includes(q) ||
                String(r.sizes || "")
                    .toLowerCase()
                    .includes(q),
        );
    }
    return list;
});

const getKomponenName = (comp: any, idx: number) => {
    if (comp.nama_komponen && comp.nama_komponen.trim() !== "")
        return comp.nama_komponen;
    if (comp.Nama_Komponen && comp.Nama_Komponen.trim() !== "")
        return comp.Nama_Komponen;
    if (comp.Bhn_Name && comp.Bhn_Name.trim() !== "") return comp.Bhn_Name;
    if (comp.bhn_name && comp.bhn_name.trim() !== "") return comp.bhn_name;
    if (comp.poid_bhn_kode && comp.poid_bhn_kode.trim() !== "")
        return comp.poid_bhn_kode;
    return `Komponen Bagian ${idx + 1}`;
};

const getKomponenKode = (comp: any) =>
    comp.poid_bhn_kode || comp.Kode_Komponen || comp.bhn_kode || "-";

const getKomponenKey = (comp: any, idx: number) => {
    const size = comp.poid_size || comp.poi_size || comp.Size || "";
    return `${getKomponenKode(comp)}_${getKomponenName(comp, idx)}_${size}`;
};

const fetchData = async () => {
    loading.value = true;
    try {
        const res = await api.get("/mmt/po-internal/lookup");
        items.value = res.data?.success
            ? res.data.data
            : Array.isArray(res.data)
              ? res.data
              : [];
    } catch (e) {
        console.error("Gagal load POI", e);
        items.value = [];
    } finally {
        loading.value = false;
    }
};

const handleRowClick = (_event: any, { item }: { item: any }) => {
    openComponentDialog(item);
};

const openComponentDialog = (poRow: any) => {
    const poiNo = poRow.poi_nomor;
    const allForPo = items.value.filter(
        (d: any) => (d.poi_nomor || d.Nomor || d.poiNomor) === poiNo,
    );
    const sizeSet = new Set<string>();
    allForPo.forEach((r: any) => {
        const s = r.poid_size || r.poi_size || r.Size || r.Ukuran;
        if (s) sizeSet.add(s);
    });

    activePoiItem.value = poRow;
    selectedPoiNo.value = poiNo;
    availableSizes.value = Array.from(sizeSet);
    selectedSizes.value =
        availableSizes.value.length > 0 ? [availableSizes.value[0]] : [];
    extractMode.value = "SET";
    selectedComponentKeys.value = [];
    onSizeChange();
    componentDialog.value = true;
};

const onSizeChange = () => {
    selectedComponentKeys.value = [];
    if (!activePoiItem.value || selectedSizes.value.length === 0) {
        currentSizeComponents.value = [];
        return;
    }
    const poiNo = activePoiItem.value.poi_nomor;
    const matched = items.value.filter(
        (d: any) =>
            (d.poi_nomor || d.Nomor || d.poiNomor) === poiNo &&
            selectedSizes.value.includes(
                d.poid_size || d.poi_size || d.Size || "",
            ),
    );
    const uniq: any[] = [];
    const seen = new Set<string>();
    matched.forEach((c: any, idx: number) => {
        const k = getKomponenKey(c, idx);
        if (!seen.has(k)) {
            seen.add(k);
            uniq.push(c);
        }
    });
    currentSizeComponents.value = uniq;
};

const confirmSelection = () => {
    if (!activePoiItem.value || selectedSizes.value.length === 0) return;
    const poiNo = activePoiItem.value.poi_nomor;

    if (extractMode.value === "SET") {
        const payload = selectedSizes.value.map((sizeName) => {
            const base =
                currentSizeComponents.value.find(
                    (c: any) =>
                        (c.poid_size || c.poi_size || c.Size || "") ===
                        sizeName,
                ) ||
                items.value.find(
                    (d: any) =>
                        (d.poi_nomor || d.Nomor || d.poiNomor) === poiNo &&
                        (d.poid_size || d.poi_size || d.Size || "") ===
                            sizeName,
                ) ||
                activePoiItem.value;

            return {
                ...base,
                poi_nomor: poiNo,
                poi_size: sizeName,
                poid_size: sizeName,
                nama_komponen: "ALL SET",
                poid_bhn_kode: "ALL SET",
                poi_spk_nomor:
                    base.poi_spk_nomor ||
                    base.spk_nomor ||
                    base.Nomor_SPK ||
                    base.Spk ||
                    "",
                spk_nomor:
                    base.poi_spk_nomor ||
                    base.spk_nomor ||
                    base.Nomor_SPK ||
                    base.Spk ||
                    "",
                spk_nama:
                    base.spk_nama ||
                    base.Nama_SPK ||
                    base.NamaSpk ||
                    base.NamaOrder ||
                    "",
                poid_jumlah: Number(
                    base.poid_jumlah ??
                        base.spk_qty ??
                        base.Qty ??
                        base.Jumlah ??
                        0,
                ),
            };
        });

        emit("select", { mode: "SET", data: payload });
        componentDialog.value = false;
        emit("close");
    } else {
        if (selectedComponentKeys.value.length === 0) return;
        const selected = currentSizeComponents.value.filter(
            (comp: any, idx: number) => {
                const k = getKomponenKey(comp, idx);
                return selectedComponentKeys.value.includes(k);
            },
        );

        const payload = selected.map((comp: any, idx: number) => {
            const resolvedSize =
                comp.poid_size || comp.poi_size || comp.Size || "";
            return {
                ...comp,
                poi_nomor: poiNo,
                poi_size: resolvedSize,
                poid_size: resolvedSize,
                nama_komponen: getKomponenName(comp, idx),
                poid_bhn_kode: getKomponenKode(comp),
                poi_spk_nomor:
                    comp.poi_spk_nomor ||
                    comp.spk_nomor ||
                    comp.Nomor_SPK ||
                    comp.Spk ||
                    "",
                spk_nomor:
                    comp.poi_spk_nomor ||
                    comp.spk_nomor ||
                    comp.Nomor_SPK ||
                    comp.Spk ||
                    "",
                spk_nama:
                    comp.spk_nama ||
                    comp.Nama_SPK ||
                    comp.NamaSpk ||
                    comp.NamaOrder ||
                    "",
                poid_jumlah: Number(
                    comp.poid_jumlah ??
                        comp.spk_qty ??
                        comp.Qty ??
                        comp.Jumlah ??
                        0,
                ),
            };
        });

        emit("select", { mode: "KOMPONEN", data: payload });
        componentDialog.value = false;
        emit("close");
    }
};

const formatDate = (date: any) => {
    if (!date) return "-";
    try {
        return format(new Date(date), "dd/MM/yyyy");
    } catch {
        return String(date);
    }
};

const formatNumber = (val: any) =>
    new Intl.NumberFormat("id-ID").format(Number(val) || 0);

watch(
    () => props.isVisible,
    (v) => {
        if (v) fetchData();
    },
);
</script>

<style scoped>
.grow {
    flex-grow: 1 !important;
}
.shrink-0 {
    flex-shrink: 0 !important;
}
.dialog-card {
    font-size: 13px;
}
.border-top {
    border-top: 1px solid #e0e0e0;
}
.border-bottom {
    border-bottom: 1px solid #e0e0e0;
}
.desktop-table {
    font-size: 12px;
}
.desktop-table :deep(td),
.desktop-table :deep(th) {
    padding: 0 8px !important;
    height: 34px !important;
    white-space: nowrap;
}
.desktop-table :deep(thead th) {
    background-color: #1565c0 !important;
    color: white !important;
    font-size: 11px !important;
    font-weight: 700 !important;
    text-transform: uppercase;
    letter-spacing: 0.03em;
}
.color-po {
    color: #1565c0;
}
.clickable-row :deep(tbody tr):hover {
    cursor: pointer !important;
    background-color: rgba(var(--v-theme-primary), 0.06) !important;
}
.clickable-row :deep(tbody tr:active) {
    background-color: rgba(var(--v-theme-primary), 0.12) !important;
}
</style>
