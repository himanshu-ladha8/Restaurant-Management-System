    using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using RMS.ServiceFramework.Data;
using RMS.ServiceFramework.Models;
using System.Security.Claims;

namespace RMS.Controllers;

[ApiController]
[Route("api/restaurant-admin/tables")]
[Authorize(Roles = "RestaurantAdmin")]
public class RestaurantAdminTablesController : ControllerBase
{
    private readonly RMSDbContext _context;

    public RestaurantAdminTablesController(RMSDbContext context)
    {
        _context = context;
    }

    private int GetRestaurantId(int RestaurantId)
    {
        var _RestaurantId = _context.Restaurants.ToList().Where(x => x.RestaurantId == RestaurantId).FirstOrDefault();
        return _RestaurantId.RestaurantId;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<Table>>> GetTables(int _restaurantId)
    {
        var restaurantId = GetRestaurantId(_restaurantId);
        var tables = await _context.Tables
            .Where(t => t.RestaurantId == restaurantId)
            .ToListAsync();
        return Ok(tables);
    }

    [HttpGet("{restaurantId:int}/{tableid:int}")]
    public async Task<ActionResult<Table>> GetTable(int restaurantId,int tableid)
    {
        var table = await _context.Tables
            .FirstOrDefaultAsync(t => t.TableId == tableid && t.RestaurantId == restaurantId);
        if (table == null) return NotFound();
        return Ok(table);
    }

    public class UpsertTableDto
    {
        public string TableNumber { get; set; } = string.Empty;
        public int Capacity { get; set; }
        public string Status { get; set; } = "Available";
        public int RestaurantId { get; set; }
    }

    [HttpPost]
    public async Task<IActionResult> CreateTable([FromBody] UpsertTableDto dto)
    {
        var restaurantId = GetRestaurantId(dto.RestaurantId);

        var table = new Table
        {
            RestaurantId = restaurantId,
            TableNumber = dto.TableNumber,
            Capacity = dto.Capacity,
            Status = dto.Status,
            CreatedAt = DateTime.UtcNow
        };

        _context.Tables.Add(table);
        await _context.SaveChangesAsync();

        return Ok(table);
    }

    [HttpPut("{id:int}")]
    public async Task<IActionResult> UpdateTable(int id, [FromBody] UpsertTableDto dto)
    {
        var restaurantId = GetRestaurantId(dto.RestaurantId);
        var table = await _context.Tables
            .FirstOrDefaultAsync(t => t.TableId == id && t.RestaurantId == restaurantId);
        if (table == null) return NotFound();

        table.TableNumber = dto.TableNumber;
        table.Capacity = dto.Capacity;
        table.Status = dto.Status;

        await _context.SaveChangesAsync();
        return NoContent();
    }

    [HttpDelete("{restaurantId:int}/{tableId:int}")]
    public async Task<IActionResult> DeleteTable(int restaurantId,int tableId)
    {
        //var _restaurantId = GetRestaurantId(restaurantId);
        var table = await _context.Tables
            .FirstOrDefaultAsync(t => t.TableId == tableId && t.RestaurantId == restaurantId);
        if (table == null) return NotFound();

        _context.Tables.Remove(table);
        await _context.SaveChangesAsync();
        return NoContent();
    }
}






