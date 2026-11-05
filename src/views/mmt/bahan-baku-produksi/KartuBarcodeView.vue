<script setup lang="ts">
import { ref, onMounted, watch, nextTick } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useToast } from "vue-toastification";
import PageLayout from "@/components/PageLayout.vue";
import {
    IconBarcode,
    IconRefresh,
    IconSearch,
    IconArrowRight,
    IconAlertCircle,
    IconPackage,
    IconCheck,
    IconBuildingWarehouse,
    IconPrinter,
    IconFileSpreadsheet,
} from "@tabler/icons-vue";
import api from "@/services/api";
import { useTabsStore } from "@/stores/tabsStore";
import { exportExcelSingle, type ExcelColumn } from "@/utils/excelExport";

interface BarcodeInfo {
    Barcode: string;
    Kode?: string;
    Nama_Bahan?: string;
    Satuan?: string;
}

interface SaldoGudang {
    Gudang: string;
    SaldoM: number;
}

interface MoveItem {
    Tanggal: string;
    Gudang: string;
    GudangNama?: string;
    Referensi: string;
    Kode?: string;
    QtyIn?: number;
    QtyOut?: number;
    Panjang?: number;
    MasukM: number;
    KeluarM: number;
    Spk?: string | null;
    RefJenis: string;
    Keterangan?: string;
    SaldoM: number;
}

interface LhkUsageItem {
    Lhk: string;
    Jenis: string;
    Tanggal: string;
    Spk?: string | null;
    Jumlah: number;
}

interface BarcodeDetailResponse {
    info: BarcodeInfo;
    moves: MoveItem[];
    saldoPerGudang: SaldoGudang[];
    saldoTotalM: number;
    lhkUsage: LhkUsageItem[];
}

const route = useRoute();
const router = useRouter();
const toast = useToast();
const tabsStore = useTabsStore();

// --- STATE ---
const scanInput = ref("");
const barcodeInput = ref<HTMLInputElement | null>(null);
const isLoading = ref(false);
const errorMsg = ref("");
const data = ref<BarcodeDetailResponse | null>(null);

interface RecentRollItem {
    Barcode: string;
    Kode: string;
    Nama_Bahan: string;
    Gudang: string;
    Stok_Sistem: number | string;
}
const recentRolls = ref<RecentRollItem[]>([]);
const isFetchingRecent = ref(false);

const fetchRecentRolls = async () => {
    isFetchingRecent.value = true;
    try {
        const res = await api.get(
            "/mmt/bahan-baku-produksi/barcode/search/list",
            {
                params: { gdg_kode: "WH-16" },
            },
        );
        const list = Array.isArray(res.data) ? res.data : res.data?.data || [];
        recentRolls.value = list.slice(0, 15);
    } catch (e) {
        console.error("Gagal load roll terbaru:", e);
    } finally {
        isFetchingRecent.value = false;
    }
};

const selectRoll = (barcodeVal: string) => {
    scanInput.value = barcodeVal;
    fetchHistory();
};

// Format tanggal ke format DD-MM-YYYY
const formatTanggal = (v: string | null | undefined): string => {
    if (!v) return "-";
    const s = String(v).trim();
    if (!s || s === "null" || s === "undefined") return "-";
    // yyyy-MM-dd atau yyyy-MM-dd HH:mm:ss
    const match = s.match(/^(\d{4})[-/](\d{2})[-/](\d{2})/);
    if (match) {
        const [, y, m, d] = match;
        return `${d}-${m}-${y}`;
    }
    // dd/MM/yyyy atau dd-MM-yyyy
    const match2 = s.match(/^(\d{2})[-/](\d{2})[-/](\d{4})/);
    if (match2) {
        const [, d, m, y] = match2;
        return `${d}-${m}-${y}`;
    }
    return s;
};

