document.addEventListener('DOMContentLoaded', function() {
    // Set current year in footer
    document.getElementById('current-year').textContent = new Date().getFullYear();
    
    // Initialize database
    initDB().then(() => {
        loadDashboardData();
        loadActiveJobs();
    });
    
    // Tab functionality
    const tabButtons = document.querySelectorAll('.tab-btn');
    tabButtons.forEach(button => {
        button.addEventListener('click', function() {
            // Remove active class from all buttons and content
            tabButtons.forEach(btn => btn.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(content => {
                content.classList.remove('active');
            });
            
            // Add active class to clicked button and corresponding content
            this.classList.add('active');
            const tabId = this.getAttribute('data-tab');
            document.getElementById(tabId).classList.add('active');
            
            // Load data for the active tab
            switch(tabId) {
                case 'dashboard':
                    loadDashboardData();
                    break;
                case 'return':
                    loadActiveJobs();
                    break;
                case 'reports':
                    // Default to current month
                    const currentDate = new Date();
                    const currentMonth = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
                    document.getElementById('report-month').value = currentMonth;
                    break;
            }
        });
    });
    
    // Issue Items Form
    const issueForm = document.getElementById('issue-form');
    issueForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const jobId = document.getElementById('job-id').value;
        const personName = document.getElementById('person-name').value;
        const task = document.getElementById('task').value;
        const date = document.getElementById('date').value;
        
        // Collect all items
        const itemRows = document.querySelectorAll('.item-row');
        const items = [];
        
        itemRows.forEach(row => {
            const itemName = row.querySelector('.item-name').value;
            const quantityInput = row.querySelector('.item-quantity');
            const unitInput = row.querySelector('.item-unit');
            
            if (itemName && quantityInput.value && unitInput.value) {
                items.push({
                    itemName: itemName,
                    quantity: parseInt(quantityInput.value),
                    unit: unitInput.value
                });
            }
        });
        
        if (items.length === 0) {
            alert('Please add at least one item');
            return;
        }
        
        // Issue items
        issueItems(jobId, personName, items, task, date)
            .then(() => {
                alert('Items issued successfully!');
                issueForm.reset();
                // Reset to one empty item row
                const itemsContainer = document.querySelector('.items-container');
                itemsContainer.innerHTML = '';
                itemsContainer.appendChild(createItemRow());
                
                // Update dashboard
                loadDashboardData();
                loadActiveJobs();
            })
            .catch(error => {
                console.error('Error issuing items:', error);
                alert('Error issuing items: ' + error.message);
            });
    });
    
    // Add another item row
    document.getElementById('add-item-btn').addEventListener('click', function() {
        const itemsContainer = document.querySelector('.items-container');
        itemsContainer.appendChild(createItemRow());
    });
    
    // Search active jobs
    document.getElementById('search-btn').addEventListener('click', function() {
        const searchTerm = document.getElementById('job-search').value.toLowerCase();
        filterActiveJobs(searchTerm);
    });
    
    // Return items modal
    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('return-btn')) {
            const jobId = e.target.getAttribute('data-job-id');
            openReturnModal(jobId);
        }
    });
    
    // Close modal
    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('close-modal') || e.target.classList.contains('modal')) {
            closeAllModals();
        }
    });
    
    // Return form submission
    const returnForm = document.getElementById('return-form');
    returnForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const jobId = document.getElementById('modal-job-id').textContent;
        const returnItems = [];
        
        document.querySelectorAll('#return-items-list .return-item').forEach(item => {
            const returnedQty = parseInt(item.querySelector('.returned-qty').value);
            const originalQty = parseInt(item.querySelector('.original-qty').textContent);
            
            returnItems.push({
                itemName: item.querySelector('.item-name').textContent,
                returnedQty: returnedQty,
                originalQty: originalQty,
                unit: item.querySelector('.item-unit').textContent
            });
        });
        
        returnItemsToInventory(jobId, returnItems)
            .then(() => {
                alert('Items returned successfully!');
                closeAllModals();
                loadDashboardData();
                loadActiveJobs();
            })
            .catch(error => {
                console.error('Error returning items:', error);
                alert('Error returning items: ' + error.message);
            });
    });
    
    // Generate report
    document.getElementById('generate-report').addEventListener('click', function() {
        const month = document.getElementById('report-month').value;
        generateMonthlyReport(month);
    });
});

