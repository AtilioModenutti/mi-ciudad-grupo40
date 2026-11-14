import { router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
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
  const [cuentaExpandida, setCuentaExpandida] = useState(false);
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

  const accesos = [
    {
      titulo: "Mapa turístico",
      descripcion: "Ubicá lugares",
      icono: "🗺️",
      ruta: "/mapa" as const,
    },
    {
      titulo: "Agenda",
      descripcion: "Eventos y ferias",
      icono: "📅",
      ruta: "/agenda" as const,
    },
    {
      titulo: "Audioguías",
      descripcion: "Escuchá Colón",
      icono: "🎧",
      ruta: "/audioguias" as const,
    },
    {
      titulo: "Mi recorrido",
      descripcion: "Tus visitas",
      icono: "👣",
      ruta: "/visitas" as const,
    },
  ];

  return (
    <SafeAreaView style={estilos.pantalla} edges={["top"]}>
      <FlatList
        style={estilos.lista}
        contentContainerStyle={estilos.contenidoLista}
        data={error ? [] : lugaresFiltrados}
        keyExtractor={(item) => item.id}
        removeClippedSubviews={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
        extraData={[
          favoritos,
          favoritosEnProceso,
          favoritosSoloLectura,
          errorFavoritos,
        ]}
        refreshControl={
          <RefreshControl
            refreshing={cargando}
            onRefresh={() => setRecargaCatalogo((actual) => actual + 1)}
            colors={["#16666B"]}
            tintColor="#16666B"
          />
        }
        ListHeaderComponent={
          <View>
            <View style={estilos.hero}>
              <View style={estilos.aroDecorativo} pointerEvents="none" />
              <View style={estilos.heroFila}>
                <View style={estilos.heroLogoFondo}>
                  <Image
                    source={require("../../assets/branding/mi-colon-simbolo.png")}
                    style={estilos.heroLogo}
                    resizeMode="contain"
                    accessibilityLabel="Logo de Mi Colón: río, sol y ubicación"
                  />
                </View>
                <View style={estilos.heroTitulos}>
                  <Text style={estilos.ubicacion}>COLÓN · ENTRE RÍOS</Text>
                  <Text style={estilos.titulo}>Mi Colón</Text>
                </View>
              </View>
              <Text style={estilos.subtitulo}>
                Tu guía para descubrir Colón. Lugares, historias y experiencias
                para disfrutar.
              </Text>
            </View>

            {cargandoSesion ? (
              <View style={estilos.cuentaCompacta}>
                <ActivityIndicator color="#16666B" />
                <Text style={estilos.textoSecundario}>
                  Recuperando sesión...
                </Text>
              </View>
            ) : sesionBloqueada ? (
              <View style={estilos.cuentaCompleta}>
                <Text style={estilos.cuentaTitulo}>
                  Tu sesión está protegida
                </Text>
                <Text style={estilos.textoSecundario}>
                  Desbloqueala para acceder a tus datos.
                </Text>
                <Pressable
                  style={estilos.botonPrimario}
                  onPress={desbloquearSesion}
                  disabled={verificandoBiometria}
                  accessibilityRole="button"
                >
                  <Text style={estilos.botonPrimarioTexto}>
                    {verificandoBiometria
                      ? "Verificando..."
                      : "Desbloquear con biometría"}
                  </Text>
                </Pressable>
                <Pressable
                  style={estilos.botonSecundario}
                  onPress={() => router.push("/ingresar")}
                  accessibilityRole="button"
                >
                  <Text style={estilos.botonSecundarioTexto}>
                    Ingresar con contraseña
                  </Text>
                </Pressable>
              </View>
            ) : usuario ? (
              <View style={estilos.cuentaCompleta}>
                <View style={estilos.cuentaFila}>
                  <View style={estilos.avatar}>
                    <Text style={estilos.avatarTexto}>
                      {usuario.nombre?.trim().charAt(0).toUpperCase() || "✓"}
                    </Text>
                  </View>
                  <View style={estilos.cuentaDatos}>
                    <Text style={estilos.cuentaSaludo}>
                      ¡Hola, {usuario.nombre}!
                    </Text>
                    <Text style={estilos.textoSecundario}>
                      Tu cuenta de viajero
                    </Text>
                  </View>
                  <Pressable
                    style={estilos.botonCuenta}
                    onPress={() => setCuentaExpandida((actual) => !actual)}
                    accessibilityRole="button"
                    accessibilityLabel={
                      cuentaExpandida
                        ? "Cerrar opciones de cuenta"
                        : "Abrir opciones de cuenta"
                    }
                    accessibilityState={{ expanded: cuentaExpandida }}
                  >
                    <Text style={estilos.botonCuentaTexto}>
                      {cuentaExpandida ? "Cerrar −" : "Mi cuenta +"}
                    </Text>
                  </Pressable>
                </View>
                {cuentaExpandida && (
                  <View style={estilos.opcionesCuenta}>
                    <Pressable
                      style={[
                        estilos.opcionCuenta,
                        (!preferenciaLista || guardandoPreferencia) &&
                          estilos.desactivado,
                      ]}
                      onPress={cambiarPreferenciaBiometria}
                      disabled={!preferenciaLista || guardandoPreferencia}
                      accessibilityRole="button"
                    >
                      <Text style={estilos.opcionCuentaTexto}>
                        {!preferenciaLista
                          ? "Cargando biometría..."
                          : guardandoPreferencia
                            ? "Guardando..."
                            : biometriaHabilitada
                              ? "Desactivar acceso biométrico"
                              : "Activar acceso biométrico"}
                      </Text>
                    </Pressable>
                    <Pressable
                      style={estilos.opcionCuenta}
                      onPress={cerrarSesion}
                      accessibilityRole="button"
                    >
                      <Text style={estilos.textoCerrarSesion}>
                        Cerrar sesión
                      </Text>
                    </Pressable>
                  </View>
                )}
              </View>
            ) : (
              <Pressable
                style={estilos.cuentaCompacta}
                onPress={() => router.push("/ingresar")}
                accessibilityRole="button"
                accessibilityLabel="Ingresar a Mi Colón"
              >
                <View style={estilos.avatar}>
                  <Text style={estilos.avatarTexto}>👤</Text>
                </View>
                <View style={estilos.cuentaDatos}>
                  <Text style={estilos.cuentaSaludo}>Recorré a tu manera</Text>
                  <Text style={estilos.textoSecundario}>
                    Ingresá para guardar tus visitas
                  </Text>
                </View>
                <Text style={estilos.enlaceCuenta}>Ingresar ›</Text>
              </Pressable>
            )}

            {errorSesion !== "" && (
              <View style={estilos.avisoAdvertencia}>
                <Text style={estilos.textoAdvertencia}>{errorSesion}</Text>
              </View>
            )}

            {(sinConexion || desdeCache) && (
              <View style={estilos.avisoConexion}>
                <Text style={estilos.textoConexion}>
                  {desdeCache
                    ? "📦 Estás viendo información guardada en el teléfono."
                    : "📶 Sin conexión. Algunas funciones necesitan internet."}
                </Text>
                <Pressable
                  style={estilos.reintentar}
                  onPress={() => setRecargaCatalogo((actual) => actual + 1)}
                  accessibilityRole="button"
                >
                  <Text style={estilos.reintentarTexto}>
                    Actualizar catálogo
                  </Text>
                </Pressable>
              </View>
            )}

            <View style={estilos.cabeceraSeccion}>
              <Text style={estilos.seccionTitulo}>¿Qué querés hacer?</Text>
              <Text style={estilos.seccionSubtitulo}>
                Elegí cómo explorar la ciudad
              </Text>
            </View>
            <View style={estilos.cuadriculaAccesos}>
              {accesos.map((acceso) => (
                <Pressable
                  key={acceso.ruta}
                  style={estilos.tarjetaAcceso}
                  onPress={() => router.push(acceso.ruta)}
                  accessibilityRole="button"
                  accessibilityLabel={acceso.titulo}
                >
                  <Text style={estilos.iconoAcceso}>{acceso.icono}</Text>
                  <Text style={estilos.tituloAcceso}>{acceso.titulo}</Text>
                  <Text style={estilos.descripcionAcceso}>
                    {acceso.descripcion}
                  </Text>
                </Pressable>
              ))}
            </View>

            <View style={estilos.cabeceraCatalogo}>
              <View style={estilos.catalogoTituloFila}>
                <Text style={estilos.seccionTitulo}>Explorar lugares</Text>
                {!cargando && (
                  <Text style={estilos.contador}>
                    {lugaresFiltrados.length}{" "}
                    {lugaresFiltrados.length === 1 ? "lugar" : "lugares"}
                  </Text>
                )}
              </View>
              <Text style={estilos.seccionSubtitulo}>
                Encontrá tu próximo lugar favorito
              </Text>
            </View>

            <View style={estilos.buscadorContenedor}>
              <Text style={estilos.iconoBuscar}>⌕</Text>
              <TextInput
                style={estilos.buscador}
                placeholder="Buscar lugares turísticos"
                placeholderTextColor="#6F7E80"
                value={busqueda}
                onChangeText={setBusqueda}
                returnKeyType="search"
                accessibilityLabel="Buscar lugares turísticos"
              />
              {busqueda.length > 0 && (
                <Pressable
                  style={estilos.limpiarBusqueda}
                  onPress={() => setBusqueda("")}
                  accessibilityRole="button"
                  accessibilityLabel="Limpiar búsqueda"
                >
                  <Text style={estilos.limpiarBusquedaTexto}>✕</Text>
                </Pressable>
              )}
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              removeClippedSubviews={false}
              style={estilos.contenedorFiltros}
              contentContainerStyle={estilos.contenidoFiltros}
              keyboardShouldPersistTaps="handled"
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
                  accessibilityState={{
                    selected: categoriaSeleccionada === null,
                  }}
                >
                  <Text
                    style={[
                      estilos.textoFiltro,
                      categoriaSeleccionada === null &&
                        estilos.textoFiltroActivo,
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
                      categoriaSeleccionada === categoria.id &&
                        estilos.filtroActivo,
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
                estilos.favoritosFiltro,
                soloFavoritos && estilos.favoritosFiltroActivo,
              ]}
              onPress={() => setSoloFavoritos((actual) => !actual)}
              accessibilityRole="button"
              accessibilityState={{ selected: soloFavoritos }}
            >
              <Text
                style={[
                  estilos.favoritosFiltroTexto,
                  soloFavoritos && estilos.favoritosFiltroTextoActivo,
                ]}
              >
                {soloFavoritos
                  ? "♥  Mostrando favoritos"
                  : `♡  Solo mis favoritos (${cantidadFavoritosVisibles})`}
              </Text>
            </Pressable>

            {errorCategorias !== "" && (
              <View style={estilos.avisoAdvertencia}>
                <Text style={estilos.textoAdvertencia}>{errorCategorias}</Text>
              </View>
            )}
            {errorFavoritos !== "" && (
              <View style={estilos.avisoAdvertencia}>
                <Text style={estilos.textoAdvertencia}>{errorFavoritos}</Text>
                <Pressable
                  style={estilos.reintentar}
                  onPress={reintentarFavoritos}
                  accessibilityRole="button"
                >
                  <Text style={estilos.reintentarTexto}>
                    Reintentar favoritos
                  </Text>
                </Pressable>
              </View>
            )}
            {favoritosSoloLectura && favoritosListos && (
              <View style={estilos.avisoConexion}>
                <Text style={estilos.textoConexion}>
                  Tus favoritos están en modo lectura hasta recuperar internet.
                </Text>
              </View>
            )}
          </View>
        }
        ListEmptyComponent={
          <View style={estilos.estadoVacio}>
            {error ? (
              <>
                <Text style={estilos.estadoVacioTitulo}>
                  No pudimos cargar los lugares
                </Text>
                <Text style={estilos.textoSecundario}>{error}</Text>
                <Pressable
                  style={estilos.botonPrimario}
                  onPress={() => setRecargaCatalogo((actual) => actual + 1)}
                  accessibilityRole="button"
                >
                  <Text style={estilos.botonPrimarioTexto}>
                    Intentar otra vez
                  </Text>
                </Pressable>
              </>
            ) : cargando || (!favoritosListos && !sesionBloqueada) ? (
              <>
                <ActivityIndicator color="#16666B" size="large" />
                <Text style={estilos.textoSecundario}>
                  Cargando lugares turísticos...
                </Text>
              </>
            ) : (
              <>
                <Text style={estilos.estadoVacioIcono}>🌿</Text>
                <Text style={estilos.estadoVacioTitulo}>
                  {soloFavoritos
                    ? "Todavía no hay favoritos aquí"
                    : "No encontramos lugares"}
                </Text>
                <Text style={estilos.estadoVacioTexto}>
                  {soloFavoritos
                    ? "Probá otra categoría o desactivá el filtro de favoritos."
                    : "Probá con otro nombre o una categoría diferente."}
                </Text>
                {(soloFavoritos ||
                  categoriaSeleccionada !== null ||
                  busqueda !== "") && (
                  <Pressable
                    style={estilos.botonSecundario}
                    onPress={() => {
                      setSoloFavoritos(false);
                      setCategoriaSeleccionada(null);
                      setBusqueda("");
                    }}
                    accessibilityRole="button"
                  >
                    <Text style={estilos.botonSecundarioTexto}>
                      Ver todos los lugares
                    </Text>
                  </Pressable>
                )}
              </>
            )}
          </View>
        }
        renderItem={({ item }) => {
          const categoria = categorias.find(
            (actual) => actual.id === item.categoriaId,
          );
          const esFavorito = favoritos.includes(item.id);
          const imagen = item.imagenes?.[0];
          const favoritoDeshabilitado =
            !favoritosListos ||
            favoritosEnProceso ||
            favoritosSoloLectura ||
            errorFavoritos !== "";

          return (
            <View style={estilos.tarjetaLugar}>
              <Pressable
                style={estilos.enlaceLugar}
                onPress={() =>
                  router.push({
                    pathname: "/lugar/[id]",
                    params: { id: item.id },
                  })
                }
                accessibilityRole="button"
                accessibilityLabel={`Ver detalles de ${item.nombre}`}
              >
                {imagen ? (
                  <Image
                    source={{ uri: imagen }}
                    style={estilos.imagenLugar}
                    resizeMode="cover"
                    accessibilityLabel={`Imagen de ${item.nombre}`}
                  />
                ) : (
                  <View style={estilos.imagenVacia}>
                    <Text style={estilos.imagenVaciaIcono}>🌿</Text>
                  </View>
                )}
                <View style={estilos.infoLugar}>
                  <View style={estilos.categoriaFila}>
                    <View
                      style={[
                        estilos.puntoCategoria,
                        { backgroundColor: categoria?.color ?? "#C8A16B" },
                      ]}
                    />
                    <Text style={estilos.categoriaTexto} numberOfLines={1}>
                      {categoria?.nombre ?? "Lugar turístico"}
                    </Text>
                  </View>
                  <Text style={estilos.nombreLugar} numberOfLines={2}>
                    {item.nombre}
                  </Text>
                  <Text style={estilos.descripcionLugar} numberOfLines={2}>
                    {item.descripcionCorta}
                  </Text>
                  <Text style={estilos.verDetalle}>Ver lugar ›</Text>
                </View>
              </Pressable>
              <Pressable
                style={[
                  estilos.botonCorazon,
                  favoritoDeshabilitado && estilos.desactivado,
                ]}
                onPress={() => void cambiarFavorito(item.id)}
                disabled={favoritoDeshabilitado}
                accessibilityRole="button"
                accessibilityLabel={
                  esFavorito
                    ? `Quitar ${item.nombre} de favoritos`
                    : `Agregar ${item.nombre} a favoritos`
                }
              >
                <Text
                  style={[estilos.corazon, esFavorito && estilos.corazonActivo]}
                >
                  {esFavorito ? "♥" : "♡"}
                </Text>
              </Pressable>
            </View>
          );
        }}
      />
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: "#F6F8F5" },
  lista: { flex: 1 },
  contenidoLista: { paddingHorizontal: 18, paddingTop: 12, paddingBottom: 36 },
  hero: {
    overflow: "hidden",
    backgroundColor: "#185F65",
    borderRadius: 22,
    paddingHorizontal: 22,
    paddingVertical: 20,
    minHeight: 136,
    justifyContent: "center",
    marginBottom: 12,
  },
  aroDecorativo: {
    position: "absolute",
    width: 155,
    height: 155,
    borderWidth: 26,
    borderColor: "#347A7E",
    borderRadius: 100,
    right: -45,
    top: -50,
    opacity: 0.72,
  },
  heroFila: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginBottom: 10,
  },
  heroLogoFondo: {
    width: 78,
    height: 78,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  heroLogo: { width: 70, height: 70 },
  heroTitulos: { flex: 1, minWidth: 0 },
  ubicacion: {
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 1.1,
    color: "#D7E9DF",
    marginBottom: 7,
  },
  titulo: { fontSize: 32, lineHeight: 38, fontWeight: "800", color: "#FFFFFF" },
  subtitulo: { marginTop: 4, fontSize: 16, lineHeight: 23, color: "#EDF5EE" },
  cuentaCompacta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 16,
    padding: 14,
    minHeight: 70,
    backgroundColor: "#FFFFFF",
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#E6ECE7",
  },
  cuentaCompleta: {
    backgroundColor: "#FFFFFF",
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E6ECE7",
    marginBottom: 10,
    gap: 10,
  },
  cuentaFila: { flexDirection: "row", alignItems: "center", gap: 10 },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#E9F3EB",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarTexto: { color: "#1D6467", fontSize: 21, fontWeight: "800" },
  cuentaDatos: { flex: 1, minWidth: 0 },
  cuentaSaludo: {
    color: "#253A3B",
    fontSize: 16,
    lineHeight: 22,
    fontWeight: "700",
  },
  cuentaTitulo: {
    color: "#243F3E",
    fontSize: 18,
    lineHeight: 24,
    fontWeight: "700",
  },
  textoSecundario: { fontSize: 15, lineHeight: 21, color: "#5E7070" },
  botonCuenta: {
    minHeight: 44,
    minWidth: 83,
    borderRadius: 12,
    backgroundColor: "#EBF3F0",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 10,
  },
  botonCuentaTexto: { fontSize: 15, fontWeight: "800", color: "#185F65" },
  enlaceCuenta: { color: "#185F65", fontSize: 15, fontWeight: "700" },
  opcionesCuenta: {
    paddingTop: 9,
    gap: 7,
    borderTopWidth: 1,
    borderTopColor: "#EDF1ED",
  },
  opcionCuenta: {
    minHeight: 48,
    paddingHorizontal: 12,
    justifyContent: "center",
    borderRadius: 10,
    backgroundColor: "#F4F7F4",
  },
  opcionCuentaTexto: { fontSize: 16, fontWeight: "600", color: "#185F65" },
  textoCerrarSesion: { fontSize: 16, fontWeight: "700", color: "#A23B38" },
  desactivado: { opacity: 0.45 },
  botonPrimario: {
    backgroundColor: "#185F65",
    minHeight: 48,
    borderRadius: 12,
    paddingHorizontal: 16,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 8,
  },
  botonPrimarioTexto: { fontSize: 16, fontWeight: "700", color: "#FFFFFF" },
  botonSecundario: {
    minHeight: 48,
    borderRadius: 12,
    paddingHorizontal: 16,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#C6D8D2",
    backgroundColor: "#FFFFFF",
    marginTop: 5,
  },
  botonSecundarioTexto: { fontSize: 16, fontWeight: "700", color: "#185F65" },
  avisoConexion: {
    padding: 14,
    marginBottom: 12,
    borderRadius: 14,
    backgroundColor: "#EAF1EB",
    gap: 8,
  },
  textoConexion: { color: "#2C605A", fontSize: 15, lineHeight: 22 },
  avisoAdvertencia: {
    backgroundColor: "#FFF2E2",
    padding: 14,
    borderRadius: 14,
    marginBottom: 12,
    gap: 8,
  },
  textoAdvertencia: { fontSize: 15, lineHeight: 22, color: "#855126" },
  reintentar: {
    alignSelf: "flex-start",
    minHeight: 44,
    justifyContent: "center",
    paddingHorizontal: 3,
  },
  reintentarTexto: { fontSize: 15, fontWeight: "800", color: "#145E63" },
  cabeceraSeccion: { marginTop: 12, marginBottom: 12 },
  seccionTitulo: {
    fontSize: 22,
    lineHeight: 29,
    fontWeight: "800",
    color: "#253D3D",
  },
  seccionSubtitulo: {
    fontSize: 15,
    lineHeight: 21,
    color: "#627574",
    marginTop: 2,
  },
  cuadriculaAccesos: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: 10,
    marginBottom: 17,
  },
  tarjetaAcceso: {
    width: "48.5%",
    minHeight: 113,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E6EDE9",
    paddingHorizontal: 14,
    paddingVertical: 12,
    justifyContent: "center",
    gap: 2,
  },
  iconoAcceso: { fontSize: 28, lineHeight: 34, marginBottom: 2 },
  tituloAcceso: {
    fontSize: 16,
    lineHeight: 21,
    fontWeight: "800",
    color: "#254647",
  },
  descripcionAcceso: { fontSize: 15, lineHeight: 20, color: "#697C79" },
  cabeceraCatalogo: { marginBottom: 12 },
  catalogoTituloFila: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  contador: { fontSize: 15, color: "#376C68", fontWeight: "700" },
  buscadorContenedor: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 54,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#CBDAD3",
    borderRadius: 14,
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  iconoBuscar: {
    fontSize: 30,
    lineHeight: 35,
    color: "#587A77",
    marginRight: 8,
  },
  buscador: {
    flex: 1,
    minWidth: 0,
    fontSize: 16,
    color: "#233B3D",
    paddingVertical: 9,
  },
  limpiarBusqueda: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  limpiarBusquedaTexto: { fontSize: 19, color: "#4D7270" },
  contenedorFiltros: { flexGrow: 0, flexShrink: 0, marginBottom: 10 },
  contenidoFiltros: { alignItems: "center", paddingRight: 14 },
  filaFiltros: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 48,
    gap: 8,
  },
  filtro: {
    borderWidth: 1,
    borderColor: "#C9D9D2",
    borderRadius: 50,
    backgroundColor: "#FFFFFF",
    minHeight: 44,
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  filtroActivo: { backgroundColor: "#185F65", borderColor: "#185F65" },
  textoFiltro: { fontSize: 15, fontWeight: "700", color: "#3C5758" },
  textoFiltroActivo: { color: "#FFFFFF" },
  favoritosFiltro: {
    alignSelf: "flex-start",
    minHeight: 44,
    borderRadius: 50,
    paddingHorizontal: 16,
    justifyContent: "center",
    backgroundColor: "#FCEEF0",
    borderColor: "#EED2D8",
    borderWidth: 1,
    marginBottom: 15,
  },
  favoritosFiltroActivo: { backgroundColor: "#A63756", borderColor: "#A63756" },
  favoritosFiltroTexto: { color: "#963652", fontSize: 15, fontWeight: "700" },
  favoritosFiltroTextoActivo: { color: "#FFFFFF" },
  tarjetaLugar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E5ECE7",
    padding: 9,
    marginBottom: 12,
  },
  enlaceLugar: {
    flex: 1,
    flexDirection: "row",
    minWidth: 0,
    alignItems: "center",
  },
  imagenLugar: {
    width: 100,
    height: 116,
    borderRadius: 11,
    backgroundColor: "#E9EFE8",
  },
  imagenVacia: {
    width: 100,
    height: 116,
    borderRadius: 11,
    backgroundColor: "#EAF0E8",
    justifyContent: "center",
    alignItems: "center",
  },
  imagenVaciaIcono: { fontSize: 36 },
  infoLugar: {
    flex: 1,
    minWidth: 0,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  categoriaFila: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  puntoCategoria: { width: 8, height: 8, borderRadius: 4 },
  categoriaTexto: {
    flex: 1,
    minWidth: 0,
    color: "#617573",
    fontSize: 15,
    lineHeight: 20,
    fontWeight: "600",
  },
  nombreLugar: {
    fontSize: 17,
    lineHeight: 22,
    fontWeight: "800",
    color: "#263D3E",
    marginBottom: 3,
  },
  descripcionLugar: { fontSize: 15, lineHeight: 19, color: "#596C6C" },
  verDetalle: {
    fontSize: 15,
    color: "#185F65",
    fontWeight: "800",
    marginTop: 6,
  },
  botonCorazon: {
    width: 44,
    minHeight: 52,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 1,
  },
  corazon: { fontSize: 28, color: "#6B8280" },
  corazonActivo: { color: "#B32950" },
  estadoVacio: {
    marginTop: 5,
    paddingVertical: 34,
    paddingHorizontal: 20,
    alignItems: "center",
    gap: 8,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
  },
  estadoVacioIcono: { fontSize: 34 },
  estadoVacioTitulo: {
    color: "#233F3F",
    fontSize: 18,
    fontWeight: "800",
    textAlign: "center",
  },
  estadoVacioTexto: {
    color: "#687A78",
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center",
  },
});
