import { useAccelerometer, useGyroscope } from "@/hooks/sensors";
import { detectFall } from "@/lib/fall-detector";
import { Host, Column, Text } from "@expo/ui";
import { StyleSheet } from "react-native";

export default function Index() {
  const gyroscopeData = useGyroscope();
  const { x, y, z } = gyroscopeData;
  const accelerometerData = useAccelerometer();
  const { x: ax, y: ay, z: az } = accelerometerData;
  const isFalling = detectFall(gyroscopeData, accelerometerData, Date.now());
  return (
    <Host style={{ flex: 1 }}>
      <Column spacing={12} alignment="center">
        <Text>Gyroscope: x={x.toFixed(2)}, y={y.toFixed(2)}, z={z.toFixed(2)}</Text>
        <Text>Accelerometer: x={ax.toFixed(2)}, y={ay.toFixed(2)}, z={az.toFixed(2)}</Text>
        <Text>{isFalling ? "Falling" : "Not Falling"}</Text>
      </Column>
    </Host>
  );
}

