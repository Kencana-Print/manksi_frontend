<script setup lang="ts">
import { ref, computed, watch } from "vue";
import { useRoute } from "vue-router";
import { useRouter } from "vue-router";
import { useToast } from "vue-toastification";
import BaseForm from "@/components/BaseForm.vue";
import { useForm } from "@/composables/useForm";
import api from "@/services/api";
import { bpbBahanFormService } from "@/services/garmen/bpbBahanFormService";
import {
  IconTruckDelivery,
  IconSearch,
  IconTrash,
  IconPrinter,
} from "@tabler/icons-vue";

import SupplierSearchModal from "@/components/lookups/SupplierSearchModal.vue";
import GudangBahanSearchModal from "@/components/lookups/GudangBahanSearchModal.vue";
import PoBahanSearchModal from "@/components/lookups/PoBahanSearchModal.vue";
import BahanSearchModal from "@/components/lookups/BahanSearchModal.vue";
import SpkSearchModal from "@/components/lookups/SpkSearchModal.vue";

import BpbBahanBarcodeDialog from "./BpbBahanBarcodeDialog.vue";

const router = useRouter();
const route = useRoute();
const toast = useToast();

const isEditMode = computed(() => !!route.params.nomor);
const isPo = ref(route.query.type !== "NON");
const todayLocal = new Date().toISOString().substring(0, 10);

// ── Modal state ──
const showSupModal = ref(false);
const showGdgModal = ref(false);
const showBahanModal = ref(false);
const showPoModal = ref(false);
const activeGridIndex = ref(-1);
const showSpkModal = ref(false);

const showBarcodeDialog = ref(false);
const printMode = ref({
  singleBarcode: "",
  barcodeHdr: "",
});

const showPrintConfirm = ref(false);
const nomorTerakhir = ref("");

// ── Default data ──
const defaultData = {
  header: {
    bpb_nomor: "",
    bpb_tanggal: todayLocal,
    bpb_keterangan: "",
    bpb_po_nomor: "",
    bpb_sup_kode: "",
    sup_nama: "",
    sup_alamat: "",
    sup_kota: "",
    bpb_gdg_kode: "GB001",
    gdg_nama: "GUDANG BAHAN BAKU JERON",
    bpb_jatuhtempo: todayLocal,
    no_buat_barcode: "",
  },
  items: [] as any[],
  poItems: [] as any[],
  barcodes: [] as any[],
  statusNgedit: "AMAN",
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
  menuId: "101",
  initialData: defaultData,
  fetchApi: async () => {
    const res = await bpbBahanFormService.getDetail(String(route.params.nomor));
    const d = res.data.data;
    const noPo = d.header.bpb_po_Nomor || d.header.bpb_po_nomor || "";
    const tglBpb = d.header.bpb_Tanggal || d.header.bpb_tanggal || "";
    const tglTempo = d.header.bpb_Jatuhtempo || d.header.bpb_jatuhtempo || "";
    const ketBpb = d.header.bpb_Keterangan || d.header.bpb_keterangan || "";
    const noBpb = d.header.bpb_Nomor || d.header.bpb_nomor || "";
    isPo.value = !!noPo.trim();
    return {
      header: {
        ...d.header,
        bpb_nomor: noBpb,
        bpb_po_nomor: noPo,
        bpb_keterangan: ketBpb,
        bpb_tanggal: tglBpb ? tglBpb.substring(0, 10) : todayLocal,
        bpb_jatuhtempo: tglTempo ? tglTempo.substring(0, 10) : todayLocal,
        sup_nama: d.header.nmsup || "",
        sup_alamat: d.header.alamat || "",
        sup_kota: d.header.kota || "",
      },
      items: d.items || [],
      poItems: d.poItems || [],
      barcodes: d.barcodes || [],
      statusNgedit: d.statusNgedit || "AMAN",
      isTutupBuku: d.isTutupBuku || false,
    };
  },
  submitApi: async (data: any) => {
    return await bpbBahanFormService.saveData({
      isEdit: isEditMode.value,
      header: data.header,
      items: data.items,
      poItems: data.poItems,
      barcodes: data.barcodes,
      statusNgedit: data.statusNgedit,
    });
  },
  onSuccess: (res: any) => {
    // Tangkap nomor dari backend (sesuai struktur saveData service kita)
    const result = res.data?.data;
    if (result?.nomor) {
      nomorTerakhir.value = result.nomor;
      showPrintConfirm.value = true;
    }
  },
});

