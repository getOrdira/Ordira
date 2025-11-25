# Service Flows Testing Script (PowerShell)
# Tests key service endpoints: media uploads, subscriptions, certificates, voting contracts

# Set your production URL
$BASE_URL = if ($env:BASE_URL) { $env:BASE_URL } else { "https://ordira-backend.onrender.com" }

# Colors for output
$GREEN = 'Green'
$RED = 'Red'
$YELLOW = 'Yellow'
$CYAN = 'Cyan'
$GRAY = 'Gray'
$DARKGRAY = 'DarkGray'

Write-Host "========================================" -ForegroundColor $CYAN
Write-Host "Testing Service Flows: $BASE_URL" -ForegroundColor $CYAN
Write-Host "========================================" -ForegroundColor $CYAN
Write-Host ""

# Global variables for tokens and IDs
$env:AUTH_TOKEN = $null
$env:BUSINESS_TOKEN = $null
$env:MANUFACTURER_TOKEN = $null
$BUSINESS_ID = $null
$PRODUCT_ID = $null
$MEDIA_ID = $null
$CERTIFICATE_ID = $null
$CONTRACT_ADDRESS = $null

# ============================================
# HELPER FUNCTIONS
# ============================================

function Test-Endpoint {
    param(
        [string]$Name,
        [string]$Method,
        [string]$Uri,
        [hashtable]$Headers = @{},
        [object]$Body = $null,
        [string]$ContentType = "application/json"
    )
    
    Write-Host "$Name..." -ForegroundColor $YELLOW
    try {
        $params = @{
            Uri = $Uri
            Method = $Method
            Headers = $Headers
            ErrorAction = "Stop"
        }
        
        if ($Body) {
            if ($ContentType -eq "application/json") {
                $params.Body = ($Body | ConvertTo-Json -Depth 10)
                $params.ContentType = $ContentType
            } else {
                $params.Body = $Body
                $params.ContentType = $ContentType
            }
        }
        
        $response = Invoke-RestMethod @params
        Write-Host "[OK] $Name successful" -ForegroundColor $GREEN
        $response | ConvertTo-Json -Depth 5
        return $response
    } catch {
        Write-Host "[FAIL] $Name failed: $($_.Exception.Message)" -ForegroundColor $RED
        if ($_.Exception.Response) {
            $statusCode = [int]$_.Exception.Response.StatusCode
            Write-Host "HTTP Status: $statusCode" -ForegroundColor $RED
            
            try {
                $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
                $responseBody = $reader.ReadToEnd()
                Write-Host "Response: $responseBody" -ForegroundColor $RED
            } catch {
                Write-Host "Could not read error response" -ForegroundColor $RED
            }
        }
        return $null
    }
    Write-Host ""
}

# ============================================
# STEP 1: AUTHENTICATION SETUP
# ============================================

Write-Host "========================================" -ForegroundColor $CYAN
Write-Host "Step 1: Authentication Setup" -ForegroundColor $CYAN
Write-Host "========================================" -ForegroundColor $CYAN
Write-Host ""

# Register and login business account (needed for most operations)
Write-Host "Registering Business Account..." -ForegroundColor $YELLOW
$businessTimestamp = [int][double]::Parse((Get-Date -UFormat %s))
$businessEmail = "testbusiness$businessTimestamp@example.com"
$businessPassword = "TestBusiness123!"

$businessRegisterBody = @{
    accountType = "business"
    email = $businessEmail
    password = $businessPassword   # use the variable here
    firstName = "Test"
    lastName = "Business"
    dateOfBirth = "1990-01-01"
    businessName = "Test Business $businessTimestamp"
    businessType = "brand"
    address = "123 Test Street, Test City, TC 12345"
    marketingConsent = $true
    platformUpdatesConsent = $true
} | ConvertTo-Json

