CREATE DATABASE elysian_loyalty;

-- Create Customers table
CREATE TABLE IF NOT EXISTS Customers (
    CustomerID SERIAL PRIMARY KEY,
    Name VARCHAR(100) NOT NULL,
    Phone VARCHAR(20) NOT NULL UNIQUE,
    Email VARCHAR(100),
    IDNumber VARCHAR(30),
    Points INTEGER DEFAULT 0,
    DateJoined TIMESTAMP DEFAULT NOW()
);

-- Create PointHistory table
CREATE TABLE IF NOT EXISTS PointHistory (
    PointHistoryID SERIAL PRIMARY KEY,
    CustomerID INTEGER NOT NULL REFERENCES Customers(CustomerID) ON DELETE CASCADE,
    PointsEarned INTEGER NOT NULL,
    DateEarned TIMESTAMP NOT NULL DEFAULT NOW(),
    ExpirationDate TIMESTAMP NOT NULL,
    PointsBalance INTEGER NOT NULL,
    IsRedeemed BOOLEAN DEFAULT FALSE
);

-- Create Transactions table
CREATE TABLE IF NOT EXISTS Transactions (
    TransactionID SERIAL PRIMARY KEY,
    Timestamp TIMESTAMP DEFAULT NOW(),
    CustomerID INTEGER REFERENCES Customers(CustomerID) ON DELETE SET NULL,
    CustomerName VARCHAR(100),
    CustomerPhone VARCHAR(20),
    TransactionType VARCHAR(30) NOT NULL, -- 'Points Earned' or 'Points Redeemed'
    Details TEXT,
    AmountOrPoints INTEGER,
    ChequeNumber VARCHAR(50)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_customers_phone ON Customers(Phone);
CREATE INDEX IF NOT EXISTS idx_pointhistory_customerid ON PointHistory(CustomerID);
CREATE INDEX IF NOT EXISTS idx_transactions_customerid ON Transactions(CustomerID);