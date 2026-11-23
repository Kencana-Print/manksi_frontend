<script setup lang="ts">
import { ref, watch, onMounted, computed } from "vue";
import { useRouter, useRoute } from "vue-router";
import { useToast } from "vue-toastification";
import BaseBrowse from "@/components/BaseBrowse.vue";
import { useBrowse } from "@/composables/useBrowse";
import { mintaBahanService } from "@/services/garmen/mintaBahanService";
import { useAuthStore } from "@/stores/authStore";
import api from "@/services/api";
import {
    IconBox,
    IconHelmet,
    IconTie,
    IconFileDescription,
    IconPrinter,
    IconCircleX,
    IconCheck,
    IconShieldCheck,
    IconFileSpreadsheet,
} from "@tabler/icons-vue";
import { formatTanggal, formatTanggalJam } from "@/utils/dateFormat";
import { exportExcelSingle, type ExcelColumn } from "@/utils/excelExport";

const router = useRouter();
const route = useRoute();
const toast = useToast();
const authStore = useAuthStore();

const activeRealisasi = ref<Record<string, string>>({});

// -- State untuk Dialog Aksi --
const actionDialog = ref(false);
const actionType = ref<"GUDANG" | "MANAGER" | "AJUKAN">("GUDANG");
const actionForm = ref({ status: "APPROVE", alasan: "", urut: 0 });

const getStartOfMonth = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
};

const getLocalDate = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const jenisDivisiOptions = ["GARMEN", "MMT"] as const;
type JenisDivisi = (typeof jenisDivisiOptions)[number];

const userCab = (authStore.userCabang || authStore.user?.cabang || "")
    .toUpperCase()
    .trim();
const userDiv = authStore.user?.divisi;
const queryDiv = String(route.query.divisi || "").toUpperCase();
const defaultDivisi: JenisDivisi =
    queryDiv === "MMT" || queryDiv === "GARMEN"
        ? (queryDiv as JenisDivisi)
        : userCab === "P05" || userDiv === 5
          ? "MMT"
          : "GARMEN";

const filterState = ref({
    startDate: getStartOfMonth(),
    endDate: getLocalDate(),
    cabang: "ALL",
    divisi: defaultDivisi,
});

const cabangOptions = ref<string[]>(["ALL"]);

onMounted(async () => {
    // 1. Fetch Cabang Options
    try {
        const res = await api.get("/lookups/cabang-pabrik");
        cabangOptions.value = ["ALL", ...res.data.data.map((b: any) => b.Kode)];
    } catch {
        /* silent */
    }

    // 2. Set default cabang jika user punya cabang pabrik tertentu
    if (userCab && userCab !== "HO-" && userCab !== "HO" && userCab !== "ALL") {
        if (cabangOptions.value.includes(userCab)) {
            filterState.value.cabang = userCab;
        }
    }
});

const activeMenuId = computed(() =>
    filterState.value.divisi === "MMT" ? "5536" : "127",
);
const canViewActive = computed(
    () =>
        authStore.can(activeMenuId.value, "view") ||
        authStore.can("127", "view") ||
        authStore.can("5536", "view"),
);
const canInsertActive = computed(
    () =>
        authStore.can(activeMenuId.value, "insert") ||
        authStore.can("127", "insert") ||
        authStore.can("5536", "insert"),
);
const canEditActive = computed(
    () =>
        authStore.can(activeMenuId.value, "edit") ||
        authStore.can("127", "edit") ||
        authStore.can("5536", "edit"),
);
const canDeleteActive = computed(
    () =>
        authStore.can(activeMenuId.value, "delete") ||
        authStore.can("127", "delete") ||
        authStore.can("5536", "delete"),
);
const canExportActive = computed(() =>
    filterState.value.divisi === "MMT"
        ? false
        : authStore.can("127", "view") ||
          authStore.can(activeMenuId.value, "view"),
);

const onDivisiChange = () => {
    selected.value = [];
    expandedRows.value = [];
    fetchData();
};

watch(
    () => route.query.divisi,
    (newDiv) => {
        const d = String(newDiv || "").toUpperCase();
        if (d === "MMT" || d === "GARMEN") {
            if (filterState.value.divisi !== d) {
                filterState.value.divisi = d as JenisDivisi;
                onDivisiChange();
            }
        }
    },
);

watch(
    () => filterState.value.divisi,
    (val) => {
        if (!val) {
            filterState.value.divisi = defaultDivisi;
        }
    },
);

const getItemNomor = (item: any): string => {
    if (!item) return "";
    if (typeof item === "string") return item;
    const raw = item.raw || item;
    return raw.Nomor || raw.nomor || "";
};

const { items, isLoading, selected, fetchData, exportToExcel } = useBrowse({
    menuId: "",
    fetchApi: async () => {
        if (!canViewActive.value) {
            toast.error(
                "Akses ditolak: Anda tidak memiliki izin untuk menu ini.",
            );
            return [];
        }
        if (filterState.value.divisi === "MMT") {
            detailMmtCache.value = {};
            const res = await api.get(
                "/mmt/bahan-baku-produksi/permintaan-produksi",
                {
                    params: {
                        startDate: filterState.value.startDate,
                        endDate: filterState.value.endDate,
                    },
                },
            );
            return Array.isArray(res.data) ? res.data : res.data?.data || [];
        }
        const res = await mintaBahanService.getBrowse(
            filterState.value.startDate,
            filterState.value.endDate,
            filterState.value.cabang,
        );
        return res.data.data;
    },
    deleteApi: async (nomor: string) => {
        if (filterState.value.divisi === "MMT") {
            await api.delete(
                `/mmt/bahan-baku-produksi/permintaan-produksi/${encodeURIComponent(nomor)}`,
            );
        } else {
            await mintaBahanService.deleteData(nomor);
        }
    },
});

const baseBrowseRef = ref<InstanceType<typeof BaseBrowse> | null>(null);

// Ambil data yang sedang tertampil (setelah search/filter kolom di
// BaseBrowse), fallback ke items mentah kalau ref belum siap.
const getExportSource = () =>
    baseBrowseRef.value?.getFilteredItems() ?? items.value ?? [];

// Ubah nilai tanggal (ISO/Date) jadi Date UTC-midnight supaya Excel
// menampilkan tanggal yang sama dengan di browse (tanpa geser zona waktu).
const toExcelDate = (val: any): Date | "" => {
    if (!val) return "";
    const d = new Date(val);
    if (isNaN(d.getTime())) return "";
    return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
};

const headersGarmen = [
    { title: "Nomor", key: "Nomor", width: "115px" },
    { title: "Tanggal", key: "Tanggal", width: "85px" },
    { title: "Jam", key: "Jam", width: "70px" },
    { title: "Cab", key: "Cab", width: "50px" },
    { title: "Divisi", key: "Divisi", width: "70px" }, // Divisi Garmen
    { title: "Div. SPK", key: "DivisiSpk", width: "80px" },
    { title: "SPK", key: "SPK", width: "125px" },
    { title: "Nama SPK", key: "NamaSpk", minWidth: "140px" }, // Flexible
    { title: "Jml SPK", key: "JmlSpk", width: "70px", align: "end" as const },
    { title: "Keterangan", key: "Keterangan", minWidth: "120px" }, // Flexible
    { title: "Status", key: "Status", width: "80px" },
    {
        title: "Periode",
        key: "IsPeriodLocked",
        width: "80px",
        align: "center" as const,
    },
    {
        title: "Approve",
        key: "Approve",
        width: "65px",
        align: "center" as const,
    },
    {
        title: "Apv. Gdg",
        key: "ApvGudang",
        width: "80px",
        align: "center" as const,
    },
    { title: "Tolak Gdg", key: "AlasanTolak_ApvGudang", minWidth: "100px" }, // Flexible
    {
        title: "Apv. Mgr",
        key: "ApvManager",
        width: "80px",
        align: "center" as const,
    },
    { title: "Tolak Mgr", key: "AlasanTolak_ApvManager", minWidth: "100px" }, // Flexible
    { title: "User", key: "Usr", width: "70px" },
    { title: "Alasan Close", key: "AlasanClose", minWidth: "100px" }, // Flexible
];

