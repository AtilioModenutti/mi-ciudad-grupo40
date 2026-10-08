import { useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

import { obtenerLugarPorId } from "../../servicios/lugares";
import type { Lugar } from "../../tipos/lugar";

export default function DetalleLugar() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const [lugar, setLugar] = useState<Lugar | null>(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    obtenerLugarPorId(id)
      .then((resultado) => setLugar(resultado))
      .finally(() => setCargando(false));
  }, [id]);

  if (cargando) {
    return <ActivityIndicator />;
  }

  if (!lugar) {
    return <Text>Lugar no encontrado.</Text>;
  }

  return (
    <View style={estilos.contenedor}>
      <Text style={estilos.titulo}>{lugar.nombre}</Text>
      <Text style={estilos.descripcion}>{lugar.descripcion}</Text>
      <Text style={estilos.direccion}>{lugar.direccion}</Text>

      <Text style={estilos.id}>{lugar.id}</Text>
      <Text style={estilos.categoriaId}>{lugar.categoriaId}</Text>
    </View>
  );
}

const estilos = StyleSheet.create({
  contenedor: {
    flex: 1,
    padding: 20,
    backgroundColor: "#FFFFFF",
  },
  titulo: {
    fontSize: 26,
    fontWeight: "bold",
    marginBottom: 15,
  },
  descripcion: {
    fontSize: 16,
    marginBottom: 15,
  },
  direccion: {
    fontSize: 14,
    color: "#666666",
  },
  id: {
    fontSize: 14,
    color: "#e40000",
  },
  categoriaId: {
    fontSize: 14,
    color: "#268600",
  },
});
