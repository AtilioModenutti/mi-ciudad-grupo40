import { useSesion } from "@/contextos/SesionContexto";
import { iniciarSesion } from "@/servicios/autenticacion";
import { router } from "expo-router";
import { useState } from "react";
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";

export default function Ingresar() {
  const [correo, setCorreo] = useState("");
  const [contrasenia, setContrasenia] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [cargando, setCargando] = useState(false);

  const { activarSesion } = useSesion();

  async function validarIngreso() {
    if (cargando) {
      return;
    }

    if (!correo.trim() || !contrasenia) {
      setMensaje("Completá todos los campos.");
      return;
    }

    if (!correo.includes("@")) {
      setMensaje("Ingresá un correo electrónico válido.");
      return;
    }

    setMensaje("");
    setCargando(true);

    try {
      const sesion = await iniciarSesion({
        correo: correo.trim(),
        contrasenia: contrasenia,
      });

      await activarSesion(sesion);

      router.replace("/");
    } catch (error) {
      if (error instanceof Error) {
        setMensaje(error.message);
      } else {
        setMensaje("Ocurrió un error al iniciar sesión.");
      }
    } finally {
      setCargando(false);
    }
  }

  return (
    <KeyboardAwareScrollView
      style={estilos.pantalla}
      contentContainerStyle={estilos.areaScroll}
      keyboardShouldPersistTaps="handled"
      bottomOffset={60}
    >
      <View style={estilos.contenido}>
        <Image
          source={require("../../assets/branding/mi-colon-simbolo.png")}
          style={estilos.logo}
          resizeMode="contain"
          accessibilityLabel="Logo de Mi Colón"
        />
        <Text style={estilos.marca}>COLÓN · ENTRE RÍOS</Text>
        <Text style={estilos.titulo}>Mi Colón</Text>
        <Text style={estilos.subtitulo}>
          Ingresá para guardar tus favoritos y recorridos.
        </Text>
        <Text style={estilos.etiqueta}>Correo electrónico</Text>

        <TextInput
          style={estilos.input}
          placeholder="correo@correo.com"
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          value={correo}
          onChangeText={setCorreo}
          placeholderTextColor="#81918E"
        />

        <Text style={estilos.etiqueta}>Contraseña</Text>

        <TextInput
          style={estilos.input}
          placeholder="Ingresá tu contraseña"
          secureTextEntry
          value={contrasenia}
          onChangeText={setContrasenia}
          placeholderTextColor="#81918E"
        />

        {mensaje !== "" && <Text style={estilos.mensaje}>{mensaje}</Text>}

        <Pressable
          style={[estilos.boton, cargando && { opacity: 0.6 }]}
          onPress={validarIngreso}
          disabled={cargando}
        >
          <Text style={estilos.textoBoton}>
            {cargando ? "Ingresando..." : "Ingresar"}
          </Text>
        </Pressable>

        <Pressable
          style={estilos.volver}
          onPress={() => router.push("/registrarse")}
        >
          <Text style={estilos.enlace}>¿No tenés cuenta? Registrate</Text>
        </Pressable>

        <Pressable style={estilos.volver} onPress={() => router.back()}>
          <Text style={estilos.textoVolver}>Continuar sin iniciar sesión</Text>
        </Pressable>
      </View>
    </KeyboardAwareScrollView>
  );
}

const estilos = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: "#F6F8F5" },
  areaScroll: { flexGrow: 1, paddingHorizontal: 18, paddingVertical: 24 },
  contenido: {
    gap: 0,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#DFE9E3",
    paddingHorizontal: 20,
    paddingVertical: 25,
  },
  logo: { width: 116, height: 116, alignSelf: "center", marginBottom: 8 },
  marca: {
    color: "#185F65",
    fontSize: 14,
    fontWeight: "800",
    letterSpacing: 1,
    marginBottom: 8,
    textAlign: "center",
  },
  titulo: {
    fontSize: 30,
    fontWeight: "800",
    color: "#234344",
    textAlign: "center",
    marginBottom: 6,
  },
  subtitulo: {
    fontSize: 16,
    lineHeight: 23,
    color: "#536E6D",
    textAlign: "center",
    marginBottom: 28,
  },
  etiqueta: {
    fontSize: 16,
    color: "#294B4B",
    fontWeight: "700",
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: "#C9DBD2",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    minHeight: 54,
    paddingHorizontal: 14,
    marginBottom: 17,
    fontSize: 16,
    color: "#243F3F",
  },
  mensaje: {
    color: "#98572D",
    backgroundColor: "#FFF1E0",
    padding: 12,
    borderRadius: 10,
    marginBottom: 14,
    fontSize: 15,
    lineHeight: 21,
  },
  boton: {
    backgroundColor: "#185F65",
    minHeight: 52,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  textoBoton: { color: "#FFFFFF", fontWeight: "800", fontSize: 17 },
  volver: {
    marginTop: 14,
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  enlace: {
    color: "#185F65",
    fontSize: 16,
    fontWeight: "700",
    textAlign: "center",
  },
  textoVolver: { color: "#536E6D", fontSize: 16, fontWeight: "600" },
});
