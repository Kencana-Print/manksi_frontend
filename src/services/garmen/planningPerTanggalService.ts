import api from "@/services/api";

export const planningPerTanggalService = {
  getBrowse: (params: {
    startDate: string;
    endDate: string;
    workshop: string;
    divisi: string;
    spkNomor?: string;
  }) => api.get("/garmen/planning-per-spk/planning-per-tgl", { params }),
};
