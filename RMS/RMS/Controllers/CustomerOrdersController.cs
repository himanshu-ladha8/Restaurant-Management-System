using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using RMS.ServiceFramework.Data;
using RMS.ServiceFramework.Models;
using RMS.Hubs;
using System.Security.Claims;

namespace RMS.Controllers;

[ApiController]
[Route("api/customer")]
[Authorize(Roles = "Customer")]
public class CustomerOrdersController : ControllerBase
{
    private readonly RMSDbContext _context;
    private readonly IHubContext<OrderHub> _hubContext;

    public CustomerOrdersController(RMSDbContext context, IHubContext<OrderHub> hubContext)
    {
        _context = context;
        _hubContext = hubContext;
    }

    private int GetUserId()
    {
        var claim = User.FindFirst("UserId");
        if (claim == null)
        {
            throw new InvalidOperationException("UserId claim missing.");
        }
        return int.Parse(claim.Value);
    }

    // Menu for a table (by QR/table)
    [HttpGet("tables/{tableId:int}/menu")]
    [AllowAnonymous]
    public async Task<ActionResult<IEnumerable<Meal>>> GetMenuForTable(int tableId)
    {
        var table = await _context.Tables.FindAsync(tableId);
        if (table == null) return NotFound();

        var meals = await _context.Meals
            .Where(m => m.RestaurantId == table.RestaurantId && (m.IsAvailable ?? true))
            .ToListAsync();
        return Ok(meals);
    }

    public class CreateOrderItemDto
    {
        public int MealId { get; set; }
        public int Quantity { get; set; }
        public decimal Price { get; set; }
        public decimal TotalPrice { get; set; }
    }

    public class CreateOrderFromTableDto
    {
        public List<CreateOrderItemDto> Items { get; set; } = new();
    }

