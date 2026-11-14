import { useSesion } from "@/contextos/SesionContexto";
import { AgendaServicio } from "@/servicios/agenda.servicio";
import { obtenerLugarPorId } from "@/servicios/lugares";
import { NotificacionesServicio } from "@/servicios/notificaciones.servicio";
import type { EstadoEvento, Evento } from "@/tipos/agenda";
import type { Lugar } from "@/tipos/lugar";
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
    case "programado":
      return { texto: "Programado", fondo: "#E6F4EA", color: "#137333" };
    case "suspendido":
      return { texto: "Suspendido", fondo: "#FEF7E0", color: "#B06000" };
    case "cancelado":
      return { texto: "Cancelado", fondo: "#FCE8E6", color: "#C5221F" };
    case "finalizado":
      return { texto: "Finalizado", fondo: "#F1F3F4", color: "#5F6368" };
  }
}

function describirHorarioFin(inicioIso: string, finIso: string | null) {
  if (!finIso) return { fin: null, duracion: null };

  const inicio = new Date(inicioIso).getTime();
  const fin = new Date(finIso).getTime();
  if (!Number.isFinite(inicio) || !Number.isFinite(fin) || fin <= inicio) {
    return { fin: null, duracion: null };
  }

  const minutos = Math.round((fin - inicio) / 60000);
  const horas = Math.floor(minutos / 60);
  const resto = minutos % 60;
  let duracion: string;

  if (horas > 0 && resto > 0) duracion = `${horas} h ${resto} min`;
  else if (horas > 0) duracion = `${horas} h`;
  else duracion = `${minutos} min`;

  return {
    fin: new Date(fin).toLocaleString("es-AR", {
      dateStyle: "full",
      timeStyle: "short",
    }),
    duracion,
  };
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
      .then((resultado) => {
        if (activo) setEvento(resultado);
      })
      .catch((e) => {
        if (activo)
          setError(
            e instanceof Error ? e.message : "No se pudo cargar el evento.",
          );
      })
      .finally(() => {
        if (activo) setCargando(false);
      });
    return () => {
      activo = false;
    };
  }, [id]);

  useEffect(() => {
    let activo = true;
    setLugarAsociado(null);
    if (!evento?.lugarId) {
      setCargandoLugar(false);
      return () => {
        activo = false;
      };
    }
    setCargandoLugar(true);
    obtenerLugarPorId(evento.lugarId)
      .then((resultado) => {
        if (activo) setLugarAsociado(resultado);
      })
      .catch(() => {
        if (activo) setLugarAsociado(null);
      })
      .finally(() => {
        if (activo) setCargandoLugar(false);
      });
    return () => {
      activo = false;
    };
  }, [evento?.lugarId]);

  useEffect(() => {
    let activo = true;
    setGuardado(false);
    setSoloLectura(false);
    if (!usuario || !tokenSesion || sesionBloqueada)
      return () => {
        activo = false;
      };
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
    return () => {
      activo = false;
    };
  }, [id, usuario?.id, tokenSesion, sesionBloqueada]);

  async function alternarGuardado() {
    if (!evento || procesando) return;
    if (!usuario || !tokenSesion || sesionBloqueada) {
      Alert.alert(
        "Necesitás una cuenta",
        "Ingresá para conservar tus eventos entre dispositivos.",
        [
          { text: "Cancelar", style: "cancel" },
          { text: "Ingresar", onPress: () => router.push("/ingresar") },
        ],
      );
      return;
    }
    if (soloLectura) {
      Alert.alert(
        "Sin conexión",
        "Los eventos guardados solo pueden modificarse con acceso a la API.",
      );
      return;
    }
    if (
      !guardado &&
      (evento.estado === "cancelado" ||
        evento.estado === "finalizado" ||
        new Date(evento.inicio).getTime() <= Date.now())
    ) {
      Alert.alert("Evento no disponible", "Este evento ya no puede guardarse.");
      return;
    }

    setProcesando(true);
    try {
      if (guardado) {
        await AgendaServicio.quitarEventoGuardado(
          evento.id,
          tokenSesion,
          usuario.id,
        );
        setGuardado(false);
        try {
          await NotificacionesServicio.cancelarRecordatorio(
            usuario.id,
            evento.id,
          );
        } catch {}
        Alert.alert("Evento quitado", "Ya no figura en tus eventos guardados.");
      } else {
        await AgendaServicio.guardarEvento(evento.id, tokenSesion, usuario.id);
        setGuardado(true);
        let recordatorio = false;
        try {
          const resultado = await NotificacionesServicio.programarAvisoEvento(
            usuario.id,
            evento.id,
            evento.titulo,
            evento.inicio,
            evento.estado,
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
      Alert.alert(
        "Error",
        e instanceof Error ? e.message : "No se pudo actualizar el evento.",
      );
    } finally {
      setProcesando(false);
    }
  }

  if (cargando)
    return (
      <View style={styles.centro}>
        <ActivityIndicator size="large" color="#185F65" />
      </View>
    );
  if (error)
    return (
      <View style={styles.centro}>
        <Text style={styles.error}>{error}</Text>
      </View>
    );
  if (!evento)
    return (
      <View style={styles.centro}>
        <Text style={styles.error}>No se encontró el evento solicitado.</Text>
      </View>
    );

  const estadoVisual = formatearEstado(evento.estado);
  const horarioFin = describirHorarioFin(evento.inicio, evento.fin);
  const ubicacion =
    lugarAsociado?.nombre ||
    (cargandoLugar ? "Consultando lugar..." : "") ||
    evento.direccionLibre?.trim() ||
    (evento.lugarId
      ? "Lugar asociado no disponible"
      : "Ubicación no informada");
  const precioTexto =
    evento.precio === null
      ? "Precio no informado"
      : evento.precio === 0
        ? "Entrada libre y gratuita"
        : `$ ${evento.precio.toLocaleString("es-AR")}`;
  const noSePuedeGuardar =
    evento.estado === "cancelado" ||
    evento.estado === "finalizado" ||
    new Date(evento.inicio).getTime() <= Date.now();

  return (
    <>
      <Stack.Screen
        options={{ title: "Detalle del evento", headerBackTitle: "Agenda" }}
      />
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
            <Text style={styles.iconoDato}>🕒</Text>
            <Text style={styles.textoDato}>
              {horarioFin.fin
                ? `Finaliza: ${horarioFin.fin}`
                : "Finalización no informada"}
            </Text>
          </View>
          <View style={styles.filaDato}>
            <Text style={styles.iconoDato}>⏱️</Text>
            <Text style={styles.textoDato}>
              {horarioFin.duracion
                ? `Duración: ${horarioFin.duracion}`
                : "Duración no informada"}
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
          {evento.lugarId && (
            <Pressable
              style={styles.boton}
              onPress={() =>
                router.push({
                  pathname: "/lugar/[id]",
                  params: { id: evento.lugarId! },
                })
              }
            >
              <Text style={styles.botonTexto}>Ver lugar del evento</Text>
            </Pressable>
          )}
          {soloLectura && usuario && (
            <Text style={styles.textoDato}>
              Sin conexión o sin sesión verificada: no podés modificar eventos
              guardados.
            </Text>
          )}
          <Pressable
            disabled={procesando || (noSePuedeGuardar && !guardado)}
            style={[
              styles.boton,
              guardado && styles.botonActivo,
              noSePuedeGuardar && !guardado && styles.botonDeshabilitado,
            ]}
            onPress={() => void alternarGuardado()}
          >
            <Text style={styles.botonTexto}>
              {procesando
                ? "Actualizando..."
                : guardado
                  ? "✓ Guardado (tocar para quitar)"
                  : noSePuedeGuardar
                    ? "Evento no disponible"
                    : "Guardar evento y recordar"}
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  contenedor: { flex: 1, backgroundColor: "#F6F8F5" },
  centro: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 22,
    backgroundColor: "#F6F8F5",
  },
  imagen: { width: "100%", height: 248 },
  sinImagen: {
    backgroundColor: "#E7F1EB",
    justifyContent: "center",
    alignItems: "center",
  },
  sinImagenTexto: { color: "#58736E", fontSize: 16 },
  contenido: {
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 40,
    gap: 3,
  },
  badge: {
    alignSelf: "flex-start",
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderRadius: 24,
    marginBottom: 10,
  },
  badgeTexto: { fontSize: 14, fontWeight: "800" },
  titulo: {
    fontSize: 26,
    lineHeight: 33,
    fontWeight: "800",
    color: "#244344",
    marginBottom: 16,
  },
  filaDato: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 11,
    gap: 10,
    paddingVertical: 5,
  },
  iconoDato: { fontSize: 20 },
  textoDato: {
    fontSize: 16,
    lineHeight: 23,
    color: "#4D6864",
    fontWeight: "600",
    flexShrink: 1,
  },
  textoGratis: { color: "#267047", fontWeight: "800" },
  subtitulo: {
    fontSize: 21,
    fontWeight: "800",
    color: "#244344",
    marginTop: 16,
    marginBottom: 9,
  },
  descripcion: {
    fontSize: 16,
    color: "#516C68",
    lineHeight: 24,
    marginBottom: 21,
  },
  boton: {
    backgroundColor: "#185F65",
    minHeight: 54,
    paddingHorizontal: 12,
    marginBottom: 11,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  botonActivo: { backgroundColor: "#28754D" },
  botonDeshabilitado: { backgroundColor: "#879994" },
  botonTexto: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 16,
    textAlign: "center",
  },
  error: { fontSize: 16, lineHeight: 23, color: "#9A3A3A" },
});
