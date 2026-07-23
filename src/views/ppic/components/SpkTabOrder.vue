<script setup lang="ts">
import { ref, computed, watch, onMounted } from "vue";
import { useToast } from "vue-toastification";
import { useAuthStore } from "@/stores/authStore";
import { spkFormService } from "@/services/ppic/spkFormService";
import api from "@/services/api";
import SalesOrderSearchModal from "@/components/lookups/SalesOrderSearchModal.vue";
import { IconSearch, IconX, IconPhoto, IconMaximize } from "@tabler/icons-vue";

const props = defineProps<{
  formData: any;
  isEdit: boolean;
}>();

const emit = defineEmits(["so-loaded"]);
const toast = useToast();
const authStore = useAuthStore();

const showSoModal = ref(false);
const isLoadingSo = ref(false);
const showPreviewDialog = ref(false);

// Gambar dari SO
const resolvedImageUrl = ref("");
const isImageError = ref(false);
const isLoadingImage = ref(false);

const mkbDetail = ref<any[]>([]);
const isLoadingMkb = ref(false);

const getBaseUrl = () =>
  (api.defaults.baseURL || import.meta.env.VITE_API_URL || "").replace(
    /\/api\/?$/,
    "",
  );

const resolveDesignImage = () => {
  const nomor = props.formData.so_nomor;
  if (!nomor) {
    resolvedImageUrl.value = "";
    isImageError.value = false;
    return;
  }
  const base = getBaseUrl();
  const cab = props.formData.so_cab || "HO-";
  const map = props.formData.so_map || "";

  const candidates = [`${base}/images/${cab}/${encodeURIComponent(nomor)}.jpg`];
  if (map) {
    candidates.push(`${base}/images/${cab}/map/${encodeURIComponent(map)}.jpg`);
  }
  candidates.push(`/file-gambar/${encodeURIComponent(map || nomor)}.jpg`);

  isImageError.value = false;
  resolvedImageUrl.value = "";
  isLoadingImage.value = true;

  const tryNext = (idx: number) => {
    if (idx >= candidates.length) {
      isImageError.value = true;
      isLoadingImage.value = false;
      return;
    }
    const img = new Image();
    img.onload = () => {
      resolvedImageUrl.value = candidates[idx];
      isLoadingImage.value = false;
    };
    img.onerror = () => tryNext(idx + 1);
    img.src = candidates[idx];
  };
  tryNext(0);
};

const displayImageUrl = computed(() => resolvedImageUrl.value);

const hasAtasanData = computed(() =>
  (props.formData.Sizes || []).some(
    (s: any) => Number(s.ld) > 0 || Number(s.pb) > 0 || Number(s.p_bahu) > 0,
  ),
);
const hasBawahanData = computed(() =>
  (props.formData.Sizes || []).some(
    (s: any) => Number(s.l_pinggang) > 0 || Number(s.p_celana) > 0,
  ),
);
const hasPlPendek = computed(() =>
  (props.formData.Sizes || []).some((s: any) => Number(s.pl_pendek) > 0),
);
const hasPlPanjang = computed(() =>
  (props.formData.Sizes || []).some((s: any) => Number(s.pl_panjang) > 0),
);
const totalExtraCols = computed(() => {
  let n = 0;
  if (hasAtasanData.value) n += 5; // ld, pb, p_bahu, l_lengan, l_manset
  if (hasPlPendek.value) n += 1;
  if (hasPlPanjang.value) n += 1;
  if (hasBawahanData.value) n += 7;
  return n;
});

watch(
  [
    () => props.formData.so_nomor,
    () => props.formData.so_map,
    () => props.formData.so_cab,
  ],
  () => {
    resolveDesignImage();
  },
  { immediate: true },
);

