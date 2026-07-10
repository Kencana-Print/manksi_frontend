// src/composables/useForm.ts
import { ref, computed, onMounted, nextTick } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useToast } from "vue-toastification";
import { useAuthStore } from "@/stores/authStore";
import type { AxiosError } from "axios";

interface UseFormOptions<T> {
  menuId: string;
  initialData: T;
  fetchApi?: () => Promise<T>;
  submitApi: (data: T) => Promise<unknown>;
  onSuccessRoute?: string;
  onSuccess?: (response: unknown) => void;
  immediate?: boolean;
}

export function useForm<
  T,
  P extends Record<string, any> = Record<string, string>,
>(options: UseFormOptions<T>) {
  const route = useRoute();
  const params = route.params as P;
  const router = useRouter();
  const toast = useToast();
  const authStore = useAuthStore();

  const isEditMode = computed(
    () =>
      !!(
        route.params.kode ||
        route.params.nomor ||
        route.query.nomor ||
        route.query.kode
      ),
  );

  const isLoading = ref(false);
  const isSaving = ref(false);
  const showSaveDialog = ref(false);
  const showCancelDialog = ref(false);
  const showCloseDialog = ref(false);

  // Form Data reaktif
  const formData = ref<T>({ ...options.initialData });

  const canSave = computed(() => {
    const permission = isEditMode.value ? "edit" : "insert";
    return authStore.can(options.menuId, permission);
  });

  const goBack = () => {
    if (options.onSuccessRoute) {
      router.push(options.onSuccessRoute);
    } else if (route.meta.browseRoute) {
      router.push({ name: route.meta.browseRoute as string });
    } else {
      window.history.length > 1 ? router.back() : router.push("/");
    }
  };

  const originalData = ref<T>(JSON.parse(JSON.stringify(options.initialData)));

  const fetchData = async () => {
    if (!options.fetchApi) return;
    isLoading.value = true;
    try {
      const data = await options.fetchApi();
      formData.value = data;
      originalData.value = JSON.parse(JSON.stringify(data)); // snapshot setelah fetch
    } catch (e) {
      console.error("Error pada useForm fetchData:", e);
      toast.error("Gagal memuat data form.");
      goBack();
    } finally {
      isLoading.value = false;
    }
  };

  const executeSave = async () => {
    if (isSaving.value) return;
    isSaving.value = true;
    try {
      const response = await options.submitApi(formData.value as T);
      showSaveDialog.value = false;

      if (options.onSuccess) {
        await nextTick();
        options.onSuccess(response);
      } else {
        goBack();
      }
    } catch (e: unknown) {
      const err = e as AxiosError<any>;
      toast.error(err.response?.data?.message || "Gagal menyimpan data.");
    } finally {
      isSaving.value = false;
    }
  };

  const executeCancel = () => {
    showCancelDialog.value = false;
    if (isEditMode.value) {
      formData.value = JSON.parse(JSON.stringify(originalData.value));
    } else {
      // Deep copy initialData supaya tidak ada referensi tersisa
      formData.value = JSON.parse(JSON.stringify(options.initialData));
    }
  };

  const executeClose = () => {
    // <--- TAMBAH INI
    showCloseDialog.value = false;
    goBack();
  };

  // --- TAMBAHKAN BLOK INI ---
  onMounted(() => {
    // Jalankan otomatis JIKA:
    // 1. Opsi immediate tidak di-set ke false
    // 2. Form sedang dalam mode Edit (ada parameter kode/nomor di URL)
    // 3. Fungsi fetchApi disediakan di komponen
    if (options.immediate !== false && isEditMode.value && options.fetchApi) {
      fetchData();
    }
  });

  return {
    isEditMode,
    isLoading,
    isSaving,
    showSaveDialog,
    showCancelDialog,
    showCloseDialog,
    formData,
    canSave,
    goBack,
    fetchData,
    executeSave,
    executeCancel,
    executeClose,
    params,
    originalData,
  };
}
