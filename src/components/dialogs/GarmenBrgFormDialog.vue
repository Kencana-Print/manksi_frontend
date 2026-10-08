<script setup lang="ts">
import { ref, watch, computed } from "vue";
import type { VForm } from "vuetify/components";
import api from "@/services/api";
import { useToast } from "vue-toastification";
import SearchLookup from "@/components/SearchLookup.vue";
import { IconShirt, IconSearch } from "@tabler/icons-vue";

const props = defineProps<{
  modelValue: boolean;
  isNewMode: boolean;
  editData?: any;
  jenisGarmen: string;
}>();

const emit = defineEmits(["update:modelValue", "saved"]);
const toast = useToast();
const formRef = ref<VForm | null>(null);
const isSaving = ref(false);

const dialogVisible = computed({
  get: () => props.modelValue,
  set: (val) => emit("update:modelValue", val),
});

const satuanOptions = ref<string[]>([]);
const projectOptions = ref<string[]>([]);

const formData = ref({
  brg_jenis: "",
  brg_kode: "",
  brg_ktg: "",
  brg_nama: "",
  brg_satuan: "",
  brg_note: "",
  brg_buffer: 0,
  brg_aktif: "Y",
  accBarang: { Kode: "", Nama: "" },
  accWarna: { Kode: "", Nama: "" },
  accUkuran: { Kode: "", Nama: "" },
  accKet: { Kode: "", Nama: "" },
  accProject: "REGULER",
});

interface KodeStatus {
  editable: boolean;
  pemakaian: string[];
}

const originalKode = ref("");
const kodeStatus = ref<KodeStatus | null>(null);

// Boleh diubah hanya di mode edit dan hanya bila server bilang kode belum
// dipakai BPB maupun penyelesaian uang muka. Selama status belum dimuat: terkunci.
const canEditKode = computed(
  () => !props.isNewMode && kodeStatus.value?.editable === true,
);

// ACCESORIES: kode dirakit dari komponen, tidak pernah diketik.
const kodeReadonly = computed(() =>
  props.jenisGarmen === "ACCESORIES"
    ? true
    : !props.isNewMode && !canEditKode.value,
);

const kodeLockText = computed(() => {
  const s = kodeStatus.value;
  if (!s || s.editable) return "";
  return `Kode terkunci karena sudah dipakai di ${s.pemakaian.join(" dan ")}.`;
});

const assembleAccKode = (): string => {
  const f = formData.value;
  const p = f.accProject === "REGULER" ? "" : f.accProject.substring(0, 1);
  return (
    f.accBarang.Kode +
    f.accWarna.Kode +
    f.accUkuran.Kode +
    f.accKet.Kode +
    p
  ).toUpperCase();
};

// Dipanggil setelah komponen dipilih ulang; hanya berefek bila kode boleh diubah
const syncAccKode = () => {
  if (props.jenisGarmen === "ACCESORIES" && canEditKode.value)
    formData.value.brg_kode = assembleAccKode();
};

const loadKodeStatus = async (kode: string) => {
  kodeStatus.value = null;
  try {
    const res = await api.get(
      `/master/barang-garmen/${encodeURIComponent(kode)}/kode-status`,
    );
    kodeStatus.value = res.data.data;
  } catch {
    kodeStatus.value = null; // gagal cek: biarkan terkunci
  }
};

// Auto-generate nama Accesories
const generatedAccName = computed(() => {
  if (props.jenisGarmen !== "ACCESORIES") return formData.value.brg_nama;
  const p =
    formData.value.accProject === "REGULER" ? "" : formData.value.accProject;
  return `${formData.value.accBarang.Nama} ${formData.value.accWarna.Nama} ${formData.value.accUkuran.Nama} ${formData.value.accKet.Nama} ${p}`.trim();
});
watch(generatedAccName, (v) => {
  if (props.jenisGarmen === "ACCESORIES") formData.value.brg_nama = v;
});

