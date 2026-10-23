/*
  MindQuest Sensors  ·  CognoSpace
  Board : Arduino UNO R4 WiFi
  Sensor: HW-605 finger sensor (MAX30102 chip: red and infrared light on a fingertip,
          gives the heart rate, the beat-to-beat rhythm and the blood oxygen).
          A MAX30100 board works too: the sketch checks which chip it finds.
  Link  : Bluetooth Low Energy to the MindQuest website (Chrome or Edge)
  Matrix: the 12x8 LED matrix shows connection, the live heartbeat, BPM,
          a scrolling pulse line, and reacts to the game (right answer,
          mission number, Face Mirror, breathing guide, trophy at the end).

  Library (Arduino IDE > Tools > Manage Libraries):
    - ArduinoBLE   by Arduino
  Wire and Arduino_LED_Matrix are part of the UNO R4 board package (nothing to install).
  No MAX30102 library is needed: this sketch talks to the chip itself.

  Wiring (full guide in SENSOR-SETUP.md):
    HW-605  VIN -> 5V   GND -> GND   SDA -> SDA   SCL -> SCL      (INT, RD, IRD: leave empty)
    SDA and SCL are the two pins next to AREF (the same as A4 and A5).
    The small 3V3 / 1V8 solder jumper on the sensor must be on 3V3.
    Or plug the sensor into the Qwiic connector: the sketch looks there too.

  This is a classroom sensor, not a medical device.
*/

#include <Wire.h>
#include <ArduinoBLE.h>
#include "Arduino_LED_Matrix.h"

// ---------------- settings you may change ----------------
#define DEVICE_NAME   "MindQuest-Sensors"
#define SERIAL_PLOT   0        // 1 = print the pulse waves for Tools > Serial Plotter
// Infrared light level (0 to 262143) above which a finger is on the sensor.
// Lower it if a finger on the sensor shows "no finger" in the Serial Monitor.
const uint32_t FINGER_LEVEL = 30000;
// Smallest heartbeat wave that counts, in % of the light (a fingertip usually gives 0.3 to 3%).
const float    MIN_PULSE    = 0.05f;
// Light strength for the MAX30102: 0x24 = 7.2 mA (0x01 to 0xFF, 0.2 mA steps).
// The sketch turns it down by itself if the light is too strong for the sensor.
const uint8_t  LED_POWER    = 0x24;

// ---------------- Bluetooth layout (must match the website) ----------------
#define SVC_UUID   "6d710000-4d51-4b8e-9c3a-2f5c0a1b7e01"
#define VIT_UUID   "6d710001-4d51-4b8e-9c3a-2f5c0a1b7e01"   // vitals, 2x per second
#define WAVE_UUID  "6d710002-4d51-4b8e-9c3a-2f5c0a1b7e01"   // pulse wave, 100 points per second
#define BEAT_UUID  "6d710003-4d51-4b8e-9c3a-2f5c0a1b7e01"   // one message per heartbeat
#define CMD_UUID   "6d710004-4d51-4b8e-9c3a-2f5c0a1b7e01"   // commands from the game (LED matrix)

BLEService        mqService(SVC_UUID);
BLECharacteristic vitChar (VIT_UUID,  BLERead | BLENotify, 12);
BLECharacteristic waveChar(WAVE_UUID, BLENotify, 20);
BLECharacteristic beatChar(BEAT_UUID, BLENotify, 6);
BLECharacteristic cmdChar (CMD_UUID,  BLEWrite | BLEWriteWithoutResponse, 20);

ArduinoLEDMatrix matrix;

// ---------------- live state ----------------
bool     bleOK = false, connected = false;

// the sensor chip
const uint8_t CHIP_ADDR = 0x57;
TwoWire*    bus = nullptr;
uint8_t     chip = 0;                          // 0 not found, 1 MAX30100, 2 MAX30102
const char* busName = "";
uint8_t     ledRed = 0, ledIr = 0, topRed = 0, topIr = 0;   // light strength now, and the starting strength
uint8_t     readFails = 0;
uint32_t    lastFind = 0, lastRead = 0, lastLight = 0;

// heartbeat and oxygen (100 light readings a second)
uint32_t sampleN = 0;                          // readings so far; reading k was taken at k * 10 ms
uint32_t irRaw = 0, redRaw = 0;
float    dcIr = 0, dcRed = 0;                  // average light level, slowly following
float    lpIr = 0, lpRed = 0, prevIr = 0, hf = 0, ring[3] = {0}, slopeEnv = 0;
float    cycIr[256], cycRed[256];              // the last 2.5 s of both pulse waves
uint8_t  ri = 0, fingerCnt = 0, settle = 0;
bool     finger = false, inUp = false, swapped = false;
float    upMax = 0, upBefore = 0, lastUp = 0, upAfter = 0, upFrac = 0, lastFrac = 0;
bool     upAfterSet = false;
uint32_t upN = 0, lastBeatN = 0, lastPpgBeat = 0;
uint16_t ibiOk = 750, ibiHist[5] = {0}, lastRR = 0; uint8_t ibiN = 0, ibiIdx = 0;
float    sizeHist[5] = {0}; uint8_t sizeN = 0, sizeIdx = 0;   // sizes of the last 5 beats
uint8_t  hr = 0, beats = 0, spo2 = 0, hiR = 0;
uint8_t  oxHist[8] = {0}; uint8_t oxN = 0, oxIdx = 0;
float    pi = 0, pulseSize = 0;                // perfusion index: how strong the pulse is, in % of the light
float    waveBase = 0, waveEnv = 8;
uint8_t  pulseV = 128, waveWin = 128;          // pulse wave point (0-255) and its most extreme point since the last matrix column
uint8_t  wavePkt[20]; uint8_t waveFill = 0, waveSeq = 0;

