import * as Haptics from "expo-haptics";
import * as Location from "expo-location";
import { router } from "expo-router";
import { useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";

import { obtenerLugares } from "../servicios/lugares";
import { guardarVisitas, obtenerVisitas } from "../servicios/visitas";
import type { Lugar } from "../tipos/lugar";
import type { Visita } from "../tipos/visita";

function calcularDistanciaMetros(
  latitud1: number,
  longitud1: number,
  latitud2: number,
  longitud2: number,
) {
  const radioTierra = 6371000;
  const aRadianes = (grados: number) => (grados * Math.PI) / 180;

  const diferenciaLatitud = aRadianes(latitud2 - latitud1);
  const diferenciaLongitud = aRadianes(longitud2 - longitud1);

  const a =
    Math.sin(diferenciaLatitud / 2) ** 2 +
    Math.cos(aRadianes(latitud1)) *
      Math.cos(aRadianes(latitud2)) *
      Math.sin(diferenciaLongitud / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return radioTierra * c;
}

const RADIO_PROXIMIDAD_METROS = 200;

export default function VisitaProximidad() {
  const [comprobando, setComprobando] = useState(false);

  async function registrarPorProximidad() {
    setComprobando(true);

    try {
      const permiso = await Location.requestForegroundPermissionsAsync();

      if (permiso.status !== "granted") {
        Alert.alert(
          "Permiso de ubicación",
          "Necesitamos permiso de ubicación para registrar una visita por proximidad.",
        );
        return;
      }

      const posicion = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
        mayShowUserSettingsDialog: false,
      });

      const respuesta = await obtenerLugares();
      const lugares = respuesta.datos;

      let lugarCercano: Lugar | null = null;
      let menorDistancia = Infinity;

      for (const lugar of lugares) {
        const distancia = calcularDistanciaMetros(
          posicion.coords.latitude,
          posicion.coords.longitude,
          lugar.coordenadas.latitud,
          lugar.coordenadas.longitud,
        );

        if (distancia < menorDistancia) {
          menorDistancia = distancia;
          lugarCercano = lugar;
        }
      }

      if (!lugarCercano || menorDistancia > RADIO_PROXIMIDAD_METROS) {
        Alert.alert(
          "Sin lugares cercanos",
          "No se encontró ningún lugar turístico dentro del radio de proximidad.",
        );
        return;
      }

      const visitasActuales = await obtenerVisitas();

      const nuevaVisita: Visita = {
        id: `${lugarCercano.id}-${Date.now()}`,
        lugarId: lugarCercano.id,
        fecha: new Date().toISOString(),
        metodo: "proximidad",
        nota: null,
        fotos: [],
        sincronizada: false,
      };

      await guardarVisitas([...visitasActuales, nuevaVisita]);

      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      router.replace("/visitas");
    } catch (error) {
      const mensaje = error instanceof Error ? error.message : String(error);

      console.error("Error al registrar visita por proximidad:", error);

      Alert.alert(
        "Error",
        `No se pudo registrar la visita por proximidad.\n\n${mensaje}`,
      );
    } finally {
      setComprobando(false);
    }
  }

  return (
    <View style={estilos.contenedor}>
      <Text style={estilos.titulo}>Registrar visita por proximidad</Text>

      <Text style={estilos.descripcion}>
        Usá tu ubicación actual para comprobar si estás cerca de un lugar
        turístico.
      </Text>

      <Pressable
        style={[estilos.boton, comprobando && estilos.botonDeshabilitado]}
        disabled={comprobando}
        onPress={registrarPorProximidad}
      >
        <Text style={estilos.textoBoton}>
          {comprobando ? "Comprobando ubicación..." : "Comprobar proximidad"}
        </Text>
      </Pressable>
    </View>
  );
}

const estilos = StyleSheet.create({
  contenedor: {
    flex: 1,
    padding: 24,
    backgroundColor: "#FFFFFF",
  },
  titulo: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 12,
  },
  descripcion: {
    fontSize: 16,
    marginBottom: 24,
  },
  boton: {
    padding: 16,
    backgroundColor: "#2563EB",
    borderRadius: 8,
    alignItems: "center",
  },
  botonDeshabilitado: {
    opacity: 0.5,
  },
  textoBoton: {
    color: "#FFFFFF",
    fontWeight: "bold",
    fontSize: 16,
  },
});
