<script setup lang="ts">
import { ref, computed, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useToast } from "vue-toastification";
import BaseForm from "@/components/BaseForm.vue";
import { useForm } from "@/composables/useForm";
import { IconPrinter, IconSearch } from "@tabler/icons-vue";
import { formatTanggal } from "@/utils/dateFormat";
import * as bastForm from "@/services/spanduk/bastMapSpandukFormService";
import SpandukMapSearchModal from "@/components/lookups/SpandukMapSearchModal.vue";
import SpandukBahanSearchModal from "@/components/lookups/SpandukBahanSearchModal.vue";
import type {
  BahanOption,
  BastMapFormData,
  BastMapPayload,
  KesesuaianRow,
  MapOption,
  SaveResponse,
} from "@/services/spanduk/bastMapSpandukFormService";
import api from "@/services/api";

const route = useRoute();
const router = useRouter();
const toast = useToast();

const isEditMode = computed(() => !!route.params.nomor);

const TIPE_DEFAULT = "";
const MAKS_KETERANGAN = 200;

// ── Model data ──
interface HeaderForm {
  mspk_nomor: string;
  mspk_tanggal: string;
  mspk_nama: string;
  mspk_nama2: string;
  mspk_ukuran: string;
  mspk_kain: string;
  mspk_finishing: string;
  mspk_keterangan: string;
  mspk_kendala: string;
  mspk_jumlah_jadi: number;
  mspk_tipe: string;
  jenis_order: string;
  nomor_lhk_proof: string;
  mspk_cab: string;
  tgl_buat_map: string;
  hari_pembuatan: number;
  batas_hari: number;
  terlambat: number;
}

interface BahanRow {
  kode: string;
  nama: string;
  satuan: string;
}

interface FormState {
  header: HeaderForm;
  checklist: KesesuaianRow[];
  bahan: BahanRow[];
}

const defaultData = (): FormState => ({
  header: {
    mspk_nomor: "",
    mspk_tanggal: "",
    mspk_nama: "",
    mspk_nama2: "",
    mspk_ukuran: "",
    mspk_kain: "",
    mspk_finishing: "",
    mspk_keterangan: "",
    mspk_kendala: "",
    mspk_jumlah_jadi: 0,
    mspk_tipe: TIPE_DEFAULT,
    jenis_order: "",
    nomor_lhk_proof: "",
    mspk_cab: "",
    tgl_buat_map: "",
    hari_pembuatan: 0,
    batas_hari: 3,
    terlambat: 0,
  },
  checklist: [],
  bahan: [],
});

const bangunState = (d: BastMapFormData): FormState => ({
  header: {
    mspk_nomor: d.header.mspk_nomor,
    mspk_tanggal: d.header.mspk_tanggal ?? "",
    mspk_nama: d.header.mspk_nama ?? "",
    mspk_nama2: d.header.mspk_nama2 ?? "",
    mspk_ukuran: d.header.mspk_ukuran ?? "",
    mspk_kain: d.header.mspk_kain ?? "",
    mspk_finishing: d.header.mspk_finishing ?? "",
    mspk_keterangan: d.header.mspk_keterangan ?? "",
    mspk_kendala: d.header.mspk_kendala ?? "",
    mspk_jumlah_jadi: Number(d.header.mspk_jumlah_jadi) || 0,
    mspk_tipe: (d.header.mspk_tipe ?? "").trim() || TIPE_DEFAULT,
    jenis_order: d.header.jenis_order ?? "",
    nomor_lhk_proof: d.header.nomor_lhk_proof ?? "",
    mspk_cab: (d.header as { mspk_cab?: string | null }).mspk_cab ?? "",
    tgl_buat_map: d.header.tgl_buat_map ?? "",
    hari_pembuatan: Number(d.header.hari_pembuatan) || 0,
    batas_hari: Number(d.header.batas_hari) || 3,
    terlambat: Number(d.header.terlambat) || 0,
  },
  checklist: d.checklist,
  bahan: d.bahan.map((b) => ({
    kode: String(b.Kode),
    nama: b.Nama ?? "",
    satuan: b.Satuan ?? "",
  })),
});