const headersMmt = [
    { title: "Nomor", key: "Nomor", width: "115px" },
    { title: "Tanggal", key: "Tanggal", width: "85px" },
    { title: "Jam", key: "Jam", width: "70px" },
    { title: "Cab", key: "Cab", width: "50px" },
    { title: "Gudang", key: "Gudang", width: "85px" },
    { title: "Lokasi", key: "Lokasi", width: "95px" },
    { title: "Tipe", key: "Tipe", width: "70px", align: "center" as const },
    { title: "SPK", key: "SPK", width: "125px" },
    { title: "Keterangan", key: "Keterangan", minWidth: "140px" },
    { title: "Status", key: "Status", width: "80px", align: "center" as const },
    { title: "User", key: "Usr", width: "70px" },
    { title: "Alasan Close", key: "AlasanClose", minWidth: "100px" },
];

const currentHeaders = computed(() =>
    filterState.value.divisi === "MMT" ? headersMmt : headersGarmen,
);

const handleRowProps = (data: any) => {
    const item = data.item?.raw || data.item;
    if (item.Status === "OPEN")
        return { style: "color:#d32f2f!important;font-weight:600" };
    if (item.Status === "ONPROSES")
        return { style: "color:#1976d2!important;font-weight:600" };
    return {};
};

const getNomorClass = (item: any) => {
    if (item.Ngedit === "WAIT") return "badge-wait";
    if (item.Ngedit === "TOLAK") return "badge-tolak";
    if (item.Ngedit === "ACC") return "badge-acc";
    return "";
};
const getApvClass = (val: string) => (val === "N" ? "apv-n" : "");

// ── Expand detail ──
const expandedRows = ref<any[]>([]);
const detailsData = ref<
    Record<string, { bahan: any[]; realisasi: any[]; realisasiDtl: any[] }>
>({});
const loadingDetails = ref<Set<string>>(new Set());

interface DetailPermintaanMmt {
    Nomor?: string;
    Kode?: string;
    Nama_Bahan?: string;
    Satuan?: string;
    Jumlah?: number | string;
    Panjang?: number | string;
    Lebar?: number | string;
    Nomor_SPK?: string;
    Keterangan?: string;
    komponen?: string;
    babaran?: number | string;
    pcs?: number | string;
}

const detailMmtCache = ref<Record<string, DetailPermintaanMmt[]>>({});
const loadingMmtDetails = ref<Record<string, boolean>>({});

const getItemDetailsMmt = (item: any): DetailPermintaanMmt[] => {
    const raw = item?.raw || item;
    const nomor = getItemNomor(raw);
    if (detailMmtCache.value[nomor] && detailMmtCache.value[nomor].length > 0) {
        return detailMmtCache.value[nomor];
    }
    const details = raw?.Details || raw?.details || raw?.Detail;
    if (Array.isArray(details) && details.length > 0) {
        return details;
    }
    return detailMmtCache.value[nomor] || [];
};

watch(expandedRows, async (newVal) => {
    if (newVal.length === 0) return;
    const lastItem = newVal[newVal.length - 1];
    const raw = lastItem?.raw || lastItem;
    const nomor = getItemNomor(raw);
    if (!nomor) return;

    if (filterState.value.divisi === "MMT") {
        if (
            detailMmtCache.value[nomor] &&
            detailMmtCache.value[nomor].length > 0
        )
            return;
        if (loadingMmtDetails.value[nomor]) return;

        loadingMmtDetails.value = { ...loadingMmtDetails.value, [nomor]: true };
        try {
            const res = await api.get(
                `/mmt/bahan-baku-produksi/permintaan-produksi/${encodeURIComponent(nomor)}`,
            );
            const d = res.data?.data || res.data;
            const details = d?.Details || d?.details || d?.Detail || [];
            detailMmtCache.value = {
                ...detailMmtCache.value,
                [nomor]: details,
            };
            if (typeof raw === "object" && raw !== null) {
                raw.Details = details;
            }
        } catch (err) {
            console.error(
                `Gagal load detail permintaan produksi MMT ${nomor}:`,
                err,
            );
            detailMmtCache.value = { ...detailMmtCache.value, [nomor]: [] };
        } finally {
            loadingMmtDetails.value = {
                ...loadingMmtDetails.value,
                [nomor]: false,
            };
        }
        return;
    }

    if (detailsData.value[nomor] || loadingDetails.value.has(nomor)) return;
    loadingDetails.value.add(nomor);
    try {
        const res = await mintaBahanService.getDetail(nomor);
        detailsData.value[nomor] = res.data.data;
    } catch {
        toast.error("Gagal memuat detail data");
    } finally {
        loadingDetails.value.delete(nomor);
    }
});

const selectRealisasi = (spkNomor: string, relNomor: string) => {
    activeRealisasi.value[spkNomor] = relNomor;
};

// ── Aksi ──
const onAdd = async () => {
    if (filterState.value.divisi === "MMT") {
        router.push("/mmt/bahan-baku-produksi/permintaan-produksi/create");
        return;
    }
    try {
        await mintaBahanService.checkInsert();
        router.push("/garmen/bahan-baku/minta-bahan/form");
    } catch (e: any) {
        toast.warning(e.response?.data?.message || "Gagal memverifikasi.");
    }
};

const onEdit = (item: any) => {
    const target = item || selected.value[0];
    const raw = target?.raw || target;
    const nomor = getItemNomor(raw);
    if (!nomor) return;

    if (filterState.value.divisi === "MMT") {
        router.push(
            `/mmt/bahan-baku-produksi/permintaan-produksi/edit/${encodeURIComponent(nomor)}`,
        );
        return;
    }

    const itemCab = (raw.Cab || "").toString().trim().toUpperCase();
    const myCab = (authStore.userCabang || "").toString().trim().toUpperCase();

    if (itemCab !== myCab && myCab !== "ALL" && !myCab.startsWith("HO")) {
        return toast.error(
            `Bukan cabang anda. (Data: ${itemCab}, Anda: ${myCab})`,
        );
    }

    if (raw.IsPeriodLocked) {
        return toast.error(
            "Periode transaksi ini sudah ditutup (tutup buku). Gunakan menu Pengajuan Perubahan untuk mengedit.",
        );
    }

    if (raw.SudahRealisasi) {
        return toast.error(
            "Permintaan ini sudah direalisasi oleh Gudang (sebagian/seluruhnya). Tidak bisa diubah lagi.",
        );
    }

    router.push(
        `/garmen/bahan-baku/minta-bahan/form/${encodeURIComponent(nomor)}`,
    );
};

const checkBisaHapus = (item: any): boolean => {
    if (filterState.value.divisi === "MMT") {
        return true;
    }
    const raw = item?.raw || item;
    const itemCab = (raw.Cab || "").toString().trim().toUpperCase();
    const myCab = (authStore.userCabang || "").toString().trim().toUpperCase();
    if (itemCab !== myCab && myCab !== "ALL" && !myCab.startsWith("HO")) {
        toast.error(`Bukan cabang anda. (Data: ${itemCab}, Anda: ${myCab})`);
        return false;
    }
    if (raw.IsPeriodLocked) {
        toast.error(
            "Periode transaksi ini sudah ditutup (tutup buku). Tidak bisa dihapus.",
        );
        return false;
    }
    if (raw.SudahRealisasi) {
        toast.error(
            "Permintaan ini sudah direalisasi oleh Gudang. Tidak bisa dihapus.",
        );
        return false;
    }
    if (raw.Status !== "OPEN") {
        toast.error(`Sudah ${raw.Status}. Tidak bisa dihapus.`);
        return false;
    }
    return true;
};

const onDelete = async (item: any) => {
    const target = item || selected.value[0];
    const raw = target?.raw || target;
    const nomor = getItemNomor(raw);
    if (!nomor) return;

    try {
        if (filterState.value.divisi === "MMT") {
            await api.delete(
                `/mmt/bahan-baku-produksi/permintaan-produksi/${encodeURIComponent(nomor)}`,
            );
        } else {
            await mintaBahanService.deleteData(nomor);
        }
        toast.success("Data berhasil dihapus.");
        selected.value = [];
        fetchData();
    } catch (error: any) {
        toast.error(error.response?.data?.message || "Gagal menghapus data.");
    }
};

