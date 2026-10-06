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
    Push-Location "firebase"
    try {
        firebase emulators:export "./emulator-data" --force --config firebase.emulators.json
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
    
    # Check if data exists for import
    $dataDir = "./firebase/emulator-data"
    $hasData = (Test-Path $dataDir) -and (Get-ChildItem -Path $dataDir -Recurse -ErrorAction SilentlyContinue).Count -gt 0
    
    # Step 1: Compile the Cloud Functions. The emulator runs the compiled
    # `lib/`, which git ignores: without this it ran whatever was last built,
    # or nothing (T100, OPS-004).
    Write-Host "Compiling Cloud Functions..." -ForegroundColor Yellow
    npm --prefix firebase/functions run build
    if ($LASTEXITCODE -ne 0) {
        Write-Host "   Cloud Functions failed to compile - not starting." -ForegroundColor Red
        return $false
    }

    # Step 2: Start Firebase Emulators
    Write-Host "Starting Firebase emulators..." -ForegroundColor Yellow
    
    Push-Location "firebase"
    try {
        if ($hasData) {
            Write-Host "   Importing existing emulator data..." -ForegroundColor Gray
            Start-Process -FilePath "powershell" -ArgumentList @("-Command", "firebase emulators:start --config firebase.emulators.json --import ./emulator-data") -WindowStyle Minimized
        } else {
            Write-Host "   Starting fresh emulators..." -ForegroundColor Gray
            Start-Process -FilePath "powershell" -ArgumentList @("-Command", "firebase emulators:start --config firebase.emulators.json") -WindowStyle Minimized
        }
    }
    finally {
        Pop-Location
    }
    
    # Wait for emulators to start
    Write-Host "   Waiting for Firebase emulators..." -ForegroundColor Gray
    $timeout = 45
    $count = 0
    while (-not (Test-EmulatorsRunning) -and $count -lt $timeout) {
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
        Write-Host "   Firebase emulators failed to start within $timeout seconds" -ForegroundColor Red
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