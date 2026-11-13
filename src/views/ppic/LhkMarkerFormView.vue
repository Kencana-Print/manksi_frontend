<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useToast } from "vue-toastification";
import BaseForm from "@/components/BaseForm.vue";
import { useForm } from "@/composables/useForm";
import { IconRuler2, IconTrash } from "@tabler/icons-vue";
import { permintaanMarkerFormService } from "@/services/garmen/permintaanMarkerFormService";
import {
  lhkMarkerFormService,
  type BlokPayload,
  type LhkMarkerPayload,
  type RasioLoaded,
  type SizeSpk,
} from "@/services/ppic/lhkMarkerFormService";

const route = useRoute();
const router = useRouter();
const toast = useToast();
const isEditMode = computed(() => !!route.params.nomor);

const MAKS_RASIO = 7;

// ── Tipe state form ──
interface RasioForm {
  rasio: number;
  spreading: string;
  pMarkerCm: string;
  qty: Record<string, string>;
}

interface BlokForm {
  key: string;
  pmNomor: string;
  kode: string;
  setting: string;
  namaBahan: string;
  satuan: string;
  spkNomor: string;
  namaSpk: string;
  untuk: string;
  lebarMarker: string;
  keterangan: string;
  sizeLama: string;
  formatLama: boolean;
  size: SizeSpk[];
  rasio: RasioForm[];
}

interface FormState {
  nomor: string;
  tanggal: string;
  keterangan: string;
  pembuatMarker: string;
  marker: BlokForm[];
}

interface HasilRasio {
  terisi: boolean;
  sumQty: number;
  m: number;
  total: number;
  sisa: Record<string, number>;
  sisaSum: number;
}

interface HasilBlok {
  rasio: HasilRasio[];
  qtyOrderSum: number;
  totalM: number;
}

// ── Helper hitung (hanya tampilan; angka final dihitung ulang di server) ──
const bulat5 = (n: number) => Math.round(n * 1e5) / 1e5;

const num = (v: string | undefined) => {
  const n = Number(
    String(v ?? "")
      .trim()
      .replace(",", "."),
  );
  return Number.isFinite(n) ? n : 0;
};

const rasioTerisi = (r: RasioForm) =>
  num(r.spreading) > 0 ||
  num(r.pMarkerCm) > 0 ||
  Object.values(r.qty).some((v) => num(v) > 0);

const hitungBlok = (b: BlokForm): HasilBlok => {
  const sisa: Record<string, number> = {};
  for (const s of b.size) sisa[s.size] = s.qtyOrder;
  let totalM = 0;

  const rasio = b.rasio.map((r): HasilRasio => {
    const terisi = rasioTerisi(r);
    const spreading = num(r.spreading);
    const sumQty = b.size.reduce((a, s) => a + num(r.qty[s.size]), 0);
    const m = bulat5(num(r.pMarkerCm) / 100);
    const total = bulat5(m * spreading);
    if (terisi) {
      for (const s of b.size) {
        sisa[s.size] = bulat5(sisa[s.size] - spreading * num(r.qty[s.size]));
      }
      totalM = bulat5(totalM + total);
    }
    return {
      terisi,
      sumQty,
      m,
      total,
      sisa: { ...sisa },
      sisaSum: bulat5(Object.values(sisa).reduce((a, v) => a + v, 0)),
    };
  });

  return {
    rasio,
    qtyOrderSum: b.size.reduce((a, s) => a + s.qtyOrder, 0),
    totalM,
  };
};

const fmt = (n: number, maks = 2) =>
  n.toLocaleString("id-ID", { maximumFractionDigits: maks });
