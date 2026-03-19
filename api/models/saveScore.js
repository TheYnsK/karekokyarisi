import dbConnect from './utils/dbConnect.js';
import Score from './models/Score.js';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Sadece POST istekleri kabul edilir.' });
    }

    try {
        await dbConnect();
        const newScore = new Score(req.body);
        await newScore.save();
        res.status(201).json({ success: true, data: newScore });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
}