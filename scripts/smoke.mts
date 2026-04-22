import assert from "node:assert/strict";
import { parseCsv, toCsv } from "../src/lib/csv.ts";
import { dummyFetch } from "../src/lib/dummyFetch.ts";
import { formatKst, daysSince } from "../src/lib/format.ts";

function run(name: string, fn: () => void) {
  try {
    fn();
    console.log(`  ok  ${name}`);
  } catch (e) {
    console.error(`  FAIL ${name}`);
    console.error(e);
    process.exitCode = 1;
  }
}

console.log("csv");
run("parseCsv: header + rows", () => {
  const r = parseCsv(
    "realm,name,class,note\nazshara,차넬,사제,gm\nhyjal,홀리차넬,성기사,\n",
  );
  assert.equal(r.errors.length, 0);
  assert.equal(r.inputs.length, 2);
  assert.equal(r.inputs[0].realm, "azshara");
  assert.equal(r.inputs[0].name, "차넬");
  assert.equal(r.inputs[0].charClass, "사제");
  assert.equal(r.inputs[0].note, "gm");
  assert.equal(r.inputs[1].charClass, "성기사");
});

run("parseCsv: missing header", () => {
  const r = parseCsv("foo,bar\na,b\n");
  assert.equal(r.errors.length, 1);
  assert.match(r.errors[0].message, /realm/);
});

run("parseCsv: unknown class warning but still row", () => {
  const r = parseCsv("realm,name,class\naz,짱,로그\n");
  assert.equal(r.inputs.length, 1);
  assert.equal(r.inputs[0].charClass, undefined);
  assert.equal(r.errors.length, 1);
});

run("parseCsv: ignores blank/# comment lines", () => {
  const r = parseCsv("# comment\nrealm,name\n\nazshara,차넬\n");
  assert.equal(r.inputs.length, 1);
  assert.equal(r.errors.length, 0);
});

run("parseCsv: quoted cells with comma", () => {
  const r = parseCsv('realm,name,note\nazshara,차넬,"길마, 메인"\n');
  assert.equal(r.inputs[0].note, "길마, 메인");
});

run("toCsv: round-trips basic row", () => {
  const csv = toCsv([
    {
      id: "x",
      realm: "azshara",
      name: "차넬",
      charClass: "사제",
      level: 80,
      equippedItemLevel: 640,
      averageItemLevel: 640,
      lastLoginIso: "2026-04-20T23:14:00+09:00",
      source: "dummy",
      status: "OK",
      note: "길마, 짱",
      addedAt: "2026-02-01T10:00:00+09:00",
    },
  ]);
  assert.match(csv, /^id,realm,name,class/);
  assert.match(csv, /"길마, 짱"/);
});

console.log("dummyFetch");
run("dummyFetch: deterministic by realm+name", () => {
  const a = dummyFetch({ realm: "azshara", name: "차넬" });
  const b = dummyFetch({ realm: "azshara", name: "차넬" });
  assert.equal(a.level, b.level);
  assert.equal(a.equippedItemLevel, b.equippedItemLevel);
});

run("dummyFetch: names containing '없는' produce ERROR", () => {
  const r = dummyFetch({ realm: "az", name: "없는캐릭터" });
  assert.equal(r.status, "ERROR");
  assert.equal(r.level, null);
});

run("dummyFetch: normal names produce OK + ranges", () => {
  const r = dummyFetch({ realm: "az", name: "번달" });
  assert.equal(r.status, "OK");
  assert.ok((r.level ?? 0) >= 60 && (r.level ?? 0) <= 80);
  assert.ok((r.equippedItemLevel ?? 0) > 0);
});

run("dummyFetch: honors provided class", () => {
  const r = dummyFetch({ realm: "az", name: "아무개", charClass: "마법사" });
  assert.equal(r.charClass, "마법사");
});

console.log("format");
run("formatKst: iso → KST string", () => {
  const s = formatKst("2026-04-20T23:14:00+09:00");
  assert.match(s, /2026/);
  assert.match(s, /KST/);
});

run("formatKst: null/invalid → '-'", () => {
  assert.equal(formatKst(null), "-");
  assert.equal(formatKst("not a date"), "-");
});

run("daysSince: null → null, valid → number", () => {
  assert.equal(daysSince(null), null);
  const d = daysSince(new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString());
  assert.ok(d !== null && d >= 1);
});

if (process.exitCode) {
  console.error("\nSmoke FAIL");
  process.exit(process.exitCode);
}
console.log("\nAll smoke tests passed.");
