<script setup lang="ts">
import { ref, computed, watch } from "vue";
import { useRoute } from "vue-router";
import { useToast } from "vue-toastification";
import BaseForm from "@/components/BaseForm.vue";
import { useForm } from "@/composables/useForm";
import { poBahanFormService } from "@/services/pembelian/poBahanFormService";
import {
  IconShoppingCartPlus,
  IconPlus,
  IconTrash,
  IconSearch,
} from "@tabler/icons-vue";

import SupplierSearchModal from "@/components/lookups/SupplierSearchModal.vue";
import MppbSearchModal from "@/components/lookups/MppbSearchModal.vue";
import PoGreigeSearchModal from "@/components/lookups/PoGreigeSearchModal.vue";
import BahanSearchModal from "@/components/lookups/BahanSearchModal.vue";
import SpkSearchModal from "@/components/lookups/SpkSearchModal.vue";
import MkbSearchModal from "@/components/lookups/MkbSearchModal.vue";

const route = useRoute();
const toast = useToast();

const isEditMode = computed(() => !!route.params.nomor);
const todayLocal = new Date().toISOString().substring(0, 10);

// ── Modal state ──
const showSupModal = ref(false);
const showMppbModal = ref(false);
const showPoGreigeModal = ref(false);
const showBahanModal = ref(false);
const showSpkModal = ref(false);
const showMkbModal = ref(false);
const activeGridIndex = ref(-1);
// delivery bahan modal needs separate index
const activeDeliveryIdx = ref(-1);

// ── Default data ──
const defaultData = {
  header: {
    po_nomor: "",
    po_greige: "",
    po_tanggal: todayLocal,
    po_jenis: 3,
    po_keterangan: "",
    po_sup_kode: "",
    sup_nama: "",
    sup_alamat: "",
    sup_kota: "",
    po_mppb_nomor: "",
    tgl_mppb: "",
    jmlmppb: 0,
    po_status_ppn: 0,
    po_ppn: 0,
    po_note: "",
    no_bpb: "",
  },
  items: [] as any[],
  delivery: [] as any[],
  rolls: [] as any[],
  statusNgedit: "AMAN",
  urutPin: 0,
  isTutupBuku: false,
};

const {
  isLoading,
  isSaving,
  showSaveDialog,
  showCancelDialog,
  showCloseDialog,
  formData,
  executeSave,
  executeCancel,
  executeClose,
} = useForm({
  menuId: "52",
  initialData: defaultData,
  fetchApi: async () => {
    const res = await poBahanFormService.getDetail(String(route.params.nomor));
    const d = res.data.data;
    return {
      header: {
        ...d.header,
        po_tanggal: d.header.po_tanggal
          ? d.header.po_tanggal.substring(0, 10)
          : todayLocal,
        po_jenis: Number(d.header.po_jenis) || 3,
        sup_nama: d.header.sup_nama || "",
        sup_alamat: d.header.sup_alamat || "",
        sup_kota: d.header.sup_kota || "",
        tgl_mppb: d.header.tgl_mppb || "",
        jmlmppb: d.header.jmlmppb || 0,
        no_bpb: d.noBPB || "",
      },
      items: (d.items || []).map((row: any) => ({
        kode: row.pod_bhn_kode || "",
        nama: row.bhn_name || "",
        namaext: row.pod_namaext || row.bhn_name || "",
        satuan: row.pod_bhn_satuan || "",
        gramasia: row.pod_gramasia || "",
        gramasi: row.gramasi || "",
        setting: row.setting || "",
        jenis: row.jenis || "",
        roll: Number(row.pod_roll) || 0,
        jumlah: Number(row.pod_Jumlah) || 0,
        harga: Number(row.pod_hargabeli) || 0,
        diskon: Number(row.pod_disc) || 0,
        total:
          (Number(row.pod_Jumlah) || 0) *
          (Number(row.pod_hargabeli) || 0) *
          (1 - (Number(row.pod_disc) || 0) / 100),
        spk: row.pod_spk_nomor || "",
        mkb: row.pod_mkb_nomor || "",
      })),
      delivery: (d.delivery || []).map((row: any) => ({
        tanggal: row.pod2_tanggal
          ? row.pod2_tanggal.substring(0, 10)
          : todayLocal,
        jumlah: Number(row.pod2_jumlah) || 0,
        kode: row.pod2_bhn_kode || "",
        nama: row.bhn_name || "",
      })),
      rolls: (d.rolls || []).map((row: any) => ({
        no: Number(row.pod3_no) || 0,
        kode: row.pod3_bhn_kode || "",
        nama: row.bhn_name || "",
        satuan: row.bhn_satuan || "",
        jumlah: Number(row.pod3_jumlah) || 0,
      })),
      statusNgedit: d.statusNgedit || "AMAN",
      urutPin: d.urutPin || 0,
      isTutupBuku: d.isTutupBuku || false,
    };
  },
  submitApi: async (data: any) => {
    return await poBahanFormService.saveData({
      isEdit: isEditMode.value,
      header: data.header,
      items: data.items,
      delivery: data.delivery,
      rolls: data.rolls,
      statusNgedit: data.statusNgedit,
      urutPin: data.urutPin,
    });
  },
});

