import { router } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AnimatedIcon } from "@/components/animated-icon";

export default function HomeScreen() {
  const irAAgenda = () => {
    router.push("/agenda");
  };

  return (
    <View style={styles.pantalla}>
      <SafeAreaView style={styles.safeArea}>
        {/* Cabecera con Logo y Título */}
        <View style={styles.cabecera}>
          <AnimatedIcon />
          <Text style={styles.titulo}>Mi Ciudad Colón</Text>
          <Text style={styles.subtitulo}>Guía Turística y Cultural</Text>
        </View>

        {/* Botón Principal a la Agenda */}
        <View style={styles.contenedorBoton}>
          <Pressable
            accessible={true}
            role="button"
            accessibilityLabel="Abrir Agenda de Eventos de Colón"
            onPress={irAAgenda}
            style={({ pressed }) => [
              styles.tarjetaBoton,
              pressed && styles.tarjetaPresionada,
            ]}
          >
            <View style={styles.iconoContenedor}>
              <Text style={styles.iconoEmoji}>📅</Text>
            </View>

            <View style={styles.textosBoton}>
              <Text style={styles.textoBotonTitulo}>Agenda de Eventos</Text>
              <Text style={styles.textoBotonDesc}>
                Visitas nocturnas, peñas y actividades
              </Text>
            </View>

            <Text style={styles.flecha}>➔</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  pantalla: {
    flex: 1,
    backgroundColor: "#0F172A", // Fondo oscuro moderno para buen contraste
  },
  safeArea: {
    flex: 1,
    paddingHorizontal: 20,
    justifyContent: "space-between",
    paddingBottom: 60,
  },
  cabecera: {
    alignItems: "center",
    marginTop: 30,
    gap: 8,
  },
  titulo: {
    fontSize: 30,
    fontWeight: "800",
    color: "#38BDF8", // Celeste brillante visible al sol y en modo oscuro
    textAlign: "center",
    marginTop: 12,
  },
  subtitulo: {
    fontSize: 16,
    color: "#94A3B8",
    textAlign: "center",
  },
  contenedorBoton: {
    width: "100%",
    paddingBottom: 20,
  },
  tarjetaBoton: {
    backgroundColor: "#1E293B",
    borderWidth: 1.5,
    borderColor: "#38BDF8",
    borderRadius: 20,
    padding: 18,
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "stretch",
    elevation: 6,
    shadowColor: "#38BDF8",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  tarjetaPresionada: {
    opacity: 0.8,
    backgroundColor: "#273549",
    transform: [{ scale: 0.98 }],
  },
  iconoContenedor: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: "#0369A1",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
  },
  iconoEmoji: {
    fontSize: 24,
  },
  textosBoton: {
    flex: 1,
  },
  textoBotonTitulo: {
    fontSize: 18,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  textoBotonDesc: {
    fontSize: 13,
    color: "#94A3B8",
    marginTop: 2,
  },
  flecha: {
    fontSize: 20,
    color: "#38BDF8",
    fontWeight: "bold",
    marginLeft: 8,
  },
});
