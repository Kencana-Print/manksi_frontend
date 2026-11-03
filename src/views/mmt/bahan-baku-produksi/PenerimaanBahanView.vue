<script setup lang="ts">
import { ref, computed } from "vue";
import { useRouter } from "vue-router";
import { useToast } from "vue-toastification";
import BaseBrowse from "@/components/BaseBrowse.vue";
import { useBrowse } from "@/composables/useBrowse";
import {
    IconPackage,
    IconPrinter,
    IconQrcode,
    IconFileSpreadsheet,
    IconDownload,
    IconX,
    IconCheck,
    IconBarcode,
    IconDotsVertical,
    IconFileExport,
} from "@tabler/icons-vue";
import api from "@/services/api";
import { formatTanggal } from "@/utils/dateFormat";
import QRCode from "qrcode";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";

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
    { title: "Nomor BPB", key: "Nomor", width: "170px" },
    {
        title: "Tanggal",
        key: "Tanggal",
        width: "110px",
        align: "center" as const,
    },
    {
        title: "Gudang",
        key: "Gudang",
        width: "100px",
        align: "center" as const,
    },
    { title: "Supplier", key: "Supplier", minWidth: "240px" },
    {
        title: "No. Permintaan",
        key: "No_permintaan",
        width: "180px",
        align: "center" as const,
    },
    { title: "Keterangan", key: "Keterangan", minWidth: "200px" },
];