// ── PO load ──
const setPo = async (v: any) => {
  formData.value.header.bpb_po_nomor = v.Nomor;
  await loadPoData();
};
const loadPoData = async () => {
  const noPo = formData.value.header.bpb_po_nomor;
  if (!noPo) return;
  try {
    const res = await bpbBahanFormService.validateField("po", noPo);
    const { header, poDetails, items } = res.data.data;
    formData.value.header.bpb_sup_kode = header.sup_kode;
    formData.value.header.sup_nama = header.sup_nama;
    formData.value.header.sup_alamat = header.sup_alamat;
    formData.value.header.sup_kota = header.sup_kota;
    const dt = new Date(formData.value.header.bpb_tanggal);
    dt.setDate(dt.getDate() + (Number(header.jatuhtempo_days) || 0));
    formData.value.header.bpb_jatuhtempo = dt.toISOString().substring(0, 10);
    formData.value.poItems = poDetails.map((d: any) => ({ ...d, terima: 0 }));
    formData.value.items = items.map((d: any) => ({
      kode: d.kode,
      nama: d.nama,
      satuan: d.satuan,
      satuanpo: d.satuanpo,
      jumlahyard: 0,
      jumlah: 0,
      roll: 0,
      harga: d.harga,
      totalpo: d.totalpo,
      terima: d.terima,
      kurang: d.kurang,
      gramasi: "",
      warna: "",
      setting: "",
      spk: "",
      namaspk: "",
      mkb: "",
    }));
    toast.success("Berhasil menarik detail PO.");
  } catch (e: any) {
    toast.error(e.response?.data?.message || "Gagal menarik data PO.");
    formData.value.header.bpb_po_nomor = "";
  }
};

// ── Grid logic ──
const onJumlahYardChange = (idx: number) => {
  const row = formData.value.items[idx];
  if (row.satuanpo?.toUpperCase() === "YARD")
    row.jumlah = Number((Number(row.jumlahyard || 0) * 0.9144).toFixed(2));
  onJumlahChange(idx);
};
const onJumlahChange = (idx: number) => {
  const row = formData.value.items[idx];
  if (isPo.value) {
    const pi = formData.value.poItems.findIndex(
      (p: any) => p.kode === row.kode && p.spk === row.spk,
    );
    if (pi !== -1) formData.value.poItems[pi].terima = row.jumlah;
  }
};
const onRollChange = async (idx: number) => {
  const row = formData.value.items[idx];
  const targetRoll = Number(row.roll) || 0;
  const kode = row.kode;
  if (!kode) return;
  const dtTanggal = new Date(formData.value.header.bpb_tanggal || todayLocal);
  const yy = String(dtTanggal.getFullYear()).slice(-2);
  let newBarcodes = formData.value.barcodes.filter(
    (b: any) => b.kode !== kode || Number(b.jumlah) > 0,
  );
  const existingForKode = newBarcodes.filter((b: any) => b.kode === kode);
  const existingCount = existingForKode.length;
  if (targetRoll > existingCount) {
    let maxBcdFromDB = 0;
    try {
      const res = await bpbBahanFormService.getMaxBarcode(kode, yy);
      maxBcdFromDB = Number(res.data.data) || 0;
    } catch (e) {
      console.error("Gagal menarik max barcode", e);
    }
    let maxBcdLocal = 0;
    existingForKode.forEach((b: any) => {
      const seq = Number(b.barcode.slice(-5));
      if (!isNaN(seq) && seq > maxBcdLocal) maxBcdLocal = seq;
    });
    let cur = Math.max(maxBcdFromDB, maxBcdLocal);
    for (let i = existingCount; i < targetRoll; i++) {
      cur++;
      newBarcodes.push({
        no: 0,
        kode,
        nama: row.nama,
        barcode: `${kode}${yy}${String(cur).padStart(5, "0")}`,
        jumlah: 0,
      });
    }
  }
  let finalBarcodes = newBarcodes.sort((a: any, b: any) =>
    a.kode.localeCompare(b.kode),
  );
  let kodeCounters: Record<string, number> = {};
  finalBarcodes.forEach((b: any) => {
    if (!kodeCounters[b.kode]) kodeCounters[b.kode] = 1;
    b.no = kodeCounters[b.kode]++;
  });
  formData.value.barcodes = finalBarcodes;
};
const addItem = () => {
  if (isPo.value)
    return toast.warning("Mode BPB PO tidak dapat tambah baris manual.");
  formData.value.items.push({
    kode: "",
    nama: "",
    satuan: "",
    jumlah: 0,
    roll: 0,
    harga: 0,
    totalpo: 0,
    terima: 0,
    kurang: 0,
    gramasi: "",
    warna: "",
    setting: "",
  });
};
const removeItem = (idx: number) => {
  if (isPo.value)
    return toast.warning("Mode BPB PO tidak dapat hapus baris manual.");
  const row = formData.value.items[idx];
  formData.value.items.splice(idx, 1);
  formData.value.barcodes = formData.value.barcodes.filter(
    (b: any) => b.kode !== row.kode || Number(b.jumlah) > 0,
  );
};
// --- LOOKUP HANDLERS UNTUK GRID ---
// Membuka modal SPK
const openLookupSpk = (i: number) => {
  activeGridIndex.value = i;
  showSpkModal.value = true;
};

