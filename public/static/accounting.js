// ============================================================
// EduTrack - Accounting Admin Module
// Role: accounting
// ============================================================

function _accAuthHdr() { var t=localStorage.getItem('sk_session_token'); return t?{'Authorization':'Bearer '+t}:{}; }

// ---- Dashboard ----
function renderAccDashboard() {
  const user = Session.current();
  if (!user || user.role !== 'accounting') { renderLogin(); return; }

  const data = DB.get();
  const purchaseOrders = DB.getPurchaseOrders();

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
              <i class="fas fa-calculator" style="color:#ef4444;font-size:18px"></i>
            </div>
            <div>
              <div style="font-size:12px;color:#64748b;font-weight:600;text-transform:uppercase;letter-spacing:0.5px">Expenses This Month</div>
              <div id="acc-dash-exp-month" style="font-size:24px;font-weight:900;color:#0F2050">Loading...</div>
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
              <div id="acc-dash-exp-count" style="font-size:24px;font-weight:900;color:#0F2050">Loading...</div>
            </div>
          </div>
        </div>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px">
        <div style="background:#fff;border-radius:16px;padding:20px;box-shadow:0 2px 8px rgba(0,0,0,0.06)">
          <h3 style="font-size:15px;font-weight:800;margin:0 0 16px;color:#0F2050">
            <i class="fas fa-calculator" style="color:#8b5cf6;margin-right:8px"></i>Recent Expenses
          </h3>
          <div id="acc-dash-recent-exp">
            <div style="text-align:center;color:#94a3b8;padding:24px;font-size:14px"><i class="fas fa-spinner fa-spin" style="display:block;font-size:24px;margin-bottom:8px"></i>Loading...</div>
          </div>
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
  fetch('/api/payments', {headers: _accAuthHdr()})
    .then(r => r.ok ? r.json() : { items: [] })
    .then(function(res) {
      const rawItems = res.items || res.payments || [];
      const payments = rawItems.map(function(p) {
        var d = {};
        try { d = typeof p.data === 'string' ? JSON.parse(p.data) : (p.data || {}); } catch(e) {}
        return { id: p.id, receiptNo: d.receiptNo || p.id, studentName: d.studentName || '-', classId: d.classId || '-', paymentDate: d.paymentDate || '', total: parseFloat(d.total) || 0, paymentMode: d.paymentMode || 'Cash' };
      });
      const totalFee = payments.reduce(function(sum, p) { return sum + p.total; }, 0);
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
                  '<td style="padding:8px 4px;color:#475569;font-size:12px">' + (p.receiptNo || '-') + '</td>' +
                  '<td style="padding:8px 4px;color:#374151">' + p.studentName + '</td>' +
                  '<td style="padding:8px 4px;color:#475569">' + formatDate(p.paymentDate) + '</td>' +
                  '<td style="padding:8px 4px;text-align:right;font-weight:700;color:#10b981">₹' + p.total.toLocaleString('en-IN') + '</td>' +
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

  // Fetch expenses asynchronously
  fetch('/api/expenses', {headers: _accAuthHdr()})
    .then(r => r.ok ? r.json() : { items: [] })
    .then(function(res) {
      const items = res.items || [];
      const expenses = items.map(function(row) {
        var d = {};
        try { d = typeof row.data === 'string' ? JSON.parse(row.data) : (row.data || {}); } catch(e) {}
        return Object.assign({ id: row.id }, d);
      });

      const now = new Date();
      const thisMonth = now.toISOString().slice(0, 7);
      const monthlyExpenses = expenses.filter(e => (e.date || '').startsWith(thisMonth));
      const totalMonthlyExpenses = monthlyExpenses.reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);

      const monthEl = document.getElementById('acc-dash-exp-month');
      if (monthEl) monthEl.textContent = '₹' + totalMonthlyExpenses.toLocaleString('en-IN');
      const countEl = document.getElementById('acc-dash-exp-count');
      if (countEl) countEl.textContent = expenses.length;

      const recentEl = document.getElementById('acc-dash-recent-exp');
      if (!recentEl) return;
      const recent = expenses.slice(0, 5);
      if (recent.length === 0) {
        recentEl.innerHTML = '<div style="text-align:center;color:#94a3b8;padding:24px;font-size:14px"><i class="fas fa-inbox" style="display:block;font-size:28px;margin-bottom:8px"></i>No expenses yet</div>';
      } else {
        recentEl.innerHTML = `<table style="width:100%;border-collapse:collapse;font-size:13px">
          <thead><tr style="border-bottom:2px solid #e2e8f0">
            <th style="text-align:left;padding:8px 4px;color:#64748b;font-weight:700">Date</th>
            <th style="text-align:left;padding:8px 4px;color:#64748b;font-weight:700">Category</th>
            <th style="text-align:left;padding:8px 4px;color:#64748b;font-weight:700">Description</th>
            <th style="text-align:right;padding:8px 4px;color:#64748b;font-weight:700">Amount</th>
          </tr></thead>
          <tbody>
            ${recent.map(e => `
              <tr style="border-bottom:1px solid #f1f5f9">
                <td style="padding:8px 4px;color:#475569">${formatDate(e.date)}</td>
                <td style="padding:8px 4px"><span style="background:#f1f5f9;color:#475569;padding:2px 8px;border-radius:6px;font-size:11px;font-weight:600">${e.category || ''}</span></td>
                <td style="padding:8px 4px;color:#374151;max-width:120px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${e.description || ''}</td>
                <td style="padding:8px 4px;text-align:right;font-weight:700;color:#ef4444">₹${parseFloat(e.amount || 0).toLocaleString('en-IN')}</td>
              </tr>`).join('')}
          </tbody>
        </table>`;
      }
    })
    .catch(function() {
      const monthEl = document.getElementById('acc-dash-exp-month');
      if (monthEl) monthEl.textContent = '₹0';
      const countEl = document.getElementById('acc-dash-exp-count');
      if (countEl) countEl.textContent = '0';
      const recentEl = document.getElementById('acc-dash-recent-exp');
      if (recentEl) recentEl.innerHTML = '<div style="text-align:center;color:#94a3b8;padding:16px;font-size:13px">Unable to load expense data</div>';
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
  fetch('/api/payments', {headers: _accAuthHdr()})
    .then(function(r) { return r.ok ? r.json() : { items: [] }; })
    .then(function(res) {
      const rawItems = res.items || res.payments || [];
      const payments = rawItems.map(function(p) {
        var d = {};
        try { d = typeof p.data === 'string' ? JSON.parse(p.data) : (p.data || {}); } catch(e) {}
        return { id: p.id, receiptNo: d.receiptNo || p.id, studentName: d.studentName || '-', classId: d.classId || '-', paymentDate: d.paymentDate || '', total: parseFloat(d.total) || 0, paymentMode: d.paymentMode || 'Cash' };
      });
      const now = new Date();
      const thisMonth = now.toISOString().slice(0, 7);

      const total = payments.reduce(function(s, p) { return s + p.total; }, 0);
      const monthTotal = payments
        .filter(function(p) { return (p.paymentDate || '').startsWith(thisMonth); })
        .reduce(function(s, p) { return s + p.total; }, 0);

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
                return '<tr style="border-bottom:1px solid #f1f5f9;transition:background 0.15s" onmouseenter="this.style.background=\'#f8fafc\'" onmouseleave="this.style.background=\'\'">' +
                  '<td style="padding:10px 12px;color:#475569;font-weight:600;font-size:12px">' + (p.receiptNo || '-') + '</td>' +
                  '<td style="padding:10px 12px;color:#374151;font-weight:600">' + p.studentName + '</td>' +
                  '<td style="padding:10px 12px;color:#64748b">' + (p.classId || '-') + '</td>' +
                  '<td style="padding:10px 12px;color:#64748b">' + formatDate(p.paymentDate) + '</td>' +
                  '<td style="padding:10px 12px;text-align:right;font-weight:800;color:#10b981">₹' + p.total.toLocaleString('en-IN') + '</td>' +
                  '<td style="padding:10px 12px"><span style="background:#e0f2fe;color:#0369a1;padding:2px 10px;border-radius:6px;font-size:11px;font-weight:600">' + p.paymentMode + '</span></td>' +
                  '<td style="padding:10px 12px;text-align:center">' +
                    '<button class="btn btn-secondary btn-sm" onclick="window.open(\'/receipt/' + p.id + '\',\'_blank\')" title="Download Receipt"><i class="fas fa-download"></i> Receipt</button>' +
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

  const content = '<div id="acc-exp-wrap"><div style="text-align:center;color:#94a3b8;padding:40px;font-size:14px"><i class="fas fa-spinner fa-spin" style="display:block;font-size:32px;margin-bottom:12px"></i>Loading expenses...</div></div>';
  renderLayout('acc-expenses', content, 'Expenses', 'Accounting / Expenses');
  loadAccExpenses();
}

function loadAccExpenses() {
  const wrap = document.getElementById('acc-exp-wrap');
  if (!wrap) return;
  fetch('/api/expenses', {headers: _accAuthHdr()})
    .then(function(r) { return r.ok ? r.json() : { items: [] }; })
    .then(function(res) {
      const items = res.items || [];
      window._accExpCache = items.map(function(row) {
        var d = {};
        try { d = typeof row.data === 'string' ? JSON.parse(row.data) : (row.data || {}); } catch(e) {}
        return Object.assign({ id: row.id, source: row.source || 'manual' }, d);
      });
      renderAccExpensesTable();
    })
    .catch(function() {
      wrap.innerHTML = '<div style="text-align:center;color:#94a3b8;padding:40px;font-size:14px">Unable to load expense data</div>';
    });
}

function renderAccExpensesTable() {
  const wrap = document.getElementById('acc-exp-wrap');
  if (!wrap) return;

  const categories = ['All', 'Salary', 'Supplies', 'Maintenance', 'Utilities', 'Transport', 'Other'];
  const activeFilter = window._accExpFilter || 'All';

  const now = new Date();
  const thisMonth = now.toISOString().slice(0, 7);
  const thisYear = now.getFullYear().toString();

  const allExpenses = window._accExpCache || [];
  const filtered = activeFilter === 'All' ? allExpenses : allExpenses.filter(function(e) { return e.category === activeFilter; });

  const monthTotal = allExpenses
    .filter(function(e) { return (e.date || '').startsWith(thisMonth); })
    .reduce(function(s, e) { return s + (parseFloat(e.amount) || 0); }, 0);

  const yearTotal = allExpenses
    .filter(function(e) { return (e.date || '').startsWith(thisYear); })
    .reduce(function(s, e) { return s + (parseFloat(e.amount) || 0); }, 0);

  // Salary payments (from Staff Payroll) are the school's other big monthly
  // expense, but they live in salaryPayments, not the manual/sheet expenses
  // table — surface them here rather than duplicating them into a stored
  // expense record, so salaryPayments stays the single source of truth.
  const paidSalaries = (typeof DB !== 'undefined' && DB.getSalaryPayments)
    ? DB.getSalaryPayments(null).filter(function(p) { return (p.status || 'Pending') === 'Paid'; })
    : [];
  const salaryThisMonthTotal = paidSalaries
    .filter(function(p) { return (p.month || '') === thisMonth; })
    .reduce(function(s, p) { return s + (parseFloat(p.netAmount) || 0); }, 0);
  const salaryYearTotal = paidSalaries
    .filter(function(p) { return (p.month || '').startsWith(thisYear); })
    .reduce(function(s, p) { return s + (parseFloat(p.netAmount) || 0); }, 0);
  const combinedMonthTotal = monthTotal + salaryThisMonthTotal;
  const combinedYearTotal = yearTotal + salaryYearTotal;

  const salExpMonth = window._accSalExpMonth || thisMonth;
  const salaryMonthRecords = paidSalaries.filter(function(p) { return (p.month || '') === salExpMonth; });
  const salaryMonthRecordsTotal = salaryMonthRecords.reduce(function(s, p) { return s + (parseFloat(p.netAmount) || 0); }, 0);
  const salUsers = ((typeof DB !== 'undefined' ? DB.get().users : []) || []);

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
          const sourceBadge = e.source === 'sheet'
            ? ' <span style="background:#e0f2fe;color:#0369a1;padding:2px 8px;border-radius:6px;font-size:10px;font-weight:700"><i class="fas fa-table"></i> Sheet</span>'
            : '';
          return '<tr style="border-bottom:1px solid #f1f5f9" onmouseenter="this.style.background=\'#f8fafc\'" onmouseleave="this.style.background=\'\'">' +
            '<td style="padding:10px 12px;color:#475569">' + formatDate(e.date) + '</td>' +
            '<td style="padding:10px 12px">' +
              '<span style="background:#f1f5f9;color:#475569;padding:3px 10px;border-radius:6px;font-size:11px;font-weight:700">' + (e.category || '') + '</span>' +
            '</td>' +
            '<td style="padding:10px 12px;color:#374151;font-weight:600;max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + (e.description || '') + sourceBadge + '</td>' +
            '<td style="padding:10px 12px;color:#64748b">' + (e.payee || '') + '</td>' +
            '<td style="padding:10px 12px;text-align:right;font-weight:800;color:#ef4444">₹' + parseFloat(e.amount || 0).toLocaleString('en-IN') + '</td>' +
            '<td style="padding:10px 12px;text-align:center">' +
              '<button class="btn btn-danger btn-sm" onclick="accDeleteExpense(\'' + e.id + '\')" title="Delete"><i class="fas fa-trash"></i></button>' +
            '</td>' +
          '</tr>';
        }).join('') +
      '</tbody></table></div>';
  }

  function buildSalExpTable(list) {
    if (list.length === 0) {
      return '<div style="text-align:center;color:#94a3b8;padding:24px;font-size:14px">No salary payments marked Paid for this month yet.</div>';
    }
    return '<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:13px">' +
      '<thead><tr style="background:#f8fafc;border-bottom:2px solid #e2e8f0">' +
        '<th style="text-align:left;padding:10px 12px;color:#64748b;font-weight:700">Employee</th>' +
        '<th style="text-align:left;padding:10px 12px;color:#64748b;font-weight:700">Payment Date</th>' +
        '<th style="text-align:left;padding:10px 12px;color:#64748b;font-weight:700">Mode</th>' +
        '<th style="text-align:right;padding:10px 12px;color:#64748b;font-weight:700">Net Pay</th>' +
      '</tr></thead>' +
      '<tbody>' +
        list.map(function(p) {
          var t = salUsers.find(function(u) { return u.id === p.teacherId; });
          return '<tr style="border-bottom:1px solid #f1f5f9">' +
            '<td style="padding:10px 12px;font-weight:600;color:#374151">' + (t ? t.name : '-') + '</td>' +
            '<td style="padding:10px 12px;color:#475569">' + formatDate(p.paymentDate) + '</td>' +
            '<td style="padding:10px 12px"><span style="background:#e0f2fe;color:#0369a1;padding:2px 8px;border-radius:6px;font-size:11px;font-weight:600">' + (p.paymentMode||'Bank Transfer') + '</span></td>' +
            '<td style="padding:10px 12px;text-align:right;font-weight:800;color:#10b981">₹' + parseFloat(p.netAmount||0).toLocaleString('en-IN') + '</td>' +
          '</tr>';
        }).join('') +
      '</tbody>' +
      '<tfoot><tr style="border-top:2px solid #e2e8f0"><td colspan="3" style="padding:10px 12px;text-align:right;font-weight:800;color:#0F2050">Total</td><td style="padding:10px 12px;text-align:right;font-weight:900;color:#10b981">₹' + salaryMonthRecordsTotal.toLocaleString('en-IN') + '</td></tr></tfoot>' +
    '</table></div>';
  }

  wrap.innerHTML = `
    <div>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-bottom:20px">
        <div style="background:#fff;border-radius:16px;padding:20px;box-shadow:0 2px 8px rgba(0,0,0,0.06);border-left:4px solid #ef4444">
          <div style="font-size:12px;color:#64748b;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px">Total Expenses This Month</div>
          <div style="font-size:26px;font-weight:900;color:#0F2050">₹${combinedMonthTotal.toLocaleString('en-IN')}</div>
          <div style="font-size:11px;color:#94a3b8;margin-top:2px">Includes staff salary paid</div>
        </div>
        <div style="background:#fff;border-radius:16px;padding:20px;box-shadow:0 2px 8px rgba(0,0,0,0.06);border-left:4px solid #10b981">
          <div style="font-size:12px;color:#64748b;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px">Salary Paid This Month</div>
          <div style="font-size:26px;font-weight:900;color:#0F2050">₹${salaryThisMonthTotal.toLocaleString('en-IN')}</div>
        </div>
        <div style="background:#fff;border-radius:16px;padding:20px;box-shadow:0 2px 8px rgba(0,0,0,0.06);border-left:4px solid #8b5cf6">
          <div style="font-size:12px;color:#64748b;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px">Total Expenses This Year</div>
          <div style="font-size:26px;font-weight:900;color:#0F2050">₹${combinedYearTotal.toLocaleString('en-IN')}</div>
        </div>
      </div>

      <div style="background:#fff;border-radius:16px;padding:20px;box-shadow:0 2px 8px rgba(0,0,0,0.06);margin-bottom:20px">
        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;margin-bottom:16px">
          <h3 style="font-size:15px;font-weight:800;margin:0;color:#0F2050">
            <i class="fas fa-money-check-alt" style="color:#10b981;margin-right:8px"></i>Salary Paid for the Month
            <span style="font-size:13px;font-weight:600;color:#64748b;margin-left:8px">(${salaryMonthRecords.length} record${salaryMonthRecords.length===1?'':'s'})</span>
          </h3>
          <input type="month" class="form-control" style="max-width:170px" value="${salExpMonth}" onchange="accSetSalExpMonth(this.value)"/>
        </div>
        ${buildSalExpTable(salaryMonthRecords)}
      </div>

      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;flex-wrap:wrap;gap:12px">
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          ${categories.map(function(cat) {
            const active = cat === activeFilter;
            return '<button class="btn btn-sm ' + (active ? 'btn-primary' : 'btn-secondary') + '" onclick="accSetExpFilter(\'' + cat + '\')">' + cat + '</button>';
          }).join('')}
        </div>
        <div style="display:flex;gap:8px">
          <button class="btn btn-secondary" onclick="accShowSheetSyncModal()">
            <i class="fas fa-sync"></i> Sync from Google Sheet
          </button>
          <button class="btn btn-primary" onclick="accShowExpenseModal()">
            <i class="fas fa-plus"></i> Add Expense
          </button>
        </div>
      </div>

      <div style="background:#fff;border-radius:16px;padding:20px;box-shadow:0 2px 8px rgba(0,0,0,0.06)">
        <h3 style="font-size:15px;font-weight:800;margin:0 0 16px;color:#0F2050">
          <i class="fas fa-calculator" style="color:#ef4444;margin-right:8px"></i>Expense Records
          <span style="font-size:13px;font-weight:600;color:#64748b;margin-left:8px">(${filtered.length} records)</span>
        </h3>
        <p style="font-size:12px;color:#94a3b8;margin:-10px 0 14px">External expenses recorded manually or synced from the Google Sheet. Staff salary payments are shown separately above.</p>
        ${buildExpTable(filtered)}
      </div>
    </div>`;
}

window.accSetSalExpMonth = function(month) {
  window._accSalExpMonth = month;
  renderAccExpensesTable();
};

window.accSetExpFilter = function(cat) {
  window._accExpFilter = cat;
  renderAccExpensesTable();
};

window.accDeleteExpense = function(id) {
  confirmDialog('Delete this expense record?', function() {
    fetch('/api/expenses/' + id, { method: 'DELETE', headers: _accAuthHdr() })
      .then(function(r) { if (!r.ok) throw new Error('Server error ' + r.status); return r.json(); })
      .then(function() {
        showToast('Expense deleted', 'success');
        loadAccExpenses();
      })
      .catch(function(e) {
        showToast('Failed to delete expense: ' + e.message, 'error');
      });
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
        <h3 class="modal-title"><i class="fas fa-calculator" style="color:#ef4444;margin-right:8px"></i>Add Expense</h3>
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
    category: category,
    description: description,
    payee: payee,
    amount: amount,
    date: date,
    notes: notes,
    createdAt: new Date().toISOString(),
    createdBy: user ? user.id : ''
  };

  fetch('/api/expenses', {
    method: 'POST',
    headers: Object.assign({'Content-Type':'application/json'}, _accAuthHdr()),
    body: JSON.stringify({ data: expense })
  })
    .then(function(r) { if (!r.ok) throw new Error('Server error ' + r.status); return r.json(); })
    .then(function() {
      const modal = document.getElementById('acc-exp-modal');
      if (modal) modal.remove();
      showToast('Expense saved!', 'success');
      loadAccExpenses();
    })
    .catch(function(e) {
      showToast('Failed to save expense: ' + e.message, 'error');
    });
};

window.accShowSheetSyncModal = function() {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.id = 'acc-exp-sync-modal';
  overlay.innerHTML = `
    <div class="modal" style="max-width:520px;width:100%">
      <div class="modal-header">
        <h3 class="modal-title"><i class="fas fa-sync" style="color:#1AA6CA;margin-right:8px"></i>Sync Expenses from Google Sheet</h3>
        <button class="btn btn-secondary btn-sm" onclick="document.getElementById('acc-exp-sync-modal').remove()">
          <i class="fas fa-times"></i>
        </button>
      </div>
      <div class="modal-body" style="padding:24px">
        <p style="font-size:13px;color:#64748b;margin:0 0 12px">Paste the Google Sheet link. Make sure it's shared as <b>"Anyone with the link — Viewer"</b>. Expected columns: Date, Category, Description, Payee, Amount, Notes.</p>
        <label class="form-label">Google Sheet URL</label>
        <input id="acc-exp-sheet-url" class="form-control" type="text" placeholder="https://docs.google.com/spreadsheets/d/..."/>
        <div id="acc-exp-sync-status" style="margin-top:10px;font-size:13px;color:#64748b"></div>
      </div>
      <div class="modal-footer" style="padding:16px 24px;display:flex;justify-content:flex-end;gap:12px;border-top:1px solid #e2e8f0">
        <button class="btn btn-secondary" onclick="document.getElementById('acc-exp-sync-modal').remove()">Cancel</button>
        <button class="btn btn-primary" id="acc-exp-sync-btn" onclick="accSyncExpenseSheet()"><i class="fas fa-sync"></i> Sync Now</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);
  overlay.addEventListener('click', function(e) { if (e.target === overlay) overlay.remove(); });

  fetch('/api/expenses/sheet-config', {headers: _accAuthHdr()})
    .then(function(r) { return r.ok ? r.json() : {}; })
    .then(function(res) {
      const input = document.getElementById('acc-exp-sheet-url');
      if (input && res.sheetUrl) input.value = res.sheetUrl;
    })
    .catch(function() {});
};

window.accSyncExpenseSheet = function() {
  const url = (document.getElementById('acc-exp-sheet-url').value || '').trim();
  if (!url) { showToast('Please paste a Google Sheet URL', 'error'); return; }
  const statusEl = document.getElementById('acc-exp-sync-status');
  const btn = document.getElementById('acc-exp-sync-btn');
  if (statusEl) statusEl.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Syncing...';
  if (btn) btn.disabled = true;

  fetch('/api/expenses/sync-sheet', {
    method: 'POST',
    headers: Object.assign({'Content-Type':'application/json'}, _accAuthHdr()),
    body: JSON.stringify({ sheetUrl: url })
  })
    .then(function(r) { return r.json().then(function(j) { if (!r.ok) throw new Error(j.error || ('Server error ' + r.status)); return j; }); })
    .then(function(res) {
      showToast('Synced ' + res.imported + ' expense record(s) from the sheet.', 'success');
      const modal = document.getElementById('acc-exp-sync-modal');
      if (modal) modal.remove();
      loadAccExpenses();
    })
    .catch(function(e) {
      if (statusEl) statusEl.innerHTML = '<span style="color:#ef4444">' + e.message + '</span>';
      if (btn) btn.disabled = false;
    });
};

// ---- Staff Payroll ----
function renderAccPayroll() {
  const user = Session.current();
  if (!user || user.role !== 'accounting') { renderLogin(); return; }

  const data = DB.get();
  const teachers = (data.users || []).filter(function(u) { return u.role === 'subadmin' && !u.deleted; });
  const allPayments = DB.getSalaryPayments(null);
  const now = new Date();
  const thisMonth = now.toISOString().slice(0, 7);
  const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  const payrollSearch = (window._accPayrollSearch || '').toLowerCase().trim();
  const payrollMonthFilter = window._accPayrollMonthFilter || '';
  const filteredPayments = allPayments.filter(function(p) {
    var t = (data.users || []).find(function(u) { return u.id === p.teacherId; });
    var nameMatch = !payrollSearch || (t && t.name && t.name.toLowerCase().indexOf(payrollSearch) !== -1);
    var monthMatch = !payrollMonthFilter || p.month === payrollMonthFilter;
    return nameMatch && monthMatch;
  });
  const payrollFilterActive = !!(payrollSearch || payrollMonthFilter);

  const thisMonthTotal = allPayments
    .filter(function(p) { return (p.month || '') === thisMonth; })
    .reduce(function(s, p) { return s + (parseFloat(p.netAmount) || 0); }, 0);

  const getLastPaid = function(teacherId) {
    var p = allPayments.find(function(p) { return p.teacherId === teacherId; });
    if (!p) return '-';
    var [y, m] = (p.month || '').split('-');
    return (monthNames[parseInt(m)-1] || m) + ' ' + y;
  };

  const content = `
    <div>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:20px">
        <div style="background:#fff;border-radius:16px;padding:20px;box-shadow:0 2px 8px rgba(0,0,0,0.06);border-left:4px solid #10b981">
          <div style="font-size:12px;color:#64748b;font-weight:700;text-transform:uppercase;margin-bottom:6px">Paid This Month</div>
          <div style="font-size:24px;font-weight:900;color:#0F2050">₹${thisMonthTotal.toLocaleString('en-IN')}</div>
        </div>
        <div style="background:#fff;border-radius:16px;padding:20px;box-shadow:0 2px 8px rgba(0,0,0,0.06);border-left:4px solid #8b5cf6">
          <div style="font-size:12px;color:#64748b;font-weight:700;text-transform:uppercase;margin-bottom:6px">Total Staff</div>
          <div style="font-size:24px;font-weight:900;color:#0F2050">${teachers.length}</div>
        </div>
        <div style="background:#fff;border-radius:16px;padding:20px;box-shadow:0 2px 8px rgba(0,0,0,0.06);border-left:4px solid #f59e0b">
          <div style="font-size:12px;color:#64748b;font-weight:700;text-transform:uppercase;margin-bottom:6px">Total Slips Issued</div>
          <div style="font-size:24px;font-weight:900;color:#0F2050">${allPayments.length}</div>
        </div>
      </div>

      <div style="background:#fff;border-radius:16px;padding:20px;box-shadow:0 2px 8px rgba(0,0,0,0.06);margin-bottom:20px">
        <h3 style="font-size:15px;font-weight:800;margin:0 0 16px;color:#0F2050">
          <i class="fas fa-chalkboard-teacher" style="color:#10b981;margin-right:8px"></i>Teaching Staff
        </h3>
        ${teachers.length === 0
          ? '<div style="text-align:center;color:#94a3b8;padding:40px;font-size:14px">No teaching staff found. Add teachers under Management.</div>'
          : `<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:13px">
              <thead><tr style="background:#f8fafc;border-bottom:2px solid #e2e8f0">
                <th style="text-align:left;padding:10px 12px;color:#64748b;font-weight:700">Name</th>
                <th style="text-align:left;padding:10px 12px;color:#64748b;font-weight:700">Designation</th>
                <th style="text-align:right;padding:10px 12px;color:#64748b;font-weight:700">Base Salary</th>
                <th style="text-align:left;padding:10px 12px;color:#64748b;font-weight:700">UPI ID</th>
                <th style="text-align:left;padding:10px 12px;color:#64748b;font-weight:700">Last Paid</th>
                <th style="text-align:center;padding:10px 12px;color:#64748b;font-weight:700">Actions</th>
              </tr></thead>
              <tbody>
                ${teachers.map(function(t) {
                  var hasQr = (t.documents||[]).some(function(d){return d.type==='UPI QR Code';});
                  return '<tr style="border-bottom:1px solid #f1f5f9" onmouseenter="this.style.background=\'#f8fafc\'" onmouseleave="this.style.background=\'\'">' +
                    '<td style="padding:10px 12px"><div style="font-weight:700;color:#0F2050">' + (t.name||'') + '</div><div style="font-size:11px;color:#94a3b8">' + (t.username||'') + '</div></td>' +
                    '<td style="padding:10px 12px;color:#64748b">' + (t.designation||'Class Teacher') + '</td>' +
                    '<td style="padding:10px 12px;text-align:right;font-weight:700;color:#374151">₹' + parseFloat(t.baseSalary||0).toLocaleString('en-IN') + '</td>' +
                    '<td style="padding:10px 12px;color:#64748b">' + (t.upiId ? '<span style="font-weight:600;color:#0F2050">'+t.upiId+'</span>' + (hasQr ? ' <i class="fas fa-qrcode" style="color:#10b981;margin-left:4px" title="QR code on file"></i>' : '') : '<span style="color:#cbd5e1">—</span>') + '</td>' +
                    '<td style="padding:10px 12px;color:#64748b">' + getLastPaid(t.id) + '</td>' +
                    '<td style="padding:10px 12px;text-align:center">' +
                      '<button class="btn btn-primary btn-sm" onclick="accProcessSalary(\'' + t.id + '\')"><i class="fas fa-money-check-alt"></i> Process Salary</button>' +
                    '</td>' +
                    '</tr>';
                }).join('')}
              </tbody>
            </table></div>`}
      </div>

      <div style="background:#fff;border-radius:16px;padding:20px;box-shadow:0 2px 8px rgba(0,0,0,0.06)">
        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;margin-bottom:16px">
          <h3 style="font-size:15px;font-weight:800;margin:0;color:#0F2050">
            <i class="fas fa-history" style="color:#8b5cf6;margin-right:8px"></i>Payment History
            <span style="font-size:13px;font-weight:600;color:#64748b;margin-left:8px">(${payrollFilterActive ? filteredPayments.length + ' of ' + allPayments.length : allPayments.length} records)</span>
          </h3>
          <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">
            <input id="payroll-search-inp" class="form-control" type="text" placeholder="Search by employee..." style="max-width:180px" value="${(payrollSearch||'').replace(/"/g,'&quot;')}" oninput="accSetPayrollSearch(this.value)"/>
            <input id="payroll-month-inp" class="form-control" type="month" style="max-width:150px" value="${payrollMonthFilter}" onchange="accSetPayrollMonthFilter(this.value)"/>
            ${payrollFilterActive ? '<button class="btn btn-secondary btn-sm" onclick="accClearPayrollFilters()"><i class="fas fa-times"></i> Clear</button>' : ''}
          </div>
        </div>
        ${allPayments.length === 0
          ? '<div style="text-align:center;color:#94a3b8;padding:24px;font-size:14px">No salary payments recorded yet.</div>'
          : filteredPayments.length === 0
          ? '<div style="text-align:center;color:#94a3b8;padding:24px;font-size:14px">No payments match your search/filter.</div>'
          : `<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:13px">
              <thead><tr style="background:#f8fafc;border-bottom:2px solid #e2e8f0">
                <th style="text-align:left;padding:10px 12px;color:#64748b;font-weight:700">Employee</th>
                <th style="text-align:left;padding:10px 12px;color:#64748b;font-weight:700">Month</th>
                <th style="text-align:right;padding:10px 12px;color:#64748b;font-weight:700">Basic</th>
                <th style="text-align:right;padding:10px 12px;color:#64748b;font-weight:700">Net Pay</th>
                <th style="text-align:left;padding:10px 12px;color:#64748b;font-weight:700">Mode</th>
                <th style="text-align:left;padding:10px 12px;color:#64748b;font-weight:700">Date</th>
                <th style="text-align:center;padding:10px 12px;color:#64748b;font-weight:700">Status</th>
                <th style="text-align:center;padding:10px 12px;color:#64748b;font-weight:700">Actions</th>
              </tr></thead>
              <tbody>
                ${filteredPayments.map(function(p) {
                  var t = (data.users || []).find(function(u) { return u.id === p.teacherId; });
                  var [y, m] = (p.month || '').split('-');
                  var mLabel = (['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][parseInt(m)-1]||m)+' '+y;
                  var isPaid = (p.status||'Pending') === 'Paid';
                  var statusBadge = isPaid
                    ? '<span style="background:#d1fae5;color:#065f46;padding:2px 8px;border-radius:6px;font-size:11px;font-weight:700">Paid</span>'
                    : '<span style="background:#fef3c7;color:#92400e;padding:2px 8px;border-radius:6px;font-size:11px;font-weight:700">Pending</span>';
                  var proofBadge = p.proofSubmitted ? ' <i class="fas fa-receipt" style="color:#10b981" title="Payment proof submitted — locked from accounting delete"></i>' : '';
                  var deleteBtn = p.proofSubmitted
                    ? '<button class="btn btn-secondary btn-sm" disabled title="Proof submitted — only Super Admin can delete this record" style="opacity:0.5;cursor:not-allowed"><i class="fas fa-lock"></i></button>'
                    : '<button class="btn btn-danger btn-sm" onclick="accDeletePayroll(\'' + p.id + '\')" title="Delete"><i class="fas fa-trash"></i></button>';
                  return '<tr style="border-bottom:1px solid #f1f5f9">' +
                    '<td style="padding:10px 12px;font-weight:600;color:#374151">' + (t ? t.name : '-') + '</td>' +
                    '<td style="padding:10px 12px;color:#475569">' + mLabel + '</td>' +
                    '<td style="padding:10px 12px;text-align:right;color:#374151">₹' + parseFloat(p.baseSalary||0).toLocaleString('en-IN') + '</td>' +
                    '<td style="padding:10px 12px;text-align:right;font-weight:800;color:#10b981">₹' + parseFloat(p.netAmount||0).toLocaleString('en-IN') + '</td>' +
                    '<td style="padding:10px 12px"><span style="background:#e0f2fe;color:#0369a1;padding:2px 8px;border-radius:6px;font-size:11px;font-weight:600">' + (p.paymentMode||'Bank Transfer') + '</span></td>' +
                    '<td style="padding:10px 12px;color:#64748b">' + formatDate(p.paymentDate) + '</td>' +
                    '<td style="padding:10px 12px;text-align:center">' + statusBadge + proofBadge + '</td>' +
                    '<td style="padding:10px 12px;text-align:center">' +
                      '<div style="display:flex;gap:4px;justify-content:center">' +
                      '<button class="btn btn-secondary btn-sm" onclick="accEditPayrollHistory(\'' + p.id + '\')" title="Edit payment history"><i class="fas fa-edit"></i></button>' +
                      deleteBtn +
                      '</div>' +
                    '</td>' +
                    '</tr>';
                }).join('')}
              </tbody>
            </table></div>`}
      </div>
    </div>`;

  renderLayout('acc-payroll', content, 'Staff Payroll', 'Accounting / Staff Payroll');
}

// The whole panel re-renders on every filter change (same pattern as the
// rest of this page), which recreates the search <input> — restore focus
// and caret position afterward so typing doesn't get interrupted.
window.accSetPayrollSearch = function(val) {
  window._accPayrollSearch = val;
  var prevInp = document.getElementById('payroll-search-inp');
  var caret = prevInp ? prevInp.selectionStart : null;
  renderAccPayroll();
  var inp = document.getElementById('payroll-search-inp');
  if (inp) { inp.focus(); if (caret != null) inp.setSelectionRange(caret, caret); }
};

window.accSetPayrollMonthFilter = function(val) {
  window._accPayrollMonthFilter = val;
  renderAccPayroll();
};

window.accClearPayrollFilters = function() {
  window._accPayrollSearch = '';
  window._accPayrollMonthFilter = '';
  renderAccPayroll();
};

window.accProcessSalary = function(teacherId) {
  const data = DB.get();
  const teacher = (data.users || []).find(function(u) { return u.id === teacherId; });
  if (!teacher) return;
  const today = new Date().toISOString().split('T')[0];
  const thisMonth = new Date().toISOString().slice(0, 7);
  const baseSalary = parseFloat(teacher.baseSalary || 0);

  const qrDoc = (teacher.documents || []).find(function(d) { return d.type === 'UPI QR Code'; });
  const hasBankInfo = teacher.bankName || teacher.bankAccount || teacher.ifsc || teacher.upiId || qrDoc;
  const paymentDetailsHtml = !hasBankInfo ? '' : `
    <div style="grid-column:1/-1;border:1.5px dashed #cbd5e1;border-radius:10px;padding:14px 16px;background:#f8fafc;display:flex;gap:16px;align-items:flex-start;flex-wrap:wrap">
      <div style="flex:1;min-width:200px;font-size:12px;color:#374151;line-height:1.9">
        <div style="font-weight:800;color:#0F2050;font-size:13px;margin-bottom:6px"><i class="fas fa-university" style="color:#10b981;margin-right:6px"></i>Payment Details</div>
        ${teacher.bankAccountHolder ? '<div><b>Holder:</b> ' + teacher.bankAccountHolder + '</div>' : ''}
        ${teacher.bankName ? '<div><b>Bank:</b> ' + teacher.bankName + '</div>' : ''}
        ${teacher.bankAccount ? '<div><b>A/C No.:</b> ' + teacher.bankAccount + '</div>' : ''}
        ${teacher.ifsc ? '<div><b>IFSC:</b> ' + teacher.ifsc + '</div>' : ''}
        ${teacher.upiId ? '<div><b>UPI ID:</b> ' + teacher.upiId + '</div>' : ''}
      </div>
      ${qrDoc ? '<div style="text-align:center"><img src="/r2/' + qrDoc.r2Key + '" alt="UPI QR Code" style="width:120px;height:120px;object-fit:contain;border:1px solid #e2e8f0;border-radius:8px;background:#fff"/><div style="font-size:10px;color:#64748b;margin-top:4px">Scan to pay</div></div>' : ''}
    </div>`;

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.id = 'acc-payroll-modal';
  overlay.innerHTML = `
    <div class="modal" style="max-width:520px;width:100%">
      <div class="modal-header">
        <h3 class="modal-title"><i class="fas fa-money-check-alt" style="color:#10b981;margin-right:8px"></i>Process Salary — ${teacher.name}</h3>
        <button class="btn btn-secondary btn-sm" onclick="document.getElementById('acc-payroll-modal').remove()"><i class="fas fa-times"></i></button>
      </div>
      <div class="modal-body" style="padding:24px">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
          ${paymentDetailsHtml}
          <div style="grid-column:1/-1">
            <label class="form-label">Pay Month *</label>
            <input id="pr-month" class="form-control" type="month" value="${thisMonth}"/>
          </div>
          <div>
            <label class="form-label">Basic Salary (₹) *</label>
            <input id="pr-basic" class="form-control" type="number" min="0" step="0.01" value="${baseSalary}" oninput="accCalcNetPay()"/>
          </div>
          <div>
            <label class="form-label">Set as Base Salary</label>
            <select id="pr-save-base" class="form-control">
              <option value="yes">Yes — update employee record</option>
              <option value="no">No — one-time only</option>
            </select>
          </div>
          <div>
            <label class="form-label">Allowances (₹)</label>
            <input id="pr-allow" class="form-control" type="number" min="0" step="0.01" value="0" oninput="accCalcNetPay()"/>
          </div>
          <div>
            <label class="form-label">Deductions (₹)</label>
            <input id="pr-deduct" class="form-control" type="number" min="0" step="0.01" value="0" oninput="accCalcNetPay()"/>
          </div>
          <div style="grid-column:1/-1">
            <label class="form-label">Net Pay (₹)</label>
            <input id="pr-net" class="form-control" type="text" readonly style="background:#f0fdf4;font-weight:800;font-size:16px;color:#10b981" value="${baseSalary.toFixed(2)}"/>
          </div>
          <div>
            <label class="form-label">Payment Mode</label>
            <select id="pr-mode" class="form-control">
              <option>Bank Transfer</option>
              <option>Cash</option>
              <option>Cheque</option>
              <option>UPI</option>
            </select>
          </div>
          <div>
            <label class="form-label">Payment Date *</label>
            <input id="pr-date" class="form-control" type="date" value="${today}"/>
          </div>
          <div style="grid-column:1/-1">
            <label class="form-label">Payment Status</label>
            <select id="pr-status" class="form-control">
              <option value="Pending">Pending — not yet transferred</option>
              <option value="Paid">Paid — already transferred</option>
            </select>
          </div>
          <div style="grid-column:1/-1">
            <label class="form-label">Remarks</label>
            <textarea id="pr-remarks" class="form-control" rows="2" placeholder="Optional remarks..."></textarea>
          </div>
        </div>
      </div>
      <div class="modal-footer" style="padding:16px 24px;display:flex;justify-content:flex-end;gap:12px;border-top:1px solid #e2e8f0">
        <button class="btn btn-secondary" onclick="document.getElementById('acc-payroll-modal').remove()">Cancel</button>
        <button class="btn btn-primary" onclick="accSavePayroll('${teacherId}')"><i class="fas fa-save"></i> Process Payment</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);
  overlay.addEventListener('click', function(e) { if (e.target === overlay) overlay.remove(); });
};

