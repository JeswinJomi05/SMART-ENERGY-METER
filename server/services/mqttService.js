import mqtt from 'mqtt';
import { processIncomingTelemetry } from '../controllers/telemetryController.js';

let client = null;

export const initMqtt = () => {
  const brokerUrl = process.env.MQTT_BROKER_URL || 'mqtt://broker.emqx.io:1883';
  const teleTopic = process.env.MQTT_TELEMETRY_TOPIC || 'home/esp32/meter_01/tele';

  try {
    client = mqtt.connect(brokerUrl, {
      clientId: `smart_meter_backend_${Math.random().toString(16).slice(2, 8)}`,
      clean: true,
      connectTimeout: 5000,
      reconnectPeriod: 10000,
    });

    client.on('connect', () => {
      console.log(`[MQTT] Connected to broker: ${brokerUrl}`);
      client.subscribe(teleTopic, (err) => {
        if (!err) {
          console.log(`[MQTT] Subscribed to ESP32 telemetry topic: ${teleTopic}`);
        } else {
          console.error(`[MQTT] Subscription error on ${teleTopic}:`, err);
        }
      });
    });

    client.on('message', async (topic, message) => {
      if (topic === teleTopic) {
        try {
          const payload = JSON.parse(message.toString());
          await processIncomingTelemetry(payload);
        } catch (e) {
          console.error('[MQTT] Error processing telemetry message payload:', e.message);
        }
      }
    });

    client.on('error', (err) => {
      console.warn('[MQTT] Broker connection error (will retry in background):', err.message);
    });
  } catch (error) {
    console.warn('[MQTT] MQTT initialization warning:', error.message);
  }
};

export const publishMqttMessage = (topic, payload) => {
  if (client && client.connected) {
    const msg = typeof payload === 'string' ? payload : JSON.stringify(payload);
    client.publish(topic, msg, { qos: 1 }, (err) => {
      if (err) {
        console.error(`[MQTT] Failed to publish message to ${topic}:`, err);
      } else {
        console.log(`[MQTT] Published command to ${topic}:`, msg);
      }
    });
  } else {
    console.log(`[MQTT] Client not connected yet. Command queued:`, payload);
  }
};
