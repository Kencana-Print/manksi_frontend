<script setup lang="ts">
import { ref, onMounted, watch, computed } from "vue";
import { useToast } from "vue-toastification";
import { useRouter } from "vue-router";
import BaseBrowse from "@/components/BaseBrowse.vue";
import { useBrowse } from "@/composables/useBrowse";
import { maklonBarangService } from "@/services/garmen/maklonBarangService";
import { maklonBarangFormService } from "@/services/garmen/maklonBarangFormService";
import { maklonTerimaService } from "@/services/garmen/maklonTerimaService";
import {
  IconArrowsExchange,
  IconTruckDelivery,
  IconPrinter,
} from "@tabler/icons-vue";
import { formatTanggal, formatTanggalJam } from "@/utils/dateFormat";

const toast = useToast();
const router = useRouter();

const today = new Date();
const padDate = (n: number) => String(n).padStart(2, "0");
const toLocalDate = (d: Date) =>
  `${d.getFullYear()}-${padDate(d.getMonth() + 1)}-${padDate(d.getDate())}`;

const firstDayOfMonth = toLocalDate(
  new Date(today.getFullYear(), today.getMonth(), 1),
);
const todayStr = toLocalDate(today);

const SESSION_KEY = "maklon_barang_browse_filter";
const savedFilter = (() => {
  try {
    return JSON.parse(sessionStorage.getItem(SESSION_KEY) || "{}");
  } catch {
    return {};
  }
})();

const dtAwal = ref(savedFilter.dtAwal || firstDayOfMonth);
const dtAkhir = ref(savedFilter.dtAkhir || todayStr);
const keyword = ref("");

watch([dtAwal, dtAkhir], () => {
  sessionStorage.setItem(
    SESSION_KEY,
    JSON.stringify({ dtAwal: dtAwal.value, dtAkhir: dtAkhir.value }),
  );
  fetchData();
});

const {
  items,
  isLoading,
  selected,
  canInsert,
  canEdit,
  selectedItem,
  fetchData,
} = useBrowse({
  menuId: "181",
  fetchApi: async () => {
    const res = await maklonBarangService.getBrowse({
      startDate: dtAwal.value,
      endDate: dtAkhir.value,
      keyword: keyword.value,
    });
    return res.data.data;
  },
  immediate: false,
});

const headers = [
  { title: "Nomor", key: "mkl_nomor", width: "150px", fixed: true },
  { title: "Tanggal", key: "mkl_tanggal", width: "100px", align: "center" },
  { title: "Deadline", key: "mkl_deadline", width: "100px", align: "center" },
  { title: "Cab. Asal", key: "mkl_cab_asal", width: "90px", align: "center" },
  {
    title: "Cab. Tujuan",
    key: "mkl_cab_tujuan",
    width: "90px",
    align: "center",
  },
  { title: "Jml Item", key: "JmlItem", width: "80px", align: "center" },
  { title: "Total Kirim", key: "TotalKirim", width: "110px", align: "end" },
  { title: "Total Terima", key: "TotalTerima", width: "110px", align: "end" },
  { title: "Total BS", key: "TotalBs", width: "90px", align: "end" },
  { title: "Status", key: "mkl_status", width: "140px", align: "center" },
  { title: "Keterangan", key: "mkl_keterangan", width: "200px" },
  { title: "User", key: "mkl_user_create", width: "80px" },
  { title: "Created", key: "mkl_date_create", width: "140px", align: "center" },
];

const statusColor = (status: string) => {
  switch (status) {
    case "SELESAI":
      return "#2e7d32";
    case "DITERIMA SEBAGIAN":
      return "#7cb342";
    case "OTW GUDANG":
      return "#f9a825";
    case "SELESAI DTF":
      return "#8e24aa";
    case "DIKIRIM":
      return "#1565c0";
    case "SEBAGIAN DIKIRIM":
      return "#fb8c00";
    case "DRAFT":
    default:
      return "#546e7a";
  }
};

const expandedRows = ref<any[]>([]);
const detailCache = ref<Record<string, any>>({});
const detailLoading = ref<Record<string, boolean>>({});

