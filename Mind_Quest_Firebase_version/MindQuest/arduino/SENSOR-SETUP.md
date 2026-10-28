# MindQuest heart sensor: setup guide

This guide covers wiring and using the **HW-605 finger sensor** (the small board with the **MAX30102** chip) with the **Arduino UNO R4 WiFi**. It is the only sensor MindQuest uses. From a fingertip it gives the **heart rate**, the **gap between heartbeats** (for heart rate variability) and the **blood oxygen** (SpO2). The board sends the readings to MindQuest over Bluetooth. The game shows them in the **Heart sensor** box above the camera and adds them to the report.

- Arduino code: `MindQuestSensors/MindQuestSensors.ino`
- Website: `MindQuest.html` (open it in **Chrome or Edge**)

---

## 1. What you need

| Part | Notes |
|---|---|
| Arduino UNO R4 **WiFi** | The Minima has no Bluetooth or LED matrix. |
| HW-605 finger sensor (MAX30102) | Pins on one side: VIN, SDA, SCL, GND. Pins on the other side: GND, RD, IRD, INT (not used). A MAX30100 board also works: the sketch checks which chip it finds. |
| 4 jumper wires (female-to-male) | Or a Qwiic cable with loose ends (section 2). |
| Velcro strap or a soft finger clip | Holds the fingertip on the sensor with light, even pressure. |
| USB power bank (optional) | Lets the board sit next to the child with no cable to the computer. |

## 2. Wiring

| HW-605 pin | UNO R4 WiFi pin |
|---|---|
| **VIN** | **5V** |
| **GND** | **GND** |
| **SDA** | **SDA** (the pin next to AREF, the same as **A4**) |
| **SCL** | **SCL** (the pin next to SDA, the same as **A5**) |
| GND, RD, IRD, INT (other side) | not connected |

The sensor has its own small regulators, so **VIN** can be 5V or 3.3V. Use 5V: it gives the lights their full strength.

> **Check the solder jumper first.** On the HW-605 there is a tiny 3-pad jumper marked **3V3** and **1V8**. It sets the voltage of the SDA and SCL lines. It must join the middle pad to **3V3**. On **1V8** the Arduino cannot hear the sensor and the Serial Monitor says "Sensor not found". If it is on 1V8, melt the blob off that side and bridge the middle pad to 3V3 with a little solder.

**Other way: the Qwiic connector.** The UNO R4 WiFi has a small Qwiic socket next to the USB port. It runs at 3.3V. With a Qwiic cable with loose ends: **black → GND**, **red → VIN**, **blue → SDA**, **yellow → SCL**. The sketch looks for the sensor on the SDA/SCL pins first, then on the Qwiic connector, so nothing needs changing in the code.

## 3. Upload the sketch

1. Install **Arduino IDE 2**.
2. Install the board package: **Tools → Board → Boards Manager →** "Arduino UNO R4 Boards".
3. Install one library: **Tools → Manage Libraries →** "ArduinoBLE" (by Arduino). No MAX30102 library is needed: the sketch talks to the chip itself. Wire and the LED matrix library come with the board package.
4. Open `MindQuestSensors/MindQuestSensors.ino`. The folder name must stay `MindQuestSensors`.
5. Select **Arduino UNO R4 WiFi** and its port, then click **Upload**.
6. Open **Serial Monitor** at **115200** baud. At the start it says `Found the MAX30102 on the SDA/SCL pins`. Then, once a second:
   - no finger: `MAX30102 on the SDA/SCL pins  no finger (light 2400)  Bluetooth waiting`
   - finger on: `MAX30102 on the SDA/SCL pins  finger on (light 104000)  76 bpm  oxygen 98%  pulse size 0.85%  Bluetooth waiting`

   "Light" is how much infrared light comes back (0 to 262143). With a finger on it is usually 50,000 to 200,000. "Pulse size" is how much the light changes with each heartbeat; a fingertip usually gives 0.3% to 3%.

