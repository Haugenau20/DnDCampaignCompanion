# start-dev.ps1
# Combined Firebase Emulators + React Dev Server startup script

param (
    [Parameter(Mandatory=$false)]
    [ValidateSet("start", "stop", "restart", "status", "export")]
    [string]$Action = "start"
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

function Start-DevelopmentEnvironment {
    Write-Host "Starting Full Development Environment..." -ForegroundColor Green
    Write-Host "   Firebase Emulators + React Dev Server" -ForegroundColor Cyan
    Write-Host ""
    
    # Check if data exists for import
    $dataDir = "./firebase/emulator-data"
    $hasData = (Test-Path $dataDir) -and (Get-ChildItem -Path $dataDir -Recurse -ErrorAction SilentlyContinue).Count -gt 0
    
    # Step 1: Start Firebase Emulators
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
        return
    }
    
    # Step 2: Start React Dev Server
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
    Write-Host "To stop everything: .\start-dev.ps1 -Action stop" -ForegroundColor Yellow
}

function Stop-DevelopmentEnvironment {
    Write-Host "Stopping Development Environment..." -ForegroundColor Yellow
    
    # Export emulator data first
    if (Test-EmulatorsRunning) {
        Write-Host "Exporting emulator data..." -ForegroundColor Cyan
        Push-Location "firebase"
        try {
            firebase emulators:export "./emulator-data" --force --config firebase.emulators.json
            Write-Host "   Data exported successfully" -ForegroundColor Green
        } catch {
            Write-Host "   Failed to export data" -ForegroundColor Yellow
        } finally {
            Pop-Location
        }
    }
    
    # Stop all related processes
    Write-Host "Stopping processes..." -ForegroundColor Cyan
    
    try {
        # Stop Firebase processes
        $firebaseProcesses = Get-Process -Name "firebase*" -ErrorAction SilentlyContinue
        if ($firebaseProcesses) {
            Write-Host "   Stopping Firebase processes..." -ForegroundColor Gray
            $firebaseProcesses | Stop-Process -Force
        }
        
        # Stop Java processes (Firebase emulators)
        $javaProcesses = Get-Process -Name "java" -ErrorAction SilentlyContinue
        if ($javaProcesses) {
            Write-Host "   Stopping emulator processes..." -ForegroundColor Gray
            $javaProcesses | Stop-Process -Force
        }
        
        # Stop Node processes (React dev server)
        $nodeProcesses = Get-Process -Name "node" -ErrorAction SilentlyContinue | Where-Object { 
            $_.ProcessName -eq "node" -and $_.MainWindowTitle -like "*npm*" 
        }
        if ($nodeProcesses) {
            Write-Host "   Stopping React dev server..." -ForegroundColor Gray
            $nodeProcesses | Stop-Process -Force
        }
        
        Write-Host "All development processes stopped" -ForegroundColor Green
        
    } catch {
        Write-Host "Some processes may still be running: $_" -ForegroundColor Yellow
        Write-Host "You may need to close terminal windows manually" -ForegroundColor Yellow
    }
}

function Restart-DevelopmentEnvironment {
    Write-Host "Restarting Development Environment..." -ForegroundColor Cyan
    Stop-DevelopmentEnvironment
    Start-Sleep -Seconds 3
    Start-DevelopmentEnvironment
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
    Push-Location "firebase"
    try {
        firebase emulators:export "./emulator-data" --force --config firebase.emulators.json
        Write-Host "Data exported to ./firebase/emulator-data" -ForegroundColor Green
    } catch {
        Write-Host "Failed to export data: $_" -ForegroundColor Red
    } finally {
        Pop-Location
    }
}

function Show-Help {
    Write-Host "D&D Campaign Companion - Development Environment" -ForegroundColor Cyan
    Write-Host "================================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Usage: .\start-dev.ps1 [options]" -ForegroundColor Green
    Write-Host ""
    Write-Host "Actions:" -ForegroundColor Yellow
    Write-Host "  start    - Start Firebase emulators + React dev server (default)" -ForegroundColor White
    Write-Host "  stop     - Stop all development services and export data" -ForegroundColor White
    Write-Host "  restart  - Stop and start all services" -ForegroundColor White
    Write-Host "  status   - Show status of all services" -ForegroundColor White
    Write-Host "  export   - Export emulator data" -ForegroundColor White
    Write-Host ""
    Write-Host "Examples:" -ForegroundColor Cyan
    Write-Host "  .\start-dev.ps1                    # Start everything" -ForegroundColor Gray
    Write-Host "  .\start-dev.ps1 -Action status     # Check status" -ForegroundColor Gray
    Write-Host "  .\start-dev.ps1 -Action stop       # Stop everything" -ForegroundColor Gray
}

# Main script logic
switch ($Action) {
    "start" {
        Start-DevelopmentEnvironment
    }
    "stop" {
        Stop-DevelopmentEnvironment
    }
    "restart" {
        Restart-DevelopmentEnvironment
    }
    "status" {
        Show-DevelopmentStatus
    }
    "export" {
        Export-EmulatorData
    }
    "help" {
        Show-Help
    }
}

# If no action specified or script runs directly, show help
if (-not $Action) {
    Show-Help
}