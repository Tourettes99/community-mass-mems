$sourceDir = "C:\Users\isman\Documents\community-mass-mems"
$targetDir = "C:\Users\isman\Documents\community-mass-mems\community-mass-mems"

# Create arrays to store items to process
$itemsToSync = @()
$itemsToRemove = @()

# Function to get relative path
function Get-RelativePath {
    param($Path, $BasePath)
    $Path.Substring($BasePath.Length).TrimStart('\')
}

# Function to sync directories
function Sync-Directories {
    param($source, $target)
    
    Write-Host "Syncing directories..." -ForegroundColor Cyan

    # Get all items from source
    $sourceItems = Get-ChildItem -Path $source -Recurse | Where-Object { $_.FullName -notlike "*\.git*" -and $_.Name -ne "sync.ps1" -and $_.FullName -notlike "*\node_modules*" }
    
    foreach ($item in $sourceItems) {
        $relativePath = Get-RelativePath -Path $item.FullName -BasePath $source
        $targetPath = Join-Path $target $relativePath
        
        if ($item.PSIsContainer) {
            if (!(Test-Path $targetPath)) {
                $itemsToSync += @{
                    Type = "Directory"
                    Source = $item.FullName
                    Target = $targetPath
                }
            }
        } else {
            if (!(Test-Path $targetPath) -or 
                (Get-Item $item.FullName).LastWriteTime -gt (Get-Item $targetPath).LastWriteTime) {
                $itemsToSync += @{
                    Type = "File"
                    Source = $item.FullName
                    Target = $targetPath
                }
            }
        }
    }

    # Find items to remove from target
    $targetItems = Get-ChildItem -Path $target -Recurse | Where-Object { $_.FullName -notlike "*\.git*" -and $_.FullName -notlike "*\node_modules*" }
    foreach ($item in $targetItems) {
        $relativePath = Get-RelativePath -Path $item.FullName -BasePath $target
        $sourcePath = Join-Path $source $relativePath
        
        if (!(Test-Path $sourcePath)) {
            $itemsToRemove += $item.FullName
        }
    }

    # Process all items
    $total = $itemsToSync.Count + $itemsToRemove.Count
    $current = 0

    # Create directories first
    foreach ($item in ($itemsToSync | Where-Object { $_.Type -eq "Directory" })) {
        $current++
        Write-Progress -Activity "Syncing" -Status "Creating directory: $($item.Target)" -PercentComplete (($current / $total) * 100)
        New-Item -ItemType Directory -Path $item.Target -Force | Out-Null
    }

    # Copy files
    foreach ($item in ($itemsToSync | Where-Object { $_.Type -eq "File" })) {
        $current++
        Write-Progress -Activity "Syncing" -Status "Copying: $($item.Target)" -PercentComplete (($current / $total) * 100)
        Copy-Item -Path $item.Source -Destination $item.Target -Force
    }

    # Remove items that don't exist in source
    foreach ($item in $itemsToRemove) {
        $current++
        Write-Progress -Activity "Syncing" -Status "Removing: $item" -PercentComplete (($current / $total) * 100)
        Remove-Item -Path $item -Force -Recurse
    }

    Write-Progress -Activity "Syncing" -Completed
    Write-Host "Sync completed!" -ForegroundColor Green
    Write-Host "Items processed: $total" -ForegroundColor Yellow
    Write-Host "Files/Directories copied: $($itemsToSync.Count)" -ForegroundColor Yellow
    Write-Host "Items removed: $($itemsToRemove.Count)" -ForegroundColor Yellow
}

# Run the sync
Sync-Directories -source $sourceDir -target $targetDir
