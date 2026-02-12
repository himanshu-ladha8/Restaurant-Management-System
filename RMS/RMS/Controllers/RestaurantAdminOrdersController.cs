using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using RMS.ServiceFramework.Data;
using RMS.ServiceFramework.Models;
using RMS.Hubs;
using System.Collections.Generic;
using System.Linq;

namespace RMS.Controllers;

[ApiController]
[Route("api/restaurant-admin/orders")]
[Authorize(Roles = "RestaurantAdmin")]
public class RestaurantAdminOrdersController : ControllerBase
{
    private readonly RMSDbContext _context;
    private readonly IHubContext<OrderHub> _hubContext;

    public RestaurantAdminOrdersController(RMSDbContext context, IHubContext<OrderHub> hubContext)
    {
        _context = context;
        _hubContext = hubContext;
    }

    private int GetRestaurantId()
    {
        var claim = User.FindFirst("RestaurantId");
        if (claim == null)
        {
            throw new InvalidOperationException("RestaurantId claim is missing for RestaurantAdmin.");
        }
        return int.Parse(claim.Value);
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<Order>>> GetOrders([FromQuery] string? status = null)
    {
        var restaurantId = GetRestaurantId();
        var query = _context.Orders
            .Include(o => o.OrderItems)
                .ThenInclude(oi => oi.Meal)
            .Include(o => o.Payments)
            .Where(o => o.RestaurantId == restaurantId);

        if (!string.IsNullOrWhiteSpace(status))
        {
            query = query.Where(o => o.OrderStatus == status);
        }

        var orders = await query
            .Include(o => o.Table)
            .OrderBy(o => o.OrderStatus)
            .ThenByDescending(o => o.CreatedAt)
            .ToListAsync();

        var result = orders.Select(o => new
        {
            o.OrderId,
            o.TableId,
            TableNumber = o.Table?.TableNumber ?? $"Table {o.TableId}",
            o.CustomerId,
            o.OrderStatus,
            o.TotalAmount,
            o.CreatedAt,
            OrderItems = o.OrderItems.Select(oi => new
            {
                oi.OrderItemId,
                oi.MealId,
                Quantity = oi.Quantity,
                Price = oi.Price,
                TotalPrice = oi.TotalPrice,
                Meal = oi.Meal == null ? null : new
                {
                    oi.Meal.Name,
                    oi.Meal.MealId
                }
            }).ToList(),
            LatestPayment = o.Payments
                .OrderByDescending(p => p.CreatedAt)
                .Select(p => new
                {
                    p.PaymentId,
                    p.Amount,
                    p.PaymentMode,
                    p.PaymentStatus,
                    p.TransactionId,
                    p.CreatedAt
                })
                .FirstOrDefault()
        });

        return Ok(result);
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<Order>> GetOrder(int id)
    {
        var restaurantId = GetRestaurantId();
        var order = await _context.Orders
            .Include(o => o.OrderItems)
                .ThenInclude(oi => oi.Meal)
            .Include(o => o.Payments)
            .FirstOrDefaultAsync(o => o.OrderId == id && o.RestaurantId == restaurantId);
        if (order == null) return NotFound();
        return Ok(order);
    }

    public class UpdateOrderStatusDto
    {
        public string OrderStatus { get; set; } = string.Empty;
        public bool? CustomerLeft { get; set; } // For Completed status: true if customer has left, false if still at table
    }

    // Order Status Lifecycle: Pending -> Preparing -> Ready -> Served -> Completed
    // Can be cancelled at any point before Served
    // Paid orders can transition back to earlier statuses if payment happened early (e.g., online pre-payment)
    private static readonly Dictionary<string, string[]> AllowedTransitions = new()
    {
        ["Pending"] = new[] { "Preparing", "Cancelled" },
        ["Preparing"] = new[] { "Ready", "Cancelled" },
        ["Ready"] = new[] { "Served", "Cancelled" },
        ["Served"] = new[] { "Completed", "Paid" }, // Can mark as Completed or Paid
        ["Paid"] = new[] { "Completed", "Preparing", "Ready", "Served" }, // Paid orders can continue flow or be marked as Completed
        ["Completed"] = Array.Empty<string>(), // Final state
        ["Cancelled"] = Array.Empty<string>() // Final state
    };

    [HttpPut("{id:int}/status")]
    public async Task<IActionResult> UpdateStatus(int id, [FromBody] UpdateOrderStatusDto dto)
    {
        var restaurantId = GetRestaurantId();
        var order = await _context.Orders
            .FirstOrDefaultAsync(o => o.OrderId == id && o.RestaurantId == restaurantId);
        if (order == null) return NotFound();

        // Normalize status values (handle case sensitivity, null/empty, and whitespace)
        var currentRaw = (order.OrderStatus ?? "Pending")?.Trim() ?? "Pending";
        var nextRaw = (dto.OrderStatus ?? "")?.Trim() ?? "";

        if (string.IsNullOrWhiteSpace(nextRaw))
        {
            return BadRequest("Order status cannot be empty.");
        }

        // Normalize current status to match dictionary keys (capitalize first letter, rest lowercase)
        var current = string.IsNullOrWhiteSpace(currentRaw) 
            ? "Pending" 
            : char.ToUpperInvariant(currentRaw[0]) + (currentRaw.Length > 1 ? currentRaw.Substring(1).ToLowerInvariant() : "");
        
        // Normalize next status to match dictionary keys (capitalize first letter, rest lowercase)
        var next = char.ToUpperInvariant(nextRaw[0]) + (nextRaw.Length > 1 ? nextRaw.Substring(1).ToLowerInvariant() : "");

        // Debug: Log the normalized values (can be removed in production)
        Console.WriteLine($"Status transition: '{currentRaw}' -> '{nextRaw}' (normalized: '{current}' -> '{next}')");

        // Check if trying to transition to the same status
        if (current.Equals(next, StringComparison.OrdinalIgnoreCase))
        {
            return BadRequest($"Order is already in '{current}' status. No change needed.");
        }

        // Check if transition is allowed
        if (!AllowedTransitions.TryGetValue(current, out var allowed))
        {
            return BadRequest($"Invalid current order status: '{currentRaw}' (normalized: '{current}'). Valid statuses: {string.Join(", ", AllowedTransitions.Keys)}");
        }

        // Use case-insensitive comparison for allowed transitions
        var allowedNextLower = allowed.Select(s => s.ToLowerInvariant()).ToList();
        var nextLower = next.ToLowerInvariant();
        
        if (!allowedNextLower.Contains(nextLower))
        {
            // Find the correct casing from the allowed list
            var correctNext = allowed.FirstOrDefault(a => a.ToLowerInvariant() == nextLower);
            if (correctNext != null)
            {
                next = correctNext; // Use the correctly cased version from the allowed list
            }
            else
            {
                return BadRequest($"Invalid status transition from '{current}' to '{next}'. Allowed transitions from '{current}': {string.Join(", ", allowed)}");
            }
        }
        else
        {
            // Find the correct casing from the allowed list
            var correctNext = allowed.FirstOrDefault(a => a.ToLowerInvariant() == nextLower);
            if (correctNext != null)
            {
                next = correctNext; // Use the correctly cased version from the allowed list
            }
        }

        // Status is now normalized and validated
        order.OrderStatus = next;
        await _context.SaveChangesAsync();

        // Send real-time notification to customer
        if (order.CustomerId.HasValue)
        {
            await _hubContext.Clients.Group($"customer_{order.CustomerId.Value}").SendAsync("OrderStatusUpdated", new
            {
                OrderId = order.OrderId,
                OrderStatus = order.OrderStatus,
                TableId = order.TableId
            });
        }

        // Handle table status based on order status
        var table = await _context.Tables.FindAsync(order.TableId);
        if (table != null)
        {
            if (next == "Completed")
            {
                // For Completed status: Check if customer has left
                // If CustomerLeft is true or not provided (default to true for backward compatibility), mark table as available
                // If CustomerLeft is false, keep table as occupied
                bool customerLeft = dto.CustomerLeft ?? true; // Default to true if not specified
                
                if (customerLeft)
                {
                    // Check if there are other active orders for this table and restaurant
                    var hasOtherActive = await _context.Orders
                        .AnyAsync(o => o.TableId == order.TableId && 
                                     o.RestaurantId == restaurantId &&
                                     o.OrderId != id && 
                                     o.OrderStatus != "Paid" && 
                                     o.OrderStatus != "Cancelled" && 
                                     o.OrderStatus != "Completed");
                    
                    // Check if there's an active reservation (Arrived or Confirmed) for this table
                    var hasActiveReservation = await _context.Reservations
                        .AnyAsync(r => r.TableId == order.TableId &&
                                     r.RestaurantId == restaurantId &&
                                     (r.Status == "Arrived" || r.Status == "Confirmed") &&
                                     r.ReservationDate.Date >= DateTime.UtcNow.Date);
                    
                    if (!hasOtherActive && !hasActiveReservation)
                    {
                        table.Status = "Available";
                        await _context.SaveChangesAsync();
                    }
                }
                // If customer hasn't left, table remains Occupied (no action needed)
            }
            else if (next == "Paid" || next == "Cancelled")
            {
                // Free the table when order is paid or cancelled (if no other active orders remain for this restaurant)
                var hasOtherActive = await _context.Orders
                    .AnyAsync(o => o.TableId == order.TableId && 
                                 o.RestaurantId == restaurantId &&
                                 o.OrderId != id && 
                                 o.OrderStatus != "Paid" && 
                                 o.OrderStatus != "Cancelled" && 
                                 o.OrderStatus != "Completed");
                if (!hasOtherActive)
                {
                    table.Status = "Available";
                    await _context.SaveChangesAsync();
                }
            }
        }
        return NoContent();
    }

    [HttpGet("{id:int}/payments")]
    public async Task<ActionResult<IEnumerable<Payment>>> GetPayments(int id)
    {
        var restaurantId = GetRestaurantId();
        var exists = await _context.Orders.AnyAsync(o => o.OrderId == id && o.RestaurantId == restaurantId);
        if (!exists) return NotFound();

        var payments = await _context.Payments
            .Where(p => p.OrderId == id)
            .ToListAsync();
        return Ok(payments);
    }

    public class CreatePaymentDto
    {
        public decimal Amount { get; set; }
        public string PaymentMode { get; set; } = string.Empty;
        public string? PaymentStatus { get; set; }
        public string? TransactionId { get; set; }
    }

    [HttpPost("{id:int}/payments")]
    public async Task<IActionResult> CreatePayment(int id, [FromBody] CreatePaymentDto dto)
    {
        var restaurantId = GetRestaurantId();
        var order = await _context.Orders
            .FirstOrDefaultAsync(o => o.OrderId == id && o.RestaurantId == restaurantId);
        if (order == null) return NotFound();

        // Validate payment mode
        var validPaymentModes = new[] { "Cash", "Card", "UPI", "Online", "Counter" };
        if (!validPaymentModes.Contains(dto.PaymentMode))
        {
            return BadRequest($"Invalid payment mode. Allowed modes: {string.Join(", ", validPaymentModes)}");
        }

        // Determine payment status based on payment mode (if not explicitly provided)
        // Apply same logic as customer payment: Counter=Paid, Cash=Pending, Online/Card/UPI=Paid
        string paymentStatus;
        if (!string.IsNullOrWhiteSpace(dto.PaymentStatus))
        {
            // Normalize payment status (capitalize first letter, rest lowercase)
            var statusRaw = dto.PaymentStatus.Trim();
            paymentStatus = char.ToUpperInvariant(statusRaw[0]) + (statusRaw.Length > 1 ? statusRaw.Substring(1).ToLowerInvariant() : "");
            
            // Validate payment status
            var validStatuses = new[] { "Pending", "Paid", "Failed", "Refunded" };
            if (!validStatuses.Contains(paymentStatus))
            {
                return BadRequest($"Invalid payment status: '{dto.PaymentStatus}'. Allowed values: {string.Join(", ", validStatuses)}");
            }
        }
        else
        {
            if (dto.PaymentMode == "Cash")
            {
                paymentStatus = "Pending"; // Cash payments (pay at table) are pending until confirmed
            }
            else if (dto.PaymentMode == "Counter")
            {
                paymentStatus = "Paid"; // Counter payments are immediately paid (customer already paid at counter)
            }
            else if (dto.PaymentMode == "Online" || dto.PaymentMode == "Card" || dto.PaymentMode == "UPI")
            {
                paymentStatus = "Paid"; // Online payments are immediately paid
            }
            else
            {
                paymentStatus = "Paid"; // Default to Paid
            }
        }

        var payment = new Payment
        {
            OrderId = id,
            Amount = dto.Amount,
            PaymentMode = dto.PaymentMode,
            PaymentStatus = paymentStatus,
            TransactionId = dto.TransactionId,
            CreatedAt = DateTime.UtcNow
        };

        _context.Payments.Add(payment);
        
        // CRITICAL: Don't change order status to "Paid" if order is still in active workflow
        // Keep the order in its current status (Pending/Preparing/Ready) so it can continue through the workflow
        // Only mark as "Paid" if payment is actually paid AND order is already "Served" or "Completed"
        // "Served" orders can be marked as "Paid" since they're done being prepared
        if (paymentStatus.Equals("Paid", StringComparison.OrdinalIgnoreCase) && order.OrderStatus != "Cancelled")
        {
            var activeWorkflowStatuses = new[] { "Pending", "Preparing", "Ready" };
            if (!activeWorkflowStatuses.Contains(order.OrderStatus))
            {
                // Order is "Served" or "Completed", mark as "Paid"
                order.OrderStatus = "Paid";
            }
            // If order is in active workflow (Pending/Preparing/Ready), keep current status
            // The payment record will show payment was made, but order continues through workflow
        }
        
        await _context.SaveChangesAsync();

        return Ok(payment);
    }

    public class UpdatePaymentStatusDto
    {
        public string PaymentStatus { get; set; } = string.Empty;
    }

    [HttpPut("{orderId:int}/payments/{paymentId:int}/status")]
    public async Task<IActionResult> UpdatePaymentStatus(int orderId, int paymentId, [FromBody] UpdatePaymentStatusDto dto)
    {
        var restaurantId = GetRestaurantId();
        var order = await _context.Orders
            .Include(o => o.Payments)
            .FirstOrDefaultAsync(o => o.OrderId == orderId && o.RestaurantId == restaurantId);
        if (order == null) return NotFound("Order not found");

        var payment = order.Payments.FirstOrDefault(p => p.PaymentId == paymentId);
        if (payment == null) return NotFound("Payment not found");

        // Normalize payment status (capitalize first letter, rest lowercase)
        var statusRaw = (dto.PaymentStatus ?? "").Trim();
        if (string.IsNullOrWhiteSpace(statusRaw))
        {
            return BadRequest("Payment status cannot be empty.");
        }

        var newPaymentStatus = char.ToUpperInvariant(statusRaw[0]) + (statusRaw.Length > 1 ? statusRaw.Substring(1).ToLowerInvariant() : "");
        
        // Validate payment status
        var validStatuses = new[] { "Pending", "Paid", "Failed", "Refunded" };
        if (!validStatuses.Contains(newPaymentStatus))
        {
            return BadRequest($"Invalid payment status: '{dto.PaymentStatus}'. Allowed values: {string.Join(", ", validStatuses)}");
        }

        // Check if status is actually changing
        if (payment.PaymentStatus == newPaymentStatus)
        {
            return BadRequest($"Payment is already in '{newPaymentStatus}' status.");
        }

        // Update payment status
        payment.PaymentStatus = newPaymentStatus;
        
        // If payment is being marked as "Paid", update order status accordingly
        if (newPaymentStatus.Equals("Paid", StringComparison.OrdinalIgnoreCase) && order.OrderStatus != "Cancelled")
        {
            var activeWorkflowStatuses = new[] { "Pending", "Preparing", "Ready" };
            if (!activeWorkflowStatuses.Contains(order.OrderStatus))
            {
                // Order is "Served" or "Completed", mark as "Paid"
                order.OrderStatus = "Paid";
            }
            // If order is in active workflow (Pending/Preparing/Ready), keep current status
            // The payment record will show payment was made, but order continues through workflow
        }
        
        await _context.SaveChangesAsync();

        // Send real-time notification
        await _hubContext.Clients.Group($"restaurant_{restaurantId}").SendAsync("OrderStatusUpdated", new
        {
            OrderId = order.OrderId,
            OrderStatus = order.OrderStatus,
            TableId = order.TableId
        });

        return Ok(new
        {
            PaymentId = payment.PaymentId,
            PaymentStatus = payment.PaymentStatus,
            OrderStatus = order.OrderStatus,
            Message = "Payment status updated successfully"
        });
    }
}






