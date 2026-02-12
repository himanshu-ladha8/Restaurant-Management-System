using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using RMS.ServiceFramework.Data;
using RMS.ServiceFramework.Models;
using Stripe;
using System.Security.Claims;

namespace RMS.Controllers;

[ApiController]
[Route("api/payments")]
public class PaymentsController : ControllerBase
{
    private readonly RMSDbContext _context;

    private readonly IConfiguration _configuration;

    public PaymentsController(RMSDbContext context, IConfiguration configuration)
    {
        _context = context;
        _configuration = configuration;
    }

    // =====================================================
    // STEP 1: CREATE STRIPE PAYMENT INTENT (FAKE / TEST)
    // =====================================================
    [HttpPost("create-intent")]
    public async Task<IActionResult> CreatePaymentIntent(
       [FromQuery] int orderId,
       [FromQuery] decimal amount)
    {
        if (orderId <= 0 || amount <= 0)
            return BadRequest("Invalid orderId or amount");

        // Stripe minimum amount validation for INR
        // Stripe requires minimum $0.50 USD equivalent, which is approximately ₹50 INR
        const decimal minimumAmountInr = 50.00m;
        if (amount < minimumAmountInr)
        {
            return BadRequest($"Payment amount must be at least ₹{minimumAmountInr:F2}. Your amount of ₹{amount:F2} is too low for Stripe processing. Please add more items to your order.");
        }

        var order = await _context.Orders
            .FirstOrDefaultAsync(o => o.OrderId == orderId);

        if (order == null)
            return NotFound("Order not found");

        var stripeSecretKey = _configuration["Stripe:SecretKey"];
        var client = new StripeClient(stripeSecretKey);
        var service = new PaymentIntentService(client);

        // CRITICAL: If customer exists, get/create Stripe Customer and include in payment intent
        // This ensures payment methods are attached to customer when used
        string? stripeCustomerId = null;
        if (order.CustomerId.HasValue)
        {
            stripeCustomerId = await GetOrCreateStripeCustomer(order.CustomerId.Value);
        }

        var options = new PaymentIntentCreateOptions
        {
            Amount = (long)(amount * 100),
            Currency = "inr",
            PaymentMethodTypes = new List<string> { "card" },
            Description = $"RMS Order #{orderId}",
            SetupFutureUsage = "off_session", // Allow saving payment method for future use
            Customer = stripeCustomerId // CRITICAL: Include customer so payment method is attached when used
        };

        var intent = await service.CreateAsync(options);

        return Ok(new
        {
            clientSecret = intent.ClientSecret,
            paymentIntentId = intent.Id
        });
    }

