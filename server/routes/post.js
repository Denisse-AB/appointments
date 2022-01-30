require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');
const { validationRules, validate } = require('../validation/validation');
const MailService = require("../mail-service");
const mailService = new MailService();

const router = express.Router();

// database
const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_DATABASE,
    password: process.env.DB_PASS,
    port: process.env.DB_PORT
});

// get
router.get('/', async (err, res) => {
    try {
        const results = await pool.query('SELECT * FROM appointments')
        res.status(200).json(results.rows)
    } catch (err) {
        if (err) throw err
    }
})

// Post
router.post('/', validationRules(), validate, (req, res) => {
    const { email, name, tel, date, selected, lang } = req.body
    var created_at = new Date().toISOString().slice(0, 19).replace('T', ' ');
    const insert = "INSERT INTO appointments (email, name, tel, date, time, created_at) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *";
    const values = [email, name, tel, date, selected, created_at];

    pool.query("SELECT COUNT(*) FROM appointments WHERE date = $1 AND time = $2", [date, selected], (err, result) => {
        if (err) throw err;

        if (result.rows[0].count >= '3') {
            res.sendStatus(202);

        } else {
            pool.query(insert, values, async (err) => {
                if (err) throw err;

                const appointment = {
                    date: date,
                    name: name,
                    time: selected
                };

                const en_mailInfo = {
                    from: '"John Doe 🧒" <company_name@example.com>',
                    to: email,
                    subject: "Greetings, Your Appointment with Company",
                    template: "appConfirmation",
                    context: appointment
                };

                const es_mailInfo = {
                    from: '"John Doe 🧒" <company_name@example.com>',
                    to: email,
                    subject: "Hola, Tu cita fue aceptada.",
                    template: "es_appConfirmation",
                    context: appointment
                };

                const mailInfo = (lang === 'en') ? en_mailInfo : es_mailInfo;

                await mailService.sendMail(mailInfo
                ).catch(err => {
                    console.log(err);
                });

                res.status(201).json({ date: date, time: selected });
            })
        }
    })
});

module.exports = router;
