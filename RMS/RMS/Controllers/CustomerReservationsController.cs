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
public class CustomerReservationsController : ControllerBase
{
    private readonly RMSDbContext _context;

    public CustomerReservationsController(RMSDbContext context)
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

    public class CreateReservationDto
    {
        public int RestaurantId { get; set; }
        public int TableId { get; set; }
        public DateTime ReservationDate { get; set; }
        public TimeSpan ReservationTime { get; set; }
        public int Duration { get; set; } // Duration in minutes
        public int NumberOfGuests { get; set; }
        public string? Notes { get; set; }
        public string? CustomerPhone { get; set; }
        public string? CustomerName { get; set; }
    }

    // Create a new reservation
    [HttpPost("reservations")]
    public async Task<IActionResult> CreateReservation([FromBody] CreateReservationDto dto)
    {
        var userId = GetUserId();

        // Validate restaurant exists
        var restaurant = await _context.Restaurants.FindAsync(dto.RestaurantId);
        if (restaurant == null)
            return NotFound("Restaurant not found.");

        // Validate table exists and belongs to restaurant
        var table = await _context.Tables
            .FirstOrDefaultAsync(t => t.TableId == dto.TableId && t.RestaurantId == dto.RestaurantId);
        if (table == null)
            return NotFound("Table not found.");

        // Validate date is not in the past
        if (dto.ReservationDate.Date < DateTime.UtcNow.Date)
            return BadRequest("Cannot make reservations for past dates.");

        // Check for conflicting reservations
        // Calculate end time for the new reservation
        var reservationEndTime = dto.ReservationTime.Add(TimeSpan.FromMinutes(dto.Duration));
        
        // Fetch all reservations for the table on the same date, then filter in memory
        // This avoids EF Core translation issues with TimeSpan calculations
        var allReservations = await _context.Reservations
            .Where(r => r.TableId == dto.TableId &&
                       r.RestaurantId == dto.RestaurantId &&
                       r.ReservationDate.Date == dto.ReservationDate.Date &&
                       r.Status != "Cancelled" &&
                       r.Status != "Rejected")
            .ToListAsync();

        // Filter for conflicts in memory
        var conflictingReservations = allReservations.Where(r =>
        {
            var existingEndTime = r.ReservationTime.Add(TimeSpan.FromMinutes(r.Duration));
            
            // Check if reservations overlap
            return (r.ReservationTime <= dto.ReservationTime && existingEndTime > dto.ReservationTime) ||
                   (r.ReservationTime < reservationEndTime && existingEndTime >= reservationEndTime) ||
                   (r.ReservationTime >= dto.ReservationTime && existingEndTime <= reservationEndTime);
        }).ToList();

        if (conflictingReservations.Any())
        {
            return BadRequest("This time slot is already booked. Please choose a different time.");
        }

        // Get customer info
        var customer = await _context.Users.FindAsync(userId);
        var customerName = dto.CustomerName ?? customer?.FullName ?? "Guest";
        var customerPhone = dto.CustomerPhone ?? customer?.PhoneNumber;

        var reservation = new Reservation
        {
            RestaurantId = dto.RestaurantId,
            TableId = dto.TableId,
            CustomerId = userId,
            ReservationDate = dto.ReservationDate.Date,
            ReservationTime = dto.ReservationTime,
            Duration = dto.Duration,
            NumberOfGuests = dto.NumberOfGuests,
            Status = "Pending",
            Notes = dto.Notes,
            CustomerName = customerName,
            CustomerPhone = customerPhone,
            CreatedAt = DateTime.UtcNow
        };

        _context.Reservations.Add(reservation);
        await _context.SaveChangesAsync();

        return Ok(new
        {
            reservationId = reservation.ReservationId,
            message = "Reservation request submitted successfully. Waiting for restaurant confirmation."
        });
    }

