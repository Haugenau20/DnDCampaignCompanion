# manage-environment.ps1

param (
    [Parameter(Mandatory=$true)]
    [ValidateSet("dev", "prod")]
    [string]$Environment,
    
    [Parameter(Mandatory=$true)]
    [ValidateSet("start", "stop", "restart", "status", "logs", "shell", "export")]
    [string]$Action,
    
    [Parameter(Mandatory=$false)]
    [string]$Service = ""
)

$ErrorActionPreference = "Stop"

# Configuration for different environments
$config = @{
    "dev" = @{
        "composeFile" = Join-Path (Get-Location).Path "docker\docker-compose.dev.yml"
        "envFile" = ".env.development"
        "firebaseDir" = "firebase"
    }
    "prod" = @{
        "composeFile" = Join-Path (Get-Location).Path "docker\docker-compose.prod.yml"
        "envFile" = ".env.production"
    }
}

# Function to check Docker status
function Test-DockerRunning {
    $dockerPath = (Get-Command docker -ErrorAction SilentlyContinue).Source
    
    if (-not $dockerPath) {
        Write-Host "Docker CLI not found. Please install Docker Desktop." -ForegroundColor Red
        return $false
    }
    
    try {
        $null = docker ps -q 2>$null
        return $true
    }
    catch {
        Write-Host "Docker is installed but not running. Please start Docker Desktop." -ForegroundColor Red
        Write-Host "Error: $_" -ForegroundColor Yellow
        return $false
    }
}

# Function to check Firebase CLI
function Test-FirebaseCLI {
    $firebasePath = (Get-Command firebase -ErrorAction SilentlyContinue).Source
    
    if (-not $firebasePath) {
        Write-Host "Firebase CLI not found. Please install it with:" -ForegroundColor Red
        Write-Host "npm install -g firebase-tools" -ForegroundColor Yellow
        return $false
    }
    
    return $true
}

# Function to check if emulators are running
function Test-EmulatorsRunning {
    try {
        $response = Invoke-WebRequest -UseBasicParsing -Uri "http://127.0.0.1:4000" -Method Head -TimeoutSec 2 -ErrorAction SilentlyContinue
        return $true
    } catch {
        return $false
    }
}

# Function to start Firebase emulators
function Start-FirebaseEmulators {
    if (-not (Test-FirebaseCLI)) { 
        return 
    }
    
    $envConfig = $config["dev"]
    
    Write-Host "Starting Firebase emulators..." -ForegroundColor Green
    
    # Check if data directory exists for import
    $dataDir = "./firebase/emulator-data"
    $hasData = (Test-Path $dataDir) -and (Get-ChildItem -Path $dataDir -Recurse -ErrorAction SilentlyContinue).Count -gt 0
    
    if ($hasData) {
        Write-Host "Found existing emulator data to import." -ForegroundColor Cyan
    }
    
    # Change to firebase directory
    Push-Location $envConfig.firebaseDir
    
    try {
        # Start emulators with or without import
        if ($hasData) {
            Write-Host "Starting emulators with data import..." -ForegroundColor Cyan
            Write-Host "Running: firebase emulators:start --import ../firebase/emulator-data" -ForegroundColor Gray
            Start-Process -FilePath "cmd" -ArgumentList @("/c", "firebase", "emulators:start", "--import", "../firebase/emulator-data") -NoNewWindow
        } else {
            Write-Host "Starting emulators..." -ForegroundColor Cyan
            Write-Host "Running: firebase emulators:start" -ForegroundColor Gray
            Start-Process -FilePath "cmd" -ArgumentList @("/c", "firebase", "emulators:start") -NoNewWindow
        }
        
        # Wait for emulators to start
        Write-Host "Waiting for emulators to initialize..." -ForegroundColor Cyan
        $timeout = 30
        $count = 0
        while (-not (Test-EmulatorsRunning) -and $count -lt $timeout) {
            Start-Sleep -Seconds 1
            $count++
        }
        
        if (Test-EmulatorsRunning) {
            Write-Host "Firebase emulators started successfully!" -ForegroundColor Green
            Write-Host "Emulator UI available at: http://localhost:4000" -ForegroundColor Cyan
        } else {
            Write-Host "Emulators failed to start within $timeout seconds." -ForegroundColor Red
        }
    }
    finally {
        Pop-Location
    }
}

