using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.FileProviders;
using Microsoft.IdentityModel.Tokens;
using RMS.Hubs;
using RMS.Models.Auth;
using RMS.ServiceFramework.Data;
using RMS.ServiceFramework.Interfaces;
using RMS.ServiceFramework.ServiceDB;
using RMS.Services;
using Stripe;
using System.Text;
using System.Text.Json.Serialization;

var builder = WebApplication.CreateBuilder(args);

//stripe
StripeConfiguration.ApiKey =
builder.Configuration["Stripe:pk_test_51SmtpxEEBiB23dFEC0Xqvl44OTeWS6ogeI0BijDloJBYDWXN1cSYqyANVsrndVX2uofjADdUs1ue77lOJe2XShbT00zib74kTv"];

// Add SignalR
builder.Services.AddSignalR();

// Add controllers with JSON options to handle circular references
builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.ReferenceHandler = ReferenceHandler.IgnoreCycles;
        options.JsonSerializerOptions.WriteIndented = true;
    });

// ✅ Add CORS (ALLOW ALL)
var AllowAllOrigins = "AllowAll";
builder.Services.AddCors(options =>
{
    options.AddPolicy(AllowAllOrigins, policy =>
    {
        policy
            .WithOrigins("http://localhost:3000", "https://localhost:3000", "http://localhost:3001")
            .AllowAnyHeader()
            .AllowAnyMethod()
            .AllowCredentials(); // Required for SignalR
    });
});

// Add ONLY Swashbuckle, NOT OpenAPI
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// Register UserService
builder.Services.AddScoped<IUserService, UserService>();

// Register Email Service
builder.Services.Configure<EmailSettings>(
    builder.Configuration.GetSection("EmailSettings"));
builder.Services.AddScoped<IEmailService, EmailService>();

// JWT settings
builder.Services.Configure<JwtSettings>(
    builder.Configuration.GetSection("Jwt"));

var jwtSettings = builder.Configuration.GetSection("Jwt").Get<JwtSettings>()!;
var key = Encoding.UTF8.GetBytes(jwtSettings.Key);

builder.Services
    .AddAuthentication(options =>
    {
        options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
        options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
    })
    .AddJwtBearer(options =>
    {
        options.RequireHttpsMetadata = false;
        options.SaveToken = true;
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = jwtSettings.Issuer,
            ValidAudience = jwtSettings.Audience,
            IssuerSigningKey = new SymmetricSecurityKey(key)
        };
    });

// Add DbContext with timeout settings and retry logic
builder.Services.AddDbContext<RMSDbContext>(options =>
    options.UseSqlServer(
        builder.Configuration.GetConnectionString("RmsConnection"),
        sqlOptions => 
        {
            sqlOptions.CommandTimeout(120);
            sqlOptions.EnableRetryOnFailure(
                maxRetryCount: 3,
                maxRetryDelay: TimeSpan.FromSeconds(5),
                errorNumbersToAdd: null);
        }));

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI(c =>
    {
        c.SwaggerEndpoint("/swagger/v1/swagger.json", "API v1");
        c.RoutePrefix = string.Empty;
    });
}

// Enable static file serving BEFORE HTTPS redirection for better compatibility
// Configure static files to serve from wwwroot
var staticFileOptions = new StaticFileOptions
{
    OnPrepareResponse = ctx =>
    {
        // Allow CORS for static files (images)
        ctx.Context.Response.Headers.Append("Access-Control-Allow-Origin", "*");
        ctx.Context.Response.Headers.Append("Access-Control-Allow-Methods", "GET");
    }
};
app.UseStaticFiles(staticFileOptions);

app.UseHttpsRedirection();

// ✅ USE CORS BEFORE AUTH
app.UseCors(AllowAllOrigins);

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();
app.MapHub<OrderHub>("/orderHub");

app.Run();

