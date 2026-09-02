<script setup lang="ts">
import { ref, watch, computed, onMounted } from "vue";
import api from "@/services/api";
import { praOrderService } from "@/services/penjualan/praOrderService";
import { useToast } from "vue-toastification";
import { useAuthStore } from "@/stores/authStore";
import CustomerSearchModal from "@/components/lookups/CustomerSearchModal.vue";
import SalesSearchModal from "@/components/lookups/SalesSearchModal.vue";
import {
  IconLock,
  IconSearch,
  IconPhotoOff,
  IconDiscountCheck,
  IconClock,
  IconX,
  IconTrash,
  IconPlus,
} from "@tabler/icons-vue";

const props = defineProps<{ formData: any; isEdit: boolean }>();
const toast = useToast();
const authStore = useAuthStore();
const emit = defineEmits(["files-selected"]);

const showCustModal = ref(false);
const showSalesModal = ref(false);
const isOpeningModal = ref(false);
const fileRef = ref<HTMLInputElement | null>(null);

const isSavingBahanStatus = ref<Record<number, boolean>>({});
const isSavingPpicStatus = ref(false);
const catatanPpicDraft = ref(props.formData.CatatanPpic || "");

const divisiOptions = ref<any[]>([]);
const bahanMaster = ref<any[]>([]);
const selectedBahanToAdd = ref("");
const previewFiles = ref<{ name: string; url: string }[]>([]);
const showPreviewDialog = ref(false);
const previewUrl = ref("");

const loadDivisi = async () => {
  try {
    const res = await api.get("/penjualan/pra-order/divisi");
    divisiOptions.value = res.data.data.map((d: any) => ({
      value: String(d.Kode),
      title: `${d.Kode} - ${d.Nama}`,
    }));
  } catch {
    console.error("Gagal load divisi");
  }
};

const loadInitGrids = async () => {
  try {
    const res = await praOrderService.getInitGrids();
    bahanMaster.value = res.data.data.bahan || [];
  } catch {
    console.error("Gagal load master bahan");
  }
};

const setBahanReady = async (bahan: any, status: string) => {
  if (!bahan.ProbId) {
    toast.warning(
      "Simpan data terlebih dahulu sebelum cek ketersediaan bahan.",
    );
    return;
  }
  isSavingBahanStatus.value[bahan.ProbId] = true;
  try {
    await praOrderService.setStatusBahan(bahan.ProbId, status);
    bahan.StatusReady = status;
    toast.success(`Status bahan "${bahan.Nama}" diperbarui.`);
  } catch (e: any) {
    toast.error(e.response?.data?.message || "Gagal memperbarui status bahan.");
  } finally {
    isSavingBahanStatus.value[bahan.ProbId] = false;
  }
};

const setPpicDecision = async (status: string) => {
  if (!props.formData.Nomor) {
    toast.warning("Data belum tersimpan.");
    return;
  }
  if (status === "TIDAK SANGGUP" && !catatanPpicDraft.value.trim()) {
    toast.warning("Catatan alasan wajib diisi untuk status Tidak Sanggup.");
    return;
  }
  isSavingPpicStatus.value = true;
  try {
    await praOrderService.setStatusPpic(
      props.formData.Nomor,
      status,
      catatanPpicDraft.value,
    );
    props.formData.StatusPpic = status;
    props.formData.CatatanPpic = catatanPpicDraft.value;
    toast.success("Keputusan PPIC berhasil disimpan.");
  } catch (e: any) {
    toast.error(e.response?.data?.message || "Gagal menyimpan keputusan PPIC.");
  } finally {
    isSavingPpicStatus.value = false;
  }
};

onMounted(() => {
  loadDivisi();
  loadInitGrids();
});

