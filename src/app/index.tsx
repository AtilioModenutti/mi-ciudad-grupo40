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
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useFavoritos } from "../contextos/FavoritosContexto";
import { obtenerCategorias } from "../servicios/categorias";
import { obtenerLugares } from "../servicios/lugares";
import type { Categoria } from "../tipos/categoria";
import { Lugar } from "../tipos/lugar";

import { useSesion } from "@/contextos/SesionContexto";

export default function Inicio() {
  const [lugares, setLugares] = useState<Lugar[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState<
    string | null
  >(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [soloFavoritos, setSoloFavoritos] = useState(false);
  const { favoritos, cambiarFavorito, favoritosListos, errorFavoritos } =
    useFavoritos();

  const { usuario, cargandoSesion, errorSesion, cerrarSesion } = useSesion();

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

    const coincideFavorito = !soloFavoritos || favoritos.includes(lugar.id);

    return coincideNombre && coincideCategoria && coincideFavorito;
  });

  const cantidadFavoritosVisibles = lugaresFiltrados.filter((lugar) =>
    favoritos.includes(lugar.id),
  ).length;

  return (
    <SafeAreaView style={estilos.pantalla} edges={["top"]}>
      <Text style={estilos.titulo}>Mi Ciudad</Text>
      <Text style={estilos.subtitulo}>Descubrí Colón, Entre Ríos</Text>

      {cargandoSesion ? (
        <Text style={estilos.textoIngresar}>Recuperando sesión...</Text>
      ) : usuario ? (
        <View style={estilos.resumenSesion}>
          <Text style={estilos.textoIngresar}>Hola, {usuario.nombre}</Text>

          <Pressable
            style={estilos.botonCerrarSesion}
            onPress={cerrarSesion}
            accessibilityRole="button"
          >
            <Text style={estilos.textoCerrarSesion}>Cerrar sesión</Text>
          </Pressable>
        </View>
      ) : (
        <Pressable
          style={estilos.botonIngresar}
          onPress={() => router.push("/ingresar")}
        >
          <Text style={estilos.textoIngresar}>Mi cuenta / Ingresar</Text>
        </Pressable>
      )}

      {errorSesion !== "" && (
        <Text style={{ color: "#B45309" }}>{errorSesion}</Text>
      )}

      <Pressable
        style={estilos.botonEscanear}
        onPress={() => router.push("/escanear")}
      >
        <Text style={estilos.textoEscanear}>Escanear QR</Text>
      </Pressable>

      <Pressable
        style={estilos.botonEscanear}
        onPress={() => router.push("/mapa")}
      >
        <Text style={estilos.textoEscanear}>Ver mapa turístico</Text>
      </Pressable>

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

      <Pressable
        style={[
          estilos.botonFavoritos,
          soloFavoritos && estilos.botonFavoritosActivo,
        ]}
        onPress={() => setSoloFavoritos(!soloFavoritos)}
      >
        <Text
          style={[
            estilos.textoFavoritos,
            soloFavoritos && estilos.textoFavoritosActivo,
          ]}
        >
          {soloFavoritos
            ? "♥ Mostrando favoritos"
            : `♡ Ver solo favoritos (${cantidadFavoritosVisibles})`}
        </Text>
      </Pressable>

      {error || errorFavoritos ? (
        <Text>{error || errorFavoritos}</Text>
      ) : cargando || !favoritosListos ? (
        <ActivityIndicator />
      ) : (
        <FlatList
          data={lugaresFiltrados}
          keyExtractor={(item) => item.id}
          ListEmptyComponent={<Text>No se encontraron lugares.</Text>}
          renderItem={({ item }) => {
            const categoria = categorias.find(
              (categoria) => categoria.id === item.categoriaId,
            );

            const esFavorito = favoritos.includes(item.id);

            return (
              <View style={estilos.tarjeta}>
                <Pressable
                  style={estilos.contenidoTarjeta}
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
                    {item.nombre}
                  </Text>

                  <Text style={estilos.descripcionTarjeta}>
                    {item.descripcionCorta}
                  </Text>
                </Pressable>

                <Pressable
                  style={estilos.botonCorazon}
                  onPress={() => cambiarFavorito(item.id)}
                  accessibilityRole="button"
                  accessibilityLabel={
                    esFavorito ? "Quitar de favoritos" : "Agregar a favoritos"
                  }
                >
                  <Text
                    style={[
                      estilos.corazon,
                      esFavorito && estilos.corazonActivo,
                    ]}
                  >
                    {esFavorito ? "♥" : "♡"}
                  </Text>
                </Pressable>
              </View>
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
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    elevation: 2,
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
  botonEscanear: {
    backgroundColor: "#2563EB",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 15,
  },
  textoEscanear: {
    color: "#FFFFFF",
    fontWeight: "bold",
  },
  botonFavoritos: {
    padding: 12,
    borderWidth: 1,
    borderColor: "#CCCCCC",
    borderRadius: 8,
    marginBottom: 15,
    alignItems: "center",
  },
  botonFavoritosActivo: {
    backgroundColor: "#2563EB",
    borderColor: "#2563EB",
  },
  textoFavoritos: {
    fontWeight: "bold",
    color: "#333333",
  },
  textoFavoritosActivo: {
    color: "#FFFFFF",
  },
  contenidoTarjeta: {
    flex: 1,
    minWidth: 0,
  },
  descripcionTarjeta: {
    fontSize: 14,
    color: "#475569",
    lineHeight: 20,
  },
  botonCorazon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 10,
  },
  corazon: {
    fontSize: 22,
    color: "#94A3B8",
  },
  corazonActivo: {
    color: "#E11D48",
  },
  botonIngresar: {
    padding: 12,
    alignItems: "center",
    marginBottom: 10,
  },
  textoIngresar: {
    color: "#2563EB",
    fontWeight: "bold",
  },
  resumenSesion: {
    marginBottom: 14,
  },
  botonCerrarSesion: {
    alignSelf: "flex-start",
    paddingVertical: 10,
  },
  textoCerrarSesion: {
    color: "#B91C1C",
    fontSize: 14,
  },
});