# Function to stop Firebase emulators
function Stop-FirebaseEmulators {
    Write-Host "Stopping Firebase emulators..." -ForegroundColor Yellow
    
    # Export data before stopping
    Export-EmulatorData
    
    # Kill Firebase processes using taskkill for more reliable process termination on Windows
    try {
        # Kill any firebase processes
        $firebaseProcesses = Get-Process -Name "firebase*" -ErrorAction SilentlyContinue
        if ($firebaseProcesses) {
            Write-Host "Terminating Firebase processes..." -ForegroundColor Yellow
            $firebaseProcesses | Stop-Process -Force
        }
        
        # Kill any java processes related to Firebase emulators
        $javaProcesses = Get-Process -Name "java" -ErrorAction SilentlyContinue | Where-Object { 
            $_.CommandLine -like "*firebase*" -or $_.CommandLine -like "*emulator*" 
        }
        if ($javaProcesses) {
            Write-Host "Terminating Firebase emulator Java processes..." -ForegroundColor Yellow
            $javaProcesses | Stop-Process -Force
        }
        
        # Use taskkill as fallback for stubborn processes
        & taskkill /F /IM "firebase.exe" /T 2>$null
        & taskkill /F /IM "java.exe" /FI "WINDOWTITLE eq *firebase*" /T 2>$null
        
        Write-Host "Firebase emulators stopped." -ForegroundColor Green
    } catch {
        Write-Host "Warning: Some processes may still be running: $_" -ForegroundColor Yellow
        Write-Host "You may need to manually stop emulator processes." -ForegroundColor Yellow
    }
}

# Function to start environment
function Start-Environment {
    param([string]$Environment)
    
    if ($Environment -eq "dev") {
        if (-not (Test-DockerRunning)) { 
            return 
        }
        if (-not (Test-FirebaseCLI)) { 
            return 
        }
        
        $envConfig = $config[$Environment]
        
        # Copy env file to .env for Docker Compose to use
        if (Test-Path $envConfig.envFile) {
            Copy-Item -Path $envConfig.envFile -Destination ".env" -Force
            Set-EnvironmentVariables -EnvFile $envConfig.envFile
        }
        
        # Start Firebase emulators first
        Start-FirebaseEmulators
        
        # Start frontend container
        Write-Host "Starting frontend container..." -ForegroundColor Green
        $composeEnvArgs = @(
            "-f", $envConfig.composeFile,
            "--env-file", ".env"
        )
        
        try {
            & docker-compose $composeEnvArgs up -d frontend
            Write-Host "Development environment started!" -ForegroundColor Green
            Write-Host "Frontend available at: http://localhost:3000" -ForegroundColor Cyan
            Write-Host "Firebase Emulator UI available at: http://localhost:4000" -ForegroundColor Cyan
        } catch {
            Write-Host "Failed to start frontend container: $_" -ForegroundColor Red
        }
        
    } elseif ($Environment -eq "prod") {
        if (-not (Test-DockerRunning)) { 
            return 
        }
        
        $envConfig = $config[$Environment]
        
        if (Test-Path $envConfig.envFile) {
            Copy-Item -Path $envConfig.envFile -Destination ".env" -Force
            Set-EnvironmentVariables -EnvFile $envConfig.envFile
        }
        
        Write-Host "Starting production environment..." -ForegroundColor Green
        
        $composeEnvArgs = @(
            "-f", $envConfig.composeFile,
            "--env-file", ".env"
        )
        
        try {
            & docker-compose $composeEnvArgs up -d
            Write-Host "Production environment started!" -ForegroundColor Green
            Write-Host "Production UI available at: http://localhost" -ForegroundColor Cyan
        } catch {
            Write-Host "Failed to start production environment: $_" -ForegroundColor Red
        }
    }
}

