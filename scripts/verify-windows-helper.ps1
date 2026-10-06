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
