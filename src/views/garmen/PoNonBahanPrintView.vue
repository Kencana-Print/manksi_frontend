<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useRoute } from "vue-router";
import { poNonBahanFormService } from "@/services/garmen/poNonBahanFormService";

const route = useRoute();
const reportData = ref<any[]>([]);
const master = ref<any>({});
const isLoading = ref(true);

const BULAN = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "Mei",
  "Jun",
  "Jul",
  "Agu",
  "Sep",
  "Okt",
  "Nov",
  "Des",
];
const formatDateDisplay = (val: string) => {
  if (!val) return "";
  const d = new Date(val);
  if (isNaN(d.getTime())) return val;
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
};
const fmt = (val: any) =>
  Number(val || 0).toLocaleString("id-ID", { maximumFractionDigits: 2 });

const fetchData = async () => {
  try {
    const res = await poNonBahanFormService.getDetail(
      route.params.nomor as string,
    );
    const { header, detail } = res.data.data;

    master.value = {
      po_jenis: header.po_jenis,
      po_nomor: header.po_nomor,
      po_tanggal: header.po_tanggal,
      po_ket: header.po_ket,
      // ASUMSI nama field, sesuaikan dengan service kamu
      cabang: header.po_cab || header.po_cabang || header.cab || "",
      kurs: header.po_kurs || header.kurs || "",
      vendor:
        header.sup_nama ||
        header.Supplier ||
        header.po_sup_nama ||
        header.po_sup ||
        "",
      usr: header.user_create || header.Usr || "",
    };

    reportData.value = detail.map((item: any) => {
      const qty = Number(item.pod_jumlah ?? item.jumlah ?? 0);
      const harga = Number(item.pod_harga ?? item.harga ?? 0);
      const ppnPct = Number(item.pod_ppn ?? item.ppn ?? 0); // ASUMSI: persen
      const subtotal = qty * harga;
      return {
        kode: item.pod_brg_kode || item.Kode,
        nama: item.Nama,
        satuan: item.Satuan,
        qty,
        harga,
        ppnPct,
        subtotal,
        ppnNilai: (subtotal * ppnPct) / 100,
      };
    });
  } catch (error) {
    console.error("Gagal memuat data cetak PO:", error);
  } finally {
    isLoading.value = false;
    setTimeout(() => window.print(), 500);
  }
};

const totalSub = computed(() =>
  reportData.value.reduce((s, i) => s + i.subtotal, 0),
);
const totalPpn = computed(() =>
  reportData.value.reduce((s, i) => s + i.ppnNilai, 0),
);
const grandTotal = computed(() => totalSub.value + totalPpn.value);

onMounted(fetchData);
</script>

<template>
  <div class="po" v-if="!isLoading">
    <div class="top-bar">Purchase Order</div>

    <div class="head">
      <div class="head-left">
        <div class="comp-name">CV. KENCANA PRINT</div>
        <div class="small">Padokan, RT. 04 / RW. 04, Sawahan</div>
        <div class="small">Ngempak Boyolali</div>
        <div class="small">Telp 0271-740634 Fax 0271-740634</div>
        <div class="small">NPWP 02.765.779.0-527.000</div>
      </div>
      <div class="head-right">
        <div class="big-title">Purchase Order</div>
        <div class="meta">
          <div class="meta-row">
            <span class="ml">Date</span
            ><span class="mv">{{ formatDateDisplay(master.po_tanggal) }}</span>
          </div>
          <div class="meta-row">
            <span class="ml">P.O. Number</span
            ><span class="mv">{{ master.po_nomor }}</span>
          </div>
          <div class="meta-row">
            <span class="ml">Order from</span
            ><span class="mv">{{ master.cabang }}</span>
          </div>
        </div>
      </div>
    </div>

    <div class="vendor-bar">Vendor</div>
    <div class="vendor-name">{{ master.vendor }}</div>

    <table class="tbl">
      <thead>
        <tr>
          <th style="width: 70px">Code</th>
          <th>Product Name/Description</th>
          <th style="width: 110px">Quantity</th>
          <th style="width: 110px">Unit Price</th>
          <th style="width: 120px">Total</th>
        </tr>
      </thead>
      <tbody>
        <template v-for="(it, i) in reportData" :key="i">
          <tr class="item-row">
            <td class="tc">{{ it.kode }}</td>
            <td>
              <div class="nm">{{ it.nama }}</div>
              <div v-if="it.ppnPct > 0" class="ppn-line">
                PPN {{ it.ppnPct }}%
              </div>
            </td>
            <td class="qty">
              <span class="qty-n">{{ fmt(it.qty) }}</span>
              <span class="qty-u">{{ it.satuan }}</span>
            </td>
            <td class="tr">{{ fmt(it.harga) }}</td>
            <td class="tr">
              <div>{{ fmt(it.subtotal) }}</div>
              <div v-if="it.ppnPct > 0" class="ppn-line">
                {{ fmt(it.ppnNilai) }}
              </div>
            </td>
          </tr>
        </template>
        <tr class="fill">
          <td></td>
          <td></td>
          <td></td>
          <td></td>
          <td></td>
        </tr>
      </tbody>
      <tfoot>
        <tr>
          <td colspan="3" class="no-b"></td>
          <td class="total-lbl">TOTAL</td>
          <td class="tr total-val">{{ fmt(grandTotal) }}</td>
        </tr>
      </tfoot>
    </table>

    <div v-if="master.kurs" class="kurs">
      <span>KURS</span><span class="kurs-v">{{ master.kurs }}</span>
    </div>

    <div class="ket-box">{{ master.po_ket }}</div>

    <div class="notes">
      <div class="notes-h">Notes and Instructions</div>
      <div class="notes-b">
        <b>alamat pengiriman di:</b><br />
        CV Kencana Print<br />
        Jeron RT01 RW03 Demen, Jeron, Nogosari<br />
        Boyolali, Jawa Tengah
      </div>
    </div>

    <div class="sign">
      <div class="sign-space"></div>
      <div class="sign-name">{{ master.usr }}</div>
      <div class="sign-role">Purchasing</div>
    </div>
  </div>
