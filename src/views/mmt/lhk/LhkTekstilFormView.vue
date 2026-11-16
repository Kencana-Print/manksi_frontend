<script setup lang="ts">
import { ref, reactive, computed, onMounted, nextTick, watch } from "vue";
import html2canvas from "html2canvas";
import { format } from "date-fns";
import { useRoute, useRouter } from "vue-router";
import { useToast } from "vue-toastification";
import { useForm } from "@/composables/useForm";
import api from "@/services/api";
import QRCode from "qrcode";
import BaseForm from "@/components/BaseForm.vue";
import { useAuthStore } from "@/stores/authStore";
import MesinLookupView from "@/modal/MesinLookupModal.vue";
import SpkLookupView from "@/modal/SpkMesinLookupModal.vue";
import {
    IconBuildingFactory,
    IconSearch,
    IconTrash,
    IconBarcode,
    IconRefresh,
    IconSparkles,
    IconX,
} from "@tabler/icons-vue";

const toast = useToast();
const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();
const satuanBahan = ref("Y");

const SCALE = 60;

const initialData = {
    nomor: "AUTO",
    tanggal: format(new Date(), "yyyy-MM-dd"),
    shift: 1,
    gdgKode: "GPM",
    barcode_input: "",
    barcode_spk: "",
    brg_nama: "",
    brg_kode: "",
    lebar_bahan: 0,
    panjang_bahan: 0,
    sisa_panjang_manual: null as number | null,
    sisa_lebar_manual: null as number | null,
    panjang_nyempil_manual: null as number | null,
    lebar_nyempil_manual: null as number | null,
    panjang_bs: "" as any,
    lebar_bs: "" as any,
    mesin_kode: "",
    mesin_nama: "",
    lstatus: "DRAFT",
    details: [] as any[],
};

const isSubmitting = ref(false);

const {
    formData,
    isEditMode,
    isLoading,
    isSaving,
    showSaveDialog,
    showCancelDialog,
    showCloseDialog,
    executeSave,
    executeCancel,
    executeClose,
    fetchData,
} = useForm({
    menuId: "128",
    initialData,
    fetchApi: async () => {
        const nomorLhk = route.params.nomor as string;
        const res = await api.get(`/mmt/lhk-tekstil-mmt/${nomorLhk}`);
        const h = res.data.data.header;
        const details = res.data.data.details || [];

        const ambilBahanFromDtl =
            details.length > 0
                ? parseFloat(
                      details[0].ltd_ambil_bahan || details[0].Ambil_Bahan || 0,
                  )
                : 0;

        const dtlFirst = details.length > 0 ? details[0] : null;

        let sisaMeterFromDtl: number | null = null;
        if (dtlFirst) {
            const rawVal =
                dtlFirst.ltd_sisameter ??
                dtlFirst.Sisa_Meter ??
                dtlFirst.sisabahan_meter;
            if (rawVal !== undefined && rawVal !== null && rawVal !== "") {
                sisaMeterFromDtl = parseFloat(rawVal);
            }
        }

        if (h.Satuan_Bahan) {
            satuanBahan.value = h.Satuan_Bahan.trim().toUpperCase();
        }

        return {
            nomor: h.Nomor || h.lth_nomor,
            tanggal: format(new Date(h.Tanggal || h.lth_tanggal), "yyyy-MM-dd"),
            shift: h.Shift || h.lth_shift || 1,
            gdgKode: h.Gudang || h.lth_gdg_prod || "GPM",
            barcode_input: h.Barcode_Roll || h.lth_barcode,
            barcode_spk: h.Barcode_SPK || h.lth_barcode_spk || "",
            brg_kode: h.Kode_Bahan || h.lth_brg_kode,
            brg_nama: h.Nama_Bahan || h.brg_nama || "",
            panjang_bs:
                h.Panjang_BS !== undefined && h.Panjang_BS !== null
                    ? h.Panjang_BS.toString()
                    : "",
            lebar_bs:
                h.Lebar_BS !== undefined && h.Lebar_BS !== null
                    ? h.Lebar_BS.toString()
                    : "",
            mesin_kode: h.Mesin || h.Kode_Mesin || h.lth_mesin_kode || "",
            mesin_nama: h.Mesin || h.Nama_Mesin || h.mesin_nama || "",

            sisa_panjang_manual:
                sisaMeterFromDtl !== null
                    ? sisaMeterFromDtl
                    : h.sisa_panjang_manual !== undefined &&
                        h.sisa_panjang_manual !== null
                      ? satuanBahan.value === "ROLL"
                          ? parseFloat(
                                parseFloat(h.sisa_panjang_manual).toFixed(2),
                            )
                          : parseFloat(
                                (
                                    parseFloat(h.sisa_panjang_manual) * 0.9
                                ).toFixed(2),
                            )
                      : null,
            sisa_lebar_manual:
                h.sisa_lebar_manual !== undefined &&
                h.sisa_lebar_manual !== null
                    ? parseFloat(h.sisa_lebar_manual)
                    : null,
            panjang_nyempil_manual:
                h.panjang_nyempil_manual !== undefined &&
                h.panjang_nyempil_manual !== null
                    ? parseFloat(h.panjang_nyempil_manual)
                    : null,
            lebar_nyempil_manual:
                h.lebar_nyempil_manual !== undefined &&
                h.lebar_nyempil_manual !== null
                    ? parseFloat(h.lebar_nyempil_manual)
                    : null,

            panjang_bahan:
                ambilBahanFromDtl ||
                parseFloat(h.Panjang_Awal || h.lth_panjang_awal || 0),
            lebar_bahan: parseFloat(h.Lebar_Bahan || h.lth_lebar_bahan || 0),

            lstatus: h.lth_status || "DRAFT",
            details: details.map((d: any) => {
                const qtyOrder = parseInt(
                    d.Jumlah_SPK ||
                        d.Jumlah ||
                        d.spk_qty ||
                        d.ltd_qty_order ||
                        0,
                );
                const sdhCetak = parseInt(
                    d.sudah_cetak_sebelumnya ||
                        d.Sudah_Cetak ||
                        d.spk_sudah_cetak ||
                        0,
                );
                return {
                    nomor_spk: d.Nomor_SPK || d.ltd_spk_nomor,
                    nama_spk: d.Nama_SPK || d.spk_nama,
                    panjang_spk: parseFloat(d.Panjang || d.spk_panjang || 0),
                    lebar_spk: parseFloat(d.Lebar || d.spk_lebar || 0),
                    jumlah: qtyOrder,
                    sudahcetak: sdhCetak,
                    total_pernah_cetak: parseInt(d.total_pernah_cetak || 0),
                    kurangcetak_asli: parseInt(
                        d.Kurang_Cetak ||
                            d.ltd_kurang_cetak ||
                            qtyOrder - sdhCetak,
                    ),
                    tile: d.Tile || d.tile || 1,
                    padding:
                        d.ltd_pad !== undefined ? parseFloat(d.ltd_pad) : 0.03,
                    orientasi: d.Orientasi || d.ltd_orientasi || "lebar",

                    // Perbaikan mapping untuk Cetak 1 - 7 agar membaca dari backend (Cetak_1 / cetak1 / ltd_cetak1)
                    cetak1: parseInt(
                        d.Cetak_1 ?? d.cetak1 ?? d.ltd_cetak1 ?? 0,
                    ),
                    cetak2: parseInt(
                        d.Cetak_2 ?? d.cetak2 ?? d.ltd_cetak2 ?? 0,
                    ),
                    cetak3: parseInt(
                        d.Cetak_3 ?? d.cetak3 ?? d.ltd_cetak3 ?? 0,
                    ),
                    cetak4: parseInt(
                        d.Cetak_4 ?? d.cetak4 ?? d.ltd_cetak4 ?? 0,
                    ),
                    cetak5: parseInt(
                        d.Cetak_5 ?? d.cetak5 ?? d.ltd_cetak5 ?? 0,
                    ),
                    cetak6: parseInt(
                        d.Cetak_6 ?? d.cetak6 ?? d.ltd_cetak6 ?? 0,
                    ),
                    cetak7: parseInt(
                        d.Cetak_7 ?? d.cetak7 ?? d.ltd_cetak7 ?? 0,
                    ),

                    totalcetak: parseInt(d.Jml_Cetak || d.totalcetak || 0),
                    kurangcetak: 0,
                    ltd_sisameter: d.ltd_sisameter
                        ? parseFloat(d.ltd_sisameter)
                        : 0,
                };
            }),
        };
    },
    submitApi: async (data: typeof initialData): Promise<unknown> => {
        if (isSubmitting.value) return;
        isSubmitting.value = true;

        try {
            recalculateCombine();

            const currentUser = authStore.user?.kode || "SYSTEM";

            const sisaFinalMeter =
                formData.value.sisa_panjang_manual !== null &&
                !isNaN(Number(formData.value.sisa_panjang_manual))
                    ? parseFloat(
                          Number(formData.value.sisa_panjang_manual).toFixed(2),
                      )
                    : parseFloat(Number(sisaStokOtomatisM.value).toFixed(2));

            const sisaFinalStokDb =
                satuanBahan.value === "ROLL"
                    ? sisaFinalMeter
                    : parseFloat((sisaFinalMeter / 0.9).toFixed(2));

            const lebarAwal = parseFloat((formData.value.lebar_bahan as any) || 0);
            const sisaLebarFinal =
                formData.value.sisa_lebar_manual !== null &&
                Number(formData.value.sisa_lebar_manual) > 0
                    ? parseFloat(
                          Number(formData.value.sisa_lebar_manual).toFixed(2),
                      )
                    : lebarAwal;

            let finalPanjangAfal = panjangSisaLayoutGanjil.value || 0;
            let finalLebarAfal = lebarSisaLayoutGanjil.value || 0;

            const formattedDetails = formData.value.details.map((d: any) => ({
                ...d,
                mesin: formData.value.mesin_kode,
                panjang_per_pcs: parseFloat(d.panjang_spk || 0),
                jumlah_cetak: parseInt(d.totalcetak || 0),
                ltd_ambil_bahan: Number(formData.value.panjang_bahan || 0),
                sisabahan: sisaFinalStokDb,
                sisabahan_meter: sisaFinalMeter,
                sisabahanlebar: sisaLebarFinal,
                padding: parseFloat(d.padding || 0),
                tile: parseInt(d.tile || 1),
            }));

            const payload = {
                header: {
                    ...formData.value,
                    user: currentUser,
                    panjang_bs:
                        formData.value.panjang_bs !== ""
                            ? parseFloat(formData.value.panjang_bs)
                            : 0,
                    lebar_bs:
                        formData.value.lebar_bs !== ""
                            ? parseFloat(formData.value.lebar_bs)
                            : 0,
                    panjang_awal: formData.value.panjang_bahan,
                    sisa_panjang_manual: sisaFinalStokDb,
                    lpanjang_afal: finalPanjangAfal,
                    llebar_afal: finalLebarAfal,
                },
                details: formattedDetails,
            };

            const res = await api.post("/mmt/lhk-tekstil-mmt", payload);
            const resBody = res.data;
            const afalInfo = resBody.afalData || resBody.data?.afalData;

            if (
                formData.value.lstatus === "POSTED" &&
                afalInfo &&
                afalInfo.lebar > 0.5
            ) {
                afalModal.data = {
                    barcode: afalInfo.barcode,
                    panjang: Number(afalInfo.panjang || 0),
                    lebar: Number(afalInfo.lebar || 0),
                };
                afalModal.qrImage = "";
                try {
                    afalModal.qrImage = await QRCode.toDataURL(afalInfo.barcode, {
                        width: 300,
                        margin: 0,
                        errorCorrectionLevel: "M",
                    });
                } catch {}
                await nextTick();
                afalModal.show = true;

                return new Promise((resolve) => {
                    const unwatch = watch(
                        () => afalModal.show,
                        (isOpen) => {
                            if (!isOpen) {
                                unwatch();
                                resolve(res);
                            }
                        },
                    );
                });
            }

            return res;
        } finally {
            isSubmitting.value = false;
        }
    },
});

