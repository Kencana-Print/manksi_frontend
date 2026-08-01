<script setup lang="ts">
import { Handle, Position } from "@vue-flow/core";
import { IconDots } from "@tabler/icons-vue";
import type { NodeProps } from "@vue-flow/core";
import { TYPE_META } from "@/constants/relationshipMapTypes";

interface DocNodeData {
  type: string;
  nomor: string;
  tanggal?: string;
  label?: string;
  jumlah?: number;
  isCenter?: boolean;
  expanded?: boolean;
  isProforma?: boolean;
  jenis?: number | string;
  hasBast?: boolean;
  jumlahJadi?: number;
  cabang?: string;
  filteredBySpk?: string;
  kategori?: string;
  isSelesai?: boolean;
  jurNo?: string;
  cabangAsal?: string;
  cabangTujuan?: string;
  isDiterima?: boolean;
  msiNomor?: string;
  status?: string;
  gdgAsal?: string;
  gdgTujuan?: string;
  approveStatus?: string;
  statusPengiriman?: string;
  hasKuitansi?: boolean;
  noFakturPajak?: string;
  isExportedPpn?: boolean;
  planningDetail?: {
    cutting: {
      spk: string;
      tglJadwal: string;
      wip: number;
      qtyPo: number;
      qtyJadwal: number;
      lineKelompok: string;
    }[];
    sewing: {
      spk: string;
      tglJadwal: string;
      wip: number;
      qtyPo: number;
      qtyJadwal: number;
      lineKelompok: string;
    }[];
    koli: {
      spk: string;
      tglJadwal: string;
      wip: number;
      qtyPo: number;
      qtyJadwal: number;
      lineKelompok: string;
    }[];
  };
}
const props = defineProps<NodeProps<DocNodeData>>();

const emit = defineEmits(["expand", "view-detail"]);

const meta = TYPE_META[props.data.type] || {
  label: props.data.type,
  color: "#555",
};

const numFmt = (v: any) =>
  v || v === 0 ? Number(v).toLocaleString("id-ID") : "";
</script>

<template>
  <div
    class="doc-node"
    :class="{ 'doc-node-center': data.isCenter }"
    :style="{ borderTopColor: meta.color }"
    @click="emit('view-detail', data)"
  >
    <Handle type="target" :position="Position.Left" class="node-handle" />

    <div class="doc-node-type" :style="{ color: meta.color }">
      {{ meta.label }}
      <span
        v-if="data.type === 'INVOICE' && data.isProforma"
        class="doc-node-badge"
      >
        PROFORMA
      </span>
      <span
        v-if="data.type === 'KASBON' && data.isSelesai"
        class="doc-node-badge doc-node-badge-selesai"
      >
        SELESAI
      </span>
      <span
        v-if="data.type === 'MAP' && data.hasBast"
        class="doc-node-badge doc-node-badge-bast"
      >
        BAST
      </span>
      <span
        v-if="data.type === 'MUTASI_OUT' && data.isDiterima"
        class="doc-node-badge doc-node-badge-diterima"
      >
        DITERIMA
      </span>
      <span
        v-if="data.type === 'SJ' && data.approveStatus"
        class="doc-node-badge"
        :class="
          data.approveStatus === 'APPROVED'
            ? 'doc-node-badge-selesai'
            : 'doc-node-badge-batal'
        "
      >
        {{ data.approveStatus }}
      </span>
      <span
        v-if="data.type === 'INVOICE' && data.hasKuitansi"
        class="doc-node-badge doc-node-badge-selesai"
      >
        KUITANSI
      </span>
      <span
        v-if="data.type === 'INVOICE' && data.noFakturPajak"
        class="doc-node-badge"
      >
        FP
      </span>
    </div>
    <div class="doc-node-nomor">{{ data.nomor }}</div>
    <div
      v-if="data.label && data.label !== data.nomor"
      class="doc-node-label"
      :title="data.label"
    >
      {{ data.label }}
    </div>
    <div v-if="data.tanggal" class="doc-node-tanggal">{{ data.tanggal }}</div>
    <div v-if="data.jumlah !== undefined" class="doc-node-jumlah">
      {{ numFmt(data.jumlah) }}
    </div>
    <div
      v-if="
        data.type === 'MAP' && data.hasBast && data.jumlahJadi !== undefined
      "
      class="doc-node-bast-info"
    >
      Jadi: {{ numFmt(data.jumlahJadi) }}
    </div>
    <div
      v-if="data.type === 'PLANNING_PPIC' && data.planningDetail"
      class="doc-node-plan-info"
    >
      C:{{ data.planningDetail.cutting.length }} S:{{
        data.planningDetail.sewing.length
      }}
      K:{{ data.planningDetail.koli.length }}
      <span v-if="data.filteredBySpk" class="doc-node-plan-filter"
        >(khusus SPK ini)</span
      >
    </div>
    <span
      v-if="
        (data.type === 'PERMINTAAN_GARMEN' ||
          data.type === 'REALISASI_GARMEN') &&
        data.kategori
      "
      class="doc-node-badge doc-node-badge-kategori"
    >
      {{ data.kategori }}
    </span>
    <span
      v-if="data.type === 'INVOICE' && data.hasKuitansi"
      class="doc-node-badge doc-node-badge-selesai"
    >
      KUITANSI
    </span>
    <span
      v-if="data.type === 'INVOICE' && data.noFakturPajak"
      class="doc-node-badge"
    >
      FP
    </span>
    <div
      v-if="data.type === 'MUTASI_OUT' && data.cabangAsal && data.cabangTujuan"
      class="doc-node-mutasi-info"
    >
      {{ data.cabangAsal }} → {{ data.cabangTujuan }}
    </div>
    <div
      v-if="data.type === 'MUTASI_PRODUKSI' && data.gdgAsal && data.gdgTujuan"
      class="doc-node-mutasi-info"
    >
      {{ data.gdgAsal }} → {{ data.gdgTujuan }}
    </div>
    <div
      v-if="data.type === 'SJ' && data.statusPengiriman"
      class="doc-node-mutasi-info"
    >
      {{ data.statusPengiriman }}
    </div>

    <button
      v-if="!data.expanded"
      class="doc-node-expand"
      title="Lihat relasi"
      @click.stop="emit('expand', { type: data.type, nomor: data.nomor })"
    >
      <IconDots :size="12" :stroke-width="2.5" />
    </button>

    <Handle type="source" :position="Position.Right" class="node-handle" />
  </div>