uint8_t  vitSeq = 0;
uint32_t lastVitals = 0, lastSerial = 0, lastFrame = 0;

// ---------------- LED matrix: drawing helpers ----------------
uint8_t frame[8][12];
void clearFrame() { memset(frame, 0, sizeof(frame)); }
void px(int x, int y) { if (x >= 0 && x < 12 && y >= 0 && y < 8) frame[y][x] = 1; }
void drawPattern(const char* const rows[8], int dx = 0, int dy = 0) {
  for (int y = 0; y < 8; y++)
    for (int x = 0; x < 12 && rows[y][x]; x++)
      if (rows[y][x] == '#') px(x + dx, y + dy);
}

const char FONT_CHARS[] = " 0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ!?.-:*,'";
const uint8_t FONT[][3] = {   // 3x5 font, one byte per column, bit 0 = top row
  {0x00, 0x00, 0x00},  // ' '
  {0x1F, 0x11, 0x1F},  // '0'
  {0x12, 0x1F, 0x10},  // '1'
  {0x1D, 0x15, 0x17},  // '2'
  {0x11, 0x15, 0x1F},  // '3'
  {0x07, 0x04, 0x1F},  // '4'
  {0x17, 0x15, 0x1D},  // '5'
  {0x1F, 0x15, 0x1D},  // '6'
  {0x01, 0x19, 0x07},  // '7'
  {0x1F, 0x15, 0x1F},  // '8'
  {0x17, 0x15, 0x1F},  // '9'
  {0x1E, 0x05, 0x1E},  // 'A'
  {0x1F, 0x15, 0x0A},  // 'B'
  {0x0E, 0x11, 0x11},  // 'C'
  {0x1F, 0x11, 0x0E},  // 'D'
  {0x1F, 0x15, 0x11},  // 'E'
  {0x1F, 0x05, 0x01},  // 'F'
  {0x0E, 0x11, 0x1D},  // 'G'
  {0x1F, 0x04, 0x1F},  // 'H'
  {0x11, 0x1F, 0x11},  // 'I'
  {0x08, 0x10, 0x0F},  // 'J'
  {0x1F, 0x04, 0x1B},  // 'K'
  {0x1F, 0x10, 0x10},  // 'L'
  {0x1F, 0x06, 0x1F},  // 'M'
  {0x1F, 0x01, 0x1E},  // 'N'
  {0x0E, 0x11, 0x0E},  // 'O'
  {0x1F, 0x05, 0x02},  // 'P'
  {0x0E, 0x19, 0x16},  // 'Q'
  {0x1F, 0x05, 0x1A},  // 'R'
  {0x12, 0x15, 0x09},  // 'S'
  {0x01, 0x1F, 0x01},  // 'T'
  {0x1F, 0x10, 0x1F},  // 'U'
  {0x0F, 0x10, 0x0F},  // 'V'
  {0x1F, 0x0C, 0x1F},  // 'W'
  {0x1B, 0x04, 0x1B},  // 'X'
  {0x03, 0x1C, 0x03},  // 'Y'
  {0x19, 0x15, 0x13},  // 'Z'
  {0x00, 0x17, 0x00},  // '!'
  {0x01, 0x15, 0x02},  // '?'
  {0x00, 0x10, 0x00},  // '.'
  {0x04, 0x04, 0x04},  // '-'
  {0x00, 0x0A, 0x00},  // ':'
  {0x07, 0x0E, 0x07},  // '*'
  {0x10, 0x08, 0x00},  // ','
  {0x00, 0x03, 0x00},  // "'"
};

int glyphOf(char c) {
  if (c >= 'a' && c <= 'z') c -= 32;
  const char* p = strchr(FONT_CHARS, c);
  return (p && c) ? (int)(p - FONT_CHARS) : 0;
}
void drawChar(char c, int x, int y) {
  int g = glyphOf(c);
  for (int cx = 0; cx < 3; cx++)
    for (int r = 0; r < 5; r++)
      if ((FONT[g][cx] >> r) & 1) px(x + cx, y + r);
}

// pictures: '#' = LED on. Edit them to make your own.
const char* const HEART_BIG[8] = {
  ".##...##....", "####.####...", "#########...", "#########...",
  ".#######....", "..#####.....", "...###......", "....#......."};
