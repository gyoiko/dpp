#Requires -RunAsAdministrator

$ErrorActionPreference = "Stop"

foreach ($name in "DPP App (vinext 3000)", "DPP API (express 4000)") {
  $task = Get-ScheduledTask -TaskName $name -ErrorAction SilentlyContinue
  if (-not $task) {
    Write-Output "task not found: $name"
    continue
  }
  Stop-ScheduledTask -TaskName $name -ErrorAction SilentlyContinue
  Unregister-ScheduledTask -TaskName $name -Confirm:$false
  Write-Output "task removed: $name"
}
