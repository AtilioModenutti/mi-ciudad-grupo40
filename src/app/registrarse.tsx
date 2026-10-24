import { registrarUsuario } from "@/servicios/autenticacion";
import { router } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";

export default function Registrarse() {
  const [nombre, setNombre] = useState("");
  const [correo, setCorreo] = useState("");
  const [contrasenia, setContrasenia] = useState("");
  const [confirmarContrasenia, setConfirmarContrasenia] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [cargando, setCargando] = useState(false);

  async function validarRegistro() {
    if (cargando) {
      return;
    }

    if (
      !nombre.trim() ||
      !correo.trim() ||
      !contrasenia ||
      !confirmarContrasenia
    ) {
      setMensaje("Completá todos los campos.");
      return;
    }

    const formatoCorreo = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!formatoCorreo.test(correo.trim())) {
      setMensaje("Ingresá un correo electrónico válido.");
      return;
    }

    if (contrasenia.length < 8) {
      setMensaje("La contraseña debe tener al menos 8 caracteres.");
      return;
    }

    if (contrasenia !== confirmarContrasenia) {
      setMensaje("Las contraseñas no coinciden.");
      return;
    }

    setMensaje("");
    setCargando(true);

    try {
      const usuario = await registrarUsuario({
        nombre: nombre.trim(),
        correo: correo.trim(),
        contrasenia: contrasenia,
      });

      setMensaje(
        `Registro de prueba correcto. ¡Bienvenido, ${usuario.nombre}! Ya podés ingresar.`,
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
        value={contrasenia}
        onChangeText={setContrasenia}
      />

      <Text style={estilos.etiqueta}>Confirmar contraseña</Text>
      <TextInput
        style={estilos.input}
        placeholder="Repetí tu contraseña"
        secureTextEntry
        value={confirmarContrasenia}
        onChangeText={setConfirmarContrasenia}
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
  pantalla: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  contenido: {
    flexGrow: 1,
    justifyContent: "flex-start",
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 40,
  },
  titulo: {
    fontSize: 28,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 8,
  },
  subtitulo: {
    fontSize: 15,
    color: "#64748B",
    textAlign: "center",
    marginBottom: 25,
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
    marginBottom: 16,
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
    marginTop: 20,
    alignItems: "center",
  },
  textoVolver: {
    color: "#2563EB",
  },
});