// --- Load detail SO (sumber data untuk SPK PPIC baru) ---
// Validasi spk_aktif & spk_cmo sudah ditangani di backend (getSoSourceDetail),
// jadi di sini cukup tangani error-nya saja.
const loadSoDetail = async (nomor: string) => {
  if (!nomor) return;
  isLoadingSo.value = true;
  try {
    const res = await spkFormService.getSoSource(nomor);
    const d = res.data.data;
    if (!d?.header) throw new Error("Data SO tidak ditemukan.");

    const h = d.header;

    await loadMkbDetail(nomor);

    // Isi formData dari SO
    props.formData.so_nomor = h.spk_nomor || nomor;
    props.formData.so_nama = h.spk_nama || "";
    props.formData.so_map = h.spk_memo || "";
    props.formData.so_ket_ukuran = h.spk_ukuran || "";
    props.formData.so_kain = h.spk_kain || "";
    props.formData.so_finishing = h.spk_finishing || "";
    props.formData.so_jumlah = Number(h.spk_jumlah) || 0;
    props.formData.so_cab = h.spk_cab || "";
    props.formData.so_customer = h.cus_nama || "";
    props.formData.so_cust_perfect = h.cus_perfect || "N";
    props.formData.so_jo_kode = h.spk_jo_kode || "";
    props.formData.so_divisi = h.spk_divisi || "";
    props.formData.so_nomor_po = h.spk_nomor_po || "";
    props.formData.so_tipe = h.spk_tipe || "";
    props.formData.so_gramasi = h.spk_gramasi || "";
    props.formData.so_panjang = Number(h.spk_panjang) || 0;
    props.formData.so_lebar = Number(h.spk_lebar) || 0;
    props.formData.so_warna_badan = h.spk_warna_badan || "";
    props.formData.so_warna_lengan = h.spk_warna_lengan || "";
    props.formData.so_warna_lain = h.spk_warna_lain || "";
    props.formData.so_sablon = h.spk_sablon || "N";
    props.formData.so_bordir = h.spk_bordir || "N";
    props.formData.so_sublim = h.spk_sublim || "N";
    props.formData.so_kepentingan = h.spk_statuskerja || "";
    props.formData.so_dateline = h.spk_dateline?.substring(0, 10) || "";

    // Ambil detail size dari SO (jadi starting point, boleh disesuaikan PPIC nanti)
    props.formData.Sizes = d.dtlSize || [];

    // Emit ke parent agar tab lain bisa ikut update
    emit("so-loaded", d);

    resolvedImageUrl.value = "";
    isImageError.value = false;

    toast.success(`Data Sales Order ${nomor} berhasil dimuat.`);
  } catch (e: any) {
    toast.error(
      e.response?.data?.message || e.message || "Gagal memuat data SO.",
    );
  } finally {
    isLoadingSo.value = false;
  }
};

const loadMkbDetail = async (soNomor: string) => {
  if (!soNomor) {
    mkbDetail.value = [];
    return;
  }
  isLoadingMkb.value = true;
  try {
    const res = await spkFormService.getMkbDetail(soNomor);
    mkbDetail.value = res.data.data || [];
  } catch {
    mkbDetail.value = [];
  } finally {
    isLoadingMkb.value = false;
  }
};

const onSoSelected = (item: any) => {
  const nomor = item.Nomor || item.spk_nomor;
  props.formData.so_nomor = nomor;
  loadSoDetail(nomor);
};

const onSoNomorEnter = () => {
  const nomor = props.formData.so_nomor?.trim();
  if (nomor) loadSoDetail(nomor);
};

const clearSo = () => {
  props.formData.so_nomor = "";
  props.formData.so_nama = "";
  props.formData.so_map = "";
  props.formData.so_ket_ukuran = "";
  props.formData.so_kain = "";
  props.formData.so_finishing = "";
  props.formData.so_jumlah = 0;
  props.formData.so_cab = "";
  props.formData.so_customer = "";
  props.formData.so_cust_perfect = "N";
  props.formData.so_jo_kode = "";
  props.formData.Sizes = [];
  mkbDetail.value = [];
  resolvedImageUrl.value = "";
  isImageError.value = false;
};

onMounted(async () => {
  if (props.isEdit && props.formData.so_nomor) {
    await loadMkbDetail(props.formData.so_nomor);
  }
});
</script>

