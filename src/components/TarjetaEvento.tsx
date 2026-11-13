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
  const ubicacion = nombreLugar
    || evento.direccionLibre?.trim()
    || (evento.lugarId ? "Lugar asociado no disponible" : "Ubicación no informada");
  const precioTexto = evento.precio === null
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
    borderRadius: 16,
    marginHorizontal: 16,
    marginVertical: 8,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
  },
  tarjetaPresionada: {
    opacity: 0.85,
    transform: [{ scale: 0.99 }],
  },
  imagen: {
    width: "100%",
    height: 150,
  },
  imagenPlaceholder: {
    backgroundColor: "#E2E8F0",
    justifyContent: "center",
    alignItems: "center",
  },
  textoPlaceholder: {
    color: "#64748B",
    fontSize: 13,
  },
  cuerpo: {
    padding: 14,
    gap: 6,
  },
  filaCabecera: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  fecha: {
    fontSize: 12,
    fontWeight: "700",
    color: "#2563EB",
    letterSpacing: 0.5,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  badgeTexto: {
    fontSize: 11,
    fontWeight: "700",
  },
  titulo: {
    fontSize: 17,
    fontWeight: "700",
    color: "#0F172A",
    lineHeight: 22,
  },
  descripcion: {
    fontSize: 13,
    color: "#475569",
    lineHeight: 18,
  },
  filaPie: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 6,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  ubicacion: {
    fontSize: 12,
    color: "#64748B",
    flex: 1,
    marginRight: 8,
  },
  precio: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0F172A",
  },
  precioGratis: {
    color: "#137333",
  },
});