// -- Aksi: Approve Gudang --
const onApproveGudang = () => {
    if (!selected.value.length)
        return toast.warning("Pilih data terlebih dahulu.");
    const item = selected.value[0];

    if (!authStore.user?.bagian?.toUpperCase().includes("GUDANG")) {
        return toast.error("Anda tidak punya hak.");
    }

    if (item.IsPeriodLocked) {
        return toast.error(
            "Periode transaksi ini sudah ditutup (tutup buku). Gunakan menu Pengajuan Perubahan.",
        );
    }

    if (
        ["GANTI BS", "GANTI HILANG", "TAMBAHAN"].includes(item.Keterangan) &&
        (item.ApvGudang === "N" || item.ApvGudang === "TOLAK")
    ) {
        actionType.value = "GUDANG";
        actionForm.value = {
            status: item.ApvGudang === "TOLAK" ? "TOLAK" : "APPROVE",
            alasan: item.AlasanTolak_ApvGudang || "",
            urut: 0,
        };
        actionDialog.value = true;
    } else {
        toast.info("Data tidak memerlukan approval Gudang.");
    }
};

// -- Aksi: Approve Manager --
const onApproveManager = () => {
    if (!selected.value.length)
        return toast.warning("Pilih data terlebih dahulu.");
    const item = selected.value[0];

    if (!authStore.user?.flags?.isManager) {
        return toast.error("Anda tidak punya hak.");
    }

    if (item.IsPeriodLocked) {
        return toast.error(
            "Periode transaksi ini sudah ditutup (tutup buku). Gunakan menu Pengajuan Perubahan.",
        );
    }

    if (item.ApvManager === "N" || item.ApvManager === "TOLAK") {
        actionType.value = "MANAGER";
        actionForm.value = {
            status: item.ApvManager === "TOLAK" ? "TOLAK" : "APPROVE",
            alasan: item.AlasanTolak_ApvManager || "",
            urut: 0,
        };
        actionDialog.value = true;
    } else {
        toast.info("Data tidak memerlukan approval Manager.");
    }
};

// -- Aksi: Pengajuan Perubahan --
const onAjukanPerubahan = async () => {
    if (!selected.value.length)
        return toast.warning("Pilih data terlebih dahulu.");
    const item = selected.value[0];

    try {
        const res = await mintaBahanService.checkCloseStatus(item.Nomor);
        const { needsPin5 } = res.data.data;

        if (needsPin5) {
            actionType.value = "AJUKAN";
            actionForm.value = { status: "APPROVE", alasan: "", urut: 1 };
            actionDialog.value = true;
        } else {
            toast.info("Tidak perlu pengajuan perubahan data.");
        }
    } catch (e: any) {
        toast.error(
            e.response?.data?.message || "Gagal memeriksa status data.",
        );
    }
};

// -- Eksekusi Aksi Dialog --
const submitAction = async () => {
    const item = selected.value[0];
    if (actionForm.value.status === "TOLAK" && !actionForm.value.alasan) {
        return toast.warning("Alasan tolak harus diisi.");
    }
    if (actionType.value === "AJUKAN" && !actionForm.value.alasan) {
        return toast.warning("Alasan pengajuan harus diisi.");
    }

    try {
        if (actionType.value === "GUDANG") {
            await mintaBahanService.approveGudang(item.Nomor, actionForm.value);
            toast.success("Approve Gudang berhasil disimpan.");
        } else if (actionType.value === "MANAGER") {
            await mintaBahanService.approveManager(
                item.Nomor,
                actionForm.value,
            );
            toast.success("Approve Manager berhasil disimpan.");
        } else if (actionType.value === "AJUKAN") {
            await mintaBahanService.ajukanPerubahan(item.Nomor, {
                alasan: actionForm.value.alasan,
                tgl: item.Tanggal,
                spk: item.SPK,
                urut: actionForm.value.urut,
            });
            toast.success("Pengajuan berhasil dikirim.");
        }

        actionDialog.value = false;
        fetchData(); // Refresh Data
    } catch (e: any) {
        toast.error(e.response?.data?.message || "Terjadi kesalahan.");
    }
};

// -- Aksi: Approve Realisasi (Detail) --
const onApproveRealisasi = async (
    itemNomor: string,
    relNomor: string,
    itemCab: string,
) => {
    const cabStr = (itemCab || "").toString().trim().toUpperCase();
    const myCab = (authStore.userCabang || "").toString().trim().toUpperCase();

    // CEK CABANG
    if (cabStr !== myCab && myCab !== "ALL" && !myCab.startsWith("HO")) {
        return toast.error(
            `Bukan cabang anda. (Data: ${cabStr}, Anda: ${myCab})`,
        );
    }
    try {
        await mintaBahanService.approveRealisasi(relNomor);
        toast.success("Realisasi berhasil diapprove.");

        // Refresh bagian detail data saja tanpa mereload seluruh tabel master
        const res = await mintaBahanService.getDetail(itemNomor);
        detailsData.value[itemNomor] = res.data.data;
    } catch (e: any) {
        toast.error(e.response?.data?.message || "Gagal approve realisasi.");
    }
};

const closeDialog = ref(false);
const closeForm = ref({ nomor: "", alasan: "" });

const openCloseDialog = () => {
    if (!selected.value.length)
        return toast.warning("Pilih data terlebih dahulu.");
    const item = selected.value[0];

    const itemCab = (item.Cab || "").toString().trim().toUpperCase();
    const myCab = (authStore.userCabang || "").toString().trim().toUpperCase();

    if (itemCab !== myCab && myCab !== "ALL" && !myCab.startsWith("HO")) {
        const bagian = authStore.user?.bagian?.toUpperCase() || "";
        if (!bagian.includes("GUDANG")) {
            return toast.error(
                `Bukan cabang anda. (Data: ${itemCab}, Anda: ${myCab})`,
            );
        }
    }

    if (item.IsPeriodLocked) {
        return toast.error(
            "Periode transaksi ini sudah ditutup (tutup buku). Gunakan menu Pengajuan Perubahan.",
        );
    }

    if (item.Status === "CLOSE" || item.Status === "DICLOSE")
        return toast.warning(`Data sudah ${item.Status}.`);

    closeForm.value = { nomor: item.Nomor, alasan: "" };
    closeDialog.value = true;
};
const submitClose = async () => {
    if (!closeForm.value.alasan) return toast.warning("Alasan harus diisi.");
    try {
        await mintaBahanService.setClose(closeForm.value.nomor, {
            alasan: closeForm.value.alasan,
        });
        toast.success("Berhasil diclose");
        closeDialog.value = false;
        fetchData();
    } catch {
        toast.error("Gagal melakukan close transaksi.");
    }
};

const onPrint = () => {
    if (!selected.value.length) return;
    const target = selected.value[0];
    const raw = target?.raw || target;
    const nomor = getItemNomor(raw);
    if (!nomor) return;

    if (filterState.value.divisi === "MMT") {
        router.push(
            `/mmt/bahan-baku-produksi/permintaan-produksi/print/${encodeURIComponent(nomor)}`,
        );
        return;
    }

    window.open(
        `/garmen/bahan-baku/minta-bahan/print/${encodeURIComponent(nomor)}`,
        "_blank",
    );
};

