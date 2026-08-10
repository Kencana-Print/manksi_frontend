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
const totalItems = ref(0);
const PAGE_SIZE = 50;

const today = new Date();
const getLocalDate = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;

const awalBulan = new Date(today.getFullYear(), today.getMonth(), 1);

const startDate = ref(getLocalDate(awalBulan));
const endDate = ref(getLocalDate(today));

let debounce: ReturnType<typeof setTimeout> | null = null;

// Filter (Aktif='Y', sudah di-approve CMO, belum ada SPK PPIC) sekarang
// dilakukan di backend (/sales-order/search-for-spk) — modal ini
// tidak lagi fetch-semua-lalu-filter-client seperti sebelumnya.
const fetchData = async (append = false) => {
  isLoading.value = true;
  try {
    const res = await salesOrderService.getSearchForSpk({
      q: query.value,
      startDate: startDate.value,
      endDate: endDate.value,
      page: page.value,
      limit: PAGE_SIZE,
    });
    const data = res.data.data;
    items.value = append ? [...items.value, ...data.items] : data.items;
    totalItems.value = data.total;
  } catch {
    if (!append) items.value = [];
  } finally {
    isLoading.value = false;
  }
};

watch(
  () => props.modelValue,
  (v) => {
    if (v) {
      query.value = "";
      page.value = 1;
      fetchData();
    }
  },
);

const onSearchInput = () => {
  page.value = 1;
  if (debounce) clearTimeout(debounce);
  debounce = setTimeout(() => fetchData(), 400);
};

const loadMore = () => {
  page.value++;
  fetchData(true);
};

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

const statusMapLabel = (status: string) => {
  switch (status) {
    case "TANPA_MAP":
      return "Tanpa MAP";
    case "MENUNGGU_APV":
      return "Menunggu ACC";
    case "SUDAH_APPROVE":
      return "Sudah ACC";
    default:
      return "-";
  }
};
const statusMapClass = (status: string) => {
  switch (status) {
    case "TANPA_MAP":
      return "chip-neutral";
    case "MENUNGGU_APV":
      return "chip-wait";
    case "SUDAH_APPROVE":
      return "chip-approved";
    default:
      return "chip-neutral";
  }
};
</script>

<template>
  <v-dialog
    :model-value="modelValue"
    max-width="1100px"
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
          @change="
            () => {
              page = 1;
              fetchData();
            }
          "
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
          @change="
            () => {
              page = 1;
              fetchData();
            }
          "
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
            @input="onSearchInput"
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
            width: 100%;
          "
        >
          ℹ️ Hanya menampilkan SO yang sudah Aktif, disetujui CMO, dan belum
          dibuatkan SPK PPIC.
        </div>
      </div>

      <v-card-text class="pa-0" style="max-height: 560px; overflow-y: auto">
        <v-progress-linear
          v-if="isLoading"
          indeterminate
          color="primary"
          height="2"
        />
        <table class="so-table">
          <thead>
            <tr>
              <th width="150">Nomor SO</th>
              <th width="95">Tanggal</th>
              <th width="180">Customer</th>
              <th width="260">Nama Pesanan</th>
              <th width="80" class="tr">Pesan</th>
              <th width="120">MAP</th>
              <th width="90">Status MAP</th>
              <th width="100">Workshop</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="item in items"
              :key="item.Nomor"
              @click="onSelect(item)"
              class="so-row"
            >
              <td class="fw-bold text-primary font-mono">{{ item.Nomor }}</td>
              <td>{{ formatTgl(item.Tanggal) }}</td>
              <td class="cell-wrap">
                {{ item.Customer || item.KodeCustomer || "-" }}
              </td>
              <td class="cell-wrap cell-clamp">{{ item.Nama }}</td>
              <td class="tr">
                {{ Number(item.Pesan).toLocaleString("id-ID") }}
              </td>
              <td class="font-mono">{{ item.MAP || "-" }}</td>
              <td>
                <span
                  class="status-chip"
                  :class="statusMapClass(item.StatusMap)"
                >
                  {{ statusMapLabel(item.StatusMap) }}
                </span>
              </td>
              <td>{{ item.Workshop }}</td>
            </tr>
            <tr v-if="!isLoading && items.length === 0">
              <td
                colspan="8"
                class="text-center text-grey pa-4"
                style="font-size: 12px"
              >
                Tidak ada data SO ditemukan.
              </td>
            </tr>
          </tbody>
        </table>
        <div v-if="items.length < totalItems" class="text-center pa-3">
          <v-btn
            size="small"
            variant="tonal"
            :loading="isLoading"
            @click="loadMore"
          >
            Tampilkan lebih banyak ({{ totalItems - items.length }} lagi)
          </v-btn>
        </div>
      </v-card-text>

      <v-card-actions class="pa-3 border-t bg-grey-lighten-4">
        <span class="text-caption text-grey"
          >{{ items.length }} dari {{ totalItems }} data SO</span
        >
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
  table-layout: fixed; /* wajib supaya width kolom dihormati & wrap bekerja */
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
  padding: 6px 8px;
  border-bottom: 1px solid #eeeeee;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.cell-wrap {
  white-space: normal;
}
.cell-clamp {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 1.35;
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

.status-chip {
  display: inline-block;
  padding: 1px 8px;
  border-radius: 10px;
  font-size: 9.5px;
  font-weight: 700;
}
.status-chip {
  display: inline-block;
  padding: 1px 8px;
  border-radius: 10px;
  font-size: 9.5px;
  font-weight: 700;
  white-space: nowrap;
}
.chip-neutral {
  background: #f5f5f5;
  color: #757575;
}
.chip-wait {
  background: #fff3e0;
  color: #e65100;
}
.chip-approved {
  background: #e8f5e9;
  color: #2e7d32;
}
</style>
