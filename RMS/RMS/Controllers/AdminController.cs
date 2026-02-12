using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.SignalR;
using RMS.ServiceFramework.Data;
using RMS.ServiceFramework.Models;
using RMS.Hubs;

namespace RMS.Controllers;
[ApiController]
[Route("api/admin")]
[Authorize(Roles = "Admin")]
public class AdminController : ControllerBase
{
    private readonly RMSDbContext _context;
    private readonly IHubContext<OrderHub> _hubContext;

    public AdminController(RMSDbContext context, IHubContext<OrderHub> hubContext)
    {
        _context = context;
        _hubContext = hubContext;
    }

    // Users
    [HttpGet("users")]
    public async Task<ActionResult<IEnumerable<User>>> GetUsers()
    {
        var users = await _context.Users.ToListAsync();
        return Ok(users);
    }

    [HttpGet("users/{id:int}")]
    public async Task<ActionResult<User>> GetUser(int id)
    {
        var user = await _context.Users.FindAsync(id);
        if (user == null) return NotFound();
        return Ok(user);
    }

    public class UpdateUserDto
    {
        public string FullName { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string? PhoneNumber { get; set; }
        public string UserType { get; set; } = string.Empty;
        public int? RestaurantId { get; set; }
    }

    [HttpPut("users/{id:int}")]
    public async Task<IActionResult> UpdateUser(int id, [FromBody] UpdateUserDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.FullName))
        {
            return BadRequest("Full name is required.");
        }

        if (string.IsNullOrWhiteSpace(dto.Email))
        {
            return BadRequest("Email is required.");
        }

        if (string.IsNullOrWhiteSpace(dto.UserType))
        {
            return BadRequest("User type is required.");
        }

