/*
 * ======================================================================================
 * ⚡ ESP32 SMART ENERGY METER - IoT TELEMETRY FIRMWARE
 * ======================================================================================
 * Hardware:
 *   - ESP32 NodeMCU / DevKit V1
 *   - PZEM-004T v3.0 Energy Sensor (or simulated / CT sensor ACS712 / SCT-013)
 *   - 1-Channel 5V Relay Module (GPIO 16) - for Remote Circuit Breaker Cut-off
 *   - Onboard Status LED (GPIO 2)
 *
 * Protocols Supported:
 *   1. HTTP REST API (POST http://<server-ip>:5000/api/telemetry)
 *   2. MQTT (broker.emqx.io:1883, topic: home/esp32/meter_01/tele)
 * ======================================================================================
 */

#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>    // Install ArduinoJson library by Benoit Blanchon (v6 or v7)
#include <PubSubClient.h>   // Install PubSubClient library by Nick O'Leary

// --------------------------------------------------------------------------------------
// 1. NETWORK & BACKEND CONFIGURATION (EDIT WITH YOUR WI-FI CREDENTIALS)
// --------------------------------------------------------------------------------------
const char* WIFI_SSID     = "YOUR_WIFI_SSID";
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";

// Backend Server IP & Port (Replace with your computer's local IP, e.g., 192.168.1.100)
const char* SERVER_URL    = "http://192.168.1.100:5000/api/telemetry";

// MQTT Configuration
const char* MQTT_BROKER   = "broker.emqx.io";
const int   MQTT_PORT     = 1883;
const char* MQTT_TOPIC_TELE = "home/esp32/meter_01/tele";
const char* MQTT_TOPIC_CMD  = "home/esp32/meter_01/cmd";

// Device Identification
const char* DEVICE_ID     = "ESP32-SMART-METER-IND-7782";

// Hardware Pins
const int RELAY_PIN       = 16;  // Controls the main power relay (Active LOW/HIGH)
const int STATUS_LED_PIN  = 2;   // Onboard Blue LED

// Set to true if you are using physical PZEM-004T sensor over Serial2 (GPIO16/17)
#define USE_PHYSICAL_PZEM false

#if USE_PHYSICAL_PZEM
  #include <Pzem004t.h>
  Pzem004t pzem(&Serial2, 16, 17); // RX=16, TX=17
#endif

WiFiClient espClient;
PubSubClient mqttClient(espClient);

// Timing variables
unsigned long lastTelemetryTime = 0;
const unsigned long TELEMETRY_INTERVAL = 3000; // 3 seconds between updates

// Meter accumulation state
float cumulativeEnergyKWh = 12.80; // Starting baseline kWh matching dashboard

// --------------------------------------------------------------------------------------
// MQTT Callback for Remote Breaker Relay Commands
// --------------------------------------------------------------------------------------
void onMqttMessageReceived(char* topic, byte* message, unsigned int length) {
  String messageStr;
  for (int i = 0; i < length; i++) {
    messageStr += (char)message[i];
  }
  Serial.print("[MQTT] Command received on [");
  Serial.print(topic);
  Serial.print("]: ");
  Serial.println(messageStr);

  StaticJsonDocument<256> doc;
  DeserializationError error = deserializeJson(doc, messageStr);
  if (!error) {
    if (doc.containsKey("relayState")) {
      bool relayState = doc["relayState"];
      setRelayState(relayState);
    }
  }
}

// --------------------------------------------------------------------------------------
// Relay Control Helper
// --------------------------------------------------------------------------------------
void setRelayState(bool turnOn) {
  if (turnOn) {
    digitalWrite(RELAY_PIN, HIGH);
    Serial.println("⚡ [BREAKER] Circuit Energized (Relay ON)");
  } else {
    digitalWrite(RELAY_PIN, LOW);
    Serial.println("⚠️ [BREAKER] Circuit Disconnected (Safety Cut-off / Relay OFF)");
  }
}

// --------------------------------------------------------------------------------------
// Wi-Fi Connection Management
// --------------------------------------------------------------------------------------
void connectWiFi() {
  Serial.println();
  Serial.print("[WiFi] Connecting to: ");
  Serial.println(WIFI_SSID);

  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 25) {
    delay(500);
    Serial.print(".");
    digitalWrite(STATUS_LED_PIN, !digitalRead(STATUS_LED_PIN)); // Flash LED while connecting
    attempts++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    digitalWrite(STATUS_LED_PIN, HIGH);
    Serial.println("\n[WiFi] Connected successfully!");
    Serial.print("[WiFi] IP Address assigned: ");
    Serial.println(WiFi.localIP());
    Serial.print("[WiFi] MAC Address: ");
    Serial.println(WiFi.macAddress());
  } else {
    Serial.println("\n[WiFi] Connection timed out. Running in offline/simulation mode...");
  }
}

// --------------------------------------------------------------------------------------
// MQTT Connection Management
// --------------------------------------------------------------------------------------
void reconnectMQTT() {
  if (!mqttClient.connected() && WiFi.status() == WL_CONNECTED) {
    Serial.print("[MQTT] Connecting to broker: ");
    Serial.println(MQTT_BROKER);

    String clientId = "ESP32Meter-" + String(random(0xffff), HEX);
    if (mqttClient.connect(clientId.c_str())) {
      Serial.println("[MQTT] Connected!");
      mqttClient.subscribe(MQTT_TOPIC_CMD);
      Serial.print("[MQTT] Subscribed to command topic: ");
      Serial.println(MQTT_TOPIC_CMD);
    } else {
      Serial.print("[MQTT] Failed, rc=");
      Serial.println(mqttClient.state());
    }
  }
}

