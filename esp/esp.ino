/*
  ============================================================
       IoT-BASED SMART ENERGY MONITORING AND BILLING SYSTEM

       ESP32 + ZMPT101B + ACS712 + BLYNK + 16x2 I2C LCD
       + HTTP/JSON API FOR REACT WEBSITE
       + HTTP POST TO MERN BACKEND SERVER
  ============================================================

  ESP32
  -------
  ZMPT101B  -> GPIO 34
  ACS712    -> GPIO 35

  I2C LCD
  -------
  SDA       -> GPIO 21
  SCL       -> GPIO 22
  VCC       -> 5V
  GND       -> GND

  HTTP API (local - unchanged)
  --------
  http://ESP32_IP/data

  HTTP POST (to MERN backend)
  ---------------------------
  POST http://SERVER_IP:5000/api/telemetry

  Example Payload Sent:
  {
    "deviceId": "ESP32-SMART-METER-IND-7782",
    "voltage": 230.4,
    "current": 0.052,
    "power": 11.98,
    "energy": 0.00125,
    "bill": 0.0081,
    "tariff": 10000,
    "frequency": 50.0,
    "powerFactor": 0.98,
    "ipAddress": "192.168.1.x"
  }

  BLYNK IS NOT REMOVED.
*/

// ============================================================
// BLYNK CONFIGURATION
// ============================================================

#define BLYNK_TEMPLATE_ID   "TMPL3QEzbJinh"
#define BLYNK_TEMPLATE_NAME "IOT SMART ENERGY METER"
#define BLYNK_AUTH_TOKEN    "u6v9bhkBZsYoNKK7Xqu-tUGPhYiOiGF4"

#include <WiFi.h>
#include <BlynkSimpleEsp32.h>
#include <WebServer.h>
#include <HTTPClient.h>
#include <Wire.h>
#include <LiquidCrystal_I2C.h>
#include <math.h>

// ============================================================
// WIFI
// ============================================================

char ssid[] = "Keralavision  1572 ( 2.4G )";
char pass[] = "Cassandra07";

// ============================================================
// MERN BACKEND SERVER
// ============================================================
//
// Set this to your computer's local Wi-Fi IP address.
// Run `ipconfig` in Windows CMD to find it.
// Example: 192.168.1.100
//
const char* BACKEND_SERVER_IP   = "192.168.1.35";
const int   BACKEND_SERVER_PORT = 5000;
const char* BACKEND_TELEMETRY_ENDPOINT = "/api/telemetry";

// ============================================================
// HTTP SERVER (local /data endpoint - unchanged)
// ============================================================

WebServer server(80);

// ============================================================
// LCD
// ============================================================

LiquidCrystal_I2C lcd(0x27, 16, 2);

#define LCD_SDA 21
#define LCD_SCL 22

// ============================================================
// SENSOR PINS
// ============================================================

#define ZMPT_PIN 34
#define ACS_PIN  35

// ============================================================
// ADC CONFIGURATION
// ============================================================

#define ADC_BITS 12

const float ADC_MAX = 4095.0;
const float ADC_VOLTAGE = 3.3;

// ============================================================
// SENSOR CALIBRATION
// ============================================================

// ZMPT101B calibration factor
float VOLTAGE_CALIBRATION = 100.0;

// ACS712-05B = 0.185 V/A
float ACS_SENSITIVITY = 0.185;

// ============================================================
// BILLING
// ============================================================

float TARIFF = 8.00;

// ============================================================
// MEASUREMENT PARAMETERS
// ============================================================

const int NUM_SAMPLES = 1000;

// 200 microseconds = approximately 5 kHz
const unsigned long SAMPLE_INTERVAL_US = 200;

// ============================================================
// MEASUREMENT VARIABLES
// ============================================================

float voltageRMS = 0.0;
float currentRMS = 0.0;

float powerW = 0.0;
float energyKWh = 0.0;

float billAmount = 0.0;

