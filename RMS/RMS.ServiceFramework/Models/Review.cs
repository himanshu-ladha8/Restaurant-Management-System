using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json.Serialization;
using Microsoft.EntityFrameworkCore;

namespace RMS.ServiceFramework.Models;

public partial class Review
{
    [Key]
    public int ReviewId { get; set; }

    public int RestaurantId { get; set; }

    public int CustomerId { get; set; }

    public int? Rating { get; set; }

    [StringLength(500)]
    [Unicode(false)]
    public string? Comment { get; set; }

    [Column(TypeName = "datetime")]
    public DateTime? CreatedAt { get; set; }

    [ForeignKey("CustomerId")]
    [InverseProperty("Reviews")]
    [JsonIgnore]
    public virtual User Customer { get; set; } = null!;

    [ForeignKey("RestaurantId")]
    [InverseProperty("Reviews")]
    [JsonIgnore]
    public virtual Restaurant Restaurant { get; set; } = null!;
}
