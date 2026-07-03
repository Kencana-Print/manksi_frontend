<script setup lang="ts">
import { ref, watch } from "vue";
import { salesOrderService } from "@/services/penjualan/salesOrderService";
import { IconSearch, IconX } from "@tabler/icons-vue";

const props = defineProps<{ modelValue: boolean }>();
const emit = defineEmits(["update:modelValue", "selected"]);

const query = ref("");
const items = ref<any[]>([]);
const isLoading = ref(false);
const page = ref(1);
const PAGE_SIZE = 50;

const today = new Date().toISOString().substring(0, 10);
const threeMonthsAgo = new Date(Date.now() - 90 * 86400000)
  .toISOString()
  .substring(0, 10);

const startDate = ref(threeMonthsAgo);
const endDate = ref(today);

const fetchData = async () => {
  isLoading.value = true;
  try {
    const res = await salesOrderService.getBrowse({
      startDate: startDate.value,
      endDate: endDate.value,
    });
    const all: any[] = res.data.data || [];

    // Filter: hanya SO yang Aktif='Y' DAN sudah di-approve CMO dan belum dibuatkan SPK
    const validOnly = all.filter(
      (r) =>
        r.Aktif === "Y" &&
        r.CMO &&
        String(r.CMO).trim() !== "" &&
        !r.HasSpkPpic,
    );

    const q = query.value.toLowerCase();
    items.value = q
      ? validOnly.filter(
          (r) =>
            r.Nomor?.toLowerCase().includes(q) ||
            r.Nama?.toLowerCase().includes(q) ||
            r.Customer?.toLowerCase().includes(q),
        )
      : validOnly;
  } catch {
    items.value = [];
  } finally {
    isLoading.value = false;
  }
};

watch(
  () => props.modelValue,
  (v) => {
    if (v) {
      query.value = "";
      fetchData();
    }
  },
);

watch(query, () => {
  page.value = 1;
  fetchData();
});

const pagedItems = () => items.value.slice(0, page.value * PAGE_SIZE);

const onSelect = (item: any) => {
  emit("selected", item);
  emit("update:modelValue", false);
};

const close = () => emit("update:modelValue", false);

const formatTgl = (v: string) => {
  if (!v) return "-";
  const d = new Date(v);
  return `${String(d.getDate()).padStart(2, "0")}-${String(d.getMonth() + 1).padStart(2, "0")}-${d.getFullYear()}`;
};
</script>

<template>
  <v-dialog
    :model-value="modelValue"
    max-width="780px"
    scrollable
    @update:model-value="close"
  >
    <v-card rounded="lg">
      <v-card-title class="bg-primary text-white d-flex align-center pa-3">
        <IconSearch :size="16" class="mr-2" />
        <span class="text-subtitle-1 font-weight-bold">Cari Sales Order</span>
        <v-spacer />
        <v-btn variant="text" size="small" color="white" @click="close">
          <IconX :size="16" />
        </v-btn>
      </v-card-title>

      <!-- Filter periode -->
      <div
        class="d-flex align-center gap-2 pa-3 border-b bg-grey-lighten-5"
        style="gap: 8px; flex-wrap: wrap"
      >
        <span style="font-size: 11px; font-weight: 700; color: #555"
          >Periode:</span
        >
        <input
          type="date"
          v-model="startDate"
          @change="fetchData"
          style="
            height: 26px;
            border: 1px solid #ccc;
            border-radius: 4px;
            padding: 0 6px;
            font-size: 11px;
          "
        />
        <span style="font-size: 11px; color: #555">s/d</span>
        <input
          type="date"
          v-model="endDate"
          @change="fetchData"
          style="
            height: 26px;
            border: 1px solid #ccc;
            border-radius: 4px;
            padding: 0 6px;
            font-size: 11px;
          "
        />
        <div style="flex: 1; min-width: 200px; position: relative">
          <input
            v-model="query"
            placeholder="Cari nomor, nama, customer..."
            style="
              width: 100%;
              height: 26px;
              border: 1px solid #ccc;
              border-radius: 4px;
              padding: 0 6px 0 26px;
              font-size: 11px;
              box-sizing: border-box;
            "
          />
          <IconSearch
            :size="13"
            color="#9e9e9e"
            style="
              position: absolute;
              left: 7px;
              top: 50%;
              transform: translateY(-50%);
            "
          />
        </div>
        <div
          style="
            background: #e3f2fd;
            padding: 6px 12px;
            font-size: 10px;
            color: #1565c0;
            border-bottom: 1px solid #bbdefb;
          "
        >
          ℹ️ Hanya menampilkan SO yang sudah Aktif, disetujui CMO, dan belum
          dibuatkan SPK PPIC.
        </div>
      </div>

      <v-card-text class="pa-0" style="max-height: 460px; overflow-y: auto">
        <v-progress-linear
          v-if="isLoading"
          indeterminate
          color="primary"
          height="2"
        />
        <table class="so-table">
          <thead>
            <tr>
              <th width="145">Nomor SO</th>
              <th width="95">Tanggal</th>
              <th width="160">Customer</th>
              <th>Nama Pesanan</th>
              <th width="70" class="tr">Pesan</th>
              <th width="80">Workshop</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="item in pagedItems()"
              :key="item.Nomor"
              @click="onSelect(item)"
              class="so-row"
            >
              <td class="fw-bold text-primary font-mono">{{ item.Nomor }}</td>
              <td>{{ formatTgl(item.Tanggal) }}</td>
              <td>{{ item.Customer }}</td>
              <td>{{ item.Nama }}</td>
              <td class="tr">{{ item.Pesan?.toLocaleString("id-ID") }}</td>
              <td>{{ item.Workshop }}</td>
            </tr>
            <tr v-if="!isLoading && items.length === 0">
              <td
                colspan="6"
                class="text-center text-grey pa-4"
                style="font-size: 12px"
              >
                Tidak ada data SO ditemukan.
              </td>
            </tr>
          </tbody>
        </table>
        <!-- Load more -->
        <div v-if="pagedItems().length < items.length" class="text-center pa-3">
          <v-btn size="small" variant="tonal" @click="page++">
            Tampilkan lebih banyak ({{ items.length - pagedItems().length }}
            lagi)
          </v-btn>
        </div>
      </v-card-text>

      <v-card-actions class="pa-3 border-t bg-grey-lighten-4">
        <span class="text-caption text-grey">
          {{ items.length }} dari total data SO
        </span>
        <v-spacer />
        <v-btn variant="text" @click="close">Tutup</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.so-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 11px;
}
.so-table thead th {
  background: #1565c0;
  color: white;
  padding: 6px 8px;
  text-align: left;
  position: sticky;
  top: 0;
  z-index: 1;
  font-weight: 600;
  white-space: nowrap;
}
.so-table tbody td {
  padding: 4px 8px;
  border-bottom: 1px solid #eeeeee;
}
.so-row {
  cursor: pointer;
}
.so-row:hover td {
  background: #e3f2fd;
}
.tr {
  text-align: right !important;
}
.fw-bold {
  font-weight: 700;
}
.font-mono {
  font-family: monospace;
}
.text-primary {
  color: #1565c0;
}
</style>
