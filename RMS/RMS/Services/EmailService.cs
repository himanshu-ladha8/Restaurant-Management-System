using MailKit.Net.Smtp;
using MailKit.Security;
using MimeKit;
using Microsoft.Extensions.Options;
using Microsoft.Extensions.Logging;
using System.Net.Security;
using System.Security.Cryptography.X509Certificates;

namespace RMS.Services;

public class EmailService : IEmailService
{
    private readonly EmailSettings _emailSettings;
    private readonly ILogger<EmailService> _logger;

    public EmailService(IOptions<EmailSettings> emailSettings, ILogger<EmailService> logger)
    {
        _emailSettings = emailSettings.Value;
        _logger = logger;
        
        // Remove any whitespace from password (Gmail app passwords sometimes have spaces when copied)
        if (!string.IsNullOrWhiteSpace(_emailSettings.SenderPassword))
        {
            _emailSettings.SenderPassword = _emailSettings.SenderPassword.Replace(" ", "");
        }
        
        // Log configuration (without password for security)
        _logger.LogInformation($"[EMAIL SERVICE] Initialized with SMTP: {_emailSettings.SmtpServer}:{_emailSettings.SmtpPort}");
        _logger.LogInformation($"[EMAIL SERVICE] Sender Email: {_emailSettings.SenderEmail}");
        _logger.LogInformation($"[EMAIL SERVICE] Sender Name: {_emailSettings.SenderName}");
        _logger.LogInformation($"[EMAIL SERVICE] Password configured: {!string.IsNullOrWhiteSpace(_emailSettings.SenderPassword)}");
        _logger.LogInformation($"[EMAIL SERVICE] Password length: {_emailSettings.SenderPassword?.Length ?? 0}");
    }

    public async Task SendEmailAsync(string toEmail, string subject, string body, bool isHtml = true)
    {
        // Validate email settings
        if (string.IsNullOrWhiteSpace(_emailSettings.SenderEmail))
        {
            _logger.LogError("Email settings are not configured. SenderEmail is empty.");
            throw new InvalidOperationException("Email settings are not configured properly.");
        }

        if (string.IsNullOrWhiteSpace(toEmail))
        {
            _logger.LogError("Recipient email address is empty.");
            throw new ArgumentException("Recipient email address cannot be empty.", nameof(toEmail));
        }

        _logger.LogInformation($"Preparing to send email to {toEmail} with subject: {subject}");

        var message = new MimeMessage();
        message.From.Add(new MailboxAddress(_emailSettings.SenderName, _emailSettings.SenderEmail));
        message.To.Add(new MailboxAddress("", toEmail));
        message.Subject = subject;

        var bodyBuilder = new BodyBuilder();
        if (isHtml)
        {
            bodyBuilder.HtmlBody = body;
        }
        else
        {
            bodyBuilder.TextBody = body;
        }
        message.Body = bodyBuilder.ToMessageBody();

        using var client = new SmtpClient();
        try
        {
            _logger.LogInformation($"Connecting to SMTP server: {_emailSettings.SmtpServer}:{_emailSettings.SmtpPort}");
            _logger.LogInformation($"Using sender email: {_emailSettings.SenderEmail}");
            
            // Configure certificate validation callback to handle certificate revocation check issues
            // This is common in development environments where certificate revocation lists cannot be checked
            // For production, you may want to implement more strict validation
            client.ServerCertificateValidationCallback = (sender, certificate, chain, sslPolicyErrors) =>
            {
                // Accept the certificate if there are no policy errors
                if (sslPolicyErrors == System.Net.Security.SslPolicyErrors.None)
                {
                    return true;
                }
                
                // For development: accept certificate even if revocation check fails
                // This handles the common "revocation function was unable to check revocation" error
                if (sslPolicyErrors == System.Net.Security.SslPolicyErrors.RemoteCertificateChainErrors)
                {
                    _logger.LogWarning("Certificate chain errors detected, but accepting for development");
                    return true;
                }
                
                // Log other certificate errors but still accept for development
                _logger.LogWarning($"SSL Policy Errors: {sslPolicyErrors}, but accepting certificate");
                return true;
            };
            
            // For Gmail, use StartTls
            await client.ConnectAsync(_emailSettings.SmtpServer, _emailSettings.SmtpPort, SecureSocketOptions.StartTls);
            
            // Authenticate with SMTP server
            _logger.LogInformation("Authenticating with SMTP server...");
            await client.AuthenticateAsync(_emailSettings.SenderEmail, _emailSettings.SenderPassword);
            _logger.LogInformation("Authentication successful");
            
            _logger.LogInformation($"Sending email from {_emailSettings.SenderEmail} to {toEmail}...");
            var response = await client.SendAsync(message);
            _logger.LogInformation($"SMTP server response: {response}");
            
            await client.DisconnectAsync(true);
            _logger.LogInformation($"Email sent successfully to {toEmail}");
        }
        catch (MailKit.Security.AuthenticationException authEx)
        {
            _logger.LogError(authEx, $"SMTP Authentication failed. Check your email and password. Error: {authEx.Message}");
            throw new Exception($"SMTP Authentication failed. Please verify your email credentials. Error: {authEx.Message}", authEx);
        }
        catch (MailKit.Net.Smtp.SmtpCommandException smtpEx)
        {
            _logger.LogError(smtpEx, $"SMTP command failed. Error: {smtpEx.Message}, StatusCode: {smtpEx.StatusCode}");
            throw new Exception($"SMTP error: {smtpEx.Message}", smtpEx);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, $"Failed to send email to {toEmail}. Error: {ex.Message}");
            _logger.LogError($"Full exception details: {ex}");
            throw new Exception($"Failed to send email to {toEmail}: {ex.Message}", ex);
        }
    }
}

public class EmailSettings
{
    public string SmtpServer { get; set; } = string.Empty;
    public int SmtpPort { get; set; } = 587;
    public string SenderEmail { get; set; } = string.Empty;
    public string SenderPassword { get; set; } = string.Empty;
    public string SenderName { get; set; } = string.Empty;
}

public class FrontendSettings
{
    public string BaseUrl { get; set; } = string.Empty;
}