// ============================================================
// TIME VARIABLES
// ============================================================

unsigned long previousMeasurementMillis = 0;

// ============================================================
// BACKEND POST TIMING
// ============================================================

unsigned long previousBackendMillis = 0;
const unsigned long BACKEND_INTERVAL_MS = 3000; // POST every 3 seconds
bool backendPostSuccess = false;

// ============================================================
// LCD VARIABLES
// ============================================================

unsigned long previousLCDMillis = 0;

const unsigned long LCD_SCREEN_TIME = 3000;

int lcdScreen = 0;

// ============================================================
// BLYNK VIRTUAL PINS
// ============================================================

#define V0_VOLTAGE V0
#define V1_CURRENT V1
#define V2_POWER   V2
#define V3_ENERGY  V3
#define V4_BILL    V4

// ============================================================
// FUNCTION: READ ZMPT101B VOLTAGE
// ============================================================

float readVoltageRMS()
{
    double sum = 0.0;
    double sumSquares = 0.0;

    // --------------------------------------------------------
    // STEP 1: Find DC midpoint
    // --------------------------------------------------------

    for (int i = 0; i < NUM_SAMPLES; i++)
    {
        int adc = analogRead(ZMPT_PIN);

        sum += adc;

        delayMicroseconds(SAMPLE_INTERVAL_US);
    }

    float offset = sum / NUM_SAMPLES;

    // --------------------------------------------------------
    // STEP 2: Calculate RMS
    // --------------------------------------------------------

    for (int i = 0; i < NUM_SAMPLES; i++)
    {
        int adc = analogRead(ZMPT_PIN);

        float centered = adc - offset;

        sumSquares += centered * centered;

        delayMicroseconds(SAMPLE_INTERVAL_US);
    }

    float rmsADC =
        sqrt(sumSquares / NUM_SAMPLES);

    // --------------------------------------------------------
    // STEP 3: ADC to sensor voltage
    // --------------------------------------------------------

    float sensorRMSVoltage =
        (rmsADC / ADC_MAX) * ADC_VOLTAGE;

    // --------------------------------------------------------
    // STEP 4: Sensor voltage to mains voltage
    // --------------------------------------------------------

    float mainsVoltage =
        sensorRMSVoltage * VOLTAGE_CALIBRATION;

    return mainsVoltage;
}

// ============================================================
// FUNCTION: READ ACS712 CURRENT
// ============================================================

float readCurrentRMS()
{
    double sum = 0.0;
    double sumSquares = 0.0;

    // --------------------------------------------------------
    // STEP 1: Find DC midpoint
    // --------------------------------------------------------

    for (int i = 0; i < NUM_SAMPLES; i++)
    {
        int adc = analogRead(ACS_PIN);

        sum += adc;

        delayMicroseconds(SAMPLE_INTERVAL_US);
    }

    float offset = sum / NUM_SAMPLES;

    // --------------------------------------------------------
    // STEP 2: Calculate RMS
    // --------------------------------------------------------

    for (int i = 0; i < NUM_SAMPLES; i++)
    {
        int adc = analogRead(ACS_PIN);

        float centered = adc - offset;

        sumSquares += centered * centered;

        delayMicroseconds(SAMPLE_INTERVAL_US);
    }

    float rmsADC =
        sqrt(sumSquares / NUM_SAMPLES);

    // --------------------------------------------------------
    // STEP 3: ADC to sensor voltage
    // --------------------------------------------------------

    float sensorRMSVoltage =
        (rmsADC / ADC_MAX) * ADC_VOLTAGE;

    // --------------------------------------------------------
    // STEP 4: Sensor voltage to current
    // --------------------------------------------------------

    float current =
        sensorRMSVoltage / ACS_SENSITIVITY;

    // Remove very small noise
    if (current < 0.05)
    {
        current = 0.0;
    }

    return current;
}

// ============================================================
// LCD FUNCTIONS
// ============================================================

