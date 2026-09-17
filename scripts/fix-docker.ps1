# Clears the stale Unix sockets that stop Docker Desktop starting on Windows.
#
#   powershell -ExecutionPolicy Bypass -File scripts/fix-docker.ps1
#
# THE FAILURE THIS FIXES. Docker Desktop crashes on startup with:
#
#   starting services: initializing Ingest server: listening on
#   unix://…/sailor-ingest.sock: remove …: The file cannot be accessed by the
#   system.
#
# and the app then sits there looking like it is booting, or shows an error
# dialog, while `docker info` reports the daemon is unreachable. The WSL distro
# never starts, so nothing else in the project works either.
#
# WHY IT HAPPENS. Windows implements AF_UNIX sockets as reparse points. If
# Docker does not shut down cleanly - a hard power-off, a forced restart, a
# crash - the reparse points survive with no target behind them. They are then
# unopenable AND undeletable: `del`, `Remove-Item` and `fsutil reparsepoint
# delete` all fail with error 123 (invalid filename), because the OS cannot
# resolve the path well enough to act on it. Docker hits exactly the same wall
# on its own files, and dies.
#
# WHY RENAMING THE DIRECTORY WORKS. Renaming a parent folder is a metadata
# operation on ITS parent, so it never has to resolve the broken links inside.
# Docker recreates a clean directory on next start.
#
# THE FOLDERS ARE RENAMED, NOT DELETED. They contain nothing but dead runtime
# sockets, but they are kept anyway - dated, so they are obviously disposable -
# because a script that deletes things in AppData should have to earn that, and
# this one has no need to.
#
# THERE ARE TWO OF THEM, and the second only appears once the first is cleared:
# Docker reports the first blocker it hits and exits, so fixing `run` just
# reveals `docker-secrets-engine` behind it. Both are handled here in one pass.

$ErrorActionPreference = 'Stop'

$stamp  = Get-Date -Format 'yyyyMMdd-HHmmss'
$local  = $env:LOCALAPPDATA
$targets = @(
  (Join-Path $local 'Docker\run'),
  (Join-Path $local 'docker-secrets-engine')
)

Write-Host 'Stopping Docker Desktop...'
Get-Process -Name 'Docker Desktop', 'com.docker.backend' -ErrorAction SilentlyContinue |
  Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 4

$moved = 0
foreach ($dir in $targets) {
  if (-not (Test-Path $dir)) {
    Write-Host "  absent, nothing to do: $dir"
    continue
  }

  $parked = "$dir.stale-$stamp"
  try {
    Move-Item -Path $dir -Destination $parked -ErrorAction Stop
    Write-Host "  cleared: $dir"
    $moved += 1
  } catch {
    # Reported rather than thrown: the other directory may still be fixable,
    # and a partial clear is better than none.
    Write-Warning "  could not rename $dir - $($_.Exception.Message)"
  }
}

Write-Host ''
Write-Host "Parked $moved folder(s) as *.stale-$stamp - safe to delete whenever."
Write-Host 'Starting Docker Desktop...'

Start-Process (Join-Path $local 'Programs\DockerDesktop\Docker Desktop.exe')

Write-Host ''
Write-Host 'Give it a minute, then check with:  docker info'
Write-Host 'Once it responds:                   npm run db:up'
