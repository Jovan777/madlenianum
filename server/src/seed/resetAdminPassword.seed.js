require("dotenv").config();

const connectDB = require("../config/db");
const AdminUser = require("../models/AdminUser");

const resetAdminPassword = async () => {
  try {
    await connectDB();

    const email = "marketing@madlenianum.rs";
    const newPassword = "Admin123!";

    const admin = await AdminUser.findOne({
      email: email.toLowerCase().trim(),
    }).select("+passwordHash");

    if (!admin) {
      console.log("Admin korisnik nije pronađen.");
      process.exit(1);
    }

    admin.passwordHash = await AdminUser.hashPassword(newPassword);
    admin.status = "active";

    await admin.save();

    console.log("Admin lozinka je resetovana.");
    console.log({
      email: admin.email,
      username: admin.username,
      status: admin.status,
    });

    process.exit(0);
  } catch (error) {
    console.error("Greška pri resetovanju lozinke:");
    console.error(error);
    process.exit(1);
  }
};

resetAdminPassword();