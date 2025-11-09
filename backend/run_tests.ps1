# PowerShell script to run audit system tests
# Usage: .\run_tests.ps1 [test-category] [options]

param(
    [string]$Category = "all",
    [switch]$Coverage,
    [switch]$Verbose,
    [switch]$FailFast,
    [switch]$Html,
    [switch]$Install,
    [string]$Pattern = "",
    [int]$Parallel = 1
)

# Colors for output
$RED = "`e[31m"
$GREEN = "`e[32m"
$YELLOW = "`e[33m"
$BLUE = "`e[34m"
$RESET = "`e[0m"

function Write-ColorOutput {
    param(
        [string]$Text,
        [string]$Color = $RESET
    )
    Write-Host "$Color$Text$RESET"
}

function Show-Help {
    Write-ColorOutput "Audit System Test Runner" $BLUE
    Write-Host ""
    Write-Host "Usage: .\run_tests.ps1 [options]"
    Write-Host ""
    Write-Host "Options:"
    Write-Host "  -Category <string>    Test category to run (default: all)"
    Write-Host "                       Options: all, unit, integration, api, audit, compliance, retention"
    Write-Host "  -Coverage            Generate coverage report"
    Write-Host "  -Verbose             Run tests with verbose output"
    Write-Host "  -FailFast            Stop on first test failure"
    Write-Host "  -Html                Generate HTML coverage report"
    Write-Host "  -Install             Install test dependencies first"
    Write-Host "  -Pattern <string>    Run tests matching pattern"
    Write-Host "  -Parallel <int>      Number of parallel test workers (default: 1)"
    Write-Host ""
    Write-Host "Examples:"
    Write-Host "  .\run_tests.ps1 -Category unit -Coverage"
    Write-Host "  .\run_tests.ps1 -Pattern 'test_audit_*' -Verbose"
    Write-Host "  .\run_tests.ps1 -Install -Html -Parallel 4"
}

# Show help if requested
if ($args -contains "--help" -or $args -contains "-h") {
    Show-Help
    exit 0
}

# Set error handling
$ErrorActionPreference = "Stop"

try {
    Write-ColorOutput "🔍 Audit System Test Runner" $BLUE
    Write-Host ""

    # Install dependencies if requested
    if ($Install) {
        Write-ColorOutput "📦 Installing test dependencies..." $YELLOW
        uv pip install -r requirements-test.txt
        if ($LASTEXITCODE -ne 0) {
            throw "Failed to install test dependencies"
        }
        Write-ColorOutput "✅ Dependencies installed successfully" $GREEN
        Write-Host ""
    }

    # Build pytest command
    $pytestArgs = @()
    
    # Base configuration
    $pytestArgs += "--strict-markers"
    $pytestArgs += "--strict-config"
    
    # Coverage options
    if ($Coverage -or $Html) {
        $pytestArgs += "--cov=app"
        $pytestArgs += "--cov-report=term-missing"
        
        if ($Html) {
            $pytestArgs += "--cov-report=html:htmlcov"
            $pytestArgs += "--cov-report=xml"
        }
        
        $pytestArgs += "--cov-fail-under=80"
    }
    
    # Verbosity
    if ($Verbose) {
        $pytestArgs += "-v"
    }
    
    # Fail fast
    if ($FailFast) {
        $pytestArgs += "-x"
    }
    
    # Parallel execution
    if ($Parallel -gt 1) {
        $pytestArgs += "-n"
        $pytestArgs += $Parallel.ToString()
    }
    
    # Test category filtering
    switch ($Category.ToLower()) {
        "unit" {
            $pytestArgs += "-m"
            $pytestArgs += "unit"
            Write-ColorOutput "🧪 Running unit tests..." $YELLOW
        }
        "integration" {
            $pytestArgs += "-m"
            $pytestArgs += "integration"
            Write-ColorOutput "🔗 Running integration tests..." $YELLOW
        }
        "api" {
            $pytestArgs += "-m"
            $pytestArgs += "api"
            Write-ColorOutput "🌐 Running API tests..." $YELLOW
        }
        "audit" {
            $pytestArgs += "-m"
            $pytestArgs += "audit"
            Write-ColorOutput "📋 Running audit system tests..." $YELLOW
        }
        "compliance" {
            $pytestArgs += "-m"
            $pytestArgs += "compliance"
            Write-ColorOutput "⚖️ Running compliance tests..." $YELLOW
        }
        "retention" {
            $pytestArgs += "-m"
            $pytestArgs += "retention"
            Write-ColorOutput "🗄️ Running retention tests..." $YELLOW
        }
        "all" {
            Write-ColorOutput "🏃 Running all tests..." $YELLOW
        }
        default {
            Write-ColorOutput "❌ Unknown test category: $Category" $RED
            Write-Host "Available categories: all, unit, integration, api, audit, compliance, retention"
            exit 1
        }
    }
    
    # Pattern matching
    if ($Pattern) {
        $pytestArgs += "-k"
        $pytestArgs += $Pattern
        Write-ColorOutput "🔍 Using pattern: $Pattern" $BLUE
    }
    
    # Test paths
    if ($Category -ne "all") {
        $pytestArgs += "tests/"
    } else {
        # Specific test files for comprehensive coverage
        $pytestArgs += "tests/test_audit_system.py"
        $pytestArgs += "tests/test_audit_api_endpoints.py"
    }
    
    Write-Host ""
    Write-ColorOutput "Executing: pytest $($pytestArgs -join ' ')" $BLUE
    Write-Host ""
    
    # Run the tests
    $startTime = Get-Date
    & pytest @pytestArgs
    $exitCode = $LASTEXITCODE
    $endTime = Get-Date
    $duration = $endTime - $startTime
    
    Write-Host ""
    
    if ($exitCode -eq 0) {
        Write-ColorOutput "✅ All tests passed!" $GREEN
        Write-ColorOutput "⏱️  Test duration: $($duration.TotalSeconds) seconds" $BLUE
        
        if ($Html) {
            Write-ColorOutput "📊 HTML coverage report generated: htmlcov/index.html" $BLUE
        }
    } else {
        Write-ColorOutput "❌ Some tests failed!" $RED
        Write-ColorOutput "⏱️  Test duration: $($duration.TotalSeconds) seconds" $BLUE
        exit $exitCode
    }
    
} catch {
    Write-ColorOutput "💥 Error running tests: $($_.Exception.Message)" $RED
    exit 1
}