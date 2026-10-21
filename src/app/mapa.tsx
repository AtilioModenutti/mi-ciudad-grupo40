import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { obtenerLugares } from "@/servicios/lugares";
import type { Lugar } from "@/tipos/lugar";

export default function MapaScreen() {
  const [lugares, setLugares] = useState<Lugar[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

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
        lugares.map((lugar) => (
          <Text key={lugar.id} style={styles.texto}>
            {lugar.nombre}
          </Text>
        ))
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: {
    flex: 1,
    padding: 20,
    backgroundColor: "#FFFFFF",
  },
  titulo: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#000000",
    marginBottom: 20,
  },
  texto: {
    color: "#000000",
    marginBottom: 12,
  },
});