// Format angka desimal / meter
const fmtM = (v: any) => {
    if (v === null || v === undefined || v === "") return "-";
    const num = Number(v);
    if (isNaN(num)) return "-";
    return num.toLocaleString("id-ID", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
};

// Ambil riwayat pergerakan & pemakaian LHK barcode
const fetchHistory = async () => {
    const barcode = scanInput.value.trim();
    if (!barcode) {
        toast.warning("Silakan ketik atau scan nomor barcode.");
        return;
    }

    isLoading.value = true;
    errorMsg.value = "";

    try {
        const res = await api.get(
            "/mmt/bahan-baku-produksi/barcode/search/history",
            {
                params: { barcode },
            },
        );

        if (res.data?.success && res.data?.data) {
            data.value = res.data.data;
        } else {
            data.value = null;
            errorMsg.value = `Barcode [${barcode}] tidak ditemukan atau belum memiliki mutasi.`;
        }
    } catch (err: any) {
        data.value = null;
        errorMsg.value =
            err.response?.data?.message ||
            `Barcode [${barcode}] tidak terdaftar di sistem master stok.`;
    } finally {
        isLoading.value = false;
        nextTick(() => {
            barcodeInput.value?.focus();
        });
    }
};

const handleClear = () => {
    scanInput.value = "";
    data.value = null;
    errorMsg.value = "";
    nextTick(() => {
        barcodeInput.value?.focus();
    });
};

const goToSearchBarcode = () => {
    router.push("/mmt/bahan-baku-produksi/search-barcode");
};

// Cetak Kartu Stok Barcode
const handlePrintKartu = () => {
    if (!data.value) {
        toast.warning("Tidak ada data kartu stok barcode untuk dicetak.");
        return;
    }
    const info = data.value.info;
    const moves = data.value.moves || [];
    const lhk = data.value.lhkUsage || [];

    const printWindow = window.open("", "_blank", "width=900,height=750");
    if (!printWindow) {
        toast.error("Gagal membuka jendela cetak. Pastikan pop-up diizinkan.");
        return;
    }

    const movesHtml = moves
        .map(
            (m) => `
    <tr>
      <td style="text-align: center; font-family: monospace;">${formatTanggal(m.Tanggal)}</td>
      <td><strong>${m.Gudang}</strong> ${m.GudangNama ? `(${m.GudangNama})` : ""}</td>
      <td>${m.RefJenis}</td>
      <td style="font-family: monospace; font-weight: bold;">${m.Referensi}</td>
      <td>${m.Keterangan || "-"}</td>
      <td style="text-align: right; color: #16a34a; font-weight: bold;">${Number(m.MasukM) > 0 ? fmtM(m.MasukM) : "-"}</td>
      <td style="text-align: right; color: #dc2626; font-weight: bold;">${Number(m.KeluarM) > 0 ? fmtM(m.KeluarM) : "-"}</td>
      <td style="text-align: right; font-weight: bold;">${fmtM(m.SaldoM)}</td>
    </tr>
  `,
        )
        .join("");

    const lhkHtml = lhk
        .map(
            (u) => `
    <tr>
      <td style="font-family: monospace; font-weight: bold;">${u.Lhk}</td>
      <td style="text-align: center; font-weight: bold;">${u.Jenis}</td>
      <td style="text-align: center; font-family: monospace;">${formatTanggal(u.Tanggal)}</td>
      <td style="text-align: center; font-family: monospace;">${u.Spk || "-"}</td>
      <td style="text-align: right; font-weight: bold;">${fmtM(u.Jumlah)}</td>
    </tr>
  `,
        )
        .join("");

    printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Kartu Stok Barcode - ${info.Barcode}</title>
      <style>
        body { font-family: Arial, sans-serif; font-size: 11px; margin: 20px; color: #0f172a; }
        .header { border-bottom: 2px solid #1e3a8a; padding-bottom: 8px; margin-bottom: 12px; }
        .title { font-size: 16px; font-weight: bold; color: #1e3a8a; }
        .meta-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; background: #f8fafc; border: 1px solid #cbd5e1; padding: 10px; border-radius: 4px; margin-bottom: 14px; }
        .meta-item label { display: block; font-size: 9px; text-transform: uppercase; color: #64748b; font-weight: bold; }
        .meta-item span { font-size: 12px; font-weight: bold; }
        .section-title { font-size: 12px; font-weight: bold; color: #1e3a8a; margin: 14px 0 6px 0; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 14px; font-size: 10px; }
        th, td { border: 1px solid #cbd5e1; padding: 5px 6px; }
        th { background: #f1f5f9; font-weight: bold; text-align: left; }
        @media print { body { margin: 8mm; } }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="title">KARTU STOK BARCODE ROL (MMT)</div>
        <div style="font-size: 10px; color: #64748b;">Dicetak pada: ${new Date().toLocaleString("id-ID")}</div>
      </div>
      <div class="meta-grid">
        <div class="meta-item"><label>Barcode Rol</label><span style="font-family: monospace;">${info.Barcode}</span></div>
        <div class="meta-item"><label>Kode Bahan</label><span>${info.Kode || "-"}</span></div>
        <div class="meta-item"><label>Nama Bahan</label><span>${info.Nama_Bahan || "-"}</span></div>
        <div class="meta-item"><label>Sisa</label><span style="color: #16a34a;">${fmtM(data.value.saldoTotalM)} meter</span></div>
      </div>
      <div class="section-title">Riwayat Pergerakan</div>
      <table>
        <thead>
          <tr>
            <th style="width: 80px; text-align: center;">Tanggal</th>
            <th>Gudang</th>
            <th>Jenis</th>
            <th>Referensi</th>
            <th>Keterangan</th>
            <th style="width: 80px; text-align: right;">Masuk (m)</th>
            <th style="width: 80px; text-align: right;">Keluar (m)</th>
            <th style="width: 85px; text-align: right;">Saldo (m)</th>
          </tr>
        </thead>
        <tbody>
          ${movesHtml || '<tr><td colspan="8" style="text-align: center;">Tidak ada pergerakan.</td></tr>'}
        </tbody>
      </table>
      <div class="section-title">Pemakaian di LHK (Proof & Cetak Mesin)</div>
      <table>
        <thead>
          <tr>
            <th>Dokumen LHK</th>
            <th style="text-align: center;">Jenis LHK</th>
            <th style="text-align: center;">Tanggal</th>
            <th style="text-align: center;">Nomor SPK</th>
            <th style="text-align: right;">Jumlah (m)</th>
          </tr>
        </thead>
        <tbody>
          ${lhkHtml || '<tr><td colspan="5" style="text-align: center;">Belum ada pemakaian LHK tercatat untuk barcode ini.</td></tr>'}
        </tbody>
      </table>
    </body>
    </html>
  `);
    printWindow.document.close();
    setTimeout(() => {
        printWindow.focus();
        printWindow.print();
    }, 400);
};

// Export Kartu Stok Barcode ke Excel
const handleExportExcel = async () => {
    if (!data.value) {
        toast.warning("Tidak ada data kartu stok untuk di-export.");
        return;
    }
    try {
        const fileName = `Kartu_Stok_${data.value.info.Barcode}_${new Date().toISOString().substring(0, 10)}.xlsx`;
        const moveCols: ExcelColumn[] = [
            { header: "Tanggal", key: "Tanggal", width: 14, align: "center" },
            { header: "Gudang", key: "Gudang", width: 12, align: "center" },
            { header: "Nama Gudang", key: "GudangNama", width: 22 },
            { header: "Jenis Referensi", key: "RefJenis", width: 18 },
            {
                header: "No. Referensi",
                key: "Referensi",
                width: 20,
                align: "center",
            },
            { header: "Keterangan", key: "Keterangan", width: 28 },
            {
                header: "Masuk (m)",
                key: "MasukM",
                width: 14,
                numFmt: "#,##0.00",
                align: "right",
            },
            {
                header: "Keluar (m)",
                key: "KeluarM",
                width: 14,
                numFmt: "#,##0.00",
                align: "right",
            },
            {
                header: "Saldo Berjalan (m)",
                key: "SaldoM",
                width: 18,
                numFmt: "#,##0.00",
                align: "right",
            },
        ];

        const moveRows = (data.value.moves || []).map((m) => ({
            Tanggal: formatTanggal(m.Tanggal),
            Gudang: m.Gudang || "-",
            GudangNama: m.GudangNama || "-",
            RefJenis: m.RefJenis || "-",
            Referensi: m.Referensi || "-",
            Keterangan: m.Keterangan || "-",
            MasukM: Number(m.MasukM || 0),
            KeluarM: Number(m.KeluarM || 0),
            SaldoM: Number(m.SaldoM || 0),
        }));

        await exportExcelSingle(
            fileName,
            "Pergerakan_Rol",
            moveCols,
            moveRows,
            `KARTU STOK BARCODE: ${data.value.info.Barcode} (${data.value.info.Nama_Bahan || ""})`,
        );
        toast.success("Export Excel kartu barcode berhasil.");
    } catch (err: any) {
        toast.error("Gagal export Excel: " + (err.message || err));
    }
};

const closeTab = () => {
    tabsStore.closeTab(route.path);
};

// Otomatis fetch bila ada parameter query `barcode` atau `nomor`
watch(
    () => route.query.barcode || route.query.nomor,
    (newVal) => {
        if (newVal) {
            scanInput.value = String(newVal).trim();
            fetchHistory();
        } else if (!data.value) {
            fetchRecentRolls();
        }
    },
    { immediate: true },
);

onMounted(() => {
    if (!route.query.barcode && !route.query.nomor && !data.value) {
        fetchRecentRolls();
    }
    nextTick(() => {
        barcodeInput.value?.focus();
    });
});
</script>

<template>
    <PageLayout title="Kartu Barcode" :icon="IconBarcode" :loading="isLoading">
        <template #header-actions>
            <v-btn
                v-if="data"
                size="small"
                variant="tonal"
                color="secondary"
                class="text-none font-weight-bold mr-2"
                @click="handlePrintKartu"
            >
                <template #prepend>
                    <IconPrinter :size="15" />
                </template>
                Cetak Kartu
            </v-btn>

            <v-btn
                v-if="data"
                size="small"
                variant="tonal"
                color="success"
                class="text-none font-weight-bold mr-2"
                @click="handleExportExcel"
            >
                <template #prepend>
                    <IconFileSpreadsheet :size="15" />
                </template>
                Export Excel
            </v-btn>

            <v-btn
                size="small"
                variant="tonal"
                color="primary"
                class="text-none font-weight-bold mr-2"
                @click="goToSearchBarcode"
            >
                <template #prepend>
                    <IconSearch :size="15" />
                </template>
                Daftar Inventaris Barcode
            </v-btn>

            <v-btn
                size="small"
                variant="outlined"
                color="secondary"
                class="text-none font-weight-bold mr-2"
                :loading="isLoading"
                @click="fetchHistory"
            >
                <template #prepend>
                    <IconRefresh :size="15" />
                </template>
                Refresh
            </v-btn>

            <v-btn
                size="small"
                variant="outlined"
                color="error"
                class="text-none"
                @click="closeTab"
            >
                Tutup Tab
            </v-btn>
        </template>

        <div class="kartu-barcode-workspace">
            <!-- ── HERO SCANNER BAR ── -->
            <div class="scan-bar-card elevation-1">
                <div class="d-flex align-center flex-wrap gap-2">
                    <div class="scan-input-wrapper flex-grow-1">
                        <IconBarcode
                            :size="18"
                            class="scan-prefix-icon text-primary"
                        />
                        <input
                            ref="barcodeInput"
                            type="text"
                            v-model="scanInput"
                            class="scan-field"
                            placeholder="Scan barcode roll atau ketik nomor barcode lalu tekan ENTER..."
                            autofocus
                            @keyup.enter="fetchHistory"
                        />
                        <button
                            v-if="scanInput"
                            type="button"
                            class="btn-clear-inline"
                            @click="handleClear"
                            title="Bersihkan input"
                        >
                            &times;
                        </button>
                        <span class="enter-badge">ENTER ↵</span>
                    </div>

                    <v-btn
                        color="primary"
                        variant="flat"
                        size="small"
                        class="text-none font-weight-bold px-4"
                        height="34"
                        :loading="isLoading"
                        :disabled="!scanInput.trim()"
                        @click="fetchHistory"
                    >
                        Tampilkan
                    </v-btn>
                </div>
            </div>

            <!-- ── PESAN ERROR JIKA BARCODE TIDAK ADA ── -->
            <v-alert
                v-if="errorMsg"
                type="error"
                variant="tonal"
                density="compact"
                class="mt-3 mb-1 font-weight-medium"
                closable
                @click:close="errorMsg = ''"
            >
                <template #prepend>
                    <IconAlertCircle :size="18" />
                </template>
                {{ errorMsg }}
            </v-alert>

            <!-- ── KONTEN DETAIL HASIL SEARCH KARTU BARCODE ── -->
            <div v-if="data" class="kartu-content-body mt-3">
                <!-- 1. CARD RINGKASAN INFORMASI ROL & SALDO GUDANG -->
                <div class="summary-hero-card elevation-1">
                    <div class="summary-header">
                        <div class="d-flex align-center">
                            <span class="barcode-badge-tag"
                                >KARTU STOK BARCODE ROL</span
                            >
                            <span class="stock-status-chip">
                                <IconCheck :size="12" class="mr-1" /> AKTIF DI
                                SISTEM
                            </span>
                        </div>
                        <div class="barcode-title-number">
                            {{ data.info.Barcode }}
                        </div>
                    </div>

                    <div class="summary-grid">
                        <!-- Info Bahan -->
                        <div class="info-block">
                            <div class="info-label">Nama Bahan</div>
                            <div
                                class="info-val-highlight font-weight-bold text-dark"
                            >
                                {{ data.info.Nama_Bahan || "-" }}
                            </div>
                        </div>

                        <div class="info-block">
                            <div class="info-label">Kode Bahan</div>
                            <div
                                class="info-val font-monospace font-weight-bold text-secondary"
                            >
                                {{ data.info.Kode || "-" }}
                            </div>
                        </div>

                        <div class="info-block">
                            <div class="info-label">Satuan</div>
                            <div class="info-val">
                                {{ data.info.Satuan || "ROLL" }}
                            </div>
                        </div>

                        <!-- Sisa Total Meter -->
                        <div class="info-block total-saldo-block">
                            <div class="info-label text-success-dark">Sisa</div>
                            <div class="total-saldo-value">
                                {{ fmtM(data.saldoTotalM) }}
                                <span class="unit-text">meter</span>
                            </div>
                        </div>
                    </div>

                    <!-- Sisa per Gudang -->
                    <div class="per-gudang-section">
                        <div class="per-gudang-title">
                            <IconBuildingWarehouse :size="14" class="mr-1" />
                            Rincian Sisa per Gudang
                        </div>
                        <div class="per-gudang-chips">
                            <div
                                v-for="g in data.saldoPerGudang"
                                :key="g.Gudang"
                                class="gudang-pill"
                                :class="{ 'has-stock': Number(g.SaldoM) > 0 }"
                            >
                                <span class="gdg-code">{{ g.Gudang }}</span>
                                <span class="gdg-meter"
                                    >{{ fmtM(g.SaldoM) }} m</span
                                >
                            </div>
                            <div
                                v-if="
                                    !data.saldoPerGudang ||
                                    data.saldoPerGudang.length === 0
                                "
                                class="text-caption text-grey"
                            >
                                Tidak ada data saldo gudang.
                            </div>
                        </div>
                    </div>
                </div>

                <!-- 2. PANEL RIWAYAT PERGERAKAN (BUKU BESAR / LEDGER ROLL) -->
                <div class="panel-section-card elevation-1 mt-3">
                    <div class="panel-header">
                        <div class="d-flex align-center">
                            <span class="panel-title">Riwayat Pergerakan</span>
                            <span class="count-pill ml-2"
                                >{{ data.moves.length }} transaksi</span
                            >
                        </div>
                        <span class="text-caption text-grey">
                            Lacak mutasi antar gudang, penerimaan, dan saldo
                            berjalan
                        </span>
                    </div>

                    <div class="table-responsive">
                        <table class="manksi-table">
                            <thead>
                                <tr>
                                    <th
                                        style="width: 100px"
                                        class="text-center"
                                    >
                                        Tanggal
                                    </th>
                                    <th
                                        style="width: 240px"
                                        class="text-center"
                                    >
                                        Gudang
                                    </th>
                                    <th
                                        style="width: 140px"
                                        class="text-center"
                                    >
                                        Jenis Ref
                                    </th>
                                    <th
                                        style="width: 170px"
                                        class="text-center"
                                    >
                                        No. Dokumen
                                    </th>
                                    <th>Keterangan</th>
                                    <th
                                        style="width: 100px"
                                        class="text-end text-center"
                                    >
                                        Masuk (m)
                                    </th>
                                    <th style="width: 100px" class="text-end">
                                        Keluar (m)
                                    </th>
                                    <th style="width: 110px" class="text-end">
                                        Sisa (m)
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr v-for="(m, idx) in data.moves" :key="idx">
                                    <td
                                        class="text-center font-monospace text-caption"
                                    >
                                        {{ formatTanggal(m.Tanggal) }}
                                    </td>
                                    <td>
                                        <span class="gdg-tag">{{
                                            m.Gudang
                                        }}</span>
                                        <span
                                            class="text-caption text-grey ml-1"
                                            >{{ m.GudangNama }}</span
                                        >
                                    </td>
                                    <td>
                                        <span
                                            class="ref-type-tag"
                                            :class="{
                                                'is-mutasi':
                                                    m.RefJenis ===
                                                    'Mutasi Gudang',
                                                'is-terima':
                                                    m.RefJenis.includes(
                                                        'Penerimaan',
                                                    ) ||
                                                    m.RefJenis.includes(
                                                        'Saldo Awal',
                                                    ),
                                            }"
                                        >
                                            {{ m.RefJenis }}
                                        </span>
                                    </td>
                                    <td
                                        class="font-monospace font-weight-medium text-primary"
                                    >
                                        {{ m.Referensi }}
                                    </td>
                                    <td class="text-caption">
                                        {{ m.Keterangan || "-" }}
                                    </td>
                                    <td
                                        class="text-end font-weight-bold text-success font-monospace"
                                    >
                                        {{
                                            Number(m.MasukM) > 0
                                                ? fmtM(m.MasukM)
                                                : "-"
                                        }}
                                    </td>
                                    <td
                                        class="text-end font-weight-bold text-error font-monospace"
                                    >
                                        {{
                                            Number(m.KeluarM) > 0
                                                ? fmtM(m.KeluarM)
                                                : "-"
                                        }}
                                    </td>
                                    <td
                                        class="text-end font-weight-bold text-slate-800 font-monospace bg-saldo-col"
                                    >
                                        {{ fmtM(m.SaldoM) }}
                                    </td>
                                </tr>

                                <tr
                                    v-if="
                                        !data.moves || data.moves.length === 0
                                    "
                                >
                                    <td
                                        colspan="8"
                                        class="text-center py-5 text-grey"
                                    >
                                        Tidak ada riwayat pergerakan untuk
                                        barcode ini.
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                <!-- 3. PANEL PEMAKAIAN DI LHK (PROOF & CETAK MESIN) -->
                <div class="panel-section-card elevation-1 mt-3">
                    <div class="panel-header">
                        <div>
                            <div class="d-flex align-center">
                                <span class="panel-title"
                                    >Pemakaian di LHK</span
                                >
                                <span class="count-pill ml-2"
                                    >{{ data.lhkUsage.length }} catatan</span
                                >
                            </div>
                            <div class="panel-hint">
                                Informatif saja (tidak menggerakkan saldo
                                kartu). Modul Proof & Mesin Cetak yang mencatat
                                barcode roll; Tekstil/Sublim/Finishing merujuk
                                bahan/SPK.
                            </div>
                        </div>
                    </div>

                    <div class="table-responsive">
                        <table class="manksi-table">
                            <thead>
                                <tr>
                                    <th style="width: 170px">Dokumen LHK</th>
                                    <th
                                        style="width: 120px"
                                        class="text-center"
                                    >
                                        Jenis LHK
                                    </th>
                                    <th
                                        style="width: 110px"
                                        class="text-center"
                                    >
                                        Tanggal
                                    </th>
                                    <th style="width: 160px">Nomor SPK</th>
                                    <th style="width: 120px" class="text-end">
                                        Jumlah Dipakai (m)
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr
                                    v-for="(u, idx) in data.lhkUsage"
                                    :key="idx"
                                >
                                    <td
                                        class="font-monospace font-weight-medium text-primary"
                                    >
                                        {{ u.Lhk }}
                                    </td>
                                    <td class="text-center">
                                        <span
                                            class="lhk-type-badge"
                                            :class="
                                                u.Jenis === 'PROOF'
                                                    ? 'is-proof'
                                                    : 'is-cetak'
                                            "
                                        >
                                            {{ u.Jenis }}
                                        </span>
                                    </td>
                                    <td
                                        class="text-center font-monospace text-caption"
                                    >
                                        {{ formatTanggal(u.Tanggal) }}
                                    </td>
                                    <td class="font-monospace text-caption">
                                        {{ u.Spk || "-" }}
                                    </td>
                                    <td
                                        class="text-end font-weight-bold text-dark font-monospace"
                                    >
                                        {{ fmtM(u.Jumlah) }}
                                    </td>
                                </tr>

                                <tr
                                    v-if="
                                        !data.lhkUsage ||
                                        data.lhkUsage.length === 0
                                    "
                                >
                                    <td
                                        colspan="5"
                                        class="text-center py-5 text-grey"
                                    >
                                        Belum ada pemakaian LHK tercatat untuk
                                        barcode roll ini.
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <!-- ── EMPTY STATE SEBELUM SCAN & KATALOG ROL CEPAT ── -->
            <div v-else-if="!isLoading && !errorMsg" class="mt-3">
                <!-- Card Pilih Rol Tersedia -->
                <div class="panel-section-card elevation-1">
                    <div
                        class="panel-header d-flex align-center justify-space-between"
                    >
                        <div class="d-flex align-center">
                            <IconPackage :size="16" class="mr-2 text-primary" />
                            <span class="panel-title"
                                >Pilih Rol Bahan Tersedia (Gudang WH-16)</span
                            >
                            <span class="count-pill ml-2"
                                >{{ recentRolls.length }} rol</span
                            >
                        </div>
                        <v-btn
                            color="primary"
                            variant="tonal"
                            size="x-small"
                            class="text-none font-weight-bold"
                            @click="goToSearchBarcode"
                        >
                            <template #prepend>
                                <IconSearch :size="13" />
                            </template>
                            Katalog Lengkap (Search Barcode) &rarr;
                        </v-btn>
                    </div>

                    <div class="table-responsive">
                        <table class="manksi-table">
                            <thead>
                                <tr>
                                    <th style="width: 40px" class="text-center">
                                        No
                                    </th>
                                    <th style="width: 180px">Barcode Rol</th>
                                    <th style="width: 140px">Kode Bahan</th>
                                    <th>Nama Bahan</th>
                                    <th style="width: 90px" class="text-center">
                                        Gudang
                                    </th>
                                    <th style="width: 120px" class="text-end">
                                        Stok Tersedia
                                    </th>
                                    <th
                                        style="width: 100px"
                                        class="text-center"
                                    >
                                        Aksi
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr
                                    v-for="(r, idx) in recentRolls"
                                    :key="r.Barcode"
                                    class="cursor-pointer hover-row"
                                    @click="selectRoll(r.Barcode)"
                                >
                                    <td
                                        class="text-center text-caption text-grey"
                                    >
                                        {{ idx + 1 }}
                                    </td>
                                    <td>
                                        <span class="barcode-badge">{{
                                            r.Barcode
                                        }}</span>
                                    </td>
                                    <td
                                        class="font-monospace text-caption font-weight-medium text-grey-darken-2"
                                    >
                                        {{ r.Kode }}
                                    </td>
                                    <td class="text-caption font-weight-medium">
                                        {{ r.Nama_Bahan }}
                                    </td>
                                    <td class="text-center">
                                        <span class="gdg-tag">{{
                                            r.Gudang
                                        }}</span>
                                    </td>
                                    <td
                                        class="text-end font-weight-bold text-primary font-monospace"
                                    >
                                        {{ Number(r.Stok_Sistem).toFixed(2) }} m
                                    </td>
                                    <td class="text-center" @click.stop>
                                        <v-btn
                                            size="x-small"
                                            color="primary"
                                            variant="tonal"
                                            class="text-none px-2 font-weight-medium"
                                            @click="selectRoll(r.Barcode)"
                                        >
                                            Buka Kartu &rarr;
                                        </v-btn>
                                    </td>
                                </tr>

                                <tr
                                    v-if="
                                        recentRolls.length === 0 &&
                                        !isFetchingRecent
                                    "
                                >
                                    <td
                                        colspan="7"
                                        class="text-center py-6 text-grey"
                                    >
                                        <IconBarcode
                                            :size="36"
                                            class="text-grey-lighten-1 mb-1"
                                        />
                                        <div>
                                            Silakan scan atau masukkan barcode
                                            rol di atas lalu tekan ENTER.
                                        </div>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    </PageLayout>
</template>

<style scoped>
.kartu-barcode-workspace {
    padding: 12px;
    background-color: #f8fafc;
    height: 100%;
    overflow-y: auto;
    box-sizing: border-box;
    font-size: 11px;
}

/* ── HERO SCANNER BAR ── */
.scan-bar-card {
    background: white;
    border: 1px solid #cbd5e1;
    border-radius: 6px;
    padding: 8px 12px;
}

.scan-input-wrapper {
    position: relative;
    display: flex;
    align-items: center;
}

.scan-prefix-icon {
    position: absolute;
    left: 10px;
}

.scan-field {
    width: 100%;
    height: 34px;
    border: 1.5px solid #cbd5e1;
    border-radius: 4px;
    padding: 0 75px 0 34px;
    font-family: monospace;
    font-size: 13px;
    font-weight: 700;
    color: #0f172a;
    outline: none;
    background: #fdfdfd;
    transition: all 0.2s ease;
}

.scan-field:focus {
    border-color: #1565c0;
    box-shadow: 0 0 0 3px rgba(21, 101, 192, 0.12);
    background: white;
}

.btn-clear-inline {
    position: absolute;
    right: 68px;
    background: transparent;
    border: none;
    font-size: 16px;
    color: #94a3b8;
    cursor: pointer;
    line-height: 1;
}

.btn-clear-inline:hover {
    color: #ef4444;
}

.enter-badge {
    position: absolute;
    right: 8px;
    background: #f1f5f9;
    border: 1px solid #cbd5e1;
    border-radius: 3px;
    padding: 2px 6px;
    font-size: 9px;
    font-weight: 700;
    color: #64748b;
    pointer-events: none;
}

/* ── SUMMARY HERO CARD (LIGHT THEME DENGAN AKSEN SOFT MANKSI) ── */
.summary-hero-card {
    background: #ffffff;
    border: 1px solid #e2e8f0;
    border-left: 4px solid #1976d2;
    border-radius: 6px;
    padding: 14px 16px;
    color: #1e293b;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.summary-header {
    border-bottom: 1px solid #f1f5f9;
    padding-bottom: 8px;
    margin-bottom: 12px;
}

.barcode-badge-tag {
    font-size: 10px;
    font-weight: 700;
    background: #eff6ff;
    color: #1976d2;
    border: 1px solid #bfdbfe;
    padding: 2px 8px;
    border-radius: 4px;
    letter-spacing: 0.4px;
}

.stock-status-chip {
    display: inline-flex;
    align-items: center;
    font-size: 10px;
    font-weight: 700;
    background: #f0fdf4;
    color: #16a34a;
    border: 1px solid #bbf7d0;
    padding: 2px 8px;
    border-radius: 4px;
    margin-left: 8px;
}

.barcode-title-number {
    font-size: 20px;
    font-weight: 800;
    font-family: monospace;
    color: #0f172a;
    margin-top: 6px;
    letter-spacing: 0.5px;
}

.summary-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: 10px;
    margin-bottom: 12px;
}

.info-block {
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 6px;
    padding: 8px 12px;
}

.info-label {
    font-size: 10px;
    color: #64748b;
    margin-bottom: 3px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.3px;
}

.info-val {
    font-size: 12px;
    font-weight: 600;
    color: #1e293b;
}

.info-val-highlight {
    font-size: 13px;
    color: #0f172a;
}

.total-saldo-block {
    background: #f0fdf4;
    border: 1px solid #bbf7d0;
}

.text-success-dark {
    color: #166534;
}

.total-saldo-value {
    font-size: 19px;
    font-weight: 800;
    font-family: monospace;
    color: #15803d;
}

.unit-text {
    font-size: 11px;
    font-weight: 600;
    color: #166534;
}

.per-gudang-section {
    background: #f8fafc;
    border: 1px dashed #cbd5e1;
    border-radius: 6px;
    padding: 8px 12px;
}

.per-gudang-title {
    display: flex;
    align-items: center;
    font-size: 10px;
    font-weight: 700;
    color: #475569;
    text-transform: uppercase;
    letter-spacing: 0.3px;
    margin-bottom: 6px;
}

.per-gudang-chips {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
}

.gudang-pill {
    display: inline-flex;
    align-items: center;
    background: white;
    border: 1px solid #cbd5e1;
    border-radius: 4px;
    overflow: hidden;
    font-size: 11px;
}

.gudang-pill.has-stock {
    border-color: #93c5fd;
    background: #eff6ff;
}

.gdg-code {
    background: #f1f5f9;
    padding: 2px 7px;
    font-weight: 700;
    color: #475569;
}

.gudang-pill.has-stock .gdg-code {
    background: #dbeafe;
    color: #1e40af;
}

.gdg-meter {
    padding: 2px 8px;
    font-family: monospace;
    font-weight: 700;
    color: #334155;
}

.gudang-pill.has-stock .gdg-meter {
    color: #1565c0;
}

/* ── PANEL TABLES ── */
.panel-section-card {
    background: white;
    border: 1px solid #cbd5e1;
    border-radius: 6px;
    overflow: hidden;
}

.panel-header {
    padding: 8px 12px;
    background: #f8fafc;
    border-bottom: 1px solid #e2e8f0;
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.panel-title {
    font-size: 11px;
    font-weight: 700;
    color: #0f172a;
    text-transform: uppercase;
}

.panel-hint {
    font-size: 10px;
    color: #64748b;
    margin-top: 2px;
}

.count-pill {
    font-size: 9px;
    font-weight: 700;
    background: #e0f2fe;
    color: #0284c7;
    padding: 1px 6px;
    border-radius: 3px;
}

.table-responsive {
    overflow-x: auto;
}

.manksi-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 11px;
}

.manksi-table th {
    background: #f1f5f9;
    border-bottom: 1px solid #cbd5e1;
    border-right: 1px solid #e2e8f0;
    padding: 6px 8px;
    text-align: left;
    font-weight: 700;
    color: #334155;
    white-space: nowrap;
}

.manksi-table td {
    border-bottom: 1px solid #f1f5f9;
    border-right: 1px solid #f8fafc;
    padding: 5px 8px;
    vertical-align: middle;
}

.manksi-table tr:hover {
    background: #f8fafc;
}

.bg-saldo-col {
    background: #f8fafc;
}

.gdg-tag {
    font-size: 9px;
    font-weight: 700;
    color: #475569;
    background: #f1f5f9;
    padding: 1px 4px;
    border-radius: 2px;
}

.ref-type-tag {
    font-size: 9px;
    font-weight: 700;
    padding: 1px 6px;
    border-radius: 3px;
    background: #f1f5f9;
    color: #475569;
}

.ref-type-tag.is-mutasi {
    background: #fef3c7;
    color: #b45309;
}

.ref-type-tag.is-terima {
    background: #dcfce7;
    color: #15803d;
}

.lhk-type-badge {
    font-size: 9px;
    font-weight: 800;
    padding: 1px 6px;
    border-radius: 3px;
}

.lhk-type-badge.is-proof {
    background: #e0e7ff;
    color: #4338ca;
}

.lhk-type-badge.is-cetak {
    background: #ffedd5;
    color: #c2410c;
}

/* ── EMPTY STATE ── */
.empty-state-card {
    background: white;
    border: 1px solid #cbd5e1;
    border-radius: 6px;
    padding: 40px 16px;
    text-align: center;
}

.empty-icon-wrap {
    width: 72px;
    height: 72px;
    border-radius: 50%;
    background: #eff6ff;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 12px;
}

.text-primary-light {
    color: #3b82f6;
}

.empty-title {
    font-size: 14px;
    font-weight: 700;
    color: #1e293b;
    margin-bottom: 4px;
}

.empty-desc {
    font-size: 11px;
    color: #64748b;
    max-width: 480px;
    margin: 0 auto;
}

.barcode-badge {
    font-family: monospace;
    font-size: 10px;
    font-weight: 700;
    color: #1976d2;
    background: #eef2f6;
    padding: 2px 6px;
    border-radius: 3px;
    border: 1px solid #cbd5e1;
}

.hover-row:hover {
    background-color: #f0f7ff !important;
}

.cursor-pointer {
    cursor: pointer;
}
</style>
