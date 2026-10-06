// Run from the project root after running schema.sql in Supabase SQL Editor.
// Existing database records are never overwritten.
// Local JSON files are not changed.

import fs from "node:fs/promises";
import path from "node:path";
import postgres from "postgres";

const defaults = {
    orderingEnabled: true,
    pickupEnabled: true,
    deliveryEnabled: true,
    deliveryCity: "Jaranwala",
    deliveryFee: 100,
    freeDeliveryThreshold: 500,
    minimumDeliverySubtotal: 0,
    pickupEstimateMinutes: 25,
};

const businessDefaults = {
    version: 1,
    costs: {},
    costHistory: [],
    expenses: [],
};

const uuid =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function readJson(filename, fallback) {
    try {
        const content = await fs.readFile(filename, "utf8");

        return JSON.parse(content);
    } catch (error) {
        if (error.code === "ENOENT" && fallback !== undefined) {
            return fallback;
        }

        throw new Error(`Cannot read valid JSON from ${filename}.`);
    }
}

async function filesIn(directory) {
    try {
        return await fs.readdir(directory);
    } catch (error) {
        if (error.code === "ENOENT") {
            return [];
        }

        throw error;
    }
}

function orderDay(date) {
    const parts = new Intl.DateTimeFormat("en-GB", {
        timeZone: "Asia/Karachi",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).formatToParts(new Date(date));

    return ["year", "month", "day"]
        .map((type) => parts.find((part) => part.type === type).value)
        .join("");
}

async function main() {
    if (!process.env.DATABASE_URL) {
        throw new Error("DATABASE_URL is missing from .env.local.");
    }

    const dataDirectory = path.join(process.cwd(), "data");

    const site = await readJson(
        path.join(dataDirectory, "site.json"),
    );

    const business = await readJson(
        path.join(dataDirectory, "business.json"),
        businessDefaults,
    );

    const checkout = {
        ...defaults,
        ...(await readJson(
            path.join(dataDirectory, "checkout-settings.json"),
            {},
        )),
    };

    if (
        !site?.settings ||
        !Array.isArray(site.items) ||
        !Number.isSafeInteger(business.version) ||
        !business.costs ||
        !Array.isArray(business.costHistory) ||
        !Array.isArray(business.expenses)
    ) {
        throw new Error(
            "The menu or business JSON structure is invalid. Import stopped.",
        );
    }

    const orders = [];
    const sequences = new Map();
    const dayCounts = new Map();

    const directory = path.join(dataDirectory, "orders");

    for (const file of await filesIn(directory)) {
        if (!/\.json$/i.test(file)) {
            continue;
        }

        if (!uuid.test(file.slice(0, -5))) {
            throw new Error(
                `Unexpected order filename: ${file}. Import stopped.`,
            );
        }

        const order = await readJson(path.join(directory, file));

        if (
            !uuid.test(order.requestId) ||
            !uuid.test(order.id) ||
            typeof order.number !== "string" ||
            !Number.isFinite(Date.parse(order.createdAt)) ||
            typeof order.phone !== "string" ||
            !Array.isArray(order.lines)
        ) {
            throw new Error(
                `Invalid order structure in ${file}. Import stopped.`,
            );
        }

        orders.push(order);

        const day = orderDay(order.createdAt);

        dayCounts.set(day, (dayCounts.get(day) ?? 0) + 1);

        const prefix = `AT-${day}`;

        const suffix = order.number.startsWith(prefix)
            ? order.number.slice(prefix.length)
            : "";

        if (/^[1-9]\d*$/.test(suffix)) {
            sequences.set(
                day,
                Math.max(sequences.get(day) ?? 0, Number(suffix)),
            );
        }
    }

    for (const [day, count] of dayCounts) {
        sequences.set(
            day,
            Math.max(sequences.get(day) ?? 0, count),
        );
    }

    const sequenceDirectory = path.join(
        dataDirectory,
        "order-sequences",
    );

    for (const file of await filesIn(sequenceDirectory)) {
        if (!/^\d{8}\.json$/.test(file)) {
            continue;
        }

        const { last } = await readJson(
            path.join(sequenceDirectory, file),
        );

        if (!Number.isSafeInteger(last) || last < 0) {
            throw new Error(`Invalid daily counter in ${file}.`);
        }

        const day = file.slice(0, 8);

        sequences.set(
            day,
            Math.max(sequences.get(day) ?? 0, last),
        );
    }

    for (const last of sequences.values()) {
        if (!Number.isSafeInteger(last)) {
            throw new Error(
                "Daily counter exceeds the supported range.",
            );
        }
    }

    const sql = postgres(process.env.DATABASE_URL, {
        ssl: "require",
        prepare: false,
        max: 1,
        connect_timeout: 15,
    });

    let inserted = 0;
    let statesCreated = 0;

    try {
        await sql.begin(async (transaction) => {
            await transaction`
        select pg_advisory_xact_lock(742901, 1)
      `;

            for (const [key, value] of Object.entries({
                site,
                business,
                checkout,
            })) {
                const result = await transaction`
          insert into al_tharid.state (key, data)
          values (
            ${key},
            ${transaction.json(value)}::jsonb
          )
          on conflict (key) do nothing
          returning key
        `;

                statesCreated += result.length;
            }

            for (const order of orders) {
                const previous = await transaction`
          select
            data = ${transaction.json(order)}::jsonb
            as identical
          from al_tharid.orders
          where request_id = ${order.requestId}::uuid
        `;

                if (previous.length) {
                    if (!previous[0].identical) {
                        throw new Error(
                            `Order ${order.number} already exists with different data. Import stopped without changing anything.`,
                        );
                    }

                    continue;
                }

                await transaction`
          insert into al_tharid.orders (
            request_id,
            number,
            created_at,
            phone,
            source,
            data
          )
          values (
            ${order.requestId}::uuid,
            ${order.number},
            ${order.createdAt}::timestamptz,
            ${order.phone},
            ${order.source ?? "website"},
            ${transaction.json(order)}::jsonb
          )
        `;

                inserted += 1;
            }

            for (const [day, last] of sequences) {
                await transaction`
          insert into al_tharid.order_sequences (day, last)
          values (${day}, ${last})
          on conflict (day)
          do update set last = greatest(
            al_tharid.order_sequences.last,
            excluded.last
          )
        `;
            }
        });

        console.log(
            `Import successful: ${inserted} orders added, ${orders.length - inserted} identical orders retained.`,
        );

        console.log(
            `${statesCreated} settings/business records created. Existing database settings and business records were retained.`,
        );

        console.log(
            "Local JSON files were left unchanged. Your website can now use Supabase.",
        );
    } finally {
        await sql.end({ timeout: 5 });
    }
}

main().catch((error) => {
    console.error(
        "Import failed. No changes from this import were committed.",
    );

    // Database messages may contain private row values.
    // Print database error codes instead.
    console.error(
        error.code
            ? `Database error code: ${error.code}`
            : error.message,
    );

    process.exitCode = 1;
});