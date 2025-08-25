const jwt = require('jsonwebtoken');

// Middleware to verify JWT token and check if user is a Customer.
const verifyCustomer = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader)
    return res.status(401).json({ message: 'Access denied. No token provided.' });

  const token = authHeader.split(' ')[1];
  if (!token)
    return res.status(401).json({ message: 'Access denied. No token provided.' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (decoded.role !== 'Customer') {
      return res.status(403).json({ message: 'Forbidden: Not a Customer' });
    }

    req.user = decoded;
    next();
  } catch (err) {
    return res.status(400).json({ message: 'Invalid token.' });
  }
};

// Middleware to verify JWT token and check if user is a Labor
const verifyLabor = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader)
    return res.status(401).json({ message: 'Access denied. No token provided.' });

  const token = authHeader.split(' ')[1];
  if (!token)
    return res.status(401).json({ message: 'Access denied. No token provided.' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (decoded.role !== 'Labor') {
      return res.status(403).json({ message: 'Forbidden: Not a Labor' });
    }

    req.user = decoded;
    next();
  } catch (err) {
    return res.status(400).json({ message: 'Invalid token.' });
  }
};

// Middleware to verify JWT token and check if user is a Admin
const verifyAdmin = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ message: 'Access denied. No token provided.' });

  const token = authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Access denied. No token provided.' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.role !== 'Admin') {
      return res.status(403).json({ message: 'Forbidden: Not an Admin' });
    }
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(400).json({ message: 'Invalid token.' });
  }
};

module.exports = {
  verifyCustomer,
  verifyLabor,
  verifyAdmin
};