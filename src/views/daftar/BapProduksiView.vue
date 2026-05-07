<script setup lang="ts">
import { ref } from "vue";
import api from "@/services/api";
import { useBrowse } from "@/composables/useBrowse";
import { useToast } from "vue-toastification";
import { useRouter } from "vue-router";
import BaseBrowse from "@/components/BaseBrowse.vue";
import BapAjukanEditDialog from "@/components/dialogs/BapAjukanEditDialog.vue";
import { IconAlertCircle, IconPrinter, IconPencil } from "@tabler/icons-vue";

const toast = useToast();
const router = useRouter();

// Default Tanggal: Awal Bulan sd Hari Ini
const getFirstDayOfMonth = () => {
  const date = new Date();
  return new Date(date.getFullYear(), date.getMonth(), 1)
    .toISOString()
    .substr(0, 10);
};
const getToday = () => new Date().toISOString().substr(0, 10);

const startDate = ref(getFirstDayOfMonth());
const endDate = ref(getToday());

// ID 142 = BAP dan Komplain Produksi
const {
  items,
  isLoading,
  canInsert,
  canEdit,
  canDelete,
  canExport,
  selected,
  fetchData,
  exportToExcel,
} = useBrowse({
  menuId: "142",
  fetchApi: async () => {
    const res = await api.get("/master/bap-produksi", {
      params: { startDate: startDate.value, endDate: endDate.value },
    });
    return res.data.data;
  },
});

const headers = [
  { title: "NOMOR", key: "Nomor", width: "130px" },
  { title: "TANGGAL", key: "Tanggal", width: "100px", align: "center" },
  { title: "CAB", key: "Cab", width: "60px", align: "center" },
  { title: "TIPE", key: "Tipe", width: "120px" },
  { title: "BAGIAN", key: "Bagian", width: "120px" },
  { title: "MASALAH", key: "Masalah", minWidth: "250px" },
  { title: "SUMBER MASALAH", key: "SumberMasalah", minWidth: "250px" },
  { title: "SOLUSI", key: "Solusi", minWidth: "250px" },
  { title: "PERTANGGUNGJAWABAN", key: "Pertanggungjawaban", minWidth: "250px" },
  { title: "SPK", key: "SPK", width: "120px" },
  { title: "CREATED", key: "Created", width: "100px" },
  { title: "APPROVE", key: "Approve", width: "100px" },
];

const rowPropsFn = (data: any) => {
  const item = data.item?.raw || data.item;
  // Jika Approve kosong, warna teks baris jadi merah (seperti baris kedua di screenshot)
  if (!item.Approve) {
    return { class: "text-red" };
  }
  return {};
};

const handleAdd = () => {
  router.push("/daftar/berita-acara/create");
};

const handleEdit = async (item: any) => {
  if (!item.Approve) {
    router.push(`/daftar/berita-acara/edit/${item.Nomor}`);
  } else {
    handleAjukanEdit(item);
  }
};

const handleDelete = async (item: any) => {
  if (item.Approve) {
    toast.error("Sudah di-approve, tidak bisa dihapus.");
    return;
  }
  try {
    await api.delete(`/master/bap-produksi/${item.Nomor}`);
    toast.success("BAP berhasil dihapus.");
    fetchData();
  } catch (error) {
    toast.error("Gagal menghapus BAP.");
  }
};

// --- PENGAJUAN EDIT (Pin 5) ---
const showAjukanDialog = ref(false);
const activeBapNomor = ref<string | null>(null);

const handleAjukanEdit = (item: any) => {
  activeBapNomor.value = item.Nomor;
  showAjukanDialog.value = true;
};

const handlePrint = () => {
  if (selected.value.length === 0) {
    toast.warning("Pilih BAP yang akan dicetak terlebih dahulu.");
    return;
  }

  const nomor = selected.value[0].Nomor;
  // Buka rute print di Tab baru
  const url = router.resolve({
    name: "BapProduksiPrint",
    params: { nomor },
  }).href;
  window.open(url, "_blank");
};
</script>

