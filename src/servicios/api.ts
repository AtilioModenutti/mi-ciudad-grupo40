import axios from "axios";

export type RespuestaLista<T> = {
  datos: T[];
  meta: {
    total: number;
    pagina: number;
    porPagina: number;
  };
};

export type RespuestaUno<T> = {
  datos: T;
  meta: null;
};

export class ErrorHttp extends Error {
  constructor(
    public readonly estado: number,
    mensaje: string,
  ) {
    super(mensaje);
    this.name = "ErrorHttp";
  }
}

const clienteApi = axios.create({
  adapter: "fetch",
  baseURL: process.env.EXPO_PUBLIC_API_URL?.replace(/\/+$/, ""),
  timeout: 20000,
  headers: { Accept: "application/json" },
});

function verificarConfiguracion(): void {
  if (!process.env.EXPO_PUBLIC_API_URL?.trim()) {
    throw new Error("Falta configurar EXPO_PUBLIC_API_URL.");
  }
}

function manejarError(error: unknown): never {
  if (axios.isAxiosError(error)) {
    if (error.response) {
      const estado = error.response.status;
      const contenido = error.response.data as
        | { error?: { mensaje?: unknown } }
        | undefined;
      const mensaje =
        typeof contenido?.error?.mensaje === "string"
          ? contenido.error.mensaje
          : `La API devolvió el error ${estado}.`;

      throw new ErrorHttp(estado, mensaje);
    }

    throw new Error("No se pudo conectar con la API.");
  }

  throw error;
}

function leerRespuestaJson<T>(
  contenido: unknown,
  ruta: string,
  estado: number,
  tipoContenido?: string,
): T {
  let datos: unknown = contenido;

  if (typeof datos === "string") {
    try {
      datos = JSON.parse(datos);
    } catch {
      throw new Error(
        `La API devolvió contenido que no es JSON válido en ${ruta} (HTTP ${estado}).`,
      );
    }
  }

  if (datos === null || typeof datos !== "object" || Array.isArray(datos)) {
    if (__DEV__) {
      console.warn("[Mi Colón] Respuesta HTTP inesperada:", {
        ruta,
        estado,
        tipo: contenido === null ? "null" : typeof contenido,
        tipoContenido: tipoContenido ?? "desconocido",
      });
    }
    throw new Error(
      `La API devolvió una respuesta no válida en ${ruta} (HTTP ${estado}).`,
    );
  }

  return datos as T;
}

export async function enviarApiPublica<T>(
  ruta: string,
  cuerpo: unknown,
): Promise<T> {
  verificarConfiguracion();

  try {
    const respuesta = await clienteApi.post<T>(ruta, cuerpo);
    return leerRespuestaJson<T>(
      respuesta.data,
      ruta,
      respuesta.status,
      String(respuesta.headers["content-type"] ?? "desconocido"),
    );
  } catch (error) {
    manejarError(error);
  }
}

export async function consultarApi<T>(ruta: string): Promise<T> {
  verificarConfiguracion();

  try {
    const respuesta = await clienteApi.get<T>(ruta);
    return leerRespuestaJson<T>(
      respuesta.data,
      ruta,
      respuesta.status,
      String(respuesta.headers["content-type"] ?? "desconocido"),
    );
  } catch (error) {
    manejarError(error);
  }
}

export async function solicitarApiConSesion<T>(
  ruta: string,
  token: string,
  metodo: "GET" | "POST" | "PUT" | "PATCH" | "DELETE" = "GET",
  cuerpo?: unknown,
): Promise<T | null> {
  verificarConfiguracion();
  if (!token) throw new Error("Necesitás iniciar sesión para continuar.");

  try {
    const respuesta = await clienteApi.request<T>({
      url: ruta,
      method: metodo,
      headers: { Authorization: `Bearer ${token}` },
      ...(cuerpo === undefined ? {} : { data: cuerpo }),
    });

    if (respuesta.status === 204) return null;
    return leerRespuestaJson<T>(
      respuesta.data,
      ruta,
      respuesta.status,
      String(respuesta.headers["content-type"] ?? "desconocido"),
    );
  } catch (error) {
    manejarError(error);
  }
}
