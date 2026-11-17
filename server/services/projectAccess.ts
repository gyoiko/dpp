import sql from "mssql";
import type { SessionPayload } from "../../types/auth";
import { getTracePool } from "../db";

export type ProjectAccess = {
  found: boolean;
  allowed: boolean;
  ownerCode: string | null;
  ownerName: string | null;
};

export async function checkProjectAccess(
  session: SessionPayload,
  keDanHao: string,
): Promise<ProjectAccess> {
  const pool = await getTracePool();
  const result = await pool
    .request()
    .input("keDanHao", sql.NVarChar(50), keDanHao)
    .query<{ ownerCode: string | null; ownerName: string | null }>(`
      SELECT TOP (1)
        LTRIM(RTRIM([跟单员工号])) AS ownerCode,
        [跟单员] AS ownerName
      FROM [dbo].[T_溯源_主表] WITH (NOLOCK)
      WHERE [客单号] = @keDanHao
        AND [删除标志] = 0
      ORDER BY [ID] DESC
    `);

  const row = result.recordset[0];

  if (!row) {
    return { found: false, allowed: session.canViewAll, ownerCode: null, ownerName: null };
  }

  const ownerCode = row.ownerCode?.trim() || null;
  const employeeNo = session.employeeNo.trim();

  return {
    found: true,
    allowed: session.canViewAll || (Boolean(ownerCode) && ownerCode === employeeNo),
    ownerCode,
    ownerName: row.ownerName?.trim() || null,
  };
}

export async function filterAllowedKeDanHao(
  session: SessionPayload,
  keDanHaos: string[],
): Promise<Set<string>> {
  const unique = Array.from(new Set(keDanHaos.map((value) => value.trim()).filter(Boolean)));

  if (unique.length === 0) {
    return new Set();
  }

  if (session.canViewAll) {
    return new Set(unique);
  }

  const pool = await getTracePool();
  const request = pool.request().input("employeeNo", sql.NVarChar(50), session.employeeNo.trim());

  const placeholders = unique.map((keDanHao, index) => {
    request.input(`keDanHao${index}`, sql.NVarChar(50), keDanHao);
    return `@keDanHao${index}`;
  });

  const result = await request.query<{ keDanHao: string }>(`
    SELECT DISTINCT LTRIM(RTRIM([客单号])) AS keDanHao
    FROM [dbo].[T_溯源_主表] WITH (NOLOCK)
    WHERE [删除标志] = 0
      AND LTRIM(RTRIM([客单号])) IN (${placeholders.join(", ")})
      AND LTRIM(RTRIM(ISNULL([跟单员工号], N''))) = @employeeNo
  `);

  return new Set(result.recordset.map((row) => row.keDanHao));
}