const isGreige = computed(() => formData.value.header.po_jenis === 1);
const isCelup = computed(() => formData.value.header.po_jenis === 2);
const isBahan = computed(() => formData.value.header.po_jenis === 3);

watch(
  () => formData.value.header.po_jenis,
  (v) => {
    if (v !== 2) formData.value.header.po_greige = "";
  },
);

// Auto set PPN 11% saat dicentang
watch(
  () => formData.value.header.po_status_ppn,
  (v) => {
    if (
      v === 1 &&
      (!formData.value.header.po_ppn || formData.value.header.po_ppn === 0)
    ) {
      formData.value.header.po_ppn = 11;
    }
  },
);

// ── Totals ──
const subTotal = computed(() =>
  formData.value.items.reduce(
    (s: number, r: any) =>
      s +
      (Number(r.jumlah) || 0) *
        (Number(r.harga) || 0) *
        (1 - (Number(r.diskon) || 0) / 100),
    0,
  ),
);
const ppnValue = computed(() =>
  formData.value.header.po_status_ppn === 1
    ? subTotal.value * (Number(formData.value.header.po_ppn) / 100)
    : 0,
);
const grandTotal = computed(() => subTotal.value + ppnValue.value);
const fmt = (n: number) => n.toLocaleString("id-ID");

// ── Header lookups ──
const setSup = (v: any) => {
  formData.value.header.po_sup_kode = v.Kode || v.sup_kode;
  formData.value.header.sup_nama = v.Nama || v.sup_nama;
  formData.value.header.sup_alamat = v.Alamat || v.sup_alamat || "";
  formData.value.header.sup_kota = v.Kota || v.sup_kota || "";
};
const setMppb = async (v: any) => {
  formData.value.header.po_mppb_nomor = v.Nomor || v.mpb_nomor;
  try {
    const res = await poBahanFormService.validateField(
      "mppb",
      formData.value.header.po_mppb_nomor,
    );

    // PERBAIKAN DI SINI: Tambahkan satu tingkat .data lagi
    // Karena struktur backend-mu: data { data { jumlah } }
    formData.value.header.tgl_mppb = res.data.data.data.tanggal;
    formData.value.header.jmlmppb = res.data.data.data.jumlah;
  } catch (e: any) {
    toast.error(e.response?.data?.message || "Gagal memvalidasi MPPB.");
    formData.value.header.po_mppb_nomor = "";
    formData.value.header.tgl_mppb = "";
    formData.value.header.jmlmppb = 0;
  }
};
const setPoGreige = async (v: any) => {
  const nomor = v.Nomor || v.po_nomor;
  formData.value.header.po_greige = nomor;
  try {
    const res = await poBahanFormService.validateField("greige", nomor);
    formData.value.items = res.data.items.map((it: any) => ({
      ...it,
      jumlah: it.sisa_jumlah,
      roll: 0,
      total: it.sisa_jumlah * it.harga * (1 - it.diskon / 100),
    }));
    toast.success("Berhasil memuat sisa detail PO Greige.");
  } catch (e: any) {
    toast.error(e.response?.data?.message || "Gagal menarik data PO Greige.");
    formData.value.header.po_greige = "";
  }
};

// ── Items grid ──
const addItem = () =>
  formData.value.items.push({
    kode: "",
    nama: "",
    namaext: "",
    satuan: "",
    gramasia: "",
    gramasi: "",
    setting: "",
    jenis: "",
    roll: 0,
    jumlah: 0,
    harga: 0,
    diskon: 0,
    total: 0,
    spk: "",
    mkb: "",
  });