const char* const HEART_SMALL[8] = {
  "............", ".##.##......", "#######.....", "#######.....",
  ".#####......", "..###.......", "...#........", "............"};
const char* const SMILEY[8] = {
  "...######...", "..#......#..", ".#..#..#..#.", ".#........#.",
  ".#.#....#.#.", ".#..####..#.", "..#......#..", "...######..."};
const char* const WINK[8] = {
  "...######...", "..#......#..", ".#..#.....#.", ".#.....##.#.",
  ".#.#....#.#.", ".#..####..#.", "..#......#..", "...######..."};
const char* const TROPHY[8] = {
  "..########..", "#.#......#.#", "#.#......#.#", ".##......##.",
  "...#....#...", "....#..#....", ".....##.....", "...######..."};
const char* const BT_ICON[8] = {
  "..#.........", "..##........", "#.#.#.......", ".###........",
  ".###........", "#.#.#.......", "..##........", "..#........."};
const char* const FINGER[8] = {
  "....##......", "....##......", "....##......", "...####.....",
  "...####.....", "....##......", "............", "............"};
const int TICK[][2] = {{2,4},{3,5},{4,6},{5,5},{6,4},{7,3},{8,2},{9,1}};

// ---------------- LED matrix: modes ----------------
enum Anim { A_NONE, A_TICK, A_CHEER, A_WINK, A_TROPHY, A_CALM, A_ERROR };
Anim     anim = A_NONE;
uint32_t animStart = 0, animEnd = 0;
char     afterText[24] = "";                  // text to scroll when the animation ends

char     scrollText[24] = "";
bool     scrolling = false;
int      scrollPos = 0;
uint32_t scrollNext = 0;

uint8_t  viewLock = 0;                        // 0 auto, 1 heart, 2 BPM, 3 pulse line, 4 matrix off
uint8_t  lineCols[12] = {4,4,4,4,4,4,4,4,4,4,4,4};
uint32_t nextCol = 0;

void startScroll(const char* t) {
  strncpy(scrollText, t, sizeof(scrollText) - 1); scrollText[sizeof(scrollText) - 1] = 0;
  scrollPos = 12; scrolling = true; scrollNext = 0;
}
void playAnim(Anim a, uint32_t ms, const char* then = "") {
  anim = a; animStart = millis(); animEnd = animStart + ms;
  strncpy(afterText, then, sizeof(afterText) - 1); afterText[sizeof(afterText) - 1] = 0;
  scrolling = false;
}

bool beatFound() { return lastPpgBeat && millis() - lastPpgBeat < 3000; }

void drawNumber(int v, int y) {
  char b[4]; if (v <= 0) strcpy(b, "--"); else snprintf(b, sizeof(b), "%d", v > 999 ? 999 : v);
  int n = strlen(b), x = 12 - n * 4 + 1;      // right aligned
  for (int i = 0; i < n; i++) drawChar(b[i], x + i * 4, y);
}

void drawAnim(uint32_t t) {
  switch (anim) {
    case A_TICK: {                            // right answer: a tick draws itself, then sparkles
      int n = min((int)(t / 45) + 1, 8);
      for (int i = 0; i < n; i++) px(TICK[i][0], TICK[i][1]);
      if (t > 450 && (t / 120) % 2) { px(0, 0); px(11, 0); px(11, 6); px(1, 7); px(10, 3); }
      break;
    }
    case A_CHEER:                             // not quite: a bouncing smile, "keep going"
      drawPattern(SMILEY, 0, (t / 180) % 2 ? -1 : 0);
      break;
    case A_WINK:                              // Face Mirror break
      drawPattern((t / 350) % 2 ? WINK : SMILEY);
      break;
    case A_TROPHY:                            // end of the session
      drawPattern(TROPHY);
      if ((t / 150) % 2) { px(0, 6); px(11, 6); px(1, 4); px(10, 4); px(0, 0); px(11, 0); }
      break;
    case A_CALM: {                            // breathing guide: grow 4 s, hold 1 s, shrink 4 s
      uint32_t p = t % 9000;
      float k = p < 4000 ? p / 4000.0f : p < 5000 ? 1.0f : 1.0f - (p - 5000) / 4000.0f;
      int hw = 1 + (int)(k * 5 + 0.5f), hh = 1 + (int)(k * 3 + 0.5f);
      for (int x = 6 - hw; x < 6 + hw; x++) { px(x, 4 - hh); px(x, 3 + hh); }
      for (int y = 4 - hh; y < 4 + hh; y++) { px(6 - hw, y); px(5 + hw, y); }
      break;
    }
    case A_ERROR:
      drawChar('!', 4, 1); drawChar('!', 7, 1);
      break;
    default: break;
  }
}

