# auto_liku - Fast Polling Auto-Player Implementation Plan

## Overview

**Fork Name**: `auto_liku`
**Approach**: Local fast-polling script with direct key simulation
**Target Latency**: < 30ms decision cycle (file read → decide → send key)

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      LikuBuddy Game                              │
│  ┌─────────────┐    ┌──────────────────┐                        │
│  │  Game Loop  │───▶│  State File      │  likubuddy-state.txt   │
│  │  (60 FPS)   │    │  (Write ~16ms)   │                        │
│  └─────────────┘    └────────┬─────────┘                        │
│         ▲                    │                                   │
│         │                    ▼                                   │
│         │           ┌──────────────────┐                        │
│         └───────────│  WScript.Shell   │◀───── SendKeys         │
│                     │  (Key Injection) │                        │
│                     └──────────────────┘                        │
└─────────────────────────────────────────────────────────────────┘
                              ▲
                              │ File Read + SendKeys
                              │
┌─────────────────────────────────────────────────────────────────┐
│                   Auto-Player Script (Local)                     │
│  ┌─────────────┐    ┌──────────────────┐    ┌───────────────┐  │
│  │  File Watch │───▶│  State Parser    │───▶│  Decision     │  │
│  │  (30ms poll)│    │  (Regex/JSON)    │    │  Engine       │  │
│  └─────────────┘    └──────────────────┘    └───────┬───────┘  │
│                                                      │          │
│                     ┌──────────────────┐             │          │
│                     │  Key Sender      │◀────────────┘          │
│                     │  (PowerShell)    │                        │
│                     └──────────────────┘                        │
└─────────────────────────────────────────────────────────────────┘
```

## Key Advantages Over Current Approach

| Current (API-based) | Auto-Player (Local) |
|---------------------|---------------------|
| ~500ms per decision | ~30ms per decision |
| Requires API round-trip | Runs locally |
| Limited by tool calls | Unlimited speed |
| I make decisions | Script makes decisions |

## Implementation Phases

### Phase 1: Core Auto-Player Engine

#### 1.1 Create `scripts/auto-player.ps1` (PowerShell - Windows)
```powershell
# Fast polling auto-player
# - Reads state file every 30ms
# - Parses game-specific data
# - Makes decisions based on heuristics
# - Sends keys via WScript.Shell
```

#### 1.2 Create `scripts/auto-player.sh` (Bash - macOS/Linux)
```bash
# Cross-platform version
# - Uses fswatch or inotifywait for file changes
# - osascript (macOS) or xdotool (Linux) for keys
```

#### 1.3 Create `src/autoplayer/AutoPlayer.ts` (Node.js)
```typescript
// TypeScript version for npm integration
// - Uses chokidar for file watching
// - Configurable game modules
// - Unified cross-platform key sending
```

### Phase 2: Game-Specific Decision Engines

#### 2.1 Create `src/autoplayer/games/DinoEngine.ts`
```typescript
interface DinoDecision {
  shouldJump: boolean;
  confidence: number;
  reason: string;
}

// Decision logic:
// 1. Parse obstacle distance from state file
// 2. If ground obstacle at distance 3-6: JUMP
// 3. If flying obstacle (bat): DON'T jump (duck or wait)
// 4. Otherwise: do nothing
```

#### 2.2 Create `src/autoplayer/games/SnakeEngine.ts`
```typescript
interface SnakeDecision {
  direction: 'up' | 'down' | 'left' | 'right' | null;
  reason: string;
}

// Decision logic:
// 1. Parse snake head position and food position
// 2. Calculate safest path to food
// 3. Avoid walls and self-collision
// 4. Return best direction
```

#### 2.3 Create `src/autoplayer/games/TicTacToeEngine.ts`
```typescript
interface TicTacToeDecision {
  targetPosition: number;  // 0-8
  moves: Array<'up' | 'down' | 'left' | 'right' | 'enter'>;
}