    // =====================================================
    // STEP 2: CONFIRM PAYMENT & SAVE TO DB
    // =====================================================
    [HttpPost("confirm")]
    public async Task<IActionResult> ConfirmStripePayment(
        [FromQuery] int orderId,
        [FromQuery] decimal amount,
        [FromQuery] string paymentIntentId)
    {
        if (orderId <= 0 || amount <= 0 || string.IsNullOrEmpty(paymentIntentId))
            return BadRequest("Invalid payment data");

        var order = await _context.Orders
            .Include(o => o.Payments)
            .Include(o => o.Table)
            .FirstOrDefaultAsync(o => o.OrderId == orderId);

        if (order == null)
            return NotFound("Order not found");

        // Validate order can be paid
        if (order.OrderStatus == "Paid")
        {
            return BadRequest("Order is already paid.");
        }

        if (order.OrderStatus == "Cancelled")
        {
            return BadRequest("Cannot pay for a cancelled order.");
        }

        // Validate payment amount
        if (amount != order.TotalAmount)
        {
            return BadRequest($"Payment amount (₹{amount}) does not match order total (₹{order.TotalAmount}).");
        }

        // Check if payment already exists for this order
        var existingPayment = order.Payments.FirstOrDefault(p => p.PaymentStatus == "Paid");
        if (existingPayment != null)
        {
            return BadRequest("Order already has a completed payment.");
        }

        var stripeSecretKey = _configuration["Stripe:SecretKey"];
        var client = new StripeClient(stripeSecretKey);
        var service = new PaymentIntentService(client);

        var intent = await service.GetAsync(paymentIntentId);

        if (intent.Status != "succeeded")
            return BadRequest("Payment not confirmed by Stripe");

        // CRITICAL: Ensure customer is set on payment intent
        // If customer exists but wasn't set on intent, we need to handle it
        if (order.CustomerId.HasValue && intent.CustomerId == null)
        {
            // This shouldn't happen if we set customer in CreatePaymentIntent, but handle it
            var stripeCustomerId = await GetOrCreateStripeCustomer(order.CustomerId.Value);
            // Update payment intent to include customer (for future reference)
            var updateOptions = new PaymentIntentUpdateOptions
            {
                Customer = stripeCustomerId
            };
            try
            {
                await service.UpdateAsync(paymentIntentId, updateOptions);
            }
            catch (StripeException ex)
            {
                // Log but don't fail - payment is already successful
                Console.WriteLine($"Warning: Could not update payment intent with customer: {ex.Message}");
            }
        }

        // Create payment record
        var payment = new Payment
        {
            OrderId = orderId,
            Amount = amount,
            PaymentMode = "Online", // Use "Online" instead of "Stripe-Test"
            PaymentStatus = "Paid", // Use "Paid" instead of "Success"
            TransactionId = paymentIntentId,
            CreatedAt = DateTime.UtcNow
        };

        _context.Payments.Add(payment);
        
        // Mark order as Paid
        order.OrderStatus = "Paid";
        
        await _context.SaveChangesAsync();

        // Free the table when the order is paid (if no other active orders remain for this restaurant)
        if (order.Table != null)
        {
            var hasOtherActive = await _context.Orders
                .AnyAsync(o => o.TableId == order.TableId && 
                             o.RestaurantId == order.RestaurantId &&
                             o.OrderId != orderId && 
                             o.OrderStatus != "Paid" && 
                             o.OrderStatus != "Cancelled" && 
                             o.OrderStatus != "Completed");
            if (!hasOtherActive)
            {
                order.Table.Status = "Available";
                await _context.SaveChangesAsync();
            }
        }

        // Save payment method if it was used (extract from payment intent)
        // CRITICAL: Payment method must be attached to customer BEFORE it's used, or it becomes unusable
        if (order.CustomerId.HasValue && intent.PaymentMethodId != null)
        {
            // Get or create Stripe Customer
            var stripeCustomerId = await GetOrCreateStripeCustomer(order.CustomerId.Value);

            var paymentMethodService = new PaymentMethodService(client);
            try
            {
                var paymentMethod = await paymentMethodService.GetAsync(intent.PaymentMethodId);
                if (paymentMethod != null)
                {
                    // CRITICAL: If payment method is not attached to our customer, attach it immediately
                    // This should have happened automatically when customer was in payment intent, but verify
                    if (paymentMethod.CustomerId == null || paymentMethod.CustomerId != stripeCustomerId)
                    {
                        try
                        {
                            // If attached to a different customer, detach first
                            if (paymentMethod.CustomerId != null && paymentMethod.CustomerId != stripeCustomerId)
                            {
                                await paymentMethodService.DetachAsync(intent.PaymentMethodId);
                            }
                            
                            // Attach to our customer
                            var attachOptions = new PaymentMethodAttachOptions
                            {
                                Customer = stripeCustomerId
                            };
                            await paymentMethodService.AttachAsync(intent.PaymentMethodId, attachOptions);
                        }
                        catch (StripeException attachEx)
                        {
                            // If attachment fails, the payment method may have been used without customer
                            // This means it can't be saved, but payment is already successful
                            // Log the error but don't fail the payment
                            Console.WriteLine($"Warning: Could not attach payment method for saving: {attachEx.Message}");
                            // Skip saving this payment method since it can't be attached
                            // Continue with payment success - payment method just won't be saved
                        }
                    }
                }
            }
            catch (StripeException ex)
            {
                // Log but don't fail the payment
                Console.WriteLine($"Warning: Could not retrieve payment method: {ex.Message}");
            }

            // Only try to save payment method if it was successfully attached to customer
            // Check if payment method is attached to our customer before saving
            PaymentMethod? paymentMethodForSaving = null;
            try
            {
                paymentMethodForSaving = await paymentMethodService.GetAsync(intent.PaymentMethodId);
                // Only save if payment method is attached to our customer
                if (paymentMethodForSaving?.CustomerId != stripeCustomerId)
                {
                    // Payment method is not attached to our customer, skip saving
                    Console.WriteLine($"Warning: Payment method not attached to customer, skipping save");
                    paymentMethodForSaving = null;
                }
            }
            catch (StripeException ex)
            {
                // If we can't get payment method, log but don't fail
                Console.WriteLine($"Warning: Could not retrieve payment method for saving: {ex.Message}");
            }

            // Check if payment method is already saved
            var existingSavedMethod = await _context.SavedPaymentMethods
                .FirstOrDefaultAsync(spm => spm.CustomerId == order.CustomerId.Value && 
                                           spm.StripePaymentMethodId == intent.PaymentMethodId);
            
            if (existingSavedMethod == null && paymentMethodForSaving != null)
            {
                // Get payment method details from Stripe (already retrieved above)
                var paymentMethod = paymentMethodForSaving;
                
                if (paymentMethod?.Card != null)
                {
                    var savedMethod = new SavedPaymentMethod
                    {
                        CustomerId = order.CustomerId.Value,
                        StripePaymentMethodId = intent.PaymentMethodId,
                        CardBrand = paymentMethod.Card.Brand,
                        Last4 = paymentMethod.Card.Last4,
                        ExpMonth = paymentMethod.Card.ExpMonth.ToString(),
                        ExpYear = paymentMethod.Card.ExpYear.ToString(),
                        CreatedAt = DateTime.UtcNow,
                        LastUsedAt = DateTime.UtcNow,
                        IsDefault = false
                    };
                    
                    _context.SavedPaymentMethods.Add(savedMethod);
                    await _context.SaveChangesAsync();
                }
            }
            else
            {
                // Update last used time
                existingSavedMethod.LastUsedAt = DateTime.UtcNow;
                await _context.SaveChangesAsync();
            }
        }

        return Ok(new { 
            message = "Payment confirmed and saved successfully",
            paymentId = payment.PaymentId,
            orderId = order.OrderId,
            orderStatus = order.OrderStatus
        });
    }

