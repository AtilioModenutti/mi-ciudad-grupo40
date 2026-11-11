// src/app/evento/[id].tsx
import { AgendaServicio } from "@/servicios/agenda.servicio";
import { NotificacionesServicio } from "@/servicios/notificaciones.servicio";
import { EstadoEvento, Evento } from "@/tipos/agenda";
import { Image } from "expo-image";
import { Stack, useLocalSearchParams } from "expo-router";
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

function formatearEstado(estado: EstadoEvento) {
  switch (estado) {
    case "programado":
      return { texto: "Programado", fondo: "#E6F4EA", color: "#137333" };
    case "suspendido":
      return {
        texto: "Suspendido por lluvia",
        fondo: "#FEF7E0",
        color: "#B06000",
      };
    case "cancelado":
      return { texto: "Cancelado", fondo: "#FCE8E6", color: "#C5221F" };
    case "finalizado":
      return { texto: "Finalizado", fondo: "#F1F3F4", color: "#5F6368" };
  }
}

export default function DetalleEventoScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [evento, setEvento] = useState<Evento | null>(null);
  const [cargando, setCargando] = useState(true);
  const [idNotificacion, setIdNotificacion] = useState<string | null>(null);

  useEffect(() => {
    async function cargar() {
      if (!id) return;
      const datos = await AgendaServicio.obtenerEventoPorId(id);
      setEvento(datos);
      setCargando(false);
    }
    cargar();
  }, [id]);

  const alternarRecordatorio = async () => {
    if (!evento) return;

    if (idNotificacion) {
      // Cancelar recordatorio existente
      await NotificacionesServicio.cancelarRecordatorio(idNotificacion);
      setIdNotificacion(null);
      Alert.alert(
        "Recordatorio cancelado",
        "Ya no recibirás alertas de este evento.",
      );
    } else {
      // Programar recordatorio real
      const notifId = await NotificacionesServicio.programarAvisoEvento(
        evento.id,
        evento.titulo,
        evento.inicio,
      );

      if (notifId) {
        setIdNotificacion(notifId);
        Alert.alert(
          "🔔 Recordatorio activado",
          `Se programó un aviso para "${evento.titulo}". Si el inicio es próximo, recibirás una notificación de prueba en 5 segundos.`,
        );
      } else {
        Alert.alert(
          "Permiso denegado",
          "Debes habilitar los permisos de notificaciones en los ajustes de tu dispositivo.",
        );
      }
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

  const estadoVisual = formatearEstado(evento.estado);
  const ubicacion = evento.direccionLibre ?? "Lugar histórico de Colón";
  const precioTexto =
    evento.precio === 0
      ? "Entrada libre y gratuita"
      : `$ ${evento.precio?.toLocaleString("es-AR")}`;

  return (
    <>
      <Stack.Screen
        options={{
          title: "Detalle del Evento",
          headerBackTitle: "Agenda",
        }}
      />

      <ScrollView style={styles.contenedor}>
        {evento.imagenUrl ? (
          <Image
            source={{ uri: evento.imagenUrl }}
            style={styles.imagen}
            contentFit="cover"
            transition={250}
          />
        ) : (
          <View style={[styles.imagen, styles.sinImagen]}>
            <Text style={styles.sinImagenTexto}>Sin imagen disponible</Text>
          </View>
        )}

        <View style={styles.contenido}>
          <View style={[styles.badge, { backgroundColor: estadoVisual.fondo }]}>
            <Text style={[styles.badgeTexto, { color: estadoVisual.color }]}>
              {estadoVisual.texto}
            </Text>
          </View>

          <Text style={styles.titulo}>{evento.titulo}</Text>

          <View style={styles.filaDato}>
            <Text style={styles.iconoDato}>📅</Text>
            <Text style={styles.textoDato}>
              {new Date(evento.inicio).toLocaleString("es-AR", {
                dateStyle: "full",
                timeStyle: "short",
              })}
            </Text>
          </View>

          <View style={styles.filaDato}>
            <Text style={styles.iconoDato}>📍</Text>
            <Text style={styles.textoDato}>{ubicacion}</Text>
          </View>

          <View style={styles.filaDato}>
            <Text style={styles.iconoDato}>🎟️</Text>
            <Text
              style={[
                styles.textoDato,
                evento.precio === 0 && styles.textoGratis,
              ]}
            >
              {precioTexto}
            </Text>
          </View>

          <Text style={styles.subtitulo}>Descripción</Text>
          <Text style={styles.descripcion}>{evento.descripcion}</Text>

          {/* Botón funcional de recordatorio */}
          <Pressable
            style={[styles.boton, idNotificacion ? styles.botonActivo : null]}
            onPress={alternarRecordatorio}
          >
            <Text style={styles.botonTexto}>
              {idNotificacion
                ? "✓ Recordatorio activado (Tocar para cancelar)"
                : "🔔 Activar recordatorio"}
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  contenedor: { flex: 1, backgroundColor: "#FFFFFF" },
  centro: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  imagen: { width: "100%", height: 240 },
  sinImagen: {
    backgroundColor: "#E2E8F0",
    justifyContent: "center",
    alignItems: "center",
  },
  sinImagenTexto: { color: "#64748B" },
  contenido: { padding: 20 },
  badge: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 10,
  },
  badgeTexto: { fontSize: 12, fontWeight: "700" },
  titulo: {
    fontSize: 22,
    fontWeight: "800",
    color: "#0F172A",
    marginBottom: 14,
  },
  filaDato: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    gap: 8,
  },
  iconoDato: { fontSize: 16 },
  textoDato: { fontSize: 14, color: "#334155", fontWeight: "500" },
  textoGratis: { color: "#137333", fontWeight: "700" },
  subtitulo: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
    marginTop: 16,
    marginBottom: 6,
  },
  descripcion: {
    fontSize: 14,
    color: "#475569",
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
