#Requires -RunAsAdministrator
param(
  [switch]$SkipMigrate
)

$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path -Parent $PSScriptRoot
$NodeExe = (Get-Command node -ErrorAction Stop).Source

Write-Output "project: $ProjectRoot"
Write-Output "node:    $NodeExe"

Set-Content -LiteralPath (Join-Path $PSScriptRoot "service-env.cmd") -Value "set `"DPP_NODE_EXE=$NodeExe`"" -Encoding ASCII
New-Item -ItemType Directory -Force -Path (Join-Path $ProjectRoot "logs") | Out-Null
New-Item -ItemType Directory -Force -Path (Join-Path $ProjectRoot "data") | Out-Null

if (-not $SkipMigrate) {
  Push-Location $ProjectRoot
  try {
    & $NodeExe "scripts/migrate-sqlite.mjs"
    if ($LASTEXITCODE -ne 0) { throw "Database migration failed with exit code $LASTEXITCODE" }
  } finally {
    Pop-Location
  }
}

function Register-DppTask {
  param(
    [string]$TaskName,
    [string]$ScriptName,
    [string]$Description
  )

  $xml = @"
<?xml version="1.0" encoding="UTF-16"?>
<Task version="1.4" xmlns="http://schemas.microsoft.com/windows/2004/02/mit/task">
  <RegistrationInfo>
    <Author>DPP</Author>
    <Description>$Description</Description>
  </RegistrationInfo>
  <Triggers>
    <BootTrigger>
      <Enabled>true</Enabled>
      <Delay>PT30S</Delay>
    </BootTrigger>
  </Triggers>
  <Principals>
    <Principal id="Author">
      <UserId>S-1-5-18</UserId>
      <RunLevel>HighestAvailable</RunLevel>
    </Principal>
  </Principals>
  <Settings>
    <MultipleInstancesPolicy>IgnoreNew</MultipleInstancesPolicy>
    <DisallowStartIfOnBatteries>false</DisallowStartIfOnBatteries>
    <StopIfGoingOnBatteries>false</StopIfGoingOnBatteries>
    <AllowHardTerminate>true</AllowHardTerminate>
    <StartWhenAvailable>true</StartWhenAvailable>
    <RunOnlyIfNetworkAvailable>false</RunOnlyIfNetworkAvailable>
    <IdleSettings>
      <StopOnIdleEnd>false</StopOnIdleEnd>
      <RestartOnIdle>false</RestartOnIdle>
    </IdleSettings>
    <AllowStartOnDemand>true</AllowStartOnDemand>
    <Enabled>true</Enabled>
    <Hidden>false</Hidden>
    <RunOnlyIfIdle>false</RunOnlyIfIdle>
    <WakeToRun>false</WakeToRun>
    <ExecutionTimeLimit>PT0S</ExecutionTimeLimit>
    <Priority>7</Priority>
    <RestartOnFailure>
      <Interval>PT1M</Interval>
      <Count>999</Count>
    </RestartOnFailure>
  </Settings>
  <Actions Context="Author">
    <Exec>
      <Command>cmd.exe</Command>
      <Arguments>/c "$PSScriptRoot\$ScriptName"</Arguments>
      <WorkingDirectory>$ProjectRoot</WorkingDirectory>
    </Exec>
  </Actions>
</Task>
"@

  Register-ScheduledTask -TaskName $TaskName -Xml $xml -Force | Out-Null
  Write-Output "task registered: $TaskName"
}

Register-DppTask -TaskName "DPP App (vinext 3000)" -ScriptName "run-dpp-app.cmd" -Description "Digital Product Passport web app on http://127.0.0.1:3000"
Register-DppTask -TaskName "DPP API (express 4000)" -ScriptName "run-dpp-api.cmd" -Description "Digital Product Passport ERP API on http://127.0.0.1:4000"

Start-ScheduledTask -TaskName "DPP API (express 4000)"
Start-ScheduledTask -TaskName "DPP App (vinext 3000)"

Start-Sleep -Seconds 5
Get-ScheduledTask -TaskName "DPP*" | Select-Object TaskName, State | Format-Table -AutoSize
