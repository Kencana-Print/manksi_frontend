<template>
  <PageLayout :title="formTitle" icon="mdi-vector-arrange-redirect">
    <template #header-actions>
      <v-btn
        size="small"
        color="primary"
        @click="handleSave"
        :loading="isSaving"
        :disabled="isSaving || !isFormValid"
      >
        <v-icon start size="18">mdi-content-save-check</v-icon> Simpan Mutasi
      </v-btn>
      <v-btn
        size="small"
        variant="outlined"
        @click="handleCancel"
        :disabled="isSaving"
        class="ml-2"
      >
        <v-icon start size="18">mdi-close</v-icon> Batal
      </v-btn>
    </template>

    <div class="form-grid-container">
      <!-- COLUMN LEFT: HEADER INFO -->
      <div class="left-column">
        <v-card class="mb-3" flat border>
          <v-card-title
            class="text-subtitle-2 pa-2 custom-header-blue text-white"
          >
            Informasi Dokumen Mutasi
          </v-card-title>
          <v-card-text class="pa-4">
            <v-row dense>
              <v-col cols="12">
                <v-text-field
                  label="No. Mutasi"
                  v-model="formData.nomor"
                  readonly
                  variant="outlined"
                  density="compact"
                  hide-details
                  class="mb-4 bg-grey-lighten-3 custom-label-blue"
                />
              </v-col>
              <v-col cols="12">
                <v-text-field
                  label="Tanggal Mutasi"
                  v-model="formData.tanggal"
                  type="date"
                  variant="outlined"
                  density="compact"
                  hide-details
                  class="mb-4 custom-label-blue"
                />
              </v-col>

              <!-- Bagian Asal (Dikunci ke Sublim karena ini form dari Sublim) -->
              <v-col cols="12">
                <v-text-field
                  label="Bagian Asal"
                  v-model="formData.bagianAsalNama"
                  readonly
                  variant="outlined"
                  density="compact"
                  hide-details
                  class="mb-4 bg-grey-lighten-3 custom-label-blue"
                />
              </v-col>

              <!-- Bagian Tujuan (Potong, Jahit, dll) -->
              <v-col cols="12">
                <v-select
                  label="Bagian Tujuan"
                  v-model="formData.bagianTujuan"
                  :items="listBagianTujuan"
                  item-title="nama"
                  item-value="kode"
                  variant="outlined"
                  density="compact"
                  hide-details
                  class="mb-4 custom-label-blue"
                  placeholder="Pilih Bagian Tujuan"
                />
              </v-col>

              <v-col cols="12">
                <v-textarea
                  label="Keterangan / Memo"
                  v-model="formData.keterangan"
                  variant="outlined"
                  density="compact"
                  rows="3"
                  hide-details
                  class="custom-label-blue"
                />
              </v-col>
            </v-row>
          </v-card-text>
        </v-card>
      </div>

      <!-- COLUMN RIGHT: GRID DETAIL MUTASI -->
      <div class="right-column">
        <v-card flat border class="d-flex flex-column h-100 rounded-0">
          <v-card-title
            class="text-subtitle-1 d-flex align-center pa-2 custom-header-blue text-white"
          >
            Detail Item Yang Dimutasi
            <v-spacer />

            <v-btn
              size="x-small"
              color="blue-darken-3"
              prepend-icon="mdi-text-box-search"
              @click="openLhkSublimLookup"
            >
              Ambil dari LHK Sublim (RTR)
            </v-btn>
          </v-card-title>

          <v-data-table
            :headers="detailHeaders"
            :items="detailData"
            :items-per-page="-1"
            density="compact"
            hide-default-footer
            class="delphi-grid custom-font"
            fixed-header
          >
            <template #[`item.no`]="{ index }">{{ index + 1 }}</template>

            <template #[`item.poi_nomor`]="{ item }">
              <span class="font-weight-bold">{{ item.poi_nomor || "-" }}</span>
            </template>

            <template #[`item.spk_nomor`]="{ item }">
              <span>{{ item.spk_nomor }}</span>
            </template>

            <template #[`item.nama_komponen`]="{ item }">
              <v-chip size="x-small" variant="tonal" color="blue">
                {{ item.nama_komponen || "ALL SET" }}
              </v-chip>
            </template>

            <!-- Menampilkan Stok yang Tersedia di Sublim untuk dimumtasi -->
            <template #[`item.stok_sublim`]="{ item }">
              <div class="px-2 text-end font-weight-bold text-grey-darken-1">
                {{ item.stok_sublim }}
              </div>
            </template>

            <!-- Input Jumlah yang akan Dimutasi -->
            <template #[`item.qty_mutasi`]="{ item }">
              <div
                :class="
                  item.qty_mutasi > item.stok_sublim
                    ? 'bg-red-lighten-5 px-1 rounded error-qty-border h-100 d-flex align-center'
                    : 'cell-yellow h-100 d-flex align-center'
                "
              >
                <v-text-field
                  v-model.number="item.qty_mutasi"
                  type="number"
                  variant="plain"
                  density="compact"
                  hide-details
                  :class="
                    item.qty_mutasi > item.stok_sublim
                      ? 'text-red font-weight-black table-input-inline text-end'
                      : 'table-input-inline text-end font-weight-bold'
                  "
                  @input="validateQty(item)"
                />

                <v-tooltip
                  v-if="item.qty_mutasi > item.stok_sublim"
                  activator="parent"
                  location="top"
                >
                  Jumlah mutasi melebihi sisa hasil kerja Sublim (Maksimal:
                  {{ item.stok_sublim }})
                </v-tooltip>
              </div>
            </template>

            <template #[`item.actions`]="{ index }">
              <v-btn
                icon="mdi-delete"
                size="x-small"
                color="error"
                variant="text"
                @click="removeRow(index)"
              />
            </template>
          </v-data-table>
        </v-card>
      </div>
    </div>

    <!-- Lookup Modal untuk menarik data dari LHK Sublim -->
    <LhkSublimLookupModal
      :is-visible="lookup.lhk"
      @close="lookup.lhk = false"
      @select="handleLhkSelect"
    />
  </PageLayout>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import { format } from "date-fns";
