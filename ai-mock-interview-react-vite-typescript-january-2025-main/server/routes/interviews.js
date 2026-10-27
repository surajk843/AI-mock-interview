const express = require("express");
const { getAuth } = require("@clerk/express");
const { db } = require("../firebase");

const router = express.Router();

const interviewsCollection = db.collection("interviews");

// Get the authenticated Clerk user ID.
const getUserId = (req) => {
  const { isAuthenticated, userId } = getAuth(req);
  return isAuthenticated && userId ? userId : null;
};

// Validate interview data.
const validateInterviewData = (data) => {
  const {
    position,
    description,
    experience,
    techStack,
    questions,
  } = data;

  return (
    typeof position === "string" &&
    position.trim().length > 0 &&
    position.length <= 200 &&
    typeof description === "string" &&
    description.trim().length > 0 &&
    description.length <= 10000 &&
    typeof experience === "number" &&
    Number.isFinite(experience) &&
    experience >= 0 &&
    experience <= 60 &&
    typeof techStack === "string" &&
    techStack.trim().length > 0 &&
    techStack.length <= 2000 &&
    Array.isArray(questions) &&
    questions.length > 0 &&
    questions.length <= 100 &&
    questions.every(
      (item) =>
        item &&
        typeof item.question === "string" &&
        item.question.trim().length > 0 &&
        typeof item.answer === "string" &&
        item.answer.trim().length > 0
    )
  );
};

// GET /api/interviews
// Retrieve interviews belonging to the authenticated user.
router.get("/", async (req, res) => {
  const userId = getUserId(req);

  if (!userId) {
    return res.status(401).json({
      error: "Unauthorized. Please sign in.",
    });
  }

  try {
    const snapshot = await interviewsCollection
      .where("userId", "==", userId)
      .get();

    const interviews = snapshot.docs.map((document) => ({
      id: document.id,
      ...document.data(),
    }));

    interviews.sort((a, b) => {
      const dateA = new Date(a.createdAt || 0).getTime();
      const dateB = new Date(b.createdAt || 0).getTime();

      return dateB - dateA;
    });

    return res.status(200).json({ interviews });
  } catch (error) {
    console.error("Fetch interviews error:", error.message);

    return res.status(500).json({
      error: "Failed to retrieve interviews.",
    });
  }
});

// GET /api/interviews/:id
// Retrieve one interview belonging to the authenticated user.
router.get("/:id", async (req, res) => {
  const userId = getUserId(req);

  if (!userId) {
    return res.status(401).json({
      error: "Unauthorized. Please sign in.",
    });
  }

  try {
    const document = await interviewsCollection.doc(req.params.id).get();

    if (!document.exists || document.data().userId !== userId) {
      return res.status(404).json({
        error: "Interview not found.",
      });
    }

    return res.status(200).json({
      interview: {
        id: document.id,
        ...document.data(),
      },
    });
  } catch (error) {
    console.error("Fetch interview error:", error.message);

    return res.status(500).json({
      error: "Failed to retrieve the interview.",
    });
  }
});

// POST /api/interviews
// Create a new interview.
router.post("/", async (req, res) => {
  const userId = getUserId(req);

  if (!userId) {
    return res.status(401).json({
      error: "Unauthorized. Please sign in.",
    });
  }

  if (!validateInterviewData(req.body)) {
    return res.status(400).json({
      error: "Invalid interview data.",
    });
  }

  try {
    const now = new Date();

    const interviewData = {
      position: req.body.position.trim(),
      description: req.body.description.trim(),
      experience: req.body.experience,
      techStack: req.body.techStack.trim(),
      questions: req.body.questions.map((item) => ({
        question: item.question.trim(),
        answer: item.answer.trim(),
      })),
      userId,
      createdAt: now,
      updatedAt: now,
    };

    const document = await interviewsCollection.add(interviewData);

    return res.status(201).json({
      message: "Interview created successfully.",
      interview: {
        id: document.id,
        ...interviewData,
      },
    });
  } catch (error) {
    console.error("Create interview error:", error.message);

    return res.status(500).json({
      error: "Failed to create the interview.",
    });
  }
});

// PUT /api/interviews/:id
// Update an existing interview belonging to the authenticated user.
router.put("/:id", async (req, res) => {
  const userId = getUserId(req);

  if (!userId) {
    return res.status(401).json({
      error: "Unauthorized. Please sign in.",
    });
  }

  if (!validateInterviewData(req.body)) {
    return res.status(400).json({
      error: "Invalid interview data.",
    });
  }

  try {
    const documentRef = interviewsCollection.doc(req.params.id);
    const document = await documentRef.get();

    if (!document.exists || document.data().userId !== userId) {
      return res.status(404).json({
        error: "Interview not found.",
      });
    }

    const updatedData = {
      position: req.body.position.trim(),
      description: req.body.description.trim(),
      experience: req.body.experience,
      techStack: req.body.techStack.trim(),
      questions: req.body.questions.map((item) => ({
        question: item.question.trim(),
        answer: item.answer.trim(),
      })),
      updatedAt: new Date(),
    };

    await documentRef.update(updatedData);

    return res.status(200).json({
      message: "Interview updated successfully.",
      interview: {
        id: document.id,
        ...document.data(),
        ...updatedData,
      },
    });
  } catch (error) {
    console.error("Update interview error:", error.message);

    return res.status(500).json({
      error: "Failed to update the interview.",
    });
  }
});

// DELETE /api/interviews/:id
// Delete an interview belonging to the authenticated user.
router.delete("/:id", async (req, res) => {
  const userId = getUserId(req);

  if (!userId) {
    return res.status(401).json({
      error: "Unauthorized. Please sign in.",
    });
  }

  try {
    const documentRef = interviewsCollection.doc(req.params.id);
    const document = await documentRef.get();

    if (!document.exists || document.data().userId !== userId) {
      return res.status(404).json({
        error: "Interview not found.",
      });
    }

    // Delete associated answers before deleting the interview.
    const answersSnapshot = await db
      .collection("userAnswers")
      .where("userId", "==", userId)
      .where("mockIdRef", "==", req.params.id)
      .get();

    // Delete answers in batches to avoid excessive individual requests.
    for (let i = 0; i < answersSnapshot.docs.length; i += 400) {
      const batch = db.batch();
      const answerDocuments = answersSnapshot.docs.slice(i, i + 400);

      answerDocuments.forEach((answerDocument) => {
        batch.delete(answerDocument.ref);
      });

      await batch.commit();
    }

    await documentRef.delete();

    return res.status(200).json({
      message: "Interview and associated answers deleted successfully.",
    });
  } catch (error) {
    console.error("Delete interview error:", error.message);

    return res.status(500).json({
      error: "Failed to delete the interview.",
    });
  }
});

module.exports = router;