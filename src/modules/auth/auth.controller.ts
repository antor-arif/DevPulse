import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { StatusCodes } from 'http-status-codes';
import pool from '../../config/db';
import { sendSuccess, sendError } from '../../utils/response';
import { asyncHandler } from '../../utils/asyncHandler';
import { SignupBody, LoginBody, UserRecord } from './auth.types';

const SALT_ROUNDS = 10;
const VALID_ROLES = ['contributor', 'maintainer'];

export const signup = asyncHandler(async (req, res) => {
  const { name, email, password, role }: SignupBody = req.body;

  if (!name || !email || !password) {
    sendError(res, StatusCodes.BAD_REQUEST, 'Name, email, and password are required');
    return;
  }

  if (role && !VALID_ROLES.includes(role)) {
    sendError(res, StatusCodes.BAD_REQUEST, 'Role must be contributor or maintainer');
    return;
  }

  const existing = await pool.query<{ id: number }>(
    'SELECT id FROM users WHERE email = $1',
    [email]
  );
  if (existing.rows.length > 0) {
    sendError(res, StatusCodes.BAD_REQUEST, 'Email already in use');
    return;
  }

  const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
  const assignedRole = role || 'contributor';

  const result = await pool.query<Omit<UserRecord, 'password'>>(
    `INSERT INTO users (name, email, password, role)
     VALUES ($1, $2, $3, $4)
     RETURNING id, name, email, role, created_at, updated_at`,
    [name, email, hashedPassword, assignedRole]
  );

  sendSuccess(res, StatusCodes.CREATED, 'User registered successfully', result.rows[0]);
});

export const login = asyncHandler(async (req, res) => {
  const { email, password }: LoginBody = req.body;

  if (!email || !password) {
    sendError(res, StatusCodes.BAD_REQUEST, 'Email and password are required');
    return;
  }

  const result = await pool.query<UserRecord>(
    'SELECT id, name, email, password, role, created_at, updated_at FROM users WHERE email = $1',
    [email]
  );

  if (result.rows.length === 0) {
    sendError(res, StatusCodes.UNAUTHORIZED, 'Invalid credentials');
    return;
  }

  const user = result.rows[0];
  const isPasswordValid = await bcrypt.compare(password, user.password);

  if (!isPasswordValid) {
    sendError(res, StatusCodes.UNAUTHORIZED, 'Invalid credentials');
    return;
  }

  const token = jwt.sign(
    { id: user.id, name: user.name, role: user.role },
    process.env.JWT_SECRET as string,
    { expiresIn: '7d' }
  );

  sendSuccess(res, StatusCodes.OK, 'Login successful', {
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      created_at: user.created_at,
      updated_at: user.updated_at,
    },
  });
});
