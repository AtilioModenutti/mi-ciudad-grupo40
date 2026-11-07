import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { AppState } from "react-native";

import { obtenerUsuarioActual } from "@/servicios/autenticacion";
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
};

const ContextoSesion = createContext<SesionContextoTipo | undefined>(undefined);

export function ProveedorSesion({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<UsuarioApi | null>(null);
  const [cargandoSesion, setCargandoSesion] = useState(true);
  const [errorSesion, setErrorSesion] = useState("");
  const [sesionBloqueada, setSesionBloqueada] = useState(false);
  const [verificandoBiometria, setVerificandoBiometria] = useState(false);
  const [biometriaActiva, setBiometriaActiva] = useState(false);

  useEffect(() => {
    let activo = true;

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

        if (activo) {
          setBiometriaActiva(requiereBiometria);
          setUsuario(requiereBiometria ? null : usuarioGuardado);
          setSesionBloqueada(requiereBiometria);
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

  // App a segundo plano
  useEffect(() => {
    const suscripcion = AppState.addEventListener("change", (estado) => {
      if (
        estado === "background" &&
        biometriaActiva &&
        usuario !== null &&
        !verificandoBiometria
      ) {
        setUsuario(null);
        setSesionBloqueada(true);
      }
    });

    return () => suscripcion.remove();
  }, [biometriaActiva, usuario, verificandoBiometria]);

  async function activarSesion(sesion: SesionApi) {
    const requiereBiometria = await obtenerBiometriaHabilitada(
      sesion.usuario.id,
    );
    await guardarToken(sesion.token);
    setBiometriaActiva(requiereBiometria);
    setUsuario(sesion.usuario);
    setSesionBloqueada(false);
    setErrorSesion("");
  }

  async function cerrarSesion() {
    try {
      await eliminarToken();
      setUsuario(null);
      setSesionBloqueada(false);
      setBiometriaActiva(false);
      setErrorSesion("");
    } catch {
      setErrorSesion("No se pudo cerrar sesión. Intentá nuevamente.");
    }
  }

  function actualizarBiometria(habilitada: boolean) {
    setBiometriaActiva(habilitada);
  }

  async function desbloquearSesion() {
    if (!sesionBloqueada || verificandoBiometria) {
      return;
    }

    setVerificandoBiometria(true);
    setErrorSesion("");

    try {
      const estado = await comprobarBiometria();
      if (estado !== "disponible") {
        setErrorSesion(
          "La biometría no está disponible. Podés ingresar con tu contraseña.",
        );
        return;
      }

      const correcta = await verificarBiometria();
      if (!correcta) {
        return;
      }

      const token = await obtenerToken();
      if (!token) {
        setErrorSesion(
          "No hay una sesión guardada. Ingresá con tu contraseña.",
        );
        setSesionBloqueada(false);
        setBiometriaActiva(false);
        return;
      }

      const usuarioActual = await obtenerUsuarioActual(token);
      setUsuario(usuarioActual);
      setSesionBloqueada(false);
      setErrorSesion("");
    } catch (error) {
      setErrorSesion(
        error instanceof Error
          ? error.message
          : "No se pudo desbloquear la sesión.",
      );
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