void lcdVoltageCurrent()
{
    lcd.clear();

    lcd.setCursor(0, 0);
    lcd.print("V:");
    lcd.print(voltageRMS, 1);
    lcd.print("V");

    lcd.setCursor(0, 1);
    lcd.print("I:");
    lcd.print(currentRMS, 3);
    lcd.print("A");
}

// ------------------------------------------------------------

void lcdPower()
{
    lcd.clear();

    lcd.setCursor(0, 0);
    lcd.print("Power:");

    lcd.setCursor(0, 1);
    lcd.print(powerW, 2);
    lcd.print(" W");
}

// ------------------------------------------------------------

void lcdEnergy()
{
    lcd.clear();

    lcd.setCursor(0, 0);
    lcd.print("Energy:");

    lcd.setCursor(0, 1);
    lcd.print(energyKWh, 5);
    lcd.print(" kWh");
}

// ------------------------------------------------------------

void lcdBill()
{
    lcd.clear();

    lcd.setCursor(0, 0);
    lcd.print("Bill:");

    lcd.setCursor(0, 1);
    lcd.print("Rs.");
    lcd.print(billAmount, 4);
}

// ------------------------------------------------------------
// NEW: Show backend connection status on LCD screen 4
// ------------------------------------------------------------

void lcdServerStatus()
{
    lcd.clear();

    lcd.setCursor(0, 0);
    lcd.print("Server:");

    lcd.setCursor(0, 1);
    if (backendPostSuccess)
    {
        lcd.print("Posted OK!");
    }
    else
    {
        lcd.print("Conn Failed");
    }
}

// ============================================================
// HTTP: SEND JSON DATA (local endpoint - unchanged)
// ============================================================

void handleData()
{
    // --------------------------------------------------------
    // CORS HEADER
    // Allows React website to request data from ESP32
    // --------------------------------------------------------

    server.sendHeader("Access-Control-Allow-Origin", "*");

    server.sendHeader(
        "Access-Control-Allow-Methods",
        "GET, OPTIONS"
    );

    server.sendHeader(
        "Access-Control-Allow-Headers",
        "Content-Type"
    );

    // --------------------------------------------------------
    // CREATE JSON RESPONSE
    // --------------------------------------------------------

    String json = "{";

    json += "\"voltage\":";
    json += String(voltageRMS, 2);

    json += ",\"current\":";
    json += String(currentRMS, 3);

    json += ",\"power\":";
    json += String(powerW, 2);

    json += ",\"energy\":";
    json += String(energyKWh, 6);

    json += ",\"bill\":";
    json += String(billAmount, 6);

    json += ",\"tariff\":";
    json += String(TARIFF, 2);

    json += ",\"frequency\":50.0";
    json += ",\"powerFactor\":0.98";

    json += ",\"deviceId\":\"ESP32-SMART-METER-IND-7782\"";

    json += ",\"ipAddress\":\"";
    json += WiFi.localIP().toString();
    json += "\"";

    json += "}";

    // --------------------------------------------------------
    // SEND RESPONSE
    // --------------------------------------------------------

    server.send(
        200,
        "application/json",
        json
    );
}

// ============================================================
// HTTP: STATUS ENDPOINT
// ============================================================

void handleStatus()
{
    server.sendHeader(
        "Access-Control-Allow-Origin",
        "*"
    );

    String json = "{";

    json += "\"status\":\"online\",";
    json += "\"wifi\":\"";

    if (WiFi.status() == WL_CONNECTED)
    {
        json += "connected";
    }
    else
    {
        json += "disconnected";
    }

    json += "\",\"ip\":\"";
    json += WiFi.localIP().toString();
    json += "\"";

    json += ",\"backendConnected\":";
    json += backendPostSuccess ? "true" : "false";

    json += "}";

    server.send(
        200,
        "application/json",
        json
    );
}

// ============================================================
// HTTP: ROOT PAGE
// ============================================================

