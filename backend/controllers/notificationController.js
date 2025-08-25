// controllers/notificationController.js
const Notification = require('../models/Notification');

/* ------------------------------------------
   Helpers
------------------------------------------- */
const getUserId = (req) =>
  req.user?._id || req.user?.id || req.user?.userId || null;

const parseUnread = (val) => String(val).toLowerCase() === 'true';

/* ------------------------------------------
   CUSTOMER notifications
------------------------------------------- */
/**
 * GET /notifications  (Customer)
 * Optional: ?unread=true
 */
const getNotifications = async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const filter = { userId, role: 'customer' };
    if (parseUnread(req.query?.unread)) filter.read = false;

    const items = await Notification.find(filter).sort({ createdAt: -1 }).limit(100);
    return res.json({ items });
  } catch (err) {
    console.error('getNotifications error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * PUT /notifications/:id/read  (Customer)
 * Marks one as read
 */
const markAsRead = async (req, res) => {
  try {
    const userId = getUserId(req);
    const { id } = req.params;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const notif = await Notification.findOneAndUpdate(
      { _id: id, userId, role: 'customer' },
      { $set: { read: true } },
      { new: true }
    );
    if (!notif) return res.status(404).json({ error: 'Notification not found' });

    return res.json({ message: 'Marked as read', notification: notif });
  } catch (err) {
    console.error('markAsRead error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * PUT /notifications/read-all  (Customer)
 * Marks all as read
 */
const markAllAsRead = async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const result = await Notification.updateMany(
      { userId, role: 'customer', read: false },
      { $set: { read: true } }
    );

    return res.json({
      message: 'All notifications marked as read',
      modifiedCount: result?.modifiedCount ?? 0,
    });
  } catch (err) {
    console.error('markAllAsRead error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

/* ------------------------------------------
   LABOR notifications (NEW)
------------------------------------------- */
/**
 * GET /labor/notifications  (Labor)
 * Optional: ?unread=true
 */
const getLaborNotifications = async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const filter = { userId, role: 'labor' };
    if (parseUnread(req.query?.unread)) filter.read = false;

    const items = await Notification.find(filter).sort({ createdAt: -1 }).limit(100);
    return res.json({ items });
  } catch (err) {
    console.error('getLaborNotifications error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * PUT /labor/notifications/:id/read  (Labor)
 * Marks one as read
 */
const markLaborAsRead = async (req, res) => {
  try {
    const userId = getUserId(req);
    const { id } = req.params;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const notif = await Notification.findOneAndUpdate(
      { _id: id, userId, role: 'labor' },
      { $set: { read: true } },
      { new: true }
    );
    if (!notif) return res.status(404).json({ error: 'Notification not found' });

    return res.json({ message: 'Marked as read', notification: notif });
  } catch (err) {
    console.error('markLaborAsRead error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * PUT /labor/notifications/read-all  (Labor)
 * Marks all as read
 */
const markAllLaborAsRead = async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const result = await Notification.updateMany(
      { userId, role: 'labor', read: false },
      { $set: { read: true } }
    );

    return res.json({
      message: 'All labor notifications marked as read',
      modifiedCount: result?.modifiedCount ?? 0,
    });
  } catch (err) {
    console.error('markAllLaborAsRead error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = {
  // customer
  getNotifications,
  markAsRead,
  markAllAsRead,
  // labor (new)
  getLaborNotifications,
  markLaborAsRead,
  markAllLaborAsRead,
};
