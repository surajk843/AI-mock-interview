const express = require("express");
const { getAuth } = require("@clerk/express");
const { db } = require("../firebase");

const router = express.Router();

const interviewsCollection = db.collection("interviews");
const answersCollection = db.collection("userAnswers");

const getUserId = (req) => {
  const { isAuthenticated, userId } = getAuth(req);
  return isAuthenticated && userId ? userId : null;
};

// POST /api/user-answers
// Save an evaluated interview answer.
router.post("/", async (req, res) => {
  const userId = getUserId(req);

  if (!userId) {
    return res.status(401).json({
      error: "Unauthorized. Please sign in.",
    });
  }

  const {
    mockIdRef,
    question,
    correct_ans,
    user_ans,
    feedback,
    rating,
  } = req.body;

  if (
    typeof mockIdRef !== "string" ||
    !mockIdRef.trim() ||
    typeof question !== "string" ||
    !question.trim() ||
    typeof correct_ans !== "string" ||
    !correct_ans.trim() ||
    typeof user_ans !== "string" ||
    !user_ans.trim() ||
    typeof feedback !== "string" ||
    !feedback.trim() ||
    typeof rating !== "number" ||
    !Number.isFinite(rating) ||
    rating < 1 ||
    rating > 10
  ) {
    return res.status(400).json({
      error: "Invalid answer data.",
    });
  }

  if (
    mockIdRef.length > 200 ||
    question.length > 5000 ||
    correct_ans.length > 10000 ||
    user_ans.length > 10000 ||
    feedback.length > 10000
  ) {
    return res.status(400).json({
      error: "Answer data exceeds the allowed length.",
    });
  }

  try {
    // Confirm that the interview exists and belongs to this user.
    const interviewDoc = await interviewsCollection
      .doc(mockIdRef)
      .get();

    if (
      !interviewDoc.exists ||
      interviewDoc.data().userId !== userId
    ) {
      return res.status(404).json({
        error: "Interview not found.",
      });
    }

    // Ensure the submitted question belongs to this interview.
    const interviewQuestions = interviewDoc.data().questions;

    const questionExists =
      Array.isArray(interviewQuestions) &&
      interviewQuestions.some(
        (item) =>
          item.question.trim() === question.trim()
      );

    if (!questionExists) {
      return res.status(400).json({
        error: "The question does not belong to this interview.",
      });
    }

    // Prevent duplicate answers to the same question.
    const existingAnswers = await answersCollection
      .where("userId", "==", userId)
      .where("mockIdRef", "==", mockIdRef)
      .where("question", "==", question.trim())
      .limit(1)
      .get();

    if (!existingAnswers.empty) {
      return res.status(409).json({
        error: "You have already answered this question.",
      });
    }

    const answerData = {
      mockIdRef,
      question: question.trim(),
      correct_ans: correct_ans.trim(),
      user_ans: user_ans.trim(),
      feedback: feedback.trim(),
      rating,
      userId,
      createdAt: new Date(),
    };

    const answerRef = await answersCollection.add(answerData);

    return res.status(201).json({
      message: "Answer saved successfully.",
      answer: {
        id: answerRef.id,
        ...answerData,
      },
    });
  } catch (error) {
    console.error("Save answer error:", error.message);

    return res.status(500).json({
      error: "Failed to save the answer.",
    });
  }
});

// GET /api/user-answers/:interviewId
// Retrieve saved answers for one interview.
router.get("/:interviewId", async (req, res) => {
  const userId = getUserId(req);

  if (!userId) {
    return res.status(401).json({
      error: "Unauthorized. Please sign in.",
    });
  }

  const { interviewId } = req.params;

  if (!interviewId || interviewId.length > 200) {
    return res.status(400).json({
      error: "Invalid interview ID.",
    });
  }

  try {
    // Verify ownership before returning answers.
    const interviewDoc = await interviewsCollection
      .doc(interviewId)
      .get();

    if (
      !interviewDoc.exists ||
      interviewDoc.data().userId !== userId
    ) {
      return res.status(404).json({
        error: "Interview not found.",
      });
    }

    const snapshot = await answersCollection
      .where("userId", "==", userId)
      .where("mockIdRef", "==", interviewId)
      .get();

    const answers = snapshot.docs.map((document) => ({
      id: document.id,
      ...document.data(),
    }));

    return res.status(200).json({ answers });
  } catch (error) {
    console.error("Fetch answers error:", error.message);

    return res.status(500).json({
      error: "Failed to retrieve answers.",
    });
  }
});

module.exports = router;