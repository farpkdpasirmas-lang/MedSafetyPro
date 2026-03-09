$body = @{
    service_id      = "service_f74vyvs"
    template_id     = "template_e09jdh8"
    user_id         = "nNWVl0z63PnC1p8z4"
    template_params = @{
        to_email      = "test@example.com"
        reporter_name = "Test Reporter"
    }
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "https://api.emailjs.com/api/v1.0/email/send" -Method Post -Body $body -ContentType "application/json"
    Write-Host "Success: Email Sent."
}
catch {
    $errorMsg = $_.Exception.Response.GetResponseStream()
    $reader = New-Object System.IO.StreamReader($errorMsg)
    $responseBody = $reader.ReadToEnd()
    Write-Host "Error Response: $responseBody"
}
