# =============================================================================
# 24HRMVP - Source Code Consolidator for Opus 4.5 Analysis
# Creates 3 separate files: config, backend, frontend
# =============================================================================

$ErrorActionPreference = "Continue"
$RootDir = "C:\Users\matty\Desktop\24HRMVP\24hrmvp-app"
$OutputDir = "C:\Users\matty\Desktop\24HRMVP\analysis"
$Timestamp = Get-Date -Format "yyyy-MM-dd-HH-mm"

# Create output directory
New-Item -ItemType Directory -Path $OutputDir -Force | Out-Null

Write-Host ""
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "  24HRMVP Source Code Consolidator" -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Root Directory: $RootDir" -ForegroundColor White
Write-Host "Output Directory: $OutputDir" -ForegroundColor White
Write-Host ""

# =============================================================================
# Define file patterns and exclusions
# =============================================================================

$SourceExtensions = @("*.ts", "*.tsx", "*.js", "*.jsx", "*.json", "*.prisma", "*.css", "*.scss", "*.md", "*.yaml", "*.yml", "*.env*", "*.toml")
$ExcludeDirs = @("node_modules", ".next", "out", "dist", ".git", ".turbo", "coverage", ".vercel", ".cache")

# =============================================================================
# Helper function to get relative path
# =============================================================================
function Get-RelativePath {
    param([string]$FullPath, [string]$BasePath)
    return $FullPath.Replace($BasePath, "").TrimStart("\", "/")
}

# =============================================================================
# Helper function to consolidate files
# =============================================================================
function Consolidate-Files {
    param(
        [string]$SourcePath,
        [string]$OutputFile,
        [string]$SectionName,
        [string[]]$Extensions,
        [string[]]$Excludes
    )
    
    if (-not (Test-Path $SourcePath)) {
        Write-Host "  ⚠️  Path not found: $SourcePath" -ForegroundColor Yellow
        return 0
    }
    
    $StringBuilder = [System.Text.StringBuilder]::new()
    $FileCount = 0
    $TotalLines = 0
    
    # Header
    [void]$StringBuilder.AppendLine("# $SectionName Source Code Consolidation")
    [void]$StringBuilder.AppendLine("")
    [void]$StringBuilder.AppendLine("**Generated:** $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')")
    [void]$StringBuilder.AppendLine("**Source Path:** $SourcePath")
    [void]$StringBuilder.AppendLine("")
    [void]$StringBuilder.AppendLine("---")
    [void]$StringBuilder.AppendLine("")
    
    # Table of Contents
    [void]$StringBuilder.AppendLine("## Table of Contents")
    [void]$StringBuilder.AppendLine("")
    
    # Collect all files first
    $AllFiles = @()
    foreach ($Ext in $Extensions) {
        $Files = Get-ChildItem -Path $SourcePath -Filter $Ext -Recurse -File -ErrorAction SilentlyContinue | 
            Where-Object { 
                $FilePath = $_.FullName
                $Excluded = $false
                foreach ($ExDir in $Excludes) {
                    if ($FilePath -match [regex]::Escape("\$ExDir\") -or $FilePath -match [regex]::Escape("/$ExDir/")) {
                        $Excluded = $true
                        break
                    }
                }
                -not $Excluded
            }
        $AllFiles += $Files
    }
    
    # Sort by path for consistent ordering
    $AllFiles = $AllFiles | Sort-Object FullName -Unique
    
    # Build TOC
    $FileIndex = 1
    foreach ($File in $AllFiles) {
        $RelPath = Get-RelativePath -FullPath $File.FullName -BasePath $SourcePath
        [void]$StringBuilder.AppendLine("$FileIndex. [$RelPath](#file-$FileIndex)")
        $FileIndex++
    }
    
    [void]$StringBuilder.AppendLine("")
    [void]$StringBuilder.AppendLine("---")
    [void]$StringBuilder.AppendLine("")
    
    # Process each file
    $FileIndex = 1
    foreach ($File in $AllFiles) {
        $RelPath = Get-RelativePath -FullPath $File.FullName -BasePath $SourcePath
        $Extension = $File.Extension.TrimStart(".")
        
        # Determine language for syntax highlighting
        $Lang = switch ($Extension) {
            "ts" { "typescript" }
            "tsx" { "tsx" }
            "js" { "javascript" }
            "jsx" { "jsx" }
            "json" { "json" }
            "prisma" { "prisma" }
            "css" { "css" }
            "scss" { "scss" }
            "md" { "markdown" }
            "yaml" { "yaml" }
            "yml" { "yaml" }
            "toml" { "toml" }
            "env" { "bash" }
            default { "" }
        }
        
        try {
            $Content = Get-Content -LiteralPath $File.FullName -Raw -ErrorAction Stop
            $LineCount = ($Content -split "`n").Count
            $TotalLines += $LineCount
            
            [void]$StringBuilder.AppendLine("<a id=`"file-$FileIndex`"></a>")
            [void]$StringBuilder.AppendLine("## File $FileIndex`: $RelPath")
            [void]$StringBuilder.AppendLine("")
            [void]$StringBuilder.AppendLine("**Lines:** $LineCount | **Size:** $([math]::Round($File.Length / 1KB, 2)) KB")
            [void]$StringBuilder.AppendLine("")
            [void]$StringBuilder.AppendLine("``````$Lang")
            [void]$StringBuilder.AppendLine($Content.TrimEnd())
            [void]$StringBuilder.AppendLine("``````")
            [void]$StringBuilder.AppendLine("")
            [void]$StringBuilder.AppendLine("---")
            [void]$StringBuilder.AppendLine("")
            
            $FileCount++
        }
        catch {
            [void]$StringBuilder.AppendLine("## File $FileIndex`: $RelPath")
            [void]$StringBuilder.AppendLine("")
            [void]$StringBuilder.AppendLine("**ERROR:** Could not read file - $($_.Exception.Message)")
            [void]$StringBuilder.AppendLine("")
            [void]$StringBuilder.AppendLine("---")
            [void]$StringBuilder.AppendLine("")
        }
        
        $FileIndex++
    }
    
    # Summary at end
    [void]$StringBuilder.AppendLine("## Summary")
    [void]$StringBuilder.AppendLine("")
    [void]$StringBuilder.AppendLine("- **Total Files:** $FileCount")
    [void]$StringBuilder.AppendLine("- **Total Lines:** $TotalLines")
    [void]$StringBuilder.AppendLine("")
    
    # Write to file
    $StringBuilder.ToString() | Out-File -FilePath $OutputFile -Encoding utf8
    
    Write-Host "  ✅ $SectionName : $FileCount files, $TotalLines lines" -ForegroundColor Green
    return $FileCount
}

# =============================================================================
# 1. CONFIG FILES (root level configs)
# =============================================================================

Write-Host "Processing CONFIG files..." -ForegroundColor Yellow

$ConfigOutput = Join-Path $OutputDir "01-CONFIG-$Timestamp.md"
$ConfigBuilder = [System.Text.StringBuilder]::new()

[void]$ConfigBuilder.AppendLine("# 24HRMVP Configuration Files")
[void]$ConfigBuilder.AppendLine("")
[void]$ConfigBuilder.AppendLine("**Generated:** $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')")
[void]$ConfigBuilder.AppendLine("")
[void]$ConfigBuilder.AppendLine("---")
[void]$ConfigBuilder.AppendLine("")

# Root config files
$ConfigFiles = @(
    "package.json",
    "tsconfig.json",
    "next.config.js",
    "next.config.mjs",
    "tailwind.config.js",
    "tailwind.config.ts",
    "postcss.config.js",
    "postcss.config.mjs",
    ".env",
    ".env.local",
    ".env.production",
    ".env.example",
    ".eslintrc.json",
    ".eslintrc.js",
    ".prettierrc",
    ".prettierrc.json",
    "prettier.config.js",
    ".gitignore",
    ".gitattributes",
    "Dockerfile",
    "docker-compose.yml",
    "railway.json",
    "railway.toml",
    "vercel.json",
    "prisma/schema.prisma"
)

$ConfigCount = 0
$ConfigLines = 0

# Check both root, frontend, and backend for config files
$SearchPaths = @($RootDir, "$RootDir\frontend", "$RootDir\backend")

foreach ($SearchPath in $SearchPaths) {
    if (-not (Test-Path $SearchPath)) { continue }
    
    $PathLabel = Get-RelativePath -FullPath $SearchPath -BasePath $RootDir
    if ([string]::IsNullOrEmpty($PathLabel)) { $PathLabel = "root" }
    
    foreach ($ConfigFile in $ConfigFiles) {
        $FullPath = Join-Path $SearchPath $ConfigFile
        if (Test-Path -LiteralPath $FullPath) {
            $Extension = [System.IO.Path]::GetExtension($ConfigFile).TrimStart(".")
            $Lang = switch ($Extension) {
                "json" { "json" }
                "js" { "javascript" }
                "mjs" { "javascript" }
                "ts" { "typescript" }
                "prisma" { "prisma" }
                "yml" { "yaml" }
                "yaml" { "yaml" }
                "toml" { "toml" }
                default { "" }
            }
            
            try {
                $Content = Get-Content -LiteralPath $FullPath -Raw -ErrorAction Stop
                $LineCount = ($Content -split "`n").Count
                $ConfigLines += $LineCount
                
                [void]$ConfigBuilder.AppendLine("## [$PathLabel] $ConfigFile")
                [void]$ConfigBuilder.AppendLine("")
                [void]$ConfigBuilder.AppendLine("**Lines:** $LineCount")
                [void]$ConfigBuilder.AppendLine("")
                [void]$ConfigBuilder.AppendLine("``````$Lang")
                [void]$ConfigBuilder.AppendLine($Content.TrimEnd())
                [void]$ConfigBuilder.AppendLine("``````")
                [void]$ConfigBuilder.AppendLine("")
                [void]$ConfigBuilder.AppendLine("---")
                [void]$ConfigBuilder.AppendLine("")
                
                $ConfigCount++
            }
            catch {
                # Skip unreadable files
            }
        }
    }
}

[void]$ConfigBuilder.AppendLine("## Summary")
[void]$ConfigBuilder.AppendLine("")
[void]$ConfigBuilder.AppendLine("- **Total Config Files:** $ConfigCount")
[void]$ConfigBuilder.AppendLine("- **Total Lines:** $ConfigLines")

$ConfigBuilder.ToString() | Out-File -FilePath $ConfigOutput -Encoding utf8
Write-Host "  ✅ CONFIG: $ConfigCount files, $ConfigLines lines -> $ConfigOutput" -ForegroundColor Green

# =============================================================================
# 2. BACKEND FILES
# =============================================================================

Write-Host "Processing BACKEND files..." -ForegroundColor Yellow

$BackendPath = Join-Path $RootDir "backend"
$BackendOutput = Join-Path $OutputDir "02-BACKEND-$Timestamp.md"

if (Test-Path $BackendPath) {
    Consolidate-Files -SourcePath $BackendPath -OutputFile $BackendOutput -SectionName "24HRMVP Backend" -Extensions $SourceExtensions -Excludes $ExcludeDirs
    Write-Host "  📁 Output: $BackendOutput" -ForegroundColor Cyan
} else {
    Write-Host "  ⚠️  Backend directory not found: $BackendPath" -ForegroundColor Yellow
}

# =============================================================================
# 3. FRONTEND FILES
# =============================================================================

Write-Host "Processing FRONTEND files..." -ForegroundColor Yellow

$FrontendPath = Join-Path $RootDir "frontend"
$FrontendOutput = Join-Path $OutputDir "03-FRONTEND-$Timestamp.md"

if (Test-Path $FrontendPath) {
    Consolidate-Files -SourcePath $FrontendPath -OutputFile $FrontendOutput -SectionName "24HRMVP Frontend" -Extensions $SourceExtensions -Excludes $ExcludeDirs
    Write-Host "  📁 Output: $FrontendOutput" -ForegroundColor Cyan
} else {
    Write-Host "  ⚠️  Frontend directory not found: $FrontendPath" -ForegroundColor Yellow
}

# =============================================================================
# Also run TypeScript checks and output errors
# =============================================================================

Write-Host ""
Write-Host "Running TypeScript error checks..." -ForegroundColor Yellow

$ErrorsOutput = Join-Path $OutputDir "04-TYPESCRIPT-ERRORS-$Timestamp.md"
$ErrorsBuilder = [System.Text.StringBuilder]::new()

[void]$ErrorsBuilder.AppendLine("# TypeScript Errors Report")
[void]$ErrorsBuilder.AppendLine("")
[void]$ErrorsBuilder.AppendLine("**Generated:** $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')")
[void]$ErrorsBuilder.AppendLine("")
[void]$ErrorsBuilder.AppendLine("---")
[void]$ErrorsBuilder.AppendLine("")

# Frontend TypeScript check
if (Test-Path "$FrontendPath\tsconfig.json") {
    [void]$ErrorsBuilder.AppendLine("## Frontend TypeScript Errors")
    [void]$ErrorsBuilder.AppendLine("")
    [void]$ErrorsBuilder.AppendLine("``````")
    
    Push-Location $FrontendPath
    $FrontendErrors = npx tsc --noEmit 2>&1 | Out-String
    Pop-Location
    
    if ([string]::IsNullOrWhiteSpace($FrontendErrors)) {
        [void]$ErrorsBuilder.AppendLine("No TypeScript errors found!")
    } else {
        [void]$ErrorsBuilder.AppendLine($FrontendErrors)
    }
    
    [void]$ErrorsBuilder.AppendLine("``````")
    [void]$ErrorsBuilder.AppendLine("")
    [void]$ErrorsBuilder.AppendLine("---")
    [void]$ErrorsBuilder.AppendLine("")
}

# Backend TypeScript check
if (Test-Path "$BackendPath\tsconfig.json") {
    [void]$ErrorsBuilder.AppendLine("## Backend TypeScript Errors")
    [void]$ErrorsBuilder.AppendLine("")
    [void]$ErrorsBuilder.AppendLine("``````")
    
    Push-Location $BackendPath
    $BackendErrors = npx tsc --noEmit 2>&1 | Out-String
    Pop-Location
    
    if ([string]::IsNullOrWhiteSpace($BackendErrors)) {
        [void]$ErrorsBuilder.AppendLine("No TypeScript errors found!")
    } else {
        [void]$ErrorsBuilder.AppendLine($BackendErrors)
    }
    
    [void]$ErrorsBuilder.AppendLine("``````")
    [void]$ErrorsBuilder.AppendLine("")
}

$ErrorsBuilder.ToString() | Out-File -FilePath $ErrorsOutput -Encoding utf8
Write-Host "  ✅ TypeScript errors -> $ErrorsOutput" -ForegroundColor Green

# =============================================================================
# Final Summary
# =============================================================================

Write-Host ""
Write-Host "=============================================" -ForegroundColor Green
Write-Host "  Consolidation Complete!" -ForegroundColor Green
Write-Host "=============================================" -ForegroundColor Green
Write-Host ""
Write-Host "Output Files:" -ForegroundColor White
Write-Host "  1. $ConfigOutput" -ForegroundColor Cyan
Write-Host "  2. $BackendOutput" -ForegroundColor Cyan
Write-Host "  3. $FrontendOutput" -ForegroundColor Cyan
Write-Host "  4. $ErrorsOutput" -ForegroundColor Cyan
Write-Host ""
Write-Host "Upload these files to Opus 4.5 for analysis." -ForegroundColor Yellow
Write-Host ""

# Open output directory
Start-Process explorer.exe $OutputDir
