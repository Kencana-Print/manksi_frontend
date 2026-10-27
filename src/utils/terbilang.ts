const SATUAN: string[] = [
  "",
  "satu",
  "dua",
  "tiga",
  "empat",
  "lima",
  "enam",
  "tujuh",
  "delapan",
  "sembilan",
  "sepuluh",
  "sebelas",
  "dua belas",
  "tiga belas",
  "empat belas",
  "lima belas",
  "enam belas",
  "tujuh belas",
  "delapan belas",
  "sembilan belas",
];

const konversi = (num: number): string => {
  if (num === 0) return "";
  if (num < 20) return `${SATUAN[num]} `;
  if (num < 100)
    return `${SATUAN[Math.floor(num / 10)]} puluh ${konversi(num % 10)}`;
  if (num < 200) return `seratus ${konversi(num - 100)}`;
  if (num < 1000)
    return `${SATUAN[Math.floor(num / 100)]} ratus ${konversi(num % 100)}`;
  if (num < 2000) return `seribu ${konversi(num - 1000)}`;
  if (num < 1_000_000)
    return `${konversi(Math.floor(num / 1000))}ribu ${konversi(num % 1000)}`;
  if (num < 1_000_000_000)
    return `${konversi(Math.floor(num / 1_000_000))}juta ${konversi(num % 1_000_000)}`;
  if (num < 1_000_000_000_000)
    return `${konversi(Math.floor(num / 1_000_000_000))}milyar ${konversi(num % 1_000_000_000)}`;
  return `${konversi(Math.floor(num / 1_000_000_000_000))}triliun ${konversi(num % 1_000_000_000_000)}`;
};

// Dibulatkan ke rupiah penuh. Pecahan tidak dibacakan.
export const terbilang = (nilai: number): string => {
  const n = Math.round(Number(nilai) || 0);
  if (n === 0) return "NOL";
  if (n < 0) return `MINUS ${terbilang(Math.abs(n))}`;
  return konversi(n).replace(/\s+/g, " ").trim().toUpperCase();
};
