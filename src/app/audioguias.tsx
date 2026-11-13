import { AudioguiaServicio } from "@/servicios/audioguia.servicio";
import type { AudioguiaItem } from "@/tipos/agenda";
import {
  setAudioModeAsync,
  useAudioPlayer,
  useAudioPlayerStatus,
} from "expo-audio";
import { getNetworkStateAsync } from "expo-network";
import { useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

function formatearSegundos(segundos: number): string {
  if (!Number.isFinite(segundos) || segundos < 0) return "0:00";
  const minutos = Math.floor(segundos / 60);
  return `${minutos}:${String(Math.floor(segundos % 60)).padStart(2, "0")}`;
}

export default function AudioguiasScreen() {
  const { lugarId } = useLocalSearchParams<{ lugarId?: string }>();
  const [audioguias, setAudioguias] = useState<AudioguiaItem[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [desdeCache, setDesdeCache] = useState(false);
  const [audioActivo, setAudioActivo] = useState<AudioguiaItem | null>(null);
  const [descargados, setDescargados] = useState<Record<string, boolean>>({});
  const [descargando, setDescargando] = useState<string | null>(null);
  const player = useAudioPlayer(null);
  const status = useAudioPlayerStatus(player);

  useEffect(() => {
    void setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: true,
      interruptionMode: "doNotMix",
    }).catch((e) => console.warn("No se pudo configurar el audio:", e));
  }, []);

  useEffect(() => {
    let activo = true;
    async function cargar() {
      try {
        setError("");
        const respuesta = await AudioguiaServicio.obtenerTodas();
        const estados: Record<string, boolean> = {};
        for (const item of respuesta.audios) {
          estados[item.id] = await AudioguiaServicio.estaDescargado(item);
        }
        if (!activo) return;
        setAudioguias(respuesta.audios);
        setDescargados(estados);
        setDesdeCache(respuesta.desdeCache);
      } catch (e) {
        if (activo)
          setError(
            e instanceof Error
              ? e.message
              : "No se pudieron cargar las audioguías.",
          );
      } finally {
        if (activo) setCargando(false);
      }
    }
    void cargar();
    return () => {
      activo = false;
    };
  }, []);

  async function alternarPlayPausa(item: AudioguiaItem) {
    try {
      if (audioActivo?.id === item.id && status.playing) {
        player.pause();
        return;
      }

      if (!descargados[item.id]) {
        const red = await getNetworkStateAsync();
        if (red.isConnected === false || red.isInternetReachable === false) {
          Alert.alert(
            "Audioguía no disponible sin conexión",
            "Esta audioguía todavía no está descargada. Conectate a internet y descargala para escucharla sin conexión.",
          );
          return;
        }
      }

      if (audioActivo?.id === item.id) {
        player.play();
        return;
      }

      player.pause();
      const uri = descargados[item.id]
        ? AudioguiaServicio.obtenerRutaLocal(item)
        : item.url;
      player.replace(uri);
      player.setActiveForLockScreen(true, {
        title: item.tituloLugar,
        artist: "Mi Ciudad — Colón",
        albumTitle: "Audioguías turísticas",
      });
      setAudioActivo(item);
      player.play();
    } catch (e) {
      Alert.alert(
        "Reproducción",
        e instanceof Error ? e.message : "No se pudo reproducir la audioguía.",
      );
    }
  }

  async function gestionarDescarga(item: AudioguiaItem) {
    if (descargando) return;
    setDescargando(item.id);
    try {
      if (descargados[item.id]) {
        if (audioActivo?.id === item.id) {
          player.pause();
          player.setActiveForLockScreen(false);
          setAudioActivo(null);
        }
        await AudioguiaServicio.eliminarDescarga(item);
        setDescargados((anterior) => ({ ...anterior, [item.id]: false }));
        Alert.alert(
          "Descarga eliminada",
          "Se eliminó la copia local de la audioguía.",
        );
      } else {
        await AudioguiaServicio.descargarParaOffline(item);
        setDescargados((anterior) => ({ ...anterior, [item.id]: true }));
        Alert.alert("Audioguía guardada", "Ya podés escucharla sin internet.");
      }
    } catch (e) {
      Alert.alert(
        "Descarga",
        e instanceof Error ? e.message : "No se pudo completar la descarga.",
      );
    } finally {
      setDescargando(null);
    }
  }

  const ordenadas = [...audioguias].sort((a, b) => {
    if (a.lugarId === lugarId) return -1;
    if (b.lugarId === lugarId) return 1;
    return a.tituloLugar.localeCompare(b.tituloLugar, "es");
  });

  return (
    <SafeAreaView style={styles.contenedor} edges={["top"]}>
      <View style={styles.cabecera}>
        <Text style={styles.subtitulo}>HISTORIAS PARA ESCUCHAR</Text>
        <Text style={styles.titulo}>Audioguías turísticas</Text>
        {desdeCache && (
          <Text style={styles.advertencia}>
            Catálogo de audioguías guardado en este dispositivo.
          </Text>
        )}
        {status.error && (
          <Text style={styles.advertencia}>Error de audio: {status.error}</Text>
        )}
      </View>
      {cargando ? (
        <View style={styles.centro}>
          <ActivityIndicator size="large" color="#185F65" />
          <Text>Cargando audioguías...</Text>
        </View>
      ) : error ? (
        <View style={styles.centro}>
          <Text style={styles.advertencia}>{error}</Text>
        </View>
      ) : (
        <FlatList
          data={ordenadas}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.lista}
          ListEmptyComponent={
            <View style={styles.centro}>
              <Text style={styles.textoVacio}>
                Todavía no hay audioguías disponibles en el catálogo de la API.
              </Text>
            </View>
          }
          renderItem={({ item }) => {
            const activa = audioActivo?.id === item.id;
            const reproduciendo = activa && status.playing;
            const descargado = Boolean(descargados[item.id]);
            const duracion =
              activa && status.duration > 0
                ? status.duration
                : item.duracionSegundos;
            const porcentaje =
              activa && duracion > 0
                ? Math.min(
                    100,
                    Math.max(0, (status.currentTime / duracion) * 100),
                  )
                : 0;
            return (
              <View style={[styles.tarjeta, activa && styles.tarjetaActiva]}>
                <Text style={styles.nombrePista}>{item.tituloLugar}</Text>
                <Text style={styles.detalles}>
                  Duración: {formatearSegundos(item.duracionSegundos)} ·{" "}
                  {item.idioma.toUpperCase()}
                </Text>
                {descargado && (
                  <Text style={styles.badgeOffline}>
                    Disponible sin conexión
                  </Text>
                )}
                {activa && (
                  <View style={styles.progreso}>
                    <View style={styles.barraFondo}>
                      <View
                        style={[
                          styles.barraRelleno,
                          { width: `${porcentaje}%` },
                        ]}
                      />
                    </View>
                    <Text style={styles.detalles}>
                      {formatearSegundos(status.currentTime)} /{" "}
                      {formatearSegundos(duracion)}
                    </Text>
                  </View>
                )}
                <View style={styles.filaBotones}>
                  {activa && (
                    <Pressable
                      style={styles.botonSecundario}
                      onPress={() =>
                        void player.seekTo(Math.max(0, status.currentTime - 15))
                      }
                    >
                      <Text style={styles.textoSecundario}>-15s</Text>
                    </Pressable>
                  )}
                  <Pressable
                    style={styles.botonPrincipal}
                    onPress={() => void alternarPlayPausa(item)}
                  >
                    <Text style={styles.textoPrincipal}>
                      {reproduciendo ? "Pausar" : "Reproducir"}
                    </Text>
                  </Pressable>
                  {activa && (
                    <Pressable
                      style={styles.botonSecundario}
                      onPress={() =>
                        void player.seekTo(
                          Math.min(duracion, status.currentTime + 15),
                        )
                      }
                    >
                      <Text style={styles.textoSecundario}>+15s</Text>
                    </Pressable>
                  )}
                  <Pressable
                    disabled={descargando !== null}
                    style={styles.botonDescarga}
                    onPress={() => void gestionarDescarga(item)}
                  >
                    <Text style={styles.textoSecundario}>
                      {descargando === item.id
                        ? "..."
                        : descargado
                          ? "Borrar"
                          : "Descargar"}
                    </Text>
                  </Pressable>
                </View>
              </View>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  contenedor: { flex: 1, backgroundColor: "#F6F8F5" },
  cabecera: { paddingHorizontal: 18, paddingTop: 12, paddingBottom: 12 },
  subtitulo: {
    color: "#185F65",
    fontWeight: "800",
    fontSize: 14,
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  titulo: { color: "#244243", fontSize: 27, fontWeight: "800", marginTop: 4 },
  advertencia: { color: "#855126", fontSize: 15, lineHeight: 21, marginTop: 8 },
  centro: {
    padding: 25,
    minHeight: 140,
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
    gap: 10,
  },
  textoVacio: {
    color: "#56706E",
    fontSize: 16,
    lineHeight: 23,
    textAlign: "center",
  },
  lista: {
    paddingHorizontal: 18,
    paddingTop: 7,
    paddingBottom: 30,
    flexGrow: 1,
  },
  tarjeta: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 17,
    marginBottom: 13,
    borderWidth: 1,
    borderColor: "#DFE9E3",
    gap: 12,
  },
  tarjetaActiva: { borderColor: "#185F65", borderWidth: 2 },
  nombrePista: {
    fontSize: 19,
    fontWeight: "800",
    color: "#244243",
    lineHeight: 25,
  },
  detalles: { color: "#56706E", fontSize: 15, lineHeight: 21 },
  badgeOffline: { color: "#277245", fontSize: 15, fontWeight: "800" },
  progreso: { gap: 8 },
  barraFondo: {
    backgroundColor: "#E3EDE7",
    height: 9,
    borderRadius: 6,
    overflow: "hidden",
  },
  barraRelleno: { backgroundColor: "#185F65", height: 9 },
  filaBotones: {
    flexDirection: "row",
    alignItems: "stretch",
    gap: 6,
    flexWrap: "wrap",
  },
  botonPrincipal: {
    backgroundColor: "#185F65",
    borderRadius: 12,
    minHeight: 48,
    paddingHorizontal: 15,
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  textoPrincipal: { color: "#FFFFFF", fontWeight: "800", fontSize: 16 },
  botonSecundario: {
    minHeight: 48,
    minWidth: 51,
    paddingHorizontal: 12,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#E6F1ED",
  },
  botonDescarga: {
    minHeight: 48,
    paddingHorizontal: 12,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#EAF0EB",
  },
  textoSecundario: { color: "#185F65", fontWeight: "800", fontSize: 15 },
});
