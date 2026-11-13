import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { useFavoritos } from "@/contextos/FavoritosContexto";
import { obtenerCategorias } from "@/servicios/categorias";
import { Categoria } from "@/tipos/categoria";
import { obtenerLugarPorId } from "../../servicios/lugares";
import type { Lugar } from "../../tipos/lugar";

export default function DetalleLugar() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const {
    favoritos,
    favoritosListos,
    favoritosEnProceso,
    errorFavoritos,
    cambiarFavorito,
    reintentarFavoritos,
    favoritosSoloLectura,
  } = useFavoritos();

  const [lugar, setLugar] = useState<Lugar | null>(null);
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(true);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [indiceImagen, setIndiceImagen] = useState(0);

  useEffect(() => {
    let activo = true;
    setCargando(true);
    setError("");

    obtenerLugarPorId(id)
      .then((resultado) => {
        if (activo) {
          setLugar(resultado);
          setIndiceImagen(0);
        }
      })
      .catch(() => {
        if (activo) {
          setError("No se pudo cargar el lugar. Revisá tu conexión.");
        }
      })
      .finally(() => {
        if (activo) setCargando(false);
      });

    return () => {
      activo = false;
    };
  }, [id]);

  useEffect(() => {
    obtenerCategorias()
      .then((respuesta) => setCategorias(respuesta.datos))
      .catch(() => setCategorias([]));
  }, []);

  if (cargando) {
    return <ActivityIndicator />;
  }

  if (error) {
    return <Text>{error}</Text>;
  }

  if (!lugar) {
    return <Text>Lugar no encontrado.</Text>;
  }

  const esFavorito = favoritos.includes(lugar.id);

  const categoria = categorias.find(
    (categoria) => categoria.id === lugar.categoriaId,
  );

  const diasSemana = [
    "Domingo",
    "Lunes",
    "Martes",
    "Miercoles",
    "Jueves",
    "Viernes",
    "Sabado",
  ];

  return (
    <ScrollView
      style={estilos.contenedor}
      contentContainerStyle={estilos.contenido}
    >
      {lugar.imagenes.length > 0 ? (
        <View style={estilos.galeria}>
          <Image
            source={{ uri: lugar.imagenes[indiceImagen] }}
            style={estilos.imagen}
            contentFit="cover"
            cachePolicy="memory-disk"
          />

          {lugar.imagenes.length > 1 && (
            <View style={estilos.controlesGaleria}>
              <Pressable
                disabled={indiceImagen === 0}
                onPress={() => setIndiceImagen(indiceImagen - 1)}
                style={[
                  estilos.botonGaleria,
                  indiceImagen === 0 && estilos.botonDeshabilitado,
                ]}
              >
                <Text style={estilos.textoGaleria}>Anterior</Text>
              </Pressable>

              <Text style={estilos.numeroGaleria}>
                {indiceImagen + 1} / {lugar.imagenes.length}
              </Text>

              <Pressable
                disabled={indiceImagen === lugar.imagenes.length - 1}
                onPress={() => setIndiceImagen(indiceImagen + 1)}
                style={[
                  estilos.botonGaleria,
                  indiceImagen === lugar.imagenes.length - 1 &&
                    estilos.botonDeshabilitado,
                ]}
              >
                <Text style={estilos.textoGaleria}>Siguiente</Text>
              </Pressable>
            </View>
          )}
        </View>
      ) : (
        <View style={estilos.sinImagen}>
          <Text style={estilos.descripcion}>No hay fotografías disponibles.</Text>
        </View>
      )}

      <View style={estilos.encabezado}>
        <Text style={estilos.titulo}>{lugar.nombre}</Text>

        <Pressable
          style={estilos.botonCorazon}
          onPress={() => void cambiarFavorito(lugar.id)}
          disabled={
            !favoritosListos ||
            favoritosEnProceso ||
            favoritosSoloLectura ||
            errorFavoritos !== ""
          }
          accessibilityRole="button"
          accessibilityLabel={
            esFavorito ? "Quitar de favoritos" : "Agregar a favoritos"
          }
        >
          <Text style={[estilos.corazon, esFavorito && estilos.corazonActivo]}>
            {esFavorito ? "♥" : "♡"}
          </Text>
        </Pressable>
      </View>

      {errorFavoritos !== "" && (
        <View style={estilos.avisoFavoritos}>
          <Text style={estilos.avisoTexto}>{errorFavoritos}</Text>

          <Pressable onPress={reintentarFavoritos} accessibilityRole="button">
            <Text style={estilos.enlace}>Reintentar favoritos</Text>
          </Pressable>
        </View>
      )}

      {favoritosSoloLectura && favoritosListos && (
        <View style={estilos.avisoFavoritos}>
          <Text style={estilos.avisoTexto}>
            Estos favoritos están guardados localmente y no pueden modificarse
            sin conexión.
          </Text>
        </View>
      )}

      <Text
        style={[estilos.categoria, { color: categoria?.color ?? "#666666" }]}
      >
        {categoria?.nombre ?? "Categoria no disponible"}
      </Text>

      <Text style={estilos.descripcion}>{lugar.descripcion}</Text>
      <Text style={estilos.direccion}>{lugar.direccion}</Text>

      <Pressable
        style={estilos.botonMapa}
        accessibilityRole="button"
        accessibilityLabel={`Ver ${lugar.nombre} en el mapa`}
        onPress={() => router.push({ pathname: "/mapa", params: { lugarId: lugar.id } })}
      >
        <Text style={estilos.textoBotonMapa}>📍 Ver este lugar en el mapa</Text>
      </Pressable>

      <Text style={estilos.seccion}>Información de visita</Text>

      <Text style={estilos.dato}>
        {lugar.precioEntrada === null
          ? "Precio no informado"
          : lugar.precioEntrada === 0
            ? "Gratuita"
            : `$${lugar.precioEntrada}`}
      </Text>

      <Text style={estilos.dato}>
        Accesibilidad: {lugar.accesible ? "Si" : "No"}
      </Text>

      {lugar.telefono && (
        <Text style={estilos.dato}>Teléfono: {lugar.telefono}</Text>
      )}

      {lugar.sitioWeb && (
        <Text style={estilos.dato}>Sitio web: {lugar.sitioWeb}</Text>
      )}

      {lugar.audioguia && (
        <Pressable
          onPress={() => router.push({ pathname: "/audioguias", params: { lugarId: lugar.id } })}
          style={estilos.botonGaleria}
          accessibilityRole="button"
        >
          <Text style={estilos.textoGaleria}>
            Escuchar audioguía de este lugar
          </Text>
        </Pressable>
      )}

      <Text style={estilos.seccion}>Horarios</Text>

      {lugar.horarios.length === 0 ? (
        <Text style={estilos.dato}>Horarios no informados.</Text>
      ) : (
        lugar.horarios.map((horario, index) => (
          <Text key={`${horario.dia}-${index}`} style={estilos.dato}>
            {diasSemana[horario.dia]}: {horario.abre} a {horario.cierra}
          </Text>
        ))
      )}
    </ScrollView>
  );
}

