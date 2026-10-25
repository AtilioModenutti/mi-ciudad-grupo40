import { iniciarSesion } from "@/servicios/autenticacion";
import { router } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";

export default function Ingresar() {
  const [correo, setCorreo] = useState("");
  const [contrasenia, setContrasenia] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [cargando, setCargando] = useState(false);

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
      const usuario = await iniciarSesion({
        correo: correo.trim(),
        contrasenia: contrasenia,
      });

      setMensaje(`Ingreso de prueba correcto. ¡Hola, ${usuario.nombre}!`);
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
      style={{ flex: 1, backgroundColor: "#FFFFFF" }}
      contentContainerStyle={estilos.contenido}
      keyboardShouldPersistTaps="handled"
      bottomOffset={60}
    >
      <View style={estilos.contenido}>
        <Text style={estilos.titulo}>Mi Ciudad</Text>
        <Text style={estilos.subtitulo}>Ingresá a tu cuenta</Text>
        <Text style={estilos.etiqueta}>Correo electronico</Text>

        <TextInput
          style={estilos.input}
          placeholder="correo@correo.com"
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          value={correo}
          onChangeText={setCorreo}
        />

        <Text style={estilos.etiqueta}>Contraseña</Text>

        <TextInput
          style={estilos.input}
          placeholder="Ingresá tu contraseña"
          secureTextEntry
          value={contrasenia}
          onChangeText={setContrasenia}
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
          <Text style={{ color: "#2563EB" }}>¿No tenés cuenta? Registrate</Text>
        </Pressable>

        <Pressable style={estilos.volver} onPress={() => router.back()}>
          <Text>Continuar sin iniciar sesión</Text>
        </Pressable>
      </View>
    </KeyboardAwareScrollView>
  );
}

const estilos = StyleSheet.create({
  contenido: {
    flexGrow: 1,
    justifyContent: "flex-start",
    padding: 24,
    paddingBottom: 40,
  },
  titulo: {
    fontSize: 26,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 6,
  },

  subtitulo: {
    fontSize: 15,
    color: "#64748B",
    textAlign: "center",
    marginBottom: 24,
  },
  etiqueta: {
    fontSize: 14,
    fontWeight: "bold",
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 8,
    padding: 14,
    marginBottom: 20,
    fontSize: 16,
    color: "#111111",
  },
  mensaje: {
    color: "#B45309",
    marginBottom: 15,
  },
  boton: {
    backgroundColor: "#2563EB",
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
  },
  textoBoton: {
    color: "#FFFFFF",
    fontWeight: "bold",
    fontSize: 16,
  },
  volver: {
    marginTop: 25,
    alignItems: "center",
  },
  pantalla: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
});