const lookup = reactive({ mesin: false, spk: false });
const manualOffsets = reactive<
    Record<number, { x: number; y: number; rotation: number }>
>({});
const totalPanjangTerpakai = ref(0);
const totalLebarGabungan = ref(0);
const lebarSisaLayoutGanjil = ref(0);
const panjangSisaLayoutGanjil = ref(0);

const panjangBhanDalamMeter = computed(() => {
    const val = formData.value.panjang_bahan || 0;
    return satuanBahan.value === "ROLL" ? val : val * 0.9;
});

const sisaStokOtomatisM = computed(() => {
    const rawBs = formData.value.panjang_bs;
    const bsPanjang =
        rawBs && !isNaN(parseFloat(rawBs as string))
            ? parseFloat(rawBs as string)
            : 0;
    return panjangBhanDalamMeter.value - totalPanjangTerpakai.value - bsPanjang;
});

const sisaStokOtomatisYrd = computed(() => sisaStokOtomatisM.value / 0.9);

const isFormValid = computed(() => {
    return (
        formData.value.details.length > 0 &&
        formData.value.brg_kode !== "" &&
        formData.value.details.every((d: any) => d.totalcetak > 0)
    );
});

const handleMesinSelect = (mesin: any) => {
    formData.value.mesin_kode =
        mesin.Kode || mesin.id || mesin.kode_mesin || "";
    formData.value.mesin_nama = mesin.Nama || mesin.nama || "";
    lookup.mesin = false;
    toast.success(`Mesin ${formData.value.mesin_nama} dipilih`);
};

const isDownloadingJpg = ref(false);

const afalModal = reactive({
    show: false,
    data: { barcode: "", panjang: 0, lebar: 0 },
    qrImage: "" as string,
    qrSize: "1.5",
});

const closeAfalModal = () => {
    afalModal.show = false;
    router.push("/mmt/lhk/tekstil");
};

