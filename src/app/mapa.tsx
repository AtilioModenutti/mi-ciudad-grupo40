import { StyleSheet } from "react-native";
import MapView from "react-native-maps";

export default function MapaScreen() {
  return (
    <MapView
      style={styles.mapa}
      initialRegion={{
        latitude: -32.1904,
        longitude: -58.1932,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      }}
    />
  );
}

const styles = StyleSheet.create({
  mapa: {
    flex: 1,
  },
});
