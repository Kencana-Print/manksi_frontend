import { useRegisterSW } from "virtual:pwa-register/vue";

export function usePwaUpdate() {
  const { needRefresh, offlineReady, updateServiceWorker } = useRegisterSW({
    onRegisteredSW(swUrl, registration) {
      // cek update tiap 60 menit, cocok untuk app desktop yang dibuka lama
      registration &&
        setInterval(
          () => {
            registration.update();
          },
          60 * 60 * 1000,
        );
    },
  });

  // Halaman hasil Ctrl+Shift+R tidak dikontrol service worker, jadi event
  // "controlling" yang biasanya memicu reload tidak terpanggil. Reload dipaksa
  // setelah worker baru diaktifkan supaya tombol Update selalu berefek.
  const aktifkanUpdate = async (reloadPage = true) => {
    await updateServiceWorker(reloadPage);
    if (reloadPage) setTimeout(() => window.location.reload(), 1500);
  };

  return { needRefresh, offlineReady, updateServiceWorker: aktifkanUpdate };
}
