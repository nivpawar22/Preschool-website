// ============================================================
// EduTrack - Accounting Admin Module
// Role: accounting
// ============================================================

// ---- Dashboard ----
function renderAccDashboard() {
  const user = Session.current();
  if (!user || user.role !== 'accounting') { renderLogin(); return; }

  const data = DB.get();
  const expenses = DB.getExpenses();
  const purchaseOrders = DB.getPurchaseOrders();

  // Calculate monthly expenses
  const now = new Date();
  const thisMonth = now.toISOString().slice(0, 7); // YYYY-MM
  const thisYear = now.getFullYear().toString();

  const monthlyExpenses = expenses.filter(e => (e.date || '').startsWith(thisMonth));
  const totalMonthlyExpenses = monthlyExpenses.reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);

  const pendingPOs = purchaseOrders.filter(po => po.status === 'Pending');

  // Fetch payments for fee summary
  const dashContent = `
    <div id="acc-dashboard-inner">
      <div class="stats-grid" style="grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:16px;margin-bottom:24px">
        <div class="stat-card" style="background:#fff;border-radius:16px;padding:20px;box-shadow:0 2px 8px rgba(0,0,0,0.06);border-left:4px solid #10b981">
          <div style="display:flex;align-items:center;gap:12px">
            <div style="width:44px;height:44px;border-radius:12px;background:rgba(16,185,129,0.12);display:flex;align-items:center;justify-content:center">
              <i class="fas fa-rupee-sign" style="color:#10b981;font-size:18px"></i>
            </div>
            <div>
              <div style="font-size:12px;color:#64748b;font-weight:600;text-transform:uppercase;letter-spacing:0.5px">Fee Collected</div>
              <div id="acc-dash-fee" style="font-size:24px;font-weight:900;color:#0F2050">Loading...</div>
            </div>
          </div>
        </div>
        <div class="stat-card" style="background:#fff;border-radius:16px;padding:20px;box-shadow:0 2px 8px rgba(0,0,0,0.06);border-left:4px solid #ef4444">
          <div style="display:flex;align-items:center;gap:12px">
            <div style="width:44px;height:44px;border-radius:12px;background:rgba(239,68,68,0.12);display:flex;align-items:center;justify-content:center">
              <i class="fas fa-file-invoice-rupee" style="color:#ef4444;font-size:18px"></i>
            </div>
            <div>
              <div style="font-size:12px;color:#64748b;font-weight:600;text-transform:uppercase;letter-spacing:0.5px">Expenses This Month</div>
              <div style="font-size:24px;font-weight:900;color:#0F2050">₹${totalMonthlyExpenses.toLocaleString('en-IN')}</div>
            </div>
          </div>
        </div>
        <div class="stat-card" style="background:#fff;border-radius:16px;padding:20px;box-shadow:0 2px 8px rgba(0,0,0,0.06);border-left:4px solid #f59e0b">
          <div style="display:flex;align-items:center;gap:12px">
            <div style="width:44px;height:44px;border-radius:12px;background:rgba(245,158,11,0.12);display:flex;align-items:center;justify-content:center">
              <i class="fas fa-shopping-cart" style="color:#f59e0b;font-size:18px"></i>
            </div>
            <div>
              <div style="font-size:12px;color:#64748b;font-weight:600;text-transform:uppercase;letter-spacing:0.5px">Pending POs</div>
              <div style="font-size:24px;font-weight:900;color:#0F2050">${pendingPOs.length}</div>
            </div>
          </div>
        </div>
        <div class="stat-card" style="background:#fff;border-radius:16px;padding:20px;box-shadow:0 2px 8px rgba(0,0,0,0.06);border-left:4px solid #8b5cf6">
          <div style="display:flex;align-items:center;gap:12px">
            <div style="width:44px;height:44px;border-radius:12px;background:rgba(139,92,246,0.12);display:flex;align-items:center;justify-content:center">
              <i class="fas fa-list-alt" style="color:#8b5cf6;font-size:18px"></i>
            </div>
            <div>
              <div style="font-size:12px;color:#64748b;font-weight:600;text-transform:uppercase;letter-spacing:0.5px">Total Expenses</div>
              <div style="font-size:24px;font-weight:900;color:#0F2050">${expenses.length}</div>
            </div>
          </div>
        </div>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px">
        <div style="background:#fff;border-radius:16px;padding:20px;box-shadow:0 2px 8px rgba(0,0,0,0.06)">
          <h3 style="font-size:15px;font-weight:800;margin:0 0 16px;color:#0F2050">
            <i class="fas fa-file-invoice-rupee" style="color:#8b5cf6;margin-right:8px"></i>Recent Expenses
          </h3>
          ${expenses.slice(0, 5).length === 0
            ? '<div style="text-align:center;color:#94a3b8;padding:24px;font-size:14px"><i class="fas fa-inbox" style="display:block;font-size:28px;margin-bottom:8px"></i>No expenses yet</div>'
            : `<table style="width:100%;border-collapse:collapse;font-size:13px">
                <thead><tr style="border-bottom:2px solid #e2e8f0">
                  <th style="text-align:left;padding:8px 4px;color:#64748b;font-weight:700">Date</th>
                  <th style="text-align:left;padding:8px 4px;color:#64748b;font-weight:700">Category</th>
                  <th style="text-align:left;padding:8px 4px;color:#64748b;font-weight:700">Description</th>
                  <th style="text-align:right;padding:8px 4px;color:#64748b;font-weight:700">Amount</th>
                </tr></thead>
                <tbody>
                  ${expenses.slice(0, 5).map(e => `
                    <tr style="border-bottom:1px solid #f1f5f9">
                      <td style="padding:8px 4px;color:#475569">${formatDate(e.date)}</td>
                      <td style="padding:8px 4px"><span style="background:#f1f5f9;color:#475569;padding:2px 8px;border-radius:6px;font-size:11px;font-weight:600">${e.category || ''}</span></td>
                      <td style="padding:8px 4px;color:#374151;max-width:120px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${e.description || ''}</td>
                      <td style="padding:8px 4px;text-align:right;font-weight:700;color:#ef4444">₹${parseFloat(e.amount || 0).toLocaleString('en-IN')}</td>
                    </tr>`).join('')}
                </tbody>
              </table>`}
          <div style="margin-top:12px;text-align:right">
            <button class="btn btn-secondary btn-sm" onclick="navigate('acc-expenses')">View All Expenses →</button>
          </div>
        </div>

        <div style="background:#fff;border-radius:16px;padding:20px;box-shadow:0 2px 8px rgba(0,0,0,0.06)">
          <h3 style="font-size:15px;font-weight:800;margin:0 0 16px;color:#0F2050">
            <i class="fas fa-receipt" style="color:#10b981;margin-right:8px"></i>Recent Fee Collections
          </h3>
          <div id="acc-dash-recent-fees">
            <div style="text-align:center;color:#94a3b8;padding:24px;font-size:14px"><i class="fas fa-spinner fa-spin" style="display:block;font-size:24px;margin-bottom:8px"></i>Loading...</div>
          </div>
          <div style="margin-top:12px;text-align:right">
            <button class="btn btn-secondary btn-sm" onclick="navigate('acc-fees')">View All Fees →</button>
          </div>
        </div>
      </div>
    </div>`;

  renderLayout('acc-dashboard', dashContent, 'Accounting Dashboard', 'Accounting / Dashboard');

  // Fetch payments asynchronously
  fetch('/api/payments')
    .then(r => r.ok ? r.json() : { items: [] })
    .then(function(res) {
      const payments = res.items || res.payments || [];
      const totalFee = payments.reduce(function(sum, p) { return sum + (parseFloat(p.amount) || 0); }, 0);
      const feeEl = document.getElementById('acc-dash-fee');
      if (feeEl) feeEl.textContent = '₹' + totalFee.toLocaleString('en-IN');

      const recentEl = document.getElementById('acc-dash-recent-fees');
      if (recentEl) {
        const recent = payments.slice(0, 5);
        if (recent.length === 0) {
          recentEl.innerHTML = '<div style="text-align:center;color:#94a3b8;padding:24px;font-size:14px"><i class="fas fa-inbox" style="display:block;font-size:28px;margin-bottom:8px"></i>No payments yet</div>';
        } else {
          recentEl.innerHTML = `<table style="width:100%;border-collapse:collapse;font-size:13px">
            <thead><tr style="border-bottom:2px solid #e2e8f0">
              <th style="text-align:left;padding:8px 4px;color:#64748b;font-weight:700">Receipt</th>
              <th style="text-align:left;padding:8px 4px;color:#64748b;font-weight:700">Student</th>
              <th style="text-align:left;padding:8px 4px;color:#64748b;font-weight:700">Date</th>
              <th style="text-align:right;padding:8px 4px;color:#64748b;font-weight:700">Amount</th>
            </tr></thead>
            <tbody>
              ${recent.map(function(p) {
                return '<tr style="border-bottom:1px solid #f1f5f9">' +
                  '<td style="padding:8px 4px;color:#475569;font-size:12px">' + (p.receiptNo || p.id || '-') + '</td>' +
                  '<td style="padding:8px 4px;color:#374151">' + (p.studentName || p.student || '-') + '</td>' +
                  '<td style="padding:8px 4px;color:#475569">' + formatDate(p.date || p.createdAt) + '</td>' +
                  '<td style="padding:8px 4px;text-align:right;font-weight:700;color:#10b981">₹' + parseFloat(p.amount || 0).toLocaleString('en-IN') + '</td>' +
                  '</tr>';
              }).join('')}
            </tbody>
          </table>`;
        }
      }
    })
    .catch(function() {
      const feeEl = document.getElementById('acc-dash-fee');
      if (feeEl) feeEl.textContent = '₹0';
      const recentEl = document.getElementById('acc-dash-recent-fees');
      if (recentEl) recentEl.innerHTML = '<div style="text-align:center;color:#94a3b8;padding:16px;font-size:13px">Unable to load payment data</div>';
    });
}