<template>
  <div class="order-layout">
    <!-- ── Kolom kiri: form referensi SO ── -->
    <div class="order-left">
      <div class="section-card">
        <div class="sec-title">Referensi Sales Order</div>

        <!-- No. SPK — otomatis saat Baru, terisi nomor SPK saat Ubah -->
        <div class="fr">
          <label class="lbl">No. SPK</label>
          <input
            :value="formData.spk_nomor || '(Otomatis)'"
            readonly
            class="inp ro"
            style="flex: 1; max-width: 340px; font-weight: 700; color: #1565c0"
          />
        </div>

        <!-- Pencarian NO SO -->
        <div class="fr">
          <label class="lbl">No. Sales Order</label>
          <div class="igrp" style="flex: 1; max-width: 340px">
            <input
              v-model="formData.so_nomor"
              class="inp"
              style="flex: 1; background: #ddeeff"
              placeholder="F1/Ketik atau cari SO..."
              @keydown.enter.prevent="onSoNomorEnter"
              @keydown.f1.prevent="showSoModal = true"
              :disabled="isEdit"
            />
            <button
              type="button"
              class="blkp"
              title="Cari Sales Order"
              :disabled="isEdit"
              @mousedown.prevent="showSoModal = true"
            >
              <IconSearch :size="13" color="#1565c0" />
            </button>
            <button
              v-if="formData.so_nomor && !isEdit"
              type="button"
              class="blkp"
              style="background: #ffebee"
              title="Hapus SO"
              @click="clearSo"
            >
              <IconX :size="13" color="#c62828" />
            </button>
          </div>
          <v-progress-circular
            v-if="isLoadingSo"
            indeterminate
            color="primary"
            size="18"
            class="ml-2"
          />
          <span
            v-if="formData.so_nomor && formData.so_cust_perfect === 'Y'"
            class="badge-perfect"
          >
            Cust PERFECT
          </span>
        </div>

        <div v-if="formData.so_nomor" class="so-detail-grid mt-2">
          <div class="fr">
            <label class="lbl">Nama Pekerjaan</label>
            <input
              :value="formData.so_nama"
              readonly
              class="inp ro"
              style="flex: 1"
            />
          </div>

          <div class="fr">
            <label class="lbl">No. MAP</label>
            <input
              :value="formData.so_map"
              readonly
              class="inp ro"
              style="width: 160px"
            />
            <label class="lbl ml-2" style="width: 60px">Customer</label>
            <input
              :value="formData.so_customer"
              readonly
              class="inp ro"
              style="flex: 1"
            />
          </div>

          <div class="fr">
            <label class="lbl">Ket. Ukuran</label>
            <input
              :value="formData.so_ket_ukuran"
              readonly
              class="inp ro"
              style="flex: 1"
            />
          </div>

          <div class="fr">
            <label class="lbl">Kain</label>
            <input
              :value="formData.so_kain"
              readonly
              class="inp ro"
              style="flex: 1; max-width: 260px"
            />
            <label class="lbl ml-2" style="width: 65px">Gramasi</label>
            <input
              :value="formData.so_gramasi"
              readonly
              class="inp ro"
              style="width: 100px"
            />
          </div>

          <div class="fr">
            <label class="lbl">Finishing</label>
            <input
              :value="formData.so_finishing"
              readonly
              class="inp ro"
              style="flex: 1"
            />
          </div>

          <div class="fr">
            <label class="lbl">Jenis Order</label>
            <input
              :value="formData.so_jo_kode"
              readonly
              class="inp ro"
              style="width: 70px"
            />
            <label class="lbl ml-2" style="width: 50px">Tipe</label>
            <input
              :value="formData.so_tipe"
              readonly
              class="inp ro"
              style="width: 100px"
            />
            <label class="lbl ml-2" style="width: 50px">Qty</label>
            <input
              :value="Number(formData.so_jumlah).toLocaleString('id-ID')"
              readonly
              class="inp ro text-right"
              style="width: 90px"
            />
          </div>

          <div class="fr">
            <label class="lbl">Kepentingan</label>
            <input
              :value="formData.so_kepentingan"
              readonly
              class="inp ro"
              style="width: 120px"
            />
          </div>

          <div class="fr">
            <label class="lbl">Warna Badan</label>
            <input
              :value="formData.so_warna_badan"
              readonly
              class="inp ro"
              style="width: 120px"
            />
            <label class="lbl ml-2" style="width: 65px">Lengan</label>
            <input
              :value="formData.so_warna_lengan"
              readonly
              class="inp ro"
              style="width: 120px"
            />
            <label class="lbl ml-2" style="width: 40px">Lain</label>
            <input
              :value="formData.so_warna_lain"
              readonly
              class="inp ro"
              style="flex: 1"
            />
          </div>

          <div class="fr">
            <label class="lbl">Workshop</label>
            <input
              :value="formData.so_cab"
              readonly
              class="inp ro"
              style="width: 60px"
            />
            <label class="lbl ml-2" style="width: 55px">No. PO</label>
            <input
              :value="formData.so_nomor_po"
              readonly
              class="inp ro"
              style="flex: 1"
            />
          </div>

          <div class="fr">
            <label class="lbl">Dateline SO</label>
            <input
              :value="formData.so_dateline"
              readonly
              class="inp ro"
              style="width: 120px"
            />
          </div>
        </div>

        <!-- Placeholder jika belum pilih SO -->
        <div v-else class="so-empty">
          <IconSearch :size="32" color="#bdbdbd" />
          <div>Pilih Sales Order untuk memuat data</div>
        </div>
      </div>

      <!-- Summary Size dari SO -->
      <div
        v-if="formData.Sizes && formData.Sizes.length > 0"
        class="section-card mt-2"
      >
        <div class="sec-title">Detail Size dari SO</div>
        <div class="size-summary-wrap">
          <table class="size-summary-table">
            <thead>
              <tr>
                <th>Size</th>
                <th class="tr">Qty</th>
                <!-- Kolom atasan — tampil hanya jika ada nilai -->
                <th v-if="hasAtasanData" class="tr">LD</th>
                <th v-if="hasAtasanData" class="tr">PB</th>
                <th v-if="hasPlPendek" class="tr">PL Pendek</th>
                <th v-if="hasPlPanjang" class="tr">PL Panjang</th>
                <th v-if="hasAtasanData" class="tr">P.Bahu</th>
                <th v-if="hasAtasanData" class="tr">L.Lengan</th>
                <th v-if="hasAtasanData" class="tr">L.Manset</th>
                <!-- Kolom bawahan -->
                <th v-if="hasBawahanData" class="tr">L.Pinggang</th>
                <th v-if="hasBawahanData" class="tr">P.Celana</th>
                <th v-if="hasBawahanData" class="tr">L.Panggul</th>
                <th v-if="hasBawahanData" class="tr">L.Paha</th>
                <th v-if="hasBawahanData" class="tr">Pesak</th>
                <th v-if="hasBawahanData" class="tr">L.Lutut</th>
                <th v-if="hasBawahanData" class="tr">L.Bawah</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="sz in formData.Sizes.filter(
                  (s: any) => Number(s.qty) > 0,
                )"
                :key="sz.size"
              >
                <td class="fw-bold">{{ sz.size }}</td>
                <td class="tr">{{ Number(sz.qty).toLocaleString("id-ID") }}</td>
                <td v-if="hasAtasanData" class="tr">{{ sz.ld || 0 }}</td>
                <td v-if="hasAtasanData" class="tr">{{ sz.pb || 0 }}</td>
                <td v-if="hasPlPendek" class="tr">{{ sz.pl_pendek || 0 }}</td>
                <td v-if="hasPlPanjang" class="tr">{{ sz.pl_panjang || 0 }}</td>
                <td v-if="hasAtasanData" class="tr">{{ sz.p_bahu || 0 }}</td>
                <td v-if="hasAtasanData" class="tr">{{ sz.l_lengan || 0 }}</td>
                <td v-if="hasAtasanData" class="tr">{{ sz.l_manset || 0 }}</td>
                <td v-if="hasBawahanData" class="tr">
                  {{ sz.l_pinggang || 0 }}
                </td>
                <td v-if="hasBawahanData" class="tr">{{ sz.p_celana || 0 }}</td>
                <td v-if="hasBawahanData" class="tr">
                  {{ sz.l_panggul || 0 }}
                </td>
                <td v-if="hasBawahanData" class="tr">{{ sz.l_paha || 0 }}</td>
                <td v-if="hasBawahanData" class="tr">{{ sz.pesak || 0 }}</td>
                <td v-if="hasBawahanData" class="tr">{{ sz.l_lutut || 0 }}</td>
                <td v-if="hasBawahanData" class="tr">{{ sz.l_bawah || 0 }}</td>
              </tr>
            </tbody>
            <tfoot>
              <tr>
                <td class="fw-bold">Total</td>
                <td class="tr fw-bold text-primary">
                  {{
                    formData.Sizes.reduce(
                      (s: number, r: any) => s + (Number(r.qty) || 0),
                      0,
                    ).toLocaleString("id-ID")
                  }}
                </td>
                <td :colspan="totalExtraCols"></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>

    <!-- ── Kolom kanan: gambar desain + MKB ── -->
    <div class="order-right">
      <div class="section-card img-card">
        <div class="sec-title">Gambar Desain</div>
        <div class="img-box">
          <img
            v-if="displayImageUrl"
            :src="displayImageUrl"
            class="img-preview"
            style="cursor: pointer"
            @click="showPreviewDialog = true"
          />
          <div v-else-if="isLoadingImage" class="img-empty">
            <v-progress-circular indeterminate size="24" color="primary" />
          </div>
          <div v-else class="img-empty">
            <IconPhoto :size="40" color="#bdbdbd" />
            <div>No Image available</div>
          </div>
        </div>
        <button
          v-if="displayImageUrl && !isImageError"
          type="button"
          class="btn-fullscreen"
          @click="showPreviewDialog = true"
        >
          <IconMaximize :size="13" class="mr-1" /> Full Screen
        </button>
      </div>

      <div class="section-card mt-2">
        <div class="sec-title d-flex align-center">
          <span>Bahan dari MKB</span>
          <v-progress-circular
            v-if="isLoadingMkb"
            indeterminate
            color="primary"
            size="14"
            class="ml-2"
          />
        </div>

        <div v-if="mkbDetail.length > 0" class="mkb-list">
          <div v-for="(m, i) in mkbDetail" :key="i" class="mkb-item">
            <div class="mkb-item-head">
              <span class="mkb-nomor">{{ m.Nomor }}</span>
              <span class="mkb-komponen">{{ m.Komponen }}</span>
            </div>
            <div class="mkb-bahan">{{ m.NamaBahan }}</div>
            <div class="mkb-item-foot">
              <span v-if="m.Warna" class="mkb-tag">{{ m.Warna }}</span>
              <span v-if="m.Babaran" class="mkb-tag"
                >Babaran: {{ m.Babaran }}</span
              >
              <span class="mkb-qty">
                {{ Number(m.Butuh).toLocaleString("id-ID") }} {{ m.Satuan }}
              </span>
            </div>
            <div v-if="m.BahanDatang" class="mkb-datang">
              <b>Jadwal Datang:</b> {{ m.BahanDatang }}
            </div>
          </div>
        </div>
        <div v-else-if="!isLoadingMkb" class="mkb-empty">
          Belum ada MKB untuk SO ini.
        </div>
      </div>
    </div>
  </div>

  <!-- Modal SO -->
  <SalesOrderSearchModal v-model="showSoModal" @selected="onSoSelected" />

  <!-- Preview gambar -->
  <v-dialog v-model="showPreviewDialog" max-width="800px">
    <div class="preview-card">
      <div class="preview-hdr">
        <span>Preview Desain - {{ formData.so_nomor }}</span>
        <button class="preview-close" @click="showPreviewDialog = false">
          ✕
        </button>
      </div>
      <div class="preview-body">
        <v-img
          :src="displayImageUrl"
          max-height="75vh"
          contain
          class="bg-white rounded"
        />
      </div>
    </div>
  </v-dialog>
