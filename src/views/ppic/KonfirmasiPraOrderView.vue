<script setup lang="ts">
import { ref, onMounted, computed, watch } from "vue";
import { konfirmasiPraOrderService } from "@/services/ppic/konfirmasiPraOrderService";
import { useBrowse } from "@/composables/useBrowse";
import { useToast } from "vue-toastification";
import BaseBrowse from "@/components/BaseBrowse.vue";
import {
  IconClipboardCheck,
  IconEye,
  IconCheck,
  IconX,
} from "@tabler/icons-vue";
import { formatTanggal, formatTanggalJam } from "@/utils/dateFormat";

const toast = useToast();

// ── Filter state ──────────────────────────────────────────────────────
const getToday = () => new Date().toISOString().substr(0, 10);
const getMinus30 = () => {
  const d = new Date();
  d.setDate(d.getDate() - 30);
  return d.toISOString().substr(0, 10);
};
const filterState = ref<Record<string, any>>({});
const divisiOptions = ref<any[]>([{ Kode: "0", Nama: "0 - ALL" }]);

const startDate = computed({
  get: () => filterState.value.startDate ?? getMinus30(),
  set: (v) => {
    filterState.value = { ...filterState.value, startDate: v };
  },
});
const endDate = computed({
  get: () => filterState.value.endDate ?? getToday(),
  set: (v) => {
    filterState.value = { ...filterState.value, endDate: v };
  },
});
const divisiKode = computed({
  get: () => filterState.value.divisiKode ?? "0",
  set: (v) => {
    filterState.value = { ...filterState.value, divisiKode: v };
  },
});
const statusFilter = computed({
  get: () => filterState.value.statusFilter ?? "PENDING",
  set: (v) => {
    filterState.value = { ...filterState.value, statusFilter: v };
  },
});

watch(filterState, () => fetchData(), { deep: true });

const loadDivisi = async () => {
  try {
    const res = await konfirmasiPraOrderService.getDivisi();
    divisiOptions.value = [
      { Kode: "0", Nama: "0 - ALL" },
      ...res.data.data.map((d: any) => ({
        Kode: d.Kode,
        Nama: `${d.Kode} - ${d.Nama}`,
      })),
    ];
  } catch {
    console.error("Gagal load divisi");
  }
};
onMounted(loadDivisi);

// ── Browse ────────────────────────────────────────────────────────────
const { items, isLoading, selected, fetchData } = useBrowse({
  menuId: "1325",
  fetchApi: async () => {
    const res = await konfirmasiPraOrderService.getBrowse({
      startDate: startDate.value,
      endDate: endDate.value,
      divisi: divisiKode.value,
      status: statusFilter.value,
    });
    return res.data.data;
  },
});

const headers = [
  { title: "NOMOR", key: "Nomor", width: "150px" },
  { title: "DIVISI", key: "Divisi", width: "110px" },
  { title: "TANGGAL", key: "Tanggal", width: "100px", align: "center" },
  { title: "CUSTOMER", key: "Customer", width: "180px" },
  { title: "SALES", key: "Sales", width: "130px" },
  { title: "NAMA PEKERJAAN", key: "NamaPekerjaan", width: "220px" },
  { title: "BAHAN", key: "Bahan", width: "180px" },
  { title: "Qty Rencana", key: "QtyRencana", width: "110px", align: "end" },
  { title: "Tgl Kirim", key: "TglKirim", width: "110px", align: "center" },
  {
    title: "Status PPIC",
    key: "StatusPpic",
    width: "140px",
    align: "center",
  },
  { title: "Created", key: "Created", width: "150px" },
];

const rowPropsFn = (data: any) => {
  const item = data.item?.raw || data.item;
  if (item.StatusPpic === "TIDAK SANGGUP")
    return { class: "text-red font-weight-medium" };
  if (item.StatusPpic === "SANGGUP")
    return { class: "text-green font-weight-medium" };
  return { class: "text-grey-darken-1" };
};

const fmtNum = (v: any) =>
  new Intl.NumberFormat("id-ID").format(Number(v) || 0);

