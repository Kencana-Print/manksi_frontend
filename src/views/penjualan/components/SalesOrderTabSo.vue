<script setup lang="ts">
import { computed, ref, watch, nextTick } from "vue";
import {
  IconUpload,
  IconMaximize,
  IconPhoto,
  IconExclamationCircle,
  IconSearch,
} from "@tabler/icons-vue";
import { useToast } from "vue-toastification";
import { useAuthStore } from "@/stores/authStore";
import api from "@/services/api";

const props = defineProps<{
  formData: any;
  isEdit: boolean;
  lookupOptions: {
    divisi: any[];
    kepentingan: string[];
    ketPo: { ket: string; acc: string }[];
    panjang: string[];
    lebar: string[];
    kain: string[];
    gramasi: string[];
    finishing: string[];
  };
}>();
const emit = defineEmits([
  "upload-main",
  "open-lookup",
  "open-fullscreen",
  "field-blur",
  "confirm-uncheck-cmo",
  "switch-tab",
]);
const toast = useToast();
const authStore = useAuthStore();
const isOpeningModal = ref(false);

const isDivisiTiga = computed(() =>
  String(props.formData.spk_divisi).startsWith("3"),
);
const isDivisiSatuAtauLima = computed(() => {
  const d = String(props.formData.spk_divisi).charAt(0);
  return d === "1" || d === "5";
});

const tipeSpkOptions = ["", "Premium", "Medium", "Reguler"];
const pendingOptions = ["NORMAL", "PENDING SEBAGIAN", "PENDING PENUH"];

const showPreviewDialog = ref(false);
const isImageError = ref(false);
const isAutoSettingDateline = ref(false);
const isInitialLoad = ref(true);

const workshopCache = ref<any[]>([]);

const fileRef = ref<HTMLInputElement | null>(null);
const resolvedImageUrl = ref("");

const displayImageUrl = computed(() => {
  if (props.formData.MainImageBlob) return props.formData.MainImageBlob;
  if (resolvedImageUrl.value) return resolvedImageUrl.value; // ← pakai fallback jika sudah resolved

  const base =
    import.meta.env.VITE_API_BASE_URL?.replace(/\/api\/?$/, "") ||
    api.defaults.baseURL?.replace(/\/api\/?$/, "") ||
    `${window.location.protocol}//${window.location.hostname}:3088`;

  const cab = props.formData.spk_cab || "HO-";
  const nomor = props.formData.spk_memo || props.formData.spk_nomor;
  if (!nomor) return "";

  if (props.formData.spk_memo) {
    return `${base}/images/${cab}/map/${encodeURIComponent(props.formData.spk_memo)}.jpg`;
  }
  return `${base}/images/${cab}/${encodeURIComponent(nomor)}.jpg`;
});

const onImageError = (e: Event) => {
  const img = e.target as HTMLImageElement;

  if (img.dataset.fallbackTried === "true") {
    isImageError.value = true;
    img.style.display = "none";
    resolvedImageUrl.value = "";
    return;
  }
  img.dataset.fallbackTried = "true";

  const nomor = props.formData.spk_memo || props.formData.spk_nomor;
  if (!nomor) {
    isImageError.value = true;
    return;
  }

  let fallbackUrl = "";
  if (props.formData.spk_memo) {
    fallbackUrl = `http://103.94.238.252:8888/file-gambar/${encodeURIComponent(nomor)}.jpg`;
  } else {
    fallbackUrl = `http://103.94.238.252:8888/file-gambar/${encodeURIComponent(nomor)}.jpg`;
  }
  img.src = fallbackUrl;
  resolvedImageUrl.value = fallbackUrl; // ← simpan URL yang berhasil
};

watch([() => props.formData.spk_nomor, () => props.formData.spk_memo], () => {
  resolvedImageUrl.value = "";
  isImageError.value = false;
});

const onFileChange = (e: Event) => {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (!file) return;
  // Di Delphi maksimal 1 MB
  if (file.size > 1_000_000) {
    toast.error("Ukuran gambar tidak boleh > 1 Mb.");
    return;
  }

  isImageError.value = false;

  // Update state lokal untuk Preview (URL Blob sementara)
  props.formData.MainImageName = file.name;
  props.formData.MainImageBlob = URL.createObjectURL(file);

  // Lepmpar file aslinya ke Komponen Induk (SalesOrderFormView.vue)
  emit("upload-main", file);
};

const toggleCmo = () => {
  if (!props.formData.spk_cmo) {
    props.formData.spk_cmo = authStore.user?.kode || "ADMIN";
    props.formData.isCmoChecked = true;
  } else {
    props.formData.isCmoChecked = true;
    emit("confirm-uncheck-cmo");
  }
};

const handleJumlahBlur = () => {
  const qty = Number(props.formData.spk_jumlah) || 0;
  const mppb = Number(props.formData.jmlmppb) || 0;

  // Peringatan Beda MPPB
  if (props.formData.spk_mppb && mppb !== 0 && qty !== 0 && qty !== mppb) {
    toast.warning(
      `Jumlah SPK beda dengan jumlah di MPPB.\nJumlah di MPPB = ${mppb}`,
      { timeout: 8000 },
    );
  }

  // Auto-Navigasi Tab
  const divStr = String(props.formData.spk_divisi).charAt(0);
  if ((divStr === "3" || divStr === "4" || divStr === "6") && qty > 0) {
    emit("switch-tab", 2); // Pindah ke Tab Kaosan/Detail Size
  }
};

const handlePinJoClick = () => {
  if (authStore.user?.cabangKaos === "KDC") {
    const isAcc = confirm(
      "Akan di ACC Jenis Order ini?\n\nOK = Acc\nBatal = Tolak",
    );
    if (isAcc) {
      props.formData.spk_pinjo = "ACC";
      toast.success(
        "ACC Jenis Order berhasil. Lakukan simpan data untuk melanjutkan.",
      );
    } else {
      const isTolak = confirm("Tolak Jenis Order ini?");
      if (isTolak) {
        props.formData.spk_pinjo = "TOLAK";
        toast.info("Tolak Jenis Order. Lakukan simpan data untuk melanjutkan.");
      }
    }
  } else {
    toast.error("Akses Ditolak: Hanya cabang KDC yang berhak ACC Jenis Order.");
  }
};

const pendingAccDisplay = computed(() => {
  if (props.formData.spk_pending === "NORMAL") return "";
  if (props.formData.spk_accpending === "ACC") return "ACC";
  if (props.formData.spk_accpending === "N") return "TOLAK";
  return "MINTA ACC";
});

const handleAccPendingClick = () => {
  if (props.formData.spk_pending !== "NORMAL") {
    if (authStore.user?.bagian?.toUpperCase() !== "MARKETING") {
      toast.error("Hanya CMO (Marketing) yang boleh ACC Pending.");
      return;
    }
    const isAcc = confirm(
      "Akan di ACC status Pending ini?\n\nOK = Acc\nCancel = Tidak Acc",
    );
    if (isAcc) {
      props.formData.spk_accpending = "ACC";
      toast.success(
        "ACC Pending berhasil. Lakukan simpan data untuk melanjutkan.",
      );
    } else {
      props.formData.spk_accpending = "N";
      toast.info(
        "Status ACC Pending ditolak. Lakukan simpan data untuk melanjutkan.",
      );
    }
  }
};

