-- Migration script for Reservations table
-- Run this script in your SQL Server database

IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[Reservations]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[Reservations] (
        [ReservationId] INT IDENTITY(1,1) NOT NULL,
        [RestaurantId] INT NOT NULL,
        [TableId] INT NOT NULL,
        [CustomerId] INT NULL,
        [ReservationDate] DATE NOT NULL,
        [ReservationTime] TIME NOT NULL,
        [Duration] INT NOT NULL DEFAULT 60,
        [NumberOfGuests] INT NOT NULL,
        [Status] NVARCHAR(50) NOT NULL DEFAULT 'Pending',
        [SuggestedTime] TIME NULL,
        [Notes] NVARCHAR(500) NULL,
        [AdminNotes] NVARCHAR(500) NULL,
        [CustomerPhone] NVARCHAR(20) NULL,
        [CustomerName] NVARCHAR(150) NULL,
        [CreatedAt] DATETIME NOT NULL DEFAULT GETDATE(),
        [UpdatedAt] DATETIME NULL,
        CONSTRAINT [PK__Reservations__ReservationId] PRIMARY KEY CLUSTERED ([ReservationId] ASC),
        CONSTRAINT [FK_Reservations_Restaurants] FOREIGN KEY ([RestaurantId]) REFERENCES [dbo].[Restaurants] ([RestaurantId]),
        CONSTRAINT [FK_Reservations_Tables] FOREIGN KEY ([TableId]) REFERENCES [dbo].[Tables] ([TableId]),
        CONSTRAINT [FK_Reservations_Users] FOREIGN KEY ([CustomerId]) REFERENCES [dbo].[Users] ([UserId])
    );

    -- Create indexes for better query performance
    CREATE INDEX [IX_Reservations_RestaurantId] ON [dbo].[Reservations] ([RestaurantId]);
    CREATE INDEX [IX_Reservations_TableId] ON [dbo].[Reservations] ([TableId]);
    CREATE INDEX [IX_Reservations_CustomerId] ON [dbo].[Reservations] ([CustomerId]);
    CREATE INDEX [IX_Reservations_Date_Time] ON [dbo].[Reservations] ([ReservationDate], [ReservationTime]);
    CREATE INDEX [IX_Reservations_Status] ON [dbo].[Reservations] ([Status]);

    PRINT 'Reservations table created successfully.';
END
ELSE
BEGIN
    PRINT 'Reservations table already exists.';
END
GO



















