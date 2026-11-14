import { AccesoProtegido } from "@/components/AccesoProtegido";
import { useSesion } from "@/contextos/SesionContexto";
import { obtenerLugares } from "@/servicios/lugares";
import { obtenerVisitas, sincronizarVisitas } from "@/servicios/visitas";
import type { Visita } from "@/tipos/visita";
import * as Network from "expo-network";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

export default function Visitas() {
  const { usuario, tokenSesion, sesionBloqueada, cargandoSesion } = useSesion();
  const estadoRed = Network.useNetworkState();
  const conectado =
    estadoRed.isConnected === true && estadoRed.isInternetReachable !== false;
  const usuarioId = !sesionBloqueada ? usuario?.id : undefined;
  const token = !sesionBloqueada ? tokenSesion : null;
  const [visitas, setVisitas] = useState<Visita[]>([]);
  const [nombres, setNombres] = useState<Record<string, string>>({});
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");

  useFocusEffect(
    useCallback(() => {
      let activo = true;
      setVisitas([]);
      setNombres({});
      setError("");
      if (!usuarioId)
        return () => {
          activo = false;
        };

      async function cargar() {
        setCargando(true);
        try {
          const locales = await obtenerVisitas(usuarioId!);
          if (activo) setVisitas(locales);

          if (conectado && token) {
            const resultado = await sincronizarVisitas(usuarioId!, token);
            if (activo) {
              setVisitas(resultado.visitas);
              if (resultado.error) setError(resultado.error);
            }
          }
          const respuestaLugares = await obtenerLugares();
          if (activo) {
            setNombres(
              Object.fromEntries(
                respuestaLugares.datos.map((lugar) => [lugar.id, lugar.nombre]),
              ),
            );
          }
        } catch (fallo) {
          if (activo)
            setError(
              fallo instanceof Error
                ? fallo.message
                : "No se pudo cargar el recorrido.",
            );
        } finally {
          if (activo) setCargando(false);
        }
      }
      void cargar();
      return () => {
        activo = false;
      };
    }, [usuarioId, token, conectado]),
  );

  if (cargandoSesion || sesionBloqueada || !usuarioId) {
    return (
      <View style={estilos.scroll}>
        <AccesoProtegido
          titulo="Mi recorrido y visitas"
          descripcion="Desbloqueá tu sesión para consultar y registrar tus visitas."
        />
      </View>
    );
  }

  const pendientes = visitas.filter((visita) => !visita.sincronizada).length;

  return (
    <ScrollView
      style={estilos.scroll}
      contentContainerStyle={estilos.contenedor}
    >
      <Text style={estilos.marca}>TUS EXPERIENCIAS EN COLÓN</Text>
      <Text style={estilos.titulo}>Mi recorrido y visitas</Text>
      <Text style={estilos.descripcion}>
        Registrá los lugares que conociste y consultá tu historial.
      </Text>
      <Text style={estilos.estado}>
        {conectado ? "Con conexión" : "Sin conexión"} · {pendientes} visita(s)
        pendientes
      </Text>
      {error !== "" && (
        <Text style={estilos.error}>Sincronización pendiente: {error}</Text>
      )}
      {cargando && <ActivityIndicator style={estilos.cargando} />}
      <Text style={estilos.tituloAcciones}>Registrar una visita</Text>
      <View style={estilos.acciones}>
        <Pressable
          style={[estilos.boton, estilos.botonCompleto]}
          onPress={() => router.push("/escanear")}
          accessibilityRole="button"
        >
          <Text style={estilos.textoBoton}>▣ Escanear código QR</Text>
        </Pressable>
        <Pressable
          style={estilos.botonAlternativo}
          onPress={() => router.push("/visita-manual")}
          accessibilityRole="button"
        >
          <Text style={estilos.textoAlternativo}>✎ Registro manual</Text>
        </Pressable>
        <Pressable
          style={estilos.botonAlternativo}
          onPress={() => router.push("/visita-proximidad")}
          accessibilityRole="button"
        >
          <Text style={estilos.textoAlternativo}>◎ Por proximidad</Text>
        </Pressable>
      </View>
      <Text style={estilos.tituloAcciones}>Historial de visitas</Text>
      {visitas.length === 0 && !cargando ? (
        <View style={estilos.tarjeta}>
          <Text style={estilos.subtitulo}>
            Todavía no hay visitas registradas
          </Text>
          <Text style={estilos.texto}>
            Las visitas aparecerán aquí, incluso cuando estés sin conexión.
          </Text>
        </View>
      ) : (
        visitas.map((visita) => (
          <View key={visita.id} style={estilos.tarjeta}>
            <Text style={estilos.subtitulo}>
              {nombres[visita.lugarId] ?? visita.lugarId}
            </Text>
            <Text style={estilos.texto}>
              {new Date(visita.fechaHora).toLocaleString("es-AR", {
                dateStyle: "short",
                timeStyle: "short",
              })}
            </Text>
            <Text style={estilos.texto}>
              Registro:{" "}
              {visita.origen === "gps"
                ? "proximidad"
                : visita.origen.toUpperCase()}
            </Text>
            {visita.nota && (
              <Text style={estilos.texto}>Nota: {visita.nota}</Text>
            )}
            <Text
              style={
                visita.sincronizada ? estilos.sincronizada : estilos.pendiente
              }
            >
              {visita.sincronizada
                ? "Sincronizada con tu cuenta"
                : "Pendiente de sincronización"}
            </Text>
            {(visita.fotoLocalUri || visita.fotoUri) && (
              <Image
                source={{ uri: visita.fotoLocalUri || visita.fotoUri! }}
                style={estilos.foto}
              />
            )}
            <Pressable
              style={estilos.botonFoto}
              onPress={() =>
                router.push({
                  pathname: "/foto-visita",
                  params: { visitaId: visita.id },
                })
              }
            >
              <Text style={estilos.textoBotonFoto}>
                {visita.fotoUri
                  ? "Reemplazar fotografía"
                  : "Agregar fotografía"}
              </Text>
            </Pressable>
          </View>
        ))
      )}
    </ScrollView>
  );
}

