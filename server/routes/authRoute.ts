import { Router } from "express";
import sql from "mssql";
import { getGtiPool } from "../db";
import { gtiPasswordMatches } from "../gtiPassword";

type GtiUserRow = {
  username: string;
  employeeNo: string | null;
  name: string | null;
  passwordValue: string | null;
  encrypted: number | null;
  active: boolean | null;
  email: string | null;
  department: string | null;
  position: string | null;
  isAdmin: boolean | null;
};

const authRouter = Router();

authRouter.post("/auth/login", async (request, response) => {
  const username = typeof request.body?.username === "string" ? request.body.username.trim() : "";
  const password = typeof request.body?.password === "string" ? request.body.password : "";

  if (!username || !password) {
    response.status(400).json({ error: "Username and password are required." });
    return;
  }

  try {
    const pool = await getGtiPool();
    const result = await pool
      .request()
      .input("username", sql.NVarChar(400), username)
      .query<GtiUserRow>(`
        SELECT TOP (1)
          [用户名] AS username,
          [工号] AS employeeNo,
          [姓名] AS name,
          [密码] AS passwordValue,
          [加密标志] AS encrypted,
          [激活状态] AS active,
          [EMail] AS email,
          [部门] AS department,
          [岗位] AS position,
          [是否管理员] AS isAdmin
        FROM [dbo].[V_系统平台_用户表]
        WHERE [用户名] = @username
      `);

    const user = result.recordset[0];

    if (!user) {
      response.status(401).json({ error: "Invalid username or password." });
      return;
    }

    if (!user.active) {
      response.status(403).json({ error: "This GTI Soft account is inactive." });
      return;
    }

    if (!gtiPasswordMatches(password, user.passwordValue ?? "", Number(user.encrypted) === 1)) {
      response.status(401).json({ error: "Invalid username or password." });
      return;
    }

    const isAdmin = Boolean(user.isAdmin);
    const employeeNo = String(user.employeeNo ?? "").trim() || username;
    const viewAllGroups = new Set(
      (process.env.GTI_VIEW_ALL_GROUPS ?? "1")
        .split(",")
        .map((value) => Number(value.trim()))
        .filter((value) => Number.isInteger(value)),
    );
    const viewAllEmployees = new Set(
      (process.env.GTI_VIEW_ALL_EMPLOYEES ?? "")
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean),
    );

    const groupResult = await pool
      .request()
      .input("groupUsername", sql.NVarChar(400), username)
      .query<{ groupCode: number }>(`
        SELECT DISTINCT m.用户组代码 AS groupCode
        FROM [dbo].[T_系统_用户分组关系表] m
        WHERE LTRIM(RTRIM(m.用户名)) = @groupUsername
          AND m.状态 = 1 AND m.历史标志 = 0
      `);

    const canViewAll =
      isAdmin ||
      viewAllEmployees.has(employeeNo) ||
      groupResult.recordset.some((row) => viewAllGroups.has(Number(row.groupCode)));

    if (!isAdmin) {
      const accessResult = await pool
        .request()
        .input("accessUsername", sql.NVarChar(400), username)
        .query<{ granted: number }>(`
          SELECT COUNT(*) AS granted
          FROM [dbo].[T_系统_用户分组关系表] m
          JOIN [dbo].[T_系统_用户组权限] p ON p.用户组代码 = m.用户组代码
          WHERE LTRIM(RTRIM(m.用户名)) = @accessUsername
            AND m.状态 = 1 AND m.历史标志 = 0
            AND p.菜单代码 = 3001596
            AND p.状态 = 1 AND p.历史标志 = 0
        `);

      if (Number(accessResult.recordset[0]?.granted ?? 0) === 0) {
        response.status(403).json({
          error: "This GTI Soft account does not have access to the traceability file query menu.",
        });
        return;
      }
    }

    response.json({
      user: {
        username: String(user.username).trim(),
        employeeNo,
        name: String(user.name ?? "").trim(),
        email: user.email?.trim() || null,
        department: user.department?.trim() || null,
        position: user.position?.trim() || null,
        isAdmin,
        canViewAll,
        menuAccess: true,
      },
    });
  } catch (error) {
    console.error("[auth] GTI Soft login verification failed", error);
    response.status(502).json({ error: "GTI Soft authentication is unavailable." });
  }
});

export default authRouter;
