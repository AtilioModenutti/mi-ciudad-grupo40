export interface RespuestaLista<T> {
  datos: T[];
  meta: {
    total: number;
    pagina: number;
    porPagina: number;
  };
}

export interface RespuestaUno<T> {
  datos: T;
  meta: null;
}

interface RespuestaError {
  error?: {
    codigo?: string;
    mensaje?: string;
  };
}

export class ErrorApi extends Error {
  constructor(
    public readonly estadoHttp: number,
    public readonly codigo: string,
    mensaje: string,
  ) {
    super(mensaje);
    this.name = "ErrorApi";
  }
}

export async function consultarApi<T>(ruta: string): Promise<T> {
  const apiUrl = process.env.EXPO_PUBLIC_API_URL?.trim().replace(/\/+$/, "");

  if (!apiUrl) {
    throw new Error("Falta configurar EXPO_PUBLIC_API_URL.");
  }

  let respuesta: Response;

  try {
    respuesta = await fetch(`${apiUrl}${ruta}`, {
      headers: {
        Accept: "application/json",
      },
    });
  } catch {
    throw new Error("No se pudo conectar con la API de Mi Ciudad.");
  }

  let contenido: unknown;

  try {
    contenido = await respuesta.json();
  } catch {
    throw new Error("La API devolvió una respuesta JSON inválida.");
  }

  if (!respuesta.ok) {
    const error = (contenido as RespuestaError | null)?.error;

    throw new ErrorApi(
      respuesta.status,
      error?.codigo ?? "ERROR_HTTP",
      error?.mensaje ?? `Error HTTP ${respuesta.status}`,
    );
  }

  return contenido as T;
}