</template>

<style scoped>
.po {
  --navy: #0b3d66;
  width: 210mm;
  margin: 0 auto;
  background: #fff;
  color: #000;
  font-family: Arial, sans-serif;
  font-size: 11px;
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
}
.top-bar {
  background: var(--navy);
  color: #fff;
  font-size: 26px;
  font-weight: 700;
  padding: 4px 6px;
}
.head {
  display: flex;
  justify-content: space-between;
  padding: 8px 0 14px;
}
.comp-name {
  font-size: 17px;
  font-weight: 700;
  margin-bottom: 6px;
}
.small {
  font-size: 10px;
  line-height: 1.7;
}
.head-right {
  width: 270px;
}
.big-title {
  font-size: 32px;
  font-weight: 700;
  color: var(--navy);
  text-align: right;
  margin-bottom: 8px;
}
.meta-row {
  display: flex;
  align-items: flex-end;
  margin-bottom: 2px;
}
.ml {
  width: 100px;
  padding-left: 12px;
}
.mv {
  flex: 1;
  border-bottom: 1px solid #000;
  padding: 0 4px;
}

.vendor-bar {
  background: var(--navy);
  color: #fff;
  font-weight: 700;
  width: 190px;
  padding: 1px 4px;
}
.vendor-name {
  font-weight: 700;
  font-size: 12px;
  margin: 2px 0 18px;
  text-transform: uppercase;
}

.tbl {
  width: 100%;
  border-collapse: collapse;
}
.tbl thead th {
  background: var(--navy);
  color: #fff;
  font-weight: 700;
  padding: 3px 4px;
  text-align: center;
  border-right: 1px solid #fff;
}
.tbl tbody td {
  border-left: 1px solid #888;
  border-right: 1px solid #888;
  padding: 2px 6px;
  vertical-align: top;
}
.tbl tbody tr:first-child td {
  padding-top: 14px;
}
.tbl tbody {
  border-bottom: 1px solid #888;
}
.tc {
  text-align: center;
}
.tr {
  text-align: right;
}
.nm {
  text-transform: uppercase;
}
.ppn-line {
  padding-left: 6px;
}
.tr .ppn-line {
  padding-left: 0;
}
.qty {
  display: flex;
  justify-content: space-between;
}
.qty-n {
  text-align: right;
  flex: 1;
}
.qty-u {
  width: 36px;
  padding-left: 6px;
}
.fill td {
  height: 200px;
}
.tbl tfoot td {
  padding: 3px 6px;
}
.no-b {
  border: none;
}
.total-lbl {
  font-weight: 700;
  border: 1px solid #888;
  border-top: none;
}
.total-val {
  font-weight: 700;
  border: 1px solid #888;
  border-top: none;
  border-left: none;
}

.kurs {
  display: flex;
  gap: 40px;
  margin-top: 8px;
  font-size: 12px;
}
.ket-box {
  border: 1px solid #000;
  min-height: 20px;
  margin-top: 22px;
  width: 62%;
  padding: 3px 6px;
}

.notes {
  width: 55%;
  margin-top: 40px;
  border: 1px solid #000;
}
.notes-h {
  background: var(--navy);
  color: #fff;
  font-weight: 700;
  text-align: center;
  padding: 1px;
}
.notes-b {
  padding: 40px 14px 12px;
  line-height: 1.5;
}

.sign {
  width: 150px;
  margin: 24px 0 0 auto;
}
.sign-space {
  height: 40px;
}
.sign-name {
  font-weight: 700;
  border-bottom: 1px solid #000;
}
.sign-role {
  font-size: 10px;
}

@media print {
  .po {
    width: 100%;
  }
  @page {
    margin: 8mm;
  }
}
</style>
