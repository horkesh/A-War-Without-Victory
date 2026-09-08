const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '../..');
const exe = path.join(root, 'dist-packaged/win-unpacked/A War Without Victory.exe');
const bytes = fs.readFileSync(exe);
assert.equal(bytes.toString('ascii', 0, 2), 'MZ');
const offset = bytes.readUInt32LE(0x3c);
assert.ok(offset + 24 < bytes.length);
assert.equal(bytes.readUInt32LE(offset), 0x4550);
assert.equal(bytes.readUInt16LE(offset + 4), 0x8664);
assert.equal(bytes.readUInt16LE(offset + 24), 0x20b);
const sections = bytes.readUInt16LE(offset + 6);
const table = offset + 24 + bytes.readUInt16LE(offset + 20);
assert.ok(table + sections * 40 <= bytes.length);
for (let n = 0; n < sections; n++) {
  const header = table + n * 40;
  const size = bytes.readUInt32LE(header + 16);
  const pointer = bytes.readUInt32LE(header + 20);
  assert.ok(pointer + size <= bytes.length, `Section ${n} extends beyond file`);
}
console.log(JSON.stringify({ exe, bytes: bytes.length, dos: 'MZ', pe: 'PE', machine: 'AMD64', optionalHeader: 'PE32+', sections, allRawSectionsInBounds: true, sha256: crypto.createHash('sha256').update(bytes).digest('hex') }, null, 2));
