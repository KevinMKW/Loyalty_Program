const API_BASE_URL = 'http://localhost:3000/api'; // Your backend API URL

// --- Custom Modal Functions ---
let confirmCallback = null;
function showAlertModal(title, message) { /* ... (no changes to modal logic itself) ... */ }
function showConfirm(id, message, callback) { /* ... (no changes to modal logic itself) ... */ }
function hideModal() { /* ... (no changes to modal logic itself) ... */ }

/**
 * Loads initial data by fetching from the backend.
 */
async function loadInitialData() {
    // This function would now fetch initial data needed, e.g., dashboard stats
    // For simplicity, we'll focus on function modifications for now.
    // Example:
    // await updateDashboard(); // Fetch dashboard data on load
    // await checkAllPointsExpiration(); // Trigger server-side check or fetch affected data
    console.log("loadInitialData: Called. In a full SQL setup, this would fetch from backend.");
    // No more localStorage loading here.
    // Initial dashboard update will fetch its own data.
        if (document.getElementById('staff').classList.contains('active')) {
        updateDashboard();
    }
}

/**
 * Calculates the expiration date for points (3 months from earned date).
 */
function calculateExpirationDate(dateEarned) {
    const expirationDate = new Date(dateEarned);
    expirationDate.setMonth(expirationDate.getMonth() + 3);
    return expirationDate;
}

/**
 * NOTE: Point expiration ideally should be handled by the backend (e.g., a scheduled job or during lookups).
 * This frontend function would now likely trigger a backend process or rely on the backend to manage it.
 */
async function checkAllPointsExpiration() {
    console.log("checkAllPointsExpiration: This should ideally be a backend process.");
    try {
        // Example: const response = await fetch(`${API_BASE_URL}/points/check-expirations`, { method: 'POST' });
        // if (!response.ok) throw new Error('Failed to trigger point expiration check');
        // const result = await response.json();
        // showAlertModal('Point Expiration', result.message || 'Expiration check initiated.');
        // updateDashboard(); // Refresh dashboard data
    } catch (error) {
        console.error("Error during point expiration check:", error);
        // showAlertModal('Error', 'Could not process point expirations: ' + error.message);
    }
}


async function checkCustomerPointsExpiration(customerPhone) {
    console.log(`checkCustomerPointsExpiration for ${customerPhone}: This logic is now mainly on the backend during customer lookup or operations.`);
    // The backend should return up-to-date point info, including any recent expirations.
    // The frontend might display messages about expiring points if the backend API provides that info.
    // For example, the /customers/:phone endpoint could return { ..., points: X, expiringSoon: Y }
}


function showTab(tabName, clickedButton) {
    const tabs = document.querySelectorAll('.tab-content');
    tabs.forEach(tab => tab.classList.remove('active'));
    const navTabs = document.querySelectorAll('.nav-tab');
    navTabs.forEach(tab => tab.classList.remove('active'));
    document.getElementById(tabName).classList.add('active');
    clickedButton.classList.add('active');
    
    if (tabName === 'staff') {
        updateDashboard();
    }
    const allAlerts = document.querySelectorAll('.alert');
    allAlerts.forEach(alert => alert.style.display = 'none');
}

document.getElementById('registrationForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const customerData = {
        name: document.getElementById('customerName').value,
        phone: document.getElementById('customerPhone').value,
        email: document.getElementById('customerEmail').value,
        idNumber: document.getElementById('customerID').value
    };
    
    try {
        const response = await fetch(`${API_BASE_URL}/customers`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(customerData)
        });
        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.error || 'Failed to register customer.');
        }
        
        document.getElementById('registrationForm').reset();
        showAlert('registrationAlert', `Customer ${result.customer.name} registered successfully! Loyalty number: ${result.customer.phone}`, 'success');
        updateDashboard(); // Refresh dashboard if it's relevant
    } catch (error) {
        console.error("Registration error:", error);
        showAlert('registrationAlert', error.message, 'error');
    }
});