    // =====================================================
    // SAVED PAYMENT METHODS
    // =====================================================

    private int GetUserId()
    {
        var claim = User.FindFirst("UserId");
        if (claim == null)
        {
            throw new InvalidOperationException("UserId claim missing.");
        }
        return int.Parse(claim.Value);
    }

    // Get all saved payment methods for current customer
    [HttpGet("saved-methods")]
    [Authorize(Roles = "Customer")]
    public async Task<IActionResult> GetSavedPaymentMethods()
    {
        var userId = GetUserId();
        
        var savedMethods = await _context.SavedPaymentMethods
            .Where(spm => spm.CustomerId == userId)
            .OrderByDescending(spm => spm.IsDefault)
            .ThenByDescending(spm => spm.LastUsedAt)
            .ToListAsync();

        // Validate each payment method with Stripe and remove unusable ones
        var stripeSecretKey = _configuration["Stripe:SecretKey"];
        var client = new StripeClient(stripeSecretKey);
        var paymentMethodService = new PaymentMethodService(client);
        var stripeCustomerId = await GetOrCreateStripeCustomer(userId);
        
        var validMethods = new List<object>();
        var methodsToRemove = new List<SavedPaymentMethod>();

        foreach (var savedMethod in savedMethods)
        {
            try
            {
                // Check if payment method exists and is usable
                var paymentMethod = await paymentMethodService.GetAsync(savedMethod.StripePaymentMethodId);
                
                // If payment method is not attached to our customer, try to attach it
                if (paymentMethod.CustomerId == null || paymentMethod.CustomerId != stripeCustomerId)
                {
                    try
                    {
                        // Try to attach - if it fails, the payment method is unusable
                        var attachOptions = new PaymentMethodAttachOptions
                        {
                            Customer = stripeCustomerId
                        };
                        await paymentMethodService.AttachAsync(savedMethod.StripePaymentMethodId, attachOptions);
                    }
                    catch (StripeException attachEx)
                    {
                        // If attachment fails (e.g., previously used without customer), mark for removal
                        if (attachEx.Message.Contains("previously used") || 
                            attachEx.Message.Contains("detached from a Customer") ||
                            attachEx.Message.Contains("may not be used again"))
                        {
                            methodsToRemove.Add(savedMethod);
                            continue; // Skip this method
                        }
                        // For other errors, still try to include it (might be a temporary issue)
                    }
                }

                // Payment method is valid, include it in response
                validMethods.Add(new
                {
                    savedPaymentMethodId = savedMethod.SavedPaymentMethodId,
                    stripePaymentMethodId = savedMethod.StripePaymentMethodId,
                    cardBrand = savedMethod.CardBrand,
                    last4 = savedMethod.Last4,
                    expMonth = savedMethod.ExpMonth,
                    expYear = savedMethod.ExpYear,
                    isDefault = savedMethod.IsDefault,
                    lastUsedAt = savedMethod.LastUsedAt
                });
            }
            catch (StripeException ex)
            {
                // If payment method doesn't exist or is invalid, mark for removal
                if (ex.Message.Contains("No such payment_method") || 
                    ex.Message.Contains("previously used") ||
                    ex.Message.Contains("may not be used again"))
                {
                    methodsToRemove.Add(savedMethod);
                }
                // For other errors, still include it (might be a temporary Stripe issue)
                else
                {
                    validMethods.Add(new
                    {
                        savedPaymentMethodId = savedMethod.SavedPaymentMethodId,
                        stripePaymentMethodId = savedMethod.StripePaymentMethodId,
                        cardBrand = savedMethod.CardBrand,
                        last4 = savedMethod.Last4,
                        expMonth = savedMethod.ExpMonth,
                        expYear = savedMethod.ExpYear,
                        isDefault = savedMethod.IsDefault,
                        lastUsedAt = savedMethod.LastUsedAt
                    });
                }
            }
        }

        // Remove unusable payment methods from database
        if (methodsToRemove.Any())
        {
            _context.SavedPaymentMethods.RemoveRange(methodsToRemove);
            await _context.SaveChangesAsync();
        }

        return Ok(validMethods);
    }

