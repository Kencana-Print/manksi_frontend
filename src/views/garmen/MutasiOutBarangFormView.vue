<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useToast } from "vue-toastification";
import { useAuthStore } from "@/stores/authStore";
import BaseForm from "@/components/BaseForm.vue";
import { useForm } from "@/composables/useForm";
import { IconTruckDelivery, IconSearch } from "@tabler/icons-vue";
import BarangGarmenSearchModal from "@/components/lookups/BarangGarmenSearchModal.vue";
import PermintaanFinanceSearchModal from "@/components/lookups/PermintaanFinanceSearchModal.vue";
import { mutasiOutBarangFormService } from "@/services/garmen/mutasiOutBarangFormService";

const authStore = useAuthStore();
const route = useRoute();
const router = useRouter();
const toast = useToast();

const isEditMode = computed(() => !!route.params.nomor);

// ── Ambil jenis dari query (dikirim dari browse onAdd) ──
const formJenis = ref(
  typeof route.query.jenis === "string" ? route.query.jenis : "ACCESORIES",
);

// ── Tanggal lokal (hindari UTC shift) ──
const toLocalDate = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
};
const todayLocal = toLocalDate(new Date());

// --- STATE MODAL & GRID ---
const showBarangModal = ref(false);
const activeGridIndex = ref(-1);
const customSearchItems = ref<any[] | undefined>(undefined);

const deleteRowDialog = ref(false);
const pendingDeleteIdx = ref<number | null>(null);

const defaultData = {
  Nomor: "",
  Jenis: formJenis.value,
  Tanggal: todayLocal,
  CabangAsal: authStore.user?.cabang || "P01",
  CabangTujuan: "P04",
  Bagian: authStore.user?.bagian || "FINANCE",
  Keterangan: "",
  NoTerima: "",
  StatusEdit: "",
  isTutupBuku: false,
  Detail: [
    {
      NoPermintaan: "",
      Kode: "",
      Nama: "",
      Satuan: "",
      Spesifikasi: "",
      Stok: 0,
      StokBelumDiterima: 0,
      StokReal: 0,
      Jumlah: 0,
    },
  ],
};

const showPrintDialog = ref(false);
const nomorToPrint = ref("");

const showPermintaanFinanceModal = ref(false);
const isFinance = computed(() => formData.value.Bagian === "FINANCE");

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
  menuId: "70",
  initialData: defaultData,
  fetchApi: async () => {
    const res = await mutasiOutBarangFormService.getDetail(
      route.params.nomor as string,
    );
    const d = res.data.data;
    formJenis.value = d.Jenis; // override jenis dari DB saat edit
    return {
      ...d,
      Tanggal: d.Tanggal || todayLocal,
      Detail: d.Detail?.length ? d.Detail : defaultData.Detail,
    };
  },
  submitApi: async (data: any) => {
    return await mutasiOutBarangFormService.saveData({
      isNewMode: !isEditMode.value,
      data,
    });
  },
  onSuccess: (res: any) => {
    toast.success("Mutasi berhasil disimpan!");
    nomorToPrint.value = res.data?.nomor || formData.value.Nomor;
    showPrintDialog.value = true;
  },
});

// --- LOOKUP BARANG ---
const fetchCustomBarang = async (searchStr: string) => {
  try {
    const res = await mutasiOutBarangFormService.searchBarang({
      jenis: formJenis.value,
      bagian: formData.value.Bagian,
      cabang: formData.value.CabangAsal,
      search: searchStr,
    });
    customSearchItems.value = res.data.data;
  } catch {
    toast.error("Gagal menarik data barang.");
  }
};

const openLookupBarang = async (idx: number) => {
  activeGridIndex.value = idx;
  await fetchCustomBarang("");
  showBarangModal.value = true;
};

const openLookupPermintaan = (idx: number) => {
  activeGridIndex.value = idx;
  showPermintaanFinanceModal.value = true;
};

