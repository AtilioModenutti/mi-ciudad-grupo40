import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { obtenerLugarPorId } from "../servicios/lugares";
import { obtenerVisitas } from "../servicios/visitas";
import type { Visita } from "../tipos/visita";

export default function Visitas() {
  const [visitas, setVisitas] = useState<Visita[]>([]);
  const [nombresLugares, setNombresLugares] = useState<Record<string, string>>(
    {},
  );

  useFocusEffect(
    useCallback(() => {
      async function cargarVisitas() {
        try {
          const guardadas = await obtenerVisitas();
          setVisitas(guardadas);

          const nombres: Record<string, string> = {};

          for (const visita of guardadas) {
            const lugar = await obtenerLugarPorId(visita.lugarId);
            nombres[visita.lugarId] = lugar?.nombre ?? visita.lugarId;
          }

          setNombresLugares(nombres);
        } catch (error) {
          console.error("Error al cargar las visitas:", error);
        }
      }

      cargarVisitas();
    }, []),
  );

  return (
    <ScrollView
      style={estilos.scroll}
      contentContainerStyle={estilos.contenedor}
    >
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
              Lugar visitado: {nombresLugares[visita.lugarId] ?? visita.lugarId}
            </Text>

            <Text style={estilos.texto}>
              Fecha:{" "}
              {new Date(visita.fecha).toLocaleString("es-AR", {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
                hour12: false,
                timeZone: "America/Argentina/Cordoba",
              })}
            </Text>

            <Text style={estilos.texto}>
              Método de registro: {visita.metodo}
            </Text>
            {visita.nota && (
              <Text style={estilos.texto}>Nota: {visita.nota}</Text>
            )}
          </View>
        ))
      )}

      <Pressable style={estilos.boton} onPress={() => router.push("/escanear")}>
        <Text style={estilos.textoBoton}>Escanear código QR</Text>
      </Pressable>
      <Pressable
        style={estilos.boton}
        onPress={() => router.push("/visita-manual")}
      >
        <Text style={estilos.textoBoton}>Registrar visita manualmente</Text>
      </Pressable>
    </ScrollView>
  );
}

const estilos = StyleSheet.create({
  scroll: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  contenedor: {
    padding: 24,
    paddingBottom: 50,
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
