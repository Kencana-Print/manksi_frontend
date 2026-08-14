<script setup lang="ts">
import { ref } from "vue";

interface FieldInfo {
  field: string;
  type?: string;
}
interface ValueField {
  field: string;
  aggregation: string;
}
interface CalculatedField {
  id: string;
  name: string;
  formula: string;
}

const props = defineProps<{
  availableFields: FieldInfo[];
  rowFields: string[];
  columnFields: string[];
  valueFields: ValueField[];
  showRowTotals: boolean;
  showColumnTotals: boolean;
  calculatedFields: CalculatedField[];
  theme?: "light" | "dark";
}>();

const emit = defineEmits<{
  (e: "update:show-row-totals", v: boolean): void;
  (e: "update:show-column-totals", v: boolean): void;
  (e: "clear-config"): void;
  (e: "drag-start", field: string): void;
  (e: "drag-end"): void;
  (
    e: "update-aggregation",
    field: string,
    oldAgg: string,
    newAgg: string,
  ): void;
  (e: "add-row-field", field: string): void;
  (e: "remove-row-field", field: string): void;
  (e: "add-column-field", field: string): void;
  (e: "remove-column-field", field: string): void;
  (e: "add-value-field", field: string, aggregation: string): void;
  (e: "remove-value-field", field: string, aggregation: string): void;
  (e: "add-calculated-field", field: CalculatedField): void;
  (e: "remove-calculated-field", id: string): void;
  (e: "update-calculated-field", field: CalculatedField): void;
}>();

const AGGREGATIONS = ["sum", "avg", "count", "min", "max"];

// Field yang belum dipakai di manapun (rows/cols/values)
const usedFields = () =>
  new Set([
    ...props.rowFields,
    ...props.columnFields,
    ...props.valueFields.map((v) => v.field),
  ]);

const unusedFields = () =>
  props.availableFields.filter((f) => !usedFields().has(f.field));

// ── Calculated field form ──
const showCalcForm = ref(false);
const editingCalcId = ref<string | null>(null);
const calcName = ref("");
const calcFormula = ref("");

const openNewCalc = () => {
  editingCalcId.value = null;
  calcName.value = "";
  calcFormula.value = "";
  showCalcForm.value = true;
};
const openEditCalc = (f: CalculatedField) => {
  editingCalcId.value = f.id;
  calcName.value = f.name;
  calcFormula.value = f.formula;
  showCalcForm.value = true;
};
const saveCalc = () => {
  if (!calcName.value.trim() || !calcFormula.value.trim()) return;
  if (editingCalcId.value) {
    emit("update-calculated-field", {
      id: editingCalcId.value,
      name: calcName.value.trim(),
      formula: calcFormula.value.trim(),
    });
  } else {
    emit("add-calculated-field", {
      id: `calc_${Date.now()}`,
      name: calcName.value.trim(),
      formula: calcFormula.value.trim(),
    });
  }
  showCalcForm.value = false;
};
</script>

