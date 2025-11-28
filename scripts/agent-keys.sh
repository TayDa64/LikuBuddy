#!/bin/bash
# ============================================================
# LikuBuddy Agent Keys - macOS/Linux
# 
# Cross-platform key simulation for AI agents.
# 
# Usage:
#   ./scripts/agent-keys.sh <key>
#   ./scripts/agent-keys.sh up
#   ./scripts/agent-keys.sh enter
#
# Supported keys:
#   up, down, left, right, enter, escape, space
#   f, r, q, m, a-z
#
# Requirements:
#   macOS: osascript (built-in)
#   Linux: xdotool (install: sudo apt install xdotool)
# ============================================================

set -e

KEY="${1:-}"

if [ -z "$KEY" ]; then
    echo "Usage: $0 <key>"
    echo "Example: $0 up"
    echo "         $0 enter"
    exit 1
fi

# Convert to lowercase
KEY=$(echo "$KEY" | tr '[:upper:]' '[:lower:]')

# Detect OS
OS="$(uname -s)"

# ============================================================
# macOS: Use osascript (AppleScript)
# ============================================================
send_key_macos() {
    local key="$1"
    local keystroke=""
    
    case "$key" in
        up)     keystroke="key code 126" ;;
        down)   keystroke="key code 125" ;;
        left)   keystroke="key code 123" ;;
        right)  keystroke="key code 124" ;;
        enter)  keystroke="key code 36" ;;
        escape) keystroke="key code 53" ;;
        space)  keystroke='keystroke " "' ;;
        *)      
            # Single character
            if [ ${#key} -eq 1 ]; then
                keystroke="keystroke \"$key\""
            else
                echo "Unknown key: $key"
                exit 1
            fi
            ;;
    esac
    
    osascript -e "
        tell application \"System Events\"
            -- Try Terminal first
            if application \"Terminal\" is running then
                tell application \"Terminal\" to activate
                delay 0.1
                $keystroke
                return
            end if
            
            -- Try iTerm
            if application \"iTerm\" is running then
                tell application \"iTerm\" to activate
                delay 0.1
                $keystroke
                return
            end if
            
            -- Fallback to frontmost app
            $keystroke
        end tell
    "
    
    echo "✅ Sent key: $key (macOS)"
}

# ============================================================
# Linux: Use xdotool
# ============================================================
send_key_linux() {
    local key="$1"
    local xkey=""
    
    # Check if xdotool is installed
    if ! command -v xdotool &> /dev/null; then
        echo "❌ xdotool not found. Install it:"
        echo "   Debian/Ubuntu: sudo apt install xdotool"
        echo "   Fedora:        sudo dnf install xdotool"
        echo "   Arch:          sudo pacman -S xdotool"
        exit 1
    fi
    
    case "$key" in
        up)     xkey="Up" ;;
        down)   xkey="Down" ;;
        left)   xkey="Left" ;;
        right)  xkey="Right" ;;
        enter)  xkey="Return" ;;
        escape) xkey="Escape" ;;
        space)  xkey="space" ;;
        *)      
            # Single character
            if [ ${#key} -eq 1 ]; then
                xkey="$key"
            else
                echo "Unknown key: $key"
                exit 1
            fi
            ;;
    esac
    
    # Try to find and activate LikuBuddy window
    WINDOW_ID=$(xdotool search --name "Liku" 2>/dev/null | head -1) || \
    WINDOW_ID=$(xdotool search --name "node" 2>/dev/null | head -1) || \
    WINDOW_ID=""
    
    if [ -n "$WINDOW_ID" ]; then
        xdotool windowactivate --sync "$WINDOW_ID" 2>/dev/null || true
    fi
    
    xdotool key "$xkey"
    
    echo "✅ Sent key: $key (Linux/xdotool)"
}

# ============================================================
# Main
# ============================================================
case "$OS" in
    Darwin)
        send_key_macos "$KEY"
        ;;
    Linux)
        send_key_linux "$KEY"
        ;;
    *)
        echo "❌ Unsupported OS: $OS"
        echo "   This script supports macOS and Linux."
        echo "   For Windows, use the PowerShell scripts (*.ps1)"
        exit 1
        ;;
esac
