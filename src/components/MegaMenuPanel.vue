<script setup lang="ts">
import { computed, ref, watch } from "vue";
import type { NavItem } from "@/config/menuItems";

interface Baris {
  jenis: "sub" | "garis" | "link";
  item: NavItem;
}

interface Blok {
  judul: string;
  baris: Baris[];
}

const props = defineProps<{
  bagian: NavItem[];
  rail: boolean;
  badge: (item: NavItem) => number;
  titik: (item: NavItem) => boolean;
}>();

const emit = defineEmits<{ (e: "pilih", item: NavItem): void }>();

const aktif = ref(0);
watch(
  () => props.bagian.length,
  (n) => {
    if (aktif.value >= n) aktif.value = 0;
  },
);

const pakaiRail = computed(() => props.rail && props.bagian.length > 1);

// Ratakan isi satu blok: folder bersarang jadi sub-judul, divider jadi garis
const ratakan = (isi: NavItem[]): Baris[] => {
  const hasil: Baris[] = [];
  for (const it of isi) {
    if (it.divider) {
      hasil.push({ jenis: "garis", item: it });
    } else if (it.subItems?.length) {
      hasil.push({ jenis: "sub", item: it });
      hasil.push(...ratakan(it.subItems));
    } else {
      hasil.push({ jenis: "link", item: it });
    }
  }
  return hasil;
};

// Pecah satu bagian menjadi blok kolom: tiap folder = satu blok; item lepas
// dipisah divider menjadi blok tanpa folder (blok lepas pertama memakai
// judul bagian).
const susunBlok = (bagian: NavItem): Blok[] => {
  const hasil: Blok[] = [];
  let lepas: NavItem[] = [];
  let lepasPertama = true;

  const tutupLepas = () => {
    if (lepas.length === 0) return;
    hasil.push({
      judul: lepasPertama ? (bagian.title ?? "") : "",
      baris: ratakan(lepas),
    });
    lepasPertama = false;
    lepas = [];
  };

  for (const it of bagian.subItems ?? []) {
    if (it.divider) {
      tutupLepas();
    } else if (it.subItems?.length) {
      tutupLepas();
      hasil.push({ judul: it.title ?? "", baris: ratakan(it.subItems) });
    } else {
      lepas.push(it);
    }
  }
  tutupLepas();
  return hasil;
};

const grupTampil = computed<NavItem[]>(() => {
  if (!pakaiRail.value) return props.bagian;
  const g = props.bagian[Math.min(aktif.value, props.bagian.length - 1)];
  return g ? [g] : [];
});

const blok = computed<Blok[]>(() => grupTampil.value.flatMap(susunBlok));

// Jumlah kolom (maks. 4) dibuat tetap di mode rail supaya lebar panel
// tidak berubah saat berganti modul.
const kolom = computed(() => {
  const jumlah = pakaiRail.value
    ? Math.max(...props.bagian.map((g) => susunBlok(g).length))
    : blok.value.length;
  return Math.min(Math.max(jumlah, 1), 4);
});
</script>

<template>
  <v-card :class="['mp', { 'mp-tinggi': pakaiRail }]" elevation="6">
    <div v-if="pakaiRail" class="mp-rail">
      <button
        v-for="(g, i) in bagian"
        :key="g.title"
        type="button"
        class="mp-rail-btn"
        :class="{ aktif: i === aktif }"
        @click="aktif = i"
      >
        <component :is="g.icon" :size="18" :stroke-width="1.5" class="mp-ic" />
        <span class="mp-rail-teks">{{ g.title }}</span>
        <span v-if="titik(g)" class="mp-titik" />
      </button>
    </div>

    <div class="mp-body">
      <div class="mp-kolom" :style="{ '--kol': kolom }">
        <section v-for="(b, bi) in blok" :key="bi" class="mp-blok">
          <div v-if="b.judul" class="mp-judul">{{ b.judul }}</div>
          <template v-for="(r, ri) in b.baris" :key="ri">
            <hr v-if="r.jenis === 'garis'" class="mp-garis" />
            <div v-else-if="r.jenis === 'sub'" class="mp-sub">
              {{ r.item.title }}
            </div>
            <RouterLink
              v-else-if="r.item.to"
              :to="r.item.to"
              class="mp-link"
              @click="emit('pilih', r.item)"
            >
              <span>{{ r.item.title }}</span>
              <span v-if="badge(r.item) > 0" class="mp-badge">{{
                badge(r.item) > 99 ? "99+" : badge(r.item)
              }}</span>
            </RouterLink>
            <button
              v-else
              type="button"
              class="mp-link"
              @click="emit('pilih', r.item)"
            >
              <span>{{ r.item.title }}</span>
              <span v-if="badge(r.item) > 0" class="mp-badge">{{
                badge(r.item) > 99 ? "99+" : badge(r.item)
              }}</span>
            </button>
          </template>
        </section>
      </div>
    </div>
  </v-card>
