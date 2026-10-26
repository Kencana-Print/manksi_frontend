<script setup lang="ts">
import { onMounted, ref } from "vue";
import { useRoute } from "vue-router";
import QRCode from "qrcode";
import * as lhkForm from "@/services/spanduk/lhk/lhkKoliFormService";

type PrintData = Awaited<ReturnType<typeof lhkForm.getPrint>>;

const route = useRoute();
const data = ref<PrintData | null>(null);
const qr = ref<Record<number, string>>({});
const loading = ref(true);
const error = ref("");

const fmtTgl = (v: string | null | undefined): string => {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(v ?? ""));
  return m ? `${m[3]}/${m[2]}/${m[1]}` : "";
};

const ukuran = (p: number | null, l: number | null): string =>
  `${Number(p ?? 0)} x ${Number(l ?? 0)} M`;

onMounted(async () => {
  try {
    const d = await lhkForm.getPrint(String(route.params.nomor));
    const peta: Record<number, string> = {};
    for (const u of d.Units) {
      peta[u.Id] = await QRCode.toDataURL(`KOLI:${u.Id}`, {
        errorCorrectionLevel: "M",
        margin: 0,
        width: 400,
      });
    }
    qr.value = peta;
    data.value = d;
    loading.value = false;
    setTimeout(() => window.print(), 600);
  } catch (e) {
    error.value = lhkForm.pesanError(e, "Gagal memuat data label koli.");
    loading.value = false;
  }
});
</script>

<template>
  <div v-if="loading" class="info">Memuat label...</div>
  <div v-else-if="error" class="info">{{ error }}</div>
  <div v-else-if="data" class="sheet">
    <div v-for="u in data.Units" :key="u.Id" class="label">
      <div class="top">
        <span class="tag">KOLI</span>
        <span class="tgl">{{ fmtTgl(data.Tanggal) }}</span>
      </div>
      <div class="body">
        <img :src="qr[u.Id]" class="qr" alt="QR koli" />
        <div class="teks">
          <div class="urut">{{ u.Urut }} / {{ u.Total }}</div>
          <div class="spk">{{ u.Nomor_SPK }}</div>
          <div class="nama">{{ u.Nama_SPK }}</div>
          <div class="ukr">{{ ukuran(u.Panjang, u.Lebar) }}</div>
        </div>
      </div>
      <div class="lhk">{{ data.Nomor }}</div>
    </div>
  </div>
</template>

<style scoped>
.info {
  padding: 24px;
  font-size: 14px;
}
.sheet {
  background: #888;
  padding: 8px 0;
}
.label {
  width: 70mm;
  height: 50mm;
  margin: 0 auto 6px;
  padding: 2mm 3mm;
  box-sizing: border-box;
  background: #fff;
  color: #000;
  font-family: Arial, sans-serif;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  page-break-after: always;
  break-after: page;
}
.top {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  height: 5mm;
}
.tag {
  font-size: 9pt;
  font-weight: 700;
  letter-spacing: 1px;
}
.tgl {
  font-size: 7pt;
}
.body {
  display: flex;
  gap: 2.5mm;
  flex: 1;
  min-height: 0;
  align-items: center;
}
.qr {
  width: 28mm;
  height: 28mm;
  flex-shrink: 0;
  image-rendering: pixelated;
}
.teks {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 1mm;
}
.urut {
  font-size: 20pt;
  font-weight: 700;
  line-height: 1;
}
.spk {
  font-size: 8pt;
  font-weight: 700;
  white-space: nowrap;
  overflow: hidden;
}
.nama {
  font-size: 7pt;
  line-height: 1.15;
  max-height: 3.5em;
  overflow: hidden;
}
.ukr {
  font-size: 7pt;
}
.lhk {
  font-size: 6pt;
  height: 3mm;
}

@page {
  size: 70mm 50mm;
  margin: 0;
}
@media print {
  .sheet {
    background: none;
    padding: 0;
  }
  .label {
    margin: 0;
  }
}
</style>
