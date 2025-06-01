// server.js - Elysian Loyalty Program Backend
const express = require('express');
const fetch = require('node-fetch');
const cors = require('cors');
const pg = require('pg');

const app = express();
const PORT = 3000;

// Database Setup (PostgreSQL)
const { Pool } = pg;
const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'elysian_loyalty',
    password: '@Admin2025',
    port: 5432,
});

// Middleware
app.use(cors());
app.use(express.json());

// Configuration
const API_PREFIX = '/api';
const MAILERSEND_API_KEY = 'mlsn.63d7b44184fbb53deddff9b12ee2245dc135b3ac708d37cbf3c3432f3bd6c80b';
const SENDER_EMAIL = 'noreply@test-vz9dlem1mxn4kj50.mlsender.net';

// Basic route
app.get('/', (req, res) => {
    res.send('MailerSend Email Relay Server is running. Use POST /send-email to send emails.');
});

// Health check endpoint
app.get('/health', async (req, res) => {
    try {
        await pool.query('SELECT 1');
        res.json({ 
            status: 'healthy', 
            database: 'connected',
            timestamp: new Date().toISOString()
        });
    } catch (err) {
        res.status(500).json({ 
            status: 'unhealthy', 
            database: 'disconnected',
            error: err.message,
            timestamp: new Date().toISOString()
        });
    }
});

// === CUSTOMER ROUTES ===

// Register new customer
app.post(`${API_PREFIX}/customers`, async (req, res) => {
    const { name, phone, email, idNumber } = req.body;
    
    if (!name || !phone) {
        return res.status(400).json({ error: "Name and phone are required." });
    }

    try {
        const SQL = 'INSERT INTO Customers(Name, Phone, Email, IDNumber, Points, DateJoined) VALUES($1, $2, $3, $4, 0, NOW()) RETURNING *';
        const result = await pool.query(SQL, [name, phone, email, idNumber]);
        const newCustomer = result.rows[0];
        
        res.status(201).json({ 
            message: "Customer registered", 
            customer: newCustomer 
        });
    } catch (err) {
        console.error('Database error during customer registration:', err);
        
        if (err.code === '23505') { // Unique violation for phone
            return res.status(409).json({ error: "Customer with this phone number already exists." });
        }
        
        res.status(500).json({ error: "Database error during registration." });
    }
});

// Get customer by phone
app.get(`${API_PREFIX}/customers/:phone`, async (req, res) => {
    const { phone } = req.params;
    
    try {
        const SQL = `
            SELECT *, 
                   (SELECT SUM(pb.PointsBalance) 
                    FROM PointHistory pb 
                    WHERE pb.CustomerID = c.CustomerID AND pb.ExpirationDate > NOW()) as current_points 
            FROM Customers c 
            WHERE Phone = $1
        `;
        
        const result = await pool.query(SQL, [phone]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: "Customer not found" });
        }
        
        const customer = result.rows[0];
        
        // Calculate points expiring soon (next 3 weeks)
        customer.expiringSoon = { 
            total: 0, 
            nextExpiryDate: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] 
        };

        // Ensure compatibility: always return a 'points' property
        customer.points = customer.current_points !== null ? Number(customer.current_points) : 0;

        console.log("Backend: Get customer by phone", phone);
        res.json(customer);
    } catch (err) {
        console.error('Database error fetching customer:', err);
        res.status(500).json({ error: "Database error fetching customer." });
    }
});

// === POINTS ROUTES ===

// Add points for a customer
app.post(`${API_PREFIX}/points/add`, async (req, res) => {
    const { phone, amount, facility, chequeNumber } = req.body;
    
    if (!phone || !amount || amount <= 0 || !chequeNumber) {
        return res.status(400).json({ error: "Phone, positive amount, and cheque number are required." });
    }

    const pointsToAdd = Math.floor(amount / 1000); // 1 point per 1000 KSH

    if (pointsToAdd <= 0) {
        return res.status(400).json({ error: "Amount too low to earn points." });
    }

    try {
        // Find customer by phone
        const customerRes = await pool.query(
            "SELECT CustomerID, Name, Email, Points FROM Customers WHERE Phone = $1", 
            [phone]
        );
        
        if (customerRes.rows.length === 0) {
            return res.status(404).json({ error: "Customer not found." });
        }
        
        const customer = customerRes.rows[0];

        // Insert into PointHistory
        const dateEarned = new Date();
        const expirationDate = new Date(dateEarned);
        expirationDate.setMonth(expirationDate.getMonth() + 3);
        
        await pool.query(
            "INSERT INTO PointHistory (CustomerID, PointsEarned, DateEarned, ExpirationDate, PointsBalance) VALUES ($1, $2, $3, $4, $5)",
            [customer.customerid, pointsToAdd, dateEarned, expirationDate, pointsToAdd]
        );

        // Insert into Transactions for revenue tracking
        const details = `Spent KSH ${amount.toLocaleString()} at ${facility}. Cheque: ${chequeNumber}`;
        await pool.query(
            "INSERT INTO Transactions (CustomerID, CustomerName, CustomerPhone, TransactionType, Details, AmountOrPoints, ChequeNumber) VALUES ($1, $2, $3, 'Points Earned', $4, $5, $6)",
            [customer.customerid, customer.name, phone, details, amount, chequeNumber]
        );

        console.log("Backend: Add points", req.body);
        
        res.json({
            message: "Points added successfully",
            customerName: customer.name,
            customerEmail: customer.email,
            pointsAdded: pointsToAdd,
            newTotalPoints: customer.points + pointsToAdd,
            expirationDate: expirationDate.toISOString()
        });

    } catch (err) {
        console.error('Database error adding points:', err);
        res.status(500).json({ error: "Database error adding points." });
    }
});

