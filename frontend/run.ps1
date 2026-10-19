$ErrorActionPreference = 'Stop'
Push-Location $PSScriptRoot
try {
    # A instalação portátil é opcional e não faz parte dos arquivos publicados.
    $taskPortableNode = Join-Path $PSScriptRoot '../.tools/node-v22.22.0-win-x64'
    if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
        if (Test-Path -LiteralPath (Join-Path $taskPortableNode 'node.exe')) {
            $env:PATH = "$taskPortableNode;$env:PATH"
        } else {
            throw 'Instale Node.js 22.22 ou superior compatível e reabra o terminal.'
        }
    }
    if (-not (Test-Path -LiteralPath 'node_modules')) {
        & npm.cmd ci
        if ($LASTEXITCODE -ne 0) { throw 'Não foi possível instalar as dependências.' }
    }
    & npm.cmd run dev
    $taskExitCode = $LASTEXITCODE
} finally { Pop-Location }
exit $taskExitCode
