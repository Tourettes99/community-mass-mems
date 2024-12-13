# Enable verbose error reporting
$ErrorActionPreference = "Stop"
$VerbosePreference = "Continue"

try {
    # Set window title for easy identification in Task Manager
    $Host.UI.RawUI.WindowTitle = "Community-Mass-Mems-Sync"

    # Get the script's directory
    $scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
    
    # Directories to exclude from sync
    $excludeDirs = @(
        '.git',
        'node_modules',
        '.cache',
        'tmp',
        'community-mass-mems',  # Exclude the target directory from source
        'backup'                # Exclude backup directory from source
    )

    # Create exclude arguments for robocopy
    $excludeArgs = $excludeDirs | ForEach-Object { "/XD", $_ }

    # Main sync directories
    $sourceDir = $scriptPath  # C:\Users\isman\Documents\community-mass-mems
    $targetDir = Join-Path $sourceDir "community-mass-mems"  # C:\Users\isman\Documents\community-mass-mems\community-mass-mems
    $backupDir = Join-Path $env:USERPROFILE "Pictures\backup"  # C:\Users\isman\Pictures\backup
    
    Write-Host "Sync Directories:"
    Write-Host ("Source: {0}" -f $sourceDir)
    Write-Host ("Target 1: {0}" -f $targetDir)
    Write-Host ("Target 2: {0}" -f $backupDir)
    
    $script:LogFile = Join-Path $PSScriptRoot "sync_log.txt"
    $script:SyncLogMutexName = "Global\SyncLogMutex"
    $script:BatchSize = 100000       # Increased batch size
    $script:MaxJobs = 64            # Increased max parallel jobs
    $script:BufferSize = 16MB       # Increased buffer size
    $script:UseParallelProcessing = $true
    
    # Import ThreadJob module for better parallel processing
    Import-Module ThreadJob -ErrorAction SilentlyContinue

    # Function to check if path is a subdirectory of another path
    function Test-IsSubdirectory {
        param(
            [string]$ParentPath,
            [string]$ChildPath
        )
        $parent = $ParentPath.TrimEnd('\')
        $child = $ChildPath.TrimEnd('\')
        return $child.StartsWith($parent, [StringComparison]::OrdinalIgnoreCase)
    }

    # Function to prevent recursive directory creation
    function Test-ValidSyncPath {
        param(
            [string]$SourcePath,
            [string]$TargetPath
        )
        
        # Prevent creation of a third-level community-mass-mems directory
        if ($TargetPath -like "*\community-mass-mems\community-mass-mems\community-mass-mems*") {
            Write-ToLog "Error: Would create third-level community-mass-mems directory. Operation blocked."
            return $false
        }

        # Check if target would create a recursive pattern
        if (Test-IsSubdirectory -ParentPath $SourcePath -ChildPath $TargetPath) {
            $subPath = $TargetPath.Substring($SourcePath.Length).Trim('\')
            $parts = $subPath.Split('\')
            $uniqueParts = $parts | Select-Object -Unique
            
            # If we have repeated directory names, it's a recursive pattern
            if ($parts.Count -ne $uniqueParts.Count) {
                Write-ToLog "Error: Detected recursive directory pattern. Sync operation would create infinite nesting."
                return $false
            }
        }
        return $true
    }

    # Validate sync paths before proceeding
    if (!(Test-ValidSyncPath -SourcePath $sourceDir -TargetPath $targetDir) -or 
        !(Test-ValidSyncPath -SourcePath $sourceDir -TargetPath $backupDir)) {
        throw "Invalid sync path configuration detected. Please check your directory settings."
    }

    # Create directories if they don't exist
    @($targetDir, $backupDir) | ForEach-Object {
        if (!(Test-Path $_)) {
            New-Item -ItemType Directory -Path $_ -Force | Out-Null
            Write-Host ("Created directory: {0}" -f $_)
        }
    }

    # Function to get relative path
    function Get-RelativePath {
        param(
            [string]$Path,
            [string]$BasePath
        )
        $Path = [System.IO.Path]::GetFullPath($Path)
        $BasePath = [System.IO.Path]::GetFullPath($BasePath)
        return $Path.Substring($BasePath.Length).TrimStart('\')
    }

    # Optimized logging function using StringBuilder for better performance
    $script:LogBuilder = [System.Text.StringBuilder]::new(1MB)
    $script:LastFlushTime = Get-Date

    function Write-ToLog {
        param([string]$Message)
        try {
            $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
            $logMessage = "{0} - {1}`n" -f $timestamp, $Message
            
            [void]$script:LogBuilder.Append($logMessage)
            
            # Flush every 5 seconds or if buffer is large
            if (((Get-Date) - $script:LastFlushTime).TotalSeconds -ge 5 -or 
                $script:LogBuilder.Length -gt 500KB) {
                $mutex = New-Object System.Threading.Mutex($false, $script:SyncLogMutexName)
                try {
                    [void]$mutex.WaitOne()
                    Add-Content -Path $script:LogFile -Value $script:LogBuilder.ToString() -Force
                    [void]$script:LogBuilder.Clear()
                    $script:LastFlushTime = Get-Date
                }
                finally {
                    $mutex.ReleaseMutex()
                    $mutex.Dispose()
                }
            }
            
            Write-Host $logMessage.TrimEnd()
        }
        catch {
            Write-Host ("Error writing to log: {0}" -f $_.Exception.Message)
        }
    }

    # Function to display a visual progress bar
    function Show-ProgressBar {
        param(
            [string]$Activity,
            [int]$PercentComplete,
            [string]$Status,
            [int]$BarLength = 50
        )
        
        $filledLength = [math]::Round(($PercentComplete / 100) * $BarLength)
        $emptyLength = $BarLength - $filledLength
        $filledBar = "=" * $filledLength
        $emptyBar = "-" * $emptyLength
        $progressBar = "[$filledBar$emptyBar] {0,3}%" -f $PercentComplete
        Write-Host "`r$Activity $progressBar $Status" -NoNewline
        if ($PercentComplete -eq 100) { Write-Host "" }
    }

    # Optimized exclusion check using regex
    $script:ExcludeRegex = [regex]"(\\community-mass-mems\\community-mass-mems\\community-mass-mems|\\.(bat|ps1)$)"
    function Test-ExcludedPath {
        param([string]$path)
        return $script:ExcludeRegex.IsMatch($path)
    }

    function Format-ElapsedTime {
        param([TimeSpan]$TimeSpan)
        if ($TimeSpan.TotalMinutes -ge 1) {
            return "{0:mm}m {0:ss}s" -f $TimeSpan
        } else {
            return "{0:s\.fff}s" -f $TimeSpan
        }
    }

    # Function to test if a file is locked
    function Test-FileLock {
        param([string]$path)
        try {
            $file = [IO.File]::Open($path, 'Open', 'Read', 'None')
            $file.Close()
            $file.Dispose()
            return $false
        }
        catch {
            return $true
        }
    }

    # Function to copy file with retry using robocopy
    function Copy-FileWithRetry {
        param(
            [string]$source,
            [string]$destination,
            [int]$maxRetries = 3,
            [int]$retryDelay = 1
        )
        
        $sourceDir = Split-Path -Parent $source
        $destDir = Split-Path -Parent $destination
        $fileName = Split-Path -Leaf $source
        
        # Create destination directory if it doesn't exist
        if (!(Test-Path $destDir)) {
            New-Item -ItemType Directory -Path $destDir -Force | Out-Null
        }
        
        for ($i = 0; $i -lt $maxRetries; $i++) {
            $robocopyArgs = @(
                $sourceDir,
                $destDir,
                $fileName,
                "/MT:1",      # Single thread for this file
                "/Z",         # Restartable mode
                "/R:1",       # 1 retry
                "/W:1",       # 1 second wait
                "/NP",        # No progress
                "/NDL",       # No directory list
                "/NJH",       # No job header
                "/NJS",       # No job summary
                "/DCOPY:DAT", # Copy directory timestamps
                "/COPY:DAT"   # Copy file data, attributes, timestamps
            )
            
            $result = & robocopy @robocopyArgs
            $exitCode = $LASTEXITCODE
            
            # Robocopy success codes are 0-7
            if ($exitCode -lt 8) {
                return $true
            }
            
            if ($i -lt ($maxRetries - 1)) {
                Start-Sleep -Seconds $retryDelay
            }
            else {
                Write-ToLog ("Warning: Could not copy {0} after {1} retries. Exit code: {2}" -f $source, $maxRetries, $exitCode)
                return $false
            }
        }
        return $false
    }

    # Function to get file hash
    function Get-FileHash {
        param([string]$FilePath)
        try {
            if ([string]::IsNullOrWhiteSpace($FilePath)) {
                Write-ToLog "Error: Empty file path provided to Get-FileHash"
                return $null
            }
            
            if (Test-Path $FilePath -PathType Leaf) {
                $hash = Microsoft.PowerShell.Utility\Get-FileHash -Path $FilePath -Algorithm MD5
                return $hash.Hash
            }
            Write-ToLog ("Warning: File not found for hashing: {0}" -f $FilePath)
            return $null
        }
        catch {
            Write-ToLog ("Error getting hash for {0}: {1}" -f $FilePath, $_.Exception.Message)
            return $null
        }
    }

    # Function to compare file contents
    function Compare-FileContents {
        param(
            [string]$SourcePath,
            [string]$TargetPath
        )
        
        if (!(Test-Path $SourcePath) -or !(Test-Path $TargetPath)) {
            return $false
        }

        $sourceHash = Get-FileHash -FilePath $SourcePath
        $targetHash = Get-FileHash -FilePath $TargetPath
        
        return $sourceHash -eq $targetHash
    }

    # Function to sync directories using robocopy
    function Sync-DirectoryWithRobocopy {
        param(
            [string]$source,
            [string]$target
        )
        
        $excludeDirs = @(
            '.git',
            'node_modules',
            '.cache',
            'tmp',
            'community-mass-mems',
            'backup'
        )

        $robocopyArgs = @(
            $source,
            $target,
            "/E",          # Copy subdirectories
            "/MT:4",       # Use 4 threads
            "/R:3",        # Retries
            "/W:1",        # Wait time
            "/NP",         # No progress
            "/NDL",        # No directory list
            "/NFL"         # No file list
        )
        
        # Add exclude directories
        $robocopyArgs += $excludeDirs | ForEach-Object { "/XD", $_ }
        
        Write-Host "Syncing from $source to $target"
        & robocopy @robocopyArgs
    }

    try {
        # First sync: Source to community-mass-mems
        Write-ToLog "Starting sync to community-mass-mems..."
        Sync-DirectoryWithRobocopy -source $sourceDir -target $targetDir
        Write-ToLog "First sync completed."

        # Second sync: Source to backup
        Write-ToLog "Starting sync to backup..."
        Sync-DirectoryWithRobocopy -source $sourceDir -target $backupDir
        Write-ToLog "Second sync completed."

        Write-Host "`nBoth syncs completed. Press 'Y' to exit or any other key to sync again: " -NoNewline
        $response = Read-Host
        if ($response.ToUpper() -eq 'Y') {
            Write-Host "Exiting script..."
            exit
        }
    }
    catch {
        Write-ToLog ("Error in sync: {0}" -f $_.Exception.Message)
        Write-ToLog ("Stack trace: {0}" -f $_.ScriptStackTrace)
        Read-Host "Press Enter to exit"
        exit
    }
}
catch {
    Write-Host ("Critical error: {0}" -f $_.Exception.Message)
    Write-Host ("Stack trace: {0}" -f $_.ScriptStackTrace)
    Read-Host "Press Enter to exit"
}
