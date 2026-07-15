$ErrorActionPreference = "Stop"

$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$backendRoot = Join-Path $projectRoot "backend"
$python = Join-Path $backendRoot ".venv\Scripts\python.exe"
if (-not (Test-Path -LiteralPath $python)) {
  throw "Python 3.12 environment is missing: $python"
}

$cargoHome = [Environment]::GetEnvironmentVariable("CARGO_HOME", "User")
$rustupHome = [Environment]::GetEnvironmentVariable("RUSTUP_HOME", "User")
if ($cargoHome) {
  $env:CARGO_HOME = $cargoHome
  $env:PATH = "$(Join-Path $cargoHome 'bin');$env:PATH"
}
if ($rustupHome) {
  $env:RUSTUP_HOME = $rustupHome
}

$backendProcess = $null
$listener = Get-NetTCPConnection -LocalPort 18082 -State Listen -ErrorAction SilentlyContinue
if ($listener) {
  throw "Port 18082 is already in use by process $($listener.OwningProcess)."
}

try {
  $backendProcess = Start-Process -FilePath $python `
    -ArgumentList "-m", "uvicorn", "app.main:app", "--host", "127.0.0.1", "--port", "18082", "--no-access-log" `
    -WorkingDirectory $backendRoot -WindowStyle Hidden -PassThru

  for ($attempt = 0; $attempt -lt 30; $attempt += 1) {
    try {
      Invoke-RestMethod -Uri "http://127.0.0.1:18082/api/v1/health" -TimeoutSec 1 | Out-Null
      break
    } catch {
      Start-Sleep -Milliseconds 200
    }
  }

  Set-Location $projectRoot
  npm --workspace apps/desktop run tauri -- dev --no-watch
} finally {
  if ($backendProcess -and -not $backendProcess.HasExited) {
    Stop-Process -Id $backendProcess.Id
  }
}
