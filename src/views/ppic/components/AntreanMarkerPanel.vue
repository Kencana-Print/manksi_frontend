<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useRouter } from "vue-router";
import { useToast } from "vue-toastification";
import {
  IconRefresh,
  IconChevronDown,
  IconChevronRight,
} from "@tabler/icons-vue";
import { lhkMarkerService } from "@/services/ppic/lhkMarkerService";
import {
  lhkMarkerFormService as svc,
  type AntreanMarkerData,
  type AntreanMarkerItem,
} from "@/services/ppic/lhkMarkerFormService";
import { formatTanggal } from "@/utils/dateFormat";

const emit = defineEmits<{
  (e: "count", n: number): void;
}>();

const router = useRouter();
const toast = useToast();

const data = ref<AntreanMarkerData>({ siap: [], saya: [], lain: [] });
const isLoading = ref(false);
const showLain = ref(false);

const errMsg = (e: unknown, fallback: string): string => {
  const msg = (e as { response?: { data?: { message?: string } } })?.response
    ?.data?.message;
  return msg || fallback;
};

const fetchAntrean = async () => {
  isLoading.value = true;
  try {
    const res = await lhkMarkerService.getAntrean();
    data.value = res.data.data ?? { siap: [], saya: [], lain: [] };
    emit("count", data.value.siap.length + data.value.saya.length);
  } catch (e) {
    toast.error(errMsg(e, "Gagal memuat antrean."));
  } finally {
    isLoading.value = false;
  }
};

onMounted(fetchAntrean);
defineExpose({ refresh: fetchAntrean });

const dlClass = (sisaHari: number) => {
  if (sisaHari < 0) return "dl-late";
  if (sisaHari <= 1) return "dl-soon";
  return "";
};

const fmtJml = (v: number | string): string =>
  Number(v ?? 0).toLocaleString("id-ID");

const MAX_SPK = 2;
const expanded = ref<Set<string>>(new Set());

const toggleSpk = (nomor: string) => {
  const s = new Set(expanded.value);
  if (!s.delete(nomor)) s.add(nomor);
  expanded.value = s;
};

// Fallback ke spkNomor lama kalau backend belum kirim spkList
const spkItems = (r: AntreanMarkerItem) =>
  r.spkList ??
  (r.spkNomor
    ? r.spkNomor.split(", ").map((n) => ({ nomor: n, nama: null }))
    : []);

const spkTampil = (r: AntreanMarkerItem) =>
  expanded.value.has(r.nomor) ? spkItems(r) : spkItems(r).slice(0, MAX_SPK);

// ── Konfirmasi umum (Ambil, Ambil Alih, Lepas) ──
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

const ambil = (r: AntreanMarkerItem) =>
  askConfirm(
    "Ambil permintaan",
    `Ambil permintaan ${r.nomor} (${r.jmlSpk} SPK, ${fmtJml(r.totalJml)} marker)?`,
    async () => {
      await svc.ambilPermintaan(r.nomor);
      toast.success("Permintaan diambil.");
      await fetchAntrean();
    },
  );

const ambilAlih = (r: AntreanMarkerItem) =>
  askConfirm(
    "Ambil alih permintaan",
    `Ambil alih permintaan ${r.nomor} dari ${r.picNama ?? r.pic}?`,
    async () => {
      await svc.ambilAlihPermintaan(r.nomor);
      toast.success("Permintaan diambil alih.");
      await fetchAntrean();
    },
  );

const lepas = (r: AntreanMarkerItem) =>
  askConfirm(
    "Lepas permintaan",
    `Lepas permintaan ${r.nomor}? Permintaan kembali ke antrean umum.`,
    async () => {
      await svc.lepasPermintaan(r.nomor);
      toast.success("Permintaan dilepas.");
      await fetchAntrean();
    },
  );

// Input LHK: form LHK Marker terisi SPK dari permintaan
const inputLhk = (r: AntreanMarkerItem) => {
  router.push({ name: "PpicLhkMarkerCreate", query: { pm: r.nomor } });
};
</script>