async function lookupCustomer() {
    const phone = document.getElementById('searchPhone').value;
    const customerDetailsDiv = document.getElementById('customerDetails');
    const expiringPointsInfoDiv = document.getElementById('expiringPointsInfo');
    
    if (!phone) {
        showAlert('lookupAlert', 'Please enter a phone number.', 'info');
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/customers/${phone}`);
        if (response.status === 404) {
            customerDetailsDiv.style.display = 'none';
            showAlert('lookupAlert', 'Customer not found. Please check the phone number.', 'error');
            return;
        }
        if (!response.ok) {
            const errData = await response.json();
            throw new Error(errData.error || 'Failed to fetch customer details.');
        }
        
        const customer = await response.json();
        
        document.getElementById('detailName').textContent = customer.name;
        document.getElementById('detailPhone').textContent = customer.phone;
        document.getElementById('detailEmail').textContent = customer.email || 'Not provided';
        document.getElementById('detailDate').textContent = new Date(customer.datejoined).toLocaleDateString();
        document.getElementById('detailPoints').textContent = customer.points;
        
        // Backend should provide info on points expiring soon
        if (customer.expiringSoon && customer.expiringSoon.total > 0) {
            expiringPointsInfoDiv.textContent = `${customer.expiringSoon.total} points will expire by ${new Date(customer.expiringSoon.nextExpiryDate).toLocaleDateString()}!`;
            expiringPointsInfoDiv.style.display = 'block';
        } else {
            expiringPointsInfoDiv.style.display = 'none';
        }

        customerDetailsDiv.style.display = 'block';
        showAlert('lookupAlert', 'Customer found!', 'success');
    } catch (error) {
        console.error("Lookup error:", error);
        customerDetailsDiv.style.display = 'none';
        showAlert('lookupAlert', error.message, 'error');
    }
}

async function addPoints(facility) {
    const phoneInput = document.getElementById(facility + 'Phone');
    const amountInput = document.getElementById(facility + 'Amount');
    const chequeInput = document.getElementById(facility + 'Cheque'); // New cheque input
    
    const pointsData = {
        phone: phoneInput.value,
        amount: parseFloat(amountInput.value),
        facility: facility.charAt(0).toUpperCase() + facility.slice(1),
        chequeNumber: chequeInput.value // Include cheque number
    };
    
    if (!pointsData.phone || isNaN(pointsData.amount) || pointsData.amount <= 0 || !pointsData.chequeNumber) {
        showAlert('pointsAlert', 'Please enter phone, a valid positive amount, and cheque/receipt number.', 'error');
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/points/add`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(pointsData)
        });
        const result = await response.json();

        if (!response.ok) {
                throw new Error(result.error || 'Failed to add points.');
        }
        
        phoneInput.value = '';
        amountInput.value = '';
        chequeInput.value = ''; // Clear cheque input
        
        showAlert('pointsAlert', `${result.pointsAdded} points added to ${result.customerName}. Total points: ${result.newTotalPoints}`, 'success');
        
        if(result.customerEmail) { // Check if email exists before attempting to send
            sendEmail(result.customerEmail, 'Points Earned - Elysian Resort Loyalty Program',
                `Dear ${result.customerName},<br><br>Congratulations! You have earned ${result.pointsAdded} loyalty points for your recent transaction (Receipt: ${pointsData.chequeNumber}) at Elysian Resort.<br><br>Your new total points: ${result.newTotalPoints}.<br><br>These points will expire on ${new Date(result.expirationDate).toLocaleDateString()}.<br><br>Thank you for being a valued member of Elysian Resort Loyalty Program.`);
        }
        updateDashboard();
    } catch (error) {
        console.error("Add points error:", error);
        showAlert('pointsAlert', error.message, 'error');
    }
}

async function searchCustomerForRedemption() {
    const phone = document.getElementById('redeemPhone').value;
    const redeemCustomerDetailsDiv = document.getElementById('redeemCustomerDetails');
    const redeemExpiringPointsInfoDiv = document.getElementById('redeemExpiringPointsInfo');

    if (!phone) {
        showAlert('redeemAlert', 'Please enter a phone number.', 'info');
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/customers/${phone}`); // Re-use customer lookup
            if (response.status === 404) {
            redeemCustomerDetailsDiv.style.display = 'none';
            showAlert('redeemAlert', 'Customer not found.', 'error');
            return;
        }
        if (!response.ok) {
            const errData = await response.json();
            throw new Error(errData.error || 'Failed to fetch customer for redemption.');
        }
        
        const customer = await response.json();
        
        document.getElementById('redeemDetailName').textContent = customer.name;
        document.getElementById('redeemDetailPoints').textContent = customer.points;

        if (customer.expiringSoon && customer.expiringSoon.total > 0) {
            redeemExpiringPointsInfoDiv.textContent = `${customer.expiringSoon.total} points will expire by ${new Date(customer.expiringSoon.nextExpiryDate).toLocaleDateString()}!`;
            redeemExpiringPointsInfoDiv.style.display = 'block';
        } else {
            redeemExpiringPointsInfoDiv.style.display = 'none';
        }

        redeemCustomerDetailsDiv.style.display = 'block';
        showAlert('redeemAlert', 'Customer found! Ready to redeem points.', 'success');
    } catch (error) {
        console.error("Search for redemption error:", error);
        redeemCustomerDetailsDiv.style.display = 'none';
        showAlert('redeemAlert', error.message, 'error');
    }
}

async function redeemPoints() {
    const redeemData = {
        phone: document.getElementById('redeemPhone').value,
        pointsToRedeem: parseInt(document.getElementById('pointsToRedeem').value),
        redemptionReason: document.getElementById('redemptionReason').value
    };

    if (!redeemData.phone || isNaN(redeemData.pointsToRedeem) || redeemData.pointsToRedeem <= 0) {
        showAlert('redeemAlert', 'Please enter phone and a positive number of points.', 'error');
        return;
    }
    if (!redeemData.redemptionReason) {
        showAlert('redeemAlert', 'Please provide a reason for redemption.', 'error');
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/points/redeem`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(redeemData)
        });
        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.error || 'Failed to redeem points.');
        }
        
        document.getElementById('redeemDetailPoints').textContent = result.newTotalPoints;
        document.getElementById('pointsToRedeem').value = '';
        document.getElementById('redemptionReason').value = '';
        showAlert('redeemAlert', `${result.pointsRedeemed} points redeemed successfully for ${result.customerName}! Remaining points: ${result.newTotalPoints}`, 'success');
        
        if(result.customerEmail){
            sendEmail(result.customerEmail, 'Points Redeemed - Elysian Resort Loyalty Program',
                `Dear ${result.customerName},<br><br>Your ${result.pointsRedeemed} loyalty points have been successfully redeemed for "${redeemData.redemptionReason}".<br><br>Your new total points: ${result.newTotalPoints}.<br><br>Thank you for being a valued member of Elysian Resort Loyalty Program.`);
        }
        updateDashboard();
    } catch (error) {
        console.error("Redeem points error:", error);
        showAlert('redeemAlert', error.message, 'error');
    }
}

