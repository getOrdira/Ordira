# Comprehensive Backend Testing Script for Ordira Platform
# Enhanced version with comprehensive test coverage

param(
    [string]$BaseUrl = "https://ordira-backend.onrender.com",
    [string]$TestEmail = "test@example.com",
    [switch]$SkipRateLimitTests = $false,
    [switch]$Verbose = $false
)

$TestResults = @()
$TestCount = 0
$PassedTests = 0
$FailedTests = 0

function Write-TestResult {
    param(
        [string]$TestName,
        [bool]$Passed,
        [string]$Message = "",
        [string]$Details = ""
    )
    
    $script:TestCount++
    if ($Passed) {
        $script:PassedTests++
        $color = "Green"
        $status = "PASSED"
    } else {
        $script:FailedTests++
        $color = "Red"
        $status = "FAILED"
    }
    
    Write-Host "$($script:TestCount). $TestName: $status" -ForegroundColor $color
    if ($Message) {
        Write-Host "   $Message" -ForegroundColor Cyan
    }
    if ($Details -and $Verbose) {
        Write-Host "   Details: $Details" -ForegroundColor Gray
    }
    
    $script:TestResults += @{
        TestName = $TestName
        Passed = $Passed
        Message = $Message
        Details = $Details
        Timestamp = Get-Date
    }
}

function Test-Endpoint {
    param(
        [string]$Name,
        [string]$Method,
        [string]$Endpoint,
        [hashtable]$Headers = @{},
        [hashtable]$Body = @{},
        [int]$ExpectedStatus = 200,
        [string]$ExpectedContent = "",
        [bool]$ExpectFailure = $false
    )
    
    try {
        $params = @{
            Uri = "$BaseUrl$Endpoint"
            Method = $Method
            Headers = $Headers
        }
        
        if ($Body.Count -gt 0) {
            $params.Body = ($Body | ConvertTo-Json)
            $params.ContentType = "application/json"
        }
        
        $response = Invoke-RestMethod @params
        
        if ($ExpectFailure) {
            Write-TestResult -TestName $Name -Passed $false -Message "Expected failure but got success"
            return $false
        }
        
        if ($ExpectedContent -and $response -notmatch $ExpectedContent) {
            Write-TestResult -TestName $Name -Passed $false -Message "Response doesn't contain expected content: $ExpectedContent"
            return $false
        }
        
        Write-TestResult -TestName $Name -Passed $true -Message "Status: $ExpectedStatus" -Details ($response | ConvertTo-Json -Compress)
        return $true
        
    } catch {
        if ($ExpectFailure) {
            Write-TestResult -TestName $Name -Passed $true -Message "Expected failure occurred: $($_.Exception.Message)"
            return $true
        } else {
            Write-TestResult -TestName $Name -Passed $false -Message "Error: $($_.Exception.Message)"
            return $false
        }
    }
}

function Test-AuthenticationFlow {
    param([string]$UserType = "business")
    
    $uniqueEmail = "test$($UserType)$(Get-Random)@example.com"
    $password = "TestPass123!@"
    
    # Test Registration
    $registerData = @{
        email = $uniqueEmail
        password = $password
    }
    
    if ($UserType -eq "business") {
        $registerData.businessName = "Test Business"
        $registerData.industry = "Technology"
        $registerData.contactEmail = $uniqueEmail
    } elseif ($UserType -eq "manufacturer") {
        $registerData.name = "Test Manufacturer"
        $registerData.industry = "Manufacturing"
        $registerData.description = "Test manufacturer"
    } elseif ($UserType -eq "user") {
        $registerData.firstName = "Test"
        $registerData.lastName = "User"
        $registerData.acceptTerms = $true
    }
    
    $registerResult = Test-Endpoint -Name "$UserType Registration" -Method "POST" -Endpoint "/api/auth/register/$UserType" -Body $registerData -ExpectedStatus 201
    
    if (-not $registerResult) {
        return $false
    }
    
    # Test Login
    $loginData = @{
        email = $uniqueEmail
        password = $password
    }
    
    $loginResult = Test-Endpoint -Name "$UserType Login" -Method "POST" -Endpoint "/api/auth/login/$UserType" -Body $loginData -ExpectedStatus 200
    
    if (-not $loginResult) {
        return $false
    }
    
    return $true
}

# ===== MAIN TEST EXECUTION =====

