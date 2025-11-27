param (
    [Parameter(Mandatory=$false)]
    [string]$Key,

    [Parameter(Mandatory=$false)]
    [int]$Id
)

function Send-KeystrokesToProcess {
    param (
        [Parameter(Mandatory=$true)]
        [int]$ProcessId,

        [Parameter(Mandatory=$true)]
        [string]$Keystrokes,

        [int]$ActivationDelayMs = 2000,
        [int]$KeystrokeDelayMs = 50
    )

    Add-Type -AssemblyName System.Windows.Forms
    Add-Type -AssemblyName Microsoft.VisualBasic

    $process = Get-Process -Id $ProcessId -ErrorAction SilentlyContinue
    if (-not $process) {
        Write-Error "Process with PID $ProcessId not found."
        return
    }

    $activated = $false
    for ($i = 0; $i -lt 10; $i++) {
        try {
            [Microsoft.VisualBasic.Interaction]::AppActivate($process.MainWindowTitle)
            $activated = $true
            break
        }
        catch {
            Start-Sleep -Milliseconds 100
        }
    }

    if (-not $activated) {
        try {
            [Microsoft.VisualBasic.Interaction]::AppActivate($ProcessId)
            $activated = $true
        }
        catch {
            Write-Error "Failed to activate process window using PID. Keystrokes will likely fail."
            return
        }
    }

    Start-Sleep -Milliseconds $ActivationDelayMs

    try {
        [System.Windows.Forms.SendKeys]::SendWait($Keystrokes)
    }
    catch {
        Write-Error "Failed to send keystrokes: $($_.Exception.Message)"
    }
}

# Main script execution

if (-not $Key) {
    Write-Host "Usage: .\send-keys.ps1 -Key '{DOWN}' [-Id <PID>]"
    Write-Host "Supported Keys: {UP}, {DOWN}, {LEFT}, {RIGHT}, {ENTER}, {ESC}, etc."
    exit
}

if ($Id) {
    Send-KeystrokesToProcess -ProcessId $Id -Keystrokes $Key
} else {
    # Try to find the Liku/Node process
    # 1. Look for process with title containing "Liku" but exclude VS Code
    $proc = Get-Process | Where-Object { $_.MainWindowTitle -like "*Liku*" -and $_.MainWindowTitle -notlike "*Visual Studio Code*" -and $_.MainWindowTitle -notlike "*VS Code*" } | Select-Object -First 1
    
    # 2. If not found, look for "node" with a window title
    if (-not $proc) {
        $proc = Get-Process node -ErrorAction SilentlyContinue | Where-Object { $_.MainWindowTitle -ne "" } | Sort-Object StartTime -Descending | Select-Object -First 1
    }

    if ($proc) {
        Write-Host "Targeting process: $($proc.Id) ($($proc.MainWindowTitle))"
        Send-KeystrokesToProcess -ProcessId $proc.Id -Keystrokes $Key
    } else {
        Write-Error "Could not find a suitable game process (Liku or Node). Please specify -Id."
    }
}
