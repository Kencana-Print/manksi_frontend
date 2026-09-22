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

  return { needRefresh, offlineReady, updateServiceWorker };
}
