import React, { useState, useEffect } from 'react';
import { render, useStdin, useApp, useStdout } from 'ink';
import meow from 'meow';
import GameHub from './ui/LikuTUI.js';

// ============================================================
// Stream Guard - Prevents console.log from corrupting TUI
// Inspired by Gemini CLI's stdout protection (#13600)
// ============================================================
const originalConsoleLog = console.log;
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

let logsBuffer: string[] = [];

const guardStreams = () => {
  // Redirect console methods to buffer (prevents mid-render corruption)
  console.log = (...args) => {
    logsBuffer.push(args.map(String).join(' '));
  };
  console.warn = (...args) => {
    logsBuffer.push(`[WARN] ${args.map(String).join(' ')}`);
  };
  // Keep console.error for debugging but buffer it
  console.error = (...args) => {
    logsBuffer.push(`[ERROR] ${args.map(String).join(' ')}`);
    // Also write to stderr for debugging
    originalConsoleError.apply(console, args);
  };
};

// Restore streams (call on exit if needed)
export const restoreStreams = () => {
  console.log = originalConsoleLog;
  console.error = originalConsoleError;
  console.warn = originalConsoleWarn;
};

// Get buffered logs (useful for debugging)
export const getBufferedLogs = () => [...logsBuffer];

const cli = meow(`
	Usage
	  $ liku

	Description
	  LikuBuddy - Terminal Based ASCII Game Hub

	Options
		--ai  Enable AI interaction mode

	Examples
	  $ liku
	  $ liku --ai
`, {
	importMeta: import.meta,
	flags: {
		ai: {
			type: 'boolean',
		}
	}
});

interface AppProps {
	ai?: boolean;
}

const App: React.FC<AppProps> = ({ ai = false }) => {
	const { exit } = useApp();
	const { stdin, setRawMode } = useStdin();
	const { stdout } = useStdout();
	const [actionQueue, setActionQueue] = useState<string[]>([]);

	useEffect(() => {
		// Guard streams before any rendering (prevents console.log corruption)
		guardStreams();

		// Clear terminal and set title BEFORE first render
		// This prevents "top-row bleed" artifacts
		if (stdout) {
			// Clear screen and move to top-left
			stdout.write('\x1b[2J\x1b[H');
			// Set terminal title
			stdout.write('\x1b]0;LikuBuddy Game Hub\x07');
		}

		if (ai) {
			setRawMode(false);
			const handleData = (data: Buffer) => {
				const command = data.toString().trim();
				if (command === 'exit_app') {
					restoreStreams();
					exit();
				}
				setActionQueue(prev => [...prev, ...command.split('\n')]);
			};
			stdin.on('data', handleData);
			return () => {
				stdin.off('data', handleData);
				restoreStreams();
			};
		}

		return () => {
			restoreStreams();
		};
	}, [ai, exit, stdin, setRawMode, stdout]);

	return <GameHub ai={ai} actionQueue={actionQueue} setActionQueue={setActionQueue} />;
};

render(<App ai={cli.flags.ai} />);