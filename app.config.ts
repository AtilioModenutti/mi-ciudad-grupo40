import type { ConfigContext, ExpoConfig } from "expo/config";

export default ({ config }: ConfigContext): ExpoConfig => {
  const googleMapsApiKey = process.env.GOOGLE_MAPS_API_KEY;

  const plugins: NonNullable<ExpoConfig["plugins"]> = [
    ...(config.plugins ?? []),
  ];

  plugins.push([
    "expo-audio",
    {
      enableBackgroundPlayback: true,
      enableBackgroundRecording: false,
      recordAudioAndroid: false,
    },
  ]);

  plugins.push([
    "expo-notifications",
    {
      color: "#185F65",
    },
  ]);

  if (googleMapsApiKey) {
    plugins.push([
      "react-native-maps",
      {
        androidGoogleMapsApiKey: googleMapsApiKey,
      },
    ]);
  }

  return {
    ...config,
    name: config.name ?? "Mi Colón",
    slug: config.slug ?? "mi-ciudad",
    android: {
      ...(config.android ?? {}),
      googleServicesFile: "./google-services.json",
    },
    plugins,
  };
};
