<template>
  <div class="print-container pa-6">
    <!-- Tombol Aksi Cetak (Disembunyikan saat kertas dicetak) -->
    <div class="d-print-none mb-6 d-flex justify-between align-center">
      <v-btn
        variant="outlined"
        prepend-icon="mdi-arrow-left"
        @click="router.back()"
      >
        Kembali
      </v-btn>
      <v-btn color="primary" prepend-icon="mdi-printer" @click="handlePrint">
        Cetak / Print Dokumen
      </v-btn>
    </div>

    <!-- Area Kertas Cetak -->
    <div v-if="loading" class="text-center py-10">
      <v-progress-circular indeterminate color="primary" />
      <div class="text-caption mt-2">Memuat data cetak...</div>
    </div>

    <div v-else-if="master" class="sheet">
      <!-- KOP SURAT / HEADER DOKUMEN -->
      <div class="d-flex justify-between align-start border-bottom pb-4 mb-4">
        <div>
          <h2 class="text-h6 font-weight-bold text-uppercase">
            BUKTI MUTASI INTERNAL
          </h2>
          <div class="text-subtitle-2 text-grey-darken-2">
            SUB-MODUL SUBLIM / MMT
          </div>
        </div>
        <div class="text-right">
          <div class="text-subtitle-1 font-weight-bold">
            {{ master.Nomor_Mutasi }}
          </div>
          <div class="text-body-2 text-grey-darken-1">
            Tanggal:
            {{
              parseCustomDate(master.Tanggal)
                ? format(parseCustomDate(master.Tanggal)!, "dd/MM/yyyy")
                : master.Tanggal
            }}
          </div>
        </div>
      </div>

      <!-- INFORMASI BAGIAN ASAL & TUJUAN -->
      <v-row dense class="mb-4 text-body-2">
        <v-cols cols="6">
          <table class="info-table">
            <tr>
              <td class="font-weight-bold" style="width: 120px">Bagian Asal</td>
              <td>: {{ getBagianNama(master.Bagian_Asal) }}</td>
            </tr>
            <tr>
              <td class="font-weight-bold">Bagian Tujuan</td>
              <td>: {{ getBagianNama(master.Bagian_Tujuan) }}</td>
            </tr>
          </table>
        </v-cols>
        <v-cols cols="6">
          <table class="info-table">
            <tr>
              <td class="font-weight-bold" style="width: 90px">Keterangan</td>
              <td>: {{ master.Keterangan || "-" }}</td>
            </tr>
          </table>
        </v-cols>
      </v-row>

      <!-- TABEL DETAIL ITEM MUTASI -->
      <table class="print-table mb-6">
        <thead>
          <tr>
            <th class="text-center" style="width: 40px">No</th>
            <th>No. SPK</th>
            <th>PO Internal</th>
            <th class="text-center" style="width: 70px">Size</th>
            <th>Nama Order / SPK</th>
            <th>Komponen</th>
            <th class="text-right" style="width: 90px">Qty Mutasi</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(item, index) in details" :key="index">
            <td class="text-center">{{ index + 1 }}</td>
            <td class="font-weight-bold">{{ item.Nomor_SPK }}</td>
            <td>{{ item.No_PO_Internal || "-" }}</td>
            <td class="text-center">{{ item.Size || "-" }}</td>
            <td>{{ item.Nama_SPK || "-" }}</td>
            <td>{{ item.Nama_Komponen || "ALL SET" }}</td>
            <td class="text-right font-weight-bold">
              {{ Number(item.Qty_Mutasi || 0).toLocaleString("id-ID") }}
            </td>
          </tr>
          <tr v-if="details.length === 0">
            <td colspan="7" class="text-center text-grey py-4">
              Tidak ada data detail item.
            </td>
          </tr>
        </tbody>
        <tfoot>
          <tr class="font-weight-bold bg-grey-lighten-4">
            <td colspan="6" class="text-right">TOTAL KESELURUHAN QTY :</td>
            <td class="text-right">
              {{ Number(totalQty).toLocaleString("id-ID") }}
            </td>
          </tr>
        </tfoot>
      </table>

      <!-- TANDA TANGAN / SIGNATURE AREA -->
      <div class="signature-section pt-8">
        <div class="sig-box text-center">
          <div class="text-caption mb-12">Diserahkan Oleh,</div>
          <div class="font-weight-bold text-decoration-underline">
            ( ........................................ )
          </div>
        </div>
        <div class="sig-box text-center">
          <div class="text-caption mb-12">Mengetahui / Kabag,</div>
          <div class="font-weight-bold text-decoration-underline">
            ( ........................................ )
          </div>
        </div>
        <div class="sig-box text-center">
          <div class="text-caption mb-12">Diterima Oleh,</div>
          <div class="font-weight-bold text-decoration-underline">
            ( ........................................ )
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useToast } from "vue-toastification";
import api from "@/services/api";
import { format } from "date-fns";

