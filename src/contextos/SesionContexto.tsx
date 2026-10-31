import {
    createContext,
    useContext,
    useEffect,
    useState,
    type ReactNode,
} from "react";

import { obtenerUsuarioActual } from "@/servicios/autenticacion";
import { eliminarToken, guardarToken, obtenerToken } from "@/servicios/sesion";
import type { SesionApi, UsuarioApi } from "@/tipos/autenticacion";

type SesionContextoTipo = {
  usuario: UsuarioApi | null;
  cargandoSesion: boolean;
  errorSesion: string;
  activarSesion: (sesion: SesionApi) => Promise<void>;
  cerrarSesion: () => Promise<void>;
};

const ContextoSesion = createContext<SesionContextoTipo | undefined>(undefined);

export function ProveedorSesion({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<UsuarioApi | null>(null);
  const [cargandoSesion, setCargandoSesion] = useState(true);
  const [errorSesion, setErrorSesion] = useState("");

  useEffect(() => {
    let activo = true;

    async function recuperarSesion() {
      try {
        const token = await obtenerToken();

        if (!token) {
          return;
        }

        const usuarioGuardado = await obtenerUsuarioActual(token);

        if (activo) {
          setUsuario(usuarioGuardado);
        }
      } catch (error) {
        if (activo) {
          setErrorSesion(
            error instanceof Error
              ? error.message
              : "No se pudo verificar la sesión.",
          );
        }
      } finally {
        if (activo) {
          setCargandoSesion(false);
        }
      }
    }

    recuperarSesion();

    return () => {
      activo = false;
    };
  }, []);

  async function activarSesion(sesion: SesionApi) {
    await guardarToken(sesion.token);
    setUsuario(sesion.usuario);
    setErrorSesion("");
  }

  async function cerrarSesion() {
    try {
      await eliminarToken();

      setUsuario(null);
      setErrorSesion("");
    } catch {
      setErrorSesion("No se pudo cerrar sesión. Intentá nuevamente.");
    }
  }

  return (
    <ContextoSesion.Provider
      value={{
        usuario,
        cargandoSesion,
        errorSesion,
        activarSesion,
        cerrarSesion,
      }}
    >
      {children}
    </ContextoSesion.Provider>
  );
}

export function useSesion() {
  const contexto = useContext(ContextoSesion);

  if (contexto === undefined) {
    throw new Error("Falta el ProveedorSesion.");
  }

  return contexto;
}
