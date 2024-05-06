const mongoose = require("mongoose");
const { Client } = require("@elastic/elasticsearch");
//const topicModel = require("../models/topic");

const connection =
  "mongodb+srv://ahmetgocmen07:Cfk9tY27nvBaFzxS@ahmet.shuruci.mongodb.net/?retryWrites=true&w=majority&appName=ahmet";

const esClient = new Client({
  node: "https://c2e866460775493583daa3362fe3ad16.us-central1.gcp.cloud.es.io:443",
  auth: {
    apiKey: {
      id: "e-arLo8BLQg_qDIiZBss", // Replace with your actual API key ID
      api_key: "Fp2e6M6gTXOUCywDgzIxgQ", // Replace with your actual API key secret
    },
  },
});

mongoose
  .connect(connection)
  .then(async () => {
    console.log("MongoDB connected successfully");

    const db = mongoose.connection.db;

    const notesCollection = db.collection("notes");
    const teamsCollection = db.collection("teams");
    const topicsCollection = db.collection("topics");

    const notesChangeStream = notesCollection.watch();
    const teamsChangeStream = teamsCollection.watch();
    const topicsChangeStream = topicsCollection.watch();

    notesChangeStream.on("change", async (change) => {
      //console.log("Note change detected:", change);
      //console.log("Note change detected:", change);
      await syncNoteToElasticsearch(change);
    });

    teamsChangeStream.on("change", async (change) => {
      //console.log("Team change detected:", change);
      //console.log("Team change detected:", change);
      await syncTeamToElasticsearch(change);
    });

    topicsChangeStream.on("change", async (change) => {
      //console.log("Topic change detected:", change);
      //console.log("Topic change detected:", change);
      await syncTopicToElasticsearch(change);
    });
  })
  .catch((error) => {
    console.error("MongoDB connection error:", error);
  });

async function syncTeamToElasticsearch(change) {
  const { operationType, fullDocument, documentKey, updateDescription } =
    change;

  try {
    if (operationType === "insert") {
      await esClient.index({
        index: "kbase",
        id: documentKey._id.toHexString(),
        body: {
          teamName: fullDocument.teamName,
          teamDescription: fullDocument.teamDescription,
        },
      });
    } else if (
      operationType === "update" &&
      updateDescription &&
      updateDescription.updatedFields
    ) {
      const updatedFields = updateDescription.updatedFields;

      const { teamName, teamDescription } = updatedFields;

      await esClient.update({
        index: "kbase",
        id: documentKey._id.toHexString(),
        body: {
          doc: {
            ...(teamName && { teamName }),
            ...(teamDescription && { teamDescription }),
          },
        },
      });
    } else if (operationType === "delete") {
      try {
        await esClient.delete({
          index: "kbase",
          id: documentKey._id.toHexString(),
        });
      } catch (error) {
        if (error.meta.body.result === "not_found") {
          console.log("Belge zaten silinmiş veya bulunamadı.");
        } else {
          console.error("Elasticsearch'te takım senkronizasyon hatası:", error);
        }
      }
    }
  } catch (error) {
    console.error("Error syncing team to Elasticsearch:", error);
  }
}

async function syncNoteToElasticsearch(change) {
  const { operationType, fullDocument, documentKey, updateDescription } =
    change;

  try {
    if (operationType === "insert") {
      const cleanDescription = fullDocument.description?.replace(
        /<[^>]+>/g,
        ""
      );
      const jsonString = JSON.stringify(fullDocument._id);

      const encodedid = Buffer.from(jsonString).toString("base64");

      await esClient.index({
        index: "kbase",
        id: documentKey._id.toHexString(),
        body: {
          noteName: fullDocument.noteName,
          noteDescription: cleanDescription,
          noteId: encodedid,
        },
      });
    } else if (
      operationType === "update" &&
      updateDescription &&
      updateDescription.updatedFields
    ) {
      const updatedFields = updateDescription.updatedFields;
      const { noteName, description } = updatedFields;

      const cleanDescription = description?.replace(/<[^>]+>/g, "");

      await esClient.update({
        index: "kbase",
        id: documentKey._id.toHexString(),
        body: {
          doc: {
            ...(noteName && { noteName }),
            ...(description && { noteDescription: cleanDescription }),
          },
        },
      });
    } else if (operationType === "delete") {
      try {
        await esClient.delete({
          index: "kbase",
          id: documentKey._id.toHexString(),
        });
      } catch (error) {
        if (error.meta.body.result === "not_found") {
          console.log("Belge zaten silinmiş veya bulunamadı.");
        } else {
          console.error("Elasticsearch'te note senkronizasyon hatası:", error);
        }
      }
    }
  } catch (error) {
    console.error("Error syncing note to Elasticsearch:", error);
  }
}

async function syncTopicToElasticsearch(change) {
  const { operationType, fullDocument, documentKey, updateDescription } =
    change;

  try {
    if (operationType === "insert") {
      const jsonString = JSON.stringify(fullDocument._id);
      const encodedid = Buffer.from(jsonString).toString("base64");

      console.log("insert", fullDocument);

      await esClient.index({
        index: "kbase",
        id: documentKey._id.toHexString(),
        body: {
          topicName: fullDocument.topicName,
          parentName: fullDocument.parent,
          topicId: encodedid,
        },
      });
    } else if (
      operationType === "update" &&
      updateDescription &&
      updateDescription.updatedFields
    ) {
      const updatedFields = updateDescription.updatedFields;

      let { topicName, parent } = updatedFields;

      await esClient.update({
        index: "kbase",
        id: documentKey._id.toHexString(),
        body: {
          doc: {
            ...(topicName && { topicName }),
            parentName: parent,
          },
        },
      });
    } else if (operationType === "delete") {
      try {
        await esClient.delete({
          index: "kbase",
          id: documentKey._id.toHexString(),
        });
      } catch (error) {
        if (error.meta.body.result === "not_found") {
          console.log("Belge zaten silinmiş veya bulunamadı.");
        } else {
          console.error("Elasticsearch'te topic senkronizasyon hatası:", error);
        }
      }
    }
  } catch (error) {
    console.error("Error syncing topic to Elasticsearch:", error);
  }
}

module.exports = mongoose;
