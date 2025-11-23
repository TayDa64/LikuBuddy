# Liku Slash Command Implementation Guide

**Version:** 1.0  
**Last Updated:** 2025-11-22  
**Purpose:** Comprehensive guide for implementing `/liku` slash commands as an extension within the LikuBuddy UI without losing existing functionality.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Core Command Structure](#core-command-structure)
3. [Sub-Command Systems](#sub-command-systems)
4. [Service Layer](#service-layer)
5. [UI Components](#ui-components)
6. [Dialog Integration](#dialog-integration)
7. [Extension Implementation Patterns](#extension-implementation-patterns)
8. [Testing Strategies](#testing-strategies)
9. [Migration Guidelines](#migration-guidelines)
10. [API Reference](#api-reference)

---

## Architecture Overview

### System Context

The `/liku` command system is a comprehensive multi-agent terminal orchestration and live streaming platform integrated into the Gemini CLI. It consists of:

- **Command Layer**: Slash command handlers and routing (`packages/cli/src/ui/commands/likuCommand.ts`)
- **Service Layer**: Singleton services for broadcasting, device management, and supervisor orchestration
- **UI Layer**: React/Ink components for terminal UI rendering
- **Integration Layer**: Dialog system integration with main CLI

### Key Design Principles

1. **Modularity**: Each sub-command is self-contained with clear boundaries
2. **Service-Oriented**: Singleton services manage state and business logic
3. **React Component Model**: UI components follow React patterns using Ink framework
4. **Event-Driven**: Services communicate via EventEmitter pattern
5. **Backward Compatibility**: Extensions must preserve existing functionality

### Technology Stack

- **TypeScript**: Static typing for all code
- **React + Ink**: Terminal UI framework
- **Node.js**: Runtime environment with platform-specific APIs
- **FFmpeg**: Media capture and streaming engine
- **EventEmitter**: Service-to-UI communication

---

## Core Command Structure

### Command Registration

Location: `packages/cli/src/ui/commands/likuCommand.ts`

```typescript
export const likuCommand: SlashCommand = {
  name: 'liku',
  description: 'Liku commands',
  kind: CommandKind.BUILT_IN,
  subCommands: [
    broadcastCommand,
    searchSubCommand,
    tayCommand,
    buddyCommand,
    supervisorCommand,
    agentCommand,
    dashboardCommand,
  ],
  action: async (context: CommandContext, args: string): Promise<SlashCommandActionReturn> => {
    // Command routing logic
  },
};
```

### Command Interface

```typescript
interface SlashCommand {
  name: string;
  altNames?: string[];
  description: string;
  hidden?: boolean;
  kind: CommandKind;
  extensionName?: string;
  action?: (context: CommandContext, args: string) => 
    void | SlashCommandActionReturn | Promise<void | SlashCommandActionReturn>;
  completion?: (context: CommandContext, partialArg: string) => Promise<string[]>;
  subCommands?: SlashCommand[];
}
```

### Action Return Types

Commands can return various action types:

1. **MessageActionReturn**: Display a message
   ```typescript
   { type: 'message', content: string, messageType: 'info' | 'error' }
   ```

2. **OpenDialogActionReturn**: Open a dialog/UI
   ```typescript
   { type: 'dialog', dialog: 'liku', mode?: 'stream' | 'preview' | 'analyze' }
   ```

3. **SubmitPromptActionReturn**: Submit to AI model
   ```typescript
   { type: 'submit_prompt', content: PartListUnion }
   ```

4. **ToolActionReturn**: Execute a tool
   ```typescript
   { type: 'tool', toolName: string, toolArgs: Record<string, unknown> }
   ```

---

## Sub-Command Systems

### 1. Broadcast Command (`/liku broadcast`)

**Purpose**: Live streaming to platforms like YouTube with device capture

**Location**: `packages/cli/src/ui/commands/likuCommand.ts` (lines 26-89)

#### Sub-Commands

##### `/liku broadcast stream`
- Opens LikuTUI in stream mode
- Configures video/audio devices, RTMP settings
- Starts FFmpeg streaming process

##### `/liku broadcast preview`
- Opens LikuTUI in preview mode
- Tests device capture before streaming
- No actual streaming

##### `/liku broadcast analyze`
- Opens LikuTUI in analyze mode
- AI-assisted content analysis
- Performance monitoring

#### Implementation Pattern

```typescript
const streamCommand: SlashCommand = {
  name: 'stream',
  description: 'Start streaming to platforms like YouTube.',
  kind: CommandKind.BUILT_IN,
  action: async (context: CommandContext, args: string): Promise<SlashCommandActionReturn> => {
    const parts = args.trim().split(' ');
    const broadcastMode = (parts[0] || 'stream') as 'stream' | 'preview' | 'analyze';
    
    return {
      type: 'dialog',
      dialog: 'liku',
      mode: broadcastMode,
    };
  },
};
```

#### Dialog Integration

The broadcast commands open the LikuTUI via the DialogManager:

1. Command returns `{ type: 'dialog', dialog: 'liku', mode: 'stream' }`
2. `slashCommandProcessor` calls `actions.openLikuDialog(mode)`
3. `DialogManager` renders `<LikuTUI mode={mode} />` wrapped in `ServiceProvider`
4. User interacts with full-screen TUI until exiting

---

### 2. Search Command (`/liku search`)

**Purpose**: Search functionality (placeholder for future implementation)

**Location**: `packages/cli/src/ui/commands/likuCommand.ts` (lines 91-106)

#### Implementation

```typescript
const searchSubCommand: SlashCommand = {
  name: 'search',
  description: 'Search for a term.',
  kind: CommandKind.BUILT_IN,
  action: async (context: CommandContext, args: string): Promise<MessageActionReturn> => {
    await runLikuSearch(args);
    return {
      type: 'message',
      content: 'Liku search command finished.',
      messageType: 'info',
    };
  },
};
```

#### Current Implementation

- Calls `runLikuSearch()` from `packages/cli/src/features/liku/likuRunner.ts`
- Currently logs search args to console
- Placeholder for future search features

---

### 3. Tay Command (`/liku tay`)

**Purpose**: Multi-agent terminal orchestration system

**Location**: 
- Command: `packages/cli/src/ui/commands/likuCommand.ts` (lines 112-302)
- Handlers: `packages/cli/src/commands/liku/tay/handlers.ts`
- Tools: `packages/cli/src/features/liku/tay/tools/`

#### Sub-Commands

##### `/liku tay spawn [--cwd <path>] [--shell <shell>]`
- Spawns new worker terminal in separate window
- Creates IPC connection for task dispatch
- Returns terminal ID for future reference

**Handler**: `handleSpawn()` in `handlers.ts`

```typescript
export async function handleSpawn(args: {
  cwd?: string;
  shell?: string;
}): Promise<void> {
  const result = await liku_tay_spawn({
    cwd: args.cwd,
    shell: args.shell,
  });
  
  console.log(chalk.green(`✓ Worker terminal spawned: ${result.terminalId}`));
  console.log(chalk.gray(`  IPC Path: ${result.ipcPath}`));
  console.log(chalk.gray(`  Status: ${result.status}`));
}
```

##### `/liku tay dispatch --id <terminal-id> --task "<command>"`
- Dispatches command to specific worker terminal
- Executes task asynchronously
- Returns task ID

**Handler**: `handleDispatch()` in `handlers.ts`

##### `/liku tay list [--status <status>]`
- Lists all active worker terminals
- Shows status, PID, current task
- Formatted table output

**Handler**: `handleList()` in `handlers.ts`

##### `/liku tay terminate --id <terminal-id> [--force]`
- Terminates worker terminal
- Graceful (SIGTERM) or forced (SIGKILL)
- Closes terminal window

**Handler**: `handleTerminate()` in `handlers.ts`

#### Architecture

```
┌─────────────────────────────────────────┐
│         Main CLI Process                │
│  ┌───────────────────────────────────┐  │
│  │  Liku Tay Command Handler         │  │
│  │  (likuCommand.ts)                 │  │
│  └───────────────┬───────────────────┘  │
│                  │                       │
│                  ▼                       │
│  ┌───────────────────────────────────┐  │
│  │  Command Handlers                 │  │
│  │  (handlers.ts)                    │  │
│  └───────────────┬───────────────────┘  │
│                  │                       │
│                  ▼                       │
│  ┌───────────────────────────────────┐  │
│  │  Tay Tools (MCP-based)            │  │
│  │  - liku_tay_spawn                 │  │
│  │  - liku_tay_dispatch              │  │
│  │  - liku_tay_list                  │  │
│  │  - liku_tay_terminate             │  │
│  └───────────────┬───────────────────┘  │
└──────────────────┼───────────────────────┘
                   │ IPC
                   ▼
       ┌───────────────────────┐
       │  Worker Terminals     │
       │  (Separate Processes) │
       └───────────────────────┘
```

---

### 4. Buddy Command (`/liku buddy`)

**Purpose**: Interact with LikuBuddy virtual companion

**Location**: `packages/cli/src/ui/commands/likuCommand.ts` (lines 308-410)

#### Sub-Commands

##### `/liku buddy feed`
- Feeds LikuBuddy to reduce hunger
- Uses BuddyActionService to execute action

##### `/liku buddy play`
- Play with LikuBuddy
- Uses energy, increases hunger

##### `/liku buddy rest`
- Let LikuBuddy rest
- Restores energy

#### Implementation Pattern

```typescript
const buddyFeedCommand: SlashCommand = {
  name: 'feed',
  description: 'Feed LikuBuddy to reduce hunger',
  kind: CommandKind.BUILT_IN,
  action: async (): Promise<MessageActionReturn> => {
    const success = executeBuddyAction('feed');
    if (success) {
      return {
        type: 'message',
        content: '🍖 Fed LikuBuddy! Hunger decreased.',
        messageType: 'info',
      };
    }
    return {
      type: 'message',
      content: 'LikuBuddy is not available right now.',
      messageType: 'error',
    };
  },
};
```

#### Service Integration

Location: `packages/cli/src/ui/commands/buddyActions.ts`

```typescript
class BuddyActionService {
  private buddyFeed: (() => void) | null = null;
  private buddyPlay: (() => void) | null = null;
  private buddyRest: (() => void) | null = null;
  private registered: boolean = false;

  registerHandlers(handlers: {
    feed: () => void;
    play: () => void;
    rest: () => void;
  }) {
    this.buddyFeed = handlers.feed;
    this.buddyPlay = handlers.play;
    this.buddyRest = handlers.rest;
    this.registered = true;
  }

  executeAction(action: BuddyAction): boolean {
    switch (action) {
      case 'feed':
        if (this.buddyFeed) {
          this.buddyFeed();
          return true;
        }
        break;
      // ... other actions
    }
    return false;
  }
}

export const executeBuddyAction = (action: BuddyAction): boolean =>
  buddyActionService.executeAction(action);
```

**Extension Point**: Register buddy handlers via `registerBuddyHandlers()` before executing buddy commands.

---

### 5. Supervisor Command (`/liku supervisor`)

**Purpose**: Control the God Mode debug supervisor system

**Location**: `packages/cli/src/features/liku/debug-supervisor/supervisorCommand.ts`

#### Sub-Commands

##### `/liku supervisor start [args]`
- Starts supervisor service singleton
- Loads saved state if available
- Provides AI with context for orchestration
- Returns `submit_prompt` to engage AI supervisor

**Key Features**:
- Persistence: Loads saved agents/tasks from disk
- Dashboard checklist: Platform-specific spawn commands
- AI Guidance: Comprehensive prompt for supervisor AI

##### `/liku supervisor status`
- Shows supervisor dashboard
- Statistics: agents, tasks, terminals, uptime
- Active agents list with status icons

##### `/liku supervisor stop`
- Stops supervisor and all agents
- Graceful shutdown

#### Architecture

```typescript
const startCommand: SlashCommand = {
  name: 'start',
  description: 'Start the supervisor service',
  kind: CommandKind.BUILT_IN,
  action: async (context: CommandContext, rawArgs: string): Promise<SlashCommandActionReturn> => {
    const supervisor = SupervisorService.getInstance();
    const stats = supervisor.getStats();
    const activeAgents = supervisor.getAgentStatus();
    
    const persistence = new SupervisorPersistence();
    const persisted = await persistence.load();
    
    // Build comprehensive prompt for AI supervisor
    const prompt = [
      'You are the God Mode Supervisor AI for Gemini CLI.',
      'Command: /liku supervisor start just ran...',
      // ... detailed guidance
    ].join('\n\n');
    
    return {
      type: 'submit_prompt',
      content: prompt,
    };
  },
};
```

#### Service Integration

**SupervisorService** (Singleton):
- Manages agent lifecycle
- Task queue and dispatch
- Terminal tracking
- Statistics and monitoring

**SupervisorPersistence**:
- Save/load supervisor state to disk
- Agents, tasks, memory patterns
- Location: `~/.gemini-cli/supervisor-state.json`

---

### 6. Agent Command (`/liku agent`)

**Purpose**: Spawn and control individual agents

**Location**: `packages/cli/src/features/liku/debug-supervisor/agentCommand.ts`

#### Sub-Commands

##### `/liku agent spawn <type>`
- Spawns agent: `build`, `verify`, or `test`
- Opens in new terminal window (Windows only currently)
- Auto-registers with supervisor
- Returns AI prompt for coordination

**Agent Types**:
- `build`: Building and compilation tasks
- `verify`: Verification and validation tasks
- `test`: Testing and quality assurance tasks

##### `/liku agent list`
- Lists all active agents
- Status icons: ⚪ idle, 🟢 working, 🟡 paused, 🔴 error
- Shows type, status, terminal ID, task stats

##### `/liku agent pause <id>`
- Pauses specific agent
- Stops task processing

##### `/liku agent resume <id>`
- Resumes paused agent
- Continues task processing

##### `/liku agent kill <id>`
- Terminates agent
- Forceful shutdown

---

### 7. Dashboard Command (`/liku dashboard`)

**Purpose**: Interactive supervisor dashboard with persistence

**Location**: `packages/cli/src/features/liku/debug-supervisor/dashboardCommand.ts`

#### Sub-Commands

##### `/liku dashboard watch` (or just `/liku dashboard`)
- Opens interactive dashboard in new terminal window
- Real-time monitoring of agents and tasks
- Windows-only currently

##### `/liku dashboard save`
- Saves current supervisor state to disk
- Persists agents, tasks, memory patterns
- Location: `~/.gemini-cli/supervisor-state.json`

##### `/liku dashboard restore`
- Restores saved supervisor state
- Shows what would be restored
- State restoration coming soon (TODO)

##### `/liku dashboard clear`
- Clears saved supervisor state
- Removes persistence file

#### Persistence Format

```typescript
interface PersistedSupervisor {
  version: number;
  savedAt: string;  // ISO timestamp
  config: SupervisorConfig;
  agents: PersistedAgent[];
  tasks: Task[];
  sharedContext: Record<string, unknown>;
  memory: {
    patterns: LearnedPattern[];
    taskPerformance: Record<string, unknown>;
  };
}
```

---

## Service Layer

### 1. BroadcastService

**Purpose**: FFmpeg-based live streaming management

**Location**: `packages/cli/src/services/BroadcastService.ts`

#### Key Features

- Singleton pattern for global state management
- EventEmitter for state/stats communication
- Platform-specific FFmpeg command generation
- Connection retry logic
- Stream state management

#### State Machine

```typescript
export enum BroadcastState {
  IDLE,                  // Application started, no action
  ENUMERATING_DEVICES,   // Fetching available devices
  CONFIGURING,           // User in configuration wizard
  CONNECTING,            // FFmpeg connecting to RTMP server
  STREAMING,             // Stream is live
  STOPPING,              // User requested stop
  STOPPED,               // Gracefully stopped
  ERROR,                 // Fatal error occurred
}
```

#### Public API

```typescript
class BroadcastService extends EventEmitter {
  static getInstance(): BroadcastService;
  getState(): BroadcastState;
  async startStream(config: BroadcastConfig): Promise<void>;
  async stopStream(): Promise<void>;
  getStats(): StreamStats | null;
  
  // Events
  on(event: 'stateChange', handler: (state: BroadcastState) => void): this;
  on(event: 'statsUpdate', handler: (stats: StreamStats) => void): this;
  on(event: 'log', handler: (message: string) => void): this;
  on(event: 'error', handler: (error: string) => void): this;
}
```

---

### 2. DeviceManager

**Purpose**: Cross-platform media device enumeration

**Location**: `packages/cli/src/services/DeviceManager.ts`

#### Platform Support

- **Windows**: DirectShow (dshow), gdigrab, monitor enumeration
- **macOS**: AVFoundation (avfoundation)
- **Linux**: V4L2 (video4linux2), ALSA/PulseAudio

#### API

```typescript
class DeviceManager {
  async getDevices(): Promise<{
    video: Device[];
    audio: Device[];
    windows: Device[];
  }>;
  
  async getDevicesCached(opts?: {
    maxAgeMs?: number;
    force?: boolean;
  }): Promise<{
    video: Device[];
    audio: Device[];
    windows: Device[];
  }>;
}
```

---

### 3. LikuServices

**Purpose**: Service aggregation and initialization

**Location**: `packages/cli/src/features/liku/LikuServices.ts`

```typescript
export class LikuServices {
  private static instance: LikuServices;
  private broadcastService: BroadcastService;
  private deviceManager: DeviceManager;

  private constructor() {
    this.broadcastService = BroadcastService.getInstance();
    this.deviceManager = new DeviceManager();
  }

  static getInstance(): LikuServices;
  getBroadcastService(): BroadcastService;
  getDeviceManager(): DeviceManager;
}
```

---

### 4. SupervisorService

**Purpose**: Multi-agent orchestration and task management

**Location**: `packages/cli/src/services/SupervisorService.ts`

#### API

```typescript
class SupervisorService {
  static getInstance(): SupervisorService;
  getAgentStatus(): AgentStatus[];
  async pauseAgent(agentId: string): Promise<void>;
  async resumeAgent(agentId: string): Promise<void>;
  async killAgent(agentId: string): Promise<void>;
  getTasks(): Task[];
  getStats(): SupervisorStats;
  getMemoryStats(): MemoryStats;
  getSharedContext(): Record<string, unknown>;
  getTerminalTracker(): TerminalTracker;
  async shutdown(): Promise<void>;
}
```

---

## UI Components

### Component Architecture

All UI components use React + Ink for terminal rendering:

```
packages/cli/src/features/liku/ui/
├── LikuTUI.tsx              # Main TUI component
├── StreamConfigurator.tsx   # Stream configuration UI
├── LiveDashboard.tsx        # Live streaming dashboard
├── PreviewCapture.tsx       # Device preview mode
├── AnalyzeCapture.tsx       # Content analysis mode
├── ServiceContext.tsx       # Service provider context
├── LogPanel.tsx             # Log display panel
├── Status.tsx               # Status indicator
├── StatusBar.tsx            # Status bar component
└── components/
    ├── SettingsOverlay.tsx  # Settings overlay
    └── StatusBar.tsx        # Reusable status bar
```

### LikuTUI

**Purpose**: Main TUI orchestrator for all Liku modes

**Location**: `packages/cli/src/features/liku/ui/LikuTUI.tsx`

#### Props

```typescript
interface LikuTUIProps {
  mode?: 'stream' | 'preview' | 'analyze';
  onGracefulExit?: (reason?: string) => void;
  availableHeight?: number;
}
```

#### Key Bindings

- **ESC**: Exit dialog or switch to stream mode
- **Ctrl+C**: Force quit
- **Q**: Context-aware quit
- **S/Ctrl+S**: Scan/refresh devices
- **L**: Toggle log panel
- **P**: Switch to preview mode
- **A**: Switch to analyze mode
- **Tab/Shift+Tab**: Navigate fields (in configurator)
- **↑↓**: Select items in dropdown fields
- **Enter/Space**: Activate focused button

---

## Dialog Integration

### How Dialogs Work in Gemini CLI

Dialogs are full-screen UI overlays that replace the main chat interface temporarily.

#### Flow

1. **Command Execution**: Slash command returns `{ type: 'dialog', dialog: 'liku', mode: 'stream' }`
2. **Action Processing**: `slashCommandProcessor` detects dialog action
3. **State Update**: Calls `actions.openLikuDialog(mode)`
4. **UI State Change**: `UIState.isLikuDialogOpen = true`, `UIState.likuDialogMode = mode`
5. **Rendering**: `DialogManager` conditionally renders dialog
6. **Exit**: User exits, `onGracefulExit()` callback closes dialog

### DialogManager Integration

Location: `packages/cli/src/ui/components/DialogManager.tsx`

```typescript
export const DialogManager = () => {
  const uiState = useUIState();
  const uiActions = useUIActions();
  
  if (uiState.isLikuDialogOpen) {
    const likuServices = LikuServices.getInstance();
    const likuServicesProps = useMemo(
      () => ({
        broadcastService: likuServices.getBroadcastService(),
        deviceManager: likuServices.getDeviceManager(),
      }),
      [likuServices],
    );
    
    return (
      <ServiceProvider services={likuServicesProps}>
        <LikuTUI
          mode={uiState.likuDialogMode}
          availableHeight={availableTerminalHeight}
          onGracefulExit={uiActions.closeLikuDialog}
        />
      </ServiceProvider>
    );
  }
  
  // Other dialogs...
}
```

---

## Extension Implementation Patterns

### Pattern 1: Adding New Sub-Commands

To add a new sub-command to `/liku`:

1. **Define Command**:
```typescript
const myNewCommand: SlashCommand = {
  name: 'mynew',
  description: 'My new feature',
  kind: CommandKind.BUILT_IN,
  action: async (context, args) => {
    return {
      type: 'message',
      content: 'Feature executed',
      messageType: 'info',
    };
  },
};
```

2. **Register Command**:
```typescript
const subCommands: SlashCommand[] = [
  // ... existing commands
  myNewCommand,
];
```

3. **Update Help Text**
4. **Write Tests**

### Pattern 2: Creating Dialog-Based Commands

For commands that need full-screen UI:

1. Create UI component
2. Add dialog type to `OpenDialogActionReturn`
3. Register in DialogManager
4. Create command that returns dialog action

### Pattern 3: Service Extension

To add new services:

1. Create service class with singleton pattern
2. Add to LikuServices
3. Update ServiceContext
4. Use in components via `useServices()`

### Pattern 4: Event-Driven Communication

Services use EventEmitter for loose coupling between service layer and UI layer.

---

## Testing Strategies

### Unit Testing Commands

```typescript
import { describe, it, expect } from 'vitest';
import { likuCommand } from './likuCommand.js';
import { createMockCommandContext } from '../../test-utils/mockCommandContext.js';

describe('likuCommand', () => {
  it('returns help when no args provided', async () => {
    const context = createMockCommandContext();
    const result = await likuCommand.action!(context, '');
    expect(result).toEqual({
      type: 'message',
      content: expect.stringContaining('Available /liku subcommands'),
      messageType: 'info',
    });
  });
});
```

### Testing UI Components

```typescript
import { render } from 'ink-testing-library';
import { LikuTUI } from './LikuTUI.js';
import { ServiceProvider } from './ServiceContext.js';

describe('LikuTUI', () => {
  it('renders stream configurator in stream mode', () => {
    const services = {
      broadcastService: BroadcastService.getInstance(),
      deviceManager: new DeviceManager(),
    };
    
    const { lastFrame } = render(
      <ServiceProvider services={services}>
        <LikuTUI mode="stream" />
      </ServiceProvider>
    );
    
    expect(lastFrame()).toContain('Live Streaming Mode');
  });
});
```

---

## Migration Guidelines

### Checklist for Extension Development

✅ **DO**:
- Follow existing command patterns and naming conventions
- Use singleton services for state management
- Leverage React/Ink for UI components
- Emit events from services for state changes
- Implement proper cleanup in `useEffect` hooks
- Add TypeScript types for all interfaces
- Write unit tests for commands
- Document new commands in help text
- Use ServiceProvider for dependency injection
- Handle errors gracefully with user-friendly messages

❌ **DON'T**:
- Modify existing command implementations without careful consideration
- Break backward compatibility of existing commands
- Create new state management patterns (use existing reducers)
- Directly manipulate DOM (use Ink components)
- Use synchronous blocking operations in event loops
- Hardcode platform-specific paths (use platform detection)
- Ignore TypeScript errors
- Skip error handling
- Create memory leaks (always cleanup listeners)
- Override core command names

### Backward Compatibility Considerations

1. **Command Signatures**: Never change existing command signatures
2. **Service APIs**: Maintain existing public APIs, add new methods instead
3. **Event Names**: Don't rename existing events
4. **Config Formats**: Support old config formats alongside new ones
5. **Default Values**: Preserve default behaviors

---

## API Reference

### Command Context

```typescript
interface CommandContext {
  invocation?: {
    raw: string;
    name: string;
    args: string;
  };
  services: {
    config: Config | null;
    settings: LoadedSettings;
    git: GitService | undefined;
    logger: Logger;
  };
  ui: { /* UI management methods */ };
  session: { /* Session data */ };
}
```

### Service APIs

See [Service Layer](#service-layer) section for detailed API documentation.

### File Structure Summary

```
packages/cli/src/
├── ui/commands/
│   ├── likuCommand.ts
│   ├── buddyActions.ts
│   └── types.ts
├── features/liku/
│   ├── LikuServices.ts
│   ├── likuRunner.tsx
│   ├── ui/
│   ├── debug-supervisor/
│   └── tay/
└── services/
    ├── BroadcastService.ts
    ├── DeviceManager.ts
    └── SupervisorService.ts
```

---

## Appendix: Build Commands

```bash
# Build the project
npm run build

# Run tests
npm run test

# Lint
npm run lint

# Type check
npm run typecheck

# Full preflight check
npm run preflight
```

---

## Conclusion

This guide provides comprehensive documentation for the `/liku` slash command system. By following the patterns and guidelines outlined here, you can extend the Liku system with new functionality while preserving all existing features and maintaining code quality.
