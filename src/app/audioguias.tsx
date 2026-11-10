// src/app/audioguias.tsx
import { AudioguiaServicio } from "@/servicios/audioguia.servicio";
import { AudioguiaItem } from "@/tipos/agenda";
import { useAudioPlayer, useAudioPlayerStatus } from "expo-audio";
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

export default function AudioguiasScreen() {
  const [audioguias, setAudioguias] = useState<AudioguiaItem[]>([]);
  const [cargando, setCargando] = useState(true);
  const [audioActivo, setAudioActivo] = useState<AudioguiaItem | null>(null);
  const [descargados, setDescargados] = useState<Record<string, boolean>>({});

  const player = useAudioPlayer(audioActivo ? audioActivo.url : null);
  const status = useAudioPlayerStatus(player);

  useEffect(() => {
    async function cargar() {
      const lista = await AudioguiaServicio.obtenerTodas();
      setAudioguias(lista);

      const estados: Record<string, boolean> = {};
      for (const item of lista) {
        estados[item.id] = await AudioguiaServicio.estaDescargado(item.id);
      }
      setDescargados(estados);
      setCargando(false);
    }
    cargar();
  }, []);

  const alternarAudio = (item: AudioguiaItem) => {
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

  const gestionarDescarga = async (item: AudioguiaItem) => {
    try {
      if (descargados[item.id]) {
        await AudioguiaServicio.eliminarDescarga(item.id);
        setDescargados((prev) => ({ ...prev, [item.id]: false }));
        Alert.alert(
          "Descarga eliminada",
          "Se liberó espacio en el almacenamiento.",
        );
      } else {
        await AudioguiaServicio.descargarParaOffline(item);
        setDescargados((prev) => ({ ...prev, [item.id]: true }));
        Alert.alert(
          "Descargado",
          "Audioguía guardada para escuchar sin conexión en Colón.",
        );
      }
    } catch {
      Alert.alert("Error", "No se pudo descargar el archivo de audio.");
    }
  };

  const formatearTiempo = (segundos: number) => {
    const mins = Math.floor(segundos / 60);
    const secs = segundos % 60;
    return `${mins}:${secs < 10 ? "0" : ""}${secs} min`;
  };

  return (
    <SafeAreaView style={styles.contenedor} edges={["top"]}>
      <View style={styles.cabecera}>
        <Text style={styles.subtitulo}>Recorridos Turísticos</Text>
        <Text style={styles.titulo}>Audioguías de Colón</Text>
      </View>

      {cargando ? (
        <View style={styles.centro}>
          <ActivityIndicator size="large" color="#0B3A5D" />
          <Text style={styles.textoCargando}>Cargando pistas...</Text>
        </View>
      ) : (
        <FlatList
          data={audioguias}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.lista}
          renderItem={({ item }) => {
            const estaSeleccionado = audioActivo?.id === item.id;
            const reproduciendo = estaSeleccionado && status.playing;
            const tieneCopiaLocal = descargados[item.id];

            return (
              <View
                style={[
                  styles.tarjeta,
                  estaSeleccionado && styles.tarjetaActiva,
                ]}
              >
                <View style={styles.info}>
                  <Text style={styles.nombreLugar}>{item.tituloLugar}</Text>
                  <Text style={styles.metadatos}>
                    ⏱ {formatearTiempo(item.duracionSegundos)} • Idioma:{" "}
                    {item.idioma.toUpperCase()}
                  </Text>
                  {tieneCopiaLocal && (
                    <Text style={styles.textoOffline}>
                      ✓ Disponible sin conexión
                    </Text>
                  )}
                </View>

                <View style={styles.acciones}>
                  <Pressable
                    style={[
                      styles.botonPlay,
                      reproduciendo && styles.botonPausa,
                    ]}
                    onPress={() => alternarAudio(item)}
                  >
                    <Text style={styles.textoBotonPlay}>
                      {reproduciendo ? "⏸ Pausar" : "▶ Escuchar"}
                    </Text>
                  </Pressable>

                  <Pressable
                    style={[
                      styles.botonDescarga,
                      tieneCopiaLocal && styles.botonDescargaActivo,
                    ]}
                    onPress={() => gestionarDescarga(item)}
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
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  tarjetaActiva: { borderColor: "#0B3A5D", borderWidth: 2 },
  info: { marginBottom: 14 },
  nombreLugar: { fontSize: 16, fontWeight: "700", color: "#0F172A" },
  metadatos: { fontSize: 13, color: "#64748B", marginTop: 4 },
  textoOffline: {
    fontSize: 12,
    color: "#16A34A",
    fontWeight: "700",
    marginTop: 4,
  },
  acciones: { flexDirection: "row", gap: 10 },
  botonPlay: {
    flex: 1,
    backgroundColor: "#0B3A5D",
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  botonPausa: { backgroundColor: "#B91C1C" },
  textoBotonPlay: { color: "#FFFFFF", fontWeight: "700", fontSize: 14 },
  botonDescarga: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#0B3A5D",
    justifyContent: "center",
    alignItems: "center",
  },
  botonDescargaActivo: { borderColor: "#DC2626" },
  textoBotonDescarga: { color: "#0B3A5D", fontWeight: "700", fontSize: 13 },
});
