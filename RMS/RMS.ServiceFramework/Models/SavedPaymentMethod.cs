using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json.Serialization;
using Microsoft.EntityFrameworkCore;

namespace RMS.ServiceFramework.Models;

public partial class SavedPaymentMethod
{
    [Key]
    public int SavedPaymentMethodId { get; set; }

    public int CustomerId { get; set; }

    [StringLength(200)]
    [Unicode(false)]
    public string StripePaymentMethodId { get; set; } = null!; // Stripe Payment Method ID

    [StringLength(50)]
    [Unicode(false)]
    public string? CardBrand { get; set; } // e.g., "visa", "mastercard"

    [StringLength(10)]
    [Unicode(false)]
    public string? Last4 { get; set; } // Last 4 digits of card

    [StringLength(10)]
    [Unicode(false)]
    public string? ExpMonth { get; set; }

    [StringLength(10)]
    [Unicode(false)]
    public string? ExpYear { get; set; }

    [Column(TypeName = "datetime")]
    public DateTime? CreatedAt { get; set; }

    [Column(TypeName = "datetime")]
    public DateTime? LastUsedAt { get; set; }

    public bool IsDefault { get; set; } = false;

    [ForeignKey("CustomerId")]
    [InverseProperty("SavedPaymentMethods")]
    [JsonIgnore]
    public virtual User Customer { get; set; } = null!;
}

