<script setup lang="ts">
import { ref, computed } from "vue";
import { useRouter } from "vue-router";
import { useToast } from "vue-toastification";
import BaseBrowse from "@/components/BaseBrowse.vue";
import { useBrowse } from "@/composables/useBrowse";
import { IconArrowsExchange, IconPrinter } from "@tabler/icons-vue";
import api from "@/services/api";
import { formatTanggal } from "@/utils/dateFormat";

const router = useRouter();
const toast = useToast();

const getStartOfMonth = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
};
const getToday = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const startDate = ref(getStartOfMonth());
const endDate = ref(getToday());

const headers = [
    { title: "Nomor", key: "Nomor", width: "160px" },
    {
        title: "Tanggal",
        key: "Tanggal",
        width: "120px",
        align: "center" as const,
    },
    {
        title: "Gudang Asal",
        key: "Asal",
        width: "130px",
        align: "center" as const,
    },
    {
        title: "Gudang Tujuan",
        key: "Tujuan",
        width: "130px",
        align: "center" as const,
    },
    {
        title: "Status",
        key: "Status",
        width: "110px",
        align: "center" as const,
    },
    { title: "Keterangan", key: "Keterangan", minWidth: "220px" },
];

const {
    items,
    isLoading,
    selected,
    canInsert,
    canEdit,
    canDelete,
    canExport,
    fetchData,
    exportToExcel,
} = useBrowse<any>({
    menuId: "5534",
    fetchApi: async () => {
        const res = await api.get("/mmt/bahan-baku-produksi/mutasi-bahan", {
            params: { startDate: startDate.value, endDate: endDate.value },
        });
        return Array.isArray(res.data) ? res.data : res.data?.data || [];
    },
});

const getItemNomor = (item: any): string => {
    if (!item) return "";
    if (typeof item === "string") return item;
    const raw = item.raw || item;
    return raw.Nomor || raw.nomor || "";
};

const selectedItem = computed(() => {
    if (!selected.value || selected.value.length !== 1) return null;
    return selected.value[0]?.raw || selected.value[0];
});

// --- EXPAND LOGIC (DETAIL MUTASI BAHAN) ---
const expanded = ref<any[]>([]);
const detailCache = ref<Record<string, any[]>>({});
const loadingDetails = ref<Record<string, boolean>>({});

const getItemDetails = (item: any): any[] => {
    const raw = item?.raw || item;
    const nomor = getItemNomor(raw);
    if (detailCache.value[nomor] && detailCache.value[nomor].length > 0) {
        return detailCache.value[nomor];
    }
    const details = raw?.Details || raw?.details || raw?.Detail;
    if (Array.isArray(details) && details.length > 0) {
        return details;
    }
    return detailCache.value[nomor] || [];
};

const onUpdateExpanded = async (newExpanded: any[]) => {
    expanded.value = newExpanded;
    for (const it of newExpanded) {
        const raw = it?.raw || it;
        const nomor = getItemNomor(raw);
        if (!nomor) continue;

        // Jika detail sudah terbawa langsung dari API browse
        const existing = raw?.Details || raw?.details || raw?.Detail;
        if (Array.isArray(existing) && existing.length > 0) {
            if (
                !detailCache.value[nomor] ||
                detailCache.value[nomor].length === 0
            ) {
                detailCache.value = { ...detailCache.value, [nomor]: existing };
            }
            continue;
        }

        if (detailCache.value[nomor] && detailCache.value[nomor].length > 0) {
            continue;
        }

        if (loadingDetails.value[nomor]) continue;

        loadingDetails.value = { ...loadingDetails.value, [nomor]: true };
        try {
            const res = await api.get(
                `/mmt/bahan-baku-produksi/mutasi-bahan/${encodeURIComponent(nomor)}`,
            );
            const d = res.data?.data || res.data;
            const details = d?.details || d?.Details || d?.Detail || [];
            detailCache.value = { ...detailCache.value, [nomor]: details };
            if (typeof raw === "object" && raw !== null) {
                raw.Details = details;
            }
        } catch (err) {
            console.error(`Gagal load detail mutasi ${nomor}:`, err);
            detailCache.value = { ...detailCache.value, [nomor]: [] };
        } finally {
            loadingDetails.value = { ...loadingDetails.value, [nomor]: false };
        }
    }
};