void handleRoot()
{
    server.sendHeader(
        "Access-Control-Allow-Origin",
        "*"
    );

    String message = "";

    message += "IoT Smart Energy Meter\n\n";
    message += "ESP32 HTTP Server Running\n";
    message += "Use /data for sensor values\n";
    message += "Use /status for connection status\n";

    server.send(
        200,
        "text/plain",
        message
    );
}

// ============================================================
// START HTTP SERVER
// ============================================================

void startHTTPServer()
{
    // Main data endpoint
    server.on(
        "/data",
        HTTP_GET,
        handleData
    );

    // Status endpoint
    server.on(
        "/status",
        HTTP_GET,
        handleStatus
    );

    // Root endpoint
    server.on(
        "/",
        HTTP_GET,
        handleRoot
    );

    // Handle OPTIONS request from browser
    server.on(
        "/data",
        HTTP_OPTIONS,
        []()
        {
            server.sendHeader(
                "Access-Control-Allow-Origin",
                "*"
            );

            server.sendHeader(
                "Access-Control-Allow-Methods",
                "GET, OPTIONS"
            );

            server.sendHeader(
                "Access-Control-Allow-Headers",
                "Content-Type"
            );

            server.send(
                204
            );
        }
    );

    server.begin();

    Serial.println();
    Serial.println("========================================");
    Serial.println("HTTP SERVER STARTED");
    Serial.println("========================================");

    Serial.print("ESP32 IP Address: ");
    Serial.println(WiFi.localIP());

    Serial.println();
    Serial.print("Local Data URL: http://");
    Serial.print(WiFi.localIP());
    Serial.println("/data");

    Serial.print("Backend POST: http://");
    Serial.print(BACKEND_SERVER_IP);
    Serial.print(":");
    Serial.print(BACKEND_SERVER_PORT);
    Serial.println(BACKEND_TELEMETRY_ENDPOINT);

    Serial.println("========================================");
}

// ============================================================
// NEW FUNCTION: POST TELEMETRY TO MERN BACKEND
// ============================================================

void postToBackend()
{
    if (WiFi.status() != WL_CONNECTED)
    {
        Serial.println("[BACKEND] WiFi not connected. Skipping POST.");
        backendPostSuccess = false;
        return;
    }

    HTTPClient http;

    String url = "http://";
    url += BACKEND_SERVER_IP;
    url += ":";
    url += String(BACKEND_SERVER_PORT);
    url += BACKEND_TELEMETRY_ENDPOINT;

    http.begin(url);
    http.addHeader("Content-Type", "application/json");
    http.setTimeout(3000); // 3 second timeout

    // --------------------------------------------------------
    // Build JSON payload exactly matching the backend schema
    // --------------------------------------------------------

    String payload = "{";

    payload += "\"deviceId\":\"ESP32-SMART-METER-IND-7782\"";

    payload += ",\"voltage\":";
    payload += String(voltageRMS, 2);

    payload += ",\"current\":";
    payload += String(currentRMS, 3);

    payload += ",\"power\":";
    payload += String(powerW, 2);

    payload += ",\"energy\":";
    payload += String(energyKWh, 6);

    payload += ",\"bill\":";
    payload += String(billAmount, 6);

    payload += ",\"tariff\":";
    payload += String(TARIFF, 2);

    payload += ",\"frequency\":50.0";

    payload += ",\"powerFactor\":0.98";

    payload += ",\"ipAddress\":\"";
    payload += WiFi.localIP().toString();
    payload += "\"";

    payload += "}";

    // --------------------------------------------------------
    // Send the POST request
    // --------------------------------------------------------

    int httpCode = http.POST(payload);

    if (httpCode > 0)
    {
        backendPostSuccess = true;

        String response = http.getString();

        Serial.println();
        Serial.println("[BACKEND] POST successful!");
        Serial.print("[BACKEND] HTTP Code: ");
        Serial.println(httpCode);
        Serial.print("[BACKEND] Response: ");
        Serial.println(response);
    }
    else
    {
        backendPostSuccess = false;

        Serial.println();
        Serial.print("[BACKEND] POST failed. Error: ");
        Serial.println(http.errorToString(httpCode));
        Serial.print("[BACKEND] URL was: ");
        Serial.println(url);
    }

    http.end();
}

