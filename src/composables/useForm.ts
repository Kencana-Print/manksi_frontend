// src/composables/useForm.ts
import { ref, computed, onMounted, onActivated, nextTick } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useToast } from "vue-toastification";
import { useAuthStore } from "@/stores/authStore";
import { useTabsStore } from "@/stores/tabsStore";
import type { AxiosError } from "axios";

interface UseFormOptions<T> {
  menuId: string;
  initialData: T;
  fetchApi?: () => Promise<T>;
  submitApi: (data: T) => Promise<unknown>;
  onSuccessRoute?: string;
  onSuccess?: (response: unknown) => void;
  immediate?: boolean;
  onFormReset?: () => void;
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
  const tabsStore = useTabsStore();

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
    const currentPath = route.path;

    const target = options.onSuccessRoute
      ? options.onSuccessRoute
      : route.meta.browseRoute
        ? { name: route.meta.browseRoute as string }
        : window.history.length > 1
          ? undefined
          : "/";

    // Selalu kembalikan Promise, meskipun router.back() aslinya void —
    // supaya .then()/.catch() di bawah bisa dipakai konsisten tanpa
    // TS mengeluh soal union type void | Promise<...>.
    const navigate = (): Promise<unknown> => {
      if (target === undefined) {
        router.back();
        return Promise.resolve();
      }
      return router.push(target);
    };

    navigate()
      .catch(() => {})
      .then(() => {
        tabsStore.closeTab(currentPath);
      });
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
    showCloseDialog.value = false;
    goBack();
  };

  onMounted(() => {
    // Jalankan otomatis JIKA:
    // 1. Opsi immediate tidak di-set ke false
    // 2. Form sedang dalam mode Edit (ada parameter kode/nomor di URL)
    // 3. Fungsi fetchApi disediakan di komponen
    if (options.immediate !== false && isEditMode.value && options.fetchApi) {
      fetchData();
    }
  });

  onActivated(() => {
    if (isEditMode.value) return;
    const currentTab = tabsStore.tabs.find((t) => t.id === route.path);
    if (currentTab?.needsReset) {
      formData.value = JSON.parse(JSON.stringify(options.initialData));
      originalData.value = JSON.parse(JSON.stringify(options.initialData));
      currentTab.needsReset = false; // konsumsi flag, sekali pakai
      options.onFormReset?.();
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
