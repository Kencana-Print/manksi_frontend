<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import BaseForm from "@/components/BaseForm.vue";
import { useForm } from "@/composables/useForm";
import {
    IconShoppingCartDown,
    IconPlus,
    IconTrash,
    IconSearch,
    IconTable,
    IconMapPin,
    IconReceipt2,
    IconAlertTriangle,
    IconClock,
    IconCircleCheck,
    IconCircleX,
} from "@tabler/icons-vue";
import api from "@/services/api";

// Modals Lookup Manksi
import SpkLookupModal from "@/modal/SpkLookupModal.vue";
import SupplierSearchModal from "@/components/lookups/SupplierSearchModal.vue";
import AccountSearchModal from "@/components/lookups/AccountSearchModal.vue";

const route = useRoute();
const router = useRouter();

// --- Interfaces ---
interface CustomDetailItem {
    nama: string;
    panjang: number;
    lebar: number;
    jumlah: number;
    harga: number;
    total: number;
}

interface AlokasiItem {
    alokasi: boolean;
    kota: string;
    jumlah: number;
}

interface DPItem {
    tanggal: string;
    nominal: number;
    akun: string;
    namabank: string;
    link: string;
}

interface PoExtForm {
    nomor: string;
    tanggal: string;
    deadline: string;
    cab: string;
    spkNomor: string;
    spkNama: string;
    divisi: string;
    joKode: string;
    joNama: string;
    bahan: string;
    ukuran: string;
    panjang: number;
    lebar: number;
    jumlahSpk: number;
    finishing: string;
    bahanSendiri: boolean;
    hasGambar: boolean;
    supKode: string;
    supNama: string;
    supAlamat: string;
    supKota: string;
    jmlPo: number;
    tarif: number;
    tipeHitung: "meter" | "pcs";
    totalHeader: number;
    keterangan: string;
    custom: CustomDetailItem[];
    alokasi: AlokasiItem[];
    dp: DPItem[];
}

const API_URL = "/mmt/po-external-mmt";

// --- Status Approval / Lock States (xminta5 replika Delphi) ---
// WAIT  = Pin diajukan, menunggu acc
// ACC   = Pin sudah di-acc, siap pakai (periode keuangan)
// TOLAK = Ditolak approver
// ""    = Bebas edit
const xminta5 = ref<"WAIT" | "ACC" | "TOLAK" | "">("");
const xurut5 = ref(0);
const zCloseDate = ref<string | null>(null);

// --- UI Controls ---
const activeTab = ref<"custom" | "alokasi" | "dp">("custom");
const isSpkModalVisible = ref(false);
const isSupplierModalVisible = ref(false);
const isAccountModalVisible = ref(false);
const selectedDpIndex = ref<number | null>(null);

const initialData: PoExtForm = {
    nomor: "AUTO",
    tanggal: new Date().toISOString().substring(0, 10),
    deadline: new Date().toISOString().substring(0, 10),
    cab: "P05",
    spkNomor: "",
    spkNama: "",
    divisi: "",
    joKode: "",
    joNama: "",
    bahan: "",
    ukuran: "",
    panjang: 0,
    lebar: 0,
    jumlahSpk: 0,
    finishing: "",
    bahanSendiri: true,
    hasGambar: false,
    supKode: "",
    supNama: "",
    supAlamat: "",
    supKota: "",
    jmlPo: 0,
    tarif: 0,
    tipeHitung: "meter",
    totalHeader: 0,
    keterangan: "",
    custom: [{ nama: "", panjang: 0, lebar: 0, jumlah: 0, harga: 0, total: 0 }],
    alokasi: [{ alokasi: false, kota: "", jumlah: 0 }],
    dp: [{ tanggal: "", nominal: 0, akun: "", namabank: "", link: "" }],
};

// --- Computed: Cabang Options ---
const cabangOptions = computed(() => {
    const base = ["P02", "P04", "P05"];
    const cur = String(formData.value.cab || "")
        .trim()
        .toUpperCase();
    if (cur && !base.includes(cur)) return [...base, cur];
    return base;
});

// --- Computed: Status Lock / Read-Only ---
const isPeriodClosed = computed(() => {
    if (!zCloseDate.value) return false;
    try {
        return (
            new Date(formData.value.tanggal) < new Date(zCloseDate.value) &&
            xminta5.value !== "ACC"
        );
    } catch {
        return false;
    }
});

const isFormReadOnly = computed(() => {
    return ["WAIT", "TOLAK"].includes(xminta5.value) || isPeriodClosed.value;
});

// --- Formula Kalkulasi Total Header (Replika Delphi) ---
const hitungKalkulasiHeader = () => {
    const { joKode, divisi, panjang, lebar, jmlPo, tarif, tipeHitung } =
        formData.value;
    let tot = 0;

    if (tipeHitung === "pcs" || joKode === "LM" || joKode === "LN") {
        tot = jmlPo * tarif;
    } else if (
        divisi === "MMT" ||
        divisi === "5" ||
        (divisi as unknown as number) === 5
    ) {
        tot = panjang * lebar * jmlPo * tarif;
    } else {
        tot = panjang * jmlPo * tarif;
    }
    formData.value.totalHeader = Math.round(tot);
};

// --- Formula Kalkulasi Baris Item Custom ---
const hitungRowCustom = (index: number) => {
    const item = formData.value.custom[index];
    if (!item) return;
    const { joKode, divisi, tipeHitung } = formData.value;
    let tot = 0;

    if (tipeHitung === "pcs" || joKode === "LM" || joKode === "LN") {
        tot = item.jumlah * item.harga;
    } else if (
        divisi === "MMT" ||
        divisi === "5" ||
        (divisi as unknown as number) === 5
    ) {
        tot = item.panjang * item.lebar * item.jumlah * item.harga;
    } else {
        tot = item.panjang * item.jumlah * item.harga;
    }
    item.total = Math.round(tot);
};

