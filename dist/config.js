// Configuration for single admin user
// Set these via environment variables in production
export const ADMIN_CONFIG = {
    email: process.env.ADMIN_EMAIL || 'admin@example.com',
    password: process.env.ADMIN_PASSWORD || 'changeme123', // CHANGE THIS!
    // This secret key protects the task retrieval endpoint
    taskSecretKey: process.env.TASK_SECRET_KEY || 'your-secret-key-change-this'
};
// AC Device configuration
export const AC_DEVICE = {
    id: 'ac-unit-123',
    name: 'Air Conditioner',
    type: 'action.devices.types.AC_UNIT',
    traits: [
        'action.devices.traits.OnOff',
        'action.devices.traits.TemperatureSetting',
        'action.devices.traits.FanSpeed'
    ],
    attributes: {
        availableThermostatModes: ['off', 'cool', 'heat', 'auto', 'dry', 'fan-only'],
        thermostatTemperatureUnit: 'C',
        availableFanSpeeds: {
            speeds: [
                { speed_name: 'low_key', speed_values: [{ speed_synonym: ['low', 'slow'], lang: 'en' }] },
                { speed_name: 'medium_key', speed_values: [{ speed_synonym: ['medium', 'mid'], lang: 'en' }] },
                { speed_name: 'high_key', speed_values: [{ speed_synonym: ['high', 'fast'], lang: 'en' }] }
            ],
            ordered: true
        }
    }
};
