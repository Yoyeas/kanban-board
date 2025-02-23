const express = require('express');
const bodyParser = require('body-parser');
const sql = require('mssql');
const jwt = require('jsonwebtoken'); // มีอยู่เดิมสำหรับ login
const cors = require('cors');

const app = express();
app.use(bodyParser.json());
app.use(cors());

// แก้ไข config ให้ตรงกับฐานข้อมูลของคุณ
const config = {
  user: 'sa',
  password: 'Thunyawit092',  // ใส่รหัสผ่านจริง
  server: 'localhost',
  database: 'MyAppDB',
  options: {
    encrypt: true,
    trustServerCertificate: true
  }
};

// --------------- (ของเดิม) Register ---------------
app.post('/api/register', async (req, res) => {
  // ... (โค้ดเดิมของคุณ) ...
});

// --------------- (ของเดิม) Login ---------------
app.post('/api/login', async (req, res) => {
  // ... (โค้ดเดิมของคุณ) ...
});

// =========== ส่วนใหม่: จัดการ Boards ===========

// GET /api/boards - ดึงรายการ Board ทั้งหมด
app.get('/api/boards', async (req, res) => {
  try {
    let pool = await sql.connect(config);
    let result = await pool.request().query('SELECT * FROM Boards');
    res.json(result.recordset); // ส่ง array ของ boards กลับไป
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/boards - สร้าง Board ใหม่
app.post('/api/boards', async (req, res) => {
  const { name } = req.body;
  try {
    let pool = await sql.connect(config);
    let result = await pool.request()
      .input('name', sql.VarChar, name)
      .query(`
        INSERT INTO Boards (name)
        OUTPUT INSERTED.*
        VALUES (@name)
      `);
    // result.recordset[0] คือแถวที่ถูก INSERT
    res.status(201).json(result.recordset[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// DELETE /api/boards/:boardId - ลบ Board (พร้อมลบ Task ที่เกี่ยวข้อง)
app.delete('/api/boards/:boardId', async (req, res) => {
  const { boardId } = req.params;
  try {
    let pool = await sql.connect(config);
    // ลบ Task ที่อยู่ในบอร์ดก่อน
    await pool.request()
      .input('boardId', sql.Int, boardId)
      .query('DELETE FROM Tasks WHERE boardId = @boardId');

    // ลบ Board
    await pool.request()
      .input('boardId', sql.Int, boardId)
      .query('DELETE FROM Boards WHERE id = @boardId');

    res.json({ message: 'Board and related tasks deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// =========== ส่วนใหม่: จัดการ Tasks ===========

// GET /api/boards/:boardId/tasks - ดึง Task ของบอร์ดนั้น
app.get('/api/boards/:boardId/tasks', async (req, res) => {
  const { boardId } = req.params;
  try {
    let pool = await sql.connect(config);
    let result = await pool.request()
      .input('boardId', sql.Int, boardId)
      .query('SELECT * FROM Tasks WHERE boardId = @boardId');
    res.json(result.recordset);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/tasks - สร้าง Task ใหม่
app.post('/api/tasks', async (req, res) => {
  const { boardId, title, description, status } = req.body;
  try {
    let pool = await sql.connect(config);
    let result = await pool.request()
      .input('boardId', sql.Int, boardId)
      .input('title', sql.VarChar, title)
      .input('description', sql.VarChar, description || '')
      .input('status', sql.VarChar, status || 'todo')
      .query(`
        INSERT INTO Tasks (boardId, title, [description], [status])
        OUTPUT INSERTED.*
        VALUES (@boardId, @title, @description, @status)
      `);
    res.status(201).json(result.recordset[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// PUT /api/tasks/:taskId - แก้ไข Task (เช่น เปลี่ยน title, description, status)
app.put('/api/tasks/:taskId', async (req, res) => {
  const { taskId } = req.params;
  const { title, description, status } = req.body;
  try {
    let pool = await sql.connect(config);
    let result = await pool.request()
      .input('taskId', sql.Int, taskId)
      .input('title', sql.VarChar, title)
      .input('description', sql.VarChar, description)
      .input('status', sql.VarChar, status)
      .query(`
        UPDATE Tasks
        SET title = @title,
            [description] = @description,
            [status] = @status
        OUTPUT INSERTED.*
        WHERE id = @taskId
      `);

    if (result.recordset.length === 0) {
      return res.status(404).json({ message: 'Task not found' });
    }
    res.json(result.recordset[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// DELETE /api/tasks/:taskId - ลบ Task
app.delete('/api/tasks/:taskId', async (req, res) => {
  const { taskId } = req.params;
  try {
    let pool = await sql.connect(config);
    await pool.request()
      .input('taskId', sql.Int, taskId)
      .query('DELETE FROM Tasks WHERE id = @taskId');

    res.json({ message: 'Task deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// เริ่มต้นเซิร์ฟเวอร์
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