// Helper function to create an item row
function createItemRow() {
    const row = document.createElement('div');
    row.className = 'item-row';
    
    const nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameInput.className = 'item-name';
    nameInput.placeholder = 'Item Name';
    nameInput.required = true;
    
    const quantityInput = document.createElement('input');
    quantityInput.type = 'number';
    quantityInput.className = 'item-quantity';
    quantityInput.min = '1';
    quantityInput.placeholder = 'Qty';
    quantityInput.required = true;
    
    const unitInput = document.createElement('input');
    unitInput.type = 'text';
    unitInput.className = 'item-unit';
    unitInput.placeholder = 'Unit (kg, liters, etc.)';
    unitInput.required = true;
    
    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.className = 'remove-item-btn';
    removeBtn.innerHTML = '<i class="fas fa-times"></i>';
    removeBtn.addEventListener('click', function() {
        row.remove();
    });
    
    row.appendChild(nameInput);
    row.appendChild(quantityInput);
    row.appendChild(unitInput);
    row.appendChild(removeBtn);
    
    return row;
}

// Load dashboard data
function loadDashboardData() {
    Promise.all([
        getActiveJobsCount(),
        getTotalCheckedOutItems(),
        getRecentActivityCount(),
        getRecentActivity()
    ]).then(([activeJobs, checkedOut, recentActivities, activity]) => {
        document.getElementById('active-jobs').textContent = activeJobs;
        document.getElementById('checked-out').textContent = checkedOut;
        document.getElementById('recent-activities').textContent = recentActivities;
        
        const activityTable = document.querySelector('#activity-table tbody');
        activityTable.innerHTML = '';
        
        activity.forEach(entry => {
            const row = document.createElement('tr');
            
            const dateCell = document.createElement('td');
            dateCell.textContent = new Date(entry.date).toLocaleDateString();
            row.appendChild(dateCell);
            
            const jobCell = document.createElement('td');
            jobCell.textContent = entry.jobId;
            row.appendChild(jobCell);
            
            const personCell = document.createElement('td');
            personCell.textContent = entry.personName;
            row.appendChild(personCell);
            
            const actionCell = document.createElement('td');
            actionCell.textContent = entry.action === 'issue' ? 'Issued' : 'Returned';
            actionCell.className = entry.action === 'issue' ? 'text-success' : 'text-info';
            row.appendChild(actionCell);
            
            activityTable.appendChild(row);
        });
    });
}

// Load active jobs
function loadActiveJobs() {
    getActiveJobs().then(jobs => {
        const tableBody = document.querySelector('#active-jobs-table tbody');
        tableBody.innerHTML = '';
        
        jobs.forEach(job => {
            const row = document.createElement('tr');
            
            const jobIdCell = document.createElement('td');
            jobIdCell.textContent = job.jobId;
            row.appendChild(jobIdCell);
            
            const personCell = document.createElement('td');
            personCell.textContent = job.personName;
            row.appendChild(personCell);
            
            const dateCell = document.createElement('td');
            dateCell.textContent = new Date(job.date).toLocaleDateString();
            row.appendChild(dateCell);
            
            const itemsCell = document.createElement('td');
            const itemsList = document.createElement('ul');
            job.items.forEach(item => {
                const li = document.createElement('li');
                li.textContent = `${item.quantity} ${item.unit} of ${item.name}`;
                itemsList.appendChild(li);
            });
            itemsCell.appendChild(itemsList);
            row.appendChild(itemsCell);
            
            const actionCell = document.createElement('td');
            const returnBtn = document.createElement('button');
            returnBtn.className = 'btn-secondary return-btn';
            returnBtn.setAttribute('data-job-id', job.jobId);
            returnBtn.textContent = 'Return';
            actionCell.appendChild(returnBtn);
            row.appendChild(actionCell);
            
            tableBody.appendChild(row);
        });
    });
}

// Filter active jobs
function filterActiveJobs(searchTerm) {
    const rows = document.querySelectorAll('#active-jobs-table tbody tr');
    
    rows.forEach(row => {
        const jobId = row.cells[0].textContent.toLowerCase();
        const personName = row.cells[1].textContent.toLowerCase();
        
        if (jobId.includes(searchTerm) || personName.includes(searchTerm)) {
            row.style.display = '';
        } else {
            row.style.display = 'none';
        }
    });
}

