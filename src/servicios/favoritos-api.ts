import {
  ErrorHttp,
  type RespuestaLista,
  type RespuestaUno,
} from "@/servicios/api";

export type FavoritoApi = {
  id: string;
  usuarioId: string;
  lugarId: string;
  creadoEn: string;
};

async function solicitarFavoritos<T>(
  token: string,
  ruta: string,
  metodo: "GET" | "PUT" | "DELETE",
): Promise<T | null> {
  const base = process.env.EXPO_PUBLIC_API_URL?.replace(/\/+$/, "");

  if (!base) {
    throw new Error("Falta configurar EXPO_PUBLIC_API_URL.");
  }

  if (!token) {
    throw new Error("No hay una sesión activa. Ingresá nuevamente.");
  }

  let respuesta: Response;

  try {
    respuesta = await fetch(`${base}${ruta}`, {
      method: metodo,
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  } catch {
    throw new Error("Sin conexión con la API. Intentá nuevamente.");
  }

  if (!respuesta.ok) {
    let mensaje = `La API devolvió el error ${respuesta.status}.`;

    try {
      const contenido: { error?: { mensaje?: string } } =
        await respuesta.json();

      if (typeof contenido.error?.mensaje === "string") {
        mensaje = contenido.error.mensaje;
      }
    } catch {}

    throw new ErrorHttp(respuesta.status, mensaje);
  }

  if (respuesta.status === 204) {
    return null;
  }

  try {
    return (await respuesta.json()) as T;
  } catch {
    throw new Error("La API devolvió una respuesta no válida.");
  }
}

export async function obtenerFavoritosDeLaCuenta(
  token: string,
): Promise<string[]> {
  const ids: string[] = [];
  const porPagina = 100;
  let pagina = 1;

  while (true) {
    const respuesta = await solicitarFavoritos<RespuestaLista<FavoritoApi>>(
      token,
      `/yo/favoritos?pagina=${pagina}&porPagina=${porPagina}`,
      "GET",
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
  await solicitarFavoritos<RespuestaUno<FavoritoApi>>(
    token,
    `/yo/favoritos/${encodeURIComponent(lugarId)}`,
    "PUT",
  );
}

export async function quitarFavoritoDeLaCuenta(
  lugarId: string,
  token: string,
): Promise<void> {
  await solicitarFavoritos<never>(
    token,
    `/yo/favoritos/${encodeURIComponent(lugarId)}`,
    "DELETE",
  );
}