const onExportHeader = async () => {
    const source = getExportSource();
    if (!source.length) return toast.warning("Tidak ada data untuk diekspor.");

    const columnsGarmen: ExcelColumn[] = [
        { header: "Nomor", key: "Nomor", width: 16 },
        {
            header: "Tanggal",
            key: "Tanggal",
            width: 12,
            align: "center",
            numFmt: "dd mmm yy",
        },
        { header: "Jam", key: "Jam", width: 10 },
        { header: "Cab", key: "Cab", width: 8, align: "center" },
        { header: "Divisi", key: "Divisi", width: 12 },
        { header: "Div. SPK", key: "DivisiSpk", width: 12 },
        { header: "SPK", key: "SPK", width: 16 },
        { header: "Nama SPK", key: "NamaSpk", width: 28 },
        {
            header: "Jml SPK",
            key: "JmlSpk",
            width: 10,
            align: "right",
            numFmt: "#,##0",
        },
        { header: "Keterangan", key: "Keterangan", width: 22 },
        { header: "Status", key: "Status", width: 12, align: "center" },
        { header: "Approve", key: "Approve", width: 10, align: "center" },
        { header: "Apv. Gudang", key: "ApvGudang", width: 12, align: "center" },
        {
            header: "Apv. Manager",
            key: "ApvManager",
            width: 12,
            align: "center",
        },
        { header: "User", key: "Usr", width: 12 },
    ];

    const columnsMmt: ExcelColumn[] = [
        { header: "Nomor", key: "Nomor", width: 16 },
        {
            header: "Tanggal",
            key: "Tanggal",
            width: 12,
            align: "center",
            numFmt: "dd mmm yy",
        },
        { header: "Jam", key: "Jam", width: 10 },
        { header: "Cab", key: "Cab", width: 8, align: "center" },
        { header: "Gudang", key: "Gudang", width: 12 },
        { header: "Lokasi", key: "Lokasi", width: 14 },
        { header: "Tipe", key: "Tipe", width: 10, align: "center" },
        { header: "SPK", key: "SPK", width: 16 },
        { header: "Keterangan", key: "Keterangan", width: 22 },
        { header: "Status", key: "Status", width: 12, align: "center" },
        { header: "User", key: "Usr", width: 12 },
        { header: "Alasan Close", key: "AlasanClose", width: 20 },
    ];

    const columns = filterState.value.divisi === "MMT" ? columnsMmt : columnsGarmen;

    // Samakan dengan tampilan browse: tanggal ISO → dd/mm/yyyy (zona waktu lokal)
    const rows = source.map((r: any) => ({
        ...r,
        Tanggal: toExcelDate(r.Tanggal),
    }));

    await exportExcelSingle(
        `Permintaan_Bahan_Baku_${filterState.value.startDate}_${filterState.value.endDate}.xlsx`,
        "Permintaan Bahan Baku",
        columns,
        rows,
        `Permintaan Bahan Baku Periode ${filterState.value.startDate} s/d ${filterState.value.endDate}`,
    );
};

// --- Aksi: Export Detail ---
const isExportingDetail = ref(false);

const onExportDetail = async () => {
    isExportingDetail.value = true;
    try {
        const res = await mintaBahanService.getAllDetail(
            filterState.value.startDate,
            filterState.value.endDate,
            filterState.value.cabang,
        );
        let allDetail: any[] = res.data.data || [];

        // Batasi ke Nomor yang sedang tertampil (sesuai search/filter kolom BaseBrowse)
        const visibleNomors = new Set(
            getExportSource().map((r: any) => r.Nomor),
        );
        allDetail = allDetail.filter((r) => visibleNomors.has(r.Nomor));

        if (!allDetail.length) {
            toast.warning("Tidak ada data detail pada filter ini.");
            return;
        }

        // ✅ Kelompokkan per Nomor Permintaan
        const groups: Record<string, any[]> = {};
        const order: string[] = [];
        allDetail.forEach((r) => {
            const key = r.Nomor;
            if (!groups[key]) {
                groups[key] = [];
                order.push(key);
            }
            groups[key].push(r);
        });

        const combinedRows: any[] = [];

        order.forEach((key) => {
            const rowsInGroup = groups[key];
            const first = rowsInGroup[0];

            // Data Header/Master yang hanya muncul di baris pertama
            const masterCells = {
                Nomor: first.Nomor,
                Tanggal: toExcelDate(first.Tanggal),
                Jam: first.Jam,
                Cab: first.Cab,
                Divisi: first.Divisi,
                SPK: first.SPK,
                NamaSpk: first.NamaSpk,
                Status: first.Status,
            };

            // Data kosong untuk baris kedua dan seterusnya
            const blankMaster = {
                Nomor: "",
                Tanggal: "",
                Jam: "",
                Cab: "",
                Divisi: "",
                SPK: "",
                NamaSpk: "",
                Status: "",
            };

            rowsInGroup.forEach((r, idx) => {
                combinedRows.push({
                    ...(idx === 0 ? masterCells : blankMaster),
                    KodeBahan: r.KodeBahan,
                    NamaBahan: r.NamaBahan,
                    Setting: r.Setting || "",
                    Konstruksi: r.Konstruksi || "",
                    Panjang:
                        r.Panjang === null || r.Panjang === undefined
                            ? ""
                            : Number(r.Panjang),
                    Lebar:
                        r.Lebar === null || r.Lebar === undefined
                            ? ""
                            : Number(r.Lebar),
                    Satuan: r.Satuan,
                    Babaran: Number(r.Babaran) || 0,
                    Pcs: Number(r.Pcs) || 0,
                    Jumlah: Number(r.Jumlah) || 0,
                    Realisasi: Number(r.Realisasi) || 0,
                    Komponen: r.Komponen || "",
                    Keterangan: r.Keterangan || "",
                });
            });
        });

        const columns: ExcelColumn[] = [
            { header: "Nomor", key: "Nomor", width: 16 },
            {
                header: "Tanggal",
                key: "Tanggal",
                width: 12,
                align: "center",
                numFmt: "dd mmm yy",
            },
            { header: "Jam", key: "Jam", width: 10, align: "center" },
            { header: "Cab", key: "Cab", width: 8, align: "center" },
            { header: "Divisi", key: "Divisi", width: 12 },
            { header: "SPK", key: "SPK", width: 16 },
            { header: "Nama SPK", key: "NamaSpk", width: 26 },
            { header: "Status", key: "Status", width: 12, align: "center" },
            { header: "Kode Bahan", key: "KodeBahan", width: 14 },
            { header: "Nama Bahan", key: "NamaBahan", width: 26 },
            { header: "Setting", key: "Setting", width: 10, align: "center" },
            { header: "Konstruksi", key: "Konstruksi", width: 14 },
            {
                header: "Panjang",
                key: "Panjang",
                width: 9,
                align: "right",
                numFmt: "#,##0.##",
            },
            {
                header: "Lebar",
                key: "Lebar",
                width: 9,
                align: "right",
                numFmt: "#,##0.##",
            },
            { header: "Sat", key: "Satuan", width: 8, align: "center" },
            {
                header: "Babaran",
                key: "Babaran",
                width: 10,
                align: "right",
                numFmt: "#,##0.00",
            },
            {
                header: "Pcs",
                key: "Pcs",
                width: 10,
                align: "right",
                numFmt: "#,##0",
            },
            {
                header: "Jumlah",
                key: "Jumlah",
                width: 12,
                align: "right",
                numFmt: "#,##0.00",
            },
            {
                header: "Realisasi",
                key: "Realisasi",
                width: 12,
                align: "right",
                numFmt: "#,##0.00",
            },
            { header: "Komponen", key: "Komponen", width: 18 },
            { header: "Keterangan", key: "Keterangan", width: 22 },
        ];

        await exportExcelSingle(
            `Detail_Permintaan_Bahan_${filterState.value.startDate}_sd_${filterState.value.endDate}.xlsx`,
            "Detail Minta Bahan",
            columns,
            combinedRows,
            `Rincian Permintaan Bahan Baku | Periode: ${formatTanggal(filterState.value.startDate)} s.d ${formatTanggal(filterState.value.endDate)}`,
        );

        toast.success("Berhasil export detail data.");
    } catch (error) {
        console.error(error);
        toast.error("Gagal export Excel.");
    } finally {
        isExportingDetail.value = false;
    }
};

const num = (val: number) => new Intl.NumberFormat("id-ID").format(val || 0);

interface RowKode {
    Kode: string;
}
interface RowUkuran {
    Konstruksi?: string;
    Panjang?: number | string | null;
    Lebar?: number | string | null;
}

// Dokumen spanduk = ada bahan berkode SB (kolom Setting/Komponen tidak berlaku)
const adaSpanduk = (list: RowKode[] | undefined): boolean =>
    !!list?.some((r) =>
        String(r.Kode ?? "")
            .toUpperCase()
            .startsWith("SB"),
    );

const fmtUkuran = (v: number | string | null | undefined) =>
    v === null || v === undefined || v === ""
        ? ""
        : Number(v).toLocaleString("id-ID", { maximumFractionDigits: 2 });

