import { useSesion } from "@/contextos/SesionContexto";
import { agregarFotoLocal } from "@/servicios/visitas";
import { CameraView, useCameraPermissions } from "expo-camera";
import { File, Paths } from "expo-file-system";
import * as ImagePicker from "expo-image-picker";
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
  const { usuario, sesionBloqueada, ejecutarActividadNativa } = useSesion();
  const [permiso, solicitarPermiso] = useCameraPermissions();
  const camara = useRef<CameraView | null>(null);
  const [mostrarCamara, setMostrarCamara] = useState(false);
  const [camaraLista, setCamaraLista] = useState(false);
  const [guardando, setGuardando] = useState(false);

  async function guardarFoto(uri: string, extension: string) {
    if (!usuario || sesionBloqueada || !visitaId || guardando) return;
    setGuardando(true);
    try {
      const origen = new File(uri);
      if (!origen.exists)
        throw new Error("La fotografía seleccionada ya no está disponible.");
      const destino = new File(
        Paths.document,
        `visita-${visitaId}-${Date.now()}.${extension}`,
      );
      await origen.copy(destino);
      await agregarFotoLocal(usuario.id, visitaId, destino.uri);
      router.replace("/visitas");
    } catch (error) {
      Alert.alert(
        "Fotografía",
        error instanceof Error
          ? error.message
          : "No se pudo guardar la fotografía.",
      );
    } finally {
      setGuardando(false);
    }
  }

  async function tomarFoto() {
    if (!camara.current || !camaraLista || guardando) return;
    try {
      const captura = await camara.current.takePictureAsync({ quality: 0.8 });
      if (!captura?.uri)
        throw new Error("La cámara no devolvió una fotografía.");
      await guardarFoto(captura.uri, "jpg");
    } catch (error) {
      Alert.alert(
        "Fotografía",
        error instanceof Error
          ? error.message
          : "No se pudo tomar la fotografía.",
      );
    }
  }

  async function elegirDeGaleria() {
    if (!usuario || sesionBloqueada || !visitaId || guardando) return;

    setMostrarCamara(false);
    setCamaraLista(false);
    try {
      const seleccion = await ejecutarActividadNativa(() =>
        ImagePicker.launchImageLibraryAsync({
          mediaTypes: ["images"],
          allowsEditing: true,
          quality: 0.8,
        }),
      );
      if (seleccion.canceled) return;
      const foto = seleccion.assets?.[0];
      if (!foto?.uri) throw new Error("No se pudo leer la fotografía elegida.");

      const extension =
        foto.mimeType === "image/png"
          ? "png"
          : foto.mimeType === "image/webp"
            ? "webp"
            : foto.mimeType === "image/heic" || foto.mimeType === "image/heif"
              ? "heic"
              : "jpg";
      await guardarFoto(foto.uri, extension);
    } catch (error) {
      Alert.alert(
        "Galería",
        error instanceof Error ? error.message : "No se pudo abrir la galería.",
      );
    }
  }

  if (!usuario || sesionBloqueada) {
    return (
      <View style={estilos.contenedor}>
        <Text style={estilos.descripcion}>
          Desbloqueá tu sesión para agregar fotografías a tus visitas.
        </Text>
      </View>
    );
  }
  if (!visitaId) {
    return (
      <View style={estilos.contenedor}>
        <Text style={estilos.descripcion}>No se encontró la visita.</Text>
      </View>
    );
  }

  return (
    <View style={estilos.contenedor}>
      <Text style={estilos.titulo}>Fotografía de la visita</Text>
      <Text style={estilos.descripcion}>
        Sacá una foto nueva o elegí una de tu galería. Si ya había una foto, la
        nueva la reemplazará.
      </Text>

      <Pressable
        style={[estilos.boton, guardando && estilos.desactivado]}
        disabled={guardando}
        onPress={() => {
          setCamaraLista(false);
          setMostrarCamara(!mostrarCamara);
        }}
        accessibilityRole="button"
      >
        <Text style={estilos.botonTexto}>
          {mostrarCamara ? "Cerrar cámara" : "Usar cámara"}
        </Text>
      </Pressable>

      <Pressable
        style={[estilos.botonAlternativo, guardando && estilos.desactivado]}
        disabled={guardando}
        onPress={() => void elegirDeGaleria()}
        accessibilityRole="button"
      >
        <Text style={estilos.botonAlternativoTexto}>Elegir de la galería</Text>
      </Pressable>

      {mostrarCamara && (
        <View style={estilos.zonaCamara}>
          {!permiso ? (
            <Text style={estilos.descripcion}>
              Comprobando permiso de cámara...
            </Text>
          ) : !permiso.granted ? (
            <>
              <Text style={estilos.descripcion}>
                Necesitamos permiso de cámara solo si querés sacar una foto.
              </Text>
              <Pressable
                style={estilos.boton}
                onPress={() =>
                  permiso.canAskAgain
                    ? void ejecutarActividadNativa(() => solicitarPermiso())
                    : void Linking.openSettings()
                }
                accessibilityRole="button"
              >
                <Text style={estilos.botonTexto}>
                  {permiso.canAskAgain
                    ? "Permitir cámara"
                    : "Abrir configuración"}
                </Text>
              </Pressable>
            </>
          ) : (
            <>
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
                accessibilityRole="button"
              >
                <Text style={estilos.botonTexto}>
                  {guardando ? "Guardando..." : "Tomar fotografía"}
                </Text>
              </Pressable>
            </>
          )}
        </View>
      )}
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
    gap: 12,
  },
  titulo: { fontSize: 27, lineHeight: 34, color: "#244344", fontWeight: "800" },
  descripcion: {
    color: "#536F6B",
    fontSize: 16,
    lineHeight: 23,
    marginBottom: 4,
  },
  zonaCamara: { flex: 1, gap: 12, minHeight: 240 },
  camara: {
    flex: 1,
    borderRadius: 17,
    overflow: "hidden",
    minHeight: 180,
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
  botonAlternativo: {
    minHeight: 54,
    paddingHorizontal: 15,
    backgroundColor: "#E7F1EB",
    borderWidth: 1,
    borderColor: "#185F65",
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  botonAlternativoTexto: { fontSize: 17, fontWeight: "800", color: "#185F65" },
  desactivado: { opacity: 0.48 },
});
