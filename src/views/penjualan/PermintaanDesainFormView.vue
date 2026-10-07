<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useRoute } from "vue-router";
import { useToast } from "vue-toastification";
import BaseForm from "@/components/BaseForm.vue";
import { useForm } from "@/composables/useForm";
import { permintaanDesainService as svc } from "@/services/penjualan/permintaanDesainService";
import CustomerSearchModal from "@/components/lookups/CustomerSearchModal.vue";
import PermintaanDesainSearchModal from "@/components/lookups/PermintaanDesainSearchModal.vue";
import {
  IconPalette,
  IconSearch,
  IconTrash,
  IconPlus,
} from "@tabler/icons-vue";

interface ItemRow {
  id?: number | null;
  desain: string;
  jml: number;
  desainer: string;
  dikerjakan: number;
}

interface PDFormData {
  tanggal: string;
  namaProject: string;
  customerKode: string;
  customerNama: string;
  jenisPekerjaan: string;
  dateline: string;
  prioritas: string;
  referensi: string;
  keterangan: string;
  desainer: string;
  items: ItemRow[];
}

const toast = useToast();
const route = useRoute();
const editNomor = computed(() => String(route.params.nomor || ""));
const isEdit = computed(() => !!editNomor.value);

const toInputDate = (v: any) => {
  if (!v) return "";
  const d = new Date(v);
  if (isNaN(d.getTime())) return "";
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const todayStr = toInputDate(new Date());

const initialData: PDFormData = {
  tanggal: todayStr,
  namaProject: "",
  customerKode: "",
  customerNama: "",
  jenisPekerjaan: "BARU",
  dateline: "",
  prioritas: "NORMAL",
  referensi: "",
  keterangan: "",
  desainer: "",
  items: [{ desain: "", jml: 1, desainer: "", dikerjakan: 0 }],
};

const {
  isSaving,
  showSaveDialog,
  showCancelDialog,
  showCloseDialog,
  formData,
  goBack,
  executeSave,
  executeCancel,
  executeClose,
} = useForm<PDFormData>({
  menuId: "184",
  initialData,
  submitApi: (data) => {
    const items = data.items
      .filter((i) => i.desain.trim() && Number(i.jml) > 0)
      .map((i) => ({
        id: i.id ?? null,
        desain: i.desain.trim(),
        jml: Number(i.jml),
        desainer: i.desainer || null,
      }));

    if (isEdit.value) {
      return svc.updateHeader(editNomor.value, {
        namaProject: data.namaProject.trim(),
        customer: data.customerKode || undefined,
        customerNama: data.customerNama || undefined,
        jenisPekerjaan: data.jenisPekerjaan,
        dateline: data.dateline || undefined,
        keterangan: data.keterangan,
        items,
      });
    }

    return svc.createPD({
      tanggal: data.tanggal,
      namaProject: data.namaProject,
      customer: data.customerKode || undefined,
      jenisPekerjaan: data.jenisPekerjaan,
      dateline: data.dateline || undefined,
      keterangan: data.keterangan,
      prioritas: data.prioritas,
      desainer: data.desainer || undefined,
      referensi: data.jenisPekerjaan === "REVISI" ? data.referensi : undefined,
      items: items.map(({ desain, jml, desainer }) => ({
        desain,
        jml,
        desainer,
      })),
    });
  },
  onSuccess: (response: any) => {
    toast.success(
      isEdit.value
        ? `Permintaan Desain ${editNomor.value} berhasil diupdate.`
        : `Permintaan Desain ${response?.nomor ?? ""} berhasil dibuat.`,
    );
    goBack();
  },
});

const addRow = () => {
  formData.value.items.push({
    desain: "",
    jml: 1,
    desainer: formData.value.desainer || "",
    dikerjakan: 0,
  });
};
const removeRow = (index: number) => {
  const row = formData.value.items[index];
  if (!row || formData.value.items.length <= 1) return;
  if (row.dikerjakan > 0) {
    toast.warning("Baris yang sudah dikerjakan tidak dapat dihapus.");
    return;
  }
  formData.value.items.splice(index, 1);
};

// Dropdown desainer di header = pintasan: isi semua baris yang masih kosong
const onHeaderDesainerChange = (kode: string | null) => {
  if (!kode) return;
  formData.value.items.forEach((r) => {
    if (!r.desainer) r.desainer = kode;
  });
};

const showCustomerModal = ref(false);
const onCustomerSelected = (item: any) => {
  formData.value.customerKode = item.Kode;
  formData.value.customerNama = item.Nama;
};

interface DesainerOption {
  Kode: string;
  Nama: string;
}
const desainerOptions = ref<DesainerOption[]>([]);

onMounted(async () => {
  try {
    const res = await svc.getDesainerOptions();
    desainerOptions.value = res.data.data ?? [];
  } catch {
    // opsional, biarin kosong kalau gagal — nggak blocking form
  }
});

onMounted(async () => {
  if (!isEdit.value) return;
  try {
    const res = await svc.getDetail(editNomor.value);
    const d = res.data.data;
    if (!d) throw new Error("not found");
    if (
      ["DONE", "CLOSE", "PENDING", "CANCEL", "CANCEL_ALT"].includes(d.pd_status)
    ) {
      toast.error(
        `PD berstatus ${d.pd_status} tidak dapat diedit. Aktifkan kembali dulu jika perlu.`,
      );
      goBack();
      return;
    }

    formData.value = {
      tanggal: toInputDate(d.pd_tanggal),
      namaProject: d.pd_nama_project ?? "",
      customerKode: d.pd_customer ?? "",
      customerNama: d.pd_customer_nama ?? "",
      jenisPekerjaan: d.pd_jenis_pekerjaan ?? "BARU",
      dateline: toInputDate(d.pd_dateline),
      prioritas: d.pd_prioritas ?? "NORMAL",
      referensi: d.pd_referensi ?? "",
      keterangan: d.pd_keterangan ?? "",
      desainer: d.pd_desainer ?? "",
      items: (d.detail ?? []).map((x: any) => ({
        id: x.pd2_id,
        desain: x.pd2_pd_desain ?? "",
        jml: Number(x.pd2_pd_jml) || 1,
        desainer: x.pd2_desainer ?? "",
        dikerjakan: Number(x.dikerjakan) || 0,
      })),
    };
  } catch {
    toast.error("Gagal memuat Permintaan Desain.");
    goBack();
  }
});

const showReferensiModal = ref(false);
const isLoadingReferensi = ref(false);

const onReferensiSelected = async (item: any) => {
  formData.value.referensi = item.Nomor;
  isLoadingReferensi.value = true;
  try {
    const res = await svc.getDetail(item.Nomor);
    const detail = res.data.data;
    formData.value.namaProject = detail.pd_nama_project ?? "";
    formData.value.keterangan = detail.pd_keterangan ?? "";
    formData.value.customerKode = detail.pd_customer ?? "";
    formData.value.customerNama = detail.pd_customer_nama ?? "";
    if (detail.detail?.length) {
      formData.value.items = detail.detail.map((d: any) => ({
        desain: d.pd2_pd_desain ?? "",
        jml: Number(d.pd2_pd_jml) || 1,
        desainer: "",
        dikerjakan: 0,
      }));
    }
  } catch {
    toast.error("Gagal memuat detail Permintaan Desain referensi.");
  } finally {
    isLoadingReferensi.value = false;
  }
};

const totalJml = computed(() =>
  formData.value.items.reduce((s, r) => s + (Number(r.jml) || 0), 0),
);

const onValidateSave = () => {
  if (!formData.value.namaProject.trim()) {
    toast.error("Nama project wajib diisi.");
    return;
  }
  const validItems = formData.value.items.filter(
    (i) => i.desain.trim() && Number(i.jml) > 0,
  );
  if (!validItems.length) {
    toast.error("Minimal 1 baris detail desain dengan jumlah > 0.");
    return;
  }
  if (isEdit.value) {
    const kurang = validItems.find((i) => i.id && Number(i.jml) < i.dikerjakan);
    if (kurang) {
      toast.error(
        `Jumlah "${kurang.desain}" tidak boleh kurang dari yang sudah dikerjakan (${kurang.dikerjakan}).`,
      );
      return;
    }
  }
  showSaveDialog.value = true;
};
</script>

<template>
  <BaseForm
    title="Permintaan Desain"
    menu-id="184"
    :icon="IconPalette"
    :is-saving="isSaving"
    :item-name="isEdit ? `Perubahan ${editNomor}` : 'Permintaan Desain Baru'"
    v-model:show-save-dialog="showSaveDialog"
    v-model:show-cancel-dialog="showCancelDialog"
    v-model:show-close-dialog="showCloseDialog"
    @validate-save="onValidateSave"
    @confirm-save="executeSave"
    @confirm-cancel="executeCancel"
    @confirm-close="executeClose"
  >
    <template #left-column>
      <div class="desktop-form-section header-section">
        <div class="section-label">Data Permintaan</div>

        <v-text-field
          v-model="formData.tanggal"
          type="date"
          label="Tanggal"
          variant="outlined"
          density="compact"
          class="mb-3"
          hide-details
          :disabled="isEdit"
        />

        <v-text-field
          v-model="formData.namaProject"
          label="Nama Project"
          variant="outlined"
          density="compact"
          class="mb-3"
          hide-details
        />

        <div class="lookup-field mb-3">
          <label class="lookup-label">Customer</label>
          <div class="lookup-input-wrap" @click="showCustomerModal = true">
            <span :class="{ 'text-grey': !formData.customerKode }">
              {{
                formData.customerKode
                  ? `${formData.customerKode} — ${formData.customerNama}`
                  : "Pilih customer (opsional)..."
              }}
            </span>
            <IconSearch :size="15" :stroke-width="1.7" />
          </div>
        </div>

        <v-select
          v-model="formData.jenisPekerjaan"
          :items="['BARU', 'REVISI', 'CEK', 'PLOTTER', 'EDIT']"
          label="Jenis Pekerjaan"
          variant="outlined"
          density="compact"
          class="mb-3"
          hide-details
          :disabled="isEdit"
        />

        <div
          v-if="formData.jenisPekerjaan === 'REVISI'"
          class="lookup-field mb-3"
        >
          <label class="lookup-label">No. PD Asal (referensi)</label>
          <div
            class="lookup-input-wrap"
            @click="!isEdit && (showReferensiModal = true)"
          >
            <span :class="{ 'text-grey': !formData.referensi }">
              {{ formData.referensi || "Pilih Permintaan Desain asal..." }}
            </span>
            <IconSearch :size="15" :stroke-width="1.7" />
          </div>
        </div>

        <v-text-field
          v-model="formData.dateline"
          type="date"
          label="Dateline"
          variant="outlined"
          density="compact"
          class="mb-3"
          hide-details
        />

        <v-select
          v-model="formData.prioritas"
          :items="['NORMAL', 'URGENT', 'TOP URGENT']"
          label="Prioritas"
          variant="outlined"
          density="compact"
          class="mb-3"
          hide-details
          :disabled="isEdit"
        />

        <v-select
          v-model="formData.desainer"
          :items="desainerOptions"
          item-title="Nama"
          item-value="Kode"
          label="Desainer (isi semua baris kosong)"
          variant="outlined"
          density="compact"
          class="mb-3"
          clearable
          :disabled="isEdit"
          hide-details
          @update:model-value="onHeaderDesainerChange"
        />

        <v-textarea
          v-model="formData.keterangan"
          label="Keterangan"
          variant="outlined"
          density="compact"
          rows="3"
          hide-details
        />
      </div>
    </template>

    <template #right-column>
      <div class="desktop-form-section">
        <div class="section-label d-flex align-center justify-space-between">
          <span>Detail Desain</span>
          <v-btn size="x-small" color="primary" variant="tonal" @click="addRow">
            <template #prepend><IconPlus :size="13" /></template>
            Baris
          </v-btn>
        </div>
        <table class="pd-table">
          <thead>
            <tr>
              <th>Nama Desain</th>
              <th style="width: 100px">Jumlah</th>
              <th style="width: 150px">Desainer</th>
              <th style="width: 40px"></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(row, i) in formData.items" :key="i">
              <td>
                <input
                  v-model="row.desain"
                  class="cell-inp"
                  placeholder="Nama desain..."
                />
              </td>
              <td>
                <input
                  type="number"
                  v-model.number="row.jml"
                  class="cell-inp tr"
                  min="1"
                />
              </td>
              <td>
                <select
                  v-model="row.desainer"
                  class="cell-inp"
                  :disabled="row.dikerjakan > 0"
                >
                  <option value="">-</option>
                  <option
                    v-for="d in desainerOptions"
                    :key="d.Kode"
                    :value="d.Kode"
                  >
                    {{ d.Nama }}
                  </option>
                </select>
              </td>
              <td class="tc">
                <button
                  type="button"
                  class="del-btn"
                  :disabled="formData.items.length <= 1 || row.dikerjakan > 0"
                  @click="removeRow(i)"
                >
                  <IconTrash :size="14" />
                </button>
              </td>
            </tr>
          </tbody>
          <tfoot>
            <tr>
              <td class="tr fw">Total Jumlah</td>
              <td class="tr fw">{{ totalJml }}</td>
              <td colspan="2"></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </template>
  </BaseForm>

  <CustomerSearchModal
    v-model="showCustomerModal"
    @selected="onCustomerSelected"
  />
  <PermintaanDesainSearchModal
    v-model="showReferensiModal"
    @selected="onReferensiSelected"
  />
</template>

<style scoped>
.section-label {
  font-size: 11px;
  font-weight: 700;
  color: #1565c0;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  margin-bottom: 10px;
}
.lookup-field {
  display: flex;
  flex-direction: column;
}
.lookup-label {
  font-size: 10px;
  color: #666;
  margin-bottom: 4px;
}
.lookup-input-wrap {
  display: flex;
  align-items: center;
  justify-content: space-between;
  border: 1px solid #ccc;
  border-radius: 4px;
  padding: 8px 10px;
  cursor: pointer;
  font-size: 12px;
  background: white;
}
.lookup-input-wrap:hover {
  border-color: #1565c0;
}
.pd-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
}
.pd-table thead th {
  background: #37474f;
  color: white;
  padding: 6px 8px;
  text-align: left;
  font-weight: 700;
}
.pd-table tbody td {
  padding: 4px 6px;
  border-bottom: 1px solid #eee;
}
.pd-table tfoot td {
  padding: 8px;
  border-top: 2px solid #b0bec5;
}
.cell-inp {
  width: 100%;
  height: 30px;
  border: 1px solid #ccc;
  border-radius: 3px;
  padding: 0 6px;
  font-size: 12px;
  outline: none;
}
.cell-inp:focus {
  border-color: #1565c0;
}
.cell-inp.tr {
  text-align: right;
}
.tc {
  text-align: center;
}
.tr {
  text-align: right;
}
.fw {
  font-weight: 700;
}
.del-btn {
  background: none;
  border: none;
  color: #c62828;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}
.del-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}
</style>