    // Save a payment method (create SetupIntent to save card without charging)
    [HttpPost("save-method")]
    [Authorize(Roles = "Customer")]
    public async Task<IActionResult> SavePaymentMethod([FromBody] SavePaymentMethodDto dto)
    {
        var userId = GetUserId();
        
        if (string.IsNullOrEmpty(dto.paymentMethodId))
        {
            return BadRequest("Payment method ID is required");
        }

        var stripeSecretKey = _configuration["Stripe:SecretKey"];
        var client = new StripeClient(stripeSecretKey);
        var paymentMethodService = new PaymentMethodService(client);

        // Get or create Stripe Customer
        var stripeCustomerId = await GetOrCreateStripeCustomer(userId);

        // Get payment method details from Stripe
        var paymentMethod = await paymentMethodService.GetAsync(dto.paymentMethodId);
        
        if (paymentMethod == null || paymentMethod.Card == null)
        {
            return BadRequest("Invalid payment method");
        }

        // Attach payment method to customer if not already attached
        try
        {
            // Check if payment method is already attached to a different customer
            if (paymentMethod.CustomerId != null && paymentMethod.CustomerId != stripeCustomerId)
            {
                // Detach from old customer first
                try
                {
                    await paymentMethodService.DetachAsync(dto.paymentMethodId);
                }
                catch (StripeException detachEx)
                {
                    // If detach fails, log but continue
                    Console.WriteLine($"Warning: Failed to detach payment method: {detachEx.Message}");
                }
            }
            
            // Attach payment method to our customer (or reattach if it was detached)
            if (paymentMethod.CustomerId == null || paymentMethod.CustomerId != stripeCustomerId)
            {
                var attachOptions = new PaymentMethodAttachOptions
                {
                    Customer = stripeCustomerId
                };
                await paymentMethodService.AttachAsync(dto.paymentMethodId, attachOptions);
            }
        }
        catch (StripeException ex)
        {
            // If payment method is already attached to this customer, that's fine
            if (ex.Message.Contains("already been attached") || ex.Message.Contains("already attached"))
            {
                // This is fine, continue
            }
            else
            {
                return BadRequest($"Failed to attach payment method: {ex.Message}");
            }
        }

        // Check if already saved
        var existing = await _context.SavedPaymentMethods
            .FirstOrDefaultAsync(spm => spm.CustomerId == userId && 
                                       spm.StripePaymentMethodId == dto.paymentMethodId);
        
        if (existing != null)
        {
            return Ok(new { message = "Payment method already saved", savedPaymentMethodId = existing.SavedPaymentMethodId });
        }

        // If setting as default, unset other defaults
        if (dto.isDefault)
        {
            var otherDefaults = await _context.SavedPaymentMethods
                .Where(spm => spm.CustomerId == userId && spm.IsDefault)
                .ToListAsync();
            
            foreach (var item in otherDefaults)
            {
                item.IsDefault = false;
            }
        }

        var savedMethod = new SavedPaymentMethod
        {
            CustomerId = userId,
            StripePaymentMethodId = dto.paymentMethodId,
            CardBrand = paymentMethod.Card.Brand,
            Last4 = paymentMethod.Card.Last4,
            ExpMonth = paymentMethod.Card.ExpMonth.ToString(),
            ExpYear = paymentMethod.Card.ExpYear.ToString(),
            CreatedAt = DateTime.UtcNow,
            LastUsedAt = DateTime.UtcNow,
            IsDefault = dto.isDefault
        };

        _context.SavedPaymentMethods.Add(savedMethod);
        await _context.SaveChangesAsync();

        return Ok(new { 
            message = "Payment method saved successfully",
            savedPaymentMethodId = savedMethod.SavedPaymentMethodId
        });
    }

