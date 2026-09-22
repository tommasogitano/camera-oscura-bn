# Camera Oscura BN - crea il pacchetto .ccx da distribuire.
# Il .ccx e uno zip del contenuto di bn-studio, con manifest.json alla radice.
# Le voci dello zip usano la barra "/" (Compress-Archive di Windows usa "\"
# e Creative Cloud rifiuta il pacchetto), per questo si scrive lo zip a mano.
$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem

$radice    = Split-Path -Parent $PSScriptRoot
$sorgente  = Join-Path $radice "bn-studio"
$manifest  = Get-Content (Join-Path $sorgente "manifest.json") -Raw | ConvertFrom-Json
$versione  = $manifest.version
$cartella  = Join-Path $radice "dist"
if (-not (Test-Path $cartella)) { New-Item -ItemType Directory -Path $cartella | Out-Null }
$uscita    = Join-Path $cartella ("CameraOscuraBN-" + $versione + ".ccx")
if (Test-Path $uscita) { Remove-Item $uscita }

$zip = [System.IO.Compression.ZipFile]::Open($uscita, "Create")
try {
  Get-ChildItem -Path $sorgente -Recurse -File | ForEach-Object {
    $relativo = $_.FullName.Substring($sorgente.Length + 1).Replace("\", "/")
    [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($zip, $_.FullName, $relativo, "Optimal") | Out-Null
  }
} finally { $zip.Dispose() }

Write-Host ""
Write-Host "  Pacchetto creato: $uscita"
Write-Host "  Doppio clic sul file per installarlo con Creative Cloud."
Write-Host ""