const { items, isLoading, selected, canInsert, canEdit, canDelete, fetchData } =
    useBrowse<any>({
        menuId: "5533",
        fetchApi: async () => {
            const res = await api.get(
                "/mmt/bahan-baku-produksi/penerimaan-bahan",
                {
                    params: {
                        startDate: startDate.value,
                        endDate: endDate.value,
                    },
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

const selectedItem = computed(() => {
    if (!selected.value || selected.value.length !== 1) return null;
    return selected.value[0]?.raw || selected.value[0];
});

// --- EXPAND LOGIC (RINCIAN DETAIL BAHAN & BARCODE) ---
const expanded = ref<any[]>([]);
const detailCache = ref<Record<string, any[]>>({});
const loadingDetails = ref(new Set<string>());

const onUpdateExpanded = async (newExpanded: any[]) => {
    expanded.value = newExpanded;
    for (const it of newExpanded) {
        const nomor = getItemNomor(it);
        if (!nomor) continue;
        if (it.Detail && it.Detail.length > 0) {
            detailCache.value[nomor] = it.Detail;
            continue;
        }
        if (detailCache.value[nomor] || loadingDetails.value.has(nomor)) continue;

        loadingDetails.value.add(nomor);
        try {
            const res = await api.get(
                `/mmt/bahan-baku-produksi/penerimaan-bahan/${encodeURIComponent(nomor)}`,
            );
            const d = res.data?.data;
            const details = d?.details || d?.Detail || [];
            detailCache.value[nomor] = details;
            it.Detail = details;
        } catch (err) {
            console.error(`Gagal load detail BPB ${nomor}:`, err);
            detailCache.value[nomor] = [];
        } finally {
            loadingDetails.value.delete(nomor);
        }
    }
};

const getItemDetails = (item: any) => {
    const nomor = getItemNomor(item);
    if (detailCache.value[nomor] && detailCache.value[nomor].length > 0) {
        return detailCache.value[nomor];
    }
    const raw = item?.raw || item;
    return raw?.Detail || raw?.details || [];
};

const handleNew = () => {
    router.push("/mmt/bahan-baku-produksi/penerimaan-bahan/create");
};

const handleEdit = (item: any) => {
    const target = item || selected.value[0];
    const nomor = getItemNomor(target);
    if (!nomor) return;
    router.push(
        `/mmt/bahan-baku-produksi/penerimaan-bahan/edit/${encodeURIComponent(nomor)}`,
    );
};

const handleDelete = async (item: any) => {
    const target = item || selected.value[0];
    const nomor = getItemNomor(target);
    if (!nomor) return;

    if (!confirm(`Hapus data penerimaan bahan nomor ${nomor}?`)) return;
    try {
        await api.delete(
            `/mmt/bahan-baku-produksi/penerimaan-bahan/${encodeURIComponent(nomor)}`,
        );
        toast.success("Penerimaan bahan berhasil dihapus.");
        fetchData();
    } catch (err: any) {
        toast.error(err.response?.data?.message || "Gagal menghapus data.");
    }
};

// ==========================================
// 1. CETAK TANDA TERIMA
// ==========================================
const handlePrintSlip = (item?: any) => {
    const target = item || selectedItem.value;
    const nomor = getItemNomor(target);
    if (!nomor) {
        toast.warning(
            "Pilih satu transaksi penerimaan untuk mencetak tanda terima.",
        );
        return;
    }
    const url = `/mmt/bahan-baku-produksi/penerimaan-bahan/print/${encodeURIComponent(nomor)}`;
    window.open(url, "_blank");
};

// ==========================================
// 2. CETAK QR ITEM (SESUAI SISTEM MMT)
// ==========================================
interface PrintItem {
    Nama_Bahan: string;
    qrValue: string;
    qrImage: string;
    Panjang?: string | number;
    Lebar?: string | number;
}

const showQRDialog = ref(false);
const isGeneratingQR = ref(false);
const printerType = ref<"xprinter" | "postek">("xprinter");
const printCopies = ref<number>(1);
const emptyLabelsOffset = ref<number>(0);
const itemsToPrint = ref<PrintItem[]>([]);
const selectedItemsToPrint = ref<number[]>([]);

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

const handlePrintQR = async (item?: any) => {
    const target = item || selectedItem.value;
    if (!target) {
        toast.warning(
            "Pilih satu transaksi penerimaan untuk mencetak QR Item.",
        );
        return;
    }

    isGeneratingQR.value = true;
    const tempPrintList: PrintItem[] = [];
    const detailsList = target.Detail || [];

    try {
        // 1. Coba ambil dari detail row terlebih dahulu
        for (const dtl of detailsList) {
            const rawBarcodes = dtl.List_Barcode
                ? String(dtl.List_Barcode)
                      .split(",")
                      .map((b) => b.trim())
                      .filter(Boolean)
                : [];

            for (const val of rawBarcodes) {
                const qrImage = await QRCode.toDataURL(val, {
                    width: 300,
                    margin: 0,
                    errorCorrectionLevel: "H",
                });

                tempPrintList.push({
                    Nama_Bahan: dtl.Nama_Bahan || "-",
                    qrValue: val,
                    qrImage,
                    Panjang: dtl.Panjang || "-",
                    Lebar: dtl.Lebar || "-",
                });
            }
        }

        // 2. Jika belum ada dari detail row, fallback panggil endpoint /barcodes/:nomor
        if (tempPrintList.length === 0 && target.Nomor) {
            try {
                const resBc = await api.get(
                    `/mmt/bahan-baku-produksi/penerimaan-bahan/barcodes/${encodeURIComponent(target.Nomor)}`,
                );
                const barcodesData = resBc.data?.data || [];
                for (const b of barcodesData) {
                    const matchedDetail = detailsList.find(
                        (d: any) => d.Kode === b.kode,
                    );
                    const qrImage = await QRCode.toDataURL(b.barcode, {
                        width: 300,
                        margin: 0,
                        errorCorrectionLevel: "H",
                    });

                    tempPrintList.push({
                        Nama_Bahan:
                            b.namaBahan || matchedDetail?.Nama_Bahan || "-",
                        qrValue: b.barcode,
                        qrImage,
                        Panjang: matchedDetail?.Panjang || b.panjang || "-",
                        Lebar: matchedDetail?.Lebar || b.lebar || "-",
                    });
                }
            } catch (err) {
                console.error("Fallback /barcodes/:nomor:", err);
            }
        }

        if (tempPrintList.length === 0) {
            toast.warning(
                "Tidak ada barcode/serial pada transaksi ini untuk dicetak.",
            );
            return;
        }

        itemsToPrint.value = tempPrintList;
        selectedItemsToPrint.value = tempPrintList.map((_, i) => i);
        showQRDialog.value = true;
    } catch (err: any) {
        console.error("Gagal generate QR Code:", err);
        toast.error("Gagal memproses QR Code item.");
    } finally {
        isGeneratingQR.value = false;
    }
};

const printContent = () => {
    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.visibility = "hidden";
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (!doc) return;

    const allLabels: (PrintItem | null)[] = [];
    // Offset blank labels
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

        const renderLabelBox = (l: PrintItem | null, posClass: string) => {
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
                                <div class="dimens-text">${l.Panjang} x ${l.Lebar}</div>
                            </div>
                        </div>
                        <div class="divider"></div>
                        <div class="product-name">${l.Nama_Bahan}</div>
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
            <title>Cetak Label QR Item - ${selectedItem.value?.Nomor || ""}</title>
            <style>
                @page { size: 100mm 101mm; margin: 0; }
                body { margin: 0; padding: 0; line-height: 0; background: white; }
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
                    font-family: Arial, sans-serif; font-weight: bold; 
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
// 3. EXPORT HEADER EXCEL (SESUAI SISTEM MMT)
// ==========================================
const handleExportHeaderExcel = async () => {
    if (!items.value || items.value.length === 0) {
        toast.warning("Tidak ada data untuk di-export.");
        return;
    }

    try {
        const fileName = `Laporan_Header_Penerimaan_Bahan_${startDate.value}_to_${endDate.value}.xlsx`;
        const wb = new ExcelJS.Workbook();
        const ws = wb.addWorksheet("HeaderPenerimaan");

        // 1. Title
        const titleRow = ws.addRow([
            "LAPORAN DATA TRANSAKSI PENERIMAAN BAHAN (HEADER)",
        ]);
        titleRow.getCell(1).font = { bold: true, size: 14 };
        ws.mergeCells("A1:E1");

        // 2. Periode
        const periodeRow = ws.addRow([
            `Periode : ${startDate.value} s/d ${endDate.value}`,
        ]);
        periodeRow.getCell(1).font = { size: 10 };

        // 3. Blank row
        ws.addRow([]);

        // 4. Header Table (Sesuai kolom sistem MMT asli)
        const headerRow = ws.addRow([
            "NOMOR",
            "TANGGAL",
            "GUDANG",
            "SUPPLIER",
            "NO. PERMINTAAN",
        ]);

        headerRow.eachCell((cell) => {
            cell.fill = {
                type: "pattern",
                pattern: "solid",
                fgColor: { argb: "FFB3E5FC" },
            };
            cell.font = { bold: true, size: 10, color: { argb: "FF000000" } };
            cell.alignment = {
                horizontal: "center",
                vertical: "middle",
                wrapText: true,
            };
            cell.border = {
                top: { style: "thin" },
                bottom: { style: "thin" },
                left: { style: "thin" },
                right: { style: "thin" },
            };
        });

        // 5. Data Rows
        items.value.forEach((header: any) => {
            const dataRow = ws.addRow([
                header.Nomor || "-",
                header.Tanggal || "-",
                header.Gudang || "-",
                header.Supplier || "-",
                header.No_permintaan || "-",
            ]);

            dataRow.eachCell((cell, colNumber) => {
                cell.font = { size: 10 };
                cell.border = {
                    top: { style: "thin" },
                    bottom: { style: "thin" },
                    left: { style: "thin" },
                    right: { style: "thin" },
                };
                if (colNumber === 4) {
                    cell.alignment = { horizontal: "left", vertical: "middle" };
                } else {
                    cell.alignment = {
                        horizontal: "center",
                        vertical: "middle",
                    };
                }
            });
        });

        // Column widths sesuai MMT: [22, 15, 15, 30, 22]
        ws.columns = [
            { width: 22 },
            { width: 15 },
            { width: 15 },
            { width: 30 },
            { width: 22 },
        ];

        const buf = await wb.xlsx.writeBuffer();
        saveAs(
            new Blob([buf], {
                type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            }),
            fileName,
        );
        toast.success("Export Header Berhasil!");
    } catch (error) {
        console.error("Gagal export header:", error);
        toast.error("Gagal melakukan export header.");
    }
};

// ==========================================
// 4. EXPORT DETAIL EXCEL (SESUAI SISTEM MMT)
// ==========================================
const handleExportDetailExcel = async () => {
    if (!items.value || items.value.length === 0) {
        toast.warning("Tidak ada data untuk di-export.");
        return;
    }

    try {
        const fileName = `Laporan_Detail_Penerimaan_Bahan_${startDate.value}_to_${endDate.value}.xlsx`;
        const wb = new ExcelJS.Workbook();
        const ws = wb.addWorksheet("DetailPenerimaan");

        // 1. Title
        const titleRow = ws.addRow([
            "LAPORAN RINCIAN TRANSAKSI PENERIMAAN BAHAN",
        ]);
        titleRow.getCell(1).font = { bold: true, size: 14 };
        ws.mergeCells("A1:L1");

        // 2. Periode
        const periodeRow = ws.addRow([
            `Periode : ${startDate.value} s/d ${endDate.value}`,
        ]);
        periodeRow.getCell(1).font = { size: 10 };

        // 3. Blank row
        ws.addRow([]);

        // 4. Header Table (12 Kolom sesuai MMT)
        const headerRow = ws.addRow([
            "NOMOR PENERIMAAN",
            "TANGGAL",
            "GUDANG",
            "SUPPLIER",
            "NO. PERMINTAAN",
            "KODE BAHAN",
            "NAMA BAHAN",
            "UKURAN (PxL)",
            "JUMLAH PO",
            "JUMLAH TERIMA",
            "SATUAN",
            "RINCIAN BARCODE / SERIAL",
        ]);

        headerRow.eachCell((cell) => {
            cell.fill = {
                type: "pattern",
                pattern: "solid",
                fgColor: { argb: "FFB3E5FC" },
            };
            cell.font = { bold: true, size: 10, color: { argb: "FF000000" } };
            cell.alignment = {
                horizontal: "center",
                vertical: "middle",
                wrapText: true,
            };
            cell.border = {
                top: { style: "thin" },
                bottom: { style: "thin" },
                left: { style: "thin" },
                right: { style: "thin" },
            };
        });

        // 5. Data Rows
        let grandTotalPO = 0;
        let grandTotalTerima = 0;

        items.value.forEach((header: any) => {
            const details = header.Detail || [];
            if (details.length > 0) {
                details.forEach((dtl: any, index: number) => {
                    const poQty = Number(dtl.Jumlah_PO || 0);
                    const terimaQty = Number(dtl.Jumlah_Terima || 0);

                    grandTotalPO += poQty;
                    grandTotalTerima += terimaQty;

                    const rowValues = [
                        index === 0 ? header.Nomor : "",
                        index === 0 ? header.Tanggal || "-" : "",
                        index === 0 ? header.Gudang : "",
                        index === 0 ? header.Supplier || "-" : "",
                        index === 0 ? header.No_permintaan || "-" : "",
                        dtl.Kode || "-",
                        dtl.Nama_Bahan || "-",
                        dtl.Panjang && dtl.Lebar
                            ? `${dtl.Panjang} x ${dtl.Lebar}`
                            : "-",
                        poQty,
                        terimaQty,
                        dtl.Satuan || "-",
                        dtl.List_Barcode || "-",
                    ];

                    const dataRow = ws.addRow(rowValues);
                    dataRow.eachCell((cell, colNumber) => {
                        cell.font = { size: 10 };
                        cell.border = {
                            top: { style: "thin" },
                            bottom: { style: "thin" },
                            left: { style: "thin" },
                            right: { style: "thin" },
                        };

                        if (colNumber === 9 || colNumber === 10) {
                            cell.numFmt = "#,##0.00";
                            cell.alignment = {
                                horizontal: "right",
                                vertical: "middle",
                            };
                        } else if (
                            colNumber === 4 ||
                            colNumber === 7 ||
                            colNumber === 12
                        ) {
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
                const rowValues = [
                    header.Nomor,
                    header.Tanggal || "-",
                    header.Gudang,
                    header.Supplier || "-",
                    header.No_permintaan || "-",
                    "-",
                    "Tidak ada detail bahan",
                    "-",
                    0,
                    0,
                    "-",
                    "-",
                ];

                const dataRow = ws.addRow(rowValues);
                dataRow.eachCell((cell, colNumber) => {
                    cell.font = { size: 10 };
                    cell.border = {
                        top: { style: "thin" },
                        bottom: { style: "thin" },
                        left: { style: "thin" },
                        right: { style: "thin" },
                    };

                    if (colNumber === 9 || colNumber === 10) {
                        cell.numFmt = "#,##0.00";
                        cell.alignment = {
                            horizontal: "right",
                            vertical: "middle",
                        };
                    } else if (
                        colNumber === 4 ||
                        colNumber === 7 ||
                        colNumber === 12
                    ) {
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
            }
        });

        // 6. Footer Row (Grand Total)
        const footerValues = [
            "GRAND TOTAL",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            grandTotalPO,
            grandTotalTerima,
            "",
            "",
        ];
        const footerRow = ws.addRow(footerValues);
        const footerRowNumber = footerRow.number;

        // Merge Grand Total label: Cols 1 to 8 (A to H)
        ws.mergeCells(`A${footerRowNumber}:H${footerRowNumber}`);

        footerRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
            cell.fill = {
                type: "pattern",
                pattern: "solid",
                fgColor: { argb: "FFF0F4F8" },
            };
            cell.font = { bold: true, size: 10, color: { argb: "FF000000" } };
            cell.border = {
                top: { style: "thin" },
                bottom: { style: "thin" },
                left: { style: "thin" },
                right: { style: "thin" },
            };

            if (colNumber <= 8) {
                cell.alignment = { horizontal: "right", vertical: "middle" };
            } else if (colNumber === 9 || colNumber === 10) {
                cell.numFmt = "#,##0.00";
                cell.alignment = { horizontal: "right", vertical: "middle" };
            } else {
                cell.alignment = { horizontal: "center", vertical: "middle" };
            }
        });

        // Column widths sesuai MMT: [22, 15, 12, 25, 22, 15, 30, 15, 12, 12, 10, 45]
        ws.columns = [
            { width: 22 },
            { width: 15 },
            { width: 12 },
            { width: 25 },
            { width: 22 },
            { width: 15 },
            { width: 30 },
            { width: 15 },
            { width: 12 },
            { width: 12 },
            { width: 10 },
            { width: 45 },
        ];

        const buf = await wb.xlsx.writeBuffer();
        saveAs(
            new Blob([buf], {
                type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            }),
            fileName,
        );
        toast.success("Export Detail Berhasil!");
    } catch (error) {
        console.error("Gagal export detail:", error);
        toast.error("Gagal melakukan export detail.");
    }
};

const parseBarcodeList = (listBarcode?: string) => {
    if (!listBarcode) return [];
    return listBarcode
        .split(",")
        .map((b) => b.trim())
        .filter(Boolean);
};
</script>

<template>
    <BaseBrowse
        title="Penerimaan Bahan"
        menu-id="5533"
        item-value="Nomor"
        :icon="IconPackage"
        :headers="headers"
        :items="items || []"
        :is-loading="isLoading"
        v-model:selected="selected"
        show-expand
        v-model:expanded="expanded"
        @update:expanded="onUpdateExpanded"
        :can-insert="canInsert"
        :can-edit="canEdit"
        :can-delete="canDelete"
        :can-export="false"
        @refresh="fetchData"
        @add="handleNew"
        @edit="handleEdit"
        @delete="handleDelete"
    >
        <!-- Header Extra Actions (Sesuai MMT dengan Tema Manksi) -->
        <template #extra-actions>
            <v-btn
                size="small"
                variant="tonal"
                color="indigo"
                class="text-none font-weight-medium"
                :disabled="!selectedItem"
                @click="handlePrintSlip(selectedItem)"
            >
                <template #prepend>
                    <IconPrinter :size="15" />
                </template>
                Cetak Tanda Terima
            </v-btn>

            <v-btn
                size="small"
                variant="tonal"
                color="info"
                class="text-none font-weight-medium"
                :disabled="!selectedItem"
                :loading="isGeneratingQR"
                @click="handlePrintQR(selectedItem)"
            >
                <template #prepend>
                    <IconQrcode :size="15" />
                </template>
                Cetak QR Item
            </v-btn>

            <v-btn
                size="small"
                variant="tonal"
                color="success"
                class="text-none font-weight-medium"
                :disabled="!items || items.length === 0"
                @click="handleExportHeaderExcel"
            >
                <template #prepend>
                    <IconFileSpreadsheet :size="15" />
                </template>
                Export Header
            </v-btn>

            <v-btn
                size="small"
                variant="tonal"
                color="deep-purple-darken-1"
                class="text-none font-weight-medium"
                :disabled="!items || items.length === 0"
                @click="handleExportDetailExcel"
            >
                <template #prepend>
                    <IconDownload :size="15" />
                </template>
                Export Detail
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

        <!-- Sub-Tabel Expandable Rincian Bahan & Barcode (Sesuai Referensi MMT) -->
        <template #detail="{ item }">
            <div class="expand-detail-container pa-3">
                <div class="d-flex align-center justify-space-between mb-2">
                    <div class="text-caption font-weight-bold text-indigo">
                        Rincian Item Bahan untuk BPB: {{ getItemNomor(item) }}
                    </div>
                    <v-btn
                        size="x-small"
                        color="info"
                        variant="tonal"
                        class="text-none"
                        @click="handlePrintQR(item)"
                    >
                        <template #prepend>
                            <IconQrcode :size="13" />
                        </template>
                        Cetak QR untuk Transaksi Ini
                    </v-btn>
                </div>

                <div v-if="loadingDetails.has(getItemNomor(item))" class="d-flex align-center py-3 text-caption text-grey">
                    <v-progress-circular indeterminate size="16" width="2" color="primary" class="mr-2" />
                    Memuat rincian item bahan...
                </div>

                <div
                    v-else-if="!(getItemDetails(item) && getItemDetails(item).length)"
                    class="text-caption text-grey py-2"
                >
                    Tidak ada rincian bahan pada transaksi ini.
                </div>

                <v-table v-else density="compact" class="sub-detail-table border rounded">
                    <thead>
                        <tr>
                            <th style="width: 40px" class="text-center">No</th>
                            <th style="width: 140px">Kode Bahan</th>
                            <th>Nama Bahan</th>
                            <th style="width: 100px" class="text-center">Ukuran</th>
                            <th style="width: 90px" class="text-end">Qty PO</th>
                            <th style="width: 90px" class="text-end font-weight-bold text-primary">Qty Terima</th>
                            <th style="width: 70px" class="text-center">Satuan</th>
                            <th>Rincian Barcode / Serial</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-for="(d, dIdx) in getItemDetails(item)" :key="dIdx">
                            <td class="text-center">{{ Number(dIdx) + 1 }}</td>
                            <td class="font-weight-medium">{{ d.Kode || d.SKU || d.kode }}</td>
                            <td>{{ d.Nama_Bahan || d.namaBahan || d.nama }}</td>
                            <td class="text-center">{{ (d.Panjang || d.panjang) && (d.Lebar || d.lebar) ? `${d.Panjang || d.panjang} x ${d.Lebar || d.lebar}` : '-' }}</td>
                            <td class="text-end text-grey-darken-1">{{ d.Jumlah_PO ?? d.QTY ?? d.qtyPO ?? 0 }}</td>
                            <td class="text-end font-weight-bold text-primary">{{ d.Jumlah_Terima ?? d.QTY_Rec ?? d.qtyTerima ?? 0 }}</td>
                            <td class="text-center">{{ d.Satuan || d.satuan || 'ROLL' }}</td>
                            <td>
                                <div v-if="d.List_Barcode" class="d-flex flex-wrap gap-1 py-1">
                                    <v-chip
                                        v-for="(bc, bcIdx) in parseBarcodeList(d.List_Barcode)"
                                        :key="bcIdx"
                                        size="x-small"
                                        variant="outlined"
                                        color="indigo"
                                        class="font-weight-bold"
                                    >
                                        <IconBarcode :size="12" class="mr-1" />
                                        {{ bc }}
                                    </v-chip>
                                </div>
                                <span v-else class="text-grey text-caption">-</span>
                            </td>
                        </tr>
                    </tbody>
                </v-table>
            </div>
        </template>
    </BaseBrowse>

    <!-- Dialog Pengaturan Cetak Label QR (Tema Manksi Modern - Fullscreen / Modal Besar Sesuai MMT) -->
    <v-dialog v-model="showQRDialog" max-width="1100" scrollable>
        <v-card class="qr-dialog-card">
            <!-- Header Dialog -->
            <v-card-title class="dialog-header py-3 px-4 border-b">
                <div class="d-flex align-center">
                    <v-avatar
                        color="info"
                        variant="tonal"
                        size="36"
                        class="mr-3"
                    >
                        <IconQrcode :size="20" />
                    </v-avatar>
                    <div>
                        <div class="text-subtitle-1 font-weight-bold">
                            Pengaturan Cetak Label QR Item
                        </div>
                        <div class="text-caption text-medium-emphasis">
                            Nomor BPB:
                            <strong>{{ selectedItem?.Nomor }}</strong> &bull;
                            Total Terpilih:
                            <strong
                                >{{
                                    selectedItemsToPrint.length *
                                    (printCopies || 1)
                                }}
                                Label</strong
                            >
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
                                    value="xprinter"
                                    class="flex-grow-1 text-none font-weight-medium"
                                    >XPrinter</v-btn
                                >
                                <v-btn
                                    value="postek"
                                    class="flex-grow-1 text-none font-weight-medium"
                                    >Postek</v-btn
                                >
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
                                Total: {{ selectedItemsToPrint.length * (printCopies || 1) }} Label
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

                <!-- Preview Grid Kartu Label QR (Sesuai Ukuran 67mm x 45mm MMT) -->
                <div class="preview-scroll-area">
                    <div class="label-grid">
                        <div
                            v-for="(item, idx) in itemsToPrint"
                            :key="idx"
                            class="label-card-item"
                            :class="{
                                'card-inactive':
                                    !selectedItemsToPrint.includes(idx),
                            }"
                            @click="
                                () => {
                                    const pos =
                                        selectedItemsToPrint.indexOf(idx);
                                    if (pos > -1)
                                        selectedItemsToPrint.splice(pos, 1);
                                    else selectedItemsToPrint.push(idx);
                                }
                            "
                        >
                            <div
                                class="d-flex align-center justify-space-between pb-1 mb-2 border-b"
                            >
                                <v-checkbox
                                    v-model="selectedItemsToPrint"
                                    :value="idx"
                                    density="compact"
                                    color="primary"
                                    hide-details
                                    @click.stop
                                >
                                    <template #label>
                                        <span
                                            class="text-caption font-weight-bold"
                                            >Cetak Label #{{ idx + 1 }}</span
                                        >
                                    </template>
                                </v-checkbox>
                                <span class="badge-dimensi"
                                    >{{ item.Panjang }} x {{ item.Lebar }}</span
                                >
                            </div>

                            <!-- Label Box Visual 67mm x 45mm Legacy MMT -->
                            <div class="label-box elevation-2 mx-auto">
                                <div class="border-inner">
                                    <div class="top-row">
                                        <img
                                            :src="item.qrImage"
                                            alt="QR"
                                            class="qr-img"
                                        />
                                        <div class="spec-info">
                                            <div class="qr-text">
                                                {{ item.qrValue }}
                                            </div>
                                            <div class="dimens-text">
                                                {{ item.Panjang }}x{{ item.Lebar }}
                                            </div>
                                        </div>
                                    </div>
                                    <div class="divider"></div>
                                    <div class="product-name">
                                        {{ item.Nama_Bahan }}
                                    </div>
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

/* Dialog & Label Preview Styles */
.qr-dialog-card {
    border-radius: 8px;
    overflow: hidden;
}
.dialog-header {
    background: #ffffff;
}
.setting-label {
    font-size: 11px;
    font-weight: 600;
    color: #424242;
    text-transform: uppercase;
}
.preview-scroll-area {
    max-height: 520px;
    overflow-y: auto;
    padding-right: 4px;
}
.label-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(290px, 1fr));
    gap: 16px;
    justify-items: center;
}
.label-card-item {
    background: #ffffff;
    border: 1px solid #e0e0e0;
    border-radius: 8px;
    padding: 10px;
    cursor: pointer;
    transition: all 0.15s ease-in-out;
    width: 100%;
    max-width: 320px;
}
.label-card-item:hover {
    border-color: #1976d2;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}
.card-inactive {
    opacity: 0.45;
    filter: grayscale(0.8);
    background: #fafafa;
}
.badge-dimensi {
    font-size: 10px;
    font-weight: 700;
    color: #1565c0;
    background: #e3f2fd;
    padding: 2px 6px;
    border-radius: 4px;
}

/* ── Label Box Format Legacy MMT (67mm x 45mm) ── */
.label-box {
    width: 67mm;
    height: 45mm;
    background-color: white;
    padding: 1mm;
    box-sizing: border-box;
    cursor: pointer;
    border-radius: 4px;
}
.border-inner {
    border: 1.5pt solid black;
    height: 100%;
    display: flex;
    flex-direction: column;
    padding: 2mm;
    box-sizing: border-box;
    font-family: Arial, sans-serif;
}
.top-row {
    display: flex;
    gap: 8px;
    align-items: flex-start;
}
.qr-img {
    width: 1.5cm;
    height: 1.5cm;
    flex-shrink: 0;
}
.spec-info {
    display: flex;
    flex-direction: column;
    justify-content: center;
    overflow: hidden;
}
.qr-text {
    font-weight: bold;
    font-size: 8pt;
    line-height: 1.1;
    word-break: break-all;
    color: #000;
}
.dimens-text {
    font-size: 9pt;
    font-weight: bold;
    margin-top: 2px;
    color: #000;
}
.divider {
    border-top: 1.5pt dashed black;
    margin: 4px 0;
}
.product-name {
    font-size: 10pt;
    font-weight: bold;
    text-align: center;
    flex-grow: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    line-height: 1.2;
    text-transform: uppercase;
    word-break: break-word;
    color: #000;
}
</style>