const fmt2 = (n: number) =>
  n.toLocaleString("id-ID", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const todayLocal = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const rasioKosong = (size: SizeSpk[]): RasioForm[] =>
  Array.from({ length: MAKS_RASIO }, (_, i) => ({
    rasio: i + 1,
    spreading: "",
    pMarkerCm: "",
    qty: Object.fromEntries(size.map((s) => [s.size, ""])),
  }));

const rasioDariTersimpan = (
  size: SizeSpk[],
  tersimpan: RasioLoaded[],
): RasioForm[] =>
  rasioKosong(size).map((kosong) => {
    const t = tersimpan.find((x) => x.rasio === kosong.rasio);
    if (!t) return kosong;
    return {
      rasio: kosong.rasio,
      spreading: String(t.spreading),
      pMarkerCm: String(t.pMarkerCm),
      qty: Object.fromEntries(
        size.map((s) => {
          const q = t.qty[s.size] ?? 0;
          return [s.size, q > 0 ? String(q) : ""];
        }),
      ),
    };
  });

const muatSize = async (spkNomor: string): Promise<SizeSpk[]> => {
  const res = await lhkMarkerFormService.getSpkByNomor(spkNomor);
  return res.data.data.size;
};

// ── State dialog & kunci ──
const setelahSimpan = ref(false);
const terkunci = ref(false);

const defaultData: FormState = {
  nomor: "",
  tanggal: todayLocal(),
  keterangan: "",
  pembuatMarker: "",
  marker: [],
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
  menuId: "179",
  initialData: defaultData,
  fetchApi: async (): Promise<FormState> => {
    const res = await lhkMarkerFormService.getDetail(
      String(route.params.nomor),
    );
    const d = res.data.data;
    const cache = new Map<string, SizeSpk[]>();
    const marker: BlokForm[] = [];

    for (const r of d.marker) {
      let size: SizeSpk[] = [];
      if (!r.formatLama) {
        if (!cache.has(r.spkNomor)) {
          cache.set(r.spkNomor, await muatSize(r.spkNomor));
        }
        size = cache.get(r.spkNomor) ?? [];
      }
      marker.push({
        key: `${r.id}`,
        pmNomor: r.pmNomor ?? "",
        kode: r.kode ?? "",
        setting: r.setting ?? "",
        namaBahan: r.namaBahan ?? "",
        satuan: r.satuan ?? "",
        spkNomor: r.spkNomor,
        namaSpk: r.namaSpk ?? "",
        untuk: r.untuk ?? "",
        lebarMarker: r.lebarMarker ?? "",
        keterangan: r.keterangan ?? "",
        sizeLama: r.sizeLama ?? "",
        formatLama: r.formatLama,
        size,
        rasio: r.formatLama ? [] : rasioDariTersimpan(size, r.rasio),
      });
    }

    return {
      nomor: d.header.lhkp_nomor,
      tanggal: String(d.header.lhkp_tanggal).substring(0, 10),
      keterangan: d.header.lhkp_keterangan || "",
      pembuatMarker: d.header.pembuatMarker || "",
      marker,
    };
  },
  submitApi: async (data: FormState) => {
    const payload: LhkMarkerPayload = {
      tanggal: data.tanggal,
      keterangan: data.keterangan,
      marker: data.marker.map(
        (b): BlokPayload => ({
          pmNomor: b.pmNomor,
          kode: b.kode,
          setting: b.setting,
          lebarMarker: b.lebarMarker.trim(),
          keterangan: b.keterangan.trim(),
          rasio: b.rasio.filter(rasioTerisi).map((r) => ({
            rasio: r.rasio,
            spreading: num(r.spreading),
            pMarkerCm: num(r.pMarkerCm),
            qty: Object.fromEntries(
              b.size.map((s) => [s.size, num(r.qty[s.size])]),
            ),
          })),
        }),
      ),
    };
    const res = isEditMode.value
      ? await lhkMarkerFormService.update(String(route.params.nomor), payload)
      : await lhkMarkerFormService.create(payload);
    return res;
  },
  onSuccess: () => {
    toast.success("LHK Marker berhasil disimpan");
    router.push({ name: "PpicLhkMarker" });
  },
});

// ── Turunan ──
const hitung = computed(() => formData.value.marker.map(hitungBlok));
const adaFormatLama = computed(() =>
  formData.value.marker.some((b) => b.formatLama),
);
const bacaSaja = computed(() => terkunci.value || adaFormatLama.value);
const totalSemua = computed(() =>
  hitung.value.reduce((a, h) => bulat5(a + h.totalM), 0),
);

