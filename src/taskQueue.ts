// Task queue for AC commands
export interface ACTask {
  id: string
  timestamp: Date
  deviceId: string
  command: string
  params: Record<string, any>
  processed: boolean
}

// In-memory task queue
export const taskQueue: ACTask[] = []

// Current AC state (for QUERY responses)
export interface ACState {
  online: boolean
  on: boolean
  thermostatMode: string
  thermostatTemperatureSetpoint: number
  currentFanSpeedSetting: string
  currentToggleSettings: {
    swing: boolean
  }
}

export let currentACState: ACState = {
  online: true,
  on: false,
  thermostatMode: 'off',
  thermostatTemperatureSetpoint: 22,
  currentFanSpeedSetting: 'medium_key',
  currentToggleSettings: {
    swing: false
  }
}

/**
 * Update AC state (call this when device reports state changes)
 */
export function updateACState(newState: Partial<ACState>) {
  currentACState = { ...currentACState, ...newState }
}