// ── Panel detail/preview ─────────────────────────────────────────────
const showDetailDialog = ref(false);
const isDetailLoading = ref(false);
const detailData = ref<any>(null);
const isConfirming = ref(false);
const catatanTolak = ref("");
const showTolakInput = ref(false);

const openDetail = async (item: any) => {
  showDetailDialog.value = true;
  isDetailLoading.value = true;
  showTolakInput.value = false;
  catatanTolak.value = "";
  try {
    const res = await konfirmasiPraOrderService.getDetail(item.Nomor);
    detailData.value = res.data.data;
  } catch (e: any) {
    toast.error(e.response?.data?.message || "Gagal memuat detail Pra Order.");
    showDetailDialog.value = false;
  } finally {
    isDetailLoading.value = false;
  }
};

const gambarUrl = computed(() => {
  const g = detailData.value?.gambar?.[0];
  return g ? g.prog_file_path : "";
});

const confirmSanggup = async () => {
  if (!detailData.value) return;
  isConfirming.value = true;
  try {
    await konfirmasiPraOrderService.confirmKesanggupan(
      detailData.value.pro_nomor,
      "SANGGUP",
      "",
    );
    toast.success("Pra Order dikonfirmasi SANGGUP.");
    showDetailDialog.value = false;
    fetchData();
  } catch (e: any) {
    toast.error(e.response?.data?.message || "Gagal konfirmasi.");
  } finally {
    isConfirming.value = false;
  }
};

const openTolakInput = () => {
  showTolakInput.value = true;
};

const confirmTolak = async () => {
  if (!catatanTolak.value.trim()) {
    toast.warning("Catatan wajib diisi untuk Tidak Sanggup.");
    return;
  }
  if (!detailData.value) return;
  isConfirming.value = true;
  try {
    await konfirmasiPraOrderService.confirmKesanggupan(
      detailData.value.pro_nomor,
      "TIDAK SANGGUP",
      catatanTolak.value,
    );
    toast.success("Pra Order dikonfirmasi TIDAK SANGGUP — dianggap gugur.");
    showDetailDialog.value = false;
    fetchData();
  } catch (e: any) {
    toast.error(e.response?.data?.message || "Gagal konfirmasi.");
  } finally {
    isConfirming.value = false;
  }
};

const isSavingBahanStatus = ref<number | null>(null); // probId yang lagi diproses

const setBahanStatus = async (bahan: any, status: string) => {
  if (!bahan.prob_id) return;
  isSavingBahanStatus.value = bahan.prob_id;
  try {
    await konfirmasiPraOrderService.confirmStatusBahan(bahan.prob_id, status);
    // Optimistic update lokal supaya badge langsung berubah tanpa reload detail
    bahan.prob_status_ready = status;
    toast.success(`Status bahan "${bahan.NamaBahan}" diperbarui.`);
  } catch (e: any) {
    toast.error(e.response?.data?.message || "Gagal memperbarui status bahan.");
  } finally {
    isSavingBahanStatus.value = null;
  }
};

const canConfirm = computed(
  () => detailData.value?.pro_status_ppic === "PENDING",
);
</script>

