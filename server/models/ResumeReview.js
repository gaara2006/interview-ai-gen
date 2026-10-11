const mongoose = require("mongoose");

const ResumeReviewSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    filename: { type: String, required: true, maxlength: 255 },
    score: { type: Number, required: true, min: 0, max: 100 },
    atsReadiness: { type: String, enum: ["weak", "moderate", "good"], required: true },
    summary: { type: String, required: true, maxlength: 3000 },
    skillsFound: [{ type: String, maxlength: 300 }],
    strengths: [{ type: String, maxlength: 700 }],
    improvements: [{ type: String, maxlength: 700 }],
    missingSections: [{ type: String, maxlength: 500 }],
    projectFeedback: [{ type: String, maxlength: 700 }],
    rewrittenSummary: { type: String, maxlength: 3000, default: "" },
    evaluatedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

module.exports = mongoose.models.ResumeReview || mongoose.model("ResumeReview", ResumeReviewSchema);
