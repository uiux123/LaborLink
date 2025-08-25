const Labor = require('../models/Labor');
const bcrypt = require('bcrypt');

/* =========================================
   Helpers
   ========================================= */
const escapeRegex = (str = '') =>
  str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const buildSort = (sort = 'recent') => {
  switch (sort) {
    case 'rateAsc':  return { dailyRate: 1,  createdAt: -1 };
    case 'rateDesc': return { dailyRate: -1, createdAt: -1 };
    case 'nameAsc':  return { name: 1 };
    case 'nameDesc': return { name: -1 };
    default:         return { createdAt: -1 }; // recent
  }
};

const toNumberOrUndefined = (v) => {
  if (v === undefined || v === null || v === '') return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
};

/* =========================================
   POST /api/laborlink/register/labor
   ========================================= */
const registerLabor = async (req, res) => {
  try {
    let {
      name,
      username,
      password,
      email,
      address,
      phone,
      location,       // optional in request; we’ll derive if missing
      ageCategory,
      skillCategory,
      dailyRate       // optional
    } = req.body;

    // Normalize strings
    name         = name?.toString().trim();
    username     = username?.toString().toLowerCase().trim();
    password     = password?.toString();
    email        = email?.toString().toLowerCase().trim();
    address      = address?.toString().trim();
    phone        = phone?.toString().trim();
    location     = location?.toString().trim();
    ageCategory  = ageCategory?.toString();
    skillCategory= skillCategory?.toString();
    dailyRate    = toNumberOrUndefined(dailyRate);

    // If location not provided, derive from address (quick backend hotfix)
    if (!location && address) {
      // simple heuristic: take first token before a comma, or the whole address
      const token = address.split(',')[0].trim();
      if (token) location = token;
    }

    // Validate required fields one by one for better feedback
    const missing = [];
    if (!name)         missing.push('name');
    if (!username)     missing.push('username');
    if (!password)     missing.push('password');
    if (!email)        missing.push('email');
    if (!address)      missing.push('address');
    if (!phone)        missing.push('phone');
    if (!location)     missing.push('location'); // after derivation, still required
    if (!ageCategory)  missing.push('ageCategory');
    if (!skillCategory)missing.push('skillCategory');

    if (missing.length) {
      return res.status(400).json({ error: `Missing required field(s): ${missing.join(', ')}` });
    }

    // Uniqueness checks
    const [existingUser, existingEmail] = await Promise.all([
      Labor.findOne({ username }),
      Labor.findOne({ email }),
    ]);
    if (existingUser) return res.status(400).json({ error: 'Username already exists' });
    if (existingEmail) return res.status(400).json({ error: 'Email already exists' });

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create and save new labor user (isActive defaults to true in model)
    const newLabor = new Labor({
      name,
      username,
      password: hashedPassword,
      email,
      address,
      phone,
      location,
      ageCategory,
      skillCategory,
      ...(dailyRate !== undefined && { dailyRate })
    });

    await newLabor.save();

    res.status(201).json({ message: 'Labor registered successfully' });
  } catch (err) {
    console.error('Error registering labor:', err);
    res.status(500).json({ error: 'Labor registration failed' });
  }
};

/* =========================================
   GET /api/laborlink/labor/dashboard
   ========================================= */
const getLaborDashboardData = async (req, res) => {
  try {
    const laborId = req.user.id;

    const labor = await Labor.findById(laborId)
      .select('-password -verificationCode -codeExpiresAt');
    if (!labor) {
      return res.status(404).json({ error: 'Labor not found' });
    }

    res.status(200).json({
      message: 'Welcome to the Labor Dashboard',
      labor
    });
  } catch (err) {
    console.error('Error fetching labor dashboard:', err);
    res.status(500).json({ error: 'Failed to load labor dashboard' });
  }
};

/* =========================================
   PUT /api/laborlink/labors/update
   ========================================= */
