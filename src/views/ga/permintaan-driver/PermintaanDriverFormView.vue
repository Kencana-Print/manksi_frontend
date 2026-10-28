<script setup lang="ts">
import { ref, computed, onMounted, nextTick } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useToast } from "vue-toastification";
import BaseForm from "@/components/BaseForm.vue";
import { useForm } from "@/composables/useForm";
import {
  permintaanDriverService,
  type PermintaanDriverFormData,
  type PermintaanDriverDetailItem,
} from "@/services/ga/permintaanDriverService";
import SpkSearchModal from "@/components/lookups/SpkSearchModal.vue";
import {
  IconSteeringWheel,
  IconSearch,
  IconTrash,
  IconPlus,
  IconListDetails,
  IconPrinter,
} from "@tabler/icons-vue";

const route = useRoute();
const router = useRouter();
const toast = useToast();

const editNomor = computed(() => String(route.params.nomor || ""));
const isEdit = computed(() => !!editNomor.value);

// ── Helpers Waktu & Tanggal ──────────────────────────────────────────
const nowWIB = () =>
  new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Jakarta" }));

const getTodayStr = () => {
  const d = nowWIB();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const getNowTimeStr = () => {
  const d = nowWIB();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}:${String(d.getSeconds()).padStart(2, "0")}`;
};

// Hitung tipe jadwal otomatis sesuai logika Delphi 7:
// if time > 13:30 -> Keterlaluan
// else if time > 10:00 -> Tidak Terjadwal
// else -> Terjadwal
const hitungTipeJadwalOtomatis = (hariKerjaVal: string, jamStr: string) => {
  if (hariKerjaVal === "Besok") return "Terjadwal";
  if (jamStr > "13:30:00") return "Keterlaluan";
  if (jamStr > "10:00:00") return "Tidak Terjadwal";
  return "Terjadwal";
};

const initialData: PermintaanDriverFormData = {
  nomor: "",
  tanggal: getTodayStr(),
  jamMinta: getNowTimeStr(),
  tipeJadwal: hitungTipeJadwalOtomatis("Hari Ini", getNowTimeStr()),
  customer: "",
  pengambilan: "",
  pic: "",
  uraian: "",
  jamKerja: "08:00:00",
  status: "Tidak",
  hariKerja: "Hari Ini",
  items: [
    { spk: "", keterangan: "", penerima: "" },
  ],
};

const showPrintDialog = ref(false);
const savedNomor = ref("");

const confirmPrint = () => {
  const no = savedNomor.value;
  showPrintDialog.value = false;
  if (no) {
    window.open(
      `/ga/permintaan-driver/print/${encodeURIComponent(no)}`,
      "_blank",
    );
  }
  router.push({ name: "PermintaanDriverBrowse" });
};

const skipPrint = () => {
  showPrintDialog.value = false;
  router.push({ name: "PermintaanDriverBrowse" });
};

const openPrint = (nomorStr: string) => {
  if (!nomorStr) return;
  window.open(
    `/ga/permintaan-driver/print/${encodeURIComponent(nomorStr)}`,
    "_blank",
  );
};

const {
  isSaving,
  showSaveDialog,
  showCancelDialog,
  showCloseDialog,
  formData,
  goBack,
  executeSave,
  executeCancel,
  executeClose,
} = useForm<PermintaanDriverFormData>({
  menuId: "612",
  initialData,
  submitApi: async (data) => {
    const validItems = (data.items || []).filter(
      (i) => i.spk?.trim() || i.keterangan?.trim(),
    );

    const payload: PermintaanDriverFormData = {
      ...data,
      items: validItems,
    };

    if (isEdit.value) {
      return permintaanDriverService.update(editNomor.value, payload);
    } else {
      return permintaanDriverService.create(payload);
    }
  },
  onSuccess: (res: any) => {
    const nomorBaru = res?.data?.data?.nomor || editNomor.value || "";
    toast.success(
      isEdit.value
        ? `Permintaan Driver ${editNomor.value} berhasil diperbarui.`
        : `Berhasil disimpan: ${nomorBaru}`,
    );
    savedNomor.value = nomorBaru;
    showPrintDialog.value = true;
  },
});

// ── Handler Radio Hari Kerja ──────────────────────────────────────────
const onChangeHariKerja = (val: "Hari Ini" | "Besok") => {
  formData.value.hariKerja = val;
  formData.value.tipeJadwal = hitungTipeJadwalOtomatis(val, formData.value.jamMinta || getNowTimeStr());
};

// ── Detail Table Actions ──────────────────────────────────────────────
const addRow = () => {
  if (!formData.value.items) {
    formData.value.items = [];
  }
  formData.value.items.push({
    spk: "",
    keterangan: "",
    penerima: "",
  });
};

const removeRow = (idx: number) => {
  if (!formData.value.items || formData.value.items.length <= 1) {
    formData.value.items = [{ spk: "", keterangan: "", penerima: "" }];
    return;
  }
  formData.value.items.splice(idx, 1);
};

// Enter pada kolom penerima otomatis nambah baris baru jika di baris terakhir
const onPenerimaEnter = (idx: number) => {
  if (formData.value.items && idx === formData.value.items.length - 1) {
    addRow();
  }
};

// ── Refs untuk Navigasi Grid ──────────────────────────────────────────
const penerimaRefs = ref<Record<number, HTMLInputElement | null>>({});
const setPenerimaRef = (el: any, idx: number) => {
  if (el) penerimaRefs.value[idx] = el;
};

const spkRefs = ref<Record<number, HTMLInputElement | null>>({});
const setSpkRef = (el: any, idx: number) => {
  if (el) spkRefs.value[idx] = el;
};

// ── Lookup SPK (Pengganti F1 Delphi) ──────────────────────────────────
const showSpkModal = ref(false);
const activeDetailIndex = ref<number | null>(null);

const openSpkLookup = (idx: number) => {
  activeDetailIndex.value = idx;
  showSpkModal.value = true;
};

const onSpkSelected = (spkItem: any) => {
  if (activeDetailIndex.value !== null && formData.value.items && formData.value.items[activeDetailIndex.value]) {
    const target = formData.value.items[activeDetailIndex.value];
    const spkNomor = (spkItem.Nomor || spkItem.spk || "").trim();

    // Cek duplikasi di baris lain sesuai Delphi
    const duplicateIndex = formData.value.items.findIndex(
      (it, idx) =>
        idx !== activeDetailIndex.value &&
        (it.spk || "").trim().toUpperCase() === spkNomor.toUpperCase(),
    );
    if (duplicateIndex !== -1) {
      toast.warning(`Spk ini sudah di input, di baris ${duplicateIndex + 1}`);
      showSpkModal.value = false;
      activeDetailIndex.value = null;
      return;
    }

    target.spk = spkNomor;
    target.keterangan = (spkItem.Nama || spkItem.NamaPekerjaan || spkItem.NamaProduk || target.keterangan || "").trim();
    target._lastValidatedSpk = spkNomor.toUpperCase();

    const targetIdx = activeDetailIndex.value;
    nextTick(() => {
      penerimaRefs.value[targetIdx]?.focus();
      penerimaRefs.value[targetIdx]?.select?.();
    });
  }
  showSpkModal.value = false;
  activeDetailIndex.value = null;
};

const onSpkKeydown = (e: KeyboardEvent, idx: number) => {
  if (e.key === "F1") {
    e.preventDefault();
    openSpkLookup(idx);
  }
};

// Validasi dan load SPK saat input langsung (tidak cek aktif atau close)
const validateAndLoadSpk = async (
  row: PermintaanDriverDetailItem,
  idx: number,
  isEnter = false,
) => {
  const code = (row.spk || "").trim();
  if (!code) {
    row._lastValidatedSpk = "";
    return;
  }

  // Jika sudah divalidasi dengan kode yang sama
  if (row._lastValidatedSpk === code.toUpperCase()) {
    if (isEnter) {
      nextTick(() => {
        penerimaRefs.value[idx]?.focus();
        penerimaRefs.value[idx]?.select?.();
      });
    }
    return;
  }

  // Cek duplikasi di baris lain sesuai Delphi
  const duplicateIndex = (formData.value.items || []).findIndex(
    (it, i) =>
      i !== idx && (it.spk || "").trim().toUpperCase() === code.toUpperCase(),
  );
  if (duplicateIndex !== -1) {
    toast.warning(`Spk ini sudah di input, di baris ${duplicateIndex + 1}`);
    row.spk = "";
    row.keterangan = "";
    row._lastValidatedSpk = "";
    return;
  }

  try {
    const res = await permintaanDriverService.searchSpk(code);
    const matches = res.data?.data || [];
    const exact = matches.find(
      (m: any) => m.Nomor?.toUpperCase() === code.toUpperCase(),
    );
    // Jika persis sama atau hanya ada 1 hasil yang cocok
    const match = exact || (matches.length === 1 ? matches[0] : null);

    if (match) {
      row.spk = match.Nomor;
      row.keterangan = match.Nama;
      row._lastValidatedSpk = match.Nomor.toUpperCase();
      if (isEnter) {
        nextTick(() => {
          penerimaRefs.value[idx]?.focus();
          penerimaRefs.value[idx]?.select?.();
        });
      }
    } else {
      // Tidak ditemukan di database
      row.keterangan = "";
      row._lastValidatedSpk = "";
      if (isEnter) {
        toast.warning(`Nomor SPK ${code} belum ada di database.`);
      }
    }
  } catch {
    // Abaikan jika error jaringan
  }
};

const onSpkEnter = async (row: PermintaanDriverDetailItem, idx: number) => {
  await validateAndLoadSpk(row, idx, true);
};

const onSpkBlur = async (row: PermintaanDriverDetailItem, idx: number) => {
  await validateAndLoadSpk(row, idx, false);
};

// ── Validasi Form Sesuai Delphi 7 ─────────────────────────────────────
const onValidate = () => {
  if (isEdit.value) {
    toast.info("Data inputan yang pernah disimpan sebelumnya tidak boleh disimpan ulang.");
    return;
  }

  if (!formData.value.pic?.trim()) {
    toast.warning("PIC harus diisi.");
    return;
  }
  if (!formData.value.customer?.trim()) {
    toast.warning("Customer harus diisi.");
    return;
  }
  if (!formData.value.pengambilan?.trim()) {
    toast.warning("Pengambilan harus diisi.");
    return;
  }

  // Delphi line 246: if (RadioButton1.Checked) and (cxJamkerja.Time < time.Time) then
  // 'Isi Estimasi jam kerja yg benar.'
  if (
    formData.value.hariKerja === "Hari Ini" &&
    formData.value.jamKerja < (formData.value.jamMinta || "")
  ) {
    toast.warning("Isi Estimasi jam kerja yg benar.");
    return;
  }

  // Validasi jika SPK diisi tapi tidak ada keterangan (nomor SPK tidak ada di database)
  for (let i = 0; i < (formData.value.items || []).length; i++) {
    const it = formData.value.items[i];
    if (it.spk?.trim() && !it.keterangan?.trim()) {
      toast.warning(
        `Baris ke-${i + 1}: Nomor SPK ${it.spk} belum valid atau tidak ada di database.`,
      );
      return;
    }
  }

  const validItems = (formData.value.items || []).filter(
    (i) => i.spk?.trim() || i.keterangan?.trim(),
  );
  if (!validItems.length) {
    toast.warning("Minimal isi 1 baris barang/dokumen yang dibawa.");
    return;
  }

  showSaveDialog.value = true;
};

// ── Lifecycle onMounted ───────────────────────────────────────────────
onMounted(async () => {
  if (isEdit.value) {
    try {
      const res = await permintaanDriverService.getById(editNomor.value);
      const d = res.data.data;
      if (!d) throw new Error("Data tidak ditemukan");

      const isBesok = d.tglKerja && d.tglKerja !== d.tanggal;

      formData.value = {
        nomor: d.nomor,
        tanggal: d.tanggal,
        jamMinta: d.jamMinta,
        tipeJadwal: d.tipeJadwal || "Terjadwal",
        customer: d.customer || "",
        pengambilan: d.pengambilan || "",
        pic: d.pic || "",
        uraian: d.uraian || "",
        jamKerja: d.jamKerja || "08:00:00",
        status: d.status || "Tidak",
        hariKerja: isBesok ? "Besok" : "Hari Ini",
        items: (d.items || []).map((x) => ({
          spk: x.SPK,
          keterangan: x.Keterangan,
          penerima: x.Penerima,
        })),
      };

      if (!formData.value.items.length) {
        formData.value.items = [{ spk: "", keterangan: "", penerima: "" }];
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Gagal memuat data Permintaan Driver.");
      goBack();
    }
  } else {
    // Mode Create Baru: Nomor sengaja kosong karena nomor tercipta saat simpan
    formData.value.nomor = "";
  }
});
</script>

<template>
  <BaseForm
    :title="isEdit ? 'Lihat Permintaan Driver' : 'Permintaan Driver'"
    menu-id="612"
    :icon="IconSteeringWheel"
    :is-saving="isSaving"
    :disabled-save="isEdit"
    :item-name="isEdit ? `Permintaan Driver ${editNomor}` : 'Permintaan Driver'"
    v-model:show-save-dialog="showSaveDialog"
    v-model:show-cancel-dialog="showCancelDialog"
    v-model:show-close-dialog="showCloseDialog"
    @validate-save="onValidate"
    @confirm-save="executeSave"
    @confirm-cancel="executeCancel"
    @confirm-close="executeClose"
  >
    <template #header-actions-prepend>
      <v-btn
        v-if="isEdit"
        size="small"
        color="blue-grey"
        variant="flat"
        class="mr-2"
        @click="openPrint(editNomor)"
      >
        <template #prepend>
          <span class="d-flex align-center">
            <IconPrinter :size="15" :stroke-width="1.7" />
          </span>
        </template>
        Cetak
      </v-btn>
    </template>
    <div class="delphi-container">
      <!-- Judul Form Delphi -->
      <div class="delphi-header-title">
        PERMINTAAN DRIVER
      </div>
      <div class="delphi-top-line"></div>

      <!-- Form Inputs Header (Layout Delphi 7) -->
      <div class="delphi-form-content">
        <!-- Row: Nomor -->
        <div class="delphi-row">
          <label class="delphi-lbl">Nomor</label>
          <div class="delphi-val">
            <input
              type="text"
              class="delphi-ctrl ctrl-nomor"
              :value="isEdit ? formData.nomor : ''"
              readonly
              placeholder=""
            />
          </div>
        </div>

        <!-- Row: Tanggal & Jam Minta -->
        <div class="delphi-row">
          <label class="delphi-lbl">Tanggal</label>
          <div class="delphi-val d-flex align-center">
            <input
              type="date"
              v-model="formData.tanggal"
              class="delphi-ctrl ctrl-date"
              disabled
            />
            <input
              type="time"
              step="1"
              v-model="formData.jamMinta"
              class="delphi-ctrl ctrl-time ml-2"
              disabled
            />
          </div>
        </div>

        <!-- Row: Tipe Jadwal -->
        <div class="delphi-row">
          <label class="delphi-lbl">Tipe Jadwal</label>
          <div class="delphi-val">
            <select v-model="formData.tipeJadwal" class="delphi-ctrl ctrl-select" disabled>
              <option value="Terjadwal">Terjadwal</option>
              <option value="Tidak Terjadwal">Tidak Terjadwal</option>
              <option value="Keterlaluan">Keterlaluan</option>
            </select>
          </div>
        </div>

        <!-- Row: Pengambilan -->
        <div class="delphi-row">
          <label class="delphi-lbl">Pengambilan</label>
          <div class="delphi-val">
            <input
              type="text"
              v-model="formData.pengambilan"
              class="delphi-ctrl ctrl-text"
              :readonly="isEdit"
            />
          </div>
        </div>

        <!-- Row: Customer -->
        <div class="delphi-row">
          <label class="delphi-lbl">Customer</label>
          <div class="delphi-val">
            <input
              type="text"
              v-model="formData.customer"
              class="delphi-ctrl ctrl-text"
              :readonly="isEdit"
            />
          </div>
        </div>

        <!-- Row: PIC -->
        <div class="delphi-row">
          <label class="delphi-lbl">PIC</label>
          <div class="delphi-val">
            <input
              type="text"
              v-model="formData.pic"
              class="delphi-ctrl ctrl-text"
              :readonly="isEdit"
            />
          </div>
        </div>

        <!-- Row: Uraian -->
        <div class="delphi-row">
          <label class="delphi-lbl align-top">Uraian</label>
          <div class="delphi-val">
            <textarea
              v-model="formData.uraian"
              rows="3"
              class="delphi-ctrl ctrl-textarea"
              :readonly="isEdit"
            ></textarea>
          </div>
        </div>

        <!-- Row: Estimasi Jam kerja & Radio Hari Ini / Besok -->
        <div class="delphi-row">
          <label class="delphi-lbl">Estimasi Jam kerja</label>
          <div class="delphi-val d-flex align-center">
            <input
              type="time"
              step="1"
              v-model="formData.jamKerja"
              class="delphi-ctrl ctrl-time"
              :readonly="isEdit"
            />
            <div class="delphi-radio-group ml-4">
              <label class="delphi-radio-item">
                <input
                  type="radio"
                  value="Hari Ini"
                  v-model="formData.hariKerja"
                  :disabled="isEdit"
                  @change="onChangeHariKerja('Hari Ini')"
                />
                <span>Hari Ini</span>
              </label>
              <label class="delphi-radio-item ml-6">
                <input
                  type="radio"
                  value="Besok"
                  v-model="formData.hariKerja"
                  :disabled="isEdit"
                  @change="onChangeHariKerja('Besok')"
                />
                <span>Besok</span>
              </label>
            </div>
          </div>
        </div>

        <!-- Row: Status Pekerjaan -->
        <div class="delphi-row">
          <label class="delphi-lbl">Status Pekerjaan</label>
          <div class="delphi-val">
            <select v-model="formData.status" class="delphi-ctrl ctrl-select" :disabled="isEdit">
              <option value="Tidak">Tidak</option>
              <option value="Urgent">Urgent</option>
              <option value="Top Urgent">Top Urgent</option>
            </select>
          </div>
        </div>

        <!-- Section: Grid Detail Barang / Dokumen yang dibawa -->
        <div class="mt-4">
          <v-card border flat class="d-flex flex-column rounded">
            <!-- Header bar gelap dengan tombol hijau + Tambah Baris persis Image 1 -->
            <div
              class="bg-blue-grey-darken-3 text-white px-3 py-2 font-weight-bold text-caption d-flex align-center justify-space-between"
            >
              <div class="d-flex align-center">
                <IconListDetails :size="15" :stroke-width="1.8" class="mr-2" />
                <span>Barang/Dokumen yang dibawa</span>
              </div>
              <v-btn
                v-if="!isEdit"
                type="button"
                size="x-small"
                color="success"
                variant="flat"
                class="text-none font-weight-bold"
                @click.stop="addRow"
              >
                <template #prepend>
                  <IconPlus :size="13" :stroke-width="2.2" />
                </template>
                Tambah Baris
              </v-btn>
            </div>

            <!-- Table Grid dengan nama kolom persis di Delphi: No., SPK, Keterangan, Penerima, Aksi -->
            <div style="overflow-x: auto; background: #fff">
              <table class="manksi-table">
                <thead>
                  <tr>
                    <th style="width: 50px; text-align: center">No.</th>
                    <th style="width: 220px">SPK</th>
                    <th>Keterangan</th>
                    <th style="width: 220px">Penerima</th>
                    <th style="width: 60px; text-align: center">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(item, index) in formData.items" :key="index">
                    <td class="text-center bg-grey-lighten-4 font-weight-bold">
                      {{ Number(index) + 1 }}
                    </td>

                    <!-- Kolom SPK dengan input highlight kuning dan tombol bantuan F1 (Image 1) -->
                    <td class="bg-yellow-lighten-5">
                      <div class="cell-kode-wrap">
                        <input
                          :ref="(el) => setSpkRef(el, Number(index))"
                          v-model="item.spk"
                          class="cell-input"
                          placeholder="F1 / SPK"
                          :readonly="isEdit"
                          style="
                            text-transform: uppercase;
                            font-weight: 600;
                            color: #1565c0;
                          "
                          @keydown="onSpkKeydown($event, Number(index))"
                          @keydown.enter.prevent="onSpkEnter(item, Number(index))"
                          @blur="onSpkBlur(item, Number(index))"
                        />
                        <button
                          v-if="!isEdit"
                          type="button"
                          class="cell-search-btn"
                          @click="openSpkLookup(Number(index))"
                          title="Cari SPK / Bantuan (F1)"
                        >
                          <IconSearch :size="13" color="#1565c0" />
                        </button>
                      </div>
                    </td>

                    <!-- Kolom Keterangan -->
                    <td class="bg-yellow-lighten-5">
                      <input
                        v-model="item.keterangan"
                        class="cell-input"
                        placeholder="..."
                        :readonly="isEdit"
                      />
                    </td>

                    <!-- Kolom Penerima (tekan Enter otomatis nambah baris baru jika mode create) -->
                    <td class="bg-yellow-lighten-5">
                      <input
                        :ref="(el) => setPenerimaRef(el, Number(index))"
                        v-model="item.penerima"
                        class="cell-input"
                        placeholder="Nama penerima..."
                        :readonly="isEdit"
                        @keydown.enter.prevent="!isEdit && onPenerimaEnter(Number(index))"
                      />
                    </td>

                    <!-- Kolom Hapus -->
                    <td class="text-center">
                      <v-btn
                        v-if="!isEdit"
                        type="button"
                        size="x-small"
                        variant="text"
                        color="error"
                        title="Hapus baris"
                        @click.stop="removeRow(Number(index))"
                      >
                        <IconTrash :size="15" :stroke-width="1.8" />
                      </v-btn>
                      <span v-else class="text-caption text-disabled">—</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </v-card>
        </div>
      </div>
    </div>

    <!-- Modal Bantuan SPK -->
    <SpkSearchModal
      v-model="showSpkModal"
      filter-mode="permintaan-driver"
      @selected="onSpkSelected"
    />

    <!-- Dialog Konfirmasi Cetak Setelah Simpan -->
    <v-dialog v-model="showPrintDialog" max-width="440px" persistent>
      <v-card class="rounded-lg">
        <v-card-title class="text-h6 pa-4 d-flex align-center">
          <IconPrinter :size="22" class="text-primary mr-2" />
          Cetak Surat Jalan
        </v-card-title>
        <v-card-text class="pa-4 pt-0">
          Permintaan Driver <strong>{{ savedNomor }}</strong> berhasil disimpan.
          <div class="mt-2 text-body-2 text-medium-emphasis">
            Apakah Anda ingin mencetak dokumen Surat Jalan ke printer sekarang?
          </div>
        </v-card-text>
        <v-card-actions class="pa-4 pt-0 d-flex justify-end ga-2">
          <v-btn variant="outlined" color="grey-darken-1" @click="skipPrint">
            Tidak, Kembali
          </v-btn>
          <v-btn color="primary" variant="elevated" @click="confirmPrint">
            <template #prepend>
              <IconPrinter :size="16" />
            </template>
            Ya, Cetak
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </BaseForm>
</template>

<style scoped>
:deep(.form-grid-container.custom-layout) {
  overflow-y: auto !important;
}

:deep(.full-column) {
  height: 100%;
  overflow: visible;
}

/* ── Wrapper Form Tema Delphi 7 ── */
.delphi-container {
  background-color: #ffffff;
  padding: 16px 24px 80px 24px;
  font-family: Tahoma, "Segoe UI", Arial, sans-serif;
  color: #000000;
  height: 100%;
  overflow-y: auto;
  overflow-x: auto;
  box-sizing: border-box;
}

.delphi-header-title {
  font-size: 16px;
  font-weight: bold;
  color: #000000;
  letter-spacing: 0.5px;
  margin-bottom: 8px;
}

.delphi-top-line {
  height: 2px;
  background-color: #808080;
  margin-bottom: 16px;
}

.delphi-form-content {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

/* ── Baris Label & Input Delphi ── */
.delphi-row {
  display: flex;
  align-items: center;
}

.delphi-lbl {
  width: 140px;
  font-size: 12px;
  color: #000000;
  flex-shrink: 0;
  user-select: none;
}

.delphi-lbl.align-top {
  align-self: flex-start;
  padding-top: 4px;
}

.delphi-val {
  flex-grow: 1;
}

/* ── Input Controls Delphi ── */
.delphi-ctrl {
  font-size: 12px;
  font-family: inherit;
  color: #000000;
  background-color: #ffffff;
  border: 1px solid #7f9db9;
  padding: 2px 6px;
  height: 24px;
  outline: none;
  box-sizing: border-box;
}

.delphi-ctrl:focus {
  border-color: #0055ea;
}

.delphi-ctrl:disabled {
  background-color: #f0f0f0;
  color: #444444;
  cursor: not-allowed;
  border-color: #abadb3;
}

.ctrl-nomor {
  background-color: #d4d0c8;
  border-color: #abadb3;
  width: 180px;
  cursor: default;
}

.ctrl-date {
  width: 140px;
}

.ctrl-time {
  width: 110px;
}

.ctrl-select {
  width: 180px;
  padding: 1px 4px;
}

.ctrl-text {
  width: 240px;
}

.ctrl-textarea {
  width: 320px;
  height: 60px;
  resize: vertical;
  line-height: 1.3;
}

/* ── Radio Buttons ── */
.delphi-radio-group {
  display: inline-flex;
  align-items: center;
}

.delphi-radio-item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  cursor: pointer;
}

.delphi-radio-item input[type="radio"] {
  cursor: pointer;
}

/* ── Grid MANKSI Table (Header kolom jelas terlihat) ── */
.manksi-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
}

.manksi-table th {
  background: #f1f5f9 !important;
  color: #1e293b !important;
  border-bottom: 2px solid #cbd5e1;
  border-right: 1px solid #e2e8f0;
  padding: 8px 10px;
  text-align: left;
  font-weight: 700;
  font-size: 12px;
  white-space: nowrap;
}

.manksi-table td {
  border-bottom: 1px solid #e2e8f0;
  border-right: 1px solid #e2e8f0;
  padding: 0;
  height: 32px;
  vertical-align: middle;
}

.cell-input {
  width: 100%;
  height: 100%;
  border: none;
  background: transparent;
  padding: 0 8px;
  outline: none;
  font-family: inherit;
  font-size: inherit;
  color: inherit;
}

.cell-input:focus {
  background-color: #fff3e0;
  box-shadow: inset 0 0 0 1px #ff9800;
}

/* Kode/SPK di grid dengan tombol cari F1 (Image 1) */
.cell-kode-wrap {
  display: flex;
  align-items: center;
  height: 100%;
  width: 100%;
}

.cell-kode-wrap .cell-input {
  flex: 1;
}

.cell-search-btn {
  width: 28px;
  min-width: 28px;
  height: 100%;
  background: #e3f2fd;
  border: none;
  border-left: 1px solid #cbd5e1;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background 0.15s;
}

.cell-search-btn:hover {
  background: #bbdefb;
}
</style>
