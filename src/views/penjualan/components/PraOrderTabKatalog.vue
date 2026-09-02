<script setup lang="ts">
import { ref, watch } from "vue";
import api from "@/services/api";
import { praOrderService } from "@/services/penjualan/praOrderService";
import {
  IconSearch,
  IconPhotoOff,
  IconCircleCheckFilled,
} from "@tabler/icons-vue";

const props = defineProps<{ custKode: string; custNama: string }>();

const isLoading = ref(false);
const isLoadingMore = ref(false);
const katalogList = ref<any[]>([]);
const totalKatalog = ref(0);
const searchQuery = ref("");
const selectedStatus = ref("SEMUA");
const selectedItem = ref<any>(null);

const page = ref(1);
const limit = 20;
const hasMore = ref(true);
let debounceTimer: ReturnType<typeof setTimeout> | null = null;

const categories = [
  { label: "SEMUA STATUS", value: "SEMUA", color: "#424242" },
  { label: "PENDING", value: "PENDING", color: "#757575" },
  { label: "SANGGUP", value: "SANGGUP", color: "#2e7d32" },
  { label: "TIDAK SANGGUP", value: "TIDAK SANGGUP", color: "#e53935" },
];

const getBaseUrl = () => api.defaults.baseURL?.replace(/\/api\/?$/, "") || "";
const getGambarUrl = (item: any) => {
  const path = item.gambar?.[0]?.prog_file_path;
  return path ? `${getBaseUrl()}${path}` : "";
};

const handleFallbackImage = (e: Event) => {
  const img = e.target as HTMLImageElement;
  img.style.display = "none";
  img.parentElement?.classList.add("no-img-active");
};

const fetchKatalog = async (isLoadMore = false) => {
  if (!props.custKode) {
    katalogList.value = [];
    totalKatalog.value = 0;
    selectedItem.value = null;
    return;
  }

  if (isLoadMore) isLoadingMore.value = true;
  else isLoading.value = true;

  try {
    const res = await praOrderService.getKatalogCustomer(props.custKode, {
      status: selectedStatus.value,
      q: searchQuery.value,
      page: page.value,
      limit,
    });

    const newData = res.data.data || [];
    totalKatalog.value = res.data.total || 0;
    hasMore.value = newData.length === limit;

    if (isLoadMore) {
      katalogList.value.push(...newData);
    } else {
      katalogList.value = newData;
      selectedItem.value = katalogList.value[0] || null;
    }
  } catch (error) {
    console.error("Gagal memuat katalog Pra Order", error);
  } finally {
    isLoading.value = false;
    isLoadingMore.value = false;
  }
};

const onScroll = (e: Event) => {
  const target = e.target as HTMLElement;
  if (target.scrollTop + target.clientHeight >= target.scrollHeight - 50) {
    if (!isLoading.value && !isLoadingMore.value && hasMore.value) {
      page.value++;
      fetchKatalog(true);
    }
  }
};

const onSearchInput = () => {
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    page.value = 1;
    hasMore.value = true;
    fetchKatalog();
  }, 500);
};

const setCategory = (val: string) => {
  selectedStatus.value = val;
  page.value = 1;
  hasMore.value = true;
  fetchKatalog();
};

watch(
  () => props.custKode,
  () => {
    searchQuery.value = "";
    selectedStatus.value = "SEMUA";
    page.value = 1;
    hasMore.value = true;
    fetchKatalog();
  },
  { immediate: true },
);
</script>

