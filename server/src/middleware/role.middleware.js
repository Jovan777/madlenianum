const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.admin || !roles.includes(req.admin.role)) {
      res.status(403);
      throw new Error("Nemate dozvolu za ovu akciju.");
    }

    next();
  };
};

module.exports = requireRole;