    // Create order from a table (QR flow)
    [HttpPost("tables/{tableId:int}/orders")]
    public async Task<IActionResult> CreateOrderFromTable(int tableId, [FromBody] CreateOrderFromTableDto dto)
    {
        var userId = GetUserId();

        var table = await _context.Tables.FindAsync(tableId);
        if (table == null) return NotFound("Table not found.");

        if (dto.Items == null || dto.Items.Count == 0)
        {
            return BadRequest("No items.");
        }

        // Check for existing pending order without payment (for incremental ordering)
        var existingPendingOrder = await _context.Orders
            .Include(o => o.OrderItems)
            .Include(o => o.Payments)
            .Where(o => o.TableId == tableId && 
                       o.RestaurantId == table.RestaurantId &&
                       o.CustomerId == userId &&
                       o.OrderStatus != "Paid" && 
                       o.OrderStatus != "Cancelled" && 
                       o.OrderStatus != "Completed")
            .OrderByDescending(o => o.CreatedAt)
            .FirstOrDefaultAsync();

        // If there's an existing pending order without payment, add items to it
        if (existingPendingOrder != null && !existingPendingOrder.Payments.Any(p => p.PaymentStatus == "Paid"))
        {
            decimal additionalTotal = 0;

            foreach (var item in dto.Items)
            {
                var meal = await _context.Meals.FindAsync(item.MealId);
                if (meal == null) continue;

                // Check if item already exists in order, if so update quantity
                var existingItem = existingPendingOrder.OrderItems.FirstOrDefault(oi => oi.MealId == item.MealId);
                if (existingItem != null)
                {
                    existingItem.Quantity += item.Quantity;
                    additionalTotal += meal.Price * item.Quantity;
                }
                else
                {
                    var orderItem = new OrderItem
                    {
                        OrderId = existingPendingOrder.OrderId,
                        MealId = meal.MealId,
                        Quantity = item.Quantity,
                        Price = meal.Price
                    };
                    _context.OrderItems.Add(orderItem);
                    additionalTotal += meal.Price * item.Quantity;
                }
            }

            // Update order total
            existingPendingOrder.TotalAmount = (existingPendingOrder.TotalAmount ?? 0) + additionalTotal;
            await _context.SaveChangesAsync();

            // Send real-time notification to restaurant admin
            await _hubContext.Clients.Group($"restaurant_{existingPendingOrder.RestaurantId}").SendAsync("OrderUpdated", new
            {
                OrderId = existingPendingOrder.OrderId,
                TableId = existingPendingOrder.TableId,
                TableNumber = table.TableNumber,
                TotalAmount = existingPendingOrder.TotalAmount,
                OrderStatus = existingPendingOrder.OrderStatus,
                UpdatedAt = DateTime.UtcNow
            });

            return Ok(new { orderId = existingPendingOrder.OrderId, totalAmount = existingPendingOrder.TotalAmount, isExistingOrder = true });
        }

        // Check for other active orders (not owned by this user or already paid)
        var hasOtherActiveOrder = await _context.Orders
            .AnyAsync(o => o.TableId == tableId && 
                          o.RestaurantId == table.RestaurantId &&
                          o.OrderStatus != "Paid" && 
                          o.OrderStatus != "Cancelled" && 
                          o.OrderStatus != "Completed" &&
                          o.CustomerId != userId);
        if (hasOtherActiveOrder)
        {
            return BadRequest("This table already has an active order from another customer. Please wait for it to complete.");
        }

        // Set table status to Occupied when order is placed
        if (table.Status == "Available")
        {
            table.Status = "Occupied";
        }

        // Create new order
        var order = new Order
        {
            RestaurantId = table.RestaurantId,
            TableId = tableId,
            CustomerId = userId,
            OrderStatus = "Pending",
            CreatedAt = DateTime.UtcNow,
            TotalAmount = 0
        };

        _context.Orders.Add(order);
        await _context.SaveChangesAsync();

        decimal total = 0;

        foreach (var item in dto.Items)
        {
            var meal = await _context.Meals.FindAsync(item.MealId);
            if (meal == null) continue;

            var orderItem = new OrderItem
            {
                OrderId = order.OrderId,
                MealId = meal.MealId,
                Quantity = item.Quantity,
                Price = meal.Price
                // TotalPrice is a computed column - don't set it, database will calculate it
            };

            total += meal.Price * item.Quantity;
            _context.OrderItems.Add(orderItem);
        }

        order.TotalAmount = total;
        await _context.SaveChangesAsync();

        // Send real-time notification to restaurant admin
        await _hubContext.Clients.Group($"restaurant_{order.RestaurantId}").SendAsync("NewOrder", new
        {
            OrderId = order.OrderId,
            TableId = order.TableId,
            TableNumber = table.TableNumber,
            TotalAmount = total,
            OrderStatus = order.OrderStatus,
            CreatedAt = order.CreatedAt
        });

        return Ok(new { orderId = order.OrderId, totalAmount = total, isExistingOrder = false });
    }

    // Add items to an existing order (for incremental ordering)
    [HttpPost("orders/{orderId:int}/items")]
    public async Task<IActionResult> AddItemsToOrder(int orderId, [FromBody] CreateOrderFromTableDto dto)
    {
        var userId = GetUserId();

        var order = await _context.Orders
            .Include(o => o.OrderItems)
            .FirstOrDefaultAsync(o => o.OrderId == orderId && o.CustomerId == userId);

        if (order == null) return NotFound("Order not found.");

        // Only allow adding items to orders that are not paid, cancelled, or completed
        if (order.OrderStatus == "Paid" || order.OrderStatus == "Cancelled" || order.OrderStatus == "Completed")
        {
            return BadRequest($"Cannot add items to an order with status: {order.OrderStatus}");
        }

        // Check if order has any payment (if it does, don't allow adding items)
        var hasPayment = await _context.Payments
            .AnyAsync(p => p.OrderId == orderId && p.PaymentStatus == "Paid");
        
        if (hasPayment)
        {
            return BadRequest("Cannot add items to an order that has been paid.");
        }

        if (dto.Items == null || dto.Items.Count == 0)
        {
            return BadRequest("No items to add.");
        }

        decimal additionalTotal = 0;

        foreach (var item in dto.Items)
        {
            var meal = await _context.Meals.FindAsync(item.MealId);
            if (meal == null) continue;

            // Check if item already exists in order, if so update quantity
            var existingItem = order.OrderItems.FirstOrDefault(oi => oi.MealId == item.MealId);
            if (existingItem != null)
            {
                existingItem.Quantity += item.Quantity;
                additionalTotal += meal.Price * item.Quantity;
            }
            else
            {
                var orderItem = new OrderItem
                {
                    OrderId = order.OrderId,
                    MealId = meal.MealId,
                    Quantity = item.Quantity,
                    Price = meal.Price
                };
                _context.OrderItems.Add(orderItem);
                additionalTotal += meal.Price * item.Quantity;
            }
        }

        // Update order total
        order.TotalAmount = (order.TotalAmount ?? 0) + additionalTotal;
        await _context.SaveChangesAsync();

        // Send real-time notification to restaurant admin
        await _hubContext.Clients.Group($"restaurant_{order.RestaurantId}").SendAsync("OrderUpdated", new
        {
            OrderId = order.OrderId,
            TableId = order.TableId,
            TotalAmount = order.TotalAmount,
            OrderStatus = order.OrderStatus,
            UpdatedAt = DateTime.UtcNow
        });

        return Ok(new { orderId = order.OrderId, totalAmount = order.TotalAmount, addedAmount = additionalTotal });
    }

