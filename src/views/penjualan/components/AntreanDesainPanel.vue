<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useToast } from "vue-toastification";
import {
  IconRefresh,
  IconChevronDown,
  IconChevronRight,
} from "@tabler/icons-vue";
import {
  permintaanDesainService as svc,
  type AntreanData,
  type AntreanItem,
  type KerjaAktif,
  type CloseKerjaResult,
} from "@/services/penjualan/permintaanDesainService";
import { formatTanggal } from "@/utils/dateFormat";

const emit = defineEmits<{
  (e: "count", n: number): void;
  (e: "changed"): void;
}>();

const toast = useToast();

const data = ref<AntreanData>({ antrean: [], kerjaSaya: [], kerjaLain: [] });
const isLoading = ref(false);
const selectedKerja = ref<number[]>([]);
const showLain = ref(false);

const errMsg = (e: unknown, fallback: string): string => {
  const msg = (e as { response?: { data?: { message?: string } } })?.response
    ?.data?.message;
  return msg || fallback;
};

const sel = (e: FocusEvent) => (e.target as HTMLInputElement).select();

const fetchAntrean = async () => {
  isLoading.value = true;
  try {
    const res = await svc.getAntrean();
    data.value = res.data.data;
    const ada = new Set(data.value.kerjaSaya.map((k) => k.KerjaId));
    selectedKerja.value = selectedKerja.value.filter((id) => ada.has(id));
    emit("count", data.value.antrean.length + data.value.kerjaSaya.length);
  } catch (e) {
    toast.error(errMsg(e, "Gagal memuat antrean."));
  } finally {
    isLoading.value = false;
  }
};

onMounted(fetchAntrean);
defineExpose({ refresh: fetchAntrean });

// ── Tampilan ──
const PRIORITAS: Record<string, { label: string; bg: string; fg: string }> = {
  NORMAL: { label: "Normal", bg: "#f5f5f5", fg: "#616161" },
  URGENT: { label: "Urgent", bg: "#fff3e0", fg: "#e65100" },
  "TOP URGENT": { label: "Top Urgent", bg: "#ffebee", fg: "#c62828" },
};
const prio = (p: string) =>
  PRIORITAS[p] ?? { label: p, bg: "#f5f5f5", fg: "#616161" };

const dlClass = (dl: string | null) => {
  if (!dl) return "";
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.floor(
    (new Date(dl).getTime() - today.getTime()) / 86400000,
  );
  if (diff < 0) return "dl-late";
  if (diff <= 1) return "dl-soon";
  return "";
};

// ── Dialog Kerjakan / Ubah jumlah ──
const showJmlDialog = ref(false);
const jmlMode = ref<"mulai" | "ubah">("mulai");
const jmlTargetId = ref(0);
const jmlLabel = ref("");
const jmlMax = ref(0);
const jmlValue = ref(1);
const isSavingJml = ref(false);

const openMulai = (r: AntreanItem) => {
  jmlMode.value = "mulai";
  jmlTargetId.value = r.Pd2Id;
  jmlLabel.value = `${r.PdNomor} — ${r.Desain}`;
  jmlMax.value = Number(r.Sisa);
  jmlValue.value = Number(r.Sisa);
  showJmlDialog.value = true;
};

const openUbah = (k: KerjaAktif) => {
  jmlMode.value = "ubah";
  jmlTargetId.value = k.KerjaId;
  jmlLabel.value = `${k.PdNomor} — ${k.Desain}`;
  jmlMax.value = Number(k.JmlDetail);
  jmlValue.value = Number(k.Jml);
  showJmlDialog.value = true;
};

const saveJml = async () => {
  const jml = Number(jmlValue.value);
  if (!Number.isInteger(jml) || jml <= 0) {
    toast.warning("Jumlah harus bilangan bulat > 0.");
    return;
  }
  if (jml > jmlMax.value) {
    toast.warning(`Jumlah melebihi batas (${jmlMax.value}).`);
    return;
  }
  isSavingJml.value = true;
  try {
    if (jmlMode.value === "mulai") {
      await svc.mulaiKerja(jmlTargetId.value, jml);
      toast.success("Pengerjaan dimulai.");
    } else {
      await svc.updateKerja(jmlTargetId.value, jml);
      toast.success("Jumlah diubah.");
    }
    showJmlDialog.value = false;
    await fetchAntrean();
    emit("changed");
  } catch (e) {
    toast.error(errMsg(e, "Gagal menyimpan."));
  } finally {
    isSavingJml.value = false;
  }
};