// Decision logic:
// 1. Parse board state
// 2. Use minimax algorithm for optimal move
// 3. Calculate navigation from cursor to target
// 4. Return move sequence
```

### Phase 3: State File Optimization

#### 3.1 Modify `src/core/GameStateLogger.ts`
- Add JSON mode for machine parsing
- Add frame timestamp for freshness detection
- Add structured game-specific data sections

#### 3.2 Create `likubuddy-state.json` (Optional)
```json
{
  "timestamp": 1732847520000,
  "frame": 12345,
  "screen": "Playing DinoRun",
  "game": {
    "name": "DinoRun",
    "state": "PLAYING",
    "score": 150
  },
  "dino": {
    "y": 0,
    "velocity": 0,
    "isJumping": false
  },
  "obstacles": [
    { "x": 35, "y": 0, "type": "CACTUS", "distance": 17 }
  ],
  "action": {
    "suggested": "wait",
    "jumpIn": 12
  }
}
```

### Phase 4: CLI Integration

#### 4.1 Create `src/autoplayer/cli.ts`
```typescript
// Usage: npm run autoplay -- --game dino --speed fast
// Options:
//   --game <name>     Game to play (dino, snake, tictactoe)
//   --speed <level>   Polling speed (slow=100ms, medium=50ms, fast=30ms)
//   --verbose         Show decision logs
//   --dry-run         Parse state but don't send keys
```

#### 4.2 Update `package.json`
```json
{
  "scripts": {
    "autoplay": "node dist/autoplayer/cli.js",
    "autoplay:dino": "node dist/autoplayer/cli.js --game dino",
    "autoplay:snake": "node dist/autoplayer/cli.js --game snake",
    "autoplay:ttt": "node dist/autoplayer/cli.js --game tictactoe"
  }
}
```

## TODO Checklist

### Core Infrastructure
- [ ] Create `src/autoplayer/` directory structure
- [ ] Install `chokidar` for file watching
- [ ] Create base `AutoPlayer` class
- [ ] Create `StateParser` utility
- [ ] Create cross-platform `KeySender` utility

### State File Enhancement
- [ ] Add JSON output mode to GameStateLogger
- [ ] Add frame counter for change detection
- [ ] Add game-specific structured data
- [ ] Optimize write frequency (debounce if needed)

### Dino Run Auto-Player
- [ ] Create DinoEngine decision logic
- [ ] Implement obstacle distance parsing
- [ ] Implement jump timing algorithm
- [ ] Test and tune thresholds
- [ ] Add bat (flying obstacle) handling

### Snake Auto-Player
- [ ] Create SnakeEngine decision logic
- [ ] Implement pathfinding (A* or BFS)
- [ ] Implement collision avoidance
- [ ] Test and tune for survival

### Tic-Tac-Toe Auto-Player
- [ ] Create TicTacToeEngine decision logic
- [ ] Implement minimax with alpha-beta pruning
- [ ] Implement cursor navigation
- [ ] Achieve unbeatable play

### Cross-Platform Scripts
- [ ] Create PowerShell auto-player (`auto-player.ps1`)
- [ ] Create Bash auto-player (`auto-player.sh`)
- [ ] Test on Windows, macOS, Linux
- [ ] Document platform-specific requirements

### Testing & Benchmarks
- [ ] Create benchmark script for latency measurement
- [ ] Test Dino Run AI (target: 500+ score)
- [ ] Test Snake AI (target: 30+ score)
- [ ] Test Tic-Tac-Toe AI (target: never lose)

## Dependencies to Add

```json
{
  "dependencies": {
    "chokidar": "^3.5.3"
  }
}
```

## Dino Run AI Algorithm (Detailed)

```
EVERY 30ms:
  1. Read likubuddy-state.txt
  2. Parse "Next Obstacle: Dist=X" line
  3. Parse "Dino Y: Y" line
  
  IF game_state == "PLAYING":
    IF dino_y == 0 (on ground):
      IF obstacle_distance <= 6 AND obstacle_distance >= 2:
        IF obstacle_type != "BAT":
          SEND_KEY(SPACE)  // JUMP!
        ELSE:
          // BAT - don't jump, wait for it to pass
          DO_NOTHING
      ELSE:
        DO_NOTHING
    ELSE:
      // Already jumping, wait to land
      DO_NOTHING
```

## Snake AI Algorithm (Detailed)

```
EVERY 50ms:
  1. Read state file
  2. Parse snake head (hx, hy), food (fx, fy), body positions
  
  # Calculate safe directions (no wall, no body)
  safe_dirs = []
  FOR dir IN [UP, DOWN, LEFT, RIGHT]:
    next_pos = head + dir
    IF next_pos NOT IN walls AND next_pos NOT IN body:
      safe_dirs.append(dir)
  
  IF len(safe_dirs) == 0:
    # No safe move, we're dead
    RETURN
  
  # Pick direction toward food (if safe)
  dx = fx - hx
  dy = fy - hy
  
  preferred = []
  IF dx < 0 AND LEFT IN safe_dirs: preferred.append(LEFT)
  IF dx > 0 AND RIGHT IN safe_dirs: preferred.append(RIGHT)
  IF dy < 0 AND UP IN safe_dirs: preferred.append(UP)
  IF dy > 0 AND DOWN IN safe_dirs: preferred.append(DOWN)
  
  IF len(preferred) > 0:
    SEND_KEY(preferred[0])
  ELSE:
    SEND_KEY(safe_dirs[0])  # Any safe direction
```

## File Structure After Implementation

```
src/
├── autoplayer/
│   ├── AutoPlayer.ts         # NEW: Main auto-player class
│   ├── StateParser.ts        # NEW: State file parsing
│   ├── KeySender.ts          # NEW: Cross-platform key sending
│   ├── cli.ts                # NEW: CLI entry point
│   └── games/
│       ├── DinoEngine.ts     # NEW: Dino Run AI
│       ├── SnakeEngine.ts    # NEW: Snake AI
│       └── TicTacToeEngine.ts # NEW: Tic-Tac-Toe AI
├── core/
│   └── GameStateLogger.ts    # MODIFY: Add JSON mode
scripts/
├── auto-player.ps1           # NEW: PowerShell version
└── auto-player.sh            # NEW: Bash version
```

## Success Metrics

| Metric | Target |
|--------|--------|
| Polling interval | 30ms |
| Decision time | < 5ms |
| Key send time | < 20ms |
| Total loop time | < 50ms |
| Dino Run score | > 500 |
| Snake score | > 30 |
| Tic-Tac-Toe | Never lose |

## Risk Mitigation

1. **File Read Contention**: Use non-blocking reads, handle partial writes
2. **State Staleness**: Check timestamp/frame counter, skip stale data
3. **Key Spam**: Rate limit key sends (max 1 per 50ms)
4. **CPU Usage**: Use file watching instead of busy polling when possible
5. **Cross-Platform**: Test on all platforms, provide fallbacks

## Comparison: WebSocket vs Fast Polling

| Aspect | Liku_AI (WebSocket) | auto_liku (Fast Polling) |
|--------|---------------------|--------------------------|
| Latency | ~50ms | ~30ms |
| Complexity | Higher | Lower |
| Reliability | Better | Good |
| Remote AI | Yes | No (local only) |
| Setup | Requires WS client | Just run script |
| Best For | Claude/GPT control | Local AI bots |
