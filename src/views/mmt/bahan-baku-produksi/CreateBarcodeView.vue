<script setup lang="ts">
import { ref, computed } from "vue";
import { useRouter } from "vue-router";
import { useToast } from "vue-toastification";
import BaseBrowse from "@/components/BaseBrowse.vue";
import { useBrowse } from "@/composables/useBrowse";
import {
    IconBarcode,
    IconPrinter,
    IconQrcode,
    IconX,
    IconFileSpreadsheet,
} from "@tabler/icons-vue";
import api from "@/services/api";
import { formatTanggal } from "@/utils/dateFormat";
import { exportExcelSingle, type ExcelColumn } from "@/utils/excelExport";
import QRCode from "qrcode";

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
    { title: "No. Referensi", key: "mst_noreferensi", width: "190px" },
    {
        title: "Tanggal Masuk",
        key: "mst_tanggal",
        width: "130px",
        align: "center" as const,
    },
    {
        title: "Gudang",
        key: "mst_gdg_kode",
        width: "120px",
        align: "center" as const,
    },
    {
        title: "Total Rol",
        key: "total_qty",
        width: "130px",
        align: "end" as const,
    },
    {
        title: "Aksi",
        key: "actions",
        width: "110px",
        align: "center" as const,
        sortable: false,
    },
];

interface BarcodeDetail {
    mst_noreferensi?: string;
    mst_barcode?: string;
    mst_brg_kode?: string;
    nama_asli?: string;
    mst_panjang?: number | string;
    mst_lebar?: number | string;
}

interface PrintLabelItem {
    namaBahan: string;
    qrValue: string;
    qrImage: string;
    panjang: string | number;
    lebar: string | number;
}

// --- EXPAND LOGIC (DETAIL BARCODE ROL / DROPDOWN SELARAS MMT) ---
const expanded = ref<any[]>([]);
const detailCache = ref<Record<string, BarcodeDetail[]>>({});

