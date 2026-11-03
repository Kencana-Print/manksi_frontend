<script setup lang="ts">
import { ref, onMounted, nextTick, computed } from "vue";
import { useRoute } from "vue-router";
import api from "@/services/api";
import {
    IconPrinter,
    IconX,
    IconFileText,
    IconLayoutGrid,
    IconSettings,
} from "@tabler/icons-vue";

interface PenerimaanDetail {
    No?: number | string;
    Kode: string;
    Nama?: string;
    Nama_Barang?: string;
    Satuan: string;
    QtyPO?: number | string;
    Qty_PO?: number | string;
    QtyTerima?: number | string;
    Qty_Terima?: number | string;
    Keterangan?: string;
}

interface PenerimaanPrintData {
    Nomor?: string;
    NoPenerimaan?: string;
    NoPO?: string;
    Supplier?: string;
    Gudang?: string;
    Tanggal?: string;
    Keterangan?: string;
    Details: PenerimaanDetail[];
    Dibuat?: string;
    Diketahui?: string;
    Disetujui?: string;
}

interface PaperSizeOption {
    label: string;
    widthMm: number;
    heightMm: number;
}

const route = useRoute();
const printData = ref<PenerimaanPrintData | null>(null);
const isLoading = ref(true);

// =========================================================
// PENGATURAN KERTAS & CETAK
// =========================================================
const paperSizes: Record<string, PaperSizeOption> = {
    a4: { label: "A4 (210 × 297 mm)", widthMm: 210, heightMm: 297 },
    f4: { label: "F4 / Folio (215 × 330 mm)", widthMm: 215, heightMm: 330 },
    letter: { label: "Letter (216 × 279 mm)", widthMm: 215.9, heightMm: 279.4 },
    legal: { label: "Legal (216 × 356 mm)", widthMm: 215.9, heightMm: 355.6 },
    a5: { label: "A5 (148 × 210 mm)", widthMm: 148, heightMm: 210 },
};

const selectedPaper = ref<string>("a4");
const selectedOrientation = ref<"portrait" | "landscape">("portrait");
const selectedMargin = ref<number>(8); // Margin aman 8mm agar tidak terpotong printer

const currentDimensions = computed(() => {
    const paper = paperSizes[selectedPaper.value] || paperSizes.a4;
    if (selectedOrientation.value === "landscape") {
        return {
            widthMm: paper.heightMm,
            heightMm: paper.widthMm,
        };
    }
    return {
        widthMm: paper.widthMm,
        heightMm: paper.heightMm,
    };
});

const screenPageStyle = computed(() => ({
    width: `${currentDimensions.value.widthMm}mm`,
    minHeight: `${currentDimensions.value.heightMm}mm`,
    padding: `${selectedMargin.value}mm`,
}));

const displayNomor = computed(() => {
    return (
        printData.value?.Nomor ||
        printData.value?.NoPenerimaan ||
        (route.params.nomor as string) ||
        "-"
    );
});

const numberedDetails = computed(() => {
    if (!printData.value || !Array.isArray(printData.value.Details)) {
        return [];
    }
    return printData.value.Details.map((item, index) => ({
        ...item,
        No: index + 1,
        NamaBarang: item.Nama || item.Nama_Barang || "-",
        QtyPOVal:
            item.QtyPO !== undefined
                ? item.QtyPO
                : item.Qty_PO !== undefined
                  ? item.Qty_PO
                  : 0,
        QtyTerimaVal:
            item.QtyTerima !== undefined
                ? item.QtyTerima
                : item.Qty_Terima !== undefined
                  ? item.Qty_Terima
                  : 0,
    }));
});

const fetchPrintData = async (nomor: string) => {
    isLoading.value = true;
    try {
        const response = await api.get(
            `/mmt/bahan-baku-produksi/penerimaan-bahan/print/${encodeURIComponent(nomor)}`,
        );
        const data = response.data?.data || response.data;
        printData.value = data;
        document.title = `Bukti Penerimaan - ${nomor}`;

        await nextTick();
        // Beri sedikit jeda agar CSS & dom rendering tuntas
        setTimeout(() => {
            window.print();
        }, 600);
    } catch (error) {
        console.error("Gagal memuat data cetak penerimaan:", error);
    } finally {
        isLoading.value = false;
    }
};

const handlePrint = () => {
    window.print();
};

const handleClose = () => {
    window.close();
};

onMounted(() => {
    const nomor = route.params.nomor as string;
    if (nomor) {
        fetchPrintData(nomor);
    } else {
        isLoading.value = false;
    }
});
</script>