// ── Generic lookup by kode ──
const lookupByKode = async (
  endpoint: string,
  kode: string,
  kodeField: string,
  namaField: string,
) => {
  if (!kode?.trim()) return null;
  const res = await api.get(endpoint, { params: { q: kode.trim(), limit: 1 } });
  const items = res.data.data?.items || res.data.data || [];
  return (
    items.find((i: any) => {
      // Coba semua kemungkinan casing: kodeField asli, kapital huruf pertama, all caps
      const val =
        i[kodeField] ||
        i[kodeField.charAt(0).toUpperCase() + kodeField.slice(1)] ||
        i["Kode"] ||
        i["kode"] ||
        "";
      return val.toString().toUpperCase() === kode.trim().toUpperCase();
    }) || null
  );
};

// Perusahaan
const onPerushKodeEnter = async () => {
  if (isOpeningModal.value) return;
  const kode = props.formData.spk_perush_kode?.trim();
  if (!kode) {
    props.formData.NamaPerusahaan = "";
    return;
  }
  try {
    const item = await lookupByKode(
      "/lookups/perusahaan",
      kode,
      "perush_kode",
      "perush_nama",
    );
    if (item) {
      props.formData.spk_perush_kode = item.perush_kode || item.Kode;
      props.formData.NamaPerusahaan = item.perush_nama || item.Nama;
    } else {
      toast.error("Kode perusahaan tidak ditemukan.");
      props.formData.spk_perush_kode = "";
      props.formData.NamaPerusahaan = "";
    }
  } catch {
    toast.error("Gagal validasi kode perusahaan.");
  }
};

// Customer
const onCustKodeEnter = async () => {
  if (isOpeningModal.value) return;
  const kode = props.formData.spk_cus_kode?.trim();
  if (!kode) {
    props.formData.Customer = "";
    return;
  }
  try {
    const res = await api.get("/lookups/customer", {
      params: { q: kode, limit: 1 },
    });
    const items = res.data.data?.items || res.data.data || [];
    const item = items.find(
      (i: any) =>
        (i.Kode || i.cus_kode || "").toUpperCase() === kode.toUpperCase(),
    );
    if (item) {
      const aktif = item.cus_aktif ?? item.Aktif ?? 0;
      if (aktif === 1 || aktif === "1") {
        toast.warning("Status Customer Pasif.");
        props.formData.spk_cus_kode = "";
        props.formData.Customer = "";
        return;
      }
      props.formData.spk_cus_kode = item.Kode || item.cus_kode;
      props.formData.Customer = item.Nama || item.cus_nama;
      props.formData.cus_perfect = item.cus_perfect || "N";
      emit("field-blur", "customer", props.formData.spk_cus_kode);
    } else {
      toast.error("Kode customer tidak ditemukan.");
      props.formData.spk_cus_kode = "";
      props.formData.Customer = "";
    }
  } catch {
    toast.error("Gagal validasi kode customer.");
  }
};

// Jenis Order
const onJoKodeEnter = async () => {
  if (isOpeningModal.value) return;
  const kode = props.formData.spk_jo_kode?.trim();
  if (!kode) {
    props.formData.JenisOrder = "";
    return;
  }
  try {
    const res = await api.get("/lookups/jenis-order", {
      params: { q: kode, divisi: props.formData.spk_divisi, limit: 1 },
    });
    const items = res.data.data?.items || res.data.data || [];
    const item = items.find(
      (i: any) =>
        (i.jo_kode || i.Kode || "").toUpperCase() === kode.toUpperCase(),
    );
    if (item) {
      props.formData.spk_jo_kode = item.jo_kode || item.Kode;
      props.formData.JenisOrder = item.jo_nama || item.Nama;
    } else {
      toast.error("Kode jenis order tidak ditemukan.");
      props.formData.spk_jo_kode = "";
      props.formData.JenisOrder = "";
    }
  } catch {
    toast.error("Gagal validasi kode jenis order.");
  }
};

// Sales
const onSalesKodeEnter = async () => {
  if (isOpeningModal.value) return;
  const kode = props.formData.spk_sal_kode?.trim();
  if (!kode) {
    props.formData.Sales = "";
    return;
  }
  try {
    const item = await lookupByKode(
      "/lookups/sales",
      kode,
      "sal_kode",
      "sal_nama",
    );
    if (item) {
      props.formData.spk_sal_kode = item.sal_kode || item.Kode;
      props.formData.Sales = item.sal_nama || item.Nama;
    } else {
      toast.error("Kode sales tidak ditemukan.");
      props.formData.spk_sal_kode = "";
      props.formData.Sales = "";
    }
  } catch {
    toast.error("Gagal validasi kode sales.");
  }
};

const getWorkshopByKode = async (kode: string) => {
  if (workshopCache.value.length === 0) {
    const res = await api.get("/lookups/cabang-pabrik");
    workshopCache.value = res.data.data?.items || res.data.data || [];
  }
  return (
    workshopCache.value.find(
      (i: any) =>
        (i.pab_kode || i.Kode || "").toUpperCase() === kode.toUpperCase(),
    ) || null
  );
};

// Workshop (Pabrik/Cabang)
const onWorkshopKodeEnter = async () => {
  if (isOpeningModal.value) return;
  const kode = props.formData.spk_cab?.trim();
  if (!kode) {
    props.formData.spk_workshop = "";
    return;
  }
  try {
    const item = await getWorkshopByKode(kode);
    if (item) {
      props.formData.spk_cab = item.pab_kode || item.Kode;
      props.formData.spk_workshop = item.pab_nama || item.Nama;
    } else {
      toast.error("Kode workshop tidak ditemukan.");
      props.formData.spk_cab = "";
      props.formData.spk_workshop = "";
    }
  } catch {
    toast.error("Gagal validasi kode workshop.");
  }
};

// ── F1 handlers — tangkap di input, emit ke parent ──
const onPerushF1 = (e: KeyboardEvent) => {
  if (e.key === "F1") {
    e.preventDefault();
    if (!props.isEdit) emit("open-lookup", "perusahaan");
  }
};
const onCustF1 = (e: KeyboardEvent) => {
  if (e.key === "F1") {
    e.preventDefault();
    emit("open-lookup", "customer");
  }
};
const onCustKaosanF1 = (e: KeyboardEvent) => {
  if (e.key === "F1") {
    e.preventDefault();
    emit("open-lookup", "custKaosan");
  }
};
const onJoF1 = (e: KeyboardEvent) => {
  if (e.key === "F1") {
    e.preventDefault();
    if (!props.isEdit) emit("open-lookup", "jenisOrder");
  }
};
const onSalesF1 = (e: KeyboardEvent) => {
  if (e.key === "F1") {
    e.preventDefault();
    emit("open-lookup", "sales");
  }
};
const onWorkshopF1 = (e: KeyboardEvent) => {
  if (e.key === "F1") {
    e.preventDefault();
    emit("open-lookup", "workshop");
  }
};
const onPenawaranF1 = (e: KeyboardEvent) => {
  if (e.key === "F1") {
    e.preventDefault();
    emit("open-lookup", "penawaran");
  }
};
const onSjMemoF1 = (e: KeyboardEvent) => {
  if (e.key === "F1") {
    e.preventDefault();
    emit("open-lookup", "sjMemo");
  }
};
const onMemoF1 = (e: KeyboardEvent) => {
  if (e.key === "F1") {
    e.preventDefault();
    emit("open-lookup", "memo");
  }
};
const onMppbF1 = (e: KeyboardEvent) => {
  if (e.key === "F1") {
    e.preventDefault();
    emit("open-lookup", "mppb");
  }
};
const onInvDcF1 = (e: KeyboardEvent) => {
  if (e.key === "F1") {
    e.preventDefault();
    emit("open-lookup", isDivisiTiga.value ? "soKaosan" : "stokDc");
  }
};
const onRepeatF1 = (e: KeyboardEvent) => {
  if (e.key === "F1") {
    e.preventDefault();
    emit("open-lookup", "repeat");
  }
};
const onSpkLamaF1 = (e: KeyboardEvent) => {
  if (e.key === "F1") {
    e.preventDefault();
    emit("open-lookup", "spkLama");
  }
};
const onNomorPoF1 = (e: KeyboardEvent) => {
  if (e.key === "F1") {
    e.preventDefault();
    emit("open-lookup", "setoranPembayaran");
  }
};

