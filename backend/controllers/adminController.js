const Customer = require('../models/Customer');
const Labor = require('../models/Labor');
const Admin = require('../models/Admin');

const getDashboardData = async (req, res) => {
  try {
    const customerCount = await Customer.countDocuments();
    const laborCount = await Labor.countDocuments();
    const adminCount = await Admin.countDocuments();

    res.status(200).json({
      success: true,
      adminUsername: req.user.username,
      customerCount,
      laborCount,
      adminCount,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to load admin dashboard' });
  }
};

module.exports = {
  getDashboardData
};
