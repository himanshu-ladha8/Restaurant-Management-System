using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using RMS.Models.Auth;
using RMS.ServiceFramework.Data;
using RMS.ServiceFramework.Models;
using RMS.Services;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;

namespace RMS.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly RMSDbContext _context;
    private readonly JwtSettings _jwtSettings;
    private readonly IEmailService _emailService;
    private readonly ILogger<AuthController> _logger;
    
    // In-memory storage for password reset tokens (for production, use database)
    private static readonly Dictionary<string, (string token, DateTime expires)> _resetTokens = new();
    private static readonly object _tokenLock = new();
    
    // In-memory storage for OTP (for production, use database or email service)
    private static readonly Dictionary<string, (string otp, DateTime expires, User user)> _loginOtps = new();
    private static readonly object _otpLock = new();
    
    // Track last login email sent time per user (to prevent spam - only send email every 2-3 hours)
    private static readonly Dictionary<string, DateTime> _lastLoginEmailSent = new();
    private static readonly object _emailLock = new();
    private const int EMAIL_COOLDOWN_HOURS = 2; // Send email only if 2+ hours have passed since last email

    public AuthController(RMSDbContext context, IOptions<JwtSettings> jwtOptions, IEmailService emailService, ILogger<AuthController> logger)
    {
        _context = context;
        _jwtSettings = jwtOptions.Value;
        _emailService = emailService;
        _logger = logger;
    }

    [HttpPost("register")]
    public async Task<IActionResult> Register(string fullName, string email, string password, string role, String PhoneNumber)
    {
        if (await _context.Users.AnyAsync(u => u.Email == email)) // Refers to the Usertable in databse via entityframework
        {                                   // u => u - labda expression checks this email exit or not with the email by u.email
            return BadRequest("Email already exists.");
        }

        var user = new User
        {
            FullName = fullName,
            Email = email,
            PasswordHash = HashPassword(password),
            UserType = role,
            PhoneNumber = PhoneNumber,
            CreatedAt = DateTime.UtcNow
        };

        _context.Users.Add(user);
        await _context.SaveChangesAsync();

        // Return userId for RestaurantAdmin to complete restaurant setup
        if (role == "RestaurantAdmin")
        {
            return Ok(new { userId = user.UserId, message = "Please complete restaurant details" });
        }

        return Ok();
    }

    // Endpoint for RestaurantAdmin to create restaurant and link to user
    [HttpPost("restaurant-admin/complete-setup")]
    public async Task<IActionResult> CompleteRestaurantAdminSetup(int userId, string restaurantName, string? address, string? phone, string? openTime = null, string? closeTime = null)
    {
        var user = await _context.Users.FindAsync(userId);
        if (user == null)
        {
            return NotFound("User not found");
        }

        if (user.UserType != "RestaurantAdmin")
        {
            return BadRequest("User is not a RestaurantAdmin");
        }

        // Parse time strings to TimeOnly if provided
        TimeOnly? parsedOpenTime = null;
        TimeOnly? parsedCloseTime = null;

        if (!string.IsNullOrEmpty(openTime) && TimeOnly.TryParse(openTime, out var openTimeResult))
        {
            parsedOpenTime = openTimeResult;
        }

        if (!string.IsNullOrEmpty(closeTime) && TimeOnly.TryParse(closeTime, out var closeTimeResult))
        {
            parsedCloseTime = closeTimeResult;
        }

        // Create restaurant
        var restaurant = new Restaurant
        {
            Name = restaurantName,
            Address = address,
            Phone = phone,
            OpenTime = parsedOpenTime,
            CloseTime = parsedCloseTime,
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };

        _context.Restaurants.Add(restaurant);
        await _context.SaveChangesAsync();

        // Link user to restaurant
        user.RestaurantId = restaurant.RestaurantId;
        await _context.SaveChangesAsync();

        return Ok(new { restaurantId = restaurant.RestaurantId, message = "Restaurant setup completed successfully" });
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login(string email, string password)
    {
        var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == email);
        if (user == null)
        {
            return Unauthorized("Invalid credentials.");
        }

        if (user.PasswordHash != HashPassword(password))
        {
            return Unauthorized("Invalid credentials.");
        }

        user.OTP = GenerateOtp();
        _context.Users.Update(user);
        _context.SaveChanges();
        var token = GenerateJwtToken(user);
        
        // Send login success email for all user types (Customer, Admin, RestaurantAdmin)
        // Only send if 2+ hours have passed since last email to prevent spam
        _ = Task.Run(async () =>
        {
            try
            {
                if (ShouldSendLoginEmail(user.Email))
                {
                    _logger.LogInformation($"[EMAIL] Starting email send to {user.Email} for user type: {user.UserType}");
                    var emailBody = GenerateLoginSuccessEmailBody(user.FullName ?? user.Email, DateTime.UtcNow, user.UserType);
                    await _emailService.SendEmailAsync(
                        user.Email,
                        "Login Successful - Restaurant Management System",
                        emailBody
                    );
                    
                    // Update last email sent time
                    lock (_emailLock)
                    {
                        _lastLoginEmailSent[user.Email] = DateTime.UtcNow;
                    }
                    
                    _logger.LogInformation($"[EMAIL] SUCCESS: Login email sent successfully to {user.Email}");
                }
                else
                {
                    // Email skipped due to cooldown - this is logged in ShouldSendLoginEmail method
                }
            }
            catch (Exception ex)
            {
                // Log the error but don't fail the login
                _logger.LogError(ex, $"[EMAIL] FAILED: Failed to send login email to {user.Email}");
                _logger.LogError($"[EMAIL] Error Message: {ex.Message}");
                _logger.LogError($"[EMAIL] Stack Trace: {ex.StackTrace}");
                if (ex.InnerException != null)
                {
                    _logger.LogError($"[EMAIL] Inner Exception: {ex.InnerException.Message}");
                }
            }
        }).ContinueWith(task =>
        {
            if (task.IsFaulted)
            {
                _logger.LogError($"[EMAIL] Task faulted: {task.Exception?.GetBaseException()?.Message}");
            }
        }, TaskContinuationOptions.OnlyOnFaulted);
        
        return Ok(new { 
            token, 
            role = user.UserType, 
            userId = user.UserId,
            restaurantId = user.RestaurantId, // Include RestaurantId for RestaurantAdmin
            fullName = user.FullName // Include FullName for display
        });
    }

    [HttpPost("send-otp")]
    public async Task<IActionResult> SendOtp(string email, string password)
    {
        // First, get user ID and password hash only (to avoid column mapping issues)
        var userInfo = await _context.Users
            .Where(u => u.Email == email)
            .Select(u => new { u.UserId, u.PasswordHash, u.UserType, u.RestaurantId, u.FullName })
            .FirstOrDefaultAsync();
            
        if (userInfo == null)
        {
            return Unauthorized("Invalid credentials.");
        }

        if (userInfo.PasswordHash != HashPassword(password))
        {
            return Unauthorized("Invalid credentials.");
        }

        // Generate 4-digit OTP (for all user types)
        var otp = GenerateOtp();
        var expiresAt = DateTime.UtcNow.AddMinutes(2); // OTP expires in 2 minutes
        
        // Update OTP directly using SQL to avoid column mapping issues with missing columns
        await _context.Database.ExecuteSqlRawAsync(
            "UPDATE [Users] SET [OTP] = {0} WHERE [UserId] = {1}",
            otp, userInfo.UserId);
        
        // Create user object for storing in memory (without querying all columns)
        var user = new User
        {
            UserId = userInfo.UserId,
            Email = email,
            FullName = userInfo.FullName,
            UserType = userInfo.UserType,
            RestaurantId = userInfo.RestaurantId,
            PasswordHash = userInfo.PasswordHash,
            OTP = otp
        };
        
        lock (_otpLock)
        {
            // Clean up expired OTPs
            var expiredKeys = _loginOtps.Where(kvp => kvp.Value.expires < DateTime.UtcNow).Select(kvp => kvp.Key).ToList();
            foreach (var key in expiredKeys)
            {
                _loginOtps.Remove(key);
            }

            // Store the OTP with user info
            _loginOtps[email] = (otp, expiresAt, user);
        }

        // Send OTP via email
        _ = Task.Run(async () =>
        {
            try
            {
                _logger.LogInformation($"[OTP EMAIL] Starting OTP email send to {email}");
                var emailBody = GenerateOtpEmailBody(userInfo.FullName ?? email, otp);
                await _emailService.SendEmailAsync(
                    email,
                    "Your Login OTP - Restaurant Management System",
                    emailBody
                );
                _logger.LogInformation($"[OTP EMAIL] SUCCESS: OTP email sent successfully to {email}");
            }
            catch (Exception ex)
            {
                // Log the error but don't fail the OTP request
                _logger.LogError(ex, $"[OTP EMAIL] FAILED: Failed to send OTP email to {email}");
                _logger.LogError($"[OTP EMAIL] Error Message: {ex.Message}");
                _logger.LogError($"[OTP EMAIL] Stack Trace: {ex.StackTrace}");
                if (ex.InnerException != null)
                {
                    _logger.LogError($"[OTP EMAIL] Inner Exception: {ex.InnerException.Message}");
                }
            }
        }).ContinueWith(task =>
        {
            if (task.IsFaulted)
            {
                _logger.LogError($"[OTP EMAIL] Task faulted: {task.Exception?.GetBaseException()?.Message}");
            }
        }, TaskContinuationOptions.OnlyOnFaulted);

        // For development/testing, return OTP in response
        // In production, you may want to remove the OTP from the response
        return Ok(new { 
            message = "OTP has been sent to your email.",
            otp = otp // Remove this in production - only for development/testing
        });
    }

    [HttpPost("verify-otp-login")]
    public async Task<IActionResult> VerifyOtpLogin(string email, string otp)
    {
        if (string.IsNullOrWhiteSpace(email) || string.IsNullOrWhiteSpace(otp))
        {
            return BadRequest("Email and OTP are required.");
        }

        User? user = null;
        lock (_otpLock)
        {
            if (!_loginOtps.ContainsKey(email))
            {
                return BadRequest("OTP not found. Please request a new OTP.");
            }

            var otpEntry = _loginOtps[email];
            
            // Check if OTP has expired
            if (otpEntry.expires < DateTime.UtcNow)
            {
                _loginOtps.Remove(email);
                return BadRequest("OTP has expired. Please request a new one.");
            }

            // Verify OTP
            if (otpEntry.otp != otp)
            {
                return BadRequest("Invalid OTP.");
            }

            user = otpEntry.user;
            
            // Remove the used OTP
            _loginOtps.Remove(email);
        }

        if (user == null)
        {
            return BadRequest("User not found.");
        }

        // Generate JWT token
        var token = GenerateJwtToken(user);
        
        // Send login success email for all user types (Customer, Admin, RestaurantAdmin)
        // Only send if 2+ hours have passed since last email to prevent spam
        _ = Task.Run(async () =>
        {
            try
            {
                if (ShouldSendLoginEmail(user.Email))
                {
                    _logger.LogInformation($"[EMAIL] Starting email send to {user.Email} for user type: {user.UserType}");
                    var emailBody = GenerateLoginSuccessEmailBody(user.FullName ?? user.Email, DateTime.UtcNow, user.UserType);
                    await _emailService.SendEmailAsync(
                        user.Email,
                        "Login Successful - Restaurant Management System",
                        emailBody
                    );
                    
                    // Update last email sent time
                    lock (_emailLock)
                    {
                        _lastLoginEmailSent[user.Email] = DateTime.UtcNow;
                    }
                    
                    _logger.LogInformation($"[EMAIL] SUCCESS: Login email sent successfully to {user.Email}");
                }
                else
                {
                    // Email skipped due to cooldown - this is logged in ShouldSendLoginEmail method
                }
            }
            catch (Exception ex)
            {
                // Log the error but don't fail the login
                _logger.LogError(ex, $"[EMAIL] FAILED: Failed to send login email to {user.Email}");
                _logger.LogError($"[EMAIL] Error Message: {ex.Message}");
                _logger.LogError($"[EMAIL] Stack Trace: {ex.StackTrace}");
                if (ex.InnerException != null)
                {
                    _logger.LogError($"[EMAIL] Inner Exception: {ex.InnerException.Message}");
                }
            }
        }).ContinueWith(task =>
        {
            if (task.IsFaulted)
            {
                _logger.LogError($"[EMAIL] Task faulted: {task.Exception?.GetBaseException()?.Message}");
            }
        }, TaskContinuationOptions.OnlyOnFaulted);
        
        return Ok(new { 
            token, 
            role = user.UserType, 
            userId = user.UserId,
            restaurantId = user.RestaurantId,
            fullName = user.FullName // Include FullName for display
        });
    }

    private string GenerateOtp()
    {
        // Generate a 4-digit OTP (0000-9999)
        var random = new Random();
        return random.Next(0, 10000).ToString("D4"); // D4 ensures 4 digits with leading zeros
    }

    [HttpPost("forgot-password")]
    public async Task<IActionResult> ForgotPassword(string email)
    {
        if (string.IsNullOrWhiteSpace(email))
        {
            return BadRequest("Email is required.");
        }

        var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == email);
        if (user == null)
        {
            // Don't reveal if email exists for security reasons
            // In production, you would still return success here
            return Ok(new { message = "If the email exists, a password reset link has been sent." });
        }

        // Generate a secure reset token
        var resetToken = GenerateResetToken();
        var expiresAt = DateTime.UtcNow.AddHours(1); // Token expires in 1 hour

        lock (_tokenLock)
        {
            // Clean up expired tokens
            var expiredKeys = _resetTokens.Where(kvp => kvp.Value.expires < DateTime.UtcNow).Select(kvp => kvp.Key).ToList();
            foreach (var key in expiredKeys)
            {
                _resetTokens.Remove(key);
            }

            // Store the token
            _resetTokens[email] = (resetToken, expiresAt);
        }

        // In production, send email with reset link
        // For now, return the token in response (for development/testing only)
        // In production, remove this and send email instead
        var resetLink = $"/reset-password?token={resetToken}&type=admin";
        
        return Ok(new { 
            message = "Password reset link has been generated.",
            // Remove this in production - only for development
            resetToken = resetToken,
            resetLink = resetLink
        });
    }

    [HttpPost("reset-password")]
    public async Task<IActionResult> ResetPassword(string token, string newPassword)
    {
        if (string.IsNullOrWhiteSpace(token))
        {
            return BadRequest("Reset token is required.");
        }

        if (string.IsNullOrWhiteSpace(newPassword) || newPassword.Length < 6)
        {
            return BadRequest("Password must be at least 6 characters long.");
        }

        string? email = null;
        lock (_tokenLock)
        {
            // Find the email associated with this token
            var tokenEntry = _resetTokens.FirstOrDefault(kvp => kvp.Value.token == token);
            if (tokenEntry.Key == null)
            {
                return BadRequest("Invalid or expired reset token.");
            }

            // Check if token has expired
            if (tokenEntry.Value.expires < DateTime.UtcNow)
            {
                _resetTokens.Remove(tokenEntry.Key);
                return BadRequest("Reset token has expired. Please request a new one.");
            }

            email = tokenEntry.Key;
        }

        if (string.IsNullOrEmpty(email))
        {
            return BadRequest("Invalid reset token.");
        }

        // Find user and update password
        var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == email);
        if (user == null)
        {
            return BadRequest("User not found.");
        }

        // Update password
        user.PasswordHash = HashPassword(newPassword);
        await _context.SaveChangesAsync();

        // Remove the used token
        lock (_tokenLock)
        {
            _resetTokens.Remove(email);
        }

        return Ok(new { message = "Password has been reset successfully." });
    }
    
    /// <summary>
    /// Checks if login email should be sent based on cooldown period (2 hours) for a specific email address.
    /// Each email address has its own cooldown timer - different users can receive emails independently.
    /// Returns true if email should be sent, false if it was sent recently to this specific email.
    /// </summary>
    private bool ShouldSendLoginEmail(string email)
    {
        lock (_emailLock)
        {
            // Clean up old entries (older than 24 hours) to prevent memory leak
            var cutoffTime = DateTime.UtcNow.AddHours(-24);
            var oldEntries = _lastLoginEmailSent.Where(kvp => kvp.Value < cutoffTime).Select(kvp => kvp.Key).ToList();
            foreach (var oldEmail in oldEntries)
            {
                _lastLoginEmailSent.Remove(oldEmail);
            }
            
            // Check if email was sent recently to THIS SPECIFIC email address
            // Each email address has independent cooldown tracking
            if (_lastLoginEmailSent.TryGetValue(email, out var lastSentTime))
            {
                var timeSinceLastEmail = DateTime.UtcNow - lastSentTime;
                var hoursRemaining = EMAIL_COOLDOWN_HOURS - timeSinceLastEmail.TotalHours;
                
                if (timeSinceLastEmail.TotalHours < EMAIL_COOLDOWN_HOURS)
                {
                    _logger.LogInformation($"[EMAIL] Cooldown active for {email}: Email was sent {timeSinceLastEmail.TotalMinutes:F1} minutes ago ({hoursRemaining:F2} hours remaining). Skipping email.");
                    return false;
                }
                else
                {
                    _logger.LogInformation($"[EMAIL] Cooldown expired for {email}: {timeSinceLastEmail.TotalHours:F2} hours have passed. Email will be sent.");
                }
            }
            else
            {
                _logger.LogInformation($"[EMAIL] First login email for {email} - will be sent.");
            }
            
            // Email should be sent (either first time for this email or cooldown period has passed)
            return true;
        }
    }

    private string GenerateResetToken()
    {
        // Generate a secure random token
        using var rng = RandomNumberGenerator.Create();
        var bytes = new byte[32];
        rng.GetBytes(bytes);
        return Convert.ToBase64String(bytes).Replace("+", "-").Replace("/", "_").Replace("=", "");
    }

    private string GenerateJwtToken(User user)
    {
        var claims = new List<Claim>
        {
            new Claim("UserId", user.UserId.ToString()),
            new Claim(ClaimTypes.Role, user.UserType),
            new Claim(JwtRegisteredClaimNames.Sub, user.Email)
        };

        // Add RestaurantId claim for RestaurantAdmin users
        if (user.UserType == "RestaurantAdmin" && user.RestaurantId.HasValue)
        {
            claims.Add(new Claim("RestaurantId", user.RestaurantId.Value.ToString()));
        }

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_jwtSettings.Key));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var token = new JwtSecurityToken(
            issuer: _jwtSettings.Issuer,
            audience: _jwtSettings.Audience,
            claims: claims,
            expires: DateTime.UtcNow.AddMinutes(_jwtSettings.ExpireMinutes),
            signingCredentials: creds);

        return new JwtSecurityTokenHandler().WriteToken(token);
    }
    private static string HashPassword(string password)
    {
        using var sha256 = SHA256.Create();
        var bytes = Encoding.UTF8.GetBytes(password);
        var hash = sha256.ComputeHash(bytes);
        return Convert.ToBase64String(hash);
    }

    private string GenerateOtpEmailBody(string userName, string otp)
    {
        return $@"
<!DOCTYPE html>
<html>
<head>
    <meta charset='utf-8'>
    <meta name='viewport' content='width=device-width, initial-scale=1.0'>
    <style>
        body {{
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f4f4f4;
        }}
        .container {{
            background-color: #ffffff;
            border-radius: 10px;
            padding: 30px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }}
        .header {{
            text-align: center;
            color: #2c3e50;
            border-bottom: 3px solid #3498db;
            padding-bottom: 20px;
            margin-bottom: 30px;
        }}
        .header h1 {{
            margin: 0;
            font-size: 28px;
        }}
        .content {{
            margin: 20px 0;
        }}
        .otp-box {{
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: #ffffff;
            padding: 30px;
            border-radius: 10px;
            text-align: center;
            margin: 30px 0;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        }}
        .otp-code {{
            font-size: 48px;
            font-weight: bold;
            letter-spacing: 8px;
            margin: 20px 0;
            font-family: 'Courier New', monospace;
        }}
        .info-box {{
            background-color: #ecf0f1;
            border-left: 4px solid #3498db;
            padding: 15px;
            margin: 20px 0;
            border-radius: 4px;
        }}
        .info-box strong {{
            color: #2c3e50;
        }}
        .footer {{
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #ddd;
            text-align: center;
            color: #7f8c8d;
            font-size: 12px;
        }}
        .security-note {{
            background-color: #fff3cd;
            border-left: 4px solid #ffc107;
            padding: 15px;
            margin: 20px 0;
            border-radius: 4px;
            font-size: 14px;
        }}
        .warning {{
            background-color: #f8d7da;
            border-left: 4px solid #dc3545;
            padding: 15px;
            margin: 20px 0;
            border-radius: 4px;
            font-size: 14px;
        }}
    </style>
</head>
<body>
    <div class='container'>
        <div class='header'>
            <h1>🔐 Login Verification Code</h1>
        </div>
        
        <div class='content'>
            <p>Hello <strong>{userName}</strong>,</p>
            
            <p>You have requested a One-Time Password (OTP) to log into your Restaurant Management System account.</p>
            
            <div class='otp-box'>
                <p style='margin: 0 0 10px 0; font-size: 16px;'>Your verification code is:</p>
                <div class='otp-code'>{otp}</div>
                <p style='margin: 10px 0 0 0; font-size: 14px; opacity: 0.9;'>This code will expire in 2 minutes</p>
            </div>
            
            <div class='warning'>
                <strong>⚠️ Important:</strong> This code is valid for only 2 minutes. Do not share this code with anyone.
            </div>
            
            <div class='info-box'>
                <strong>Security Tips:</strong><br>
                • Never share your OTP with anyone<br>
                • Our team will never ask for your OTP<br>
                • If you didn't request this code, please ignore this email<br>
                • For your security, this code expires in 2 minutes
            </div>
            
            <p>If you did not request this OTP, please secure your account immediately by changing your password.</p>
            
            <p>Thank you for using Restaurant Management System!</p>
            
            <p>Best regards,<br>
            <strong>Restaurant Management System Team</strong></p>
        </div>
        
        <div class='footer'>
            <p>This is an automated message. Please do not reply to this email.</p>
            <p>&copy; {DateTime.UtcNow.Year} Restaurant Management System. All rights reserved.</p>
        </div>
    </div>
</body>
</html>";
    }

    private string GenerateLoginSuccessEmailBody(string userName, DateTime loginTime, string userType)
    {
        var formattedTime = loginTime.ToString("MMMM dd, yyyy 'at' HH:mm:ss UTC");
        var roleDisplay = userType switch
        {
            "Customer" => "Customer",
            "Admin" => "Administrator",
            "RestaurantAdmin" => "Restaurant Administrator",
            _ => "User"
        };
        
        return $@"
<!DOCTYPE html>
<html>
<head>
    <meta charset='utf-8'>
    <meta name='viewport' content='width=device-width, initial-scale=1.0'>
    <style>
        body {{
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f4f4f4;
        }}
        .container {{
            background-color: #ffffff;
            border-radius: 10px;
            padding: 30px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }}
        .header {{
            text-align: center;
            color: #2c3e50;
            border-bottom: 3px solid #3498db;
            padding-bottom: 20px;
            margin-bottom: 30px;
        }}
        .header h1 {{
            margin: 0;
            font-size: 28px;
        }}
        .content {{
            margin: 20px 0;
        }}
        .success-icon {{
            text-align: center;
            font-size: 48px;
            color: #27ae60;
            margin: 20px 0;
        }}
        .info-box {{
            background-color: #ecf0f1;
            border-left: 4px solid #3498db;
            padding: 15px;
            margin: 20px 0;
            border-radius: 4px;
        }}
        .info-box strong {{
            color: #2c3e50;
        }}
        .footer {{
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #ddd;
            text-align: center;
            color: #7f8c8d;
            font-size: 12px;
        }}
        .button {{
            display: inline-block;
            padding: 12px 30px;
            background-color: #3498db;
            color: #ffffff;
            text-decoration: none;
            border-radius: 5px;
            margin: 20px 0;
        }}
        .security-note {{
            background-color: #fff3cd;
            border-left: 4px solid #ffc107;
            padding: 15px;
            margin: 20px 0;
            border-radius: 4px;
            font-size: 14px;
        }}
    </style>
</head>
<body>
    <div class='container'>
        <div class='header'>
            <h1>🔐 Login Successful</h1>
        </div>
        
        <div class='success-icon'>
            ✓
        </div>
        
        <div class='content'>
            <p>Hello <strong>{userName}</strong>,</p>
            
            <p>We're writing to confirm that you have successfully logged into your Restaurant Management System account.</p>
            
            <div class='info-box'>
                <strong>Login Details:</strong><br>
                Account: {userName}<br>
                User Type: {roleDisplay}<br>
                Login Time: {formattedTime}<br>
                Status: <span style='color: #27ae60;'>✓ Successful</span>
            </div>
            
            <p>If you did not attempt to log in, please secure your account immediately by:</p>
            <ul>
                <li>Changing your password</li>
                <li>Reviewing your account activity</li>
                <li>Contacting our support team if you notice any suspicious activity</li>
            </ul>
            
            <div class='security-note'>
                <strong>🔒 Security Reminder:</strong> For your account's security, never share your login credentials with anyone. Our team will never ask for your password.
            </div>
            
            <p>Thank you for using Restaurant Management System!</p>
            
            <p>Best regards,<br>
            <strong>Restaurant Management System Team</strong></p>
        </div>
        
        <div class='footer'>
            <p>This is an automated message. Please do not reply to this email.</p>
            <p>&copy; {DateTime.UtcNow.Year} Restaurant Management System. All rights reserved.</p>
        </div>
    </div>
</body>
</html>";
    }
}


