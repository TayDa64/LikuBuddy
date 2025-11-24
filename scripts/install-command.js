import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const homeDir = os.homedir();
const geminiDir = path.join(homeDir, '.gemini');
const commandsDir = path.join(geminiDir, 'commands');
const sourceToml = path.join(process.cwd(), 'commands', 'liku.toml');
const destToml = path.join(commandsDir, 'liku.toml');
const distDir = path.join(process.cwd(), 'dist');
const distIndexJs = path.join(distDir, 'index.js');

try {
  // Check if dist directory exists
  if (!fs.existsSync(distDir)) {
    console.error('❌ dist/ directory not found. Please run "npm run build" first.');
    process.exit(1);
  }

  // Check if dist/index.js exists
  if (!fs.existsSync(distIndexJs)) {
    console.error('❌ dist/index.js not found. Please run "npm run build" first.');
    process.exit(1);
  }

  // Ensure .gemini/commands exists
  if (!fs.existsSync(commandsDir)) {
    fs.mkdirSync(commandsDir, { recursive: true });
    console.log(`Created directory: ${commandsDir}`);
  }

  // Read source
  let content = fs.readFileSync(sourceToml, 'utf-8');

  // Replace ${extensionPath} with current absolute path
  // Use forward slashes for compatibility in TOML strings
  const extensionPath = process.cwd().replace(/\\/g, '/');
  content = content.replace(/\$\{extensionPath\}/g, extensionPath);

  // Write to destination
  fs.writeFileSync(destToml, content, 'utf-8');

  console.log(`✅ Successfully installed /liku command to ${destToml}`);
  console.log(`   Extension path resolved to: ${extensionPath}`);
} catch (error) {
  console.error('❌ Failed to install /liku command:', error);
  process.exit(1);
}
