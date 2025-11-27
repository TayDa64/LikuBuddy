param (
    [Parameter(Mandatory=$false)]
    [string]$Key,

    [Parameter(Mandatory=$false)]
    [int]$Id
)

$wshell = New-Object -ComObject WScript.Shell
$targetTitle = "LikuBuddy Game Window"

# Strategy 1: Activate by specific Window Title (Most Reliable for CLI)
$success = $wshell.AppActivate($targetTitle)

# Strategy 2: If that fails, and we have a PID, try PID
if (-not $success -and $Id) {
    $success = $wshell.AppActivate($Id)
}

# Strategy 3: Fallback to generic titles
if (-not $success) {
    if ($wshell.AppActivate("Liku")) { $success = $true }
    elseif ($wshell.AppActivate("node")) { $success = $true }
}

if (-not $success) {
    Write-Error "Could not activate game window. Ensure 'LikuBuddy Game Window' is running."
    exit 1
}

# Small delay to ensure focus settles
Start-Sleep -Milliseconds 100

# Send the keys
try {
    $wshell.SendKeys($Key)
} catch {
    Write-Error "Failed to send keys: $_"
    exit 1
}
