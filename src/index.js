import express from 'express';
import { matchRouter } from './routes/matches.js';

const app = express();
const PORT = 8000;

// Use JSON middleware
app.use(express.json());

// Root route
app.get('/', (req, res) => {
	// res.json({ message: 'Hello from MatchDayLive' });
    res.send('Hello from MatchDayLive');
});

app.use('/matches', matchRouter)


app.listen(PORT, () => {
	console.log(`Server running at http://localhost:${PORT}/`);
});
