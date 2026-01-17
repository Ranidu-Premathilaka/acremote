// In-memory task queue
export const taskQueue = [];
export let currentACState = {
    online: true,
    on: false,
    thermostatMode: 'cool',
    thermostatTemperatureSetpoint: 22,
    currentFanSpeedSetting: 'medium_key',
    currentToggleSettings: {
        swing: false,
        high_cool: false,
        light: true
    }
};
/**
 * Update AC state (call this when device reports state changes)
 */
export function updateACState(newState) {
    currentACState = { ...currentACState, ...newState };
}
