<script setup lang="ts">
import { ref, watch, onMounted, computed } from "vue";
import api from "@/services/api";
import { useToast } from "vue-toastification";
import CustomerSearchModal from "@/components/lookups/CustomerSearchModal.vue";
import SalesSearchModal from "@/components/lookups/SalesSearchModal.vue";
import {
  IconLock,
  IconSearch,
  IconPhoto,
  IconDiscountCheck,
  IconClock,
  IconX,
  IconPhotoOff,
  IconExternalLink,
} from "@tabler/icons-vue";

const props = defineProps<{ formData: any; isEdit: boolean }>();
const toast = useToast();
const emit = defineEmits(["image-selected"]);

const showCustModal = ref(false);
const showSalesModal = ref(false);
const fileRef = ref<HTMLInputElement | null>(null);
const uploadName = ref("");

// ── STATE UNTUK MODAL PREVIEW ──
const showPreviewDialog = ref(false);

// ── COMPUTED UNTUK URL GAMBAR (Lokal atau Server) ──
const displayImageUrl = computed(() => {
  // 1. Prioritas utama: Jika user baru saja klik "Upload" (URL berwujud blob lokal)
  if (
    props.formData.PathImage &&
    props.formData.PathImage.startsWith("blob:")
  ) {
    return props.formData.PathImage;
  }

  // 2. Jika mode Edit, ambil dari VPS menggunakan format Regex yang sudah paten
  if (props.isEdit) {
    const identifier = props.formData.Gambar || props.formData.Nomor;
    if (!identifier) return "";

    let cleanName = identifier;
    const matchMH = cleanName.match(/(MH\.\d{4}\.\d+)/i);

    if (matchMH) {
      cleanName = matchMH[1];
      return `http://103.94.238.252:8888/file-gambar/mintaharga/${cleanName}.jpg`;
    } else if (props.formData.Gambar) {
      // Fallback untuk upload manual jika bukan nomor MH
      cleanName = cleanName.replace(/.*imagemintaharga/i, "");
      cleanName = cleanName.replace(/.*Downloads/i, "");
      cleanName = cleanName.replace(/\\/g, "/").split("/").pop() || "";
      cleanName = cleanName.replace(/\.(jpe?g|png)$/i, "");
      return `http://103.94.238.252:8888/file-gambar/${encodeURIComponent(cleanName)}.jpg`;
    }
  }

  return "";
});

const divisiOptions = ref<any[]>([]);
const statusOptions = ["BELUM", "MINTA", "WAIT", "CANCEL", "DONE"];
const perfectOptions = ["Y", "N", ""];

watch(
  () => props.formData.Divisi,
  (newDiv) => {
    if (!props.isEdit) {
      if (newDiv === "3") {
        props.formData.CustKode = "DC";
        props.formData.CustNama = "KAOSAN DC";
      } else {
        props.formData.CustKode = "";
        props.formData.CustNama = "";
      }
    }
  },
);

const loadDivisi = async () => {
  try {
    const res = await api.get("/penjualan/minta-harga/divisi");
    divisiOptions.value = res.data.data.map((d: any) => ({
      value: String(d.Kode),
      title: `${d.Kode} - ${d.Nama}`,
    }));
  } catch {
    console.error("Gagal load divisi");
  }
};
onMounted(loadDivisi);

const handleCustSelected = (item: any) => {
  const kode = item.cus_kode || item.Kode || item.kode;
  const nama = item.cus_nama || item.Nama || item.nama;
  const aktif = item.cus_aktif ?? item.Aktif ?? 0;
  if (aktif === 1 || aktif === "1" || aktif === "N") {
    toast.warning("Status Customer Pasif.");
    return;
  }
  props.formData.CustKode = kode;
  props.formData.CustNama = nama;
};

const handleSalesSelected = (item: any) => {
  props.formData.SalesKode = item.sal_kode || item.Kode || item.kode;
  props.formData.SalesNama = item.sal_nama || item.Nama || item.nama;
};

const onFileChange = (e: Event) => {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (!file) return;
  if (file.size > 1_000_000) {
    toast.error("Ukuran gambar tidak boleh > 1 Mb.");
    return;
  }
  uploadName.value = file.name;
  props.formData.PathImage = URL.createObjectURL(file); // Ini menghasilkan "blob:http..."
  emit("image-selected", file);
};
</script>

