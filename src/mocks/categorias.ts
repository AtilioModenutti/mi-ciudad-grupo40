import type { Categoria } from "../tipos/categoria";

export const categoriasMock: Categoria[] = [
  {
    id: "cat-museos",
    nombre: "Museos y patrimonio",
    icono: "business-outline",
    color: "#8E5A4A",
    orden: 3,
  },
  {
    id: "cat-termas",
    nombre: "Termas",
    icono: "water-outline",
    color: "#2563EB",
    orden: 2,
  },
  {
    id: "cat-playas",
    nombre: "Playas",
    icono: "sunny-outline",
    color: "#0D9488",
    orden: 1,
  },
];
