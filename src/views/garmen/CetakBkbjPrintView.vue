<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useRoute } from "vue-router";
import { cetakBkbjService as svc } from "@/services/garmen/cetakBkbjService";
import { formatTanggalLongExport } from "@/utils/dateFormat";

const route = useRoute();

const isLoading = ref(true);
const errorMsg = ref("");

const header = ref<any>(null);
const details = ref<any[]>([]);
const perusahaan = ref<any>(null);

const num = (v: any) =>
  Number(v || 0).toLocaleString("id-ID", { maximumFractionDigits: 0 });

const fetchPrintData = async () => {
  const gudang = String(route.query.gudang || "");
  const tanggal = String(route.query.tanggal || "");
  const expedisi = String(route.query.expedisi || "");

  if (!gudang || !tanggal) {
    errorMsg.value = "Parameter gudang/tanggal tidak lengkap.";
    isLoading.value = false;
    return;
  }

  try {
    const res = await svc.getPrintData(gudang, tanggal, expedisi);
    header.value = res.data.data.header;
    details.value = res.data.data.details ?? [];
    perusahaan.value = res.data.data.perusahaan;
  } catch (e: any) {
    errorMsg.value = e.response?.data?.message || "Gagal memuat data cetak.";
  } finally {
    isLoading.value = false;
  }
};

const doPrint = () => window.print();
const closeWindow = () => window.close();

onMounted(fetchPrintData);
</script>