// Tambahkan helper ini untuk menambah hari pada YYYY-MM-DD
const addDaysToDate = (dateStr: string, days: number) => {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);

  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

// --- WATCHER AUTO-DATELINE (MIGRASI DELPHI) ---
watch(
  [
    () => props.formData.spk_tanggal,
    () => props.formData.spk_divisi,
    () => props.formData.spk_jo_kode,
    () => props.formData.spk_statuskerja,
    () => props.formData.spk_dateline,
  ],
  async ([tglSpk, divisi, joKode, kepentingan, userDateline], oldVals) => {
    if (!tglSpk || !divisi || !kepentingan) return;

    const datelineChanged = userDateline !== oldVals?.[4];
    const otherChanged =
      tglSpk !== oldVals?.[0] ||
      divisi !== oldVals?.[1] ||
      joKode !== oldVals?.[2] ||
      kepentingan !== oldVals?.[3];

    // Skip jika user edit dateline langsung (bukan initial load & bukan perubahan field lain)
    if (datelineChanged && !otherChanged && !isInitialLoad.value) return;
    if (isAutoSettingDateline.value) return;

    try {
      const res = await api.get("/penjualan/sales-order/form/dateline-limits", {
        params: { divisi, joKode, kepentingan },
      });

      const { minHari, maxHari, isKebal } = res.data.data;
      if (isKebal) return;

      const dateSpk = new Date(String(tglSpk)).getTime();
      const dateDateline = new Date(String(userDateline)).getTime();
      const minDate = dateSpk + minHari * 86400000;
      const maxDate = dateSpk + maxHari * 86400000;

      if (dateDateline < minDate || dateDateline > maxDate) {
        const correctedDate = addDaysToDate(String(tglSpk), maxHari);
        if (props.formData.spk_dateline !== correctedDate) {
          isAutoSettingDateline.value = true;
          props.formData.spk_dateline = correctedDate;
          if (!isInitialLoad.value) {
            toast.info(
              `Dateline disesuaikan otomatis menjadi batas maksimal (${maxHari} hari) sesuai aturan SLA.`,
            );
          }
          await nextTick();
          isAutoSettingDateline.value = false;
        }
      }
    } catch (e) {
      console.error("Gagal menarik aturan Dateline", e);
    } finally {
      isInitialLoad.value = false;
    }
  },
  { deep: false, immediate: true },
);

watch(
  () => props.formData.spk_pending,
  (newStatus) => {
    if (newStatus === "NORMAL") {
      props.formData.spk_ppotong = "N";
      props.formData.spk_pcetak = "N";
      props.formData.spk_pbordir = "N";
      props.formData.spk_pjahit = "N";
      props.formData.spk_pfinishing = "N";
      props.formData.spk_ketpending = "";
    } else if (newStatus === "PENDING PENUH") {
      props.formData.spk_ppotong = "Y";
      props.formData.spk_pcetak = "Y";
      props.formData.spk_pbordir = "Y";
      props.formData.spk_pjahit = "Y";
      props.formData.spk_pfinishing = "Y";
    }
  },
);

watch(
  () => props.formData.spk_ketpo,
  (newKet) => {
    if (!newKet) {
      props.formData.ketpo_acc = "";
      return;
    }
    const selectedOption = props.lookupOptions.ketPo.find(
      (opt) => opt.ket === newKet,
    );
    if (selectedOption && selectedOption.acc === "Y") {
      props.formData.ketpo_acc = "MINTA ACC";
      props.formData.spk_aktif = "N";
    } else {
      props.formData.ketpo_acc = "";
    }
  },
);

// --- MIGRASI: cbbstatuskerjaChange (Validasi Kepentingan) ---
watch(
  () => props.formData.spk_statuskerja,
  async (newStatus, oldStatus) => {
    const isDiv3 = String(props.formData.spk_divisi).startsWith("3");
    const custKode = isDiv3
      ? props.formData.spk_cus_kaosan
      : props.formData.spk_cus_kode;

    if (!custKode && newStatus !== "STANDART") {
      toast.warning(
        "Customer silahkan di isi dulu sebelum mengubah tingkat kepentingan.",
      );
      props.formData.spk_statuskerja = "STANDART";
      return;
    }

    if (
      newStatus === "TOP URGENT" &&
      !isDiv3 &&
      props.formData.spk_jo_kode !== "KS"
    ) {
      try {
        const res = await api.get(
          "/penjualan/sales-order/form/check-top-urgent",
          { params: { cusKode: custKode, divisi: props.formData.spk_divisi } },
        );

        if (res.data.berhak) {
          props.formData.kepentingan_acc = "";
          // Restore aktif jika sebelumnya PASIF karena kepentingan
          if (
            props.formData.spk_aktif === "N" &&
            props.formData.pin_customer === "N" &&
            !props.formData.ketpo_acc &&
            !props.formData.spk_pinjo
          ) {
            props.formData.spk_aktif = "Y";
          }
        } else {
          props.formData.kepentingan_acc = "MINTA ACC";
          props.formData.spk_aktif = "N";
          toast.warning(
            "Status Customer belum mencapai syarat TOP URGENT. Membutuhkan ACC.",
          );
        }
      } catch (error) {
        console.error("Gagal mengecek hak prioritas", error);
      }
    } else {
      // Bukan TOP URGENT — hapus acc jika bukan sudah di-ACC
      if (props.formData.kepentingan_acc !== "ACC") {
        props.formData.kepentingan_acc = "";
        // Restore aktif jika sebelumnya PASIF hanya karena kepentingan
        if (
          props.formData.spk_aktif === "N" &&
          props.formData.pin_customer === "N" &&
          !props.formData.ketpo_acc &&
          !props.formData.spk_pinjo
        ) {
          props.formData.spk_aktif = "Y";
        }
      }
    }
  },
);

watch(
  () => props.formData.spk_nomor,
  () => {
    isImageError.value = false;
  },
);
watch(
  () => props.formData.spk_memo,
  () => {
    isImageError.value = false;
  },
);
</script>