    // Delete a saved payment method
    [HttpDelete("saved-methods/{id:int}")]
    [Authorize(Roles = "Customer")]
    public async Task<IActionResult> DeleteSavedPaymentMethod(int id)
    {
        var userId = GetUserId();
        
        var savedMethod = await _context.SavedPaymentMethods
            .FirstOrDefaultAsync(spm => spm.SavedPaymentMethodId == id && spm.CustomerId == userId);
        
        if (savedMethod == null)
        {
            return NotFound("Saved payment method not found");
        }

        _context.SavedPaymentMethods.Remove(savedMethod);
        await _context.SaveChangesAsync();

        return Ok(new { message = "Payment method deleted successfully" });
    }

    // Helper method to get or create Stripe Customer
    // Note: Stripe Customer ID is stored in memory/dictionary for this session
    // In production, you may want to store it in the database
    private static readonly Dictionary<int, string> _stripeCustomers = new();
    private static readonly object _customerLock = new();
    
    private async Task<string> GetOrCreateStripeCustomer(int userId)
    {
        lock (_customerLock)
        {
            // Check if we already have a Stripe Customer ID for this user in memory
            if (_stripeCustomers.ContainsKey(userId))
                return _stripeCustomers[userId];
        }

        var user = await _context.Users.FindAsync(userId);
        if (user == null)
            throw new InvalidOperationException("User not found");

        // Create new Stripe Customer
        var stripeSecretKey = _configuration["Stripe:SecretKey"];
        var client = new StripeClient(stripeSecretKey);
        var customerService = new CustomerService(client);

        var customerOptions = new CustomerCreateOptions
        {
            Email = user.Email,
            Name = user.FullName,
            Metadata = new Dictionary<string, string>
            {
                { "userId", userId.ToString() }
            }
        };

        var customer = await customerService.CreateAsync(customerOptions);

        // Store Stripe Customer ID in memory
        lock (_customerLock)
        {
            _stripeCustomers[userId] = customer.Id;
        }

        return customer.Id;
    }