// ---- Fee Collection ----
function renderAccFees() {
  const user = Session.current();
  if (!user || user.role !== 'accounting') { renderLogin(); return; }

  const content = `
    <div id="acc-fees-inner">
      <div class="stats-grid" style="grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:16px;margin-bottom:24px">
        <div style="background:#fff;border-radius:16px;padding:20px;box-shadow:0 2px 8px rgba(0,0,0,0.06);border-left:4px solid #10b981">
          <div style="font-size:12px;color:#64748b;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px">Total Collected</div>
          <div id="acc-fee-total" style="font-size:26px;font-weight:900;color:#0F2050">Loading...</div>
        </div>
        <div style="background:#fff;border-radius:16px;padding:20px;box-shadow:0 2px 8px rgba(0,0,0,0.06);border-left:4px solid #1AA6CA">
          <div style="font-size:12px;color:#64748b;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px">This Month</div>
          <div id="acc-fee-month" style="font-size:26px;font-weight:900;color:#0F2050">Loading...</div>
        </div>
        <div style="background:#fff;border-radius:16px;padding:20px;box-shadow:0 2px 8px rgba(0,0,0,0.06);border-left:4px solid #8b5cf6">
          <div style="font-size:12px;color:#64748b;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px">Total Receipts</div>
          <div id="acc-fee-count" style="font-size:26px;font-weight:900;color:#0F2050">Loading...</div>
        </div>
      </div>
      <div style="background:#fff;border-radius:16px;padding:20px;box-shadow:0 2px 8px rgba(0,0,0,0.06)">
        <h3 style="font-size:15px;font-weight:800;margin:0 0 16px;color:#0F2050">
          <i class="fas fa-receipt" style="color:#10b981;margin-right:8px"></i>Payment Records
        </h3>
        <div id="acc-fees-table">
          <div style="text-align:center;color:#94a3b8;padding:40px;font-size:14px"><i class="fas fa-spinner fa-spin" style="display:block;font-size:32px;margin-bottom:12px"></i>Loading payments...</div>
        </div>
      </div>
    </div>`;

  renderLayout('acc-fees', content, 'Fee Collection', 'Accounting / Fee Collection');

  // Fetch payments
  fetch('/api/payments')
    .then(function(r) { return r.ok ? r.json() : { items: [] }; })
    .then(function(res) {
      const payments = res.items || res.payments || [];
      const now = new Date();
      const thisMonth = now.toISOString().slice(0, 7);

      const total = payments.reduce(function(s, p) { return s + (parseFloat(p.amount) || 0); }, 0);
      const monthTotal = payments
        .filter(function(p) { return (p.date || p.createdAt || '').startsWith(thisMonth); })
        .reduce(function(s, p) { return s + (parseFloat(p.amount) || 0); }, 0);

      const totalEl = document.getElementById('acc-fee-total');
      const monthEl = document.getElementById('acc-fee-month');
      const countEl = document.getElementById('acc-fee-count');
      if (totalEl) totalEl.textContent = '₹' + total.toLocaleString('en-IN');
      if (monthEl) monthEl.textContent = '₹' + monthTotal.toLocaleString('en-IN');
      if (countEl) countEl.textContent = payments.length;

      const tableEl = document.getElementById('acc-fees-table');
      if (!tableEl) return;

      if (payments.length === 0) {
        tableEl.innerHTML = '<div style="text-align:center;color:#94a3b8;padding:40px;font-size:14px"><i class="fas fa-inbox" style="display:block;font-size:36px;margin-bottom:12px"></i>No payment records found</div>';
        return;
      }

      tableEl.innerHTML = `
        <div style="overflow-x:auto">
          <table style="width:100%;border-collapse:collapse;font-size:13px">
            <thead>
              <tr style="background:#f8fafc;border-bottom:2px solid #e2e8f0">
                <th style="text-align:left;padding:10px 12px;color:#64748b;font-weight:700">Receipt No</th>
                <th style="text-align:left;padding:10px 12px;color:#64748b;font-weight:700">Student</th>
                <th style="text-align:left;padding:10px 12px;color:#64748b;font-weight:700">Class</th>
                <th style="text-align:left;padding:10px 12px;color:#64748b;font-weight:700">Date</th>
                <th style="text-align:right;padding:10px 12px;color:#64748b;font-weight:700">Amount</th>
                <th style="text-align:left;padding:10px 12px;color:#64748b;font-weight:700">Mode</th>
                <th style="text-align:center;padding:10px 12px;color:#64748b;font-weight:700">Actions</th>
              </tr>
            </thead>
            <tbody>
              ${payments.map(function(p) {
                const payId = p.id || p.receiptNo || '';
                return '<tr style="border-bottom:1px solid #f1f5f9;transition:background 0.15s" onmouseenter="this.style.background=\'#f8fafc\'" onmouseleave="this.style.background=\'\'">' +
                  '<td style="padding:10px 12px;color:#475569;font-weight:600;font-size:12px">' + (p.receiptNo || p.id || '-') + '</td>' +
                  '<td style="padding:10px 12px;color:#374151;font-weight:600">' + (p.studentName || p.student || '-') + '</td>' +
                  '<td style="padding:10px 12px;color:#64748b">' + (p.className || p.class || '-') + '</td>' +
                  '<td style="padding:10px 12px;color:#64748b">' + formatDate(p.date || p.createdAt) + '</td>' +
                  '<td style="padding:10px 12px;text-align:right;font-weight:800;color:#10b981">₹' + parseFloat(p.amount || 0).toLocaleString('en-IN') + '</td>' +
                  '<td style="padding:10px 12px"><span style="background:#e0f2fe;color:#0369a1;padding:2px 10px;border-radius:6px;font-size:11px;font-weight:600">' + (p.mode || p.paymentMode || 'Cash') + '</span></td>' +
                  '<td style="padding:10px 12px;text-align:center">' +
                    (payId ? '<button class="btn btn-secondary btn-sm" onclick="window.open(\'/receipt/' + payId + '\',\'_blank\')" title="Download Receipt"><i class="fas fa-download"></i> Receipt</button>' : '-') +
                  '</td>' +
                  '</tr>';
              }).join('')}
            </tbody>
          </table>
        </div>`;
    })
    .catch(function() {
      ['acc-fee-total', 'acc-fee-month', 'acc-fee-count'].forEach(function(id) {
        const el = document.getElementById(id);
        if (el) el.textContent = '₹0';
      });
      const tableEl = document.getElementById('acc-fees-table');
      if (tableEl) tableEl.innerHTML = '<div style="text-align:center;color:#94a3b8;padding:40px;font-size:14px">Unable to load payment data</div>';
    });
}

