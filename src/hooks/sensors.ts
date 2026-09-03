import { Accelerometer, AccelerometerMeasurement, Gyroscope, GyroscopeMeasurement } from 'expo-sensors';
import { useEffect, useState } from 'react';

function useGyroscope(enabled = true) {
  const [gyroscopeData, setGyroscopeData] = useState<GyroscopeMeasurement>({
    x: 0,
    y: 0,
    z: 0,
    timestamp: 0,
  });

  useEffect(() => {
    if (!enabled) return;

    Gyroscope.setUpdateInterval(100);
    const subscription = Gyroscope.addListener((data) => {
      setGyroscopeData(data);
    });

    return () => {
      subscription.remove();
    };
  }, [enabled]);

  return gyroscopeData;
}

function useAccelerometer(enabled = true) {
  const [accelerometerData, setAccelerometerData] = useState<AccelerometerMeasurement>({
    x: 0,
    y: 0,
    z: 0,
    timestamp: 0,
  });

  useEffect(() => {
    if (!enabled) return;

    Accelerometer.setUpdateInterval(100);
    const subscription = Accelerometer.addListener((data) => {
      setAccelerometerData(data);
    });

    return () => {
      subscription.remove();
    };
  }, [enabled]);

  return accelerometerData;
}

export { useAccelerometer, useGyroscope };
