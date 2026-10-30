import { closePool } from "../db";
import { fetchData } from "../dbService";

interface SupplyChainRow {
  客单号: string;
  客单行: number;
  纱支: string | null;
  数量: number | null;
  单位: string | null;
  合同号: string | null;
  批号: string | null;
  公司: string | null;
  国别: string | null;
  合同日期: string | null;
}

async function main() {
  const keDanHao = process.argv[2] ?? "B02345";
  const keDanHang = Number(process.argv[3] ?? "1");

  if (!Number.isInteger(keDanHang)) {
    throw new Error("KeDanHang must be an integer, e.g. 1");
  }

  const rows = await fetchData<SupplyChainRow>(
    `SELECT TOP 10
       d.客单号, d.客单行, d.纱支, d.数量, d.单位,
       m.合同号, m.批号, m.公司, m.国别, m.合同日期
     FROM T_进口棉_配棉登记表 AS d
     LEFT JOIN T_进口棉_配棉主表 AS m ON m.ID = d.MainID
     WHERE d.客单号 = @KeDanHao AND d.客单行 = @KeDanHang
     ORDER BY d.ID`,
    { KeDanHao: keDanHao, KeDanHang: keDanHang },
  );

  console.log(`Fetched ${rows.length} supply chain row(s) for MilRef ${keDanHao}-${keDanHang}`);
  console.log(rows);
}

main()
  .catch((error: unknown) => {
    console.error("Read-only query failed:", error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await closePool();
  });
