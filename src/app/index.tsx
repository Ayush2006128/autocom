import { useAccelerometer, useGyroscope } from "@/hooks/sensors";
import { detectFall } from "@/lib/fall-detector";
import { StyleSheet, Text, View } from "react-native";

export default function Index() {
  const gyroscopeData = useGyroscope();
  const { x, y, z } = gyroscopeData;
  const accelerometerData = useAccelerometer();
  const { x: ax, y: ay, z: az } = accelerometerData;
  const isFalling = detectFall(gyroscopeData, accelerometerData, Date.now());
  return (
    <View style={styles.container}>
      <Text style={styles.xyz}>Gyroscope: x={x.toFixed(2)}, y={y.toFixed(2)}, z={z.toFixed(2)}</Text>
      <Text style={styles.xyz}>Accelerometer: x={ax.toFixed(2)}, y={ay.toFixed(2)}, z={az.toFixed(2)}</Text>
      <Text style={styles.xyz}>{isFalling ? "Falling" : "Not Falling"}</Text>
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
