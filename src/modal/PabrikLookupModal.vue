<template>
  <v-dialog v-model="internalVisible" max-width="600px" scrollable>
    <v-card title="Pilih Pabrik">
      <v-card-text class="pa-0">
        <v-text-field
          v-model="search"
          prepend-inner-icon="mdi-magnify"
          label="Cari Pabrik..."
          variant="solo-filled"
          hide-details
          flat
        ></v-text-field>
        
        <v-data-table
          :headers="headers"
          :items="items"
          :search="search"
          :loading="loading"
          density="compact"
          hover
          @click:row="(e, { item }) => selectItem(item)"
          height="400px"
        >
          <template #item.MintaObat="{ value }">
            <v-chip size="x-small" :color="value === 'Y' ? 'success' : 'grey'">
              {{ value }}
            </v-chip>
          </template>
        </v-data-table>
      </v-card-text>
      <v-divider></v-divider>
      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn color="grey" variant="text" @click="close">Batal</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { ref, watch, onMounted } from 'vue';
import api from '@/services/api';

const props = defineProps({
  isVisible: Boolean
});
const emit = defineEmits(['close', 'select']);

const internalVisible = ref(props.isVisible);
const search = ref('');
const items = ref([]);
const loading = ref(false);

const headers = [
  { title: 'Kode', key: 'Kode', width: '100px' },
  { title: 'Nama Pabrik', key: 'Nama' },
  { title: 'Alamat', key: 'Alamat', align: 'center' }
];

watch(() => props.isVisible, async (val) => {
  internalVisible.value = val;
  if (val && items.value.length === 0) {
    fetchData();
  }
});

const fetchData = async () => {
  loading.value = true;
  try {
    const response = await api.get('/mmt/lookup-pabrik', {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    });
    items.value = response.data;
  } catch (err) {
    console.error('Gagal memuat pabrik', err);
  } finally {
    loading.value = false;
  }
};

const selectItem = (item) => {
  emit('select', item);
  close();
};

const close = () => {
  emit('close');
};
</script>