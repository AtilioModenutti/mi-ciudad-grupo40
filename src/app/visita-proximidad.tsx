import { useSesion } from "@/contextos/SesionContexto";
import { distanceMeters } from "@/lib/geo";
import { obtenerLugares } from "@/servicios/lugares";
import { registrarVisita } from "@/servicios/visitas";
import type { Lugar } from "@/tipos/lugar";
import * as Haptics from "expo-haptics";
import * as Location from "expo-location";
import { router } from "expo-router";
import { useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";

const RADIO_PROXIMIDAD_METROS = 200;

export default function VisitaProximidad() {
  const { usuario, sesionBloqueada } = useSesion();
  const [comprobando, setComprobando] = useState(false);

  async function comprobar() {
    if (!usuario || sesionBloqueada || comprobando) return;
    setComprobando(true);
    try {
      const permiso = await Location.requestForegroundPermissionsAsync();
      if (permiso.status !== "granted") {
        Alert.alert("Ubicación", "Necesitamos permiso de ubicación para registrar una visita por proximidad.");
        return;
      }
      const posicion = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const { datos: lugares } = await obtenerLugares();
      let cercano: Lugar | null = null;
      let distanciaMinima = Infinity;
      for (const lugar of lugares) {
        if (!lugar.activo) continue;
        const distancia = distanceMeters(
          { latitud: posicion.coords.latitude, longitud: posicion.coords.longitude },
          lugar.coordenadas,
        );
        if (distancia < distanciaMinima) {
          cercano = lugar;
          distanciaMinima = distancia;
        }
      }
      if (!cercano || distanciaMinima > RADIO_PROXIMIDAD_METROS) {
        Alert.alert("Sin lugares cercanos", "No se encontró un lugar turístico dentro de los 200 metros.");
        return;
      }
      await registrarVisita(usuario.id, cercano.id, "gps");
      // La visita ya está guardada; la vibración es opcional si la build no incluye este módulo.
      try {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch {
        // No impedir la navegación ni mostrar un error por una vibración no disponible.
      }
      Alert.alert("Visita registrada", `Registraste una visita a ${cercano.nombre}.`, [
        { text: "Ver mi recorrido", onPress: () => router.replace("/visitas") },
      ]);
    } catch (fallo) {
      Alert.alert("Visita", fallo instanceof Error ? fallo.message : "No se pudo comprobar la proximidad.");
    } finally {
      setComprobando(false);
    }
  }

  return (
    <View style={estilos.contenedor}>
      <Text style={estilos.titulo}>Visita por proximidad</Text>
      <Text style={estilos.descripcion}>Registrá tu visita cuando estés a menos de 200 metros de un lugar turístico. Se utiliza tu ubicación actual.</Text>
      {!usuario || sesionBloqueada ? (
        <Text>Iniciá sesión para registrar visitas.</Text>
      ) : (
        <Pressable style={[estilos.boton, comprobando && estilos.desactivado]} disabled={comprobando} onPress={() => void comprobar()}>
          <Text style={estilos.botonTexto}>{comprobando ? "Comprobando ubicación..." : "Comprobar proximidad"}</Text>
        </Pressable>
      )}
    </View>
  );
}

const estilos = StyleSheet.create({
  contenedor: { flex: 1, padding: 24, backgroundColor: "#FFFFFF", gap: 18 },
  titulo: { fontSize: 26, fontWeight: "bold" },
  descripcion: { fontSize: 16, lineHeight: 24 },
  boton: { backgroundColor: "#2563EB", borderRadius: 8, alignItems: "center", padding: 16 },
  botonTexto: { color: "#FFFFFF", fontSize: 16, fontWeight: "bold" },
  desactivado: { opacity: 0.5 },
});
