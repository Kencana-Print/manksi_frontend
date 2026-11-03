<script setup lang="ts">
import { ref, computed } from "vue";
import { useRouter } from "vue-router";
import { useToast } from "vue-toastification";
import BaseBrowse from "@/components/BaseBrowse.vue";
import { useBrowse } from "@/composables/useBrowse";
import {
    IconClipboardList,
    IconPrinter,
    IconFileExport,
    IconFileSpreadsheet,
    IconDotsVertical,
} from "@tabler/icons-vue";
import api from "@/services/api";
import { formatTanggal } from "@/utils/dateFormat";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";

const router = useRouter();
const toast = useToast();

const getThirtyDaysAgo = () => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const getToday = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const startDate = ref(getThirtyDaysAgo());
const endDate = ref(getToday());

const headers = [
    { title: "Nomor", key: "Nomor", width: "160px" },
    {
        title: "Tanggal",
        key: "Tanggal",
        width: "110px",
        align: "center" as const,
    },
    { title: "Gudang", key: "Gudang", width: "90px", align: "center" as const },
    { title: "Nama Gudang", key: "Nama", minWidth: "160px" },
    { title: "Jenis", key: "Jenis", width: "105px", align: "center" as const },
    {
        title: "Status PO",
        key: "Status_PO",
        width: "100px",
        align: "center" as const,
    },
    {
        title: "Status Terima",
        key: "Status_Diterima",
        width: "110px",
        align: "center" as const,
    },
    {
        title: "Status ACC",
        key: "Status_Acc",
        width: "130px",
        align: "center" as const,
    },
    {
        title: "Total Diminta",
        key: "Total_Diminta",
        width: "110px",
        align: "end" as const,
    },
    { title: "Keterangan", key: "Keterangan", minWidth: "200px" },
];

const expanded = ref<any[]>([]);

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
    menuId: "5531",
    fetchApi: async () => {
        const res = await api.get(
            "/mmt/bahan-baku-produksi/permintaan-pembelian",
            {
                params: { startDate: startDate.value, endDate: endDate.value },
            },
        );
        return Array.isArray(res.data) ? res.data : res.data?.data || [];
    },
});

const getItemNomor = (item: any): string => {
    if (!item) return "";
    if (typeof item === "string") return item;
    const raw = item.raw || item;
    return raw.Nomor || raw.nomor || "";
};

const getItemDetails = (item: any): any[] => {
    const raw = item?.raw || item;
    return Array.isArray(raw?.Detail) ? raw.Detail : [];
};

const formatNumber = (val: number | string | null | undefined): string => {
    const n = Number(val) || 0;
    return n.toLocaleString("id-ID");
};

const getStatusAccColor = (status: string | null | undefined): string => {
    if (!status) return "warning";
    const s = status.toUpperCase();
    if (s.startsWith("ACC")) return "success";
    if (s === "PENDING") return "warning";
    if (s === "REJECT" || s === "DITOLAK") return "error";
    return "default";
};

const selectedItem = computed(() => {
    if (!selected.value || selected.value.length !== 1) return null;
    return selected.value[0]?.raw || selected.value[0];
});

const handleNew = () => {
    router.push("/mmt/bahan-baku-produksi/permintaan-pembelian/create");
};

const handleEdit = (item: any) => {
    const target = item || selected.value[0];
    const nomor = getItemNomor(target);
    if (!nomor) return;
    router.push(
        `/mmt/bahan-baku-produksi/permintaan-pembelian/edit/${encodeURIComponent(nomor)}`,
    );
};

const handleDelete = async (item: any) => {
    const target = item || selected.value[0];
    const nomor = getItemNomor(target);
    if (!nomor) return;

    const raw = target?.raw || target;
    if (raw?.Status_Acc && raw.Status_Acc.includes("ACC")) {
        toast.warning(
            "Permintaan Pembelian sudah di-ACC dan tidak dapat dihapus.",
        );
        return;
    }

    if (!confirm(`Hapus data Permintaan Pembelian nomor ${nomor}?`)) return;
    try {
        await api.delete(
            `/mmt/bahan-baku-produksi/permintaan-pembelian/${encodeURIComponent(nomor)}`,
        );
        toast.success("Permintaan Pembelian berhasil dihapus.");
        fetchData();
    } catch (err: any) {
        toast.error(err.response?.data?.message || "Gagal menghapus data.");
    }
};

const handlePrint = (item?: any) => {
    const target = item || selected.value[0];
    const nomor = getItemNomor(target);
    if (!nomor) return;
    router.push(
        `/mmt/bahan-baku-produksi/permintaan-pembelian/print/${encodeURIComponent(nomor)}`,
    );
};