    // Get all orders for current customer (excluding canceled orders)
    [HttpGet("orders")]
    public async Task<ActionResult<IEnumerable<object>>> GetAllMyOrders([FromQuery] int? restaurantId = null)
    {
        var userId = GetUserId();
        var query = _context.Orders
            .Include(o => o.OrderItems)
                .ThenInclude(oi => oi.Meal)
            .Include(o => o.Restaurant)
            .Include(o => o.Table)
            .Include(o => o.Payments)
            .Where(o => o.CustomerId == userId && o.OrderStatus != "Cancelled");

        // Filter by restaurant if provided
        if (restaurantId.HasValue)
        {
            query = query.Where(o => o.RestaurantId == restaurantId.Value);
        }

        var orders = await query
            .OrderByDescending(o => o.CreatedAt)
            .ToListAsync();

        var result = orders.Select(o => new
        {
            OrderId = o.OrderId,
            RestaurantId = o.RestaurantId,
            RestaurantName = o.Restaurant?.Name ?? "Unknown",
            TableId = o.TableId,
            TableNumber = o.Table?.TableNumber ?? "N/A",
            OrderStatus = o.OrderStatus,
            TotalAmount = o.TotalAmount,
            CreatedAt = o.CreatedAt,
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
                .FirstOrDefault(),
            OrderItems = o.OrderItems.Select(oi => new
            {
                OrderItemId = oi.OrderItemId,
                MealId = oi.MealId,
                MealName = oi.Meal?.Name ?? "Unknown",
                Quantity = oi.Quantity,
                Price = oi.Price,
                TotalPrice = oi.TotalPrice
            }).ToList()
        }).ToList();

        return Ok(result);
    }

    // Current user's orders
    [HttpGet("orders/{orderId}/{restaurantId}")]
    public async Task<ActionResult<object>> GetMyOrders(int orderId, int restaurantId)
    {
        var order = await _context.Orders
            .Where(o => o.OrderId == orderId && o.RestaurantId == restaurantId)
            .Select(o => new
            {
                o.OrderId,
                o.RestaurantId,
                o.TableId,
                o.CustomerId,
                o.OrderStatus,
                o.TotalAmount,
                o.CreatedAt,
                OrderItems = o.OrderItems.Select(oi => new
                {
                    oi.OrderItemId,
                    oi.MealId,
                    oi.Quantity,
                    oi.Price
                }).ToList()
            })
            .FirstOrDefaultAsync();

        if (order == null)
            return NotFound();

        return Ok(order);
    }


    // Payments by customer
    public class CustomerPaymentDto
    {
        public decimal Amount { get; set; }
        public string PaymentMode { get; set; } = string.Empty; // Cash, Card, UPI, Online, Counter
        public string? TransactionId { get; set; }
    }

