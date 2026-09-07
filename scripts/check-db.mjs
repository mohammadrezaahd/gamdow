import { MongoClient } from "mongodb";
if (!process.env.MONGODB_URI)
  throw new Error("Set MONGODB_URI in the selected environment file.");
const client = new MongoClient(process.env.MONGODB_URI, {
  serverSelectionTimeoutMS: 10000,
  maxPoolSize: 1,
});
try {
  await client.connect();
  await client.db(process.env.MONGODB_DB || "gamdow").command({ ping: 1 });
  console.log("MongoDB connection successful.");
} catch {
  console.error(
    "MongoDB connection failed. Check the URI, database-user credentials, service status and network access rules.",
  );
  process.exitCode = 1;
} finally {
  await client.close();
}
