<#
.SYNOPSIS
Selectively copies files based on specified application features to a destination directory, with support for directory patterns.

.DESCRIPTION
The copyFeatureFiles.ps1 script allows developers to copy only the relevant files needed
for working on specific features or components of the DnD Campaign Companion application. Multiple features can be 
selected at once, and files appearing in multiple selected feature lists are only copied once.

This script supports specifying entire directories (by ending paths with a slash) to include all files
within those directories. This improves maintainability as new files added to those directories will
automatically be included in future script runs without needing to update the script.

This approach helps reduce cognitive load and improve performance when working with large codebases by
limiting the working set to only the files relevant to the current development task.

.PARAMETER SourcePath
Specifies the root directory of the source code. Default is the current directory ('.').

.PARAMETER DestinationPath
Specifies the directory where files will be copied. Default is '..\DnDCampaignCompanionFileDump'.
The destination directory will be created if it doesn't exist.

.PARAMETER Features
Specifies which features' files to copy. This parameter accepts multiple values.
Valid options include:
- UserManagement: User authentication and profile management
- HomePage: The home pgae
- StoryPage: Story and saga viewing components
- QuestPage: Quest tracking and management
- NPCPage: NPC directory and management
- RumorPage: Rumor collection and management
- LocationPage: Location directory and management
- Note: Note taking and Content Extraction
- Themes: Theme system and styling
- Core: Core UI components
- Search: Search functionality
- Navigation: Navigation system
- Firebase: Firebase integration
- FbFunctions: Firebase Functions
- Ai: AI integration for content generation
- Layout: Layout components
- Types: Type definitions and interfaces
- DataHooks: Data fetching hooks
- ContextProviders: React context providers
- Infrastructure: Build and configuration files
- CrossFeatureComponents: Components used across multiple features
- FormComponents: Form-related components and validation
- Analytics: Analytics and monitoring
- GroupManagement: Group management features
- CampaignManagement: Campaign management features
- AdminPanel: Administrative features
- Test: Tests
- Docker: Docker files
- All: All files (excluding patterns in the exclusion list)

Default is 'All'.

.EXAMPLE
.\copyFeatureFiles.ps1 -Features UserManagement
# Copies only files related to user management to the default destination.

.EXAMPLE
.\copyFeatureFiles.ps1 -Features Core,Themes
# Copies files related to core components and theme system to the default destination.

.EXAMPLE
.\copyFeatureFiles.ps1 -Features Firebase,DataHooks -DestinationPath "C:\temp\firebase-work"
# Copies Firebase integration and data hooks files to a custom destination.

.EXAMPLE
.\copyFeatureFiles.ps1 -Features Layout,Navigation,Core -SourcePath "C:\projects\dnd-campaign-companion"
# Copies layout, navigation, and core components from a specific source path.

.EXAMPLE
.\copyFeatureFiles.ps1 -Features All
# Copies all files (excluding specific patterns) to the default destination.

.NOTES
File Name      : copyFeatureFiles.ps1
Author         : DnD Campaign Companion Developer
Prerequisite   : PowerShell 5.0 or later
Version        : 1.2.0
Last Updated   : 2025-03-13

The script maintains exclusion patterns to skip files like node_modules, build artifacts, etc.

Directory patterns are specified by ending a path with a forward or backward slash:
- "src/components/core/" will include all files in the core directory and subdirectories
- "src/types/user.ts" will include only the specific file

.OUTPUTS
The script outputs progress messages and a summary of copied files.
- Green text indicates successful operations
- Yellow text indicates informational messages
- Red text indicates warnings or errors
#>

param(
    [Parameter(Mandatory=$false)]
    [string]$SourcePath = '.',
    
    [Parameter(Mandatory=$false)]
    [string]$DestinationPath = '..\DnDCampaignCompanionFileDump',
    
    [Parameter(Mandatory=$false)]
    [ValidateSet('UserManagement', 'HomePage', 'StoryPage', 'QuestPage', 'NPCPage', 'RumorPage', 'LocationPage', 
                'Note', 'Themes', 'Core', 'Search', 'Navigation', 'Firebase', 'FbFunctions', 'Ai', 'Layout', 'Types','DataHooks', 
                'ContextProviders', 'Infrastructure', 'CrossFeatureComponents', 'FormComponents', 
                'Analytics', 'GroupManagement', 'CampaignManagement', 'AdminPanel', 'Test', 'Docker', 'All')]
    [string[]]$Features = @('All')
)

