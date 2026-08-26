import api from "@/services/api";

export const agendaPicService = {
  getList: () => api.get("/tools/agenda-pic"),

  getCandidates: () => api.get("/tools/agenda-pic/candidates"),

  add: (userKode: string) => api.post("/tools/agenda-pic", { userKode }),

  remove: (userKode: string) =>
    api.delete(`/tools/agenda-pic/${encodeURIComponent(userKode)}`),
};
