import { useSesion } from "@/contextos/SesionContexto";
import { registrarVisita } from "@/servicios/visitas";
import type { BarcodeScanningResult } from "expo-camera";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import { useState } from "react";
import {
  Alert,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { obtenerLugarPorCodigoQr } from "../servicios/lugares";

export default function Escanear() {
  const [permiso, solicitarPermiso] = useCameraPermissions();
  const [escaneado, setEscaneado] = useState(false);
  const { usuario, sesionBloqueada } = useSesion();

  async function alEscanear({ data }: BarcodeScanningResult) {
    if (escaneado) return;

    setEscaneado(true);

    try {
      const lugar = await obtenerLugarPorCodigoQr(data);

      if (lugar) {
        // Un invitado puede consultar el QR; la visita solo se guarda con sesión.
        if (usuario && !sesionBloqueada) {
          await registrarVisita(usuario.id, lugar.id, "qr");
          // La visita ya está guardada; la vibración es opcional si la build no incluye este módulo.
          try {
            await Haptics.notificationAsync(
              Haptics.NotificationFeedbackType.Success,
            );
          } catch {
            // No impedir la navegación ni mostrar un error por una vibración no disponible.
          }
        }
        router.replace({
          pathname: "/lugar/[id]",
          params: { id: lugar.id },
        });
      } else {
        Alert.alert(
          "QR no reconocido",
          "El código no corresponde a un lugar turístico válido.",
          [
            {
              text: "Volver a escanear",
              onPress: () => setEscaneado(false),
            },
          ],
        );
      }
    } catch (error) {
      Alert.alert(
        "Error",
        error instanceof Error
          ? error.message
          : "No se pudo comprobar el código.",
        [
          {
            text: "Reintentar",
            onPress: () => setEscaneado(false),
          },
        ],
      );
    }
  }

  if (!permiso) {
    return <Text>Comprobando permiso de cámara...</Text>;
  }

  if (!permiso.granted) {
    return (
      <View style={estilos.centro}>
        <Text style={estilos.mensaje}>
          Necesitamos permiso para utilizar la cámara y leer códigos QR.
        </Text>

        <Pressable
          style={estilos.boton}
          onPress={() =>
            permiso.canAskAgain ? solicitarPermiso() : Linking.openSettings()
          }
        >
          <Text style={estilos.textoBoton}>
            {permiso.canAskAgain ? "Permitir cámara" : "Abrir configuración"}
          </Text>
        </Pressable>

        <Pressable onPress={() => router.back()}>
          <Text style={estilos.volver}>Volver sin usar la cámara</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={estilos.contenedor}>
      <Text style={estilos.mensaje}>
        Apuntá la cámara al código QR del lugar turístico.
      </Text>

      <CameraView
        style={estilos.camara}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
        onBarcodeScanned={escaneado ? undefined : alEscanear}
      />
    </View>
  );
}

const estilos = StyleSheet.create({
  contenedor: {
    flex: 1,
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 20,
    backgroundColor: "#F6F8F5",
  },
  centro: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 22,
    gap: 22,
    backgroundColor: "#F6F8F5",
  },
  mensaje: {
    fontSize: 17,
    lineHeight: 25,
    textAlign: "center",
    color: "#294B4A",
    marginBottom: 17,
    fontWeight: "600",
  },
  camara: {
    flex: 1,
    borderRadius: 17,
    overflow: "hidden",
    backgroundColor: "#E2EEE8",
  },
  boton: {
    minHeight: 54,
    justifyContent: "center",
    paddingHorizontal: 22,
    backgroundColor: "#185F65",
    borderRadius: 12,
    alignItems: "center",
  },
  textoBoton: { fontSize: 17, color: "#FFFFFF", fontWeight: "800" },
  volver: {
    fontSize: 16,
    fontWeight: "700",
    color: "#185F65",
    paddingVertical: 12,
    textAlign: "center",
  },
});