watch(
  () => formData.value.brg_nama,
  (v) => {
    if (props.jenisGarmen === "ACCESORIES") {
      const u = v.toUpperCase();
      formData.value.brg_ktg =
        u.startsWith("PLASTIK") || u.startsWith("KARDUS") ? "TAMBAHAN" : "";
    }
  },
);

// Lookup modal
const lookupState = ref({ show: false, title: "", category: "", target: "" });
const openLookup = (category: string, title: string, target: string) => {
  if (!props.isNewMode && !canEditKode.value) return;
  lookupState.value = { show: true, title, category, target };
};
const handleLookupSelect = (item: any) => {
  const t = lookupState.value.target;
  if (t === "barang")
    formData.value.accBarang = { Kode: item.Kode, Nama: item.Nama };
  if (t === "warna")
    formData.value.accWarna = { Kode: item.Kode, Nama: item.Nama };
  if (t === "ukuran")
    formData.value.accUkuran = { Kode: item.Kode, Nama: item.Nama };
  if (t === "ket") formData.value.accKet = { Kode: item.Kode, Nama: item.Nama };
  syncAccKode();
};

const loadOptions = async () => {
  try {
    const endpointMap: Record<string, string> = {
      ACCESORIES: "satuan_acc",
      OBAT: "satuan_obat",
      SPAREPART: "satuan_sparepart",
      "ATK/RTK": "satuan_atk",
    };
    const [resSatuan, resProject] = await Promise.all([
      api.get(
        `/master/barang-garmen/lookups/${endpointMap[props.jenisGarmen]}`,
      ),
      props.jenisGarmen === "ACCESORIES"
        ? api.get("/master/barang-garmen/lookups/project")
        : Promise.resolve({ data: { data: [] } }),
    ]);
    satuanOptions.value = resSatuan.data.data.map((i: any) => i.Nama);
    projectOptions.value = resProject.data.data.map((i: any) => i.Nama);
  } catch {
    toast.error("Gagal memuat opsi dropdown");
  }
};

const defaultKtg: Record<string, string> = {
  OBAT: "GARMEN",
  SPAREPART: "MESIN",
  "ATK/RTK": "ATK",
};

const resetForm = () => {
  formData.value = {
    brg_jenis: props.jenisGarmen,
    brg_kode: "",
    brg_ktg: defaultKtg[props.jenisGarmen] ?? "",
    brg_nama: "",
    brg_satuan: satuanOptions.value[0] || "",
    brg_note: "",
    brg_buffer: 0,
    brg_aktif: "Y",
    accBarang: { Kode: "", Nama: "" },
    accWarna: { Kode: "", Nama: "" },
    accUkuran: { Kode: "", Nama: "" },
    accKet: { Kode: "", Nama: "" },
    accProject: "REGULER",
  };
};

watch(
  () => props.modelValue,
  async (isOpen) => {
    if (!isOpen) return;
    await loadOptions();
    if (props.isNewMode) {
      resetForm();
      originalKode.value = "";
      kodeStatus.value = null;
    } else if (props.editData) {
      const ed = props.editData;
      formData.value = {
        brg_jenis: ed.brg_jenis,
        brg_kode: ed.brg_kode,
        brg_ktg: ed.brg_ktg,
        brg_nama: ed.brg_nama,
        brg_satuan: ed.brg_satuan,
        brg_note: ed.brg_note,
        brg_buffer: Number(ed.brg_buffer),
        brg_aktif: ed.brg_aktif,
        accBarang: {
          Kode: ed.brg_kode?.substring(0, 2) || "",
          Nama: ed.nmBarang || "",
        },
        accWarna: {
          Kode: ed.brg_kode?.substring(2, 5) || "",
          Nama: ed.nmWarna || "",
        },
        accUkuran: {
          Kode: ed.brg_kode?.substring(5, 8) || "",
          Nama: ed.nmUkuran || "",
        },
        accKet: {
          Kode: ed.brg_kode?.substring(8, 10) || "",
          Nama: ed.nmKet || "",
        },
        accProject: ed.project || "REGULER",
      };
      originalKode.value = ed.brg_kode;
      void loadKodeStatus(ed.brg_kode);
    }
    formRef.value?.resetValidation();
  },
);

