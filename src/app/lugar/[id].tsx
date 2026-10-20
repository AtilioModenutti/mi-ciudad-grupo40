import { Image } from "expo-image";
import { useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { obtenerCategorias } from "@/servicios/categorias";
import { Categoria } from "@/tipos/categoria";
import { obtenerLugarPorId } from "../../servicios/lugares";
import type { Lugar } from "../../tipos/lugar";

export default function DetalleLugar() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const [lugar, setLugar] = useState<Lugar | null>(null);
  const [cargando, setCargando] = useState(true);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [indiceImagen, setIndiceImagen] = useState(0);

  useEffect(() => {
    obtenerLugarPorId(id)
      .then((resultado) => {
        setLugar(resultado);
        setIndiceImagen(0);
      })
      .finally(() => setCargando(false));
  }, [id]);

  useEffect(() => {
    obtenerCategorias()
      .then((respuesta) => setCategorias(respuesta.datos))
      .catch(() => setCategorias([]));
  }, []);

  if (cargando) {
    return <ActivityIndicator />;
  }

  if (!lugar) {
    return <Text>Lugar no encontrado.</Text>;
  }

  const categoria = categorias.find(
    (categoria) => categoria.id === lugar.categoriaId,
  );

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
        <View style={estilos.galeria}>
          <Image
            source={{ uri: lugar.imagenes[indiceImagen] }}
            style={estilos.imagen}
            contentFit="cover"
            cachePolicy="memory-disk"
          />

          {lugar.imagenes.length > 1 && (
            <View style={estilos.controlesGaleria}>
              <Pressable
                disabled={indiceImagen === 0}
                onPress={() => setIndiceImagen(indiceImagen - 1)}
                style={[
                  estilos.botonGaleria,
                  indiceImagen === 0 && estilos.botonDeshabilitado,
                ]}
              >
                <Text>Anterior</Text>
              </Pressable>

              <Text>
                {indiceImagen + 1} / {lugar.imagenes.length}
              </Text>

              <Pressable
                disabled={indiceImagen === lugar.imagenes.length - 1}
                onPress={() => setIndiceImagen(indiceImagen + 1)}
                style={[
                  estilos.botonGaleria,
                  indiceImagen === lugar.imagenes.length - 1 &&
                    estilos.botonDeshabilitado,
                ]}
              >
                <Text>Siguiente</Text>
              </Pressable>
            </View>
          )}
        </View>
      ) : (
        <View style={estilos.sinImagen}>
          <Text>No hay fotografías disponibles.</Text>
        </View>
      )}

      <Text style={estilos.titulo}>{lugar.nombre}</Text>

      <Text
        style={[estilos.categoria, { color: categoria?.color ?? "#666666" }]}
      >
        {categoria?.nombre ?? "Categoria no disponible"}
      </Text>

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
  categoria: {
    fontSize: 14,
    fontWeight: "bold",
    marginBottom: 12,
  },
  galeria: {
    marginBottom: 20,
  },
  controlesGaleria: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  botonGaleria: {
    padding: 10,
    borderRadius: 8,
    backgroundColor: "#E5E7EB",
  },
  botonDeshabilitado: {
    opacity: 0.35,
  },
});
