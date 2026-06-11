const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../../.env") });

const connectDB = require("../config/db");
const AdminUser = require("../models/AdminUser");

const seedAdmin = async () => {
  try {
    await connectDB();

    const username = process.env.ADMIN_USERNAME || "mdleditor";
    const email = process.env.ADMIN_EMAIL || "marketing@madlenianum.rs";
    const password = process.env.ADMIN_PASSWORD || "Admin123!";
    const normalizedEmail = email.toLowerCase().trim();
    const passwordHash = await AdminUser.hashPassword(password);

    let admin = await AdminUser.findOne({ email: normalizedEmail }).select("+passwordHash");

    if (admin) {
      admin.username = username;
      admin.passwordHash = passwordHash;
      admin.role = "administrator";
      admin.status = "active";
      admin.language = "sr";
    } else {
      admin = new AdminUser({
        username,
        email: normalizedEmail,
        passwordHash,
        role: "administrator",
        status: "active",
        language: "sr",
      });
    }

    await admin.save();

    console.log("Admin user is ready:");
    console.log({
      id: admin._id.toString(),
      username: admin.username,
      email: admin.email,
      role: admin.role,
      status: admin.status,
      language: admin.language,
      collection: AdminUser.collection.name,
    });

    process.exit(0);
  } catch (error) {
    console.error("Failed to seed admin user:");
    console.error(error);
    process.exit(1);
  }
};

seedAdmin();
