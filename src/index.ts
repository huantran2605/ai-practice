#!/usr/bin/env node
import { Command } from 'commander';
import chalk from 'chalk';
import figures from 'figures';
import { loadTasks, saveTasks } from './storage.js';
import { Task } from './types.js';
import crypto from 'node:crypto';

const program = new Command();

const THEME = {
  header: chalk.bold.cyan,
  success: chalk.green,
  taskActive: chalk.yellow,
  taskDone: chalk.dim.green,
  info: chalk.blue,
  error: chalk.red,
  dim: chalk.dim
};

program
  .name('bst')
  .description('Beautiful Simple TODO CLI')
  .version('1.0.0');

program
  .command('add')
  .description('Add a new task')
  .argument('<text>', 'Task description')
  .action(async (text: string) => {
    const tasks = await loadTasks();
    const newTask: Task = {
      id: crypto.randomUUID(),
      text,
      completed: false,
      createdAt: new Date().toISOString()
    };
    tasks.push(newTask);
    await saveTasks(tasks);
    console.log(`\n ✨ ${THEME.success('Added:')} ${text}\n`);
  });

program
  .command('list')
  .description('List all tasks')
  .action(async () => {
    const tasks = await loadTasks();
    
    console.log(`\n ${THEME.header('BST TODO LIST')} ${THEME.dim('(' + tasks.length + ' tasks)')}`);
    console.log(THEME.dim(' ────────────────────────────'));

    if (tasks.length === 0) {
      console.log(`  ${THEME.dim('No tasks yet. Use ')}${chalk.cyan('bst add')}${THEME.dim(' to start!')}`);
      return;
    }

    tasks.forEach((task, index) => {
      const num = THEME.dim(`${index + 1}.`);
      if (task.completed) {
        console.log(`  ${num} ${THEME.taskDone(figures.tick + ' ' + task.text)}`);
      } else {
        console.log(`  ${num} ${THEME.taskActive(figures.pointerSmall + ' ' + task.text)}`);
      }
    });
    console.log();
  });

program
  .command('done')
  .description('Mark a task as completed')
  .argument('<index>', 'Task index')
  .action(async (indexStr: string) => {
    const index = parseInt(indexStr, 10) - 1;
    const tasks = await loadTasks();
    if (tasks[index]) {
      tasks[index].completed = true;
      await saveTasks(tasks);
      console.log(`\n ✅ ${THEME.success('Marked as done:')} ${tasks[index].text}\n`);
    } else {
      console.error(`\n ❌ ${THEME.error('Error:')} Invalid task index.\n`);
    }
  });

program
  .command('remove')
  .description('Remove a task')
  .argument('<index>', 'Task index')
  .action(async (indexStr: string) => {
    const index = parseInt(indexStr, 10) - 1;
    const tasks = await loadTasks();
    if (tasks[index]) {
      const removed = tasks.splice(index, 1);
      await saveTasks(tasks);
      console.log(`\n 🗑️  ${THEME.info('Removed:')} ${removed[0].text}\n`);
    } else {
      console.error(`\n ❌ ${THEME.error('Error:')} Invalid task index.\n`);
    }
  });

program.parse();
