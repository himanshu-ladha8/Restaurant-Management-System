using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json.Serialization;
using Microsoft.EntityFrameworkCore;

namespace RMS.ServiceFramework.Models;

public partial class Restaurant
{
    [Key]
    public int RestaurantId { get; set; }

    [StringLength(200)]
    [Unicode(false)]
    public string Name { get; set; } = null!;

    [StringLength(300)]
    [Unicode(false)]
    public string? Address { get; set; }

    [StringLength(20)]
    [Unicode(false)]
    public string? Phone { get; set; }

    public TimeOnly? OpenTime { get; set; }

    public TimeOnly? CloseTime { get; set; }

    public bool? IsActive { get; set; }

    [Column(TypeName = "datetime")]
    public DateTime? CreatedAt { get; set; }

    [InverseProperty("Restaurant")]
    public virtual ICollection<Meal> Meals { get; set; } = new List<Meal>();

    [InverseProperty("Restaurant")]
    public virtual ICollection<Order> Orders { get; set; } = new List<Order>();

    [InverseProperty("Restaurant")]
    public virtual ICollection<Review> Reviews { get; set; } = new List<Review>();

    [InverseProperty("Restaurant")]
    public virtual ICollection<Table> Tables { get; set; } = new List<Table>();

    [InverseProperty("Restaurant")]
    public virtual ICollection<User> Users { get; set; } = new List<User>();

    [InverseProperty("Restaurant")]
    [JsonIgnore]
    public virtual ICollection<Reservation> Reservations { get; set; } = new List<Reservation>();
}
