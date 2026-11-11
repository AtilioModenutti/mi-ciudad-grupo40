import { useSesion } from "@/contextos/SesionContexto";

import {
  marcarFavoritoEnLaCuenta,
  obtenerFavoritosDeLaCuenta,
  quitarFavoritoDeLaCuenta,
} from "@/servicios/favoritos-api";

import { guardarFavoritos, obtenerFavoritos } from "@/servicios/favoritos";

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

import * as Network from "expo-network";

import { ErrorHttp } from "@/servicios/api";

import {
  guardarFavoritosCuentaCache,
  leerFavoritosCuentaCache,
} from "@/servicios/cache-favoritos-cuenta";

type FavoritosContextoTipo = {
  favoritos: string[];
  favoritosListos: boolean;
  favoritosEnProceso: boolean;
  errorFavoritos: string;
  cambiarFavorito: (id: string) => Promise<void>;
  reintentarFavoritos: () => void;
  favoritosSoloLectura: boolean;
};

type ListaFavoritos = {
  origen: string;
  ids: string[];
};

const ContextoFavoritos = createContext<FavoritosContextoTipo | undefined>(
  undefined,
);

export function ProveedorFavoritos({ children }: { children: ReactNode }) {
  const { usuario, tokenSesion, cargandoSesion, sesionBloqueada } = useSesion();

  const origen =
    cargandoSesion || sesionBloqueada
      ? null
      : usuario
        ? tokenSesion
          ? `usuario:${usuario.id}`
          : null
        : "invitado";

  const sesionActual = useRef({ origen, tokenSesion });

  sesionActual.current = { origen, tokenSesion };

  const [lista, setLista] = useState<ListaFavoritos | null>(null);

  const [error, setError] = useState<{
    origen: string;
    mensaje: string;
  } | null>(null);

  const [favoritosEnProceso, setFavoritosEnProceso] = useState(false);
  const [numeroRecarga, setNumeroRecarga] = useState(0);

  const operacionEnCurso = useRef(false);

  const favoritos = lista?.origen === origen ? lista.ids : [];

  const favoritosListos = origen !== null && lista?.origen === origen;

  const errorFavoritos = error?.origen === origen ? error.mensaje : "";

  const [soloLecturaOrigen, setSoloLecturaOrigen] = useState<string | null>(
    null,
  );

  const estadoRed = Network.useNetworkState();

  const sinConexion =
    estadoRed.isConnected === false || estadoRed.isInternetReachable === false;

  const favoritosSoloLectura =
    origen !== null &&
    origen.startsWith("usuario:") &&
    (sinConexion || soloLecturaOrigen === origen);

  useEffect(() => {
    let activo = true;

    setError(null);
    setLista((actual) => (actual?.origen === origen ? actual : null));

    if (!origen) {
      return () => {
        activo = false;
      };
    }

    async function cargar() {
      const esInvitado = origen === "invitado";
      const usuarioId = esInvitado ? null : origen!.slice("usuario:".length);

      try {
        if (esInvitado) {
          const ids = await obtenerFavoritos();

          if (activo) {
            setLista({ origen: origen!, ids });
            setSoloLecturaOrigen(null);
          }

          return;
        }

        if (!usuarioId) {
          throw new Error("No se pudo identificar la cuenta.");
        }

        if (sinConexion) {
          const copia = await leerFavoritosCuentaCache(usuarioId);

          if (copia === null) {
            throw new Error("No hay favoritos guardados.");
          }

          if (activo) {
            setLista({ origen: origen!, ids: copia });
            setSoloLecturaOrigen(origen!);
          }

          return;
        }

        if (!tokenSesion) {
          throw new Error("No hay una sesión activa.");
        }

        const ids = await obtenerFavoritosDeLaCuenta(tokenSesion);

        if (!activo) {
          return;
        }

        if (!activo) {
          return;
        }

        setLista({ origen: origen!, ids });
        setSoloLecturaOrigen(null);

        try {
          await guardarFavoritosCuentaCache(usuarioId, ids);
        } catch {
          console.warn("No se pudo guardar la copia de favoritos.");
        }
      } catch (fallo) {
        if (
          usuarioId &&
          !(
            fallo instanceof ErrorHttp &&
            fallo.estado >= 400 &&
            fallo.estado < 500
          )
        ) {
          try {
            const copia = await leerFavoritosCuentaCache(usuarioId);

            if (copia !== null) {
              if (activo) {
                setLista({ origen: origen!, ids: copia });
                setSoloLecturaOrigen(origen!);
                setError(null);
              }

              return;
            }
          } catch {
            console.warn("No se pudo leer la copia de favoritos.");
          }
        }

        if (activo) {
          setError({
            origen: origen!,
            mensaje: "No se pudieron cargar los favoritos.",
          });

          setLista({ origen: origen!, ids: [] });
          setSoloLecturaOrigen(null);
        }
      }
    }

    void cargar();

    return () => {
      activo = false;
    };
  }, [origen, tokenSesion, numeroRecarga, sinConexion]);

  function reintentarFavoritos() {
    if (!operacionEnCurso.current) {
      setNumeroRecarga((actual) => actual + 1);
    }
  }

  async function cambiarFavorito(id: string) {
    if (
      !origen ||
      !favoritosListos ||
      favoritosSoloLectura ||
      errorFavoritos ||
      operacionEnCurso.current
    ) {
      return;
    }

    const origenOperacion = origen;
    const tokenOperacion = tokenSesion;

    const sesionSigueIgual = () =>
      sesionActual.current.origen === origenOperacion &&
      sesionActual.current.tokenSesion === tokenOperacion;

    operacionEnCurso.current = true;
    setFavoritosEnProceso(true);

    const estabaMarcado = favoritos.includes(id);

    const nuevos = estabaMarcado
      ? favoritos.filter((favoritoId) => favoritoId !== id)
      : [...favoritos, id];

    try {
      if (origenOperacion === "invitado") {
        await guardarFavoritos(nuevos);
      } else {
        if (!tokenOperacion) {
          return;
        }

        if (estabaMarcado) {
          await quitarFavoritoDeLaCuenta(id, tokenOperacion);
        } else {
          await marcarFavoritoEnLaCuenta(id, tokenOperacion);
        }
      }

      if (!sesionSigueIgual()) {
        return;
      }

      setLista((actual) =>
        actual?.origen === origenOperacion
          ? { origen: origenOperacion, ids: nuevos }
          : actual,
      );

      if (origenOperacion !== "invitado") {
        try {
          await guardarFavoritosCuentaCache(
            origenOperacion.slice("usuario:".length),
            nuevos,
          );
        } catch {
          console.warn("No se pudo actualizar la copia de favoritos.");
        }
      }
    } catch (fallo) {
      if (sesionSigueIgual()) {
        setError({
          origen: origenOperacion,
          mensaje:
            fallo instanceof Error
              ? `No se pudo actualizar el favorito: ${fallo.message}`
              : "No se pudo actualizar el favorito.",
        });
      }
    } finally {
      operacionEnCurso.current = false;
      setFavoritosEnProceso(false);
    }
  }

  return (
    <ContextoFavoritos.Provider
      value={{
        favoritos,
        favoritosListos,
        favoritosEnProceso,
        errorFavoritos,
        cambiarFavorito,
        reintentarFavoritos,
        favoritosSoloLectura,
      }}
    >
      {children}
    </ContextoFavoritos.Provider>
  );
}

export function useFavoritos() {
  const contexto = useContext(ContextoFavoritos);

  if (contexto === undefined) {
    throw new Error("Falta el ProveedorFavoritos");
  }

  return contexto;
}