const removeItem = (i: number) => {
  const kode = formData.value.items[i].kode;
  formData.value.items.splice(i, 1);
  if (isCelup.value && kode)
    formData.value.rolls = formData.value.rolls.filter(
      (r: any) => r.kode !== kode,
    );
};
const openLookupBahan = (i: number) => {
  activeGridIndex.value = i;
  showBahanModal.value = true;
};
const setBahan = (v: any) => {
  const i = activeGridIndex.value;
  if (i < 0) return;
  formData.value.items[i].kode = v.Kode || v.bhn_kode;
  formData.value.items[i].nama = v.Nama || v.bhn_name;
  formData.value.items[i].namaext = isGreige.value
    ? `GREIGE ${v.Nama || v.bhn_name}`
    : v.Nama || v.bhn_name;
  formData.value.items[i].satuan = v.Satuan || v.bhn_satuan || "";
  formData.value.items[i].harga = Number(v.Harga || v.bhn_hargabeli) || 0;
  recalcRow(i);
};
const openLookupSpk = (i: number) => {
  activeGridIndex.value = i;
  showSpkModal.value = true;
};
const setSpk = (v: any) => {
  if (activeGridIndex.value >= 0)
    formData.value.items[activeGridIndex.value].spk = v.Nomor || v.spk_nomor;
};
const openLookupMkb = (i: number) => {
  activeGridIndex.value = i;
  showMkbModal.value = true;
};
const setMkb = async (v: any) => {
  const mkbNomor = v.Nomor || v.mkb_nomor;
  const idx = activeGridIndex.value;
  if (idx < 0 || !mkbNomor) return;

  try {
    // Panggil API Backend
    const res = await poBahanFormService.getDetailMkb(mkbNomor);
    const { warnings, items } = res.data.data;

    // Handle dialog warning persis seperti Delphi
    for (const msg of warnings) {
      if (!window.confirm(msg)) {
        // Jika user membatalkan, kosongkan input MKB di grid
        formData.value.items[idx].mkb = "";
        return;
      }
    }

    if (items.length === 0) {
      toast.info("Tidak ada item bahan di MKB tersebut.");
      formData.value.items[idx].mkb = mkbNomor;
      return;
    }

    // Replace baris saat ini dengan item pertama, lalu tambahkan sisa barisnya
    items.forEach((item: any, i: number) => {
      const targetIdx = i === 0 ? idx : formData.value.items.length;

      if (i > 0) {
        addItem(); // Bikin baris kosong baru di grid
      }

      const row = formData.value.items[targetIdx];
      row.kode = item.kode;
      row.nama = item.nama;
      row.namaext = item.namaext;
      row.satuan = item.satuan;
      row.gramasia = "";
      row.gramasi = item.gramasi;
      row.setting = item.setting;
      row.jenis = item.jenis;
      row.jumlah = Number(item.jumlah) || 0;
      row.harga = Number(item.harga) || 0;
      row.diskon = 0;
      row.spk = item.spk || "";
      row.mkb = mkbNomor;

      // Kalkulasi otomatis
      recalcRow(targetIdx);
    });

    toast.success("Berhasil menarik detail bahan dari MKB.");
  } catch (e: any) {
    toast.error(e.response?.data?.message || "Gagal memuat detail MKB.");
    formData.value.items[idx].mkb = "";
  }
};
const recalcRow = (i: number) => {
  const r = formData.value.items[i];
  r.total =
    (Number(r.jumlah) || 0) *
    (Number(r.harga) || 0) *
    (1 - (Number(r.diskon) || 0) / 100);
  if (isCelup.value && r.kode) {
    formData.value.rolls = formData.value.rolls.filter(
      (x: any) => x.kode !== r.kode,
    );
    const q = Number(r.roll) || 0;
    if (q > 0)
      for (let j = 1; j <= q; j++)
        formData.value.rolls.push({
          no: j,
          kode: r.kode,
          nama: r.nama,
          satuan: r.satuan,
          jumlah: 0,
        });
  }
};

// ── Delivery ──
const addDelivery = () =>
  formData.value.delivery.push({
    tanggal: todayLocal,
    jumlah: 0,
    kode: "",
    nama: "",
  });
const removeDelivery = (i: number) => formData.value.delivery.splice(i, 1);
const openDeliveryBahan = (i: number) => {
  activeDeliveryIdx.value = i;
  activeGridIndex.value = -1;
  showBahanModal.value = true;
};
// setBahan handles both grids: check activeDeliveryIdx
const setBahanHandler = (v: any) => {
  if (activeDeliveryIdx.value >= 0) {
    const i = activeDeliveryIdx.value;
    formData.value.delivery[i].kode = v.Kode || v.bhn_kode;
    formData.value.delivery[i].nama = v.Nama || v.bhn_name;
    activeDeliveryIdx.value = -1;
  } else {
    setBahan(v);
  }
};

