import React, { useState, useEffect } from 'react';
import { Box, Text, useInput, useApp, useStdin } from 'ink';
import Snake from './games/Snake.js';
import TicTacToe from './games/TicTacToe.js';
import DinoRun from './games/DinoRun.js';
import SettingsMenu from './SettingsMenu.js';
import { db, PlayerStats, UserSettings } from '../services/DatabaseService.js';

interface GameHubProps {
	ai?: boolean;
}

const GameHub: React.FC<GameHubProps> = ({ ai = false }) => {
	const { exit } = useApp();
	const { stdin, setRawMode } = useStdin();

	const [selectedGame, setSelectedGame] = useState<number>(0);
	const [selectedGameMenuIndex, setSelectedGameMenuIndex] = useState<number>(0);
	const [activeGame, setActiveGame] = useState<string | null>(null);
	const [stats, setStats] = useState<PlayerStats | null>(null);
	const [settings, setSettings] = useState<UserSettings | null>(null);
	const [message, setMessage] = useState<string | null>(null);
	const [actionQueue, setActionQueue] = useState<string[]>([]);

	const refreshData = () => {
		db.getStats().then(setStats).catch(console.error);
		db.getSettings().then(setSettings).catch(console.error);
	};

	useEffect(() => {
		refreshData();
	}, [activeGame]);

	const mainMenuItems = [
		{ id: 'games_menu', name: '🎮 Let\'s Play' },
		{ id: 'feed', name: '🍖 Feed Liku (XP -10, Hunger -20)' },
		{ id: 'rest', name: '💤 Rest (Energy +30, Hunger +10)' },
		{ id: 'settings', name: '⚙️ Settings' },
		{ id: 'exit', name: '🚪 Exit' }
	];

	const gameMenuItems = [
		{ id: 'snake', name: '🐍 Play Snake (Energy -10, Happiness +10)' },
		{ id: 'tictactoe', name: '❌⭕ Tic-Tac-Toe (Energy -5, XP/Happy Rewards)' },
		{ id: 'dinorun', name: '🦖 Dino Run (Energy -10, XP Rewards)' },
		{ id: 'back', name: '🔙 Back to Main Menu' }
	];

	const performAction = (command: string) => {
		const isGameMenu = activeGame === 'games_menu';
		const items = isGameMenu ? gameMenuItems : mainMenuItems;
		const setSelection = isGameMenu ? setSelectedGameMenuIndex : setSelectedGame;
		const currentSelection = isGameMenu ? selectedGameMenuIndex : selectedGame;

		if (command === 'up') {
			setSelection(prev => Math.max(0, prev - 1));
		} else if (command === 'down') {
			setSelection(prev => Math.min(items.length - 1, prev + 1));
		} else if (command === 'enter') {
			handleAction(items[currentSelection].id);
		} else if (command === 'exit_app') {
			exit();
		}
	};

	const handleAction = async (id: string) => {
		if (!stats) return;

		if (id === 'exit') {
			exit();
		} else if (id === 'settings') {
			setActiveGame('settings');
		} else if (id === 'games_menu') {
			setActiveGame('games_menu');
			setSelectedGameMenuIndex(0);
		} else if (id === 'back') {
			setActiveGame(null);
		} else if (id === 'snake') {
			if (stats.energy < 10) {
				setMessage("Liku is too tired to play! Let him rest first.");
				setTimeout(() => setMessage(null), 3000);
				return;
			}
			setActiveGame('snake');
		} else if (id === 'tictactoe') {
			if (stats.energy < 5) {
				setMessage("Liku is too tired to play! Let him rest first.");
				setTimeout(() => setMessage(null), 3000);
				return;
			}
			setActiveGame('tictactoe');
		} else if (id === 'dinorun') {
			if (stats.energy < 10) {
				setMessage("Liku is too tired to play! Let him rest first.");
				setTimeout(() => setMessage(null), 3000);
				return;
			}
			setActiveGame('dinorun');
		} else if (id === 'feed') {
			if (stats.xp < 10) {
				setMessage("Not enough XP to buy food! Play games to earn XP.");
			} else {
				await db.updateStats({
					xp: stats.xp - 10,
					hunger: Math.max(0, stats.hunger - 20),
					happiness: Math.min(100, stats.happiness + 5)
				});
				setMessage("Yum! Liku feels better.");
				refreshData();
			}
			setTimeout(() => setMessage(null), 3000);
		} else if (id === 'rest') {
			await db.updateStats({
				energy: Math.min(100, stats.energy + 30),
				hunger: Math.min(100, stats.hunger + 10)
			});
			setMessage("Liku feels refreshed!");
			refreshData();
			setTimeout(() => setMessage(null), 3000);
		}
	};

	// For human players
	useInput((input, key) => {
		if (ai) return;

		if (activeGame && activeGame !== 'games_menu') return;

		if (key.upArrow) performAction('up');
		if (key.downArrow) performAction('down');
		if (key.return) performAction('enter');
		if (key.escape && activeGame === 'games_menu') setActiveGame(null);
	}, { isActive: !ai });

	// For AI players (via --ai flag)
	useEffect(() => {
		if (ai) {
			setRawMode(false);
			const handleData = (data: Buffer) => {
				const command = data.toString().trim();
				// Add all commands from input to the queue
				setActionQueue(prev => [...prev, ...command.split('\n')]);
			};
			stdin.on('data', handleData);
			return () => {
				stdin.off('data', handleData);
			};
		}
	}, [ai]);

	// Process the action queue one by one
	useEffect(() => {
		if (actionQueue.length > 0) {
			const [currentAction, ...rest] = actionQueue;
			performAction(currentAction);
			// Process next action only after the state has updated
			// by setting the rest of the queue.
			setActionQueue(rest);
		}
	}, [actionQueue]);


	if (activeGame === 'snake') {
		return <Snake onExit={() => setActiveGame('games_menu')} difficulty={settings?.snakeDifficulty} />;
	}

	if (activeGame === 'tictactoe') {
		return <TicTacToe onExit={() => setActiveGame('games_menu')} difficulty={settings?.snakeDifficulty} />;
	}

	if (activeGame === 'dinorun') {
		return <DinoRun onExit={() => setActiveGame('games_menu')} difficulty={settings?.snakeDifficulty} />;
	}

	if (activeGame === 'settings') {
		return <SettingsMenu onExit={() => setActiveGame(null)} onSettingsChanged={refreshData} />;
	}

	// Theme colors
	const getBorderColor = () => {
		switch(settings?.theme) {
			case 'matrix': return 'green';
			case 'cyberpunk': return 'yellow';
			case 'retro': return 'magenta';
			default: return 'cyan';
		}
	};

	const getTitleColor = () => {
		switch(settings?.theme) {
			case 'matrix': return 'green';
			case 'cyberpunk': return 'yellow';
			case 'retro': return 'red';
			default: return 'magenta';
		}
	};

	const isGameMenu = activeGame === 'games_menu';
	const currentMenuItems = isGameMenu ? gameMenuItems : mainMenuItems;
	const currentSelection = isGameMenu ? selectedGameMenuIndex : selectedGame;

	return (
		<Box flexDirection="column" padding={1} borderStyle="round" borderColor={getBorderColor()} width={60}>
			<Box marginBottom={1} flexDirection="column" alignItems="center">
				<Text bold color={getTitleColor()}>🎮 LikuBuddy Game Hub 🎮</Text>
				<Text>Your AI Companion</Text>
			</Box>

			<Box height={3}>
				{stats ? (
					<Box borderStyle="single" borderColor={settings?.theme === 'matrix' ? 'green' : 'yellow'} paddingX={1} marginBottom={1} flexDirection="row" gap={2}>
						<Text>Level: {stats.level}</Text>
						<Text>XP: {stats.xp}</Text>
						<Text>Hunger: {stats.hunger}%</Text>
						<Text>Energy: {stats.energy}%</Text>
						<Text>Happiness: {stats.happiness}%</Text>
					</Box>
				) : (
					<Text>Loading stats...</Text>
				)}
			</Box>

			<Box flexDirection="column" height={Math.max(mainMenuItems.length, gameMenuItems.length)}>
				{currentMenuItems.map((item, index) => (
					<Box key={item.id}>
						<Text color={index === currentSelection ? 'green' : 'white'}>
							{index === currentSelection ? '> ' : '  '}
							{item.name}
						</Text>
					</Box>
				))}
			</Box>
			
			<Box height={2} marginTop={1}>
				{message && (
					<Text color="yellow" bold>{message}</Text>
				)}
			</Box>

			<Box marginTop={1}>
				<Text dimColor>Use ↑/↓ to select, Enter to act{isGameMenu ? ', Esc to back' : ''}</Text>
			</Box>
		</Box>
	);
};

export default GameHub;