try {
    $registerResponse = Invoke-RestMethod -Uri "$BASE_URL/api/auth/register" `
        -Method Post `
        -Body $businessRegisterBody `
        -ContentType "application/json" `
        -ErrorAction Stop

    Write-Host "[OK] Business registration successful" -ForegroundColor $GREEN
    $BUSINESS_ID = $registerResponse.data.business.id

    # Try login (may fail if email verification required)
    $loginBody = @{
        email = $businessEmail
        password = $businessPassword
    } | ConvertTo-Json

    try {
        $loginResponse = Invoke-RestMethod -Uri "$BASE_URL/api/auth/business/login" `
            -Method Post `
            -Body $loginBody `
            -ContentType "application/json" `
            -ErrorAction Stop

        # API wraps response in { success: true, data: { token, business, ... } }
        if ($loginResponse.data -and $loginResponse.data.token) {
            $env:BUSINESS_TOKEN = $loginResponse.data.token
            Write-Host "[OK] Business login successful - token received" -ForegroundColor $GREEN
        } elseif ($loginResponse.token) {
            # Fallback for non-wrapped response
            $env:BUSINESS_TOKEN = $loginResponse.token
            Write-Host "[OK] Business login successful - token received" -ForegroundColor $GREEN
        } else {
            Write-Host "[WARN] Login succeeded but no token in response" -ForegroundColor $YELLOW
            $loginResponse | ConvertTo-Json -Depth 5
        }
    } catch {
        Write-Host "[WARN] Business login failed (email verification may be required)" -ForegroundColor $YELLOW
        Write-Host "   Set SKIP_EMAIL_VERIFICATION=true for testing" -ForegroundColor $YELLOW
    }
} catch {
    Write-Host "[FAIL] Business registration failed: $($_.Exception.Message)" -ForegroundColor $RED
}

Write-Host ""


# ============================================
# STEP 2: MEDIA UPLOAD TESTS
# ============================================

