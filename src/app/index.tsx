import { router } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { obtenerCategorias } from "../servicios/categorias";
import { obtenerLugares } from "../servicios/lugares";
import type { Categoria } from "../tipos/categoria";
import { Lugar } from "../tipos/lugar";

export default function Inicio() {
  const [lugares, setLugares] = useState<Lugar[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState<
    string | null
  >(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [busqueda, setBusqueda] = useState("");

  useEffect(() => {
    obtenerLugares()
      .then((respuesta) => setLugares(respuesta.datos))
      .catch(() => setError("No se pudieron cargar los lugares."))
      .finally(() => setCargando(false));
  }, []);

  useEffect(() => {
    obtenerCategorias()
      .then((respuesta) => setCategorias(respuesta.datos))
      .catch(() => setError("No se pudieron cargar las categorías."));
  }, []);

  const lugaresFiltrados = lugares.filter((lugar) => {
    const coincideNombre = lugar.nombre
      .toLowerCase()
      .includes(busqueda.toLowerCase());

    const coincideCategoria =
      categoriaSeleccionada === null ||
      lugar.categoriaId === categoriaSeleccionada;

    return coincideNombre && coincideCategoria;
  });

  return (
    <SafeAreaView style={estilos.pantalla} edges={["top"]}>
      <Text style={estilos.titulo}>Mi Ciudad</Text>
      <Text style={estilos.subtitulo}>Descubrí Colón, Entre Ríos</Text>

      <TextInput
        style={estilos.buscador}
        placeholder="Buscar lugares"
        value={busqueda}
        onChangeText={setBusqueda}
      ></TextInput>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ flexGrow: 0, marginBottom: 15 }}
      >
        <Pressable
          style={[
            estilos.filtro,
            categoriaSeleccionada === null && estilos.filtroActivo,
          ]}
          onPress={() => setCategoriaSeleccionada(null)}
        >
          <Text
            style={[
              categoriaSeleccionada === null && estilos.textoFiltroActivo,
            ]}
          >
            Todos
          </Text>
        </Pressable>

        {categorias.map((categoria) => (
          <Pressable
            key={categoria.id}
            style={[
              estilos.filtro,
              categoriaSeleccionada === categoria.id && estilos.filtroActivo,
            ]}
            onPress={() => setCategoriaSeleccionada(categoria.id)}
          >
            <Text>{categoria.nombre}</Text>
          </Pressable>
        ))}
      </ScrollView>

      {cargando ? (
        <ActivityIndicator />
      ) : error ? (
        <Text>{error}</Text>
      ) : (
        <FlatList
          data={lugaresFiltrados}
          keyExtractor={(item) => item.id}
          ListEmptyComponent={<Text>No se encontraron lugares.</Text>}
          renderItem={({ item, index }) => {
            const categoria = categorias.find(
              (categoria) => categoria.id === item.categoriaId,
            );

            return (
              <Pressable
                style={[
                  estilos.tarjeta,
                  {
                    backgroundColor: index % 2 === 0 ? "#DBEAFE" : "#FFF0D6",
                    borderColor: index % 2 === 0 ? "#93C5FD" : "#F4C77B",
                  },
                ]}
                onPress={() =>
                  router.push({
                    pathname: "/lugar/[id]",
                    params: { id: item.id },
                  })
                }
              >
                <Text
                  style={[
                    estilos.nombre,
                    { color: categoria?.color ?? "#111111" },
                  ]}
                >
                  {index + 1}. {item.nombre}
                </Text>

                <Text>{item.descripcionCorta}</Text>
              </Pressable>
            );
          }}
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
    borderRadius: 8,
    marginBottom: 12,
  },
  nombre: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 5,
    color: "#15803D",
  },
  buscador: {
    borderWidth: 1,
    borderColor: "#CCCCCC",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 20,
    color: "#111111",
  },
  filtro: {
    padding: 10,
    borderWidth: 1,
    borderColor: "#CCCCCC",
    borderRadius: 8,
    marginRight: 10,
  },
  filtroActivo: {
    backgroundColor: "#2563EB",
    borderColor: "#2563EB",
  },
  textoFiltroActivo: {
    color: "#FFFFFF",
  },
});
