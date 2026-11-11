import { CameraView, useCameraPermissions } from "expo-camera";
import { File, Paths } from "expo-file-system";
import { router, useLocalSearchParams } from "expo-router";
import { useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { guardarVisitas, obtenerVisitas } from "../servicios/visitas";

export default function FotoVisita() {
  const { visitaId } = useLocalSearchParams<{ visitaId?: string }>();
  const [permiso, solicitarPermiso] = useCameraPermissions();
  const cameraRef = useRef<CameraView | null>(null);
  const [camaraLista, setCamaraLista] = useState(false);
  const [guardando, setGuardando] = useState(false);
  async function tomarFoto() {
    if (!visitaId || !camaraLista || guardando || !cameraRef.current) {
      return;
    }

    setGuardando(true);

    try {
      const foto = await cameraRef.current.takePictureAsync({
        quality: 0.8,
      });

      if (!foto?.uri) {
        return;
      }

      const archivoTemporal = new File(foto.uri);
      const archivoGuardado = new File(
        Paths.document,
        `visita-${visitaId}-${Date.now()}.jpg`,
      );

      await archivoTemporal.copy(archivoGuardado);

      const visitasActuales = await obtenerVisitas();

      const visitasActualizadas = visitasActuales.map((visita) =>
        visita.id === visitaId
          ? {
              ...visita,
              fotos: [...visita.fotos, archivoGuardado.uri],
            }
          : visita,
      );

      await guardarVisitas(visitasActualizadas);

      router.replace("/visitas");
    } catch (error) {
      console.error("Error al guardar la fotografía:", error);
    } finally {
      setGuardando(false);
    }
  }
  if (!permiso) {
    return (
      <View>
        <Text>Comprobando permiso de cámara...</Text>
      </View>
    );
  }

  if (!permiso.granted) {
    return (
      <View>
        <Text>Necesitamos permiso para usar la cámara.</Text>

        <Pressable onPress={solicitarPermiso}>
          <Text>Permitir cámara</Text>
        </Pressable>
      </View>
    );
  }
  if (!visitaId) {
    return (
      <View style={estilos.contenedor}>
        <Text>No se encontró la visita.</Text>
      </View>
    );
  }

  return (
    <View style={estilos.contenedor}>
      <Text style={estilos.titulo}>Agregar fotografía</Text>

      <CameraView
        ref={cameraRef}
        style={estilos.camara}
        facing="back"
        onCameraReady={() => setCamaraLista(true)}
      />

      <Pressable
        style={[
          estilos.boton,
          (!camaraLista || guardando) && estilos.botonDeshabilitado,
        ]}
        disabled={!camaraLista || guardando}
        onPress={tomarFoto}
      >
        <Text style={estilos.textoBoton}>
          {guardando ? "Guardando..." : "Tomar foto"}
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
    marginBottom: 20,
  },
  camara: {
    flex: 1,
    borderRadius: 12,
    overflow: "hidden",
  },
  boton: {
    padding: 16,
    backgroundColor: "#2563EB",
    borderRadius: 8,
    alignItems: "center",
    marginTop: 20,
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