async function updateDashboard() {
    try {
        const response = await fetch(`${API_BASE_URL}/dashboard-stats`);
        if (!response.ok) throw new Error('Failed to fetch dashboard stats.');
        const stats = await response.json();

        document.getElementById('totalCustomers').textContent = stats.totalCustomers;
        document.getElementById('todayPoints').textContent = stats.todayPointsIssued;
        document.getElementById('todayRevenue').textContent = stats.todayRevenue.toLocaleString();
        
        const tbody = document.getElementById('transactionBody');
        tbody.innerHTML = '';
        stats.recentTransactions.forEach(transaction => {
            const row = tbody.insertRow();
            row.innerHTML = `
                <td>${new Date(transaction.timestamp).toLocaleString()}</td>
                <td>${transaction.customername || transaction.customerphone}</td>
                <td>${transaction.transactiontype}</td>
                <td>${transaction.chequenumber || 'N/A'}</td>
                <td>${transaction.details}</td>
                <td>${transaction.amountorpoints}</td>
            `;
        });
    } catch (error) {
        console.error("Dashboard update error:", error);
        showAlertModal('Dashboard Error', 'Could not load dashboard data: ' + error.message);
    }
}

function showAlert(alertId, message, type) {
    const alert = document.getElementById(alertId);
    alert.textContent = message;
    alert.className = `alert ${type}`;
    alert.style.display = 'block';
    
    setTimeout(() => {
        alert.style.display = 'none';
    }, 5000);
}

async function exportData() {
    try {
        // This will now hit a backend endpoint that generates and sends the file
        window.location.href = `${API_BASE_URL}/export-data`; // Triggers download
        showAlertModal('Data Export', 'Data export initiated. Your download should begin shortly.');
    } catch (error) {
        console.error("Export error:", error);
        showAlertModal('Export Error', 'Could not export data: ' + error.message);
    }
}

async function clearAllData() {
        try {
        const response = await fetch(`${API_BASE_URL}/clear-all-data`, { method: 'DELETE' });
        if (!response.ok) {
            const errData = await response.json();
            throw new Error(errData.error || 'Failed to clear data.');
        }
        const result = await response.json();
        showAlertModal('Data Cleared', result.message || 'All data cleared successfully.');
        updateDashboard(); // Refresh views
    } catch (error) {
        console.error("Clear data error:", error);
        showAlertModal('Error Clearing Data', error.message);
    }
}

async function sendEmail(toEmail, subject, htmlContent) {
        if (!toEmail) {
        console.warn("Recipient email is missing. Email not sent for subject:", subject);
        // showAlertModal('Email Info', 'Recipient email address is missing for this customer. Email not sent.');
        return; // Silently fail if no email, or handle as preferred
    }
    try {
        const response = await fetch('http://localhost:3000/send-email', { // Assuming email server is separate
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ toEmail, subject, htmlContent })
        });
        if (!response.ok) {
            const errorData = await response.json();
            console.error(`Failed to send email via backend for ${toEmail}:`, response.status, errorData);
            // Don't show modal for every email, just log it. User action modals are more important.
            // showAlertModal('Email Failed', `Failed to send email to ${toEmail}. Backend Status: ${response.status}.`);
        } else {
                console.log(`Email request sent to backend successfully for ${toEmail}`);
        }
    } catch (error) {
        console.error(`Error connecting to email backend for ${toEmail}:`, error);
        // showAlertModal('Email Error', `Could not connect to email service. Error: ${error.message}`);
    }
}

document.addEventListener('DOMContentLoaded', loadInitialData);