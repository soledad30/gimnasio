/**
 * Control de acceso por huella — simulación Proteus (Arduino Uno)
 *
 * En Proteus no hay sensor R307 real: cada botón simula una huella enrolada.
 * El ID se envía por UART a COMPIM → puente Python → API GymPro.
 *
 * Protocolo (9600 8N1):
 *   Arduino → PC:  FP:<ID>\n
 *   PC → Arduino:  OK\n | DENY\n | ERR\n
 *
 * Pines:
 *   D2..D5  = botones huella 1..4 (pull-up interno, activo en LOW)
 *   D8      = LED verde (acceso concedido)
 *   D9      = LED rojo  (acceso denegado)
 *   D10     = buzzer (opcional)
 *   TX/RX   = COMPIM (Virtual Terminal opcional en paralelo)
 */

const int BTN_PINS[4] = {2, 3, 4, 5};
const char* HUELLA_IDS[4] = {
  "HUELLA-001",
  "HUELLA-002",
  "HUELLA-003",
  "HUELLA-004",
};

const int LED_OK   = 8;
const int LED_DENY = 9;
const int BUZZER   = 10;

const unsigned long DEBOUNCE_MS = 350;
const unsigned long RESPUESTA_TIMEOUT_MS = 4000;

unsigned long lastPressMs = 0;
bool esperandoRespuesta = false;
unsigned long esperaDesde = 0;

void setup() {
  Serial.begin(9600);
  for (int i = 0; i < 4; i++) {
    pinMode(BTN_PINS[i], INPUT_PULLUP);
  }
  pinMode(LED_OK, OUTPUT);
  pinMode(LED_DENY, OUTPUT);
  pinMode(BUZZER, OUTPUT);
  digitalWrite(LED_OK, LOW);
  digitalWrite(LED_DENY, LOW);
  digitalWrite(BUZZER, LOW);

  Serial.println(F("READY:GYMPRO-HUELLA"));
}

void beep(int times, int onMs, int offMs) {
  for (int i = 0; i < times; i++) {
    digitalWrite(BUZZER, HIGH);
    delay(onMs);
    digitalWrite(BUZZER, LOW);
    if (i < times - 1) delay(offMs);
  }
}

void mostrarOk() {
  digitalWrite(LED_DENY, LOW);
  digitalWrite(LED_OK, HIGH);
  beep(1, 80, 0);
  delay(900);
  digitalWrite(LED_OK, LOW);
}

void mostrarDeny() {
  digitalWrite(LED_OK, LOW);
  digitalWrite(LED_DENY, HIGH);
  beep(2, 120, 80);
  delay(900);
  digitalWrite(LED_DENY, LOW);
}

void mostrarError() {
  digitalWrite(LED_OK, LOW);
  for (int i = 0; i < 3; i++) {
    digitalWrite(LED_DENY, HIGH);
    delay(120);
    digitalWrite(LED_DENY, LOW);
    delay(80);
  }
}

void enviarHuella(const char* id) {
  Serial.print(F("FP:"));
  Serial.println(id);
  esperandoRespuesta = true;
  esperaDesde = millis();
  // Indicador de lectura en curso
  digitalWrite(LED_OK, HIGH);
  digitalWrite(LED_DENY, HIGH);
  delay(80);
  digitalWrite(LED_OK, LOW);
  digitalWrite(LED_DENY, LOW);
}

void procesarRespuesta(String line) {
  line.trim();
  line.toUpperCase();
  esperandoRespuesta = false;

  if (line == "OK") {
    mostrarOk();
  } else if (line == "DENY") {
    mostrarDeny();
  } else {
    mostrarError();
  }
}

void loop() {
  // Respuestas del puente Python
  if (Serial.available()) {
    String line = Serial.readStringUntil('\n');
    if (esperandoRespuesta) {
      procesarRespuesta(line);
    }
  }

  if (esperandoRespuesta) {
    if (millis() - esperaDesde > RESPUESTA_TIMEOUT_MS) {
      esperandoRespuesta = false;
      mostrarError();
    }
    return;
  }

  unsigned long now = millis();
  if (now - lastPressMs < DEBOUNCE_MS) return;

  for (int i = 0; i < 4; i++) {
    if (digitalRead(BTN_PINS[i]) == LOW) {
      lastPressMs = now;
      enviarHuella(HUELLA_IDS[i]);
      // Espera a soltar para no reenviar
      while (digitalRead(BTN_PINS[i]) == LOW) {
        delay(10);
      }
      break;
    }
  }
}
