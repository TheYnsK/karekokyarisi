import dbConnect from './utils/dbConnect.js';
import Score from './models/Score.js';

export default async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ message: 'Sadece GET istekleri kabul edilir.' });
    }

    try {
        await dbConnect();
        const scores = await Score.find({})
            .sort({ totalScore: -1, totalTime: 1 })
            .limit(30);

        res.status(200).json({ success: true, data: scores });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
}