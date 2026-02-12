using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json.Serialization;
using Microsoft.EntityFrameworkCore;

namespace RMS.ServiceFramework.Models;

public partial class Table
{
    [Key]
    public int TableId { get; set; }

    public int RestaurantId { get; set; }

    [StringLength(50)]
    [Unicode(false)]
    public string TableNumber { get; set; } = null!;

    public int Capacity { get; set; }

    [StringLength(50)]
    [Unicode(false)]
    public string Status { get; set; } = null!;

    [Column("QRCodeUrl")]
    [StringLength(300)]
    [Unicode(false)]
    public string? QrcodeUrl { get; set; }

    [Column(TypeName = "datetime")]
    public DateTime? CreatedAt { get; set; }

    [InverseProperty("Table")]
    [JsonIgnore]
    public virtual ICollection<Order> Orders { get; set; } = new List<Order>();

    [InverseProperty("Table")]
    [JsonIgnore]
    public virtual ICollection<Qrcode> Qrcodes { get; set; } = new List<Qrcode>();

    [ForeignKey("RestaurantId")]
    [InverseProperty("Tables")]
    [JsonIgnore]
    public virtual Restaurant Restaurant { get; set; } = null!;

    [InverseProperty("Table")]
    [JsonIgnore]
    public virtual ICollection<Reservation> Reservations { get; set; } = new List<Reservation>();
}
