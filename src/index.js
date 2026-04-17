import express from 'express';

const app = express();

// Use JSON middleware
app.use(express.json());

// Root route
app.get('/', (req, res) => {
	// res.json({ message: 'Hello from MatchDayLive' });
    res.send('Hello from MatchDayLive');
});

const PORT = 8000;

app.listen(PORT, () => {
	console.log(`Server running at http://localhost:${PORT}/`);
});