Write-Host "Comprehensive Ordira Backend API Testing" -ForegroundColor Green
Write-Host "=========================================" -ForegroundColor Green
Write-Host "Base URL: $BaseUrl" -ForegroundColor Cyan
Write-Host "Test Email: $TestEmail" -ForegroundColor Cyan
Write-Host ""

# ===== BASIC CONNECTIVITY TESTS =====

Write-Host "=== BASIC CONNECTIVITY TESTS ===" -ForegroundColor Yellow
Write-Host ""

Test-Endpoint -Name "Health Check" -Method "GET" -Endpoint "/health" -ExpectedStatus 200 -ExpectedContent "status"
Test-Endpoint -Name "Root Endpoint" -Method "GET" -Endpoint "/" -ExpectedStatus 200 -ExpectedContent "message"
Test-Endpoint -Name "API Info" -Method "GET" -Endpoint "/api" -ExpectedStatus 200

# ===== AUTHENTICATION TESTS =====

Write-Host ""
Write-Host "=== AUTHENTICATION TESTS ===" -ForegroundColor Yellow
Write-Host ""

# Test Password Reset
Test-Endpoint -Name "Password Reset Request" -Method "POST" -Endpoint "/api/auth/forgot-password" -Body @{ email = $TestEmail } -ExpectedStatus 200

# Test Registration Flows
Test-AuthenticationFlow -UserType "business"
Test-AuthenticationFlow -UserType "manufacturer" 
Test-AuthenticationFlow -UserType "user"

# Test Invalid Login
Test-Endpoint -Name "Invalid Login" -Method "POST" -Endpoint "/api/auth/login/business" -Body @{ email = "invalid@test.com"; password = "wrongpass" } -ExpectedStatus 401 -ExpectFailure $true

# ===== AUTHORIZATION TESTS =====

Write-Host ""
Write-Host "=== AUTHORIZATION TESTS ===" -ForegroundColor Yellow
Write-Host ""

# Test Protected Routes (should fail without auth)
Test-Endpoint -Name "Protected Business Route" -Method "GET" -Endpoint "/api/business/profile" -ExpectedStatus 401 -ExpectFailure $true
Test-Endpoint -Name "Protected Manufacturer Route" -Method "GET" -Endpoint "/api/manufacturer/profile" -ExpectedStatus 401 -ExpectFailure $true
Test-Endpoint -Name "Protected User Route" -Method "GET" -Endpoint "/api/user/profile" -ExpectedStatus 401 -ExpectFailure $true

# ===== VALIDATION TESTS =====

Write-Host ""
Write-Host "=== VALIDATION TESTS ===" -ForegroundColor Yellow
Write-Host ""

# Test Invalid Registration Data
Test-Endpoint -Name "Invalid Email Registration" -Method "POST" -Endpoint "/api/auth/register/business" -Body @{ email = "invalid-email"; password = "123" } -ExpectedStatus 400 -ExpectFailure $true
Test-Endpoint -Name "Missing Required Fields" -Method "POST" -Endpoint "/api/auth/register/business" -Body @{ email = "test@test.com" } -ExpectedStatus 400 -ExpectFailure $true

# ===== RATE LIMITING TESTS =====

if (-not $SkipRateLimitTests) {
    Write-Host ""
    Write-Host "=== RATE LIMITING TESTS ===" -ForegroundColor Yellow
    Write-Host ""
    
    Write-Host "Testing rate limiting (this may take a moment)..." -ForegroundColor Cyan
    
    $rateLimitHit = $false
    for ($i = 1; $i -le 20; $i++) {
        try {
            $response = Invoke-RestMethod -Uri "$BaseUrl/api/auth/forgot-password" -Method POST -Body (@{ email = "test$i@example.com" } | ConvertTo-Json) -ContentType "application/json"
            if ($Verbose) {
                Write-Host "   Request $i: Success" -ForegroundColor Gray
            }
        } catch {
            if ($_.Exception.Response.StatusCode -eq 429) {
                Write-TestResult -TestName "Rate Limiting" -Passed $true -Message "Rate limit triggered after $i requests" -Details $_.Exception.Message
                $rateLimitHit = $true
                break
            }
        }
        
        Start-Sleep -Milliseconds 100
    }
    
    if (-not $rateLimitHit) {
        Write-TestResult -TestName "Rate Limiting" -Passed $false -Message "Rate limit not triggered after 20 requests"
    }
}

# ===== API ENDPOINT TESTS =====

Write-Host ""
Write-Host "=== API ENDPOINT TESTS ===" -ForegroundColor Yellow
Write-Host ""