<template>
    <!-- Dynamic @page style untuk menyesuaikan ukuran kertas dan margin secara tepat saat window.print() -->
    <component :is="'style'">
        @media print {
            @page {
                size: {{ currentDimensions.widthMm }}mm {{ currentDimensions.heightMm }}mm;
                margin: {{ selectedMargin }}mm;
            }
        }
    </component>

    <!-- Floating Toolbar (Hanya Tampil di Layar, Tersembunyi saat Dicetak) -->
    <div class="print-toolbar d-print-none">
        <div class="toolbar-content">
            <div class="toolbar-left">
                <span class="toolbar-title">
                    Bukti Penerimaan: <strong>{{ displayNomor }}</strong>
                </span>
            </div>

            <!-- Toolbar Controls: Pilihan Ukuran Kertas & Margin -->
            <div class="toolbar-center">
                <div class="control-group">
                    <label class="control-label">
                        <IconFileText :size="14" />
                        <span>Kertas:</span>
                    </label>
                    <select v-model="selectedPaper" class="control-select">
                        <option
                            v-for="(opt, key) in paperSizes"
                            :key="key"
                            :value="key"
                        >
                            {{ opt.label }}
                        </option>
                    </select>
                </div>

                <div class="control-group">
                    <label class="control-label">
                        <IconLayoutGrid :size="14" />
                        <span>Orientasi:</span>
                    </label>
                    <select v-model="selectedOrientation" class="control-select">
                        <option value="portrait">Tegak (Portrait)</option>
                        <option value="landscape">Mendatar (Landscape)</option>
                    </select>
                </div>

                <div class="control-group">
                    <label class="control-label">
                        <IconSettings :size="14" />
                        <span>Margin:</span>
                    </label>
                    <select v-model.number="selectedMargin" class="control-select">
                        <option :value="5">Sempit (5 mm)</option>
                        <option :value="8">Aman / Pas (8 mm)</option>
                        <option :value="10">Standar (10 mm)</option>
                        <option :value="12">Lebar (12 mm)</option>
                    </select>
                </div>
            </div>

            <div class="toolbar-actions">
                <button class="btn btn-primary" @click="handlePrint" title="Cetak Dokumen">
                    <IconPrinter :size="16" />
                    <span>Cetak Dokumen</span>
                </button>
                <button class="btn btn-secondary" @click="handleClose" title="Tutup Halaman">
                    <IconX :size="16" />
                    <span>Tutup</span>
                </button>
            </div>
        </div>
    </div>

    <!-- Loading Screen -->
    <div v-if="isLoading" class="loading-state d-print-none">
        <div class="spinner"></div>
        <p>Memuat data cetak penerimaan bahan...</p>
    </div>

    <!-- Halaman Dokumen Cetak -->
    <main v-else-if="printData" class="screen-container">
        <div class="screen-page" :style="screenPageStyle">
            <!-- =============================================
                 HEADER SESUAI SISTEM MMT
            ============================================== -->
            <div class="header">
                <div class="company">
                    <div class="company-name">
                        BUKTI PENERIMAAN BARANG (MMT)
                    </div>
                    <div class="warehouse">
                        Gudang: <strong>{{ printData.Gudang || "-" }}</strong>
                    </div>
                </div>

                <div class="document-info">
                    <table>
                        <tbody>
                            <tr>
                                <td class="label">Nomor</td>
                                <td class="value">: {{ displayNomor }}</td>
                            </tr>
                            <tr>
                                <td class="label">Tanggal</td>
                                <td class="value">: {{ printData.Tanggal || "-" }}</td>
                            </tr>
                            <tr>
                                <td class="label">Supplier</td>
                                <td class="value">: {{ printData.Supplier || "-" }}</td>
                            </tr>
                            <tr>
                                <td class="label">No. PO</td>
                                <td class="value">: {{ printData.NoPO || "-" }}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>

            <!-- =============================================
                 TABEL DETAIL BARANG (RESPONSIF PERSENTASE 100%)
            ============================================== -->
            <table class="detail-table">
                <colgroup>
                    <col style="width: 4.5%" />
                    <col style="width: 15.5%" />
                    <col style="width: 30%" />
                    <col style="width: 8%" />
                    <col style="width: 10%" />
                    <col style="width: 11%" />
                    <col style="width: 21%" />
                </colgroup>

                <thead>
                    <tr>
                        <th>No</th>
                        <th>Kode Barang</th>
                        <th>Nama Barang</th>
                        <th>Satuan</th>
                        <th>Qty PO</th>
                        <th>Qty Terima</th>
                        <th>Keterangan</th>
                    </tr>
                </thead>

                <tbody>
                    <tr v-if="numberedDetails.length === 0">
                        <td colspan="7" class="empty-row">
                            Tidak ada detail barang.
                        </td>
                    </tr>
                    <tr
                        v-for="item in numberedDetails"
                        :key="`item-${item.No}-${item.Kode}`"
                    >
                        <td class="text-center">{{ item.No }}</td>
                        <td class="text-left font-mono">{{ item.Kode || "-" }}</td>
                        <td class="text-left">{{ item.NamaBarang }}</td>
                        <td class="text-center">{{ item.Satuan || "-" }}</td>
                        <td class="text-right">{{ item.QtyPOVal }}</td>
                        <td class="text-right font-bold">{{ item.QtyTerimaVal }}</td>
                        <td class="text-left">{{ item.Keterangan || "-" }}</td>
                    </tr>
                    <!-- Minimum rows filler agar proporsional -->
                    <tr
                        v-for="i in Math.max(0, 5 - numberedDetails.length)"
                        :key="`blank-${i}`"
                        class="blank-row"
                    >
                        <td>&nbsp;</td>
                        <td></td>
                        <td></td>
                        <td></td>
                        <td></td>
                        <td></td>
                        <td></td>
                    </tr>
                </tbody>
            </table>

            <!-- =============================================
                 CATATAN / NOTES
            ============================================== -->
            <div v-if="printData.Keterangan" class="notes-section">
                <span class="notes-title">Catatan:</span>
                <span>{{ printData.Keterangan }}</span>
            </div>

            <!-- =============================================
                 TANDA TANGAN SESUAI SISTEM MMT
            ============================================== -->
            <div class="signature-section">
                <div class="signature-box">
                    <div class="signature-title">Pengirim (Supplier),</div>
                    <div class="signature-space"></div>
                    <div class="signature-name">( ........................... )</div>
                </div>

                <div class="signature-box">
                    <div class="signature-title">Penerima (Gudang),</div>
                    <div class="signature-space"></div>
                    <div class="signature-name">
                        ( {{ printData.Dibuat || "..........................." }} )
                    </div>
                </div>

                <div class="signature-box">
                    <div class="signature-title">Mengetahui,</div>
                    <div class="signature-space"></div>
                    <div class="signature-name">
                        ( {{ printData.Diketahui || "..........................." }} )
                    </div>
                </div>
            </div>
        </div>
    </main>

    <!-- Error State -->
    <div v-else class="error-screen d-print-none">
        <p>Data bukti penerimaan tidak ditemukan.</p>
        <button class="btn btn-secondary mt-2" @click="handleClose">Tutup Halaman</button>
    </div>
