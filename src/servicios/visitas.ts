import Storage from "expo-sqlite/kv-store";
import type { Visita } from "../tipos/visita";

const API_BASE_URL = "https://api-miciudad.lansdev.com.ar";
const CLAVE_VISITAS = "mi-ciudad-visitas";

type VisitaApi = {
  id: string;
  lugarId: string;
  fechaHora: string;
  origen: "qr" | "gps" | "manual";
  fotoUri: string | null;
  nota: string | null;
  sincronizada: boolean;
};

function convertirVisitaParaApi(visita: Visita): VisitaApi {
  return {
    id: visita.id,
    lugarId: visita.lugarId,
    fechaHora: visita.fecha,
    origen: visita.metodo === "proximidad" ? "gps" : visita.metodo,
    fotoUri: null,
    nota: visita.nota,
    sincronizada: visita.sincronizada,
  };
}

type RespuestaArchivoApi = {
  datos?: {
    url?: string;
  };
};

async function subirFotoAApi(fotoUri: string, token: string): Promise<string> {
  const nombreArchivo =
    fotoUri.split("/").pop() ?? `foto-visita-${Date.now()}.jpg`;

  const extension = nombreArchivo.split(".").pop()?.toLowerCase();

  const tipo =
    extension === "png"
      ? "image/png"
      : extension === "webp"
        ? "image/webp"
        : "image/jpeg";

  const formulario = new FormData();

  formulario.append("archivo", {
    uri: fotoUri,
    name: nombreArchivo,
    type: tipo,
  } as any);

  const respuesta = await fetch(`${API_BASE_URL}/archivos`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formulario,
  });

  if (!respuesta.ok) {
    throw new Error(
      `No se pudo subir la fotografía. Código: ${respuesta.status}`,
    );
  }

  const resultado = (await respuesta.json()) as RespuestaArchivoApi;
  const url = resultado.datos?.url;

  if (!url) {
    throw new Error("La API no devolvió la URL de la fotografía.");
  }

  return url;
}

async function asociarFotoAVisitaApi(
  visitaId: string,
  fotoUri: string,
  token: string,
): Promise<void> {
  const respuesta = await fetch(
    `${API_BASE_URL}/yo/visitas/${encodeURIComponent(visitaId)}`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        fotoUri,
      }),
    },
  );

  if (!respuesta.ok) {
    throw new Error(
      `No se pudo asociar la fotografía a la visita. Código: ${respuesta.status}`,
    );
  }
}

export async function obtenerVisitas(): Promise<Visita[]> {
  const guardadas = await Storage.getItem(CLAVE_VISITAS);

  if (!guardadas) {
    return [];
  }

  const datos: unknown = JSON.parse(guardadas);

  if (!Array.isArray(datos)) {
    throw new Error("Las visitas guardadas no son válidas.");
  }

  return datos as Visita[];
}

export async function guardarVisitas(visitas: Visita[]): Promise<void> {
  await Storage.setItem(CLAVE_VISITAS, JSON.stringify(visitas));
}

export async function sincronizarVisitasPendientes(
  token: string,
): Promise<void> {
  const visitas = await obtenerVisitas();
  let huboCambios = false;

  const actualizadas = await Promise.all(
    visitas.map(async (visita) => {
      if (visita.sincronizada) {
        return visita;
      }

      const respuesta = await fetch(`${API_BASE_URL}/yo/visitas`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(convertirVisitaParaApi(visita)),
      });

      if (respuesta.status !== 200 && respuesta.status !== 201) {
        return visita;
      }

      if (visita.fotos.length > 0) {
        try {
          const fotoLocal = visita.fotos[0];

          const fotoUrl = await subirFotoAApi(fotoLocal, token);

          await asociarFotoAVisitaApi(visita.id, fotoUrl, token);
        } catch (error) {
          console.error(
            `No se pudo sincronizar la fotografía de la visita ${visita.id}:`,
            error,
          );

          return visita;
        }
      }

      huboCambios = true;

      return {
        ...visita,
        sincronizada: true,
      };
    }),
  );

  if (huboCambios) {
    await guardarVisitas(actualizadas);
  }
}
