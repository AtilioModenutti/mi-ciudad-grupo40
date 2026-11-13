import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { AppState } from "react-native";

import { obtenerUsuarioActual } from "@/servicios/autenticacion";
import { NotificacionesServicio } from "@/servicios/notificaciones.servicio";
import { comprobarBiometria, verificarBiometria } from "@/servicios/biometria";
import { obtenerBiometriaHabilitada } from "@/servicios/preferencias-biometria";
import { eliminarToken, guardarToken, obtenerToken } from "@/servicios/sesion";
import type { SesionApi, UsuarioApi } from "@/tipos/autenticacion";

type SesionContextoTipo = {
  usuario: UsuarioApi | null;
  cargandoSesion: boolean;
  errorSesion: string;
  sesionBloqueada: boolean;
  verificandoBiometria: boolean;
  activarSesion: (sesion: SesionApi) => Promise<void>;
  cerrarSesion: () => Promise<void>;
  desbloquearSesion: () => Promise<void>;
  actualizarBiometria: (habilitada: boolean) => void;
  tokenSesion: string | null;
};

const ContextoSesion = createContext<SesionContextoTipo | undefined>(undefined);

export function ProveedorSesion({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<UsuarioApi | null>(null);
  const [cargandoSesion, setCargandoSesion] = useState(true);
  const [errorSesion, setErrorSesion] = useState("");
  const [sesionBloqueada, setSesionBloqueada] = useState(false);
  const [verificandoBiometria, setVerificandoBiometria] = useState(false);
  const [biometriaActiva, setBiometriaActiva] = useState(false);
  const [tokenSesion, setTokenSesion] = useState<string | null>(null);
  const revisionSesion = useRef(0);

  useEffect(() => {
    let activo = true;
    const revisionInicial = revisionSesion.current;

    async function recuperarSesion() {
      try {
        const token = await obtenerToken();

        if (!token) {
          return;
        }

        const usuarioGuardado = await obtenerUsuarioActual(token);

        const requiereBiometria = await obtenerBiometriaHabilitada(
          usuarioGuardado.id,
        );

        if (!activo || revisionInicial !== revisionSesion.current) {
          return;
        }

        setBiometriaActiva(requiereBiometria);
        setUsuario(requiereBiometria ? null : usuarioGuardado);
        setTokenSesion(requiereBiometria ? null : token);
        setSesionBloqueada(requiereBiometria);
        setErrorSesion("");
      } catch (error) {
        if (activo && revisionInicial === revisionSesion.current) {
          setErrorSesion(
            error instanceof Error
              ? error.message
              : "No se pudo verificar la sesión.",
          );
        }
      } finally {
        if (activo && revisionInicial === revisionSesion.current) {
          setCargandoSesion(false);
        }
      }
    }

    void recuperarSesion();

    return () => {
      activo = false;
    };
  }, []);

  // App a segundo plano
  useEffect(() => {
    const suscripcion = AppState.addEventListener("change", (estado) => {
      if (
        estado === "background" &&
        biometriaActiva &&
        usuario !== null &&
        !verificandoBiometria
      ) {
        revisionSesion.current += 1;
        setUsuario(null);
        setTokenSesion(null);
        setSesionBloqueada(true);
      }
    });

    return () => suscripcion.remove();
  }, [biometriaActiva, usuario, verificandoBiometria]);

  async function activarSesion(sesion: SesionApi) {
    const revision = ++revisionSesion.current;

    const requiereBiometria = await obtenerBiometriaHabilitada(
      sesion.usuario.id,
    );

    await guardarToken(sesion.token);

    if (revision !== revisionSesion.current) {
      return;
    }

    setBiometriaActiva(requiereBiometria);
    setUsuario(sesion.usuario);
    setTokenSesion(sesion.token);
    setSesionBloqueada(false);
    setCargandoSesion(false);
    setErrorSesion("");
  }

  async function cerrarSesion() {
    const revision = ++revisionSesion.current;

    try {
      if (usuario && tokenSesion) {
        try {
          await Promise.race([
            Promise.all([
              NotificacionesServicio.cancelarRecordatoriosDeUsuario(usuario.id),
              NotificacionesServicio.eliminarDispositivoDeApi(tokenSesion, usuario.id),
            ]),
            new Promise<void>((resolver) => setTimeout(resolver, 2500)),
          ]);
        } catch (error) {
          console.warn("No se pudo desvincular el dispositivo al cerrar sesión:", error);
        }
      }

      await eliminarToken();

      if (revision !== revisionSesion.current) {
        return;
      }

      setUsuario(null);
      setTokenSesion(null);
      setSesionBloqueada(false);
      setBiometriaActiva(false);
      setErrorSesion("");
    } catch {
      if (revision === revisionSesion.current) {
        setErrorSesion("No se pudo cerrar sesión. Intentá nuevamente.");
      }
    }
  }

  function actualizarBiometria(habilitada: boolean) {
    setBiometriaActiva(habilitada);
  }

  async function desbloquearSesion() {
    if (!sesionBloqueada || verificandoBiometria) {
      return;
    }

    const revision = revisionSesion.current;

    setVerificandoBiometria(true);
    setErrorSesion("");

    try {
      const estado = await comprobarBiometria();

      if (revision !== revisionSesion.current) {
        return;
      }

      if (estado !== "disponible") {
        setErrorSesion(
          "La biometría no está disponible. Podés ingresar con tu contraseña.",
        );
        return;
      }

      const correcta = await verificarBiometria();

      if (!correcta || revision !== revisionSesion.current) {
        return;
      }

      const token = await obtenerToken();

      if (revision !== revisionSesion.current) {
        return;
      }

      if (!token) {
        setErrorSesion("No hay una sesión guardada.");
        setTokenSesion(null);
        setSesionBloqueada(false);
        setBiometriaActiva(false);
        return;
      }

      const usuarioActual = await obtenerUsuarioActual(token);

      if (revision !== revisionSesion.current) {
        return;
      }

      setUsuario(usuarioActual);
      setTokenSesion(token);
      setSesionBloqueada(false);
      setErrorSesion("");
    } catch (error) {
      if (revision === revisionSesion.current) {
        setErrorSesion(
          error instanceof Error
            ? error.message
            : "No se pudo desbloquear la sesión.",
        );
      }
    } finally {
      setVerificandoBiometria(false);
    }
  }

  return (
    <ContextoSesion.Provider
      value={{
        usuario,
        cargandoSesion,
        errorSesion,
        sesionBloqueada,
        verificandoBiometria,
        activarSesion,
        cerrarSesion,
        desbloquearSesion,
        actualizarBiometria,
        tokenSesion,
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
