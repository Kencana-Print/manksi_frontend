<script setup lang="ts">
import { ref, onMounted, computed } from "vue";
import { useRoute } from "vue-router";
import { useToast } from "vue-toastification";
import { pengajuanUangMukaService } from "@/services/pembelian/pengajuanUangMukaService";
import {
  pengajuanUangMukaValidasiService,
  type ValidasiInfo,
} from "@/services/pembelian/pengajuanUangMukaValidasiService";
import logoUrl from "@/assets/logo.png";

const route = useRoute();
const toast = useToast();
const data = ref<any>(null);
const isLoading = ref(true);
const error = ref("");
const validasi = ref<ValidasiInfo | null>(null);
const isBusy = ref(false);
const showBatalDialog = ref(false);
const showValidasiDialog = ref(false);
const alasanBatal = ref("");

// ?mode=layar -> halaman validasi: tidak auto-print, ada toolbar aksi
const modeLayar = computed(() => route.query.mode === "layar");
const nomorPum = computed(() =>
  decodeURIComponent(route.params.nomor as string),
);
const adaStamp = computed(
  () =>
    validasi.value?.status === "VALID" ||
    validasi.value?.status === "TIDAK_BERLAKU",
);

const errMsg = (e: unknown, fallback: string): string =>
  (e as { response?: { data?: { message?: string } } })?.response?.data
    ?.message || fallback;

onMounted(async () => {
  try {
    const res = await pengajuanUangMukaService.getPrintData(nomorPum.value);
    data.value = res.data.data;
    // Gagal ambil status validasi tidak boleh menghalangi cetak biasa
    try {
      validasi.value = await pengajuanUangMukaValidasiService.getStatus(
        nomorPum.value,
      );
    } catch {
      validasi.value = null;
    }
    if (!modeLayar.value) setTimeout(() => window.print(), 600);
  } catch (e: any) {
    error.value = e.response?.data?.message ?? "Gagal memuat data cetak.";
  } finally {
    isLoading.value = false;
  }
});

const doValidasi = async () => {
  isBusy.value = true;
  try {
    validasi.value = await pengajuanUangMukaValidasiService.validasi(
      nomorPum.value,
    );
    showValidasiDialog.value = false;
    toast.success("Pengajuan berhasil divalidasi.");
  } catch (e: unknown) {
    toast.error(errMsg(e, "Gagal memvalidasi."));
  } finally {
    isBusy.value = false;
  }
};

const doBatal = async () => {
  isBusy.value = true;
  try {
    validasi.value = await pengajuanUangMukaValidasiService.batal(
      nomorPum.value,
      alasanBatal.value,
    );
    showBatalDialog.value = false;
    alasanBatal.value = "";
    toast.success("Validasi dibatalkan.");
  } catch (e: unknown) {
    toast.error(errMsg(e, "Gagal membatalkan validasi."));
  } finally {
    isBusy.value = false;
  }
};

const fmt = (v: number) => new Intl.NumberFormat("id-ID").format(v || 0);

const sumberLabel = (v: string) =>
  v === "PENGAJUAN_DANA" ? "Pengajuan Dana" : "Permintaan Pembelian";

const terbilang = (n: number): string => {
  if (n === 0) return "NOL";
  if (n < 0) return "MINUS " + terbilang(Math.abs(n));

  const satuan = [
    "",
    "satu",
    "dua",
    "tiga",
    "empat",
    "lima",
    "enam",
    "tujuh",
    "delapan",
    "sembilan",
    "sepuluh",
    "sebelas",
    "dua belas",
    "tiga belas",
    "empat belas",
    "lima belas",
    "enam belas",
    "tujuh belas",
    "delapan belas",
    "sembilan belas",
  ];

  const convert = (num: number): string => {
    if (num === 0) return "";
    if (num < 20) return satuan[num] + " ";
    if (num < 100)
      return satuan[Math.floor(num / 10)] + " puluh " + convert(num % 10);
    if (num < 200) return "seratus " + convert(num - 100);
    if (num < 1000)
      return satuan[Math.floor(num / 100)] + " ratus " + convert(num % 100);
    if (num < 2000) return "seribu " + convert(num - 1000);
    if (num < 1000000)
      return convert(Math.floor(num / 1000)) + "ribu " + convert(num % 1000);
    if (num < 1000000000)
      return (
        convert(Math.floor(num / 1000000)) + "juta " + convert(num % 1000000)
      );
    return (
      convert(Math.floor(num / 1000000000)) +
      "milyar " +
      convert(num % 1000000000)
    );
  };

  return convert(n).trim().toUpperCase();
};

