/**
 * Agent Module - Public API
 * 
 * Cross-platform agent utilities for AI agents interacting with LikuBuddy.
 */

export { 
  getPlatform,
  getShell,
  getDataDir,
  getDbPath,
  getStatePath,
  getApiKey,
  getSystemInfo,
  getKeySimTool,
  printSystemInfo,
  printApiKeyInstructions,
  commandExists,
  ensureDir,
  findLikuProcess,
  type Platform,
  type Shell,
  type SystemInfo
} from './PlatformUtils.js';

export {
  sendKey,
  readGameState,
  suggestAction,
  executeCommand,
  type GameKey,
  type GameState,
  type AgentCommand
} from './AgentController.js';
