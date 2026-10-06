import postgres from "postgres";

async function main() {
    if (!process.env.DATABASE_URL) {
        throw new Error("DATABASE_URL is missing from .env.local.");
    }

    const sql = postgres(process.env.DATABASE_URL, {
        ssl: "require",
        prepare: false,
        max: 1,
        connect_timeout: 15,
    });

    try {
        await sql`select 1 as connected`;

        console.log("Supabase database connection successful.");
    } finally {
        await sql.end({ timeout: 5 });
    }
}

main().catch((error) => {
    console.error(
        "Connection failed. Check DATABASE_URL, the password and project status.",
    );

    if (error.code) {
        console.error("Error code:", error.code);
    }

    process.exitCode = 1;
});