const handleNew = () => {
    router.push("/mmt/bahan-baku-produksi/mutasi-bahan-mmt/create");
};

const handleEdit = (item: any) => {
    const target = item || selected.value[0];
    const nomor = getItemNomor(target);
    if (!nomor) return;
    router.push(
        `/mmt/bahan-baku-produksi/mutasi-bahan-mmt/edit/${encodeURIComponent(nomor)}`,
    );
};

const handleDelete = async (item: any) => {
    const target = item || selected.value[0];
    const nomor = getItemNomor(target);
    if (!nomor) return;

    if (!confirm(`Hapus data mutasi bahan nomor ${nomor}?`)) return;
    try {
        await api.delete(
            `/mmt/bahan-baku-produksi/mutasi-bahan/${encodeURIComponent(nomor)}`,
        );
        toast.success("Mutasi bahan berhasil dihapus.");
        fetchData();
    } catch (err: any) {
        toast.error(err.response?.data?.message || "Gagal menghapus data.");
    }
};

const handlePrint = (item?: any) => {
    const target = item || selected.value[0];
    const nomor = getItemNomor(target);
    if (!nomor) {
        toast.warning("Silakan pilih data mutasi terlebih dahulu.");
        return;
    }
    router.push(
        `/mmt/bahan-baku-produksi/mutasi-bahan-mmt/print/${encodeURIComponent(nomor)}`,
    );
};
</script>