const { items, isLoading, selected, canInsert, fetchData } = useBrowse<any>({
    menuId: "5541",
    fetchApi: async () => {
        detailCache.value = {};
        const res = await api.get(
            "/mmt/bahan-baku-produksi/barcode/create/history",
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
    return raw.mst_noreferensi || "";
};

const selectedItem = computed(() => {
    if (!selected.value || selected.value.length !== 1) return null;
    return selected.value[0]?.raw || selected.value[0];
});

const getItemDetails = (item: any): BarcodeDetail[] => {
    const raw = item?.raw || item;
    const nomor = getItemNomor(raw);
    if (detailCache.value[nomor] && detailCache.value[nomor].length > 0) {
        return detailCache.value[nomor];
    }
    const details = raw?.details || raw?.Details;
    if (Array.isArray(details) && details.length > 0) {
        return details;
    }
    return detailCache.value[nomor] || [];
};

const onUpdateExpanded = (newExpanded: any[]) => {
    expanded.value = newExpanded;
    for (const expItem of newExpanded) {
        const raw = expItem?.raw || expItem;
        const nomor = getItemNomor(raw);
        if (!nomor) continue;

        const existing = (items.value || []).find(
            (it: any) => getItemNomor(it) === nomor,
        );
        const existingRaw = existing?.raw || existing;
        const exDetails = existingRaw?.details || existingRaw?.Details;
        if (Array.isArray(exDetails) && exDetails.length > 0) {
            detailCache.value = { ...detailCache.value, [nomor]: exDetails };
        }
    }
};

const handleNew = () => {
    router.push("/mmt/bahan-baku-produksi/create-barcode/create");
};

// ========================================================
// CETAK STIKER LABEL THERMAL (POSTEK / XPRINTER) SESUAI MMT
// ========================================================
const showQRDialog = ref(false);
const isGeneratingQR = ref(false);
const itemsToPrint = ref<PrintLabelItem[]>([]);
const selectedItemsToPrint = ref<number[]>([]);
const printCopies = ref<number>(2); // Default 2 salinan sesuai SOP MMT (fisik & arsip)
const emptyLabelsOffset = ref<number>(0);
const printerType = ref<"xprinter" | "postek">("postek");
const targetPrintRef = ref<string>("");

const preparePrint = async (
    headerOrDetail: any,
    singleItem?: BarcodeDetail,
) => {
    const target = headerOrDetail?.raw || headerOrDetail || selectedItem.value;
    if (!target) {
        toast.warning("Silakan pilih data referensi barcode terlebih dahulu.");
        return;
    }

    isGeneratingQR.value = true;
    targetPrintRef.value = getItemNomor(target) || "SINGLE-ITEM";

    try {
        let sourceList: BarcodeDetail[] = [];
        if (singleItem) {
            sourceList = [singleItem];
        } else {
            sourceList = getItemDetails(target);
        }

        if (!sourceList || sourceList.length === 0) {
            toast.warning("Tidak ada rincian barcode untuk dicetak.");
            return;
        }

        const tempPrintList: PrintLabelItem[] = [];
        for (const d of sourceList) {
            const barcodeStr = d.mst_barcode?.trim() || "";
            if (!barcodeStr) continue;

            const qrImage = await QRCode.toDataURL(barcodeStr, {
                width: 300,
                margin: 0,
                errorCorrectionLevel: "M",
            });

            tempPrintList.push({
                namaBahan: d.nama_asli || "BAHAN MMT",
                qrValue: barcodeStr,
                qrImage,
                panjang:
                    d.mst_panjang !== null && d.mst_panjang !== undefined
                        ? d.mst_panjang
                        : 0,
                lebar:
                    d.mst_lebar !== null && d.mst_lebar !== undefined
                        ? d.mst_lebar
                        : 0,
            });
        }

        if (tempPrintList.length === 0) {
            toast.warning("Gagal memproses kode barcode.");
            return;
        }

        itemsToPrint.value = tempPrintList;
        selectedItemsToPrint.value = tempPrintList.map((_, i) => i);
        showQRDialog.value = true;
    } catch (err: any) {
        console.error("Gagal generate QR Code label:", err);
        toast.error("Gagal memproses data cetak label barcode.");
    } finally {
        isGeneratingQR.value = false;
    }
};

const isAllLabelsSelected = computed(() => {
    return (
        itemsToPrint.value.length > 0 &&
        selectedItemsToPrint.value.length === itemsToPrint.value.length
    );
});

const toggleSelectAllLabels = () => {
    if (isAllLabelsSelected.value) {
        selectedItemsToPrint.value = [];
    } else {
        selectedItemsToPrint.value = itemsToPrint.value.map((_, i) => i);
    }
};

const printContent = () => {
    const iframe = document.createElement("iframe");
    Object.assign(iframe.style, {
        position: "fixed",
        right: "0",
        bottom: "0",
        width: "0",
        height: "0",
        border: "0",
        visibility: "hidden",
    });
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (!doc) return;

    const allLabels: (PrintLabelItem | null)[] = [];
    for (let o = 0; o < (emptyLabelsOffset.value || 0); o++) {
        allLabels.push(null);
    }

    itemsToPrint.value.forEach((item, index) => {
        if (selectedItemsToPrint.value.includes(index)) {
            const copies = Math.max(1, printCopies.value || 1);
            for (let c = 0; c < copies; c++) {
                allLabels.push(item);
            }
        }
    });

    if (allLabels.length === 0) {
        toast.warning("Pilih minimal satu label untuk dicetak.");
        document.body.removeChild(iframe);
        return;
    }

    let html = "";
    for (let i = 0; i < allLabels.length; i += 2) {
        const l1 = allLabels[i];
        const l2 = allLabels[i + 1];

        const renderLabelBox = (l: PrintLabelItem | null, posClass: string) => {
            if (!l) {
                return `<div class="label-box ${posClass}"><div class="border-inner" style="border: none;"></div></div>`;
            }
            return `
        <div class="label-box ${posClass}">
          <div class="border-inner">
            <div class="top-row">
              <img src="${l.qrImage}" class="qr-img" />
              <div class="info-column">
                <div class="qr-text">${l.qrValue}</div>
                <div class="dimens-text">${l.panjang} x ${l.lebar} m</div>
              </div>
            </div>
            <div class="divider"></div>
            <div class="product-name">${l.namaBahan}</div>
          </div>
        </div>
      `;
        };

        html += `
      <div class="print-page">
        ${renderLabelBox(l1, "pos-top")}
        ${l2 ? renderLabelBox(l2, "pos-bottom") : ""}
      </div>
    `;
    }

    doc.open();
    doc.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Cetak Label Barcode - ${targetPrintRef.value}</title>
      <style>
        @page { size: 100mm 101mm; margin: 0; }
        body { margin: 0; padding: 0; line-height: 0; background: white; font-family: Arial, sans-serif; }
        .print-page { 
          width: 100mm; height: 101mm; 
          position: relative; page-break-after: always; 
          overflow: hidden; box-sizing: border-box;
        }
        .label-box { 
          width: 67mm; height: 44.5mm;
          position: absolute; left: 50%; transform: translateX(-50%); 
          line-height: normal; box-sizing: border-box;
        }
        .pos-top { top: 0mm; }
        .pos-bottom { bottom: 0mm; }
        .border-inner { 
          border: 1.5pt solid black; height: 100%; padding: 2mm; 
          display: flex; flex-direction: column; box-sizing: border-box; 
          font-weight: bold; 
        }
        .top-row { display: flex; gap: 8px; align-items: flex-start; }
        .qr-img { width: 1.5cm; height: 1.5cm; flex-shrink: 0; }
        .info-column { display: flex; flex-direction: column; justify-content: center; overflow: hidden; }
        .qr-text { font-size: 8pt; font-weight: bold; word-break: break-all; color: #000; line-height: 1.1; }
        .dimens-text { font-size: 10pt; font-weight: 700; margin-top: 2px; }
        .divider { border-top: 1.5pt dashed black; margin: 4px 0; }
        .product-name { 
          font-size: 11pt; font-weight: bold; text-align: center; flex-grow: 1; 
          display: flex; align-items: center; justify-content: center; 
          text-transform: uppercase; word-break: break-word; line-height: 1.2;
        }
      </style>
    </head>
    <body>${html}</body>
    </html>
  `);
    doc.close();

    setTimeout(() => {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
        setTimeout(() => {
            if (document.body.contains(iframe)) {
                document.body.removeChild(iframe);
            }
        }, 1500);
    }, 500);
};

// ==========================================
// EXPORT EXCEL RIWAYAT BARCODE ROL
// ==========================================
const handleExportExcel = async () => {
    if (!items.value || items.value.length === 0) {
        toast.warning("Tidak ada data untuk di-export.");
        return;
    }

    try {
        const fileName = `Laporan_Create_Barcode_${startDate.value}_to_${endDate.value}.xlsx`;
        const columns: ExcelColumn[] = [
            {
                header: "No. Referensi",
                key: "mst_noreferensi",
                width: 22,
                align: "center",
            },
            {
                header: "Tanggal",
                key: "mst_tanggal",
                width: 14,
                align: "center",
            },
            {
                header: "Gudang",
                key: "mst_gdg_kode",
                width: 12,
                align: "center",
            },
            {
                header: "Barcode Rol",
                key: "mst_barcode",
                width: 18,
                align: "center",
            },
            {
                header: "Kode Bahan",
                key: "mst_brg_kode",
                width: 16,
                align: "center",
            },
            { header: "Nama Bahan", key: "nama_asli", width: 32 },
            {
                header: "Panjang (m)",
                key: "mst_panjang",
                width: 14,
                numFmt: "#,##0.00",
                align: "right",
            },
            {
                header: "Lebar (m)",
                key: "mst_lebar",
                width: 14,
                numFmt: "#,##0.00",
                align: "right",
            },
        ];

        const rows: any[] = [];
        items.value.forEach((h: any) => {
            const details = h.details || [];
            const tglFormatted =
                formatTanggal(h.mst_tanggal) || h.mst_tanggal || "-";

            if (details.length > 0) {
                details.forEach((dtl: BarcodeDetail, idx: number) => {
                    rows.push({
                        mst_noreferensi: idx === 0 ? h.mst_noreferensi : "",
                        mst_tanggal: idx === 0 ? tglFormatted : "",
                        mst_gdg_kode:
                            idx === 0 ? h.mst_gdg_kode || "WH-16" : "",
                        mst_barcode: dtl.mst_barcode || "-",
                        mst_brg_kode: dtl.mst_brg_kode || "-",
                        nama_asli: dtl.nama_asli || "-",
                        mst_panjang: Number(dtl.mst_panjang || 0),
                        mst_lebar: Number(dtl.mst_lebar || 0),
                    });
                });
            } else {
                rows.push({
                    mst_noreferensi: h.mst_noreferensi,
                    mst_tanggal: tglFormatted,
                    mst_gdg_kode: h.mst_gdg_kode || "WH-16",
                    mst_barcode: "-",
                    mst_brg_kode: "-",
                    nama_asli: "-",
                    mst_panjang: 0,
                    mst_lebar: 0,
                });
            }
        });

        await exportExcelSingle(
            fileName,
            "Riwayat_Barcode",
            columns,
            rows,
            `LAPORAN RIWAYAT BARCODE ROL (${startDate.value} s/d ${endDate.value})`,
        );
        toast.success("Export Excel riwayat barcode berhasil.");
    } catch (err: any) {
        toast.error("Gagal export Excel: " + (err.message || err));
    }
};
</script>

<template>
    <BaseBrowse
        title="Create Barcode"
        menu-id="5541"
        item-value="mst_noreferensi"
        :icon="IconBarcode"
        :headers="headers"
        :items="items || []"
        :is-loading="isLoading"
        v-model:selected="selected"
        :show-expand="true"
        :expanded="expanded"
        @update:expanded="onUpdateExpanded"
        :can-insert="canInsert"
        :can-edit="false"
        :can-delete="false"
        :can-export="true"
        @refresh="fetchData"
        @add="handleNew"
        @export="handleExportExcel"
    >
        <!-- Header Extra Actions (Sejajar dengan CRUD di header atas) -->
        <template #extra-actions>
            <v-btn
                size="small"
                color="secondary"
                variant="tonal"
                class="text-none font-weight-medium"
                :disabled="!selectedItem"
                :loading="isGeneratingQR"
                @click="preparePrint(selectedItem)"
            >
                <template #prepend>
                    <IconPrinter :size="15" />
                </template>
                Cetak Label Barcode
            </v-btn>
        </template>

        <!-- Filter Bar Kiri (Periode Tanggal) -->
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

        <!-- Kolom No. Referensi -->
        <template #item.mst_noreferensi="{ item }">
            <span class="font-monospace font-weight-bold text-primary">
                {{ (item.raw || item).mst_noreferensi }}
            </span>
        </template>

        <!-- Kolom Tanggal -->
        <template #item.mst_tanggal="{ item }">
            {{ formatTanggal((item.raw || item).mst_tanggal) }}
        </template>

        <!-- Kolom Gudang -->
        <template #item.mst_gdg_kode="{ item }">
            <v-chip
                size="x-small"
                color="primary"
                variant="tonal"
                class="font-weight-medium"
            >
                {{ (item.raw || item).mst_gdg_kode || "WH-16" }}
            </v-chip>
        </template>

        <!-- Kolom Total Rol Barcode -->
        <template #item.total_qty="{ item }">
            <span class="font-weight-bold text-primary">
                {{
                    Number((item.raw || item).total_qty || 0).toLocaleString(
                        "id-ID",
                    )
                }}
                rol
            </span>
        </template>

        <!-- Kolom Aksi per Baris -->
        <template #item.actions="{ item }">
            <v-btn
                size="x-small"
                color="info"
                variant="tonal"
                class="text-none font-weight-medium"
                @click.stop="preparePrint(item)"
            >
                <template #prepend>
                    <IconPrinter :size="13" />
                </template>
                Cetak
            </v-btn>
        </template>

        <!-- Dropdown Sub-Tabel Rincian Barcode Rol (Selaras Sistem MMT) -->
        <template #detail="{ item }">
            <div class="expand-detail-container pa-3">
                <div class="d-flex align-center justify-space-between mb-2">
                    <div class="d-flex align-center">
                        <v-icon
                            :icon="IconBarcode"
                            size="16"
                            class="mr-1 text-primary"
                        />
                        <span
                            class="text-caption font-weight-bold text-grey-darken-2"
                        >
                            Rincian Barcode Rol Batch:
                        </span>
                        <span
                            class="text-caption font-monospace font-weight-bold text-primary ml-1"
                        >
                            {{ (item.raw || item).mst_noreferensi }}
                        </span>
                        <span class="text-caption text-grey ml-2">
                            ({{ getItemDetails(item).length }} rol barcode)
                        </span>
                    </div>

                    <v-btn
                        size="x-small"
                        color="primary"
                        variant="tonal"
                        class="text-none font-weight-medium"
                        @click="preparePrint(item)"
                    >
                        <template #prepend>
                            <IconPrinter :size="13" />
                        </template>
                        Cetak Semua Label Referensi Ini
                    </v-btn>
                </div>

                <v-table
                    density="compact"
                    class="sub-detail-table border rounded"
                >
                    <thead>
                        <tr>
                            <th style="width: 45px" class="text-center">No</th>
                            <th style="width: 200px">Barcode Rol</th>
                            <th style="width: 140px">Kode Bahan</th>
                            <th>Nama Bahan</th>
                            <th style="width: 140px" class="text-center">
                                Dimensi (PxL)
                            </th>
                            <th style="width: 90px" class="text-center">
                                Aksi
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-for="(b, idx) in getItemDetails(item)" :key="idx">
                            <td class="text-center text-caption">
                                {{ idx + 1 }}
                            </td>
                            <td>
                                <span class="barcode-badge">{{
                                    b.mst_barcode
                                }}</span>
                            </td>
                            <td
                                class="font-weight-medium text-caption text-grey-darken-2"
                            >
                                {{ b.mst_brg_kode }}
                            </td>
                            <td class="text-caption font-weight-medium">
                                {{ b.nama_asli || "-" }}
                            </td>
                            <td class="text-center text-caption">
                                <v-chip
                                    size="x-small"
                                    variant="text"
                                    class="font-weight-medium"
                                >
                                    {{ Number(b.mst_panjang || 0).toFixed(2) }}m
                                    &times;
                                    {{ Number(b.mst_lebar || 0).toFixed(2) }}m
                                </v-chip>
                            </td>
                            <td class="text-center">
                                <v-btn
                                    size="x-small"
                                    variant="tonal"
                                    color="info"
                                    class="text-none px-2"
                                    @click="preparePrint(item, b)"
                                >
                                    <IconPrinter :size="13" class="mr-1" />
                                    Cetak
                                </v-btn>
                            </td>
                        </tr>
                        <tr v-if="!getItemDetails(item).length">
                            <td
                                colspan="6"
                                class="text-center py-4 text-grey text-caption"
                            >
                                Tidak ada detail barcode pada referensi ini.
                            </td>
                        </tr>
                    </tbody>
                </v-table>
            </div>
        </template>
    </BaseBrowse>

    <!-- Dialog Pengaturan & Preview Cetak Label QR (Thermal Sticker Label Sesuai MMT) -->
    <v-dialog v-model="showQRDialog" max-width="1100" scrollable>
        <v-card class="qr-dialog-card">
            <!-- Header Dialog -->
            <v-card-title class="dialog-header py-3 px-4 border-b">
                <div class="d-flex align-center">
                    <v-avatar
                        color="primary"
                        variant="tonal"
                        size="36"
                        class="mr-3"
                    >
                        <IconQrcode :size="20" />
                    </v-avatar>
                    <div>
                        <div class="text-subtitle-1 font-weight-bold">
                            Pengaturan Cetak Label Barcode Rol
                        </div>
                        <div class="text-caption text-medium-emphasis">
                            No. Referensi:
                            <strong>{{ targetPrintRef }}</strong> &bull; Total
                            Terpilih:
                            <strong>
                                {{
                                    selectedItemsToPrint.length *
                                    (printCopies || 1)
                                }}
                                Label
                            </strong>
                        </div>
                    </div>
                </div>
                <v-spacer />
                <div class="d-flex align-center ga-2">
                    <v-btn
                        color="primary"
                        size="small"
                        class="text-none font-weight-bold px-4"
                        :disabled="selectedItemsToPrint.length === 0"
                        @click="printContent"
                    >
                        <template #prepend>
                            <IconPrinter :size="16" />
                        </template>
                        PRINT SEKARANG
                    </v-btn>
                    <v-btn
                        icon
                        size="small"
                        variant="text"
                        @click="showQRDialog = false"
                    >
                        <IconX :size="18" />
                    </v-btn>
                </div>
            </v-card-title>

            <!-- Pengaturan Toolbar (Tipe Printer, Salinan, Offset) -->
            <v-card-text class="pa-4 bg-grey-lighten-5">
                <v-card
                    variant="flat"
                    border
                    class="pa-3 mb-4 bg-white rounded-lg"
                >
                    <v-row dense align="center">
                        <v-col cols="12" sm="4" md="3">
                            <div class="setting-label mb-1">Jenis Printer</div>
                            <v-btn-toggle
                                v-model="printerType"
                                color="primary"
                                variant="outlined"
                                density="compact"
                                mandatory
                                class="w-100"
                            >
                                <v-btn
                                    value="postek"
                                    class="flex-grow-1 text-none font-weight-medium"
                                >
                                    Postek
                                </v-btn>
                                <v-btn
                                    value="xprinter"
                                    class="flex-grow-1 text-none font-weight-medium"
                                >
                                    XPrinter
                                </v-btn>
                            </v-btn-toggle>
                        </v-col>

                        <v-col cols="6" sm="3" md="2">
                            <div class="setting-label mb-1">
                                Salinan / Barcode
                            </div>
                            <v-text-field
                                v-model.number="printCopies"
                                type="number"
                                min="1"
                                density="compact"
                                variant="outlined"
                                hide-details
                            />
                        </v-col>

                        <v-col cols="6" sm="3" md="2">
                            <div class="setting-label mb-1">
                                Lewati (Offset)
                            </div>
                            <v-text-field
                                v-model.number="emptyLabelsOffset"
                                type="number"
                                min="0"
                                density="compact"
                                variant="outlined"
                                hide-details
                            />
                        </v-col>

                        <v-col
                            cols="12"
                            sm="2"
                            md="5"
                            class="d-flex align-center justify-end pt-4 pt-sm-0 ga-2"
                        >
                            <v-chip color="info" size="small" variant="flat">
                                Total:
                                {{
                                    selectedItemsToPrint.length *
                                    (printCopies || 1)
                                }}
                                Label
                            </v-chip>
                            <v-btn
                                size="small"
                                variant="outlined"
                                color="grey-darken-2"
                                class="text-none font-weight-medium"
                                @click="toggleSelectAllLabels"
                            >
                                {{
                                    isAllLabelsSelected
                                        ? "Batal Pilih Semua"
                                        : "Pilih Semua Label"
                                }}
                            </v-btn>
                        </v-col>
                    </v-row>
                </v-card>

                <!-- Preview Grid Box Label (Visual persis hasil cetak) -->
                <div class="preview-container">
                    <div
                        v-for="(item, index) in itemsToPrint"
                        :key="index"
                        class="preview-card-item"
                        :class="{
                            selected: selectedItemsToPrint.includes(index),
                        }"
                        @click="
                            selectedItemsToPrint.includes(index)
                                ? (selectedItemsToPrint =
                                      selectedItemsToPrint.filter(
                                          (i) => i !== index,
                                      ))
                                : selectedItemsToPrint.push(index)
                        "
                    >
                        <div class="checkbox-indicator">
                            <input
                                type="checkbox"
                                :checked="selectedItemsToPrint.includes(index)"
                                @click.stop
                            />
                        </div>

                        <!-- Box Fisik Label (Rasio Stiker 67 x 44.5 mm) -->
                        <div class="mock-label-box">
                            <div class="mock-border-inner">
                                <div class="mock-top-row">
                                    <img
                                        :src="item.qrImage"
                                        class="mock-qr-img"
                                    />
                                    <div class="mock-info-col">
                                        <div class="mock-qr-val">
                                            {{ item.qrValue }}
                                        </div>
                                        <div class="mock-dimens">
                                            {{ item.panjang }} &times;
                                            {{ item.lebar }} m
                                        </div>
                                    </div>
                                </div>
                                <div class="mock-divider"></div>
                                <div class="mock-product-name">
                                    {{ item.namaBahan }}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </v-card-text>
        </v-card>
    </v-dialog>
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

/* ── Expand Sub-Tabel ── */
.expand-detail-container {
    background-color: #f8fafc;
    border-top: 1px dashed #cbd5e1;
    border-bottom: 1px dashed #cbd5e1;
    border-left: 3px solid #1976d2;
}

.sub-detail-table {
    background-color: #ffffff !important;
}

.sub-detail-table th {
    background-color: #f1f5f9 !important;
    color: #334155 !important;
    font-weight: 700 !important;
    font-size: 11px !important;
    text-transform: uppercase;
    letter-spacing: 0.3px;
    height: 32px !important;
}

.sub-detail-table td {
    font-size: 11px !important;
    height: 30px !important;
    color: #1e293b;
}

.barcode-badge {
    font-size: 10px;
    padding: 2px 6px;
    border-radius: 3px;
    color: #1565c0;
    font-weight: 700;
}

/* ── Modal Dialog Preview Label ── */
.setting-label {
    font-size: 11px;
    font-weight: 600;
    color: #555;
}

.preview-container {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
    gap: 12px;
    max-height: 520px;
    overflow-y: auto;
    padding: 4px;
}

.preview-card-item {
    position: relative;
    background: white;
    border: 2px solid #e2e8f0;
    border-radius: 8px;
    padding: 10px;
    cursor: pointer;
    transition: all 0.2s ease;
    user-select: none;
}

.preview-card-item:hover {
    border-color: #94a3b8;
    transform: translateY(-1px);
}

.preview-card-item.selected {
    border-color: #1976d2;
    background: #f0f7ff;
}

.checkbox-indicator {
    position: absolute;
    top: 6px;
    right: 6px;
    z-index: 2;
}

/* Mockup box label 67x44.5 mm */
.mock-label-box {
    width: 100%;
    aspect-ratio: 67 / 44.5;
    background: white;
    padding: 4px;
    box-sizing: border-box;
}

.mock-border-inner {
    border: 1.5px solid #000;
    height: 100%;
    width: 100%;
    padding: 4px;
    display: flex;
    flex-direction: column;
    box-sizing: border-box;
    font-family: Arial, sans-serif;
    font-weight: bold;
}

.mock-top-row {
    display: flex;
    gap: 6px;
    align-items: flex-start;
}

.mock-qr-img {
    width: 44px;
    height: 44px;
    flex-shrink: 0;
}

.mock-info-col {
    display: flex;
    flex-direction: column;
    justify-content: center;
    overflow: hidden;
}

.mock-qr-val {
    font-size: 9px;
    font-weight: 700;
    word-break: break-all;
    line-height: 1.1;
    color: #000;
}

.mock-dimens {
    font-size: 10px;
    font-weight: 700;
    margin-top: 3px;
    color: #333;
}

.mock-divider {
    border-top: 1.5px dashed #000;
    margin: 4px 0;
}

.mock-product-name {
    font-size: 10px;
    font-weight: 800;
    text-align: center;
    flex-grow: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    text-transform: uppercase;
    word-break: break-word;
    line-height: 1.15;
    color: #000;
}
</style>