const route = useRoute();
const router = useRouter();
const toast = useToast();

const loading = ref(true);
const master = ref<any>(null);
const details = ref<any[]>([]);

const nomorMutasi = route.params.nomor as string;

// Helper parsing tanggal aman
const parseCustomDate = (dateString: any): Date | null => {
  if (!dateString) return null;
  if (dateString instanceof Date)
    return isNaN(dateString.getTime()) ? null : dateString;
  const str = String(dateString).trim();
  if (!str) return null;

  // Format dari API: YYYY-MM-DD (atau YYYY-MM-DD HH:mm:ss)
  const isoMatch = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    const isoDate = new Date(
      Number(isoMatch[1]),
      Number(isoMatch[2]) - 1,
      Number(isoMatch[3]),
    );
    if (!isNaN(isoDate.getTime())) return isoDate;
  }

  const parts = str.split("-");
  if (parts.length === 3) {
    const day = Number(parts[0]);
    const year = Number(parts[2]);
    if (!isNaN(day) && !isNaN(year) && year > 1000) {
      let month = isNaN(Number(parts[1]))
        ? [
            "jan",
            "feb",
            "mar",
            "apr",
            "may",
            "jun",
            "jul",
            "aug",
            "sep",
            "oct",
            "nov",
            "dec",
          ].indexOf(parts[1].toLowerCase().substring(0, 3))
        : Number(parts[1]) - 1;
      if (month >= 0 && month <= 11) {
        const parsedDate = new Date(year, month, day);
        if (!isNaN(parsedDate.getTime())) return parsedDate;
      }
    }
  }
  const fallbackDate = new Date(str);
  return isNaN(fallbackDate.getTime()) ? null : fallbackDate;
};

const getBagianNama = (kode: string) => {
  if (!kode) return "SUBLIM";
  const k = kode.toUpperCase();
  switch (k) {
    case "PTG":
    case "GP001":
      return "POTONG / CUTTING";
    case "JHT":
    case "GJ001":
      return "JAHIT / SEWING";
    case "FIN":
    case "GF001":
      return "FINISHING / QC";
    case "GGD":
    case "GB001":
      return "GUDANG JADI";
    default:
      return k;
  }
};

const totalQty = computed(() => {
  return details.value.reduce(
    (sum, item) => sum + Number(item.Qty_Mutasi || 0),
    0,
  );
});

const fetchData = async () => {
  loading.value = true;
  try {
    const response = await api.get(
      `/mmt/mutasi-internal/detail/${encodeURIComponent(nomorMutasi)}`,
    );
    const resData = response.data?.data ?? response.data;
    if (resData && resData.length > 0) {
      master.value = resData[0];
      details.value = resData;
    } else {
      toast.warning("Data mutasi tidak ditemukan.");
    }
  } catch (error) {
    toast.error("Gagal memuat detail cetak mutasi.");
  } finally {
    loading.value = false;
  }
};

const handlePrint = () => {
  window.print();
};

onMounted(fetchData);
</script>

<style scoped>
.print-container {
  background-color: #f5f5f5;
  min-height: 100vh;
}
.sheet {
  background: white;
  width: 210mm;
  min-height: 297mm;
  margin: 0 auto;
  padding: 15mm;
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
  color: #000;
  font-family: Arial, sans-serif;
  font-size: 11px;
}
.info-table td {
  padding: 2px 4px;
}
.print-table {
  width: 100%;
  border-collapse: collapse;
}
.print-table th,
.print-table td {
  border: 1px solid #333;
  padding: 5px 8px;
  font-size: 11px;
}
.print-table th {
  background-color: #eee !important;
  font-weight: bold;
}
.signature-section {
  display: flex;
  justify-content: space-between;
  margin-top: 40px;
  page-break-inside: avoid;
}
.sig-box {
  width: 30%;
}

@media print {
  .print-container {
    background: white;
    padding: 0 !important;
  }
  .sheet {
    box-shadow: none;
    margin: 0;
    width: 100%;
    padding: 0;
  }
}
</style>