import api from "@/services/api";
import { useToast } from "vue-toastification";
import PageLayout from "@/components/PageLayout.vue";

// 💡 Silakan buat modal lookup berbasis tabel data LHK Sublim
import LhkSublimLookupModal from "@/modal/LhkSublimLookupModal.vue";

const route = useRoute();
const router = useRouter();
const toast = useToast();

const isSaving = ref(false);
const detailData = ref<any[]>([]);

const lookup = reactive({
  lhk: false,
});

const formData = reactive({
  nomor: "MUT-AUTO",
  tanggal: format(new Date(), "yyyy-MM-dd"),
  bagianAsalKode: "SUB",
  bagianAsalNama: "SUBLIM / RTR",
  bagianTujuan: null,
  keterangan: "",
});

// Pilihan bagian tujuan mutasi internal
const listBagianTujuan = [
  { kode: "PTG", nama: "POTONG / CUTTING" },
  { kode: "JHT", nama: "JAHIT / SEWING" },
  { kode: "FIN", nama: "FINISHING / QC" },
  { kode: "GGD", nama: "GUDANG JADI" },
];

const detailHeaders = [
  { title: "No", key: "no", width: "40px", align: "center" },
  { title: "PO Internal", key: "poi_nomor", width: "140px" },
  { title: "Size", key: "poi_size", width: "80px" },
  { title: "No. SPK", key: "spk_nomor", width: "130px" },
  { title: "Nama Order", key: "spk_nama", width: "180px" },
  { title: "Komponen", key: "nama_komponen", width: "120px" },
  { title: "Stok di Sublim", key: "stok_sublim", width: "110px", align: "end" },
  { title: "Jml Mutasi", key: "qty_mutasi", width: "110px", align: "end" },
  { title: "", key: "actions", width: "50px" },
];

