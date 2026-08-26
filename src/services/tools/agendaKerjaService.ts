import api from "@/services/api";

export const agendaKerjaService = {
  getBadgeCount: () => api.get("/tools/agenda-kerja/badge-count"),

  getIsPic: () => api.get("/tools/agenda-kerja/is-pic"), // ← baru

  getBrowse: (startDate: string, endDate: string) =>
    api.get("/tools/agenda-kerja", { params: { startDate, endDate } }),

  getById: (nomor: string) =>
    api.get(`/tools/agenda-kerja/${encodeURIComponent(nomor)}`),

  save: (payload: any) => api.post("/tools/agenda-kerja/save", payload),

  updateStatus: (nomor: string, status: string) =>
    api.put(`/tools/agenda-kerja/${encodeURIComponent(nomor)}/status`, {
      status,
    }),

  remove: (nomor: string) =>
    api.delete(`/tools/agenda-kerja/${encodeURIComponent(nomor)}`),
};
