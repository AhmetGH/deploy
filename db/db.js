const mongoose = require("mongoose");
const { Client } = require("@elastic/elasticsearch");
//const topicModel = require("../models/topic");

const connection =
  "mongodb+srv://ahmetgocmen07:Cfk9tY27nvBaFzxS@ahmet.shuruci.mongodb.net/?retryWrites=true&w=majority&appName=ahmet";

const esClient = new Client({
  node: "https://6f91b4a351d143e59e1f34bbb8e2c557.europe-west3.gcp.cloud.es.io:443",
  auth: {
    apiKey: {
      id: "0ostL48BKT31eWBTT2iz", // Replace with your actual API key ID
      api_key: "48qJr4a7QHuPpPmS5sVqIA", // Replace with your actual API key secret
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
      await syncNoteToElasticsearch(change);
    });

    teamsChangeStream.on("change", async (change) => {
      await syncTeamToElasticsearch(change);
    });

    topicsChangeStream.on("change", async (change) => {
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
        index: "bilgi",
        id: documentKey._id.toHexString(),
        body: {
          teamName: fullDocument.teamName,
          teamDescription: fullDocument.teamDescription,
          teamMembers: fullDocument.members.map((member) => member.toString()),
        },
      });
    } else if (
      operationType === "update" &&
      updateDescription &&
      updateDescription.updatedFields
    ) {
      const updatedFields = updateDescription.updatedFields;

      const { teamName, teamDescription, members } = updatedFields;

      await esClient.update({
        index: "bilgi",
        id: documentKey._id.toHexString(),
        body: {
          doc: {
            ...(teamName && { teamName }),
            ...(teamDescription && { teamDescription }),
            ...(members && { teamMembers: members }),
          },
        },
      });
    } else if (operationType === "delete") {
      try {
        await esClient.delete({
          index: "bilgi",
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
        index: "bilgi",
        id: documentKey._id.toHexString(),
        body: {
          noteName: fullDocument.noteName,
          noteDescription: cleanDescription,
          noteId: encodedid,
          noteAccessTeam: fullDocument.accessTeam.map((team) =>
            team.toString()
          ),
          noteAccessUser: fullDocument.accessUser.map((user) =>
            user.toString()
          ),
          members: fullDocument.members.map((user) => user.toString()),
        },
      });
    } else if (
      operationType === "update" &&
      updateDescription &&
      updateDescription.updatedFields
    ) {
      const updatedFields = updateDescription.updatedFields;
      const { noteName, description, accessTeam, accessUser, members } =
        updatedFields;

      const cleanDescription = description?.replace(/<[^>]+>/g, "");

      await esClient.update({
        index: "bilgi",
        id: documentKey._id.toHexString(),
        body: {
          doc: {
            ...(noteName && { noteName }),
            ...(description && { noteDescription: cleanDescription }),
            ...(accessTeam && { noteAccessTeam: accessTeam }),
            ...(accessUser && { noteAccessUser: accessUser }),
            ...(members && { members: members }),
          },
        },
      });
    } else if (operationType === "delete") {
      try {
        await esClient.delete({
          index: "bilgi",
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

      await esClient.index({
        index: "bilgi",
        id: documentKey._id.toHexString(),
        body: {
          topicName: fullDocument.topicName,
          parentName: fullDocument.parent,
          topicId: encodedid,
          owner: fullDocument.owner.toString(),
          accessTeam: fullDocument.accessTeam.map((team) => team.toString()), // Assuming accessTeam is an array of ObjectIds
          accessUser: fullDocument.accessUser.map((user) => user.toString()),
        },
      });
    } else if (
      operationType === "update" &&
      updateDescription &&
      updateDescription.updatedFields
    ) {
      const updatedFields = updateDescription.updatedFields;

      let { topicName, parent, owner, accessTeam, accessUser } = updatedFields;

      await esClient.update({
        index: "bilgi",
        id: documentKey._id.toHexString(),
        body: {
          doc: {
            ...(topicName && { topicName }),
            ...(parent && { parentName: parent }),
            ...(owner && { owner }),
            ...(accessTeam && { accessTeam }),
            ...(accessUser && { accessUser }),
          },
        },
      });
    } else if (operationType === "delete") {
      try {
        await esClient.delete({
          index: "bilgi",
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