const printAfalLabel = () => {
    if (!afalModal.qrImage || !afalModal.data.barcode) return;
    const printItems = [
        {
            qrValue: afalModal.data.barcode,
            qrImage: afalModal.qrImage,
            panjang: afalModal.data.panjang,
            lebar: afalModal.data.lebar,
            namaBahan: "BAHAN AFAL",
        },
        {
            qrValue: afalModal.data.barcode,
            qrImage: afalModal.qrImage,
            panjang: afalModal.data.panjang,
            lebar: afalModal.data.lebar,
            namaBahan: "BAHAN AFAL",
        },
    ];
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
    if (!doc) return;
    const labelHtml = printItems
        .map(
            (item) => `
    <div class="label-box"><div class="border-inner"><div class="top-row"><img src="${item.qrImage}" class="qr-img" /><div class="info-column"><div class="qr-text">${item.qrValue}</div><div class="dimens-text">${Number(item.panjang).toFixed(2)} x ${Number(item.lebar).toFixed(2)}</div></div></div><div class="divider"></div><div class="product-name">${item.namaBahan}</div></div></div>
  `,
        )
        .join("");
    doc.open();
    doc.write(`<html><head><style>
    @page{size:101.2mm 101mm portrait;margin:0} body{margin:0;padding:0;font-family:Arial,sans-serif;display:flex;flex-direction:column;align-items:center;gap:5px;justify-content:center;min-height:100vh}
    .label-box{width:70mm;height:50mm;padding:3mm;box-sizing:border-box} .label-box:nth-child(2n){page-break-after:always}
    .border-inner{border:1pt solid black;height:100%;width:100%;padding:2mm;display:flex;flex-direction:column;box-sizing:border-box}
    .top-row{display:flex;gap:10px;margin-bottom:4px} .qr-img{width:1.5cm;height:1.5cm} .qr-text{font-weight:bold;font-size:8pt;word-break:break-all} .dimens-text{font-size:11pt;font-weight:bold;margin-top:5px}
    .divider{border-top:1pt solid black;width:100%;margin:4px 0} .product-name{font-size:13pt;font-weight:bold;text-align:center;flex-grow:1;display:flex;align-items:center;justify-content:center;overflow:hidden}
  </style></head><body>${labelHtml}</body></html>`);
    doc.close();
    setTimeout(() => {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
        document.body.removeChild(iframe);
    }, 500);
};

const handleDownloadJpg = async () => {
    if (!afalModal.data.barcode) {
        toast.warning("Tidak ada data afal untuk di-download.");
        return;
    }

    isDownloadingJpg.value = true;
    try {
        // Buat container tersembunyi di DOM untuk merender label yang akan di-capture
        const exportContainer = document.createElement("div");
        exportContainer.style.position = "absolute";
        exportContainer.style.left = "-9999px";
        exportContainer.style.top = "-9999px";
        exportContainer.style.fontFamily = "Arial, sans-serif";
        document.body.appendChild(exportContainer);

        // Sesuaikan ukuran kotak berdasarkan qrSize (mirip form recreate barcode)
        const sizeNum = parseFloat(afalModal.qrSize || "1.5");
        let boxWidth = "70mm";
        let boxHeight = "50mm";
        let fontSizeDimens = "11pt";
        let fontSizeName = "13pt";
        let fontSizeBarcode = "8pt";

        if (sizeNum >= 5) {
            boxWidth = "95mm";
            boxHeight = "75mm";
            fontSizeDimens = "14pt";
            fontSizeName = "16pt";
            fontSizeBarcode = "10pt";
        } else if (sizeNum >= 3) {
            boxWidth = "85mm";
            boxHeight = "60mm";
            fontSizeDimens = "12pt";
            fontSizeName = "14pt";
            fontSizeBarcode = "9pt";
        }

        // Render label ke dalam container tersembunyi
        exportContainer.innerHTML = `
      <div id="capture-label-0" style="width: ${boxWidth}; height: ${boxHeight}; padding: 3mm; box-sizing: border-box; background: white; margin-bottom: 10px;">
        <div style="border: 1pt solid black; height: 100%; width: 100%; padding: 2mm; display: flex; flex-direction: column; box-sizing: border-box;">
          <div style="display: flex; gap: 10px; margin-bottom: 4px; align-items: center;">
            <img src="${afalModal.qrImage}" style="width: ${afalModal.qrSize}cm; height: ${afalModal.qrSize}cm; object-fit: contain;" />
            <div style="display: flex; flex-direction: column; justify-content: center;">
              <div style="font-weight: bold; font-size: ${fontSizeBarcode}; word-break: break-all; font-family: monospace;">${afalModal.data.barcode}</div>
              <div style="font-size: ${fontSizeDimens}; font-weight: bold; margin-top: 5px;">${afalModal.data.panjang?.toFixed(2)} x ${afalModal.data.lebar?.toFixed(2)} M</div>
            </div>
          </div>
          <div style="border-top: 1pt solid black; width: 100%; margin: 4px 0;"></div>
          <div style="font-size: ${fontSizeName}; font-weight: bold; text-align: center; flex-grow: 1; display: flex; align-items: center; justify-content: center; overflow: hidden; text-transform: uppercase;">${(formData as any).brg_nama || (formData as any).bahan_nama || "BAHAN AFAL"}</div>
        </div>
      </div>
    `;

        // Konversi label ke JPG dan download
        const labelElement = document.getElementById("capture-label-0");
        if (labelElement) {
            const canvas = await html2canvas(labelElement, {
                scale: 3, // Skala tinggi agar hasil gambar tajam / tidak pecah
                useCORS: true,
            });

            const imageURL = canvas.toDataURL("image/jpeg", 0.95);

            // Buat elemen <a> virtual untuk memicu download di browser
            const downloadLink = document.createElement("a");
            downloadLink.href = imageURL;
            downloadLink.download = `${afalModal.data.barcode}.jpg`;
            document.body.appendChild(downloadLink);
            downloadLink.click();
            document.body.removeChild(downloadLink);
        }

        // Bersihkan container tersembunyi
        document.body.removeChild(exportContainer);
        toast.success("Label berhasil di-download sebagai JPG!");
    } catch (error) {
        console.error("Error Export JPG:", error);
        toast.error("Gagal mengekspor label ke JPG.");
    } finally {
        isDownloadingJpg.value = false;
    }
};

const validateStokBahan = () => {
    const diambilMeter =
        satuanBahan.value === "ROLL"
            ? Number(formData.value.panjang_bahan || 0)
            : Number(formData.value.panjang_bahan || 0) * 0.9;

    const rawBs = formData.value.panjang_bs;
    const bsPanjang =
        rawBs && !isNaN(parseFloat(rawBs as string))
            ? parseFloat(rawBs as string)
            : 0;
    const otomatisMeter = diambilMeter - totalPanjangTerpakai.value - bsPanjang;

    const sisaFinalMeter =
        formData.value.sisa_panjang_manual !== null &&
        !isNaN(Number(formData.value.sisa_panjang_manual))
            ? Number(formData.value.sisa_panjang_manual)
            : otomatisMeter;

    if (sisaFinalMeter > diambilMeter) {
        toast.error(
            "Validasi Gagal: Bahan sisa tidak boleh lebih banyak daripada bahan yang diambil!",
        );
        return false;
    }
    if (diambilMeter < sisaFinalMeter) {
        toast.error(
            "Validasi Gagal: Bahan yang diambil lebih sedikit dari sisa bahan!",
        );
        return false;
    }
    return true;
};