const removeBlok = (idx: number) => {
  formData.value.marker.splice(idx, 1);
};

// ── Muat awal: kunci (edit) atau prefill dari permintaan (create) ──
const pmQuery = computed(() =>
  typeof route.query.pm === "string" ? route.query.pm : "",
);

onMounted(async () => {
  const nomor = String(route.params.nomor || "");
  if (nomor) {
    try {
      const res = await lhkMarkerFormService.getTandaTerima(nomor);
      terkunci.value = res.data.data.tandaTerima.some((t) => !!t.tglTerima);
    } catch {
      terkunci.value = false; // backend tetap menjadi penentu saat simpan
    }
    return;
  }

  if (!pmQuery.value) {
    toast.warning(
      "LHK Marker dibuat dari Permintaan Marker, lewat tab Antrean Saya.",
    );
    router.push({ name: "PpicLhkMarker" });
    return;
  }

  try {
    const res = await permintaanMarkerFormService.getDetail(pmQuery.value);
    const d = res.data.data;
    if (!d) return;
    if (d.statusManual || d.status === "DONE" || d.status === "CLOSE") {
      toast.error(
        `Permintaan ${d.nomor} berstatus ${d.status}, tidak bisa diinput LHK.`,
      );
      router.push({ name: "PpicLhkMarker" });
      return;
    }
    if (d.detail.length === 0) {
      toast.warning("Permintaan ini tidak punya bahan.");
      router.push({ name: "PpicLhkMarker" });
      return;
    }

    const cache = new Map<string, SizeSpk[]>();
    const marker: BlokForm[] = [];
    for (const r of d.detail) {
      if (!cache.has(r.spkNomor)) {
        cache.set(r.spkNomor, await muatSize(r.spkNomor));
      }
      const size = cache.get(r.spkNomor) ?? [];
      if (size.length === 0) {
        toast.error(`SPK ${r.spkNomor} belum punya data size.`);
        router.push({ name: "PpicLhkMarker" });
        return;
      }
      marker.push({
        key: `${d.nomor}|${r.kode}|${r.setting}|${r.spkNomor}`,
        pmNomor: d.nomor,
        kode: r.kode,
        setting: r.setting,
        namaBahan: r.namaBahan,
        satuan: r.satuan,
        spkNomor: r.spkNomor,
        namaSpk: r.spkNama ?? "",
        untuk: d.userCreate,
        lebarMarker: "",
        keterangan: "",
        sizeLama: "",
        formatLama: false,
        size,
        rasio: rasioKosong(size),
      });
    }

    formData.value.marker = marker;
    const namaList = [
      ...new Set(marker.map((b) => b.namaSpk).filter((n) => n.trim())),
    ];
    if (namaList.length > 0 && !formData.value.keterangan.trim()) {
      formData.value.keterangan = namaList.join(", ");
    }
  } catch {
    toast.error("Gagal memuat permintaan marker.");
  }
});

// ── Validasi ──
const validateSave = () => {
  if (terkunci.value) {
    toast.error(
      "LHK sudah divalidasi peminta (tanda terima diterima), tidak bisa diubah",
    );
    return;
  }
  if (adaFormatLama.value) {
    toast.error("LHK format lama tidak bisa diubah, hanya bisa dilihat.");
    return;
  }
  if (!formData.value.tanggal) {
    toast.warning("Tanggal wajib diisi.");
    return;
  }
  if (formData.value.marker.length === 0) {
    toast.warning("Minimal harus ada 1 blok bahan.");
    return;
  }

  for (let bi = 0; bi < formData.value.marker.length; bi++) {
    const b = formData.value.marker[bi];
    const label = `Blok ${bi + 1} (${b.namaBahan || b.kode})`;
    const terisi = b.rasio.filter(rasioTerisi);
    if (terisi.length === 0) {
      toast.warning(`${label}: isi minimal 1 rasio.`);
      return;
    }
    for (const r of terisi) {
      const sp = num(r.spreading);
      if (!Number.isInteger(sp) || sp < 1) {
        toast.warning(
          `${label} rasio ${r.rasio}: spreading harus bilangan bulat > 0.`,
        );
        return;
      }
      if (!(num(r.pMarkerCm) > 0)) {
        toast.warning(`${label} rasio ${r.rasio}: p.marker (cm) harus > 0.`);
        return;
      }
      let adaQty = false;
      for (const s of b.size) {
        const q = num(r.qty[s.size]);
        if (!Number.isInteger(q) || q < 0) {
          toast.warning(
            `${label} rasio ${r.rasio}: qty size ${s.size} harus bilangan bulat >= 0.`,
          );
          return;
        }
        if (q > 0) adaQty = true;
      }
      if (!adaQty) {
        toast.warning(
          `${label} rasio ${r.rasio}: isi qty minimal di satu size.`,
        );
        return;
      }
    }
  }
  showSaveDialog.value = true;
};
</script>