void drawBase(uint32_t now) {
  if (viewLock == 4) return;                   // matrix switched off from the website
  if (!connected) {                            // waiting for the website: Bluetooth sign + dots
    drawPattern(BT_ICON);
    int k = (now / 350) % 4;
    for (int i = 0; i < k; i++) { px(6 + i * 2, 3); px(6 + i * 2, 4); }
    return;
  }
  bool found = beatFound();
  if (!finger && !viewLock) {                  // connected but no finger: "put your finger on"
    int dy = ((now / 300) % 3 == 1) ? 1 : 0;   // finger taps down onto the sensor
    drawPattern(FINGER, 1, dy);
    for (int x = 3; x < 9; x++) px(x, 7);
    return;
  }
  uint8_t view = viewLock;
  if (!view) view = found ? 1 + (now / 4000) % 3 : 3;   // the pulse line while the first beats are found
  bool beat = found && now - lastPpgBeat < 160;
  if (view == 1) {                              // heart that beats with the real heartbeat
    if (beat) drawPattern(HEART_BIG, 1, 0); else drawPattern(HEART_SMALL, 2, 0);
    if (beat) { px(11, 3); px(11, 4); }
  } else if (view == 2) {                       // BPM number with a flash bar on each beat
    drawNumber(found ? hr : 0, 0);
    if (beat) for (int x = 0; x < 12; x++) px(x, 7); else { px(5, 7); px(6, 7); }
  } else if (view == 3) {                       // scrolling pulse line
    for (int x = 0; x < 12; x++) {
      int a = lineCols[x], b = x ? lineCols[x - 1] : a;
      for (int y = min(a, b); y <= max(a, b); y++) px(x, y);
    }
  }
}

void renderMatrix(uint32_t now) {
  clearFrame();
  if (anim != A_NONE && now >= animEnd) {
    anim = A_NONE;
    if (afterText[0]) { startScroll(afterText); afterText[0] = 0; }
  }
  if (anim != A_NONE) drawAnim(now - animStart);
  else if (scrolling) {
    if (now >= scrollNext) { scrollNext = now + 70; scrollPos--; }
    int len = strlen(scrollText);
    for (int i = 0; i < len; i++) drawChar(scrollText[i], scrollPos + i * 4, 1);
    if (scrollPos < -len * 4) scrolling = false;
  } else drawBase(now);
  matrix.renderBitmap(frame, 8, 12);
}

// ---------------- Bluetooth ----------------
void onConnect(BLEDevice central) {
  connected = true;
  playAnim(A_TICK, 900, "HI!");
  Serial.print("Connected: "); Serial.println(central.address());
}
void onDisconnect(BLEDevice central) {
  connected = false; viewLock = 0;
  startScroll("BYE");
  Serial.println("Disconnected");
  BLE.advertise();
}

// Commands written by the website (first byte = command)
void onCommand(BLEDevice central, BLECharacteristic c) {
  uint8_t b[21] = {0};
  int n = c.valueLength(); if (n > 20) n = 20; if (n < 1) return;
  memcpy(b, c.value(), n);
  char txt[24];
  switch (b[0]) {
    case 0x01: snprintf(txt, sizeof(txt), "MISSION %d", b[1]); startScroll(txt); break;   // a mission starts
    case 0x02: playAnim(A_TICK, 1100); break;                                             // right answer
    case 0x03: playAnim(A_CHEER, 1000); break;                                            // not quite
    case 0x04: playAnim(A_WINK, 2400, "COPY ME!"); break;                                 // Face Mirror break
    case 0x05: playAnim(A_TROPHY, 2600, "WELL DONE!"); break;                             // session finished
    case 0x06: playAnim(A_CALM, (uint32_t)(b[1] ? b[1] : 18) * 1000UL); break;            // breathing guide (seconds)
    case 0x07: memcpy(txt, b + 1, n - 1); txt[n - 1] = 0; startScroll(txt); break;        // scroll any text
    case 0x08: viewLock = b[1] <= 4 ? b[1] : 0; break;                                    // 0 auto 1 heart 2 BPM 3 pulse line 4 off
    case 0x09: playAnim(A_TICK, 900); break;                                              // hello
  }
}

void sendVitals() {
  bool found = beatFound(), ox = found && spo2;
  // flags: 1 sensor found, 2 finger on, 4 heartbeat found, 8 chip is a MAX30102 (else a MAX30100), 16 oxygen reading ready
  uint8_t flags = (chip ? 1 : 0) | (finger ? 2 : 0) | (found ? 4 : 0) | (chip == 2 ? 8 : 0) | (ox ? 16 : 0);
  uint16_t piX = found ? (uint16_t)min(pi * 100.0f, 65535.0f) : 0;          // pulse strength, in 0.01 %
  uint16_t light = (uint16_t)min((float)irRaw / 4.0f, 65535.0f);           // infrared light level / 4
  uint8_t p[12] = { 2, flags, found ? hr : (uint8_t)0, ox ? spo2 : (uint8_t)0, vitSeq++, beats,
                    (uint8_t)(lastRR & 0xFF), (uint8_t)(lastRR >> 8), (uint8_t)(piX & 0xFF), (uint8_t)(piX >> 8),
                    (uint8_t)(light & 0xFF), (uint8_t)(light >> 8) };
  vitChar.writeValue(p, 12);
}
void sendBeat(uint16_t rr) {
  static uint8_t seq = 0;
  if (!connected) return;
  uint8_t p[6] = { 2, seq++, (uint8_t)(rr & 0xFF), (uint8_t)(rr >> 8), hr, spo2 };
  beatChar.writeValue(p, 6);
}