    // Create payment intent with saved payment method
    [HttpPost("create-intent-with-method")]
    [Authorize(Roles = "Customer")]
    public async Task<IActionResult> CreatePaymentIntentWithSavedMethod(
       [FromQuery] int orderId,
       [FromQuery] decimal amount,
       [FromQuery] string paymentMethodId)
    {
        if (orderId <= 0 || amount <= 0 || string.IsNullOrEmpty(paymentMethodId))
            return BadRequest("Invalid orderId, amount, or paymentMethodId");

        // Stripe minimum amount validation for INR
        // Stripe requires minimum $0.50 USD equivalent, which is approximately ₹50 INR
        const decimal minimumAmountInr = 50.00m;
        if (amount < minimumAmountInr)
        {
            return BadRequest($"Payment amount must be at least ₹{minimumAmountInr:F2}. Your amount of ₹{amount:F2} is too low for Stripe processing. Please add more items to your order.");
        }

        var userId = GetUserId();
        var order = await _context.Orders
            .FirstOrDefaultAsync(o => o.OrderId == orderId && o.CustomerId == userId);

        if (order == null)
            return NotFound("Order not found");

        // Verify payment method belongs to user
        var savedMethod = await _context.SavedPaymentMethods
            .FirstOrDefaultAsync(spm => spm.CustomerId == userId && 
                                       spm.StripePaymentMethodId == paymentMethodId);
        
        if (savedMethod == null)
        {
            return BadRequest("Payment method not found or doesn't belong to you");
        }

        var stripeSecretKey = _configuration["Stripe:SecretKey"];
        var client = new StripeClient(stripeSecretKey);

        // Get or create Stripe Customer
        var stripeCustomerId = await GetOrCreateStripeCustomer(userId);

        // CRITICAL: Attach payment method to customer BEFORE creating payment intent
        // Payment methods must be attached before use, or they become unusable
        var paymentMethodService = new PaymentMethodService(client);
        var paymentMethod = await paymentMethodService.GetAsync(paymentMethodId);
        
        // Check if payment method is already attached to our customer
        if (paymentMethod.CustomerId == null || paymentMethod.CustomerId != stripeCustomerId)
        {
            // If attached to a different customer, we cannot reuse it
            // We need to create a new payment method or ensure it's attached to our customer
            if (paymentMethod.CustomerId != null && paymentMethod.CustomerId != stripeCustomerId)
            {
                return BadRequest("This payment method belongs to a different account and cannot be reused. Please add a new card.");
            }
            
            // Attach payment method to our customer BEFORE using it
            try
            {
                var attachOptions = new PaymentMethodAttachOptions
                {
                    Customer = stripeCustomerId
                };
                await paymentMethodService.AttachAsync(paymentMethodId, attachOptions);
            }
            catch (StripeException ex)
            {
                // If payment method cannot be attached (e.g., already used without customer), 
                // it's unusable - delete it from our database and return error
                if (ex.Message.Contains("previously used") || ex.Message.Contains("detached from a Customer"))
                {
                    // Remove the unusable payment method from database
                    _context.SavedPaymentMethods.Remove(savedMethod);
                    await _context.SaveChangesAsync();
                    
                    return BadRequest("This payment method is no longer usable. It has been removed from your saved cards. Please add a new card.");
                }
                
                // For other errors, return the original message
                return BadRequest($"Cannot use this payment method: {ex.Message}. Please add a new card.");
            }
        }

        var service = new PaymentIntentService(client);

        var options = new PaymentIntentCreateOptions
        {
            Amount = (long)(amount * 100),
            Currency = "inr",
            Customer = stripeCustomerId,
            PaymentMethod = paymentMethodId,
            ConfirmationMethod = "automatic",
            Confirm = false,
            Description = $"RMS Order #{orderId}"
        };

        var intent = await service.CreateAsync(options);

        // Update last used time
        savedMethod.LastUsedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        return Ok(new
        {
            clientSecret = intent.ClientSecret,
            paymentIntentId = intent.Id
        });
    }

    public class SavePaymentMethodDto
    {
        public string paymentMethodId { get; set; } = string.Empty;
        public bool isDefault { get; set; } = false;
    }
}