if ($env:BUSINESS_TOKEN) {
    Write-Host "========================================" -ForegroundColor $CYAN
    Write-Host "Step 2: Media Upload Tests" -ForegroundColor $CYAN
    Write-Host "========================================" -ForegroundColor $CYAN
    Write-Host ""
    
    $headers = @{
        "Authorization" = "Bearer $($env:BUSINESS_TOKEN)"
    }
    
    # Test 2.1: Create a test image file (simple 1x1 PNG)
    Write-Host "2.1. Creating test image file..." -ForegroundColor $YELLOW
    $testImagePath = "$env:TEMP\test_image_$businessTimestamp.png"
    
    # Create a minimal valid PNG file (1x1 pixel)
    $pngBytes = [Convert]::FromBase64String("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==")
    [System.IO.File]::WriteAllBytes($testImagePath, $pngBytes)
    Write-Host "[OK] Test image created: $testImagePath" -ForegroundColor $GREEN
    Write-Host ""
    
    # Test 2.2: Upload single media file
    Write-Host "2.2. Testing Single Media Upload..." -ForegroundColor $YELLOW
    Write-Host "[INFO] Note: PowerShell multipart uploads are complex. Using Invoke-WebRequest..." -ForegroundColor $GRAY
    try {
        $fileName = "test_image_$businessTimestamp.png"
        
        # Create multipart form data using .NET classes
        $boundary = [System.Guid]::NewGuid().ToString()
        $LF = "`r`n"
        
        $fileBytes = [System.IO.File]::ReadAllBytes($testImagePath)
        $enc = [System.Text.Encoding]::GetEncoding("iso-8859-1")
        
        $bodyParts = New-Object System.Collections.ArrayList
        
        # File part
        $fileHeader = "--$boundary$LF"
        $fileHeader += "Content-Disposition: form-data; name=`"image`"; filename=`"$fileName`"$LF"
        $fileHeader += "Content-Type: image/png$LF$LF"
        $bodyParts.Add($enc.GetBytes($fileHeader)) | Out-Null
        $bodyParts.Add($fileBytes) | Out-Null
        $bodyParts.Add($enc.GetBytes($LF)) | Out-Null
        
        # Category field
        $categoryPart = "--$boundary$LF"
        $categoryPart += "Content-Disposition: form-data; name=`"category`"$LF$LF"
        $categoryPart += "product$LF"
        $bodyParts.Add($enc.GetBytes($categoryPart)) | Out-Null
        
        # Description field
        $descPart = "--$boundary$LF"
        $descPart += "Content-Disposition: form-data; name=`"description`"$LF$LF"
        $descPart += "Test image upload$LF"
        $bodyParts.Add($enc.GetBytes($descPart)) | Out-Null
        
        # Closing boundary
        $bodyParts.Add($enc.GetBytes("--$boundary--$LF")) | Out-Null
        
        # Combine all parts
        $totalLength = ($bodyParts | Measure-Object -Property Length -Sum).Sum
        $bodyStream = New-Object System.IO.MemoryStream($totalLength)
        foreach ($part in $bodyParts) {
            $bodyStream.Write($part, 0, $part.Length)
        }
        $bodyBytes = $bodyStream.ToArray()
        $bodyStream.Close()
        
        $uploadHeaders = @{
            "Authorization" = "Bearer $($env:BUSINESS_TOKEN)"
            "Content-Type" = "multipart/form-data; boundary=$boundary"
        }
        
        $uploadResponse = Invoke-RestMethod -Uri "$BASE_URL/api/media/upload" `
            -Method Post `
            -Headers $uploadHeaders `
            -Body $bodyBytes `
            -ErrorAction Stop
        
        Write-Host "[OK] Media upload successful" -ForegroundColor $GREEN
        $uploadResponse | ConvertTo-Json -Depth 5
        
        if ($uploadResponse.media -and $uploadResponse.media._id) {
            $MEDIA_ID = $uploadResponse.media._id
            Write-Host "[OK] Media ID: $MEDIA_ID" -ForegroundColor $GREEN
        }
    } catch {
        Write-Host "[FAIL] Media upload failed: $($_.Exception.Message)" -ForegroundColor $RED
        Write-Host "[INFO] This may require using curl or a different tool for multipart uploads" -ForegroundColor $YELLOW
        if ($_.Exception.Response) {
            $statusCode = [int]$_.Exception.Response.StatusCode
            Write-Host "HTTP Status: $statusCode" -ForegroundColor $RED
        }
    }
    Write-Host ""
    
    # Cleanup test file
    if (Test-Path $testImagePath) {
        Remove-Item $testImagePath -Force
    }
} else {
    Write-Host "[WARN] Skipping media upload tests - no business token" -ForegroundColor $YELLOW
    Write-Host ""
}

# ============================================
# STEP 3: SUBSCRIPTION/BILLING TESTS
# ============================================

if ($env:BUSINESS_TOKEN) {
    Write-Host "========================================" -ForegroundColor $CYAN
    Write-Host "Step 3: Subscription/Billing Tests" -ForegroundColor $CYAN
    Write-Host "========================================" -ForegroundColor $CYAN
    Write-Host ""
    
    $headers = @{
        "Authorization" = "Bearer $($env:BUSINESS_TOKEN)"
        "Content-Type" = "application/json"
    }
    
    # Test 3.1: Get billing info
    Write-Host "3.1. Testing Get Billing Info..." -ForegroundColor $YELLOW
    $billingInfo = Test-Endpoint -Name "Get Billing Info" `
        -Method "GET" `
        -Uri "$BASE_URL/api/billing/billing/info" `
        -Headers $headers
    Write-Host ""

    # Test 3.2: Calculate pricing summary
    Write-Host "3.2. Testing Calculate Pricing Summary..." -ForegroundColor $YELLOW
    $pricingQuery = "plan=growth"  # Omit couponCode if empty
    $pricingSummary = Test-Endpoint -Name "Calculate Pricing" `
        -Method "GET" `
        -Uri "$BASE_URL/api/billing/billing/calculate-pricing?$pricingQuery" `
        -Headers $headers
    Write-Host ""

    # Test 3.3: Create checkout session (Stripe)
    Write-Host "3.3. Testing Create Checkout Session (Stripe)..." -ForegroundColor $YELLOW
    $checkoutBody = @{
        plan = "growth"
        # couponCode omitted (optional field)
        addons = @()
        metadata = @{
            test = $true
            timestamp = $businessTimestamp
        }
    }

    $checkoutSession = Test-Endpoint -Name "Create Checkout Session" `
        -Method "POST" `
        -Uri "$BASE_URL/api/billing/billing/checkout" `
        -Headers $headers `
        -Body $checkoutBody
    
    if ($checkoutSession -and $checkoutSession.session) {
        Write-Host "[OK] Checkout session ID: $($checkoutSession.session)" -ForegroundColor $GREEN
    }
    Write-Host ""
} else {
    Write-Host "[WARN] Skipping subscription tests - no business token" -ForegroundColor $YELLOW
    Write-Host ""
}

