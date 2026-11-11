import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { obtenerLugares } from "../servicios/lugares";
import { guardarVisitas, obtenerVisitas } from "../servicios/visitas";
import type { Lugar } from "../tipos/lugar";
import type { Visita } from "../tipos/visita";

export default function VisitaManual() {
  const [lugares, setLugares] = useState<Lugar[]>([]);
  const [lugarSeleccionado, setLugarSeleccionado] = useState<string | null>(
    null,
  );
  const [nota, setNota] = useState("");

  useEffect(() => {
    async function cargarLugares() {
      const respuesta = await obtenerLugares();
      setLugares(respuesta.datos);
    }

    cargarLugares();
  }, []);
  async function registrarVisitaManual() {
    if (!lugarSeleccionado) {
      return;
    }

    const visitasActuales = await obtenerVisitas();

    const nuevaVisita: Visita = {
      id: `${lugarSeleccionado}-${Date.now()}`,
      lugarId: lugarSeleccionado,
      fecha: new Date().toISOString(),
      metodo: "manual",
      nota: nota.trim() ? nota.trim() : null,
      fotos: [],
      sincronizada: false,
    };

    await guardarVisitas([...visitasActuales, nuevaVisita]);

    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    router.replace("/visitas");
  }
  return (
    <View style={estilos.contenedor}>
      <Text style={estilos.titulo}>Registrar visita manual</Text>

      <Text style={estilos.descripcion}>Elegí el lugar que visitaste.</Text>
      <TextInput
        style={estilos.campoNota}
        placeholder="Escribí una nota sobre la visita (opcional)"
        value={nota}
        onChangeText={setNota}
        multiline
      />

      {lugares.map((lugar) => (
        <Pressable
          key={lugar.id}
          style={[
            estilos.opcion,
            lugarSeleccionado === lugar.id && estilos.opcionSeleccionada,
          ]}
          onPress={() => setLugarSeleccionado(lugar.id)}
        >
          <Text style={estilos.textoOpcion}>{lugar.nombre}</Text>
        </Pressable>
      ))}

      <Pressable
        style={[
          estilos.boton,
          !lugarSeleccionado && estilos.botonDeshabilitado,
        ]}
        disabled={!lugarSeleccionado}
        onPress={registrarVisitaManual}
      >
        <Text style={estilos.textoBoton}>Registrar visita</Text>
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
    marginBottom: 10,
  },
  descripcion: {
    fontSize: 16,
    marginBottom: 24,
  },
  campoNota: {
    minHeight: 90,
    borderWidth: 1,
    borderColor: "#CCCCCC",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    textAlignVertical: "top",
    marginBottom: 20,
  },

  opcion: {
    padding: 16,
    borderWidth: 1,
    borderColor: "#CCCCCC",
    borderRadius: 8,
    marginBottom: 12,
  },
  opcionSeleccionada: {
    borderColor: "#2563EB",
    borderWidth: 2,
  },
  textoOpcion: {
    fontSize: 16,
  },
  boton: {
    padding: 16,
    backgroundColor: "#2563EB",
    borderRadius: 8,
    alignItems: "center",
    marginTop: 12,
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