window.accCalcNetPay = function() {
  var basic = parseFloat(document.getElementById('pr-basic').value) || 0;
  var allow = parseFloat(document.getElementById('pr-allow').value) || 0;
  var deduct = parseFloat(document.getElementById('pr-deduct').value) || 0;
  var net = basic + allow - deduct;
  var el = document.getElementById('pr-net');
  if (el) el.value = net.toFixed(2);
};

window.accSavePayroll = function(teacherId) {
  const user = Session.current();
  var month = document.getElementById('pr-month').value;
  var baseSalary = parseFloat(document.getElementById('pr-basic').value) || 0;
  var allowances = parseFloat(document.getElementById('pr-allow').value) || 0;
  var deductions = parseFloat(document.getElementById('pr-deduct').value) || 0;
  var netAmount = baseSalary + allowances - deductions;
  var paymentMode = document.getElementById('pr-mode').value;
  var paymentDate = document.getElementById('pr-date').value;
  var remarks = (document.getElementById('pr-remarks').value || '').trim();
  var saveBase = document.getElementById('pr-save-base').value;
  var status = document.getElementById('pr-status') ? document.getElementById('pr-status').value : 'Pending';

  if (!month) { showToast('Pay month is required', 'error'); return; }
  if (!paymentDate) { showToast('Payment date is required', 'error'); return; }
  if (baseSalary <= 0) { showToast('Basic salary must be greater than 0', 'error'); return; }

  var payment = {
    id: 'sp_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
    teacherId: teacherId,
    month: month,
    baseSalary: baseSalary,
    allowances: allowances,
    deductions: deductions,
    netAmount: netAmount,
    paymentMode: paymentMode,
    paymentDate: paymentDate,
    remarks: remarks,
    status: status,
    transactionId: '',
    screenshotKey: '',
    proofSubmitted: false,
    paidBy: user ? user.id : '',
    createdAt: new Date().toISOString()
  };

  var savePromise = DB.addSalaryPayment(payment);
  if (saveBase === 'yes') { DB.updateUser(teacherId, { baseSalary: baseSalary }); }

  var modal = document.getElementById('acc-payroll-modal');
  if (modal) modal.remove();
  showToast('Salary processed for ' + month + '!', 'success');
  renderAccPayroll();

  if (status === 'Paid' && savePromise && savePromise.then) {
    savePromise.then(function() { _accNotifyPaid(payment.id); });
  }
};