<template>
  <div class="so-layout">
    <!-- ══ KOLOM KIRI ══ -->
    <div class="so-left">
      <div class="so-section">
        <!-- Divisi / MO / CMO / Status -->
        <div class="fr">
          <label class="lbl">Divisi</label>
          <select
            v-model="formData.spk_divisi"
            class="inp sel"
            style="width: 165px"
            :disabled="isEdit"
          >
            <option
              v-for="d in lookupOptions.divisi"
              :key="d.value"
              :value="d.value"
            >
              {{ d.title }}
            </option>
          </select>
          <label class="chk-lbl ml-2"
            ><input type="checkbox" checked disabled /> MO ({{
              formData.user_create || "ADMIN"
            }})</label
          >
          <label class="chk-lbl ml-2"
            ><input
              type="checkbox"
              :checked="!!formData.spk_cmo"
              @click="toggleCmo"
            />
            CMO
            {{ formData.spk_cmo ? "(" + formData.spk_cmo + ")" : "" }}</label
          >
          <span
            class="ml-auto status-lbl"
            :class="formData.spk_aktif === 'N' ? 'pasif' : 'aktif'"
          >
            Status: {{ formData.spk_aktif === "N" ? "PASIF" : "AKTIF" }}
          </span>
        </div>

        <!-- Nomor SPK / Revisi -->
        <div class="fr">
          <label class="lbl">Nomor SPK</label>
          <input
            :value="formData.spk_nomor"
            readonly
            class="inp ro"
            style="width: 160px"
            :placeholder="!isEdit ? '<-- Kosong=Baru' : ''"
          />
          <span v-if="!isEdit" class="hint-new ml-1">← Baru</span>
          <label class="lbl ml-auto" style="width: 55px">Revisi</label>
          <input
            type="checkbox"
            v-model="formData.isRevisi"
            true-value="Y"
            false-value="N"
            class="mr-1"
          />
          <input
            v-model.number="formData.spk_rev"
            type="number"
            class="inp"
            style="width: 55px"
            :disabled="formData.isRevisi !== 'Y'"
            v-select-on-focus
          />
        </div>

        <!-- Tanggal / Created / Tipe SPK -->
        <div class="fr">
          <label class="lbl">Tanggal SPK</label>
          <input
            type="date"
            v-model="formData.spk_tanggal"
            class="idate"
            style="width: 140px"
            :disabled="isEdit"
          />
          <label class="lbl ml-2" style="width: 55px">Created</label>
          <input
            :value="formData.date_create"
            readonly
            class="inp ro"
            style="width: 135px"
          />
          <label class="lbl ml-auto" style="width: 62px">Tipe SPK</label>
          <select
            v-model="formData.spk_tipe"
            class="inp sel"
            style="width: 110px"
          >
            <option v-for="o in tipeSpkOptions" :key="o" :value="o">
              {{ o }}
            </option>
          </select>
        </div>

        <!-- Perusahaan / Repeat dari SPK -->
        <div class="fr">
          <label class="lbl">Perusahaan</label>
          <div
            class="igrp"
            style="width: 335px"
            :class="{ 'bg-grey-lighten-3': isEdit }"
          >
            <input
              v-model="formData.spk_perush_kode"
              class="inp"
              style="width: 60px; background: #ddeeff"
              :disabled="isEdit"
              @keydown="onPerushF1"
              @keydown.enter.prevent="onPerushKodeEnter"
              @blur="onPerushKodeEnter"
            />
            <input
              :value="formData.NamaPerusahaan"
              readonly
              class="inp ro"
              style="flex: 1"
            />
            <button
              type="button"
              class="blkp"
              title="Cari Perusahaan (F1)"
              :disabled="isEdit"
              @mousedown.prevent="
                isOpeningModal = true;
                $emit('open-lookup', 'perusahaan');
              "
              @click="isOpeningModal = false"
            >
              <IconSearch :size="12" color="#1565c0" />
            </button>
          </div>
          <label class="lbl ml-2" style="width: 110px">Repeat Dari SPK</label>
          <div class="igrp" style="width: 180px">
            <input
              v-model="formData.spk_repeat"
              class="inp"
              style="flex: 1"
              @keydown="onRepeatF1"
            />
            <button
              type="button"
              class="blkp"
              title="Cari SPK (F1)"
              @mousedown.prevent="$emit('open-lookup', 'repeat')"
            >
              <IconSearch :size="12" color="#1565c0" />
            </button>
          </div>
        </div>

        <!-- Customer / Cust PERFECT -->
        <div class="fr">
          <label class="lbl">Customer</label>
          <div class="igrp" style="width: 335px">
            <input
              v-model="formData.spk_cus_kode"
              class="inp"
              style="width: 60px; background: #ddeeff"
              @keydown="onCustF1"
              @keydown.enter.prevent="onCustKodeEnter"
              @blur="onCustKodeEnter"
            />
            <input
              :value="formData.Customer"
              readonly
              class="inp ro"
              style="flex: 1"
            />
            <button
              type="button"
              class="blkp"
              title="Cari Customer (F1)"
              @mousedown.prevent="
                isOpeningModal = true;
                $emit('open-lookup', 'customer');
              "
              @click="isOpeningModal = false"
            >
              <IconSearch :size="12" color="#1565c0" />
            </button>
          </div>
          <label class="lbl ml-auto perfect-lbl" style="width: 90px"
            >Cust PERFECT</label
          >
          <select
            v-model="formData.cus_perfect"
            class="inp sel"
            style="width: 55px"
            :disabled="isEdit"
          >
            <option value="Y">Y</option>
            <option value="N">N</option>
          </select>
        </div>

        <!-- Cust Kaosan (divisi 3 saja) -->
        <div class="fr">
          <template v-if="isDivisiTiga">
            <label class="lbl">Cust Kaosan</label>
            <div class="igrp" style="width: 335px">
              <input
                v-model="formData.spk_cus_kaosan"
                class="inp"
                style="width: 60px; background: #ddeeff"
                @keydown="onCustKaosanF1"
              />
              <input
                :value="formData.CustKaosanNama"
                readonly
                class="inp ro"
                style="flex: 1"
              />
              <button
                type="button"
                class="blkp"
                title="Cari Customer Kaosan (F1)"
                @mousedown.prevent="$emit('open-lookup', 'custKaosan')"
              >
                <IconSearch :size="12" color="#1565c0" />
              </button>
            </div>
          </template>

          <template v-else>
            <div style="width: 415px"></div>
          </template>

          <label class="lbl ml-auto text-grey" style="width: 80px"
            >Pin Customer</label
          >
          <input
            v-model="formData.pin_customer"
            readonly
            class="inp ro text-center font-weight-bold"
            style="width: 55px"
            :style="
              formData.pin_customer !== 'N'
                ? 'background: #ffeb3b !important; color: #c62828 !important;'
                : ''
            "
          />
        </div>

        <div class="divider" />

        <!-- Referensi + Stok DC berdampingan -->
        <div class="fr align-start">
          <div class="ref-col">
            <div class="fr">
              <label class="lbl">Jenis Order</label>
              <div
                class="igrp"
                style="width: 255px"
                :class="{ 'bg-grey-lighten-3': isEdit }"
              >
                <input
                  v-model="formData.spk_jo_kode"
                  class="inp"
                  style="width: 50px; background: #ddeeff"
                  :disabled="isEdit"
                  @keydown="onJoF1"
                  @keydown.enter.prevent="onJoKodeEnter"
                  @blur="onJoKodeEnter"
                />
                <input
                  :value="formData.JenisOrder"
                  readonly
                  class="inp ro"
                  style="flex: 1"
                />
                <button
                  type="button"
                  class="blkp"
                  title="Cari Jenis Order (F1)"
                  :disabled="isEdit"
                  @mousedown.prevent="
                    isOpeningModal = true;
                    $emit('open-lookup', 'jenisOrder');
                  "
                  @click="isOpeningModal = false"
                >
                  <IconSearch :size="12" color="#1565c0" />
                </button>
              </div>
              <div
                v-if="formData.spk_pinjo"
                class="ml-2 d-flex align-center"
                style="
                  color: #d32f2f;
                  font-weight: 700;
                  font-size: 11px;
                  cursor: pointer;
                "
                @click="handlePinJoClick"
                title="Klik untuk ACC (Khusus KDC)"
              >
                <IconExclamationCircle :size="14" class="mr-1" />
                {{ formData.spk_pinjo }}
              </div>
            </div>
            <div class="fr">
              <label class="lbl">Kepentingan</label>
              <select
                v-model="formData.spk_statuskerja"
                class="inp sel"
                style="width: 160px"
              >
                <option
                  v-for="o in lookupOptions.kepentingan"
                  :key="o"
                  :value="o"
                >
                  {{ o }}
                </option>
              </select>
              <div
                v-if="formData.kepentingan_acc"
                class="ml-2 d-flex align-center"
                style="color: #d32f2f; font-weight: 700; font-size: 11px"
              >
                <IconExclamationCircle :size="14" class="mr-1" />
                {{ formData.kepentingan_acc }}
              </div>
            </div>
            <div class="fr">
              <label class="lbl">No. Penawaran</label>
              <div class="igrp" style="width: 155px">
                <input
                  v-model="formData.spk_pen_nomor"
                  class="inp"
                  style="flex: 1; background: #ddeeff"
                  @keydown="onPenawaranF1"
                />
                <button
                  type="button"
                  class="blkp"
                  title="Cari Penawaran (F1)"
                  @mousedown.prevent="$emit('open-lookup', 'penawaran')"
                >
                  <IconSearch :size="12" color="#1565c0" />
                </button>
              </div>
              <input
                v-model="formData.spk_pen_id"
                class="inp ml-1"
                style="width: 50px"
                placeholder="ID"
              />
            </div>
            <div class="fr">
              <label class="lbl">No. SJ Memo</label>
              <div class="igrp" style="width: 210px">
                <input
                  v-model="formData.spk_nomormemo"
                  class="inp"
                  style="flex: 1"
                  @keydown="onSjMemoF1"
                />
                <button
                  type="button"
                  class="blkp"
                  title="Cari SJ Memo (F1)"
                  @mousedown.prevent="$emit('open-lookup', 'sjMemo')"
                >
                  <IconSearch :size="12" color="#1565c0" />
                </button>
              </div>
            </div>
            <div class="fr">
              <label class="lbl">No. MAP</label>
              <div class="igrp" style="width: 210px">
                <input
                  v-model="formData.spk_nomormemo"
                  class="inp"
                  style="flex: 1"
                  @keydown="onSjMemoF1"
                />
                <button
                  type="button"
                  class="blkp"
                  title="Cari SJ Memo (F1)"
                  @mousedown.prevent="$emit('open-lookup', 'sjMemo')"
                >
                  <IconSearch :size="12" color="#1565c0" />
                </button>
              </div>
            </div>
            <div class="fr">
              <label class="lbl">No. MPPB</label>
              <div class="igrp" style="width: 155px">
                <input
                  v-model="formData.spk_mppb"
                  class="inp"
                  style="flex: 1; background: #ddeeff"
                  @keydown="onMppbF1"
                  @change="$emit('field-blur', 'mppb', formData.spk_mppb)"
                />
                <button
                  type="button"
                  class="blkp"
                  title="Cari MPPB (F1)"
                  @mousedown.prevent="$emit('open-lookup', 'mppb')"
                >
                  <IconSearch :size="12" color="#1565c0" />
                </button>
              </div>
              <input
                :value="formData.jmlmppb"
                readonly
                class="inp ro ml-1 text-right"
                style="width: 55px"
              />
            </div>
          </div>

          <!-- Stok DC fieldset -->
          <div class="fieldset-box ml-2" style="width: 262px; flex-shrink: 0">
            <div class="fieldset-legend">Ambil stok dari Gudang DC</div>
            <div class="fr" style="justify-content: center; margin-top: 4px">
              <div class="igrp" style="width: 190px">
                <input
                  v-model="formData.spk_invdc"
                  class="inp"
                  style="flex: 1; background: #ddeeff"
                  :placeholder="
                    isDivisiTiga ? 'No. SO DTF / SO' : 'No. Invoice DC'
                  "
                  @keydown="onInvDcF1"
                  @change="$emit('field-blur', 'invdc', formData.spk_invdc)"
                />
                <button
                  type="button"
                  class="blkp"
                  title="Cari (F1)"
                  @mousedown.prevent="
                    $emit('open-lookup', isDivisiTiga ? 'soKaosan' : 'stokDc')
                  "
                >
                  <IconSearch :size="12" color="#1565c0" />
                </button>
              </div>
              <span
                v-if="!isDivisiTiga && formData.jmlinvdc > 0"
                class="ml-2 font-weight-bold text-primary"
                style="font-size: 11px"
              >
                {{ formData.jmlinvdc.toLocaleString("id-ID") }}
              </span>
            </div>
            <div class="fr mt-2">
              <label class="lbl" style="width: 85px">Nomor PO</label>
              <div class="igrp" style="flex: 1">
                <input
                  v-model="formData.spk_nomor_po"
                  class="inp"
                  style="flex: 1"
                  placeholder="Ketik PO atau F1 cari DP..."
                  @keydown="onNomorPoF1"
                />
                <button
                  type="button"
                  class="blkp"
                  title="Cari DP dari Penerimaan (F1)"
                  :disabled="!formData.spk_cus_kode"
                  @mousedown.prevent="$emit('open-lookup', 'setoranPembayaran')"
                >
                  <IconSearch :size="12" color="#1565c0" />
                </button>
              </div>
            </div>
            <div class="fr">
              <label class="lbl" style="width: 85px">Tanggal PO</label>
              <input
                type="date"
                v-model="formData.spk_tgl_po"
                class="idate"
                style="flex: 1"
              />
            </div>
            <div class="fr">
              <label class="lbl" style="width: 85px">Dateline PO</label>
              <input
                type="date"
                v-model="formData.spk_datelinepo"
                class="idate"
                style="flex: 1"
              />
            </div>
            <div class="fr mt-1">
              <label class="lbl" style="width: 85px">MKB</label>
              <input
                :value="formData.mkb"
                readonly
                class="inp ro"
                style="flex: 1"
              />
            </div>
          </div>
        </div>

        <!-- Sales -->
        <div class="fr mt-1">
          <label class="lbl">Sales</label>
          <div class="igrp" style="width: 310px">
            <input
              v-model="formData.spk_sal_kode"
              class="inp"
              style="width: 60px; background: #ddeeff"
              @keydown="onSalesF1"
              @keydown.enter.prevent="onSalesKodeEnter"
              @blur="onSalesKodeEnter"
            />
            <input
              :value="formData.Sales"
              readonly
              class="inp ro"
              style="flex: 1"
            />
            <button
              type="button"
              class="blkp"
              title="Cari Sales (F1)"
              @mousedown.prevent="
                isOpeningModal = true;
                $emit('open-lookup', 'sales');
              "
              @click="isOpeningModal = false"
            >
              <IconSearch :size="12" color="#1565c0" />
            </button>
          </div>
        </div>

        <!-- Nama / Nama Ext / Jumlah -->
        <div class="fr">
          <label class="lbl">Nama</label>
          <input v-model="formData.spk_nama" class="inp" style="flex: 1" />
        </div>
        <div class="fr">
          <label class="lbl">Nama Ext</label>
          <input v-model="formData.spk_nama2" class="inp" style="flex: 1" />
        </div>
        <div class="fr">
          <label class="lbl">Jumlah</label>
          <input
            v-model.number="formData.spk_jumlah"
            type="number"
            class="inp text-right"
            style="width: 110px"
            @blur="handleJumlahBlur"
            v-select-on-focus
          />
        </div>

        <!-- Ukuran -->
        <div class="fr">
          <template v-if="isDivisiSatuAtauLima">
            <label class="lbl">Ukuran</label>
            <v-combobox
              v-model="formData.spk_panjang"
              :items="lookupOptions.panjang"
              variant="outlined"
              density="compact"
              hide-details
              class="f-vselect"
              style="width: 80px"
            />
            <span class="mx-1 sep-txt">X</span>
            <v-combobox
              v-model="formData.spk_lebar"
              :items="lookupOptions.lebar"
              variant="outlined"
              density="compact"
              hide-details
              class="f-vselect"
              style="width: 80px"
            />
            <span class="ml-1 sep-txt">Mtr</span>

            <label class="lbl ml-2" style="width: 80px">Ket. Ukuran</label>
            <input v-model="formData.spk_ukuran" class="inp" style="flex: 1" />
          </template>

          <template v-else>
            <label class="lbl">Ket. Ukuran</label>
            <input v-model="formData.spk_ukuran" class="inp" style="flex: 1" />
          </template>
        </div>

        <!-- Gramasi -->
        <div class="fr">
          <label class="lbl">Gramasi</label>
          <v-combobox
            v-if="isDivisiSatuAtauLima"
            v-model="formData.spk_gramasi"
            :items="lookupOptions.gramasi"
            variant="outlined"
            density="compact"
            hide-details
            class="f-vselect"
            style="max-width: 300px"
          />
          <input
            v-else
            v-model="formData.spk_gramasi"
            class="inp"
            style="width: 260px"
          />
        </div>

        <!-- Kain -->
        <div class="fr">
          <label class="lbl">Kain</label>
          <v-combobox
            v-if="isDivisiSatuAtauLima"
            v-model="formData.spk_kain"
            :items="lookupOptions.kain"
            variant="outlined"
            density="compact"
            hide-details
            class="f-vselect"
            style="flex: 1; max-width: 420px"
          />
          <input
            v-else
            v-model="formData.spk_kain"
            class="inp"
            style="flex: 1; max-width: 420px"
          />
        </div>

        <!-- Finishing -->
        <div class="fr">
          <label class="lbl">Finishing</label>
          <v-combobox
            v-if="isDivisiSatuAtauLima"
            v-model="formData.spk_finishing"
            :items="lookupOptions.finishing"
            variant="outlined"
            density="compact"
            hide-details
            class="f-vselect"
            style="flex: 1; max-width: 420px"
          />
          <input
            v-else
            v-model="formData.spk_finishing"
            class="inp"
            style="flex: 1; max-width: 420px"
          />
        </div>

        <!-- Sablon / Bordir / Sublim + Harga -->
        <div class="fr mt-1 shaded-row">
          <label class="chk-lbl mr-3"
            ><input
              type="checkbox"
              v-model="formData.spk_sablon"
              true-value="Y"
              false-value="N"
            />
            Sablon</label
          >
          <label class="chk-lbl mr-3"
            ><input
              type="checkbox"
              v-model="formData.spk_bordir"
              true-value="Y"
              false-value="N"
            />
            Bordir</label
          >
          <label class="chk-lbl mr-3"
            ><input
              type="checkbox"
              v-model="formData.spk_sublim"
              true-value="Y"
              false-value="N"
            />
            Sublim</label
          >
          <div class="ml-auto d-flex align-center" style="gap: 4px">
            <label class="lbl text-right" style="width: 68px">Harga Jual</label>
            <input
              v-model.number="formData.spk_harga"
              type="number"
              class="inp text-right"
              style="width: 90px"
              v-select-on-focus
            />
            <label class="lbl text-right ml-1" style="width: 62px"
              >Harga Riil</label
            >
            <input
              v-model.number="formData.spk_hargariil"
              type="number"
              class="inp text-right"
              style="width: 90px"
              v-select-on-focus
            />
            <label class="lbl text-right ml-1" style="width: 48px"
              >Return</label
            >
            <input
              v-model.number="formData.spk_hargafee"
              type="number"
              class="inp text-right"
              style="width: 90px"
              v-select-on-focus
            />
          </div>
        </div>

        <!-- Warna — satu baris horizontal di kolom kiri -->
        <div class="fieldset-box mt-1">
          <div class="fieldset-legend">Warna</div>
          <div class="fr" style="gap: 5px">
            <label class="lbl" style="width: 48px">Badan</label>
            <input
              v-model="formData.spk_warna_badan"
              class="inp"
              style="width: 130px"
            />
            <label class="lbl" style="width: 52px">Lengan</label>
            <input
              v-model="formData.spk_warna_lengan"
              class="inp"
              style="width: 130px"
            />
            <label class="lbl" style="width: 40px">Lain2</label>
            <input
              v-model="formData.spk_warna_lain"
              class="inp"
              style="flex: 1"
            />
          </div>
        </div>
      </div>
    </div>

    <!-- ══ KOLOM KANAN ══ -->
    <div class="so-right">
      <!-- Gambar -->
      <div class="so-section">
        <div class="fr mb-1">
          <button type="button" class="btn-upload" @click="fileRef?.click()">
            <IconUpload :size="13" class="mr-1" /> Upload
          </button>
          <button
            type="button"
            class="btn-upload blue ml-1"
            @click="displayImageUrl && (showPreviewDialog = true)"
          >
            <IconMaximize :size="13" class="mr-1" /> Full Screen
          </button>
          <span class="ml-auto" style="font-size: 10px; color: #1565c0"
            >Ukuran Maximal 1 Mb</span
          >
        </div>
        <div class="img-box">
          <img
            v-if="displayImageUrl && !isImageError"
            :src="displayImageUrl"
            class="img-preview"
            style="cursor: pointer"
            @click="showPreviewDialog = true"
            @error="onImageError"
          />
          <div v-else class="img-empty">
            <IconPhoto :size="32" color="#bdbdbd" />
            <div style="font-size: 10px; color: #bdbdbd; margin-top: 4px">
              No Image available
            </div>
          </div>
        </div>
        <input
          ref="fileRef"
          type="file"
          accept="image/*"
          style="display: none"
          @change="onFileChange"
        />
      </div>

      <!-- Pending fieldset -->
      <div class="fieldset-box mt-2">
        <div class="fieldset-legend" style="color: #7b1fa2; font-weight: 700">
          Pending
        </div>
        <div class="fr">
          <label class="lbl" style="width: 52px">Status</label>
          <select
            v-model="formData.spk_pending"
            class="inp sel"
            style="flex: 1"
          >
            <option v-for="o in pendingOptions" :key="o" :value="o">
              {{ o }}
            </option>
          </select>
        </div>
        <div
          class="fr mt-1"
          style="flex-wrap: wrap; gap: 3px; padding-left: 2px"
        >
          <label class="chk-lbl text-grey mr-2"
            ><input
              type="checkbox"
              v-model="formData.spk_ppotong"
              true-value="Y"
              false-value="N"
              :disabled="formData.spk_pending === 'NORMAL'"
            />
            Potong</label
          >
          <label class="chk-lbl text-grey mr-2"
            ><input
              type="checkbox"
              v-model="formData.spk_pcetak"
              true-value="Y"
              false-value="N"
              :disabled="formData.spk_pending === 'NORMAL'"
            />
            Cetak</label
          >
          <label class="chk-lbl text-grey mr-2"
            ><input
              type="checkbox"
              v-model="formData.spk_pbordir"
              true-value="Y"
              false-value="N"
              :disabled="formData.spk_pending === 'NORMAL'"
            />
            Bordir</label
          >
          <label class="chk-lbl text-grey mr-2"
            ><input
              type="checkbox"
              v-model="formData.spk_pjahit"
              true-value="Y"
              false-value="N"
              :disabled="formData.spk_pending === 'NORMAL'"
            />
            Jahit</label
          >
          <label class="chk-lbl text-grey">
            <input
              type="checkbox"
              v-model="formData.spk_pfinishing"
              true-value="Y"
              false-value="N"
              :disabled="formData.spk_pending === 'NORMAL'"
            />
            Finishing</label
          >
        </div>
        <div class="fr mt-1">
          <label class="lbl" style="width: 30px">Ket</label>
          <input
            v-model="formData.spk_ketpending"
            class="inp"
            style="flex: 1"
            :disabled="formData.spk_pending === 'NORMAL'"
          />
          <span
            v-if="pendingAccDisplay"
            class="acc-badge ml-2"
            style="cursor: pointer"
            @click="handleAccPendingClick"
            title="Klik untuk ACC Pending (Khusus CMO)"
          >
            {{ pendingAccDisplay }}
          </span>
        </div>
      </div>

      <!-- Info Tambahan: Bag.Desain s.d Mitra Luar -->
      <div class="fieldset-box mt-2">
        <div class="fieldset-legend" style="color: #1565c0">Info Tambahan</div>

        <div class="fr">
          <label class="lbl" style="width: 72px">Bag. Desain</label>
          <input v-model="formData.spk_desain" class="inp" style="flex: 1" />
          <label class="chk-lbl ml-1 design-baru-lbl">
            <input
              type="checkbox"
              v-model="formData.spk_newdesign"
              true-value="Y"
              false-value="N"
            />
            Design Baru
          </label>
        </div>

        <div class="fr">
          <label class="lbl" style="width: 72px">Tgl Acc Proof</label>
          <input
            type="date"
            v-model="formData.spk_tglaccproof"
            class="idate"
            style="flex: 1"
          />
        </div>

        <div class="fr">
          <label class="lbl" style="width: 72px">Ket.PO</label>
          <select v-model="formData.spk_ketpo" class="inp sel" style="flex: 1">
            <option
              v-for="o in lookupOptions.ketPo"
              :key="o.ket"
              :value="o.ket"
            >
              {{ o.ket }}
            </option>
          </select>
          <span v-if="formData.ketpo_acc === 'MINTA ACC'" class="acc-badge ml-1"
            >MINTA ACC</span
          >
        </div>

        <div class="fr">
          <label class="lbl" style="width: 72px">Dateline SPK</label>
          <input
            type="date"
            v-model="formData.spk_dateline"
            class="idate"
            style="flex: 1"
          />
        </div>

        <div class="fr">
          <label class="lbl" style="width: 72px">SPK Lama</label>
          <div class="igrp" style="flex: 1">
            <input
              v-model="formData.spk_lama"
              class="inp"
              style="flex: 1; background: #ddeeff"
              @keydown="onSpkLamaF1"
              @change="$emit('field-blur', 'spklama', formData.spk_lama)"
            />
            <button
              type="button"
              class="blkp"
              title="Cari SPK Lama (F1)"
              @mousedown.prevent="$emit('open-lookup', 'spkLama')"
            >
              <IconSearch :size="12" color="#1565c0" />
            </button>
          </div>
        </div>

        <div class="fr">
          <label class="lbl" style="width: 72px">Workshop</label>
          <div class="igrp" style="flex: 1">
            <input
              v-model="formData.spk_cab"
              class="inp"
              style="width: 44px; background: #ddeeff"
              @keydown="onWorkshopF1"
              @keydown.enter.prevent="onWorkshopKodeEnter"
              @blur="onWorkshopKodeEnter"
            />
            <input
              :value="formData.spk_workshop"
              readonly
              class="inp ro"
              style="flex: 1"
            />
            <button
              type="button"
              class="blkp"
              title="Cari Workshop (F1)"
              @mousedown.prevent="
                isOpeningModal = true;
                $emit('open-lookup', 'workshop');
              "
              @click="isOpeningModal = false"
            >
              <IconSearch :size="12" color="#1565c0" />
            </button>
          </div>
        </div>

        <div class="fr mt-1 shaded-row" style="flex-wrap: wrap; gap: 3px">
          <span
            style="
              width: 72px;
              flex-shrink: 0;
              font-weight: 600;
              color: #333;
              font-size: 11px;
            "
            >Mitra Luar</span
          >
          <label class="chk-lbl mr-2"
            ><input
              type="checkbox"
              v-model="formData.spk_mpotong"
              true-value="Y"
              false-value="N"
            />
            Potong</label
          >
          <label class="chk-lbl mr-2"
            ><input
              type="checkbox"
              v-model="formData.spk_mcetak"
              true-value="Y"
              false-value="N"
            />
            Cetak</label
          >
          <label class="chk-lbl mr-2"
            ><input
              type="checkbox"
              v-model="formData.spk_mbordir"
              true-value="Y"
              false-value="N"
            />
            Bordir</label
          >
          <label class="chk-lbl mr-2"
            ><input
              type="checkbox"
              v-model="formData.spk_mjahit"
              true-value="Y"
              false-value="N"
            />
            Jahit</label
          >
          <label class="chk-lbl">
            <input
              type="checkbox"
              v-model="formData.spk_mfinishing"
              true-value="Y"
              false-value="N"
            />
            Finishing</label
          >
        </div>
      </div>

      <div
        v-if="formData.spk_iscetak === 'Y'"
        class="d-flex align-center mt-2 px-1"
        style="color: #d32f2f; font-weight: 600; font-size: 11px"
      >
        <IconExclamationCircle :size="15" class="mr-1" />
        Spk ini sudah dicetak oleh Produksi, Jangan lupa info jika ada revisi.
      </div>
    </div>
  </div>

  <!-- Preview Dialog -->
  <v-dialog v-model="showPreviewDialog" max-width="800px">
    <div class="preview-card">
      <div class="preview-header">
        <span>Preview Design SPK</span>
        <button class="preview-close" @click="showPreviewDialog = false">
          ✕
        </button>
      </div>
      <div class="preview-body">
        <v-img
          :src="displayImageUrl"
          max-height="75vh"
          contain
          class="bg-white rounded"
        >
          <template #placeholder>
            <div class="d-flex align-center justify-center fill-height">
              <v-progress-circular indeterminate color="primary" />
            </div>
          </template>
        </v-img>
      </div>
    </div>
  </v-dialog>