# Create destination directory if it doesn't exist
if (-not (Test-Path -Path $DestinationPath)) {
    New-Item -ItemType Directory -Path $DestinationPath | Out-Null
    Write-Host "Created destination directory: $DestinationPath" -ForegroundColor Green
} else {
    Write-Host "Deleting files at: $DestinationPath" -ForegroundColor Yellow
    Remove-Item $DestinationPath\* -Force -Recurse
}

# Define feature-specific file lists with directory support
$featureFiles = @{
    # User Management
    UserManagement = @(
        "src/types/user.ts",
        "src/services/firebase/user/",
        "src/services/firebase/auth/",
        "src/services/index.ts",
        "src/hooks/useSessionManager.ts",
        "src/context/firebase/hooks/useUser.ts",
        "src/context/firebase/hooks/useAuth.ts",
        "src/context/firebase/FirebaseContext.tsx",
        "src/components/features/auth/",
        "src/components/core/Button.tsx",
        "src/components/core/Input.tsx",
        "src/components/core/Typography.tsx",
        "src/components/core/Dialog.tsx",
        "src/components/layout/Header.tsx",
        "src/components/shared/ErrorBoundary.tsx",
        "src/pages/HomePage.tsx",
        "src/utils/user-utils.ts",
        "src/App.tsx",
        "src/index.tsx",
        "functions/src/userManagement/"
    )

    HomePage = @(
        "src/pages/HomePage.tsx",
        "src/App.tsx",
        "src/index.tsx",
        "src/components/features/layouts/",
        "src/components/layout/"
    )
    
    # Story Pages
    StoryPage = @(
        "src/types/story.ts",
        "src/types/saga.ts",
        "src/pages/story/",
        "src/hooks/useChapterData.ts",
        "src/context/StoryContext.tsx",
        "src/components/layout/sidebars/StorySidebar.tsx",
        "src/components/features/story/",
        "src/components/core/Typography.tsx",
        "src/components/core/Card.tsx",
        "src/components/core/Button.tsx",
        "src/components/layout/Layout.tsx",
        "src/components/layout/Sidebar.tsx",
        "src/components/layout/Breadcrumb.tsx",
        "src/components/layout/Navigation.tsx",
        "src/components/layout/Header.tsx",
        "src/components/shared/SearchBar.tsx",
        "src/components/shared/ErrorBoundary.tsx",
        "src/hooks/useNavigation.ts",
        "src/hooks/useSearch.ts",
        "src/utils/navigation.ts",
        "src/context/NavigationContext.tsx",
        "src/context/SearchContext.tsx",
        "src/services/firebase/data/DocumentService.ts",
        "src/App.tsx",
        "docs/requirements/chapter-management.md"
    )
    
    # Quest Pages
    QuestPage = @(
        "src/types/quest.ts",
        "src/pages/quests/",
        "src/hooks/useQuestData.ts",
        "src/context/QuestContext.tsx",
        "src/components/layout/sidebars/QuestSidebar.tsx",
        "src/components/features/quests/",
        "src/components/features/rumors/ConvertToQuestDialog.tsx",
        "src/components/core/Card.tsx",
        "src/components/core/Button.tsx",
        "src/components/core/Input.tsx",
        "src/components/core/Dialog.tsx",
        "src/components/core/Typography.tsx",
        "src/components/layout/Layout.tsx",
        "src/components/layout/Sidebar.tsx",
        "src/components/layout/Breadcrumb.tsx",
        "src/components/layout/Navigation.tsx",
        "src/components/shared/SearchBar.tsx",
        "src/components/shared/ErrorBoundary.tsx",
        "src/hooks/useNavigation.ts",
        "src/hooks/useSearch.ts",
        "src/context/NavigationContext.tsx",
        "src/context/SearchContext.tsx",
        "src/utils/search.ts",
        "src/types/search.ts",
        "src/services/firebase/data/DocumentService.ts",
        "src/App.tsx"
    )
    
    # NPC Pages
    NPCPage = @(
        "src/types/npc.ts",
        "src/pages/npcs/",
        "src/hooks/useNPCData.ts",
        "src/context/NPCContext.tsx",
        "src/components/features/npcs/",
        "src/components/core/Card.tsx",
        "src/components/core/Button.tsx",
        "src/components/core/Input.tsx",
        "src/components/core/Dialog.tsx",
        "src/components/core/Typography.tsx",
        "src/components/layout/Layout.tsx",
        "src/components/layout/Sidebar.tsx",
        "src/components/layout/Breadcrumb.tsx",
        "src/components/layout/Navigation.tsx",
        "src/components/shared/SearchBar.tsx",
        "src/components/shared/ErrorBoundary.tsx",
        "src/hooks/useNavigation.ts",
        "src/hooks/useSearch.ts",
        "src/context/NavigationContext.tsx",
        "src/context/SearchContext.tsx",
        "src/utils/search.ts",
        "src/types/search.ts",
        "src/services/firebase/data/DocumentService.ts",
        "src/App.tsx"
    )
    
    # Rumor Pages
    RumorPage = @(
        "src/types/rumor.ts",
        "src/pages/rumors/",
        "src/hooks/useRumorData.ts",
        "src/context/RumorContext.tsx",
        "src/components/features/rumors/",
        "src/components/core/Card.tsx",
        "src/components/core/Button.tsx",
        "src/components/core/Input.tsx",
        "src/components/core/Dialog.tsx",
        "src/components/core/Typography.tsx",
        "src/components/layout/Layout.tsx",
        "src/components/layout/Sidebar.tsx",
        "src/components/layout/Breadcrumb.tsx",
        "src/components/layout/Navigation.tsx",
        "src/components/shared/SearchBar.tsx",
        "src/components/shared/ErrorBoundary.tsx",
        "src/hooks/useNavigation.ts",
        "src/hooks/useSearch.ts",
        "src/context/NavigationContext.tsx",
        "src/context/SearchContext.tsx",
        "src/utils/search.ts",
        "src/types/search.ts",
        "src/services/firebase/data/DocumentService.ts",
        "src/App.tsx",
        "docs/design/ui/page-layouts/rumors.md",
        "docs/requirements/rumor-management.md"
    )
    
    # Location Pages
    LocationPage = @(
        "src/types/location.ts",
        "src/pages/locations/",
        "src/hooks/useLocationData.ts",
        "src/context/LocationContext.tsx",
        "src/components/features/locations/",
        "src/components/core/Card.tsx",
        "src/components/core/Button.tsx",
        "src/components/core/Input.tsx",
        "src/components/core/Dialog.tsx",
        "src/components/core/Typography.tsx",
        "src/components/layout/Layout.tsx",
        "src/components/layout/Sidebar.tsx",
        "src/components/layout/Breadcrumb.tsx",
        "src/components/layout/Navigation.tsx",
        "src/components/shared/SearchBar.tsx",
        "src/components/shared/ErrorBoundary.tsx",
        "src/hooks/useNavigation.ts",
        "src/hooks/useSearch.ts",
        "src/context/NavigationContext.tsx",
        "src/context/SearchContext.tsx",
        "src/utils/search.ts",
        "src/types/search.ts",
        "src/services/firebase/data/DocumentService.ts",
        "src/App.tsx"
    )

    # Note Taking and Content Extraction
    Note = @(
        "src/types/note.ts",
        "src/pages/notes/",
        "src/hooks/useNoteData.ts",
        "src/context/NoteContext.tsx",
        "src/components/features/notes/",
        "src/components/core/Card.tsx",
        "src/components/core/Button.tsx",
        "src/components/core/Input.tsx",
        "src/components/core/Dialog.tsx",
        "src/components/core/Typography.tsx",
        "src/components/layout/Layout.tsx",
        "src/components/layout/Breadcrumb.tsx",
        "src/components/layout/Navigation.tsx",
        "src/components/shared/SearchBar.tsx",
        "src/components/shared/ErrorBoundary.tsx",
        "src/hooks/useNavigation.ts",
        "src/hooks/useSearch.ts",
        "src/context/NavigationContext.tsx",
        "src/context/SearchContext.tsx",
        "src/utils/search.ts",
        "src/types/search.ts",
        "src/services/firebase/data/DocumentService.ts",
        "src/App.tsx"
    )
    
    # Themes
    Themes = @(
        "src/utils/theme-utils.ts",
        "src/types/theme.ts",
        "src/themes/",
        "src/styles/themes/",
        "src/styles/globals.css",
        "src/context/ThemeContext.tsx",
        "src/components/shared/ThemeSelector.tsx",
        "src/components/layout/Layout.tsx",
        "src/components/layout/Header.tsx",
        "src/components/layout/Footer.tsx",
        "src/components/layout/Sidebar.tsx",
        "src/components/core/Button.tsx",
        "src/components/core/Card.tsx",
        "src/components/core/Typography.tsx",
        "src/components/core/Input.tsx",
        "src/components/core/Dialog.tsx",
        "src/App.tsx",
        "src/index.tsx",
        "tailwind.config.js",
        "postcss.config.js"
    )
    
    # Core Components
    Core = @(
        "src/components/core/"
        "src/styles/globals.css",
        "src/utils/theme-utils.ts",
        "src/types/theme.ts",
        "tailwind.config.js",
        "postcss.config.js"
    )
    
    # Search
    Search = @(
        "src/services/search/",
        "src/components/shared/SearchBar.tsx",
        "src/context/SearchContext.tsx",
        "src/hooks/useSearch.ts",
        "src/utils/search.ts",
        "src/types/search.ts",
        "src/components/layout/Header.tsx",
        "src/components/core/Input.tsx"
    )
    
    # Navigation
    Navigation = @(
        "src/context/NavigationContext.tsx",
        "src/hooks/useNavigation.ts",
        "src/utils/navigation.ts",
        "src/components/layout/Navigation.tsx",
        "src/components/layout/Breadcrumb.tsx",
        "src/components/layout/Header.tsx",
        "src/components/layout/Sidebar.tsx",
        "src/components/layout/sidebars/",
        "src/components/shared/ContextSwitcher.tsx",
        "src/App.tsx"
    )
    
    # Firebase
    Firebase = @(
        "src/services/firebase/",
        "src/services/index.ts",
        "src/hooks/useFirebaseData.ts",
        "src/context/firebase/",
        "src/types/user.ts",
        "src/hooks/useNPCData.ts",
        "src/hooks/useLocationData.ts",
        "src/hooks/useRumorData.ts",
        "src/hooks/useQuestData.ts",
        "src/hooks/useChapterData.ts",
        "src/hooks/useSessionManager.ts",
        "firebase/"
    )

    # Firebase Functions
    FbFunctions = @(
        "firebase/"
    )

    # AI Integration
    Ai = @(
        "src/hooks/useOpenAIExtractor.ts",
        "src/services/firebase/ai/",
        "src/services/openai/",
        "src/components/core/Button.tsx",
        "src/components/core/Input.tsx",
        "src/components/core/Dialog.tsx",
        "src/components/core/Typography.tsx",
        "src/App.tsx"
    )
    
    # Layout
    Layout = @(
        "src/components/layout/",
        "src/styles/",
        "src/themes/",
        "src/components/shared/ThemeSelector.tsx",
        "src/components/shared/ContextSwitcher.tsx",
        "src/components/features/layouts/"
    )

    Types = @(
        "src/types/",
        "src/services/firebase/types/",
        "src/services/search/types/",
        "src/context/firebase/types/",
        "src/context/types/"
    )
    
    # Data Hooks
    DataHooks = @(
        "src/hooks/",
        "src/services/firebase/",
        "src/services/search/SearchService.ts",
        "src/services/index.ts",
        "src/context/firebase/hooks/"
    )
    
    # Context Providers
    ContextProviders = @(
        "src/context/",
        "src/App.tsx"
    )
    
    # Infrastructure
    Infrastructure = @(
        "tailwind.config.js",
        "postcss.config.js",
        "package.json",
        "tsconfig.json",
        ".github/workflows/",
        "src/config/",
        "src/scripts/",
        "firebase/firebase.json",
        "firebase/.firebaserc",
        "functions/tsconfig.json",
        "functions/package.json"
    )
    
    # Cross Feature Components
    CrossFeatureComponents = @(
        "src/components/shared/",
        "src/components/features/rumors/ConvertToQuestDialog.tsx",
        "src/components/features/rumors/CombineRumorsDialog.tsx",
        "src/components/features/locations/LocationCombobox.tsx",
        "src/components/core/Card.tsx",
        "src/components/core/Button.tsx",
        "src/components/core/Input.tsx",
        "src/components/core/Dialog.tsx",
        "src/components/core/Typography.tsx",
        "src/utils/attribution-utils.ts"
    )
    
    # Form Components
    FormComponents = @(
        "src/components/core/Input.tsx",
        "src/components/core/Button.tsx",
        "src/components/core/Dialog.tsx",
        "src/components/features/rumors/RumorForm.tsx",
        "src/components/features/quests/QuestFormSections.tsx",
        "src/components/features/quests/QuestEditForm.tsx",
        "src/components/features/quests/QuestCreateForm.tsx",
        "src/components/features/npcs/NPCForm.tsx",
        "src/components/features/npcs/NPCEditForm.tsx",
        "src/components/features/locations/LocationFormSections.tsx",
        "src/components/features/locations/LocationEditForm.tsx",
        "src/components/features/locations/LocationCreateForm.tsx",
        "src/components/features/auth/SignInForm.tsx",
        "src/components/features/auth/RegistrationForm.tsx",
        "src/components/features/contact/ContactForm.tsx"
    )
    
    # Analytics
    Analytics = @(
        "src/App.tsx",
        "src/index.tsx",
        "src/services/index.ts",
        "src/utils/attribution-utils.ts",
        "src/components/shared/AttributionInfo.tsx"
    )

    # Group Management
    GroupManagement = @(
        "src/services/firebase/group/",
        "src/context/firebase/hooks/useGroups.ts",
        "src/context/firebase/hooks/useInvitations.ts",
        "src/components/features/groups/",
        "src/components/core/Dialog.tsx",
        "src/components/core/Button.tsx",
        "src/components/core/Input.tsx",
        "src/services/firebase/core/",
        "docs/requirements/group-scaling.md",
        "functions/src/userManagement/removeUserFromGroup.ts"
    )
    
    # Campaign Management
    CampaignManagement = @(
        "src/services/firebase/campaign/",
        "src/context/firebase/hooks/useCampaigns.ts",
        "src/components/features/campaigns/",
        "src/components/core/Dialog.tsx",
        "src/components/core/Button.tsx",
        "src/components/core/Input.tsx",
        "src/services/firebase/core/"
    )
    
    # Admin Panel
    AdminPanel = @(
        "src/components/features/auth/adminPanel/",
        "src/services/firebase/user/",
        "src/services/firebase/group/",
        "src/services/firebase/campaign/",
        "src/services/firebase/auth/",
        "src/context/firebase/hooks/useUser.ts",
        "src/context/firebase/hooks/useGroups.ts",
        "src/context/firebase/hooks/useCampaigns.ts",
        "src/components/core/Dialog.tsx",
        "src/components/core/Button.tsx",
        "src/components/core/Input.tsx",
        "src/components/core/Typography.tsx"
    )

    Test = @(
        "src/setupTests.ts",
        "src/__mocks__/",
        "src/utils/__dev__/sessionTester.ts",
        "src/test-utils/",
        "src/components/core/__tests__/",
        "jest.config.ts"
    )

    Docker = @(
        "docker/docker-compose.dev.yml",
        "docker/docker-compose.prod.yml",
        ".env",
        ".env.development",
        ".env.production",
        "scripts/manage-environment.ps1",
        ".dockerignore",
        "docker/",
        "docker/config/",
        "docker/emulators/",
        "src/utils/__dev__/dndSampleDataGenerator.ts",
        "src/utils/__dev__/generateSampleData.ts"
    )
}