</template>

<style scoped>
.order-layout {
  display: flex;
  gap: 12px;
  align-items: flex-start;
  font-family: "Segoe UI", system-ui, sans-serif;
  font-size: 11px;
  padding: 8px;
  height: 100%;
  overflow-y: auto;
}
.order-left {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.order-right {
  width: 320px;
  flex-shrink: 0;
}

.section-card {
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  padding: 10px 12px;
}
.sec-title {
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #1565c0;
  margin-bottom: 8px;
}

.fr {
  display: flex;
  align-items: center;
  gap: 5px;
  margin-bottom: 4px;
  min-height: 24px;
}
.lbl {
  width: 100px;
  flex-shrink: 0;
  font-weight: 600;
  color: #424242;
  white-space: nowrap;
  font-size: 11px;
}
.inp {
  height: 24px;
  border: 1px solid #bdbdbd;
  border-radius: 3px;
  padding: 0 5px;
  font-size: 11px;
  outline: none;
  background: white;
  color: #212121;
  font-family: inherit;
  box-sizing: border-box;
}
.inp:focus {
  border-color: #1565c0;
}
.ro {
  background: #f0f0f0 !important;
  color: #555 !important;
}
.text-right {
  text-align: right;
}

.igrp {
  display: flex;
  border: 1px solid #bdbdbd;
  border-radius: 3px;
  overflow: hidden;
  height: 26px;
  background: white;
}
.igrp .inp {
  border: none;
  height: 24px;
}
.blkp {
  width: 26px;
  min-width: 26px;
  flex-shrink: 0;
  background: #e3f2fd;
  border: none;
  border-left: 1px solid #bdbdbd;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
}
.blkp:hover:not(:disabled) {
  background: #bbdefb;
}
.blkp:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.ml-2 {
  margin-left: 8px;
}
.mt-1 {
  margin-top: 4px;
}
.mt-2 {
  margin-top: 8px;
}

.so-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 32px 0;
  color: #bdbdbd;
  font-size: 12px;
}

