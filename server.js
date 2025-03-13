const express = require('express');
const mysql = require('mysql2');
const bodyParser = require('body-parser');
const path = require('path');
const app = express();
const port = 3000;

// Body-parser middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

// MySQL database connection
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'ak@123452006',
    database: 'SignIn'
});

db.connect((err) => {
    if (err) throw err;
    console.log('Connected to database');
});

// Route for handling sign-up
app.post('/signup', (req, res) => {
    const { fullname, email, phone, password } = req.body;
    const sql = 'INSERT INTO users (fullname, email, phone, password) VALUES (?, ?, ?, ?)';

    db.query(sql, [fullname, email, phone, password], (err, result) => {
        if (err) throw err;
        res.redirect('/Homepage.html');
    });
});

// Start the server
app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});
