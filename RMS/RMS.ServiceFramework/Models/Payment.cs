using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json.Serialization;
using Microsoft.EntityFrameworkCore;

namespace RMS.ServiceFramework.Models;

public partial class Payment
{
    [Key]
    public int PaymentId { get; set; }

    public int OrderId { get; set; }

    [Column(TypeName = "decimal(10, 2)")]
    public decimal Amount { get; set; }

    [StringLength(50)]
    [Unicode(false)]
    public string PaymentMode { get; set; } = null!;

    [StringLength(50)]
    [Unicode(false)]
    public string? PaymentStatus { get; set; } = null!;

    [StringLength(200)]
    [Unicode(false)]
    public string? TransactionId { get; set; }

    [Column(TypeName = "datetime")]
    public DateTime? CreatedAt { get; set; }

    // 🔴 FIX: Prevent circular JSON serialization
    [JsonIgnore]
    [ForeignKey("OrderId")]
    [InverseProperty("Payments")]
    public virtual Order Order { get; set; } = null!;
}
