using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json.Serialization;
using Microsoft.EntityFrameworkCore;

namespace RMS.ServiceFramework.Models;

public partial class Order
{
    [Key]
    public int OrderId { get; set; }

    public int RestaurantId { get; set; }

    public int TableId { get; set; }

    public int? CustomerId { get; set; }

    [StringLength(50)]
    [Unicode(false)]
    public string OrderStatus { get; set; } = null!;

    [Column(TypeName = "decimal(10, 2)")]
    public decimal? TotalAmount { get; set; }

    [Column(TypeName = "datetime")]
    public DateTime? CreatedAt { get; set; }
    //added 
    [StringLength(50)]
    [Unicode(false)]
    public string? PaymentStatus { get; set; }


    [ForeignKey("CustomerId")]
    [InverseProperty("Orders")]
    [JsonIgnore]
    public virtual User? Customer { get; set; }

    [InverseProperty("Order")]
    public virtual ICollection<OrderItem> OrderItems { get; set; } = new List<OrderItem>();

    [InverseProperty("Order")]
    public virtual ICollection<Payment> Payments { get; set; } = new List<Payment>();

    [ForeignKey("RestaurantId")]
    [InverseProperty("Orders")]
    [JsonIgnore]
    public virtual Restaurant Restaurant { get; set; } = null!;

    [ForeignKey("TableId")]
    [InverseProperty("Orders")]
    [JsonIgnore]
    public virtual Table Table { get; set; } = null!;
}
