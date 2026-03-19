import mongoose from 'mongoose';

const ScoreSchema = new mongoose.Schema({
    name: { type: String, required: true, maxlength: 18 },
    totalScore: { type: Number, required: true },
    stage1: { type: Number, required: true },
    stage2: { type: Number, required: true },
    stage3: { type: Number, required: true },
    totalTime: { type: Number, required: true },
    playedAt: { type: Date, default: Date.now }
});

// Vercel ortamında modelin tekrar tekrar derlenmesini önlemek için:
export default mongoose.models.Score || mongoose.model('Score', ScoreSchema);