</template>

<style scoped>
.so-layout {
  display: flex;
  gap: 8px;
  align-items: flex-start;
  font-family: "Segoe UI", system-ui, sans-serif;
  font-size: 11px;
  height: 100%;
  overflow-y: auto;
  padding: 6px;
  box-sizing: border-box;
}
.so-left {
  flex: 1;
  min-width: 0;
  overflow: hidden;
}
.so-right {
  width: 335px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
}

.so-section {
  background: white;
  border: 1px solid #bdbdbd;
  padding: 7px 10px;
}

.fieldset-box {
  border: 1px solid #9e9e9e;
  padding: 7px 8px 6px;
  padding-top: 15px;
  position: relative;
  background: #fafafa;
}
.fieldset-legend {
  position: absolute;
  top: -8px;
  left: 10px;
  background: #fafafa;
  padding: 0 4px;
  font-weight: 700;
  font-size: 11px;
  color: #424242;
  white-space: nowrap;
}

.fr {
  display: flex;
  align-items: center;
  margin-bottom: 3px;
  min-height: 24px;
}
.align-start {
  align-items: flex-start !important;
}
.ref-col {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
}

.lbl {
  width: 80px;
  flex-shrink: 0;
  font-weight: 600;
  color: #333;
  white-space: nowrap;
  font-size: 11px;
}

