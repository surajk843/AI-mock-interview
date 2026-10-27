const express = require("express");
const { getAuth } = require("@clerk/express");
const { db } = require("../firebase");

const router = express.Router();

// POST /api/users/me
// Create or update the authenticated user's profile.
router.post("/me", async (req, res) => {
  const { isAuthenticated, userId } = getAuth(req);

  if (!isAuthenticated || !userId) {
    return res.status(401).json({
      error: "Unauthorized. Please sign in.",
    });
  }

  const { name, email, imageUrl } = req.body;

  if (
    typeof name !== "string" ||
    !name.trim() ||
    typeof email !== "string" ||
    !email.trim()
  ) {
    return res.status(400).json({
      error: "A valid name and email are required.",
    });
  }

  try {
    const userRef = db.collection("users").doc(userId);

    const userData = {
      userId,
      name: name.trim(),
      email: email.trim(),
      imageUrl: typeof imageUrl === "string" ? imageUrl : "",
      updatedAt: new Date(),
    };

    const existingUser = await userRef.get();

    if (!existingUser.exists) {
      userData.createdAt = new Date();
    }

    await userRef.set(userData, { merge: true });

    return res.status(200).json({
      message: "User profile synchronized successfully.",
      user: {
        id: userId,
        ...userData,
      },
    });
  } catch (error) {
    console.error("User profile synchronization error:", error.message);

    return res.status(500).json({
      error: "Failed to synchronize the user profile.",
    });
  }
});

module.exports = router;