<template>
  <div class="ant-wrap">
    <div class="ant-top">
      <span class="ant-title">Antrean Marker</span>
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

    <!-- 1. Siap diambil -->
    <section class="ant-sec">
      <h3 class="ant-h">
        Siap Diambil <span class="ant-cnt">{{ data.siap.length }}</span>
      </h3>
      <div class="ant-tbl-wrap">
        <table class="ant-tbl">
          <thead>
            <tr>
              <th>No. Permintaan</th>
              <th>Deadline</th>
              <th>SPK</th>
              <th class="tr">Jml SPK</th>
              <th class="tr">Total Marker</th>
              <th>Keterangan</th>
              <th style="width: 80px"></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="r in data.siap" :key="r.nomor">
              <td class="mono">{{ r.nomor }}</td>
              <td :class="dlClass(r.sisaHari)">
                {{ formatTanggal(r.deadline) }}
              </td>
              <td class="cell-spk">
                <div v-for="s in spkTampil(r)" :key="s.nomor" class="spk-line">
                  <span class="mono">{{ s.nomor }}</span>
                  <span v-if="s.nama" class="spk-nama" :title="s.nama">{{
                    s.nama
                  }}</span>
                </div>
                <button
                  v-if="spkItems(r).length > MAX_SPK"
                  type="button"
                  class="spk-more"
                  @click="toggleSpk(r.nomor)"
                >
                  {{
                    expanded.has(r.nomor)
                      ? "Ringkas"
                      : `+${spkItems(r).length - MAX_SPK} SPK lainnya`
                  }}
                </button>
              </td>
              <td class="tr">{{ r.jmlSpk }}</td>
              <td class="tr fw">{{ fmtJml(r.totalJml) }}</td>
              <td>
                {{ r.keterangan || "-" }}
                <div v-if="r.asalNomor" class="sub">
                  revisi dari {{ r.asalNomor }}
                </div>
                <div v-if="r.jmlSpkSelesai > 0" class="sub">
                  {{ r.jmlSpkSelesai }} dari {{ r.jmlSpk }} SPK sudah ber-LHK
                </div>
              </td>
              <td class="tc">
                <v-btn
                  size="x-small"
                  color="teal"
                  variant="flat"
                  @click="ambil(r)"
                  >Ambil</v-btn
                >
              </td>
            </tr>
            <tr v-if="!data.siap.length">
              <td colspan="7" class="empty">
                Tidak ada permintaan yang menunggu.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <!-- 2. Sedang saya kerjakan -->
    <section class="ant-sec">
      <h3 class="ant-h">
        Sedang Saya Kerjakan
        <span class="ant-cnt">{{ data.saya.length }}</span>
      </h3>
      <div class="ant-tbl-wrap">
        <table class="ant-tbl">
          <thead>
            <tr>
              <th>No. Permintaan</th>
              <th>Deadline</th>
              <th>SPK</th>
              <th class="tc">SPK Ber-LHK</th>
              <th class="tr">Total Marker</th>
              <th>Diambil</th>
              <th>Keterangan</th>
              <th style="width: 150px"></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="r in data.saya" :key="r.nomor">
              <td class="mono">{{ r.nomor }}</td>
              <td :class="dlClass(r.sisaHari)">
                {{ formatTanggal(r.deadline) }}
              </td>
              <td class="cell-spk">
                <div v-for="s in spkTampil(r)" :key="s.nomor" class="spk-line">
                  <span class="mono">{{ s.nomor }}</span>
                  <span v-if="s.nama" class="spk-nama" :title="s.nama">{{
                    s.nama
                  }}</span>
                </div>
                <button
                  v-if="spkItems(r).length > MAX_SPK"
                  type="button"
                  class="spk-more"
                  @click="toggleSpk(r.nomor)"
                >
                  {{
                    expanded.has(r.nomor)
                      ? "Ringkas"
                      : `+${spkItems(r).length - MAX_SPK} SPK lainnya`
                  }}
                </button>
              </td>
              <td class="tc">{{ r.jmlSpkSelesai }} / {{ r.jmlSpk }}</td>
              <td class="tr fw">{{ fmtJml(r.totalJml) }}</td>
              <td>
                {{ r.tglAmbil }}
                <div v-if="r.picAsalNama" class="sub">
                  diambil alih dari {{ r.picAsalNama }}
                </div>
              </td>
              <td>{{ r.keterangan || "-" }}</td>
              <td class="tc">
                <v-btn
                  size="x-small"
                  variant="flat"
                  color="primary"
                  @click="inputLhk(r)"
                  >Input LHK</v-btn
                >
                <v-btn
                  size="x-small"
                  variant="tonal"
                  color="error"
                  class="ml-1"
                  @click="lepas(r)"
                  >Lepas</v-btn
                >
              </td>
            </tr>
            <tr v-if="!data.saya.length">
              <td colspan="8" class="empty">
                Belum ada permintaan yang kamu ambil.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <!-- 3. Dikerjakan PIC lain -->
    <section class="ant-sec">
      <button type="button" class="ant-toggle" @click="showLain = !showLain">
        <IconChevronDown v-if="showLain" :size="15" />
        <IconChevronRight v-else :size="15" />
        Dikerjakan PIC Lain
        <span class="ant-cnt">{{ data.lain.length }}</span>
      </button>
      <div v-if="showLain" class="ant-tbl-wrap">
        <table class="ant-tbl">
          <thead>
            <tr>
              <th>PIC</th>
              <th>No. Permintaan</th>
              <th>Deadline</th>
              <th>SPK</th>
              <th class="tc">SPK Ber-LHK</th>
              <th>Diambil</th>
              <th style="width: 100px"></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="r in data.lain" :key="r.nomor">
              <td>{{ r.picNama ?? r.pic }}</td>
              <td class="mono">{{ r.nomor }}</td>
              <td :class="dlClass(r.sisaHari)">
                {{ formatTanggal(r.deadline) }}
              </td>
              <td class="cell-spk">
                <div v-for="s in spkTampil(r)" :key="s.nomor" class="spk-line">
                  <span class="mono">{{ s.nomor }}</span>
                  <span v-if="s.nama" class="spk-nama" :title="s.nama">{{
                    s.nama
                  }}</span>
                </div>
                <button
                  v-if="spkItems(r).length > MAX_SPK"
                  type="button"
                  class="spk-more"
                  @click="toggleSpk(r.nomor)"
                >
                  {{
                    expanded.has(r.nomor)
                      ? "Ringkas"
                      : `+${spkItems(r).length - MAX_SPK} SPK lainnya`
                  }}
                </button>
              </td>
              <td class="tc">{{ r.jmlSpkSelesai }} / {{ r.jmlSpk }}</td>
              <td>{{ r.tglAmbil }}</td>
              <td class="tc">
                <v-btn
                  size="x-small"
                  variant="tonal"
                  color="orange-darken-2"
                  @click="ambilAlih(r)"
                  >Ambil Alih</v-btn
                >
              </td>
            </tr>
            <tr v-if="!data.lain.length">
              <td colspan="7" class="empty">Tidak ada.</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </div>

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
.ant-h {
  font-size: 12px;
  font-weight: 700;
  color: #37474f;
  margin: 0 0 6px;
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
.cell-spk {
  max-width: 340px;
}
.spk-line {
  display: flex;
  gap: 6px;
  align-items: baseline;
  white-space: nowrap;
  overflow: hidden;
}
.spk-line .mono {
  font-size: 10px;
  flex-shrink: 0;
}
.spk-nama {
  color: #666;
  overflow: hidden;
  text-overflow: ellipsis;
}
.spk-more {
  border: none;
  background: transparent;
  color: #1565c0;
  font-size: 10px;
  font-weight: 600;
  cursor: pointer;
  padding: 0;
}
.sub {
  font-size: 10px;
  color: #888;
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
</style>