const estilos = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: "#F6F8F5" },
  contenedor: {
    flexGrow: 1,
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 42,
    backgroundColor: "#F6F8F5",
    gap: 11,
  },
  marca: {
    color: "#185F65",
    fontWeight: "800",
    fontSize: 14,
    letterSpacing: 0.8,
  },
  titulo: { fontSize: 27, lineHeight: 34, fontWeight: "800", color: "#244344" },
  descripcion: {
    color: "#56706E",
    fontSize: 16,
    lineHeight: 23,
    marginBottom: 3,
  },
  estado: {
    fontSize: 15,
    color: "#37685D",
    backgroundColor: "#E7F1E9",
    borderRadius: 11,
    padding: 12,
    marginBottom: 2,
  },
  error: {
    padding: 13,
    backgroundColor: "#FFF1E0",
    color: "#855126",
    borderRadius: 12,
    fontSize: 15,
    lineHeight: 21,
  },
  cargando: { marginVertical: 9 },
  tituloAcciones: {
    fontSize: 20,
    fontWeight: "800",
    color: "#244344",
    marginTop: 12,
    marginBottom: 2,
  },
  acciones: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    justifyContent: "space-between",
    marginBottom: 5,
  },
  tarjeta: {
    padding: 16,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#DFE9E3",
    borderRadius: 17,
    gap: 9,
  },
  subtitulo: {
    fontSize: 19,
    lineHeight: 25,
    fontWeight: "800",
    color: "#244344",
  },
  texto: { fontSize: 16, lineHeight: 23, color: "#536E6C" },
  sincronizada: { color: "#237048", fontWeight: "800", fontSize: 15 },
  pendiente: { color: "#935A2D", fontWeight: "800", fontSize: 15 },
  foto: {
    width: "100%",
    height: 200,
    borderRadius: 12,
    backgroundColor: "#E7F0EB",
  },
  botonFoto: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 48,
    paddingHorizontal: 12,
    borderColor: "#C1D8CB",
    borderWidth: 1,
    borderRadius: 12,
    backgroundColor: "#EDF4EF",
  },
  textoBotonFoto: { color: "#185F65", fontSize: 16, fontWeight: "800" },
  boton: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 52,
    paddingHorizontal: 14,
    backgroundColor: "#185F65",
    borderRadius: 12,
  },
  botonCompleto: { width: "100%" },
  botonAlternativo: {
    minHeight: 60,
    width: "48%",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 7,
    paddingVertical: 8,
    borderColor: "#C4D8CD",
    borderWidth: 1,
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
  },
  textoAlternativo: {
    color: "#185F65",
    fontWeight: "800",
    fontSize: 16,
    lineHeight: 22,
    textAlign: "center",
  },
  textoBoton: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "800",
    textAlign: "center",
  },
});
