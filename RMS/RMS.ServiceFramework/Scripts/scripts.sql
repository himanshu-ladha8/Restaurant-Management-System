CREATE DATABASE RMS;

USE RMS;

-- 1️ Restaurnat
CREATE TABLE Restaurants(
    RestaurantId INT IDENTITY(1,1) PRIMARY KEY,
    Name VARCHAR(200) NOT NULL,
    Address VARCHAR(300) NULL,
    Phone VARCHAR(20) NULL,
    OpenTime TIME NULL,
    CloseTime TIME NULL,
    IsActive BIT DEFAULT 1,
    CreatedAt DATETIME DEFAULT GETDATE()
);

-- 2️ Users
CREATE TABLE Users(
    UserId INT IDENTITY(1,1) PRIMARY KEY,
    FullName VARCHAR(150) NOT NULL,
    Email VARCHAR(150) NOT NULL UNIQUE,
    PasswordHash VARCHAR(300) NOT NULL,
    UserType VARCHAR(50) NOT NULL,
    RestaurantId INT NULL,
    PhoneNumber VARCHAR(20) NULL,
    CreatedAt DATETIME DEFAULT GETDATE(),
    OTP NVARCHAR(10) NULL,
    FOREIGN KEY (RestaurantId) REFERENCES Restaurants(RestaurantId)
);

-- 3️ Tables
CREATE TABLE Tables(
    TableId INT IDENTITY(1,1) PRIMARY KEY,
    RestaurantId INT NOT NULL,
    TableNumber VARCHAR(50) NOT NULL,
    Capacity INT NOT NULL,
    Status VARCHAR(50) DEFAULT 'Available' NOT NULL,
    QRCodeUrl VARCHAR(300) NULL,
    CreatedAt DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (RestaurantId) REFERENCES Restaurants(RestaurantId)
);

-- 4️ Meals
CREATE TABLE Meals(
    MealId INT IDENTITY(1,1) PRIMARY KEY,
    RestaurantId INT NOT NULL,
    Name VARCHAR(150) NOT NULL,
    Description VARCHAR(500) NULL,
    Price DECIMAL(10,2) NOT NULL,
    Category VARCHAR(100) NULL,
    ImageUrl VARCHAR(300) NULL,
    IsAvailable BIT DEFAULT 1,
    IsBestItem BIT DEFAULT 0,
    CreatedAt DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (RestaurantId) REFERENCES Restaurants(RestaurantId)
);

-- 5️ Orders
CREATE TABLE Orders(
    OrderId INT IDENTITY(1,1) PRIMARY KEY,
    RestaurantId INT NOT NULL,
    TableId INT NOT NULL,
    CustomerId INT NULL,
    OrderStatus VARCHAR(50) DEFAULT 'pending' NOT NULL,
    TotalAmount DECIMAL(10,2) DEFAULT 0,
    CreatedAt DATETIME DEFAULT GETDATE(),
    PaymentStatus VARCHAR(50) DEFAULT 'pending',
    FOREIGN KEY (RestaurantId) REFERENCES Restaurants(RestaurantId),
    FOREIGN KEY (TableId) REFERENCES Tables(TableId),
    FOREIGN KEY (CustomerId) REFERENCES Users(UserId)
);

-- 6️ OrderItems
CREATE TABLE OrderItems(
    OrderItemId INT IDENTITY(1,1) PRIMARY KEY,
    OrderId INT NOT NULL,
    MealId INT NOT NULL,
    Quantity INT NOT NULL,
    Price DECIMAL(10,2) NOT NULL,
    TotalPrice AS (Quantity * Price) PERSISTED,
    FOREIGN KEY (OrderId) REFERENCES Orders(OrderId),
    FOREIGN KEY (MealId) REFERENCES Meals(MealId)
);

-- 7️ Payments
CREATE TABLE Payments(
    PaymentId INT IDENTITY(1,1) PRIMARY KEY,
    OrderId INT NOT NULL,
    Amount DECIMAL(10,2) NOT NULL,
    PaymentMode VARCHAR(50) NOT NULL,
    PaymentStatus VARCHAR(50) DEFAULT 'pending',
    TransactionId VARCHAR(200) NULL,
    CreatedAt DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (OrderId) REFERENCES Orders(OrderId)
);

-- 8️ Reservations
CREATE TABLE Reservations(
    ReservationId INT IDENTITY(1,1) PRIMARY KEY,
    RestaurantId INT NOT NULL,
    TableId INT NOT NULL,
    CustomerId INT NULL,
    ReservationDate DATE NOT NULL,
    ReservationTime TIME NOT NULL,
    Duration INT DEFAULT 60 NOT NULL,
    NumberOfGuests INT NOT NULL,
    Status NVARCHAR(50) DEFAULT 'pending' NOT NULL,
    SuggestedTime TIME NULL,
    Notes NVARCHAR(500) NULL,
    AdminNotes NVARCHAR(500) NULL,
    CustomerPhone NVARCHAR(20) NULL,
    CustomerName NVARCHAR(150) NULL,
    CreatedAt DATETIME DEFAULT GETDATE(),
    UpdatedAt DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (RestaurantId) REFERENCES Restaurants(RestaurantId),
    FOREIGN KEY (TableId) REFERENCES Tables(TableId),
    FOREIGN KEY (CustomerId) REFERENCES Users(UserId)
);

-- 9️ Reviews
CREATE TABLE Reviews(
    ReviewId INT IDENTITY(1,1) PRIMARY KEY,
    RestaurantId INT NOT NULL,
    CustomerId INT NOT NULL,
    Rating INT NOT NULL,
    Comment VARCHAR(500) NULL,
    CreatedAt DATETIME DEFAULT GETDATE(),
    CONSTRAINT CK_Rating CHECK (Rating >= 1 AND Rating <= 5),
    FOREIGN KEY (RestaurantId) REFERENCES Restaurants(RestaurantId),
    FOREIGN KEY (CustomerId) REFERENCES Users(UserId)
);

-- 10 QRCodes
CREATE TABLE QRCodes(
    QRCodeId INT IDENTITY(1,1) PRIMARY KEY,
    TableId INT NOT NULL,
    QRCodeImageUrl VARCHAR(300) NULL,
    CreatedAt DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (TableId) REFERENCES Tables(TableId)
);

-- 1️1 SavedPaymentMethods
CREATE TABLE SavedPaymentMethods(
    SavedPaymentMethodId INT IDENTITY(1,1) PRIMARY KEY,
    CustomerId INT NOT NULL,
    StripePaymentMethodId NVARCHAR(200) NOT NULL,
    CardBrand NVARCHAR(50) NULL,
    Last4 NVARCHAR(10) NULL,
    ExpMonth NVARCHAR(10) NULL,
    ExpYear NVARCHAR(10) NULL,
    CreatedAt DATETIME DEFAULT GETDATE(),
    LastUsedAt DATETIME DEFAULT GETDATE(),
    IsDefault BIT DEFAULT 0 NOT NULL,
    FOREIGN KEY (CustomerId) REFERENCES Users(UserId)
);