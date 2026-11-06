import type { LocationObjectCoords } from "expo-location";
import { router } from "expo-router";
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

import { distanceMeters, formatDistance } from "@/lib/geo";
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
});
