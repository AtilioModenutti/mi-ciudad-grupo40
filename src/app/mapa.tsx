import { useAvisosProximidad } from "@/contextos/AvisosProximidadContexto";
import { useFavoritos } from "@/contextos/FavoritosContexto";
import { useSesion } from "@/contextos/SesionContexto";
import type { LocationObjectCoords } from "expo-location";
import * as Network from "expo-network";
import { router, useIsFocused, useLocalSearchParams } from "expo-router";
import { Magnetometer } from "expo-sensors";
import { useEffect, useRef, useState } from "react";
import {
  Alert,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import MapView, { Marker, PROVIDER_GOOGLE } from "react-native-maps";

import {
  arrowRotationDegrees,
  bearingDegrees,
  distanceMeters,
  formatDistance,
  headingFromMagnetometer,
} from "@/lib/geo";
import { obtenerCategorias } from "@/servicios/categorias";
import { abrirIndicaciones, type ModoViaje } from "@/servicios/indicaciones";
import { obtenerLugares } from "@/servicios/lugares";
import { obtenerUbicacionActual } from "@/servicios/ubicacion";
import type { Categoria } from "@/tipos/categoria";
import type { Lugar } from "@/tipos/lugar";

export default function MapaScreen() {
  const { lugarId } = useLocalSearchParams<{ lugarId?: string }>();
  const { usuario, sesionBloqueada, ejecutarActividadNativa } = useSesion();
  const {
    habilitado: avisosActivos,
    radioMetros: radioAvisos,
    cargando: gestionandoAvisos,
    mensaje: mensajeAvisos,
    activar: activarAvisos,
    desactivar: desactivarAvisos,
    cambiarRadio,
  } = useAvisosProximidad();
  const { favoritos, favoritosListos, errorFavoritos, reintentarFavoritos } =
    useFavoritos();
  const mapaRef = useRef<MapView>(null);
  const [mapaListo, setMapaListo] = useState(false);
  const estadoRed = Network.useNetworkState();
  const sinConexion =
    estadoRed.isConnected === false || estadoRed.isInternetReachable === false;
  const [desdeCache, setDesdeCache] = useState(false);
  const [recargoPorRed, setRecargoPorRed] = useState(false);
  const [ubicacion, setUbicacion] = useState<LocationObjectCoords | null>(null);
  const [ubicacionCargando, setUbicacionCargando] = useState(true);
  const [lugares, setLugares] = useState<Lugar[]>([]);
  const [cargando, setCargando] = useState(true);
  const [errorCategorias, setErrorCategorias] = useState("");
  const [intentoCarga, setIntentoCarga] = useState(0);
  const [error, setError] = useState("");
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState<
    string | null
  >(null);
  const [lugarSeleccionadoId, setLugarSeleccionadoId] = useState<string | null>(
    null,
  );
  const [mostrarCercanos, setMostrarCercanos] = useState(false);
  const [soloFavoritos, setSoloFavoritos] = useState(false);
  const [mostrarConfigAvisos, setMostrarConfigAvisos] = useState(false);
  const isFocused = useIsFocused();
  const [rumbo, setRumbo] = useState<number | null>(null);
  const [sensorDisponible, setSensorDisponible] = useState<boolean | null>(
    null,
  );

  useEffect(() => {
    if (sinConexion) {
      setRecargoPorRed(true);
    } else if (recargoPorRed) {
      setRecargoPorRed(false);
      setIntentoCarga((actual) => actual + 1);
    }
  }, [sinConexion, recargoPorRed]);

  useEffect(() => {
    let activo = true;

    setCargando(true);
    setError("");

    obtenerLugares()
      .then((respuesta) => {
        if (activo) {
          setLugares(respuesta.datos);
          setDesdeCache(respuesta.desdeCache);
        }
      })
      .catch(() => {
        if (activo) {
          setError(
            "No se pudieron cargar los lugares turísticos. Verificá tu conexión e intentá nuevamente.",
          );
        }
      })
      .finally(() => {
        if (activo) {
          setCargando(false);
        }
      });

    return () => {
      activo = false;
    };
  }, [intentoCarga]);

  useEffect(() => {
    let activo = true;

    obtenerUbicacionActual(ejecutarActividadNativa)
      .then((coordenadas) => {
        if (activo) {
          setUbicacion(coordenadas);
        }
      })
      .finally(() => {
        if (activo) {
          setUbicacionCargando(false);
        }
      });

    return () => {
      activo = false;
    };
  }, []);

  useEffect(() => {
    let activo = true;

    setErrorCategorias("");

    obtenerCategorias()
      .then((respuesta) => {
        if (activo) {
          setCategorias([...respuesta.datos].sort((a, b) => a.orden - b.orden));
        }
      })
      .catch(() => {
        if (activo) {
          setErrorCategorias(
            "No se pudieron cargar las categorías. Podés seguir viendo todos los lugares.",
          );
        }
      });

    return () => {
      activo = false;
    };
  }, [intentoCarga]);

  useEffect(() => {
    if (!isFocused || !lugarId) return;
    const destino = lugares.find((lugar) => lugar.id === lugarId);
    if (!destino) return;

    setCategoriaSeleccionada(null);
    setSoloFavoritos(false);
    setLugarSeleccionadoId(destino.id);

    if (mapaListo) {
      mapaRef.current?.animateToRegion(
        {
          latitude: destino.coordenadas.latitud,
          longitude: destino.coordenadas.longitud,
          latitudeDelta: 0.02,
          longitudeDelta: 0.02,
        },
        500,
      );
    }
  }, [isFocused, lugarId, lugares, mapaListo]);

  const destinoInicial = lugarId
    ? lugares.find((lugar) => lugar.id === lugarId)
    : undefined;

  const lugaresFiltrados = lugares.filter((lugar) => {
    const coincideCategoria =
      categoriaSeleccionada === null ||
      lugar.categoriaId === categoriaSeleccionada;
    const coincideFavorito =
      !soloFavoritos || (favoritosListos && favoritos.includes(lugar.id));
    return coincideCategoria && coincideFavorito;
  });

  const cantidadFavoritosEnCategoria = lugares.filter(
    (lugar) =>
      (categoriaSeleccionada === null ||
        lugar.categoriaId === categoriaSeleccionada) &&
      favoritos.includes(lugar.id),
  ).length;

  const filtroFavoritosDeshabilitado =
    !favoritosListos || sesionBloqueada || errorFavoritos !== "";

  const lugarSeleccionado =
    lugaresFiltrados.find((lugar) => lugar.id === lugarSeleccionadoId) ?? null;

  const coordenadasTurista = ubicacion
    ? { latitud: ubicacion.latitude, longitud: ubicacion.longitude }
    : null;

  const distanciaSeleccionada =
    coordenadasTurista && lugarSeleccionado
      ? distanceMeters(coordenadasTurista, lugarSeleccionado.coordenadas)
      : null;

  const lugaresCercanos = coordenadasTurista
    ? lugaresFiltrados
        .map((lugar) => ({
          lugar,
          distancia: distanceMeters(coordenadasTurista, lugar.coordenadas),
        }))
        .sort((a, b) => a.distancia - b.distancia)
    : [];

  useEffect(() => {
    if (!isFocused || !lugarSeleccionado) {
      setRumbo(null);
      return;
    }

    let cancelado = false;
    let suscripcion: ReturnType<typeof Magnetometer.addListener> | null = null;

    setRumbo(null);
    setSensorDisponible(null);

    async function iniciarSensor() {
      try {
        const disponible = await Magnetometer.isAvailableAsync();

        if (cancelado) return;

        setSensorDisponible(disponible);

        if (!disponible) return;

        Magnetometer.setUpdateInterval(200);

        suscripcion = Magnetometer.addListener(({ x, y }) => {
          if (!cancelado) {
            setRumbo(headingFromMagnetometer(x, y));
          }
        });
      } catch (error) {
        if (!cancelado) {
          setSensorDisponible(false);
          console.warn("Error al iniciar el magnetómetro:", error);
        }
      }
    }

    void iniciarSensor();

    return () => {
      cancelado = true;
      suscripcion?.remove();
    };
  }, [isFocused, lugarSeleccionado?.id]);

  const rotacionFlecha =
    coordenadasTurista && lugarSeleccionado && rumbo !== null
      ? arrowRotationDegrees(
          bearingDegrees(coordenadasTurista, lugarSeleccionado.coordenadas),
          rumbo,
        )
      : null;

  async function irAlLugar(modo: ModoViaje) {
    if (!lugarSeleccionado) return;

    try {
      await abrirIndicaciones(lugarSeleccionado.coordenadas, modo);
    } catch {
      Alert.alert(
        "No se pudieron abrir las indicaciones",
        "Verificá que tengas una aplicación de mapas disponible.",
      );
    }
  }

  return (
    <View style={styles.contenedor}>
      <View style={styles.encabezadoMapa}>
        <Text style={styles.titulo}>Explorá el mapa</Text>
        <Pressable
          style={styles.accesoAvisos}
          onPress={() => setMostrarConfigAvisos(true)}
          accessibilityRole="button"
          accessibilityLabel="Configurar avisos por cercanía"
        >
          <Text style={styles.textoAccesoAvisos}>
            {avisosActivos ? "Avisos activos" : "Avisos"}
          </Text>
        </Pressable>
      </View>
      {(sinConexion || desdeCache) && (
        <View style={styles.avisoOffline}>
          <Text style={styles.textoAvisoOffline}>
            {desdeCache
              ? "Mapa con lugares guardados en el dispositivo."
              : "Sin conexión. La ubicación y las indicaciones pueden ser limitadas."}
          </Text>
          <Pressable
            onPress={() => setIntentoCarga((anterior) => anterior + 1)}
            accessibilityRole="button"
          >
            <Text style={styles.textoReintentar}>Actualizar mapa</Text>
          </Pressable>
        </View>
      )}

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.barraFiltros}
        contentContainerStyle={styles.contenidoFiltros}
      >
        <Pressable
          style={[
            styles.filtro,
            categoriaSeleccionada === null && styles.filtroActivo,
          ]}
          onPress={() => setCategoriaSeleccionada(null)}
        >
          <Text
            style={[
              styles.textoFiltro,
              categoriaSeleccionada === null && styles.textoFiltroActivo,
            ]}
          >
            Todos
          </Text>
        </Pressable>

        {categorias.map((categoria) => (
          <Pressable
            key={categoria.id}
            style={[
              styles.filtro,
              categoriaSeleccionada === categoria.id && styles.filtroActivo,
            ]}
            onPress={() => setCategoriaSeleccionada(categoria.id)}
          >
            <Text
              style={[
                styles.textoFiltro,
                categoriaSeleccionada === categoria.id &&
                  styles.textoFiltroActivo,
              ]}
            >
              {categoria.nombre}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      <View style={styles.filaFavoritos}>
        <Pressable
          style={[
            styles.botonFiltroFavoritos,
            soloFavoritos && styles.botonFiltroFavoritosActivo,
            filtroFavoritosDeshabilitado &&
              styles.botonFiltroFavoritosDeshabilitado,
          ]}
          disabled={filtroFavoritosDeshabilitado}
          onPress={() => {
            setSoloFavoritos((actual) => !actual);
            setLugarSeleccionadoId(null);
          }}
          accessibilityRole="button"
          accessibilityState={{
            selected: soloFavoritos,
            disabled: filtroFavoritosDeshabilitado,
          }}
          accessibilityLabel="Filtrar lugares por mis favoritos"
        >
          <Text
            style={[
              styles.textoFiltroFavoritos,
              soloFavoritos && styles.textoFiltroFavoritosActivo,
            ]}
          >
            {sesionBloqueada
              ? "Desbloqueá la sesión para ver favoritos"
              : !favoritosListos
                ? "Cargando favoritos..."
                : soloFavoritos
                  ? `♥ Mostrando mis favoritos (${cantidadFavoritosEnCategoria})`
                  : `♡ Solo mis favoritos (${cantidadFavoritosEnCategoria})`}
          </Text>
        </Pressable>
      </View>

      <Modal
        visible={mostrarConfigAvisos}
        transparent
        animationType="fade"
        onRequestClose={() => setMostrarConfigAvisos(false)}
      >
        <View style={styles.fondoModalAvisos}>
          <View style={styles.panelAvisosCercania}>
            <View style={styles.cabeceraAvisos}>
              <Text style={styles.tituloAvisos}>Avisos por cercanía</Text>
              <Pressable
                onPress={() => setMostrarConfigAvisos(false)}
                style={styles.cerrarAvisos}
                accessibilityRole="button"
                accessibilityLabel="Cerrar ajustes de avisos por cercanía"
              >
                <Text style={styles.textoAbrirAvisos}>Cerrar</Text>
              </Pressable>
            </View>
            <ScrollView
              contentContainerStyle={styles.contenidoModalAvisos}
              keyboardShouldPersistTaps="handled"
            >
              <Text style={styles.estadoAvisosBreve}>
                {avisosActivos ? `Activos · ${radioAvisos} m` : "Desactivados"}
              </Text>
              <Text style={styles.descripcionAvisos}>
                Mi Colón puede avisarte cuando estés cerca de un lugar
                turístico. Solo funciona con la aplicación abierta y no comparte
                tu ubicación.
              </Text>
              {usuario && !sesionBloqueada ? (
                <>
                  <Pressable
                    style={[
                      styles.botonAvisos,
                      avisosActivos && styles.botonAvisosActivo,
                    ]}
                    disabled={gestionandoAvisos}
                    accessibilityRole="button"
                    accessibilityState={{
                      disabled: gestionandoAvisos,
                      selected: avisosActivos,
                    }}
                    onPress={() =>
                      void (avisosActivos
                        ? desactivarAvisos()
                        : activarAvisos())
                    }
                  >
                    <Text
                      style={[
                        styles.textoBotonAvisos,
                        avisosActivos && styles.textoBotonAvisosActivo,
                      ]}
                    >
                      {gestionandoAvisos
                        ? "Guardando..."
                        : avisosActivos
                          ? "Desactivar avisos cercanos"
                          : "Activar avisos cercanos"}
                    </Text>
                  </Pressable>
                  <Text style={styles.etiquetaRadioAvisos}>
                    Avisarme dentro de:
                  </Text>
                  <View style={styles.filaRadioAvisos}>
                    {([100, 250, 500] as const).map((radio) => (
                      <Pressable
                        key={radio}
                        style={[
                          styles.botonRadioAvisos,
                          radioAvisos === radio &&
                            styles.botonRadioAvisosActivo,
                        ]}
                        disabled={gestionandoAvisos}
                        accessibilityRole="button"
                        accessibilityState={{
                          selected: radioAvisos === radio,
                          disabled: gestionandoAvisos,
                        }}
                        onPress={() => void cambiarRadio(radio)}
                      >
                        <Text
                          style={[
                            styles.textoRadioAvisos,
                            radioAvisos === radio &&
                              styles.textoRadioAvisosActivo,
                          ]}
                        >
                          {radio} m
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                  <Text style={styles.leyendaAvisos}>
                    Máximo un aviso por lugar al día; hasta tres en total y al
                    menos 30 minutos entre avisos.
                  </Text>
                  {mensajeAvisos !== "" && (
                    <Text style={styles.mensajeAvisos}>{mensajeAvisos}</Text>
                  )}
                </>
              ) : (
                <Text style={styles.mensajeAvisos}>
                  {sesionBloqueada
                    ? "Desbloqueá tu sesión para configurar los avisos."
                    : "Iniciá sesión para activar los avisos por cercanía."}
                </Text>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {errorFavoritos !== "" && (
        <View style={styles.avisoFavoritos}>
          <Text style={styles.mensajeCercanos}>{errorFavoritos}</Text>
          <Pressable onPress={reintentarFavoritos} accessibilityRole="button">
            <Text style={styles.textoReintentar}>Reintentar favoritos</Text>
          </Pressable>
        </View>
      )}

      {errorCategorias !== "" && (
        <Text style={styles.mensajeCercanos}>{errorCategorias}</Text>
      )}

      {(error !== "" || errorCategorias !== "") && (
        <Pressable
          style={styles.botonCercanos}
          onPress={() => setIntentoCarga((anterior) => anterior + 1)}
        >
          <Text style={styles.textoBotonCercanos}>Reintentar carga</Text>
        </Pressable>
      )}

      <Pressable
        style={styles.botonCercanos}
        onPress={() => setMostrarCercanos(!mostrarCercanos)}
      >
        <Text style={styles.textoBotonCercanos}>
          {mostrarCercanos ? "Ocultar lugares cercanos" : "Qué tenés cerca"}
        </Text>
      </Pressable>

      {mostrarCercanos && (
        <View style={styles.contenedorCercanos}>
          {cargando ? (
            <Text style={styles.mensajeCercanos}>
              Cargando lugares turísticos...
            </Text>
          ) : error ? (
            <Text style={styles.mensajeCercanos}>{error}</Text>
          ) : lugaresFiltrados.length === 0 ? (
            <Text style={styles.mensajeCercanos}>
              No hay lugares disponibles para este filtro.
            </Text>
          ) : ubicacionCargando ? (
            <Text style={styles.mensajeCercanos}>
              Obteniendo tu ubicación...
            </Text>
          ) : !coordenadasTurista ? (
            <Text style={styles.mensajeCercanos}>
              No se pudo obtener tu ubicación. Verificá los permisos y los
              servicios de ubicación.
            </Text>
          ) : (
            <ScrollView style={styles.listaCercanos} nestedScrollEnabled>
              {lugaresCercanos.map(({ lugar, distancia }) => (
                <Pressable
                  key={lugar.id}
                  style={styles.itemCercano}
                  onPress={() =>
                    router.push({
                      pathname: "/lugar/[id]",
                      params: { id: lugar.id },
                    })
                  }
                >
                  <Text style={styles.nombreCercano}>{lugar.nombre}</Text>

                  <Text style={styles.distanciaCercano}>
                    {formatDistance(distancia)}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          )}
        </View>
      )}

      {!cargando &&
        !error &&
        lugares.length > 0 &&
        lugaresFiltrados.length === 0 && (
          <Text style={styles.mensajeCercanos}>
            {soloFavoritos
              ? !favoritosListos
                ? "Cargando tus favoritos..."
                : errorFavoritos !== ""
                  ? "No se pudieron consultar tus favoritos. Reintentá la carga."
                  : favoritos.length === 0
                    ? "Todavía no marcaste lugares como favoritos. Podés agregarlos desde el catálogo."
                    : categoriaSeleccionada !== null
                      ? "No tenés favoritos en esta categoría. Elegí Todos o desactivá el filtro."
                      : "Tus favoritos no están entre los lugares disponibles en el mapa."
              : "No hay lugares turísticos disponibles para esta categoría."}
          </Text>
        )}

      {cargando ? (
        <Text>Cargando lugares...</Text>
      ) : error ? (
        <Text>{error}</Text>
      ) : lugares.length === 0 ? (
        <Text>No hay lugares disponibles.</Text>
      ) : (
        <>
          <MapView
            ref={mapaRef}
            onMapReady={() => setMapaListo(true)}
            provider={Platform.OS === "android" ? PROVIDER_GOOGLE : undefined}
            showsUserLocation={ubicacion !== null}
            style={styles.mapa}
            initialRegion={
              destinoInicial
                ? {
                    latitude: destinoInicial.coordenadas.latitud,
                    longitude: destinoInicial.coordenadas.longitud,
                    latitudeDelta: 0.02,
                    longitudeDelta: 0.02,
                  }
                : {
                    latitude: -32.223,
                    longitude: -58.18,
                    latitudeDelta: 0.16,
                    longitudeDelta: 0.22,
                  }
            }
          >
            {lugaresFiltrados.map((lugar) => (
              <Marker
                key={lugar.id}
                coordinate={{
                  latitude: lugar.coordenadas.latitud,
                  longitude: lugar.coordenadas.longitud,
                }}
                title={lugar.nombre}
                description={
                  coordenadasTurista
                    ? `${formatDistance(
                        distanceMeters(coordenadasTurista, lugar.coordenadas),
                      )} . ${lugar.descripcionCorta}`
                    : lugar.descripcionCorta
                }
                onPress={() => setLugarSeleccionadoId(lugar.id)}
                onCalloutPress={() =>
                  router.push({
                    pathname: "/lugar/[id]",
                    params: { id: lugar.id },
                  })
                }
              />
            ))}
          </MapView>

          {lugarSeleccionado && (
            <View style={styles.panelIndicaciones}>
              <Text style={styles.nombreDestino}>
                Cómo llegar a {lugarSeleccionado.nombre}
              </Text>

              {distanciaSeleccionada !== null ? (
                <Text style={styles.textoDistancia}>
                  {formatDistance(distanciaSeleccionada)} de tu ubicación
                  {" (en línea recta)"}
                </Text>
              ) : (
                <Text style={styles.textoDistancia}>
                  Distancia no disponible: no se obtuvo tu ubicación.
                </Text>
              )}

              {rotacionFlecha !== null ? (
                <View style={styles.filaBrujula}>
                  <View
                    style={{
                      transform: [{ rotate: `${rotacionFlecha}deg` }],
                    }}
                  >
                    <Text style={styles.flechaBrujula}>↑</Text>
                  </View>

                  <Text style={styles.textoBrujula}>
                    Dirección aproximada hacia el destino
                  </Text>
                </View>
              ) : (
                <Text style={styles.textoBrujula}>
                  {!coordenadasTurista
                    ? "Brújula no disponible sin ubicación GPS."
                    : sensorDisponible === false
                      ? "Este dispositivo no dispone de magnetómetro."
                      : "Obteniendo orientación del teléfono..."}
                </Text>
              )}

              <View style={styles.botonesIndicaciones}>
                <Pressable
                  style={styles.botonIndicaciones}
                  onPress={() => irAlLugar("walking")}
                >
                  <Text style={styles.textoIndicaciones}>Ir caminando</Text>
                </Pressable>

                <Pressable
                  style={styles.botonIndicaciones}
                  onPress={() => irAlLugar("driving")}
                >
                  <Text style={styles.textoIndicaciones}>Ir en auto</Text>
                </Pressable>
              </View>
            </View>
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: { flex: 1, backgroundColor: "#F6F8F5" },
  avisoOffline: {
    padding: 13,
    marginHorizontal: 16,
    marginBottom: 10,
    borderRadius: 13,
    backgroundColor: "#E8F2EF",
    gap: 7,
  },
  textoAvisoOffline: { color: "#315F5D", fontSize: 15, lineHeight: 21 },
  textoReintentar: {
    color: "#185F65",
    fontSize: 16,
    fontWeight: "800",
    paddingVertical: 7,
  },
  titulo: {
    flex: 1,
    fontSize: 23,
    fontWeight: "800",
    color: "#244243",
    marginBottom: 12,
    marginTop: 10,
    marginLeft: 18,
  },
  mapa: { flex: 1 },
  barraFiltros: { flexGrow: 0, marginBottom: 10 },
  contenidoFiltros: { paddingHorizontal: 16, gap: 8, alignItems: "center" },
  filtro: {
    paddingHorizontal: 16,
    minHeight: 44,
    justifyContent: "center",
    borderRadius: 28,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#C9DAD2",
  },
  filtroActivo: { backgroundColor: "#185F65", borderColor: "#185F65" },
  textoFiltro: { color: "#345758", fontSize: 15, fontWeight: "700" },
  textoFiltroActivo: { color: "#FFFFFF", fontWeight: "800" },
  filaFavoritos: {
    paddingHorizontal: 16,
    marginBottom: 10,
    alignItems: "flex-start",
  },
  botonFiltroFavoritos: {
    minHeight: 44,
    justifyContent: "center",
    borderRadius: 28,
    borderWidth: 1,
    borderColor: "#E2BAC4",
    backgroundColor: "#FFF6F8",
    paddingHorizontal: 16,
  },
  botonFiltroFavoritosActivo: {
    backgroundColor: "#A63856",
    borderColor: "#A63856",
  },
  botonFiltroFavoritosDeshabilitado: { opacity: 0.55 },
  textoFiltroFavoritos: { color: "#963652", fontSize: 15, fontWeight: "700" },
  textoFiltroFavoritosActivo: { color: "#FFFFFF" },
  avisoFavoritos: {
    marginHorizontal: 16,
    marginBottom: 10,
    padding: 13,
    borderRadius: 12,
    backgroundColor: "#FFF1F2",
  },
  encabezadoMapa: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingRight: 16,
    gap: 6,
  },
  accesoAvisos: {
    minHeight: 48,
    justifyContent: "center",
    paddingHorizontal: 12,
    backgroundColor: "#E6F1EB",
    borderRadius: 12,
  },
  textoAccesoAvisos: { fontSize: 15, fontWeight: "800", color: "#185F65" },
  fondoModalAvisos: {
    flex: 1,
    backgroundColor: "rgba(15, 37, 39, 0.55)",
    paddingHorizontal: 18,
    justifyContent: "center",
  },
  panelAvisosCercania: {
    maxHeight: "85%",
    padding: 18,
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
    gap: 9,
  },
  cabeceraAvisos: {
    flexDirection: "row",
    minHeight: 48,
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  contenidoModalAvisos: { gap: 14, paddingBottom: 8 },
  cerrarAvisos: {
    minHeight: 48,
    justifyContent: "center",
    paddingHorizontal: 6,
  },
  tituloAvisos: { fontSize: 18, fontWeight: "800", color: "#244243" },
  estadoAvisosBreve: { fontSize: 14, color: "#506E6B" },
  textoAbrirAvisos: { fontSize: 15, fontWeight: "800", color: "#185F65" },
  descripcionAvisos: { fontSize: 15, lineHeight: 22, color: "#506E6B" },
  botonAvisos: {
    minHeight: 48,
    backgroundColor: "#EAF4EF",
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
  },
  botonAvisosActivo: { backgroundColor: "#185F65" },
  textoBotonAvisos: { fontSize: 16, fontWeight: "800", color: "#185F65" },
  textoBotonAvisosActivo: { color: "#FFFFFF" },
  etiquetaRadioAvisos: { fontSize: 15, fontWeight: "700", color: "#244243" },
  filaRadioAvisos: { flexDirection: "row", gap: 8 },
  botonRadioAvisos: {
    flex: 1,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#C9DAD2",
    backgroundColor: "#F7FAF7",
  },
  botonRadioAvisosActivo: {
    backgroundColor: "#185F65",
    borderColor: "#185F65",
  },
  textoRadioAvisos: { fontSize: 16, fontWeight: "700", color: "#345758" },
  textoRadioAvisosActivo: { color: "#FFFFFF" },
  leyendaAvisos: { fontSize: 14, lineHeight: 20, color: "#5B706E" },
  mensajeAvisos: { fontSize: 15, lineHeight: 21, color: "#946029" },
  panelIndicaciones: {
    paddingHorizontal: 16,
    paddingVertical: 15,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#DCE8E0",
    gap: 12,
  },
  nombreDestino: { fontSize: 18, fontWeight: "800", color: "#264546" },
  botonesIndicaciones: { flexDirection: "row", gap: 10 },
  botonIndicaciones: {
    flex: 1,
    minHeight: 48,
    backgroundColor: "#185F65",
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
  },
  textoIndicaciones: { color: "#FFFFFF", fontSize: 15, fontWeight: "700" },
  textoDistancia: { fontSize: 15, lineHeight: 21, color: "#56706E" },
  botonCercanos: {
    backgroundColor: "#185F65",
    minHeight: 48,
    paddingHorizontal: 14,
    justifyContent: "center",
    marginHorizontal: 16,
    marginBottom: 10,
    borderRadius: 12,
    alignItems: "center",
  },
  textoBotonCercanos: { color: "#FFFFFF", fontWeight: "700", fontSize: 16 },
  contenedorCercanos: {
    marginHorizontal: 16,
    marginBottom: 10,
    backgroundColor: "#FFFFFF",
    borderColor: "#DDE8E0",
    borderWidth: 1,
    borderRadius: 14,
    padding: 11,
  },
  listaCercanos: { maxHeight: 210 },
  itemCercano: {
    minHeight: 52,
    justifyContent: "center",
    padding: 11,
    borderBottomWidth: 1,
    borderBottomColor: "#E7EEE8",
  },
  nombreCercano: { fontWeight: "800", fontSize: 16, color: "#284747" },
  distanciaCercano: { color: "#56706E", fontSize: 15, marginTop: 4 },
  mensajeCercanos: {
    color: "#536F6C",
    fontSize: 15,
    lineHeight: 22,
    padding: 10,
  },
  filaBrujula: { flexDirection: "row", alignItems: "center", gap: 12 },
  flechaBrujula: { fontSize: 36, fontWeight: "800", color: "#185F65" },
  textoBrujula: {
    flexShrink: 1,
    fontSize: 15,
    lineHeight: 21,
    color: "#526F6A",
  },
});
