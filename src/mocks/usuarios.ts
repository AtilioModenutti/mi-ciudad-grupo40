import type { Usuario } from "@/tipos/autenticacion";

type UsuarioMock = Usuario & {
  contrasenia: string;
};

export const usuariosMock: UsuarioMock[] = [
  {
    id: "usr-001",
    nombre: "Turista de Prueba",
    correo: "user@miciudad.com",
    contrasenia: "112233",
  },
];

// Eliminar este mock para cuando conectemos la API..
