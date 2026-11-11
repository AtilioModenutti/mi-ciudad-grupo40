import { router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
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
import { comprobarBiometria, verificarBiometria } from "@/servicios/biometria";
import {
  guardarBiometriaHabilitada,
  obtenerBiometriaHabilitada,
} from "@/servicios/preferencias-biometria";

import * as Network from "expo-network";

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
  const {
    favoritos,
    cambiarFavorito,
    favoritosListos,
    favoritosEnProceso,
    errorFavoritos,
    reintentarFavoritos,
    favoritosSoloLectura,
  } = useFavoritos();

  const {
    usuario,
    cargandoSesion,
    errorSesion,
    cerrarSesion,
    sesionBloqueada,
    verificandoBiometria,
    desbloquearSesion,
    actualizarBiometria,
  } = useSesion();

  const [biometriaHabilitada, setBiometriaHabilitada] = useState(false);
  const [preferenciaLista, setPreferenciaLista] = useState(false);
  const [guardandoPreferencia, setGuardandoPreferencia] = useState(false);
  const usuarioId = usuario?.id;

  const estadoRed = Network.useNetworkState();

  const sinConexion =
    estadoRed.isConnected === false || estadoRed.isInternetReachable === false;

  const [desdeCache, setDesdeCache] = useState(false);
  const [recargaCatalogo, setRecargaCatalogo] = useState(0);
  const [errorCategorias, setErrorCategorias] = useState("");

  const estuvoSinConexion = useRef(false);

  useEffect(() => {
    let activo = true;
    setBiometriaHabilitada(false);
    setPreferenciaLista(false);

    if (!usuarioId) {
      setPreferenciaLista(true);
      return;
    }

    obtenerBiometriaHabilitada(usuarioId)
      .then((habilitada) => {
        if (activo) {
          setBiometriaHabilitada(habilitada);
        }
      })
      .catch(() => {
        if (activo) {
          Alert.alert(
            "Error",
            "No se pudo recuperar la preferencia biométrica.",
          );
        }
      })
      .finally(() => {
        if (activo) {
          setPreferenciaLista(true);
        }
      });

    return () => {
      activo = false;
    };
  }, [usuarioId]);

  useEffect(() => {
    if (sinConexion) {
      estuvoSinConexion.current = true;
    } else if (estuvoSinConexion.current) {
      estuvoSinConexion.current = false;
      setRecargaCatalogo((actual) => actual + 1);
    }
  }, [sinConexion]);

  async function cambiarPreferenciaBiometria() {
    if (!usuario || !preferenciaLista || guardandoPreferencia) {
      return;
    }

    setGuardandoPreferencia(true);

    try {
      if (!biometriaHabilitada) {
        const estado = await comprobarBiometria();
        if (estado !== "disponible") {
          Alert.alert(
            "Biometría",
            "Primero configurá una huella o rostro en el dispositivo.",
          );
          return;
        }

        const verificada = await verificarBiometria();
        if (!verificada) {
          Alert.alert("Biometría", "No se completó la verificación.");
          return;
        }
      }

      const nuevoValor = !biometriaHabilitada;
      await guardarBiometriaHabilitada(usuario.id, nuevoValor);
      setBiometriaHabilitada(nuevoValor);
      actualizarBiometria(nuevoValor);

      Alert.alert(
        "Preferencia guardada",
        nuevoValor
          ? "El reingreso biométrico quedó activado."
          : "El reingreso biométrico quedó desactivado.",
      );
    } catch {
      Alert.alert("Error", "No se pudo guardar la preferencia biométrica.");
    } finally {
      setGuardandoPreferencia(false);
    }
  }

  useEffect(() => {
    let activo = true;

    async function cargarCatalogo() {
      setCargando(true);
      setError("");

      const [resultadoLugares, resultadoCategorias] = await Promise.allSettled([
        obtenerLugares(),
        obtenerCategorias(),
      ]);

      if (!activo) {
        return;
      }

      if (resultadoLugares.status === "fulfilled") {
        setLugares(resultadoLugares.value.datos);
      } else {
        setError("No se pudieron cargar los lugares.");
      }

      if (resultadoCategorias.status === "fulfilled") {
        setCategorias(resultadoCategorias.value.datos);
        setErrorCategorias("");
      } else {
        setErrorCategorias("No se pudieron actualizar las categorías.");
      }

      setDesdeCache(
        (resultadoLugares.status === "fulfilled" &&
          resultadoLugares.value.desdeCache) ||
          (resultadoCategorias.status === "fulfilled" &&
            resultadoCategorias.value.desdeCache),
      );

      setCargando(false);
    }

    void cargarCatalogo();

    return () => {
      activo = false;
    };
  }, [recargaCatalogo]);

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

      {(sinConexion || desdeCache) && (
        <View style={estilos.avisoOffline}>
          <Text style={estilos.textoOffline}>
            {desdeCache
              ? "Mostrando información guardada en el dispositivo."
              : "Sin conexión. Algunas funciones requieren internet."}
          </Text>

          <Pressable
            onPress={() => setRecargaCatalogo((actual) => actual + 1)}
            accessibilityRole="button"
          >
            <Text style={estilos.textoIngresar}>Actualizar catálogo</Text>
          </Pressable>
        </View>
      )}

      {errorCategorias !== "" && (
        <Text style={estilos.textoOffline}>{errorCategorias}</Text>
      )}

      {cargandoSesion ? (
        <Text style={estilos.textoIngresar}>Recuperando sesión...</Text>
      ) : sesionBloqueada ? (
        <View style={estilos.resumenSesion}>
          <Text style={estilos.textoIngresar}>Sesión protegida</Text>

          <Pressable
            style={estilos.botonBiometria}
            onPress={desbloquearSesion}
            disabled={verificandoBiometria}
            accessibilityRole="button"
          >
            <Text style={estilos.textoIngresar}>
              {verificandoBiometria
                ? "Verificando..."
                : "Desbloquear con biometría"}
            </Text>
          </Pressable>

          <Pressable
            style={estilos.botonBiometria}
            onPress={() => router.push("/ingresar")}
            accessibilityRole="button"
          >
            <Text style={estilos.textoIngresar}>
              Ingresar con correo y contraseña
            </Text>
          </Pressable>
        </View>
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

          <Pressable
            style={[
              estilos.botonBiometria,
              (!preferenciaLista || guardandoPreferencia) && { opacity: 0.5 },
            ]}
            onPress={cambiarPreferenciaBiometria}
            disabled={!preferenciaLista || guardandoPreferencia}
            accessibilityRole="button"
          >
            <Text style={estilos.textoIngresar}>
              {!preferenciaLista
                ? "Cargando preferencia..."
                : guardandoPreferencia
                  ? "Guardando..."
                  : biometriaHabilitada
                    ? "Desactivar biometría"
                    : "Activar biometría"}
            </Text>
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
        accessibilityRole="button"
      >
        <Text style={estilos.textoEscanear}>Ver mapa turístico</Text>
      </Pressable>

      <TextInput
        style={estilos.buscador}
        placeholder="Buscar lugares"
        value={busqueda}
        onChangeText={setBusqueda}
      ></TextInput>

      {/* Una fila independiente evita que Android reutilice textos al cambiar el filtro. */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        removeClippedSubviews={false}
        style={estilos.contenedorFiltros}
        contentContainerStyle={estilos.contenidoFiltros}
      >
        <View
          key={`${categoriaSeleccionada ?? "todos"}-${categorias.length}`}
          collapsable={false}
          style={estilos.filaFiltros}
        >
          <Pressable
            style={[
              estilos.filtro,
              categoriaSeleccionada === null && estilos.filtroActivo,
            ]}
            onPress={() => setCategoriaSeleccionada(null)}
            accessibilityRole="button"
            accessibilityState={{ selected: categoriaSeleccionada === null }}
          >
            <Text
              style={[
                estilos.textoFiltro,
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
              accessibilityRole="button"
              accessibilityState={{
                selected: categoriaSeleccionada === categoria.id,
              }}
            >
              <Text
                style={[
                  estilos.textoFiltro,
                  categoriaSeleccionada === categoria.id &&
                    estilos.textoFiltroActivo,
                ]}
              >
                {categoria.nombre}
              </Text>
            </Pressable>
          ))}
        </View>
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

      {errorFavoritos !== "" && (
        <View style={estilos.avisoFavoritos}>
          <Text style={estilos.textoAvisoFavoritos}>{errorFavoritos}</Text>
          <Pressable onPress={reintentarFavoritos} accessibilityRole="button">
            <Text style={estilos.textoIngresar}>Reintentar favoritos</Text>
          </Pressable>
        </View>
      )}

      {favoritosSoloLectura && favoritosListos && (
        <View style={estilos.avisoFavoritos}>
          <Text style={estilos.textoAvisoFavoritos}>
            Favoritos guardados: solo lectura hasta recuperar conexión.
          </Text>
        </View>
      )}

      {error ? (
        <Text>{error}</Text>
      ) : cargando || (!favoritosListos && !sesionBloqueada) ? (
        <ActivityIndicator />
      ) : (
        <FlatList
          data={lugaresFiltrados}
          removeClippedSubviews={false}
          extraData={[
            favoritos,
            favoritosEnProceso,
            favoritosSoloLectura,
            errorFavoritos,
          ]}
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
                  style={[
                    estilos.botonCorazon,
                    (!favoritosListos ||
                      favoritosEnProceso ||
                      favoritosSoloLectura ||
                      errorFavoritos !== "") && { opacity: 0.5 },
                  ]}
                  onPress={() => void cambiarFavorito(item.id)}
                  disabled={
                    !favoritosListos ||
                    favoritosEnProceso ||
                    favoritosSoloLectura ||
                    errorFavoritos !== ""
                  }
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
  contenedorFiltros: {
    height: 50,
    flexGrow: 0,
    flexShrink: 0,
    marginBottom: 15,
  },
  contenidoFiltros: {
    alignItems: "center",
    paddingRight: 10,
  },
  filaFiltros: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 48,
  },
  filtro: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "#CCCCCC",
    borderRadius: 8,
    marginRight: 10,
  },
  textoFiltro: {
    fontSize: 14,
    lineHeight: 20,
    color: "#111111",
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
  avisoFavoritos: {
    padding: 10,
    marginBottom: 10,
    borderRadius: 8,
    backgroundColor: "#FEF3C7",
    gap: 8,
  },
  textoAvisoFavoritos: {
    color: "#92400E",
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
  botonBiometria: {
    alignSelf: "flex-start",
    paddingVertical: 10,
  },
  textoCerrarSesion: {
    color: "#B91C1C",
    fontSize: 14,
  },
  avisoOffline: {
    backgroundColor: "#EFF6FF",
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    gap: 8,
  },
  textoOffline: {
    color: "#1E40AF",
    fontSize: 14,
    marginBottom: 8,
  },
});