        try
        {
            var user = await _context.Users.FindAsync(id);
            if (user == null) return NotFound("User not found.");

            // Check if email is being changed and if new email already exists
            if (user.Email != dto.Email)
            {
                var emailExists = await _context.Users.AnyAsync(u => u.Email == dto.Email && u.UserId != id);
                if (emailExists)
                {
                    return BadRequest("Email already exists.");
                }
            }

            // Validate UserType
            var validUserTypes = new[] { "Admin", "RestaurantAdmin", "Customer" };
            if (!validUserTypes.Contains(dto.UserType))
            {
                return BadRequest("Invalid user type. Must be Admin, RestaurantAdmin, or Customer.");
            }

            // If changing to RestaurantAdmin, RestaurantId is required
            if (dto.UserType == "RestaurantAdmin" && !dto.RestaurantId.HasValue)
            {
                return BadRequest("Restaurant ID is required for RestaurantAdmin users.");
            }

            // If changing from RestaurantAdmin to another role, clear RestaurantId
            if (user.UserType == "RestaurantAdmin" && dto.UserType != "RestaurantAdmin")
            {
                user.RestaurantId = null;
            }

            // Update user properties
            user.FullName = dto.FullName.Trim();
            user.Email = dto.Email.Trim();
            user.PhoneNumber = string.IsNullOrWhiteSpace(dto.PhoneNumber) ? null : dto.PhoneNumber.Trim();
            user.UserType = dto.UserType;
            if (dto.RestaurantId.HasValue)
            {
                user.RestaurantId = dto.RestaurantId;
            }

            await _context.SaveChangesAsync();
            return Ok(user);
        }
        catch (DbUpdateException ex)
        {
            return BadRequest($"Error updating user: {ex.InnerException?.Message ?? ex.Message}");
        }
        catch (Exception ex)
        {
            return BadRequest($"Error: {ex.Message}");
        }
    }

    [HttpDelete("users/{id:int}")]
    public async Task<IActionResult> DeleteUser(int id)
    {
        try
        {
            var user = await _context.Users.FindAsync(id);
            if (user == null) return NotFound("User not found.");

            // Prevent deleting Admin users (safety check)
            if (user.UserType == "Admin")
            {
                return BadRequest("Cannot delete Admin users for security reasons.");
            }

            // Check if user has related records
            var orderCount = await _context.Orders.CountAsync(o => o.CustomerId == id);
            var reviewCount = await _context.Reviews.CountAsync(r => r.CustomerId == id);

            // Delete user
            _context.Users.Remove(user);
            await _context.SaveChangesAsync();

            var message = "User deleted successfully.";
            if (orderCount > 0 || reviewCount > 0)
            {
                message += $" Note: This user had {orderCount} order(s) and {reviewCount} review(s) associated with them.";
            }

            return Ok(new { message });
        }
        catch (DbUpdateException ex)
        {
            var innerMessage = ex.InnerException?.Message ?? "";
            if (innerMessage.Contains("FK_") || innerMessage.Contains("foreign key"))
            {
                return BadRequest("Cannot delete user because they have associated records (orders, reviews, etc.) that cannot be removed.");
            }
            return BadRequest($"Error deleting user: {innerMessage}");
        }
        catch (Exception ex)
        {
            return BadRequest($"Error: {ex.Message}");
        }
    }

    // Restaurants overview
    [HttpGet("restaurants")]
    public async Task<ActionResult<IEnumerable<Restaurant>>> GetRestaurants()
    {
        var restaurants = await _context.Restaurants.ToListAsync();
        return Ok(restaurants);
    }

    [HttpGet("restaurants/{id:int}")]
    public async Task<ActionResult<Restaurant>> GetRestaurant(int id)
    {
        var restaurant = await _context.Restaurants.FindAsync(id);
        if (restaurant == null) return NotFound();
        return Ok(restaurant);
    }

    public class UpsertRestaurantDto
    {
        public string Name { get; set; } = string.Empty;
        public string? Address { get; set; }
        public string? Phone { get; set; }
    }

    [HttpPost("restaurants")]
    public async Task<IActionResult> CreateRestaurant([FromBody] UpsertRestaurantDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Name))
        {
            return BadRequest("Restaurant name is required.");
        }

        try
        {
            var restaurant = new Restaurant
            {
                Name = dto.Name.Trim(),
                Address = string.IsNullOrWhiteSpace(dto.Address) ? null : dto.Address.Trim(),
                Phone = string.IsNullOrWhiteSpace(dto.Phone) ? null : dto.Phone.Trim(),
                IsActive = true,
                CreatedAt = DateTime.UtcNow
            };

            _context.Restaurants.Add(restaurant);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetRestaurant), new { id = restaurant.RestaurantId }, restaurant);
        }
        catch (DbUpdateException ex)
        {
            return BadRequest($"Error creating restaurant: {ex.InnerException?.Message ?? ex.Message}");
        }
        catch (Exception ex)
        {
            return BadRequest($"Error: {ex.Message}");
        }
    }

    [HttpPut("restaurants/{id:int}")]
    public async Task<IActionResult> UpdateRestaurant(int id, [FromBody] UpsertRestaurantDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Name))
        {
            return BadRequest("Restaurant name is required.");
        }

        try
        {
            var restaurant = await _context.Restaurants.FindAsync(id);
            if (restaurant == null) return NotFound();

            restaurant.Name = dto.Name.Trim();
            restaurant.Address = string.IsNullOrWhiteSpace(dto.Address) ? null : dto.Address.Trim();
            restaurant.Phone = string.IsNullOrWhiteSpace(dto.Phone) ? null : dto.Phone.Trim();

            await _context.SaveChangesAsync();
            return NoContent();
        }
        catch (DbUpdateException ex)
        {
            return BadRequest($"Error updating restaurant: {ex.InnerException?.Message ?? ex.Message}");
        }
        catch (Exception ex)
        {
            return BadRequest($"Error: {ex.Message}");
        }
    }

    [HttpDelete("restaurants/{id:int}")]
    public async Task<IActionResult> DeleteRestaurant(int id)
    {
        try
        {
            var restaurant = await _context.Restaurants.FindAsync(id);
            if (restaurant == null) return NotFound();

            // Check if restaurant has related records for warning message
            var userCount = await _context.Users.CountAsync(u => u.RestaurantId == id);
            var tableCount = await _context.Tables.CountAsync(t => t.RestaurantId == id);
            var mealCount = await _context.Meals.CountAsync(m => m.RestaurantId == id);
            var orderCount = await _context.Orders.CountAsync(o => o.RestaurantId == id);

            // Delete restaurant (database will handle foreign key constraints)
            _context.Restaurants.Remove(restaurant);
            await _context.SaveChangesAsync();

            // Return success with information about what was affected
            var message = "Restaurant deleted successfully.";
            if (userCount > 0 || tableCount > 0 || mealCount > 0 || orderCount > 0)
            {
                message += $" Note: This restaurant had {userCount} user(s), {tableCount} table(s), {mealCount} meal(s), and {orderCount} order(s) associated with it.";
            }

            return Ok(new { message });
        }
        catch (DbUpdateException ex)
        {
            // Check if it's a foreign key constraint violation
            var innerMessage = ex.InnerException?.Message ?? "";
            if (innerMessage.Contains("FK_") || innerMessage.Contains("foreign key"))
            {
                return BadRequest("Cannot delete restaurant because it has associated records that cannot be removed. Please remove all associated users, tables, meals, and orders first.");
            }
            return BadRequest($"Error deleting restaurant: {innerMessage}");
        }
        catch (Exception ex)
        {
            return BadRequest($"Error: {ex.Message}");
        }
    }

    public class RestaurantSummaryDto
    {
        public int RestaurantId { get; set; }
        public string Name { get; set; } = string.Empty;
        public int TableCount { get; set; }
        public int MealCount { get; set; }
        public int OpenOrders { get; set; }
        public decimal TotalRevenue { get; set; }
    }

    [HttpGet("restaurants/{id:int}/summary")]
    public async Task<ActionResult<RestaurantSummaryDto>> GetRestaurantSummary(int id)
    {
        var restaurant = await _context.Restaurants.FindAsync(id);
        if (restaurant == null) return NotFound();

        var tableCount = await _context.Tables.CountAsync(t => t.RestaurantId == id);
        var mealCount = await _context.Meals.CountAsync(m => m.RestaurantId == id);
        var openOrders = await _context.Orders.CountAsync(o => o.RestaurantId == id && o.OrderStatus != "Paid");
        var totalRevenue = await _context.Payments
            .Where(p => p.Order.RestaurantId == id && p.PaymentStatus == "Paid")
            .SumAsync(p => (decimal?)p.Amount) ?? 0;

        var dto = new RestaurantSummaryDto
        {
            RestaurantId = restaurant.RestaurantId,
            Name = restaurant.Name,
            TableCount = tableCount,
            MealCount = mealCount,
            OpenOrders = openOrders,
            TotalRevenue = totalRevenue
        };

        return Ok(dto);
    }

    // Get all meals for a restaurant
    [HttpGet("restaurants/{id:int}/meals")]
    public async Task<ActionResult<IEnumerable<Meal>>> GetRestaurantMeals(int id)
    {
        var restaurant = await _context.Restaurants.FindAsync(id);
        if (restaurant == null) return NotFound("Restaurant not found.");

        var meals = await _context.Meals
            .Where(m => m.RestaurantId == id)
            .OrderBy(m => m.Category)
            .ThenBy(m => m.Name)
            .ToListAsync();
        
        return Ok(meals);
    }

    // Disable/Remove a meal from restaurant menu (Admin can remove illegal items)
    [HttpPut("restaurants/{restaurantId:int}/meals/{mealId:int}/disable")]
    public async Task<IActionResult> DisableMeal(int restaurantId, int mealId, [FromBody] DisableMealDto dto)
    {
        var restaurant = await _context.Restaurants.FindAsync(restaurantId);
        if (restaurant == null) return NotFound("Restaurant not found.");

        var meal = await _context.Meals
            .FirstOrDefaultAsync(m => m.MealId == mealId && m.RestaurantId == restaurantId);
        if (meal == null) return NotFound("Meal not found.");

        // Set meal as unavailable
        meal.IsAvailable = false;
        await _context.SaveChangesAsync();

        // Send notification to restaurant admin via SignalR
        await _hubContext.Clients.Group($"restaurant_{restaurantId}").SendAsync("MenuUpdated", new
        {
            Message = dto.Reason ?? $"Menu item '{meal.Name}' has been disabled by Admin.",
            MealId = meal.MealId,
            MealName = meal.Name,
            Action = "Disabled",
            Reason = dto.Reason
        });

        return Ok(new { message = "Meal disabled successfully. Restaurant admin has been notified." });
    }

    // Re-enable a meal
    [HttpPut("restaurants/{restaurantId:int}/meals/{mealId:int}/enable")]
    public async Task<IActionResult> EnableMeal(int restaurantId, int mealId)
    {
        var restaurant = await _context.Restaurants.FindAsync(restaurantId);
        if (restaurant == null) return NotFound("Restaurant not found.");

        var meal = await _context.Meals
            .FirstOrDefaultAsync(m => m.MealId == mealId && m.RestaurantId == restaurantId);
        if (meal == null) return NotFound("Meal not found.");

        meal.IsAvailable = true;
        await _context.SaveChangesAsync();

        // Send notification to restaurant admin
        await _hubContext.Clients.Group($"restaurant_{restaurantId}").SendAsync("MenuUpdated", new
        {
            Message = $"Menu item '{meal.Name}' has been re-enabled by Admin.",
            MealId = meal.MealId,
            MealName = meal.Name,
            Action = "Enabled"
        });

        return Ok(new { message = "Meal enabled successfully." });
    }

    public class DisableMealDto
    {
        public string? Reason { get; set; }
    }

    // Get all tables for a restaurant with detailed status
    [HttpGet("restaurants/{id:int}/tables")]
    public async Task<ActionResult<IEnumerable<object>>> GetRestaurantTables(int id)
    {
        var restaurant = await _context.Restaurants.FindAsync(id);
        if (restaurant == null) return NotFound("Restaurant not found.");

        var tables = await _context.Tables
            .Where(t => t.RestaurantId == id)
            .Select(t => new
            {
                TableId = t.TableId,
                TableNumber = t.TableNumber,
                Capacity = t.Capacity,
                Status = t.Status,
                QrcodeUrl = t.QrcodeUrl,
                CreatedAt = t.CreatedAt,
                // Check if there are active orders for this table
                HasActiveOrders = _context.Orders.Any(o => 
                    o.TableId == t.TableId && 
                    o.OrderStatus != "Paid" && 
                    o.OrderStatus != "Cancelled" && 
                    o.OrderStatus != "Completed"),
                // Get customer info if table is occupied
                CurrentCustomer = _context.Orders
                    .Where(o => o.TableId == t.TableId && 
                               o.OrderStatus != "Paid" && 
                               o.OrderStatus != "Cancelled" && 
                               o.OrderStatus != "Completed")
                    .OrderByDescending(o => o.CreatedAt)
                    .Select(o => o.Customer != null ? new
                    {
                        CustomerId = o.Customer.UserId,
                        CustomerName = o.Customer.FullName,
                        OrderId = o.OrderId,
                        OrderStatus = o.OrderStatus
                    } : null)
                    .FirstOrDefault()
            })
            .OrderBy(t => t.TableNumber)
            .ToListAsync();

        return Ok(tables);
    }

    // Send notification to restaurant admin
    [HttpPost("restaurants/{id:int}/notify")]
    public async Task<IActionResult> NotifyRestaurantAdmin(int id, [FromBody] NotificationDto dto)
    {
        var restaurant = await _context.Restaurants.FindAsync(id);
        if (restaurant == null) return NotFound("Restaurant not found.");

        // Send notification via SignalR
        await _hubContext.Clients.Group($"restaurant_{id}").SendAsync("AdminNotification", new
        {
            Message = dto.Message,
            Title = dto.Title ?? "Admin Notification",
            Type = dto.Type ?? "info",
            Timestamp = DateTime.UtcNow
        });

        return Ok(new { message = "Notification sent successfully." });
    }

    public class NotificationDto
    {
        public string Message { get; set; } = string.Empty;
        public string? Title { get; set; }
        public string? Type { get; set; }
    }
}