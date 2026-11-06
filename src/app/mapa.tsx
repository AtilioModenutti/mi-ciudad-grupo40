import type { LocationObjectCoords } from "expo-location";
import { router, useIsFocused } from "expo-router";
import { Magnetometer } from "expo-sensors";
import { useEffect, useState } from "react";
import {
  Alert,
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
  const [ubicacion, setUbicacion] = useState<LocationObjectCoords | null>(null);
  const [lugares, setLugares] = useState<Lugar[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState<
    string | null
  >(null);
  const [lugarSeleccionadoId, setLugarSeleccionadoId] = useState<string | null>(
    null,
  );
  const [mostrarCercanos, setMostrarCercanos] = useState(false);
  const isFocused = useIsFocused();
  const [rumbo, setRumbo] = useState<number | null>(null);
  const [sensorDisponible, setSensorDisponible] = useState<boolean | null>(
    null,
  );

  //Primero useeffect obtiene los lugares turisticos de nuestro servicio
  useEffect(() => {
    let activo = true;

    obtenerLugares()
      .then((respuesta) => {
        if (activo) setLugares(respuesta.datos);
      })
      .catch(() => {
        if (activo) setError("No se pudieron cargar los lugares.");
      })
      .finally(() => {
        if (activo) setCargando(false);
      });

    return () => {
      activo = false;
    };
  }, []);

  //Segundo useefect solicita el permiso y obtiene la ubicacion del turista
  useEffect(() => {
    let activo = true;

    obtenerUbicacionActual().then((coordenadas) => {
      if (activo) {
        setUbicacion(coordenadas);
      }
    });

    return () => {
      activo = false;
    };
  }, []);

  useEffect(() => {
    let activo = true;

    obtenerCategorias()
      .then((respuesta) => {
        if (activo) {
          setCategorias([...respuesta.datos].sort((a, b) => a.orden - b.orden));
        }
      })
      .catch((error) => {
        console.warn("No se pudieron cargar las categorías", error);
      });

    return () => {
      activo = false;
    };
  }, []);

  const lugaresFiltrados = lugares.filter((lugar) => {
    return (
      categoriaSeleccionada === null ||
      lugar.categoriaId === categoriaSeleccionada
    );
  });

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
      <Text style={styles.titulo}>Lugares turísticos</Text>

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
          {!coordenadasTurista ? (
            <Text style={styles.mensajeCercanos}>
              No se pudo obtener tu ubicación para calcular los lugares
              cercanos.
            </Text>
          ) : lugaresCercanos.length === 0 ? (
            <Text style={styles.mensajeCercanos}>
              No hay lugares disponibles para este filtro.
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

      {cargando ? (
        <Text>Cargando lugares...</Text>
      ) : error ? (
        <Text>{error}</Text>
      ) : lugares.length === 0 ? (
        <Text>No hay lugares disponibles.</Text>
      ) : (
        <>
          <MapView
            provider={PROVIDER_GOOGLE}
            showsUserLocation={ubicacion !== null}
            style={styles.mapa}
            initialRegion={{
              latitude: -32.223,
              longitude: -58.18,
              latitudeDelta: 0.16,
              longitudeDelta: 0.22,
            }}
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
  contenedor: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  titulo: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#000000",
    marginBottom: 20,
  },
  mapa: {
    flex: 1,
  },
  barraFiltros: {
    flexGrow: 0,
    marginBottom: 12,
  },
  contenidoFiltros: {
    paddingHorizontal: 12,
    gap: 8,
    alignItems: "center",
  },
  filtro: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 20,
    backgroundColor: "#E5E7EB",
  },
  filtroActivo: {
    backgroundColor: "#2563EB",
  },
  textoFiltro: {
    color: "#111827",
  },
  textoFiltroActivo: {
    color: "#FFFFFF",
    fontWeight: "bold",
  },
  panelIndicaciones: {
    padding: 12,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    gap: 10,
  },
  nombreDestino: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#111827",
  },
  botonesIndicaciones: {
    flexDirection: "row",
    gap: 10,
  },
  botonIndicaciones: {
    flex: 1,
    backgroundColor: "#2563EB",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  textoIndicaciones: {
    color: "#FFFFFF",
    fontWeight: "bold",
  },
  textoDistancia: {
    fontSize: 14,
    color: "#475569",
  },
  botonCercanos: {
    backgroundColor: "#2563EB",
    padding: 12,
    marginHorizontal: 12,
    marginBottom: 8,
    borderRadius: 8,
    alignItems: "center",
  },
  textoBotonCercanos: {
    color: "#FFFFFF",
    fontWeight: "bold",
  },
  contenedorCercanos: {
    marginHorizontal: 12,
    marginBottom: 8,
    backgroundColor: "#F8FAFC",
    borderRadius: 8,
    padding: 8,
  },
  listaCercanos: {
    maxHeight: 180,
  },
  itemCercano: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  nombreCercano: {
    fontWeight: "bold",
    color: "#111827",
  },
  distanciaCercano: {
    color: "#475569",
    marginTop: 4,
  },
  mensajeCercanos: {
    color: "#475569",
    padding: 10,
  },
  filaBrujula: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  flechaBrujula: {
    fontSize: 36,
    fontWeight: "bold",
    color: "#2563EB",
  },
  textoBrujula: {
    flexShrink: 1,
    fontSize: 14,
    color: "#475569",
  },
});