// --- useForm: Fetch & Submit via composable Manksi standar ---
const {
    isEditMode,
    isLoading,
    isSaving,
    formData,
    showSaveDialog,
    showCancelDialog,
    showCloseDialog,
    executeSave,
    executeCancel,
    executeClose,
} = useForm<PoExtForm>({
    menuId: "5505",
    initialData,
    fetchApi: async () => {
        const nomor = route.params.nomor;
        const res = await api.get(
            `${API_URL}/${encodeURIComponent(String(nomor))}`,
        );
        const data = res.data?.data || res.data;
        const h = data.header || data;

        // Cek status PIN approval
        try {
            const pinRes = await api.get(
                `${API_URL}/check-pin/${encodeURIComponent(String(nomor))}`,
            );
            const pinData = pinRes.data?.data || pinRes.data;
            if (pinData) {
                xurut5.value = Number(pinData.pin_urut) || 0;
                const acc = pinData.pin_acc ?? "";
                const dipakai = pinData.pin_dipakai ?? "";
                if (acc === "" && dipakai === "") xminta5.value = "WAIT";
                else if (acc === "Y" && dipakai === "") xminta5.value = "ACC";
                else if (acc === "N") xminta5.value = "TOLAK";
                else xminta5.value = "";
            } else {
                xminta5.value = "";
                xurut5.value = 0;
            }
        } catch {
            xminta5.value = "";
        }

        // Alokasi Kota
        const rawAlokasi = data.alokasi || [];
        const loadedAlokasi: AlokasiItem[] =
            rawAlokasi.length > 0
                ? rawAlokasi.map((a: any) => ({
                      alokasi: true,
                      kota: a.poeda_kota || a.kota || "",
                      jumlah: Number(a.poeda_jumlah || a.jumlah || 0),
                  }))
                : [{ alokasi: false, kota: "", jumlah: 0 }];

        // Item Custom
        const rawCustom = data.custom || [];
        const loadedCustom: CustomDetailItem[] =
            rawCustom.length > 0
                ? rawCustom.map((c: any) => ({
                      nama: c.poed_nama || "",
                      panjang: Number(c.poed_panjang || 0),
                      lebar: Number(c.poed_lebar || 0),
                      jumlah: Number(c.poed_jumlah || 0),
                      harga: Number(c.poed_harga || 0),
                      total: Number(c.poed_total || 0),
                  }))
                : [
                      {
                          nama: "",
                          panjang: 0,
                          lebar: 0,
                          jumlah: 0,
                          harga: 0,
                          total: 0,
                      },
                  ];

        // Uang Muka / DP
        const rawDp = data.dp || [];
        const loadedDp: DPItem[] =
            rawDp.length > 0
                ? rawDp.map((d: any) => ({
                      tanggal: d.poed2_tanggal
                          ? String(d.poed2_tanggal).substring(0, 10)
                          : "",
                      nominal: Number(d.poed2_nominal || 0),
                      akun: d.poed2_akun || "",
                      namabank: d.rek_nama || "",
                      link: d.poed2_link || "",
                  }))
                : [
                      {
                          tanggal: "",
                          nominal: 0,
                          akun: "",
                          namabank: "",
                          link: "",
                      },
                  ];

        return {
            nomor: h.poe_nomor || String(nomor),
            tanggal: h.poe_tanggal
                ? String(h.poe_tanggal).substring(0, 10)
                : initialData.tanggal,
            deadline: h.poe_dateline
                ? String(h.poe_dateline).substring(0, 10)
                : initialData.deadline,
            cab: h.poe_cab || "P05",
            spkNomor: h.poe_spk_nomor || "",
            spkNama: h.spk_nama || "",
            divisi: String(h.divisi || h.spk_divisi || ""),
            joKode: h.spk_jo_kode || "",
            joNama: h.jo_nama || "",
            bahan: h.spk_kain || "",
            ukuran: h.spk_ukuran || "",
            panjang: Number(h.spk_panjang || 0),
            lebar: Number(h.spk_lebar || 0),
            jumlahSpk: Number(h.spk_jumlah || 0),
            finishing: h.poe_finishing || "",
            bahanSendiri: h.poe_bahansendiri === "Y",
            hasGambar:
                h.has_gambar === "Y" ||
                h.design_done === "Y" ||
                h.design_baru === "Y",
            supKode: h.poe_sup || "",
            supNama: h.Sup_nama || "",
            supAlamat: h.Sup_alamat || "",
            supKota: h.Sup_kota || "",
            jmlPo: Number(h.poe_jumlah || 0),
            tarif: Number(h.poe_tarif || 0),
            tipeHitung: h.poe_tipe_hitung === "pcs" ? "pcs" : "meter",
            totalHeader: Number(h.poe_total || 0),
            keterangan: h.poe_ket || "",
            custom: loadedCustom,
            alokasi: loadedAlokasi,
            dp: loadedDp,
        };
    },
    submitApi: async (dataToSave: PoExtForm) => {
        // Validasi wajib (replika Delphi)
        if (!dataToSave.spkNomor)
            throw new Error("Nomor SPK harus diisi terlebih dahulu.");
        if (!dataToSave.supKode)
            throw new Error(
                "Kode Supplier / Rekanan harus diisi terlebih dahulu.",
            );
        if (dataToSave.jmlPo <= 0)
            throw new Error("Jumlah PO harus lebih dari 0.");
        if (dataToSave.tarif <= 0)
            throw new Error("Tarif / Harga PO harus lebih dari 0.");
        if (
            dataToSave.deadline &&
            dataToSave.tanggal &&
            dataToSave.deadline < dataToSave.tanggal
        ) {
            throw new Error(
                "Tanggal Dateline tidak boleh mendahului tanggal order.",
            );
        }

        const isEdit = Boolean(
            route.params.nomor ||
            (dataToSave.nomor && dataToSave.nomor !== "AUTO"),
        );

        // Ambil kdUser dari storage
        let userPengguna = "";
        try {
            userPengguna = localStorage.getItem("kdUser") || "";
            if (!userPengguna) {
                const userObj = JSON.parse(
                    localStorage.getItem("user") || "{}",
                );
                userPengguna = userObj.kdUser || userObj.username || "";
            }
        } catch (_) {}

        const payload = {
            isEditMode: isEdit,
            poe_nomor:
                isEdit && dataToSave.nomor !== "AUTO" ? dataToSave.nomor : null,
            poe_tanggal: dataToSave.tanggal,
            poe_dateline: dataToSave.deadline,
            poe_spk_nomor: dataToSave.spkNomor,
            poe_cab: dataToSave.cab || "P05",
            poe_sup: dataToSave.supKode,
            poe_ket: dataToSave.keterangan,
            poe_finishing: dataToSave.finishing,
            poe_jumlah: dataToSave.jmlPo,
            poe_tarif: dataToSave.tarif,
            poe_total: dataToSave.totalHeader,
            poe_tipe_hitung: dataToSave.tipeHitung,
            poe_bahansendiri: dataToSave.bahanSendiri ? "Y" : "N",
            currentUser: userPengguna,
            xminta5: xminta5.value,
            xurut5: xurut5.value,
            alokasi: dataToSave.alokasi.filter(
                (a) => a.alokasi && a.kota && a.kota.trim() !== "",
            ),
            dp: dataToSave.dp.filter((d) => d.tanggal && Number(d.nominal) > 0),
            custom: dataToSave.custom.filter(
                (c) => c.nama && c.nama.trim() !== "",
            ),
        };
        return await api.post(`${API_URL}/save`, payload);
    },
    onSuccessRoute: "/mmt/finance/po-external",
});

// --- Auto-kalkulasi totalHeader ---
watch(
    () => [
        formData.value.jmlPo,
        formData.value.tarif,
        formData.value.panjang,
        formData.value.lebar,
        formData.value.joKode,
        formData.value.divisi,
        formData.value.tipeHitung,
    ],
    () => hitungKalkulasiHeader(),
);

// --- Keyboard Shortcuts (F-Keys) ---
const handleKeydown = (e: KeyboardEvent) => {
    if (e.key === "F1") {
        e.preventDefault();
        if (!isFormReadOnly.value) isSpkModalVisible.value = true;
    }
};

onMounted(async () => {
    window.addEventListener("keydown", handleKeydown);

    // Jika mode tambah baru: cek date-close
    if (!route.params.nomor) {
        try {
            const res = await api.get(`${API_URL}/date-close/PO EXT MMT`);
            zCloseDate.value =
                res.data?.closeDate || res.data?.data?.closeDate || null;
        } catch {
            /* ignore */
        }
    }
});