.inp {
  height: 24px;
  border: 1px solid #a0a0a0;
  padding: 0 4px;
  font-size: 11px;
  outline: none;
  background: white;
  font-family: inherit;
  color: #212121;
  box-sizing: border-box;
}
.inp:focus {
  border-color: #1565c0;
}
.inp:disabled {
  background: #f0f0f0 !important;
  color: #9e9e9e;
}
.ro {
  background: #dde8f0 !important;
  color: #444 !important;
}
.sel {
  padding: 0 2px;
  cursor: pointer;
}

.idate {
  height: 24px;
  border: 1px solid #a0a0a0;
  padding: 0 3px;
  font-size: 11px;
  outline: none;
  background: white;
  box-sizing: border-box;
}
.idate:focus {
  border-color: #1565c0;
}

.igrp {
  display: flex;
  border: 1px solid #a0a0a0;
  overflow: hidden;
  height: 24px;
  background: white;
  flex-shrink: 0;
}
.igrp .inp {
  border: none;
  height: 22px;
  flex-shrink: 0;
}
.igrp .inp + .inp {
  border-left: 1px solid #ccc;
}
.blkp {
  width: 24px;
  min-width: 24px;
  flex-shrink: 0;
  background: #e3f2fd;
  border: none;
  border-left: 1px solid #a0a0a0;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  height: 100%;
}
.blkp:hover:not(:disabled) {
  background: #bbdefb;
}
.blkp:disabled {
  background: #f5f5f5;
  cursor: not-allowed;
  opacity: 0.45;
}