// ── Validate ──
const validateSave = () => {
  // 1. Validasi Tutup Buku
  if (formData.value.isTutupBuku)
    return toast.warning(
      "Transaksi sudah tutup buku. Minta ACC Pin terlebih dahulu.",
    );

  // 2. Validasi Status PO (Sesuai Delphi: CLOSE / ONPROSES dilarang edit)
  if (isEditMode.value) {
    if (formData.value.header.po_close === 1)
      return toast.warning("Sudah CLOSE. Tidak bisa disimpan.");
    if (formData.value.header.po_close === 2)
      return toast.warning("Sudah ONPROSES. Tidak bisa disimpan.");
  }

  // 3. Validasi Header
  if (!formData.value.header.po_sup_kode)
    return toast.warning("Supplier belum diisi.");
  if (isCelup.value && !formData.value.header.po_greige)
    return toast.warning("PO Greige harus diisi untuk PO Celup.");

  // 4. Validasi Detail Item Pembelian
  if (formData.value.items.length === 0)
    return toast.warning("Tidak ada detail, tidak dapat disimpan.");

  for (const [idx, r] of formData.value.items.entries()) {
    if (!r.kode) continue;
    if ((Number(r.jumlah) || 0) <= 0)
      return toast.warning(
        `Baris ${idx + 1}: Jumlah PO harus diisi, tidak dapat disimpan.`,
      );
    if ((Number(r.harga) || 0) <= 0)
      return toast.warning(
        `Baris ${idx + 1}: Harga Beli harus diisi, tidak dapat disimpan.`,
      );
    if (isCelup.value && (Number(r.roll) || 0) <= 0)
      return toast.warning(`Baris ${idx + 1}: PO Celup Roll harus diisi.`);
  }

  // 5. Validasi Delivery Commitment (Khusus PO Bahan)
  if (isBahan.value) {
    if (formData.value.delivery.length === 0)
      return toast.warning("Untuk PO Bahan Delivery commitment harus di isi.");

    // Cek apakah ada yang diinput 0
    for (const [idx, d] of formData.value.delivery.entries()) {
      if (!d.tanggal)
        return toast.warning(`Delivery baris ${idx + 1}: Tanggal harus diisi.`);
      if ((Number(d.jumlah) || 0) <= 0)
        return toast.warning(
          `Delivery baris ${idx + 1}: Jumlah Commitment harus di isi.`,
        );
    }
  }

  showSaveDialog.value = true;
};
</script>

