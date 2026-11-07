import * as LocalAuthentication from "expo-local-authentication";

export async function comprobarBiometria(): Promise<
  "sin-sensor" | "sin-registro" | "disponible"
> {
  const tieneSensor = await LocalAuthentication.hasHardwareAsync();

  if (!tieneSensor) {
    return "sin-sensor";
  }

  const estaConfigurada = await LocalAuthentication.isEnrolledAsync();

  if (!estaConfigurada) {
    return "sin-registro";
  }

  return "disponible";
}

export async function verificarBiometria(): Promise<boolean> {
  const resultado = await LocalAuthentication.authenticateAsync({
    promptMessage: "Verificá tu identidad",
    cancelLabel: "Cancelar",
    disableDeviceFallback: true,
  });

  return resultado.success;
}