# ============================================
# STEP 4: CERTIFICATE GENERATION TESTS
# ============================================

if ($env:BUSINESS_TOKEN) {
    Write-Host "========================================" -ForegroundColor $CYAN
    Write-Host "Step 4: Certificate Generation Tests" -ForegroundColor $CYAN
    Write-Host "========================================" -ForegroundColor $CYAN
    Write-Host ""
    
    $headers = @{
        "Authorization" = "Bearer $($env:BUSINESS_TOKEN)"
        "Content-Type" = "application/json"
    }
    
    # Note: Certificate creation requires a productId
    # For testing, we'll need to create a product first or use a mock ID
    Write-Host "[INFO] Certificate creation requires a valid productId" -ForegroundColor $YELLOW
    Write-Host "[INFO] You may need to create a product first or use an existing product ID" -ForegroundColor $YELLOW
    Write-Host ""
    
    # Test 4.1: Create certificate (with placeholder productId)
    Write-Host "4.1. Testing Create Certificate..." -ForegroundColor $YELLOW
    Write-Host "[WARN] Using placeholder productId - replace with actual product ID" -ForegroundColor $YELLOW
    
    # Generate a valid MongoDB ObjectId format (24 hex characters)
    $placeholderProductId = "000000000000000000000001"
    
    $certificateBody = @{
        productId = $placeholderProductId
        recipient = "test@example.com"
        contactMethod = "email"
        metadata = @{
            certificateLevel = "bronze"
            customMessage = "Test certificate"
            attributes = @(
                @{
                    trait_type = "Quality"
                    value = "Premium"
                }
            )
        }
        deliveryOptions = @{
            priority = "standard"
            notifyRecipient = $true
        }
        web3Options = @{
            autoTransfer = $false
        }
    }
    
    $certificate = Test-Endpoint -Name "Create Certificate" `
        -Method "POST" `
        -Uri "$BASE_URL/api/certificates/minting/create" `
        -Headers $headers `
        -Body $certificateBody
    
    if ($certificate -and $certificate.certificate) {
        $CERTIFICATE_ID = $certificate.certificate._id
        Write-Host "[OK] Certificate ID: $CERTIFICATE_ID" -ForegroundColor $GREEN
    }
    Write-Host ""
} else {
    Write-Host "[WARN] Skipping certificate tests - no business token" -ForegroundColor $YELLOW
    Write-Host ""
}

# ============================================
# STEP 5: VOTING CONTRACT GENERATION TESTS
# ============================================

