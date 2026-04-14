import fs from 'node:fs/promises';
import path from 'node:path';
import { Task } from './types.js';

const TASKS_FILE = path.join(process.cwd(), 'tasks.json');

/**
 * Loads the task list from the local JSON file.
 * Returns an empty array if the file doesn't exist.
 */
export async function loadTasks(): Promise<Task[]> {
  try {
    const data = await fs.readFile(TASKS_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      return [];
    }
    throw error;
  }
}

/**
 * Saves the task list to the local JSON file using an atomic write-and-rename pattern.
 */
export async function saveTasks(tasks: Task[]): Promise<void> {
  const tempFile = `${TASKS_FILE}.tmp`;
  try {
    const data = JSON.stringify(tasks, null, 2);
    await fs.writeFile(tempFile, data, 'utf-8');
    await fs.rename(tempFile, TASKS_FILE);
  } catch (error) {
    // Attempt to cleanup temp file if writing fails
    try {
      await fs.unlink(tempFile);
    } catch {}
    throw error;
  }
}