/* Size summary */
.size-summary-wrap {
  max-height: 260px;
  overflow: auto;
  border: 1px solid #e0e0e0;
  border-radius: 3px;
}
.size-summary-table {
  width: 100%;
  min-width: max-content;
  border-collapse: collapse;
  font-size: 11px;
}
.size-summary-table thead th {
  background: #1565c0;
  color: white;
  padding: 5px 8px;
  position: sticky;
  top: 0;
  font-weight: 600;
}
.size-summary-table tbody td {
  padding: 3px 8px;
  border-bottom: 1px solid #f0f0f0;
}
.size-summary-table tfoot td {
  padding: 4px 8px;
  background: #f5f5f5;
  font-weight: 700;
  border-top: 2px solid #e0e0e0;
}
.tr {
  text-align: right;
}
.fw-bold {
  font-weight: 700;
}
.text-primary {
  color: #1565c0;
}

/* Gambar */
.img-card {
  display: flex;
  flex-direction: column;
}
.img-box {
  border: 1px solid #e0e0e0;
  border-radius: 3px;
  background: #fafafa;
  min-height: 280px;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  flex: 1;
}
.img-preview {
  width: 100%;
  height: 100%;
  object-fit: contain;
}
.img-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  color: #bdbdbd;
  font-size: 11px;
}
.btn-fullscreen {
  margin-top: 8px;
  background: #1565c0;
  color: white;
  border: none;
  border-radius: 4px;
  padding: 4px 10px;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  align-self: flex-start;
}
.btn-fullscreen:hover {
  opacity: 0.88;
}

