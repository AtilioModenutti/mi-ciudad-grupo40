import { useSesion } from "@/contextos/SesionContexto";
import { AgendaServicio } from "@/servicios/agenda.servicio";
import { NotificacionesServicio } from "@/servicios/notificaciones.servicio";
import { obtenerLugarPorId } from "@/servicios/lugares";
import type { Lugar } from "@/tipos/lugar";
import type { EstadoEvento, Evento } from "@/tipos/agenda";
import { Image } from "expo-image";
import { router, Stack, useLocalSearchParams } from "expo-router";
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
    case "programado": return { texto: "Programado", fondo: "#E6F4EA", color: "#137333" };
    case "suspendido": return { texto: "Suspendido", fondo: "#FEF7E0", color: "#B06000" };
    case "cancelado": return { texto: "Cancelado", fondo: "#FCE8E6", color: "#C5221F" };
    case "finalizado": return { texto: "Finalizado", fondo: "#F1F3F4", color: "#5F6368" };
  }
}

export default function DetalleEventoScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { usuario, tokenSesion, sesionBloqueada } = useSesion();
  const [evento, setEvento] = useState<Evento | null>(null);
  const [lugarAsociado, setLugarAsociado] = useState<Lugar | null>(null);
  const [cargandoLugar, setCargandoLugar] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [guardado, setGuardado] = useState(false);
  const [soloLectura, setSoloLectura] = useState(false);
  const [procesando, setProcesando] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let activo = true;
    setCargando(true);
    setError("");
    AgendaServicio.obtenerEventoPorId(id)
      .then((resultado) => { if (activo) setEvento(resultado); })
      .catch((e) => { if (activo) setError(e instanceof Error ? e.message : "No se pudo cargar el evento."); })
      .finally(() => { if (activo) setCargando(false); });
    return () => { activo = false; };
  }, [id]);

  useEffect(() => {
    let activo = true;
    setLugarAsociado(null);
    if (!evento?.lugarId) {
      setCargandoLugar(false);
      return () => { activo = false; };
    }
    setCargandoLugar(true);
    obtenerLugarPorId(evento.lugarId)
      .then((resultado) => { if (activo) setLugarAsociado(resultado); })
      .catch(() => { if (activo) setLugarAsociado(null); })
      .finally(() => { if (activo) setCargandoLugar(false); });
    return () => { activo = false; };
  }, [evento?.lugarId]);

  useEffect(() => {
    let activo = true;
    setGuardado(false);
    setSoloLectura(false);
    if (!usuario || !tokenSesion || sesionBloqueada) return () => { activo = false; };
    AgendaServicio.obtenerEventosGuardados(tokenSesion, usuario.id)
      .then((r) => {
        if (!activo) return;
        setGuardado(r.ids.includes(id));
        setSoloLectura(r.soloLectura);
      })
      .catch((e) => {
        if (activo) {
          setSoloLectura(true);
          console.warn("No se pudieron recuperar los eventos guardados:", e);
        }
      });
    return () => { activo = false; };
  }, [id, usuario?.id, tokenSesion, sesionBloqueada]);

  async function alternarGuardado() {
    if (!evento || procesando) return;
    if (!usuario || !tokenSesion || sesionBloqueada) {
      Alert.alert("Necesitás una cuenta", "Ingresá para conservar tus eventos entre dispositivos.", [
        { text: "Cancelar", style: "cancel" },
        { text: "Ingresar", onPress: () => router.push("/ingresar") },
      ]);
      return;
    }
    if (soloLectura) {
      Alert.alert("Sin conexión", "Los eventos guardados solo pueden modificarse con acceso a la API.");
      return;
    }
    if (!guardado && (evento.estado === "cancelado" || evento.estado === "finalizado" || new Date(evento.inicio).getTime() <= Date.now())) {
      Alert.alert("Evento no disponible", "Este evento ya no puede guardarse.");
      return;
    }

    setProcesando(true);
    try {
      if (guardado) {
        await AgendaServicio.quitarEventoGuardado(evento.id, tokenSesion, usuario.id);
        setGuardado(false);
        try { await NotificacionesServicio.cancelarRecordatorio(usuario.id, evento.id); } catch {}
        Alert.alert("Evento quitado", "Ya no figura en tus eventos guardados.");
      } else {
        await AgendaServicio.guardarEvento(evento.id, tokenSesion, usuario.id);
        setGuardado(true);
        let recordatorio = false;
        try {
          const resultado = await NotificacionesServicio.programarAvisoEvento(
            usuario.id, evento.id, evento.titulo, evento.inicio, evento.estado,
          );
          recordatorio = resultado !== null;
        } catch (e) {
          console.warn("No se pudo programar el recordatorio:", e);
        }
        Alert.alert(
          "Evento guardado",
          recordatorio
            ? "Se guardó en tu cuenta y se programó un recordatorio local."
            : "Se guardó en tu cuenta. No se programó una notificación; podés habilitarla desde los permisos del teléfono.",
        );
      }
    } catch (e) {
      Alert.alert("Error", e instanceof Error ? e.message : "No se pudo actualizar el evento.");
    } finally {
      setProcesando(false);
    }
  }

  if (cargando) return <View style={styles.centro}><ActivityIndicator size="large" color="#2563EB" /></View>;
  if (error) return <View style={styles.centro}><Text style={styles.error}>{error}</Text></View>;
  if (!evento) return <View style={styles.centro}><Text style={styles.error}>No se encontró el evento solicitado.</Text></View>;

  const estadoVisual = formatearEstado(evento.estado);
  const ubicacion = lugarAsociado?.nombre
    || (cargandoLugar ? "Consultando lugar..." : "")
    || evento.direccionLibre?.trim()
    || (evento.lugarId ? "Lugar asociado no disponible" : "Ubicación no informada");
  const precioTexto = evento.precio === null
    ? "Precio no informado"
    : evento.precio === 0 ? "Entrada libre y gratuita" : `$ ${evento.precio.toLocaleString("es-AR")}`;
  const noSePuedeGuardar = evento.estado === "cancelado" || evento.estado === "finalizado" || new Date(evento.inicio).getTime() <= Date.now();

  return (
    <>
      <Stack.Screen options={{ title: "Detalle del evento", headerBackTitle: "Agenda" }} />
      <ScrollView style={styles.contenedor}>
        {evento.imagenUrl ? (
          <Image source={{ uri: evento.imagenUrl }} style={styles.imagen} contentFit="cover" />
        ) : (
          <View style={[styles.imagen, styles.sinImagen]}>
            <Text style={styles.sinImagenTexto}>Sin imagen disponible</Text>
          </View>
        )}
        <View style={styles.contenido}>
          <View style={[styles.badge, { backgroundColor: estadoVisual.fondo }]}>
            <Text style={[styles.badgeTexto, { color: estadoVisual.color }]}>{estadoVisual.texto}</Text>
          </View>
          <Text style={styles.titulo}>{evento.titulo}</Text>
          <View style={styles.filaDato}><Text style={styles.iconoDato}>📅</Text><Text style={styles.textoDato}>{new Date(evento.inicio).toLocaleString("es-AR", { dateStyle: "full", timeStyle: "short" })}</Text></View>
          <View style={styles.filaDato}><Text style={styles.iconoDato}>📍</Text><Text style={styles.textoDato}>{ubicacion}</Text></View>
          <View style={styles.filaDato}><Text style={styles.iconoDato}>🎟️</Text><Text style={[styles.textoDato, evento.precio === 0 && styles.textoGratis]}>{precioTexto}</Text></View>
          <Text style={styles.subtitulo}>Descripción</Text>
          <Text style={styles.descripcion}>{evento.descripcion}</Text>
          {evento.lugarId && (
            <Pressable style={styles.boton} onPress={() => router.push({ pathname: "/lugar/[id]", params: { id: evento.lugarId! } })}>
              <Text style={styles.botonTexto}>Ver lugar del evento</Text>
            </Pressable>
          )}
          {soloLectura && usuario && <Text style={styles.textoDato}>Sin conexión o sin sesión verificada: no podés modificar eventos guardados.</Text>}
          <Pressable
            disabled={procesando || (noSePuedeGuardar && !guardado)}
            style={[styles.boton, guardado && styles.botonActivo, noSePuedeGuardar && !guardado && styles.botonDeshabilitado]}
            onPress={() => void alternarGuardado()}
          >
            <Text style={styles.botonTexto}>
              {procesando ? "Actualizando..." : guardado ? "✓ Guardado (tocar para quitar)" : noSePuedeGuardar ? "Evento no disponible" : "Guardar evento y recordar"}
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
    backgroundColor: "#2563EB",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  botonActivo: { backgroundColor: "#137333" },
  botonDeshabilitado: { backgroundColor: "#94A3B8" },
  botonTexto: { color: "#FFFFFF", fontWeight: "bold", fontSize: 15 },
  error: { fontSize: 16, color: "#DC2626" },
});
