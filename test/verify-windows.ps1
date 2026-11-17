param([string]$Root)
$ErrorActionPreference='Stop'
$code=Join-Path $env:LOCALAPPDATA 'Programs\Microsoft VS Code\c4453f8ea4\resources\app'
$runtime=Join-Path $env:LOCALAPPDATA 'editor-tools\Code-1.145.2\c4453f8ea4\resources\app'
function Get-Hash($Path){(Get-FileHash -Algorithm SHA256 -LiteralPath $Path).Hash.ToLowerInvariant()}
$original=Join-Path $code 'out\vs\workbench\workbench.desktop.main.js'
if((Get-Hash $original) -ne '8bd0d70cda8542f514a45534a14860ea48ddf39f149036838aebfcf2cc6ba02a'){throw 'System workbench changed'}
$copy=Join-Path $runtime 'out\vs\workbench\workbench.desktop.main.js'
$text=[IO.File]::ReadAllText($copy)
if(-not $text.Contains('/* editor-ime-mode verified patch */') -or -not $text.Contains('/* shell-ime verified patch */')){throw 'Runtime patches missing'}
[pscustomobject]@{systemUnmodified=$true;runtimePatched=$true}|ConvertTo-Json -Compress
