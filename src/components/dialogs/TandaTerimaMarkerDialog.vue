<script setup lang="ts">
import { computed, nextTick, ref, watch } from "vue";
import { useAuthStore } from "@/stores/authStore";
import {
  lhkMarkerFormService, // sesuaikan dengan nama export yang dipakai di LhkMarkerFormView
  type TandaTerimaData,
  type TandaTerimaItem,
} from "@/services/ppic/lhkMarkerFormService";

const props = defineProps<{ modelValue: boolean; lhkNomor: string }>();
const emit = defineEmits<{
  (e: "update:modelValue", v: boolean): void;
  (e: "tutup"): void;
  (e: "berubah"): void;
}>();

const authStore = useAuthStore();
const bisaCetak = computed(() => authStore.can("179", "insert"));

const data = ref<TandaTerimaData | null>(null);
const loading = ref(false);
const mencetak = ref(false);
const errorMsg = ref("");
const areaRef = ref<HTMLElement | null>(null);

const fmtTgl = (v: string | null | undefined) => {
  if (!v) return "-";
  const [tgl, jam] = String(v).split(" ");
  const [y, m, d] = tgl.split("-");
  if (!y || !m || !d) return String(v);
  return `${d}-${m}-${y}${jam ? " " + jam : ""}`;
};

const teksStatus = (tt: TandaTerimaItem) => {
  if (tt.tglTerima)
    return `Diterima ${fmtTgl(tt.tglTerima)} (validasi digital oleh ${tt.userTerima || "-"})`;
  if (tt.tglMutasi)
    return `Diserahkan ${fmtTgl(tt.tglMutasi)}, menunggu validasi peminta`;
  return "Belum dicetak";
};

const muat = async () => {
  if (!props.lhkNomor) return;
  loading.value = true;
  errorMsg.value = "";
  try {
    const res = await lhkMarkerFormService.getTandaTerima(props.lhkNomor);
    data.value = res.data.data;
  } catch (e: any) {
    errorMsg.value = e?.response?.data?.message || "Gagal memuat tanda terima";
    data.value = null;
  } finally {
    loading.value = false;
  }
};

watch(
  () => [props.modelValue, props.lhkNomor],
  ([buka]) => {
    if (buka) muat();
  },
  { immediate: true },
);

const cssCetak = `
  @page{size:A4;margin:12mm}
  body{font-family:Arial,sans-serif;font-size:11px;margin:0}
  .tt-sec{page-break-after:always}
  .tt-sec:last-child{page-break-after:auto}
  .tt-h{text-align:center;font-size:14px;margin:0 0 12px;letter-spacing:1px}
  .tt-meta{display:flex;gap:20px;margin-bottom:10px}
  .tt-blk{flex:1;min-width:0;display:grid;grid-template-columns:max-content 10px 1fr;column-gap:2px;row-gap:3px;align-content:start}
  .tt-l{font-weight:600;white-space:nowrap}
  .tt-v{overflow-wrap:anywhere}
  .tt-tbl{width:100%;border-collapse:collapse}
  .tt-tbl th,.tt-tbl td{border:1px solid #000;padding:3px 6px;text-align:left;vertical-align:top}
  .tt-tbl th{background:#eee}
  .tt-tbl th,.tt-tbl td,.tt-ttd td{font-size:11px}
  .tt-nw{white-space:nowrap}
  .tt-nama{min-width:140px}
  .tt-ket{min-width:90px}
  .tt-c{text-align:center}
  .tt-ttd{width:100%;margin-top:20px;text-align:center;table-layout:fixed;border-collapse:collapse}
  .tt-ttd td{width:50%}
  .tt-ttd-spasi{height:50px}
  .tt-status{margin-top:14px;font-style:italic;font-size:10px}
`;

const cetakIframe = () => {
  const html = areaRef.value?.innerHTML;
  if (!html) return;
  const iframe = document.createElement("iframe");
  iframe.style.cssText =
    "position:fixed;right:0;bottom:0;width:0;height:0;border:0";
  document.body.appendChild(iframe);
  const doc = iframe.contentWindow!.document;
  doc.open();
  doc.write(
    `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Tanda Terima Marker</title><style>${cssCetak}</style></head><body>${html}</body></html>`,
  );
  doc.close();
  setTimeout(() => {
    iframe.contentWindow!.focus();
    iframe.contentWindow!.print();
    setTimeout(() => iframe.remove(), 1500);
  }, 150);
};

const cetak = async () => {
  mencetak.value = true;
  try {
    // Cetak pertama mengisi Tanggal Mutasi di server; cetak ulang tidak mengubahnya.
    const res = await lhkMarkerFormService.cetakTandaTerima(props.lhkNomor);
    data.value = res.data.data;
    emit("berubah");
    await nextTick();
    cetakIframe();
  } catch (e: any) {
    errorMsg.value =
      e?.response?.data?.message || "Gagal mencetak tanda terima";
  } finally {
    mencetak.value = false;
  }
};

const tutup = () => {
  emit("update:modelValue", false);
  emit("tutup");
};
const onToggle = (v: boolean) => {
  if (!v) tutup();
};
</script>