<template>
    <BaseBrowse
        title="Mutasi Bahan MMT"
        menu-id="5534"
        item-value="Nomor"
        :icon="IconArrowsExchange"
        :headers="headers"
        :items="items || []"
        :is-loading="isLoading"
        v-model:selected="selected"
        :show-expand="true"
        :expanded="expanded"
        @update:expanded="onUpdateExpanded"
        :can-insert="canInsert"
        :can-edit="canEdit"
        :can-delete="canDelete"
        :can-export="canExport"
        @refresh="fetchData"
        @add="handleNew"
        @edit="handleEdit"
        @delete="handleDelete"
        @export="exportToExcel('Mutasi_Bahan_MMT')"
    >
        <!-- Header Extra Actions (Sejajar dengan tombol aksi) -->
        <template #extra-actions>
            <v-btn
                size="small"
                color="secondary"
                variant="tonal"
                class="text-none font-weight-medium"
                :disabled="!selectedItem"
                @click="handlePrint(selectedItem)"
            >
                <template #prepend>
                    <IconPrinter :size="15" />
                </template>
                Cetak
            </v-btn>
        </template>

        <template #filter-left>
            <div class="filter-group">
                <span class="filter-label">Periode</span>
                <input
                    type="date"
                    v-model="startDate"
                    class="date-inp"
                    @change="fetchData"
                />
                <span class="filter-sep">s/d</span>
                <input
                    type="date"
                    v-model="endDate"
                    class="date-inp"
                    @change="fetchData"
                />
            </div>
        </template>

        <template #item.Tanggal="{ item }">
            {{ formatTanggal((item.raw || item).Tanggal) }}
        </template>

        <!-- Kolom Status Berdasarkan Nilai Database MMT (1: Selesai, 0: Draft) -->
        <template #item.Status="{ item }">
            <v-chip
                size="x-small"
                :color="
                    Number((item.raw || item).Status) === 1
                        ? 'success'
                        : 'warning'
                "
                class="font-weight-bold"
            >
                {{
                    Number((item.raw || item).Status) === 1
                        ? "Selesai"
                        : "Draft"
                }}
            </v-chip>
        </template>

        <!-- Sub-Tabel Expandable Rincian Mutasi Bahan (Sesuai Referensi MMT) -->
        <template #detail="{ item }">
            <div class="expand-detail-container pa-3">
                <div class="d-flex align-center justify-space-between mb-2">
                    <div class="text-caption font-weight-bold text-primary">
                        Rincian Bahan Dimutasi: {{ getItemNomor(item) }} ({{
                            (item.raw || item).Asal
                        }}
                        ➔ {{ (item.raw || item).Tujuan }})
                    </div>
                    <div
                        class="text-caption text-grey-darken-1 font-weight-medium"
                    >
                        Keterangan: {{ (item.raw || item).Keterangan || "-" }}
                    </div>
                </div>

                <div
                    v-if="
                        loadingDetails[getItemNomor(item)] &&
                        getItemDetails(item).length === 0
                    "
                    class="d-flex align-center py-3 text-caption text-grey"
                >
                    <v-progress-circular
                        indeterminate
                        size="16"
                        width="2"
                        color="primary"
                        class="mr-2"
                    />
                    Memuat rincian bahan...
                </div>

                <div
                    v-else-if="getItemDetails(item).length === 0"
                    class="text-caption text-grey py-2"
                >
                    Tidak ada rincian bahan pada dokumen mutasi ini.
                </div>

                <v-table
                    v-else
                    density="compact"
                    class="sub-detail-table border rounded"
                >
                    <thead>
                        <tr>
                            <th style="width: 40px" class="text-center">No</th>
                            <th style="width: 170px">Barcode</th>
                            <th style="width: 130px">Kode Bahan</th>
                            <th>Nama Bahan</th>
                            <th
                                style="width: 80px"
                                class="text-end font-weight-bold text-primary"
                            >
                                Qty
                            </th>
                            <th style="width: 90px" class="text-end">
                                Panjang (m)
                            </th>
                            <th style="width: 90px" class="text-end">
                                Lebar (m)
                            </th>
                            <th style="width: 110px" class="text-center">
                                Expired
                            </th>
                            <th>Keterangan</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr
                            v-for="(d, dIdx) in getItemDetails(item)"
                            :key="dIdx"
                        >
                            <td class="text-center">{{ dIdx + 1 }}</td>
                            <td
                                class="font-monospace text-primary font-weight-medium"
                            >
                                {{ d.Barcode || d.barcode || "-" }}
                            </td>
                            <td class="font-weight-medium">
                                {{ d.Kode || d.kode_barang || d.kode || "-" }}
                            </td>
                            <td>
                                {{
                                    d.Nama_Barang ||
                                    d.Nama_Bahan ||
                                    d.nama ||
                                    "-"
                                }}
                            </td>
                            <td class="text-end font-weight-bold text-primary">
                                {{
                                    Number(d.Qty ?? d.qty ?? 0).toLocaleString(
                                        "id-ID",
                                    )
                                }}
                            </td>
                            <td class="text-end">
                                {{
                                    d.Panjang != null
                                        ? Number(d.Panjang).toFixed(2)
                                        : d.panjang != null
                                          ? Number(d.panjang).toFixed(2)
                                          : "-"
                                }}
                            </td>
                            <td class="text-end">
                                {{
                                    d.Lebar != null
                                        ? Number(d.Lebar).toFixed(2)
                                        : d.lebar != null
                                          ? Number(d.lebar).toFixed(2)
                                          : "-"
                                }}
                            </td>
                            <td class="text-center">
                                {{
                                    d.Expired
                                        ? formatTanggal(d.Expired)
                                        : d.expired
                                          ? formatTanggal(d.expired)
                                          : "-"
                                }}
                            </td>
                            <td>{{ d.Ket || d.keterangan || "-" }}</td>
                        </tr>
                    </tbody>
                </v-table>
            </div>
        </template>
    </BaseBrowse>
</template>

<style scoped>
.filter-group {
    display: flex;
    align-items: center;
    gap: 4px;
}
.filter-label {
    font-size: 11px;
    font-weight: 600;
    color: #555;
    margin-right: 2px;
}
.filter-sep {
    font-size: 11px;
    color: #777;
}
.date-inp {
    height: 26px;
    border: 1px solid #ccc;
    border-radius: 4px;
    padding: 0 4px;
    font-size: 11px;
    background: white;
    color: #212121;
}

/* Expand Detail Container */
.expand-detail-container {
    background: #f8fafc;
    border-top: 1px solid #e2e8f0;
}
.sub-detail-table {
    background: white;
    font-size: 11px;
}
.sub-detail-table th {
    background: #f1f5f9;
    font-weight: 700;
    color: #334155;
    font-size: 11px;
    height: 30px;
}
.sub-detail-table td {
    height: 28px;
    font-size: 11px;
}
.font-monospace {
    font-family: monospace;
}
</style>
