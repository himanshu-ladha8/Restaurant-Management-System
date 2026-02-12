using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using RMS.ServiceFramework.Data;
using RMS.ServiceFramework.Models;
using System.Security.Claims;

namespace RMS.Controllers;

[ApiController]
[Route("api/restaurant-admin/reservations")]
[Authorize(Roles = "RestaurantAdmin")]
public class RestaurantAdminReservationsController : ControllerBase
{
    private readonly RMSDbContext _context;

    public RestaurantAdminReservationsController(RMSDbContext context)
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

    // Get all reservations for the restaurant
    [HttpGet]
    public async Task<ActionResult<IEnumerable<object>>> GetReservations([FromQuery] string? status = null, [FromQuery] string? date = null)
    {
        var restaurantId = GetRestaurantId();
        var query = _context.Reservations
            .Include(r => r.Restaurant)
            .Include(r => r.Table)
            .Include(r => r.Customer)
            .Where(r => r.RestaurantId == restaurantId);

        if (!string.IsNullOrWhiteSpace(status))
        {
            query = query.Where(r => r.Status == status);
        }

        if (!string.IsNullOrWhiteSpace(date) && DateTime.TryParse(date, out var filterDate))
        {
            query = query.Where(r => r.ReservationDate.Date == filterDate.Date);
        }

        var reservations = await query
            .OrderByDescending(r => r.ReservationDate)
            .ThenByDescending(r => r.ReservationTime)
            .ToListAsync();

        var result = reservations.Select(r => new
        {
            reservationId = r.ReservationId,
            restaurantId = r.RestaurantId,
            restaurantName = r.Restaurant?.Name ?? "Unknown",
            tableId = r.TableId,
            tableNumber = r.Table?.TableNumber ?? "N/A",
            tableCapacity = r.Table?.Capacity ?? 0,
            customerId = r.CustomerId,
            customerName = r.CustomerName ?? r.Customer?.FullName ?? "Guest",
            customerEmail = r.Customer?.Email,
            customerPhone = r.CustomerPhone ?? r.Customer?.PhoneNumber,
            reservationDate = r.ReservationDate,
            reservationTime = r.ReservationTime,
            suggestedTime = r.SuggestedTime,
            duration = r.Duration,
            numberOfGuests = r.NumberOfGuests,
            status = r.Status,
            notes = r.Notes,
            adminNotes = r.AdminNotes,
            createdAt = r.CreatedAt,
            updatedAt = r.UpdatedAt
        }).ToList();

        return Ok(result);
    }

    // Get a specific reservation
    [HttpGet("{reservationId:int}")]
    public async Task<ActionResult<object>> GetReservation(int reservationId)
    {
        var restaurantId = GetRestaurantId();
        var reservation = await _context.Reservations
            .Include(r => r.Restaurant)
            .Include(r => r.Table)
            .Include(r => r.Customer)
            .FirstOrDefaultAsync(r => r.ReservationId == reservationId && r.RestaurantId == restaurantId);

        if (reservation == null)
            return NotFound("Reservation not found.");

        return Ok(new
        {
            reservationId = reservation.ReservationId,
            restaurantId = reservation.RestaurantId,
            restaurantName = reservation.Restaurant?.Name ?? "Unknown",
            tableId = reservation.TableId,
            tableNumber = reservation.Table?.TableNumber ?? "N/A",
            tableCapacity = reservation.Table?.Capacity ?? 0,
            customerId = reservation.CustomerId,
            customerName = reservation.CustomerName ?? reservation.Customer?.FullName ?? "Guest",
            customerEmail = reservation.Customer?.Email,
            customerPhone = reservation.CustomerPhone ?? reservation.Customer?.PhoneNumber,
            reservationDate = reservation.ReservationDate,
            reservationTime = reservation.ReservationTime,
            suggestedTime = reservation.SuggestedTime,
            duration = reservation.Duration,
            numberOfGuests = reservation.NumberOfGuests,
            status = reservation.Status,
            notes = reservation.Notes,
            adminNotes = reservation.AdminNotes,
            createdAt = reservation.CreatedAt,
            updatedAt = reservation.UpdatedAt
        });
    }

    // Update reservation status (Confirm, Reject, Complete)
    [HttpPut("{reservationId:int}/status")]
    public async Task<IActionResult> UpdateReservationStatus(int reservationId, [FromBody] UpdateStatusDto dto)
    {
        var restaurantId = GetRestaurantId();
        var reservation = await _context.Reservations
            .FirstOrDefaultAsync(r => r.ReservationId == reservationId && r.RestaurantId == restaurantId);

        if (reservation == null)
            return NotFound("Reservation not found.");

        if (!new[] { "Pending", "Confirmed", "Rejected", "Cancelled", "Completed", "Arrived" }.Contains(dto.Status))
        {
            return BadRequest("Invalid status. Allowed values: Pending, Confirmed, Rejected, Cancelled, Completed, Arrived");
        }

        reservation.Status = dto.Status;
        if (!string.IsNullOrWhiteSpace(dto.AdminNotes))
        {
            reservation.AdminNotes = dto.AdminNotes;
        }
        reservation.UpdatedAt = DateTime.UtcNow;

        // If status is "Arrived", mark the table as "Occupied"
        if (dto.Status == "Arrived")
        {
            var table = await _context.Tables.FindAsync(reservation.TableId);
            if (table != null && table.RestaurantId == restaurantId)
            {
                table.Status = "Occupied";
            }
        }

        await _context.SaveChangesAsync();

        return Ok(new
        {
            message = $"Reservation {dto.Status.ToLower()} successfully.",
            reservationId = reservation.ReservationId,
            status = reservation.Status
        });
    }

