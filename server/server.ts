/* eslint-disable @typescript-eslint/no-unused-vars -- Remove me */
import 'dotenv/config';
import pg from 'pg';
import express, { application } from 'express';
import { ClientError, errorMiddleware, authMiddleware } from './lib/index.js';
import argon2, { hash } from 'argon2';
import jwt from 'jsonwebtoken';

type User = {
  userId: number;
  username: string;
  hashedPassword: string;
};

type Authentication = {
  username: string;
  password: string;
};

const db = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

const hashKey = process.env.TOKEN_SECRET;
if (!hashKey) throw new Error('TOKEN_SECRET not found');

const app = express();
app.use(express.json());

app.post('/api/auth/sign-up', async (req, res, next) => {
  try {
    const { username, password } = req.body;
    if (!username || !password)
      throw new ClientError(400, `username or password required.`);
    const hashedPassword = await argon2.hash(password);
    if (!hashedPassword)
      throw new ClientError(404, `Password cannot be accepted.`);
    const sql = `
      insert into "users" ("username", "hashedPassword")
      values ($1, $2)
      returning *;
    `;
    const params = [username, hashedPassword];
    const result = await db.query(sql, params);
    const newUser = result.rows[0];
    if (!newUser) throw new ClientError(404, `Cannot add username or password`);
    res.status(201).json(newUser);
  } catch (err) {
    next(err);
  }
});

app.listen(process.env.PORT, () => {
  console.log(`express server listening on port ${process.env.PORT}`);
});

app.post('/api/auth/sign-in', async (req, res, next) => {
  try {
    const { username, password } = req.body as Partial<Authentication>;
    if (!username || !password) throw new ClientError(401, `Invalid Login`);
    const sql = `
      select *
      from "users"
      where "username" = $1;
    `;
    const params = [username];
    const result = await db.query(sql, params);
    if (!result) throw new ClientError(401, 'Invalid login');
    const user = result.rows[0];
    const hashKey = process.env.TOKEN_SECRET;
    if (!hashKey) throw new Error(`TOKEN_SECRET not found in .env`);
    if (!(await argon2.verify(user.hashedPassword, password)))
      throw new ClientError(401, 'invalid login');
    const { userId } = user;
    const payload = { userId, username };
    const token = jwt.sign(payload, hashKey);
    res.status(201).json({ token, user: payload });
  } catch (err) {
    next(err);
  }
});
