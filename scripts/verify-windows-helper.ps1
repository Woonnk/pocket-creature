$ErrorActionPreference = 'Stop'
$sourcePath = Join-Path $PSScriptRoot '../desktop/activity.ps1'
$tokens = $null
$parseErrors = $null
[System.Management.Automation.Language.Parser]::ParseFile($sourcePath, [ref]$tokens, [ref]$parseErrors) | Out-Null
if ($parseErrors.Count -gt 0) { throw ($parseErrors | Out-String) }
$source = [System.IO.File]::ReadAllText($sourcePath)
$definition = [regex]::Match($source, "(?s)-TypeDefinition @'\r?\n(.*?)\r?\n'@")
if (-not $definition.Success) { throw 'Could not locate bundled C# definition.' }
Add-Type -ReferencedAssemblies System.dll, System.Core.dll, System.Windows.Forms.dll -TypeDefinition $definition.Groups[1].Value
Write-Output 'PASS: PowerShell syntax and bundled C# compile. Native sensing was not started.'

Add-Type -AssemblyName System.Speech, System.Web.Extensions
$speechAssembly = [System.Speech.Synthesis.SpeechSynthesizer].Assembly.Location
$jsonAssembly = [System.Web.Script.Serialization.JavaScriptSerializer].Assembly.Location

$speechPath = Join-Path $PSScriptRoot '../desktop/speech.ps1'
[System.Management.Automation.Language.Parser]::ParseFile($speechPath, [ref]$tokens, [ref]$parseErrors) | Out-Null
if ($parseErrors.Count -gt 0) { throw ($parseErrors | Out-String) }
$definition = [regex]::Match([System.IO.File]::ReadAllText($speechPath), "(?s)-TypeDefinition @'\r?\n(.*?)\r?\n'@")
if (-not $definition.Success) { throw 'Could not locate bundled speech C# definition.' }
Add-Type -ReferencedAssemblies System.dll, System.Core.dll, $speechAssembly, $jsonAssembly -TypeDefinition $definition.Groups[1].Value
Write-Output 'PASS: Speech helper PowerShell syntax and C# compile. No audio was played.'

$inputPath = Join-Path $PSScriptRoot '../desktop/voice-input.ps1'
[System.Management.Automation.Language.Parser]::ParseFile($inputPath, [ref]$tokens, [ref]$parseErrors) | Out-Null
if ($parseErrors.Count -gt 0) { throw ($parseErrors | Out-String) }
$definition = [regex]::Match([System.IO.File]::ReadAllText($inputPath), "(?s)-TypeDefinition @'\r?\n(.*?)\r?\n'@")
if (-not $definition.Success) { throw 'Could not locate bundled voice input C# definition.' }
Add-Type -ReferencedAssemblies System.dll, System.Core.dll, $speechAssembly, $jsonAssembly -TypeDefinition $definition.Groups[1].Value
Write-Output 'PASS: Voice input PowerShell syntax and C# compile. No microphone was opened.'
