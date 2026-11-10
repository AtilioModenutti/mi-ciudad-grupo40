// src/app/evento/[id].tsx
import { AgendaServicio } from "@/servicios/agenda.servicio";
import { NotificacionesServicio } from "@/servicios/notificaciones.servicio";
import { Evento } from "@/tipos/agenda";
import { Image } from "expo-image";
import { useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from "react-native";

export default function DetalleEventoScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [evento, setEvento] = useState<Evento | null>(null);
  const [cargando, setCargando] = useState(true);
  const [agendado, setAgendado] = useState(false);

  useEffect(() => {
    async function cargar() {
      if (!id) return;
      const datos = await AgendaServicio.obtenerEventoPorId(id);
      setEvento(datos);
      setCargando(false);
    }
    cargar();
  }, [id]);

  const activarRecordatorio = async () => {
    if (!evento) return;
    const notifId = await NotificacionesServicio.programarAvisoEvento(
      evento.id,
      evento.titulo,
      evento.inicio,
    );

    if (notifId) {
      setAgendado(true);
      Alert.alert(
        "¡Aviso programado!",
        `Se configuró un recordatorio para "${evento.titulo}".`,
      );
    } else {
      Alert.alert(
        "Aviso",
        "No se pudieron activar las notificaciones. Verifica los permisos del dispositivo.",
      );
    }
  };

  if (cargando) {
    return (
      <View style={styles.centro}>
        <ActivityIndicator size="large" color="#0B3A5D" />
      </View>
    );
  }

  if (!evento) {
    return (
      <View style={styles.centro}>
        <Text style={styles.error}>No se encontró el evento solicitado.</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.contenedor}>
      {evento.imagenUrl ? (
        <Image
          source={{ uri: evento.imagenUrl }}
          style={styles.imagen}
          contentFit="cover"
        />
      ) : (
        <View style={[styles.imagen, styles.sinImagen]}>
          <Text style={styles.sinImagenTexto}>Sin imagen disponible</Text>
        </View>
      )}

      <View style={styles.contenido}>
        <Text style={styles.titulo}>{evento.titulo}</Text>
        <Text style={styles.fecha}>
          📅 {new Date(evento.inicio).toLocaleString("es-AR")}
        </Text>
        <Text style={styles.ubicacion}>
          📍 {evento.direccionLibre ?? "Colón, Entre Ríos"}
        </Text>
        <Text style={styles.precio}>
          {evento.precio === 0
            ? "Entrada libre y gratuita"
            : `$ ${evento.precio}`}
        </Text>

        <Text style={styles.subtitulo}>Descripción</Text>
        <Text style={styles.descripcion}>{evento.descripcion}</Text>

        <Pressable
          style={[styles.boton, agendado && styles.botonActivo]}
          onPress={activarRecordatorio}
          disabled={agendado}
        >
          <Text style={styles.botonTexto}>
            {agendado ? "✓ Recordatorio activado" : "🔔 Activar recordatorio"}
          </Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  contenedor: { flex: 1, backgroundColor: "#FFFFFF" },
  centro: { flex: 1, justifyContent: "center", alignItems: "center" },
  imagen: { width: "100%", height: 240 },
  sinImagen: {
    backgroundColor: "#E2E8F0",
    justifyContent: "center",
    alignItems: "center",
  },
  sinImagenTexto: { color: "#64748B" },
  contenido: { padding: 20 },
  titulo: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#0F172A",
    marginBottom: 10,
  },
  fecha: { fontSize: 14, color: "#0B3A5D", fontWeight: "600", marginBottom: 6 },
  ubicacion: { fontSize: 14, color: "#475569", marginBottom: 6 },
  precio: {
    fontSize: 15,
    fontWeight: "700",
    color: "#137333",
    marginBottom: 16,
  },
  subtitulo: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 6,
  },
  descripcion: {
    fontSize: 14,
    color: "#334155",
    lineHeight: 22,
    marginBottom: 24,
  },
  boton: {
    backgroundColor: "#0B3A5D",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  botonActivo: { backgroundColor: "#137333" },
  botonTexto: { color: "#FFFFFF", fontWeight: "bold", fontSize: 15 },
  error: { fontSize: 16, color: "#DC2626" },
});