</template>

<style scoped>
/* =========================================================
   RESET & BASE FONTS
========================================================= */
* {
    box-sizing: border-box;
}

/* =========================================================
   FLOATING ACTION TOOLBAR (SCREEN ONLY)
========================================================= */
.print-toolbar {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    height: 52px;
    background: #1e293b;
    color: #ffffff;
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 9999;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
    padding: 0 16px;
}
.toolbar-content {
    width: 100%;
    max-width: 1200px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
}
.toolbar-left {
    display: flex;
    align-items: center;
    min-width: 0;
}
.toolbar-title {
    font-size: 13px;
    font-family: inherit;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}
.toolbar-center {
    display: flex;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
}
.control-group {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 12px;
}
.control-label {
    display: flex;
    align-items: center;
    gap: 4px;
    color: #94a3b8;
    white-space: nowrap;
}
.control-select {
    background: #334155;
    color: #f8fafc;
    border: 1px solid #475569;
    border-radius: 4px;
    padding: 4px 8px;
    font-size: 12px;
    outline: none;
    cursor: pointer;
    transition: border-color 0.15s;
}
.control-select:focus {
    border-color: #38bdf8;
}
.toolbar-actions {
    display: flex;
    gap: 8px;
    flex-shrink: 0;
}
.btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 6px 14px;
    border-radius: 5px;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    border: none;
    transition: all 0.15s ease-in-out;
    font-family: inherit;
}
.btn-primary {
    background: #0284c7;
    color: #ffffff;
}
.btn-primary:hover {
    background: #0369a1;
}
.btn-secondary {
    background: #475569;
    color: #ffffff;
}
.btn-secondary:hover {
    background: #334155;
}

/* =========================================================
   SCREEN PREVIEW CONTAINER
========================================================= */
.screen-container {
    min-height: 100vh;
    padding: 72px 20px 40px;
    background: #64748b;
    display: flex;
    justify-content: center;
    font-family: Arial, Helvetica, sans-serif;
    color: #000;
    overflow-x: auto;
}

/* Kertas Ukuran Adaptif */
.screen-page {
    background: #ffffff;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
    box-sizing: border-box;
    transition: all 0.2s ease;
    display: flex;
    flex-direction: column;
}

/* =========================================================
   HEADER STYLING (IDENTIK MMT)
========================================================= */
.header {
    width: 100%;
    display: flex;
    flex-direction: row;
    justify-content: space-between;
    align-items: flex-start;
    gap: 16px;
    padding-bottom: 3.5mm;
    border-bottom: 2px solid #000;
    margin-bottom: 5mm;
    box-sizing: border-box;
}

