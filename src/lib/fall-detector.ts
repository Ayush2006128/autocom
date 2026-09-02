import { AccelerometerMeasurement, GyroscopeMeasurement } from "expo-sensors";

// External buffer to store historical magnitude readings
const gHistory: { time: number, magnitude: number }[] = [];

function detectFall(
  accelerometerData: AccelerometerMeasurement,
  gyroscopeData: GyroscopeMeasurement,
  timestampMs: number
): boolean {
  // 1. Evaluate angular velocity magnitude (> 1 rad/s)
  const gyroMagnitude = Math.sqrt(
    gyroscopeData.x ** 2 + gyroscopeData.y ** 2 + gyroscopeData.z ** 2
  );
  const isRotatingFast = gyroMagnitude > 0.5;

  // 2. Evaluate change in G-force over 1 second
  const currentG = Math.sqrt(
    accelerometerData.x ** 2 + accelerometerData.y ** 2 + accelerometerData.z ** 2
  );

  gHistory.push({ time: timestampMs, magnitude: currentG });

  const oneSecondAgo = timestampMs - 1000;

  // Prune data older than 1.5 seconds to prevent memory leaks
  while (gHistory.length > 0 && gHistory[0].time < oneSecondAgo - 500) {
    gHistory.shift();
  }

  // Find the reading closest to exactly 1 second ago
  const historicalG = gHistory.find(entry => entry.time >= oneSecondAgo);

  let gChanged = false;
  if (historicalG) {
    // Mathematically > 0, but real sensors require a noise threshold (e.g., 0.1 Gs)
    gChanged = Math.abs(currentG - historicalG.magnitude) > 0.01;
  }

  return isRotatingFast && gChanged;
}

export { detectFall };
