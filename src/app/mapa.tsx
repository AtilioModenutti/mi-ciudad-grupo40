import type { LocationObjectCoords } from "expo-location";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import MapView, { Marker, PROVIDER_GOOGLE } from "react-native-maps";

import { obtenerLugares } from "@/servicios/lugares";
import { obtenerUbicacionActual } from "@/servicios/ubicacion";
import type { Lugar } from "@/tipos/lugar";

export default function MapaScreen() {
  const [ubicacion, setUbicacion] = useState<LocationObjectCoords | null>(null);
  const [lugares, setLugares] = useState<Lugar[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

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

  return (
    <View style={styles.contenedor}>
      <Text style={styles.titulo}>Lugares turísticos</Text>

      {cargando ? (
        <Text>Cargando lugares...</Text>
      ) : error ? (
        <Text>{error}</Text>
      ) : lugares.length === 0 ? (
        <Text>No hay lugares disponibles.</Text>
      ) : (
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
          {lugares.map((lugar) => (
            <Marker
              key={lugar.id}
              coordinate={{
                latitude: lugar.coordenadas.latitud,
                longitude: lugar.coordenadas.longitud,
              }}
              title={lugar.nombre}
              description={lugar.descripcionCorta}
              onCalloutPress={() =>
                router.push({
                  pathname: "/lugar/[id]",
                  params: { id: lugar.id },
                })
              }
            />
          ))}
        </MapView>
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
});
