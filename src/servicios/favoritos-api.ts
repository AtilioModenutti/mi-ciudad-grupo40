import {
  solicitarApiConSesion,
  type RespuestaLista,
  type RespuestaUno,
} from "@/servicios/api";

export type FavoritoApi = {
  id: string;
  usuarioId: string;
  lugarId: string;
  creadoEn: string;
};

export async function obtenerFavoritosDeLaCuenta(
  token: string,
): Promise<string[]> {
  const ids: string[] = [];
  const porPagina = 100;
  let pagina = 1;

  while (true) {
    const respuesta = await solicitarApiConSesion<RespuestaLista<FavoritoApi>>(
      `/yo/favoritos?pagina=${pagina}&porPagina=${porPagina}`,
      token,
    );

    if (
      !respuesta ||
      !Array.isArray(respuesta.datos) ||
      !respuesta.datos.every(
        (favorito) => typeof favorito.lugarId === "string",
      ) ||
      typeof respuesta.meta?.total !== "number"
    ) {
      throw new Error("La API devolvió favoritos inesperados.");
    }

    ids.push(...respuesta.datos.map((favorito) => favorito.lugarId));

    if (ids.length >= respuesta.meta.total) {
      return ids;
    }

    if (respuesta.datos.length === 0) {
      throw new Error("No se pudo completar la lista de favoritos.");
    }

    pagina += 1;
  }
}

export async function marcarFavoritoEnLaCuenta(
  lugarId: string,
  token: string,
): Promise<void> {
  await solicitarApiConSesion<RespuestaUno<FavoritoApi>>(
    `/yo/favoritos/${encodeURIComponent(lugarId)}`,
    token,
    "PUT",
  );
}

export async function quitarFavoritoDeLaCuenta(
  lugarId: string,
  token: string,
): Promise<void> {
  await solicitarApiConSesion<never>(
    `/yo/favoritos/${encodeURIComponent(lugarId)}`,
    token,
    "DELETE",
  );
}