const updateLabor = async (req, res) => {
  try {
    let {
      _id,
      name,
      email,
      username,
      address,
      phone,
      location,          // optional
      ageCategory,
      skillCategory,
      dailyRate,
      isActive           // visibility toggle
    } = req.body;

    if (!_id) return res.status(400).json({ success: false, error: 'Labor _id is required' });

    // Normalize
    name      = name      != null ? String(name).trim()                   : undefined;
    email     = email     != null ? String(email).toLowerCase().trim()   : undefined;
    username  = username  != null ? String(username).toLowerCase().trim() : undefined;
    address   = address   != null ? String(address).trim()                : undefined;
    phone     = phone     != null ? String(phone).trim()                  : undefined;
    location  = location  != null ? String(location).trim()               : undefined;
    dailyRate = toNumberOrUndefined(dailyRate);

    // Build safe update payload (no password updates here)
    const update = {
      ...(name !== undefined && { name }),
      ...(email !== undefined && { email }),
      ...(username !== undefined && { username }),
      ...(address !== undefined && { address }),
      ...(phone !== undefined && { phone }),
      ...(location !== undefined && { location }),
      ...(ageCategory != null && { ageCategory }),
      ...(skillCategory != null && { skillCategory }),
      ...(dailyRate !== undefined && { dailyRate }),
      ...(typeof isActive === 'boolean' && { isActive })
    };

    // If client intentionally cleared location but has address, derive it to keep consistent
    if ((!update.location || update.location === '') && update.address) {
      const token = update.address.split(',')[0].trim();
      if (token) update.location = token;
    }

    const updatedLabor = await Labor.findByIdAndUpdate(
      _id,
      update,
      { new: true, runValidators: true, projection: { password: 0, verificationCode: 0, codeExpiresAt: 0 } }
    );

    if (!updatedLabor) {
      return res.status(404).json({ success: false, error: 'Labor not found' });
    }

    res.json({ success: true, updatedLabor });
  } catch (error) {
    console.error('Update labor error:', error);
    res.status(500).json({ success: false, error: 'Failed to update details' });
  }
};

/* =========================================
   DELETE /api/laborlink/labors/delete/:id
   ========================================= */
const deleteLabor = async (req, res) => {
  try {
    const deleted = await Labor.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ success: false, error: 'Labor not found' });

    res.json({ success: true, message: 'Account deleted successfully' });
  } catch (error) {
    console.error('Delete labor error:', error);
    res.status(500).json({ success: false, error: 'Failed to delete account' });
  }
};

/* =========================================
   GET /api/laborlink/labors
   (Customer-protected)
   ========================================= */
const listLabors = async (req, res) => {
  try {
    const {
      location = '',
      skillCategory = '',
      ageCategory = '',
      search = '',
      page = 1,
      pageSize = 12,
      sort = 'recent'
    } = req.query;

    const pageNum = Math.max(parseInt(page, 10) || 1, 1);
    const limit   = Math.min(Math.max(parseInt(pageSize, 10) || 12, 1), 100);
    const skip    = (pageNum - 1) * limit;

    const and = [];

    // Always restrict listing to active labors for customers
    and.push({ isActive: true });

    if (location) {
      and.push({ location: { $regex: escapeRegex(location), $options: 'i' } });
    }
    if (skillCategory) {
      and.push({ skillCategory: { $regex: `^${escapeRegex(skillCategory)}$`, $options: 'i' } });
    }
    if (ageCategory) {
      and.push({ ageCategory: { $regex: `^${escapeRegex(ageCategory)}$`, $options: 'i' } });
    }

    if (search) {
      const rx = new RegExp(escapeRegex(search), 'i');
      and.push({
        $or: [
          { name: rx },
          { location: rx },
          { address: rx },
          { skillCategory: rx }
        ]
      });
    }

    const filter = and.length ? { $and: and } : {};

    const [total, records] = await Promise.all([
      Labor.countDocuments(filter),
      Labor.find(filter)
        .select('-password -verificationCode -codeExpiresAt')
        .sort(buildSort(sort))
        .skip(skip)
        .limit(limit)
    ]);

    const totalPages = Math.ceil(total / limit) || 1;

    res.json({
      data: records,
      page: pageNum,
      pageSize: limit,
      total,
      totalPages
    });
  } catch (error) {
    console.error('List labors error:', error);
    res.status(500).json({ error: 'Failed to fetch labors' });
  }
};

module.exports = {
  registerLabor,
  getLaborDashboardData,
  updateLabor,
  deleteLabor,
  listLabors
};
