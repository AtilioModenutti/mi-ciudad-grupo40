export type CredencialesIngreso = {
  correo: string;
  contrasenia: string;
};

export type DatosRegistro = {
  nombre: string;
  correo: string;
  contrasenia: string;
};

export type Usuario = {
  id: string;
  nombre: string;
  correo: string;
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

export type RespuestaUno<T> = {
  datos: T;
  meta: null;
};

export type RespuestaError = {
  error: {
    codigo: string;
    mensaje: string;
  };
};
