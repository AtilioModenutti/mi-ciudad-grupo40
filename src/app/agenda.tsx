import { TarjetaEvento } from "@/components/TarjetaEvento";
import { AgendaServicio } from "@/servicios/agenda.servicio";
import { Evento } from "@/tipos/agenda";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function AgendaScreen() {
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [cargando, setCargando] = useState(true);
  const [refrescando, setRefrescando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cargarEventos = async () => {
    try {
      setError(null);
      const datos = await AgendaServicio.obtenerEventos();
      setEventos(datos);
    } catch (err) {
      setError("No se pudo cargar la agenda. Verifica tu conexión.");
    } finally {
      setCargando(false);
      setRefrescando(false);
    }
  };

  useEffect(() => {
    cargarEventos();
  }, []);

  const alRefrescar = () => {
    setRefrescando(true);
    cargarEventos();
  };

  const alSeleccionarEvento = (evento: Evento) => {
    // Navegación imperativa con parámetro tipado
    router.push({
      pathname: "/evento/[id]",
      params: { id: evento.id },
    });
  };

  return (
    <SafeAreaView style={styles.contenedor} edges={["top"]}>
      <View style={styles.cabecera}>
        <Text style={styles.subtitulo}>Turismo Colón</Text>
        <Text style={styles.titulo}>Agenda de Eventos</Text>
      </View>

      {cargando ? (
        <View style={styles.centro}>
          <ActivityIndicator size="large" color="#0B5394" />
          <Text style={styles.textoCargando}>Cargando eventos...</Text>
        </View>
      ) : error ? (
        <View style={styles.centro}>
          <Text style={styles.textoError}>⚠️ {error}</Text>
        </View>
      ) : (
        <FlatList
          data={eventos}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TarjetaEvento evento={item} alPresionar={alSeleccionarEvento} />
          )}
          contentContainerStyle={styles.listaContenido}
          refreshControl={
            <RefreshControl
              refreshing={refrescando}
              onRefresh={alRefrescar}
              colors={["#0B5394"]}
              tintColor="#0B5394"
            />
          }
          ListEmptyComponent={
            <View style={styles.centro}>
              <Text style={styles.textoVacio}>
                No hay eventos próximos en este momento.
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  contenedor: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  cabecera: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
    backgroundColor: "#F8FAFC",
  },
  subtitulo: {
    fontSize: 12,
    fontWeight: "700",
    color: "#0B5394",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  titulo: {
    fontSize: 26,
    fontWeight: "800",
    color: "#0F172A",
  },
  listaContenido: {
    paddingBottom: 24,
  },
  centro: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  textoCargando: {
    marginTop: 12,
    color: "#64748B",
    fontSize: 14,
  },
  textoError: {
    color: "#C5221F",
    fontSize: 15,
    textAlign: "center",
  },
  textoVacio: {
    color: "#64748B",
    fontSize: 15,
    textAlign: "center",
  },
});
