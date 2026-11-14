import * as Location from "expo-location";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { AppState, Platform } from "react-native";

import { useSesion } from "@/contextos/SesionContexto";
import {
  comprobarPermisosProximidad,
  evaluarAvisoProximidad,
  guardarAjustesProximidad,
  leerAjustesProximidad,
  solicitarPermisosProximidad,
  type RadioProximidad,
} from "@/servicios/avisos-proximidad";
import { obtenerLugares } from "@/servicios/lugares";

type EstadoAvisos = {
  habilitado: boolean;
  radioMetros: RadioProximidad;
  cargando: boolean;
  mensaje: string;
  activar: () => Promise<void>;
  desactivar: () => Promise<void>;
  cambiarRadio: (radio: RadioProximidad) => Promise<void>;
};

const ContextoAvisos = createContext<EstadoAvisos | undefined>(undefined);

export function ProveedorAvisosProximidad({
  children,
}: {
  children: ReactNode;
}) {
  const { usuario, sesionBloqueada } = useSesion();
  const usuarioId = !sesionBloqueada ? usuario?.id : undefined;
  const [propietario, setPropietario] = useState<string | null>(null);
  const [habilitado, setHabilitado] = useState(false);
  const [radioMetros, setRadioMetros] = useState<RadioProximidad>(250);
  const [cargando, setCargando] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [activa, setActiva] = useState(AppState.currentState === "active");

  useEffect(() => {
    const suscripcion = AppState.addEventListener("change", (estado) => {
      setActiva(estado === "active");
    });
    return () => suscripcion.remove();
  }, []);

  useEffect(() => {
    let vigente = true;
    setPropietario(null);
    setHabilitado(false);
    setCargando(Boolean(usuarioId));
    setMensaje("");
    if (!usuarioId) return;

    void leerAjustesProximidad(
      usuarioId,
      usuario?.preferencias.radioAvisoMetros ?? 250,
    )
      .then((ajustes) => {
        if (!vigente) return;
        setRadioMetros(ajustes.radioMetros);
        setHabilitado(ajustes.habilitado);
        setPropietario(usuarioId);
      })
      .catch(() => {
        if (vigente)
          setMensaje("No se pudieron recuperar tus ajustes de cercanía.");
      })
      .finally(() => {
        if (vigente) setCargando(false);
      });

    return () => {
      vigente = false;
    };
  }, [usuarioId, usuario?.preferencias.radioAvisoMetros]);

  useEffect(() => {
    if (
      !usuarioId ||
      propietario !== usuarioId ||
      !habilitado ||
      !activa ||
      Platform.OS === "web"
    )
      return;

    const idDelUsuario = usuarioId;
    let cancelado = false;
    let suscripcion: Location.LocationSubscription | null = null;

    async function iniciar() {
      try {
        if (!(await comprobarPermisosProximidad())) {
          if (!cancelado)
            setMensaje(
              "Revisá los permisos de ubicación y notificaciones en Android.",
            );
          return;
        }
        if (!cancelado) setMensaje("Cargando lugares cercanos...");
        const respuesta = await obtenerLugares();
        if (cancelado) return;
        const lugares = respuesta.datos.filter((lugar) => lugar.activo);
        if (lugares.length === 0) {
          setMensaje(
            "Todavía no hay lugares guardados para comprobar la cercanía.",
          );
          return;
        }
        const nueva = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.High,
            distanceInterval: 20,
            timeInterval: 12000,
          },
          (posicion) => {
            if (!cancelado) {
              void evaluarAvisoProximidad(
                idDelUsuario,
                posicion.coords,
                lugares,
                radioMetros,
              ).catch((error: unknown) => {
                if (!cancelado) {
                  console.warn("Error al comprobar cercanía:", error);
                  setMensaje(
                    "No se pudo generar un aviso de cercanía. Revisá los permisos.",
                  );
                }
              });
            }
          },
        );
        if (cancelado) nueva.remove();
        else {
          suscripcion = nueva;
          setMensaje("Avisos activos mientras usás Mi Colón.");
        }
      } catch (error) {
        if (!cancelado) {
          console.warn("No se pudo iniciar la ubicación de cercanía:", error);
          setMensaje(
            "No se pudo iniciar el GPS. Comprobá la ubicación del teléfono.",
          );
        }
      }
    }

    void iniciar();
    return () => {
      cancelado = true;
      suscripcion?.remove();
    };
  }, [usuarioId, propietario, habilitado, activa, radioMetros]);

  async function activar() {
    if (!usuarioId || propietario !== usuarioId || cargando) return;
    setCargando(true);
    setMensaje("");
    try {
      await solicitarPermisosProximidad();
      await guardarAjustesProximidad(usuarioId, {
        habilitado: true,
        radioMetros,
      });
      setHabilitado(true);
    } catch (error) {
      setMensaje(
        error instanceof Error
          ? error.message
          : "No se pudieron activar los avisos.",
      );
    } finally {
      setCargando(false);
    }
  }

  async function desactivar() {
    if (!usuarioId || propietario !== usuarioId || cargando) return;
    setCargando(true);
    try {
      await guardarAjustesProximidad(usuarioId, {
        habilitado: false,
        radioMetros,
      });
      setHabilitado(false);
      setMensaje("Avisos por cercanía desactivados.");
    } catch {
      setMensaje("No se pudo guardar el cambio. Intentá nuevamente.");
    } finally {
      setCargando(false);
    }
  }

  async function cambiarRadio(radio: RadioProximidad) {
    if (!usuarioId || propietario !== usuarioId || cargando) return;
    setCargando(true);
    try {
      await guardarAjustesProximidad(usuarioId, {
        habilitado,
        radioMetros: radio,
      });
      setRadioMetros(radio);
    } catch {
      setMensaje("No se pudo guardar el radio. Intentá nuevamente.");
    } finally {
      setCargando(false);
    }
  }

  return (
    <ContextoAvisos.Provider
      value={{
        habilitado: propietario === usuarioId && habilitado,
        radioMetros,
        cargando,
        mensaje,
        activar,
        desactivar,
        cambiarRadio,
      }}
    >
      {children}
    </ContextoAvisos.Provider>
  );
}

export function useAvisosProximidad(): EstadoAvisos {
  const contexto = useContext(ContextoAvisos);
  if (!contexto) throw new Error("Falta el ProveedorAvisosProximidad.");
  return contexto;
}