// 100 pulse-wave points a second go to the website while a finger is on the sensor
void streamWave() {
  if (!finger) { waveFill = 0; return; }
  if (abs(pulseV - 128) > abs(waveWin - 128)) waveWin = pulseV;
  if (!connected) return;
  if (waveFill == 0) { wavePkt[0] = waveSeq++; wavePkt[1] = 2; waveFill = 2; }
  wavePkt[waveFill++] = pulseV;
  if (waveFill == 20) { waveChar.writeValue(wavePkt, 20); waveFill = 0; }
}

// ---------------- finding each heartbeat, and the blood oxygen, in the light ----------------
// The sensor shines red and infrared light into the fingertip and measures how much comes back.
// Each heartbeat pushes a little more blood into the finger, and blood soaks up light, so the
// light dips by about 1% with every beat. Turned upside down, that dip is the "pulse wave".
// A beat is the steepest point of each quick rise of the wave. Its size, the noise level and a
// steady rhythm are checked, so that a moving or lifted finger is not counted as a heartbeat.
// Blood oxygen: blood rich in oxygen soaks up less red light than blood low in oxygen. Comparing
// how much the red and the infrared light change with each beat gives the oxygen level (SpO2).
uint16_t medianGap(const uint16_t* hist, uint8_t k) {   // middle value of the last k beat gaps (ms)
  uint16_t s[5]; memcpy(s, hist, sizeof(s));
  for (int i = 0; i < k; i++) for (int j = i + 1; j < k; j++) if (s[j] < s[i]) { uint16_t x = s[i]; s[i] = s[j]; s[j] = x; }
  return s[k / 2];
}

bool rhythmSteady(uint16_t med) {                // the last 3 beat gaps agree within 25%
  if (ibiN < 3) return false;
  for (int k = 1; k <= 3; k++) {
    uint16_t v = ibiHist[(ibiIdx + 5 - k) % 5];
    if (abs((int)v - (int)med) * 4 > med) return false;
  }
  return true;
}

float beatSize(const float* w, uint32_t from, uint32_t to) {   // top-to-bottom size of one beat, slow drift taken out
  float a = w[from & 255], b = w[to & 255], hi = -1e9f, lo = 1e9f;
  uint32_t m = to - from;
  for (uint32_t k = 0; k <= m; k++) {
    float v = w[(from + k) & 255] - (a + (b - a) * k / m);
    hi = max(hi, v); lo = min(lo, v);
  }
  return hi - lo;
}

void restartRhythm() {                           // forget the rhythm (finger moved, lifted or placed)
  ibiN = 0; ibiIdx = 0; sizeN = 0; sizeIdx = 0; lastBeatN = sampleN; lastFrac = 0; inUp = false;
}

void clearOxygen() { oxN = 0; oxIdx = 0; spo2 = 0; hiR = 0; }

void onBeat(uint32_t at, float frac) {           // a quick rise has ended; its steepest point was reading `at`
  uint32_t from = lastBeatN;
  float ibiF = ((float)(at - from) + frac - lastFrac) * 10.0f;   // ms, to a fraction of a reading
  lastBeatN = at; lastFrac = frac;
  if (ibiF < 300 || ibiF > 1500) return;         // not a heartbeat gap (40 to 200 bpm)
  float acIr = beatSize(cycIr, from, at), acRed = beatSize(cycRed, from, at);
  if (acIr < MIN_PULSE * 100.0f || acIr < 10 * hf) return;   // too small or too noisy to be a heartbeat
  float sz[5]; memcpy(sz, sizeHist, sizeof(sz));              // a beat much bigger or smaller than the last ones = movement
  for (int i = 0; i < sizeN; i++) for (int j = i + 1; j < sizeN; j++) if (sz[j] < sz[i]) { float x = sz[i]; sz[i] = sz[j]; sz[j] = x; }
  bool odd = sizeN >= 3 && (acIr > 2.0f * sz[sizeN / 2] || acIr < 0.5f * sz[sizeN / 2]);
  sizeHist[sizeIdx] = acIr; sizeIdx = (sizeIdx + 1) % 5; if (sizeN < 5) sizeN++;
  if (odd) return;
  uint16_t ibi = (uint16_t)(ibiF + 0.5f);
  ibiHist[ibiIdx] = ibi; ibiIdx = (ibiIdx + 1) % 5; if (ibiN < 5) ibiN++;
  uint16_t med = medianGap(ibiHist, ibiN);
  if (!rhythmSteady(med)) return;                // wait for a steady rhythm before trusting the finger
  ibiOk = ibi; lastRR = ibi; hr = (uint8_t)min(250UL, (60000UL + med / 2) / med);
  lastPpgBeat = millis(); if (!lastPpgBeat) lastPpgBeat = 1; beats++;
  pi = acIr / 100.0f; pulseSize = pi;

  // blood oxygen from this beat: R = (red change / red level) / (infrared change / infrared level)
  float R = acRed / acIr;
  if (R > 1.3f) {                                // far outside a living range: the board has red and infrared swapped
    if (++hiR >= 5) { swapped = !swapped; clearOxygen(); Serial.println("Red and infrared look swapped on this board: swapping them"); }
  } else {
    hiR = 0;
    if (R >= 0.2f && R <= 1.0f) {
      float ox = R < 0.34f ? 100.0f : -45.060f * R * R + 30.354f * R + 94.845f;   // Maxim's curve for this chip
      oxHist[oxIdx] = (uint8_t)constrain((int)(ox + 0.5f), 70, 100); oxIdx = (oxIdx + 1) % 8; if (oxN < 8) oxN++;
      if (oxN >= 4) {                            // middle value of the last 4 to 8 beats
        uint8_t s[8]; memcpy(s, oxHist, sizeof(s));
        for (int i = 0; i < oxN; i++) for (int j = i + 1; j < oxN; j++) if (s[j] < s[i]) { uint8_t x = s[i]; s[i] = s[j]; s[j] = x; }
        spo2 = s[oxN / 2];
      }
    }
  }
  sendBeat(ibi);
}

