using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace RMS.ServiceFramework.Models;

[Table("QRCodes")]
public partial class Qrcode
{
    [Key]
    [Column("QRCodeId")]
    public int QrcodeId { get; set; }

    public int TableId { get; set; }

    [Column("QRCodeImageUrl")]
    [StringLength(300)]
    [Unicode(false)]
    public string? QrcodeImageUrl { get; set; }

    [Column(TypeName = "datetime")]
    public DateTime? CreatedAt { get; set; }

    [ForeignKey("TableId")]
    [InverseProperty("Qrcodes")]
    public virtual Table Table { get; set; } = null!;
}