.company {
    flex: 1;
    min-width: 0;
}

.company-name {
    font-size: 15pt;
    font-weight: 700;
    line-height: 1.15;
    letter-spacing: -0.3px;
}

.warehouse {
    margin-top: 2mm;
    font-size: 9pt;
    line-height: 1.2;
}

.document-info {
    flex: 0 0 auto;
    width: 74mm;
    max-width: 100%;
}

.document-info table {
    width: 100%;
    border-collapse: collapse;
}

.document-info td {
    border: none;
    padding: 0.8mm 0;
    font-size: 8.5pt;
    line-height: 1.25;
    vertical-align: top;
}

.document-info .label {
    width: 22mm;
    font-weight: 700;
    white-space: nowrap;
}

.document-info .value {
    word-break: break-word;
    overflow-wrap: anywhere;
}

/* =========================================================
   DETAIL TABLE (RESPONSIF PERSENTASE 100%, TIDAK AKAN TERPOTONG)
========================================================= */
.detail-table {
    width: 100%;
    margin: 3mm 0 0 0;
    border-collapse: collapse;
    table-layout: fixed;
    box-sizing: border-box;
}

.detail-table thead {
    display: table-header-group;
}

.detail-table th {
    padding: 2.2mm 1.2mm;
    border: 1px solid #000;
    background: #eeeeee;
    color: #000;
    font-size: 8pt;
    font-weight: 700;
    line-height: 1.15;
    text-align: center;
    vertical-align: middle;
    word-break: break-word;
    overflow-wrap: anywhere;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
}

.detail-table td {
    padding: 1.8mm 1.2mm;
    border: 1px solid #000;
    background: #fff;
    color: #000;
    font-size: 8pt;
    line-height: 1.2;
    vertical-align: middle;
    word-break: break-word;
    overflow-wrap: anywhere;
}

.text-center { text-align: center; }
.text-left { text-align: left; }
.text-right { text-align: right; }
.font-bold { font-weight: 700; }
.font-mono { font-family: monospace; font-size: 8pt; }

.empty-row {
    padding: 6mm !important;
    text-align: center !important;
    color: #666;
}

.blank-row td {
    height: 5.5mm;
}

/* =========================================================
   NOTES SECTION
========================================================= */
.notes-section {
    width: 100%;
    margin-top: 4mm;
    padding: 2.5mm;
    border: 1px dashed #777;
    font-size: 8pt;
    line-height: 1.3;
    box-sizing: border-box;
}
.notes-title {
    font-weight: 700;
    margin-right: 2mm;
}

/* =========================================================
   SIGNATURE SECTION (IDENTIK MMT)
========================================================= */
.signature-section {
    width: 100%;
    display: flex;
    flex-direction: row;
    justify-content: space-between;
    align-items: flex-start;
    margin-top: 10mm;
    page-break-inside: avoid;
    break-inside: avoid;
    box-sizing: border-box;
}

.signature-box {
    flex: 1;
    max-width: 30%;
    text-align: center;
    font-size: 8.5pt;
}

.signature-title {
    line-height: 1.2;
    font-weight: 600;
}

.signature-space {
    height: 18mm;
}

.signature-name {
    line-height: 1.2;
    white-space: nowrap;
}

/* =========================================================
   LOADING & ERROR STATES
========================================================= */
.loading-state,
.error-screen {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    background: #f8fafc;
    font-family: Arial, sans-serif;
    color: #475569;
}
.spinner {
    width: 32px;
    height: 32px;
    border: 3px solid #cbd5e1;
    border-top-color: #0284c7;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
    margin-bottom: 12px;
}
@keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
}

/* =========================================================
   PRINT MEDIA RULES (FLEKSIBEL MENGIKUTI UKURAN KERTAS & TIDAK TERPOTONG)
========================================================= */
@media print {
    .d-print-none {
        display: none !important;
    }

    html, body {
        width: 100% !important;
        height: auto !important;
        margin: 0 !important;
        padding: 0 !important;
        background: #fff !important;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
    }

    .screen-container {
        padding: 0 !important;
        margin: 0 !important;
        width: 100% !important;
        max-width: 100% !important;
        background: #fff !important;
        min-height: auto !important;
        display: block !important;
    }

    .screen-page {
        width: 100% !important;
        max-width: 100% !important;
        min-height: auto !important;
        margin: 0 !important;
        padding: 0 !important;
        box-shadow: none !important;
        border: none !important;
    }

    .header,
    .detail-table,
    .notes-section,
    .signature-section {
        width: 100% !important;
        max-width: 100% !important;
        box-sizing: border-box !important;
        page-break-inside: avoid;
        break-inside: avoid;
    }

    .detail-table {
        table-layout: fixed !important;
    }

    .detail-table tbody tr {
        page-break-inside: avoid;
        break-inside: avoid;
    }
}
</style>
