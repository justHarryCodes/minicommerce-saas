const admin = require("firebase-admin");
const serviceAccount = require("./serviceAccountKey.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

async function deleteAllUsers() {
  let pageToken;
  let totalDeleted = 0;

  do {
    const result = await admin.auth().listUsers(1000, pageToken);

    const uids = result.users.map((user) => user.uid);

    if (uids.length > 0) {
      const deleteResult = await admin.auth().deleteUsers(uids);

      totalDeleted += deleteResult.successCount;

      console.log(
        `Deleted ${deleteResult.successCount} users` +
          (deleteResult.failureCount
            ? `, failed ${deleteResult.failureCount}`
            : "") +
          `. Total deleted: ${totalDeleted}`,
      );

      if (deleteResult.errors.length > 0) {
        console.error("Some users could not be deleted:");
        console.error(deleteResult.errors);
      }
    }

    pageToken = result.pageToken;
  } while (pageToken);

  console.log(`\nFinished. Total users deleted: ${totalDeleted}`);
}

deleteAllUsers().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
