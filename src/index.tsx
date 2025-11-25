import React from 'react';
import { render } from 'ink';
import meow from 'meow';
import GameHub from './ui/LikuTUI.js';

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

// Enter alternate screen buffer handled by fullscreen option
const { waitUntilExit } = render(<GameHub ai={cli.flags.ai} />);

waitUntilExit();