    // Suggest alternative time to customer
    [HttpPut("{reservationId:int}/suggest-time")]
    public async Task<IActionResult> SuggestTime(int reservationId, [FromBody] SuggestTimeDto dto)
    {
        var restaurantId = GetRestaurantId();
        var reservation = await _context.Reservations
            .FirstOrDefaultAsync(r => r.ReservationId == reservationId && r.RestaurantId == restaurantId);

        if (reservation == null)
            return NotFound("Reservation not found.");

        if (reservation.Status != "Pending")
            return BadRequest("Can only suggest time for pending reservations.");

        if (TimeSpan.TryParse(dto.SuggestedTime, out var suggestedTime))
        {
            reservation.SuggestedTime = suggestedTime;
        }
        else
        {
            return BadRequest("Invalid time format. Expected format: HH:mm:ss or HH:mm");
        }

        if (!string.IsNullOrWhiteSpace(dto.AdminNotes))
        {
            reservation.AdminNotes = dto.AdminNotes;
        }

        reservation.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        return Ok(new
        {
            message = "Alternative time suggested to customer successfully.",
            reservationId = reservation.ReservationId,
            suggestedTime = reservation.SuggestedTime
        });
    }

    // Get available time slots for a table on a specific date
    [HttpGet("available-slots")]
    public async Task<ActionResult<IEnumerable<object>>> GetAvailableSlots([FromQuery] int tableId, [FromQuery] string date, [FromQuery] int duration = 60)
    {
        var restaurantId = GetRestaurantId();

        // Validate table belongs to restaurant
        var table = await _context.Tables
            .FirstOrDefaultAsync(t => t.TableId == tableId && t.RestaurantId == restaurantId);

        if (table == null)
            return NotFound("Table not found.");

        // Parse date - handle both date-only and datetime strings
        DateTime reservationDate;
        if (DateTime.TryParse(date, out var parsedDate))
        {
            reservationDate = parsedDate;
        }
        else if (DateTime.TryParseExact(date, "yyyy-MM-dd", null, System.Globalization.DateTimeStyles.None, out var exactDate))
        {
            reservationDate = exactDate;
        }
        else
        {
            return BadRequest($"Invalid date format: {date}. Expected format: yyyy-MM-dd");
        }

        // Get restaurant hours (assuming 9 AM to 10 PM as default if not set)
        var restaurant = await _context.Restaurants.FindAsync(restaurantId);
        var openTimeOnly = restaurant?.OpenTime ?? new TimeOnly(9, 0);
        var closeTimeOnly = restaurant?.CloseTime ?? new TimeOnly(22, 0);

        // Convert TimeOnly to TimeSpan for comparison
        var openTime = new TimeSpan(openTimeOnly.Hour, openTimeOnly.Minute, 0);
        var closeTime = new TimeSpan(closeTimeOnly.Hour, closeTimeOnly.Minute, 0);

        // Ensure closeTime is after openTime
        if (closeTime <= openTime)
        {
            closeTime = new TimeSpan(22, 0, 0); // Default to 10 PM if invalid
        }

        // Get existing reservations for this table on this date
        // Use explicit date comparison for better EF Core translation
        var reservationDateOnly = reservationDate.Date;
        var existingReservations = await _context.Reservations
            .Where(r => r.TableId == tableId &&
                       r.ReservationDate >= reservationDateOnly &&
                       r.ReservationDate < reservationDateOnly.AddDays(1) &&
                       r.Status != "Cancelled" &&
                       r.Status != "Rejected")
            .ToListAsync();

        // Generate available time slots
        var availableSlots = new List<object>();
        var currentTime = openTime;
        var endTime = closeTime;
        var slotDuration = TimeSpan.FromMinutes(duration);

        while (currentTime.Add(slotDuration) <= endTime)
        {
            var slotEndTime = currentTime.Add(slotDuration);
            var isAvailable = !existingReservations.Any(r =>
            {
                var reservationEnd = r.ReservationTime.Add(TimeSpan.FromMinutes(r.Duration));
                // Check if slots overlap - more accurate overlap detection
                var reservationStart = r.ReservationTime;
                var reservationEndTime = reservationEnd;
                
                // Check if the new slot overlaps with existing reservation
                // Overlap occurs if: (slotStart < reservationEnd) AND (slotEnd > reservationStart)
                return (currentTime < reservationEndTime) && (slotEndTime > reservationStart);
            });

            if (isAvailable)
            {
                // Format time as HH:mm (24-hour format) for consistency
                var hours = currentTime.Hours;
                var minutes = currentTime.Minutes;
                var timeString = $"{hours:D2}:{minutes:D2}";
                
                availableSlots.Add(new
                {
                    time = timeString,
                    time24 = timeString
                });
            }

            // Move to next slot (30-minute intervals)
            currentTime = currentTime.Add(TimeSpan.FromMinutes(30));
        }

        return Ok(availableSlots);
    }

    public class UpdateStatusDto
    {
        public string Status { get; set; } = null!;
        public string? AdminNotes { get; set; }
    }

    public class SuggestTimeDto
    {
        public string SuggestedTime { get; set; } = null!;
        public string? AdminNotes { get; set; }
    }
}