onUnmounted(() => {
    window.removeEventListener("keydown", handleKeydown);
});

// --- Detail Row Handlers: Custom Items ---
const addRowCustom = () => {
    formData.value.custom.push({
        nama: "",
        panjang: 0,
        lebar: 0,
        jumlah: 0,
        harga: 0,
        total: 0,
    });
};

const removeRowCustom = (idx: number) => {
    formData.value.custom.splice(idx, 1);
    if (formData.value.custom.length === 0) addRowCustom();
};

const totalCustomSum = computed(() =>
    formData.value.custom.reduce((s, it) => s + (Number(it.total) || 0), 0),
);

// --- Detail Row Handlers: Alokasi Kota ---
const addRowAlokasi = () => {
    formData.value.alokasi.push({ alokasi: true, kota: "", jumlah: 0 });
};

const removeRowAlokasi = (idx: number) => {
    formData.value.alokasi.splice(idx, 1);
    if (formData.value.alokasi.length === 0) {
        formData.value.alokasi.push({ alokasi: false, kota: "", jumlah: 0 });
    }
};

const jumlahAlokasiTerpilih = computed(
    () => formData.value.alokasi.filter((a) => a.alokasi).length,
);

const totalQtyAlokasiTerpilih = computed(() =>
    formData.value.alokasi
        .filter((a) => a.alokasi)
        .reduce((s, a) => s + (Number(a.jumlah) || 0), 0),
);

const allAlokasiSelected = computed(
    () =>
        formData.value.alokasi.length > 0 &&
        formData.value.alokasi.every((a) => a.alokasi),
);

const someAlokasiSelected = computed(() =>
    formData.value.alokasi.some((a) => a.alokasi),
);

const toggleAllAlokasi = () => {
    const setTo = !allAlokasiSelected.value;
    formData.value.alokasi.forEach((a) => (a.alokasi = setTo));
};

// --- Detail Row Handlers: Uang Muka / DP ---
const addRowDp = () => {
    formData.value.dp.push({
        tanggal: new Date().toISOString().substring(0, 10),
        nominal: 0,
        akun: "",
        namabank: "",
        link: "",
    });
};

const removeRowDp = (idx: number) => {
    formData.value.dp.splice(idx, 1);
    if (formData.value.dp.length === 0) addRowDp();
};

const totalDpSum = computed(() =>
    formData.value.dp.reduce((s, d) => s + (Number(d.nominal) || 0), 0),
);

// --- Lookup Handlers ---
const handleSpkSelect = async (payload: any) => {
    if (!payload) return;
    const spk = payload.raw || payload.item || payload;
    const noSpk = spk.Spk || spk.SPK || spk.spk || spk.spk_nomor || "";
    if (!noSpk) return;

    formData.value.spkNomor = noSpk;
    formData.value.spkNama = spk.Nama || spk.nama || "";
    formData.value.divisi = String(spk.Divisi || spk.divisi || "");
    formData.value.bahan = spk.Bahan || spk.bahan || "";
    formData.value.ukuran = spk.Ukuran || spk.ukuran || "";
    formData.value.panjang = Number(spk.Panjang || spk.panjang || 0);
    formData.value.lebar = Number(spk.Lebar || spk.lebar || 0);
    formData.value.jumlahSpk = Number(spk.Jumlah || spk.jumlah || 0);
    formData.value.finishing =
        spk.Finishing || spk.finishing || spk.spk_finishing || "";
    formData.value.hasGambar =
        spk.design_done === "Y" || spk.design_baru === "Y";
    formData.value.keterangan = spk.Kepentingan || "";

    // Auto-isi jmlPo dari qty SPK bila belum diisi
    if (formData.value.jmlPo === 0) {
        formData.value.jmlPo = Number(spk.Jumlah || spk.jumlah || 0);
    }

    // joKode dari 3-4 karakter nomor SPK (posisi index 3,4 = MT untuk MMT)
    const prefix = noSpk.substring(3, 5);
    formData.value.joKode = prefix;
    formData.value.joNama =
        prefix === "MT" ? "MMT / BANNER" : "KONVEKSI / KAOS";

    // Cabang pembuat mengikuti cabang SPK
    const cabSpk = String(spk.Cabang || spk.cabang || spk.spk_cab || "")
        .trim()
        .toUpperCase();
    if (cabSpk) formData.value.cab = cabSpk;

    // Otomatis tarik alokasi kota dari SPK terpilih
    try {
        const resAl = await api.get(
            `/mmt/spk/alokasi/${encodeURIComponent(noSpk)}`,
        );
        const list = resAl.data?.data || resAl.data || [];
        if (Array.isArray(list) && list.length > 0) {
            formData.value.alokasi = list.map((a: any) => ({
                alokasi: true,
                kota: a.kota || a.Kota || a.spka_kota || "",
                jumlah: Number(a.jumlah || a.Jumlah || a.spka_jumlah || 0),
            }));
        }
    } catch (_) {}

    hitungKalkulasiHeader();
    isSpkModalVisible.value = false;
};

const handleSupplierSelect = (sup: any) => {
    if (!sup) return;
    formData.value.supKode = sup.Kode || sup.kode || "";
    formData.value.supNama = sup.Nama || sup.nama || "";
    formData.value.supAlamat = sup.Alamat || sup.alamat || "";
    formData.value.supKota = sup.Kota || sup.kota || "";
    isSupplierModalVisible.value = false;
};

const handleSupKodeExit = async () => {
    if (!formData.value.supKode) return;
    try {
        const res = await api.get(
            `/supplier/detail/${encodeURIComponent(formData.value.supKode)}`,
        );
        const sup = res.data?.data || res.data;
        if (sup) {
            formData.value.supNama = sup.Nama || sup.nama || "";
            formData.value.supAlamat = sup.Alamat || sup.alamat || "";
            formData.value.supKota = sup.Kota || sup.kota || "";
        }
    } catch (_) {
        formData.value.supNama = "";
        formData.value.supAlamat = "";
        formData.value.supKota = "";
    }
};

const openAccountLookup = (idx: number) => {
    selectedDpIndex.value = idx;
    isAccountModalVisible.value = true;
};

const handleAccountSelect = (acc: any) => {
    const idx = selectedDpIndex.value;
    if (idx !== null && formData.value.dp[idx]) {
        formData.value.dp[idx].akun = acc.Kode || acc.kode || "";
        formData.value.dp[idx].namabank =
            acc.Nama || acc.nama || acc.Rekening || "";
    }
    isAccountModalVisible.value = false;
    selectedDpIndex.value = null;
};

const fmt = (v: number) =>
    new Intl.NumberFormat("id-ID").format(Math.round(v || 0));

const formatThousand = (val: number | string | null | undefined): string => {
    if (val === null || val === undefined || val === "" || Number(val) === 0)
        return "";
    const digits = String(val).replace(/\D/g, "");
    if (!digits) return "";
    return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
};

