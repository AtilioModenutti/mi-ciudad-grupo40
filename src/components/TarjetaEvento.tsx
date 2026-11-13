import { EstadoEvento, Evento } from "@/tipos/agenda";
import { Image } from "expo-image";
import { Pressable, StyleSheet, Text, View } from "react-native";

interface Props {
  evento: Evento;
  alPresionar: (evento: Evento) => void;
  nombreLugar?: string | null;
}

function formatearEstado(estado: EstadoEvento) {
  switch (estado) {
    case "programado":
      return { texto: "Programado", fondo: "#E6F4EA", color: "#137333" };
    case "suspendido":
      return {
        texto: "Suspendido por clima",
        fondo: "#FEF7E0",
        color: "#B06000",
      };
    case "cancelado":
      return { texto: "Cancelado", fondo: "#FCE8E6", color: "#C5221F" };
    case "finalizado":
      return { texto: "Finalizado", fondo: "#F1F3F4", color: "#5F6368" };
  }
}

function formatearFecha(isoString: string): string {
  const fecha = new Date(isoString);
  const dia = fecha.toLocaleDateString("es-AR", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
  const hora = fecha.toLocaleTimeString("es-AR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  return `${dia.toUpperCase()} · ${hora} hs`;
}

export function TarjetaEvento({ evento, alPresionar, nombreLugar }: Props) {
  const estadoVisual = formatearEstado(evento.estado);
  const fechaTexto = formatearFecha(evento.inicio);
  const ubicacion =
    nombreLugar ||
    evento.direccionLibre?.trim() ||
    (evento.lugarId
      ? "Lugar asociado no disponible"
      : "Ubicación no informada");
  const precioTexto =
    evento.precio === null
      ? "Precio no informado"
      : evento.precio === 0
        ? "Entrada libre y gratuita"
        : `$ ${evento.precio.toLocaleString("es-AR")}`;

  return (
    <Pressable
      accessible={true}
      role="button"
      accessibilityLabel={`${evento.titulo}, ${estadoVisual.texto}, fecha ${fechaTexto}`}
      onPress={() => alPresionar(evento)}
      style={({ pressed }) => [
        styles.tarjeta,
        pressed && styles.tarjetaPresionada,
      ]}
    >
      {evento.imagenUrl ? (
        <Image
          source={{ uri: evento.imagenUrl }}
          style={styles.imagen}
          contentFit="cover"
          transition={250}
        />
      ) : (
        <View style={[styles.imagen, styles.imagenPlaceholder]}>
          <Text style={styles.textoPlaceholder}>Sin imagen disponible</Text>
        </View>
      )}

      <View style={styles.cuerpo}>
        <View style={styles.filaCabecera}>
          <Text style={styles.fecha}>{fechaTexto}</Text>
          <View style={[styles.badge, { backgroundColor: estadoVisual.fondo }]}>
            <Text style={[styles.badgeTexto, { color: estadoVisual.color }]}>
              {estadoVisual.texto}
            </Text>
          </View>
        </View>

        <Text style={styles.titulo} numberOfLines={2}>
          {evento.titulo}
        </Text>
        <Text style={styles.descripcion} numberOfLines={2}>
          {evento.descripcion}
        </Text>

        <View style={styles.filaPie}>
          <Text style={styles.ubicacion} numberOfLines={1}>
            📍 {ubicacion}
          </Text>
          <Text
            style={[styles.precio, evento.precio === 0 && styles.precioGratis]}
          >
            {precioTexto}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tarjeta: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    marginHorizontal: 18,
    marginVertical: 8,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#DFE9E3",
  },
  tarjetaPresionada: { opacity: 0.86 },
  imagen: { width: "100%", height: 170 },
  imagenPlaceholder: {
    backgroundColor: "#E7F0EB",
    justifyContent: "center",
    alignItems: "center",
  },
  textoPlaceholder: { color: "#56706E", fontSize: 15 },
  cuerpo: { padding: 16, gap: 9 },
  filaCabecera: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 6,
  },
  fecha: { fontSize: 15, fontWeight: "800", color: "#185F65" },
  badge: { paddingHorizontal: 11, paddingVertical: 7, borderRadius: 20 },
  badgeTexto: { fontSize: 14, fontWeight: "800" },
  titulo: { fontSize: 19, fontWeight: "800", color: "#244344", lineHeight: 25 },
  descripcion: { fontSize: 16, color: "#556E6A", lineHeight: 23 },
  filaPie: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
    paddingTop: 11,
    borderTopWidth: 1,
    borderTopColor: "#E6EEE7",
    gap: 8,
  },
  ubicacion: { fontSize: 15, color: "#56706E", flex: 1 },
  precio: { fontSize: 15, fontWeight: "800", color: "#244344" },
  precioGratis: { color: "#287249" },
});
