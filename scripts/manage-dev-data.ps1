# manage-dev-data.ps1

param (
    [Parameter(Mandatory=$true)]
    [ValidateSet("generate", "clear", "export", "help")]
    [string]$Action
)

$ErrorActionPreference = "Stop"

# Function to check if emulators are running
function Test-EmulatorsRunning {
    try {
        $response = Invoke-WebRequest -UseBasicParsing -Uri "http://127.0.0.1:4000" -Method Head -TimeoutSec 2 -ErrorAction SilentlyContinue
        return $true
    } 
    catch {
        return $false
    }
}

# Function to check Firebase CLI availability
function Test-FirebaseCLI {
    $firebasePath = (Get-Command firebase -ErrorAction SilentlyContinue).Source
    return $null -ne $firebasePath
}

# Function to display help information
function Show-Help {
    Write-Host "DnD Campaign Companion Development Data Manager" -ForegroundColor Cyan
    Write-Host "---------------------------------------------" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Available commands:" -ForegroundColor Green
    Write-Host "  .\manage-dev-data.ps1 -Action generate" -ForegroundColor Yellow
    Write-Host "    Generates comprehensive sample data for your development environment:"
    Write-Host "    - 8 unique users (2 users belong to both groups)"
    Write-Host "    - 2 groups with appropriate user memberships"
    Write-Host "    - 2 campaigns per group (4 total)"
    Write-Host "    - Campaign content including chapters, NPCs, locations, quests, and rumors"
    Write-Host ""
    Write-Host "  .\manage-dev-data.ps1 -Action export" -ForegroundColor Yellow
    Write-Host "    Exports current emulator data to ./firebase/emulator-data"
    Write-Host ""
    Write-Host "  .\manage-dev-data.ps1 -Action clear" -ForegroundColor Yellow
    Write-Host "    Clears stored emulator data"
    Write-Host ""
    Write-Host "  .\manage-dev-data.ps1 -Action help" -ForegroundColor Yellow
    Write-Host "    Shows this help message"
    Write-Host ""
    Write-Host "Prerequisites:" -ForegroundColor Cyan
    Write-Host "  1. Start the development environment first:"
    Write-Host "     .\manage-environment.ps1 -Environment dev -Action start"
    Write-Host ""
    Write-Host "  2. Or manually start Firebase emulators:"
    Write-Host "     cd firebase && firebase emulators:start --config firebase.emulators.json"
    Write-Host ""
    Write-Host "Note: The simplified setup runs emulators locally (not in Docker)" -ForegroundColor Cyan
    Write-Host "Frontend still runs in Docker for consistent Node.js environment" -ForegroundColor Cyan
}

# Function to generate sample data for development
function Generate-SampleData {
    # Check prerequisites
    if (-not (Test-FirebaseCLI)) {
        Write-Host "Firebase CLI not found. Please install it with:" -ForegroundColor Red
        Write-Host "npm install -g firebase-tools" -ForegroundColor Yellow
        return
    }

    if (-not (Test-EmulatorsRunning)) {
        Write-Host "Firebase Emulators are not running." -ForegroundColor Red
        Write-Host ""
        Write-Host "Please start them with one of these methods:" -ForegroundColor Yellow
        Write-Host "  Option 1 (Recommended): .\manage-environment.ps1 -Environment dev -Action start" -ForegroundColor Cyan
        Write-Host "  Option 2 (Manual): cd firebase && firebase emulators:start --config firebase.emulators.json" -ForegroundColor Cyan
        return
    }

    Write-Host "Generating comprehensive D&D campaign sample data..." -ForegroundColor Cyan
    
    try {
        # Copy .env file for the script to use
        Copy-Item -Path ".env.development" -Destination ".env" -Force
        
        # Run the generator script
        npx ts-node ./src/utils/__dev__/generateSampleData.ts
        
        Write-Host "Sample data generated successfully!" -ForegroundColor Green
        Write-Host "You can view the data in the Firebase Emulator UI at http://localhost:4000" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "Tip: Use '.\manage-dev-data.ps1 -Action export' to save this data for later use" -ForegroundColor Yellow
    } 
    catch {
        Write-Host "Failed to generate sample data: $_" -ForegroundColor Red
        Write-Host ""
        Write-Host "Common fixes:" -ForegroundColor Yellow
        Write-Host "  1. Ensure emulators are running: .\manage-environment.ps1 -Environment dev -Action status" -ForegroundColor Cyan
        Write-Host "  2. Check if TypeScript dependencies are installed: npm install" -ForegroundColor Cyan
        Write-Host "  3. Verify .env.development file exists" -ForegroundColor Cyan
    }
}

# Function to export emulator data
function Export-EmulatorData {
    if (-not (Test-FirebaseCLI)) {
        Write-Host "Firebase CLI not found. Please install it with:" -ForegroundColor Red
        Write-Host "npm install -g firebase-tools" -ForegroundColor Yellow
        return
    }

    if (-not (Test-EmulatorsRunning)) {
        Write-Host "Firebase Emulators are not running. Cannot export data." -ForegroundColor Red
        Write-Host "Please start them first: .\manage-environment.ps1 -Environment dev -Action start" -ForegroundColor Yellow
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
        Write-Host "Exporting to ../firebase/emulator-data..." -ForegroundColor Cyan
        firebase emulators:export "../firebase/emulator-data" --force --config firebase.emulators.json
        
        # Check results
        if (Test-Path "../firebase/emulator-data") {
            $fileCount = (Get-ChildItem -Path "../firebase/emulator-data" -Recurse -ErrorAction SilentlyContinue).Count
            Write-Host "Successfully exported $fileCount files!" -ForegroundColor Green
            
            # Show what was exported
            Write-Host "Exported data structure:" -ForegroundColor Cyan
            Get-ChildItem -Path "../firebase/emulator-data" -Directory -ErrorAction SilentlyContinue | ForEach-Object {
                Write-Host "- $($_.Name)" -ForegroundColor White
            }
            
            Write-Host ""
            Write-Host "This data will be automatically imported next time you start the emulators." -ForegroundColor Green
        } 
        else {
            Write-Host "Export failed - no data directory created." -ForegroundColor Red
        }
    }
    catch {
        Write-Host "Export failed: $_" -ForegroundColor Red
    }
    finally {
        Pop-Location
    }
}

# Function to clear emulator data
function Clear-EmulatorData {
    Write-Host "Clearing stored emulator data..." -ForegroundColor Yellow
    
    $dataDir = "./firebase/emulator-data"
    
    if (Test-Path $dataDir) {
        try {
            Remove-Item -Path $dataDir -Recurse -Force
            Write-Host "Emulator data cleared successfully." -ForegroundColor Green
            Write-Host "Next time you start emulators, they will start with fresh data." -ForegroundColor Cyan
        }
        catch {
            Write-Host "Failed to clear data: $_" -ForegroundColor Red
        }
    } 
    else {
        Write-Host "No stored emulator data found to clear." -ForegroundColor Yellow
    }
}

# Main script execution
switch ($Action) {
    "generate" {
        Generate-SampleData
    }
    "export" {
        Export-EmulatorData
    }
    "clear" {
        Clear-EmulatorData
    }
    "help" {
        Show-Help
    }
}