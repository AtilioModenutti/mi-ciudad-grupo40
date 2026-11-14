import {
  enviarApiPublica,
  ErrorHttp,
  solicitarApiConSesion,
  type RespuestaUno,
} from "@/servicios/api";
import type {
  CredencialesIngreso,
  DatosRegistro,
  SesionApi,
  UsuarioApi,
} from "@/tipos/autenticacion";

export async function iniciarSesion(
  credenciales: CredencialesIngreso,
): Promise<SesionApi> {
  const respuesta = await enviarApiPublica<RespuestaUno<SesionApi>>(
    "/auth/ingreso",
    {
      email: credenciales.correo.trim().toLowerCase(),
      contrasena: credenciales.contrasenia,
    },
  );

  if (!respuesta?.datos?.token) {
    throw new Error("La API devolvió una respuesta inesperada.");
  }

  return respuesta.datos;
}

export async function registrarUsuario(
  datos: DatosRegistro,
): Promise<SesionApi> {
  const respuesta = await enviarApiPublica<RespuestaUno<SesionApi>>(
    "/auth/registro",
    {
      nombre: datos.nombre.trim(),
      email: datos.correo.trim().toLowerCase(),
      contrasena: datos.contrasenia,
    },
  );

  if (!respuesta?.datos?.token) {
    throw new Error("La API devolvió una respuesta inesperada.");
  }

  return respuesta.datos;
}

export async function obtenerUsuarioActual(token: string): Promise<UsuarioApi> {
  try {
    const respuesta = await solicitarApiConSesion<RespuestaUno<UsuarioApi>>(
      "/yo",
      token,
    );

    if (!respuesta?.datos?.id) {
      throw new Error("La API devolvió una respuesta inesperada.");
    }

    return respuesta.datos;
  } catch (error) {
    if (error instanceof ErrorHttp && error.estado === 401) {
      throw new Error("Tu sesión venció o no es válida.");
    }
    if (error instanceof ErrorHttp) {
      throw new Error("No se pudo recuperar el usuario.");
    }
    throw error;
  }
}