const onUpdateExpanded = async (newExpanded: any[]) => {
  expandedRows.value = newExpanded;
  const newlyExpanded = newExpanded.filter(
    (item) =>
      !detailCache.value[item.mkl_nomor] &&
      !detailLoading.value[item.mkl_nomor],
  );
  for (const item of newlyExpanded) {
    const nomor = item.mkl_nomor;
    detailLoading.value[nomor] = true;
    try {
      const res = await maklonBarangService.getDetail(nomor);
      detailCache.value[nomor] = res.data.data;
    } catch {
      toast.error(`Gagal memuat detail ${nomor}`);
    } finally {
      detailLoading.value[nomor] = false;
    }
  }
};

const numFmt = (v: any) =>
  v != null ? Number(v).toLocaleString("id-ID") : "0";

const openImage = (url: string) => window.open(url, "_blank");
const tglFmt = (v: any) => {
  if (!v) return "-";
  const d = new Date(v);
  if (isNaN(d.getTime())) return v;
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
};

onMounted(() => fetchData());

const onAdd = () => {
  router.push("/garmen/maklon/makloon-barang/create");
};

const onEdit = (item: any) => {
  router.push(
    `/garmen/maklon/makloon-barang/edit/${encodeURIComponent(item.mkl_nomor)}`,
  );
};

const showSjKeluarDialog = ref(false);
const sjKeluarLoading = ref(false);
const sjKeluarSaving = ref(false);
const sjKeluarHeader = ref<any>(null);
const sjKeluarDetails = ref<any[]>([]);
const sjKeluarTanggal = ref(new Date().toISOString().slice(0, 10));
const sjKeluarQty = ref<Record<number, number>>({});

const canBuatSjKeluar = (item: any) =>
  ["DRAFT", "SEBAGIAN DIKIRIM"].includes(item.mkl_status);

const openSjKeluarDialog = async (item: any) => {
  if (!item) return;
  sjKeluarLoading.value = true;
  showSjKeluarDialog.value = true;
  sjKeluarTanggal.value = new Date().toISOString().slice(0, 10);
  try {
    const res = await maklonBarangFormService.getSjKeluarDialog(item.mkl_nomor);
    sjKeluarHeader.value = res.data.data.header;
    sjKeluarDetails.value = res.data.data.details;
    sjKeluarQty.value = {};
    for (const d of sjKeluarDetails.value) {
      sjKeluarQty.value[d.mkld_id] = Number(d.Sisa);
    }
  } catch (e: any) {
    toast.error(e.response?.data?.message || "Gagal memuat data.");
    showSjKeluarDialog.value = false;
  } finally {
    sjKeluarLoading.value = false;
  }
};

const totalQtySjKeluar = computed(() =>
  Object.values(sjKeluarQty.value).reduce((s, v) => s + (Number(v) || 0), 0),
);

const submitSjKeluar = async () => {
  const items = sjKeluarDetails.value
    .filter((d) => Number(sjKeluarQty.value[d.mkld_id]) > 0)
    .map((d) => ({
      mkld_id: d.mkld_id,
      qty: Number(sjKeluarQty.value[d.mkld_id]),
    }));

  if (!items.length) {
    return toast.warning("Minimal 1 baris harus diisi qty kirim.");
  }
  for (const d of sjKeluarDetails.value) {
    const qty = Number(sjKeluarQty.value[d.mkld_id]) || 0;
    if (qty > Number(d.Sisa)) {
      return toast.warning(
        `Qty pada barang ${d.mkld_kode_polos} melebihi sisa yang belum dikirim (${d.Sisa}).`,
      );
    }
  }

  sjKeluarSaving.value = true;
  try {
    const res = await maklonBarangFormService.createSjKeluar(
      sjKeluarHeader.value.mkl_nomor,
      {
        tanggal: sjKeluarTanggal.value,
        items,
      },
    );
    toast.success(`SJ Keluar ${res.data.data.nomor} berhasil dibuat.`);
    showSjKeluarDialog.value = false;
    const url = router.resolve({
      name: "MaklonSjKeluarPrint",
      params: { sjkNomor: res.data.data.nomor },
    }).href;
    window.open(url, "_blank");
    fetchData();
  } catch (e: any) {
    toast.error(e.response?.data?.message || "Gagal membuat SJ Keluar.");
  } finally {
    sjKeluarSaving.value = false;
  }
};

