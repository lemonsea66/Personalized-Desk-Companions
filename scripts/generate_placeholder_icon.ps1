$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.Drawing

$output = Join-Path $PSScriptRoot "..\\apps\\desktop\\icon-source.png"
$bitmap = New-Object System.Drawing.Bitmap 512, 512, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$graphics = [System.Drawing.Graphics]::FromImage($bitmap)
$graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$graphics.Clear([System.Drawing.Color]::Transparent)

$shadow = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(70, 0, 0, 0))
$body = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, 28, 47, 58))
$accent = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, 84, 214, 224))
$highlight = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, 239, 250, 251))

$graphics.FillEllipse($shadow, 70, 88, 384, 384)
$graphics.FillEllipse($body, 64, 64, 384, 384)
$graphics.FillEllipse($accent, 124, 124, 264, 264)
$graphics.FillEllipse($highlight, 168, 190, 48, 64)
$graphics.FillEllipse($highlight, 296, 190, 48, 64)
$graphics.FillEllipse($body, 218, 292, 76, 22)

$bitmap.Save($output, [System.Drawing.Imaging.ImageFormat]::Png)

$shadow.Dispose()
$body.Dispose()
$accent.Dispose()
$highlight.Dispose()
$graphics.Dispose()
$bitmap.Dispose()

Write-Output "Generated transparent placeholder icon: $output"
