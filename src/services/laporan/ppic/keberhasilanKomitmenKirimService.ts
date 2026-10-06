import api from "@/services/api";

export const keberhasilanKomitmenKirimService = {
  getBrowse: (params: {
    startDate?: string;
    endDate?: string;
    cabang?: string;
    tipe?: string;
    includeBerjalan?: number;
  }) => api.get("/laporan/ppic/keberhasilan-komitmen-kirim", { params }),
};