// --- Validasi Ketik Manual SPK (Migrasi clspkPropertiesEditValueChanged) ---
const onSpkChange = async (idx: number) => {
  const row = formData.value.items[idx];
  if (!row.spk || row.spk.trim() === "") {
    row.namaspk = "";
    return;
  }
  try {
    const res = await api.get("/lookups/spk", {
      params: { q: row.spk, limit: 5 },
    });
    const items = res.data.data.items;

    const exactMatch = items.find(
      (x: any) => x.Nomor.toUpperCase() === row.spk.toUpperCase(),
    );

    if (exactMatch) {
      row.spk = exactMatch.Nomor;
      row.namaspk = exactMatch.Nama;
    } else {
      toast.error("Spk tsb tidak ada bosku!");
      row.spk = "";
      row.namaspk = "";
    }
  } catch (e) {
    console.error("Error SPK:", e); // <-- Tambahkan log ini
    toast.error("Gagal memvalidasi SPK.");
  }
};

// Hasil dari Modal SPK
const setSpk = (v: any) => {
  const i = activeGridIndex.value;
  if (i < 0) return;

  formData.value.items[i].spk = v.Nomor || v.SPK;
  formData.value.items[i].namaspk = v.Nama || v.NamaSPK || "";
};
const openLookupBahan = (i: number) => {
  if (isPo.value) return;
  activeGridIndex.value = i;
  showBahanModal.value = true;
};
const setBahan = (v: any) => {
  const i = activeGridIndex.value;
  if (i < 0) return;
  formData.value.items[i].kode = v.Kode || v.bhn_kode || v.mkbd_bhn_kode;
  formData.value.items[i].nama = v.Nama || v.Bhn_Name || v.bhn_name;
  formData.value.items[i].satuan = v.Satuan || v.Bhn_satuan || v.bhn_satuan;
  formData.value.items[i].harga = Number(v.Harga || v.bhn_hargabeli) || 0;
};
const setSup = (v: any) => {
  formData.value.header.bpb_sup_kode = v.Kode || v.sup_kode;
  formData.value.header.sup_nama = v.Nama || v.sup_nama;
  formData.value.header.sup_alamat = v.Alamat || v.sup_alamat || "";
  formData.value.header.sup_kota = v.Kota || v.sup_kota || "";
};
const setGudang = (v: any) => {
  formData.value.header.bpb_gdg_kode = v.Kode || v.gdg_kode;
  formData.value.header.gdg_nama = v.Nama || v.gdg_nama;
};

// ── Validate ──
const validateSave = () => {
  // 1. Cek Invoice (Voucher)
  if (formData.value.statusNgedit === "VOUCHER") {
    return toast.warning(
      "BPB ini sudah dibuat Voucher Pembayaran, tidak bisa di edit.",
    );
  }

  // 2. Cek Status Pengajuan PIN (Menyalin pesan Delphi)
  if (
    ["WAIT", "TOLAK", "MINTA"].includes(formData.value.statusNgedit) &&
    formData.value.isTutupBuku
  ) {
    return toast.warning(
      "Transaksi tsb sudah diclose.\nSilahkan minta approve/tunggu ACC untuk bisa menyimpan perubahan data.",
    );
  }

  // 3. Cek Tutup Buku Standar
  if (formData.value.isTutupBuku && formData.value.statusNgedit !== "ACC") {
    return toast.warning(
      "Anda tidak boleh input di tanggal periode yg sudah diclose.",
    );
  }

  // 4. Validasi Header Dasar
  if (!formData.value.header.bpb_gdg_kode) {
    return toast.warning("Gudang tidak boleh kosong.");
  }

  if (isPo.value && !formData.value.header.bpb_po_nomor) {
    return toast.warning("Nomor PO belum diisi.");
  }

  // 5. Validasi Baris Detail (Grid 1)
  let validJumlah = false;
  for (const [i, r] of formData.value.items.entries()) {
    if (!r.kode) continue;

    if (Number(r.jumlah) > 0) validJumlah = true;

    // Cek kewajiban isi roll
    if (Number(r.jumlah) !== 0 && Number(r.roll) === 0) {
      return toast.warning(
        `Baris ${i + 1}: Bahan ${r.nama} - Roll harus diisi!`,
      );
    }
  }

  // Mencegah simpan jika detail benar-benar 0 semua
  if (!validJumlah && formData.value.items.length > 0) {
    return toast.warning(
      "Minimal harus ada satu item bahan dengan jumlah > 0.",
    );
  }

  // 6. Validasi Sinkronisasi PO vs Terima
  if (isPo.value) {
    const t1 = formData.value.items.reduce(
      (s: number, r: any) => s + (Number(r.jumlah) || 0),
      0,
    );
    const t2 = formData.value.poItems.reduce(
      (s: number, r: any) => s + (Number(r.terima) || 0),
      0,
    );

    // MENGATASI ISU DESIMAL JS: Gunakan toleransi selisih 0.001 (bukan !== langsung)
    if (Math.abs(t1 - t2) > 0.001) {
      return toast.warning(
        `Jumlah Terima Bahan (${t1.toFixed(2)}) harus sama persis dengan Total Realisasi PO (${t2.toFixed(2)}).`,
      );
    }
  }

  // Jika semua lolos, tampilkan modal konfirmasi
  showSaveDialog.value = true;
};

