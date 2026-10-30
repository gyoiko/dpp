import "dotenv/config";
import { closePool } from "./server/db";
import { fetchTraceData } from "./server/dbService";

async function main() {
  const counts = await fetchTraceData<Record<string, unknown>>(
    `SELECT m.客单号 AS milNo, f.MainID, COUNT(*) AS fibreCount
     FROM [T_溯源_纤维成分表] f
     JOIN [T_溯源_主表] m ON m.ID = f.MainID
     WHERE f.删除标志 = 0 AND m.删除标志 = 0
     GROUP BY m.客单号, f.MainID
     ORDER BY fibreCount DESC, m.客单号`,
  );
  console.log("FIBRE COUNTS PER LOT");
  console.table(counts);

  const rows = await fetchTraceData<Record<string, unknown>>(
    `SELECT m.客单号 AS milNo, f.MainID, f.序号, f.纤维, f.百分比, f.物料批号
     FROM [T_溯源_纤维成分表] f
     JOIN [T_溯源_主表] m ON m.ID = f.MainID
     WHERE f.删除标志 = 0 AND m.删除标志 = 0
     ORDER BY m.客单号, f.序号`,
  );
  console.log("ALL FIBRE ROWS");
  console.table(rows);

  await closePool();
}

void main().catch(async (error) => {
  console.error("FAILED:", error instanceof Error ? error.message : error);
  await closePool();
});