.divider {
  height: 1px;
  background: #e0e0e0;
  margin: 5px 0;
}
.shaded-row {
  background: #f5f5f5;
  padding: 3px 5px;
  border: 1px solid #eee;
  border-radius: 2px;
}
.chk-lbl {
  display: flex;
  align-items: center;
  gap: 3px;
  cursor: pointer;
  font-size: 11px;
}
.chk-lbl input {
  margin: 0;
  accent-color: #1565c0;
}

.status-lbl {
  font-weight: 700;
  font-size: 11px;
  padding: 1px 7px;
  border-radius: 3px;
}
.status-lbl.aktif {
  color: #2e7d32;
  background: #e8f5e9;
}
.status-lbl.pasif {
  color: #c62828;
  background: #ffebee;
}

.hint-new {
  font-size: 9px;
  color: #d32f2f;
  font-weight: 700;
}
.perfect-lbl {
  background: #fff176;
  padding: 1px 4px;
  font-weight: 700;
  font-size: 11px;
  border: 1px solid #fbc02d;
}
.design-baru-lbl {
  background: #fff176;
  padding: 1px 5px;
  font-weight: 700;
  border: 1px solid #fbc02d;
}
.sep-txt {
  color: #555;
  font-size: 11px;
}
.text-grey {
  color: #757575;
}