// ---- Purchase Orders ----
function renderAccPurchase() {
  const user = Session.current();
  if (!user || user.role !== 'accounting') { renderLogin(); return; }

  function getStatusBadge(status) {
    const map = {
      'Pending':   { bg: '#fef3c7', color: '#92400e' },
      'Approved':  { bg: '#dbeafe', color: '#1e40af' },
      'Received':  { bg: '#d1fae5', color: '#065f46' },
      'Cancelled': { bg: '#fee2e2', color: '#991b1b' }
    };
    const s = map[status] || { bg: '#f1f5f9', color: '#475569' };
    return '<span style="background:' + s.bg + ';color:' + s.color + ';padding:3px 10px;border-radius:6px;font-size:11px;font-weight:700">' + (status || 'Unknown') + '</span>';
  }

  function buildTable(orders) {
    if (orders.length === 0) {
      return '<div style="text-align:center;color:#94a3b8;padding:40px;font-size:14px"><i class="fas fa-inbox" style="display:block;font-size:36px;margin-bottom:12px"></i>No purchase orders yet. Click "New Purchase Order" to add one.</div>';
    }
    return '<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:13px">' +
      '<thead><tr style="background:#f8fafc;border-bottom:2px solid #e2e8f0">' +
        '<th style="text-align:left;padding:10px 12px;color:#64748b;font-weight:700">Order Date</th>' +
        '<th style="text-align:left;padding:10px 12px;color:#64748b;font-weight:700">Item</th>' +
        '<th style="text-align:left;padding:10px 12px;color:#64748b;font-weight:700">Vendor</th>' +
        '<th style="text-align:center;padding:10px 12px;color:#64748b;font-weight:700">Qty</th>' +
        '<th style="text-align:right;padding:10px 12px;color:#64748b;font-weight:700">Unit Price</th>' +
        '<th style="text-align:right;padding:10px 12px;color:#64748b;font-weight:700">Total</th>' +
        '<th style="text-align:center;padding:10px 12px;color:#64748b;font-weight:700">Status</th>' +
        '<th style="text-align:center;padding:10px 12px;color:#64748b;font-weight:700">Actions</th>' +
      '</tr></thead>' +
      '<tbody>' +
        orders.map(function(po) {
          return '<tr style="border-bottom:1px solid #f1f5f9" onmouseenter="this.style.background=\'#f8fafc\'" onmouseleave="this.style.background=\'\'">' +
            '<td style="padding:10px 12px;color:#475569">' + formatDate(po.orderDate) + '</td>' +
            '<td style="padding:10px 12px;color:#374151;font-weight:600">' + (po.item || '') + '</td>' +
            '<td style="padding:10px 12px;color:#64748b">' + (po.vendor || '') + '</td>' +
            '<td style="padding:10px 12px;text-align:center;color:#374151">' + (po.qty || 0) + '</td>' +
            '<td style="padding:10px 12px;text-align:right;color:#374151">₹' + parseFloat(po.unitPrice || 0).toLocaleString('en-IN') + '</td>' +
            '<td style="padding:10px 12px;text-align:right;font-weight:800;color:#0F2050">₹' + parseFloat(po.total || 0).toLocaleString('en-IN') + '</td>' +
            '<td style="padding:10px 12px;text-align:center">' + getStatusBadge(po.status) + '</td>' +
            '<td style="padding:10px 12px;text-align:center">' +
              '<button class="btn btn-danger btn-sm" onclick="accDeletePO(\'' + po.id + '\')" title="Delete"><i class="fas fa-trash"></i></button>' +
            '</td>' +
          '</tr>';
        }).join('') +
      '</tbody></table></div>';
  }

  const orders = DB.getPurchaseOrders();

  const content = `
    <div>
      <div style="display:flex;justify-content:flex-end;margin-bottom:20px">
        <button class="btn btn-primary" onclick="accShowPOModal()">
          <i class="fas fa-plus"></i> New Purchase Order
        </button>
      </div>
      <div style="background:#fff;border-radius:16px;padding:20px;box-shadow:0 2px 8px rgba(0,0,0,0.06)">
        <h3 style="font-size:15px;font-weight:800;margin:0 0 16px;color:#0F2050">
          <i class="fas fa-shopping-cart" style="color:#f59e0b;margin-right:8px"></i>Purchase Orders
          <span style="font-size:13px;font-weight:600;color:#64748b;margin-left:8px">(${orders.length} total)</span>
        </h3>
        <div id="acc-po-table">${buildTable(orders)}</div>
      </div>
    </div>`;

  renderLayout('acc-purchase', content, 'Purchase Orders', 'Accounting / Purchase Orders');
}