// ==========================================
// EXPORT DETAIL EXCEL SESUAI STANDAR MANKSI
// ==========================================
const handleExportDetailExcel = async () => {
    if (!items.value || items.value.length === 0) {
        toast.warning("Tidak ada data untuk di-export.");
        return;
    }

    try {
        const fileName = `Detail_Permintaan_Pembelian_${startDate.value}_to_${endDate.value}.xlsx`;
        const wb = new ExcelJS.Workbook();
        const ws = wb.addWorksheet("DetailPermintaan");

        // 1. Title Row
        const titleRow = ws.addRow(["LAPORAN RINCIAN PERMINTAAN PEMBELIAN"]);
        titleRow.getCell(1).font = { bold: true, size: 14 };
        ws.mergeCells("A1:K1");

        // 2. Periode Row
        ws.addRow([`Periode: ${startDate.value} s/d ${endDate.value}`]);
        ws.addRow([]);

        // 3. Header Table
        const headerRow = ws.addRow([
            "NOMOR PP",
            "TANGGAL",
            "GUDANG",
            "JENIS",
            "STATUS PO",
            "STATUS ACC",
            "KODE BARANG",
            "NAMA BARANG",
            "JUMLAH",
            "SATUAN",
            "KETERANGAN",
        ]);

        headerRow.eachCell((cell) => {
            cell.fill = {
                type: "pattern",
                pattern: "solid",
                fgColor: { argb: "FFB3E5FC" },
            };
            cell.font = { bold: true, size: 10, color: { argb: "FF000000" } };
            cell.alignment = { horizontal: "center", vertical: "middle" };
            cell.border = {
                top: { style: "thin" },
                bottom: { style: "thin" },
                left: { style: "thin" },
                right: { style: "thin" },
            };
        });

        // 4. Data Rows
        items.value.forEach((hdr: any) => {
            const details = Array.isArray(hdr.Detail) ? hdr.Detail : [];
            if (details.length > 0) {
                details.forEach((d: any, idx: number) => {
                    const row = ws.addRow([
                        idx === 0 ? hdr.Nomor : "",
                        idx === 0 ? formatTanggal(hdr.Tanggal) : "",
                        idx === 0 ? hdr.Gudang : "",
                        idx === 0 ? hdr.Jenis || "-" : "",
                        idx === 0 ? hdr.Status_PO || "-" : "",
                        idx === 0 ? hdr.Status_Acc || "-" : "",
                        d.Kode || "-",
                        d.Nama || d.Nama_Barang || "-",
                        Number(d.Jumlah || d.Qty || 0),
                        d.Satuan || "-",
                        d.Keterangan || hdr.Keterangan || "-",
                    ]);
                    row.eachCell((cell, colNumber) => {
                        cell.font = { size: 10 };
                        cell.border = {
                            top: { style: "thin" },
                            bottom: { style: "thin" },
                            left: { style: "thin" },
                            right: { style: "thin" },
                        };
                        if (colNumber === 9) {
                            cell.numFmt = "#,##0.00";
                            cell.alignment = {
                                horizontal: "right",
                                vertical: "middle",
                            };
                        } else if (colNumber === 8 || colNumber === 11) {
                            cell.alignment = {
                                horizontal: "left",
                                vertical: "middle",
                            };
                        } else {
                            cell.alignment = {
                                horizontal: "center",
                                vertical: "middle",
                            };
                        }
                    });
                });
            } else {
                const row = ws.addRow([
                    hdr.Nomor,
                    formatTanggal(hdr.Tanggal),
                    hdr.Gudang,
                    hdr.Jenis || "-",
                    hdr.Status_PO || "-",
                    hdr.Status_Acc || "-",
                    "-",
                    "-",
                    Number(hdr.Total_Diminta || 0),
                    "-",
                    hdr.Keterangan || "-",
                ]);
                row.eachCell((cell) => {
                    cell.font = { size: 10 };
                    cell.border = {
                        top: { style: "thin" },
                        bottom: { style: "thin" },
                        left: { style: "thin" },
                        right: { style: "thin" },
                    };
                });
            }
        });

        ws.columns = [
            { width: 18 },
            { width: 14 },
            { width: 12 },
            { width: 14 },
            { width: 14 },
            { width: 14 },
            { width: 16 },
            { width: 30 },
            { width: 14 },
            { width: 10 },
            { width: 30 },
        ];

        const buf = await wb.xlsx.writeBuffer();
        saveAs(
            new Blob([buf], {
                type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            }),
            fileName,
        );
        toast.success("Export Detail Permintaan Pembelian Berhasil!");
    } catch (err: any) {
        console.error("Gagal export detail:", err);
        toast.error("Gagal melakukan export detail: " + (err.message || err));
    }
};
</script>