void onSample(uint32_t red, uint32_t ir) {
  if (swapped) { uint32_t t = red; red = ir; ir = t; }
  sampleN++; irRaw = ir; redRaw = red;

  // finger on or off: 10 readings in a row (0.1 s) must agree
  uint32_t level = max(ir, red);
  bool on = finger ? level > FINGER_LEVEL * 4 / 5 : level > FINGER_LEVEL;
  if (on != finger) {
    if (++fingerCnt >= 10) {
      finger = on; fingerCnt = 0; restartRhythm(); settle = 50;   // let the finger settle for 0.5 s
      if (!finger) { clearOxygen(); pi = 0; }
    }
  } else fingerCnt = 0;
  if (!finger || settle) {                       // no finger yet, or just placed: start the wave fresh
    if (settle) settle--;
    dcIr = ir; dcRed = red; lpIr = lpRed = prevIr = waveBase = 0; ring[0] = ring[1] = ring[2] = 0;
    cycIr[sampleN & 255] = cycRed[sampleN & 255] = 0; pulseV = 128; lastBeatN = sampleN; inUp = false;
    return;
  }

  dcIr += (ir - dcIr) * 0.02f; dcRed += (red - dcRed) * 0.02f;
  float xi = (dcIr - ir) * 10000.0f / max(dcIr, 1.0f);       // pulse wave, in 0.01 % of the light
  float xr = (dcRed - red) * 10000.0f / max(dcRed, 1.0f);
  lpIr += (xi - lpIr) * 0.35f; lpRed += (xr - lpRed) * 0.35f;   // smooth out electrical noise
  cycIr[sampleN & 255] = lpIr; cycRed[sampleN & 255] = lpRed;
  hf += (fabsf(lpIr - prevIr) - hf) * 0.02f; prevIr = lpIr;  // how jittery the wave is (noise level)

  float slope = lpIr - ring[ri];                  // rise over the last 30 ms
  ring[ri] = lpIr; ri = (ri + 1) % 3;
  float up = slope > 0 ? slope : 0;
  slopeEnv = max(slopeEnv * 0.997f, up);          // steepest recent rise, slowly forgotten
  float thr = max(0.45f * slopeEnv, MIN_PULSE * 100.0f / 6.0f);
  uint32_t n = (sampleN - lastBeatN) * 10;        // ms since the last beat
  uint32_t refr = max(250UL, min((uint32_t)ibiOk * 3 / 5, 400UL));   // skip the small second bump of each pulse
  if (inUp && !upAfterSet) { upAfter = up; upAfterSet = true; }
  if (!inUp) {
    if (up > thr && n > refr) { inUp = true; upMax = up; upN = sampleN; upBefore = lastUp; upAfterSet = false; }
  } else {
    if (up > upMax) { upMax = up; upN = sampleN; upBefore = lastUp; upAfterSet = false; }
    if (up < thr * 0.5f || (sampleN - upN) * 10 > 150) {
      inUp = false;
      float d = upBefore - 2 * upMax + upAfter;   // exact moment of the steepest point, between two readings
      float frac = d < 0 ? constrain(0.5f * (upBefore - upAfter) / d, -0.5f, 0.5f) : 0;
      onBeat(upN, frac);
    }
  }
  lastUp = up;
  if (n > 2500 && !inUp) { restartRhythm(); slopeEnv *= 0.5f; }   // nothing for 2.5 s: start fresh

  waveBase += (lpIr - waveBase) * 0.012f;         // wave for the website and the matrix, centred and scaled
  float s = lpIr - waveBase;
  waveEnv = max(waveEnv * 0.996f, fabsf(s));
  pulseV = constrain((int)(128 + s * 90.0f / max(waveEnv, 8.0f)), 0, 255);
}