If it says **"Bluetooth failed to start"**, update the board's radio firmware: **Tools → Firmware Updater**, choose the UNO R4 WiFi and install the latest version. The matrix shows **!!** while Bluetooth is not working.

**Seeing the pulse:** set `#define SERIAL_PLOT 1` at the top of the sketch, upload, and open **Tools → Serial Plotter**. You see two lines, **Infrared** and **Red**, each with a smooth rise and fall on every heartbeat. Set it back to `0` afterwards.

## 4. Connect to MindQuest

1. Use **Chrome or Edge** on Windows, Mac, ChromeOS or Android, and make sure the computer's Bluetooth is on. iPhone and iPad browsers do not support Web Bluetooth.
2. Open `MindQuest.html`. The orange **Connect sensor** button with the Bluetooth sign sits in the top bar, both on the start page and during the game. The **Heart sensor** box also appears above the camera from the camera-setup step onwards, with its own Connect button.
3. Click **Connect sensor** and pick **MindQuest-Sensors** in the browser's list. The top-bar button turns green and shows the live heart rate (for example "♥ 78 bpm"), the box shows **Connected**, and the matrix shows a tick and "HI" with the child's name. You can connect on the start page before the child signs in; the recording starts once the session does.
4. Click the green top-bar button for a small menu. It shows the heart rate and oxygen, **Show live readings** opens the box, and **Disconnect** ends the connection. In the box, **—** minimises it to a small pill.
5. If the connection drops, the game tries to reconnect on its own for about 30 seconds. After a page refresh, click Connect again (browsers require this).

If the Bluetooth list never appears when you open the file by double-clicking, serve it locally instead. Run `python -m http.server` in the folder, then open `http://localhost:8000/MindQuest.html`. You can also host it on any https site.

If a toast says **"The sensor board runs an older sketch"**, the board still has the earlier ECG / pulse-sensor code on it: upload the new `MindQuestSensors.ino`.

## 5. Putting the sensor on a child

- Use the index fingertip of the hand the child does **not** write with. The pad of the finger lies flat on the window with the two small lights (you see a faint red glow).
- Hold it with a velcro strap or a soft clip. Use **light, even pressure**: pressing hard squeezes the blood out and the pulse almost disappears.
- Keep that hand resting on the table, and let the child use the other hand for the mouse or screen.
- Warm hands give the best signal. Cold fingers, moving the finger, and bright sunlight on the sensor weaken it.
- The box tells you what is happening:

| Box shows | Meaning |
|---|---|
| **Place finger** | The sensor is working but no finger is on it |
| **Finger on** + **Keep still** | A finger is on; the board is waiting for a few steady beats (about 5 seconds) |
| **Finger on** + **Strong pulse** | All good: heart rate, oxygen and the orange **PULSE** wave are live |
| **Weak pulse** | Pulse found but faint: warm the hand, or press a little more gently |
| **Sensor not found** (red) | The board cannot talk to the HW-605 (section 9) |

Blood oxygen appears a few beats after the heart rate, because it is the middle value of the last 4 to 8 beats.

## 6. What the LED matrix shows

| Matrix | Meaning |
|---|---|
| "MINDQUEST" scrolling | Board starting |
| "CHECK SENSOR" scrolling | The HW-605 was not found; the board looks again every 5 seconds |
| Bluetooth sign + dots | Waiting for the website to connect |
| Tick, then "HI" and the name | Connected |
| Finger tapping a bar | Connected, but no finger on the sensor |
| Moving line | The live pulse wave (also shown while the first beats are being found) |
| Beating heart | The real heartbeat (cycles with the number and the line every 4 s) |
| Number | Heart rate in BPM, with a flash on each beat |
| "MISSION 6" | A new mission started |
| Tick + sparkles | Right answer |
| Bouncing smile | Wrong answer: "keep going" |
| Winking face + "COPY ME!" | Face Mirror break |
| Square growing and shrinking | Breathing guide: shown for 20 s when the heart rate stays 25+ BPM above the child's calm level for 30 s during a mission (at most once every 3 minutes) |
| Trophy + "WELL DONE!" | The session was ended and the report opened |
| "BYE" | Disconnected |
| **!!** | Bluetooth did not start (see section 3) |

