import { AccesoProtegido } from "@/components/AccesoProtegido";
import { TarjetaEvento } from "@/components/TarjetaEvento";
import { useSesion } from "@/contextos/SesionContexto";
import { AgendaServicio } from "@/servicios/agenda.servicio";
import { obtenerLugares } from "@/servicios/lugares";
import { NotificacionesServicio } from "@/servicios/notificaciones.servicio";
import type { Evento } from "@/tipos/agenda";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  SectionList,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type FiltroFecha = "todos" | "hoy" | "semana";

type SeccionEventos = {
  key: string;
  titulo: string;
  data: Evento[];
};

function inicioDelDia(fecha: Date): Date {
  return new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate());
}

function claveDia(fecha: Date): string {
  const anio = fecha.getFullYear();
  const mes = String(fecha.getMonth() + 1).padStart(2, "0");
  const dia = String(fecha.getDate()).padStart(2, "0");
  return `${anio}-${mes}-${dia}`;
}

function agruparEventosPorDia(
  eventos: Evento[],
  soloGuardados: boolean,
  filtroFecha: FiltroFecha,
): SeccionEventos[] {
  const hoy = inicioDelDia(new Date());
  const manana = new Date(hoy);
  manana.setDate(manana.getDate() + 1);
  const finSemana = new Date(hoy);
  const diasHastaLunes = 7 - ((hoy.getDay() + 6) % 7);
  finSemana.setDate(finSemana.getDate() + diasHastaLunes);

  const ordenados = [...eventos].sort(
    (a, b) => new Date(a.inicio).getTime() - new Date(b.inicio).getTime(),
  );
  const grupos = new Map<string, SeccionEventos>();

  for (const evento of ordenados) {
    const fecha = new Date(evento.inicio);
    if (Number.isNaN(fecha.getTime())) continue;

    if (!soloGuardados) {
      if (fecha < hoy) continue;
      if (filtroFecha === "hoy" && fecha >= manana) continue;
      if (filtroFecha === "semana" && fecha >= finSemana) continue;
    }

    const clave = claveDia(fecha);
    const grupo = grupos.get(clave);
    if (grupo) {
      grupo.data.push(evento);
      continue;
    }

    const textoFecha = fecha
      .toLocaleDateString("es-AR", {
        weekday: "long",
        day: "numeric",
        month: "long",
      })
      .toUpperCase();

    grupos.set(clave, {
      key: clave,
      titulo: clave === claveDia(hoy) ? `HOY · ${textoFecha}` : textoFecha,
      data: [evento],
    });
  }

  return [...grupos.values()];
}

