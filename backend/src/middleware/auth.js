const jwt = require('jsonwebtoken');

// Verify JWT token middleware
exports.authenticate = (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.header('Authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided, authorization denied' });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Add user info to request
    req.user = decoded;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token has expired' });
    }
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid token' });
    }
    res.status(401).json({ error: 'Token verification failed' });
  }
};

// Role-based authorization middleware
exports.authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: 'Access denied. Insufficient permissions.',
        requiredRoles: allowedRoles,
        userRole: req.user.role
      });
    }

    next();
  };
};

// Check if user is customer
exports.isCustomer = (req, res, next) => {
  if (!req.user || req.user.role !== 'customer') {
    return res.status(403).json({ error: 'Access denied. Customer role required.' });
  }
  next();
};

// Check if user is farmer
exports.isFarmer = (req, res, next) => {
  if (!req.user || req.user.role !== 'farmer') {
    return res.status(403).json({ error: 'Access denied. Farmer role required.' });
  }
  next();
};

// Optional authentication - doesn't fail if no token, just doesn't set req.user
exports.optionalAuth = (req, res, next) => {
  try {
    const authHeader = req.header('Authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    // Continue without authentication
    next();
  }
};
