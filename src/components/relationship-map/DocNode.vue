<script setup lang="ts">
import { Handle, Position } from "@vue-flow/core";
import { IconDots, IconLock, IconMinus } from "@tabler/icons-vue";
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
  collapsible?: boolean;
  locked?: boolean;
  statusPpic?: string;
  statusKlien?: string;
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
  };
}
const props = defineProps<
  NodeProps<DocNodeData> & { dimmed?: boolean; loading?: boolean }
>();

const emit = defineEmits(["expand", "collapse", "view-detail"]);

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
    :class="{
      'doc-node-center': data.isCenter,
      'doc-node-locked': data.locked,
      'doc-node-dim': dimmed,
    }"
    :style="{ borderTopColor: data.locked ? '#9e9e9e' : meta.color }"
    @click="emit('view-detail', data)"
  >
    <Handle type="target" :position="Position.Left" class="node-handle" />

    <div
      class="doc-node-type"
      :style="{ color: data.locked ? '#9e9e9e' : meta.color }"
    >
      {{ meta.label }}
      <IconLock v-if="data.locked" :size="11" :stroke-width="2" />
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
        v-if="
          (data.type === 'MUTASI_OUT' ||
            data.type === 'MAKLON' ||
            data.type === 'SJ_KELUAR_MAKLON') &&
          data.cabangAsal &&
          data.cabangTujuan
        "
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
    <div v-if="data.locked" class="doc-node-locked-note">Tanpa hak akses</div>
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
      <span v-if="data.filteredBySpk" class="doc-node-plan-filter"
        >(khusus SPK ini)</span
      >
    </div>
    <span
      v-if="
        (data.type === 'PERMINTAAN_GARMEN' ||
          data.type === 'REALISASI_GARMEN' ||
          data.type === 'COMPLAIN_CUSTOMER' ||
          data.type === 'BAP_PRODUKSI') &&
        data.kategori
      "
      class="doc-node-badge doc-node-badge-kategori"
    >
      {{ data.kategori }}
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
    <div
      v-if="
        (data.type === 'PRA_ORDER' ||
          data.type === 'PERMINTAAN_DESAIN' ||
          data.type === 'LHK_DESAIN' ||
          data.type === 'REKAP_PEMBAYARAN' ||
          data.type === 'QC_BAHAN' ||
          data.type === 'TINDAK_LANJUT_QC' ||
          data.type === 'MAKLON' ||
          data.type === 'PENGAJUAN_UANG_MUKA') &&
        data.status
      "
      class="doc-node-mutasi-info"
    >
      {{ data.status
      }}<template v-if="data.statusKlien"> · {{ data.statusKlien }}</template>
    </div>
    <div
      v-if="data.type === 'KONFIRMASI_PRA_ORDER' && data.statusPpic"
      class="doc-node-mutasi-info"
    >
      PPIC: {{ data.statusPpic }}
    </div>

    <button
      v-if="!data.expanded && !data.locked"
      class="doc-node-expand"
      title="Lihat relasi"
      :disabled="loading"
      @click.stop="emit('expand', { type: data.type, nomor: data.nomor })"
    >
      <v-progress-circular v-if="loading" indeterminate :size="12" :width="2" />
      <IconDots v-else :size="14" :stroke-width="2.5" />
    </button>

    <Handle type="source" :position="Position.Right" class="node-handle" />

    <button
      v-if="data.expanded && data.collapsible && !data.locked"
      class="doc-node-expand"
      title="Sembunyikan turunan"
      @click.stop="emit('collapse', { type: data.type, nomor: data.nomor })"
    >
      <IconMinus :size="14" :stroke-width="2.5" />
    </button>
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
  font-size: 10px;
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
  right: -10px;
  bottom: -10px;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: #e0e0e0;
  border: 1px solid #bbb;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: #555;
}
.doc-node-expand:disabled {
  cursor: progress;
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
.doc-node-locked {
  background: #f3f3f3;
  border-style: dashed;
  border-top-style: solid;
}
.doc-node-locked .doc-node-nomor {
  color: #757575;
}
.doc-node-locked-note {
  font-size: 10px;
  font-style: italic;
  color: #9e9e9e;
  margin-top: 3px;
}
.doc-node {
  transition: opacity 0.15s;
}
.doc-node-dim {
  opacity: 0.25;
}
</style>
