import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { obtenerVisitas } from "../servicios/visitas";
import type { Visita } from "../tipos/visita";

export default function Visitas() {
  const [visitas, setVisitas] = useState<Visita[]>([]);

  useFocusEffect(
    useCallback(() => {
      async function cargarVisitas() {
        try {
          const guardadas = await obtenerVisitas();
          setVisitas(guardadas);
        } catch (error) {
          console.error("Error al cargar las visitas:", error);
        }
      }

      cargarVisitas();
    }, []),
  );

  return (
    <View style={estilos.contenedor}>
      <Text style={estilos.titulo}>Mi recorrido y visitas</Text>

      <Text style={estilos.descripcion}>
        Registrá y consultá los lugares que visitaste durante tu recorrido.
      </Text>

      {visitas.length === 0 ? (
        <View style={estilos.tarjeta}>
          <Text style={estilos.subtitulo}>
            Todavía no hay visitas registradas
          </Text>

          <Text style={estilos.texto}>
            Las visitas realizadas aparecerán en esta sección.
          </Text>
        </View>
      ) : (
        visitas.map((visita) => (
          <View key={visita.id} style={estilos.tarjeta}>
            <Text style={estilos.subtitulo}>
              Lugar visitado: {visita.lugarId}
            </Text>

            <Text style={estilos.texto}>Fecha: {visita.fecha}</Text>

            <Text style={estilos.texto}>
              Método de registro: {visita.metodo}
            </Text>
          </View>
        ))
      )}

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