const checkKodeExist = async () => {
  // Hanya cek jika mode baru, bukan jenis accesories (karena accesories otomatis dari komponen), dan kode terisi
  if (
    !props.isNewMode ||
    props.jenisGarmen === "ACCESORIES" ||
    !formData.value.brg_kode
  )
    return;

  try {
    const res = await api.get(
      `/master/barang-garmen/${formData.value.brg_kode}`,
    );
    if (res.data && res.data.data) {
      toast.error(
        `Kode barang ${formData.value.brg_kode} sudah pernah digunakan!`,
      );
      formData.value.brg_kode = ""; // Langsung tolak dan kosongkan
    }
  } catch (e: any) {
    // Jika 404 Not Found, berarti kode aman digunakan
  }
};

const handleSave = async () => {
  const { valid } = await formRef.value!.validate();
  if (!valid) return;
  if (canEditKode.value && !formData.value.brg_kode.trim()) {
    toast.error("Kode tidak boleh kosong.");
    return;
  }
  isSaving.value = true;
  try {
    const payload: any = { ...formData.value };
    if (props.isNewMode && props.jenisGarmen === "ACCESORIES") {
      payload.accKodeAssembled = assembleAccKode();
    }

    if (props.isNewMode) {
      await api.post("/master/barang-garmen", payload);
      toast.success("Barang berhasil ditambahkan");
    } else {
      // 1) simpan data lain memakai kode LAMA sebagai kunci
      payload.brg_kode = originalKode.value;
      await api.put(`/master/barang-garmen/${payload.brg_kode}`, payload);

      // 2) ganti kode (bila diubah): langkah paling berisiko, jadi paling akhir
      const kodeBaru = formData.value.brg_kode.trim().toUpperCase();
      const kodeBerubah =
        canEditKode.value && kodeBaru !== originalKode.value.toUpperCase();
      if (kodeBerubah) {
        try {
          await api.put(
            `/master/barang-garmen/${encodeURIComponent(originalKode.value)}/kode`,
            { kode_baru: kodeBaru },
          );
        } catch (e: any) {
          emit("saved"); // data lain sudah tersimpan
          toast.error(
            `Data tersimpan, tetapi kode gagal diubah: ${
              e.response?.data?.message || "terjadi kesalahan"
            }`,
          );
          return;
        }
      }
      toast.success(
        kodeBerubah
          ? "Barang berhasil diperbarui, kode diubah"
          : "Barang berhasil diperbarui",
      );
    }
    dialogVisible.value = false;
    emit("saved");
  } catch (e: any) {
    toast.error(e.response?.data?.message || "Gagal menyimpan data.");
  } finally {
    isSaving.value = false;
  }
};
</script>

