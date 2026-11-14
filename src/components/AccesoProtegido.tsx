import { useSesion } from "@/contextos/SesionContexto";
import { router } from "expo-router";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

export function AccesoProtegido({
  titulo,
  descripcion,
}: {
  titulo: string;
  descripcion: string;
}) {
  const {
    cargandoSesion,
    sesionBloqueada,
    verificandoBiometria,
    desbloquearSesion,
    errorSesion,
  } = useSesion();

  if (cargandoSesion) {
    return (
      <View style={estilos.contenedor}>
        <ActivityIndicator color="#185F65" size="large" />
        <Text style={estilos.descripcion}>Recuperando sesión...</Text>
      </View>
    );
  }

  return (
    <View style={estilos.contenedor}>
      <Text style={estilos.marca}>COLÓN · ENTRE RÍOS</Text>
      <Text style={estilos.titulo}>{titulo}</Text>
      <Text style={estilos.descripcion}>
        {sesionBloqueada
          ? descripcion
          : "Ingresá a tu cuenta para consultar tu información personal."}
      </Text>

      {sesionBloqueada && (
        <Pressable
          style={[estilos.boton, verificandoBiometria && estilos.desactivado]}
          onPress={() => void desbloquearSesion()}
          disabled={verificandoBiometria}
          accessibilityRole="button"
        >
          <Text style={estilos.textoBoton}>
            {verificandoBiometria
              ? "Verificando identidad..."
              : "Desbloquear con biometría"}
          </Text>
        </Pressable>
      )}

      {errorSesion !== "" && <Text style={estilos.error}>{errorSesion}</Text>}

      <Pressable
        style={sesionBloqueada ? estilos.botonSecundario : estilos.boton}
        onPress={() => router.push("/ingresar")}
        accessibilityRole="button"
      >
        <Text
          style={sesionBloqueada ? estilos.textoSecundario : estilos.textoBoton}
        >
          {sesionBloqueada ? "Ingresar con contraseña" : "Ingresar"}
        </Text>
      </Pressable>
    </View>
  );
}

const estilos = StyleSheet.create({
  contenedor: {
    flex: 1,
    marginHorizontal: 18,
    marginTop: 22,
    marginBottom: 28,
    paddingHorizontal: 20,
    paddingVertical: 30,
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#DFE9E3",
    justifyContent: "center",
    gap: 15,
  },
  marca: {
    color: "#185F65",
    fontSize: 14,
    fontWeight: "800",
    letterSpacing: 0.7,
  },
  titulo: { color: "#244344", fontSize: 25, lineHeight: 32, fontWeight: "800" },
  descripcion: { color: "#536E6C", fontSize: 16, lineHeight: 24 },
  boton: {
    minHeight: 54,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: "#185F65",
    alignItems: "center",
    justifyContent: "center",
  },
  textoBoton: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "800",
    textAlign: "center",
  },
  desactivado: { opacity: 0.55 },
  botonSecundario: {
    minHeight: 50,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#C1D8CB",
    alignItems: "center",
    justifyContent: "center",
  },
  textoSecundario: { color: "#185F65", fontSize: 16, fontWeight: "800" },
  error: { fontSize: 15, lineHeight: 22, color: "#97502C" },
});
