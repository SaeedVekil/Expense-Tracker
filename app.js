document.addEventListener('DOMContentLoaded', function() {
    // Update current date
    const currentDate = new Date();
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    document.getElementById('currentDate').textContent = currentDate.toLocaleDateString('en-US', options);

    // Load expenses
    loadExpenses();

    // Form submission
    document.getElementById('expenseForm').addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const title = document.getElementById('title').value;
        const amount = parseFloat(document.getElementById('amount').value);
        const category = document.getElementById('category').value;
        const record_type = document.getElementById('record_type').value;
        
        try {
            const response = await fetch('api.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    title,
                    amount,
                    category,
                    record_type
                })
            });
            
            const data = await response.json();
            
            if (data.success) {
                // Clear form
                document.getElementById('expenseForm').reset();
                // Reload expenses
                loadExpenses();
                // Show success message
                showNotification('Record added successfully!', 'success');
            } else {
                showNotification('Error adding record: ' + data.message, 'error');
            }
        } catch (error) {
            showNotification('Error: ' + error.message, 'error');
        }
    });

    // Filter buttons
    document.getElementById('filterAll').addEventListener('click', () => filterExpenses('all'));
    document.getElementById('filterExpense').addEventListener('click', () => filterExpenses('expense'));
    document.getElementById('filterPortfolio').addEventListener('click', () => filterExpenses('portfolio'));

    // Export button
    document.getElementById('exportBtn').addEventListener('click', exportData);
});

async function loadExpenses() {
    try {
        const response = await fetch('api.php');
        const data = await response.json();
        
        if (data.success) {
            updateStats(data.stats);
            displayExpenses(data.expenses);
        }
    } catch (error) {
        showNotification('Error loading data: ' + error.message, 'error');
    }
}

function updateStats(stats) {
    document.getElementById('total').textContent = '€' + stats.total;
    document.getElementById('avg').textContent = '€' + stats.avg;
    document.getElementById('top').textContent = stats.top;
    document.getElementById('portfolio').textContent = '€' + stats.portfolio;
    
    // Calculate monthly total
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    // This would need server-side calculation for real implementation
    document.getElementById('monthTotal').textContent = '€' + (parseFloat(stats.total) * 0.3).toFixed(2); // Placeholder
}

function displayExpenses(expenses) {
    const recentDiv = document.getElementById('recent');
    
    if (expenses.length === 0) {
        recentDiv.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-receipt"></i>
                <p>No records yet. Add your first expense or portfolio entry!</p>
            </div>
        `;
        document.getElementById('recordCount').textContent = '0';
        return;
    }
    
    let html = '';
    expenses.forEach(expense => {
        const date = new Date(expense.created_at);
        const formattedDate = date.toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
        
        const icon = getCategoryIcon(expense.category);
        
        html += `
            <div class="expense-item ${expense.record_type}" data-id="${expense.id}">
                <div class="expense-info">
                    <div class="expense-icon">
                        <i class="${icon}"></i>
                    </div>
                    <div class="expense-details">
                        <div class="expense-title">${expense.title}</div>
                        <div class="expense-meta">
                            <span><i class="fas fa-tag"></i> ${expense.category}</span>
                            <span><i class="fas fa-exchange-alt"></i> ${expense.record_type.charAt(0).toUpperCase() + expense.record_type.slice(1)}</span>
                        </div>
                    </div>
                </div>
                <div class="expense-amount">€${parseFloat(expense.amount).toFixed(2)}</div>
                <div class="expense-date">${formattedDate}</div>
                <button class="delete-btn" onclick="deleteExpense(${expense.id})">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;
    });
    
    recentDiv.innerHTML = html;
    document.getElementById('recordCount').textContent = expenses.length;
}

function getCategoryIcon(category) {
    const icons = {
        'Transportation': 'fas fa-bus',
        'Food & Dining': 'fas fa-utensils',
        'Shopping': 'fas fa-shopping-bag',
        'Entertainment': 'fas fa-film',
        'Bills': 'fas fa-file-invoice',
        'Healthcare': 'fas fa-heartbeat',
        'Education': 'fas fa-graduation-cap',
        'Investment': 'fas fa-chart-line',
        'Other': 'fas fa-box'
    };
    return icons[category] || 'fas fa-box';
}

function filterExpenses(type) {
    // Update active button
    document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    
    // Show/hide expenses based on type
    document.querySelectorAll('.expense-item').forEach(item => {
        if (type === 'all' || item.classList.contains(type)) {
            item.style.display = 'flex';
        } else {
            item.style.display = 'none';
        }
    });
}

async function deleteExpense(id) {
    if (!confirm('Are you sure you want to delete this record?')) return;
    
    try {
        const response = await fetch('api.php', {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ id })
        });
        
        const data = await response.json();
        
        if (data.success) {
            // Remove from UI
            document.querySelector(`.expense-item[data-id="${id}"]`)?.remove();
            // Reload stats
            loadExpenses();
            showNotification('Record deleted successfully!', 'success');
        } else {
            showNotification('Error deleting record: ' + data.message, 'error');
        }
    } catch (error) {
        showNotification('Error: ' + error.message, 'error');
    }
}

function exportData() {
    // This is a simple CSV export. In a real app, you'd want to implement proper server-side export
    const rows = document.querySelectorAll('.expense-item');
    if (rows.length === 0) {
        showNotification('No data to export', 'warning');
        return;
    }
    
    let csv = 'Title,Amount,Category,Type,Date\n';
    rows.forEach(row => {
        const title = row.querySelector('.expense-title').textContent;
        const amount = row.querySelector('.expense-amount').textContent.replace('€', '');
        const category = row.querySelector('.expense-meta span:first-child').textContent.replace('📌 ', '');
        const type = row.querySelector('.expense-meta span:last-child').textContent.replace('🔀 ', '');
        const date = row.querySelector('.expense-date').textContent;
        
        csv += `"${title}",${amount},"${category}","${type}","${date}"\n`;
    });
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `expenses-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    
    showNotification('Data exported successfully!', 'success');
}

function showNotification(message, type) {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'}"></i>
        <span>${message}</span>
    `;
    
    // Add to body
    document.body.appendChild(notification);
    
    // Show notification
    setTimeout(() => notification.classList.add('show'), 10);
    
    // Remove after 3 seconds
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Add notification styles dynamically
const style = document.createElement('style');
style.textContent = `
    .notification {
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 25px;
        border-radius: 10px;
        color: white;
        display: flex;
        align-items: center;
        gap: 10px;
        transform: translateX(100%);
        transition: transform 0.3s ease;
        z-index: 1000;
        box-shadow: 0 5px 15px rgba(0,0,0,0.2);
    }
    
    .notification.show {
        transform: translateX(0);
    }
    
    .notification.success {
        background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);
    }
    
    .notification.error {
        background: linear-gradient(135deg, #ff6b6b 0%, #ffa8a8 100%);
    }
    
    .notification.warning {
        background: linear-gradient(135deg, #ffd93d 0%, #ff6b6b 100%);
        color: #333;
    }
`;
document.head.appendChild(style);