<template>
  <div class="tp-layout">
    <!-- Alert tutup buku -->
    <div v-if="formData.isTutupBuku" class="tp-alert-wrap">
      <div class="tp-alert warning">
        <IconLock :size="13" class="mr-1" />
        Periode ini sudah ditutup. Anda tidak dapat mengubah data ini.
      </div>
    </div>

    <!-- ── Kolom kiri ── -->
    <div
      class="tp-left"
      :style="formData.isTutupBuku ? 'pointer-events:none;opacity:0.8' : ''"
    >
      <div class="tp-section">
        <!-- Divisi + Status -->
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
          <label class="tp-lbl" style="width: 50px; margin-left: 20px"
            >Status</label
          >
          <v-select
            v-model="formData.Status"
            :items="statusOptions"
            variant="outlined"
            density="compact"
            hide-details
            class="f-inp"
            style="max-width: 110px"
          />
        </div>

        <!-- Nomor -->
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
              <span v-if="!isEdit" class="hint-new">Baru= Nomor Otomatis</span>
            </template>
          </v-text-field>
        </div>

        <!-- Tanggal + Created sejajar -->
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

        <!-- User + Customer Perfect sejajar -->
        <div class="tp-row">
          <label class="tp-lbl">User</label>
          <input
            :value="formData.User || '—'"
            readonly
            class="tp-inp-ro"
            style="width: 130px"
          />
          <label class="tp-lbl" style="margin-left: 20px; width: 120px"
            >Customer Perfect</label
          >
          <v-select
            v-model="formData.Perfect"
            :items="perfectOptions"
            variant="outlined"
            density="compact"
            hide-details
            class="f-inp"
            style="max-width: 80px"
          />
        </div>

        <!-- Customer -->
        <div class="tp-row">
          <label class="tp-lbl">Customer</label>
          <v-text-field
            v-model="formData.CustKode"
            variant="outlined"
            density="compact"
            readonly
            hide-details
            class="f-inp"
            style="max-width: 100px; background: #ddeeff"
          >
            <template #append-inner>
              <IconSearch
                :size="13"
                color="primary"
                style="cursor: pointer"
                @mousedown.prevent="showCustModal = true"
              />
            </template>
          </v-text-field>
          <v-text-field
            v-model="formData.CustNama"
            variant="outlined"
            density="compact"
            :readonly="!!formData.CustKode"
            hide-details
            class="f-inp"
          />
        </div>

        <!-- Sales -->
        <div class="tp-row">
          <label class="tp-lbl">Sales</label>
          <v-text-field
            v-model="formData.SalesKode"
            variant="outlined"
            density="compact"
            readonly
            hide-details
            class="f-inp"
            style="max-width: 100px; background: #ddeeff"
          >
            <template #append-inner>
              <IconSearch
                :size="13"
                color="primary"
                style="cursor: pointer"
                @mousedown.prevent="showSalesModal = true"
              />
            </template>
          </v-text-field>
          <v-text-field
            v-model="formData.SalesNama"
            variant="outlined"
            density="compact"
            readonly
            bg-color="grey-lighten-3"
            hide-details
            class="f-inp"
          />
        </div>

        <!-- Nama Pekerjaan -->
        <div class="tp-row">
          <label class="tp-lbl">Nama Pekerjaan</label>
          <v-text-field
            v-model="formData.NamaPekerjaan"
            variant="outlined"
            density="compact"
            hide-details
            class="f-inp"
          />
        </div>

        <!-- Rencana Order -->
        <div class="tp-row">
          <label class="tp-lbl">Rencana Order</label>
          <v-text-field
            v-model.number="formData.RencanaOrder"
            type="number"
            variant="outlined"
            density="compact"
            hide-details
            class="f-inp"
            style="max-width: 100px"
          />
        </div>

        <!-- Harga Lama + Budget -->
        <div class="tp-row">
          <label class="tp-lbl">Harga Lama</label>
          <v-text-field
            v-model.number="formData.HargaLama"
            type="number"
            variant="outlined"
            density="compact"
            hide-details
            class="f-inp"
            style="max-width: 130px"
          />
          <label class="tp-lbl" style="margin-left: 20px; width: 90px"
            >Harga Budget</label
          >
          <v-text-field
            v-model.number="formData.HargaBudget"
            type="number"
            variant="outlined"
            density="compact"
            hide-details
            class="f-inp"
            style="max-width: 130px"
          />
        </div>

        <!-- Tgl Order Terakhir -->
        <div class="tp-row">
          <label class="tp-lbl">Tgl Order Terakhir</label>
          <input
            type="date"
            v-model="formData.TanggalOrderTerakhir"
            class="tp-date"
          />
        </div>

        <!-- Kain -->
        <div class="tp-row">
          <label class="tp-lbl">Kain</label>
          <v-text-field
            v-model="formData.Kain"
            variant="outlined"
            density="compact"
            hide-details
            class="f-inp"
          />
        </div>

        <!-- Ukuran P x L + Ket -->
        <div class="tp-row">
          <label class="tp-lbl">Ukuran (PxL)</label>
          <v-text-field
            v-model.number="formData.Panjang"
            type="number"
            variant="outlined"
            density="compact"
            hide-details
            class="f-inp"
            style="max-width: 72px"
          />
          <span class="tp-sep">x</span>
          <v-text-field
            v-model.number="formData.Lebar"
            type="number"
            variant="outlined"
            density="compact"
            hide-details
            class="f-inp"
            style="max-width: 72px"
          />
          <span class="tp-sep">Mtr</span>
          <label class="tp-lbl" style="width: 70px; margin-left: 12px"
            >Ket. Ukuran</label
          >
          <v-text-field
            v-model="formData.Ukuran"
            variant="outlined"
            density="compact"
            hide-details
            class="f-inp"
          />
        </div>

        <!-- Gramasi -->
        <div class="tp-row">
          <label class="tp-lbl">Gramasi</label>
          <v-text-field
            v-model="formData.Gramasi"
            variant="outlined"
            density="compact"
            hide-details
            class="f-inp"
            style="max-width: 180px"
          />
        </div>

        <!-- Finishing -->
        <div class="tp-row">
          <label class="tp-lbl">Finishing</label>
          <v-text-field
            v-model="formData.Finishing"
            variant="outlined"
            density="compact"
            hide-details
            class="f-inp"
          />
        </div>

        <!-- Sublim -->
        <div class="tp-row">
          <label class="tp-lbl">Sublim</label>
          <label class="chk-label">
            <input
              type="checkbox"
              :checked="formData.Sublim === 'PREMIUM'"
              @change="
                formData.Sublim = ($event.target as HTMLInputElement).checked
                  ? 'PREMIUM'
                  : ''
              "
            />
            Premium
          </label>
          <label class="chk-label" style="margin-left: 12px">
            <input
              type="checkbox"
              :checked="formData.Sublim === 'MEDIUM'"
              @change="
                formData.Sublim = ($event.target as HTMLInputElement).checked
                  ? 'MEDIUM'
                  : ''
              "
            />
            Medium
          </label>
        </div>
      </div>
    </div>

    <!-- ── Kolom kanan: Keterangan + Design ── -->
    <div class="tp-right">
      <div class="tp-section" style="flex-shrink: 0">
        <div class="tp-sec-title">Keterangan</div>
        <v-textarea
          v-model="formData.Keterangan"
          variant="outlined"
          density="compact"
          rows="6"
          hide-details
          class="f-inp"
        />
      </div>

      <div
        class="tp-section"
        style="flex: 1; display: flex; flex-direction: column"
      >
        <div class="tp-sec-title">Design</div>
        <div class="tp-img-box">
          <img
            v-if="displayImageUrl"
            :src="displayImageUrl"
            class="tp-img"
            style="cursor: pointer"
            title="Klik untuk melihat ukuran penuh"
            @click="showPreviewDialog = true"
          />
          <div v-else class="tp-img-empty">
            <IconPhoto :size="28" color="#bdbdbd" />
            <div class="mt-1">Belum ada gambar</div>
          </div>
        </div>
        <div class="tp-upload-row">
          <input
            ref="fileRef"
            type="file"
            accept="image/*"
            style="display: none"
            @change="onFileChange"
          />
          <div class="tp-upload-name">{{ uploadName || "Pilih file..." }}</div>
          <button class="tp-upload-btn" type="button" @click="fileRef?.click()">
            Upload
          </button>
        </div>
        <div class="tp-img-hint">Ukuran Maksimal 1 Mb</div>
        <div
          v-if="formData.StatusEdit"
          class="tp-status-badge mt-2"
          :class="formData.StatusEdit === 'ACC' ? 'st-acc' : 'st-wait'"
        >
          <component
            :is="formData.StatusEdit === 'ACC' ? IconDiscountCheck : IconClock"
            :size="12"
            class="mr-1"
          />
          Status Approval: <strong>{{ formData.StatusEdit }}</strong>
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
          :src="displayImageUrl"
          max-height="600"
          contain
          class="bg-white rounded border"
        >
          <template v-slot:placeholder>
            <div
              class="d-flex flex-column align-center justify-center fill-height"
            >
              <v-progress-circular
                indeterminate
                color="primary"
                size="40"
              ></v-progress-circular>
            </div>
          </template>
          <template v-slot:error>
            <div
              class="d-flex flex-column align-center justify-center fill-height text-grey"
            >
              <IconPhotoOff :size="48" color="#bdbdbd" />
              <div class="text-subtitle-2 mt-2">Gagal memuat gambar</div>
            </div>
          </template>
        </v-img>
      </v-card-text>
      <v-card-actions class="bg-white pa-2 border-t">
        <v-spacer></v-spacer>
        <v-btn
          color="primary"
          variant="text"
          :href="displayImageUrl"
          target="_blank"
        >
          <template #prepend
            ><IconExternalLink :size="15" :stroke-width="1.7"
          /></template>
          Buka di Tab Baru
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.tp-layout {
  display: flex;
  flex-direction: column;
  gap: 0;
  font-family: "Segoe UI", system-ui, sans-serif;
  font-size: 12px;
}

