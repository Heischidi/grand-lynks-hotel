// =============================================================================
// FINANCIAL MODULE — PIN, Expenses, Other Income, Summary, Baseline
// =============================================================================
// This file is appended to api/index.js at deploy time via financeRoutes.js

const FINANCE_PIN_KEY = 'finance_pin';

async function getFinancePinHash(prisma) {
  let setting = await prisma.siteSettings.findUnique({ where: { key: FINANCE_PIN_KEY } });
  if (!setting) {
    const bcrypt = require('bcryptjs');
    const defaultHash = await bcrypt.hash('0000', 10);
    setting = await prisma.siteSettings.create({
      data: { key: FINANCE_PIN_KEY, value: defaultHash, type: 'text', category: 'security', description: 'Finance page PIN (bcrypt hash)' }
    });
  }
  return setting.value;
}

module.exports = function registerFinanceRoutes(app, prisma, authenticateSuperAdmin, bcrypt, multer, uploadToSupabase) {

  // POST /finance/verify-pin
  app.post('/finance/verify-pin', authenticateSuperAdmin, async (req, res) => {
    try {
      const { pin } = req.body;
      if (!pin) return res.status(400).json({ error: 'PIN is required' });
      const hash = await getFinancePinHash(prisma);
      const ok = await bcrypt.compare(String(pin), hash);
      res.json({ ok });
    } catch (err) {
      console.error('Finance verify-pin error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // PUT /finance/change-pin
  app.put('/finance/change-pin', authenticateSuperAdmin, async (req, res) => {
    try {
      const { oldPin, newPin } = req.body;
      if (!oldPin || !newPin) return res.status(400).json({ error: 'oldPin and newPin required' });
      if (String(newPin).length < 4) return res.status(400).json({ error: 'New PIN must be at least 4 digits' });
      const hash = await getFinancePinHash(prisma);
      const valid = await bcrypt.compare(String(oldPin), hash);
      if (!valid) return res.status(403).json({ error: 'Incorrect current PIN' });
      const newHash = await bcrypt.hash(String(newPin), 10);
      await prisma.siteSettings.upsert({
        where: { key: FINANCE_PIN_KEY },
        update: { value: newHash },
        create: { key: FINANCE_PIN_KEY, value: newHash, type: 'text', category: 'security', description: 'Finance page PIN (bcrypt hash)' }
      });
      res.json({ message: 'PIN changed successfully' });
    } catch (err) {
      console.error('Finance change-pin error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // GET /finance/summary
  app.get('/finance/summary', authenticateSuperAdmin, async (req, res) => {
    try {
      const { from, to, month, year } = req.query;
      let dateFilter = {};
      if (from || to) {
        if (from) dateFilter.gte = new Date(from);
        if (to) { const t = new Date(to); t.setHours(23, 59, 59, 999); dateFilter.lte = t; }
      } else if (month && year) {
        const m = parseInt(month) - 1; const y = parseInt(year);
        dateFilter = { gte: new Date(y, m, 1), lt: new Date(y, m + 1, 1) };
      } else if (year) {
        const y = parseInt(year);
        dateFilter = { gte: new Date(y, 0, 1), lt: new Date(y + 1, 0, 1) };
      }
      const hasDF = Object.keys(dateFilter).length > 0;
      const bookingWhere = { deletedAt: null, status: { in: ['confirmed', 'checked-in', 'checked-out', 'completed'] }, ...(hasDF ? { createdAt: dateFilter } : {}) };
      const orderWhere   = { deletedAt: null, status: { in: ['delivered', 'completed', 'ready'] },                  ...(hasDF ? { createdAt: dateFilter } : {}) };
      const finWhere     = hasDF ? { date: dateFilter } : {};

      const [bookings, orders, expenses, otherIncome] = await Promise.all([
        prisma.booking.findMany({ where: bookingWhere, select: { totalAmount: true, createdAt: true } }),
        prisma.order.findMany({ where: orderWhere, select: { totalAmount: true, createdAt: true } }),
        prisma.expense.findMany({ where: finWhere, orderBy: { date: 'desc' } }),
        prisma.otherIncome.findMany({ where: finWhere, orderBy: { date: 'desc' } })
      ]);

      const bookingIncome = bookings.reduce((s, b) => s + (b.totalAmount || 0), 0);
      const orderIncome   = orders.reduce((s, o) => s + (o.totalAmount || 0), 0);
      const otherIncTotal = otherIncome.reduce((s, i) => s + (i.amount || 0), 0);
      const totalIncome   = bookingIncome + orderIncome + otherIncTotal;
      const totalExpenses = expenses.reduce((s, e) => s + (e.amount || 0), 0);
      const netProfitLoss = totalIncome - totalExpenses;
      const expenseByCategory = {};
      expenses.forEach(e => { expenseByCategory[e.category] = (expenseByCategory[e.category] || 0) + e.amount; });

      res.json({ bookingIncome, orderIncome, otherIncomeTotal: otherIncTotal, totalIncome, totalExpenses, netProfitLoss, expenseByCategory, bookingCount: bookings.length, orderCount: orders.length });
    } catch (err) {
      console.error('Finance summary error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // GET /finance/monthly-summary
  app.get('/finance/monthly-summary', authenticateSuperAdmin, async (req, res) => {
    try {
      const year = parseInt(req.query.year) || new Date().getFullYear();
      const gte = new Date(year, 0, 1); const lt = new Date(year + 1, 0, 1);
      const [bookings, orders, expenses, otherIncome] = await Promise.all([
        prisma.booking.findMany({ where: { deletedAt: null, status: { in: ['confirmed','checked-in','checked-out','completed'] }, createdAt: { gte, lt } }, select: { totalAmount: true, createdAt: true } }),
        prisma.order.findMany({ where: { deletedAt: null, status: { in: ['delivered','completed','ready'] }, createdAt: { gte, lt } }, select: { totalAmount: true, createdAt: true } }),
        prisma.expense.findMany({ where: { date: { gte, lt } }, select: { amount: true, date: true } }),
        prisma.otherIncome.findMany({ where: { date: { gte, lt } }, select: { amount: true, date: true } })
      ]);
      const months = Array.from({ length: 12 }, (_, i) => ({
        month: i + 1, label: new Date(year, i, 1).toLocaleString('default', { month: 'long' }),
        bookingIncome: 0, orderIncome: 0, otherIncome: 0, expenses: 0
      }));
      bookings.forEach(b   => { months[new Date(b.createdAt).getMonth()].bookingIncome += b.totalAmount || 0; });
      orders.forEach(o     => { months[new Date(o.createdAt).getMonth()].orderIncome   += o.totalAmount || 0; });
      expenses.forEach(e   => { months[new Date(e.date).getMonth()].expenses           += e.amount || 0; });
      otherIncome.forEach(i=> { months[new Date(i.date).getMonth()].otherIncome        += i.amount || 0; });
      months.forEach(m => { m.totalIncome = m.bookingIncome + m.orderIncome + m.otherIncome; m.netProfitLoss = m.totalIncome - m.expenses; });
      res.json({ year, months });
    } catch (err) {
      console.error('Finance monthly-summary error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // GET /finance/yearly-summary
  app.get('/finance/yearly-summary', authenticateSuperAdmin, async (req, res) => {
    try {
      const [fb, fe, fi] = await Promise.all([
        prisma.booking.findFirst({ orderBy: { createdAt: 'asc' }, select: { createdAt: true } }),
        prisma.expense.findFirst({ orderBy: { date: 'asc' }, select: { date: true } }),
        prisma.otherIncome.findFirst({ orderBy: { date: 'asc' }, select: { date: true } })
      ]);
      const dates = [fb?.createdAt, fe?.date, fi?.date].filter(Boolean);
      if (dates.length === 0) return res.json({ years: [] });
      const startYear = Math.min(...dates.map(d => new Date(d).getFullYear()));
      const currentYear = new Date().getFullYear();
      const years = [];
      for (let y = startYear; y <= currentYear; y++) {
        const gte = new Date(y, 0, 1); const lt = new Date(y + 1, 0, 1);
        const [b, o, e, oi] = await Promise.all([
          prisma.booking.aggregate({ where: { deletedAt: null, status: { in: ['confirmed','checked-in','checked-out','completed'] }, createdAt: { gte, lt } }, _sum: { totalAmount: true } }),
          prisma.order.aggregate({ where: { deletedAt: null, status: { in: ['delivered','completed','ready'] }, createdAt: { gte, lt } }, _sum: { totalAmount: true } }),
          prisma.expense.aggregate({ where: { date: { gte, lt } }, _sum: { amount: true } }),
          prisma.otherIncome.aggregate({ where: { date: { gte, lt } }, _sum: { amount: true } })
        ]);
        const bi = b._sum.totalAmount || 0; const orderI = o._sum.totalAmount || 0;
        const oiAmt = oi._sum.amount || 0; const exp = e._sum.amount || 0;
        const tot = bi + orderI + oiAmt;
        years.push({ year: y, bookingIncome: bi, orderIncome: orderI, otherIncome: oiAmt, totalIncome: tot, totalExpenses: exp, netProfitLoss: tot - exp });
      }
      res.json({ years });
    } catch (err) {
      console.error('Finance yearly-summary error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // GET /finance/baseline
  app.get('/finance/baseline', authenticateSuperAdmin, async (req, res) => {
    try {
      const firstExpense = await prisma.expense.findFirst({ orderBy: { date: 'asc' }, select: { date: true } });
      if (!firstExpense) return res.json({ ready: false, reason: 'No expense data yet' });
      const weeksOfData = (Date.now() - new Date(firstExpense.date).getTime()) / (1000 * 60 * 60 * 24 * 7);
      if (weeksOfData < 4) return res.json({ ready: false, reason: `Only ${weeksOfData.toFixed(1)} weeks of data. Baseline activates after 4 weeks.` });
      const monthsOfData = Math.max(1, weeksOfData / 4.33);
      const allExpenses = await prisma.expense.findMany({ select: { category: true, amount: true } });
      const catTotals = {};
      allExpenses.forEach(e => { catTotals[e.category] = (catTotals[e.category] || 0) + e.amount; });
      const categoryAverages = {};
      Object.entries(catTotals).forEach(([cat, total]) => { categoryAverages[cat] = Math.round(total / monthsOfData); });
      const estimatedMonthlyCost = Object.values(categoryAverages).reduce((s, v) => s + v, 0);
      const bookings = await prisma.booking.findMany({ where: { deletedAt: null, status: { in: ['confirmed','checked-in','checked-out','completed'] }, createdAt: { gte: new Date(firstExpense.date) } }, select: { createdAt: true } });
      const avgGuestsPerMonth = Math.round(bookings.length / monthsOfData);
      res.json({ ready: true, weeksOfData: Math.round(weeksOfData), monthsOfData: Math.round(monthsOfData), categoryAverages, estimatedMonthlyCost, avgGuestsPerMonth });
    } catch (err) {
      console.error('Finance baseline error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // --- EXPENSES CRUD ---

  const uploadReceipt = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => { if (file.mimetype.startsWith('image/') || file.mimetype === 'application/pdf') cb(null, true); else cb(new Error('Only images/PDFs')); } });

  app.get('/finance/expenses', authenticateSuperAdmin, async (req, res) => {
    try {
      const { from, to, category } = req.query;
      const where = {};
      if (from || to) { where.date = {}; if (from) where.date.gte = new Date(from); if (to) { const t = new Date(to); t.setHours(23,59,59,999); where.date.lte = t; } }
      if (category) where.category = category;
      res.json(await prisma.expense.findMany({ where, orderBy: { date: 'desc' } }));
    } catch (err) { res.status(500).json({ error: 'Internal server error' }); }
  });

  app.post('/finance/expenses', authenticateSuperAdmin, uploadReceipt.single('receipt'), async (req, res) => {
    try {
      const { category, amount, description, date, paymentMethod, notes } = req.body;
      if (!category || !amount || !description || !date || !paymentMethod) return res.status(400).json({ error: 'Missing required fields' });
      let receiptUrl = null;
      if (req.file) receiptUrl = await uploadToSupabase(req.file);
      res.json({ message: 'Expense recorded', expense: await prisma.expense.create({ data: { category, amount: parseFloat(amount), description, date: new Date(date), paymentMethod, receiptUrl, notes: notes || null, recordedBy: req.user.username } }) });
    } catch (err) { console.error('Create expense error:', err); res.status(500).json({ error: 'Internal server error' }); }
  });

  app.put('/finance/expenses/:id', authenticateSuperAdmin, uploadReceipt.single('receipt'), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { category, amount, description, date, paymentMethod, notes } = req.body;
      const data = {};
      if (category) data.category = category; if (amount) data.amount = parseFloat(amount);
      if (description) data.description = description; if (date) data.date = new Date(date);
      if (paymentMethod) data.paymentMethod = paymentMethod; if (notes !== undefined) data.notes = notes || null;
      if (req.file) data.receiptUrl = await uploadToSupabase(req.file);
      res.json({ message: 'Expense updated', expense: await prisma.expense.update({ where: { id }, data }) });
    } catch (err) { console.error('Update expense error:', err); res.status(500).json({ error: 'Internal server error' }); }
  });

  app.delete('/finance/expenses/:id', authenticateSuperAdmin, async (req, res) => {
    try { await prisma.expense.delete({ where: { id: parseInt(req.params.id) } }); res.json({ message: 'Expense deleted' }); }
    catch (err) { res.status(500).json({ error: 'Internal server error' }); }
  });

  // --- OTHER INCOME CRUD ---

  app.get('/finance/other-income', authenticateSuperAdmin, async (req, res) => {
    try {
      const { from, to } = req.query;
      const where = {};
      if (from || to) { where.date = {}; if (from) where.date.gte = new Date(from); if (to) { const t = new Date(to); t.setHours(23,59,59,999); where.date.lte = t; } }
      res.json(await prisma.otherIncome.findMany({ where, orderBy: { date: 'desc' } }));
    } catch (err) { res.status(500).json({ error: 'Internal server error' }); }
  });

  app.post('/finance/other-income', authenticateSuperAdmin, async (req, res) => {
    try {
      const { source, amount, description, date, guestRef } = req.body;
      if (!source || !amount || !date) return res.status(400).json({ error: 'Missing required fields: source, amount, date' });
      res.json({ message: 'Other income recorded', income: await prisma.otherIncome.create({ data: { source, amount: parseFloat(amount), description: description || null, date: new Date(date), guestRef: guestRef || null, recordedBy: req.user.username } }) });
    } catch (err) { console.error('Create other-income error:', err); res.status(500).json({ error: 'Internal server error' }); }
  });

  app.put('/finance/other-income/:id', authenticateSuperAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id); const { source, amount, description, date, guestRef } = req.body;
      const data = {};
      if (source) data.source = source; if (amount) data.amount = parseFloat(amount);
      if (description !== undefined) data.description = description || null;
      if (date) data.date = new Date(date); if (guestRef !== undefined) data.guestRef = guestRef || null;
      res.json({ message: 'Other income updated', income: await prisma.otherIncome.update({ where: { id }, data }) });
    } catch (err) { console.error('Update other-income error:', err); res.status(500).json({ error: 'Internal server error' }); }
  });

  app.delete('/finance/other-income/:id', authenticateSuperAdmin, async (req, res) => {
    try { await prisma.otherIncome.delete({ where: { id: parseInt(req.params.id) } }); res.json({ message: 'Other income deleted' }); }
    catch (err) { res.status(500).json({ error: 'Internal server error' }); }
  });
};
