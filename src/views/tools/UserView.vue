<script setup lang="ts">
import { useRouter } from "vue-router";
import api from "@/services/api";
import { useBrowse } from "@/composables/useBrowse";
import BaseBrowse from "@/components/BaseBrowse.vue";
import { IconUsers } from "@tabler/icons-vue";

interface UserBrowseItem {
  Kode: string;
  Nama: string;
  Nik: string;
  DepJab: string;
  Bagian: string;
  Pabrik: string;
  Cabang: string;
  JmlCabang: number;
  Role: string;
  Aktif: "YA" | "TIDAK";
  Tipe: string;
  DariHrd: boolean;
  KeluarHrd: boolean;
  CabangHrd: string;
  CabangSesuai: boolean;
}

interface RowCtx {
  item: UserBrowseItem & { raw?: UserBrowseItem };
}

const router = useRouter();

// Modul ini admin-only (dijaga di backend via requireAdmin), bukan lewat
// permission thakuser/menuId, makanya menuId dikirim kosong.
const { items, isLoading, selected, fetchData, exportToExcel } = useBrowse({
  menuId: "",
  fetchApi: async () => {
    const res = await api.get("/tools/users");
    return res.data.data;
  },
});

const headers = [
  { title: "KODE USER", key: "Kode", width: "130px" },
  { title: "NAMA", key: "Nama", minWidth: "220px" },
  { title: "NIK", key: "Nik", width: "120px" },
  { title: "DEPT/JABATAN", key: "DepJab", width: "120px" },
  { title: "BAGIAN", key: "Bagian", width: "180px" },
  { title: "PABRIK", key: "Pabrik", width: "80px", align: "center" },
  { title: "CABANG", key: "Cabang", width: "90px", align: "center" },
  { title: "ROLE", key: "Role", minWidth: "150px" },
  { title: "AKTIF", key: "Aktif", width: "100px", align: "center" },
];

const rowPropsFn = (data: RowCtx) => {
  const item = data.item.raw ?? data.item;
  if (item.Aktif === "TIDAK") return { class: "text-red font-weight-bold" };
  // Akun aktif milik karyawan yang sudah keluar menurut HRD
  if (item.KeluarHrd) return { class: "text-orange-darken-3 font-weight-bold" };
  return {};
};

const handleAdd = () => router.push({ name: "UserFormCreate" });
const handleEdit = (item: UserBrowseItem) =>
  router.push({ name: "UserFormEdit", params: { kode: item.Kode } });
</script>

<template>
  <BaseBrowse
    title="Master User"
    menu-id=""
    :icon="IconUsers"
    :headers="headers"
    :items="items ?? []"
    :is-loading="isLoading"
    v-model:selected="selected"
    :can-insert="true"
    :can-edit="true"
    :can-delete="false"
    :can-export="true"
    :row-props-fn="rowPropsFn"
    item-value="Kode"
    @refresh="fetchData"
    @add="handleAdd"
    @edit="handleEdit"
    @export="exportToExcel('Data_Master_User')"
  >
    <template #item.Nama="{ item }">
      <span :class="{ fallback: !item.DariHrd }">{{ item.Nama }}</span>
    </template>

    <template #item.Nik="{ item }">
      <span v-if="item.Nik">{{ item.Nik }}</span>
      <span v-else-if="item.Tipe === 'BERSAMA'" class="fallback"
        >Akun bersama</span
      >
      <span v-else class="fallback">-</span>
    </template>

    <template #item.Bagian="{ item }">
      <span :class="{ fallback: !item.DariHrd }">{{ item.Bagian }}</span>
    </template>

    <template #item.Cabang="{ item }">
      <span
        :class="{ 'cab-warn': !item.CabangSesuai }"
        :title="
          !item.CabangSesuai
            ? `Cabang menurut pabrik HRD: ${item.CabangHrd}`
            : ''
        "
      >
        {{ item.Cabang }}
      </span>
      <span v-if="item.JmlCabang > 1" class="plus"
        >+{{ item.JmlCabang - 1 }}</span
      >
    </template>

    <template #item.Aktif="{ item }">
      <span
        class="status-chip"
        :class="item.Aktif === 'TIDAK' ? 'chip-red' : 'chip-green'"
      >
        {{ item.Aktif === "TIDAK" ? "PASIF" : "AKTIF" }}
      </span>
    </template>

    <template #filter-right>
      <div class="legend-box">
        <div class="legend-row">
          <span class="legend-title">Keterangan:</span>
          <div class="legend-item">
            <div class="legend-dot" style="background: #2e7d32"></div>
            Aktif
          </div>
          <div class="legend-item">
            <div class="legend-dot" style="background: #c62828"></div>
            User Pasif
          </div>
          <div class="legend-item">
            <div class="legend-dot" style="background: #e65100"></div>
            Sudah keluar di HRD
          </div>
          <div class="legend-item">
            <span class="fallback">Miring abu-abu</span> = data MANKSI (belum
            ada NIK)
          </div>
          <div class="legend-item">
            <span class="cab-warn">Cabang</span> = berbeda dari pabrik HRD
          </div>
        </div>
      </div>
    </template>
  </BaseBrowse>
</template>

<style scoped>
.status-chip {
  display: inline-block;
  padding: 2px 10px;
  border-radius: 10px;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.03em;
}
.chip-green {
  background: #e8f5e9;
  color: #2e7d32;
}
.chip-red {
  background: #ffebee;
  color: #c62828;
}
.legend-box {
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  padding: 4px 8px;
  display: flex;
  flex-direction: column;
  gap: 3px;
}
.legend-row {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: nowrap;
}
.legend-title {
  font-size: 10px;
  font-weight: 700;
  color: #555;
  white-space: nowrap;
  flex-shrink: 0;
}
.legend-item {
  display: flex;
  align-items: center;
  gap: 3px;
  font-size: 10px;
  color: #424242;
  white-space: nowrap;
}
.legend-dot {
  width: 9px;
  height: 9px;
  border-radius: 2px;
  flex-shrink: 0;
}
.fallback {
  color: #9e9e9e;
  font-style: italic;
}
.plus {
  font-size: 9px;
  font-weight: 700;
  color: #1565c0;
  margin-left: 2px;
}
.cab-warn {
  color: #e65100;
  font-weight: 700;
  text-decoration: underline dotted;
}
</style>