const setPermintaanFinance = async (noPermintaan: string) => {
  try {
    const res = await mutasiOutBarangFormService.getDetailPermintaanFinance({
      noPermintaan,
      cabangAsal: formData.value.CabangAsal,
      nomorMso: formData.value.Nomor,
    });

    const details = res.data.data;
    if (details.length === 0)
      return toast.warning("Tidak ada item di No. Permintaan tersebut.");

    let targetIdx = activeGridIndex.value;

    details.forEach((dtl: any) => {
      // Cek apakah item ini sudah ada di grid
      const isDuplicate = formData.value.Detail.some(
        (existing: any) =>
          existing.NoPermintaan === dtl.NoPermintaan &&
          existing.Kode === dtl.Kode,
      );

      if (!isDuplicate) {
        // Timpa baris aktif jika kosong, jika tidak, tambah baris baru
        if (
          formData.value.Detail[targetIdx] &&
          !formData.value.Detail[targetIdx].Kode
        ) {
          formData.value.Detail[targetIdx] = { ...dtl };
        } else {
          formData.value.Detail.push({ ...dtl });
        }
        targetIdx++;
      }
    });

    // Otomatis siapkan 1 baris kosong di akhir
    if (formData.value.Detail[formData.value.Detail.length - 1].Kode !== "") {
      addItem();
    }
  } catch (e) {
    toast.error("Gagal menarik detail permintaan.");
  }
};

// --- GRID HANDLERS ---
const addItem = () => {
  formData.value.Detail.push({
    NoPermintaan: "",
    Kode: "",
    Nama: "",
    Satuan: "",
    Spesifikasi: "",
    Stok: 0,
    StokBelumDiterima: 0,
    StokReal: 0,
    Jumlah: 0,
  });
};

const removeItem = (idx: number) => {
  pendingDeleteIdx.value = idx;
  deleteRowDialog.value = true;
};

const confirmRemoveItem = () => {
  if (pendingDeleteIdx.value !== null) {
    formData.value.Detail.splice(pendingDeleteIdx.value, 1);

    // Jika data habis, buat baris kosong baru (seperti initgrid)
    if (formData.value.Detail.length === 0) {
      addItem();
    }
  }
  deleteRowDialog.value = false;
  pendingDeleteIdx.value = null;
};

const setBarang = async (v: any) => {
  const i = activeGridIndex.value;
  if (i < 0) return;

  const kodeBaru = v.Kode || v.brg_kode;
  const isDuplicate = formData.value.Detail.some(
    (d: any, idx: number) => idx !== i && d.Kode === kodeBaru,
  );
  if (isDuplicate) return toast.error(`Kode ${kodeBaru} sudah ada.`);

  let dataBarang = v;
  if (v.Stok === undefined) {
    const res = await mutasiOutBarangFormService.searchBarang({
      jenis: formJenis.value,
      bagian: formData.value.Bagian,
      cabang: formData.value.CabangAsal,
      search: kodeBaru,
    });
    if (res.data.data.length > 0) dataBarang = res.data.data[0];
  }

  formData.value.Detail[i].Kode = kodeBaru;
  formData.value.Detail[i].Nama = dataBarang.Nama || dataBarang.brg_nama;
  formData.value.Detail[i].Satuan = dataBarang.Satuan || dataBarang.brg_satuan;
  formData.value.Detail[i].Stok = Number(dataBarang.Stok) || 0;
  formData.value.Detail[i].StokReal = Number(dataBarang.Stok) || 0;
  formData.value.Detail[i].Jumlah = 0;

  if (i === formData.value.Detail.length - 1) addItem();
};

// --- VALIDASI ---
const validateSave = () => {
  if (!formData.value.CabangTujuan) return toast.warning("Tujuan harus diisi.");
  if (!formData.value.Keterangan.trim())
    return toast.warning("Keterangan harus diisi.");

  const pin = formData.value.StatusEdit;
  if (isEditMode.value && ["MINTA", "WAIT", "TOLAK"].includes(pin))
    return toast.error(
      "Transaksi sudah diclose. Minta approve terlebih dahulu.",
    );

  const validDetails = formData.value.Detail.filter((d: any) => d.Kode?.trim());
  if (!validDetails.length) return toast.warning("Detail harus diisi.");
  for (let i = 0; i < validDetails.length; i++) {
    if (Number(validDetails[i].Jumlah) <= 0)
      return toast.warning(`Jumlah harus diisi (Baris ke-${i + 1})`);
  }

  formData.value.Detail = validDetails;
  showSaveDialog.value = true;
};

