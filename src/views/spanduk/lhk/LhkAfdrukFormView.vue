<script setup lang="ts">
import { ref, computed, onMounted, nextTick } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useToast } from "vue-toastification";
import BaseForm from "@/components/BaseForm.vue";
import SpkSearchModal from "@/components/lookups/SpkSearchModal.vue";
import { useForm } from "@/composables/useForm";
import { useAuthStore } from "@/stores/authStore";
import { IconBulb, IconSearch } from "@tabler/icons-vue";
import * as lhkForm from "@/services/spanduk/lhk/lhkAfdrukFormService";
import type {
  LhkAfdrukPayload,
  PabrikOption,
  SaveResponse,
  UkuranOption,
} from "@/services/spanduk/lhk/lhkAfdrukFormService";

const route = useRoute();
const router = useRouter();
const toast = useToast();
const authStore = useAuthStore();

const isEditMode = computed(() => !!route.params.nomor);

const BAGIAN_SUPERADMIN = ["EDP", "DIR", "AUDIT"];
const isSuperadmin = computed(() =>
  BAGIAN_SUPERADMIN.includes(
    (authStore.user?.bagian ?? "").trim().toUpperCase(),
  ),
);

const formatDateLocal = (d: Date) => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};
const todayLocal = formatDateLocal(new Date());

// ── Model data ──
interface PlangkanItem {
  ukuran: number;
  qty: number;
}

interface FormRow {
  spk: string;
  nama: string;
  jumlahOrder: number;
  panjang: number;
  lebar: number;
  ulano: number;
  screen: number;
  lem: number;
  katalis: number;
  plangkan: PlangkanItem[]; // 15 ukuran dari master, J Plangkan = jumlah qty
}

interface FormState {
  header: {
    nomor: string;
    tanggal: string;
    kodePabrik: string;
    namaPabrik: string;
  };
  items: FormRow[];
}

const KOLOM_BAHAN = [
  { key: "ulano", label: "Ulano" },
  { key: "screen", label: "Screen" },
  { key: "lem", label: "Lem" },
  { key: "katalis", label: "Katalis" },
] as const;

const num = (v: unknown) => Number(v) || 0;

// Master ukuran plangkan (15 ukuran), dimuat sekali saat mount
const ukuranList = ref<UkuranOption[]>([]);

const plangkanKosong = (): PlangkanItem[] =>
  ukuranList.value.map((u) => ({ ukuran: u.Ukuran, qty: 0 }));

const barisKosong = (): FormRow => ({
  spk: "",
  nama: "",
  jumlahOrder: 0,
  panjang: 0,
  lebar: 0,
  ulano: 0,
  screen: 0,
  lem: 0,
  katalis: 0,
  plangkan: plangkanKosong(),
});

const defaultData = (): FormState => ({
  header: { nomor: "", tanggal: todayLocal, kodePabrik: "", namaPabrik: "" },
  items: [barisKosong()],
});

// J Plangkan = jumlah Qty semua ukuran (dihitung juga oleh server)
const jumlahPlangkan = (row: FormRow) =>
  row.plangkan.reduce((a, p) => a + num(p.qty), 0);

// ── State UI ──
const showSpkModal = ref(false);
const activeIdx = ref(-1);
const fokusIdx = ref(0); // baris yang detail plangkannya tampil di panel bawah
const showSelesai = ref(false);
const nomorTerakhir = ref("");
const pabrikOpts = ref<PabrikOption[]>([]);

