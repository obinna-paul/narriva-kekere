export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 30;

import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { withAuth } from "@/lib/auth/middleware";
import { prisma } from "@/lib/db/prisma";

/**
 * Does the live database actually match the schema this build was compiled
 * against?
 *
 * This repo does not migrate on deploy — `build` is `prisma generate &&
 * next build`, so the generated client always matches `schema.prisma` while
 * the production database only matches it if someone remembered to run the
 * SQL by hand. That gap is invisible until a request touches the missing
 * column, at which point Prisma throws and Next serves "a server-side
 * exception has occurred" with a digest and nothing else. Every page that
 * avoids the column keeps working, which makes it look like a bug in the one
 * page that doesn't.
 *
 * So compare the two directly. Expected columns come from the client's own
 * DMMF — the same metadata the query builder uses, so it cannot disagree
 * with what the queries will ask for. Actual columns come from
 * information_schema. Anything in the first and not the second is a query
 * waiting to fail.
 *
 * Enum values get the same treatment, and for the same reason: adding a
 * value to a Prisma enum is a schema change that needs its own ALTER TYPE,
 * and a query filtering on a value Postgres has never heard of fails exactly
 * as hard as a missing column.
 */

interface ColumnRow {
  table_name: string;
  column_name: string;
}

interface EnumRow {
  type_name: string;
  value: string;
}

export const GET = withAuth(
  async () => {
    const [columnRows, enumRows] = await Promise.all([
      prisma.$queryRaw<ColumnRow[]>`
        SELECT table_name, column_name
        FROM information_schema.columns
        WHERE table_schema = 'public'
      `,
      prisma.$queryRaw<EnumRow[]>`
        SELECT t.typname AS type_name, e.enumlabel AS value
        FROM pg_type t
        JOIN pg_enum e ON e.enumtypid = t.oid
        JOIN pg_namespace n ON n.oid = t.typnamespace
        WHERE n.nspname = 'public'
      `,
    ]);

    const actualColumns = new Map<string, Set<string>>();
    for (const row of columnRows) {
      let set = actualColumns.get(row.table_name);
      if (!set) {
        set = new Set();
        actualColumns.set(row.table_name, set);
      }
      set.add(row.column_name);
    }

    const actualEnums = new Map<string, Set<string>>();
    for (const row of enumRows) {
      let set = actualEnums.get(row.type_name);
      if (!set) {
        set = new Set();
        actualEnums.set(row.type_name, set);
      }
      set.add(row.value);
    }

    const missingTables: string[] = [];
    const missingColumns: Array<{ table: string; columns: string[] }> = [];

    for (const model of Prisma.dmmf.datamodel.models) {
      const table = model.dbName ?? model.name;
      const actual = actualColumns.get(table);
      if (!actual) {
        missingTables.push(table);
        continue;
      }
      // Relation fields (kind "object") are navigation, not storage — the
      // foreign key itself is a separate scalar field and is checked here.
      const expected = model.fields.filter((f) => f.kind !== "object").map((f) => f.dbName ?? f.name);
      const missing = expected.filter((c) => !actual.has(c));
      if (missing.length > 0) missingColumns.push({ table, columns: missing });
    }

    const missingEnumValues: Array<{ enum: string; values: string[] }> = [];
    const missingEnums: string[] = [];

    for (const e of Prisma.dmmf.datamodel.enums) {
      const type = e.dbName ?? e.name;
      const actual = actualEnums.get(type);
      if (!actual) {
        missingEnums.push(type);
        continue;
      }
      const missing = e.values.map((v) => v.dbName ?? v.name).filter((v) => !actual.has(v));
      if (missing.length > 0) missingEnumValues.push({ enum: type, values: missing });
    }

    const inSync =
      missingTables.length === 0 &&
      missingColumns.length === 0 &&
      missingEnums.length === 0 &&
      missingEnumValues.length === 0;

    return NextResponse.json({
      inSync,
      // Only drift is reported, never the full schema — a clean database
      // returns four empty lists, which is the whole answer.
      missingTables,
      missingColumns,
      missingEnums,
      missingEnumValues,
      checked: {
        models: Prisma.dmmf.datamodel.models.length,
        enums: Prisma.dmmf.datamodel.enums.length,
        tablesFound: actualColumns.size,
      },
    });
  },
  { roles: ["ADMIN"] },
);