# Function to stop environment
function Stop-Environment {
    param([string]$Environment)
    
    if ($Environment -eq "dev") {
        # Stop emulators first (this exports data)
        if (Test-EmulatorsRunning) {
            Stop-FirebaseEmulators
        }
        
        # Stop frontend container
        if (Test-DockerRunning) {
            Write-Host "Stopping frontend container..." -ForegroundColor Yellow
            $envConfig = $config[$Environment]
            try {
                & docker-compose -f $envConfig.composeFile down
            } catch {
                Write-Host "Warning: Failed to stop frontend container: $_" -ForegroundColor Yellow
            }
        }
        
    } elseif ($Environment -eq "prod") {
        if (-not (Test-DockerRunning)) { 
            return 
        }
        
        $envConfig = $config[$Environment]
        Write-Host "Stopping production environment..." -ForegroundColor Yellow
        try {
            & docker-compose -f $envConfig.composeFile down
        } catch {
            Write-Host "Warning: Failed to stop production environment: $_" -ForegroundColor Red
        }
    }
}

# Function to restart environment
function Restart-Environment {
    param([string]$Environment)
    
    Stop-Environment -Environment $Environment
    Start-Sleep -Seconds 3
    Start-Environment -Environment $Environment
}

# Function to show environment status
function Show-EnvironmentStatus {
    param([string]$Environment)
    
    Write-Host "Status of $Environment environment:" -ForegroundColor Cyan
    
    if ($Environment -eq "dev") {
        # Check emulators
        if (Test-EmulatorsRunning) {
            Write-Host "✓ Firebase Emulators: Running (http://localhost:4000)" -ForegroundColor Green
        } else {
            Write-Host "✗ Firebase Emulators: Not running" -ForegroundColor Red
        }
        
        # Check frontend container
        if (Test-DockerRunning) {
            $envConfig = $config[$Environment]
            try {
                $containerStatus = & docker-compose -f $envConfig.composeFile ps frontend 2>$null
                if ($containerStatus -match "Up") {
                    Write-Host "✓ Frontend Container: Running (http://localhost:3000)" -ForegroundColor Green
                } else {
                    Write-Host "✗ Frontend Container: Not running" -ForegroundColor Red
                }
            } catch {
                Write-Host "✗ Frontend Container: Status check failed" -ForegroundColor Red
            }
        } else {
            Write-Host "✗ Docker: Not running" -ForegroundColor Red
        }
        
    } elseif ($Environment -eq "prod") {
        if (Test-DockerRunning) {
            $envConfig = $config[$Environment]
            try {
                & docker-compose -f $envConfig.composeFile ps
            } catch {
                Write-Host "✗ Production Environment: Status check failed" -ForegroundColor Red
            }
        } else {
            Write-Host "✗ Docker: Not running" -ForegroundColor Red
        }
    }
}

# Function to show logs
function Show-EnvironmentLogs {
    param([string]$Environment, [string]$Service)
    
    if ($Environment -eq "dev") {
        if ($Service -eq "emulators" -or $Service -eq "") {
            Write-Host "Firebase emulator logs are shown in the terminal where they were started." -ForegroundColor Cyan
            Write-Host "Check the terminal running 'firebase emulators:start'" -ForegroundColor Yellow
        }
        
        if ($Service -eq "frontend" -or $Service -eq "") {
            if (Test-DockerRunning) {
                Write-Host "Showing frontend container logs:" -ForegroundColor Cyan
                $envConfig = $config[$Environment]
                try {
                    & docker-compose -f $envConfig.composeFile logs -f frontend
                } catch {
                    Write-Host "Failed to show frontend logs: $_" -ForegroundColor Red
                }
            }
        }
    } else {
        if (-not (Test-DockerRunning)) { 
            return 
        }
        
        $envConfig = $config[$Environment]
        
        if ($Service -ne "") {
            Write-Host "Showing logs for $Service in $Environment environment:" -ForegroundColor Cyan
            try {
                & docker-compose -f $envConfig.composeFile logs -f $Service
            } catch {
                Write-Host "Failed to show logs for Service: $_" -ForegroundColor Red
            }
        } else {
            Write-Host "Showing logs for $Environment environment:" -ForegroundColor Cyan
            try {
                & docker-compose -f $envConfig.composeFile logs -f
            } catch {
                Write-Host "Failed to show environment logs: $_" -ForegroundColor Red
            }
        }
    }
}

