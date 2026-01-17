# Task Queue API Documentation

This document explains how AC commands from Google Home are formatted when you retrieve them from the task queue.

## Retrieving Tasks
revert

**Endpoint:** `GET /tasks`

**Authentication:** Requires secret key

```bash
# Using header (recommended)
curl https://acremote.vercel.app/tasks \
  -H "X-Secret-Key: your-secret-key-change-this"

# Or using query parameter
curl "https://acremote.vercel.app/tasks?secret=your-secret-key-change-this"
```

## Response Format

```json
{
  "count": 2,
  "currentState": {
    "online": true,
    "on": true,
    "thermostatMode": "cool",
    "thermostatTemperatureSetpoint": 22,
    "currentFanSpeedSetting": "medium_key",
    "currentToggleSettings": {
      "swing": false
    }
  }
}
```

**Properties:**
- `count` - Number of new commands since last poll (automatically marked as processed after this call)
- `currentState` - The current expected state of the AC based on all commands received

## How It Works

The task queue endpoint returns a **simplified response** containing only:
1. **Count of new commands** received since your last poll
2. **Current state** that your AC should be in

The server internally processes all commands and updates the state. You don't need to parse individual commands - just sync your AC to match the `currentState` whenever `count > 0`.

## Command Types

All commands have these base properties:
- `id` - Unique task identifier
- `timestamp` - When the command was received
- `deviceId` - Always "ac-unit-123"
- `command` - The command type (simplified)

### 1. Turn On/Off

**Voice Command:** "Hey Google, turn on the AC" / "turn off the AC"

**Output:**
```json
{
  "id": "uuid-here",
  "timestamp": "2026-01-17T10:30:00.000Z",
  "deviceId": "ac-unit-123",
  "command": "OnOff",
  "action": "turn_on"
}
```

or

```json
{
  "id": "uuid-here",
  "timestamp": "2026-01-17T10:30:00.000Z",
  "deviceId": "ac-unit-123",
  "command": "OnOff",
  "action": "turn_off"
}
```

**What to do:**
- `action: "turn_on"` → Power on the AC (keeps current mode and settings)
- `action: "turn_off"` → Power off the AC (remember the mode for next time)

---

### 2. Set Temperature

**Voice Command:** "Hey Google, set AC to 24 degrees" / "set the temperature to 20"

**Output:**
```json
{
  "id": "uuid-here",
  "timestamp": "2026-01-17T10:31:00.000Z",
  "deviceId": "ac-unit-123",
  "command": "ThermostatTemperatureSetpoint",
  "action": "set_temperature",
  "temperature": 24,
  "unit": "C"
}
```

**What to do:**
- Set target temperature to the `temperature` value
- Temperature is always in Celsius

---

### 3. Set Mode

**Voice Command:** 
- "Hey Google, set AC to cool mode"
- "set AC to fan only"
- "set AC to dry mode"

**Output:**
```json
{
  "id": "uuid-here",
  "timestamp": "2026-01-17T10:32:00.000Z",
  "deviceId": "ac-unit-123",
  "command": "ThermostatSetMode",
  "action": "set_mode",
  "mode": "cool"
}
```

**Possible modes:**
- `"fan-only"` → Your "fan only" mode
- `"cool"` → Your "normal" cooling mode
- `"dry"` → Your "monsoon" dehumidifier mode

**What to do:**
- Change AC to the specified mode
- Setting any mode automatically turns the AC on
- No "off" mode exists - use OnOff command to power off

---

### 4. Set Fan Speed

**Voice Command:** 
- "Hey Google, set AC fan to high"
- "set fan speed to low"
- "set AC fan to auto"

**Output:**
```json
{
  "id": "uuid-here",
  "timestamp": "2026-01-17T10:33:00.000Z",
  "deviceId": "ac-unit-123",
  "command": "SetFanSpeed",
  "action": "set_fan_speed",
  "fanSpeed": "high"
}
```

**Possible fan speeds:**
- `"low"` → Low speed
- `"medium"` → Medium speed
- `"high"` → High speed
- `"auto"` → Automatic speed

**What to do:**
- Set fan speed to the specified level

---

### 5. Toggle Swing

**Voice Command:**
- "Hey Google, turn on AC swing"
- "turn off AC oscillation"

**Output:**
```json
{
  "id": "uuid-here",
  "timestamp": "2026-01-17T10:34:00.000Z",
  "deviceId": "ac-unit-123",
  "command": "SetToggles",
  "action": "set_toggles",
  "toggles": {
    "swing": true
  }
}
```

