import { categoriasMock } from "../mocks/categorias";

export async function obtenerCategorias() {
  return {
    datos: categoriasMock,
    meta: {
      total: categoriasMock.length,
      pagina: 1,
      porPagina: 20,
    },
  };
}