// ── Dialog konfirmasi umum (Batalkan, Ambil Alih) ──
const showConfirm = ref(false);
const confirmTitle = ref("");
const confirmMessage = ref("");
const confirmAction = ref<(() => Promise<void>) | null>(null);
const isConfirming = ref(false);

const askConfirm = (
  title: string,
  message: string,
  action: () => Promise<void>,
) => {
  confirmTitle.value = title;
  confirmMessage.value = message;
  confirmAction.value = action;
  showConfirm.value = true;
};

const runConfirm = async () => {
  if (!confirmAction.value) return;
  isConfirming.value = true;
  try {
    await confirmAction.value();
    showConfirm.value = false;
  } catch (e) {
    toast.error(errMsg(e, "Aksi gagal."));
  } finally {
    isConfirming.value = false;
  }
};

const batal = (k: KerjaAktif) =>
  askConfirm(
    "Batalkan pengerjaan",
    `Batalkan pengerjaan ${k.Jml} "${k.Desain}" (${k.PdNomor})?`,
    async () => {
      await svc.batalKerja(k.KerjaId);
      toast.success("Pengerjaan dibatalkan.");
      await fetchAntrean();
      emit("changed");
    },
  );

const ambilAlih = (k: KerjaAktif) =>
  askConfirm(
    "Ambil alih pengerjaan",
    `Ambil alih ${k.Jml} "${k.Desain}" (${k.PdNomor}) dari ${k.Desainer}?`,
    async () => {
      await svc.ambilAlih(k.KerjaId);
      toast.success("Pengerjaan diambil alih.");
      await fetchAntrean();
      emit("changed");
    },
  );

// ── Selesai & terbitkan LHK (dikelompokkan per PD) ──
const showCloseDialog = ref(false);
const isClosing = ref(false);

interface GrupClose {
  pdNomor: string;
  namaProject: string;
  items: KerjaAktif[];
  total: number;
}

const grupClose = computed<GrupClose[]>(() => {
  const map = new Map<string, GrupClose>();
  for (const k of data.value.kerjaSaya) {
    if (!selectedKerja.value.includes(k.KerjaId)) continue;
    let g = map.get(k.PdNomor);
    if (!g) {
      g = {
        pdNomor: k.PdNomor,
        namaProject: k.NamaProject,
        items: [],
        total: 0,
      };
      map.set(k.PdNomor, g);
    }
    g.items.push(k);
    g.total += Number(k.Jml) || 0;
  }
  return [...map.values()];
});
const totalClose = computed(() =>
  grupClose.value.reduce((s, g) => s + g.total, 0),
);

const openClose = () => {
  if (!selectedKerja.value.length) return;
  showCloseDialog.value = true;
};

const confirmClose = async () => {
  isClosing.value = true;
  const terbit: CloseKerjaResult[] = [];
  const gagal: string[] = [];
  for (const g of grupClose.value) {
    try {
      const res = await svc.closeKerja(g.items.map((i) => i.KerjaId));
      terbit.push(res.data.data);
    } catch (e) {
      gagal.push(`${g.pdNomor}: ${errMsg(e, "gagal")}`);
    }
  }
  isClosing.value = false;
  if (terbit.length) {
    toast.success(`LHK terbit: ${terbit.map((t) => t.lhkNomor).join(", ")}`);
  }
  gagal.forEach((m) => toast.error(m));
  showCloseDialog.value = false;
  await fetchAntrean();
  if (terbit.length) emit("changed");
};
</script>