<template>
  <BaseForm
    :title="isEditMode ? 'Ubah PO Bahan' : 'Buat PO Bahan'"
    menu-id="52"
    :icon="IconShoppingCartPlus"
    :is-loading="isLoading"
    :is-saving="isSaving"
    v-model:show-save-dialog="showSaveDialog"
    v-model:show-cancel-dialog="showCancelDialog"
    v-model:show-close-dialog="showCloseDialog"
    @validate-save="validateSave"
    @confirm-save="executeSave"
    @confirm-cancel="executeCancel"
    @confirm-close="executeClose"
  >
    <template #left-column>
      <div class="po-left-container desktop-form-section header-section">
        <div class="fr shaded-row mb-2">
          <span class="lbl fw">Jenis PO</span>
          <label class="ck mr-2"
            ><input
              type="radio"
              :value="1"
              v-model="formData.header.po_jenis"
              :disabled="isEditMode"
            />
            Greige</label
          >
          <label class="ck mr-2"
            ><input
              type="radio"
              :value="2"
              v-model="formData.header.po_jenis"
              :disabled="isEditMode"
            />
            Celup</label
          >
          <label class="ck"
            ><input
              type="radio"
              :value="3"
              v-model="formData.header.po_jenis"
              :disabled="isEditMode"
            />
            Bahan</label
          >
        </div>

        <div class="fr">
          <label class="lbl">Nomor</label
          ><input
            :value="formData.header.po_nomor"
            readonly
            class="inp ro flex-grow-0"
            style="width: 160px"
            placeholder="← Kosong=Baru"
          />
        </div>
        <div class="fr">
          <label class="lbl">Tanggal</label
          ><input
            type="date"
            v-model="formData.header.po_tanggal"
            class="idate"
            style="width: 160px"
            :disabled="isEditMode"
          />
        </div>
        <div class="fr">
          <label class="lbl">Keterangan</label
          ><input
            v-model="formData.header.po_keterangan"
            class="inp flex-grow-1"
          />
        </div>

        <div class="sep mt-1 mb-1" />

        <div class="fr">
          <label class="lbl">No. MPPB</label>
          <div class="igrp" style="width: 160px">
            <input
              v-model="formData.header.po_mppb_nomor"
              class="inp"
              style="background: #ddeeff"
              @change="setMppb({ Nomor: formData.header.po_mppb_nomor })"
            />
            <button type="button" class="blkp" @click="showMppbModal = true">
              <IconSearch :size="13" />
            </button>
          </div>
        </div>
        <div class="fr">
          <label class="lbl">Jml MPPB</label>
          <input
            :value="formData.header.jmlmppb"
            readonly
            class="inp ro text-right"
            style="width: 80px"
          />
        </div>
        <div class="fr">
          <label class="lbl">Tgl MPPB</label>
          <input
            :value="formData.header.tgl_mppb"
            readonly
            class="inp ro"
            style="width: 120px"
          />
        </div>

        <div class="sep mt-1 mb-1" />

        <div class="fr">
          <label class="lbl">Supplier</label>
          <div class="igrp" style="width: 110px">
            <input
              v-model="formData.header.po_sup_kode"
              class="inp"
              style="background: #ddeeff"
              readonly
            />
            <button type="button" class="blkp" @click="showSupModal = true">
              <IconSearch :size="13" />
            </button>
          </div>
        </div>
        <div class="fr">
          <label class="lbl"></label
          ><input
            :value="formData.header.sup_nama"
            readonly
            class="inp ro flex-grow-1"
          />
        </div>
        <div class="fr">
          <label class="lbl"></label
          ><input
            :value="formData.header.sup_alamat"
            readonly
            class="inp ro flex-grow-1"
          />
        </div>
        <div class="fr">
          <label class="lbl"></label
          ><input
            :value="formData.header.sup_kota"
            readonly
            class="inp ro flex-grow-1"
          />
        </div>

        <div class="sep mt-1 mb-1" />

        <div class="fr">
          <label class="ck fw" style="width: 90px">
            <input
              type="checkbox"
              :true-value="1"
              :false-value="0"
              v-model="formData.header.po_status_ppn"
            />
            PPN %
          </label>
          <input
            v-model.number="formData.header.po_ppn"
            type="number"
            class="inp text-right"
            style="width: 60px"
            :disabled="formData.header.po_status_ppn === 0"
          />
        </div>

        <template v-if="isCelup">
          <div class="fr mt-3 hide-details">
            <label class="lbl fw text-primary">PO Greige</label>
            <div class="igrp" style="width: 160px">
              <input
                v-model="formData.header.po_greige"
                class="inp"
                :class="{ ro: isEditMode }"
                :readonly="isEditMode"
                @change="
                  !isEditMode &&
                  setPoGreige({ Nomor: formData.header.po_greige })
                "
              />
              <button
                type="button"
                class="blkp"
                @click="showPoGreigeModal = true"
                :disabled="isEditMode"
              >
                <IconSearch :size="13" />
              </button>
            </div>
          </div>

          <div class="fr mt-1 hide-details">
            <label class="lbl fw text-primary">No. BPB</label>
            <input
              :value="formData.header.no_bpb"
              readonly
              class="inp ro"
              style="width: 160px"
              placeholder="← Auto Generate"
            />
          </div>
        </template>
      </div>
    </template>

    <template #right-column>
      <div class="po-right desktop-form-section">
        <div class="tbl-header">
          <span class="tbl-title">Detail Item Pembelian</span>
          <button type="button" class="btn-add" @click="addItem">
            + Tambah Baris
          </button>
        </div>
        <div
          class="tbl-wrap"
          style="flex: 1; min-height: 180px; max-height: 40vh; overflow-y: auto"
        >
          <table class="gt" style="min-width: 1300px">
            <thead>
              <tr>
                <th style="width: 35px" class="tc">No</th>
                <th style="width: 90px">Kode</th>
                <th style="width: 160px">Nama Bahan</th>
                <th style="width: 120px">Nama External</th>
                <th style="width: 50px" class="tc">Sat</th>
                <th style="width: 75px">Gramasi Awal</th>
                <th style="width: 75px">Gramasi Akhir</th>
                <th style="width: 50px">Setting</th>
                <th style="width: 80px">Jenis Bahan</th>
                <th style="width: 50px" class="tr" v-if="isCelup">Roll</th>
                <th style="width: 75px" class="tr bg-yellow">Jumlah</th>
                <th style="width: 80px" class="tr bg-yellow">Harga Beli</th>
                <th style="width: 50px" class="tr bg-yellow">Disc(%)</th>
                <th style="width: 100px" class="tr bg-blue">Total</th>
                <th style="width: 90px">SPK</th>
                <th style="width: 90px">MKB</th>
                <th style="width: 35px" class="tc">Aksi</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(row, idx) in formData.items" :key="idx">
                <td class="tc gt-lbl">{{ idx + 1 }}</td>
                <td class="p0">
                  <div class="cell-grp">
                    <input v-model="row.kode" class="ci" readonly />
                    <button
                      type="button"
                      class="ci-btn"
                      @click="openLookupBahan(idx)"
                    >
                      <IconSearch :size="12" />
                    </button>
                  </div>
                </td>
                <td class="p0">
                  <input v-model="row.nama" class="ci ro" readonly />
                </td>
                <td class="p0"><input v-model="row.namaext" class="ci" /></td>
                <td class="p0">
                  <input v-model="row.satuan" class="ci tc ro" readonly />
                </td>
                <td class="p0"><input v-model="row.gramasia" class="ci" /></td>
                <td class="p0">
                  <input v-model="row.gramasi" class="ci ro" readonly />
                </td>
                <td class="p0">
                  <input v-model="row.setting" class="ci ro" readonly />
                </td>
                <td class="p0">
                  <input v-model="row.jenis" class="ci ro" readonly />
                </td>
                <td class="p0" v-if="isCelup">
                  <input
                    v-model.number="row.roll"
                    type="number"
                    class="ci tr"
                    @blur="recalcRow(idx)"
                  />
                </td>
                <td class="p0">
                  <input
                    v-model.number="row.jumlah"
                    type="number"
                    class="ci tr fw bg-yellow-light"
                    @blur="recalcRow(idx)"
                  />
                </td>
                <td class="p0">
                  <input
                    v-model.number="row.harga"
                    type="number"
                    class="ci tr bg-yellow-light"
                    @blur="recalcRow(idx)"
                  />
                </td>
                <td class="p0">
                  <input
                    v-model.number="row.diskon"
                    type="number"
                    class="ci tr bg-yellow-light"
                    @blur="recalcRow(idx)"
                  />
                </td>
                <td class="p0">
                  <input
                    :value="fmt(Number(row.total))"
                    readonly
                    class="ci tr fw ro"
                  />
                </td>
                <td class="p0">
                  <div class="cell-grp">
                    <input v-model="row.spk" class="ci" />
                    <button
                      type="button"
                      class="ci-btn"
                      @click="openLookupSpk(idx)"
                    >
                      <IconSearch :size="12" />
                    </button>
                  </div>
                </td>
                <td class="p0">
                  <div class="cell-grp">
                    <input v-model="row.mkb" class="ci" />
                    <button
                      type="button"
                      class="ci-btn"
                      @click="openLookupMkb(idx)"
                    >
                      <IconSearch :size="12" />
                    </button>
                  </div>
                </td>
                <td class="tc">
                  <button
                    type="button"
                    class="btn-del"
                    @click="removeItem(idx)"
                    title="Hapus"
                  >
                    ✕
                  </button>
                </td>
              </tr>
              <tr v-if="formData.items.length === 0">
                <td :colspan="isCelup ? 17 : 16" class="empty-row">
                  Tidak ada data. Klik "Tambah Baris" untuk memasukkan bahan.
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="bottom-row mt-2">
          <div
            v-if="isBahan"
            class="bottom-panel"
            style="flex: 1.5; min-width: 350px"
          >
            <div class="tbl-header teal">
              <span class="tbl-title">Delivery Commitment</span>
              <button type="button" class="btn-add" @click="addDelivery">
                + Tambah
              </button>
            </div>
            <div class="tbl-wrap" style="height: 145px">
              <table class="gt">
                <thead>
                  <tr>
                    <th style="width: 40px" class="tc">No</th>
                    <th style="width: 110px">Tanggal</th>
                    <th style="width: 80px" class="tr bg-yellow">Jumlah</th>
                    <th>Nama Bahan</th>
                    <th style="width: 110px">Kode</th>
                    <th style="width: 40px" class="tc"></th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(d, idx) in formData.delivery" :key="idx">
                    <td class="tc gt-lbl">{{ idx + 1 }}</td>
                    <td class="p0">
                      <input type="date" v-model="d.tanggal" class="ci w-100" />
                    </td>
                    <td class="p0">
                      <input
                        v-model.number="d.jumlah"
                        type="number"
                        class="ci tr fw w-100"
                      />
                    </td>
                    <td class="p0">
                      <div class="cell-grp w-100">
                        <input v-model="d.nama" class="ci ro" readonly />
                        <button
                          type="button"
                          class="ci-btn"
                          @click="openDeliveryBahan(idx)"
                        >
                          <IconSearch :size="12" />
                        </button>
                      </div>
                    </td>
                    <td class="p0">
                      <input v-model="d.kode" class="ci ro w-100" readonly />
                    </td>
                    <td class="tc">
                      <button
                        type="button"
                        class="btn-del"
                        @click="removeDelivery(idx)"
                        title="Hapus"
                      >
                        ✕
                      </button>
                    </td>
                  </tr>
                  <tr v-if="formData.delivery.length === 0">
                    <td colspan="5" class="empty-row">
                      Belum ada delivery commitment.
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div
            v-if="isCelup"
            class="bottom-panel"
            style="flex: 1.5; min-width: 250px"
          >
            <div class="tbl-header purple">
              <span class="tbl-title">Rincian Roll Celup (Auto)</span>
            </div>
            <div class="tbl-wrap" style="height: 145px">
              <table class="gt">
                <thead>
                  <tr>
                    <th style="width: 40px" class="tc">No</th>
                    <th>Nama Bahan</th>
                    <th style="width: 60px" class="tc">Sat</th>
                    <th style="width: 80px" class="tr bg-yellow">Jumlah</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(r, idx) in formData.rolls" :key="idx">
                    <td class="tc gt-lbl">{{ r.no }}</td>
                    <td class="p0">
                      <input :value="r.nama" class="ci ro w-100" readonly />
                    </td>
                    <td class="p0">
                      <input
                        :value="r.satuan"
                        class="ci tc ro w-100"
                        readonly
                      />
                    </td>
                    <td class="p0">
                      <input
                        v-model.number="r.jumlah"
                        type="number"
                        class="ci tr fw w-100"
                      />
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div
            class="bottom-panel ml-auto"
            style="flex: 1; min-width: 280px; max-width: 350px"
          >
            <div class="note-wrap mb-1 h-100">
              <label class="lbl fw mb-1 text-grey-darken-2">Note</label>
              <textarea
                v-model="formData.header.po_note"
                class="ta"
                rows="2"
                style="flex: 1"
              ></textarea>
            </div>
            <div class="totals-box mt-1">
              <div class="total-row">
                <span>Sub Total</span>
                <input
                  :value="fmt(subTotal)"
                  readonly
                  class="inp ro text-right fw"
                />
              </div>
              <div class="total-row">
                <span>PPN</span>
                <input
                  :value="fmt(ppnValue)"
                  readonly
                  class="inp ro text-right fw"
                />
              </div>
              <div class="total-row grand">
                <span class="text-red-darken-4">Grand Total</span>
                <input
                  :value="fmt(grandTotal)"
                  readonly
                  class="inp ro text-right fw text-red"
                  style="
                    font-size: 13px !important;
                    border-color: #f44336;
                    background: white !important;
                  "
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>
  </BaseForm>

  <SupplierSearchModal v-model="showSupModal" @selected="setSup" />
  <MppbSearchModal v-model="showMppbModal" @selected="setMppb" />
  <PoGreigeSearchModal v-model="showPoGreigeModal" @selected="setPoGreige" />
  <BahanSearchModal v-model="showBahanModal" @selected="setBahanHandler" />
  <SpkSearchModal v-model="showSpkModal" @selected="setSpk" />
  <MkbSearchModal v-model="showMkbModal" @selected="setMkb" />