const openPrintTab = () => {
  if (!selectedItem.value) return;
  if (!selectedItem.value.SjkNomorPertama) {
    toast.warning("Belum ada SJ Keluar untuk Maklon ini.");
    return;
  }
  const url = router.resolve({
    name: "MaklonGabunganPrint",
    params: {
      nomor: selectedItem.value.mkl_nomor,
      sjkNomor: selectedItem.value.SjkNomorPertama,
    },
  }).href;
  window.open(url, "_blank");
};

const showTerimaDialog = ref(false);
const terimaLoading = ref(false);
const terimaSaving = ref(false);
const terimaHeader = ref<any>(null);
const terimaItems = ref<any[]>([]);
const terimaTanggal = ref(new Date().toISOString().slice(0, 10));
const terimaQty = ref<Record<number, { terima: number; bs: number }>>({});

const canTerimaHasil = (item: any) =>
  ["OTW GUDANG", "DITERIMA SEBAGIAN"].includes(item.mkl_status);

const openTerimaDialog = async (item: any) => {
  if (!item) return;
  terimaLoading.value = true;
  showTerimaDialog.value = true;
  terimaTanggal.value = new Date().toISOString().slice(0, 10);
  try {
    const res = await maklonTerimaService.getOutstandingByMkl(item.mkl_nomor);
    terimaHeader.value = res.data.data.header;
    terimaItems.value = res.data.data.items;
    terimaQty.value = {};
    for (const d of terimaItems.value) {
      terimaQty.value[d.SjmdId] = {
        terima: Number(d.SisaTerima),
        bs: Number(d.SisaBs),
      };
    }
    if (!terimaItems.value.length) {
      toast.info("Tidak ada sisa qty yang perlu divalidasi untuk Maklon ini.");
      showTerimaDialog.value = false;
    }
  } catch (e: any) {
    toast.error(e.response?.data?.message || "Gagal memuat data.");
    showTerimaDialog.value = false;
  } finally {
    terimaLoading.value = false;
  }
};

const totalTerima = computed(() =>
  Object.values(terimaQty.value).reduce(
    (s, v) => s + (Number(v.terima) || 0),
    0,
  ),
);
const totalBs = computed(() =>
  Object.values(terimaQty.value).reduce((s, v) => s + (Number(v.bs) || 0), 0),
);

const submitTerima = async () => {
  const items = terimaItems.value
    .map((d) => ({
      sjmd_id: d.SjmdId,
      qty_terima: Number(terimaQty.value[d.SjmdId]?.terima) || 0,
      qty_bs: Number(terimaQty.value[d.SjmdId]?.bs) || 0,
    }))
    .filter((it) => it.qty_terima > 0 || it.qty_bs > 0);

  if (!items.length) return toast.warning("Minimal 1 baris harus diisi qty.");

  for (const d of terimaItems.value) {
    const q = terimaQty.value[d.SjmdId];
    if (Number(q.terima) > Number(d.SisaTerima)) {
      return toast.warning(
        `Qty Terima ${d.KodeJadi} melebihi sisa (${d.SisaTerima}).`,
      );
    }
    if (Number(q.bs) > Number(d.SisaBs)) {
      return toast.warning(`Qty BS ${d.KodeJadi} melebihi sisa (${d.SisaBs}).`);
    }
  }

  terimaSaving.value = true;
  try {
    const res = await maklonTerimaService.save({
      mklNomor: terimaHeader.value.mkl_nomor,
      tanggal: terimaTanggal.value,
      items,
    });
    toast.success(
      `Terima Hasil Maklon ${res.data.data.nomor} berhasil disimpan.`,
    );
    showTerimaDialog.value = false;
    fetchData();
  } catch (e: any) {
    toast.error(e.response?.data?.message || "Gagal menyimpan.");
  } finally {
    terimaSaving.value = false;
  }
};
</script>