const handleNumberInput = (e: Event, updateFn: (val: number) => void) => {
    const input = e.target as HTMLInputElement;
    const originalValue = input.value;
    const cursorPosition = input.selectionStart || 0;

    // Hitung berapa banyak digit sebelum kursor sebelum reformat
    const digitsBeforeCursor = originalValue
        .slice(0, cursorPosition)
        .replace(/\D/g, "").length;

    // Ambil digit murni
    const rawDigits = originalValue.replace(/\D/g, "");
    const num = rawDigits ? Number(rawDigits) : 0;

    // Format dengan titik setiap kelipatan 3 digit (ribuan, jutaan, miliaran, dst tanpa batas)
    const formatted = rawDigits
        ? rawDigits.replace(/\B(?=(\d{3})+(?!\d))/g, ".")
        : "";

    input.value = formatted;

    // Pertahankan posisi kursor presisi agar kursor tidak melompat saat titik bertambah
    let newCursorPosition = formatted.length;
    let digitCount = 0;
    for (let i = 0; i < formatted.length; i++) {
        if (digitCount === digitsBeforeCursor) {
            newCursorPosition = i;
            break;
        }
        if (/\d/.test(formatted[i])) {
            digitCount++;
        }
        newCursorPosition = i + 1;
    }

    input.setSelectionRange(newCursorPosition, newCursorPosition);
    updateFn(num);
};

const onTarifInput = (e: Event) => {
    handleNumberInput(e, (num) => {
        formData.value.tarif = num;
    });
};

const onTarifBlur = (e: Event) => {
    const el = e.target as HTMLInputElement;
    el.value = formData.value.tarif
        ? formatThousand(formData.value.tarif)
        : "0";
};

const onCustomHargaInput = (e: Event, idx: number) => {
    handleNumberInput(e, (num) => {
        if (formData.value.custom[idx]) {
            formData.value.custom[idx].harga = num;
            hitungRowCustom(idx);
        }
    });
};

const onCustomHargaBlur = (e: Event, idx: number) => {
    const el = e.target as HTMLInputElement;
    el.value = formData.value.custom[idx]?.harga
        ? formatThousand(formData.value.custom[idx].harga)
        : "0";
};

const onDpNominalInput = (e: Event, idx: number) => {
    handleNumberInput(e, (num) => {
        if (formData.value.dp[idx]) {
            formData.value.dp[idx].nominal = num;
        }
    });
};

const onDpNominalBlur = (e: Event, idx: number) => {
    const el = e.target as HTMLInputElement;
    el.value = formData.value.dp[idx]?.nominal
        ? formatThousand(formData.value.dp[idx].nominal)
        : "0";
};
</script>