// ── Customer / Sales lookup (identik pola Minta Harga) ──
const onCustKodeEnter = async () => {
  if (isOpeningModal.value) return;
  const kode = props.formData.CustKode?.trim();
  if (!kode) {
    props.formData.CustNama = "";
    return;
  }
  try {
    const res = await api.get("/lookups/customer", {
      params: { q: kode, limit: 1 },
    });
    const items = res.data.data.items || res.data.data || [];
    const exact = items.find(
      (c: any) =>
        (c.cus_kode || c.Kode || "").toUpperCase() === kode.toUpperCase(),
    );
    if (exact) {
      props.formData.CustKode = exact.cus_kode || exact.Kode;
      props.formData.CustNama = exact.cus_nama || exact.Nama;
    } else {
      toast.error("Kode customer tidak ditemukan.");
      props.formData.CustKode = "";
      props.formData.CustNama = "";
    }
  } catch {
    toast.error("Gagal memvalidasi kode customer.");
  }
};

const handleCustSelected = (item: any) => {
  props.formData.CustKode = item.cus_kode || item.Kode || item.kode;
  props.formData.CustNama = item.cus_nama || item.Nama || item.nama;
};

const onSalesKodeEnter = async () => {
  if (isOpeningModal.value) return;
  const kode = props.formData.SalesKode?.trim();
  if (!kode) {
    props.formData.SalesNama = "";
    return;
  }
  try {
    const res = await api.get("/lookups/sales", {
      params: { q: kode, limit: 1 },
    });
    const items = res.data.data.items || res.data.data || [];
    const exact = items.find(
      (s: any) =>
        (s.sal_kode || s.Kode || "").toUpperCase() === kode.toUpperCase(),
    );
    if (exact) {
      props.formData.SalesKode = exact.sal_kode || exact.Kode;
      props.formData.SalesNama = exact.sal_nama || exact.Nama;
    } else {
      toast.error("Kode sales tidak ditemukan.");
      props.formData.SalesKode = "";
      props.formData.SalesNama = "";
    }
  } catch {
    toast.error("Gagal memvalidasi kode sales.");
  }
};

const handleSalesSelected = (item: any) => {
  props.formData.SalesKode = item.sal_kode || item.Kode || item.kode;
  props.formData.SalesNama = item.sal_nama || item.Nama || item.nama;
};

// ── Bahan alternatif (chip list) ──
// Ganti computed title supaya bisa dicari lewat kode ATAU nama
const bahanOptions = computed(() =>
  bahanMaster.value.map((b: any) => ({
    value: b.Kode,
    title: `${b.Kode} — ${b.Nama} (${b.Warna || "-"}/${b.Gramasi || "-"})`,
    raw: b,
  })),
);

// dipanggil otomatis begitu user pilih dari prediksi (v-model:model-value)
const onBahanPicked = (kode: string | null) => {
  if (!kode) return;
  const exists = props.formData.Bahan.some((b: any) => b.Kode === kode);
  if (exists) {
    toast.warning("Bahan ini sudah ditambahkan.");
    selectedBahanToAdd.value = "";
    return;
  }
  const master = bahanMaster.value.find((b: any) => b.Kode === kode);
  props.formData.Bahan.push({
    Kode: kode,
    Nama: master?.Nama || kode,
    StatusReady: "",
  });
  // reset field supaya siap ketik bahan berikutnya
  selectedBahanToAdd.value = "";
};

const removeBahan = (idx: number) => {
  props.formData.Bahan.splice(idx, 1);
};

const readyBadgeClass = (status: string) => {
  if (status === "READY") return "ready-yes";
  if (status === "TIDAK READY") return "ready-no";
  return "ready-pending";
};

// ── Gambar upload (multi) ──
const onFileChange = (e: Event) => {
  const files = Array.from((e.target as HTMLInputElement).files || []);
  if (!files.length) return;
  const oversized = files.filter((f) => f.size > 2_000_000);
  if (oversized.length) {
    toast.error("Ukuran setiap gambar tidak boleh > 2 Mb.");
    return;
  }
  const newPreviews = files.map((f) => ({
    name: f.name,
    url: URL.createObjectURL(f),
  }));
  previewFiles.value = [...previewFiles.value, ...newPreviews];
  emit("files-selected", files);
  if (fileRef.value) fileRef.value.value = "";
};

