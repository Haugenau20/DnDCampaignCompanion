param(
    [Parameter(Mandatory=$true)]
    [string]$Path
)

# Unicode characters using escape sequences
$teeChar = [char]0x251C + [char]0x2500 + [char]0x2500        # ├──
$lastTeeChar = [char]0x2514 + [char]0x2500 + [char]0x2500    # └──
$verticalChar = [char]0x2502                                 # │

# Clear/create the output file
"" | Set-Content "projectStructure.txt" -Encoding UTF8

function Write-TreeLine {
    param(
        [string]$Line
    )
    $Line | Add-Content "projectStructure.txt" -Encoding UTF8
}

function Get-DirectoryTree {
    param (
        [string]$Path,
        [string[]]$ParentLines = @(),
        [bool]$IsLast = $false
    )
    
    # Get directory name
    $dirName = Split-Path $Path -Leaf
    
    # Create the current line prefix based on parent lines
    $prefix = ""
    foreach ($line in $ParentLines) {
        $prefix += $line
    }
    
    # Write directory name
    if ($ParentLines.Count -eq 0) {
        Write-TreeLine $dirName
    } else {
        if ($IsLast) {
            Write-TreeLine "$prefix$lastTeeChar $dirName"
        } else {
            Write-TreeLine "$prefix$teeChar $dirName"
        }
    }
    
    # Get all items in directory, excluding node_modules and build
    $items = Get-ChildItem -Path $Path | Where-Object { 
        $_.Name -notin @("node_modules", "build", "coverage")
    }
    
    # Sort items (directories first, then files)
    $items = $items | Sort-Object { $_.PSIsContainer -as [int] }, Name -Descending
    
    # Create new parent lines array for children
    $newParentLines = $ParentLines.Clone()
    if ($ParentLines.Count -gt 0) {
        if ($IsLast) {
            $newParentLines += "    "
        } else {
            $newParentLines += "$verticalChar   "
        }
    } else {
        $newParentLines += "$verticalChar   "
    }
    
    # Process each item
    for ($i = 0; $i -lt $items.Count; $i++) {
        $item = $items[$i]
        $isLast = ($i -eq ($items.Count - 1))
        
        if ($item.PSIsContainer) {
            # Recursively process subdirectories
            Get-DirectoryTree -Path $item.FullName -ParentLines $newParentLines -IsLast $isLast
        } else {
            # Write files
            $fileLine = ""
            foreach ($line in $newParentLines) {
                $fileLine += $line
            }
            if ($isLast) {
                Write-TreeLine "$fileLine$lastTeeChar $($item.Name)"
            } else {
                Write-TreeLine "$fileLine$teeChar $($item.Name)"
            }
        }
    }
}

# Start the tree generation
Get-DirectoryTree -Path $Path
Write-Host "Directory tree has been saved to projectStructure.txt"