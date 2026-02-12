-- Migration script to add StripeCustomerId to Users table
-- Run this script on your SQL Server database

IF NOT EXISTS (
    SELECT * FROM sys.columns 
    WHERE object_id = OBJECT_ID(N'[dbo].[Users]') 
    AND name = 'StripeCustomerId'
)
BEGIN
    ALTER TABLE [dbo].[Users]
    ADD [StripeCustomerId] NVARCHAR(200) NULL;
    
    CREATE INDEX [IX_Users_StripeCustomerId] ON [dbo].[Users] ([StripeCustomerId]);
END
GO