// ---------------- the sensor chip (MAX30102, or MAX30100) ----------------
bool regWrite(uint8_t reg, uint8_t v) {
  bus->beginTransmission(CHIP_ADDR); bus->write(reg); bus->write(v);
  return bus->endTransmission() == 0;
}
bool regRead(uint8_t reg, uint8_t* buf, size_t n) {
  bus->beginTransmission(CHIP_ADDR); bus->write(reg);
  if (bus->endTransmission(false) != 0) return false;
  if (bus->requestFrom(CHIP_ADDR, n) != n) return false;
  for (size_t i = 0; i < n; i++) buf[i] = bus->read();
  return true;
}
int regRead1(uint8_t reg) { uint8_t v; return regRead(reg, &v, 1) ? v : -1; }

void applyLeds() {
  if (chip == 2) { regWrite(0x0C, ledRed); regWrite(0x0D, ledIr); }   // MAX30102: 0.2 mA steps
  else regWrite(0x09, (ledRed << 4) | ledIr);                          // MAX30100: 16 steps up to 50 mA
}

bool setupChip() {                               // true when a MAX30102 or MAX30100 answered and is set up
  int id = regRead1(0xFF);
  if (id == 0x15) chip = 2; else if (id == 0x11) chip = 1; else return false;
  uint8_t mode = chip == 2 ? 0x09 : 0x06;
  regWrite(mode, 0x40);                          // reset the chip
  for (int i = 0; i < 20 && (regRead1(mode) & 0x40); i++) delay(5);
  if (chip == 2) {
    regWrite(0x02, 0); regWrite(0x03, 0);        // no interrupts (the INT pin is not used)
    regWrite(0x08, 0x5F);                        // average 4 readings into one, memory wraps around
    regWrite(0x0A, 0x2F);                        // 400 readings/s (100/s after averaging), 18-bit, 4096 nA range
    ledRed = ledIr = topRed = topIr = LED_POWER;
    applyLeds();
    regWrite(0x04, 0); regWrite(0x05, 0); regWrite(0x06, 0);   // empty the memory
    regWrite(0x09, 0x03);                        // red + infrared mode
  } else {
    regWrite(0x01, 0);
    regWrite(0x07, 0x47);                        // high resolution, 100 readings/s, 1600 us pulses
    ledIr = topIr = 0x02; ledRed = topRed = 0x03;   // 7.6 mA infrared, 11 mA red
    applyLeds();
    regWrite(0x02, 0); regWrite(0x03, 0); regWrite(0x04, 0);
    regWrite(0x06, 0x03);
  }
  regRead1(0x00);                                // clear the status flags
  return true;
}

bool findChip() {                                // the SDA/SCL pins first, then the Qwiic connector
  TwoWire* const buses[2] = { &Wire, &Wire1 };
  const char* const names[2] = { "SDA/SCL pins", "Qwiic connector" };
  for (int b = 0; b < 2; b++) {
    bus = buses[b];
    if (setupChip()) {
      busName = names[b]; readFails = 0; finger = false; fingerCnt = 0; restartRhythm(); clearOxygen();
      Serial.print(chip == 2 ? "Found the MAX30102 on the " : "Found a MAX30100 on the "); Serial.println(busName);
      return true;
    }
  }
  bus = nullptr; chip = 0;
  return false;
}

// Reads every waiting reading from the chip's memory (it holds the last 32, so nothing is lost
// while Bluetooth is busy for a moment) and passes each one on.
bool readFifo() {
  uint8_t p[3];
  if (!regRead(chip == 2 ? 0x04 : 0x02, p, 3)) return false;   // write position, lost count, read position
  int depth = chip == 2 ? 32 : 16, per = chip == 2 ? 6 : 4;
  int n = (p[0] - p[2]) & (depth - 1);
  if (p[1]) { n = depth; restartRhythm(); }      // the memory overflowed: readings were lost
  if (!n) return true;
  uint8_t d[192];
  if (!regRead(chip == 2 ? 0x07 : 0x05, d, n * per)) return false;
  for (int i = 0; i < n; i++) {
    const uint8_t* s = d + i * per;
    uint32_t red, ir;
    if (chip == 2) {                             // 3 bytes red, then 3 bytes infrared (18-bit)
      red = (((uint32_t)s[0] << 16) | ((uint32_t)s[1] << 8) | s[2]) & 0x3FFFF;
      ir  = (((uint32_t)s[3] << 16) | ((uint32_t)s[4] << 8) | s[5]) & 0x3FFFF;
    } else {                                     // 2 bytes infrared, then 2 bytes red (16-bit, scaled to 18-bit)
      ir  = (((uint32_t)s[0] << 8) | s[1]) << 2;
      red = (((uint32_t)s[2] << 8) | s[3]) << 2;
    }
    onSample(red, ir);
#if SERIAL_PLOT
    Serial.print("Infrared:"); Serial.print(lpIr); Serial.print(",Red:"); Serial.println(lpRed);
#endif
    streamWave();
  }
  return true;
}