const updateSisaFromLayout = () => {
    let maxRight = 0;
    let maxBottom = 0;

    layoutRows.value.forEach((item, idx) => {
        const posX = manualOffsets[idx]?.x ?? item.x;
        const posY = manualOffsets[idx]?.y ?? item.y;
        const edgeRight = posX + item.w;
        const edgeBottom = posY + item.h;

        if (edgeRight > maxRight) maxRight = edgeRight;
        if (edgeBottom > maxBottom) maxBottom = edgeBottom;
    });

    totalPanjangTerpakai.value = maxRight;
    totalLebarGabungan.value = maxBottom;

    const sisaLebar = formData.value.lebar_bahan - maxBottom;
    if (sisaLebar > 0.1) {
        lebarSisaLayoutGanjil.value = sisaLebar;
        panjangSisaLayoutGanjil.value = maxRight;
    }
};

const autoFillLayout = (isSilent = false) => {
    Object.keys(manualOffsets).forEach(
        (key) => delete manualOffsets[Number(key)],
    );
    if (formData.value.details.length === 0 || formData.value.lebar_bahan <= 0)
        return;

    const maxBahanLebar = Number(formData.value.lebar_bahan);
    let unitGlobalIdx = 0;
    let currentStartX = 0;
    let currentY = 0;
    let maxOverallX = 0;

    formData.value.details.forEach((spk: any) => {
        const totalCetak = Number(spk.totalcetak) || 0;
        const tile = Number(spk.tile) || 1;
        if (totalCetak <= 0) return;

        const padM = parseFloat(spk.padding as any) || 0;
        const w =
            spk.orientasi === "lebar" ? spk.panjang_spk + padM : spk.lebar_spk;
        const h =
            spk.orientasi === "lebar" ? spk.lebar_spk : spk.panjang_spk + padM;

        const totalKolomSPK = Math.ceil(totalCetak / tile);
        let unitsPlaced = 0;

        for (let col = 0; col < totalKolomSPK; col++) {
            const tinggiBlokIni = tile * h;
            if (currentY + tinggiBlokIni > maxBahanLebar + 0.01) {
                currentStartX = maxOverallX;
                currentY = 0;
            }

            for (let row = 0; row < tile; row++) {
                if (unitsPlaced < totalCetak) {
                    const posX = currentStartX + col * w;
                    const posY = currentY + row * h;

                    manualOffsets[unitGlobalIdx] = {
                        x: posX,
                        y: posY,
                        rotation: 0,
                    };
                    if (posX + w > maxOverallX) maxOverallX = posX + w;
                    unitGlobalIdx++;
                    unitsPlaced++;
                }
            }
            if (col === totalKolomSPK - 1) {
                currentY += tinggiBlokIni;
            }
        }
    });

    updateSisaFromLayout();
    if (!isSilent) toast.success("Layout diperbarui!");
};

const startDrag = (event: MouseEvent, idx: number) => {
    const item = layoutRows.value[idx];
    const startX = event.clientX;
    const startY = event.clientY;
    const initialX = manualOffsets[idx]?.x ?? item.x;
    const initialY = manualOffsets[idx]?.y ?? item.y;

    const onMouseMove = (e: MouseEvent) => {
        const dx = (e.clientX - startX) / SCALE;
        const dy = (e.clientY - startY) / SCALE;
        manualOffsets[idx] = {
            x: initialX + dx,
            y: initialY + dy,
            rotation: manualOffsets[idx]?.rotation ?? 0,
        };
        updateSisaFromLayout();
    };

    const onMouseUp = () => {
        document.removeEventListener("mousemove", onMouseMove);
        document.removeEventListener("mouseup", onMouseUp);
    };

    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
};

const updateLimitsFromLayout = () => {
    updateSisaFromLayout();
};

const handleDoubleClick = (idx: number) => {
    if (!manualOffsets[idx]) {
        manualOffsets[idx] = {
            x: layoutRows.value[idx].x,
            y: layoutRows.value[idx].y,
            rotation: 0,
        };
    }
    manualOffsets[idx].rotation = (manualOffsets[idx].rotation + 90) % 360;
    updateSisaFromLayout();
};

const resetManualLayout = () => {
    Object.keys(manualOffsets).forEach(
        (key) => delete manualOffsets[Number(key)],
    );
    recalculateCombine();
};

const layoutRows = computed(() => {
    const blocks: any[] = [];
    formData.value.details.forEach((spk: any) => {
        const padM = parseFloat(spk.padding as any) || 0;
        const visualW =
            spk.orientasi === "lebar" ? spk.panjang_spk + padM : spk.lebar_spk;
        const visualH =
            spk.orientasi === "lebar" ? spk.lebar_spk : spk.panjang_spk + padM;

        for (let i = 0; i < (spk.totalcetak || 0); i++) {
            blocks.push({
                label: `${spk.nomor_spk}`,
                w: visualW,
                h: visualH,
                x: 0,
                y: 0,
                rotated: spk.orientasi === "panjang",
            });
        }
    });
    return blocks;
});

const rollStyle = computed(() => ({
    height: `${formData.value.lebar_bahan * SCALE}px`,
    width: `${Math.max(totalPanjangTerpakai.value, panjangBhanDalamMeter.value) * SCALE}px`,
    position: "relative" as const,
    backgroundColor: "#ffffff",
    border: "2px solid #2c3e50",
    backgroundImage: "linear-gradient(90deg, #f1f1f1 1px, transparent 1px)",
    backgroundSize: `${SCALE}px 100%`,
}));

const handleBsInput = (event: any) => {
    let val = event.target.value;
    if (val.includes(",")) val = val.replace(",", ".");
    formData.value.panjang_bs = val;
    recalculateCombine();
};

const handleBsLebarInput = (event: any) => {
    let val = event.target.value;
    if (val.includes(",")) val = val.replace(",", ".");
    formData.value.lebar_bs = val;
};

const handlePaddingTableInput = (event: any, item: any) => {
    let val = event.target.value;
    if (val.includes(",")) val = val.replace(",", ".");
    item.padding = val;
    recalculateCombine();
};