<template>
    <BaseForm
        :title="
            isEditMode
                ? `Ubah PO External MMT — ${formData.nomor}`
                : 'Tambah PO External MMT Baru'
        "
        menu-id="5505"
        :icon="IconShoppingCartDown"
        :is-loading="isLoading"
        :is-saving="isSaving"
        :disabled-save="isFormReadOnly"
        item-name="PO External MMT"
        desktop-mode
        v-model:show-save-dialog="showSaveDialog"
        v-model:show-cancel-dialog="showCancelDialog"
        v-model:show-close-dialog="showCloseDialog"
        @validate-save="showSaveDialog = true"
        @confirm-save="executeSave"
        @confirm-cancel="executeCancel"
        @confirm-close="executeClose"
    >
        <!-- Badge Status PIN Approval -->
        <template #header-actions-prepend>
            <span v-if="xminta5 === 'WAIT'" class="status-badge badge-wait">
                <IconClock :size="12" />
                MENUNGGU ACC
            </span>
            <span v-else-if="xminta5 === 'ACC'" class="status-badge badge-acc">
                <IconCircleCheck :size="12" />
                SUDAH ACC
            </span>
            <span
                v-else-if="xminta5 === 'TOLAK'"
                class="status-badge badge-tolak"
            >
                <IconCircleX :size="12" />
                DITOLAK
            </span>
            <span v-if="isPeriodClosed" class="status-badge badge-closed">
                <IconAlertTriangle :size="12" />
                PERIODE TUTUP
            </span>
        </template>

        <!-- ───────── KOLOM KIRI (STANDAR DESKTOP MANKSI - 3 CARD TERPISAH) ───────── -->
        <template #left-column>
            <!-- CARD 1: Header Dokumen PO -->
            <div class="sec header-section">
                <div class="sec-title">Header Dokumen PO</div>

                <!-- Nomor PO -->
                <div class="fr">
                    <label class="lbl">Nomor PO</label>
                    <input
                        :value="formData.nomor"
                        readonly
                        class="inp ro nomor-po"
                        placeholder="← Otomatis"
                    />
                </div>

                <!-- Tanggal Order -->
                <div class="fr">
                    <label class="lbl">Tgl Order</label>
                    <input
                        type="date"
                        v-model="formData.tanggal"
                        class="idate flex-1"
                        :disabled="isFormReadOnly"
                    />
                </div>

                <!-- Dateline Kirim -->
                <div class="fr">
                    <label class="lbl">Dateline</label>
                    <input
                        type="date"
                        v-model="formData.deadline"
                        class="idate flex-1"
                        :disabled="isFormReadOnly"
                    />
                </div>

                <!-- Cabang Pembuat -->
                <div class="fr">
                    <label class="lbl">Cabang</label>
                    <select
                        v-model="formData.cab"
                        class="inp"
                        style="width: 100px"
                        :disabled="isFormReadOnly"
                    >
                        <option v-for="c in cabangOptions" :key="c" :value="c">
                            {{ c }}
                        </option>
                    </select>
                </div>
            </div>

            <!-- CARD 2: Data Supplier -->
            <div class="sec">
                <div class="sec-title">Data Supplier</div>

                <div class="fr">
                    <label class="lbl">Kode Supplier</label>
                    <div class="igrp" style="width: 140px">
                        <input
                            v-model="formData.supKode"
                            class="inp font-monospace"
                            placeholder="Kode..."
                            :disabled="isFormReadOnly"
                            @blur="handleSupKodeExit"
                            @click="isSupplierModalVisible = true"
                        />
                        <button
                            type="button"
                            class="blkp"
                            title="Cari Supplier"
                            :disabled="isFormReadOnly"
                            @click="isSupplierModalVisible = true"
                        >
                            <IconSearch :size="13" />
                        </button>
                    </div>
                </div>

                <div class="fr">
                    <label class="lbl">Supplier</label>
                    <input
                        v-model="formData.supNama"
                        class="inp flex-1 ro font-weight-medium"
                        readonly
                        placeholder="AUTO"
                    />
                </div>

                <div class="fr">
                    <label class="lbl">Alamat</label>
                    <input
                        v-model="formData.supAlamat"
                        class="inp flex-1 ro"
                        readonly
                        placeholder="AUTO"
                    />
                </div>

                <div class="fr">
                    <label class="lbl">Kota</label>
                    <input
                        v-model="formData.supKota"
                        class="inp flex-1 ro"
                        readonly
                        placeholder="AUTO"
                    />
                </div>
            </div>

            <!-- CARD 3: Referensi SPK & Pekerjaan (Card Mandiri) -->
            <div class="sec">
                <div class="sec-title">Referensi SPK</div>

                <!-- Nomor SPK -->
                <div class="fr">
                    <label class="lbl">Nomor SPK</label>
                    <div class="igrp flex-1">
                        <input
                            v-model="formData.spkNomor"
                            class="inp font-monospace fw text-primary"
                            placeholder="Cari..."
                            :disabled="isFormReadOnly"
                            @click="isSpkModalVisible = true"
                        />
                        <button
                            type="button"
                            class="blkp"
                            title="Cari SPK (F1)"
                            :disabled="isFormReadOnly"
                            @click="isSpkModalVisible = true"
                        >
                            <IconSearch :size="13" />
                        </button>
                    </div>
                </div>

                <!-- Nama SPK — readonly auto-isi -->
                <div class="fr">
                    <label class="lbl">Nama SPK</label>
                    <input
                        v-model="formData.spkNama"
                        class="inp flex-1 ro font-weight-medium"
                        readonly
                        placeholder="AUTO"
                    />
                </div>

                <!-- Divisi -->
                <div class="fr">
                    <label class="lbl">Divisi</label>
                    <input
                        v-model="formData.divisi"
                        class="inp ro flex-1 font-weight-medium"
                        readonly
                        placeholder="AUTO"
                    />
                </div>

                <!-- Jenis Order -->
                <div class="fr">
                    <label class="lbl">Jns Order</label>
                    <input
                        v-model="formData.joNama"
                        class="inp ro flex-1 font-weight-medium"
                        readonly
                        placeholder="AUTO"
                    />
                </div>

                <!-- Bahan SPK -->
                <div class="fr">
                    <label class="lbl">Bahan</label>
                    <input
                        v-model="formData.bahan"
                        class="inp flex-1 ro font-weight-medium"
                        readonly
                        placeholder="AUTO"
                    />
                </div>

                <!-- Ukuran SPK -->
                <div class="fr">
                    <label class="lbl">Ukuran</label>
                    <input
                        v-model="formData.ukuran"
                        class="inp flex-1 ro"
                        readonly
                        placeholder="AUTO"
                    />
                </div>

                <!-- Finishing -->
                <div class="fr">
                    <label class="lbl">Finishing</label>
                    <input
                        v-model="formData.finishing"
                        class="inp flex-1"
                        :disabled="isFormReadOnly"
                        placeholder="Mata ayam, slongsong, potong pas, dll."
                    />
                </div>

                <!-- Dimensi & Qty SPK -->
                <div class="fr">
                    <label class="lbl">Dimensi</label>
                    <div class="d-flex align-center gap-1 flex-1">
                        <input
                            :value="formData.panjang"
                            class="inp ro tr"
                            style="width: 55px"
                            placeholder="P"
                            title="Panjang SPK"
                            readonly
                        />
                        <span class="text-caption text-grey">&times;</span>
                        <input
                            :value="formData.lebar"
                            class="inp ro tr"
                            style="width: 55px"
                            placeholder="L"
                            title="Lebar SPK"
                            readonly
                        />
                        <span class="lbl-inline ml-1">Qty:</span>
                        <input
                            :value="fmt(formData.jumlahSpk)"
                            class="inp ro tr fw flex-1 text-primary"
                            readonly
                        />
                    </div>
                </div>

                <!-- Opsi Checklist -->
                <div class="fr mt-1">
                    <label class="lbl">Opsi</label>
                    <div class="d-flex align-center" style="gap: 14px">
                        <label class="ck">
                            <input
                                type="checkbox"
                                v-model="formData.bahanSendiri"
                                :disabled="isFormReadOnly"
                            />
                            <span>Bahan Sendiri</span>
                        </label>
                        <label class="ck ck-disabled">
                            <input
                                type="checkbox"
                                :checked="formData.hasGambar"
                                disabled
                            />
                            <span>Ada File Gambar</span>
                        </label>
                    </div>
                </div>
            </div>
        </template>

        <!-- ───────── KOLOM KANAN ───────── -->
        <template #right-column>
            <!-- PRICING BANNER -->
            <div class="pricing-bar">
                <div class="pricing-fields">
                    <div class="pf">
                        <div class="pf-lbl">Jumlah PO</div>
                        <input
                            type="number"
                            v-model.number="formData.jmlPo"
                            class="inp tr fw"
                            style="width: 100px"
                            min="0"
                            :disabled="isFormReadOnly"
                        />
                    </div>
                    <div class="pf">
                        <div class="pf-lbl">Tarif / Harga</div>
                        <input
                            type="text"
                            inputmode="numeric"
                            :value="formatThousand(formData.tarif)"
                            @input="onTarifInput"
                            @blur="onTarifBlur"
                            @focus="
                                ($event.target as HTMLInputElement).select()
                            "
                            class="inp tr fw"
                            style="width: 120px"
                            placeholder="0"
                            :disabled="isFormReadOnly"
                        />
                    </div>
                    <div class="pf">
                        <div class="pf-lbl">Hitung</div>
                        <select
                            v-model="formData.tipeHitung"
                            class="inp"
                            style="width: 90px"
                            :disabled="isFormReadOnly"
                        >
                            <option value="meter">Meter</option>
                            <option value="pcs">Pcs</option>
                        </select>
                    </div>
                </div>

                <div class="pricing-total">
                    <div class="pt-sub">
                        TOTAL NOTA UTAMA ({{
                            formData.tipeHitung.toUpperCase()
                        }})
                    </div>
                    <div class="pt-val">Rp {{ fmt(formData.totalHeader) }}</div>
                </div>
            </div>

            <!-- MULTI-TAB CDS -->
            <div class="tab-box">
                <!-- Tab Headers -->
                <div class="tab-nav">
                    <button
                        type="button"
                        class="tab-btn"
                        :class="{ active: activeTab === 'custom' }"
                        @click="activeTab = 'custom'"
                    >
                        <IconTable :size="12" />
                        Item Custom
                        <span class="tab-ct" v-if="formData.custom.length">{{
                            formData.custom.length
                        }}</span>
                    </button>
                    <button
                        type="button"
                        class="tab-btn"
                        :class="{ active: activeTab === 'alokasi' }"
                        @click="activeTab = 'alokasi'"
                    >
                        <IconMapPin :size="12" />
                        Alokasi Kota
                        <span class="tab-ct" v-if="jumlahAlokasiTerpilih">{{
                            jumlahAlokasiTerpilih
                        }}</span>
                    </button>
                    <button
                        type="button"
                        class="tab-btn"
                        :class="{ active: activeTab === 'dp' }"
                        @click="activeTab = 'dp'"
                    >
                        <IconReceipt2 :size="12" />
                        Uang Muka / DP
                        <span class="tab-ct" v-if="totalDpSum > 0">Rp</span>
                    </button>
                </div>

                <!-- TAB 1: Item Custom (CDS1) -->
                <div v-show="activeTab === 'custom'" class="tab-body">
                    <div class="tab-toolbar">
                        <button
                            type="button"
                            class="btn-add"
                            :disabled="isFormReadOnly"
                            @click="addRowCustom"
                        >
                            <IconPlus :size="12" /> Tambah Item
                        </button>
                        <div class="toolbar-spacer"></div>
                        <span class="toolbar-sum"
                            >Total Item Custom: &nbsp;<b
                                >Rp {{ fmt(totalCustomSum) }}</b
                            ></span
                        >
                    </div>

                    <div class="tbl-scroll">
                        <table class="gt">
                            <thead>
                                <tr>
                                    <th style="width: 32px" class="tc">No</th>
                                    <th>Nama Item</th>
                                    <th style="width: 72px" class="tr">
                                        Panjang
                                    </th>
                                    <th style="width: 72px" class="tr">
                                        Lebar
                                    </th>
                                    <th style="width: 70px" class="tr">
                                        Jumlah
                                    </th>
                                    <th style="width: 95px" class="tr">
                                        Harga
                                    </th>
                                    <th style="width: 105px" class="tr">
                                        Total
                                    </th>
                                    <th style="width: 32px"></th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr
                                    v-for="(it, idx) in formData.custom"
                                    :key="idx"
                                >
                                    <td class="tc num">{{ idx + 1 }}</td>
                                    <td class="p0">
                                        <input
                                            type="text"
                                            v-model="it.nama"
                                            class="ci"
                                            placeholder="Nama..."
                                            :disabled="isFormReadOnly"
                                        />
                                    </td>
                                    <td class="p0">
                                        <input
                                            type="number"
                                            v-model.number="it.panjang"
                                            class="ci tr"
                                            :disabled="
                                                isFormReadOnly ||
                                                formData.tipeHitung === 'pcs'
                                            "
                                            @input="hitungRowCustom(idx)"
                                        />
                                    </td>
                                    <td class="p0">
                                        <input
                                            type="number"
                                            v-model.number="it.lebar"
                                            class="ci tr"
                                            :disabled="
                                                isFormReadOnly ||
                                                formData.tipeHitung === 'pcs'
                                            "
                                            @input="hitungRowCustom(idx)"
                                        />
                                    </td>
                                    <td class="p0">
                                        <input
                                            type="number"
                                            v-model.number="it.jumlah"
                                            class="ci tr fw"
                                            :disabled="isFormReadOnly"
                                            @input="hitungRowCustom(idx)"
                                        />
                                    </td>
                                    <td class="p0">
                                        <input
                                            type="text"
                                            inputmode="numeric"
                                            :value="formatThousand(it.harga)"
                                            class="ci tr fw"
                                            placeholder="0"
                                            :disabled="isFormReadOnly"
                                            @input="
                                                onCustomHargaInput($event, idx)
                                            "
                                            @blur="
                                                onCustomHargaBlur($event, idx)
                                            "
                                            @focus="
                                                (
                                                    $event.target as HTMLInputElement
                                                ).select()
                                            "
                                        />
                                    </td>
                                    <td class="tr fw tot-col">
                                        Rp {{ fmt(it.total) }}
                                    </td>
                                    <td class="tc p0">
                                        <button
                                            type="button"
                                            class="btn-del"
                                            :disabled="isFormReadOnly"
                                            @click="removeRowCustom(idx)"
                                        >
                                            <IconTrash :size="12" />
                                        </button>
                                    </td>
                                </tr>
                                <tr v-if="formData.custom.length === 0">
                                    <td colspan="8" class="tc empty-row">
                                        Belum ada item custom.
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                <!-- TAB 2: Alokasi Kota (CDS2) -->
                <div v-show="activeTab === 'alokasi'" class="tab-body">
                    <div class="tab-toolbar">
                        <label class="toggle-all-lbl">
                            <input
                                type="checkbox"
                                :checked="allAlokasiSelected"
                                :indeterminate="
                                    someAlokasiSelected && !allAlokasiSelected
                                "
                                :disabled="isFormReadOnly"
                                @change="toggleAllAlokasi"
                            />
                            Pilih Semua
                        </label>
                        <span class="toolbar-sum"
                            >Terpilih <b>{{ jumlahAlokasiTerpilih }}</b> kota ·
                            Total Qty
                            <b>{{ fmt(totalQtyAlokasiTerpilih) }}</b>
                            Pcs</span
                        >
                        <div class="toolbar-spacer"></div>
                        <button
                            type="button"
                            class="btn-add"
                            :disabled="isFormReadOnly"
                            @click="addRowAlokasi"
                        >
                            <IconPlus :size="12" /> Tambah Kota
                        </button>
                    </div>

                    <div class="tbl-scroll">
                        <table class="gt">
                            <thead>
                                <tr>
                                    <th style="width: 42px" class="tc">
                                        Pilih
                                    </th>
                                    <th>Nama Kota Tujuan</th>
                                    <th style="width: 130px" class="tr">
                                        Jumlah (Pcs)
                                    </th>
                                    <th style="width: 32px"></th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr
                                    v-for="(row, idx) in formData.alokasi"
                                    :key="idx"
                                    :class="{
                                        'row-off': !row.alokasi,
                                    }"
                                >
                                    <td class="tc p0">
                                        <input
                                            type="checkbox"
                                            v-model="row.alokasi"
                                            class="row-chk"
                                            :disabled="isFormReadOnly"
                                        />
                                    </td>
                                    <td class="p0">
                                        <input
                                            type="text"
                                            v-model.trim="row.kota"
                                            class="ci"
                                            placeholder="Nama kota tujuan..."
                                            :disabled="isFormReadOnly"
                                        />
                                    </td>
                                    <td class="p0">
                                        <input
                                            type="number"
                                            v-model.number="row.jumlah"
                                            class="ci tr fw"
                                            :disabled="isFormReadOnly"
                                        />
                                    </td>
                                    <td class="tc p0">
                                        <button
                                            type="button"
                                            class="btn-del"
                                            :disabled="isFormReadOnly"
                                            @click="removeRowAlokasi(idx)"
                                        >
                                            <IconTrash :size="12" />
                                        </button>
                                    </td>
                                </tr>
                                <tr v-if="formData.alokasi.length === 0">
                                    <td colspan="4" class="tc empty-row">
                                        Belum ada alokasi kota.
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                <!-- TAB 3: Uang Muka / DP (CDS3) -->
                <div v-show="activeTab === 'dp'" class="tab-body">
                    <div class="tab-toolbar">
                        <button
                            type="button"
                            class="btn-add"
                            :disabled="isFormReadOnly"
                            @click="addRowDp"
                        >
                            <IconPlus :size="12" /> Tambah DP
                        </button>
                        <div class="toolbar-spacer"></div>
                        <span class="toolbar-sum"
                            >Total Uang Muka: &nbsp;<b
                                >Rp {{ fmt(totalDpSum) }}</b
                            ></span
                        >
                    </div>

                    <div class="tbl-scroll">
                        <table class="gt">
                            <thead>
                                <tr>
                                    <th style="width: 120px">Tanggal</th>
                                    <th style="width: 120px" class="tr">
                                        Nominal DP
                                    </th>
                                    <th style="width: 130px">Kode Akun</th>
                                    <th>Nama Bank / Rekening</th>
                                    <th style="width: 140px">Link Bukti</th>
                                    <th style="width: 32px"></th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr v-for="(d, idx) in formData.dp" :key="idx">
                                    <td class="p0">
                                        <input
                                            type="date"
                                            v-model="d.tanggal"
                                            class="ci"
                                            :disabled="isFormReadOnly"
                                        />
                                    </td>
                                    <td class="p0">
                                        <input
                                            type="text"
                                            inputmode="numeric"
                                            :value="formatThousand(d.nominal)"
                                            class="ci tr fw"
                                            placeholder="0"
                                            :disabled="isFormReadOnly"
                                            @input="
                                                onDpNominalInput($event, idx)
                                            "
                                            @blur="onDpNominalBlur($event, idx)"
                                            @focus="
                                                (
                                                    $event.target as HTMLInputElement
                                                ).select()
                                            "
                                        />
                                    </td>
                                    <td class="p0">
                                        <div class="ci-btn-cell">
                                            <input
                                                type="text"
                                                v-model="d.akun"
                                                class="ci"
                                                placeholder="F1 lookup..."
                                                :disabled="isFormReadOnly"
                                            />
                                            <button
                                                type="button"
                                                class="btn-ci-search"
                                                :disabled="isFormReadOnly"
                                                @click="openAccountLookup(idx)"
                                            >
                                                <IconSearch :size="11" />
                                            </button>
                                        </div>
                                    </td>
                                    <td class="p0">
                                        <input
                                            type="text"
                                            v-model="d.namabank"
                                            class="ci ro"
                                            readonly
                                            placeholder="Auto dari kode akun"
                                        />
                                    </td>
                                    <td class="p0">
                                        <input
                                            type="text"
                                            v-model="d.link"
                                            class="ci"
                                            placeholder="URL bukti..."
                                            :disabled="isFormReadOnly"
                                        />
                                    </td>
                                    <td class="tc p0">
                                        <button
                                            type="button"
                                            class="btn-del"
                                            :disabled="isFormReadOnly"
                                            @click="removeRowDp(idx)"
                                        >
                                            <IconTrash :size="12" />
                                        </button>
                                    </td>
                                </tr>
                                <tr v-if="formData.dp.length === 0">
                                    <td colspan="6" class="tc empty-row">
                                        Belum ada rincian uang muka / DP.
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <!-- MEMO / CATATAN TAMBAHAN -->
            <div class="memo-wrap">
                <label class="memo-lbl">Keterangan / Memo Tambahan</label>
                <textarea
                    v-model="formData.keterangan"
                    class="memo-inp"
                    rows="2"
                    placeholder="Catatan tambahan untuk vendor / supplier..."
                    :disabled="isFormReadOnly"
                ></textarea>
            </div>
        </template>
    </BaseForm>

    <!-- === MODALS LOOKUP === -->
    <SpkLookupModal
        :is-visible="isSpkModalVisible"
        @close="isSpkModalVisible = false"
        @select="handleSpkSelect"
    />

    <SupplierSearchModal
        v-model="isSupplierModalVisible"
        @selected="handleSupplierSelect"
    />

    <AccountSearchModal
        v-model="isAccountModalVisible"
        jenis="ALL"
        @selected="handleAccountSelect"
    />
