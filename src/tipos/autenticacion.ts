export type CredencialesIngreso = {
  correo: string;
  contrasenia: string;
};

export type DatosRegistro = {
  nombre: string;
  correo: string;
  contrasenia: string;
};

export type UsuarioApi = {
  id: string;
  nombre: string;
  email: string;
  avatarUrl: string | null;
  creadoEn: string;
  preferencias: {
    categoriasFavoritas: string[];
    avisarProximidad: boolean;
    radioAvisoMetros: number;
    tema: "claro" | "oscuro" | "sistema";
  };
};

export type SesionApi = {
  token: string;
  usuario: UsuarioApi;
};