<template>
  <div class="print-wrap">
    <!-- Toolbar - hidden saat print -->
    <div class="toolbar no-print">
      <button class="btn-close" @click="closeWindow">Tutup</button>
      <button
        class="btn-print"
        :disabled="isLoading || !!errorMsg"
        @click="doPrint"
      >
        Cetak (Ctrl+P)
      </button>
    </div>

    <div v-if="isLoading" class="state-msg">Memuat data...</div>
    <div v-else-if="errorMsg" class="state-msg err">{{ errorMsg }}</div>

    <!-- Halaman A4, 2 kolom side-by-side (ASLI | COPY) -->
    <!-- ⚠️ pola table-layout: fixed + colgroup mengikuti konvensi print 2-kolom (Layout Proses SPK) -->
    <table v-else class="page-table">
      <colgroup>
        <col style="width: 50%" />
        <col style="width: 50%" />
      </colgroup>
      <tbody>
        <tr>
          <td class="col-cell">
            <div class="lembar">
              <span class="watermark">ASLI</span>
              <div class="lembar-inner">
                <!-- Header perusahaan -->
                <div class="hd-row">
                  <div class="hd-left">
                    <div class="perush-nama">
                      {{ perusahaan?.perush_nama || "-" }}
                    </div>
                    <div class="perush-alamat">
                      {{ perusahaan?.perush_alamat || ""
                      }}<span v-if="perusahaan?.perush_kota"
                        >, {{ perusahaan.perush_kota }}</span
                      ><br />
                      <span
                        v-if="perusahaan?.perush_telp || perusahaan?.perush_fax"
                      >
                        {{ perusahaan?.perush_telp || ""
                        }}<span
                          v-if="
                            perusahaan?.perush_telp && perusahaan?.perush_fax
                          "
                          >/</span
                        >{{ perusahaan?.perush_fax || "" }}
                      </span>
                    </div>
                  </div>

                  <img src="@/assets/logo.png" class="logo" alt="logo" />
                </div>

                <div class="title">BUKTI KELUAR BARANG JADI</div>

                <div class="meta-row">
                  <div class="meta-left">
                    <span>No.Permintaan</span>
                    <span>:</span>
                    <b>{{ header?.Nomor }}</b>
                  </div>
                  <div class="meta-right">
                    Surakarta, {{ formatTanggalLongExport(header?.DateCreate) }}
                  </div>
                </div>

                <div class="meta-row">
                  <div class="meta-left">
                    <span>Dengan hormat,</span>
                  </div>
                </div>
                <div class="meta-row">
                  <span
                    >Dengan ini kami kirimkan barang-barang tsb, dibawah
                    ini:</span
                  >
                </div>
                <div class="meta-row">
                  <div class="meta-left">
                    <span>Kepada Yth</span>
                    <span>:</span>
                    <b>{{ header?.Expedisi }}</b>
                  </div>
                </div>

                <!-- Tabel detail -->
                <table class="dtl-table">
                  <colgroup>
                    <col style="width: 8%" />
                    <col style="width: 22%" />
                    <col style="width: 40%" />
                    <col style="width: 15%" />
                    <col style="width: 15%" />
                  </colgroup>
                  <thead>
                    <tr>
                      <th>No</th>
                      <th>Kode</th>
                      <th>Nama</th>
                      <th>Jumlah</th>
                      <th>Koli</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="(d, idx) in details" :key="idx">
                      <td class="tc">{{ idx + 1 }}</td>
                      <td>{{ d.Kode }}</td>
                      <td>{{ d.Nama }}</td>
                      <td class="tc">{{ num(d.Jumlah) }}</td>
                      <td class="tc">{{ num(d.Koli) }}</td>
                    </tr>
                  </tbody>
                </table>

                <div class="ttd-row">
                  <div class="ttd-box">
                    Diterima dengan baik,<br /><br /><br />
                    (
                    &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
                    )
                  </div>
                  <div class="ttd-box">
                    Hormat kami,<br /><br /><br />
                    (
                    &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
                    )
                  </div>
                </div>
              </div>
            </div>
          </td>

          <td class="col-cell">
            <div class="lembar">
              <span class="watermark">COPY</span>
              <div class="lembar-inner">
                <div class="hd-row">
                  <div class="hd-left">
                    <div class="perush-nama">
                      {{ perusahaan?.perush_nama || "-" }}
                    </div>
                    <div class="perush-alamat">
                      {{ perusahaan?.perush_alamat || ""
                      }}<span v-if="perusahaan?.perush_kota"
                        >, {{ perusahaan.perush_kota }}</span
                      ><br />
                      <span
                        v-if="perusahaan?.perush_telp || perusahaan?.perush_fax"
                      >
                        {{ perusahaan?.perush_telp || ""
                        }}<span
                          v-if="
                            perusahaan?.perush_telp && perusahaan?.perush_fax
                          "
                          >/</span
                        >{{ perusahaan?.perush_fax || "" }}
                      </span>
                    </div>
                  </div>
                  <img src="@/assets/logo.png" class="logo" alt="logo" />
                </div>

                <div class="title">BUKTI KELUAR BARANG JADI</div>

                <div class="meta-row">
                  <div class="meta-left">
                    <span>No.Permintaan</span>
                    <span>:</span>
                    <b>{{ header?.Nomor }}</b>
                  </div>
                  <div class="meta-right">
                    Surakarta, {{ formatTanggalLongExport(header?.DateCreate) }}
                  </div>
                </div>

                <div class="meta-row">
                  <div class="meta-left">
                    <span>Dengan hormat,</span>
                  </div>
                </div>
                <div class="meta-row">
                  <span
                    >Dengan ini kami kirimkan barang-barang tsb, dibawah
                    ini:</span
                  >
                </div>
                <div class="meta-row">
                  <div class="meta-left">
                    <span>Kepada Yth</span>
                    <span>:</span>
                    <b>{{ header?.Expedisi }}</b>
                  </div>
                </div>

                <table class="dtl-table">
                  <colgroup>
                    <col style="width: 8%" />
                    <col style="width: 22%" />
                    <col style="width: 40%" />
                    <col style="width: 15%" />
                    <col style="width: 15%" />
                  </colgroup>
                  <thead>
                    <tr>
                      <th>No</th>
                      <th>Kode</th>
                      <th>Nama</th>
                      <th>Jumlah</th>
                      <th>Koli</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="(d, idx) in details" :key="idx">
                      <td class="tc">{{ idx + 1 }}</td>
                      <td>{{ d.Kode }}</td>
                      <td>{{ d.Nama }}</td>
                      <td class="tc">{{ num(d.Jumlah) }}</td>
                      <td class="tc">{{ num(d.Koli) }}</td>
                    </tr>
                  </tbody>
                </table>

                <div class="ttd-row">
                  <div class="ttd-box">
                    Diterima dengan baik,<br /><br /><br />
                    (
                    &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
                    )
                  </div>
                  <div class="ttd-box">
                    Hormat kami,<br /><br /><br />
                    (
                    &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
                    )
                  </div>
                </div>
              </div>
            </div>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<style scoped>