const estilos = StyleSheet.create({
  contenedor: { flex: 1, backgroundColor: "#F6F8F5" },
  contenido: { paddingHorizontal: 18, paddingTop: 18, paddingBottom: 38 },
  titulo: { flex: 1, fontSize: 27, lineHeight: 34, fontWeight: "800", color: "#244344" },
  descripcion: { fontSize: 16, lineHeight: 24, color: "#4B6562", marginBottom: 15 },
  direccion: { fontSize: 16, lineHeight: 23, color: "#526F6B" },
  botonMapa: { marginTop: 16, minHeight: 54, paddingHorizontal: 16, backgroundColor: "#185F65", borderRadius: 12, justifyContent: "center", alignItems: "center" },
  textoBotonMapa: { color: "#FFFFFF", fontSize: 16, fontWeight: "800" },
  id: { fontSize: 15, color: "#A43C39" },
  categoriaId: { fontSize: 15, color: "#287149" },
  imagen: { width: "100%", height: 260, borderRadius: 16, marginBottom: 12, backgroundColor: "#DFEDE6" },
  sinImagen: { height: 210, backgroundColor: "#E7F1EB", justifyContent: "center", alignItems: "center", borderRadius: 16, marginBottom: 16 },
  seccion: { fontSize: 21, fontWeight: "800", marginTop: 23, marginBottom: 11, color: "#244344" },
  dato: { fontSize: 16, lineHeight: 24, color: "#49625E", marginBottom: 8 },
  categoria: { fontSize: 16, fontWeight: "800", marginBottom: 12 },
  galeria: { marginBottom: 14 },
  controlesGaleria: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 6 },
  botonGaleria: { minHeight: 48, paddingHorizontal: 14, justifyContent: "center", borderRadius: 12, backgroundColor: "#E7F1EC", borderWidth: 1, borderColor: "#C5DAD0" },
  textoGaleria: { fontSize: 16, fontWeight: "800", color: "#185F65", textAlign: "center" },
  numeroGaleria: { fontSize: 16, color: "#56706E", fontWeight: "700" },
  botonDeshabilitado: { opacity: 0.35 },
  encabezado: { flexDirection: "row", alignItems: "center", marginBottom: 13, gap: 12 },
  avisoFavoritos: { backgroundColor: "#FFF1E0", padding: 13, borderRadius: 12, gap: 8, marginBottom: 12 },
  avisoTexto: { fontSize: 15, lineHeight: 22, color: "#855126" },
  enlace: { color: "#185F65", fontSize: 15, fontWeight: "800", paddingVertical: 5 },
  botonCorazon: { minWidth: 48, minHeight: 48, alignItems: "center", justifyContent: "center", backgroundColor: "#FFF1F4", borderRadius: 12 },
  corazon: { fontSize: 30, color: "#7B8A82" },
  corazonActivo: { color: "#AA3757" },
});
