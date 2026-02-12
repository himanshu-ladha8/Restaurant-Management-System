using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json.Serialization;
using Microsoft.EntityFrameworkCore;

namespace RMS.ServiceFramework.Models;

public partial class Meal
{
    [Key]
    public int MealId { get; set; }

    public int RestaurantId { get; set; }

    [StringLength(150)]
    [Unicode(false)]
    public string Name { get; set; } = null!;

    [StringLength(500)]
    [Unicode(false)]
    public string? Description { get; set; }

    [Column(TypeName = "decimal(10, 2)")]
    public decimal Price { get; set; }

    [StringLength(100)]
    [Unicode(false)]
    public string? Category { get; set; }

    [StringLength(300)]
    [Unicode(false)]
    public string? ImageUrl { get; set; }

    public bool? IsAvailable { get; set; }

    public bool? IsBestItem { get; set; }

    [Column(TypeName = "datetime")]
    public DateTime? CreatedAt { get; set; }

    [InverseProperty("Meal")]
    [JsonIgnore]
    public virtual ICollection<OrderItem> OrderItems { get; set; } = new List<OrderItem>();

    [ForeignKey("RestaurantId")]
    [InverseProperty("Meals")]
    [JsonIgnore]
    public virtual Restaurant Restaurant { get; set; } = null!;
}