const doPrintDocument = () => {
  showPrintConfirm.value = false;
  const url = router.resolve({
    name: "BpbBahanPrint",
    params: { nomor: nomorTerakhir.value },
  }).href;
  window.open(url, "_blank");
  goBack(); // Kembali ke browse setelah buka tab cetak
};

// ── Print barcode ──
const printBarcodeSingle = (row: any) => {
  if (!row.barcode) return;
  printMode.value.singleBarcode = row.barcode;
  printMode.value.barcodeHdr = "";
  showBarcodeDialog.value = true;
};
const printBarcodeAll = () => {
  if (!formData.value.header.no_buat_barcode && !isEditMode.value)
    return toast.warning(
      "Simpan data terlebih dahulu untuk generate nomor barcode.",
    );
  printMode.value.singleBarcode = "";
  printMode.value.barcodeHdr = formData.value.header.no_buat_barcode;
  showBarcodeDialog.value = true;
};
</script>

<template>
  <BaseForm
    :title="isEditMode ? 'Ubah BPB Bahan' : 'Tambah BPB Bahan'"
    menu-id="101"
    :icon="IconTruckDelivery"
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
    <!-- ══ KOLOM KIRI ══ -->
    <template #left-column>
      <div class="bpb-left">
        <!-- Tipe BPB badge -->
        <div class="fr shaded-row mb-2">
          <span class="lbl fw">Tipe BPB</span>
          <span class="type-badge" :class="isPo ? 'po' : 'nonpo'">
            {{ isPo ? "BPB DARI PO" : "BPB NON-PO" }}
          </span>
        </div>

        <div class="fr">
          <label class="lbl">Nomor</label>
          <input
            :value="formData.header.bpb_nomor"
            readonly
            class="inp ro"
            style="flex: 1"
            placeholder="Otomatis"
          />
        </div>
        <div class="fr">
          <label class="lbl">Tanggal</label>
          <input
            type="date"
            v-model="formData.header.bpb_tanggal"
            class="idate"
            style="width: 150px"
            :disabled="isEditMode"
          />
        </div>

        <div class="sep" />

        <!-- Nomor PO -->
        <div v-if="isPo" class="fr">
          <label class="lbl fw text-primary">Nomor PO</label>
          <div class="igrp" style="flex: 1">
            <input
              v-model="formData.header.bpb_po_nomor"
              class="inp"
              style="flex: 1; background: #ddeeff"
              :readonly="isEditMode"
              placeholder="Ketik / cari..."
              @change="!isEditMode && loadPoData()"
            />
            <button
              type="button"
              class="blkp"
              @click="!isEditMode && (showPoModal = true)"
              :disabled="isEditMode"
            >
              <IconSearch :size="13" />
            </button>
          </div>
        </div>

        <!-- Gudang -->
        <div class="fr">
          <label class="lbl">Gudang</label>
          <div class="igrp" style="width: 70px">
            <input
              v-model="formData.header.bpb_gdg_kode"
              class="inp"
              style="flex: 1; background: #ddeeff"
              readonly
            />
            <button type="button" class="blkp" @click="showGdgModal = true">
              <IconSearch :size="13" />
            </button>
          </div>
          <input
            :value="formData.header.gdg_nama"
            readonly
            class="inp ro ml-1"
            style="flex: 1"
          />
        </div>

        <div class="sep" />

        <!-- Supplier -->
        <div class="fr">
          <label class="lbl">Supplier</label>
          <div class="igrp" style="width: 75px">
            <input
              v-model="formData.header.bpb_sup_kode"
              class="inp"
              style="flex: 1; background: #ddeeff"
              readonly
            />
            <button
              type="button"
              class="blkp"
              @click="showSupModal = true"
              :disabled="isPo"
            >
              <IconSearch :size="13" />
            </button>
          </div>
          <input
            :value="formData.header.sup_nama"
            readonly
            class="inp ro ml-1"
            style="flex: 1"
          />
        </div>
        <div class="fr">
          <label class="lbl"></label>
          <input
            :value="formData.header.sup_alamat"
            readonly
            class="inp ro"
            style="flex: 1"
          />
        </div>
        <div class="fr">
          <label class="lbl"></label>
          <input
            :value="formData.header.sup_kota"
            readonly
            class="inp ro"
            style="flex: 1"
          />
        </div>

        <div class="sep" />

        <!-- Jatuh Tempo -->
        <div class="fr">
          <label class="lbl">Jth. Tempo</label>
          <input
            type="date"
            v-model="formData.header.bpb_jatuhtempo"
            class="idate"
            style="width: 150px"
          />
        </div>

        <!-- No. Barcode + tombol cetak semua -->
        <div class="fr mt-1">
          <label class="lbl" style="font-size: 10px; white-space: nowrap"
            >No. Barcode</label
          >
          <input
            :value="formData.header.no_buat_barcode"
            readonly
            class="inp ro"
            style="flex: 1; font-size: 10px"
            placeholder="Otomatis saat simpan"
          />
          <button
            type="button"
            class="btn-print-all ml-1"
            title="Cetak Semua Barcode (F5)"
            @click="printBarcodeAll"
          >
            <IconPrinter :size="12" />&nbsp;Cetak Semua
          </button>
        </div>

        <!-- Note -->
        <div class="fr mt-1" style="align-items: flex-start">
          <label class="lbl" style="padding-top: 3px">Note</label>
          <textarea
            v-model="formData.header.bpb_keterangan"
            class="ta"
            rows="3"
            style="flex: 1"
          />
        </div>
      </div>
    </template>

    <!-- ══ KOLOM KANAN ══ -->
    <template #right-column>
      <div class="bpb-right">
        <!-- ── Tabel 1: Rincian Bahan ── -->
        <div class="tbl-header">
          <span class="tbl-title">1. Rincian Bahan Diterima</span>
          <button v-if="!isPo" type="button" class="btn-add" @click="addItem">
            + Tambah Baris
          </button>
        </div>
        <div
          class="tbl-wrap"
          style="flex: 1; min-height: 160px; max-height: 45vh"
        >
          <table class="gt" style="min-width: 900px">
            <thead>
              <tr>
                <th style="width: 32px" class="tc">No</th>
                <th style="width: 90px">Kode</th>
                <th style="width: 160px">Nama Bahan</th>
                <th style="width: 48px" class="tc">Sat</th>
                <th style="width: 55px" class="tc">Sat PO</th>
                <th style="width: 72px" class="tr">Qty PO</th>
                <th style="width: 72px" class="tr">Terima</th>
                <th style="width: 72px" class="tr text-red">Kurang</th>
                <th style="width: 80px" class="tr bg-yellow">Jml YARD</th>
                <th style="width: 80px" class="tr bg-yellow">Terima Skrg</th>
                <th style="width: 55px" class="tr bg-yellow">Roll</th>
                <th style="width: 80px">Gramasi</th>
                <th style="width: 100px">Warna</th>
                <th style="width: 70px">Setting</th>
                <th style="width: 100px">No. SPK</th>
                <th style="width: 150px">Nama SPK</th>
                <th v-if="!isPo" style="width: 32px" class="tc"></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(item, idx) in formData.items" :key="idx">
                <td class="tc gt-lbl">{{ idx + 1 }}</td>
                <td class="p0">
                  <div class="cell-grp">
                    <input v-model="item.kode" class="ci" readonly />
                    <button
                      v-if="!isPo"
                      type="button"
                      class="ci-btn"
                      @click="openLookupBahan(idx)"
                    >
                      <IconSearch :size="11" />
                    </button>
                  </div>
                </td>
                <td class="p0">
                  <input
                    v-model="item.nama"
                    class="ci ro"
                    readonly
                    :title="item.nama"
                  />
                </td>
                <td class="p0">
                  <input v-model="item.satuan" class="ci tc ro" readonly />
                </td>
                <td class="p0">
                  <input v-model="item.satuanpo" class="ci tc ro" readonly />
                </td>
                <td class="p0">
                  <input :value="item.totalpo" class="ci tr ro fw" readonly />
                </td>
                <td class="p0">
                  <input :value="item.terima" class="ci tr ro" readonly />
                </td>
                <td class="p0">
                  <input
                    :value="item.kurang"
                    class="ci tr ro text-red"
                    readonly
                  />
                </td>
                <td class="p0">
                  <input
                    v-model.number="item.jumlahyard"
                    type="number"
                    class="ci tr fw bg-yellow-light"
                    @blur="onJumlahYardChange(idx)"
                  />
                </td>
                <td class="p0">
                  <input
                    v-model.number="item.jumlah"
                    type="number"
                    class="ci tr fw bg-yellow-light"
                    @blur="onJumlahChange(idx)"
                  />
                </td>
                <td class="p0">
                  <input
                    v-model.number="item.roll"
                    type="number"
                    class="ci tr fw"
                    :class="
                      Number(item.roll) !== 0
                        ? 'bg-red text-white'
                        : 'bg-yellow-light'
                    "
                    @blur="onRollChange(idx)"
                  />
                </td>
                <td class="p0"><input v-model="item.gramasi" class="ci" /></td>
                <td class="p0"><input v-model="item.warna" class="ci" /></td>
                <td class="p0"><input v-model="item.setting" class="ci" /></td>
                <td class="p0">
                  <div class="cell-grp">
                    <input
                      v-model="item.spk"
                      class="ci"
                      placeholder="..."
                      @change="onSpkChange(idx)"
                    />
                    <button
                      type="button"
                      class="ci-btn"
                      @click="openLookupSpk(idx)"
                      title="Cari SPK (F1)"
                    >
                      <IconSearch :size="11" />
                    </button>
                  </div>
                </td>
                <td class="p0">
                  <input
                    v-model="item.namaspk"
                    class="ci ro"
                    readonly
                    :title="item.namaspk"
                  />
                </td>
                <td v-if="!isPo" class="tc">
                  <button
                    type="button"
                    class="btn-del"
                    @click="removeItem(idx)"
                  >
                    ✕
                  </button>
                </td>
              </tr>
              <tr v-if="formData.items.length === 0">
                <td :colspan="isPo ? 16 : 17" class="empty-row">
                  Tidak ada data rincian bahan.
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- ── Baris bawah: Realisasi PO + Barcode (side by side) ── -->
        <div class="bottom-row mt-2">
          <!-- Tabel 2: Realisasi PO -->
          <div v-if="isPo" class="bottom-panel" style="flex: 1.2; min-width: 0">
            <div class="tbl-header blue">
              <span class="tbl-title">2. Realisasi Pemotongan PO</span>
            </div>
            <div class="tbl-wrap" style="height: 150px">
              <table class="gt" style="min-width: 750px">
                <thead>
                  <tr>
                    <th style="width: 32px" class="tc">No</th>
                    <th style="width: 80px">Kode</th>
                    <th style="width: 140px">Nama Bahan</th>
                    <th style="width: 140px">Nama External</th>
                    <th style="width: 46px" class="tc">Sat</th>
                    <th style="width: 72px" class="tr">Jml PO</th>
                    <th style="width: 72px" class="tr">Sdh Terima</th>
                    <th style="width: 64px" class="tr text-red">Kurang</th>
                    <th style="width: 90px" class="tr bg-yellow">
                      Terima (Sinkron)
                    </th>
                    <th style="width: 90px">No. MKB</th>
                    <th style="width: 90px">No. SPK</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(p, i) in formData.poItems" :key="i">
                    <td class="tc gt-lbl">{{ p.nourut || i + 1 }}</td>
                    <td class="px-1">{{ p.kode }}</td>
                    <td class="px-1" :title="p.nama">{{ p.nama }}</td>
                    <td class="px-1" :title="p.namaext">{{ p.namaext }}</td>
                    <td class="tc px-1">{{ p.satuan }}</td>
                    <td class="tr px-1 fw">{{ p.jumlahpo }}</td>
                    <td class="tr px-1">{{ p.sudah }}</td>
                    <td class="tr px-1 text-red">{{ p.kurang }}</td>
                    <td class="p0">
                      <input
                        v-model.number="p.terima"
                        type="number"
                        class="ci tr fw bg-yellow-light"
                        readonly
                      />
                    </td>
                    <td class="px-1">{{ p.mkb }}</td>
                    <td class="px-1">{{ p.spk }}</td>
                  </tr>
                  <tr v-if="formData.poItems.length === 0">
                    <td colspan="11" class="empty-row">
                      Tarik Nomor PO di kiri untuk menampilkan realisasi.
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- Tabel 3: Barcode -->
          <div
            class="bottom-panel"
            :style="isPo ? 'flex:0.8;min-width:0' : 'flex:1;min-width:0'"
          >
            <div class="tbl-header teal">
              <span class="tbl-title"
                >{{ isPo ? "3." : "2." }} Rincian Barcode (Auto via Roll)</span
              >
            </div>
            <div class="tbl-wrap" style="height: 150px">
              <table class="gt">
                <thead>
                  <tr>
                    <th style="width: 32px" class="tc">No</th>
                    <th style="width: 80px">Kode</th>
                    <th>Nama Bahan</th>
                    <th style="width: 130px" class="tc">Barcode ID</th>
                    <th style="width: 80px" class="tr bg-yellow">Qty/Roll</th>
                    <th style="width: 30px" class="tc"></th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(b, i) in formData.barcodes" :key="i">
                    <td
                      class="tc gt-lbl"
                      :class="{ 'bg-red text-white': b.barcodex }"
                    >
                      {{ b.no || i + 1 }}
                    </td>
                    <td class="px-1">{{ b.kode }}</td>
                    <td class="px-1" :title="b.nama">{{ b.nama }}</td>
                    <td class="tc px-1 fw text-grey">{{ b.barcode }}</td>
                    <td class="p0">
                      <input
                        v-model.number="b.jumlah"
                        type="number"
                        class="ci tr fw"
                        :class="{
                          'bg-blue text-white':
                            b.barcodex && Number(b.jumlahx) !== 0,
                        }"
                      />
                    </td>
                    <td class="tc">
                      <button
                        v-if="b.barcode"
                        type="button"
                        class="ci-btn-print"
                        title="Cetak barcode ini (F3)"
                        @click="printBarcodeSingle(b)"
                      >
                        <IconPrinter :size="11" />
                      </button>
                    </td>
                  </tr>
                  <tr v-if="formData.barcodes.length === 0">
                    <td colspan="6" class="empty-row">
                      Isi kolom <strong>Roll</strong> di atas untuk menghasilkan
                      barcode.
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </template>
  </BaseForm>

  <SupplierSearchModal v-model="showSupModal" @selected="setSup" />
  <GudangBahanSearchModal v-model="showGdgModal" @selected="setGudang" />
  <PoBahanSearchModal v-model="showPoModal" @selected="setPo" />
  <BahanSearchModal
    v-model="showBahanModal"
    @selected="setBahan"
    :mode="'all'"
    :mkb-filter="
      activeGridIndex >= 0 ? formData.items[activeGridIndex].mkb : ''
    "
  />
  <SpkSearchModal v-model="showSpkModal" @selected="setSpk" />

  <BpbBahanBarcodeDialog
    v-model="showBarcodeDialog"
    :nomor="formData.header.bpb_nomor"
    :barcode-hdr="printMode.barcodeHdr"
    :single-barcode="printMode.singleBarcode"
  />

  <!-- Dialog Konfirmasi Cetak Setelah Simpan -->
  <v-dialog v-model="showPrintConfirm" max-width="400" persistent>
    <v-card class="rounded-lg">
      <v-card-title class="bg-primary text-white d-flex align-center pa-3">
        <IconPrinter class="mr-2" :size="20" />
        <span>Simpan Berhasil</span>
      </v-card-title>
      <v-card-text class="pa-4 text-center">
        <div class="text-body-1 mb-2">
          Data BPB <b>{{ nomorTerakhir }}</b> telah disimpan.
        </div>
        <div class="text-body-2 text-grey-darken-1">
          Apakah Anda ingin mencetak dokumen BPB ini sekarang?
        </div>
      </v-card-text>
      <v-card-actions class="pa-3 border-t">
        <v-btn variant="text" @click="goBack">Tidak, Tutup</v-btn>
        <v-spacer />
        <v-btn color="primary" variant="elevated" @click="doPrintDocument">
          <IconPrinter :size="16" class="mr-1" /> Ya, Cetak
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.bpb-left {
  display: flex;
  flex-direction: column;
  gap: 3px;
  padding: 10px 12px;
  font-family: "Segoe UI", system-ui, sans-serif;
  font-size: 11px;
  box-sizing: border-box;
  overflow: hidden;
  min-width: 0;
  width: 100%;
}
.bpb-right {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 10px 12px;
  font-family: "Segoe UI", system-ui, sans-serif;
  font-size: 11px;
  box-sizing: border-box;
  min-height: 0;
  min-width: 0;
  overflow: hidden;
  gap: 0;
}