.print-wrap {
  background: #e0e0e0;
  min-height: 100vh;
  padding: 12px;
}

.toolbar {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-bottom: 10px;
}
.btn-print,
.btn-close {
  padding: 6px 16px;
  border: none;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
}
.btn-print {
  background: #1565c0;
  color: white;
}
.btn-print:disabled {
  background: #90a4ae;
  cursor: not-allowed;
}
.btn-close {
  background: #eceff1;
  color: #333;
}

.state-msg {
  text-align: center;
  padding: 40px;
  font-size: 13px;
  color: #555;
  background: white;
}
.state-msg.err {
  color: #c62828;
}

/* WAJIB table-layout: fixed + colgroup supaya 2 kolom tidak tumpang tindih */
.page-table {
  width: 100%;
  max-width: 1122px; /* ~ 297mm landscape A4 di 96dpi, sesuaikan kalau portrait */
  margin: 0 auto;
  border-collapse: collapse;
  table-layout: fixed;
  background: white;
}
.col-cell {
  vertical-align: top;
  padding: 0;
}
.col-cell:first-child {
  border-right: 1px dashed #999;
}

.lembar {
  position: relative;
  padding: 14px 12px;
  font-family: "Calibri", sans-serif;
  font-size: 11px;
  color: #000;
  min-height: 500px;
}

.watermark {
  position: absolute;
  top: 45%;
  left: 50%;
  transform: translate(-50%, -50%) rotate(-30deg);
  font-size: 64px;
  font-weight: 800;
  color: rgba(0, 0, 0, 0.08);
  pointer-events: none;
  white-space: nowrap;
  z-index: 0;
}

.lembar-inner {
  position: relative;
  z-index: 1;
}

.hd-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 4px;
}
.perush-nama {
  font-weight: 700;
  font-size: 13px;
  color: #c62828;
}
.perush-alamat {
  font-size: 9px;
  color: #333;
  max-width: 260px;
}
.logo {
  height: 32px;
  object-fit: contain;
}

.title {
  text-align: center;
  font-weight: 700;
  font-size: 12px;
  margin: 8px 0 10px;
  text-decoration: underline;
}

.meta-row {
  display: flex;
  justify-content: space-between;
  margin-bottom: 3px;
  font-size: 10.5px;
}
.meta-left {
  display: flex;
  gap: 4px;
}
.meta-left span:first-child {
  min-width: 78px;
}

.dtl-table {
  width: 100%;
  border-collapse: collapse;
  table-layout: fixed;
  margin-top: 8px;
  font-size: 10px;
}
.dtl-table th {
  border: 1px solid #333;
  padding: 3px 4px;
  background: #f0f0f0;
  font-weight: 700;
  white-space: normal;
}
.dtl-table td {
  border: 1px solid #333;
  padding: 3px 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.dtl-table td.tc {
  text-align: center;
}

.ttd-row {
  display: flex;
  justify-content: space-between;
  margin-top: 24px;
  font-size: 10.5px;
}
.ttd-box {
  width: 45%;
}

/* ── PRINT ── */
@media print {
  .no-print {
    display: none !important;
  }
  .print-wrap {
    background: white;
    padding: 0;
  }
  .page-table {
    max-width: 100%;
  }
  @page {
    size: A4 landscape;
    margin: 5mm;
  }
}
</style>