**What to do:**
- `swing: true` → Enable swing/oscillation
- `swing: false` → Disable swing/oscillation

---

## Complete Example Response

```json
{
  "count": 3,
  "commands": [
    {
      "id": "a1b2c3d4",
      "timestamp": "2026-01-17T10:30:00.000Z",
      "deviceId": "ac-unit-123",
      "command": "OnOff",
      "action": "turn_on"
    },
    {
      "id": "e5f6g7h8",
      "timestamp": "2026-01-17T10:30:05.000Z",
      "deviceId": "ac-unit-123",
      "command": "ThermostatSetMode",
      "action": "set_mode",
      "mode": "cool"
    },
    {
      "id": "i9j0k1l2",
      "timestamp": "2026-01-17T10:30:10.000Z",
      "deviceId": "ac-unit-123",
      "command": "ThermostatTemperatureSetpoint",
      "action": "set_temperature",
      "temperature": 22,
      "unit": "C"
    }
  ],
  "currentState": {
    "online": true,
    "on": true,
    "thermostatMode": "cool",
    "thermostatTemperatureSetpoint": 22,
    "currentFanSpeedSetting": "medium_key",
    "currentToggleSettings": {
      "swing": false
    }
  }Poll the endpoint** by calling `GET /tasks`
2. **Check the count** - if `count > 0`, there are new commands
3. **Sync your AC** to match the `currentState` object
4. **All commands are automatically processed** - the state reflects the cumulative effect of all commands

### Example Flow

**Initial state:**
```json
{
  "count": 0,
  "currentState": {
    "on": false,
    "thermostatMode": "cool",
    "thermostatTemperatureSetpoint": 22,
    "currentFanSpeedSetting": "medium_key",
    "currentToggleSettings": { "swing": false }
  }
}
```

**User says: "Hey Google, turn on the AC and set it to 24 degrees"**

**Next poll returns:**
```json
{
  "count": 2,
  "currentState": {
    "on": true,
    "thermostatMode": "cool",
    "thermostatTemperatureSetpoint": 24,
    "currentFanSpeedSetting": "medium_key",
### Simple Sync Logic

```python
import requests
import time

SECRET_KEY = "your-secret-key-change-this"
API_URL = "https://acremote.vercel.app/tasks"

def sync_ac():
    response = requests.get(
        API_URL,
        headers={"X-Secret-Key": SECRET_KEY}
    )
    data = response.json()
    
    if data["count"] > 0:
        state = data["currentState"]
        
        # Sync your AC to match the state
        if state["on"]:
            turn_on_ac()
            set_mode(state["thermostatMode"])
            set_temperature(state["thermostatTemperatureSetpoint"])
            set_fan_speed(state["currentFanSpeedSetting"].replace("_key", ""))
            set_swing(state["currentToggleSettings"]["swing"])
        else:
            turn_off_ac()

while True:
    sync_ac()
    time.sleep(3)
```
  - Keep mode as cool
  - Keep fan at medium
  - Keep swing off
## Implementation Notes

### Processing Tasks

1. **Retrieve tasks** by calling `GET /tasks`
2. **Process each command** in the order received
3. Tasks are **automatically marked as processed** after retrieval
4. **Only unprocessed tasks** are returned

### Updating State

After executing commands on your physical AC, update the server state:

```bash
curl -X POST https://acremote.vercel.app/tasks/state \
  -H "X-Secret-Key: your-secret-key-change-this" \
  -H "Content-Type: application/json" \
  -d '{
    "state": {
      "on": true,
      "thermostatMode": "cool",
      "thermostatTemperatureSetpoint": 22,
      "currentFanSpeedSetting": "high",
      "currentToggleSettings": {
        "swing": true
      }
    }
  }'
```

This keeps Google Home in sync with your AC's actual state.

### Polling Frequency

**Recommended:** Poll every 2-5 seconds when AC is registered with Google Home.

- Too frequent: Wastes resources
- Too infrequent: Commands feel slow to user

### Error Handling

If a command fails to execute on your AC:
- Log the error
- Don't update the state
- The command will be marked as processed anyway (won't retry)
- Google Home will query the state later to verify

## Testing

Test with curl:

```bash
# Get tasks
curl "https://acremote.vercel.app/tasks?secret=your-secret-key-change-this"

# View history (last 50 tasks)
curl "https://acremote.vercel.app/tasks/history?secret=your-secret-key-change-this&limit=50"

# Clear processed tasks
curl -X DELETE https://acremote.vercel.app/tasks \
  -H "X-Secret-Key: your-secret-key-change-this"
```
