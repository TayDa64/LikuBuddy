param (
    [Parameter(Mandatory=$false)]
    [string]$Key,

    [Parameter(Mandatory=$false)]
    [int]$Id
)

$wshell = New-Object -ComObject WScript.Shell
$success = $false

# The game runs as a node child process inside a terminal
# Window title format: "LikuBuddy Game Hub [PID]" for unique targeting

if ($Id -and $Id -gt 0) {
    # Try PID-specific title first (most precise)
    $pidTitle = "LikuBuddy Game Hub [$Id]"
    $success = $wshell.AppActivate($pidTitle)
}

if (-not $success) {
    # Fallback to generic title (may hit wrong window if multiple exist)
    $success = $wshell.AppActivate("LikuBuddy Game Hub")
}

if (-not $success) {
    # Last resort - partial match
    $success = $wshell.AppActivate("LikuBuddy")
}

if (-not $success) {
    Write-Error "Could not activate game window. Ensure LikuBuddy is running."
    exit 1
}

# Small delay to ensure focus settles
Start-Sleep -Milliseconds 50

# Send the keys
try {
    $wshell.SendKeys($Key)
} catch {
    Write-Error "Failed to send keys: $_"
    exit 1
}
