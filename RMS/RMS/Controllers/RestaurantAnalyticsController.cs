using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using RMS.ServiceFramework.Data;
using System;
using System.Linq;
using System.Threading.Tasks;

namespace RMS.Controllers;

[ApiController]
[Route("api/restaurant-admin/analytics")]
[Authorize(Roles = "RestaurantAdmin")]
public class RestaurantAnalyticsController : ControllerBase
{
    private readonly RMSDbContext _context;

    public RestaurantAnalyticsController(RMSDbContext context)
    {
        _context = context;
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
    public async Task<ActionResult<object>> GetAnalytics([FromQuery] int? days = null, [FromQuery] DateTime? startDate = null, [FromQuery] DateTime? endDate = null)
    {
        var restaurantId = GetRestaurantId();
        
        // If custom dates are provided, use them; otherwise use days parameter
        DateTime endDateTime;
        DateTime startDateTime;
        
        if (startDate.HasValue && endDate.HasValue)
        {
            startDateTime = startDate.Value.Date;
            endDateTime = endDate.Value.Date.AddDays(1).AddTicks(-1); // Include the entire end date
        }
        else
        {
            endDateTime = DateTime.UtcNow;
            startDateTime = endDateTime.AddDays(-(days ?? 30));
        }

        // Get all orders in the date range (excluding cancelled orders for analytics)
        var allOrders = await _context.Orders
            .Include(o => o.OrderItems)
                .ThenInclude(oi => oi.Meal)
            .Include(o => o.Payments)
            .Where(o => o.RestaurantId == restaurantId && 
                       o.CreatedAt >= startDateTime && 
                       o.CreatedAt <= endDateTime)
            .ToListAsync();

        // Exclude cancelled orders from analytics calculations
        var orders = allOrders.Where(o => o.OrderStatus != "Cancelled").ToList();

        // Revenue Analytics (only from non-cancelled orders)
        var totalRevenue = orders
            .Where(o => o.Payments.Any(p => p.PaymentStatus == "Paid"))
            .Sum(o => o.TotalAmount ?? 0);

        // Calculate revenue for the end date (or today if end date is today, excluding cancelled orders)
        var endDateRevenue = orders
            .Where(o => o.CreatedAt.HasValue && 
                       o.CreatedAt.Value.Date == endDateTime.Date &&
                       o.OrderStatus != "Cancelled" &&
                       o.Payments.Any(p => p.PaymentStatus == "Paid"))
            .Sum(o => o.TotalAmount ?? 0);
        
        // Today's revenue (only if end date is today)
        var todayRevenue = 0m;
        if (endDateTime.Date == DateTime.UtcNow.Date)
        {
            todayRevenue = endDateRevenue;
        }

        var pendingPayments = orders
            .Where(o => o.Payments.Any(p => p.PaymentStatus == "Pending"))
            .Sum(o => o.TotalAmount ?? 0);

        // Order Statistics (excluding cancelled orders from counts)
        var totalOrders = orders.Count;
        var completedOrders = orders.Count(o => o.OrderStatus == "Completed" || o.OrderStatus == "Paid");
        var cancelledOrders = allOrders.Count(o => o.OrderStatus == "Cancelled"); // Count from allOrders for reference only
        var averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

        // Order Status Breakdown (excluding cancelled from main breakdown, but show separately)
        var statusBreakdown = orders
            .GroupBy(o => o.OrderStatus ?? "Pending")
            .Select(g => new { Status = g.Key, Count = g.Count() })
            .ToList();
        
        // Add cancelled count separately for reference (not included in other metrics)
        if (cancelledOrders > 0)
        {
            statusBreakdown.Add(new { Status = "Cancelled", Count = cancelledOrders });
        }

        // Daily Revenue - show all days in the selected range (up to 30 days for performance, excluding cancelled orders)
        var daysInRange = (endDateTime.Date - startDateTime.Date).Days + 1;
        var daysToShow = Math.Min(daysInRange, 30); // Limit to 30 days for performance
        
        var dailyRevenue = Enumerable.Range(0, daysToShow)
            .Select(i => new
            {
                Date = endDateTime.AddDays(-i).Date,
                Revenue = orders
                    .Where(o => o.CreatedAt.HasValue &&
                               o.CreatedAt.Value.Date == endDateTime.AddDays(-i).Date &&
                               o.OrderStatus != "Cancelled" &&
                               o.Payments.Any(p => p.PaymentStatus == "Paid"))
                    .Sum(o => o.TotalAmount ?? 0),
                Orders = orders.Count(o => o.CreatedAt.HasValue && 
                                          o.CreatedAt.Value.Date == endDateTime.AddDays(-i).Date &&
                                          o.OrderStatus != "Cancelled")
            })
            .Where(x => x.Date >= startDateTime.Date) // Only include dates within the range
            .OrderBy(x => x.Date)
            .ToList();

        // Popular Items (only from non-cancelled orders)
        var popularItems = orders
            .Where(o => o.OrderStatus != "Cancelled") // Additional filter to ensure cancelled orders are excluded
            .SelectMany(o => o.OrderItems)
            .GroupBy(oi => new { oi.MealId, MealName = oi.Meal != null ? oi.Meal.Name : "Unknown" })
            .Select(g => new
            {
                MealId = g.Key.MealId,
                MealName = g.Key.MealName,
                TotalQuantity = g.Sum(oi => oi.Quantity),
                TotalRevenue = g.Sum(oi => oi.TotalPrice ?? (oi.Price * oi.Quantity)),
                OrderCount = g.Select(oi => oi.OrderId).Distinct().Count()
            })
            .OrderByDescending(x => x.TotalQuantity)
            .Take(10)
            .ToList();

        // Payment Method Breakdown
        var paymentMethods = orders
            .SelectMany(o => o.Payments)
            .Where(p => p.PaymentStatus == "Paid")
            .GroupBy(p => p.PaymentMode)
            .Select(g => new
            {
                PaymentMode = g.Key,
                Count = g.Count(),
                TotalAmount = g.Sum(p => p.Amount)
            })
            .ToList();

        // Peak Hours Analysis (orders by hour, excluding cancelled orders)
        var peakHours = orders
            .Where(o => o.CreatedAt.HasValue && o.OrderStatus != "Cancelled")
            .GroupBy(o => o.CreatedAt.Value.Hour)
            .Select(g => new
            {
                Hour = g.Key,
                OrderCount = g.Count(),
                Revenue = g.Where(o => o.Payments.Any(p => p.PaymentStatus == "Paid"))
                           .Sum(o => o.TotalAmount ?? 0)
            })
            .OrderByDescending(x => x.OrderCount)
            .Take(5)
            .ToList();

        return Ok(new
        {
            Period = new { StartDate = startDateTime, EndDate = endDateTime, Days = days },
            Revenue = new
            {
                Total = totalRevenue,
                Today = todayRevenue,
                EndDateRevenue = endDateRevenue, // Revenue for the selected end date
                Pending = pendingPayments,
                AverageOrderValue = averageOrderValue
            },
            Orders = new
            {
                Total = totalOrders,
                Completed = completedOrders,
                Cancelled = cancelledOrders,
                CompletionRate = totalOrders > 0 ? (double)completedOrders / totalOrders * 100 : 0
            },
            StatusBreakdown = statusBreakdown,
            DailyRevenue = dailyRevenue,
            PopularItems = popularItems,
            PaymentMethods = paymentMethods,
            PeakHours = peakHours
        });
    }

    [HttpGet("daily-revenue")]
    public async Task<ActionResult<object>> GetDailyRevenue([FromQuery] int? days = null, [FromQuery] DateTime? startDate = null, [FromQuery] DateTime? endDate = null)
    {
        var restaurantId = GetRestaurantId();
        
        // If custom dates are provided, use them; otherwise use days parameter
        DateTime endDateTime;
        DateTime startDateTime;
        
        if (startDate.HasValue && endDate.HasValue)
        {
            startDateTime = startDate.Value.Date;
            endDateTime = endDate.Value.Date.AddDays(1).AddTicks(-1); // Include the entire end date
        }
        else
        {
            endDateTime = DateTime.UtcNow;
            startDateTime = endDateTime.AddDays(-(days ?? 30));
        }

        // Get all orders in the date range (excluding cancelled orders)
        var orders = await _context.Orders
            .Include(o => o.Payments)
            .Where(o => o.RestaurantId == restaurantId &&
                       o.CreatedAt >= startDateTime &&
                       o.CreatedAt <= endDateTime &&
                       o.OrderStatus != "Cancelled") // Exclude cancelled orders
            .ToListAsync();

        // Group by date and calculate revenue (only from non-cancelled orders)
        var dailyRevenue = orders
            .Where(o => o.CreatedAt.HasValue)
            .GroupBy(o => o.CreatedAt.Value.Date)
            .Select(g => new
            {
                Date = g.Key,
                Revenue = g.Where(o => o.Payments.Any(p => p.PaymentStatus == "Paid"))
                           .Sum(o => o.TotalAmount ?? 0),
                Orders = g.Count(),
                PaidOrders = g.Count(o => o.Payments.Any(p => p.PaymentStatus == "Paid"))
            })
            .OrderByDescending(x => x.Date)
            .ToList();

        // Calculate today's total sales (if end date is today, excluding cancelled orders)
        var todayTotalSales = 0m;
        if (endDateTime.Date == DateTime.UtcNow.Date)
        {
            todayTotalSales = orders
                .Where(o => o.CreatedAt.HasValue && 
                           o.CreatedAt.Value.Date == DateTime.UtcNow.Date &&
                           o.Payments.Any(p => p.PaymentStatus == "Paid"))
                .Sum(o => o.TotalAmount ?? 0);
        }

        return Ok(new
        {
            DailyRevenue = dailyRevenue,
            TodayTotalSales = todayTotalSales,
            Period = new { StartDate = startDateTime, EndDate = endDateTime, Days = days }
        });
    }

    [HttpGet("daily-food-sales")]
    public async Task<ActionResult<object>> GetDailyFoodSales([FromQuery] int? days = null, [FromQuery] DateTime? startDate = null, [FromQuery] DateTime? endDate = null)
    {
        var restaurantId = GetRestaurantId();
        
        // If custom dates are provided, use them; otherwise use days parameter
        DateTime endDateTime;
        DateTime startDateTime;
        
        if (startDate.HasValue && endDate.HasValue)
        {
            startDateTime = startDate.Value.Date;
            endDateTime = endDate.Value.Date.AddDays(1).AddTicks(-1); // Include the entire end date
        }
        else
        {
            endDateTime = DateTime.UtcNow;
            startDateTime = endDateTime.AddDays(-(days ?? 30));
        }

        // Get all orders with order items in the date range (excluding cancelled orders)
        var orders = await _context.Orders
            .Include(o => o.OrderItems)
                .ThenInclude(oi => oi.Meal)
            .Include(o => o.Payments)
            .Where(o => o.RestaurantId == restaurantId &&
                       o.CreatedAt >= startDateTime &&
                       o.CreatedAt <= endDateTime &&
                       o.OrderStatus != "Cancelled") // Exclude cancelled orders
            .ToListAsync();

        // Get all order items from paid, non-cancelled orders with order ID
        var orderItems = orders
            .Where(o => o.OrderStatus != "Cancelled" && o.Payments.Any(p => p.PaymentStatus == "Paid"))
            .SelectMany(o => o.OrderItems.Select(oi => new
            {
                OrderId = o.OrderId,
                Date = o.CreatedAt.Value.Date,
                MealId = oi.MealId,
                MealName = oi.Meal != null ? oi.Meal.Name : "Unknown",
                Quantity = oi.Quantity,
                Price = oi.Price,
                TotalPrice = oi.TotalPrice ?? (oi.Price * oi.Quantity)
            }))
            .ToList();

        // Group by date and meal
        var dailyFoodSales = orderItems
            .GroupBy(oi => new { oi.Date, oi.MealId, oi.MealName })
            .Select(g => new
            {
                Date = g.Key.Date,
                MealId = g.Key.MealId,
                MealName = g.Key.MealName,
                Quantity = g.Sum(oi => oi.Quantity),
                Revenue = g.Sum(oi => oi.TotalPrice),
                OrderCount = g.Select(oi => oi.OrderId).Distinct().Count() // Count distinct orders containing this meal on this date
            })
            .OrderByDescending(x => x.Date)
            .ThenByDescending(x => x.Quantity)
            .ToList();

        // Get today's food sales (if end date is today)
        var todayDate = DateTime.UtcNow.Date;
        var todayFoodSalesList = new List<object>();
        var todayTotalSales = 0m;
        
        if (endDateTime.Date == todayDate)
        {
            var todayFoodSales = orderItems
                .Where(oi => oi.Date == todayDate)
                .GroupBy(oi => new { oi.MealId, oi.MealName })
                .Select(g => new
                {
                    MealId = g.Key.MealId,
                    MealName = g.Key.MealName,
                    Quantity = g.Sum(oi => oi.Quantity),
                    Revenue = g.Sum(oi => oi.TotalPrice),
                    OrderCount = g.Select(oi => oi.OrderId).Distinct().Count() // Count distinct orders containing this meal today
                })
                .OrderByDescending(x => x.Quantity)
                .ToList();
            
            todayFoodSalesList = todayFoodSales.Cast<object>().ToList();
            
            // Calculate today's total sales
            todayTotalSales = todayFoodSales.Sum(x => x.Revenue);
        }

        return Ok(new
        {
            DailyFoodSales = dailyFoodSales,
            TodayFoodSales = todayFoodSalesList,
            TodayTotalSales = todayTotalSales,
            Period = new { StartDate = startDateTime, EndDate = endDateTime, Days = days }
        });
    }
}

