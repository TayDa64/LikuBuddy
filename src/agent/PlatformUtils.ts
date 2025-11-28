/**
 * PlatformUtils - Cross-platform OS detection and path utilities
 * 
 * Provides a unified API for platform-specific operations without
 * requiring native dependencies like nut.js.
 */

import * as os from 'os';
import * as path from 'path';
import { execSync, spawn, SpawnOptions } from 'child_process';
import * as fs from 'fs';

// ============================================================
// Platform Detection
// ============================================================

export type Platform = 'windows' | 'macos' | 'linux';
export type Shell = 'powershell' | 'pwsh' | 'bash' | 'zsh' | 'sh';

/**
 * Detect the current operating system
 */
export function getPlatform(): Platform {
  const platform = os.platform();
  switch (platform) {
    case 'win32':
      return 'windows';
    case 'darwin':
      return 'macos';
    default:
      return 'linux';
  }
}

/**
 * Detect the current shell environment
 */
export function getShell(): Shell {
  const platform = getPlatform();
  
  if (platform === 'windows') {
    // Check if running in PowerShell Core (pwsh) or Windows PowerShell
    const psVersion = process.env.PSVersionTable;
    const shell = process.env.ComSpec?.toLowerCase() || '';
    
    // If SHELL env is set (e.g., Git Bash), use it
    if (process.env.SHELL?.includes('bash')) {
      return 'bash';
    }
    
    // Default to powershell on Windows
    return 'powershell';
  }
  
  // Unix-like systems
  const shell = process.env.SHELL || '/bin/sh';
  
  if (shell.includes('zsh')) return 'zsh';
  if (shell.includes('bash')) return 'bash';
  return 'sh';
}

/**
 * Check if a command exists on the system
 */
export function commandExists(command: string): boolean {
  try {
    const platform = getPlatform();
    if (platform === 'windows') {
      execSync(`where ${command}`, { stdio: 'ignore' });
    } else {
      execSync(`which ${command}`, { stdio: 'ignore' });
    }
    return true;
  } catch {
    return false;
  }
}

// ============================================================
// Path Utilities
// ============================================================

/**
 * Get the LikuBuddy data directory path
 * Cross-platform: ~/.gemini-liku on all systems
 */
export function getDataDir(): string {
  return path.join(os.homedir(), '.gemini-liku');
}

/**
 * Get the database file path
 */
export function getDbPath(): string {
  return path.join(getDataDir(), 'snake.db');
}

/**
 * Get the state file path (for AI agent communication)
 */
export function getStatePath(): string {
  // State file is in the current working directory for agent access
  return path.join(process.cwd(), 'likubuddy-state.txt');
}

/**
 * Ensure a directory exists, creating it if necessary
 */
