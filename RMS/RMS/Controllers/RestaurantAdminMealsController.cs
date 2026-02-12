using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using RMS.ServiceFramework.Data;
using RMS.ServiceFramework.Models;

namespace RMS.Controllers;

[ApiController]
[Route("api/restaurant-admin/meals")]
[Authorize(Roles = "RestaurantAdmin")]
public class RestaurantAdminMealsController : ControllerBase
{
    private readonly RMSDbContext _context;

    public RestaurantAdminMealsController(RMSDbContext context)
    {
        _context = context;
    }

    public class UpsertMealDto
    {
        public string Name { get; set; } = string.Empty;
        public string? Description { get; set; }
        public decimal Price { get; set; }
        public string? Category { get; set; }
        public bool IsAvailable { get; set; } = true;
        public bool IsBestItem { get; set; }
        public int restaurantId { get; set; }
        public string? ImageUrl { get; set; }
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<Meal>>> GetMeals(int restaurantId)
    {
        var meals = await _context.Meals
            .Where(m => m.RestaurantId == restaurantId)
            .ToListAsync();
        return Ok(meals);
    }

    [HttpGet("{id:int}/{restaurantId:int}")]
    public async Task<ActionResult<Meal>> GetMeal(int id,int restaurantId)
    {
        var meal = await _context.Meals
            .FirstOrDefaultAsync(m => m.MealId == id && m.RestaurantId == restaurantId);
        if (meal == null) return NotFound();
        return Ok(meal);
    }

    [HttpPost]
    [Route("CreateMeal")]
    public async Task<IActionResult> CreateMeal([FromBody] UpsertMealDto dto)
    {
        var meal = new Meal
        {
            RestaurantId = dto.restaurantId,
            Name = dto.Name,
            Description = dto.Description,
            Price = dto.Price,
            Category = dto.Category,
            IsAvailable = dto.IsAvailable,
            IsBestItem = dto.IsBestItem,
            ImageUrl = dto.ImageUrl,
            CreatedAt = DateTime.UtcNow
        };

        _context.Meals.Add(meal);
        await _context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetMeal), new { id = meal.MealId, restaurantId = dto.restaurantId }, meal);
    }

    [HttpPut("{id:int}")]
    public async Task<IActionResult> UpdateMeal(int id, [FromBody] UpsertMealDto dto)
    {
        var meal = await _context.Meals
            .FirstOrDefaultAsync(m => m.MealId == id && m.RestaurantId == dto.restaurantId);
        if (meal == null) return NotFound();

        meal.Name = dto.Name;
        meal.Description = dto.Description;
        meal.Price = dto.Price;
        meal.Category = dto.Category;
        meal.IsAvailable = dto.IsAvailable;
        meal.IsBestItem = dto.IsBestItem;
        meal.ImageUrl = dto.ImageUrl;

        await _context.SaveChangesAsync();
        return NoContent();
    }

    [HttpDelete("{id:int}/{restaurantId:int}")]
    public async Task<IActionResult> DeleteMeal(int id,int restaurantId)
    {
        var meal = await _context.Meals
            .FirstOrDefaultAsync(m => m.MealId == id && m.RestaurantId == restaurantId);
        if (meal == null) return NotFound();

        _context.Meals.Remove(meal);
        await _context.SaveChangesAsync();
        return NoContent();
    }

    [HttpGet("best-items/{restaurantID}")]
    public async Task<ActionResult<IEnumerable<Meal>>> GetBestItems(int restaurantId)
    {
        var best = await _context.Meals
            .Where(m => m.RestaurantId == restaurantId && m.IsBestItem == true)
            .ToListAsync();
        return Ok(best);
    }
}