<template>
  <div v-if="!custKode" class="empty-state">
    <IconSearch :size="40" color="#bdbdbd" class="mb-2" />
    <div class="text-subtitle-2 text-grey-darken-1">
      Silakan pilih Customer di Tab Rencana Order terlebih dahulu.
    </div>
  </div>

  <div v-else class="katalog-layout">
    <div class="katalog-main">
      <div class="k-topbar">
        <div class="k-search-box">
          <IconSearch :size="16" color="#757575" class="k-search-icon" />
          <input
            v-model="searchQuery"
            type="text"
            class="k-search-input"
            :placeholder="`Cari nama pekerjaan untuk ${custNama}...`"
            @input="onSearchInput"
          />
        </div>
        <div class="k-profile-box">
          <div class="p-row">
            <span class="p-lbl">Klien:</span>
            <span class="p-val" style="color: #1565c0">{{ custNama }}</span>
          </div>
          <div class="p-row">
            <span class="p-lbl">Total Pra Order:</span>
            <span class="p-val">{{ totalKatalog }} Order</span>
          </div>
        </div>
      </div>

      <div class="k-categories">
        <button
          v-for="cat in categories"
          :key="cat.value"
          class="k-cat-btn"
          :class="{ active: selectedStatus === cat.value }"
          :style="{
            borderBottomColor:
              selectedStatus === cat.value ? cat.color : 'transparent',
          }"
          @click="setCategory(cat.value)"
        >
          <span class="dot" :style="{ backgroundColor: cat.color }"></span>
          {{ cat.label }}
        </button>
      </div>

      <div class="k-grid-container" @scroll="onScroll">
        <div v-if="isLoading && page === 1" class="loading-state">
          Memuat katalog...
        </div>
        <div v-else-if="katalogList.length === 0" class="empty-state">
          Belum ada riwayat Pra Order untuk customer ini.
        </div>

        <div v-else class="k-grid">
          <div
            v-for="item in katalogList"
            :key="item.pro_nomor"
            class="k-card"
            :class="{ active: selectedItem?.pro_nomor === item.pro_nomor }"
            @click="selectedItem = item"
          >
            <div class="k-card-img-wrap">
              <img
                :src="getGambarUrl(item)"
                class="k-card-img"
                @error="handleFallbackImage"
              />
              <div class="k-card-no-img">
                <IconPhotoOff :size="24" color="#9e9e9e" />
              </div>
            </div>
            <div class="k-card-info">
              <div class="k-c-title">{{ item.pro_nama_pekerjaan }}</div>
              <div class="k-c-sub">{{ item.pro_nomor }}</div>
            </div>
          </div>
        </div>

        <div
          v-if="isLoadingMore"
          class="text-center py-4 text-caption text-grey"
        >
          Memuat data berikutnya...
        </div>
      </div>
    </div>

    <div class="katalog-side">
      <div class="side-header">DETAIL PRA ORDER <span>(Ringkasan)</span></div>

      <div v-if="selectedItem" class="side-body">
        <div class="side-box-title">
          RINGKASAN - {{ selectedItem.pro_nomor }}
        </div>

        <div class="side-img-box">
          <img
            :src="getGambarUrl(selectedItem)"
            class="side-img"
            @error="handleFallbackImage"
          />
        </div>

        <table class="side-table">
          <tbody>
            <tr>
              <td class="st-lbl">Nama Pekerjaan</td>
              <td class="st-val fw">{{ selectedItem.pro_nama_pekerjaan }}</td>
            </tr>
            <tr>
              <td class="st-lbl">Nomor</td>
              <td class="st-val">{{ selectedItem.pro_nomor }}</td>
            </tr>
            <tr>
              <td class="st-lbl">Finishing</td>
              <td class="st-val">{{ selectedItem.pro_finishing || "-" }}</td>
            </tr>
            <tr>
              <td class="st-lbl">Qty Rencana</td>
              <td class="st-val">
                {{
                  Number(selectedItem.pro_qty_rencana).toLocaleString("id-ID")
                }}
                pcs
              </td>
            </tr>
            <tr>
              <td class="st-lbl">Tgl Kirim</td>
              <td class="st-val">{{ selectedItem.pro_tgl_kirim }}</td>
            </tr>
            <tr>
              <td class="st-lbl">Status PPIC</td>
              <td class="st-val text-success fw d-flex align-center gap-1">
                {{ selectedItem.pro_status_ppic }}
                <IconCircleCheckFilled
                  v-if="selectedItem.pro_status_ppic === 'SANGGUP'"
                  :size="14"
                />
              </td>
            </tr>
            <tr>
              <td class="st-lbl">Keterangan</td>
              <td class="st-val text-wrap">
                {{ selectedItem.pro_keterangan || "-" }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-else class="side-empty">
        Pilih salah satu kartu Pra Order untuk melihat detail ringkasan.
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Sama persis dengan TabKatalogMintaHarga */
.empty-state,
.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #757575;
  font-size: 13px;
  background: white;
}
.katalog-layout {
  display: flex;
  height: 100%;
  background: #f4f5f7;
  overflow: hidden;
}
.katalog-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
  border-right: 1px solid #e0e0e0;
  background: white;
}
.k-topbar {
  display: flex;
  gap: 12px;
  padding: 10px 12px;
  background: #fff;
  border-bottom: 1px solid #eee;
}
.k-search-box {
  flex: 1;
  display: flex;
  align-items: center;
  border: 2px solid #1565c0;
  border-radius: 4px;
  padding: 0 8px;
  height: 36px;
  background: #fff;
}
.k-search-icon {
  margin-right: 6px;
}
.k-search-input {
  flex: 1;
  border: none;
  outline: none;
  font-size: 13px;
  font-weight: 600;
  color: #333;
}
.k-profile-box {
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  padding: 4px 10px;
  font-size: 11px;
  min-width: 250px;
  background: #fafafa;
  display: flex;
  flex-direction: column;
  justify-content: center;
}
.p-row {
  display: flex;
  justify-content: space-between;
  margin-bottom: 2px;
}
.p-lbl {
  color: #555;
}
.p-val {
  font-weight: 700;
  color: #212121;
}
.k-categories {
  display: flex;
  gap: 4px;
  padding: 0 12px;
  background: #fafafa;
  border-bottom: 1px solid #e0e0e0;
  overflow-x: auto;
}
.k-cat-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 14px;
  font-size: 11px;
  font-weight: 700;
  color: #555;
  background: transparent;
  border: none;
  border-bottom: 3px solid transparent;
  cursor: pointer;
  white-space: nowrap;
}
.k-cat-btn.active {
  color: #212121;
  background: #fff;
}
.k-cat-btn .dot {
  width: 10px;
  height: 10px;
  border-radius: 2px;
}
.k-grid-container {
  flex: 1;
  overflow-y: auto;
  padding: 14px;
  background: #f0f2f5;
}
.k-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 14px;
}
.k-card {
  background: white;
  border-radius: 6px;
  overflow: hidden;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.08);
  border: 2px solid transparent;
  cursor: pointer;
  transition: all 0.2s;
  position: relative;
  display: flex;
  flex-direction: column;
}
.k-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
}
.k-card.active {
  border-color: #1565c0;
}
.k-card-img-wrap {
  width: 100%;
  height: 140px;
  background: #e0e0e0;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
}
.k-card-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.k-card-no-img {
  display: none;
  position: absolute;
}
.no-img-active .k-card-no-img {
  display: flex;
}
.k-card-info {
  padding: 8px 10px;
  background: #37474f;
  color: white;
  flex: 1;
}
.k-c-title {
  font-size: 11px;
  font-weight: 700;
  line-height: 1.3;
  margin-bottom: 4px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.k-c-sub {
  font-size: 9px;
  color: #cfd8dc;
}
.katalog-side {
  width: 320px;
  background: white;
  display: flex;
  flex-direction: column;
  border-left: 1px solid #e0e0e0;
}
.side-header {
  padding: 12px 14px;
  font-size: 12px;
  font-weight: 700;
  border-bottom: 1px solid #e0e0e0;
}
.side-header span {
  font-weight: 400;
  color: #757575;
}
.side-body {
  padding: 14px;
  overflow-y: auto;
  flex: 1;
}
.side-empty {
  padding: 20px;
  text-align: center;
  color: #9e9e9e;
  font-size: 12px;
  margin-top: 50px;
}
.side-box-title {
  font-size: 10px;
  font-weight: 700;
  background: #f5f5f5;
  padding: 6px 8px;
  border: 1px solid #e0e0e0;
  border-bottom: none;
  border-radius: 4px 4px 0 0;
}
.side-img-box {
  width: 100%;
  height: 200px;
  background: #f0f0f0;
  border: 1px solid #e0e0e0;
  border-bottom: none;
  display: flex;
  align-items: center;
  justify-content: center;
}
.side-img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}
.side-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 11px;
  border: 1px solid #e0e0e0;
  margin-bottom: 14px;
}
.side-table td {
  padding: 6px 8px;
  border-bottom: 1px solid #eeeeee;
  vertical-align: top;
}
.st-lbl {
  width: 110px;
  font-weight: 600;
  color: #424242;
  background: #fafafa;
  border-right: 1px solid #eeeeee;
}
.st-val {
  color: #212121;
}
.text-wrap {
  white-space: pre-wrap;
  line-height: 1.4;
}
.fw {
  font-weight: 700;
}
.text-success {
  color: #2e7d32;
}
.gap-1 {
  gap: 4px;
}
</style>