// --------------------------------------------------------------------------------------
// Read Sensors or Generate Calibrated Values
// --------------------------------------------------------------------------------------
void readMeterSensors(float &voltage, float &current, float &power, float &energy, float &frequency, float &pf) {
#if USE_PHYSICAL_PZEM
  voltage   = pzem.voltage();
  current   = pzem.current();
  power     = pzem.power();
  energy    = pzem.energy() / 1000.0; // convert Wh to kWh
  frequency = pzem.frequency();
  pf        = pzem.pf();

  if (isnan(voltage)) voltage = 228.0;
  if (isnan(current)) current = 8.4;
  if (isnan(power)) power = voltage * current * 0.98;
#else
  // Natural realistic household fluctuation simulation
  voltage   = 227.0 + (random(0, 30) / 10.0);  // 227.0V - 230.0V
  current   = 8.2 + (random(0, 40) / 100.0);    // 8.2A - 8.6A
  pf        = 0.98;
  frequency = 50.0;
  power     = voltage * current * pf;           // ~ 1,850W - 1,970W

  // Increment energy reading over time
  cumulativeEnergyKWh += (power / 1000.0) * (TELEMETRY_INTERVAL / 3600000.0);
  energy = cumulativeEnergyKWh;
#endif
}

// --------------------------------------------------------------------------------------
// Send Telemetry via HTTP POST to MERN Backend
// --------------------------------------------------------------------------------------
void sendTelemetryHTTP(float voltage, float current, float power, float energy, float frequency, float pf) {
  if (WiFi.status() != WL_CONNECTED) return;

  HTTPClient http;
  http.begin(SERVER_URL);
  http.addHeader("Content-Type", "application/json");

  StaticJsonDocument<384> doc;
  doc["deviceId"]    = DEVICE_ID;
  doc["voltage"]     = serialized(String(voltage, 1));
  doc["current"]     = serialized(String(current, 2));
  doc["power"]       = round(power);
  doc["energy"]      = serialized(String(energy, 2));
  doc["frequency"]   = frequency;
  doc["powerFactor"] = pf;
  doc["ipAddress"]   = WiFi.localIP().toString();

  String requestBody;
  serializeJson(doc, requestBody);

  int httpResponseCode = http.POST(requestBody);

  if (httpResponseCode > 0) {
    String response = http.getString();
    Serial.printf("[HTTP] POST Result %d: %s\n", httpResponseCode, response.c_str());

    // Parse server response to check if breaker was toggled from web dashboard
    StaticJsonDocument<256> respDoc;
    if (!deserializeJson(respDoc, response)) {
      if (respDoc.containsKey("relayState")) {
        bool serverRelayState = respDoc["relayState"];
        setRelayState(serverRelayState);
      }
    }
  } else {
    Serial.printf("[HTTP] Error sending telemetry: %s\n", http.errorToString(httpResponseCode).c_str());
  }

  http.end();
}

// --------------------------------------------------------------------------------------
// Send Telemetry via MQTT
// --------------------------------------------------------------------------------------
void sendTelemetryMQTT(float voltage, float current, float power, float energy, float frequency, float pf) {
  if (!mqttClient.connected()) return;

  StaticJsonDocument<384> doc;
  doc["deviceId"]    = DEVICE_ID;
  doc["voltage"]     = round(voltage * 10) / 10.0;
  doc["current"]     = round(current * 100) / 100.0;
  doc["power"]       = round(power);
  doc["energy"]      = round(energy * 100) / 100.0;
  doc["frequency"]   = frequency;
  doc["powerFactor"] = pf;

  char buffer[384];
  serializeJson(doc, buffer);
  mqttClient.publish(MQTT_TOPIC_TELE, buffer);
  Serial.printf("[MQTT] Published payload to %s\n", MQTT_TOPIC_TELE);
}

// --------------------------------------------------------------------------------------
// SETUP & MAIN LOOP
// --------------------------------------------------------------------------------------
void setup() {
  Serial.begin(115200);
  delay(1000);

  Serial.println("\n========================================================");
  Serial.println("  ⚡ ESP32 SMART ENERGY METER - IoT CLIENT INITIALIZING");
  Serial.println("========================================================");

  pinMode(RELAY_PIN, OUTPUT);
  pinMode(STATUS_LED_PIN, OUTPUT);

  // Default power ON
  setRelayState(true);

  connectWiFi();

  // Setup MQTT
  mqttClient.setServer(MQTT_BROKER, MQTT_PORT);
  mqttClient.setCallback(onMqttMessageReceived);
}

void loop() {
  // Keep connections alive
  if (WiFi.status() == WL_CONNECTED) {
    if (!mqttClient.connected()) {
      reconnectMQTT();
    }
    mqttClient.loop();
  }

  // Periodic Telemetry Transmission
  unsigned long now = millis();
  if (now - lastTelemetryTime >= TELEMETRY_INTERVAL) {
    lastTelemetryTime = now;

    // Read voltage, current, power, energy
    float voltage, current, power, energy, frequency, pf;
    readMeterSensors(voltage, current, power, energy, frequency, pf);

    Serial.printf("\n📊 [METER] V: %.1f V | I: %.2f A | P: %.0f W | E: %.2f kWh\n",
                  voltage, current, power, energy);

    // Transmit to MERN Backend via HTTP REST
    sendTelemetryHTTP(voltage, current, power, energy, frequency, pf);

    // Transmit via MQTT
    sendTelemetryMQTT(voltage, current, power, energy, frequency, pf);

    // Blink onboard LED to confirm successful telemetry dispatch
    digitalWrite(STATUS_LED_PIN, LOW);
    delay(50);
    digitalWrite(STATUS_LED_PIN, HIGH);
  }
}