<template>
    <BaseBrowse
        title="Permintaan Pembelian"
        menu-id="5531"
        item-value="Nomor"
        :icon="IconClipboardList"
        :headers="headers"
        :items="items || []"
        :is-loading="isLoading"
        v-model:selected="selected"
        show-expand
        v-model:expanded="expanded"
        :can-insert="canInsert"
        :can-edit="canEdit"
        :can-delete="canDelete"
        :can-export="canExport"
        @refresh="fetchData"
        @add="handleNew"
        @edit="handleEdit"
        @delete="handleDelete"
        @export="exportToExcel('Permintaan_Pembelian_Header')"
    >
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
                <v-btn
                    size="small"
                    color="secondary"
                    variant="tonal"
                    class="ml-2 text-none"
                    :disabled="!selectedItem"
                    @click="handlePrint()"
                >
                    <v-icon :icon="IconPrinter" size="16" class="mr-1" />
                    Cetak
                </v-btn>
            </div>
        </template>

        <template #extra-actions="{ selected: currentSelected }">
            <v-btn
                size="small"
                color="info"
                variant="elevated"
                :disabled="currentSelected.length !== 1"
                @click="handlePrint(currentSelected[0])"
            >
                <v-icon :icon="IconPrinter" size="16" class="mr-1" />
                Cetak Form
            </v-btn>
        </template>

        <template #item.Tanggal="{ item }">
            {{ formatTanggal((item.raw || item).Tanggal) }}
        </template>

        <template #item.Status_PO="{ item }">
            <v-chip
                size="x-small"
                :color="
                    (item.raw || item).Status_PO === 'CLOSED'
                        ? 'grey-darken-1'
                        : 'info'
                "
                class="font-weight-bold"
            >
                {{ (item.raw || item).Status_PO || "OPEN" }}
            </v-chip>
        </template>

        <template #item.Status_Diterima="{ item }">
            <v-chip
                size="x-small"
                :color="
                    (item.raw || item).Status_Diterima === 'CLOSED'
                        ? 'grey-darken-1'
                        : 'info'
                "
                class="font-weight-bold"
            >
                {{ (item.raw || item).Status_Diterima || "OPEN" }}
            </v-chip>
        </template>

        <template #item.Status_Acc="{ item }">
            <v-chip
                size="x-small"
                :color="getStatusAccColor((item.raw || item).Status_Acc)"
                class="font-weight-bold"
            >
                {{ (item.raw || item).Status_Acc || "PENDING" }}
            </v-chip>
        </template>

        <template #item.Total_Diminta="{ item }">
            <span class="font-weight-bold">
                {{ formatNumber((item.raw || item).Total_Diminta) }}
            </span>
        </template>

        <template #detail="{ item }">
            <div class="expand-detail pa-3">
                <div class="detail-title mb-2">
                    Detail Barang / Bahan - {{ getItemNomor(item) }}
                </div>
                <table class="detail-table">
                    <thead>
                        <tr>
                            <th style="width: 50px" class="text-center">No</th>
                            <th style="width: 140px">Kode</th>
                            <th>Nama Bahan</th>
                            <th style="width: 90px" class="text-center">
                                Satuan
                            </th>
                            <th style="width: 100px" class="text-center">
                                Jumlah
                            </th>
                            <th style="width: 90px" class="text-center">SPK</th>

                            <th>Keterangan</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-for="(d, idx) in getItemDetails(item)" :key="idx">
                            <td class="text-center">{{ idx + 1 }}</td>
                            <td>{{ d.Kode || "-" }}</td>
                            <td>{{ d.Nama || d.Nama_Bahan || "-" }}</td>
                            <td class="text-center">{{ d.Satuan || "-" }}</td>
                            <td
                                class="text-center font-weight-bold text-primary"
                            >
                                {{ formatNumber(d.Jumlah || d.Qty) }}
                            </td>
                            <td class="text-center">
                                {{ d.Nomor_SPK || "-" }}
                            </td>

                            <td>{{ d.Keterangan || "-" }}</td>
                        </tr>
                        <tr v-if="getItemDetails(item).length === 0">
                            <td colspan="8" class="text-center text-grey pa-2">
                                Tidak ada rincian data detail.
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </template>
    </BaseBrowse>
</template>

<style scoped>
.filter-group {
    display: flex;
    align-items: center;
    gap: 6px;
}
.filter-label {
    font-size: 11px;
    font-weight: 600;
    color: #475569;
}
.filter-sep {
    font-size: 11px;
    color: #64748b;
}
.date-inp {
    border: 1px solid #cbd5e1;
    border-radius: 4px;
    padding: 2px 6px;
    font-size: 11px;
    background: #fff;
    outline: none;
}
.expand-detail {
    background: #f8fafc;
    border-top: 1px solid #e2e8f0;
    border-bottom: 1px solid #e2e8f0;
}
.detail-title {
    font-size: 11px;
    font-weight: 700;
    color: #334155;
}
.detail-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 11px;
    background: #fff;
    border: 1px solid #e2e8f0;
}
.detail-table th,
.detail-table td {
    padding: 4px 8px;
    border: 1px solid #e2e8f0;
}
.detail-table th {
    background: #f1f5f9;
    font-weight: 600;
    color: #475569;
}
</style>