<template>
  <v-dialog v-model="dialogVisible" persistent max-width="700px">
    <v-form ref="formRef" @submit.prevent="handleSave">
      <div class="dlg-card">
        <!-- Header -->
        <div class="dlg-header">
          <IconShirt
            :size="15"
            :stroke-width="1.7"
            color="white"
            class="mr-2"
          />
          <span
            >{{ isNewMode ? "Tambah" : "Ubah" }} Barang {{ jenisGarmen }}</span
          >
          <v-spacer />
          <button
            type="button"
            class="dlg-close"
            @click="dialogVisible = false"
          >
            ✕
          </button>
        </div>

        <!-- Body -->
        <div class="dlg-body">
          <!-- Kode + Nama -->
          <div class="f-row">
            <div class="f-field" style="max-width: 200px">
              <label class="f-label">Kode</label>
              <input
                v-model="formData.brg_kode"
                :readonly="kodeReadonly"
                :class="['f-inp', kodeReadonly ? 'f-readonly' : '']"
                :placeholder="
                  isNewMode && jenisGarmen !== 'ACCESORIES'
                    ? 'Ketik Kode...'
                    : 'Otomatis'
                "
                @blur="checkKodeExist"
              />
            </div>
            <div class="f-field" style="flex: 1">
              <label class="f-label"
                >Nama Barang <span class="req">*</span></label
              >
              <input
                v-model="formData.brg_nama"
                :readonly="jenisGarmen === 'ACCESORIES'"
                :class="[
                  'f-inp',
                  jenisGarmen === 'ACCESORIES' ? 'f-readonly' : '',
                ]"
                required
              />
            </div>
          </div>

          <div
            v-if="!isNewMode && kodeStatus"
            class="f-note"
            :class="canEditKode ? 'f-note--ok' : 'f-note--lock'"
          >
            <template v-if="canEditKode">
              Kode belum dipakai di BPB maupun penyelesaian uang muka, jadi
              masih boleh diubah.
              <template v-if="jenisGarmen === 'ACCESORIES'">
                Pilih ulang komponen di bawah untuk mengganti kode.
              </template>
            </template>
            <template v-else>{{ kodeLockText }}</template>
          </div>

          <div class="f-divider" />

          <!-- ── ACCESORIES ── -->
          <template v-if="jenisGarmen === 'ACCESORIES'">
            <div class="f-section-title">Komponen Kode</div>

            <div
              v-for="(field, key) in {
                barang: {
                  label: 'Barang',
                  cat: 'acc_barang',
                  title: 'Master Barang',
                },
                warna: {
                  label: 'Warna',
                  cat: 'acc_warna',
                  title: 'Master Warna',
                },
                ukuran: {
                  label: 'Ukuran',
                  cat: 'acc_ukuran',
                  title: 'Master Ukuran',
                },
                ket: {
                  label: 'Keterangan',
                  cat: 'acc_ket',
                  title: 'Master Ket.',
                },
              }"
              :key="key"
              class="f-row"
            >
              <div class="f-field" style="width: 100px; flex-shrink: 0">
                <label class="f-label">Kode {{ field.label }}</label>
                <div
                  class="f-inp-lookup"
                  @click="openLookup(field.cat, field.title, key)"
                >
                  <input
                    :value="
                      (formData as any)[
                        `acc${key.charAt(0).toUpperCase() + key.slice(1)}`
                      ]?.Kode
                    "
                    readonly
                    class="f-inp"
                    style="cursor: pointer"
                  />
                  <IconSearch
                    :size="13"
                    color="#1565c0"
                    class="lookup-icon"
                    :stroke-width="1.7"
                  />
                </div>
              </div>
              <div class="f-field" style="flex: 1">
                <label class="f-label">Nama {{ field.label }}</label>
                <input
                  :value="
                    (formData as any)[
                      `acc${key.charAt(0).toUpperCase() + key.slice(1)}`
                    ]?.Nama
                  "
                  readonly
                  class="f-inp f-readonly"
                />
              </div>
            </div>

            <div class="f-row">
              <div class="f-field" style="width: 180px">
                <label class="f-label">Project</label>
                <select
                  v-model="formData.accProject"
                  :disabled="!isNewMode"
                  class="f-inp f-select"
                >
                  <option v-for="p in projectOptions" :key="p" :value="p">
                    {{ p }}
                  </option>
                </select>
              </div>
              <div class="f-field" style="flex: 1">
                <label class="f-label">Accesories Tambahan</label>
                <div class="d-flex align-center gap-3 pt-1">
                  <label class="radio-lbl">
                    <input
                      type="radio"
                      :checked="formData.brg_ktg === 'TAMBAHAN'"
                      disabled
                    />
                    Ya
                  </label>
                  <label class="radio-lbl">
                    <input
                      type="radio"
                      :checked="formData.brg_ktg !== 'TAMBAHAN'"
                      disabled
                    />
                    Tidak
                  </label>
                </div>
              </div>
            </div>

            <div class="f-field-full">
              <label class="f-label">Note (Kode Benang)</label>
              <input v-model="formData.brg_note" class="f-inp" />
            </div>

            <div class="f-divider" />
          </template>

          <!-- ── OBAT / SPAREPART / ATK ── -->
          <template v-else-if="jenisGarmen !== 'ACCESORIES'">
            <div class="f-section-title">Kategori</div>
            <div class="kategori-group">
              <template v-if="jenisGarmen === 'OBAT'">
                <label
                  v-for="opt in [
                    { val: 'GARMEN', lbl: '(G) Cetak Garmen' },
                    { val: 'MMT', lbl: '(M) Cetak MMT' },
                    { val: 'DTF', lbl: '(D) DTF dan DTG' },
                  ]"
                  :key="opt.val"
                  class="radio-lbl"
                >
                  <input
                    type="radio"
                    v-model="formData.brg_ktg"
                    :value="opt.val"
                    style="accent-color: #1565c0"
                  />
                  {{ opt.lbl }}
                </label>
              </template>

              <template v-else-if="jenisGarmen === 'SPAREPART'">
                <label
                  v-for="opt in ['MESIN', 'NONMESIN', 'LISTRIK', 'OIL', 'IT']"
                  :key="opt"
                  class="radio-lbl"
                >
                  <input
                    type="radio"
                    v-model="formData.brg_ktg"
                    :value="opt"
                    style="accent-color: #1565c0"
                  />
                  {{ opt }}
                </label>
              </template>

              <template v-else-if="jenisGarmen === 'ATK/RTK'">
                <label
                  v-for="opt in ['ATK', 'RTK']"
                  :key="opt"
                  class="radio-lbl"
                >
                  <input
                    type="radio"
                    v-model="formData.brg_ktg"
                    :value="opt"
                    style="accent-color: #1565c0"
                  />
                  {{ opt }}
                </label>
              </template>
            </div>
            <div class="f-divider" />
          </template>

          <!-- Satuan + Buffer + Status -->
          <div class="f-row">
            <div class="f-field" style="width: 160px">
              <label class="f-label">Satuan</label>
              <select v-model="formData.brg_satuan" class="f-inp f-select">
                <option v-for="s in satuanOptions" :key="s" :value="s">
                  {{ s }}
                </option>
              </select>
            </div>
            <div class="f-field" style="width: 130px">
              <label class="f-label">Buffer Stok</label>
              <input
                v-model.number="formData.brg_buffer"
                type="number"
                class="f-inp"
                style="text-align: right"
                v-select-on-focus
              />
            </div>
            <div class="f-field" style="flex: 1">
              <label class="f-label">Status</label>
              <div class="d-flex align-center gap-3 pt-1">
                <label class="radio-lbl">
                  <input
                    type="radio"
                    v-model="formData.brg_aktif"
                    value="Y"
                    style="accent-color: #1565c0"
                  />
                  Aktif
                </label>
                <label class="radio-lbl">
                  <input
                    type="radio"
                    v-model="formData.brg_aktif"
                    value="N"
                    style="accent-color: #e53935"
                  />
                  Pasif
                </label>
              </div>
            </div>
          </div>
        </div>
        <!-- /.dlg-body -->

        <!-- Footer -->
        <div class="dlg-footer">
          <button
            type="button"
            class="dlg-btn secondary"
            :disabled="isSaving"
            @click="dialogVisible = false"
          >
            Batal
          </button>
          <button type="submit" class="dlg-btn primary" :disabled="isSaving">
            {{ isSaving ? "Menyimpan..." : "Simpan (F10)" }}
          </button>
        </div>
      </div>
    </v-form>
  </v-dialog>

  <SearchLookup
    v-model="lookupState.show"
    :title="lookupState.title"
    :lookup-category="lookupState.category"
    :api-endpoint="`/master/barang-garmen/lookups/${lookupState.category}`"
    @on-select="handleLookupSelect"
  />
