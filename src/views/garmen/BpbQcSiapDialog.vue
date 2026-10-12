<script setup lang="ts">
import { ref, computed, watch } from "vue";
import { useToast } from "vue-toastification";
import { bpbBahanFormService } from "@/services/garmen/bpbBahanFormService";
import { IconSearch } from "@tabler/icons-vue";

interface QcSiapRow {
  nomor: string;
  tanggal: string;
  po: string;
  jenis: string;
  vendor: string;
  status: string;
  jml_lot: number;
  qty: number | string;
  roll: number | string;
  satuan: string;
}

const props = defineProps<{ modelValue: boolean }>();
const emit = defineEmits<{
  (e: "update:modelValue", v: boolean): void;
  (e: "selected", nomor: string[]): void;
}>();

const toast = useToast();
const rows = ref<QcSiapRow[]>([]);
const isLoading = ref(false);
const search = ref("");
const picked = ref<string[]>([]);

const filtered = computed(() => {
  const q = search.value.trim().toLowerCase();
  if (!q) return rows.value;
  return rows.value.filter((r) =>
    [r.nomor, r.po, r.jenis, r.vendor].some((v) =>
      String(v ?? "")
        .toLowerCase()
        .includes(q),
    ),
  );
});

// QC yang digabung dalam satu BPB harus dari PO yang sama
const poTerpilih = computed(
  () => rows.value.find((r) => r.nomor === picked.value[0])?.po ?? "",
);
const bolehPilih = (r: QcSiapRow) =>
  !poTerpilih.value || r.po === poTerpilih.value;

const tutup = () => emit("update:modelValue", false);

const load = async () => {
  isLoading.value = true;
  picked.value = [];
  search.value = "";
  try {
    const res = await bpbBahanFormService.getQcSiap();
    rows.value = res.data.data as QcSiapRow[];
  } catch (e) {
    const err = e as { response?: { data?: { message?: string } } };
    toast.error(err.response?.data?.message || "Gagal memuat daftar QC Bahan.");
    tutup();
  } finally {
    isLoading.value = false;
  }
};

watch(
  () => props.modelValue,
  (open) => {
    if (open) load();
  },
);

const toggle = (r: QcSiapRow) => {
  if (!bolehPilih(r)) return;
  const i = picked.value.indexOf(r.nomor);
  if (i >= 0) picked.value.splice(i, 1);
  else picked.value.push(r.nomor);
};

const konfirmasi = () => {
  if (picked.value.length === 0) {
    return toast.warning("Pilih minimal satu dokumen QC.");
  }
  emit("selected", [...picked.value]);
  tutup();
};

const numFmt = (v: number | string) =>
  Number(v || 0).toLocaleString("id-ID", { maximumFractionDigits: 2 });
</script>

<template>
  <v-dialog
    :model-value="modelValue"
    max-width="1000"
    @update:model-value="(v: boolean) => emit('update:modelValue', v)"
  >
    <v-card rounded="lg" class="qs-dialog">
      <v-card-title class="bg-primary text-white pa-3 text-subtitle-1">
        Pilih QC Bahan untuk BPB
      </v-card-title>
      <v-card-text class="pa-3">
        <div class="qs-search">
          <IconSearch :size="14" />
          <input
            v-model="search"
            type="text"
            placeholder="Cari nomor QC, PO, kain, vendor..."
          />
        </div>
        <v-progress-linear v-if="isLoading" indeterminate height="2" />
        <div class="qs-wrap">
          <table class="qs-table">
            <thead>
              <tr>
                <th width="32"></th>
                <th width="130">Nomor QC</th>
                <th width="90">Tgl Datang</th>
                <th width="130">Nomor PO</th>
                <th>Jenis Kain</th>
                <th>Vendor</th>
                <th width="80" class="tc">Status</th>
                <th width="50" class="tr">Lot</th>
                <th width="110" class="tr">Qty</th>
                <th width="60" class="tr">Roll</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="r in filtered"
                :key="r.nomor"
                :class="{ off: !bolehPilih(r) }"
                @click="toggle(r)"
              >
                <td class="tc">
                  <input
                    type="checkbox"
                    :checked="picked.includes(r.nomor)"
                    :disabled="!bolehPilih(r)"
                    @click.stop
                    @change="toggle(r)"
                  />
                </td>
                <td class="fw">{{ r.nomor }}</td>
                <td>{{ r.tanggal }}</td>
                <td>{{ r.po }}</td>
                <td>{{ r.jenis }}</td>
                <td>{{ r.vendor }}</td>
                <td class="tc">{{ r.status }}</td>
                <td class="tr">{{ r.jml_lot }}</td>
                <td class="tr">{{ numFmt(r.qty) }} {{ r.satuan }}</td>
                <td class="tr">{{ numFmt(r.roll) }}</td>
              </tr>
              <tr v-if="!isLoading && filtered.length === 0">
                <td colspan="10" class="empty">
                  Tidak ada QC Bahan yang siap diterima.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <p class="qs-note">
          Hanya lot berkeputusan LANJUT yang belum diterima yang akan ditarik.
          QC yang digabung harus dari PO yang sama.
        </p>
      </v-card-text>
      <v-card-actions class="pa-3 border-t">
        <v-spacer />
        <v-btn variant="text" @click="tutup">Batal</v-btn>
        <v-btn color="primary" variant="elevated" @click="konfirmasi">
          Pilih ({{ picked.length }})
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.qs-dialog {
  font-size: 11px;
}
.qs-search {
  display: flex;
  align-items: center;
  gap: 6px;
  border: 1px solid #ccc;
  border-radius: 4px;
  padding: 0 8px;
  height: 28px;
  margin-bottom: 8px;
  color: #757575;
}
.qs-search input {
  border: none;
  outline: none;
  font-size: 11px;
  width: 100%;
  color: #212121;
}
.qs-wrap {
  max-height: 50vh;
  overflow: auto;
  border: 1px solid #e0e0e0;
}
.qs-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 11px;
}
.qs-table th {
  background: #546e7a;
  color: white;
  text-align: left;
  padding: 6px 8px;
  position: sticky;
  top: 0;
}
.qs-table td {
  padding: 4px 8px;
  border-bottom: 1px solid #eee;
  white-space: nowrap;
}
.qs-table tbody tr {
  cursor: pointer;
}
.qs-table tbody tr:hover td {
  background: #e3f2fd;
}
.qs-table tbody tr.off {
  opacity: 0.4;
  cursor: not-allowed;
}
.tc {
  text-align: center !important;
}
.tr {
  text-align: right !important;
}
.fw {
  font-weight: 700;
}
.empty {
  text-align: center;
  color: #9e9e9e;
  font-style: italic;
  padding: 14px;
}
.qs-note {
  font-size: 10px;
  color: #757575;
  margin: 6px 0 0;
}
</style>
