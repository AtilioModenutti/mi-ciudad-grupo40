import { Stack } from "expo-router";

export default function RootLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ headerShown: false }} />

      <Stack.Screen
        name="lugar/[id]"
        options={{ title: "Detalle del lugar" }}
      />

      <Stack.Screen name="escanear" options={{ title: "Escanear QR" }} />
    </Stack>
  );
}