export default function AgendaScreen() {
  const {
    usuario,
    tokenSesion,
    sesionBloqueada,
    cargandoSesion,
    desbloquearSesion,
  } = useSesion();
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [nombresLugares, setNombresLugares] = useState<Record<string, string>>(
    {},
  );
  const [cargando, setCargando] = useState(true);
  const [refrescando, setRefrescando] = useState(false);
  const [desdeCache, setDesdeCache] = useState(false);
  const [error, setError] = useState("");
  const [guardados, setGuardados] = useState<string[]>([]);
  const [eventosGuardados, setEventosGuardados] = useState<Evento[]>([]);
  const [soloGuardados, setSoloGuardados] = useState(false);
  const [filtroFecha, setFiltroFecha] = useState<FiltroFecha>("todos");
  const [guardadosSoloLectura, setGuardadosSoloLectura] = useState(false);
  const [pushRegistrado, setPushRegistrado] = useState(false);
  const [gestionandoPush, setGestionandoPush] = useState(false);

  const cargarEventos = useCallback(async () => {
    try {
      setError("");
      const resultado = await AgendaServicio.obtenerEventos();
      setEventos(resultado.eventos);
      setDesdeCache(resultado.desdeCache);
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "No se pudo cargar la agenda.",
      );
    } finally {
      setCargando(false);
      setRefrescando(false);
    }
  }, []);

  useEffect(() => {
    void cargarEventos();
  }, [cargarEventos]);

  useEffect(() => {
    let activo = true;
    obtenerLugares()
      .then((respuesta) => {
        if (!activo) return;
        setNombresLugares(
          Object.fromEntries(
            respuesta.datos.map((lugar) => [lugar.id, lugar.nombre]),
          ),
        );
      })
      .catch(() => {
        if (activo) setNombresLugares({});
      });
    return () => {
      activo = false;
    };
  }, []);

  useFocusEffect(
    useCallback(() => {
      let activo = true;
      if (!usuario || !tokenSesion || sesionBloqueada) {
        setGuardados([]);
        setEventosGuardados([]);
        // Al bloquear con biometría se conserva la pestaña elegida.
        // Solo se vuelve a Próximos cuando ya no hay una sesión bloqueada.
        if (!sesionBloqueada) setSoloGuardados(false);
        setPushRegistrado(false);
        return () => {
          activo = false;
        };
      }

      const usuarioId = usuario.id;
      const token = tokenSesion;
      async function cargarGuardados() {
        try {
          const [resultado, registrado] = await Promise.all([
            AgendaServicio.obtenerEventosGuardados(token, usuarioId),
            NotificacionesServicio.estadoDispositivoRegistrado(usuarioId),
          ]);
          if (!activo) return;
          setGuardados(resultado.ids);
          setEventosGuardados(resultado.eventos);
          setGuardadosSoloLectura(resultado.soloLectura);
          setPushRegistrado(registrado);
          const vigentes = eventos.filter((evento) =>
            resultado.ids.includes(evento.id),
          );
          for (const evento of vigentes) {
            if (evento.estado !== "programado") {
              await NotificacionesServicio.cancelarRecordatorio(
                usuarioId,
                evento.id,
              );
            }
          }
        } catch (error) {
          if (activo) {
            setGuardadosSoloLectura(true);
            console.warn(
              "No se pudieron recuperar los eventos guardados:",
              error,
            );
          }
        }
      }
      void cargarGuardados();
      return () => {
        activo = false;
      };
    }, [usuario?.id, tokenSesion, sesionBloqueada, eventos]),
  );

  async function alternarPush() {
    if (!usuario || !tokenSesion || gestionandoPush) return;
    setGestionandoPush(true);
    try {
      if (pushRegistrado) {
        await NotificacionesServicio.eliminarDispositivoDeApi(
          tokenSesion,
          usuario.id,
        );
        setPushRegistrado(false);
        Alert.alert(
          "Avisos desactivados",
          "Este teléfono dejó de recibir avisos push de tu cuenta.",
        );
      } else {
        await NotificacionesServicio.registrarDispositivoEnApi(
          tokenSesion,
          usuario.id,
        );
        setPushRegistrado(true);
        Alert.alert(
          "Avisos activados",
          "El dispositivo quedó registrado en tu cuenta.",
        );
      }
    } catch (error) {
      Alert.alert(
        "Avisos",
        error instanceof Error
          ? error.message
          : "No se pudo actualizar el dispositivo.",
      );
    } finally {
      setGestionandoPush(false);
    }
  }

  async function probarPush() {
    if (!tokenSesion) return;
    try {
      const enviadas =
        await NotificacionesServicio.probarAvisoPushEnServidor(tokenSesion);
      Alert.alert(
        "Prueba de avisos",
        `La API informó ${enviadas} notificación(es) enviada(s).`,
      );
    } catch (error) {
      Alert.alert(
        "Prueba fallida",
        error instanceof Error ? error.message : "No se pudo probar el aviso.",
      );
    }
  }

  const secciones = agruparEventosPorDia(
    soloGuardados ? eventosGuardados : eventos,
    soloGuardados,
    filtroFecha,
  );

  const mensajeVacio = soloGuardados
    ? "No tenés eventos guardados."
    : filtroFecha === "hoy"
      ? "No hay eventos para hoy."
      : filtroFecha === "semana"
        ? "No hay eventos para lo que queda de esta semana."
        : "No hay próximos eventos para mostrar.";

  return (
    <SafeAreaView style={styles.contenedor} edges={["top"]}>
      <View style={styles.cabecera}>
        <Text style={styles.subtitulo}>COLÓN · ENTRE RÍOS</Text>
        <Text style={styles.titulo}>Agenda de eventos</Text>
        {desdeCache && (
          <Text style={styles.advertencia}>
            Mostrando eventos guardados sin conexión.
          </Text>
        )}
        {guardadosSoloLectura && usuario && (
          <Text style={styles.advertencia}>
            Eventos guardados en modo consulta. Para modificarlos necesitás
            internet.
          </Text>
        )}
        <View style={styles.filaBotones}>
          <Pressable
            style={[styles.botonFiltro, !soloGuardados && styles.botonActivo]}
            onPress={() => setSoloGuardados(false)}
          >
            <Text
              style={[styles.textoFiltro, !soloGuardados && styles.textoActivo]}
            >
              Próximos
            </Text>
          </Pressable>
          <Pressable
            style={[styles.botonFiltro, soloGuardados && styles.botonActivo]}
            onPress={() => {
              if (cargandoSesion) return;
              if (sesionBloqueada) {
                setSoloGuardados(true);
                void desbloquearSesion();
              } else if (usuario) {
                setSoloGuardados(true);
              } else {
                router.push("/ingresar");
              }
            }}
          >
            <Text
              style={[styles.textoFiltro, soloGuardados && styles.textoActivo]}
            >
              Mis guardados
            </Text>
          </Pressable>
        </View>
        {!soloGuardados && (
          <View style={styles.filaFechas}>
            {(
              [
                { valor: "todos", texto: "Todos los próximos" },
                { valor: "hoy", texto: "Hoy" },
                { valor: "semana", texto: "Esta semana" },
              ] as const
            ).map((opcion) => (
              <Pressable
                key={opcion.valor}
                accessibilityRole="button"
                accessibilityState={{ selected: filtroFecha === opcion.valor }}
                style={[
                  styles.botonFecha,
                  filtroFecha === opcion.valor && styles.botonFechaActivo,
                ]}
                onPress={() => setFiltroFecha(opcion.valor)}
              >
                <Text
                  style={[
                    styles.textoFecha,
                    filtroFecha === opcion.valor && styles.textoFechaActivo,
                  ]}
                >
                  {opcion.texto}
                </Text>
              </Pressable>
            ))}
          </View>
        )}
        {usuario && tokenSesion && !sesionBloqueada && (
          <View style={styles.bloquePush}>
            <Pressable
              style={styles.botonPush}
              disabled={gestionandoPush}
              onPress={() => void alternarPush()}
            >
              <Text style={styles.textoPush}>
                {gestionandoPush
                  ? "Actualizando avisos..."
                  : pushRegistrado
                    ? "Desactivar avisos de cambios"
                    : "Activar avisos de cambios"}
              </Text>
            </Pressable>
            {__DEV__ && pushRegistrado && (
              <Pressable onPress={() => void probarPush()}>
                <Text style={styles.prueba}>
                  Enviar prueba push (desarrollo)
                </Text>
              </Pressable>
            )}
          </View>
        )}
      </View>
      {soloGuardados && (cargandoSesion || sesionBloqueada || !usuario) ? (
        <AccesoProtegido
          titulo="Mis eventos guardados"
          descripcion="Desbloqueá tu sesión para consultar los eventos que guardaste."
        />
      ) : cargando ? (
        <View style={styles.centro}>
          <ActivityIndicator size="large" color="#185F65" />
          <Text style={styles.textoSecundario}>Cargando agenda...</Text>
        </View>
      ) : error ? (
        <View style={styles.centro}>
          <Text style={styles.advertencia}>{error}</Text>
          <Pressable onPress={() => void cargarEventos()}>
            <Text style={styles.prueba}>Reintentar</Text>
          </Pressable>
        </View>
      ) : (
        <SectionList
          sections={secciones}
          keyExtractor={(evento) => evento.id}
          renderSectionHeader={({ section }) => (
            <View style={styles.cabeceraDia}>
              <Text style={styles.textoDia}>{section.titulo}</Text>
            </View>
          )}
          renderItem={({ item }) => (
            <TarjetaEvento
              evento={item}
              nombreLugar={item.lugarId ? nombresLugares[item.lugarId] : null}
              alPresionar={(evento) =>
                router.push({
                  pathname: "/evento/[id]",
                  params: { id: evento.id },
                })
              }
            />
          )}
          contentContainerStyle={styles.lista}
          stickySectionHeadersEnabled={false}
          refreshControl={
            <RefreshControl
              refreshing={refrescando}
              onRefresh={() => {
                setRefrescando(true);
                void cargarEventos();
              }}
            />
          }
          ListEmptyComponent={
            <View style={styles.centro}>
              <Text style={styles.textoSecundario}>{mensajeVacio}</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  contenedor: { flex: 1, backgroundColor: "#F6F8F5" },
  cabecera: {
    backgroundColor: "#F6F8F5",
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 14,
  },
  subtitulo: {
    color: "#185F65",
    fontSize: 14,
    fontWeight: "800",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  titulo: {
    fontSize: 27,
    fontWeight: "800",
    color: "#244243",
    marginBottom: 8,
  },
  advertencia: {
    fontSize: 15,
    lineHeight: 21,
    color: "#855126",
    paddingVertical: 6,
  },
  filaBotones: { flexDirection: "row", gap: 9, marginTop: 8 },
  botonFiltro: {
    flex: 1,
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: "#E8F1EC",
    borderWidth: 1,
    borderColor: "#D5E3DB",
  },
  botonActivo: { backgroundColor: "#185F65", borderColor: "#185F65" },
  textoFiltro: { fontSize: 16, fontWeight: "800", color: "#365957" },
  textoActivo: { color: "#FFFFFF" },
  filaFechas: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12 },
  botonFecha: {
    paddingHorizontal: 14,
    minHeight: 44,
    justifyContent: "center",
    borderRadius: 25,
    backgroundColor: "#FFFFFF",
    borderColor: "#CCDCD2",
    borderWidth: 1,
  },
  botonFechaActivo: { backgroundColor: "#185F65", borderColor: "#185F65" },
  textoFecha: { color: "#315C5C", fontSize: 15, fontWeight: "700" },
  textoFechaActivo: { color: "#FFFFFF" },
  cabeceraDia: {
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 5,
    backgroundColor: "#F6F8F5",
  },
  textoDia: { color: "#345A58", fontWeight: "800", fontSize: 15 },
  bloquePush: { marginTop: 12, gap: 5 },
  botonPush: {
    backgroundColor: "#E6F1ED",
    minHeight: 48,
    borderRadius: 12,
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  textoPush: {
    color: "#185F65",
    fontSize: 15,
    fontWeight: "800",
    textAlign: "center",
  },
  prueba: {
    color: "#185F65",
    fontSize: 15,
    fontWeight: "700",
    textAlign: "center",
    padding: 12,
  },
  centro: {
    padding: 28,
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
  },
  textoSecundario: {
    marginTop: 12,
    color: "#56706E",
    fontSize: 16,
    lineHeight: 23,
    textAlign: "center",
  },
  lista: { paddingBottom: 28, flexGrow: 1 },
});
