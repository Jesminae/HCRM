const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const db = require('../db');
const { authMiddleware, requireRole } = require('../middleware');

// Protect all routes
router.use(authMiddleware);
router.use(requireRole(['admin']));

// Get all users
router.get('/users', async (req, res) => {
    try {
        const [users] = await db.query(`
            SELECT u.id, u.name, u.username, u.email, u.role, u.hostel_group, u.hostel_type, s.block, s.room_no 
            FROM Users u 
            LEFT JOIN Students s ON u.id = s.user_id
        `);
        res.json(users);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch users' });
    }
});

// Get Admin Dashboard Stats
router.get('/dashboard-stats', async (req, res) => {
    const { month } = req.query; // e.g. 'YYYY-MM'
    if (!month) return res.status(400).json({ error: 'Month is required' });

    try {
        // Total completely registered regular students
        const [totalRegularStudents] = await db.query(`
            SELECT u.hostel_type, s.block, COUNT(DISTINCT u.id) as count
            FROM Users u
            JOIN Students s ON u.id = s.user_id
            WHERE u.role = 'student' AND s.block IS NOT NULL
            GROUP BY u.hostel_type, s.block
        `);

        // Total completely registered temporary inmates
        const [totalTemporaryStudents] = await db.query(`
            SELECT u.hostel_type, s.block, COUNT(DISTINCT u.id) as count
            FROM Users u
            JOIN Students s ON u.id = s.user_id
            WHERE u.role = 'temporary' AND s.block IS NOT NULL
            GROUP BY u.hostel_type, s.block
        `);

        // Active students that had meals in the given month, grouped by hostel_type and block
        const [activeThisMonth] = await db.query(`
            SELECT u.hostel_type, s.block, COUNT(DISTINCT m.student_id) as count
            FROM Meals m
            JOIN Students s ON m.student_id = s.id
            JOIN Users u ON s.user_id = u.id
            WHERE m.date LIKE CONCAT(?, '%') AND u.role IN ('student', 'temporary')
            GROUP BY u.hostel_type, s.block
        `, [month]);

        res.json({
            totalRegularStudents,
            totalTemporaryStudents,
            activeThisMonth
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch dashboard stats' });
    }
});

// Add new user
router.post('/users', async (req, res) => {
    const { name, username, email, password, role, room_no, block, hostel_group, hostel_type } = req.body;
    
    if (!name || !username || !email || !password || !role) {
        return res.status(400).json({ error: 'All primary fields (including username) are required' });
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        
        const conn = await db.getConnection();
        await conn.beginTransaction();
        
        try {
            const [result] = await conn.query(
                'INSERT INTO Users (name, username, email, password, role, hostel_group, hostel_type) VALUES (?, ?, ?, ?, ?, ?, ?)',
                [
                    name, 
                    username, 
                    email, 
                    hashedPassword, 
                    role, 
                    (role === 'student' || role === 'warden' || role === 'temporary') ? null : (hostel_group || null), 
                    (role === 'warden') ? null : (hostel_type || null)
                ]
            );
            
            if (role === 'student' || role === 'temporary') {
                await conn.query(
                    'INSERT INTO Students (user_id, room_no, block, hostel_type) VALUES (?, ?, ?, ?)',
                    [result.insertId, room_no || null, block || null, hostel_type || null]
                );
            }
            
            await conn.commit();
            conn.release();
            res.status(201).json({ message: 'User created successfully', id: result.insertId });
        } catch (err) {
            await conn.rollback();
            conn.release();
            throw err;
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to create user' });
    }
});

// Delete a user
router.delete('/users/:id', async (req, res) => {
    const { id } = req.params;
    if (parseInt(id) === req.user.id) {
        return res.status(400).json({ error: 'Cannot delete yourself' });
    }
    
    try {
        await db.query('DELETE FROM Users WHERE id = ?', [id]);
        res.json({ message: 'User deleted' });
    } catch (err) {
        res.status(500).json({ error: 'Failed to delete user' });
    }
});

module.exports = router;