.preview-card {
  background: white;
  border-radius: 8px;
  overflow: hidden;
}
.preview-hdr {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #1565c0;
  color: white;
  padding: 9px 14px;
  font-size: 13px;
  font-weight: 700;
}
.preview-close {
  background: transparent;
  border: none;
  color: rgba(255, 255, 255, 0.8);
  font-size: 16px;
  cursor: pointer;
}
.preview-body {
  padding: 16px;
  background: #f5f5f5;
}

.mkb-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  max-height: 280px;
  overflow-y: auto;
}
.mkb-item {
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  padding: 6px 8px;
  background: #fafafa;
}
.mkb-item-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2px;
}
.mkb-nomor {
  font-family: monospace;
  font-size: 9px;
  color: #1565c0;
  font-weight: 700;
}
.mkb-komponen {
  font-size: 9px;
  font-weight: 700;
  color: #455a64;
  text-transform: uppercase;
  background: #e3f2fd;
  padding: 1px 5px;
  border-radius: 2px;
}
.mkb-bahan {
  font-size: 10px;
  color: #212121;
  font-weight: 600;
  margin-bottom: 3px;
}
.mkb-item-foot {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 4px;
}
.mkb-datang {
  margin-top: 3px;
  padding-top: 3px;
  border-top: 1px dashed #ddd;
  font-size: 9px;
  color: #2e7d32;
  white-space: pre-line;
}
.mkb-tag {
  font-size: 9px;
  color: #757575;
  background: #eeeeee;
  padding: 1px 5px;
  border-radius: 2px;
}
.mkb-qty {
  margin-left: auto;
  font-size: 10px;
  font-weight: 700;
  color: #2e7d32;
}
.mkb-empty {
  text-align: center;
  padding: 16px 0;
  color: #bdbdbd;
  font-size: 10px;
}
.font-mono {
  font-family: monospace;
}
.badge-perfect {
  margin-left: 8px;
  background: #fff9c4;
  border: 1px solid #fbc02d;
  color: #795548;
  font-size: 10px;
  font-weight: 700;
  padding: 3px 8px;
  border-radius: 3px;
  white-space: nowrap;
}
</style>