</template>

<style scoped>
:deep(.form-grid-container.two-column) {
    --left-col-width: 380px;
}
@media (max-width: 1400px) {
    :deep(.form-grid-container.two-column) {
        --left-col-width: 350px;
    }
}

/* ── Section Card ── */
.sec {
    background: white;
    border: 1px solid #e0e0e0;
    border-radius: 6px;
    padding: 10px 12px;
    margin-bottom: 8px;
    font-size: 11px;
    font-family: "Segoe UI", system-ui, sans-serif;
}
.header-section {
    padding-right: 32px; /* Ruang aman agar tombol collapse panel kiri tidak menimpa judul */
}
.sec-title {
    font-size: 11px;
    font-weight: 700;
    color: #1565c0;
    text-transform: uppercase;
    letter-spacing: 0.3px;
    border-bottom: 1px solid #f0f0f0;
    padding-bottom: 3px;
    margin-bottom: 7px;
}
.sec-divider {
    height: 1px;
    background: #f0f0f0;
    margin: 6px 0 7px;
}

/* ── Form Row ── */
.fr {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-bottom: 6px;
    min-height: 24px;
}
.mt-1 {
    margin-top: 4px;
}

/* ── Labels ── */
.lbl {
    width: 90px;
    flex-shrink: 0;
    font-weight: 600;
    color: #444;
    font-size: 11px;
}
.lbl-inline {
    font-size: 11px;
    font-weight: 600;
    color: #555;
    flex-shrink: 0;
    padding: 0 4px;
}

