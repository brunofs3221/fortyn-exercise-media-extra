$ErrorActionPreference='Stop'
Add-Type -AssemblyName System.IO.Compression.FileSystem
$repo = Split-Path -Parent $PSScriptRoot
$sourceRoot = 'C:\Users\bruno\Downloads\Exercicios renomeados'
$archiveRoot = 'C:\Users\bruno\Downloads\abdomen\Nova pasta'
function Key([string]$value) { (($value.Normalize([Text.NormalizationForm]::FormD).ToCharArray() | Where-Object { [Globalization.CharUnicodeInfo]::GetUnicodeCategory($_) -ne [Globalization.UnicodeCategory]::NonSpacingMark }) -join '').ToLowerInvariant().Trim() }
function Csv([object]$value) { '"' + ([string]$value).Replace('"','""') + '"' }
$initial = @(git -C $repo show '0ab1d7c:reports/exercise_migration.csv' | ConvertFrom-Csv | Where-Object status -eq 'mapped')
$initialByKey = @{}; $initial | ForEach-Object { $initialByKey[(Key $_.nome_novo)] = $_.nome_novo }
$archive = @()
Get-ChildItem -LiteralPath $archiveRoot -File -Filter 'biblioteca_*corrigidos*.zip' | ForEach-Object {
  $zip = [IO.Compression.ZipFile]::OpenRead($_.FullName)
  $zip.Entries | Where-Object FullName -match '(^|/)informacoes\.txt$' | ForEach-Object { $archive += [pscustomobject]@{ archive=$_.FullName; folder=[IO.Path]::GetDirectoryName($_.FullName) } }
  $zip.Dispose()
}
$archiveUnique = @{}; $archive | ForEach-Object { $archiveUnique[(Key $_.folder)] = $_.folder }
$overlap = @($archiveUnique.Keys | Where-Object { $initialByKey.ContainsKey($_) })
$source = @(Get-ChildItem -LiteralPath $sourceRoot -Directory)
$truth = Get-Content -Raw (Join-Path $repo 'reports\source_of_truth.json') | ConvertFrom-Json
$truthById = @{}; $truth | ForEach-Object { $truthById[$_.id] = $_ }
$first704 = foreach ($initialRecord in $initial) { $record=$truthById[$initialRecord.id]; [pscustomobject]@{ id=$initialRecord.id; nome=$initialRecord.nome_novo; source_folder=$record.sourceFolder; tags_secundarias=($record.secondaryTags -join ' | '); quantidade_secundarias=@($record.secondaryTags).Count; status=if($record -and @($record.secondaryTags).Count -gt 0){'COM_SECUNDARIAS_NO_TXT'}else{'SEM_SECUNDARIAS_NO_TXT'} } }
$first704 | ConvertTo-Csv -NoTypeInformation | Set-Content -LiteralPath (Join-Path $repo 'reports\first_704_secondary_audit.csv') -Encoding utf8
$coverage=[ordered]@{ initialBatchRaw=704; archiveBatchesRaw=$archive.Count; archiveBatchesUnique=$archiveUnique.Count; overlapInitialVsArchives=$overlap.Count; expectedDistinct=($initialByKey.Count+$archiveUnique.Count-$overlap.Count); sourceFoldersCurrent=$source.Count; sourceTruthRecords=$truth.Count; first704WithSecondary=@($first704|Where-Object status -eq 'COM_SECUNDARIAS_NO_TXT').Count; first704WithoutSecondary=@($first704|Where-Object status -eq 'SEM_SECUNDARIAS_NO_TXT').Count; missingFromSource=($initialByKey.Count+$archiveUnique.Count-$overlap.Count)-$source.Count }
$coverage | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $repo 'reports\revised_batch_coverage.json') -Encoding utf8
$coverage | ConvertTo-Json -Compress