.img-box {
  border: 1px solid #ccc;
  background: #f0f0f0;
  height: 185px;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  margin-top: 2px;
}
.img-preview {
  width: 100%;
  height: 100%;
  object-fit: contain;
}
.img-empty {
  text-align: center;
}

.btn-upload {
  background: #78909c;
  color: white;
  border: none;
  padding: 3px 10px;
  font-weight: 600;
  font-size: 11px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
}
.btn-upload.blue {
  background: #1565c0;
}
.btn-upload:hover {
  opacity: 0.88;
}

.acc-badge {
  display: inline-flex;
  align-items: center;
  height: 18px;
  background: #ffeb3b;
  color: #c62828;
  font-weight: 700;
  font-size: 9px;
  padding: 0 6px;
  border: 1px solid #fbc02d;
  border-radius: 2px;
  white-space: nowrap;
  flex-shrink: 0;
  align-self: center;
  letter-spacing: 0.03em;
}

.preview-card {
  background: white;
  border-radius: 8px;
  overflow: hidden;
}
.preview-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #1565c0;
  color: white;
  padding: 9px 14px;
  font-size: 13px;
  font-weight: 700;
}
.preview-close {
  background: transparent;
  border: none;
  color: rgba(255, 255, 255, 0.8);
  font-size: 16px;
  cursor: pointer;
  line-height: 1;
}
.preview-close:hover {
  color: white;
}
.preview-body {
  padding: 16px;
  background: #f5f5f5;
}

/* Vuetify combobox compact */
.f-vselect :deep(.v-field) {
  min-height: 24px !important;
  height: 24px !important;
  font-size: 11px;
  background: white;
  border-radius: 0;
}
.f-vselect :deep(.v-field__input) {
  min-height: 24px !important;
  padding-top: 0 !important;
  padding-bottom: 0 !important;
  font-size: 11px;
}
.f-vselect :deep(.v-input__control) {
  min-height: 24px !important;
}
.f-vselect :deep(.v-list-item) {
  min-height: 28px !important;
  padding: 0 10px !important;
}
.f-vselect :deep(.v-list-item-title) {
  font-size: 11px !important;
}

/* Spacing utils */
.ml-1 {
  margin-left: 4px;
}
.ml-2 {
  margin-left: 8px;
}
.mr-1 {
  margin-right: 4px;
}
.mr-2 {
  margin-right: 8px;
}
.mr-3 {
  margin-right: 12px;
}
.mt-1 {
  margin-top: 4px;
}
.mt-2 {
  margin-top: 8px;
}
.mx-1 {
  margin-left: 3px;
  margin-right: 3px;
}
.mb-1 {
  margin-bottom: 4px;
}
.ml-auto {
  margin-left: auto;
}
.d-flex {
  display: flex;
}
.align-center {
  align-items: center;
}
.text-right {
  text-align: right;
}
.text-center {
  text-align: center;
}
</style>
