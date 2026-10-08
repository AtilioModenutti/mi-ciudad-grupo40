import { router } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { obtenerLugares } from "../servicios/lugares";
import { Lugar } from "../tipos/lugar";

export default function Inicio() {
  const [lugares, setLugares] = useState<Lugar[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    obtenerLugares()
      .then((respuesta) => setLugares(respuesta.datos))
      .catch(() => setError("No se pudieron cargar los lugares."))
      .finally(() => setCargando(false));
  }, []);

  return (
    <SafeAreaView style={estilos.pantalla} edges={["top"]}>
      <Text style={estilos.titulo}>Mi Ciudad</Text>
      <Text style={estilos.subtitulo}>Descubrí Colón, Entre Ríos</Text>

      {cargando ? (
        <ActivityIndicator />
      ) : error ? (
        <Text>{error}</Text>
      ) : (
        <FlatList
          data={lugares}
          keyExtractor={(item) => item.id}
          ListEmptyComponent={<Text>No hay lugares disponibles.</Text>}
          renderItem={({ item }) => (
            <Pressable
              style={estilos.tarjeta}
              onPress={() =>
                router.push({
                  pathname: "/lugar/[id]",
                  params: { id: item.id },
                })
              }
            >
              <Text style={estilos.nombre}>{item.nombre}</Text>
              <Text>{item.descripcionCorta}</Text>
            </Pressable>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  pantalla: {
    flex: 1,
    padding: 20,
    backgroundColor: "#FFFFFF",
  },
  titulo: {
    fontSize: 30,
    fontWeight: "bold",
    color: "#111111",
  },
  subtitulo: {
    fontSize: 16,
    color: "#555555",
    marginBottom: 20,
  },
  tarjeta: {
    padding: 16,
    borderWidth: 1,
    borderColor: "#0063e6",
    borderRadius: 8,
    marginBottom: 12,
    backgroundColor: "#FFFFFF",
  },
  nombre: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 5,
    color: "#15803D",
  },
});
