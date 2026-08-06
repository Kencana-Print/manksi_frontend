<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useRoute } from "vue-router";
import { useToast } from "vue-toastification";
import { poDtfService } from "@/services/garmen/poDtfService";
import api from "@/services/api";
import logoUrl from "@/assets/logo.png";

const route = useRoute();
const toast = useToast();
const nomor = computed(() => route.params.nomor as string);

const isLoading = ref(true);
const data = ref<any>(null);

const BULAN_PENDEK = [
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
const fmtDate = (v: string) => {
  if (!v) return "-";
  const s = String(v).substring(0, 10);
  const [y, m, d] = s.split("-");
  if (!y || !m || !d) return v;
  return `${d} ${BULAN_PENDEK[Number(m) - 1]} ${y}`;
};

const num = (v: any) => Number(v ?? 0).toLocaleString("id-ID");

const getBaseUrl = () => {
  const rawBase = api.defaults.baseURL || import.meta.env.VITE_API_URL || "";
  return rawBase.replace(/\/api\/?$/, "");
};

// ⚠️ Prioritas gambar — persis script Picture1OnBeforePrint di .fr3:
// 1) filegambar='YA' → path+nomor+spk+idgambar (upload khusus PO ini)
// 2) foto='YA' → path+spk (gambar desain asli SPK)
// 3) noimage.jpg
// Diadaptasi jadi candidate-chain via @error, sama pola SalesOrderPrintView.
const buildCandidates = (row: any, cab: string): string[] => {
  const base = getBaseUrl();
  const list: string[] = [];
  if (row.uploadedImageUrl) list.push(row.uploadedImageUrl);
  list.push(
    `${base}/images/${cab || "HO-"}/map/${encodeURIComponent(row.spk)}.jpg`,
  );
  list.push(
    `${base}/images/${cab || "HO-"}/${encodeURIComponent(row.spk)}.jpg`,
  );
  list.push(`/file-gambar/${encodeURIComponent(row.spk)}.jpg`);
  return list;
};

const getRowImageSrc = (row: any, cab: string) => buildCandidates(row, cab)[0];

const handleRowImgError = (e: Event, row: any, cab: string) => {
  const img = e.target as HTMLImageElement;
  const candidates = buildCandidates(row, cab);
  const step = Number(img.dataset.step || "0") + 1;
  if (step < candidates.length) {
    img.dataset.step = String(step);
    img.src = candidates[step];
  } else {
    img.style.display = "none";
  }
};

const loadData = async () => {
  isLoading.value = true;
  try {
    const res = await poDtfService.getPrintData(nomor.value);
    data.value = res.data.data;
  } catch (e: any) {
    toast.error(e.response?.data?.message || "Data tidak ditemukan.");
  } finally {
    isLoading.value = false;
  }
};

onMounted(loadData);

const doPrint = () => window.print();
</script>

<template>
  <div class="print-page-wrap">
    <div v-if="isLoading" class="loading-state">Memuat data cetak...</div>

    <template v-else-if="data">
      <button class="print-btn no-print" @click="doPrint">🖨️ Cetak</button>

      <div class="print-sheet">
        <!-- KOP SURAT -->
        <div class="kop">
          <div class="kop-left">
            <div class="kop-company">{{ data.perush_nama }}</div>
            <div class="kop-line">
              {{ data.perush_alamat }}, {{ data.perush_kota }}
            </div>
            <div class="kop-line">
              {{ data.perush_telp
              }}<template v-if="data.perush_fax"
                >/{{ data.perush_fax }}</template
              >
            </div>
          </div>
          <div class="kop-right">
            <img :src="logoUrl" alt="Logo Perusahaan" class="kop-logo" />
          </div>
        </div>

        <div class="doc-title">PO DTF</div>

        <!-- Info 2 kolom -->
        <div class="info-wrap">
          <table class="itbl">
            <tr>
              <td class="info-label">Nomor PO</td>
              <td>:</td>
              <td>{{ data.pjh_nomor }}</td>
            </tr>
            <tr>
              <td class="info-label">Tanggal</td>
              <td>:</td>
              <td>{{ fmtDate(data.pjh_tanggal) }}</td>
            </tr>
            <tr>
              <td class="info-label">Deadline</td>
              <td>:</td>
              <td>{{ fmtDate(data.pjh_dateline) }}</td>
            </tr>
            <tr>
              <td class="info-label">Keterangan</td>
              <td>:</td>
              <td>{{ data.pjh_ket }}</td>
            </tr>
          </table>

          <table class="itbl">
            <tr>
              <td class="info-label">Asal PO</td>
              <td>:</td>
              <td>{{ data.pjh_cab }}</td>
            </tr>
            <tr>
              <td class="info-label">Tujuan/Supplier</td>
              <td>:</td>
              <td>
                <div class="sup-nama">{{ data.sup_nama }}</div>
                <div class="sup-alamat">{{ data.sup_alamat }}</div>
              </td>
            </tr>
          </table>
        </div>

        <!-- Tabel detail -->
        <table class="detail-table">
          <thead>
            <tr>
              <th style="width: 26px">No</th>
              <th style="min-width: 120px">Nama Desain</th>
              <th style="width: 70px">Ukuran</th>
              <th style="width: 70px">Bahan</th>
              <th style="width: 110px; text-align: center">Desain</th>
              <th style="width: 60px">Jml</th>
              <th style="width: 80px">Ket</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(d, i) in data.details" :key="i">
              <td class="tc">{{ Number(i) + 1 }}</td>
              <td>{{ d.nama }}</td>
              <td class="tc">{{ d.ukuran }}</td>
              <td class="tc">{{ d.bahan }}</td>
              <td class="tc img-cell">
                <img
                  :src="getRowImageSrc(d, data.pjh_cab)"
                  class="row-img"
                  @error="handleRowImgError($event, d, data.pjh_cab)"
                />
              </td>
              <td class="tr">
                {{ num(d.jumlah) }}
                <div v-if="d.jmlLayout" class="jml-layout">
                  {{ d.jmlLayout }}
                </div>
              </td>
              <td>{{ d.ket }}</td>
            </tr>
          </tbody>
        </table>

        <!-- Signature -->
        <div class="signature-row">
          <div class="sig-col">
            <div>Pengirim,</div>
            <div class="sig-space"></div>
            <div>( &nbsp; )</div>
          </div>
          <div class="sig-col">
            <div>Penerima,</div>
            <div class="sig-space"></div>
            <div>( &nbsp; )</div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.print-page-wrap {
  background: #eee;
  min-height: 100vh;
  padding: 24px 0;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.loading-state {
  padding: 60px;
  color: #757575;
}
.print-btn {
  margin-bottom: 12px;
  height: 34px;
  padding: 0 16px;
  border: none;
  border-radius: 4px;
  background: #1565c0;
  color: white;
  font-weight: 600;
  cursor: pointer;
}
.print-sheet {
  width: 210mm;
  min-height: 297mm;
  background: white;
  padding: 15mm 12mm;
  box-shadow: 0 0 6px rgba(0, 0, 0, 0.25);
  font-family: Arial, sans-serif;
  font-size: 12px;
  color: #1a1a5e;
  box-sizing: border-box;
}
.kop {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  border-bottom: 2px solid #1a1a5e;
  padding-bottom: 8px;
  margin-bottom: 8px;
}
.kop-company {
  font-weight: 700;
  font-size: 13px;
  color: #000;
}
.kop-line {
  font-size: 11px;
}
.kop-logo {
  height: 42px;
}
.doc-title {
  font-size: 16px;
  font-weight: 700;
  color: #000;
  margin-bottom: 10px;
}
.info-wrap {
  display: flex;
  justify-content: space-between;
  gap: 20px;
  margin-bottom: 10px;
}
.itbl {
  font-size: 12px;
}
.info-label {
  width: 100px;
  padding: 1px 6px 1px 0;
  vertical-align: top;
}
.sup-nama {
  font-weight: 700;
}
.sup-alamat {
  font-size: 11px;
}
.detail-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 11px;
}
.detail-table th {
  border: 1px solid #1a1a5e;
  padding: 5px 6px;
  text-align: left;
  font-weight: 700;
  background: #f5f5f5;
}
.detail-table td {
  padding: 5px 6px;
  border-left: 1px solid #1a1a5e;
  border-right: 1px solid #1a1a5e;
  border-bottom: 1px solid #1a1a5e;
  vertical-align: middle;
}
.tc {
  text-align: center;
}
.tr {
  text-align: right;
}
.jml-layout {
  font-size: 10px;
  color: #555;
  font-weight: 400;
}
.img-cell {
  padding: 4px !important;
}
.row-img {
  max-width: 110px;
  max-height: 90px;
  object-fit: contain;
}
.signature-row {
  display: flex;
  gap: 60px;
  margin-top: 30px;
  text-align: left;
  font-size: 12px;
}
.sig-col {
  min-width: 130px;
}
.sig-space {
  height: 45px;
}

@media print {
  .print-page-wrap {
    background: white;
    padding: 0;
    display: block;
  }
  .no-print {
    display: none !important;
  }
  .print-sheet {
    box-shadow: none;
    width: 100%;
    min-height: 0;
    margin: 0;
  }
  @page {
    size: A4;
    margin: 0;
  }
}
</style>