// Open return modal
function openReturnModal(jobId) {
    getJobDetails(jobId).then(job => {
        document.getElementById('modal-job-id').textContent = jobId;
        
        const itemsList = document.getElementById('return-items-list');
        itemsList.innerHTML = '';
        
        job.items.forEach(item => {
            const itemDiv = document.createElement('div');
            itemDiv.className = 'return-item';
            
            const itemName = document.createElement('h4');
            itemName.className = 'item-name';
            itemName.textContent = item.name;
            itemDiv.appendChild(itemName);
            
            const unitInfo = document.createElement('p');
            unitInfo.className = 'item-unit';
            unitInfo.textContent = `Unit: ${item.unit}`;
            itemDiv.appendChild(unitInfo);
            
            const originalQtyLabel = document.createElement('p');
            originalQtyLabel.textContent = `Originally issued: `;
            
            const originalQtySpan = document.createElement('span');
            originalQtySpan.className = 'original-qty';
            originalQtySpan.textContent = item.quantity;
            originalQtyLabel.appendChild(originalQtySpan);
            itemDiv.appendChild(originalQtyLabel);
            
            const returnQtyGroup = document.createElement('div');
            returnQtyGroup.className = 'form-group';
            
            const returnQtyLabel = document.createElement('label');
            returnQtyLabel.textContent = 'Quantity to return:';
            returnQtyGroup.appendChild(returnQtyLabel);
            
            const returnQtyInput = document.createElement('input');
            returnQtyInput.type = 'number';
            returnQtyInput.className = 'returned-qty';
            returnQtyInput.min = '0';
            returnQtyInput.max = item.quantity;
            returnQtyInput.value = item.quantity;
            returnQtyInput.required = true;
            returnQtyGroup.appendChild(returnQtyInput);
            
            itemDiv.appendChild(returnQtyGroup);
            itemsList.appendChild(itemDiv);
        });
        
        document.getElementById('return-modal').style.display = 'block';
    });
}

// Close all modals
function closeAllModals() {
    document.querySelectorAll('.modal').forEach(modal => {
        modal.style.display = 'none';
    });
}

// Generate monthly report
function generateMonthlyReport(month) {
    getMonthlyReport(month).then(report => {
        // Update summary
        const summaryStats = document.getElementById('summary-stats');
        summaryStats.innerHTML = '';
        
        const summaryDiv = document.createElement('div');
        summaryDiv.className = 'report-summary-stats';
        
        const issuedStat = document.createElement('p');
        issuedStat.innerHTML = `<strong>Total Items Issued:</strong> ${report.summary.totalIssued}`;
        summaryDiv.appendChild(issuedStat);
        
        const returnedStat = document.createElement('p');
        returnedStat.innerHTML = `<strong>Total Items Returned:</strong> ${report.summary.totalReturned}`;
        summaryDiv.appendChild(returnedStat);
        
        const netStat = document.createElement('p');
        netStat.innerHTML = `<strong>Net Change:</strong> ${report.summary.netChange > 0 ? '+' : ''}${report.summary.netChange}`;
        summaryDiv.appendChild(netStat);
        
        summaryStats.appendChild(summaryDiv);
        
        // Update detailed transactions
        const reportTable = document.querySelector('#report-table tbody');
        reportTable.innerHTML = '';
        
        report.transactions.forEach(transaction => {
            const row = document.createElement('tr');
            
            const dateCell = document.createElement('td');
            dateCell.textContent = new Date(transaction.date).toLocaleDateString();
            row.appendChild(dateCell);
            
            const jobCell = document.createElement('td');
            jobCell.textContent = transaction.jobId;
            row.appendChild(jobCell);
            
            const personCell = document.createElement('td');
            personCell.textContent = transaction.personName;
            row.appendChild(personCell);
            
            const itemCell = document.createElement('td');
            itemCell.textContent = transaction.itemName;
            row.appendChild(itemCell);
            
            const qtyCell = document.createElement('td');
            qtyCell.textContent = transaction.quantity;
            row.appendChild(qtyCell);
            
            const actionCell = document.createElement('td');
            actionCell.textContent = transaction.action === 'issue' ? 'Issued' : 'Returned';
            actionCell.className = transaction.action === 'issue' ? 'text-success' : 'text-info';
            row.appendChild(actionCell);
            
            reportTable.appendChild(row);
        });
    });
}