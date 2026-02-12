using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using RMS.ServiceFramework.Data;
using RMS.ServiceFramework.Models;
using System.Security.Claims;

namespace RMS.Controllers;

[ApiController]
[Route("api/customer")]
public class CustomerTablesController : ControllerBase
{
    private readonly RMSDbContext _context;

    public CustomerTablesController(RMSDbContext context)
    {
        _context = context;
    }

    // List all restaurants
    [HttpGet("restaurants")]
    [AllowAnonymous]
    public async Task<ActionResult<IEnumerable<Restaurant>>> GetRestaurants()
    {
        var restaurants = await _context.Restaurants
            .Where(r => r.IsActive == true)
            .ToListAsync();
        return Ok(restaurants);
    }

    // Tables for a restaurant
    [HttpGet("restaurants/{restaurantId:int}/tables")]
    [AllowAnonymous]
    public async Task<ActionResult<IEnumerable<Table>>> GetRestaurantTables(int restaurantId)
    {
        var tables = await _context.Tables
            .Where(t => t.RestaurantId == restaurantId)
            .ToListAsync();
        return Ok(tables);
    }

    // Available tables (simple: Status == Available)
    [HttpGet("restaurants/{restaurantId:int}/tables/available")]
    [AllowAnonymous]
    public async Task<ActionResult<IEnumerable<Table>>> GetAvailableTables(int restaurantId)
    {
        var tables = await _context.Tables
            .Where(t => t.RestaurantId == restaurantId && t.Status == "Available")
            .ToListAsync();
        return Ok(tables);
    }

    // Meals for a restaurant
    [HttpGet("restaurants/{restaurantId:int}/meals")]
    [AllowAnonymous]
    public async Task<ActionResult<IEnumerable<Meal>>> GetRestaurantMeals(int restaurantId)
    {
        var meals = await _context.Meals
            .Where(m => m.RestaurantId == restaurantId && (m.IsAvailable ?? true))
            .ToListAsync();
        return Ok(meals);
    }

    // Get meals by category from all restaurants
    // Supports partial matching - e.g., "Paneer" will match "Paneer Butter Masala", "Cheese Paneer", etc.
    [HttpGet("meals/category/{category}")]
    [AllowAnonymous]
    public async Task<ActionResult<IEnumerable<object>>> GetMealsByCategory(string category)
    {
        var categoryLower = category.ToLower();
        var meals = await _context.Meals
            .Include(m => m.Restaurant)
            .Where(m => m.Category != null && 
                       (m.Category.ToLower().Contains(categoryLower) || categoryLower.Contains(m.Category.ToLower())) &&
                       (m.IsAvailable ?? true) &&
                       (m.Restaurant.IsActive ?? true))
            .Select(m => new
            {
                MealId = m.MealId,
                Name = m.Name,
                Description = m.Description,
                Price = m.Price,
                Category = m.Category,
                ImageUrl = m.ImageUrl,
                IsAvailable = m.IsAvailable ?? true,
                IsBestItem = m.IsBestItem ?? false,
                RestaurantId = m.RestaurantId,
                RestaurantName = m.Restaurant.Name,
                RestaurantAddress = m.Restaurant.Address
            })
            .ToListAsync();
        return Ok(meals);
    }

    // Get table info by tableId (public, for QR code access)
    [HttpGet("tables/{tableId:int}")]
    [AllowAnonymous]
    public async Task<ActionResult<object>> GetTableById(int tableId)
    {
        var table = await _context.Tables
            .Include(t => t.Restaurant)
            .FirstOrDefaultAsync(t => t.TableId == tableId);
        if (table == null) return NotFound();
        
        return Ok(new
        {
            TableId = table.TableId,
            TableNumber = table.TableNumber,
            RestaurantId = table.RestaurantId,
            RestaurantName = table.Restaurant?.Name ?? "Restaurant",
            Capacity = table.Capacity,
            Status = table.Status
        });
    }

    // Customer leaves table - set table status to Available
    [HttpPut("tables/{tableId:int}/leave")]
    [Authorize(Roles = "Customer")]
    public async Task<IActionResult> LeaveTable(int tableId)
    {
        var table = await _context.Tables.FindAsync(tableId);
        if (table == null) return NotFound("Table not found.");

        // Check if customer has any pending orders for this table AND restaurant (excluding Completed, Paid, and Cancelled)
        // This ensures orders are isolated per restaurant
        var userId = int.Parse(User.FindFirst("UserId")?.Value ?? "0");
        var hasPendingOrders = await _context.Orders
            .AnyAsync(o => o.TableId == tableId && 
                          o.RestaurantId == table.RestaurantId &&
                          o.CustomerId == userId && 
                          o.OrderStatus != "Paid" && 
                          o.OrderStatus != "Cancelled" && 
                          o.OrderStatus != "Completed");

        if (hasPendingOrders)
        {
            // Get pending order details for better error message
            var pendingOrder = await _context.Orders
                .Where(o => o.TableId == tableId && 
                           o.RestaurantId == table.RestaurantId &&
                           o.CustomerId == userId && 
                           o.OrderStatus != "Paid" && 
                           o.OrderStatus != "Cancelled" && 
                           o.OrderStatus != "Completed")
                .OrderByDescending(o => o.CreatedAt)
                .FirstOrDefaultAsync();
            
            var errorMessage = pendingOrder != null
                ? $"You have a pending order at this restaurant (Order #{pendingOrder.OrderId}, Status: {pendingOrder.OrderStatus}). Please complete or cancel it before leaving."
                : "You have pending orders at this restaurant. Please complete or cancel them before leaving.";
            
            return BadRequest(errorMessage);
        }

        table.Status = "Available";
        await _context.SaveChangesAsync();

        return Ok(new { message = "Table is now available" });
    }
}