</template>

<style scoped>
/* ── Layout Utama ── */
.po-left {
  display: flex;
  flex-direction: column;
  padding: 16px;
  background: white;
  border-radius: 8px;
  border: 1px solid #e0e0e0;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  font-family: "Segoe UI", system-ui, sans-serif;
  font-size: 11px;
}
.po-right {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 16px;
  background: white;
  border-radius: 8px;
  border: 1px solid #e0e0e0;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  font-family: "Segoe UI", system-ui, sans-serif;
  font-size: 11px;
  box-sizing: border-box;
  min-height: 0;
  overflow: hidden;
}

.po-left-container {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 12px !important;
  width: 100%;
  box-sizing: border-box;
}

/* ── Form rows (Kiri) ── */
.fr {
  display: flex;
  align-items: center;
  min-height: 24px;
  gap: 4px;
  width: 100%;
}
.lbl {
  width: 80px; /* Perkecil sedikit agar input lebih luas */
  flex-shrink: 0;
  font-weight: 600;
  color: #444;
  font-size: 11px;
}
.fw {
  font-weight: 700;
}
.sep {
  height: 1px;
  background: #e0e0e0;
  width: 100%;
}
.shaded-row {
  background: #f5f5f5;
  padding: 4px 8px;
  border: 1px solid #eee;
  border-radius: 4px;
}
.mt-1 {
  margin-top: 4px;
}
.mt-2 {
  margin-top: 8px;
}
.mt-3 {
  margin-top: 12px;
}
.mb-1 {
  margin-bottom: 4px;
}
.mb-2 {
  margin-bottom: 8px;
}
.ml-1 {
  margin-left: 4px;
}
.ml-2 {
  margin-left: 8px;
}
.ml-3 {
  margin-left: 12px;
}
.ml-auto {
  margin-left: auto;
}
.pa-1 {
  padding: 4px;
}
.pa-2 {
  padding: 8px;
}
.text-red {
  color: #c62828;
}
.text-xs {
  font-size: 10px;
}
.text-primary {
  color: #1565c0;
}
.bg-blue-lighten-5 {
  background: #e3f2fd;
}
.border {
  border: 1px solid #90caf9;
}
.rounded {
  border-radius: 4px;
}