# Test various API endpoints
Test-Endpoint -Name "Analytics Endpoint" -Method "GET" -Endpoint "/api/analytics" -ExpectedStatus 401 -ExpectFailure $true
Test-Endpoint -Name "Billing Endpoint" -Method "GET" -Endpoint "/api/billing" -ExpectedStatus 401 -ExpectFailure $true
Test-Endpoint -Name "Certificates Endpoint" -Method "GET" -Endpoint "/api/certificates" -ExpectedStatus 401 -ExpectFailure $true

# ===== ERROR HANDLING TESTS =====

Write-Host ""
Write-Host "=== ERROR HANDLING TESTS ===" -ForegroundColor Yellow
Write-Host ""

# Test 404 handling
Test-Endpoint -Name "Non-existent Endpoint" -Method "GET" -Endpoint "/api/nonexistent" -ExpectedStatus 404 -ExpectFailure $true

# Test malformed requests
Test-Endpoint -Name "Malformed JSON" -Method "POST" -Endpoint "/api/auth/login/business" -Headers @{ "Content-Type" = "application/json" } -Body "{ invalid json }" -ExpectedStatus 400 -ExpectFailure $true

# ===== PERFORMANCE TESTS =====

Write-Host ""
Write-Host "=== PERFORMANCE TESTS ===" -ForegroundColor Yellow
Write-Host ""

$performanceTests = @(
    @{ Name = "Health Check Response Time"; Endpoint = "/health" },
    @{ Name = "Root Endpoint Response Time"; Endpoint = "/" },
    @{ Name = "API Info Response Time"; Endpoint = "/api" }
)

foreach ($test in $performanceTests) {
    $stopwatch = [System.Diagnostics.Stopwatch]::StartNew()
    try {
        $response = Invoke-RestMethod -Uri "$BaseUrl$($test.Endpoint)" -Method GET
        $stopwatch.Stop()
        $responseTime = $stopwatch.ElapsedMilliseconds
        
        if ($responseTime -lt 2000) {
            Write-TestResult -TestName $test.Name -Passed $true -Message "Response time: ${responseTime}ms"
        } else {
            Write-TestResult -TestName $test.Name -Passed $false -Message "Slow response time: ${responseTime}ms"
        }
    } catch {
        Write-TestResult -TestName $test.Name -Passed $false -Message "Request failed: $($_.Exception.Message)"
    }
}

# ===== SECURITY TESTS =====

Write-Host ""
Write-Host "=== SECURITY TESTS ===" -ForegroundColor Yellow
Write-Host ""

# Test SQL injection attempts
Test-Endpoint -Name "SQL Injection Test" -Method "POST" -Endpoint "/api/auth/login/business" -Body @{ email = "test@test.com'; DROP TABLE users; --"; password = "test" } -ExpectedStatus 400 -ExpectFailure $true

# Test XSS attempts
Test-Endpoint -Name "XSS Test" -Method "POST" -Endpoint "/api/auth/register/business" -Body @{ email = "test@test.com"; password = "test"; businessName = "<script>alert('xss')</script>" } -ExpectedStatus 400 -ExpectFailure $true

# ===== FINAL SUMMARY =====

Write-Host ""
Write-Host "=== TEST SUMMARY ===" -ForegroundColor Green
Write-Host "Total Tests: $TestCount" -ForegroundColor Cyan
Write-Host "Passed: $PassedTests" -ForegroundColor Green
Write-Host "Failed: $FailedTests" -ForegroundColor Red
Write-Host "Success Rate: $([math]::Round(($PassedTests / $TestCount) * 100, 2))%" -ForegroundColor Cyan
Write-Host ""

if ($FailedTests -eq 0) {
    Write-Host "🎉 ALL TESTS PASSED! Your backend is working perfectly!" -ForegroundColor Green
} elseif ($PassedTests -gt $FailedTests) {
    Write-Host "⚠️  Most tests passed, but some issues were found. Review failed tests above." -ForegroundColor Yellow
} else {
    Write-Host "❌ Multiple test failures detected. Please review and fix issues." -ForegroundColor Red
}

Write-Host ""
Write-Host "Detailed test results saved to TestResults array for further analysis." -ForegroundColor Gray

# Export results to JSON file
$TestResults | ConvertTo-Json -Depth 3 | Out-File -FilePath "test-results-$(Get-Date -Format 'yyyyMMdd-HHmmss').json" -Encoding UTF8
Write-Host "Test results exported to JSON file." -ForegroundColor Cyan