<template>
  <BaseForm
    :title="isEditMode ? 'Ubah LHK Marker' : 'Buat LHK Marker'"
    menu-id="179"
    :icon="IconRuler2"
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
    <div class="lm-container">
      <div v-if="terkunci" class="banner banner-warn">
        LHK ini sudah divalidasi peminta. Data tidak bisa diubah atau dihapus.
      </div>
      <div v-if="adaFormatLama" class="banner banner-info">
        LHK ini memakai format lama (tanpa bahan dan rasio). Hanya bisa dilihat
        atau dihapus.
      </div>

      <!-- Header -->
      <div class="card">
        <div class="hdr-grid">
          <div class="fld">
            <label class="lbl">No. LHK Marker</label>
            <input
              :value="formData.nomor || '(Otomatis)'"
              readonly
              class="inp ro"
            />
          </div>
          <div class="fld">
            <label class="lbl">Tanggal</label>
            <input
              type="date"
              v-model="formData.tanggal"
              class="inp"
              :disabled="bacaSaja"
            />
          </div>
          <div class="fld">
            <label class="lbl">Pembuat</label>
            <input
              :value="formData.pembuatMarker || '(Otomatis dari PIC)'"
              readonly
              class="inp ro"
            />
          </div>
          <div class="fld fld-wide">
            <label class="lbl">Keterangan</label>
            <input
              v-model="formData.keterangan"
              class="inp"
              :disabled="bacaSaja"
            />
          </div>
          <div class="hdr-sum">
            <span class="sum-chip"
              >{{ formData.marker.length }} blok bahan</span
            >
            <span class="sum-chip sum-total">
              Total kebutuhan {{ fmt2(totalSemua) }} m
            </span>
          </div>
        </div>
      </div>

      <!-- Blok bahan -->
      <div v-for="(b, bi) in formData.marker" :key="b.key" class="card blok">
        <div class="blok-head">
          <span class="blok-no">{{ bi + 1 }}</span>
          <div class="blok-title">
            <div class="blok-bahan">
              {{ b.namaBahan || b.kode || "Format lama" }}
            </div>
            <div class="blok-sub">
              <span v-if="b.kode" class="mono">{{ b.kode }}</span>
              <span v-if="b.setting" class="chip">Setting {{ b.setting }}</span>
              <span v-if="b.satuan" class="chip">{{ b.satuan }}</span>
              <span v-if="b.pmNomor" class="chip chip-pm">{{ b.pmNomor }}</span>
            </div>
          </div>
          <div class="blok-meta">
            <div>
              SPK <b class="mono">{{ b.spkNomor }}</b>
              <span v-if="b.namaSpk"> · {{ b.namaSpk }}</span>
            </div>
            <div>
              For <b>{{ b.untuk || "-" }}</b>
            </div>
          </div>
          <button
            v-if="!bacaSaja && formData.marker.length > 1"
            type="button"
            class="btn-del"
            title="Hapus blok ini dari LHK"
            @click="removeBlok(bi)"
          >
            <IconTrash :size="13" color="#c62828" />
          </button>
        </div>

        <div class="blok-fields">
          <div class="fld">
            <label class="lbl">Lebar Marker</label>
            <input
              v-model="b.lebarMarker"
              class="inp"
              :disabled="bacaSaja"
              placeholder="147CM"
            />
          </div>
          <div class="fld fld-grow">
            <label class="lbl">Keterangan</label>
            <input v-model="b.keterangan" class="inp" :disabled="bacaSaja" />
          </div>
        </div>

        <div v-if="b.formatLama" class="lama-info">
          Size lama: <b>{{ b.sizeLama || "-" }}</b>
        </div>

        <div v-else class="tbl-wrap">
          <table class="rt">
            <thead>
              <tr>
                <th style="width: 40px">Rasio</th>
                <th style="width: 64px">Spreading</th>
                <th v-for="s in b.size" :key="s.size" class="th-size">
                  {{ s.size }}
                </th>
                <th style="width: 56px">Qty</th>
                <th style="width: 90px">P.Marker (cm)</th>
                <th style="width: 80px">P.Marker (m)</th>
                <th style="width: 90px">Total (m)</th>
              </tr>
            </thead>
            <tbody>
              <tr class="r-order">
                <th colspan="2" class="lbl-cell">Qty Order</th>
                <td v-for="s in b.size" :key="s.size" class="num">
                  {{ fmt(s.qtyOrder) }}
                </td>
                <td class="num strong">{{ fmt(hitung[bi].qtyOrderSum) }}</td>
                <td colspan="3"></td>
              </tr>

              <template v-for="(r, ri) in b.rasio" :key="r.rasio">
                <tr class="r-in">
                  <td class="tc strong">{{ r.rasio }}</td>
                  <td>
                    <input
                      v-model="r.spreading"
                      class="ci"
                      inputmode="numeric"
                      :disabled="bacaSaja"
                    />
                  </td>
                  <td v-for="s in b.size" :key="s.size">
                    <input
                      v-model="r.qty[s.size]"
                      class="ci"
                      inputmode="numeric"
                      :disabled="bacaSaja"
                    />
                  </td>
                  <td class="num">
                    {{
                      hitung[bi].rasio[ri].terisi
                        ? fmt(hitung[bi].rasio[ri].sumQty)
                        : ""
                    }}
                  </td>
                  <td>
                    <input
                      v-model="r.pMarkerCm"
                      class="ci ci-wide"
                      inputmode="decimal"
                      :disabled="bacaSaja"
                    />
                  </td>
                  <td class="num">
                    {{
                      hitung[bi].rasio[ri].terisi
                        ? fmt(hitung[bi].rasio[ri].m, 4)
                        : ""
                    }}
                  </td>
                  <td class="num">
                    {{
                      hitung[bi].rasio[ri].terisi
                        ? fmt2(hitung[bi].rasio[ri].total)
                        : ""
                    }}
                  </td>
                </tr>
                <tr v-if="hitung[bi].rasio[ri].terisi" class="r-sisa">
                  <th colspan="2" class="lbl-cell">Sisa</th>
                  <td
                    v-for="s in b.size"
                    :key="s.size"
                    class="num"
                    :class="{ neg: hitung[bi].rasio[ri].sisa[s.size] < 0 }"
                  >
                    {{ fmt(hitung[bi].rasio[ri].sisa[s.size]) }}
                  </td>
                  <td class="num">{{ fmt(hitung[bi].rasio[ri].sisaSum) }}</td>
                  <td colspan="3"></td>
                </tr>
              </template>
            </tbody>
            <tfoot>
              <tr class="r-total">
                <td :colspan="b.size.length + 5" class="tr">
                  Total kebutuhan (m)
                </td>
                <td class="num strong">{{ fmt2(hitung[bi].totalM) }}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  </BaseForm>
