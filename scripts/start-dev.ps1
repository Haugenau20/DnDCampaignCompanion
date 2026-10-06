# start-dev.ps1
# Combined Firebase Emulators + React Dev Server startup script

param (
    [Parameter(Mandatory=$false)]
    [ValidateSet("start", "stop", "restart", "status", "export")]
    [string]$Action = "start",

    # stop/restart: stop even when the export fails, losing every change since
    # the last successful export. Without it, a failed export leaves the
    # emulators running so nothing is lost (T100, OPS-001).
    [switch]$Force
)

$ErrorActionPreference = "Stop"

# firebase-tools 15 refuses to start the emulators on anything older.
$MinJavaVersion = 21

# The emulators' output while they start, so a start that fails can say why:
# the window they run in closes as soon as they exit.
$EmulatorLog = Join-Path $PSScriptRoot "..\firebase\emulator-start.log"

# The repo's pinned Firebase CLI (firebase/package.json), never the global
# one: the emulators then run the version CI's functions suite tests, whatever
# is installed on the machine (T065). Relative to firebase/, where both the
# export and the start run.
$FirebaseCli = ".\node_modules\.bin\firebase.cmd"

# Installs the pinned CLI when it is missing or not the pinned version, as
# after a bump. Returns whether the pin is in place.
function Install-PinnedFirebaseCli {
    $root = Join-Path $PSScriptRoot "..\firebase"
    $pinned = (Get-Content -Raw (Join-Path $root "package.json") | ConvertFrom-Json).devDependencies.'firebase-tools'
    $installedManifest = Join-Path $root "node_modules\firebase-tools\package.json"
    $installed = if (Test-Path $installedManifest) {
        (Get-Content -Raw $installedManifest | ConvertFrom-Json).version
    } else { $null }
    if ($installed -eq $pinned -and (Test-Path (Join-Path $root $FirebaseCli))) { return $true }

    $found = if ($installed) { $installed } else { "none" }
    Write-Host "Installing the pinned Firebase CLI $pinned (found $found)..." -ForegroundColor Yellow
    # Out-Host: shown, not returned (see Invoke-EmulatorExport).
    npm --prefix firebase ci | Out-Host
    if ($LASTEXITCODE -ne 0) {
        Write-Host "   npm --prefix firebase ci failed." -ForegroundColor Red
        return $false
    }
    return $true
}

# The installed Java's major version, or 0 when there is none. `java -version`
# prints to stderr; run through cmd, the stream is merged before PowerShell
# sees it, so 5.1 never wraps it in an error record.
function Get-JavaMajorVersion {
    if (-not (Get-Command java -ErrorAction SilentlyContinue)) { return 0 }
    $text = cmd /c "java -version 2>&1" | Out-String
    if ($text -match 'version "1\.(\d+)') { return [int]$Matches[1] }  # "1.8.0" is Java 8
    if ($text -match 'version "(\d+)') { return [int]$Matches[1] }
    return 0
}

# Function to check if services are running
function Test-EmulatorsRunning {
    try {
        $response = Invoke-WebRequest -UseBasicParsing -Uri "http://127.0.0.1:4000" -Method Head -TimeoutSec 2 -ErrorAction SilentlyContinue
        return $true
    } catch {
        return $false
    }
}

function Test-ReactDevServer {
    try {
        $response = Invoke-WebRequest -UseBasicParsing -Uri "http://127.0.0.1:3000" -Method Head -TimeoutSec 2 -ErrorAction SilentlyContinue
        return $true
    } catch {
        return $false
    }
}

# The ports this checkout's services listen on: the emulators named in
# firebase/firebase.emulators.json, the emulator hub, logging and Firestore's
# websocket (the CLI's defaults), and the React dev server.
function Get-ProjectPorts {
    $config = Get-Content -Raw "./firebase/firebase.emulators.json" | ConvertFrom-Json
    $ports = @(4400, 4500, 9150, 3000)
    foreach ($emulator in $config.emulators.PSObject.Properties) {
        if ($emulator.Value.port) { $ports += [int]$emulator.Value.port }
    }
    return $ports | Sort-Object -Unique
}

# The processes listening on this checkout's ports, and nothing else. Stop
# used to force-stop every java process on the machine, other projects'
# emulators included (T100, OPS-002).
function Get-ProjectProcessIds {
    $ports = Get-ProjectPorts
    $listeners = Get-NetTCPConnection -State Listen -ErrorAction SilentlyContinue |
        Where-Object { $ports -contains $_.LocalPort -and $_.OwningProcess -gt 0 }
    return $listeners | Select-Object -ExpandProperty OwningProcess -Unique
}