// Ringkas untuk kolom sempit: "KONSTRUKSI 1,5 x 50"
const ringkasUkuran = (r: RowUkuran) =>
    [
        r.Konstruksi,
        [fmtUkuran(r.Panjang), fmtUkuran(r.Lebar)].filter(Boolean).join(" x "),
    ]
        .filter(Boolean)
        .join(" ");
</script>

<template>
    <BaseBrowse
        ref="baseBrowseRef"
        :title="
            filterState.divisi === 'MMT'
                ? 'Permintaan Bahan Baku MMT'
                : 'Permintaan Bahan Baku'
        "
        :menu-id="activeMenuId"
        :storage-id="`browse_minta_bahan_${filterState.divisi.toLowerCase()}`"
        :icon="IconBox"
        :headers="currentHeaders"
        :items="items ?? []"
        :is-loading="isLoading"
        item-value="Nomor"
        show-expand
        v-model:expanded="expandedRows"
        v-model:selected="selected"
        v-model:filter-state="filterState"
        :can-insert="canInsertActive"
        :can-edit="canEditActive"
        :can-export="canExportActive"
        :row-props-fn="handleRowProps"
        :can-delete="canDeleteActive"
        :before-delete="checkBisaHapus"
        @refresh="fetchData"
        @add="onAdd"
        @edit="onEdit"
        @delete="onDelete"
        @export="onExportHeader"
    >
        <!-- ── Filter bar ── -->
        <template #filter-left>
            <div class="filter-group">
                <span class="filter-label">Cabang</span>
                <select
                    v-model="filterState.cabang"
                    class="date-inp"
                    style="width: 80px"
                    @change="fetchData"
                >
                    <option
                        v-for="cab in cabangOptions"
                        :key="cab"
                        :value="cab"
                    >
                        {{ cab }}
                    </option>
                </select>
            </div>

            <div class="filter-divider" />

            <div class="filter-group">
                <span class="filter-label">Divisi</span>
                <div class="radio-wrap">
                    <label
                        v-for="div in jenisDivisiOptions"
                        :key="div"
                        class="radio-label"
                    >
                        <input
                            type="radio"
                            v-model="filterState.divisi"
                            :value="div"
                            @change="onDivisiChange"
                        />
                        {{ div }}
                    </label>
                </div>
            </div>

            <div class="filter-divider" />

            <div class="filter-group">
                <span class="filter-label">Periode</span>
                <input
                    type="date"
                    v-model="filterState.startDate"
                    class="date-inp"
                    @change="fetchData"
                />
                <span class="filter-sep">s/d</span>
                <input
                    type="date"
                    v-model="filterState.endDate"
                    class="date-inp"
                    @change="fetchData"
                />
            </div>

            <div
                v-if="filterState.divisi === 'GARMEN'"
                class="filter-divider"
            />

            <!-- Legend -->
            <div v-if="filterState.divisi === 'GARMEN'" class="legend-group">
                <span class="filter-label" style="color: #888">Status:</span>
                <div class="legend-item">
                    <div class="ldot" style="background: #e53935"></div>
                    <span>OPEN</span>
                </div>
                <div class="legend-item">
                    <div class="ldot" style="background: #1976d2"></div>
                    <span>ONPROSES</span>
                </div>
                <div class="legend-item">
                    <div class="ldot" style="background: #fdd835"></div>
                    <span>Blm Approve</span>
                </div>
                <div class="filter-divider" style="margin: 0 6px" />
                <span class="filter-label" style="color: #888">Ngedit:</span>
                <span
                    class="badge-wait"
                    style="font-size: 10px; padding: 2px 6px"
                    >Nunggu Acc</span
                >
                <span
                    class="badge-acc"
                    style="font-size: 10px; padding: 2px 6px"
                    >Sudah Acc</span
                >
                <span
                    class="badge-tolak"
                    style="font-size: 10px; padding: 2px 6px"
                    >Tolak</span
                >
            </div>
        </template>

        <template #extra-actions="{ selected }">
            <template v-if="filterState.divisi === 'GARMEN'">
                <v-btn
                    v-if="
                        authStore.user?.bagian?.toUpperCase().includes('GUDANG')
                    "
                    size="small"
                    color="teal-darken-2"
                    :disabled="selected.length === 0"
                    @click="onApproveGudang"
                >
                    <template #prepend>
                        <IconHelmet :size="15" :stroke-width="1.7" />
                    </template>
                    Apv. Gudang
                </v-btn>

                <v-btn
                    v-if="authStore.user?.flags?.isManager"
                    size="small"
                    color="indigo-darken-2"
                    :disabled="selected.length === 0"
                    @click="onApproveManager"
                >
                    <template #prepend
                        ><IconTie :size="15" :stroke-width="1.7"
                    /></template>
                    Apv. Manager
                </v-btn>

                <v-btn
                    v-if="canEditActive"
                    size="small"
                    color="orange-darken-3"
                    :disabled="selected.length === 0"
                    @click="onAjukanPerubahan"
                >
                    <template #prepend
                        ><IconFileDescription :size="15" :stroke-width="1.7"
                    /></template>
                    Pengajuan
                </v-btn>
            </template>

            <v-btn
                size="small"
                color="grey-darken-3"
                :disabled="selected.length === 0"
                @click="onPrint"
            >
                <template #prepend
                    ><IconPrinter :size="15" :stroke-width="1.7"
                /></template>
                Cetak
            </v-btn>

            <template v-if="filterState.divisi === 'GARMEN'">
                <v-btn
                    v-if="canEditActive"
                    size="small"
                    color="red-darken-3"
                    :disabled="selected.length === 0"
                    @click="openCloseDialog"
                >
                    <template #prepend
                        ><IconCircleX :size="15" :stroke-width="1.7"
                    /></template>
                    Close Transaksi
                </v-btn>
                <v-btn
                    v-if="canExportActive"
                    size="small"
                    color="green-darken-3"
                    variant="outlined"
                    class="ml-2"
                    :loading="isExportingDetail"
                    @click="onExportDetail"
                >
                    <template #prepend>
                        <IconFileSpreadsheet :size="15" :stroke-width="1.7" />
                    </template>
                    Export Detail
                </v-btn>
            </template>
        </template>

        <!-- ── Kolom custom ── -->
        <template #item.Tanggal="{ item }">
            {{ formatTanggal((item.raw || item).Tanggal) }}
        </template>
        <template #item.Nomor="{ item }">
            <span
                v-if="filterState.divisi === 'GARMEN'"
                :class="getNomorClass(item)"
                >{{ (item.raw || item).Nomor }}</span
            >
            <span v-else class="font-weight-bold">{{
                (item.raw || item).Nomor
            }}</span>
        </template>
        <template #item.Tipe="{ item }">
            <v-chip
                size="x-small"
                :color="
                    (item.raw || item).Tipe === 'MMT'
                        ? 'primary'
                        : (item.raw || item).Tipe === 'OBAT'
                          ? 'purple'
                          : 'teal'
                "
                class="font-weight-bold"
            >
                {{ (item.raw || item).Tipe || "MMT" }}
            </v-chip>
        </template>
        <template #item.JmlSpk="{ item }">{{
            num((item.raw || item).JmlSpk)
        }}</template>
        <template #item.Approve="{ item }">
            <span :class="getApvClass((item.raw || item).Approve)">{{
                (item.raw || item).Approve
            }}</span>
        </template>
        <template #item.ApvGudang="{ item }">
            <span :class="getApvClass((item.raw || item).ApvGudang)">{{
                (item.raw || item).ApvGudang
            }}</span>
        </template>
        <template #item.ApvManager="{ item }">
            <span :class="getApvClass((item.raw || item).ApvManager)">{{
                (item.raw || item).ApvManager
            }}</span>
        </template>
        <template #item.Status="{ item }">
            <v-chip
                v-if="filterState.divisi === 'MMT'"
                size="x-small"
                :color="
                    (item.raw || item).Status === 'OPEN'
                        ? 'error'
                        : (item.raw || item).Status === 'ONPROSES'
                          ? 'info'
                          : 'success'
                "
                class="font-weight-bold"
            >
                {{ (item.raw || item).Status || "OPEN" }}
            </v-chip>
            <span v-else>{{ (item.raw || item).Status }}</span>
        </template>
        <template #item.IsPeriodLocked="{ item }">
            <span
                v-if="(item.raw || item).IsPeriodLocked"
                class="badge-locked"
                title="Periode akuntansi sudah ditutup, transaksi ini terkunci untuk diedit meski realisasi belum selesai."
            >
                🔒 Terkunci
            </span>
        </template>

        <!-- ── Detail expand ── -->
        <template #detail="{ item }">
            <!-- MMT Expand Detail -->
            <div
                v-if="filterState.divisi === 'MMT'"
                class="expand-detail-container pa-3"
            >
                <div class="d-flex align-center justify-space-between mb-2">
                    <div class="text-caption font-weight-bold text-primary">
                        Rincian Bahan Permintaan:
                        {{ getItemNomor(item) }} (Gudang:
                        {{ (item.raw || item).Gudang || "-" }} - Tipe:
                        {{ (item.raw || item).Tipe || "MMT" }})
                    </div>
                    <div
                        class="text-caption text-grey-darken-1 font-weight-medium"
                    >
                        Keterangan: {{ (item.raw || item).Keterangan || "-" }}
                    </div>
                </div>

                <div
                    v-if="
                        loadingMmtDetails[getItemNomor(item)] &&
                        getItemDetailsMmt(item).length === 0
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
                    v-else-if="getItemDetailsMmt(item).length === 0"
                    class="text-caption text-grey py-2"
                >
                    Tidak ada rincian bahan pada dokumen permintaan ini.
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
                            <th style="width: 75px" class="text-end">
                                Panjang
                            </th>
                            <th style="width: 75px" class="text-end">Lebar</th>
                            <th style="width: 70px" class="text-center">
                                Satuan
                            </th>
                            <th
                                style="width: 95px"
                                class="text-end font-weight-bold text-primary"
                            >
                                Qty Minta
                            </th>
                            <th style="width: 150px">No. SPK</th>
                            <th style="width: 110px">Komponen</th>
                            <th>Keterangan</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr
                            v-for="(d, dIdx) in getItemDetailsMmt(item)"
                            :key="dIdx"
                        >
                            <td class="text-center">{{ dIdx + 1 }}</td>
                            <td class="font-weight-medium text-primary">
                                {{
                                    d.Kode ||
                                    (d as any).kode ||
                                    (d as any).sku ||
                                    "-"
                                }}
                            </td>
                            <td>
                                {{
                                    d.Nama_Bahan ||
                                    (d as any).nama ||
                                    (d as any).Nama ||
                                    "-"
                                }}
                            </td>
                            <td class="text-end text-caption">
                                {{
                                    Number(
                                        d.Panjang || (d as any).panjang || 0,
                                    ) > 0
                                        ? Number(
                                              d.Panjang || (d as any).panjang,
                                          ).toFixed(2)
                                        : "-"
                                }}
                            </td>
                            <td class="text-end text-caption">
                                {{
                                    Number(d.Lebar || (d as any).lebar || 0) > 0
                                        ? Number(
                                              d.Lebar || (d as any).lebar,
                                          ).toFixed(2)
                                        : "-"
                                }}
                            </td>
                            <td class="text-center">
                                {{ d.Satuan || (d as any).satuan || "-" }}
                            </td>
                            <td class="text-end font-weight-bold text-primary">
                                {{
                                    Number(
                                        d.Jumlah ??
                                            (d as any).jumlah ??
                                            (d as any).qtyMinta ??
                                            0,
                                    ).toLocaleString("id-ID")
                                }}
                            </td>
                            <td class="font-monospace text-caption">
                                {{
                                    d.Nomor_SPK ||
                                    (d as any).spk ||
                                    (d as any).spk_nomor ||
                                    "-"
                                }}
                            </td>
                            <td>
                                {{ d.komponen || (d as any).Komponen || "-" }}
                            </td>
                            <td class="text-grey-darken-1">
                                {{
                                    d.Keterangan ||
                                    (d as any).ket ||
                                    (d as any).keterangan ||
                                    "-"
                                }}
                            </td>
                        </tr>
                    </tbody>
                </v-table>
            </div>

            <!-- GARMEN Expand Detail -->
            <div v-else class="det-wrap">
                <div v-if="loadingDetails.has(item.Nomor)" class="det-loading">
                    <v-progress-circular
                        indeterminate
                        color="primary"
                        size="20"
                        width="2"
                    />
                    <span>Memuat detail...</span>
                </div>

                <template v-else-if="detailsData[item.Nomor]">
                    <!-- Tabel 1: Detail Permintaan Bahan -->
                    <div class="det-card tbl1 mb-2">
                        <div class="det-head" style="background: #1565c0">
                            Detail Permintaan Bahan
                        </div>
                        <div class="dt-scroll">
                            <table class="dt">
                                <thead>
                                    <tr>
                                        <th style="width: 28px">No</th>
                                        <th
                                            style="
                                                width: 140px;
                                                text-align: left;
                                            "
                                        >
                                            Nomor
                                        </th>
                                        <th
                                            style="
                                                width: 90px;
                                                text-align: left;
                                            "
                                        >
                                            Kode
                                        </th>
                                        <th style="text-align: left">
                                            Nama Bahan
                                        </th>
                                        <template
                                            v-if="
                                                adaSpanduk(
                                                    detailsData[item.Nomor]
                                                        .bahan,
                                                )
                                            "
                                        >
                                            <th style="width: 90px">
                                                Konstruksi
                                            </th>
                                            <th
                                                style="
                                                    width: 60px;
                                                    text-align: right;
                                                "
                                            >
                                                Panjang
                                            </th>
                                            <th
                                                style="
                                                    width: 60px;
                                                    text-align: right;
                                                "
                                            >
                                                Lebar
                                            </th>
                                        </template>
                                        <th v-else style="width: 70px">
                                            Setting
                                        </th>
                                        <th style="width: 50px">Satuan</th>
                                        <th
                                            style="
                                                width: 70px;
                                                text-align: right;
                                            "
                                        >
                                            Babaran
                                        </th>
                                        <th
                                            style="
                                                width: 60px;
                                                text-align: right;
                                            "
                                        >
                                            PCS
                                        </th>
                                        <th
                                            style="
                                                width: 75px;
                                                text-align: right;
                                            "
                                        >
                                            Jumlah
                                        </th>
                                        <th
                                            style="
                                                width: 75px;
                                                text-align: right;
                                            "
                                        >
                                            Realisasi
                                        </th>
                                        <th
                                            v-if="
                                                !adaSpanduk(
                                                    detailsData[item.Nomor]
                                                        .bahan,
                                                )
                                            "
                                            style="
                                                width: 120px;
                                                text-align: left;
                                            "
                                        >
                                            Komponen
                                        </th>
                                        <th style="text-align: left">
                                            Keterangan
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr
                                        v-for="(bhn, i) in detailsData[
                                            item.Nomor
                                        ].bahan"
                                        :key="i"
                                    >
                                        <td class="tc">{{ i + 1 }}</td>
                                        <td
                                            style="
                                                font-weight: 600;
                                                color: #555;
                                            "
                                        >
                                            {{ bhn.Nomor }}
                                        </td>
                                        <td
                                            style="
                                                font-weight: 600;
                                                color: #1565c0;
                                            "
                                        >
                                            {{ bhn.Kode }}
                                        </td>
                                        <td>{{ bhn.NamaBahan }}</td>
                                        <template
                                            v-if="
                                                adaSpanduk(
                                                    detailsData[item.Nomor]
                                                        .bahan,
                                                )
                                            "
                                        >
                                            <td class="tc">
                                                {{ bhn.Konstruksi }}
                                            </td>
                                            <td class="tr">
                                                {{ fmtUkuran(bhn.Panjang) }}
                                            </td>
                                            <td class="tr">
                                                {{ fmtUkuran(bhn.Lebar) }}
                                            </td>
                                        </template>
                                        <td v-else class="tc">
                                            {{ bhn.Setting }}
                                        </td>
                                        <td class="tc">{{ bhn.Satuan }}</td>
                                        <td class="tr">
                                            {{ num(bhn.Babaran) }}
                                        </td>
                                        <td class="tr">{{ num(bhn.Pcs) }}</td>
                                        <td
                                            class="tr"
                                            style="
                                                font-weight: 700;
                                                background: #fffde7;
                                            "
                                        >
                                            {{ num(bhn.Jumlah) }}
                                        </td>
                                        <td
                                            class="tr"
                                            style="
                                                font-weight: 700;
                                                color: #2e7d32;
                                            "
                                        >
                                            {{ num(bhn.Realisasi) }}
                                        </td>
                                        <td
                                            v-if="
                                                !adaSpanduk(
                                                    detailsData[item.Nomor]
                                                        .bahan,
                                                )
                                            "
                                        >
                                            {{ bhn.Komponen }}
                                        </td>
                                        <td>{{ bhn.Keterangan }}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                        <!-- /.dt-scroll -->
                    </div>

                    <!-- Tabel 2 & 3: Realisasi + Detail Realisasi -->
                    <div class="det-row">
                        <!-- Tabel 2: Realisasi -->
                        <div class="det-card" style="flex: 1.2">
                            <div class="det-head" style="background: #00796b">
                                Realisasi
                                <span
                                    style="
                                        font-weight: 400;
                                        font-size: 10px;
                                        margin-left: 8px;
                                        opacity: 0.85;
                                    "
                                    >(Klik baris untuk melihat rincian)</span
                                >
                            </div>
                            <div class="dt-scroll">
                                <table class="dt">
                                    <thead>
                                        <tr>
                                            <th style="width: 28px">No</th>
                                            <th
                                                style="
                                                    width: 140px;
                                                    text-align: left;
                                                "
                                            >
                                                No. Realisasi
                                            </th>
                                            <th style="width: 95px">
                                                Tgl Realisasi
                                            </th>
                                            <th style="width: 145px">
                                                Waktu Approve
                                            </th>
                                            <th
                                                style="
                                                    width: 75px;
                                                    text-align: right;
                                                "
                                            >
                                                Jumlah
                                            </th>
                                            <th style="text-align: left">
                                                Keterangan
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr
                                            v-for="(rel, i) in detailsData[
                                                item.Nomor
                                            ].realisasi"
                                            :key="i"
                                            class="rel-row"
                                            :class="{
                                                'rel-active':
                                                    activeRealisasi[
                                                        item.Nomor
                                                    ] === rel.NomorRealisasi,
                                            }"
                                            @click="
                                                selectRealisasi(
                                                    item.Nomor,
                                                    rel.NomorRealisasi,
                                                )
                                            "
                                        >
                                            <td class="tc">{{ i + 1 }}</td>
                                            <td
                                                style="
                                                    font-weight: 700;
                                                    color: #00796b;
                                                "
                                            >
                                                {{ rel.NomorRealisasi }}
                                            </td>
                                            <td class="tc">
                                                {{
                                                    formatTanggal(
                                                        rel.TglRealisasi,
                                                    )
                                                }}
                                            </td>
                                            <td class="tc">
                                                <span
                                                    v-if="rel.WaktuApprove"
                                                    style="
                                                        font-weight: 600;
                                                        color: #2e7d32;
                                                    "
                                                >
                                                    {{
                                                        formatTanggal(
                                                            rel.WaktuApprove,
                                                        )
                                                    }}
                                                </span>

                                                <v-btn
                                                    v-else
                                                    size="x-small"
                                                    color="primary"
                                                    variant="flat"
                                                    class="px-2 text-none"
                                                    @click.stop="
                                                        onApproveRealisasi(
                                                            item.Nomor,
                                                            rel.NomorRealisasi,
                                                            item.Cab,
                                                        )
                                                    "
                                                >
                                                    <IconCheck
                                                        :size="14"
                                                        :stroke-width="2"
                                                        class="mr-1"
                                                    />
                                                    ACC
                                                </v-btn>
                                            </td>
                                            <td
                                                class="tr"
                                                style="font-weight: 700"
                                            >
                                                {{ num(rel.TotalJumlah) }}
                                            </td>
                                            <td>{{ rel.Keterangan }}</td>
                                        </tr>
                                        <tr
                                            v-if="
                                                !detailsData[item.Nomor]
                                                    .realisasi?.length
                                            "
                                        >
                                            <td colspan="6" class="empty-td">
                                                Belum ada realisasi.
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                            <!-- /.dt-scroll -->
                        </div>

                        <!-- Tabel 3: Detail Realisasi -->
                        <div class="det-card" style="flex: 0.8">
                            <div class="det-head" style="background: #455a64">
                                Detail Realisasi
                                <span
                                    v-if="activeRealisasi[item.Nomor]"
                                    style="
                                        font-weight: 400;
                                        font-size: 10px;
                                        margin-left: 6px;
                                        opacity: 0.85;
                                    "
                                >
                                    : {{ activeRealisasi[item.Nomor] }}
                                </span>
                            </div>
                            <div class="dt-scroll">
                                <table class="dt">
                                    <thead>
                                        <tr>
                                            <th style="width: 28px">No</th>
                                            <th
                                                style="
                                                    width: 80px;
                                                    text-align: left;
                                                "
                                            >
                                                Kode
                                            </th>
                                            <th style="text-align: left">
                                                Nama
                                            </th>
                                            <th
                                                v-if="
                                                    adaSpanduk(
                                                        detailsData[item.Nomor]
                                                            .realisasiDtl,
                                                    )
                                                "
                                                style="width: 130px"
                                            >
                                                Ukuran
                                            </th>
                                            <th v-else style="width: 70px">
                                                Setting
                                            </th>
                                            <th style="width: 55px">Satuan</th>
                                            <th
                                                style="
                                                    width: 75px;
                                                    text-align: right;
                                                "
                                            >
                                                Jumlah
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <template
                                            v-if="activeRealisasi[item.Nomor]"
                                        >
                                            <tr
                                                v-for="(dtl, j) in (
                                                    detailsData[item.Nomor]
                                                        .realisasiDtl || []
                                                ).filter(
                                                    (x) =>
                                                        x.NomorRealisasi ===
                                                        activeRealisasi[
                                                            item.Nomor
                                                        ],
                                                )"
                                                :key="j"
                                            >
                                                <td class="tc">{{ j + 1 }}</td>
                                                <td
                                                    style="
                                                        font-weight: 600;
                                                        color: #1565c0;
                                                    "
                                                >
                                                    {{ dtl.Kode }}
                                                </td>
                                                <td>{{ dtl.Nama }}</td>
                                                <td
                                                    v-if="
                                                        adaSpanduk(
                                                            detailsData[
                                                                item.Nomor
                                                            ].realisasiDtl,
                                                        )
                                                    "
                                                    class="tc"
                                                >
                                                    {{ ringkasUkuran(dtl) }}
                                                </td>
                                                <td v-else class="tc">
                                                    {{ dtl.Setting }}
                                                </td>
                                                <td class="tc">
                                                    {{ dtl.Satuan }}
                                                </td>
                                                <td
                                                    class="tr"
                                                    style="
                                                        font-weight: 700;
                                                        background: #fffde7;
                                                    "
                                                >
                                                    {{ num(dtl.Jumlah) }}
                                                </td>
                                            </tr>
                                        </template>
                                        <tr v-else>
                                            <td colspan="6" class="empty-td">
                                                Pilih data realisasi di sebelah
                                                kiri.
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                            <!-- /.dt-scroll -->
                        </div>
                    </div>
                </template>
            </div>
        </template>
    </BaseBrowse>

    <!-- Dialog Close -->
    <v-dialog v-model="closeDialog" max-width="400px" persistent>
        <div class="close-dlg">
            <div class="close-dlg-header">
                <IconCircleX :size="14" color="white" class="mr-2" />
                Close Transaksi
                <button class="dlg-x" @click="closeDialog = false">✕</button>
            </div>
            <div class="close-dlg-body">
                <div class="f-lbl-sm mb-1">Alasan Close:</div>
                <textarea
                    v-model="closeForm.alasan"
                    class="close-area"
                    rows="3"
                    placeholder="Masukkan alasan manual close..."
                ></textarea>
            </div>
            <div class="close-dlg-footer">
                <button class="dlg-btn save" @click="submitClose">
                    Simpan Close
                </button>
                <button class="dlg-btn cancel" @click="closeDialog = false">
                    Batal
                </button>
            </div>
        </div>
    </v-dialog>

    <v-dialog v-model="actionDialog" max-width="400px" persistent>
        <div class="close-dlg">
            <div class="close-dlg-header" style="background: #1565c0">
                <component
                    :is="
                        actionType === 'AJUKAN'
                            ? IconFileDescription
                            : IconShieldCheck
                    "
                    :size="14"
                    color="white"
                    class="mr-2"
                />
                {{
                    actionType === "GUDANG"
                        ? "Approve Gudang"
                        : actionType === "MANAGER"
                          ? "Approve Manager"
                          : "Pengajuan Perubahan"
                }}
                <button class="dlg-x" @click="actionDialog = false">✕</button>
            </div>

            <div class="close-dlg-body">
                <template v-if="actionType !== 'AJUKAN'">
                    <div class="d-flex gap-4 mb-3">
                        <label class="d-flex align-center gap-1 cursor-pointer">
                            <input
                                type="radio"
                                v-model="actionForm.status"
                                value="APPROVE"
                            />
                            <span class="font-weight-bold">Approve</span>
                        </label>
                        <label
                            class="d-flex align-center gap-1 cursor-pointer text-red-darken-3"
                        >
                            <input
                                type="radio"
                                v-model="actionForm.status"
                                value="TOLAK"
                            />
                            <span class="font-weight-bold">Tolak</span>
                        </label>
                    </div>
                </template>

                <div class="f-lbl-sm mb-1">
                    {{
                        actionType === "AJUKAN"
                            ? "Alasan Pengajuan:"
                            : actionForm.status === "TOLAK"
                              ? "Alasan Penolakan (Wajib):"
                              : "Keterangan (Opsional):"
                    }}
                </div>
                <textarea
                    v-model="actionForm.alasan"
                    class="close-area"
                    rows="3"
                    placeholder="Masukkan alasan..."
                ></textarea>
            </div>

            <div class="close-dlg-footer">
                <button
                    class="dlg-btn text-white"
                    style="background: #1565c0"
                    @click="submitAction"
                >
                    Simpan
                </button>
                <button class="dlg-btn cancel" @click="actionDialog = false">
                    Batal
                </button>
            </div>
        </div>
    </v-dialog>
