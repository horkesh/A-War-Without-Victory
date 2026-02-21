npm install --no-save ts-morph | Out-Null
if ($LASTEXITCODE -ne 0) {
    Write-Host "Failed to install ts-morph. Exiting."
    exit $LASTEXITCODE
}

Write-Host "Executing mass deslop and refactor over all files..."
node refactor.mjs

Write-Host "Running knip to identify dead files, folders, and unused exports..."
npx knip@latest --production false | Out-File -FilePath DEAD_CODE_AND_FILES.md -Encoding utf8

Write-Host "Running codebase-wide debugging typecheck..."
npm run typecheck 2>&1 | Out-File -FilePath TYPE_CHECK_DEBUG.md -Encoding utf8

Write-Host "All operations completed successfully."