.fr {
  display: flex;
  align-items: center;
  min-height: 24px;
  gap: 4px;
  width: 100%;
}
.lbl {
  width: 80px;
  flex-shrink: 0;
  font-weight: 600;
  color: #333;
  font-size: 11px;
  white-space: nowrap;
}
.fw {
  font-weight: 700;
}
.sep {
  height: 1px;
  background: #e0e0e0;
  margin: 4px 0;
  width: 100%;
}
.mt-1 {
  margin-top: 4px;
}
.mt-2 {
  margin-top: 8px;
}
.ml-1 {
  margin-left: 4px;
}
.text-primary {
  color: #1565c0;
}
.text-red {
  color: #c62828;
}
.text-grey {
  color: #757575;
}
.shaded-row {
  background: #f5f5f5;
  padding: 4px 8px;
  border: 1px solid #eee;
  border-radius: 3px;
}

.type-badge {
  font-size: 10px;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 10px;
}
.type-badge.po {
  background: #e3f2fd;
  color: #1565c0;
  border: 1px solid #90caf9;
}
.type-badge.nonpo {
  background: #fff8e1;
  color: #e65100;
  border: 1px solid #ffcc80;
}

.inp {
  height: 24px;
  border: 1px solid #a0a0a0;
  padding: 0 5px;
  font-size: 11px;
  background: white;
  outline: none;
  box-sizing: border-box;
  font-family: inherit;
  color: #212121;
  min-width: 0;
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
.tr {
  text-align: right;
}
.tc {
  text-align: center;
}
.px-1 {
  padding: 0 5px;
}

.idate {
  height: 24px;
  border: 1px solid #a0a0a0;
  padding: 0 4px;
  font-size: 11px;
  background: white;
  outline: none;
  box-sizing: border-box;
}
.idate:focus {
  border-color: #1565c0;
}

.igrp {
  display: flex;
  border: 1px solid #a0a0a0;
  height: 24px;
  background: white;
  overflow: hidden;
  flex-shrink: 0;
}
.igrp .inp {
  border: none;
  height: 22px;
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
}
.blkp:disabled {
  opacity: 0.5;
  cursor: default;
}

.ta {
  border: 1px solid #a0a0a0;
  padding: 3px 5px;
  font-size: 11px;
  font-family: inherit;
  outline: none;
  box-sizing: border-box;
  resize: vertical;
}
.ta:focus {
  border-color: #1565c0;
}

/* Print buttons */
.btn-print-all {
  flex-shrink: 0;
  height: 24px;
  background: #e8f5e9;
  border: 1px solid #4caf50;
  color: #2e7d32;
  font-size: 10px;
  font-weight: 600;
  padding: 0 7px;
  cursor: pointer;
  border-radius: 2px;
  white-space: nowrap;
  display: inline-flex;
  align-items: center;
  gap: 3px;
}
.btn-print-all:hover {
  background: #c8e6c9;
}

.ci-btn-print {
  width: 22px;
  height: 22px;
  background: #e3f2fd;
  border: none;
  cursor: pointer;
  font-size: 11px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto;
  border-radius: 2px;
  color: #1565c0;
}
.ci-btn-print:hover {
  background: #bbdefb;
}

/* Table headers */
.tbl-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #1565c0;
  color: white;
  padding: 5px 10px;
  border-radius: 3px 3px 0 0;
  flex-shrink: 0;
}
.tbl-header.blue {
  background: #1565c0;
}
.tbl-header.teal {
  background: #00695c;
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
  padding: 2px 8px;
  font-size: 10px;
  font-weight: 600;
  cursor: pointer;
  border-radius: 2px;
}
.btn-add:hover {
  background: rgba(255, 255, 255, 0.3);
}