</template>

<style scoped>
.lm-container {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 10px;
  height: 100%;
  overflow-y: auto;
  font-family: "Segoe UI", system-ui, sans-serif;
  font-size: 11px;
}
.card {
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  padding: 10px 14px;
}
.banner {
  font-size: 11px;
  padding: 6px 10px;
  border-radius: 4px;
}
.banner-warn {
  background: #fff3e0;
  border: 1px solid #ffb74d;
}
.banner-info {
  background: #e3f2fd;
  border: 1px solid #90caf9;
}
.hdr-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px 14px;
  align-items: end;
}
.fld {
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
}
.fld-wide {
  grid-column: 1 / -1;
}
.fld-grow {
  flex: 1;
}
.lbl {
  font-weight: 600;
  color: #424242;
}
.inp {
  height: 26px;
  border: 1px solid #bdbdbd;
  border-radius: 3px;
  padding: 0 6px;
  font-size: 11px;
  outline: none;
  box-sizing: border-box;
  width: 100%;
}
.inp:focus {
  border-color: #1565c0;
}
.inp:disabled {
  background: #f5f5f5;
  color: #757575;
}
.ro {
  background: #f0f0f0;
  color: #616161;
}
.hdr-sum {
  grid-column: 1 / -1;
  display: flex;
  align-items: center;
  gap: 8px;
}
.sum-chip {
  padding: 2px 8px;
  border-radius: 10px;
  background: #eceff1;
  color: #455a64;
  font-weight: 600;
}
.sum-total {
  background: #e8f5e9;
  color: #2e7d32;
}
.btn-tt {
  font-size: 11px;
  text-transform: none;
  margin-left: auto;
}
.blok-head {
  display: flex;
  align-items: center;
  gap: 10px;
  padding-bottom: 8px;
  margin-bottom: 8px;
  border-bottom: 1px solid #eee;
}
.blok-no {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: #1565c0;
  color: white;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.blok-title {
  min-width: 0;
  flex: 1;
}
.blok-bahan {
  font-size: 12px;
  font-weight: 700;
  color: #263238;
}
.blok-sub {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 2px;
  align-items: center;
}
.chip {
  padding: 0 6px;
  border-radius: 8px;
  background: #eceff1;
  color: #546e7a;
  font-size: 10px;
}
.chip-pm {
  background: #e3f2fd;
  color: #1565c0;
}
.blok-meta {
  text-align: right;
  color: #455a64;
  line-height: 1.5;
}
.mono {
  font-family: monospace;
  color: #1565c0;
  font-weight: 600;
}
.blok-fields {
  display: flex;
  gap: 12px;
  margin-bottom: 8px;
}
.blok-fields .fld:first-child {
  width: 160px;
}
.lama-info {
  padding: 6px 8px;
  background: #fafafa;
  border: 1px dashed #bdbdbd;
  border-radius: 4px;
}
.tbl-wrap {
  overflow-x: auto;
}
.rt {
  border-collapse: collapse;
  font-size: 11px;
  min-width: 100%;
}
.rt th,
.rt td {
  border: 1px solid #e0e0e0;
  padding: 2px 4px;
}
.rt thead th {
  background: #f5f5f5;
  font-weight: 700;
  text-align: center;
  white-space: nowrap;
}
.th-size {
  min-width: 52px;
}
.lbl-cell {
  text-align: left;
  padding-left: 8px;
  font-weight: 700;
}
.num {
  text-align: right;
  padding-right: 8px;
  font-variant-numeric: tabular-nums;
}
.tc {
  text-align: center;
}
.tr {
  text-align: right;
  padding-right: 8px;
  font-weight: 700;
}
.strong {
  font-weight: 700;
}
.r-order,
.r-order th {
  background: #fff9c4;
}
.r-in {
  background: #e3f2fd;
}
.r-sisa,
.r-sisa th {
  background: #e8f5e9;
}
.r-sisa td {
  color: #c62828;
}
.r-sisa td.neg {
  background: #ffcdd2;
  font-weight: 700;
}
.r-total td {
  background: #eceff1;
}
.ci {
  width: 100%;
  min-width: 44px;
  height: 22px;
  border: 1px solid #bdbdbd;
  border-radius: 3px;
  text-align: center;
  font-size: 11px;
  outline: none;
  box-sizing: border-box;
  background: white;
}
.ci-wide {
  min-width: 80px;
}
.ci:focus {
  border-color: #1565c0;
}
.ci:disabled {
  background: #f5f5f5;
  color: #757575;
}
.btn-del {
  background: #ffebee;
  border: 1px solid #ef9a9a;
  border-radius: 3px;
  padding: 3px 6px;
  cursor: pointer;
}
.btn-del:hover {
  background: #ffcdd2;
}
</style>
