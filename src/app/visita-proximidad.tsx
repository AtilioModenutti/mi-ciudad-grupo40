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
        Alert.alert(
          "Ubicación",
          "Necesitamos permiso de ubicación para registrar una visita por proximidad.",
        );
        return;
      }
      const posicion = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      const { datos: lugares } = await obtenerLugares();
      let cercano: Lugar | null = null;
      let distanciaMinima = Infinity;
      for (const lugar of lugares) {
        if (!lugar.activo) continue;
        const distancia = distanceMeters(
          {
            latitud: posicion.coords.latitude,
            longitud: posicion.coords.longitude,
          },
          lugar.coordenadas,
        );
        if (distancia < distanciaMinima) {
          cercano = lugar;
          distanciaMinima = distancia;
        }
      }
      if (!cercano || distanciaMinima > RADIO_PROXIMIDAD_METROS) {
        Alert.alert(
          "Sin lugares cercanos",
          "No se encontró un lugar turístico dentro de los 200 metros.",
        );
        return;
      }
      await registrarVisita(usuario.id, cercano.id, "gps");
      // La visita ya está guardada; la vibración es opcional si la build no incluye este módulo.
      try {
        await Haptics.notificationAsync(
          Haptics.NotificationFeedbackType.Success,
        );
      } catch {
        // No impedir la navegación ni mostrar un error por una vibración no disponible.
      }
      Alert.alert(
        "Visita registrada",
        `Registraste una visita a ${cercano.nombre}.`,
        [
          {
            text: "Ver mi recorrido",
            onPress: () => router.replace("/visitas"),
          },
        ],
      );
    } catch (fallo) {
      Alert.alert(
        "Visita",
        fallo instanceof Error
          ? fallo.message
          : "No se pudo comprobar la proximidad.",
      );
    } finally {
      setComprobando(false);
    }
  }

  return (
    <View style={estilos.contenedor}>
      <Text style={estilos.titulo}>Visita por proximidad</Text>
      <Text style={estilos.descripcion}>
        Registrá tu visita cuando estés a menos de 200 metros de un lugar
        turístico. Se utiliza tu ubicación actual.
      </Text>
      {!usuario || sesionBloqueada ? (
        <Text>Iniciá sesión para registrar visitas.</Text>
      ) : (
        <Pressable
          style={[estilos.boton, comprobando && estilos.desactivado]}
          disabled={comprobando}
          onPress={() => void comprobar()}
        >
          <Text style={estilos.botonTexto}>
            {comprobando ? "Comprobando ubicación..." : "Comprobar proximidad"}
          </Text>
        </Pressable>
      )}
    </View>
  );
}

const estilos = StyleSheet.create({
  contenedor: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 26,
    backgroundColor: "#F6F8F5",
    gap: 17,
  },
  titulo: { fontSize: 28, lineHeight: 35, color: "#244344", fontWeight: "800" },
  descripcion: {
    fontSize: 17,
    lineHeight: 25,
    color: "#526E6A",
    marginBottom: 4,
  },
  boton: {
    backgroundColor: "#185F65",
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 56,
    paddingHorizontal: 15,
  },
  botonTexto: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "800",
    textAlign: "center",
  },
  desactivado: { opacity: 0.5 },
});
