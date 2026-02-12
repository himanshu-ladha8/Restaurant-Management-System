using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json.Serialization;
using Microsoft.EntityFrameworkCore;

namespace RMS.ServiceFramework.Models;

public partial class Reservation
{
    [Key]
    public int ReservationId { get; set; }

    public int RestaurantId { get; set; }

    public int TableId { get; set; }

    public int? CustomerId { get; set; }

    [Column(TypeName = "date")]
    public DateTime ReservationDate { get; set; }

    [Column(TypeName = "time")]
    public TimeSpan ReservationTime { get; set; }

    public int Duration { get; set; }

    public int NumberOfGuests { get; set; }

    [StringLength(50)]
    [Unicode(false)]
    public string Status { get; set; } = null!;

    [Column(TypeName = "time")]
    public TimeSpan? SuggestedTime { get; set; }

    [StringLength(500)]
    [Unicode(false)]
    public string? Notes { get; set; }

    [StringLength(500)]
    [Unicode(false)]
    public string? AdminNotes { get; set; }

    [StringLength(20)]
    [Unicode(false)]
    public string? CustomerPhone { get; set; }

    [StringLength(150)]
    [Unicode(false)]
    public string? CustomerName { get; set; }

    [Column(TypeName = "datetime")]
    public DateTime? CreatedAt { get; set; }

    [Column(TypeName = "datetime")]
    public DateTime? UpdatedAt { get; set; }

    [ForeignKey("RestaurantId")]
    [InverseProperty("Reservations")]
    [JsonIgnore]
    public virtual Restaurant Restaurant { get; set; } = null!;

    [ForeignKey("TableId")]
    [InverseProperty("Reservations")]
    [JsonIgnore]
    public virtual Table Table { get; set; } = null!;

    [ForeignKey("CustomerId")]
    [InverseProperty("Reservations")]
    [JsonIgnore]
    public virtual User? Customer { get; set; }
}