// Redeem points
app.post(`${API_PREFIX}/points/redeem`, async (req, res) => {
    const { phone, pointsToRedeem, redemptionReason } = req.body;
    if (!phone || !pointsToRedeem || pointsToRedeem <= 0 || !redemptionReason) {
        return res.status(400).json({ error: "Phone, positive points, and reason are required." });
    }
    try {
        // Find customer
        const customerRes = await pool.query(
            "SELECT CustomerID, Name, Email FROM Customers WHERE Phone = $1",
            [phone]
        );
        if (customerRes.rows.length === 0) {
            return res.status(404).json({ error: "Customer not found." });
        }
        const customer = customerRes.rows[0];
        // Calculate available points from PointHistory (unexpired)
        const pointsRes = await pool.query(
            "SELECT COALESCE(SUM(PointsBalance), 0) AS available_points FROM PointHistory WHERE CustomerID = $1 AND ExpirationDate > NOW()",
            [customer.customerid]
        );
        const availablePoints = Number(pointsRes.rows[0].available_points);
        if (availablePoints < pointsToRedeem) {
            return res.status(400).json({ error: "Insufficient points." });
        }
        // FIFO deduction from PointHistory
        let pointsLeftToRedeem = pointsToRedeem;
        const batchesRes = await pool.query(
            "SELECT PointHistoryID, PointsBalance FROM PointHistory WHERE CustomerID = $1 AND ExpirationDate > NOW() AND PointsBalance > 0 ORDER BY DateEarned ASC",
            [customer.customerid]
        );
        for (const batch of batchesRes.rows) {
            if (pointsLeftToRedeem <= 0) break;
            const deduct = Math.min(batch.pointsbalance, pointsLeftToRedeem);
            await pool.query(
                "UPDATE PointHistory SET PointsBalance = PointsBalance - $1 WHERE PointHistoryID = $2",
                [deduct, batch.pointhistoryid]
            );
            pointsLeftToRedeem -= deduct;
        }
        // Insert into Transactions for redemption tracking
        await pool.query(
            "INSERT INTO Transactions (CustomerID, CustomerName, CustomerPhone, TransactionType, Details, AmountOrPoints) VALUES ($1, $2, $3, 'Points Redeemed', $4, $5)",
            [customer.customerid, customer.name, phone, redemptionReason, -pointsToRedeem]
        );
        // Recalculate new total points
        const newPointsRes = await pool.query(
            "SELECT COALESCE(SUM(PointsBalance), 0) AS available_points FROM PointHistory WHERE CustomerID = $1 AND ExpirationDate > NOW()",
            [customer.customerid]
        );
        const newTotalPoints = Number(newPointsRes.rows[0].available_points);
        console.log("Backend: Redeem points", req.body);
        res.json({
            message: "Points redeemed successfully",
            customerName: customer.name,
            customerEmail: customer.email,
            pointsRedeemed: pointsToRedeem,
            newTotalPoints
        });
    } catch (err) {
        console.error('Database error redeeming points:', err);
        res.status(500).json({ error: "Database error redeeming points." });
    }
});

// === DASHBOARD & REPORTING ROUTES ===

