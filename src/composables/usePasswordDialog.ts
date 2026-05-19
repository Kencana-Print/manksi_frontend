import { ref } from "vue";

const isOpen = ref(false);

export function usePasswordDialog() {
  const openPasswordDialog = () => {
    isOpen.value = true;
  };

  const closePasswordDialog = () => {
    isOpen.value = false;
  };

  return {
    isOpen,
    openPasswordDialog,
    closePasswordDialog,
  };
}
