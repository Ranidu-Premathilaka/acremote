// Configuration for single admin user
// Set these via environment variables in production

export const ADMIN_CONFIG = {
  email: process.env.ADMIN_EMAIL || 'admin@example.com',
  password: process.env.ADMIN_PASSWORD || 'changeme123', // CHANGE THIS!
  // This secret key protects the task retrieval endpoint
  taskSecretKey: process.env.TASK_SECRET_KEY || 'your-secret-key-change-this'
}

// AC Device configuration
export const AC_DEVICE = {
  id: 'ac-unit-123',
  name: 'Air Conditioner',
  type: 'action.devices.types.AC_UNIT',
  traits: [
    'action.devices.traits.OnOff',
    'action.devices.traits.TemperatureSetting',
    'action.devices.traits.FanSpeed',
    'action.devices.traits.Toggles'
  ],
  attributes: {
    availableThermostatModes: ['fan-only', 'cool', 'dry'],
    thermostatTemperatureUnit: 'C',
    thermostatTemperatureRange: {
      minThresholdCelsius: 18,
      maxThresholdCelsius: 30
    },
    availableFanSpeeds: {
      speeds: [
        { speed_name: 'low_key', speed_values: [{ speed_synonym: ['low', 'slow'], lang: 'en' }] },
        { speed_name: 'medium_key', speed_values: [{ speed_synonym: ['medium', 'mid'], lang: 'en' }] },
        { speed_name: 'high_key', speed_values: [{ speed_synonym: ['high', 'fast'], lang: 'en' }] },
        { speed_name: 'auto_key', speed_values: [{ speed_synonym: ['auto', 'automatic'], lang: 'en' }] }
      ],
      ordered: true
    },
    availableToggles: [
      {
        name: 'swing',
        name_values: [{
          name_synonym: ['swing', 'oscillate', 'oscillation'],
          lang: 'en'
        }]
      },
      {
        name: 'high_cool',
        name_values: [{
          name_synonym: ['high cool', 'turbo', 'turbo cool', 'boost'],
          lang: 'en'
        }]
      },
      {
        name: 'light',
        name_values: [{
          name_synonym: ['light', 'display light', 'panel light'],
          lang: 'en'
        }]
      }
    ]
  }
}

// Mode mappings for your AC
export const AC_MODES = {
  'fan-only': 'fan only',
  'cool': 'normal',
  'dry': 'monsoon',
  // Note: 'high cool' doesn't fit standard thermostat modes
  // It could be represented as cool mode + high fan speed
} as const