const handleBarcodeScan = async (fromLoad: boolean | any = false) => {
    const isLoad = fromLoad === true;
    const rawCode = formData.value.barcode_input;
    if (!rawCode) return;

    const invalidCharRegex = /[/\s[\]\\{}()<>="'`]/;
    if (invalidCharRegex.test(rawCode)) {
        toast.error("Format Barcode tidak valid!");
        if (!isLoad) clearBahan();
        return;
    }

    const code = rawCode.trim();

    try {
        const res = await api.get(`/mmt/stok-gudang/${code}`);
        const responsePayload = res.data;

        if (
            !responsePayload ||
            !responsePayload.success ||
            !responsePayload.data
        ) {
            if (!isLoad) {
                toast.error("Barcode tidak terdaftar atau tidak ditemukan!");
                clearBahan();
            }
            return;
        }

        const info = responsePayload.data.data;
        // WAJIB GPM: bahan di gudang lain (mis. WH-16) tidak bisa dipakai LHK baru / scan manual.
        const gdgBahan = String(info?.Kode_Gudang || "")
            .trim()
            .toUpperCase();
        if (!isLoad && gdgBahan !== "GPM") {
            toast.error(
                `⛔ Barang masih di gudang ${info?.Kode_Gudang || gdgBahan || "lain"}! Silahkan masukkan ke gudang produksi (GPM) terlebih dahulu.`,
            );
            clearBahan();
            return;
        }

        const lhkTerakhir = info?.Lhk_Terakhir;
        if (
            isEditMode.value &&
            lhkTerakhir &&
            lhkTerakhir !== formData.value.nomor
        ) {
            toast.warning(
                `⚠️ PERINGATAN REVISI: Roll ini sudah diproses ke LHK Setelahnya (${lhkTerakhir}). Perubahan sisa pada LHK ini akan berdampak pada stok LHK tersebut!`,
                {
                    timeout: 10000,
                    closeOnClick: true,
                    pauseOnHover: true,
                },
            );
        }

        satuanBahan.value = (info.Satuan || "Y").trim().toUpperCase();

        formData.value.brg_nama = info.Nama_Bahan || "";
        formData.value.brg_kode = info.Kode || "";
        formData.value.lebar_bahan = parseFloat(info.Lebar) || 0;

        if (!isEditMode.value || !formData.value.panjang_bahan) {
            formData.value.panjang_bahan =
                parseFloat(info.Sisa_Panjang || info.Sisa_Panjang_Stok) || 0;
        }
        formData.value.gdgKode = info.Kode_Gudang || "GPM";

        recalculateCombine();
        if (!isLoad) {
            toast.success(`Barcode Roll ${code} berhasil dimuat!`);
        }
    } catch (e) {
        if (!isLoad) {
            toast.error("Gagal memuat atau membaca data barcode");
            clearBahan();
        }
    }
};

const clearBahan = () => {
    formData.value.brg_nama = "";
    formData.value.brg_kode = "";
    formData.value.lebar_bahan = 0;
    formData.value.panjang_bahan = 0;
    satuanBahan.value = "Y";
};

const handleSpkScan = async () => {
    const code = formData.value.barcode_spk?.trim();
    if (!code) return;

    if (formData.value.details.some((d: any) => d.nomor_spk === code)) {
        toast.warning("SPK sudah ada di list.");
        formData.value.barcode_spk = "";
        return;
    }

    try {
        const res = await api.get(`/mmt/SPK/${code}`);
        let spk = res.data?.data || res.data;
        if (Array.isArray(spk)) spk = spk[0];

        if (spk) {
            injectSpkObject(spk, code);
            formData.value.barcode_spk = "";
        } else {
            toast.error("Data SPK tidak ditemukan!");
        }
    } catch (e) {
        toast.error("Gagal memuat barcode SPK");
    }
};

const injectSpkObject = (spk: any, scannedCode?: string) => {
    const nomorSpk =
        spk.Nomor_SPK ||
        spk.nomor_spk ||
        spk.ltd_spk_nomor ||
        spk.Spk ||
        scannedCode ||
        "";
    const qtyOrder = parseInt(spk.Jumlah_SPK || spk.Jumlah || spk.jumlah || 0);
    const sudahCetak = parseInt(spk.Sudah_Cetak || spk.sudah_cetak || 0);
    const kurangCetak = parseInt(
        spk.Kurang_Cetak || spk.kurang_cetak || qtyOrder - sudahCetak,
    );

    formData.value.details.push({
        nomor_spk: nomorSpk,
        nama_spk: spk.Nama_SPK || spk.Nama || "No Name",
        panjang_spk: parseFloat(spk.Panjang || spk.panjang || 0),
        lebar_spk: parseFloat(spk.Lebar || spk.lebar || 0),
        jumlah: qtyOrder,
        sudahcetak: sudahCetak,
        kurangcetak_asli: kurangCetak,
        tile: 1, // ðŸ”¥ DEFAULT TILE 1
        padding: "0.03",
        orientasi: "lebar",
        cetak1: 0,
        cetak2: 0,
        cetak3: 0,
        cetak4: 0,
        cetak5: 0,
        cetak6: 0,
        cetak7: 0,
        totalcetak: 0,
        kurangcetak: kurangCetak,
    });

    recalculateCombine();
};

const validateBeforeSave = (status: string) => {
    if (isSaving.value || isSubmitting.value) return;
    if (!formData.value.mesin_kode) {
        return toast.error(
            "Silakan pilih mesin terlebih dahulu pada kolom kiri!",
        );
    }
    if (
        formData.value.panjang_bs === null ||
        formData.value.panjang_bs === "" ||
        formData.value.lebar_bs === null ||
        formData.value.lebar_bs === ""
    ) {
        return toast.error("Gagal Simpan: Ukuran BS tidak boleh kosong!");
    }
    if (!validateStokBahan()) return;

    if (status === "POSTED" && !isFormValid.value) {
        return toast.error(
            "Cek kelengkapan data & pastikan sisa stok memadai.",
        );
    }

    formData.value.lstatus = status;
    showSaveDialog.value = true;
};

const recalculateCombine = () => {
    formData.value.details.forEach((d: any) => {
        const newTotalCetak =
            (parseInt(d.cetak1) || 0) +
            (parseInt(d.cetak2) || 0) +
            (parseInt(d.cetak3) || 0) +
            (parseInt(d.cetak4) || 0) +
            (parseInt(d.cetak5) || 0) +
            (parseInt(d.cetak6) || 0) +
            (parseInt(d.cetak7) || 0);

        d.totalcetak = newTotalCetak;
        d.total_pernah_cetak = (d.sudahcetak || 0) + d.totalcetak;
        d.kurangcetak = Math.max(0, (d.jumlah || 0) - d.total_pernah_cetak);
    });

    nextTick(() => {
        autoFillLayout(true);
    });
};

onMounted(async () => {
    if (isEditMode.value) {
        await fetchData();
        if (formData.value.barcode_input) {
            await handleBarcodeScan(true);
        } else {
            recalculateCombine();
        }
    }
});
</script>

<template>
    <BaseForm
        :title="(isEditMode ? 'Ubah' : 'Baru') + ' LHK Produksi Tekstil'"
        menu-id="5507"
        :icon="IconBuildingFactory"
        :is-loading="isLoading"
        :is-saving="isSaving"
        v-model:showSaveDialog="showSaveDialog"
        v-model:showCancelDialog="showCancelDialog"
        v-model:showCloseDialog="showCloseDialog"
        @confirm-save="executeSave"
        @confirm-cancel="executeCancel"
        @confirm-close="executeClose"
    >
        <template #header-actions>
            <v-btn
                size="small"
                color="orange-darken-3"
                variant="tonal"
                class="mr-2"
                :loading="isSaving || isSubmitting"
                :disabled="isSaving || isSubmitting"
                @click="validateBeforeSave('DRAFT')"
            >
                <v-icon start size="16">mdi-content-save-edit-outline</v-icon>
                Simpan Draft
            </v-btn>
            <v-btn
                size="small"
                color="primary"
                variant="elevated"
                class="mr-2"
                :loading="isSaving || isSubmitting"
                :disabled="isSaving || isSubmitting"
                @click="validateBeforeSave('POSTED')"
            >
                <v-icon start size="16">mdi-send-check-outline</v-icon> Simpan
                Posted
            </v-btn>
            <v-btn
                size="small"
                variant="outlined"
                class="mr-2"
                @click="showCancelDialog = true"
                >Batal</v-btn
            >
            <v-btn
                size="small"
                variant="tonal"
                color="error"
                @click="showCloseDialog = true"
            >
                <template #prepend><IconX :size="15" /></template> Tutup
            </v-btn>
        </template>

        <template #left-column>
            <div class="desktop-form-section header-section">
                <div class="text-caption font-weight-bold mb-3 text-primary">
                    INFORMASI UTAMA LHK
                </div>

                <v-text-field
                    label="Nomor LHK"
                    v-model="formData.nomor"
                    readonly
                    density="compact"
                    variant="outlined"
                    class="mb-2"
                    hide-details
                />
                <v-text-field
                    label="Tanggal"
                    v-model="formData.tanggal"
                    type="date"
                    density="compact"
                    variant="outlined"
                    class="mb-2"
                    hide-details
                />
                <v-row dense class="mb-2">
                    <v-col cols="6">
                        <v-text-field
                            label="Shift"
                            v-model.number="formData.shift"
                            type="number"
                            density="compact"
                            variant="outlined"
                            hide-details
                        />
                    </v-col>
                    <v-col cols="6">
                        <v-text-field
                            label="Gudang"
                            v-model="formData.gdgKode"
                            readonly
                            density="compact"
                            variant="outlined"
                            bg-color="#f5f5f5"
                            append-inner-icon="mdi-lock-outline"
                            hide-details
                        />
                    </v-col>
                </v-row>
                <v-text-field
                    label="Pilih Mesin"
                    v-model="formData.mesin_nama"
                    readonly
                    density="compact"
                    variant="outlined"
                    class="mb-4 cursor-pointer"
                    hide-details
                    @click="lookup.mesin = true"
                >
                    <template #append-inner>
                        <IconSearch
                            :size="16"
                            style="cursor: pointer"
                            @click="lookup.mesin = true"
                        />
                    </template>
                </v-text-field>

                <div class="text-caption font-weight-bold mb-2 text-success">
                    INFORMASI MEDIA / ROLL
                </div>
                <v-text-field
                    label="Scan Barcode Roll"
                    v-model="formData.barcode_input"
                    @keyup.enter="handleBarcodeScan()"
                    density="compact"
                    variant="outlined"
                    class="mb-2"
                    hide-details
                >
                    <template #prepend-inner
                        ><IconBarcode :size="16" class="text-grey"
                    /></template>
                </v-text-field>
                <v-text-field
                    label="Nama Barang"
                    v-model="formData.brg_nama"
                    readonly
                    density="compact"
                    variant="filled"
                    class="mb-2"
                    hide-details
                />

                <v-row dense class="mb-2">
                    <v-col cols="6">
                        <v-text-field
                            :label="
                                satuanBahan === 'ROLL'
                                    ? 'Stok (Meter)'
                                    : 'Stok (Yard)'
                            "
                            :model-value="formData.panjang_bahan"
                            readonly
                            density="compact"
                            variant="filled"
                            hide-details
                            :suffix="satuanBahan === 'ROLL' ? 'M' : 'Yrd'"
                        />
                    </v-col>
                    <v-col cols="6">
                        <v-text-field
                            label="Konversi (M)"
                            :model-value="panjangBhanDalamMeter.toFixed(2)"
                            readonly
                            density="compact"
                            variant="filled"
                            hide-details
                            suffix="M"
                            color="green"
                        />
                    </v-col>
                </v-row>

                <v-text-field
                    label="Lebar Bahan (M)"
                    :model-value="formData.lebar_bahan"
                    readonly
                    density="compact"
                    variant="filled"
                    hide-details
                    suffix="M"
                />
            </div>
        </template>

        <template #right-column>
            <div class="d-flex flex-column min-h-full pb-8">
                <v-card border flat class="d-flex flex-column table-card mb-4">
                    <div
                        class="pa-2 bg-blue-grey-lighten-5 d-flex align-center"
                    >
                        <span
                            class="text-subtitle-2 font-weight-bold text-blue-grey-darken-4"
                            >Daftar Pekerjaan Tekstil (Combine SPK)</span
                        >
                        <v-spacer />
                        <v-text-field
                            v-model="formData.barcode_spk"
                            placeholder="Scan Barcode SPK..."
                            density="compact"
                            variant="outlined"
                            hide-details
                            style="max-width: 220px"
                            @keyup.enter="handleSpkScan"
                            :disabled="!formData.brg_kode"
                        >
                            <template #append-inner
                                ><IconSearch
                                    :size="16"
                                    style="cursor: pointer"
                                    @click="lookup.spk = true"
                            /></template>
                        </v-text-field>
                    </div>

                    <div class="table-container grow">
                        <table class="manksi-table">
                            <thead>
                                <tr>
                                    <th width="35">No</th>
                                    <th width="110">Nomor SPK</th>
                                    <th>Nama Pekerjaan</th>
                                    <th width="65">P (M)</th>
                                    <th width="65">L (M)</th>
                                    <th width="120">Orientasi</th>
                                    <th width="65">Pad(M)</th>
                                    <th width="60">Tile</th>
                                    <th width="55">Order</th>
                                    <th width="60">Sdh Ctk</th>
                                    <th width="60">Kurang</th>
                                    <th v-for="n in 7" :key="n" width="40">
                                        C{{ n }}
                                    </th>
                                    <th width="65">Tot Ctk</th>
                                    <th width="60">Sisa</th>
                                    <th width="35"></th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr
                                    v-for="(item, index) in formData.details"
                                    :key="index"
                                >
                                    <td class="text-center">
                                        {{ Number(index) + 1 }}
                                    </td>
                                    <td class="fw-bold text-blue-darken-4 px-2">
                                        {{ item.nomor_spk }}
                                    </td>
                                    <td
                                        class="px-2 text-truncate"
                                        style="max-width: 120px"
                                        :title="item.nama_spk"
                                    >
                                        {{ item.nama_spk }}
                                    </td>
                                    <td class="text-right px-2">
                                        {{
                                            Number(
                                                item.panjang_spk || 0,
                                            ).toFixed(2)
                                        }}
                                    </td>
                                    <td class="text-right px-2">
                                        {{
                                            Number(item.lebar_spk || 0).toFixed(
                                                2,
                                            )
                                        }}
                                    </td>
                                    <td>
                                        <select
                                            v-model="item.orientasi"
                                            class="cell-input"
                                            @change="recalculateCombine"
                                        >
                                            <option value="lebar">
                                                L. SPK (Normal)
                                            </option>
                                            <option value="panjang">
                                                P. SPK (Diputar)
                                            </option>
                                        </select>
                                    </td>
                                    <td class="bg-blue-lighten-5">
                                        <input
                                            type="text"
                                            :value="item.padding"
                                            class="cell-input tr font-weight-bold"
                                            @input="
                                                handlePaddingTableInput(
                                                    $event,
                                                    item,
                                                )
                                            "
                                        />
                                    </td>
                                    <td class="bg-yellow-lighten-5">
                                        <input
                                            type="number"
                                            v-model.number="item.tile"
                                            class="cell-input tr font-weight-bold"
                                            @input="recalculateCombine"
                                            @wheel="
                                                (
                                                    $event.target as HTMLInputElement
                                                )?.blur()
                                            "
                                        />
                                    </td>
                                    <td
                                        class="text-right px-2 text-grey-darken-1"
                                    >
                                        {{ item.jumlah }}
                                    </td>
                                    <td
                                        class="text-right px-2 text-blue-darken-1 font-weight-bold"
                                    >
                                        {{ item.sudahcetak }}
                                    </td>
                                    <td class="text-right px-2">
                                        {{ item.kurangcetak_asli }}
                                    </td>
                                    <td v-for="n in 7" :key="n">
                                        <input
                                            type="number"
                                            v-model.number="item['cetak' + n]"
                                            class="cell-input tr font-weight-bold"
                                            @input="recalculateCombine"
                                            @wheel="
                                                (
                                                    $event.target as HTMLInputElement
                                                )?.blur()
                                            "
                                        />
                                    </td>
                                    <td
                                        class="text-center bg-yellow-lighten-5 font-weight-bold text-primary"
                                    >
                                        {{ item.totalcetak }}
                                    </td>
                                    <td
                                        class="text-right px-2 font-weight-bold"
                                        :class="
                                            item.kurangcetak < 0
                                                ? 'text-red'
                                                : ''
                                        "
                                    >
                                        {{ item.kurangcetak }}
                                    </td>
                                    <td class="text-center">
                                        <v-btn
                                            size="x-small"
                                            variant="text"
                                            color="error"
                                            @click="
                                                formData.details.splice(
                                                    index,
                                                    1,
                                                );
                                                recalculateCombine();
                                            "
                                        >
                                            <IconTrash :size="14" />
                                        </v-btn>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    <div
                        class="pa-3 bg-grey-lighten-4 border-t footer-container"
                    >
                        <v-row dense align="center">
                            <v-col cols="12" sm="5" class="border-e pr-4">
                                <v-row no-gutters>
                                    <v-col cols="6" class="border-e pr-2">
                                        <span
                                            class="text-caption text-grey-darken-1 font-weight-bold"
                                            >Sisa Otomatis:</span
                                        >
                                        <div
                                            class="text-h6 font-weight-black lh-1"
                                            :class="
                                                sisaStokOtomatisM < 0
                                                    ? 'text-red'
                                                    : 'text-success'
                                            "
                                        >
                                            {{ sisaStokOtomatisM.toFixed(2) }} M
                                        </div>
                                        <div
                                            v-if="satuanBahan !== 'ROLL'"
                                            class="text-caption font-weight-bold mb-1"
                                            :class="
                                                sisaStokOtomatisM < 0
                                                    ? 'text-red-darken-3'
                                                    : 'text-orange-darken-3'
                                            "
                                        >
                                            (=
                                            {{ sisaStokOtomatisYrd.toFixed(2) }}
                                            Yrd)
                                        </div>
                                        <span class="text-xxs text-grey d-block"
                                            >P. Pakai Sistem:
                                            {{
                                                totalPanjangTerpakai.toFixed(2)
                                            }}
                                            M</span
                                        >
                                        <span class="text-xxs text-red d-block"
                                            >P. BS Terpotong:
                                            {{
                                                (
                                                    parseFloat(
                                                        formData.panjang_bs as any,
                                                    ) || 0
                                                ).toFixed(2)
                                            }}
                                            M</span
                                        >
                                    </v-col>
                                    <v-col cols="6" class="pl-2">
                                        <span
                                            class="text-caption font-weight-bold text-blue-darken-3"
                                            >Sisa Manual (Fisik):</span
                                        >
                                        <v-text-field
                                            v-model.number="
                                                formData.sisa_panjang_manual
                                            "
                                            placeholder="Isi sisa..."
                                            density="compact"
                                            variant="outlined"
                                            hide-details
                                            type="number"
                                            class="mt-1 bg-white"
                                            suffix="M"
                                        />
                                    </v-col>
                                </v-row>
                            </v-col>
                            <v-col cols="12" sm="3" class="border-e px-4">
                                <span
                                    class="text-caption text-grey-darken-1 font-weight-bold"
                                    >Sisa Samping Lebar:</span
                                >
                                <div
                                    class="text-h6 text-teal-darken-2 font-weight-black"
                                >
                                    {{
                                        (
                                            formData.lebar_bahan -
                                            totalLebarGabungan
                                        ).toFixed(2)
                                    }}
                                    M
                                </div>
                            </v-col>
                            <v-col cols="12" sm="4" class="pl-4">
                                <span
                                    class="text-caption font-weight-bold text-red"
                                    >BS / Rusak (Mengurangi Bahan):</span
                                >
                                <v-row dense class="mt-1">
                                    <v-col cols="6">
                                        <v-text-field
                                            :model-value="formData.panjang_bs"
                                            label="P. BS (M)"
                                            density="compact"
                                            variant="outlined"
                                            hide-details="auto"
                                            class="bg-white"
                                            @input="handleBsInput"
                                        />
                                    </v-col>
                                    <v-col cols="6">
                                        <v-text-field
                                            :model-value="formData.lebar_bs"
                                            label="L. BS (M)"
                                            density="compact"
                                            variant="outlined"
                                            hide-details="auto"
                                            class="bg-white"
                                            @input="handleBsLebarInput"
                                        />
                                    </v-col>
                                </v-row>
                            </v-col>
                        </v-row>
                    </div>
                </v-card>

                <v-card flat border class="shrink-0">
                    <v-card-title
                        class="text-subtitle-2 bg-grey-lighten-3 pa-2 d-flex align-center"
                    >
                        Visualisasi Layout Produksi Tekstil (Meter Base)
                        <v-spacer />
                        <v-btn
                            size="x-small"
                            color="indigo"
                            class="mr-2"
                            @click="autoFillLayout(false)"
                        >
                            <template #prepend
                                ><IconSparkles :size="12"
                            /></template>
                            Auto Optimize
                        </v-btn>
                        <v-btn
                            size="x-small"
                            color="grey-darken-1"
                            variant="outlined"
                            @click="resetManualLayout"
                        >
                            <template #prepend
                                ><IconRefresh :size="12"
                            /></template>
                            Reset Position
                        </v-btn>
                    </v-card-title>
                    <v-card-text class="pa-2 scroll-wrapper">
                        <div class="roll-horizontal-wrapper">
                            <div class="roll-material" :style="rollStyle">
                                <div
                                    v-for="(block, bIdx) in layoutRows"
                                    :key="bIdx"
                                    class="product-unit"
                                    :style="{
                                        width: `${block.w * SCALE}px`,
                                        height: `${block.h * SCALE}px`,
                                        position: 'absolute',
                                        left: `${(manualOffsets[bIdx]?.x !== undefined ? manualOffsets[bIdx].x : block.x) * SCALE}px`,
                                        top: `${(manualOffsets[bIdx]?.y !== undefined ? manualOffsets[bIdx].y : block.y) * SCALE}px`,
                                        transform: `rotate(${manualOffsets[bIdx]?.rotation ?? 0}deg)`,
                                        backgroundColor: '#e3f2fd',
                                        border: '1px solid #2196f3',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        cursor: 'move',
                                        zIndex: 10,
                                    }"
                                    @mousedown="startDrag($event, bIdx)"
                                    @dblclick="handleDoubleClick(bIdx)"
                                >
                                    <span
                                        class="box-label"
                                        :class="{
                                            'label-rotated': block.rotated,
                                        }"
                                    >
                                        {{ block.label }}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </v-card-text>
                </v-card>
            </div>
        </template>
    </BaseForm>

    <MesinLookupView
        :is-visible="lookup.mesin"
        @close="lookup.mesin = false"
        @select="handleMesinSelect"
    />
    <SpkLookupView
        :is-visible="lookup.spk"
        @close="lookup.spk = false"
        @select="injectSpkObject"
    />

    <!-- MODAL BARCODE SISA SAMPING (AFAL BARU) â€” bisa langsung Cetak & Download -->
    <v-dialog
        v-model="afalModal.show"
        max-width="650px"
        persistent
        teleport="body"
        style="z-index: 99999 !important"
    >
        <v-card>
            <v-card-title
                class="bg-blue-darken-1 text-white d-flex align-center pa-3"
            >
                <v-icon start>mdi-information-variant-box</v-icon>
                <span class="font-weight-bold"
                    >Barcode Sisa Samping (Afal)!</span
                >
                <v-spacer />
                <v-btn
                    icon="mdi-close"
                    variant="text"
                    size="small"
                    color="white"
                    @click="closeAfalModal"
                />
            </v-card-title>

            <v-card-text class="pa-4">
                <p class="mb-3 text-body-2 text-grey-darken-1">
                    Sistem mendeteksi sisa bahan samping dengan lebar > 0.50M
                    yang layak pakai. Stok afal baru telah dibuat â€” silakan
                    cetak/download labelnya:
                </p>

                <v-table class="bg-white border rounded mb-4" density="compact">
                    <tbody>
                        <tr>
                            <td
                                class="font-weight-bold bg-blue-lighten-5 text-blue-darken-3"
                                width="38%"
                            >
                                Barcode Baru
                            </td>
                            <td
                                class="text-blue-darken-2 font-weight-black text-subtitle-1"
                            >
                                {{ afalModal.data.barcode }}
                            </td>
                        </tr>
                        <tr>
                            <td
                                class="font-weight-bold bg-blue-lighten-5 text-blue-darken-3"
                            >
                                Ukuran (P x L)
                            </td>
                            <td>
                                {{ afalModal.data.panjang?.toFixed(2) }} M x
                                {{ afalModal.data.lebar?.toFixed(2) }} M
                            </td>
                        </tr>
                    </tbody>
                </v-table>

                <div
                    class="d-flex flex-column align-center bg-grey-lighten-4 pa-4 rounded border"
                >
                    <div class="label-box-preview bg-white">
                        <div class="border-inner">
                            <div class="top-row-preview">
                                <img
                                    v-if="afalModal.qrImage"
                                    :src="afalModal.qrImage"
                                    class="qr-img-preview"
                                />
                                <div
                                    v-else
                                    class="qr-img-preview d-flex align-center justify-center bg-grey-lighten-3"
                                    style="font-size: 10px"
                                >
                                    QR
                                </div>
                                <div class="info-column">
                                    <div class="qr-text">
                                        {{ afalModal.data.barcode }}
                                    </div>
                                    <div class="dimens-text">
                                        Dimensi:
                                        {{ afalModal.data.panjang?.toFixed(2) }}
                                        x
                                        {{ afalModal.data.lebar?.toFixed(2) }} M
                                    </div>
                                    <div class="text-caption text-grey">
                                        AFAL â€” Sisa Samping
                                    </div>
                                </div>
                            </div>
                            <div class="divider-preview"></div>
                            <div class="product-name-preview">BAHAN AFAL</div>
                        </div>
                    </div>
                    <div
                        v-if="!afalModal.qrImage"
                        class="text-caption text-orange mt-2"
                    >
                        QR gagal dimuat, tetap bisa cetak/download (akan coba
                        lagi).
                    </div>
                    <div class="d-flex ga-2 mt-3">
                        <v-btn
                            color="primary"
                            variant="elevated"
                            prepend-icon="mdi-printer"
                            :loading="!afalModal.qrImage"
                            @click="printAfalLabel"
                            >Cetak Label</v-btn
                        >
                        <v-btn
                            color="teal"
                            variant="tonal"
                            prepend-icon="mdi-download"
                            :loading="isDownloadingJpg"
                            @click="handleDownloadJpg"
                            >Download JPG</v-btn
                        >
                    </div>
                </div>
            </v-card-text>

            <v-card-actions class="bg-grey-lighten-4 pa-2 justify-end">
                <v-btn
                    color="blue-darken-2"
                    variant="elevated"
                    @click="closeAfalModal"
                >
                    Paham & Lanjutkan
                </v-btn>
            </v-card-actions>
        </v-card>
    </v-dialog>
