# Liku_AI - WebSocket Real-Time AI Control Implementation Plan

## Overview

**Fork Name**: `Liku_AI`
**Approach**: Event-driven WebSocket architecture for real-time AI game control
**Target Latency**: < 50ms round-trip for AI decisions

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      LikuBuddy Game                              │
│  ┌─────────────┐    ┌──────────────────┐    ┌───────────────┐  │
│  │  Game Loop  │───▶│  State Emitter   │───▶│  WS Server    │  │
│  │  (60 FPS)   │    │  (Every Frame)   │    │  (Port 3847)  │  │
│  └─────────────┘    └──────────────────┘    └───────┬───────┘  │
│         ▲                                           │          │
│         │           ┌──────────────────┐            │          │
│         └───────────│  Command Handler │◀───────────┘          │
│                     │  (Async Queue)   │                       │
│                     └──────────────────┘                       │
└─────────────────────────────────────────────────────────────────┘
                              │
                    WebSocket Connection
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      AI Agent Client                             │
│  ┌─────────────┐    ┌──────────────────┐    ┌───────────────┐  │
│  │  State RX   │───▶│  Decision Engine │───▶│  Command TX   │  │
│  │  (< 10ms)   │    │  (Heuristics)    │    │  (Immediate)  │  │
│  └─────────────┘    └──────────────────┘    └───────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

## Protocol Design

### WebSocket Message Types

```typescript
// Server → Client (Game State)
interface GameStateMessage {
  type: 'state';
  timestamp: number;
  screen: string;
  game: {
    name: string;
    state: 'START' | 'PLAYING' | 'COUNTDOWN' | 'GAME_OVER';
    score: number;
  };
  // Game-specific data
  dino?: {
    y: number;
    velocity: number;
    isJumping: boolean;
  };
  obstacles?: Array<{
    x: number;
    y: number;
    type: string;
    distanceToDino: number;
  }>;
  snake?: {
    head: { x: number; y: number };
    direction: string;
    food: { x: number; y: number };
    body: Array<{ x: number; y: number }>;
  };
  tictactoe?: {
    board: string[];  // 9 cells: 'X', 'O', or ''
    turn: 'X' | 'O';
    cursor: number;
  };
  // AI hints
  suggestedAction?: string;
  dangerLevel?: 'safe' | 'warning' | 'critical';
}

// Client → Server (Commands)
interface CommandMessage {
  type: 'command';
  action: 'up' | 'down' | 'left' | 'right' | 'enter' | 'space' | 'escape' | string;
  timestamp: number;
}

// Server → Client (Acknowledgment)
interface AckMessage {
  type: 'ack';
  commandTimestamp: number;
  processed: boolean;
  latency: number;
}
```

## Implementation Phases

### Phase 1: WebSocket Server Infrastructure
**Files to Create/Modify:**

#### 1.1 Create `src/server/WebSocketServer.ts`
```typescript
// WebSocket server that runs alongside the game
// - Broadcasts game state on every frame
// - Receives commands and injects into game input queue
// - Handles multiple AI client connections
// - Provides latency metrics
```

#### 1.2 Create `src/server/StateEmitter.ts`
```typescript
// Replaces/augments GameStateLogger
// - Emits structured JSON instead of file writes
// - Batches updates for efficiency
// - Calculates AI hints (e.g., "JUMP NOW" for Dino)
```

#### 1.3 Modify `src/index.tsx`
- Add `--ws-port` CLI flag
- Start WebSocket server when AI mode enabled
- Inject command queue from WebSocket into game

### Phase 2: Game Integration

#### 2.1 Modify `src/ui/games/DinoRun.tsx`
- Emit state via StateEmitter every game tick
- Include obstacle distances, dino physics
- Add "danger zone" calculation

#### 2.2 Modify `src/ui/games/Snake.tsx`
- Emit snake position, food location, danger cells
- Calculate path suggestions

#### 2.3 Modify `src/ui/games/TicTacToe.tsx`
- Emit board state, turn, cursor position
- Include win probability hints

