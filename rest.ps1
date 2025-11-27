$ScriptDir = Split-Path $MyInvocation.MyCommand.Path
& "$ScriptDir\send-keys.ps1" -Key "r" @args