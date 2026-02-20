import { getSupabase } from './supabaseClient';
import { getUserHash } from '../utils/userHash';

// ── Task Tree ──────────────────────────────────────────────

export async function getTree() {
  const supabase = getSupabase();
  if (!supabase) return null;
  const userHash = getUserHash();
  const { data, error } = await supabase
    .from('task_tree')
    .select('id, data')
    .eq('user_hash', userHash)
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function putTree(treeData) {
  const supabase = getSupabase();
  if (!supabase) return;
  const userHash = getUserHash();
  const existing = await getTree();
  if (existing) {
    const { error } = await supabase
      .from('task_tree')
      .update({ data: treeData, updated_at: new Date().toISOString() })
      .eq('id', existing.id);
    if (error) throw error;
  } else {
    const { error } = await supabase
      .from('task_tree')
      .insert({ data: treeData, user_hash: userHash });
    if (error) throw error;
  }
}

// ── Focus Logs ─────────────────────────────────────────────

export async function getLogs() {
  const supabase = getSupabase();
  if (!supabase) return null;
  const userHash = getUserHash();
  const { data, error } = await supabase
    .from('focus_log')
    .select('*')
    .eq('user_hash', userHash)
    .order('start_time', { ascending: true });
  if (error) throw error;
  return data.map(row => ({
    id: row.id,
    taskId: row.task_id,
    taskText: row.task_text,
    startTime: row.start_time,
    endTime: row.end_time,
  }));
}

export async function createLog(log) {
  const supabase = getSupabase();
  if (!supabase) return;
  const userHash = getUserHash();
  const { error } = await supabase.from('focus_log').insert({
    id: log.id,
    task_id: log.taskId || null,
    task_text: log.taskText || '',
    start_time: log.startTime instanceof Date ? log.startTime.toISOString() : log.startTime,
    end_time: log.endTime instanceof Date ? log.endTime.toISOString() : log.endTime,
    user_hash: userHash,
  });
  if (error) throw error;
}

export async function updateLog(id, updates) {
  const supabase = getSupabase();
  if (!supabase) return;
  const userHash = getUserHash();
  const row = {};
  if (updates.taskId !== undefined) row.task_id = updates.taskId;
  if (updates.taskText !== undefined) row.task_text = updates.taskText;
  if (updates.startTime !== undefined)
    row.start_time = updates.startTime instanceof Date ? updates.startTime.toISOString() : updates.startTime;
  if (updates.endTime !== undefined)
    row.end_time = updates.endTime instanceof Date ? updates.endTime.toISOString() : updates.endTime;
  const { error } = await supabase.from('focus_log').update(row).eq('id', id).eq('user_hash', userHash);
  if (error) throw error;
}

export async function deleteLog(id) {
  const supabase = getSupabase();
  if (!supabase) return;
  const userHash = getUserHash();
  const { error } = await supabase.from('focus_log').delete().eq('id', id).eq('user_hash', userHash);
  if (error) throw error;
}

// ── Notes ──────────────────────────────────────────────────

export async function getNotes() {
  const supabase = getSupabase();
  if (!supabase) return null;
  const userHash = getUserHash();
  const { data, error } = await supabase
    .from('note')
    .select('*')
    .eq('user_hash', userHash)
    .order('last_modified', { ascending: false });
  if (error) throw error;
  return data.map(row => ({
    id: row.id,
    text: row.text,
    lastModified: row.last_modified,
  }));
}

export async function createNote(note) {
  const supabase = getSupabase();
  if (!supabase) return;
  const userHash = getUserHash();
  const { error } = await supabase.from('note').insert({
    id: note.id,
    text: note.text || '',
    user_hash: userHash,
  });
  if (error) throw error;
}

export async function updateNote(id, text) {
  const supabase = getSupabase();
  if (!supabase) return;
  const userHash = getUserHash();
  const { error } = await supabase
    .from('note')
    .update({ text, last_modified: new Date().toISOString() })
    .eq('id', id)
    .eq('user_hash', userHash);
  if (error) throw error;
}

export async function deleteNote(id) {
  const supabase = getSupabase();
  if (!supabase) return;
  const userHash = getUserHash();
  const { error } = await supabase.from('note').delete().eq('id', id).eq('user_hash', userHash);
  if (error) throw error;
}

// ── Q&A ────────────────────────────────────────────────────

export async function getQAs() {
  const supabase = getSupabase();
  if (!supabase) return null;
  const userHash = getUserHash();
  const { data, error } = await supabase
    .from('qa')
    .select('*')
    .eq('user_hash', userHash)
    .order('last_modified', { ascending: false });
  if (error) throw error;
  return data.map(row => ({
    id: row.id,
    question: row.question,
    answer: row.answer,
    lastModified: row.last_modified,
  }));
}

export async function createQA(qa) {
  const supabase = getSupabase();
  if (!supabase) return;
  const userHash = getUserHash();
  const { error } = await supabase.from('qa').insert({
    id: qa.id,
    question: qa.question || '',
    answer: qa.answer || '',
    user_hash: userHash,
  });
  if (error) throw error;
}

export async function updateQA(id, updates) {
  const supabase = getSupabase();
  if (!supabase) return;
  const userHash = getUserHash();
  const row = { last_modified: new Date().toISOString() };
  if (updates.question !== undefined) row.question = updates.question;
  if (updates.answer !== undefined) row.answer = updates.answer;
  const { error } = await supabase.from('qa').update(row).eq('id', id).eq('user_hash', userHash);
  if (error) throw error;
}

export async function deleteQA(id) {
  const supabase = getSupabase();
  if (!supabase) return;
  const userHash = getUserHash();
  const { error } = await supabase.from('qa').delete().eq('id', id).eq('user_hash', userHash);
  if (error) throw error;
}

// ── Settings ───────────────────────────────────────────────

export async function getSettings() {
  const supabase = getSupabase();
  if (!supabase) return null;
  const userHash = getUserHash();
  const { data, error } = await supabase
    .from('user_settings')
    .select('*')
    .eq('user_hash', userHash)
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return {
    id: data.id,
    timerDurations: data.timer_durations,
    nudgeMinutes: data.nudge_minutes,
    notificationSound: data.notification_sound,
    viewMode: data.view_mode,
  };
}

export async function updateSettings(updates) {
  const supabase = getSupabase();
  if (!supabase) return;
  const userHash = getUserHash();
  const existing = await getSettings();
  const row = {};
  if (updates.timerDurations !== undefined) row.timer_durations = updates.timerDurations;
  if (updates.nudgeMinutes !== undefined) row.nudge_minutes = updates.nudgeMinutes;
  if (updates.notificationSound !== undefined) row.notification_sound = updates.notificationSound;
  if (updates.viewMode !== undefined) row.view_mode = updates.viewMode;

  if (existing) {
    const { error } = await supabase
      .from('user_settings')
      .update(row)
      .eq('id', existing.id);
    if (error) throw error;
  } else {
    const { error } = await supabase.from('user_settings').insert({ ...row, user_hash: userHash });
    if (error) throw error;
  }
}

// ── Bulk Export / Import ───────────────────────────────────

export async function bulkExport() {
  const [treeRow, logs, notes, qas] = await Promise.all([
    getTree(),
    getLogs(),
    getNotes(),
    getQAs(),
  ]);
  return {
    treeData: treeRow ? treeRow.data : [],
    logs: logs || [],
    memoryData: {
      notes: notes || [],
      qas: qas || [],
    },
  };
}

export async function bulkImport(importData) {
  const supabase = getSupabase();
  if (!supabase) return;
  const userHash = getUserHash();

  // Replace tree
  await putTree(importData.treeData || []);

  // Replace logs (only for this user)
  await supabase.from('focus_log').delete().eq('user_hash', userHash);
  const logRows = (importData.logs || []).map(l => ({
    id: l.id,
    task_id: l.taskId || null,
    task_text: l.taskText || '',
    start_time: l.startTime instanceof Date ? l.startTime.toISOString() : l.startTime,
    end_time: l.endTime instanceof Date ? l.endTime.toISOString() : l.endTime,
    user_hash: userHash,
  }));
  if (logRows.length > 0) {
    const { error } = await supabase.from('focus_log').insert(logRows);
    if (error) throw error;
  }

  // Replace notes (only for this user)
  const memory = importData.memoryData || {};
  await supabase.from('note').delete().eq('user_hash', userHash);
  const noteRows = (memory.notes || []).map(n => ({
    id: n.id,
    text: n.text || '',
    user_hash: userHash,
  }));
  if (noteRows.length > 0) {
    const { error } = await supabase.from('note').insert(noteRows);
    if (error) throw error;
  }

  // Replace QAs (only for this user)
  await supabase.from('qa').delete().eq('user_hash', userHash);
  const qaRows = (memory.qas || []).map(q => ({
    id: q.id,
    question: q.question || '',
    answer: q.answer || '',
    user_hash: userHash,
  }));
  if (qaRows.length > 0) {
    const { error } = await supabase.from('qa').insert(qaRows);
    if (error) throw error;
  }
}