.ck {
  display: flex;
  align-items: center;
  gap: 4px;
  cursor: pointer;
  font-size: 11px;
}
.ck input {
  margin: 0;
  accent-color: #1565c0;
}

/* ── Inputs ── */
.inp {
  height: 24px;
  border: 1px solid #a0a0a0;
  padding: 0 6px;
  font-size: 11px;
  background: white;
  outline: none;
  border-radius: 2px;
  min-width: 0; /* Penting agar flex-grow tidak offside */
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
.text-right {
  text-align: right;
}
.tc {
  text-align: center;
}
.tr {
  text-align: right;
}

.idate {
  height: 24px;
  border: 1px solid #a0a0a0;
  padding: 0 4px;
  font-size: 11px;
  background: white;
  outline: none;
  box-sizing: border-box;
  border-radius: 2px;
}
.idate:focus {
  border-color: #1565c0;
}

.igrp {
  display: flex;
  border: 1px solid #a0a0a0;
  height: 24px;
  background: white;
  border-radius: 2px;
  overflow: hidden;
}
.igrp .inp {
  border: none;
  flex: 1;
  min-width: 0;
}
.blkp {
  width: 24px;
  flex-shrink: 0;
  background: #e0e0e0;
  border: none;
  border-left: 1px solid #a0a0a0;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}
.blkp:hover {
  background: #d0d0d0;
  color: #000;
}
.flex-grow-1 {
  flex: 1;
}
.ro {
  background: #dde8f0 !important;
  color: #444 !important;
}
.ta {
  width: 100%;
  border: 1px solid #a0a0a0;
  padding: 4px;
  font-size: 11px;
  font-family: inherit;
  outline: none;
  box-sizing: border-box;
  border-radius: 2px;
}
.ta:focus {
  border-color: #1565c0;
}

/* ── Table (Kanan) ── */
.tbl-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #1565c0;
  color: white;
  padding: 6px 12px;
  border-radius: 4px 4px 0 0;
  flex-shrink: 0;
}
.tbl-header.teal {
  background: #00695c;
}
.tbl-header.purple {
  background: #4527a0;
}
.tbl-title {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.02em;
}
.btn-add {
  background: rgba(255, 255, 255, 0.2);
  color: white;
  border: 1px solid rgba(255, 255, 255, 0.4);
  padding: 3px 10px;
  font-size: 10px;
  font-weight: 600;
  cursor: pointer;
  border-radius: 3px;
}
.btn-add:hover {
  background: rgba(255, 255, 255, 0.3);
}

.tbl-wrap {
  overflow: auto;
  border: 1px solid #bdbdbd;
  border-top: none;
  background: white;
  border-radius: 0 0 4px 4px;
  min-width: 0;
  width: 100%;
}

.gt {
  width: 100%;
  border-collapse: collapse;
  table-layout: fixed;
}
.gt thead th {
  background: #eeeeee;
  border: 1px solid #bdbdbd;
  padding: 5px;
  font-size: 11px;
  font-weight: 700;
  color: #424242;
  white-space: nowrap;
  position: sticky;
  top: 0;
  z-index: 1;
  text-align: left;
}
.gt thead th.tc {
  text-align: center;
}
.gt thead th.tr {
  text-align: right;
}
.gt thead th.bg-yellow {
  background: #fff9c4;
}
.gt thead th.bg-blue {
  background: #e3f2fd;
}
.gt tbody td {
  border: 1px solid #e0e0e0;
  height: 26px;
}
.gt tbody tr:nth-of-type(even) td {
  background: #fafafa;
}
.gt tbody tr:hover td {
  background: #e3f2fd !important;
}

.p0 {
  padding: 0 !important;
}
.gt-lbl {
  background: #f5f5f5 !important;
  color: #555;
  padding: 0 4px;
  font-size: 10px;
}

.ci {
  width: 100%;
  height: 26px;
  border: none;
  background: transparent;
  outline: none;
  font-size: 11px;
  padding: 0 6px;
  font-family: inherit;
  color: #212121;
  box-sizing: border-box;
}
.ci.ro {
  background: #dde8f0 !important;
}
.ci.bg-yellow-light {
  background: #fffde7 !important;
}
.ci:focus {
  background: #e3f2fd !important;
  outline: 1px solid #1976d2;
  outline-offset: -1px;
}
.ci.tc {
  text-align: center;
}
.ci.tr {
  text-align: right;
}
.ci.fw {
  font-weight: 700;
}
.w-100 {
  width: 100%;
}

.cell-grp {
  display: flex;
  align-items: center;
  height: 26px;
}
.cell-grp .ci {
  flex: 1;
}
.ci-btn {
  width: 24px;
  flex-shrink: 0;
  background: #eeeeee;
  border: none;
  border-left: 1px solid #e0e0e0;
  cursor: pointer;
  height: 26px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
}
.ci-btn:hover {
  background: #e0e0e0;
}

.btn-del {
  background: transparent;
  color: #d32f2f;
  border: none;
  cursor: pointer;
  padding: 4px;
  font-size: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 3px;
  margin: 0 auto;
}
.btn-del:hover {
  background: #ffebee;
}

.empty-row {
  text-align: center;
  color: #9e9e9e;
  font-style: italic;
  padding: 16px;
  font-size: 11px;
}

/* ── Bottom row ── */
.bottom-row {
  display: flex;
  gap: 12px;
  align-items: stretch;
  flex-shrink: 0;
}
.bottom-panel {
  display: flex;
  flex-direction: column;
}

/* ── Note + Totals ── */
.note-wrap {
  display: flex;
  flex-direction: column;
  flex: 1;
}
.note-wrap .lbl {
  width: auto;
  margin-bottom: 4px;
}

.totals-box {
  border: 1px solid #bdbdbd;
  border-radius: 4px;
  overflow: hidden;
  background: #fffde7;
}
.total-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 4px 8px;
  gap: 8px;
  border-bottom: 1px solid #e0e0e0;
  font-size: 11px;
  font-weight: 600;
  color: #424242;
}
.total-row:last-child {
  border-bottom: none;
}
.total-row.grand {
  background: #fff3e0;
}
.total-row .inp {
  width: 130px;
  flex-shrink: 0;
  padding: 2px 6px;
}
</style>