const getBaseUrl = () => api.defaults.baseURL?.replace(/\/api\/?$/, "") || "";
const gambarUrl = (path: string) => {
  if (!path) return "";
  return `${getBaseUrl()}${path}`;
};

const openPreview = (url: string) => {
  previewUrl.value = url;
  showPreviewDialog.value = true;
};
</script>

<template>
  <div class="tp-wrapper">
    <div v-if="formData.isTutupBuku" class="tp-alert-wrap">
      <div class="tp-alert warning">
        <IconLock :size="13" class="mr-1" />
        Periode ini sudah ditutup. Anda tidak dapat mengubah data ini.
      </div>
    </div>

    <div
      class="tp-inner"
      :style="formData.isTutupBuku ? 'pointer-events:none;opacity:0.8' : ''"
    >
      <div class="tp-left">
        <div class="tp-section">
          <div class="tp-row">
            <label class="tp-lbl">Divisi</label>
            <v-select
              v-model="formData.Divisi"
              :items="divisiOptions"
              variant="outlined"
              density="compact"
              :readonly="isEdit"
              hide-details
              class="f-inp"
              style="max-width: 170px"
            />
            <label class="tp-lbl" style="width: 80px; margin-left: 20px"
              >Status</label
            >
            <span
              class="status-chip"
              :class="formData.Status === 'CLOSE' ? 'st-close' : 'st-open'"
            >
              {{ formData.Status }}
            </span>
          </div>

          <div class="tp-row">
            <label class="tp-lbl">Nomor</label>
            <v-text-field
              v-model="formData.Nomor"
              variant="outlined"
              density="compact"
              readonly
              bg-color="grey-lighten-4"
              hide-details
              class="f-inp"
              style="max-width: 180px"
            >
              <template #append-inner>
                <span v-if="!isEdit" class="hint-new"
                  >Baru= Nomor Otomatis</span
                >
              </template>
            </v-text-field>
          </div>

          <div class="tp-row">
            <label class="tp-lbl">Tanggal</label>
            <input
              type="date"
              v-model="formData.Tanggal"
              class="tp-date"
              style="width: 130px"
              :disabled="isEdit"
            />
            <label class="tp-lbl" style="margin-left: 20px; width: 55px"
              >Created</label
            >
            <input
              :value="formData.Created || '—'"
              readonly
              class="tp-inp-ro"
              style="width: 180px"
            />
          </div>

          <div class="tp-row">
            <label class="tp-lbl">User</label>
            <input
              :value="formData.User || '—'"
              readonly
              class="tp-inp-ro"
              style="width: 130px"
            />
          </div>

          <div class="tp-row">
            <label class="tp-lbl">Customer</label>
            <div class="tp-inp-grp" style="width: 100px">
              <input
                v-model="formData.CustKode"
                class="tp-inp-field"
                style="background: #ddeeff; font-weight: 600"
                placeholder="Kode..."
                @keydown.enter.prevent="
                  ($event.target as HTMLInputElement).blur()
                "
                @blur="onCustKodeEnter"
              />
              <button
                type="button"
                class="tp-lkp-btn"
                @mousedown.prevent="
                  isOpeningModal = true;
                  showCustModal = true;
                "
                @click="isOpeningModal = false"
              >
                <IconSearch :size="13" />
              </button>
            </div>
            <input
              v-model="formData.CustNama"
              class="tp-inp-field flex-1"
              :readonly="!!formData.CustKode"
            />
          </div>

          <div class="tp-row">
            <label class="tp-lbl">Sales</label>
            <div class="tp-inp-grp" style="width: 100px">
              <input
                v-model="formData.SalesKode"
                class="tp-inp-field"
                style="background: #ddeeff; font-weight: 600"
                placeholder="Kode..."
                @keydown.enter.prevent="
                  ($event.target as HTMLInputElement).blur()
                "
                @blur="onSalesKodeEnter"
              />
              <button
                type="button"
                class="tp-lkp-btn"
                @mousedown.prevent="
                  isOpeningModal = true;
                  showSalesModal = true;
                "
                @click="isOpeningModal = false"
              >
                <IconSearch :size="13" />
              </button>
            </div>
            <input
              v-model="formData.SalesNama"
              class="tp-inp-field flex-1"
              readonly
              style="background: #f5f5f5"
            />
          </div>

          <div class="tp-row">
            <label class="tp-lbl">Nama Pekerjaan</label>
            <v-text-field
              v-model="formData.NamaPekerjaan"
              variant="outlined"
              density="compact"
              hide-details
              class="f-inp"
              placeholder="mis. Jersey Vneck Lengan Pendek Kalsi"
            />
          </div>

          <div class="tp-row">
            <label class="tp-lbl">Finishing</label>
            <v-text-field
              v-model="formData.Finishing"
              variant="outlined"
              density="compact"
              hide-details
              class="f-inp"
              placeholder="mis. Cetak Full Sublim"
            />
          </div>

          <div class="tp-row" style="align-items: flex-start">
            <label class="tp-lbl" style="padding-top: 6px">Spesifikasi</label>
            <v-textarea
              v-model="formData.Spesifikasi"
              variant="outlined"
              density="compact"
              hide-details
              rows="2"
              class="f-inp"
              placeholder="mis. Leher pakai rip jadi, tanpa manset lengan"
            />
          </div>

          <div class="tp-row">
            <label class="tp-lbl">Sampel</label>
            <label class="chk-label">
              <input
                type="checkbox"
                :checked="formData.Sampel === 'Y'"
                @change="
                  formData.Sampel = ($event.target as HTMLInputElement).checked
                    ? 'Y'
                    : 'N'
                "
              />
              Perlu Sampel
            </label>
          </div>

          <div class="tp-row">
            <label class="tp-lbl">Tgl Rencana Kirim</label>
            <input
              type="date"
              v-model="formData.TglKirim"
              class="tp-date"
              style="width: 150px"
            />
          </div>

          <div class="tp-row" style="align-items: flex-start">
            <label class="tp-lbl" style="padding-top: 6px"
              >Catatan Deadline</label
            >
            <v-textarea
              v-model="formData.CatatanDeadline"
              variant="outlined"
              density="compact"
              hide-details
              rows="2"
              class="f-inp"
              placeholder="mis. Harus sampai Gresik tgl 13 Juli"
            />
          </div>

          <!-- Bahan Alternatif -->
          <div class="tp-row" style="align-items: flex-start; margin-top: 8px">
            <label class="tp-lbl" style="padding-top: 6px"
              >Bahan Alternatif</label
            >
            <div class="flex-1">
              <div class="bahan-add-row">
                <v-autocomplete
                  v-model="selectedBahanToAdd"
                  :items="bahanOptions"
                  item-title="title"
                  item-value="value"
                  variant="outlined"
                  density="compact"
                  hide-details
                  clearable
                  placeholder="Ketik kode atau nama bahan..."
                  no-data-text="Bahan tidak ditemukan"
                  class="f-inp"
                  @update:model-value="onBahanPicked"
                />
              </div>
              <div class="bahan-chip-list">
                <div
                  v-for="(b, idx) in formData.Bahan"
                  :key="idx"
                  class="bahan-chip"
                >
                  <span
                    class="bahan-chip-badge"
                    :class="readyBadgeClass(b.StatusReady)"
                  ></span>
                  <span>{{ b.Kode }} - {{ b.Nama }}</span>
                  <button
                    type="button"
                    class="bahan-chip-del"
                    @click="removeBahan(Number(idx))"
                  >
                    <IconTrash :size="12" />
                  </button>
                </div>
                <div v-if="!formData.Bahan.length" class="bahan-empty">
                  Belum ada bahan dipilih.
                </div>
              </div>
            </div>
          </div>

          <!-- Status PPIC (read only, diisi dari BrowseView) -->
          <div v-if="isEdit" class="tp-row" style="margin-top: 8px">
            <label class="tp-lbl">Status PPIC</label>
            <span
              class="status-chip"
              :class="{
                'st-sanggup': formData.StatusPpic === 'SANGGUP',
                'st-tidak': formData.StatusPpic === 'TIDAK SANGGUP',
                'st-pending': formData.StatusPpic === 'PENDING',
              }"
            >
              {{ formData.StatusPpic }}
            </span>
          </div>
          <div v-if="isEdit && formData.CatatanPpic" class="tp-row">
            <label class="tp-lbl">Catatan PPIC</label>
            <span class="tp-value-text">{{ formData.CatatanPpic }}</span>
          </div>
          <div v-if="isEdit && formData.NomorMH" class="tp-row">
            <label class="tp-lbl">No. Permintaan Harga</label>
            <span class="tp-value-text fw">{{ formData.NomorMH }}</span>
          </div>
        </div>
      </div>

      <!-- ── Kolom kanan: Design + Status Edit ── -->
      <div class="tp-right">
        <div
          class="tp-section"
          style="flex-shrink: 0; display: flex; flex-direction: column"
        >
          <div class="tp-sec-title">Design</div>

          <div
            v-if="formData.Gambar.length || previewFiles.length"
            class="tp-gambar-grid"
          >
            <div
              v-for="(g, idx) in formData.Gambar"
              :key="'saved-' + idx"
              class="tp-gambar-thumb"
              @click="openPreview(gambarUrl(g.Path))"
            >
              <img :src="gambarUrl(g.Path)" />
            </div>
            <div
              v-for="(p, idx) in previewFiles"
              :key="'new-' + idx"
              class="tp-gambar-thumb new"
              @click="openPreview(p.url)"
            >
              <img :src="p.url" />
              <span class="tp-gambar-new-badge">Baru</span>
            </div>
          </div>
          <div v-else class="tp-img-empty" style="height: 120px">
            <IconPhotoOff :size="28" color="#bdbdbd" />
            <div class="mt-1">Belum ada gambar desain</div>
          </div>

          <div class="tp-upload-row" style="margin-top: 6px">
            <input
              ref="fileRef"
              type="file"
              accept="image/*"
              multiple
              style="display: none"
              @change="onFileChange"
            />
            <button
              class="tp-upload-btn"
              type="button"
              style="width: 100%"
              @click="fileRef?.click()"
            >
              + Tambah Gambar Desain
            </button>
          </div>
          <div class="tp-img-hint">
            Ukuran Maksimal 2 Mb per gambar, bisa lebih dari satu
          </div>

          <div
            v-if="formData.StatusEdit"
            class="tp-status-badge mt-2"
            :class="formData.StatusEdit === 'ACC' ? 'st-acc' : 'st-wait'"
          >
            <component
              :is="
                formData.StatusEdit === 'ACC' ? IconDiscountCheck : IconClock
              "
              :size="12"
              class="mr-1"
            />
            Status Approval: <strong>{{ formData.StatusEdit }}</strong>
          </div>
        </div>

        <!-- Panel Aksi PPIC — hanya tampil untuk user bagian PPIC (atau ADMIN), dan hanya saat edit (data sudah tersimpan) -->
        <div
          v-if="isEdit && authStore.isPpic && formData.Status !== 'CLOSE'"
          class="tp-section tp-ppic-panel"
        >
          <div class="tp-sec-title">Aksi PPIC</div>

          <div class="ppic-sub-title">Cek Ketersediaan Bahan</div>
          <div class="ppic-bahan-list">
            <div
              v-for="b in formData.Bahan"
              :key="b.Kode"
              class="ppic-bahan-row"
            >
              <span class="ppic-bahan-nama">{{ b.Kode }} - {{ b.Nama }}</span>
              <div class="ppic-bahan-actions">
                <button
                  type="button"
                  class="ppic-btn-mini ready"
                  :class="{ active: b.StatusReady === 'READY' }"
                  :disabled="isSavingBahanStatus[b.ProbId]"
                  @click="setBahanReady(b, 'READY')"
                >
                  Ready
                </button>
                <button
                  type="button"
                  class="ppic-btn-mini not-ready"
                  :class="{ active: b.StatusReady === 'TIDAK READY' }"
                  :disabled="isSavingBahanStatus[b.ProbId]"
                  @click="setBahanReady(b, 'TIDAK READY')"
                >
                  Tidak Ready
                </button>
              </div>
            </div>
            <div v-if="!formData.Bahan.length" class="bahan-empty">
              Belum ada bahan alternatif.
            </div>
          </div>

          <div class="ppic-sub-title" style="margin-top: 10px">
            Keputusan Kesanggupan
          </div>
          <v-textarea
            v-model="catatanPpicDraft"
            variant="outlined"
            density="compact"
            hide-details
            rows="2"
            class="f-inp"
            placeholder="Catatan (wajib jika Tidak Sanggup)..."
          />
          <div class="ppic-decision-row">
            <button
              type="button"
              class="ppic-btn-decision sanggup"
              :disabled="isSavingPpicStatus"
              @click="setPpicDecision('SANGGUP')"
            >
              ✓ Sanggup
            </button>
            <button
              type="button"
              class="ppic-btn-decision tidak"
              :disabled="isSavingPpicStatus"
              @click="setPpicDecision('TIDAK SANGGUP')"
            >
              ✕ Tidak Sanggup
            </button>
          </div>
        </div>

        <div
          class="tp-section"
          style="
            flex: 1;
            display: flex;
            flex-direction: column;
            min-height: 0;
            margin-top: 8px;
          "
        >
          <div class="tp-sec-title">Info</div>
          <div class="tp-note">
            Detail ukuran, qty, dan keterangan tambahan diisi di tab
            <strong>"Ukuran & Keterangan"</strong>.
          </div>
        </div>
      </div>
    </div>
  </div>

  <CustomerSearchModal v-model="showCustModal" @selected="handleCustSelected" />
  <SalesSearchModal v-model="showSalesModal" @selected="handleSalesSelected" />

  <v-dialog v-model="showPreviewDialog" max-width="800px">
    <v-card class="rounded-lg">
      <v-card-title
        class="bg-primary text-white d-flex justify-space-between align-center pa-3"
      >
        <span class="text-subtitle-1 font-weight-bold">Preview Desain</span>
        <v-btn
          variant="text"
          size="small"
          color="white"
          @click="showPreviewDialog = false"
        >
          <IconX :size="18" :stroke-width="2" />
        </v-btn>
      </v-card-title>
      <v-card-text class="pa-4 text-center bg-grey-lighten-4">
        <v-img
          :src="previewUrl"
          max-height="600"
          contain
          class="bg-white rounded border"
        />
      </v-card-text>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.tp-wrapper {
  display: flex;
  flex-direction: column;
  height: 100%;
  font-family: "Segoe UI", system-ui, sans-serif;
  font-size: 12px;
}
.tp-alert-wrap {
  margin-bottom: 8px;
  flex-shrink: 0;
}
.tp-alert {
  display: flex;
  align-items: center;
  padding: 6px 12px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 600;
}
.tp-alert.warning {
  background: #fff8e1;
  color: #f57f17;
  border: 1px solid #ffe082;
}
.tp-inner {
  flex: 1;
  display: flex;
  flex-direction: row;
  gap: 10px;
  align-items: stretch;
  min-height: 0;
}
.tp-left {
  flex: 1;
  min-width: 0;
}
.tp-right {
  width: 380px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.tp-section {
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  padding: 8px 10px;
}
.tp-sec-title {
  font-size: 10px;
  font-weight: 700;
  color: #555;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  margin-bottom: 5px;
}
.tp-row {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 4px;
}
.tp-lbl {
  width: 130px;
  flex-shrink: 0;
  font-size: 11px;
  font-weight: 500;
  color: #333;
  white-space: nowrap;
}
.f-inp {
  flex: 1;
  min-width: 0;
}
.f-inp :deep(.v-field) {
  font-size: 12px;
  min-height: 26px;
}
.f-inp :deep(.v-field__input) {
  min-height: 26px;
  padding-top: 0;
  padding-bottom: 0;
  font-size: 12px;
}
.tp-inp-ro {
  height: 26px;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  padding: 0 6px;
  font-size: 12px;
  background: #f5f5f5;
  color: #555;
  outline: none;
}
.tp-date {
  height: 26px;
  border: 1px solid #bdbdbd;
  border-radius: 4px;
  padding: 0 6px;
  font-size: 12px;
  outline: none;
  background: white;
  color: #212121;
}
.tp-date:focus {
  border-color: #1976d2;
}
.tp-date:disabled {
  background: #f5f5f5;
}
.hint-new {
  font-size: 10px;
  color: #e53935;
  font-style: italic;
  font-weight: 600;
  white-space: nowrap;
}
.chk-label {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  cursor: pointer;
  white-space: nowrap;
}
.chk-label input[type="checkbox"] {
  accent-color: #1565c0;
  cursor: pointer;
}
.tp-inp-grp {
  display: flex;
  height: 26px;
  border: 1px solid #bdbdbd;
  border-radius: 4px;
  overflow: hidden;
  flex-shrink: 0;
}
.tp-inp-field {
  flex: 1;
  height: 26px;
  border: 1px solid #bdbdbd;
  border-radius: 4px;
  padding: 0 6px;
  font-size: 12px;
  outline: none;
  background: white;
  min-width: 0;
  box-sizing: border-box;
}
.tp-inp-field:focus {
  border-color: #1565c0;
}
.tp-inp-grp .tp-inp-field {
  border: none;
  border-radius: 0;
  height: 100%;
}
.tp-lkp-btn {
  width: 26px;
  height: 100%;
  background: #f0f0f0;
  border: none;
  border-left: 1px solid #bdbdbd;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #1565c0;
  flex-shrink: 0;
}
.tp-lkp-btn:hover {
  background: #e3f2fd;
}
.flex-1 {
  flex: 1;
  min-width: 0;
}
.tp-value-text {
  font-size: 12px;
  color: #212121;
}
.tp-value-text.fw {
  font-weight: 700;
}
.tp-note {
  font-size: 11px;
  color: #757575;
  line-height: 1.5;
}

.status-chip {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 3px;
  font-size: 11px;
  font-weight: 700;
}
.st-open {
  background: #e3f2fd;
  color: #1565c0;
}
.st-close {
  background: #eeeeee;
  color: #616161;
}
.st-pending {
  background: #eeeeee;
  color: #616161;
}
.st-sanggup {
  background: #e8f5e9;
  color: #2e7d32;
}
.st-tidak {
  background: #ffebee;
  color: #c62828;
}

/* Bahan alternatif */
.bahan-add-row {
  display: flex;
  gap: 6px;
  margin-bottom: 6px;
}
.bahan-select {
  flex: 1;
  height: 28px;
  border: 1px solid #bdbdbd;
  border-radius: 4px;
  padding: 0 6px;
  font-size: 12px;
  background: white;
}
.bahan-add-btn {
  width: 28px;
  height: 28px;
  background: #1565c0;
  color: white;
  border: none;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  flex-shrink: 0;
}
.bahan-add-btn:hover {
  background: #0d47a1;
}
.bahan-chip-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.bahan-chip {
  display: flex;
  align-items: center;
  gap: 5px;
  background: #f0f4f8;
  border: 1px solid #dde3ea;
  border-radius: 20px;
  padding: 3px 10px;
  font-size: 11px;
}
.bahan-chip-badge {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
  background: #bdbdbd;
}
.bahan-chip-badge.ready-yes {
  background: #2e7d32;
}
.bahan-chip-badge.ready-no {
  background: #e53935;
}
.bahan-chip-badge.ready-pending {
  background: #bdbdbd;
}
.bahan-chip-del {
  background: transparent;
  border: none;
  color: #e53935;
  cursor: pointer;
  display: flex;
  align-items: center;
}
.bahan-empty {
  font-size: 11px;
  color: #9e9e9e;
}

/* Gambar grid */
.tp-gambar-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 6px;
}
.tp-gambar-thumb {
  position: relative;
  height: 90px;
  border-radius: 3px;
  overflow: hidden;
  border: 1px solid #e0e0e0;
  cursor: pointer;
}
.tp-gambar-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.tp-gambar-thumb.new {
  border-color: #1565c0;
}
.tp-gambar-new-badge {
  position: absolute;
  bottom: 2px;
  right: 2px;
  background: #1565c0;
  color: white;
  font-size: 8px;
  padding: 1px 4px;
  border-radius: 2px;
}
.tp-img-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #bdbdbd;
  font-size: 11px;
  border: 1px dashed #e0e0e0;
  border-radius: 3px;
  background: #fafafa;
}
.tp-upload-btn {
  background: #546e7a;
  color: white;
  border: none;
  border-radius: 3px;
  padding: 6px 10px;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
}
.tp-upload-btn:hover {
  background: #455a64;
}
.tp-img-hint {
  font-size: 10px;
  color: #9e9e9e;
  margin-top: 3px;
}