# Exports the running emulators' data. Returns whether the export succeeded:
# `firebase` is a native command, so a failure sets $LASTEXITCODE and never
# reaches a catch (T100, OPS-001).
function Invoke-EmulatorExport {
    if (-not (Install-PinnedFirebaseCli)) { return $false }
    Push-Location "firebase"
    try {
        # Out-Host: the CLI's output is shown, not returned. Returned, it joins
        # the boolean in an array that `if` always reads as true, so a failed
        # export looked like success and `stop` went ahead.
        & $FirebaseCli emulators:export "./emulator-data" --force --config firebase.emulators.json | Out-Host
        return ($LASTEXITCODE -eq 0)
    } catch {
        Write-Host "   $_" -ForegroundColor Red
        return $false
    } finally {
        Pop-Location
    }
}

function Start-DevelopmentEnvironment {
    Write-Host "Starting Full Development Environment..." -ForegroundColor Green
    Write-Host "   Firebase Emulators + React Dev Server" -ForegroundColor Cyan
    Write-Host ""

    $java = Get-JavaMajorVersion
    if ($java -lt $MinJavaVersion) {
        $found = if ($java -eq 0) { "no Java" } else { "Java $java" }
        Write-Host "   The Firebase emulators need Java $MinJavaVersion or later; found $found." -ForegroundColor Red
        Write-Host "   Install it (winget install EclipseAdoptium.Temurin.21.JDK), put it first on PATH, and open a new terminal." -ForegroundColor Yellow
        return $false
    }

    # Check if data exists for import
    $dataDir = "./firebase/emulator-data"
    $hasData = (Test-Path $dataDir) -and (Get-ChildItem -Path $dataDir -Recurse -ErrorAction SilentlyContinue).Count -gt 0
    
    # Step 1: Compile the Cloud Functions. The emulator runs the compiled
    # `lib/`, which git ignores: without this it ran whatever was last built,
    # or nothing (T100, OPS-004).
    Write-Host "Compiling Cloud Functions..." -ForegroundColor Yellow
    # Out-Host for the same reason as the export: shown, not returned.
    npm --prefix firebase/functions run build | Out-Host
    if ($LASTEXITCODE -ne 0) {
        Write-Host "   Cloud Functions failed to compile - not starting." -ForegroundColor Red
        return $false
    }

    # Step 2: Start Firebase Emulators, on the repo's pinned CLI
    if (-not (Install-PinnedFirebaseCli)) { return $false }
    Write-Host "Starting Firebase emulators..." -ForegroundColor Yellow
    
    $import = if ($hasData) { " --import ./emulator-data" } else { "" }
    if ($hasData) {
        Write-Host "   Importing existing emulator data..." -ForegroundColor Gray
    } else {
        Write-Host "   Starting fresh emulators..." -ForegroundColor Gray
    }
    # cmd merges the CLI's stderr; Tee-Object shows it in the window and keeps
    # it in $EmulatorLog. Encoded, so the nested quotes survive Start-Process.
    $command = "Set-Location '$(Resolve-Path firebase)'; " +
        "cmd /c `"$FirebaseCli emulators:start --config firebase.emulators.json$import 2>&1`" | " +
        "Tee-Object -FilePath '$EmulatorLog'"
    $encoded = [Convert]::ToBase64String([Text.Encoding]::Unicode.GetBytes($command))
    # Never quote an earlier run's output as this one's.
    Remove-Item $EmulatorLog -ErrorAction SilentlyContinue
    $emulators = Start-Process -FilePath "powershell" -ArgumentList @("-EncodedCommand", $encoded) -WindowStyle Minimized -PassThru

    # Wait for emulators to start, or to exit trying
    Write-Host "   Waiting for Firebase emulators..." -ForegroundColor Gray
    $timeout = 45
    $count = 0
    while (-not (Test-EmulatorsRunning) -and -not $emulators.HasExited -and $count -lt $timeout) {
        Start-Sleep -Seconds 1
        $count++
        if ($count % 5 -eq 0) {
            Write-Host "." -NoNewline -ForegroundColor Gray
        }
    }
    Write-Host ""

    if (Test-EmulatorsRunning) {
        Write-Host "   Firebase emulators started!" -ForegroundColor Green
    } else {
        if ($emulators.HasExited) {
            Write-Host "   The Firebase emulators exited while starting. Their last output:" -ForegroundColor Red
        } else {
            Write-Host "   Firebase emulators failed to start within $timeout seconds. Their output so far:" -ForegroundColor Red
        }
        Get-Content $EmulatorLog -Tail 15 -ErrorAction SilentlyContinue |
            ForEach-Object { Write-Host "     $_" -ForegroundColor Gray }
        Write-Host "   Full log: $EmulatorLog" -ForegroundColor Yellow
        return $false
    }

    # Step 3: Start React Dev Server
    Write-Host "Starting React dev server..." -ForegroundColor Yellow
    
    # Start React dev server in a new window
    Start-Process -FilePath "powershell" -ArgumentList @("-Command", "npm start") -WindowStyle Normal
    
    # Wait for React dev server to start
    Write-Host "   Waiting for React dev server..." -ForegroundColor Gray
    $timeout = 30
    $count = 0
    while (-not (Test-ReactDevServer) -and $count -lt $timeout) {
        Start-Sleep -Seconds 1
        $count++
        if ($count % 5 -eq 0) {
            Write-Host "." -NoNewline -ForegroundColor Gray
        }
    }
    Write-Host ""
    
    if (Test-ReactDevServer) {
        Write-Host " React dev server started!" -ForegroundColor Green
    } else {
        Write-Host "  React dev server taking longer than expected..." -ForegroundColor Yellow
        Write-Host "   Check the React dev server window for any errors" -ForegroundColor Yellow
    }
    
    # Success summary
    Write-Host ""
    Write-Host "Development Environment Ready!" -ForegroundColor Green
    Write-Host "================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "Your React App: http://localhost:3000" -ForegroundColor Cyan
    Write-Host "Firebase Emulator UI: http://localhost:4000" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Individual emulators:" -ForegroundColor Gray
    Write-Host "  Auth: http://localhost:9099" -ForegroundColor White
    Write-Host "  Firestore: http://localhost:8080" -ForegroundColor White
    Write-Host "  Functions: http://localhost:5001" -ForegroundColor White
    Write-Host "  Storage: http://localhost:9199" -ForegroundColor White
    Write-Host ""
    Write-Host "Edited a Cloud Function? npm --prefix firebase/functions run build" -ForegroundColor Gray
    Write-Host "To stop everything: .\start-dev.ps1 -Action stop" -ForegroundColor Yellow
    return $true
}

function Stop-DevelopmentEnvironment {
    Write-Host "Stopping Development Environment..." -ForegroundColor Yellow

    # Export emulator data first. A failed export stops here, with the
    # emulators still running and their data intact, unless -Force says to
    # lose it (T100, OPS-001).
    if (Test-EmulatorsRunning) {
        Write-Host "Exporting emulator data..." -ForegroundColor Cyan
        if (Invoke-EmulatorExport) {
            Write-Host "   Data exported successfully" -ForegroundColor Green
        } elseif ($Force) {
            Write-Host "   Export failed - stopping anyway (-Force). Changes since the last export are lost." -ForegroundColor Yellow
        } else {
            Write-Host "   Export failed - nothing was stopped, so no data is lost." -ForegroundColor Red
            Write-Host "   Fix the export and try again, or stop without it: .\start-dev.ps1 -Action stop -Force" -ForegroundColor Yellow
            return $false
        }
    }

    # Stop this checkout's processes: whatever listens on its ports, with
    # everything those processes started (the emulators' java, the dev
    # server's workers). Nothing else on the machine is touched.
    Write-Host "Stopping processes..." -ForegroundColor Cyan
    $processIds = @(Get-ProjectProcessIds)
    if ($processIds.Count -eq 0) {
        Write-Host "   Nothing of this project is running" -ForegroundColor Gray
        return $true
    }
    foreach ($processId in $processIds) {
        # Gone already: an earlier `/T` took it down with its parent (the
        # CLI's node takes the emulators' java with it). Asking taskkill again
        # only prints an error, which a caller capturing stderr sees as fatal.
        if (-not (Get-Process -Id $processId -ErrorAction SilentlyContinue)) { continue }
        $name = (Get-Process -Id $processId -ErrorAction SilentlyContinue).ProcessName
        Write-Host "   Stopping $name (PID $processId) and what it started" -ForegroundColor Gray
        taskkill /PID $processId /T /F | Out-Null
    }

    $left = @(Get-ProjectProcessIds)
    if ($left.Count -gt 0) {
        Write-Host "Still listening on this project's ports: PID $($left -join ', ')" -ForegroundColor Yellow
        return $false
    }
    Write-Host "All development processes stopped" -ForegroundColor Green
    return $true
}

function Restart-DevelopmentEnvironment {
    Write-Host "Restarting Development Environment..." -ForegroundColor Cyan
    if (-not (Stop-DevelopmentEnvironment)) {
        Write-Host "Not restarting: the stop did not finish." -ForegroundColor Red
        return $false
    }
    Start-Sleep -Seconds 3
    return (Start-DevelopmentEnvironment)
}

function Show-DevelopmentStatus {
    Write-Host "Development Environment Status" -ForegroundColor Cyan
    Write-Host "==============================" -ForegroundColor Cyan
    Write-Host ""
    
    # Check Firebase Emulators
    if (Test-EmulatorsRunning) {
        Write-Host "Firebase Emulators: Running" -ForegroundColor Green
        Write-Host "   Emulator UI: http://localhost:4000" -ForegroundColor White
        Write-Host "   Auth: http://localhost:9099" -ForegroundColor White
        Write-Host "   Firestore: http://localhost:8080" -ForegroundColor White
        Write-Host "   Functions: http://localhost:5001" -ForegroundColor White
        Write-Host "   Storage: http://localhost:9199" -ForegroundColor White
    } else {
        Write-Host "Firebase Emulators: Not running" -ForegroundColor Red
    }
    
    Write-Host ""
    
    # Check React Dev Server
    if (Test-ReactDevServer) {
        Write-Host "React Dev Server: Running" -ForegroundColor Green
        Write-Host "   Your app: http://localhost:3000" -ForegroundColor White
    } else {
        Write-Host "React Dev Server: Not running" -ForegroundColor Red
    }
    
    Write-Host ""
    
    # Overall status
    if ((Test-EmulatorsRunning) -and (Test-ReactDevServer)) {
        Write-Host "Full development environment is ready!" -ForegroundColor Green
    } elseif ((Test-EmulatorsRunning) -or (Test-ReactDevServer)) {
        Write-Host "Partial environment running - some services need attention" -ForegroundColor Yellow
    } else {
        Write-Host "Development environment is not running" -ForegroundColor Red
        Write-Host "   Run: .\start-dev.ps1 -Action start" -ForegroundColor Yellow
    }
}

function Export-EmulatorData {
    if (-not (Test-EmulatorsRunning)) {
        Write-Host "Emulators not running - nothing to export" -ForegroundColor Red
        return
    }
    
    Write-Host "Exporting emulator data..." -ForegroundColor Cyan
    if (Invoke-EmulatorExport) {
        Write-Host "Data exported to ./firebase/emulator-data" -ForegroundColor Green
        return $true
    }
    Write-Host "Failed to export data" -ForegroundColor Red
    return $false
}

function Show-Help {
    Write-Host "D&D Campaign Companion - Development Environment" -ForegroundColor Cyan
    Write-Host "================================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Usage: .\start-dev.ps1 [options]" -ForegroundColor Green
    Write-Host ""
    Write-Host "Actions:" -ForegroundColor Yellow
    Write-Host "  start    - Start Firebase emulators + React dev server (default)" -ForegroundColor White
    Write-Host "  stop     - Export data, then stop this project's services (-Force: stop even if the export fails)" -ForegroundColor White
    Write-Host "  restart  - Stop and start all services" -ForegroundColor White
    Write-Host "  status   - Show status of all services" -ForegroundColor White
    Write-Host "  export   - Export emulator data" -ForegroundColor White
    Write-Host ""
    Write-Host "Examples:" -ForegroundColor Cyan
    Write-Host "  .\start-dev.ps1                    # Start everything" -ForegroundColor Gray
    Write-Host "  .\start-dev.ps1 -Action status     # Check status" -ForegroundColor Gray
    Write-Host "  .\start-dev.ps1 -Action stop       # Stop everything" -ForegroundColor Gray
}

# Main script logic. A failed action exits nonzero, so a caller can tell.
$succeeded = $true
switch ($Action) {
    "start" {
        $succeeded = Start-DevelopmentEnvironment
    }
    "stop" {
        $succeeded = Stop-DevelopmentEnvironment
    }
    "restart" {
        $succeeded = Restart-DevelopmentEnvironment
    }
    "status" {
        Show-DevelopmentStatus
    }
    "export" {
        $succeeded = Export-EmulatorData
    }
    "help" {
        Show-Help
    }
}

# If no action specified or script runs directly, show help
if (-not $Action) {
    Show-Help
}

if ($succeeded -eq $false) { exit 1 }