// Get dashboard statistics
app.get(`${API_PREFIX}/dashboard-stats`, async (req, res) => {
    try {
        // Get today's date range
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(today.getDate() + 1);

        // Total customers
        const totalCustomersRes = await pool.query("SELECT COUNT(*) FROM Customers");
        const totalCustomers = parseInt(totalCustomersRes.rows[0].count, 10);

        // Points issued today
        const pointsTodayRes = await pool.query(
            `SELECT COALESCE(SUM(PointsEarned), 0) AS today_points FROM PointHistory WHERE DateEarned >= $1 AND DateEarned < $2`,
            [today, tomorrow]
        );
        const todayPointsIssued = parseInt(pointsTodayRes.rows[0].today_points, 10);

        // Revenue today (sum of AmountOrPoints for 'Points Earned' transactions today)
        const revenueTodayRes = await pool.query(
            `SELECT COALESCE(SUM(AmountOrPoints), 0) AS today_revenue FROM Transactions WHERE TransactionType = 'Points Earned' AND Timestamp >= $1 AND Timestamp < $2`,
            [today, tomorrow]
        );
        const todayRevenue = parseInt(revenueTodayRes.rows[0].today_revenue, 10);

        // Recent transactions (last 10)
        const recentTransactionsRes = await pool.query(
            `SELECT TransactionID as transactionid, Timestamp as timestamp, CustomerName as customername, CustomerPhone as customerphone, TransactionType as transactiontype, ChequeNumber as chequenumber, Details as details, AmountOrPoints as amountorpoints FROM Transactions ORDER BY Timestamp DESC LIMIT 10`
        );
        const recentTransactions = recentTransactionsRes.rows;

        res.json({
            totalCustomers,
            todayPointsIssued,
            todayRevenue,
            recentTransactions
        });
    } catch (err) {
        console.error('Database error fetching dashboard stats:', err);
        res.status(500).json({ error: "Database error fetching dashboard stats." });
    }
});

// Export all data
app.get(`${API_PREFIX}/export-data`, async (req, res) => {
    try {
        // TODO: Implement actual database export
        // For now, returning mock data
        
        console.log("Backend: Export data");
        
        const mockData = {
            customers: [{ id: 1, name: "Mock Customer" }], 
            transactions: [], 
            pointHistory: []
        };
        
        res.header('Content-Type', 'application/json');
        res.header('Content-Disposition', 'attachment; filename="elysian_loyalty_data.json"');
        res.send(JSON.stringify(mockData, null, 2));

    } catch (err) {
        console.error('Database error exporting data:', err);
        res.status(500).json({ error: "Database error exporting data." });
    }
});

// Clear all data (DANGEROUS - use with caution)
app.delete(`${API_PREFIX}/clear-all-data`, async (req, res) => {
    try {
        // TODO: Implement actual data clearing
        // await pool.query("TRUNCATE TABLE PointHistory, Transactions, Customers RESTART IDENTITY CASCADE");
        
        console.log("Backend: Clear all data");
        res.json({ message: "All data cleared successfully." });
    } catch (err) {
        console.error('Database error clearing data:', err);
        res.status(500).json({ error: "Database error clearing data." });
    }
});

// === EMAIL ROUTES ===

// Send email endpoint
app.post('/send-email', async (req, res) => {
    const { toEmail, subject, htmlContent } = req.body;

    if (!toEmail || !subject || !htmlContent) {
        return res.status(400).json({ 
            error: 'Missing required fields: toEmail, subject, or htmlContent.' 
        });
    }

    const emailData = {
        from: { email: SENDER_EMAIL },
        to: [{ email: toEmail }],
        subject: subject,
        html: htmlContent
    };

    try {
        const response = await fetch('https://api.mailersend.com/v1/email', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${MAILERSEND_API_KEY}`
            },
            body: JSON.stringify(emailData)
        });

        if (response.ok) {
            const data = await response.json();
            console.log('Email sent successfully via MailerSend:', data);
            res.status(200).json({ 
                message: 'Email sent successfully!', 
                mailerSendResponse: data 
            });
        } else {
            const errorData = await response.json();
            console.error('Failed to send email via MailerSend API:', response.status, errorData);
            res.status(500).json({ 
                error: 'Failed to send email via external service.', 
                mailerSendError: errorData 
            });
        }
    } catch (error) {
        console.error('Error during MailerSend API request:', error);
        res.status(500).json({ 
            error: 'Internal server error while trying to send email.', 
            details: error.message 
        });
    }
});

// Graceful shutdown
process.on('SIGTERM', async () => {
    console.log('SIGTERM received. Shutting down gracefully...');
    await pool.end();
    process.exit(0);
});

process.on('SIGINT', async () => {
    console.log('SIGINT received. Shutting down gracefully...');
    await pool.end();
    process.exit(0);
});

// Start the server
app.listen(PORT, () => {
    console.log(`Loyalty Program Backend running on http://localhost:${PORT}`);
});

module.exports = app;