<template>
  <BaseBrowse
    title="Konfirmasi Pra Order"
    menu-id="1325"
    :icon="IconClipboardCheck"
    :headers="headers"
    :items="items ?? []"
    :is-loading="isLoading"
    v-model:selected="selected"
    select-strategy="single"
    :can-insert="false"
    :can-edit="false"
    :can-delete="false"
    :can-export="false"
    item-value="Nomor"
    :row-props-fn="rowPropsFn"
    v-model:filter-state="filterState"
    @refresh="fetchData"
    @row-dblclick="openDetail"
  >
    <template #filter-left>
      <div class="filter-group">
        <span class="filter-label">Periode</span>
        <input type="date" v-model="startDate" class="date-inp" />
        <span class="filter-sep">s/d</span>
        <input type="date" v-model="endDate" class="date-inp" />
      </div>

      <div class="filter-divider" />

      <div class="filter-group">
        <span class="filter-label">Divisi</span>
        <select
          :value="divisiKode"
          class="filter-select"
          @change="divisiKode = ($event.target as HTMLSelectElement).value"
        >
          <option
            v-for="opt in divisiOptions"
            :key="opt.Kode"
            :value="opt.Kode"
          >
            {{ opt.Nama }}
          </option>
        </select>
      </div>

      <div class="filter-divider" />

      <div class="filter-group">
        <span class="filter-label">Status</span>
        <select
          :value="statusFilter"
          class="filter-select"
          @change="statusFilter = ($event.target as HTMLSelectElement).value"
        >
          <option value="PENDING">PENDING (perlu konfirmasi)</option>
          <option value="SANGGUP">SANGGUP</option>
          <option value="TIDAK SANGGUP">TIDAK SANGGUP</option>
          <option value="ALL">SEMUA</option>
        </select>
      </div>
    </template>

    <template #extra-actions="{ selected }">
      <v-btn
        size="small"
        color="primary"
        variant="elevated"
        :disabled="selected.length === 0"
        @click="openDetail(selected[0])"
      >
        <template #prepend><IconEye :size="15" :stroke-width="1.7" /></template>
        Lihat & Konfirmasi
      </v-btn>
    </template>

    <template #item.QtyRencana="{ item }">{{
      fmtNum((item.raw || item).QtyRencana)
    }}</template>
    <template #item.Tanggal="{ item }">{{
      formatTanggal((item.raw || item).Tanggal)
    }}</template>
    <template #item.TglKirim="{ item }">{{
      formatTanggal((item.raw || item).TglKirim)
    }}</template>
    <template #item.Created="{ item }">{{
      formatTanggalJam((item.raw || item).Created)
    }}</template>
    <template #item.Nomor="{ item }">
      <span class="nomor-link" @click="openDetail(item.raw || item)">{{
        (item.raw || item).Nomor
      }}</span>
    </template>
    <template #item.StatusPpic="{ item }">
      <v-chip
        size="x-small"
        :color="
          (item.raw || item).StatusPpic === 'SANGGUP'
            ? 'success'
            : (item.raw || item).StatusPpic === 'TIDAK SANGGUP'
              ? 'error'
              : 'grey'
        "
        variant="flat"
      >
        {{ (item.raw || item).StatusPpic }}
      </v-chip>
    </template>
  </BaseBrowse>

  <!-- ── Dialog Detail/Preview + Konfirmasi ── -->
  <v-dialog v-model="showDetailDialog" max-width="820px">
    <v-card class="rounded-lg">
      <v-card-title
        class="bg-primary text-white d-flex justify-space-between align-center pa-3"
      >
        <span>Detail Pra Order — {{ detailData?.pro_nomor }}</span>
        <v-btn
          icon
          size="small"
          variant="text"
          color="white"
          @click="showDetailDialog = false"
        >
          <IconX :size="18" />
        </v-btn>
      </v-card-title>
      <v-card-text class="pa-0">
        <div v-if="isDetailLoading" class="pa-6 text-center">
          <v-progress-circular indeterminate color="primary" size="30" />
        </div>
        <div v-else-if="detailData" class="detail-body">
          <div class="detail-cols">
            <div class="detail-left">
              <table class="info-tbl">
                <tr>
                  <td class="lbl">Tanggal</td>
                  <td class="val">
                    {{ formatTanggal(detailData.pro_tanggal) }}
                  </td>
                </tr>
                <tr>
                  <td class="lbl">Customer</td>
                  <td class="val">
                    {{ detailData.pro_cus_kode }} —
                    {{ detailData.pro_cus_nama }}
                  </td>
                </tr>
                <tr>
                  <td class="lbl">Nama Pekerjaan</td>
                  <td class="val font-weight-bold">
                    {{ detailData.pro_nama_pekerjaan }}
                  </td>
                </tr>
                <tr>
                  <td class="lbl">Qty Rencana</td>
                  <td class="val">{{ fmtNum(detailData.pro_qty_rencana) }}</td>
                </tr>
                <tr>
                  <td class="lbl">Finishing</td>
                  <td class="val">{{ detailData.pro_finishing }}</td>
                </tr>
                <tr v-if="detailData.pro_spesifikasi">
                  <td class="lbl">Spesifikasi</td>
                  <td class="val">{{ detailData.pro_spesifikasi }}</td>
                </tr>
                <tr>
                  <td class="lbl">Tgl Kirim</td>
                  <td class="val">
                    {{ formatTanggal(detailData.pro_tgl_kirim) }}
                  </td>
                </tr>
                <tr v-if="detailData.pro_catatan_deadline">
                  <td class="lbl">Ket. Deadline</td>
                  <td class="val">{{ detailData.pro_catatan_deadline }}</td>
                </tr>
              </table>

              <div v-if="detailData.bahan?.length" class="section-block">
                <div class="section-title">Alternatif Bahan</div>
                <div class="bahan-status-list">
                  <div
                    v-for="(b, i) in detailData.bahan"
                    :key="i"
                    class="bahan-row"
                  >
                    <span class="bahan-nama">{{ b.NamaBahan }}</span>
                    <div class="bahan-btn-grp">
                      <button
                        type="button"
                        class="bahan-btn ready"
                        :class="{ active: b.prob_status_ready === 'READY' }"
                        :disabled="isSavingBahanStatus === b.prob_id"
                        @click="setBahanStatus(b, 'READY')"
                      >
                        Ready
                      </button>
                      <button
                        type="button"
                        class="bahan-btn not-ready"
                        :class="{
                          active: b.prob_status_ready === 'TIDAK READY',
                        }"
                        :disabled="isSavingBahanStatus === b.prob_id"
                        @click="setBahanStatus(b, 'TIDAK READY')"
                      >
                        Tidak Ready
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div v-if="detailData.ukuran?.length" class="section-block">
                <div class="section-title">Breakdown Ukuran</div>
                <table class="ukuran-tbl">
                  <thead>
                    <tr>
                      <th>Ukuran</th>
                      <th class="tr">Qty</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr
                      v-for="(u, i) in detailData.ukuran.filter(
                        (x: any) => Number(x.prou_qty) > 0,
                      )"
                      :key="i"
                    >
                      <td>{{ u.NamaUkuran }}</td>
                      <td class="tr">{{ fmtNum(u.prou_qty) }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div v-if="detailData.pro_keterangan" class="section-block">
                <div class="section-title">Keterangan</div>
                <pre class="ket-text">{{ detailData.pro_keterangan }}</pre>
              </div>
            </div>

            <div class="detail-right">
              <div class="section-title">Gambar Referensi</div>
              <div class="image-box">
                <img v-if="gambarUrl" :src="gambarUrl" alt="" />
                <div v-else class="no-image">(Tidak ada gambar)</div>
              </div>
            </div>
          </div>
        </div>
      </v-card-text>
      <v-card-actions
        v-if="!isDetailLoading && detailData"
        class="pa-3 border-t bg-grey-lighten-4"
      >
        <template v-if="canConfirm">
          <div v-if="showTolakInput" class="tolak-input-wrap">
            <v-textarea
              v-model="catatanTolak"
              label="Alasan Tidak Sanggup"
              variant="outlined"
              density="compact"
              rows="2"
              hide-details
              autofocus
            />
            <div class="d-flex justify-end mt-2" style="gap: 8px">
              <v-btn size="small" variant="text" @click="showTolakInput = false"
                >Batal</v-btn
              >
              <v-btn
                size="small"
                color="error"
                variant="elevated"
                :loading="isConfirming"
                @click="confirmTolak"
                >Konfirmasi Tidak Sanggup</v-btn
              >
            </div>
          </div>
          <template v-else>
            <v-spacer />
            <v-btn
              size="small"
              color="error"
              variant="outlined"
              :disabled="isConfirming"
              @click="openTolakInput"
            >
              <template #prepend><IconX :size="14" /></template>
              Tidak Sanggup
            </v-btn>
            <v-btn
              size="small"
              color="success"
              variant="elevated"
              :loading="isConfirming"
              @click="confirmSanggup"
            >
              <template #prepend><IconCheck :size="14" /></template>
              Sanggup
            </v-btn>
          </template>
        </template>
        <template v-else>
          <v-spacer />
          <span class="text-caption text-grey"
            >Sudah dikonfirmasi: <b>{{ detailData.pro_status_ppic }}</b></span
          >
        </template>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.filter-group {
  display: flex;
  align-items: center;
  gap: 6px;
}
.filter-label {
  font-size: 11px;
  font-weight: 700;
  color: #555;
  white-space: nowrap;
}
.filter-sep {
  font-size: 11px;
  color: #888;
}
.filter-divider {
  width: 1px;
  height: 20px;
  background: #d0d0d0;
  margin: 0 8px;
  flex-shrink: 0;
}
.date-inp {
  height: 28px;
  border: 1px solid #ccc;
  border-radius: 4px;
  padding: 0 6px;
  font-size: 12px;
  background: white;
  outline: none;
  color: #212121;
}
.date-inp:focus {
  border-color: #1976d2;
}
.filter-select {
  height: 28px;
  border: 1px solid #ccc;
  border-radius: 4px;
  padding: 0 6px;
  font-size: 12px;
  background: white;
  color: #212121;
  cursor: pointer;
  outline: none;
  min-width: 160px;
}
.filter-select:focus {
  border-color: #1976d2;
}
.nomor-link {
  color: #1565c0;
  font-weight: 600;
  cursor: pointer;
  text-decoration: underline;
}

.detail-body {
  padding: 16px;
}
.detail-cols {
  display: flex;
  gap: 16px;
}
.detail-left {
  flex: 1.3;
  min-width: 0;
}
.detail-right {
  flex: 1;
  min-width: 0;
}

.info-tbl {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
  margin-bottom: 12px;
}
.info-tbl td {
  padding: 3px 0;
  vertical-align: top;
}
.info-tbl .lbl {
  width: 110px;
  color: #666;
  font-weight: 600;
}
.font-weight-bold {
  font-weight: bold;
}

.section-block {
  margin-bottom: 12px;
}
.section-title {
  font-size: 10px;
  font-weight: 700;
  color: #1565c0;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  margin-bottom: 4px;
}
.bahan-status-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.bahan-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 4px 8px;
  background: #fafafa;
  border: 1px solid #eee;
  border-radius: 4px;
}
.bahan-nama {
  font-size: 12px;
  color: #212121;
}
.bahan-btn-grp {
  display: flex;
  gap: 4px;
  flex-shrink: 0;
}
.bahan-btn {
  height: 22px;
  padding: 0 8px;
  font-size: 10px;
  font-weight: 600;
  border-radius: 3px;
  border: 1px solid #ccc;
  background: white;
  color: #757575;
  cursor: pointer;
}
.bahan-btn:disabled {
  opacity: 0.5;
  cursor: default;
}
.bahan-btn.ready.active {
  background: #2e7d32;
  color: white;
  border-color: #2e7d32;
}
.bahan-btn.not-ready.active {
  background: #c62828;
  color: white;
  border-color: #c62828;
}
.ukuran-tbl {
  width: 100%;
  border-collapse: collapse;
  font-size: 11px;
}
.ukuran-tbl th,
.ukuran-tbl td {
  border: 1px solid #e0e0e0;
  padding: 3px 8px;
  text-align: left;
}
.ukuran-tbl .tr {
  text-align: right;
}
.ket-text {
  font-family: inherit;
  font-size: 12px;
  white-space: pre-wrap;
  margin: 0;
  line-height: 1.4;
  background: #fafafa;
  border: 1px solid #eee;
  border-radius: 4px;
  padding: 8px;
}

.image-box {
  width: 100%;
  aspect-ratio: 4 / 3;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  background: #fafafa;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}
.image-box img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}
.no-image {
  color: #bdbdbd;
  font-size: 12px;
  font-style: italic;
}

.tolak-input-wrap {
  width: 100%;
}
</style>