</template>

<style scoped>
/* ── Filter ── */
.filter-group {
    display: flex;
    align-items: center;
    gap: 6px;
}
.filter-label {
    font-size: 11px;
    font-weight: 700;
    color: #555;
    white-space: nowrap;
}
.filter-sep {
    font-size: 11px;
    color: #888;
}
.filter-divider {
    width: 1px;
    height: 22px;
    background: #d0d0d0;
    margin: 0 10px;
    flex-shrink: 0;
}
.date-inp {
    height: 28px;
    border: 1px solid #ccc;
    border-radius: 4px;
    padding: 0 6px;
    font-size: 12px;
    background: white;
    outline: none;
    color: #212121;
}
.date-inp:focus {
    border-color: #1976d2;
}
.ml-3 {
    margin-left: 12px;
}

.radio-wrap {
    display: flex;
    align-items: center;
    gap: 8px;
    background: white;
    border: 1px solid #ccc;
    border-radius: 4px;
    padding: 0 8px;
    height: 28px;
}
.radio-label {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 11px;
    font-weight: 600;
    color: #424242;
    cursor: pointer;
    white-space: nowrap;
}
.radio-label input[type="radio"] {
    accent-color: #1565c0;
    cursor: pointer;
    width: 13px;
    height: 13px;
    margin: 0;
}

