import { useSesion } from "@/contextos/SesionContexto";
import { obtenerLugares } from "@/servicios/lugares";
import { registrarVisita } from "@/servicios/visitas";
import type { Lugar } from "@/tipos/lugar";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

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
      .then((respuesta) => {
        if (activo) setLugares(respuesta.datos);
      })
      .catch((fallo) => {
        if (activo)
          setError(
            fallo instanceof Error
              ? fallo.message
              : "No se pudo cargar el catálogo.",
          );
      })
      .finally(() => {
        if (activo) setCargando(false);
      });
    return () => {
      activo = false;
    };
  }, []);

  async function registrar() {
    if (!seleccionado || !usuario || sesionBloqueada || guardando) return;
    setGuardando(true);
    try {
      await registrarVisita(
        usuario.id,
        seleccionado,
        "manual",
        nota.trim() || null,
      );
      try {
        await Haptics.notificationAsync(
          Haptics.NotificationFeedbackType.Success,
        );
      } catch {}
      router.replace("/visitas");
    } catch (fallo) {
      Alert.alert(
        "Visita",
        fallo instanceof Error
          ? fallo.message
          : "No se pudo guardar la visita.",
      );
    } finally {
      setGuardando(false);
    }
  }

  if (!usuario || sesionBloqueada) {
    return (
      <View style={estilos.contenedor}>
        <Text>Iniciá sesión para registrar visitas.</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={estilos.scroll}
      contentContainerStyle={estilos.contenedor}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={estilos.titulo}>Registrar visita manual</Text>
      <Text style={estilos.descripcion}>
        Elegí un lugar del catálogo. También funciona si lo descargaste antes.
      </Text>
      <TextInput
        style={estilos.campo}
        placeholder="Buscar lugar..."
        value={busqueda}
        onChangeText={setBusqueda}
        placeholderTextColor="#81918E"
      />
      <TextInput
        style={[estilos.campo, estilos.nota]}
        placeholder="Nota de la visita (opcional)"
        multiline
        textAlignVertical="top"
        value={nota}
        onChangeText={setNota}
        placeholderTextColor="#81918E"
      />
      {cargando && <ActivityIndicator />}
      {error !== "" && <Text style={estilos.error}>{error}</Text>}
      {lugares
        .filter((lugar) =>
          lugar.nombre.toLowerCase().includes(busqueda.toLowerCase()),
        )
        .map((lugar) => (
          <Pressable
            key={lugar.id}
            style={[
              estilos.opcion,
              seleccionado === lugar.id && estilos.opcionActiva,
            ]}
            onPress={() => setSeleccionado(lugar.id)}
            accessibilityRole="button"
            accessibilityState={{ selected: seleccionado === lugar.id }}
          >
            <Text style={estilos.nombreOpcion}>{lugar.nombre}</Text>
          </Pressable>
        ))}
      <Pressable
        style={[
          estilos.boton,
          (!seleccionado || guardando) && estilos.desactivado,
        ]}
        disabled={!seleccionado || guardando}
        onPress={() => void registrar()}
      >
        <Text style={estilos.botonTexto}>
          {guardando ? "Guardando..." : "Registrar visita"}
        </Text>
      </Pressable>
    </ScrollView>
  );
}

const estilos = StyleSheet.create({
  scroll: { backgroundColor: "#F6F8F5", flex: 1 },
  contenedor: {
    flexGrow: 1,
    paddingHorizontal: 18,
    paddingTop: 20,
    gap: 13,
    paddingBottom: 48,
  },
  titulo: {
    fontSize: 27,
    fontWeight: "800",
    color: "#244344",
    marginBottom: 2,
  },
  descripcion: {
    color: "#56706E",
    fontSize: 16,
    lineHeight: 23,
    marginBottom: 4,
  },
  campo: {
    borderWidth: 1,
    borderColor: "#CADBD1",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    minHeight: 54,
    fontSize: 16,
    color: "#244344",
  },
  nota: { minHeight: 104 },
  opcion: {
    borderWidth: 1,
    borderColor: "#D7E4DC",
    backgroundColor: "#FFFFFF",
    minHeight: 54,
    justifyContent: "center",
    paddingHorizontal: 15,
    paddingVertical: 11,
    borderRadius: 12,
  },
  opcionActiva: {
    borderWidth: 2,
    borderColor: "#185F65",
    backgroundColor: "#E6F1ED",
  },
  nombreOpcion: { color: "#294D4C", fontSize: 16, fontWeight: "600" },
  boton: {
    backgroundColor: "#185F65",
    minHeight: 54,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 16,
    marginTop: 6,
  },
  botonTexto: { color: "#FFFFFF", fontSize: 17, fontWeight: "800" },
  desactivado: { opacity: 0.45 },
  error: { color: "#9A3939", fontSize: 16, lineHeight: 22 },
});
