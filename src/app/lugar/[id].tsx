import { Image } from "expo-image";
import { useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

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

  const diasSemana = [
    "Domingo",
    "Lunes",
    "Martes",
    "Miercoles",
    "Jueves",
    "Viernes",
    "Sabado",
  ];

  return (
    <ScrollView
      style={estilos.contenedor}
      contentContainerStyle={estilos.contenido}
    >
      {lugar.imagenes.length > 0 ? (
        <Image
          source={{ uri: lugar.imagenes[0] }}
          style={estilos.imagen}
          contentFit="cover"
          cachePolicy="memory-disk"
        />
      ) : (
        <View style={estilos.sinImagen}>
          <Text>No hay fotografias disponibles.</Text>
        </View>
      )}

      <Text style={estilos.titulo}>{lugar.nombre}</Text>
      <Text style={estilos.descripcion}>{lugar.descripcion}</Text>
      <Text style={estilos.direccion}>{lugar.direccion}</Text>

      <Text style={estilos.seccion}>Información de visita</Text>

      <Text style={estilos.dato}>
        {lugar.precioEntrada === null
          ? "Precio no informado"
          : lugar.precioEntrada === 0
            ? "Gratuita"
            : `$${lugar.precioEntrada}`}
      </Text>

      <Text style={estilos.dato}>
        Accesibilidad: {lugar.accesible ? "Si" : "No"}
      </Text>

      {lugar.telefono && (
        <Text style={estilos.dato}>Teléfono: {lugar.telefono}</Text>
      )}

      {lugar.sitioWeb && (
        <Text style={estilos.dato}>Sitio web: {lugar.sitioWeb}</Text>
      )}

      <Text style={estilos.seccion}>Horarios</Text>

      {lugar.horarios.length === 0 ? (
        <Text>Horarios no informados.</Text>
      ) : (
        lugar.horarios.map((horario, index) => (
          <Text key={`${horario.dia}-${index}`} style={estilos.dato}>
            {diasSemana[horario.dia]}: {horario.abre} a {horario.cierra}
          </Text>
        ))
      )}
    </ScrollView>
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
  contenido: {
    padding: 20,
  },
  imagen: {
    width: "100%",
    height: 300,
    borderRadius: 10,
    marginBottom: 20,
  },
  sinImagen: {
    height: 220,
    backgroundColor: "#EEEEEE",
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 20,
    marginBottom: 20,
  },
  seccion: {
    fontSize: 18,
    fontWeight: "bold",
    marginTop: 24,
    marginBottom: 12,
    color: "#222222",
  },
  dato: {
    fontSize: 15,
    color: "#444444",
    marginBottom: 8,
  },
});