.legend-group {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
}
.legend-item {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 11px;
}
.ldot {
    width: 11px;
    height: 11px;
    border-radius: 2px;
    border: 1px solid rgba(0, 0, 0, 0.1);
    flex-shrink: 0;
}

/* ── Ngedit badges ── */
.badge-wait {
    background: #1565c0;
    color: white;
    border-radius: 3px;
    padding: 1px 6px;
    font-size: 10px;
    font-weight: 700;
    white-space: nowrap;
}
.badge-acc {
    background: #2e7d32;
    color: white;
    border-radius: 3px;
    padding: 1px 6px;
    font-size: 10px;
    font-weight: 700;
    white-space: nowrap;
}
.badge-tolak {
    background: #c62828;
    color: white;
    border-radius: 3px;
    padding: 1px 6px;
    font-size: 10px;
    font-weight: 700;
    white-space: nowrap;
}
.apv-n {
    background: #fdd835;
    color: #333;
    border-radius: 3px;
    padding: 1px 6px;
    font-size: 10px;
    font-weight: 700;
    display: inline-block;
}

/* ── Detail wrapper ── */
.det-wrap {
    padding: 6px 8px 8px 48px;
    background: #f5f6f8;
}
.det-loading {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 0;
    font-size: 12px;
    color: #757575;
}
.mb-2 {
    margin-bottom: 6px;
}

