import { usuariosMock } from "@/mocks/usuarios";
import type {
    CredencialesIngreso,
    DatosRegistro,
    Usuario,
} from "@/tipos/autenticacion";

export async function iniciarSesion(
  credenciales: CredencialesIngreso,
): Promise<Usuario> {
  const correo = credenciales.correo.trim().toLowerCase();

  const usuario = usuariosMock.find(
    (usuario) =>
      usuario.correo.toLowerCase() === correo &&
      usuario.contrasenia === credenciales.contrasenia,
  );

  if (!usuario) {
    throw new Error("Correo o contraseña incorrectos.");
  }

  return {
    id: usuario.id,
    nombre: usuario.nombre,
    correo: usuario.correo,
  };
}

export async function registrarUsuario(datos: DatosRegistro): Promise<Usuario> {
  const correo = datos.correo.trim().toLowerCase();

  const existe = usuariosMock.some(
    (usuario) => usuario.correo.toLowerCase() === correo,
  );

  if (existe) {
    throw new Error("Ya existe una cuenta con ese correo.");
  }

  const nuevoUsuario = {
    id: `usr-${usuariosMock.length + 1}`,
    nombre: datos.nombre.trim(),
    correo: correo,
    contrasenia: datos.contrasenia,
  };

  usuariosMock.push(nuevoUsuario);

  return {
    id: nuevoUsuario.id,
    nombre: nuevoUsuario.nombre,
    correo: nuevoUsuario.correo,
  };
}