</template>

<style scoped>
/* ── Dialog card ── */
.dlg-card {
  background: white;
  border-radius: 8px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  font-family: "Segoe UI", system-ui, sans-serif;
  font-size: 12px;
}

/* ── Header ── */
.dlg-header {
  display: flex;
  align-items: center;
  background: #1565c0;
  color: white;
  padding: 9px 14px;
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.03em;
  flex-shrink: 0;
}
.dlg-close {
  background: transparent;
  border: none;
  color: rgba(255, 255, 255, 0.8);
  font-size: 15px;
  cursor: pointer;
  padding: 0 2px;
  line-height: 1;
}
.dlg-close:hover {
  color: white;
}

/* ── Body ── */
.dlg-body {
  padding: 12px 14px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

/* ── Field rows ── */
.f-row {
  display: flex;
  gap: 10px;
  align-items: flex-end;
}
.f-field {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}
.f-field-full {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.f-label {
  font-size: 11px;
  font-weight: 600;
  color: #555;
  white-space: nowrap;
}
.req {
  color: #e53935;
}

/* ── Native inputs ── */
.f-inp {
  height: 28px;
  border: 1px solid #bdbdbd;
  border-radius: 4px;
  padding: 0 7px;
  font-size: 12px;
  outline: none;
  background: white;
  color: #212121;
  width: 100%;
  box-sizing: border-box;
}
.f-inp:focus {
  border-color: #1565c0;
}
.f-readonly {
  background: #f5f5f5;
  color: #757575;
  cursor: default;
}
.f-select {
  cursor: pointer;
}

/* Lookup input wrapper */
.f-inp-lookup {
  position: relative;
  display: flex;
  align-items: center;
}
.f-inp-lookup .f-inp {
  padding-right: 24px;
  cursor: pointer;
}
.lookup-icon {
  position: absolute;
  right: 6px;
  cursor: pointer;
}

/* ── Section title ── */
.f-section-title {
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #1565c0;
  margin-bottom: 2px;
}

/* ── Kategori radio group ── */
.kategori-group {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 16px;
  padding: 8px 10px;
  background: #f5f5f5;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
}

/* ── Radio label ── */
.radio-lbl {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  cursor: pointer;
  white-space: nowrap;
}
.radio-lbl input[type="radio"] {
  accent-color: #1565c0;
  cursor: pointer;
}

/* ── Divider ── */
.f-divider {
  height: 1px;
  background: #eeeeee;
  margin: 2px 0;
}

/* ── Footer ── */
.dlg-footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  padding: 8px 14px;
  background: #fafafa;
  border-top: 1px solid #e0e0e0;
  flex-shrink: 0;
}
.dlg-btn {
  height: 30px;
  padding: 0 16px;
  border: none;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.15s;
}
.dlg-btn:disabled {
  opacity: 0.5;
  cursor: default;
}
.dlg-btn.primary {
  background: #1565c0;
  color: white;
}
.dlg-btn.primary:hover:not(:disabled) {
  background: #1557a8;
}
.dlg-btn.secondary {
  background: #e0e0e0;
  color: #424242;
}
.dlg-btn.secondary:hover:not(:disabled) {
  background: #d0d0d0;
}
/* ── Catatan status kode ── */
.f-note {
  font-size: 11px;
  line-height: 1.4;
  padding: 6px 9px;
  border-radius: 4px;
}
.f-note--ok {
  background: #e6f5ec;
  color: #1f8a4c;
}
.f-note--lock {
  background: #fdf1dc;
  color: #b86500;
}
</style>