$alwaysIncludeFiles = @(
    "projectStructure.txt",
    "package.json",
    "tsconfig.json", 
    "src/constants/time.ts"
)

# Predefined exclusion patterns
$excludePatterns = @(
    "^.*\\node_modules\\.*",        # Exclude node_modules folder
    "^.*\\build\\.*",               # Exclude build folder
    "^.*\\package-lock.json$",      # Exclude package-lock.json file
    "^.*\\.firebase\\.*",           # Exclude .firebase folder
    "^.*\\copyFeatureFiles.ps1$",   # This file
    "^.*\\copyfiles.ps1$",          # Other copy script
    "^.*\\dirTree.ps1$",             # Directory tree script
    "^.*\\emulators\\data\\.*"
    "^.*\\firebase\\functions\\lib\\.*"
)

Write-Host "Selected Features: $($Features -join ', ')" -ForegroundColor Cyan

# Get files to copy based on selected features
$uniqueFilePaths = @{}  # Use a hashtable to track unique files

if ($Features -contains 'All') {
    Write-Host "You selected 'All', will copy all files excluding patterns..." -ForegroundColor Yellow
    
    # Get all files recursively, excluding specified patterns
    $allFiles = Get-ChildItem -Path $SourcePath -File -Recurse | Where-Object {
        $fullPath = $_.FullName
        $exclude = $false
        
        foreach ($pattern in $excludePatterns) {
            if ($fullPath -match $pattern) {
                $exclude = $true
                break
            }
        }
        
        -not $exclude
    }
    
    foreach ($file in $allFiles) {
        if (-not $uniqueFilePaths.ContainsKey($file.FullName)) {
            $uniqueFilePaths[$file.FullName] = $file
        }
    }
} else {
    # Process each selected feature
    foreach ($feature in $Features) {
        $featureFileList = $featureFiles[$feature]
        
        Write-Host "Processing feature '$feature' with $($featureFileList.Count) paths..." -ForegroundColor Yellow
        
        foreach ($path in $featureFileList) {
            # Convert forward slashes to backslashes
            $path = $path -replace '/', '\'
            $fullPath = Join-Path -Path $SourcePath -ChildPath $path
            
            # Check if path ends with a directory separator - if yes, it's a directory
            if ($path.EndsWith('\') -or $path.EndsWith('/')) {
                if (Test-Path -Path $fullPath -PathType Container) {
                    Write-Host "  Processing directory: $fullPath" -ForegroundColor Cyan
                    
                    # Get all files in this directory
                    $dirFiles = Get-ChildItem -Path $fullPath -File -Recurse
                    
                    foreach ($file in $dirFiles) {
                        $filePath = $file.FullName
                        
                        # Check exclusion patterns
                        $exclude = $false
                        foreach ($pattern in $excludePatterns) {
                            if ($filePath -match $pattern) {
                                $exclude = $true
                                Write-Verbose "  Excluding: $filePath"
                                break
                            }
                        }
                        
                        if (-not $exclude -and -not $uniqueFilePaths.ContainsKey($filePath)) {
                            $uniqueFilePaths[$filePath] = $file
                            Write-Verbose "  Added directory file: $filePath"
                        }
                    }
                } else {
                    Write-Warning "  Directory not found: $fullPath"
                }
            } else {
                # It's a file path
                if (Test-Path -Path $fullPath -PathType Leaf) {
                    $fileObj = Get-Item -Path $fullPath
                    
                    # Check exclusion patterns
                    $exclude = $false
                    foreach ($pattern in $excludePatterns) {
                        if ($fullPath -match $pattern) {
                            $exclude = $true
                            Write-Verbose "  Excluding: $fullPath"
                            break
                        }
                    }
                    
                    if (-not $exclude -and -not $uniqueFilePaths.ContainsKey($fileObj.FullName)) {
                        $uniqueFilePaths[$fileObj.FullName] = $fileObj
                        Write-Verbose "  Added file: $fullPath"
                    }
                } else {
                    Write-Warning "  File not found: $fullPath"
                }
            }
        }
    }
}

# Add the always-include files
foreach ($alwaysFile in $alwaysIncludeFiles) {
    $alwaysFile = $alwaysFile -replace '/', '\'
    $fullPath = Join-Path -Path $SourcePath -ChildPath $alwaysFile
    
    if (Test-Path -Path $fullPath -PathType Leaf) {
        $fileObj = Get-Item -Path $fullPath
        
        # Skip exclusion check - we want these files regardless
        if (-not $uniqueFilePaths.ContainsKey($fileObj.FullName)) {
            $uniqueFilePaths[$fileObj.FullName] = $fileObj
            Write-Host "  Added always-include file: $fullPath" -ForegroundColor Magenta
        }
    } else {
        Write-Warning "  Always-include file not found: $fullPath"
    }
}

# Get the file objects from the hashtable
$filesToCopy = $uniqueFilePaths.Values

# Copy the files
$totalFiles = $filesToCopy.Count
$currentFile = 0

if ($totalFiles -eq 0) {
    Write-Warning "No files found to copy for selected features: $($Features -join ', ')"
} else {
    Write-Host "Found $totalFiles unique files to copy for features: $($Features -join ', ')" -ForegroundColor Green
    
    foreach ($file in $filesToCopy) {
        $currentFile++
        
        # Copy the file
        Copy-Item -Path $file.FullName -Destination $DestinationPath -Force
        
        # Display progress
        $percentComplete = [math]::Round(($currentFile / $totalFiles) * 100, 2)
        Write-Progress -Activity "Copying Files" -Status "$percentComplete% Complete" -PercentComplete $percentComplete
        Write-Host "Copied: $($file.FullName) -> $DestinationPath"
    }
    
    Write-Host "`nCopy operation completed successfully!" -ForegroundColor Green
    Write-Host "Total files copied: $totalFiles" -ForegroundColor Green
    Write-Host "Destination directory: $DestinationPath" -ForegroundColor Green
}