window.accDeletePO = function(id) {
  confirmDialog('Delete this purchase order?', function() {
    DB.deletePurchaseOrder(id);
    showToast('Purchase order deleted', 'success');
    renderAccPurchase();
  });
};

window.accShowPOModal = function() {
  const today = new Date().toISOString().split('T')[0];
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.id = 'acc-po-modal';
  overlay.innerHTML = `
    <div class="modal" style="max-width:520px;width:100%">
      <div class="modal-header">
        <h3 class="modal-title"><i class="fas fa-shopping-cart" style="color:#f59e0b;margin-right:8px"></i>New Purchase Order</h3>
        <button class="btn btn-secondary btn-sm" onclick="document.getElementById('acc-po-modal').remove()">
          <i class="fas fa-times"></i>
        </button>
      </div>
      <div class="modal-body" style="padding:24px">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
          <div style="grid-column:1/-1">
            <label class="form-label">Item Description *</label>
            <input id="po-item" class="form-control" type="text" placeholder="e.g. Whiteboard markers"/>
          </div>
          <div>
            <label class="form-label">Vendor Name *</label>
            <input id="po-vendor" class="form-control" type="text" placeholder="Vendor / Supplier name"/>
          </div>
          <div>
            <label class="form-label">Order Date *</label>
            <input id="po-date" class="form-control" type="date" value="${today}"/>
          </div>
          <div>
            <label class="form-label">Quantity *</label>
            <input id="po-qty" class="form-control" type="number" min="1" value="1" oninput="accCalcPOTotal()"/>
          </div>
          <div>
            <label class="form-label">Unit Price (₹) *</label>
            <input id="po-price" class="form-control" type="number" min="0" step="0.01" placeholder="0.00" oninput="accCalcPOTotal()"/>
          </div>
          <div style="grid-column:1/-1">
            <label class="form-label">Total Amount (₹)</label>
            <input id="po-total" class="form-control" type="text" readonly style="background:#f8fafc;font-weight:700;color:#0F2050" value="0.00"/>
          </div>
          <div>
            <label class="form-label">Status</label>
            <select id="po-status" class="form-control">
              <option value="Pending">Pending</option>
              <option value="Approved">Approved</option>
              <option value="Received">Received</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          </div>
          <div style="grid-column:1/-1">
            <label class="form-label">Notes</label>
            <textarea id="po-notes" class="form-control" rows="2" placeholder="Optional notes..."></textarea>
          </div>
        </div>
      </div>
      <div class="modal-footer" style="padding:16px 24px;display:flex;justify-content:flex-end;gap:12px;border-top:1px solid #e2e8f0">
        <button class="btn btn-secondary" onclick="document.getElementById('acc-po-modal').remove()">Cancel</button>
        <button class="btn btn-primary" onclick="accSavePO()"><i class="fas fa-save"></i> Save Order</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);
  overlay.addEventListener('click', function(e) { if (e.target === overlay) overlay.remove(); });
};

window.accCalcPOTotal = function() {
  const qty = parseFloat(document.getElementById('po-qty').value) || 0;
  const price = parseFloat(document.getElementById('po-price').value) || 0;
  const total = (qty * price).toFixed(2);
  const totalEl = document.getElementById('po-total');
  if (totalEl) totalEl.value = total;
};

window.accSavePO = function() {
  const user = Session.current();
  const item = (document.getElementById('po-item').value || '').trim();
  const vendor = (document.getElementById('po-vendor').value || '').trim();
  const qty = parseFloat(document.getElementById('po-qty').value) || 0;
  const unitPrice = parseFloat(document.getElementById('po-price').value) || 0;
  const orderDate = document.getElementById('po-date').value;
  const status = document.getElementById('po-status').value;
  const notes = (document.getElementById('po-notes').value || '').trim();

  if (!item) { showToast('Item description is required', 'error'); return; }
  if (!vendor) { showToast('Vendor name is required', 'error'); return; }
  if (!orderDate) { showToast('Order date is required', 'error'); return; }
  if (qty <= 0) { showToast('Quantity must be greater than 0', 'error'); return; }

  const po = {
    id: 'po_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
    item: item,
    vendor: vendor,
    qty: qty,
    unitPrice: unitPrice,
    total: qty * unitPrice,
    orderDate: orderDate,
    status: status,
    notes: notes,
    createdAt: new Date().toISOString(),
    createdBy: user ? user.id : ''
  };

  DB.addPurchaseOrder(po);
  const modal = document.getElementById('acc-po-modal');
  if (modal) modal.remove();
  showToast('Purchase order saved!', 'success');
  renderAccPurchase();
};

// ---- Expenses ----
function renderAccExpenses() {
  const user = Session.current();
  if (!user || user.role !== 'accounting') { renderLogin(); return; }

  const categories = ['All', 'Salary', 'Supplies', 'Maintenance', 'Utilities', 'Transport', 'Other'];
  const activeFilter = window._accExpFilter || 'All';

  const now = new Date();
  const thisMonth = now.toISOString().slice(0, 7);
  const thisYear = now.getFullYear().toString();

  const allExpenses = DB.getExpenses();
  const filtered = activeFilter === 'All' ? allExpenses : allExpenses.filter(function(e) { return e.category === activeFilter; });

  const monthTotal = allExpenses
    .filter(function(e) { return (e.date || '').startsWith(thisMonth); })
    .reduce(function(s, e) { return s + (parseFloat(e.amount) || 0); }, 0);

  const yearTotal = allExpenses
    .filter(function(e) { return (e.date || '').startsWith(thisYear); })
    .reduce(function(s, e) { return s + (parseFloat(e.amount) || 0); }, 0);

  function buildExpTable(list) {
    if (list.length === 0) {
      return '<div style="text-align:center;color:#94a3b8;padding:40px;font-size:14px"><i class="fas fa-inbox" style="display:block;font-size:36px;margin-bottom:12px"></i>No expenses found. Click "Add Expense" to record one.</div>';
    }
    return '<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:13px">' +
      '<thead><tr style="background:#f8fafc;border-bottom:2px solid #e2e8f0">' +
        '<th style="text-align:left;padding:10px 12px;color:#64748b;font-weight:700">Date</th>' +
        '<th style="text-align:left;padding:10px 12px;color:#64748b;font-weight:700">Category</th>' +
        '<th style="text-align:left;padding:10px 12px;color:#64748b;font-weight:700">Description</th>' +
        '<th style="text-align:left;padding:10px 12px;color:#64748b;font-weight:700">Payee</th>' +
        '<th style="text-align:right;padding:10px 12px;color:#64748b;font-weight:700">Amount</th>' +
        '<th style="text-align:center;padding:10px 12px;color:#64748b;font-weight:700">Actions</th>' +
      '</tr></thead>' +
      '<tbody>' +
        list.map(function(e) {
          return '<tr style="border-bottom:1px solid #f1f5f9" onmouseenter="this.style.background=\'#f8fafc\'" onmouseleave="this.style.background=\'\'">' +
            '<td style="padding:10px 12px;color:#475569">' + formatDate(e.date) + '</td>' +
            '<td style="padding:10px 12px">' +
              '<span style="background:#f1f5f9;color:#475569;padding:3px 10px;border-radius:6px;font-size:11px;font-weight:700">' + (e.category || '') + '</span>' +
            '</td>' +
            '<td style="padding:10px 12px;color:#374151;font-weight:600;max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + (e.description || '') + '</td>' +
            '<td style="padding:10px 12px;color:#64748b">' + (e.payee || '') + '</td>' +
            '<td style="padding:10px 12px;text-align:right;font-weight:800;color:#ef4444">₹' + parseFloat(e.amount || 0).toLocaleString('en-IN') + '</td>' +
            '<td style="padding:10px 12px;text-align:center">' +
              '<button class="btn btn-danger btn-sm" onclick="accDeleteExpense(\'' + e.id + '\')" title="Delete"><i class="fas fa-trash"></i></button>' +
            '</td>' +
          '</tr>';
        }).join('') +
      '</tbody></table></div>';
  }

  const content = `
    <div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:20px">
        <div style="background:#fff;border-radius:16px;padding:20px;box-shadow:0 2px 8px rgba(0,0,0,0.06);border-left:4px solid #ef4444">
          <div style="font-size:12px;color:#64748b;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px">Total This Month</div>
          <div style="font-size:26px;font-weight:900;color:#0F2050">₹${monthTotal.toLocaleString('en-IN')}</div>
        </div>
        <div style="background:#fff;border-radius:16px;padding:20px;box-shadow:0 2px 8px rgba(0,0,0,0.06);border-left:4px solid #8b5cf6">
          <div style="font-size:12px;color:#64748b;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px">Total This Year</div>
          <div style="font-size:26px;font-weight:900;color:#0F2050">₹${yearTotal.toLocaleString('en-IN')}</div>
        </div>
      </div>

      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;flex-wrap:wrap;gap:12px">
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          ${categories.map(function(cat) {
            const active = cat === activeFilter;
            return '<button class="btn btn-sm ' + (active ? 'btn-primary' : 'btn-secondary') + '" onclick="accSetExpFilter(\'' + cat + '\')">' + cat + '</button>';
          }).join('')}
        </div>
        <button class="btn btn-primary" onclick="accShowExpenseModal()">
          <i class="fas fa-plus"></i> Add Expense
        </button>
      </div>

      <div style="background:#fff;border-radius:16px;padding:20px;box-shadow:0 2px 8px rgba(0,0,0,0.06)">
        <h3 style="font-size:15px;font-weight:800;margin:0 0 16px;color:#0F2050">
          <i class="fas fa-file-invoice-rupee" style="color:#ef4444;margin-right:8px"></i>Expense Records
          <span style="font-size:13px;font-weight:600;color:#64748b;margin-left:8px">(${filtered.length} records)</span>
        </h3>
        ${buildExpTable(filtered)}
      </div>
    </div>`;

  renderLayout('acc-expenses', content, 'Expenses', 'Accounting / Expenses');
}

window.accSetExpFilter = function(cat) {
  window._accExpFilter = cat;
  renderAccExpenses();
};

window.accDeleteExpense = function(id) {
  confirmDialog('Delete this expense record?', function() {
    DB.deleteExpense(id);
    showToast('Expense deleted', 'success');
    renderAccExpenses();
  });
};

window.accShowExpenseModal = function() {
  const today = new Date().toISOString().split('T')[0];
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.id = 'acc-exp-modal';
  overlay.innerHTML = `
    <div class="modal" style="max-width:500px;width:100%">
      <div class="modal-header">
        <h3 class="modal-title"><i class="fas fa-file-invoice-rupee" style="color:#ef4444;margin-right:8px"></i>Add Expense</h3>
        <button class="btn btn-secondary btn-sm" onclick="document.getElementById('acc-exp-modal').remove()">
          <i class="fas fa-times"></i>
        </button>
      </div>
      <div class="modal-body" style="padding:24px">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
          <div>
            <label class="form-label">Category *</label>
            <select id="exp-category" class="form-control">
              <option value="Salary">Salary</option>
              <option value="Supplies">Supplies</option>
              <option value="Maintenance">Maintenance</option>
              <option value="Utilities">Utilities</option>
              <option value="Transport">Transport</option>
              <option value="Other">Other</option>
            </select>
          </div>
          <div>
            <label class="form-label">Date *</label>
            <input id="exp-date" class="form-control" type="date" value="${today}"/>
          </div>
          <div style="grid-column:1/-1">
            <label class="form-label">Description *</label>
            <input id="exp-desc" class="form-control" type="text" placeholder="e.g. Teacher salary - April 2025"/>
          </div>
          <div>
            <label class="form-label">Payee Name *</label>
            <input id="exp-payee" class="form-control" type="text" placeholder="Teacher / Staff / Vendor name"/>
          </div>
          <div>
            <label class="form-label">Amount (₹) *</label>
            <input id="exp-amount" class="form-control" type="number" min="0" step="0.01" placeholder="0.00"/>
          </div>
          <div style="grid-column:1/-1">
            <label class="form-label">Notes</label>
            <textarea id="exp-notes" class="form-control" rows="2" placeholder="Optional notes..."></textarea>
          </div>
        </div>
      </div>
      <div class="modal-footer" style="padding:16px 24px;display:flex;justify-content:flex-end;gap:12px;border-top:1px solid #e2e8f0">
        <button class="btn btn-secondary" onclick="document.getElementById('acc-exp-modal').remove()">Cancel</button>
        <button class="btn btn-primary" onclick="accSaveExpense()"><i class="fas fa-save"></i> Save Expense</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);
  overlay.addEventListener('click', function(e) { if (e.target === overlay) overlay.remove(); });
};

