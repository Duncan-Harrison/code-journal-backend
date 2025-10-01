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

app.post('/api/entries', authMiddleware, async (req, res, next) => {
  const { title, notes, photoUrl } = req.body;
  try {
    const sqlNewEntry = `
    insert into "entries" ("userId", "title", "notes", "photoUrl")
        values ($1, $2, $3, $4)
        returning *
    `;
    const params = [req.user?.userId, title, notes, photoUrl];
    const result = await db.query(sqlNewEntry, params);
    const newEntry = result.rows[0];
    res.status(201).json(newEntry);
  } catch (err) {
    next(err);
  }
});

app.get('/api/entries', authMiddleware, async (req, res, next) => {
  try {
    const sqlReadEntries = `
    select *
      from "entries"
      where "userId" = $1
      order by "entryId" desc;
    `;
    const params = [req.user?.userId];
    const result = await db.query(sqlReadEntries, params);
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
});

app.get('/api/entries/:entryId', authMiddleware, async (req, res, next) => {
  try {
    const { entryId } = req.params;
    const sqlReadEntry = `
    select *
      from "entries"
      where "userId" = $1
      and "entryId" = $2
    `;
    const params = [req.user?.userId, entryId];
    const result = await db.query(sqlReadEntry, params);
    const entry = result.rows[0];
    if (!entry) {
      throw new ClientError(404, `did not find entry ${entryId}`);
    }
    res.status(200).json(entry);
  } catch (err) {
    next(err);
  }
});

app.put('/api/entries/:entryId', authMiddleware, async (req, res, next) => {
  try {
    const [title, notes, photoUrl] = req.body;
    const entryId = Number(req.params.entryId);
    if (!Number.isInteger(entryId) || entryId < 1) {
      throw new ClientError(400, 'entryId must be a positive integer');
    }

    const sql = `
    update "entries"
        set "title" = $1,
            "notes" = $2,
            "photoUrl" = $3
        where "entryId" = $4
        and "userId" = $5
        returning *
    `;
    const params = [title, notes, photoUrl, entryId, req.user?.userId];
    const result = await db.query(sql, params);
    const editedEntry = result.rows[0];
    if (!editedEntry) {
      throw new ClientError(404, `did not find entry ${entryId}`);
    }
    res.status(200).json(editedEntry);
  } catch (err) {
    next(err);
  }
});

app.delete('/api/entries/:entryId', authMiddleware, async (req, res, next) => {
  try {
    const entryId = Number(req.params.entryId);
    if (!Number.isInteger(entryId) || entryId < 1) {
      throw new ClientError(400, 'entryId must be a positive integer');
    }

    const sqlDeleteEntry = `
    delete from "entries"
    where "entryId" = $1
    and "userId" = $2
    returning *;
    `;

    const params = [entryId, req.user?.userId];

    const result = await db.query(sqlDeleteEntry, params);
    const deletedEntry = result.rows[0];
    if (!deletedEntry) {
      throw new ClientError(404, `could not find entry ${entryId}`);
    }

    res.sendStatus(204);
  } catch (err) {
    next(err);
  }
});

app.use(errorMiddleware);

app.listen(process.env.PORT, () => {
  console.log(`express server listening on port ${process.env.PORT}`);
});
