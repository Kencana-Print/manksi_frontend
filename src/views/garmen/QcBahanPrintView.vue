<script setup lang="ts">
import { ref, onMounted, nextTick } from "vue";
import { useRoute } from "vue-router";
import { useToast } from "vue-toastification";
import {
  qcBahanFormService,
  type QcDetailResponse,
  type QcLampiran,
} from "@/services/garmen/qcBahanFormService";
import api from "@/services/api";

const route = useRoute();
const toast = useToast();
const isLoading = ref(true);
const data = ref<QcDetailResponse | null>(null);

const fotoUrl = ref<Record<"BAHAN" | "TRIMCARD", string>>({
  BAHAN: "",
  TRIMCARD: "",
});
const uploadBase = (api.defaults.baseURL || "").replace(/\/api\/?$/, "");

// Tunggu semua gambar (logo dan foto) selesai dimuat sebelum print
const tungguGambar = () =>
  Promise.all(
    Array.from(document.images).map((img) =>
      img.complete
        ? Promise.resolve()
        : new Promise<void>((resolve) => {
            img.onload = () => resolve();
            img.onerror = () => resolve();
          }),
    ),
  );

const loadData = async () => {
  try {
    const nomor = String(route.params.nomor);
    const res = await qcBahanFormService.getDetail(nomor);
    data.value = res.data.data as QcDetailResponse;

    try {
      const lamp = await qcBahanFormService.getLampiran(nomor);
      for (const l of lamp.data.data as QcLampiran[]) {
        fotoUrl.value[l.Jenis] = `${uploadBase}/uploads/${l.File}`;
      }
    } catch {
      toast.warning("Foto tidak dapat dimuat. Cetak tanpa foto.");
    }

    isLoading.value = false;
    await nextTick();
    await tungguGambar();
    window.print();
  } catch (e) {
    const err = e as { message?: string };
    toast.error("Gagal memuat data cetak: " + (err.message || ""));
  } finally {
    isLoading.value = false;
  }
};
onMounted(loadData);

const bulan = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];
const formatDate = (val?: string) => {
  if (!val) return "-";
  const [y, m, d] = val.substring(0, 10).split("-");
  return `${d} ${bulan[Number(m) - 1]} ${y}`;
};
const numFmt = (v: number | string) =>
  Number(v || 0).toLocaleString("id-ID", { maximumFractionDigits: 2 });
</script>