// ============================================================
// SETUP
// ============================================================

void setup()
{
    // --------------------------------------------------------
    // SERIAL
    // --------------------------------------------------------

    Serial.begin(9600);

    delay(1000);

    Serial.println();
    Serial.println("========================================");
    Serial.println(" SMART ENERGY MONITORING SYSTEM");
    Serial.println("========================================");

    // --------------------------------------------------------
    // I2C
    // --------------------------------------------------------

    Serial.println("Starting I2C...");

    Wire.begin(
        LCD_SDA,
        LCD_SCL
    );

    // --------------------------------------------------------
    // LCD
    // --------------------------------------------------------

    Serial.println("Starting LCD...");

    lcd.init();

    lcd.backlight();

    lcd.clear();

    lcd.setCursor(0, 0);
    lcd.print("SMART ENERGY");

    lcd.setCursor(0, 1);
    lcd.print("MONITORING");

    delay(2000);

    lcd.clear();

    // --------------------------------------------------------
    // ADC
    // --------------------------------------------------------

    Serial.println("Initializing ADC...");

    analogReadResolution(ADC_BITS);

    analogSetAttenuation(ADC_11db);

    pinMode(
        ZMPT_PIN,
        INPUT
    );

    pinMode(
        ACS_PIN,
        INPUT
    );

    Serial.println("ADC initialized.");

    // --------------------------------------------------------
    // WIFI MESSAGE
    // --------------------------------------------------------

    lcd.setCursor(0, 0);
    lcd.print("Connecting WiFi");

    lcd.setCursor(0, 1);
    lcd.print("Please wait...");

    // --------------------------------------------------------
    // BLYNK
    //
    // Blynk.begin() connects ESP32 to WiFi and Blynk.
    // We keep this unchanged.
    // --------------------------------------------------------

    Serial.println("Connecting to WiFi/Blynk...");

    Blynk.begin(
        BLYNK_AUTH_TOKEN,
        ssid,
        pass
    );

    Serial.println("Blynk connected!");

    // --------------------------------------------------------
    // START HTTP SERVER
    // --------------------------------------------------------

    startHTTPServer();

    // --------------------------------------------------------
    // LCD CONNECTION MESSAGE
    // --------------------------------------------------------

    lcd.clear();

    lcd.setCursor(0, 0);
    lcd.print("WiFi Connected");

    lcd.setCursor(0, 1);
    lcd.print("Blynk+HTTP+API");

    delay(2000);

    // --------------------------------------------------------
    // STARTUP COMPLETE
    // --------------------------------------------------------

    lcd.clear();

    Serial.println("ESP32 initialized.");
    Serial.println("System ready.");
    Serial.print("Backend server: http://");
    Serial.print(BACKEND_SERVER_IP);
    Serial.print(":");
    Serial.println(BACKEND_SERVER_PORT);

    previousMeasurementMillis = millis();
    previousLCDMillis = millis();
    previousBackendMillis = millis();
}

// ============================================================
// LOOP
// ============================================================

