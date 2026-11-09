import type { BarcodeScanningResult } from "expo-camera";
import { CameraView, useCameraPermissions } from "expo-camera";
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
import { guardarVisitas, obtenerVisitas } from "../servicios/visitas";
import type { Visita } from "../tipos/visita";

export default function Escanear() {
  const [permiso, solicitarPermiso] = useCameraPermissions();
  const [escaneado, setEscaneado] = useState(false);

  async function alEscanear({ data }: BarcodeScanningResult) {
    if (escaneado) return;

    setEscaneado(true);

    try {
      const lugar = await obtenerLugarPorCodigoQr(data);

      if (lugar) {
        const visitasActuales = await obtenerVisitas();

        const nuevaVisita: Visita = {
          id: `${lugar.id}-${Date.now()}`,
          lugarId: lugar.id,
          fecha: new Date().toISOString(),
          metodo: "qr",
          nota: null,
          fotos: [],
          sincronizada: false,
        };

        await guardarVisitas([...visitasActuales, nuevaVisita]);

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
    } catch {
      Alert.alert("Error", "No se pudo comprobar el código.", [
        {
          text: "Reintentar",
          onPress: () => setEscaneado(false),
        },
      ]);
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
          <Text>Volver sin usar la cámara</Text>
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
    padding: 20,
    backgroundColor: "#FFFFFF",
  },
  centro: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
    gap: 20,
    backgroundColor: "#FFFFFF",
  },
  mensaje: {
    fontSize: 16,
    textAlign: "center",
    marginBottom: 15,
  },
  camara: {
    flex: 1,
    borderRadius: 12,
    overflow: "hidden",
  },
  boton: {
    padding: 14,
    backgroundColor: "#2563EB",
    borderRadius: 8,
  },
  textoBoton: {
    color: "#FFFFFF",
    fontWeight: "bold",
  },
});
