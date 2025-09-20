# Comprehensive Test Runner for Ordira Backend
# Runs unit tests, integration tests, and end-to-end tests

param(
    [string]$TestType = "all", # all, unit, integration, e2e, auth, sanitization
    [switch]$Coverage = $false,
    [switch]$Verbose = $false,
    [switch]$Watch = $false,
    [string]$Environment = "test"
)

$ErrorActionPreference = "Stop"

Write-Host "🧪 Ordira Backend Test Runner" -ForegroundColor Green
Write-Host "=============================" -ForegroundColor Green
Write-Host ""

# Set environment
$env:NODE_ENV = $Environment
$env:JWT_SECRET = "test-jwt-secret-key-for-testing-only"

# Test configuration
$testConfig = @{
    unit = @{
        pattern = "**/__tests__/**/*.test.ts"
        description = "Unit Tests"
        command = "jest"
    }
    integration = @{
        pattern = "**/__tests__/integration/**/*.test.ts"
        description = "Integration Tests"
        command = "jest"
    }
    auth = @{
        pattern = "**/__tests__/**/*auth*.test.ts"
        description = "Authentication Tests"
        command = "jest"
    }
    sanitization = @{
        pattern = "**/__tests__/**/*sanitizer*.test.ts"
        description = "Data Sanitization Tests"
        command = "jest"
    }
    e2e = @{
        pattern = "test-backend-comprehensive.ps1"
        description = "End-to-End Tests"
        command = "powershell"
    }
}

function Run-JestTests {
    param(
        [string]$Pattern,
        [string]$Description,
        [bool]$CoverageEnabled
    )
    
    Write-Host "Running $Description..." -ForegroundColor Yellow
    
    $jestArgs = @("--testPathPatterns=$Pattern")
    
    if ($CoverageEnabled) {
        $jestArgs += "--coverage"
    }
    
    if ($Verbose) {
        $jestArgs += "--verbose"
    }
    
    if ($Watch) {
        $jestArgs += "--watch"
    }
    
    try {
        $result = & npm test $jestArgs
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ $Description completed successfully" -ForegroundColor Green
            return $true
        } else {
            Write-Host "❌ $Description failed" -ForegroundColor Red
            return $false
        }
    } catch {
        Write-Host "❌ Error running $Description`: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

function Run-E2ETests {
    Write-Host "Running End-to-End Tests..." -ForegroundColor Yellow
    
    try {
        $e2eScript = Join-Path $PSScriptRoot "test-backend-comprehensive.ps1"
        if (Test-Path $e2eScript) {
            & $e2eScript -Verbose:$Verbose
            Write-Host "✅ End-to-End Tests completed" -ForegroundColor Green
            return $true
        } else {
            Write-Host "❌ E2E test script not found: $e2eScript" -ForegroundColor Red
            return $false
        }
    } catch {
        Write-Host "❌ Error running E2E tests: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

function Show-TestSummary {
    param(
        [hashtable]$Results
    )
    
    Write-Host ""
    Write-Host "📊 Test Summary" -ForegroundColor Green
    Write-Host "===============" -ForegroundColor Green
    
    $totalTests = $Results.Count
    $passedTests = ($Results.Values | Where-Object { $_ -eq $true }).Count
    $failedTests = $totalTests - $passedTests
    
    foreach ($testType in $Results.Keys) {
        $status = if ($Results[$testType]) { "✅ PASSED" } else { "❌ FAILED" }
        $color = if ($Results[$testType]) { "Green" } else { "Red" }
        Write-Host "$testType`: $status" -ForegroundColor $color
    }
    
    Write-Host ""
    Write-Host "Total Test Suites: $totalTests" -ForegroundColor Cyan
    Write-Host "Passed: $passedTests" -ForegroundColor Green
    Write-Host "Failed: $failedTests" -ForegroundColor Red
    Write-Host "Success Rate: $([math]::Round(($passedTests / $totalTests) * 100, 2))%" -ForegroundColor Cyan
    
    if ($failedTests -eq 0) {
        Write-Host ""
        Write-Host "🎉 All tests passed! Your backend is ready for production!" -ForegroundColor Green
    } else {
        Write-Host ""
        Write-Host "⚠️  Some tests failed. Please review the output above." -ForegroundColor Yellow
    }
}

# Main execution
$results = @{}

switch ($TestType.ToLower()) {
    "all" {
        Write-Host "Running all test suites..." -ForegroundColor Cyan
        Write-Host ""
        
        foreach ($testType in $testConfig.Keys) {
            if ($testType -eq "e2e") {
                $results[$testConfig[$testType].description] = Run-E2ETests
            } else {
                $results[$testConfig[$testType].description] = Run-JestTests -Pattern $testConfig[$testType].pattern -Description $testConfig[$testType].description -CoverageEnabled $Coverage
            }
        }
    }
    "unit" {
        $results["Unit Tests"] = Run-JestTests -Pattern $testConfig.unit.pattern -Description $testConfig.unit.description -CoverageEnabled $Coverage
    }
    "integration" {
        $results["Integration Tests"] = Run-JestTests -Pattern $testConfig.integration.pattern -Description $testConfig.integration.description -CoverageEnabled $Coverage
    }
    "auth" {
        $results["Authentication Tests"] = Run-JestTests -Pattern $testConfig.auth.pattern -Description $testConfig.auth.description -CoverageEnabled $Coverage
    }
    "sanitization" {
        $results["Data Sanitization Tests"] = Run-JestTests -Pattern $testConfig.sanitization.pattern -Description $testConfig.sanitization.description -CoverageEnabled $Coverage
    }
    "e2e" {
        $results["End-to-End Tests"] = Run-E2ETests
    }
    default {
        Write-Host "❌ Invalid test type: $TestType" -ForegroundColor Red
        Write-Host "Valid options: all, unit, integration, auth, sanitization, e2e" -ForegroundColor Yellow
        exit 1
    }
}

Show-TestSummary -Results $results

# Exit with appropriate code
$failedCount = ($results.Values | Where-Object { $_ -eq $false }).Count
if ($failedCount -gt 0) {
    exit 1
} else {
    exit 0
}
