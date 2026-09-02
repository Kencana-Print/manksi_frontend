<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { praOrderService } from "@/services/penjualan/praOrderService";

const props = defineProps<{ formData: any; isEdit: boolean }>();

const ukuranMaster = ref<{ kode: string; ukuran: string }[]>([]);

onMounted(async () => {
  try {
    const res = await praOrderService.getInitGrids();
    ukuranMaster.value = res.data.data.ukuran || [];

    // Sinkron: pastikan semua ukuran master tersedia sebagai baris,
    // isi qty dari data tersimpan (jika edit) atau 0.
    const existing = new Map(
      props.formData.Ukuran.map((u: any) => [u.Kode, u.Qty]),
    );
    props.formData.Ukuran = ukuranMaster.value.map((m) => ({
      Kode: m.kode,
      Ukuran: m.ukuran,
      Qty: Number(existing.get(m.kode)) || 0,
    }));
  } catch {
    console.error("Gagal load master ukuran");
  }
});

const totalQty = computed(() =>
  props.formData.Ukuran.reduce(
    (sum: number, u: any) => sum + (Number(u.Qty) || 0),
    0,
  ),
);
</script>

<template>
  <div class="tu-wrapper">
    <div class="tu-left">
      <div class="tu-section">
        <div class="tu-sec-title">Breakdown Ukuran &amp; Qty</div>
        <table class="tu-table">
          <thead>
            <tr>
              <th style="width: 60px">Kode</th>
              <th>Ukuran</th>
              <th style="width: 120px; text-align: right">Qty</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="u in formData.Ukuran" :key="u.Kode">
              <td class="tc">{{ u.Kode }}</td>
              <td>{{ u.Ukuran }}</td>
              <td>
                <input
                  v-model.number="u.Qty"
                  type="number"
                  min="0"
                  class="tu-qty-inp"
                  v-select-on-focus
                />
              </td>
            </tr>
            <tr v-if="!formData.Ukuran.length">
              <td colspan="3" class="tu-empty">Memuat master ukuran...</td>
            </tr>
          </tbody>
          <tfoot>
            <tr>
              <td colspan="2" class="tu-total-lbl">Total Qty Rencana</td>
              <td class="tu-total-val">
                {{ totalQty.toLocaleString("id-ID") }}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>

    <div class="tu-right">
      <div
        class="tu-section"
        style="flex: 1; display: flex; flex-direction: column; min-height: 0"
      >
        <div class="tu-sec-title">Keterangan Tambahan</div>
        <v-textarea
          v-model="formData.Keterangan"
          variant="outlined"
          density="compact"
          hide-details
          class="f-inp flex-1 text-area-fill"
          placeholder="Catatan bebas terkait order ini..."
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.tu-wrapper {
  display: flex;
  gap: 10px;
  height: 100%;
  font-family: "Segoe UI", system-ui, sans-serif;
  font-size: 12px;
}
.tu-left {
  flex: 1;
  min-width: 0;
}
.tu-right {
  width: 380px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
}
.tu-section {
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  padding: 8px 10px;
  height: 100%;
}
.tu-sec-title {
  font-size: 10px;
  font-weight: 700;
  color: #555;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  margin-bottom: 6px;
}

.tu-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
}
.tu-table thead tr {
  background: #1565c0;
}
.tu-table th {
  padding: 5px 8px;
  font-size: 11px;
  font-weight: 700;
  color: white;
  text-align: left;
  white-space: nowrap;
}
.tu-table td {
  padding: 4px 8px;
  border-bottom: 1px solid #f0f0f0;
  vertical-align: middle;
}
.tc {
  text-align: center;
}
.tu-qty-inp {
  width: 100%;
  height: 26px;
  border: 1px solid #bdbdbd;
  border-radius: 3px;
  padding: 0 6px;
  font-size: 12px;
  text-align: right;
  outline: none;
}
.tu-qty-inp:focus {
  border-color: #1976d2;
}
.tu-empty {
  text-align: center;
  color: #bdbdbd;
  padding: 12px;
  font-size: 11px;
}
.tu-total-lbl {
  text-align: right;
  font-weight: 700;
  font-size: 11px;
  color: #333;
  padding-top: 8px;
}
.tu-total-val {
  text-align: right;
  font-weight: 700;
  font-size: 13px;
  color: #1565c0;
  padding-top: 8px;
}

.f-inp {
  flex: 1;
  min-width: 0;
}
.v-textarea.f-inp.text-area-fill {
  display: flex;
  flex-direction: column;
}
.v-textarea.f-inp.text-area-fill :deep(.v-input__control),
.v-textarea.f-inp.text-area-fill :deep(.v-field) {
  flex: 1;
  height: 100% !important;
}
.v-textarea.f-inp.text-area-fill :deep(.v-field__input) {
  height: 100% !important;
  padding-top: 8px !important;
  padding-bottom: 8px !important;
  overflow-y: auto;
}
</style>