const isEdit = computed(() => Boolean(route.params.nomor));

const formTitle = computed(() =>
  isEdit.value
    ? `Edit Mutasi Internal: ${route.params.nomor}`
    : "Input Mutasi Internal Baru (Ex Sublim)",
);

const isFormValid = computed(
  () =>
    detailData.value.length > 0 &&
    formData.bagianTujuan &&
    formData.bagianAsalKode,
);

const openLhkSublimLookup = () => {
  lookup.lhk = true;
};

// Handler saat data dipilih dari modal lookup LHK Sublim
// Handler saat data dipilih dari modal lookup LHK Sublim
const handleLhkSelect = (selectedItems: any[]) => {
  selectedItems.forEach((item) => {
    const namaKomponenApi = item.Nama_Komponen || item.Jenis_Bahan || "ALL SET";
    const itemSize = item.Size || "-";
    const stokTersedia = parseFloat(
      item.Sisa_Belum_Mutasi !== undefined
        ? item.Sisa_Belum_Mutasi
        : item.Jumlah || 0,
    );

    // Cek apakah item dengan kombinasi (SPK, PO Internal, Komponen, Size) sudah ada di grid
    const existingIndex = detailData.value.findIndex(
      (row) =>
        row.spk_nomor === item.Nomor_SPK &&
        row.poi_nomor === item.No_PO_Internal &&
        row.nama_komponen === namaKomponenApi &&
        row.poi_size === itemSize,
    );

    if (existingIndex !== -1) {
      // Jika sudah ada, jumlahkan stok dan qty mutasinya
      detailData.value[existingIndex].stok_sublim += stokTersedia;
      detailData.value[existingIndex].stok_sublim_asli =
        detailData.value[existingIndex].stok_sublim; // Opsional untuk referensi
      detailData.value[existingIndex].qty_mutasi += stokTersedia;
    } else {
      // Jika belum ada, tambahkan baris baru
      detailData.value.push({
        lhk_detail_id: item.Id || `${item.Nomor}_${item.No_Urut}`,
        poi_nomor: item.No_PO_Internal || "-",
        poi_size: itemSize,
        spk_nomor: item.Nomor_SPK,
        spk_nama: item.Nama_SPK,
        nama_komponen: namaKomponenApi,
        stok_sublim: stokTersedia,
        qty_mutasi: stokTersedia,
      });
    }
  });
  lookup.lhk = false;
};

const validateQty = (item: any) => {
  if (item.qty_mutasi < 0 || !item.qty_mutasi) {
    item.qty_mutasi = 0;
  }
  if (item.qty_mutasi > item.stok_sublim) {
    toast.warning(
      `Jumlah mutasi item ${item.spk_nomor} melebihi sisa hasil kerja di Sublim!`,
    );
  }
};

const removeRow = (idx: number) => {
  detailData.value.splice(idx, 1);
};

const handleCancel = () => {
  router.back();
};

const handleSave = async () => {
  // Validasi sebelum save apakah ada yang over-qty
  const hasOverQty = detailData.value.some(
    (row) => row.qty_mutasi > row.stok_sublim,
  );
  if (hasOverQty) {
    toast.error(
      "Tidak dapat menyimpan. Terdapat item dengan jumlah mutasi melebihi sisa stok Sublim.",
    );
    return;
  }

  if (!confirm("Lanjutkan simpan dokumen mutasi internal ini?")) return;

  isSaving.value = true;
  try {
    const payload = {
      header: {
        nomor: formData.nomor,
        tanggal: formData.tanggal,
        bagian_asal: formData.bagianAsalKode,
        bagian_tujuan: formData.bagianTujuan,
        keterangan: formData.keterangan,
      },
      details: detailData.value.map((item) => ({
        lhk_detail_id: item.lhk_detail_id,
        nomor_spk: item.spk_nomor,
        poi_nomor: item.poi_nomor,
        poi_size: item.poi_size,
        nama_komponen: item.nama_komponen,
        qty_mutasi: item.qty_mutasi,
      })),
    };

    if (isEdit.value) {
      await api.put(
        `/mmt/mutasi-internal/${encodeURIComponent(formData.nomor)}`,
        payload,
      );
      toast.success("Mutasi internal berhasil diperbarui.");
    } else {
      await api.post("/mmt/mutasi-internal", payload);
      toast.success("Mutasi internal berhasil disimpan.");
    }
    router.push({ name: 'MutasiInternalMmtBrowse' }); // Sesuaikan nama route daftar mutasi Anda
  } catch (e: any) {
    toast.error(
      "Gagal Simpan Mutasi: " + (e.response?.data?.message || e.message),
    );
  } finally {
    isSaving.value = false;
  }
};