const bangunPayload = (data: FormState): BastMapPayload => ({
  nomor: data.header.mspk_nomor,
  jumlahJadi: Number(data.header.mspk_jumlah_jadi) || 0,
  kendala: data.header.mspk_kendala.trim(),
  tipe: data.header.mspk_tipe.trim(),
  checklist: data.checklist.map((c) => ({
    no: c.no,
    status: c.status,
    keterangan: c.keterangan.trim() || "-",
  })),
  bahan: data.bahan
    .filter((b) => b.kode.trim() !== "")
    .map((b) => ({ kode: b.kode.trim() })),
});

// ── State UI ──
// sudahAda ditentukan server: false = BAST baru (simpan = POST), true = ubah (PUT)
const sudahAda = ref(false);
const peringatan = ref("");
const showSelesai = ref(false);
const nomorTerakhir = ref("");
// ── Tab: 0 = BAST, 1 = Gambar ──
const TAB_GAMBAR = 1;
const activeTab = ref(0);

// ── Gambar MAP (pola sama dengan halaman cetak) ──
const gambarUrl = ref("");
const gambarNomor = ref(""); // nomor MAP yang gambarnya sudah dicari
const isLoadingGambar = ref(false);
let tokenGambar = 0;

const gambarBisaDimuat = (url: string) =>
  new Promise<boolean>((resolve) => {
    const img = new Image();
    img.onload = () => resolve(true);
    img.onerror = () => resolve(false);
    img.src = url;
  });

const muatGambar = async () => {
  const nomor = formData.value.header.mspk_nomor;
  if (!nomor) {
    gambarUrl.value = "";
    gambarNomor.value = "";
    return;
  }
  const token = ++tokenGambar;
  isLoadingGambar.value = true;
  const cab = (formData.value.header.mspk_cab ?? "").trim() || "HO-";
  const base = api.defaults.baseURL?.replace(/\/api\/?$/, "") ?? "";
  const enc = encodeURIComponent(nomor);
  const primary = `${base}/images/${cab}/map/${enc}.jpg`;
  const fallback = `/file-gambar/${enc}.jpg`;

  let hasil = "";
  if (await gambarBisaDimuat(primary)) {
    hasil = primary;
  } else if (await gambarBisaDimuat(fallback)) {
    hasil = fallback;
  }
  if (token !== tokenGambar) {
    return; // MAP sudah berganti
  }
  gambarUrl.value = hasil;
  gambarNomor.value = nomor;
  isLoadingGambar.value = false;
};

const bukaGambarPenuh = () => {
  if (gambarUrl.value) {
    window.open(gambarUrl.value, "_blank");
  }
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
  goBack,
} = useForm({
  menuId: "4",
  initialData: defaultData(),
  fetchApi: async (): Promise<FormState> => {
    try {
      const d = await bastForm.getById(String(route.params.nomor));
      sudahAda.value = d.sudahAda;
      peringatan.value = d.peringatan;
      return bangunState(d);
    } catch (e) {
      // Tampilkan alasan dari server (mis. belum punya LHK Proof), bukan pesan generik
      toast.error(bastForm.pesanError(e, "Gagal memuat data BAST MAP."), {
        timeout: 6000,
      });
      goBack();
      throw e;
    }
  },
  submitApi: async (data: FormState): Promise<SaveResponse> => {
    const payload = bangunPayload(data);
    return sudahAda.value
      ? bastForm.update(data.header.mspk_nomor, payload)
      : bastForm.create(payload);
  },
  onSuccess: (response: unknown) => {
    const res = response as SaveResponse;
    nomorTerakhir.value = res.data?.nomor ?? formData.value.header.mspk_nomor;
    sudahAda.value = true;
    showSelesai.value = true;
  },
  onFormReset: () => {
    sudahAda.value = false;
    peringatan.value = "";
    showMapModal.value = false;
    showBahanModal.value = false;
    activeTab.value = 0;
    gambarUrl.value = "";
    gambarNomor.value = "";
    isLoadingGambar.value = false;
  },
});

