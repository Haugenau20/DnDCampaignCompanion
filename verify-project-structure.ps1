# verify-project-structure.ps1
# This script verifies that your project structure is consistent after reorganization

$requiredDirectories = @(
    "config",
    "firebase",
    "docker",
    "scripts",
    "docker/config",
    "docker/emulators",
    "docker/emulators/data"
)

$requiredFiles = @{
    # Config files
    "config/tailwind.config.js" = "Tailwind configuration"
    "config/postcss.config.js" = "PostCSS configuration"
    
    # Firebase files
    "firebase/firebase.json" = "Firebase configuration"
    "firebase/firestore.rules" = "Firestore rules"
    "firebase/firestore.indexes.json" = "Firestore indexes"
    "firebase/storage.rules" = "Firebase storage rules"
    "firebase/.firebaserc" = "Firebase project configuration"
    
    # Docker files
    "docker/docker-compose.dev.yml" = "Development Docker Compose configuration"
    "docker/docker-compose.prod.yml" = "Production Docker Compose configuration"
    "docker/Dockerfile.emulators" = "Emulators Dockerfile"
    "docker/Dockerfile.frontend.dev" = "Frontend development Dockerfile"
    "docker/Dockerfile.frontend.prod" = "Frontend production Dockerfile"
    "docker/config/firebase-emulator.json" = "Firebase emulator configuration"
    "docker/config/nginx.conf" = "Nginx configuration"
    "docker/emulator-entrypoint.sh" = "Emulator entrypoint script"
    
    # Script files
    "scripts/manage-environment.ps1" = "Environment management script"
    "scripts/manage-dev-data.ps1" = "Development data management script"
    
    # Root files that should remain
    ".env" = "Environment variables"
    ".env.development" = "Development environment variables"
    ".env.production" = "Production environment variables" 
    "package.json" = "NPM package configuration"
    "package-lock.json" = "NPM package lock"
    "tsconfig.json" = "TypeScript configuration"
    ".gitignore" = "Git ignore file"
    ".dockerignore" = "Docker ignore file"
    "jest.config.ts" = "Jest configuration"
    "README.md" = "Project readme"
    "LICENSE" = "Project license"
}

# Check required directories
Write-Host "Checking required directories..." -ForegroundColor Cyan
$dirMissing = $false
foreach ($dir in $requiredDirectories) {
    if (Test-Path $dir) {
        Write-Host "✅ Found directory: $dir" -ForegroundColor Green
    } else {
        Write-Host "❌ Missing directory: $dir" -ForegroundColor Red
        $dirMissing = $true
    }
}

if ($dirMissing) {
    Write-Host "Some required directories are missing. Please create them." -ForegroundColor Yellow
}

# Check required files
Write-Host "`nChecking required files..." -ForegroundColor Cyan
$fileMissing = $false
foreach ($file in $requiredFiles.Keys) {
    if (Test-Path $file) {
        Write-Host "✅ Found file: $file - $($requiredFiles[$file])" -ForegroundColor Green
    } else {
        Write-Host "❌ Missing file: $file - $($requiredFiles[$file])" -ForegroundColor Red
        $fileMissing = $true
    }
}

if ($fileMissing) {
    Write-Host "Some required files are missing. Please restore them to the correct locations." -ForegroundColor Yellow
}

# Suggest fixes
if ($dirMissing -or $fileMissing) {
    Write-Host "`nSuggested fixes:" -ForegroundColor Yellow
    Write-Host "1. Run the project reorganization script again" -ForegroundColor White
    Write-Host "2. Manually verify paths in your Docker files" -ForegroundColor White
    Write-Host "3. Check that files were moved correctly to their new locations" -ForegroundColor White
} else {
    Write-Host "`n✅ Project structure looks good! All required directories and files are in place." -ForegroundColor Green
}