<template>
  <BaseBrowse
    title="Maklon Barang"
    menu-id="180"
    :icon="IconArrowsExchange"
    :headers="headers"
    :items="items ?? []"
    show-expand
    :expanded="expandedRows"
    @update:expanded="onUpdateExpanded"
    :is-loading="isLoading"
    v-model:selected="selected"
    :can-insert="canInsert"
    :can-edit="canEdit"
    :can-delete="false"
    :can-export="false"
    item-value="mkl_nomor"
    @add="onAdd"
    @edit="onEdit"
    @refresh="fetchData"
  >
    <template #filter-left>
      <div class="f-group">
        <span class="f-label">Periode</span>
        <input type="date" v-model="dtAwal" class="f-inp" />
        <span class="f-sep">s/d</span>
        <input type="date" v-model="dtAkhir" class="f-inp" />
      </div>
    </template>

    <template #extra-actions>
      <!-- <v-btn
        size="small"
        color="primary"
        :disabled="!selectedItem || !canBuatSjKeluar(selectedItem)"
        @click="openSjKeluarDialog(selectedItem)"
      >
        <template #prepend><IconTruckDelivery :size="15" /></template>
        Buat SJ Keluar
      </v-btn> -->
      <v-btn
        size="small"
        color="grey-darken-3"
        :disabled="!selectedItem || !selectedItem.SjkNomorPertama"
        @click="openPrintTab"
      >
        <template #prepend><IconPrinter :size="15" /></template>
        Cetak
      </v-btn>
      <v-btn
        size="small"
        color="teal"
        :disabled="!selectedItem || !canTerimaHasil(selectedItem)"
        @click="openTerimaDialog(selectedItem)"
      >
        <template #prepend><IconPackageImport :size="15" /></template>
        Terima Hasil Maklon
      </v-btn>
    </template>

    <template #item.mkl_tanggal="{ item }">
      {{ formatTanggal(item.mkl_tanggal) }}
    </template>
    <template #item.mkl_deadline="{ item }">
      {{ item.mkl_deadline ? formatTanggal(item.mkl_deadline) : "-" }}
    </template>
    <template #item.mkl_date_create="{ item }">
      {{ formatTanggalJam(item.mkl_date_create) }}
    </template>
    <template #item.TotalKirim="{ item }">
      {{ numFmt(item.TotalKirim) }}
    </template>
    <template #item.TotalTerima="{ item }">
      {{ numFmt(item.TotalTerima) }}
    </template>
    <template #item.TotalBs="{ item }">
      {{ numFmt(item.TotalBs) }}
    </template>
    <template #item.mkl_status="{ item }">
      <v-chip
        size="small"
        :color="statusColor(item.mkl_status)"
        variant="flat"
        text-color="white"
      >
        {{ item.mkl_status }}
      </v-chip>
    </template>

    <template #detail="{ item }">
      <div class="expand-wrap">
        <v-progress-linear
          v-if="detailLoading[item.mkl_nomor]"
          indeterminate
          color="primary"
          height="2"
        />
        <div v-else-if="detailCache[item.mkl_nomor]">
          <div class="expand-title mb-2">
            Detail Maklon — {{ item.mkl_nomor }}
            <span v-if="item.mkl_deadline" class="expand-deadline">
              · Deadline: {{ tglFmt(item.mkl_deadline) }}
            </span>
          </div>

          <div class="timeline-row mb-2">
            <div class="tl-item" :class="{ done: item.mkl_tgl_kirim }">
              <span class="tl-lbl">Dikirim</span>
              <span class="tl-val">{{
                item.mkl_tgl_kirim ? tglFmt(item.mkl_tgl_kirim) : "-"
              }}</span>
            </div>
            <div class="tl-item" :class="{ done: item.mkl_tgl_selesai_dtf }">
              <span class="tl-lbl">Selesai DTF</span>
              <span class="tl-val">{{
                item.mkl_tgl_selesai_dtf
                  ? tglFmt(item.mkl_tgl_selesai_dtf)
                  : "-"
              }}</span>
            </div>
            <div class="tl-item" :class="{ done: item.mkl_tgl_otw_gudang }">
              <span class="tl-lbl">OTW Gudang</span>
              <span class="tl-val">{{
                item.mkl_tgl_otw_gudang ? tglFmt(item.mkl_tgl_otw_gudang) : "-"
              }}</span>
            </div>
            <div class="tl-item" :class="{ done: item.mkl_tgl_selesai }">
              <span class="tl-lbl">Diterima Gudang</span>
              <span class="tl-val">{{
                item.mkl_tgl_selesai ? tglFmt(item.mkl_tgl_selesai) : "-"
              }}</span>
            </div>
          </div>

          <table class="detail-table">
            <thead>
              <tr>
                <th>Barang Polos</th>
                <th class="tr">Qty Kirim</th>
                <th class="tr">Sudah Kirim</th>
                <th class="tr">Terima</th>
                <th class="tr">BS</th>
                <th>Keterangan</th>
                <th>Target Barang Jadi</th>
              </tr>
            </thead>
            <tbody>
              <template
                v-for="(d, i) in detailCache[item.mkl_nomor].details"
                :key="i"
              >
                <tr>
                  <td :rowspan="d.target_jadi?.length || 1">
                    <div class="mono">{{ d.mkld_kode_polos }}</div>
                    <div class="row-subtext">{{ d.NamaPolos }}</div>
                  </td>
                  <td class="tr fw" :rowspan="d.target_jadi?.length || 1">
                    {{ numFmt(d.mkld_qty_kirim) }}
                  </td>
                  <td class="tr" :rowspan="d.target_jadi?.length || 1">
                    {{ numFmt(d.mkld_qty_sudah_kirim) }}
                  </td>
                  <td class="tr" :rowspan="d.target_jadi?.length || 1">
                    {{ numFmt(d.mkld_qty_terima) }}
                  </td>
                  <td class="tr" :rowspan="d.target_jadi?.length || 1">
                    {{ numFmt(d.mkld_qty_bs) }}
                  </td>
                  <td :rowspan="d.target_jadi?.length || 1">
                    {{ d.mkld_keterangan || "-" }}
                  </td>

                  <td v-if="d.target_jadi?.length">
                    <div class="mono">
                      {{ d.target_jadi[0].mkldj_kode_jadi }}
                    </div>
                    <div class="row-subtext">
                      {{ d.target_jadi[0].NamaJadi }}
                    </div>
                    <div class="row-subtext">
                      Est. {{ numFmt(d.target_jadi[0].mkldj_estimasi_qty) }}
                    </div>
                    <div
                      v-if="d.target_jadi[0].gambar?.length"
                      class="thumb-row"
                    >
                      <img
                        v-for="(g, gi) in d.target_jadi[0].gambar"
                        :key="gi"
                        :src="g.mklg_file_path"
                        class="thumb-img-sm"
                        @click="openImage(g.mklg_file_path)"
                      />
                    </div>
                  </td>
                  <td v-else class="text-grey">-</td>
                </tr>
                <tr
                  v-for="(t, ti) in (d.target_jadi || []).slice(1)"
                  :key="`${i}-${ti}`"
                >
                  <td>
                    <div class="mono">{{ t.mkldj_kode_jadi }}</div>
                    <div class="row-subtext">{{ t.NamaJadi }}</div>
                    <div class="row-subtext">
                      Est. {{ numFmt(t.mkldj_estimasi_qty) }}
                    </div>
                    <div v-if="t.gambar?.length" class="thumb-row">
                      <img
                        v-for="(g, gi) in t.gambar"
                        :key="gi"
                        :src="g.mklg_file_path"
                        class="thumb-img-sm"
                        @click="openImage(g.mklg_file_path)"
                      />
                    </div>
                  </td>
                </tr>
              </template>
              <tr v-if="!detailCache[item.mkl_nomor].details?.length">
                <td
                  colspan="7"
                  class="tc text-grey pa-3"
                  style="font-size: 11px"
                >
                  Tidak ada detail.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </template>
  </BaseBrowse>

  <v-dialog v-model="showSjKeluarDialog" max-width="650px" persistent>
    <v-card class="rounded-lg">
      <v-card-title
        class="bg-primary text-white pa-3"
        style="font-size: 13px; font-weight: 700"
      >
        Buat SJ Keluar — {{ sjKeluarHeader?.mkl_nomor }}
      </v-card-title>
      <v-card-text class="pa-4">
        <v-progress-linear
          v-if="sjKeluarLoading"
          indeterminate
          color="primary"
          class="mb-3"
        />
        <template v-else-if="sjKeluarHeader">
          <div class="d-flex flex-wrap ga-4 mb-3" style="font-size: 12px">
            <div>
              <b>Cabang Asal:</b> {{ sjKeluarHeader.mkl_cab_asal }} —
              {{ sjKeluarHeader.NamaCabAsal }}
            </div>
            <div>
              <b>Cabang Tujuan:</b> {{ sjKeluarHeader.mkl_cab_tujuan }} —
              {{ sjKeluarHeader.NamaCabTujuan }}
            </div>
          </div>
          <v-text-field
            v-model="sjKeluarTanggal"
            type="date"
            label="Tanggal SJ"
            density="compact"
            variant="outlined"
            hide-details
            style="max-width: 200px"
            class="mb-3"
          />
          <table class="sjk-table">
            <thead>
              <tr>
                <th>Barang Polos</th>
                <th class="tr">Sisa</th>
                <th class="tr" style="width: 110px">Qty Kirim</th>
                <th style="width: 60px">Satuan</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="d in sjKeluarDetails" :key="d.mkld_id">
                <td>
                  <div class="mono">{{ d.mkld_kode_polos }}</div>
                  <div class="subtext">{{ d.NamaPolos }}</div>
                </td>
                <td class="tr">{{ Number(d.Sisa).toLocaleString("id-ID") }}</td>
                <td class="p0">
                  <input
                    type="number"
                    min="0"
                    :max="d.Sisa"
                    v-model.number="sjKeluarQty[d.mkld_id]"
                    class="qty-inp"
                    :disabled="Number(d.Sisa) <= 0"
                  />
                </td>
                <td>{{ d.mkld_satuan_kirim }}</td>
              </tr>
            </tbody>
            <tfoot>
              <tr>
                <td colspan="2" class="tr fw">Total</td>
                <td class="tr fw">
                  {{ totalQtySjKeluar.toLocaleString("id-ID") }}
                </td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </template>
      </v-card-text>
      <v-card-actions class="pa-3 border-t bg-grey-lighten-4">
        <v-spacer />
        <v-btn
          variant="text"
          @click="showSjKeluarDialog = false"
          :disabled="sjKeluarSaving"
          >Batal</v-btn
        >
        <v-btn
          variant="elevated"
          color="primary"
          :loading="sjKeluarSaving"
          @click="submitSjKeluar"
        >
          Simpan & Kirim
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <v-dialog v-model="showTerimaDialog" max-width="700px" persistent>
    <v-card class="rounded-lg">
      <v-card-title
        class="bg-teal text-white pa-3"
        style="font-size: 13px; font-weight: 700"
      >
        Terima Hasil Maklon — {{ terimaHeader?.mkl_nomor }}
      </v-card-title>
      <v-card-text class="pa-4">
        <v-progress-linear
          v-if="terimaLoading"
          indeterminate
          color="teal"
          class="mb-3"
        />
        <template v-else-if="terimaHeader">
          <div class="d-flex flex-wrap ga-4 mb-3" style="font-size: 12px">
            <div>
              <b>Cabang Asal:</b> {{ terimaHeader.mkl_cab_asal }} —
              {{ terimaHeader.NamaCabAsal }}
            </div>
          </div>
          <v-text-field
            v-model="terimaTanggal"
            type="date"
            label="Tanggal"
            density="compact"
            variant="outlined"
            hide-details
            style="max-width: 200px"
            class="mb-3"
          />
          <table class="sjk-table">
            <thead>
              <tr>
                <th>No. SJ</th>
                <th>Barang Jadi</th>
                <th class="tr">Qty SJ (Baik/BS)</th>
                <th class="tr" style="width: 100px">Qty Terima</th>
                <th class="tr" style="width: 100px">Qty BS</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="d in terimaItems" :key="d.SjmdId">
                <td class="mono">{{ d.SjmNomor }}</td>
                <td>
                  <div class="mono">{{ d.KodeJadi }}</div>
                  <div class="subtext">{{ d.NamaJadi }}</div>
                </td>
                <td class="tr">
                  {{ Number(d.SisaTerima).toLocaleString("id-ID") }} /
                  {{ Number(d.SisaBs).toLocaleString("id-ID") }}
                </td>
                <td class="p0">
                  <input
                    type="number"
                    min="0"
                    :max="d.SisaTerima"
                    v-model.number="terimaQty[d.SjmdId].terima"
                    class="qty-inp"
                  />
                </td>
                <td class="p0">
                  <input
                    type="number"
                    min="0"
                    :max="d.SisaBs"
                    v-model.number="terimaQty[d.SjmdId].bs"
                    class="qty-inp"
                  />
                </td>
              </tr>
            </tbody>
            <tfoot>
              <tr>
                <td colspan="2" class="tr fw">Total</td>
                <td></td>
                <td class="tr fw">{{ totalTerima.toLocaleString("id-ID") }}</td>
                <td class="tr fw">{{ totalBs.toLocaleString("id-ID") }}</td>
              </tr>
            </tfoot>
          </table>
        </template>
      </v-card-text>
      <v-card-actions class="pa-3 border-t bg-grey-lighten-4">
        <v-spacer />
        <v-btn
          variant="text"
          @click="showTerimaDialog = false"
          :disabled="terimaSaving"
          >Batal</v-btn
        >
        <v-btn
          variant="elevated"
          color="teal"
          :loading="terimaSaving"
          @click="submitTerima"
        >
          Simpan
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.f-group {
  display: flex;
  align-items: center;
  gap: 6px;
}
.f-label {
  font-size: 11px;
  font-weight: 700;
  color: #555;
  white-space: nowrap;
}
.f-inp {
  height: 28px;
  border: 1px solid #ccc;
  border-radius: 4px;
  padding: 0 6px;
  font-size: 12px;
  outline: none;
  background: white;
}
.f-sep {
  font-size: 11px;
  color: #555;
}
.sjk-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
}
.sjk-table th {
  background: #f5f5f5;
  border: 1px solid #e0e0e0;
  padding: 6px 8px;
  text-align: left;
  font-weight: 700;
}
.sjk-table th.tr {
  text-align: right;
}
.sjk-table td {
  border: 1px solid #e0e0e0;
  padding: 4px 8px;
}
.sjk-table td.tr {
  text-align: right;
}
.sjk-table td.p0 {
  padding: 0;
}
.sjk-table .mono {
  font-family: monospace;
  font-weight: 600;
}
.sjk-table .subtext {
  font-size: 10px;
  color: #888;
}
.sjk-table .fw {
  font-weight: 700;
}
.qty-inp {
  width: 100%;
  height: 28px;
  border: none;
  outline: none;
  text-align: right;
  padding: 0 8px;
  font-size: 12px;
}
.qty-inp:focus {
  background: #e3f2fd;
}
.qty-inp:disabled {
  background: #f5f5f5;
  color: #bbb;
}
.expand-wrap {
  padding: 10px 10px 10px 50px;
  background: #eceff1;
}
.expand-title {
  font-size: 12px;
  font-weight: 700;
  color: #1565c0;
}
.mb-2 {
  margin-bottom: 8px;
}
.detail-table {
  width: 100%;
  border-collapse: collapse;
  background: white;
  border-radius: 4px;
  overflow: hidden;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.08);
}
.detail-table th {
  background: #546e7a;
  color: white;
  text-align: left;
  padding: 6px 10px;
  font-size: 11px;
  font-weight: 600;
}
.detail-table th.tr {
  text-align: right;
}
.detail-table th.tc {
  text-align: center;
}
.detail-table td {
  padding: 4px 10px;
  border-bottom: 1px solid #eee;
  font-size: 11px;
}
.detail-table td.tr {
  text-align: right;
}
.detail-table td.tc {
  text-align: center;
}
.detail-table td.fw {
  font-weight: 700;
}
.mono {
  font-family: monospace;
  font-size: 10px;
}
.row-subtext {
  font-size: 9px;
  color: #888;
}
.thumb-row {
  display: flex;
  gap: 3px;
  justify-content: center;
}
.thumb-img-sm {
  width: 24px;
  height: 24px;
  object-fit: cover;
  border-radius: 3px;
  border: 1px solid #ccc;
  cursor: pointer;
}
.thumb-row {
  display: flex;
  gap: 3px;
  margin-top: 2px;
}
.thumb-img-sm {
  width: 22px;
  height: 22px;
  object-fit: cover;
  border-radius: 3px;
  border: 1px solid #ccc;
  cursor: pointer;
}
.expand-deadline {
  font-weight: 400;
  color: #666;
  font-size: 11px;
}
.timeline-row {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}
.tl-item {
  flex: 1;
  min-width: 110px;
  background: white;
  border: 1px solid #ddd;
  border-radius: 4px;
  padding: 5px 8px;
  opacity: 0.5;
}
.tl-item.done {
  opacity: 1;
  border-color: #2e7d32;
  background: #f1f8f2;
}
.tl-lbl {
  display: block;
  font-size: 9px;
  color: #666;
  font-weight: 700;
  text-transform: uppercase;
}
.tl-val {
  display: block;
  font-size: 11px;
  font-weight: 600;
  color: #333;
}
</style>