if ($env:BUSINESS_TOKEN) {
    Write-Host "========================================" -ForegroundColor $CYAN
    Write-Host "Step 5: Voting Contract Generation Tests" -ForegroundColor $CYAN
    Write-Host "========================================" -ForegroundColor $CYAN
    Write-Host ""
    
    $headers = @{
        "Authorization" = "Bearer $($env:BUSINESS_TOKEN)"
        "Content-Type" = "application/json"
    }
    
    # Test 5.1: Deploy voting contract
    Write-Host "5.1. Testing Deploy Voting Contract..." -ForegroundColor $YELLOW
    $deployBody = @{
        businessId = $BUSINESS_ID
        votingDelay = 0
        votingPeriod = 604800  # 7 days in seconds
        quorumPercentage = 10
    }
    
    $deployResponse = Test-Endpoint -Name "Deploy Voting Contract" `
        -Method "POST" `
        -Uri "$BASE_URL/api/votes/deployment/deploy" `
        -Headers $headers `
        -Body $deployBody
    
    if ($deployResponse -and $deployResponse.contractAddress) {
        $CONTRACT_ADDRESS = $deployResponse.contractAddress
        Write-Host "[OK] Contract Address: $CONTRACT_ADDRESS" -ForegroundColor $GREEN
    }
    Write-Host ""
    
    # Test 5.2: Get contract address
    if ($BUSINESS_ID) {
        Write-Host "5.2. Testing Get Contract Address..." -ForegroundColor $YELLOW
        $contractQuery = "businessId=$BUSINESS_ID"
        $contractInfo = Test-Endpoint -Name "Get Contract Address" `
            -Method "GET" `
            -Uri "$BASE_URL/api/votes/deployment/contract-address?$contractQuery" `
            -Headers $headers
        Write-Host ""
    }
    
    # Test 5.3: Get contract deployment info
    if ($BUSINESS_ID) {
        Write-Host "5.3. Testing Get Contract Deployment Info..." -ForegroundColor $YELLOW
        $deploymentQuery = "businessId=$BUSINESS_ID"
        $deploymentInfo = Test-Endpoint -Name "Get Deployment Info" `
            -Method "GET" `
            -Uri "$BASE_URL/api/votes/deployment/deployment-info?$deploymentQuery" `
            -Headers $headers
        Write-Host ""
    }
} else {
    Write-Host "[WARN] Skipping voting contract tests - no business token" -ForegroundColor $YELLOW
    Write-Host ""
}

# ============================================
# SUMMARY
# ============================================

Write-Host "========================================" -ForegroundColor $CYAN
Write-Host "Testing Summary" -ForegroundColor $CYAN
Write-Host "========================================" -ForegroundColor $CYAN
Write-Host "Base URL: $BASE_URL"
Write-Host "Business Email: $businessEmail"
Write-Host ""

if ($env:BUSINESS_TOKEN) {
    $tokenPreview = $env:BUSINESS_TOKEN.Substring(0, [Math]::Min(20, $env:BUSINESS_TOKEN.Length))
    Write-Host "Business Token: $tokenPreview..." -ForegroundColor $GREEN
} else {
    Write-Host "[WARN] No business token - some tests were skipped" -ForegroundColor $YELLOW
    Write-Host "   Set SKIP_EMAIL_VERIFICATION=true to enable auto-verification" -ForegroundColor $YELLOW
}

Write-Host ""
if ($BUSINESS_ID) {
    Write-Host "Business ID: $BUSINESS_ID" -ForegroundColor $GREEN
}
if ($MEDIA_ID) {
    Write-Host "Media ID: $MEDIA_ID" -ForegroundColor $GREEN
}
if ($CERTIFICATE_ID) {
    Write-Host "Certificate ID: $CERTIFICATE_ID" -ForegroundColor $GREEN
}
if ($CONTRACT_ADDRESS) {
    Write-Host "Contract Address: $CONTRACT_ADDRESS" -ForegroundColor $GREEN
}
Write-Host ""

Write-Host "Note: Some endpoints require:" -ForegroundColor $YELLOW
Write-Host "  - Valid product IDs for certificates" -ForegroundColor $YELLOW
Write-Host "  - Stripe configuration for checkout sessions" -ForegroundColor $YELLOW
Write-Host "  - Blockchain configuration for contract deployment" -ForegroundColor $YELLOW
Write-Host ""

