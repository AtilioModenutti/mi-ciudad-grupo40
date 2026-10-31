import type {
  CredencialesIngreso,
  DatosRegistro,
  RespuestaError,
  RespuestaUno,
  SesionApi,
  UsuarioApi,
} from "@/tipos/autenticacion";

export async function iniciarSesion(
  credenciales: CredencialesIngreso,
): Promise<SesionApi> {
  const apiUrl = process.env.EXPO_PUBLIC_API_URL;

  if (!apiUrl) {
    throw new Error("Falta configurar la URL de la API.");
  }

  let respuesta: Response;

  try {
    respuesta = await fetch(`${apiUrl}/auth/ingreso`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: credenciales.correo.trim().toLowerCase(),
        contrasena: credenciales.contrasenia,
      }),
    });
  } catch {
    throw new Error("No se pudo conectar con la API.");
  }

  const contenido: RespuestaUno<SesionApi> | RespuestaError =
    await respuesta.json();

  if (!respuesta.ok) {
    if ("error" in contenido) {
      throw new Error(contenido.error.mensaje);
    }

    throw new Error("No se pudo iniciar sesión.");
  }

  if (!("datos" in contenido) || !contenido.datos.token) {
    throw new Error("La API devolvió una respuesta inesperada.");
  }

  return contenido.datos;
}

export async function registrarUsuario(
  datos: DatosRegistro,
): Promise<SesionApi> {
  const apiUrl = process.env.EXPO_PUBLIC_API_URL;

  if (!apiUrl) {
    throw new Error("Falta configurar la URL de la API.");
  }

  let respuesta: Response;

  try {
    respuesta = await fetch(`${apiUrl}/auth/registro`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        nombre: datos.nombre.trim(),
        email: datos.correo.trim().toLowerCase(),
        contrasena: datos.contrasenia,
      }),
    });
  } catch {
    throw new Error("No se pudo conectar con la API.");
  }

  const contenido: RespuestaUno<SesionApi> | RespuestaError =
    await respuesta.json();

  if (!respuesta.ok) {
    if ("error" in contenido) {
      throw new Error(contenido.error.mensaje);
    }

    throw new Error("No se pudo registrar el usuario.");
  }

  if (!("datos" in contenido) || !contenido.datos.token) {
    throw new Error("La API devolvió una respuesta inesperada.");
  }

  return contenido.datos;
}

export async function obtenerUsuarioActual(token: string): Promise<UsuarioApi> {
  const apiUrl = process.env.EXPO_PUBLIC_API_URL;

  if (!apiUrl) {
    throw new Error("Falta configurar la URL de la API.");
  }

  let respuesta: Response;

  try {
    respuesta = await fetch(`${apiUrl}/yo`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  } catch {
    throw new Error("No se pudo conectar con la API.");
  }

  if (respuesta.status === 401) {
    throw new Error("Tu sesión venció o no es válida.");
  }

  if (!respuesta.ok) {
    throw new Error("No se pudo recuperar el usuario.");
  }

  const contenido: RespuestaUno<UsuarioApi> = await respuesta.json();

  if (!contenido.datos?.id) {
    throw new Error("La API devolvió una respuesta inesperada.");
  }

  return contenido.datos;
}