The pictures are drawn with `#` characters near the top of the sketch (`HEART_BIG`, `SMILEY`, `TROPHY` and so on), so you can redraw them yourself. The small **L** LED on the board also blinks with each heartbeat.

## 7. What goes into the report

When the sensor was connected, the report gains these sections.

- **"At a glance" summary:** heart rate while playing and the activity where it was highest. A **Heart** tag shows Steady, Raised or High. Heart signals also count toward the stress reading, for example "a faster heartbeat after mistakes".
- **Heart & body signals card**, with:
  - **Calm level:** this child's own resting rate in the session (the 20th percentile of their heart rate).
  - **Heart rate while playing,** and how far it is above the calm level.
  - **Busiest mission,** plus the top 3 missions by heart rate.
  - **Heart rate variability (HRV, RMSSD):** lower values during missions than between them are a common sign of effort or stress.
  - **Blood oxygen:** the session average and the lowest value. (If there were too few oxygen readings, the highest heart rate is shown instead.)
  - **A chart of the whole session,** with the missions shaded, the calm level dashed, and a red dot on each wrong answer.
  - **Heart rate by activity:** Writing (while typing), Speaking, Reading, Listening, Thinking puzzles, Fast games, Finger Math, Feelings stories, Choices & mood, Face Mirror and Between missions, each with its own HRV.
  - **Reaction to answers:** how much the heart rate changed in the 10 seconds after a wrong answer compared with a right one.
  - **A 5-second pulse-wave strip.**
- **Mission details table:** a Heart column with the average BPM per mission. The timeline tooltips show it too.
- **Download data:** the per-second heart rate and oxygen, every beat interval, and all the summaries above.

All readings stay on the device with the rest of the session and are wiped by End Session.

## 8. Getting good data, and ideas to go further

**Tips**
- Let the child sit quietly for a minute after connecting, during the camera and mic setup. That gives the game a true calm level to compare against.
- Keep the sensor hand still and resting. Movement is the main cause of wrong beats; the board ignores beats that do not fit a steady rhythm.
- Fix the sensor in the same way for every child (same finger, same strap) so reports can be compared.

**Ideas to make it better**
- **Add a skin-conductance (GSR) sensor,** such as the Grove GSR on A0. Sweat response is the clearest stress signal and responds within seconds. It fits the same Bluetooth link as one more value.
- **Add a skin-temperature sensor** (MLX90614, also on SDA/SCL). Falling fingertip temperature tracks stress too.
- **Estimate breathing rate** from the pulse, since the heartbeat speeds up and slows down with each breath.
- **Make a 3D-printed finger cradle** that blocks outside light and keeps the pressure the same.

## 9. Troubleshooting

| Problem | Fix |
|---|---|
| "Sensor not found" in the Serial Monitor, red chip in the box, "CHECK SENSOR" on the matrix | 1) Check the **3V3 / 1V8 jumper** is on **3V3** (section 2). 2) Check VIN → 5V, GND → GND, SDA → SDA, SCL → SCL (SDA and SCL are easy to swap). 3) The 4 pins must be soldered into the **VIN, SDA, SCL, GND** holes (the other row, GND RD IRD INT, is not used). A jumper plug pressed against a bare hole, or a pin only pushed through it, does not make contact. 4) Try the Qwiic connector instead. |
| "Lost the sensor: check the 4 wires" | A wire came loose while running. The board finds the sensor again on its own within 5 seconds once it is reconnected. |
| No red glow on the sensor | It is not powered or not found. See the first row. |
| "Place finger" with a finger on the sensor | Look at the "light" number in the Serial Monitor. If it stays under 30,000 with a finger on, lower `FINGER_LEVEL` at the top of the sketch to 15000. |
| "Keep still" never changes to a heart rate | Rest the hand, use lighter pressure, warm the hands, and shade the sensor from sunlight. If "pulse size" in the Serial Monitor stays under 0.05%, lower `MIN_PULSE` to 0.03. |
| Oxygen shows "--" while the heart rate works | It needs a few steady beats; keep still for 10 seconds. If it never appears, the Serial Monitor may say "Red and infrared look swapped": the sketch handles that by itself after a few beats. |
| Oxygen reads low (below 94%) on a healthy child | Usually movement, a cold finger, or bright light. Read it as a rough guide only. |
| Heart rate jumps around | The finger is moving or pressing too hard. |
| "Needs Chrome or Edge with Bluetooth" | Switch browser, or turn the computer's Bluetooth on. |
| MindQuest-Sensors not in the list | Check the board is powered and the Serial Monitor says "Bluetooth ready". Close other tabs that are connected to it, and stay within about 5 m. |

