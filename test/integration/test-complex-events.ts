import { createMemoryImage } from './src/memimg/memimg.js';
import { createMockEventLog } from './test/memimg/fixtures/helpers.js';
import { replayFromEventLog } from './src/memimg/replay.js';

const eventLog = createMockEventLog();
const root = createMemoryImage({}, { eventLog });

root.users = [];
console.log('After SET users=[]:', eventLog.events.length, 'events');

root.users.push({ name: 'Alice', age: 30 });
console.log('After push Alice:', eventLog.events.length, 'events');

root.users.push({ name: 'Bob', age: 25 });
console.log('After push Bob:', eventLog.events.length, 'events');

console.log('\nBefore mutation - root.users[0].age:', root.users[0].age);
root.users[0].age = 31;
console.log('After mutation - root.users[0].age:', root.users[0].age);
console.log('After set users[0].age=31:', eventLog.events.length, 'events');

delete root.users[1].age;
console.log('After delete users[1].age:', eventLog.events.length, 'events');

console.log('\n=== ALL EVENTS ===');
eventLog.events.forEach((e, i) => {
  const pathStr = e.path ? e.path.join(', ') : '';
  const valueStr = e.value !== undefined ? JSON.stringify(e.value).substring(0, 100) : '';
  console.log(`${i}: ${e.type} at [${pathStr}] value: ${valueStr}`);
});

console.log('\n=== REPLAYING ===');
const replayed = {};
await replayFromEventLog(replayed, eventLog, { isReplaying: true });

console.log('\nResult:', JSON.stringify(replayed, null, 2));
console.log('\nusers[0].age:', replayed.users[0].age, '(expected 31)');
console.log('users[1].age:', replayed.users[1].age, '(expected undefined)');
console.log('\nusers[0]:', JSON.stringify(replayed.users[0]));
console.log('users[1]:', JSON.stringify(replayed.users[1]));
