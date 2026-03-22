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
            SELECT u.id, u.name, u.username, u.email, u.role, u.hostel_group, u.hostel_type, s.block 
            FROM Users u 
            LEFT JOIN Students s ON u.id = s.user_id
        `);
        res.json(users);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch users' });
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
                    (role === 'student' || role === 'warden') ? null : (hostel_group || null), 
                    (role === 'warden') ? null : (hostel_type || null)
                ]
            );
            
            if (role === 'student') {
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