    // Get all reservations for current customer
    [HttpGet("reservations")]
    public async Task<ActionResult<IEnumerable<object>>> GetMyReservations([FromQuery] int? restaurantId = null)
    {
        var userId = GetUserId();
        var query = _context.Reservations
            .Include(r => r.Restaurant)
            .Include(r => r.Table)
            .Where(r => r.CustomerId == userId);

        if (restaurantId.HasValue)
        {
            query = query.Where(r => r.RestaurantId == restaurantId.Value);
        }

        var reservations = await query
            .OrderByDescending(r => r.ReservationDate)
            .ThenByDescending(r => r.ReservationTime)
            .ToListAsync();

        var result = reservations.Select(r => new
        {
            ReservationId = r.ReservationId,
            RestaurantId = r.RestaurantId,
            RestaurantName = r.Restaurant?.Name ?? "Unknown",
            TableId = r.TableId,
            TableNumber = r.Table?.TableNumber ?? "N/A",
            ReservationDate = r.ReservationDate,
            ReservationTime = r.ReservationTime,
            SuggestedTime = r.SuggestedTime,
            Duration = r.Duration,
            NumberOfGuests = r.NumberOfGuests,
            Status = r.Status,
            Notes = r.Notes,
            AdminNotes = r.AdminNotes,
            CreatedAt = r.CreatedAt,
            UpdatedAt = r.UpdatedAt
        }).ToList();

        return Ok(result);
    }

    // Get a specific reservation
    [HttpGet("reservations/{reservationId:int}")]
    public async Task<ActionResult<object>> GetReservation(int reservationId)
    {
        var userId = GetUserId();
        var reservation = await _context.Reservations
            .Include(r => r.Restaurant)
            .Include(r => r.Table)
            .FirstOrDefaultAsync(r => r.ReservationId == reservationId && r.CustomerId == userId);

        if (reservation == null)
            return NotFound("Reservation not found.");

        return Ok(new
        {
            ReservationId = reservation.ReservationId,
            RestaurantId = reservation.RestaurantId,
            RestaurantName = reservation.Restaurant?.Name ?? "Unknown",
            TableId = reservation.TableId,
            TableNumber = reservation.Table?.TableNumber ?? "N/A",
            ReservationDate = reservation.ReservationDate,
            ReservationTime = reservation.ReservationTime,
            SuggestedTime = reservation.SuggestedTime,
            Duration = reservation.Duration,
            NumberOfGuests = reservation.NumberOfGuests,
            Status = reservation.Status,
            Notes = reservation.Notes,
            AdminNotes = reservation.AdminNotes,
            CreatedAt = reservation.CreatedAt,
            UpdatedAt = reservation.UpdatedAt
        });
    }

    // Cancel a reservation
    [HttpPut("reservations/{reservationId:int}/cancel")]
    public async Task<IActionResult> CancelReservation(int reservationId)
    {
        var userId = GetUserId();
        var reservation = await _context.Reservations
            .FirstOrDefaultAsync(r => r.ReservationId == reservationId && r.CustomerId == userId);

        if (reservation == null)
            return NotFound("Reservation not found.");

        if (reservation.Status == "Cancelled")
            return BadRequest("Reservation is already cancelled.");

        if (reservation.Status == "Completed")
            return BadRequest("Cannot cancel a completed reservation.");

        reservation.Status = "Cancelled";
        reservation.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        return Ok(new { message = "Reservation cancelled successfully.", reservationId = reservation.ReservationId });
    }

    // Accept suggested time from admin
    [HttpPut("reservations/{reservationId:int}/accept-suggested-time")]
    public async Task<IActionResult> AcceptSuggestedTime(int reservationId)
    {
        var userId = GetUserId();
        var reservation = await _context.Reservations
            .FirstOrDefaultAsync(r => r.ReservationId == reservationId && r.CustomerId == userId);

        if (reservation == null)
            return NotFound("Reservation not found.");

        if (reservation.SuggestedTime == null)
            return BadRequest("No suggested time available for this reservation.");

        if (reservation.Status != "Pending")
            return BadRequest("Can only accept suggested time for pending reservations.");

        // Update reservation with suggested time
        reservation.ReservationTime = reservation.SuggestedTime.Value;
        reservation.SuggestedTime = null; // Clear suggested time after acceptance
        reservation.Status = "Confirmed";
        reservation.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        return Ok(new { message = "Suggested time accepted. Reservation confirmed.", reservationId = reservation.ReservationId });
    }
}