<template>
  <div class="pvcfg" :class="theme">
    <!-- Field tersedia -->
    <div class="pvcfg-section">
      <div class="pvcfg-title">Field Tersedia</div>
      <div class="pvcfg-pills">
        <span
          v-for="f in unusedFields()"
          :key="f.field"
          class="pvcfg-pill"
          draggable="true"
          @dragstart="emit('drag-start', f.field)"
          @dragend="emit('drag-end')"
        >
          {{ f.field }}
        </span>
        <span v-if="!unusedFields().length" class="pvcfg-empty"
          >Semua field terpakai</span
        >
      </div>
    </div>

    <!-- Rows -->
    <div class="pvcfg-section">
      <div class="pvcfg-title">Baris (Rows)</div>
      <div
        class="pvcfg-dropzone"
        @dragover.prevent
        @drop="
          emit('add-row-field', $event.dataTransfer?.getData('text') || '')
        "
      >
        <select
          class="pvcfg-add-select"
          @change="
            (e) => {
              const v = (e.target as HTMLSelectElement).value;
              if (v) emit('add-row-field', v);
              (e.target as HTMLSelectElement).value = '';
            }
          "
        >
          <option value="">+ Tambah field baris...</option>
          <option v-for="f in unusedFields()" :key="f.field" :value="f.field">
            {{ f.field }}
          </option>
        </select>
        <div class="pvcfg-chips">
          <span v-for="f in rowFields" :key="f" class="pvcfg-chip">
            {{ f }}
            <button @click="emit('remove-row-field', f)">×</button>
          </span>
        </div>
      </div>
    </div>

    <!-- Columns -->
    <div class="pvcfg-section">
      <div class="pvcfg-title">Kolom (Columns)</div>
      <div
        class="pvcfg-dropzone"
        @dragover.prevent
        @drop="
          emit('add-column-field', $event.dataTransfer?.getData('text') || '')
        "
      >
        <select
          class="pvcfg-add-select"
          @change="
            (e) => {
              const v = (e.target as HTMLSelectElement).value;
              if (v) emit('add-column-field', v);
              (e.target as HTMLSelectElement).value = '';
            }
          "
        >
          <option value="">+ Tambah field kolom...</option>
          <option v-for="f in unusedFields()" :key="f.field" :value="f.field">
            {{ f.field }}
          </option>
        </select>
        <div class="pvcfg-chips">
          <span v-for="f in columnFields" :key="f" class="pvcfg-chip">
            {{ f }}
            <button @click="emit('remove-column-field', f)">×</button>
          </span>
        </div>
      </div>
    </div>

    <!-- Values -->
    <div class="pvcfg-section">
      <div class="pvcfg-title">Nilai (Values) — bisa lebih dari satu</div>
      <div class="pvcfg-dropzone">
        <select
          class="pvcfg-add-select"
          @change="
            (e) => {
              const v = (e.target as HTMLSelectElement).value;
              if (v) emit('add-value-field', v, 'sum');
              (e.target as HTMLSelectElement).value = '';
            }
          "
        >
          <option value="">+ Tambah field nilai...</option>
          <option v-for="f in availableFields" :key="f.field" :value="f.field">
            {{ f.field }}
          </option>
        </select>
        <div class="pvcfg-value-list">
          <div
            v-for="vf in valueFields"
            :key="`${vf.field}-${vf.aggregation}`"
            class="pvcfg-value-row"
          >
            <span class="pvcfg-value-name">{{ vf.field }}</span>
            <select
              :value="vf.aggregation"
              class="pvcfg-agg-select"
              @change="
                (e) =>
                  emit(
                    'update-aggregation',
                    vf.field,
                    vf.aggregation,
                    (e.target as HTMLSelectElement).value,
                  )
              "
            >
              <option v-for="a in AGGREGATIONS" :key="a" :value="a">
                {{ a }}
              </option>
            </select>
            <button
              class="pvcfg-remove-btn"
              @click="emit('remove-value-field', vf.field, vf.aggregation)"
            >
              ×
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Calculated fields -->
    <div class="pvcfg-section">
      <div class="pvcfg-title-row">
        <span class="pvcfg-title">Rumus Custom</span>
        <button class="pvcfg-add-calc-btn" @click="openNewCalc">
          + Tambah
        </button>
      </div>
      <div class="pvcfg-calc-list">
        <div v-for="cf in calculatedFields" :key="cf.id" class="pvcfg-calc-row">
          <div class="pvcfg-calc-info" @click="openEditCalc(cf)">
            <span class="pvcfg-calc-name">{{ cf.name }}</span>
            <span class="pvcfg-calc-formula">{{ cf.formula }}</span>
          </div>
          <button
            class="pvcfg-remove-btn"
            @click="emit('remove-calculated-field', cf.id)"
          >
            ×
          </button>
        </div>
        <div v-if="!calculatedFields.length" class="pvcfg-empty">
          Belum ada rumus custom
        </div>
      </div>

      <!-- Form tambah/edit -->
      <div v-if="showCalcForm" class="pvcfg-calc-form">
        <input
          v-model="calcName"
          placeholder="Nama (mis. Rata2 Harga)"
          class="pvcfg-calc-input"
        />
        <input
          v-model="calcFormula"
          placeholder="Rumus (mis. Nominal / QtyOrder)"
          class="pvcfg-calc-input"
        />
        <div class="pvcfg-calc-hint">
          Gunakan nama field persis seperti di data, mis:
          <code>Nominal / QtyOrder</code>
        </div>
        <div class="pvcfg-calc-actions">
          <button @click="showCalcForm = false">Batal</button>
          <button class="primary" @click="saveCalc">Simpan</button>
        </div>
      </div>
    </div>

    <!-- Totals & reset -->
    <div class="pvcfg-section pvcfg-footer">
      <label class="pvcfg-check">
        <input
          type="checkbox"
          :checked="showRowTotals"
          @change="
            emit(
              'update:show-row-totals',
              ($event.target as HTMLInputElement).checked,
            )
          "
        />
        Tampilkan Total Baris
      </label>
      <label class="pvcfg-check">
        <input
          type="checkbox"
          :checked="showColumnTotals"
          @change="
            emit(
              'update:show-column-totals',
              ($event.target as HTMLInputElement).checked,
            )
          "
        />
        Tampilkan Total Kolom
      </label>
      <button class="pvcfg-clear-btn" @click="emit('clear-config')">
        Reset Semua
      </button>
    </div>
  </div>
