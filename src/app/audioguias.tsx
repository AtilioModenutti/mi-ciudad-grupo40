// src/app/audioguias.tsx
import { AudioguiaServicio } from "@/servicios/audioguia.servicio";
import { AudioguiaItem } from "@/tipos/agenda";
import { AudioModule, useAudioPlayer, useAudioPlayerStatus } from "expo-audio";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function AudioguiasScreen() {
  const [audioguias, setAudioguias] = useState<AudioguiaItem[]>([]);
  const [cargando, setCargando] = useState(true);
  const [audioActivo, setAudioActivo] = useState<AudioguiaItem | null>(null);
  const [descargados, setDescargados] = useState<Record<string, boolean>>({});

  const player = useAudioPlayer(audioActivo ? audioActivo.url : null);
  const status = useAudioPlayerStatus(player);

  useEffect(() => {
    // 1. Configuración de reproducción en segundo plano (pantalla bloqueada / modo silencioso)
    if (Platform.OS !== "web") {
      AudioModule.setAudioModeAsync({
        playsInSilentMode: true,
      }).catch(() => {});
    }

    // 2. Carga inicial de pistas y verificación de descargas locales
    async function inicializar() {
      const lista = await AudioguiaServicio.obtenerTodas();
      setAudioguias(lista);

      const estados: Record<string, boolean> = {};
      for (const item of lista) {
        estados[item.id] = await AudioguiaServicio.estaDescargado(item.id);
      }
      setDescargados(estados);
      setCargando(false);
    }

    inicializar();
  }, []);

  const alternarPlayPausa = (item: AudioguiaItem) => {
    if (audioActivo?.id === item.id) {
      if (status.playing) {
        player.pause();
      } else {
        player.play();
      }
    } else {
      setAudioActivo(item);
      const esLocal = descargados[item.id];
      const fuente = esLocal
        ? AudioguiaServicio.obtenerRutaLocal(item.id)
        : item.url;
      player.replace(fuente);
      player.play();
    }
  };

  // Función de avance (+15 segundos) exigida en los requisitos
  const adelantar15s = () => {
    const nuevaPosicion = Math.min(
      status.currentTime + 15,
      status.duration || 9999,
    );
    player.seekTo(nuevaPosicion);
  };

  // Función de retroceso (-15 segundos)
  const retroceder15s = () => {
    const nuevaPosicion = Math.max(status.currentTime - 15, 0);
    player.seekTo(nuevaPosicion);
  };

  const gestionarDescargaOffline = async (item: AudioguiaItem) => {
    try {
      if (descargados[item.id]) {
        await AudioguiaServicio.eliminarDescarga(item.id);
        setDescargados((prev) => ({ ...prev, [item.id]: false }));
        Alert.alert(
          "Descarga eliminada",
          "Se liberó el almacenamiento local en el teléfono.",
        );
      } else {
        await AudioguiaServicio.descargarParaOffline(item);
        setDescargados((prev) => ({ ...prev, [item.id]: true }));
        Alert.alert(
          "Guardado sin conexión",
          "La audioguía está lista para escucharse en El Palmar sin señal de datos.",
        );
      }
    } catch {
      Alert.alert("Error", "No se pudo completar la descarga del audio.");
    }
  };

  const formatearSegundos = (seg: number) => {
    const m = Math.floor(seg / 60);
    const s = Math.floor(seg % 60);
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  return (
    <SafeAreaView style={styles.contenedor} edges={["top"]}>
      <View style={styles.cabecera}>
        <Text style={styles.subtitulo}>Archivo Histórico de Colón</Text>
        <Text style={styles.titulo}>Audioguías Turísticas</Text>
      </View>

      {cargando ? (
        <View style={styles.centro}>
          <ActivityIndicator size="large" color="#0B3A5D" />
          <Text style={styles.textoCargando}>
            Cargando catálogo de audios...
          </Text>
        </View>
      ) : (
        <FlatList
          data={audioguias}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.lista}
          renderItem={({ item }) => {
            const esPistaActiva = audioActivo?.id === item.id;
            const estaReproduciendo = esPistaActiva && status.playing;
            const tieneCopiaLocal = descargados[item.id];
            const progreso =
              status.duration > 0
                ? (status.currentTime / status.duration) * 100
                : 0;

            return (
              <View
                style={[
                  styles.tarjeta,
                  esPistaActiva && styles.tarjetaSeleccionada,
                ]}
              >
                <View style={styles.infoPista}>
                  <Text style={styles.nombrePista}>{item.tituloLugar}</Text>
                  <Text style={styles.detallesPista}>
                    ⏱ Duración: {formatearSegundos(item.duracionSegundos)} •
                    Idioma: {item.idioma.toUpperCase()}
                  </Text>
                  {tieneCopiaLocal && (
                    <Text style={styles.badgeOffline}>
                      ✓ Disponible sin conexión en El Palmar
                    </Text>
                  )}
                </View>

                {/* Panel de progreso si la pista está seleccionada */}
                {esPistaActiva && (
                  <View style={styles.panelProgreso}>
                    <View style={styles.barraFondo}>
                      <View
                        style={[styles.barraRelleno, { width: `${progreso}%` }]}
                      />
                    </View>
                    <View style={styles.tiempos}>
                      <Text style={styles.textoTiempo}>
                        {formatearSegundos(status.currentTime)}
                      </Text>
                      <Text style={styles.textoTiempo}>
                        -
                        {formatearSegundos(
                          Math.max(
                            (status.duration || item.duracionSegundos) -
                              status.currentTime,
                            0,
                          ),
                        )}
                      </Text>
                    </View>
                  </View>
                )}

                {/* Controles: Play/Pausa, Retroceso, Avance y Descarga Offline */}
                <View style={styles.filaAcciones}>
                  {esPistaActiva && (
                    <Pressable
                      style={styles.botonSecundario}
                      onPress={retroceder15s}
                    >
                      <Text style={styles.textoBotonSecundario}>-15s</Text>
                    </Pressable>
                  )}

                  <Pressable
                    style={[
                      styles.botonPrincipal,
                      estaReproduciendo && styles.botonPrincipalPausa,
                    ]}
                    onPress={() => alternarPlayPausa(item)}
                  >
                    <Text style={styles.textoBotonPrincipal}>
                      {estaReproduciendo ? "⏸ Pausar" : "▶ Reproducir"}
                    </Text>
                  </Pressable>

                  {esPistaActiva && (
                    <Pressable
                      style={styles.botonSecundario}
                      onPress={adelantar15s}
                    >
                      <Text style={styles.textoBotonSecundario}>+15s</Text>
                    </Pressable>
                  )}

                  <Pressable
                    style={[
                      styles.botonDescarga,
                      tieneCopiaLocal && styles.botonDescargaActivo,
                    ]}
                    onPress={() => gestionarDescargaOffline(item)}
                  >
                    <Text style={styles.textoBotonDescarga}>
                      {tieneCopiaLocal ? "🗑 Borrar" : "⬇ Guardar"}
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
  contenedor: { flex: 1, backgroundColor: "#F8FAFC" },
  cabecera: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 12 },
  subtitulo: {
    fontSize: 12,
    fontWeight: "700",
    color: "#0B5394",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  titulo: { fontSize: 26, fontWeight: "800", color: "#0F172A" },
  centro: { flex: 1, justifyContent: "center", alignItems: "center" },
  textoCargando: { marginTop: 12, color: "#64748B", fontSize: 14 },
  lista: { paddingHorizontal: 16, paddingBottom: 24 },
  tarjeta: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
  },
  tarjetaSeleccionada: { borderColor: "#0B3A5D", borderWidth: 2 },
  infoPista: { marginBottom: 12 },
  nombrePista: { fontSize: 17, fontWeight: "700", color: "#0F172A" },
  detallesPista: { fontSize: 13, color: "#64748B", marginTop: 4 },
  badgeOffline: {
    fontSize: 12,
    color: "#16A34A",
    fontWeight: "700",
    marginTop: 6,
  },
  panelProgreso: { marginVertical: 8 },
  barraFondo: {
    height: 6,
    backgroundColor: "#E2E8F0",
    borderRadius: 3,
    overflow: "hidden",
  },
  barraRelleno: { height: "100%", backgroundColor: "#0B3A5D" },
  tiempos: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 4,
  },
  textoTiempo: { fontSize: 11, color: "#64748B", fontWeight: "600" },
  filaAcciones: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    marginTop: 6,
  },
  botonPrincipal: {
    flex: 2,
    backgroundColor: "#0B3A5D",
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  botonPrincipalPausa: { backgroundColor: "#B91C1C" },
  textoBotonPrincipal: { color: "#FFFFFF", fontWeight: "700", fontSize: 14 },
  botonSecundario: {
    backgroundColor: "#E2E8F0",
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  textoBotonSecundario: { color: "#0F172A", fontWeight: "700", fontSize: 12 },
  botonDescarga: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#0B3A5D",
    alignItems: "center",
  },
  botonDescargaActivo: { borderColor: "#DC2626" },
  textoBotonDescarga: { color: "#0B3A5D", fontWeight: "700", fontSize: 12 },
});
