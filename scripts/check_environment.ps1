$ErrorActionPreference = "Stop"

function Get-VersionLine([string]$Label, [string]$Command, [string[]]$Arguments = @("--version")) {
  if (-not (Test-Path -LiteralPath $Command) -and -not (Get-Command $Command -ErrorAction SilentlyContinue)) {
    return "${Label}: missing"
  }
  try {
    $line = (& $Command @Arguments 2>&1 | Select-Object -First 1).ToString().Trim()
    return "${Label}: $line"
  } catch {
    return "${Label}: unavailable ($($_.Exception.Message))"
  }
}

$pythonCandidates = @(
  (Join-Path $PSScriptRoot "..\\backend\\.venv\\Scripts\\python.exe")
)
$projectPython = $pythonCandidates | Where-Object { Test-Path $_ } | Select-Object -First 1

Write-Output (Get-VersionLine "node" "node")
Write-Output (Get-VersionLine "npm" "npm")
if ($projectPython) {
  $pythonLine = (& $projectPython --version 2>&1 | Select-Object -First 1).ToString().Trim()
  Write-Output "project-python: $pythonLine ($projectPython)"
} else {
  Write-Output "project-python: missing (expected Python 3.12 virtual environment)"
}
$cargoHome = $env:CARGO_HOME
if (-not $cargoHome) {
  $cargoHome = [Environment]::GetEnvironmentVariable("CARGO_HOME", "User")
}
$rustupHome = $env:RUSTUP_HOME
if (-not $rustupHome) {
  $rustupHome = [Environment]::GetEnvironmentVariable("RUSTUP_HOME", "User")
}
if ($cargoHome) {
  $env:CARGO_HOME = $cargoHome
}
if ($rustupHome) {
  $env:RUSTUP_HOME = $rustupHome
}
$rustc = if ($cargoHome) { Join-Path $cargoHome "bin\\rustc.exe" } else { "rustc" }
$cargo = if ($cargoHome) { Join-Path $cargoHome "bin\\cargo.exe" } else { "cargo" }

Write-Output (Get-VersionLine "rustc" $rustc)
Write-Output (Get-VersionLine "cargo" $cargo)
Write-Output (Get-VersionLine "git" "git")

$tauriCli = Join-Path $PSScriptRoot "..\\node_modules\\.bin\\tauri.cmd"
Write-Output (Get-VersionLine "tauri" $tauriCli)

$webviewPaths = @(
  "C:\Program Files (x86)\Microsoft\EdgeWebView\Application",
  "C:\Program Files\Microsoft\EdgeWebView\Application",
  (Join-Path $env:LOCALAPPDATA "Microsoft\EdgeWebView\Application")
)
$webviewPath = $webviewPaths | Where-Object { Test-Path -LiteralPath $_ } | Select-Object -First 1
if ($webviewPath) {
  $webviewVersion = Get-ChildItem -LiteralPath $webviewPath -Directory -ErrorAction SilentlyContinue |
    Where-Object { $_.Name -match "^\d+\." } |
    Sort-Object Name -Descending |
    Select-Object -First 1
  Write-Output "webview2: available ($($webviewVersion.Name)) at $webviewPath"
} else {
  Write-Output "webview2: runtime not found in standard installation paths"
}
