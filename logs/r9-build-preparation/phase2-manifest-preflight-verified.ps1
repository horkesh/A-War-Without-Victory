if (!(Test-Path 'data/derived/scenario/baselines/manifest.json' -PathType Leaf)) { throw 'Missing required baseline manifest' }
Write-Output 'PRECHECK_OK'
