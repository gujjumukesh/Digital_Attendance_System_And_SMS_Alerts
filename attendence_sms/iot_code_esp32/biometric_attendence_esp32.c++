#include <WiFi.h>
#include <Adafruit_Fingerprint.h>
#include <ESPSupabase.h>

// --- Network Settings ---
const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";

// --- Supabase Settings ---
String supabase_url = "https://your-project.supabase.co";
String supabase_key = "your-anon-key";

HardwareSerial mySerial(2); // RX=16, TX=17
Adafruit_Fingerprint finger = Adafruit_Fingerprint(&mySerial);
Supabase supabase;

void setup() {
  Serial.begin(115200);
  
  // Connect WiFi
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nWiFi Connected");

  // Init Supabase
  supabase.begin(supabase_url, supabase_key);

  // Init Sensor
  finger.begin(57600);
  if (finger.verifyPassword()) {
    Serial.println("Sensor Ready. System Online 24/7.");
  } else {
    Serial.println("Sensor Error!");
    while(1);
  }
}

void loop() {
  // Check for finger scan
  int fingerID = getFingerprintID();

  if (fingerID > 0) {
    Serial.print("User Identified: ID #");
    Serial.println(fingerID);
    
    // Send to Supabase
    String json = "{\"finger_id\":" + String(fingerID) + "}";
    int httpCode = supabase.insert("attendance", json, false);

    if (httpCode == 201) {
      Serial.println("Attendance Logged to Supabase.");
    } else {
      Serial.print("Error Logging: ");
      Serial.println(httpCode);
    }

    // 5 Second Delay as requested
    Serial.println("Waiting 5 seconds for next scan...");
    delay(5000); 
  }

  // Small delay to prevent CPU overheating
  delay(100); 
  
  // Maintenance: Reconnect WiFi if it drops
  if (WiFi.status() != WL_CONNECTED) {
    WiFi.begin(ssid, password);
  }
}

// Helper function to detect and match finger
int getFingerprintID() {
  uint8_t p = finger.getImage();
  if (p != FINGERPRINT_OK) return -1;

  p = finger.image2Tz();
  if (p != FINGERPRINT_OK) return -1;

  p = finger.fingerFastSearch();
  if (p != FINGERPRINT_OK) return -1;

  return finger.fingerID;
}