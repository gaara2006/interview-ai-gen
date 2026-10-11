const express = require("express");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const Interview = require("../models/Interview");
const User = require("../models/User");
const evaluateInterview = require("../services/evaluateInterview");

const router = express.Router();

async function authenticateToken(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Authentication required. Please log in." });
  }

  if (!process.env.JWT_SECRET) {
    return res.status(500).json({ message: "Server authentication is not configured." });
  }

  try {
    const token = authHeader.slice("Bearer ".length);
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (!decoded.userId || !mongoose.isValidObjectId(decoded.userId)) {
      return res.status(401).json({ message: "Invalid login session. Please log in again." });
    }

    const userExists = await User.exists({ _id: decoded.userId });
    if (!userExists) {
      return res.status(401).json({ message: "Account not found. Please log in again." });
    }

    req.userId = decoded.userId;
    return next();
  } catch (error) {
    return res.status(401).json({ message: "Session expired or invalid. Please log in again." });
  }
}

router.use(authenticateToken);

// Dashboard metrics and recent interview practice for the authenticated user.
router.get("/dashboard", async (req, res) => {
  try {
    const userObjectId = new mongoose.Types.ObjectId(req.userId);

    const [aggregateResult, recent] = await Promise.all([
      Interview.aggregate([
        { $match: { userId: userObjectId } },
        {
          $group: {
            _id: null,
            totalSessions: { $sum: 1 },
            questionsPracticed: { $sum: { $size: "$questions" } },
            practiceSeconds: { $sum: "$durationSeconds" },
          },
        },
      ]),
      Interview.find({ userId: userObjectId })
        .sort({ completedAt: -1 })
        .limit(5)
        .select("type questions durationSeconds completedAt")
        .lean(),
    ]);

    const stats = aggregateResult[0] || {
      totalSessions: 0,
      questionsPracticed: 0,
      practiceSeconds: 0,
    };

    return res.json({
      stats: {
        totalSessions: stats.totalSessions,
        questionsPracticed: stats.questionsPracticed,
        practiceMinutes: Math.round(stats.practiceSeconds / 60),
      },
      recent: recent.map((session) => ({
        id: session._id,
        type: session.type,
        questionCount: session.questions.length,
        durationSeconds: session.durationSeconds,
        completedAt: session.completedAt,
      })),
    });
  } catch (error) {
    console.error("Dashboard stats error:", error.message);
    return res.status(500).json({ message: "Unable to load dashboard data." });
  }
});

/* GET /api/interviews/progress */
router.get("/progress", async (req, res) => {
  try {
    const userObjectId = new mongoose.Types.ObjectId(req.userId);

    const [overall, byType] = await Promise.all([
      Interview.aggregate([
        { $match: { userId: userObjectId } },
        {
          $group: {
            _id: null,
            totalSessions: { $sum: 1 },
            totalQuestions: { $sum: { $size: "$questions" } },
            totalSeconds: { $sum: "$durationSeconds" },
          },
        },
      ]),
      Interview.aggregate([
        { $match: { userId: userObjectId } },
        {
          $group: {
            _id: "$type",
            sessions: { $sum: 1 },
            questions: { $sum: { $size: "$questions" } },
            seconds: { $sum: "$durationSeconds" },
          },
        },
        { $sort: { _id: 1 } },
      ]),
    ]);

    const totals = overall[0] || {
      totalSessions: 0,
      totalQuestions: 0,
      totalSeconds: 0,
    };

    return res.json({
      totalSessions: totals.totalSessions,
      totalQuestions: totals.totalQuestions,
      totalMinutes: Math.round(totals.totalSeconds / 60),
      byType: byType.map((item) => ({
        type: item._id,
        sessions: item.sessions,
        questions: item.questions,
        minutes: Math.round(item.seconds / 60),
      })),
    });
  } catch (error) {
    console.error("Progress error:", error.message);
    return res.status(500).json({
      message: "Unable to load progress data.",
    });
  }
});

/* GET /api/interviews/history */
router.get("/history", async (req, res) => {
  try {
    const sessions = await Interview.find({
      userId: req.userId,
    })
      .select("type questions durationSeconds evaluation evaluationStatus completedAt createdAt")
      .sort({ completedAt: -1, createdAt: -1 })
      .lean();

    return res.json({ sessions });
  } catch (error) {
    console.error("Interview history error:", error.message);

    return res.status(500).json({
      message: "Unable to load interview history.",
    });
  }
});



// Save an actually completed practice session for the signed-in user.
router.post("/", async (req, res) => {
  try {
    const { type, questions, durationSeconds } = req.body;
    const allowedTypes = ["HR", "Technical", "Communication"];

    if (!allowedTypes.includes(type)) {
      return res.status(400).json({ message: "Choose a valid interview type." });
    }

    if (!Array.isArray(questions) || questions.length < 1 || questions.length > 20) {
      return res.status(400).json({ message: "The session must include 1–20 answered questions." });
    }

    const cleanedQuestions = [];
    for (const item of questions) {
      if (
        !item ||
        typeof item.question !== "string" ||
        !item.question.trim() ||
        typeof item.answer !== "string" ||
        !item.answer.trim()
      ) {
        return res.status(400).json({ message: "Please answer every question before finishing." });
      }

      if (item.question.length > 1000 || item.answer.length > 10000) {
        return res.status(400).json({ message: "A question or answer is too long." });
      }

      cleanedQuestions.push({ question: item.question.trim(), answer: item.answer.trim() });
    }

    const parsedDuration = Number(durationSeconds);
    const safeDuration = Number.isFinite(parsedDuration)
      ? Math.max(0, Math.min(Math.floor(parsedDuration), 21600))
      : 0;

    // Save answers first. If the AI provider is unavailable, the user's practice
    // session remains saved instead of being lost.
    const session = await Interview.create({
      userId: req.userId,
      type,
      questions: cleanedQuestions,
      durationSeconds: safeDuration,
      evaluationStatus: "not_configured",
      completedAt: new Date(),
    });

    if (process.env.GEMINI_API_KEY) {
      try {
        session.evaluation = await evaluateInterview(type, cleanedQuestions);
        session.evaluationStatus = "completed";
        await session.save();
      } catch (evaluationError) {
        console.error("AI interview evaluation failed:", evaluationError.message);
        session.evaluationStatus = "failed";
        try {
          await session.save();
        } catch (saveError) {
          console.error("Could not update evaluation status:", saveError.message);
        }
      }
    }

    const responseMessage = session.evaluationStatus === "completed"
      ? "Practice session saved and evaluated successfully."
      : session.evaluationStatus === "failed"
        ? "Practice session saved, but AI evaluation could not be completed."
        : "Practice session saved. Add a Gemini API key to enable AI feedback.";

    return res.status(201).json({
      message: responseMessage,
      session: {
        id: session._id,
        type: session.type,
        questionCount: session.questions.length,
        durationSeconds: session.durationSeconds,
        completedAt: session.completedAt,
        evaluationStatus: session.evaluationStatus,
        evaluation: session.evaluation || null,
      },
    });
  } catch (error) {
    console.error("Save interview session error:", error.message);
    return res.status(500).json({ message: "Unable to save this practice session." });
  }
});

module.exports = router;