const bangunPayload = (data: FormState): LhkAfdrukPayload => ({
  Tanggal: data.header.tanggal,
  Kode_Pabrik: data.header.kodePabrik,
  // Delphi: baris tanpa nomor SPK tidak disimpan
  Detail: data.items
    .filter((r) => r.spk.trim() !== "")
    .map((r) => ({
      Nomor_SPK: r.spk.trim(),
      Ulano: num(r.ulano),
      Screen: num(r.screen),
      Lem: num(r.lem),
      Katalis: num(r.katalis),
      Plangkan: r.plangkan
        .filter((p) => num(p.qty) > 0)
        .map((p) => ({ Ukuran: p.ukuran, Qty: num(p.qty) })),
    })),
});

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
    const d = await lhkForm.getById(String(route.params.nomor));
    const items: FormRow[] = d.Detail.map((r) => ({
      spk: r.Nomor_SPK,
      nama: r.Nama_SPK ?? "",
      jumlahOrder: num(r.Jumlah_Order),
      panjang: num(r.Panjang),
      lebar: num(r.Lebar),
      ulano: num(r.Ulano),
      screen: num(r.Screen),
      lem: num(r.Lem),
      katalis: num(r.Katalis),
      plangkan: r.Plangkan.map((p) => ({
        ukuran: num(p.Ukuran),
        qty: num(p.Qty),
      })),
    }));
    return {
      header: {
        nomor: d.Nomor,
        tanggal: d.Tanggal,
        kodePabrik: d.Kode_Pabrik ?? "",
        namaPabrik: d.Nama_Pabrik ?? "",
      },
      items: items.length > 0 ? items : [barisKosong()],
    };
  },
  submitApi: async (data: FormState): Promise<SaveResponse> => {
    const payload = bangunPayload(data);
    return isEditMode.value
      ? lhkForm.update(String(route.params.nomor), payload)
      : lhkForm.create(payload);
  },
  onSuccess: (response: unknown) => {
    const res = response as SaveResponse;
    const nomor = res.data?.data?.Nomor ?? "";
    nomorTerakhir.value = nomor;
    formData.value.header.nomor = nomor;
    showSelesai.value = true;
  },
  onFormReset: () => {
    lengkapiPlangkan();
    fokusIdx.value = 0;
    isiLokasiDefault();
  },
});

// Baris yang dibuat sebelum master ukuran selesai dimuat belum punya daftar ukuran
const lengkapiPlangkan = () => {
  for (const r of formData.value.items) {
    if (r.plangkan.length === 0) {
      r.plangkan = plangkanKosong();
    }
  }
};

const rowAktif = computed<FormRow | undefined>(
  () => formData.value.items[fokusIdx.value],
);

// ── Lokasi (pabrik) ──
const opsiPabrik = computed<PabrikOption[]>(() => {
  const h = formData.value.header;
  const ada = pabrikOpts.value.some((p) => p.Kode === h.kodePabrik);
  return h.kodePabrik && !ada
    ? [{ Kode: h.kodePabrik, Nama: h.namaPabrik }, ...pabrikOpts.value]
    : pabrikOpts.value;
});

const onPabrikChange = () => {
  const h = formData.value.header;
  h.namaPabrik =
    pabrikOpts.value.find((p) => p.Kode === h.kodePabrik)?.Nama ?? "";
};

// Lokasi default = cabang user (kode pabrik sama dengan kode cabang).
// Hanya di mode tambah, hanya bila Lokasi masih kosong dan kodenya ada di daftar.
const isiLokasiDefault = () => {
  if (isEditMode.value) {
    return;
  }
  const h = formData.value.header;
  if (h.kodePabrik) {
    return;
  }
  const cabang = (authStore.user?.cabang ?? "").trim().toUpperCase();
  const p = pabrikOpts.value.find((x) => x.Kode.toUpperCase() === cabang);
  if (!p) {
    return;
  }
  h.kodePabrik = p.Kode;
  h.namaPabrik = p.Nama;
};

onMounted(async () => {
  try {
    const [pabrik, ukuran] = await Promise.all([
      lhkForm.getLookupPabrik(),
      lhkForm.getLookupUkuran(),
    ]);
    pabrikOpts.value = pabrik;
    ukuranList.value = ukuran;
    lengkapiPlangkan();
    isiLokasiDefault();
  } catch (e) {
    toast.error(lhkForm.pesanError(e, "Gagal memuat data lookup."));
  }
});

// ── Grid ──
const addRow = () => {
  formData.value.items.push(barisKosong());
};

const removeRow = (idx: number) => {
  formData.value.items.splice(idx, 1);
  if (formData.value.items.length === 0) {
    formData.value.items.push(barisKosong());
  }
  fokusIdx.value = Math.min(fokusIdx.value, formData.value.items.length - 1);
};

const openLookupSpk = (idx: number) => {
  activeIdx.value = idx;
  showSpkModal.value = true;
};

