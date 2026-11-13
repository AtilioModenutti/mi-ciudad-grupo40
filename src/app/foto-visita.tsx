import { useSesion } from "@/contextos/SesionContexto";
import { agregarFotoLocal } from "@/servicios/visitas";
import { CameraView, useCameraPermissions } from "expo-camera";
import { File, Paths } from "expo-file-system";
import { router, useLocalSearchParams } from "expo-router";
import { useRef, useState } from "react";
import {
  Alert,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

export default function FotoVisita() {
  const { visitaId } = useLocalSearchParams<{ visitaId?: string }>();
  const { usuario, sesionBloqueada } = useSesion();
  const [permiso, solicitarPermiso] = useCameraPermissions();
  const camara = useRef<CameraView | null>(null);
  const [camaraLista, setCamaraLista] = useState(false);
  const [guardando, setGuardando] = useState(false);

  async function tomarFoto() {
    if (
      !usuario ||
      sesionBloqueada ||
      !visitaId ||
      !camara.current ||
      !camaraLista ||
      guardando
    )
      return;
    setGuardando(true);
    try {
      const captura = await camara.current.takePictureAsync({ quality: 0.8 });
      if (!captura?.uri)
        throw new Error("La cámara no devolvió una fotografía.");

      const origen = new File(captura.uri);
      const destino = new File(
        Paths.document,
        `visita-${visitaId}-${Date.now()}.jpg`,
      );
      await origen.copy(destino);
      await agregarFotoLocal(usuario.id, visitaId, destino.uri);
      router.replace("/visitas");
    } catch (fallo) {
      Alert.alert(
        "Fotografía",
        fallo instanceof Error
          ? fallo.message
          : "No se pudo guardar la fotografía.",
      );
    } finally {
      setGuardando(false);
    }
  }

  if (!usuario || sesionBloqueada) {
    return (
      <View style={estilos.contenedor}>
        <Text>Necesitás iniciar sesión para agregar fotos a tus visitas.</Text>
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
  if (!permiso) {
    return (
      <View style={estilos.contenedor}>
        <Text>Comprobando permiso de cámara...</Text>
      </View>
    );
  }
  if (!permiso.granted) {
    return (
      <View style={estilos.contenedor}>
        <Text>Necesitamos permiso para tomar la fotografía.</Text>
        <Pressable
          style={estilos.boton}
          onPress={() =>
            permiso.canAskAgain
              ? void solicitarPermiso()
              : void Linking.openSettings()
          }
        >
          <Text style={estilos.botonTexto}>
            {permiso.canAskAgain ? "Permitir cámara" : "Abrir configuración"}
          </Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={estilos.contenedor}>
      <Text style={estilos.titulo}>Fotografía de la visita</Text>
      <Text style={estilos.descripcion}>
        Guardá una foto de tu experiencia. Si ya tenías una, la nueva la
        reemplazará.
      </Text>
      <CameraView
        ref={camara}
        style={estilos.camara}
        facing="back"
        onCameraReady={() => setCamaraLista(true)}
      />
      <Pressable
        style={[
          estilos.boton,
          (!camaraLista || guardando) && estilos.desactivado,
        ]}
        disabled={!camaraLista || guardando}
        onPress={() => void tomarFoto()}
      >
        <Text style={estilos.botonTexto}>
          {guardando ? "Guardando..." : "Tomar fotografía"}
        </Text>
      </Pressable>
    </View>
  );
}

const estilos = StyleSheet.create({
  contenedor: {
    flex: 1,
    backgroundColor: "#F6F8F5",
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 22,
    gap: 13,
  },
  titulo: { fontSize: 27, lineHeight: 34, color: "#244344", fontWeight: "800" },
  descripcion: {
    color: "#536F6B",
    fontSize: 16,
    lineHeight: 23,
    marginBottom: 4,
  },
  camara: {
    flex: 1,
    borderRadius: 17,
    overflow: "hidden",
    minHeight: 220,
    backgroundColor: "#E1EEE5",
  },
  boton: {
    minHeight: 54,
    paddingHorizontal: 15,
    backgroundColor: "#185F65",
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  botonTexto: { fontSize: 17, fontWeight: "800", color: "#FFFFFF" },
  desactivado: { opacity: 0.48 },
});
