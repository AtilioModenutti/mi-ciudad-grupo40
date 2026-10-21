import { router } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

export default function Visitas() {
  return (
    <View style={estilos.contenedor}>
      <Text style={estilos.titulo}>Mi recorrido y visitas</Text>

      <Text style={estilos.descripcion}>
        Registrá y consultá los lugares que visitaste durante tu recorrido.
      </Text>

      <View style={estilos.tarjeta}>
        <Text style={estilos.subtitulo}>
          Todavía no hay visitas registradas
        </Text>

        <Text style={estilos.texto}>
          Las visitas realizadas aparecerán en esta sección.
        </Text>
      </View>

      <Pressable style={estilos.boton} onPress={() => router.push("/escanear")}>
        <Text style={estilos.textoBoton}>Escanear código QR</Text>
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
    fontSize: 30,
    fontWeight: "bold",
    marginBottom: 10,
  },
  descripcion: {
    fontSize: 16,
    marginBottom: 24,
  },
  tarjeta: {
    padding: 20,
    borderWidth: 1,
    borderColor: "#CCCCCC",
    borderRadius: 12,
    marginBottom: 24,
  },
  subtitulo: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 8,
  },
  texto: {
    fontSize: 16,
  },
  boton: {
    padding: 16,
    backgroundColor: "#2563EB",
    borderRadius: 8,
    alignItems: "center",
  },
  textoBoton: {
    color: "#FFFFFF",
    fontWeight: "bold",
    fontSize: 16,
  },
});