</template>

<style scoped>
.mp {
  display: flex;
  border-radius: 12px;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  background: rgba(var(--v-theme-surface), 0.98) !important;
  backdrop-filter: blur(16px);
  max-width: calc(100vw - 24px);
}
/* Mode rail: panel dibuat lebih tinggi supaya terasa lega */
.mp-tinggi {
  min-height: min(64vh, 640px);
}
.mp-rail {
  flex: 0 0 212px;
  padding: 12px 10px;
  border-right: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  max-height: calc(100vh - 80px);
  overflow-y: auto;
}
.mp-rail-btn {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 10px 12px;
  margin-bottom: 2px;
  border: none;
  background: transparent;
  border-radius: 8px;
  cursor: pointer;
  font-family: inherit;
  font-size: 0.95rem;
  text-align: left;
  color: rgb(var(--v-theme-on-surface));
}
.mp-rail-btn:hover {
  background: rgba(var(--v-theme-primary), 0.06);
}
.mp-rail-btn.aktif {
  background: rgba(var(--v-theme-primary), 0.1);
  color: rgb(var(--v-theme-primary));
  font-weight: 600;
}
.mp-ic {
  opacity: 0.6;
  flex-shrink: 0;
}
.mp-rail-teks {
  flex: 1;
}
.mp-titik {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #e53935;
  flex-shrink: 0;
}
.mp-body {
  flex: 1 1 auto;
  min-width: 0;
  padding: 18px 26px;
  max-height: calc(100vh - 80px);
  overflow-y: auto;
}
/* Tinggi kolom dibiarkan auto (batas tinggi + scroll ada di .mp-body),
   kalau tidak kolom berlebih akan meluber ke samping. */
.mp-kolom {
  column-count: var(--kol);
  column-gap: 36px;
  width: calc(var(--kol) * 250px + (var(--kol) - 1) * 36px);
  max-width: 100%;
}
.mp-blok {
  break-inside: avoid;
  margin-bottom: 22px;
}
.mp-judul {
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: rgb(var(--v-theme-primary));
  padding: 0 10px;
  margin-bottom: 6px;
}
.mp-sub {
  font-size: 0.82rem;
  font-weight: 600;
  color: rgba(var(--v-theme-on-surface), 0.55);
  padding: 0 10px;
  margin: 10px 0 3px;
}
.mp-garis {
  border: none;
  border-top: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  margin: 7px 10px;
}
.mp-link {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  width: 100%;
  padding: 7px 10px;
  border: none;
  background: transparent;
  border-radius: 6px;
  cursor: pointer;
  font-family: inherit;
  font-size: 0.95rem;
  line-height: 1.35;
  text-align: left;
  text-decoration: none;
  color: rgb(var(--v-theme-on-surface));
}
.mp-link:hover {
  background: rgba(var(--v-theme-primary), 0.08);
  color: rgb(var(--v-theme-primary));
}
.mp-link.router-link-exact-active {
  color: rgb(var(--v-theme-primary));
  font-weight: 600;
}
.mp-badge {
  font-size: 11px;
  font-weight: 700;
  background: #e53935;
  color: white;
  padding: 1px 7px;
  border-radius: 9px;
  min-width: 20px;
  text-align: center;
  line-height: 18px;
  height: 18px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
</style>