<template>
  <div v-if="isLoading" class="print-loading">Memuat dokumen...</div>

  <div v-else-if="data" class="print-container">
    <!-- ═══ HALAMAN 1 ═══ -->
    <div class="print-page">
      <div class="print-header">
        <div class="company-info">
          <div class="company-name">CV. Kencana Print</div>
          <div class="company-addr">Padokan RT 04 / 04 Sawahan Ngemplak</div>
          <div class="company-addr">0271-740634</div>
        </div>
        <div class="doc-title-wrap">
          <div class="doc-title">FORM PENGECEKAN BAHAN BAKU</div>
          <div class="doc-no">{{ data.header.qc_nomor }}</div>
        </div>
        <div class="logo-area">
          <img src="@/assets/logo.png" alt="Logo" class="print-logo" />
        </div>
      </div>

      <div class="info-section">
        <table>
          <tr>
            <td width="110">Tgl Datang</td>
            <td>: {{ formatDate(data.header.qc_tgl_datang) }}</td>
            <td width="110">Jenis Kain</td>
            <td>: {{ data.header.qc_jenis_kain }}</td>
          </tr>
          <tr>
            <td>Vendor Greige</td>
            <td>: {{ data.header.qc_vendor_greige || "-" }}</td>
            <td>Vendor Celup</td>
            <td>: {{ data.header.qc_vendor_celup || "-" }}</td>
          </tr>
          <tr>
            <td>No. PO</td>
            <td>: {{ data.header.qc_po_nomor }}</td>
            <td>Catatan</td>
            <td>: {{ data.header.qc_keterangan || "-" }}</td>
          </tr>
        </table>
      </div>

      <table class="detail-table">
        <thead>
          <tr>
            <th rowspan="2" width="24">No</th>
            <th rowspan="2">Lot No.</th>
            <th rowspan="2">PO No.</th>
            <th colspan="2">Qty</th>
            <th colspan="2">Gramasi / Setting PO</th>
            <th rowspan="2">Warna</th>
            <th colspan="2">Hasil Cek</th>
            <th rowspan="2" width="34">Nilai</th>
          </tr>
          <tr>
            <th width="50">{{ data.po?.satuan || "Kg" }}</th>
            <th width="34">Roll</th>
            <th width="62">Gramasi</th>
            <th width="46">Setting</th>
            <th width="52">Gramasi</th>
            <th width="46">Setting</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(d, i) in data.dtl" :key="i">
            <td class="tc">{{ i + 1 }}</td>
            <td class="fw-bold">{{ d.lot }}</td>
            <td>{{ data.header.qc_po_nomor }}</td>
            <td class="tr">{{ numFmt(d.qty_kg) }}</td>
            <td class="tr">{{ numFmt(d.qty_roll) }}</td>
            <td class="tc">{{ d.gramasi_po }}</td>
            <td class="tc">{{ d.setting_po }}</td>
            <td>{{ d.warna }}</td>
            <td class="tr">{{ numFmt(d.gramasi_cek) }}</td>
            <td class="tc">{{ d.setting_cek }}</td>
            <td class="tc fw-bold">{{ d.nilai || "" }}</td>
          </tr>
        </tbody>
        <tfoot>
          <tr>
            <td colspan="3" class="tr fw-bold">TOTAL</td>
            <td class="tr fw-bold">
              {{ numFmt(data.dtl.reduce((s, r) => s + Number(r.qty_kg), 0)) }}
            </td>
            <td class="tr fw-bold">
              {{ numFmt(data.dtl.reduce((s, r) => s + Number(r.qty_roll), 0)) }}
            </td>
            <td colspan="6"></td>
          </tr>
        </tfoot>
      </table>

      <div class="note">
        Nilai 1: Tidak diterima &nbsp;|&nbsp; Nilai 2: Kebijakan (menambah
        jumlah cek) &nbsp;|&nbsp; Nilai 3: Diterima
      </div>

      <div class="section-title">HASIL CEK</div>
      <table class="detail-table">
        <thead>
          <tr>
            <th width="24">No</th>
            <th>Lot No.</th>
            <th>Gramasi</th>
            <th>Setting</th>
            <th>Warna</th>
            <th>Handfeel</th>
            <th>Bowing</th>
            <th>Shrinkage</th>
            <th>Kelunturan</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(d, i) in data.dtl" :key="i">
            <td class="tc">{{ i + 1 }}</td>
            <td class="fw-bold">{{ d.lot }}</td>
            <td>{{ d.hasil.gramasi }}</td>
            <td>{{ d.hasil.setting }}</td>
            <td>{{ d.hasil.warna }}</td>
            <td>{{ d.hasil.handfeel }}</td>
            <td>{{ d.hasil.bowing }}</td>
            <td>{{ d.hasil.shrinkage }}</td>
            <td>{{ d.hasil.kelunturan }}</td>
          </tr>
        </tbody>
      </table>

      <div class="section-title">DOKUMENTASI FOTO</div>
      <table class="foto-table">
        <thead>
          <tr>
            <th>Foto Bahan Datang</th>
            <th>Foto TRIMCARD Pembanding</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td class="foto-cell">
              <img
                v-if="fotoUrl.BAHAN"
                :src="fotoUrl.BAHAN"
                class="foto-img"
                alt=""
              />
              <span v-else class="foto-kosong"
                >(tempel / lampirkan foto di sini)</span
              >
            </td>
            <td class="foto-cell">
              <img
                v-if="fotoUrl.TRIMCARD"
                :src="fotoUrl.TRIMCARD"
                class="foto-img"
                alt=""
              />
              <span v-else class="foto-kosong"
                >(tempel / lampirkan foto di sini)</span
              >
            </td>
          </tr>
        </tbody>
      </table>

      <div class="print-footer">
        <div class="sign-box">
          <div>Dibuat Oleh (Petugas Gudang),</div>
          <div class="sign-space"></div>
          <div>( {{ data.header.user_create }} )</div>
        </div>
        <div class="sign-box">
          <div>Diketahui Oleh (SPV / Manager Gudang),</div>
          <div class="sign-space"></div>
          <div>( .................... )</div>
        </div>
      </div>

      <div class="print-meta">Printed at {{ new Date().toLocaleString() }}</div>
    </div>

    <!-- ═══ HALAMAN 2: KEPUTUSAN ═══ -->
    <div class="print-page page-2">
      <div class="print-header">
        <div class="doc-title-wrap">
          <div class="doc-title">KEPUTUSAN PENGECEKAN BAHAN</div>
          <div class="doc-no">
            {{ data.header.qc_nomor }} &mdash; {{ data.header.qc_jenis_kain }}
          </div>
        </div>
      </div>

      <div class="section-title">KEPUTUSAN PER LOT</div>
      <table class="detail-table">
        <thead>
          <tr>
            <th width="24">No</th>
            <th>Lot No.</th>
            <th width="40">Nilai</th>
            <th>Lanjut Produksi</th>
            <th>Reject</th>
            <th>Tunda</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(d, i) in data.dtl" :key="i">
            <td class="tc">{{ i + 1 }}</td>
            <td class="fw-bold">{{ d.lot }}</td>
            <td class="tc">{{ d.nilai || "" }}</td>
            <td class="tc">{{ d.keputusan === "LANJUT" ? "☑" : "☐" }}</td>
            <td class="tc">{{ d.keputusan === "REJECT" ? "☑" : "☐" }}</td>
            <td class="tc">{{ d.keputusan === "TUNDA" ? "☑" : "☐" }}</td>
          </tr>
        </tbody>
      </table>

      <div class="box">
        <div class="box-title">Validasi dan keputusan Pembelian</div>
        <div class="box-sub">
          Catatan / pertimbangan Pembelian (hasil konfirmasi dengan klien):
        </div>
        <div class="box-body"></div>
        <div class="sign-row">
          <div class="sign-box">
            <div>Divalidasi Oleh (Tim Pembelian),</div>
            <div class="sign-space"></div>
            <div>
              ( {{ data.pengesah?.pembelian || "...................." }} )
            </div>
            <div class="small">
              Tanggal:
              {{
                data.pengesah?.tgl_pembelian
                  ? formatDate(data.pengesah.tgl_pembelian)
                  : "____________"
              }}
            </div>
          </div>
          <div class="sign-box">
            <div>Disetujui / Eskalasi Oleh (Direksi),</div>
            <div class="sign-space"></div>
            <div>( .................... )</div>
            <div class="small">
              Diisi jika keputusan TUNDA. Tanggal: ________
            </div>
          </div>
        </div>
      </div>

      <div class="box">
        <div class="box-title">Tindak lanjut PPIC (Trimcard)</div>
        <div class="box-sub">Diisi oleh PPIC jika keputusan LANJUT:</div>
        <div class="check-line">
          ☐ TRIMCARD telah diperbarui sesuai bahan yang divalidasi
        </div>
        <div class="check-line">☐ TRIMCARD lama telah disimpan / diganti</div>
        <div class="box-sub" style="margin-top: 8px">Catatan PPIC:</div>
        <div class="box-body" style="height: 40px"></div>
      </div>
      <div class="ttd-wrap">
        <div class="ttd-left">
          <div class="ttd-title">Diterima &amp; Diproses Oleh — Tim PPIC</div>
          <div class="ttd-line">
            Nama &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;:
            <span class="fill" style="width: 5.2cm"></span>
          </div>
          <div class="ttd-line">
            Jabatan :
            <span class="fill" style="width: 5.2cm"></span>
          </div>
          <div class="ttd-line" style="margin-top: 8px">Tanda Tangan:</div>
          <div class="sign-space" style="height: 38px"></div>
          <div class="ttd-line">
            ( <span class="fill" style="width: 5cm"></span> )
          </div>
          <div class="ttd-line">
            Tanggal Terima:
            <span class="fill" style="width: 3.2cm"></span>
          </div>
        </div>
        <div class="ttd-right">
          <div class="ttd-title">Distribusi Form (CC):</div>
          <div class="ttd-line">
            ☐ Gudang (Asli / Original — retur jika REJECT)
          </div>
          <div class="ttd-line">☐ Pembelian (Tembusan 1)</div>
          <div class="ttd-line">☐ PPIC (Tembusan 2)</div>
          <div class="ttd-note">Diarsipkan oleh Admin Gudang</div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.print-loading {
  padding: 40px;
  text-align: center;
  font-family: sans-serif;
}
.print-container {
  width: 21cm;
  margin: 0 auto;
  background: #525659;
  padding: 20px 0;
}
.print-page {
  width: 21cm;
  min-height: 29.7cm;
  padding: 1cm;
  background: white;
  color: black;
  font-family: Arial, sans-serif;
  font-size: 9pt;
  box-sizing: border-box;
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.5);
  margin-bottom: 10px;
}
.print-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 10px;
}
.company-name {
  font-weight: bold;
  font-size: 11pt;
}
.company-addr {
  font-size: 8pt;
}
.doc-title-wrap {
  text-align: center;
  flex: 1;
}
.doc-title {
  font-weight: bold;
  font-size: 13pt;
  text-decoration: underline;
}
.doc-no {
  font-size: 9pt;
  margin-top: 2px;
}
.print-logo {
  height: 35px;
}
.info-section table {
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 8px;
}
.info-section td {
  vertical-align: top;
  padding: 1px 0;
}
.detail-table {
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 6px;
}
.detail-table th,
.detail-table td {
  border: 1px solid black;
  padding: 3px 5px;
}
.detail-table th {
  background: #f0f0f0;
  font-size: 8pt;
  text-transform: uppercase;
}
.tc {
  text-align: center !important;
}
.tr {
  text-align: right !important;
}
.fw-bold {
  font-weight: bold;
}
.note {
  font-size: 8pt;
  margin: 2px 0 8px;
}
.section-title {
  font-weight: bold;
  font-size: 10pt;
  margin: 8px 0 4px;
}
.foto-table {
  width: 100%;
  border-collapse: collapse;
  table-layout: fixed;
}
.foto-table th {
  border: 1px solid black;
  background: #f0f0f0;
  font-size: 8pt;
  padding: 3px 5px;
}
.foto-cell {
  border: 1px solid black;
  height: 5.5cm;
  text-align: center;
  vertical-align: middle;
  padding: 4px;
}
.foto-img {
  max-width: 100%;
  max-height: 5.2cm;
  object-fit: contain;
}
.foto-kosong {
  font-size: 8pt;
  color: #888;
}
.print-footer,
.sign-row {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  margin-top: 14px;
}
.sign-box {
  text-align: center;
  width: 48%;
}
.sign-space {
  height: 45px;
  border-bottom: 1px dashed #ccc;
  margin-bottom: 5px;
}
.small {
  font-size: 7.5pt;
  margin-top: 3px;
}
.print-meta {
  font-size: 7pt;
  color: #666;
  font-style: italic;
  margin-top: 8px;
}
.box {
  border: 1px solid black;
  margin-top: 12px;
  padding: 8px;
}
.box-title {
  font-weight: bold;
  background: #e0e0e0;
  margin: -8px -8px 6px;
  padding: 4px 8px;
  text-transform: uppercase;
  font-size: 8.5pt;
}
.box-sub {
  font-size: 8.5pt;
  font-weight: bold;
}
.box-body {
  border: 1px solid #888;
  height: 70px;
  margin-top: 4px;
}
.check-line {
  margin-top: 4px;
}
.ttd-wrap {
  display: flex;
  border: 1px solid black;
  margin-top: 12px;
  font-size: 8.5pt;
}
.ttd-left,
.ttd-right {
  flex: 1;
  padding: 8px;
}
.ttd-left {
  border-right: 1px solid black;
}
.ttd-title {
  font-weight: bold;
  margin-bottom: 6px;
}
.ttd-line {
  margin-top: 4px;
}
.fill {
  display: inline-block;
  border-bottom: 1px solid black;
  height: 10px;
}
.ttd-note {
  font-size: 7.5pt;
  color: #777;
  margin-top: 10px;
}

@media print {
  body {
    background: white;
  }
  .print-container {
    width: 100%;
    padding: 0;
    background: none;
  }
  .print-page {
    box-shadow: none;
    margin: 0;
    width: 100%;
    min-height: auto;
  }
  .page-2 {
    page-break-before: always;
  }
  @page {
    size: A4 portrait;
    margin: 0;
  }
}
</style>