/* Alert tutup buku */
.tp-alert-wrap {
  margin-bottom: 8px;
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

/* Inner layout: kiri + kanan */
.tp-layout {
  display: flex;
  flex-direction: row;
  gap: 10px;
  align-items: flex-start;
}
.tp-left {
  flex: 1;
  min-width: 0;
}
.tp-right {
  width: 320px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

/* Section card */
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

/* Field row */
.tp-row {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 4px;
}
.tp-lbl {
  width: 120px;
  flex-shrink: 0;
  font-size: 11px;
  font-weight: 500;
  color: #333;
  white-space: nowrap;
}

/* Vuetify input compact */
.f-inp {
  flex: 1;
  min-width: 0;
}
.f-inp :deep(.v-field) {
  font-size: 12px;
  min-height: 26px;
  height: 26px;
}
.f-inp :deep(.v-field__input) {
  min-height: 26px;
  padding-top: 0;
  padding-bottom: 0;
  font-size: 12px;
}
.f-inp :deep(.v-input__control) {
  min-height: 26px;
}
/* textarea override */
.v-textarea.f-inp :deep(.v-field),
.v-textarea.f-inp :deep(.v-input__control) {
  height: auto !important;
  min-height: 90px !important;
}
.v-textarea.f-inp :deep(.v-field__input) {
  height: auto !important;
  min-height: 90px !important;
  padding-top: 8px !important;
  padding-bottom: 8px !important;
}

/* Readonly native input (Created, User) */
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

/* Date */
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

.tp-sep {
  font-size: 12px;
  color: #555;
  white-space: nowrap;
  flex-shrink: 0;
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

/* Image */
.tp-img-box {
  width: 100%;
  height: 160px;
  border: 1px solid #e0e0e0;
  border-radius: 3px;
  background: #fafafa;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  margin-bottom: 6px;
}
.tp-img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}
.tp-img-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  color: #bdbdbd;
  font-size: 11px;
}

.tp-upload-row {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 3px;
}
.tp-upload-name {
  flex: 1;
  font-size: 11px;
  color: #757575;
  background: #f5f5f5;
  border: 1px solid #e0e0e0;
  border-radius: 3px;
  padding: 3px 6px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  min-width: 0;
}
.tp-upload-btn {
  background: #546e7a;
  color: white;
  border: none;
  border-radius: 3px;
  padding: 3px 10px;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  flex-shrink: 0;
}
.tp-upload-btn:hover {
  background: #455a64;
}
.tp-img-hint {
  font-size: 10px;
  color: #9e9e9e;
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
</style>