.tp-status-badge {
  display: flex;
  align-items: center;
  padding: 4px 8px;
  border-radius: 3px;
  font-size: 11px;
}
.st-acc {
  background: #e8f5e9;
  color: #2e7d32;
  border: 1px solid #a5d6a7;
}
.st-wait {
  background: #fff8e1;
  color: #f57f17;
  border: 1px solid #ffe082;
}
.tp-ppic-panel {
  border-color: #90caf9;
  background: #f7fbff;
}
.ppic-sub-title {
  font-size: 10px;
  font-weight: 700;
  color: #1565c0;
  margin-bottom: 5px;
}
.ppic-bahan-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.ppic-bahan-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  padding: 4px 8px;
}
.ppic-bahan-nama {
  font-size: 11px;
  color: #333;
  flex: 1;
  min-width: 0;
}
.ppic-bahan-actions {
  display: flex;
  gap: 4px;
  flex-shrink: 0;
}
.ppic-btn-mini {
  font-size: 10px;
  padding: 3px 8px;
  border-radius: 3px;
  border: 1px solid #ccc;
  background: white;
  color: #555;
  cursor: pointer;
  font-weight: 600;
}
.ppic-btn-mini:disabled {
  opacity: 0.5;
  cursor: default;
}
.ppic-btn-mini.ready.active {
  background: #2e7d32;
  border-color: #2e7d32;
  color: white;
}
.ppic-btn-mini.not-ready.active {
  background: #e53935;
  border-color: #e53935;
  color: white;
}
.ppic-decision-row {
  display: flex;
  gap: 6px;
  margin-top: 6px;
}
.ppic-btn-decision {
  flex: 1;
  padding: 6px;
  border: none;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 700;
  cursor: pointer;
  color: white;
}
.ppic-btn-decision:disabled {
  opacity: 0.6;
  cursor: default;
}
.ppic-btn-decision.sanggup {
  background: #2e7d32;
}
.ppic-btn-decision.sanggup:hover:not(:disabled) {
  background: #1b5e20;
}
.ppic-btn-decision.tidak {
  background: #e53935;
}
.ppic-btn-decision.tidak:hover:not(:disabled) {
  background: #c62828;
}
</style>