void loop()
{
    // --------------------------------------------------------
    // KEEP BLYNK CONNECTION ALIVE
    // --------------------------------------------------------

    Blynk.run();

    // --------------------------------------------------------
    // KEEP HTTP SERVER ALIVE
    // --------------------------------------------------------

    server.handleClient();

    unsigned long currentMillis = millis();

    // --------------------------------------------------------
    // MEASURE EVERY 1 SECOND
    // --------------------------------------------------------

    if (
        currentMillis -
        previousMeasurementMillis >= 1000
    )
    {
        // ----------------------------------------------------
        // CALCULATE ELAPSED TIME
        // ----------------------------------------------------

        float elapsedHours =
            (
                currentMillis -
                previousMeasurementMillis
            )
            / 3600000.0;

        previousMeasurementMillis =
            currentMillis;

        // ----------------------------------------------------
        // READ VOLTAGE
        // ----------------------------------------------------

        voltageRMS =
            readVoltageRMS();

        // ----------------------------------------------------
        // READ CURRENT
        // ----------------------------------------------------

        currentRMS =
            readCurrentRMS();

        // ----------------------------------------------------
        // CALCULATE POWER
        // ----------------------------------------------------

        powerW =
            voltageRMS *
            currentRMS;

        // ----------------------------------------------------
        // CALCULATE ENERGY
        // ----------------------------------------------------

        energyKWh +=
            (
                powerW *
                elapsedHours
            )
            / 1000.0;

        // ----------------------------------------------------
        // CALCULATE BILL
        // ----------------------------------------------------

        billAmount =
            energyKWh *
            TARIFF;

        // ====================================================
        // SEND VALUES TO BLYNK
        // ====================================================

        Blynk.virtualWrite(
            V0_VOLTAGE,
            voltageRMS
        );

        Blynk.virtualWrite(
            V1_CURRENT,
            currentRMS
        );

        Blynk.virtualWrite(
            V2_POWER,
            powerW
        );

        Blynk.virtualWrite(
            V3_ENERGY,
            energyKWh
        );

        Blynk.virtualWrite(
            V4_BILL,
            billAmount
        );

        // ----------------------------------------------------
        // SERIAL MONITOR
        // ----------------------------------------------------

        Serial.println();
        Serial.println("----------------------------------------");

        Serial.print("Voltage : ");
        Serial.print(voltageRMS, 2);
        Serial.println(" V");

        Serial.print("Current : ");
        Serial.print(currentRMS, 3);
        Serial.println(" A");

        Serial.print("Power   : ");
        Serial.print(powerW, 2);
        Serial.println(" W");

        Serial.print("Energy  : ");
        Serial.print(energyKWh, 6);
        Serial.println(" kWh");

        Serial.print("Tariff  : Rs.");
        Serial.print(TARIFF, 2);
        Serial.println(" / kWh");

        Serial.print("Bill    : Rs.");
        Serial.println(billAmount, 6);

        Serial.print("Local   : http://");
        Serial.print(WiFi.localIP());
        Serial.println("/data");

        Serial.print("Backend : http://");
        Serial.print(BACKEND_SERVER_IP);
        Serial.print(":");
        Serial.print(BACKEND_SERVER_PORT);
        Serial.println(BACKEND_TELEMETRY_ENDPOINT);

        Serial.println("----------------------------------------");
    }

    // ========================================================
    // POST TO MERN BACKEND EVERY 3 SECONDS
    // ========================================================

    if (
        currentMillis -
        previousBackendMillis >= BACKEND_INTERVAL_MS
    )
    {
        previousBackendMillis = currentMillis;

        postToBackend();
    }

    // ========================================================
    // LCD UPDATE
    // ========================================================

    if (
        currentMillis -
        previousLCDMillis >=
        LCD_SCREEN_TIME
    )
    {
        previousLCDMillis =
            currentMillis;

        lcdScreen++;

        if (lcdScreen > 4)
        {
            lcdScreen = 0;
        }
    }

    // --------------------------------------------------------
    // DISPLAY CURRENT SCREEN
    // --------------------------------------------------------

    if (lcdScreen == 0)
    {
        lcdVoltageCurrent();
    }
    else if (lcdScreen == 1)
    {
        lcdPower();
    }
    else if (lcdScreen == 2)
    {
        lcdEnergy();
    }
    else if (lcdScreen == 3)
    {
        lcdBill();
    }
    else if (lcdScreen == 4)
    {
        lcdServerStatus();
    }
}