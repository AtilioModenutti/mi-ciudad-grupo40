import { useSesion } from "@/contextos/SesionContexto";
import { obtenerLugares } from "@/servicios/lugares";
import { registrarVisita } from "@/servicios/visitas";
import type { Lugar } from "@/tipos/lugar";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

export default function VisitaManual() {
  const { usuario, sesionBloqueada } = useSesion();
  const [lugares, setLugares] = useState<Lugar[]>([]);
  const [seleccionado, setSeleccionado] = useState<string | null>(null);
  const [nota, setNota] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let activo = true;
    obtenerLugares()
      .then((respuesta) => { if (activo) setLugares(respuesta.datos); })
      .catch((fallo) => { if (activo) setError(fallo instanceof Error ? fallo.message : "No se pudo cargar el catálogo."); })
      .finally(() => { if (activo) setCargando(false); });
    return () => { activo = false; };
  }, []);

  async function registrar() {
    if (!seleccionado || !usuario || sesionBloqueada || guardando) return;
    setGuardando(true);
    try {
      await registrarVisita(usuario.id, seleccionado, "manual", nota.trim() || null);
      // La visita ya está guardada; la vibración es opcional si la build no incluye este módulo.
      try {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch {
        // No impedir la navegación ni mostrar un error por una vibración no disponible.
      }
      router.replace("/visitas");
    } catch (fallo) {
      Alert.alert("Visita", fallo instanceof Error ? fallo.message : "No se pudo guardar la visita.");
    } finally {
      setGuardando(false);
    }
  }

  if (!usuario || sesionBloqueada) {
    return <View style={estilos.contenedor}><Text>Iniciá sesión para registrar visitas.</Text></View>;
  }

  return (
    <ScrollView style={estilos.scroll} contentContainerStyle={estilos.contenedor} keyboardShouldPersistTaps="handled">
      <Text style={estilos.titulo}>Registrar visita manual</Text>
      <Text>Elegí un lugar real del catálogo, incluso desde el catálogo descargado.</Text>
      <TextInput style={estilos.campo} placeholder="Buscar lugar..." value={busqueda} onChangeText={setBusqueda} />
      <TextInput style={[estilos.campo, estilos.nota]} placeholder="Nota de la visita (opcional)" multiline textAlignVertical="top" value={nota} onChangeText={setNota} />
      {cargando && <ActivityIndicator />}
      {error !== "" && <Text style={estilos.error}>{error}</Text>}
      {lugares.filter((lugar) => lugar.nombre.toLowerCase().includes(busqueda.toLowerCase())).map((lugar) => (
        <Pressable
          key={lugar.id}
          style={[estilos.opcion, seleccionado === lugar.id && estilos.opcionActiva]}
          onPress={() => setSeleccionado(lugar.id)}
          accessibilityRole="button"
          accessibilityState={{ selected: seleccionado === lugar.id }}
        >
          <Text>{lugar.nombre}</Text>
        </Pressable>
      ))}
      <Pressable style={[estilos.boton, (!seleccionado || guardando) && estilos.desactivado]} disabled={!seleccionado || guardando} onPress={() => void registrar()}>
        <Text style={estilos.botonTexto}>{guardando ? "Guardando..." : "Registrar visita"}</Text>
      </Pressable>
    </ScrollView>
  );
}

const estilos = StyleSheet.create({
  scroll: { backgroundColor: "#FFFFFF", flex: 1 },
  contenedor: { padding: 22, gap: 12, paddingBottom: 48 },
  titulo: { fontSize: 26, fontWeight: "bold", marginBottom: 8 },
  campo: { borderWidth: 1, borderColor: "#CBD5E1", borderRadius: 8, padding: 12, fontSize: 16 },
  nota: { minHeight: 88 },
  opcion: { borderWidth: 1, borderColor: "#CBD5E1", padding: 14, borderRadius: 8 },
  opcionActiva: { borderWidth: 2, borderColor: "#2563EB", backgroundColor: "#EFF6FF" },
  boton: { backgroundColor: "#2563EB", padding: 16, borderRadius: 8, alignItems: "center" },
  botonTexto: { color: "#FFFFFF", fontSize: 16, fontWeight: "bold" },
  desactivado: { opacity: 0.5 },
  error: { color: "#B91C1C" },
});
