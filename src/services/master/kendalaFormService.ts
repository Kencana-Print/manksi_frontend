import api from "@/services/api";

export const kendalaFormService = {
  getDetail: (nomor: string) =>
    api.get(`/master/kendala-form/${encodeURIComponent(nomor)}`),

  save: (nomor: string | null, formData: FormData) => {
    if (nomor) {
      return api.put(
        `/master/kendala-form/${encodeURIComponent(nomor)}`,
        formData,
        { headers: { "Content-Type": "multipart/form-data" } },
      );
    }
    return api.post("/master/kendala-form/", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },

  resetImages: (nomor: string) =>
    api.post("/master/kendala-form/reset-images", { nomor }),
};