// Logika edit data jika terdapat params nomor dokumen
const loadDataMutasi = async (nomor: string) => {
  isSaving.value = true;
  try {
    const response = await api.get(
      `/mmt/mutasi-internal/detail/${encodeURIComponent(nomor)}`,
    );
    const res = response.data;
    if (res.data && res.data.length > 0) {
      const master = res.data[0];
      formData.nomor = master.Nomor_Mutasi;
      formData.tanggal = master.Tanggal;
      formData.bagianTujuan = master.Bagian_Tujuan;
      formData.keterangan = master.Keterangan;

      detailData.value = res.data.map((d: any) => ({
        lhk_detail_id: d.Lhk_Detail_Id,
        poi_nomor: d.No_PO_Internal,
        poi_size: d.Size,
        spk_nomor: d.Nomor_SPK,
        spk_nama: d.Nama_SPK,
        nama_komponen: d.Nama_Komponen,
        stok_sublim: parseFloat(d.Stok_Sublim_Lama) || d.Qty_Mutasi, // Stok gabungan saat ditarik
        qty_mutasi: parseFloat(d.Qty_Mutasi) || 0,
      }));
    }
  } catch (error) {
    toast.error("Gagal memuat data mutasi.");
  } finally {
    isSaving.value = false;
  }
};

onMounted(() => {
  const nomorParams = route.params.nomor as string;
  if (nomorParams) {
    loadDataMutasi(nomorParams);
  }
});
</script>

<style scoped>
.form-grid-container {
  display: flex;
  gap: 16px;
  height: calc(100vh - 140px);
}
.left-column {
  width: 300px;
  flex-shrink: 0;
}
.right-column {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  height: 100%;
}
.right-column .v-card {
  display: flex;
  flex-direction: column;
  height: 100% !important;
  border-radius: 0 !important;
  overflow: hidden;
}
.delphi-grid {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.delphi-grid :deep(.v-table__wrapper) {
  flex: 1;
  overflow-y: auto !important;
  overflow-x: auto !important;
}
.custom-header-blue {
  background-color: #eeeeee !important;
  color: #000000 !important;
  font-weight: bold !important;
  border-bottom: 1px solid #ccc !important;
}
.custom-label-blue :deep(.v-label) {
  font-size: 11px;
  font-weight: 700;
  color: #000000 !important;
  opacity: 1;
}
.delphi-grid :deep(thead th) {
  background-color: #5aa4ff !important;
  color: #ffffff !important;
  font-size: 11px !important;
  font-weight: bold !important;
  height: 32px !important;
  border: 0.5px solid #ccc !important;
}
.delphi-grid :deep(td) {
  border: 0.5px solid #eee !important;
  height: 32px !important;
  color: #000000 !important;
}
.cell-yellow {
  background-color: #ecf8ff !important;
}
.table-input-inline :deep(input) {
  padding: 4px 8px !important;
  min-height: 28px !important;
  font-size: 12px !important;
  color: #000000 !important;
  opacity: 1 !important;
  -webkit-text-fill-color: #000000 !important;
}
.custom-font {
  font-size: 12px !important;
  color: #000000 !important;
}
.error-qty-border {
  border: 1.5px solid #ff5252 !important;
}
</style>