// Isi satu baris dari nomor SPK/MAP. Data diambil server (sekaligus validasi
// divisi dan cabang). Mengembalikan true kalau baris berhasil terisi.
const isiBarisDariSpk = async (
  idx: number,
  nomorInput: string,
): Promise<boolean> => {
  const nomor = nomorInput.trim();
  if (idx < 0 || !nomor) {
    return false;
  }

  const dup = formData.value.items.findIndex(
    (r, i) => i !== idx && r.spk.toUpperCase() === nomor.toUpperCase(),
  );
  if (dup >= 0) {
    toast.warning(`SPK/MAP sudah ada di baris ${dup + 1}`);
    return false;
  }

  try {
    const info = await lhkForm.getInfoSpk(nomor);
    const row = formData.value.items[idx];
    row.spk = info.Nomor_SPK;
    row.nama = info.Nama_SPK ?? "";
    row.jumlahOrder = num(info.Jumlah_Order);
    row.panjang = num(info.Panjang);
    row.lebar = num(info.Lebar);
    row.plangkan = plangkanKosong(); // SPK baru: semua qty mulai dari 0
    fokusIdx.value = idx;
    return true;
  } catch (e) {
    toast.error(lhkForm.pesanError(e, "Gagal memuat data SPK/MAP."));
    return false;
  }
};

// Urutan Enter: SPK → Qty ukuran (atas ke bawah) → Ulano → Screen → Lem →
// Katalis → SPK baris berikutnya (baris baru ditambah bila perlu)
const KOLOM_EDIT = ["ulano", "screen", "lem", "katalis"] as const;
type KolomEdit = (typeof KOLOM_EDIT)[number];

const fieldRefs = ref<Record<string, HTMLInputElement>>({});

const simpanRef = (el: unknown, kunci: string) => {
  if (el instanceof HTMLInputElement) {
    fieldRefs.value[kunci] = el;
  }
};

const fokusKunci = async (kunci: string) => {
  await nextTick();
  const el = fieldRefs.value[kunci];
  if (el) {
    el.focus();
    el.select();
  }
};

const onEnterQty = async (i: number) => {
  const total = rowAktif.value?.plangkan.length ?? 0;
  if (i < total - 1) {
    await fokusKunci(`q_${i + 1}`);
  } else {
    await fokusKunci(`${fokusIdx.value}_${KOLOM_EDIT[0]}`);
  }
};

const onEnter = async (idx: number, col: KolomEdit) => {
  const ci = KOLOM_EDIT.indexOf(col);
  if (ci < KOLOM_EDIT.length - 1) {
    await fokusKunci(`${idx}_${KOLOM_EDIT[ci + 1]}`);
    return;
  }
  if (idx + 1 >= formData.value.items.length) {
    addRow();
  }
  fokusIdx.value = idx + 1;
  await fokusKunci(`${idx + 1}_spk`);
};

// Dari modal pencarian (tombol atau F1)
const onSpkSelected = async (v: { Nomor?: string }) => {
  const idx = activeIdx.value;
  if (await isiBarisDariSpk(idx, String(v?.Nomor ?? ""))) {
    await fokusKunci("q_0");
  }
};

// Ketik nomor lalu Enter
const onEnterSpk = async (e: KeyboardEvent, idx: number) => {
  const el = e.target as HTMLInputElement;
  if (!el.value.trim()) {
    return;
  }
  if (await isiBarisDariSpk(idx, el.value)) {
    await fokusKunci("q_0");
  } else {
    el.value = formData.value.items[idx].spk; // balikkan ke nilai terakhir yang valid
    el.select();
  }
};

// Keluar dari field tanpa Enter: buang ketikan yang belum divalidasi
const onBlurSpk = (e: FocusEvent, idx: number) => {
  (e.target as HTMLInputElement).value = formData.value.items[idx].spk;
};

// ── Validasi sebelum konfirmasi simpan ──
const validateSave = () => {
  const { tanggal, kodePabrik } = formData.value.header;
  if (!tanggal) {
    toast.warning("Tanggal tidak boleh kosong.");
    return;
  }
  if (!kodePabrik) {
    toast.warning("Lokasi belum dipilih.");
    return;
  }

  const terisi = formData.value.items
    .map((r, i) => ({ r, no: i + 1 }))
    .filter(({ r }) => r.spk.trim() !== "");
  if (terisi.length === 0) {
    toast.warning("Minimal satu baris SPK/MAP harus diisi.");
    return;
  }

  const sudah = new Map<string, number>();
  for (const { r, no } of terisi) {
    const kunci = r.spk.trim().toUpperCase();
    const pertama = sudah.get(kunci);
    if (pertama !== undefined) {
      toast.warning(`Baris ${no}: SPK/MAP sama dengan baris ${pertama}.`);
      return;
    }
    sudah.set(kunci, no);

    for (const p of r.plangkan) {
      const q = num(p.qty);
      if (!Number.isInteger(q) || q < 0) {
        toast.warning(
          `Baris ${no}: Qty ukuran ${p.ukuran} harus bilangan bulat tidak negatif.`,
        );
        return;
      }
    }
    if ([r.ulano, r.screen, r.lem, r.katalis].some((v) => num(v) < 0)) {
      toast.warning(`Baris ${no}: angka tidak boleh negatif.`);
      return;
    }
  }

  showSaveDialog.value = true;
};