</template>

<style scoped>
.doc-node {
  width: 170px;
  background: white;
  border: 1px solid #d0d0d0;
  border-top: 3px solid #555;
  border-radius: 4px;
  padding: 8px 10px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12);
  position: relative;
  font-family: "Segoe UI", system-ui, sans-serif;
  cursor: pointer;
}
.doc-node-center {
  border-color: #f1c40f;
  border-width: 2px;
  background: #fffde7;
  box-shadow: 0 2px 8px rgba(241, 196, 15, 0.4);
}
.doc-node-type {
  font-size: 9px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  display: flex;
  align-items: center;
  gap: 4px;
}
.doc-node-badge {
  font-size: 8px;
  font-weight: 700;
  color: white;
  background: #e67e22;
  padding: 1px 4px;
  border-radius: 3px;
  letter-spacing: 0;
}
.doc-node-nomor {
  font-size: 12px;
  font-weight: 700;
  color: #1a1a1a;
  margin-top: 2px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.doc-node-label {
  font-size: 10px;
  color: #666;
  margin-top: 2px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.doc-node-tanggal {
  font-size: 10px;
  color: #999;
  margin-top: 3px;
}
.doc-node-jumlah {
  font-size: 11px;
  font-weight: 600;
  color: #1565c0;
  margin-top: 2px;
}
.doc-node-expand {
  position: absolute;
  right: -8px;
  bottom: -8px;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #e0e0e0;
  border: 1px solid #bbb;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: #555;
}
.doc-node-expand:hover {
  background: #1565c0;
  border-color: #1565c0;
  color: white;
}
.node-handle {
  opacity: 0;
}
.doc-node-badge-bast {
  background: #27ae60;
}
.doc-node-bast-info {
  font-size: 10px;
  font-weight: 600;
  color: #27ae60;
  margin-top: 2px;
}
.doc-node-plan-info {
  font-size: 10px;
  font-weight: 600;
  color: #8e44ad;
  margin-top: 2px;
}
.doc-node-plan-filter {
  display: block;
  font-size: 8px;
  font-weight: 400;
  color: #999;
  font-style: italic;
}
.doc-node-badge-kategori {
  background: #935116;
}
.doc-node-badge-selesai {
  background: #1e8449;
}
.doc-node-badge-diterima {
  background: #b9770e;
}
.doc-node-mutasi-info {
  font-size: 10px;
  color: #999;
  margin-top: 2px;
}
.doc-node-badge-batal {
  background: #922b21;
}
</style>
