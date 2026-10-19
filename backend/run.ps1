$ErrorActionPreference = 'Stop'
Push-Location $PSScriptRoot
try {
    if (Test-Path -LiteralPath '.env') {
        Get-Content -LiteralPath '.env' | ForEach-Object {
            if ($_ -match '^\s*([A-Z][A-Z0-9_]*)=(.*)$') {
                [Environment]::SetEnvironmentVariable($matches[1], $matches[2].Trim(), 'Process')
            }
        }
    }
    & .\mvnw.cmd spring-boot:run
    $taskExitCode = $LASTEXITCODE
} finally { Pop-Location }
exit $taskExitCode
