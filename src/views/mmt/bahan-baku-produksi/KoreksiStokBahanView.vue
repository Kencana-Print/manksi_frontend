<script setup lang="ts">
import { ref, computed } from "vue";
import { useRouter } from "vue-router";
import { useToast } from "vue-toastification";
import QRCode from "qrcode";
import BaseBrowse from "@/components/BaseBrowse.vue";
import { useBrowse } from "@/composables/useBrowse";
import {
    IconAdjustments,
    IconPrinter,
    IconBarcode,
    IconX,
    IconCheck,
} from "@tabler/icons-vue";
import api from "@/services/api";
import { formatTanggal } from "@/utils/dateFormat";

interface DetailKoreksi {
    Nomor: string;
    Kode: string;
    Nama_Bahan: string;
    Panjang: number;
    Lebar: number;
    Satuan: string;
    Stock: number;
    Fisik: number;
    Koreksi: number;
    List_Barcode?: string;
}

interface PrintItem {
    Nama_Bahan: string;
    qrValue: string;
    qrImage: string;
    Panjang: number;
    Lebar: number;
}

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
    { title: "Nomor Koreksi", key: "Nomor", width: "160px" },
    {
        title: "Tanggal",
        key: "Tanggal",
        width: "120px",
        align: "center" as const,
    },
    {
        title: "Kode Gudang",
        key: "GudangKode",
        width: "110px",
        align: "center" as const,
    },
    { title: "Nama Gudang", key: "Gudang", minWidth: "160px" },
    {
        title: "Tipe Koreksi",
        key: "Tipe_Nama",
        width: "140px",
        align: "center" as const,
    },
    { title: "Keterangan", key: "Keterangan", minWidth: "220px" },
];