uint8_t ledStep(uint8_t v, uint8_t top, bool upw) {   // one step of light strength
  if (chip == 1) return upw ? min(v + 1, (int)top) : max(v - 1, 1);
  return upw ? (uint8_t)min(v * 4 / 3 + 1, (int)top) : (uint8_t)max(v * 3 / 4, 4);
}

void adjustLight() {                             // keep the light below the top of the sensor's range
  if (!chip || !finger) return;
  uint8_t r = ledRed, i = ledIr;
  float dI = swapped ? dcRed : dcIr, dR = swapped ? dcIr : dcRed;
  if (dI > 220000) i = ledStep(ledIr, topIr, false); else if (dI < 90000 && ledIr < topIr) i = ledStep(ledIr, topIr, true);
  if (dR > 220000) r = ledStep(ledRed, topRed, false); else if (dR < 90000 && ledRed < topRed) r = ledStep(ledRed, topRed, true);
  if (r != ledRed || i != ledIr) { ledRed = r; ledIr = i; applyLeds(); restartRhythm(); settle = 30; }   // let the new light settle
}

// ---------------- setup and loop ----------------
void setup() {
  Serial.begin(115200);
  uint32_t t0 = millis(); while (!Serial && millis() - t0 < 1500) {}
  pinMode(LED_BUILTIN, OUTPUT);
  matrix.begin();
  startScroll("MINDQUEST");

  Wire.begin(); Wire1.begin();                   // 100 kHz, the safest speed for the sensor's pull-ups
  if (!findChip()) Serial.println("Sensor not found yet: see 'Sensor not found' in SENSOR-SETUP.md");

  if (!BLE.begin()) {
    Serial.println("Bluetooth failed to start. Update the board firmware: Tools > Firmware Updater");
    playAnim(A_ERROR, 0xFFFFFFF);
  } else {
    bleOK = true;
    BLE.setLocalName(DEVICE_NAME);
    BLE.setDeviceName(DEVICE_NAME);
    BLE.setAdvertisedService(mqService);
    mqService.addCharacteristic(vitChar);
    mqService.addCharacteristic(waveChar);
    mqService.addCharacteristic(beatChar);
    mqService.addCharacteristic(cmdChar);
    BLE.addService(mqService);
    BLE.setEventHandler(BLEConnected, onConnect);
    BLE.setEventHandler(BLEDisconnected, onDisconnect);
    cmdChar.setEventHandler(BLEWritten, onCommand);
    BLE.advertise();
    Serial.println("Bluetooth ready as " DEVICE_NAME);
  }
  lastFind = millis();
}

void loop() {
  uint32_t now = millis();

  if (chip) {                                    // collect the new light readings (100 a second)
    if (now - lastRead >= 20) {
      lastRead = now;
      if (readFifo()) readFails = 0;
      else if (++readFails >= 10) {              // the sensor stopped answering: a wire came loose
        chip = 0; finger = false; clearOxygen(); lastFind = now;
        Serial.println("Lost the sensor: check the 4 wires");
      }
    }
    if (now - lastLight >= 1000) { lastLight = now; adjustLight(); }
  } else if (now - lastFind >= 5000) {           // look for the sensor again every 5 seconds
    lastFind = now;
    if (!findChip() && anim == A_NONE && !scrolling) startScroll("CHECK SENSOR");
  }

  if (bleOK) BLE.poll();
  if (connected && now - lastVitals >= 500) { lastVitals = now; sendVitals(); }

  if (now >= nextCol) {                                 // one pulse-line column every 80 ms on the matrix
    nextCol = now + 80;
    for (int x = 0; x < 11; x++) lineCols[x] = lineCols[x + 1];
    lineCols[11] = constrain(4 - ((int)waveWin - 128) / 30, 0, 7);
    waveWin = 128;
  }
  if (now - lastFrame >= 40) { lastFrame = now; renderMatrix(now); }   // 25 frames per second
  digitalWrite(LED_BUILTIN, beatFound() && now - lastPpgBeat < 80 ? HIGH : LOW);

#if !SERIAL_PLOT
  if (now - lastSerial >= 1000) {
    lastSerial = now;
    if (!chip) Serial.print("Sensor not found: check VIN, GND, SDA, SCL and the 3V3 jumper");
    else {
      Serial.print(chip == 2 ? "MAX30102" : "MAX30100"); Serial.print(" on the "); Serial.print(busName);
      if (!finger) { Serial.print("  no finger (light "); Serial.print(irRaw); Serial.print(")"); }
      else {
        Serial.print("  finger on (light "); Serial.print(irRaw); Serial.print(")");
        if (beatFound()) {
          Serial.print("  "); Serial.print(hr); Serial.print(" bpm  oxygen ");
          if (spo2) { Serial.print(spo2); Serial.print("%"); } else Serial.print("--");
          Serial.print("  pulse size "); Serial.print(pulseSize, 2); Serial.print("%");
        } else Serial.print("  finding the heartbeat, keep still");
      }
    }
    Serial.print("  Bluetooth "); Serial.println(connected ? "connected" : "waiting");
  }
#endif
}
