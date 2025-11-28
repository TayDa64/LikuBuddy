#!/usr/bin/env node
/**
 * LikuBuddy Agent CLI
 * 
 * Cross-platform command-line interface for AI agents to interact with LikuBuddy.
 * 
 * Usage:
 *   npm run agent key <keyname>     Send a key to the game
 *   npm run agent read              Read current game state
 *   npm run agent decide            Get AI-suggested action
 *   npm run agent info              Show system info
 *   npm run agent auto              Auto-play mode (experimental)
 * 
 * Examples:
 *   npm run agent key up
 *   npm run agent key enter
 *   npm run agent read
 */

import { 
  sendKey, 
  readGameState, 
  suggestAction, 
  GameKey,
  executeCommand 
} from './AgentController.js';
import { 
  getPlatform, 
  getKeySimTool, 
  printSystemInfo,
  getApiKey,
  printApiKeyInstructions
} from './PlatformUtils.js';

// Valid keys for the game
const VALID_KEYS: GameKey[] = [
  'up', 'down', 'left', 'right',
  'enter', 'escape', 'space',
  'f', 'r', 'q', 'm',
  'a', 'b', 'c', 'd', 'e', 'g', 'h', 'i', 'j', 'k', 'l',
  'n', 'o', 'p', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z'
];

function printUsage(): void {
  console.log(`
╭─────────────────────────────────────────────────────────╮
│           🤖 LikuBuddy Agent CLI                        │
│        Cross-Platform AI Agent Interface                │
╰─────────────────────────────────────────────────────────╯

Usage:
  npm run agent <command> [options]

Commands:
  key <keyname>    Send a key to the game window
  read             Read current game state (JSON)
  decide           Get AI-suggested next action
  info             Show system/platform information
  auto [count]     Auto-play mode (default: 10 actions)
  help             Show this help message

Key Names:
  Arrows:   up, down, left, right
  Actions:  enter, escape, space
  Letters:  a-z (for Hangman, etc.)
  Shortcuts: f (feed), r (rest), q (quit), m (mini mode)

Examples:
  npm run agent key up          # Press up arrow
  npm run agent key enter       # Press enter
  npm run agent read            # Get game state as JSON
  npm run agent decide          # Get suggested action
  npm run agent auto 5          # Auto-play 5 moves

Platform-Specific Notes:
  Windows:  Uses PowerShell + WScript.Shell (built-in)
  macOS:    Uses osascript/AppleScript (built-in)
  Linux:    Requires xdotool (install: sudo apt install xdotool)
`);
}

async function handleKeyCommand(keyName: string): Promise<void> {
  const key = keyName.toLowerCase() as GameKey;
  
  if (!VALID_KEYS.includes(key)) {
    console.error(`❌ Unknown key: ${keyName}`);
    console.error(`   Valid keys: ${VALID_KEYS.join(', ')}`);
    process.exit(1);
  }
  
  // Check if key simulation is available
  const toolInfo = getKeySimTool();
  if (!toolInfo.available) {
    console.error(`❌ Key simulation not available on this platform.`);
    console.error(`   ${toolInfo.installHint}`);
    process.exit(1);
  }
  
  try {
    await sendKey(key);
    console.log(`✅ Sent key: ${key}`);
  } catch (error) {
    console.error(`❌ Failed to send key: ${error instanceof Error ? error.message : error}`);
    process.exit(1);
  }
}

function handleReadCommand(): void {
  const state = readGameState();
  
  if (!state) {
    console.error('❌ No game state available.');
    console.error('   Make sure LikuBuddy is running and likubuddy-state.txt exists.');
    process.exit(1);
  }
  
  // Output as JSON for easy parsing by AI agents
  console.log(JSON.stringify(state, null, 2));
}

function handleDecideCommand(): void {
  const state = readGameState();
  
  if (!state) {
    console.error('❌ No game state available.');
    console.error('   Make sure LikuBuddy is running and likubuddy-state.txt exists.');
    process.exit(1);
  }
  
  const action = suggestAction(state);
  
  if (action) {
    console.log(`Suggested action: ${action}`);
    console.log(`\nGame state summary:`);
    console.log(`  Screen: ${state.screen}`);
    if (state.stats) {
      console.log(`  Energy: ${state.stats.energy}%`);
      console.log(`  Hunger: ${state.stats.hunger}%`);
      console.log(`  Happiness: ${state.stats.happiness}%`);
    }
    if (state.message) {
      console.log(`  Message: ${state.message}`);
    }
  } else {
    console.log('No action suggested - manual input required.');
    console.log(`Current screen: ${state.screen}`);
  }
}

function handleInfoCommand(): void {
  console.log(printSystemInfo());
  
  // Show API key status
  if (!getApiKey()) {
    console.log(printApiKeyInstructions());
  }
}

async function handleAutoCommand(count: number): Promise<void> {
  console.log(`🤖 Auto-play mode: ${count} actions`);
  console.log('   Press Ctrl+C to stop\n');
  
  const toolInfo = getKeySimTool();
  if (!toolInfo.available) {
    console.error(`❌ Key simulation not available.`);
    console.error(`   ${toolInfo.installHint}`);
    process.exit(1);
  }
  
  for (let i = 0; i < count; i++) {
    const state = readGameState();
    
    if (!state) {
      console.log(`[${i + 1}/${count}] Waiting for game state...`);
      await sleep(500);
      continue;
    }
    
    const action = suggestAction(state);
    
    if (action) {
      console.log(`[${i + 1}/${count}] Screen: ${state.screen} → Action: ${action}`);
      await sendKey(action);
    } else {
      console.log(`[${i + 1}/${count}] Screen: ${state.screen} → No action`);
    }
    
    await sleep(200); // Small delay between actions
  }
  
  console.log('\n✅ Auto-play complete!');
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ============================================================
// Main Entry Point
// ============================================================

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    printUsage();
    process.exit(0);
  }
  
  const command = args[0].toLowerCase();
  
  switch (command) {
    case 'key':
      if (!args[1]) {
        console.error('❌ Missing key name. Usage: npm run agent key <keyname>');
        process.exit(1);
      }
      await handleKeyCommand(args[1]);
      break;
      
    case 'read':
      handleReadCommand();
      break;
      
    case 'decide':
      handleDecideCommand();
      break;
      
    case 'info':
      handleInfoCommand();
      break;
      
    case 'auto':
      const count = args[1] ? parseInt(args[1], 10) : 10;
      if (isNaN(count) || count < 1) {
        console.error('❌ Invalid count. Usage: npm run agent auto [count]');
        process.exit(1);
      }
      await handleAutoCommand(count);
      break;
      
    case 'help':
    case '--help':
    case '-h':
      printUsage();
      break;
      
    default:
      console.error(`❌ Unknown command: ${command}`);
      printUsage();
      process.exit(1);
  }
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