// --- CETAK ---
const onPrintConfirm = () => {
  const safeNomor = encodeURIComponent(nomorToPrint.value);

  // PERBAIKAN: Gunakan slash (/) bukan tanda tanya (?)
  window.open(`/garmen/barang/mutasi-out/print/${safeNomor}`, "_blank");

  showPrintDialog.value = false;
  router.push({ name: "MutasiOutGarmenBrowse" });
};
const onPrintCancel = () => {
  showPrintDialog.value = false;
  router.push({ name: "MutasiOutGarmenBrowse" });
};

const formatQty = (val: any) =>
  Number(val || 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
</script>

<template>
  <BaseForm
    :title="
      isEditMode ? `Ubah Mutasi Out ${formJenis}` : `Mutasi Out ${formJenis}`
    "
    menu-id="70"
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
    <template #dialog-warning>
      <v-alert
        v-if="formData.isTutupBuku"
        type="error"
        variant="tonal"
        density="compact"
        class="mt-2 text-caption"
      >
        Periode ini sudah ditutup. Perubahan mungkin akan ditolak.
      </v-alert>
      <v-alert
        v-if="formData.NoTerima"
        type="error"
        variant="tonal"
        density="compact"
        class="mt-2 text-caption"
      >
        Mutasi ini sudah DITERIMA di cabang tujuan. Dilarang merubah.
      </v-alert>
    </template>

    <!-- ── LEFT COLUMN ── -->
    <template #left-column>
      <!-- Identitas Dokumen -->
      <div class="fr">
        <label class="lbl">Nomor</label>
        <input
          :value="formData.Nomor"
          class="inp ro"
          style="color: #e53935; font-weight: 700"
          placeholder="Otomatis"
          readonly
        />
      </div>
      <div class="fr">
        <label class="lbl">Jenis</label>
        <input
          :value="formJenis"
          class="inp ro"
          style="font-weight: 700"
          readonly
        />
      </div>
      <div class="fr">
        <label class="lbl">Tanggal</label>
        <input
          type="date"
          v-model="formData.Tanggal"
          class="idate"
          :disabled="isEditMode"
        />
      </div>
      <div class="fr">
        <label class="lbl">Cabang</label>
        <input
          :value="formData.CabangAsal"
          class="inp ro"
          readonly
          style="width: 55px; flex: none"
        />
        <input :value="formData.Bagian" class="inp ro" readonly />
      </div>

      <div class="sep" />

      <!-- Tujuan & Terima -->
      <div class="fr">
        <label class="lbl">Tujuan</label>
        <select
          v-model="formData.CabangTujuan"
          class="inp"
          style="flex: none; width: 80px"
        >
          <option
            v-for="c in ['P01', 'P02', 'P03', 'P04', 'P05', 'HO-']"
            :key="c"
            :value="c"
          >
            {{ c }}
          </option>
        </select>
      </div>
      <div class="fr">
        <label class="lbl">No. Terima</label>
        <input :value="formData.NoTerima" class="inp ro" readonly />
      </div>

      <div class="sep" />

      <!-- Keterangan -->
      <div class="fr" style="align-items: flex-start">
        <label class="lbl" style="padding-top: 3px">Keterangan</label>
        <textarea
          v-model="formData.Keterangan"
          class="ta"
          rows="4"
          placeholder="Keterangan mutasi..."
        />
      </div>
    </template>

    <!-- ── RIGHT COLUMN — tabel detail ── -->
    <template #right-column>
      <div class="d-flex flex-column h-100 gap-2 pa-2">
        <div class="tbl-header blue">
          <span>Rincian Barang</span>
          <button
            v-if="!isEditMode"
            type="button"
            class="btn-add"
            @click="addItem"
          >
            + Tambah Baris
          </button>
        </div>
        <div class="tbl-wrap flex-grow-1" style="min-height: 250px">
          <table class="gt">
            <thead>
              <tr>
                <th style="width: 40px" class="tc">No</th>
                <th style="width: 140px">No. Permintaan</th>
                <th style="width: 120px">Kode</th>
                <th style="min-width: 200px">Nama Barang</th>
                <th style="min-width: 150px">Spesifikasi</th>
                <th style="width: 60px" class="tc">Sat</th>
                <th style="width: 80px" class="tr">Stok</th>
                <th style="width: 100px" class="tr">Belum Diterima</th>
                <th style="width: 80px" class="tr">Stok Real</th>
                <th
                  style="width: 90px; background: #ffeb3b"
                  class="tr text-dark"
                >
                  Jumlah
                </th>
                <th style="width: 40px" class="tc">Aksi</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="(item, idx) in formData.Detail"
                :key="idx"
                :class="{ 'active-row': activeGridIndex === Number(idx) }"
                @click="activeGridIndex = Number(idx)"
              >
                <td class="tc gt-num">{{ Number(idx) + 1 }}</td>
                <td class="p0">
                  <div class="cell-grp">
                    <input
                      :value="item.NoPermintaan"
                      class="ci fw text-primary ro"
                      readonly
                    />
                    <button
                      v-if="!isEditMode && formData.Bagian === 'FINANCE'"
                      type="button"
                      class="ci-btn"
                      @click.stop="openLookupPermintaan(Number(idx))"
                    >
                      <IconSearch :size="12" />
                    </button>
                  </div>
                </td>

                <td class="p0">
                  <div class="cell-grp">
                    <input
                      :value="item.Kode"
                      class="ci fw text-primary ro"
                      readonly
                    />
                    <button
                      v-if="!isEditMode && formData.Bagian !== 'FINANCE'"
                      type="button"
                      class="ci-btn"
                      @click.stop="openLookupBarang(Number(idx))"
                    >
                      <IconSearch :size="12" />
                    </button>
                  </div>
                </td>
                <td class="p0">
                  <input v-model="item.Nama" class="ci ro" readonly />
                </td>
                <td class="p0">
                  <input
                    v-model="item.Spesifikasi"
                    class="ci"
                    :readonly="isEditMode"
                    :class="{ ro: isEditMode }"
                  />
                </td>
                <td class="p0">
                  <input v-model="item.Satuan" class="ci ro tc" readonly />
                </td>
                <td class="p0">
                  <input
                    :value="formatQty(item.Stok)"
                    class="ci ro tr"
                    readonly
                  />
                </td>
                <td class="p0">
                  <input
                    :value="formatQty(item.StokBelumDiterima)"
                    class="ci ro tr"
                    readonly
                  />
                </td>
                <td class="p0">
                  <input
                    :value="formatQty(item.StokReal)"
                    class="ci ro tr fw"
                    readonly
                  />
                </td>
                <td class="p0">
                  <input
                    v-model.number="item.Jumlah"
                    type="number"
                    class="ci tr fw text-success"
                    :readonly="isEditMode"
                    :class="{ ro: isEditMode }"
                    @focus="(e) => (e.target as HTMLInputElement).select()"
                  />
                </td>
                <td class="tc p0">
                  <button
                    v-if="!isEditMode"
                    type="button"
                    class="btn-del"
                    @click.stop="removeItem(Number(idx))"
                  >
                    ✕
                  </button>
                </td>
              </tr>
              <tr v-if="!formData.Detail?.length">
                <td
                  colspan="11"
                  class="tc text-grey py-3"
                  style="font-style: italic; font-size: 11px"
                >
                  Tidak ada detail barang.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </template>
  </BaseForm>

  <BarangGarmenSearchModal
    v-model="showBarangModal"
    :jenis="formJenis"
    :cabang="formData.CabangAsal"
    :custom-items="customSearchItems"
    @selected="setBarang"
    @search="fetchCustomBarang"
  />

  <PermintaanFinanceSearchModal
    v-model="showPermintaanFinanceModal"
    :jenis="formJenis"
    :cabang-tujuan="formData.CabangTujuan"
    @selected="setPermintaanFinance"
  />

  <v-dialog v-model="showPrintDialog" max-width="400px" persistent>
    <v-card rounded="lg">
      <v-card-title class="bg-primary text-white pa-3 text-subtitle-1"
        >Konfirmasi Cetak</v-card-title
      >
      <v-card-text class="pa-4 text-body-2">
        Mutasi disimpan:
        <span class="font-weight-bold text-primary">{{ nomorToPrint }}</span
        >. Ingin cetak sekarang?
      </v-card-text>
      <v-card-actions class="pa-3 border-t">
        <v-spacer />
        <v-btn variant="text" @click="onPrintCancel">Tidak</v-btn>
        <v-btn color="primary" variant="elevated" @click="onPrintConfirm"
          >Ya, Cetak</v-btn
        >
      </v-card-actions>
    </v-card>
  </v-dialog>

  <v-dialog v-model="deleteRowDialog" max-width="380px" persistent>
    <v-card rounded="lg">
      <v-card-title class="bg-error text-white pa-3 text-subtitle-1">
        Hapus Record?
      </v-card-title>
      <v-card-text class="pa-4 text-body-2">
        Apakah Anda yakin ingin menghapus baris barang ini dari rincian mutasi?
      </v-card-text>
      <v-card-actions class="pa-3 border-t">
        <v-spacer />
        <v-btn variant="text" @click="deleteRowDialog = false">Batal</v-btn>
        <v-btn color="error" variant="elevated" @click="confirmRemoveItem"
          >Ya, Hapus</v-btn
        >
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style scoped>
/* ── Form fields (convention Manksi) ── */
.fr {
  display: flex;
  align-items: center;
  width: 100%;
  gap: 6px;
  min-height: 26px;
  margin-bottom: 4px;
}
.lbl {
  width: 80px;
  flex-shrink: 0;
  font-size: 11px;
  font-weight: 600;
  color: #333;
  white-space: nowrap;
}
.inp {
  flex: 1;
  height: 24px;
  border: 1px solid #a0a0a0;
  padding: 0 5px;
  font-size: 11px;
  background: white;
  outline: none;
  box-sizing: border-box;
  min-width: 0;
  border-radius: 2px;
}
.inp:focus {
  border-color: #1565c0;
}
.idate {
  height: 24px;
  border: 1px solid #a0a0a0;
  padding: 0 4px;
  font-size: 11px;
  border-radius: 2px;
  outline: none;
  flex: 1;
}
.idate:focus {
  border-color: #1565c0;
}
.ro {
  background: #dde8f0 !important;
  color: #444 !important;
}
.ta {
  flex: 1;
  border: 1px solid #a0a0a0;
  border-radius: 2px;
  padding: 4px 5px;
  font-size: 11px;
  outline: none;
  resize: vertical;
  min-width: 0;
  box-sizing: border-box;
}
.ta:focus {
  border-color: #1565c0;
}
.sep {
  height: 1px;
  background: #e0e0e0;
  margin: 8px 0;
  width: 100%;
}

/* ── Grid tabel ── */
.tbl-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 5px 10px;
  font-size: 11px;
  font-weight: 700;
  border-radius: 3px 3px 0 0;
}
.tbl-header.blue {
  background: #1565c0;
  color: white;
}
.btn-add {
  background: rgba(255, 255, 255, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.5);
  color: white;
  padding: 2px 8px;
  border-radius: 3px;
  cursor: pointer;
  font-size: 11px;
}
.tbl-wrap {
  border: 1px solid #bdbdbd;
  border-top: none;
  background: white;
  overflow: auto;
}
.gt {
  width: 100%;
  border-collapse: collapse;
  table-layout: fixed;
  font-size: 11px;
}
.gt thead th {
  background: #f0f4f8;
  border: 1px solid #bdbdbd;
  padding: 4px 5px;
  font-size: 10px;
  font-weight: 700;
  position: sticky;
  top: 0;
  z-index: 1;
  text-align: left;
}
.gt tbody td {
  border: 1px solid #e8e8e8;
  height: 26px;
  white-space: nowrap;
  overflow: hidden;
}
.active-row td {
  background: #e3f2fd !important;
}
.gt-num {
  font-size: 10px;
  color: #9e9e9e;
  padding: 0 4px;
}
.p0 {
  padding: 0 !important;
}
.ci {
  width: 100%;
  height: 25px;
  border: none;
  background: transparent;
  outline: none;
  font-size: 11px;
  padding: 0 5px;
  box-sizing: border-box;
}
.ci.ro {
  background: #dde8f0 !important;
}
.ci:focus:not(.ro) {
  background: #e3f2fd;
  outline: 1px solid #1976d2;
  outline-offset: -1px;
}
.cell-grp {
  display: flex;
  align-items: center;
  height: 25px;
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
.btn-del {
  width: 100%;
  height: 25px;
  background: transparent;
  color: #d32f2f;
  border: none;
  cursor: pointer;
  font-weight: bold;
}

/* ── Utility ── */
.fw {
  font-weight: 700;
}
.tc {
  text-align: center;
}
.tr {
  text-align: right;
}
.text-primary {
  color: #1565c0;
}
.text-success {
  color: #2e7d32;
}
.text-grey {
  color: #9e9e9e;
}
.text-dark {
  color: #212121;
}
</style>