</template>

<style scoped>
.pvcfg {
  display: flex;
  flex-direction: column;
  gap: 12px;
  font-size: 11px;
  padding: 10px;
  background: #fafafa;
  border-right: 1px solid #e0e0e0;
  width: 220px;
  flex-shrink: 0;
  height: 100%;
  overflow-y: auto;
}
.pvcfg-title {
  font-weight: 700;
  color: #555;
  text-transform: uppercase;
  font-size: 10px;
  letter-spacing: 0.03em;
  margin-bottom: 6px;
}
.pvcfg-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 6px;
}
.pvcfg-pills {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}
.pvcfg-pill {
  background: #e3f2fd;
  color: #1565c0;
  padding: 3px 8px;
  border-radius: 10px;
  font-size: 10px;
  cursor: grab;
  user-select: none;
}
.pvcfg-empty {
  font-size: 10px;
  color: #9e9e9e;
  font-style: italic;
}
.pvcfg-add-select {
  width: 100%;
  height: 26px;
  border: 1px solid #ccc;
  border-radius: 4px;
  font-size: 10px;
  margin-bottom: 6px;
}
.pvcfg-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}
.pvcfg-chip {
  display: flex;
  align-items: center;
  gap: 4px;
  background: #e8f5e9;
  color: #2e7d32;
  padding: 3px 6px;
  border-radius: 10px;
  font-size: 10px;
}
.pvcfg-chip button {
  background: none;
  border: none;
  color: #2e7d32;
  cursor: pointer;
  font-weight: 700;
  padding: 0;
}
.pvcfg-value-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.pvcfg-value-row {
  display: flex;
  align-items: center;
  gap: 4px;
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  padding: 3px 5px;
}
.pvcfg-value-name {
  flex: 1;
  font-size: 10px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.pvcfg-agg-select {
  font-size: 10px;
  height: 22px;
  border: 1px solid #ccc;
  border-radius: 3px;
}
.pvcfg-remove-btn {
  background: none;
  border: none;
  color: #c62828;
  cursor: pointer;
  font-weight: 700;
  padding: 0 2px;
}
.pvcfg-add-calc-btn {
  background: #1565c0;
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 10px;
  padding: 3px 8px;
  cursor: pointer;
}
.pvcfg-calc-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.pvcfg-calc-row {
  display: flex;
  align-items: center;
  gap: 4px;
  background: #fff3e0;
  border-radius: 4px;
  padding: 4px 6px;
}
.pvcfg-calc-info {
  flex: 1;
  cursor: pointer;
  overflow: hidden;
}
.pvcfg-calc-name {
  display: block;
  font-weight: 700;
  color: #e65100;
  font-size: 10px;
}
.pvcfg-calc-formula {
  display: block;
  font-family: monospace;
  font-size: 9px;
  color: #8d6e63;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.pvcfg-calc-form {
  margin-top: 6px;
  background: white;
  border: 1px solid #ddd;
  border-radius: 4px;
  padding: 6px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.pvcfg-calc-input {
  height: 26px;
  border: 1px solid #ccc;
  border-radius: 4px;
  padding: 0 6px;
  font-size: 10px;
}
.pvcfg-calc-hint {
  font-size: 9px;
  color: #9e9e9e;
}
.pvcfg-calc-actions {
  display: flex;
  gap: 6px;
  justify-content: flex-end;
}
.pvcfg-calc-actions button {
  font-size: 10px;
  border: 1px solid #ccc;
  background: white;
  border-radius: 4px;
  padding: 4px 10px;
  cursor: pointer;
}
.pvcfg-calc-actions button.primary {
  background: #1565c0;
  color: white;
  border-color: #1565c0;
}
.pvcfg-footer {
  border-top: 1px solid #e0e0e0;
  padding-top: 8px;
  gap: 6px;
  display: flex;
  flex-direction: column;
}
.pvcfg-check {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 10px;
  cursor: pointer;
}
.pvcfg-clear-btn {
  background: #ffebee;
  color: #c62828;
  border: 1px solid #ffcdd2;
  border-radius: 4px;
  padding: 5px;
  font-size: 10px;
  cursor: pointer;
}
</style>