.tbl-wrap {
  overflow: auto;
  border: 1px solid #bdbdbd;
  border-top: none;
  background: white;
  border-radius: 0 0 3px 3px;
}
.gt {
  width: 100%;
  border-collapse: collapse;
  table-layout: fixed;
}
.gt thead th {
  background: #f0f4f8;
  border: 1px solid #bdbdbd;
  padding: 4px 5px;
  font-size: 10px;
  font-weight: 700;
  color: #37474f;
  white-space: nowrap;
  position: sticky;
  top: 0;
  z-index: 1;
}
.gt thead th.bg-yellow {
  background: #fff9c4;
}
.gt tbody td {
  border: 1px solid #e8e8e8;
  height: 26px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
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
  height: 25px;
  border: none;
  background: transparent;
  outline: none;
  font-size: 11px;
  padding: 0 5px;
  font-family: inherit;
  color: #212121;
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

.cell-grp {
  display: flex;
  align-items: center;
  height: 25px;
}
.cell-grp .ci {
  flex: 1;
}
.ci-btn {
  width: 22px;
  flex-shrink: 0;
  background: #eeeeee;
  border: none;
  border-left: 1px solid #e0e0e0;
  cursor: pointer;
  height: 25px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.ci-btn:hover {
  background: #e0e0e0;
}

.btn-del {
  background: transparent;
  color: #d32f2f;
  border: none;
  cursor: pointer;
  padding: 3px 5px;
  font-size: 11px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto;
}
.btn-del:hover {
  background: #ffebee;
  border-radius: 2px;
}

.empty-row {
  text-align: center;
  color: #9e9e9e;
  font-style: italic;
  padding: 14px 8px;
  font-size: 11px;
}

.bottom-row {
  display: flex;
  gap: 10px;
  align-items: stretch;
  flex-shrink: 0;
}
.bottom-panel {
  display: flex;
  flex-direction: column;
  min-width: 0;
  overflow: hidden;
}

.bg-red {
  background-color: #d32f2f !important;
  color: #ffffff !important;
}
.bg-blue {
  background-color: #1976d2 !important;
}
.text-white {
  color: #ffffff !important;
}
input.bg-red {
  opacity: 1 !important;
}
.ci.bg-red {
  background-color: #d32f2f !important;
  color: #ffffff !important;
  -webkit-text-fill-color: #ffffff !important;
  caret-color: #ffffff !important;
}

.ci.bg-red:focus {
  background-color: #d32f2f !important;
  color: #ffffff !important;
}

.ci.bg-yellow-light {
  background: #fffde7 !important;
}
</style>
