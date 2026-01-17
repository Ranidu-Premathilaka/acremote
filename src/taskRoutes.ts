import { Router, Request, Response } from 'express'
import { ADMIN_CONFIG } from './config.js'
import { taskQueue, currentACState, updateACState } from './taskQueue.js'

const router = Router()

/**
 * GET /tasks
 * Retrieve and pop tasks from the queue
 * Protected by secret key
 */
router.get('/', (req: Request, res: Response) => {
  const secretKey = req.headers['x-secret-key'] || req.query.secret

  if (!secretKey || secretKey !== ADMIN_CONFIG.taskSecretKey) {
    return res.status(401).json({ error: 'Invalid or missing secret key' })
  }

  // Get all unprocessed tasks
  const unprocessedTasks = taskQueue.filter(task => !task.processed)

  // Parse tasks into simplified commands
  const commands = unprocessedTasks.map(task => {
    const parsed: any = {
      id: task.id,
      timestamp: task.timestamp,
      deviceId: task.deviceId,
      command: task.command.replace('action.devices.commands.', '')
    }

    // Parse params into human-readable format
    switch (task.command) {
      case 'action.devices.commands.OnOff':
        parsed.action = task.params.on ? 'turn_on' : 'turn_off'
        break

      case 'action.devices.commands.ThermostatTemperatureSetpoint':
        parsed.action = 'set_temperature'
        parsed.temperature = task.params.thermostatTemperatureSetpoint
        parsed.unit = 'C'
        break

      case 'action.devices.commands.ThermostatSetMode':
        parsed.action = 'set_mode'
        parsed.mode = task.params.thermostatMode
        break

      case 'action.devices.commands.SetFanSpeed':
        parsed.action = 'set_fan_speed'
        parsed.fanSpeed = task.params.fanSpeed.replace('_key', '')
        break

      case 'action.devices.commands.SetToggles':
        parsed.action = 'set_toggles'
        parsed.toggles = task.params.updateToggleSettings
        break

      default:
        parsed.action = 'unknown'
        parsed.params = task.params
    }

    return parsed
  })

  // Mark tasks as processed
  unprocessedTasks.forEach(task => {
    task.processed = true
  })

  res.json({
    count: commands.length,
    commands,
    currentState: currentACState
  })
})

/**
 * POST /tasks/state
 * Update AC state from external device
 * Protected by secret key
 */
router.post('/state', (req: Request, res: Response) => {
  const secretKey = req.headers['x-secret-key'] || req.body.secret

  if (!secretKey || secretKey !== ADMIN_CONFIG.taskSecretKey) {
    return res.status(401).json({ error: 'Invalid or missing secret key' })
  }

  const newState = req.body.state

  if (!newState || typeof newState !== 'object') {
    return res.status(400).json({ error: 'Invalid state object' })
  }

  // Update the state
  updateACState(newState)

  res.json({
    message: 'State updated successfully',
    currentState: currentACState
  })
})

/**
 * GET /tasks/history
 * Get all tasks including processed ones
 * Protected by secret key
 */
router.get('/history', (req: Request, res: Response) => {
  const secretKey = req.headers['x-secret-key'] || req.query.secret

  if (!secretKey || secretKey !== ADMIN_CONFIG.taskSecretKey) {
    return res.status(401).json({ error: 'Invalid or missing secret key' })
  }

  const limit = parseInt(req.query.limit as string) || 50

  res.json({
    count: taskQueue.length,
    tasks: taskQueue.slice(-limit).reverse()
  })
})

/**
 * DELETE /tasks
 * Clear all processed tasks
 * Protected by secret key
 */
router.delete('/', (req: Request, res: Response) => {
  const secretKey = req.headers['x-secret-key'] || req.body.secret

  if (!secretKey || secretKey !== ADMIN_CONFIG.taskSecretKey) {
    return res.status(401).json({ error: 'Invalid or missing secret key' })
  }

  const beforeCount = taskQueue.length
  
  // Remove processed tasks
  for (let i = taskQueue.length - 1; i >= 0; i--) {
    if (taskQueue[i].processed) {
      taskQueue.splice(i, 1)
    }
  }

  const afterCount = taskQueue.length

  res.json({
    message: 'Processed tasks cleared',
    removed: beforeCount - afterCount,
    remaining: afterCount
  })
})

export default router