/* ── Inputs ── */
.inp {
    height: 24px;
    border: 1px solid #ccc;
    border-radius: 3px;
    padding: 0 6px;
    font-size: 11px;
    background: white;
    outline: none;
    min-width: 0;
    box-sizing: border-box;
}
.inp:focus {
    border-color: #1565c0;
    box-shadow: 0 0 0 1px #1565c033;
}
.inp:disabled {
    background: #f5f5f5;
    color: #999;
    cursor: not-allowed;
}
.idate {
    height: 24px;
    border: 1px solid #ccc;
    border-radius: 3px;
    padding: 0 4px;
    font-size: 11px;
    background: white;
    outline: none;
    min-width: 0;
    box-sizing: border-box;
}
.idate:focus {
    border-color: #1565c0;
}
.idate:disabled {
    background: #f5f5f5;
    color: #999;
}
.flex-1 {
    flex: 1 1 0;
    min-width: 0;
}
.ro {
    background: #f8f9fa !important;
    color: #495057 !important;
}
.tr {
    text-align: right;
}
.fw {
    font-weight: 700;
}
.tc {
    text-align: center;
}
.nomor-po {
    width: 160px;
    font-weight: 700;
    color: #1565c0;
    letter-spacing: 0.5px;
}

/* ── Input Group Lookup Standar Manksi ── */
.igrp {
    display: flex;
    align-items: center;
    border: 1px solid #ccc;
    border-radius: 3px;
    background: white;
    height: 24px;
    overflow: hidden;
    min-width: 0;
    box-sizing: border-box;
}
.igrp .inp {
    border: none;
    border-radius: 0;
    flex: 1;
}
.blkp {
    background: #f0f0f0;
    border: none;
    border-left: 1px solid #ccc;
    height: 100%;
    padding: 0 6px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #555;
    transition: background 0.15s;
}
.blkp:hover {
    background: #e0e0e0;
    color: #1565c0;
}
.blkp:disabled {
    background: #f5f5f5;
    color: #bbb;
    cursor: not-allowed;
}

/* ── Checkbox ── */
.ck {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 11px;
    cursor: pointer;
    user-select: none;
}
.ck-disabled {
    opacity: 0.5;
    cursor: default;
}

/* ── Input + Icon Button ── */
.inp-btn {
    display: flex;
    align-items: center;
    position: relative;
}
.inp-btn .inp {
    padding-right: 24px;
}
.btn-icon {
    position: absolute;
    right: 2px;
    background: transparent;
    border: none;
    color: #1565c0;
    cursor: pointer;
    display: flex;
    align-items: center;
    padding: 2px 3px;
}
.btn-icon:hover {
    color: #0d47a1;
}
.btn-icon:disabled {
    color: #bbb;
    cursor: not-allowed;
}