# Function to open shell in container
function Enter-ContainerShell {
    param([string]$Environment, [string]$Service)
    
    if (-not (Test-DockerRunning)) { 
        return 
    }
    
    if ($Environment -eq "dev") {
        if ($Service -eq "" -or $Service -eq "frontend") {
            $Service = "frontend"
        } else {
            Write-Host "In dev environment, only 'frontend' container is available." -ForegroundColor Yellow
            Write-Host "Use: .\manage-environment.ps1 -Environment dev -Action shell -Service frontend" -ForegroundColor Yellow
            return
        }
    }
    
    if ($Service -eq "") {
        Write-Host "Please specify a service." -ForegroundColor Red
        return
    }
    
    $envConfig = $config[$Environment]
    
    Write-Host "Opening shell in $Service container..." -ForegroundColor Cyan
    try {
        & docker-compose -f $envConfig.composeFile exec $Service sh
    } catch {
        Write-Host "Failed to open shell in $Service container: $_" -ForegroundColor Red
    }
}

# Function to export emulator data
function Export-EmulatorData {
    if (-not (Test-EmulatorsRunning)) {
        Write-Host "Emulators are not running. No data to export." -ForegroundColor Yellow
        return
    }
    
    Write-Host "Exporting Firebase emulator data..." -ForegroundColor Cyan
    
    # Create export directory
    $exportDir = "./firebase/emulator-data"
    if (-not (Test-Path $exportDir)) {
        New-Item -Path $exportDir -ItemType Directory -Force | Out-Null
    }
    
    # Change to firebase directory and export
    Push-Location "firebase"
    
    try {
        # Export emulator data using cmd to properly execute firebase
        Write-Host "Running: firebase emulators:export ../firebase/emulator-data --force" -ForegroundColor Gray
        $exportResult = & cmd /c "firebase emulators:export ../firebase/emulator-data --force"
        Write-Host $exportResult -ForegroundColor Gray
        
        # Check results
        if (Test-Path "../firebase/emulator-data") {
            $fileCount = (Get-ChildItem -Path "../firebase/emulator-data" -Recurse -ErrorAction SilentlyContinue).Count
            Write-Host "Successfully exported $fileCount files to ./firebase/emulator-data" -ForegroundColor Green
            
            # List top-level directories
            Write-Host "Data directory structure:" -ForegroundColor Cyan
            Get-ChildItem -Path "../firebase/emulator-data" -Directory -ErrorAction SilentlyContinue | ForEach-Object {
                Write-Host "- $($_.Name)" -ForegroundColor White
            }
        } else {
            Write-Host "No data was exported!" -ForegroundColor Red
        }
    }
    catch {
        Write-Host "Export failed: $_" -ForegroundColor Red
    }
    finally {
        Pop-Location
    }
}

# Function to set environment variables
function Set-EnvironmentVariables {
    param([string]$EnvFile)
    
    if (Test-Path $EnvFile) {
        Write-Host "Loading environment variables from $EnvFile" -ForegroundColor Cyan
        
        Get-Content $EnvFile | ForEach-Object {
            if ($_ -match '^\s*([^#][^=]+)=(.*)$') {
                $name = $matches[1].Trim()
                $value = $matches[2].Trim()
                
                if ($value -match '^"(.*)"$' -or $value -match "^'(.*)'$") {
                    $value = $matches[1]
                }
                
                [Environment]::SetEnvironmentVariable($name, $value, "Process")
            }
        }
    } else {
        Write-Host "Environment file not found: $EnvFile" -ForegroundColor Yellow
    }
}

# Main logic
switch ($Action) {
    "start" {
        Start-Environment -Environment $Environment
    }
    "stop" {
        Stop-Environment -Environment $Environment
    }
    "restart" {
        Restart-Environment -Environment $Environment
    }
    "status" {
        Show-EnvironmentStatus -Environment $Environment
    }
    "logs" {
        Show-EnvironmentLogs -Environment $Environment -Service $Service
    }
    "shell" {
        Enter-ContainerShell -Environment $Environment -Service $Service
    }
    "export" {
        Export-EmulatorData
    }
}