// Emails the teacher a "salary paid" confirmation. Safe to call anytime a
// record is (re)confirmed as Paid — the server only sends once per record
// (stamps paidNotifiedAt) so repeat calls for an already-notified payment
// are cheap no-ops from the UI's perspective; skip proactively where we
// already know it was sent to avoid the extra round trip.
window._accNotifyPaid = function(id) {
  fetch('/api/salary-payments/' + id + '/notify', { method: 'POST', headers: _accAuthHdr() })
    .then(function(r) { return r.json(); })
    .then(function(res) {
      if (res.sent) showToast('Teacher notified by email.', 'success');
      else if (res.noEmail) showToast('Marked Paid, but teacher has no email on file — notification skipped.', 'info');
      else if (res.notConfigured) { /* Resend not set up — silent, not the teacher's/accountant's problem to fix here */ }
      else if (res.error) showToast('Could not email teacher: ' + res.error, 'error');
    })
    .catch(function() {});
};

window.accDeletePayroll = function(id) {
  var p = DB.getSalaryPayments(null).find(function(x) { return x.id === id; });
  if (p && p.proofSubmitted) {
    showToast('This payment has a submitted proof of payment — only a Super Admin can delete it.', 'error');
    return;
  }
  var data = DB.get();
  var t = p ? (data.users || []).find(function(u) { return u.id === p.teacherId; }) : null;
  var [y, m] = p ? (p.month || '').split('-') : [];
  var mLabel = p ? (['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][parseInt(m)-1]||m)+' '+y : '';
  var detail = (t ? ' for ' + t.name : '') + (mLabel ? ' (' + mLabel + ')' : '');
  confirmDialog('Delete this salary payment record' + detail + '? This cannot be undone.', function() {
    DB.deleteSalaryPayment(id);
    showToast('Payment record deleted', 'success');
    renderAccPayroll();
  });
};

window.accEditPayrollHistory = function(id) {
  var p = DB.getSalaryPayments(null).find(function(x) { return x.id === id; });
  if (!p) return;
  var data = DB.get();
  var t = (data.users || []).find(function(u) { return u.id === p.teacherId; });
  window._peScreenshotKey = p.screenshotKey || '';
  window._peAlreadyNotified = !!p.paidNotifiedAt;

  var screenshotPreviewHtml = p.screenshotKey
    ? '<div id="pe-shot-prev" style="display:flex;align-items:center;gap:6px;padding:5px 8px;background:#d1fae5;border-radius:6px;font-size:11px;font-weight:700;color:#065f46">' +
      '<i class="fas fa-check-circle"></i>&nbsp;Screenshot on file &nbsp;<a href="/r2/' + p.screenshotKey + '" target="_blank" style="color:#065f46;font-size:10px;font-weight:700;text-decoration:underline">[view]</a>' +
      '</div>'
    : '<div id="pe-shot-prev" style="display:none"></div>';

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.id = 'acc-payedit-modal';
  overlay.innerHTML = `
    <div class="modal" style="max-width:480px;width:100%">
      <div class="modal-header">
        <h3 class="modal-title"><i class="fas fa-edit" style="color:#8b5cf6;margin-right:8px"></i>Edit Payment History — ${t ? t.name : ''}</h3>
        <button class="btn btn-secondary btn-sm" onclick="document.getElementById('acc-payedit-modal').remove()"><i class="fas fa-times"></i></button>
      </div>
      <div class="modal-body" style="padding:24px">
        ${p.proofSubmitted ? '<div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:10px 14px;margin-bottom:16px;font-size:12px;color:#065f46"><i class="fas fa-shield-alt" style="margin-right:6px"></i>Proof of payment already submitted for this record. You can still edit it, but only a Super Admin can delete it.</div>' : ''}
        <div style="display:grid;gap:16px">
          <div>
            <label class="form-label">Payment Status</label>
            <select id="pe-status" class="form-control">
              <option value="Pending"${(p.status||'Pending')==='Pending'?' selected':''}>Pending — not yet transferred</option>
              <option value="Paid"${p.status==='Paid'?' selected':''}>Paid — already transferred</option>
            </select>
          </div>
          <div>
            <label class="form-label">Transaction ID</label>
            <input id="pe-txnid" class="form-control" type="text" placeholder="e.g. UPI/Bank reference number" value="${(p.transactionId||'').replace(/"/g,'&quot;')}"/>
          </div>
          <div>
            <label class="form-label" style="font-size:12px">Payment Screenshot</label>
            <div style="border:1.5px dashed #cbd5e1;border-radius:8px;padding:8px 10px;background:#fafbfc;display:flex;flex-direction:column;gap:6px">
              ${screenshotPreviewHtml}
              <label style="display:flex;align-items:center;gap:7px;cursor:pointer;font-size:12px;color:#475569;margin:0">
                <i class="fas fa-paperclip" style="color:#6366f1;font-size:13px;flex-shrink:0"></i>
                <span id="pe-shot-label" style="flex:1">${p.screenshotKey ? 'Replace screenshot...' : 'Choose image...'}</span>
                <input type="file" id="pe-shot-input" accept="image/*" onchange="_peUploadScreenshot(this)" style="display:none">
              </label>
            </div>
          </div>
        </div>
      </div>
      <div class="modal-footer" style="padding:16px 24px;display:flex;justify-content:flex-end;gap:12px;border-top:1px solid #e2e8f0">
        <button class="btn btn-secondary" onclick="document.getElementById('acc-payedit-modal').remove()">Cancel</button>
        <button class="btn btn-primary" onclick="accSavePayrollEdit('${id}')"><i class="fas fa-save"></i> Submit</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);
  overlay.addEventListener('click', function(e) { if (e.target === overlay) overlay.remove(); });
};

window._peUploadScreenshot = function(inputEl) {
  var file = inputEl.files[0];
  if (!file) return;
  if (file.size > 10 * 1024 * 1024) { showToast('File must be under 10MB.', 'error'); inputEl.value = ''; return; }
  var prev = document.getElementById('pe-shot-prev');
  var lbl = document.getElementById('pe-shot-label');
  if (prev) {
    prev.style.cssText = 'display:flex;align-items:center;gap:6px;padding:5px 8px;background:#fef3c7;border-radius:6px;font-size:11px;font-weight:700;color:#92400e';
    prev.innerHTML = '<i class="fas fa-spinner" style="animation:spin 1s linear infinite"></i>&nbsp;Uploading ' + file.name + '...';
  }
  if (lbl) lbl.textContent = 'Uploading...';
  var formData = new FormData();
  formData.append('file', file);
  fetch('/api/upload?folder=salary-proofs', { method: 'POST', headers: _accAuthHdr(), body: formData })
    .then(function(r) { return r.json(); })
    .then(function(res) {
      if (res.error) throw new Error(res.error);
      window._peScreenshotKey = res.key;
      if (prev) {
        prev.style.cssText = 'display:flex;align-items:center;gap:6px;padding:5px 8px;background:#d1fae5;border-radius:6px;font-size:11px;font-weight:700;color:#065f46';
        prev.innerHTML = '<i class="fas fa-check-circle"></i>&nbsp;' + file.name + ' &nbsp;<a href="/r2/' + res.key + '" target="_blank" style="color:#065f46;font-size:10px;text-decoration:underline">[view]</a>';
      }
      if (lbl) lbl.textContent = 'Replace screenshot...';
    })
    .catch(function(err) {
      if (prev) {
        prev.style.cssText = 'display:flex;align-items:center;gap:6px;padding:5px 8px;background:#fee2e2;border-radius:6px;font-size:11px;font-weight:700;color:#991b1b';
        prev.innerHTML = '<i class="fas fa-times-circle"></i>&nbsp;Upload failed: ' + (err.message||'Check connection');
      }
      if (lbl) lbl.textContent = 'Choose image...';
      inputEl.value = '';
    });
};

window.accSavePayrollEdit = function(id) {
  var status = document.getElementById('pe-status').value;
  var transactionId = (document.getElementById('pe-txnid').value || '').trim();
  var user = Session.current();
  var updates = {
    status: status,
    transactionId: transactionId,
    screenshotKey: window._peScreenshotKey || '',
    updatedAt: new Date().toISOString(),
    updatedBy: user ? user.id : ''
  };
  if (status === 'Paid') updates.proofSubmitted = true;
  var shouldNotify = status === 'Paid' && !window._peAlreadyNotified;

  var savePromise = DB.updateSalaryPayment(id, updates);
  var modal = document.getElementById('acc-payedit-modal');
  if (modal) modal.remove();
  showToast('Payment history updated!', 'success');
  window._peScreenshotKey = null;
  window._peAlreadyNotified = null;
  renderAccPayroll();

  if (shouldNotify && savePromise && savePromise.then) {
    savePromise.then(function() { _accNotifyPaid(id); });
  }
};

// ---- Route Registration ----
registerRoute('acc-dashboard', renderAccDashboard);
registerRoute('acc-fees', renderAccFees);
registerRoute('acc-payroll', renderAccPayroll);
registerRoute('acc-purchase', renderAccPurchase);
registerRoute('acc-expenses', renderAccExpenses);