### Phase 3: AI Client SDK

#### 3.1 Create `src/agent/WebSocketClient.ts`
```typescript
// Client library for AI agents
// - Connects to game WebSocket
// - Provides async/await API for state
// - Handles reconnection
// - Measures latency
```

#### 3.2 Create `src/agent/DinoAI.ts`
```typescript
// Dino Run AI player
// - Receives state stream
// - Decides jump timing based on obstacle distance
// - Sends commands with minimal latency
```

#### 3.3 Create `scripts/ws-ai-player.ts`
```typescript
// Standalone AI player script
// Usage: npx ts-node scripts/ws-ai-player.ts --game dino
```

### Phase 4: CLI Integration

#### 4.1 Update `src/agent/cli.ts`
- Add `ws-connect` command
- Add `ws-play <game>` command for auto-play
- Add `ws-status` for connection info

#### 4.2 Update `package.json`
```json
{
  "scripts": {
    "start:ai": "node dist/index.js --ai --ws-port 3847",
    "ai:connect": "node dist/agent/cli.js ws-connect",
    "ai:play:dino": "node dist/agent/cli.js ws-play dino"
  }
}
```

## TODO Checklist

### Infrastructure
- [ ] Install `ws` package for WebSocket server
- [ ] Create WebSocketServer class with broadcast capability
- [ ] Create StateEmitter interface/class
- [ ] Add `--ws-port` CLI flag parsing
- [ ] Create connection manager for multiple clients

### State Broadcasting
- [ ] Define TypeScript interfaces for all game states
- [ ] Implement DinoRun state emission (every tick)
- [ ] Implement Snake state emission
- [ ] Implement TicTacToe state emission
- [ ] Add timestamp and latency tracking

### Command Handling
- [ ] Create command injection queue
- [ ] Map WebSocket commands to game inputs
- [ ] Add command acknowledgment messages
- [ ] Implement rate limiting (prevent spam)

### AI Client
- [ ] Create WebSocketClient wrapper class
- [ ] Implement auto-reconnection
- [ ] Create DinoAI decision engine
- [ ] Create SnakeAI decision engine
- [ ] Add latency measurement and logging

### Testing & Docs
- [ ] Create integration tests for WebSocket flow
- [ ] Document protocol in README
- [ ] Add example AI client in Python
- [ ] Create performance benchmarks

## Dependencies to Add

```json
{
  "dependencies": {
    "ws": "^8.14.0"
  },
  "devDependencies": {
    "@types/ws": "^8.5.0"
  }
}
```

## Success Metrics

| Metric | Target |
|--------|--------|
| State broadcast latency | < 5ms |
| Command processing latency | < 10ms |
| Round-trip decision latency | < 50ms |
| Dino Run AI survival | > 500 score |
| Snake AI survival | > 20 score |

## Risk Mitigation

1. **Memory Leaks**: Use WeakMap for client tracking, proper cleanup on disconnect
2. **Performance Impact**: Throttle broadcasts if needed (max 60 FPS)
3. **Security**: Bind to localhost only by default, add auth token option
4. **Compatibility**: Fallback to file-based state if WS fails

## File Structure After Implementation

```
src/
├── server/
│   ├── WebSocketServer.ts    # NEW: WS server class
│   ├── StateEmitter.ts       # NEW: State broadcasting
│   └── CommandQueue.ts       # NEW: Command injection
├── agent/
│   ├── WebSocketClient.ts    # NEW: Client SDK
│   ├── DinoAI.ts             # NEW: Dino game AI
│   ├── SnakeAI.ts            # NEW: Snake game AI
│   ├── TicTacToeAI.ts        # NEW: TTT game AI
│   └── cli.ts                # MODIFY: Add WS commands
├── core/
│   └── GameStateLogger.ts    # MODIFY: Integrate with emitter
└── ui/games/
    ├── DinoRun.tsx           # MODIFY: Add state emission
    ├── Snake.tsx             # MODIFY: Add state emission
    └── TicTacToe.tsx         # MODIFY: Add state emission
```
