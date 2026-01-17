import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { oauth2Tokens } from './db.js';
import { AC_DEVICE } from './config.js';
import { taskQueue, currentACState, updateACState } from './taskQueue.js';
const router = Router();
/**
 * Middleware to verify OAuth2 access token
 */
function verifyAccessToken(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'unauthorized', error_description: 'No access token provided' });
    }
    const accessToken = authHeader.substring(7);
    const token = oauth2Tokens.get(accessToken);
    if (!token) {
        return res.status(401).json({ error: 'unauthorized', error_description: 'Invalid access token' });
    }
    if (token.expiresAt < new Date()) {
        oauth2Tokens.delete(accessToken);
        return res.status(401).json({ error: 'unauthorized', error_description: 'Access token expired' });
    }
    // Attach user info to request
    ;
    req.userId = token.userId;
    next();
}
/**
 * POST /fulfillment
 * Main Google Home fulfillment endpoint
 * Handles SYNC, QUERY, and EXECUTE intents
 */
router.post('/', verifyAccessToken, async (req, res) => {
    try {
        const { requestId, inputs } = req.body;
        if (!requestId || !inputs || !Array.isArray(inputs)) {
            return res.status(400).json({ error: 'Invalid request format' });
        }
        const input = inputs[0];
        const intent = input.intent;
        switch (intent) {
            case 'action.devices.SYNC':
                return handleSync(req, res, requestId);
            case 'action.devices.QUERY':
                return handleQuery(req, res, requestId, input);
            case 'action.devices.EXECUTE':
                return handleExecute(req, res, requestId, input);
            case 'action.devices.DISCONNECT':
                return handleDisconnect(req, res, requestId);
            default:
                return res.status(400).json({
                    requestId,
                    payload: {
                        errorCode: 'notSupported'
                    }
                });
        }
    }
    catch (error) {
        console.error('Fulfillment error:', error);
        res.status(500).json({
            requestId: req.body.requestId,
            payload: {
                errorCode: 'hardError'
            }
        });
    }
});
/**
 * Handle SYNC intent - return list of devices
 */
function handleSync(req, res, requestId) {
    const userId = req.userId;
    res.json({
        requestId,
        payload: {
            agentUserId: userId,
            devices: [
                {
                    id: AC_DEVICE.id,
                    type: AC_DEVICE.type,
                    traits: AC_DEVICE.traits,
                    name: {
                        defaultNames: [AC_DEVICE.name],
                        name: AC_DEVICE.name,
                        nicknames: [AC_DEVICE.name, 'AC']
                    },
                    willReportState: false,
                    attributes: AC_DEVICE.attributes,
                    deviceInfo: {
                        manufacturer: 'Custom AC',
                        model: 'v1',
                        hwVersion: '1.0',
                        swVersion: '1.0'
                    }
                }
            ]
        }
    });
}
/**
 * Handle QUERY intent - return current device state
 */
function handleQuery(req, res, requestId, input) {
    const devices = input.payload?.devices || [];
    const deviceStates = {};
    devices.forEach((device) => {
        if (device.id === AC_DEVICE.id) {
            deviceStates[device.id] = currentACState;
        }
        else {
            deviceStates[device.id] = {
                online: false,
                errorCode: 'deviceNotFound'
            };
        }
    });
    res.json({
        requestId,
        payload: {
            devices: deviceStates
        }
    });
}
/**
 * Handle EXECUTE intent - execute commands and add to task queue
 */
function handleExecute(req, res, requestId, input) {
    const commands = input.payload?.commands || [];
    const commandResults = [];
    commands.forEach((command) => {
        const devices = command.devices || [];
        const execution = command.execution || [];
        devices.forEach((device) => {
            if (device.id !== AC_DEVICE.id) {
                commandResults.push({
                    ids: [device.id],
                    status: 'ERROR',
                    errorCode: 'deviceNotFound'
                });
                return;
            }
            const newState = { ...currentACState };
            let success = true;
            // Process each execution command
            execution.forEach((exec) => {
                const cmdName = exec.command;
                const params = exec.params || {};
                // Add to task queue
                const task = {
                    id: uuidv4(),
                    timestamp: new Date(),
                    deviceId: device.id,
                    command: cmdName,
                    params,
                    processed: false
                };
                taskQueue.push(task);
                // Update state based on command
                try {
                    switch (cmdName) {
                        case 'action.devices.commands.OnOff':
                            newState.on = params.on;
                            if (!params.on) {
                                newState.thermostatMode = 'off';
                            }
                            break;
                        case 'action.devices.commands.ThermostatTemperatureSetpoint':
                            newState.thermostatTemperatureSetpoint = params.thermostatTemperatureSetpoint;
                            break;
                        case 'action.devices.commands.ThermostatSetMode':
                            newState.thermostatMode = params.thermostatMode;
                            if (params.thermostatMode !== 'off') {
                                newState.on = true;
                            }
                            else {
                                newState.on = false;
                            }
                            break;
                        case 'action.devices.commands.SetFanSpeed':
                            newState.currentFanSpeedSetting = params.fanSpeed;
                            break;
                        case 'action.devices.commands.SetToggles':
                            if (params.updateToggleSettings) {
                                newState.currentToggleSettings = {
                                    ...newState.currentToggleSettings,
                                    ...params.updateToggleSettings
                                };
                            }
                            break;
                        default:
                            success = false;
                            console.warn('Unknown command:', cmdName);
                    }
                }
                catch (error) {
                    success = false;
                    console.error('Command processing error:', error);
                }
            });
            if (success) {
                // Update the state
                updateACState(newState);
                commandResults.push({
                    ids: [device.id],
                    status: 'SUCCESS',
                    states: newState
                });
            }
            else {
                commandResults.push({
                    ids: [device.id],
                    status: 'ERROR',
                    errorCode: 'hardError'
                });
            }
        });
    });
    res.json({
        requestId,
        payload: {
            commands: commandResults
        }
    });
}
/**
 * Handle DISCONNECT intent
 */
function handleDisconnect(req, res, requestId) {
    res.json({
        requestId
    });
}
export default router;
