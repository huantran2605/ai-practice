import { saveTasks, loadTasks } from '../src/storage.js';
import { Task } from '../src/types.js';

async function test() {
  console.log('--- Testing Storage ---');
  
  const mockTasks: Task[] = [
    { id: '1', text: 'Task One', completed: false, createdAt: new Date().toISOString() },
    { id: '2', text: 'Task Two', completed: true, createdAt: new Date().toISOString() }
  ];

  console.log('Saving tasks...');
  await saveTasks(mockTasks);
  
  console.log('Loading tasks...');
  const loaded = await loadTasks();
  
  console.log('Loaded tasks:', JSON.stringify(loaded, null, 2));
  
  if (loaded.length === 2 && loaded[0].text === 'Task One') {
    console.log('✅ Storage verification PASSED');
  } else {
    console.error('❌ Storage verification FAILED');
    process.exit(1);
  }
}

test().catch(console.error);