/* ── Status Badge PIN ── */
.status-badge {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 2px 8px;
    border-radius: 3px;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.5px;
    margin-right: 4px;
}
.badge-wait {
    background: #fff3e0;
    color: #e65100;
    border: 1px solid #ffb74d;
}
.badge-acc {
    background: #e8f5e9;
    color: #2e7d32;
    border: 1px solid #81c784;
}
.badge-tolak {
    background: #ffebee;
    color: #b71c1c;
    border: 1px solid #ef9a9a;
}
.badge-closed {
    background: #f3e5f5;
    color: #6a1b9a;
    border: 1px solid #ce93d8;
}

/* ── Right Column Container Structure ── */
:deep(.right-column) {
    display: flex;
    flex-direction: column;
    height: 100%;
    min-height: 0;
    overflow: hidden;
    gap: 6px;
}

/* ── Pricing Banner ── */
.pricing-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    background: #eef3f8;
    border: 1px solid #cfd8dc;
    border-radius: 6px;
    padding: 8px 12px;
    margin-bottom: 0;
    flex-shrink: 0;
    font-size: 11px;
}
.pricing-fields {
    display: flex;
    align-items: flex-end;
    gap: 12px;
}
.pf {
    display: flex;
    flex-direction: column;
    gap: 2px;
}
.pf-lbl {
    font-size: 10px;
    font-weight: 700;
    color: #37474f;
    text-transform: uppercase;
}
.pricing-total {
    background: #1565c0;
    color: white;
    border-radius: 5px;
    padding: 5px 14px;
    text-align: right;
    min-width: 190px;
    flex-shrink: 0;
}
.pt-sub {
    font-size: 10px;
    font-weight: 600;
    color: #bbdefb;
    letter-spacing: 0.5px;
}
.pt-val {
    font-size: 18px;
    font-weight: 800;
    line-height: 1.2;
}

/* ── Multi-Tab Box ── */
.tab-box {
    background: white;
    border: 1px solid #ccc;
    border-radius: 6px;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    margin-bottom: 0;
    flex: 1 1 0;
    min-height: 180px;
}
.tab-nav {
    display: flex;
    background: #f0f4f8;
    border-bottom: 1px solid #cfd8dc;
    flex-shrink: 0;
}
.tab-btn {
    display: flex;
    align-items: center;
    gap: 5px;
    padding: 6px 14px;
    background: transparent;
    border: none;
    border-right: 1px solid #e0e0e0;
    font-size: 11px;
    font-weight: 600;
    color: #546e7a;
    cursor: pointer;
    transition:
        background 0.1s,
        color 0.1s;
}
.tab-btn:hover {
    background: #e3f2fd;
    color: #1565c0;
}
.tab-btn.active {
    background: white;
    color: #1565c0;
    border-bottom: 2px solid #1565c0;
    margin-bottom: -1px;
    font-weight: 700;
}
.tab-ct {
    background: #e0e0e0;
    color: #333;
    font-size: 9px;
    padding: 1px 5px;
    border-radius: 10px;
    font-weight: 700;
}
.tab-btn.active .tab-ct {
    background: #1565c0;
    color: white;
}
.tab-body {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
}
.tab-toolbar {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 5px 10px;
    background: #fafafa;
    border-bottom: 1px solid #eee;
    font-size: 11px;
    flex-shrink: 0;
}
.toolbar-spacer {
    flex: 1;
}
.toolbar-sum {
    color: #37474f;
    font-size: 11px;
}
.btn-add {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    background: #1565c0;
    color: white;
    border: none;
    border-radius: 3px;
    padding: 3px 8px;
    font-size: 11px;
    font-weight: 600;
    cursor: pointer;
}
.btn-add:hover:not(:disabled) {
    background: #0d47a1;
}
.btn-add:disabled {
    background: #b0bec5;
    cursor: not-allowed;
}
.toggle-all-lbl {
    display: flex;
    align-items: center;
    gap: 5px;
    font-size: 11px;
    font-weight: 700;
    cursor: pointer;
    user-select: none;
}

/* ── Grid Table ── */
.tbl-scroll {
    overflow: auto;
    flex: 1;
}
.gt {
    width: 100%;
    border-collapse: collapse;
    font-size: 11px;
}
.gt th {
    background: #f5f5f5;
    border-bottom: 2px solid #ddd;
    border-right: 1px solid #e0e0e0;
    padding: 4px 6px;
    text-align: left;
    font-weight: 700;
    color: #333;
    position: sticky;
    top: 0;
    z-index: 1;
    white-space: nowrap;
}
.gt td {
    border-bottom: 1px solid #eee;
    border-right: 1px solid #f0f0f0;
    padding: 2px 5px;
}
.gt tr:hover td {
    background: #f9fbff;
}
.p0 {
    padding: 0 !important;
}
.num {
    color: #888;
    font-size: 10px;
}
.tot-col {
    color: #1565c0;
    padding-right: 8px;
}
.ci {
    width: 100%;
    height: 24px;
    border: none;
    outline: none;
    padding: 0 5px;
    font-size: 11px;
    background: transparent;
    box-sizing: border-box;
}
.ci:focus {
    background: #e8f4fd;
}
.ci:disabled {
    background: transparent;
    color: #aaa;
    cursor: not-allowed;
}
.ci.ro {
    background: #fafafa;
    color: #666;
}
.row-off {
    opacity: 0.45;
    background: #fafafa;
}
.row-chk {
    cursor: pointer;
}
.btn-del {
    background: transparent;
    border: none;
    color: #e53935;
    cursor: pointer;
    padding: 2px 4px;
    display: flex;
    align-items: center;
}
.btn-del:hover:not(:disabled) {
    color: #b71c1c;
}
.btn-del:disabled {
    color: #ccc;
    cursor: not-allowed;
}
.empty-row {
    padding: 12px;
    color: #9e9e9e;
    font-style: italic;
    font-size: 11px;
}

/* Cell with lookup icon button */
.ci-btn-cell {
    display: flex;
    align-items: center;
    position: relative;
    width: 100%;
}
.ci-btn-cell .ci {
    padding-right: 20px;
}
.btn-ci-search {
    position: absolute;
    right: 2px;
    background: transparent;
    border: none;
    color: #1565c0;
    cursor: pointer;
    display: flex;
    align-items: center;
    padding: 1px 2px;
}
.btn-ci-search:disabled {
    color: #ccc;
    cursor: not-allowed;
}

/* ── Memo ── */
.memo-wrap {
    display: flex;
    flex-direction: column;
    gap: 3px;
    flex-shrink: 0;
}
.memo-lbl {
    font-size: 10px;
    font-weight: 700;
    color: #546e7a;
    text-transform: uppercase;
}
.memo-inp {
    border: 1px solid #ccc;
    border-radius: 4px;
    padding: 5px 8px;
    font-size: 11px;
    font-family: inherit;
    outline: none;
    resize: none;
    width: 100%;
    box-sizing: border-box;
}
.memo-inp:focus {
    border-color: #1565c0;
}
.memo-inp:disabled {
    background: #f5f5f5;
    color: #999;
}
</style>
