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
  const { usuario, tokenSesion, sesionBloqueada } = useSesion();
  const estadoRed = Network.useNetworkState();
  const conectado = estadoRed.isConnected === true && estadoRed.isInternetReachable !== false;
  const usuarioId = !sesionBloqueada ? usuario?.id : undefined;
  const token = !sesionBloqueada ? tokenSesion : null;
  const [visitas, setVisitas] = useState<Visita[]>([]);
  const [nombres, setNombres] = useState<Record<string, string>>({});
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");

  useFocusEffect(
    useCallback(() => {
      let activo = true;
      setVisitas([]); // No mostrar visitas del usuario anterior al cambiar de cuenta.
      setNombres({});
      setError("");
      if (!usuarioId) return () => { activo = false; };

      async function cargar() {
        setCargando(true);
        try {
          const locales = await obtenerVisitas(usuarioId!);
          if (activo) setVisitas(locales);

          // El servicio también sirve sin conexión, usando las visitas guardadas.
          if (conectado && token) {
            const resultado = await sincronizarVisitas(usuarioId!, token);
            if (activo) {
              setVisitas(resultado.visitas);
              if (resultado.error) setError(resultado.error);
            }
          }
          const respuestaLugares = await obtenerLugares();
          if (activo) {
            setNombres(Object.fromEntries(respuestaLugares.datos.map((lugar) => [lugar.id, lugar.nombre])));
          }
        } catch (fallo) {
          if (activo) setError(fallo instanceof Error ? fallo.message : "No se pudo cargar el recorrido.");
        } finally {
          if (activo) setCargando(false);
        }
      }
      void cargar();
      return () => { activo = false; };
    }, [usuarioId, token, conectado]),
  );

  if (!usuarioId) {
    return (
      <View style={estilos.contenedor}>
        <Text style={estilos.titulo}>Mi recorrido y visitas</Text>
        <Text style={estilos.texto}>Ingresá a tu cuenta para guardar y sincronizar tus visitas.</Text>
        <Pressable style={estilos.boton} onPress={() => router.push("/ingresar")}>
          <Text style={estilos.textoBoton}>Ingresar</Text>
        </Pressable>
      </View>
    );
  }

  const pendientes = visitas.filter((visita) => !visita.sincronizada).length;

  return (
    <ScrollView style={estilos.scroll} contentContainerStyle={estilos.contenedor}>
      <Text style={estilos.titulo}>Mi recorrido y visitas</Text>
      <Text style={estilos.descripcion}>Registrá los lugares que conociste y consultá tu historial.</Text>
      <Text style={estilos.estado}>{conectado ? "Con conexión" : "Sin conexión"} · {pendientes} visita(s) pendientes</Text>
      {error !== "" && <Text style={estilos.error}>Sincronización pendiente: {error}</Text>}
      {cargando && <ActivityIndicator style={estilos.cargando} />}
      {visitas.length === 0 && !cargando ? (
        <View style={estilos.tarjeta}>
          <Text style={estilos.subtitulo}>Todavía no hay visitas registradas</Text>
          <Text>Las visitas aparecerán aquí, incluso cuando estés sin conexión.</Text>
        </View>
      ) : visitas.map((visita) => (
        <View key={visita.id} style={estilos.tarjeta}>
          <Text style={estilos.subtitulo}>{nombres[visita.lugarId] ?? visita.lugarId}</Text>
          <Text style={estilos.texto}>{new Date(visita.fechaHora).toLocaleString("es-AR", { dateStyle: "short", timeStyle: "short" })}</Text>
          <Text style={estilos.texto}>Registro: {visita.origen === "gps" ? "proximidad" : visita.origen.toUpperCase()}</Text>
          {visita.nota && <Text style={estilos.texto}>Nota: {visita.nota}</Text>}
          <Text style={visita.sincronizada ? estilos.sincronizada : estilos.pendiente}>
            {visita.sincronizada ? "Sincronizada con tu cuenta" : "Pendiente de sincronización"}
          </Text>
          {(visita.fotoLocalUri || visita.fotoUri) && (
            <Image source={{ uri: visita.fotoLocalUri || visita.fotoUri! }} style={estilos.foto} />
          )}
          <Pressable
            style={estilos.botonFoto}
            onPress={() => router.push({ pathname: "/foto-visita", params: { visitaId: visita.id } })}
          >
            <Text style={estilos.textoBotonFoto}>{visita.fotoUri ? "Reemplazar fotografía" : "Agregar fotografía"}</Text>
          </Pressable>
        </View>
      ))}
      <Pressable style={estilos.boton} onPress={() => router.push("/escanear")}>
        <Text style={estilos.textoBoton}>Escanear código QR</Text>
      </Pressable>
      <Pressable style={estilos.boton} onPress={() => router.push("/visita-manual")}>
        <Text style={estilos.textoBoton}>Registrar visita manualmente</Text>
      </Pressable>
      <Pressable style={estilos.boton} onPress={() => router.push("/visita-proximidad")}>
        <Text style={estilos.textoBoton}>Registrar por proximidad</Text>
      </Pressable>
    </ScrollView>
  );
}

const estilos = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: "#FFFFFF" },
  contenedor: { flexGrow: 1, padding: 22, paddingBottom: 48, backgroundColor: "#FFFFFF", gap: 12 },
  titulo: { fontSize: 27, fontWeight: "bold", color: "#0F172A" },
  descripcion: { color: "#475569", fontSize: 16 },
  estado: { fontSize: 14, color: "#334155", marginBottom: 4 },
  error: { padding: 10, backgroundColor: "#FEF3C7", color: "#92400E", borderRadius: 8 },
  cargando: { marginVertical: 8 },
  tarjeta: { padding: 16, borderWidth: 1, borderColor: "#CBD5E1", borderRadius: 12, gap: 7 },
  subtitulo: { fontSize: 18, fontWeight: "bold", color: "#0F172A" },
  texto: { fontSize: 15, color: "#334155" },
  sincronizada: { color: "#166534", fontWeight: "600", fontSize: 13 },
  pendiente: { color: "#92400E", fontWeight: "600", fontSize: 13 },
  foto: { width: "100%", height: 190, borderRadius: 8 },
  botonFoto: { alignItems: "center", padding: 12, borderColor: "#2563EB", borderWidth: 1, borderRadius: 8 },
  textoBotonFoto: { color: "#1D4ED8", fontWeight: "600" },
  boton: { alignItems: "center", padding: 15, backgroundColor: "#2563EB", borderRadius: 9 },
  textoBoton: { color: "#FFFFFF", fontSize: 16, fontWeight: "bold" },
});
