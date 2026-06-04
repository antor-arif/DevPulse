import { StatusCodes } from 'http-status-codes';
import pool from '../../config/db';
import { sendSuccess, sendError } from '../../utils/response';
import { asyncHandler } from '../../utils/asyncHandler';
import { CreateIssueBody, UpdateIssueBody, IssueRecord, ReporterInfo } from './issues.types';

const VALID_TYPES = ['bug', 'feature_request'];
const VALID_STATUSES = ['open', 'in_progress', 'resolved'];

export const createIssue = asyncHandler(async (req, res) => {
  const { title, description, type }: CreateIssueBody = req.body;

  if (!title || !description || !type) {
    sendError(res, StatusCodes.BAD_REQUEST, 'Title, description, and type are required');
    return;
  }

  if (title.length > 150) {
    sendError(res, StatusCodes.BAD_REQUEST, 'Title must not exceed 150 characters');
    return;
  }

  if (description.length < 20) {
    sendError(res, StatusCodes.BAD_REQUEST, 'Description must be at least 20 characters');
    return;
  }

  if (!VALID_TYPES.includes(type)) {
    sendError(res, StatusCodes.BAD_REQUEST, 'Type must be bug or feature_request');
    return;
  }

  const reporterId = req.user!.id;

  const result = await pool.query<IssueRecord>(
    `INSERT INTO issues (title, description, type, reporter_id)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [title, description, type, reporterId]
  );

  sendSuccess(res, StatusCodes.CREATED, 'Issue created successfully', result.rows[0]);
});

export const getAllIssues = asyncHandler(async (req, res) => {
  const { sort, type, status } = req.query;

  const conditions: string[] = [];
  const params: unknown[] = [];

  if (type) {
    params.push(type);
    conditions.push(`type = $${params.length}`);
  }

  if (status) {
    params.push(status);
    conditions.push(`status = $${params.length}`);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const orderClause = sort === 'oldest' ? 'ORDER BY created_at ASC' : 'ORDER BY created_at DESC';

  const issuesResult = await pool.query<IssueRecord>(
    `SELECT * FROM issues ${whereClause} ${orderClause}`,
    params
  );

  const issues = issuesResult.rows;

  if (issues.length === 0) {
    sendSuccess(res, StatusCodes.OK, 'Issues retrived successfully', []);
    return;
  }

  const reporterIds = [...new Set(issues.map((i) => i.reporter_id))];
  const reportersResult = await pool.query<ReporterInfo>(
    'SELECT id, name, role FROM users WHERE id = ANY($1::int[])',
    [reporterIds]
  );

  const reportersMap = new Map(reportersResult.rows.map((r) => [r.id, r]));

  const data = issues.map((issue) => {
    const { reporter_id, ...rest } = issue;
    return {
      ...rest,
      reporter: reportersMap.get(reporter_id) ?? null,
    };
  });

  sendSuccess(res, StatusCodes.OK, 'Issues retrived successfully', data);
});

export const getIssueById = asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id);

  if (isNaN(id)) {
    sendError(res, StatusCodes.BAD_REQUEST, 'Invalid issue ID');
    return;
  }

  const issueResult = await pool.query<IssueRecord>(
    'SELECT * FROM issues WHERE id = $1',
    [id]
  );

  if (issueResult.rows.length === 0) {
    sendError(res, StatusCodes.NOT_FOUND, 'Issue not found');
    return;
  }

  const issue = issueResult.rows[0];

  const reporterResult = await pool.query<ReporterInfo>(
    'SELECT id, name, role FROM users WHERE id = $1',
    [issue.reporter_id]
  );

  const { reporter_id, ...rest } = issue;
  const data = {
    ...rest,
    reporter: reporterResult.rows[0] ?? null,
  };

  sendSuccess(res, StatusCodes.OK, 'Issue retrived successfully', data);
});

export const updateIssue = asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id);

  if (isNaN(id)) {
    sendError(res, StatusCodes.BAD_REQUEST, 'Invalid issue ID');
    return;
  }

  const { title, description, type, status }: UpdateIssueBody = req.body;
  const user = req.user!;

  const issueResult = await pool.query<IssueRecord>(
    'SELECT * FROM issues WHERE id = $1',
    [id]
  );

  if (issueResult.rows.length === 0) {
    sendError(res, StatusCodes.NOT_FOUND, 'Issue not found');
    return;
  }

  const issue = issueResult.rows[0];

  if (user.role === 'contributor') {
    if (issue.reporter_id !== user.id) {
      sendError(res, StatusCodes.FORBIDDEN, 'You can only update your own issues');
      return;
    }
    if (issue.status !== 'open') {
      sendError(res, StatusCodes.CONFLICT, 'You can only update issues with open status');
      return;
    }
    if (status !== undefined) {
      sendError(res, StatusCodes.FORBIDDEN, 'Contributors cannot update issue status');
      return;
    }
  }

  if (title !== undefined && title.length > 150) {
    sendError(res, StatusCodes.BAD_REQUEST, 'Title must not exceed 150 characters');
    return;
  }

  if (description !== undefined && description.length < 20) {
    sendError(res, StatusCodes.BAD_REQUEST, 'Description must be at least 20 characters');
    return;
  }

  if (type !== undefined && !VALID_TYPES.includes(type)) {
    sendError(res, StatusCodes.BAD_REQUEST, 'Type must be bug or feature_request');
    return;
  }

  if (status !== undefined && !VALID_STATUSES.includes(status)) {
    sendError(res, StatusCodes.BAD_REQUEST, 'Status must be open, in_progress, or resolved');
    return;
  }

  const updates: string[] = [];
  const params: unknown[] = [];

  if (title !== undefined) { params.push(title); updates.push(`title = $${params.length}`); }
  if (description !== undefined) { params.push(description); updates.push(`description = $${params.length}`); }
  if (type !== undefined) { params.push(type); updates.push(`type = $${params.length}`); }
  if (status !== undefined) { params.push(status); updates.push(`status = $${params.length}`); }

  if (updates.length === 0) {
    sendError(res, StatusCodes.BAD_REQUEST, 'No fields to update');
    return;
  }

  params.push(id);
  const result = await pool.query<IssueRecord>(
    `UPDATE issues SET ${updates.join(', ')} WHERE id = $${params.length} RETURNING *`,
    params
  );

  sendSuccess(res, StatusCodes.OK, 'Issue updated successfully', result.rows[0]);
});

export const deleteIssue = asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id);

  if (isNaN(id)) {
    sendError(res, StatusCodes.BAD_REQUEST, 'Invalid issue ID');
    return;
  }

  const issueResult = await pool.query<{ id: number }>(
    'SELECT id FROM issues WHERE id = $1',
    [id]
  );

  if (issueResult.rows.length === 0) {
    sendError(res, StatusCodes.NOT_FOUND, 'Issue not found');
    return;
  }

  await pool.query('DELETE FROM issues WHERE id = $1', [id]);

  sendSuccess(res, StatusCodes.OK, 'Issue deleted successfully');
});
