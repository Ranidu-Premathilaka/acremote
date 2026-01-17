// In-memory task queue
export const taskQueue = [];
export let currentACState = {
    online: true,
    on: false,
    thermostatMode: 'off',
    thermostatTemperatureSetpoint: 22,
    thermostatTemperatureAmbient: 25,
    currentFanSpeedSetting: 'medium_key',
    currentToggleSettings: {
        swing: false
    }
};
/**
 * Update AC state (call this when device reports state changes)
 */
export function updateACState(newState) {
    currentACState = { ...currentACState, ...newState };
}
