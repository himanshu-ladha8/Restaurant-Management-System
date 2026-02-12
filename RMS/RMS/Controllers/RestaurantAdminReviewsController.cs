using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using RMS.ServiceFramework.Data;
using System.Security.Claims;

namespace RMS.Controllers;

[ApiController]
[Route("api/restaurant-admin")]
[Authorize(Roles = "RestaurantAdmin")]
public class RestaurantAdminReviewsController : ControllerBase
{
    private readonly RMSDbContext _context;

    public RestaurantAdminReviewsController(RMSDbContext context)
    {
        _context = context;
    }

    private int GetRestaurantId()
    {
        var claim = User.FindFirst("RestaurantId");
        if (claim == null)
        {
            throw new InvalidOperationException("RestaurantId claim missing.");
        }
        return int.Parse(claim.Value);
    }

    // Get all reviews for the restaurant
    [HttpGet("reviews")]
    public async Task<ActionResult<IEnumerable<object>>> GetReviews()
    {
        var restaurantId = GetRestaurantId();

        var reviews = await _context.Reviews
            .Include(r => r.Customer)
            .Where(r => r.RestaurantId == restaurantId)
            .OrderByDescending(r => r.CreatedAt)
            .Select(r => new
            {
                reviewId = r.ReviewId,
                customerId = r.CustomerId,
                customerName = r.Customer.FullName,
                customerEmail = r.Customer.Email,
                rating = r.Rating,
                comment = r.Comment,
                createdAt = r.CreatedAt
            })
            .ToListAsync();

        return Ok(reviews);
    }

    // Get review statistics
    [HttpGet("reviews/statistics")]
    public async Task<ActionResult<object>> GetReviewStatistics()
    {
        var restaurantId = GetRestaurantId();

        var reviews = await _context.Reviews
            .Where(r => r.RestaurantId == restaurantId && r.Rating.HasValue)
            .ToListAsync();

        if (reviews.Count == 0)
        {
            return Ok(new
            {
                totalReviews = 0,
                averageRating = 0.0,
                ratingDistribution = new
                {
                    fiveStar = 0,
                    fourStar = 0,
                    threeStar = 0,
                    twoStar = 0,
                    oneStar = 0
                }
            });
        }

        var averageRating = Math.Round(reviews.Average(r => r.Rating!.Value), 1);
        var ratingDistribution = new
        {
            fiveStar = reviews.Count(r => r.Rating == 5),
            fourStar = reviews.Count(r => r.Rating == 4),
            threeStar = reviews.Count(r => r.Rating == 3),
            twoStar = reviews.Count(r => r.Rating == 2),
            oneStar = reviews.Count(r => r.Rating == 1)
        };

        return Ok(new
        {
            totalReviews = reviews.Count,
            averageRating = averageRating,
            ratingDistribution = ratingDistribution
        });
    }
}