</template>

<style scoped>
.manksi-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 11px;
}
.manksi-table th {
    background: #1565c0;
    color: white;
    padding: 6px;
    position: sticky;
    top: 0;
    z-index: 2;
    border: 1px solid rgba(255, 255, 255, 0.2);
}
.manksi-table td {
    border: 1px solid #e0e0e0;
    padding: 0;
    height: 28px;
}
.cell-input {
    width: 100%;
    height: 100%;
    border: none;
    padding: 0 4px;
    outline: none;
    background: transparent;
}
.cell-input:focus {
    background: #e3f2fd;
}
.table-container {
    overflow: auto;
    max-height: 380px;
    min-height: 120px;
    scrollbar-width: thin;
    scrollbar-color: #90caf9 #f5f5f5;
}
.tr {
    text-align: right;
}
.fw-bold {
    font-weight: bold;
}
.footer-container {
    border-top: 2px solid #bbb !important;
}
.scroll-wrapper {
    overflow-x: auto;
    background-color: #f8f9fa;
    min-height: 140px;
    max-height: 200px;
    border: 1px inset #ddd;
}
.product-unit {
    user-select: none;
    touch-action: none;
    transform-origin: center center;
}
.box-label {
    font-size: 9px;
    font-weight: bold;
    white-space: nowrap;
    text-overflow: ellipsis;
    overflow: hidden;
    padding: 2px;
}
.label-rotated {
    writing-mode: vertical-rl;
    transform: rotate(180deg);
}

/* Preview Afal — mirip CreateBarcode */
.label-box-preview {
    width: 7cm;
    height: 5cm;
    padding: 2mm;
    box-sizing: border-box;
    border: 1px solid #ddd;
}
.border-inner {
    border: 1px solid black;
    height: 100%;
    display: flex;
    flex-direction: column;
    padding: 2mm;
}
.top-row-preview {
    display: flex;
    gap: 10px;
}
.qr-img-preview {
    width: 1.5cm;
    height: 1.5cm;
}
.qr-text {
    font-weight: bold;
    font-size: 8pt;
    word-break: break-all;
}
.dimens-text {
    font-size: 9pt;
    font-weight: bold;
    margin-top: 5px;
}
.divider-preview {
    border-top: 1px dashed #000;
    margin: 2mm 0;
}
.product-name-preview {
    font-size: 11pt;
    font-weight: bold;
    text-align: center;
    flex-grow: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    text-transform: uppercase;
}
</style>