const cetak = () => window.print();
</script>

<template>
  <div v-if="isLoading" class="loading">Memuat data cetak...</div>
  <div v-else-if="error" class="loading">{{ error }}</div>
  <div v-else-if="data" class="print-page">
    <div v-if="modeLayar" class="toolbar no-print">
      <v-btn
        v-if="validasi?.boleh_validasi"
        size="small"
        color="success"
        @click="showValidasiDialog = true"
      >
        Validasi
      </v-btn>
      <v-btn
        v-if="validasi?.boleh_batal"
        size="small"
        color="error"
        variant="outlined"
        @click="showBatalDialog = true"
      >
        Batalkan Validasi
      </v-btn>
      <v-btn size="small" color="indigo" @click="cetak"> Cetak </v-btn>
      <span v-if="validasi && !validasi.berlaku" class="toolbar-note">
        E-validasi hanya untuk cabang HO-/P01.
      </span>
    </div>

    <v-dialog v-model="showValidasiDialog" max-width="420">
      <v-card>
        <v-card-title>Validasi Pengajuan</v-card-title>
        <v-card-text>
          Validasi pengajuan <strong>{{ data.nomor }}</strong> sebesar
          <strong>{{ fmt(data.totalDiajukan) }}</strong
          >? Setelah divalidasi, data tertera sebagai diterima Finance secara
          elektronik.
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="showValidasiDialog = false"
            >Batal</v-btn
          >
          <v-btn color="success" :loading="isBusy" @click="doValidasi">
            Validasi
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="showBatalDialog" max-width="420">
      <v-card>
        <v-card-title>Batalkan Validasi</v-card-title>
        <v-card-text>
          <v-textarea
            v-model="alasanBatal"
            label="Alasan pembatalan (wajib)"
            rows="2"
            density="compact"
            variant="outlined"
            hide-details
          />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="showBatalDialog = false">Tutup</v-btn>
          <v-btn
            color="error"
            :loading="isBusy"
            :disabled="alasanBatal.trim().length < 3"
            @click="doBatal"
          >
            Batalkan Validasi
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
    <div class="header-row">
      <div class="doc-title-wrapper">
        <div class="doc-title">BUKTI PENGAJUAN UANG MUKA</div>
      </div>
      <img :src="logoUrl" alt="Logo" class="logo" />
    </div>

    <div class="info-grid">
      <div class="info-col">
        <div class="info-row">
          <span class="lbl">No. PUM</span>
          <span class="sep">:</span>
          <span class="val">{{ data.nomor }}</span>
        </div>
        <div class="info-row">
          <span class="lbl">Tanggal</span>
          <span class="sep">:</span>
          <span class="val">{{ data.tanggal_fmt }}</span>
        </div>
      </div>
      <div class="info-col">
        <div class="info-row">
          <span class="lbl">Cabang</span>
          <span class="sep">:</span>
          <span class="val">{{ data.cabang }}</span>
        </div>
        <div class="info-row">
          <span class="lbl">Diajukan Oleh</span>
          <span class="sep">:</span>
          <span class="val">{{ data.pemohon }}</span>
        </div>
      </div>
    </div>

    <div class="info-row" style="margin-bottom: 8px">
      <span class="lbl">Keterangan</span>
      <span class="sep">:</span>
      <span class="val">{{ data.keterangan || "-" }}</span>
    </div>

    <table class="detail-table">
      <thead>
        <tr>
          <th style="width: 25px">No</th>
          <th style="width: 80px">Sumber</th>
          <th style="width: 100px">No.Pengajuan</th>
          <th>Uraian</th>
          <th style="width: 70px; text-align: right">Qty</th>
          <th style="width: 110px; text-align: right">Nominal Sumber</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(d, i) in data.detail" :key="i">
          <td class="tc">{{ Number(i) + 1 }}</td>
          <td>{{ sumberLabel(d.sumber) }}</td>
          <td>{{ d.nomorSumber }}</td>
          <td>{{ d.nama }}{{ d.spesifikasi ? " - " + d.spesifikasi : "" }}</td>
          <td class="tr">{{ d.qty }}</td>
          <td class="tr">{{ fmt(d.nominal) }}</td>
        </tr>
        <tr v-if="!data.detail.length">
          <td colspan="6" class="tc" style="color: #999; font-style: italic">
            Tidak ada detail
          </td>
        </tr>
      </tbody>
    </table>

    <table class="footer-table">
      <tr>
        <td class="terbilang-col" rowspan="2" valign="top">
          Terbilang: {{ terbilang(data.totalDiajukan) }}
        </td>
        <td class="tot-lbl">Diajukan</td>
        <td class="tot-sep">:</td>
        <td class="tot-val">{{ fmt(data.totalDiajukan) }}</td>
      </tr>
    </table>

    <div class="bottom-section">
      <div class="ttd-area">
        <div class="ttd-col">
          <div class="ttd-title">Diajukan Oleh</div>
          <div class="ttd-space"></div>
          <div class="ttd-name">({{ data.pemohon }})</div>
        </div>
        <div class="ttd-col">
          <div class="ttd-title" :class="{ tight: adaStamp }">
            Diterima Finance
          </div>
          <div v-if="validasi?.status === 'VALID'" class="stamp stamp-valid">
            Divalidasi elektronik<br />{{ validasi.tanggal_fmt }}
          </div>
          <div
            v-else-if="validasi?.status === 'TIDAK_BERLAKU'"
            class="stamp stamp-batal"
          >
            VALIDASI TIDAK BERLAKU
          </div>
          <div class="ttd-name">
            (<template v-if="validasi?.status === 'VALID'">{{
              validasi.nama
            }}</template
            ><span v-else style="display: inline-block; width: 60px"></span>)
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
* {
  box-sizing: border-box;
}
body {
  margin: 0;
}
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100vh;
  font-size: 14px;
  color: #666;
}
.print-page {
  width: 138mm;
  margin: 0 auto;
  padding: 5mm 6mm;
  font-family: Arial, sans-serif;
  font-size: 9pt;
  color: #000;
}
.header-row {
  position: relative;
  height: 34px;
  margin-bottom: 10px;
}
.doc-title-wrapper {
  position: absolute;
  left: 0;
  right: 0;
  top: 50%;
  transform: translateY(-50%);
  text-align: center;
}
.doc-title {
  font-size: 11pt;
  font-weight: bold;
  text-decoration: underline;
}
.logo {
  position: absolute;
  right: 0;
  top: 0;
  height: 28px;
  object-fit: contain;
}
.info-grid {
  display: flex;
  justify-content: space-between;
  margin-bottom: 2px;
}
.info-col {
  width: 48%;
}
.info-row {
  display: flex;
  margin-bottom: 2px;
}
.lbl {
  width: 100px;
  font-weight: normal;
}
.sep {
  width: 10px;
}
.val {
  flex: 1;
}
.detail-table {
  width: 100%;
  border-collapse: collapse;
  border-top: 2px solid #000;
  border-bottom: 1px solid #000;
  margin-bottom: 2px;
}
.detail-table th,
.detail-table td {
  padding: 3px 4px;
}
.detail-table th {
  border-bottom: 1px solid #000;
  font-weight: normal;
}
.tc {
  text-align: center;
}
.tr {
  text-align: right;
}
.footer-table {
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 15px;
  border-bottom: 1px solid #000;
}
.terbilang-col {
  width: 60%;
  padding: 4px;
}
.tot-lbl {
  text-align: right;
  width: 70px;
  padding: 4px;
}
.tot-sep {
  width: 10px;
  text-align: center;
}
.tot-val {
  text-align: right;
  width: 110px;
  padding: 4px;
  font-weight: bold;
}
.bottom-section {
  margin-top: 15px;
}
.ttd-area {
  display: flex;
  gap: 30px;
}
.ttd-col {
  flex: 1;
  text-align: center;
}
.ttd-title {
  margin-bottom: 40px;
}
.ttd-name {
  white-space: nowrap;
}
.toolbar {
  display: flex;
  gap: 8px;
  align-items: center;
  margin-bottom: 10px;
}
.toolbar-note {
  font-size: 8pt;
  color: #777;
}
.ttd-title.tight {
  margin-bottom: 4px;
}
.stamp {
  height: 36px;
  margin-bottom: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  font-size: 7.5pt;
  line-height: 1.2;
  border: 1.5px solid;
  border-radius: 3px;
  padding: 2px 4px;
}
.stamp-valid {
  color: #1b5e20;
  border-color: #1b5e20;
}
.stamp-batal {
  color: #b71c1c;
  border-color: #b71c1c;
  font-weight: bold;
}
@media print {
  @page {
    size: A5;
    margin: 5mm;
  }
  .print-page {
    width: 100%;
    padding: 0;
    margin: 0;
  }
  .no-print {
    display: none !important;
  }
}
</style>
