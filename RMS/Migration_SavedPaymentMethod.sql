-- Migration script for SavedPaymentMethod table
-- Run this script on your SQL Server database

IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[SavedPaymentMethods]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[SavedPaymentMethods] (
        [SavedPaymentMethodId] INT IDENTITY(1,1) NOT NULL,
        [CustomerId] INT NOT NULL,
        [StripePaymentMethodId] NVARCHAR(200) NOT NULL,
        [CardBrand] NVARCHAR(50) NULL,
        [Last4] NVARCHAR(10) NULL,
        [ExpMonth] NVARCHAR(10) NULL,
        [ExpYear] NVARCHAR(10) NULL,
        [CreatedAt] DATETIME NULL DEFAULT GETDATE(),
        [LastUsedAt] DATETIME NULL,
        [IsDefault] BIT NOT NULL DEFAULT 0,
        CONSTRAINT [PK__SavedPaymentMethods__SavedPaymentMethodId] PRIMARY KEY CLUSTERED ([SavedPaymentMethodId] ASC),
        CONSTRAINT [FK_SavedPaymentMethods_Users] FOREIGN KEY ([CustomerId]) REFERENCES [dbo].[Users] ([UserId]) ON DELETE CASCADE
    );

    CREATE INDEX [IX_SavedPaymentMethods_CustomerId] ON [dbo].[SavedPaymentMethods] ([CustomerId]);
    CREATE INDEX [IX_SavedPaymentMethods_StripePaymentMethodId] ON [dbo].[SavedPaymentMethods] ([StripePaymentMethodId]);
END
GO

