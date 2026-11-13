import { registrarUsuario } from "@/servicios/autenticacion";
import { router } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";

export default function Registrarse() {
  const [nombre, setNombre] = useState("");
  const [correo, setCorreo] = useState("");
  const [contrasena, setContrasena] = useState("");
  const [confirmarContrasena, setConfirmarContrasena] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [cargando, setCargando] = useState(false);

  async function validarRegistro() {
    if (cargando) {
      return;
    }

    if (
      !nombre.trim() ||
      !correo.trim() ||
      !contrasena ||
      !confirmarContrasena
    ) {
      setMensaje("Completá todos los campos.");
      return;
    }

    const formatoCorreo = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!formatoCorreo.test(correo.trim())) {
      setMensaje("Ingresá un correo electrónico válido.");
      return;
    }

    if (contrasena.length < 8) {
      setMensaje("La contraseña debe tener al menos 8 caracteres.");
      return;
    }

    if (contrasena !== confirmarContrasena) {
      setMensaje("Las contraseñas no coinciden.");
      return;
    }

    setMensaje("");
    setCargando(true);

    try {
      const sesion = await registrarUsuario({
        nombre: nombre.trim(),
        correo: correo.trim(),
        contrasenia: contrasena,
      });

      setMensaje(
        `Registro confirmado por la API. ¡Bienvenido, ${sesion.usuario.nombre}! Ya podés ingresar.`,
      );
    } catch (error) {
      if (error instanceof Error) {
        setMensaje(error.message);
      } else {
        setMensaje("Ocurrió un error al registrarse.");
      }
    } finally {
      setCargando(false);
    }
  }

  return (
    <KeyboardAwareScrollView
      style={estilos.pantalla}
      contentContainerStyle={estilos.contenido}
      keyboardShouldPersistTaps="handled"
      bottomOffset={60}
    >
      <Text style={estilos.marca}>MI CIUDAD · COLÓN</Text>
      <Text style={estilos.titulo}>Crear cuenta</Text>

      <Text style={estilos.subtitulo}>
        Registrate para guardar tus favoritos y recorridos.
      </Text>

      <Text style={estilos.etiqueta}>Nombre completo</Text>
      <TextInput
        style={estilos.input}
        placeholder="Tu nombre"
        value={nombre}
        onChangeText={setNombre}
      />

      <Text style={estilos.etiqueta}>Correo electrónico</Text>
      <TextInput
        style={estilos.input}
        placeholder="usuario@ejemplo.com"
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        value={correo}
        onChangeText={setCorreo}
      />

      <Text style={estilos.etiqueta}>Contraseña</Text>
      <TextInput
        style={estilos.input}
        placeholder="Mínimo 8 caracteres"
        secureTextEntry
        value={contrasena}
        onChangeText={setContrasena}
      />

      <Text style={estilos.etiqueta}>Confirmar contraseña</Text>
      <TextInput
        style={estilos.input}
        placeholder="Repetí tu contraseña"
        secureTextEntry
        value={confirmarContrasena}
        onChangeText={setConfirmarContrasena}
      />

      {mensaje !== "" && <Text style={estilos.mensaje}>{mensaje}</Text>}

      <Pressable
        style={[estilos.boton, cargando && { opacity: 0.6 }]}
        onPress={validarRegistro}
        disabled={cargando}
      >
        <Text style={estilos.textoBoton}>
          {cargando ? "Registrando..." : "Registrarme"}
        </Text>
      </Pressable>

      <Pressable style={estilos.volver} onPress={() => router.back()}>
        <Text style={estilos.textoVolver}>¿Ya tenés cuenta? Ingresar</Text>
      </Pressable>
    </KeyboardAwareScrollView>
  );
}

const estilos = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: "#F6F8F5" },
  contenido: {
    flexGrow: 1,
    paddingHorizontal: 22,
    paddingTop: 28,
    paddingBottom: 46,
  },
  marca: {
    color: "#185F65",
    fontSize: 14,
    fontWeight: "800",
    letterSpacing: 1,
    marginBottom: 9,
  },
  titulo: {
    fontSize: 29,
    fontWeight: "800",
    color: "#243F3F",
    marginBottom: 7,
  },
  subtitulo: {
    fontSize: 16,
    lineHeight: 23,
    color: "#59716F",
    marginBottom: 24,
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
    fontSize: 15,
    lineHeight: 22,
    color: "#855126",
    backgroundColor: "#FFF1E0",
    borderRadius: 12,
    padding: 13,
    marginBottom: 16,
  },
  boton: {
    backgroundColor: "#185F65",
    minHeight: 54,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
    marginTop: 3,
  },
  textoBoton: { color: "#FFFFFF", fontWeight: "800", fontSize: 17 },
  volver: {
    marginTop: 18,
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  textoVolver: { color: "#185F65", fontWeight: "700", fontSize: 16 },
});