<template>
  <v-dialog
    :model-value="modelValue"
    max-width="900"
    scrollable
    @update:model-value="onToggle"
  >
    <v-card>
      <v-card-title class="tt-title"
        >Tanda Terima Marker – {{ lhkNomor }}</v-card-title
      >
      <v-card-text>
        <div v-if="loading" class="tt-info">Memuat...</div>
        <div v-else-if="errorMsg" class="tt-info tt-err">{{ errorMsg }}</div>
        <div v-else-if="!data || !data.tandaTerima.length" class="tt-info">
          LHK ini tidak terkait permintaan marker, jadi tidak ada tanda terima.
        </div>
        <div v-else ref="areaRef">
          <section
            v-for="tt in data.tandaTerima"
            :key="tt.nomor"
            class="tt-sec"
          >
            <h3 class="tt-h">TANDA TERIMA MARKER</h3>
            <div class="tt-meta">
              <div class="tt-blk">
                <span class="tt-l">No. Tanda Terima</span>
                <span>:</span>
                <span class="tt-v">{{ tt.nomor }}</span>
                <span class="tt-l">No. Permintaan</span>
                <span>:</span>
                <span class="tt-v">{{ tt.pmNomor }}</span>
                <span class="tt-l">Peminta</span>
                <span>:</span>
                <span class="tt-v">{{ tt.peminta }}</span>
                <span class="tt-l">Pembuat Marker</span>
                <span>:</span>
                <span class="tt-v">{{ data.lhk.pembuatMarker || "-" }}</span>
              </div>
              <div class="tt-blk">
                <span class="tt-l">No. LHK</span>
                <span>:</span>
                <span class="tt-v">{{ data.lhk.nomor }}</span>
                <span class="tt-l">Tgl LHK</span>
                <span>:</span>
                <span class="tt-v">{{ fmtTgl(data.lhk.tanggal) }}</span>
                <span class="tt-l">Deadline</span>
                <span>:</span>
                <span class="tt-v">{{ fmtTgl(tt.deadline) }}</span>
                <span class="tt-l">Keterangan</span>
                <span>:</span>
                <span class="tt-v">{{ data.lhk.keterangan || "-" }}</span>
              </div>
            </div>
            <table class="tt-tbl">
              <thead>
                <tr>
                  <th class="tt-nw">No</th>
                  <th class="tt-nw">No. SPK</th>
                  <th class="tt-nama">Nama SPK</th>
                  <th class="tt-nw">Lebar Kain</th>
                  <th class="tt-nw">Size</th>
                  <th class="tt-nw">Tujuan Proses</th>
                  <th class="tt-ket">Keterangan</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="b in tt.baris" :key="b.urut">
                  <td class="tt-nw tt-c">{{ b.urut }}</td>
                  <td class="tt-nw">{{ b.spkNomor }}</td>
                  <td>{{ b.namaSpk }}</td>
                  <td class="tt-nw">{{ b.lebarKain ?? "" }}</td>
                  <td class="tt-nw">{{ b.size || "" }}</td>
                  <td class="tt-nw">{{ b.tujuanProses || "" }}</td>
                  <td>{{ b.keterangan || "" }}</td>
                </tr>
              </tbody>
            </table>
            <table class="tt-ttd">
              <tbody>
                <tr>
                  <td>
                    Diserahkan oleh,
                    <div class="tt-ttd-spasi"></div>
                    ( {{ data.lhk.pembuatMarker || "........" }} )
                  </td>
                  <td>
                    Diterima oleh,
                    <div class="tt-ttd-spasi"></div>
                    ( {{ tt.peminta }} )
                  </td>
                </tr>
              </tbody>
            </table>
            <div class="tt-status">{{ teksStatus(tt) }}</div>
          </section>
        </div>
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn size="small" variant="text" @click="tutup">Tutup</v-btn>
        <v-btn
          v-if="bisaCetak && data && data.tandaTerima.length"
          size="small"
          color="primary"
          variant="flat"
          :loading="mencetak"
          @click="cetak"
        >
          Cetak
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style>
.tt-title {
  font-size: 12px !important;
}
.tt-info {
  font-size: 11px;
  padding: 8px 0;
}
.tt-err {
  color: #c62828;
}
.tt-sec {
  font-size: 11px;
  margin-bottom: 24px;
}
.tt-h {
  text-align: center;
  font-size: 13px;
  margin: 0 0 10px;
  letter-spacing: 1px;
}
.tt-meta {
  display: flex;
  gap: 20px;
  margin-bottom: 10px;
}
.tt-blk {
  flex: 1;
  min-width: 0;
  display: grid;
  grid-template-columns: max-content 10px 1fr;
  column-gap: 2px;
  row-gap: 3px;
  align-content: start;
}
.tt-l {
  font-weight: 600;
  white-space: nowrap;
}
.tt-v {
  overflow-wrap: anywhere;
}
.tt-tbl {
  width: 100%;
  border-collapse: collapse;
}
.tt-tbl th,
.tt-tbl td {
  border: 1px solid #999;
  padding: 3px 6px;
  text-align: left;
  vertical-align: top;
}
.tt-tbl th {
  background: #f5f5f5;
}
.tt-nw {
  white-space: nowrap;
}
.tt-nama {
  min-width: 140px;
}
.tt-ket {
  min-width: 90px;
}
.tt-c {
  text-align: center;
}
.tt-ttd {
  width: 100%;
  margin-top: 16px;
  text-align: center;
  table-layout: fixed;
  border-collapse: collapse;
}
.tt-ttd td {
  width: 50%;
}
.tt-ttd-spasi {
  height: 44px;
}
.tt-status {
  margin-top: 12px;
  font-style: italic;
  font-size: 10px;
}
</style>