<template>
  <BaseBrowse
    title="BAP dan Komplain Produksi"
    menu-id="142"
    :icon="IconAlertCircle"
    :headers="headers"
    :items="items ?? []"
    :is-loading="isLoading"
    v-model:selected="selected"
    :can-insert="canInsert"
    :can-edit="canEdit"
    :can-delete="canDelete"
    :can-export="canExport"
    :row-props-fn="rowPropsFn"
    item-value="Nomor"
    @refresh="fetchData"
    @add="handleAdd"
    @edit="handleEdit"
    @delete="handleDelete"
    @export="exportToExcel('Data_BAP_Produksi')"
  >
    <template #filter-left>
      <div
        class="d-flex align-center bg-white px-3 py-1 rounded border mr-2"
        style="gap: 12px"
      >
        <span class="text-caption font-weight-bold">Periode</span>
        <v-text-field
          v-model="startDate"
          type="date"
          variant="underlined"
          density="compact"
          hide-details
          class="text-caption"
          style="width: 110px"
          @change="fetchData"
        ></v-text-field>
        <span class="text-caption">sd</span>
        <v-text-field
          v-model="endDate"
          type="date"
          variant="underlined"
          density="compact"
          hide-details
          class="text-caption"
          style="width: 110px"
          @change="fetchData"
        ></v-text-field>
      </div>
    </template>

    <template #extra-actions="{ selected }">
      <v-btn
        size="small"
        color="indigo"
        variant="elevated"
        :disabled="selected.length === 0"
        @click="handlePrint"
      >
        <template #prepend
          ><IconPrinter :size="15" :stroke-width="1.7"
        /></template>
        Cetak
      </v-btn>
      <v-btn
        size="small"
        color="warning"
        variant="elevated"
        :disabled="selected.length === 0"
        v-if="canEdit"
        @click="handleAjukanEdit(selected[0])"
      >
        <template #prepend
          ><IconPencil :size="15" :stroke-width="1.7"
        /></template>
        Ajukan Perubahan
      </v-btn>
    </template>

    <template #filter-right>
      <div
        class="d-flex align-center bg-white pa-1 px-3 rounded border mr-2"
        style="gap: 12px"
      >
        <div class="d-flex align-center">
          <div
            class="bg-red mr-1"
            style="width: 14px; height: 14px; border-radius: 2px"
          ></div>
          <span class="text-caption font-weight-bold text-red"
            >Belum di Approve</span
          >
        </div>
        <v-divider vertical class="mx-2"></v-divider>
        <div class="text-caption font-weight-bold mr-1">
          Back Color (No. BAP):
        </div>
        <div class="d-flex align-center">
          <div
            class="bg-blue mr-1"
            style="width: 14px; height: 14px; border-radius: 2px"
          ></div>
          <span class="text-caption mr-2">Nunggu Acc</span>
          <div
            class="bg-green mr-1"
            style="width: 14px; height: 14px; border-radius: 2px"
          ></div>
          <span class="text-caption mr-2">Sudah Acc</span>
          <div
            class="bg-red mr-1"
            style="width: 14px; height: 14px; border-radius: 2px"
          ></div>
          <span class="text-caption">Tolak</span>
        </div>
      </div>
    </template>

    <template #item.Nomor="{ item }">
      <div
        :class="[
          'pa-1 px-2 rounded font-weight-bold',
          item.raw?.Ngedit === 'WAIT'
            ? 'bg-blue text-white'
            : item.raw?.Ngedit === 'ACC'
              ? 'bg-green text-white'
              : item.raw?.Ngedit === 'TOLAK'
                ? 'bg-red text-white'
                : !item.raw?.Approve
                  ? 'text-red bg-transparent'
                  : 'text-black bg-transparent',
        ]"
        style="min-width: 100px; display: inline-block"
      >
        {{ item.raw?.Nomor || item.Nomor }}
      </div>
    </template>
  </BaseBrowse>

  <BapAjukanEditDialog
    v-model="showAjukanDialog"
    :bap-nomor="activeBapNomor"
    @saved="fetchData"
  />
</template>
