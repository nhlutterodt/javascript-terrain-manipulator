# Define the root directory of the project
$rootDirectory = "c:\Users\Owner\Javascript_World_Generator"

# Define the output JSON log file
$outputFile = "$rootDirectory\project_structure_log.json"

# Function to recursively get folder and file structure
function Get-FolderStructure {
    param (
        [string]$Path
    )

    $structure = @{
        Name = (Get-Item $Path).Name
        Path = $Path
        Type = if (Test-Path $Path -PathType Container) { "Folder" } else { "File" }
        Children = @()
    }

    if ($structure.Type -eq "Folder") {
        $items = Get-ChildItem -Path $Path -Force -ErrorAction SilentlyContinue
        foreach ($item in $items) {
            $structure.Children += Get-FolderStructure -Path $item.FullName
        }
    }

    return $structure
}

# Get the folder structure
$projectStructure = Get-FolderStructure -Path $rootDirectory

# Convert the structure to JSON and save it to the log file
$projectStructure | ConvertTo-Json -Depth 10 | Set-Content -Path $outputFile

Write-Host "Project structure log created at $outputFile"
