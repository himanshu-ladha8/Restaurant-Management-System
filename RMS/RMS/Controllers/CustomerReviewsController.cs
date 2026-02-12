using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using RMS.ServiceFramework.Data;
using RMS.ServiceFramework.Models;
using System.Security.Claims;

namespace RMS.Controllers;

[ApiController]
[Route("api/customer")]
[Authorize(Roles = "Customer")]
public class CustomerReviewsController : ControllerBase
{
    private readonly RMSDbContext _context;

    public CustomerReviewsController(RMSDbContext context)
    {
        _context = context;
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

    // Get all reviews for a restaurant
    [HttpGet("restaurants/{restaurantId:int}/reviews")]
    [AllowAnonymous]
    public async Task<ActionResult<IEnumerable<object>>> GetRestaurantReviews(int restaurantId)
    {
        var reviews = await _context.Reviews
            .Include(r => r.Customer)
            .Where(r => r.RestaurantId == restaurantId)
            .OrderByDescending(r => r.CreatedAt)
            .Select(r => new
            {
                reviewId = r.ReviewId,
                customerId = r.CustomerId,
                customerName = r.Customer.FullName,
                rating = r.Rating,
                comment = r.Comment,
                createdAt = r.CreatedAt
            })
            .ToListAsync();

        return Ok(reviews);
    }

    // Get average rating for a restaurant
    [HttpGet("restaurants/{restaurantId:int}/average-rating")]
    [AllowAnonymous]
    public async Task<ActionResult<object>> GetAverageRating(int restaurantId)
    {
        var reviews = await _context.Reviews
            .Where(r => r.RestaurantId == restaurantId && r.Rating.HasValue)
            .ToListAsync();

        if (reviews.Count == 0)
        {
            return Ok(new { averageRating = 0.0, totalReviews = 0 });
        }

        var averageRating = reviews.Average(r => r.Rating!.Value);
        var totalReviews = reviews.Count;

        return Ok(new { averageRating = Math.Round(averageRating, 1), totalReviews });
    }

    // Create or update a review
    [HttpPost("restaurants/{restaurantId:int}/reviews")]
    public async Task<IActionResult> CreateOrUpdateReview(int restaurantId, [FromBody] CreateReviewDto dto)
    {
        var userId = GetUserId();

        // Verify restaurant exists
        var restaurant = await _context.Restaurants.FindAsync(restaurantId);
        if (restaurant == null)
        {
            return NotFound("Restaurant not found.");
        }

        // Validate rating
        if (dto.Rating < 1 || dto.Rating > 5)
        {
            return BadRequest("Rating must be between 1 and 5.");
        }

        // Check if customer has placed an order at this restaurant (Paid or Completed status)
        var hasOrder = await _context.Orders
            .AnyAsync(o => o.RestaurantId == restaurantId && 
                          o.CustomerId == userId && 
                          (o.OrderStatus == "Paid" || o.OrderStatus == "Completed"));
        
        if (!hasOrder)
        {
            return BadRequest("You must have a completed order (Paid or Completed status) at this restaurant to leave a review.");
        }

        // Check if review already exists
        var existingReview = await _context.Reviews
            .FirstOrDefaultAsync(r => r.RestaurantId == restaurantId && r.CustomerId == userId);

        if (existingReview != null)
        {
            // Update existing review
            existingReview.Rating = dto.Rating;
            existingReview.Comment = dto.Comment?.Trim();
            existingReview.CreatedAt = DateTime.UtcNow;
        }
        else
        {
            // Create new review
            var review = new Review
            {
                RestaurantId = restaurantId,
                CustomerId = userId,
                Rating = dto.Rating,
                Comment = dto.Comment?.Trim(),
                CreatedAt = DateTime.UtcNow
            };

            _context.Reviews.Add(review);
        }

        await _context.SaveChangesAsync();

        var message = existingReview != null 
            ? "Review updated successfully." 
            : "Review submitted successfully.";

        return Ok(new { message = message });
    }

    // Get customer's review for a restaurant
    [HttpGet("restaurants/{restaurantId:int}/my-review")]
    public async Task<ActionResult<object>> GetMyReview(int restaurantId)
    {
        var userId = GetUserId();

        var review = await _context.Reviews
            .Where(r => r.RestaurantId == restaurantId && r.CustomerId == userId)
            .Select(r => new
            {
                reviewId = r.ReviewId,
                rating = r.Rating,
                comment = r.Comment,
                createdAt = r.CreatedAt
            })
            .FirstOrDefaultAsync();

        if (review == null)
        {
            return NotFound("No review found.");
        }

        return Ok(review);
    }

    // Delete a review
    [HttpDelete("reviews/{reviewId:int}")]
    public async Task<IActionResult> DeleteReview(int reviewId)
    {
        var userId = GetUserId();

        var review = await _context.Reviews.FindAsync(reviewId);
        if (review == null)
        {
            return NotFound("Review not found.");
        }

        if (review.CustomerId != userId)
        {
            return Forbid("You can only delete your own reviews.");
        }

        _context.Reviews.Remove(review);
        await _context.SaveChangesAsync();

        return Ok(new { message = "Review deleted successfully." });
    }

    public class CreateReviewDto
    {
        public int Rating { get; set; }
        public string? Comment { get; set; }
    }
}