<template>
  <div class="ant-wrap">
    <div class="ant-top">
      <span class="ant-title">Antrean Desain</span>
      <v-btn
        size="small"
        variant="outlined"
        color="primary"
        :loading="isLoading"
        @click="fetchAntrean"
      >
        <template #prepend><IconRefresh :size="15" /></template>
        Refresh
      </v-btn>
    </div>

    <!-- 1. Siap dikerjakan -->
    <section class="ant-sec">
      <h3 class="ant-h">
        Siap Dikerjakan <span class="ant-cnt">{{ data.antrean.length }}</span>
      </h3>
      <div class="ant-tbl-wrap">
        <table class="ant-tbl">
          <thead>
            <tr>
              <th>No. PD</th>
              <th>Project</th>
              <th>Desain</th>
              <th class="tr">Jml</th>
              <th class="tr">Dikerjakan</th>
              <th class="tr">Sisa</th>
              <th>Penugasan</th>
              <th>Dateline</th>
              <th>Prioritas</th>
              <th style="width: 90px"></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="r in data.antrean" :key="r.Pd2Id">
              <td class="mono">{{ r.PdNomor }}</td>
              <td>
                {{ r.NamaProject }}
                <div class="sub">{{ r.Customer }}</div>
              </td>
              <td>{{ r.Desain }}</td>
              <td class="tr">{{ r.Jml }}</td>
              <td class="tr">{{ r.Dikerjakan }}</td>
              <td class="tr fw">{{ r.Sisa }}</td>
              <td>{{ r.DesainerKode ? "Untuk saya" : "Umum" }}</td>
              <td :class="dlClass(r.Dateline)">
                {{ r.Dateline ? formatTanggal(r.Dateline) : "-" }}
              </td>
              <td>
                <span
                  class="chip"
                  :style="{
                    backgroundColor: prio(r.Prioritas).bg,
                    color: prio(r.Prioritas).fg,
                  }"
                  >{{ prio(r.Prioritas).label }}</span
                >
              </td>
              <td class="tc">
                <v-btn
                  size="x-small"
                  color="teal"
                  variant="flat"
                  @click="openMulai(r)"
                  >Kerjakan</v-btn
                >
              </td>
            </tr>
            <tr v-if="!data.antrean.length">
              <td colspan="10" class="empty">
                Tidak ada pekerjaan yang menunggu.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <!-- 2. Sedang saya kerjakan -->
    <section class="ant-sec">
      <div class="ant-sec-head">
        <h3 class="ant-h">
          Sedang Saya Kerjakan
          <span class="ant-cnt">{{ data.kerjaSaya.length }}</span>
        </h3>
        <v-btn
          size="small"
          color="primary"
          :disabled="!selectedKerja.length"
          @click="openClose"
        >
          Selesai &amp; Terbitkan LHK ({{ selectedKerja.length }})
        </v-btn>
      </div>
      <div class="ant-tbl-wrap">
        <table class="ant-tbl">
          <thead>
            <tr>
              <th style="width: 30px"></th>
              <th>No. PD</th>
              <th>Project</th>
              <th>Desain</th>
              <th class="tr">Jml Saya</th>
              <th class="tr">Jml Desain</th>
              <th>Mulai</th>
              <th style="width: 150px"></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="k in data.kerjaSaya" :key="k.KerjaId">
              <td class="tc">
                <input
                  type="checkbox"
                  v-model="selectedKerja"
                  :value="k.KerjaId"
                />
              </td>
              <td class="mono">{{ k.PdNomor }}</td>
              <td>{{ k.NamaProject }}</td>
              <td>
                {{ k.Desain }}
                <div v-if="k.AsalDesainer" class="sub">
                  diambil alih dari {{ k.AsalDesainer }}
                </div>
              </td>
              <td class="tr fw">{{ k.Jml }}</td>
              <td class="tr">{{ k.JmlDetail }}</td>
              <td>{{ k.TglMulai }}</td>
              <td class="tc">
                <v-btn
                  size="x-small"
                  variant="tonal"
                  color="primary"
                  @click="openUbah(k)"
                  >Ubah</v-btn
                >
                <v-btn
                  size="x-small"
                  variant="tonal"
                  color="error"
                  class="ml-1"
                  @click="batal(k)"
                  >Batalkan</v-btn
                >
              </td>
            </tr>
            <tr v-if="!data.kerjaSaya.length">
              <td colspan="8" class="empty">Belum ada pengerjaan aktif.</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <!-- 3. Dikerjakan desainer lain -->
    <section class="ant-sec">
      <button type="button" class="ant-toggle" @click="showLain = !showLain">
        <IconChevronDown v-if="showLain" :size="15" />
        <IconChevronRight v-else :size="15" />
        Dikerjakan Desainer Lain
        <span class="ant-cnt">{{ data.kerjaLain.length }}</span>
      </button>
      <div v-if="showLain" class="ant-tbl-wrap">
        <table class="ant-tbl">
          <thead>
            <tr>
              <th>Desainer</th>
              <th>No. PD</th>
              <th>Project</th>
              <th>Desain</th>
              <th class="tr">Jml</th>
              <th>Mulai</th>
              <th style="width: 100px"></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="k in data.kerjaLain" :key="k.KerjaId">
              <td>{{ k.Desainer }}</td>
              <td class="mono">{{ k.PdNomor }}</td>
              <td>{{ k.NamaProject }}</td>
              <td>{{ k.Desain }}</td>
              <td class="tr">{{ k.Jml }}</td>
              <td>{{ k.TglMulai }}</td>
              <td class="tc">
                <v-btn
                  size="x-small"
                  variant="tonal"
                  color="orange-darken-2"
                  @click="ambilAlih(k)"
                  >Ambil Alih</v-btn
                >
              </td>
            </tr>
            <tr v-if="!data.kerjaLain.length">
              <td colspan="7" class="empty">Tidak ada.</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </div>

  <!-- Dialog Kerjakan / Ubah -->
  <v-dialog v-model="showJmlDialog" max-width="380px" persistent>
    <v-card class="rounded-lg">
      <v-card-title
        class="pa-3 bg-primary text-white"
        style="font-size: 13px; font-weight: 700"
      >
        {{ jmlMode === "mulai" ? "Kerjakan" : "Ubah Jumlah" }}
      </v-card-title>
      <v-card-text class="pa-4">
        <div class="dlg-sub">{{ jmlLabel }}</div>
        <label class="dlg-lbl">Jumlah (maks. {{ jmlMax }})</label>
        <input
          type="number"
          v-model.number="jmlValue"
          class="dlg-inp"
          min="1"
          :max="jmlMax"
          @focus="sel"
          @keydown.enter.prevent="saveJml"
        />
      </v-card-text>
      <v-card-actions class="pa-3 border-t">
        <v-btn
          variant="text"
          size="small"
          :disabled="isSavingJml"
          @click="showJmlDialog = false"
          >Batal</v-btn
        >
        <v-spacer />
        <v-btn
          variant="flat"
          size="small"
          color="primary"
          :loading="isSavingJml"
          @click="saveJml"
          >Simpan</v-btn
        >
      </v-card-actions>
    </v-card>
  </v-dialog>

  <!-- Dialog review Selesai -->
  <v-dialog v-model="showCloseDialog" max-width="640px" persistent>
    <v-card class="rounded-lg">
      <v-card-title
        class="pa-3 bg-primary text-white"
        style="font-size: 13px; font-weight: 700"
      >
        Review — Terbitkan LHK Desain
      </v-card-title>
      <v-card-text class="pa-4">
        <div v-for="g in grupClose" :key="g.pdNomor" class="grp">
          <div class="grp-head">
            <span class="mono">{{ g.pdNomor }}</span> — {{ g.namaProject }}
            <span class="grp-lhk">1 LHK</span>
          </div>
          <table class="ant-tbl">
            <tbody>
              <tr v-for="i in g.items" :key="i.KerjaId">
                <td>{{ i.Desain }}</td>
                <td class="tr" style="width: 80px">{{ i.Jml }}</td>
              </tr>
              <tr>
                <td class="tr fw">Total</td>
                <td class="tr fw">{{ g.total }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="dlg-sub">
          {{ grupClose.length }} LHK akan terbit, total {{ totalClose }}.
        </div>
      </v-card-text>
      <v-card-actions class="pa-3 border-t">
        <v-btn
          variant="text"
          size="small"
          :disabled="isClosing"
          @click="showCloseDialog = false"
          >Batal</v-btn
        >
        <v-spacer />
        <v-btn
          variant="flat"
          size="small"
          color="primary"
          :loading="isClosing"
          @click="confirmClose"
          >Simpan &amp; Terbitkan</v-btn
        >
      </v-card-actions>
    </v-card>
  </v-dialog>

  <!-- Dialog konfirmasi -->
  <v-dialog v-model="showConfirm" max-width="400px" persistent>
    <v-card class="rounded-lg">
      <v-card-title
        class="pa-3 bg-primary text-white"
        style="font-size: 13px; font-weight: 700"
      >
        {{ confirmTitle }}
      </v-card-title>
      <v-card-text class="pa-4" style="font-size: 12px">
        {{ confirmMessage }}
      </v-card-text>
      <v-card-actions class="pa-3 border-t">
        <v-btn
          variant="text"
          size="small"
          :disabled="isConfirming"
          @click="showConfirm = false"
          >Batal</v-btn
        >
        <v-spacer />
        <v-btn
          variant="flat"
          size="small"
          color="primary"
          :loading="isConfirming"
          @click="runConfirm"
          >Ya, Lanjutkan</v-btn
        >
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.ant-wrap {
  flex: 1;
  min-height: 0;
  overflow: auto;
  padding: 8px 12px 16px;
}
.ant-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}
.ant-title {
  font-size: 13px;
  font-weight: 700;
  color: #1565c0;
  text-transform: uppercase;
}
.ant-sec {
  margin-bottom: 16px;
}
.ant-sec-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 6px;
}
.ant-h {
  font-size: 12px;
  font-weight: 700;
  color: #37474f;
  margin: 0 0 6px;
}
.ant-sec-head .ant-h {
  margin: 0;
}
.ant-cnt {
  display: inline-block;
  min-width: 18px;
  padding: 0 6px;
  margin-left: 4px;
  border-radius: 9px;
  background: #eceff1;
  color: #455a64;
  font-size: 11px;
  text-align: center;
}
.ant-toggle {
  display: flex;
  align-items: center;
  gap: 4px;
  border: none;
  background: transparent;
  cursor: pointer;
  font-size: 12px;
  font-weight: 700;
  color: #37474f;
  padding: 0;
  margin-bottom: 6px;
}
.ant-tbl-wrap {
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  overflow: auto;
}
.ant-tbl {
  width: 100%;
  border-collapse: collapse;
  font-size: 11px;
  background: white;
}
.ant-tbl thead th {
  background: #37474f;
  color: white;
  padding: 6px 8px;
  text-align: left;
  white-space: nowrap;
}
.ant-tbl thead th.tr {
  text-align: right;
}
.ant-tbl thead th.tc {
  text-align: center;
}
.ant-tbl tbody td {
  padding: 5px 8px;
  border-bottom: 1px solid #eee;
  vertical-align: middle;
}
.sub {
  font-size: 10px;
  color: #888;
}
.chip {
  display: inline-block;
  padding: 1px 8px;
  border-radius: 8px;
  font-size: 10px;
  font-weight: 700;
}
.dl-late {
  color: #c62828;
  font-weight: 700;
}
.dl-soon {
  color: #e65100;
  font-weight: 600;
}
.empty {
  text-align: center;
  color: #999;
  padding: 12px;
}
.mono {
  font-family: monospace;
  font-weight: 600;
}
.tc {
  text-align: center;
}
.tr {
  text-align: right;
}
.fw {
  font-weight: 700;
}
.dlg-sub {
  font-size: 11px;
  color: #666;
  margin-bottom: 10px;
}
.dlg-lbl {
  font-size: 11px;
  font-weight: 600;
  color: #444;
  display: block;
  margin-bottom: 4px;
}
.dlg-inp {
  width: 100%;
  height: 28px;
  border: 1px solid #bdbdbd;
  border-radius: 4px;
  padding: 0 8px;
  font-size: 12px;
  outline: none;
}
.dlg-inp:focus {
  border-color: #1565c0;
}
.grp {
  margin-bottom: 12px;
}
.grp-head {
  font-size: 12px;
  font-weight: 600;
  margin-bottom: 4px;
}
.grp-lhk {
  margin-left: 6px;
  padding: 1px 8px;
  border-radius: 8px;
  background: #e8f5e9;
  color: #2e7d32;
  font-size: 10px;
  font-weight: 700;
}
</style>
