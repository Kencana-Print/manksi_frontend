import api from "@/services/api";

export const poInternalMapFormService = {
  getById: async (nomor: string) => {
    return await api.get(
      `/garmen/po-internal-map/form/${encodeURIComponent(nomor)}`,
    );
  },
  validateMap: async (kodeMap: string, currentPo: string) => {
    return await api.post(`/garmen/po-internal-map/form/validate-map`, {
      kodeMap,
      currentPo,
    });
  },
  save: async (data: any, isNewMode: boolean) => {
    // Parameter isNewMode dikirim ke backend untuk menentukan Insert/Update (bisa juga otomatis dari Nomor)
    return await api.post(`/garmen/po-internal-map/form`, data);
  },
};
