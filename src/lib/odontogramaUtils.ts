/** Números FDI estándar por cuadrante */
const Q1 = [18, 17, 16, 15, 14, 13, 12, 11];
const Q2 = [21, 22, 23, 24, 25, 26, 27, 28];
const Q3 = [31, 32, 33, 34, 35, 36, 37, 38];
const Q4 = [48, 47, 46, 45, 44, 43, 42, 41];
const Q5 = [55, 54, 53, 52, 51];
const Q6 = [61, 62, 63, 64, 65];
const Q7 = [71, 72, 73, 74, 75];
const Q8 = [85, 84, 83, 82, 81];

/** Genera números FDI ordenados y equitativos según cantidad de dientes */
export function numerosDesdeCantidad(cantidad: number): number[] {
  if (cantidad >= 52) {
    return [...Q1, ...Q2, ...Q3, ...Q4, ...Q5, ...Q6, ...Q7, ...Q8];
  }
  if (cantidad >= 32) {
    return [...Q1, ...Q2, ...Q3, ...Q4];
  }
  const porCuadrante = Math.floor(cantidad / 4);
  const tomar = (arr: number[], n: number) => {
    if (n >= arr.length) return arr;
    const step = arr.length / (n + 1);
    return Array.from({ length: n }, (_, i) => arr[Math.floor((i + 1) * step) - 1]);
  };
  return [
    ...tomar(Q1, porCuadrante),
    ...tomar(Q2, porCuadrante),
    ...tomar(Q3, porCuadrante),
    ...tomar(Q4, porCuadrante),
  ];
}