## 10. Safety and privacy

- MindQuest and this sensor are a classroom screening tool, **not a medical device**. Do not use the heart rate or oxygen readings to diagnose anything.
- The sensor only shines a weak red and infrared light on the skin. Take it off if the strap feels tight.
- Get a parent's consent before using body sensors, and let the child say no.
- Heart data never leaves the device. It is stored with the session in the browser and deleted by End Session.

## 11. For developers: how it works and the Bluetooth link

**On the board.** The MAX30102 takes 400 readings a second of each light and averages every 4, so the sketch gets 100 red and 100 infrared readings a second from the chip's memory (32 readings deep, so a busy moment of Bluetooth loses nothing). Each reading is turned into a **pulse wave**: how far the light dips below its recent average, in hundredths of a percent, turned upside down so it rises with each beat. A beat is the steepest point of each quick rise. It counts only if the beat is big enough (`MIN_PULSE`), clearly bigger than the background jitter, about the same size as the last few beats, and the last 3 beat gaps agree within 25%. The heart rate is the middle value of the last 5 beat gaps. Beat times are worked out to a fraction of a reading, so the gaps are exact enough for HRV.

**Blood oxygen** uses the "ratio of ratios" for each beat: R = (red change ÷ red level) ÷ (infrared change ÷ infrared level), with the slow drift between beats taken out. Then SpO2 = −45.060·R² + 30.354·R + 94.845 (Maxim's curve for this chip), capped at 100%. Beats with R outside 0.2 to 1.0 are skipped, and the shown value is the middle of the last 4 to 8 beats. If R stays above 1.3 for 5 beats, the board's red and infrared lights are wired the other way round, and the sketch swaps them. If the light is so strong that it nears the top of the sensor's range, the sketch turns the lights down a step.

Service `6d710000-4d51-4b8e-9c3a-2f5c0a1b7e01`. All multi-byte values are little-endian.

| Characteristic | UUID ends | Direction | Content |
|---|---|---|---|
| Vitals | `…0001…` | notify, 2× per second | `[2, flags, bpm, spo2, seq, beats, rrLo, rrHi, piLo, piHi, lightLo, lightHi]`. Flags: bit0 sensor found, bit1 finger on, bit2 heartbeat found, bit3 chip is a MAX30102 (else MAX30100), bit4 oxygen reading ready. `pi` = pulse strength in 0.01 %, `light` = infrared level ÷ 4 |
| Wave | `…0002…` | notify, about 5.5 per second while a finger is on | `[seq, 2, 18 samples]`: the pulse wave, 100 samples/s, 0–255 with 128 as the baseline |
| Beat | `…0003…` | notify, every heartbeat | `[2, seq, rrLo, rrHi, bpm, spo2]` (rr = ms since the previous beat) |
| Command | `…0004…` | write from the website | `01 n` mission n · `02` right · `03` wrong · `04` Face Mirror · `05` end · `06 s` breathing guide for s seconds · `07 text…` scroll text · `08 v` matrix view (0 auto, 1 heart, 2 BPM, 3 pulse line, 4 off) · `09` hello |

The website calculates HRV (RMSSD) from the beat gaps, skipping pairs that change by more than 20%, which is a moving finger rather than the heart.
