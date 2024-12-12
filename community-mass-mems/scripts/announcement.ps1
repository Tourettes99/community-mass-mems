param(
    [Parameter(Position=0, Mandatory=$true)]
    [string]$Action,
    
    [Parameter(Position=1)]
    [string]$Message
)

$apiUrl = "https://community-mass-mems.netlify.app/api/announcement"

function Post-Announcement {
    param([string]$Message)
    
    Write-Host "Posting announcement..."
    
    $body = @{
        message = $Message
        active = $true
    } | ConvertTo-Json
    
    try {
        $response = Invoke-RestMethod -Uri $apiUrl -Method Post -Body $body -ContentType "application/json"
        if ($response.success) {
            Write-Host "Announcement posted successfully!" -ForegroundColor Green
        }
    }
    catch {
        Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
        exit 1
    }
}

function Stop-Announcement {
    Write-Host "Stopping announcement..."
    
    $body = @{
        message = ""
        active = $false
    } | ConvertTo-Json
    
    try {
        $response = Invoke-RestMethod -Uri $apiUrl -Method Post -Body $body -ContentType "application/json"
        if ($response.success) {
            Write-Host "Announcement stopped successfully!" -ForegroundColor Green
        }
    }
    catch {
        Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
        exit 1
    }
}

switch ($Action.ToLower()) {
    "post" {
        if ([string]::IsNullOrEmpty($Message)) {
            Write-Host "Error: Message is required for post action" -ForegroundColor Red
            exit 1
        }
        Post-Announcement -Message $Message
    }
    "stop" {
        Stop-Announcement
    }
    default {
        Write-Host "Error: Invalid action. Use 'post' or 'stop'" -ForegroundColor Red
        exit 1
    }
}
