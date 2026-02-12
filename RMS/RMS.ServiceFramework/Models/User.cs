using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json.Serialization;
using Microsoft.EntityFrameworkCore;

namespace RMS.ServiceFramework.Models;

[Index("Email", Name = "UQ__Users__A9D10534A09C0E1E", IsUnique = true)]
public partial class User
{
    [Key]
    public int UserId { get; set; }

    [StringLength(150)]
    [Unicode(false)]
    public string FullName { get; set; } = null!;

    [StringLength(150)]
    [Unicode(false)]
    public string Email { get; set; } = null!;

    [StringLength(300)]
    [Unicode(false)]
    public string PasswordHash { get; set; } = null!;

    [StringLength(50)]
    [Unicode(false)]
    public string UserType { get; set; } = null!;

    public int? RestaurantId { get; set; }

    [StringLength(20)]
    [Unicode(false)]
    public string? PhoneNumber { get; set; }

    [Column(TypeName = "datetime")]
    public DateTime? CreatedAt { get; set; }

    [InverseProperty("Customer")]
    [JsonIgnore]
    public virtual ICollection<Order> Orders { get; set; } = new List<Order>();

    [ForeignKey("RestaurantId")]
    [InverseProperty("Users")]
    [JsonIgnore]
    public virtual Restaurant? Restaurant { get; set; }

    [InverseProperty("Customer")]
    [JsonIgnore]
    public virtual ICollection<Review> Reviews { get; set; } = new List<Review>();

    [InverseProperty("OTP")]
    [JsonIgnore]
    public virtual string? OTP { get; set; }

    [InverseProperty("Customer")]
    [JsonIgnore]
    public virtual ICollection<SavedPaymentMethod> SavedPaymentMethods { get; set; } = new List<SavedPaymentMethod>();

    [InverseProperty("Customer")]
    [JsonIgnore]
    public virtual ICollection<Reservation> Reservations { get; set; } = new List<Reservation>();
}