// Gambar dicari saat tab Gambar dibuka, dan dicari ulang bila MAP berganti
watch(
  () => [activeTab.value, formData.value.header.mspk_nomor] as [number, string],
  ([tab, nomor]) => {
    if (!nomor) {
      gambarUrl.value = "";
      gambarNomor.value = "";
      return;
    }
    if (tab === TAB_GAMBAR && gambarNomor.value !== nomor) {
      void muatGambar();
    }
  },
);

// ── Lookup (modal terpisah; filter divisi/kategori dijaga server) ──
const showMapModal = ref(false);
const showBahanModal = ref(false);
const activeBahanIdx = ref(-1);

const pilihMap = async (m: MapOption) => {
  isLoading.value = true;
  try {
    const d = await bastForm.getById(m.Nomor);
    sudahAda.value = d.sudahAda;
    peringatan.value = d.peringatan;
    formData.value = bangunState(d);
  } catch (e) {
    toast.error(bastForm.pesanError(e, "Gagal memuat data MAP."));
  } finally {
    isLoading.value = false;
  }
};

const KODE_SESUAI_BAHAN = 11;

const openBahanModal = () => {
  showBahanModal.value = true;
};

const pilihBahan = (b: BahanOption) => {
  const kode = String(b.Kode);
  if (formData.value.bahan.some((r) => r.kode === kode)) {
    toast.warning(`Bahan ${kode} sudah ada di daftar.`);
    return;
  }
  formData.value.bahan.push({
    kode,
    nama: b.Nama ?? "",
    satuan: b.Satuan ?? "",
  });
};

const removeBahan = (i: number) => {
  formData.value.bahan.splice(i, 1);
};

// ── Kesesuaian ──
const onKeteranganFocus = (c: KesesuaianRow) => {
  if (c.keterangan === "-") {
    c.keterangan = "";
  }
};
const onKeteranganBlur = (c: KesesuaianRow) => {
  if (c.keterangan.trim() === "") {
    c.keterangan = "-";
  }
};

const fmtDateTime = (val: string | null) => {
  if (!val) return "";
  const d = new Date(val);
  if (isNaN(d.getTime())) return val;
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getDate())}-${p(d.getMonth() + 1)}-${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
};

// ── Validasi ──
const validateSave = () => {
  const { mspk_nomor, mspk_jumlah_jadi } = formData.value.header;
  if (!mspk_nomor) {
    toast.warning("Pilih MAP terlebih dahulu.");
    return;
  }
  if (
    !Number.isFinite(Number(mspk_jumlah_jadi)) ||
    Number(mspk_jumlah_jadi) <= 0
  ) {
    toast.warning("Jumlah harus lebih dari 0.");
    return;
  }
  if (!sudahAda.value && peringatan.value) {
    toast.error(peringatan.value);
    return;
  }

  const sudah = new Set<string>();
  for (const [i, b] of formData.value.bahan.entries()) {
    const kode = b.kode.trim();
    if (!kode) continue;
    if (sudah.has(kode)) {
      toast.warning(`Baris bahan ${i + 1}: bahan ${kode} terpilih ganda.`);
      return;
    }
    sudah.add(kode);
  }

  for (const c of formData.value.checklist) {
    if (c.no === KODE_SESUAI_BAHAN) continue;
    if (c.keterangan.length > MAKS_KETERANGAN) {
      toast.warning(
        `Keterangan "${c.kesesuaian}" maksimal ${MAKS_KETERANGAN} karakter.`,
      );
      return;
    }
  }

  showSaveDialog.value = true;
};

// ── Setelah simpan ──
const resetBaru = () => {
  showSelesai.value = false;
  if (isEditMode.value) {
    router.replace({ name: "SpandukBastMapCreate" });
    return;
  }
  formData.value = defaultData();
  sudahAda.value = false;
  peringatan.value = "";
};

const tutupSetelahSimpan = () => {
  showSelesai.value = false;
  goBack();
};

