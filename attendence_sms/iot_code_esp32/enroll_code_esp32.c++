#include <Adafruit_Fingerprint.h>

HardwareSerial mySerial(2); // RX=16, TX=17
Adafruit_Fingerprint finger = Adafruit_Fingerprint(&mySerial);

void setup() {
  Serial.begin(115200);
  while (!Serial);
  delay(100);
  finger.begin(57600);
  
  if (finger.verifyPassword()) {
    Serial.println("Found fingerprint sensor!");
  } else {
    Serial.println("Did not find fingerprint sensor :(");
    while (1) { delay(1); }
  }
}

void loop() {
  Serial.println("Ready to enroll! Please type the ID # (1 to 127) you want to save...");
  uint8_t id = 0;
  while (id == 0) {
    while (!Serial.available());
    id = Serial.parseInt();
  }
  Serial.print("Enrolling ID #"); Serial.println(id);

  while (!getFingerprintEnroll(id));
}

uint8_t getFingerprintEnroll(uint8_t id) {
  int p = -1;
  Serial.print("Place finger for ID #"); Serial.println(id);
  while (p != FINGERPRINT_OK) { p = finger.getImage(); }
  p = finger.image2Tz(1);
  if (p != FINGERPRINT_OK) return false;

  Serial.println("Remove finger");
  delay(2000);
  p = 0;
  while (p != FINGERPRINT_NOFINGER) { p = finger.getImage(); }

  Serial.println("Place same finger again");
  p = -1;
  while (p != FINGERPRINT_OK) { p = finger.getImage(); }
  p = finger.image2Tz(2);
  if (p != FINGERPRINT_OK) return false;

  p = finger.createModel();
  if (p != FINGERPRINT_OK) { Serial.println("Prints did not match"); return false; }

  p = finger.storeModel(id);
  if (p == FINGERPRINT_OK) {
    Serial.println("Stored Successfully!");
    return true;
  } else {
    return false;
  }
}