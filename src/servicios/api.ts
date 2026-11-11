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

export async function consultarApi<T>(ruta: string): Promise<T> {
  const base = process.env.EXPO_PUBLIC_API_URL?.replace(/\/+$/, "");

  if (!base) {
    throw new Error("Falta configurar EXPO_PUBLIC_API_URL.");
  }

  let respuesta: Response;
  try {
    respuesta = await fetch(`${base}${ruta}`);
  } catch {
    throw new Error("No se pudo conectar con la API.");
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

  try {
    return (await respuesta.json()) as T;
  } catch {
    throw new Error("La API devolvió una respuesta no válida.");
  }
}
