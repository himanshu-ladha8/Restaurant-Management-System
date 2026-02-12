using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using RMS.ServiceFramework.Data;
using RMS.ServiceFramework.Models;
using System.Security.Claims;

namespace RMS.Controllers;

[ApiController]
[Route("api/restaurant-admin/info")]
[Authorize(Roles = "RestaurantAdmin")]
public class RestaurantAdminInfoController : ControllerBase
{
    private readonly RMSDbContext _context;

    public RestaurantAdminInfoController(RMSDbContext context)
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

    [HttpGet("restaurant")]
    public async Task<ActionResult<Restaurant>> GetRestaurant()
    {
        var restaurantId = GetRestaurantId();
        var restaurant = await _context.Restaurants.FindAsync(restaurantId);
        if (restaurant == null) return NotFound();
        return Ok(restaurant);
    }
}

