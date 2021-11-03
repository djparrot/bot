import express from 'express';

const app = express();
app.all('*', (req, res) => {
    res.sendStatus(200);
});

app.listen(process.env.PORT || 3000);