// ── Setelah simpan: tutup, atau input baru (pengganti Save & New) ──
const resetBaru = () => {
  showSelesai.value = false;
  if (isEditMode.value) {
    router.replace({ name: "SpandukLhkAfdrukCreate" });
    return;
  }
  formData.value = defaultData();
  lengkapiPlangkan();
  fokusIdx.value = 0;
  isiLokasiDefault();
};

const tutupSetelahSimpan = () => {
  showSelesai.value = false;
  goBack();
};
</script>

<template>
  <BaseForm
    :title="isEditMode ? 'Ubah LHK Afdruk' : 'Tambah LHK Afdruk'"
    menu-id="4"
    :icon="IconBulb"
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
      <div class="lhk-left">
        <div class="fr">
          <label class="lbl">Nomor</label>
          <input
            :value="formData.header.nomor"
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
            v-model="formData.header.tanggal"
            class="idate"
            style="width: 150px"
          />
        </div>

        <div class="sep" />

        <div class="fr">
          <label class="lbl">Lokasi</label>
          <select
            v-model="formData.header.kodePabrik"
            class="inp"
            style="width: 90px"
            :disabled="!isSuperadmin"
            @change="onPabrikChange"
          >
            <option value="" disabled>Pilih...</option>
            <option v-for="p in opsiPabrik" :key="p.Kode" :value="p.Kode">
              {{ p.Kode }}
            </option>
          </select>
          <input
            :value="formData.header.namaPabrik"
            readonly
            class="inp ro ml-1"
            style="flex: 1"
          />
        </div>
      </div>
    </template>

    <!-- ══ KOLOM KANAN ══ -->
    <template #right-column>
      <div class="lhk-right">
        <div class="tbl-header">
          <span class="tbl-title">Rincian SPK / MAP</span>
          <button type="button" class="btn-add" @click="addRow">
            + Tambah Baris
          </button>
        </div>
        <div class="tbl-wrap" style="flex: 1; min-height: 160px">
          <table class="gt" style="min-width: 1060px">
            <thead>
              <tr>
                <th style="width: 32px" class="tc">No</th>
                <th style="width: 160px">Nomor SPK</th>
                <th style="width: 220px">Nama Order</th>
                <th style="width: 80px" class="tr">Jml Order</th>
                <th style="width: 70px" class="tr">Panjang</th>
                <th style="width: 70px" class="tr">Lebar</th>
                <th style="width: 85px" class="tr">J Plangkan</th>
                <th
                  v-for="k in KOLOM_BAHAN"
                  :key="k.key"
                  style="width: 75px"
                  class="tr bg-yellow"
                >
                  {{ k.label }}
                </th>
                <th style="width: 32px" class="tc"></th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="(row, idx) in formData.items"
                :key="idx"
                :class="{ 'row-aktif': idx === fokusIdx }"
                @focusin="fokusIdx = idx"
              >
                <td class="tc gt-lbl">{{ idx + 1 }}</td>
                <td class="p0">
                  <div class="cell-grp">
                    <input
                      :value="row.spk"
                      class="ci"
                      placeholder="Ketik nomor + Enter / F1 cari"
                      autocomplete="off"
                      :ref="(el) => simpanRef(el, `${idx}_spk`)"
                      @keydown.enter.prevent="onEnterSpk($event, idx)"
                      @keydown.f1.prevent="openLookupSpk(idx)"
                      @blur="onBlurSpk($event, idx)"
                    />
                    <button
                      type="button"
                      class="ci-btn"
                      title="Cari SPK/MAP"
                      @click="openLookupSpk(idx)"
                    >
                      <IconSearch :size="11" />
                    </button>
                  </div>
                </td>
                <td class="p0">
                  <input
                    :value="row.nama"
                    class="ci ro"
                    readonly
                    :title="row.nama"
                  />
                </td>
                <td class="p0">
                  <input :value="row.jumlahOrder" class="ci tr ro" readonly />
                </td>
                <td class="p0">
                  <input :value="row.panjang" class="ci tr ro" readonly />
                </td>
                <td class="p0">
                  <input :value="row.lebar" class="ci tr ro" readonly />
                </td>
                <td class="p0">
                  <input
                    :value="jumlahPlangkan(row)"
                    class="ci tr ro fw"
                    readonly
                    title="Jumlah Qty semua ukuran (isi di Detail Plangkan)"
                  />
                </td>
                <td v-for="k in KOLOM_BAHAN" :key="k.key" class="p0">
                  <input
                    v-model.number="row[k.key]"
                    type="number"
                    min="0"
                    step="0.01"
                    class="ci tr bg-yellow-light"
                    :ref="(el) => simpanRef(el, `${idx}_${k.key}`)"
                    @keydown.enter.prevent="onEnter(idx, k.key)"
                    v-select-on-focus
                  />
                </td>
                <td class="tc">
                  <button type="button" class="btn-del" @click="removeRow(idx)">
                    ✕
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Detail Plangkan untuk baris yang sedang dipilih -->
        <div class="plg">
          <div class="tbl-header tbl-header-sub">
            <span class="tbl-title">
              Detail Plangkan<template v-if="rowAktif?.spk">
                — {{ rowAktif.spk }}</template
              >
            </span>
          </div>
          <div v-if="rowAktif?.spk" class="tbl-wrap plg-wrap">
            <table class="gt plg-tbl">
              <thead>
                <tr>
                  <th style="width: 130px" class="tr">Ukuran</th>
                  <th style="width: 130px" class="tr bg-yellow">
                    Qty Plangkan
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(p, i) in rowAktif.plangkan" :key="p.ukuran">
                  <td class="tr gt-lbl">{{ p.ukuran }}</td>
                  <td class="p0">
                    <input
                      v-model.number="p.qty"
                      type="number"
                      min="0"
                      step="1"
                      class="ci tr bg-yellow-light"
                      :ref="(el) => simpanRef(el, `q_${i}`)"
                      @keydown.enter.prevent="onEnterQty(i)"
                      v-select-on-focus
                    />
                  </td>
                </tr>
              </tbody>
              <tfoot>
                <tr>
                  <td class="tr fw">Total</td>
                  <td class="tr fw">{{ jumlahPlangkan(rowAktif) }}</td>
                </tr>
              </tfoot>
            </table>
          </div>
          <div v-else class="plg-kosong">
            Pilih SPK/MAP pada tabel di atas untuk mengisi detail plangkan.
          </div>
        </div>
      </div>
    </template>
  </BaseForm>

  <SpkSearchModal v-model="showSpkModal" @selected="onSpkSelected" />

  <!-- Setelah simpan: pengganti Save & New / Save & Close -->
  <v-dialog v-model="showSelesai" max-width="400" persistent>
    <v-card class="rounded-lg">
      <v-card-title class="bg-primary text-white d-flex align-center pa-3">
        <IconBulb class="mr-2" :size="20" />
        <span>Simpan Berhasil</span>
      </v-card-title>
      <v-card-text class="pa-4 text-center">
        <div class="text-body-1 mb-2">
          LHK Afdruk <b>{{ nomorTerakhir }}</b> telah disimpan.
        </div>
        <div class="text-body-2 text-grey-darken-1">
          Mau input LHK Afdruk baru?
        </div>
      </v-card-text>
      <v-card-actions class="pa-3 border-t">
        <v-btn variant="text" @click="tutupSetelahSimpan">Tidak, Tutup</v-btn>
        <v-spacer />
        <v-btn color="primary" variant="elevated" @click="resetBaru">
          Ya, Input Baru
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.lhk-left {
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
.lhk-right {
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
  gap: 10px;
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
.sep {
  height: 1px;
  background: #e0e0e0;
  margin: 4px 0;
  width: 100%;
}
.ml-1 {
  margin-left: 4px;
}
.fw {
  font-weight: 700;
}
.tr {
  text-align: right;
}
.tc {
  text-align: center;
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
  background: #dde8f0;
  color: #444;
}
.ro {
  background: #dde8f0 !important;
  color: #444 !important;
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
.tbl-header-sub {
  background: #546e7a;
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
.gt tbody tr.row-aktif td {
  background: #fff8e1 !important;
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

/* Detail Plangkan */
.plg {
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  width: 290px;
}
.plg-wrap {
  max-height: 330px;
}
.plg-tbl {
  width: 100%;
}
.plg-tbl tfoot td {
  background: #eceff1;
  border: 1px solid #bdbdbd;
  height: 26px;
  padding: 0 6px;
  font-size: 11px;
}
.plg-kosong {
  padding: 14px 10px;
  border: 1px solid #bdbdbd;
  border-top: none;
  background: white;
  color: #757575;
  font-style: italic;
  font-size: 11px;
}
</style>