.det-card {
    border: 1px solid #d0d0d0;
    border-radius: 4px;
    overflow: hidden;
    background: white;
}
.det-head {
    color: white;
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    padding: 4px 9px;
    flex-shrink: 0;
}
.det-row {
    display: flex;
    gap: 8px;
}

/* Scroll wrapper dalam setiap card */
.det-card .dt-scroll {
    overflow-y: auto;
    max-height: 140px;
}
/* Tabel 1 sedikit lebih tinggi karena bisa lebih banyak bahan */
.det-card.tbl1 .dt-scroll {
    max-height: 110px;
}

/* ── Detail table ── */
.dt {
    width: 100%;
    border-collapse: collapse;
    font-size: 11px;
}
.dt thead tr {
    background-color: inherit;
}
.dt th {
    padding: 4px 7px;
    font-size: 10px;
    font-weight: 700;
    color: white;
    text-align: center;
    border: 1px solid rgba(0, 0, 0, 0.15);
    white-space: nowrap;
}
.dt td {
    border-bottom: 1px solid #eeeeee;
    padding: 3px 6px;
    vertical-align: middle;
}
.dt tbody tr:nth-of-type(even) td {
    background: #fafafa;
}

.rel-row {
    cursor: pointer;
}
.rel-row:hover td {
    background: #e0f2f1 !important;
}
.rel-active td {
    background: #b2dfdb !important;
}

.tc {
    text-align: center;
}
.tr {
    text-align: right;
}
.empty-td {
    text-align: center;
    color: #9e9e9e;
    font-style: italic;
    padding: 12px !important;
}

/* ── Close dialog ── */
.close-dlg {
    background: white;
    border-radius: 8px;
    overflow: hidden;
    font-family: "Segoe UI", sans-serif;
    font-size: 12px;
}
.close-dlg-header {
    display: flex;
    align-items: center;
    background: #c62828;
    color: white;
    padding: 9px 14px;
    font-size: 13px;
    font-weight: 700;
    gap: 4px;
}
.dlg-x {
    margin-left: auto;
    background: transparent;
    border: none;
    color: rgba(255, 255, 255, 0.8);
    font-size: 15px;
    cursor: pointer;
}
.dlg-x:hover {
    color: white;
}
.close-dlg-body {
    padding: 14px;
}
.f-lbl-sm {
    font-size: 11px;
    font-weight: 600;
    color: #424242;
}
.close-area {
    width: 100%;
    border: 1px solid #bdbdbd;
    border-radius: 4px;
    padding: 6px 8px;
    font-size: 11px;
    font-family: inherit;
    outline: none;
    resize: none;
    box-sizing: border-box;
}
.close-area:focus {
    border-color: #1565c0;
}
.close-dlg-footer {
    display: flex;
    gap: 8px;
    padding: 10px 14px;
    border-top: 1px solid #e0e0e0;
    background: #fafafa;
}
.dlg-btn {
    height: 28px;
    padding: 0 14px;
    border: none;
    border-radius: 4px;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
}
.dlg-btn.save {
    background: #c62828;
    color: white;
}
.dlg-btn.save:hover {
    background: #b71c1c;
}
.dlg-btn.cancel {
    background: #e0e0e0;
    color: #424242;
    margin-left: auto;
}
.dlg-btn.cancel:hover {
    background: #d0d0d0;
}
.badge-locked {
    background: #757575;
    color: white;
    border-radius: 3px;
    padding: 1px 6px;
    font-size: 10px;
    font-weight: 700;
    white-space: nowrap;
}
</style>