window.accSaveExpense = function() {
  const user = Session.current();
  const category = document.getElementById('exp-category').value;
  const description = (document.getElementById('exp-desc').value || '').trim();
  const payee = (document.getElementById('exp-payee').value || '').trim();
  const amount = parseFloat(document.getElementById('exp-amount').value) || 0;
  const date = document.getElementById('exp-date').value;
  const notes = (document.getElementById('exp-notes').value || '').trim();

  if (!description) { showToast('Description is required', 'error'); return; }
  if (!payee) { showToast('Payee name is required', 'error'); return; }
  if (!date) { showToast('Date is required', 'error'); return; }
  if (amount <= 0) { showToast('Amount must be greater than 0', 'error'); return; }

  const expense = {
    id: 'exp_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
    category: category,
    description: description,
    payee: payee,
    amount: amount,
    date: date,
    notes: notes,
    createdAt: new Date().toISOString(),
    createdBy: user ? user.id : ''
  };

  DB.addExpense(expense);
  const modal = document.getElementById('acc-exp-modal');
  if (modal) modal.remove();
  showToast('Expense saved!', 'success');
  renderAccExpenses();
};

// ---- Route Registration ----
registerRoute('acc-dashboard', renderAccDashboard);
registerRoute('acc-fees', renderAccFees);
registerRoute('acc-purchase', renderAccPurchase);
registerRoute('acc-expenses', renderAccExpenses);
