import { StyleSheet, Text, View } from "react-native";
import { useGyroscope } from "../hooks/sensors";

export default function Index() {
  const gyroscopeData = useGyroscope();
  const { x, y, z } = gyroscopeData;
  return (
    <View style={styles.container}>
      <Text style={styles.xyz}>X: {x.toFixed(2)} rad/s</Text>
      <Text style={styles.xyz}>Y: {y.toFixed(2)} rad/s</Text>
      <Text style={styles.xyz}>Z: {z.toFixed(2)} rad/s</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  xyz: {
    fontSize: 20,
  }
});
