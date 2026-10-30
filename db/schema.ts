import { sql } from "drizzle-orm";
import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const supplyChainMappings = sqliteTable(
  "dpp_supply_chain_mappings",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    mappingKey: text("mapping_key").notNull(),
    keDanHao: text("ke_dan_hao").notNull(),
    keDanHang: text("ke_dan_hang").notNull(),
    contractNo: text("contract_no").notNull().default(""),
    lotNo: text("lot_no").notNull().default(""),
    stage: text("stage").notNull(),
    process: text("process").notNull().default(""),
    relation: text("relation").notNull().default("external"),
    supplier: text("supplier").notNull().default(""),
    batchNo: text("batch_no").notNull().default(""),
    notes: text("notes").notNull().default(""),
    status: text("status").notNull().default("draft"),
    reviewedBy: text("reviewed_by").notNull().default(""),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    uniqueIndex("dpp_supply_chain_mappings_key_idx").on(table.mappingKey),
    index("dpp_supply_chain_mappings_milref_idx").on(table.keDanHao, table.keDanHang),
  ],
);

export const traceabilityNodeMappings = sqliteTable(
  "dpp_traceability_node_mappings",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    mappingKey: text("mapping_key").notNull(),
    keDanHao: text("ke_dan_hao").notNull(),
    keDanHang: text("ke_dan_hang").notNull(),
    nodeId: integer("node_id").notNull(),
    nodeSeqNo: integer("node_seq_no"),
    stage: text("stage").notNull(),
    process: text("process").notNull().default(""),
    notes: text("notes").notNull().default(""),
    status: text("status").notNull().default("draft"),
    reviewedBy: text("reviewed_by").notNull().default(""),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    uniqueIndex("dpp_traceability_node_mappings_key_idx").on(table.mappingKey),
    index("dpp_traceability_node_mappings_milref_idx").on(table.keDanHao, table.keDanHang),
  ],
);

export type TraceabilityNodeMappingRow = typeof traceabilityNodeMappings.$inferSelect;
export type NewTraceabilityNodeMapping = typeof traceabilityNodeMappings.$inferInsert;

export const dppPages = sqliteTable(
  "dpp_pages",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    milRef: text("mil_ref").notNull(),
    keDanHao: text("ke_dan_hao").notNull(),
    keDanHang: text("ke_dan_hang").notNull(),
    title: text("title").notNull().default(""),
    intro: text("intro").notNull().default(""),
    status: text("status").notNull().default("draft"),
    publishedAt: text("published_at"),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [uniqueIndex("dpp_pages_milref_idx").on(table.milRef)],
);

export type DppPageRow = typeof dppPages.$inferSelect;
export type NewDppPage = typeof dppPages.$inferInsert;