    [HttpPost("orders/{orderId:int}/payments")]
    public async Task<IActionResult> PayOrder(int orderId, [FromBody] CustomerPaymentDto dto)
    {
        var userId = GetUserId();
        var order = await _context.Orders
            .Include(o => o.Payments)
            .FirstOrDefaultAsync(o => o.OrderId == orderId && o.CustomerId == userId);
        
        if (order == null) return NotFound("Order not found.");

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
        if (dto.Amount <= 0)
        {
            return BadRequest("Payment amount must be greater than zero.");
        }

        if (dto.Amount != order.TotalAmount)
        {
            return BadRequest($"Payment amount (₹{dto.Amount}) does not match order total (₹{order.TotalAmount}).");
        }

        // Validate payment mode
        var validPaymentModes = new[] { "Cash", "Card", "UPI", "Online", "Counter" };
        if (!validPaymentModes.Contains(dto.PaymentMode))
        {
            return BadRequest($"Invalid payment mode. Allowed modes: {string.Join(", ", validPaymentModes)}");
        }

        // Check if payment already exists for this order
        var existingPayment = order.Payments.FirstOrDefault(p => p.PaymentStatus == "Paid");
        if (existingPayment != null)
        {
            return BadRequest("Order already has a completed payment.");
        }

        // Determine payment status based on payment mode
        string paymentStatus = "Paid";
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

        // Create payment record
        var payment = new Payment
        {
            OrderId = orderId,
            Amount = dto.Amount,
            PaymentMode = dto.PaymentMode,
            PaymentStatus = paymentStatus,
            TransactionId = string.IsNullOrWhiteSpace(dto.TransactionId) ? null : dto.TransactionId.Trim(),
            CreatedAt = DateTime.UtcNow
        };

        _context.Payments.Add(payment);
        
        // Only mark order as Paid if payment is actually paid (not pending for Cash)
        // Use case-insensitive comparison to handle any case variations
        if (paymentStatus.Equals("Paid", StringComparison.OrdinalIgnoreCase))
        {
            order.OrderStatus = "Paid";
        }
        // For Cash (pay at table), order status remains as is (Pending/Preparing/Ready/Served)
        
        await _context.SaveChangesAsync();

        // Send real-time notification to restaurant admin
        await _hubContext.Clients.Group($"restaurant_{order.RestaurantId}").SendAsync("OrderStatusUpdated", new
        {
            OrderId = order.OrderId,
            OrderStatus = order.OrderStatus,
            TableId = order.TableId
        });

        // Free the table when the order is paid (if no other active orders remain for this restaurant)
        var table = await _context.Tables.FindAsync(order.TableId);
        if (table != null)
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
                table.Status = "Available";
                await _context.SaveChangesAsync();
            }
        }

        return Ok(payment);
    }

    // Cancel order by customer
    [HttpPut("orders/{orderId:int}/cancel")]
    public async Task<IActionResult> CancelOrder(int orderId)
    {
        var userId = GetUserId();
        var order = await _context.Orders
            .Include(o => o.Payments)
            .FirstOrDefaultAsync(o => o.OrderId == orderId && o.CustomerId == userId);
        
        if (order == null) return NotFound("Order not found.");

        // Check if order can be cancelled
        if (order.OrderStatus == "Paid")
        {
            return BadRequest("Cannot cancel a paid order. Please contact the restaurant for refund.");
        }

        if (order.OrderStatus == "Cancelled")
        {
            return BadRequest("Order is already cancelled.");
        }

        // If order has payment, mark it for refund (in production, integrate with payment gateway)
        var hasPayment = order.Payments.Any(p => p.PaymentStatus == "Paid");
        if (hasPayment)
        {
            // In production, initiate refund process here
            // For now, just mark payment as refunded
            var paidPayment = order.Payments.FirstOrDefault(p => p.PaymentStatus == "Paid");
            if (paidPayment != null)
            {
                paidPayment.PaymentStatus = "Refunded";
            }
        }

        // Update order status
        order.OrderStatus = "Cancelled";
        await _context.SaveChangesAsync();

        // Send real-time notification to restaurant admin
        await _hubContext.Clients.Group($"restaurant_{order.RestaurantId}").SendAsync("OrderStatusUpdated", new
        {
            OrderId = order.OrderId,
            OrderStatus = order.OrderStatus,
            TableId = order.TableId
        });

        // Free the table if no other active orders remain for this restaurant
        var table = await _context.Tables.FindAsync(order.TableId);
        if (table != null)
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
                table.Status = "Available";
                await _context.SaveChangesAsync();
            }
        }

        return Ok(new { message = "Order cancelled successfully.", orderId = order.OrderId });
    }

    // Get payment history for customer
    [HttpGet("payments")]
    public async Task<ActionResult<IEnumerable<object>>> GetMyPayments([FromQuery] int? orderId = null)
    {
        var userId = GetUserId();
        var query = _context.Payments
            .Include(p => p.Order)
                .ThenInclude(o => o.Restaurant)
            .Where(p => p.Order.CustomerId == userId);

        if (orderId.HasValue)
        {
            query = query.Where(p => p.OrderId == orderId.Value);
        }

        var payments = await query
            .OrderByDescending(p => p.CreatedAt)
            .ToListAsync();

        var result = payments.Select(p => new
        {
            PaymentId = p.PaymentId,
            OrderId = p.OrderId,
            RestaurantName = p.Order.Restaurant?.Name ?? "Unknown",
            Amount = p.Amount,
            PaymentMode = p.PaymentMode,
            PaymentStatus = p.PaymentStatus,
            TransactionId = p.TransactionId,
            CreatedAt = p.CreatedAt
        }).ToList();

        return Ok(result);
    }

    // Get payment receipt
    [HttpGet("payments/{paymentId:int}/receipt")]
    public async Task<ActionResult<object>> GetPaymentReceipt(int paymentId)
    {
        var userId = GetUserId();
        var payment = await _context.Payments
            .Include(p => p.Order)
                .ThenInclude(o => o.Restaurant)
            .Include(p => p.Order)
                .ThenInclude(o => o.Customer)
            .Include(p => p.Order)
                .ThenInclude(o => o.Table)
            .Include(p => p.Order)
                .ThenInclude(o => o.OrderItems)
                    .ThenInclude(oi => oi.Meal)
            .FirstOrDefaultAsync(p => p.PaymentId == paymentId && p.Order.CustomerId == userId);

        if (payment == null) return NotFound("Payment not found.");

        var receipt = new
        {
            // Receipt/Invoice Information
            ReceiptNumber = $"INV-{payment.PaymentId:D6}",
            PaymentId = payment.PaymentId,
            OrderId = payment.OrderId,
            
            // Restaurant Information
            RestaurantName = payment.Order.Restaurant?.Name ?? "Unknown",
            RestaurantAddress = payment.Order.Restaurant?.Address,
            RestaurantPhone = payment.Order.Restaurant?.Phone,
            
            // Customer Information
            CustomerName = payment.Order.Customer?.FullName ?? "Guest",
            CustomerEmail = payment.Order.Customer?.Email,
            CustomerPhone = payment.Order.Customer?.PhoneNumber,
            
            // Order Information
            TableNumber = payment.Order.Table?.TableNumber ?? "N/A",
            OrderDate = payment.Order.CreatedAt,
            OrderStatus = payment.Order.OrderStatus,
            
            // Payment Information
            Amount = payment.Amount,
            PaymentMode = payment.PaymentMode,
            PaymentStatus = payment.PaymentStatus,
            TransactionId = payment.TransactionId,
            PaymentDate = payment.CreatedAt,
            
            // Order Items
            OrderItems = payment.Order.OrderItems.Select(oi => new
            {
                MealName = oi.Meal?.Name ?? "Unknown",
                Quantity = oi.Quantity,
                Price = oi.Price,
                TotalPrice = oi.TotalPrice
            }).ToList(),
            
            // Totals
            Subtotal = payment.Order.TotalAmount,
            Tax = 0.00m, // Add tax calculation if needed
            Total = payment.Amount,
            OrderTotal = payment.Order.TotalAmount
        };

        return Ok(receipt);
    }
}






