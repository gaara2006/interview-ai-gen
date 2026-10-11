const mongoose = require("mongoose");

const answerSchema = new mongoose.Schema(
  {
    question: { type: String, required: true, trim: true },
    answer: { type: String, required: true, trim: true },
  },
  { _id: false }
);

const evaluationAnswerSchema = new mongoose.Schema(
  {
    questionIndex: { type: Number, required: true, min: 0 },
    score: { type: Number, required: true, min: 0, max: 10 },
    feedback: { type: String, required: true, maxlength: 3000 },
    strengths: { type: [String], default: [] },
    improvements: { type: [String], default: [] },
    improvedAnswer: { type: String, required: true, maxlength: 3000 },
  },
  { _id: false }
);

const evaluationSchema = new mongoose.Schema(
  {
    overallScore: { type: Number, required: true, min: 0, max: 100 },
    summary: { type: String, required: true, maxlength: 3000 },
    strengths: { type: [String], default: [] },
    improvements: { type: [String], default: [] },
    answers: { type: [evaluationAnswerSchema], default: [] },
    model: { type: String, maxlength: 100 },
    evaluatedAt: { type: Date },
  },
  { _id: false }
);

const interviewSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ["HR", "Technical", "Communication"],
      required: true,
    },
    questions: {
      type: [answerSchema],
      validate: {
        validator: (value) => Array.isArray(value) && value.length > 0,
        message: "An interview must contain at least one answered question.",
      },
    },
    durationSeconds: { type: Number, min: 0, max: 21600, default: 0 },
    evaluationStatus: {
      type: String,
      enum: ["not_configured", "completed", "failed"],
      default: "not_configured",
    },
    evaluation: { type: evaluationSchema, default: null },
    completedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Interview", interviewSchema);
