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

interface MmtDetail {
    No: number | string;
    SPK: string;
    Jenis: string;
    Keterangan: string;
    Satuan: string;
    QTY: number | string;
    Is_Acc?: string;
}

interface MmtPrintData {
    NoPermintaan: string;
    Tanggal: string;
    Kepada: string;
    Priority: string;
    Keterangan: string;
    Details: MmtDetail[];
    Dibuat: string;
    Diketahui: string;
    Disetujui: string;
}

interface PaperSizeOption {
    label: string;
    widthMm: number;
    heightMm: number;
}

const route = useRoute();
const printData = ref<MmtPrintData | null>(null);
const isLoading = ref(true);

// =========================================================
// PENGATURAN KERTAS & CETAK IDENTIK SISTEM MMT
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
const selectedMargin = ref<number>(8); // Margin standar aman 8mm

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
    return printData.value?.NoPermintaan || (route.params.nomor as string) || "-";
});

const filteredDetails = computed(() => {
    if (!printData.value || !Array.isArray(printData.value.Details)) {
        return [];
    }
    return printData.value.Details
        .filter((item) => item.Is_Acc !== "N")
        .map((item, index) => ({
            ...item,
            No: index + 1,
        }));
});

const fetchPrintData = async (nomor: string) => {
    isLoading.value = true;
    try {
        const response = await api.get(
            `/mmt/bahan-baku-produksi/permintaan-bahan/print/${encodeURIComponent(nomor)}`
        );
        printData.value = response.data?.data || response.data;
        document.title = `Print Permintaan Bahan - ${nomor}`;

        await nextTick();
        setTimeout(() => {
            window.print();
        }, 600);
    } catch (error) {
        console.error("Gagal memuat data cetak permintaan:", error);
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
    <!-- Dynamic @page style untuk menyesuaikan ukuran kertas dan margin secara presisi -->
    <component :is="'style'">
        @media print {
            @page {
                size: {{ currentDimensions.widthMm }}mm {{ currentDimensions.heightMm }}mm;
                margin: {{ selectedMargin }}mm;
            }
        }
    </component>

    <!-- Floating Action Toolbar (Hanya Tampil di Layar Monitor) -->
    <div class="print-toolbar d-print-none">
        <div class="toolbar-content">
            <div class="toolbar-left">
                <span class="toolbar-title">
                    Permintaan Bahan: <strong>{{ displayNomor }}</strong>
                </span>
            </div>

            <!-- Kontrol Pilihan Kertas, Orientasi & Margin -->
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

    <!-- Loading State -->
    <div v-if="isLoading" class="loading-state d-print-none">
        <div class="spinner"></div>
        <p>Memuat data cetak Permintaan Bahan...</p>
    </div>

    <!-- Area Kertas Cetak (WYSIWYG Sesuai Ukuran Kertas Pilihan) -->
    <main v-else-if="printData" class="screen-container">
        <div class="screen-page" :style="screenPageStyle">
            <h2 class="form-title">FORM PURCHASE REQUEST (PR) / PERMINTAAN BAHAN (MMT)</h2>

            <div class="header-info">
                <div class="left-column">
                    <div class="info-row">
                        <span class="label">NO. PERMINTAAN</span>
                        <span class="value">: {{ displayNomor }}</span>
                    </div>
                    <div class="info-row">
                        <span class="label">TANGGAL</span>
                        <span class="value">: {{ printData.Tanggal }}</span>
                    </div>
                    <div class="info-row">
                        <span class="label">DITUJUKAN KE</span>
                        <span class="value">: {{ printData.Kepada }}</span>
                    </div>
                </div>

                <div class="right-column">
                    <div class="info-row">
                        <span class="label">PRIORITY</span>
                        <span class="value">: {{ printData.Priority }}</span>
                    </div>
                    <div class="info-row">
                        <span class="label">KETERANGAN</span>
                        <span class="value">: {{ printData.Keterangan || '-' }}</span>
                    </div>
                </div>
            </div>

            <div class="items-table-wrapper">
                <table class="items-table">
                    <thead>
                        <tr>
                            <th style="width: 5%">NO</th>
                            <th style="width: 18%">NO SPK</th>
                            <th style="width: 40%">NAMA BAHAN / BARANG</th>
                            <th style="width: 10%" class="text-right">QTY</th>
                            <th style="width: 10%" class="text-center">SATUAN</th>
                            <th style="width: 17%">KETERANGAN</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr
                            v-for="(item, index) in filteredDetails"
                            :key="'item-' + index"
                        >
                            <td class="text-center">{{ item.No }}</td>
                            <td class="text-center">{{ item.SPK || '-' }}</td>
                            <td>{{ item.Jenis }}</td>
                            <td class="text-right font-weight-bold">{{ item.QTY }}</td>
                            <td class="text-center">{{ item.Satuan }}</td>
                            <td>{{ item.Keterangan || '-' }}</td>
                        </tr>
                        <tr
                            v-for="i in Math.max(0, 6 - filteredDetails.length)"
                            :key="'empty-' + i"
                            class="empty-row"
                        >
                            <td>&nbsp;</td>
                            <td></td>
                            <td></td>
                            <td></td>
                            <td></td>
                            <td></td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <div class="signature-footer">
                <div class="signature-box">
                    <div class="signature-label">Pemohon,</div>
                    <div class="spacer"></div>
                    <div class="signer-name">{{ printData.Dibuat }}</div>
                    <div class="signer-role">Staff / User</div>
                </div>

                <div class="signature-box">
                    <div class="signature-label">Mengetahui,</div>
                    <div class="spacer"></div>
                    <div class="signer-name">{{ printData.Diketahui }}</div>
                    <div class="signer-role">SPV Bagian</div>
                </div>

                <div class="signature-box">
                    <div class="signature-label">Disetujui,</div>
                    <div class="spacer"></div>
                    <div class="signer-name">{{ printData.Disetujui }}</div>
                    <div class="signer-role">Manager</div>
                </div>
            </div>
        </div>
    </main>

    <!-- State Data Tidak Ditemukan -->
    <div v-else class="error-screen d-print-none">
        <p>Data Permintaan Bahan tidak ditemukan atau gagal dimuat.</p>
        <button class="btn btn-secondary mt-2" @click="handleClose">Tutup Halaman</button>
    </div>
</template>

<style scoped>
/* =========================================================
   BASE & RESET
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

/* Kertas Ukuran Adaptif di Layar */
.screen-page {
    background: #ffffff;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
    box-sizing: border-box;
    transition: all 0.2s ease;
    display: flex;
    flex-direction: column;
}

/* =========================================================
   DOKUMEN CONTENT STYLING (IDENTIK MMT)
========================================================= */
.form-title {
    text-align: center;
    font-size: 14pt;
    font-weight: bold;
    text-decoration: underline;
    margin-top: 0;
    margin-bottom: 5mm;
}

.header-info {
    display: flex;
    justify-content: space-between;
    margin-bottom: 4mm;
    font-size: 9.5pt;
    line-height: 1.4;
}

.left-column,
.right-column {
    width: 48%;
}

.info-row {
    display: flex;
    margin-bottom: 3px;
}

.label {
    width: 120px;
    font-weight: bold;
    flex-shrink: 0;
}

.value {
    flex: 1;
}

.items-table-wrapper {
    margin-bottom: 6mm;
    flex: 1;
}

.items-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 9pt;
}

.items-table th,
.items-table td {
    border: 1px solid #000;
    padding: 4px 6px;
}

.items-table th {
    background-color: #f1f5f9;
    font-weight: bold;
    text-align: center;
}

.empty-row td {
    height: 22px;
}

.text-center {
    text-align: center;
}

.text-right {
    text-align: right;
}

.font-weight-bold {
    font-weight: bold;
}

.signature-footer {
    display: flex;
    justify-content: space-between;
    padding: 0 20px;
    margin-top: auto;
    page-break-inside: avoid;
    break-inside: avoid;
}

.signature-box {
    display: flex;
    flex-direction: column;
    align-items: center;
    width: 160px;
    font-size: 9pt;
    text-align: center;
}

.signature-label {
    font-weight: bold;
    margin-bottom: 6px;
}

.spacer {
    height: 55px;
}

.signer-name {
    font-weight: bold;
    text-decoration: underline;
}

.signer-role {
    font-size: 8.5pt;
    color: #334155;
    margin-top: 2px;
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

.mt-2 {
    margin-top: 8px;
}

/* =========================================================
   PRINT MEDIA RULES
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

    .header-info,
    .items-table,
    .signature-footer {
        width: 100% !important;
        max-width: 100% !important;
        box-sizing: border-box !important;
        page-break-inside: avoid;
        break-inside: avoid;
    }

    .items-table {
        table-layout: fixed !important;
    }

    .items-table tbody tr {
        page-break-inside: avoid;
        break-inside: avoid;
    }
}
</style>