export function ensureDir(dirPath: string): void {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

// ============================================================
// Environment Variable Helpers
// ============================================================

/**
 * Get the Gemini API key from environment
 * Checks multiple possible variable names
 */
export function getApiKey(): string | undefined {
  return process.env.GEMINI_API_KEY || 
         process.env.GOOGLE_AI_API_KEY ||
         process.env.GOOGLE_API_KEY;
}

/**
 * Print platform-specific instructions for setting API key
 */
export function printApiKeyInstructions(): string {
  const platform = getPlatform();
  const shell = getShell();
  
  let instructions = '\n📋 Set your Gemini API key:\n\n';
  
  if (platform === 'windows') {
    instructions += '  PowerShell:\n';
    instructions += '    $env:GEMINI_API_KEY="your-api-key-here"\n\n';
    instructions += '  Command Prompt:\n';
    instructions += '    set GEMINI_API_KEY=your-api-key-here\n\n';
    instructions += '  Permanent (System):\n';
    instructions += '    [System.Environment]::SetEnvironmentVariable("GEMINI_API_KEY", "your-key", "User")\n';
  } else {
    instructions += `  ${shell}:\n`;
    instructions += '    export GEMINI_API_KEY="your-api-key-here"\n\n';
    instructions += '  Permanent (~/.bashrc or ~/.zshrc):\n';
    instructions += '    echo \'export GEMINI_API_KEY="your-key"\' >> ~/.bashrc\n';
  }
  
  instructions += '\n  Get your free API key: https://ai.google.dev/\n';
  
  return instructions;
}

// ============================================================
// Process/Window Utilities
// ============================================================

/**
 * Find LikuBuddy window/process
 * Returns process ID if found, null otherwise
 */
export async function findLikuProcess(): Promise<number | null> {
  const platform = getPlatform();
  
  try {
    if (platform === 'windows') {
      // Use PowerShell to find node process with LikuBuddy
      const output = execSync(
        'powershell -Command "Get-Process node -ErrorAction SilentlyContinue | ' +
        'Where-Object { $_.MainWindowTitle -like \'*Liku*\' -or $_.MainWindowTitle -like \'*node*\' } | ' +
        'Select-Object -First 1 -ExpandProperty Id"',
        { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] }
      ).trim();
      
      return output ? parseInt(output, 10) : null;
    } else if (platform === 'macos') {
      // Use pgrep on macOS
      const output = execSync('pgrep -f "node.*liku" 2>/dev/null || true', { encoding: 'utf8' }).trim();
      const pids = output.split('\n').filter(Boolean);
      return pids.length > 0 ? parseInt(pids[0], 10) : null;
    } else {
      // Linux: use pgrep
      const output = execSync('pgrep -f "node.*liku" 2>/dev/null || true', { encoding: 'utf8' }).trim();
      const pids = output.split('\n').filter(Boolean);
      return pids.length > 0 ? parseInt(pids[0], 10) : null;
    }
  } catch {
    return null;
  }
}

/**
 * Get platform-specific key simulation tool availability
 */
export function getKeySimTool(): { available: boolean; tool: string; installHint: string } {
  const platform = getPlatform();
  
  if (platform === 'windows') {
    // PowerShell + WScript.Shell is always available on Windows
    return {
      available: true,
      tool: 'WScript.Shell (via PowerShell)',
      installHint: 'Built-in - no installation needed'
    };
  } else if (platform === 'macos') {
    // osascript is always available on macOS
    return {
      available: true,
      tool: 'osascript (AppleScript)',
      installHint: 'Built-in - no installation needed'
    };
  } else {
    // Linux: check for xdotool
    if (commandExists('xdotool')) {
      return {
        available: true,
        tool: 'xdotool',
        installHint: 'Already installed'
      };
    }
    return {
      available: false,
      tool: 'xdotool',
      installHint: 'Install with: sudo apt install xdotool (Debian/Ubuntu) or sudo dnf install xdotool (Fedora)'
    };
  }
}

// ============================================================
// System Info
// ============================================================

export interface SystemInfo {
  platform: Platform;
  shell: Shell;
  nodeVersion: string;
  arch: string;
  homeDir: string;
  dataDir: string;
  keySimTool: ReturnType<typeof getKeySimTool>;
  apiKeySet: boolean;
}

/**
 * Get comprehensive system information
 */
export function getSystemInfo(): SystemInfo {
  return {
    platform: getPlatform(),
    shell: getShell(),
    nodeVersion: process.version,
    arch: os.arch(),
    homeDir: os.homedir(),
    dataDir: getDataDir(),
    keySimTool: getKeySimTool(),
    apiKeySet: !!getApiKey()
  };
}

/**
 * Print system info in a formatted way
 */
export function printSystemInfo(): string {
  const info = getSystemInfo();
  
  return `
╭─────────────────────────────────────────╮
│       LikuBuddy System Info             │
╰─────────────────────────────────────────╯
  Platform:     ${info.platform}
  Shell:        ${info.shell}
  Node.js:      ${info.nodeVersion}
  Architecture: ${info.arch}
  Home:         ${info.homeDir}
  Data Dir:     ${info.dataDir}
  Key Sim Tool: ${info.keySimTool.tool}
  Tool Ready:   ${info.keySimTool.available ? '✅ Yes' : '❌ No - ' + info.keySimTool.installHint}
  API Key:      ${info.apiKeySet ? '✅ Set' : '❌ Not set'}
`;
}