const cetakSekarang = () => {
  window.open(
    `/spanduk/bast-map/print/${encodeURIComponent(nomorTerakhir.value)}`,
    "_blank",
  );
};
</script>

<template>
  <BaseForm
    :title="sudahAda ? 'Ubah BAST MAP' : 'Buat BAST MAP'"
    menu-id="4"
    :icon="IconPrinter"
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
    <!-- ── Kolom kiri: header MAP ── -->
    <template #left-column>
      <div class="bast-card">
        <div class="f-row">
          <label class="f-lbl">No MAP</label>
          <div class="inp-grp" style="flex: 1">
            <input
              :value="formData.header.mspk_nomor"
              readonly
              class="f-inp f-ro"
              style="font-weight: 600; color: #1565c0"
              placeholder="Pilih MAP..."
            />
            <button
              v-if="!isEditMode"
              type="button"
              class="btn-lkp"
              @click="showMapModal = true"
            >
              <IconSearch :size="12" color="#1565c0" />
            </button>
          </div>
        </div>

        <div class="f-row">
          <label class="f-lbl">Tanggal MAP</label>
          <input
            :value="
              formData.header.mspk_tanggal
                ? formatTanggal(formData.header.mspk_tanggal)
                : ''
            "
            readonly
            class="f-inp f-ro"
            style="max-width: 120px"
          />
        </div>

        <div class="f-row">
          <label class="f-lbl">LHK Proof</label>
          <input
            :value="formData.header.nomor_lhk_proof || '-'"
            readonly
            class="f-inp f-ro"
            style="font-weight: 600; color: #1565c0"
          />
        </div>
        <div class="f-row">
          <label class="f-lbl">Jenis Order</label>
          <input
            :value="formData.header.jenis_order"
            readonly
            class="f-inp f-ro"
          />
        </div>

        <div class="f-row">
          <label class="f-lbl">Nama Pekerjaan</label>
          <input
            :value="formData.header.mspk_nama"
            readonly
            class="f-inp f-ro"
          />
        </div>
        <div class="f-row">
          <label class="f-lbl">Nama Ext</label>
          <input
            :value="formData.header.mspk_nama2"
            readonly
            class="f-inp f-ro"
          />
        </div>
        <div class="f-row">
          <label class="f-lbl">Ukuran</label>
          <input
            :value="formData.header.mspk_ukuran"
            readonly
            class="f-inp f-ro"
          />
        </div>
        <div class="f-row">
          <label class="f-lbl">Kain</label>
          <input
            :value="formData.header.mspk_kain"
            readonly
            class="f-inp f-ro"
          />
        </div>
        <div class="f-row">
          <label class="f-lbl">Finishing</label>
          <input
            :value="formData.header.mspk_finishing"
            readonly
            class="f-inp f-ro"
          />
        </div>

        <div class="f-divider" />

        <div class="f-row">
          <label class="f-lbl">Keterangan</label>
          <input
            v-model="formData.header.mspk_kendala"
            class="f-inp"
            placeholder="Input keterangan..."
          />
        </div>
        <div class="f-row">
          <label class="f-lbl">Jumlah</label>
          <input
            type="number"
            min="0"
            v-model.number="formData.header.mspk_jumlah_jadi"
            class="f-inp f-yellow"
            style="max-width: 100px; text-align: right; font-weight: 600"
            v-select-on-focus
          />
        </div>
        <div class="f-row">
          <label class="f-lbl">Tipe</label>
          <input
            v-model="formData.header.mspk_tipe"
            readonly
            class="f-inp f-ro"
            style="max-width: 140px"
          />
        </div>
      </div>
    </template>

    <!-- ── Kolom tengah: Bahan + Kesesuaian ── -->
    <template #center-column>
      <div
        class="bast-card"
        style="display: flex; flex-direction: column; height: 100%"
      >
        <div class="tab-nav">
          <button
            v-for="(t, i) in ['BAST', 'Gambar']"
            :key="i"
            type="button"
            class="tab-btn"
            :class="{ active: activeTab === i }"
            @click="activeTab = i"
          >
            {{ t }}
          </button>
        </div>

        <!-- Tab BAST -->
        <div
          v-show="activeTab === 0"
          style="flex: 1; display: flex; flex-direction: column; min-height: 0"
        >
          <div v-if="!sudahAda && peringatan" class="warn-box">
            {{ peringatan }}
          </div>

          <div v-if="formData.header.terlambat === 1" class="warn-box late-box">
            <template v-if="sudahAda">
              BAST MAP ini dibuat {{ formData.header.hari_pembuatan }} hari
              kerja setelah MAP dibuat Marketing ({{
                formatTanggal(formData.header.tgl_buat_map)
              }}).
            </template>
            <template v-else>
              Sudah {{ formData.header.hari_pembuatan }} hari kerja sejak MAP
              dibuat Marketing ({{
                formatTanggal(formData.header.tgl_buat_map)
              }}).
            </template>
            Batas pembuatan BAST MAP adalah
            {{ formData.header.batas_hari }} hari kerja. Segera selesaikan.
          </div>

          <div class="sec-title">Kesesuaian :</div>
          <div style="overflow: auto; flex: 1; min-height: 0">
            <table class="bt" style="table-layout: fixed; min-width: 760px">
              <thead>
                <tr>
                  <th style="width: 28px">No</th>
                  <th style="text-align: left">Kesesuaian</th>
                  <th class="th-yellow" style="width: 48px">Y/N</th>
                  <th class="th-yellow" style="width: 320px; text-align: left">
                    Keterangan
                  </th>
                  <th style="width: 55px">Created</th>
                  <th style="width: 90px">Date Create</th>
                  <th style="width: 55px">Modified</th>
                  <th style="width: 90px">Date Modify</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(c, i) in formData.checklist" :key="c.no">
                  <td class="tc">{{ i + 1 }}</td>
                  <td>{{ c.kesesuaian }}</td>
                  <td class="tc p0">
                    <select
                      v-model="c.status"
                      class="cell-inp tc"
                      :style="
                        c.status === 'Y'
                          ? 'background:#1565c0;color:white;font-weight:700'
                          : ''
                      "
                    >
                      <option value="Y">Y</option>
                      <option value="N">N</option>
                    </select>
                  </td>
                  <td class="p0">
                    <div v-if="c.no === KODE_SESUAI_BAHAN" class="bhn-cell">
                      <span
                        v-for="(b, bi) in formData.bahan"
                        :key="b.kode"
                        class="bhn-chip"
                        :title="`${b.nama} (${b.satuan})`"
                      >
                        {{ b.nama }}
                        <button type="button" @click="removeBahan(bi)">
                          ✕
                        </button>
                      </span>
                      <button
                        type="button"
                        class="bhn-add"
                        @click="openBahanModal"
                      >
                        <IconSearch :size="11" /> Pilih Bahan
                      </button>
                    </div>
                    <input
                      v-else
                      v-model="c.keterangan"
                      class="cell-inp"
                      :maxlength="MAKS_KETERANGAN"
                      @focus="onKeteranganFocus(c)"
                      @blur="onKeteranganBlur(c)"
                    />
                  </td>
                  <td class="tc muted">{{ c.user_create || "" }}</td>
                  <td class="muted">{{ fmtDateTime(c.date_create) }}</td>
                  <td class="tc muted">{{ c.user_modify || "" }}</td>
                  <td class="muted">{{ fmtDateTime(c.date_modify) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Tab Gambar -->
        <div
          v-show="activeTab === 1"
          style="flex: 1; min-height: 0; display: flex; flex-direction: column"
        >
          <div class="gbr-box">
            <span v-if="!formData.header.mspk_nomor" class="gbr-info">
              Pilih MAP terlebih dahulu.
            </span>
            <span v-else-if="isLoadingGambar" class="gbr-info">
              Memuat gambar...
            </span>
            <img
              v-else-if="gambarUrl"
              :src="gambarUrl"
              class="gbr-img"
              title="Klik untuk membuka ukuran penuh"
              @click="bukaGambarPenuh"
            />
            <span v-else class="gbr-info">
              (Tidak ada gambar desain untuk MAP ini)
            </span>
          </div>
        </div>
      </div>
    </template>

    <!-- ── Kolom kanan: Keterangan MAP ── -->
    <template #right-column>
      <div
        class="bast-card"
        style="display: flex; flex-direction: column; height: 100%"
      >
        <div class="sec-title">Catatan MAP</div>
        <textarea
          :value="formData.header.mspk_keterangan"
          readonly
          class="ket-textarea"
          style="flex: 1"
        ></textarea>
      </div>
    </template>
  </BaseForm>

  <SpandukMapSearchModal v-model="showMapModal" @selected="pilihMap" />
  <SpandukBahanSearchModal v-model="showBahanModal" @selected="pilihBahan" />

  <!-- Setelah simpan -->
  <v-dialog v-model="showSelesai" max-width="400" persistent>
    <v-card class="rounded-lg">
      <v-card-title class="bg-primary text-white d-flex align-center pa-3">
        <IconPrinter class="mr-2" :size="20" />
        <span>Simpan Berhasil</span>
      </v-card-title>
      <v-card-text class="pa-4 text-center">
        <div class="text-body-1 mb-2">
          BAST MAP <b>{{ nomorTerakhir }}</b> telah disimpan.
        </div>
        <div class="text-body-2 text-grey-darken-1">
          Mau input BAST MAP baru?
        </div>
      </v-card-text>
      <v-card-actions class="pa-3 border-t">
        <v-btn variant="text" @click="tutupSetelahSimpan">Tidak, Tutup</v-btn>
        <v-btn variant="text" color="primary" @click="cetakSekarang">
          Cetak
        </v-btn>
        <v-spacer />
        <v-btn color="primary" variant="elevated" @click="resetBaru">
          Ya, Input Baru
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style scoped>
:deep(.form-grid-container.three-column) {
  grid-template-columns: 360px minmax(0, 1fr) 200px !important;
}

.bast-card {
  background: white;
  border: 1px solid #e0e0e0;
  border-top: 3px solid #1565c0;
  border-radius: 6px;
  padding: 10px 12px;
  height: 100%;
  box-sizing: border-box;
  font-family: "Segoe UI", system-ui, sans-serif;
  font-size: 11px;
}

.f-row {
  display: flex;
  align-items: center;
  gap: 5px;
  margin-bottom: 4px;
}
.f-lbl {
  width: 95px;
  flex-shrink: 0;
  font-weight: 600;
  color: #555;
  white-space: nowrap;
}
.f-divider {
  height: 1px;
  background: #eeeeee;
  margin: 6px 0;
}
.f-inp {
  height: 26px;
  border: 1px solid #bdbdbd;
  border-radius: 3px;
  padding: 0 5px;
  font-size: 11px;
  outline: none;
  background: white;
  color: #212121;
  flex: 1;
  box-sizing: border-box;
  font-family: inherit;
}
.f-inp:focus {
  border-color: #1565c0;
}
.f-ro {
  background: #f0f0f0 !important;
  color: #616161 !important;
  cursor: default;
}
.f-yellow {
  background: #fffde7 !important;
  border-color: #f9a825 !important;
}

.inp-grp {
  display: flex;
  border: 1px solid #bdbdbd;
  border-radius: 3px;
  overflow: hidden;
  height: 26px;
  background: white;
}
.inp-grp .f-inp {
  border: none;
  height: 24px;
  border-radius: 0;
  flex: 1;
}
.btn-lkp {
  width: 26px;
  background: #f5f5f5;
  border: none;
  border-left: 1px solid #bdbdbd;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
}
.btn-lkp:hover {
  background: #e0e0e0;
}

.sec-title {
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: #1565c0;
  margin-bottom: 5px;
}

.bt {
  width: 100%;
  min-width: 640px;
  border-collapse: collapse;
  font-size: 10px;
  table-layout: fixed;
}
.bt thead tr {
  background: #1565c0;
}
.bt th {
  padding: 4px 6px;
  font-size: 10px;
  font-weight: 700;
  color: white;
  text-align: center;
  border: 1px solid #0d47a1;
  white-space: nowrap;
}
.th-yellow {
  background: #f9a825 !important;
  color: #4a2e00 !important;
  border-color: #e65100 !important;
}
.bt td {
  border: 1px solid #eeeeee;
  padding: 2px 4px;
  vertical-align: middle;
}
.bt tbody tr:nth-of-type(even) td {
  background: #fafafa;
}
.bt tbody tr:hover td {
  background: #e3f2fd !important;
}
.cell-ro {
  background: #f5f5f5;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.cell-inp {
  width: 100%;
  height: 22px;
  border: none;
  background: transparent;
  outline: none;
  font-size: 10px;
  padding: 0 4px;
  font-family: inherit;
  color: #212121;
}
.cell-inp:focus {
  background: #fffde7;
}
.tc {
  text-align: center;
}
.muted {
  color: #9e9e9e;
  font-size: 9px;
}
.p0 {
  padding: 0 !important;
}

.del-btn {
  width: 22px;
  height: 22px;
  background: #ffebee;
  border: none;
  border-radius: 3px;
  color: #c62828;
  cursor: pointer;
  font-size: 11px;
  font-weight: 700;
}
.del-btn:hover {
  background: #ffcdd2;
}
.add-row-btn {
  margin-top: 6px;
  padding: 4px 12px;
  background: transparent;
  border: 1px dashed #1565c0;
  border-radius: 3px;
  color: #1565c0;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
}
.add-row-btn:hover {
  background: #e3f2fd;
}

.warn-box {
  margin-bottom: 8px;
  padding: 6px 10px;
  background: #fff3e0;
  border: 1px solid #ffb74d;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 600;
  color: #e65100;
  flex-shrink: 0;
}

.ket-textarea {
  width: 100%;
  border: 1px solid #bdbdbd;
  border-radius: 3px;
  padding: 6px 8px;
  font-size: 11px;
  font-family: inherit;
  outline: none;
  resize: none;
  box-sizing: border-box;
  color: #616161;
  background: #f8f8f8;
  line-height: 1.5;
}
.bhn-cell {
  display: flex;
  flex-wrap: wrap;
  gap: 3px;
  padding: 2px 4px;
  align-items: center;
}
.bhn-chip {
  background: #e3f2fd;
  border: 1px solid #90caf9;
  border-radius: 10px;
  padding: 0 6px;
  font-size: 10px;
  display: inline-flex;
  gap: 4px;
  align-items: center;
}
.bhn-chip button {
  border: none;
  background: transparent;
  color: #c62828;
  cursor: pointer;
  font-size: 9px;
}
.bhn-add {
  border: 1px dashed #1565c0;
  background: transparent;
  color: #1565c0;
  border-radius: 3px;
  font-size: 10px;
  padding: 0 6px;
  cursor: pointer;
}
.tab-nav {
  display: flex;
  gap: 2px;
  border-bottom: 2px solid #e0e0e0;
  margin-bottom: 8px;
  flex-shrink: 0;
}
.tab-btn {
  padding: 5px 14px;
  border: 1px solid #d0d0d0;
  border-bottom: none;
  border-radius: 4px 4px 0 0;
  background: #f5f5f5;
  font-size: 11px;
  font-weight: 600;
  color: #555;
  cursor: pointer;
}
.tab-btn:hover {
  background: #e3f2fd;
  color: #1565c0;
}
.tab-btn.active {
  background: white;
  color: #1565c0;
  border-color: #bdbdbd;
  border-bottom: 2px solid white;
  margin-bottom: -2px;
}
.gbr-box {
  flex: 1;
  min-height: 240px;
  border: 1px solid #bdbdbd;
  border-radius: 3px;
  background: #fafafa;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: auto;
}
.gbr-img {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  cursor: zoom-in;
}
.gbr-info {
  font-size: 11px;
  color: #757575;
  font-style: italic;
}
.late-box {
  background: #ffebee;
  border-color: #ef9a9a;
  color: #b71c1c;
}
</style>
