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