const {
    items,
    isLoading,
    selected,
    canInsert,
    canDelete,
    canExport,
    fetchData,
    exportToExcel,
} = useBrowse<any>({
    menuId: "5535",
    fetchApi: async () => {
        const res = await api.get("/mmt/bahan-baku-produksi/koreksi-stok", {
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

// --- EXPAND LOGIC (RINCIAN DETAIL KOREKSI) ---
const expanded = ref<any[]>([]);
const detailCache = ref<Record<string, DetailKoreksi[]>>({});
const loadingDetails = ref<Record<string, boolean>>({});

const getItemDetails = (item: any): DetailKoreksi[] => {
    const raw = item?.raw || item;
    const nomor = getItemNomor(raw);
    if (detailCache.value[nomor] && detailCache.value[nomor].length > 0) {
        return detailCache.value[nomor];
    }
    const details = raw?.Detail || raw?.details || raw?.Details;
    if (Array.isArray(details) && details.length > 0) {
        return details;
    }
    return [];
};

const onUpdateExpanded = async (newExpanded: any[]) => {
    expanded.value = newExpanded;
    for (const expItem of newExpanded) {
        const nomor = getItemNomor(expItem);
        if (!nomor) continue;
        if (detailCache.value[nomor] && detailCache.value[nomor].length > 0)
            continue;

        const raw =
            (items.value || []).find((it: any) => getItemNomor(it) === nomor) ||
            expItem;
        const existing = getItemDetails(raw);
        if (existing && existing.length > 0) {
            detailCache.value[nomor] = existing;
            continue;
        }

        loadingDetails.value[nomor] = true;
        try {
            const res = await api.get(
                `/mmt/bahan-baku-produksi/koreksi-stok/${encodeURIComponent(nomor)}`,
            );
            const detailData =
                res.data?.data?.details ||
                res.data?.data?.Detail ||
                res.data?.data ||
                [];
            detailCache.value[nomor] = Array.isArray(detailData)
                ? detailData
                : [];
        } catch (err) {
            console.error(`Gagal memuat detail koreksi ${nomor}:`, err);
        } finally {
            loadingDetails.value[nomor] = false;
        }
    }
};

// --- ACTION METHODS ---
const handleNew = () => {
    router.push("/mmt/bahan-baku-produksi/koreksi-stok-bahan/create");
};

const handleDelete = async (item: any) => {
    const target = item || selected.value[0];
    const nomor = getItemNomor(target);
    if (!nomor) return;

    if (!confirm(`Hapus data koreksi stok nomor ${nomor}?`)) return;
    try {
        await api.delete(
            `/mmt/bahan-baku-produksi/koreksi-stok/${encodeURIComponent(nomor)}`,
        );
        toast.success("Koreksi stok berhasil dihapus.");
        fetchData();
    } catch (err: any) {
        toast.error(err.response?.data?.message || "Gagal menghapus data.");
    }
};

// --- CETAK SLIP ---
const handlePrintSlip = (item?: any) => {
    const target = item || selectedItem.value;
    const nomor = getItemNomor(target);
    if (!nomor) {
        toast.warning("Silakan pilih data koreksi terlebih dahulu.");
        return;
    }
    window.open(
        `/mmt/bahan-baku-produksi/koreksi-stok-bahan/print/${encodeURIComponent(nomor)}`,
        "_blank",
    );
};

// --- CETAK BARCODE (MMT STANDARD) ---
const showQRDialog = ref(false);
const isGeneratingQR = ref(false);
const itemsToPrint = ref<PrintItem[]>([]);
const printCopies = ref<number>(2); // Sesuai MMT: 2 lembar per barcode
const selectedPrintIndices = ref<number[]>([]);

const handlePrintBarcode = async (item?: any) => {
    const target = item || selectedItem.value;
    const nomor = getItemNomor(target);
    if (!nomor) {
        toast.warning("Silakan pilih satu transaksi koreksi stok.");
        return;
    }

    isGeneratingQR.value = true;
    try {
        let detailsList = getItemDetails(target);
        if (!detailsList || detailsList.length === 0) {
            const res = await api.get(
                `/mmt/bahan-baku-produksi/koreksi-stok/${encodeURIComponent(nomor)}`,
            );
            detailsList =
                res.data?.data?.details ||
                res.data?.data?.Detail ||
                res.data?.data ||
                [];
            detailCache.value[nomor] = detailsList;
        }

        if (!detailsList || detailsList.length === 0) {
            toast.warning("Data rincian barang tidak ditemukan.");
            return;
        }

        const tempPrintList: PrintItem[] = [];

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
                    Panjang: dtl.Panjang ?? 0,
                    Lebar: dtl.Lebar ?? 0,
                });
            }
        }

        if (tempPrintList.length === 0) {
            toast.warning(
                "Tidak ada barcode pada koreksi ini. Barcode biasanya dihasilkan jika fisik bertambah.",
            );
            return;
        }

        itemsToPrint.value = tempPrintList;
        selectedPrintIndices.value = tempPrintList.map((_, idx) => idx);
        printCopies.value = 2; // Default 2 label per barcode sesuai sistem MMT
        showQRDialog.value = true;
    } catch (err: any) {
        console.error("Gagal menyiapkan barcode koreksi:", err);
        toast.error("Terjadi kesalahan saat memproses data barcode.");
    } finally {
        isGeneratingQR.value = false;
    }
};

const toggleSelectAll = () => {
    if (selectedPrintIndices.value.length === itemsToPrint.value.length) {
        selectedPrintIndices.value = [];
    } else {
        selectedPrintIndices.value = itemsToPrint.value.map((_, i) => i);
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
    });
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (!doc) {
        document.body.removeChild(iframe);
        return;
    }

    const selectedItems = itemsToPrint.value.filter((_, idx) =>
        selectedPrintIndices.value.includes(idx),
    );

    if (selectedItems.length === 0) {
        toast.warning("Pilih minimal satu label untuk dicetak.");
        document.body.removeChild(iframe);
        return;
    }

    const copies = Math.max(1, Number(printCopies.value) || 1);
    const labelsToRender: PrintItem[] = [];
    for (const it of selectedItems) {
        for (let c = 0; c < copies; c++) {
            labelsToRender.push(it);
        }
    }

    const labelHtml = labelsToRender
        .map(
            (item) => `
    <div class="label-box">
      <div class="border-inner">
        <div class="top-row">
          <img src="${item.qrImage}" class="qr-img" />
          <div class="info-column">
            <div class="qr-text">${item.qrValue}</div>
            <div class="dimens-text">${item.Panjang} x ${item.Lebar}</div>
          </div>
        </div>
        <div class="divider"></div>
        <div class="product-name">${item.Nama_Bahan}</div>
      </div>
    </div>
  `,
        )
        .join("");

    doc.open();
    doc.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Cetak Label Barcode Koreksi - ${getItemNomor(selectedItem.value)}</title>
        <style>
          @page { size: 101.2mm 101mm portrait; margin: 0; }
          body { 
            margin: 0; 
            padding: 0; 
            font-family: Arial, sans-serif; 
            display: flex; 
            flex-direction: column; 
            align-items: center; 
            justify-content: center; 
            min-height: 100vh; 
            background: white;
          }
          .label-box { 
            width: 70mm; 
            height: 50mm; 
            padding: 3mm; 
            box-sizing: border-box; 
          }
          .label-box:nth-child(2n) { 
            page-break-after: always; 
          }
          .border-inner { 
            border: 1pt solid black; 
            height: 100%; 
            width: 100%; 
            padding: 2mm; 
            display: flex; 
            flex-direction: column; 
            box-sizing: border-box; 
          }
          .top-row { 
            display: flex; 
            gap: 10px; 
            margin-bottom: 4px; 
          }
          .qr-img { 
            width: 1.5cm; 
            height: 1.5cm; 
          }
          .info-column {
            display: flex;
            flex-direction: column;
            justify-content: center;
          }
          .qr-text { 
            font-weight: bold; 
            font-size: 8pt; 
            word-break: break-all; 
          }
          .dimens-text { 
            font-size: 11pt; 
            font-weight: bold; 
            margin-top: 5px; 
          }
          .divider { 
            border-top: 1pt solid black; 
            width: 100%; 
            margin: 4px 0; 
          }
          .product-name { 
            font-size: 13pt; 
            font-weight: bold; 
            text-align: center; 
            flex-grow: 1; 
            display: flex; 
            align-items: center; 
            justify-content: center; 
            overflow: hidden; 
          }
        </style>
      </head>
      <body>${labelHtml}</body>
    </html>
  `);
    doc.close();

    setTimeout(() => {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
        document.body.removeChild(iframe);
    }, 500);
};
</script>

<template>
    <BaseBrowse
        title="Koreksi Stok Bahan"
        menu-id="5535"
        item-value="Nomor"
        :icon="IconAdjustments"
        :headers="headers"
        :items="items || []"
        :is-loading="isLoading"
        v-model:selected="selected"
        :show-expand="true"
        :expanded="expanded"
        @update:expanded="onUpdateExpanded"
        :can-insert="canInsert"
        :can-edit="false"
        :can-delete="canDelete"
        :can-export="canExport"
        @refresh="fetchData"
        @add="handleNew"
        @delete="handleDelete"
        @export="exportToExcel('Koreksi_Stok_Bahan')"
    >
        <!-- Extra Actions Toolbar (Satu baris sejajar di header atas bersama kumpulan fitur aksi) -->
        <template #extra-actions>
            <v-btn
                size="small"
                color="teal"
                class="text-none font-weight-medium"
                :disabled="!selectedItem"
                :loading="isGeneratingQR"
                @click="handlePrintBarcode(selectedItem)"
            >
                <template #prepend>
                    <IconBarcode :size="15" />
                </template>
                Cetak Barcode
            </v-btn>

            <v-btn
                size="small"
                color="info"
                class="text-none font-weight-medium"
                :disabled="!selectedItem"
                @click="handlePrintSlip(selectedItem)"
            >
                <template #prepend>
                    <IconPrinter :size="15" />
                </template>
                Cetak Slip
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

        <!-- Sub-Tabel Expandable Rincian Koreksi Stok (Sesuai Referensi MMT) -->
        <template #detail="{ item }">
            <div class="expand-detail-container pa-3">
                <div class="d-flex align-center justify-space-between mb-2">
                    <div class="text-caption font-weight-bold text-primary">
                        Rincian Barang Koreksi: {{ getItemNomor(item) }}
                        <span
                            v-if="(item.raw || item).Gudang"
                            class="text-grey-darken-1"
                        >
                            &bull; Gudang: {{ (item.raw || item).Gudang }}
                        </span>
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
                    Memuat rincian barang koreksi...
                </div>

                <div
                    v-else-if="getItemDetails(item).length === 0"
                    class="text-caption text-grey py-2"
                >
                    Tidak ada rincian barang pada dokumen koreksi ini.
                </div>

                <v-table
                    v-else
                    density="compact"
                    class="sub-detail-table border rounded"
                >
                    <thead>
                        <tr>
                            <th style="width: 40px" class="text-center">No</th>
                            <th style="width: 130px">Kode Bahan</th>
                            <th>Nama Bahan</th>
                            <th style="width: 80px" class="text-end">
                                Pjg (m)
                            </th>
                            <th style="width: 80px" class="text-end">
                                Lbr (m)
                            </th>
                            <th style="width: 80px" class="text-center">
                                Satuan
                            </th>
                            <th
                                style="width: 90px"
                                class="text-end font-weight-bold"
                            >
                                Sistem
                            </th>
                            <th
                                style="width: 90px"
                                class="text-end font-weight-bold"
                            >
                                Fisik
                            </th>
                            <th
                                style="width: 100px"
                                class="text-center font-weight-bold"
                            >
                                Selisih
                            </th>
                            <th style="min-width: 160px">List Barcode</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr
                            v-for="(dtl, idx) in getItemDetails(item)"
                            :key="idx"
                            class="sub-detail-row"
                        >
                            <td class="text-center text-caption text-grey">
                                {{ idx + 1 }}
                            </td>
                            <td class="font-weight-medium text-caption">
                                {{ dtl.Kode }}
                            </td>
                            <td class="font-weight-medium">
                                {{ dtl.Nama_Bahan }}
                            </td>
                            <td class="text-end text-caption">
                                {{ dtl.Panjang ?? "-" }}
                            </td>
                            <td class="text-end text-caption">
                                {{ dtl.Lebar ?? "-" }}
                            </td>
                            <td class="text-center text-caption">
                                {{ dtl.Satuan || "-" }}
                            </td>
                            <td
                                class="text-end text-caption font-weight-medium"
                            >
                                {{ dtl.Stock ?? 0 }}
                            </td>
                            <td
                                class="text-end text-caption font-weight-medium"
                            >
                                {{ dtl.Fisik ?? 0 }}
                            </td>
                            <td class="text-center">
                                <v-chip
                                    size="x-small"
                                    :color="
                                        Number(dtl.Koreksi) > 0
                                            ? 'success'
                                            : Number(dtl.Koreksi) < 0
                                              ? 'error'
                                              : 'grey'
                                    "
                                    label
                                    class="font-weight-bold px-2"
                                >
                                    {{
                                        Number(dtl.Koreksi) > 0
                                            ? "+" + dtl.Koreksi
                                            : (dtl.Koreksi ?? 0)
                                    }}
                                </v-chip>
                            </td>
                            <td>
                                <div
                                    v-if="dtl.List_Barcode"
                                    class="d-flex flex-wrap ga-1 py-1"
                                >
                                    <v-chip
                                        v-for="(bc, bIdx) in String(
                                            dtl.List_Barcode,
                                        )
                                            .split(',')
                                            .map((b) => b.trim())
                                            .filter(Boolean)"
                                        :key="bIdx"
                                        size="x-small"
                                        variant="outlined"
                                        color="primary"
                                        class="font-mono text-caption"
                                    >
                                        <IconBarcode :size="12" class="mr-1" />
                                        {{ bc }}
                                    </v-chip>
                                </div>
                                <span v-else class="text-caption text-grey"
                                    >-</span
                                >
                            </td>
                        </tr>
                    </tbody>
                </v-table>
            </div>
        </template>
    </BaseBrowse>

    <!-- Dialog Preview Barcode / QR Label -->
    <v-dialog v-model="showQRDialog" max-width="900" scrollable>
        <v-card class="rounded-lg">
            <v-card-title
                class="d-flex align-center py-3 px-4 border-b bg-grey-lighten-4"
            >
                <v-avatar color="teal" variant="tonal" size="32" class="mr-2">
                    <IconBarcode :size="18" />
                </v-avatar>
                <div>
                    <div class="text-subtitle-1 font-weight-bold">
                        Preview Cetak Label Barcode Koreksi
                    </div>
                    <div class="text-caption text-medium-emphasis">
                        Nomor:
                        <strong>{{ getItemNomor(selectedItem) }}</strong> &bull;
                        Total Terpilih:
                        <strong
                            >{{
                                selectedPrintIndices.length * (printCopies || 1)
                            }}
                            Label</strong
                        >
                    </div>
                </div>
                <v-spacer />
                <div class="d-flex align-center ga-2">
                    <v-btn
                        color="primary"
                        size="small"
                        class="text-none font-weight-bold px-4"
                        :disabled="selectedPrintIndices.length === 0"
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

            <!-- Pengaturan Salinan & Pilih Barcode -->
            <v-card-text class="pa-4 bg-grey-lighten-5">
                <v-card
                    variant="flat"
                    border
                    class="pa-3 mb-3 bg-white rounded-lg"
                >
                    <div
                        class="d-flex align-center flex-wrap justify-space-between ga-3"
                    >
                        <div class="d-flex align-center ga-2">
                            <span class="text-caption font-weight-medium"
                                >Salinan per Barcode:</span
                            >
                            <v-btn-toggle
                                v-model="printCopies"
                                color="primary"
                                variant="outlined"
                                density="compact"
                                mandatory
                            >
                                <v-btn :value="1" size="small" class="text-none"
                                    >1 Label</v-btn
                                >
                                <v-btn :value="2" size="small" class="text-none"
                                    >2 Label</v-btn
                                >
                                <v-btn :value="3" size="small" class="text-none"
                                    >3 Label</v-btn
                                >
                            </v-btn-toggle>
                        </div>
                        <div>
                            <v-btn
                                size="small"
                                variant="outlined"
                                color="secondary"
                                class="text-none"
                                @click="toggleSelectAll"
                            >
                                {{
                                    selectedPrintIndices.length ===
                                    itemsToPrint.length
                                        ? "Batalkan Semua"
                                        : "Pilih Semua"
                                }}
                            </v-btn>
                        </div>
                    </div>
                </v-card>

                <!-- Preview Grid Label Roll (70mm x 50mm) -->
                <div class="preview-grid">
                    <div
                        v-for="(item, idx) in itemsToPrint"
                        :key="idx"
                        class="preview-card-item"
                        :class="{ active: selectedPrintIndices.includes(idx) }"
                        @click="
                            selectedPrintIndices.includes(idx)
                                ? selectedPrintIndices.splice(
                                      selectedPrintIndices.indexOf(idx),
                                      1,
                                  )
                                : selectedPrintIndices.push(idx)
                        "
                    >
                        <div class="selection-indicator">
                            <v-icon
                                v-if="selectedPrintIndices.includes(idx)"
                                size="16"
                                color="primary"
                                :icon="IconCheck"
                            />
                        </div>
                        <div class="label-box bg-white">
                            <div class="border-inner">
                                <div class="top-row">
                                    <img :src="item.qrImage" class="qr-img" />
                                    <div class="info-column">
                                        <div class="qr-text">
                                            {{ item.qrValue }}
                                        </div>
                                        <div class="dimens-text">
                                            {{ item.Panjang }} x
                                            {{ item.Lebar }}
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

/* Sub-Detail Styling */
.expand-detail-container {
    background-color: #f8fafc;
    border-top: 1px solid #e2e8f0;
    border-bottom: 1px solid #e2e8f0;
}
.sub-detail-table {
    background: #ffffff;
    border-color: #e2e8f0 !important;
}
.sub-detail-table th {
    background-color: #f1f5f9;
    font-size: 11px;
    font-weight: 600;
    color: #475569;
    text-transform: uppercase;
    letter-spacing: 0.025em;
    height: 32px !important;
    border-bottom: 1px solid #cbd5e1 !important;
}
.sub-detail-row td {
    height: 34px !important;
    font-size: 12px;
    border-bottom: 1px solid #f1f5f9 !important;
}
.sub-detail-row:hover {
    background-color: #f8fafc;
}
.font-mono {
    font-family: monospace;
}

/* Preview Barcode Label Styling (Ukuran 70mm x 50mm) */
.preview-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 16px;
    max-height: 60vh;
    overflow-y: auto;
    padding: 8px;
}
.preview-card-item {
    position: relative;
    cursor: pointer;
    border-radius: 8px;
    border: 2px solid #e2e8f0;
    padding: 10px;
    display: flex;
    justify-content: center;
    align-items: center;
    background: #f8fafc;
    transition: all 0.2s ease;
}
.preview-card-item:hover {
    border-color: #94a3b8;
}
.preview-card-item.active {
    border-color: rgb(var(--v-theme-primary));
    background-color: #eff6ff;
}
.selection-indicator {
    position: absolute;
    top: 6px;
    right: 6px;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    border: 1px solid #cbd5e1;
    background: white;
    display: flex;
    align-items: center;
    justify-content: center;
}
.preview-card-item.active .selection-indicator {
    border-color: rgb(var(--v-theme-primary));
}
.label-box {
    width: 70mm;
    height: 50mm;
    padding: 3mm;
    box-sizing: border-box;
    background: #ffffff;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}
.border-inner {
    border: 1pt solid black;
    height: 100%;
    width: 100%;
    padding: 2mm;
    display: flex;
    flex-direction: column;
    box-sizing: border-box;
}
.top-row {
    display: flex;
    gap: 8px;
}
.qr-img {
    width: 1.4cm;
    height: 1.4cm;
    flex-shrink: 0;
}
.info-column {
    display: flex;
    flex-direction: column;
    justify-content: center;
    overflow: hidden;
}
.qr-text {
    font-weight: bold;
    font-size: 8pt;
    word-break: break-all;
    line-height: 1.1;
}
.dimens-text {
    font-size: 9pt;
    font-weight: bold;
    margin-top: 3px;
}
.divider {
    border-top: 1pt solid black;
    width: 100%;
    margin: 3px 0;
}
.product-name {
    font-size: 11pt;
    font-weight: bold;
    text-align: center;
    flex-grow: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    line-height: 1.1;
}
</style>
